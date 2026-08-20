-- ============================================================================
-- FEAT-PD019 tranche 2 RIDER (TASK-PD019-2R) — wielded conversation leave.
--
-- Found at the H047 consumer build (2026-08-20): `leave_group_conversation`
-- existed and tranche 2 did not wield it — the tranche-2 mechanism walk
-- enumerated a hand-picked list instead of sweeping the whole family
-- (decomposition fault, recorded in the spec). Without this rider a group
-- that joined a thread could never leave it, and the Hub section's Leave
-- door would have nothing honest to render under a hat.
--
-- Wielded leave is KEY-ONLY — limb 1 (the caller's personal act_as_group in
-- the acting group) plus A's own active participant row. DELIBERATELY no
-- limb 2a: withdrawing A from a thread is an act on A's OWN participation,
-- the analogue of the PC015 exit family (`leave_group_as_group`,
-- 20260706120000 — key-gated in the acting group, never blessed by the
-- context). Standing-per-act (the T2 ruling) governs acts THROUGH A's
-- standing in B; requiring standing to STOP participating would make a
-- removed group uncleanable by its own key-holders. The suite's standing
-- cell proves leave still works after A's removal.
--
-- DROP + CREATE (signature gains p_acting — the 20260706150000 overload
-- lesson); body otherwise copied from the applied definition (probed
-- 2026-08-20); ACL {authenticated, service_role} re-stated; the suspended
-- hard-hold stays subject-independent and unchanged.
--
-- Sibling assertions: the personal path is byte-identical; the suites naming
-- leave_group_conversation assert personal-path behaviour only (same sweep
-- posture as T2's header) — all deliberately left. Red-first cells:
-- wielded-conversation-contracts.test.ts T2R-*.
-- ============================================================================

DROP FUNCTION IF EXISTS public.leave_group_conversation(UUID);

CREATE FUNCTION public.leave_group_conversation(
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
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_acting IS NOT NULL THEN
    -- FEAT-PD019 T2R: KEY-ONLY (limb 1; S5 — a keyless caller learns
    -- nothing). No limb 2a by design — see header.
    IF NOT public.has_permission(v_me, p_acting, 'act_as_group') THEN
      RAISE EXCEPTION 'you do not have permission to act as this group'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  v_actor := COALESCE(p_acting, v_me);
  -- FEAT-PC023 STORY-6: the hard hold closes even this exit.
  IF EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.groups g ON g.id = c.group_id
    WHERE c.id = p_conversation_id AND c.kind = 'group' AND g.status = 'suspended'
  ) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'group is suspended' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.conversation_participants cp
  SET left_at = NOW()
  FROM public.conversations c
  WHERE cp.conversation_id = p_conversation_id
    AND c.id = cp.conversation_id AND c.kind = 'group'
    AND cp.participant_group_id = v_actor AND cp.left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not an active participant of a group conversation' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_group_conversation(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_group_conversation(UUID, UUID) TO authenticated, service_role;

DO $$
DECLARE
  v_bad TEXT;
BEGIN
  SELECT string_agg(p.proname || '/' || p.pronargs, ', ') INTO v_bad
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'leave_group_conversation' AND p.pronargs <> 2;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'PD019-T2R: stale leave overload survived the drop: %', v_bad;
  END IF;
  IF has_function_privilege('anon', 'public.leave_group_conversation(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PD019-T2R: anon holds EXECUTE on the re-issued leave';
  END IF;
  RAISE NOTICE 'PD019-T2R verified: wielded leave live (key-only), old arity gone, ACL clean';
END $$;
