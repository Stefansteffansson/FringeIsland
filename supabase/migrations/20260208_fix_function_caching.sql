-- Migration: Fix Function Caching Issue
-- Date: 2026-02-08
-- Issue: is_active_group_member() may be cached, preventing immediate RLS re-evaluation
--
-- Solution: Explicitly mark function as VOLATILE to force re-evaluation on every call

-- ============================================
-- UPDATE FUNCTION TO BE EXPLICITLY VOLATILE
-- ============================================

CREATE OR REPLACE FUNCTION is_active_group_member(check_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE  -- ← Explicitly VOLATILE to prevent caching
SET search_path = public
AS $$
DECLARE
  user_uuid UUID;
  is_member BOOLEAN;
BEGIN
  -- Get the current user's UUID from users table
  SELECT id INTO user_uuid
  FROM users
  WHERE auth_user_id = auth.uid();

  -- If user not found, return false
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has active membership (bypass RLS with SECURITY DEFINER)
  -- This query will always execute fresh, not cached
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
-- VERIFY FUNCTION VOLATILITY
-- ============================================

DO $$
DECLARE
  func_volatility CHAR(1);
BEGIN
  -- Check function volatility (should be 'v' for VOLATILE)
  SELECT provolatile INTO func_volatility
  FROM pg_proc
  WHERE proname = 'is_active_group_member'
    AND pronamespace = 'public'::regnamespace;

  IF func_volatility = 'v' THEN
    RAISE NOTICE 'SUCCESS: Function is VOLATILE (will re-evaluate on every call)';
  ELSIF func_volatility = 's' THEN
    RAISE WARNING 'Function is STABLE (may cache within transaction)';
  ELSIF func_volatility = 'i' THEN
    RAISE WARNING 'Function is IMMUTABLE (will cache results)';
  ELSE
    RAISE WARNING 'Function volatility unknown: %', func_volatility;
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION is_active_group_member(UUID) IS
'VOLATILE security definer function to check active group membership.
Marked VOLATILE to ensure fresh evaluation on every call and prevent caching issues.
This ensures RLS policies immediately reflect membership status changes.';
