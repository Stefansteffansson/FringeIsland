-- ============================================================
-- FEAT-PD005 — group journey progress, sharing consent & frozen-walk contracts
-- (Cycle J-D: JRN-14/16/17's platform half)
-- ============================================================
-- NO new tables, columns, indexes, RLS policies, or triggers. This migration is:
--   1. ONE consent_purposes catalog row (data, not schema — the ADR-U034
--      Amendment 1 shape; PC006 precedent).
--   2. ONE internal read-standing helper (_enrollment_traveller_read_standing —
--      the Q9 lived-record loosening, READS ONLY).
--   3. TWO contract re-issues: get_player_state (read-standing swap + additive
--      `freeze` / `progress_sharing` blocks — every pre-existing key
--      byte-shape-unchanged, pinned by the red suite) and get_my_enrollments
--      (the Q9 frozen lived-record arm).
--   4. TWO new contracts: set_journey_progress_sharing (self-only, append-only
--      consent write) and get_group_journey_progress (the JRN-16/17 read —
--      permission-gated, consent-shaped, never comparative).
--
-- Gate board Q1–Q9 on the PR. Notable build-time evidence:
--   * view_group_progress AND view_others_progress are ALREADY seeded and
--     template-wired (Steward + Guide; 97 instantiated role grants live) —
--     Q2 revised: NO permission seeding here; the catalog's own grain is used
--     (view_group_progress = the aggregated window, view_others_progress =
--     per-member marks), matching the seed descriptions.
--   * The freeze cascades sweep ACTIVE enrolments only (a completed enrolment
--     is never swept) — red-suite pinned; zero frozen rows exist on dev today.
--   * Q8 (closed-vs-archived last-leader bypass asymmetry) demonstrated both
--     ways; disposition on the PR: working-as-intended.
--
-- WHY SECURITY DEFINER (privilege-escalation surfaces — documented per
-- docs/platform/CLAUDE.md "SECURITY DEFINER discipline"):
--   journey_steps / journey_step_instances are contract-only (no client
--   SELECT); consent_records has NO client INSERT policy (ADR-U034 — writes
--   flow only through controlled definer paths). Each function below is a
--   narrow definer: search_path = '', four-hop actor chain via
--   get_current_personal_group_id(), own-subject writes only, and existence
--   concealed (P0002) ahead of every other refusal.
--
-- ERROR CONTRACT (routes map SQLSTATE -> HTTP):
--   42501  no session actor / permission refused        -> 401 / 403
--   P0002  no traveller/member standing                 -> 404 (concealed)
--   P0001  sharing on a solo walk                       -> 422
--   22023  uncatalogued consent purpose (defensive)     -> 422
-- ============================================================

-- ----------------------------------------------------------------------------
-- 1. Consent purpose catalog row (Q3). Data, not schema. withdrawable = true:
--    revocation is the point. Latest-record-wins reduction happens at the
--    per-enrolment grain via capture_context (see set_journey_progress_sharing);
--    get_own_consent_state()'s per-purpose effective projection stays coarse
--    for this purpose by design — the precise per-walk state is served by
--    get_player_state.progress_sharing (noted on the gate board).
-- ----------------------------------------------------------------------------
insert into public.consent_purposes
  (key, label, description, withdrawable, current_policy_version, sort_order)
values
  ('journey_progress_visibility',
   'Journey progress sharing',
   'Optional, decided per journey walk: let the Stewards and Guides of the group you walk with see your step completion marks for that walk — never your times, and never anything you write. You can grant or withdraw this at any time.',
   true, 'v1', 2)
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 2. Q9 — lived-record READ standing (internal; the _enrollment_traveller_standing
--    mirror plus one arm). A FROZEN walk stays readable to a traveller whose own
--    instances live on it even after the membership that once grounded standing
--    ended (left_group / removed_from_group by construction; the departed-member
--    closure/archive cases). READS ONLY — every write contract keeps
--    _enrollment_traveller_standing unchanged, and non-frozen enrolments keep
--    the membership-only gate (rejoin restores — the J-C walkthrough truth,
--    superseded for reads on frozen walks only, per the J-D gate).
-- ----------------------------------------------------------------------------
create or replace function public._enrollment_traveller_read_standing(
  p_actor uuid,
  p_enrollment_id uuid
) returns public.journey_enrollments
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_enr public.journey_enrollments%rowtype;
  v_admitted boolean := false;
begin
  select * into v_enr
    from public.journey_enrollments e
   where e.id = p_enrollment_id;

  if v_enr.id is not null and p_actor is not null then
    v_admitted := (v_enr.group_id = p_actor) or exists (
      select 1 from public.group_memberships gm
       where gm.group_id = v_enr.group_id
         and gm.member_group_id = p_actor
         and gm.status = 'active');

    if not v_admitted and v_enr.status = 'frozen' then
      v_admitted := exists (
        select 1 from public.journey_step_instances i
         where i.enrollment_id = p_enrollment_id
           and i.traveller_group_id = p_actor);
    end if;
  end if;

  if v_enr.id is null or not v_admitted then
    -- Existence is not revealed to non-travellers (the withdraw P0002 mirror).
    raise exception 'enrollment not found' using errcode = 'P0002';
  end if;

  return v_enr;
end;
$$;

comment on function public._enrollment_traveller_read_standing(uuid, uuid) is
  'FEAT-PD005 Q9 internal helper: _enrollment_traveller_standing plus the lived-record arm — a frozen enrolment is readable to a traveller whose own step-instances live on it after membership ended. Reads only (get_player_state); writes keep the unchanged gate. Service-role only.';

revoke all on function public._enrollment_traveller_read_standing(uuid, uuid) from public, anon, authenticated;
grant execute on function public._enrollment_traveller_read_standing(uuid, uuid) to service_role;

-- ----------------------------------------------------------------------------
-- 3a. get_player_state re-issue — the FEAT-PD004 body verbatim, with exactly
--     three deltas: (i) the standing gate becomes the Q9 read-standing helper,
--     (ii) the additive `freeze` block (verbatim from progress_data — open
--     reason vocabulary, consumers fallback-render), (iii) the additive
--     `progress_sharing` block (the traveller's OWN latest per-enrolment
--     decision — never anyone else's). All pre-existing keys byte-identical.
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

  -- FEAT-PD004 Q6 / FEAT-PD005 Q7: additive keys only — the nine pre-existing
  -- keys are byte-identical (red-suite pinned).
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
  'FEAT-PD003 STORY-4 (JRN-6/10), amended by FEAT-PD004 (JRN-11/13) and FEAT-PD005 (JRN-14/17): the single-round-trip player boot — journey meta, ordered steps WITH content payloads + kind metadata, the caller''s own instances (invariant 4), the Q6 resume pointer, the enrolment status, the completion and timing blocks, plus the additive freeze block (verbatim frozen_reason/frozen_at from progress_data — open vocabulary) and progress_sharing block (the caller''s own latest per-enrolment decision). Standing: PD005 Q9 read-standing (lived-record arm for frozen walks). SECURITY DEFINER: reads contract-only tables.';

revoke all on function public.get_player_state(uuid) from public, anon;
grant execute on function public.get_player_state(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 3b. get_my_enrollments re-issue — the FEAT-PD003 body with one delta: the
--     via-group arm admits a FROZEN enrolment carrying the caller's own
--     instances when active membership is gone (Q9 — the frozen card must
--     render as a door, or the read standing is unreachable in practice).
-- ----------------------------------------------------------------------------
create or replace function public.get_my_enrollments()
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

  return coalesce(
    (select jsonb_agg(t.entry order by t.enrolled_at desc, t.entry_id asc)
       from (
         select e.id as entry_id, e.enrolled_at,
                jsonb_build_object(
                  'enrollment_id', e.id,
                  'kind', 'individual',
                  'journey_id', e.journey_id,
                  'journey_title', j.title,
                  'status', e.status,
                  'last_accessed_at', e.last_accessed_at) as entry
           from public.journey_enrollments e
           join public.journeys j on j.id = e.journey_id
          where e.group_id = v_actor
            and e.status <> 'withdrawn'   -- FEAT-PD003 Q1 delta
         union all
         select e.id as entry_id, e.enrolled_at,
                jsonb_build_object(
                  'enrollment_id', e.id,
                  'kind', 'via_group',
                  'journey_id', e.journey_id,
                  'journey_title', j.title,
                  'status', e.status,
                  'last_accessed_at', e.last_accessed_at,
                  'group_id', g.id,
                  'group_name', g.name) as entry
           from public.journey_enrollments e
           join public.journeys j on j.id = e.journey_id
           join public.groups g on g.id = e.group_id
          where e.group_id <> v_actor
            and e.status <> 'withdrawn'   -- FEAT-PD003 Q1 delta
            and (
              exists (select 1 from public.group_memberships gm
                       where gm.group_id = e.group_id
                         and gm.member_group_id = v_actor
                         and gm.status = 'active')
              -- FEAT-PD005 Q9: lived-record arm — frozen walks only.
              or (e.status = 'frozen' and exists (
                    select 1 from public.journey_step_instances i
                     where i.enrollment_id = e.id
                       and i.traveller_group_id = v_actor))
            )
       ) t),
    '[]'::jsonb);
end;
$$;

comment on function public.get_my_enrollments() is
  'FEAT-PD002 STORY-1, Q1-amended by FEAT-PD003 (withdrawn excluded — history, not standing), Q9-amended by FEAT-PD005 (a frozen via-group walk carrying the caller''s own instances lists after membership ends — the lived record stays a door): the caller''s own travel, kind-marked. The player''s entry list. SECURITY DEFINER: joins memberships across RLS.';

-- ----------------------------------------------------------------------------
-- 4. set_journey_progress_sharing — the traveller's own consent act (STORY-2).
--    Self-only by construction (subject = the resolved caller; no target
--    parameter), append-only (a flip is a NEW row; the enforce_consent_append_only
--    trigger stays untouched), effective-state idempotent at the per-enrolment
--    grain (the PC007 double-submit posture), policy_version stamped
--    SERVER-SIDE from the catalog. No enrolment-status guard: sharing is the
--    traveller's own decision while they have standing (frozen/completed
--    walks included); P0001 refuses solo walks (the walker IS the party).
-- ----------------------------------------------------------------------------
create or replace function public.set_journey_progress_sharing(
  p_enrollment_id uuid,
  p_share boolean
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_user_id uuid;
  v_enr public.journey_enrollments%rowtype;
  v_purpose public.consent_purposes%rowtype;
  v_decision text;
  v_current text;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  -- Writes-grade traveller standing (own party or active member; P0002
  -- conceals otherwise — the unchanged shared gate).
  v_enr := public._enrollment_traveller_standing(v_actor, p_enrollment_id);

  if v_enr.group_id = v_actor then
    raise exception 'sharing applies to group walks only' using errcode = 'P0001';
  end if;

  select * into v_purpose
    from public.consent_purposes
   where key = 'journey_progress_visibility';
  if not found then
    raise exception 'consent purpose journey_progress_visibility is not catalogued'
      using errcode = '22023';
  end if;

  v_decision := case when p_share then 'granted' else 'withdrawn' end;

  select cr.decision into v_current
    from public.consent_records cr
   where cr.subject_group_id = v_actor
     and cr.purpose = v_purpose.key
     and cr.capture_context->>'enrollment_id' = p_enrollment_id::text
   order by cr.captured_at desc, cr.id desc
   limit 1;

  if v_current is distinct from v_decision then
    select u.id into v_user_id
      from public.users u
     where u.personal_group_id = v_actor
       and u.is_active = true
     limit 1;

    insert into public.consent_records
      (subject_user_id, subject_group_id, purpose, decision, policy_version, capture_context)
    values
      (v_user_id, v_actor, v_purpose.key, v_decision, v_purpose.current_policy_version,
       jsonb_build_object(
         'enrollment_id', p_enrollment_id,
         'group_id', v_enr.group_id,
         'surface', 'journey_player'));
  end if;

  return jsonb_build_object('enrollment_id', p_enrollment_id, 'sharing', p_share);
end;
$$;

comment on function public.set_journey_progress_sharing(uuid, boolean) is
  'FEAT-PD005 STORY-2 (JRN-17 traveller side): SECURITY DEFINER own-subject per-enrolment progress-sharing grant/withdraw. Appends one consent_records row (never mutates; ADR-U034), purpose journey_progress_visibility, capture_context carrying the enrolment; latest-wins; effective-state idempotent; policy_version server-stamped. P0001 on solo walks; P0002 without traveller standing. Direct-caller safe (ADR-U038): can only write the caller''s own consent for this catalogued purpose.';

revoke all on function public.set_journey_progress_sharing(uuid, boolean) from public, anon;
grant execute on function public.set_journey_progress_sharing(uuid, boolean) to authenticated;
grant execute on function public.set_journey_progress_sharing(uuid, boolean) to service_role;

-- ----------------------------------------------------------------------------
-- 5. get_group_journey_progress — the JRN-16/17 read (STORY-3/4). Gates in
--    order: membership standing conceals existence (P0002 — a solo enrolment
--    has no memberships, so it is concealed by construction); then the
--    catalog's own grain: view_group_progress admits the window (roster +
--    honest-basis aggregate), view_others_progress additionally opens the
--    per-member marks. The consent wall (invariant 4) is inside the payload
--    derivation itself: a non-sharing member contributes exactly
--    {member_group_id, display_name, sharing:false} and is excluded from every
--    aggregate number (Q4 — the small-party de-anonymization refusal).
--    NOTHING comparative: entries alphabetical (COLLATE "C" — stable across
--    consumers), no ordering by progress, and NO timing-shaped key anywhere
--    (Q5 — the red suite bans them by regex, including any *_at key).
-- ----------------------------------------------------------------------------
create or replace function public.get_group_journey_progress(
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
  v_can_members boolean;
  v_steps jsonb;
  v_entries jsonb;
  v_total int;
  v_sharing_count int;
  v_aggregate jsonb;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'no session actor' using errcode = '42501';
  end if;

  select * into v_enr
    from public.journey_enrollments e
   where e.id = p_enrollment_id;

  if v_enr.id is null or not exists (
    select 1 from public.group_memberships gm
     where gm.group_id = v_enr.group_id
       and gm.member_group_id = v_actor
       and gm.status = 'active') then
    raise exception 'enrollment not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, v_enr.group_id, 'view_group_progress'), false) then
    raise exception 'view_group_progress required' using errcode = '42501';
  end if;
  v_can_members := coalesce(public.has_permission(v_actor, v_enr.group_id, 'view_others_progress'), false);

  select * into v_journey from public.journeys j where j.id = v_enr.journey_id;

  -- Step skeleton only: order/title/required. No content, no duration, no
  -- timestamps (Q5).
  v_steps := coalesce(
    (select jsonb_agg(jsonb_build_object(
              'step_id', st.id,
              'step_order', st.step_order,
              'title', st.title,
              'required', st.required)
            order by st.step_order)
       from public.journey_steps st
      where st.journey_id = v_enr.journey_id),
    '[]'::jsonb);

  -- Roster + per-member (consent-shaped, permission-grained).
  with members as (
    select gm.member_group_id, pg.name as display_name
      from public.group_memberships gm
      join public.groups pg on pg.id = gm.member_group_id
     where gm.group_id = v_enr.group_id
       and gm.status = 'active'
  ), decided as (
    select m.member_group_id, m.display_name,
           coalesce(l.decision = 'granted', false) as sharing
      from members m
      left join lateral (
        select cr.decision
          from public.consent_records cr
         where cr.subject_group_id = m.member_group_id
           and cr.purpose = 'journey_progress_visibility'
           and cr.capture_context->>'enrollment_id' = p_enrollment_id::text
         order by cr.captured_at desc, cr.id desc
         limit 1) l on true
  )
  select
    count(*)::int,
    (count(*) filter (where d.sharing))::int,
    coalesce(jsonb_agg(
      case
        when d.sharing and v_can_members then
          jsonb_build_object(
            'member_group_id', d.member_group_id,
            'display_name', d.display_name,
            'sharing', true,
            'traveller_completed', p.traveller_completed,
            'required_completed', p.required_completed,
            'required_total', p.required_total,
            'per_step', p.per_step)
        when d.sharing then
          jsonb_build_object(
            'member_group_id', d.member_group_id,
            'display_name', d.display_name,
            'sharing', true)
        else
          jsonb_build_object(
            'member_group_id', d.member_group_id,
            'display_name', d.display_name,
            'sharing', false)
      end
      order by d.display_name collate "C" asc, d.member_group_id asc), '[]'::jsonb)
    into v_total, v_sharing_count, v_entries
    from decided d
    left join lateral (
      select
        (count(*) filter (where st.required and done.completed))::int as required_completed,
        (count(*) filter (where st.required))::int as required_total,
        (count(*) filter (where st.required and not done.completed)) = 0 as traveller_completed,
        coalesce(jsonb_agg(jsonb_build_object(
                   'step_id', st.id,
                   'completed', done.completed)
                 order by st.step_order), '[]'::jsonb) as per_step
        from public.journey_steps st
        cross join lateral (
          select exists (
            select 1 from public.journey_step_instances i
             where i.enrollment_id = p_enrollment_id
               and i.traveller_group_id = d.member_group_id
               and i.step_id = st.id
               and i.completed_at is not null) as completed
        ) done
       where st.journey_id = v_enr.journey_id
    ) p on true;

  -- Aggregate: per-step completed counts over SHARING members only (Q4), the
  -- basis served alongside. (The sharing set is recomputed here — STABLE
  -- function, single snapshot, bounded by party size.)
  v_aggregate := jsonb_build_object(
    'per_step', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'step_id', st.id,
                'completed_count', cnt.n)
              order by st.step_order)
         from public.journey_steps st
         cross join lateral (
           select count(distinct i.traveller_group_id)::int as n
             from public.journey_step_instances i
            where i.enrollment_id = p_enrollment_id
              and i.step_id = st.id
              and i.completed_at is not null
              and i.traveller_group_id in (
                select d2.member_group_id
                  from (select gm.member_group_id,
                               coalesce(l2.decision = 'granted', false) as sharing
                          from public.group_memberships gm
                          left join lateral (
                            select cr.decision
                              from public.consent_records cr
                             where cr.subject_group_id = gm.member_group_id
                               and cr.purpose = 'journey_progress_visibility'
                               and cr.capture_context->>'enrollment_id' = p_enrollment_id::text
                             order by cr.captured_at desc, cr.id desc
                             limit 1) l2 on true
                         where gm.group_id = v_enr.group_id
                           and gm.status = 'active') d2
                 where d2.sharing)
         ) cnt
        where st.journey_id = v_enr.journey_id),
      '[]'::jsonb),
    'basis', 'sharing-members');

  return jsonb_build_object(
    'enrollment_id', v_enr.id,
    'journey', jsonb_build_object('id', v_journey.id, 'title', v_journey.title),
    'status', v_enr.status,
    'steps', v_steps,
    'members', v_entries,
    'members_meta', jsonb_build_object('total', v_total, 'sharing', v_sharing_count),
    'aggregate', v_aggregate);
end;
$$;

comment on function public.get_group_journey_progress(uuid) is
  'FEAT-PD005 STORY-3/4 (JRN-16/17): the consent-shaped group progress window. Gates: active party membership (P0002 conceals), view_group_progress (42501; the aggregated window), view_others_progress (per-member marks). Consent wall in the derivation: non-sharing members contribute identity + sharing:false ONLY and join no aggregate; aggregates count sharing members only with the basis served (invariant 4/Q4); entries alphabetical, no timing keys anywhere (invariant 8/Q5). Direct-caller safe (ADR-U038): every rule enforced in-function.';

revoke all on function public.get_group_journey_progress(uuid) from public, anon;
grant execute on function public.get_group_journey_progress(uuid) to authenticated;
grant execute on function public.get_group_journey_progress(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- Verification (mirrors the PD004 posture)
-- ----------------------------------------------------------------------------
do $$
begin
  assert to_regprocedure('public._enrollment_traveller_read_standing(uuid, uuid)') is not null,
    'PD005: read-standing helper missing';
  assert to_regprocedure('public.get_player_state(uuid)') is not null,
    'PD005: get_player_state missing';
  assert to_regprocedure('public.get_my_enrollments()') is not null,
    'PD005: get_my_enrollments missing';
  assert to_regprocedure('public.set_journey_progress_sharing(uuid, boolean)') is not null,
    'PD005: sharing write missing';
  assert to_regprocedure('public.get_group_journey_progress(uuid)') is not null,
    'PD005: group progress read missing';
  assert exists (select 1 from public.consent_purposes where key = 'journey_progress_visibility'),
    'PD005: consent purpose row missing';
  assert exists (select 1 from public.permissions where name = 'view_group_progress'),
    'PD005: view_group_progress absent from the live catalog (expected seeded)';
  assert exists (select 1 from public.permissions where name = 'view_others_progress'),
    'PD005: view_others_progress absent from the live catalog (expected seeded)';
end $$;
