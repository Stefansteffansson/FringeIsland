-- Migration: Notify group members when a group is deleted
-- Date: 2026-02-16
--
-- New notification type: group_deleted
-- Recipient: all active members EXCEPT the user who deleted the group
-- Fires: BEFORE DELETE on groups (must capture members before CASCADE)
--
-- Note: The notification's group_id will be SET NULL by CASCADE after
-- the group row is deleted. That's fine — the group name is pre-rendered
-- in the notification title/body.

-- ============================================================
-- 1. Create the trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_group_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleter_id   UUID;
  v_deleter_name TEXT;
  v_member       RECORD;
BEGIN
  -- Get the current user (the one performing the delete)
  v_deleter_id := public.get_current_user_profile_id();

  -- Get deleter's display name
  SELECT full_name INTO v_deleter_name
  FROM public.users
  WHERE id = v_deleter_id;

  -- Notify every active member EXCEPT the deleter
  FOR v_member IN
    SELECT gm.user_id
    FROM public.group_memberships gm
    WHERE gm.group_id = OLD.id
      AND gm.status = 'active'
      AND gm.user_id != v_deleter_id
  LOOP
    INSERT INTO public.notifications (
      recipient_user_id,
      type,
      title,
      body,
      payload,
      group_id
    ) VALUES (
      v_member.user_id,
      'group_deleted',
      'Group Deleted',
      'The group "' || OLD.name || '" has been deleted by ' || COALESCE(v_deleter_name, 'a group member') || '.',
      jsonb_build_object(
        'group_name',    OLD.name,
        'deleter_id',    v_deleter_id,
        'deleter_name',  v_deleter_name
      ),
      NULL  -- group is being deleted, no link
    );
  END LOOP;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.notify_group_deleted IS
'Trigger function: creates a group_deleted notification for all active members
(except the deleter) when a group is deleted. Fires BEFORE DELETE so the
membership data is still available. SECURITY DEFINER to bypass RLS.';

-- ============================================================
-- 2. Create the trigger (BEFORE DELETE to read members first)
-- ============================================================

DROP TRIGGER IF EXISTS notify_group_deleted ON public.groups;

CREATE TRIGGER notify_group_deleted
  BEFORE DELETE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_group_deleted();

-- ============================================================
-- 3. Verify
-- ============================================================

DO $$
DECLARE
  v_func_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'notify_group_deleted'
  ) INTO v_func_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'notify_group_deleted'
  ) INTO v_trigger_exists;

  IF NOT v_func_exists THEN
    RAISE EXCEPTION 'notify_group_deleted function not created!';
  END IF;

  IF NOT v_trigger_exists THEN
    RAISE EXCEPTION 'notify_group_deleted trigger not created!';
  END IF;

  RAISE NOTICE 'Group deletion notification trigger created successfully';
END $$;
