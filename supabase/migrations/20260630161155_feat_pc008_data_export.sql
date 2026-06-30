-- FEAT-PC008 / IDN-8 — member data export (the platform half of Hub FEAT-H010).
--
-- A self-service, own-subject contract that assembles the caller's complete
-- Core-owned personal data into one versioned jsonb document AND records a
-- durable export-event (the GDPR right of access / data portability — Art. 15 /
-- Art. 20). Synchronous: request and receive in one call. No new table.
--
-- Resolution: via auth.uid() -> public.users directly, NOT
-- get_current_personal_group_id() (which is is_active-gated) — so a SUSPENDED
-- member can still exercise their right of access. Own-row only; no target param.
--
-- Sections (v1, all Core-owned): subject / profile / account_state / consent
-- (full append-only history) / memberships. Domain-owned data (journey
-- enrolments, DS-3) and the Journal (IDN-5) are FORWARD-SEAM sections — PC-4
-- does not read Domain tables (one-way Core->Domain boundary; §L3 scopes IDN-8
-- to PC-4). New areas extend the document under a schema_version bump.
--
-- Durable export-event: written to public.admin_audit_log (action 'data_export',
-- actor = the exporting member's personal group). This is the only existing
-- durable audit substrate; whether a member-initiated data-subject-rights event
-- ultimately belongs in an admin-tier log or a dedicated privacy-events log is
-- an open spec question (FEAT-PC008) — admin_audit_log is the v1 default.
--
-- Privilege-escalation surface: SECURITY DEFINER, SET search_path = ''. The
-- elevation is bounded to projecting the caller's OWN cross-substrate record and
-- writing the caller's OWN export-event. No new table (no RLS change). VOLATILE
-- (it writes the audit row) — NOT STABLE.

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

  RETURN v_doc;
END;
$$;

COMMENT ON FUNCTION public.get_own_data_export() IS
'FEAT-PC008 / IDN-8: SECURITY DEFINER own-subject assembly of the caller''s complete Core-owned personal data (profile + account state on users, full consent history on consent_records, group memberships on group_memberships) into one versioned jsonb document, plus a durable data_export audit record. Resolves the caller via auth.uid() (covers suspended members). Own-row only — no target parameter. Domain-owned data (enrolments) + the Journal (IDN-5) are forward-seam sections (one-way Core->Domain boundary). Privilege-escalation surface: elevation bounded to the caller''s own cross-substrate record + the own-action audit write. VOLATILE — writes the audit row.';
