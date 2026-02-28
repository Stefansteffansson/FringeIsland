-- Sprint 3: Smart Notifications + Stewardship Nomination (Track 1)
--
-- F3: Smart notification schema extension
-- F3-Handler: handle_notification_action RPC
-- L4: nominate_steward RPC (Track 1 stewardship nomination)
--
-- Adds actionable notification columns, a generic action handler,
-- and the stewardship nomination flow.

-- ═══════════════════════════════════════════════════════════════════
-- 1. ALTER TABLE notifications — add smart notification columns
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS action_type TEXT,
  ADD COLUMN IF NOT EXISTS action_data JSONB,
  ADD COLUMN IF NOT EXISTS action_taken TEXT,
  ADD COLUMN IF NOT EXISTS action_taken_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Consistency constraint: passive notifications cannot have action_taken
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_action_consistency
  CHECK (
    (action_type IS NULL AND action_taken IS NULL AND action_taken_at IS NULL)
    OR (action_type IS NOT NULL)
  );

-- Index for finding pending actionable notifications (for expiry checks)
CREATE INDEX IF NOT EXISTS idx_notifications_pending_actions
  ON public.notifications (recipient_group_id, type, created_at DESC)
  WHERE action_type IS NOT NULL AND action_taken IS NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 2. handle_notification_action RPC
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_notification_action(
  p_notification_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_notification RECORD;
  v_valid_actions TEXT[];
  v_result JSONB;
BEGIN
  -- Get caller's personal group ID
  v_caller_group_id := public.get_current_personal_group_id();
  IF v_caller_group_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch notification with FOR UPDATE lock to prevent races
  SELECT * INTO v_notification
  FROM public.notifications
  WHERE id = p_notification_id
  FOR UPDATE;

  IF v_notification IS NULL THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;

  -- Validate ownership
  IF v_notification.recipient_group_id != v_caller_group_id THEN
    RAISE EXCEPTION 'Not your notification';
  END IF;

  -- Validate actionable
  IF v_notification.action_type IS NULL THEN
    RAISE EXCEPTION 'Not an actionable notification';
  END IF;

  -- Validate not already actioned
  IF v_notification.action_taken IS NOT NULL THEN
    RAISE EXCEPTION 'Already responded';
  END IF;

  -- Validate not expired
  IF v_notification.expires_at IS NOT NULL AND v_notification.expires_at < NOW() THEN
    RAISE EXCEPTION 'Notification expired';
  END IF;

  -- Validate action value based on action_type
  CASE v_notification.action_type
    WHEN 'accept_decline' THEN
      v_valid_actions := ARRAY['accepted', 'declined'];
    WHEN 'acknowledge' THEN
      v_valid_actions := ARRAY['acknowledged'];
    ELSE
      RAISE EXCEPTION 'Unknown action type: %', v_notification.action_type;
  END CASE;

  IF NOT (p_action = ANY(v_valid_actions)) THEN
    RAISE EXCEPTION 'Invalid action "%" for action type "%"', p_action, v_notification.action_type;
  END IF;

  -- Record the action
  UPDATE public.notifications
  SET action_taken = p_action,
      action_taken_at = NOW(),
      is_read = true,
      read_at = COALESCE(read_at, NOW())
  WHERE id = p_notification_id;

  -- Dispatch type-specific side effects
  IF v_notification.type = 'stewardship_nomination' THEN
    PERFORM public._handle_stewardship_nomination_action(
      v_notification.id,
      v_notification.recipient_group_id,
      v_notification.action_data,
      p_action
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'action', p_action);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 3. _handle_stewardship_nomination_action (internal helper)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public._handle_stewardship_nomination_action(
  p_notification_id UUID,
  p_nominee_group_id UUID,
  p_action_data JSONB,
  p_action TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group_id UUID;
  v_nominator_group_id UUID;
  v_nominee_ids UUID[];
  v_current_rank INT;
  v_next_nominee_id UUID;
  v_steward_role_id UUID;
  v_group_name TEXT;
  v_nominee_name TEXT;
  v_deusex_group_id UUID;
BEGIN
  -- Extract data from action_data
  v_group_id := (p_action_data->>'group_id')::UUID;
  v_nominator_group_id := (p_action_data->>'nominator_group_id')::UUID;
  v_current_rank := (p_action_data->>'nominee_rank')::INT;

  -- Parse nominee_ids array from JSONB
  SELECT array_agg(elem::TEXT::UUID)
  INTO v_nominee_ids
  FROM jsonb_array_elements_text(p_action_data->'nominee_ids') AS elem;

  -- Get group name
  SELECT name INTO v_group_name FROM public.groups WHERE id = v_group_id;

  -- Get Steward role for this group
  SELECT id INTO v_steward_role_id
  FROM public.group_roles
  WHERE group_id = v_group_id AND name = 'Steward'
  LIMIT 1;

  IF p_action = 'accepted' THEN
    -- NOMINEE ACCEPTED: Grant Steward role, then original Steward leaves

    -- Get nominee display name
    SELECT COALESCE(u.nickname, u.full_name, 'Unknown')
    INTO v_nominee_name
    FROM public.users u
    WHERE u.personal_group_id = p_nominee_group_id;

    -- Grant Steward role to nominee (idempotent)
    INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
    VALUES (p_nominee_group_id, v_group_id, v_steward_role_id, v_nominator_group_id)
    ON CONFLICT DO NOTHING;

    -- Now the nominator can safely leave (they are no longer sole Steward)
    -- Set flag to bypass nomination-in-progress check in leave_group
    PERFORM set_config('app.nomination_leave_in_progress', 'true', true);

    -- Delete nominator's roles
    DELETE FROM public.user_group_roles
    WHERE member_group_id = v_nominator_group_id AND group_id = v_group_id;

    -- Freeze non-public enrollments for the leaving Steward
    UPDATE public.journey_enrollments je
    SET status = 'frozen',
        progress_data = COALESCE(progress_data, '{}'::jsonb) || '{"frozen_reason": "left_group"}'::jsonb
    WHERE je.group_id = v_group_id
      AND je.status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.journeys j
        WHERE j.id = je.journey_id AND j.is_public = false
      );

    -- Delete nominator's membership (triggers member_left notification)
    DELETE FROM public.group_memberships
    WHERE group_id = v_group_id AND member_group_id = v_nominator_group_id;

    -- Notify group: new Steward assigned
    INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
    SELECT gm.member_group_id,
           'stewardship_transferred',
           'New Steward Assigned',
           v_nominee_name || ' has accepted stewardship of ' || v_group_name || '.',
           jsonb_build_object('group_id', v_group_id, 'new_steward_group_id', p_nominee_group_id),
           v_group_id
    FROM public.group_memberships gm
    WHERE gm.group_id = v_group_id
      AND gm.status = 'active'
      AND gm.member_group_id != p_nominee_group_id;

    PERFORM set_config('app.nomination_leave_in_progress', '', true);

  ELSIF p_action = 'declined' THEN
    -- NOMINEE DECLINED: Send to next nominee or fall back to DeusEx

    IF v_current_rank < array_length(v_nominee_ids, 1) THEN
      -- Next nominee exists
      v_next_nominee_id := v_nominee_ids[v_current_rank + 1];

      -- Send nomination notification to next nominee
      INSERT INTO public.notifications (
        recipient_group_id, type, title, body, payload, group_id,
        action_type, action_data, expires_at
      ) VALUES (
        v_next_nominee_id,
        'stewardship_nomination',
        'Stewardship Nomination',
        'You have been nominated as Steward of ' || v_group_name || '. Accept or decline within 7 days.',
        jsonb_build_object('group_id', v_group_id, 'group_name', v_group_name),
        v_group_id,
        'accept_decline',
        jsonb_build_object(
          'group_id', v_group_id,
          'nominator_group_id', v_nominator_group_id,
          'nominee_ids', to_jsonb(v_nominee_ids),
          'nominee_rank', v_current_rank + 1,
          'total_nominees', array_length(v_nominee_ids, 1)
        ),
        NOW() + INTERVAL '7 days'
      );

    ELSE
      -- All nominees exhausted → DeusEx fallback (L2 flow)
      SELECT id INTO v_deusex_group_id
      FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';

      -- Add DeusEx as member (idempotent)
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
      VALUES (v_group_id, v_deusex_group_id, v_nominator_group_id, 'active')
      ON CONFLICT DO NOTHING;

      -- Assign Steward role to DeusEx (idempotent)
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      VALUES (v_deusex_group_id, v_group_id, v_steward_role_id, v_nominator_group_id)
      ON CONFLICT DO NOTHING;

      -- Transfer pending invitations to DeusEx
      UPDATE public.group_memberships
      SET added_by_group_id = v_deusex_group_id
      WHERE group_id = v_group_id AND status = 'invited'
        AND added_by_group_id = v_nominator_group_id;

      -- Delete nominator's roles
      DELETE FROM public.user_group_roles
      WHERE member_group_id = v_nominator_group_id AND group_id = v_group_id;

      -- Delete nominator's membership
      DELETE FROM public.group_memberships
      WHERE group_id = v_group_id AND member_group_id = v_nominator_group_id;

      -- Notify all members about DeusEx handover
      INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
      SELECT gm.member_group_id,
             'stewardship_transferred',
             'Stewardship Change',
             'FringeIsland has temporarily assumed stewardship of ' || v_group_name || '.',
             jsonb_build_object('group_id', v_group_id, 'scenario', 'deusex_fallback'),
             v_group_id
      FROM public.group_memberships gm
      WHERE gm.group_id = v_group_id
        AND gm.status = 'active'
        AND gm.member_group_id != v_deusex_group_id;

      -- Notify DeusEx
      INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
      VALUES (
        v_deusex_group_id,
        'stewardship_required',
        'Stewardship Required',
        v_group_name || ' requires a permanent Steward. All nominees declined. Please review and assign.',
        jsonb_build_object('group_id', v_group_id, 'scenario', 'all_nominees_declined'),
        v_group_id
      );
    END IF;
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. nominate_steward RPC
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.nominate_steward(
  p_group_id UUID,
  p_nominee_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_group_id UUID;
  v_steward_role_id UUID;
  v_steward_template_id UUID;
  v_steward_count INT;
  v_group_name TEXT;
  v_nominee_id UUID;
BEGIN
  -- Get caller's personal group ID
  v_caller_group_id := public.get_current_personal_group_id();
  IF v_caller_group_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate group exists and is active engagement group
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = p_group_id AND group_type = 'engagement' AND status = 'active';

  IF v_group_name IS NULL THEN
    RAISE EXCEPTION 'Group not found or not an active engagement group';
  END IF;

  -- Validate caller is an active member
  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = p_group_id AND member_group_id = v_caller_group_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'You are not an active member of this group';
  END IF;

  -- Get Steward role template ID
  SELECT id INTO v_steward_template_id
  FROM public.role_templates WHERE name = 'Steward Role Template';

  -- Get Steward role for this group
  SELECT id INTO v_steward_role_id
  FROM public.group_roles
  WHERE group_id = p_group_id
    AND (created_from_role_template_id = v_steward_template_id OR name = 'Steward')
  LIMIT 1;

  IF v_steward_role_id IS NULL THEN
    RAISE EXCEPTION 'No Steward role found for this group';
  END IF;

  -- Validate caller IS a Steward
  IF NOT EXISTS (
    SELECT 1 FROM public.user_group_roles
    WHERE member_group_id = v_caller_group_id
      AND group_id = p_group_id
      AND group_role_id = v_steward_role_id
  ) THEN
    RAISE EXCEPTION 'Only the sole Steward can nominate successors';
  END IF;

  -- Validate caller is the SOLE Steward
  SELECT COUNT(*) INTO v_steward_count
  FROM public.user_group_roles
  WHERE group_id = p_group_id AND group_role_id = v_steward_role_id;

  IF v_steward_count > 1 THEN
    RAISE EXCEPTION 'You are not the sole Steward. Use regular leave instead.';
  END IF;

  -- Validate no nomination already in progress for this group
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE type = 'stewardship_nomination'
      AND group_id = p_group_id
      AND action_type = 'accept_decline'
      AND action_taken IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
  ) THEN
    RAISE EXCEPTION 'A stewardship nomination is already in progress for this group';
  END IF;

  -- Validate nominees
  IF array_length(p_nominee_ids, 1) IS NULL OR array_length(p_nominee_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one nominee is required';
  END IF;

  FOREACH v_nominee_id IN ARRAY p_nominee_ids LOOP
    -- Cannot nominate self
    IF v_nominee_id = v_caller_group_id THEN
      RAISE EXCEPTION 'Cannot nominate yourself';
    END IF;

    -- Nominee must be an active member
    IF NOT EXISTS (
      SELECT 1 FROM public.group_memberships
      WHERE group_id = p_group_id AND member_group_id = v_nominee_id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Nominee % is not an active member of this group', v_nominee_id;
    END IF;
  END LOOP;

  -- Send nomination to first nominee
  INSERT INTO public.notifications (
    recipient_group_id, type, title, body, payload, group_id,
    action_type, action_data, expires_at
  ) VALUES (
    p_nominee_ids[1],
    'stewardship_nomination',
    'Stewardship Nomination',
    'You have been nominated as Steward of ' || v_group_name || '. Accept or decline within 7 days.',
    jsonb_build_object('group_id', p_group_id, 'group_name', v_group_name),
    p_group_id,
    'accept_decline',
    jsonb_build_object(
      'group_id', p_group_id,
      'nominator_group_id', v_caller_group_id,
      'nominee_ids', to_jsonb(p_nominee_ids),
      'nominee_rank', 1,
      'total_nominees', array_length(p_nominee_ids, 1)
    ),
    NOW() + INTERVAL '7 days'
  );

  RETURN jsonb_build_object('success', true, 'nominees_count', array_length(p_nominee_ids, 1));
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. Verification
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Verify columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'action_type'
  ) THEN
    RAISE EXCEPTION 'action_type column not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'expires_at'
  ) THEN
    RAISE EXCEPTION 'expires_at column not created';
  END IF;

  -- Verify RPCs exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_notification_action'
  ) THEN
    RAISE EXCEPTION 'handle_notification_action RPC not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'nominate_steward'
  ) THEN
    RAISE EXCEPTION 'nominate_steward RPC not created';
  END IF;

  RAISE NOTICE 'Sprint 3 migration verified: smart notification columns, handle_notification_action, nominate_steward';
END;
$$;
