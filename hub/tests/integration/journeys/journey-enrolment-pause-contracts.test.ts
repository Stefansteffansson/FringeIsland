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

const GHOST = '00000000-0000-0000-0000-00000000dead';

/**
 * FEAT-PD002 STORY-8 (TASK-JRN-PAUSE-01) — pause / resume the caller's OWN
 * enrolment, and the ADR-U016 cascade check that a paused walk still freezes.
 *
 * Red-first at HEAD:
 *  - every contract cell fails PGRST202 (pause_journey_enrollment /
 *    resume_journey_enrollment absent) until migration 20260903100000 lands;
 *  - the two CASCADE cells are red for the RIGHT reason on today's substrate:
 *    a row set to 'paused' by admin SQL (bypassing the missing contract) STAYS
 *    'paused' through leave_group / delete_group, because the DS-3 lifecycle
 *    handlers freeze `status = 'active'` rows only. The migration widens them.
 *
 * Labelled honestly (green at HEAD by design, not TDD):
 *  - the direct-UPDATE refusal pins the EXISTING grant posture (PD002 STORY-7
 *    revoked DML; TASK-SEC-02 keeps it so) — "verified, not assumed".
 */
describe('FEAT-PD002 STORY-8 — pause / resume own enrolment (TASK-JRN-PAUSE-01)', () => {
  const admin = createAdminClient();
  let owner: TestUser; // creates ownerG, which owns the public journey
  let traveller: TestUser; // the solo walker — pause / resume subject
  let steward: TestUser; // creates G (private), owns jPriv; enrols G in jPub
  let member: TestUser; // active member of G — leaves (cascade #1)
  let steward2: TestUser; // creates G2 (private), owns jPriv2; deletes G2 (cascade #2)
  let member2: TestUser; // active member of G2
  let completedUser: TestUser; // admin-seeded 'completed' row
  let frozenUser: TestUser; // admin-seeded 'frozen' row
  let withdrawnUser: TestUser; // admin-seeded 'withdrawn' row

  let ownerG: string;
  let g: string;
  let g2: string;
  let jPub: string; // published + public, 3 steps — the pause/resume subject
  let jPriv: string; // published, NOT public, owned by G — cascade #1
  let jPriv2: string; // published, NOT public, owned by G2 — cascade #2
  let pubSteps: string[] = [];

  let travellerEnr: string;
  let groupEnr: string;

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

  const seedGroup = async (name: string, members: TestUser[], creator: TestUser): Promise<string> => {
    const c = await asUser(creator);
    const { data: groupId, error } = await c.rpc('create_engagement_group', { p_name: name });
    if (error) throw new Error(`seedGroup(${name}): ${error.message}`);
    createdGroupIds.push(groupId as string);
    await admin.from('groups').update({ is_public: false }).eq('id', groupId);
    for (const m of members) {
      const { error: mErr } = await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: m.personalGroupId,
        status: 'active',
        added_by_group_id: creator.personalGroupId,
      });
      if (mErr) throw new Error(`seedGroup membership: ${mErr.message}`);
    }
    return groupId as string;
  };

  const seedJourney = async (title: string, ownerGroupId: string, isPublic: boolean): Promise<string> => {
    const { data, error } = await admin
      .from('journeys')
      .insert({
        title,
        description: `${title} — JRN-PAUSE-01 test fixture`,
        created_by_group_id: ownerGroupId,
        is_published: true,
        is_public: isPublic,
        journey_type: 'predefined',
        difficulty_level: 'beginner',
        estimated_duration_minutes: 30,
        tags: ['jrn-pause-01-test'],
        content: null,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) throw new Error(`seedJourney(${title}): ${error.message}`);
    const journeyId = data!.id as string;
    createdJourneyIds.push(journeyId);
    const { error: stepErr } = await admin.from('journey_steps').insert(
      ['One', 'Two', 'Three'].map((t, i) => ({
        journey_id: journeyId,
        step_order: i + 1,
        title: `${title} ${t}`,
        step_kind_key: 'narrative',
        content_family_key: 'witness',
        required: true,
        repeatable: false,
        duration_minutes: 5,
        content: {},
      })),
    );
    if (stepErr) throw new Error(`seedJourney steps(${title}): ${stepErr.message}`);
    return journeyId;
  };

  const stepIds = async (journeyId: string): Promise<string[]> => {
    const { data, error } = await admin
      .from('journey_steps')
      .select('id')
      .eq('journey_id', journeyId)
      .order('step_order');
    if (error) throw new Error(`stepIds: ${error.message}`);
    return (data ?? []).map((r) => r.id as string);
  };

  const enrolSelf = async (u: TestUser, journeyId: string): Promise<string> => {
    const c = await asUser(u);
    const { data, error } = await c.rpc('enroll_self_in_journey', { p_journey_id: journeyId });
    if (error) throw new Error(`enroll_self_in_journey: ${error.message}`);
    return (data as { enrollment_id: string }).enrollment_id;
  };

  /** Admin-seeded enrolment in a given state (service role bypasses the narrowing by design). */
  const seedEnrollment = async (journeyId: string, groupId: string, status: string): Promise<string> => {
    const { data, error } = await admin
      .from('journey_enrollments')
      .insert({ journey_id: journeyId, group_id: groupId, enrolled_by_group_id: groupId, status })
      .select('id')
      .single();
    if (error) throw new Error(`seedEnrollment(${status}): ${error.message}`);
    return data!.id as string;
  };

  const rowOf = async (enrId: string): Promise<{ status: string; progress_data: Record<string, unknown> }> => {
    const { data, error } = await admin
      .from('journey_enrollments')
      .select('status, progress_data')
      .eq('id', enrId)
      .single();
    if (error) throw new Error(`rowOf: ${error.message}`);
    return data as { status: string; progress_data: Record<string, unknown> };
  };

  const instancesOf = async (enrId: string): Promise<Array<{ step_id: string; completed_at: string | null }>> => {
    const { data, error } = await admin
      .from('journey_step_instances')
      .select('step_id, completed_at')
      .eq('enrollment_id', enrId)
      .order('created_at');
    if (error) throw new Error(`instancesOf: ${error.message}`);
    return (data ?? []) as Array<{ step_id: string; completed_at: string | null }>;
  };

  beforeAll(async () => {
    owner = await createTestUser({ displayName: 'JRNP Owner' });
    traveller = await createTestUser({ displayName: 'JRNP Traveller' });
    steward = await createTestUser({ displayName: 'JRNP Steward' });
    member = await createTestUser({ displayName: 'JRNP Member' });
    steward2 = await createTestUser({ displayName: 'JRNP Steward Two' });
    member2 = await createTestUser({ displayName: 'JRNP Member Two' });
    completedUser = await createTestUser({ displayName: 'JRNP Completed' });
    frozenUser = await createTestUser({ displayName: 'JRNP Frozen' });
    withdrawnUser = await createTestUser({ displayName: 'JRNP Withdrawn' });
    createdUserIds.push(
      owner.user.id, traveller.user.id, steward.user.id, member.user.id, steward2.user.id,
      member2.user.id, completedUser.user.id, frozenUser.user.id, withdrawnUser.user.id,
    );

    ownerG = await seedGroup('JRNP Journey Owners', [], owner);
    g = await seedGroup('JRNP Party', [member], steward);
    g2 = await seedGroup('JRNP Party Two', [member2], steward2);

    jPub = await seedJourney('JRNP Public Walk', ownerG, true);
    jPriv = await seedJourney('JRNP Private Walk', g, false);
    jPriv2 = await seedJourney('JRNP Private Walk Two', g2, false);
    pubSteps = await stepIds(jPub);

    // The traveller walks: enter 1, complete 1, enter 2 — the resume pointer is step 2.
    travellerEnr = await enrolSelf(traveller, jPub);
    const ct = await asUser(traveller);
    for (const call of [
      ct.rpc('enter_journey_step', { p_enrollment_id: travellerEnr, p_step_id: pubSteps[0] }),
      ct.rpc('complete_journey_step', { p_enrollment_id: travellerEnr, p_step_id: pubSteps[0] }),
      ct.rpc('enter_journey_step', { p_enrollment_id: travellerEnr, p_step_id: pubSteps[1] }),
    ]) {
      const { error } = await call;
      if (error) throw new Error(`walk: ${error.message}`);
    }

    // A group walk on the public journey — the own-only refusal subject.
    const cs = await asUser(steward);
    const { data: ge, error: geErr } = await cs.rpc('enroll_group_in_journey', {
      p_group_id: g,
      p_journey_id: jPub,
    });
    if (geErr) throw new Error(`enroll_group_in_journey: ${geErr.message}`);
    groupEnr = (ge as { enrollment_id: string }).enrollment_id;
  }, 180000);

  afterAll(async () => {
    for (const jid of createdJourneyIds) {
      await admin.from('journey_enrollments').delete().eq('journey_id', jid);
      await admin.from('journey_steps').delete().eq('journey_id', jid);
      await admin.from('journeys').delete().eq('id', jid);
    }
    for (const id of createdGroupIds.reverse()) {
      await cleanupTestGroup(id);
    }
    for (const id of createdUserIds) {
      await cleanupTestUser(id);
    }
  }, 180000);

  describe('the contracts — red at HEAD (PGRST202)', () => {
    it('pauses an active own walk: the row is paused, the reply is shaped, progress is untouched', async () => {
      const before = await instancesOf(travellerEnr);
      expect(before.length).toBe(2);
      const c = await asUser(traveller);
      const { data, error } = await c.rpc('pause_journey_enrollment', { p_enrollment_id: travellerEnr });
      expect(error).toBeNull();
      expect(data).toEqual({ enrollment_id: travellerEnr, journey_id: jPub, status: 'paused' });
      expect((await rowOf(travellerEnr)).status).toBe('paused');
      expect(await instancesOf(travellerEnr)).toEqual(before);
    }, 60000);

    it('holds the pause: the step contracts refuse P0001 on a paused walk', async () => {
      const c = await asUser(traveller);
      const { error: enterErr } = await c.rpc('enter_journey_step', {
        p_enrollment_id: travellerEnr,
        p_step_id: pubSteps[2],
      });
      expect(enterErr?.code).toBe('P0001');
      const { error: completeErr } = await c.rpc('complete_journey_step', {
        p_enrollment_id: travellerEnr,
        p_step_id: pubSteps[1],
      });
      expect(completeErr?.code).toBe('P0001');
    });

    it('every read carries paused as-is: get_my_enrollments, get_journey_detail, get_player_state', async () => {
      const c = await asUser(traveller);
      const { data: mine, error: mineErr } = await c.rpc('get_my_enrollments');
      expect(mineErr).toBeNull();
      const entry = (mine as Array<{ enrollment_id: string; status: string }>).find(
        (e) => e.enrollment_id === travellerEnr,
      );
      expect(entry?.status).toBe('paused');

      const { data: detail, error: detailErr } = await c.rpc('get_journey_detail', { p_journey_id: jPub });
      expect(detailErr).toBeNull();
      expect((detail as { individual_enrollment: { enrollment_id: string; status: string } }).individual_enrollment)
        .toEqual({ enrollment_id: travellerEnr, status: 'paused' });

      const { data: player, error: playerErr } = await c.rpc('get_player_state', { p_enrollment_id: travellerEnr });
      expect(playerErr).toBeNull();
      const ps = player as { status: string; resume_step_id: string };
      expect(ps.status).toBe('paused');
      expect(ps.resume_step_id).toBe(pubSteps[1]);
    });

    it('pausing a paused walk refuses P0001 "already paused"', async () => {
      const c = await asUser(traveller);
      const { error } = await c.rpc('pause_journey_enrollment', { p_enrollment_id: travellerEnr });
      expect(error?.code).toBe('P0001');
      expect(error?.message).toContain('already paused');
    });

    it('resumes at exactly the position held: active again, resume pointer + instances unchanged', async () => {
      const before = await instancesOf(travellerEnr);
      const c = await asUser(traveller);
      const { data, error } = await c.rpc('resume_journey_enrollment', { p_enrollment_id: travellerEnr });
      expect(error).toBeNull();
      expect(data).toEqual({ enrollment_id: travellerEnr, journey_id: jPub, status: 'active' });
      expect((await rowOf(travellerEnr)).status).toBe('active');
      expect(await instancesOf(travellerEnr)).toEqual(before);
      const { data: player } = await c.rpc('get_player_state', { p_enrollment_id: travellerEnr });
      expect((player as { status: string; resume_step_id: string }).resume_step_id).toBe(pubSteps[1]);
      // The walk continues where it stopped: step 2 completes now.
      const { error: completeErr } = await c.rpc('complete_journey_step', {
        p_enrollment_id: travellerEnr,
        p_step_id: pubSteps[1],
      });
      expect(completeErr).toBeNull();
    }, 60000);

    it('resuming an active walk refuses P0001 "not paused"', async () => {
      const c = await asUser(traveller);
      const { error } = await c.rpc('resume_journey_enrollment', { p_enrollment_id: travellerEnr });
      expect(error?.code).toBe('P0001');
      expect(error?.message).toContain('not paused');
    });

    it('completed / frozen / withdrawn refuse both contracts, naming the state', async () => {
      const cases: Array<[TestUser, string]> = [
        [completedUser, 'completed'],
        [frozenUser, 'frozen'],
        [withdrawnUser, 'withdrawn'],
      ];
      for (const [u, state] of cases) {
        const enr = await seedEnrollment(jPub, u.personalGroupId, state);
        const c = await asUser(u);
        const { error: pErr } = await c.rpc('pause_journey_enrollment', { p_enrollment_id: enr });
        expect(pErr?.code).toBe('P0001');
        expect(pErr?.message).toContain(state);
        const { error: rErr } = await c.rpc('resume_journey_enrollment', { p_enrollment_id: enr });
        expect(rErr?.code).toBe('P0001');
        expect(rErr?.message).toContain(state);
        expect((await rowOf(enr)).status).toBe(state);
      }
    }, 90000);

    it("own walks only: a via-group row the caller can see refuses 42501 — for the member and for the key-holding Steward", async () => {
      for (const u of [member, steward]) {
        const c = await asUser(u);
        const { error: pErr } = await c.rpc('pause_journey_enrollment', { p_enrollment_id: groupEnr });
        expect(pErr?.code).toBe('42501');
        const { error: rErr } = await c.rpc('resume_journey_enrollment', { p_enrollment_id: groupEnr });
        expect(rErr?.code).toBe('42501');
      }
      expect((await rowOf(groupEnr)).status).toBe('active');
    });

    it("invisible or absent -> P0002: another FIM, a ghost id, and a Mist on the traveller's row", async () => {
      const co = await asUser(owner);
      expect((await co.rpc('pause_journey_enrollment', { p_enrollment_id: travellerEnr })).error?.code).toBe('P0002');
      expect((await co.rpc('pause_journey_enrollment', { p_enrollment_id: GHOST })).error?.code).toBe('P0002');
      const cm = await asMist();
      expect((await cm.rpc('pause_journey_enrollment', { p_enrollment_id: travellerEnr })).error?.code).toBe('P0002');
      expect((await cm.rpc('resume_journey_enrollment', { p_enrollment_id: travellerEnr })).error?.code).toBe('P0002');
    });

    it('PIN (green at HEAD by design — the grant, not this task): a direct UPDATE of status refuses 42501', async () => {
      const c = await asUser(traveller);
      const { error } = await c.from('journey_enrollments').update({ status: 'paused' }).eq('id', travellerEnr);
      expect(error?.code).toBe('42501');
      expect((await rowOf(travellerEnr)).status).toBe('active');
    });
  });

  describe('the ADR-U016 cascade reaches a paused walk — red at HEAD for the right reason', () => {
    it('a member leaves the group: their paused walk in its non-public journey freezes (left_group)', async () => {
      const enr = await enrolSelf(member, jPriv);
      // Bypass the (absent) contract: the row is paused by admin SQL so the cell
      // proves the CASCADE, independent of the contract's existence.
      await runAdminSql(`UPDATE public.journey_enrollments SET status = 'paused' WHERE id = '${enr}';`);
      expect((await rowOf(enr)).status).toBe('paused');

      const c = await asUser(member);
      const { error } = await c.rpc('leave_group', { p_group_id: g });
      expect(error).toBeNull();

      const row = await rowOf(enr);
      expect(row.status).toBe('frozen');
      expect(row.progress_data.frozen_reason).toBe('left_group');
    }, 60000);

    it('the group is deleted: a paused walk in its non-public journey freezes (group_archived)', async () => {
      const enr = await enrolSelf(member2, jPriv2);
      await runAdminSql(`UPDATE public.journey_enrollments SET status = 'paused' WHERE id = '${enr}';`);
      expect((await rowOf(enr)).status).toBe('paused');

      const c = await asUser(steward2);
      const { error } = await c.rpc('delete_group', { p_group_id: g2 });
      expect(error).toBeNull();

      const row = await rowOf(enr);
      expect(row.status).toBe('frozen');
      expect(row.progress_data.frozen_reason).toBe('group_archived');
    }, 60000);
  });
});
