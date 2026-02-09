-- Migration: Clean Up Users RLS Policies
-- Date: 2026-02-09
-- Issue: Multiple conflicting RLS policies from previous migrations
--
-- Problem:
--   - Applied multiple migrations that created overlapping policies
--   - Some policies may not have been properly dropped
--   - Need to start fresh with correct policies
--
-- Solution: Drop ALL users policies, then create only the correct ones

-- ============================================
-- DROP ALL EXISTING POLICIES ON USERS TABLE
-- ============================================

-- Drop any and all policies that might exist
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can search other users by email for invitations" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile (active only)" ON users;
DROP POLICY IF EXISTS "Users can search active users by email for invitations" ON users;
DROP POLICY IF EXISTS "Users can update their own profile (active only)" ON users;
DROP POLICY IF EXISTS "Users can view profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "users_select_own_active" ON users;
DROP POLICY IF EXISTS "users_select_others_active" ON users;
DROP POLICY IF EXISTS "users_update_own_active" ON users;

-- Verify no policies remain
DO $$
DECLARE
  remaining_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users';

  IF remaining_policies = 0 THEN
    RAISE NOTICE 'SUCCESS: All users policies dropped (count: 0)';
  ELSE
    RAISE WARNING 'WARNING: % policies still exist on users table', remaining_policies;
  END IF;
END $$;

-- ============================================
-- CREATE CORRECT RLS POLICIES
-- ============================================

-- Policy 1: Users can view their own profile (only if active)
CREATE POLICY "users_select_own_if_active"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() = auth_user_id
  AND is_active = true
);

-- Policy 2: Users can search for other active users (for invitations)
CREATE POLICY "users_select_others_if_active"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() != auth_user_id
  AND is_active = true
);

-- Policy 3: Users can update their own profile (only if active)
CREATE POLICY "users_update_own_if_active"
ON users
FOR UPDATE
TO authenticated
USING (
  auth.uid() = auth_user_id
  AND is_active = true
)
WITH CHECK (
  auth.uid() = auth_user_id
  AND is_active = true
);

-- ============================================
-- FINAL VERIFICATION
-- ============================================

DO $$
DECLARE
  final_policy_count INTEGER;
  select_policy_count INTEGER;
  update_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO final_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users';

  SELECT COUNT(*) INTO select_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'SELECT';

  SELECT COUNT(*) INTO update_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'UPDATE';

  RAISE NOTICE 'Final policy count: %', final_policy_count;
  RAISE NOTICE '  - SELECT policies: %', select_policy_count;
  RAISE NOTICE '  - UPDATE policies: %', update_policy_count;

  IF final_policy_count = 3 AND select_policy_count = 2 AND update_policy_count = 1 THEN
    RAISE NOTICE 'SUCCESS: Exactly 3 policies (2 SELECT, 1 UPDATE)';
  ELSE
    RAISE WARNING 'UNEXPECTED: Expected 3 policies total, got %', final_policy_count;
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "users_select_own_if_active" ON users IS
'Users can ONLY view their OWN profile, and ONLY if is_active=true.
Inactive users cannot see their own profile.
Uses auth.uid() = auth_user_id for comparison.
Behavior: B-AUTH-002';

COMMENT ON POLICY "users_select_others_if_active" ON users IS
'Users can search for OTHER users (not themselves), but ONLY active users are visible.
Used for group invitations - users can search by email.
Inactive users are completely hidden from search.
Uses auth.uid() != auth_user_id to exclude self.
Behavior: B-AUTH-002';

COMMENT ON POLICY "users_update_own_if_active" ON users IS
'Users can ONLY update their OWN profile, and ONLY if is_active=true.
Inactive users cannot modify their profile or reactivate themselves.
Uses auth.uid() = auth_user_id for comparison.
Behavior: B-AUTH-002';

-- ============================================
-- TESTING NOTES
-- ============================================

-- Expected behavior after this migration:
--
-- Active user queries own profile:
--   - auth.uid() = auth_user_id ✓
--   - is_active = true ✓
--   - Result: Access GRANTED
--
-- Inactive user queries own profile:
--   - auth.uid() = auth_user_id ✓
--   - is_active = false ✗
--   - Result: Access DENIED (B-AUTH-002)
--
-- User searches for other active users:
--   - auth.uid() != auth_user_id ✓ (different user)
--   - is_active = true ✓
--   - Result: Other active users visible
--
-- User searches for inactive users:
--   - auth.uid() != auth_user_id ✓ (different user)
--   - is_active = false ✗
--   - Result: Inactive users HIDDEN
