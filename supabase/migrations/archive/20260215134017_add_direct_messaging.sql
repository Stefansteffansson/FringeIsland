-- Migration: Direct Messaging System (Phase 1.5-B)
--
-- Creates:
--   1. conversations table (1:1 user pairs, sorted participant IDs, unique constraint)
--   2. direct_messages table (messages within conversations)
--   3. is_conversation_participant() — SECURITY DEFINER helper for RLS
--   4. RLS policies for both tables
--   5. update_conversation_last_message_at() — trigger to keep inbox sort current
--   6. notify_new_direct_message() — trigger to create notification for recipient
--
-- Behaviors addressed:
--   B-MSG-001: Send a Direct Message
--   B-MSG-002: Message Privacy (RLS)
--   B-MSG-003: Conversation Creation and Uniqueness
--   B-MSG-004: Conversation List (Inbox)
--   B-MSG-005: New Message Notification
--   B-MSG-006: Message Read Tracking

-- ============================================================
-- 1. conversations table
-- ============================================================

CREATE TABLE public.conversations (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1               UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  participant_2               UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_message_at             TIMESTAMPTZ,
  participant_1_last_read_at  TIMESTAMPTZ,
  participant_2_last_read_at  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure only one conversation per user pair (sorted order)
  CONSTRAINT uq_conversation_pair UNIQUE (participant_1, participant_2),
  -- Enforce sorted participant IDs to prevent (A,B) and (B,A) duplicates
  CONSTRAINT chk_participant_order CHECK (participant_1 < participant_2),
  -- Cannot have a conversation with yourself
  CONSTRAINT chk_different_participants CHECK (participant_1 != participant_2)
);

-- Indexes for inbox queries
CREATE INDEX idx_conversations_participant_1
  ON public.conversations (participant_1, last_message_at DESC NULLS LAST);

CREATE INDEX idx_conversations_participant_2
  ON public.conversations (participant_2, last_message_at DESC NULLS LAST);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. direct_messages table
-- ============================================================

CREATE TABLE public.direct_messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  content           TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent empty messages
  CONSTRAINT chk_dm_content_not_empty CHECK (length(trim(content)) > 0)
);

-- Index for loading conversation messages (chronological)
CREATE INDEX idx_direct_messages_conversation_created
  ON public.direct_messages (conversation_id, created_at ASC);

-- Index for unread count queries (messages after a timestamp)
CREATE INDEX idx_direct_messages_conversation_created_desc
  ON public.direct_messages (conversation_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. is_conversation_participant() — SECURITY DEFINER helper
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := public.get_current_user_profile_id();
  IF v_user_id IS NULL THEN RETURN FALSE; END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
      AND (participant_1 = v_user_id OR participant_2 = v_user_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID) TO authenticated;

-- ============================================================
-- 4. RLS policies — conversations
-- ============================================================

-- SELECT: participants only
CREATE POLICY "conversations_select_participant"
ON public.conversations FOR SELECT TO authenticated
USING (
  participant_1 = public.get_current_user_profile_id()
  OR participant_2 = public.get_current_user_profile_id()
);

-- INSERT: authenticated user must be one of the participants
CREATE POLICY "conversations_insert_participant"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
  participant_1 = public.get_current_user_profile_id()
  OR participant_2 = public.get_current_user_profile_id()
);

-- UPDATE: participant can only update their own last_read_at
-- Uses a helper function to enforce column-level restrictions
CREATE OR REPLACE FUNCTION public.can_update_conversation(
  p_conversation_id UUID,
  p_p1_last_read_at TIMESTAMPTZ,
  p_p2_last_read_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_conv RECORD;
BEGIN
  v_user_id := public.get_current_user_profile_id();
  IF v_user_id IS NULL THEN RETURN FALSE; END IF;

  SELECT participant_1, participant_2,
         participant_1_last_read_at, participant_2_last_read_at
  INTO v_conv
  FROM public.conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Must be a participant
  IF v_user_id != v_conv.participant_1 AND v_user_id != v_conv.participant_2 THEN
    RETURN FALSE;
  END IF;

  -- If user is participant_1, they can only change participant_1_last_read_at
  IF v_user_id = v_conv.participant_1 THEN
    -- participant_2_last_read_at must not change
    IF p_p2_last_read_at IS DISTINCT FROM v_conv.participant_2_last_read_at THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- If user is participant_2, they can only change participant_2_last_read_at
  IF v_user_id = v_conv.participant_2 THEN
    -- participant_1_last_read_at must not change
    IF p_p1_last_read_at IS DISTINCT FROM v_conv.participant_1_last_read_at THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_update_conversation(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

CREATE POLICY "conversations_update_own_read_status"
ON public.conversations FOR UPDATE TO authenticated
USING (
  participant_1 = public.get_current_user_profile_id()
  OR participant_2 = public.get_current_user_profile_id()
)
WITH CHECK (
  public.can_update_conversation(id, participant_1_last_read_at, participant_2_last_read_at)
);

-- ============================================================
-- 5. RLS policies — direct_messages
-- ============================================================

-- SELECT: conversation participants only
CREATE POLICY "direct_messages_select_participant"
ON public.direct_messages FOR SELECT TO authenticated
USING (
  public.is_conversation_participant(conversation_id)
);

-- INSERT: must be a conversation participant AND sender_id must be self
CREATE POLICY "direct_messages_insert_participant"
ON public.direct_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = public.get_current_user_profile_id()
  AND public.is_conversation_participant(conversation_id)
);

-- No UPDATE or DELETE policies — messages are immutable in Phase 1.5-B

-- ============================================================
-- 6. update_conversation_last_message_at() trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_conversation_last_message_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_conversation_last_message_at
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message_at();

-- ============================================================
-- 7. notify_new_direct_message() trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_new_direct_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_conversation  RECORD;
  v_sender_name   TEXT;
  v_recipient_id  UUID;
  v_preview       TEXT;
BEGIN
  -- Look up the conversation to find participants
  SELECT participant_1, participant_2
  INTO v_conversation
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Determine the recipient (the participant who is NOT the sender)
  IF NEW.sender_id = v_conversation.participant_1 THEN
    v_recipient_id := v_conversation.participant_2;
  ELSIF NEW.sender_id = v_conversation.participant_2 THEN
    v_recipient_id := v_conversation.participant_1;
  ELSE
    -- Sender is not a participant (shouldn't happen due to RLS, but guard)
    RETURN NEW;
  END IF;

  -- Look up sender name
  SELECT COALESCE(full_name, email, 'Someone')
  INTO v_sender_name
  FROM public.users
  WHERE id = NEW.sender_id;

  -- Truncate message for preview
  v_preview := LEFT(NEW.content, 100);
  IF length(NEW.content) > 100 THEN
    v_preview := v_preview || '...';
  END IF;

  -- Create notification for recipient
  INSERT INTO public.notifications (
    recipient_user_id,
    type,
    title,
    body,
    payload
  ) VALUES (
    v_recipient_id,
    'new_direct_message',
    'New Message from ' || v_sender_name,
    v_preview,
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'sender_name', v_sender_name,
      'message_preview', v_preview
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_direct_message
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_direct_message();

-- ============================================================
-- 8. Enable Realtime for direct_messages (live message delivery)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
