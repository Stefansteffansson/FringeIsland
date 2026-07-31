-- ============================================================================
-- COR-C W2 — restore and extend GDPR-export completeness
-- (Anatomy Audit III: AC3-3 Major, AC3-16 [Stefan's ruling 2026-07-31: ADD],
--  + the user_group_roles gap the new completeness invariant surfaced.
--  AC3-4's recurrence-stopper — the manifest export classification + the
--  export-completeness-invariant gate — lands code-side in the same PR.)
--
-- The defects:
--   1. AC3-3: N-D (2026-07-26) created notification_preferences (member data)
--      and its purpose-built export contract get_own_notification_preferences_
--      export() — which NO caller composed. The live composite (N-A,
--      2026-07-23) predates the table it should export: an Art. 15 export
--      omitted the member's preference state.
--   2. AC3-16: member-authored announcements had no export path and no
--      recorded exemption. Stefan ruled 2026-07-31: ADD an authored_
--      announcements section (consistency — the export already carries the
--      member's other authored communal content).
--   3. The W2 classification pass found user_group_roles (roles the member
--      holds) is member data with no export path — the invariant's first
--      catch, fixed in the same re-issue.
--
-- The fix (both changes additive; no consumer breaks, no key renames):
--   1. get_own_messages_export(): + authored_announcements (own-authored
--      rows; retracted_by_group_id omitted — a third party's identity is not
--      the caller's data, the C-E own-data wall).
--   2. get_own_data_export(): + 'roles' inline core section (user_group_roles
--      with group/role names; assigned_by omitted per the same wall);
--      + 'notification_preferences' in the Domain-section merge.
--
-- Apply order: after 20260730210000 (COR-C W1) — independent content, ordered
-- timestamps.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. get_own_messages_export() — re-issue (C-E body + authored_announcements)
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
               'created_at', r.created_at)
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
  'FEAT-PD012 (C-E; re-issued COR-C W2, AC3-16): the DS-5 half of the Art. 15 '
  'export — own messages, participations, forum posts, submitted reports, and '
  '(W2) own-authored announcements. UNGATED own-subject resolution (a '
  'suspended member keeps the right of access); own rows only; third-party '
  'identities omitted (the own-data wall). Composed by get_own_data_export().';

-- ----------------------------------------------------------------------------
-- 2. get_own_data_export() — re-issue (N-A body + roles + preferences)
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
  'W2): ONE call returns the complete export — core sections inline (subject, '
  'profile, account_state, consent, memberships, roles) plus the composed '
  'Domain contracts (journal, journeys, communication, notifications, '
  'notification_preferences). The composed set is licensed by the manifest''s '
  'composes array and pinned by the GC-6 gate. UNGATED own-subject resolution; '
  'every export is audit-logged.';

-- ----------------------------------------------------------------------------
-- 3. Grants — unchanged by CREATE OR REPLACE; re-asserted at source
--    (the 20260721220000 reproducibility lesson).
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_own_messages_export() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_own_messages_export() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_own_data_export() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_own_data_export() TO authenticated, service_role;
