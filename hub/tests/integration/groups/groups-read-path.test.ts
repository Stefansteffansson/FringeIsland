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
import { fetchMemberGroups } from '@/lib/groups/queries';

/**
 * FEAT-H001 STORY-2 — the /groups read path (GRP-4), RLS-scoped (V2).
 * fetchMemberGroups() is the shared data-access function the API route runs;
 * exercising it directly with an authenticated anon client proves the read
 * path AND that RLS scopes the result to the viewer's own active memberships.
 * Seeded from oracle behaviour B-GRP-003 (regular member sees only their groups).
 */
describe('FEAT-H001 STORY-2 — /groups read path (GRP-4, RLS-scoped)', () => {
  const admin = createAdminClient();
  let member: TestUser;
  let other: TestUser;
  let memberGroupId: string;
  let privateGroupId: string;

  beforeAll(async () => {
    member = await createTestUser({ displayName: 'Member A' });
    other = await createTestUser({ displayName: 'Owner B' });

    // An engagement group the member is an ACTIVE member of.
    const { data: g1, error: e1 } = await admin
      .from('groups')
      .insert({
        name: 'Skeleton Cohort',
        description: 'A test engagement group',
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

    // A private engagement group the member is NOT a member of.
    const { data: g2, error: e2 } = await admin
      .from('groups')
      .insert({
        name: 'Other Private Group',
        group_type: 'engagement',
        is_public: false,
        created_by_group_id: other.personalGroupId,
      })
      .select('id')
      .single();
    if (e2) throw e2;
    privateGroupId = g2.id;

    const { error: m2 } = await admin.from('group_memberships').insert({
      group_id: privateGroupId,
      member_group_id: other.personalGroupId,
      status: 'active',
      added_by_group_id: other.personalGroupId,
    });
    if (m2) throw m2;
  });

  afterAll(async () => {
    if (memberGroupId) await cleanupTestGroup(memberGroupId);
    if (privateGroupId) await cleanupTestGroup(privateGroupId);
    if (member) await cleanupTestUser(member.user.id);
    if (other) await cleanupTestUser(other.user.id);
  });

  it("returns the member's active engagement group", async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, member.email, member.password);

    const groups = await fetchMemberGroups(supabase);
    const ids = groups.map((g) => g.id);

    expect(ids).toContain(memberGroupId);
    const cohort = groups.find((g) => g.id === memberGroupId);
    expect(cohort?.name).toBe('Skeleton Cohort');
    expect(cohort?.member_count).toBeGreaterThanOrEqual(1);
  });

  it('excludes a private group the member is not an active member of (RLS scoping)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, member.email, member.password);

    const groups = await fetchMemberGroups(supabase);
    const ids = groups.map((g) => g.id);

    expect(ids).not.toContain(privateGroupId);
  });

  it('returns an empty list for a member with no engagement memberships', async () => {
    const loner = await createTestUser({ displayName: 'Loner' });
    try {
      const supabase = createTestClient();
      await signInWithRetry(supabase, loner.email, loner.password);

      const groups = await fetchMemberGroups(supabase);
      expect(groups).toEqual([]);
    } finally {
      await cleanupTestUser(loner.user.id);
    }
  });
});
