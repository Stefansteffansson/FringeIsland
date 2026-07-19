-- COR-A W4/W5 — Internal-API inversion: Core emits lifecycle facts; DS-3 owns
-- the dispositions (ADR-U047). BEHAVIOR-PRESERVING relocation, SCHEMA GATE.
-- ----------------------------------------------------------------------------
-- Schema change — schema-review gate: this lands at task status `review`, not
-- `done`. It changes SQL function BODIES only. No table/column/index/RLS/trigger
-- changes; no signature changes on the nine Core functions; no ADR-U015 version
-- bump. Runtime behavior and performance are unchanged — the same statements
-- execute inside a new function frame (ADR-U047 §Consequences).
--
-- WHAT MOVES: nine Core lifecycle functions (PC-2/PC-3/PC-4) stop naming the
-- DS-3 tables `journeys` / `journey_enrollments` inline. Each now calls one of
-- three new DS-3-owned lifecycle-fact handlers that own the freeze / transfer /
-- delete policy. The W3 conformance test (internal-api-conformance.test.ts)
-- flips from RED (nine offenders) to GREEN when this migration is applied.
--
-- WHAT STAYS IN CORE (deliberately, per ADR-U047):
--   * All guards, permission checks, error messages, orderings, set_config
--     flags, and return values — byte-for-byte behavior-equivalent.
--   * Writes to `public.notifications` — the Notifications-vertical delivery
--     substrate (ADR-U048); writing it from any tier is obligation-fulfilment,
--     not a boundary crossing (ADR-U047 rule 5). Where a Core function needs the
--     transferred-journey count for its DeusEx notice, it takes it from the
--     group_closed handler's returned summary.
--
-- GRANTS: `create or replace function` PRESERVES each existing function's ACL
-- (ownership + privileges unchanged). The nine Core functions therefore carry no
-- grant re-assertion here — re-asserting risks perturbing a posture (e.g.
-- admin_exit_user_from_platform is granted to `authenticated` only, not
-- service_role). The three NEW handlers DO get explicit REVOKEs, because
-- Supabase default privileges grant EXECUTE on newly-created functions to
-- anon/authenticated directly (the pc013 gotcha) — a core-internal contract must
-- name anon + authenticated, not just PUBLIC.
--
-- DEFINER JUSTIFICATION (platform gotcha): the three handlers are SECURITY
-- DEFINER with `set search_path = ''`. They mutate DS-3 tables (`journeys`,
-- `journey_enrollments`) that the calling roles cannot touch directly, composing
-- cascades across RLS — the same elevation grounds as the Core functions that
-- call them. They are REVOKEd from PUBLIC/anon/authenticated (no client surface):
-- only the definer-context Core callers invoke them (the function owner retains
-- implicit EXECUTE, so the call chain works without a client GRANT — the
-- `_erase_mist` internal-primitive posture, ADR-U047 rule 1).
--
-- LIVE relocation set verified 2026-07-19 (latest CREATE OR REPLACE wins):
--   leave_group                       20260705115243 (fix; supersedes pc013/sprint2)
--   remove_member                     20260704192549 (pc013)
--   _transfer_stewardship_to_deusex   20260705072252 (pc014)
--   respond_to_stewardship_nomination 20260705072252 (pc014)
--   close_group                       20260705072252 (pc014)
--   delete_group                      20260705072252 (pc014)
--   leave_group_as_group              20260706120000 (pc015; no later redef in the fix migrations)
--   admin_exit_user_from_platform     20260228144747 (sprint4)
--   _erase_mist                       20260626202215 (pc002)  [W5]

-- ============================================================================
-- PART 1 — DS-3 lifecycle-fact handlers (the new Internal-API contract)
-- ============================================================================

-- 1a. member departed — freeze the departing member's enrolments in the group's
--     non-public journeys. Reason drives BOTH the stamped frozen_reason and the
--     predicate. 'left_as_group' preserves pc015's divergence VERBATIM (ADR-U047
--     rule 7): predicate `status <> 'frozen'` (so paused/completed also freeze)
--     while the stamped frozen_reason stays 'left_group'. The other two reasons
--     use the sprint2 member-scoped shape: `status = 'active'`, frozen_reason =
--     the reason. Pinned by group-of-groups.test.ts (the pc015 divergence) and
--     the membership-lifecycle / farewell characterization suites.
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
    -- active enrolments only; frozen_reason = the reason verbatim.
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
       and je.status = 'active';
  end if;
end;
$$;

comment on function public.ds3_lifecycle_member_departed(uuid, uuid, text) is
  'ADR-U047 DS-3 lifecycle-fact handler: freezes the departing member''s enrolments in the group''s non-public journeys. reason left_group/removed_from_group -> active-only, frozen_reason=reason; reason left_as_group -> pc015 divergence (status <> ''frozen'', frozen_reason=''left_group'') preserved verbatim (rule 7). SECURITY DEFINER, core-internal (no client execute).';

-- 1b. group closed — freeze BOTH shapes (member enrolments in the group's
--     non-public journeys + the group's own group-level enrolments), transfer
--     owned non-public journeys to DeusEx, and return the count Core needs for
--     its notice. reason ∈ group_closed (close_group / admin-exit L3) |
--     group_archived (delete_group) drives the stamped frozen_reason.
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

  -- Freeze shape #1: every active enrolment in this group's non-public journeys
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
     and je.status = 'active';

  -- Freeze shape #2: every active group-level enrolment the group itself holds.
  update public.journey_enrollments
     set status = 'frozen',
         progress_data = progress_data || jsonb_build_object(
           'frozen_reason', p_reason,
           'frozen_at', now()::text
         ),
         status_changed_at = now()
   where group_id = p_group_id
     and status = 'active';

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

comment on function public.ds3_lifecycle_group_closed(uuid, text) is
  'ADR-U047 DS-3 lifecycle-fact handler: freezes both shapes (member enrolments in the group''s non-public journeys + the group''s own group-level enrolments, stamped with p_reason), transfers owned non-public journeys to DeusEx (resolved by system label), returns {journey_count}. reason ∈ group_closed | group_archived. SECURITY DEFINER, core-internal (no client execute).';

-- 1c. personal group erased — hard-delete the journeys the erased personal group
--     owns (the pc002 shape, _erase_mist:73). MUST run before the group row
--     delete: journeys.created_by_group_id -> groups ON DELETE RESTRICT.
create or replace function public.ds3_lifecycle_personal_group_erased(
  p_personal_group_id uuid
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from public.journeys where created_by_group_id = p_personal_group_id;
end;
$$;

comment on function public.ds3_lifecycle_personal_group_erased(uuid) is
  'ADR-U047 DS-3 lifecycle-fact handler: hard-deletes the journeys owned by an erased personal group (Mist/FIM erasure, the pc002 shape). Core must call it BEFORE the group row delete — journeys.created_by_group_id -> groups ON DELETE RESTRICT. SECURITY DEFINER, core-internal (no client execute).';

-- Core-internal contract: no client role may call the handlers directly. The
-- definer-context Core callers (owned by the same role) retain implicit EXECUTE.
revoke all on function public.ds3_lifecycle_member_departed(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.ds3_lifecycle_group_closed(uuid, text) from public, anon, authenticated;
revoke all on function public.ds3_lifecycle_personal_group_erased(uuid) from public, anon, authenticated;

-- ============================================================================
-- PART 2 — Core functions, redefined to emit facts (bodies otherwise verbatim)
-- ============================================================================

-- 2.1 leave_group (PC-3) — freeze -> member_departed('left_group')
create or replace function public.leave_group(p_group_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_active_members integer;
  v_is_steward boolean;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'leaving a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if not v_is_member then
    -- reachable only for visible (public+active) groups: the caller can see
    -- the group but holds no active membership to leave
    raise exception 'membership not found' using errcode = 'P0002';
  end if;
  if v_group.status <> 'active' then
    raise exception 'cannot leave a group that is not active' using errcode = 'P0001';
  end if;

  -- The two G-E exits, refused honestly (nothing mutates):
  select count(*) into v_active_members
    from public.group_memberships
   where group_id = p_group_id and status = 'active';
  if v_active_members = 1 then
    -- Copy updated post-PC014: close_group exists — point at it.
    raise exception 'cannot leave: you are the group''s last member — close the group instead'
      using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.user_group_roles ugr
      join public.group_roles gr on gr.id = ugr.group_role_id
     where ugr.group_id = p_group_id
       and ugr.member_group_id = v_actor
       and (gr.created_from_role_template_id =
              (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
            or gr.name = 'Steward')
  ) into v_is_steward;
  if v_is_steward and public.active_steward_count(p_group_id, v_actor) = 0 then
    raise exception 'cannot leave: you are the only active Steward — assign another Steward first'
      using errcode = 'P0001';
  end if;

  -- The regular exit, in the proven order. The DS-3 enrolment disposition is now
  -- DS-3's own (ADR-U047): Core emits the fact, DS-3 owns the freeze.
  perform public.ds3_lifecycle_member_departed(p_group_id, v_actor, 'left_group');

  delete from public.user_group_roles
   where group_id = p_group_id and member_group_id = v_actor;

  -- the existing notify trigger writes member_left to the Stewards
  delete from public.group_memberships
   where group_id = p_group_id and member_group_id = v_actor;

  -- DS-5 former-member attribution: pending-DS-5, NOT built (D2) — the exit
  -- writes no authorship attribution; MEM-9's forward-seam (Communication gate).
  return jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name);
end;
$$;

-- 2.2 remove_member (PC-3) — freeze -> member_departed('removed_from_group')
create or replace function public.remove_member(
  p_group_id uuid,
  p_member_group_id uuid
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_target_status text;
  v_target_is_steward boolean;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'removing members is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, p_group_id, 'remove_members'), false) then
    raise exception 'remove_members permission required' using errcode = '42501';
  end if;

  if p_member_group_id = v_actor then
    raise exception 'cannot remove yourself — leaving is the self-exit path'
      using errcode = 'P0001';
  end if;

  select gm.status into v_target_status
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = p_member_group_id;
  -- active OR paused rows are removable (the dropped RLS policy allowed only
  -- active); invited rows are invitation territory (cancel), absent is absent —
  -- both P0002, indistinguishably.
  if v_target_status is null or v_target_status not in ('active', 'paused') then
    raise exception 'member not found' using errcode = 'P0002';
  end if;

  -- Last-active-Steward guard: a paused Steward's surviving role row is NOT
  -- cover (the raw-role-count trigger would accept it; the contract refuses).
  select exists (
    select 1 from public.user_group_roles ugr
      join public.group_roles gr on gr.id = ugr.group_role_id
     where ugr.group_id = p_group_id
       and ugr.member_group_id = p_member_group_id
       and (gr.created_from_role_template_id =
              (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
            or gr.name = 'Steward')
  ) into v_target_is_steward;
  if v_target_is_steward
     and public.active_steward_count(p_group_id, p_member_group_id) = 0 then
    raise exception 'cannot remove the last active Steward — assign another Steward first'
      using errcode = 'P0001';
  end if;

  -- Cascade, in the proven order (the sprint2 regular-leave shape):
  -- (a) freeze the target's active enrolments in this group's non-public
  --     journeys — the removal twin of 'left_group'. DS-3's own disposition now
  --     (ADR-U047): Core emits the fact, DS-3 owns the freeze.
  perform public.ds3_lifecycle_member_departed(p_group_id, p_member_group_id, 'removed_from_group');

  -- (b) roles — the raw RLS path orphaned these; the existing trigger walls
  --     (check_last_leader_removal + DeusEx siblings) fire beneath our guard
  delete from public.user_group_roles
   where group_id = p_group_id and member_group_id = p_member_group_id;

  -- (c) membership — the existing notify trigger writes the durable
  --     member_removed row to the target (actor != member branch)
  delete from public.group_memberships
   where group_id = p_group_id and member_group_id = p_member_group_id;
end;
$$;

-- 2.3 _transfer_stewardship_to_deusex (PC-3, internal) — freeze -> member_departed('left_group')
create or replace function public._transfer_stewardship_to_deusex(
  p_group_id uuid,
  p_departing_member_group_id uuid
) returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_deusex uuid;
  v_steward_role_id uuid;
  v_group_name text;
begin
  -- DeusEx resolves by system-label, never a hardcoded id (seeding repair)
  select id into v_deusex
    from public.groups where name = 'DeusEx' and group_type = 'system';
  if v_deusex is null then
    raise exception 'DeusEx system group missing — seeding repair required';
  end if;
  select name into v_group_name from public.groups where id = p_group_id;

  select gr.id into v_steward_role_id
    from public.group_roles gr
   where gr.group_id = p_group_id
     and (gr.created_from_role_template_id =
            (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
          or gr.name = 'Steward')
   limit 1;
  if v_steward_role_id is null then
    raise exception 'no Steward role found for group %', p_group_id;
  end if;

  -- A. DeusEx becomes an active member (idempotent — the sprint2 upsert)
  insert into public.group_memberships (group_id, member_group_id, added_by_group_id, status)
  values (p_group_id, v_deusex, p_departing_member_group_id, 'active')
  on conflict (group_id, member_group_id)
    do update set status = 'active', status_changed_at = now();

  -- B. DeusEx holds the Steward role (idempotent)
  insert into public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
  values (v_deusex, p_group_id, v_steward_role_id, p_departing_member_group_id)
  on conflict do nothing;

  -- C. Pending invitations transfer to DeusEx (both invitation channels)
  update public.group_memberships
     set added_by_group_id = v_deusex
   where group_id = p_group_id
     and status = 'invited'
     and added_by_group_id = p_departing_member_group_id;
  update public.pending_email_invitations
     set invited_by_group_id = v_deusex
   where group_id = p_group_id
     and invited_by_group_id = p_departing_member_group_id
     and status = 'pending';

  -- D. The departing member's exit (the leave_group shape verbatim):
  --    freeze own active enrolments in this group's non-public journeys.
  --    DS-3's own disposition now (ADR-U047): Core emits the fact.
  perform public.ds3_lifecycle_member_departed(p_group_id, p_departing_member_group_id, 'left_group');

  -- E. roles (safe — DeusEx now stewards, the wall counts 1 remaining)
  delete from public.user_group_roles
   where group_id = p_group_id and member_group_id = p_departing_member_group_id;

  -- F. membership (the existing trigger notifies member_left to the Stewards
  --    — DeusEx among them now; consumed, never duplicated)
  delete from public.group_memberships
   where group_id = p_group_id and member_group_id = p_departing_member_group_id;

  -- G. remaining active members are told (durable rows; no dispatch — D8)
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  select gm.member_group_id,
         'stewardship_transferred',
         'Stewardship Change',
         'FringeIsland has temporarily assumed stewardship of ' || v_group_name || '.',
         jsonb_build_object('group_id', p_group_id, 'group_name', v_group_name,
                            'scenario', 'deusex_fallback'),
         p_group_id
    from public.group_memberships gm
   where gm.group_id = p_group_id
     and gm.status = 'active'
     and gm.member_group_id <> v_deusex;

  -- H. DeusEx is asked to find a permanent Steward
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  values (
    v_deusex,
    'stewardship_required',
    'Stewardship Required',
    v_group_name || ' requires a permanent Steward. Please review and assign.',
    jsonb_build_object('group_id', p_group_id, 'group_name', v_group_name),
    p_group_id
  );
end;
$$;

-- 2.4 respond_to_stewardship_nomination (PC-3) — freeze -> member_departed('left_group')
create or replace function public.respond_to_stewardship_nomination(
  p_notification_id uuid,
  p_accept boolean
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
  v_notification public.notifications%rowtype;
  v_group public.groups%rowtype;
  v_nominator uuid;
  v_nominee_ids uuid[];
  v_rank integer;
  v_steward_role_id uuid;
  v_next uuid;
  v_actor_name text;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'responding to a nomination is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  -- Recipient-only, indistinguishably: a ghost id and another member's
  -- notification answer the same (no leak)
  select * into v_notification
    from public.notifications n
   where n.id = p_notification_id
   for update;
  if v_notification.id is null or v_notification.recipient_group_id <> v_actor then
    raise exception 'notification not found' using errcode = 'P0002';
  end if;
  if v_notification.type <> 'stewardship_nomination'
     or v_notification.action_type is distinct from 'accept_decline' then
    raise exception 'not a stewardship nomination' using errcode = '22023';
  end if;
  if v_notification.action_taken is not null then
    raise exception 'this nomination has already been answered' using errcode = 'P0001';
  end if;
  if v_notification.expires_at is not null and v_notification.expires_at < now() then
    -- expiry is predicate-based; no reaper — the group keeps its Steward
    raise exception 'this nomination has expired' using errcode = 'P0001';
  end if;

  -- All state below comes from the SERVER-STORED row — never the caller
  -- (the caller-data-dispatch hole this contract replaces).
  v_nominator := (v_notification.action_data->>'nominator_group_id')::uuid;
  select array_agg(elem::text::uuid) into v_nominee_ids
    from jsonb_array_elements_text(v_notification.action_data->'nominee_ids') as elem;
  v_rank := (v_notification.action_data->>'nominee_rank')::integer;

  -- Staleness guards (contract-side robustness the trusting legacy dispatch
  -- lacked): the group, the nominator, and the nominee must all still be in
  -- the state the offer was made under. Refusals mutate nothing — a stale
  -- unanswered row blocks re-nomination only until its expires_at passes.
  select * into v_group
    from public.groups g
   where g.id = v_notification.group_id and g.group_type = 'engagement';
  if v_group.id is null or v_group.status <> 'active' then
    raise exception 'the group is no longer active — the nomination is stale'
      using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.group_memberships gm
     where gm.group_id = v_group.id and gm.member_group_id = v_nominator
       and gm.status = 'active'
  ) then
    raise exception 'the nomination is stale — stewardship has already changed hands'
      using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.group_memberships gm
     where gm.group_id = v_group.id and gm.member_group_id = v_actor
       and gm.status = 'active'
  ) then
    raise exception 'you are no longer an active member of this group'
      using errcode = 'P0001';
  end if;

  -- Settle the offer
  update public.notifications
     set action_taken = case when p_accept then 'accepted' else 'declined' end,
         action_taken_at = now(),
         is_read = true,
         read_at = coalesce(read_at, now())
   where id = p_notification_id;

  if p_accept then
    -- Grant the nominee the Steward role — TEMPLATE-FIRST resolution with the
    -- legacy short-name fallback (the 'Member'-class bug, fixed)
    select gr.id into v_steward_role_id
      from public.group_roles gr
     where gr.group_id = v_group.id
       and (gr.created_from_role_template_id =
              (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
            or gr.name = 'Steward')
     limit 1;
    if v_steward_role_id is null then
      raise exception 'no Steward role found for this group' using errcode = 'P0001';
    end if;
    insert into public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
    values (v_actor, v_group.id, v_steward_role_id, v_nominator)
    on conflict do nothing;

    -- The nominator departs (the leave_group cascade verbatim; the wall
    -- counts the new Steward and allows). DS-3's own disposition (ADR-U047).
    perform public.ds3_lifecycle_member_departed(v_group.id, v_nominator, 'left_group');
    delete from public.user_group_roles
     where group_id = v_group.id and member_group_id = v_nominator;
    -- the existing trigger notifies member_left to the Stewards (the new
    -- Steward among them) — consumed, never duplicated
    delete from public.group_memberships
     where group_id = v_group.id and member_group_id = v_nominator;

    -- The group is told who stewards now (display identity = the personal
    -- group's name, the B-DISP oracle)
    select name into v_actor_name from public.groups where id = v_actor;
    insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
    select gm.member_group_id,
           'stewardship_transferred',
           'New Steward Assigned',
           coalesce(v_actor_name, 'A member') || ' has accepted stewardship of ' || v_group.name || '.',
           jsonb_build_object('group_id', v_group.id, 'group_name', v_group.name,
                              'new_steward_group_id', v_actor),
           v_group.id
      from public.group_memberships gm
     where gm.group_id = v_group.id
       and gm.status = 'active'
       and gm.member_group_id <> v_actor;

    return jsonb_build_object('group_id', v_group.id, 'outcome', 'accepted');
  end if;

  -- Declined: the next-ranked nominee gets a fresh 7-day offer…
  if v_rank < coalesce(array_length(v_nominee_ids, 1), 0) then
    v_next := v_nominee_ids[v_rank + 1];
    insert into public.notifications (
      recipient_group_id, type, title, body, payload, group_id,
      action_type, action_data, expires_at
    ) values (
      v_next,
      'stewardship_nomination',
      'Stewardship Nomination',
      'You have been nominated as Steward of ' || v_group.name || '. Accept or decline within 7 days.',
      jsonb_build_object('group_id', v_group.id, 'group_name', v_group.name),
      v_group.id,
      'accept_decline',
      jsonb_build_object(
        'group_id', v_group.id,
        'nominator_group_id', v_nominator,
        'nominee_ids', to_jsonb(v_nominee_ids),
        'nominee_rank', v_rank + 1,
        'total_nominees', array_length(v_nominee_ids, 1)
      ),
      now() + interval '7 days'
    );
    return jsonb_build_object('group_id', v_group.id, 'outcome', 'declined_next');
  end if;

  -- …or the list is exhausted: the ADR-U019 DeusEx fallback
  perform public._transfer_stewardship_to_deusex(v_group.id, v_nominator);
  return jsonb_build_object('group_id', v_group.id, 'outcome', 'declined_deusex');
end;
$$;

-- 2.5 close_group (PC-3) — freeze both shapes + transfer -> group_closed('group_closed')
create or replace function public.close_group(
  p_group_id uuid
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
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_active_members integer;
  v_deusex uuid;
  v_journeys integer := 0;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'closing a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if not v_is_member then
    raise exception 'membership not found' using errcode = 'P0002';
  end if;
  if v_group.status <> 'active' then
    raise exception 'cannot close a group that is not active' using errcode = 'P0001';
  end if;

  select count(*) into v_active_members
    from public.group_memberships
   where group_id = p_group_id and status = 'active';
  if v_active_members <> 1 then
    raise exception 'you are not the only member; leave or transfer instead'
      using errcode = 'P0001';
  end if;

  select id into v_deusex
    from public.groups where name = 'DeusEx' and group_type = 'system';

  -- The sprint2 group_closure order, verbatim:
  -- A. status → 'closed' FIRST (check_last_leader_removal bypasses natively)
  update public.groups set status = 'closed' where id = p_group_id;

  -- B+C. freeze both shapes + owned non-public journeys → DeusEx is now DS-3's
  --    own disposition (ADR-U047): Core emits the group_closed fact, DS-3 owns
  --    the freeze + transfer and returns the count Core needs for its notice.
  v_journeys := (public.ds3_lifecycle_group_closed(p_group_id, 'group_closed') ->> 'journey_count')::integer;

  -- The DeusEx review notice stays in Core (Notifications-vertical write, ADR-U048).
  if v_journeys > 0 then
    insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
    values (
      v_deusex,
      'group_closed',
      'Group Closed',
      v_group.name || ' has been closed. ' || v_journeys || ' non-public journey(s) require review.',
      jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name,
                         'journey_count', v_journeys),
      p_group_id
    );
  end if;

  -- D+E. the caller departs (roles then membership — the member_left branch
  -- finds no Stewards after the role delete and stays silent). Paused or
  -- invited rows, if any, SURVIVE on the closed tombstone (the spec's letter:
  -- only the caller departs; GRP-5 renders the closed state).
  delete from public.user_group_roles
   where group_id = p_group_id and member_group_id = v_actor;
  delete from public.group_memberships
   where group_id = p_group_id and member_group_id = v_actor;

  -- DS-5 former-member attribution: pending-DS-5, NOT built (D2) — MEM-9's
  -- forward-seam (Communication gate).
  return jsonb_build_object(
    'group_id', p_group_id,
    'group_name', v_group.name,
    'journeys_transferred', v_journeys
  );
end;
$$;

-- 2.6 delete_group (PC-3) — freeze both shapes + transfer -> group_closed('group_archived')
create or replace function public.delete_group(
  p_group_id uuid
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
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_deusex uuid;
  v_journeys integer := 0;
  v_notified integer := 0;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'deleting a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';
  select (gm.status = 'active') into v_is_member
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if not v_is_member then
    raise exception 'membership not found' using errcode = 'P0002';
  end if;
  if v_group.status <> 'active' then
    raise exception 'cannot delete a group that is not active' using errcode = 'P0001';
  end if;

  if not coalesce(public.has_permission(v_actor, p_group_id, 'delete_group'), false) then
    raise exception 'delete_group permission required' using errcode = '42501';
  end if;

  select id into v_deusex
    from public.groups where name = 'DeusEx' and group_type = 'system';

  -- A. status → 'archived' first (the intent-distinguishing terminal state —
  --    'closed' = ran its course, 'archived' = deliberately retired)
  update public.groups set status = 'archived' where id = p_group_id;

  -- B+C. freeze both shapes + owned non-public journeys → DeusEx is now DS-3's
  --    own disposition (ADR-U047). frozen_reason=group_archived carried by the
  --    fact; the returned count feeds the DeusEx review notice below.
  v_journeys := (public.ds3_lifecycle_group_closed(p_group_id, 'group_archived') ->> 'journey_count')::integer;

  if v_journeys > 0 then
    insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
    values (
      v_deusex,
      'group_archived',
      'Group Archived',
      v_group.name || ' has been archived. ' || v_journeys || ' non-public journey(s) require review.',
      jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name,
                         'journey_count', v_journeys),
      p_group_id
    );
  end if;

  -- D. the in-contract member notices (the notify_group_deleted trigger fires
  --    only on hard DELETE, which this deliberately is not) — every OTHER
  --    active member; content-minimal (ids + group name, no member PII)
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  select gm.member_group_id,
         'group_deleted',
         'Group Deleted',
         'The group "' || v_group.name || '" has been deleted.',
         jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
         p_group_id
    from public.group_memberships gm
   where gm.group_id = p_group_id
     and gm.status = 'active'
     and gm.member_group_id <> v_actor;
  get diagnostics v_notified = row_count;

  -- E. the cascade departures, silenced at the per-row trigger layer via the
  --    ESTABLISHED transaction-local cascade flag (see the header: the
  --    last-leader wall bypasses only on status='closed', and the per-row
  --    member_removed/role_removed notices would contradict the single
  --    in-contract group_deleted notice). Transaction-local; reset after.
  perform set_config('app.hard_delete_in_progress', 'true', true);
  delete from public.user_group_roles
   where group_id = p_group_id;
  delete from public.group_memberships
   where group_id = p_group_id and member_group_id <> v_actor;
  delete from public.group_memberships
   where group_id = p_group_id and member_group_id = v_actor;
  perform set_config('app.hard_delete_in_progress', '', true);

  return jsonb_build_object(
    'group_id', p_group_id,
    'group_name', v_group.name,
    'journeys_transferred', v_journeys,
    'members_notified', v_notified
  );
end;
$$;

-- 2.7 leave_group_as_group (PC-3) — freeze -> member_departed('left_as_group')  [pc015 divergence preserved]
create or replace function public.leave_group_as_group(
  p_group_id uuid,
  p_acting_group_id uuid
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
  v_membership_id uuid;
  v_remaining integer;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'acting for a group is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  -- Wielding precedes existence: a keyless caller learns nothing (42501
  -- whether or not the membership exists — the S5 adversarial posture).
  if not public.has_permission(v_actor, p_acting_group_id, 'act_as_group') then
    raise exception 'you do not have permission to act as this group'
      using errcode = '42501';
  end if;

  select gm.id into v_membership_id
    from public.group_memberships gm
    join public.groups g on g.id = gm.member_group_id and g.group_type = 'engagement'
   where gm.group_id = p_group_id
     and gm.member_group_id = p_acting_group_id
     and gm.status = 'active';
  if v_membership_id is null then
    raise exception 'membership not found' using errcode = 'P0002';
  end if;

  -- Last-active-Steward guard (PC013/PC014 semantics): if the acting group
  -- holds the context group''s only active Steward role, exit is refused
  -- honestly — transfer first.
  if exists (
    select 1 from public.user_group_roles ugr
      join public.group_roles gr on gr.id = ugr.group_role_id
     where ugr.group_id = p_group_id
       and ugr.member_group_id = p_acting_group_id
       and (gr.created_from_role_template_id =
              (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
            or gr.name = 'Steward')
  ) and public.active_steward_count(p_group_id, p_acting_group_id) = 0 then
    raise exception 'this group is the last active Steward — transfer stewardship first'
      using errcode = 'P0001';
  end if;

  -- Last-member guard: an exit that empties the group is Close''s business
  -- (MEM-8), and Close is a member-facing act — refused honestly here.
  select count(*) into v_remaining
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.status = 'active'
     and gm.member_group_id <> p_acting_group_id;
  if v_remaining = 0 then
    raise exception 'the last member cannot leave — close the group instead'
      using errcode = 'P0001';
  end if;

  -- Freeze the acting group's enrolments in the context group's non-public
  -- journeys. DS-3's own disposition now (ADR-U047): the 'left_as_group' fact
  -- carries the pc015 divergence (status <> 'frozen'; frozen_reason='left_group').
  perform public.ds3_lifecycle_member_departed(p_group_id, p_acting_group_id, 'left_as_group');

  delete from public.user_group_roles ugr
   where ugr.group_id = p_group_id and ugr.member_group_id = p_acting_group_id;

  delete from public.group_memberships gm
   where gm.id = v_membership_id;

  return jsonb_build_object('group_id', p_group_id, 'acting_group_id', p_acting_group_id);
end;
$$;

-- 2.8 admin_exit_user_from_platform (PC-4) — L1/L2 -> member_departed('left_group'); L3 -> group_closed('group_closed')
create or replace function public.admin_exit_user_from_platform(
  p_target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_pgid uuid;
  v_target_pgid uuid;
  v_target_auth_id uuid;
  v_deusex_group_id uuid;
  v_steward_template_id uuid;
  v_membership record;
  v_member_count integer;
  v_steward_role_id uuid;
  v_is_steward boolean;
  v_steward_count integer;
  v_scenario text;
  v_non_public_journey_count integer;
  v_results jsonb := '[]'::jsonb;
  v_groups_exited integer := 0;
  v_member record;
begin
  -- ─── 1. Authorization ──────────────────────────────────────────
  v_caller_pgid := public.get_current_personal_group_id();
  if v_caller_pgid is null then
    raise exception 'Unauthorized: not authenticated';
  end if;

  if not public.has_permission(v_caller_pgid, null, 'manage_all_groups') then
    raise exception 'Unauthorized: platform admin required';
  end if;

  -- ─── 2. Look up target user ────────────────────────────────────
  select personal_group_id, auth_user_id
  into v_target_pgid, v_target_auth_id
  from public.users
  where id = p_target_user_id;

  if v_target_pgid is null then
    raise exception 'User not found';
  end if;

  -- ─── 3. Safety guards ──────────────────────────────────────────

  -- Cannot exit yourself
  if v_target_pgid = v_caller_pgid then
    raise exception 'Cannot exit yourself from the platform';
  end if;

  -- Cannot exit already-decommissioned user
  if exists (
    select 1 from public.users
    where id = p_target_user_id and is_decommissioned = true
  ) then
    raise exception 'User is already decommissioned';
  end if;

  -- Look up DeusEx group
  select id into v_deusex_group_id
  from public.groups
  where name = 'DeusEx' and group_type = 'system';

  if v_deusex_group_id is null then
    raise exception 'DeusEx system group not found';
  end if;

  -- Cannot exit a DeusEx member (platform admin)
  if exists (
    select 1 from public.group_memberships
    where group_id = v_deusex_group_id
      and member_group_id = v_target_pgid
      and status = 'active'
  ) then
    raise exception 'Cannot exit a platform admin. Remove from DeusEx first.';
  end if;

  -- ─── 4. Look up Steward template ──────────────────────────────
  select id into v_steward_template_id
  from public.role_templates
  where name = 'Steward Role Template';

  -- ─── 5. Iterate all active engagement group memberships ────────
  for v_membership in
    select gm.group_id, g.name as group_name
    from public.group_memberships gm
    join public.groups g on g.id = gm.group_id
    where gm.member_group_id = v_target_pgid
      and gm.status = 'active'
      and g.group_type = 'engagement'
      and g.status = 'active'
    order by g.name
  loop
    -- Count active members in this group
    select count(*) into v_member_count
    from public.group_memberships
    where group_id = v_membership.group_id and status = 'active';

    -- Get Steward role for this group
    select gr.id into v_steward_role_id
    from public.group_roles gr
    where gr.group_id = v_membership.group_id
      and (gr.created_from_role_template_id = v_steward_template_id or gr.name = 'Steward')
    limit 1;

    -- Check if target is a Steward and count Stewards
    v_is_steward := false;
    v_steward_count := 0;

    if v_steward_role_id is not null then
      select count(*) into v_steward_count
      from public.user_group_roles
      where group_id = v_membership.group_id
        and group_role_id = v_steward_role_id;

      v_is_steward := exists (
        select 1 from public.user_group_roles
        where group_id = v_membership.group_id
          and member_group_id = v_target_pgid
          and group_role_id = v_steward_role_id
      );
    end if;

    -- Determine scenario
    if v_member_count = 1 then
      v_scenario := 'group_closure';
    elsif v_is_steward and v_steward_count = 1 then
      v_scenario := 'steward_handover';
    else
      v_scenario := 'regular_leave';
    end if;

    -- ═══════════════════════════════════════════════════════════
    -- SCENARIO: GROUP CLOSURE (L3 — last member)
    -- ═══════════════════════════════════════════════════════════
    if v_scenario = 'group_closure' then

      -- A. Set group status to 'closed' (allows trigger bypass)
      update public.groups set status = 'closed' where id = v_membership.group_id;

      -- B+C. Freeze both shapes + transfer non-public journeys to DeusEx is now
      --    DS-3's own disposition (ADR-U047): Core emits the group_closed fact,
      --    DS-3 freezes + transfers and returns the count Core needs for its notice.
      v_non_public_journey_count :=
        (public.ds3_lifecycle_group_closed(v_membership.group_id, 'group_closed') ->> 'journey_count')::integer;

      if v_non_public_journey_count > 0 then
        insert into public.notifications
          (recipient_group_id, type, title, body, payload, group_id)
        values (
          v_deusex_group_id,
          'group_closed',
          'Group Closed — Platform Exit',
          v_membership.group_name || ' has been closed (platform exit). ' ||
            v_non_public_journey_count || ' non-public journey(s) require review.',
          jsonb_build_object(
            'group_id', v_membership.group_id,
            'journey_count', v_non_public_journey_count,
            'exit_reason', 'platform_exit'
          ),
          v_membership.group_id
        );
      end if;

      -- D. Delete roles + membership
      delete from public.user_group_roles
      where group_id = v_membership.group_id and member_group_id = v_target_pgid;

      delete from public.group_memberships
      where group_id = v_membership.group_id and member_group_id = v_target_pgid;

    -- ═══════════════════════════════════════════════════════════
    -- SCENARIO: STEWARD HANDOVER (L2 — sole Steward → DeusEx)
    -- ═══════════════════════════════════════════════════════════
    elsif v_scenario = 'steward_handover' then

      -- A. Add DeusEx as member of group (idempotent)
      insert into public.group_memberships
        (group_id, member_group_id, added_by_group_id, status)
      values
        (v_membership.group_id, v_deusex_group_id, v_caller_pgid, 'active')
      on conflict (group_id, member_group_id)
        do update set status = 'active', status_changed_at = now();

      -- B. Assign Steward role to DeusEx (idempotent)
      insert into public.user_group_roles
        (member_group_id, group_id, group_role_id, assigned_by_group_id)
      values
        (v_deusex_group_id, v_membership.group_id, v_steward_role_id, v_caller_pgid)
      on conflict (member_group_id, group_id, group_role_id) do nothing;

      -- C. Transfer pending invitations to DeusEx
      update public.group_memberships
      set added_by_group_id = v_deusex_group_id
      where group_id = v_membership.group_id
        and status = 'invited'
        and added_by_group_id = v_target_pgid;

      update public.pending_email_invitations
      set invited_by_group_id = v_deusex_group_id
      where group_id = v_membership.group_id
        and invited_by_group_id = v_target_pgid
        and status = 'pending';

      -- D. Freeze non-public journey enrollments for the leaving member —
      --    DS-3's own disposition now (ADR-U047): Core emits the fact.
      perform public.ds3_lifecycle_member_departed(v_membership.group_id, v_target_pgid, 'left_group');

      -- E. Delete target's roles + membership
      delete from public.user_group_roles
      where group_id = v_membership.group_id and member_group_id = v_target_pgid;

      delete from public.group_memberships
      where group_id = v_membership.group_id and member_group_id = v_target_pgid;

      -- F. Notify remaining members about stewardship change
      for v_member in
        select gm.member_group_id
        from public.group_memberships gm
        where gm.group_id = v_membership.group_id
          and gm.status = 'active'
          and gm.member_group_id != v_deusex_group_id
      loop
        insert into public.notifications
          (recipient_group_id, type, title, body, payload, group_id)
        values (
          v_member.member_group_id,
          'stewardship_transferred',
          'Stewardship Change — Platform Exit',
          'FringeIsland has temporarily assumed stewardship of ' || v_membership.group_name || '.',
          jsonb_build_object(
            'group_id', v_membership.group_id,
            'exit_reason', 'platform_exit'
          ),
          v_membership.group_id
        );
      end loop;

      -- Notify DeusEx about stewardship assignment
      insert into public.notifications
        (recipient_group_id, type, title, body, payload, group_id)
      values (
        v_deusex_group_id,
        'stewardship_required',
        'Stewardship Required — Platform Exit',
        v_membership.group_name || ' requires a permanent Steward. Previous Steward exited the platform.',
        jsonb_build_object(
          'group_id', v_membership.group_id,
          'exit_reason', 'platform_exit'
        ),
        v_membership.group_id
      );

    -- ═══════════════════════════════════════════════════════════
    -- SCENARIO: REGULAR LEAVE (L1 — member leaves, group stays)
    -- ═══════════════════════════════════════════════════════════
    else

      -- A. Freeze non-public journey enrollments for the leaving member —
      --    DS-3's own disposition now (ADR-U047): Core emits the fact.
      perform public.ds3_lifecycle_member_departed(v_membership.group_id, v_target_pgid, 'left_group');

      -- B. Delete target's roles + membership
      delete from public.user_group_roles
      where group_id = v_membership.group_id and member_group_id = v_target_pgid;

      delete from public.group_memberships
      where group_id = v_membership.group_id and member_group_id = v_target_pgid;

    end if;

    -- Record result for this group
    v_results := v_results || jsonb_build_object(
      'group_id', v_membership.group_id,
      'group_name', v_membership.group_name,
      'scenario', v_scenario
    );
    v_groups_exited := v_groups_exited + 1;

  end loop;

  -- ─── 6. Decommission the user ─────────────────────────────────
  update public.users
  set is_decommissioned = true,
      is_active = false,
      updated_at = now()
  where id = p_target_user_id;

  -- ─── 7. Force logout (delete auth sessions) ───────────────────
  delete from auth.refresh_tokens where user_id = v_target_auth_id::text;
  delete from auth.sessions where user_id = v_target_auth_id;

  -- ─── 8. Audit log ─────────────────────────────────────────────
  insert into public.admin_audit_log
    (actor_group_id, action, target, metadata)
  values (
    v_caller_pgid,
    'admin_exit_user_from_platform',
    p_target_user_id::text,
    jsonb_build_object(
      'groups_exited', v_groups_exited,
      'group_details', v_results,
      'target_personal_group_id', v_target_pgid
    )
  );

  return jsonb_build_object(
    'success', true,
    'groups_exited', v_groups_exited,
    'group_details', v_results,
    'decommissioned', true
  );
end;
$$;

-- 2.9 _erase_mist (PC-2) [W5] — journey delete -> personal_group_erased (BEFORE the group delete)
create or replace function public._erase_mist(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_user_id uuid;
  v_personal_group_id uuid;
begin
  select auth_user_id, personal_group_id
    into v_auth_user_id, v_personal_group_id
    from public.users
    where id = p_user_id;

  if v_auth_user_id is null then
    return;  -- already gone / nothing to erase (idempotent)
  end if;

  -- Bypass the hard-delete guard triggers for this transaction only.
  perform set_config('app.bypass_personal_group_id_immutability', 'true', true);
  perform set_config('app.hard_delete_in_progress', 'true', true);

  -- journeys first (created_by_group_id -> groups ON DELETE RESTRICT). DS-3's
  -- own disposition now (ADR-U047 W5): Core emits the personal_group_erased fact;
  -- it MUST run before the group delete (FK RESTRICT), same transaction.
  if v_personal_group_id is not null then
    perform public.ds3_lifecycle_personal_group_erased(v_personal_group_id);
  end if;

  -- auth.users -> CASCADE removes the public.users profile (before the group, so
  -- the personal_group_id SET-NULL immutability guard never fires on a live row).
  delete from auth.users where id = v_auth_user_id;

  -- the now-orphaned proto group -> CASCADE clears memberships/roles/role-perms.
  if v_personal_group_id is not null then
    delete from public.groups where id = v_personal_group_id;
  end if;
end;
$$;

-- ============================================================================
-- PART 3 — Verification
-- ============================================================================
-- Relocated (Core no longer names journeys / journey_enrollments inline):
--   PC-3:  leave_group, remove_member, _transfer_stewardship_to_deusex,
--          respond_to_stewardship_nomination, close_group, delete_group,
--          leave_group_as_group
--   PC-4:  admin_exit_user_from_platform  (L1/L2 -> member_departed;
--          L3 -> group_closed, count fed to the DeusEx notice)
--   PC-2:  _erase_mist                    (journey delete -> personal_group_erased,
--          W5 — call kept BEFORE the group delete for the FK RESTRICT ordering)
-- New DS-3 handlers (own the freeze/transfer/delete policy):
--   ds3_lifecycle_member_departed(uuid, uuid, text)
--   ds3_lifecycle_group_closed(uuid, text) returns jsonb
--   ds3_lifecycle_personal_group_erased(uuid)
-- After apply: the W3 conformance test (internal-api-conformance.test.ts) flips
-- GREEN for the nine (only the tracked, out-of-scope admin_hard_delete_user
-- exception remains — see the test's KNOWN_UNRELOCATED_PC_OFFENDERS note + PR body).
