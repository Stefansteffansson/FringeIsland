import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  withAnonRateLimitRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-PD006 (Journeys Cycle J-E) — onboarding designation, the Mist-scoped
 * enrolment gate, and first-arrival contracts (ADR-U045 + Amendment 1).
 *
 * Red-first:
 *  - STORY-1/5: `is_onboarding_designated` + `journeys.takeaway` columns and
 *    the seeded designated onboarding journey are ABSENT — every lookup of the
 *    designated journey fails (42703 column-absent pre-migration).
 *  - STORY-2: a Mist enrolling in the designated onboarding journey currently
 *    gets 42501 (the FIM-only guard); a FIM enrolling in it currently gets
 *    P0002 (is_public=false and no visibility disjunct admits the front door).
 *  - STORY-3: `get_onboarding_status()` is absent (PGRST202).
 *
 * Labelled honestly (green in the red run — pins, not TDD):
 *  - "a Mist on a NON-onboarding journey is refused" pins the FIM-only gate
 *    that already exists (the PD002 semantics PD006 must NOT loosen).
 *  - "a FIM on an ordinary journey enrols exactly as before" pins the
 *    no-regression criterion.
 *  - The direct-INSERT refusal on journey_enrollments pins the PD002
 *    ADR-U038 write-narrowing.
 *
 * Proofs over existing machinery (STORY-4 carry-over, STORY-6 ephemerality):
 *  expected green once the substrate exists — they prove `finalise_transcendence`
 *  continuity and the ADR-U031 explicit-erase cascade over the NEW onboarding
 *  path; labelled proofs, not red-first TDD.
 *
 * Mist sessions are left to the ADR-U033 reaper (house practice — no manual
 * anon teardown at integration tier).
 */
describe('FEAT-PD006 — onboarding designation & first-arrival contracts (J-E)', () => {
  const admin = createAdminClient();
  let fimA: TestUser; // enrols in onboarding (STORY-2 FIM path; catalogue nuance)
  let fimB: TestUser; // never enrols (STORY-3 never-arrived reads; catalogue exclusion)
  let fimC: TestUser; // enrolment-status shapes (withdrawn / completed reads)
  let suspended: TestUser; // is_active=false → actorless session (STORY-3)
  let jOther: string; // ordinary published+public journey (the non-onboarding subject)

  const createdUserIds: string[] = [];
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

  /** Resolve THE designated onboarding journey — red until the seed lands. */
  const getOnboarding = async () => {
    const { data, error } = await admin
      .from('journeys')
      .select('*')
      .eq('is_onboarding_designated', true);
    expect(error).toBeNull(); // 42703 pre-migration (column absent)
    expect(data).toHaveLength(1); // exactly one designated journey (the seed)
    return data![0] as Record<string, unknown> & { id: string };
  };

  beforeAll(async () => {
    fimA = await createTestUser({ displayName: 'PD006 FIM A' });
    fimB = await createTestUser({ displayName: 'PD006 FIM B' });
    fimC = await createTestUser({ displayName: 'PD006 FIM C' });
    suspended = await createTestUser({ displayName: 'PD006 Suspended' });
    createdUserIds.push(fimA.user.id, fimB.user.id, fimC.user.id, suspended.user.id);
    // Suspend by auth uid — users.id is the substrate key, not the auth id.
    const { data: suspendedRows, error: suspendErr } = await admin
      .from('users')
      .update({ is_active: false })
      .eq('auth_user_id', suspended.user.id)
      .select('id');
    if (suspendErr || !suspendedRows?.length) {
      throw new Error(`suspend fixture failed: ${suspendErr?.message ?? 'no row matched'}`);
    }

    const { data, error } = await admin
      .from('journeys')
      .insert({
        title: 'PD006 ordinary journey',
        description: 'Non-onboarding fixture — the Mist gate must hold here',
        created_by_group_id: fimA.personalGroupId,
        is_published: true,
        is_public: true,
        journey_type: 'predefined',
        content: null,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) throw new Error(`jOther seed: ${error.message}`);
    jOther = data!.id as string;
    createdJourneyIds.push(jOther);
  }, 60000);

  afterAll(async () => {
    if (createdJourneyIds.length) {
      await admin.from('journey_enrollments').delete().in('journey_id', createdJourneyIds);
      await admin.from('journey_steps').delete().in('journey_id', createdJourneyIds);
      for (const id of createdJourneyIds) {
        await admin.from('journeys').delete().eq('id', id);
      }
    }
    for (const id of createdUserIds) {
      await cleanupTestUser(id);
    }
  }, 60000);

  // ---------------------------------------------------------------------------
  // STORY-1 — designate exactly one onboarding journey
  // ---------------------------------------------------------------------------

  describe('STORY-1 — designation as data, single at the substrate', () => {
    it('journeys carries is_onboarding_designated and takeaway (schema)', async () => {
      const { error } = await admin
        .from('journeys')
        .select('id, is_onboarding_designated, takeaway')
        .limit(1);
      expect(error).toBeNull();
    });

    it('a second designation is refused by the partial unique index (23505)', async () => {
      await getOnboarding(); // one already designated (the seed)
      const { error } = await admin
        .from('journeys')
        .update({ is_onboarding_designated: true })
        .eq('id', jOther);
      expect(error).not.toBeNull();
      expect(error!.code).toBe('23505'); // the index IS the rule — no app code
    });

    it('no journey designated → onboarding_journey_id null, no error (defensive)', async () => {
      const ob = await getOnboarding();
      try {
        await admin.from('journeys').update({ is_onboarding_designated: false }).eq('id', ob.id);
        const c = await asUser(fimB);
        const { data, error } = await c.rpc('get_onboarding_status');
        expect(error).toBeNull();
        expect(data.onboarding_journey_id).toBeNull();
        expect(data.has_enrollment).toBe(false);
        expect(data.has_completed).toBe(false);
      } finally {
        await admin.from('journeys').update({ is_onboarding_designated: true }).eq('id', ob.id);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // STORY-2 — a Mist enrols in, and only in, the designated onboarding journey
  // ---------------------------------------------------------------------------

  describe('STORY-2 — the Mist-scoped enrolment gate', () => {
    it('a Mist enrols in the designated onboarding journey (no owning-group permission needed)', async () => {
      const ob = await getOnboarding();
      const c = await asMist();
      const me = await mistIdentity(c);
      expect(me.is_temporary).toBe(true);

      const { data, error } = await c.rpc('enroll_self_in_journey', { p_journey_id: ob.id });
      expect(error).toBeNull();
      expect(data.enrollment_id).toBeTruthy();
      expect(data.status).toBe('active');
      expect(data.group_id).toBe(me.personal_group_id); // party = the personal group

      const { data: row } = await admin
        .from('journey_enrollments')
        .select('group_id, status')
        .eq('id', data.enrollment_id)
        .single();
      expect(row!.group_id).toBe(me.personal_group_id);
      expect(row!.status).toBe('active');
    });

    it('a Mist on any non-onboarding journey stays refused (42501) — pin, the gate holds everywhere else', async () => {
      const c = await asMist();
      const { error } = await c.rpc('enroll_self_in_journey', { p_journey_id: jOther });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');
    });

    it('a FIM enrols in the onboarding journey through both gates (the front door admits everyone)', async () => {
      const ob = await getOnboarding();
      const c = await asUser(fimA);
      const { data, error } = await c.rpc('enroll_self_in_journey', { p_journey_id: ob.id });
      expect(error).toBeNull();
      expect(data.status).toBe('active');
      expect(data.group_id).toBe(fimA.personalGroupId);
    });

    it('a FIM on an ordinary journey enrols exactly as before — pin, no regression', async () => {
      const c = await asUser(fimC);
      const { data, error } = await c.rpc('enroll_self_in_journey', { p_journey_id: jOther });
      expect(error).toBeNull();
      expect(data.status).toBe('active');
    });

    it('direct INSERT into journey_enrollments stays refused — pin, ADR-U038 narrowing', async () => {
      const ob = await getOnboarding();
      const c = await asMist();
      const me = await mistIdentity(c);
      const { error } = await c.from('journey_enrollments').insert({
        journey_id: ob.id,
        group_id: me.personal_group_id,
        enrolled_by_group_id: me.personal_group_id,
        status: 'active',
      });
      expect(error).not.toBeNull();
    });

    it('a direct UPDATE cannot set is_onboarding_designated (designation exists only via seed/migration)', async () => {
      const c = await asUser(fimC);
      await c.from('journeys').update({ is_onboarding_designated: true }).eq('id', jOther);
      // RLS carries no UPDATE policy on journeys — the write must not land,
      // whether PostgREST reports an error or a zero-row no-op.
      const { data } = await admin
        .from('journeys')
        .select('is_onboarding_designated')
        .eq('id', jOther)
        .single();
      expect(data!.is_onboarding_designated).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // STORY-3 — the first-arrival read
  // ---------------------------------------------------------------------------

  describe('STORY-3 — get_onboarding_status()', () => {
    it('a never-arrived FIM reads {id, false, false}', async () => {
      const ob = await getOnboarding();
      const c = await asUser(fimB);
      const { data, error } = await c.rpc('get_onboarding_status');
      expect(error).toBeNull();
      expect(data.onboarding_journey_id).toBe(ob.id);
      expect(data.has_enrollment).toBe(false);
      expect(data.has_completed).toBe(false);
    });

    it('any enrolment — active, withdrawn, or completed — reads has_enrollment=true', async () => {
      const ob = await getOnboarding();
      const c = await asUser(fimC);
      const { data: enr, error: enrErr } = await c.rpc('enroll_self_in_journey', {
        p_journey_id: ob.id,
      });
      expect(enrErr).toBeNull();

      // active
      let status = (await c.rpc('get_onboarding_status')).data;
      expect(status.has_enrollment).toBe(true);
      expect(status.has_completed).toBe(false);

      // withdrawn still counts — arrival is recorded regardless of later status
      await admin
        .from('journey_enrollments')
        .update({ status: 'withdrawn' })
        .eq('id', enr.enrollment_id);
      status = (await c.rpc('get_onboarding_status')).data;
      expect(status.has_enrollment).toBe(true);
      expect(status.has_completed).toBe(false);

      // completed flips has_completed
      await admin
        .from('journey_enrollments')
        .update({ status: 'completed' })
        .eq('id', enr.enrollment_id);
      status = (await c.rpc('get_onboarding_status')).data;
      expect(status.has_enrollment).toBe(true);
      expect(status.has_completed).toBe(true);
    });

    it('a Mist can call it (first arrival is a Mist moment)', async () => {
      const ob = await getOnboarding();
      const c = await asMist();
      const { data, error } = await c.rpc('get_onboarding_status');
      expect(error).toBeNull();
      expect(data.onboarding_journey_id).toBe(ob.id);
      expect(data.has_enrollment).toBe(false);

      const { error: enrErr } = await c.rpc('enroll_self_in_journey', { p_journey_id: ob.id });
      expect(enrErr).toBeNull();
      const after = (await c.rpc('get_onboarding_status')).data;
      expect(after.has_enrollment).toBe(true);
    });

    it('an actorless session is refused 42501, never a silent empty', async () => {
      const c = await asUser(suspended); // is_active=false → no resolvable actor
      const { error } = await c.rpc('get_onboarding_status');
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');
    });
  });

  // ---------------------------------------------------------------------------
  // STORY-4 — enrolment and progress carry across transcendence (JRN-5, proof)
  // ---------------------------------------------------------------------------

  describe('STORY-4 — carry-over across transcendence (proof over finalise_transcendence)', () => {
    it('the same enrolment, instances, and resume pointer survive Mist→FIM', async () => {
      const ob = await getOnboarding();
      const c = await asMist();
      const me = await mistIdentity(c);

      const { data: enr, error: enrErr } = await c.rpc('enroll_self_in_journey', {
        p_journey_id: ob.id,
      });
      expect(enrErr).toBeNull();

      // Walk one step so there is progress to carry.
      const { data: playerBefore, error: pbErr } = await c.rpc('get_player_state', {
        p_enrollment_id: enr.enrollment_id,
      });
      expect(pbErr).toBeNull();
      const firstStepId = playerBefore.steps[0].id as string;
      const { error: doneErr } = await c.rpc('complete_journey_step', {
        p_enrollment_id: enr.enrollment_id,
        p_step_id: firstStepId,
      });
      expect(doneErr).toBeNull();
      const resumeBefore = (
        await c.rpc('get_player_state', { p_enrollment_id: enr.enrollment_id })
      ).data.resume;

      // Transcend in place (the substrate contract — same personal group).
      const { data: fin, error: finErr } = await c.rpc('finalise_transcendence', {
        p_policy_version: 'v1',
        p_capture_context: { surface: 'hub', flow: 'pd006-carry-over-test' },
      });
      expect(finErr).toBeNull();
      expect(fin.transcended).toBe(true);

      // Continuity: same row, same party, is_temporary flipped.
      const { data: userAfter } = await admin
        .from('users')
        .select('is_temporary, personal_group_id')
        .eq('id', me.id)
        .single();
      expect(userAfter!.is_temporary).toBe(false);
      expect(userAfter!.personal_group_id).toBe(me.personal_group_id);

      const { data: enrollments } = await admin
        .from('journey_enrollments')
        .select('id, status')
        .eq('journey_id', ob.id)
        .eq('group_id', me.personal_group_id);
      expect(enrollments).toHaveLength(1); // no new row, no restart
      expect(enrollments![0].id).toBe(enr.enrollment_id);
      expect(enrollments![0].status).toBe('active');

      // The now-FIM resumes at the same position (JRN-5).
      const { data: playerAfter, error: paErr } = await c.rpc('get_player_state', {
        p_enrollment_id: enr.enrollment_id,
      });
      expect(paErr).toBeNull();
      expect(playerAfter.resume).toEqual(resumeBefore);
      const completedInstances = (
        playerAfter.instances as Array<{ step_id: string; completed_at: string | null }>
      ).filter((i) => i.completed_at !== null);
      expect(completedInstances.map((i) => i.step_id)).toContain(firstStepId);

      // The carried account is a FIM now — clean it up like one (auth uid,
      // the key cleanupTestUser expects).
      const { data: authUser } = await c.auth.getUser();
      if (authUser.user) createdUserIds.push(authUser.user.id);
    }, 60000);
  });

  // ---------------------------------------------------------------------------
  // STORY-5 — the seeded placeholder onboarding journey
  // ---------------------------------------------------------------------------

  describe('STORY-5 — the seeded placeholder (ADR-U044 native + ADR-U046 takeaway)', () => {
    it('is predefined, published, not public, designated, with ordered native steps (welcome first)', async () => {
      const ob = await getOnboarding();
      expect(ob.journey_type).toBe('predefined');
      expect(ob.is_published).toBe(true);
      expect(ob.is_public).toBe(false);
      expect(ob.content).toBeNull(); // native rows, not legacy content.steps[]

      const { data: steps, error } = await admin
        .from('journey_steps')
        .select('step_order, title, step_kind_key, content_family_key, content, legacy_step_id')
        .eq('journey_id', ob.id)
        .order('step_order');
      expect(error).toBeNull();
      expect(steps!.length).toBeGreaterThanOrEqual(3);
      expect(steps![0].title).toMatch(/welcome/i);
      expect(steps![0].step_kind_key).toBe('narrative');
      for (const s of steps!) {
        expect(s.legacy_step_id).toBeNull(); // authored native, never migrated
        expect(s.content).not.toBeNull();
      }
    });

    it('carries the ADR-U046 takeaway seed — journey-level and per-step (pending-DS-4)', async () => {
      const ob = await getOnboarding();
      expect(ob.takeaway).not.toBeNull();
      expect((ob.takeaway as { body?: string }).body).toBeTruthy();

      const { data: steps } = await admin
        .from('journey_steps')
        .select('content')
        .eq('journey_id', ob.id);
      const withTakeaway = steps!.filter(
        (s) => (s.content as { takeaway?: { body?: string } })?.takeaway?.body,
      );
      expect(withTakeaway.length).toBeGreaterThanOrEqual(1);
    });

    it('does not surface in the browse catalogue for a non-enrolled traveller', async () => {
      const ob = await getOnboarding();
      const c = await asUser(fimB); // never enrolled, no owning-group membership
      const { data, error } = await c.rpc('get_journey_catalog');
      expect(error).toBeNull();
      const ids = (data as Array<{ id: string }>).map((j) => j.id);
      expect(ids).not.toContain(ob.id);
    });

    it('does appear for an ENROLLED traveller (the existing enrolled-visibility semantics — surfaced for the gate)', async () => {
      const ob = await getOnboarding();
      const c = await asUser(fimA); // enrolled in onboarding above
      const { data, error } = await c.rpc('get_journey_catalog');
      expect(error).toBeNull();
      const ids = (data as Array<{ id: string }>).map((j) => j.id);
      expect(ids).toContain(ob.id);
    });
  });

  // ---------------------------------------------------------------------------
  // STORY-6 — a Mist's onboarding data is forgotten (ADR-U031, proof)
  // ---------------------------------------------------------------------------

  describe('STORY-6 — ephemerality (proof over the house erasure path)', () => {
    it('explicit_erase_mist removes the enrolment and its step-instances, cascading cleanly', async () => {
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
      const { error: doneErr } = await c.rpc('complete_journey_step', {
        p_enrollment_id: enr.enrollment_id,
        p_step_id: player.steps[0].id,
      });
      expect(doneErr).toBeNull();

      // The house erasure function — never a bare-delete simulation (J-C rule).
      const { error: eraseErr } = await c.rpc('explicit_erase_mist');
      expect(eraseErr).toBeNull();

      const { data: enrAfter } = await admin
        .from('journey_enrollments')
        .select('id')
        .eq('id', enr.enrollment_id);
      expect(enrAfter).toHaveLength(0);
      const { data: instAfter } = await admin
        .from('journey_step_instances')
        .select('id')
        .eq('enrollment_id', enr.enrollment_id);
      expect(instAfter).toHaveLength(0);
      const { data: userAfter } = await admin.from('users').select('id').eq('id', me.id);
      expect(userAfter).toHaveLength(0);
    }, 60000);
  });
});
