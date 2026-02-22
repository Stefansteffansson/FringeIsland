-- Fix: notify_invitation_declined_or_member_change() fails on CASCADE group delete
--
-- Bug: When a group is deleted, PostgreSQL cascades DELETE to group_memberships.
-- The AFTER DELETE trigger fires and tries to INSERT a notification with
-- group_id = OLD.group_id, but the group row is already gone. The FK constraint
-- notifications_group_id_fkey rejects the insert, blocking the entire group DELETE.
--
-- Fix: Check if the group still exists (v_group_name IS NOT NULL) before inserting
-- notifications. This matches the pattern already used in notify_role_removed().

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
  -- Fetch group name (NULL if group was cascade-deleted)
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = OLD.group_id;

  -- If group no longer exists (cascade delete), skip notifications entirely
  IF v_group_name IS NULL THEN
    RETURN OLD;
  END IF;

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

  -- -------------------------------------------------------
  -- CASE 2 & 3: Active member deleted (left or removed)
  -- -------------------------------------------------------
  IF OLD.status = 'active' THEN
    -- Determine if the actor is the member themselves.
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
