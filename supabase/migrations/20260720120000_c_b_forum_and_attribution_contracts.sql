-- ============================================================================
-- Cycle C-B (FEAT-PD009) — forum & attribution contracts
-- ============================================================================
-- One schema-gate migration (named approval required):
--   1. ds5_resolve_author_display() — the COM-14 attribution ladder as ONE
--      substrate home (PD009 Q1: shared helper, decided here).
--   2. The four forum client contracts: get_group_forum / create_forum_post /
--      reply_to_forum_post / moderate_forum_post (SECURITY DEFINER,
--      search_path='', ds5_require_fim_actor first — CB-1).
--   3. get_conversation_detail re-issued: the senders map's values become
--      {display_name, attribution} objects (the C-A NULL-name interim
--      retires; FEAT-H026 consumes the new shape in the same cycle).
--   4. ds5_lifecycle_user_hard_deleted() — ADR-U047's first DS-5 fact
--      (Amendment 3 rides this PR): the sentinel reassignment of
--      forum_posts.author_group_id relocates verbatim out of
--      admin_hard_delete_user; Core keeps sentinel resolution + the
--      COALESCE(sentinel, caller) fallback and passes the target.
--   5. admin_hard_delete_user re-issued byte-equivalent except the PERFORM
--      (the Core carve-out this gate covers).
--   6. Write-narrowing: forum_insert_post / forum_update_own /
--      forum_update_moderate DROP (contracts are the only door; forum_select
--      stays as defense-in-depth). Edit-own returns at C-D as a windowed
--      contract (CB-3).
--   Conformance lockstep (same PR, test-side): DS_TABLES += forum_posts;
--   DS-5 allowlist += the four contracts + the handler + enforce_flat_threading.
--
--   PD009 Q2: ADR-U047 Amendment 3 recorded in the ADR, riding this PR.
--   PD009 Q3: tombstones keep their author display (v1 thread legibility);
--             content is withheld platform-side (NULL in the payload).
--
--   Attribution ladder (COM-14; strings per board CB-9; ADR-U021 display law):
--     rung 1  author resolves to a personal group WITH a backing users row
--             AND a membership row (any status) in the scope group
--             -> the privacy-shaped name, attribution 'active'
--     rung 2  backing users row, no membership row in scope
--             -> 'Former member' / 'former'  (name withheld; rejoin restores)
--     rung 3  NULL author, no backing users row (the [Deleted User] sentinel
--             and every system group), or resolution failure
--             -> 'Unknown' / 'unknown'
--   A DM has no scope group: rung 1 collapses to resolvable -> name.
--   Deliberate v2 display change, recorded: erased authors render 'Unknown',
--   never the sentinel's literal "[Deleted User]" (lifecycle leak); the stored
--   reassignment itself is preserved verbatim.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The attribution ladder — one substrate home (COM-14)
-- ----------------------------------------------------------------------------
-- Internal helper: called by the DS-5 read contracts, not a client surface.
CREATE OR REPLACE FUNCTION public.ds5_resolve_author_display(
  p_author_group_id UUID,
  p_scope_group_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF p_author_group_id IS NULL THEN
    RETURN jsonb_build_object('display_name', 'Unknown', 'attribution', 'unknown');
  END IF;

  -- rung 3 gate: only a personal group with a backing users row is a
  -- resolvable identity (the [Deleted User] sentinel has none).
  SELECT g.name INTO v_name
  FROM public.groups g
  JOIN public.users u ON u.personal_group_id = g.id
  WHERE g.id = p_author_group_id;
  IF v_name IS NULL THEN
    RETURN jsonb_build_object('display_name', 'Unknown', 'attribution', 'unknown');
  END IF;

  -- DM rung: no scope group — resolvable is enough.
  IF p_scope_group_id IS NULL THEN
    RETURN jsonb_build_object('display_name', v_name, 'attribution', 'active');
  END IF;

  -- rung 1 vs rung 2: membership row in the scope group, any status —
  -- paused is still a member; leave/removal delete the row (ADR-U021).
  IF EXISTS (
    SELECT 1 FROM public.group_memberships gm
    WHERE gm.group_id = p_scope_group_id
      AND gm.member_group_id = p_author_group_id
  ) THEN
    RETURN jsonb_build_object('display_name', v_name, 'attribution', 'active');
  END IF;

  RETURN jsonb_build_object('display_name', 'Former member', 'attribution', 'former');
END;
$$;
REVOKE ALL ON FUNCTION public.ds5_resolve_author_display(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. get_group_forum(): the forum in one read (PD009 STORY-1)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_group_forum(
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
  v_posts JSONB;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF NOT public.has_permission(v_me, p_group_id, 'view_forum') THEN
    RAISE EXCEPTION 'view_forum required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_doc ORDER BY sort_ts DESC), '[]'::jsonb)
  INTO v_posts
  FROM (
    SELECT
      t.created_at AS sort_ts,
      jsonb_build_object(
        'id', t.id,
        'parent_post_id', NULL,
        'content', CASE WHEN t.is_deleted THEN NULL ELSE t.content END,
        'is_deleted', t.is_deleted,
        'created_at', t.created_at,
        'updated_at', t.updated_at,
        'author_group_id', t.author_group_id,
        'author', public.ds5_resolve_author_display(t.author_group_id, p_group_id),
        'replies', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', r.id,
            'parent_post_id', r.parent_post_id,
            'content', CASE WHEN r.is_deleted THEN NULL ELSE r.content END,
            'is_deleted', r.is_deleted,
            'created_at', r.created_at,
            'updated_at', r.updated_at,
            'author_group_id', r.author_group_id,
            'author', public.ds5_resolve_author_display(r.author_group_id, p_group_id),
            'replies', '[]'::jsonb
          ) ORDER BY r.created_at ASC), '[]'::jsonb)
          FROM public.forum_posts r
          WHERE r.parent_post_id = t.id
        )
      ) AS row_doc
    FROM public.forum_posts t
    WHERE t.group_id = p_group_id
      AND t.parent_post_id IS NULL
      AND (p_before IS NULL OR t.created_at < p_before)
    ORDER BY t.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ) page;

  RETURN jsonb_build_object('posts', v_posts);
END;
$$;
REVOKE ALL ON FUNCTION public.get_group_forum(UUID, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_group_forum(UUID, TIMESTAMPTZ, INTEGER) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. create_forum_post(): open a thread (PD009 STORY-2)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_forum_post(
  p_group_id UUID,
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
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Post content must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NOT public.has_permission(v_me, p_group_id, 'post_forum_messages') THEN
    RAISE EXCEPTION 'post_forum_messages required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.forum_posts (group_id, author_group_id, content)
  VALUES (p_group_id, v_me, p_content)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'parent_post_id', v_row.parent_post_id,
    'content', v_row.content,
    'is_deleted', v_row.is_deleted,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'author_group_id', v_row.author_group_id,
    'author', public.ds5_resolve_author_display(v_row.author_group_id, p_group_id),
    'replies', '[]'::jsonb
  );
END;
$$;
REVOKE ALL ON FUNCTION public.create_forum_post(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_forum_post(UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. reply_to_forum_post(): flat forever (PD009 STORY-3)
-- ----------------------------------------------------------------------------
-- The enforce_flat_threading trigger stays the enforcement (reply-to-a-reply
-- and cross-group are its P0001s); the contract pre-validates only what it
-- needs for gating: the parent's existence (P0002) and group.
CREATE OR REPLACE FUNCTION public.reply_to_forum_post(
  p_parent_post_id UUID,
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
  v_parent RECORD;
  v_row public.forum_posts%ROWTYPE;
BEGIN
  v_me := public.ds5_require_fim_actor();
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Reply content must not be empty' USING ERRCODE = '22023';
  END IF;

  SELECT id, group_id INTO v_parent
  FROM public.forum_posts WHERE id = p_parent_post_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent post not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.has_permission(v_me, v_parent.group_id, 'reply_to_messages') THEN
    RAISE EXCEPTION 'reply_to_messages required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.forum_posts (group_id, author_group_id, parent_post_id, content)
  VALUES (v_parent.group_id, v_me, p_parent_post_id, p_content)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'parent_post_id', v_row.parent_post_id,
    'content', v_row.content,
    'is_deleted', v_row.is_deleted,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at,
    'author_group_id', v_row.author_group_id,
    'author', public.ds5_resolve_author_display(v_row.author_group_id, v_parent.group_id),
    'replies', '[]'::jsonb
  );
END;
$$;
REVOKE ALL ON FUNCTION public.reply_to_forum_post(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_to_forum_post(UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. moderate_forum_post(): community-scoped care (PD009 STORY-4; ADR-U028)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.moderate_forum_post(
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
  v_post RECORD;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT id, group_id, is_deleted INTO v_post
  FROM public.forum_posts WHERE id = p_post_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.has_permission(v_me, v_post.group_id, 'moderate_forum') THEN
    RAISE EXCEPTION 'moderate_forum required' USING ERRCODE = '42501';
  END IF;

  -- idempotent: already-tombstoned is success, not an error
  IF NOT v_post.is_deleted THEN
    UPDATE public.forum_posts SET is_deleted = true WHERE id = p_post_id;
  END IF;

  RETURN jsonb_build_object('id', v_post.id, 'is_deleted', true);
END;
$$;
REVOKE ALL ON FUNCTION public.moderate_forum_post(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_forum_post(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. get_conversation_detail(): senders map upgrades to the ladder (COM-14)
-- ----------------------------------------------------------------------------
-- Re-issued from 20260719230500 with ONE change: v_senders values become
-- {display_name, attribution} via ds5_resolve_author_display (scope = the
-- conversation's group for group-kind, NULL for dm). Everything else identical.
CREATE OR REPLACE FUNCTION public.get_conversation_detail(
  p_conversation_id UUID,
  p_before TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_me UUID;
  v_conv RECORD;
  v_messages JSONB;
  v_senders JSONB;
  v_participants JSONB;
  v_my_last_read TIMESTAMPTZ;
BEGIN
  v_me := public.ds5_require_fim_actor();

  SELECT c.id, c.kind, c.title, c.group_id, g.name AS group_name
  INTO v_conv
  FROM public.conversations c
  LEFT JOIN public.groups g ON g.id = c.group_id
  WHERE c.id = p_conversation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT last_read_at INTO v_my_last_read
  FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id
    AND participant_group_id = v_me AND left_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a participant' USING ERRCODE = '42501';
  END IF;

  WITH page AS (
    SELECT m.id, m.sender_group_id, m.content, m.created_at
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND (p_before IS NULL OR m.created_at < p_before)
    ORDER BY m.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'sender_group_id', sender_group_id,
      'content', content, 'created_at', created_at
    ) ORDER BY created_at ASC), '[]'::jsonb)
  INTO v_messages FROM page;

  -- Display resolution for every sender in the page — the COM-14 ladder
  -- (scope = the conversation's group; NULL scope for a dm).
  SELECT COALESCE(jsonb_object_agg(
    sid::text,
    public.ds5_resolve_author_display(sid, v_conv.group_id)
  ), '{}'::jsonb)
  INTO v_senders
  FROM (
    SELECT DISTINCT m.sender_group_id AS sid
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND m.sender_group_id IS NOT NULL
  ) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'participant_group_id', cp.participant_group_id,
    'name', g.name,
    'joined_at', cp.joined_at,
    'left_at', cp.left_at,
    'is_me', cp.participant_group_id = v_me
  )), '[]'::jsonb)
  INTO v_participants
  FROM public.conversation_participants cp
  LEFT JOIN public.groups g ON g.id = cp.participant_group_id
  WHERE cp.conversation_id = p_conversation_id;

  RETURN jsonb_build_object(
    'id', v_conv.id, 'kind', v_conv.kind, 'title', v_conv.title,
    'group_id', v_conv.group_id, 'group_name', v_conv.group_name,
    'messages', v_messages, 'senders', v_senders,
    'participants', v_participants, 'my_last_read_at', v_my_last_read
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_conversation_detail(UUID, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conversation_detail(UUID, TIMESTAMPTZ, INTEGER) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. ds5_lifecycle_user_hard_deleted(): ADR-U047's first DS-5 fact
-- ----------------------------------------------------------------------------
-- Core resolves the [Deleted User] sentinel (COALESCE(sentinel, caller)) and
-- passes the target; DS-5 owns the reassignment statement — moved verbatim
-- from admin_hard_delete_user (20260719190205:1421-1424). Synchronous, same
-- transaction; errors propagate; runs before the personal-group delete.
CREATE OR REPLACE FUNCTION public.ds5_lifecycle_user_hard_deleted(
  p_personal_group_id UUID,
  p_reassign_to_group_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = ''
AS $$
BEGIN
  IF p_personal_group_id IS NULL OR p_reassign_to_group_id IS NULL THEN
    RAISE EXCEPTION 'ds5_lifecycle_user_hard_deleted: null argument'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.forum_posts
  SET author_group_id = p_reassign_to_group_id
  WHERE author_group_id = p_personal_group_id;
END;
$$;
REVOKE ALL ON FUNCTION public.ds5_lifecycle_user_hard_deleted(UUID, UUID)
  FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8. admin_hard_delete_user re-issued — the forum crossing comes home
-- ----------------------------------------------------------------------------
-- Byte-equivalent to 20260719190205:1384-1470 except the inline forum_posts
-- UPDATE is replaced by the DS-5 lifecycle fact call (the Core carve-out this
-- schema gate covers).
create or replace function public.admin_hard_delete_user(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_group_id uuid;
  v_target_personal_group_id uuid;
  v_target_auth_user_id uuid;
  v_deleted_user_group_id uuid;
begin
  -- Verify caller has manage_all_groups permission
  v_caller_group_id := public.get_current_personal_group_id();
  if not public.has_permission(v_caller_group_id, '00000000-0000-0000-0000-000000000000'::uuid, 'manage_all_groups') then
    raise exception 'Unauthorized: manage_all_groups permission required';
  end if;

  -- Get target's personal group and auth user ID
  select personal_group_id, auth_user_id
  into v_target_personal_group_id, v_target_auth_user_id
  from public.users where id = target_user_id;

  if v_target_personal_group_id is null then
    raise exception 'User not found or has no personal group';
  end if;

  -- Get [Deleted User] sentinel group
  select id into v_deleted_user_group_id
  from public.groups where name = '[Deleted User]' and group_type = 'system';

  -- Write audit log BEFORE deletion
  insert into public.admin_audit_log (actor_group_id, action, target, metadata)
  values (v_caller_group_id, 'admin_hard_delete_user', target_user_id::text,
    jsonb_build_object('target_user_id', target_user_id,
      'target_personal_group_id', v_target_personal_group_id));

  -- Reassign the target's DS-5 forum authorship -> the sentinel.
  -- DS-5's own disposition now (ADR-U047 Amendment 3): Core resolves the
  -- target (COALESCE keeps the fallback the inline UPDATE had) and passes it;
  -- DS-5 owns the reassignment. Same transaction, before the group delete.
  perform public.ds5_lifecycle_user_hard_deleted(
    v_target_personal_group_id,
    coalesce(v_deleted_user_group_id, v_caller_group_id));

  -- Reassign the target's DS-3 journeys + enrolment attributions -> the sentinel.
  -- DS-3's own disposition now (ADR-U047 Amendment 1): Core resolves the target
  -- (COALESCE keeps journeys.created_by_group_id NOT NULL) and passes it; DS-3
  -- owns the reassignment. Runs before the group delete (RESTRICT), same as the
  -- inline journeys reassignment it replaces.
  perform public.ds3_lifecycle_user_hard_deleted(
    v_target_personal_group_id,
    coalesce(v_deleted_user_group_id, v_caller_group_id));

  update public.groups
  set created_by_group_id = coalesce(v_deleted_user_group_id, v_caller_group_id)
  where created_by_group_id = v_target_personal_group_id
    and id != v_target_personal_group_id;

  update public.admin_audit_log
  set actor_group_id = v_deleted_user_group_id
  where actor_group_id = v_target_personal_group_id;

  -- Reassign actor FKs in membership/role tables
  update public.group_memberships
  set added_by_group_id = v_deleted_user_group_id
  where added_by_group_id = v_target_personal_group_id;

  update public.user_group_roles
  set assigned_by_group_id = v_deleted_user_group_id
  where assigned_by_group_id = v_target_personal_group_id;

  -- Enable bypass for immutability trigger and notification triggers (transaction-local)
  perform set_config('app.bypass_personal_group_id_immutability', 'true', true);
  perform set_config('app.hard_delete_in_progress', 'true', true);

  -- Delete personal group (CASCADE: memberships, roles, notifications, enrollments, conversations)
  delete from public.groups where id = v_target_personal_group_id;

  -- Delete user record
  delete from public.users where id = target_user_id;

  -- Delete auth user
  if v_target_auth_user_id is not null then
    delete from auth.users where id = v_target_auth_user_id;
  end if;

  return jsonb_build_object('success', true, 'deleted_user_id', target_user_id);
end;
$$;

-- ----------------------------------------------------------------------------
-- 9. Write-narrowing: the contracts are the only door
-- ----------------------------------------------------------------------------
-- Exact-name DROPs (no IF EXISTS — a wrong name must error loudly, per the
-- platform gotcha). forum_select stays: reads keep defense-in-depth RLS.
DROP POLICY "forum_insert_post" ON public.forum_posts;
DROP POLICY "forum_update_own" ON public.forum_posts;
DROP POLICY "forum_update_moderate" ON public.forum_posts;
