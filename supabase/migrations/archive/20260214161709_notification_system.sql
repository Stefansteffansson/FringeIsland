-- Migration: Notification System
-- Date: 2026-02-14
-- Version: 0.2.14
-- Author: Database Agent
-- Design: docs/features/planned/notification-system.md
--
-- Creates the notifications table and all associated triggers for Phase 1.5-A.
-- Notification types implemented:
--   group_invitation     — invited user notified
--   invitation_accepted  — group leader(s) notified
--   invitation_declined  — group leader(s) notified
--   member_removed       — removed user notified (by another user)
--   member_left          — group leader(s) notified (user left themselves)
--   role_assigned        — user receiving the role notified
--   role_removed         — user losing the role notified
--
-- All trigger functions use SECURITY DEFINER + SET search_path = ''
-- All table references use the public. prefix (required when search_path = '')

-- ============================================================
-- STEP 1: Create notifications table
-- ============================================================

CREATE TABLE public.notifications (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID       NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL,
  title            TEXT        NOT NULL,
  body             TEXT,
  payload          JSONB       NOT NULL DEFAULT '{}',
  group_id         UUID        REFERENCES public.groups(id) ON DELETE SET NULL,
  is_read          BOOLEAN     NOT NULL DEFAULT false,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS
'In-app notification records. Append-only (only is_read and read_at change after creation).
Created exclusively by SECURITY DEFINER trigger functions — no INSERT policy for authenticated users.
Realtime channel: subscribe filtered by recipient_user_id for live push delivery.';

COMMENT ON COLUMN public.notifications.recipient_user_id IS 'References public.users.id (not auth.users). CASCADE on user deletion.';
COMMENT ON COLUMN public.notifications.type IS 'Notification type identifier. TEXT (not ENUM) so new types require no schema migration.';
COMMENT ON COLUMN public.notifications.title IS 'Pre-rendered short title captured at creation time. Does not change if group/user names change later.';
COMMENT ON COLUMN public.notifications.body IS 'Optional pre-rendered longer description. NULL if no additional context needed.';
COMMENT ON COLUMN public.notifications.payload IS 'Structured JSONB for client navigation: group_id, group_name, actor_id, actor_name, etc.';
COMMENT ON COLUMN public.notifications.group_id IS 'Optional group context. SET NULL when group deleted — notification remains readable but unlinked.';
COMMENT ON COLUMN public.notifications.is_read IS 'Simple read/unread flag. Updated by the user via RLS UPDATE policy.';
COMMENT ON COLUMN public.notifications.read_at IS 'Timestamp when is_read was set to true. NULL if still unread.';

-- ============================================================
-- STEP 2: Create indexes
-- ============================================================

-- Primary query: "get my unread notifications, newest first"
CREATE INDEX idx_notifications_recipient_unread
  ON public.notifications (recipient_user_id, created_at DESC)
  WHERE is_read = false;

-- Secondary query: "get all my notifications, newest first" (paginated)
CREATE INDEX idx_notifications_recipient_created
  ON public.notifications (recipient_user_id, created_at DESC);

-- Filter by group context
CREATE INDEX idx_notifications_group
  ON public.notifications (group_id)
  WHERE group_id IS NOT NULL;

-- ============================================================
-- STEP 3: Enable RLS + create policies
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only read their own notifications
CREATE POLICY "Users can read own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  recipient_user_id = public.get_current_user_profile_id()
);

COMMENT ON POLICY "Users can read own notifications" ON public.notifications IS
'Users can only query notifications where they are the recipient.
Uses get_current_user_profile_id() (SECURITY DEFINER) to avoid RLS recursion on users table.';

-- INSERT: No policy for authenticated role.
-- Only SECURITY DEFINER trigger functions (running as postgres/superuser) can insert.
-- This enforces that all notification creation goes through the controlled trigger path.

-- UPDATE: Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  recipient_user_id = public.get_current_user_profile_id()
)
WITH CHECK (
  recipient_user_id = public.get_current_user_profile_id()
);

COMMENT ON POLICY "Users can update own notifications" ON public.notifications IS
'Users can update (mark as read) only their own notifications.
Intended use: SET is_read = true, read_at = NOW().';

-- DELETE: Users can dismiss/delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (
  recipient_user_id = public.get_current_user_profile_id()
);

COMMENT ON POLICY "Users can delete own notifications" ON public.notifications IS
'Users can delete (dismiss) only their own notifications.';

-- ============================================================
-- STEP 4: Trigger functions (6 functions)
-- ============================================================
-- All functions:
--   - SECURITY DEFINER: bypass RLS when inserting into notifications
--   - SET search_path = '': prevent search_path injection
--   - Use public. prefix for all table references

-- ============================================================
-- 4a. notify_invitation_received
--     Fires on group_memberships INSERT where status = 'invited'
--     Recipient: the invited user
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_invitation_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group_name     TEXT;
  v_inviter_name   TEXT;
  v_inviter_id     UUID;
BEGIN
  -- Fetch group name
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = NEW.group_id;

  -- Fetch inviter's display name and profile id
  SELECT u.full_name, u.id
  INTO v_inviter_name, v_inviter_id
  FROM public.users u
  WHERE u.id = NEW.added_by_user_id;

  -- Insert notification for the invited user
  INSERT INTO public.notifications (
    recipient_user_id,
    type,
    title,
    body,
    payload,
    group_id
  ) VALUES (
    NEW.user_id,
    'group_invitation',
    'New Group Invitation',
    COALESCE(v_inviter_name, 'Someone') || ' invited you to join ' || COALESCE(v_group_name, 'a group') || '.',
    jsonb_build_object(
      'group_id',      NEW.group_id,
      'group_name',    v_group_name,
      'inviter_id',    v_inviter_id,
      'inviter_name',  v_inviter_name,
      'membership_id', NEW.id
    ),
    NEW.group_id
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_invitation_received() IS
'Trigger function: creates a group_invitation notification for the invited user
when a group_memberships row is inserted with status = ''invited''.
SECURITY DEFINER + SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- 4b. notify_invitation_accepted
--     Fires on group_memberships UPDATE where status changes to 'active'
--     Recipient: all Group Leaders of the group
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
  -- Fetch group name
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = NEW.group_id;

  -- Fetch accepted member's profile
  SELECT u.full_name, u.id
  INTO v_member_name, v_member_id
  FROM public.users u
  WHERE u.id = NEW.user_id;

  -- Notify each Group Leader of the group
  FOR v_leader IN
    SELECT ugr.user_id
    FROM public.user_group_roles ugr
    JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.group_id = NEW.group_id
      AND gr.name = 'Group Leader'
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

COMMENT ON FUNCTION public.notify_invitation_accepted() IS
'Trigger function: creates an invitation_accepted notification for all Group Leaders
when a group_memberships row is updated from status=''invited'' to status=''active''.
SECURITY DEFINER + SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- 4c. notify_invitation_declined_or_member_change
--     Fires on group_memberships DELETE
--     Handles three cases based on OLD.status and auth context:
--       1. OLD.status = 'invited'  -> invitation_declined  -> leaders notified
--       2. OLD.status = 'active', actor = member -> member_left -> leaders notified
--       3. OLD.status = 'active', actor != member (or unknown) -> member_removed -> deleted user notified
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
  -- Fetch group name
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = OLD.group_id;

  -- Fetch deleted member's profile
  SELECT u.full_name, u.auth_user_id
  INTO v_member_name, v_member_auth
  FROM public.users u
  WHERE u.id = OLD.user_id;

  v_member_id := OLD.user_id;

  -- -------------------------------------------------------
  -- CASE 1: Invitation declined (OLD.status = 'invited')
  -- -------------------------------------------------------
  IF OLD.status = 'invited' THEN
    -- Fetch the original inviter's name for context
    SELECT u.full_name INTO v_actor_name
    FROM public.users u
    WHERE u.id = OLD.added_by_user_id;

    -- Notify each Group Leader
    FOR v_leader IN
      SELECT ugr.user_id
      FROM public.user_group_roles ugr
      JOIN public.group_roles gr ON ugr.group_role_id = gr.id
      WHERE ugr.group_id = OLD.group_id
        AND gr.name = 'Group Leader'
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
        'invitation_declined',
        'Invitation Declined',
        COALESCE(v_member_name, 'A user') || ' declined the invitation to join ' || COALESCE(v_group_name, 'the group') || '.',
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

  -- -------------------------------------------------------
  -- CASE 2 & 3: Active member deleted (left or removed)
  -- -------------------------------------------------------
  IF OLD.status = 'active' THEN
    -- Determine if the actor is the member themselves.
    -- auth.uid() is the auth.users UUID; compare to member's auth_user_id.
    -- auth.uid() may be NULL in CASCADE/service role contexts; default to member_removed.
    v_actor_uid := auth.uid();
    v_is_self := (v_actor_uid IS NOT NULL AND v_actor_uid = v_member_auth);

    IF v_is_self THEN
      -- CASE 2: member_left — notify group leaders
      FOR v_leader IN
        SELECT ugr.user_id
        FROM public.user_group_roles ugr
        JOIN public.group_roles gr ON ugr.group_role_id = gr.id
        WHERE ugr.group_id = OLD.group_id
          AND gr.name = 'Group Leader'
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
          'member_left',
          'Member Left Group',
          COALESCE(v_member_name, 'A member') || ' left ' || COALESCE(v_group_name, 'the group') || '.',
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
      -- (v_is_self = false also covers v_actor_uid IS NULL, defaulting to member_removed)
      INSERT INTO public.notifications (
        recipient_user_id,
        type,
        title,
        body,
        payload,
        group_id
      ) VALUES (
        v_member_id,
        'member_removed',
        'Removed from Group',
        'You have been removed from ' || COALESCE(v_group_name, 'a group') || '.',
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

COMMENT ON FUNCTION public.notify_invitation_declined_or_member_change() IS
'Trigger function: handles three cases on group_memberships DELETE:
  1. status=''invited'' -> invitation_declined (notify group leaders)
  2. status=''active'', actor=member -> member_left (notify group leaders)
  3. status=''active'', actor!=member or auth.uid() NULL -> member_removed (notify removed user)
SECURITY DEFINER + SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- 4d. notify_role_assigned
--     Fires on user_group_roles INSERT
--     Recipient: the user receiving the role
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_role_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group_name  TEXT;
  v_role_name   TEXT;
  v_assigner_name TEXT;
  v_assigner_id   UUID;
BEGIN
  -- Fetch group name
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = NEW.group_id;

  -- Fetch role name
  SELECT name INTO v_role_name
  FROM public.group_roles
  WHERE id = NEW.group_role_id;

  -- Fetch assigner's display name
  SELECT u.full_name, u.id
  INTO v_assigner_name, v_assigner_id
  FROM public.users u
  WHERE u.id = NEW.assigned_by_user_id;

  -- Insert notification for the role recipient
  INSERT INTO public.notifications (
    recipient_user_id,
    type,
    title,
    body,
    payload,
    group_id
  ) VALUES (
    NEW.user_id,
    'role_assigned',
    'New Role Assigned',
    'You have been assigned the role of ' || COALESCE(v_role_name, 'a role') || ' in ' || COALESCE(v_group_name, 'a group') || '.',
    jsonb_build_object(
      'group_id',      NEW.group_id,
      'group_name',    v_group_name,
      'role_id',       NEW.group_role_id,
      'role_name',     v_role_name,
      'assigner_id',   v_assigner_id,
      'assigner_name', v_assigner_name
    ),
    NEW.group_id
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_role_assigned() IS
'Trigger function: creates a role_assigned notification for the user receiving the role
when a user_group_roles row is inserted.
SECURITY DEFINER + SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- 4e. notify_role_removed
--     Fires on user_group_roles DELETE
--     Recipient: the user losing the role
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_role_removed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group_name TEXT;
  v_role_name  TEXT;
BEGIN
  -- Fetch group name (group may no longer exist if this is a cascade delete)
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = OLD.group_id;

  -- Fetch role name (role may no longer exist if this is a cascade delete)
  SELECT name INTO v_role_name
  FROM public.group_roles
  WHERE id = OLD.group_role_id;

  -- Only notify if the group still exists (skip cascade deletions where group is gone)
  IF v_group_name IS NOT NULL THEN
    INSERT INTO public.notifications (
      recipient_user_id,
      type,
      title,
      body,
      payload,
      group_id
    ) VALUES (
      OLD.user_id,
      'role_removed',
      'Role Removed',
      'The role ' || COALESCE(v_role_name, 'a role') || ' has been removed from you in ' || COALESCE(v_group_name, 'a group') || '.',
      jsonb_build_object(
        'group_id',   OLD.group_id,
        'group_name', v_group_name,
        'role_id',    OLD.group_role_id,
        'role_name',  v_role_name
      ),
      OLD.group_id
    );
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.notify_role_removed() IS
'Trigger function: creates a role_removed notification for the user losing the role
when a user_group_roles row is deleted.
Skips notification if the parent group no longer exists (cascade deletion).
SECURITY DEFINER + SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- STEP 5: Create triggers
-- ============================================================

-- Trigger 1: group_memberships INSERT — invitation received
CREATE TRIGGER trg_notify_invitation_received
  AFTER INSERT ON public.group_memberships
  FOR EACH ROW
  WHEN (NEW.status = 'invited')
  EXECUTE FUNCTION public.notify_invitation_received();

COMMENT ON TRIGGER trg_notify_invitation_received ON public.group_memberships IS
'Fires after INSERT when status=''invited''. Notifies the invited user.';

-- Trigger 2: group_memberships UPDATE — invitation accepted
CREATE TRIGGER trg_notify_invitation_accepted
  AFTER UPDATE ON public.group_memberships
  FOR EACH ROW
  WHEN (OLD.status = 'invited' AND NEW.status = 'active')
  EXECUTE FUNCTION public.notify_invitation_accepted();

COMMENT ON TRIGGER trg_notify_invitation_accepted ON public.group_memberships IS
'Fires after UPDATE when status transitions from ''invited'' to ''active''. Notifies Group Leaders.';

-- Trigger 3: group_memberships DELETE — declined invitation or member change
-- Handles: invitation_declined, member_left, member_removed
CREATE TRIGGER trg_notify_membership_deleted
  AFTER DELETE ON public.group_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_invitation_declined_or_member_change();

COMMENT ON TRIGGER trg_notify_membership_deleted ON public.group_memberships IS
'Fires after DELETE on group_memberships.
Dispatches invitation_declined (status was ''invited''), member_left, or member_removed (status was ''active'').';

-- Trigger 4: user_group_roles INSERT — role assigned
CREATE TRIGGER trg_notify_role_assigned
  AFTER INSERT ON public.user_group_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_role_assigned();

COMMENT ON TRIGGER trg_notify_role_assigned ON public.user_group_roles IS
'Fires after INSERT on user_group_roles. Notifies the user receiving the role.';

-- Trigger 5: user_group_roles DELETE — role removed
CREATE TRIGGER trg_notify_role_removed
  AFTER DELETE ON public.user_group_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_role_removed();

COMMENT ON TRIGGER trg_notify_role_removed ON public.user_group_roles IS
'Fires after DELETE on user_group_roles. Notifies the user losing the role (unless group is being cascade-deleted).';

-- ============================================================
-- STEP 6: Verification block
-- ============================================================

DO $$
DECLARE
  v_table_exists     BOOLEAN;
  v_index_count      INTEGER;
  v_policy_count     INTEGER;
  v_function_count   INTEGER;
  v_trigger_count    INTEGER;
  v_missing          TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check notifications table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    v_missing := array_append(v_missing, 'TABLE: notifications');
  END IF;

  -- Check indexes (3 expected)
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'notifications'
    AND indexname IN (
      'idx_notifications_recipient_unread',
      'idx_notifications_recipient_created',
      'idx_notifications_group'
    );

  IF v_index_count < 3 THEN
    v_missing := array_append(v_missing, 'INDEXES: expected 3, found ' || v_index_count::TEXT);
  END IF;

  -- Check RLS policies (3 expected: SELECT, UPDATE, DELETE)
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'notifications'
    AND policyname IN (
      'Users can read own notifications',
      'Users can update own notifications',
      'Users can delete own notifications'
    );

  IF v_policy_count < 3 THEN
    v_missing := array_append(v_missing, 'POLICIES: expected 3, found ' || v_policy_count::TEXT);
  END IF;

  -- Check trigger functions (5 expected)
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname IN (
      'notify_invitation_received',
      'notify_invitation_accepted',
      'notify_invitation_declined_or_member_change',
      'notify_role_assigned',
      'notify_role_removed'
    );

  IF v_function_count < 5 THEN
    v_missing := array_append(v_missing, 'FUNCTIONS: expected 5, found ' || v_function_count::TEXT);
  END IF;

  -- Check triggers (5 expected)
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND trigger_name IN (
      'trg_notify_invitation_received',
      'trg_notify_invitation_accepted',
      'trg_notify_membership_deleted',
      'trg_notify_role_assigned',
      'trg_notify_role_removed'
    );

  IF v_trigger_count < 5 THEN
    v_missing := array_append(v_missing, 'TRIGGERS: expected 5, found ' || v_trigger_count::TEXT);
  END IF;

  -- Check all notification functions have SET search_path
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname IN (
        'notify_invitation_received',
        'notify_invitation_accepted',
        'notify_invitation_declined_or_member_change',
        'notify_role_assigned',
        'notify_role_removed'
      )
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'
        )
      )
  ) THEN
    v_missing := array_append(v_missing, 'SECURITY: some notification functions missing SET search_path');
  END IF;

  -- Report result
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Migration verification FAILED. Missing: %', array_to_string(v_missing, ' | ');
  END IF;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Notification System Migration: SUCCESS';
  RAISE NOTICE '  Table:     notifications ✓';
  RAISE NOTICE '  Indexes:   3 ✓';
  RAISE NOTICE '  Policies:  3 (SELECT, UPDATE, DELETE) ✓';
  RAISE NOTICE '  Functions: 5 ✓';
  RAISE NOTICE '  Triggers:  5 ✓';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Enable Realtime for notifications table in Supabase dashboard';
  RAISE NOTICE '     (Database > Replication > notifications)';
  RAISE NOTICE '  2. UI Agent: implement NotificationProvider (React Context)';
  RAISE NOTICE '  3. UI Agent: replace invitation-count badge in Navigation.tsx';
  RAISE NOTICE '==========================================';
END $$;
