-- Migration: Fix Membership Status Constraint
-- Date: 2026-02-08
-- Issue: CHECK constraint doesn't allow 'removed' and 'paused' statuses
--
-- Current constraint allows: 'active', 'invited', 'frozen'
-- Should allow: 'active', 'invited', 'paused', 'removed'
--
-- This mismatch was causing tests to fail and preventing proper membership management

-- ============================================
-- UPDATE CHECK CONSTRAINT
-- ============================================

-- Drop the existing constraint
ALTER TABLE group_memberships
DROP CONSTRAINT IF EXISTS group_memberships_status_check;

-- Create new constraint with all documented statuses
ALTER TABLE group_memberships
ADD CONSTRAINT group_memberships_status_check
CHECK (status IN ('active', 'invited', 'paused', 'removed'));

-- ============================================
-- VERIFY THE CONSTRAINT
-- ============================================

DO $$
DECLARE
  constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint
  WHERE conname = 'group_memberships_status_check';

  IF constraint_def LIKE '%removed%' AND constraint_def LIKE '%paused%' THEN
    RAISE NOTICE 'SUCCESS: Constraint now allows all documented statuses';
    RAISE NOTICE 'Allowed statuses: active, invited, paused, removed';
  ELSE
    RAISE EXCEPTION 'Constraint was not updated correctly: %', constraint_def;
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON CONSTRAINT group_memberships_status_check ON group_memberships IS
'Enforces valid membership statuses:
- active: Member has accepted and is currently active
- invited: Member has been invited but has not accepted yet
- paused: Member access is temporarily suspended
- removed: Member has been removed from the group';

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- This fixes a mismatch between documentation (CLAUDE.md) and the actual
-- database constraint. Tests were failing because they tried to set
-- status='removed' which was not allowed by the CHECK constraint.
--
-- The old 'frozen' status has been replaced with 'paused' and 'removed'
-- for clearer semantics.
