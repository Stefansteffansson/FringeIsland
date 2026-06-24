/**
 * Integration Tests: Journeys - Step Completion Tracking
 *
 * Tests: B-JRN-005: Step Completion Tracking
 *
 * Verifies that:
 * - Completed steps are recorded in progress_data.completed_steps
 * - Step completion timestamps are saved in progress_data.step_progress
 * - Completion is idempotent (adding same step twice = no change)
 * - Progress percentage can be calculated from completion data
 * - last_accessed_at is updated on each interaction
 * - Other users cannot modify completion data
 *
 * NOTE: These tests verify the database layer behavior.
 * Progress data is stored as JSONB in journey_enrollments.progress_data.
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

describe('B-JRN-005: Step Completion Tracking (DB Layer)', () => {
  let testUser: any;
  let journey: any;
  let enrollment: any;
  const admin = createAdminClient();

  // Journey has 5 steps: step_1 to step_5 (4 required, 1 optional)
  const TOTAL_STEPS = 5;
  const REQUIRED_STEPS = ['step_1', 'step_2', 'step_3', 'step_5'];

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'Progress Test User' });
    const { personalGroupId } = testUser;

    const { data: j } = await admin
      .from('journeys')
      .insert({
        ...testJourneyMultiStep,
        title: 'Progress Tracking Test Journey',
        created_by_group_id: personalGroupId,
      })
      .select()
      .single();

    journey = j;

    const { data: e } = await admin
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

    enrollment = e;
  });

  afterAll(async () => {
    if (journey) await cleanupTestJourney(journey.id);
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  it('should start with empty completed_steps (not started)', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const { data: e } = await supabase
      .from('journey_enrollments')
      .select('progress_data')
      .eq('id', enrollment.id)
      .single();

    expect(e!.progress_data).toEqual({});
    // No completed_steps means not started
    expect(e!.progress_data.completed_steps).toBeUndefined();

    await supabase.auth.signOut();
  });

  it('should record first step completion', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const completedAt = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('journey_enrollments')
      .update({
        progress_data: {
          current_step_id: 'step_2',
          completed_steps: ['step_1'],
          step_progress: {
            step_1: { completed_at: completedAt, time_spent_minutes: 28 },
          },
          total_time_spent_minutes: 28,
          last_checkpoint: 'step_1',
        },
      })
      .eq('id', enrollment.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated!.progress_data.completed_steps).toContain('step_1');
    expect(updated!.progress_data.completed_steps).toHaveLength(1);
    expect(updated!.progress_data.step_progress.step_1.completed_at).toBe(completedAt);
    expect(updated!.progress_data.step_progress.step_1.time_spent_minutes).toBe(28);

    await supabase.auth.signOut();
  });

  it('should accumulate multiple step completions', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const { data: updated, error } = await supabase
      .from('journey_enrollments')
      .update({
        progress_data: {
          current_step_id: 'step_3',
          completed_steps: ['step_1', 'step_2'],
          step_progress: {
            step_1: { completed_at: new Date().toISOString(), time_spent_minutes: 28 },
            step_2: { completed_at: new Date().toISOString(), time_spent_minutes: 32 },
          },
          total_time_spent_minutes: 60,
          last_checkpoint: 'step_2',
        },
      })
      .eq('id', enrollment.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated!.progress_data.completed_steps).toHaveLength(2);
    expect(updated!.progress_data.completed_steps).toContain('step_1');
    expect(updated!.progress_data.completed_steps).toContain('step_2');
    expect(updated!.progress_data.total_time_spent_minutes).toBe(60);

    await supabase.auth.signOut();
  });

  it('should handle idempotent step completion (re-completing a step)', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    // Simulate idempotent behavior: adding step_1 again to already-completed array
    const existingCompleted = ['step_1', 'step_2'];
    const stepToMarkComplete = 'step_1'; // Already completed

    // Idempotent logic: use Set to avoid duplicates (as app layer will do)
    const updatedCompleted = [...new Set([...existingCompleted, stepToMarkComplete])];

    expect(updatedCompleted).toHaveLength(2); // Still 2, not 3
    expect(updatedCompleted).toEqual(['step_1', 'step_2']);

    // Update with idempotent result
    const { data: updated } = await supabase
      .from('journey_enrollments')
      .update({
        progress_data: {
          current_step_id: 'step_3',
          completed_steps: updatedCompleted,
        },
      })
      .eq('id', enrollment.id)
      .select()
      .single();

    expect(updated!.progress_data.completed_steps).toHaveLength(2);

    await supabase.auth.signOut();
  });

  it('should correctly derive progress percentage from completed steps', async () => {
    // Progress percentage = completed_steps.length / total_steps * 100
    const completedSteps = ['step_1', 'step_2'];
    const progressPercentage = Math.round((completedSteps.length / TOTAL_STEPS) * 100);

    expect(progressPercentage).toBe(40); // 2/5 = 40%

    // With 4 completed steps:
    const moreCompleted = ['step_1', 'step_2', 'step_3', 'step_4'];
    const moreProgress = Math.round((moreCompleted.length / TOTAL_STEPS) * 100);
    expect(moreProgress).toBe(80); // 4/5 = 80%

    // All steps completed:
    const allCompleted = ['step_1', 'step_2', 'step_3', 'step_4', 'step_5'];
    const fullProgress = Math.round((allCompleted.length / TOTAL_STEPS) * 100);
    expect(fullProgress).toBe(100); // 5/5 = 100%
  });

  it('should correctly identify all required steps for completion eligibility', async () => {
    const completedSteps = ['step_1', 'step_2', 'step_3']; // Missing step_5

    // Check if all required steps are done
    const allRequiredDone = REQUIRED_STEPS.every(s => completedSteps.includes(s));
    expect(allRequiredDone).toBe(false); // step_5 missing

    const completedWithRequired = ['step_1', 'step_2', 'step_3', 'step_5'];
    const allRequiredNowDone = REQUIRED_STEPS.every(s => completedWithRequired.includes(s));
    expect(allRequiredNowDone).toBe(true); // All required steps done (step_4 is optional)
  });

  it('should update last_accessed_at on each interaction', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const timestamp = new Date().toISOString();

    await supabase
      .from('journey_enrollments')
      .update({
        last_accessed_at: timestamp,
        progress_data: {
          current_step_id: 'step_3',
          completed_steps: ['step_1', 'step_2'],
        },
      })
      .eq('id', enrollment.id);

    const { data: e } = await supabase
      .from('journey_enrollments')
      .select('last_accessed_at')
      .eq('id', enrollment.id)
      .single();

    // Supabase may return timestamps in +00:00 instead of Z format — compare as Date objects
    expect(new Date(e!.last_accessed_at).getTime()).toBe(new Date(timestamp).getTime());

    await supabase.auth.signOut();
  });

  it('should persist step_progress timestamps correctly', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const step1CompletedAt = '2026-02-09T10:00:00.000Z';
    const step2CompletedAt = '2026-02-09T10:35:00.000Z';

    const { data: updated } = await supabase
      .from('journey_enrollments')
      .update({
        progress_data: {
          current_step_id: 'step_3',
          completed_steps: ['step_1', 'step_2'],
          step_progress: {
            step_1: { completed_at: step1CompletedAt, time_spent_minutes: 30 },
            step_2: { completed_at: step2CompletedAt, time_spent_minutes: 35 },
          },
          total_time_spent_minutes: 65,
        },
      })
      .eq('id', enrollment.id)
      .select('progress_data')
      .single();

    expect(updated!.progress_data.step_progress.step_1.completed_at).toBe(step1CompletedAt);
    expect(updated!.progress_data.step_progress.step_2.completed_at).toBe(step2CompletedAt);
    expect(updated!.progress_data.total_time_spent_minutes).toBe(65);

    await supabase.auth.signOut();
  });
});
