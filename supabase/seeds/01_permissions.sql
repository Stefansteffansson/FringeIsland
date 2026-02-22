-- ==========================================================================
-- Seed 01: Permissions Catalog (39 permissions across 6 categories)
-- ==========================================================================
-- Must run FIRST — other seeds reference permissions by name.
-- ==========================================================================

INSERT INTO public.permissions (name, description, category) VALUES
  -- Group Management (15)
  ('view_member_list', 'View the list of group members', 'group_management'),
  ('view_member_profiles', 'View detailed profiles of group members', 'group_management'),
  ('invite_members', 'Invite new members to the group', 'group_management'),
  ('activate_members', 'Re-activate paused members', 'group_management'),
  ('pause_members', 'Temporarily pause member access', 'group_management'),
  ('remove_members', 'Remove members from the group', 'group_management'),
  ('assign_roles', 'Assign roles to group members', 'group_management'),
  ('remove_roles', 'Remove roles from group members', 'group_management'),
  ('manage_roles', 'Create, edit, and delete custom roles and configure their permissions', 'group_management'),
  ('edit_group_settings', 'Edit group name, description, and settings', 'group_management'),
  ('set_group_visibility', 'Change group visibility (public/private)', 'group_management'),
  ('control_member_list_visibility', 'Toggle member list visibility for non-members', 'group_management'),
  ('delete_group', 'Permanently delete the group', 'group_management'),
  ('browse_public_groups', 'Browse and view publicly listed groups', 'group_management'),
  ('create_group', 'Create new engagement groups', 'group_management'),

  -- Journey Management (10)
  ('enroll_self_in_journey', 'Enroll yourself in a journey', 'journey_management'),
  ('enroll_group_in_journey', 'Enroll the group in a journey', 'journey_management'),
  ('unenroll_from_journey', 'Unenroll from a journey', 'journey_management'),
  ('freeze_journey', 'Freeze journey progress for the group', 'journey_management'),
  ('create_journey', 'Create new journeys', 'journey_management'),
  ('edit_journey', 'Edit journey content and settings', 'journey_management'),
  ('publish_journey', 'Publish a draft journey', 'journey_management'),
  ('unpublish_journey', 'Unpublish a published journey', 'journey_management'),
  ('delete_journey', 'Delete a journey', 'journey_management'),
  ('browse_journey_catalog', 'Browse the journey catalog', 'journey_management'),

  -- Journey Participation (6)
  ('view_journey_content', 'View journey steps and materials', 'journey_participation'),
  ('complete_journey_activities', 'Complete journey activities and assessments', 'journey_participation'),
  ('view_own_progress', 'View your own journey progress', 'journey_participation'),
  ('view_others_progress', 'View other members'' journey progress', 'journey_participation'),
  ('view_group_progress', 'View aggregated group progress', 'journey_participation'),
  ('track_group_progress', 'Track and manage group journey progress', 'journey_participation'),

  -- Communication (5)
  ('view_forum', 'View group forum posts', 'communication'),
  ('post_forum_messages', 'Create new forum posts', 'communication'),
  ('reply_to_messages', 'Reply to existing forum posts', 'communication'),
  ('moderate_forum', 'Moderate forum posts (edit/delete)', 'communication'),
  ('send_direct_messages', 'Send direct messages to other users', 'communication'),

  -- Feedback (3)
  ('provide_feedback_to_members', 'Give feedback to group members', 'feedback'),
  ('receive_feedback', 'Receive feedback from other members', 'feedback'),
  ('view_member_feedback', 'View feedback given to/by members', 'feedback'),

  -- Platform Admin (5)
  ('manage_platform_settings', 'Manage platform-wide settings', 'platform_admin'),
  ('manage_all_groups', 'Manage all groups (platform admin)', 'platform_admin'),
  ('manage_role_templates', 'Manage role templates', 'platform_admin'),
  ('manage_group_templates', 'Manage group templates', 'platform_admin'),
  ('view_platform_analytics', 'View platform-wide analytics', 'platform_admin');
