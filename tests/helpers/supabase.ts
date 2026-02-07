/**
 * Supabase Test Helpers
 *
 * Utilities for integration tests that interact with Supabase.
 * Uses service role key for full access (bypassing RLS in setup/teardown).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in environment');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in environment');
}

/**
 * Create a Supabase client with anon key (respects RLS)
 * Use this for testing user-facing operations
 */
export const createTestClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * Create a Supabase client with service role key (bypasses RLS)
 * Use this ONLY for test setup/teardown, not for testing RLS policies
 */
export const createAdminClient = () => {
  if (!supabaseServiceKey) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set - admin operations will fail');
    console.warn('⚠️  Set this in .env.local for integration tests');
    // Return anon client as fallback (tests will fail, but won't crash)
    return createTestClient();
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * Clean up test data (use carefully!)
 * Deletes users created during tests
 */
export const cleanupTestUser = async (userId: string) => {
  const admin = createAdminClient();

  // Delete from auth.users (CASCADE deletes public.users)
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    console.error('Failed to cleanup test user:', error);
  }
};

/**
 * Clean up test group
 */
export const cleanupTestGroup = async (groupId: string) => {
  const admin = createAdminClient();

  // Delete group (CASCADE handles memberships, roles, etc.)
  const { error } = await admin
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    console.error('Failed to cleanup test group:', error);
  }
};

/**
 * Generate unique test email
 */
export const generateTestEmail = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-${timestamp}-${random}@fringeisland.test`;
};

/**
 * Create a test user (bypasses normal signup flow)
 * Returns { user, profile }
 */
export const createTestUser = async (options?: {
  email?: string;
  password?: string;
  displayName?: string;
}) => {
  const admin = createAdminClient();

  const email = options?.email || generateTestEmail();
  const password = options?.password || 'Test123!@#$';
  const displayName = options?.displayName || 'Test User';

  // Create user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Skip email verification
    user_metadata: {
      display_name: displayName,
    },
  });

  if (authError) {
    throw new Error(`Failed to create test user: ${authError.message}`);
  }

  // Get profile (should be created by trigger)
  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('*')
    .eq('auth_user_id', authData.user.id)
    .single();

  if (profileError) {
    throw new Error(`Failed to fetch user profile: ${profileError.message}`);
  }

  return {
    user: authData.user,
    profile,
    email,
    password,
  };
};
