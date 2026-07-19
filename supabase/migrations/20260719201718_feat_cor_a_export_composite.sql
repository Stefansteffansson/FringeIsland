-- COR-A W8 — platform-side GDPR export composite.
-- Closes audit finding AC-4 and the export half of AC-5
-- (docs/planning/reference/ANATOMY-CONFORMANCE-AUDIT.md;
-- docs/planning/hub-v2/anatomy-correction-plan.md §W8).
--
-- get_own_data_export() is extended IN PLACE — same name, same (empty)
-- signature, additive payload keys only. That is the PC-3 §7-compliant change
-- shape: no signature change, so no deprecation pathway / parallel function.
--
-- COMPLETENESS IS NOW THE PLATFORM'S CONTRACT (AC-4). Until this migration,
-- *which datasets constitute a complete GDPR export* was decided only in Hub
-- BFF code (hub/app/api/account/export/route.ts composed three RPCs); a
-- sibling surface (the Gimbal) would have had to replicate the 3-way merge to
-- be GDPR-complete. From here on, ONE call returns the full document and every
-- surface is a thin courier again (ADR-U038 clause-1 spirit).
--
-- Additive keys (wire-compatible: the Hub-delivered download has carried
-- exactly these keys since FEAT-H011 / FEAT-H024 — the composer moves, the
-- shape does not, so the document schema_version stays 1):
--   'journal'  := public.get_own_journal_export()         (FEAT-PD001 STORY-5)
--   'journeys' := public.get_own_step_instances_export()  (FEAT-PD007 STORY-6)
-- Composed by CALLING the owning contracts, not inlining their SELECTs — each
-- dataset keeps its one substrate home; this function owns only completeness.
-- Nested SECURITY DEFINER calls preserve the caller identity (auth.uid()
-- reads the request JWT; the definer switch does not touch it), so every
-- section resolves to the SAME caller as the outer document. Direction note:
-- Core calls DS-owned CONTRACT FUNCTIONS here and still never reads a
-- DS-owned TABLE — the ADR-U047 seam direction (Core -> DS contract call).
--
-- Preserved EXACTLY: every existing payload key, and the durable export-event
-- write (admin_audit_log action 'data_export', metadata schema_version 1,
-- surface 'self_service').
--
-- One delta a single composed transaction implies (strictly tighter): a
-- journal/walks failure now rolls back the export-event row too — no
-- document, no export-event. (The route-side composition had already
-- committed the audit write in its first RPC before a later fetch could
-- fail.) The present-and-empty guarantee ('[]', never an omission) holds for
-- both new sections.
--
-- Known asymmetry inherited UNCHANGED (behavior-preserving relocation): the
-- walks contract resolves its actor via get_current_personal_group_id(),
-- which is is_active-gated, so a SUSPENDED member's composite export raises
-- 42501 — exactly as the route-side composition has behaved since FEAT-H024.
-- Whether suspended members should regain full-document access (PC008's own
-- right-of-access posture) is a spec question for the owning areas, not
-- silently changed here.
--
-- SECURITY DEFINER + SET search_path = '' identical to the current
-- definition; CREATE OR REPLACE preserves the existing ACL (no grant changes).

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
    'journeys', public.get_own_step_instances_export()
  );

  RETURN v_doc;
END;
$$;

COMMENT ON FUNCTION public.get_own_data_export() IS
'FEAT-PC008 / IDN-8, extended by COR-A W8 (AC-4): SECURITY DEFINER own-subject assembly of the caller''s COMPLETE personal data into one versioned jsonb document — Core-owned sections (profile + account state on users, full consent history on consent_records, group memberships on group_memberships) PLUS the platform-composed Domain sections: journal (get_own_journal_export, FEAT-PD001) and journeys (get_own_step_instances_export, FEAT-PD007). Export COMPLETENESS is this contract''s responsibility — surfaces are thin couriers and never re-assemble the document. Also writes the durable data_export audit record in the same transaction. Resolves the caller via auth.uid(); own-row only — no target parameter. Privilege-escalation surface: elevation bounded to the caller''s own cross-substrate record + the own-action audit write. VOLATILE — writes the audit row.';

-- Verification (mirrors the PD004/PD005/PD007 posture).
DO $$
BEGIN
  ASSERT to_regprocedure('public.get_own_data_export()') IS NOT NULL,
    'COR-A W8: get_own_data_export missing after re-issue';
  ASSERT to_regprocedure('public.get_own_journal_export()') IS NOT NULL,
    'COR-A W8: journal export contract missing (composition target)';
  ASSERT to_regprocedure('public.get_own_step_instances_export()') IS NOT NULL,
    'COR-A W8: walks export contract missing (composition target)';
END $$;
