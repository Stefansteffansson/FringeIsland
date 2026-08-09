import { describe, it, expect } from '@jest/globals';
import { createTestClient, createAdminClient, withAnonRateLimitRetry } from '../../helpers/supabase';
import { eraseUserAndPersonalGroup, deleteE2EUserByAuthId } from '../../e2e/helpers/auth';

/**
 * TASK-INT-03 — the E2E tier's teardown must take the personal group with the
 * account.
 *
 * `hub/tests/e2e/helpers/auth.ts` carried the group-before-auth defect in THREE
 * helpers (`cleanupAnonymousUsers`, `deleteTranscendedUser`, `deleteE2EUser`),
 * and 24 spec teardowns called `admin.auth.admin.deleteUser(authId)` directly
 * with no group handling at all. `cleanupAnonymousUsers` sweeps EVERY anonymous
 * user (perPage 200) and is called by three Mist specs, so a single E2E run
 * could orphan hundreds of personal groups. Measured: 1 357 orphans named
 * "Mist" in 11 days, against a suite that reported success every time.
 *
 * These helpers are plain TypeScript over supabase-js — no Playwright import —
 * so the integration tier can exercise them directly, which is the only tier
 * that can assert on the substrate afterwards.
 */

const orphanCount = async (groupId: string): Promise<number> => {
  const admin = createAdminClient();
  const { count } = await admin
    .from('groups')
    .select('id', { count: 'exact', head: true })
    .eq('id', groupId);
  return count ?? 0;
};

/** Materialise a Mist and return its auth id + personal group id. */
const createMist = async (): Promise<{ authId: string; groupId: string }> => {
  const client = createTestClient();
  const { data, error } = await withAnonRateLimitRetry(() => client.auth.signInAnonymously());
  expect(error).toBeNull();
  const authId = data!.user!.id;

  const admin = createAdminClient();
  let groupId: string | null = null;
  for (let i = 0; i < 20 && !groupId; i++) {
    const { data: profile } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('auth_user_id', authId)
      .maybeSingle();
    groupId = (profile?.personal_group_id as string) ?? null;
    if (!groupId) await new Promise((r) => setTimeout(r, 250));
  }
  expect(groupId).not.toBeNull();
  return { authId, groupId: groupId! };
};

describe('TASK-INT-03 — E2E teardown erases the personal group with the account', () => {
  it('THE TRAP: deleting the personal group before the auth user is refused', async () => {
    // This is the substrate behaviour that makes the ordering mandatory, pinned
    // directly. `users` references the group, so the delete fires the FK's
    // SET NULL on users.personal_group_id, which an immutability trigger
    // rejects. The old helpers discarded exactly this error.
    const { authId, groupId } = await createMist();
    const admin = createAdminClient();

    const { error } = await admin.from('groups').delete().eq('id', groupId);

    expect(error).not.toBeNull();
    expect(error?.message ?? '').toMatch(/personal_group_id cannot be changed/i);
    // and it is still there — the delete did nothing
    expect(await orphanCount(groupId)).toBe(1);

    await eraseUserAndPersonalGroup(admin, authId, groupId);
  }, 60000);

  it('eraseUserAndPersonalGroup leaves no orphan behind', async () => {
    const { authId, groupId } = await createMist();
    const admin = createAdminClient();

    await eraseUserAndPersonalGroup(admin, authId, groupId);

    expect(await orphanCount(groupId)).toBe(0);
  }, 60000);

  it('deleteE2EUserByAuthId — the shape 24 spec teardowns used — takes the group too', async () => {
    const { authId, groupId } = await createMist();
    const admin = createAdminClient();

    await deleteE2EUserByAuthId(admin, authId);

    expect(await orphanCount(groupId)).toBe(0);
  }, 60000);

  it('erasure is idempotent — a second call on an already-erased identity is inert', async () => {
    const { authId, groupId } = await createMist();
    const admin = createAdminClient();

    await deleteE2EUserByAuthId(admin, authId);
    await expect(deleteE2EUserByAuthId(admin, authId)).resolves.toBeUndefined();

    expect(await orphanCount(groupId)).toBe(0);
  }, 60000);
});
