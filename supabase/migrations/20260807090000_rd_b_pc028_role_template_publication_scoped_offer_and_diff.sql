-- ============================================================================
-- RD-B / FEAT-PC028 — role-template publication, scoped offer, diff-on-copy
-- ============================================================================
-- Board: docs/planning/hub-v2/2026-08-05-role-distribution-design-note.md (CLOSED)
-- Dossier: docs/planning/hub-v2/2026-08-06-rd-b-substrate-dossier.md
--          (7 findings; decomposition board RDB-1..RDB-7 settled all-as-recommended)
-- Spec:  docs/platform/core/features/FEAT-PC028-*.md
-- Pairs with: FEAT-H044 (Hub surface half)
-- Builds on: FEAT-PC027 / RD-A (20260806170000) — the provenance stamp and
--            central retirement this migration distributes against.
--
-- RD-A made divergence LEGIBLE. RD-B gives it somewhere to go.
--
-- Seven contract areas over one schema gate:
--   1. role_template_publications — scope as data (RD-8), nullable group_id.
--   2. admin publish / unpublish — idempotent (RDB-5), rows survive retirement (RDB-6).
--   3. get_available_role_templates(p_group_id) — the scoped offer read (RDB-1).
--   4. THE WRITE-DOOR FIX — create_group_role now enforces offerability.
--   5. get_role_copy_diff + apply_role_template_update — the ceremony (RD-3).
--   6. Three passive kinds in a new 'roles' category (RD-7, RDB-3).
--   7. The defensive retirement predicate on create_engagement_group (RDB-4).
--
-- ---------------------------------------------------------------------------
-- THE PREMISE WAS DRIVEN BEFORE THIS FILE EXISTED (read before reviewing)
-- ---------------------------------------------------------------------------
-- RD-A shipped two decomposition premises that verification later overturned,
-- both caught at build rather than at spec time. The generalised lesson:
--
--   A comment naming a mechanism proves the mechanism was once there;
--   the catalogue is the authority for whether it is there now.
--
-- Area 4 rests on the claim that create_group_role refuses neither a retired
-- nor an unoffered template. That claim was checked three ways, in order of
-- increasing authority, BEFORE any SQL was written:
--   (a) source — 20260806170000:404-408 validates existence and nothing else;
--   (b) live catalogue — pg_get_functiondef shows no retired_at reference in
--       create_group_role or create_engagement_group, while get_role_templates
--       and admin_retire_role_template both carry one;
--   (c) DRIVEN (commit ab2cc7b) — a Steward adopted a RETIRED template
--       end-to-end: the call succeeded, the copy was created, its grants
--       materialised, and the row was asserted at the row level with its
--       source provably retired. Nothing else in the substrate refused.
--
-- (c) is the one that mattered. Absence of a predicate from a function body
-- is not proof of reachability — a trigger or a grant could still have
-- refused. It could not, and does not.
--
-- ---------------------------------------------------------------------------
-- SIBLING-ASSERTION SWEEP (platform CLAUDE.md: name what this invalidates)
-- ---------------------------------------------------------------------------
-- Two shipped semantics change here, so the sweep covers BOTH the objects
-- whose behaviour moves and the callers of the contract being DROPPED.
-- Each is marked ADAPTED or LEFT.
--
--   A. get_role_templates() is DROPPED (RDB-1 — a signature change cannot be
--      a COR-A re-issue, and an overload would let a caller that omits the
--      argument silently receive the unscoped catalogue).
--
--   ADAPTED — hub/lib/groups/queries.ts:239-244 — the single BFF wrapper.
--     Moved to get_available_role_templates(p_group_id).
--   ADAPTED — hub/tests/integration/groups/role-templates-contract.test.ts —
--     an entire suite dedicated to the zero-arg contract (COR-B W4). Rewritten
--     against the scoped read; its anon-refusal and shape cells carry over.
--   ADAPTED — hub/tests/integration/groups/role-provenance-and-retirement.test.ts
--     :474, :512 — RD-A's S3b/S3f offer-filter cells. Repointed.
--   ADAPTED — hub/tests/integration/admin/role-template-editing.test.ts:339 —
--     the member-read cell. Repointed.
--   LEFT — hub/lib/admin/roles.ts, hub/app/api/admin/roles/route.ts — these
--     call admin_get_role_templates (the admin plane), a different contract
--     which this migration does not touch.
--
--   B. create_group_role now REFUSES retired and unoffered templates.
--
--   ADAPTED — hub/tests/integration/groups/role-provenance-and-retirement.test.ts
--     — RD-A adopts its clone fixture without publishing it. Every such
--     adoption now needs a publication row. Adapted at the fixture, not by
--     weakening any assertion.
--   ADAPTED — hub/tests/integration/groups/role-permission-contracts.test.ts
--     — same shape, same fix.
--   ADAPTED — hub/tests/integration/admin/role-template-editing.test.ts
--     — same shape, same fix.
--   LEFT — the 20+ suites resolving roles by created_from_role_template_id.
--     They read provenance; they do not adopt. No linkage changes.
--   LEFT — every suite adopting a SYSTEM template. System templates are
--     exempt from distribution, so the floor every group is built on is
--     unaffected. This is also why no live group breaks: the gate is at
--     ADOPTION time only, and existing copies are never re-checked.
--
-- ---------------------------------------------------------------------------
-- Object-class / conformance notes
-- ---------------------------------------------------------------------------
--   - role_template_publications is NOT a new object class: a PC-3 table with
--     FKs to role_templates and groups is exactly group_template_roles'
--     shape (20260222000000:169). Registered PC-3, memberData:false.
--   - The NULLABLE scope column forces a uniqueness question the constraint
--     syntax does not answer for free: in a plain UNIQUE, NULLs are DISTINCT,
--     so the same template could be published platform-wide twice. Two
--     mechanisms exist — UNIQUE NULLS NOT DISTINCT (PG15+), which has ZERO
--     precedent in this repo, and a partial unique index, which has three
--     (uq_journey_enrollments_active_party, uq_step_instance_open,
--     uq_journeys_single_onboarding_designation). The precedented one is used.
--   - THE GATE THAT MATTERS: notification_kinds and notification_categories
--     are owned by DS-5, not by the notifications vertical — relabelled at
--     COR-C W4 (Audit III ruling R-4) precisely so dsTables() covers them.
--     The manifest note records a PINNED VERTICAL-SET TEST in
--     ownership-manifest-conformance.test.ts. Seeding a category and three
--     kinds is a migration-level seed into DS-5 reference data (the N-A/N-B/
--     N-E precedent), not a function-body crossing. CHECKED, and the first
--     reading was WRONG: the pinned test asserts the set of tables owned by
--     vertical:*, which is exactly ['notifications']. RD-B adds no
--     vertical-owned table -- role_template_publications is PC-3, and the
--     category and kinds are ROWS IN DS-5-owned tables, not new tables. So
--     NO expected-set update is owed. The suite carries no exact-set
--     assertion over categories or kinds either
--     (preference-and-dispatcher-contracts.test.ts:722 asserts >= 6, which
--     survives a seventh). DS-5 ownership still gates a FUNCTION BODY
--     reaching into those tables; a migration seed is not that.
--   - Notice emission is explicitly blessed: public.notifications is
--     vertical:notifications-owned and its manifest note states writes to it
--     are "obligation-fulfilment, NEVER a boundary crossing" (ADR-U047 r5).
--   - Five NEW functions are registered PC-3/PC-4 in ownership.manifest.json
--     in this same change — functionOwner() defaults to CORE and an
--     unregistered function fails two conformance suites.
--   - Re-issue discipline (COR-A): create_group_role, create_engagement_group,
--     admin_retire_role_template and admin_set_role_template_default_version
--     keep byte-identical signatures so create-or-replace preserves their ACL.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema — publication reach as data (RD-8).
-- ---------------------------------------------------------------------------
create table if not exists public.role_template_publications (
  id                uuid primary key default gen_random_uuid(),
  role_template_id  uuid not null references public.role_templates(id) on delete cascade,
  group_id          uuid references public.groups(id) on delete cascade,
  published_at      timestamptz not null default now(),
  published_by      uuid references public.groups(id) on delete set null,
  unique (role_template_id, group_id)
);

comment on table public.role_template_publications is
  'RD-B FEAT-PC028 (RD-8): where a role template is OFFERABLE. One row per '
  'reach. group_id NULL means platform-wide, so "all groups" is data rather '
  'than a special code path. Publishing never writes into a group (RD-2) — '
  'adoption stays the Steward''s act in the roles panel. Rows SURVIVE '
  'retirement (RDB-6) so an unretire restores the reach that existed before '
  'rather than silently publishing to nobody; the retirement filter lives at '
  'the read, not in a delete.';

comment on column public.role_template_publications.group_id is
  'RD-B FEAT-PC028: NULL = platform-wide. Nullable BY DESIGN — see the '
  'partial unique index below, which is what actually prevents a second '
  'platform-wide row (a plain UNIQUE treats NULLs as distinct).';

-- The targeted-row constraint is the table UNIQUE above. The platform-wide
-- row needs a partial unique index because NULLs are DISTINCT in a UNIQUE
-- constraint — without this, publishing platform-wide twice writes two rows.
create unique index if not exists uq_role_template_publications_platform_wide
  on public.role_template_publications (role_template_id)
  where group_id is null;

-- FK indexes (the 20260704075549 discipline): the scoped read filters on
-- group_id, the notice fan-out on role_template_id.
create index if not exists idx_role_template_publications_group_id
  on public.role_template_publications (group_id);
create index if not exists idx_role_template_publications_role_template_id
  on public.role_template_publications (role_template_id);

alter table public.role_template_publications enable row level security;

-- A member may see the platform-wide reach and the reach of groups they are
-- actually in. Deliberately narrow: the row set names group ids, so a
-- USING(true) policy would enumerate every group a template reaches to every
-- authenticated caller. Every scoped READ goes through the SECURITY DEFINER
-- contract below, so this policy is defence in depth, not the mechanism.
create policy "role_template_publications_select"
  on public.role_template_publications for select to authenticated
  using (
    group_id is null
    or exists (
      select 1 from public.group_memberships gm
       where gm.group_id = role_template_publications.group_id
         and gm.member_group_id = public.get_current_personal_group_id()
         and gm.status = 'active'
    )
  );

-- ADR-U038: the SECURITY DEFINER contracts are the ONLY write door. No
-- INSERT/UPDATE/DELETE policy and no write grant below service_role.
revoke insert, update, delete on public.role_template_publications
  from authenticated, anon;
grant select on public.role_template_publications to authenticated;


-- ---------------------------------------------------------------------------
-- 2. Publish / unpublish — idempotent, audit-logged, retired-refusing.
-- ---------------------------------------------------------------------------
create or replace function public.admin_publish_role_template(
  p_role_template_id uuid,
  p_group_ids uuid[] default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_template public.role_templates%rowtype;
  v_existing integer;
  v_created integer := 0;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_template from public.role_templates rt where rt.id = p_role_template_id;
  if v_template.id is null then
    raise exception 'role template not found' using errcode = 'P0002';
  end if;

  -- The catalogue cannot begin offering what it has stopped offering.
  if v_template.retired_at is not null then
    insert into public.admin_audit_log (actor_group_id, action, target, metadata)
    values (v_actor, 'role_template.publish_refused', p_role_template_id::text,
            jsonb_build_object('reason', 'retired', 'template_name', v_template.name));
    raise exception 'a retired role template cannot be published'
      using errcode = '42501';
  end if;

  -- An EMPTY array is a caller mistake, never a request to publish to
  -- everyone. NULL (argument omitted) is the platform-wide request.
  if p_group_ids is not null and cardinality(p_group_ids) = 0 then
    raise exception 'name at least one group, or omit the argument for platform-wide'
      using errcode = '22023';
  end if;

  if p_group_ids is null then
    select count(*)::int into v_existing
      from public.role_template_publications pub
     where pub.role_template_id = p_role_template_id and pub.group_id is null;

    if v_existing = 0 then
      insert into public.role_template_publications
        (role_template_id, group_id, published_by)
      values (p_role_template_id, null, v_actor);
      v_created := 1;
    end if;
  else
    -- ON CONFLICT DO NOTHING preserves the ORIGINAL published_at of a reach
    -- that already exists — re-publishing must not silently reset history.
    with ins as (
      insert into public.role_template_publications
        (role_template_id, group_id, published_by)
      select p_role_template_id, g.id, v_actor
        from public.groups g
       where g.id = any(p_group_ids)
      on conflict (role_template_id, group_id) do nothing
      returning 1
    )
    select count(*)::int into v_created from ins;
  end if;

  -- RD-B FEAT-PC028 STORY-6: tell the manage_roles holders of the groups the
  -- reach actually gained. RDB-2 — the permission that gates the act the
  -- notice is about (create_group_role), not assign_roles.
  insert into public.notifications
    (recipient_group_id, type, title, body, payload, group_id)
  select distinct gm.member_group_id,
         'role_template_published',
         'New role available',
         'The role "' || v_template.name || '" is now available to copy into '
           || 'your group.',
         jsonb_build_object('role_template_id', p_role_template_id,
                            'template_name', v_template.name,
                            'group_id', g.id),
         g.id
    from public.groups g
    join public.group_memberships gm
      on gm.group_id = g.id and gm.status = 'active'
   where g.status = 'active'
     and g.group_type = 'engagement'
     and (p_group_ids is null or g.id = any(p_group_ids))
     and public.has_permission(gm.member_group_id, g.id, 'manage_roles');

  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'role_template.publish', p_role_template_id::text,
          jsonb_build_object('template_name', v_template.name,
                             'platform_wide', (p_group_ids is null),
                             'group_count', coalesce(cardinality(p_group_ids), 0),
                             'rows_created', v_created));

  return jsonb_build_object(
    'id', p_role_template_id,
    'platform_wide', (p_group_ids is null),
    'rows_created', v_created,
    -- RDB-5: re-publishing an existing reach is a no-op that SAYS SO, rather
    -- than raising. Matches admin_retire_role_template's already_retired.
    'already_published', (v_created = 0));
end;
$$;

comment on function public.admin_publish_role_template(uuid, uuid[]) is
  'RD-B FEAT-PC028 STORY-1 (RD-2/RD-8/RDB-5): publish OFFERS, it never '
  'writes into a group. NULL p_group_ids = platform-wide (one row with a '
  'NULL group_id); a non-empty array names targets; an EMPTY array is 22023, '
  'never read as platform-wide. Idempotent — already_published:true rather '
  'than a unique violation, and an existing reach keeps its original '
  'published_at. Refuses a retired template. Notifies manage_roles holders.';

create or replace function public.admin_unpublish_role_template(
  p_role_template_id uuid,
  p_group_ids uuid[] default null
) returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_template public.role_templates%rowtype;
  v_removed integer := 0;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_template from public.role_templates rt where rt.id = p_role_template_id;
  if v_template.id is null then
    raise exception 'role template not found' using errcode = 'P0002';
  end if;

  if p_group_ids is not null and cardinality(p_group_ids) = 0 then
    raise exception 'name at least one group, or omit the argument for platform-wide'
      using errcode = '22023';
  end if;

  -- RD-2, in the withdrawing direction: this removes an OFFER. It never
  -- touches a group_roles row, so every copy already adopted keeps working.
  with del as (
    delete from public.role_template_publications pub
     where pub.role_template_id = p_role_template_id
       and ((p_group_ids is null and pub.group_id is null)
         or (p_group_ids is not null and pub.group_id = any(p_group_ids)))
    returning 1
  )
  select count(*)::int into v_removed from del;

  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_actor, 'role_template.unpublish', p_role_template_id::text,
          jsonb_build_object('template_name', v_template.name,
                             'platform_wide', (p_group_ids is null),
                             'rows_removed', v_removed));

  return jsonb_build_object('id', p_role_template_id, 'rows_removed', v_removed,
                            'already_unpublished', (v_removed = 0));
end;
$$;

comment on function public.admin_unpublish_role_template(uuid, uuid[]) is
  'RD-B FEAT-PC028 STORY-1: withdraws an offer. Never reaches into a group — '
  'copies already adopted keep working (RD-2). Idempotent.';

-- ---------------------------------------------------------------------------
-- 3. The scoped offer read (RDB-1) — a NEW contract, not a re-issue.
-- ---------------------------------------------------------------------------
-- COR-A's discipline is that a re-issued function keeps a byte-identical
-- signature so create-or-replace preserves its ACL. Adding p_group_id makes
-- a different function, so the zero-arg get_role_templates() is DROPPED
-- below rather than shadowed: one live door onto offerability, not two. An
-- overload would let a caller that omits the argument silently receive the
-- unscoped catalogue — the same footgun area 4 exists to close.
create or replace function public.get_available_role_templates(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_list jsonb;
begin
  v_actor := public.get_current_personal_group_id();
  if v_actor is null then
    raise exception 'not permitted to read available roles' using errcode = '42501';
  end if;
  if not coalesce(public.has_permission(v_actor, p_group_id, 'manage_roles'), false) then
    raise exception 'not permitted to manage roles' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(entry order by entry->>'name'), '[]'::jsonb)
    into v_list
    from (
      select jsonb_build_object(
               'id', rt.id,
               'name', rt.name,
               'description', rt.description,
               -- The three adoption keys FEAT-H044's payload walk added, so
               -- the surface renders not-adopted / current / behind from ONE
               -- read instead of a per-entry second call.
               'adopted_group_role_id', gr.id,
               'adopted_version_number', gr.created_from_version_number,
               'current_version_number', dv.version_number
             ) as entry
        from public.role_templates rt
        left join public.role_template_versions dv on dv.id = rt.default_version_id
        left join lateral (
          select gr2.id, gr2.created_from_version_number
            from public.group_roles gr2
           where gr2.group_id = p_group_id
             and gr2.created_from_role_template_id = rt.id
           order by gr2.created_at
           limit 1
        ) gr on true
       -- Retirement and scope are INDEPENDENT filters; both must pass.
       where rt.retired_at is null
         and (
           -- System templates are the floor every group is built on and are
           -- never subject to distribution.
           rt.is_system
           or exists (
             select 1 from public.role_template_publications pub
              where pub.role_template_id = rt.id
                and (pub.group_id is null or pub.group_id = p_group_id)
           )
         )
    ) s;

  return v_list;
end;
$$;

comment on function public.get_available_role_templates(uuid) is
  'RD-B FEAT-PC028 STORY-2 (RDB-1): what is offered TO THIS GROUP. Scope- '
  'and retirement-filtered server-side, so every Surface inherits both by '
  'calling the contract. Carries adoption state (adopted_group_role_id, '
  'adopted_version_number, current_version_number) so the three-state render '
  'costs one read. Replaces the zero-arg get_role_templates(), which is '
  'dropped in this migration — a signature change cannot be a COR-A '
  're-issue, and an overload would serve the unscoped catalogue to any '
  'caller that omitted the argument.';

-- The drop. Its single BFF wrapper (hub/lib/groups/queries.ts:239-244) moves
-- to the scoped read in this same change.
drop function if exists public.get_role_templates();


-- ---------------------------------------------------------------------------
-- 4. THE WRITE-DOOR FIX — create_group_role enforces offerability.
--    Re-issued with a BYTE-IDENTICAL signature (COR-A; ACL preserved).
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

    -- RD-B FEAT-PC028 STORY-3: the write door learns what the picker read
    -- already knew. RD-A filtered get_role_templates and left this branch
    -- validating EXISTENCE only, so a retired clone stayed adoptable by id
    -- straight over PostgREST. Driven, not assumed: the premise probe
    -- (commit ab2cc7b) adopted a retired template end-to-end before a line
    -- of this migration existed. Under ADR-U038 this RPC IS the API, so the
    -- Hub's picker hiding a template was never an access control.
    --
    -- Ordering is load-bearing and unchanged above: the manage_roles check
    -- and assert_group_writable both fire BEFORE this, so a member without
    -- permission never learns whether a template is offered.
    if exists (
      select 1 from public.role_templates rt
       where rt.id = p_role_template_id and rt.retired_at is not null
    ) then
      raise exception 'role template is retired and can no longer be adopted'
        using errcode = 'P0001';
    end if;

    -- System templates are the floor every group is built on and are never
    -- subject to distribution (the exemption admin_retire_role_template
    -- already makes for retirement). Everything else needs a reach row:
    -- NULL group_id = platform-wide, a named group_id = this group (RD-8).
    if not exists (
      select 1 from public.role_templates rt
       where rt.id = p_role_template_id and rt.is_system
    ) and not exists (
      select 1 from public.role_template_publications pub
       where pub.role_template_id = p_role_template_id
         and (pub.group_id is null or pub.group_id = p_group_id)
    ) then
      raise exception 'role template is not offered to this group'
        using errcode = 'P0001';
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
-- 7. The defensive creation-time guard (RDB-4). Re-issued, signature intact.
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
   -- RD-B FEAT-PC028 STORY-7 (RDB-4): defensive depth. Neither branch
   -- filtered retirement before this migration (verified against the live
   -- catalogue 2026-08-06), and the hole is UNREACHABLE today: the
   -- template-less branch selects only rt.is_system, which
   -- admin_retire_role_template refuses to retire, and the template-chosen
   -- branch selects through group_template_roles, which registers only the
   -- four system templates. It goes live the moment anything registers a
   -- clone in that junction.
   --
   -- RD-9 is honoured here in intent, not in its stated mechanism: the board
   -- row rules that "only platform-wide publications appear in the
   -- group-creation template chooser", but NO publication row reaches this
   -- path at all -- publications are role_template <-> group, while this
   -- reads group_template_roles, which is group_template <-> role_template.
   -- The rule guards a door that does not exist. The predicate ships anyway,
   -- on the precedent of RD-A's rarely-reached is_protected guard.
   where rt.retired_at is null
     and ((p_group_template_id is null and rt.is_system)
      or rt.id in (
        select gtr.role_template_id
          from public.group_template_roles gtr
         where gtr.group_template_id = p_group_template_id
      ));

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

-- ---------------------------------------------------------------------------
-- 5. The diff-on-copy ceremony (RD-3) — read, then apply.
-- ---------------------------------------------------------------------------
-- THE REFERENCE POINT IS THE WHOLE OF RD-3, so it is stated before the code:
-- the diff is computed against the group role's CURRENT grant set, never
-- against the version it was copied from. A version-vs-version diff renders
-- the TEMPLATE's changelog and hides the STEWARD's divergence — a permission
-- the Steward deliberately revoked would appear nowhere in the ceremony and
-- be silently re-granted on apply. That is escalation by merge wearing a
-- diff's clothes, and it is exactly what the board forbade.
create or replace function public.get_role_copy_diff(p_group_role_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_role public.group_roles%rowtype;
  v_template_id uuid;
  v_to_version integer;
begin
  v_actor := public.get_current_personal_group_id();
  select * into v_role from public.group_roles gr where gr.id = p_group_role_id;
  if v_role.id is null then
    raise exception 'role not found' using errcode = 'P0002';
  end if;
  if not coalesce(public.has_permission(v_actor, v_role.group_id, 'manage_roles'), false) then
    raise exception 'not permitted to manage roles' using errcode = '42501';
  end if;

  v_template_id := v_role.created_from_role_template_id;
  if v_template_id is null then
    raise exception 'this role has no source template to compare against'
      using errcode = 'P0002';
  end if;

  select dv.version_number into v_to_version
    from public.role_templates rt
    join public.role_template_versions dv on dv.id = rt.default_version_id
   where rt.id = v_template_id;

  return jsonb_build_object(
    -- In the template, not in the group's CURRENT set. A permission the
    -- Steward revoked lands here, which is the point.
    'added', coalesce((
      select jsonb_agg(p.name order by p.name)
        from public.role_template_permissions rtp
        join public.permissions p on p.id = rtp.permission_id
       where rtp.role_template_id = v_template_id and rtp.granted
         and not exists (
           select 1 from public.group_role_permissions grp
            where grp.group_role_id = p_group_role_id
              and grp.permission_id = rtp.permission_id and grp.granted)
    ), '[]'::jsonb),
    -- In the group's current set, not in the template. A permission the
    -- Steward added locally lands here: applying would take it away.
    'removed', coalesce((
      select jsonb_agg(p.name order by p.name)
        from public.group_role_permissions grp
        join public.permissions p on p.id = grp.permission_id
       where grp.group_role_id = p_group_role_id and grp.granted
         and not exists (
           select 1 from public.role_template_permissions rtp
            where rtp.role_template_id = v_template_id
              and rtp.permission_id = grp.permission_id and rtp.granted)
    ), '[]'::jsonb),
    'unchanged', coalesce((
      select jsonb_agg(p.name order by p.name)
        from public.group_role_permissions grp
        join public.permissions p on p.id = grp.permission_id
       where grp.group_role_id = p_group_role_id and grp.granted
         and exists (
           select 1 from public.role_template_permissions rtp
            where rtp.role_template_id = v_template_id
              and rtp.permission_id = grp.permission_id and rtp.granted)
    ), '[]'::jsonb),
    -- NULL from_version is RD-10's honest unknown. It blocks the LABEL,
    -- never the comparison — the sets above are computed from grants.
    'from_version', v_role.created_from_version_number,
    'to_version', v_to_version);
end;
$$;

comment on function public.get_role_copy_diff(uuid) is
  'RD-B FEAT-PC028 STORY-4 (RD-3): current-vs-incoming, computed against the '
  'group role''s CURRENT grants — never version-vs-version, which would '
  'render the template''s changelog and hide the Steward''s own divergence. '
  'A retired source still diffs (the group is entitled to know where it '
  'stands); whether it may APPLY is STORY-5. P0002 on a custom role.';

create or replace function public.apply_role_template_update(p_group_role_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_role public.group_roles%rowtype;
  v_template public.role_templates%rowtype;
  v_to_version integer;
  v_lost text;
begin
  v_actor := public.get_current_personal_group_id();
  select * into v_role from public.group_roles gr where gr.id = p_group_role_id;
  if v_role.id is null then
    raise exception 'role not found' using errcode = 'P0002';
  end if;
  if not coalesce(public.has_permission(v_actor, v_role.group_id, 'manage_roles'), false) then
    raise exception 'not permitted to manage roles' using errcode = '42501';
  end if;
  -- FEAT-PC023's availability guard, called unchanged and FIRST among the
  -- state-dependent refusals.
  perform public.assert_group_writable(v_role.group_id, v_actor);

  if v_role.created_from_role_template_id is null then
    raise exception 'this role has no source template to copy from'
      using errcode = 'P0002';
  end if;

  select * into v_template from public.role_templates rt
   where rt.id = v_role.created_from_role_template_id;

  -- RD-2, in the pushing direction: a retired template never sends a new
  -- version into a group. The copy is untouched and the Steward keeps what
  -- they have.
  if v_template.retired_at is not null then
    raise exception 'the source template is retired and can no longer be copied'
      using errcode = 'P0001';
  end if;

  -- RD-5's lockout guard, reused at the door where a VERSION UPDATE can now
  -- brick a group: if applying would drop a protected permission that no
  -- OTHER role in this group defines, the group could not grant it again
  -- without admin intervention. RD-A's reachability caveat holds here too —
  -- in a default group the Steward instance is the sole definer and can
  -- never be made unheld, so this fires where some OTHER role is the last
  -- definer. Defensive depth, correctly placed and rarely reached.
  select p.name into v_lost
    from public.group_role_permissions grp
    join public.permissions p on p.id = grp.permission_id
   where grp.group_role_id = p_group_role_id and grp.granted
     and p.is_protected
     -- dropped by the incoming version...
     and not exists (
       select 1 from public.role_template_permissions rtp
        where rtp.role_template_id = v_template.id
          and rtp.permission_id = grp.permission_id and rtp.granted)
     -- ...and no other role in the group defines it
     and not exists (
       select 1
         from public.group_role_permissions o
         join public.group_roles ogr on ogr.id = o.group_role_id
        where ogr.group_id = v_role.group_id
          and o.group_role_id <> p_group_role_id
          and o.permission_id = grp.permission_id
          and o.granted)
   limit 1;

  if v_lost is not null then
    raise exception 'applying this update would leave the group with no role granting "%"', v_lost
      using errcode = 'P0001';
  end if;

  -- Apply is the diff and nothing but the diff: after this the grant set
  -- EQUALS the template's live materialised set. Not a union — a union is
  -- the silent merge RD-3 forbids. Read and write in one statement pair
  -- inside the function's implicit transaction, so a concurrent apply
  -- observes this one's result rather than racing the same pre-state.
  delete from public.group_role_permissions grp
   where grp.group_role_id = p_group_role_id
     and not exists (
       select 1 from public.role_template_permissions rtp
        where rtp.role_template_id = v_template.id
          and rtp.permission_id = grp.permission_id and rtp.granted);

  insert into public.group_role_permissions (group_role_id, permission_id)
  select p_group_role_id, rtp.permission_id
    from public.role_template_permissions rtp
   where rtp.role_template_id = v_template.id and rtp.granted
  on conflict (group_role_id, permission_id) do update set granted = true;

  select dv.version_number into v_to_version
    from public.role_template_versions dv where dv.id = v_template.default_version_id;

  -- The copy has honestly moved, so the next diff is empty.
  update public.group_roles
     set created_from_version_number = v_to_version
   where id = p_group_role_id;

  return jsonb_build_object('id', p_group_role_id,
                            'from_version', v_role.created_from_version_number,
                            'to_version', v_to_version);
end;
$$;

comment on function public.apply_role_template_update(uuid) is
  'RD-B FEAT-PC028 STORY-5 (RD-3): the grant set becomes EQUAL to the '
  'template''s live materialised set — never a union. Re-stamps '
  'created_from_version_number so the next diff is empty. Leaves the source '
  'template and its versions untouched (the group acting on its own '
  'property). Refuses under assert_group_writable, on a retired source '
  '(RD-2), and on the RD-5 lockout guard by DEFINER. Members holding the '
  'role keep it; only the permissions it grants move.';

-- ---------------------------------------------------------------------------
-- 6. The three passive kinds (RD-7) in their own category (RDB-3).
-- ---------------------------------------------------------------------------
-- notification_categories / notification_kinds are DS-5-owned reference data
-- (relabelled at COR-C W4, Audit III ruling R-4). This is a migration-level
-- seed, the N-A/N-B/N-E precedent -- not a function-body crossing, and NOT a
-- change to any pinned expected set (checked: the vertical-set test pins
-- tables owned by vertical:*, and this adds none).
--
-- A SEPARATE category, not 'platform': a member mutes a category as a unit,
-- and muting admin announcements must not silently also mute "a role your
-- group holds has changed".
insert into public.notification_categories (key, label, lawful_basis, interruption_grade)
values ('roles', 'Roles & permissions', 'transactional', 'badge')
on conflict (key) do nothing;

-- dispatch_segment is left at its NULL default and never set. That is what
-- makes these passive: the Steward acts in the roles panel, not in the bell.
-- Contrast N-E, whose invitation was genuinely answerable in place.
insert into public.notification_kinds (kind, category_key, label) values
  ('role_template_published', 'roles', 'Role made available to your group'),
  ('role_template_updated',   'roles', 'Role update available'),
  ('role_template_retired',   'roles', 'Role no longer offered')
on conflict (kind) do nothing;

-- ---------------------------------------------------------------------------
-- 8. Grants — ADR-U038: every new contract is revoked from public/anon first.
-- ---------------------------------------------------------------------------
revoke all on function public.admin_publish_role_template(uuid, uuid[]) from public, anon;
revoke all on function public.admin_unpublish_role_template(uuid, uuid[]) from public, anon;
revoke all on function public.get_available_role_templates(uuid) from public, anon;
revoke all on function public.get_role_copy_diff(uuid) from public, anon;
revoke all on function public.apply_role_template_update(uuid) from public, anon;

grant execute on function public.admin_publish_role_template(uuid, uuid[]) to authenticated, service_role;
grant execute on function public.admin_unpublish_role_template(uuid, uuid[]) to authenticated, service_role;
grant execute on function public.get_available_role_templates(uuid) to authenticated, service_role;
grant execute on function public.get_role_copy_diff(uuid) to authenticated, service_role;
grant execute on function public.apply_role_template_update(uuid) to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 9. Emission re-issues — retire and apply-version now tell people.
--    Both keep byte-identical signatures (COR-A).
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

  -- RD-B FEAT-PC028 STORY-6: the telling RD-A deliberately left silent.
  -- Reach = groups that ADOPTED it, plus groups it was published to.
  -- Recipients are manage_roles holders (RDB-2) -- the permission that gates
  -- the act the notice is about, not assign_roles. The two sets coincide
  -- today; they diverge the moment a group defines a roles-only delegate.
  insert into public.notifications
    (recipient_group_id, type, title, body, payload, group_id)
  select distinct gm.member_group_id,
         'role_template_retired',
         'Role no longer offered',
         'The role "' || v_template.name || '" is no longer offered by the '
           || 'platform. Your group''s existing copy is unaffected.',
         jsonb_build_object('role_template_id', p_role_template_id,
                            'template_name', v_template.name,
                            'group_id', g.id),
         g.id
    from public.groups g
    join public.group_memberships gm
      on gm.group_id = g.id and gm.status = 'active'
   where g.status = 'active'
     and (exists (select 1 from public.group_roles gr
                   where gr.group_id = g.id
                     and gr.created_from_role_template_id = p_role_template_id)
       or exists (select 1 from public.role_template_publications pub
                   where pub.role_template_id = p_role_template_id
                     and (pub.group_id is null or pub.group_id = g.id)))
     and public.has_permission(gm.member_group_id, g.id, 'manage_roles');

  return (select jsonb_build_object('id', rt.id, 'retired_at', rt.retired_at,
                                    'already_retired', false)
            from public.role_templates rt where rt.id = p_role_template_id);
end;
$$;


CREATE OR REPLACE FUNCTION public.admin_set_role_template_default_version(
  p_template_id uuid,
  p_version_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_is_system boolean;
  v_name_from text;
  v_from_version integer;
  v_ver record;
  v_pname text;
  v_bare_gt text;
  v_added text[];
  v_removed text[];
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  v_actor := public.get_current_personal_group_id();

  SELECT rt.is_system, rt.name, dv.version_number
    INTO v_is_system, v_name_from, v_from_version
    FROM public.role_templates rt
    LEFT JOIN public.role_template_versions dv ON dv.id = rt.default_version_id
   WHERE rt.id = p_template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role template not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_is_system THEN
    RAISE EXCEPTION 'Seeded role templates are immutable — clone, then edit the clone'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_ver
    FROM public.role_template_versions
   WHERE id = p_version_id AND role_template_id = p_template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version does not belong to this role template'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.role_templates
              WHERE name = v_ver.name AND id <> p_template_id) THEN
    RAISE EXCEPTION 'A role template named "%" already exists', v_ver.name
      USING ERRCODE = '22023';
  END IF;

  -- The protected-set guard (RB-4: the prevent_last_deusex_role_removal
  -- instinct extended to a permission set). An apply refuses if it would strip
  -- a protected permission's LAST holder on any instantiation path — the
  -- template-less path (every role template) or any group template's role
  -- set. Structurally unreachable in the shipped all-seeds composition (seeds
  -- immutable) — the contract-level home of the invariant so Eid's re-opens
  -- inherit it; the gate suite proves it against a synthetic composition.
  FOR v_pname IN
    SELECT p.name
      FROM public.permissions p
     WHERE p.is_protected
       AND EXISTS (SELECT 1 FROM public.role_template_permissions rtp
                    WHERE rtp.role_template_id = p_template_id
                      AND rtp.permission_id = p.id)
       AND NOT EXISTS (SELECT 1 FROM public.role_template_version_permissions vp
                        WHERE vp.role_template_version_id = p_version_id
                          AND vp.permission_id = p.id)
  LOOP
    IF NOT EXISTS (
      SELECT 1
        FROM public.role_template_permissions rtp2
        JOIN public.permissions p2 ON p2.id = rtp2.permission_id
       WHERE p2.name = v_pname
         AND rtp2.role_template_id <> p_template_id) THEN
      RAISE EXCEPTION 'Protected permission "%" would lose its last holder on the template-less instantiation path', v_pname
        USING ERRCODE = 'P0001';
    END IF;

    SELECT gt.name INTO v_bare_gt
      FROM public.group_template_roles gtr
      JOIN public.group_templates gt ON gt.id = gtr.group_template_id
     WHERE gtr.role_template_id = p_template_id
       AND NOT EXISTS (
         SELECT 1
           FROM public.group_template_roles gtr2
           JOIN public.role_template_permissions rtp3
             ON rtp3.role_template_id = gtr2.role_template_id
           JOIN public.permissions p3 ON p3.id = rtp3.permission_id
          WHERE gtr2.group_template_id = gtr.group_template_id
            AND gtr2.role_template_id <> p_template_id
            AND p3.name = v_pname)
     LIMIT 1;
    IF v_bare_gt IS NOT NULL THEN
      RAISE EXCEPTION 'Protected permission "%" would lose its last holder in group template "%"', v_pname, v_bare_gt
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  -- Old-set -> new-set diff, captured BEFORE materialising (RB-4: audit rows
  -- carry the diff, not just the event).
  SELECT COALESCE(array_agg(p.name ORDER BY p.name), '{}'::text[]) INTO v_added
    FROM public.role_template_version_permissions vp
    JOIN public.permissions p ON p.id = vp.permission_id
   WHERE vp.role_template_version_id = p_version_id
     AND NOT EXISTS (SELECT 1 FROM public.role_template_permissions rtp
                      WHERE rtp.role_template_id = p_template_id
                        AND rtp.permission_id = vp.permission_id);

  SELECT COALESCE(array_agg(p.name ORDER BY p.name), '{}'::text[]) INTO v_removed
    FROM public.role_template_permissions rtp
    JOIN public.permissions p ON p.id = rtp.permission_id
   WHERE rtp.role_template_id = p_template_id
     AND NOT EXISTS (SELECT 1 FROM public.role_template_version_permissions vp
                      WHERE vp.role_template_version_id = p_version_id
                        AND vp.permission_id = rtp.permission_id);

  -- Materialise onto the live rows the instantiation physics read. Zero
  -- changes to create_engagement_group / copy_template_permissions — RB-5's
  -- snapshot-now holds by construction.
  UPDATE public.role_templates
     SET name = v_ver.name,
         description = v_ver.description,
         default_version_id = p_version_id
   WHERE id = p_template_id;

  DELETE FROM public.role_template_permissions
   WHERE role_template_id = p_template_id;
  INSERT INTO public.role_template_permissions (role_template_id, permission_id)
  SELECT p_template_id, vp.permission_id
    FROM public.role_template_version_permissions vp
   WHERE vp.role_template_version_id = p_version_id;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (v_actor, 'role_template.apply', p_template_id::text,
          jsonb_build_object(
            'from_version', v_from_version,
            'to_version', v_ver.version_number,
            'added', to_jsonb(v_added),
            'removed', to_jsonb(v_removed),
            'name_from', v_name_from,
            'name_to', v_ver.name));

  -- RD-B FEAT-PC028 STORY-6: Apply is where "updated" actually happens, so
  -- this is where the notice belongs. Only groups that ADOPTED the template
  -- are told -- a group that never adopted it is not owed news about a
  -- version it does not hold.
  INSERT INTO public.notifications
    (recipient_group_id, type, title, body, payload, group_id)
  SELECT DISTINCT gm.member_group_id,
         'role_template_updated',
         'Role update available',
         'A newer version of the role "' || v_ver.name || '" is available. '
           || 'Review the changes before copying them into your group.',
         jsonb_build_object('role_template_id', p_template_id,
                            'template_name', v_ver.name,
                            'to_version', v_ver.version_number,
                            'group_id', g.id),
         g.id
    FROM public.groups g
    JOIN public.group_roles gr
      ON gr.group_id = g.id AND gr.created_from_role_template_id = p_template_id
    JOIN public.group_memberships gm
      ON gm.group_id = g.id AND gm.status = 'active'
   WHERE g.status = 'active'
     AND public.has_permission(gm.member_group_id, g.id, 'manage_roles');

  RETURN jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'from_version', v_from_version,
    'to_version', v_ver.version_number);
END;
$$;

