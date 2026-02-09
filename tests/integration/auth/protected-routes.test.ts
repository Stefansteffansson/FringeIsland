/**
 * Integration Tests: Authentication - Protected Routes
 *
 * Tests: B-AUTH-005: Protected Route Enforcement
 *
 * Verifies that:
 * 1. Authenticated users can access protected resources
 * 2. Unauthenticated users cannot access protected resources
 * 3. RLS policies enforce access control at database level
 *
 * NOTE: This tests RLS enforcement at the API level. For true route protection
 * testing (middleware, redirects, browser navigation), implement E2E tests with Playwright.
 */

import { describe, it, expect, afterEach } from '@jest/globals';
import { createTestClient, createTestUser, cleanupTestUser, cleanupTestGroup } from '@/tests/helpers/supabase';

describe('B-AUTH-005: Protected Route Enforcement', () => {
  const testUsers: string[] = [];
  const testGroups: string[] = [];

  afterEach(async () => {
    // Cleanup test data
    for (const groupId of testGroups) {
      await cleanupTestGroup(groupId);
    }
    for (const userId of testUsers) {
      await cleanupTestUser(userId);
    }
    testUsers.length = 0;
    testGroups.length = 0;
  });

  it('should allow authenticated users to access their profile', async () => {
    const supabase = createTestClient();

    // Arrange: Create and sign in test user
    const { email, password, user } = await createTestUser({
      displayName: 'Authenticated Access Test',
    });
    testUsers.push(user.id);

    await supabase.auth.signInWithPassword({ email, password });

    // Act: Access own profile
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    // Assert: Access granted
    expect(profileError).toBeNull();
    expect(profileData).toBeDefined();
    expect(profileData?.email).toBe(email);
  });

  it('should block unauthenticated users from accessing profiles', async () => {
    const authenticatedSupabase = createTestClient();
    const unauthenticatedSupabase = createTestClient();

    // Arrange: Create user but don't sign in with second client
    const { user } = await createTestUser({
      displayName: 'Unauthenticated Block Test',
    });
    testUsers.push(user.id);

    // Act: Try to access profile without authentication
    const { data: profileData, error: profileError } = await unauthenticatedSupabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    // Assert: Access denied by RLS
    expect(profileError).toBeDefined();
    expect(profileData).toBeNull();
  });

  it('should allow authenticated users to view their groups', async () => {
    const supabase = createTestClient();

    // Arrange: Create and sign in test user
    const { email, password, user, profile } = await createTestUser({
      displayName: 'Groups Access Test',
    });
    testUsers.push(user.id);

    await supabase.auth.signInWithPassword({ email, password });

    // Create a test group
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: 'Test Group',
        description: 'Group for RLS testing',
        created_by_user_id: profile.id,
      })
      .select()
      .single();

    expect(groupError).toBeNull();
    if (groupData) {
      testGroups.push(groupData.id);
    }

    // Act: Query groups
    const { data: groupsData, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .eq('created_by_user_id', profile.id);

    // Assert: Can see own groups
    expect(groupsError).toBeNull();
    expect(groupsData).toBeDefined();
    expect(groupsData?.length).toBeGreaterThan(0);
  });

  it('should block unauthenticated users from accessing groups', async () => {
    const authenticatedSupabase = createTestClient();
    const unauthenticatedSupabase = createTestClient();

    // Arrange: Create authenticated user and group
    const { email, password, user, profile } = await createTestUser({
      displayName: 'Unauthenticated Groups Test',
    });
    testUsers.push(user.id);

    await authenticatedSupabase.auth.signInWithPassword({ email, password });

    const { data: groupData } = await authenticatedSupabase
      .from('groups')
      .insert({
        name: 'Private Test Group',
        description: 'Should not be accessible',
        created_by_user_id: profile.id,
        is_public: false,
      })
      .select()
      .single();

    if (groupData) {
      testGroups.push(groupData.id);
    }

    // Act: Try to access group without authentication
    const { data: unauthGroupData, error: unauthGroupError } = await unauthenticatedSupabase
      .from('groups')
      .select('*')
      .eq('id', groupData?.id);

    // Assert: Cannot see private group
    expect(unauthGroupData?.length).toBe(0);
  });

  it('should allow users to update their own profile only', async () => {
    const supabase1 = createTestClient();
    const supabase2 = createTestClient();

    // Arrange: Create two test users
    const user1 = await createTestUser({ displayName: 'User 1' });
    const user2 = await createTestUser({ displayName: 'User 2' });
    testUsers.push(user1.user.id, user2.user.id);

    await supabase1.auth.signInWithPassword({ email: user1.email, password: user1.password });
    await supabase2.auth.signInWithPassword({ email: user2.email, password: user2.password });

    // Act: User 1 tries to update User 2's profile
    const { error: updateError } = await supabase1
      .from('users')
      .update({ bio: 'Hacked!' })
      .eq('id', user2.profile.id);

    // Assert: Update blocked by RLS
    expect(updateError).toBeDefined();

    // Verify User 2's profile unchanged
    const { data: user2Profile } = await supabase2
      .from('users')
      .select('bio')
      .eq('id', user2.profile.id)
      .single();

    expect(user2Profile?.bio).not.toBe('Hacked!');
  });

  it('should allow users to search other users by email (for invitations)', async () => {
    const supabase = createTestClient();

    // Arrange: Create two users
    const user1 = await createTestUser({ displayName: 'Searcher', email: 'searcher@fringeisland.test' });
    const user2 = await createTestUser({ displayName: 'Searchable', email: 'searchable@fringeisland.test' });
    testUsers.push(user1.user.id, user2.user.id);

    await supabase.auth.signInWithPassword({ email: user1.email, password: user1.password });

    // Act: User 1 searches for User 2 by email
    const { data: searchResults, error: searchError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('email', 'searchable@fringeisland.test');

    // Assert: Search successful (RLS allows SELECT by email)
    expect(searchError).toBeNull();
    expect(searchResults?.length).toBe(1);
    expect(searchResults?.[0].email).toBe('searchable@fringeisland.test');
  });

  it('should prevent access after sign out', async () => {
    const supabase = createTestClient();

    // Arrange: Create and sign in test user
    const { email, password, user } = await createTestUser({
      displayName: 'Sign Out Access Test',
    });
    testUsers.push(user.id);

    await supabase.auth.signInWithPassword({ email, password });

    // Verify can access while signed in
    const { data: beforeProfile, error: beforeError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    expect(beforeError).toBeNull();
    expect(beforeProfile).toBeDefined();

    // Act: Sign out
    await supabase.auth.signOut();

    // Assert: Cannot access after sign out
    const { data: afterProfile, error: afterError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    expect(afterError).toBeDefined();
    expect(afterProfile).toBeNull();
  });
});
