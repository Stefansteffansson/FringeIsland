/**
 * FEAT-PC015 (Groups Cycle G-F) — group-of-groups membership & acting contracts.
 *
 * ADR-U041: acting as a group is a permission (`act_as_group`, Steward-seeded);
 * representatives are always people (no chaining); depth-1 only; system groups
 * un-nominatable; system members visible but never treated as people.
 *
 * Red-first for: `invite_group`, `search_invitable_groups`,
 * `respond_to_group_invitation`, `leave_group_as_group`, `get_acting_contexts`,
 * `get_group_memberships_of`, the persons-only `nominate_steward` eligibility,
 * the `act_as_group` catalog key, and the additive `get_group_detail` fields
 * (`member_group_type`, `non_system_member_count`).
 */
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
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

jest.setTimeout(60_000); // real-substrate suite: sign-ins + fixtures per test
const GHOST = '00000000-0000-0000-0000-00000000dead';

const admin = createAdminClient();
const createdUserIds: string[] = [];
const createdGroupIds: string[] = [];

const asUser = async (u: TestUser): Promise<SupabaseClient> => {
  const c = createTestClient();
  await signInWithRetry(c, u.email, u.password);
  return c;
};

const asMist = async (): Promise<SupabaseClient> => {
  const c = createTestClient();
  const { error } = await withAnonRateLimitRetry(() => c.auth.signInAnonymously());
  expect(error).toBeNull();
  return c;
};

const deusExGroupId = async (): Promise<string> => {
  const rows = await runAdminSql(
    `SELECT id FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';`,
  );
  return rows[0].id as string;
};

/** Create an engagement group as `steward`, tracked for teardown. */
const seedGroup = async (steward: TestUser, name: string, isPublic = false): Promise<string> => {
  const c = await asUser(steward);
  const { data: groupId, error } = await c.rpc('create_engagement_group', { p_name: name });
  if (error) throw new Error(`seedGroup(${name}): ${error.message}`);
  createdGroupIds.push(groupId as string);
  await admin.from('groups').update({ is_public: isPublic }).eq('id', groupId);
  await c.auth.signOut();
  return groupId as string;
};

/** Directly seed an active membership row (the B-D15 oracle pattern). */
const seedMembership = async (
  groupId: string,
  memberGroupId: string,
  addedBy: TestUser,
  status: 'active' | 'invited' = 'active',
): Promise<string> => {
  const { data, error } = await admin
    .from('group_memberships')
    .insert({
      group_id: groupId,
      member_group_id: memberGroupId,
      status,
      added_by_group_id: addedBy.personalGroupId,
    })
    .select('id')
    .single();
  expect(error).toBeNull();
  return (data as { id: string }).id;
};

const run = `${Date.now()}`;

describe('FEAT-PC015 — group-of-groups membership & acting contracts (ADR-U041)', () => {
  let stewardA: TestUser; // Steward of acting group A (holds act_as_group post-migration)
  let memberA: TestUser; // plain member of A — no wielding key
  let stewardB: TestUser; // Steward of context group B
  let memberB: TestUser; // plain member of B — no invite_members
  let nominee: TestUser; // person nominee for STORY-6 sanity
  let groupA: string; // acting engagement group
  let groupB: string; // context engagement group
  let deusEx: string;

  beforeAll(async () => {
    deusEx = await deusExGroupId();
    stewardA = await createTestUser({ displayName: 'GofA' });
    memberA = await createTestUser({ displayName: 'GofAm' });
    stewardB = await createTestUser({ displayName: 'GofB' });
    memberB = await createTestUser({ displayName: 'GofBm' });
    nominee = await createTestUser({ displayName: 'GofN' });
    for (const u of [stewardA, memberA, stewardB, memberB, nominee]) {
      createdUserIds.push(u.user.id);
    }
    groupA = await seedGroup(stewardA, `GoG-A-${run}`, true);
    groupB = await seedGroup(stewardB, `GoG-B-${run}`, true);
    await seedMembership(groupA, memberA.personalGroupId, stewardA);
    await seedMembership(groupB, memberB.personalGroupId, stewardB);
  }, 120_000);

  afterAll(async () => {
    // TASK-INT-03: REVERSE creation order, and the reason is not obvious.
    //
    // `user_group_roles` cascades on `member_group_id` as well as `group_id`.
    // So deleting a group that is the sole Steward OF ANOTHER GROUP cascades
    // into that other group's roles — and the sole-Steward guard's "parent is
    // gone, allow it" exemption (20260228120745:32) checks `OLD.group_id`, the
    // group whose roles they are, which is still very much there. The delete is
    // refused, `cleanupTestGroup` only logs it, and the group's Steward then
    // fails `cleanupTestUser` and leaks a personal group.
    //
    // This suite is group-of-groups, so its later groups are precisely the ones
    // its earlier groups hold roles in. Creation order therefore kills the
    // parents first and strands the rest. Reverse order removes the dependents
    // before the groups they point at.
    //
    // The guard is correct and untouched — a real member list must never lose
    // its last Steward. Teardown order is the fixture's problem to solve.
    for (const id of [...createdGroupIds].reverse()) await cleanupTestGroup(id);
    for (const id of createdUserIds) await cleanupTestUser(id);
  }, 120_000);

  // --------------------------------------------------------------------------
  // STORY-1: the wielding key exists
  // --------------------------------------------------------------------------
  describe('STORY-1 — act_as_group key seeded', () => {
    it('S1: the catalog carries act_as_group', async () => {
      const rows = await runAdminSql(
        `SELECT name, category FROM public.permissions WHERE name = 'act_as_group';`,
      );
      expect(rows.length).toBe(1);
    });

    it('S1: the Steward Role Template grants act_as_group', async () => {
      const rows = await runAdminSql(
        `SELECT 1 FROM public.role_template_permissions rtp
           JOIN public.role_templates rt ON rt.id = rtp.role_template_id
           JOIN public.permissions p ON p.id = rtp.permission_id
          WHERE rt.name = 'Steward Role Template' AND p.name = 'act_as_group';`,
      );
      expect(rows.length).toBe(1);
    });

    it("S1: a fresh group's Steward resolves act_as_group; a plain member does not", async () => {
      const c = await asUser(stewardA);
      const { data, error } = await c.rpc('get_user_permissions', {
        p_acting_group_id: stewardA.personalGroupId,
        p_context_group_id: groupA,
      });
      expect(error).toBeNull();
      expect(data as string[]).toContain('act_as_group');
      await c.auth.signOut();

      const cm = await asUser(memberA);
      const { data: md } = await cm.rpc('get_user_permissions', {
        p_acting_group_id: memberA.personalGroupId,
        p_context_group_id: groupA,
      });
      expect((md ?? []) as string[]).not.toContain('act_as_group');
      await cm.auth.signOut();
    });
  });

  // --------------------------------------------------------------------------
  // STORY-2: invite_group + search_invitable_groups
  // --------------------------------------------------------------------------
  describe('STORY-2 — a Steward invites a group', () => {
    it('S2: invite_members holder invites engagement group A into B → invited row', async () => {
      const c = await asUser(stewardB);
      const { error } = await c.rpc('invite_group', {
        p_group_id: groupB,
        p_invited_group_id: groupA,
      });
      expect(error).toBeNull();
      await c.auth.signOut();

      const rows = await runAdminSql(
        `SELECT status, added_by_group_id FROM public.group_memberships
          WHERE group_id = '${groupB}' AND member_group_id = '${groupA}';`,
      );
      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('invited');
      expect(rows[0].added_by_group_id).toBe(stewardB.personalGroupId);
    });

    it('S2: personal and system targets are P0002 (no enumeration)', async () => {
      const c = await asUser(stewardB);
      const personal = await c.rpc('invite_group', {
        p_group_id: groupB,
        p_invited_group_id: memberA.personalGroupId,
      });
      expect(personal.error?.code).toBe('P0002');
      const system = await c.rpc('invite_group', {
        p_group_id: groupB,
        p_invited_group_id: deusEx,
      });
      expect(system.error?.code).toBe('P0002');
      const ghost = await c.rpc('invite_group', {
        p_group_id: groupB,
        p_invited_group_id: GHOST,
      });
      expect(ghost.error?.code).toBe('P0002');
      await c.auth.signOut();
    });

    it('S2: self-join, duplicate, and direct cycle are 22023 with honest reasons', async () => {
      const c = await asUser(stewardB);
      const self = await c.rpc('invite_group', {
        p_group_id: groupB,
        p_invited_group_id: groupB,
      });
      expect(self.error?.code).toBe('22023');
      const dup = await c.rpc('invite_group', {
        p_group_id: groupB,
        p_invited_group_id: groupA, // already invited in the first test
      });
      expect(dup.error?.code).toBe('22023');
      await c.auth.signOut();

      // Direct cycle: B is an active member of A → A cannot invite B.
      await seedMembership(groupA, groupB, stewardA);
      const ca = await asUser(stewardA);
      const cycle = await ca.rpc('invite_group', {
        p_group_id: groupA,
        p_invited_group_id: groupB,
      });
      expect(cycle.error?.code).toBe('22023');
      await ca.auth.signOut();
      await admin
        .from('group_memberships')
        .delete()
        .eq('group_id', groupA)
        .eq('member_group_id', groupB);
    });

    it('S2: keyless member, Mist, and anon role are refused', async () => {
      const cm = await asUser(memberB);
      const keyless = await cm.rpc('invite_group', {
        p_group_id: groupB,
        p_invited_group_id: groupA,
      });
      expect(keyless.error?.code).toBe('42501');
      await cm.auth.signOut();

      const mist = await asMist();
      const asAnonSession = await mist.rpc('invite_group', {
        p_group_id: groupB,
        p_invited_group_id: groupA,
      });
      expect(asAnonSession.error?.code).toBe('42501');
      await mist.auth.signOut();

      const bare = createTestClient();
      const anon = await bare.rpc('invite_group', {
        p_group_id: groupB,
        p_invited_group_id: groupA,
      });
      expect(anon.error).not.toBeNull();
    });

    it('S2: search_invitable_groups matches public engagement groups, cap 8, excluding self and existing', async () => {
      const c = await asUser(stewardB);
      const { data, error } = await c.rpc('search_invitable_groups', {
        p_group_id: groupB,
        p_query: `GoG-`,
      });
      expect(error).toBeNull();
      const names = ((data ?? []) as Array<{ id: string; name: string }>).map((g) => g.id);
      expect(names.length).toBeLessThanOrEqual(8);
      expect(names).not.toContain(groupB); // never itself
      expect(names).not.toContain(groupA); // already invited
      await c.auth.signOut();
    });
  });

  // --------------------------------------------------------------------------
  // STORY-3: the wielded answer
  // --------------------------------------------------------------------------
  describe('STORY-3 — respond_to_group_invitation (wielded)', () => {
    let membershipId: string;

    beforeAll(async () => {
      const rows = await runAdminSql(
        `SELECT id FROM public.group_memberships
          WHERE group_id = '${groupB}' AND member_group_id = '${groupA}' AND status = 'invited';`,
      );
      membershipId = rows[0].id as string;
    });

    it('S3: a keyless member of A cannot answer; neither can B’s Steward', async () => {
      const cm = await asUser(memberA);
      const keyless = await cm.rpc('respond_to_group_invitation', {
        p_membership_id: membershipId,
        p_accept: true,
      });
      expect(keyless.error?.code).toBe('42501');
      await cm.auth.signOut();

      const cb = await asUser(stewardB);
      const wrongSide = await cb.rpc('respond_to_group_invitation', {
        p_membership_id: membershipId,
        p_accept: true,
      });
      expect(wrongSide.error?.code).toBe('42501');
      await cb.auth.signOut();
    });

    it('S3: an act_as_group holder accepts → active + Member instance + audit trace', async () => {
      const c = await asUser(stewardA);
      const { error } = await c.rpc('respond_to_group_invitation', {
        p_membership_id: membershipId,
        p_accept: true,
      });
      expect(error).toBeNull();
      await c.auth.signOut();

      const rows = await runAdminSql(
        `SELECT status, status_changed_by_group_id FROM public.group_memberships
          WHERE id = '${membershipId}';`,
      );
      expect(rows[0].status).toBe('active');
      expect(rows[0].status_changed_by_group_id).toBe(stewardA.personalGroupId);

      const roleRows = await runAdminSql(
        `SELECT 1 FROM public.user_group_roles ugr
           JOIN public.group_roles gr ON gr.id = ugr.group_role_id
          WHERE ugr.group_id = '${groupB}' AND ugr.member_group_id = '${groupA}';`,
      );
      expect(roleRows.length).toBeGreaterThanOrEqual(1);
    });

    it('S3: decline deletes the row', async () => {
      const otherId = await seedMembership(groupA, groupB, stewardA, 'invited');
      const c = await asUser(stewardB); // stewardB holds act_as_group in B post-migration
      const { error } = await c.rpc('respond_to_group_invitation', {
        p_membership_id: otherId,
        p_accept: false,
      });
      expect(error).toBeNull();
      await c.auth.signOut();
      const rows = await runAdminSql(
        `SELECT 1 FROM public.group_memberships WHERE id = '${otherId}';`,
      );
      expect(rows.length).toBe(0);
    });

    it('S3: ghost membership id is P0002', async () => {
      const c = await asUser(stewardA);
      const res = await c.rpc('respond_to_group_invitation', {
        p_membership_id: GHOST,
        p_accept: true,
      });
      expect(res.error?.code).toBe('P0002');
      await c.auth.signOut();
    });
  });

  // --------------------------------------------------------------------------
  // STORY-4: acting-context reads
  // --------------------------------------------------------------------------
  describe('STORY-4 — acting contexts readable', () => {
    it('S4: get_acting_contexts returns exactly the wieldable groups', async () => {
      const c = await asUser(stewardA);
      const { data, error } = await c.rpc('get_acting_contexts');
      expect(error).toBeNull();
      const ids = ((data ?? []) as Array<{ group_id: string }>).map((g) => g.group_id);
      expect(ids).toContain(groupA);
      await c.auth.signOut();

      const cm = await asUser(memberA);
      const { data: md, error: me } = await cm.rpc('get_acting_contexts');
      expect(me).toBeNull();
      expect(((md ?? []) as unknown[]).length).toBe(0);
      await cm.auth.signOut();
    });

    it('S4b: the context-scoped read flags members-of-context (post-6-done fix, 2026-07-06 live testing)', async () => {
      // Live-testing finding: the selector offered hats with no standing. The
      // read now takes the context and flags which wieldable groups are its
      // active members — the Surface offers only those (self never; that
      // exclusion is Surface-side since a group is never a member of itself).
      const c = await asUser(stewardA);
      const inB = await c.rpc('get_acting_contexts', { p_context_group_id: groupB });
      expect(inB.error).toBeNull();
      const rowInB = ((inB.data ?? []) as Array<{ group_id: string; is_member_of_context: boolean }>).find(
        (r) => r.group_id === groupA,
      );
      expect(rowInB?.is_member_of_context).toBe(true); // A is active in B here (post S3-accept)

      const inA = await c.rpc('get_acting_contexts', { p_context_group_id: groupA });
      expect(inA.error).toBeNull();
      const rowInA = ((inA.data ?? []) as Array<{ group_id: string; is_member_of_context: boolean }>).find(
        (r) => r.group_id === groupA,
      );
      expect(rowInA?.is_member_of_context).toBe(false); // never a member of itself
      await c.auth.signOut();
    });

    it('S4: get_group_memberships_of is wielding-gated', async () => {
      const c = await asUser(stewardA);
      const { data, error } = await c.rpc('get_group_memberships_of', {
        p_acting_group_id: groupA,
      });
      expect(error).toBeNull();
      const contexts = (data ?? []) as Array<{ group_id: string; status: string }>;
      expect(contexts.some((r) => r.group_id === groupB && r.status === 'active')).toBe(true);
      await c.auth.signOut();

      const cm = await asUser(memberA);
      const keyless = await cm.rpc('get_group_memberships_of', {
        p_acting_group_id: groupA,
      });
      expect(keyless.error?.code).toBe('42501');
      await cm.auth.signOut();
    });
  });

  // --------------------------------------------------------------------------
  // STORY-5: the wielded exit
  // --------------------------------------------------------------------------
  describe('STORY-5 — leave_group_as_group', () => {
    it('S5: refused when the acting group holds the last active Steward role', async () => {
      // Make A the sole active Steward of a fresh group D.
      const d = await seedGroup(stewardB, `GoG-D-${run}`);
      await seedMembership(d, groupA, stewardB);
      await runAdminSql(
        `INSERT INTO public.user_group_roles (group_id, member_group_id, group_role_id, assigned_by_group_id)
         SELECT gr.group_id, '${groupA}', gr.id, '${stewardB.personalGroupId}'
           FROM public.group_roles gr
           JOIN public.role_templates rt ON rt.id = gr.created_from_role_template_id
          WHERE gr.group_id = '${d}' AND rt.name = 'Steward Role Template'
         ON CONFLICT DO NOTHING;
         DELETE FROM public.user_group_roles ugr
          USING public.group_roles gr, public.role_templates rt
          WHERE ugr.group_role_id = gr.id
            AND gr.created_from_role_template_id = rt.id
            AND rt.name = 'Steward Role Template'
            AND ugr.group_id = '${d}'
            AND ugr.member_group_id = '${stewardB.personalGroupId}';`,
      );
      const c = await asUser(stewardA);
      const res = await c.rpc('leave_group_as_group', {
        p_group_id: d,
        p_acting_group_id: groupA,
      });
      expect(res.error?.code).toBe('P0001'); // transfer first — honest refusal
      await c.auth.signOut();
    });

    it('S5: a wielder withdraws A from B → membership + roles gone', async () => {
      const c = await asUser(stewardA);
      const { error } = await c.rpc('leave_group_as_group', {
        p_group_id: groupB,
        p_acting_group_id: groupA,
      });
      expect(error).toBeNull();
      await c.auth.signOut();
      const rows = await runAdminSql(
        `SELECT 1 FROM public.group_memberships
          WHERE group_id = '${groupB}' AND member_group_id = '${groupA}'
         UNION ALL
         SELECT 1 FROM public.user_group_roles
          WHERE group_id = '${groupB}' AND member_group_id = '${groupA}';`,
      );
      expect(rows.length).toBe(0);
    });

    it('S5: absent membership is P0002; keyless caller is 42501', async () => {
      const c = await asUser(stewardA);
      const gone = await c.rpc('leave_group_as_group', {
        p_group_id: groupB,
        p_acting_group_id: groupA,
      });
      expect(gone.error?.code).toBe('P0002');
      await c.auth.signOut();

      const cm = await asUser(memberA);
      const keyless = await cm.rpc('leave_group_as_group', {
        p_group_id: groupB,
        p_acting_group_id: groupA,
      });
      expect(keyless.error?.code).toBe('42501');
      await cm.auth.signOut();
    });

    // W2 characterization (COR-A / spec B) — GREEN-BEFORE for the W4 relocation.
    // Pins the freeze predicate divergence unique to leave_group_as_group: the
    // pc015 body freezes every enrolment with `status <> 'frozen'` (migration
    // 20260706120000_..._group_of_groups_acting_contracts.sql:385), so a PAUSED
    // enrolment is ALSO frozen — unlike the sprint2 leave/remove cascades which
    // filter `status = 'active'`. Recorded as the live divergence in ADR-U047
    // rule 7; W4's DS-3 handler must preserve it. Public-journey enrolments stay
    // untouched (the negative control: j.is_public = false in the predicate).
    it('S5 [characterization]: the exit cascade freezes A’s active AND paused non-public enrolments (left_group), leaving public-journey enrolments alone — the pc015 `<> frozen` divergence', async () => {
      const parent = await seedGroup(stewardB, `GoG-P-${run}`);
      await seedMembership(parent, groupA, stewardB); // A active in parent; not a Steward, not last
      // Two non-public journeys owned by parent (one enrolment each, so the
      // active + paused rows don't collide on (journey_id, group_id)) + a public
      // journey as the negative control.
      const npActive = await runAdminSql(
        `INSERT INTO public.journeys (title, created_by_group_id, is_public)
         VALUES ('GoG-NP-active', '${parent}', false) RETURNING id;`,
      );
      const npPaused = await runAdminSql(
        `INSERT INTO public.journeys (title, created_by_group_id, is_public)
         VALUES ('GoG-NP-paused', '${parent}', false) RETURNING id;`,
      );
      const pubJourney = await runAdminSql(
        `INSERT INTO public.journeys (title, created_by_group_id, is_public)
         VALUES ('GoG-PUB', '${parent}', true) RETURNING id;`,
      );
      const activeEnrol = await runAdminSql(
        `INSERT INTO public.journey_enrollments (journey_id, group_id, status)
         VALUES ('${npActive[0].id}', '${groupA}', 'active') RETURNING id;`,
      );
      const pausedEnrol = await runAdminSql(
        `INSERT INTO public.journey_enrollments (journey_id, group_id, status)
         VALUES ('${npPaused[0].id}', '${groupA}', 'paused') RETURNING id;`,
      );
      const publicEnrol = await runAdminSql(
        `INSERT INTO public.journey_enrollments (journey_id, group_id, status)
         VALUES ('${pubJourney[0].id}', '${groupA}', 'active') RETURNING id;`,
      );

      const c = await asUser(stewardA);
      const { error } = await c.rpc('leave_group_as_group', {
        p_group_id: parent,
        p_acting_group_id: groupA,
      });
      expect(error).toBeNull();
      await c.auth.signOut();

      const states = await runAdminSql(
        `SELECT id, status FROM public.journey_enrollments
          WHERE id IN ('${activeEnrol[0].id}', '${pausedEnrol[0].id}', '${publicEnrol[0].id}');`,
      );
      const statusOf = (id: string) => states.find((r) => r.id === id)?.status;
      expect(statusOf(activeEnrol[0].id as string)).toBe('frozen');
      expect(statusOf(pausedEnrol[0].id as string)).toBe('frozen'); // the divergence: paused also frozen
      expect(statusOf(publicEnrol[0].id as string)).toBe('active'); // public journey untouched
    });
  });

  // --------------------------------------------------------------------------
  // STORY-6: persons only nominatable (ADR-U041 §4)
  // --------------------------------------------------------------------------
  describe('STORY-6 — nominee eligibility hardened to persons', () => {
    it('S6: a system-group member (DeusEx) is not nominatable', async () => {
      const e1 = await seedGroup(stewardB, `GoG-E1-${run}`);
      await runAdminSql(
        `INSERT INTO public.group_memberships (group_id, member_group_id, status, added_by_group_id)
         VALUES ('${e1}', '${deusEx}', 'active', '${stewardB.personalGroupId}')
         ON CONFLICT DO NOTHING;`,
      );
      const c = await asUser(stewardB);
      const res = await c.rpc('nominate_steward', {
        p_group_id: e1,
        p_nominee_ids: [deusEx],
      });
      expect(res.error?.code).toBe('22023');
      await c.auth.signOut();
    });

    it('S6: an engagement-group member is not nominatable; a person still is', async () => {
      const e2 = await seedGroup(stewardB, `GoG-E2-${run}`);
      await seedMembership(e2, groupA, stewardB);
      await seedMembership(e2, nominee.personalGroupId, stewardB);
      const c = await asUser(stewardB);
      const grp = await c.rpc('nominate_steward', {
        p_group_id: e2,
        p_nominee_ids: [groupA],
      });
      expect(grp.error?.code).toBe('22023');
      const person = await c.rpc('nominate_steward', {
        p_group_id: e2,
        p_nominee_ids: [nominee.personalGroupId],
      });
      expect(person.error).toBeNull();
      await c.auth.signOut();
    });
  });

  // --------------------------------------------------------------------------
  // STORY-7: honest member payloads (ADR-U041 §5)
  // --------------------------------------------------------------------------
  describe('STORY-7 — member_group_type + non_system_member_count', () => {
    it('S7: rows carry raw member_group_type; non-system count excludes the caretaker', async () => {
      const f = await seedGroup(stewardB, `GoG-F-${run}`);
      await seedMembership(f, groupA, stewardB);
      await runAdminSql(
        `INSERT INTO public.group_memberships (group_id, member_group_id, status, added_by_group_id)
         VALUES ('${f}', '${deusEx}', 'active', '${stewardB.personalGroupId}')
         ON CONFLICT DO NOTHING;`,
      );
      const c = await asUser(stewardB);
      const { data, error } = await c.rpc('get_group_detail', { p_group_id: f });
      expect(error).toBeNull();
      const detail = data as {
        member_count: number;
        non_system_member_count: number;
        members?: Array<{ member_group_id: string; member_group_type?: string }>;
      };
      expect(detail.member_count).toBe(3);
      expect(detail.non_system_member_count).toBe(2);
      const byId = (id: string) => detail.members?.find((m) => m.member_group_id === id);
      expect(byId(stewardB.personalGroupId)?.member_group_type).toBe('personal');
      expect(byId(groupA)?.member_group_type).toBe('engagement');
      expect(byId(deusEx)?.member_group_type).toBe('system');
      await c.auth.signOut();
    });
  });

  // --------------------------------------------------------------------------
  // Post-6-done — revealed visibility (2026-07-06 live testing, finding 3):
  // a group's page opens to those it has admitted or invited — directly, or
  // through a group they represent. The no-leak rule protects UNREVEALED
  // groups; an invitation / admission IS the group revealing itself.
  // --------------------------------------------------------------------------
  describe('Post-6-done — revealed visibility', () => {
    it('an invited viewer sees a private group\'s face', async () => {
      const v = await seedGroup(stewardB, `GoG-V-${run}`); // private
      await seedMembership(v, nominee.personalGroupId, stewardB, 'invited');
      const c = await asUser(nominee);
      const { data, error } = await c.rpc('get_group_detail', { p_group_id: v });
      expect(error).toBeNull();
      expect((data as { name: string }).name).toBe(`GoG-V-${run}`);
      // The face only: private + non-member + no keys → no member list.
      expect((data as { members?: unknown }).members).toBeUndefined();
      await c.auth.signOut();
    });

    it('a wielder sees the private group their group belongs to', async () => {
      const w = await seedGroup(stewardB, `GoG-W-${run}`); // private
      await seedMembership(w, groupA, stewardB); // A active in W
      const c = await asUser(stewardA); // wields A; personally NOT a member of W
      const { data, error } = await c.rpc('get_group_detail', { p_group_id: w });
      expect(error).toBeNull();
      expect((data as { name: string }).name).toBe(`GoG-W-${run}`);
      await c.auth.signOut();
    });

    it('no over-widening: a keyless member of A, and a stranger, stay refused (carried-forward guards)', async () => {
      const rows = await runAdminSql(
        `SELECT id FROM public.groups WHERE name = 'GoG-W-${run}';`,
      );
      const w = rows[0].id as string;
      const cm = await asUser(memberA); // in A, but no act_as_group
      const keyless = await cm.rpc('get_group_detail', { p_group_id: w });
      expect(keyless.error?.code).toBe('P0002');
      await cm.auth.signOut();
      const cs = await asUser(memberB); // no tie to W at all
      const stranger = await cs.rpc('get_group_detail', { p_group_id: w });
      expect(stranger.error?.code).toBe('P0002');
      await cs.auth.signOut();
    });
  });

  // --------------------------------------------------------------------------
  // ADR-U038 adversarial floor: no anon EXECUTE on any new function
  // --------------------------------------------------------------------------
  describe('API boundary — anon role holds nothing', () => {
    it.each([
      ['invite_group', { p_group_id: GHOST, p_invited_group_id: GHOST }],
      ['search_invitable_groups', { p_group_id: GHOST, p_query: 'x' }],
      ['respond_to_group_invitation', { p_membership_id: GHOST, p_accept: true }],
      ['leave_group_as_group', { p_group_id: GHOST, p_acting_group_id: GHOST }],
      ['get_acting_contexts', {}],
      ['get_group_memberships_of', { p_acting_group_id: GHOST }],
    ])('%s refuses the bare anon role', async (fn, args) => {
      const bare = createTestClient();
      const res = await bare.rpc(fn as string, args as Record<string, unknown>);
      expect(res.error).not.toBeNull();
    });
  });
});
