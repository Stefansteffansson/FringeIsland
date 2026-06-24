/**
 * Integration Tests: Security - Frozen Enrollment Enforcement
 *
 * Tests: B-SEC-003 (Frozen Enrollment UI Enforcement) + B-SEC-004 (Frozen Enrollment RLS)
 *
 * Verifies that:
 * - Frozen enrollments cannot be updated via RLS (progress_data, status changes)
 * - Active enrollments can still be updated (no regression)
 * - Completed enrollments can still be updated (no regression)
 * - Paused enrollments can still be updated (no regression)
 * - Only admin/service role can modify frozen enrollments (for unfreezing)
 *
 * Note: B-SEC-003 (UI enforcement) is partially tested here at the data layer.
 * Full UI behavior (banner, disabled buttons) would be tested via E2E/component tests.
 * The RLS tests here ensure defense-in-depth even if UI is bypassed.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  cleanupTestJourney,
  createAdminClient,
  signInWithRetry,
} from '@/tests/helpers/supabase';
import { testJourney } from '@/tests/helpers/fixtures';

describe('B-SEC-003 + B-SEC-004: Frozen Enrollment Enforcement', () => {
  let testUser: any;
  let journey: any;
  let frozenEnrollment: any;
  let activeEnrollment: any;
  let completedEnrollment: any;
  let pausedEnrollment: any;
  const admin = createAdminClient();

  // We need a second journey for the additional enrollment statuses
  let journey2: any;
  let journey3: any;
  let journey4: any;

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'SEC Frozen Test' });
    const { personalGroupId } = testUser;

    // Create 4 journeys (one per enrollment status we need to test)
    const journeyBase = {
      ...testJourney,
      is_published: true,
      is_public: true,
      created_by_group_id: personalGroupId,
    };

    const { data: j1 } = await admin
      .from('journeys')
      .insert({ ...journeyBase, title: 'SEC Frozen Journey 1' })
      .select()
      .single();
    journey = j1;

    const { data: j2 } = await admin
      .from('journeys')
      .insert({ ...journeyBase, title: 'SEC Frozen Journey 2' })
      .select()
      .single();
    journey2 = j2;

    const { data: j3 } = await admin
      .from('journeys')
      .insert({ ...journeyBase, title: 'SEC Frozen Journey 3' })
      .select()
      .single();
    journey3 = j3;

    const { data: j4 } = await admin
      .from('journeys')
      .insert({ ...journeyBase, title: 'SEC Frozen Journey 4' })
      .select()
      .single();
    journey4 = j4;

    // Create enrollments with different statuses (via admin to set status directly)
    const enrollmentBase = {
      group_id: personalGroupId,
      enrolled_by_group_id: personalGroupId,
      progress_data: { current_step_id: 'step_1', completed_steps: [] },
    };

    const { data: frozen } = await admin
      .from('journey_enrollments')
      .insert({
        ...enrollmentBase,
        journey_id: journey.id,
        status: 'frozen',
      })
      .select()
      .single();
    frozenEnrollment = frozen;

    const { data: active } = await admin
      .from('journey_enrollments')
      .insert({
        ...enrollmentBase,
        journey_id: journey2.id,
        status: 'active',
      })
      .select()
      .single();
    activeEnrollment = active;

    const { data: completed } = await admin
      .from('journey_enrollments')
      .insert({
        ...enrollmentBase,
        journey_id: journey3.id,
        status: 'completed',
      })
      .select()
      .single();
    completedEnrollment = completed;

    const { data: paused } = await admin
      .from('journey_enrollments')
      .insert({
        ...enrollmentBase,
        journey_id: journey4.id,
        status: 'paused',
      })
      .select()
      .single();
    pausedEnrollment = paused;
  });

  afterAll(async () => {
    if (journey) await cleanupTestJourney(journey.id);
    if (journey2) await cleanupTestJourney(journey2.id);
    if (journey3) await cleanupTestJourney(journey3.id);
    if (journey4) await cleanupTestJourney(journey4.id);
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  // ─── B-SEC-004: Frozen Enrollment RLS Enforcement ───────────────────

  describe('B-SEC-004: Frozen Enrollment UPDATE blocked by RLS', () => {
    it('should BLOCK progress_data updates on frozen enrollments', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, testUser.email, testUser.password);

      // Attempt to update progress_data on a frozen enrollment
      const { data, error } = await supabase
        .from('journey_enrollments')
        .update({
          progress_data: {
            current_step_id: 'step_2',
            completed_steps: ['step_1'],
          },
        })
        .eq('id', frozenEnrollment.id)
        .select()
        .single();

      // RLS should block this — frozen enrollment cannot be updated
      // Either error is non-null, OR data is null (0 rows matched USING clause)
      const blocked = error !== null || data === null;
      expect(blocked).toBe(true);

      await supabase.auth.signOut();
    });

    it('should BLOCK status changes on frozen enrollments (self-unfreeze attempt)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, testUser.email, testUser.password);

      // Attempt to change status from 'frozen' to 'active' (self-unfreeze)
      const { data, error } = await supabase
        .from('journey_enrollments')
        .update({ status: 'active' })
        .eq('id', frozenEnrollment.id)
        .select()
        .single();

      // RLS should block this — cannot self-unfreeze
      const blocked = error !== null || data === null;
      expect(blocked).toBe(true);

      await supabase.auth.signOut();
    });

    it('should BLOCK last_accessed_at updates on frozen enrollments', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, testUser.email, testUser.password);

      const { data, error } = await supabase
        .from('journey_enrollments')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', frozenEnrollment.id)
        .select()
        .single();

      const blocked = error !== null || data === null;
      expect(blocked).toBe(true);

      await supabase.auth.signOut();
    });
  });

  // ─── No Regression: Active/Completed/Paused still updatable ─────────

  describe('No regression: Active enrollments still updatable', () => {
    it('should ALLOW progress_data updates on ACTIVE enrollments', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, testUser.email, testUser.password);

      const newProgress = {
        current_step_id: 'step_1',
        completed_steps: ['step_1'],
        step_progress: {
          step_1: { completed_at: new Date().toISOString() },
        },
      };

      const { data, error } = await supabase
        .from('journey_enrollments')
        .update({ progress_data: newProgress })
        .eq('id', activeEnrollment.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.progress_data).toEqual(newProgress);

      await supabase.auth.signOut();
    });

    it('should ALLOW status change on ACTIVE enrollments (e.g., to completed)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, testUser.email, testUser.password);

      const { data, error } = await supabase
        .from('journey_enrollments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', activeEnrollment.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.status).toBe('completed');

      // Reset back to active for other tests
      await admin
        .from('journey_enrollments')
        .update({ status: 'active', completed_at: null })
        .eq('id', activeEnrollment.id);

      await supabase.auth.signOut();
    });
  });

  describe('No regression: Completed enrollments still updatable', () => {
    it('should ALLOW progress_data updates on COMPLETED enrollments (review mode)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, testUser.email, testUser.password);

      const newProgress = {
        current_step_id: 'step_1',
        completed_steps: ['step_1'],
        last_review_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('journey_enrollments')
        .update({ progress_data: newProgress })
        .eq('id', completedEnrollment.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();

      await supabase.auth.signOut();
    });
  });

  describe('No regression: Paused enrollments still updatable', () => {
    it('should ALLOW status change on PAUSED enrollments (resume)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, testUser.email, testUser.password);

      const { data, error } = await supabase
        .from('journey_enrollments')
        .update({ status: 'active' })
        .eq('id', pausedEnrollment.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.status).toBe('active');

      // Reset back to paused
      await admin
        .from('journey_enrollments')
        .update({ status: 'paused' })
        .eq('id', pausedEnrollment.id);

      await supabase.auth.signOut();
    });
  });

  // ─── Admin can modify frozen enrollments ────────────────────────────

  describe('Admin: Service role can modify frozen enrollments', () => {
    it('should ALLOW admin to unfreeze an enrollment (service role bypasses RLS)', async () => {
      // Admin unfreezes the enrollment
      const { data, error } = await admin
        .from('journey_enrollments')
        .update({ status: 'active' })
        .eq('id', frozenEnrollment.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.status).toBe('active');

      // Freeze it back for other tests
      await admin
        .from('journey_enrollments')
        .update({ status: 'frozen' })
        .eq('id', frozenEnrollment.id);
    });
  });

  // ─── B-SEC-003: Frozen enrollment is readable (SELECT still works) ──

  describe('B-SEC-003: Frozen enrollments are still readable (review access)', () => {
    it('should ALLOW reading frozen enrollment data (SELECT not blocked)', async () => {
      const supabase = createTestClient();
      await signInWithRetry(supabase, testUser.email, testUser.password);

      const { data, error } = await supabase
        .from('journey_enrollments')
        .select('id, status, progress_data, journey_id')
        .eq('id', frozenEnrollment.id)
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.status).toBe('frozen');
      expect(data!.journey_id).toBe(journey.id);

      await supabase.auth.signOut();
    });
  });
});
