-- ============================================
-- Migration: Fix Journey Enrollment RLS + Add Missing Columns
-- Date: 2026-02-10
-- Issues:
--   1. Enrollment SELECT/INSERT/UPDATE policies use raw subqueries that
--      hit nested RLS on the users table (same pattern as groups fix)
--   2. last_accessed_at column missing from journey_enrollments table
--   3. INSERT...RETURNING blocked by SELECT policy (same PostgREST pattern)
-- ============================================

-- ============================================
-- STEP 1: Add missing last_accessed_at column
-- ============================================

ALTER TABLE journey_enrollments
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;

COMMENT ON COLUMN journey_enrollments.last_accessed_at IS
'Timestamp of the most recent interaction with this enrollment (step navigation, progress save, etc.)';

-- ============================================
-- STEP 2: Drop old enrollment RLS policies
-- ============================================

-- SELECT policies
DROP POLICY IF EXISTS "Users can view own enrollments" ON journey_enrollments;
DROP POLICY IF EXISTS "Users can view group enrollments" ON journey_enrollments;

-- INSERT policies
DROP POLICY IF EXISTS "Users can enroll themselves" ON journey_enrollments;
DROP POLICY IF EXISTS "Group leaders can enroll groups" ON journey_enrollments;

-- UPDATE policies
DROP POLICY IF EXISTS "Users can update own enrollment status" ON journey_enrollments;
DROP POLICY IF EXISTS "Group leaders can update group enrollment status" ON journey_enrollments;

-- ============================================
-- STEP 3: Helper function for group leader check
-- (Reuses get_current_user_profile_id() from groups migration)
-- ============================================

-- Helper: Check if current user is a Group Leader of a specific group
CREATE OR REPLACE FUNCTION public.is_group_leader(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_group_roles ugr
    JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    WHERE ugr.group_id = p_group_id
      AND ugr.user_id = public.get_current_user_profile_id()
      AND gr.name = 'Group Leader'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_leader(UUID) TO authenticated;

COMMENT ON FUNCTION public.is_group_leader(UUID) IS
'Returns true if the currently authenticated user is a Group Leader of the given group.
Uses SECURITY DEFINER to bypass nested RLS on user_group_roles and group_roles tables.';

-- ============================================
-- STEP 4: Recreate SELECT policies using get_current_user_profile_id()
-- ============================================

-- Policy 1: Users can view their own individual enrollments
-- Also covers newly created enrollments (PostgREST INSERT...RETURNING pattern)
CREATE POLICY "enrollment_select_own_individual"
ON journey_enrollments FOR SELECT
TO authenticated
USING (
  user_id = public.get_current_user_profile_id()
);

COMMENT ON POLICY "enrollment_select_own_individual" ON journey_enrollments IS
'Allows users to view their own individual enrollments.
Uses get_current_user_profile_id() to avoid nested RLS on users table.
Also enables PostgREST INSERT...RETURNING to work correctly.';

-- Policy 2: Users can view enrollments for groups they are active members of
CREATE OR REPLACE FUNCTION public.is_active_group_member_for_enrollment(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_memberships gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = public.get_current_user_profile_id()
      AND gm.status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_group_member_for_enrollment(UUID) TO authenticated;

CREATE POLICY "enrollment_select_group_member"
ON journey_enrollments FOR SELECT
TO authenticated
USING (
  group_id IS NOT NULL
  AND public.is_active_group_member_for_enrollment(group_id)
);

COMMENT ON POLICY "enrollment_select_group_member" ON journey_enrollments IS
'Allows users to view enrollments for groups they are active members of.
Uses SECURITY DEFINER function to avoid nested RLS on group_memberships.';

-- ============================================
-- STEP 5: Recreate INSERT policies
-- ============================================

-- Policy 3: Users can enroll themselves individually
CREATE POLICY "enrollment_insert_individual"
ON journey_enrollments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = public.get_current_user_profile_id()
  AND group_id IS NULL
  AND enrolled_by_user_id = public.get_current_user_profile_id()
  -- Note: Dual enrollment prevention is handled in application layer
);

COMMENT ON POLICY "enrollment_insert_individual" ON journey_enrollments IS
'Allows authenticated users to create individual enrollments for themselves.
Uses get_current_user_profile_id() to avoid nested RLS on users table.
Dual enrollment prevention is handled in application code.';

-- Policy 4: Group Leaders can enroll their groups
CREATE POLICY "enrollment_insert_group"
ON journey_enrollments FOR INSERT
TO authenticated
WITH CHECK (
  group_id IS NOT NULL
  AND user_id IS NULL
  AND enrolled_by_user_id = public.get_current_user_profile_id()
  AND public.is_group_leader(group_id)
);

COMMENT ON POLICY "enrollment_insert_group" ON journey_enrollments IS
'Allows Group Leaders to create group enrollments.
Uses is_group_leader() SECURITY DEFINER function to avoid nested RLS.';

-- ============================================
-- STEP 6: Recreate UPDATE policies
-- ============================================

-- Policy 5: Users can update their own individual enrollment (progress, status)
CREATE POLICY "enrollment_update_own_individual"
ON journey_enrollments FOR UPDATE
TO authenticated
USING (
  user_id = public.get_current_user_profile_id()
)
WITH CHECK (
  user_id = public.get_current_user_profile_id()
);

COMMENT ON POLICY "enrollment_update_own_individual" ON journey_enrollments IS
'Allows users to update their own individual enrollments (progress_data, status, last_accessed_at).
Uses get_current_user_profile_id() to avoid nested RLS on users table.';

-- Policy 6: Group Leaders can update their group enrollments
CREATE POLICY "enrollment_update_group_leader"
ON journey_enrollments FOR UPDATE
TO authenticated
USING (
  group_id IS NOT NULL
  AND public.is_group_leader(group_id)
)
WITH CHECK (
  group_id IS NOT NULL
  AND public.is_group_leader(group_id)
);

COMMENT ON POLICY "enrollment_update_group_leader" ON journey_enrollments IS
'Allows Group Leaders to update group enrollment status and progress.
Uses is_group_leader() SECURITY DEFINER function to avoid nested RLS.';

-- ============================================
-- STEP 7: Ensure RLS is still enabled
-- ============================================

ALTER TABLE journey_enrollments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  col_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check last_accessed_at column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'journey_enrollments'
      AND column_name = 'last_accessed_at'
  ) INTO col_exists;

  IF NOT col_exists THEN
    RAISE EXCEPTION 'last_accessed_at column was not added!';
  END IF;

  -- Check all 6 policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'journey_enrollments'
    AND policyname IN (
      'enrollment_select_own_individual',
      'enrollment_select_group_member',
      'enrollment_insert_individual',
      'enrollment_insert_group',
      'enrollment_update_own_individual',
      'enrollment_update_group_leader'
    );

  IF policy_count < 6 THEN
    RAISE EXCEPTION 'Expected 6 enrollment policies, found %', policy_count;
  END IF;

  RAISE NOTICE '✓ last_accessed_at column added to journey_enrollments';
  RAISE NOTICE '✓ All 6 enrollment RLS policies created';
  RAISE NOTICE '✓ is_group_leader() SECURITY DEFINER function created';
  RAISE NOTICE '✓ Migration completed successfully!';
END $$;
