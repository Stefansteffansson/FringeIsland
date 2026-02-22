/**
 * Supabase Test Helpers (D15 Universal Group Pattern)
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
 *
 * D15 cleanup chain:
 * 1. Look up the user's personal_group_id
 * 2. Delete any journeys created by personal group (RESTRICT FK)
 * 3. Delete the personal group (CASCADE handles memberships, roles,
 *    enrollments, notifications, conversations)
 * 4. Delete from auth.users (CASCADE removes public.users row)
 */
export const cleanupTestUser = async (userId: string) => {
  const admin = createAdminClient();

  // Look up the public.users profile (get personal_group_id for cleanup)
  const { data: profile } = await admin
    .from('users')
    .select('id, personal_group_id')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (profile?.personal_group_id) {
    // Handle RESTRICT FK: delete journeys created by this personal group
    await admin
      .from('journeys')
      .delete()
      .eq('created_by_group_id', profile.personal_group_id);

    // Delete the personal group — CASCADE handles:
    //   - group_memberships (member_group_id or group_id)
    //   - user_group_roles (member_group_id or group_id)
    //   - journey_enrollments (group_id)
    //   - notifications (recipient_group_id)
    //   - conversations (participant_1 or participant_2)
    //   - forum_posts.author_group_id → SET NULL
    //   - direct_messages.sender_group_id → SET NULL
    //   - admin_audit_log.actor_group_id → SET NULL
    await admin
      .from('groups')
      .delete()
      .eq('id', profile.personal_group_id);
  }

  // Delete from auth.users (CASCADE removes public.users row)
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
 * Clean up test journey and all related enrollments
 */
export const cleanupTestJourney = async (journeyId: string) => {
  const admin = createAdminClient();

  // Delete enrollments first
  await admin
    .from('journey_enrollments')
    .delete()
    .eq('journey_id', journeyId);

  // Delete journey
  const { error } = await admin
    .from('journeys')
    .delete()
    .eq('id', journeyId);

  if (error) {
    console.error('Failed to cleanup test journey:', error);
  }
};

/**
 * Clean up a specific journey enrollment
 */
export const cleanupTestEnrollment = async (enrollmentId: string) => {
  const admin = createAdminClient();

  const { error } = await admin
    .from('journey_enrollments')
    .delete()
    .eq('id', enrollmentId);

  if (error) {
    console.error('Failed to cleanup test enrollment:', error);
  }
};

/**
 * Sign in a test user with retry on auth rate limit.
 *
 * Tests call signInWithPassword without checking the return value, so a
 * silent rate-limit failure leaves the client unauthenticated. This helper
 * verifies the session was actually created and retries with backoff if not.
 *
 * Usage (replaces raw signInWithPassword in tests):
 *   await signInWithRetry(supabase, email, password);
 */
export const signInWithRetry = async (
  supabase: ReturnType<typeof createTestClient>,
  email: string,
  password: string,
  maxRetries = 3,
): Promise<void> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error) {
      // Verify we actually have a session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return;
    }

    if (attempt < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error(`signInWithRetry: failed to sign in as ${email} after ${maxRetries} attempts`);
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
 * Returns { user, profile, personalGroupId, email, password }
 *
 * D15: The handle_new_user() trigger creates a personal group and sets
 * personal_group_id on the users row. personalGroupId is the user's
 * identity in the group system.
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

  // Get profile (should be created by trigger, including personal_group_id)
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
    personalGroupId: profile.personal_group_id as string,
    email,
    password,
  };
};
