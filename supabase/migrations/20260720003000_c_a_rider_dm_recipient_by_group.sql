-- ==========================================================================
-- C-A RIDER (FEAT-PD008, found at FEAT-H025 surface build): the DM contract's
-- recipient key. SCHEMA GATE — apply only on Stefan's named approval.
-- ==========================================================================
-- Payload-walk catch #3: the group-roster payload (FEAT-PC010) identifies a
-- member by their PERSONAL GROUP id (`member_group_id`) + display name — it
-- carries no public.users.id, and no surface contract resolves one. The C-A
-- contract took `p_other_user_id` (users.id), which no consumer can supply.
-- P-O1 rules the fix: the personal group IS this repo's actor primitive, so
-- the recipient is keyed by personal group id. Behavior otherwise identical
-- (FIM-only both sides per CB-1, active-only, not-self, one per pair).
-- ==========================================================================

DROP FUNCTION public.get_or_create_dm_conversation(UUID);

CREATE OR REPLACE FUNCTION public.get_or_create_dm_conversation(
  p_other_group_id UUID
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

  SELECT is_temporary, is_active
  INTO v_other
  FROM public.users WHERE personal_group_id = p_other_group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipient not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_other.is_temporary OR NOT v_other.is_active THEN
    RAISE EXCEPTION 'Recipient cannot receive direct messages' USING ERRCODE = '42501';
  END IF;
  IF p_other_group_id = v_me THEN
    RAISE EXCEPTION 'Cannot open a conversation with yourself' USING ERRCODE = '22023';
  END IF;

  v_key := LEAST(v_me, p_other_group_id)::text || ':' ||
           GREATEST(v_me, p_other_group_id)::text;

  INSERT INTO public.conversations (kind, dm_pair_key)
  VALUES ('dm', v_key)
  ON CONFLICT (dm_pair_key) WHERE kind = 'dm' DO NOTHING
  RETURNING id INTO v_conv_id;

  IF v_conv_id IS NULL THEN
    SELECT id INTO v_conv_id FROM public.conversations
    WHERE kind = 'dm' AND dm_pair_key = v_key;
  END IF;

  INSERT INTO public.conversation_participants (conversation_id, participant_group_id)
  VALUES (v_conv_id, v_me), (v_conv_id, p_other_group_id)
  ON CONFLICT (conversation_id, participant_group_id) DO NOTHING;

  RETURN v_conv_id;
END;
$$;
REVOKE ALL ON FUNCTION public.get_or_create_dm_conversation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm_conversation(UUID) TO authenticated;
