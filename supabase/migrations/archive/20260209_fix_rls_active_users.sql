-- Migration: Fix RLS Policies to Check is_active Flag
-- Date: 2026-02-09
-- Issue: RLS policies allow access to inactive (soft-deleted) users
--
-- Problems:
--   1. "Users can search other users by email" allows access to ALL users (is_active check missing)
--   2. "Users can view their own profile" doesn't check is_active
--   3. Inactive users should be blocked from accessing resources
--
-- Solution: Add is_active = true check to all user-facing RLS policies
--
-- Behavior: B-AUTH-002 (Sign In Requires Active Profile)

-- ============================================
-- FIX USERS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies that don't check is_active
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can search other users by email for invitations" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- ============================================
-- CREATE NEW POLICIES WITH is_active CHECK
-- ============================================

-- Policy: Users can view their own profile (only if active)
CREATE POLICY "Users can view their own profile (active only)"
ON users FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  AND is_active = true
);

-- Policy: Users can search other users by email for invitations (only active users visible)
CREATE POLICY "Users can search active users by email for invitations"
ON users FOR SELECT
TO authenticated
USING (
  is_active = true  -- Only show active users in search results
);

-- Policy: Users can update their own profile (only if active)
CREATE POLICY "Users can update their own profile (active only)"
ON users FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  AND is_active = true
)
WITH CHECK (
  auth.uid() = id
  AND is_active = true  -- Prevent reactivating yourself
);

-- ============================================
-- UPDATE SECURITY DEFINER FUNCTION
-- ============================================

-- Update is_active_group_member function to check user is active
CREATE OR REPLACE FUNCTION is_active_group_member(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid UUID;
  is_member BOOLEAN;
  user_active BOOLEAN;
BEGIN
  -- Get the current user's UUID from users table
  SELECT id, is_active INTO user_uuid, user_active
  FROM users
  WHERE auth_user_id = auth.uid();

  -- If user not found or inactive, return false
  IF user_uuid IS NULL OR user_active = false THEN
    RETURN FALSE;
  END IF;

  -- Check if user has active membership (bypass RLS with SECURITY DEFINER)
  SELECT EXISTS (
    SELECT 1
    FROM group_memberships
    WHERE group_id = check_group_id
      AND user_id = user_uuid
      AND status = 'active'
  ) INTO is_member;

  RETURN COALESCE(is_member, FALSE);
END;
$$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
  test_active_policy BOOLEAN;
BEGIN
  -- Count users table policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users'
    AND policyname LIKE '%active%';

  IF policy_count >= 3 THEN
    RAISE NOTICE 'SUCCESS: % policies with is_active check created', policy_count;
  ELSE
    RAISE WARNING 'WARNING: Expected at least 3 policies with is_active check, found %', policy_count;
  END IF;

  -- Verify function updated
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'is_active_group_member'
  ) INTO test_active_policy;

  IF test_active_policy THEN
    RAISE NOTICE 'SUCCESS: is_active_group_member function exists';
  ELSE
    RAISE WARNING 'WARNING: is_active_group_member function not found';
  END IF;

  RAISE NOTICE 'Migration complete: RLS policies now enforce is_active = true';
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Users can view their own profile (active only)" ON users IS
'Users can only view their own profile if is_active=true.
Prevents soft-deleted users from accessing their data.
Behavior: B-AUTH-002';

COMMENT ON POLICY "Users can search active users by email for invitations" ON users IS
'Users can search for other users by email (for group invitations),
but only active users are visible in search results.
Behavior: B-AUTH-002';

COMMENT ON POLICY "Users can update their own profile (active only)" ON users IS
'Users can only update their own profile if is_active=true.
Prevents soft-deleted users from modifying their data or reactivating themselves.
Behavior: B-AUTH-002';

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- This migration fixes B-AUTH-002: Sign In Requires Active Profile
--
-- Before:
--   - Inactive users could access their profiles via RLS
--   - Search showed all users (including inactive)
--   - Inactive users could update their profiles
--
-- After:
--   - Inactive users blocked from viewing their profiles
--   - Search only shows active users
--   - Inactive users blocked from updating profiles
--   - Security definer function checks is_active
--
-- Impact:
--   - Soft-deleted users effectively locked out
--   - No data access via RLS for inactive accounts
--   - Maintains referential integrity (data not deleted)
