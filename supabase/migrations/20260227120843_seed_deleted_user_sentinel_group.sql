-- ============================================
-- Migration: Seed [Deleted User] Sentinel System Group
-- Date: 2026-02-27
-- Description: Creates the [Deleted User] system group that the
--   admin_hard_delete_user RPC references for reassigning content
--   (forum posts, journeys, groups) from hard-deleted users.
--   Without this group, the COALESCE fallback assigns content to
--   the admin's personal group — which is incorrect.
-- ============================================

-- Only insert if it doesn't already exist (idempotent)
INSERT INTO public.groups (name, description, group_type, is_public, show_member_list)
SELECT
  '[Deleted User]',
  'System sentinel group. Content from hard-deleted users is reassigned here to preserve forum posts, journeys, and group ownership records.',
  'system',
  false,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM public.groups
  WHERE name = '[Deleted User]' AND group_type = 'system'
);
