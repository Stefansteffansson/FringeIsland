-- ============================================================================
-- FEAT-PD017 — bell-answerable personal invitations (Cycle N-E; WF-1 per the
-- HYG-A walk directive; ADR-U051 Amendment 2, held at PR #423).
--
-- Four moves, all DS-5, no Core function body touched, no table/column/RLS
-- change:
--   1. `notify_invitation_received` re-issue — the PERSONAL branch arms the
--      `invitation_received` row (`action_type='accept_decline'`,
--      `action_data={membership_id, group_id, group_name, inviter_name}`,
--      no expires_at); the acting branch is byte-identical.
--   2. Registry: `notification_kinds.dispatch_segment='invitation-response'`
--      for the kind (self-verifying DML, the 20260731140000 pattern). The
--      `accept_decline` response set is reused — U051A1's pair by contract.
--   3. `respond_to_personal_invitation(p_notification_id, p_accept)` — thin
--      NB-1 dispatch composing the UNTOUCHED Core pair
--      `accept_group_invitation` / `decline_group_invitation` (PC023
--      refusals propagate verbatim, unconverged), with the P0002
--      converge-idempotent backstop (the acting-response shape).
--   4. All-doors convergence: `converge_invitation_notifications()` +
--      two ADDITIVE triggers on `group_memberships` (beside the untouched
--      `notify_invitation_accepted` / `notify_invitation_declined_or_member_change`),
--      converging every standing `invitation_received` for a terminating
--      invited membership — accepted (invited→active), declined (DELETE by
--      the invitee), cancelled (DELETE by anyone else, incl. NULL actor).
--      `cancelled` WITHHOLDS resolved_by_name (the invitee may be outside
--      the group — the fact converges, the actor does not). Closes the
--      verified hole: `cancel_member_invitation` never touched notifications.
--      Plus the one-time backfill arming standing pending invitations
--      (historical orphans — membership gone — stay passive, untouched).
--
-- ADR-U016 cascade note: the convergence trigger IS the cascade arm for
-- invited-membership termination (any door, incl. cascade deletes).
--
-- SECURITY DEFINER rationale: `respond_to_personal_invitation` resolves the
-- caller's own notification and composes contracts that are themselves
-- DEFINER; `converge_invitation_notifications` writes notification rows from
-- within other actors' transactions (e.g. a canceller has no RLS standing on
-- the invitee's notifications — exactly why the elevation is required).
-- Both `SET search_path = ''`.
--
-- Sibling-assertion sweep (the three-times-bitten law; enumerated at spec
-- time, verified against the suite tree 2026-08-05):
--   - `mist-posture-and-ask-delivery.test.ts:52-55,275-282` — ASSERTION
--     UNAFFECTED (raw-inserts the kind; delivery guard untouched); its
--     comment prose ("invitation_received carries NO action_type") goes
--     stale → ADAPTED (comment-only, labelled) in this PR.
--   - `notification-contracts.test.ts:278` (kind presence),
--     `invitation-contracts.test.ts:316` (row exists after invite) —
--     DELIBERATELY LEFT (arming is additive; both hold).
--   - `anon-execute-lockdown.test.ts:110-127` — DELIBERATELY LEFT; this
--     migration honours its posture (CREATE OR REPLACE preserves the
--     existing revoke on `notify_invitation_received`; the NEW trigger
--     function is revoked below at birth).
--   - `actionable-notifications.test.ts` — DELIBERATELY LEFT (acting branch
--     byte-identical; its personal-branch cell asserts `invitation_received`
--     is emitted, which stands).
--   - Surface-tranche items (`notification-dispatch.test.ts` ANSWER_PATHS
--     pin; `notifications.spec.ts` click-through) flip at FEAT-H042's
--     tranche, not here — named in TASK-NE-02.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. notify_invitation_received — re-issue; personal branch dispatches armed.
--    (AFTER INSERT: NEW.id is the membership id — same as the acting branch.)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_invitation_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_group_name   TEXT;   -- the context group (the one being joined)
  v_inviter_name TEXT;
  v_member_type  TEXT;
  v_invited_name TEXT;   -- the invited group (acting branch)
  v_holder       RECORD;
BEGIN
  IF NEW.status != 'invited' THEN
    RETURN NEW;
  END IF;

  SELECT g.name INTO v_group_name FROM public.groups g WHERE g.id = NEW.group_id;
  SELECT g.group_type, g.name INTO v_member_type, v_invited_name
    FROM public.groups g WHERE g.id = NEW.member_group_id;

  IF v_member_type = 'engagement' THEN
    -- Group / acting invitation (ADR-U051): fan out one actionable notification
    -- per act_as_group holder of the invited group, addressed to the holder's
    -- personal group. The group-addressed invitation_received orphan is NOT
    -- emitted for this branch. Holders enumerated via the has_permission Tier-2
    -- join shape (20260222000000:460-473). Depth-1 (Ferd): holders are people.
    FOR v_holder IN
      SELECT DISTINCT gm.member_group_id AS pg
      FROM public.group_memberships gm
      JOIN public.user_group_roles ugr
        ON ugr.member_group_id = gm.member_group_id
        AND ugr.group_id = gm.group_id
      JOIN public.group_role_permissions grp ON grp.group_role_id = ugr.group_role_id
      JOIN public.permissions p ON p.id = grp.permission_id
      WHERE gm.group_id = NEW.member_group_id
        AND gm.status = 'active'
        AND grp.granted = true
        AND p.name = 'act_as_group'
    LOOP
      INSERT INTO public.notifications
        (recipient_group_id, type, title, body, payload, group_id,
         action_type, action_data)
      VALUES (
        v_holder.pg,
        'acting_invitation',
        'Group Invitation',
        'Your group "' || COALESCE(v_invited_name, 'a group')
          || '" has been invited to join "' || COALESCE(v_group_name, 'Unknown Group') || '".',
        jsonb_build_object(
          'group_id', NEW.group_id,
          'group_name', v_group_name,
          'invited_group_id', NEW.member_group_id,
          'invited_group_name', v_invited_name
        ),
        NEW.group_id,
        'accept_decline',
        jsonb_build_object(
          'membership_id', NEW.id,
          'context_group_id', NEW.group_id,
          'context_group_name', v_group_name,
          'invited_group_id', NEW.member_group_id,
          'invited_group_name', v_invited_name
        )
      );
    END LOOP;
    RETURN NEW;
  END IF;

  -- Personal invitation — N-E (FEAT-PD017): the letter itself is now the ask.
  -- Server copy and payload unchanged; the row additionally carries the
  -- typed-action context (no expires_at — personal invitations have no
  -- deadline, matching acting).
  SELECT g.name INTO v_inviter_name FROM public.groups g WHERE g.id = NEW.added_by_group_id;

  INSERT INTO public.notifications
    (recipient_group_id, type, title, body, payload, group_id,
     action_type, action_data)
  VALUES (
    NEW.member_group_id,
    'invitation_received',
    'Group Invitation',
    'You have been invited to join "' || COALESCE(v_group_name, 'Unknown Group') || '" by ' || COALESCE(v_inviter_name, 'someone') || '.',
    jsonb_build_object(
      'group_id', NEW.group_id,
      'group_name', v_group_name,
      'inviter_group_id', NEW.added_by_group_id,
      'inviter_name', v_inviter_name
    ),
    NEW.group_id,
    'accept_decline',
    jsonb_build_object(
      'membership_id', NEW.id,
      'group_id', NEW.group_id,
      'group_name', v_group_name,
      'inviter_name', v_inviter_name
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_invitation_received() IS
  'Delivery-substrate trigger (ADR-U048). N-B branched personal vs acting; '
  'N-E (FEAT-PD017) arms the personal branch — invitation_received carries '
  'action_type + action_data {membership_id, group_id, group_name, '
  'inviter_name} so the bell can answer it (ADR-U051 Amendment 2). Server '
  'copy and payload unchanged; acting branch unchanged.';

-- ----------------------------------------------------------------------------
-- 2. Handler identity: invitation_received answers at invitation-response.
--    Self-verifying DML (the 20260731140000 pattern).
-- ----------------------------------------------------------------------------
DO $$
DECLARE v_n integer;
BEGIN
  UPDATE public.notification_kinds
     SET dispatch_segment = 'invitation-response'
   WHERE kind = 'invitation_received';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'invitation_received registration: expected 1 row, got %', v_n;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. respond_to_personal_invitation — thin NB-1 dispatch over the untouched
--    Core pair; convergence happens in the same transaction via the trigger
--    (move 4), so this contract re-reads and returns, never converges itself.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_to_personal_invitation(
  p_notification_id UUID,
  p_accept          BOOLEAN
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pg       UUID;
  v_notif    public.notifications%ROWTYPE;
  v_group_id UUID;
BEGIN
  v_pg := public.get_current_personal_group_id();
  IF v_pg IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  -- Own invitation only (adversarial: another actor's id is invisible).
  SELECT * INTO v_notif
    FROM public.notifications
   WHERE id = p_notification_id
     AND recipient_group_id = v_pg
     AND type = 'invitation_received';
  IF v_notif.id IS NULL THEN
    RAISE EXCEPTION 'notification not found' USING errcode = 'P0002';
  END IF;

  -- Already resolved through any door — idempotent (first answer won).
  IF v_notif.action_taken IS NOT NULL THEN
    RETURN jsonb_build_object(
      'outcome', v_notif.action_taken,
      'resolved_by_name', v_notif.action_data->>'resolved_by_name',
      'already', true
    );
  END IF;

  -- Unarmed row (a pre-N-E orphan whose membership is gone): not answerable.
  IF v_notif.action_type IS NULL OR v_notif.action_data->>'group_id' IS NULL THEN
    RAISE EXCEPTION 'notification is not answerable' USING errcode = 'P0002';
  END IF;

  v_group_id := (v_notif.action_data->>'group_id')::uuid;

  BEGIN
    -- Thin-dispatch to the untouched Core pair (self-scoped there; PC023
    -- availability refusals — 42501 / P0001 — propagate verbatim,
    -- unconverged: the ask still stands under a hold).
    IF p_accept THEN
      PERFORM public.accept_group_invitation(v_group_id);
    ELSE
      PERFORM public.decline_group_invitation(v_group_id);
    END IF;

    -- The convergence trigger ran inside the Core call's own statement;
    -- re-read this row for the converged record.
    SELECT * INTO v_notif FROM public.notifications WHERE id = p_notification_id;
    RETURN jsonb_build_object(
      'outcome', v_notif.action_taken,
      'resolved_by_name', v_notif.action_data->>'resolved_by_name',
      'already', false
    );

  EXCEPTION WHEN sqlstate 'P0002' THEN
    -- 'no pending invitation' — the subject was resolved through another door
    -- between my early check and my dispatch. Converge-idempotent: my row was
    -- (or is being) converged by that door's trigger; return its record.
    SELECT * INTO v_notif FROM public.notifications WHERE id = p_notification_id;
    IF v_notif.action_taken IS NULL THEN
      RAISE; -- genuinely nothing behind this letter — surface it
    END IF;
    RETURN jsonb_build_object(
      'outcome', v_notif.action_taken,
      'resolved_by_name', v_notif.action_data->>'resolved_by_name',
      'already', true
    );
  END;
END;
$$;

COMMENT ON FUNCTION public.respond_to_personal_invitation(UUID, BOOLEAN) IS
  'FEAT-PD017 (N-E): thin NB-1 dispatch for the invitation_received bell '
  'answer — composes the untouched Core accept_group_invitation / '
  'decline_group_invitation (four-hop actor there); convergence is the '
  'group_memberships trigger''s job (same transaction). P0002 backstop '
  'returns the already-converged record (first-answer-wins). SECURITY '
  'DEFINER: resolves the caller''s own notification row; search_path=''''.';

REVOKE ALL ON FUNCTION public.respond_to_personal_invitation(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_personal_invitation(UUID, BOOLEAN) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. All-doors convergence — additive trigger on the invited membership's
--    termination. Beside (never replacing) the existing notify_* triggers.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.converge_invitation_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_outcome  TEXT;
  v_actor    UUID;
  v_resolver TEXT;
BEGIN
  -- Belt-and-braces: the WHEN clauses already scope to terminating 'invited'.
  IF OLD.status <> 'invited' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- invited → active is the accept (the self-scoped Core door); any other
    -- transition out of 'invited' is the platform acting on the invitation.
    v_outcome := CASE WHEN NEW.status = 'active' THEN 'accepted' ELSE 'cancelled' END;
  ELSE
    -- DELETE: by the invitee = declined; by anyone else (canceller, admin,
    -- cascade, service role — incl. a NULL actor) = cancelled. Never error
    -- the host transaction.
    BEGIN
      v_actor := public.get_current_personal_group_id();
    EXCEPTION WHEN OTHERS THEN
      v_actor := NULL;
    END;
    v_outcome := CASE WHEN v_actor IS NOT NULL AND v_actor = OLD.member_group_id
                      THEN 'declined' ELSE 'cancelled' END;
  END IF;

  -- Resolver identity: only the invitee's own name is ever recorded
  -- (accepted/declined are the invitee's acts). 'cancelled' WITHHOLDS the
  -- actor — the invitee may stand outside the group and the canceller's
  -- identity would be a new disclosure class (FEAT-PD017 privacy rule).
  IF v_outcome IN ('accepted', 'declined') THEN
    SELECT g.name INTO v_resolver FROM public.groups g WHERE g.id = OLD.member_group_id;
  END IF;

  -- Keyed strictly on membership_id (never kind alone — PD014 discipline);
  -- unarmed orphans (action_data NULL / no membership_id) never match.
  UPDATE public.notifications n
     SET action_taken    = v_outcome,
         action_taken_at = now(),
         is_read         = true,
         action_data     = COALESCE(n.action_data, '{}'::jsonb)
           || jsonb_build_object('resolved_outcome', v_outcome)
           || CASE WHEN v_resolver IS NOT NULL
                   THEN jsonb_build_object('resolved_by_name', v_resolver)
                   ELSE '{}'::jsonb END
   WHERE n.type = 'invitation_received'
     AND (n.action_data->>'membership_id')::uuid = OLD.id
     AND n.action_taken IS NULL;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.converge_invitation_notifications() IS
  'FEAT-PD017 (N-E): delivery-substrate convergence (ADR-U048; ADR-U051 '
  'Option A durable) — every standing invitation_received for a terminating '
  'invited membership converges through EVERY door (bell, MyInvitations, '
  'cancel, admin, cascade). accepted/declined carry the invitee''s own name; '
  'cancelled withholds the actor. The ADR-U016 cascade arm for '
  'invited-membership termination. SECURITY DEFINER: writes the invitee''s '
  'notification rows from other actors'' transactions; search_path=''''.';

-- Trigger-only: closed to every caller (the anon-execute-lockdown posture).
REVOKE ALL ON FUNCTION public.converge_invitation_notifications() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER converge_invitation_on_answer
  AFTER UPDATE ON public.group_memberships
  FOR EACH ROW
  WHEN (OLD.status = 'invited' AND NEW.status IS DISTINCT FROM 'invited')
  EXECUTE FUNCTION public.converge_invitation_notifications();

CREATE TRIGGER converge_invitation_on_termination
  AFTER DELETE ON public.group_memberships
  FOR EACH ROW
  WHEN (OLD.status = 'invited')
  EXECUTE FUNCTION public.converge_invitation_notifications();

COMMENT ON TRIGGER converge_invitation_on_answer ON public.group_memberships IS
  'FEAT-PD017: converge standing invitation_received rows when an invited '
  'membership leaves invited by UPDATE (active = accepted; else cancelled).';
COMMENT ON TRIGGER converge_invitation_on_termination ON public.group_memberships IS
  'FEAT-PD017: converge standing invitation_received rows when an invited '
  'membership is DELETEd (invitee = declined; anyone else = cancelled, '
  'name withheld).';

-- ----------------------------------------------------------------------------
-- 5. Backfill: arm standing pending invitations (dispatched pre-N-E, still
--    answerable). Historical orphans (membership gone) stay passive — no
--    outcome can honestly be fabricated for them.
-- ----------------------------------------------------------------------------
UPDATE public.notifications n
   SET action_type = 'accept_decline',
       action_data = jsonb_build_object(
         'membership_id', gm.id,
         'group_id',      gm.group_id,
         'group_name',    g.name,
         'inviter_name',  ig.name
       )
  FROM public.group_memberships gm
  JOIN public.groups g       ON g.id  = gm.group_id
  LEFT JOIN public.groups ig ON ig.id = gm.added_by_group_id
 WHERE n.type = 'invitation_received'
   AND n.action_type IS NULL
   AND n.action_taken IS NULL
   AND gm.group_id = n.group_id
   AND gm.member_group_id = n.recipient_group_id
   AND gm.status = 'invited';
