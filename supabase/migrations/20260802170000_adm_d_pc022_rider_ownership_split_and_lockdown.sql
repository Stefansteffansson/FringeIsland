-- ============================================================================
-- FEAT-PC022 RIDER (Cycle ADM-D, TASK-ADMD-01) — the ownership split + the
-- trigger-function lockdown. Found by the platform conformance gates at
-- first post-apply contact with 20260802120000 (the gates doing their job):
--
--   1. anon-execute-lockdown: notify_report_resolved() leaked EXECUTE to anon
--      (the CREATE FUNCTION default PUBLIC grant — the sibling notify_* class
--      is revoked from PUBLIC, anon, AND authenticated; 20260725120000:156 is
--      the precedent). Fixed by the revoke below.
--   2. internal-api-conformance (ADR-U047 rule 3): the three PC-4 moderation
--      contracts referenced DS-5 tables directly — five [core-to-domain]
--      edges (content_reports x3, forum_posts, messages). Rule 3 has no
--      core-to-domain license: "any function referencing DS tables must
--      itself be DS-owned." Fixed the COR-A way (the W4/W5 relocation
--      precedent): the table-touching bodies move into three DS-5-owned
--      primitives (ds5_moderation_*, explicitly declared DS-5 in the
--      manifest — the ds{N}_lifecycle_ auto-prefix is reserved for
--      lifecycle-fact handlers and deliberately NOT borrowed); the admin_*
--      contracts become thin PC-4 wrappers — gate + vocabulary + audit —
--      exactly the shape that lets admin_exit_user_from_platform pass the
--      same gate today. Signatures, refusals, payloads: byte-identical to
--      the callers; FEAT-H037 and the gate suite are unaffected.
--
-- The primitives are revoked from PUBLIC, anon, AND authenticated: the only
-- door is the PC-4 wrapper, whose SECURITY DEFINER body executes them under
-- the function owner. A direct PostgREST caller cannot reach them at all.
--
-- SIBLING-ASSERTION SWEEP (2026-08-02): the three wrapper signatures and
-- their refusal/payload shapes are unchanged — zero suite assertions move.
-- No test names the new primitive functions. The two platform gates flip
-- green at apply; no other suite touches the objects this file changes.
--
-- Apply order: after 20260802120000.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The lockdown (gate finding 1)
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.notify_report_resolved() FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. DS-5 moderation primitives (gate finding 2 — the table-touching bodies,
--    now domain-owned; declared DS-5 in ownership.manifest.json in this PR)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ds5_moderation_list_reports(p_filter TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  -- Vocabulary validation lives at the PC-4 contract (the caller); this
  -- primitive serves exactly the three known filters.
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

CREATE OR REPLACE FUNCTION public.ds5_moderation_report_detail(p_report_id UUID)
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
  SELECT * INTO v_r FROM public.content_reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT g.name INTO v_target_group_name FROM public.groups g WHERE g.id = v_r.target_group_id;
  SELECT g.name INTO v_reporter_display_name FROM public.groups g WHERE g.id = v_r.reporter_group_id;
  SELECT g.name INTO v_resolved_by_display_name FROM public.groups g WHERE g.id = v_r.resolved_by_group_id;

  -- Live target resolution: a tombstoned post keeps its author (the row
  -- knows them); a vanished row yields NULLs while the snapshot stands.
  -- Unknown target kinds (the open set) resolve to no-author/not-live.
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

CREATE OR REPLACE FUNCTION public.ds5_moderation_resolve_report(
  p_report_id UUID,
  p_actor_group_id UUID,
  p_resolution_kind TEXT,
  p_resolution_note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.content_reports%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_row FROM public.content_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found' USING ERRCODE = 'P0002';
  END IF;
  -- One report, one resolution — keyed on resolution-presence, never on the
  -- open status vocabulary.
  IF v_row.resolved_at IS NOT NULL THEN
    RAISE EXCEPTION 'Report already resolved' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.content_reports
     SET status = 'resolved',
         resolved_by_group_id = p_actor_group_id,
         resolved_at = v_now,
         resolution_kind = p_resolution_kind,
         resolution_note = p_resolution_note
   WHERE id = p_report_id;

  RETURN jsonb_build_object(
    'id', p_report_id,
    'status', 'resolved',
    'resolution_kind', p_resolution_kind,
    'resolved_at', v_now,
    'target_kind', v_row.target_kind
  );
END;
$$;

COMMENT ON FUNCTION public.ds5_moderation_list_reports(TEXT) IS
  'ADM-D FEAT-PC022 rider (ADR-U047 rule 3): the DS-5-owned queue read body — '
  'the report store''s own service touches its own tables. Reached only '
  'through admin_get_content_reports (EXECUTE revoked from all client roles); '
  'the admin wall and the filter vocabulary live at that PC-4 contract.';
COMMENT ON FUNCTION public.ds5_moderation_report_detail(UUID) IS
  'ADM-D FEAT-PC022 rider (ADR-U047 rule 3): the DS-5-owned detail body — '
  'live author resolution + drift honesty. Reached only through '
  'admin_get_content_report_detail; P0002 raised here, the wall at the wrapper.';
COMMENT ON FUNCTION public.ds5_moderation_resolve_report(UUID, UUID, TEXT, TEXT) IS
  'ADM-D FEAT-PC022 rider (ADR-U047 rule 3): the DS-5-owned resolve body — '
  'FOR UPDATE, one-resolution-only (P0001 on presence), the resolution write '
  'that fires notify_report_resolved on the resolved_at edge. Reached only '
  'through admin_resolve_content_report, which owns the wall, the outcome '
  'vocabulary, and the moderation.report_resolved audit write.';

-- ----------------------------------------------------------------------------
-- 3. The PC-4 contracts, re-issued as thin wrappers (signatures unchanged)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_content_reports(p_filter TEXT DEFAULT 'open')
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_filter NOT IN ('open', 'resolved', 'all') THEN
    RAISE EXCEPTION 'Unknown filter: %', p_filter USING ERRCODE = '22023';
  END IF;
  RETURN public.ds5_moderation_list_reports(p_filter);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_content_report_detail(p_report_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN public.ds5_moderation_report_detail(p_report_id);
END;
$$;

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
  v_result jsonb;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_resolution_kind NOT IN ('actioned', 'dismissed') THEN
    RAISE EXCEPTION 'Unknown resolution kind: %', p_resolution_kind USING ERRCODE = '22023';
  END IF;

  v_actor := public.get_current_personal_group_id();
  v_result := public.ds5_moderation_resolve_report(
    p_report_id, v_actor, p_resolution_kind, p_resolution_note);

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (
    v_actor,
    'moderation.report_resolved',
    p_report_id::text,
    jsonb_build_object(
      'resolution_kind', p_resolution_kind,
      'target_kind', v_result->>'target_kind'
    )
  );

  RETURN v_result - 'target_kind';
END;
$$;

COMMENT ON FUNCTION public.admin_get_content_reports(TEXT) IS
  'ADM-D FEAT-PC022 / ADM-10 (re-issued by the rider): the moderation queue '
  'contract — the PC-4 wall (is_platform_admin, 42501) and the open filter '
  'vocabulary (22023), over the DS-5-owned ds5_moderation_list_reports body '
  '(ADR-U047 rule 3 — core never touches domain tables).';
COMMENT ON FUNCTION public.admin_get_content_report_detail(UUID) IS
  'ADM-D FEAT-PC022 / ADM-11 (re-issued by the rider): the detail contract — '
  'the PC-4 wall over ds5_moderation_report_detail (P0002 existence-hiding '
  'raised domain-side, surfaced unchanged).';
COMMENT ON FUNCTION public.admin_resolve_content_report(UUID, TEXT, TEXT) IS
  'ADM-D FEAT-PC022 / ADM-11 (re-issued by the rider): the resolve contract — '
  'the PC-4 wall, the open outcome vocabulary, and the '
  'moderation.report_resolved audit write, over ds5_moderation_resolve_report '
  '(which owns the FOR UPDATE + one-resolution refusals and the write that '
  'fires the closure trigger).';

-- ----------------------------------------------------------------------------
-- 4. Grants — primitives sealed (wrapper-only, via owner execution); wrapper
--    grants re-asserted at source (the 20260721220000 reproducibility lesson).
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.ds5_moderation_list_reports(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ds5_moderation_report_detail(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ds5_moderation_resolve_report(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_get_content_reports(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_content_report_detail(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_resolve_content_report(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_content_reports(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_content_report_detail(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_content_report(UUID, TEXT, TEXT) TO authenticated, service_role;
