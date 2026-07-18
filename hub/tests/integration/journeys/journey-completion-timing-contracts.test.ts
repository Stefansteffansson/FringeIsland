import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
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

const GHOST = '00000000-0000-0000-0000-00000000dead';

/** Timestamps cross the PG (`+00:00`) / JS (`Z`) boundary — compare as epoch ms. */
const epochMs = (x: unknown): number => new Date(x as string).getTime();

/** DeusEx elevation pair — the established local-helper pattern (mirrors
 *  journal-erasure-export / fim-account-erasure): erase_fim_account is
 *  manage_all_groups-gated and needs an authenticated caller. */
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
        WHERE group_id = v_deusex AND member_group_id = '${personalGroupId}';
    END $$;`).catch(() => undefined);
}

/**
 * FEAT-PD004 (Journeys Cycle J-C) — journey completion detection, timing, and
 * review-read contracts. The milestone is detected server-side inside
 * complete_journey_step (on the transition edge, under the enrolment row lock),
 * stamped once, and served to every surface via additive payload blocks.
 *
 * RED-FIRST classification. This suite is authored BEFORE the TASK-JC-02
 * migration is applied to the dev DB (the substrate is at FEAT-PD003 today), so
 * the new behaviours do not exist yet. Every `it` carries a one-line class:
 *   // RED: missing payload key      — an additive key the migration adds.
 *   // RED: missing behaviour        — a transition/notification not yet wired.
 *   // INTENDED-RED against J-B guard — the guard loosening (STORY-4): a call
 *                                       that P0001s today but PD004 admits.
 *   // GREEN: pins unchanged behaviour — a J-B/J-A invariant that must stay true
 *                                        across the feature (regression pin).
 *
 * Tested against the spec's Open-spec-question DEFAULTS (Q1..Q6), which the
 * migration author ratifies at the schema gate:
 *   Q1 detection inside complete_journey_step, edge-triggered, FOR UPDATE lock.
 *   Q2 solo predicate: traveller_group_id = enrollment.group_id (the walker IS
 *      the party). Via-group walks never flip the party row.
 *   Q3 guard loosening: enter/complete admit ('active','completed');
 *      withdrawn/frozen/paused unchanged.
 *   Q4 notification: type='journey_completed', passive (action_type null),
 *      recipient = traveller personal group, payload {journey_id, enrollment_id,
 *      journey_title}; inserted only on the edge.
 *   Q5 timing: derived-only — completed engagements sum per step (open excluded);
 *      total = sum of per-step; wall-clock span served separately.
 *   Q6 additive posture: completion/timing/journey_completed are additive keys;
 *      every pre-existing get_player_state key is byte-shape-unchanged.
 *
 * Fixtures follow the sibling suites (journey-catalogue-enrolment /
 * journey-step-progress) exactly: native journey_steps rows (the legacy JSONB
 * shape is dead), enrolments through the shipped contracts, admin-seeded states
 * where a status can't be reached through a contract, FK-safe teardown.
 */
describe('FEAT-PD004 — journey completion, timing & review-read contracts (J-C)', () => {
  const admin = createAdminClient();

  let owner: TestUser; // owns the fixture journeys (ownerG)
  let solo: TestUser; // solo traveller (STORY-1/3/4/5/6)
  let groupA: TestUser; // via-group traveller who completes (STORY-2)
  let groupB: TestUser; // via-group traveller who does NOT complete (STORY-2)
  let steward: TestUser; // enrols the party group; holds the enrol + complete keys
  let outsider: TestUser; // no standing (STORY-6 P0002 subject)
  let eraser: TestUser; // dedicated erasure-cascade traveller (STORY-3c)

  let ownerG: string;
  let partyGrp: string;

  // Fixture journeys.
  let jFlip: string; // solo completion flip / idempotence / optional-remaining / notification / flag / keys
  let jRacing: string; // racing finals serialization
  let jGuardCompleted: string; // admin-seeded `completed` enrolment (guard loosening)
  let jTiming: string; // timing derivation
  let jFrozen: string; // frozen enrolment (guard GREEN pin)
  let jPaused: string; // paused enrolment (guard GREEN pin)
  let jWithdrawn: string; // withdrawn enrolment (guard GREEN pin)
  let jGroup: string; // via-group completion
  let jErase: string; // erasure-cascade notification

  // Enrolment ids.
  let flipEnr: string;
  let racingEnr: string;
  let guardCompletedEnr: string;
  let timingEnr: string;
  let frozenEnr: string;
  let pausedEnr: string;
  let withdrawnEnr: string;
  let groupEnr: string;
  let eraseEnr: string;

  type StepRow = { id: string; step_order: number; title: string };
  let flipSteps: StepRow[] = []; // [req1, req2, rep3]
  let racingSteps: StepRow[] = []; // [req1, req2]
  let guardSteps: StepRow[] = []; // [req1, opt2, rep3]
  let timingSteps: StepRow[] = []; // [rep1, req2, opt3]
  let groupSteps: StepRow[] = []; // [req1, req2]
  let eraseSteps: StepRow[] = []; // [req1]
  let frozenSteps: StepRow[] = [];
  let pausedSteps: StepRow[] = [];
  let withdrawnSteps: StepRow[] = [];

  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];
  const createdJourneyIds: string[] = [];
  const adminEnrollmentIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
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

  const seedJourney = async (title: string): Promise<string> => {
    const { data, error } = await admin
      .from('journeys')
      .insert({
        title,
        description: `${title} — J-C PD004 fixture`,
        created_by_group_id: ownerG,
        is_published: true,
        is_public: true,
        journey_type: 'predefined',
        difficulty_level: 'beginner',
        estimated_duration_minutes: 60,
        tags: ['j-c-test'],
        content: null,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) throw new Error(`seedJourney(${title}): ${error.message}`);
    createdJourneyIds.push(data!.id as string);
    return data!.id as string;
  };

  /** Seed native journey_steps rows (service role bypasses the contract-only posture). */
  const seedSteps = async (
    journeyId: string,
    specs: Array<{ title: string; kind: string; family: string; required?: boolean; repeatable?: boolean; duration?: number }>,
  ): Promise<StepRow[]> => {
    const rows = specs.map((s, i) => ({
      journey_id: journeyId,
      step_order: i + 1,
      title: s.title,
      step_kind_key: s.kind,
      content_family_key: s.family,
      required: s.required ?? true,
      repeatable: s.repeatable ?? false,
      duration_minutes: s.duration ?? 10,
      content: { body: `${s.title} — inline payload (pending-DS-4)` },
    }));
    const { data, error } = await admin
      .from('journey_steps')
      .insert(rows)
      .select('id, step_order, title')
      .order('step_order', { ascending: true });
    if (error) return [];
    return (data as StepRow[]) ?? [];
  };

  const enrolSelf = async (u: TestUser, journeyId: string): Promise<string> => {
    const c = await asUser(u);
    const { data, error } = await c.rpc('enroll_self_in_journey', { p_journey_id: journeyId });
    if (error) return GHOST;
    const d = data as { enrollment_id?: string; id?: string };
    return d.enrollment_id ?? d.id ?? GHOST;
  };

  /** Admin-seed an enrolment in a status a contract can't produce (frozen/paused/completed). */
  const adminEnroll = async (
    journeyId: string,
    groupId: string,
    status: string,
    extra: Record<string, unknown> = {},
  ): Promise<string> => {
    const { data, error } = await admin
      .from('journey_enrollments')
      .insert({ journey_id: journeyId, group_id: groupId, enrolled_by_group_id: groupId, status, ...extra })
      .select('id')
      .single();
    if (error) throw new Error(`adminEnroll(${status}): ${error.message}`);
    adminEnrollmentIds.push(data!.id as string);
    return data!.id as string;
  };

  /**
   * Grant `complete_journey_activities` on the party group to a member so a
   * via-group traveller passes the Q7 gate in complete_journey_step. Reuses the
   * party's Steward group-role and defensively ensures the permission is on it —
   * deterministic regardless of what the Steward template happens to carry.
   */
  const grantCompleteKey = async (partyGroupId: string, u: TestUser): Promise<void> => {
    await runAdminSql(`
      DO $$
      DECLARE v_role uuid; v_perm uuid;
      BEGIN
        SELECT id INTO v_perm FROM public.permissions WHERE name = 'complete_journey_activities';
        SELECT gr.id INTO v_role FROM public.group_roles gr
         WHERE gr.group_id = '${partyGroupId}'
           AND (gr.created_from_role_template_id =
                 (SELECT id FROM public.role_templates WHERE name = 'Steward Role Template')
               OR gr.name = 'Steward')
         LIMIT 1;
        IF v_perm IS NOT NULL AND v_role IS NOT NULL THEN
          INSERT INTO public.group_role_permissions (group_role_id, permission_id)
          VALUES (v_role, v_perm) ON CONFLICT DO NOTHING;
          INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
          VALUES ('${u.personalGroupId}', '${partyGroupId}', v_role, '${steward.personalGroupId}')
          ON CONFLICT DO NOTHING;
        END IF;
      END $$;`);
  };

  /** journey_completed notification rows for a recipient scoped to one enrolment (payload-filtered). */
  const completionNotifs = async (
    recipientPg: string,
    enrollmentId: string,
  ): Promise<Array<Record<string, unknown>>> => {
    const { data } = await admin
      .from('notifications')
      .select('id, type, recipient_group_id, action_type, payload, group_id')
      .eq('recipient_group_id', recipientPg)
      .eq('type', 'journey_completed');
    return ((data ?? []) as Array<Record<string, unknown>>).filter(
      (n) => (n.payload as Record<string, unknown> | null)?.enrollment_id === enrollmentId,
    );
  };

  /** Make a solo enrolment hermetic before a completion test (red today; future-proofs green re-runs). */
  const resetSolo = async (enrollmentId: string, recipientPg: string): Promise<void> => {
    await admin.from('journey_step_instances').delete().eq('enrollment_id', enrollmentId);
    await admin
      .from('journey_enrollments')
      .update({ status: 'active', completed_at: null, status_changed_at: new Date().toISOString() })
      .eq('id', enrollmentId);
    await admin.from('notifications').delete().eq('recipient_group_id', recipientPg).eq('type', 'journey_completed');
  };

  const readEnrollment = async (enrollmentId: string): Promise<Record<string, unknown>> => {
    const { data } = await admin
      .from('journey_enrollments')
      .select('status, completed_at, status_changed_at, enrolled_at')
      .eq('id', enrollmentId)
      .single();
    return (data ?? {}) as Record<string, unknown>;
  };

  beforeAll(async () => {
    owner = await createTestUser({ displayName: 'JC Owner' });
    solo = await createTestUser({ displayName: 'JC Solo' });
    groupA = await createTestUser({ displayName: 'JC Group A' });
    groupB = await createTestUser({ displayName: 'JC Group B' });
    steward = await createTestUser({ displayName: 'JC Steward' });
    outsider = await createTestUser({ displayName: 'JC Outsider' });
    eraser = await createTestUser({ displayName: 'JC Eraser' });
    createdUserIds.push(
      owner.user.id,
      solo.user.id,
      groupA.user.id,
      groupB.user.id,
      steward.user.id,
      outsider.user.id,
      eraser.user.id,
    );

    ownerG = await seedGroup('JC Journey Owners', [], owner);
    partyGrp = await seedGroup('JC Party', [groupA, groupB], steward);
    await grantCompleteKey(partyGrp, groupA);
    await grantCompleteKey(partyGrp, groupB);

    jFlip = await seedJourney('JC Flip Journey');
    jRacing = await seedJourney('JC Racing Journey');
    jGuardCompleted = await seedJourney('JC Guard Completed Journey');
    jTiming = await seedJourney('JC Timing Journey');
    jFrozen = await seedJourney('JC Frozen Journey');
    jPaused = await seedJourney('JC Paused Journey');
    jWithdrawn = await seedJourney('JC Withdrawn Journey');
    jGroup = await seedJourney('JC Group Journey');
    jErase = await seedJourney('JC Erase Journey');

    flipSteps = await seedSteps(jFlip, [
      { title: 'Flip One', kind: 'narrative', family: 'witness', required: true },
      { title: 'Flip Two', kind: 'activity', family: 'act', required: true },
      { title: 'Flip Three (repeatable)', kind: 'journal', family: 'reflect', required: false, repeatable: true },
    ]);
    racingSteps = await seedSteps(jRacing, [
      { title: 'Race One', kind: 'narrative', family: 'witness', required: true },
      { title: 'Race Two', kind: 'activity', family: 'act', required: true },
    ]);
    guardSteps = await seedSteps(jGuardCompleted, [
      { title: 'Guard One', kind: 'narrative', family: 'witness', required: true },
      { title: 'Guard Two (optional)', kind: 'reflection', family: 'reflect', required: false },
      { title: 'Guard Three (repeatable)', kind: 'journal', family: 'reflect', required: false, repeatable: true },
    ]);
    timingSteps = await seedSteps(jTiming, [
      { title: 'Timing One (repeatable)', kind: 'journal', family: 'reflect', required: false, repeatable: true },
      { title: 'Timing Two (required)', kind: 'activity', family: 'act', required: true },
      { title: 'Timing Three (optional)', kind: 'reflection', family: 'reflect', required: false },
    ]);
    frozenSteps = await seedSteps(jFrozen, [{ title: 'Frozen Step', kind: 'narrative', family: 'witness' }]);
    pausedSteps = await seedSteps(jPaused, [{ title: 'Paused Step', kind: 'narrative', family: 'witness' }]);
    withdrawnSteps = await seedSteps(jWithdrawn, [{ title: 'Withdrawn Step', kind: 'narrative', family: 'witness' }]);
    groupSteps = await seedSteps(jGroup, [
      { title: 'Group One', kind: 'narrative', family: 'witness', required: true },
      { title: 'Group Two', kind: 'choice', family: 'decide', required: true },
    ]);
    eraseSteps = await seedSteps(jErase, [{ title: 'Erase Step', kind: 'narrative', family: 'witness', required: true }]);

    // Solo enrolments via the shipped contract.
    flipEnr = await enrolSelf(solo, jFlip);
    racingEnr = await enrolSelf(solo, jRacing);
    timingEnr = await enrolSelf(solo, jTiming);
    eraseEnr = await enrolSelf(eraser, jErase);

    // Withdrawn: enrol then withdraw (a contract-reachable terminal status).
    withdrawnEnr = await enrolSelf(solo, jWithdrawn);
    const cw = await asUser(solo);
    await cw.rpc('withdraw_from_journey', { p_enrollment_id: withdrawnEnr });

    // Frozen / paused / completed: statuses a contract can't produce — admin-seeded.
    frozenEnr = await adminEnroll(jFrozen, solo.personalGroupId, 'frozen');
    pausedEnr = await adminEnroll(jPaused, solo.personalGroupId, 'paused');
    guardCompletedEnr = await adminEnroll(jGuardCompleted, solo.personalGroupId, 'completed', {
      completed_at: new Date().toISOString(),
    });
    // Pre-pass the required predecessor so STORY-4a / STORY-5c isolate the guard
    // (not linear gating) when acting on the optional/repeatable tail.
    if (guardSteps[0]) {
      await admin.from('journey_step_instances').insert({
        enrollment_id: guardCompletedEnr,
        traveller_group_id: solo.personalGroupId,
        step_id: guardSteps[0].id,
        completed_at: new Date().toISOString(),
      });
    }

    // Group enrolment (steward wields the key on the party).
    const cs = await asUser(steward);
    const { data: ge } = await cs.rpc('enroll_group_in_journey', { p_group_id: partyGrp, p_journey_id: jGroup });
    groupEnr = ((ge as { enrollment_id?: string; id?: string })?.enrollment_id
      ?? (ge as { id?: string })?.id) ?? GHOST;
  }, 120000);

  afterAll(async () => {
    // FK-safe teardown: instances → enrolments → steps → journeys → groups → users.
    if (createdJourneyIds.length) {
      const idList = createdJourneyIds.map((id) => `'${id}'`).join(',');
      await runAdminSql(
        `DELETE FROM public.journey_step_instances WHERE step_id IN ` +
          `(SELECT id FROM public.journey_steps WHERE journey_id IN (${idList}));`,
      ).catch(() => undefined);
      for (const id of adminEnrollmentIds) {
        await admin.from('journey_enrollments').delete().eq('id', id);
      }
      for (const id of createdJourneyIds) {
        await admin.from('journey_enrollments').delete().eq('journey_id', id);
      }
      await admin.from('journey_steps').delete().in('journey_id', createdJourneyIds);
      for (const id of createdJourneyIds) {
        await admin.from('journeys').delete().eq('id', id);
      }
    }
    for (const id of createdGroupIds.reverse()) {
      await cleanupTestGroup(id);
    }
    for (const id of createdUserIds) {
      await cleanupTestUser(id);
    }
  }, 120000);

  // ==========================================================================
  // STORY-1 — Completion is detected and marked once (JRN-12, solo)
  // ==========================================================================
  describe('STORY-1 — solo completion detected & stamped once', () => {
    beforeEach(async () => {
      await resetSolo(flipEnr, solo.personalGroupId);
    });

    it('flips status/completed_at/status_changed_at in the call that completes the final required step', async () => {
      // RED: missing behaviour — complete_journey_step never flips the enrolment today.
      const before = await readEnrollment(flipEnr);
      const c = await asUser(solo);
      await c.rpc('complete_journey_step', { p_enrollment_id: flipEnr, p_step_id: flipSteps[0].id });
      const { data: finalResp, error } = await c.rpc('complete_journey_step', {
        p_enrollment_id: flipEnr,
        p_step_id: flipSteps[1].id, // the final REQUIRED step
      });
      expect(error).toBeNull();
      // The completing call reports the transition (spec STORY-6 default).
      expect((finalResp as Record<string, unknown>).journey_completed).toBe(true);
      // ...and a service-role re-read shows the concluded row.
      const after = await readEnrollment(flipEnr);
      expect(after.status).toBe('completed');
      expect(after.completed_at).not.toBeNull();
      expect(epochMs(after.status_changed_at)).toBeGreaterThan(epochMs(before.status_changed_at));
    });

    it('fires the transition even when an optional/repeatable step remains (completion is over REQUIRED only)', async () => {
      // RED: missing behaviour — the flip is defined over required steps; rep3 stays open.
      const c = await asUser(solo);
      await c.rpc('complete_journey_step', { p_enrollment_id: flipEnr, p_step_id: flipSteps[0].id });
      await c.rpc('complete_journey_step', { p_enrollment_id: flipEnr, p_step_id: flipSteps[1].id });
      const after = await readEnrollment(flipEnr);
      expect(after.status).toBe('completed'); // fired despite rep3 (non-required) untouched
      const { data: rep3 } = await admin
        .from('journey_step_instances')
        .select('id')
        .eq('enrollment_id', flipEnr)
        .eq('step_id', flipSteps[2].id);
      expect((rep3 ?? []).length).toBe(0); // the optional/repeatable step never had to be done
    });

    it('is idempotent: a further complete after the transition changes nothing (one completed_at, one notification)', async () => {
      // RED: missing behaviour — also needs the STORY-4 guard loosening for the
      // post-completion complete to be admitted at all (P0001 today).
      const c = await asUser(solo);
      await c.rpc('complete_journey_step', { p_enrollment_id: flipEnr, p_step_id: flipSteps[0].id });
      await c.rpc('complete_journey_step', { p_enrollment_id: flipEnr, p_step_id: flipSteps[1].id });
      const firstStamp = epochMs((await readEnrollment(flipEnr)).completed_at);
      const firstNotifs = await completionNotifs(solo.personalGroupId, flipEnr);
      expect(firstNotifs.length).toBe(1);

      // A further complete of a repeatable step on the now-completed enrolment.
      const { error: againErr } = await c.rpc('complete_journey_step', {
        p_enrollment_id: flipEnr,
        p_step_id: flipSteps[2].id,
      });
      expect(againErr).toBeNull();
      const after = await readEnrollment(flipEnr);
      expect(after.status).toBe('completed');
      expect(epochMs(after.completed_at)).toBe(firstStamp); // completed_at unchanged
      const afterNotifs = await completionNotifs(solo.personalGroupId, flipEnr);
      expect(afterNotifs.length).toBe(1); // still exactly one — no edge on a repeat
    });

    it('serializes racing finals: two parallel completes of the last required step yield one transition', async () => {
      // RED: missing behaviour — the enrolment FOR UPDATE lock is the STORY-1 edge.
      // SPEC DEVIATION (surfaced in the report): linear gating makes two *distinct*
      // simultaneously-final required steps impossible (order totally orders the
      // gate), so we race two parallel completes of the SAME final required step —
      // the identical row-lock serialization property.
      await resetSolo(racingEnr, solo.personalGroupId);
      const c0 = await asUser(solo);
      await c0.rpc('complete_journey_step', { p_enrollment_id: racingEnr, p_step_id: racingSteps[0].id });

      const cX = await asUser(solo);
      const cY = await asUser(solo);
      await Promise.all([
        cX.rpc('complete_journey_step', { p_enrollment_id: racingEnr, p_step_id: racingSteps[1].id }),
        cY.rpc('complete_journey_step', { p_enrollment_id: racingEnr, p_step_id: racingSteps[1].id }),
      ]);

      const after = await readEnrollment(racingEnr);
      expect(after.status).toBe('completed');
      expect(after.completed_at).not.toBeNull();
      const notifs = await completionNotifs(solo.personalGroupId, racingEnr);
      expect(notifs.length).toBe(1); // exactly one transition despite two racers
      await resetSolo(racingEnr, solo.personalGroupId);
    });
  });

  // ==========================================================================
  // STORY-2 — A via-group traveller's completion is honest and private
  // ==========================================================================
  describe('STORY-2 — via-group completion never speaks for the party', () => {
    beforeEach(async () => {
      await admin.from('journey_step_instances').delete().eq('enrollment_id', groupEnr);
      await admin
        .from('notifications')
        .delete()
        .in('recipient_group_id', [groupA.personalGroupId, groupB.personalGroupId])
        .eq('type', 'journey_completed');
    });

    const completeAllRequiredAsA = async () => {
      const cA = await asUser(groupA);
      await cA.rpc('complete_journey_step', { p_enrollment_id: groupEnr, p_step_id: groupSteps[0].id });
      await cA.rpc('complete_journey_step', { p_enrollment_id: groupEnr, p_step_id: groupSteps[1].id });
    };

    it('leaves the party enrolment row unflipped (status active, completed_at null)', async () => {
      // GREEN: pins unchanged behaviour — a via-group walk must never flip the party row.
      await completeAllRequiredAsA();
      const after = await readEnrollment(groupEnr);
      expect(after.status).toBe('active');
      expect(after.completed_at).toBeNull();
    });

    it("reads the completing traveller's completion block true with traveller_completed_at", async () => {
      // RED: missing payload key — the `completion` block does not exist yet.
      await completeAllRequiredAsA();
      const cA = await asUser(groupA);
      const { data, error } = await cA.rpc('get_player_state', { p_enrollment_id: groupEnr });
      expect(error).toBeNull();
      const completion = (data as Record<string, unknown>).completion as Record<string, unknown> | undefined;
      expect(completion).toBeDefined();
      expect(completion!.traveller_completed).toBe(true);
      expect(completion!.traveller_completed_at).not.toBeNull();
    });

    it("routes the notification to the traveller's personal group, never the party", async () => {
      // RED: missing behaviour — no journey_completed row fires today.
      await completeAllRequiredAsA();
      const notifs = await completionNotifs(groupA.personalGroupId, groupEnr);
      expect(notifs.length).toBe(1);
      expect(notifs[0].recipient_group_id).toBe(groupA.personalGroupId);
      expect(notifs[0].recipient_group_id).not.toBe(partyGrp);
    });

    it("keeps another member's completion block false (completion never leaks across travellers)", async () => {
      // RED: missing payload key — completion absent today; the block must read false for B.
      await completeAllRequiredAsA();
      const cB = await asUser(groupB);
      const { data, error } = await cB.rpc('get_player_state', { p_enrollment_id: groupEnr });
      expect(error).toBeNull();
      const completion = (data as Record<string, unknown>).completion as Record<string, unknown> | undefined;
      expect(completion).toBeDefined();
      expect(completion!.traveller_completed).toBe(false);
    });
  });

  // ==========================================================================
  // STORY-3 — The milestone lands durably (V3)
  // ==========================================================================
  describe('STORY-3 — durable journey_completed notification row', () => {
    it('inserts exactly one passive row on the edge with the specified recipient + payload', async () => {
      // RED: missing behaviour — the durable row is the whole V3 obligation here.
      await resetSolo(flipEnr, solo.personalGroupId);
      const c = await asUser(solo);
      await c.rpc('complete_journey_step', { p_enrollment_id: flipEnr, p_step_id: flipSteps[0].id });
      await c.rpc('complete_journey_step', { p_enrollment_id: flipEnr, p_step_id: flipSteps[1].id });

      const notifs = await completionNotifs(solo.personalGroupId, flipEnr);
      expect(notifs.length).toBe(1);
      const row = notifs[0];
      expect(row.type).toBe('journey_completed');
      expect(row.recipient_group_id).toBe(solo.personalGroupId);
      expect(row.action_type).toBeNull(); // passive — no action columns
      const payload = row.payload as Record<string, unknown>;
      expect(payload.journey_id).toBe(jFlip);
      expect(payload.enrollment_id).toBe(flipEnr);
      expect(payload.journey_title).toBeTruthy();
    });

    it('inserts no additional row on non-edge calls (post-completion repeatable)', async () => {
      // RED: missing behaviour — needs the transition + the STORY-4 guard loosening.
      await resetSolo(flipEnr, solo.personalGroupId);
      const c = await asUser(solo);
      await c.rpc('complete_journey_step', { p_enrollment_id: flipEnr, p_step_id: flipSteps[0].id });
      await c.rpc('complete_journey_step', { p_enrollment_id: flipEnr, p_step_id: flipSteps[1].id });
      // Re-walk the repeatable (and re-complete the final) — no second edge is possible.
      await c.rpc('complete_journey_step', { p_enrollment_id: flipEnr, p_step_id: flipSteps[2].id });
      await c.rpc('complete_journey_step', { p_enrollment_id: flipEnr, p_step_id: flipSteps[1].id });
      const notifs = await completionNotifs(solo.personalGroupId, flipEnr);
      expect(notifs.length).toBe(1);
    });

    it('cascades the row away when the traveller personal group is erased (ADR-U031)', async () => {
      // RED: missing behaviour — the cascade proof only matters once the edge inserts
      // the row (recipient_group_id -> groups ON DELETE CASCADE is the substrate).
      const c = await asUser(eraser);
      await c.rpc('complete_journey_step', { p_enrollment_id: eraseEnr, p_step_id: eraseSteps[0].id });
      const before = await completionNotifs(eraser.personalGroupId, eraseEnr);
      expect(before.length).toBe(1);

      // Labelled adaptation (gate PR #134, post-apply): a bare group-delete cannot
      // simulate erasure — consent_records.subject_group_id is ON DELETE RESTRICT and
      // the rows are append-only (enforce_consent_append_only, 42501) outside the
      // controlled path. So prove the cascade under the REAL ADR-U031 path:
      // erase_fim_account (DeusEx-called; anonymises consent, then hard-deletes with
      // cascades) — the personal group goes, and recipient_group_id -> groups
      // ON DELETE CASCADE must take the notification row with it.
      const deusex = await createTestUser({ displayName: 'JC Erasure Admin' });
      try {
        await makePlatformAdmin(deusex.personalGroupId);
        const adminCaller = createTestClient();
        await signInWithRetry(adminCaller, deusex.email, deusex.password);
        const { data: profile } = await admin
          .from('users').select('id').eq('auth_user_id', eraser.user.id).single();
        const { error: eraseErr } = await adminCaller.rpc('erase_fim_account', {
          p_user_id: profile!.id,
        });
        expect(eraseErr).toBeNull();
      } finally {
        await demotePlatformAdmin(deusex.personalGroupId);
        await cleanupTestUser(deusex.user.id).catch(() => undefined);
      }
      const after = await completionNotifs(eraser.personalGroupId, eraseEnr);
      expect(after.length).toBe(0);
    });
  });

  // ==========================================================================
  // STORY-4 — The walk survives the milestone (labelled J-B delta)
  // ==========================================================================
  describe('STORY-4 — enter/complete survive `completed`; other states still refuse', () => {
    it('admits enter_journey_step on a completed enrolment', async () => {
      // INTENDED-RED against J-B guard (FEAT-PD004 STORY-4): today the `= active`
      // guard raises P0001; the loosening admits `completed`.
      const c = await asUser(solo);
      const { error } = await c.rpc('enter_journey_step', {
        p_enrollment_id: guardCompletedEnr,
        p_step_id: guardSteps[1].id, // an optional tail step
      });
      expect(error).toBeNull();
    });

    it('admits complete_journey_step on a completed enrolment (repeatable re-walk)', async () => {
      // INTENDED-RED against J-B guard (FEAT-PD004 STORY-4).
      const c = await asUser(solo);
      const { error } = await c.rpc('complete_journey_step', {
        p_enrollment_id: guardCompletedEnr,
        p_step_id: guardSteps[2].id, // repeatable; required predecessor pre-passed in beforeAll
      });
      expect(error).toBeNull();
    });

    it('still refuses a withdrawn enrolment with P0001', async () => {
      // GREEN: pins unchanged behaviour — the loosening admits `completed` ONLY.
      const c = await asUser(solo);
      const { error: enterErr } = await c.rpc('enter_journey_step', {
        p_enrollment_id: withdrawnEnr,
        p_step_id: withdrawnSteps[0].id,
      });
      expect(enterErr).not.toBeNull();
      expect(enterErr!.code).toBe('P0001');
      const { error: compErr } = await c.rpc('complete_journey_step', {
        p_enrollment_id: withdrawnEnr,
        p_step_id: withdrawnSteps[0].id,
      });
      expect(compErr!.code).toBe('P0001');
    });

    it('still refuses a frozen enrolment with P0001', async () => {
      // GREEN: pins unchanged behaviour.
      const c = await asUser(solo);
      const { error: enterErr } = await c.rpc('enter_journey_step', {
        p_enrollment_id: frozenEnr,
        p_step_id: frozenSteps[0].id,
      });
      expect(enterErr!.code).toBe('P0001');
      const { error: compErr } = await c.rpc('complete_journey_step', {
        p_enrollment_id: frozenEnr,
        p_step_id: frozenSteps[0].id,
      });
      expect(compErr!.code).toBe('P0001');
    });

    it('still refuses a paused enrolment with P0001', async () => {
      // GREEN: pins unchanged behaviour.
      const c = await asUser(solo);
      const { error: enterErr } = await c.rpc('enter_journey_step', {
        p_enrollment_id: pausedEnr,
        p_step_id: pausedSteps[0].id,
      });
      expect(enterErr!.code).toBe('P0001');
      const { error: compErr } = await c.rpc('complete_journey_step', {
        p_enrollment_id: pausedEnr,
        p_step_id: pausedSteps[0].id,
      });
      expect(compErr!.code).toBe('P0001');
    });
  });

  // ==========================================================================
  // STORY-5 — Time-on-step and total elapsed, honestly accounted (JRN-11)
  // ==========================================================================
  describe('STORY-5 — timing derivation (completed engagements only)', () => {
    // Fabricate deterministic durations rather than sleeping: two completed
    // engagements on the repeatable step (20s + 30s = 50s) plus an open one
    // (excluded), and an open-only engagement on the optional step (0s). The
    // required step 2 is deliberately left incomplete → wall_clock.completed_at
    // stays null (mid-walk).
    beforeAll(async () => {
      const rep1 = timingSteps[0].id;
      const opt3 = timingSteps[2].id;
      await admin.from('journey_step_instances').delete().eq('enrollment_id', timingEnr);

      const c = await asUser(solo);
      // Two completed engagements on the repeatable step.
      await c.rpc('enter_journey_step', { p_enrollment_id: timingEnr, p_step_id: rep1 });
      await c.rpc('complete_journey_step', { p_enrollment_id: timingEnr, p_step_id: rep1 });
      await c.rpc('enter_journey_step', { p_enrollment_id: timingEnr, p_step_id: rep1 });
      await c.rpc('complete_journey_step', { p_enrollment_id: timingEnr, p_step_id: rep1 });
      // One open engagement on the repeatable step (must NOT accrue).
      await c.rpc('enter_journey_step', { p_enrollment_id: timingEnr, p_step_id: rep1 });
      // One open-only engagement on the optional step (0s accrued).
      await c.rpc('enter_journey_step', { p_enrollment_id: timingEnr, p_step_id: opt3 });

      // Overwrite the two completed engagements' timestamps to exact durations.
      const { data: done } = await admin
        .from('journey_step_instances')
        .select('id, created_at, completed_at')
        .eq('enrollment_id', timingEnr)
        .eq('step_id', rep1)
        .not('completed_at', 'is', null)
        .order('created_at', { ascending: true });
      const rows = (done ?? []) as Array<{ id: string }>;
      const base = Date.now() - 3_600_000;
      if (rows[0]) {
        await admin
          .from('journey_step_instances')
          .update({ created_at: new Date(base).toISOString(), completed_at: new Date(base + 20_000).toISOString() })
          .eq('id', rows[0].id);
      }
      if (rows[1]) {
        await admin
          .from('journey_step_instances')
          .update({
            created_at: new Date(base + 300_000).toISOString(),
            completed_at: new Date(base + 300_000 + 30_000).toISOString(),
          })
          .eq('id', rows[1].id);
      }
    }, 120000);

    it('sums a step to its completed engagements only (open excluded), in seconds', async () => {
      // RED: missing payload key — the `timing` block does not exist yet.
      const c = await asUser(solo);
      const { data, error } = await c.rpc('get_player_state', { p_enrollment_id: timingEnr });
      expect(error).toBeNull();
      const timing = (data as Record<string, unknown>).timing as Record<string, unknown> | undefined;
      expect(timing).toBeDefined();
      const perStep = timing!.per_step as Array<{ step_id: string; seconds: number }>;
      const rep1Entry = perStep.find((e) => e.step_id === timingSteps[0].id);
      expect(rep1Entry).toBeDefined();
      expect(Number(rep1Entry!.seconds)).toBe(50); // 20s + 30s; the open engagement contributes nothing
    });

    it('totals to the sum of per-step and carries a distinct wall-clock span', async () => {
      // RED: missing payload key.
      const c = await asUser(solo);
      const { data, error } = await c.rpc('get_player_state', { p_enrollment_id: timingEnr });
      expect(error).toBeNull();
      const timing = (data as Record<string, unknown>).timing as Record<string, unknown> | undefined;
      expect(timing).toBeDefined();
      const perStep = timing!.per_step as Array<{ seconds: number }>;
      const sumPerStep = perStep.reduce((acc, e) => acc + Number(e.seconds), 0);
      expect(Number(timing!.total_seconds)).toBe(sumPerStep);
      expect(Number(timing!.total_seconds)).toBe(50); // only the repeatable accrued; the open ones did not

      const wall = timing!.wall_clock as Record<string, unknown>;
      const enr = await readEnrollment(timingEnr);
      expect(epochMs(wall.enrolled_at)).toBe(epochMs(enr.enrolled_at));
      expect(wall.completed_at).toBeNull(); // mid-walk — required step 2 untouched
    });

    it('keeps accruing a repeatable step re-done after journey completion', async () => {
      // INTENDED-RED against J-B guard (FEAT-PD004 STORY-4/5): completing a
      // repeatable on a completed enrolment is P0001 today; once admitted, the
      // later engagement joins per-step/total time (lived history).
      const c = await asUser(solo);
      const { error } = await c.rpc('complete_journey_step', {
        p_enrollment_id: guardCompletedEnr,
        p_step_id: guardSteps[2].id, // repeatable
      });
      expect(error).toBeNull();
      const { data } = await c.rpc('get_player_state', { p_enrollment_id: guardCompletedEnr });
      const timing = (data as Record<string, unknown>).timing as Record<string, unknown> | undefined;
      expect(timing).toBeDefined();
      const perStep = timing!.per_step as Array<{ step_id: string }>;
      expect(perStep.some((e) => e.step_id === guardSteps[2].id)).toBe(true);
    });
  });

  // ==========================================================================
  // STORY-6 — The payloads carry the milestone without a refetch
  // ==========================================================================
  describe('STORY-6 — additive payload posture, pre-existing keys pinned', () => {
    it('reports journey_completed true only on the edge call, false otherwise', async () => {
      // RED: missing payload key — complete_journey_step gains a transition flag.
      await resetSolo(flipEnr, solo.personalGroupId);
      const c = await asUser(solo);
      const { data: r1 } = await c.rpc('complete_journey_step', {
        p_enrollment_id: flipEnr,
        p_step_id: flipSteps[0].id, // not the final required step
      });
      expect((r1 as Record<string, unknown>).journey_completed).toBe(false);
      const { data: r2 } = await c.rpc('complete_journey_step', {
        p_enrollment_id: flipEnr,
        p_step_id: flipSteps[1].id, // the final required step → the edge
      });
      expect((r2 as Record<string, unknown>).journey_completed).toBe(true);
      const { data: r3 } = await c.rpc('complete_journey_step', {
        p_enrollment_id: flipEnr,
        p_step_id: flipSteps[2].id, // a repeatable re-walk after completion → not an edge
      });
      expect((r3 as Record<string, unknown>).journey_completed).toBe(false);
    });

    it('keeps every pre-existing get_player_state key byte-shape-unchanged', async () => {
      // GREEN: pins unchanged behaviour — the J-B contract's key set must survive additively.
      await resetSolo(flipEnr, solo.personalGroupId);
      const c = await asUser(solo);
      await c.rpc('enter_journey_step', { p_enrollment_id: flipEnr, p_step_id: flipSteps[0].id });
      const { data, error } = await c.rpc('get_player_state', { p_enrollment_id: flipEnr });
      expect(error).toBeNull();
      const d = data as Record<string, unknown>;
      for (const key of ['enrollment_id', 'status', 'sequencing_mode', 'journey', 'steps', 'instances', 'resume_step_id']) {
        expect(d).toHaveProperty(key);
      }
      // ADAPTED at J-F (FEAT-PD007, labelled): the four PD007 keys (journey.takeaway,
      // steps[].captures_response, instances[].response/response_updated_at) join
      // additively — every J-B/J-C key itself stays byte-shape-unchanged, which is
      // what this test pins.
      const journey = d.journey as Record<string, unknown>;
      expect(Object.keys(journey).sort()).toEqual(['description', 'id', 'takeaway', 'title']);
      const steps = d.steps as Array<Record<string, unknown>>;
      for (const s of steps) {
        expect(Object.keys(s).sort()).toEqual(
          ['ask_verb', 'captures_response', 'content', 'duration_minutes', 'family', 'id', 'kind', 'repeatable', 'required', 'step_order', 'title'],
        );
      }
      const instances = d.instances as Array<Record<string, unknown>>;
      expect(instances.length).toBeGreaterThan(0);
      for (const i of instances) {
        expect(Object.keys(i).sort()).toEqual([
          'completed_at', 'created_at', 'instance_id', 'response', 'response_updated_at', 'step_id',
        ]);
      }
    });

    it('adds completion + timing blocks to get_player_state', async () => {
      // RED: missing payload key — both additive blocks are absent today.
      const c = await asUser(solo);
      const { data, error } = await c.rpc('get_player_state', { p_enrollment_id: flipEnr });
      expect(error).toBeNull();
      const d = data as Record<string, unknown>;
      expect(d.completion).toBeDefined();
      expect(d.timing).toBeDefined();
    });

    it('conceals existence with P0002 for an actor without standing', async () => {
      // GREEN: pins unchanged behaviour — no standing still means no existence leak.
      const c = await asUser(outsider);
      const { error } = await c.rpc('get_player_state', { p_enrollment_id: flipEnr });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0002');
    });
  });
});
