-- ============================================================================
-- TASK-DM-02 — erased authors render 'Unknown', never the sentinel's literal
--
-- Found 2026-08-15 (live walk, the DM-01 tombstone proof): after a member's
-- self-deletion the survivor's DM view shows "[Deleted User]" as the thread
-- title and on the tombstoned bylines. The recorded C-B display law
-- (20260720120000:41-43) says the opposite, verbatim: erased authors render
-- 'Unknown', never the sentinel's literal (lifecycle leak) — the literal tells
-- the survivor what the other member did with their account.
--
-- Root cause: `delete_own_account` scrubs IN PLACE (the users row and personal
-- group persist, renamed to the sentinel literal), so the ladder's rung-3 gate
-- (backing users row exists) passes and faithfully renders the scrubbed name
-- with attribution 'active'. Two individually-coherent mechanisms colliding on
-- exactly the string the law forbade.
--
-- RULED (Stefan, 2026-08-15, with the TASK-IDN-01 board): mechanism A,
-- display-side. `is_decommissioned = true` is rung 3. Scrub-side reassignment
-- (B) was rejected: under the IDN-01 grace blueprint a click-time handover to
-- the sentinel would have to be clawed back on restore; the final wipe already
-- produces the sentinel state naturally, so the two states converge after the
-- window. The stored rows stay verbatim — this migration changes reads only.
--
-- Three leak sites, all re-issued here (COR-A pattern: signatures
-- byte-identical, ACLs preserved by CREATE OR REPLACE):
--
--   ds5_resolve_author_display  the one substrate home of the ladder (COM-14):
--                               the rung-3 gate now also refuses a
--                               decommissioned backing row
--   get_conversation_detail     participants[] served raw g.name — the thread
--                               title leak; now resolved through the ladder
--   get_my_conversations        other_participant_name served raw g2.name —
--                               the inbox leak; now resolved through the ladder
--
-- Participants are personal groups at every insert site (verified: v_me /
-- personal_group_id only, 20260719230500 + rider), so identity resolution via
-- the ladder is exact; a non-identity id would fold to 'Unknown', which is the
-- non-leaking answer by construction.
--
-- Sibling sweep (2026-08-15): forum rung cells pin live/sentinel authors only;
-- the DB-level scrub assertions (account-lifecycle-self-service:471) pin the
-- stored literal, which this migration deliberately preserves;
-- conversation-contracts:214 pins a LIVE counterpart's name truthy — all
-- unaffected. Red-first cells: member-erasure-disposition.test.ts TASK-DM-02.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The attribution ladder — decommissioned is rung 3 (TASK-DM-02)
-- ----------------------------------------------------------------------------
--   Ladder (COM-14; strings per board CB-9; ADR-U021 display law):
--     rung 1  author resolves to a personal group WITH a live backing users
--             row AND a membership row (any status) in the scope group
--             -> the privacy-shaped name, attribution 'active'
--     rung 2  live backing users row, no membership row in scope
--             -> 'Former member' / 'former'  (name withheld; rejoin restores)
--     rung 3  NULL author, no backing users row (the [Deleted User] sentinel
--             and every system group), a DECOMMISSIONED backing row (the
--             scrub-in-place shape — TASK-DM-02), or resolution failure
--             -> 'Unknown' / 'unknown'
--   A DM has no scope group: rung 1 collapses to resolvable -> name.
CREATE OR REPLACE FUNCTION public.ds5_resolve_author_display(
  p_author_group_id UUID,
  p_scope_group_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF p_author_group_id IS NULL THEN
    RETURN jsonb_build_object('display_name', 'Unknown', 'attribution', 'unknown');
  END IF;

  -- rung 3 gate: only a personal group with a LIVE backing users row is a
  -- resolvable identity. The [Deleted User] sentinel has none; a
  -- decommissioned row is a scrubbed-in-place identity whose stored name is
  -- exactly the literal the display law forbids (TASK-DM-02).
  SELECT g.name INTO v_name
  FROM public.groups g
  JOIN public.users u ON u.personal_group_id = g.id
  WHERE g.id = p_author_group_id
    AND NOT u.is_decommissioned;
  IF v_name IS NULL THEN
    RETURN jsonb_build_object('display_name', 'Unknown', 'attribution', 'unknown');
  END IF;

  -- DM rung: no scope group — resolvable is enough.
  IF p_scope_group_id IS NULL THEN
    RETURN jsonb_build_object('display_name', v_name, 'attribution', 'active');
  END IF;

  -- rung 1 vs rung 2: membership row in the scope group, any status —
  -- paused is still a member; leave/removal delete the row (ADR-U021).
  IF EXISTS (
    SELECT 1 FROM public.group_memberships gm
    WHERE gm.group_id = p_scope_group_id
      AND gm.member_group_id = p_author_group_id
  ) THEN
    RETURN jsonb_build_object('display_name', v_name, 'attribution', 'active');
  END IF;

  RETURN jsonb_build_object('display_name', 'Former member', 'attribution', 'former');
END;
$$;
REVOKE ALL ON FUNCTION public.ds5_resolve_author_display(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. get_conversation_detail — participants[] through the ladder (re-issued
--    from 20260812120000; only the participants block changes)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_conversation_detail(p_conversation_id uuid, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  -- participants are personal identities at every insert site). Raw g.name
  -- here was the thread-title leak: it served the scrubbed literal verbatim.
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
$function$
;

-- ----------------------------------------------------------------------------
-- 3. get_my_conversations — other_participant_name through the ladder
--    (re-issued from 20260803190000; only that key changes)
-- ----------------------------------------------------------------------------
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
        -- TASK-DM-02: the ladder, not raw g2.name — the inbox leak.
        'other_participant_name', (
          SELECT public.ds5_resolve_author_display(cp2.participant_group_id, NULL)->>'display_name'
          FROM public.conversation_participants cp2
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
      AND c.sealed_at IS NULL  -- FEAT-PD012: sealed threads leave the live inbox
      -- FEAT-PC023 STORY-8: suspended group conversations leave the inbox
      -- below the admin plane (they return whole on restore).
      AND (public.is_platform_admin()
           OR NOT (c.kind = 'group' AND EXISTS (
                SELECT 1 FROM public.groups gx
                WHERE gx.id = c.group_id AND gx.status = 'suspended')))
  ) rows;
  RETURN jsonb_build_object('conversations', v_result);
END;
$$;
