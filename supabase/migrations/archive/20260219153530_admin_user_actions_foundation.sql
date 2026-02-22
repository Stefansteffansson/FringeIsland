-- Migration: Admin User Actions Foundation (Sub-Sprint 3A)
-- Date: 2026-02-19
-- Purpose: DB changes for admin user management actions (B-ADMIN-008 through B-ADMIN-012)
--
-- Changes:
--   1. Add is_decommissioned column to users table
--   2. BEFORE UPDATE trigger: enforce decommission invariant
--   3. Admin UPDATE policy on users (DeusEx can update any user)
--   4. admin_hard_delete_user() RPC
--   5. admin_send_notification() RPC
--   6. Groups SELECT policy update — admin sees all groups

-- ============================================================================
-- 1. Add is_decommissioned column to users
-- ============================================================================

ALTER TABLE public.users
ADD COLUMN is_decommissioned BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- 2. BEFORE UPDATE trigger: enforce decommission invariant
--    Invariant: is_decommissioned = true implies is_active = false. Always.
--    Silently enforced — no exception raised, just corrects the value.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_decommission_invariant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_decommissioned = true THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_decommission_invariant
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.enforce_decommission_invariant();

-- ============================================================================
-- 3. Admin UPDATE policy on users
--    DeusEx admins (with manage_all_groups) can update any user's fields.
--    Existing users_update_own_if_active policy is preserved (self-update).
-- ============================================================================

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

-- ============================================================================
-- 4. admin_hard_delete_user() RPC
--    SECURITY DEFINER — bypasses RLS to cascade-delete all user records.
--    Writes audit log BEFORE deletion, then removes everything FK-safely.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_hard_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID;
  v_target_email TEXT;
  v_target_auth_id UUID;
  v_new_audit_id UUID;
BEGIN
  -- 1. Verify caller has manage_all_groups permission
  v_caller_id := public.get_current_user_profile_id();
  IF v_caller_id IS NULL OR NOT public.has_permission(
    v_caller_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups'
  ) THEN
    RAISE EXCEPTION 'Permission denied: requires manage_all_groups';
  END IF;

  -- 2. Look up target user (error if not found)
  SELECT email, auth_user_id
  INTO v_target_email, v_target_auth_id
  FROM public.users
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', target_user_id;
  END IF;

  -- 3. Audit log BEFORE deletion (captures data that will be destroyed)
  INSERT INTO public.admin_audit_log (actor_user_id, action, target, metadata)
  VALUES (v_caller_id, 'user_hard_deleted', 'users', jsonb_build_object(
    'target_user_id', target_user_id,
    'target_email', v_target_email
  ))
  RETURNING id INTO v_new_audit_id;

  -- 4. Reassign audit-trail FK columns where target is referenced as
  --    the "who did this" (added_by, assigned_by, enrolled_by, created_by).
  --    These columns are NOT NULL + RESTRICT, so we reassign to the admin.
  UPDATE public.admin_audit_log SET actor_user_id = v_caller_id
    WHERE actor_user_id = target_user_id AND id != v_new_audit_id;
  UPDATE public.group_memberships SET added_by_user_id = v_caller_id
    WHERE added_by_user_id = target_user_id AND user_id != target_user_id;
  UPDATE public.user_group_roles SET assigned_by_user_id = v_caller_id
    WHERE assigned_by_user_id = target_user_id AND user_id != target_user_id;
  UPDATE public.journey_enrollments SET enrolled_by_user_id = v_caller_id
    WHERE enrolled_by_user_id = target_user_id AND user_id != target_user_id;
  UPDATE public.groups SET created_by_user_id = v_caller_id
    WHERE created_by_user_id = target_user_id;
  UPDATE public.journeys SET created_by_user_id = v_caller_id
    WHERE created_by_user_id = target_user_id;

  -- 5. Delete user's own records in FK-safe order
  DELETE FROM public.forum_posts WHERE author_user_id = target_user_id;
  DELETE FROM public.direct_messages WHERE sender_id = target_user_id;
  DELETE FROM public.notifications WHERE recipient_user_id = target_user_id;
  DELETE FROM public.journey_enrollments WHERE user_id = target_user_id;
  DELETE FROM public.user_group_roles WHERE user_id = target_user_id;
  DELETE FROM public.group_memberships WHERE user_id = target_user_id;

  -- 6. Delete the user row (conversations CASCADE via participant FKs)
  DELETE FROM public.users WHERE id = target_user_id;

  -- 7. Delete from auth.users if auth_user_id exists
  IF v_target_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_target_auth_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_hard_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_hard_delete_user(UUID) TO service_role;

-- ============================================================================
-- 5. admin_send_notification() RPC
--    SECURITY DEFINER — notifications table has no INSERT policy for
--    authenticated users; only trigger functions can insert.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_send_notification(
  target_user_ids UUID[],
  title TEXT,
  message TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID;
  v_count INTEGER := 0;
  v_uid UUID;
BEGIN
  -- 1. Verify caller has manage_all_groups permission
  v_caller_id := public.get_current_user_profile_id();
  IF v_caller_id IS NULL OR NOT public.has_permission(
    v_caller_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups'
  ) THEN
    RAISE EXCEPTION 'Permission denied: requires manage_all_groups';
  END IF;

  -- 2. Insert one notification per target user
  FOREACH v_uid IN ARRAY target_user_ids LOOP
    INSERT INTO public.notifications (recipient_user_id, type, title, body, is_read)
    VALUES (v_uid, 'admin_notification', title, message, false);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_send_notification(UUID[], TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_send_notification(UUID[], TEXT, TEXT) TO service_role;

-- ============================================================================
-- 6. Groups SELECT policy — admin sees all groups
--    Adds one OR clause: has_permission(..., 'manage_all_groups')
--    All existing conditions preserved.
-- ============================================================================

DROP POLICY IF EXISTS "groups_select_by_creator_or_member" ON public.groups;

CREATE POLICY "groups_select_by_creator_or_member"
ON public.groups FOR SELECT TO authenticated
USING (
  is_public = true
  OR public.is_active_group_member(id)
  OR public.is_invited_group_member(id)
  OR created_by_user_id = public.get_current_user_profile_id()
  OR public.has_permission(
       public.get_current_user_profile_id(),
       '00000000-0000-0000-0000-000000000000'::uuid,
       'manage_all_groups'
     )
);
