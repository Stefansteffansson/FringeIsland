-- RBAC Sub-Sprint 1, Migration 1: Schema + Permission Catalog
--
-- Changes:
-- 1. Add group_type column to groups table (system/personal/engagement)
-- 2. Update permission catalog (D22: rename 1, remove 1, add 2)
-- 3. Rename role templates (Group Leader → Steward, Travel Guide → Guide)
-- 4. Remove Platform Admin role template
-- 5. Seed role_template_permissions (58 rows per D18a grid)
--
-- Addresses: B-RBAC-001, B-RBAC-002, B-RBAC-004, B-RBAC-007 (partial)

-- ============================================================
-- 1. Add group_type column to groups
-- ============================================================

ALTER TABLE groups ADD COLUMN group_type TEXT NOT NULL DEFAULT 'engagement';

ALTER TABLE groups ADD CONSTRAINT groups_group_type_check
  CHECK (group_type IN ('system', 'personal', 'engagement'));

-- All existing groups are user-created engagement groups
-- (default 'engagement' handles this automatically)

-- ============================================================
-- 2. Permission catalog changes (D22)
-- ============================================================

-- Rename track_group_progress → view_group_progress
UPDATE permissions
SET name = 'view_group_progress',
    description = 'View group-wide progress overview'
WHERE name = 'track_group_progress';

-- Remove view_member_feedback (D18: feedback is private)
DELETE FROM permissions WHERE name = 'view_member_feedback';

-- Add browse_journey_catalog
INSERT INTO permissions (name, description, category)
VALUES ('browse_journey_catalog', 'Browse the journey catalog', 'journey_management');

-- Add browse_public_groups
INSERT INTO permissions (name, description, category)
VALUES ('browse_public_groups', 'Discover and browse public groups', 'group_management');

-- ============================================================
-- 3. Rename role templates (D17, D22)
-- ============================================================

-- Group Leader → Steward
UPDATE role_templates
SET name = 'Steward Role Template',
    description = 'Long-term group care — membership, settings, structure, oversight'
WHERE name = 'Group Leader Role Template';

-- Travel Guide → Guide
UPDATE role_templates
SET name = 'Guide Role Template',
    description = 'Journey facilitation — content expertise, progress tracking, feedback'
WHERE name = 'Travel Guide Role Template';

-- Remove Platform Admin template (becomes Deusex group role)
DELETE FROM role_templates WHERE name = 'Platform Admin Role Template';

-- ============================================================
-- 4. Seed role_template_permissions (D18a grid)
-- ============================================================

-- Clear any existing mappings (table should be empty, but be safe)
DELETE FROM role_template_permissions;

-- Steward Role Template: 24 permissions
INSERT INTO role_template_permissions (role_template_id, permission_id)
SELECT rt.id, p.id
FROM role_templates rt
CROSS JOIN permissions p
WHERE rt.name = 'Steward Role Template'
  AND p.name IN (
    -- Group Management (12)
    'edit_group_settings',
    'delete_group',
    'set_group_visibility',
    'control_member_list_visibility',
    'invite_members',
    'remove_members',
    'activate_members',
    'pause_members',
    'assign_roles',
    'remove_roles',
    'view_member_list',
    'view_member_profiles',
    -- Journey group-scoped (3)
    'enroll_group_in_journey',
    'unenroll_from_journey',
    'freeze_journey',
    -- Journey participation (2)
    'view_others_progress',
    'view_group_progress',
    -- Communication (5)
    'view_forum',
    'post_forum_messages',
    'reply_to_messages',
    'moderate_forum',
    'send_direct_messages',
    -- Feedback (2)
    'provide_feedback_to_members',
    'receive_feedback'
  );

-- Guide Role Template: 15 permissions
INSERT INTO role_template_permissions (role_template_id, permission_id)
SELECT rt.id, p.id
FROM role_templates rt
CROSS JOIN permissions p
WHERE rt.name = 'Guide Role Template'
  AND p.name IN (
    -- Group Management (2)
    'view_member_list',
    'view_member_profiles',
    -- Journey group-scoped (1)
    'freeze_journey',
    -- Journey participation (5)
    'view_journey_content',
    'complete_journey_activities',
    'view_own_progress',
    'view_others_progress',
    'view_group_progress',
    -- Communication (4)
    'view_forum',
    'post_forum_messages',
    'reply_to_messages',
    'send_direct_messages',
    -- Feedback (2)
    'provide_feedback_to_members',
    'receive_feedback'
  );

-- Member Role Template: 12 permissions
INSERT INTO role_template_permissions (role_template_id, permission_id)
SELECT rt.id, p.id
FROM role_templates rt
CROSS JOIN permissions p
WHERE rt.name = 'Member Role Template'
  AND p.name IN (
    -- Group Management (2)
    'view_member_list',
    'view_member_profiles',
    -- Journey participation (4)
    'view_journey_content',
    'complete_journey_activities',
    'view_own_progress',
    'view_group_progress',
    -- Communication (4)
    'view_forum',
    'post_forum_messages',
    'reply_to_messages',
    'send_direct_messages',
    -- Feedback (2)
    'provide_feedback_to_members',
    'receive_feedback'
  );

-- Observer Role Template: 7 permissions
INSERT INTO role_template_permissions (role_template_id, permission_id)
SELECT rt.id, p.id
FROM role_templates rt
CROSS JOIN permissions p
WHERE rt.name = 'Observer Role Template'
  AND p.name IN (
    -- Group Management (2)
    'view_member_list',
    'view_member_profiles',
    -- Journey participation (3)
    'view_journey_content',
    'view_others_progress',
    'view_group_progress',
    -- Communication (2)
    'view_forum',
    'send_direct_messages'
  );
