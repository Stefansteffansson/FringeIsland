-- Migration: Fix admin action triggers and RPC (Sub-Sprint 3C)
-- Date: 2026-02-20
-- Purpose: Fix three issues discovered during GREEN phase testing:
--
-- Issue 1: admin_force_logout RPC — type mismatch
--   auth.refresh_tokens.user_id is varchar, not UUID. Need explicit cast.
--
-- Issue 2: validate_user_group_role trigger — not SECURITY DEFINER
--   When an admin assigns a role in a foreign group, the trigger queries
--   group_roles but RLS blocks visibility (admin isn't a group member).
--   Result: "Role X does not belong to group Y" false positive.
--
-- Issue 3: prevent_last_leader_removal trigger — not SECURITY DEFINER + name check
--   Same RLS visibility problem as Issue 2, plus the trigger only checks
--   created_from_role_template_id. Roles created without templates (e.g.,
--   in test setup) are not recognized as Steward roles.
--
-- Fix 4: Admin SELECT on group_roles — admin dashboard needs to see all roles.

-- ============================================================================
-- 1. Fix admin_force_logout — cast UUID to text for auth table comparisons
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_force_logout(target_user_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID;
  v_target_auth_id UUID;
  v_count INT := 0;
  v_tid UUID;
BEGIN
  -- 1. Verify caller has manage_all_groups permission
  v_caller_id := public.get_current_user_profile_id();
  IF v_caller_id IS NULL OR NOT public.has_permission(
    v_caller_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups'
  ) THEN
    RAISE EXCEPTION 'Permission denied: requires manage_all_groups';
  END IF;

  -- 2. For each target user, revoke their sessions
  FOREACH v_tid IN ARRAY target_user_ids LOOP
    SELECT auth_user_id INTO v_target_auth_id
    FROM public.users
    WHERE id = v_tid;

    IF v_target_auth_id IS NOT NULL THEN
      -- auth.refresh_tokens.user_id is varchar, needs text cast
      DELETE FROM auth.refresh_tokens
      WHERE user_id = v_target_auth_id::text;

      -- auth.sessions.user_id is UUID, no cast needed
      DELETE FROM auth.sessions
      WHERE user_id = v_target_auth_id;

      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- 3. Audit log
  INSERT INTO public.admin_audit_log (actor_user_id, action, target, metadata)
  VALUES (
    v_caller_id,
    'admin_force_logout',
    'users',
    jsonb_build_object(
      'user_count', v_count,
      'target_user_ids', to_jsonb(target_user_ids)
    )
  );

  RETURN jsonb_build_object('success', true, 'count', v_count);
END;
$$;

-- ============================================================================
-- 2. Fix validate_user_group_role — add SECURITY DEFINER
--    Trigger must see all group_roles regardless of caller's group memberships.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_user_group_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.group_roles
    WHERE id = NEW.group_role_id
      AND group_id = NEW.group_id
  ) THEN
    RAISE EXCEPTION 'Role % does not belong to group %', NEW.group_role_id, NEW.group_id;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. Fix prevent_last_leader_removal — SECURITY DEFINER + name fallback
--    a) SECURITY DEFINER so trigger can see group_roles in any group
--    b) Also check role name = 'Steward' as fallback when no template ID
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_last_leader_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  leader_count INTEGER;
  is_leader_role BOOLEAN;
  steward_template_id UUID;
BEGIN
  -- Get the Steward template ID (may be NULL if templates not seeded)
  SELECT id INTO steward_template_id
  FROM public.role_templates
  WHERE name = 'Steward Role Template';

  -- Check if the role being removed is a Steward role
  -- Check both template ID AND role name for robustness
  SELECT EXISTS (
    SELECT 1
    FROM public.group_roles
    WHERE id = OLD.group_role_id
      AND (
        (steward_template_id IS NOT NULL AND created_from_role_template_id = steward_template_id)
        OR name = 'Steward'
      )
  ) INTO is_leader_role;

  -- If not a steward role, allow deletion
  IF NOT is_leader_role THEN
    RETURN OLD;
  END IF;

  -- Count remaining Steward role holders in the group (excluding the one being removed)
  SELECT COUNT(*)
  INTO leader_count
  FROM public.user_group_roles ugr
  JOIN public.group_roles gr ON ugr.group_role_id = gr.id
  WHERE ugr.group_id = OLD.group_id
    AND (
      (steward_template_id IS NOT NULL AND gr.created_from_role_template_id = steward_template_id)
      OR gr.name = 'Steward'
    )
    AND ugr.id != OLD.id;

  -- If this is the last steward, prevent deletion
  IF leader_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last Steward from the group. Assign another Steward first.';
  END IF;

  RETURN OLD;
END;
$$;

-- ============================================================================
-- 4. Admin SELECT on group_roles — admin can see roles in all groups
-- ============================================================================

CREATE POLICY "deusex_admin_select_all_group_roles"
ON public.group_roles FOR SELECT TO authenticated
USING (
  public.has_permission(
    public.get_current_user_profile_id(),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'manage_all_groups'
  )
);

-- ============================================================================
-- Verify
-- ============================================================================

DO $$
DECLARE
  v_policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'deusex_admin_select_all_group_roles'
  ) INTO v_policy_exists;

  IF NOT v_policy_exists THEN
    RAISE EXCEPTION 'Admin group_roles SELECT policy not created!';
  END IF;

  RAISE NOTICE 'All fixes applied successfully';
END $$;
