-- FEAT-PC020 (Cycle ADM-B, board AB-5: ADM-8 + ADM-9) — group administration
-- contracts: the platform finally sees its own groups. Five SECURITY DEFINER
-- contracts (admin_get_groups / admin_get_group_detail / admin_suspend_group /
-- admin_reactivate_group / admin_reassign_group_stewardship). Discharges
-- AC3-O8 (no platform-scope group read across 87 migrations) and RW-05 (a
-- group handed to FringeIsland becomes invisible to the only party who can
-- act on it); admin_suspend_group is the FIRST producer of
-- groups.status = 'suspended' (the CHECK has admitted it since sprint1 with
-- zero producers).
--
-- Schema change — schema-review gate: lands at task status `review`, not
-- `done`. STRICTLY ADDITIVE: five functions + ACLs. No new tables, no table
-- change, no policy change, no existing-writer change, no constraint change
-- (groups_status_check, 20260228111514:24, already admits 'suspended').
-- All five manifest-pinned PC-4 in supabase/ownership.manifest.json in this
-- same PR (born classified; the admin_* pin binds them mechanically).
--
-- Sibling-assertion grep (the three-strikes rule), swept 2026-08-01 across
-- hub/tests, hub/lib, hub/app, supabase/migrations. The five function names
-- have zero pre-existing references; the only referencing file is this
-- feature's own red-first suite (hub/tests/integration/admin/
-- group-administration-contracts.test.ts). Assertions naming behaviour this
-- migration touches ('suspended' / groups.status / GRP-5 badge), each
-- DELIBERATELY LEFT — nothing adapted, the migration is additive:
--   - group-closure-deletion.test.ts:344 (group stays 'active' after
--     hand-over), :415/:437/:457 (close_group -> 'closed'), :511
--     (delete_group -> 'archived'), :589 (refused transition leaves
--     'active') — closure/hand-over contracts untouched.
--   - group-closure-deletion.test.ts:388/:475/:552 — fixtures force
--     status='suspended' by raw SQL to stage refusal cases; still valid. A
--     real producer now exists; migrating those fixtures to it is a later
--     hygiene candidate, not this migration's scope.
--   - group-crud-contracts.test.ts:237-246 (GRP-5: get_group_detail returns
--     status verbatim for a non-active group), :249 (Mist 42501) — unchanged;
--     the new suite asserts the same path for 'suspended' (STORY-3).
--   - GroupDetailPanel.test.tsx:132-152 — the GRP-5 badge is
--     vocabulary-tolerant by design; 'suspended' renders with no surface
--     change (PC020 §Solution).
--   - leadership-transfer.spec.ts:328 ('closed'), :374 ('archived') —
--     untouched.
--   - Status-reading contract candidate get_group_detail
--     (20260706170000:117): status flows through unchanged; members see
--     their group in any lifecycle state, now including 'suspended'.
--
-- Direct-caller question (ADR-U038): every contract self-gates on
-- public.is_platform_admin() with a typed 42501 BEFORE touching data, so a
-- direct PostgREST caller — including a signed-in Mist (no DeusEx
-- membership, gate false) — can do nothing the product route would refuse.
-- anon has no EXECUTE. The mutations write only groups.status/updated_at,
-- role-fabric rows behind the composed PC-3 walls (can_assign_role + the
-- active-member predicate + prevent_last_leader_removal on the caretaker
-- teardown), and append-only admin_audit_log inserts (pattern (a)). No
-- column grants change.

-- ---------------------------------------------------------------------------
-- admin_get_groups — the ADM-8 list. Filters: all (non-personal) |
-- engagement | deusex_stewarded (the AC3-O8/RW-05 discharge) | suspended.
-- No pagination in v1 (platform group counts are dozens; keyset joins when a
-- measurement asks). deusex_stewarded derives from MEMBERSHIP ROWS, never
-- name matching (the TASK-INT-05 warning made law).
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_groups(p_filter text default 'all')
returns table (
  id uuid,
  name text,
  group_type text,
  status text,
  member_count integer,
  non_system_member_count integer,
  deusex_stewarded boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_deusex uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  -- Unknown filter refuses typed, naming no valid values: the namespace is
  -- open TEXT and consumers must not bake a sealed enum (PC020 §Vertical).
  if p_filter not in ('all', 'engagement', 'deusex_stewarded', 'suspended') then
    raise exception 'unknown filter' using errcode = '22023';
  end if;

  select g.id into v_deusex
    from public.groups g
   where g.name = 'DeusEx' and g.group_type = 'system';

  return query
  select g.id, g.name, g.group_type, g.status,
         (select count(*)::integer
            from public.group_memberships gm
           where gm.group_id = g.id and gm.status = 'active') as member_count,
         (select count(*)::integer
            from public.group_memberships gm
            join public.groups mg on mg.id = gm.member_group_id
           where gm.group_id = g.id and gm.status = 'active'
             and mg.group_type <> 'system') as non_system_member_count,
         exists (select 1
            from public.group_memberships gm
           where gm.group_id = g.id and gm.member_group_id = v_deusex
             and gm.status = 'active') as deusex_stewarded,
         g.created_at
    from public.groups g
   where g.group_type <> 'personal'
     and (p_filter <> 'engagement' or g.group_type = 'engagement')
     and (p_filter <> 'suspended' or g.status = 'suspended')
     and (p_filter <> 'deusex_stewarded'
          or (g.group_type = 'engagement'
              and exists (select 1
                    from public.group_memberships gm
                   where gm.group_id = g.id and gm.member_group_id = v_deusex
                     and gm.status = 'active')))
   order by g.name, g.id;
end;
$$;

comment on function public.admin_get_groups(text) is
  'FEAT-PC020 (ADM-8): cross-platform group enumeration, platform-admin-gated with a typed 42501 refusal. Filters all/engagement/deusex_stewarded/suspended over an open TEXT namespace (unknown -> 22023, naming none). deusex_stewarded derives from an active DeusEx system-group membership row, never name matching. Personal groups never appear. SECURITY DEFINER required: reads cross-group membership rows the caller''s RLS would hide.';

revoke all on function public.admin_get_groups(text) from public, anon;
grant execute on function public.admin_get_groups(text) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_get_group_detail — the row + the Gracy-honest count pair + human
-- steward display identities (the B-DISP oracle: the personal group's name)
-- + the caretaker flag. The caretaker never appears in stewards[]: the flag
-- carries it (walked to the FEAT-H035 banner).
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_group_detail(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_group public.groups%rowtype;
  v_deusex uuid;
  v_member_count integer;
  v_non_system_count integer;
  v_deusex_stewarded boolean;
  v_stewards jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;

  select * into v_group
    from public.groups g
   where g.id = p_group_id and g.group_type <> 'personal';
  if v_group.id is null then
    raise exception 'group not found' using errcode = 'P0002';
  end if;

  select g.id into v_deusex
    from public.groups g
   where g.name = 'DeusEx' and g.group_type = 'system';

  select count(*)::integer into v_member_count
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.status = 'active';

  select count(*)::integer into v_non_system_count
    from public.group_memberships gm
    join public.groups mg on mg.id = gm.member_group_id
   where gm.group_id = p_group_id and gm.status = 'active'
     and mg.group_type <> 'system';

  v_deusex_stewarded := exists (
    select 1 from public.group_memberships gm
     where gm.group_id = p_group_id and gm.member_group_id = v_deusex
       and gm.status = 'active');

  select coalesce(jsonb_agg(jsonb_build_object(
           'display_name', pg.name,
           'personal_group_id', pg.id
         ) order by pg.name), '[]'::jsonb)
    into v_stewards
    from public.user_group_roles ugr
    join public.group_roles gr on gr.id = ugr.group_role_id
    join public.group_memberships gm
      on gm.group_id = ugr.group_id
     and gm.member_group_id = ugr.member_group_id
     and gm.status = 'active'
    join public.groups pg on pg.id = ugr.member_group_id
   where ugr.group_id = p_group_id
     and pg.group_type <> 'system'
     and (gr.created_from_role_template_id =
            (select rt.id from public.role_templates rt
              where rt.name = 'Steward Role Template')
          or gr.name = 'Steward');

  return jsonb_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'description', v_group.description,
    'label', v_group.label,
    'group_type', v_group.group_type,
    'status', v_group.status,
    'is_public', v_group.is_public,
    'avatar_url', v_group.avatar_url,
    'member_count', v_member_count,
    'non_system_member_count', v_non_system_count,
    'deusex_stewarded', v_deusex_stewarded,
    'stewards', v_stewards,
    'created_at', v_group.created_at,
    'updated_at', v_group.updated_at
  );
end;
$$;

comment on function public.admin_get_group_detail(uuid) is
  'FEAT-PC020 (ADM-8): admin group detail — the row, the member_count/non_system_member_count pair (the caretaker is never load-bearing in copy, ADR-U041 §5), human stewards only (display identity = the personal group''s name, the B-DISP oracle; the caretaker is carried by deusex_stewarded), status timestamps via the row''s created_at/updated_at. Personal or unknown ids refuse P0002. SECURITY DEFINER required: admin-plane read across RLS.';

revoke all on function public.admin_get_group_detail(uuid) from public, anon;
grant execute on function public.admin_get_group_detail(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_suspend_group / admin_reactivate_group — the ADM-9 pair, the first
-- 'suspended' producers. active <-> suspended, engagement groups only; the
-- refusal matrix is typed (P0002 unknown / 22023 wrong-kind / P0001
-- wrong-state); FOR UPDATE on the target row (the AC3-14 lesson); every
-- mutation writes admin_audit_log pattern (a). What a suspended group
-- refuses is enforced by the existing status-aware reads — no cascade is
-- invented here (PC020 §Rabbit holes).
-- ---------------------------------------------------------------------------
create or replace function public.admin_suspend_group(p_group_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_group public.groups%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_group
    from public.groups g
   where g.id = p_group_id
     for update;
  if v_group.id is null then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if v_group.group_type <> 'engagement' then
    raise exception 'only engagement groups can be suspended' using errcode = '22023';
  end if;
  if v_group.status <> 'active' then
    raise exception 'cannot suspend a group that is not active';
  end if;

  update public.groups
     set status = 'suspended', updated_at = now()
   where public.groups.id = p_group_id;

  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'group.suspend', p_group_id::text,
          jsonb_build_object('group_name', v_group.name,
                             'previous_status', v_group.status));
end;
$$;

comment on function public.admin_suspend_group(uuid) is
  'FEAT-PC020 (ADM-9): the first producer of groups.status = ''suspended''. Platform-admin-gated (42501); engagement groups only (22023); active -> suspended only (P0001 wrong-state); FOR UPDATE on the target; audit pattern (a), action group.suspend. Reversible by design via admin_reactivate_group. SECURITY DEFINER required: admin-plane mutation across RLS.';

revoke all on function public.admin_suspend_group(uuid) from public, anon;
grant execute on function public.admin_suspend_group(uuid) to authenticated;

create or replace function public.admin_reactivate_group(p_group_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_group public.groups%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_group
    from public.groups g
   where g.id = p_group_id
     for update;
  if v_group.id is null then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if v_group.group_type <> 'engagement' then
    raise exception 'only engagement groups can be reactivated' using errcode = '22023';
  end if;
  if v_group.status <> 'suspended' then
    raise exception 'cannot reactivate a group that is not suspended';
  end if;

  update public.groups
     set status = 'active', updated_at = now()
   where public.groups.id = p_group_id;

  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'group.reactivate', p_group_id::text,
          jsonb_build_object('group_name', v_group.name));
end;
$$;

comment on function public.admin_reactivate_group(uuid) is
  'FEAT-PC020 (ADM-9): suspended -> active, the reverse half of the pair. Platform-admin-gated (42501); engagement only (22023); suspended-state only (P0001); FOR UPDATE; audit pattern (a), action group.reactivate. SECURITY DEFINER required: admin-plane mutation across RLS.';

revoke all on function public.admin_reactivate_group(uuid) from public, anon;
grant execute on function public.admin_reactivate_group(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_reassign_group_stewardship — the RW-05 EXIT from caretakership:
-- grant the group's Steward-template role to a named existing active human
-- member, then end the DeusEx caretaker membership. COMPOSES the PC-3 role
-- fabric walls: can_assign_role (the anti-escalation primitive
-- assign_member_role itself surfaces) with the TRUE actor; the fabric's
-- active-member predicate and its 22023 refusal; prevent_last_leader_removal
-- verifies the caretaker teardown (a human steward exists first, so the
-- last-Steward wall passes legitimately — never bypassed).
-- Build finding (cumulative-forward, recorded in FEAT-PC020 implementation
-- notes): assign_member_role cannot be composed WHOLE — its member-or-public
-- visibility predicate (PC011 20260704090434:503-506) refuses any non-member
-- caller before the permission walls, and the admin plane sits outside
-- member visibility by definition. The permission walls themselves pass for
-- a platform admin (verified live 2026-08-01: DeusEx role grants are a
-- strict superset of the Steward template, assign_roles included).
-- The member-invitation direction (a non-member target) is deliberately out:
-- that is an invite flow, not an admin override (PC020 §Solution).
-- ---------------------------------------------------------------------------
create or replace function public.admin_reassign_group_stewardship(
  p_group_id uuid,
  p_new_steward_group_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_group public.groups%rowtype;
  v_deusex uuid;
  v_steward_role_id uuid;
  v_target_status text;
  v_target_type text;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_group
    from public.groups g
   where g.id = p_group_id
     for update;
  if v_group.id is null then
    raise exception 'group not found' using errcode = 'P0002';
  end if;
  if v_group.group_type <> 'engagement' then
    raise exception 'stewardship reassignment applies to engagement groups only'
      using errcode = '22023';
  end if;

  -- DeusEx resolves by system-label, never a hardcoded id (seeding repair).
  select g.id into v_deusex
    from public.groups g
   where g.name = 'DeusEx' and g.group_type = 'system';
  if v_deusex is null then
    raise exception 'DeusEx system group missing — seeding repair required';
  end if;

  -- The canonical template-first-with-fallback Steward resolution (the
  -- name='Steward'-only path is a documented defect; both arms required).
  select gr.id into v_steward_role_id
    from public.group_roles gr
   where gr.group_id = p_group_id
     and (gr.created_from_role_template_id =
            (select rt.id from public.role_templates rt
              where rt.name = 'Steward Role Template')
          or gr.name = 'Steward')
   limit 1;
  if v_steward_role_id is null then
    raise exception 'no Steward role found for this group';
  end if;

  -- Caretakership precondition: the exit only applies to a group DeusEx
  -- actually stewards (active membership + the Steward role).
  if not exists (
       select 1 from public.group_memberships gm
        where gm.group_id = p_group_id and gm.member_group_id = v_deusex
          and gm.status = 'active')
     or not exists (
       select 1 from public.user_group_roles ugr
        where ugr.group_id = p_group_id and ugr.member_group_id = v_deusex
          and ugr.group_role_id = v_steward_role_id) then
    raise exception 'group is not in caretakership';
  end if;

  -- The fabric's active-member wall (assign_member_role's own predicate and
  -- refusal, PC011).
  select gm.status into v_target_status
    from public.group_memberships gm
   where gm.group_id = p_group_id and gm.member_group_id = p_new_steward_group_id;
  if v_target_status is distinct from 'active' then
    raise exception 'target is not an active member of the group' using errcode = '22023';
  end if;

  -- A named existing active member is a human: a personal group — never the
  -- caretaker itself nor a member group.
  select g.group_type into v_target_type
    from public.groups g
   where g.id = p_new_steward_group_id;
  if v_target_type is distinct from 'personal' then
    raise exception 'stewardship can only be reassigned to a human member'
      using errcode = '22023';
  end if;

  -- The anti-escalation wall, composed with the true actor: the admin cannot
  -- hand a role granting permissions they do not hold.
  if not coalesce(public.can_assign_role(v_actor, p_group_id, v_steward_role_id), false) then
    raise exception 'cannot assign a role granting permissions you do not hold'
      using errcode = '42501';
  end if;

  -- Grant Steward (the fabric's binding shape; a duplicate binding surfaces
  -- 23505 as in assign_member_role; notify_role_assigned writes the durable
  -- notification via the existing trigger — not duplicated here).
  insert into public.user_group_roles
    (member_group_id, group_id, group_role_id, assigned_by_group_id)
  values (p_new_steward_group_id, p_group_id, v_steward_role_id, v_actor);

  -- End the caretakership. A human steward now exists, so
  -- prevent_last_leader_removal verifies this delete and passes — the wall
  -- is composed, not bypassed. prevent_last_deusex_membership_removal only
  -- guards DeusEx's OWN member list (OLD.group_id = DeusEx), not caretaker
  -- rows in other groups.
  delete from public.user_group_roles ugr
   where ugr.group_id = p_group_id
     and ugr.member_group_id = v_deusex
     and ugr.group_role_id = v_steward_role_id;
  delete from public.group_memberships gm
   where gm.group_id = p_group_id
     and gm.member_group_id = v_deusex;

  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'group.reassign_stewardship', p_group_id::text,
          jsonb_build_object('new_steward_group_id', p_new_steward_group_id,
                             'caretaker_group_id', v_deusex));
end;
$$;

comment on function public.admin_reassign_group_stewardship(uuid, uuid) is
  'FEAT-PC020 (RW-05): the exit from caretakership — grants the group''s Steward-template role to a named existing active human member (personal-group id, matching the membership model) and ends the DeusEx caretaker membership. Composes the PC-3 walls: can_assign_role with the true actor (42501 on escalation), the active-member predicate (22023), prevent_last_leader_removal on the teardown. Transactional: any refusal rolls back whole. Audit pattern (a), action group.reassign_stewardship. SECURITY DEFINER required: admin-plane orchestration across RLS.';

revoke all on function public.admin_reassign_group_stewardship(uuid, uuid) from public, anon;
grant execute on function public.admin_reassign_group_stewardship(uuid, uuid) to authenticated;
