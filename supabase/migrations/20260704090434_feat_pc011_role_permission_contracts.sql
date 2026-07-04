-- FEAT-PC011 (Groups Cycle G-B): group role & permission contracts.
-- Six member-facing SECURITY DEFINER functions + one internal payload helper
-- over the existing PC-3 role substrate (group_roles / user_group_roles /
-- group_role_permissions) — NO new table, NO policy changes: the role tables'
-- RLS was audited as substantively correct (2026-07-04) and stays as
-- defense-in-depth beneath the contracts. Plus the additive get_group_detail
-- members extension (member_group_id, roles[]) and TRUNCATE hygiene.
--
-- SECURITY DEFINER rationale (privilege-escalation surfaces, documented per
-- platform discipline):
--   * All functions must see rows the SELECT policies hide from some callers
--     (e.g. the fabric read for a public group's non-member viewer; role
--     resolution for the no-leak P0002 distinction) while self-gating
--     strictly on the caller's own permissions via has_permission().
--   * assign/remove ride the existing validate_user_group_role,
--     prevent_last_leader_removal / prevent_last_deusex_role_removal and
--     notify_role_* triggers — invariant refusals surface verbatim (P0001),
--     never pre-checked-and-hidden.
-- Every function resolves the actor via get_current_personal_group_id()
-- (P-O1) and declares search_path = ''. No role-name strings anywhere —
-- permission-derived gates only (ADR-U007).
--
-- Definition-time anti-escalation (spec Open Q4, predicate verified on dev):
--   grp_insert with_check = has_permission(actor, group, 'manage_roles')
--     AND has_permission(actor, group, get_permission_name(permission_id))
--   i.e. the author must themselves hold each permission they grant. The
--   contracts enforce the same predicate (create_group_role custom path,
--   set_group_role_permission grant path) — exactly as strict.
--
-- Build-discovered trapdoor (recorded for the gate): the
-- copy_template_permissions trigger AUTO-LINKS a freshly inserted role whose
-- name matches '<name> Role Template' in role_templates and copies that
-- template's grants. A "custom" role named e.g. 'Steward' would silently
-- become a fully-granted leader role, defeating definition-time
-- anti-escalation. create_group_role's custom path therefore REFUSES names
-- that would auto-link (22023). The direct-path equivalent (a manage_roles
-- holder INSERTing such a name) exists in the substrate and is flagged at
-- the schema gate; can_assign_role() remains the wall that stops such a role
-- being bound to anyone.
--
-- Open Q2 default carried: template-derived instances ARE editable
-- (per-group customisation is the three-layer model's point).
-- Open Q3 default carried: delete_group_role refuses while held (P0001) —
-- unbinding is explicit, never a silent cascade.

-- ---------------------------------------------------------------------------
-- 0. role_fabric_entry — internal payload helper (no client grants).
--    One role instance as the jsonb entry every contract returns/aggregates.
-- ---------------------------------------------------------------------------

create or replace function public.role_fabric_entry(p_group_role_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', gr.id,
    'name', gr.name,
    'description', gr.description,
    'created_from_role_template_id', gr.created_from_role_template_id,
    'holder_count', (select count(*) from public.user_group_roles ugr
                      where ugr.group_role_id = gr.id),
    'permissions', coalesce(
      (select jsonb_agg(p.name order by p.name)
         from public.group_role_permissions grp
         join public.permissions p on p.id = grp.permission_id
        where grp.group_role_id = gr.id and grp.granted),
      '[]'::jsonb))
  from public.group_roles gr
  where gr.id = p_group_role_id;
$$;

comment on function public.role_fabric_entry(uuid) is
  'FEAT-PC011 internal: one role instance as a fabric-payload jsonb entry. SECURITY DEFINER so contracts can compose it regardless of caller RLS visibility; no client execute grants.';

-- ---------------------------------------------------------------------------
-- 1. get_group_roles — the fabric read (GRP-6/7 read)
-- ---------------------------------------------------------------------------

create or replace function public.get_group_roles(p_group_id uuid)
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
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary into v_is_temporary
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'role fabric is FIM-only' using errcode = '42501';
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

  return jsonb_build_object(
    'group_id', v_group.id,
    'roles', coalesce(
      (select jsonb_agg(public.role_fabric_entry(gr.id) order by gr.created_at, gr.name)
         from public.group_roles gr where gr.group_id = p_group_id),
      '[]'::jsonb),
    'viewer', jsonb_build_object(
      'can_manage_roles',
        coalesce(public.has_permission(v_actor, p_group_id, 'manage_roles'), false),
      'can_assign_roles',
        coalesce(public.has_permission(v_actor, p_group_id, 'assign_roles'), false),
      'can_remove_roles',
        coalesce(public.has_permission(v_actor, p_group_id, 'remove_roles'), false)),
    'available_permissions', coalesce(
      (select jsonb_agg(jsonb_build_object('name', p.name, 'category', p.category)
                        order by p.category, p.name)
         from public.permissions p),
      '[]'::jsonb));
end;
$$;

comment on function public.get_group_roles(uuid) is
  'FEAT-PC011 GRP-6/7 read: the group''s role fabric (instances + grants + holder counts) with viewer capability flags and the permission catalog riding the payload. G-A visibility rule (member-or-public+active, else P0002 no-leak).';

-- ---------------------------------------------------------------------------
-- 2. create_group_role — template instantiation or custom definition (GRP-6)
-- ---------------------------------------------------------------------------

create or replace function public.create_group_role(
  p_group_id uuid,
  p_name text,
  p_description text default null,
  p_role_template_id uuid default null,
  p_permissions text[] default null
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
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_name text;
  v_perm text;
  v_role_id uuid;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'role definition is FIM-only' using errcode = '42501';
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

  if not coalesce(public.has_permission(v_actor, p_group_id, 'manage_roles'), false) then
    raise exception 'not permitted to manage roles' using errcode = '42501';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'role name required' using errcode = '22023';
  end if;
  v_name := btrim(p_name);

  if p_role_template_id is not null then
    -- Template path: grants are trigger-copied; an explicit list is a
    -- contradiction, not a merge.
    if p_permissions is not null then
      raise exception 'choose a template or an explicit permission list, not both'
        using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.role_templates rt where rt.id = p_role_template_id
    ) then
      raise exception 'role template not found' using errcode = 'P0002';
    end if;
    insert into public.group_roles (group_id, name, description, created_from_role_template_id)
    values (p_group_id, v_name, p_description, p_role_template_id)
    returning id into v_role_id;
    -- copy_template_permissions materialises the grants; never copy twice.
    return v_role_id;
  end if;

  -- Custom path. Refuse names the copy trigger would auto-link (see header):
  if exists (
    select 1 from public.role_templates rt where rt.name = v_name || ' Role Template'
  ) then
    raise exception 'role name is reserved by a role template — instantiate the template instead'
      using errcode = '22023';
  end if;

  -- Definition-time anti-escalation (the grp_insert predicate, Open Q4):
  -- every requested grant must exist in the catalog AND be held by the author.
  foreach v_perm in array coalesce(p_permissions, array[]::text[]) loop
    if not exists (select 1 from public.permissions p where p.name = v_perm) then
      raise exception 'unknown permission: %', v_perm using errcode = '22023';
    end if;
    if not coalesce(public.has_permission(v_actor, p_group_id, v_perm), false) then
      raise exception 'cannot grant a permission you do not hold: %', v_perm
        using errcode = '42501';
    end if;
  end loop;

  insert into public.group_roles (group_id, name, description)
  values (p_group_id, v_name, p_description)
  returning id into v_role_id;

  insert into public.group_role_permissions (group_role_id, permission_id)
  select v_role_id, p.id
    from public.permissions p
   where p.name = any(coalesce(p_permissions, array[]::text[]));

  return v_role_id;
end;
$$;

comment on function public.create_group_role(uuid, text, text, uuid, text[]) is
  'FEAT-PC011 GRP-6: manage_roles-gated role creation — template instantiation (trigger-copied grants) or custom definition with definition-time anti-escalation (author must hold every granted key — the verified grp_insert predicate). Auto-link-colliding custom names refused (22023); duplicate names surface 23505.';

-- ---------------------------------------------------------------------------
-- 3. update_group_role — partial rename/describe (GRP-6 "define")
-- ---------------------------------------------------------------------------

create or replace function public.update_group_role(
  p_group_role_id uuid,
  p_name text default null,
  p_description text default null
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
  v_role public.group_roles%rowtype;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'role definition is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_role from public.group_roles gr where gr.id = p_group_role_id;
  if v_role.id is not null then
    select * into v_group
      from public.groups g
     where g.id = v_role.group_id and g.group_type = 'engagement';
    select (gm.status = 'active') into v_is_member
      from public.group_memberships gm
     where gm.group_id = v_role.group_id and gm.member_group_id = v_actor;
    v_is_member := coalesce(v_is_member, false);
  end if;
  -- Ghost role, foreign private group, or non-engagement scope: one P0002.
  if v_role.id is null or v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'role not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, v_role.group_id, 'manage_roles'), false) then
    raise exception 'not permitted to manage roles' using errcode = '42501';
  end if;
  if p_name is not null and btrim(p_name) = '' then
    raise exception 'role name required' using errcode = '22023';
  end if;

  -- Partial update: null = leave unchanged. Duplicate names surface 23505.
  update public.group_roles set
    name        = coalesce(btrim(p_name), name),
    description = coalesce(p_description, description)
  where id = p_group_role_id;

  return public.role_fabric_entry(p_group_role_id);
end;
$$;

comment on function public.update_group_role(uuid, text, text) is
  'FEAT-PC011 GRP-6: manage_roles-gated partial rename/describe of a role instance (template-derived included — per-group customisation, Open Q2 default). P0002 no-leak on ghost/foreign role ids.';

-- ---------------------------------------------------------------------------
-- 4. set_group_role_permission — flip one grant (GRP-6 "define")
-- ---------------------------------------------------------------------------

create or replace function public.set_group_role_permission(
  p_group_role_id uuid,
  p_permission_name text,
  p_granted boolean
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
  v_role public.group_roles%rowtype;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_perm_id uuid;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'role definition is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_role from public.group_roles gr where gr.id = p_group_role_id;
  if v_role.id is not null then
    select * into v_group
      from public.groups g
     where g.id = v_role.group_id and g.group_type = 'engagement';
    select (gm.status = 'active') into v_is_member
      from public.group_memberships gm
     where gm.group_id = v_role.group_id and gm.member_group_id = v_actor;
    v_is_member := coalesce(v_is_member, false);
  end if;
  if v_role.id is null or v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'role not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, v_role.group_id, 'manage_roles'), false) then
    raise exception 'not permitted to manage roles' using errcode = '42501';
  end if;

  select p.id into v_perm_id from public.permissions p where p.name = p_permission_name;
  if v_perm_id is null then
    raise exception 'unknown permission: %', p_permission_name using errcode = '22023';
  end if;

  if p_granted then
    -- Definition-time anti-escalation (Open Q4 predicate) on the grant path.
    if not coalesce(public.has_permission(v_actor, v_role.group_id, p_permission_name), false) then
      raise exception 'cannot grant a permission you do not hold: %', p_permission_name
        using errcode = '42501';
    end if;
    -- The substrate's grant model is row-presence (grp_insert / grp_delete;
    -- no UPDATE policy) — mirror it: upsert on grant, delete on revoke.
    insert into public.group_role_permissions (group_role_id, permission_id)
    values (p_group_role_id, v_perm_id)
    on conflict (group_role_id, permission_id) do update set granted = true;
  else
    delete from public.group_role_permissions
     where group_role_id = p_group_role_id and permission_id = v_perm_id;
  end if;

  return public.role_fabric_entry(p_group_role_id);
end;
$$;

comment on function public.set_group_role_permission(uuid, text, boolean) is
  'FEAT-PC011 GRP-6: manage_roles-gated single-grant flip (template-derived instances included — Open Q2 default). Grants require the author to hold the key (Open Q4 predicate); revokes need manage_roles only, mirroring grp_delete.';

-- ---------------------------------------------------------------------------
-- 5. delete_group_role — custom + unheld only (GRP-6, Open Q3 default)
-- ---------------------------------------------------------------------------

create or replace function public.delete_group_role(p_group_role_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_role public.group_roles%rowtype;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'role definition is FIM-only' using errcode = '42501';
  end if;
  if v_is_active is distinct from true then
    raise exception 'account is suspended' using errcode = '42501';
  end if;

  select * into v_role from public.group_roles gr where gr.id = p_group_role_id;
  if v_role.id is not null then
    select * into v_group
      from public.groups g
     where g.id = v_role.group_id and g.group_type = 'engagement';
    select (gm.status = 'active') into v_is_member
      from public.group_memberships gm
     where gm.group_id = v_role.group_id and gm.member_group_id = v_actor;
    v_is_member := coalesce(v_is_member, false);
  end if;
  if v_role.id is null or v_group.id is null
     or not (v_is_member or (v_group.is_public and v_group.status = 'active')) then
    raise exception 'role not found' using errcode = 'P0002';
  end if;

  if not coalesce(public.has_permission(v_actor, v_role.group_id, 'manage_roles'), false) then
    raise exception 'not permitted to manage roles' using errcode = '42501';
  end if;
  -- The RLS delete rule (created_from_role_template_id IS NULL) carried into
  -- the contract as an explicit refusal rather than a silent zero-row delete.
  if v_role.created_from_role_template_id is not null then
    raise exception 'template-derived role instances cannot be deleted' using errcode = '42501';
  end if;
  -- Open Q3 default: refuse while held — unbinding is explicit, never cascade.
  if exists (
    select 1 from public.user_group_roles ugr where ugr.group_role_id = p_group_role_id
  ) then
    raise exception 'role is held by members — remove the role from all holders first'
      using errcode = 'P0001';
  end if;

  delete from public.group_roles where id = p_group_role_id;
end;
$$;

comment on function public.delete_group_role(uuid) is
  'FEAT-PC011 GRP-6: manage_roles-gated deletion of CUSTOM, UNHELD roles only. Template-derived refused (42501, the RLS rule made explicit); held refused (P0001, Open Q3 default — unbind first).';

-- ---------------------------------------------------------------------------
-- 6. assign_member_role — anti-escalation assignment (GRP-7)
-- ---------------------------------------------------------------------------

create or replace function public.assign_member_role(
  p_group_id uuid,
  p_member_group_id uuid,
  p_group_role_id uuid
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
    raise exception 'role assignment is FIM-only' using errcode = '42501';
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

  if not coalesce(public.has_permission(v_actor, p_group_id, 'assign_roles'), false) then
    raise exception 'not permitted to assign roles' using errcode = '42501';
  end if;
  -- Ghost and foreign role ids resolve identically (no-leak).
  if not exists (
    select 1 from public.group_roles gr
     where gr.id = p_group_role_id and gr.group_id = p_group_id
  ) then
    raise exception 'role not found' using errcode = 'P0002';
  end if;

  select gm.status into v_target_status
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = p_member_group_id;
  if v_target_status is distinct from 'active' then
    raise exception 'target is not an active member of the group' using errcode = '22023';
  end if;

  -- Assignment-time anti-escalation: the existing PC-3 primitive, surfaced.
  if not coalesce(public.can_assign_role(v_actor, p_group_id, p_group_role_id), false) then
    raise exception 'cannot assign a role granting permissions you do not hold'
      using errcode = '42501';
  end if;

  -- Duplicate binding surfaces 23505; notify_role_assigned writes the
  -- durable notification row (existing trigger — not duplicated here).
  insert into public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
  values (p_member_group_id, p_group_id, p_group_role_id, v_actor);
end;
$$;

comment on function public.assign_member_role(uuid, uuid, uuid) is
  'FEAT-PC011 GRP-7: assign_roles-gated binding through can_assign_role() (assignment-time anti-escalation). Active-member targets only (22023); ghost/foreign groups and roles P0002 no-leak; durable notification via existing trigger.';

-- ---------------------------------------------------------------------------
-- 7. remove_member_role — invariant-riding removal (GRP-7)
-- ---------------------------------------------------------------------------

create or replace function public.remove_member_role(
  p_group_id uuid,
  p_member_group_id uuid,
  p_group_role_id uuid
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
  v_binding_id uuid;
begin
  v_actor := public.get_current_personal_group_id();
  select u.is_temporary, u.is_active into v_is_temporary, v_is_active
    from public.users u where u.auth_user_id = (select auth.uid());
  if v_actor is null or v_is_temporary is distinct from false then
    raise exception 'role removal is FIM-only' using errcode = '42501';
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

  if not coalesce(public.has_permission(v_actor, p_group_id, 'remove_roles'), false) then
    raise exception 'not permitted to remove roles' using errcode = '42501';
  end if;

  select ugr.id into v_binding_id
    from public.user_group_roles ugr
   where ugr.group_id = p_group_id
     and ugr.member_group_id = p_member_group_id
     and ugr.group_role_id = p_group_role_id;
  if v_binding_id is null then
    raise exception 'role binding not found' using errcode = 'P0002';
  end if;

  -- prevent_last_leader_removal / prevent_last_deusex_role_removal refuse
  -- here with their own P0001 exceptions — surfaced verbatim, never
  -- pre-checked-and-hidden. notify_role_removed writes the durable row.
  delete from public.user_group_roles where id = v_binding_id;
end;
$$;

comment on function public.remove_member_role(uuid, uuid, uuid) is
  'FEAT-PC011 GRP-7: remove_roles-gated unbinding riding the last-Steward / last-DeusEx invariant triggers (refusals surface verbatim as P0001). P0002 no-leak on ghost bindings; durable notification via existing trigger.';

-- ---------------------------------------------------------------------------
-- 8. get_group_detail — ADDITIVE members extension (member_group_id, roles[]).
--    Full replacement of the FEAT-PC010 body; every existing key unchanged.
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
    -- never full_name (B-DISP oracle). FEAT-PC011 additive keys:
    -- member_group_id (the assignment surface's opaque handle) and roles[]
    -- (instance names, for role chips). Existing keys unchanged.
    select coalesce(jsonb_agg(jsonb_build_object(
             'display_name', pg.name,
             'joined_at', gm.added_at,
             'member_group_id', gm.member_group_id,
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
     where gm.group_id = p_group_id and gm.status = 'active';
    v_result := v_result || jsonb_build_object('members', v_members);
  end if;

  return v_result;
end;
$$;

comment on function public.get_group_detail(uuid) is
  'FEAT-PC010 GRP-4/GRP-5 + FEAT-PC011 additive extension: member entries carry member_group_id and roles[] (instance names) so the member list is the assignment surface. Visibility and existing keys unchanged.';

-- ---------------------------------------------------------------------------
-- 9. Function grants — clients call via PostgREST RPC; gating is internal.
--    role_fabric_entry is internal-only: no client execute.
-- ---------------------------------------------------------------------------

revoke all on function public.role_fabric_entry(uuid) from public;
revoke all on function public.get_group_roles(uuid) from public;
revoke all on function public.create_group_role(uuid, text, text, uuid, text[]) from public;
revoke all on function public.update_group_role(uuid, text, text) from public;
revoke all on function public.set_group_role_permission(uuid, text, boolean) from public;
revoke all on function public.delete_group_role(uuid) from public;
revoke all on function public.assign_member_role(uuid, uuid, uuid) from public;
revoke all on function public.remove_member_role(uuid, uuid, uuid) from public;

grant execute on function public.role_fabric_entry(uuid) to service_role;
grant execute on function public.get_group_roles(uuid) to authenticated, service_role;
grant execute on function public.create_group_role(uuid, text, text, uuid, text[]) to authenticated, service_role;
grant execute on function public.update_group_role(uuid, text, text) to authenticated, service_role;
grant execute on function public.set_group_role_permission(uuid, text, boolean) to authenticated, service_role;
grant execute on function public.delete_group_role(uuid) to authenticated, service_role;
grant execute on function public.assign_member_role(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.remove_member_role(uuid, uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 10. TRUNCATE hygiene (ADR-U038, STORY-6). Verified pre-migration: TRUNCATE
--     is currently GRANTED to anon + authenticated on all three role tables.
--     It bypasses RLS entirely — no client role has any business with it.
--     No other privilege narrowing: unlike public.groups (G-A), the role
--     tables' RLS write surface was audited as substantively correct and
--     stays as defense-in-depth beneath the contracts.
-- ---------------------------------------------------------------------------

revoke truncate on table public.group_roles from anon, authenticated;
revoke truncate on table public.user_group_roles from anon, authenticated;
revoke truncate on table public.group_role_permissions from anon, authenticated;
