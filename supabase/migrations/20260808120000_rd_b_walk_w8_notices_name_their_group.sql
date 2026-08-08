-- ============================================================================
-- RD-B walk fix W-8 — the three distribution notices name their group.
--
-- WHY THIS EXISTS
--
-- Found by Stefan at the RD-B live walk (2026-08-08, S7). A Steward holding
-- manage_roles in five groups received FIVE IDENTICAL notices:
--
--     The role "Walk Second" is now available to copy into your group.
--
-- Verified at row level: the five rows were genuinely ABOUT five different
-- groups -- group_id differed on every row. Only the body was identical,
-- because the server authors it with the possessive "your group" and never
-- the group's name.
--
-- FEAT-H044 STORY-4's acceptance criterion says the opposite, in as many
-- words:
--
--     "Given a member holding manage_roles in two affected groups, when both
--      notices arrive, then each names its own group -- the recipient must
--      not have to guess which group a notice is about."
--
-- The recipient had to guess. With five, they could not.
--
-- WHAT THIS DOES
--
-- Re-issues the three dispatching functions with BYTE-IDENTICAL signatures
-- (the COR-A pattern: create-or-replace preserves the ACL, so no grant is
-- re-stated here). The ONLY change in each is the body literal, which now
-- interpolates g.name:
--
--   admin_publish_role_template              role_template_published
--     "...is now available to copy into <Group>."
--   admin_set_role_template_default_version  role_template_updated
--     "...Review the changes before copying them into <Group>."
--   admin_retire_role_template               role_template_retired
--     "...no longer offered by the platform. <Group>'s existing copy is
--      unaffected."
--
-- The retirement sentence keeps its reassurance word-for-word apart from the
-- possessive -- that clause is what stops the notice reading as a loss, and
-- it is deliberately preserved.
--
-- g.name is already in scope in all three: each INSERT selects from
-- public.groups g and already emits g.id, so DISTINCT semantics are unchanged
-- (g.name is functionally dependent on g.id). No JOIN is added.
--
-- The fan-out itself is CORRECT and unchanged -- one notice per group where
-- the recipient holds manage_roles (RDB-2). Stefan ruled it so at the walk:
-- the volume was never the defect, the anonymity was.
--
-- The bodies below were extracted from 20260807090000 programmatically and
-- patched, with an assertion that each literal matched exactly once and that
-- no "your group" survived -- so a silently-failed patch could not ship.
--
-- NO schema change. NO new table, grant, RLS policy or trigger. Copy only.
--
-- SIBLING ASSERTIONS INVALIDATED -- grepped, not assumed:
--   hub/tests/unit/components/notifications/role-distribution-notices.test.tsx
--     ADAPTED. Its fixtures hand-authored bodies naming groups, which is the
--     shape this migration finally makes real -- see the walk's meta-finding:
--     the fixture invented a payload the substrate never produced, so the
--     cell was green and meaningless. The fixtures now quote the server's
--     literals.
--   No E2E or integration cell asserts these bodies. No other consumer reads
--     notifications.body for these kinds.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- admin_publish_role_template -- body literal only; signature and logic unchanged.
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
$$;

-- ---------------------------------------------------------------------------
-- admin_retire_role_template -- body literal only; signature and logic unchanged.
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
$$;

-- ---------------------------------------------------------------------------
-- admin_set_role_template_default_version -- body literal only; signature and logic unchanged.
-- ---------------------------------------------------------------------------
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
           || 'Review the changes before copying them into ' || g.name || '.',
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

comment on function public.admin_publish_role_template(uuid, uuid[]) is
  'RD-B FEAT-PC028 STORY-1 (RD-2/RD-8/RDB-5): publish OFFERS, it never writes '
  'into a group. Walk fix W-8 (2026-08-08): the dispatched notice names the '
  'group it is about, so a Steward of several groups can tell them apart.';
