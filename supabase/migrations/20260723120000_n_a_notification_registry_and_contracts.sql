-- ============================================================================
-- FEAT-PD013 — Notification routing contracts & category registry (A-NTF N-A)
-- ============================================================================
-- Board: phase-3-notifications-completion-plan.md (settled 2026-07-23; NB-4).
-- Realizes: the V3 §6 category-catalog obligation (data-driven registry, each
-- category carrying lawful basis + interruption grade), the DS-5 read/serve
-- contracts ("Notification operations — list/mark-read", communication.md §3),
-- write-narrowing on the delivery substrate, and the `notifications` section
-- of the GDPR own-data export (CB-6 right-of-access posture).
--
-- Ownership (supabase/ownership.manifest.json, same PR):
--   * notification_categories / notification_kinds → vertical:notifications —
--     the catalog is V3-levied substrate beside the delivery table (keeps the
--     FK inside the vertical's own substrate; DS-5 *reads* it as routing
--     input). Flagged for the gate review; alternative classification DS-5.
--   * the five functions → DS-5 (the routing layer above the substrate,
--     per ADR-U048's own note: "DS-5 takes the routing/preferences layer
--     above it when built").
--
-- Apply-time precondition (STRICT — no silent catch-all): every distinct
-- notifications.type on the live DB must have a notification_kinds seed row
-- BEFORE this migration applies, or the FK ADD fails loudly. Pre-check:
--   SELECT DISTINCT type FROM public.notifications
--    WHERE type NOT IN (SELECT kind FROM (VALUES <seed list>) t(kind));
-- An unseeded stray gets an explicit seed row added here, never a default.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Registries (data-driven, never sealed — DS-5 invariant 6 / ADR-U008/U018)
-- ----------------------------------------------------------------------------
-- lawful_basis CHECK is a legal dichotomy (GDPR posture), not a kind set —
-- deliberately not an open registry. interruption_grade is open text: the
-- design-system grammar (V3 surfaces law) extends it by data, not DDL.

CREATE TABLE public.notification_categories (
  key                 TEXT PRIMARY KEY,
  label               TEXT NOT NULL,
  lawful_basis        TEXT NOT NULL CHECK (lawful_basis IN ('transactional', 'consent')),
  interruption_grade  TEXT NOT NULL DEFAULT 'badge',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notification_kinds (
  kind          TEXT PRIMARY KEY,
  category_key  TEXT NOT NULL REFERENCES public.notification_categories(key),
  label         TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_kinds ENABLE ROW LEVEL SECURITY;

-- Reference-data posture (conversation_kinds precedent, C-A): readable by
-- authenticated, no user-facing write policies — service_role/migrations only.
CREATE POLICY "notification_categories_select"
  ON public.notification_categories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "notification_kinds_select"
  ON public.notification_kinds FOR SELECT TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- 2. Seeds — six categories, every realized kind (19 enumerated at kickoff)
-- ----------------------------------------------------------------------------
-- All Ferd categories are transactional (consent-required categories arrive
-- with external channels, own-ADR per ADR-U040 / board NB-2). All grades are
-- 'badge' in Ferd (V3: grade declared per category, changeable as data).

INSERT INTO public.notification_categories (key, label, lawful_basis, interruption_grade) VALUES
  ('membership',      'Group membership & invitations',      'transactional', 'badge'),
  ('group-lifecycle', 'Group lifecycle events',              'transactional', 'badge'),
  ('stewardship',     'Stewardship & leadership transfer',   'transactional', 'badge'),
  ('account',         'Account & participation state',       'transactional', 'badge'),
  ('journeys',        'Journey enrolment & completion',      'transactional', 'badge'),
  ('platform',        'Platform & admin communications',     'transactional', 'badge');

INSERT INTO public.notification_kinds (kind, category_key, label) VALUES
  ('invitation_received',       'membership',      'Group invitation received'),
  ('invitation_accepted',       'membership',      'Group invitation accepted'),
  ('invitation_declined',       'membership',      'Group invitation declined'),
  ('member_left',               'membership',      'Member left the group'),
  ('member_removed',            'membership',      'Member removed from the group'),
  ('role_assigned',             'membership',      'Role assigned'),
  ('role_removed',              'membership',      'Role removed'),
  ('group_deleted',             'group-lifecycle', 'Group deleted'),
  ('group_closed',              'group-lifecycle', 'Group closed'),
  ('group_archived',            'group-lifecycle', 'Group archived'),
  ('stewardship_transferred',   'stewardship',     'Stewardship transferred'),
  ('stewardship_required',      'stewardship',     'Stewardship attention required'),
  ('stewardship_nomination',    'stewardship',     'Stewardship nomination (actionable)'),
  ('participation_paused',      'account',         'Participation paused'),
  ('participation_activated',   'account',         'Participation reactivated'),
  ('group_journey_enrollment',  'journeys',        'Group enrolled in a journey'),
  ('journey_completed',         'journeys',        'Journey completed'),
  ('admin_notification',        'platform',        'Administrator notification'),
  ('announcement',              'platform',        'Announcement (ADR-U049 delivery row)');

-- ----------------------------------------------------------------------------
-- 3. The category law becomes enforceable: FK on the delivery substrate
-- ----------------------------------------------------------------------------
-- Fails loudly at apply if any live row carries an unregistered type — see
-- the apply-time precondition at the top. NOT VALID is deliberately not used:
-- an invalid-but-accepted registry defeats the point of the law.

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_fkey
  FOREIGN KEY (type) REFERENCES public.notification_kinds(kind);

-- ----------------------------------------------------------------------------
-- 4. Read/serve contracts (DS-5 routing layer; SECURITY DEFINER discipline:
--    narrow bodies, search_path='', four-hop actor via the gated resolver)
-- ----------------------------------------------------------------------------

-- 4a. get_own_notifications — keyset list, newest-first, joined to the
-- registry. N-A payload exactly per FEAT-PD013 STORY-2 (action_data /
-- action_taken_at deliberately withheld until N-B names their consumer).
CREATE OR REPLACE FUNCTION public.get_own_notifications(
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
  action_taken  TEXT,
  expires_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
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

  RETURN QUERY
  SELECT n.id, n.type, k.category_key, n.title, n.body, n.group_id,
         n.created_at, n.is_read, n.read_at,
         n.action_type, n.action_taken, n.expires_at
  FROM public.notifications n
  JOIN public.notification_kinds k ON k.kind = n.type
  WHERE n.recipient_group_id = v_pg
    AND (p_before_created_at IS NULL
         OR (n.created_at, n.id) < (p_before_created_at, p_before_id))
  ORDER BY n.created_at DESC, n.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
END;
$$;

-- 4b. get_own_unread_notification_count — the bell badge read; rides the
-- idx_notifications_recipient_unread partial index.
CREATE OR REPLACE FUNCTION public.get_own_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pg UUID;
  v_n  INTEGER;
BEGIN
  v_pg := public.get_current_personal_group_id();
  IF v_pg IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  SELECT count(*)::integer INTO v_n
  FROM public.notifications n
  WHERE n.recipient_group_id = v_pg AND n.is_read = false;
  RETURN v_n;
END;
$$;

-- 4c. mark_notification_read — own-only, idempotent (the is_read=false guard
-- keeps read_at first-write-wins); other-actor calls touch zero rows, silent.
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS VOID
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
  UPDATE public.notifications n
     SET is_read = true, read_at = now()
   WHERE n.id = p_notification_id
     AND n.recipient_group_id = v_pg
     AND n.is_read = false;
END;
$$;

-- 4d. mark_all_notifications_read — flips all own unread, returns the count.
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pg UUID;
  v_n  INTEGER;
BEGIN
  v_pg := public.get_current_personal_group_id();
  IF v_pg IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;
  UPDATE public.notifications n
     SET is_read = true, read_at = now()
   WHERE n.recipient_group_id = v_pg
     AND n.is_read = false;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Write-narrowing: the contracts become the only user-facing mutation door
-- ----------------------------------------------------------------------------
-- Names verified against pg_policies shape born in the D15 rebuild (11j).
-- select_own STANDS (the RLS read wall); INSERT was never user-facing
-- (trigger/definer paths only — B-COMM-002's "no direct INSERT" holds).

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;

-- ----------------------------------------------------------------------------
-- 6. The export gains its notifications section (right-of-access, CB-6)
-- ----------------------------------------------------------------------------
-- Ungated actor resolution (auth.uid() direct — the composite's precedent):
-- suspended members export. Export is FULLER than the list payload by design
-- (right-of-access completeness): action_data / action_taken_at / payload
-- included here even though the N-A list contract withholds them.
CREATE OR REPLACE FUNCTION public.get_own_notifications_export()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_pg UUID;
BEGIN
  SELECT u.personal_group_id INTO v_pg
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1;
  IF v_pg IS NULL THEN
    RAISE EXCEPTION 'no subject for caller' USING errcode = '28000';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', n.id,
      'kind', n.type,
      'category', k.category_key,
      'title', n.title,
      'body', n.body,
      'payload', n.payload,
      'group_id', n.group_id,
      'created_at', n.created_at,
      'is_read', n.is_read,
      'read_at', n.read_at,
      'action_type', n.action_type,
      'action_data', n.action_data,
      'action_taken', n.action_taken,
      'action_taken_at', n.action_taken_at,
      'expires_at', n.expires_at
    ) ORDER BY n.created_at DESC)
    FROM public.notifications n
    LEFT JOIN public.notification_kinds k ON k.kind = n.type
    WHERE n.recipient_group_id = v_pg
  ), '[]'::jsonb);
END;
$$;

-- Re-issue the composite with the notifications section (body carried
-- verbatim from 20260721100000 + the 20260721220000 grant posture; the one
-- change is the added 'notifications' key in the Domain-section merge).
CREATE OR REPLACE FUNCTION public.get_own_data_export()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_display_name text;
  v_doc jsonb;
BEGIN
  -- Own-subject resolution via auth.uid() (covers suspended members).
  SELECT * INTO v_user FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'no subject for caller' USING errcode = '28000';
  END IF;

  -- The member's display name is the personal group's name (kept in sync from
  -- nickname/full_name per display_preference by sync_personal_group_display_name).
  SELECT g.name INTO v_display_name
  FROM public.groups g
  WHERE g.id = v_user.personal_group_id;

  -- Durable export-event record (the accountability trail). The SECURITY DEFINER
  -- elevation is what lets a member write to the admin-RLS-protected audit log
  -- for their OWN action.
  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_user.personal_group_id,
    'data_export',
    v_user.personal_group_id::text,
    jsonb_build_object('schema_version', 1, 'surface', 'self_service')
  );

  v_doc := jsonb_build_object(
    'schema_version', 1,
    'exported_at', now(),
    'subject', jsonb_build_object(
      'user_id', v_user.id,
      'personal_group_id', v_user.personal_group_id,
      'email', v_user.email
    ),
    'profile', jsonb_build_object(
      'full_name', v_user.full_name,
      'nickname', v_user.nickname,
      'display_preference', v_user.display_preference,
      'show_real_name', v_user.show_real_name,
      'avatar_url', v_user.avatar_url,
      'bio', v_user.bio,
      'display_name', v_display_name,
      'created_at', v_user.created_at,
      'updated_at', v_user.updated_at
    ),
    'account_state', jsonb_build_object(
      'is_active', v_user.is_active,
      'is_decommissioned', v_user.is_decommissioned,
      'state', CASE
        WHEN v_user.is_decommissioned THEN 'decommissioned'
        WHEN NOT v_user.is_active THEN 'suspended'
        ELSE 'active'
      END
    ),
    'consent', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'purpose', cr.purpose,
        'decision', cr.decision,
        'policy_version', cr.policy_version,
        'captured_at', cr.captured_at,
        'capture_context', cr.capture_context
      ) ORDER BY cr.captured_at DESC)
      FROM public.consent_records cr
      WHERE cr.subject_group_id = v_user.personal_group_id
    ), '[]'::jsonb),
    'memberships', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'group_id', gm.group_id,
        'group_name', g.name,
        'status', gm.status,
        'added_at', gm.added_at
      ) ORDER BY gm.added_at)
      FROM public.group_memberships gm
      LEFT JOIN public.groups g ON g.id = gm.group_id
      WHERE gm.member_group_id = v_user.personal_group_id
    ), '[]'::jsonb)
  );

  -- COR-A W8 (AC-4): completeness is the platform's contract. Compose the
  -- Domain-owned sections platform-side, under the same caller identity, by
  -- calling the owning contracts (their one substrate home stays where it is).
  v_doc := v_doc || jsonb_build_object(
    'journal', public.get_own_journal_export(),
    'journeys', public.get_own_step_instances_export(),
    'communication', public.get_own_messages_export(),  -- FEAT-PD012 (C-E)
    'notifications', public.get_own_notifications_export()  -- FEAT-PD013 (N-A)
  );

  RETURN v_doc;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. Grants (REVOKE-first posture; export grant reproducible at source —
--    the 20260721220000 lesson)
-- ----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.get_own_notifications(INTEGER, TIMESTAMPTZ, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_own_unread_notification_count() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_notification_read(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_own_notifications_export() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_own_notifications(INTEGER, TIMESTAMPTZ, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_own_unread_notification_count() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_own_notifications_export() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_own_data_export() TO authenticated, service_role;
