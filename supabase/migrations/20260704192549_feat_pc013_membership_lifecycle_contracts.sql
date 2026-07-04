-- ============================================================================
-- FEAT-PC013 (Groups Cycle G-D): membership lifecycle contracts — MEM-4/5/6
-- ============================================================================
-- pause_member / activate_member / remove_member: three new SECURITY DEFINER
-- contracts over the existing substrate. leave_group: REPLACED IN PLACE —
-- the pre-partition sprint2 monolith carried three scenarios (regular leave,
-- sole-Steward -> DeusEx handover, last-member closure); the replacement keeps
-- the regular exit and REFUSES the other two with honest copy until Cycle G-E
-- re-lands MEM-7/MEM-8 as specced contracts (spec Open Q1; nothing in v2
-- calls the legacy body — admin_exit_user_from_platform inlines its own
-- tracks). get_group_detail: amended additively (membership_status per member
-- row; paused rows included only for management-permission viewers — Open Q3).
-- Policy narrowing (Open Q2, ADR-U038, the G-A groups precedent): the two
-- member-exit DELETE policies drop — they bypassed the enrolment freeze, the
-- role cleanup, and the Steward guards (a sole Steward could strand a group
-- headless via raw self-DELETE; a raw removal orphaned user_group_roles rows).
-- Post-drop, the contracts are the only client-role exit paths; the admin
-- policies (memberships_delete_admin / memberships_insert_admin) are untouched.
--
-- Direct-caller answer for the gate (ADR-U038): after this migration a direct
-- PostgREST caller — including an anonymous-session Mist — can do nothing to
-- group_memberships that the contracts refuse, beyond the pre-existing
-- DeusEx-walled admin policies. No new table, no trigger changes.
--
-- SECURITY DEFINER justification, per function, in the comments below: each
-- must read/write across RLS walls (membership rows of other members, role
-- rows, enrolment freezes, notification inserts) that no client-role policy
-- grants — exactly the composed-cascade work RLS cannot express (ADR-U016).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Guard: the policies this migration narrows must exist under the expected
--    names (the DROP-IF-EXISTS wrong-name trap — verify, then drop).
-- ----------------------------------------------------------------------------
do $$
declare
  v_found integer;
begin
  select count(*) into v_found from pg_policies
   where schemaname = 'public' and tablename = 'group_memberships'
     and policyname in ('memberships_delete_leave', 'memberships_delete_remove');
  -- 2 = first apply (both present, about to drop); 0 = re-apply (already
  -- narrowed); exactly 1 = a rename drifted — refuse rather than half-narrow.
  if v_found = 1 then
    raise exception 'FEAT-PC013: exactly one member-exit DELETE policy found by name — verify pg_policies before narrowing';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1. active_steward_count — internal invariant helper (no client execute).
--    Counts DISTINCT Steward-role holders whose membership is ACTIVE; the
--    existing check_last_leader_removal trigger counts raw role rows and is
--    blind to status flips and paused Stewards — the contracts guard ahead of
--    it with this. Steward resolution = template linkage with the legacy
--    short-name fallback (the sprint2/PC012 pattern).
-- ----------------------------------------------------------------------------
create or replace function public.active_steward_count(
  p_group_id uuid,
  p_excluding_member_group_id uuid default null
) returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct ugr.member_group_id)::integer
    from public.user_group_roles ugr
    join public.group_roles gr on gr.id = ugr.group_role_id
    join public.group_memberships gm
      on gm.group_id = ugr.group_id and gm.member_group_id = ugr.member_group_id
   where ugr.group_id = p_group_id
     and gm.status = 'active'
     and (gr.created_from_role_template_id =
            (select rt.id from public.role_templates rt where rt.name = 'Steward Role Template')
          or gr.name = 'Steward')
     and ugr.member_group_id is distinct from p_excluding_member_group_id;
$$;

comment on function public.active_steward_count(uuid, uuid) is
  'FEAT-PC013 internal helper: active-membership Steward-role holders in a group, optionally excluding one member. SECURITY DEFINER: reads role + membership rows across RLS. Internal-only — no client execute.';

-- ----------------------------------------------------------------------------
-- 2. pause_member — MEM-4 (rest, not exit)
-- ----------------------------------------------------------------------------
create or replace function public.pause_member(
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
    raise exception 'pausing members is FIM-only' using errcode = '42501';
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

  if not coalesce(public.has_permission(v_actor, p_group_id, 'pause_members'), false) then
    raise exception 'pause_members permission required' using errcode = '42501';
  end if;

  if p_member_group_id = v_actor then
    raise exception 'cannot pause yourself — leaving is the self-exit path'
      using errcode = 'P0001';
  end if;

  select gm.status into v_target_status
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = p_member_group_id;
  if v_target_status is null or v_target_status not in ('active', 'paused') then
    -- absent, invited, or vestigial states: indistinguishable (no leak)
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  if v_target_status = 'paused' then
    raise exception 'member is already paused' using errcode = 'P0001';
  end if;

  -- Headless-group guard: the BEFORE DELETE trigger cannot catch a status
  -- flip — refuse pausing the last ACTIVE Steward here, contract-side.
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
    raise exception 'cannot pause the last active Steward — assign another Steward first'
      using errcode = 'P0001';
  end if;

  -- The flip. Roles rows are untouched: permission darkness is
  -- has_permission()'s existing status filter; reactivation restores them.
  update public.group_memberships
     set status = 'paused', status_changed_at = now()
   where group_id = p_group_id and member_group_id = p_member_group_id;

  -- Durable notification row (V3 — durable state; push rides A-NTF later).
  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  values (
    p_member_group_id,
    'participation_paused',
    'Participation Paused',
    'Your participation in "' || v_group.name || '" has been paused.',
    jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
    p_group_id
  );
end;
$$;

comment on function public.pause_member(uuid, uuid) is
  'FEAT-PC013 MEM-4: pause a member''s participation (active->paused). pause_members-gated; self-target refused (P0001); last-active-Steward guarded (P0001); roles preserved — permission darkness is has_permission()''s existing status=''active'' filter; durable participation_paused row; NO enrolment touch (pause rests participation, it does not exit it). SECURITY DEFINER: flips another member''s row + inserts their notification — no client policy grants either.';

-- ----------------------------------------------------------------------------
-- 3. activate_member — MEM-4 (the way back)
-- ----------------------------------------------------------------------------
create or replace function public.activate_member(
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
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'reactivating members is FIM-only' using errcode = '42501';
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

  if not coalesce(public.has_permission(v_actor, p_group_id, 'activate_members'), false) then
    raise exception 'activate_members permission required' using errcode = '42501';
  end if;

  select gm.status into v_target_status
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = p_member_group_id;
  if v_target_status is null or v_target_status not in ('active', 'paused') then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  if v_target_status = 'active' then
    raise exception 'member is not paused' using errcode = 'P0001';
  end if;

  -- paused -> active. The invited->active triggers
  -- (auto_assign_member_role_on_accept, notify_invitation_accepted,
  -- auto_assign_deusex_role_on_accept) all guard on OLD.status='invited'
  -- and stay silent here; the preserved roles simply resolve again.
  update public.group_memberships
     set status = 'active', status_changed_at = now()
   where group_id = p_group_id and member_group_id = p_member_group_id;

  insert into public.notifications (recipient_group_id, type, title, body, payload, group_id)
  values (
    p_member_group_id,
    'participation_activated',
    'Participation Reactivated',
    'Your participation in "' || v_group.name || '" is active again.',
    jsonb_build_object('group_id', p_group_id, 'group_name', v_group.name),
    p_group_id
  );
end;
$$;

comment on function public.activate_member(uuid, uuid) is
  'FEAT-PC013 MEM-4: reactivate a paused member (paused->active). activate_members-gated (the catalog''s own verb split); preserved roles resume via has_permission()''s status filter; the invited->active trigger fabric stays silent (guards on OLD.status=''invited''); durable participation_activated row. SECURITY DEFINER: same elevation grounds as pause_member.';

-- ----------------------------------------------------------------------------
-- 4. remove_member — MEM-5 (the cascade the RLS path never had)
-- ----------------------------------------------------------------------------
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
  --     journeys — the removal twin of 'left_group' (DS-3 satisfied-now
  --     disposition, re-verified at the Journeys gate; D2)
  update public.journey_enrollments je
     set status = 'frozen',
         progress_data = je.progress_data || jsonb_build_object(
           'frozen_reason', 'removed_from_group',
           'frozen_at', now()::text
         ),
         status_changed_at = now()
    from public.journeys j
   where je.journey_id = j.id
     and je.group_id = p_member_group_id
     and j.created_by_group_id = p_group_id
     and j.is_public = false
     and je.status = 'active';

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

comment on function public.remove_member(uuid, uuid) is
  'FEAT-PC013 MEM-5: remove a member (Steward action) as one composed ADR-U016 cascade — freeze the target''s non-public-journey enrolments (frozen_reason=removed_from_group), delete their role rows, delete the membership (the existing trigger notifies the removed member). remove_members-gated; active OR paused targets; self-target refused (leave is the self-exit); last-ACTIVE-Steward guarded (a paused Steward is not cover). SECURITY DEFINER: cross-member cascade no client policy grants.';

-- ----------------------------------------------------------------------------
-- 5. leave_group — MEM-6, REPLACED IN PLACE (spec Open Q1)
--    Same name + signature as the sprint2 monolith; semantics narrowed to the
--    regular exit. The sole-Steward handover and last-member closure move from
--    silently-executed to HONESTLY REFUSED until G-E re-lands them as specced
--    contracts (MEM-7/MEM-8 — the legacy oracle lives in git history and
--    migrations/archive/). Refusals adopt the house map: the legacy
--    'Group not found' / 'not an active member' free-text P0001s leaked group
--    existence; visibility now precedes every other check (P0002 no-leak).
-- ----------------------------------------------------------------------------
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
    raise exception 'cannot leave: you are the group''s last member, and closing a group is not yet available'
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

  -- The regular exit, in the proven order (the sprint2 shape verbatim):
  update public.journey_enrollments je
     set status = 'frozen',
         progress_data = je.progress_data || jsonb_build_object(
           'frozen_reason', 'left_group',
           'frozen_at', now()::text
         ),
         status_changed_at = now()
    from public.journeys j
   where je.journey_id = j.id
     and je.group_id = v_actor
     and j.created_by_group_id = p_group_id
     and j.is_public = false
     and je.status = 'active';

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

comment on function public.leave_group(uuid) is
  'FEAT-PC013 MEM-6: the member''s own regular exit — freeze own non-public-journey enrolments (frozen_reason=left_group), delete own roles, delete the membership (the existing trigger notifies Stewards). REPLACED IN PLACE over the sprint2 three-scenario monolith (Open Q1): the sole-active-Steward and last-member scenarios are refused P0001 with honest copy until G-E lands MEM-7/MEM-8; refusals follow the house map (P0002 no-leak — visibility precedes every other check). DS-5 attribution disposition: pending-DS-5 (D2). SECURITY DEFINER: composed cascade + cross-RLS reads.';

-- ----------------------------------------------------------------------------
-- 6. get_group_detail — additive amendment (membership_status; gated paused
--    rows). Body carried from FEAT-PC011's definition; existing keys unchanged.
-- ----------------------------------------------------------------------------
create or replace function public.get_group_detail(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_joined_at timestamptz;
  v_can_manage boolean;
  v_can_view_members boolean;
  v_can_manage_members boolean;
  v_members jsonb;
  v_result jsonb;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'group detail is FIM-only' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type = 'engagement';

  select (gm.status = 'active'), gm.added_at into v_is_member, v_joined_at
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = v_actor;
  v_is_member := coalesce(v_is_member, false);

  -- Members see their group in any lifecycle state (GRP-5); non-members see
  -- public groups only while active (mirrors the RLS SELECT posture). Anything
  -- else is P0002 — private and absent are indistinguishable (no leak).
  if v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  v_can_manage := coalesce(
    public.has_permission(v_actor, p_group_id, 'edit_group_settings'), false);
  -- FEAT-PC013 (Open Q3): paused rows render only for viewers holding a
  -- member-management key — membership state is FIM data (PC-3 Privacy note).
  v_can_manage_members :=
       coalesce(public.has_permission(v_actor, p_group_id, 'pause_members'), false)
    or coalesce(public.has_permission(v_actor, p_group_id, 'activate_members'), false)
    or coalesce(public.has_permission(v_actor, p_group_id, 'remove_members'), false);
  -- Management keys imply member-list visibility (you cannot manage what you
  -- cannot see) — surfaced by the minimal-permission pauser persona at build.
  v_can_view_members := coalesce(
      public.has_permission(v_actor, p_group_id, 'view_member_list'), false)
    or v_can_manage_members
    or (v_group.is_public and v_group.show_member_list and v_group.status = 'active');

  v_result := jsonb_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'description', v_group.description,
    'label', v_group.label,
    'status', v_group.status,
    'is_public', v_group.is_public,
    'show_member_list', v_group.show_member_list,
    'created_at', v_group.created_at,
    'member_count', (select count(*) from public.group_memberships gm2
                      where gm2.group_id = p_group_id and gm2.status = 'active'),
    'viewer', jsonb_build_object(
      'is_member', v_is_member,
      'joined_at', v_joined_at,
      'can_manage_settings', v_can_manage)
  );

  if v_can_view_members then
    -- Display identity resolves from the member's (personal) group name —
    -- never full_name (B-DISP oracle). FEAT-PC011 additive keys:
    -- member_group_id + roles[]. FEAT-PC013 additive key: membership_status
    -- ('active' | 'paused'); paused rows appear only when v_can_manage_members.
    select coalesce(jsonb_agg(jsonb_build_object(
             'display_name', pg.name,
             'joined_at', gm.added_at,
             'member_group_id', gm.member_group_id,
             'membership_status', gm.status,
             'roles', coalesce(
               (select jsonb_agg(gr.name order by gr.name)
                  from public.user_group_roles ugr
                  join public.group_roles gr on gr.id = ugr.group_role_id
                 where ugr.group_id = p_group_id
                   and ugr.member_group_id = gm.member_group_id),
               '[]'::jsonb))
             order by gm.added_at), '[]'::jsonb)
      into v_members
      from public.group_memberships gm
      join public.groups pg on pg.id = gm.member_group_id
     where gm.group_id = p_group_id
       and (gm.status = 'active'
            or (gm.status = 'paused' and v_can_manage_members));
    v_result := v_result || jsonb_build_object('members', v_members);
  end if;

  return v_result;
end;
$$;

comment on function public.get_group_detail(uuid) is
  'FEAT-PC010 GRP-4/GRP-5 + FEAT-PC011 additive keys (member_group_id, roles[]) + FEAT-PC013 additive key (membership_status; paused rows only for pause/activate/remove_members holders — Open Q3). Visibility, member_count (active-only), and all prior keys unchanged.';

-- ----------------------------------------------------------------------------
-- 7. Policy narrowing (Open Q2) — the contracts are now the only client-role
--    exit paths; the admin policies stay untouched (A-ADM inherits them).
-- ----------------------------------------------------------------------------
drop policy if exists "memberships_delete_leave" on public.group_memberships;
drop policy if exists "memberships_delete_remove" on public.group_memberships;

-- ----------------------------------------------------------------------------
-- 8. Grants — clients call via PostgREST RPC; gating is internal.
--    active_steward_count is internal-only: no client execute.
--    (CREATE OR REPLACE preserved leave_group's and get_group_detail's
--    existing grants; restated here for auditability.)
-- ----------------------------------------------------------------------------
revoke all on function public.active_steward_count(uuid, uuid) from public;
revoke all on function public.active_steward_count(uuid, uuid) from anon, authenticated;
revoke all on function public.pause_member(uuid, uuid) from public;
revoke all on function public.activate_member(uuid, uuid) from public;
revoke all on function public.remove_member(uuid, uuid) from public;
-- hygiene: the sprint2 creation left EXECUTE granted to PUBLIC (Postgres
-- function default) — found by the gate's grant audit; internally gated
-- anyway (FIM-only), revoked here for posture
revoke all on function public.leave_group(uuid) from public;

grant execute on function public.pause_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.activate_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.remove_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.leave_group(uuid) to authenticated, service_role;
grant execute on function public.get_group_detail(uuid) to authenticated, service_role;
