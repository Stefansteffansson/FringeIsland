-- ============================================
-- Migration: Add Journeys RLS SELECT Policy
-- Date: 2026-02-10
-- Issue:
--   journeys table has RLS enabled (20260208_enable_rls_all_tables.sql)
--   but has NO policies defined, so ALL queries return empty results
--   for authenticated users (including the catalog and detail pages).
-- ============================================

-- ============================================
-- STEP 1: Drop any existing journeys policies (safety)
-- ============================================

DROP POLICY IF EXISTS "journeys_select_published" ON journeys;
DROP POLICY IF EXISTS "Users can view published journeys" ON journeys;
DROP POLICY IF EXISTS "Authenticated users can view published journeys" ON journeys;

-- ============================================
-- STEP 2: Add SELECT policy for published journeys
-- ============================================

-- Only published journeys are visible to authenticated users.
-- Unpublished journeys are never visible regardless of who created them.
-- (Anon role is excluded because policy is TO authenticated)
CREATE POLICY "journeys_select_published"
ON journeys FOR SELECT
TO authenticated
USING (
  is_published = true
);

COMMENT ON POLICY "journeys_select_published" ON journeys IS
'Allows authenticated users to view published journeys only.
Unpublished journeys are not visible to any user (enforced at DB level).
Anon users are blocked by the TO authenticated role restriction.';

-- ============================================
-- STEP 3: Ensure RLS is still enabled
-- ============================================

ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'journeys'
    AND policyname = 'journeys_select_published';

  IF policy_count < 1 THEN
    RAISE EXCEPTION 'journeys_select_published policy was not created!';
  END IF;

  RAISE NOTICE '✓ journeys_select_published policy created';
  RAISE NOTICE '✓ Authenticated users can now view published journeys';
  RAISE NOTICE '✓ Unpublished journeys remain hidden from all users';
  RAISE NOTICE '✓ Migration completed successfully!';
END $$;
