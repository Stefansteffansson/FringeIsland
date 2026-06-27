/**
 * Supabase test helpers (D15 universal group pattern).
 *
 * Copy-with-correction from the hub-legacy oracle, trimmed to what the
 * FEAT-H001 walking skeleton needs. The anon client respects RLS (user-facing
 * assertions); the service-role admin client bypasses RLS (setup/teardown only).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in environment');
if (!supabaseAnonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in environment');

/** Anon client — respects RLS. Use for user-facing assertions. */
export const createTestClient = (): SupabaseClient =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

/** Service-role client — bypasses RLS. Use ONLY for setup/teardown. */
export const createAdminClient = (): SupabaseClient => {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY required for admin (setup/teardown) operations');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export const generateTestEmail = (seed: string): string =>
  `test-${seed}-${Math.abs(hashString(seed + supabaseUrl))}@fringeisland.test`;

// Deterministic-ish unique suffix without Math.random()/Date.now() coupling in
// the helper signature — callers pass a unique seed per test.
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export type TestUser = {
  user: { id: string; email?: string };
  personalGroupId: string;
  email: string;
  password: string;
};

/**
 * Create a test user, bypassing the normal signup flow. The handle_new_user()
 * trigger creates the personal group and sets personal_group_id — the user's
 * identity in the group system.
 */
export const createTestUser = async (options?: {
  email?: string;
  password?: string;
  displayName?: string;
}): Promise<TestUser> => {
  const admin = createAdminClient();
  const email = options?.email || generateTestEmail(`${process.hrtime.bigint()}`);
  const password = options?.password || 'Test123!@#$';
  const displayName = options?.displayName || 'Test User';

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (authError) throw new Error(`Failed to create test user: ${authError.message}`);

  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('*')
    .eq('auth_user_id', authData.user.id)
    .single();
  if (profileError) throw new Error(`Failed to fetch user profile: ${profileError.message}`);

  return {
    user: authData.user,
    personalGroupId: profile.personal_group_id as string,
    email,
    password,
  };
};

/**
 * Sign in with retry on auth rate-limit. Verifies a session was actually
 * created (a silent rate-limit failure otherwise leaves the client anon).
 */
export const signInWithRetry = async (
  supabase: SupabaseClient,
  email: string,
  password: string,
  maxRetries = 3,
): Promise<void> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return;
    }
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error(`signInWithRetry: failed to sign in as ${email} after ${maxRetries} attempts`);
};

/**
 * D15 cleanup chain: journeys (RESTRICT FK) → personal group (CASCADE handles
 * memberships/roles/enrollments) → auth.users (CASCADE removes public.users).
 */
export const cleanupTestUser = async (userId: string): Promise<void> => {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('users')
    .select('id, personal_group_id')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (profile?.personal_group_id) {
    await admin.from('journeys').delete().eq('created_by_group_id', profile.personal_group_id);
    await admin.from('groups').delete().eq('id', profile.personal_group_id);
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) console.error('Failed to cleanup test user:', error);
};

/** Clean up a test group (CASCADE handles memberships, roles, etc.). */
export const cleanupTestGroup = async (groupId: string): Promise<void> => {
  const admin = createAdminClient();
  await admin.from('journeys').delete().eq('created_by_group_id', groupId);
  const { error } = await admin.from('groups').delete().eq('id', groupId);
  if (error) console.error('Failed to cleanup test group:', error);
};

/**
 * Run admin SQL via the Supabase Management API — the same channel the migration
 * apply script uses. **Test-only**, for substrate manipulation the JS client
 * cannot do: backdating `auth.users.last_sign_in_at` (GoTrue-managed), or reading
 * the `cron` schema (PostgREST does not expose it). Returns result rows; throws on
 * API/SQL error. Requires SUPABASE_ACCESS_TOKEN (present in .env.local).
 */
export const runAdminSql = async (
  sql: string,
): Promise<Array<Record<string, unknown>>> => {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('runAdminSql requires SUPABASE_ACCESS_TOKEN (management API) in .env.local');
  }
  const ref = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1];
  if (!ref) throw new Error(`Could not derive project ref from ${supabaseUrl}`);

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.json();
  if (!res.ok || (body && (body as { error?: unknown }).error)) {
    throw new Error(`runAdminSql failed: ${JSON.stringify(body)}`);
  }
  return Array.isArray(body) ? (body as Array<Record<string, unknown>>) : [];
};
