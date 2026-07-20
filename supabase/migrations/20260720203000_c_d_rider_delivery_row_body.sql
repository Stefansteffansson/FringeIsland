-- ============================================================================
-- C-D RIDER (FEAT-PD011; rides the #223 schema-gate nod — the C-A rider
-- precedent): function re-issues ONLY, no tables/columns/RLS touched.
--
-- The flip-green run caught a 23502: public.notifications.body is NOT NULL
-- (the vertical delivery substrate's shape) while the two send contracts
-- inserted body = NULL (a content-light pointer). The substrate's writer
-- conventions win (ADR-U048 — the table does not bend to DS-5): delivery rows
-- store the announcement body like every other notification writer stores its
-- message. The home row remains the authority for the announcement SURFACE
-- (read-time visibility, retraction); the delivery row is what the A-NTF bell
-- will render as a notification, exactly like journey_completed rows.
-- ============================================================================

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

  INSERT INTO public.notifications (recipient_group_id, type, title, body, payload)
  SELECT gm.member_group_id, 'announcement', p_title, p_body,
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

  INSERT INTO public.notifications (recipient_group_id, type, title, body, payload)
  SELECT u.personal_group_id, 'announcement', p_title, p_body,
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
