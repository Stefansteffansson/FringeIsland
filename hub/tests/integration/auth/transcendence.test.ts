import { describe, it, expect, afterAll } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createTestClient,
  createAdminClient,
  cleanupTestUser,
  runAdminSql,
  withAnonRateLimitRetry,
} from '@/tests/helpers/supabase';
import { finaliseTranscendence } from '@/lib/auth/transcendence';

/**
 * FEAT-H004 STORY-1/2/5 (integration) — the Hub's in-place transcendence,
 * consuming the paired FEAT-PC002 substrate. The platform RPC itself is proven
 * in `mist-transcendence.test.ts`; THIS exercises the Hub layer end-to-end:
 * the real Supabase anon->permanent conversion (`updateUser`, same auth.users.id)
 * followed by the Hub lib wrapper `finaliseTranscendence` over the RPC. The
 * continuity guarantee (same personal_group_id, nothing restarts) is the Hub's
 * contract with the platform.
 *
 * TDD red-first: FAILS until `hub/lib/auth/transcendence.ts` exists.
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

describe('FEAT-H004 — Hub in-place transcendence (consumes finalise_transcendence)', () => {
  const createdUserIds: string[] = [];
  const subjectGroupIds: string[] = [];

  afterAll(async () => {
    // Transcended FIMs carry consent (append-only, FK RESTRICT) — remove it via
    // the controlled erasure bypass first, then the now-unreferenced users.
    if (subjectGroupIds.length) {
      const list = subjectGroupIds.map((g) => `'${g}'`).join(',');
      await runAdminSql(
        `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
          `DELETE FROM public.consent_records WHERE subject_group_id IN (${list}); END $$;`,
      ).catch(() => undefined);
    }
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  // STORY-1 (continuity) + STORY-2 (consent atomic) + STORY-5 — the happy path.
  it('converts a Mist (same auth id) then finalises — continuity (same personal group), Members, consent', async () => {
    const admin = createAdminClient();
    const mist = createTestClient();
    const { data: signIn, error: signErr } = await withAnonRateLimitRetry(() =>
      mist.auth.signInAnonymously(),
    );
    expect(signErr).toBeNull();
    const authId = signIn.user!.id;
    createdUserIds.push(authId);
    const before = await waitForProfile(admin, authId);
    const groupId = before.personal_group_id as string;
    subjectGroupIds.push(groupId);
    expect(before.is_temporary).toBe(true);

    // 1. Convert anon -> permanent (the Hub's auth-SDK step; preserves auth.users.id).
    const email = `h004-${authId}@fringeisland.test`;
    const { error: convErr } = await mist.auth.updateUser({ email, password: 'Transcend123!@#' });
    expect(convErr).toBeNull();
    const { data: afterConv } = await mist.auth.getUser();
    expect(afterConv.user!.id).toBe(authId); // id preserved => continuity
    expect(afterConv.user!.is_anonymous).toBe(false);

    // 2. Finalise via the Hub lib (the server-side wrapper over the RPC).
    // COR-D W3 (AC4-1): no policy version is passed — the substrate stamps it.
    const { outcome, error } = await finaliseTranscendence(mist, {
      captureContext: { surface: 'hub', flow: 'mist-transcendence' },
    });
    expect(error).toBeNull();
    expect(outcome).not.toBeNull();
    expect(outcome!.personalGroupId).toBe(groupId); // continuity — same proto group

    // Persistence — is_temporary flipped, SAME personal group (no recreation).
    const { data: after } = await admin
      .from('users')
      .select('is_temporary, personal_group_id')
      .eq('auth_user_id', authId)
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

    // Consent — exactly one transcendence record, stamped with the CATALOG's
    // version (COR-D W3 / AC4-1: the substrate resolves it; the Hub asserts
    // against the catalog, never against its own copy).
    const catalog = (await runAdminSql(
      `SELECT current_policy_version FROM public.consent_purposes WHERE key = 'transcendence';`,
    )) as unknown as { current_policy_version: string }[];
    const { data: consent } = await admin
      .from('consent_records')
      .select('purpose, policy_version')
      .eq('subject_group_id', groupId);
    expect(consent!.length).toBe(1);
    expect(consent![0].purpose).toBe('transcendence');
    expect(consent![0].policy_version).toBe(catalog[0].current_policy_version);
    expect(outcome!.policyVersion).toBe(catalog[0].current_policy_version);
  });

  // STORY-1 (failure) — the lib surfaces the error as { error } (never throws);
  // the platform RPC rolled back its writes, so the caller stays a domain-Mist.
  it('surfaces a finalisation failure as { error } — caller stays a valid Mist (is_temporary)', async () => {
    const admin = createAdminClient();
    const mist = createTestClient();
    const { data: signIn } = await withAnonRateLimitRetry(() => mist.auth.signInAnonymously());
    const authId = signIn.user!.id;
    createdUserIds.push(authId);
    await waitForProfile(admin, authId);

    const email = `h004b-${authId}@fringeisland.test`;
    await mist.auth.updateUser({ email, password: 'Transcend123!@#' });

    // Force a consent-write failure AFTER the flip+enrolment — the whole txn
    // rolls back ("no persistence without consent"). Mechanism rewritten at
    // COR-D W3 (AC4-1): the null-version lever died with the caller-supplied
    // version; the catalog row is renamed away instead, so the W3 function's
    // server-side resolve comes back NULL and the consent NOT NULL aborts the
    // txn (see mist-transcendence.test.ts for the platform half + rationale).
    let outcome: Awaited<ReturnType<typeof finaliseTranscendence>>['outcome'];
    let error: string | null;
    try {
      await runAdminSql(
        `UPDATE public.consent_purposes SET key = 'transcendence__w3_atomicity_test' WHERE key = 'transcendence';`,
      );
      ({ outcome, error } = await finaliseTranscendence(mist, {}));
    } finally {
      await runAdminSql(
        `UPDATE public.consent_purposes SET key = 'transcendence' WHERE key = 'transcendence__w3_atomicity_test';`,
      );
    }
    expect(outcome).toBeNull();
    expect(error).not.toBeNull();

    // Rolled back — still a domain-Mist (no half-FIM persisted).
    const { data: after } = await admin
      .from('users')
      .select('is_temporary')
      .eq('auth_user_id', authId)
      .single();
    expect(after!.is_temporary).toBe(true);
  });
});
