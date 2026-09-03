import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * TASK-H017-01 — the pending-nominations read chain is RETIRED.
 *
 * FEAT-PC016's `get_my_pending_nominations()` was built (J-A, 2026-07-07) for
 * the Hub's PendingNominations panel. A-NTF N-B (FEAT-H031) moved the
 * nominee's answer into the notification bell — a different read path
 * (`get_own_notifications`) — and N-C (FEAT-H032) dropped the last bundle
 * caller. Nothing has called the contract since. Ruled 2026-09-03: retire the
 * whole chain (route + lib relay + contract + this file's predecessor,
 * `pending-nominations-contract.test.ts`).
 *
 * Red-first at HEAD: the function is live, so the two absence cells FAIL
 * until migration `20260903090000` applies (the schema gate). The third cell
 * is a PIN, not TDD — it is green at HEAD by design: it names where the
 * capability lives now, so a future reader cannot mistake the retirement
 * for a loss (task AC: "no member-facing capability changes").
 */
describe('TASK-H017-01 — get_my_pending_nominations() retired; the bell carries the capability', () => {
  const admin = createAdminClient();
  let steward: TestUser;
  let nominee: TestUser;
  let groupId: string;

  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  beforeAll(async () => {
    steward = await createTestUser({ displayName: 'H017-01 Steward' });
    nominee = await createTestUser({ displayName: 'H017-01 Nominee' });
    createdUserIds.push(steward.user.id, nominee.user.id);

    const cs = await asUser(steward);
    const { data: gid, error } = await cs.rpc('create_engagement_group', { p_name: 'H017-01 Group' });
    if (error) throw new Error(`create_engagement_group: ${error.message}`);
    groupId = gid as string;
    createdGroupIds.push(groupId);

    const { error: mErr } = await admin.from('group_memberships').insert({
      group_id: groupId,
      member_group_id: nominee.personalGroupId,
      status: 'active',
      added_by_group_id: steward.personalGroupId,
    });
    if (mErr) throw new Error(`membership: ${mErr.message}`);

    const { error: nErr } = await cs.rpc('nominate_steward', {
      p_group_id: groupId,
      p_nominee_ids: [nominee.personalGroupId],
    });
    if (nErr) throw new Error(`nominate_steward: ${nErr.message}`);
  }, 120000);

  afterAll(async () => {
    for (const id of createdGroupIds.reverse()) {
      await cleanupTestGroup(id);
    }
    for (const id of createdUserIds) {
      await cleanupTestUser(id);
    }
  }, 120000);

  it('the contract is absent from the catalog (pg_proc has no get_my_pending_nominations)', async () => {
    const rows = await runAdminSql(
      `SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'get_my_pending_nominations';`,
    );
    expect(rows).toEqual([]);
  });

  it('a FIM calling the retired contract gets PGRST202 (function absent), not a payload', async () => {
    const c = await asUser(nominee);
    const { data, error } = await c.rpc('get_my_pending_nominations');
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.code).toBe('PGRST202');
  });

  it('PIN (green at HEAD by design): the nominee still sees the offer through the bell contract', async () => {
    const c = await asUser(nominee);
    const { data, error } = await c.rpc('get_own_notifications', { p_limit: 50 });
    expect(error).toBeNull();
    const rows = data as Array<{ kind: string; group_id?: string | null }>;
    const offer = rows.find((r) => r.kind === 'stewardship_nomination' && r.group_id === groupId);
    expect(offer).toBeTruthy();
  });
});
