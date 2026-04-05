# Group Forum System Design

**Status:** ✅ Implemented (v0.2.14)
**Author:** Architect Agent
**Date:** February 14, 2026
**Last Updated:** February 28, 2026 (D15 column renames applied)
**Phase:** 1.5-A (Communication - Forums)
**Dependencies:** Current schema (19 tables), existing RLS helper functions

---

## Context

Phase 1.5-A adds group forums alongside the notification system. Forums enable group members to discuss topics within their group. The design uses flat two-level threading (posts + direct replies only) and an RBAC-compatible permission stub for forward compatibility.

---

## Table: forum_posts

```sql
CREATE TABLE public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
  parent_post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Column Rationale

| Column | Type | Why |
|--------|------|-----|
| `id` | UUID PK | Standard pattern -- `gen_random_uuid()` |
| `group_id` | UUID NOT NULL FK | Every post belongs to exactly one group's forum. CASCADE on group delete removes all posts. |
| `author_group_id` | UUID NOT NULL FK groups | Who wrote it (personal group ID). RESTRICT prevents deleting a group that has posts. On hard-delete, content is reassigned to [Deleted User] sentinel group. |
| `parent_post_id` | UUID nullable FK | NULL = top-level post. Non-null = reply to a top-level post. CASCADE ensures replies are removed if parent is hard-deleted. |
| `content` | TEXT NOT NULL | Post body. No length limit at DB level -- enforce in UI (e.g., 10,000 characters). |
| `is_deleted` | BOOLEAN default false | Soft delete for moderation. Deleted posts show "[deleted]" placeholder. |
| `created_at` | TIMESTAMPTZ | When the post was created. |
| `updated_at` | TIMESTAMPTZ | When the post was last edited. Maintained by trigger. |

---

## Constraints

### Flat Two-Level Threading (Trigger)

```sql
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

CREATE TRIGGER trg_enforce_flat_threading
  BEFORE INSERT ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_flat_threading();
```

### Content Not Empty

```sql
ALTER TABLE public.forum_posts
ADD CONSTRAINT chk_content_not_empty
CHECK (length(trim(content)) > 0);
```

### Updated_at Trigger

```sql
CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Indexes

```sql
-- Main query: list all posts in a group's forum, newest first
CREATE INDEX idx_forum_posts_group_created
  ON public.forum_posts(group_id, created_at DESC);

-- Fetch replies for a given top-level post
CREATE INDEX idx_forum_posts_parent
  ON public.forum_posts(parent_post_id, created_at ASC)
  WHERE parent_post_id IS NOT NULL;

-- Author lookups
CREATE INDEX idx_forum_posts_author
  ON public.forum_posts(author_group_id);

-- Optimized: non-deleted top-level posts for a group (most common query)
CREATE INDEX idx_forum_posts_group_toplevel
  ON public.forum_posts(group_id, created_at DESC)
  WHERE parent_post_id IS NULL AND is_deleted = false;
```

---

## RLS Strategy

**Decision:** Option B — RBAC-compatible `has_forum_permission()` stub. Checks role names internally but has a signature matching the future `has_permission()`. When full RBAC ships, swap internals — RLS policies stay unchanged.

> **Note:** `has_forum_permission()` is a **transitional stub**. It will be replaced by the general `has_permission(acting_group_id, context_group_id, permission_name)` function from the [Dynamic Permissions System](./AR-dynamic-permissions-system.md) once that migration is applied. The RLS policies below will need no changes — only the function body is swapped.

### RLS Policies

```sql
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;

-- SELECT: Users with view_forum permission
CREATE POLICY "forum_posts_select_permission"
ON public.forum_posts FOR SELECT TO authenticated
USING (public.has_forum_permission(group_id, 'view_forum'));

-- INSERT: Users with post or reply permission (D15: author_group_id)
CREATE POLICY "forum_posts_insert_permission"
ON public.forum_posts FOR INSERT TO authenticated
WITH CHECK (
  author_group_id = public.get_current_personal_group_id()
  AND (
    (parent_post_id IS NULL AND public.has_forum_permission(group_id, 'post_forum_messages'))
    OR
    (parent_post_id IS NOT NULL AND public.has_forum_permission(group_id, 'reply_to_messages'))
  )
);

-- UPDATE: Authors can edit own non-deleted posts (D15: author_group_id)
CREATE POLICY "forum_posts_update_own"
ON public.forum_posts FOR UPDATE TO authenticated
USING (
  author_group_id = public.get_current_personal_group_id() AND is_deleted = false
)
WITH CHECK (
  author_group_id = public.get_current_personal_group_id() AND is_deleted = false
);

-- UPDATE: Moderators can soft-delete any post
CREATE POLICY "forum_posts_moderate_permission"
ON public.forum_posts FOR UPDATE TO authenticated
USING (public.has_forum_permission(group_id, 'moderate_forum'))
WITH CHECK (public.has_forum_permission(group_id, 'moderate_forum'));
```

---

## Permission Seeding

The 4 `communication.forum.*` permissions **already exist** in the `permissions` table (seeded in initial migration):

| Permission Name | Description | Category |
|----------------|-------------|----------|
| `view_forum` | View forum content | communication |
| `post_forum_messages` | Post messages in forums | communication |
| `reply_to_messages` | Reply to messages | communication |
| `moderate_forum` | Moderate forum | communication |

**No new permission INSERTs needed.**

### Role-Permission Mapping (D18a)

| Permission | Steward | Guide | Member | Observer |
|---|---|---|---|---|
| `view_forum` | yes | yes | yes | yes |
| `post_forum_messages` | yes | yes | yes | no |
| `reply_to_messages` | yes | yes | yes | no |
| `moderate_forum` | yes | no | no | no |

---

## Former Member Display (Sprint 2, v0.2.34)

When a member leaves a group via the `leave_group()` RPC, their `author_group_id` on forum posts is **never mutated**. Display name resolution is a query-time concern:

- `author_group_id` references an active member of the group -> display the author's personal group `name`
- `author_group_id` is no longer an active member -> display **"Former Member"**
- `author_group_id` points to the `[Deleted User]` sentinel group -> display **"[Deleted User]"**

**Implementation note:** The ForumSection component should check `group_memberships` for the `author_group_id` in the current group. If no active membership exists, substitute the display name. This is a display-layer concern — no schema or RLS changes needed.

**Rejoin behavior:** If a former member's personal group rejoins the same engagement group, their display name is automatically restored — no additional work required.

---

## Soft Delete Strategy

- `is_deleted` defaults to `false`
- Moderation sets `is_deleted = true` (UPDATE, not DELETE)
- No hard DELETE policies -- posts are never physically removed
- Content retained for audit/appeal

### Display Behavior

- **Deleted posts:** Show "[This post has been removed by a moderator]" with author hidden
- **Replies to deleted posts:** Still visible (preserves thread continuity)
- **Moderator view:** See original content with "[deleted]" badge

---

## Migration Plan

Single migration file: `TIMESTAMP_add_group_forum_posts.sql`

1. Create `forum_posts` table with all columns and FKs
2. Add `chk_content_not_empty` constraint
3. Create `enforce_flat_threading()` trigger function
4. Create `trg_enforce_flat_threading` trigger
5. Create `update_forum_posts_updated_at` trigger (reuses existing function)
6. Create all 4 indexes
7. Create `has_forum_permission()` function
8. Enable RLS + create 4 policies
9. Verification block

---

## Data Flow (Reference for Integration Agent)

```
Forum listing:
  DB (forum_posts WHERE group_id = X AND parent_post_id IS NULL)
    -> RLS: has_forum_permission(group_id, 'view_forum')
    -> Supabase client .from('forum_posts').select(...)
    -> React state (posts array)
    -> ForumThreadList component

Creating a post:
  UI form submit
    -> Supabase .from('forum_posts').insert({ group_id, content, author_group_id })
    -> RLS: has_forum_permission(group_id, 'post_forum_messages')
    -> Return new post -> Append to state

Creating a reply:
  UI reply form submit
    -> Supabase .from('forum_posts').insert({ group_id, content, author_group_id, parent_post_id })
    -> RLS: has_forum_permission(group_id, 'reply_to_messages')
    -> Trigger: enforce_flat_threading (validates parent is top-level)
    -> Return new reply -> Append to replies state

Moderating (soft delete):
  Moderator clicks delete
    -> Supabase .from('forum_posts').update({ is_deleted: true }).eq('id', postId)
    -> RLS: has_forum_permission(group_id, 'moderate_forum')
    -> UI shows "[deleted]" placeholder
```

---

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| RLS performance on large forums | Low | Medium | Function is `STABLE` (cached within query). Add pagination. |
| Flat-threading trigger latency | Low | Low | Single SELECT on PK index |
| RBAC renames role names | Certain | Medium | One function to update, not scattered policies |
| Observer role doesn't exist yet | Certain | Low | Stub works correctly -- any role gets view |

---

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-02-14 | Initial design | Architect Agent |
| 2026-02-28 | Updated D15 column renames: `author_user_id` → `author_group_id`, `user_id` → `member_group_id`, role names Steward/Guide | Sprint 0 review |
| 2026-02-28 | Added "Former Member" display section for leave-group context (Sprint 2, v0.2.34) | Sprint 2 |
