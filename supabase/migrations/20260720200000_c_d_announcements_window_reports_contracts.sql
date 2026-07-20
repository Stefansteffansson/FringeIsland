-- ============================================================================
-- FEAT-PD011 (A-COM Cycle C-D) — announcements, windowed own-edits, and
-- content-report contracts. Realizes ADR-U049 (durable DS-5 home + send-time
-- fan-out of V3 delivery rows under ADR-U048's delivery/routing split;
-- visibility read-time; one table + two scope-separated gated contracts,
-- ADR-U028 by construction; immutable + retract) and CB-3/CB-4.
--
-- Contents:
--   1. ds5_is_fim_actor() — boolean FIM predicate for RLS (policy-safe minimal
--      body; the raising sibling ds5_require_fim_actor stays the contract gate)
--   2. public.announcements — the durable home (scope CHECK; RLS: community
--      read via is_active_group_member, platform read via ds5_is_fim_actor,
--      is_platform_admin sees all incl. retracted; NO client write policies)
--   3. public.content_reports — the durable report store (idempotent-resubmit
--      UNIQUE; reporter-own + platform-admin SELECT — the ADM-10 seam;
--      NO client write policies)
--   4. send_announcements permission: catalog row + Steward-template grant +
--      backfill to Steward-template-derived role INSTANCES (gate Q2 answer:
--      template-derived only; custom roles opt in via the roles panel).
--      Seeds files updated in the same PR for fresh environments.
--   5. Contracts (the only doors): send_community_announcement,
--      send_platform_announcement, retract_announcement,
--      get_group_announcements, get_platform_announcements,
--      edit_own_forum_post, delete_own_forum_post (CB-3: 15-minute window),
--      submit_content_report (CB-4: snapshot-at-report)
--
-- Gate answers recorded (FEAT-PD011 §Open spec questions):
--   Q1 snapshot-vs-erasure: snapshots SURVIVE author hard-delete in Ferd
--      (moderation evidence); the scrub decision is a named C-E lifecycle-due
--      line item (reporter-side rows already die with the reporter via FK).
--   Q2 backfill breadth: Steward-template-derived instances only (below).
--   Q3 FIM predicate: users.is_temporary via auth.uid() — copied from the
--      live ds5_require_fim_actor definition.
--   Authoring decision flagged for the gate: the 1→all fan-out EXCLUDES
--      decommissioned accounts (terminal state — a delivery row could never be
--      seen); suspended accounts are INCLUDED (routing does not adjudicate
--      account state; access is governed at sign-in).
--
-- Realtime: NO new channels, NO new emission functions (C-D carry rule).
-- Self-delete tombstones fire the EXISTING C-C transition-gated moderation
-- trigger (trg_ds5_emit_forum_moderation_hint) — verified by the C-D suite.
--
-- Conformance lockstep (same PR, test-side): DS_TABLES += announcements,
-- content_reports; DS5_COMMUNICATION_FUNCTIONS += the eight contracts +
-- ds5_is_fim_actor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ds5_is_fim_actor() — boolean FIM predicate for RLS use.
--    SECURITY DEFINER justification: reads public.users under RLS-bypass to
--    answer "is the caller a FIM" inside policies (the is_platform_admin
--    minimal-body pattern; PG17 RLS complexity ceiling respected).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ds5_is_fim_actor()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()
      AND u.is_temporary = false
  );
$$;
REVOKE ALL ON FUNCTION public.ds5_is_fim_actor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ds5_is_fim_actor() TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. The durable announcements home (ADR-U049 ruling 1 + 2)
-- ----------------------------------------------------------------------------
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Closure justified (Extensibility): ADR-U028's governance scopes are
  -- constitutionally enumerated, not an extensible content family.
  scope_kind TEXT NOT NULL CHECK (scope_kind IN ('community', 'platform')),
  scope_group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  author_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retracted_at TIMESTAMPTZ,
  retracted_by_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  CONSTRAINT announcements_scope_shape
    CHECK ((scope_kind = 'community') = (scope_group_id IS NOT NULL))
);

CREATE INDEX idx_announcements_community
  ON public.announcements (scope_group_id, created_at DESC)
  WHERE scope_kind = 'community';
CREATE INDEX idx_announcements_platform
  ON public.announcements (created_at DESC)
  WHERE scope_kind = 'platform';

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Visibility is read-time (ADR-U049 ruling 3): current members of the scope
-- see standing (non-retracted) announcements — late joiners included.
CREATE POLICY "announcements_select_community"
  ON public.announcements FOR SELECT TO authenticated
  USING (
    scope_kind = 'community'
    AND retracted_at IS NULL
    AND public.is_active_group_member(scope_group_id)
  );

CREATE POLICY "announcements_select_platform"
  ON public.announcements FOR SELECT TO authenticated
  USING (
    scope_kind = 'platform'
    AND retracted_at IS NULL
    AND public.ds5_is_fim_actor()
  );

-- Governance sees everything, retracted included (ADR-U049 ruling 4).
CREATE POLICY "announcements_select_admin"
  ON public.announcements FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- NO INSERT/UPDATE/DELETE policies: the contracts are the only door.

-- ----------------------------------------------------------------------------
-- 3. The durable report store (CB-4)
-- ----------------------------------------------------------------------------
CREATE TABLE public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Reporter rows die with the reporter (GDPR lean; C-E revisits the wider
  -- lifecycle dues).
  reporter_group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  -- Open TEXT (Extensibility): validated kinds grow additively in the
  -- contract, never CHECK-enumerated.
  target_kind TEXT NOT NULL CHECK (length(trim(target_kind)) > 0),
  target_id UUID NOT NULL,
  target_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  details TEXT,
  -- What the content said when reported — load-bearing because COM-12's edit
  -- window lets content drift after the fact (gate Q1: survives in Ferd).
  content_snapshot TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (length(trim(status)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_reports_one_per_reporter_target
    UNIQUE (reporter_group_id, target_kind, target_id)
);

CREATE INDEX idx_content_reports_status
  ON public.content_reports (status, created_at DESC);
CREATE INDEX idx_content_reports_target
  ON public.content_reports (target_kind, target_id);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_reports_select_own"
  ON public.content_reports FOR SELECT TO authenticated
  USING (reporter_group_id = public.get_current_personal_group_id());

-- The ADM-10 seam: A-ADM's moderation queue renders from exactly this read.
CREATE POLICY "content_reports_select_admin"
  ON public.content_reports FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- NO INSERT/UPDATE/DELETE policies: submission goes through the contract;
-- status transitions belong to A-ADM (a future contract, not a client write).

-- ----------------------------------------------------------------------------
-- 4. send_announcements — catalog row, template grant, instance backfill
--    (the auto_grant_permission_to_deusex trigger fires on the INSERT and
--    grants the DeusEx role automatically, as for every permission.)
-- ----------------------------------------------------------------------------
INSERT INTO public.permissions (name, description, category)
SELECT 'send_announcements',
       'Send announcements to the whole group (COM-8; ADR-U049)',
       'communication'
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions WHERE name = 'send_announcements'
);

INSERT INTO public.role_template_permissions (role_template_id, permission_id)
SELECT rt.id, p.id
FROM public.role_templates rt, public.permissions p
WHERE rt.name = 'Steward Role Template'
  AND p.name = 'send_announcements'
ON CONFLICT DO NOTHING;

-- Backfill: every EXISTING Steward-template-derived role instance (gate Q2 —
-- template-derived only; custom roles opt in via the roles panel).
INSERT INTO public.group_role_permissions (group_role_id, permission_id)
SELECT gr.id, p.id
FROM public.group_roles gr
JOIN public.role_templates rt ON rt.id = gr.created_from_role_template_id
CROSS JOIN public.permissions p
WHERE rt.name = 'Steward Role Template'
  AND p.name = 'send_announcements'
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5a. send_community_announcement() — COM-8's write door (PD011 STORY-2).
--     SECURITY DEFINER justification: inserts the home row and fans out
--     delivery rows (public.notifications has no client INSERT policy by
--     design — obligation-fulfilment writes per ADR-U048).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_community_announcement(
  p_group_id UUID,
  p_title TEXT,
  p_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_row public.announcements%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_title IS NULL OR length(trim(p_title)) = 0
     OR p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'Title and body must not be empty' USING ERRCODE = '22023';
  END IF;
  IF length(p_title) > 200 OR length(p_body) > 10000 THEN
    RAISE EXCEPTION 'Title or body too long' USING ERRCODE = '22023';
  END IF;
  IF NOT public.has_permission(v_me, p_group_id, 'send_announcements') THEN
    RAISE EXCEPTION 'send_announcements required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.announcements
    (scope_kind, scope_group_id, author_group_id, title, body)
  VALUES ('community', p_group_id, v_me, p_title, p_body)
  RETURNING * INTO v_row;

  -- Send-time delivery fan-out (ADR-U049 ruling 3): active members at send,
  -- author excluded. The delivery row is a routed pointer, never the truth.
  INSERT INTO public.notifications (recipient_group_id, type, title, body, payload)
  SELECT gm.member_group_id, 'announcement', p_title, NULL,
         jsonb_build_object(
           'announcement_id', v_row.id,
           'scope_kind', 'community',
           'scope_group_id', p_group_id,
           'sent_by_group_id', v_me
         )
  FROM public.group_memberships gm
  WHERE gm.group_id = p_group_id
    AND gm.status = 'active'
    AND gm.member_group_id <> v_me;

  RETURN jsonb_build_object(
    'id', v_row.id, 'title', v_row.title, 'body', v_row.body,
    'created_at', v_row.created_at, 'author_group_id', v_me,
    'author', public.ds5_resolve_author_display(v_me, p_group_id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.send_community_announcement(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_community_announcement(UUID, TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5b. send_platform_announcement() — COM-9's write door (PD011 STORY-3).
--     SECURITY DEFINER justification: as 5a, plus the PC-4 audit write.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_platform_announcement(
  p_title TEXT,
  p_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_row public.announcements%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_title IS NULL OR length(trim(p_title)) = 0
     OR p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'Title and body must not be empty' USING ERRCODE = '22023';
  END IF;
  IF length(p_title) > 200 OR length(p_body) > 10000 THEN
    RAISE EXCEPTION 'Title or body too long' USING ERRCODE = '22023';
  END IF;
  IF NOT public.has_permission(
    v_me, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups'
  ) THEN
    RAISE EXCEPTION 'manage_all_groups required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.announcements
    (scope_kind, scope_group_id, author_group_id, title, body)
  VALUES ('platform', NULL, v_me, p_title, p_body)
  RETURNING * INTO v_row;

  -- 1→all: every FIM's personal group at send, author excluded; suspended
  -- included (routing is dumb); decommissioned excluded (terminal state —
  -- authoring decision flagged in the migration header for the gate).
  INSERT INTO public.notifications (recipient_group_id, type, title, body, payload)
  SELECT u.personal_group_id, 'announcement', p_title, NULL,
         jsonb_build_object(
           'announcement_id', v_row.id,
           'scope_kind', 'platform',
           'scope_group_id', NULL,
           'sent_by_group_id', v_me
         )
  FROM public.users u
  WHERE u.is_temporary = false
    AND u.is_decommissioned = false
    AND u.personal_group_id IS NOT NULL
    AND u.personal_group_id <> v_me;

  INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
  VALUES (v_me, 'send_platform_announcement', v_row.id::text,
          jsonb_build_object('title', p_title));

  RETURN jsonb_build_object(
    'id', v_row.id, 'title', v_row.title, 'body', v_row.body,
    'created_at', v_row.created_at, 'author_group_id', v_me,
    'author', public.ds5_resolve_author_display(v_me, NULL)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.send_platform_announcement(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_platform_announcement(TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5c. retract_announcement() — same gate as the send, role-based not
--     person-based; idempotent; pointers left standing (ADR-U049 ruling 4).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.retract_announcement(
  p_announcement_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_row public.announcements%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT * INTO v_row FROM public.announcements
  WHERE id = p_announcement_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Announcement not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.scope_kind = 'community' THEN
    IF NOT public.has_permission(v_me, v_row.scope_group_id, 'send_announcements') THEN
      RAISE EXCEPTION 'send_announcements required' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT public.has_permission(
      v_me, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups'
    ) THEN
      RAISE EXCEPTION 'manage_all_groups required' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_row.retracted_at IS NULL THEN
    UPDATE public.announcements
    SET retracted_at = NOW(), retracted_by_group_id = v_me
    WHERE id = p_announcement_id
    RETURNING * INTO v_row;

    IF v_row.scope_kind = 'platform' THEN
      INSERT INTO public.admin_audit_log (actor_group_id, action, target, metadata)
      VALUES (v_me, 'retract_platform_announcement', v_row.id::text,
              jsonb_build_object('title', v_row.title));
    END IF;
  END IF;

  RETURN jsonb_build_object('id', v_row.id, 'retracted_at', v_row.retracted_at);
END;
$$;
REVOKE ALL ON FUNCTION public.retract_announcement(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retract_announcement(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5d. get_group_announcements() — the community board read (STORY-4).
--     SECURITY DEFINER justification: reads the home under the membership
--     gate; keyset-paged like get_group_forum.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_group_announcements(
  p_group_id UUID,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_list JSONB;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF NOT public.is_active_group_member(p_group_id) THEN
    RAISE EXCEPTION 'Group membership required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_doc ORDER BY sort_ts DESC), '[]'::jsonb)
  INTO v_list
  FROM (
    SELECT a.created_at AS sort_ts,
           jsonb_build_object(
             'id', a.id, 'title', a.title, 'body', a.body,
             'created_at', a.created_at, 'author_group_id', a.author_group_id,
             'author', public.ds5_resolve_author_display(a.author_group_id, p_group_id)
           ) AS row_doc
    FROM public.announcements a
    WHERE a.scope_kind = 'community'
      AND a.scope_group_id = p_group_id
      AND a.retracted_at IS NULL
      AND (p_before IS NULL OR a.created_at < p_before)
    ORDER BY a.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ) page;

  RETURN jsonb_build_object('announcements', v_list);
END;
$$;
REVOKE ALL ON FUNCTION public.get_group_announcements(UUID, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_announcements(UUID, TIMESTAMPTZ, INTEGER) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5e. get_platform_announcements() — the platform board read (STORY-4).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_platform_announcements(
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_list JSONB;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT COALESCE(jsonb_agg(row_doc ORDER BY sort_ts DESC), '[]'::jsonb)
  INTO v_list
  FROM (
    SELECT a.created_at AS sort_ts,
           jsonb_build_object(
             'id', a.id, 'title', a.title, 'body', a.body,
             'created_at', a.created_at, 'author_group_id', a.author_group_id,
             'author', public.ds5_resolve_author_display(a.author_group_id, NULL)
           ) AS row_doc
    FROM public.announcements a
    WHERE a.scope_kind = 'platform'
      AND a.retracted_at IS NULL
      AND (p_before IS NULL OR a.created_at < p_before)
    ORDER BY a.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ) page;

  RETURN jsonb_build_object('announcements', v_list);
END;
$$;
REVOKE ALL ON FUNCTION public.get_platform_announcements(TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_announcements(TIMESTAMPTZ, INTEGER) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5f. edit_own_forum_post() — COM-12's edit half (CB-3: forum-only, 15 min).
--     The C-B write-narrowing dropped forum_update_own; this contract is the
--     windowed return. Content edits emit NO hint (the C-C trigger topology
--     is INSERT + tombstone-transition only — verified by the C-D suite).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.edit_own_forum_post(
  p_post_id UUID,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_row public.forum_posts%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT * INTO v_row FROM public.forum_posts
  WHERE id = p_post_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.author_group_id IS DISTINCT FROM v_me THEN
    RAISE EXCEPTION 'Only the author may edit their post' USING ERRCODE = '42501';
  END IF;
  IF v_row.is_deleted THEN
    RAISE EXCEPTION 'A removed post cannot be edited' USING ERRCODE = '42501';
  END IF;
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Post content must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NOT public.has_permission(v_me, v_row.group_id, 'post_forum_messages') THEN
    RAISE EXCEPTION 'post_forum_messages required' USING ERRCODE = '42501';
  END IF;
  IF v_row.created_at <= NOW() - interval '15 minutes' THEN
    RAISE EXCEPTION 'The edit window (15 minutes) has closed' USING ERRCODE = '42501';
  END IF;

  UPDATE public.forum_posts
  SET content = p_content
  WHERE id = p_post_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id, 'parent_post_id', v_row.parent_post_id,
    'content', v_row.content, 'is_deleted', v_row.is_deleted,
    'created_at', v_row.created_at, 'updated_at', v_row.updated_at,
    'author_group_id', v_row.author_group_id,
    'author', public.ds5_resolve_author_display(v_row.author_group_id, v_row.group_id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.edit_own_forum_post(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_own_forum_post(UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5g. delete_own_forum_post() — COM-12's delete half (CB-3). Idempotent
--     terminal state (mirrors moderate_forum_post; no un-delete path exists
--     anywhere). The tombstone transition fires the EXISTING C-C moderation
--     hint — no new emission.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_own_forum_post(
  p_post_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_row public.forum_posts%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT * INTO v_row FROM public.forum_posts
  WHERE id = p_post_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.author_group_id IS DISTINCT FROM v_me THEN
    RAISE EXCEPTION 'Only the author may delete their post' USING ERRCODE = '42501';
  END IF;

  IF NOT v_row.is_deleted THEN
    IF NOT public.has_permission(v_me, v_row.group_id, 'post_forum_messages') THEN
      RAISE EXCEPTION 'post_forum_messages required' USING ERRCODE = '42501';
    END IF;
    IF v_row.created_at <= NOW() - interval '15 minutes' THEN
      RAISE EXCEPTION 'The delete window (15 minutes) has closed' USING ERRCODE = '42501';
    END IF;
    UPDATE public.forum_posts
    SET is_deleted = true
    WHERE id = p_post_id
    RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id, 'parent_post_id', v_row.parent_post_id,
    'content', NULL, 'is_deleted', true,
    'created_at', v_row.created_at, 'updated_at', v_row.updated_at,
    'author_group_id', v_row.author_group_id,
    'author', public.ds5_resolve_author_display(v_row.author_group_id, v_row.group_id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.delete_own_forum_post(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_forum_post(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5h. submit_content_report() — COM-13's write door (CB-4).
--     Visibility is validated through each target's own read rules so the
--     contract is not an existence oracle: absent and not-visible refuse with
--     the SAME error. Snapshot at submit; idempotent resubmit returns the
--     existing row.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_content_report(
  p_target_kind TEXT,
  p_target_id UUID,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_snapshot TEXT;
  v_target_group UUID;
  v_author UUID;
  v_conv UUID;
  v_row public.content_reports%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'A reason is required' USING ERRCODE = '22023';
  END IF;

  IF p_target_kind = 'forum_post' THEN
    SELECT fp.content, fp.group_id, fp.author_group_id
    INTO v_snapshot, v_target_group, v_author
    FROM public.forum_posts fp
    WHERE fp.id = p_target_id;
    IF NOT FOUND OR NOT public.is_active_group_member(v_target_group) THEN
      RAISE EXCEPTION 'Report target not found' USING ERRCODE = 'P0002';
    END IF;
  ELSIF p_target_kind = 'direct_message' THEN
    SELECT m.content, m.conversation_id, m.sender_group_id
    INTO v_snapshot, v_conv, v_author
    FROM public.messages m
    WHERE m.id = p_target_id;
    IF NOT FOUND OR NOT public.is_conversation_participant(v_conv) THEN
      RAISE EXCEPTION 'Report target not found' USING ERRCODE = 'P0002';
    END IF;
    SELECT c.group_id INTO v_target_group
    FROM public.conversations c WHERE c.id = v_conv;
  ELSE
    -- Open set: kinds grow additively here (Extensibility — no CHECK enum).
    RAISE EXCEPTION 'Unknown report target kind' USING ERRCODE = '22023';
  END IF;

  IF v_author IS NOT DISTINCT FROM v_me THEN
    RAISE EXCEPTION 'Cannot report your own content' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.content_reports
    (reporter_group_id, target_kind, target_id, target_group_id,
     reason, details, content_snapshot)
  VALUES (v_me, p_target_kind, p_target_id, v_target_group,
          trim(p_reason), p_details, v_snapshot)
  ON CONFLICT ON CONSTRAINT content_reports_one_per_reporter_target DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    SELECT * INTO v_row FROM public.content_reports
    WHERE reporter_group_id = v_me
      AND target_kind = p_target_kind
      AND target_id = p_target_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id, 'status', v_row.status, 'created_at', v_row.created_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.submit_content_report(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_content_report(TEXT, UUID, TEXT, TEXT) TO authenticated;
