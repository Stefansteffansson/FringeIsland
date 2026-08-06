-- ============================================================================
-- RD-A / FEAT-PC027 — role provenance, central retirement, group-side removal
-- ============================================================================
-- Board: docs/planning/hub-v2/2026-08-05-role-distribution-design-note.md (CLOSED)
-- Spec:  docs/platform/core/features/FEAT-PC027-*.md
-- Pairs with: FEAT-H043 (Hub surface half)
--
-- Four contract areas over one schema gate:
--   1. group_roles.created_from_version_number — the provenance stamp, landed
--      at all three instantiation doors.
--   2. The honest-unknown backfill (RD-10) — unambiguous grant-set match or NULL.
--   3. role_templates.retired_at / retired_by — central retire as pure
--      offerability (RD-2/RD-4): it never reaches into a group.
--   4. Group-side removal of an adopted role — the contract refusal lifted,
--      with PC025's existing is_protected lockout guard bound to it (RD-5).
--
-- ---------------------------------------------------------------------------
-- CORRECTION TO THE DECOMPOSITION PREMISE (read before reviewing)
-- ---------------------------------------------------------------------------
-- The RD-A substrate dossier's Finding 3 claimed the group-side delete refusal
-- was THREE layers deep and listed an RLS rule first. That was verified false
-- at the build open and the specs were corrected (PR #447).
--
-- HYG-A dropped the `group_roles_delete` policy (20260803190000:4533) and
-- revoked insert/update/delete on public.group_roles from authenticated, anon
-- (:4545). The live catalogue carries exactly one policy on the table —
-- `group_roles_select` — and `authenticated` holds SELECT/REFERENCES/TRIGGER
-- only. The comment inside delete_group_role naming "the RLS delete rule" is a
-- TOMBSTONE: the same migration that wrote it is the migration that dropped the
-- policy, and it records where that rule WENT (into the contract), not that it
-- still stands.
--
-- Consequence: leg 3 is contract + surface. THIS MIGRATION ADDS NO RLS DELETE
-- POLICY AND NO DELETE GRANT, and none may be added. Re-opening the direct
-- PostgREST delete path would regress ADR-U038 — the SECURITY DEFINER contract
-- is deliberately the only door. A guard cell in
-- hub/tests/integration/groups/role-provenance-and-retirement.test.ts asserts
-- the policy set and the absent DELETE grant so a later "relax the RLS rule"
-- reading of the old spec fails loudly.
--
-- ---------------------------------------------------------------------------
-- SIBLING-ASSERTION SWEEP (platform CLAUDE.md: name what this invalidates)
-- ---------------------------------------------------------------------------
-- Grepped for assertions naming every object whose behaviour changes here.
-- Each is marked ADAPTED or LEFT.
--
--   ADAPTED — hub/tests/integration/groups/role-permission-contracts.test.ts:489
--     'deletes a custom unheld role; refuses while held (unbind first);
--      refuses template-derived regardless' — the third clause asserted 42501
--      on deleting a template-derived role. RD-A INVERTS it. Test renamed and
--      the clause rewritten to assert the delete now succeeds.
--
--   ADAPTED — hub/tests/unit/components/groups/RolesPanel.test.tsx:204
--     asserted queryByTestId('delete-role-button') is null for a
--     template-derived role. RD-A opens that affordance. Adapted in the H043
--     half of this cycle.
--
--   LEFT — hub/tests/integration/groups/role-permission-contracts.test.ts:543
--     a member WITHOUT manage_roles gets 42501 deleting a template-derived
--     role. Still correct and still 42501: the has_permission check precedes
--     the provenance check, so this cell never exercised the refusal RD-A
--     removes. Deliberately left as the anti-escalation pin.
--
--   LEFT — hub/tests/unit/components/groups/RolesPanel.test.tsx:92
--     asserts role-badge matches /template/i. The badge text becomes
--     'Template · v{N} · copied {date}', which still matches. Left; the exact
--     new string is pinned by H043's own copy-check cell.
--
--   LEFT — hub/tests/integration/groups/group-availability-enforcement.test.ts
--     uses delete_group_role and get_group_roles only through the availability
--     guard, which this migration does not touch (the guard still fires first;
--     pinned by S4d).
--
--   LEFT — hub/tests/integration/admin/role-template-editing.test.ts:322-333,
--     hub/tests/e2e/admin-roles.spec.ts:263-274 — assert instantiation reach
--     via created_from_role_template_id. Untouched: this migration adds a
--     column beside it and changes no instantiation SET.
--
--   LEFT — the 20+ suites resolving roles by created_from_role_template_id
--     (communication, journeys, lifecycle, group-of-groups, realtime E2E).
--     Additive column; no existing linkage changes.
--
--   LEFT — hub/tests/integration/groups/role-templates-contract.test.ts —
--     get_role_templates gains a `retired_at IS NULL` predicate. No seeded
--     system template is retired, so its assertions are unaffected.
--
-- Object-class / conformance notes:
--   - No first-of-its-kind object class (GC-8 does not fire): two columns on
--     PC-3-owned tables, re-issues of PC-3/PC-4-owned contracts.
--   - Two NEW functions (admin_retire_role_template, admin_unretire_role_template)
--     are registered PC-4 in supabase/ownership.manifest.json in this same
--     change — functionOwner() defaults to CORE and an unregistered function
--     fails two conformance suites.
--   - Re-issue discipline (COR-A): every re-issued function below keeps a
--     byte-identical signature so create-or-replace preserves its ACL.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema — one provenance column, two retirement columns.
-- ---------------------------------------------------------------------------
alter table public.group_roles
  add column if not exists created_from_version_number integer;

comment on column public.group_roles.created_from_version_number is
  'RD-A FEAT-PC027 STORY-1: the role_template_versions.version_number whose '
  'materialisation was live on role_templates/role_template_permissions at copy '
  'time (read via role_templates.default_version_id). Denormalised integer, not '
  'an FK: role_template_versions.role_template_id is ON DELETE CASCADE, so an '
  'FK-only stamp would evaporate — the exact dangle RD-4 exists to prevent. '
  'NULL means honestly unknown (a pre-stamp row whose grant set matched no '
  'version unambiguously, RD-10) or a custom role with no provenance at all. '
  'The copied-date needs no column: group_roles.created_at is already set by '
  'every door (dossier Finding 1).';

alter table public.role_templates
  add column if not exists retired_at timestamptz,
  add column if not exists retired_by uuid references public.groups(id);

comment on column public.role_templates.retired_at is
  'RD-A FEAT-PC027 STORY-3: when the catalogue stopped OFFERING this template. '
  'Offerability only — RD-2/RD-4: retiring never reaches into a group, never '
  'deletes, and leaves every existing copy, grant and version row untouched. '
  'NULL = offered. System templates cannot be retired (the four seeded roles '
  'are the floor every group is built on).';

comment on column public.role_templates.retired_by is
  'RD-A FEAT-PC027 STORY-3: the personal group id of the admin who retired it '
  '(the repo actor primitive, via get_current_personal_group_id() — never raw '
  'auth.uid()). Cleared on unretire alongside retired_at.';

-- ---------------------------------------------------------------------------
-- 2. The honest-unknown backfill (RD-10). One-shot, migration-time.
--
--    A pre-stamp row earns a version number only when its granted permission
--    set matches EXACTLY ONE version of its source template. Ties and
--    non-matches stay NULL and render "version unknown". Never a guess.
-- ---------------------------------------------------------------------------
with role_grants as (
  select gr.id,
         gr.created_from_role_template_id as template_id,
         coalesce((select array_agg(p.name order by p.name)
                     from public.group_role_permissions grp
                     join public.permissions p on p.id = grp.permission_id
                    where grp.group_role_id = gr.id and grp.granted),
                  array[]::text[]) as grants
    from public.group_roles gr
   where gr.created_from_role_template_id is not null
     and gr.created_from_version_number is null
),
version_grants as (
  select v.id, v.role_template_id, v.version_number,
         coalesce((select array_agg(p.name order by p.name)
                     from public.role_template_version_permissions vp
                     join public.permissions p on p.id = vp.permission_id
                    where vp.role_template_version_id = v.id),
                  array[]::text[]) as grants
    from public.role_template_versions v
),
matched as (
  select rg.id,
         min(vg.version_number) as version_number,
         count(*)               as match_count
    from role_grants rg
    join version_grants vg
      on vg.role_template_id = rg.template_id
     and vg.grants = rg.grants
   group by rg.id
)
update public.group_roles gr
   set created_from_version_number = m.version_number
  from matched m
 where gr.id = m.id
   and m.match_count = 1;  -- unambiguous only; ties stay NULL by construction

-- ---------------------------------------------------------------------------
-- 3. role_fabric_entry — re-issued in place (COR-A: signature byte-identical).
--    Serves the two keys FEAT-H043's provenance line renders. This is where
--    get_group_roles builds each role entry, so widening it widens the fabric.
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
    -- RD-A FEAT-PC027 STORY-1: provenance. The integer is nullable and the
    -- surface renders "version unknown" rather than inventing one.
    'created_from_version_number', gr.created_from_version_number,
    'created_at', gr.created_at,
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

-- ---------------------------------------------------------------------------
-- 4. Door 1 + Door 2 — create_engagement_group, re-issued in place.
--    One insert covers both doors (chosen template / template-less system-only,
--    WA-6 20260805150000). The stamp rides that insert.
--    Signature byte-identical to 20260805150000.
-- ---------------------------------------------------------------------------
create or replace function public.create_engagement_group(
  p_name text,
  p_description text default null::text,
  p_label text default null::text,
  p_is_public boolean default false,
  p_show_member_list boolean default true,
  p_group_template_id uuid default null::uuid
) returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_actor uuid;
  v_is_temporary boolean;
  v_is_active boolean;
  v_group_id uuid;
  v_steward_role_id uuid;
  v_participant_role_id uuid;
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
  -- the SYSTEM role templates only (WA-6, 2026-08-05: clones never ride
  -- template-less instantiation; a clone joins a group only through a pull
  -- door — a chosen template that registers it, or create_group_role from the
  -- template picker). Data-driven; the copy_template_permissions trigger
  -- copies each instance's permission grants.
  --
  -- RD-A FEAT-PC027 STORY-1: doors 1 and 2 both run through this one insert,
  -- so the provenance stamp lands here for both. The version read is the live
  -- default pointer — the version whose materialisation this copy actually
  -- takes (dossier Finding 2), not a snapshot join.
  insert into public.group_roles
    (group_id, name, description, created_from_role_template_id,
     created_from_version_number)
  select v_group_id, rt.name, rt.description, rt.id, dv.version_number
    from public.role_templates rt
    left join public.role_template_versions dv on dv.id = rt.default_version_id
   where (p_group_template_id is null and rt.is_system)
      or rt.id in (
        select gtr.role_template_id
          from public.group_template_roles gtr
         where gtr.group_template_id = p_group_template_id
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

  -- FEAT-PC010 Amendment (2026-07-04): also bind the participation role —
  -- permission-derived via 'enroll_self_in_journey' (the Member/Participant
  -- template's marker today). SOFT: skipped when the instantiated role set
  -- carries none (facilitation-only templates stay legitimate); removable
  -- afterwards like any binding.
  select gr.id into v_participant_role_id
    from public.group_roles gr
    join public.role_template_permissions rtp
      on rtp.role_template_id = gr.created_from_role_template_id
     and rtp.granted
    join public.permissions p on p.id = rtp.permission_id
   where gr.group_id = v_group_id
     and p.name = 'enroll_self_in_journey'
     and gr.id is distinct from v_steward_role_id
   limit 1;

  if v_participant_role_id is not null then
    insert into public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
    values (v_actor, v_group_id, v_participant_role_id, v_actor);
  end if;

  return v_group_id;
end;
$$;

comment on function public.create_engagement_group(text, text, text, boolean, boolean, uuid) is
  'FEAT-PC010 + WA-6 (20260805150000) + RD-A FEAT-PC027. Creates an engagement '
  'group and instantiates its role set: the chosen group template''s registered '
  'roles, or — template-less — the SYSTEM role templates only. RD-A: each '
  'instantiated row carries created_from_version_number, read from the live '
  'default_version_id (doors 1 and 2 share this one insert). Binds the creator '
  'to the management role (permission-derived via assign_roles) and, softly, '
  'the participation role (enroll_self_in_journey).';

-- ---------------------------------------------------------------------------
-- 5. Door 3 — create_group_role, re-issued in place. The pull door stamps the
--    copy it pulls; the custom path leaves both provenance columns NULL.
--    Signature byte-identical to 20260803190000.
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
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  perform public.assert_group_writable(p_group_id, v_actor);
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
    -- RD-A FEAT-PC027 STORY-1: door 3's stamp, same live-default read as
    -- doors 1 and 2.
    insert into public.group_roles
      (group_id, name, description, created_from_role_template_id,
       created_from_version_number)
    values (p_group_id, v_name, p_description, p_role_template_id,
            (select dv.version_number
               from public.role_templates rt
               join public.role_template_versions dv on dv.id = rt.default_version_id
              where rt.id = p_role_template_id))
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

  -- A custom role has no provenance to record: both columns stay NULL.
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

-- ---------------------------------------------------------------------------
-- 6. delete_group_role — re-issued in place. RD-A's third leg.
--
--    REMOVED: the template-derived refusal (that is the whole point).
--    KEPT UNCHANGED: the FIM gate, the account-suspended gate, the P0002
--      not-found resolution, the manage_roles check, PC023's availability
--      guard, and the held-by-members P0001 (Open Q3's never-cascade default,
--      dossier Finding 4).
--    ADDED: the self-lockout guard. PC025's permissions.is_protected already
--      marks exactly the set RD-5 names (assign_roles, manage_roles,
--      remove_roles, invite_members, remove_members, rest_group) — reused, not
--      re-invented (dossier Finding 5).
--
--    Signature byte-identical to 20260803190000.
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
  v_lost text;
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

  -- RD-A FEAT-PC027 STORY-4: the template-derived refusal that stood here is
  -- REMOVED. An adopted role is the group's own property and the group may put
  -- it down. Retiring the source template is a separate, central act that
  -- never reaches into a group (RD-2) — these two are not substitutes.

  -- Open Q3 default: refuse while held — unbinding is explicit, never cascade.
  -- Inherited from FEAT-PC011 unchanged.
  if exists (
    select 1 from public.user_group_roles ugr where ugr.group_role_id = p_group_role_id
  ) then
    raise exception 'role is held by members — remove the role from all holders first'
      using errcode = 'P0001';
  end if;

  -- RD-5 self-lockout guard: a group must not be brickable from inside.
  -- Reuses PC025's permissions.is_protected (20260804190000:133-143) — the
  -- same guard RB-4 points at the template editor, pointed here at the new verb.
  --
  -- ORDERING NOTE (a spec wording the substrate cannot honour as written).
  -- FEAT-PC027 STORY-4 phrases this as "would leave the group with no HOLDER
  -- of a protected permission". That test is unreachable here: the
  -- held-by-members refusal above fires first, so by the time control reaches
  -- this line the role provably has zero holders — deleting it removes no
  -- holder at all, and a holder-based check could never fire.
  --
  -- The reachable and meaningful guard is by DEFINER: if this role is the only
  -- role in the group that grants a protected permission, deleting it means no
  -- member can ever be given that permission again without admin intervention.
  -- That is the brick RD-5 exists to prevent, and it is exactly the state a
  -- Steward reaches by following the held-first instruction — strip the
  -- holders, then delete. Implemented by definer; the spec's wording is
  -- corrected to match rather than the guard being written to a test that
  -- cannot fire.
  select string_agg(p.name, ', ' order by p.name) into v_lost
    from public.permissions p
   where p.is_protected
     and exists (
       select 1 from public.group_role_permissions grp
        where grp.group_role_id = p_group_role_id
          and grp.permission_id = p.id
          and grp.granted)
     and not exists (
       select 1
         from public.group_roles gr2
         join public.group_role_permissions grp2 on grp2.group_role_id = gr2.id
        where gr2.group_id = v_role.group_id
          and gr2.id is distinct from p_group_role_id
          and grp2.permission_id = p.id
          and grp2.granted);

  if v_lost is not null then
    raise exception
      'removing this role would leave the group with no holder of: % — assign the permission elsewhere first',
      v_lost
      using errcode = 'P0001';
  end if;

  delete from public.group_roles where id = p_group_role_id;
end;
$$;

comment on function public.delete_group_role(uuid) is
  'FEAT-PC011 + PC023 + RD-A FEAT-PC027 STORY-4. Removes a group role. RD-A '
  'lifted the template-derived refusal: an adopted role is the group''s own '
  'property. Order of refusals: FIM gate, account-suspended gate, P0002 '
  'not-found, manage_roles, assert_group_writable, held-by-members (P0001, '
  'inherited unchanged — unbinding is explicit, never cascade), then the RD-5 '
  'self-lockout guard naming any protected permission that would lose its last '
  'holder. NOTE: public.group_roles carries no DELETE policy and no DELETE '
  'grant below service_role (HYG-A 20260803190000:4533,:4545) — this contract '
  'is the only door in, deliberately (ADR-U038).';

-- ---------------------------------------------------------------------------
-- 7. get_role_templates — re-issued in place. The member-facing offer stops
--    listing retired templates. SECURITY INVOKER is preserved: the
--    auth_read_role_templates policy remains the enforcement point; this is a
--    body predicate, not a security-mode change.
--    Signature byte-identical to 20260722190000.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_role_templates()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_list JSONB;
BEGIN
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object(
               'id',          t.id,
               'name',        t.name,
               'description', t.description
             )
             ORDER BY t.name
           ),
           '[]'::jsonb
         )
    INTO v_list
    FROM public.role_templates t
    -- RD-A FEAT-PC027 STORY-3: a retired template is no longer offered.
    -- Server-side, so every Surface inherits the filter by calling the
    -- contract — the Hub never excludes it client-side.
   WHERE t.retired_at IS NULL;

  RETURN v_list;
END;
$$;

COMMENT ON FUNCTION public.get_role_templates() IS
  'COR-B W4 / audit AC2-4 + RD-A FEAT-PC027 STORY-3: the foundational '
  'role-template catalogue as a platform contract, filtered to what is still '
  'OFFERED (retired_at IS NULL). SECURITY INVOKER — the '
  'auth_read_role_templates RLS policy stays the enforcement point.';

-- ---------------------------------------------------------------------------
-- 8. admin_get_role_templates — re-issued in place. The admin plane shows the
--    WHOLE catalogue including what it has stopped offering, marked.
--    Signature byte-identical to 20260804190000.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_role_templates()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_templates jsonb;
  v_catalog jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(t.doc ORDER BY t.is_system DESC, t.name), '[]'::jsonb)
    INTO v_templates
    FROM (
      SELECT rt.is_system, rt.name,
             jsonb_build_object(
               'id', rt.id,
               'name', rt.name,
               'description', rt.description,
               'is_system', rt.is_system,
               'default_version_number', dv.version_number,
               -- RD-A FEAT-PC027 STORY-3: every entry carries the key, retired
               -- or not — the admin render reads it unconditionally.
               'retired_at', rt.retired_at,
               'version_count',
                 (SELECT count(*) FROM public.role_template_versions v
                   WHERE v.role_template_id = rt.id),
               'group_template_refs',
                 COALESCE((SELECT jsonb_agg(gt.name ORDER BY gt.name)
                             FROM public.group_template_roles gtr
                             JOIN public.group_templates gt
                               ON gt.id = gtr.group_template_id
                            WHERE gtr.role_template_id = rt.id), '[]'::jsonb),
               'instantiated_role_count',
                 (SELECT count(*) FROM public.group_roles gr
                   WHERE gr.created_from_role_template_id = rt.id)
             ) AS doc
        FROM public.role_templates rt
        LEFT JOIN public.role_template_versions dv ON dv.id = rt.default_version_id
    ) t;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'name', p.name,
             'category', p.category,
             'description', p.description,
             'is_protected', p.is_protected)
           ORDER BY p.category, p.name), '[]'::jsonb)
    INTO v_catalog
    FROM public.permissions p;

  RETURN jsonb_build_object(
    'templates', v_templates,
    'catalog', v_catalog,
    'generated_at', now());
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. The retire ceremony — two NEW functions (registered PC-4 in the manifest).
--
--    Retire flips offerability and NOTHING else. It writes exactly two columns
--    on one role_templates row plus one audit row. It touches no group_roles,
--    no group_role_permissions, no version row — RD-2 and RD-4 both forbid it,
--    and the moment retire mutates a group the whole "offer, never write"
--    model collapses.
-- ---------------------------------------------------------------------------
create or replace function public.admin_retire_role_template(
  p_role_template_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_template public.role_templates%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_template
    from public.role_templates rt where rt.id = p_role_template_id;
  if v_template.id is null then
    raise exception 'role template not found' using errcode = 'P0002';
  end if;

  -- The four seeded roles are the floor every group is built on.
  if v_template.is_system then
    insert into public.admin_audit_log (actor_group_id, action, target, metadata)
    values (v_actor, 'role_template.retire_refused', p_role_template_id::text,
            jsonb_build_object('reason', 'system template',
                               'template_name', v_template.name));
    raise exception 'a system role template cannot be retired' using errcode = '42501';
  end if;

  if v_template.retired_at is not null then
    return jsonb_build_object('id', v_template.id,
                              'retired_at', v_template.retired_at,
                              'already_retired', true);
  end if;

  update public.role_templates
     set retired_at = now(), retired_by = v_actor
   where id = p_role_template_id;

  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'role_template.retire', p_role_template_id::text,
          jsonb_build_object('template_name', v_template.name,
                             'instantiated_role_count',
                               (select count(*) from public.group_roles gr
                                 where gr.created_from_role_template_id = p_role_template_id)));

  return (select jsonb_build_object('id', rt.id, 'retired_at', rt.retired_at,
                                    'already_retired', false)
            from public.role_templates rt where rt.id = p_role_template_id);
end;
$$;

comment on function public.admin_retire_role_template(uuid) is
  'RD-A FEAT-PC027 STORY-3: stop OFFERING a role template. Sets retired_at + '
  'retired_by and writes one audit row. Touches no group_roles, '
  'group_role_permissions or version row — retire never reaches into a group '
  '(RD-2) and never deletes (RD-4); every adopted copy keeps its source and '
  'version. System templates are refused (the seeded floor). Idempotent. '
  'Notifications are deliberately silent here — the retired notice kind is '
  'RD-B''s scope.';

create or replace function public.admin_unretire_role_template(
  p_role_template_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_template public.role_templates%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_template
    from public.role_templates rt where rt.id = p_role_template_id;
  if v_template.id is null then
    raise exception 'role template not found' using errcode = 'P0002';
  end if;

  if v_template.retired_at is null then
    return jsonb_build_object('id', v_template.id, 'retired_at', null,
                              'already_offered', true);
  end if;

  update public.role_templates
     set retired_at = null, retired_by = null
   where id = p_role_template_id;

  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'role_template.unretire', p_role_template_id::text,
          jsonb_build_object('template_name', v_template.name));

  return jsonb_build_object('id', v_template.id, 'retired_at', null,
                            'already_offered', false);
end;
$$;

comment on function public.admin_unretire_role_template(uuid) is
  'RD-A FEAT-PC027 STORY-3: the same door in reverse — clears retired_at and '
  'retired_by so the template is offered again. Idempotent. Audited.';

revoke all on function public.admin_retire_role_template(uuid) from public, anon;
revoke all on function public.admin_unretire_role_template(uuid) from public, anon;
grant execute on function public.admin_retire_role_template(uuid) to authenticated, service_role;
grant execute on function public.admin_unretire_role_template(uuid) to authenticated, service_role;
