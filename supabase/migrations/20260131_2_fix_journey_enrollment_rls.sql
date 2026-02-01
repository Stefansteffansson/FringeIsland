-- ============================================
-- Fix Journey Enrollment RLS - Remove Infinite Recursion
-- Migration: 20260131_fix_journey_enrollment_rls.sql
-- Purpose: Fix infinite recursion in enrollment policy
-- ============================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can enroll themselves" ON journey_enrollments;

-- Recreate without the nested EXISTS check
-- The dual enrollment check is handled in application code
CREATE POLICY "Users can enroll themselves"
ON journey_enrollments FOR INSERT
WITH CHECK (
  -- Must be enrolling themselves
  user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  AND group_id IS NULL
  AND enrolled_by_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
  -- Note: Dual enrollment prevention is handled in application layer
  -- to avoid infinite recursion in RLS policies
);
