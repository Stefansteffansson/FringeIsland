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
 * FEAT-PD007 (Journeys Cycle J-F) — step-response capture & review-substance
 * contracts (ADR-U046). Three touches over the existing substrate:
 *   - the response payload on the lived record (journey_step_instances.response
 *     / response_updated_at) + the capture set as registry data
 *     (step_kinds.captures_response);
 *   - the dedicated write verb save_step_response (optional-always, orthogonal
 *     to completion, frozen/withdrawn refused, explicit-empty clears);
 *   - the four byte-additive get_player_state keys, the private-only wall
 *     pinned, and get_own_step_instances_export() (the FEAT-H010 flag).
 *
 * RED-FIRST classification. This suite is authored BEFORE the PD007 migrations
 * exist (substrate is at FEAT-PD006, migration 20260710171000). Every `it`
 * carries a class:
 *   // RED: missing column    — response / response_updated_at / captures_response
 *                               do not exist yet (42703 on select).
 *   // RED: missing function  — save_step_response / get_own_step_instances_export
 *                               do not exist yet (PGRST202 / not-in-schema-cache).
 *   // RED: missing key       — an additive get_player_state key the migration adds.
 *   // PIN: unchanged behaviour — a PD003..PD006 invariant that must survive
 *                               additively (contract-only table, guard family,
 *                               no response key in the group-progress payload).
 *   // PROOF: existing machinery — carry-over (finalise_transcendence) and
 *                               ephemerality (explicit_erase_mist) ride existing
 *                               cascades over the NEW columns; labelled proofs,
 *                               not red-first TDD (the J-C rule: house erasure
 *                               functions, never bare-delete simulations).
 *
 * Tested against the decomposition defaults JF-1..JF-6 (ratified at the schema
 * gate) plus the build-time defaults surfaced on the gate board:
 *   - body ceiling 100000 chars (the PD001 journal precedent) -> 22001;
 *   - malformed payloads (no object / no body key / non-string body) -> 22023,
 *     and NEVER clear existing words (the rabbit-hole pin);
 *   - explicit empty = SQL NULL / JSON null / null body / empty-or-whitespace
 *     body -> clears response to NULL (retraction; the passage stays);
 *   - no captures_response gate on the verb (the registry flag places surface
 *     affordances; a traveller's words are storable on any step of their walk).
 *
 * Fixtures follow the sibling suites: own users/groups/journeys per scenario
 * (never the live seed set — the J-B retro trap) EXCEPT the designated
 * onboarding journey, which is itself the subject of the STORY-3 takeaway pins
 * and the Mist-path proofs. Mist sessions are left to the ADR-U033 reaper
 * (house practice — no manual anon teardown at integration tier).
 */
describe('FEAT-PD007 — step-response capture & review-substance contracts (J-F)', () => {
  const admin = createAdminClient();

  let owner: TestUser; // owns jMain + jLife (fixture journeys)
  let traveller: TestUser; // solo walker (STORY-2/3/5/6 subject)
  let steward: TestUser; // party-group creator (holds the group-progress reads)
  let memberA: TestUser; // via-group traveller; shares progress; writes responses
  let memberB: TestUser; // sibling traveller (own-instances-only + export isolation)
  let outsider: TestUser; // no standing anywhere (P0002 subject)
  let suspended: TestUser; // is_active=false -> actorless session (42501 subject)

  let partyGroup: string;
  let jMain: string; // public fixture journey (3 steps)
  let jLife: string; // lifecycle fixture journey (frozen/withdrawn/paused/completed)
  let jMainSteps: StepRow[] = [];
  let jLifeSteps: StepRow[] = [];
  let soloEnr: string; // traveller's own active walk on jMain
  let partyEnr: string; // partyGroup's walk on jMain (admin-seeded)

  type StepRow = { id: string; step_order: number; title: string };

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

  /** The Mist's substrate identity (users row keyed by auth uid). */
  const mistIdentity = async (c: SupabaseClient) => {
    const {
      data: { user },
    } = await c.auth.getUser();
    expect(user).not.toBeNull();
    const { data, error } = await admin
      .from('users')
      .select('id, personal_group_id, is_temporary')
      .eq('auth_user_id', user!.id)
      .single();
    expect(error).toBeNull();
    return data as { id: string; personal_group_id: string; is_temporary: boolean };
  };

  /** THE designated onboarding journey (live seed — the STORY-3 takeaway subject). */
  const getOnboarding = async () => {
    const { data, error } = await admin
      .from('journeys')
      .select('*')
      .eq('is_onboarding_designated', true);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    return data![0] as Record<string, unknown> & { id: string };
  };

  const seedJourney = async (title: string, createdBy: string): Promise<string> => {
    const { data, error } = await admin
      .from('journeys')
      .insert({
        title,
        description: `${title} — J-F PD007 fixture`,
        created_by_group_id: createdBy,
        is_published: true,
        is_public: true,
        journey_type: 'predefined',
        difficulty_level: 'beginner',
        estimated_duration_minutes: 30,
        tags: ['j-f-test'],
        content: null,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) throw new Error(`seedJourney(${title}): ${error.message}`);
    createdJourneyIds.push(data!.id as string);
    return data!.id as string;
  };

  const seedSteps = async (
    journeyId: string,
    specs: Array<{ title: string; kind: string; family: string; required?: boolean }>,
  ): Promise<StepRow[]> => {
    const rows = specs.map((s, i) => ({
      journey_id: journeyId,
      step_order: i + 1,
      title: s.title,
      step_kind_key: s.kind,
      content_family_key: s.family,
      required: s.required ?? true,
      duration_minutes: 5,
      content: { body: `${s.title} — inline payload` },
    }));
    const { data, error } = await admin
      .from('journey_steps')
      .insert(rows)
      .select('id, step_order, title')
      .order('step_order');
    if (error) throw new Error(`seedSteps: ${error.message}`);
    return data as StepRow[];
  };

  /** Admin-seed an enrolment in a status a contract can't reach directly. */
  const seedEnrollment = async (
    journeyId: string,
    groupId: string,
    status: string,
  ): Promise<string> => {
    const { data, error } = await admin
      .from('journey_enrollments')
      .insert({
        journey_id: journeyId,
        group_id: groupId,
        enrolled_by_group_id: groupId,
        status,
        progress_data: {},
      })
      .select('id')
      .single();
    if (error) throw new Error(`seedEnrollment(${status}): ${error.message}`);
    return data!.id as string;
  };

  beforeAll(async () => {
    owner = await createTestUser({ displayName: 'PD007 Owner' });
    traveller = await createTestUser({ displayName: 'PD007 Traveller' });
    steward = await createTestUser({ displayName: 'PD007 Steward' });
    memberA = await createTestUser({ displayName: 'PD007 Member A' });
    memberB = await createTestUser({ displayName: 'PD007 Member B' });
    outsider = await createTestUser({ displayName: 'PD007 Outsider' });
    suspended = await createTestUser({ displayName: 'PD007 Suspended' });
    createdUserIds.push(
      owner.user.id,
      traveller.user.id,
      steward.user.id,
      memberA.user.id,
      memberB.user.id,
      outsider.user.id,
      suspended.user.id,
    );
    const { data: suspendedRows, error: suspendErr } = await admin
      .from('users')
      .update({ is_active: false })
      .eq('auth_user_id', suspended.user.id)
      .select('id');
    if (suspendErr || !suspendedRows?.length) {
      throw new Error(`suspend fixture failed: ${suspendErr?.message ?? 'no row matched'}`);
    }

    jMain = await seedJourney('PD007 main walk', owner.personalGroupId);
    jMainSteps = await seedSteps(jMain, [
      { title: 'Arrive', kind: 'narrative', family: 'witness' },
      { title: 'Turn inward', kind: 'reflection', family: 'reflect' },
      { title: 'Write it down', kind: 'journal', family: 'reflect', required: false },
    ]);
    jLife = await seedJourney('PD007 lifecycle walk', owner.personalGroupId);
    jLifeSteps = await seedSteps(jLife, [
      { title: 'Only step', kind: 'reflection', family: 'reflect' },
    ]);

    // The traveller's own solo walk — through the real door.
    const tc = await asUser(traveller);
    const { data: enr, error: enrErr } = await tc.rpc('enroll_self_in_journey', {
      p_journey_id: jMain,
    });
    if (enrErr) throw new Error(`solo enrol: ${enrErr.message}`);
    soloEnr = enr.enrollment_id as string;

    // The party group + its walk (admin-seeded enrolment; membership grain).
    const sc = await asUser(steward);
    const { data: groupId, error: groupErr } = await sc.rpc('create_engagement_group', {
      p_name: 'PD007 party',
    });
    if (groupErr) throw new Error(`party group: ${groupErr.message}`);
    partyGroup = groupId as string;
    createdGroupIds.push(partyGroup);
    for (const m of [memberA, memberB]) {
      const { error: memErr } = await admin.from('group_memberships').insert({
        group_id: partyGroup,
        member_group_id: m.personalGroupId,
        status: 'active',
        added_by_group_id: steward.personalGroupId,
      });
      if (memErr) throw new Error(`addMember: ${memErr.message}`);
    }
    partyEnr = await seedEnrollment(jMain, partyGroup, 'active');
  }, 120000);

  afterAll(async () => {
    if (createdJourneyIds.length) {
      const { data: enrRows } = await admin
        .from('journey_enrollments')
        .select('id')
        .in('journey_id', createdJourneyIds);
      const enrIds = (enrRows ?? []).map((r) => r.id as string);
      if (enrIds.length) {
        await admin.from('journey_step_instances').delete().in('enrollment_id', enrIds);
      }
      await admin.from('journey_enrollments').delete().in('journey_id', createdJourneyIds);
      await admin.from('journey_steps').delete().in('journey_id', createdJourneyIds);
      for (const id of createdJourneyIds) {
        await admin.from('journeys').delete().eq('id', id);
      }
    }
    for (const id of createdGroupIds) {
      await cleanupTestGroup(id);
    }
    for (const id of createdUserIds) {
      await cleanupTestUser(id);
    }
  }, 120000);

  // ---------------------------------------------------------------------------
  // STORY-1 — the lived record gains the response payload (TASK-JF-01)
  // ---------------------------------------------------------------------------

  describe('STORY-1 — the response substrate (columns + registry seed)', () => {
    it('journey_step_instances carries response and response_updated_at', async () => {
      // RED: missing column (42703 pre-migration).
      const { error } = await admin
        .from('journey_step_instances')
        .select('id, response, response_updated_at')
        .limit(1);
      expect(error).toBeNull();
    });

    it('step_kinds carries captures_response, seeded true for the four Ask-verbed kinds', async () => {
      // RED: missing column. Named-key assertions, count-agnostic (extension
      // kinds choose for themselves at INSERT — nothing global is pinned).
      const { data, error } = await admin
        .from('step_kinds')
        .select('key, captures_response');
      expect(error).toBeNull();
      const byKey = Object.fromEntries(
        (data as Array<{ key: string; captures_response: boolean }>).map((r) => [
          r.key,
          r.captures_response,
        ]),
      );
      for (const k of ['reflection', 'assessment', 'choice', 'journal']) {
        expect(byKey[k]).toBe(true);
      }
      for (const k of ['narrative', 'activity', 'checklist']) {
        expect(byKey[k]).toBe(false);
      }
    });

    it('the uq_step_instance_open grain and contract-only posture are unchanged', async () => {
      // PIN: unchanged behaviour. The open-instance partial unique index
      // survives, and the table stays contract-only (RLS on, zero policies).
      const idx = await runAdminSql(
        `SELECT indexdef FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'uq_step_instance_open';`,
      );
      expect(idx).toHaveLength(1);
      expect(idx[0].indexdef).toContain('completed_at IS NULL');
      const pol = await runAdminSql(
        `SELECT count(*)::int AS n FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'journey_step_instances';`,
      );
      expect(pol[0].n).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // STORY-2 — saving is optional and orthogonal to completion (TASK-JF-02)
  // ---------------------------------------------------------------------------

  describe('STORY-2 — save_step_response: optional-always capture', () => {
    it('saves onto the open instance: response lands, stamp set, completed_at untouched', async () => {
      // RED: missing function (PGRST202 pre-migration).
      const c = await asUser(traveller);
      const s2 = jMainSteps[1]; // reflection — capture-bearing
      const { error: enterErr } = await c.rpc('enter_journey_step', {
        p_enrollment_id: soloEnr,
        p_step_id: s2.id,
      });
      expect(enterErr).toBeNull();

      const { data, error } = await c.rpc('save_step_response', {
        p_enrollment_id: soloEnr,
        p_step_id: s2.id,
        p_response: { body: 'What I actually think about arriving.' },
      });
      expect(error).toBeNull();
      expect(data.step_id).toBe(s2.id);
      expect(data.response).toEqual({ body: 'What I actually think about arriving.' });
      expect(data.response_updated_at).not.toBeNull();

      const { data: inst } = await admin
        .from('journey_step_instances')
        .select('id, completed_at, response')
        .eq('id', data.instance_id)
        .single();
      expect(inst!.completed_at).toBeNull(); // responding never flips completion
      expect(inst!.response).toEqual({ body: 'What I actually think about arriving.' });
    });

    it('save with no prior instance creates one open; a later complete completes THAT instance', async () => {
      // RED: missing function. capture-before-complete (JF-4 else-create arm).
      const c = await asUser(traveller);
      const s3 = jMainSteps[2]; // journal, optional, never entered
      const { data: saved, error: saveErr } = await c.rpc('save_step_response', {
        p_enrollment_id: soloEnr,
        p_step_id: s3.id,
        p_response: { body: 'Words before the walk.' },
      });
      expect(saveErr).toBeNull();
      expect(saved.instance_id).toBeTruthy();

      // Complete the required predecessors, then the step itself.
      for (const st of [jMainSteps[0], jMainSteps[1]]) {
        const { error } = await c.rpc('complete_journey_step', {
          p_enrollment_id: soloEnr,
          p_step_id: st.id,
        });
        expect(error).toBeNull();
      }
      const { data: done, error: doneErr } = await c.rpc('complete_journey_step', {
        p_enrollment_id: soloEnr,
        p_step_id: s3.id,
      });
      expect(doneErr).toBeNull();
      expect(done.instance_id).toBe(saved.instance_id); // no duplicate
      expect(done.completed_at).not.toBeNull();

      const { data: all } = await admin
        .from('journey_step_instances')
        .select('id')
        .eq('enrollment_id', soloEnr)
        .eq('step_id', s3.id);
      expect(all).toHaveLength(1);
    });

    it('revising a completed step updates the latest instance — no new instance', async () => {
      // RED: missing function. Editing revises the lived record (JF-4 latest arm).
      const c = await asUser(traveller);
      const s3 = jMainSteps[2]; // completed in the previous test
      const { data, error } = await c.rpc('save_step_response', {
        p_enrollment_id: soloEnr,
        p_step_id: s3.id,
        p_response: { body: 'Second thoughts, better words.' },
      });
      expect(error).toBeNull();
      expect(data.response).toEqual({ body: 'Second thoughts, better words.' });

      const { data: all } = await admin
        .from('journey_step_instances')
        .select('id, completed_at, response')
        .eq('enrollment_id', soloEnr)
        .eq('step_id', s3.id);
      expect(all).toHaveLength(1);
      expect(all![0].completed_at).not.toBeNull(); // still completed
      expect(all![0].response).toEqual({ body: 'Second thoughts, better words.' });
    });

    it('an explicitly empty save clears the response to NULL (words retracted, passage kept)', async () => {
      // RED: missing function. Whitespace body and JSON null both clear.
      const c = await asUser(traveller);
      const s2 = jMainSteps[1];
      const { data: cleared, error } = await c.rpc('save_step_response', {
        p_enrollment_id: soloEnr,
        p_step_id: s2.id,
        p_response: { body: '   ' },
      });
      expect(error).toBeNull();
      expect(cleared.response).toBeNull();
      expect(cleared.response_updated_at).not.toBeNull(); // stamps on every effective write

      const { data: inst } = await admin
        .from('journey_step_instances')
        .select('response, completed_at')
        .eq('id', cleared.instance_id)
        .single();
      expect(inst!.response).toBeNull();
      expect(inst!.completed_at).not.toBeNull(); // the passage stays
    });

    it('a malformed payload refuses (22023) and never clears existing words', async () => {
      // RED: missing function. The rabbit-hole pin: {} carries no body key —
      // refuse, don't clear.
      const c = await asUser(traveller);
      const s3 = jMainSteps[2]; // holds 'Second thoughts, better words.'
      const { error: noBody } = await c.rpc('save_step_response', {
        p_enrollment_id: soloEnr,
        p_step_id: s3.id,
        p_response: {},
      });
      expect(noBody).not.toBeNull();
      expect(noBody!.code).toBe('22023');

      const { error: nonObject } = await c.rpc('save_step_response', {
        p_enrollment_id: soloEnr,
        p_step_id: s3.id,
        p_response: 'bare string',
      });
      expect(nonObject).not.toBeNull();
      expect(nonObject!.code).toBe('22023');

      const { data: inst } = await admin
        .from('journey_step_instances')
        .select('response')
        .eq('enrollment_id', soloEnr)
        .eq('step_id', s3.id)
        .single();
      expect(inst!.response).toEqual({ body: 'Second thoughts, better words.' }); // untouched
    });

    it('the size guard refuses a body beyond the ceiling (22001) without storing', async () => {
      // RED: missing function. JF-5: 100000 chars (the PD001 journal precedent).
      const c = await asUser(traveller);
      const s2 = jMainSteps[1];
      const { error } = await c.rpc('save_step_response', {
        p_enrollment_id: soloEnr,
        p_step_id: s2.id,
        p_response: { body: 'x'.repeat(100001) },
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('22001');
    });

    it('completing without ever responding succeeds exactly as today', async () => {
      // PIN: unchanged behaviour (invariant 3 — capture is never a toll gate).
      const c = await asUser(memberB);
      // memberB walks the party enrolment: enter + complete step 1, no response.
      const { error: enterErr } = await c.rpc('enter_journey_step', {
        p_enrollment_id: partyEnr,
        p_step_id: jMainSteps[0].id,
      });
      expect(enterErr).toBeNull();
      const { data: done, error: doneErr } = await c.rpc('complete_journey_step', {
        p_enrollment_id: partyEnr,
        p_step_id: jMainSteps[0].id,
      });
      // Via-group completion rides complete_journey_activities; a plain member
      // holds the Participant default. If the refusal fires instead, the pin
      // still holds — completion semantics are untouched by PD007 either way.
      if (doneErr === null) {
        expect(done.completed_at).not.toBeNull();
      } else {
        expect(doneErr.code).toBe('42501');
      }
    });

    it('a materialised Mist saves a response on the onboarding walk (no Mist branch)', async () => {
      // RED: missing function. Mist-compatible by construction.
      const ob = await getOnboarding();
      const c = await asMist();
      const { data: enr, error: enrErr } = await c.rpc('enroll_self_in_journey', {
        p_journey_id: ob.id,
      });
      expect(enrErr).toBeNull();
      const { data: player } = await c.rpc('get_player_state', {
        p_enrollment_id: enr.enrollment_id,
      });
      const { data, error } = await c.rpc('save_step_response', {
        p_enrollment_id: enr.enrollment_id,
        p_step_id: player.steps[0].id,
        p_response: { body: 'A Mist reflects like anyone.' },
      });
      expect(error).toBeNull();
      expect(data.response).toEqual({ body: 'A Mist reflects like anyone.' });
    });
  });

  // ---------------------------------------------------------------------------
  // STORY-5 — frozen and withdrawn walks are read-only for responses (TASK-JF-02)
  // ---------------------------------------------------------------------------

  describe('STORY-5 — the guard family extends with no new rule', () => {
    it.each([
      ['frozen', 'P0001'],
      ['withdrawn', 'P0001'],
      ['paused', 'P0001'],
    ])('save on a %s enrolment refuses %s', async (status, code) => {
      // RED: missing function (then the enter/complete guard family verbatim).
      const enrId = await seedEnrollment(jLife, traveller.personalGroupId, status);
      const c = await asUser(traveller);
      const { error } = await c.rpc('save_step_response', {
        p_enrollment_id: enrId,
        p_step_id: jLifeSteps[0].id,
        p_response: { body: 'should not land' },
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe(code);
      await admin.from('journey_enrollments').delete().eq('id', enrId);
    });

    it('a completed enrolment admits the revision (the J-C loosening carries)', async () => {
      // RED: missing function.
      const enrId = await seedEnrollment(jLife, traveller.personalGroupId, 'completed');
      const c = await asUser(traveller);
      const { data, error } = await c.rpc('save_step_response', {
        p_enrollment_id: enrId,
        p_step_id: jLifeSteps[0].id,
        p_response: { body: 'Completed is a living posture.' },
      });
      expect(error).toBeNull();
      expect(data.response).toEqual({ body: 'Completed is a living posture.' });
      await admin.from('journey_step_instances').delete().eq('enrollment_id', enrId);
      await admin.from('journey_enrollments').delete().eq('id', enrId);
    });

    it('a frozen walk keeps its responses readable (the freeze silences the pen, not the page)', async () => {
      // RED: missing function + missing key. Write while active, freeze, read.
      const enrId = await seedEnrollment(jLife, traveller.personalGroupId, 'active');
      const c = await asUser(traveller);
      const { error: saveErr } = await c.rpc('save_step_response', {
        p_enrollment_id: enrId,
        p_step_id: jLifeSteps[0].id,
        p_response: { body: 'Written while the walk lived.' },
      });
      expect(saveErr).toBeNull();
      await admin
        .from('journey_enrollments')
        .update({ status: 'frozen', progress_data: { frozen_reason: 'left_group' } })
        .eq('id', enrId);

      const { data: player, error: readErr } = await c.rpc('get_player_state', {
        p_enrollment_id: enrId,
      });
      expect(readErr).toBeNull();
      expect(player.status).toBe('frozen');
      const inst = player.instances.find(
        (i: { step_id: string }) => i.step_id === jLifeSteps[0].id,
      );
      expect(inst.response).toEqual({ body: 'Written while the walk lived.' });

      const { error: writeErr } = await c.rpc('save_step_response', {
        p_enrollment_id: enrId,
        p_step_id: jLifeSteps[0].id,
        p_response: { body: 'should refuse' },
      });
      expect(writeErr).not.toBeNull();
      expect(writeErr!.code).toBe('P0001');

      await admin.from('journey_step_instances').delete().eq('enrollment_id', enrId);
      await admin.from('journey_enrollments').delete().eq('id', enrId);
    });
  });

  // ---------------------------------------------------------------------------
  // STORY-3 — the player read returns the substance (TASK-JF-03)
  // ---------------------------------------------------------------------------

  describe('STORY-3 — the four byte-additive player-read keys', () => {
    it('instances[] carries response keys, steps[] carries captures_response, journey carries takeaway', async () => {
      // RED: missing key (all four).
      const c = await asUser(traveller);
      // Ensure a live response exists on s2 (cleared earlier in STORY-2).
      const { error: saveErr } = await c.rpc('save_step_response', {
        p_enrollment_id: soloEnr,
        p_step_id: jMainSteps[1].id,
        p_response: { body: 'Substance for the read.' },
      });
      expect(saveErr).toBeNull();

      const { data: player, error } = await c.rpc('get_player_state', {
        p_enrollment_id: soloEnr,
      });
      expect(error).toBeNull();

      const inst = player.instances.find(
        (i: { step_id: string; completed_at: string | null }) =>
          i.step_id === jMainSteps[1].id,
      );
      expect(inst.response).toEqual({ body: 'Substance for the read.' });
      expect(inst.response_updated_at).not.toBeNull();

      const narrative = player.steps.find((s: { id: string }) => s.id === jMainSteps[0].id);
      const reflection = player.steps.find((s: { id: string }) => s.id === jMainSteps[1].id);
      expect(narrative.captures_response).toBe(false);
      expect(reflection.captures_response).toBe(true);

      expect(Object.keys(player.journey)).toContain('takeaway'); // key served (null here — jMain seeds none)
    });

    it('every pre-existing key is unchanged in shape (byte-additivity pinned)', async () => {
      // RED: missing key (the new ones); PIN: unchanged behaviour (the old ones).
      const c = await asUser(traveller);
      const { data: player, error } = await c.rpc('get_player_state', {
        p_enrollment_id: soloEnr,
      });
      expect(error).toBeNull();
      expect(Object.keys(player).sort()).toEqual(
        [
          'completion',
          'enrollment_id',
          'freeze',
          'instances',
          'journey',
          'progress_sharing',
          'resume_step_id',
          'sequencing_mode',
          'status',
          'steps',
          'timing',
        ].sort(),
      );
      expect(Object.keys(player.journey).sort()).toEqual(
        ['id', 'title', 'description', 'takeaway'].sort(),
      );
      expect(Object.keys(player.steps[0]).sort()).toEqual(
        [
          'id',
          'step_order',
          'title',
          'kind',
          'family',
          'ask_verb',
          'required',
          'repeatable',
          'duration_minutes',
          'content',
          'captures_response',
        ].sort(),
      );
      expect(Object.keys(player.instances[0]).sort()).toEqual(
        [
          'instance_id',
          'step_id',
          'created_at',
          'completed_at',
          'response',
          'response_updated_at',
        ].sort(),
      );
    });

    it('the onboarding journey serves journey.takeaway and the seeded per-step takeaways', async () => {
      // RED: missing key (journey.takeaway); PIN: steps[].content.takeaway is
      // already served through the content payload (the J-E seed).
      const ob = await getOnboarding();
      const c = await asMist();
      const { data: enr, error: enrErr } = await c.rpc('enroll_self_in_journey', {
        p_journey_id: ob.id,
      });
      expect(enrErr).toBeNull();
      const { data: player, error } = await c.rpc('get_player_state', {
        p_enrollment_id: enr.enrollment_id,
      });
      expect(error).toBeNull();
      // toHaveProperty first: pre-migration the key is ABSENT and undefined
      // would pass a bare not.toBeNull() (caught green-at-red 2026-07-18 —
      // the assertion, not the behaviour, was the defect).
      expect(player.journey).toHaveProperty('takeaway');
      expect(player.journey.takeaway).not.toBeNull(); // the J-E seed finally served
      const stepsWithTakeaway = player.steps.filter(
        (s: { content: { takeaway?: unknown } | null }) => s.content?.takeaway != null,
      );
      expect(stepsWithTakeaway.length).toBeGreaterThanOrEqual(2); // seed steps 1 and 4
    });
  });

  // ---------------------------------------------------------------------------
  // STORY-4 — response content is private-only (TASK-JF-03)
  // ---------------------------------------------------------------------------

  describe('STORY-4 — the privacy wall', () => {
    const SECRET = 'PD007-secret-words-never-shared';

    it('the group-progress read carries no response key or content in any consent state', async () => {
      // PIN: unchanged behaviour, re-pinned over the new payload — consent
      // covers progress facts, never words (ADR-U046 §3; invariants 4+8).
      const a = await asUser(memberA);
      const { error: saveErr } = await a.rpc('save_step_response', {
        p_enrollment_id: partyEnr,
        p_step_id: jMainSteps[1].id,
        p_response: { body: SECRET },
      });
      expect(saveErr).toBeNull();
      const { error: shareErr } = await a.rpc('set_journey_progress_sharing', {
        p_enrollment_id: partyEnr,
        p_share: true,
      });
      expect(shareErr).toBeNull();

      const s = await asUser(steward);
      const { data: progress, error } = await s.rpc('get_group_journey_progress', {
        p_enrollment_id: partyEnr,
      });
      expect(error).toBeNull();
      const flat = JSON.stringify(progress);
      expect(flat).not.toContain(SECRET);
      expect(flat).not.toMatch(/"response"/);
      expect(flat).not.toMatch(/"response_updated_at"/);
    });

    it('a sibling traveller sees only their own instances and responses', async () => {
      // PIN: unchanged behaviour (invariant 4 — traveller-own instances).
      const b = await asUser(memberB);
      const { data: player, error } = await b.rpc('get_player_state', {
        p_enrollment_id: partyEnr,
      });
      expect(error).toBeNull();
      expect(JSON.stringify(player.instances)).not.toContain(SECRET);
      for (const inst of player.instances) {
        // Only memberB's own rows are present at all (grain proven via admin).
        const { data: row } = await admin
          .from('journey_step_instances')
          .select('traveller_group_id')
          .eq('id', inst.instance_id)
          .single();
        expect(row!.traveller_group_id).toBe(memberB.personalGroupId);
      }
    });

    it('a direct PostgREST caller cannot SELECT, INSERT, or UPDATE the table', async () => {
      // PIN: unchanged behaviour (contract-only; the ADR-U038 direct-caller pin
      // re-asked over the new columns — response is not reachable around the verb).
      const c = await asUser(traveller);
      const { data: sel, error: selErr } = await c
        .from('journey_step_instances')
        .select('id, response');
      // RLS-on + zero policies yields an empty set (or a privilege error) —
      // either way, nothing is readable.
      if (selErr === null) {
        expect(sel).toHaveLength(0);
      } else {
        expect(selErr).not.toBeNull();
      }
      const { error: insErr } = await c.from('journey_step_instances').insert({
        enrollment_id: soloEnr,
        traveller_group_id: traveller.personalGroupId,
        step_id: jMainSteps[0].id,
        response: { body: 'smuggled' },
      });
      expect(insErr).not.toBeNull();
      const { error: updErr } = await c
        .from('journey_step_instances')
        .update({ response: { body: 'hijacked' } })
        .eq('enrollment_id', partyEnr);
      expect(updErr).not.toBeNull();
    });

    it('no traveller standing -> P0002 on the write and the read (existence hidden)', async () => {
      // PIN: unchanged behaviour (the shared standing gate).
      const c = await asUser(outsider);
      const { error: writeErr } = await c.rpc('save_step_response', {
        p_enrollment_id: soloEnr,
        p_step_id: jMainSteps[1].id,
        p_response: { body: 'no standing' },
      });
      expect(writeErr).not.toBeNull();
      expect(writeErr!.code).toBe('P0002');
      const { error: readErr } = await c.rpc('get_player_state', {
        p_enrollment_id: soloEnr,
      });
      expect(readErr).not.toBeNull();
      expect(readErr!.code).toBe('P0002');
    });
  });

  // ---------------------------------------------------------------------------
  // STORY-6 — the traveller's walks export (TASK-JF-03; the H010 flag)
  // ---------------------------------------------------------------------------

  describe('STORY-6 — get_own_step_instances_export', () => {
    it('returns the caller\'s walks — enrolments, passages, and words, fixed shape', async () => {
      // RED: missing function.
      const c = await asUser(traveller);
      const { data, error } = await c.rpc('get_own_step_instances_export');
      expect(error).toBeNull();
      const walks = data as Array<{
        enrollment_id: string;
        journey_id: string;
        journey_title: string;
        status: string;
        enrolled_at: string;
        completed_at: string | null;
        steps: Array<Record<string, unknown>>;
      }>;
      const main = walks.find((w) => w.enrollment_id === soloEnr);
      expect(main).toBeDefined();
      expect(main!.journey_title).toBe('PD007 main walk');
      const s2 = main!.steps.find((s) => s.step_id === jMainSteps[1].id);
      expect(s2).toBeDefined();
      expect(Object.keys(s2!).sort()).toEqual(
        [
          'step_id',
          'step_title',
          'kind',
          'created_at',
          'completed_at',
          'response',
          'response_updated_at',
        ].sort(),
      );
      expect(s2!.response).toEqual({ body: 'Substance for the read.' });
      expect(s2!.kind).toBe('reflection');
    });

    it('exports nothing of anyone else\'s walks or words', async () => {
      // RED: missing function. memberB's export must not carry memberA's words.
      const b = await asUser(memberB);
      const { data, error } = await b.rpc('get_own_step_instances_export');
      expect(error).toBeNull();
      const flat = JSON.stringify(data);
      expect(flat).not.toContain('PD007-secret-words-never-shared');
      expect(flat).not.toContain('Substance for the read.');
      const party = (data as Array<{ enrollment_id: string; steps: Array<unknown> }>).find(
        (w) => w.enrollment_id === partyEnr,
      );
      // The via-group walk appears (memberB has instances on it) with own rows only.
      expect(party).toBeDefined();
    });

    it('a Mist exports their onboarding walk identically; an actorless session gets 42501', async () => {
      // RED: missing function. Mist-callable; right of access precedes words.
      const ob = await getOnboarding();
      const c = await asMist();
      const { data: enr, error: enrErr } = await c.rpc('enroll_self_in_journey', {
        p_journey_id: ob.id,
      });
      expect(enrErr).toBeNull();
      const { error: saveErr } = await c.rpc('save_step_response', {
        p_enrollment_id: enr.enrollment_id,
        p_step_id: (
          await c.rpc('get_player_state', { p_enrollment_id: enr.enrollment_id })
        ).data.steps[0].id,
        p_response: { body: 'A Mist\'s words are theirs to take.' },
      });
      expect(saveErr).toBeNull();
      const { data: exp, error: expErr } = await c.rpc('get_own_step_instances_export');
      expect(expErr).toBeNull();
      const walk = (exp as Array<{ enrollment_id: string }>).find(
        (w) => w.enrollment_id === enr.enrollment_id,
      );
      expect(walk).toBeDefined();

      // LABELLED ADAPTATION (C-E flip-green 2026-07-21 — FEAT-PD012 STORY-5,
      // CB-6): this probe originally used the SUSPENDED fixture as its
      // "actorless" session. That was true under the old is_active-gated
      // resolution — and is exactly the asymmetry FEAT-PC008 §155 named and
      // C-E repaired at source. A suspended member's export now SUCCEEDS
      // (right of access); the actorless 42501 belongs to a genuinely
      // session-less client.
      const sc = await asUser(suspended);
      const { data: susExp, error: susErr } = await sc.rpc('get_own_step_instances_export');
      expect(susErr).toBeNull();
      expect(Array.isArray(susExp)).toBe(true);

      const anon = createTestClient();
      const { error: actorlessErr } = await anon.rpc('get_own_step_instances_export');
      expect(actorlessErr).not.toBeNull();
      expect(actorlessErr!.code).toBe('42501');
    });
  });

  // ---------------------------------------------------------------------------
  // STORY-1 proofs — carry-over and ephemerality over existing machinery
  // ---------------------------------------------------------------------------

  describe('STORY-1 proofs — the response rides the existing cascades', () => {
    it('responses persist across transcendence on the same personal group', async () => {
      // PROOF: existing machinery (finalise_transcendence; labelled, not TDD).
      const ob = await getOnboarding();
      const c = await asMist();
      const me = await mistIdentity(c);
      const { data: enr, error: enrErr } = await c.rpc('enroll_self_in_journey', {
        p_journey_id: ob.id,
      });
      expect(enrErr).toBeNull();
      const { data: player } = await c.rpc('get_player_state', {
        p_enrollment_id: enr.enrollment_id,
      });
      const { data: saved, error: saveErr } = await c.rpc('save_step_response', {
        p_enrollment_id: enr.enrollment_id,
        p_step_id: player.steps[0].id,
        p_response: { body: 'Words written as a Mist.' },
      });
      expect(saveErr).toBeNull();

      const { data: fin, error: finErr } = await c.rpc('finalise_transcendence', {
        p_policy_version: 'v1',
        p_capture_context: { surface: 'hub', flow: 'pd007-carry-over-test' },
      });
      expect(finErr).toBeNull();
      expect(fin.transcended).toBe(true);

      const { data: after } = await admin
        .from('journey_step_instances')
        .select('id, traveller_group_id, response')
        .eq('id', saved.instance_id)
        .single();
      expect(after!.traveller_group_id).toBe(me.personal_group_id); // same group, same row
      expect(after!.response).toEqual({ body: 'Words written as a Mist.' });
    });

    it('the ADR-U031 erasure path forgets the words with the enrolment (no orphans)', async () => {
      // PROOF: existing machinery (explicit_erase_mist — the house erasure
      // function, never a bare-delete simulation; the J-C rule).
      const ob = await getOnboarding();
      const c = await asMist();
      const { data: enr, error: enrErr } = await c.rpc('enroll_self_in_journey', {
        p_journey_id: ob.id,
      });
      expect(enrErr).toBeNull();
      const { data: player } = await c.rpc('get_player_state', {
        p_enrollment_id: enr.enrollment_id,
      });
      const { data: saved, error: saveErr } = await c.rpc('save_step_response', {
        p_enrollment_id: enr.enrollment_id,
        p_step_id: player.steps[0].id,
        p_response: { body: 'Words that must be forgettable.' },
      });
      expect(saveErr).toBeNull();

      const { error: eraseErr } = await c.rpc('explicit_erase_mist');
      expect(eraseErr).toBeNull();

      const { data: instAfter } = await admin
        .from('journey_step_instances')
        .select('id')
        .eq('id', saved.instance_id);
      expect(instAfter).toHaveLength(0);
      const { data: enrAfter } = await admin
        .from('journey_enrollments')
        .select('id')
        .eq('id', enr.enrollment_id);
      expect(enrAfter).toHaveLength(0);
    });
  });
});
