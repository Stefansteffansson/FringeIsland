import { describe, it, expect, afterAll } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  withAnonRateLimitRetry,
} from '@/tests/helpers/supabase';
import { explicitEraseMist } from '@/lib/auth/farewell';

/**
 * FEAT-H004 STORY-3 (integration) — the Hub's farewell, consuming the paired
 * FEAT-PC002 `explicit_erase_mist` RPC. The platform RPC internals are proven in
 * the PC002 suite; THIS exercises the Hub lib wrapper end-to-end: a Mist erases
 * its own session immediately, and a FIM caller is refused (temporary-only path).
 *
 * TDD red-first: FAILS until `hub/lib/auth/farewell.ts` exists.
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

describe('FEAT-H004 STORY-3 — Hub farewell (consumes explicit_erase_mist)', () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  it('erases the calling Mist immediately — profile and proto group gone', async () => {
    const admin = createAdminClient();
    const mist = createTestClient();
    const { data: signIn, error: signErr } = await withAnonRateLimitRetry(() =>
      mist.auth.signInAnonymously(),
    );
    expect(signErr).toBeNull();
    const authId = signIn.user!.id;
    const before = await waitForProfile(admin, authId);
    const groupId = before.personal_group_id as string;

    const { error } = await explicitEraseMist(mist);
    expect(error).toBeNull();

    // Profile hard-deleted (cascade) — no orphaned proto group.
    const { data: profileAfter } = await admin
      .from('users')
      .select('id')
      .eq('auth_user_id', authId)
      .maybeSingle();
    expect(profileAfter).toBeNull();
    const { data: groupAfter } = await admin
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .maybeSingle();
    expect(groupAfter).toBeNull();
  });

  it('refuses a FIM caller (temporary-only path) — the FIM survives', async () => {
    const admin = createAdminClient();
    const fim = await createTestUser({ displayName: 'Katherine Johnson' });
    createdUserIds.push(fim.user.id);
    const fimClient = createTestClient();
    await fimClient.auth.signInWithPassword({ email: fim.email, password: fim.password });

    const { error } = await explicitEraseMist(fimClient);
    expect(error).not.toBeNull(); // platform raises 42501 (insufficient_privilege)

    // The rejection actually prevented erasure — the FIM is untouched.
    const { data: stillThere } = await admin
      .from('users')
      .select('id')
      .eq('auth_user_id', fim.user.id)
      .maybeSingle();
    expect(stillThere).not.toBeNull();
  });
});
