/**
 * Integration Tests: Journeys - Catalog Discovery
 *
 * Tests: B-JRN-001: Journey Catalog Discovery
 *
 * Verifies that:
 * - Only published journeys are visible to authenticated users
 * - Unpublished journeys are never visible regardless of other conditions
 * - RLS enforces visibility at the database level (not just UI)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  cleanupTestJourney,
  createAdminClient,
} from '@/tests/helpers/supabase';
import { testJourney } from '@/tests/helpers/fixtures';

describe('B-JRN-001: Journey Catalog Discovery (RLS)', () => {
  let testUser: any;
  let publishedJourney: any;
  let unpublishedJourney: any;
  const admin = createAdminClient();

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'Catalog Test User' });
    const { personalGroupId } = testUser;

    // Create a published journey
    const { data: published } = await admin
      .from('journeys')
      .insert({
        ...testJourney,
        title: 'Published Test Journey',
        is_published: true,
        created_by_group_id: personalGroupId,
      })
      .select()
      .single();

    publishedJourney = published;

    // Create an unpublished journey (draft)
    const { data: unpublished } = await admin
      .from('journeys')
      .insert({
        ...testJourney,
        title: 'Unpublished Draft Journey',
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

  it('should show published journeys to authenticated users', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const { data: journeys, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', publishedJourney.id);

    expect(error).toBeNull();
    expect(journeys).toHaveLength(1);
    expect(journeys![0].id).toBe(publishedJourney.id);
    expect(journeys![0].is_published).toBe(true);

    await supabase.auth.signOut();
  });

  it('should hide unpublished journeys from authenticated users', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const { data: journeys, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', unpublishedJourney.id);

    expect(error).toBeNull();
    expect(journeys).toHaveLength(0); // RLS filters it out
    await supabase.auth.signOut();
  });

  it('should filter catalog to only published journeys when querying multiple', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const { data: journeys, error } = await supabase
      .from('journeys')
      .select('*')
      .in('id', [publishedJourney.id, unpublishedJourney.id]);

    expect(error).toBeNull();
    expect(journeys).toHaveLength(1); // Only the published one
    expect(journeys![0].id).toBe(publishedJourney.id);

    await supabase.auth.signOut();
  });

  it('should block unpublished journey access even with direct ID query', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    // Try to access unpublished journey by direct ID (like a URL parameter)
    const { data: journey, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', unpublishedJourney.id)
      .single();

    // RLS blocks the row - single() returns error when no row found
    expect(journey).toBeNull();
    expect(error).not.toBeNull();

    await supabase.auth.signOut();
  });

  it('should return journey title, description, difficulty, duration, and tags', async () => {
    const supabase = createTestClient();
    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const { data: journey } = await supabase
      .from('journeys')
      .select('id, title, description, difficulty_level, estimated_duration_minutes, tags, is_published')
      .eq('id', publishedJourney.id)
      .single();

    expect(journey).toBeDefined();
    expect(journey!.title).toBe('Published Test Journey');
    expect(journey!.difficulty_level).toBe('beginner');
    expect(journey!.estimated_duration_minutes).toBe(60);
    expect(journey!.is_published).toBe(true);

    await supabase.auth.signOut();
  });

  it('should block access for unauthenticated (anon) users', async () => {
    // Use unauthenticated anon client (no sign-in)
    const supabase = createTestClient();

    const { data: journeys } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', publishedJourney.id);

    // Anon role is not in the authenticated RLS policy — should return empty
    expect(journeys).toHaveLength(0);
  });
});
