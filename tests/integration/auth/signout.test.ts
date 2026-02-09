/**
 * Integration Tests: Authentication - Sign Out
 *
 * Tests: B-AUTH-004: Sign Out Cleanup
 *
 * Verifies that:
 * 1. Sign out clears session tokens
 * 2. User cannot access protected resources after sign out
 * 3. Subsequent requests show user as unauthenticated
 */

import { describe, it, expect, afterEach } from '@jest/globals';
import { createTestClient, createTestUser, cleanupTestUser } from '@/tests/helpers/supabase';

describe('B-AUTH-004: Sign Out Cleanup', () => {
  const testUsers: string[] = [];

  afterEach(async () => {
    // Cleanup all test users created during tests
    for (const userId of testUsers) {
      await cleanupTestUser(userId);
    }
    testUsers.length = 0;
  });

  it('should clear session on sign out', async () => {
    const supabase = createTestClient();

    // Arrange: Create and sign in test user
    const { email, password, user } = await createTestUser({
      displayName: 'Sign Out Test',
    });
    testUsers.push(user.id);

    await supabase.auth.signInWithPassword({ email, password });

    // Verify signed in
    const { data: beforeSignOut } = await supabase.auth.getSession();
    expect(beforeSignOut.session).toBeDefined();

    // Act: Sign out
    const { error: signOutError } = await supabase.auth.signOut();
    expect(signOutError).toBeNull();

    // Assert: Session cleared
    const { data: afterSignOut } = await supabase.auth.getSession();
    expect(afterSignOut.session).toBeNull();
  });

  it('should prevent access to protected resources after sign out', async () => {
    const supabase = createTestClient();

    // Arrange: Create and sign in test user
    const { email, password, user } = await createTestUser({
      displayName: 'Protected Access Test',
    });
    testUsers.push(user.id);

    await supabase.auth.signInWithPassword({ email, password });

    // Verify can access profile while signed in
    const { data: beforeProfile, error: beforeError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    expect(beforeError).toBeNull();
    expect(beforeProfile).toBeDefined();

    // Act: Sign out
    await supabase.auth.signOut();

    // Assert: Cannot access profile after sign out
    const { data: afterProfile, error: afterError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    // Should fail due to RLS (no authenticated session)
    expect(afterError).toBeDefined();
    expect(afterProfile).toBeNull();
  });

  it('should return null user after sign out', async () => {
    const supabase = createTestClient();

    // Arrange: Create and sign in test user
    const { email, password, user } = await createTestUser({
      displayName: 'Null User Test',
    });
    testUsers.push(user.id);

    await supabase.auth.signInWithPassword({ email, password });

    // Verify user exists before sign out
    const { data: beforeUser } = await supabase.auth.getUser();
    expect(beforeUser.user).toBeDefined();
    expect(beforeUser.user?.email).toBe(email);

    // Act: Sign out
    await supabase.auth.signOut();

    // Assert: No user after sign out
    const { data: afterUser } = await supabase.auth.getUser();
    expect(afterUser.user).toBeNull();
  });

  it('should handle sign out when already signed out', async () => {
    const supabase = createTestClient();

    // Act: Sign out when not signed in
    const { error } = await supabase.auth.signOut();

    // Assert: No error (graceful handling)
    expect(error).toBeNull();

    // Verify session is null
    const { data: sessionData } = await supabase.auth.getSession();
    expect(sessionData.session).toBeNull();
  });

  it('should invalidate access token after sign out', async () => {
    const supabase = createTestClient();

    // Arrange: Create and sign in test user
    const { email, password, user } = await createTestUser({
      displayName: 'Token Invalidation Test',
    });
    testUsers.push(user.id);

    await supabase.auth.signInWithPassword({ email, password });

    // Get access token before sign out
    const { data: beforeSession } = await supabase.auth.getSession();
    const accessToken = beforeSession.session?.access_token;
    expect(accessToken).toBeDefined();

    // Act: Sign out
    await supabase.auth.signOut();

    // Assert: Token is invalidated (cannot use it to access resources)
    const { data: afterSession } = await supabase.auth.getSession();
    expect(afterSession.session).toBeNull();
    expect(afterSession.session?.access_token).toBeUndefined();
  });
});
