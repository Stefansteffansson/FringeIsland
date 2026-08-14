import { describe, it, expect, afterAll } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  runAdminSql,
  withAnonRateLimitRetry,
} from '@/tests/helpers/supabase';

/**
 * FEAT-PC002 STORY-3 — atomic persistence-and-consent transcendence (ADR-U031
 * stage 4), plus the atomic-write half of STORY-5 (consent in the same txn).
 *
 * TDD red-first: FAILS until the migration adds `public.finalise_transcendence`.
 * The SDK anon->permanent conversion (same auth.users.id) is the Hub's step
 * (FEAT-H004); this exercises the platform finalisation function directly as a
 * Mist (is_temporary = true), which is the substrate contract.
 *
 * SCOPE: persistence-and-consent threshold only. The metamorphosis/ball/Beyond
 * completion gate is forward-looking (founding-questions assessment unbuilt).
 */

async function waitForProfile(admin: SupabaseClient, authUserId: string, tries = 12) {
  for (let i = 0; i < tries; i++) {
    const { data } = await admin
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (data) return data;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Mist profile did not materialise in time');
}

describe('FEAT-PC002 STORY-3 — atomic persistence-and-consent transcendence', () => {
  const createdUserIds: string[] = [];
  const subjectGroupIds: string[] = [];

  afterAll(async () => {
    // Transcended FIMs carry consent (append-only, FK RESTRICT) — remove consent
    // via the controlled erasure bypass first, then the now-unreferenced users.
    if (subjectGroupIds.length) {
      const list = subjectGroupIds.map((g) => `'${g}'`).join(',');
      await runAdminSql(
        `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
          `DELETE FROM public.consent_records WHERE subject_group_id IN (${list}); END $$;`,
      ).catch(() => undefined);
    }
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  // STORY-3 criteria 1 + 2 + STORY-5 criterion 2 — one atomic txn, continuity.
  it('flips is_temporary, enrols FringeIsland Members, and writes consent atomically — same personal group', async () => {
    const admin = createAdminClient();
    const mistClient = createTestClient();
    const { data: signIn, error: signInErr } = await withAnonRateLimitRetry(() =>
      mistClient.auth.signInAnonymously(),
    );
    expect(signInErr).toBeNull();
    const mistId = signIn.user!.id;
    createdUserIds.push(mistId);
    const before = await waitForProfile(admin, mistId);
    const groupId = before.personal_group_id as string;
    subjectGroupIds.push(groupId);
    expect(before.is_temporary).toBe(true);

    // Act — finalise (consent captured atomically with persistence).
    const { data: result, error } = await mistClient.rpc('finalise_transcendence', {
      p_policy_version: 'v1',
      p_capture_context: { surface: 'hub', flow: 'mist-transcendence' },
    });
    expect(error).toBeNull();
    expect(result.transcended).toBe(true);

    // Persistence — is_temporary flipped; continuity — SAME personal group (no recreation).
    const { data: after } = await admin
      .from('users')
      .select('id, is_temporary, personal_group_id')
      .eq('auth_user_id', mistId)
      .single();
    expect(after!.is_temporary).toBe(false);
    expect(after!.personal_group_id).toBe(groupId);

    // Enrolment — now a FringeIsland Member (the baseline a Mist is denied).
    const { data: fiGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'FringeIsland Members')
      .eq('group_type', 'system')
      .single();
    const { data: membership } = await admin
      .from('group_memberships')
      .select('status')
      .eq('group_id', fiGroup!.id)
      .eq('member_group_id', groupId)
      .maybeSingle();
    expect(membership).not.toBeNull();
    expect(membership!.status).toBe('active');

    // Consent — exactly one transcendence record, written in the same txn.
    const { data: consent } = await admin
      .from('consent_records')
      .select('purpose, policy_version')
      .eq('subject_group_id', groupId);
    expect(consent!.length).toBe(1);
    expect(consent![0].purpose).toBe('transcendence');
    expect(consent![0].policy_version).toBe('v1');
  });

  // STORY-3 criterion 3 — partway failure rolls back wholly (no half-FIM, no consent).
  it('rolls back the whole finalisation on a partway failure — stays a valid Mist, no consent', async () => {
    const admin = createAdminClient();
    const mistClient = createTestClient();
    const { data: signIn } = await withAnonRateLimitRetry(() => mistClient.auth.signInAnonymously());
    const mistId = signIn.user!.id;
    createdUserIds.push(mistId);
    const before = await waitForProfile(admin, mistId);
    const groupId = before.personal_group_id as string;
    // Registered for afterAll erasure: pre-W3 this call SUCCEEDS (that is the
    // red) and writes a consent row that must not outlive the suite.
    subjectGroupIds.push(groupId);

    // Force a partway failure AT THE CONSENT WRITE, after the flip + enrolment —
    // the whole txn must roll back ("no persistence without consent").
    // MECHANISM REWRITTEN at COR-D W3 (Audit IV AC4-1), red-first: the old
    // lever (p_policy_version: null -> 23502) died with the caller-supplied
    // version — the W3 function resolves the version from the catalog. So the
    // catalog row is renamed away for the call: the resolve comes back NULL and
    // the consent NOT NULL aborts the txn (23502) — the SAME structural
    // guarantee, now server-owned. Anti-pass-at-red holds: a missing function
    // is PGRST202 and the pre-W3 function SUCCEEDS here (param used, catalog
    // ignored) — only the W3 shape produces 23502. RED before the migration
    // applies, green after. Data-only lever (no DDL): consent_records.purpose
    // carries no FK to the catalog, and the shared pooler chokes on mid-suite
    // DDL (cached-plan resets — first attempt used an injected trigger).
    try {
      await runAdminSql(
        `UPDATE public.consent_purposes SET key = 'transcendence__w3_atomicity_test' WHERE key = 'transcendence';`,
      );
      const { error } = await mistClient.rpc('finalise_transcendence', {
        p_policy_version: 'v1',
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('23502');
    } finally {
      await runAdminSql(
        `UPDATE public.consent_purposes SET key = 'transcendence' WHERE key = 'transcendence__w3_atomicity_test';`,
      );
    }

    // Still a valid Mist — the flip rolled back.
    const { data: after } = await admin
      .from('users')
      .select('is_temporary')
      .eq('auth_user_id', mistId)
      .single();
    expect(after!.is_temporary).toBe(true);

    // No consent row was written.
    const { count } = await admin
      .from('consent_records')
      .select('*', { count: 'exact', head: true })
      .eq('subject_group_id', groupId);
    expect(count ?? 0).toBe(0);
  });

  // COR-D W3 (Audit IV AC4-1) — RED-FIRST: the stamped policy version is the
  // GOVERNANCE CATALOG's, never the caller's. Before the W3 migration this
  // cell is RED (the live function inserts p_policy_version verbatim, so the
  // fake sticks — the finding itself); green once the server-side stamp lands.
  it('ignores a caller-supplied policy version — the catalog is stamped (AC4-1)', async () => {
    const admin = createAdminClient();
    const mistClient = createTestClient();
    const { data: signIn } = await withAnonRateLimitRetry(() => mistClient.auth.signInAnonymously());
    const mistId = signIn.user!.id;
    createdUserIds.push(mistId);
    const before = await waitForProfile(admin, mistId);
    const groupId = before.personal_group_id as string;
    subjectGroupIds.push(groupId);

    const { data: result, error } = await mistClient.rpc('finalise_transcendence', {
      p_policy_version: 'vFAKE-ac4-1',
    });
    expect(error).toBeNull();
    expect(result.transcended).toBe(true);

    const catalog = (await runAdminSql(
      `SELECT current_policy_version FROM public.consent_purposes WHERE key = 'transcendence';`,
    )) as unknown as { current_policy_version: string }[];
    const catalogVersion = catalog[0].current_policy_version;

    const { data: consent } = await admin
      .from('consent_records')
      .select('policy_version')
      .eq('subject_group_id', groupId);
    expect(consent!.length).toBe(1);
    expect(consent![0].policy_version).toBe(catalogVersion);
    expect(consent![0].policy_version).not.toBe('vFAKE-ac4-1');
  });

  // STORY-3 — a non-temporary caller (already a FIM) is rejected.
  it('rejects a caller that is already a FIM', async () => {
    const fim = await createTestUser({ displayName: 'Dorothy Vaughan' });
    createdUserIds.push(fim.user.id);
    const fimClient = createTestClient();
    await fimClient.auth.signInWithPassword({ email: fim.email, password: fim.password });

    const { error } = await fimClient.rpc('finalise_transcendence', { p_policy_version: 'v1' });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('42501');
  });

  // STORY-3 criterion 4 (committed side) — a transcended Mist is never reaped, even
  // when "old". The in-flight window is guarded by FOR UPDATE SKIP LOCKED (reaper)
  // + the row lock finalisation holds; deterministic two-session concurrency is not
  // feasible via the HTTP harness, so this asserts the post-commit guarantee.
  it('a transcended Mist is not reaped even when inactive past the TTL', async () => {
    const admin = createAdminClient();
    const mistClient = createTestClient();
    const { data: signIn } = await withAnonRateLimitRetry(() => mistClient.auth.signInAnonymously());
    const mistId = signIn.user!.id;
    createdUserIds.push(mistId);
    const before = await waitForProfile(admin, mistId);
    subjectGroupIds.push(before.personal_group_id as string);

    // Transcend, then backdate inactivity well past the TTL.
    const { error: finErr } = await mistClient.rpc('finalise_transcendence', {
      p_policy_version: 'v1',
    });
    expect(finErr).toBeNull();
    await runAdminSql(
      `UPDATE auth.users SET last_sign_in_at = now() - interval '100 hours' WHERE id = '${mistId}'`,
    );

    // Run the reaper — the now-FIM survives (is_temporary filter).
    const { error: reapErr } = await admin.rpc('reap_expired_mists');
    expect(reapErr).toBeNull();
    const { data: survivor } = await admin
      .from('users')
      .select('id, is_temporary')
      .eq('auth_user_id', mistId)
      .maybeSingle();
    expect(survivor).not.toBeNull();
    expect(survivor!.is_temporary).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TASK-TRX-01 — transcendence carries the entered identity (post-6-done fix,
// found 2026-08-13 live walk). The Hub's SDK conversion (updateUser: email,
// password, display_name metadata) precedes finalisation; the pre-fix function
// flipped is_temporary but left full_name/nickname='Mist', email=NULL, and the
// proto personal group named 'Mist'. These cells exercise the substrate
// contract directly (adversarial path: plain PostgREST RPC after a real
// conversion). TDD red-first: RED until the TRX-01 migration lands.
// ---------------------------------------------------------------------------
describe('TASK-TRX-01 — transcendence carries the entered identity into the profile', () => {
  const createdUserIds: string[] = [];
  const subjectGroupIds: string[] = [];

  afterAll(async () => {
    if (subjectGroupIds.length) {
      const list = subjectGroupIds.map((g) => `'${g}'`).join(',');
      await runAdminSql(
        `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
          `DELETE FROM public.consent_records WHERE subject_group_id IN (${list}); END $$;`,
      ).catch(() => undefined);
    }
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  it('carries display name, nickname, and email into users, and renames the proto personal group', async () => {
    const admin = createAdminClient();
    const mistClient = createTestClient();
    const { data: signIn, error: signInErr } = await withAnonRateLimitRetry(() =>
      mistClient.auth.signInAnonymously(),
    );
    expect(signInErr).toBeNull();
    const mistId = signIn.user!.id;
    createdUserIds.push(mistId);
    const before = await waitForProfile(admin, mistId);
    const groupId = before.personal_group_id as string;
    subjectGroupIds.push(groupId);

    // The Hub's conversion step (FEAT-H004): anon -> permanent, same auth id.
    const email = `trx01-carry-${Date.now()}@transcendence.test`;
    const { error: convErr } = await mistClient.auth.updateUser({
      email,
      password: 'Transcend123!@#',
      data: { display_name: 'Erika Hopper' },
    });
    expect(convErr).toBeNull();

    const { data: result, error } = await mistClient.rpc('finalise_transcendence', {
      p_capture_context: { surface: 'test', flow: 'trx-01' },
    });
    expect(error).toBeNull();
    expect(result.transcended).toBe(true);

    // The entered identity is now the profile's identity — same row, same group.
    const { data: after } = await admin
      .from('users')
      .select('full_name, nickname, email, is_temporary, personal_group_id')
      .eq('auth_user_id', mistId)
      .single();
    expect(after!.is_temporary).toBe(false);
    expect(after!.full_name).toBe('Erika Hopper');
    expect(after!.nickname).toBe('Erika'); // house rule: nickname = first token
    expect(after!.email).toBe(email);

    // Mirror of handle_new_user step 2: the personal group is named the nickname.
    const { data: pg } = await admin.from('groups').select('name').eq('id', groupId).single();
    expect(pg!.name).toBe('Erika');
  });

  it('falls back to the auth email when the conversion carries no display name', async () => {
    const admin = createAdminClient();
    const mistClient = createTestClient();
    const { data: signIn } = await withAnonRateLimitRetry(() =>
      mistClient.auth.signInAnonymously(),
    );
    const mistId = signIn.user!.id;
    createdUserIds.push(mistId);
    const before = await waitForProfile(admin, mistId);
    subjectGroupIds.push(before.personal_group_id as string);

    const email = `trx01-fallback-${Date.now()}@transcendence.test`;
    const { error: convErr } = await mistClient.auth.updateUser({
      email,
      password: 'Transcend123!@#',
    });
    expect(convErr).toBeNull();

    const { error } = await mistClient.rpc('finalise_transcendence', {});
    expect(error).toBeNull();

    const { data: after } = await admin
      .from('users')
      .select('full_name, email')
      .eq('auth_user_id', mistId)
      .single();
    // Never 'Mist' for a credentialed caller — the COALESCE chain lands on email.
    expect(after!.full_name).toBe(email);
    expect(after!.email).toBe(email);
  });
});
