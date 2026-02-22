-- RBAC Sub-Sprint 1, Migration 3b: Update all remaining 'Group Leader' references
--
-- Migration 3 updated the core functions (prevent_last_leader_removal,
-- is_active_group_leader, group_has_leader) but missed several other functions
-- and RLS policies that hardcode 'Group Leader' or 'Travel Guide'.
--
-- This migration updates:
-- 1. is_group_leader() function
-- 2. groups_update_by_leader policy
-- 3. has_forum_permission() function
-- 4. notify_invitation_accepted() function
-- 5. notify_invitation_declined_or_member_change() function

-- ============================================================
-- 1. Update is_group_leader() → check 'Steward'
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_group_leader(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_group_roles ugr
    JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.group_id = p_group_id
      AND ugr.user_id = public.get_current_user_profile_id()
      AND gr.name = 'Steward'
  );
$$;

-- ============================================================
-- 2. Recreate groups_update_by_leader policy → check 'Steward'
-- ============================================================

DROP POLICY IF EXISTS "groups_update_by_leader" ON public.groups;

CREATE POLICY "groups_update_by_leader"
ON public.groups
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_group_roles ugr
    JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.user_id = public.get_current_user_profile_id()
      AND ugr.group_id = groups.id
      AND gr.name = 'Steward'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_group_roles ugr
    JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.user_id = public.get_current_user_profile_id()
      AND ugr.group_id = groups.id
      AND gr.name = 'Steward'
  )
);

-- ============================================================
-- 3. Update has_forum_permission() → use 'Steward' and 'Guide'
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_forum_permission(
  p_group_id       UUID,
  p_permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_user_id   UUID;
  v_role_names TEXT[];
BEGIN
  v_user_id := public.get_current_user_profile_id();
  IF v_user_id IS NULL THEN RETURN FALSE; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = p_group_id
      AND user_id  = v_user_id
      AND status   = 'active'
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT array_agg(gr.name)
  INTO v_role_names
  FROM public.user_group_roles ugr
  JOIN public.group_roles gr ON ugr.group_role_id = gr.id
  WHERE ugr.user_id  = v_user_id
    AND ugr.group_id = p_group_id;

  CASE p_permission_name
    WHEN 'view_forum' THEN
      RETURN TRUE;
    WHEN 'post_forum_messages' THEN
      RETURN v_role_names && ARRAY['Steward', 'Guide', 'Member'];
    WHEN 'reply_to_messages' THEN
      RETURN v_role_names && ARRAY['Steward', 'Guide', 'Member'];
    WHEN 'moderate_forum' THEN
      RETURN v_role_names && ARRAY['Steward'];
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

-- ============================================================
-- 4. Update notify_invitation_accepted() → query 'Steward'
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_invitation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group_name   TEXT;
  v_member_name  TEXT;
  v_member_id    UUID;
  v_leader       RECORD;
BEGIN
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = NEW.group_id;

  SELECT u.full_name, u.id
  INTO v_member_name, v_member_id
  FROM public.users u
  WHERE u.id = NEW.user_id;

  -- Notify each Steward (was Group Leader) of the group
  FOR v_leader IN
    SELECT ugr.user_id
    FROM public.user_group_roles ugr
    JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.group_id = NEW.group_id
      AND gr.name = 'Steward'
  LOOP
    INSERT INTO public.notifications (
      recipient_user_id,
      type,
      title,
      body,
      payload,
      group_id
    ) VALUES (
      v_leader.user_id,
      'invitation_accepted',
      'Invitation Accepted',
      COALESCE(v_member_name, 'A user') || ' accepted your invitation to join ' || COALESCE(v_group_name, 'the group') || '.',
      jsonb_build_object(
        'group_id',    NEW.group_id,
        'group_name',  v_group_name,
        'member_id',   v_member_id,
        'member_name', v_member_name
      ),
      NEW.group_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. Update notify_invitation_declined_or_member_change()
--    → query 'Steward' (canonical version from cascade fix)
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_invitation_declined_or_member_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group_name   TEXT;
  v_actor_name   TEXT;
  v_member_name  TEXT;
  v_member_id    UUID;
  v_actor_uid    UUID;
  v_member_auth  UUID;
  v_is_self      BOOLEAN;
  v_leader       RECORD;
BEGIN
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = OLD.group_id;

  IF v_group_name IS NULL THEN
    RETURN OLD;
  END IF;

  SELECT u.full_name, u.auth_user_id
  INTO v_member_name, v_member_auth
  FROM public.users u
  WHERE u.id = OLD.user_id;

  v_member_id := OLD.user_id;

  -- CASE 1: Invitation declined
  IF OLD.status = 'invited' THEN
    SELECT u.full_name INTO v_actor_name
    FROM public.users u
    WHERE u.id = OLD.added_by_user_id;

    FOR v_leader IN
      SELECT ugr.user_id
      FROM public.user_group_roles ugr
      JOIN public.group_roles gr ON ugr.group_role_id = gr.id
      WHERE ugr.group_id = OLD.group_id
        AND gr.name = 'Steward'
    LOOP
      INSERT INTO public.notifications (
        recipient_user_id, type, title, body, payload, group_id
      ) VALUES (
        v_leader.user_id,
        'invitation_declined',
        'Invitation Declined',
        COALESCE(v_member_name, 'A user') || ' declined the invitation to join ' || v_group_name || '.',
        jsonb_build_object(
          'group_id',    OLD.group_id,
          'group_name',  v_group_name,
          'member_id',   v_member_id,
          'member_name', v_member_name
        ),
        OLD.group_id
      );
    END LOOP;

    RETURN OLD;
  END IF;

  -- CASE 2 & 3: Active member deleted (left or removed)
  IF OLD.status = 'active' THEN
    v_actor_uid := auth.uid();
    v_is_self := (v_actor_uid IS NOT NULL AND v_actor_uid = v_member_auth);

    IF v_is_self THEN
      -- CASE 2: member_left — notify stewards
      FOR v_leader IN
        SELECT ugr.user_id
        FROM public.user_group_roles ugr
        JOIN public.group_roles gr ON ugr.group_role_id = gr.id
        WHERE ugr.group_id = OLD.group_id
          AND gr.name = 'Steward'
      LOOP
        INSERT INTO public.notifications (
          recipient_user_id, type, title, body, payload, group_id
        ) VALUES (
          v_leader.user_id,
          'member_left',
          'Member Left Group',
          COALESCE(v_member_name, 'A member') || ' left ' || v_group_name || '.',
          jsonb_build_object(
            'group_id',    OLD.group_id,
            'group_name',  v_group_name,
            'member_id',   v_member_id,
            'member_name', v_member_name
          ),
          OLD.group_id
        );
      END LOOP;
    ELSE
      -- CASE 3: member_removed — notify the removed user
      INSERT INTO public.notifications (
        recipient_user_id, type, title, body, payload, group_id
      ) VALUES (
        v_member_id,
        'member_removed',
        'Removed from Group',
        'You have been removed from ' || v_group_name || '.',
        jsonb_build_object(
          'group_id',   OLD.group_id,
          'group_name', v_group_name
        ),
        OLD.group_id
      );
    END IF;
  END IF;

  RETURN OLD;
END;
$$;
