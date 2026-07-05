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

/** Promote a personal group to platform admin (the invitation-contracts
 *  suite's pattern, reused): active DeusEx member + DeusEx role. */
async function makePlatformAdmin(personalGroupId: string) {
  await runAdminSql(`
    DO $$
    DECLARE v_deusex uuid; v_role uuid;
    BEGIN
      SELECT id INTO v_deusex FROM public.groups
        WHERE name = 'DeusEx' AND group_type = 'system';
      SELECT id INTO v_role FROM public.group_roles
        WHERE group_id = v_deusex AND name = 'DeusEx';
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
        VALUES (v_deusex, '${personalGroupId}', v_deusex, 'active')
        ON CONFLICT (group_id, member_group_id) DO UPDATE SET status = 'active';
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
        VALUES ('${personalGroupId}', v_deusex, v_role, v_deusex)
        ON CONFLICT DO NOTHING;
    END $$;`);
}

async function demotePlatformAdmin(personalGroupId: string) {
  await runAdminSql(`
    DO $$
    DECLARE v_deusex uuid;
    BEGIN
      SELECT id INTO v_deusex FROM public.groups
        WHERE name = 'DeusEx' AND group_type = 'system';
      DELETE FROM public.user_group_roles
        WHERE member_group_id = '${personalGroupId}' AND group_id = v_deusex;
      DELETE FROM public.group_memberships
        WHERE member_group_id = '${personalGroupId}' AND group_id = v_deusex;
    END $$;`).catch(() => undefined);
}

/**
 * FEAT-PC014 (Groups Cycle G-E) — closure and deletion contracts
 * (MEM-7's DeusEx handover + MEM-8 + GRP-9).
 *
 * Red-first:
 *  - hand_stewardship_to_deusex / close_group / delete_group fail PGRST202
 *    (absent) until the migration lands — the two G-D honest refusals
 *    (leave_group's sole-Steward and last-member P0001s) are what these
 *    contracts fill; those refusals are re-asserted STANDING (carried-forward
 *    green — G-D behaviour this migration must not disturb).
 *  - STORY-6's direct-path asserts are red-first: the raw groups_delete
 *    policy permits a client-role hard DELETE today (journey-less groups
 *    delete; journey-owning groups error on the journeys RESTRICT FK) — both
 *    cells flip to RLS-refused (0 rows, row survives) after the policy drop.
 *
 * Labelled honestly (carried-forward, green by design):
 *  - The status-column UPDATE refusal (PC010's column-grant narrowing) and
 *    the TRUNCATE revoke (PC012) are re-asserts of existing substrate.
 *  - The admin membership-DELETE policy assert (A-ADM inheritance) is
 *    existing substrate (PC013 asserted it; re-pinned here after the
 *    groups_delete drop).
 */
describe('FEAT-PC014 — group closure and deletion contracts (G-E, MEM-8/GRP-9)', () => {
  const admin = createAdminClient();
  let steward: TestUser; // group creator — Steward template holds delete_group
  let memberA: TestUser; // plain active member
  let memberB: TestUser; // plain member (paused in some scenarios)
  let participant: TestUser; // last-member closure subject (no delete_group)
  let outsider: TestUser; // FIM, never a member
  let suspended: TestUser; // member, then is_active=false

  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];
  const createdJourneyIds: string[] = [];

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

  const seedGroup = async (name: string, members: TestUser[]): Promise<string> => {
    const c = await asUser(steward);
    const { data: groupId, error } = await c.rpc('create_engagement_group', { p_name: name });
    if (error) throw new Error(`seedGroup(${name}): ${error.message}`);
    createdGroupIds.push(groupId as string);
    await admin.from('groups').update({ is_public: false }).eq('id', groupId);
    for (const member of members) {
      const { error: mErr } = await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: member.personalGroupId,
        status: 'active',
        added_by_group_id: steward.personalGroupId,
      });
      if (mErr) throw new Error(`seedGroup membership: ${mErr.message}`);
    }
    return groupId as string;
  };

  const grantSteward = async (groupId: string, u: TestUser) => {
    await runAdminSql(`
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${u.personalGroupId}', gr.group_id, gr.id, '${steward.personalGroupId}'
        FROM public.group_roles gr
       WHERE gr.group_id = '${groupId}'
         AND (gr.created_from_role_template_id =
                (SELECT id FROM public.role_templates WHERE name = 'Steward Role Template')
              OR gr.name = 'Steward')
       LIMIT 1
      ON CONFLICT DO NOTHING;`);
  };

  /** Delete a member's roles + membership out-of-band (admin substrate
   *  manipulation). Rides the established transaction-local cascade flag so
   *  the last-leader wall stands down — the same mechanism the admin
   *  hard-delete and PC002 erasure cascades use. */
  const adminDepart = async (groupId: string, u: TestUser) => {
    await runAdminSql(`
      DO $$ BEGIN
        PERFORM set_config('app.hard_delete_in_progress', 'true', true);
        DELETE FROM public.user_group_roles
         WHERE group_id = '${groupId}' AND member_group_id = '${u.personalGroupId}';
        DELETE FROM public.group_memberships
         WHERE group_id = '${groupId}' AND member_group_id = '${u.personalGroupId}';
      END $$;`);
  };

  const groupRow = async (groupId: string) => {
    const rows = await runAdminSql(
      `SELECT id, status FROM public.groups WHERE id = '${groupId}';`,
    );
    return rows[0] ?? null;
  };

  const membershipRows = async (groupId: string) => {
    const rows = await runAdminSql(
      `SELECT member_group_id, status FROM public.group_memberships WHERE group_id = '${groupId}';`,
    );
    return rows as Array<{ member_group_id: string; status: string }>;
  };

  const roleBindingCount = async (groupId: string): Promise<number> => {
    const rows = await runAdminSql(
      `SELECT count(*)::int AS n FROM public.user_group_roles WHERE group_id = '${groupId}';`,
    );
    return rows[0].n as number;
  };

  const notificationsOf = async (groupId: string, type: string) => {
    const { data } = await admin
      .from('notifications')
      .select('recipient_group_id, type, payload')
      .eq('group_id', groupId)
      .eq('type', type);
    return data ?? [];
  };

  /** Non-public journey owned by the group + one personal enrolment + one
   *  group-level enrolment (the two sprint2 freeze shapes). */
  const seedJourneyFixture = async (groupId: string, personalEnrollee: TestUser) => {
    const { data: j, error: jErr } = await admin
      .from('journeys')
      .insert({ title: 'ClosureFixture', created_by_group_id: groupId, is_public: false })
      .select('id')
      .single();
    if (jErr) throw new Error(`journey fixture: ${jErr.message}`);
    createdJourneyIds.push(j.id as string);
    const { data: e1 } = await admin
      .from('journey_enrollments')
      .insert({ journey_id: j.id, group_id: personalEnrollee.personalGroupId, status: 'active' })
      .select('id')
      .single();
    const { data: e2 } = await admin
      .from('journey_enrollments')
      .insert({ journey_id: j.id, group_id: groupId, status: 'active' })
      .select('id')
      .single();
    return {
      journeyId: j.id as string,
      personalEnrollmentId: e1!.id as string,
      groupEnrollmentId: e2!.id as string,
    };
  };

  const seedPublicJourney = async (groupId: string): Promise<string> => {
    const { data: j, error } = await admin
      .from('journeys')
      .insert({ title: 'PublicFixture', created_by_group_id: groupId, is_public: true })
      .select('id')
      .single();
    if (error) throw new Error(`public journey fixture: ${error.message}`);
    createdJourneyIds.push(j.id as string);
    return j.id as string;
  };

  const enrollmentState = async (id: string) => {
    const { data } = await admin
      .from('journey_enrollments')
      .select('status, progress_data')
      .eq('id', id)
      .single();
    return data;
  };

  const journeyOwner = async (id: string): Promise<string> => {
    const { data } = await admin
      .from('journeys')
      .select('created_by_group_id')
      .eq('id', id)
      .single();
    return data!.created_by_group_id as string;
  };

  const deusExGroupId = async (): Promise<string> => {
    const rows = await runAdminSql(
      `SELECT id FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';`,
    );
    return rows[0].id as string;
  };

  beforeAll(async () => {
    steward = await createTestUser({ displayName: 'Closer' });
    memberA = await createTestUser({ displayName: 'MemberA' });
    memberB = await createTestUser({ displayName: 'MemberB' });
    participant = await createTestUser({ displayName: 'LastOne' });
    outsider = await createTestUser({ displayName: 'Stranger' });
    suspended = await createTestUser({ displayName: 'Halted' });
    for (const u of [steward, memberA, memberB, participant, outsider, suspended]) {
      createdUserIds.push(u.user.id);
    }
    await admin.from('users').update({ is_active: false }).eq('auth_user_id', suspended.user.id);
  }, 120_000);

  afterAll(async () => {
    for (const id of createdJourneyIds) {
      await admin.from('journey_enrollments').delete().eq('journey_id', id);
      await admin.from('journeys').delete().eq('id', id);
    }
    for (const id of createdGroupIds) {
      await cleanupTestGroup(id);
    }
    for (const id of createdUserIds) {
      await cleanupTestUser(id);
    }
  }, 120_000);

  // ==========================================================================
  // Carried-forward: the two G-D refusals this feature's contracts point at
  // ==========================================================================
  describe('the G-D honest refusals still stand (carried-forward green)', () => {
    it("leave_group still refuses the sole active Steward (P0001) and the last member (P0001) — the seams H017's transfer/close flows fill", async () => {
      const groupId = await seedGroup('RefusalsStand', [memberA]);
      const c = await asUser(steward);
      const soleSteward = await c.rpc('leave_group', { p_group_id: groupId });
      expect(soleSteward.error?.code).toBe('P0001');

      const soloId = await seedGroup('RefusalsSolo', []);
      const lastMember = await c.rpc('leave_group', { p_group_id: soloId });
      expect(lastMember.error?.code).toBe('P0001');
      // Post-PC014 copy (migration 20260705115243): Close exists now — the
      // refusal points at it, never at an unavailability that is no longer true.
      expect(lastMember.error?.message).toContain('close the group');
      expect(lastMember.error?.message).not.toContain('not yet available');
    });
  });

  // ==========================================================================
  // STORY-3 — hand_stewardship_to_deusex (NEW — PGRST202 red)
  // ==========================================================================
  describe('STORY-3: hand stewardship to DeusEx directly (ADR-U019)', () => {
    it('the sole active Steward hands over and departs — DeusEx member+Steward, invitations transfer, enrolment freeze, both notices', async () => {
      const groupId = await seedGroup('HandoverHappy', [memberA]);
      const deusEx = await deusExGroupId();
      const { personalEnrollmentId } = await seedJourneyFixture(groupId, steward);
      await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: outsider.personalGroupId,
        status: 'invited',
        added_by_group_id: steward.personalGroupId,
      });
      await admin.from('pending_email_invitations').insert({
        group_id: groupId,
        invited_email: 'handover-fixture@example.com',
        invited_by_group_id: steward.personalGroupId,
        status: 'pending',
      });

      const c = await asUser(steward);
      const { error } = await c.rpc('hand_stewardship_to_deusex', { p_group_id: groupId });
      expect(error).toBeNull();

      // DeusEx is an active member + Steward
      const members = await membershipRows(groupId);
      expect(members.find((m) => m.member_group_id === deusEx)?.status).toBe('active');
      const deusExRoles = await runAdminSql(`
        SELECT gr.name FROM public.user_group_roles ugr
          JOIN public.group_roles gr ON gr.id = ugr.group_role_id
         WHERE ugr.group_id = '${groupId}' AND ugr.member_group_id = '${deusEx}';`);
      expect(
        deusExRoles.some((r) => r.name === 'Steward Role Template' || r.name === 'Steward'),
      ).toBe(true);
      // the caller departed; the invitations transferred
      expect(members.find((m) => m.member_group_id === steward.personalGroupId)).toBeUndefined();
      expect(
        members.find((m) => m.member_group_id === outsider.personalGroupId)?.status,
      ).toBe('invited');
      const { data: emailInv } = await admin
        .from('pending_email_invitations')
        .select('invited_by_group_id')
        .eq('group_id', groupId)
        .eq('invited_email', 'handover-fixture@example.com')
        .single();
      expect(emailInv?.invited_by_group_id).toBe(deusEx);
      // caller's non-public enrolment froze as a leave
      const enr = await enrollmentState(personalEnrollmentId);
      expect(enr?.status).toBe('frozen');
      expect((enr?.progress_data as Record<string, unknown>).frozen_reason).toBe('left_group');
      // members + DeusEx notified; the group survives active
      const transferred = await notificationsOf(groupId, 'stewardship_transferred');
      expect(
        transferred.some((n) => n.recipient_group_id === memberA.personalGroupId),
      ).toBe(true);
      const required = await notificationsOf(groupId, 'stewardship_required');
      expect(required.some((n) => n.recipient_group_id === deusEx)).toBe(true);
      expect((await groupRow(groupId))?.status).toBe('active');
    });

    it('not the sole active Steward — P0001', async () => {
      const groupId = await seedGroup('HandoverCoSteward', [memberA]);
      await grantSteward(groupId, memberA);
      const c = await asUser(steward);
      const res = await c.rpc('hand_stewardship_to_deusex', { p_group_id: groupId });
      expect(res.error?.code).toBe('P0001');
    });

    it('a non-Steward member — P0001', async () => {
      const groupId = await seedGroup('HandoverNotSteward', [memberA]);
      const c = await asUser(memberA);
      const res = await c.rpc('hand_stewardship_to_deusex', { p_group_id: groupId });
      expect(res.error?.code).toBe('P0001');
    });

    it('the last remaining member is pointed at closure instead — P0001', async () => {
      const groupId = await seedGroup('HandoverSolo', []);
      const c = await asUser(steward);
      const res = await c.rpc('hand_stewardship_to_deusex', { p_group_id: groupId });
      expect(res.error?.code).toBe('P0001');
    });

    it('house map: outsider/ghost P0002; Mist/suspended 42501; non-active group P0001', async () => {
      const groupId = await seedGroup('HandoverGates', [memberA, suspended]);
      const cOut = await asUser(outsider);
      expect(
        (await cOut.rpc('hand_stewardship_to_deusex', { p_group_id: groupId })).error?.code,
      ).toBe('P0002');
      expect(
        (await cOut.rpc('hand_stewardship_to_deusex', { p_group_id: GHOST })).error?.code,
      ).toBe('P0002');
      const mist = await asMist();
      expect(
        (await mist.rpc('hand_stewardship_to_deusex', { p_group_id: groupId })).error?.code,
      ).toBe('42501');
      await mist.auth.signOut();
      const cSusp = await asUser(suspended);
      expect(
        (await cSusp.rpc('hand_stewardship_to_deusex', { p_group_id: groupId })).error?.code,
      ).toBe('42501');
      await runAdminSql(
        `UPDATE public.groups SET status = 'suspended' WHERE id = '${groupId}';`,
      );
      const cSteward = await asUser(steward);
      expect(
        (await cSteward.rpc('hand_stewardship_to_deusex', { p_group_id: groupId })).error?.code,
      ).toBe('P0001');
    });
  });

  // ==========================================================================
  // STORY-4 — close_group (NEW — PGRST202 red)
  // ==========================================================================
  describe('STORY-4: close a group as its last member (MEM-8)', () => {
    it('the last active member closes — status closed, group-owned non-public enrolments freeze, journeys reassign to DeusEx (public journeys stay), DeusEx notified, caller departs, the tombstone survives', async () => {
      const groupId = await seedGroup('CloseHappy', []);
      const deusEx = await deusExGroupId();
      const { journeyId, personalEnrollmentId, groupEnrollmentId } = await seedJourneyFixture(
        groupId,
        steward,
      );
      const publicJourneyId = await seedPublicJourney(groupId);

      const c = await asUser(steward);
      const { data, error } = await c.rpc('close_group', { p_group_id: groupId });
      expect(error).toBeNull();
      expect((data as Record<string, unknown>).journeys_transferred).toBe(1);

      expect((await groupRow(groupId))?.status).toBe('closed');
      for (const id of [personalEnrollmentId, groupEnrollmentId]) {
        const enr = await enrollmentState(id);
        expect(enr?.status).toBe('frozen');
        expect((enr?.progress_data as Record<string, unknown>).frozen_reason).toBe(
          'group_closed',
        );
      }
      expect(await journeyOwner(journeyId)).toBe(deusEx);
      expect(await journeyOwner(publicJourneyId)).toBe(groupId);
      const closedNotices = await notificationsOf(groupId, 'group_closed');
      expect(closedNotices.some((n) => n.recipient_group_id === deusEx)).toBe(true);
      expect(await membershipRows(groupId)).toEqual([]);
      expect(await roleBindingCount(groupId)).toBe(0);
    });

    it('a last active member WITHOUT delete_group can close — being last is the authority (Open Q3 default)', async () => {
      const groupId = await seedGroup('CloseParticipant', [participant]);
      await adminDepart(groupId, steward); // steward leaves out-of-band
      const c = await asUser(participant);
      const { error } = await c.rpc('close_group', { p_group_id: groupId });
      expect(error).toBeNull();
      expect((await groupRow(groupId))?.status).toBe('closed');
    });

    it('not the last active member — P0001 (leave or transfer instead)', async () => {
      const groupId = await seedGroup('CloseNotLast', [memberA]);
      const c = await asUser(steward);
      const res = await c.rpc('close_group', { p_group_id: groupId });
      expect(res.error?.code).toBe('P0001');
    });

    it("a PAUSED co-member does not block closure (last ACTIVE member) — the paused row survives on the tombstone, pinned as this cycle's disposition", async () => {
      const groupId = await seedGroup('ClosePausedSurvivor', [memberB]);
      await admin
        .from('group_memberships')
        .update({ status: 'paused' })
        .eq('group_id', groupId)
        .eq('member_group_id', memberB.personalGroupId);
      const c = await asUser(steward);
      const { error } = await c.rpc('close_group', { p_group_id: groupId });
      expect(error).toBeNull();
      expect((await groupRow(groupId))?.status).toBe('closed');
      const survivors = await membershipRows(groupId);
      expect(survivors).toEqual([
        { member_group_id: memberB.personalGroupId, status: 'paused' },
      ]);
    });

    it('house map: outsider/ghost P0002; Mist/suspended 42501; non-active group P0001', async () => {
      const groupId = await seedGroup('CloseGates', [suspended]);
      const cOut = await asUser(outsider);
      expect((await cOut.rpc('close_group', { p_group_id: groupId })).error?.code).toBe('P0002');
      expect((await cOut.rpc('close_group', { p_group_id: GHOST })).error?.code).toBe('P0002');
      const mist = await asMist();
      expect((await mist.rpc('close_group', { p_group_id: groupId })).error?.code).toBe('42501');
      await mist.auth.signOut();
      const cSusp = await asUser(suspended);
      expect((await cSusp.rpc('close_group', { p_group_id: groupId })).error?.code).toBe('42501');
      await runAdminSql(
        `UPDATE public.groups SET status = 'suspended' WHERE id = '${groupId}';`,
      );
      const cSteward = await asUser(steward);
      expect(
        (await cSteward.rpc('close_group', { p_group_id: groupId })).error?.code,
      ).toBe('P0001');
    });
  });

  // ==========================================================================
  // STORY-5 — delete_group (NEW — PGRST202 red)
  // ==========================================================================
  describe('STORY-5: delete a group deliberately (GRP-9, soft-terminal)', () => {
    it("a delete_group holder archives the group with members remaining — status archived, freezes, journeys to DeusEx, in-contract group_deleted notices, every membership departs, the tombstone survives — and the cascade writes NO member_removed / role_removed noise", async () => {
      const groupId = await seedGroup('DeleteHappy', [memberA, memberB]);
      const deusEx = await deusExGroupId();
      await admin
        .from('group_memberships')
        .update({ status: 'paused' })
        .eq('group_id', groupId)
        .eq('member_group_id', memberB.personalGroupId);
      await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: outsider.personalGroupId,
        status: 'invited',
        added_by_group_id: steward.personalGroupId,
      });
      const { journeyId, personalEnrollmentId, groupEnrollmentId } = await seedJourneyFixture(
        groupId,
        memberA,
      );

      const c = await asUser(steward);
      const { error } = await c.rpc('delete_group', { p_group_id: groupId });
      expect(error).toBeNull();

      expect((await groupRow(groupId))?.status).toBe('archived');
      for (const id of [personalEnrollmentId, groupEnrollmentId]) {
        const enr = await enrollmentState(id);
        expect(enr?.status).toBe('frozen');
        expect((enr?.progress_data as Record<string, unknown>).frozen_reason).toBe(
          'group_archived',
        );
      }
      expect(await journeyOwner(journeyId)).toBe(deusEx);
      // every membership row departed (active, paused, invited — the caller last)
      expect(await membershipRows(groupId)).toEqual([]);
      expect(await roleBindingCount(groupId)).toBe(0);
      // the in-contract notice reached the OTHER active member, not the caller
      const deleted = await notificationsOf(groupId, 'group_deleted');
      expect(deleted.some((n) => n.recipient_group_id === memberA.personalGroupId)).toBe(true);
      expect(
        deleted.some((n) => n.recipient_group_id === steward.personalGroupId),
      ).toBe(false);
      // the cascade was silent at the per-row trigger layer
      expect(await notificationsOf(groupId, 'member_removed')).toEqual([]);
      expect(await notificationsOf(groupId, 'role_removed')).toEqual([]);
    });

    it('a member without delete_group — 42501', async () => {
      const groupId = await seedGroup('DeleteNoKey', [memberA]);
      const c = await asUser(memberA);
      const res = await c.rpc('delete_group', { p_group_id: groupId });
      expect(res.error?.code).toBe('42501');
    });

    it('house map: outsider/ghost P0002; Mist/suspended 42501; non-active group P0001', async () => {
      const groupId = await seedGroup('DeleteGates', [suspended]);
      const cOut = await asUser(outsider);
      expect((await cOut.rpc('delete_group', { p_group_id: groupId })).error?.code).toBe('P0002');
      expect((await cOut.rpc('delete_group', { p_group_id: GHOST })).error?.code).toBe('P0002');
      const mist = await asMist();
      expect((await mist.rpc('delete_group', { p_group_id: groupId })).error?.code).toBe('42501');
      await mist.auth.signOut();
      const cSusp = await asUser(suspended);
      expect((await cSusp.rpc('delete_group', { p_group_id: groupId })).error?.code).toBe('42501');
      await runAdminSql(
        `UPDATE public.groups SET status = 'suspended' WHERE id = '${groupId}';`,
      );
      const cSteward = await asUser(steward);
      expect(
        (await cSteward.rpc('delete_group', { p_group_id: groupId })).error?.code,
      ).toBe('P0001');
    });
  });

  // ==========================================================================
  // STORY-6 (deletion side) — no path around the contracts (ADR-U038)
  // ==========================================================================
  describe('STORY-6: the raw deletion path is closed', () => {
    it('a direct client-role DELETE on a journey-less group is refused by RLS — 0 rows, the row survives (RED pre-migration: the groups_delete policy deletes it)', async () => {
      const groupId = await seedGroup('RawDeleteJourneyless', [memberA]);
      const c = await asUser(steward);
      const { data, error } = await c.from('groups').delete().eq('id', groupId).select('id');
      expect(error).toBeNull();
      expect(data).toEqual([]);
      expect(await groupRow(groupId)).not.toBeNull();
    });

    it('a direct client-role DELETE on a journey-OWNING group is refused by RLS before the FK wall — 0 rows, no error (RED pre-migration: the RESTRICT FK errors instead)', async () => {
      const groupId = await seedGroup('RawDeleteJourneyOwner', [memberA]);
      await seedJourneyFixture(groupId, memberA);
      const c = await asUser(steward);
      const { data, error } = await c.from('groups').delete().eq('id', groupId).select('id');
      expect(error).toBeNull();
      expect(data).toEqual([]);
      expect(await groupRow(groupId)).not.toBeNull();
    });

    it('a direct UPDATE cannot set a terminal status — the PC010 column-grant narrowing excludes status (carried-forward re-assert)', async () => {
      const groupId = await seedGroup('RawStatusUpdate', [memberA]);
      const c = await asUser(steward);
      const res = await c.from('groups').update({ status: 'archived' }).eq('id', groupId);
      expect(res.error?.code).toBe('42501');
      expect((await groupRow(groupId))?.status).toBe('active');
    });

    it('TRUNCATE stays revoked from client roles on groups / group_memberships / user_group_roles (carried-forward re-assert via privilege audit)', async () => {
      const rows = await runAdminSql(`
        SELECT count(*)::int AS n FROM information_schema.table_privileges
         WHERE table_schema = 'public'
           AND table_name IN ('groups', 'group_memberships', 'user_group_roles')
           AND privilege_type = 'TRUNCATE'
           AND grantee IN ('anon', 'authenticated');`);
      expect(rows[0].n).toBe(0);
    });

    it('the admin membership-DELETE policy still functions after the drop (A-ADM inherits intact — carried-forward re-assert)', async () => {
      const groupId = await seedGroup('AdminIntact', [memberA]);
      await makePlatformAdmin(outsider.personalGroupId);
      try {
        const c = await asUser(outsider);
        const { data, error } = await c
          .from('group_memberships')
          .delete()
          .eq('group_id', groupId)
          .eq('member_group_id', memberA.personalGroupId)
          .select('id');
        expect(error).toBeNull();
        expect(data?.length).toBe(1);
      } finally {
        await demotePlatformAdmin(outsider.personalGroupId);
      }
    });
  });
});
