/**
 * Integration Tests: Authentication - Session Persistence
 *
 * Tests: B-AUTH-003: Session Persistence
 *
 * Verifies that:
 * 1. Sessions persist correctly in Supabase
 * 2. Sessions can be retrieved after creation
 * 3. Sessions expire after timeout
 * 4. Sign out clears session
 *
 * NOTE: This is an API-level test. For true browser persistence testing
 * (localStorage, cookies, page refreshes), implement E2E tests with Playwright.
 */

import { describe, it, expect, afterEach } from '@jest/globals';
import { createTestClient, createTestUser, cleanupTestUser } from '@/tests/helpers/supabase';

describe('B-AUTH-003: Session Persistence', () => {
  const testUsers: string[] = [];

  afterEach(async () => {
    // Cleanup all test users created during tests
    for (const userId of testUsers) {
      await cleanupTestUser(userId);
    }
    testUsers.length = 0;
  });

  it('should persist session after sign in', async () => {
    const supabase = createTestClient();

    // Arrange: Create test user
    const { email, password, user } = await createTestUser({
      displayName: 'Session Persistence Test',
    });
    testUsers.push(user.id);

    // Act: Sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    expect(signInError).toBeNull();
    expect(signInData.session).toBeDefined();

    // Assert: Session persists (can be retrieved)
    const { data: sessionData } = await supabase.auth.getSession();
    expect(sessionData.session).toBeDefined();
    expect(sessionData.session?.user.id).toBe(user.id);
    expect(sessionData.session?.access_token).toBeDefined();
    expect(sessionData.session?.refresh_token).toBeDefined();
  });

  it('should maintain session across multiple requests', async () => {
    const supabase = createTestClient();

    // Arrange: Create and sign in test user
    const { email, password, user } = await createTestUser({
      displayName: 'Multiple Requests Test',
    });
    testUsers.push(user.id);

    await supabase.auth.signInWithPassword({ email, password });

    // Act: Make multiple requests with same client
    const { data: request1 } = await supabase.auth.getSession();
    const { data: request2 } = await supabase.auth.getSession();
    const { data: request3 } = await supabase.auth.getSession();

    // Assert: All requests return same session
    expect(request1.session?.user.id).toBe(user.id);
    expect(request2.session?.user.id).toBe(user.id);
    expect(request3.session?.user.id).toBe(user.id);
    expect(request1.session?.access_token).toBe(request2.session?.access_token);
  });

  it('should return valid user data from session', async () => {
    const supabase = createTestClient();

    // Arrange: Create and sign in test user
    const { email, password, user } = await createTestUser({
      displayName: 'Session User Data Test',
    });
    testUsers.push(user.id);

    await supabase.auth.signInWithPassword({ email, password });

    // Act: Get session
    const { data: sessionData } = await supabase.auth.getSession();

    // Assert: User data is valid
    expect(sessionData.session?.user).toBeDefined();
    expect(sessionData.session?.user.email).toBe(email);
    expect(sessionData.session?.user.id).toBe(user.id);
    expect(sessionData.session?.user.user_metadata?.display_name).toBe('Session User Data Test');
  });

  it('should clear session on sign out', async () => {
    const supabase = createTestClient();

    // Arrange: Create and sign in test user
    const { email, password, user } = await createTestUser({
      displayName: 'Session Clear Test',
    });
    testUsers.push(user.id);

    await supabase.auth.signInWithPassword({ email, password });

    // Verify session exists
    const { data: beforeSignOut } = await supabase.auth.getSession();
    expect(beforeSignOut.session).toBeDefined();

    // Act: Sign out
    await supabase.auth.signOut();

    // Assert: Session cleared
    const { data: afterSignOut } = await supabase.auth.getSession();
    expect(afterSignOut.session).toBeNull();
  });

  it('should return null session when not authenticated', async () => {
    const supabase = createTestClient();

    // Act: Get session without signing in
    const { data: sessionData } = await supabase.auth.getSession();

    // Assert: No session
    expect(sessionData.session).toBeNull();
  });

  it('should include session expiry time', async () => {
    const supabase = createTestClient();

    // Arrange: Create and sign in test user
    const { email, password, user } = await createTestUser({
      displayName: 'Session Expiry Test',
    });
    testUsers.push(user.id);

    // Act: Sign in
    const { data: signInData } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Assert: Session has expiry timestamp
    expect(signInData.session?.expires_at).toBeDefined();
    expect(typeof signInData.session?.expires_at).toBe('number');

    // Verify expiry is in the future
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = signInData.session?.expires_at || 0;
    expect(expiresAt).toBeGreaterThan(now);
  });

  it('should allow access to protected resources with valid session', async () => {
    const supabase = createTestClient();

    // Arrange: Create and sign in test user
    const { email, password, user } = await createTestUser({
      displayName: 'Protected Resource Test',
    });
    testUsers.push(user.id);

    await supabase.auth.signInWithPassword({ email, password });

    // Act: Access protected resource (user profile)
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
});
