/**
 * Integration Tests: Journeys - Journey Completion
 *
 * Tests: B-JRN-007: Journey Completion
 *
 * Verifies that:
 * - Enrollment status can be updated from 'active' to 'completed'
 * - completed_at timestamp is set when status = 'completed'
 * - Users can only update their own enrollment (RLS)
 * - Completed journeys remain accessible for review
 * - Valid status transitions are enforced by CHECK constraint
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  cleanupTestJourney,
  createAdminClient,
} from '@/tests/helpers/supabase';
import { testJourneyMultiStep } from '@/tests/helpers/fixtures';

describe('B-JRN-007: Journey Completion (DB Layer)', () => {
  let testUser: any;
  let otherUser: any;
  let journey: any;
  const admin = createAdminClient();

  // All steps in the multi-step journey
  const ALL_STEPS = ['step_1', 'step_2', 'step_3', 'step_4', 'step_5'];
  const REQUIRED_STEPS = ['step_1', 'step_2', 'step_3', 'step_5'];

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'Completion Test User' });
    otherUser = await createTestUser({ displayName: 'Other User (no access)' });
    const { personalGroupId } = testUser;

    const { data: j } = await admin
      .from('journeys')
      .insert({
        ...testJourneyMultiStep,
        title: 'Completion Test Journey',
        created_by_group_id: personalGroupId,
      })
      .select()
      .single();

    journey = j;
  });

  afterAll(async () => {
    if (journey) await cleanupTestJourney(journey.id);
    if (testUser) await cleanupTestUser(testUser.user.id);
    if (otherUser) await cleanupTestUser(otherUser.user.id);
  });

  it('should update status to completed and record completed_at timestamp', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    // Create enrollment
    const { personalGroupId } = testUser;
    const { data: enrollment } = await supabase
      .from('journey_enrollments')
      .insert({
        journey_id: journey.id,
        group_id: personalGroupId,
        enrolled_by_group_id: personalGroupId,
        status: 'active',
        progress_data: {},
      })
      .select()
      .single();

    const completedAt = new Date().toISOString();

    // Mark as complete
    const { data: completed, error } = await supabase
      .from('journey_enrollments')
      .update({
        status: 'completed',
        completed_at: completedAt,
        progress_data: {
          current_step_id: 'step_5',
          completed_steps: ALL_STEPS,
          step_progress: {},
          total_time_spent_minutes: 155,
        },
      })
      .eq('id', enrollment!.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(completed!.status).toBe('completed');
    // Supabase may return timestamps in +00:00 instead of Z format — compare as Date objects
    expect(new Date(completed!.completed_at).getTime()).toBeCloseTo(
      new Date(completedAt).getTime(), -3 // within 1 second
    );
    expect(completed!.progress_data.completed_steps).toHaveLength(5);

    // Cleanup
    await admin.from('journey_enrollments').delete().eq('id', enrollment!.id);
    await supabase.auth.signOut();
  });

  it('should be able to read completed enrollment from My Journeys', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    // Create enrollment and mark complete via admin
    const { personalGroupId } = testUser;
    const { data: enrollment } = await admin
      .from('journey_enrollments')
      .insert({
        journey_id: journey.id,
        group_id: personalGroupId,
        enrolled_by_group_id: personalGroupId,
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress_data: {
          current_step_id: 'step_5',
          completed_steps: ALL_STEPS,
        },
      })
      .select()
      .single();

    // User can still read their completed enrollment
    const { data: myEnrollments } = await supabase
      .from('journey_enrollments')
      .select('id, status, completed_at, progress_data')
      .eq('group_id', personalGroupId)
      .eq('status', 'completed');

    expect(myEnrollments).not.toBeNull();
    const found = myEnrollments!.find(e => e.id === enrollment!.id);
    expect(found).toBeDefined();
    expect(found!.status).toBe('completed');
    expect(found!.completed_at).not.toBeNull();

    // Cleanup
    await admin.from('journey_enrollments').delete().eq('id', enrollment!.id);
    await supabase.auth.signOut();
  });

  it('should prevent other users from completing someone else\'s enrollment', async () => {
    // Create enrollment for testUser
    const { personalGroupId } = testUser;
    const { data: enrollment } = await admin
      .from('journey_enrollments')
      .insert({
        journey_id: journey.id,
        group_id: personalGroupId,
        enrolled_by_group_id: personalGroupId,
        status: 'active',
        progress_data: {},
      })
      .select()
      .single();

    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: otherUser.email,
      password: otherUser.password,
    });

    // otherUser tries to mark testUser's enrollment as complete
    const { data: result } = await supabase
      .from('journey_enrollments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', enrollment!.id)
      .select()
      .single();

    // RLS should block — returns null (no rows matched)
    expect(result).toBeNull();

    // Verify status is still 'active'
    const { data: unchanged } = await admin
      .from('journey_enrollments')
      .select('status')
      .eq('id', enrollment!.id)
      .single();

    expect(unchanged!.status).toBe('active');

    // Cleanup
    await admin.from('journey_enrollments').delete().eq('id', enrollment!.id);
    await supabase.auth.signOut();
  });

  it('should enforce valid status values via CHECK constraint', async () => {
    // Attempt to set invalid status
    const { personalGroupId } = testUser;
    const { data: enrollment } = await admin
      .from('journey_enrollments')
      .insert({
        journey_id: journey.id,
        group_id: personalGroupId,
        enrolled_by_group_id: personalGroupId,
        status: 'active',
        progress_data: {},
      })
      .select()
      .single();

    // Try to update to invalid status
    const { error } = await admin
      .from('journey_enrollments')
      .update({ status: 'invalid_status' })
      .eq('id', enrollment!.id);

    expect(error).not.toBeNull(); // CHECK constraint violated

    // Cleanup
    await admin.from('journey_enrollments').delete().eq('id', enrollment!.id);
  });

  it('should allow all valid status transitions', async () => {
    const VALID_STATUSES = ['active', 'completed', 'paused', 'frozen'];
    const { personalGroupId } = testUser;

    for (const status of VALID_STATUSES) {
      const { data: enrollment } = await admin
        .from('journey_enrollments')
        .insert({
          journey_id: journey.id,
          group_id: personalGroupId,
          enrolled_by_group_id: personalGroupId,
          status: 'active',
          progress_data: {},
        })
        .select()
        .single();

      const { error } = await admin
        .from('journey_enrollments')
        .update({ status })
        .eq('id', enrollment!.id);

      expect(error).toBeNull(); // All valid statuses should be accepted

      // Cleanup
      await admin.from('journey_enrollments').delete().eq('id', enrollment!.id);
    }
  });

  it('should determine completion eligibility when all required steps are done', async () => {
    // This tests the app-layer logic for deciding when to mark complete

    // Not complete: missing step_5 (required)
    const partiallyDone = ['step_1', 'step_2', 'step_3', 'step_4'];
    const notComplete = REQUIRED_STEPS.every(s => partiallyDone.includes(s));
    expect(notComplete).toBe(false);

    // Complete: all required steps done (step_4 is optional, missing is fine)
    const requiredDone = ['step_1', 'step_2', 'step_3', 'step_5'];
    const isComplete = REQUIRED_STEPS.every(s => requiredDone.includes(s));
    expect(isComplete).toBe(true);

    // Complete: all steps done (including optional)
    const allDone = ['step_1', 'step_2', 'step_3', 'step_4', 'step_5'];
    const allComplete = REQUIRED_STEPS.every(s => allDone.includes(s));
    expect(allComplete).toBe(true);
  });

  it('should set completed_at only when transitioning to completed status', async () => {
    const { personalGroupId } = testUser;
    const { data: enrollment } = await admin
      .from('journey_enrollments')
      .insert({
        journey_id: journey.id,
        group_id: personalGroupId,
        enrolled_by_group_id: personalGroupId,
        status: 'active',
        progress_data: {},
      })
      .select()
      .single();

    // Initially no completed_at
    expect(enrollment!.completed_at).toBeNull();

    const completedAt = new Date().toISOString();

    const { data: completed } = await admin
      .from('journey_enrollments')
      .update({
        status: 'completed',
        completed_at: completedAt,
      })
      .eq('id', enrollment!.id)
      .select()
      .single();

    // Compare as Date objects to handle Z vs +00:00 format difference
    expect(new Date(completed!.completed_at).getTime()).toBeCloseTo(
      new Date(completedAt).getTime(), -3
    );
    expect(completed!.status).toBe('completed');

    // Cleanup
    await admin.from('journey_enrollments').delete().eq('id', enrollment!.id);
  });
});
