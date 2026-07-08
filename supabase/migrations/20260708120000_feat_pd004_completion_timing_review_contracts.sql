-- FEAT-PD004: Journey completion, timing, and review-read contracts (Cycle J-C)
-- ============================================================================
-- JRN-11/12/13's platform half. NO new tables, columns, indexes, or RLS —
-- three contract re-issues only (the iteration-zone additive posture):
--
--   1. enter_journey_step    — status guard admits ('active','completed')
--                              (STORY-4: the milestone must not dead-lock
--                              optional/repeatable steps). Sole delta.
--   2. complete_journey_step — same guard loosening; enrolment row locked;
--                              traveller-completion detected on the transition
--                              edge (Q1); solo party flips to 'completed' with
--                              completed_at stamped once (Q2/Q3); the durable
--                              'journey_completed' notification row (Q4);
--                              additive 'journey_completed' + 'completion'
--                              return keys (Q6).
--   3. get_player_state      — additive 'completion' + 'timing' blocks
--                              (Q5/Q6); every pre-existing key unchanged.
--
-- Held at the schema-review gate (contract-semantics review; the direct-caller
-- question re-asked over the loosened guards). Red suite:
-- journey-completion-timing-contracts.test.ts (TASK-JC-01).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. enter_journey_step — the STORY-4 guard loosening, nothing else.
--    A completed walk stays enterable (review re-engagement of repeatables;
--    optionals). withdrawn/frozen/paused refuse exactly as before.
-- ----------------------------------------------------------------------------
create or replace function public.enter_journey_step(
  p_enrollment_id uuid,
  p_step_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_enr public.journey_enrollments%rowtype;
  v_step public.journey_steps%rowtype;
  v_inst public.journey_step_instances%rowtype;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  v_enr := public._enrollment_traveller_standing(v_actor, p_enrollment_id);

  -- FEAT-PD004 STORY-4 (labelled J-B delta): 'completed' admitted — the
  -- milestone is not a lock. All other states refuse as at J-B.
  if v_enr.status not in ('active', 'completed') then
    raise exception 'enrollment is not active' using errcode = 'P0001';
  end if;

  select * into v_step
    from public.journey_steps st
   where st.id = p_step_id and st.journey_id = v_enr.journey_id;
  if v_step.id is null then
    raise exception 'step not found' using errcode = 'P0002';
  end if;

  -- The open instance IS the engagement — never duplicated.
  select * into v_inst
    from public.journey_step_instances i
   where i.enrollment_id = p_enrollment_id
     and i.traveller_group_id = v_actor
     and i.step_id = p_step_id
     and i.completed_at is null
   order by i.created_at desc limit 1;

  if v_inst.id is null then
    if exists (select 1 from public.journey_step_instances i
                where i.enrollment_id = p_enrollment_id
                  and i.traveller_group_id = v_actor
                  and i.step_id = p_step_id
                  and i.completed_at is not null)
       and not v_step.repeatable then
      -- Review of a completed, non-repeatable step: no new lived record.
      select * into v_inst
        from public.journey_step_instances i
       where i.enrollment_id = p_enrollment_id
         and i.traveller_group_id = v_actor
         and i.step_id = p_step_id
       order by i.completed_at desc limit 1;
    else
      -- First engagement — or a repeat of a repeatable step (a NEW instance,
      -- never an update: ADR-U044 §4).
      insert into public.journey_step_instances
        (enrollment_id, traveller_group_id, step_id)
      values (p_enrollment_id, v_actor, p_step_id)
      returning * into v_inst;
    end if;
  end if;

  update public.journey_enrollments
     set last_accessed_at = now()
   where id = p_enrollment_id;

  return jsonb_build_object(
    'instance_id', v_inst.id,
    'step_id', v_inst.step_id,
    'created_at', v_inst.created_at,
    'completed_at', v_inst.completed_at);
end;
$$;

comment on function public.enter_journey_step(uuid, uuid) is
  'FEAT-PD003 STORY-5 (JRN-9 platform half), amended by FEAT-PD004 STORY-4: records engagement — the auto-save write. Open instance = the engagement (no duplicates); repeat of a repeatable step = a new instance; review of a completed non-repeatable step records nothing new. Touches last_accessed_at. Traveller standing; active OR completed enrolments (the milestone is not a lock — labelled J-C delta); withdrawn/frozen/paused refuse. SECURITY DEFINER: writes the contract-only instances table.';

revoke all on function public.enter_journey_step(uuid, uuid) from public, anon;
grant execute on function public.enter_journey_step(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. complete_journey_step — stamp logic unchanged; completion detection lands
--    on the transition edge (FEAT-PD004 STORY-1/2/3/6).
-- ----------------------------------------------------------------------------
create or replace function public.complete_journey_step(
  p_enrollment_id uuid,
  p_step_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_enr public.journey_enrollments%rowtype;
  v_step public.journey_steps%rowtype;
  v_journey public.journeys%rowtype;
  v_inst public.journey_step_instances%rowtype;
  v_blocking int;
  v_was_complete boolean;
  v_now_complete boolean;
  v_transition boolean := false;
  v_traveller_completed_at timestamptz;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  v_enr := public._enrollment_traveller_standing(v_actor, p_enrollment_id);

  -- FEAT-PD004 STORY-4 (labelled J-B delta): 'completed' admitted.
  if v_enr.status not in ('active', 'completed') then
    raise exception 'enrollment is not active' using errcode = 'P0001';
  end if;

  select * into v_step
    from public.journey_steps st
   where st.id = p_step_id and st.journey_id = v_enr.journey_id;
  if v_step.id is null then
    raise exception 'step not found' using errcode = 'P0002';
  end if;

  -- Q7 (J-B): via-group travellers complete under the party group's key (an
  -- Observer watches, never completes); solo walks carry no role distinction.
  if v_enr.group_id <> v_actor then
    if not coalesce(public.has_permission(v_actor, v_enr.group_id,
                                          'complete_journey_activities'), false) then
      raise exception 'not permitted to complete steps in this group''s journey'
        using errcode = '42501';
    end if;
  end if;

  -- JRN-8 gating (linear — the only exercised mode; other modes are forward
  -- shape and currently gate identically, deliberately conservative).
  select count(*) into v_blocking
    from public.journey_steps st
   where st.journey_id = v_enr.journey_id
     and st.required = true
     and st.step_order < v_step.step_order
     and not exists (select 1 from public.journey_step_instances i
                      where i.enrollment_id = p_enrollment_id
                        and i.traveller_group_id = v_actor
                        and i.step_id = st.id
                        and i.completed_at is not null);
  if v_blocking > 0 then
    raise exception 'required predecessor incomplete' using errcode = 'P0001';
  end if;

  -- FEAT-PD004 Q1: lock the enrolment row BEFORE the pre-stamp edge read —
  -- two racing finals serialize here, so exactly one call observes the
  -- incomplete→complete transition. Re-read + re-check under the lock so a
  -- racing withdraw/freeze can't slip between the standing check and the stamp.
  select * into v_enr
    from public.journey_enrollments e
   where e.id = p_enrollment_id
   for update;
  if v_enr.status not in ('active', 'completed') then
    raise exception 'enrollment is not active' using errcode = 'P0001';
  end if;

  -- Pre-stamp traveller state (under the lock): complete means no required
  -- step lacks a completed instance. (A journey with zero required steps is
  -- vacuously complete from the start — no edge can ever fire for it.)
  select not exists (
           select 1 from public.journey_steps st
            where st.journey_id = v_enr.journey_id
              and st.required = true
              and not exists (select 1 from public.journey_step_instances i
                               where i.enrollment_id = p_enrollment_id
                                 and i.traveller_group_id = v_actor
                                 and i.step_id = st.id
                                 and i.completed_at is not null))
    into v_was_complete;

  -- Idempotent completion (oracle B-JRN completion idempotency) — unchanged.
  select * into v_inst
    from public.journey_step_instances i
   where i.enrollment_id = p_enrollment_id
     and i.traveller_group_id = v_actor
     and i.step_id = p_step_id
     and i.completed_at is null
   order by i.created_at desc limit 1;

  if v_inst.id is not null then
    update public.journey_step_instances
       set completed_at = now()
     where id = v_inst.id
     returning * into v_inst;
  else
    select * into v_inst
      from public.journey_step_instances i
     where i.enrollment_id = p_enrollment_id
       and i.traveller_group_id = v_actor
       and i.step_id = p_step_id
       and i.completed_at is not null
     order by i.completed_at desc limit 1;

    if v_inst.id is null then
      -- No prior enter: create-and-complete in one call.
      insert into public.journey_step_instances
        (enrollment_id, traveller_group_id, step_id, completed_at)
      values (p_enrollment_id, v_actor, p_step_id, now())
      returning * into v_inst;
    end if;
    -- else: already completed — return the existing record unchanged.
  end if;

  -- Post-stamp traveller state + completion moment (the last required step's
  -- FIRST completion — deterministic under repeatable re-dos).
  select (count(*) filter (where done.first_completed_at is null)) = 0,
         max(done.first_completed_at)
    into v_now_complete, v_traveller_completed_at
    from public.journey_steps st
    left join lateral (
      select min(i.completed_at) as first_completed_at
        from public.journey_step_instances i
       where i.enrollment_id = p_enrollment_id
         and i.traveller_group_id = v_actor
         and i.step_id = st.id
         and i.completed_at is not null
    ) done on true
   where st.journey_id = v_enr.journey_id
     and st.required = true;
  v_now_complete := coalesce(v_now_complete, true);  -- zero required steps
  if not v_now_complete then
    v_traveller_completed_at := null;
  end if;

  -- FEAT-PD004 Q1/Q2/Q3/Q4: the transition edge — fires at most once per
  -- (enrolment x traveller) lifetime, because a re-walk can never make the
  -- pre-stamp state incomplete again (first completions are permanent).
  if v_now_complete and not v_was_complete then
    v_transition := true;

    select * into v_journey from public.journeys j where j.id = v_enr.journey_id;

    -- Q4: the durable milestone (V3) — passive, traveller-addressed, never
    -- group-addressed (invariant 8; group aggregates are J-D).
    insert into public.notifications
      (recipient_group_id, type, title, body, payload, group_id)
    values
      (v_actor,
       'journey_completed',
       'Journey complete',
       'You completed the journey "' || v_journey.title || '".',
       jsonb_build_object(
         'journey_id', v_enr.journey_id,
         'enrollment_id', v_enr.id,
         'journey_title', v_journey.title),
       v_enr.group_id);

    -- Q2/Q3: the solo party (the walker IS the party — no group-type
    -- introspection, ADR-U018-safe) concludes the enrolment row; completed_at
    -- stamps once, ever (a reactivated re-walk never re-stamps).
    if v_enr.group_id = v_actor then
      update public.journey_enrollments
         set status = 'completed',
             completed_at = coalesce(completed_at, now()),
             status_changed_at = now()
       where id = p_enrollment_id
         and status = 'active';
      -- Re-read unconditionally: a legacy-completed row reaching a late edge
      -- matches no 'active' row, and RETURNING INTO would null v_enr.
      select * into v_enr
        from public.journey_enrollments e where e.id = p_enrollment_id;
    end if;
  end if;

  update public.journey_enrollments
     set last_accessed_at = now()
   where id = p_enrollment_id;

  -- FEAT-PD004 Q6: additive keys only — the four J-B keys are byte-identical.
  return jsonb_build_object(
    'instance_id', v_inst.id,
    'step_id', v_inst.step_id,
    'created_at', v_inst.created_at,
    'completed_at', v_inst.completed_at,
    'journey_completed', v_transition,
    'completion', jsonb_build_object(
      'traveller_completed', v_now_complete,
      'traveller_completed_at', v_traveller_completed_at,
      'enrollment_status', v_enr.status,
      'enrollment_completed_at', v_enr.completed_at));
end;
$$;

comment on function public.complete_journey_step(uuid, uuid) is
  'FEAT-PD003 STORY-6 (JRN-8), amended by FEAT-PD004 (JRN-12): stamps passage once (idempotent); required-predecessor gating (P0001); create-and-complete when no prior enter; Q7 via-group completion rides complete_journey_activities. Journey-level completion detected on the transition edge under the enrolment row lock: the solo party flips to ''completed'' (completed_at stamps once, ever), the durable ''journey_completed'' notification row inserts for the traveller, and the response carries the transition (journey_completed + completion block). Admits active OR completed enrolments (labelled J-C delta — the milestone is not a lock). SECURITY DEFINER: writes the contract-only instances table + the enrolment conclusion + the notification row.';

revoke all on function public.complete_journey_step(uuid, uuid) from public, anon;
grant execute on function public.complete_journey_step(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. get_player_state — additive 'completion' + 'timing' blocks (Q5/Q6).
--    Same single round trip; two bounded aggregates over the caller's own rows.
-- ----------------------------------------------------------------------------
create or replace function public.get_player_state(
  p_enrollment_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_enr public.journey_enrollments%rowtype;
  v_journey public.journeys%rowtype;
  v_steps jsonb;
  v_instances jsonb;
  v_resume uuid;
  v_traveller_completed boolean;
  v_traveller_completed_at timestamptz;
  v_timing_per_step jsonb;
  v_total_seconds bigint;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  v_enr := public._enrollment_traveller_standing(v_actor, p_enrollment_id);

  select * into v_journey from public.journeys j where j.id = v_enr.journey_id;

  -- Full step rows INCLUDING content payloads — the traveller is enrolled;
  -- this is the one read designed to boot the player in a single round trip.
  v_steps := coalesce(
    (select jsonb_agg(jsonb_build_object(
              'id', st.id,
              'step_order', st.step_order,
              'title', st.title,
              'kind', st.step_kind_key,
              'family', st.content_family_key,
              'ask_verb', k.ask_verb,
              'required', st.required,
              'repeatable', st.repeatable,
              'duration_minutes', st.duration_minutes,
              'content', st.content)
            order by st.step_order)
       from public.journey_steps st
       join public.step_kinds k on k.key = st.step_kind_key
      where st.journey_id = v_enr.journey_id),
    '[]'::jsonb);

  -- The CALLER's instances only (invariant 4: traveller-own; J-D adds the
  -- consent-gated Steward/Guide reads as separate contracts).
  v_instances := coalesce(
    (select jsonb_agg(jsonb_build_object(
              'instance_id', i.id,
              'step_id', i.step_id,
              'created_at', i.created_at,
              'completed_at', i.completed_at)
            order by i.created_at asc, i.id asc)
       from public.journey_step_instances i
      where i.enrollment_id = p_enrollment_id
        and i.traveller_group_id = v_actor),
    '[]'::jsonb);

  -- Q6 resume pointer: latest open engagement, else the first step lacking a
  -- completed instance, else the last step.
  select i.step_id into v_resume
    from public.journey_step_instances i
   where i.enrollment_id = p_enrollment_id
     and i.traveller_group_id = v_actor
     and i.completed_at is null
   order by i.created_at desc, i.id desc
   limit 1;
  if v_resume is null then
    select st.id into v_resume
      from public.journey_steps st
     where st.journey_id = v_enr.journey_id
       and not exists (select 1 from public.journey_step_instances i
                        where i.enrollment_id = p_enrollment_id
                          and i.traveller_group_id = v_actor
                          and i.step_id = st.id
                          and i.completed_at is not null)
     order by st.step_order asc
     limit 1;
  end if;
  if v_resume is null then
    select st.id into v_resume
      from public.journey_steps st
     where st.journey_id = v_enr.journey_id
     order by st.step_order desc
     limit 1;
  end if;

  -- FEAT-PD004 STORY-5/6: traveller-grain completion (derived; matches the
  -- complete_journey_step detection predicate; vacuously true for a journey
  -- with zero required steps) + the completion moment (last required step's
  -- first completion).
  select (count(*) filter (where done.first_completed_at is null)) = 0,
         max(done.first_completed_at)
    into v_traveller_completed, v_traveller_completed_at
    from public.journey_steps st
    left join lateral (
      select min(i.completed_at) as first_completed_at
        from public.journey_step_instances i
       where i.enrollment_id = p_enrollment_id
         and i.traveller_group_id = v_actor
         and i.step_id = st.id
         and i.completed_at is not null
    ) done on true
   where st.journey_id = v_enr.journey_id
     and st.required = true;
  v_traveller_completed := coalesce(v_traveller_completed, true);
  if not v_traveller_completed then
    v_traveller_completed_at := null;
  end if;

  -- FEAT-PD004 Q5: timing derives from completed engagements only (an open
  -- engagement is not time spent — walking away costs nothing); per-step sums
  -- across engagements (repeatables accrue); total = the per-step sum;
  -- wall-clock span served separately, never conflated.
  v_timing_per_step := coalesce(
    (select jsonb_agg(jsonb_build_object('step_id', t.step_id,
                                         'seconds', t.seconds)
                      order by t.step_order)
       from (select i.step_id, st.step_order,
                    floor(sum(extract(epoch from (i.completed_at - i.created_at))))::bigint
                      as seconds
               from public.journey_step_instances i
               join public.journey_steps st on st.id = i.step_id
              where i.enrollment_id = p_enrollment_id
                and i.traveller_group_id = v_actor
                and i.completed_at is not null
              group by i.step_id, st.step_order) t),
    '[]'::jsonb);
  select coalesce(floor(sum(extract(epoch from (i.completed_at - i.created_at)))), 0)::bigint
    into v_total_seconds
    from public.journey_step_instances i
   where i.enrollment_id = p_enrollment_id
     and i.traveller_group_id = v_actor
     and i.completed_at is not null;

  -- FEAT-PD004 Q6: additive keys only — the seven J-B keys are byte-identical.
  return jsonb_build_object(
    'enrollment_id', v_enr.id,
    'status', v_enr.status,
    'sequencing_mode', v_journey.sequencing_mode,
    'journey', jsonb_build_object(
      'id', v_journey.id,
      'title', v_journey.title,
      'description', v_journey.description),
    'steps', v_steps,
    'instances', v_instances,
    'resume_step_id', v_resume,
    'completion', jsonb_build_object(
      'traveller_completed', v_traveller_completed,
      'traveller_completed_at', v_traveller_completed_at,
      'enrollment_status', v_enr.status,
      'enrollment_completed_at', v_enr.completed_at),
    'timing', jsonb_build_object(
      'per_step', v_timing_per_step,
      'total_seconds', v_total_seconds,
      'wall_clock', jsonb_build_object(
        'enrolled_at', v_enr.enrolled_at,
        'completed_at', v_enr.completed_at)));
end;
$$;

comment on function public.get_player_state(uuid) is
  'FEAT-PD003 STORY-4 (JRN-6/10), amended by FEAT-PD004 (JRN-11/13): the single-round-trip player boot — journey meta, ordered steps WITH content payloads + kind metadata, the caller''s own instances (invariant 4), the Q6 resume pointer, the enrolment status, plus the additive completion block (traveller-grain, derived — matches the detection predicate) and timing block (completed engagements only; per-step + total + wall-clock span). Traveller standing only; Mist-compatible by design (ADR-U045 J-E). SECURITY DEFINER: reads contract-only tables.';

revoke all on function public.get_player_state(uuid) from public, anon;
grant execute on function public.get_player_state(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Verification
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'complete_journey_step') then
    raise exception 'complete_journey_step missing after re-issue';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'enter_journey_step') then
    raise exception 'enter_journey_step missing after re-issue';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'get_player_state') then
    raise exception 'get_player_state missing after re-issue';
  end if;
end $$;
