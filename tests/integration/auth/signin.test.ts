/**
 * Integration Tests: Authentication - Sign In
 *
 * Tests: B-AUTH-002: Sign In Requires Active Profile
 *
 * Verifies that:
 * 1. Users with active profiles can sign in successfully
 * 2. Users with inactive profiles (is_active=false) cannot access the app
 * 3. Session loads correctly for active users
 */

import { describe, it, expect, afterEach } from '@jest/globals';
import { createTestClient, createAdminClient, createTestUser, cleanupTestUser } from '@/tests/helpers/supabase';

describe('B-AUTH-002: Sign In Requires Active Profile', () => {
  const testUsers: string[] = [];

  afterEach(async () => {
    // Cleanup all test users created during tests
    for (const userId of testUsers) {
      await cleanupTestUser(userId);
    }
    testUsers.length = 0;
  });

  it('should allow sign in with valid credentials and active profile', async () => {
    const supabase = createTestClient();

    // Arrange: Create test user with active profile
    const { email, password, user } = await createTestUser({
      displayName: 'Active User Test',
    });
    testUsers.push(user.id);

    // Act: Sign in with valid credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Assert: Sign in successful
    expect(authError).toBeNull();
    expect(authData.user).toBeDefined();
    expect(authData.user?.email).toBe(email);
    expect(authData.session).toBeDefined();
    expect(authData.session?.access_token).toBeDefined();
  });

  it('should block access for users with inactive profiles (is_active=false)', async () => {
    const admin = createAdminClient();
    const supabase = createTestClient();

    // Arrange: Create test user
    const { email, password, user, profile } = await createTestUser({
      displayName: 'Inactive User Test',
    });
    testUsers.push(user.id);

    // Deactivate the user profile (soft delete)
    await admin
      .from('users')
      .update({ is_active: false })
      .eq('id', profile.id);

    // Act: Try to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Note: Supabase Auth will allow sign in (credentials valid)
    // But RLS policies should prevent access to data
    expect(authError).toBeNull(); // Auth succeeds
    expect(authData.user).toBeDefined();

    // Assert: Cannot access user profile via RLS
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    // RLS should block access to inactive profiles
    // Either returns null or throws RLS error
    const accessBlocked = profileData === null || profileError !== null;
    expect(accessBlocked).toBe(true);
  });

  it('should fail sign in with invalid credentials', async () => {
    const supabase = createTestClient();

    // Arrange: Create test user
    const { email, user } = await createTestUser({
      displayName: 'Invalid Credentials Test',
    });
    testUsers.push(user.id);

    // Act: Try to sign in with wrong password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: 'WrongPassword123!',
    });

    // Assert: Sign in failed
    expect(authError).toBeDefined();
    expect(authData.user).toBeNull();
    expect(authData.session).toBeNull();
  });

  it('should fail sign in with non-existent email', async () => {
    const supabase = createTestClient();

    // Act: Try to sign in with email that doesn't exist
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'nonexistent@fringeisland.test',
      password: 'Test123!@#$',
    });

    // Assert: Sign in failed
    expect(authError).toBeDefined();
    expect(authData.user).toBeNull();
    expect(authData.session).toBeNull();
  });

  it('should load session with user profile data', async () => {
    const supabase = createTestClient();

    // Arrange: Create and sign in test user
    const { email, password, user } = await createTestUser({
      displayName: 'Session Load Test',
    });
    testUsers.push(user.id);

    await supabase.auth.signInWithPassword({ email, password });

    // Act: Get current session
    const { data: sessionData } = await supabase.auth.getSession();

    // Assert: Session contains user data
    expect(sessionData.session).toBeDefined();
    expect(sessionData.session?.user).toBeDefined();
    expect(sessionData.session?.user.email).toBe(email);

    // Assert: Can fetch profile with session
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    expect(profileError).toBeNull();
    expect(profileData).toBeDefined();
    expect(profileData?.email).toBe(email);
    expect(profileData?.is_active).toBe(true);
  });
});
