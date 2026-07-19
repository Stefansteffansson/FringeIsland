-- ==========================================================================
-- Cycle C-A: conversation-model redesign + the DS-5 conversation/message
-- contracts (FEAT-PD008, paired with FEAT-H025). SCHEMA GATE — apply only
-- on Stefan's named approval.
-- ==========================================================================
-- What this does (spec: docs/platform/domain/features/FEAT-PD008-*.md):
--   1. conversation_kinds registry (dm, group seeded) — open TEXT registry,
--      never an enum (DS-5 invariant 6; Q8 firmed: forum stays forum_posts).
--   2. conversation_participants junction — per-participant read state;
--      P-O1: participant_group_id is a personal-group ID.
--   3. conversations: + kind, + group_id (group kind), + title, + dm_pair_key;
--      pair columns retire after data migration (each row emits its two
--      junction rows carrying last_read_at).
--   4. direct_messages RENAME TO messages (PD008 Q2: rename in place —
--      pre-launch, honest naming; triggers stay attached across rename).
--   5. Write-narrowing: INSERT/UPDATE policies drop — the contracts below are
--      the only write door (SECURITY DEFINER). SELECT policies remain.
--   6. ADR-U039 disposition: conversations + messages leave supabase_realtime
--      (legacy postgres_changes shape; notifications stays — A-NTF's call).
--   7. Seeds: create_group_conversations permission (Steward + Guide
--      templates; PD008 Q3: single permission row, join is by membership).
--   8. The eight contracts (PD008 §contracts).
-- Gate decisions recorded (PD008 open questions):
--   Q1: dm_pair_key TEXT set by the creating contract (LEAST:GREATEST of the
--       two personal-group IDs), CHECK non-null for dm kind + partial UNIQUE
--       index = schema-enforced one-DM-per-pair; direct INSERT cannot bypass
--       (no INSERT policy remains).
--   Q2: rename in place.  Q3: one permission row.
-- SECURITY DEFINER justification: contracts enforce participant/membership/
-- permission gates platform-side (ADR-U038); helper reshape keeps the RLS
-- recursion-safe pattern. All contracts fail closed on NULL actor
-- (get_current_personal_group_id is is_active-gated; suspended members are
-- refused — consistent with current platform posture, CB-6 revisits at C-E).
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Conversation kinds registry
-- --------------------------------------------------------------------------
CREATE TABLE public.conversation_kinds (
  key TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.conversation_kinds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversation_kinds_select"
  ON public.conversation_kinds FOR SELECT TO authenticated
  USING (true);

INSERT INTO public.conversation_kinds (key, description) VALUES
  ('dm', 'Pair-grain direct conversation between two FIMs; exactly one per pair'),
  ('group', 'Group-scoped conversation inside a PC-3 group; members join and leave');

-- --------------------------------------------------------------------------
-- 2. conversations: new columns (backfill before constraints)
-- --------------------------------------------------------------------------
ALTER TABLE public.conversations
  ADD COLUMN kind TEXT REFERENCES public.conversation_kinds(key),
  ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  ADD COLUMN title TEXT,
  ADD COLUMN dm_pair_key TEXT;

UPDATE public.conversations
SET kind = 'dm',
    dm_pair_key = participant_1::text || ':' || participant_2::text;

ALTER TABLE public.conversations
  ALTER COLUMN kind SET NOT NULL,
  ADD CONSTRAINT conversations_group_kind_has_group
    CHECK (kind <> 'group' OR group_id IS NOT NULL),
  ADD CONSTRAINT conversations_dm_kind_has_pair_key
    CHECK (kind <> 'dm' OR dm_pair_key IS NOT NULL);

CREATE UNIQUE INDEX idx_conversations_dm_pair_key
  ON public.conversations (dm_pair_key) WHERE kind = 'dm';

CREATE INDEX idx_conversations_group_id
  ON public.conversations (group_id) WHERE group_id IS NOT NULL;

-- --------------------------------------------------------------------------
-- 3. conversation_participants junction (RLS from birth)
-- --------------------------------------------------------------------------
CREATE TABLE public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  participant_group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, participant_group_id)
);

CREATE INDEX idx_conversation_participants_participant
  ON public.conversation_participants (participant_group_id) WHERE left_at IS NULL;

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- 4. Data migration: each pair row emits its two junction rows
-- --------------------------------------------------------------------------
INSERT INTO public.conversation_participants
  (conversation_id, participant_group_id, last_read_at, joined_at)
SELECT id, participant_1, COALESCE(participant_1_last_read_at, created_at), created_at
FROM public.conversations;

INSERT INTO public.conversation_participants
  (conversation_id, participant_group_id, last_read_at, joined_at)
SELECT id, participant_2, COALESCE(participant_2_last_read_at, created_at), created_at
FROM public.conversations;

-- --------------------------------------------------------------------------
-- 5. Reshape is_conversation_participant over the junction (active only)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND participant_group_id = public.get_current_personal_group_id()
      AND left_at IS NULL
  );
$$;

-- --------------------------------------------------------------------------
-- 6. Old policies + guard retire; pair columns drop
-- --------------------------------------------------------------------------
DROP POLICY "conversations_select" ON public.conversations;
DROP POLICY "conversations_insert" ON public.conversations;
DROP POLICY "conversations_update" ON public.conversations;
DROP FUNCTION public.can_update_conversation(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

ALTER TABLE public.conversations
  DROP COLUMN participant_1,
  DROP COLUMN participant_2,
  DROP COLUMN participant_1_last_read_at,
  DROP COLUMN participant_2_last_read_at;

-- --------------------------------------------------------------------------
-- 7. Rename direct_messages -> messages (triggers stay attached)
-- --------------------------------------------------------------------------
DROP POLICY "dm_select" ON public.direct_messages;
DROP POLICY "dm_insert" ON public.direct_messages;

ALTER TABLE public.direct_messages RENAME TO messages;
ALTER INDEX IF EXISTS idx_direct_messages_sender_group_id
  RENAME TO idx_messages_sender_group_id;

CREATE INDEX idx_messages_conversation_created
  ON public.messages (conversation_id, created_at DESC);

-- --------------------------------------------------------------------------
-- 8. Read policies (writes have no policy: contracts are the only door)
-- --------------------------------------------------------------------------
CREATE POLICY "conversations_select"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_participant(id));

CREATE POLICY "messages_select"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id));

CREATE POLICY "conversation_participants_select"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (
    participant_group_id = public.get_current_personal_group_id()
    OR public.is_conversation_participant(conversation_id)
  );

-- --------------------------------------------------------------------------
-- 9. ADR-U039 publication disposition (guarded, idempotent)
-- --------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables
             WHERE pubname = 'supabase_realtime' AND tablename = 'conversations') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.conversations;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables
             WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables
             WHERE pubname = 'supabase_realtime' AND tablename = 'direct_messages') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.direct_messages;
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- 10. Permission seed (catalog row + Steward/Guide templates)
-- --------------------------------------------------------------------------
INSERT INTO public.permissions (name, description, category)
VALUES ('create_group_conversations', 'Open a group conversation in this group', 'communication')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_template_permissions (role_template_id, permission_id)
SELECT rt.id, p.id
FROM public.role_templates rt, public.permissions p
WHERE rt.name IN ('Steward Role Template', 'Guide Role Template')
  AND p.name = 'create_group_conversations'
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------------------------
-- 11. Contracts — the only write door (FEAT-PD008 §contracts)
-- --------------------------------------------------------------------------

-- Helper (internal): resolve caller as a FIM actor; NULL-safe, fails closed.
-- Raises 42501 for no actor (unauthenticated/suspended) and for a Mist (CB-1).
CREATE OR REPLACE FUNCTION public.ds5_require_fim_actor()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_is_temporary BOOLEAN;
BEGIN
  v_me := public.get_current_personal_group_id();
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'No active actor' USING ERRCODE = '42501';
  END IF;
  SELECT is_temporary INTO v_is_temporary
  FROM public.users WHERE auth_user_id = auth.uid();
  IF COALESCE(v_is_temporary, true) THEN
    RAISE EXCEPTION 'Communication is FIM-only' USING ERRCODE = '42501';
  END IF;
  RETURN v_me;
END;
$$;
REVOKE ALL ON FUNCTION public.ds5_require_fim_actor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ds5_require_fim_actor() TO authenticated;

-- get_my_conversations(): the inbox read (PD008 STORY-1)
CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_result JSONB;
BEGIN
  v_me := public.ds5_require_fim_actor();
  SELECT COALESCE(jsonb_agg(row_doc ORDER BY sort_ts DESC NULLS LAST), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      c.last_message_at AS sort_ts,
      jsonb_build_object(
        'id', c.id,
        'kind', c.kind,
        'title', c.title,
        'group_id', c.group_id,
        'group_name', gg.name,
        'other_participant_name', (
          SELECT g2.name
          FROM public.conversation_participants cp2
          JOIN public.groups g2 ON g2.id = cp2.participant_group_id
          WHERE cp2.conversation_id = c.id
            AND cp2.participant_group_id <> v_me
          LIMIT 1
        ),
        'last_message_at', c.last_message_at,
        'has_unread', EXISTS (
          SELECT 1 FROM public.messages m
          WHERE m.conversation_id = c.id
            AND m.created_at > cp.last_read_at
            AND m.sender_group_id IS DISTINCT FROM v_me
        )
      ) AS row_doc
    FROM public.conversation_participants cp
    JOIN public.conversations c ON c.id = cp.conversation_id
    LEFT JOIN public.groups gg ON gg.id = c.group_id
    WHERE cp.participant_group_id = v_me
      AND cp.left_at IS NULL
  ) rows;
  RETURN jsonb_build_object('conversations', v_result);
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;

-- get_conversation_detail(): chronological page + sender display incl.
-- departed/erased senders (PD008 STORY-2; payload-walk catch)
CREATE OR REPLACE FUNCTION public.get_conversation_detail(
  p_conversation_id UUID,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_conv RECORD;
  v_messages JSONB;
  v_senders JSONB;
  v_participants JSONB;
  v_my_last_read TIMESTAMPTZ;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT c.id, c.kind, c.title, c.group_id, g.name AS group_name
  INTO v_conv
  FROM public.conversations c
  LEFT JOIN public.groups g ON g.id = c.group_id
  WHERE c.id = p_conversation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT last_read_at INTO v_my_last_read
  FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id
    AND participant_group_id = v_me AND left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501';
  END IF;

  WITH page AS (
    SELECT m.id, m.sender_group_id, m.content, m.created_at
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND (p_before IS NULL OR m.created_at < p_before)
    ORDER BY m.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'sender_group_id', sender_group_id,
      'content', content, 'created_at', created_at
    ) ORDER BY created_at ASC), '[]'::jsonb)
  INTO v_messages FROM page;

  -- Display resolution for every sender in the page (superset of active
  -- participants: departed and erased senders included; NULL name = the
  -- surface's 'Unknown' fallback until COM-14)
  SELECT COALESCE(jsonb_object_agg(sid::text, sname), '{}'::jsonb)
  INTO v_senders
  FROM (
    SELECT DISTINCT m.sender_group_id AS sid, g.name AS sname
    FROM public.messages m
    LEFT JOIN public.groups g ON g.id = m.sender_group_id
    WHERE m.conversation_id = p_conversation_id
      AND m.sender_group_id IS NOT NULL
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'participant_group_id', cp.participant_group_id,
    'name', g.name,
    'joined_at', cp.joined_at,
    'left_at', cp.left_at,
    'is_me', cp.participant_group_id = v_me
  )), '[]'::jsonb)
  INTO v_participants
  FROM public.conversation_participants cp
  LEFT JOIN public.groups g ON g.id = cp.participant_group_id
  WHERE cp.conversation_id = p_conversation_id;

  RETURN jsonb_build_object(
    'id', v_conv.id, 'kind', v_conv.kind, 'title', v_conv.title,
    'group_id', v_conv.group_id, 'group_name', v_conv.group_name,
    'messages', v_messages, 'senders', v_senders,
    'participants', v_participants, 'my_last_read_at', v_my_last_read
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_conversation_detail(UUID, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conversation_detail(UUID, TIMESTAMPTZ, INTEGER) TO authenticated;

-- send_message(): the one write door for messages (PD008 STORY-3)
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_row public.messages%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Message content must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND participant_group_id = v_me AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.messages (conversation_id, sender_group_id, content)
  VALUES (p_conversation_id, v_me, p_content)
  RETURNING * INTO v_row;
  RETURN jsonb_build_object(
    'id', v_row.id, 'conversation_id', v_row.conversation_id,
    'sender_group_id', v_row.sender_group_id,
    'content', v_row.content, 'created_at', v_row.created_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.send_message(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT) TO authenticated;

-- get_or_create_dm_conversation(): one DM per pair, FIM-only both sides
-- (PD008 STORY-4; race-safe via the partial unique index)
CREATE OR REPLACE FUNCTION public.get_or_create_dm_conversation(
  p_other_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_other RECORD;
  v_key TEXT;
  v_conv_id UUID;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT personal_group_id, is_temporary, is_active
  INTO v_other
  FROM public.users WHERE id = p_other_user_id;
  IF NOT FOUND OR v_other.personal_group_id IS NULL THEN
    RAISE EXCEPTION 'Recipient not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_other.is_temporary OR NOT v_other.is_active THEN
    RAISE EXCEPTION 'Recipient cannot receive direct messages' USING ERRCODE = '42501';
  END IF;
  IF v_other.personal_group_id = v_me THEN
    RAISE EXCEPTION 'Cannot open a conversation with yourself' USING ERRCODE = '22023';
  END IF;

  v_key := LEAST(v_me, v_other.personal_group_id)::text || ':' ||
           GREATEST(v_me, v_other.personal_group_id)::text;

  INSERT INTO public.conversations (kind, dm_pair_key)
  VALUES ('dm', v_key)
  ON CONFLICT (dm_pair_key) WHERE kind = 'dm' DO NOTHING
  RETURNING id INTO v_conv_id;

  IF v_conv_id IS NULL THEN
    SELECT id INTO v_conv_id FROM public.conversations
    WHERE kind = 'dm' AND dm_pair_key = v_key;
  END IF;

  INSERT INTO public.conversation_participants (conversation_id, participant_group_id)
  VALUES (v_conv_id, v_me), (v_conv_id, v_other.personal_group_id)
  ON CONFLICT (conversation_id, participant_group_id) DO NOTHING;

  RETURN v_conv_id;
END;
$$;
REVOKE ALL ON FUNCTION public.get_or_create_dm_conversation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm_conversation(UUID) TO authenticated;

-- create_group_conversation(): permission-gated (PD008 STORY-5)
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_group_id UUID,
  p_title TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_conv_id UUID;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF NOT public.has_permission(v_me, p_group_id, 'create_group_conversations') THEN
    RAISE EXCEPTION 'Missing permission: create_group_conversations' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.conversations (kind, group_id, title)
  VALUES ('group', p_group_id, NULLIF(trim(COALESCE(p_title, '')), ''))
  RETURNING id INTO v_conv_id;
  INSERT INTO public.conversation_participants (conversation_id, participant_group_id)
  VALUES (v_conv_id, v_me);
  RETURN v_conv_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_group_conversation(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(UUID, TEXT) TO authenticated;

-- get_group_conversations(): the group-page listing read (PD008 STORY-6;
-- payload-walk catch)
CREATE OR REPLACE FUNCTION public.get_group_conversations(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_result JSONB;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = p_group_id AND member_group_id = v_me AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not a member of this group' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id, 'title', c.title, 'created_at', c.created_at,
    'am_i_participant', EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = c.id
        AND cp.participant_group_id = v_me AND cp.left_at IS NULL
    )
  ) ORDER BY c.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM public.conversations c
  WHERE c.kind = 'group' AND c.group_id = p_group_id;
  RETURN jsonb_build_object('conversations', v_result);
END;
$$;
REVOKE ALL ON FUNCTION public.get_group_conversations(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_conversations(UUID) TO authenticated;

-- join_group_conversation() / leave_group_conversation() (PD008 STORY-6)
CREATE OR REPLACE FUNCTION public.join_group_conversation(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_group_id UUID;
BEGIN
  v_me := public.ds5_require_fim_actor();
  SELECT group_id INTO v_group_id
  FROM public.conversations
  WHERE id = p_conversation_id AND kind = 'group';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group conversation not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = v_group_id AND member_group_id = v_me AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not a member of this group' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.conversation_participants (conversation_id, participant_group_id)
  VALUES (p_conversation_id, v_me)
  ON CONFLICT (conversation_id, participant_group_id)
  DO UPDATE SET left_at = NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.join_group_conversation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_group_conversation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_group_conversation(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
BEGIN
  v_me := public.ds5_require_fim_actor();
  UPDATE public.conversation_participants cp
  SET left_at = NOW()
  FROM public.conversations c
  WHERE cp.conversation_id = p_conversation_id
    AND c.id = cp.conversation_id AND c.kind = 'group'
    AND cp.participant_group_id = v_me AND cp.left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not an active participant of a group conversation' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.leave_group_conversation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_group_conversation(UUID) TO authenticated;

-- mark_conversation_read(): own cursor only (PD008 STORY-7)
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
BEGIN
  v_me := public.ds5_require_fim_actor();
  UPDATE public.conversation_participants
  SET last_read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND participant_group_id = v_me AND left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_conversation_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;
