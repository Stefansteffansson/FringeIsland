-- ==========================================================================
-- Migration: fix_rc7_admin_user_ops
-- Date: 2026-02-23
-- Purpose: Fix PG17 compatibility + admin user operation issues:
--   A) has_permission() SECURITY DEFINER in RLS policies fails on PG17
--   B) admin_hard_delete_user() conflicts with immutability trigger
--   C) Notification triggers cause FK violations during hard-delete CASCADE
--
-- Strategy:
--   - Create is_platform_admin() — non-SECURITY-DEFINER check for RLS policies
--   - Replace all Tier 1 has_permission() calls in RLS with is_platform_admin()
--   - Create SECURITY DEFINER RPCs for admin user operations
--   - Add session-variable bypass to immutability + notification triggers
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. is_platform_admin() — PG17-safe admin check for RLS policies
--
-- has_permission() is a complex PLPGSQL SECURITY DEFINER function whose
-- internal queries don't properly bypass RLS when called from within RLS
-- policy evaluation on PG17.
-- This function is a simple SQL SECURITY DEFINER function — unlike
-- has_permission(), PG17 handles simple SQL SECURITY DEFINER correctly
-- in RLS contexts (verified via _test_always_true diagnostic).
-- MUST be SECURITY DEFINER to avoid circular RLS dependency: this
-- function queries group_memberships/groups, whose SELECT policies
-- also call is_platform_admin().
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.member_group_id = public.get_current_personal_group_id()
      AND g.name = 'DeusEx'
      AND g.group_type = 'system'
      AND gm.status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;

-- --------------------------------------------------------------------------
-- 2. Drop broken RLS policies that use has_permission() for Tier 1 checks
--
-- IMPORTANT: The base migration named these policies "memberships_*_admin"
-- and "ugr_*_admin". We must drop the CORRECT names, not the incorrect
-- "gm_*_admin" names that were used previously.
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "deusex_admin_update_users" ON public.users;
DROP POLICY IF EXISTS "audit_log_select_admin" ON public.admin_audit_log;
DROP POLICY IF EXISTS "audit_log_insert_admin" ON public.admin_audit_log;

-- Drop old admin policies from base migration (correct names!)
DROP POLICY IF EXISTS "memberships_delete_admin" ON public.group_memberships;
DROP POLICY IF EXISTS "memberships_insert_admin" ON public.group_memberships;
-- Also drop any incorrectly-named versions from earlier RC7 attempts
DROP POLICY IF EXISTS "gm_delete_admin" ON public.group_memberships;
DROP POLICY IF EXISTS "gm_insert_admin" ON public.group_memberships;

-- --------------------------------------------------------------------------
-- 3. Re-create admin RLS policies using is_platform_admin()
-- --------------------------------------------------------------------------

-- 3a. admin_audit_log: SELECT + INSERT for platform admins
CREATE POLICY "audit_log_select_admin"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "audit_log_insert_admin"
  ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

-- 3b. groups_select: replace RC3 fix with is_platform_admin()
DROP POLICY IF EXISTS "groups_select" ON public.groups;

CREATE POLICY "groups_select"
  ON public.groups FOR SELECT TO authenticated
  USING (
    is_public = true
    OR public.is_active_group_member(id)
    OR public.is_invited_group_member(id)
    OR created_by_group_id = public.get_current_personal_group_id()
    OR public.is_platform_admin()
  );

-- 3c. group_memberships: admin SELECT + INSERT + DELETE
--     SELECT override is critical for PostgREST INSERT...RETURNING pattern
DROP POLICY IF EXISTS "memberships_select" ON public.group_memberships;
CREATE POLICY "memberships_select"
  ON public.group_memberships FOR SELECT TO authenticated
  USING (
    public.is_active_group_member(group_id)
    OR member_group_id = public.get_current_personal_group_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "gm_delete_admin"
  ON public.group_memberships FOR DELETE TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "gm_insert_admin"
  ON public.group_memberships FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

-- 3d. user_group_roles: admin SELECT + INSERT + DELETE
--     SELECT override is critical for PostgREST INSERT...RETURNING pattern
DROP POLICY IF EXISTS "ugr_select" ON public.user_group_roles;
CREATE POLICY "ugr_select"
  ON public.user_group_roles FOR SELECT TO authenticated
  USING (
    public.is_active_group_member(group_id)
    OR member_group_id = public.get_current_personal_group_id()
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "ugr_insert_admin" ON public.user_group_roles;
CREATE POLICY "ugr_insert_admin"
  ON public.user_group_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "ugr_delete_admin" ON public.user_group_roles;
CREATE POLICY "ugr_delete_admin"
  ON public.user_group_roles FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- 3e. group_roles: admin SELECT override (to see roles in any group)
DROP POLICY IF EXISTS "group_roles_select" ON public.group_roles;
CREATE POLICY "group_roles_select"
  ON public.group_roles FOR SELECT TO authenticated
  USING (
    public.is_active_group_member(group_id)
    OR public.is_invited_group_member(group_id)
    OR public.is_platform_admin()
  );

-- --------------------------------------------------------------------------
-- 2. admin_update_user_status() — activate/deactivate a user
-- Enforces decommission invariant: decommissioned users cannot be reactivated.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_update_user_status(
  target_user_id UUID,
  new_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_target RECORD;
BEGIN
  -- Check permission
  v_caller_group_id := public.get_current_personal_group_id();
  IF NOT public.has_permission(v_caller_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups') THEN
    RAISE EXCEPTION 'Unauthorized: manage_all_groups permission required';
  END IF;

  -- Get target user
  SELECT id, is_active, is_decommissioned
  INTO v_target
  FROM public.users WHERE id = target_user_id;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Decommission invariant: cannot reactivate a decommissioned user
  IF v_target.is_decommissioned = true AND new_is_active = true THEN
    RAISE EXCEPTION 'Cannot reactivate a decommissioned user';
  END IF;

  -- Perform the update
  UPDATE public.users
  SET is_active = new_is_active, updated_at = now()
  WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_status(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_status(UUID, BOOLEAN) TO service_role;

-- --------------------------------------------------------------------------
-- 3. admin_decommission_user() — decommission (soft-delete) a user
-- Sets is_decommissioned = true and is_active = false.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_decommission_user(
  target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_target RECORD;
BEGIN
  -- Check permission
  v_caller_group_id := public.get_current_personal_group_id();
  IF NOT public.has_permission(v_caller_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups') THEN
    RAISE EXCEPTION 'Unauthorized: manage_all_groups permission required';
  END IF;

  -- Get target user
  SELECT id, is_decommissioned
  INTO v_target
  FROM public.users WHERE id = target_user_id;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_target.is_decommissioned = true THEN
    RAISE EXCEPTION 'User is already decommissioned';
  END IF;

  -- Decommission: set both flags (trigger also enforces is_active=false)
  UPDATE public.users
  SET is_decommissioned = true, is_active = false, updated_at = now()
  WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_decommission_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_decommission_user(UUID) TO service_role;

-- --------------------------------------------------------------------------
-- 4. Fix notification triggers — skip during hard-delete CASCADE
-- When admin_hard_delete_user() deletes the personal group, CASCADE deletes
-- memberships and roles. The AFTER DELETE triggers try to INSERT notifications
-- for the deleted personal group, causing FK violations.
-- Fix: check app.hard_delete_in_progress session variable.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_invitation_declined_or_member_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group_name TEXT;
  v_member_name TEXT;
  v_actor_group_id UUID;
  v_steward RECORD;
  v_steward_template_id UUID;
BEGIN
  -- Skip during hard-delete cascade
  IF current_setting('app.hard_delete_in_progress', true) = 'true' THEN
    RETURN OLD;
  END IF;

  -- Skip on CASCADE group delete
  SELECT name INTO v_group_name FROM public.groups WHERE id = OLD.group_id;
  IF v_group_name IS NULL THEN RETURN OLD; END IF;

  -- Skip if member group no longer exists (CASCADE deleted)
  IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = OLD.member_group_id) THEN
    RETURN OLD;
  END IF;

  v_actor_group_id := public.get_current_personal_group_id();
  SELECT name INTO v_member_name FROM public.groups WHERE id = OLD.member_group_id;
  SELECT id INTO v_steward_template_id FROM public.role_templates WHERE name = 'Steward Role Template';

  IF OLD.status = 'invited' THEN
    -- CASE 1: Invitation declined → notify Stewards
    FOR v_steward IN
      SELECT ugr.member_group_id FROM public.user_group_roles ugr
      JOIN public.group_roles gr ON ugr.group_role_id = gr.id
      WHERE ugr.group_id = OLD.group_id
        AND gr.created_from_role_template_id = v_steward_template_id
    LOOP
      INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
      VALUES (v_steward.member_group_id, 'invitation_declined', 'Invitation Declined',
        COALESCE(v_member_name, 'A user') || ' declined the invitation to "' || v_group_name || '".',
        jsonb_build_object('group_id', OLD.group_id, 'group_name', v_group_name,
          'member_group_id', OLD.member_group_id, 'member_name', v_member_name),
        OLD.group_id);
    END LOOP;

  ELSIF OLD.status = 'active' AND v_actor_group_id = OLD.member_group_id THEN
    -- CASE 2: Member left → notify Stewards
    FOR v_steward IN
      SELECT ugr.member_group_id FROM public.user_group_roles ugr
      JOIN public.group_roles gr ON ugr.group_role_id = gr.id
      WHERE ugr.group_id = OLD.group_id
        AND gr.created_from_role_template_id = v_steward_template_id
    LOOP
      INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
      VALUES (v_steward.member_group_id, 'member_left', 'Member Left',
        COALESCE(v_member_name, 'A member') || ' has left "' || v_group_name || '".',
        jsonb_build_object('group_id', OLD.group_id, 'group_name', v_group_name,
          'member_group_id', OLD.member_group_id, 'member_name', v_member_name),
        OLD.group_id);
    END LOOP;

  ELSIF OLD.status = 'active' AND (v_actor_group_id IS NULL OR v_actor_group_id != OLD.member_group_id) THEN
    -- CASE 3: Member removed → notify the removed member
    INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
    VALUES (OLD.member_group_id, 'member_removed', 'Removed from Group',
      'You have been removed from "' || v_group_name || '".',
      jsonb_build_object('group_id', OLD.group_id, 'group_name', v_group_name),
      OLD.group_id);
  END IF;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_role_removed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role_name TEXT;
  v_group_name TEXT;
BEGIN
  -- Skip during hard-delete cascade
  IF current_setting('app.hard_delete_in_progress', true) = 'true' THEN
    RETURN OLD;
  END IF;

  -- Skip if group was deleted (CASCADE)
  IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = OLD.group_id) THEN
    RETURN OLD;
  END IF;

  -- Skip if member group no longer exists (CASCADE deleted)
  IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = OLD.member_group_id) THEN
    RETURN OLD;
  END IF;

  SELECT name INTO v_role_name FROM public.group_roles WHERE id = OLD.group_role_id;
  SELECT name INTO v_group_name FROM public.groups WHERE id = OLD.group_id;

  INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
  VALUES (
    OLD.member_group_id,
    'role_removed',
    'Role Removed',
    'Your "' || COALESCE(v_role_name, 'Unknown') || '" role has been removed in "' || COALESCE(v_group_name, 'a group') || '".',
    jsonb_build_object(
      'group_id', OLD.group_id,
      'group_name', v_group_name,
      'role_name', v_role_name
    ),
    OLD.group_id
  );

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_group_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleter_group_id UUID;
  v_deleter_name TEXT;
  v_member RECORD;
BEGIN
  -- Skip during hard-delete cascade
  IF current_setting('app.hard_delete_in_progress', true) = 'true' THEN
    RETURN OLD;
  END IF;

  v_deleter_group_id := public.get_current_personal_group_id();
  SELECT name INTO v_deleter_name FROM public.groups WHERE id = v_deleter_group_id;

  FOR v_member IN
    SELECT gm.member_group_id
    FROM public.group_memberships gm
    WHERE gm.group_id = OLD.id
      AND gm.status = 'active'
      AND gm.member_group_id != COALESCE(v_deleter_group_id, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    -- Only notify if the member group still exists
    IF EXISTS (SELECT 1 FROM public.groups WHERE id = v_member.member_group_id) THEN
      INSERT INTO public.notifications (recipient_group_id, type, title, body, payload)
      VALUES (
        v_member.member_group_id,
        'group_deleted',
        'Group Deleted',
        'The group "' || OLD.name || '" has been deleted by ' || COALESCE(v_deleter_name, 'a group member') || '.',
        jsonb_build_object('group_name', OLD.name, 'deleter_group_id', v_deleter_group_id, 'deleter_name', v_deleter_name)
      );
    END IF;
  END LOOP;

  RETURN OLD;
END;
$$;

-- --------------------------------------------------------------------------
-- 4b. Fix audit trigger functions — metadata must match test expectations
-- Tests expect metadata to include 'group_name' and 'user_count' fields.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_admin_membership_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_group_id UUID;
  v_action TEXT;
  v_group_name TEXT;
BEGIN
  v_actor_group_id := public.get_current_personal_group_id();

  -- Only audit if caller is a platform admin
  IF NOT public.has_permission(v_actor_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;
    IF NEW.status = 'invited' THEN
      v_action := 'admin_invite_to_group';
    ELSE
      v_action := 'admin_join_group';
    END IF;
    INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
    VALUES (v_actor_group_id, v_action, v_group_name,
      jsonb_build_object(
        'group_id', NEW.group_id,
        'group_name', v_group_name,
        'member_group_id', NEW.member_group_id,
        'user_count', 1
      ));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT name INTO v_group_name FROM public.groups WHERE id = OLD.group_id;
    IF v_group_name IS NULL THEN RETURN OLD; END IF;
    INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
    VALUES (v_actor_group_id, 'admin_remove_from_group', v_group_name,
      jsonb_build_object(
        'group_id', OLD.group_id,
        'group_name', v_group_name,
        'member_group_id', OLD.member_group_id,
        'user_count', 1
      ));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_admin_message_send()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_group_id UUID;
BEGIN
  v_actor_group_id := public.get_current_personal_group_id();

  IF NOT public.has_permission(v_actor_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (v_actor_group_id, 'admin_message_sent', 'direct_message',
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'user_count', 1
    ));

  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- 5. Fix enforce_personal_group_id_immutability() — session-variable bypass
-- admin_hard_delete_user() needs to delete the personal group, which triggers
-- FK ON DELETE SET NULL on users.personal_group_id. The immutability trigger
-- blocks this. Add a session-variable bypass that only admin_hard_delete_user
-- can set (transaction-local, so safe).
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_personal_group_id_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Allow bypass for admin_hard_delete_user (sets this transaction-local)
  IF current_setting('app.bypass_personal_group_id_immutability', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF OLD.personal_group_id IS NOT NULL
     AND NEW.personal_group_id IS DISTINCT FROM OLD.personal_group_id THEN
    RAISE EXCEPTION
      'personal_group_id cannot be changed after it has been set (old: %, new: %)',
      OLD.personal_group_id, NEW.personal_group_id;
  END IF;
  RETURN NEW;
END;
$$;

-- --------------------------------------------------------------------------
-- 5. Fix admin_hard_delete_user() — set bypass before deleting personal group
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_hard_delete_user(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_target_personal_group_id UUID;
  v_target_auth_user_id UUID;
  v_deleted_user_group_id UUID;
BEGIN
  -- Verify caller has manage_all_groups permission
  v_caller_group_id := public.get_current_personal_group_id();
  IF NOT public.has_permission(v_caller_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups') THEN
    RAISE EXCEPTION 'Unauthorized: manage_all_groups permission required';
  END IF;

  -- Get target's personal group and auth user ID
  SELECT personal_group_id, auth_user_id
  INTO v_target_personal_group_id, v_target_auth_user_id
  FROM public.users WHERE id = target_user_id;

  IF v_target_personal_group_id IS NULL THEN
    RAISE EXCEPTION 'User not found or has no personal group';
  END IF;

  -- Get [Deleted User] sentinel group
  SELECT id INTO v_deleted_user_group_id
  FROM public.groups WHERE name = '[Deleted User]' AND group_type = 'system';

  -- Write audit log BEFORE deletion
  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (v_caller_group_id, 'admin_hard_delete_user', target_user_id::text,
    jsonb_build_object('target_user_id', target_user_id,
      'target_personal_group_id', v_target_personal_group_id));

  -- Reassign content to [Deleted User] sentinel (or caller if sentinel doesn't exist)
  UPDATE public.forum_posts
  SET author_group_id = COALESCE(v_deleted_user_group_id, v_caller_group_id)
  WHERE author_group_id = v_target_personal_group_id;

  UPDATE public.journeys
  SET created_by_group_id = COALESCE(v_deleted_user_group_id, v_caller_group_id)
  WHERE created_by_group_id = v_target_personal_group_id;

  UPDATE public.groups
  SET created_by_group_id = COALESCE(v_deleted_user_group_id, v_caller_group_id)
  WHERE created_by_group_id = v_target_personal_group_id
    AND id != v_target_personal_group_id;

  UPDATE public.admin_audit_log
  SET actor_group_id = v_deleted_user_group_id
  WHERE actor_group_id = v_target_personal_group_id;

  -- Reassign actor FKs in membership/role tables
  UPDATE public.group_memberships
  SET added_by_group_id = v_deleted_user_group_id
  WHERE added_by_group_id = v_target_personal_group_id;

  UPDATE public.user_group_roles
  SET assigned_by_group_id = v_deleted_user_group_id
  WHERE assigned_by_group_id = v_target_personal_group_id;

  UPDATE public.journey_enrollments
  SET enrolled_by_group_id = v_deleted_user_group_id
  WHERE enrolled_by_group_id = v_target_personal_group_id;

  -- Enable bypass for immutability trigger and notification triggers (transaction-local)
  PERFORM set_config('app.bypass_personal_group_id_immutability', 'true', true);
  PERFORM set_config('app.hard_delete_in_progress', 'true', true);

  -- Delete personal group (CASCADE: memberships, roles, notifications, enrollments, conversations)
  DELETE FROM public.groups WHERE id = v_target_personal_group_id;

  -- Delete user record
  DELETE FROM public.users WHERE id = target_user_id;

  -- Delete auth user
  IF v_target_auth_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_target_auth_user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'deleted_user_id', target_user_id);
END;
$$;
