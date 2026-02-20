-- Performance Tier 1A: Add missing indexes
-- Speeds up has_permission(), is_active_group_member(), and admin panel queries
-- See docs/features/active/performance-optimization.md for full analysis

-- 1. Speed up has_permission() Tier 1 lookup and admin panel group filters
--    has_permission() filters groups WHERE group_type = 'system' on every call
CREATE INDEX idx_groups_group_type ON groups(group_type);

-- 2. Speed up has_permission() and is_active_group_member() lookups
--    Composite index covers the common (user_id, group_id, status) filter pattern
--    Replaces bitmap merge of idx_memberships_user + idx_memberships_group + status filter
CREATE INDEX idx_memberships_user_group_status
  ON group_memberships(user_id, group_id, status);

-- 3. Speed up has_permission() JOIN chain (covering index for role resolution)
--    The JOIN from user_group_roles to group_role_permissions needs group_role_id
--    This covering index avoids a heap lookup to get the third column
CREATE INDEX idx_ugr_user_group_role
  ON user_group_roles(user_id, group_id, group_role_id);
