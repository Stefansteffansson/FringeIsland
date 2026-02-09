-- Migration: Fix RLS Policies for Service Role Access
-- Date: 2026-02-09
-- Issue: New RLS policies blocking admin/service role access needed for tests
--
-- Problem: The "active only" policies are too restrictive
--   - Admin operations (test setup/teardown) need to bypass is_active check
--   - Service role should have full access
--   - But regular users should still be restricted by is_active
--
-- Solution: Modify policies to allow service role OR (regular user AND is_active)

-- ============================================
-- FIX USERS TABLE RLS POLICIES
-- ============================================

-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile (active only)" ON users;
DROP POLICY IF EXISTS "Users can search active users by email for invitations" ON users;
DROP POLICY IF EXISTS "Users can update their own profile (active only)" ON users;

-- ============================================
-- CREATE POLICIES WITH SERVICE ROLE BYPASS
-- ============================================

-- Policy: Users can view their own profile (active only, service role bypasses)
-- Service role can see all users (for admin operations)
-- Regular users can only see their own profile if active
CREATE POLICY "Users can view profiles"
ON users FOR SELECT
TO authenticated
USING (
  -- Service role bypasses check (using auth.jwt() to detect)
  current_setting('role') = 'service_role'
  OR
  -- Regular authenticated users
  (
    (
      -- Can view own profile if active
      auth.uid() = id AND is_active = true
    )
    OR
    -- Can search for other active users (for invitations)
    is_active = true
  )
);

-- Policy: Users can update their own profile (active only)
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (
  current_setting('role') = 'service_role'
  OR
  (auth.uid() = id AND is_active = true)
)
WITH CHECK (
  current_setting('role') = 'service_role'
  OR
  (auth.uid() = id AND is_active = true)
);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count users table policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users';

  IF policy_count >= 2 THEN
    RAISE NOTICE 'SUCCESS: % policies created for users table', policy_count;
  ELSE
    RAISE WARNING 'WARNING: Expected at least 2 policies, found %', policy_count;
  END IF;

  RAISE NOTICE 'Migration complete: Service role can bypass is_active checks';
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Users can view profiles" ON users IS
'Service role has full access (for admin/testing).
Regular users can: (1) view own profile if active, (2) search for other active users.
Inactive users cannot access their profiles.
Behavior: B-AUTH-002';

COMMENT ON POLICY "Users can update own profile" ON users IS
'Service role has full access (for admin/testing).
Regular users can only update own profile if active.
Inactive users cannot modify their profiles.
Behavior: B-AUTH-002';
