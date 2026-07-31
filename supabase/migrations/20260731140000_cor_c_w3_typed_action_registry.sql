-- ============================================================================
-- COR-C W3 — home the U051 typed-action registry platform-side
-- (Anatomy Audit III: AC3-5 Major, AC3-9 · closes GC-9's substrate half.
--  Shape per ADR-U051 Amendment 1 [Stefan, 2026-07-31]: the Ferd handler
--  family stays boolean accept/decline; NO parameter widening rides here.)
--
-- The defect (AC3-5): the answerability rule lived only in Hub TypeScript —
-- DISPATCH_SEGMENTS (which kinds are answerable, and where) and RESPONSE_SETS
-- (what the responses are, incl. button copy). Platform-side counterpart:
-- none. Adding a third answerable kind was a two-file Hub deploy, not a data
-- registration; the Gimbal would re-implement both maps. Contrast: category /
-- kind copy was already correctly server-authored data — this migration gives
-- the typed-action layer the same treatment.
--
-- The fix (additive, backward-compatible — the same move N-B made adding
-- action_data):
--   1. notification_action_types — the response-set registry keyed by
--      action_type (ADR-U051 ruling 1 made literal data). Ferd seeds exactly
--      the accept/decline family (U051A1).
--   2. notification_kinds.dispatch_segment — the handler identity for an
--      answerable kind (NULL = passive). A kind absent is not "not
--      answerable in the Hub" any more — it is not answerable anywhere,
--      by platform data.
--   3. get_own_notifications re-issue: RETURNS TABLE gains dispatch_segment +
--      responses; the Hub's two maps collapse to rendering-only lookups.
--      DROP+CREATE (return type grows), grants re-issued.
--   4. respond_to_acting_invitation re-issue: the expires_at guard (AC3-9),
--      mirroring respond_to_stewardship_nomination — converts the latent
--      U038-by-ordering violation (rule's only home was surface rendering)
--      into a structurally impossible one. Latent, not live: no writer sets
--      expiry on acting invitations today.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The response-set registry (ADR-U051 ruling 1 as data; scope per U051A1)
-- ----------------------------------------------------------------------------
CREATE TABLE public.notification_action_types (
  action_type TEXT PRIMARY KEY,
  responses   JSONB NOT NULL CHECK (jsonb_typeof(responses) = 'array')
);

COMMENT ON TABLE public.notification_action_types IS
  'COR-C W3 (ADR-U051 + Amendment 1, AC3-5): the data-driven response-set '
  'registry keyed by action_type. Each entry lists the responses a surface '
  'renders (key, label, intent, accept) — server-authored copy, like the '
  'kind/category catalogs. The Ferd family is boolean accept/decline by '
  'contract (U051A1); a response beyond the pair is a contract evolution, '
  'not just a row here. Read only via get_own_notifications (DEFINER); '
  'RLS-enabled with no policies — deny-all to clients (the ds5_config '
  'pattern).';

ALTER TABLE public.notification_action_types ENABLE ROW LEVEL SECURITY;

INSERT INTO public.notification_action_types (action_type, responses) VALUES (
  'accept_decline',
  '[{"key": "accept",  "label": "Accept",  "intent": "primary", "accept": true},
    {"key": "decline", "label": "Decline", "intent": "danger",  "accept": false}]'::jsonb
);

-- ----------------------------------------------------------------------------
-- 2. Handler identity on the kinds registry (answerability as data)
-- ----------------------------------------------------------------------------
ALTER TABLE public.notification_kinds ADD COLUMN dispatch_segment TEXT;

COMMENT ON COLUMN public.notification_kinds.dispatch_segment IS
  'COR-C W3 (AC3-5): the dedicated-handler route segment for an answerable '
  'kind (NB-1 thin-dispatch — the segment names the per-action handler '
  'family, e.g. nomination-response). NULL = the kind renders passively. '
  'Registering a new answerable kind is a data registration here + its '
  'dedicated handler — never a surface map edit.';

-- Self-verifying DML (the 20260728190000 pattern): each registration must hit
-- exactly its one kind row.
DO $$
DECLARE v_n integer;
BEGIN
  UPDATE public.notification_kinds
     SET dispatch_segment = 'nomination-response'
   WHERE kind = 'stewardship_nomination';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'stewardship_nomination registration: expected 1 row, got %', v_n;
  END IF;

  UPDATE public.notification_kinds
     SET dispatch_segment = 'acting-response'
   WHERE kind = 'acting_invitation';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'acting_invitation registration: expected 1 row, got %', v_n;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. get_own_notifications — re-issue; the payload carries the registry
--    (DROP+CREATE: the return type grows two columns; grants re-issued)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_own_notifications(INTEGER, TIMESTAMPTZ, UUID);

CREATE FUNCTION public.get_own_notifications(
  p_limit              INTEGER DEFAULT 20,
  p_before_created_at  TIMESTAMPTZ DEFAULT NULL,
  p_before_id          UUID DEFAULT NULL
)
RETURNS TABLE (
  id               UUID,
  kind             TEXT,
  category         TEXT,
  title            TEXT,
  body             TEXT,
  group_id         UUID,
  created_at       TIMESTAMPTZ,
  is_read          BOOLEAN,
  read_at          TIMESTAMPTZ,
  action_type      TEXT,
  action_data      JSONB,
  action_taken     TEXT,
  expires_at       TIMESTAMPTZ,
  dispatch_segment TEXT,
  responses        JSONB
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pg UUID;
BEGIN
  v_pg := public.get_current_personal_group_id();
  IF v_pg IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  -- NTF-8 lazy expiry-on-view: the caller's own unanswered actionable rows past
  -- their deadline are marked expired here, so they leave the pending set and
  -- render "Expired" with no affordance. Idempotent (already-resolved untouched),
  -- own-rows-only. This side-effect is why the function is VOLATILE, not STABLE.
  UPDATE public.notifications n
     SET action_taken = 'expired', action_taken_at = now()
   WHERE n.recipient_group_id = v_pg
     AND n.action_type IS NOT NULL
     AND n.action_taken IS NULL
     AND n.expires_at IS NOT NULL
     AND n.expires_at < now();

  -- COR-C W3: dispatch_segment + responses ride from the registries — the
  -- surface renders affordances from platform data, never from a local map
  -- (AC3-5; ADR-U051 rulings 1-2 made literal).
  RETURN QUERY
  SELECT n.id, n.type, k.category_key, n.title, n.body, n.group_id,
         n.created_at, n.is_read, n.read_at,
         n.action_type, n.action_data, n.action_taken, n.expires_at,
         k.dispatch_segment,
         at.responses
  FROM public.notifications n
  JOIN public.notification_kinds k ON k.kind = n.type
  LEFT JOIN public.notification_action_types at ON at.action_type = n.action_type
  WHERE n.recipient_group_id = v_pg
    AND (p_before_created_at IS NULL
         OR (n.created_at, n.id) < (p_before_created_at, p_before_id))
  ORDER BY n.created_at DESC, n.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
END;
$$;

COMMENT ON FUNCTION public.get_own_notifications(INTEGER, TIMESTAMPTZ, UUID) IS
  'FEAT-PD013/PD014 DS-5 list contract. N-B added action_data + NTF-8 lazy '
  'expiry-on-view (VOLATILE). COR-C W3 adds dispatch_segment (from '
  'notification_kinds) and responses (from notification_action_types) so the '
  'typed-action layer is platform data on every surface (AC3-5, ADR-U051 + '
  'A1). action_taken_at still withheld from the list (export carries it).';

REVOKE ALL ON FUNCTION public.get_own_notifications(INTEGER, TIMESTAMPTZ, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_notifications(INTEGER, TIMESTAMPTZ, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. respond_to_acting_invitation — re-issue with the expiry guard (AC3-9)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_to_acting_invitation(
  p_notification_id UUID,
  p_accept          BOOLEAN
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pg               UUID;
  v_notif            public.notifications%ROWTYPE;
  v_membership_id    UUID;
  v_resolver_name    TEXT;
  v_result           jsonb;
  v_outcome          TEXT;
  v_sibling_outcome  TEXT;
  v_sibling_resolver TEXT;
BEGIN
  v_pg := public.get_current_personal_group_id();
  IF v_pg IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  -- Own acting-invitation only (adversarial: another actor's id is invisible).
  SELECT * INTO v_notif
    FROM public.notifications
   WHERE id = p_notification_id
     AND recipient_group_id = v_pg
     AND type = 'acting_invitation';
  IF v_notif.id IS NULL THEN
    RAISE EXCEPTION 'notification not found' USING errcode = 'P0002';
  END IF;

  -- Already resolved for my row (converged by a co-leader, or by me) — idempotent.
  IF v_notif.action_taken IS NOT NULL THEN
    RETURN jsonb_build_object(
      'outcome', v_notif.action_taken,
      'resolved_by_name', v_notif.action_data->>'resolved_by_name',
      'already', true
    );
  END IF;

  -- COR-C W3 (AC3-9): expiry enforced contract-side, mirroring
  -- respond_to_stewardship_nomination (20260728190000:230-232). Before this
  -- guard the rule's only home was surface rendering — a U038 violation by
  -- ordering, latent until a writer sets expiry on acting invitations.
  IF v_notif.expires_at IS NOT NULL AND v_notif.expires_at < now() THEN
    RAISE EXCEPTION 'this invitation has expired' USING errcode = 'P0001';
  END IF;

  v_membership_id := (v_notif.action_data->>'membership_id')::uuid;
  SELECT g.name INTO v_resolver_name FROM public.groups g WHERE g.id = v_pg;

  BEGIN
    -- Thin-dispatch to the untouched Core handler (act_as_group-gated there;
    -- a caller lacking the key raises 42501, which propagates unconverged).
    v_result := public.respond_to_group_invitation(v_membership_id, p_accept);
    v_outcome := CASE WHEN (v_result->>'status') = 'active' THEN 'accepted' ELSE 'declined' END;

    -- First-answer-wins convergence: every sibling for this subject records the
    -- outcome + resolver on the durable notification rows (survives the decline
    -- that deletes the membership — ADR-U051 Option A). Keyed strictly on
    -- membership_id so one invitation's answer never touches another's fan-out.
    UPDATE public.notifications n
       SET action_taken = v_outcome,
           action_taken_at = now(),
           is_read = true,
           action_data = n.action_data
             || jsonb_build_object('resolved_by_name', v_resolver_name,
                                   'resolved_outcome', v_outcome)
     WHERE n.type = 'acting_invitation'
       AND (n.action_data->>'membership_id')::uuid = v_membership_id
       AND n.action_taken IS NULL;

    RETURN jsonb_build_object('outcome', v_outcome, 'resolved_by_name', v_resolver_name, 'already', false);

  EXCEPTION WHEN sqlstate 'P0002' THEN
    -- A co-leader resolved the subject between my early check and my dispatch
    -- (the concurrent backstop; accept and decline both collapse to P0002 on a
    -- non-'invited' membership). Converge my row from a resolved sibling.
    SELECT n.action_taken, n.action_data->>'resolved_by_name'
      INTO v_sibling_outcome, v_sibling_resolver
      FROM public.notifications n
     WHERE n.type = 'acting_invitation'
       AND (n.action_data->>'membership_id')::uuid = v_membership_id
       AND n.action_taken IS NOT NULL
     LIMIT 1;
    IF v_sibling_outcome IS NULL THEN
      RAISE; -- genuinely not found / not-yet-converged — surface it
    END IF;
    UPDATE public.notifications n
       SET action_taken = v_sibling_outcome,
           action_taken_at = now(),
           is_read = true,
           action_data = n.action_data
             || jsonb_build_object('resolved_by_name', v_sibling_resolver,
                                   'resolved_outcome', v_sibling_outcome)
     WHERE n.id = p_notification_id AND n.action_taken IS NULL;
    RETURN jsonb_build_object('outcome', v_sibling_outcome, 'resolved_by_name', v_sibling_resolver, 'already', true);
  END;
END;
$$;

COMMENT ON FUNCTION public.respond_to_acting_invitation(UUID, BOOLEAN) IS
  'FEAT-PD014 (ADR-U051; re-issued COR-C W3, AC3-9): thin typed-action '
  'dispatch for acting-invitation notifications. Reads membership_id from the '
  'caller''s own notification action_data, refuses an expired row '
  'contract-side (the sibling nomination guard mirrored), calls the untouched '
  'Core respond_to_group_invitation (NB-1; act_as_group-gated), then '
  'converges every sibling notification for that subject (first-answer-wins; '
  'outcome + resolver denormalised onto the durable rows). SECURITY DEFINER: '
  'writes across the fan-out on the caller''s behalf.';
