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
 * Known-environment-fault decorator for auth-admin failures (TASK-INT-01).
 *
 * The dev DB intermittently rejects the auth *admin* API with an ES256
 * signing-key error. It is an environment fault, not a code fault — proven
 * 2026-07-22 by control experiment: reproduced on `main` with no branch
 * applied, while the same suite passed 24/24 minutes later, and a standalone
 * probe using the same key created users 5/5.
 *
 * Raw, that error reads like "the substrate rejected my change" and costs the
 * next person an hour of suspecting their own diff (it cost roughly that
 * during COR-B W4). Naming it at the throw site is the cheapest possible
 * guard — no extra requests, no added auth load. A preflight in
 * `suite-setup.ts` was the obvious alternative and was deliberately NOT taken:
 * `setupFilesAfterEnv` runs per test file, so a health check there would add
 * an auth-admin call per file and increase exactly the concurrent load the
 * fault correlates with.
 */
function decorateAuthAdminError(action: string, message: string): string {
  const isSigningKeyFault =
    /unrecognized JWT kid/i.test(message) ||
    (/invalid JWT/i.test(message) && /ES256/i.test(message));

  if (!isSigningKeyFault) return `Failed to ${action}: ${message}`;

  return [
    `Failed to ${action}: ${message}`,
    '',
    '  >>> KNOWN ENVIRONMENT FAULT (TASK-INT-01) — almost certainly NOT your change. <<<',
    '  The dev DB intermittently rejects the auth admin API with this ES256 signing-key',
    '  error. It is reproducible on `main` with no branch applied.',
    '  Before investigating your diff:',
    '    1. re-run this suite alone with --runInBand (it often passes),',
    '    2. if it still fails, run the same suite on `main` as a control.',
    '  Only if `main` is GREEN and your branch is RED is this yours.',
    '  See docs/planning/backlog/tasks/TASK-INT-01-auth-admin-es256-flake.md',
  ].join('\n');
}

/**
 * Is this the TASK-INT-01 dev-DB auth-admin transient (the ES256 signing-key
 * fault), as opposed to a real error the test should fail on?
 *
 * Deliberately NARROW. A blanket retry on `createTestUser` would mask genuine
 * regressions — a duplicate email, a rejected password, a broken
 * `handle_new_user` trigger — by turning a hard failure into a slow one. Only
 * the known signature is retried; everything else fails fast, exactly as before.
 *
 * Exported so its over-matching risk is unit-testable without touching the
 * network (tests/unit/helpers/auth-admin-transient.test.ts).
 */
export const isAuthAdminTransient = (message: string): boolean =>
  /unrecognized JWT kid/i.test(message) ||
  /token is unverifiable/i.test(message) ||
  /\bES256\b/.test(message);

/**
 * Create a test user, bypassing the normal signup flow. The handle_new_user()
 * trigger creates the personal group and sets personal_group_id — the user's
 * identity in the group system.
 *
 * Retries the TASK-INT-01 ES256 transient with exponential backoff. Without
 * this, one flaky admin call fails an entire suite's `beforeAll` rather than a
 * single test — which is what made the flake block whole cycles (A-NTF N-C,
 * 2026-07-25: three consecutive runs lost 26/26 tests before any assertion ran).
 * Its sibling helpers `signInWithRetry` and `withAnonRateLimitRetry` already
 * paced their own transients; user creation was the gap.
 */
export const createTestUser = async (options?: {
  email?: string;
  password?: string;
  displayName?: string;
  maxRetries?: number;
}): Promise<TestUser> => {
  const admin = createAdminClient();
  const password = options?.password || 'Test123!@#$';
  const displayName = options?.displayName || 'Test User';
  const maxRetries = options?.maxRetries ?? 4;

  let email = options?.email || generateTestEmail(`${process.hrtime.bigint()}`);
  let lastMessage = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      // consent_accepted: a credentialed FIM signup is consent-gated at the substrate
      // (handle_new_user, ADR-U038 S3). The helper simulates a real, consented signup.
      user_metadata: { display_name: displayName, consent_accepted: 'true' },
    });

    if (!authError) {
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
    }

    lastMessage = authError.message;

    // A real error fails immediately — the retry must never soften a regression.
    if (!isAuthAdminTransient(lastMessage) || attempt === maxRetries) {
      throw new Error(decorateAuthAdminError('create test user', lastMessage));
    }

    // The admin call may have created the row before failing to sign its
    // response. Re-roll a caller-unpinned email so the retry cannot collide
    // with its own first attempt and turn a transient into a duplicate-email
    // hard failure.
    if (!options?.email) email = generateTestEmail(`${process.hrtime.bigint()}`);
    await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
  }

  // Unreachable — the loop either returns or throws.
  throw new Error(decorateAuthAdminError('create test user', lastMessage));
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
 * Retry a Supabase-style `{ error }` operation on the shared per-project
 * anonymous-sign-in rate limit. The integration suite shares one anon budget
 * (`rate_limit_anonymous_users`), so a burst of `signInAnonymously()` /
 * `beginMistSession()` calls across rapid re-runs can transiently hit
 * "Request rate limit reached". This paces with exponential backoff rather than
 * failing the suite. On success it returns the first non-error result; if the
 * budget is genuinely exhausted it returns the last (errored) result so the
 * caller's own `expect(error).toBeNull()` still surfaces an honest failure.
 *
 * Generic over both shapes: `() => supabase.auth.signInAnonymously()` and
 * `() => beginMistSession(supabase)` both return `{ ..., error }`.
 */
export const withAnonRateLimitRetry = async <T extends { error: unknown }>(
  op: () => Promise<T>,
  maxRetries = 5,
): Promise<T> => {
  let result = await op();
  for (let attempt = 0; result.error && attempt < maxRetries - 1; attempt++) {
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    result = await op();
  }
  return result;
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
    // Consent rows FK-reference users/groups ON DELETE RESTRICT (retention, ADR-U034).
    // A consented FIM (now incl. credentialed signups, ADR-U038 S3) can't be deleted
    // out from under its consent proof — clear it via the controlled-erasure bypass
    // first (test teardown is a legitimate bypass caller, same as the erasure path).
    await runAdminSql(
      `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
        `DELETE FROM public.consent_records WHERE subject_group_id = '${profile.personal_group_id}'; END $$;`,
    ).catch(() => undefined);
    await admin.from('groups').delete().eq('id', profile.personal_group_id);
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) console.error(decorateAuthAdminError('cleanup test user', error.message));
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
