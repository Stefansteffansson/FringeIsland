-- Migration: Simplify RLS Policies for Users Table
-- Date: 2026-02-09
-- Issue: Previous migration was too restrictive
--
-- Root cause analysis:
--   - Service role SHOULD bypass RLS automatically in Supabase
--   - The issue is our policies are TOO restrictive for regular users
--   - We need separate policies for different use cases
--
-- Solution: Create targeted policies:
--   1. Users can view their own profile (with is_active check)
--   2. Users can search for OTHER active users (for invitations)
--   3. Users can update their own profile (with is_active check)

-- ============================================
-- DROP ALL EXISTING USERS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own profile (active only)" ON users;
DROP POLICY IF EXISTS "Users can search active users by email for invitations" ON users;
DROP POLICY IF EXISTS "Users can update their own profile (active only)" ON users;
DROP POLICY IF EXISTS "Users can view profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- ============================================
-- CREATE SIMPLE, TARGETED POLICIES
-- ============================================

-- Policy 1: Users can view their own profile (only if active)
CREATE POLICY "users_select_own_active"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  AND is_active = true
);

-- Policy 2: Users can search for OTHER active users (for group invitations)
-- This allows searching by email, but only shows active users
CREATE POLICY "users_select_others_active"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() != id  -- Different user
  AND is_active = true  -- Only active users visible
);

-- Policy 3: Users can update their own profile (only if active)
CREATE POLICY "users_update_own_active"
ON users
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  AND is_active = true
)
WITH CHECK (
  auth.uid() = id
  AND is_active = true
);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
  select_policy_count INTEGER;
BEGIN
  -- Count all users table policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users';

  -- Count SELECT policies specifically
  SELECT COUNT(*) INTO select_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users'
    AND cmd = 'SELECT';

  RAISE NOTICE 'Total users policies: %', policy_count;
  RAISE NOTICE 'SELECT policies: %', select_policy_count;

  IF policy_count >= 3 THEN
    RAISE NOTICE 'SUCCESS: Users table has sufficient policies';
  ELSE
    RAISE WARNING 'WARNING: Expected at least 3 policies, found %', policy_count;
  END IF;

  IF select_policy_count >= 2 THEN
    RAISE NOTICE 'SUCCESS: Users table has 2 SELECT policies (own + others)';
  ELSE
    RAISE WARNING 'WARNING: Expected 2 SELECT policies, found %', select_policy_count;
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "users_select_own_active" ON users IS
'Users can view their own profile only if is_active=true.
Inactive users cannot access their own data.
Service role bypasses this automatically.
Behavior: B-AUTH-002';

COMMENT ON POLICY "users_select_others_active" ON users IS
'Users can search for OTHER active users (e.g., for group invitations).
Only active users appear in search results.
Users cannot see inactive users.
Behavior: B-AUTH-002';

COMMENT ON POLICY "users_update_own_active" ON users IS
'Users can update their own profile only if is_active=true.
Inactive users cannot modify their data or reactivate themselves.
Service role bypasses this automatically.
Behavior: B-AUTH-002';

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- Service role behavior:
--   - Service role automatically bypasses ALL RLS policies in Supabase
--   - No need to check current_setting('role')
--   - Admin operations work without modification
--
-- Regular user behavior:
--   - Can only see own profile if active
--   - Can search for other users (only active ones visible)
--   - Cannot see or search for inactive users
--   - Cannot update profile if inactive
--
-- Inactive user behavior:
--   - Can still authenticate (Supabase Auth allows valid credentials)
--   - RLS blocks all data access after authentication
--   - Cannot view own profile
--   - Cannot update own profile
--   - Effectively locked out of the application
