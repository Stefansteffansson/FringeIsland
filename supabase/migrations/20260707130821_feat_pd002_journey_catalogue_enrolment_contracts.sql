-- ============================================================================
-- FEAT-PD002 (Journeys Cycle J-A) — journey catalogue & enrolment contracts,
-- the first DS-3 feature migration. Rider: FEAT-PC016 get_my_pending_nominations
-- (Groups-area audit LOW closure). Hub halves: FEAT-H019 (JRN-1/2/3/4 + the
-- GRP-4 enrolment-summary seam).
--
-- Six own-actor SECURITY DEFINER contracts over EXISTING substrate (no new
-- table; the ADR-U044 step-model schema is Cycle J-B's), consumed as PostgREST
-- RPC (ADR-U038: rules live here, never only in a Surface route):
--
--   get_journey_catalog()                 — published catalogue, RLS-mirror
--   get_journey_detail(journey)           — fields + steps overview + viewer block
--   enroll_self_in_journey(journey)       — personal group as party (ADR-U020)
--   enroll_group_in_journey(group,journey)— permission-wielded party enrolment
--   withdraw_from_journey(enrollment)     — the same door, outward
--   get_my_enrollments()                  — own + via-group, kind-marked
--   get_group_enrollment_summary(group)   — the GRP-4 seam (DS-3 read; never a
--                                           PC-3 field — one-way rule ADR-U023)
--   get_my_pending_nominations()          — PC016 rider, get_my_invitations mirror
--
-- Decisions bound at authoring (recorded in FEAT-PD002 Open spec questions;
-- the schema-review gate rules):
--   Q1 withdraw semantics: ROW DELETION (default; no step-instances exist yet;
--      revisited at J-B when step-instances FK to enrolments).
--   Q2 dual-enrollment: the oracle's semantic (B-JRN-003, hub-legacy enroll
--      route) was one-directional detection — self-enrol refused when a
--      via-group enrolment exists; group-enrol never blocked on a member's
--      individual enrolment. Homed substrate-side exactly as observed.
--   Q3 is_published vs is_public: the catalogue/detail predicate mirrors the
--      journeys_select_published RLS verbatim — is_published AND (is_public OR
--      owner-group member OR individually enrolled OR platform admin). No new
--      semantic invented.
--   Q4 write-narrowing: BOTH policy drops AND explicit DML revoke (the
--      revoke keeps the surface closed even if a policy name ever drifted —
--      the DROP POLICY IF EXISTS wrong-name gotcha), PLUS a partial unique
--      index on active (journey_id, group_id) as the structural duplicate
--      backstop the rebuilt substrate lost. Reads stay RLS-scoped (SELECT
--      policies and grant untouched).
--   Q5 notification shape: in-contract durable insert (the nominate_steward
--      precedent), type 'group_journey_enrollment', fan-out to ACTIVE members
--      excluding the actor. Push/preferences ride the Notifications area.
--
-- Direct-caller question (ADR-U038, answered at the gate): after this
-- migration a direct PostgREST caller — including an anonymous-session Mist —
-- can read journeys/enrolments exactly as RLS scopes them and can WRITE
-- journey_enrollments only through the contracts above; journeys itself has
-- never had a client write policy.
--
-- SECURITY DEFINER justification: every function must read across the
-- caller's RLS horizon (published-journey mirror, membership joins, the
-- notifications fan-out) and/or write the narrowed table. All bodies declare
-- SET search_path = '' and gate before any mutation (house guard order:
-- FIM-only -> suspended -> P0002 existence -> 42501 permission -> P0001
-- business rule).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Internal helper — the get_group_detail visibility gate, factored.
--    Mirrors 20260706170000_fix_pc015_revealed_visibility.sql: active member
--    (any lifecycle state); public+active; own-invited+active; wields an
--    ACTIVE member-group (act_as_group). Internal only — revoked from
--    authenticated below; reachable solely through the contracts.
-- ----------------------------------------------------------------------------
create or replace function public._journey_party_visible(
  p_actor uuid,
  p_group_id uuid
) returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_is_public boolean;
  v_status text;
  v_is_member boolean := false;
  v_is_invited boolean := false;
  v_wields boolean := false;
begin
  if p_actor is null then
    return false;
  end if;

  select g.is_public, g.status into v_is_public, v_status
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  if not found then
    return false;
  end if;

  select (gm.status = 'active'), (gm.status = 'invited')
    into v_is_member, v_is_invited
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = p_actor;
  v_is_member := coalesce(v_is_member, false);
  v_is_invited := coalesce(v_is_invited, false);

  if v_is_member
     or (v_is_public and v_status = 'active')
     or (v_is_invited and v_status = 'active') then
    return true;
  end if;

  select exists (
    select 1
      from public.group_memberships host
      join public.group_memberships mine
        on mine.group_id = host.member_group_id
       and mine.member_group_id = p_actor
       and mine.status = 'active'
      join public.user_group_roles ugr
        on ugr.group_id = host.member_group_id
       and ugr.member_group_id = p_actor
      join public.group_role_permissions grp on grp.group_role_id = ugr.group_role_id
      join public.permissions p on p.id = grp.permission_id
     where host.group_id = p_group_id
       and host.status = 'active'
       and p.name = 'act_as_group'
  ) into v_wields;

  return v_wields;
end;
$$;

comment on function public._journey_party_visible(uuid, uuid) is
  'FEAT-PD002 internal: the get_group_detail visibility gate factored for the journey-party contracts (enroll_group_in_journey, get_group_enrollment_summary). Never wider than the group itself; revoked from callers.';


-- ----------------------------------------------------------------------------
-- 1. get_journey_catalog — STORY-1. Readable by ANY authenticated session
--    including Mists (published structure is shared-world state, DS-3 §3).
--    Predicate mirrors journeys_select_published verbatim (Open Q3). Stable
--    non-ranking order: title, id tiebreak (FEAT-H019 Open Q2 default). No
--    traveller counts, rankings, or comparative fields (DS-3 invariant 8 at
--    the source). step_count derives from the realized content JSONB until
--    J-B re-points it to step rows — payload-stable across that swap.
-- ----------------------------------------------------------------------------
create or replace function public.get_journey_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return coalesce(
    (select jsonb_agg(jsonb_build_object(
              'id', j.id,
              'title', j.title,
              'description', j.description,
              'difficulty_level', j.difficulty_level,
              'estimated_duration_minutes', j.estimated_duration_minutes,
              'tags', to_jsonb(coalesce(j.tags, '{}'::text[])),
              'step_count', coalesce(jsonb_array_length(j.content->'steps'), 0))
            order by j.title asc, j.id asc)
       from public.journeys j
      where j.is_published = true
        and (j.is_public = true
             or public.is_active_group_member(j.created_by_group_id)
             or public.is_enrolled_in_journey(j.id)
             or public.is_platform_admin())),
    '[]'::jsonb);
end;
$$;

comment on function public.get_journey_catalog() is
  'FEAT-PD002 STORY-1 (JRN-1 platform half): the published catalogue, visibility mirroring the journeys_select_published RLS. Mist-readable. SECURITY DEFINER: derives step_count and owner-member visibility across RLS.';


-- ----------------------------------------------------------------------------
-- 2. get_journey_detail — STORY-2. The catalogue fields + a steps overview
--    (title/kind/duration — NEVER the content payload; preview is a DS-4
--    seam) + the viewer block. Unpublished/nonexistent -> P0002,
--    indistinguishably. Mist-readable; the viewer block then offers nothing.
--    enrollable_groups is the JRN-4 picker's ONLY source (the Surface never
--    computes eligibility, ADR-U041 posture).
-- ----------------------------------------------------------------------------
create or replace function public.get_journey_detail(
  p_journey_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_journey public.journeys%rowtype;
  v_steps jsonb;
  v_is_enrolled boolean := false;
  v_enrolled_via jsonb := '[]'::jsonb;
  v_enrollable jsonb := '[]'::jsonb;
begin
  v_actor := public.get_current_personal_group_id();

  select * into v_journey
    from public.journeys j
   where j.id = p_journey_id
     and j.is_published = true
     and (j.is_public = true
          or public.is_active_group_member(j.created_by_group_id)
          or public.is_enrolled_in_journey(j.id)
          or public.is_platform_admin());
  if v_journey.id is null then
    raise exception 'journey not found' using errcode = 'P0002';
  end if;

  v_steps := coalesce(
    (select jsonb_agg(jsonb_build_object(
              'title', t.s->>'title',
              'kind', t.s->>'type',
              'duration_minutes', nullif(t.s->>'duration_minutes', '')::integer)
            order by t.ord)
       from jsonb_array_elements(coalesce(v_journey.content->'steps', '[]'::jsonb))
            with ordinality as t(s, ord)),
    '[]'::jsonb);

  if v_actor is not null then
    v_is_enrolled := exists (
      select 1 from public.journey_enrollments e
       where e.journey_id = p_journey_id and e.group_id = v_actor);

    v_enrolled_via := coalesce(
      (select jsonb_agg(jsonb_build_object('group_id', g.id, 'group_name', g.name)
              order by g.name asc)
         from public.journey_enrollments e
         join public.groups g on g.id = e.group_id
         join public.group_memberships gm
           on gm.group_id = e.group_id
          and gm.member_group_id = v_actor
          and gm.status = 'active'
        where e.journey_id = p_journey_id
          and e.group_id <> v_actor),
      '[]'::jsonb);

    v_enrollable := coalesce(
      (select jsonb_agg(jsonb_build_object('group_id', g.id, 'group_name', g.name)
              order by g.name asc)
         from public.groups g
         join public.group_memberships gm
           on gm.group_id = g.id
          and gm.member_group_id = v_actor
          and gm.status = 'active'
        where g.group_type = 'engagement'
          and g.status = 'active'
          and coalesce(public.has_permission(v_actor, g.id, 'enroll_group_in_journey'), false)),
      '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'id', v_journey.id,
    'title', v_journey.title,
    'description', v_journey.description,
    'difficulty_level', v_journey.difficulty_level,
    'estimated_duration_minutes', v_journey.estimated_duration_minutes,
    'tags', to_jsonb(coalesce(v_journey.tags, '{}'::text[])),
    'step_count', jsonb_array_length(v_steps),
    'steps', v_steps,
    'is_enrolled_individually', v_is_enrolled,
    'enrolled_via', v_enrolled_via,
    'enrollable_groups', v_enrollable);
end;
$$;

comment on function public.get_journey_detail(uuid) is
  'FEAT-PD002 STORY-2 (JRN-2 platform half; JRN-4 picker source): one journey whole, viewer-shaped. P0002 no-existence-leak on unpublished/absent. SECURITY DEFINER: viewer block joins memberships + permission resolution across RLS.';


-- ----------------------------------------------------------------------------
-- 3. enroll_self_in_journey — STORY-3 (JRN-3). The personal group IS the
--    party (ADR-U020). FIM-only at J-A with the ADR-U045 disposition tagged:
--    at Cycle J-E this contract is REPLACED IN PLACE to admit a Mist iff the
--    journey is the designated onboarding journey. Permission resolved in the
--    journey-owning context — Tier-1 (FringeIsland Members baseline role
--    carries enroll_self_in_journey) makes this TRUE for every active FIM.
--    Oracle Q2: refuses when an active via-group enrolment already exists.
-- ----------------------------------------------------------------------------
create or replace function public.enroll_self_in_journey(
  p_journey_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_journey public.journeys%rowtype;
  v_enrollment_id uuid;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    -- [ADR-U045 disposition] replaced in place at J-E: a Mist may enrol iff
    -- p_journey_id is the designated onboarding journey.
    raise exception 'self-enrolment is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_journey
    from public.journeys j
   where j.id = p_journey_id
     and j.is_published = true
     and (j.is_public = true
          or public.is_active_group_member(j.created_by_group_id)
          or public.is_enrolled_in_journey(j.id)
          or public.is_platform_admin());
  if v_journey.id is null then
    raise exception 'journey not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, v_journey.created_by_group_id,
                                        'enroll_self_in_journey'), false) then
    raise exception 'not permitted to enroll in this journey' using errcode = '42501';
  end if;

  if exists (select 1 from public.journey_enrollments e
              where e.journey_id = p_journey_id and e.group_id = v_actor) then
    raise exception 'already enrolled in this journey' using errcode = 'P0001';
  end if;

  -- Oracle B-JRN-003 (Open Q2): one-directional dual-enrollment refusal —
  -- an active via-group enrolment blocks self-enrolment.
  if exists (select 1
               from public.journey_enrollments e
               join public.group_memberships gm
                 on gm.group_id = e.group_id
                and gm.member_group_id = v_actor
                and gm.status = 'active'
              where e.journey_id = p_journey_id
                and e.group_id <> v_actor) then
    raise exception 'already enrolled in this journey via a group' using errcode = 'P0001';
  end if;

  insert into public.journey_enrollments
    (journey_id, group_id, enrolled_by_group_id, status, progress_data)
  values
    (p_journey_id, v_actor, v_actor, 'active', '{}'::jsonb)
  returning id into v_enrollment_id;

  return jsonb_build_object(
    'enrollment_id', v_enrollment_id,
    'journey_id', p_journey_id,
    'group_id', v_actor,
    'status', 'active',
    'progress_data', '{}'::jsonb);
end;
$$;

comment on function public.enroll_self_in_journey(uuid) is
  'FEAT-PD002 STORY-3 (JRN-3): solo travel = the personal group as party (ADR-U020). FIM-only at J-A; ADR-U045 tags the J-E in-place replacement for the designated onboarding journey. SECURITY DEFINER: writes the narrowed journey_enrollments.';


-- ----------------------------------------------------------------------------
-- 4. enroll_group_in_journey — STORY-4 (JRN-4, the wielding walk). Gated by
--    the group-scoped enroll_group_in_journey key (ADR-U041 posture);
--    invisible/absent group -> P0002 via the get_group_detail mirror;
--    non-active group refused honestly; duplicate refused; durable
--    notification rows to the group's ACTIVE members, actor excluded (Q5:
--    in-contract insert on the nominate_steward precedent — V3 rides durable
--    rows now, push at the Notifications area).
-- ----------------------------------------------------------------------------
create or replace function public.enroll_group_in_journey(
  p_group_id uuid,
  p_journey_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_journey public.journeys%rowtype;
  v_group public.groups%rowtype;
  v_enrollment_id uuid;
  v_member record;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'group enrolment is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_journey
    from public.journeys j
   where j.id = p_journey_id
     and j.is_published = true
     and (j.is_public = true
          or public.is_active_group_member(j.created_by_group_id)
          or public.is_enrolled_in_journey(j.id)
          or public.is_platform_admin());
  if v_journey.id is null then
    raise exception 'journey not found' using errcode = 'P0002';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  if v_group.id is null or not public._journey_party_visible(v_actor, p_group_id) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, p_group_id,
                                        'enroll_group_in_journey'), false) then
    raise exception 'not permitted to enroll this group' using errcode = '42501';
  end if;

  if v_group.status <> 'active' then
    raise exception 'group is not active' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.journey_enrollments e
              where e.journey_id = p_journey_id and e.group_id = p_group_id) then
    raise exception 'group already enrolled in this journey' using errcode = 'P0001';
  end if;

  insert into public.journey_enrollments
    (journey_id, group_id, enrolled_by_group_id, status, progress_data)
  values
    (p_journey_id, p_group_id, v_actor, 'active', '{}'::jsonb)
  returning id into v_enrollment_id;

  -- Q5: durable fan-out to ACTIVE members, actor excluded, member group
  -- existence guarded (the notify_group_deleted precedent).
  for v_member in
    select gm.member_group_id
      from public.group_memberships gm
     where gm.group_id = p_group_id
       and gm.status = 'active'
       and gm.member_group_id <> v_actor
  loop
    if exists (select 1 from public.groups where id = v_member.member_group_id) then
      insert into public.notifications
        (recipient_group_id, type, title, body, payload, group_id)
      values
        (v_member.member_group_id,
         'group_journey_enrollment',
         'Your group enrolled in a journey',
         'The group "' || v_group.name || '" has been enrolled in the journey "'
           || v_journey.title || '".',
         jsonb_build_object(
           'group_id', p_group_id,
           'group_name', v_group.name,
           'journey_id', p_journey_id,
           'journey_title', v_journey.title,
           'enrolled_by_group_id', v_actor),
         p_group_id);
    end if;
  end loop;

  return jsonb_build_object(
    'enrollment_id', v_enrollment_id,
    'journey_id', p_journey_id,
    'group_id', p_group_id,
    'status', 'active');
end;
$$;

comment on function public.enroll_group_in_journey(uuid, uuid) is
  'FEAT-PD002 STORY-4 (JRN-4): wielding a group into a journey is a capability (enroll_group_in_journey key), never a role string. Provenance via enrolled_by_group_id; durable V3 notification rows to active members. SECURITY DEFINER: writes the narrowed journey_enrollments + notifications.';


-- ----------------------------------------------------------------------------
-- 5. withdraw_from_journey — STORY-5. Own individual enrolment: self-serve;
--    group enrolment: unenroll_from_journey-gated in that group. Withdrawal
--    is ROW DELETION at J-A (Open Q1 default — revisited at J-B when
--    step-instances FK to enrolments). Frozen enrolments refuse (oracle
--    B-SEC-003/004: frozen is immutable, only the service role unfreezes).
--    Invisible/absent -> P0002 (visibility = the enrolment SELECT RLS mirror:
--    own row, or active member of the enrolled group).
-- ----------------------------------------------------------------------------
create or replace function public.withdraw_from_journey(
  p_enrollment_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_enr public.journey_enrollments%rowtype;
  v_visible boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'withdrawal is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_enr
    from public.journey_enrollments e
   where e.id = p_enrollment_id;

  if v_enr.id is not null then
    v_visible := (v_enr.group_id = v_actor) or exists (
      select 1 from public.group_memberships gm
       where gm.group_id = v_enr.group_id
         and gm.member_group_id = v_actor
         and gm.status = 'active');
  end if;
  if v_enr.id is null or not v_visible then
    raise exception 'enrollment not found' using errcode = 'P0002';
  end if;

  if v_enr.status = 'frozen' then
    raise exception 'enrollment is frozen' using errcode = 'P0001';
  end if;

  if v_enr.group_id <> v_actor then
    if not coalesce(public.has_permission(v_actor, v_enr.group_id,
                                          'unenroll_from_journey'), false) then
      raise exception 'not permitted to withdraw this group' using errcode = '42501';
    end if;
  end if;

  delete from public.journey_enrollments where id = p_enrollment_id;

  return jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'journey_id', v_enr.journey_id,
    'group_id', v_enr.group_id,
    'withdrawn', true);
end;
$$;

comment on function public.withdraw_from_journey(uuid) is
  'FEAT-PD002 STORY-5: enrolment is never a one-way door. Row deletion at J-A (Open Q1); frozen refuses (B-SEC-003/004); group withdrawal rides the unenroll_from_journey key. SECURITY DEFINER: deletes on the narrowed table.';


-- ----------------------------------------------------------------------------
-- 6. get_my_enrollments — STORY-1. The caller's individual enrolments + the
--    enrolments of groups they're an active member of, kind-marked
--    ('individual' | 'via_group' — a string vocabulary, not an enum). Open to
--    any session WITH an actor (a materialised Mist reads their own — empty
--    until J-E); a session without an actor is refused, never silently empty.
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
           join public.group_memberships gm
             on gm.group_id = e.group_id
            and gm.member_group_id = v_actor
            and gm.status = 'active'
          where e.group_id <> v_actor
       ) t),
    '[]'::jsonb);
end;
$$;

comment on function public.get_my_enrollments() is
  'FEAT-PD002 STORY-1: the caller''s own travel — individual + via-group, kind-marked. The Surface''s "my journeys" read and the player''s entry list (J-B). SECURITY DEFINER: joins memberships across RLS.';


-- ----------------------------------------------------------------------------
-- 7. get_group_enrollment_summary — STORY-6, the GRP-4 seam. Readable by
--    exactly those who may see the group (the get_group_detail visibility
--    gate, factored above — never a wider window than the group itself);
--    P0002 otherwise, message-identical to get_group_detail ('group not
--    found'). Composed at the Hub group-detail BFF as a failure-isolated
--    slice (ADR-U042) — deliberately NOT a get_group_detail field (a PC-3
--    function reading a DS-3 table would break the one-way rule, ADR-U023).
-- ----------------------------------------------------------------------------
create or replace function public.get_group_enrollment_summary(
  p_group_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_items jsonb;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'group enrollment summary is FIM-only' using errcode = '42501';
  end if;

  if not public._journey_party_visible(v_actor, p_group_id) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  v_items := coalesce(
    (select jsonb_agg(jsonb_build_object(
              'journey_id', e.journey_id,
              'title', j.title,
              'status', e.status)
            order by e.enrolled_at desc, e.id asc)
       from public.journey_enrollments e
       join public.journeys j on j.id = e.journey_id
      where e.group_id = p_group_id),
    '[]'::jsonb);

  return jsonb_build_object(
    'count', jsonb_array_length(v_items),
    'enrollments', v_items);
end;
$$;

comment on function public.get_group_enrollment_summary(uuid) is
  'FEAT-PD002 STORY-6 (the GRP-4 seam): a group''s journeys at a glance, visibility mirroring get_group_detail exactly. SECURITY DEFINER: reads enrolments across RLS within the group''s own window.';


-- ----------------------------------------------------------------------------
-- 8. FEAT-PC016 rider — get_my_pending_nominations. The nominee's own
--    pending-nomination window, mirroring get_my_invitations (FEAT-PC012)
--    exactly: FIM-only, own-recipient rows, SERVER-clock expiry, newest
--    first, [] when none. group_name resolves from the payload the
--    nomination writer embedded (display-identity already in the row).
--    Closes the 2026-07-06 compliance audit LOW finding — the pending
--    derivation leaves hub/lib/groups/leadership.ts and gains one home.
-- ----------------------------------------------------------------------------
create or replace function public.get_my_pending_nominations()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'nominations are FIM-only' using errcode = '42501';
  end if;

  return coalesce(
    (select jsonb_agg(jsonb_build_object(
              'notification_id', n.id,
              'group_id', n.group_id,
              'group_name', n.payload->>'group_name',
              'created_at', n.created_at,
              'expires_at', n.expires_at)
            order by n.created_at desc, n.id desc)
       from public.notifications n
      where n.recipient_group_id = v_actor
        and n.type = 'stewardship_nomination'
        and n.action_taken is null
        and n.expires_at > now()),
    '[]'::jsonb);
end;
$$;

comment on function public.get_my_pending_nominations() is
  'FEAT-PC016 (J-A rider): the nominee''s own pending stewardship nominations from the substrate clock — the get_my_invitations mirror. SECURITY DEFINER: own-recipient notification rows across RLS.';


-- ----------------------------------------------------------------------------
-- 9. Direct-write narrowing on journey_enrollments (STORY-7, Open Q4: BOTH).
--    The four legacy client-write policies (sprint0) carried the v1 sin —
--    invariants (duplicate/party/permission) lived nowhere. With the
--    contracts canonical, the direct PostgREST write surface closes:
--    policy drops + explicit DML revoke (defense-in-depth against the
--    DROP-POLICY-wrong-name gotcha). Reads stay RLS-scoped — the two SELECT
--    policies and the SELECT grant are untouched. Progress contracts arrive
--    at J-B over this narrowed substrate.
-- ----------------------------------------------------------------------------
drop policy if exists "enrollment_insert_individual" on public.journey_enrollments;
drop policy if exists "enrollment_insert_group" on public.journey_enrollments;
drop policy if exists "enrollment_update_own" on public.journey_enrollments;
drop policy if exists "enrollment_update_group" on public.journey_enrollments;

revoke insert, update, delete on table public.journey_enrollments from anon, authenticated;

-- Structural duplicate backstop the 2026-02-21 rebuild lost (the legacy
-- schema's partial-active unique): one ACTIVE enrolment per (journey, party).
-- Partial so the PC013/PC014 freeze lifecycle (frozen rows preserved for
-- review) never blocks a legitimate future re-enrolment decision at J-B.
create unique index if not exists uq_journey_enrollments_active_party
  on public.journey_enrollments (journey_id, group_id)
  where status = 'active';


-- ----------------------------------------------------------------------------
-- 10. Grants — the PC014 posture: revoke from PUBLIC and, separately and
--     explicitly, from anon (Supabase default privileges grant EXECUTE to
--     anon directly; revoking PUBLIC alone leaves anon live). Contracts run
--     as authenticated (Mists included where the body admits them) and
--     service_role. The internal helper is additionally revoked from
--     authenticated — reachable only through the contracts.
-- ----------------------------------------------------------------------------
revoke all on function public._journey_party_visible(uuid, uuid) from public;
revoke all on function public._journey_party_visible(uuid, uuid) from anon;
revoke all on function public._journey_party_visible(uuid, uuid) from authenticated;
grant execute on function public._journey_party_visible(uuid, uuid) to service_role;

revoke all on function public.get_journey_catalog() from public;
revoke all on function public.get_journey_catalog() from anon;
grant execute on function public.get_journey_catalog() to authenticated, service_role;

revoke all on function public.get_journey_detail(uuid) from public;
revoke all on function public.get_journey_detail(uuid) from anon;
grant execute on function public.get_journey_detail(uuid) to authenticated, service_role;

revoke all on function public.enroll_self_in_journey(uuid) from public;
revoke all on function public.enroll_self_in_journey(uuid) from anon;
grant execute on function public.enroll_self_in_journey(uuid) to authenticated, service_role;

revoke all on function public.enroll_group_in_journey(uuid, uuid) from public;
revoke all on function public.enroll_group_in_journey(uuid, uuid) from anon;
grant execute on function public.enroll_group_in_journey(uuid, uuid) to authenticated, service_role;

revoke all on function public.withdraw_from_journey(uuid) from public;
revoke all on function public.withdraw_from_journey(uuid) from anon;
grant execute on function public.withdraw_from_journey(uuid) to authenticated, service_role;

revoke all on function public.get_my_enrollments() from public;
revoke all on function public.get_my_enrollments() from anon;
grant execute on function public.get_my_enrollments() to authenticated, service_role;

revoke all on function public.get_group_enrollment_summary(uuid) from public;
revoke all on function public.get_group_enrollment_summary(uuid) from anon;
grant execute on function public.get_group_enrollment_summary(uuid) to authenticated, service_role;

revoke all on function public.get_my_pending_nominations() from public;
revoke all on function public.get_my_pending_nominations() from anon;
grant execute on function public.get_my_pending_nominations() to authenticated, service_role;
