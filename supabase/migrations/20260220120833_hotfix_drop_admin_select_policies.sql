-- HOTFIX: Drop admin SELECT policies that use has_permission()
-- These cause ALL authenticated SELECT queries to evaluate has_permission(),
-- which hangs the query for non-admin users on resource-constrained databases.
--
-- Admin queries already bypass RLS via the service_role API route (Tier 1B),
-- so these policies are unnecessary.

-- 1. Drop admin SELECT policy on users table
DROP POLICY IF EXISTS "deusex_admin_select_all_users" ON public.users;

-- 2. Drop admin SELECT policy on group_memberships table
DROP POLICY IF EXISTS "deusex_admin_select_all_memberships" ON public.group_memberships;

-- 3. Drop admin SELECT policy on user_group_roles table
DROP POLICY IF EXISTS "deusex_admin_select_all_role_assignments" ON public.user_group_roles;

-- 4. Remove has_permission() branch from groups SELECT policy
-- Current policy has 5 OR branches including has_permission().
-- Replace with 4 branches (admin uses service_role, not RLS).
DROP POLICY IF EXISTS "groups_select_by_creator_or_member" ON public.groups;

CREATE POLICY "groups_select_by_creator_or_member"
ON public.groups
FOR SELECT
TO authenticated
USING (
  is_public = true
  OR public.is_active_group_member(id)
  OR public.is_invited_group_member(id)
  OR created_by_user_id = public.get_current_user_profile_id()
);

-- 5. Drop admin SELECT/INSERT policies on admin_audit_log
-- Admin panel writes audit logs via service_role, not client-side RLS.
DROP POLICY IF EXISTS "deusex_admin_select_audit_log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "deusex_admin_insert_audit_log" ON public.admin_audit_log;
