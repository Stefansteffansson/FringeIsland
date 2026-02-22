-- Migration: Add SELECT policy for permissions catalog table
-- Date: 2026-02-16
--
-- Problem: RLS was enabled on the `permissions` table in migration
--   20260208_enable_rls_all_tables.sql, but no SELECT policy was added.
--   The catalog table migration (20260211) added policies for
--   group_templates, role_templates, role_template_permissions, and
--   group_template_roles — but missed `permissions`.
--
-- Impact:
--   - PermissionPicker in RoleFormModal returns 0 permissions
--   - "View Permissions" checklist in RoleManagementSection shows empty
--   - Any query on `permissions` table returns 0 rows for authenticated users
--
-- Fix: Add "authenticated users can read all" SELECT policy.
--   The permissions table is a system catalog — no private data.

DROP POLICY IF EXISTS "Authenticated users can read permissions" ON permissions;

CREATE POLICY "Authenticated users can read permissions"
ON permissions
FOR SELECT
TO authenticated
USING (true);

COMMENT ON POLICY "Authenticated users can read permissions" ON permissions IS
'All authenticated users can read the permissions catalog (public system data).';

-- Verify
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'permissions' AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'Missing SELECT policy on permissions table';
  END IF;

  RAISE NOTICE 'SELECT policy created for permissions table';
END $$;
