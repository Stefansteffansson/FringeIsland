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
 * FEAT-PC002 STORY-2 — explicit-erase on close ("say goodbye"), the shared
 * Mist erasure-cascade primitive the scheduled reaper (STORY-1) reuses (ADR-U033).
 *
 * TDD red-first: these FAIL until the FEAT-PC002 migration adds the
 * `explicit_erase_mist` SECURITY DEFINER RPC (search_path = '') that runs the
 * full Mist erasure cascade for the *calling* Mist (caller = auth.uid()) and
 * refuses non-temporary callers. No reaper / RPC exists yet — this is the first
 * red of the build.
 *
 * Drives the real anonymous sign-in endpoint so it exercises handle_new_user the
 * way the app does. A Mist that self-erases needs no teardown; the denial path's
 * FIM does.
 */

/** handle_new_user fires AFTER INSERT (async) — poll for the materialised profile. */
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

describe('FEAT-PC002 STORY-2 — explicit-erase cascade ("say goodbye")', () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  // STORY-2 criterion 1 — the owner Mist self-erases; the full cascade runs
  // immediately, with no orphaned child rows (ADR-U016 cascade).
  it('erases the calling Mist and its proto group with no orphaned rows', async () => {
    const supabase = createTestClient();
    const { data: signIn, error: signInError } = await withAnonRateLimitRetry(() =>
      supabase.auth.signInAnonymously(),
    );
    expect(signInError).toBeNull();
    expect(signIn.user).not.toBeNull();
    const mistId = signIn.user!.id;
    createdUserIds.push(mistId); // no-op teardown once the erase below succeeds

    const admin = createAdminClient();
    const profile = await waitForProfile(admin, mistId);
    const protoGroupId = profile.personal_group_id as string;
    expect(protoGroupId).not.toBeNull();

    // Act — the Mist invokes its own explicit-erase (caller = auth.uid()).
    const { error: eraseError } = await supabase.rpc('explicit_erase_mist');
    expect(eraseError).toBeNull();

    // Assert — auth.users row gone.
    const { data: authLookup } = await admin.auth.admin.getUserById(mistId);
    expect(authLookup?.user ?? null).toBeNull();

    // Assert — public.users profile gone.
    const { data: goneProfile } = await admin
      .from('users')
      .select('id')
      .eq('auth_user_id', mistId)
      .maybeSingle();
    expect(goneProfile).toBeNull();

    // Assert — proto personal group gone.
    const { data: goneGroup } = await admin
      .from('groups')
      .select('id')
      .eq('id', protoGroupId)
      .maybeSingle();
    expect(goneGroup).toBeNull();

    // Assert — no orphaned memberships referencing the proto group.
    const { data: orphanMemberships } = await admin
      .from('group_memberships')
      .select('id')
      .or(`group_id.eq.${protoGroupId},member_group_id.eq.${protoGroupId}`);
    expect(orphanMemberships ?? []).toHaveLength(0);

    // Assert — no orphaned role assignments referencing the proto group.
    const { data: orphanRoles } = await admin
      .from('user_group_roles')
      .select('id')
      .or(`group_id.eq.${protoGroupId},member_group_id.eq.${protoGroupId}`);
    expect(orphanRoles ?? []).toHaveLength(0);

    // The Mist self-erased — drop it from teardown so afterAll doesn't 404 noisily.
    createdUserIds.splice(createdUserIds.indexOf(mistId), 1);
  });

  // STORY-2 criterion 2 — a non-temporary caller (a FIM) is denied; the FIM
  // survives. A Mist may erase only its own (temporary) session. The denial
  // contract is ERRCODE 42501 (insufficient_privilege) — distinct from the
  // PGRST202 "function not found" returned while unimplemented, so this test is
  // genuinely red until the RPC exists AND enforces the temporary-only rule.
  it('denies explicit-erase to a non-temporary (FIM) caller', async () => {
    const fim = await createTestUser({ displayName: 'Ada Lovelace' });
    createdUserIds.push(fim.user.id);

    const supabase = createTestClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: fim.email,
      password: fim.password,
    });
    expect(signInError).toBeNull();

    // Act — a FIM calls the Mist-only erase.
    const { error: eraseError } = await supabase.rpc('explicit_erase_mist');

    // Assert — denied with the insufficient-privilege contract code.
    expect(eraseError).not.toBeNull();
    expect(eraseError!.code).toBe('42501');

    // Assert — the FIM still exists, unchanged.
    const admin = createAdminClient();
    const { data: stillThere } = await admin
      .from('users')
      .select('id, is_temporary')
      .eq('auth_user_id', fim.user.id)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
    expect(stillThere!.is_temporary).toBe(false);
  });
});

describe('FEAT-PC002 STORY-1 — scheduled reaper sweep (reap_expired_mists)', () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  // STORY-1 criteria 1-4 + the STORY-4 reaper-run event.
  it('erases an inactive Mist past the TTL, spares an active Mist + a FIM, records a run', async () => {
    const admin = createAdminClient();

    // Inactive Mist — backdate last_sign_in_at well past the 72h TTL.
    const expiredClient = createTestClient();
    const { data: expiredSignIn, error: e1 } = await withAnonRateLimitRetry(() =>
      expiredClient.auth.signInAnonymously(),
    );
    expect(e1).toBeNull();
    const expiredId = expiredSignIn.user!.id;
    createdUserIds.push(expiredId);
    const expiredProfile = await waitForProfile(admin, expiredId);
    const expiredGroupId = expiredProfile.personal_group_id as string;
    await runAdminSql(
      `UPDATE auth.users SET last_sign_in_at = now() - interval '100 hours' WHERE id = '${expiredId}'`,
    );

    // Active Mist — fresh last_sign_in_at, within the TTL.
    const activeClient = createTestClient();
    const { data: activeSignIn, error: e2 } = await withAnonRateLimitRetry(() =>
      activeClient.auth.signInAnonymously(),
    );
    expect(e2).toBeNull();
    const activeId = activeSignIn.user!.id;
    createdUserIds.push(activeId);
    await waitForProfile(admin, activeId);

    // FIM — never temporary; stands in for a transcended FIM. Backdated too, to
    // prove the is_temporary filter (not age) is what spares it.
    const fim = await createTestUser({ displayName: 'Katherine Johnson' });
    createdUserIds.push(fim.user.id);
    await runAdminSql(
      `UPDATE auth.users SET last_sign_in_at = now() - interval '100 hours' WHERE id = '${fim.user.id}'`,
    );

    // Act — run the sweep (service-role; pg_cron invokes the same fn on schedule).
    const { data: runResult, error: runError } = await admin.rpc('reap_expired_mists');
    expect(runError).toBeNull();
    expect(runResult.erased).toBeGreaterThanOrEqual(1);

    // Inactive Mist erased — auth user + profile + proto group gone.
    const { data: expiredLookup } = await admin.auth.admin.getUserById(expiredId);
    expect(expiredLookup?.user ?? null).toBeNull();
    const { data: expiredGone } = await admin
      .from('users').select('id').eq('auth_user_id', expiredId).maybeSingle();
    expect(expiredGone).toBeNull();
    const { data: expiredGroupGone } = await admin
      .from('groups').select('id').eq('id', expiredGroupId).maybeSingle();
    expect(expiredGroupGone).toBeNull();
    createdUserIds.splice(createdUserIds.indexOf(expiredId), 1); // reaped — skip teardown

    // Active Mist spared (inactivity-based, not creation-based).
    const { data: activeStill } = await admin
      .from('users').select('id').eq('auth_user_id', activeId).maybeSingle();
    expect(activeStill).not.toBeNull();

    // FIM spared despite being "old" — the reaper touches only is_temporary rows.
    const { data: fimStill } = await admin
      .from('users').select('id, is_temporary').eq('auth_user_id', fim.user.id).maybeSingle();
    expect(fimStill).not.toBeNull();
    expect(fimStill!.is_temporary).toBe(false);

    // TTL resolves from PC-2 configuration, not a hardcoded literal.
    const { data: cfg } = await admin
      .from('pc2_config').select('value').eq('key', 'mist_inactivity_ttl').maybeSingle();
    expect(cfg).not.toBeNull();

    // STORY-4 — a reaper-run event was recorded (V4 observability).
    const { count } = await admin
      .from('reaper_runs').select('*', { count: 'exact', head: true });
    expect(count ?? 0).toBeGreaterThanOrEqual(1);
  });

  // STORY-1 — the sweep is scheduled on pg_cron (cadence << TTL).
  it('is scheduled on pg_cron', async () => {
    const rows = await runAdminSql(
      `SELECT jobname FROM cron.job WHERE command ILIKE '%reap_expired_mists%'`,
    );
    expect(rows.length).toBeGreaterThan(0);
  });
});
