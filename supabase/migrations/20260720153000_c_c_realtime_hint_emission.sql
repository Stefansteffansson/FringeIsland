-- ==========================================================================
-- Cycle C-C (FEAT-PD010) — realtime hint emission: the ADR-U039 live-delivery
-- layer for conversations, the unread badge, and group forums.
-- SCHEMA GATE — apply only on Stefan's named approval.
-- ==========================================================================
-- What this does (spec: docs/platform/domain/features/FEAT-PD010-*.md):
--   1. ds5_emit_hint(payload, event, topic) — one thin, non-fatal emit helper
--      wrapping realtime.send(..., private => TRUE). The PC009 shape
--      (20260703154102:129-138) upgraded: the swallow becomes a Postgres
--      WARNING (the platform tier's no-silent-failures law).
--   2. Three AFTER triggers that emit content-free hints (ids only), never a
--      contract body — so EVERY write path (the DS-5 contracts and the
--      PC-4-audited admin insert) emits identically and future write paths
--      inherit emission for free:
--        * messages     AFTER INSERT  -> one 'message_created' per ACTIVE
--          participant's account topic (sender included; departed excluded).
--        * forum_posts  AFTER INSERT  -> one 'forum_post_created' on the group
--          topic (top-level post AND reply — both are INSERTs).
--        * forum_posts  AFTER UPDATE  -> one 'forum_post_moderated' on the
--          group topic, only on the is_deleted false->true transition.
--   3. Two RLS receive policies on realtime.messages (FOR SELECT TO
--      authenticated, extension='broadcast'): own-conversations topic (the
--      session-channel shape, byte-for-byte) and group-forum topic
--      (membership-gated). NO client-send policy on any C-C topic — as with
--      the session channel, no INSERT policy exists, so a spoofed hint is
--      impossible by construction (ADR-U039 rule 3).
--
--   NO publication changes (conversations/messages left supabase_realtime at
--   C-A; forum_posts was never in it). NO new tables. NO new client contracts.
--   NO payload changes to existing reads (verify-on-signal re-exercises the
--   already-realized get_my_conversations / get_conversation_detail /
--   get_group_forum authorized fetch paths).
--
-- ── Spec open questions resolved at this gate ─────────────────────────────
--   Q1 (forum-policy membership helper): REUSE the existing
--       public.is_active_group_member(UUID) (20260222000000:316) — LANGUAGE
--       sql, SECURITY DEFINER, STABLE, search_path='', already granted to
--       authenticated, body a single EXISTS over group_memberships keyed on
--       get_current_personal_group_id(). It fits the PG17 RLS simple-body
--       ceiling exactly; no new helper is added. (A Mist is never an active
--       member of an engagement group, so this refuses a Mist for free — CB-1
--       gates upstream; suspended members are refused because
--       get_current_personal_group_id() is is_active-gated.)
--   Q2 (emit-site shape): ONE shared thin helper (ds5_emit_hint), NOT inline
--       per trigger. Rationale: (a) the non-fatal wrap + WARNING discipline
--       lives in exactly one place, so all three sites — and every future
--       site — are guaranteed identical; (b) the message fan-out calls it
--       once per participant, giving PER-EMIT isolation (one participant's
--       realtime hiccup cannot skip the rest). This is a thin wrapper, NOT the
--       registry/queue the spec rabbit-holes against — each trigger still
--       decides its own topic/event/payload.
--   Q3 (moderation-event edge): the AFTER UPDATE trigger conditions the
--       transition at the TRIGGER level via
--       WHEN (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted AND NEW.is_deleted),
--       not in the body. Idempotent re-moderation emits nothing: the C-B
--       contract already no-ops the UPDATE when is_deleted is already true
--       (20260720120000:294), and even a no-op UPDATE would fail the WHEN
--       clause — double protection.
--
-- ── SECURITY DEFINER justification (documented per platform CLAUDE.md) ─────
--   All four functions are SECURITY DEFINER, search_path='':
--     * ds5_emit_hint — INSERT into realtime.messages (via realtime.send)
--       requires elevation; clients have no send policy. Only reachable from
--       the triggers (REVOKEd from every client role).
--     * ds5_emit_message_hint — must read conversation_participants + users to
--       fan out, and must emit identically regardless of the inserting role
--       (a DS-5 contract's definer context OR the service_role admin insert).
--     * ds5_emit_forum_post_hint / ds5_emit_forum_moderation_hint — emit
--       uniformly across every write path; trigger-only, REVOKEd from clients.
--   The three trigger functions return `trigger` (Postgres refuses a direct
--   call; PostgREST never exposes them). The helper is REVOKEd from clients
--   (W12: a direct rpc() is refused). is_active_group_member stays caller-
--   granted BY DESIGN — it runs inside RLS under the caller and returns only a
--   boolean.
--
--   Conformance lockstep (same PR, test-side): ds5_emit_message_hint textually
--   references public.conversation_participants, so it joins DS_OWNED_ALLOWLIST
--   (internal-api-conformance.test.ts). The emit helper and the two forum
--   trigger functions reference no DS-owned table (NEW.* only), so they are not
--   listed there.
--
-- Comment header: FEAT-PD010 + ADR-U039 (docrine layer). No ADR signature
-- change (no Platform API contract added — triggers + receive policies only).
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. The shared emit helper — non-fatal by design (ADR-U039 doctrine rule 5:
--    durable state first, push second). A realtime failure NEVER fails the
--    write; it raises a WARNING (never silence, never rollback).
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ds5_emit_hint(
  p_payload JSONB,
  p_event TEXT,
  p_topic TEXT
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  BEGIN
    PERFORM realtime.send(p_payload, p_event, p_topic, TRUE);
  EXCEPTION WHEN OTHERS THEN
    -- PC009's shape, upgraded: log, never swallow, never fail the write.
    RAISE WARNING 'ds5 hint emission failed: %', SQLERRM;
  END;
END;
$$;
REVOKE ALL ON FUNCTION public.ds5_emit_hint(JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.ds5_emit_hint(JSONB, TEXT, TEXT) IS
  'FEAT-PD010 (ADR-U039): server-originated content-free hint on a private broadcast topic. Non-fatal (WARNING on failure, never rollback). Trigger-path only — REVOKEd from every client role (the INSERT into realtime.messages needs definer elevation).';

-- --------------------------------------------------------------------------
-- 2. messages AFTER INSERT — fan one hint per ACTIVE participant's account
--    topic (sender included; left_at IS NULL). auth_uid resolves via the P-O1
--    chain in reverse: participant_group_id -> users.personal_group_id ->
--    users.auth_user_id. One ds5_emit_hint call per participant = per-emit
--    isolation (Q2).
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ds5_emit_message_hint()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_uid UUID;
BEGIN
  FOR v_auth_uid IN
    SELECT u.auth_user_id
    FROM public.conversation_participants cp
    JOIN public.users u ON u.personal_group_id = cp.participant_group_id
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.left_at IS NULL
      AND u.auth_user_id IS NOT NULL
  LOOP
    PERFORM public.ds5_emit_hint(
      jsonb_build_object('conversation_id', NEW.conversation_id),
      'message_created',
      'account:' || v_auth_uid::text || ':conversations'
    );
  END LOOP;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.ds5_emit_message_hint() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_ds5_emit_message_hint ON public.messages;
CREATE TRIGGER trg_ds5_emit_message_hint
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.ds5_emit_message_hint();

-- --------------------------------------------------------------------------
-- 3. forum_posts AFTER INSERT — one hint to the group topic (top-level post
--    AND reply are both INSERTs; both emit forum_post_created).
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ds5_emit_forum_post_hint()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.ds5_emit_hint(
    jsonb_build_object('post_id', NEW.id),
    'forum_post_created',
    'group:' || NEW.group_id::text || ':forum'
  );
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.ds5_emit_forum_post_hint() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_ds5_emit_forum_post_hint ON public.forum_posts;
CREATE TRIGGER trg_ds5_emit_forum_post_hint
  AFTER INSERT ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.ds5_emit_forum_post_hint();

-- --------------------------------------------------------------------------
-- 4. forum_posts AFTER UPDATE — one hint on the is_deleted false->true
--    transition only (Q3: the WHEN clause is the idempotency guarantee).
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ds5_emit_forum_moderation_hint()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.ds5_emit_hint(
    jsonb_build_object('post_id', NEW.id),
    'forum_post_moderated',
    'group:' || NEW.group_id::text || ':forum'
  );
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.ds5_emit_forum_moderation_hint() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_ds5_emit_forum_moderation_hint ON public.forum_posts;
CREATE TRIGGER trg_ds5_emit_forum_moderation_hint
  AFTER UPDATE ON public.forum_posts
  FOR EACH ROW
  WHEN (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted AND NEW.is_deleted)
  EXECUTE FUNCTION public.ds5_emit_forum_moderation_hint();

-- --------------------------------------------------------------------------
-- 5. Realtime authorization — RECEIVE policies on realtime.messages
--    (ADR-U039 rules 2-3; §8 Q7's law: receipt is policy, never a channel
--    filter). RLS is already enabled on realtime.messages (PC009). No client
--    SEND policy exists on any C-C topic, so a client cannot broadcast onto
--    them at all — signals are server-originated by construction.
-- --------------------------------------------------------------------------

-- Conversations: own topic only — byte-for-byte the session-channel shape.
DROP POLICY IF EXISTS "ds5_conversations_receive_own" ON realtime.messages;
CREATE POLICY "ds5_conversations_receive_own"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND realtime.topic() = 'account:' || (SELECT auth.uid()::text) || ':conversations'
);

-- Forum: the caller must be an ACTIVE member of the topic's group. The uuid is
-- parsed from 'group:<uuid>:forum' via split_part; the LIKE guard fixes the
-- shape before the cast. Membership is the reused is_active_group_member(uuid)
-- (Q1) — a simple-bodied SECURITY DEFINER helper (PG17 RLS ceiling-safe),
-- caller-granted, running under the subscriber's own identity.
DROP POLICY IF EXISTS "ds5_forum_receive_member" ON realtime.messages;
CREATE POLICY "ds5_forum_receive_member"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND realtime.topic() LIKE 'group:%:forum'
  AND public.is_active_group_member(split_part(realtime.topic(), ':', 2)::uuid)
);
