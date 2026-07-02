import { describe, it, expect, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  generateTestEmail,
  withAnonRateLimitRetry,
  runAdminSql,
} from '@/tests/helpers/supabase';

/**
 * Tranche-1 substrate hardening (ADR-U038) — the enforcement gaps the API-boundary
 * audit surfaced by taking B2/B3 seriously: a Surface BFF cannot be the enforcement
 * layer, so everything the Hub gates in TypeScript must ALSO hold against a direct
 * PostgREST caller using the public anon key.
 *
 * TDD red-first: every assertion states the POST-FIX guarantee, so the whole file
 * FAILS against the current substrate and passes once the two hardening migrations
 * land:
 *   - 20260702120000_api_boundary_users_column_privileges.sql  (S1 + S2)
 *   - 20260702120100_api_boundary_signup_consent.sql           (S3)
 */

async function waitForProfile(
  admin: ReturnType<typeof createAdminClient>,
  authUserId: string,
  tries = 12,
) {
  for (let i = 0; i < tries; i++) {
    const { data } = await admin
      .from('users')
      .select('id, personal_group_id, is_temporary')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (data) return data;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('profile did not materialise in time');
}

describe('S1 — a Mist cannot self-promote or write identity-state columns via direct PostgREST', () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  it('rejects a direct is_temporary=false write on the Mist own row (consent-gate bypass)', async () => {
    const admin = createAdminClient();
    const mist = createTestClient();
    const { data: signIn, error: signInErr } = await withAnonRateLimitRetry(() =>
      mist.auth.signInAnonymously(),
    );
    expect(signInErr).toBeNull();
    const mistAuthId = signIn.user!.id;
    createdUserIds.push(mistAuthId);
    await waitForProfile(admin, mistAuthId);

    // Attack: flip is_temporary directly, sidestepping finalise_transcendence()
    // (no consent record, no FringeIsland-Members enrolment).
    const { error } = await mist
      .from('users')
      .update({ is_temporary: false })
      .eq('auth_user_id', mistAuthId);

    // POST-FIX: column-level privilege denies the write (42501).
    expect(error).not.toBeNull();
    expect(error!.code).toBe('42501');

    // And the row is unchanged — still a Mist.
    const { data: after } = await admin
      .from('users')
      .select('is_temporary')
      .eq('auth_user_id', mistAuthId)
      .single();
    expect(after!.is_temporary).toBe(true);
  });

  it('rejects direct writes to email / is_active on the own row', async () => {
    const admin = createAdminClient();
    const mist = createTestClient();
    const { data: signIn } = await withAnonRateLimitRetry(() => mist.auth.signInAnonymously());
    const mistAuthId = signIn.user!.id;
    createdUserIds.push(mistAuthId);
    await waitForProfile(admin, mistAuthId);

    const emailAttempt = await mist
      .from('users')
      .update({ email: 'attacker@evil.test' })
      .eq('auth_user_id', mistAuthId);
    expect(emailAttempt.error).not.toBeNull();
    expect(emailAttempt.error!.code).toBe('42501');

    const activeAttempt = await mist
      .from('users')
      .update({ is_active: false })
      .eq('auth_user_id', mistAuthId);
    expect(activeAttempt.error).not.toBeNull();
    expect(activeAttempt.error!.code).toBe('42501');
  });

  it('still allows the legitimate identity-scope profile write (no over-revoke)', async () => {
    const admin = createAdminClient();
    const mist = createTestClient();
    const { data: signIn } = await withAnonRateLimitRetry(() => mist.auth.signInAnonymously());
    const mistAuthId = signIn.user!.id;
    createdUserIds.push(mistAuthId);
    await waitForProfile(admin, mistAuthId);

    const { error } = await mist
      .from('users')
      .update({ nickname: 'Renamed', bio: 'hello' })
      .eq('auth_user_id', mistAuthId);
    expect(error).toBeNull();

    const { data: after } = await admin
      .from('users')
      .select('nickname, bio')
      .eq('auth_user_id', mistAuthId)
      .single();
    expect(after!.nickname).toBe('Renamed');
    expect(after!.bio).toBe('hello');
  });
});

describe('S2 — email is not readable across users via direct PostgREST', () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  it("blocks reading another member's email column, while non-sensitive columns stay readable", async () => {
    const victim = await createTestUser({ displayName: 'Katherine Johnson' });
    createdUserIds.push(victim.user.id);

    const attacker = createTestClient();
    const { data: signIn } = await withAnonRateLimitRetry(() => attacker.auth.signInAnonymously());
    createdUserIds.push(signIn.user!.id);

    // Attack: read the victim's email directly.
    const emailRead = await attacker
      .from('users')
      .select('email')
      .eq('auth_user_id', victim.user.id);
    // POST-FIX: the email column is not granted to client roles (42501).
    expect(emailRead.error).not.toBeNull();
    expect(emailRead.error!.code).toBe('42501');

    // Non-sensitive columns remain readable (RLS still allows the row; the
    // hardening is column-scoped, not a blanket lockout).
    const nameRead = await attacker
      .from('users')
      .select('nickname')
      .eq('auth_user_id', victim.user.id)
      .maybeSingle();
    expect(nameRead.error).toBeNull();
    expect(nameRead.data?.nickname).toBe('Katherine');
  });
});

describe('S3 — credentialed FIM creation is consent-gated and durably records consent', () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  it('refuses to create a credentialed FIM with no consent (fail-closed at the substrate)', async () => {
    const admin = createAdminClient();
    const email = generateTestEmail(`s3-noconsent-${process.hrtime.bigint()}`);

    // Attack: a direct GoTrue create with NO consent metadata (what a raw
    // auth.signUp with the public anon key would do), bypassing the Hub gate.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: 'Test123!@#$',
      email_confirm: true,
      user_metadata: { display_name: 'No Consent' },
    });
    if (data?.user) createdUserIds.push(data.user.id);

    // POST-FIX: handle_new_user raises → the auth insert rolls back → no account.
    expect(error).not.toBeNull();

    const { data: leaked } = await admin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    expect(leaked).toBeNull();
  });

  it('creates the FIM AND writes a durable transcendence consent row when consent is present', async () => {
    const admin = createAdminClient();
    const email = generateTestEmail(`s3-consent-${process.hrtime.bigint()}`);

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: 'Test123!@#$',
      email_confirm: true,
      user_metadata: { display_name: 'Given Consent', consent_accepted: 'true' },
    });
    expect(error).toBeNull();
    createdUserIds.push(data.user!.id);

    const profile = await waitForProfile(admin, data.user!.id);

    // POST-FIX: exactly one durable transcendence consent row for the new FIM.
    const { data: consent } = await admin
      .from('consent_records')
      .select('purpose, decision, policy_version, capture_context')
      .eq('subject_group_id', profile.personal_group_id as string);
    expect(consent!.length).toBe(1);
    expect(consent![0].purpose).toBe('transcendence');
    expect(consent![0].decision).toBe('granted');
    expect((consent![0].capture_context as { flow?: string }).flow).toBe('credentialed-signup');
  });

  it('does NOT gate or record consent for a Mist (anonymous entry needs no consent)', async () => {
    const admin = createAdminClient();
    const mist = createTestClient();
    const { data: signIn, error } = await withAnonRateLimitRetry(() =>
      mist.auth.signInAnonymously(),
    );
    expect(error).toBeNull();
    createdUserIds.push(signIn.user!.id);
    const profile = await waitForProfile(admin, signIn.user!.id);

    const { count } = await admin
      .from('consent_records')
      .select('*', { count: 'exact', head: true })
      .eq('subject_group_id', profile.personal_group_id as string);
    expect(count ?? 0).toBe(0);
  });
});
