-- =============================================================================
-- FEAT-PD014 — Actionable-notification dispatch, acting-invitation fan-out, and
-- convergence (A-NTF Cycle N-B). Realises ADR-U051.
--
-- Five moves, one schema-gated migration:
--   1. Register the acting_invitation kind (open registry; reuses invitation_
--      received's category so no category-key is hardcoded).
--   2. get_own_notifications gains action_data + NTF-8 lazy expiry-on-view
--      (DROP+CREATE: the RETURNS TABLE grows a column; STABLE -> VOLATILE for
--      the self-healing expiry write).
--   3. notify_invitation_received branches: a GROUP (engagement) invitation
--      fans out one acting_invitation actionable notification per act_as_group
--      holder of the invited group (ADR-U041 recipients, ADR-U049 send-time
--      fan-out); a PERSONAL invitation keeps invitation_received unchanged.
--   4. respond_to_acting_invitation — thin dispatch to the untouched Core
--      respond_to_group_invitation (NB-1) + first-answer-wins convergence
--      recorded durably on the notification rows (ADR-U051 Option A).
--
-- notifications stays OUT of DS_TABLES (ADR-U048). invite_group /
-- respond_to_group_invitation are untouched — N-B wraps, never rewrites.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Register the acting_invitation kind (data-driven; V3 category catalog)
-- ----------------------------------------------------------------------------
INSERT INTO public.notification_kinds (kind, category_key, label)
VALUES (
  'acting_invitation',
  (SELECT category_key FROM public.notification_kinds WHERE kind = 'invitation_received'),
  'Group acting-invitation (actionable)'
)
ON CONFLICT (kind) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. get_own_notifications — + action_data, + NTF-8 lazy expiry-on-view.
--    DROP+CREATE (return type grows a column); now VOLATILE (self-healing write).
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_own_notifications(INTEGER, TIMESTAMPTZ, UUID);

CREATE FUNCTION public.get_own_notifications(
  p_limit              INTEGER DEFAULT 20,
  p_before_created_at  TIMESTAMPTZ DEFAULT NULL,
  p_before_id          UUID DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  kind          TEXT,
  category      TEXT,
  title         TEXT,
  body          TEXT,
  group_id      UUID,
  created_at    TIMESTAMPTZ,
  is_read       BOOLEAN,
  read_at       TIMESTAMPTZ,
  action_type   TEXT,
  action_data   JSONB,
  action_taken  TEXT,
  expires_at    TIMESTAMPTZ
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

  RETURN QUERY
  SELECT n.id, n.type, k.category_key, n.title, n.body, n.group_id,
         n.created_at, n.is_read, n.read_at,
         n.action_type, n.action_data, n.action_taken, n.expires_at
  FROM public.notifications n
  JOIN public.notification_kinds k ON k.kind = n.type
  WHERE n.recipient_group_id = v_pg
    AND (p_before_created_at IS NULL
         OR (n.created_at, n.id) < (p_before_created_at, p_before_id))
  ORDER BY n.created_at DESC, n.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
END;
$$;

COMMENT ON FUNCTION public.get_own_notifications(INTEGER, TIMESTAMPTZ, UUID) IS
  'FEAT-PD013/PD014 DS-5 list contract. N-B adds action_data to the payload (the typed-action UI dispatch + render) and NTF-8 lazy expiry-on-view (VOLATILE: own past-deadline unanswered actionable rows marked expired on read). action_taken_at still withheld from the list (export carries it).';

REVOKE ALL ON FUNCTION public.get_own_notifications(INTEGER, TIMESTAMPTZ, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_notifications(INTEGER, TIMESTAMPTZ, UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. notify_invitation_received — branch personal vs group (acting) invitation.
--    Delivery-substrate trigger (ADR-U048 obligation-fulfilment). AFTER INSERT,
--    so NEW.id is available for action_data.membership_id.
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

  -- Personal invitation: unchanged (the MyInvitations path).
  SELECT g.name INTO v_inviter_name FROM public.groups g WHERE g.id = NEW.added_by_group_id;

  INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
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
    NEW.group_id
  );

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. respond_to_acting_invitation — thin per-action dispatch + convergence.
--    Domain logic stays in the untouched Core respond_to_group_invitation (NB-1);
--    this records notification-side resolution across the fan-out (ADR-U051).
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
  'FEAT-PD014 (ADR-U051): thin typed-action dispatch for acting-invitation notifications. Reads membership_id from the caller''s own notification action_data, calls the untouched Core respond_to_group_invitation (NB-1; act_as_group-gated), then converges every sibling notification for that subject (first-answer-wins; outcome + resolver denormalised onto the durable rows so it survives the decline that deletes the membership). SECURITY DEFINER: writes across the fan-out on the caller''s behalf.';

REVOKE ALL ON FUNCTION public.respond_to_acting_invitation(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_acting_invitation(UUID, BOOLEAN) TO authenticated, service_role;
