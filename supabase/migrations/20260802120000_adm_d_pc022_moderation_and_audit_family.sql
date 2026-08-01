-- ============================================================================
-- FEAT-PC022 (Cycle ADM-D, TASK-ADMD-01) — the moderation family, the audit
-- family, and the AB-4 execution. One schema gate (board DB-1).
-- Spec: docs/platform/core/features/FEAT-PC022-moderation-and-audit-read-contracts.md
-- Suite: hub/tests/integration/admin/moderation-and-audit-contracts.test.ts
--   (demonstrated red 2026-08-02 pre-apply: 27 failed / 2 passed — the two
--   greens are exactly the labelled invariants S6c append-only and S8b
--   dispatcher-guard).
--
-- Contents:
--   1. content_reports resolution ALTER (four nullable columns; no CHECKs —
--      status/resolution_kind stay open vocabularies, consistency is
--      contract-enforced).
--   2. report_resolved kind registration (category 'platform'; N-B idempotent
--      precedent) + notify_report_resolved AFTER UPDATE producer trigger.
--      Same-owner mount (DS-5 fn on the DS-5 store) — GC-8 licenses cross-owner
--      mounts only; the notifications write is obligation-fulfilment (U047 r5).
--   3. admin_get_content_reports / admin_get_content_report_detail /
--      admin_resolve_content_report / admin_get_audit_log — SECURITY DEFINER,
--      is_platform_admin()-gated typed 42501, REVOKE anon; jsonb-array reads
--      (the 20260801180000 row-cap lesson applied at design time).
--   4. admin_audit_log policy re-issues: DROP audit_log_insert_admin (walk
--      finding 3 — the ADR-U038 direct-caller forgery door; the seven legacy
--      call sites are frozen hub-legacy oracle code, no v2 caller exists) and
--      re-issue audit_log_select_admin on is_platform_admin() (finding 4 —
--      the PG17 admin-RLS shape, matching the 20260801190000 function family).
--      Plain DROP POLICY, no IF EXISTS — name drift must fail loudly.
--   5. AB-4 (ADR-U052 §6, manifest instruction "THIS ENTRY IS REWRITTEN in
--      cycle ADM-D"): get_own_messages_export re-issued (reports_submitted
--      rows gain resolution_kind + resolved_at; resolver identity + note stay
--      out — the own-data wall) and get_own_data_export re-issued (inline
--      audit_trail own-actor section; schema_version 2). Manifest rewrite +
--      export-completeness-invariant partial-scope branch ride this PR.
--
-- SIBLING-ASSERTION SWEEP (2026-08-02, the standing rule — every suite
-- assertion naming an object whose behaviour this migration changes):
--   ADAPTED (in this PR, red until apply where DB-backed):
--   - hub/tests/integration/account/export-composite.test.ts:87-88 — composite
--     schema_version pin 1 -> 2.
--   - hub/tests/integration/account/data-export.test.ts:114,262 — same pin, twice.
--   - hub/tests/integration/account/export-completeness-invariant.test.ts —
--     the representation-XOR-exemption rule gains the AB-4 partial-scope
--     branch (both legal iff exemption.scope = 'partial'); file-based, green
--     at PR against the rewritten manifest entry.
--   DELIBERATELY LEFT (verified safe, verb + client checked per site):
--   - admin-dashboard.spec.ts:95 / data-export.test.ts:238 / sessions.test.ts:90,199
--     — service-role reads/deletes on admin_audit_log; service role bypasses
--     RLS, untouched by the policy changes.
--   - group-administration-contracts.test.ts S5c / member-administration-
--     operations.test.ts S8d / auth-event-audit-contracts.test.ts:86-96 —
--     authed UPDATE/DELETE tamper refusals; no UPDATE/DELETE policy existed
--     before or after (the append-only invariant these cells pin).
--   - communication-export.test.ts:233-236 + e2e lifecycle-and-export.spec.ts:309
--     — reports_submitted assertions name specific keys (reason,
--     content_snapshot); the two new keys are additive.
--   - journal-erasure-export.test.ts:149,167 + export-composite.test.ts:107 —
--     journal SUB-document schema_version (get_own_journal_export), unchanged.
--   - unit mocks (account-export-route.test.ts, export-client.test.ts) —
--     self-consistent fabricated documents; no live contract contact.
--   - No test anywhere INSERTs into admin_audit_log through an authed
--     (non-service) client — the door-drop bites zero suites.
--
-- Apply order: after 20260801190000 (ADM-C gate 2) — independent content.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The resolution substrate (ADM-11 schema; board DB-2)
-- ----------------------------------------------------------------------------
ALTER TABLE public.content_reports
  ADD COLUMN resolved_by_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  ADD COLUMN resolved_at TIMESTAMPTZ,
  ADD COLUMN resolution_kind TEXT,
  ADD COLUMN resolution_note TEXT;

COMMENT ON COLUMN public.content_reports.resolved_by_group_id IS
  'ADM-D FEAT-PC022: the resolving admin''s personal group. SET NULL — an '
  'erased admin anonymises the resolution; the reporter''s CASCADE stays the '
  'row''s only death.';
COMMENT ON COLUMN public.content_reports.resolution_kind IS
  'Open vocabulary (actioned | dismissed today), contract-validated additively '
  '— never CHECK-enumerated. Consistency (resolved_at set iff resolved) is '
  'contract-enforced.';
COMMENT ON COLUMN public.content_reports.resolution_note IS
  'Admin-internal working note. Never exported to the reporter, never carried '
  'in the closure notification (the own-data wall + DB-3).';

-- ----------------------------------------------------------------------------
-- 2. The registered kind + the producer trigger (DB-3; NTF-6's moderation-
--    decision leg closes here)
-- ----------------------------------------------------------------------------
INSERT INTO public.notification_kinds (kind, category_key, label)
VALUES ('report_resolved', 'platform', 'Content report resolved (closure to the reporter)')
ON CONFLICT (kind) DO NOTHING;

-- The producer: fires on the transition into resolution (resolved_at edge —
-- vocabulary-open, no status-string coupling). The row then flows, by
-- construction, through the registry FK (20260723120000:108 — a bespoke kind
-- is structurally impossible), the N-D BEFORE INSERT suppression dispatcher
-- (20260726120000 — the reporter's 'platform' category preference is final,
-- no override), and the N-C content-free hint. Payload carries references and
-- the outcome only — no note, no admin identity.
CREATE OR REPLACE FUNCTION public.notify_report_resolved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications (recipient_group_id, type, title, body, payload)
  VALUES (
    NEW.reporter_group_id,
    'report_resolved',
    'Your report has been reviewed',
    CASE
      WHEN NEW.resolution_kind = 'dismissed'
        THEN 'A moderator reviewed the content you reported and closed the report without further action.'
      ELSE 'A moderator reviewed the content you reported and took action.'
    END,
    jsonb_build_object(
      'report_id', NEW.id,
      'target_kind', NEW.target_kind,
      'resolution_kind', NEW.resolution_kind
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_report_resolved
  AFTER UPDATE ON public.content_reports
  FOR EACH ROW
  WHEN (OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL)
  EXECUTE FUNCTION public.notify_report_resolved();

COMMENT ON FUNCTION public.notify_report_resolved() IS
  'ADM-D FEAT-PC022 (DB-3): the report-closure producer — one durable '
  'report_resolved notification to the reporter on the resolution edge. '
  'DS-5-declared, same-owner mount on the DS-5 report store (GC-8 licenses '
  'cross-owner mounts only); the notifications write is delivery-tier '
  'obligation-fulfilment (ADR-U047 rule 5). Rides the N-D dispatcher and the '
  'N-C hint by construction. Privilege elevation: writes the RLS-protected '
  'delivery substrate on the reporter''s behalf — the notify_* class.';

-- ----------------------------------------------------------------------------
-- 3a. admin_get_content_reports — the ADM-10 queue read (DB-5)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_content_reports(p_filter TEXT DEFAULT 'open')
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  -- Open filter namespace: unknown refuses 22023 (the PC020/PC021 discipline).
  IF p_filter NOT IN ('open', 'resolved', 'all') THEN
    RAISE EXCEPTION 'Unknown filter: %', p_filter USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', r.id,
           'target_kind', r.target_kind,
           'target_id', r.target_id,
           'target_group_id', r.target_group_id,
           'target_group_name', tg.name,
           'reporter_display_name', rg.name,
           'reason', r.reason,
           'details', r.details,
           'content_snapshot', r.content_snapshot,
           'status', r.status,
           'created_at', r.created_at,
           'resolution_kind', r.resolution_kind,
           'resolved_at', r.resolved_at)
         ORDER BY r.created_at DESC, r.id DESC), '[]'::jsonb)
    INTO v_rows
    FROM public.content_reports r
    LEFT JOIN public.groups tg ON tg.id = r.target_group_id
    LEFT JOIN public.groups rg ON rg.id = r.reporter_group_id
   WHERE (p_filter = 'all')
      OR (p_filter = 'open' AND r.status = 'open')
      OR (p_filter = 'resolved' AND r.status = 'resolved');

  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.admin_get_content_reports(TEXT) IS
  'ADM-D FEAT-PC022 / ADM-10: the moderation queue read — jsonb array (the '
  'row-cap-honest shape), newest-first, display identity resolved live. '
  'Filters open|resolved|all over the OPEN status vocabulary; unknown filter '
  '22023; non-admin 42501. Privilege-escalation surface: admin-tier read of '
  'the DS-5 report store, walled by is_platform_admin().';

-- ----------------------------------------------------------------------------
-- 3b. admin_get_content_report_detail — live escalation keys + drift honesty
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_content_report_detail(p_report_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_r public.content_reports%ROWTYPE;
  v_target_group_name text;
  v_reporter_display_name text;
  v_resolved_by_display_name text;
  v_author_group uuid;
  v_author_user uuid;
  v_author_name text;
  v_live boolean := false;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_r FROM public.content_reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT g.name INTO v_target_group_name FROM public.groups g WHERE g.id = v_r.target_group_id;
  SELECT g.name INTO v_reporter_display_name FROM public.groups g WHERE g.id = v_r.reporter_group_id;
  SELECT g.name INTO v_resolved_by_display_name FROM public.groups g WHERE g.id = v_r.resolved_by_group_id;

  -- Live target resolution (the author was never stored — walk finding 2).
  -- A tombstoned post keeps its author (the row knows them); a vanished row
  -- yields NULLs while the snapshot stands as the record. Unknown target
  -- kinds (the open set) resolve to no-author/not-live, honestly.
  IF v_r.target_kind = 'forum_post' THEN
    SELECT fp.author_group_id, NOT fp.is_deleted
      INTO v_author_group, v_live
      FROM public.forum_posts fp WHERE fp.id = v_r.target_id;
    v_live := COALESCE(v_live, false);
  ELSIF v_r.target_kind = 'direct_message' THEN
    SELECT m.sender_group_id, true
      INTO v_author_group, v_live
      FROM public.messages m WHERE m.id = v_r.target_id;
    v_live := COALESCE(v_live, false);
  END IF;

  IF v_author_group IS NOT NULL THEN
    SELECT u.id, g.name
      INTO v_author_user, v_author_name
      FROM public.users u
      JOIN public.groups g ON g.id = u.personal_group_id
     WHERE u.personal_group_id = v_author_group;
  END IF;

  RETURN jsonb_build_object(
    'id', v_r.id,
    'target_kind', v_r.target_kind,
    'target_id', v_r.target_id,
    'target_group_id', v_r.target_group_id,
    'target_group_name', v_target_group_name,
    'reporter_display_name', v_reporter_display_name,
    'reason', v_r.reason,
    'details', v_r.details,
    'content_snapshot', v_r.content_snapshot,
    'status', v_r.status,
    'created_at', v_r.created_at,
    'resolution_kind', v_r.resolution_kind,
    'resolved_at', v_r.resolved_at,
    'resolution_note', v_r.resolution_note,
    'resolved_by_display_name', v_resolved_by_display_name,
    'author_user_id', v_author_user,
    'author_display_name', v_author_name,
    'live_target_exists', v_live
  );
END;
$$;

COMMENT ON FUNCTION public.admin_get_content_report_detail(UUID) IS
  'ADM-D FEAT-PC022 / ADM-11: report detail with the live-resolved escalation '
  'keys (author_user_id/author_display_name — a tombstone keeps its author; a '
  'vanished row yields NULLs) and drift honesty (live_target_exists; the '
  'snapshot is the record either way). resolution_note renders to admins only '
  '— it never leaves this read. 42501 / P0002 existence-hiding.';

-- ----------------------------------------------------------------------------
-- 3c. admin_resolve_content_report — per-report, exactly once (DB-2/DB-3)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_resolve_content_report(
  p_report_id UUID,
  p_resolution_kind TEXT,
  p_resolution_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid;
  v_row public.content_reports%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  -- Open outcome vocabulary, contract-validated additively.
  IF p_resolution_kind NOT IN ('actioned', 'dismissed') THEN
    RAISE EXCEPTION 'Unknown resolution kind: %', p_resolution_kind USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.content_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found' USING ERRCODE = 'P0002';
  END IF;
  -- One report, one resolution — the refusal keys on resolution-presence,
  -- never on the open status vocabulary.
  IF v_row.resolved_at IS NOT NULL THEN
    RAISE EXCEPTION 'Report already resolved' USING ERRCODE = 'P0001';
  END IF;

  v_actor := public.get_current_personal_group_id();

  UPDATE public.content_reports
     SET status = 'resolved',
         resolved_by_group_id = v_actor,
         resolved_at = v_now,
         resolution_kind = p_resolution_kind,
         resolution_note = p_resolution_note
   WHERE id = p_report_id;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_actor,
    'moderation.report_resolved',
    p_report_id::text,
    jsonb_build_object(
      'resolution_kind', p_resolution_kind,
      'target_kind', v_row.target_kind
    )
  );

  RETURN jsonb_build_object(
    'id', p_report_id,
    'status', 'resolved',
    'resolution_kind', p_resolution_kind,
    'resolved_at', v_now
  );
END;
$$;

COMMENT ON FUNCTION public.admin_resolve_content_report(UUID, TEXT, TEXT) IS
  'ADM-D FEAT-PC022 / ADM-11: per-report resolve (board DB-2), exactly once — '
  'P0001 keyed on resolution-presence writing nothing. Writes the resolution '
  'fields + audit moderation.report_resolved; the closure notification fires '
  'via the notify_report_resolved trigger on the resolved_at edge (state '
  'change -> trigger, the tier discipline). FOR UPDATE serialisation; 42501 / '
  'P0002 / 22023 typed. Privilege-escalation surface: admin-plane write on '
  'the DS-5 store, walled by is_platform_admin().';

-- ----------------------------------------------------------------------------
-- 3d. admin_get_audit_log — the ADM-16 read (keyset from birth)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_audit_log(
  p_limit INTEGER DEFAULT 50,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_action_prefix TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit integer;
  v_rows jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  v_limit := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);

  -- Keyset on created_at (microsecond grain; idx_audit_log_created) — an id
  -- tiebreak joins if a measurement ever asks. The prefix is a plain LIKE
  -- prefix over the OPEN dotted namespace: any prefix accepted, an unmatched
  -- one returns empty honestly — no vocabulary policing.
  SELECT COALESCE(jsonb_agg(sub.doc ORDER BY sub.c DESC, sub.i DESC), '[]'::jsonb)
    INTO v_rows
    FROM (
      SELECT a.created_at AS c, a.id AS i,
             jsonb_build_object(
               'id', a.id,
               'actor_group_id', a.actor_group_id,
               'actor_display_name', g.name,
               'action', a.action,
               'target', a.target,
               'metadata', a.metadata,
               'created_at', a.created_at) AS doc
        FROM public.admin_audit_log a
        LEFT JOIN public.groups g ON g.id = a.actor_group_id
       WHERE (p_before IS NULL OR a.created_at < p_before)
         AND (p_action_prefix IS NULL OR a.action LIKE p_action_prefix || '%')
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT v_limit
    ) sub;

  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.admin_get_audit_log(INTEGER, TIMESTAMPTZ, TEXT) IS
  'ADM-D FEAT-PC022 / ADM-16: the audit-log read — keyset-paginated from '
  'birth (the log grows without bound: every admin mutation + the four '
  'PC019 auth moments), cap 200, newest-first, actor display identity '
  'resolved live and null-safe (erased actors, pre-session signup rows). '
  'Prefix filter over the open dotted namespace. 42501 non-admin. '
  'Privilege-escalation surface: reads the admin-RLS-protected log, walled '
  'by is_platform_admin().';

-- ----------------------------------------------------------------------------
-- 4. The audit policy re-issues (walk findings 3 + 4)
-- ----------------------------------------------------------------------------
-- The client write door closes: contracts are the only door. Plain DROP —
-- a wrong name must fail loudly, never silently succeed.
DROP POLICY "audit_log_insert_admin" ON public.admin_audit_log;

-- The read license moves to the PG17-safe admin shape (the 20260801190000
-- function-family predicate, now at the RLS tier too).
DROP POLICY "audit_log_select_admin" ON public.admin_audit_log;
CREATE POLICY "audit_log_select_admin"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- ----------------------------------------------------------------------------
-- 5a. get_own_messages_export — re-issue (W2 body + the resolution keys)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_own_messages_export()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
BEGIN
  -- CB-6 (right of access): resolve UNGATED — auth.uid() -> users directly,
  -- no is_active filter, no FIM gate. A suspended member exports; sealed
  -- conversations and tombstoned posts export (they are still the caller's
  -- record). Own rows only, every section: other participants' message bodies
  -- never appear (the own-data wall); the report section carries the caller's
  -- own reports incl. the snapshot they filed (the C-E board's call), and
  -- omits target_group_id (a third party's identity is not the caller's data).
  -- ADM-D FEAT-PC022 (AB-4): resolved reports carry the outcome the reporter
  -- was already told (resolution_kind, resolved_at); the resolver's identity
  -- and the admin-internal note stay out (the same wall).
  SELECT u.personal_group_id INTO v_me
    FROM public.users u
   WHERE u.auth_user_id = (SELECT auth.uid());
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'no session actor' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'messages', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', m.id,
               'conversation_id', m.conversation_id,
               'conversation_kind', c.kind,
               'content', m.content,
               'created_at', m.created_at)
             ORDER BY m.created_at ASC, m.id ASC)
        FROM public.messages m
        JOIN public.conversations c ON c.id = m.conversation_id
       WHERE m.sender_group_id = v_me), '[]'::jsonb),
    'conversation_participations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'conversation_id', cp.conversation_id,
               'kind', c.kind,
               'group_id', c.group_id,
               'joined_at', cp.joined_at,
               'left_at', cp.left_at,
               'last_read_at', cp.last_read_at,
               'sealed_at', c.sealed_at)
             ORDER BY cp.joined_at ASC, cp.conversation_id ASC)
        FROM public.conversation_participants cp
        JOIN public.conversations c ON c.id = cp.conversation_id
       WHERE cp.participant_group_id = v_me), '[]'::jsonb),
    'forum_posts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', f.id,
               'group_id', f.group_id,
               'parent_post_id', f.parent_post_id,
               'content', f.content,
               'is_deleted', f.is_deleted,
               'created_at', f.created_at,
               'updated_at', f.updated_at)
             ORDER BY f.created_at ASC, f.id ASC)
        FROM public.forum_posts f
       WHERE f.author_group_id = v_me), '[]'::jsonb),
    'reports_submitted', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', r.id,
               'target_kind', r.target_kind,
               'target_id', r.target_id,
               'reason', r.reason,
               'details', r.details,
               'content_snapshot', r.content_snapshot,
               'status', r.status,
               'created_at', r.created_at,
               'resolution_kind', r.resolution_kind,
               'resolved_at', r.resolved_at)
             ORDER BY r.created_at ASC, r.id ASC)
        FROM public.content_reports r
       WHERE r.reporter_group_id = v_me), '[]'::jsonb),
    -- COR-C W2 (AC3-16, Stefan 2026-07-31: ADD): announcements the caller
    -- authored are their communal record, like forum posts. Retraction state
    -- rides (it is the caller's record's state); retracted_by_group_id is
    -- omitted — a third party's identity is not the caller's data.
    'authored_announcements', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', a.id,
               'scope_kind', a.scope_kind,
               'scope_group_id', a.scope_group_id,
               'title', a.title,
               'body', a.body,
               'created_at', a.created_at,
               'retracted_at', a.retracted_at)
             ORDER BY a.created_at ASC, a.id ASC)
        FROM public.announcements a
       WHERE a.author_group_id = v_me), '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.get_own_messages_export() IS
  'FEAT-PD012 (C-E; re-issued COR-C W2, AC3-16; re-issued ADM-D FEAT-PC022): '
  'the DS-5 half of the Art. 15 export — own messages, participations, forum '
  'posts, submitted reports (with resolution outcome since ADM-D; resolver '
  'identity and note excluded per the own-data wall), and own-authored '
  'announcements. UNGATED own-subject resolution; own rows only. Composed by '
  'get_own_data_export().';

-- ----------------------------------------------------------------------------
-- 5b. get_own_data_export — re-issue (W2 body + audit_trail; schema_version 2)
-- ----------------------------------------------------------------------------
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
  -- for their OWN action. Written BEFORE assembly — the fresh row is itself an
  -- own-actor row and appears in this very document's audit_trail (AB-4,
  -- deterministic and stated in the spec).
  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_user.personal_group_id,
    'data_export',
    v_user.personal_group_id::text,
    jsonb_build_object('schema_version', 2, 'surface', 'self_service')
  );

  v_doc := jsonb_build_object(
    -- ADM-D FEAT-PC022 (AB-4 / ADR-U052 §6): schema_version 2 — the document
    -- gains the audit_trail own-actor section (a rights-shape change, not a
    -- mere additive key).
    'schema_version', 2,
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
    ), '[]'::jsonb),
    -- COR-C W2: roles the member holds are their record (the completeness
    -- invariant's first catch — member data with no export path). Names ride
    -- for legibility; assigned_by_group_id is omitted (a third party's
    -- identity is not the caller's data — the own-data wall).
    'roles', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'group_id', ugr.group_id,
        'group_name', g.name,
        'role_name', gr.name,
        'assigned_at', ugr.assigned_at
      ) ORDER BY ugr.assigned_at, ugr.id)
      FROM public.user_group_roles ugr
      LEFT JOIN public.groups g ON g.id = ugr.group_id
      LEFT JOIN public.group_roles gr ON gr.id = ugr.group_role_id
      WHERE ugr.member_group_id = v_user.personal_group_id
    ), '[]'::jsonb),
    -- ADM-D FEAT-PC022 (AB-4 / ADR-U052 §6): rows where the member is the
    -- ACTOR — their own export events, the four auth moments, and any admin
    -- actions they themselves performed. Rows where they are only the TARGET
    -- of a third-party admin action stay out (the narrowed exemption: the
    -- admin actor's identity is third-party data, and admin actions are
    -- visible by effect). Split is structural: actor_group_id = self.
    'audit_trail', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'action', a.action,
        'target', a.target,
        'metadata', a.metadata,
        'created_at', a.created_at
      ) ORDER BY a.created_at ASC, a.id ASC)
      FROM public.admin_audit_log a
      WHERE a.actor_group_id = v_user.personal_group_id
    ), '[]'::jsonb)
  );

  -- COR-A W8 (AC-4): completeness is the platform's contract. Compose the
  -- Domain-owned sections platform-side, under the same caller identity, by
  -- calling the owning contracts (their one substrate home stays where it is).
  -- The composed set is licensed by ownership.manifest.json's composes array
  -- and pinned by export-completeness-invariant.test.ts (COR-C W2, GC-6).
  v_doc := v_doc || jsonb_build_object(
    'journal', public.get_own_journal_export(),
    'journeys', public.get_own_step_instances_export(),
    'communication', public.get_own_messages_export(),  -- FEAT-PD012 (C-E)
    'notifications', public.get_own_notifications_export(),  -- FEAT-PD013 (N-A)
    'notification_preferences', public.get_own_notification_preferences_export()  -- FEAT-PD016 (N-D; composed at COR-C W2 — AC3-3)
  );

  RETURN v_doc;
END;
$$;

COMMENT ON FUNCTION public.get_own_data_export() IS
  'PC-2/PC-4 Art. 15/20 composite (COR-A W8; re-issued N-A; re-issued COR-C '
  'W2; re-issued ADM-D FEAT-PC022 — AB-4/ADR-U052 §6): ONE call returns the '
  'complete export — core sections inline (subject, profile, account_state, '
  'consent, memberships, roles, audit_trail own-actor rows) plus the composed '
  'Domain contracts (journal, journeys, communication, notifications, '
  'notification_preferences). schema_version 2 since the audit_trail section. '
  'The composed set is licensed by the manifest''s composes array and pinned '
  'by the GC-6 gate. UNGATED own-subject resolution; every export is '
  'audit-logged.';

-- ----------------------------------------------------------------------------
-- 6. Grants — new functions walled; re-issued functions re-asserted at source
--    (the 20260721220000 reproducibility lesson).
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_get_content_reports(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_content_report_detail(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_resolve_content_report(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_audit_log(INTEGER, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_content_reports(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_content_report_detail(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_content_report(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_audit_log(INTEGER, TIMESTAMPTZ, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_own_messages_export() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_messages_export() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_own_data_export() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_data_export() TO authenticated, service_role;
