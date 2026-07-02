import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  type TestUser,
} from '@/tests/helpers/supabase';

/**
 * GRP-4 / ADR-U038 F2 — the member-groups read-model is PLATFORM-SIDE. This calls
 * get_member_groups() DIRECTLY (the sibling-Surface / Gimbal path) to prove the whole
 * composition + own-scoping lives in the substrate, not in Hub client code. Red-first:
 * fails until the RPC lands.
 */
describe('GRP-4 / ADR-U038 F2 — get_member_groups contract (server-side composition)', () => {
  const admin = createAdminClient();
  let member: TestUser;
  let outsider: TestUser;
  let memberGroupId: string;
  let foreignGroupId: string;

  beforeAll(async () => {
    member = await createTestUser({ displayName: 'Contract Member' });
    outsider = await createTestUser({ displayName: 'Contract Outsider' });

    const { data: g1, error: e1 } = await admin
      .from('groups')
      .insert({
        name: 'Contract Cohort',
        group_type: 'engagement',
        is_public: false,
        created_by_group_id: member.personalGroupId,
      })
      .select('id')
      .single();
    if (e1) throw e1;
    memberGroupId = g1.id;
    const { error: m1 } = await admin.from('group_memberships').insert({
      group_id: memberGroupId,
      member_group_id: member.personalGroupId,
      status: 'active',
      added_by_group_id: member.personalGroupId,
    });
    if (m1) throw m1;

    const { data: g2, error: e2 } = await admin
      .from('groups')
      .insert({
        name: 'Foreign Cohort',
        group_type: 'engagement',
        is_public: false,
        created_by_group_id: outsider.personalGroupId,
      })
      .select('id')
      .single();
    if (e2) throw e2;
    foreignGroupId = g2.id;
    const { error: m2 } = await admin.from('group_memberships').insert({
      group_id: foreignGroupId,
      member_group_id: outsider.personalGroupId,
      status: 'active',
      added_by_group_id: outsider.personalGroupId,
    });
    if (m2) throw m2;
  });

  afterAll(async () => {
    if (memberGroupId) await cleanupTestGroup(memberGroupId);
    if (foreignGroupId) await cleanupTestGroup(foreignGroupId);
    if (member) await cleanupTestUser(member.user.id);
    if (outsider) await cleanupTestUser(outsider.user.id);
  });

  it('returns the caller own active engagement group with its shape and member_count, own-scoped', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, member.email, member.password);

    const { data, error } = await supabase.rpc('get_member_groups');
    expect(error).toBeNull();
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const cohort = rows.find((g) => g.id === memberGroupId);
    expect(cohort).toBeDefined();
    expect(cohort!.name).toBe('Contract Cohort');
    expect(Number(cohort!.member_count)).toBeGreaterThanOrEqual(1);
    // Own-scoped: the outsider's group is never returned, even though it exists.
    expect(rows.some((g) => g.id === foreignGroupId)).toBe(false);
  });
});
