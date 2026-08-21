-- ============================================================================
-- TASK-EDT-01 — own-post editing and deletion go UNLIMITED (the 15-minute
-- window is retired). RULED (Stefan): edit 2026-08-19 (during the wielded-
-- forum walk, after the industry-pattern review); delete 2026-08-21 (at pull —
-- one consistent posture; a bounded delete protects little once edit is
-- unlimited, and the tombstone keeps thread structure intact).
--
-- Transparency replaces the clock, DISPLAY-SIDE: the Hub renders "(edited)"
-- whenever updated_at − created_at > 3 minutes (the silent typo-repair grace —
-- the Stack Overflow/Discourse/Reddit pattern). No schema is needed for the
-- note: `set_forum_posts_updated_at` (20260222000000) already moves
-- updated_at on every content edit.
--
-- Two re-issues, COR-A pattern: CREATE OR REPLACE, signatures byte-identical,
-- ACLs preserved. The ONLY change in each body is the removal of the
-- 15-minute refusal (FEAT-PD011's window edge). Everything else — author-only,
-- availability guard (FEAT-PC023), tombstone terminality, permission gate,
-- content validation, idempotent delete — is byte-carried.
--
-- Unchanged, deliberately: the wielded no-edit posture (neither function has
-- p_acting — a group-authored post stays editable by no one, PD019 v1), and
-- moderate_forum_post (moderation is not the author's door).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. edit_own_forum_post — the window edge removed
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
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  PERFORM public.assert_group_writable(v_row.group_id, v_me);
  IF v_row.is_deleted THEN
    RAISE EXCEPTION 'A removed post cannot be edited' USING ERRCODE = '42501';
  END IF;
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Post content must not be empty' USING ERRCODE = '22023';
  END IF;
  IF NOT public.has_permission(v_me, v_row.group_id, 'post_forum_messages') THEN
    RAISE EXCEPTION 'post_forum_messages required' USING ERRCODE = '42501';
  END IF;
  -- TASK-EDT-01: the 15-minute window refusal stood here. Retired — the
  -- "(edited)" note (display-side, 3-minute grace) is the honesty mechanism.

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

-- ----------------------------------------------------------------------------
-- 2. delete_own_forum_post — the window edge removed (2026-08-21 ruling)
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
  -- FEAT-PC023: the availability guard (resting exempts rest_group holders;
  -- suspended refuses everyone below the admin plane).
  PERFORM public.assert_group_writable(v_row.group_id, v_me);

  IF NOT v_row.is_deleted THEN
    IF NOT public.has_permission(v_me, v_row.group_id, 'post_forum_messages') THEN
      RAISE EXCEPTION 'post_forum_messages required' USING ERRCODE = '42501';
    END IF;
    -- TASK-EDT-01: the 15-minute window refusal stood here. Retired — the
    -- tombstone keeps thread structure; late removal is now the author's
    -- right, not a moderator errand.
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

-- ----------------------------------------------------------------------------
-- 3. Verification — the window edge is gone from both bodies; ACLs held
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_src TEXT;
BEGIN
  SELECT prosrc INTO v_src FROM pg_proc
  WHERE proname = 'edit_own_forum_post'
    AND pronamespace = 'public'::regnamespace;
  IF v_src LIKE '%15 minutes%' THEN
    RAISE EXCEPTION 'EDT-01: edit_own_forum_post still carries the window edge';
  END IF;

  SELECT prosrc INTO v_src FROM pg_proc
  WHERE proname = 'delete_own_forum_post'
    AND pronamespace = 'public'::regnamespace;
  IF v_src LIKE '%15 minutes%' THEN
    RAISE EXCEPTION 'EDT-01: delete_own_forum_post still carries the window edge';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name IN ('edit_own_forum_post', 'delete_own_forum_post')
      AND grantee = 'anon'
  ) THEN
    RAISE EXCEPTION 'EDT-01: anon holds EXECUTE on an own-mutation contract';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.edit_own_forum_post(UUID, TEXT) IS
  'Own-post edit, unlimited (TASK-EDT-01; was 15-minute-windowed, FEAT-PD011). Author-only, availability-guarded, tombstones refuse. The "(edited)" transparency note renders display-side (updated_at − created_at > 3 min grace).';
COMMENT ON FUNCTION public.delete_own_forum_post(UUID) IS
  'Own-post delete to tombstone, unlimited (TASK-EDT-01; was 15-minute-windowed, FEAT-PD011). Author-only, availability-guarded, idempotent; the tombstone preserves thread structure.';
