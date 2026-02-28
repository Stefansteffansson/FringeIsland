-- ==========================================================================
-- Sprint 0: Security Fixes
-- Date: 2026-02-28
-- Purpose: Fix 4 security gaps identified in lifecycle roadmap analysis
--
-- S1: journeys_select_published — enforce is_public (non-public journeys
--     visible only to owning group members or enrolled users)
-- S2: enrollment INSERT policies — gate non-public journey enrollment
-- S3: (UI-only — no SQL changes needed)
-- S4: enrollment UPDATE policies — block updates on frozen enrollments
--
-- Behaviors: B-SEC-001, B-SEC-002, B-SEC-003, B-SEC-004
-- Tests: tests/integration/security/journey-access.test.ts
--        tests/integration/security/frozen-enrollment.test.ts
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Helper: is_enrolled_in_journey(UUID)
--
-- Checks if the current user (via personal group) has an enrollment in
-- the given journey. SECURITY DEFINER to avoid nested RLS on
-- journey_enrollments when called from journeys SELECT policy.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_enrolled_in_journey(check_journey_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.journey_enrollments
    WHERE journey_id = check_journey_id
      AND group_id = public.get_current_personal_group_id()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_enrolled_in_journey(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_enrolled_in_journey(UUID) TO service_role;

-- --------------------------------------------------------------------------
-- 2. Helper: is_journey_enrollable(UUID)
--
-- Checks if a journey is eligible for enrollment by the current user:
-- - Must be published
-- - Must be public OR user is a member of the owning group
-- SECURITY DEFINER to avoid nested RLS on journeys table when called
-- from journey_enrollments INSERT policy.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_journey_enrollable(check_journey_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.journeys
    WHERE id = check_journey_id
      AND is_published = true
      AND (
        -- Public journeys: enrollable by anyone
        is_public = true
        -- Non-public journeys: enrollable by owning group members
        OR public.is_active_group_member(created_by_group_id)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_journey_enrollable(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_journey_enrollable(UUID) TO service_role;

-- --------------------------------------------------------------------------
-- 3. S1: Replace journeys_select_published — enforce is_public
--
-- Before: USING (is_published = true)
-- After:  USING (is_published = true AND (is_public OR member OR enrolled OR admin))
-- --------------------------------------------------------------------------

DROP POLICY IF EXISTS "journeys_select_published" ON public.journeys;

CREATE POLICY "journeys_select_published"
  ON public.journeys FOR SELECT TO authenticated
  USING (
    is_published = true
    AND (
      -- Public journeys: visible to all authenticated users
      is_public = true
      -- Non-public journeys: visible to owning group members
      OR public.is_active_group_member(created_by_group_id)
      -- Non-public journeys: visible to enrolled users (including frozen — for review)
      OR public.is_enrolled_in_journey(id)
      -- Platform admins: see all published journeys
      OR public.is_platform_admin()
    )
  );

-- --------------------------------------------------------------------------
-- 4. S2: Replace enrollment INSERT policies — gate non-public journeys
--
-- Adds is_journey_enrollable() check to both individual and group policies.
-- Non-members cannot enroll in non-public journeys.
-- --------------------------------------------------------------------------

-- 4a. Individual enrollment
DROP POLICY IF EXISTS "enrollment_insert_individual" ON public.journey_enrollments;

CREATE POLICY "enrollment_insert_individual"
  ON public.journey_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    group_id = public.get_current_personal_group_id()
    AND enrolled_by_group_id = public.get_current_personal_group_id()
    AND public.is_journey_enrollable(journey_id)
  );

-- 4b. Group enrollment
DROP POLICY IF EXISTS "enrollment_insert_group" ON public.journey_enrollments;

CREATE POLICY "enrollment_insert_group"
  ON public.journey_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    group_id != public.get_current_personal_group_id()
    AND enrolled_by_group_id = public.get_current_personal_group_id()
    AND public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'enroll_group_in_journey'
    )
    AND public.is_journey_enrollable(journey_id)
  );

-- --------------------------------------------------------------------------
-- 5. S4: Replace enrollment UPDATE policies — block frozen enrollments
--
-- Adds AND status != 'frozen' to USING clause of both UPDATE policies.
-- Frozen enrollments silently return 0 rows updated (not an error).
-- Only service_role (admin) can modify frozen enrollments.
-- --------------------------------------------------------------------------

-- 5a. Own enrollment update
DROP POLICY IF EXISTS "enrollment_update_own" ON public.journey_enrollments;

CREATE POLICY "enrollment_update_own"
  ON public.journey_enrollments FOR UPDATE TO authenticated
  USING (
    group_id = public.get_current_personal_group_id()
    AND status != 'frozen'
  )
  WITH CHECK (
    group_id = public.get_current_personal_group_id()
  );

-- 5b. Group enrollment update
DROP POLICY IF EXISTS "enrollment_update_group" ON public.journey_enrollments;

CREATE POLICY "enrollment_update_group"
  ON public.journey_enrollments FOR UPDATE TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'enroll_group_in_journey'
    )
    AND status != 'frozen'
  )
  WITH CHECK (
    public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'enroll_group_in_journey'
    )
  );
