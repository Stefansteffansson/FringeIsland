-- RBAC Sub-Sprint 4: Fix nested RLS in group_role_permissions policies
--
-- Problem: The INSERT policy on group_role_permissions uses subqueries
-- on group_roles and permissions tables, which are subject to RLS themselves.
-- This causes legitimate INSERTs to fail even when the user has manage_roles.
--
-- Fix: Create SECURITY DEFINER helper functions that bypass RLS for
-- the subqueries, following the project convention from MEMORY.md.

-- ============================================================================
-- 1. Helper: get group_id from a group_role_id (bypasses RLS on group_roles)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_group_id_for_role(p_group_role_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT group_id
  FROM public.group_roles
  WHERE id = p_group_role_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_group_id_for_role(UUID) TO authenticated;

-- ============================================================================
-- 2. Helper: get permission name from a permission_id (bypasses RLS on permissions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_permission_name(p_permission_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT name
  FROM public.permissions
  WHERE id = p_permission_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_permission_name(UUID) TO authenticated;

-- ============================================================================
-- 3. Replace the INSERT policy on group_role_permissions using helpers
-- ============================================================================

DROP POLICY IF EXISTS "manage_role_perms_insert" ON public.group_role_permissions;

CREATE POLICY "manage_role_perms_insert"
ON public.group_role_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  -- User has manage_roles in the role's group
  public.has_permission(
    public.get_current_user_profile_id(),
    public.get_group_id_for_role(group_role_id),
    'manage_roles'
  )
  -- Anti-escalation: user must hold the permission they're granting
  AND public.has_permission(
    public.get_current_user_profile_id(),
    public.get_group_id_for_role(group_role_id),
    public.get_permission_name(permission_id)
  )
);

-- ============================================================================
-- 4. Replace the DELETE policy on group_role_permissions using helper
-- ============================================================================

DROP POLICY IF EXISTS "manage_role_perms_delete" ON public.group_role_permissions;

CREATE POLICY "manage_role_perms_delete"
ON public.group_role_permissions
FOR DELETE
TO authenticated
USING (
  public.has_permission(
    public.get_current_user_profile_id(),
    public.get_group_id_for_role(group_role_id),
    'manage_roles'
  )
);
