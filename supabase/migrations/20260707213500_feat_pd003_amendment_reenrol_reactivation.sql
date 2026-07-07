-- ============================================================================
-- FEAT-PD003 Amendment — Q1 addendum (Stefan's catch, 2026-07-07, same day):
-- re-enrolment REACTIVATES the withdrawn row instead of inserting a new one.
--
-- The nodded Q1 made withdrawal a terminal 'withdrawn' status so step-instance
-- history survives — but re-enrolment inserted a NEW enrolment row, and the
-- progress grain is keyed by enrollment_id, so the surviving history never
-- carried into the new walk: the player opened at step 1. The canon reading
-- (ADR-U044 §4 / the Designer grammar's minimum change): "this traveler has
-- now had the experience of passing through this step" is a fact about the
-- TRAVELLER — it does not un-happen at withdrawal. Continuation is therefore
-- the default; a deliberate fresh-start affordance is loops/respawn forward
-- shape (DS-3), not Ferd.
--
-- Replacement-in-place of enroll_self_in_journey + enroll_group_in_journey
-- (no signature change, no table change, no grant change — CREATE OR REPLACE
-- preserves grants). The ONLY delta in each: after every existing guard
-- passes, the caller's most recent withdrawn row for the same (journey,
-- party) — ordered by status_changed_at desc, id desc; legacy-semantics
-- leftovers can leave several — flips back to 'active' (status_changed_at
-- advances; enrolled_at is preserved as the original enrolment date;
-- enrolled_by_group_id updates to the reactivating actor as provenance of
-- the re-entry). All guards run BEFORE the branch, so reactivation is gated
-- exactly like a fresh enrolment (incl. the one-directional dual-enrolment
-- rule and the group-enrolment key). The group fan-out fires on reactivation
-- too — members deserve to know the group re-entered the journey.
--
-- Direct-caller question (ADR-U038): unchanged — both functions remain the
-- only write path (DML on journey_enrollments stays revoked); the partial
-- unique index uq_journey_enrollments_active_party guarantees at most one
-- active row per (journey, party) whichever branch runs.
-- ============================================================================

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
  v_withdrawn public.journey_enrollments%rowtype;
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
              where e.journey_id = p_journey_id and e.group_id = v_actor
                and e.status <> 'withdrawn') then
    raise exception 'already enrolled in this journey' using errcode = 'P0001';
  end if;

  -- Oracle B-JRN-003 (Open Q2): one-directional dual-enrollment refusal —
  -- an active via-group enrolment blocks self-enrolment (reactivation included).
  if exists (select 1
               from public.journey_enrollments e
               join public.group_memberships gm
                 on gm.group_id = e.group_id
                and gm.member_group_id = v_actor
                and gm.status = 'active'
              where e.journey_id = p_journey_id
                and e.group_id <> v_actor
                and e.status <> 'withdrawn') then
    raise exception 'already enrolled in this journey via a group' using errcode = 'P0001';
  end if;

  -- Q1 addendum: a prior withdrawn walk reactivates — same row, same
  -- step-instances, the traveller resumes where they genuinely were.
  select * into v_withdrawn
    from public.journey_enrollments e
   where e.journey_id = p_journey_id and e.group_id = v_actor
     and e.status = 'withdrawn'
   order by e.status_changed_at desc, e.id desc
   limit 1;

  if v_withdrawn.id is not null then
    update public.journey_enrollments
       set status = 'active',
           status_changed_at = now(),
           enrolled_by_group_id = v_actor
     where id = v_withdrawn.id;

    return jsonb_build_object(
      'enrollment_id', v_withdrawn.id,
      'journey_id', p_journey_id,
      'group_id', v_actor,
      'status', 'active',
      'progress_data', v_withdrawn.progress_data);
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
  'FEAT-PD002 STORY-3 (JRN-3), Q1-amended by FEAT-PD003 + the Q1 addendum: re-enrolment reactivates the most recent withdrawn row (same enrollment_id — step-instance history carries; the traveller resumes); withdrawn rows never block, completed/paused/frozen still do. FIM-only at J-A; ADR-U045 tags the J-E in-place replacement. SECURITY DEFINER: writes the narrowed journey_enrollments.';

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
  v_withdrawn public.journey_enrollments%rowtype;
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
              where e.journey_id = p_journey_id and e.group_id = p_group_id
                and e.status <> 'withdrawn') then
    raise exception 'group already enrolled in this journey' using errcode = 'P0001';
  end if;

  -- Q1 addendum: a prior withdrawn group walk reactivates — every member's
  -- step-instances carry.
  select * into v_withdrawn
    from public.journey_enrollments e
   where e.journey_id = p_journey_id and e.group_id = p_group_id
     and e.status = 'withdrawn'
   order by e.status_changed_at desc, e.id desc
   limit 1;

  if v_withdrawn.id is not null then
    update public.journey_enrollments
       set status = 'active',
           status_changed_at = now(),
           enrolled_by_group_id = v_actor
     where id = v_withdrawn.id;
    v_enrollment_id := v_withdrawn.id;
  else
    insert into public.journey_enrollments
      (journey_id, group_id, enrolled_by_group_id, status, progress_data)
    values
      (p_journey_id, p_group_id, v_actor, 'active', '{}'::jsonb)
    returning id into v_enrollment_id;
  end if;

  -- Q5: durable fan-out to ACTIVE members, actor excluded, member group
  -- existence guarded — fires on reactivation too (the group re-entered).
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
  'FEAT-PD002 STORY-4 (JRN-4), Q1-amended by FEAT-PD003 + the Q1 addendum: group re-enrolment reactivates the most recent withdrawn row (members'' step-instances carry); wielding rides the enroll_group_in_journey key; durable V3 rows fan out on first enrolment AND reactivation. SECURITY DEFINER: writes the narrowed journey_enrollments + notifications.';
