import { describe, it, expect, afterAll } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  runAdminSql,
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
    const { data: signIn, error: signInErr } = await mistClient.auth.signInAnonymously();
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
    const { data: signIn } = await mistClient.auth.signInAnonymously();
    const mistId = signIn.user!.id;
    createdUserIds.push(mistId);
    const before = await waitForProfile(admin, mistId);
    const groupId = before.personal_group_id as string;

    // Force a partway failure: a null policy_version violates the consent NOT NULL
    // AFTER the flip + enrolment — the whole txn must roll back ("no persistence
    // without consent").
    const { error } = await mistClient.rpc('finalise_transcendence', {
      p_policy_version: null,
    });
    expect(error).not.toBeNull();
    // 23502 (not_null_violation) on consent — proves the consent INSERT was reached
    // (post-flip) and failed, vs. a missing-function PGRST202. Without this, the
    // test would pass-at-red (missing fn also leaves a Mist with no consent).
    expect(error!.code).toBe('23502');

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
    const { data: signIn } = await mistClient.auth.signInAnonymously();
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
