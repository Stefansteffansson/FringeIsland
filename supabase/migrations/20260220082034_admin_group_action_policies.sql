-- Migration: Admin Group Action RLS Policies (Sub-Sprint 3C)
-- Date: 2026-02-20
-- Purpose: Add DeusEx admin override policies for group_memberships and
--          user_group_roles tables, enabling admin invite/join/remove operations.
--
-- Root cause addressed: The existing "Platform admins can remove members" DELETE
-- policy on group_memberships was silently failing because PostgREST's
-- DELETE ... RETURNING requires the row to also pass SELECT policies.
-- The only SELECT policy required group membership, which admins operating
-- on foreign groups don't have. Same pattern as the users table fix in
-- migration 20260219160451.
--
-- Changes:
--   1. Admin SELECT on group_memberships (fixes DELETE, enables dashboard)
--   2. Admin INSERT on group_memberships (invite + join operations)
--   3. Admin SELECT on user_group_roles (fixes DELETE, enables dashboard)
--   4. Admin INSERT on user_group_roles (assign roles in any group)
--   5. Admin DELETE on user_group_roles (remove roles from any group)
--
-- Note: Admin DELETE on group_memberships already exists:
--   "Platform admins can remove members" (migration 20260217171844)

-- ============================================================================
-- 1. Admin SELECT on group_memberships
-- ============================================================================

CREATE POLICY "deusex_admin_select_all_memberships"
ON public.group_memberships FOR SELECT TO authenticated
USING (
  public.has_permission(
    public.get_current_user_profile_id(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manage_all_groups'
  )
);

-- ============================================================================
-- 2. Admin INSERT on group_memberships
-- ============================================================================

CREATE POLICY "deusex_admin_insert_memberships"
ON public.group_memberships FOR INSERT TO authenticated
WITH CHECK (
  public.has_permission(
    public.get_current_user_profile_id(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manage_all_groups'
  )
);

-- ============================================================================
-- 3. Admin SELECT on user_group_roles
-- ============================================================================

CREATE POLICY "deusex_admin_select_all_role_assignments"
ON public.user_group_roles FOR SELECT TO authenticated
USING (
  public.has_permission(
    public.get_current_user_profile_id(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manage_all_groups'
  )
);

-- ============================================================================
-- 4. Admin INSERT on user_group_roles
-- ============================================================================

CREATE POLICY "deusex_admin_insert_role_assignments"
ON public.user_group_roles FOR INSERT TO authenticated
WITH CHECK (
  public.has_permission(
    public.get_current_user_profile_id(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manage_all_groups'
  )
);

-- ============================================================================
-- 5. Admin DELETE on user_group_roles
-- ============================================================================

CREATE POLICY "deusex_admin_delete_role_assignments"
ON public.user_group_roles FOR DELETE TO authenticated
USING (
  public.has_permission(
    public.get_current_user_profile_id(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manage_all_groups'
  )
);

-- ============================================================================
-- Verify all 5 policies were created
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE policyname IN (
    'deusex_admin_select_all_memberships',
    'deusex_admin_insert_memberships',
    'deusex_admin_select_all_role_assignments',
    'deusex_admin_insert_role_assignments',
    'deusex_admin_delete_role_assignments'
  );

  IF v_count != 5 THEN
    RAISE EXCEPTION 'Expected 5 new policies, found %', v_count;
  END IF;

  RAISE NOTICE 'All 5 admin group action policies created successfully';
END $$;
