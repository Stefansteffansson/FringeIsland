-- Migration: Add Group Forum System
-- Date: 2026-02-14
-- Phase: 1.5-A (Communication - Forums)
-- Author: Database Agent
-- Design: docs/features/planned/group-forum-system.md
--
-- Creates the forum_posts table with flat two-level threading,
-- an RBAC-compatible permission stub (has_forum_permission), and
-- 4 RLS policies that will survive the future RBAC migration intact.
--
-- Dependencies:
--   - public.groups (FK target)
--   - public.users (FK target)
--   - public.get_current_user_profile_id() (from 20260211192415)
--   - public.update_updated_at_column() (from 20260211192415)
--   - public.group_memberships (membership check)
--   - public.user_group_roles + public.group_roles (role check)

-- ============================================================
-- STEP 1: Create forum_posts table
-- ============================================================

CREATE TABLE public.forum_posts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_user_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  parent_post_id  UUID        REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  is_deleted      BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.forum_posts IS
'Group forum posts and replies. Supports flat two-level threading (top-level posts + direct replies only). Soft-delete via is_deleted.';

COMMENT ON COLUMN public.forum_posts.group_id IS
'The group this post belongs to. Deleting a group cascades to all its forum posts.';

COMMENT ON COLUMN public.forum_posts.author_user_id IS
'Who wrote the post. RESTRICT prevents hard-deleting a user who has posts (soft-delete via is_active is the user deletion pattern).';

COMMENT ON COLUMN public.forum_posts.parent_post_id IS
'NULL = top-level post. Non-null = direct reply to a top-level post. enforce_flat_threading trigger prevents nesting beyond one level.';

COMMENT ON COLUMN public.forum_posts.content IS
'Post body text. No DB-level length limit; enforce max (e.g. 10,000 chars) in the UI.';

COMMENT ON COLUMN public.forum_posts.is_deleted IS
'Soft-delete flag for moderation. Deleted posts display as "[This post has been removed by a moderator]".';

-- ============================================================
-- STEP 2: Add chk_content_not_empty CHECK constraint
-- ============================================================

ALTER TABLE public.forum_posts
  ADD CONSTRAINT chk_content_not_empty
  CHECK (length(trim(content)) > 0);

-- ============================================================
-- STEP 3: Create enforce_flat_threading() trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_flat_threading()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.parent_post_id IS NOT NULL THEN
    -- Parent must be a top-level post (no parent itself)
    IF EXISTS (
      SELECT 1 FROM public.forum_posts
      WHERE id = NEW.parent_post_id AND parent_post_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Replies to replies are not allowed. You can only reply to top-level posts.';
    END IF;

    -- Reply must belong to same group as parent
    IF NOT EXISTS (
      SELECT 1 FROM public.forum_posts
      WHERE id = NEW.parent_post_id AND group_id = NEW.group_id
    ) THEN
      RAISE EXCEPTION 'Reply must belong to the same group as the parent post.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_flat_threading() IS
'Trigger function: enforces flat two-level threading on forum_posts.
Prevents replies to replies and cross-group parent references.
SET search_path = '''' prevents search_path injection.';

-- ============================================================
-- STEP 4: Create trg_enforce_flat_threading trigger
-- ============================================================

CREATE TRIGGER trg_enforce_flat_threading
  BEFORE INSERT ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_flat_threading();

-- ============================================================
-- STEP 5: Create update_forum_posts_updated_at trigger
--         (reuses existing public.update_updated_at_column())
-- ============================================================

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- STEP 6: Create indexes
-- ============================================================

-- Main listing: all posts in a group's forum, newest first
CREATE INDEX idx_forum_posts_group_created
  ON public.forum_posts(group_id, created_at DESC);

-- Fetch replies for a given top-level post (partial: only reply rows)
CREATE INDEX idx_forum_posts_parent
  ON public.forum_posts(parent_post_id, created_at ASC)
  WHERE parent_post_id IS NOT NULL;

-- Author lookups (e.g. "posts by this user")
CREATE INDEX idx_forum_posts_author
  ON public.forum_posts(author_user_id);

-- Optimized: non-deleted top-level posts for a group (most common query)
CREATE INDEX idx_forum_posts_group_toplevel
  ON public.forum_posts(group_id, created_at DESC)
  WHERE parent_post_id IS NULL AND is_deleted = false;

-- ============================================================
-- STEP 7: Create has_forum_permission() RBAC-compatible stub
-- ============================================================
-- SECURITY DEFINER: bypasses RLS on group_memberships and
--   user_group_roles so the function can read them freely.
-- STABLE: result is cached within a single query execution.
-- SET search_path = '': prevents search_path injection.
-- Signature matches future has_permission(group_id, permission_name)
--   so RLS policies will need zero changes when RBAC ships.

CREATE OR REPLACE FUNCTION public.has_forum_permission(
  p_group_id       UUID,
  p_permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_user_id   UUID;
  v_role_names TEXT[];
BEGIN
  -- Resolve current user's profile ID
  v_user_id := public.get_current_user_profile_id();
  IF v_user_id IS NULL THEN RETURN FALSE; END IF;

  -- Must be an active group member
  IF NOT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = p_group_id
      AND user_id  = v_user_id
      AND status   = 'active'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Collect all role names this user holds in the group
  SELECT array_agg(gr.name)
  INTO v_role_names
  FROM public.user_group_roles ugr
  JOIN public.group_roles gr ON ugr.group_role_id = gr.id
  WHERE ugr.user_id  = v_user_id
    AND ugr.group_id = p_group_id;

  -- Map permission names to role sets (mirrors D18a permission grid)
  CASE p_permission_name
    WHEN 'view_forum' THEN
      -- All active members can view (any role, or even no role assigned yet)
      RETURN TRUE;
    WHEN 'post_forum_messages' THEN
      -- Group Leader, Travel Guide, Member can post
      RETURN v_role_names && ARRAY['Group Leader', 'Travel Guide', 'Member'];
    WHEN 'reply_to_messages' THEN
      -- Group Leader, Travel Guide, Member can reply
      RETURN v_role_names && ARRAY['Group Leader', 'Travel Guide', 'Member'];
    WHEN 'moderate_forum' THEN
      -- Only Group Leader can moderate
      RETURN v_role_names && ARRAY['Group Leader'];
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.has_forum_permission(UUID, TEXT) IS
'RBAC-compatible permission stub for forum access control.
Checks group membership and role names (current phase). When the full RBAC
system ships, only this function body needs updating — all 4 RLS policies
that reference it remain unchanged.
Permissions: view_forum, post_forum_messages, reply_to_messages, moderate_forum.
SECURITY DEFINER + SET search_path = '''' prevents search_path injection.';

GRANT EXECUTE ON FUNCTION public.has_forum_permission(UUID, TEXT) TO authenticated;

-- ============================================================
-- STEP 8: Enable RLS and create 4 policies
-- ============================================================

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

-- SELECT: Any group member with view_forum permission can read posts
CREATE POLICY "forum_posts_select_permission"
  ON public.forum_posts
  FOR SELECT
  TO authenticated
  USING (public.has_forum_permission(group_id, 'view_forum'));

COMMENT ON POLICY "forum_posts_select_permission" ON public.forum_posts IS
'Members with view_forum permission (all active members) can read forum posts.';

-- INSERT: Author must be the current user AND have post/reply permission
--   Top-level posts  require post_forum_messages
--   Replies          require reply_to_messages
CREATE POLICY "forum_posts_insert_permission"
  ON public.forum_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_user_id = public.get_current_user_profile_id()
    AND (
      (parent_post_id IS NULL     AND public.has_forum_permission(group_id, 'post_forum_messages'))
      OR
      (parent_post_id IS NOT NULL AND public.has_forum_permission(group_id, 'reply_to_messages'))
    )
  );

COMMENT ON POLICY "forum_posts_insert_permission" ON public.forum_posts IS
'Users can create posts/replies they author, within their permission level.
Top-level posts require post_forum_messages; replies require reply_to_messages.';

-- UPDATE (own): Authors can edit their own non-deleted posts
CREATE POLICY "forum_posts_update_own"
  ON public.forum_posts
  FOR UPDATE
  TO authenticated
  USING (
    author_user_id = public.get_current_user_profile_id()
    AND is_deleted = false
  )
  WITH CHECK (
    author_user_id = public.get_current_user_profile_id()
    AND is_deleted = false
  );

COMMENT ON POLICY "forum_posts_update_own" ON public.forum_posts IS
'Authors can edit the content of their own posts as long as the post has not been deleted.';

-- UPDATE (moderate): Group Leaders can soft-delete any post (set is_deleted = true)
CREATE POLICY "forum_posts_moderate_permission"
  ON public.forum_posts
  FOR UPDATE
  TO authenticated
  USING (public.has_forum_permission(group_id, 'moderate_forum'))
  WITH CHECK (public.has_forum_permission(group_id, 'moderate_forum'));

COMMENT ON POLICY "forum_posts_moderate_permission" ON public.forum_posts IS
'Moderators (Group Leader) can update any post, enabling soft-deletion (is_deleted = true).';

-- ============================================================
-- STEP 9: Verification block
-- ============================================================

DO $$
DECLARE
  v_table_exists   BOOLEAN;
  v_rls_enabled    BOOLEAN;
  v_policy_count   INTEGER;
  v_index_count    INTEGER;
  v_func_exists    BOOLEAN;
  v_trigger_count  INTEGER;
BEGIN
  -- 9a. Table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'forum_posts'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'FAIL: forum_posts table does not exist';
  END IF;
  RAISE NOTICE 'OK: forum_posts table exists';

  -- 9b. RLS enabled
  SELECT relrowsecurity
  INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'forum_posts' AND relnamespace = 'public'::regnamespace;

  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION 'FAIL: RLS is not enabled on forum_posts';
  END IF;
  RAISE NOTICE 'OK: RLS enabled on forum_posts';

  -- 9c. Exactly 4 RLS policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'forum_posts';

  IF v_policy_count <> 4 THEN
    RAISE EXCEPTION 'FAIL: Expected 4 RLS policies, found %', v_policy_count;
  END IF;
  RAISE NOTICE 'OK: 4 RLS policies on forum_posts';

  -- 9d. Exactly 4 indexes
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'forum_posts'
    AND indexname LIKE 'idx_forum_posts_%';

  IF v_index_count <> 4 THEN
    RAISE EXCEPTION 'FAIL: Expected 4 indexes, found %', v_index_count;
  END IF;
  RAISE NOTICE 'OK: 4 indexes on forum_posts';

  -- 9e. has_forum_permission function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname = 'has_forum_permission'
  ) INTO v_func_exists;

  IF NOT v_func_exists THEN
    RAISE EXCEPTION 'FAIL: has_forum_permission function does not exist';
  END IF;
  RAISE NOTICE 'OK: has_forum_permission function exists';

  -- 9f. enforce_flat_threading function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname = 'enforce_flat_threading'
  ) INTO v_func_exists;

  IF NOT v_func_exists THEN
    RAISE EXCEPTION 'FAIL: enforce_flat_threading function does not exist';
  END IF;
  RAISE NOTICE 'OK: enforce_flat_threading function exists';

  -- 9g. Both triggers present (trg_enforce_flat_threading + update_forum_posts_updated_at)
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'forum_posts'
    AND c.relnamespace = 'public'::regnamespace
    AND t.tgname IN ('trg_enforce_flat_threading', 'update_forum_posts_updated_at');

  IF v_trigger_count <> 2 THEN
    RAISE EXCEPTION 'FAIL: Expected 2 triggers, found % on forum_posts', v_trigger_count;
  END IF;
  RAISE NOTICE 'OK: 2 triggers on forum_posts';

  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Migration 20260214161716_add_group_forum_posts: SUCCESS';
  RAISE NOTICE '=====================================================';
END $$;
