-- ============================================================================
-- ADM-F / FEAT-PC025 — role-template editing contracts + the ADM-E walk riders
-- ============================================================================
-- Cycle ADM-F, TASK-ADMF-01. Spec: docs/platform/core/features/
--   FEAT-PC025-role-template-editing-and-walk-rider-contracts.md (RB-4/RB-5).
-- Gate suite: hub/tests/integration/admin/role-template-editing.test.ts
--   (red at head by design: PGRST202 on the five new functions; absent payload
--   keys + 'Unauthorized' on the audit read; 23503-class on the consented
--   hard delete; zero realtime.messages rows on the force-logout topic).
--
-- Four parts:
--   1. Versioning substrate — role_template_versions + junction (append-only,
--      SELECT-only RLS like the five sibling template tables), a
--      default_version_id pointer on role_templates, permissions.is_protected
--      (code-owned flag), and the seeded-state backfill (every template gets
--      version 1 = its live state; history starts honest).
--   2. The editor contract family (admin_* -> PC-4 over PC-3 substrate):
--      admin_get_role_templates / admin_get_role_template_detail /
--      admin_clone_role_template / admin_create_role_template_version /
--      admin_set_role_template_default_version. Clone-don't-edit seeds
--      (is_system refuses P0001); apply = repoint + materialise onto the live
--      rows the instantiation physics read (create_engagement_group +
--      copy_template_permissions are UNTOUCHED — snapshot-now is physics,
--      RB-5); the protected-set guard (last-DeusEx instinct one level up);
--      every mutation audits with old-set -> new-set diffs.
--   3. WA-2 — admin_get_audit_log re-issue: symmetric target resolution
--      (user id -> display name + email; group id -> name; literals pass
--      through; raw target stays) + the family gate message (the PC024-recorded
--      'Unauthorized' drift settled here).
--      WA-3 — admin_hard_delete_user re-issue: the consent-subject anonymise
--      leg (erase_fim_account's leg 20260627120000:83-91 copied verbatim,
--      idempotent under that composition; ADR-U034 §5 anonymise-then-retain).
--      WA-4 — admin_force_logout re-issue: one session_revoked hint per swept
--      session id per target on account:<auth_uid>:sessions
--      (revoke_own_session's non-fatal pattern 20260703154102:130-135;
--      ds5_emit_hint NOT reused — trigger-path-only per its comment).
--
-- PROTECTED-PERMISSION SET (permissions.is_protected = true; code-owned —
-- seed/migration-set only, the editor renders it and never writes it).
-- Criteria (spec Part 1): permissions whose loss leaves a future group without
-- a functioning governance plane — the role-assignment / membership-management
-- family plus the rest control:
--   assign_roles, manage_roles, remove_roles, invite_members, remove_members,
--   rest_group
--
-- SIBLING-ASSERTION SWEEP (the three-times-bitten rule) — every assertion or
-- consumer naming an object whose behaviour this migration changes:
--   * admin_get_audit_log (payload gains target_display_name/target_email;
--     gate message 'Unauthorized' -> 'platform administrator required'):
--     - hub/tests/integration/admin/moderation-and-audit-contracts.test.ts —
--       row-shape cells pin named keys (additive keys tolerated); any cell
--       asserting the 'Unauthorized' message ADAPTED in this PR.
--     - hub/lib/admin/audit.ts (AdminAuditRow) + AdminAuditLog.tsx — additive
--       keys are runtime-tolerated; the TS type + rendering adapt in
--       FEAT-H040 (TASK-ADMF-02, same cycle) — DELIBERATELY LEFT here.
--   * admin_hard_delete_user (gains the anonymise leg; signature, return
--     shape, cascade order unchanged):
--     - hub/tests/integration/admin/member-administration-operations.test.ts —
--       consent-less fixtures unaffected — LEFT (green either way).
--     - erase_fim_account composition — outer anonymise becomes idempotent
--       no-op for the inner — LEFT (behaviour identical).
--   * admin_force_logout (gains hint emission; signature, return shape,
--     deletes, audit row unchanged):
--     - member-administration-operations.test.ts force-logout cells — LEFT.
--     - hub H039 bulk suite (users-page-and-bulk.test.ts) — BFF loop
--       semantics unchanged — LEFT.
--     - hub/tests/integration/account/sessions.test.ts — counts rows on the
--       same topic but per-test fresh users; admin path adds rows only for
--       admin-swept targets — LEFT.
--   * get_role_templates (body untouched; clones now appear to members):
--     - role-templates-contract.test.ts pins shape/order only — LEFT.
--     - communication/conversation-contracts.test.ts:530 filters by seed
--       names; seeds immutable — LEFT.
--   * role_templates / role_template_permissions (DEFINER-materialised writes;
--     RLS unchanged): role-permission-contracts.test.ts derives counts at
--     runtime ("catalogue equals manifest" shape) — LEFT.
--   * permissions (gains is_protected; catalogue row widens): same runtime
--     derivation — LEFT.
--
-- Post-apply verification set: this gate suite green; full
-- npm run test:integration; affected E2E journeys (admin audit browser,
-- admin members bulk) run per the Q1 standing rule; ADR-U043 pass at the gate.
-- Ownership manifest (same PR): tables PC-3, functions PC-4.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Part 1a — versioning substrate: tables + pointer + protected flag
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.role_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_template_id uuid NOT NULL
    REFERENCES public.role_templates(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_template_id, version_number)
);

COMMENT ON TABLE public.role_template_versions IS
  'FEAT-PC025 (ADM-17, RB-4): the append-only version ledger for role '
  'templates. A version captures full template state (name, description, and '
  'its permission set in role_template_version_permissions). A draft is an '
  'unapplied version — no status machinery. No UPDATE/DELETE path exists in '
  'any contract; versions are the ledger. created_by is the admin actor''s '
  'personal group (four-hop chain), SET NULL on actor erasure.';

CREATE TABLE IF NOT EXISTS public.role_template_version_permissions (
  role_template_version_id uuid NOT NULL
    REFERENCES public.role_template_versions(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL
    REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE (role_template_version_id, permission_id)
);

COMMENT ON TABLE public.role_template_version_permissions IS
  'FEAT-PC025: the permission set a role_template_version captures.';

ALTER TABLE public.role_templates
  ADD COLUMN IF NOT EXISTS default_version_id uuid
    REFERENCES public.role_template_versions(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.role_templates.default_version_id IS
  'FEAT-PC025 (RB-4): the default pointer. Apply = repoint + materialise the '
  'version onto role_templates/role_template_permissions (the live rows '
  'create_engagement_group + copy_template_permissions read — physics '
  'untouched); rollback = repoint to an older version through the same door.';

ALTER TABLE public.permissions
  ADD COLUMN IF NOT EXISTS is_protected boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.permissions.is_protected IS
  'FEAT-PC025 (RB-4 self-lockout guard): protected permissions cannot lose '
  'their last holder on any instantiation path via the template editor. '
  'Code-owned like the catalogue itself — seed/migration-set only; no client '
  'write path exists.';

UPDATE public.permissions SET is_protected = true
 WHERE name IN ('assign_roles', 'manage_roles', 'remove_roles',
                'invite_members', 'remove_members', 'rest_group');

-- RLS: SELECT-only to authenticated, matching the five sibling template
-- tables (rebuild 20260222000000:1438-1450). No write policies ever — writes
-- go through the SECURITY DEFINER contracts alone.
ALTER TABLE public.role_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_template_version_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_template_versions_select
  ON public.role_template_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY role_template_version_permissions_select
  ON public.role_template_version_permissions FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- Part 1b — backfill: every template gets version 1 = its live state
-- ----------------------------------------------------------------------------

INSERT INTO public.role_template_versions
    (role_template_id, version_number, name, description, created_by)
SELECT rt.id, 1, rt.name, rt.description, NULL
  FROM public.role_templates rt
 WHERE NOT EXISTS (SELECT 1 FROM public.role_template_versions v
                    WHERE v.role_template_id = rt.id);

INSERT INTO public.role_template_version_permissions
    (role_template_version_id, permission_id)
SELECT v.id, rtp.permission_id
  FROM public.role_template_versions v
  JOIN public.role_template_permissions rtp
    ON rtp.role_template_id = v.role_template_id
 WHERE v.version_number = 1
ON CONFLICT DO NOTHING;

UPDATE public.role_templates rt
   SET default_version_id = v.id
  FROM public.role_template_versions v
 WHERE v.role_template_id = rt.id
   AND v.version_number = 1
   AND rt.default_version_id IS NULL;

-- ----------------------------------------------------------------------------
-- Part 2 — the editor contract family (admin_* -> PC-4)
-- ----------------------------------------------------------------------------

-- 2a. admin_get_role_templates() — the list + catalogue read (one editor boot)
CREATE OR REPLACE FUNCTION public.admin_get_role_templates()
RETURNS jsonb
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

COMMENT ON FUNCTION public.admin_get_role_templates() IS
  'ADM-F FEAT-PC025: the editor''s list read — every template with version '
  'metadata + blast-radius facts (composition refs, instantiated-role count) '
  'plus the full flagged catalogue (read-only to the editor — atoms '
  'code-owned, RB-4). 42501 non-admin. Privilege escalation bounded to reads '
  'of admin-visible template/catalogue data.';

-- 2b. admin_get_role_template_detail() — version history + sets
CREATE OR REPLACE FUNCTION public.admin_get_role_template_detail(p_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_template jsonb;
  v_versions jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
           'id', rt.id, 'name', rt.name, 'description', rt.description,
           'is_system', rt.is_system)
    INTO v_template
    FROM public.role_templates rt
   WHERE rt.id = p_template_id;
  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Role template not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(jsonb_agg(v.doc ORDER BY v.vn), '[]'::jsonb)
    INTO v_versions
    FROM (
      SELECT ver.version_number AS vn,
             jsonb_build_object(
               'id', ver.id,
               'version_number', ver.version_number,
               'name', ver.name,
               'description', ver.description,
               'created_at', ver.created_at,
               'created_by_display_name', g.name,
               'permission_names',
                 COALESCE((SELECT jsonb_agg(p.name ORDER BY p.name)
                             FROM public.role_template_version_permissions vp
                             JOIN public.permissions p ON p.id = vp.permission_id
                            WHERE vp.role_template_version_id = ver.id), '[]'::jsonb),
               'is_default', (ver.id = rt.default_version_id)
             ) AS doc
        FROM public.role_template_versions ver
        JOIN public.role_templates rt ON rt.id = ver.role_template_id
        LEFT JOIN public.groups g ON g.id = ver.created_by
       WHERE ver.role_template_id = p_template_id
    ) v;

  RETURN jsonb_build_object(
    'template', v_template,
    'versions', v_versions,
    'generated_at', now());
END;
$$;

COMMENT ON FUNCTION public.admin_get_role_template_detail(uuid) IS
  'ADM-F FEAT-PC025: one template''s version ledger with per-version '
  'permission sets (both sides of the Hub diff preview — the client only '
  'presents). P0002 unknown id; 42501 non-admin.';

-- 2c. admin_clone_role_template() — clone-don't-edit (the only door for seeds)
CREATE OR REPLACE FUNCTION public.admin_clone_role_template(
  p_source_id uuid,
  p_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_source_name text;
  v_source_description text;
  v_new_id uuid;
  v_version_id uuid;
  v_set jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  v_actor := public.get_current_personal_group_id();

  SELECT rt.name, rt.description INTO v_source_name, v_source_description
    FROM public.role_templates rt WHERE rt.id = p_source_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role template not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'A name is required' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.role_templates WHERE name = p_name) THEN
    RAISE EXCEPTION 'A role template named "%" already exists', p_name
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.role_templates (name, description, is_system)
  VALUES (p_name, v_source_description, false)
  RETURNING id INTO v_new_id;

  -- Version 1 = the source's CURRENT LIVE set (not its default version — the
  -- clone copies what instantiation would copy today).
  INSERT INTO public.role_template_versions
      (role_template_id, version_number, name, description, created_by)
  VALUES (v_new_id, 1, p_name, v_source_description, v_actor)
  RETURNING id INTO v_version_id;

  INSERT INTO public.role_template_version_permissions
      (role_template_version_id, permission_id)
  SELECT v_version_id, rtp.permission_id
    FROM public.role_template_permissions rtp
   WHERE rtp.role_template_id = p_source_id;

  UPDATE public.role_templates
     SET default_version_id = v_version_id
   WHERE id = v_new_id;

  -- Materialise the live rows (what instantiation physics read). A clone
  -- rides every template-less instantiation and appears in the member-facing
  -- get_role_templates() from this moment — the ceremony names both (spec
  -- STORY-2).
  INSERT INTO public.role_template_permissions (role_template_id, permission_id)
  SELECT v_new_id, rtp.permission_id
    FROM public.role_template_permissions rtp
   WHERE rtp.role_template_id = p_source_id;

  SELECT COALESCE(jsonb_agg(p.name ORDER BY p.name), '[]'::jsonb)
    INTO v_set
    FROM public.role_template_permissions rtp
    JOIN public.permissions p ON p.id = rtp.permission_id
   WHERE rtp.role_template_id = v_new_id;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (v_actor, 'role_template.clone', v_new_id::text,
          jsonb_build_object(
            'source_id', p_source_id,
            'source_name', v_source_name,
            'new_name', p_name,
            'permission_names', v_set));

  RETURN jsonb_build_object('id', v_new_id, 'name', p_name);
END;
$$;

COMMENT ON FUNCTION public.admin_clone_role_template(uuid, text) IS
  'ADM-F FEAT-PC025 (RB-4 clone-don''t-edit): new is_system=false template '
  'from the source''s live set — version 1 + default pointer + live rows '
  'materialised. Typed 22023 on duplicate/empty name, P0002 unknown source. '
  'Audits role_template.clone with the copied set. SECURITY DEFINER: the '
  'template tables are write-sealed to clients; this is the sanctioned door.';

-- 2d. admin_create_role_template_version() — append a draft
CREATE OR REPLACE FUNCTION public.admin_create_role_template_version(
  p_template_id uuid,
  p_name text,
  p_description text,
  p_permission_names text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_is_system boolean;
  v_tpl_name text;
  v_unknown text;
  v_next integer;
  v_version_id uuid;
  v_added text[];
  v_removed text[];
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  v_actor := public.get_current_personal_group_id();

  SELECT rt.is_system, rt.name INTO v_is_system, v_tpl_name
    FROM public.role_templates rt WHERE rt.id = p_template_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role template not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_is_system THEN
    RAISE EXCEPTION 'Seeded role templates are immutable — clone, then edit the clone'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'A name is required' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.role_templates
              WHERE name = p_name AND id <> p_template_id) THEN
    RAISE EXCEPTION 'A role template named "%" already exists', p_name
      USING ERRCODE = '22023';
  END IF;

  SELECT n INTO v_unknown
    FROM unnest(COALESCE(p_permission_names, '{}'::text[])) AS n
   WHERE NOT EXISTS (SELECT 1 FROM public.permissions p WHERE p.name = n)
   LIMIT 1;
  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION 'Unknown permission: %', v_unknown USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(max(version_number), 0) + 1 INTO v_next
    FROM public.role_template_versions
   WHERE role_template_id = p_template_id;

  INSERT INTO public.role_template_versions
      (role_template_id, version_number, name, description, created_by)
  VALUES (p_template_id, v_next, p_name, p_description, v_actor)
  RETURNING id INTO v_version_id;

  INSERT INTO public.role_template_version_permissions
      (role_template_version_id, permission_id)
  SELECT DISTINCT v_version_id, p.id
    FROM public.permissions p
   WHERE p.name = ANY (COALESCE(p_permission_names, '{}'::text[]));

  -- Draft diff vs the CURRENT LIVE set (audit carries it; the apply audits the
  -- state change itself).
  SELECT COALESCE(array_agg(n ORDER BY n), '{}'::text[]) INTO v_added
    FROM unnest(COALESCE(p_permission_names, '{}'::text[])) AS n
   WHERE NOT EXISTS (
     SELECT 1 FROM public.role_template_permissions rtp
     JOIN public.permissions p ON p.id = rtp.permission_id
    WHERE rtp.role_template_id = p_template_id AND p.name = n);

  SELECT COALESCE(array_agg(p.name ORDER BY p.name), '{}'::text[]) INTO v_removed
    FROM public.role_template_permissions rtp
    JOIN public.permissions p ON p.id = rtp.permission_id
   WHERE rtp.role_template_id = p_template_id
     AND p.name <> ALL (COALESCE(p_permission_names, '{}'::text[]));

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (v_actor, 'role_template.version_create', p_template_id::text,
          jsonb_build_object(
            'version_number', v_next,
            'added', to_jsonb(v_added),
            'removed', to_jsonb(v_removed),
            'name_from', v_tpl_name,
            'name_to', p_name));

  RETURN jsonb_build_object('id', v_version_id, 'version_number', v_next);
END;
$$;

COMMENT ON FUNCTION public.admin_create_role_template_version(uuid, text, text, text[]) IS
  'ADM-F FEAT-PC025: append version N+1 as an unapplied draft (a draft IS an '
  'unapplied version — no status machinery; live rows untouched until apply). '
  'P0001 on seeded templates (clone-don''t-edit); 22023 on unknown permission '
  'names, empty name, or a rename collision. Audits '
  'role_template.version_create with the draft diff vs the live set.';

-- 2e. admin_set_role_template_default_version() — apply = repoint; rollback =
--     the same door pointed at an older version
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

  RETURN jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'from_version', v_from_version,
    'to_version', v_ver.version_number);
END;
$$;

COMMENT ON FUNCTION public.admin_set_role_template_default_version(uuid, uuid) IS
  'ADM-F FEAT-PC025 (RB-4): the apply — repoint default_version_id and '
  'materialise the version (name/description/set) onto the live rows '
  'instantiation reads; rollback = the same door at an older version. Runs '
  'the protected-set guard (P0001, names the permission and the path). P0001 '
  'seeds; 22023 foreign version / rename collision. Audits '
  'role_template.apply with {from_version,to_version,added,removed,'
  'name_from,name_to}.';

-- Grants — the family pattern (REVOKE PUBLIC/anon; EXECUTE authenticated +
-- service_role; the 42501 gate is the wall).
REVOKE ALL ON FUNCTION public.admin_get_role_templates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_role_templates() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_get_role_template_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_role_template_detail(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_clone_role_template(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_clone_role_template(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_create_role_template_version(uuid, text, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_role_template_version(uuid, text, text, text[]) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_set_role_template_default_version(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role_template_default_version(uuid, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Part 3a — WA-2: admin_get_audit_log re-issue (symmetric target resolution)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_get_audit_log(
  p_limit INTEGER DEFAULT 50,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_action_prefix TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit integer;
  v_rows jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    -- WA-2 rider: the family message lands with the re-issue (the PC024 §
    -- Problem drift, settled).
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  v_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);

  -- Keyset unchanged (created_at DESC, id DESC; cap 200). WA-2: targets
  -- resolve the way actors already do — a guarded uuid cast, then users (by
  -- id -> personal-group display name + email) and groups (by id -> name);
  -- literals and unresolvable/erased targets pass through with null
  -- resolution; the raw target stays in every row. The audit record itself is
  -- untouched — resolution is read-time display shaping.
  SELECT COALESCE(jsonb_agg(sub.doc ORDER BY sub.c DESC, sub.i DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT a.created_at AS c, a.id AS i,
             jsonb_build_object(
               'id', a.id,
               'actor_group_id', a.actor_group_id,
               'actor_display_name', g.name,
               'action', a.action,
               'target', a.target,
               'target_display_name', COALESCE(tpg.name, tg.name),
               'target_email', tu.email,
               'metadata', a.metadata,
               'created_at', a.created_at) AS doc
        FROM (
          SELECT a0.*,
                 CASE WHEN a0.target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                      THEN a0.target::uuid END AS target_uuid
            FROM public.admin_audit_log a0
        ) a
        LEFT JOIN public.groups g ON g.id = a.actor_group_id
        LEFT JOIN public.users tu ON tu.id = a.target_uuid
        LEFT JOIN public.groups tpg ON tpg.id = tu.personal_group_id
        LEFT JOIN public.groups tg ON tg.id = a.target_uuid
       WHERE (p_before IS NULL OR a.created_at < p_before)
         AND (p_action_prefix IS NULL OR a.action LIKE p_action_prefix || '%')
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT v_limit
    ) sub;

  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.admin_get_audit_log(INTEGER, TIMESTAMPTZ, TEXT) IS
  'ADM-D FEAT-PC022 / ADM-16, re-issued ADM-F FEAT-PC025 (WA-2): the audit '
  'read — keyset from birth, cap 200, newest-first, actor AND target '
  'identities resolved live and null-safe (user-id targets -> display name + '
  'email; group-id targets -> name; literals/erased pass through; raw target '
  'always in the row). Gate message aligned to the member family. 42501 '
  'non-admin. Privilege-escalation surface: reads the admin-RLS-protected '
  'log, walled by is_platform_admin().';

-- ----------------------------------------------------------------------------
-- Part 3b — WA-3: admin_hard_delete_user re-issue (the consent-anonymise leg)
-- ----------------------------------------------------------------------------
-- Byte-stable to 20260801190000:294-384 except the anonymise leg before the
-- cascade (and this header note). At head every consented member's personal-
-- group delete hits consent_records_subject_group_id_fkey RESTRICT -> 23503
-- behind a generic 500 — the last-resort tool refused on precisely the
-- members it exists for (the WA-3 walk finding).
create or replace function public.admin_hard_delete_user(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_group_id uuid;
  v_target_personal_group_id uuid;
  v_target_auth_user_id uuid;
  v_deleted_user_group_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'platform administrator required' using errcode = '42501';
  end if;
  v_caller_group_id := public.get_current_personal_group_id();

  -- Get target's personal group and auth user ID
  select personal_group_id, auth_user_id
  into v_target_personal_group_id, v_target_auth_user_id
  from public.users where id = target_user_id
  for update;

  if v_target_personal_group_id is null then
    raise exception 'User not found or has no personal group' using errcode = 'P0002';
  end if;

  -- Get [Deleted User] sentinel group
  select id into v_deleted_user_group_id
  from public.groups where name = '[Deleted User]' and group_type = 'system';

  -- Write audit log BEFORE deletion (existing rows keep the legacy
  -- 'admin_hard_delete_user' string — the log is append-only).
  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_caller_group_id, 'member.hard_delete', target_user_id::text,
    jsonb_build_object('target_user_id', target_user_id,
      'target_personal_group_id', v_target_personal_group_id));

  -- WA-3 (FEAT-PC025): consent-subject anonymise — erase_fim_account's leg
  -- (20260627120000:83-91) copied verbatim, idempotent under that composition
  -- (the outer anonymise leaves zero matching rows for this inner pass).
  -- ADR-U034 §5 anonymise-then-retain: NULL the subject link (clears the FK
  -- RESTRICT), keep the consent event as GDPR proof. The bypass is the only
  -- sanctioned way past enforce_consent_append_only.
  perform set_config('app.consent_erasure_in_progress', 'true', true);
  update public.consent_records
    set subject_user_id = null, subject_group_id = null
    where subject_user_id = target_user_id
       or subject_group_id = v_target_personal_group_id;

  -- Reassign the target's DS-5 forum authorship -> the sentinel.
  -- DS-5's own disposition now (ADR-U047 Amendment 3): Core resolves the
  -- target (COALESCE keeps the fallback the inline UPDATE had) and passes it;
  -- DS-5 owns the reassignment. Same transaction, before the group delete.
  perform public.ds5_lifecycle_user_hard_deleted(
    v_target_personal_group_id,
    coalesce(v_deleted_user_group_id, v_caller_group_id));

  -- Reassign the target's DS-3 journeys + enrolment attributions -> the sentinel.
  -- DS-3's own disposition now (ADR-U047 Amendment 1): Core resolves the target
  -- (COALESCE keeps journeys.created_by_group_id NOT NULL) and passes it; DS-3
  -- owns the reassignment. Runs before the group delete (RESTRICT), same as the
  -- inline journeys reassignment it replaces.
  perform public.ds3_lifecycle_user_hard_deleted(
    v_target_personal_group_id,
    coalesce(v_deleted_user_group_id, v_caller_group_id));

  update public.groups
  set created_by_group_id = coalesce(v_deleted_user_group_id, v_caller_group_id)
  where created_by_group_id = v_target_personal_group_id
    and id != v_target_personal_group_id;

  update public.admin_audit_log
  set actor_group_id = v_deleted_user_group_id
  where actor_group_id = v_target_personal_group_id;

  -- Reassign actor FKs in membership/role tables
  update public.group_memberships
  set added_by_group_id = v_deleted_user_group_id
  where added_by_group_id = v_target_personal_group_id;

  update public.user_group_roles
  set assigned_by_group_id = v_deleted_user_group_id
  where assigned_by_group_id = v_target_personal_group_id;

  -- Enable bypass for immutability trigger and notification triggers (transaction-local)
  perform set_config('app.bypass_personal_group_id_immutability', 'true', true);
  perform set_config('app.hard_delete_in_progress', 'true', true);

  -- Delete personal group (CASCADE: memberships, roles, notifications, enrollments, conversations)
  delete from public.groups where id = v_target_personal_group_id;

  -- Delete user record
  delete from public.users where id = target_user_id;

  -- Delete auth user
  if v_target_auth_user_id is not null then
    delete from auth.users where id = v_target_auth_user_id;
  end if;

  return jsonb_build_object('success', true, 'deleted_user_id', target_user_id);
end;
$$;

COMMENT ON FUNCTION public.admin_hard_delete_user(UUID) IS
  'PC-4 admin lifecycle (re-issued FEAT-PC021 gate 2; ADM-F FEAT-PC025 WA-3): '
  'platform-admin-gated (42501) hard delete. Typed P0002 not-found. Audit '
  'member.hard_delete written BEFORE deletion; consent-subject anonymise '
  '(ADR-U034 §5 retain-as-proof, erase_fim_account''s leg, idempotent under '
  'that composition); sentinel reassignment cascade (forum via '
  'ds5_lifecycle_user_hard_deleted, journeys via '
  'ds3_lifecycle_user_hard_deleted, groups + actor FKs inline), then personal '
  'group CASCADE, users row, auth.users row. Composed by erase_fim_account '
  '(anonymise-then-delegate). SECURITY DEFINER; the privilege the cascade '
  'requires.';

-- ----------------------------------------------------------------------------
-- Part 3c — WA-4: admin_force_logout re-issue (per-session sign-out hints)
-- ----------------------------------------------------------------------------
-- Byte-stable to 20260801190000:399-438 except: session ids are captured
-- BEFORE the sweep and one session_revoked hint emits per swept session id on
-- the target's ADR-U039 session channel — revoke_own_session's non-fatal
-- pattern (20260703154102:130-135). The Hub guard keys on session_id, so the
-- hint must be per-session (the dossier's Hub §4 constraint); ds5_emit_hint is
-- NOT reused (trigger-path-only per its comment 20260720153000:114). Sweep
-- semantics unchanged: force sign-out is a sweep, not a lock — Suspend is the
-- lock.
CREATE OR REPLACE FUNCTION public.admin_force_logout(target_user_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_count INTEGER := 0;
  v_target_id UUID;
  v_target_auth_id UUID;
  v_session_ids UUID[];
  v_session_id UUID;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'platform administrator required' USING ERRCODE = '42501';
  END IF;
  v_caller_group_id := public.get_current_personal_group_id();

  FOREACH v_target_id IN ARRAY target_user_ids
  LOOP
    SELECT auth_user_id INTO v_target_auth_id
    FROM public.users WHERE id = v_target_id
    FOR UPDATE;

    IF v_target_auth_id IS NOT NULL THEN
      -- WA-4: capture the session ids BEFORE the sweep — the emission is
      -- per-session because the Hub guard acts only on a matching session_id.
      SELECT COALESCE(array_agg(s.id), '{}'::uuid[]) INTO v_session_ids
      FROM auth.sessions s WHERE s.user_id = v_target_auth_id;

      -- The same two-table pair delete_own_account uses (20260721170000:272-273).
      -- Refresh/session-layer revocation: an already-issued access JWT lives
      -- until its own expiry — the hint below is what makes the device find
      -- out in seconds instead (verify-on-signal, ADR-U039).
      DELETE FROM auth.refresh_tokens WHERE user_id = v_target_auth_id::text;
      DELETE FROM auth.sessions WHERE user_id = v_target_auth_id;
      v_count := v_count + 1;

      -- One hint per swept session id; a hint failure never fails the sweep
      -- (revoke_own_session's exception-guarded pattern, doctrine rules 5/6).
      FOREACH v_session_id IN ARRAY v_session_ids
      LOOP
        BEGIN
          PERFORM realtime.send(
            jsonb_build_object('session_id', v_session_id),
            'session_revoked',
            'account:' || v_target_auth_id::text || ':sessions',
            TRUE
          );
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END LOOP;
    END IF;
  END LOOP;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (v_caller_group_id, 'member.force_logout', 'users',
    jsonb_build_object('count', v_count, 'target_user_ids', to_jsonb(target_user_ids)));

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

COMMENT ON FUNCTION public.admin_force_logout(UUID[]) IS
  'PC-4 admin session control (re-issued FEAT-PC021 gate 2; ADM-F FEAT-PC025 '
  'WA-4): platform-admin-gated (42501) session revocation for the named '
  'targets — the auth.refresh_tokens + auth.sessions DELETE pair per target, '
  'now with one session_revoked hint per swept session id on the target''s '
  'ADR-U039 session channel (non-fatal; the app-wide Hub tenant signs the '
  'device out in seconds, verify-on-signal). Inactive targets valid; absent '
  'targets skipped (count returned). Audits member.force_logout. Revocation '
  'stays refresh/session-layer: a sweep, not a lock — Suspend is the lock.';
