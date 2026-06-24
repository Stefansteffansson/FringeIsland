/**
 * Permission display constants for the UI.
 *
 * IMPORTANT — HARDCODED DISPLAY ORDER:
 * The order permissions appear in "View Permissions" and the PermissionPicker
 * is controlled by PERMISSION_DISPLAY_ORDER below. Permissions NOT listed in
 * this map will still appear — they fall to the end of their category, sorted
 * alphabetically. However, for the best UX, add new permissions to this map
 * whenever you add them to the database.
 *
 * When adding a new permission:
 *   1. Add the INSERT INTO permissions(...) in a migration
 *   2. Add the permission name + sort index here in the correct sub-group
 *   3. Sub-groups use ranges: 100s = first group, 200s = second, etc.
 *
 * @see supabase/migrations/ for the canonical permission definitions
 * @see docs/features/planned/dynamic-permissions-system.md for RBAC design
 */

// ── Category labels ───────────────────────────────────────────────
export const CATEGORY_LABELS: Record<string, string> = {
  group_management: 'Group Management',
  journey_management: 'Journey Management',
  journey_participation: 'Journey Participation',
  communication: 'Communication',
  feedback: 'Feedback',
  platform_admin: 'Platform Administration',
};

export const CATEGORY_ORDER = [
  'group_management',
  'journey_management',
  'journey_participation',
  'communication',
  'feedback',
  'platform_admin',
];

// ── Display order within each category ────────────────────────────
// Permissions are sorted by this index within their category.
// Sub-groups use 100-range spacing so new items can be inserted easily.
// Any permission NOT in this map gets sort index 9999 (appears at end,
// sorted alphabetically among other unmapped permissions).
export const PERMISSION_DISPLAY_ORDER: Record<string, number> = {
  // ── Group Management ──────────────────────────────────
  // View
  view_member_list:               100,
  view_member_profiles:           101,
  // Members
  invite_members:                 200,
  activate_members:               201,
  pause_members:                  202,
  remove_members:                 203,
  // Roles
  assign_roles:                   300,
  remove_roles:                   301,
  manage_roles:                   302,
  // Group settings
  edit_group_settings:            400,
  set_group_visibility:           401,
  control_member_list_visibility: 402,
  delete_group:                   403,
  // Other
  browse_public_groups:           500,
  create_group:                   501,

  // ── Journey Management ────────────────────────────────
  // Enrollment
  enroll_self_in_journey:         100,
  enroll_group_in_journey:        101,
  unenroll_from_journey:          102,
  freeze_journey:                 103,
  // Authoring
  create_journey:                 200,
  edit_journey:                   201,
  publish_journey:                202,
  unpublish_journey:              203,
  delete_journey:                 204,
  // Catalog
  browse_journey_catalog:         300,

  // ── Journey Participation ─────────────────────────────
  view_journey_content:           100,
  complete_journey_activities:    101,
  view_own_progress:              200,
  view_others_progress:           201,
  view_group_progress:            202,
  track_group_progress:           203,

  // ── Communication ─────────────────────────────────────
  view_forum:                     100,
  post_forum_messages:            101,
  reply_to_messages:              102,
  moderate_forum:                 103,
  send_direct_messages:           200,

  // ── Feedback ──────────────────────────────────────────
  provide_feedback_to_members:    100,
  receive_feedback:               101,
  view_member_feedback:           102,

  // ── Platform Administration ───────────────────────────
  manage_platform_settings:       100,
  manage_all_groups:              101,
  manage_role_templates:          102,
  manage_group_templates:         103,
  view_platform_analytics:        104,
};

/**
 * Sort permissions by display order within their category.
 * Unknown permissions fall to the end, sorted alphabetically.
 */
export function sortPermissionsByDisplayOrder<T extends { name: string }>(
  permissions: T[]
): T[] {
  return [...permissions].sort((a, b) => {
    const orderA = PERMISSION_DISPLAY_ORDER[a.name] ?? 9999;
    const orderB = PERMISSION_DISPLAY_ORDER[b.name] ?? 9999;
    if (orderA !== orderB) return orderA - orderB;
    // Same order index (both unmapped) — fall back to alphabetical
    return a.name.localeCompare(b.name);
  });
}
