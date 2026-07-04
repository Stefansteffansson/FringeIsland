-- FEAT-PC010 (Groups Cycle G-A): group creation & settings contracts.
-- Three own-actor SECURITY DEFINER functions over existing PC-3 substrate
-- (no new table), the ADR-U038 direct-write narrowing on public.groups,
-- and the idempotent system-group seeding repair (substrate-audit C3-1).
--
-- SECURITY DEFINER rationale (privilege-escalation surfaces, documented per
-- platform discipline):
--   * create_engagement_group writes four PC-3 tables atomically under the
--     ADR-U016 composed invariant ("no engagement group without an active,
--     Steward-bound creator membership") — inexpressible as RLS for a
--     caller who is not yet a member of the group being created.
--   * get_group_detail / update_group_settings must see rows the SELECT
--     policy hides from members (non-active lifecycle states, GRP-5) while
--     self-gating strictly on the caller's own standing and permissions.
-- Every function resolves the actor via get_current_personal_group_id()
-- (P-O1, the four-hop personal-group primitive) and declares search_path=''.
-- Creator binding is PERMISSION-DERIVED (the instantiated role whose template
-- grants 'assign_roles') — no role-name strings.
-- The copy_template_permissions trigger on group_roles materialises each
-- instance's permission grants; this migration deliberately does not copy
-- them a second time.

-- ---------------------------------------------------------------------------
-- 1. create_engagement_group — the atomic stewarded bootstrap (GRP-1)
-- ---------------------------------------------------------------------------

create or replace function public.create_engagement_group(
  p_name text,
  p_description text default null,
  p_label text default null,
  p_is_public boolean default false,
  p_show_member_list boolean default true,
  p_group_template_id uuid default null
) returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group_id uuid;
  v_steward_role_id uuid;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u
   where u.auth_user_id = (select auth.uid());

  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'group creation is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'group name required' using errcode = '22023';
  end if;
  if p_group_template_id is not null and not exists (
    select 1 from public.group_templates gt where gt.id = p_group_template_id
  ) then
    raise exception 'unknown group template' using errcode = 'P0002';
  end if;

  insert into public.groups
    (name, description, label, group_type, is_public, show_member_list,
     created_by_group_id, created_from_group_template_id)
  values
    (btrim(p_name), p_description, p_label, 'engagement', p_is_public,
     p_show_member_list, v_actor, p_group_template_id)
  returning id into v_group_id;

  -- Role instances: the chosen template's role set, or — when none is chosen —
  -- every role template any group template carries (the four foundational
  -- templates today). Data-driven; the copy_template_permissions trigger
  -- copies each instance's permission grants.
  insert into public.group_roles (group_id, name, description, created_from_role_template_id)
  select v_group_id, rt.name, rt.description, rt.id
    from public.role_templates rt
   where rt.id in (
     select gtr.role_template_id
       from public.group_template_roles gtr
      where gtr.group_template_id = coalesce(p_group_template_id, gtr.group_template_id)
   );

  -- Creator's active membership (before the role binding — the junction's
  -- validation expects the role's group to exist and match).
  insert into public.group_memberships (group_id, member_group_id, status, added_by_group_id)
  values (v_group_id, v_actor, 'active', v_actor);

  -- Bind the creator to the management role: permission-derived (the
  -- instantiated role whose template grants 'assign_roles' — unique to the
  -- Steward template today), never a role-name string.
  select gr.id into v_steward_role_id
    from public.group_roles gr
    join public.role_template_permissions rtp
      on rtp.role_template_id = gr.created_from_role_template_id
     and rtp.granted
    join public.permissions p on p.id = rtp.permission_id
   where gr.group_id = v_group_id
     and p.name = 'assign_roles'
   limit 1;

  if v_steward_role_id is null then
    raise exception 'instantiated role set carries no management role' using errcode = '22023';
  end if;

  insert into public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
  values (v_actor, v_group_id, v_steward_role_id, v_actor);

  return v_group_id;
end;
$$;

comment on function public.create_engagement_group(text, text, text, boolean, boolean, uuid) is
  'FEAT-PC010 GRP-1: atomic engagement-group bootstrap (group + role instances + creator active membership + permission-derived Steward binding). FIM-only, active-account-only.';

-- ---------------------------------------------------------------------------
-- 2. get_group_detail — the honest, no-leak read (GRP-4 detail · GRP-5)
-- ---------------------------------------------------------------------------

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
  -- Member list: the view_member_list permission (all four foundational role
  -- templates grant it), or the public member-list toggle for non-members.
  v_can_view_members := coalesce(
      public.has_permission(v_actor, p_group_id, 'view_member_list'), false)
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
    -- never full_name (B-DISP oracle; uniform for group-as-member rows too).
    select coalesce(jsonb_agg(jsonb_build_object(
             'display_name', pg.name,
             'joined_at', gm.added_at)
             order by gm.added_at), '[]'::jsonb)
      into v_members
      from public.group_memberships gm
      join public.groups pg on pg.id = gm.member_group_id
     where gm.group_id = p_group_id and gm.status = 'active';
    v_result := v_result || jsonb_build_object('members', v_members);
  end if;

  return v_result;
end;
$$;

comment on function public.get_group_detail(uuid) is
  'FEAT-PC010 GRP-4/GRP-5: own-standing group detail read. Member-or-(public+active) visibility, P0002 no-existence-leak, viewer capability flags, member list per view_member_list permission or the public member-list toggle.';

-- ---------------------------------------------------------------------------
-- 3. update_group_settings — permission-gated partial update (GRP-2 · GRP-3)
-- ---------------------------------------------------------------------------

create or replace function public.update_group_settings(
  p_group_id uuid,
  p_name text default null,
  p_description text default null,
  p_label text default null,
  p_is_public boolean default null,
  p_show_member_list boolean default null
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
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'group settings are FIM-only' using errcode = '42501';
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

  if p_name is not null and btrim(p_name) = '' then
    raise exception 'group name required' using errcode = '22023';
  end if;

  -- Per-field permission keys from the catalog (GRP-2 vs GRP-3):
  if (p_name is not null or p_description is not null or p_label is not null)
     and not coalesce(public.has_permission(v_actor, p_group_id, 'edit_group_settings'), false) then
    raise exception 'not permitted to edit group settings' using errcode = '42501';
  end if;
  if p_is_public is not null
     and not coalesce(public.has_permission(v_actor, p_group_id, 'set_group_visibility'), false) then
    raise exception 'not permitted to set group visibility' using errcode = '42501';
  end if;
  if p_show_member_list is not null
     and not coalesce(public.has_permission(v_actor, p_group_id, 'control_member_list_visibility'), false) then
    raise exception 'not permitted to control member-list visibility' using errcode = '42501';
  end if;

  -- Partial update: null = leave unchanged (clear a text field by sending '').
  -- status / group_type / created_by_group_id are deliberately not parameters.
  update public.groups set
    name             = coalesce(btrim(p_name), name),
    description      = coalesce(p_description, description),
    label            = coalesce(p_label, label),
    is_public        = coalesce(p_is_public, is_public),
    show_member_list = coalesce(p_show_member_list, show_member_list),
    updated_at       = now()
  where id = p_group_id;

  return public.get_group_detail(p_group_id);
end;
$$;

comment on function public.update_group_settings(uuid, text, text, text, boolean, boolean) is
  'FEAT-PC010 GRP-2/GRP-3: permission-gated partial settings update (edit_group_settings / set_group_visibility / control_member_list_visibility). No path to status or group_type.';

-- ---------------------------------------------------------------------------
-- 4. Function grants — clients call via PostgREST RPC; gating is internal.
-- ---------------------------------------------------------------------------

revoke all on function public.create_engagement_group(text, text, text, boolean, boolean, uuid) from public;
revoke all on function public.get_group_detail(uuid) from public;
revoke all on function public.update_group_settings(uuid, text, text, text, boolean, boolean) from public;
grant execute on function public.create_engagement_group(text, text, text, boolean, boolean, uuid) to authenticated, service_role;
grant execute on function public.get_group_detail(uuid) to authenticated, service_role;
grant execute on function public.update_group_settings(uuid, text, text, text, boolean, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Direct-write narrowing on public.groups (ADR-U038, STORY-4).
--    Verified pre-migration: groups_insert's with_check (created_by = actor)
--    lets any authenticated caller — including an anonymous-session Mist —
--    create an un-bootstrapped group; groups_update is permission-gated but
--    not column-scoped. Narrow at the privilege layer; RLS stays as
--    defense-in-depth. TRUNCATE is revoked because it bypasses RLS entirely.
--    DELETE is deliberately untouched this cycle (existing delete_group
--    policy; GRP-9 owns deletion at Cycle G-E).
-- ---------------------------------------------------------------------------

revoke insert, truncate on table public.groups from anon, authenticated;
revoke update on table public.groups from anon, authenticated;
grant update (name, description, label, avatar_url, settings, is_public, show_member_list, updated_at)
  on table public.groups to authenticated;

-- ---------------------------------------------------------------------------
-- 6. System-group seeding repair (C3-1, PC-3 slice). supabase/seeds/ carries
--    these, but seeds sit outside the migration chain — a fresh DB with only
--    migrations applied must still boot the platform. Idempotent by name+type
--    (no-op on the dev DB, where the rows exist as carried state).
-- ---------------------------------------------------------------------------

insert into public.groups (name, description, group_type, is_public, show_member_list, status)
select 'FringeIsland Members', 'All members of FringeIsland', 'system', false, false, 'active'
 where not exists (
   select 1 from public.groups where name = 'FringeIsland Members' and group_type = 'system');

insert into public.groups (name, description, group_type, is_public, show_member_list, status)
select 'DeusEx', 'Platform administration', 'system', false, false, 'active'
 where not exists (
   select 1 from public.groups where name = 'DeusEx' and group_type = 'system');
