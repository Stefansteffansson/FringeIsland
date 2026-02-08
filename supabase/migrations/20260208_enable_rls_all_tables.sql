-- Migration: Enable RLS on ALL Tables
-- Date: 2026-02-08
-- Issue: RLS was disabled on most tables - CRITICAL SECURITY ISSUE
--
-- This migration ensures Row Level Security is enabled on all tables
-- that require access control. This is a critical security fix.
--
-- ⚠️  WARNING: If RLS is disabled, authenticated users can access ALL data
-- regardless of permissions. This is a major security vulnerability.

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

-- Core user and profile tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Group-related tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_group_roles ENABLE ROW LEVEL SECURITY;

-- Journey-related tables
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_enrollments ENABLE ROW LEVEL SECURITY;

-- Template and permission tables (these can be public read)
-- But still enable RLS for consistency and future flexibility
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_template_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_template_roles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFY RLS IS ENABLED
-- ============================================

DO $$
DECLARE
  tables_without_rls TEXT[];
  table_name TEXT;
BEGIN
  -- Check all tables for RLS status
  SELECT ARRAY_AGG(tablename)
  INTO tables_without_rls
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'users', 'groups', 'group_memberships', 'group_roles',
      'group_role_permissions', 'user_group_roles', 'journeys',
      'journey_enrollments', 'permissions', 'role_templates',
      'group_templates', 'role_template_permissions', 'group_template_roles'
    )
    AND tablename NOT IN (
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND rowsecurity = true
    );

  IF tables_without_rls IS NOT NULL AND array_length(tables_without_rls, 1) > 0 THEN
    RAISE EXCEPTION 'RLS is NOT enabled on the following tables: %', array_to_string(tables_without_rls, ', ');
  ELSE
    RAISE NOTICE 'SUCCESS: RLS is enabled on all required tables';
  END IF;
END $$;

-- ============================================
-- VERIFY CRITICAL POLICIES EXIST
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Check that groups table has SELECT policy
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'groups'
    AND cmd = 'SELECT';

  IF policy_count = 0 THEN
    RAISE WARNING 'No SELECT policies found on groups table - queries will fail!';
  ELSE
    RAISE NOTICE 'Found % SELECT policy(ies) on groups table', policy_count;
  END IF;

  -- Check that users table has policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users';

  IF policy_count = 0 THEN
    RAISE WARNING 'No policies found on users table - queries will fail!';
  ELSE
    RAISE NOTICE 'Found % policy(ies) on users table', policy_count;
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'RLS enabled. Users can view/edit their own profile.';
COMMENT ON TABLE groups IS 'RLS enabled. Users can view public groups or groups they are active members of.';
COMMENT ON TABLE group_memberships IS 'RLS enabled. Users can view memberships in their groups.';
COMMENT ON TABLE journeys IS 'RLS enabled. Users can view published journeys.';
COMMENT ON TABLE journey_enrollments IS 'RLS enabled. Users can view their own enrollments.';

-- ============================================
-- TESTING NOTES
-- ============================================

-- To verify RLS is enabled on all tables:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename NOT LIKE 'pg_%'
--   AND tablename NOT LIKE 'sql_%'
-- ORDER BY tablename;

-- To check which tables have RLS disabled:
-- SELECT tablename
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND rowsecurity = false
--   AND tablename NOT LIKE 'pg_%'
-- ORDER BY tablename;
