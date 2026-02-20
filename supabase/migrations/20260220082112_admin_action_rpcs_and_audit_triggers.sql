-- Migration: Admin Action RPCs and Audit Triggers (Sub-Sprint 3C)
-- Date: 2026-02-20
-- Purpose: Create admin_force_logout RPC and automatic audit logging triggers
--          for admin group membership and messaging operations.
--
-- Changes:
--   1. admin_force_logout(UUID[]) RPC — revokes sessions + audit log
--   2. Audit trigger on group_memberships — logs admin invite/join/remove
--   3. Audit trigger on direct_messages — logs admin message sends

-- ============================================================================
-- 1. admin_force_logout RPC
--    SECURITY DEFINER — needs access to auth.sessions and auth.refresh_tokens.
--    Deletes all sessions and refresh tokens for target users, effectively
--    preventing token refresh (existing JWTs expire naturally).
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
    -- Get the auth user ID from the users table
    SELECT auth_user_id INTO v_target_auth_id
    FROM public.users
    WHERE id = v_tid;

    IF v_target_auth_id IS NOT NULL THEN
      -- Delete refresh tokens (prevents token refresh)
      DELETE FROM auth.refresh_tokens
      WHERE user_id = v_target_auth_id;

      -- Delete sessions (invalidates server-side session tracking)
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

GRANT EXECUTE ON FUNCTION public.admin_force_logout(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_logout(UUID[]) TO service_role;

-- ============================================================================
-- 2. Audit trigger on group_memberships
--    Fires AFTER INSERT or DELETE. Detects admin operations by checking
--    if the caller has manage_all_groups permission. Logs appropriate action:
--      INSERT + status='invited' → admin_invite_to_group
--      INSERT + status='active'  → admin_join_group
--      DELETE                    → admin_remove_from_group
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_admin_membership_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID;
  v_group_name TEXT;
  v_group_id UUID;
  v_action TEXT;
BEGIN
  v_caller_id := public.get_current_user_profile_id();

  -- Only log if caller is a platform admin
  IF v_caller_id IS NULL OR NOT public.has_permission(
    v_caller_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups'
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Determine group_id and action
  IF TG_OP = 'INSERT' THEN
    v_group_id := NEW.group_id;
    IF NEW.status = 'invited' THEN
      v_action := 'admin_invite_to_group';
    ELSIF NEW.status = 'active' THEN
      v_action := 'admin_join_group';
    ELSE
      v_action := 'admin_group_membership_change';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_group_id := OLD.group_id;
    v_action := 'admin_remove_from_group';
  END IF;

  -- Get group name
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = v_group_id;

  -- Insert audit log entry
  INSERT INTO public.admin_audit_log (actor_user_id, action, target, metadata)
  VALUES (
    v_caller_id,
    v_action,
    'group_memberships',
    jsonb_build_object(
      'group_name', COALESCE(v_group_name, 'Unknown'),
      'group_id', v_group_id,
      'user_id', COALESCE(NEW.user_id, OLD.user_id),
      'user_count', 1
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_admin_membership_change
AFTER INSERT OR DELETE ON public.group_memberships
FOR EACH ROW
EXECUTE FUNCTION public.audit_admin_membership_change();

-- ============================================================================
-- 3. Audit trigger on direct_messages
--    Fires AFTER INSERT. Detects admin senders by checking manage_all_groups.
--    Logs action: admin_message_sent
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_admin_message_send()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  v_caller_id := public.get_current_user_profile_id();

  -- Only log if sender is a platform admin
  IF v_caller_id IS NULL OR NOT public.has_permission(
    v_caller_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups'
  ) THEN
    RETURN NEW;
  END IF;

  -- Insert audit log entry
  INSERT INTO public.admin_audit_log (actor_user_id, action, target, metadata)
  VALUES (
    v_caller_id,
    'admin_message_sent',
    'direct_messages',
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'user_count', 1
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_admin_message_send
AFTER INSERT ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.audit_admin_message_send();

-- ============================================================================
-- Verify
-- ============================================================================

DO $$
DECLARE
  v_rpc_exists BOOLEAN;
  v_trigger1_exists BOOLEAN;
  v_trigger2_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'admin_force_logout'
  ) INTO v_rpc_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_audit_admin_membership_change'
  ) INTO v_trigger1_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_audit_admin_message_send'
  ) INTO v_trigger2_exists;

  IF NOT v_rpc_exists THEN
    RAISE EXCEPTION 'admin_force_logout function not created!';
  END IF;

  IF NOT v_trigger1_exists THEN
    RAISE EXCEPTION 'Membership audit trigger not created!';
  END IF;

  IF NOT v_trigger2_exists THEN
    RAISE EXCEPTION 'Message audit trigger not created!';
  END IF;

  RAISE NOTICE 'All RPCs and audit triggers created successfully';
END $$;
