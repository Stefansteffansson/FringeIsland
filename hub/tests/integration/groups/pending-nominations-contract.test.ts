import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  withAnonRateLimitRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-PC016 (rider on the J-A migration) — get_my_pending_nominations().
 *
 * Red-first: every call fails PGRST202 (function absent) until the migration
 * lands. Fixtures ride the REAL writer (nominate_steward, FEAT-PC014/PC015)
 * so the row shape is the substrate's own; the expired/acted variants are
 * admin-adjusted afterwards (expires_at backdate, action_taken set) — the
 * respond path itself is deliberately untouched (spec rabbit-hole).
 */
describe('FEAT-PC016 — pending-nominations read contract (J-A rider)', () => {
  const admin = createAdminClient();
  let stewardA: TestUser; // creates GA + GC, nominates `nominee` in both
  let stewardB: TestUser; // creates GB, nominates `otherUser`
  let nominee: TestUser;
  let otherUser: TestUser;

  let ga: string;
  let gb: string;
  let gc: string;

  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const seedGroupWithMember = async (name: string, creator: TestUser, memberUser: TestUser): Promise<string> => {
    const c = await asUser(creator);
    const { data: groupId, error } = await c.rpc('create_engagement_group', { p_name: name });
    if (error) throw new Error(`seedGroupWithMember(${name}): ${error.message}`);
    createdGroupIds.push(groupId as string);
    const { error: mErr } = await admin.from('group_memberships').insert({
      group_id: groupId,
      member_group_id: memberUser.personalGroupId,
      status: 'active',
      added_by_group_id: creator.personalGroupId,
    });
    if (mErr) throw new Error(`seedGroupWithMember membership: ${mErr.message}`);
    return groupId as string;
  };

  const nominate = async (steward: TestUser, groupId: string, nomineeUser: TestUser): Promise<void> => {
    const c = await asUser(steward);
    const { error } = await c.rpc('nominate_steward', {
      p_group_id: groupId,
      p_nominee_ids: [nomineeUser.personalGroupId],
    });
    if (error) throw new Error(`nominate(${groupId}): ${error.message}`);
  };

  const pendingRowFor = async (groupId: string, recipient: TestUser): Promise<string> => {
    const { data, error } = await admin
      .from('notifications')
      .select('id')
      .eq('recipient_group_id', recipient.personalGroupId)
      .eq('type', 'stewardship_nomination')
      .eq('group_id', groupId)
      .single();
    if (error) throw new Error(`pendingRowFor(${groupId}): ${error.message}`);
    return data!.id as string;
  };

  beforeAll(async () => {
    stewardA = await createTestUser({ displayName: 'PC016 Steward A' });
    stewardB = await createTestUser({ displayName: 'PC016 Steward B' });
    nominee = await createTestUser({ displayName: 'PC016 Nominee' });
    otherUser = await createTestUser({ displayName: 'PC016 Other' });
    createdUserIds.push(stewardA.user.id, stewardB.user.id, nominee.user.id, otherUser.user.id);

    ga = await seedGroupWithMember('PC016 GA', stewardA, nominee);
    gc = await seedGroupWithMember('PC016 GC', stewardA, nominee);
    gb = await seedGroupWithMember('PC016 GB', stewardB, otherUser);

    await nominate(stewardA, ga, nominee);
    await nominate(stewardA, gc, nominee);
    await nominate(stewardB, gb, otherUser);
  }, 120000);

  afterAll(async () => {
    for (const id of createdGroupIds.reverse()) {
      await cleanupTestGroup(id);
    }
    for (const id of createdUserIds) {
      await cleanupTestUser(id);
    }
  }, 120000);

  it('returns exactly the caller-recipient pending rows, newest first, with the PendingNomination fields', async () => {
    const c = await asUser(nominee);
    const { data, error } = await c.rpc('get_my_pending_nominations');
    expect(error).toBeNull();
    const rows = data as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    // newest first: GC was nominated after GA
    expect(rows[0].group_id).toBe(gc);
    expect(rows[1].group_id).toBe(ga);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(['created_at', 'expires_at', 'group_id', 'group_name', 'notification_id']);
    }
    expect(rows[0].group_name).toBe('PC016 GC');
    expect(rows[1].group_name).toBe('PC016 GA');
    // own-window: GB's nomination (otherUser's) never appears
    expect(rows.map((r) => r.group_id)).not.toContain(gb);
  });

  it('scopes to the caller: the other nominee sees exactly their own row', async () => {
    const c = await asUser(otherUser);
    const { data, error } = await c.rpc('get_my_pending_nominations');
    expect(error).toBeNull();
    const rows = data as Array<{ group_id: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].group_id).toBe(gb);
  });

  it('excludes an expired nomination by the SERVER clock', async () => {
    const gcRow = await pendingRowFor(gc, nominee);
    await runAdminSql(
      `UPDATE public.notifications SET expires_at = now() - interval '1 hour' WHERE id = '${gcRow}';`,
    );
    const c = await asUser(nominee);
    const { data, error } = await c.rpc('get_my_pending_nominations');
    expect(error).toBeNull();
    const rows = data as Array<{ group_id: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].group_id).toBe(ga);
  });

  it('excludes an acted-on nomination (action_taken set)', async () => {
    const gaRow = await pendingRowFor(ga, nominee);
    await runAdminSql(`UPDATE public.notifications SET action_taken = 'declined' WHERE id = '${gaRow}';`);
    const c = await asUser(nominee);
    const { data, error } = await c.rpc('get_my_pending_nominations');
    expect(error).toBeNull();
    expect(data as unknown[]).toEqual([]);
  });

  it('returns [] for a FIM with none', async () => {
    const c = await asUser(stewardA);
    const { data, error } = await c.rpc('get_my_pending_nominations');
    expect(error).toBeNull();
    expect(data as unknown[]).toEqual([]);
  });

  it('refuses a Mist (42501 — the get_my_invitations FIM-only mirror)', async () => {
    const c = createTestClient();
    const { error: anonErr } = await withAnonRateLimitRetry(() => c.auth.signInAnonymously());
    expect(anonErr).toBeNull();
    const { error } = await c.rpc('get_my_pending_nominations');
    expect(error).not.toBeNull();
    expect(error!.code).toBe('42501');
  });
});
