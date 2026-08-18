-- ============================================================================
-- FEAT-PD019 tranche 2 (TASK-PD019-2) — wielded group conversations: the
-- ADR-U041 acting parameter reaches the six conversation contracts.
--
-- Board (Stefan, 2026-08-18, recorded in the spec's STORY-4): all six
-- contracts (list + create included); the SHARED GROUP READ-CLOCK (A
-- participates as itself — one last_read_at row, the shared-inbox norm);
-- STANDING PER ACT (every wielded act re-runs the two-limb gate,
-- forum-consistent — organizational actors are re-authorized per action;
-- persons keep their family's looser participation-wall semantics); HINT
-- SILENCE v1 (ds5_emit_message_hint already skips a participant with no
-- backing users row — verified applied body; the future rider is a
-- topic-scoped channel via ADR-U039 §4 amendment, never emitter fan-out).
--
-- What this migration does:
--   1. ds5_assert_wielded_content_gate  WIDENED (CREATE OR REPLACE, same
--      signature): p_permission_name gains DEFAULT NULL; NULL skips limb 2b.
--      This family's bar for list/join/send/read is membership, which limb 2a
--      already checks; only create carries a content permission
--      (create_group_conversations, seeded to Steward/Guide templates).
--   2. Six DROP + CREATE re-issues, each gaining trailing p_acting uuid
--      DEFAULT NULL (the 20260706150000 overload lesson — a signature change
--      via create-or-replace leaves the old arity alive):
--        get_group_conversations   (list door — am_i_participant becomes the
--                                   acting view's participation)
--        create_group_conversation (limb 2b; A lands as FIRST participant)
--        join_group_conversation   (A's row; the family's own rejoin ON
--                                   CONFLICT semantics)
--        get_conversation_detail   (A's participation; my_last_read = A's
--                                   clock; PC026 admin arm personal-path-only)
--        send_message              (sender_group_id = A behind A's
--                                   participant wall)
--        mark_conversation_read    (advances A's single clock — RULED shared)
--      NULL p_acting keeps every path byte-identical to the applied bodies
--      (probed 2026-08-18; copied from pg_get_functiondef, not migration
--      text). Availability-guard subject is the actor of record (the
--      tranche-1 ruling). A wielded act against a DM refuses at limb 2a (the
--      conversation's group is NULL — person-anchored by construction, no
--      special-case code). S5 posture: limb 1 fires before anything, so a
--      keyless caller learns nothing — not even 'Not a participant'.
--
-- ACL provenance (probed on the APPLIED objects): all six carry
-- {authenticated, service_role}; re-stated after each drop. The helper stays
-- client-sealed (revoked from authenticated). Per-function revoke lines are
-- load-bearing (TASK-SEC-01 — ALTER DEFAULT PRIVILEGES does not cover).
--
-- Sibling assertions (sweep 2026-08-18): 14 suite files exercise these six
-- contracts — ALL on the personal (no-acting) paths, which stay
-- byte-identical; no arity pins exist; nothing asserts on the helper by
-- name. ALL DELIBERATELY LEFT. The post-apply communication slice run is the
-- honest verifier (the PD020 lesson: greps miss suites that don't assert on
-- the changed object). Red-first cells: wielded-conversation-contracts.test.ts.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The gate widens — NULL permission = limbs 1 + 2a only
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ds5_assert_wielded_content_gate(
  p_actor UUID,
  p_acting_group_id UUID,
  p_context_group_id UUID,
  p_permission_name TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Limb 1 — the key: the caller personally holds act_as_group in the acting
  -- group. Wielding precedes existence (the S5 adversarial posture): a
  -- keyless caller learns nothing about the acting group's standing — 42501
  -- whether or not that standing exists.
  IF NOT public.has_permission(p_actor, p_acting_group_id, 'act_as_group') THEN
    RAISE EXCEPTION 'you do not have permission to act as this group'
      USING ERRCODE = '42501';
  END IF;

  -- Limb 2a — standing: the acting group is an ACTIVE engagement group and an
  -- ACTIVE member of the context group (the is_member_of_context posture,
  -- 20260706150000; membership-freshness — paused/gone refuses honestly). A
  -- NULL context (a DM's group_id, a nonexistent conversation) refuses here
  -- by construction — person-anchored families are never wieldable.
  IF NOT EXISTS (
    SELECT 1
    FROM public.group_memberships gm
    JOIN public.groups g ON g.id = gm.member_group_id
    WHERE gm.group_id = p_context_group_id
      AND gm.member_group_id = p_acting_group_id
      AND gm.status = 'active'
      AND g.group_type = 'engagement'
      AND g.status = 'active'
  ) THEN
    RAISE EXCEPTION 'the acting group is not an active member of this group'
      USING ERRCODE = '42501';
  END IF;

  -- Limb 2b — the group's own power (FEAT-PD019 T2: skipped when the family's
  -- bar is membership itself — list/join/send/read pass NULL; create passes
  -- create_group_conversations; the forum trio passes its three permissions).
  IF p_permission_name IS NOT NULL
     AND NOT public.has_permission(p_acting_group_id, p_context_group_id, p_permission_name) THEN
    RAISE EXCEPTION 'the acting group does not hold % in this group', p_permission_name
      USING ERRCODE = '42501';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.ds5_assert_wielded_content_gate(UUID, UUID, UUID, TEXT) IS
  'FEAT-PD019 (ADR-U041): the two-limb wielding gate for DS-5 content contracts — limb 1 the caller''s personal act_as_group key in the acting group (S5: keyless learns nothing); limb 2a the acting group''s own active standing in the context (a NULL context — DMs — refuses by construction); limb 2b the content permission where the family has one (NULL skips — membership-barred families, T2). One level, both limbs, per act — no chaining (ADR-U041 §2d). Refusals are 42501 naming the failing limb. SECURITY DEFINER: role-fabric walk across RLS from inside definer contracts; internal — not client-callable.';

REVOKE ALL ON FUNCTION public.ds5_assert_wielded_content_gate(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ds5_assert_wielded_content_gate(UUID, UUID, UUID, TEXT) TO service_role;

-- ----------------------------------------------------------------------------
-- 2. get_group_conversations — the list door
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_group_conversations(UUID);

CREATE FUNCTION public.get_group_conversations(
  p_group_id UUID,
  p_acting UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_viewer UUID;
  v_result JSONB;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_acting IS NULL THEN
    -- FEAT-PC026 (ADM-G): the suspended-scoped admin sight arm (see 1.).
    IF NOT (
      EXISTS (
        SELECT 1 FROM public.group_memberships
        WHERE group_id = p_group_id AND member_group_id = v_me AND status = 'active'
      )
      OR (public.is_platform_admin()
          AND (SELECT g.status FROM public.groups g WHERE g.id = p_group_id) = 'suspended')
    ) THEN
      RAISE EXCEPTION 'Not a member of this group' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- FEAT-PD019 T2: the two-limb wielding gate (standing per act — RULED).
    PERFORM public.ds5_assert_wielded_content_gate(v_me, p_acting, p_group_id);
  END IF;
  -- FEAT-PC023 STORY-8: suspended content is quarantined below the admin plane.
  IF (SELECT g.status FROM public.groups g WHERE g.id = p_group_id) = 'suspended'
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'group is suspended' USING ERRCODE = 'P0001';
  END IF;
  v_viewer := COALESCE(p_acting, v_me);
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id, 'title', c.title, 'created_at', c.created_at,
    'am_i_participant', EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = c.id
        AND cp.participant_group_id = v_viewer AND cp.left_at IS NULL
    )
  ) ORDER BY c.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM public.conversations c
  WHERE c.kind = 'group' AND c.group_id = p_group_id
    AND c.sealed_at IS NULL;  -- FEAT-PD012: sealed threads are not live
  RETURN jsonb_build_object('conversations', v_result);
END;
$$;

REVOKE ALL ON FUNCTION public.get_group_conversations(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_conversations(UUID, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. create_group_conversation — the group opens a thread (limb 2b)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_group_conversation(UUID, TEXT);

CREATE FUNCTION public.create_group_conversation(
  p_group_id UUID,
  p_title TEXT DEFAULT NULL,
  p_acting UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_actor UUID;
  v_conv_id UUID;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_acting IS NULL THEN
    IF NOT public.has_permission(v_me, p_group_id, 'create_group_conversations') THEN
      RAISE EXCEPTION 'Missing permission: create_group_conversations' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- FEAT-PD019 T2: the two-limb gate WITH the family's create permission.
    PERFORM public.ds5_assert_wielded_content_gate(v_me, p_acting, p_group_id, 'create_group_conversations');
  END IF;
  v_actor := COALESCE(p_acting, v_me);
  -- FEAT-PC023: the availability guard — subject is the actor of record
  -- (pure substitution, the tranche-1 ruling).
  PERFORM public.assert_group_writable(p_group_id, v_actor);
  INSERT INTO public.conversations (kind, group_id, title)
  VALUES ('group', p_group_id, NULLIF(trim(COALESCE(p_title, '')), ''))
  RETURNING id INTO v_conv_id;
  INSERT INTO public.conversation_participants (conversation_id, participant_group_id)
  VALUES (v_conv_id, v_actor);
  RETURN v_conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_conversation(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(UUID, TEXT, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. join_group_conversation — the group takes its seat
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.join_group_conversation(UUID);

CREATE FUNCTION public.join_group_conversation(
  p_conversation_id UUID,
  p_acting UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_actor UUID;
  v_group_id UUID;
  v_sealed TIMESTAMPTZ;
BEGIN
  v_me := public.ds5_require_fim_actor();
  SELECT group_id, sealed_at INTO v_group_id, v_sealed
  FROM public.conversations
  WHERE id = p_conversation_id AND kind = 'group';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group conversation not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_acting IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.group_memberships
      WHERE group_id = v_group_id AND member_group_id = v_me AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Not a member of this group' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- FEAT-PD019 T2: the two-limb gate (membership IS the family's bar).
    PERFORM public.ds5_assert_wielded_content_gate(v_me, p_acting, v_group_id);
  END IF;
  v_actor := COALESCE(p_acting, v_me);
  -- FEAT-PC023: the availability guard — subject is the actor of record.
  PERFORM public.assert_group_writable(v_group_id, v_actor);
  -- FEAT-PD012: no joining an ended thread (behind the membership wall).
  IF v_sealed IS NOT NULL THEN
    RAISE EXCEPTION 'Conversation is sealed' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.conversation_participants (conversation_id, participant_group_id)
  VALUES (p_conversation_id, v_actor)
  ON CONFLICT (conversation_id, participant_group_id)
  DO UPDATE SET left_at = NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.join_group_conversation(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_group_conversation(UUID, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. get_conversation_detail — the group reads (re-issued from 20260815190000)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_conversation_detail(UUID, TIMESTAMPTZ, INTEGER);

CREATE FUNCTION public.get_conversation_detail(
  p_conversation_id UUID,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_acting UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_viewer UUID;
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

  IF p_acting IS NOT NULL THEN
    -- FEAT-PD019 T2: the two-limb gate against the conversation's group (a
    -- DM's NULL group refuses at limb 2a — person-anchored by construction).
    PERFORM public.ds5_assert_wielded_content_gate(v_me, p_acting, v_conv.group_id);
  END IF;
  v_viewer := COALESCE(p_acting, v_me);

  SELECT last_read_at INTO v_my_last_read
  FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id
    AND participant_group_id = v_viewer AND left_at IS NULL;
  IF NOT FOUND THEN
    IF p_acting IS NOT NULL THEN
      -- The wielded path has no admin arm (admins do not wield — the PC026
      -- sight stays personal-path-only, per the STORY-4 board).
      RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501';
    END IF;
    -- FEAT-PC026 (ADM-G): the admin sight arm — group-kind AND suspended
    -- only (the G-4 verdict). Every other non-participant keeps the
    -- byte-identical refusal.
    IF NOT (public.is_platform_admin()
            AND v_conv.kind = 'group'
            AND (SELECT g.status FROM public.groups g WHERE g.id = v_conv.group_id) = 'suspended') THEN
      RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501';
    END IF;
  END IF;
  -- FEAT-PC023 STORY-8: group-kind conversations are quarantined with their
  -- group below the admin plane; DMs are never held.
  IF v_conv.kind = 'group'
     AND (SELECT g.status FROM public.groups g WHERE g.id = v_conv.group_id) = 'suspended'
     AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'group is suspended' USING ERRCODE = 'P0001';
  END IF;

  WITH page AS (
    SELECT m.id, m.sender_group_id, m.content, m.is_deleted, m.created_at
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND (p_before IS NULL OR m.created_at < p_before)
    ORDER BY m.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'sender_group_id', sender_group_id,
      'content', content, 'is_deleted', is_deleted, 'created_at', created_at
    ) ORDER BY created_at ASC), '[]'::jsonb)
  INTO v_messages FROM page;

  -- Display resolution for every sender in the page — the COM-14 ladder
  -- (scope = the conversation's group; NULL scope for a dm).
  SELECT COALESCE(jsonb_object_agg(
    sid::text,
    public.ds5_resolve_author_display(sid, v_conv.group_id)
  ), '{}'::jsonb)
  INTO v_senders
  FROM (
    SELECT DISTINCT m.sender_group_id AS sid
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND m.sender_group_id IS NOT NULL
  ) s;

  -- TASK-DM-02: participant names go through the ladder too (NULL scope —
  -- identity resolution; a group participant resolves through the widened
  -- ladder, FEAT-PD019 T1). is_me stays the PERSONAL identity — the surface
  -- highlights the acting row client-side by participant_group_id.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'participant_group_id', cp.participant_group_id,
    'name', public.ds5_resolve_author_display(cp.participant_group_id, NULL)->>'display_name',
    'joined_at', cp.joined_at,
    'left_at', cp.left_at,
    'is_me', cp.participant_group_id = v_me
  )), '[]'::jsonb)
  INTO v_participants
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = p_conversation_id;

  RETURN jsonb_build_object(
    'id', v_conv.id, 'kind', v_conv.kind, 'title', v_conv.title,
    'group_id', v_conv.group_id, 'group_name', v_conv.group_name,
    'messages', v_messages, 'senders', v_senders,
    'participants', v_participants, 'my_last_read_at', v_my_last_read
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_conversation_detail(UUID, TIMESTAMPTZ, INTEGER, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conversation_detail(UUID, TIMESTAMPTZ, INTEGER, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. send_message — the group speaks (behind A's participant wall)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT);

CREATE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_acting UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_actor UUID;
  v_acting_ctx UUID;
  v_row public.messages%ROWTYPE;
  v_hold_group UUID;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Message content must not be empty' USING ERRCODE = '22023';
  END IF;
  IF p_acting IS NOT NULL THEN
    -- FEAT-PD019 T2: standing per act (RULED) — the limbs run on EVERY send;
    -- a missing conversation or a DM leaves the context NULL, which limb 2a
    -- refuses without leaking (the gate's limb 1 fires first — S5).
    SELECT c.group_id INTO v_acting_ctx
      FROM public.conversations c
     WHERE c.id = p_conversation_id AND c.kind = 'group';
    PERFORM public.ds5_assert_wielded_content_gate(v_me, p_acting, v_acting_ctx);
  END IF;
  v_actor := COALESCE(p_acting, v_me);
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND participant_group_id = v_actor AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501';
  END IF;
  -- FEAT-PC023: group-kind conversations freeze with their group; DMs are
  -- pair-grain and never held (the recorded verdict). Subject is the actor
  -- of record (pure substitution, the tranche-1 ruling).
  SELECT c.group_id INTO v_hold_group
    FROM public.conversations c
   WHERE c.id = p_conversation_id AND c.kind = 'group';
  IF v_hold_group IS NOT NULL THEN
    PERFORM public.assert_group_writable(v_hold_group, v_actor);
  END IF;
  -- FEAT-PD012: seal ends activity — behind the participant wall so refusal
  -- classes stay non-leaking (outsiders still see 42501, never the seal).
  IF EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id AND sealed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Conversation is sealed' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.messages (conversation_id, sender_group_id, content)
  VALUES (p_conversation_id, v_actor, p_content)
  RETURNING * INTO v_row;
  RETURN jsonb_build_object(
    'id', v_row.id, 'conversation_id', v_row.conversation_id,
    'sender_group_id', v_row.sender_group_id,
    'content', v_row.content, 'created_at', v_row.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_message(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_message(UUID, TEXT, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. mark_conversation_read — the shared group clock (RULED)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.mark_conversation_read(UUID);

CREATE FUNCTION public.mark_conversation_read(
  p_conversation_id UUID,
  p_acting UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_actor UUID;
  v_acting_ctx UUID;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_acting IS NOT NULL THEN
    -- FEAT-PD019 T2: standing per act; A's ONE last_read_at row is the
    -- group's clock — one representative's read marks it read for the group
    -- (the shared-inbox norm, RULED).
    SELECT c.group_id INTO v_acting_ctx
      FROM public.conversations c
     WHERE c.id = p_conversation_id AND c.kind = 'group';
    PERFORM public.ds5_assert_wielded_content_gate(v_me, p_acting, v_acting_ctx);
  END IF;
  v_actor := COALESCE(p_acting, v_me);
  UPDATE public.conversation_participants
  SET last_read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND participant_group_id = v_actor AND left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_read(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 8. Verification — old arities gone, ACLs clean
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_bad TEXT;
BEGIN
  SELECT string_agg(p.proname || '/' || p.pronargs, ', ') INTO v_bad
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND ((p.proname = 'get_group_conversations' AND p.pronargs <> 2)
      OR (p.proname = 'create_group_conversation' AND p.pronargs <> 3)
      OR (p.proname = 'join_group_conversation' AND p.pronargs <> 2)
      OR (p.proname = 'get_conversation_detail' AND p.pronargs <> 4)
      OR (p.proname = 'send_message' AND p.pronargs <> 3)
      OR (p.proname = 'mark_conversation_read' AND p.pronargs <> 2));
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'PD019-T2: stale conversation-contract overloads survived the drop: %', v_bad;
  END IF;

  IF has_function_privilege('anon', 'public.get_group_conversations(uuid, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.create_group_conversation(uuid, text, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.join_group_conversation(uuid, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.get_conversation_detail(uuid, timestamptz, integer, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.send_message(uuid, text, uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.mark_conversation_read(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PD019-T2: anon holds EXECUTE on a re-issued conversation contract';
  END IF;
  IF has_function_privilege('authenticated', 'public.ds5_assert_wielded_content_gate(uuid, uuid, uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PD019-T2: the wielding gate is client-executable';
  END IF;

  RAISE NOTICE 'PD019-T2 verified: six contracts re-issued with p_acting (old arities gone), gate widened (NULL permission = limbs 1+2a), ACLs clean';
END $$;
