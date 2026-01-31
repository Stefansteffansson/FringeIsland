-- ============================================
-- Journey Enrollment RLS Policies
-- Migration: 20260131_journey_enrollment_rls.sql
-- Purpose: Enable Row Level Security for journey enrollments
-- ============================================

-- Enable RLS on journey_enrollments table
ALTER TABLE journey_enrollments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SELECT Policies
-- ============================================

-- Policy 1: Users can view their own individual enrollments
CREATE POLICY "Users can view own enrollments"
ON journey_enrollments FOR SELECT
USING (
  user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
);

-- Policy 2: Users can view enrollments for groups they belong to
CREATE POLICY "Users can view group enrollments"
ON journey_enrollments FOR SELECT
USING (
  group_id IN (
    SELECT gm.group_id
    FROM group_memberships gm
    WHERE gm.user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
    AND gm.status = 'active'
  )
);

-- ============================================
-- INSERT Policies
-- ============================================

-- Policy 3: Users can enroll themselves individually
CREATE POLICY "Users can enroll themselves"
ON journey_enrollments FOR INSERT
WITH CHECK (
  -- Must be enrolling themselves
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  AND group_id IS NULL
  AND enrolled_by_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  -- Additional check: User is not already enrolled via a group
  AND NOT EXISTS (
    SELECT 1 FROM journey_enrollments je2
    WHERE je2.journey_id = journey_enrollments.journey_id
    AND je2.group_id IN (
      SELECT gm.group_id
      FROM group_memberships gm
      WHERE gm.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND gm.status = 'active'
    )
  )
);

-- Policy 4: Group Leaders can enroll their groups
CREATE POLICY "Group leaders can enroll groups"
ON journey_enrollments FOR INSERT
WITH CHECK (
  -- Must be enrolling a group (not individual)
  group_id IS NOT NULL
  AND user_id IS NULL
  AND enrolled_by_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  -- Must be a Group Leader of the group being enrolled
  AND EXISTS (
    SELECT 1
    FROM user_group_roles ugr
    JOIN group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.group_id = journey_enrollments.group_id
    AND ugr.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND gr.name = 'Group Leader'
  )
);

-- ============================================
-- UPDATE Policies
-- ============================================

-- Policy 5: Users can update their own enrollment status (pause/resume)
CREATE POLICY "Users can update own enrollment status"
ON journey_enrollments FOR UPDATE
USING (
  user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  )
);

-- Policy 6: Group Leaders can update group enrollment status
CREATE POLICY "Group leaders can update group enrollment status"
ON journey_enrollments FOR UPDATE
USING (
  group_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM user_group_roles ugr
    JOIN group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.group_id = journey_enrollments.group_id
    AND ugr.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND gr.name = 'Group Leader'
  )
)
WITH CHECK (
  group_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM user_group_roles ugr
    JOIN group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.group_id = journey_enrollments.group_id
    AND ugr.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
    AND gr.name = 'Group Leader'
  )
);

-- ============================================
-- DELETE Policies
-- ============================================
-- Note: No DELETE policies - use status changes instead
-- Status should be changed to 'paused' or 'frozen' rather than deleting

-- ============================================
-- Migration Complete
-- ============================================
-- This migration enables RLS on journey_enrollments and allows:
-- 1. Users to view their own enrollments and group enrollments
-- 2. Users to enroll themselves (if not already enrolled via group)
-- 3. Group Leaders to enroll their groups
-- 4. Users and Group Leaders to update enrollment status
