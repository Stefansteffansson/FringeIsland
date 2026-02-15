-- Migration: Remove DM notification trigger
-- Date: 2026-02-15
--
-- Reason: Direct messages already have their own unread tracking via the
-- Messages badge (conversations.last_read_at). Creating a separate
-- notification for every DM causes duplicate alerts — once on the bell
-- icon AND once on the Messages badge. Removing the trigger so that
-- DMs only surface through the Messages system.
--
-- What this removes:
--   - trg_notify_new_direct_message trigger on direct_messages
--   - notify_new_direct_message() function
--
-- What stays:
--   - conversations.participant_X_last_read_at (unread tracking)
--   - MessagingContext unreadConversationCount (badge in nav)

-- ============================================================
-- 1. Drop the trigger
-- ============================================================

DROP TRIGGER IF EXISTS trg_notify_new_direct_message ON public.direct_messages;

-- ============================================================
-- 2. Drop the function
-- ============================================================

DROP FUNCTION IF EXISTS public.notify_new_direct_message();

-- ============================================================
-- 3. Clean up existing DM notifications (optional but tidy)
-- ============================================================

DELETE FROM public.notifications WHERE type = 'new_direct_message';

-- ============================================================
-- 4. Verify
-- ============================================================

DO $$
DECLARE
  v_trigger_exists BOOLEAN;
  v_func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_new_direct_message'
  ) INTO v_trigger_exists;

  IF v_trigger_exists THEN
    RAISE EXCEPTION 'FAIL: trigger trg_notify_new_direct_message still exists';
  END IF;
  RAISE NOTICE 'OK: trigger removed';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname = 'notify_new_direct_message'
  ) INTO v_func_exists;

  IF v_func_exists THEN
    RAISE EXCEPTION 'FAIL: function notify_new_direct_message still exists';
  END IF;
  RAISE NOTICE 'OK: function removed';
END $$;
