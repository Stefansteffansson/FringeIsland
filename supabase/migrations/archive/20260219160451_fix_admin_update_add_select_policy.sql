-- Migration: Fix admin UPDATE by adding admin SELECT policy
-- Date: 2026-02-19
-- Issue: PostgreSQL requires the NEW row after UPDATE to be visible under
--        SELECT policies. The existing SELECT policies on users only show
--        rows with is_active = true. When an admin sets is_active = false,
--        the NEW row becomes invisible to SELECT policies, causing:
--        ERROR 42501 "new row violates row-level security policy"
--
-- Fix: Add a SELECT policy for DeusEx admins that shows ALL users
--      (regardless of is_active or is_decommissioned status).
--
-- Also: Revert the admin UPDATE policy WITH CHECK from 'true' (temporary
--       hotfix) back to has_permission() for consistency and security.

-- ============================================================================
-- 1. Add admin SELECT policy on users (the actual fix)
-- ============================================================================

CREATE POLICY "deusex_admin_select_all_users"
ON public.users FOR SELECT TO authenticated
USING (
  public.has_permission(
    public.get_current_user_profile_id(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manage_all_groups'
  )
);

-- ============================================================================
-- 2. Revert admin UPDATE policy WITH CHECK to has_permission()
--    (was hotfixed to 'true' during debugging; now that SELECT policy exists,
--    the proper WITH CHECK can be restored)
-- ============================================================================

DROP POLICY IF EXISTS "deusex_admin_update_users" ON public.users;

CREATE POLICY "deusex_admin_update_users"
ON public.users FOR UPDATE TO authenticated
USING (
  public.has_permission(
    public.get_current_user_profile_id(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manage_all_groups'
  )
)
WITH CHECK (
  public.has_permission(
    public.get_current_user_profile_id(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manage_all_groups'
  )
);
