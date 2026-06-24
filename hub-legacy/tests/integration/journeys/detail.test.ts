/**
 * Integration Tests: Journeys - Detail Access
 *
 * Tests: B-JRN-002: Journey Detail Access
 *
 * Verifies that:
 * - Authenticated users can fetch full journey data (content, steps, metadata)
 * - Unpublished journeys return no data
 * - Journey content (JSONB steps) is correctly structured and readable
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

describe('B-JRN-002: Journey Detail Access', () => {
  let testUser: any;
  let publishedJourney: any;
  let unpublishedJourney: any;
  const admin = createAdminClient();

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'Detail Test User' });
    const { personalGroupId } = testUser;

    const { data: published } = await admin
      .from('journeys')
      .insert({
        ...testJourneyMultiStep,
        title: 'Detail Test Journey (Published)',
        is_published: true,
        created_by_group_id: personalGroupId,
      })
      .select()
      .single();

    publishedJourney = published;

    const { data: unpublished } = await admin
      .from('journeys')
      .insert({
        ...testJourneyMultiStep,
        title: 'Detail Test Journey (Unpublished)',
        is_published: false,
        created_by_group_id: personalGroupId,
      })
      .select()
      .single();

    unpublishedJourney = unpublished;
  });

  afterAll(async () => {
    if (publishedJourney) await cleanupTestJourney(publishedJourney.id);
    if (unpublishedJourney) await cleanupTestJourney(unpublishedJourney.id);
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  it('should allow authenticated user to fetch full journey details', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const { data: journey, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', publishedJourney.id)
      .single();

    expect(error).toBeNull();
    expect(journey).toBeDefined();
    expect(journey!.id).toBe(publishedJourney.id);
    expect(journey!.title).toBe('Detail Test Journey (Published)');

    await supabase.auth.signOut();
  });

  it('should return journey content including steps array', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const { data: journey } = await supabase
      .from('journeys')
      .select('content')
      .eq('id', publishedJourney.id)
      .single();

    expect(journey).toBeDefined();
    expect(journey!.content).toBeDefined();
    expect(journey!.content.version).toBe('1.0');
    expect(journey!.content.structure).toBe('linear');
    expect(Array.isArray(journey!.content.steps)).toBe(true);
    expect(journey!.content.steps).toHaveLength(5);

    await supabase.auth.signOut();
  });

  it('should return correctly structured step data', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const { data: journey } = await supabase
      .from('journeys')
      .select('content')
      .eq('id', publishedJourney.id)
      .single();

    const step1 = journey!.content.steps[0];
    expect(step1.id).toBe('step_1');
    expect(step1.title).toBe('Introduction');
    expect(step1.type).toBe('content');
    expect(step1.duration_minutes).toBe(30);
    expect(step1.required).toBe(true);

    // Check optional step
    const step4 = journey!.content.steps[3];
    expect(step4.id).toBe('step_4');
    expect(step4.required).toBe(false);

    await supabase.auth.signOut();
  });

  it('should return step types: content, activity, and assessment', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const { data: journey } = await supabase
      .from('journeys')
      .select('content')
      .eq('id', publishedJourney.id)
      .single();

    const stepTypes = journey!.content.steps.map((s: any) => s.type);
    expect(stepTypes).toContain('content');
    expect(stepTypes).toContain('activity');
    expect(stepTypes).toContain('assessment');

    await supabase.auth.signOut();
  });

  it('should return null for unpublished journey', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const { data: journey, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', unpublishedJourney.id)
      .single();

    expect(journey).toBeNull();
    expect(error).not.toBeNull(); // Row not found

    await supabase.auth.signOut();
  });

  it('should return null for non-existent journey ID', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const { data: journey, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000')
      .single();

    expect(journey).toBeNull();
    expect(error).not.toBeNull();

    await supabase.auth.signOut();
  });

  it('should return all metadata fields needed for detail page', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const { data: journey } = await supabase
      .from('journeys')
      .select('id, title, description, difficulty_level, estimated_duration_minutes, tags, journey_type, is_published, created_at')
      .eq('id', publishedJourney.id)
      .single();

    expect(journey!.difficulty_level).toBe('beginner');
    expect(journey!.estimated_duration_minutes).toBe(155);
    expect(journey!.journey_type).toBe('predefined');
    expect(journey!.created_at).toBeDefined();

    await supabase.auth.signOut();
  });
});
