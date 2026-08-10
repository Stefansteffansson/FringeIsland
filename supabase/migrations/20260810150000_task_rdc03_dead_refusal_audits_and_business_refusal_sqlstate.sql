-- TASK-RDC-03 — the family-wide corrective.
--
-- Two defects, same two lines, both inherited from RD-A/RD-B and both left
-- untouched by PC029's corrective (which fixed only the delete guard).
--
-- 1. THE REFUSAL AUDIT WAS ALWAYS DEAD CODE.
--    The pattern was:
--        insert into public.admin_audit_log (...) values (..., 'x_refused', ...);
--        raise exception '...' using errcode = '42501';
--    The RAISE aborts the transaction, so Postgres discards the INSERT with
--    it. The row never landed. Measured against the live catalogue on
--    2026-08-10: 6 808 audit rows, 46 distinct actions, ZERO matching
--    '%_refused', against 118 successful retires. No refusal has ever been
--    audited, anywhere in the family, since these functions shipped.
--
--    RULING (TASK-RDC-03, option 1): delete the dead INSERTs rather than
--    pretend. Postgres has no autonomous transactions, so making refusal
--    auditing real means dblink/pg_background (new extension surface) or
--    turning every refusal into a returned result instead of a raise (a
--    contract change across the family). Neither is worth it for a trail
--    nobody has missed. The Observability wording is corrected to match, and
--    the specs no longer claim coverage that does not exist. A function body
--    that reads as auditing but audits nothing is the exact TASK-SEC-01
--    failure mode: a wrong belief written into a body, inherited by the next
--    reader.
--
-- 2. A BUSINESS REFUSAL WAS WEARING AN AUTHORIZATION CODE.
--    Both guards raised 42501 for a rule refusal. `call()` in
--    hub/lib/admin/roles.ts collapses EVERY 42501 into `refused`, which the
--    routes turn into the admin-plane existence-hiding 404 shape. So:
--        "a system role template cannot be retired"   reached the admin as "Not found"
--        "a retired role template cannot be published" reached the admin as "Not found"
--    about a template plainly visible in the list they were reading. Same
--    defect PC029's corrective fixed for the delete guard; these two are the
--    siblings that guard did not touch.
--
--    P0001 carries the refusal past `call()` as an AdminRolesError, and the
--    routes already map P0001 -> 409 with the message verbatim. 42501 is left
--    to the non-admin gate at the top of each function, where collapsing to
--    404 is CORRECT — a non-admin should not learn the template exists.
--
-- Nothing else in either body changes. Both remain SECURITY DEFINER with an
-- empty search_path; CREATE OR REPLACE preserves existing grants.
--
-- ---------------------------------------------------------------------------
-- SIBLING ASSERTIONS THIS MIGRATION TOUCHES (platform-tier rule: grep the
-- suite for assertions naming any object whose behaviour changes, and list
-- each as adapted or deliberately left. Naming only my own test is not
-- enough — that is exactly how RIDER-3's sibling survived).
--
-- Swept 2026-08-10 for every assertion on these two functions' error codes.
-- RESULT: ZERO invalidated. The reason is structural — every 42501 assertion
-- in the suite pins the NON-ADMIN GATE, which this migration deliberately
-- leaves on 42501. Only the two BUSINESS refusals move.
--
--   DELIBERATELY LEFT, still correct:
--     role-provenance-and-retirement.test.ts:535 S3f — system-template retire
--       asserts `error not null` only, never the code. Survives the move.
--     role-provenance-and-retirement.test.ts:554 S3g — non-admin retire 42501.
--       PRESERVED by this migration.
--     role-publication-and-diff.test.ts:308 S1g — non-admin publish 42501.
--       PRESERVED.
--     role-publication-and-diff.test.ts:1289 W6f / :1423 C6 — 42501 on
--       admin_preview_publication_reach and admin_get_role_template_detail.
--       DIFFERENT FUNCTIONS, untouched here.
--     role-publication-and-diff.test.ts:554 S3d — 42501/P0002 on
--       create_group_role. DIFFERENT FUNCTION, untouched.
--     admin-role-publish-route.test.ts:116 — P0001 -> 409 verbatim. Was
--       MOCKING a contract the substrate did not produce; this migration makes
--       it true. :125 (P0002 -> 404) unchanged.
--     admin-roles-view.test.tsx:297 — mocks the system-retire refusal body.
--       The real route can finally produce it.
--
--   ADAPTED:
--     role-template-disposal.test.ts — the refusal cell's ASSERTION value is
--       unchanged (still 0 refusal rows); its MEANING flips from pinning a
--       defect to pinning this ruling. Comment rewritten, nothing dropped.
--
--   ADDED (red-first, both demonstrated red at 404-where-409-belongs):
--     admin-roles.spec.ts — two route-tier cells, the tier that could alone
--       catch this: integration calls the RPC directly and never crosses
--       `call()`.
-- ---------------------------------------------------------------------------

create or replace function public.admin_retire_role_template(p_role_template_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor uuid;
  v_template public.role_templates%rowtype;
begin
  -- The non-admin gate. 42501 belongs HERE and only here: the caller must not
  -- learn whether the template exists, so the Surface collapses it to 404.
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_template
    from public.role_templates rt where rt.id = p_role_template_id;
  if v_template.id is null then
    raise exception 'role template not found' using errcode = 'P0002';
  end if;

  -- The four seeded roles are the floor every group is built on. This is a
  -- BUSINESS refusal to an authenticated admin who can see the template, so
  -- it says why, in its own words, as a 409 (TASK-RDC-03). The refusal-audit
  -- INSERT that used to sit here was discarded by this very RAISE and has
  -- been removed rather than left reading as live.
  if v_template.is_system then
    raise exception 'a system role template cannot be retired' using errcode = 'P0001';
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
           || 'platform. ' || g.name || '''s existing copy is unaffected.',
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
$function$;

create or replace function public.admin_publish_role_template(
  p_role_template_id uuid,
  p_group_ids uuid[] default null::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor uuid;
  v_template public.role_templates%rowtype;
  v_existing integer;
  v_created integer := 0;
begin
  -- The non-admin gate. 42501 belongs HERE and only here (see the retire
  -- sibling above).
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_actor := public.get_current_personal_group_id();

  select * into v_template from public.role_templates rt where rt.id = p_role_template_id;
  if v_template.id is null then
    raise exception 'role template not found' using errcode = 'P0002';
  end if;

  -- The catalogue cannot begin offering what it has stopped offering. A
  -- BUSINESS refusal, so P0001 -> 409 verbatim (TASK-RDC-03). The dead
  -- refusal-audit INSERT that used to sit here has been removed.
  if v_template.retired_at is not null then
    raise exception 'a retired role template cannot be published'
      using errcode = 'P0001';
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
           || g.name || '.',
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
$function$;
