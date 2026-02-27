-- Fix: Personal groups not visible to other authenticated users
--
-- Problem: The groups_select RLS policy has no condition allowing users to see
-- other users' personal groups. Personal groups are the single source of truth
-- for display names (name column) and avatars. When any surface (forum, DMs,
-- member list, invite modal) joins to groups via author_group_id or
-- personal_group_id, the join returns NULL for other users' personal groups,
-- causing "Unknown" to display instead of the user's nickname/display name.
--
-- Fix: Add `OR group_type = 'personal'` to groups_select. This is safe because:
--   1. Personal groups are identity containers (name + avatar only)
--   2. The users table SELECT policy already exposes all active users
--   3. No sensitive data lives in personal groups
--   4. This is equivalent to making usernames publicly visible (standard behavior)
--
-- Surfaces fixed:
--   - Forum posts & replies (ForumSection.tsx → ForumPost.tsx)
--   - Messages list (app/messages/page.tsx)
--   - Conversation page header (app/messages/[conversationId]/page.tsx)
--   - Group member list names (app/groups/[id]/page.tsx)
--   - Invite modal search results (InviteMemberModal.tsx)

DROP POLICY IF EXISTS "groups_select" ON public.groups;

CREATE POLICY "groups_select"
  ON public.groups FOR SELECT TO authenticated
  USING (
    group_type = 'personal'
    OR is_public = true
    OR public.is_active_group_member(id)
    OR public.is_invited_group_member(id)
    OR created_by_group_id = public.get_current_personal_group_id()
    OR public.is_platform_admin()
  );
