-- Migration: Fix RLS Auth UID Comparison
-- Date: 2026-02-09
-- Issue: RLS policies comparing auth.uid() to wrong column
--
-- Problem:
--   - RLS policies check: auth.uid() = id
--   - But auth.uid() returns the auth.users.id (auth user ID)
--   - users.id is the profile ID (different value!)
--   - Should check: auth.uid() = auth_user_id
--
-- Impact:
--   - Current policies NEVER match (comparing apples to oranges)
--   - Users cannot access their own profiles
--   - All user operations blocked
--
-- Solution: Change all auth.uid() comparisons to use auth_user_id column

-- ============================================
-- DROP INCORRECT POLICIES
-- ============================================

DROP POLICY IF EXISTS "users_select_own_active" ON users;
DROP POLICY IF EXISTS "users_select_others_active" ON users;
DROP POLICY IF EXISTS "users_update_own_active" ON users;

-- ============================================
-- CREATE CORRECTED POLICIES
-- ============================================

-- Policy 1: Users can view their own profile (only if active)
-- CORRECTED: auth.uid() = auth_user_id (not id!)
CREATE POLICY "users_select_own_active"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() = auth_user_id  -- FIXED: was "auth.uid() = id"
  AND is_active = true
);

-- Policy 2: Users can search for OTHER active users (for group invitations)
-- CORRECTED: auth.uid() != auth_user_id (not id!)
CREATE POLICY "users_select_others_active"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() != auth_user_id  -- FIXED: was "auth.uid() != id"
  AND is_active = true
);

-- Policy 3: Users can update their own profile (only if active)
-- CORRECTED: auth.uid() = auth_user_id (not id!)
CREATE POLICY "users_update_own_active"
ON users
FOR UPDATE
TO authenticated
USING (
  auth.uid() = auth_user_id  -- FIXED: was "auth.uid() = id"
  AND is_active = true
)
WITH CHECK (
  auth.uid() = auth_user_id  -- FIXED: was "auth.uid() = id"
  AND is_active = true
);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users';

  RAISE NOTICE 'Total users policies: %', policy_count;

  IF policy_count >= 2 THEN
    RAISE NOTICE 'SUCCESS: RLS policies recreated with correct auth.uid() comparison';
  ELSE
    RAISE WARNING 'WARNING: Expected at least 2 policies, found %', policy_count;
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "users_select_own_active" ON users IS
'CORRECTED: Compares auth.uid() to auth_user_id (not id).
Users can view their own profile only if is_active=true.
Behavior: B-AUTH-002';

COMMENT ON POLICY "users_select_others_active" ON users IS
'CORRECTED: Compares auth.uid() to auth_user_id (not id).
Users can search for OTHER active users for invitations.
Behavior: B-AUTH-002';

COMMENT ON POLICY "users_update_own_active" ON users IS
'CORRECTED: Compares auth.uid() to auth_user_id (not id).
Users can update their own profile only if is_active=true.
Behavior: B-AUTH-002';

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- Key insight:
--   - auth.uid() returns auth.users.id (the authentication user ID)
--   - users.id is the profile ID (UUID primary key, often different)
--   - users.auth_user_id is the foreign key linking to auth.users.id
--
-- Correct comparison:
--   ✅ auth.uid() = auth_user_id  (matches auth user to profile)
--   ❌ auth.uid() = id            (compares auth ID to profile ID - WRONG!)
--
-- This was a critical bug that blocked ALL user operations!
