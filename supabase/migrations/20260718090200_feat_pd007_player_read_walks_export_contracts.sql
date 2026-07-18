-- ============================================================================
-- FEAT-PD007 (Cycle J-F) — the player read's substance + the walks export.
-- *** HELD AT THE SCHEMA GATE — apply only after the nod. *** TASK-JF-03.
--
--   1. get_player_state re-issue — the FEAT-PD005 body VERBATIM with exactly
--      four byte-additive deltas (the PD004/PD005 pattern; every pre-existing
--      key unchanged in shape, pinned by the red suite):
--        instances[].response, instances[].response_updated_at,
--        steps[].captures_response (from the registry),
--        journey.takeaway (journeys.takeaway — the J-E seed finally served;
--        per-step takeaways already ride steps[].content.takeaway).
--   2. get_own_step_instances_export() — the own-subject walks export
--      discharging the FEAT-H010 step-instances flag (J-C retro) BEFORE the
--      first response exists (JF-6): right of access precedes the words.
--      Own data only, fixed shape, no filters — not a query surface.
--      Composed at the Hub's export route as an additive key (the FEAT-H011
--      journal pattern; the PC-4 document is untouched — one-way rule).
--
-- The privacy wall (ADR-U046 §3) needs NO change here — pinned by test:
-- get_group_journey_progress derives its payload from step-skeleton +
-- completion marks only and never touches the response columns; no Steward,
-- Guide, group-member, or admin read of response content exists anywhere.
--
-- Direct-caller question (ADR-U038), asked of this touch: both reads resolve
-- the actor from the session (P-O1) and serve exactly that traveller's rows;
-- a direct PostgREST caller (incl. an anonymous-session Mist) gets their own
-- walks and nobody else's — same as through the route.
-- SECURITY DEFINER: reads contract-only tables; search_path = ''.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. get_player_state — the four additive keys (deltas labelled inline).
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
  v_sharing boolean;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  -- FEAT-PD005 Q9: read standing (lived-record arm for frozen walks).
  v_enr := public._enrollment_traveller_read_standing(v_actor, p_enrollment_id);

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
              -- FEAT-PD007 delta: the capture set, registry-served.
              'captures_response', k.captures_response,
              'required', st.required,
              'repeatable', st.repeatable,
              'duration_minutes', st.duration_minutes,
              'content', st.content)
            order by st.step_order)
       from public.journey_steps st
       join public.step_kinds k on k.key = st.step_kind_key
      where st.journey_id = v_enr.journey_id),
    '[]'::jsonb);

  -- The CALLER's instances only (invariant 4: traveller-own; the J-D
  -- consent-gated Steward/Guide read is get_group_journey_progress —
  -- a separate contract, as FEAT-PD004 promised).
  v_instances := coalesce(
    (select jsonb_agg(jsonb_build_object(
              'instance_id', i.id,
              'step_id', i.step_id,
              'created_at', i.created_at,
              'completed_at', i.completed_at,
              -- FEAT-PD007 delta: the traveller's own words on their own read.
              'response', i.response,
              'response_updated_at', i.response_updated_at)
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

  -- FEAT-PD005 STORY-5: the traveller's OWN latest sharing decision for THIS
  -- enrolment (latest-wins over the append-only ledger). Solo walks: nothing
  -- to share to — available = false, sharing = false.
  if v_enr.group_id <> v_actor then
    select (cr.decision = 'granted') into v_sharing
      from public.consent_records cr
     where cr.subject_group_id = v_actor
       and cr.purpose = 'journey_progress_visibility'
       and cr.capture_context->>'enrollment_id' = p_enrollment_id::text
     order by cr.captured_at desc, cr.id desc
     limit 1;
  end if;
  v_sharing := coalesce(v_sharing, false);

  -- FEAT-PD004 Q6 / FEAT-PD005 Q7 / FEAT-PD007: additive keys only — every
  -- pre-existing key byte-identical (red-suite pinned each cycle).
  return jsonb_build_object(
    'enrollment_id', v_enr.id,
    'status', v_enr.status,
    'sequencing_mode', v_journey.sequencing_mode,
    'journey', jsonb_build_object(
      'id', v_journey.id,
      'title', v_journey.title,
      'description', v_journey.description,
      -- FEAT-PD007 delta: the journey-level authored closing word (the J-E
      -- seed finally served; ADR-U046 §4).
      'takeaway', v_journey.takeaway),
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
        'completed_at', v_enr.completed_at)),
    'freeze', case when v_enr.status = 'frozen'
                   then jsonb_build_object(
                          'reason', v_enr.progress_data->>'frozen_reason',
                          'frozen_at', v_enr.progress_data->>'frozen_at')
                   else null end,
    'progress_sharing', jsonb_build_object(
      'available', v_enr.group_id <> v_actor,
      'sharing', v_sharing));
end;
$$;

comment on function public.get_player_state(uuid) is
  'FEAT-PD003 STORY-4 (JRN-6/10), amended by FEAT-PD004 (JRN-11/13), FEAT-PD005 '
  '(JRN-14/17) and FEAT-PD007 (JRN-9/13 deepened, ADR-U046): the single-round-trip '
  'player boot — journey meta (now incl. takeaway), ordered steps WITH content '
  'payloads + kind metadata (now incl. captures_response), the caller''s own '
  'instances (invariant 4; now incl. response/response_updated_at), the Q6 resume '
  'pointer, the enrolment status, the completion/timing/freeze/progress_sharing '
  'blocks. Standing: PD005 Q9 read-standing (lived-record arm for frozen walks — '
  'the freeze silences the pen, not the page). SECURITY DEFINER: reads '
  'contract-only tables.';

revoke all on function public.get_player_state(uuid) from public, anon;
grant execute on function public.get_player_state(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. get_own_step_instances_export — the H010 flag discharged (JF-6).
-- ----------------------------------------------------------------------------
create or replace function public.get_own_step_instances_export()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  -- Every enrolment the caller travelled: their own party's walks (withdrawn
  -- history included — right of access covers the lived record, not just
  -- standing) plus via-group walks carrying their own instances. steps[] is
  -- the caller's OWN instance rows only — never a sibling traveller's.
  -- Titles ride for legibility; no filters, fixed shape (not a query surface).
  return coalesce(
    (select jsonb_agg(jsonb_build_object(
              'enrollment_id', e.id,
              'journey_id', e.journey_id,
              'journey_title', j.title,
              'status', e.status,
              'enrolled_at', e.enrolled_at,
              'completed_at', e.completed_at,
              'steps', coalesce(
                (select jsonb_agg(jsonb_build_object(
                          'step_id', i.step_id,
                          'step_title', st.title,
                          'kind', st.step_kind_key,
                          'created_at', i.created_at,
                          'completed_at', i.completed_at,
                          'response', i.response,
                          'response_updated_at', i.response_updated_at)
                        order by i.created_at asc, i.id asc)
                   from public.journey_step_instances i
                   join public.journey_steps st on st.id = i.step_id
                  where i.enrollment_id = e.id
                    and i.traveller_group_id = v_actor),
                '[]'::jsonb))
            order by e.enrolled_at asc, e.id asc)
       from public.journey_enrollments e
       join public.journeys j on j.id = e.journey_id
      where e.group_id = v_actor
         or exists (select 1 from public.journey_step_instances i2
                     where i2.enrollment_id = e.id
                       and i2.traveller_group_id = v_actor)),
    '[]'::jsonb);
end;
$$;

comment on function public.get_own_step_instances_export() is
  'FEAT-PD007 STORY-6 (JF-6; discharges the FEAT-H010 step-instances flag, J-C '
  'retro): the caller''s walks — every enrolment they travelled with their own '
  'passages and words. Own-subject only (P-O1 actor), Mist-callable, 42501 on '
  'no actor; fixed shape, no filters — not a query surface. Composed at the '
  'Hub export route as an additive section (FEAT-H011 pattern; the PC-4 '
  'document untouched — one-way rule). SECURITY DEFINER: reads contract-only '
  'tables for exactly the resolved caller.';

revoke all on function public.get_own_step_instances_export() from public, anon;
grant execute on function public.get_own_step_instances_export() to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Verification (mirrors the PD004/PD005 posture)
-- ----------------------------------------------------------------------------
do $$
begin
  assert to_regprocedure('public.get_player_state(uuid)') is not null,
    'PD007: get_player_state missing after re-issue';
  assert to_regprocedure('public.get_own_step_instances_export()') is not null,
    'PD007: walks export missing';
end $$;
