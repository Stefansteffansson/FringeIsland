/**
 * Integration Tests: Journeys - Step Navigation
 *
 * Tests: B-JRN-004: Journey Step Navigation
 *
 * Verifies that:
 * - Enrolled users can save their current step position (current_step_id)
 * - Navigation position is persisted in journey_enrollments.progress_data
 * - Users cannot modify another user's enrollment progress
 * - Step navigation updates are correctly stored and retrievable
 *
 * NOTE: These tests verify the database layer (RLS + data integrity).
 * The UI layer (JourneyPlayer component) is not yet implemented.
 * These tests should be GREEN once the RLS policies allow enrollment updates.
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

describe('B-JRN-004: Journey Step Navigation (DB Layer)', () => {
  let enrolledUser: any;
  let otherUser: any;
  let journey: any;
  let enrollment: any;
  const admin = createAdminClient();

  beforeAll(async () => {
    enrolledUser = await createTestUser({ displayName: 'Navigation Test User' });
    otherUser = await createTestUser({ displayName: 'Other User (no access)' });

    // Create multi-step journey
    const { data: j } = await admin
      .from('journeys')
      .insert({
        ...testJourneyMultiStep,
        title: 'Navigation Test Journey',
        created_by_user_id: enrolledUser.profile.id,
      })
      .select()
      .single();

    journey = j;

    // Create enrollment for enrolledUser
    const { data: e } = await admin
      .from('journey_enrollments')
      .insert({
        journey_id: journey.id,
        user_id: enrolledUser.profile.id,
        group_id: null,
        enrolled_by_user_id: enrolledUser.profile.id,
        status: 'active',
        progress_data: {},
      })
      .select()
      .single();

    enrollment = e;
  });

  afterAll(async () => {
    if (journey) await cleanupTestJourney(journey.id);
    if (enrolledUser) await cleanupTestUser(enrolledUser.user.id);
    if (otherUser) await cleanupTestUser(otherUser.user.id);
  });

  it('should allow enrolled user to save current step position', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: enrolledUser.email,
      password: enrolledUser.password,
    });

    const { data: updated, error } = await supabase
      .from('journey_enrollments')
      .update({
        progress_data: {
          current_step_id: 'step_2',
          completed_steps: ['step_1'],
        },
      })
      .eq('id', enrollment.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated).toBeDefined();
    expect(updated!.progress_data.current_step_id).toBe('step_2');
    expect(updated!.progress_data.completed_steps).toContain('step_1');

    await supabase.auth.signOut();
  });

  it('should persist step position across reads', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: enrolledUser.email,
      password: enrolledUser.password,
    });

    // First, save position at step_3
    await supabase
      .from('journey_enrollments')
      .update({
        progress_data: {
          current_step_id: 'step_3',
          completed_steps: ['step_1', 'step_2'],
        },
      })
      .eq('id', enrollment.id);

    // Read it back
    const { data: readBack } = await supabase
      .from('journey_enrollments')
      .select('progress_data')
      .eq('id', enrollment.id)
      .single();

    expect(readBack!.progress_data.current_step_id).toBe('step_3');
    expect(readBack!.progress_data.completed_steps).toEqual(['step_1', 'step_2']);

    await supabase.auth.signOut();
  });

  it('should allow navigating to first step (initial state)', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: enrolledUser.email,
      password: enrolledUser.password,
    });

    const { data: updated, error } = await supabase
      .from('journey_enrollments')
      .update({
        progress_data: {
          current_step_id: 'step_1',
          completed_steps: [],
        },
      })
      .eq('id', enrollment.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated!.progress_data.current_step_id).toBe('step_1');
    expect(updated!.progress_data.completed_steps).toHaveLength(0);

    await supabase.auth.signOut();
  });

  it('should prevent user from modifying another user\'s enrollment', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: otherUser.email,
      password: otherUser.password,
    });

    // otherUser attempts to update enrolledUser's enrollment
    const { data: result, error } = await supabase
      .from('journey_enrollments')
      .update({
        progress_data: {
          current_step_id: 'step_5',
          completed_steps: ['step_1', 'step_2', 'step_3', 'step_4'],
        },
      })
      .eq('id', enrollment.id)
      .select()
      .single();

    // RLS should block the update (returns no rows or error)
    expect(result).toBeNull();

    // Verify the original data was NOT changed
    const { data: unchanged } = await admin
      .from('journey_enrollments')
      .select('progress_data')
      .eq('id', enrollment.id)
      .single();

    // The current_step_id should NOT be step_5
    expect(unchanged!.progress_data.current_step_id).not.toBe('step_5');

    await supabase.auth.signOut();
  });

  it('should update last_accessed_at when progress is saved', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: enrolledUser.email,
      password: enrolledUser.password,
    });

    const before = new Date().toISOString();

    await supabase
      .from('journey_enrollments')
      .update({
        progress_data: { current_step_id: 'step_2', completed_steps: ['step_1'] },
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id);

    const { data: after } = await supabase
      .from('journey_enrollments')
      .select('last_accessed_at')
      .eq('id', enrollment.id)
      .single();

    expect(after!.last_accessed_at).not.toBeNull();
    expect(new Date(after!.last_accessed_at) >= new Date(before)).toBe(true);

    await supabase.auth.signOut();
  });
});
