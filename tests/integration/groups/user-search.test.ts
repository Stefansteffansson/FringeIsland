/**
 * Integration Tests: User Search Typeahead
 *
 * Tests: B-GRP-006: User Search Typeahead
 *
 * Verifies that authenticated users can search for other users by name or email
 * via the users table, and that results are limited and filterable.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-GRP-006: User Search Typeahead', () => {
  let searcher: any;
  let searchTarget1: any;
  let searchTarget2: any;

  beforeAll(async () => {
    // Create searcher and two targets with distinctive names
    searcher = await createTestUser({ displayName: 'Searcher User' });
    searchTarget1 = await createTestUser({ displayName: 'Alice Typeahead' });
    searchTarget2 = await createTestUser({ displayName: 'Bob Typeahead' });
  });

  afterAll(async () => {
    if (searchTarget2) await cleanupTestUser(searchTarget2.user.id);
    if (searchTarget1) await cleanupTestUser(searchTarget1.user.id);
    if (searcher) await cleanupTestUser(searcher.user.id);
  }, 15000);

  it('should find users by partial name match (ilike)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, searcher.email, searcher.password);

    const query = 'Typeahead';
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url, personal_group_id')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(8);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(2);

    const names = data!.map((u: any) => u.full_name);
    expect(names).toContain('Alice Typeahead');
    expect(names).toContain('Bob Typeahead');

    await supabase.auth.signOut();
  });

  it('should find users by partial email match (ilike)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, searcher.email, searcher.password);

    // Use a fragment of the target's email (the unique part from generateTestEmail)
    const emailPrefix = searchTarget1.email.split('@')[0];
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url, personal_group_id')
      .or(`full_name.ilike.%${emailPrefix}%,email.ilike.%${emailPrefix}%`)
      .limit(8);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    expect(data![0].email).toBe(searchTarget1.email);

    await supabase.auth.signOut();
  });

  it('should return max 8 results when limit is applied', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, searcher.email, searcher.password);

    // Search for a very common substring — should be capped at 8
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url, personal_group_id')
      .or('full_name.ilike.%test%,email.ilike.%test%')
      .limit(8);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBeLessThanOrEqual(8);

    await supabase.auth.signOut();
  });

  it('should return empty results for non-matching query', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, searcher.email, searcher.password);

    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url, personal_group_id')
      .or('full_name.ilike.%zzzznonexistent99999%,email.ilike.%zzzznonexistent99999%')
      .limit(8);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBe(0);

    await supabase.auth.signOut();
  });
});
