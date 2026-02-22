-- ==========================================================================
-- Seed 02: Role Templates + Role Template Permissions
-- ==========================================================================
-- Depends on: 01_permissions.sql
-- Four engagement group templates: Steward, Guide, Member, Observer
-- ==========================================================================

-- Role Templates
INSERT INTO public.role_templates (name, description, is_system) VALUES
  ('Steward Role Template', 'Full group management — the group owner/admin role', true),
  ('Guide Role Template', 'Journey facilitation and member support', true),
  ('Member Role Template', 'Active participation in group activities', true),
  ('Observer Role Template', 'View-only supportive role', true);

-- ==========================================================================
-- Role Template Permissions (D18a permission grid)
-- ==========================================================================

-- Steward: 25 permissions (full group management)
INSERT INTO public.role_template_permissions (role_template_id, permission_id)
SELECT rt.id, p.id
FROM public.role_templates rt, public.permissions p
WHERE rt.name = 'Steward Role Template'
  AND p.name IN (
    -- Group Management (all 15)
    'view_member_list', 'view_member_profiles', 'invite_members',
    'activate_members', 'pause_members', 'remove_members',
    'assign_roles', 'remove_roles', 'manage_roles',
    'edit_group_settings', 'set_group_visibility',
    'control_member_list_visibility', 'delete_group',
    'browse_public_groups', 'create_group',
    -- Journey Management (group-scoped)
    'enroll_group_in_journey', 'unenroll_from_journey', 'freeze_journey',
    -- Journey Participation
    'view_journey_content', 'complete_journey_activities',
    'view_own_progress', 'view_others_progress', 'view_group_progress',
    -- Communication
    'view_forum', 'post_forum_messages', 'reply_to_messages',
    'moderate_forum', 'send_direct_messages',
    -- Feedback
    'provide_feedback_to_members', 'receive_feedback', 'view_member_feedback'
  );

-- Guide: 15 permissions (journey facilitation + member support)
INSERT INTO public.role_template_permissions (role_template_id, permission_id)
SELECT rt.id, p.id
FROM public.role_templates rt, public.permissions p
WHERE rt.name = 'Guide Role Template'
  AND p.name IN (
    'view_member_list', 'view_member_profiles',
    'enroll_group_in_journey',
    'view_journey_content', 'complete_journey_activities',
    'view_own_progress', 'view_others_progress', 'view_group_progress',
    'view_forum', 'post_forum_messages', 'reply_to_messages',
    'send_direct_messages',
    'provide_feedback_to_members', 'receive_feedback', 'view_member_feedback'
  );

-- Member: 12 permissions (active participation)
INSERT INTO public.role_template_permissions (role_template_id, permission_id)
SELECT rt.id, p.id
FROM public.role_templates rt, public.permissions p
WHERE rt.name = 'Member Role Template'
  AND p.name IN (
    'view_member_list', 'view_member_profiles',
    'enroll_self_in_journey',
    'view_journey_content', 'complete_journey_activities',
    'view_own_progress',
    'view_forum', 'post_forum_messages', 'reply_to_messages',
    'send_direct_messages',
    'receive_feedback',
    'browse_journey_catalog'
  );

-- Observer: 7 permissions (view-only)
INSERT INTO public.role_template_permissions (role_template_id, permission_id)
SELECT rt.id, p.id
FROM public.role_templates rt, public.permissions p
WHERE rt.name = 'Observer Role Template'
  AND p.name IN (
    'view_member_list',
    'view_journey_content',
    'view_own_progress',
    'view_forum',
    'receive_feedback',
    'browse_journey_catalog',
    'browse_public_groups'
  );
