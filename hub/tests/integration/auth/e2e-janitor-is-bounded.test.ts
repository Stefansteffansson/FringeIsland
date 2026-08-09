import { describe, it, expect } from '@jest/globals';
import { createTestClient, createAdminClient, withAnonRateLimitRetry } from '../../helpers/supabase';
import {
  cleanupAnonymousUsers,
  listAnonymousUsers,
  anonymousSweepWatermark,
  runAdminSqlRows,
} from '../../e2e/helpers/auth';

/**
 * TASK-E2E-04 — the anonymous janitor must be BOUNDED and must be COMPLETE.
 *
 * `cleanupAnonymousUsers` ran inside a 30-second `afterAll` in three Mist specs
 * and resolved its batch with `auth.admin.listUsers({ perPage: 200 })` filtered
 * client-side on `is_anonymous`. That single line carried two defects:
 *
 *  1. UNBOUNDED — the sweep was O(every anonymous user visible), and N grows
 *     during a fleet because the fleet is what mints Mists. Teardown got slower
 *     the longer the fleet ran and failed only in a fleet (2026-08-09:
 *     entry.spec:46, onboarding-arrival.spec:93, transcendence.spec:83, all
 *     three `"afterAll" hook timeout of 30000ms exceeded`).
 *
 *  2. BLIND — `perPage: 200` pages over ALL users, not anonymous ones. Measured
 *     2026-08-09 against the dev DB: 2 978 auth users, 43 of them anonymous,
 *     and ZERO of those 43 in the newest 200. Mists minted by a fleet dominate
 *     page 1 and get swept; Mists that fall off it are invisible to every
 *     subsequent sweep forever. The oldest survivor dated 2026-06-27.
 *
 * The fix is one mechanism for both: resolve the batch by SQL against
 * `auth.users` — exact, one round-trip regardless of N — and bound it with a
 * creation watermark so a spec sweeps only what it minted. The unbounded sweep
 * survives, but is paid ONCE in global teardown where there is no 30s budget.
 *
 * NOTE — this suite mints and erases real Mists against the dev DB, and one
 * case deliberately performs an UNBOUNDED sweep. Do not run it concurrently
 * with an E2E fleet: it would erase the fleet's live anonymous users.
 */

/** Mint a Mist and return its auth id + materialised personal group id. */
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

/** Does this auth user still exist? Asked of the substrate, not of a helper. */
const authUserExists = async (authId: string): Promise<boolean> => {
  const rows = await runAdminSqlRows(
    `SELECT count(*)::int AS n FROM auth.users WHERE id = '${authId}';`,
  );
  return Number(rows?.[0]?.n ?? 0) > 0;
};

/** Does this group still exist? */
const groupExists = async (groupId: string): Promise<boolean> => {
  const admin = createAdminClient();
  const { count } = await admin
    .from('groups')
    .select('id', { count: 'exact', head: true })
    .eq('id', groupId);
  return (count ?? 0) > 0;
};

const anonymousCountFromSubstrate = async (): Promise<number> => {
  const rows = await runAdminSqlRows(
    `SELECT count(*)::int AS n FROM auth.users WHERE is_anonymous;`,
  );
  return Number(rows?.[0]?.n ?? 0);
};

describe('TASK-E2E-04 — the anonymous janitor is bounded and complete', () => {
  it('THE BOUND: a watermarked sweep erases what came after it and leaves what came before', async () => {
    // This is the mechanism removal. The old janitor took no watermark at all,
    // so it erased both Mists — which is precisely why its cost tracked the
    // whole database instead of the spec's own footprint.
    const older = await createMist();

    const watermark = await anonymousSweepWatermark();

    const newer = await createMist();

    await cleanupAnonymousUsers(createAdminClient(), { since: watermark });

    // what the "spec" minted is gone, group and all (the TASK-INT-03 property)
    expect(await authUserExists(newer.authId)).toBe(false);
    expect(await groupExists(newer.groupId)).toBe(false);

    // and what predates the watermark was never touched — the bound is real
    expect(await authUserExists(older.authId)).toBe(true);
    expect(await groupExists(older.groupId)).toBe(true);

    // clean up the older one explicitly, through the same bounded door
    await cleanupAnonymousUsers(createAdminClient(), { since: '1970-01-01T00:00:00.000Z' });
    expect(await authUserExists(older.authId)).toBe(false);
    expect(await groupExists(older.groupId)).toBe(false);
  }, 120000);

  it('THE BLIND SPOT: the unbounded sweep reaches every anonymous user, not just a page of 200', async () => {
    // The dev DB carries 2 978 auth users; `listUsers({ perPage: 200 })` could
    // see at most 200 of them and, measured, saw NONE of the 43 anonymous ones.
    // The contract is stated against the substrate's own count so it holds at
    // any N: after an unbounded sweep, no anonymous user remains.
    await cleanupAnonymousUsers(createAdminClient());

    expect(await anonymousCountFromSubstrate()).toBe(0);
  }, 300000);

  it('the batch is resolved by SQL and agrees with the substrate exactly', async () => {
    const mist = await createMist();

    const listed = await listAnonymousUsers();
    const truth = await anonymousCountFromSubstrate();

    expect(listed.length).toBe(truth);
    expect(listed.map((u) => u.authId)).toContain(mist.authId);
    // the personal group travels with the row, so the sweep needs no per-user read
    expect(listed.find((u) => u.authId === mist.authId)?.personalGroupId).toBe(mist.groupId);

    await cleanupAnonymousUsers(createAdminClient(), { since: '1970-01-01T00:00:00.000Z' });
  }, 120000);

  it('a malformed watermark throws rather than silently sweeping everything', async () => {
    // Fail loudly. A watermark that quietly parsed to nothing would restore the
    // unbounded sweep inside the 30s budget and look like it was working.
    await expect(cleanupAnonymousUsers(createAdminClient(), { since: 'yesterday' })).rejects.toThrow(
      /watermark/i,
    );
  }, 60000);
});
