/**
 * Integration Tests: Authentication - Sign Up
 *
 * Tests: B-AUTH-001: Sign Up Creates Profile
 *
 * Verifies that the sign-up process creates both:
 * 1. An auth.users record (Supabase Auth)
 * 2. A public.users profile record (via trigger)
 */

import { describe, it, expect, afterEach } from '@jest/globals';
import { createTestClient, cleanupTestUser, generateTestEmail } from '@/tests/helpers/supabase';

describe('B-AUTH-001: Sign Up Creates Profile', () => {
  const testUsers: string[] = [];

  afterEach(async () => {
    // Cleanup all test users created during tests
    for (const userId of testUsers) {
      await cleanupTestUser(userId);
    }
    testUsers.length = 0;
  });

  it('should create both auth user and profile on sign up', async () => {
    const supabase = createTestClient();
    const email = generateTestEmail();
    const password = 'Test123!@#$';
    const displayName = 'Integration Test User';

    // Act: Sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    // Assert: Auth user created
    expect(authError).toBeNull();
    expect(authData.user).toBeDefined();
    expect(authData.user?.email).toBe(email);

    if (authData.user) {
      testUsers.push(authData.user.id);

      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 500));

      // Assert: Profile created by trigger
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();

      expect(profileError).toBeNull();
      expect(profile).toBeDefined();
      expect(profile?.email).toBe(email);
      expect(profile?.full_name).toBe(displayName);
      expect(profile?.auth_user_id).toBe(authData.user.id);
      expect(profile?.is_active).toBe(true);
    }
  });

  it('should prevent duplicate email sign ups', async () => {
    const supabase = createTestClient();
    const email = generateTestEmail();
    const password = 'Test123!@#$';

    // First sign up - should succeed
    const { data: firstSignup, error: firstError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: 'First User' },
      },
    });

    expect(firstError).toBeNull();
    if (firstSignup.user) {
      testUsers.push(firstSignup.user.id);
    }

    // Second sign up with same email - should fail
    const { data: secondSignup, error: secondError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: 'Second User' },
      },
    });

    // Supabase may return different errors depending on configuration
    // Either error is returned, or user is null/rate limited
    const signupFailed = secondError !== null || secondSignup.user === null;
    expect(signupFailed).toBe(true);
  });

  it('should link profile to auth user with foreign key', async () => {
    const supabase = createTestClient();
    const email = generateTestEmail();
    const password = 'Test123!@#$';

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: 'FK Test User' },
      },
    });

    expect(authError).toBeNull();
    if (authData.user) {
      testUsers.push(authData.user.id);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify foreign key relationship
      const { data: profile } = await supabase
        .from('users')
        .select('auth_user_id')
        .eq('auth_user_id', authData.user.id)
        .single();

      expect(profile?.auth_user_id).toBe(authData.user.id);
    }
  });

  it('should set default values on profile creation', async () => {
    const supabase = createTestClient();
    const email = generateTestEmail();
    const password = 'Test123!@#$';

    const { data: authData } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: 'Default Values Test' },
      },
    });

    if (authData.user) {
      testUsers.push(authData.user.id);

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();

      // Assert default values
      expect(profile?.is_active).toBe(true);
      expect(profile?.created_at).toBeDefined();
      expect(profile?.updated_at).toBeDefined();
      expect(profile?.avatar_url).toBeNull(); // No avatar yet
      expect(profile?.bio).toBeNull(); // No bio yet
    }
  });
});
