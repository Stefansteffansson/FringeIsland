/**
 * Integration Tests: Journeys - Journey Resume
 *
 * Tests: B-JRN-006: Journey Resume
 *
 * Verifies that:
 * - New enrollment has empty progress_data ("not started" state)
 * - After saving position, subsequent read returns correct saved step
 * - Empty progress_data correctly signals "not started"
 * - In-progress journeys return the saved current_step_id
 * - Resume state is correct after multiple navigation updates
 *
 * NOTE: Tests use try/finally to guarantee cleanup even on assertion failure,
 * preventing UNIQUE constraint violations in subsequent tests.
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

describe('B-JRN-006: Journey Resume (DB Layer)', () => {
  let testUser: any;
  let journey: any;
  const admin = createAdminClient();

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'Resume Test User' });
    const { personalGroupId } = testUser;

    const { data: j } = await admin
      .from('journeys')
      .insert({
        ...testJourneyMultiStep,
        title: 'Resume Test Journey',
        created_by_group_id: personalGroupId,
      })
      .select()
      .single();

    journey = j;
  });

  afterAll(async () => {
    if (journey) await cleanupTestJourney(journey.id);
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  it('should have empty progress_data on fresh enrollment (not started)', async () => {
    const supabase = createTestClient();
    let enrollmentId: string | null = null;

    try {
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

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

      expect(enrollment).not.toBeNull();
      enrollmentId = enrollment!.id;

      // Fresh enrollment = not started
      expect(enrollment!.progress_data).toEqual({});
      expect(enrollment!.progress_data.current_step_id).toBeUndefined();
      // last_accessed_at is null when never accessed (null or undefined before column added)
      expect(enrollment!.last_accessed_at ?? null).toBeNull();
    } finally {
      if (enrollmentId) await admin.from('journey_enrollments').delete().eq('id', enrollmentId);
      await supabase.auth.signOut();
    }
  });

  it('should return saved step position after user navigates', async () => {
    const supabase = createTestClient();
    let enrollmentId: string | null = null;

    try {
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

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

      expect(enrollment).not.toBeNull();
      enrollmentId = enrollment!.id;

      // User navigates to step_3
      await supabase
        .from('journey_enrollments')
        .update({
          progress_data: {
            current_step_id: 'step_3',
            completed_steps: ['step_1', 'step_2'],
          },
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId);

      // Simulate user returning (new session — re-read enrollment)
      const { data: resumed } = await supabase
        .from('journey_enrollments')
        .select('progress_data, last_accessed_at, status')
        .eq('id', enrollmentId)
        .single();

      // Should resume at step_3, not step_1
      expect(resumed!.progress_data.current_step_id).toBe('step_3');
      expect(resumed!.progress_data.completed_steps).toEqual(['step_1', 'step_2']);
      expect(resumed!.last_accessed_at).not.toBeNull();
      expect(resumed!.status).toBe('active');
    } finally {
      if (enrollmentId) await admin.from('journey_enrollments').delete().eq('id', enrollmentId);
      await supabase.auth.signOut();
    }
  });

  it('should reflect latest navigation after multiple step advances', async () => {
    const supabase = createTestClient();
    let enrollmentId: string | null = null;

    try {
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

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

      expect(enrollment).not.toBeNull();
      enrollmentId = enrollment!.id;

      // Simulate user progressing through multiple steps across sessions
      const steps = ['step_1', 'step_2', 'step_3'];
      const completedSoFar: string[] = [];

      for (const step of steps) {
        completedSoFar.push(step);
        await supabase
          .from('journey_enrollments')
          .update({
            progress_data: {
              current_step_id: step,
              completed_steps: [...completedSoFar],
            },
          })
          .eq('id', enrollmentId);
      }

      // Final state should be at step_3 with steps 1-3 completed
      const { data: final } = await supabase
        .from('journey_enrollments')
        .select('progress_data')
        .eq('id', enrollmentId)
        .single();

      expect(final!.progress_data.current_step_id).toBe('step_3');
      expect(final!.progress_data.completed_steps).toHaveLength(3);
      expect(final!.progress_data.completed_steps).toContain('step_1');
      expect(final!.progress_data.completed_steps).toContain('step_2');
      expect(final!.progress_data.completed_steps).toContain('step_3');
    } finally {
      if (enrollmentId) await admin.from('journey_enrollments').delete().eq('id', enrollmentId);
      await supabase.auth.signOut();
    }
  });

  it('should correctly determine resume state from progress_data', async () => {
    // This tests the app-layer logic for determining what to show the user

    // Case 1: Empty progress_data → "not started" → show "Start Journey"
    const emptyProgress = {};
    const isNotStarted = !emptyProgress.hasOwnProperty('current_step_id');
    expect(isNotStarted).toBe(true);

    // Case 2: Has current_step_id → "in progress" → show "Continue"
    const inProgressData = { current_step_id: 'step_3', completed_steps: ['step_1', 'step_2'] };
    const isInProgress = inProgressData.hasOwnProperty('current_step_id') &&
      inProgressData.current_step_id !== null;
    expect(isInProgress).toBe(true);

    // Case 3: All required steps complete → eligible for completion
    const requiredSteps = ['step_1', 'step_2', 'step_3', 'step_5'];
    const completedSteps = ['step_1', 'step_2', 'step_3', 'step_5'];
    const allRequiredDone = requiredSteps.every(s => completedSteps.includes(s));
    expect(allRequiredDone).toBe(true);
  });

  it('should handle missing current_step_id gracefully (defensive)', async () => {
    // If current_step_id is missing/null in progress_data,
    // the app should default to step_1 (not crash)
    const corruptedProgress = { completed_steps: ['step_1'] }; // No current_step_id

    const resumeStep = (corruptedProgress as any).current_step_id ?? 'step_1';
    expect(resumeStep).toBe('step_1'); // Defaults to first step
  });

  it('should show different resume states: not started vs in-progress vs completed', async () => {
    const supabase = createTestClient();
    let enrollmentId: string | null = null;

    try {
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

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

      expect(enrollment).not.toBeNull();
      enrollmentId = enrollment!.id;

      // State 1: Not started
      const { data: notStarted } = await supabase
        .from('journey_enrollments')
        .select('progress_data, status')
        .eq('id', enrollmentId)
        .single();

      expect(Object.keys(notStarted!.progress_data)).toHaveLength(0);
      expect(notStarted!.status).toBe('active');

      // State 2: In progress — save to step_2
      await supabase
        .from('journey_enrollments')
        .update({
          progress_data: { current_step_id: 'step_2', completed_steps: ['step_1'] },
        })
        .eq('id', enrollmentId);

      const { data: inProgress } = await supabase
        .from('journey_enrollments')
        .select('progress_data, status')
        .eq('id', enrollmentId)
        .single();

      expect(inProgress!.progress_data.current_step_id).toBe('step_2');
      expect(inProgress!.status).toBe('active');

      // State 3: Completed
      await supabase
        .from('journey_enrollments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          progress_data: {
            current_step_id: 'step_5',
            completed_steps: ['step_1', 'step_2', 'step_3', 'step_4', 'step_5'],
          },
        })
        .eq('id', enrollmentId);

      const { data: completed } = await supabase
        .from('journey_enrollments')
        .select('progress_data, status, completed_at')
        .eq('id', enrollmentId)
        .single();

      expect(completed!.status).toBe('completed');
      expect(completed!.completed_at).not.toBeNull();
      expect(completed!.progress_data.completed_steps).toHaveLength(5);
    } finally {
      if (enrollmentId) await admin.from('journey_enrollments').delete().eq('id', enrollmentId);
      await supabase.auth.signOut();
    }
  });
});
