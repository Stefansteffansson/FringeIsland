-- Migration: Add SELECT policies for catalog/reference tables
-- Date: 2026-02-11
--
-- Problem: RLS was enabled on role_templates, group_templates,
--   role_template_permissions, and group_template_roles in migration
--   20260208_enable_rls_all_tables.sql, but no SELECT policies were ever
--   added. With RLS enabled and no policies, ALL queries return 0 rows
--   (or 406 Not Acceptable for .single() calls).
--
-- Impact:
--   - GroupCreateForm dropdown is empty (group_templates inaccessible)
--   - Group creation fails at step 3 (role_templates lookup returns 0 rows)
--   - Anything reading these catalog tables fails for authenticated users
--
-- Fix: Add "authenticated users can read all" SELECT policies on these
--   catalog/reference tables. They contain no private data — they are
--   shared system-level templates readable by all authenticated users.
--

-- ============================================
-- group_templates: SELECT policy
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can read group templates" ON group_templates;

CREATE POLICY "Authenticated users can read group templates"
ON group_templates
FOR SELECT
TO authenticated
USING (true);

COMMENT ON POLICY "Authenticated users can read group templates" ON group_templates IS
'All authenticated users can read group templates (public catalog data).';

-- ============================================
-- role_templates: SELECT policy
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can read role templates" ON role_templates;

CREATE POLICY "Authenticated users can read role templates"
ON role_templates
FOR SELECT
TO authenticated
USING (true);

COMMENT ON POLICY "Authenticated users can read role templates" ON role_templates IS
'All authenticated users can read role templates (public catalog data).';

-- ============================================
-- role_template_permissions: SELECT policy
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can read role template permissions" ON role_template_permissions;

CREATE POLICY "Authenticated users can read role template permissions"
ON role_template_permissions
FOR SELECT
TO authenticated
USING (true);

COMMENT ON POLICY "Authenticated users can read role template permissions" ON role_template_permissions IS
'All authenticated users can read role template permissions (public catalog data).';

-- ============================================
-- group_template_roles: SELECT policy
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can read group template roles" ON group_template_roles;

CREATE POLICY "Authenticated users can read group template roles"
ON group_template_roles
FOR SELECT
TO authenticated
USING (true);

COMMENT ON POLICY "Authenticated users can read group template roles" ON group_template_roles IS
'All authenticated users can read group template roles (public catalog data).';

-- ============================================
-- VERIFY
-- ============================================

DO $$
DECLARE
  missing_policies TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'group_templates' AND cmd = 'SELECT'
  ) THEN
    missing_policies := array_append(missing_policies, 'group_templates SELECT');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'role_templates' AND cmd = 'SELECT'
  ) THEN
    missing_policies := array_append(missing_policies, 'role_templates SELECT');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'role_template_permissions' AND cmd = 'SELECT'
  ) THEN
    missing_policies := array_append(missing_policies, 'role_template_permissions SELECT');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'group_template_roles' AND cmd = 'SELECT'
  ) THEN
    missing_policies := array_append(missing_policies, 'group_template_roles SELECT');
  END IF;

  IF array_length(missing_policies, 1) > 0 THEN
    RAISE EXCEPTION 'Missing SELECT policies: %', array_to_string(missing_policies, ', ');
  END IF;

  RAISE NOTICE 'SELECT policies created for: group_templates, role_templates, role_template_permissions, group_template_roles';
  RAISE NOTICE 'Migration completed successfully!';
END $$;
