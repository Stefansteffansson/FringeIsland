-- TASK-RDA-03 — the grant-flip door gets the RD-5 self-lockout guard.
--
-- WHAT THIS CLOSES
-- RD-A bound PC025's `permissions.is_protected` guard to the DELETE door
-- (`delete_group_role`): a role that is the group's only definer of a protected
-- permission cannot be removed. The neighbouring door was left open —
-- `set_group_role_permission(role, perm, false)` deleted the grant row with no
-- `is_protected` check at all (its only refusals were the FIM gate, the
-- account-suspended gate, P0002 not-found, `manage_roles`, `assert_group_writable`,
-- unknown-permission 22023, and grant-direction anti-escalation).
--
-- The reachable brick, now covered by a red-first test:
--   1. a Steward holds `manage_roles` through the group's only role granting it;
--   2. they revoke `manage_roles` from that role — previously allowed;
--   3. no role in the group grants it any more, and nobody can grant it back:
--      `set_group_role_permission` itself requires `manage_roles`, and
--      `create_group_role`'s anti-escalation refuses to grant a permission the
--      author does not hold. The group is bricked from inside with no row deleted.
--
-- SCOPE — no repair pass is owed. Surveyed live before writing this
-- (2026-08-11): no group has reached this state through the grant-flip door.
-- The 3 938 personal groups and 3 system groups that hold no protected-permission
-- definer are BY DESIGN (the personal group's "Myself" role carries zero
-- permissions) and are unreachable here anyway — this contract already restricts
-- itself to `group_type = 'engagement'`. The single engagement group without a
-- definer is a suspended dev fixture carrying zero roles of any kind, not a
-- revoke-induced brick.
--
-- WORDING — deliberately mirrors the delete door so the two speak with one voice
-- ("...would leave the group with no holder of: % — assign the permission
-- elsewhere first", P0001). Note the delete door's own ORDERING NOTE records that
-- "holder" is the spec's word while the implemented test is by DEFINER; the same
-- is true here, and the same choice is made — matching the shipped voice rather
-- than introducing a second vocabulary for one guard. Three sibling assertions
-- bind that wording (`role-provenance-and-retirement.test.ts:666`,
-- `RolesPanel.test.tsx:396,411`), so the delete door's message is left untouched.
--
-- SIBLING ASSERTIONS SWEPT (house rule: name what this migration may invalidate).
-- Live cells calling `set_group_role_permission`:
--   hub/tests/integration/groups/role-permission-contracts.test.ts        — grant/revoke cells; none revokes a group's LAST definer of a protected permission
--   hub/tests/integration/groups/group-availability-enforcement.test.ts   — availability gating, revoke path incidental
--   hub/tests/integration/groups/role-provenance-and-retirement.test.ts   — RD-A's S4c cell revokes `rest_group` from a Steward instance and expects success
--   hub/tests/integration/groups/role-publication-and-diff.test.ts        — diff fixtures
-- The S4c cell was the one to watch — it is the incidental green that PROVED
-- this hole. CHECKED, and it survives unchanged: the fixture creates a "Deputy"
-- custom role as a SECOND definer of `rest_group` (`:639-643`) *before* the
-- Steward instance gives it up (`:647-651`), and its own comment says the revoke
-- is "legal precisely because" of that. This guard therefore does not fire there,
-- and the cell keeps asserting exactly what it always asserted. No adaptation
-- owed; no sibling assertion is invalidated by this migration.

create or replace function public.set_group_role_permission(
  p_group_role_id uuid,
  p_permission_name text,
  p_granted boolean
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_role public.group_roles%rowtype;
  v_group public.groups%rowtype;
  v_is_member boolean := false;
  v_perm_id uuid;
  v_is_protected boolean;
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
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(v_role.group_id, v_actor);

  select p.id, p.is_protected into v_perm_id, v_is_protected
    from public.permissions p where p.name = p_permission_name;
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
    -- TASK-RDA-03: RD-5's self-lockout guard, pointed at the revoke direction.
    -- Refuse when THIS role is the group's last definer of a protected
    -- permission. Checked by definer, for the same reason the delete door is:
    -- a group with no role granting a protected permission can never hand that
    -- permission to anyone again without admin intervention.
    if coalesce(v_is_protected, false)
       and exists (
         select 1 from public.group_role_permissions grp
          where grp.group_role_id = p_group_role_id
            and grp.permission_id = v_perm_id
            and grp.granted)
       and not exists (
         select 1
           from public.group_roles gr2
           join public.group_role_permissions grp2 on grp2.group_role_id = gr2.id
          where gr2.group_id = v_role.group_id
            and gr2.id is distinct from p_group_role_id
            and grp2.permission_id = v_perm_id
            and grp2.granted)
    then
      raise exception
        'revoking this permission would leave the group with no holder of: % — assign the permission elsewhere first',
        p_permission_name
        using errcode = 'P0001';
    end if;

    delete from public.group_role_permissions
     where group_role_id = p_group_role_id and permission_id = v_perm_id;
  end if;

  return public.role_fabric_entry(p_group_role_id);
end;
$function$;

-- House pattern (platform CLAUDE.md): the default privileges do NOT cover you.
revoke all on function public.set_group_role_permission(uuid, text, boolean) from public, anon;
grant execute on function public.set_group_role_permission(uuid, text, boolean) to authenticated, service_role;

comment on function public.set_group_role_permission(uuid, text, boolean) is
  'Grants or revokes one permission on a group role. Revoke direction refuses when the role is the group''s last definer of a protected permission (TASK-RDA-03, RD-5 self-lockout guard — the grant-flip twin of delete_group_role''s door).';
