-- TASK-JRN-PAUSE-01 — journey enrolment pause / resume: the `paused` CHECK
-- value gets its write path, and the freeze cascade learns to reach it.
--
-- OWNERSHIP: Platform Domain / DS-3 Journeys — FEAT-PD002 STORY-8 (amendment
-- 2026-09-03), consumed by Hub FEAT-H019 STORY-8. Ruled by Stefan at the Ferd
-- leftovers pass (2026-09-03: "journey pause … now"; bridge 2026-09-03_02,
-- item 2 of four). Both new functions are registered under DS-3 in
-- supabase/ownership.manifest.json in the same PR (review checklist row 1).
--
-- WHAT THIS DOES.
--   1. pause_journey_enrollment(p_enrollment_id) / resume_journey_enrollment(
--      p_enrollment_id): the traveller's OWN enrolment only (a group's walk is
--      the group's — 42501 for a visible row that is not the caller's;
--      P0002 for one they cannot see). active -> paused -> active, with
--      status_changed_at moving and NOTHING else touched (progress_data, step
--      instances, engagements — the walk resumes where it stopped). Refusals
--      are typed P0001 naming the state: completed / frozen / withdrawn, and
--      "already paused" / "not paused". A Mist may pause their one (onboarding)
--      walk — the actor gate is "resolvable + account active", not FIM-only.
--      The step contracts already refuse anything not 'active' (PD003:958,
--      :1044; PD007's save_step_response), so a paused walk holds until resumed
--      with no new rule.
--   2. The ADR-U016 cascade check the task names: the two DS-3 lifecycle-fact
--      handlers (COR-A, 20260719190205 §1a/1b) froze `status = 'active'` rows
--      only, so a paused walk would have SHELTERED from a member's departure
--      and a group's closure. Re-issued here byte-identical except the three
--      predicates, which become `status in ('active', 'paused')`. The frozen
--      shape wins; pause is not a third terminal. The pc015 wielded-exit
--      divergence (`status <> 'frozen'`, ADR-U047 rule 7) is untouched — it
--      already reached paused rows. CREATE OR REPLACE preserves the handlers'
--      ACLs (core-internal, no client execute); the revokes are re-asserted
--      below anyway (review checklist row 4).
--
-- ADR-U047 NOTE (for the gate, not silently fixed): rule 7 and the §L3 table
-- describe the member-departed / group-closed handlers as freezing "active"
-- enrolments. After this migration they freeze active OR paused. The ADR is a
-- fuller-auto carve-out; FEAT-PD002 STORY-8 records the widening and this
-- header points at it — the ADR amendment is Stefan's call at the gate.
--
-- DIRECT-CALLER (ADR-U038): a direct UPDATE of journey_enrollments.status by
-- any client role refuses at the grant (42501 — PD002 STORY-7 revoked DML,
-- TASK-SEC-02 keeps it so); the two contracts are the only doors, and each
-- gates on ownership before it gates on state.
--
-- SIBLING ASSERTIONS (grep: ds3_lifecycle_member_departed,
-- ds3_lifecycle_group_closed, frozen_reason, removed_from_group, group_closed,
-- group_archived, left_group, 'paused' — the whole hub/tests tree):
--   * groups/membership-lifecycle.test.ts, groups/group-closure-deletion.test.ts,
--     groups/stewardship-succession.test.ts, groups/group-of-groups.test.ts,
--     auth/fim-account-erasure.test.ts, communication/lifecycle-dispositions.test.ts,
--     journeys/journey-group-progress-frozen-contracts.test.ts,
--     journeys/journey-step-response-capture-contracts.test.ts,
--     notifications/realtime-hint-and-policy.test.ts, admin/sealed-thread-admin-sight.test.ts
--     — every one pins an ACTIVE row freezing (or a frozen row's shape); none
--     seeds a paused enrolment into a cascade. Widening the predicate changes
--     no active-row outcome. All LEFT.
--   * platform/internal-api-conformance.test.ts, unit/platform/ownership-direction-rule.test.ts
--     — signature + ownership + invocation-axis pins; re-issue is signature-
--     identical and the manifest gains the two contracts. LEFT.
--   * journeys/journey-enrolment-pause-contracts.test.ts — NEW (this task):
--     the contract cells RED at HEAD (PGRST202), and the two cascade cells RED
--     at HEAD for the RIGHT reason — a paused row seeded by admin SQL stays
--     'paused' through leave_group / delete_group on today's substrate.
--   * unit/components/journeys/freeze-banner.test.tsx, unit/app/journeys/
--     journey-player-page.test.tsx — render frozen/nonactive payloads; LEFT
--     (the player page gains paused cells in the same PR).
--   * Q1 post-apply verification set (E2E, from hub/): journey-pause.spec.ts
--     (NEW), player.spec.ts, journeys.spec.ts, frozen-and-group-progress.spec.ts.
--
-- REVERSIBILITY: DROP the two contracts; re-issue the two handlers from
-- 20260719190205:71-121 / :131-192 (their revokes at :248-249).

-- ============================================================================
-- PART 1 — the two DS-3 contracts (FEAT-PD002 STORY-8)
-- ============================================================================

create or replace function public.pause_journey_enrollment(
  p_enrollment_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_active boolean;
  v_enr public.journey_enrollments%rowtype;
  v_visible boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'pausing requires a resolvable actor' using errcode = '42501';
  end if;
  select u.is_active into v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  -- Visibility mirror (the withdraw shape): own row, or an active member of
  -- the enrolled group. Invisible or absent -> P0002, indistinguishably.
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

  -- Own walks only: a group's enrolment pauses by the group's lifecycle, never
  -- by one member's act (no group-enrolment pause this cycle — STORY-8 No-go).
  if v_enr.group_id <> v_actor then
    raise exception 'only the traveller may pause their own walk' using errcode = '42501';
  end if;

  if v_enr.status = 'paused' then
    raise exception 'enrollment is already paused' using errcode = 'P0001';
  end if;
  if v_enr.status <> 'active' then
    raise exception 'enrollment is %', v_enr.status using errcode = 'P0001';
  end if;

  -- The rest is recorded on the row alone; progress is untouched.
  update public.journey_enrollments
     set status = 'paused',
         status_changed_at = now()
   where id = p_enrollment_id;

  return jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'journey_id', v_enr.journey_id,
    'status', 'paused');
end;
$$;

comment on function public.pause_journey_enrollment(uuid) is
  'FEAT-PD002 STORY-8 (TASK-JRN-PAUSE-01): pause the caller''s OWN enrolment (active -> paused); progress untouched, status_changed_at moves. Own walks only (42501 for a visible row that is not the caller''s; P0002 invisible/absent); P0001 names completed/frozen/withdrawn/already-paused. Mist-callable (their one onboarding walk). SECURITY DEFINER: writes the DML-revoked table.';

create or replace function public.resume_journey_enrollment(
  p_enrollment_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_active boolean;
  v_enr public.journey_enrollments%rowtype;
  v_visible boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'resuming requires a resolvable actor' using errcode = '42501';
  end if;
  select u.is_active into v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
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

  if v_enr.group_id <> v_actor then
    raise exception 'only the traveller may resume their own walk' using errcode = '42501';
  end if;

  if v_enr.status = 'active' then
    raise exception 'enrollment is not paused' using errcode = 'P0001';
  end if;
  if v_enr.status <> 'paused' then
    raise exception 'enrollment is %', v_enr.status using errcode = 'P0001';
  end if;

  -- Back to active at exactly the position it held: nothing but the status
  -- and its timestamp move (get_player_state's resume pointer is derived from
  -- the untouched instances/engagements).
  update public.journey_enrollments
     set status = 'active',
         status_changed_at = now()
   where id = p_enrollment_id;

  return jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'journey_id', v_enr.journey_id,
    'status', 'active');
end;
$$;

comment on function public.resume_journey_enrollment(uuid) is
  'FEAT-PD002 STORY-8 (TASK-JRN-PAUSE-01): resume the caller''s OWN paused enrolment (paused -> active) at the position it held; progress untouched. Own walks only (42501 / P0002 as pause); P0001 names completed/frozen/withdrawn/not-paused. Mist-callable. SECURITY DEFINER: writes the DML-revoked table.';

-- Grants — the house posture: revoke from PUBLIC and, separately, from anon;
-- execute for authenticated (Mists included — the body admits them) and
-- service_role. (platform/CLAUDE.md: the default privileges do NOT cover you.)
revoke all on function public.pause_journey_enrollment(uuid) from public;
revoke all on function public.pause_journey_enrollment(uuid) from anon;
grant execute on function public.pause_journey_enrollment(uuid) to authenticated, service_role;
revoke all on function public.resume_journey_enrollment(uuid) from public;
revoke all on function public.resume_journey_enrollment(uuid) from anon;
grant execute on function public.resume_journey_enrollment(uuid) to authenticated, service_role;

-- ============================================================================
-- PART 2 — the two DS-3 lifecycle-fact handlers, re-issued in place
-- (COR-A 20260719190205 §1a/1b, byte-identical except the three predicates
-- and the comment lines that described them; the wielded-exit branch is
-- untouched). Extracted from the source migration at authoring, not retyped.
-- ============================================================================

create or replace function public.ds3_lifecycle_member_departed(
  p_group_id uuid,
  p_member_group_id uuid,
  p_reason text
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_reason not in ('left_group', 'removed_from_group', 'left_as_group') then
    raise exception 'ds3_lifecycle_member_departed: invalid reason %', p_reason
      using errcode = '22023';  -- invalid_parameter_value
  end if;

  if p_reason = 'left_as_group' then
    -- pc015 wielded-exit divergence (pc015:385; ADR-U047 rule 7): status <> 'frozen'
    -- (also freezes paused/completed); frozen_reason stays 'left_group' verbatim.
    update public.journey_enrollments je
       set status = 'frozen',
           progress_data = je.progress_data || jsonb_build_object(
             'frozen_reason', 'left_group',
             'frozen_at', now()::text
           ),
           status_changed_at = now()
      from public.journeys j
     where je.journey_id = j.id
       and je.group_id = p_member_group_id
       and j.created_by_group_id = p_group_id
       and j.is_public = false
       and je.status <> 'frozen';
  else
    -- left_group / removed_from_group: the sprint2 member-scoped freeze shape —
    -- active OR paused enrolments (TASK-JRN-PAUSE-01: a paused walk is not sheltered); frozen_reason = the reason verbatim.
    update public.journey_enrollments je
       set status = 'frozen',
           progress_data = je.progress_data || jsonb_build_object(
             'frozen_reason', p_reason,
             'frozen_at', now()::text
           ),
           status_changed_at = now()
      from public.journeys j
     where je.journey_id = j.id
       and je.group_id = p_member_group_id
       and j.created_by_group_id = p_group_id
       and j.is_public = false
       and je.status in ('active', 'paused');
  end if;
end;
$$;

create or replace function public.ds3_lifecycle_group_closed(
  p_group_id uuid,
  p_reason text
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_deusex uuid;
  v_journeys integer := 0;
begin
  if p_reason not in ('group_closed', 'group_archived') then
    raise exception 'ds3_lifecycle_group_closed: invalid reason %', p_reason
      using errcode = '22023';  -- invalid_parameter_value
  end if;

  -- Freeze shape #1: every active OR paused enrolment in this group's non-public journeys
  -- (member-held). (close_group:729 / delete_group:856 / admin_exit L3:171.)
  update public.journey_enrollments je
     set status = 'frozen',
         progress_data = je.progress_data || jsonb_build_object(
           'frozen_reason', p_reason,
           'frozen_at', now()::text
         ),
         status_changed_at = now()
    from public.journeys j
   where je.journey_id = j.id
     and j.created_by_group_id = p_group_id
     and j.is_public = false
     and je.status in ('active', 'paused');

  -- Freeze shape #2: every active OR paused group-level enrolment the group itself holds.
  update public.journey_enrollments
     set status = 'frozen',
         progress_data = progress_data || jsonb_build_object(
           'frozen_reason', p_reason,
           'frozen_at', now()::text
         ),
         status_changed_at = now()
   where group_id = p_group_id
     and status in ('active', 'paused');

  -- Owned non-public journeys → DeusEx. Count BEFORE the transfer (afterwards
  -- the rows are DeusEx-owned). DeusEx resolves by system label inside the
  -- handler (domain reading core is the allowed direction) — the resolution the
  -- closure functions used verbatim.
  select count(*) into v_journeys
    from public.journeys
   where created_by_group_id = p_group_id and is_public = false;
  if v_journeys > 0 then
    select id into v_deusex
      from public.groups where name = 'DeusEx' and group_type = 'system';
    update public.journeys
       set created_by_group_id = v_deusex
     where created_by_group_id = p_group_id and is_public = false;
  end if;

  return jsonb_build_object('journey_count', v_journeys);
end;
$$;

comment on function public.ds3_lifecycle_member_departed(uuid, uuid, text) is
  'ADR-U047 DS-3 lifecycle-fact handler: freezes the departing member''s enrolments in the group''s non-public journeys. reason left_group/removed_from_group -> active OR paused (TASK-JRN-PAUSE-01 widened the sprint2 active-only shape so a paused walk is not sheltered), frozen_reason=reason; reason left_as_group -> pc015 divergence (status <> ''frozen'', frozen_reason=''left_group'') preserved verbatim (rule 7). SECURITY DEFINER, core-internal (no client execute).';

comment on function public.ds3_lifecycle_group_closed(uuid, text) is
  'ADR-U047 DS-3 lifecycle-fact handler: freezes both shapes (member enrolments in the group''s non-public journeys + the group''s own group-level enrolments — active OR paused since TASK-JRN-PAUSE-01, stamped with p_reason), transfers owned non-public journeys to DeusEx (resolved by system label), returns {journey_count}. reason ∈ group_closed | group_archived. SECURITY DEFINER, core-internal (no client execute).';

-- Re-asserted, not relied upon (review checklist row 4): core-internal, no
-- client execute — exactly the COR-A posture.
revoke all on function public.ds3_lifecycle_member_departed(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.ds3_lifecycle_group_closed(uuid, text) from public, anon, authenticated;

-- ============================================================================
-- Self-verification (review checklist row 2): the contracts exist and the
-- three predicates took — one in member_departed, two in group_closed.
-- ============================================================================
do $$
declare
  v_n integer;
  v_md integer;
  v_gc integer;
begin
  select count(*) into v_n
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('pause_journey_enrollment', 'resume_journey_enrollment');
  if v_n <> 2 then
    raise exception 'TASK-JRN-PAUSE-01: expected 2 contracts, found %', v_n;
  end if;

  select count(*) into v_md
    from regexp_matches(
      pg_get_functiondef('public.ds3_lifecycle_member_departed(uuid, uuid, text)'::regprocedure),
      'status in \(''active'', ''paused''\)', 'g');
  select count(*) into v_gc
    from regexp_matches(
      pg_get_functiondef('public.ds3_lifecycle_group_closed(uuid, text)'::regprocedure),
      'status in \(''active'', ''paused''\)', 'g');
  if v_md <> 1 or v_gc <> 2 then
    raise exception 'TASK-JRN-PAUSE-01: widened predicates expected 1 + 2, found % + %', v_md, v_gc;
  end if;
end $$;
