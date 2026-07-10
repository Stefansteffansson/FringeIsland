import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  withAnonRateLimitRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

const GHOST = '00000000-0000-0000-0000-00000000dead';

/**
 * FEAT-PD002 (Journeys Cycle J-A) — journey catalogue & enrolment contracts.
 *
 * Red-first:
 *  - All six contracts (get_journey_catalog, get_journey_detail,
 *    enroll_self_in_journey, enroll_group_in_journey, withdraw_from_journey,
 *    get_my_enrollments) + get_group_enrollment_summary fail PGRST202
 *    (function absent) until the J-A migration lands.
 *  - STORY-7's direct INSERT/UPDATE refusals are red against the LEGACY
 *    policies (enrollment_insert_individual/group, enrollment_update_own/group
 *    still permit what the narrowing forbids) — genuine reds, red for the
 *    right reason.
 *
 * Labelled honestly (not red-first — the two greens in the red run, accounted):
 *  - The Mist direct-INSERT probe verifies EXISTING substrate (the legacy
 *    WITH CHECK already refuses a foreign group_id) — "verified, not assumed".
 *  - The reads-stay-RLS-scoped probe is a regression guard: green against the
 *    legacy SELECT policies by design, and it must STAY green after the
 *    narrowing (the migration drops write policies only).
 *
 * Oracle notes bound at authoring (recorded in the spec at build):
 *  - Open Q2 dual-enrollment: B-JRN-003's "detected" was one-directional and
 *    app-layer only (hub-legacy enroll route). The contract homes exactly that
 *    semantic substrate-side: self-enrol refuses when an active via-group
 *    enrolment exists; group-enrol does not block on a member's individual
 *    enrolment.
 *  - STORY-5 frozen posture: B-SEC-003/004 — frozen rows immutable, only the
 *    service role unfreezes; withdrawal of a frozen enrolment is refused.
 */
describe('FEAT-PD002 — journey catalogue & enrolment contracts (J-A)', () => {
  const admin = createAdminClient();
  let steward: TestUser; // creates E1, E2, E3 (Steward-template keys in each)
  let member: TestUser; // active member of E1, NO role in E1
  let traveller: TestUser; // standalone FIM, no group memberships
  let owner: TestUser; // creates OwnerG, which owns all fixture journeys
  let suspended: TestUser; // FIM with is_active=false

  let e1: string; // private engagement group (steward + member)
  let e2: string; // steward's second group (exactness fixture; later made public)
  let e3: string; // steward's group, admin-closed (non-active refusal)
  let ownerG: string; // owns the journeys

  // Journeys (admin-seeded; tracked for cleanup)
  let j1: string; // published + public, 3 steps — the main catalogue subject
  let j2: string; // published + public — my-enrolments / no-key fixtures
  let j3: string; // UNPUBLISHED — the P0002 subject
  let j4: string; // published, NOT public — owner-member visibility subject
  let j5: string; // published + public — withdraw flows
  let j6: string; // published + public — group-enrol flows

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

  // ADR-U044 §3 legacy mapping — the same conversion the FEAT-PD003 data migration
  // applied to the real seed journeys.
  const LEGACY_STEP_MAP: Record<string, { kind: string; family: string }> = {
    content: { kind: 'narrative', family: 'witness' },
    activity: { kind: 'activity', family: 'act' },
    assessment: { kind: 'assessment', family: 'reflect' },
  };

  const seedJourney = async (opts: {
    title: string;
    published: boolean;
    isPublic: boolean;
    steps?: Array<{ id: string; title: string; type: string; duration_minutes: number; required: boolean }>;
  }): Promise<string> => {
    const steps = opts.steps ?? [
      { id: 'step_1', title: 'Orient', type: 'content', duration_minutes: 10, required: true },
      { id: 'step_2', title: 'Try it', type: 'activity', duration_minutes: 30, required: true },
      { id: 'step_3', title: 'Reflect', type: 'assessment', duration_minutes: 20, required: false },
    ];
    const { data, error } = await admin
      .from('journeys')
      .insert({
        title: opts.title,
        description: `${opts.title} — J-A test fixture`,
        created_by_group_id: ownerG,
        is_published: opts.published,
        is_public: opts.isPublic,
        journey_type: 'predefined',
        difficulty_level: 'beginner',
        estimated_duration_minutes: 60,
        tags: ['j-a-test'],
        // FEAT-PD003: steps are journey_steps rows now — catalog/detail read rows,
        // not content->'steps'. Seed the rows directly (no legacy_step_id: authored
        // here, not migrated).
        content: null,
        published_at: opts.published ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (error) throw new Error(`seedJourney(${opts.title}): ${error.message}`);
    const journeyId = data!.id as string;
    createdJourneyIds.push(journeyId);
    const stepRows = steps.map((s, i) => ({
      journey_id: journeyId,
      step_order: i + 1,
      title: s.title,
      step_kind_key: LEGACY_STEP_MAP[s.type].kind,
      content_family_key: LEGACY_STEP_MAP[s.type].family,
      required: s.required,
      repeatable: false,
      duration_minutes: s.duration_minutes,
      content: {},
    }));
    const { error: stepErr } = await admin.from('journey_steps').insert(stepRows);
    if (stepErr) throw new Error(`seedJourney steps(${opts.title}): ${stepErr.message}`);
    return journeyId;
  };

  /** Admin-seeded enrolment (service role bypasses the narrowing by design). */
  const seedEnrollment = async (journeyId: string, groupId: string, status = 'active'): Promise<string> => {
    const { data, error } = await admin
      .from('journey_enrollments')
      .insert({
        journey_id: journeyId,
        group_id: groupId,
        enrolled_by_group_id: groupId,
        status,
      })
      .select('id')
      .single();
    if (error) throw new Error(`seedEnrollment: ${error.message}`);
    return data!.id as string;
  };

  beforeAll(async () => {
    steward = await createTestUser({ displayName: 'JA Steward' });
    member = await createTestUser({ displayName: 'JA Member' });
    traveller = await createTestUser({ displayName: 'JA Traveller' });
    owner = await createTestUser({ displayName: 'JA Owner' });
    suspended = await createTestUser({ displayName: 'JA Suspended' });
    createdUserIds.push(steward.user.id, member.user.id, traveller.user.id, owner.user.id, suspended.user.id);

    e1 = await seedGroup('JA E1 Party', [member], steward);
    e2 = await seedGroup('JA E2 Second', [], steward);
    e3 = await seedGroup('JA E3 Closed', [], steward);
    ownerG = await seedGroup('JA Journey Owners', [], owner);
    await admin.from('groups').update({ status: 'closed' }).eq('id', e3);

    j1 = await seedJourney({ title: 'JA Public Journey', published: true, isPublic: true });
    j2 = await seedJourney({ title: 'JA Second Public Journey', published: true, isPublic: true });
    j3 = await seedJourney({ title: 'JA Unpublished Journey', published: false, isPublic: true });
    j4 = await seedJourney({ title: 'JA Private Published Journey', published: true, isPublic: false });
    j5 = await seedJourney({ title: 'JA Withdraw Journey', published: true, isPublic: true });
    j6 = await seedJourney({ title: 'JA Group Enrol Journey', published: true, isPublic: true });

    // my-enrolments fixtures: traveller solo in J2; E1 (member's group) in J1.
    await seedEnrollment(j2, traveller.personalGroupId);
    await seedEnrollment(j1, e1);

    // Suspend last so the account is a real FIM first.
    await admin.from('users').update({ is_active: false }).eq('auth_user_id', suspended.user.id);
  }, 120000);

  afterAll(async () => {
    // FEAT-PD003: journeys now parent journey_steps rows — delete them before the
    // journeys to survive a RESTRICT FK (J-A creates no step-instances).
    if (createdJourneyIds.length) {
      await admin.from('journey_steps').delete().in('journey_id', createdJourneyIds);
    }
    for (const id of createdJourneyIds) {
      await admin.from('journeys').delete().eq('id', id);
    }
    for (const id of createdGroupIds.reverse()) {
      await cleanupTestGroup(id);
    }
    for (const id of createdUserIds) {
      await cleanupTestUser(id);
    }
  }, 120000);

  // ==========================================================================
  // STORY-1 — the catalogue and my enrolments, honestly
  // ==========================================================================
  describe('STORY-1 — get_journey_catalog / get_my_enrollments', () => {
    it('returns every published-visible journey with catalogue fields incl. derived step_count (FIM)', async () => {
      const c = await asUser(traveller);
      const { data, error } = await c.rpc('get_journey_catalog');
      expect(error).toBeNull();
      const rows = data as Array<Record<string, unknown>>;
      const mine = rows.find((r) => r.id === j1);
      expect(mine).toBeDefined();
      expect(mine!.title).toBe('JA Public Journey');
      expect(mine!.description).toContain('J-A test fixture');
      expect(mine!.difficulty_level).toBe('beginner');
      expect(mine!.estimated_duration_minutes).toBe(60);
      expect(mine!.tags).toEqual(['j-a-test']);
      expect(mine!.step_count).toBe(3);
    });

    it('never lists unpublished journeys, nor private-published ones to a non-owner-member', async () => {
      const c = await asUser(traveller);
      const { data, error } = await c.rpc('get_journey_catalog');
      expect(error).toBeNull();
      const ids = (data as Array<{ id: string }>).map((r) => r.id);
      expect(ids).not.toContain(j3);
      expect(ids).not.toContain(j4);
    });

    it('lists a private-published journey to an active member of the owning group (RLS mirror)', async () => {
      const c = await asUser(owner);
      const { data, error } = await c.rpc('get_journey_catalog');
      expect(error).toBeNull();
      const ids = (data as Array<{ id: string }>).map((r) => r.id);
      expect(ids).toContain(j4);
    });

    it('is readable by a Mist (published structure is shared-world state)', async () => {
      const c = await asMist();
      const { data, error } = await c.rpc('get_journey_catalog');
      expect(error).toBeNull();
      const ids = (data as Array<{ id: string }>).map((r) => r.id);
      expect(ids).toContain(j1);
    });

    it('carries no traveller counts, rankings, or comparative fields (DS-3 invariant 8)', async () => {
      const c = await asUser(traveller);
      const { data, error } = await c.rpc('get_journey_catalog');
      expect(error).toBeNull();
      for (const row of data as Array<Record<string, unknown>>) {
        for (const key of Object.keys(row)) {
          expect(key).not.toMatch(/enrollment_count|traveller|participant_count|rank|popular|completions/i);
        }
      }
    });

    it('get_my_enrollments kind-marks individual and via_group enrolments', async () => {
      const cm = await asUser(member);
      const { data: mData, error: mErr } = await cm.rpc('get_my_enrollments');
      expect(mErr).toBeNull();
      const mRows = mData as Array<Record<string, unknown>>;
      const viaGroup = mRows.find((r) => r.journey_id === j1);
      expect(viaGroup).toBeDefined();
      expect(viaGroup!.kind).toBe('via_group');
      expect(viaGroup!.group_id).toBe(e1);
      expect(viaGroup!.group_name).toBe('JA E1 Party');
      expect(viaGroup!.journey_title).toBe('JA Public Journey');
      expect(viaGroup!.status).toBe('active');

      const ct = await asUser(traveller);
      const { data: tData, error: tErr } = await ct.rpc('get_my_enrollments');
      expect(tErr).toBeNull();
      const tRows = tData as Array<Record<string, unknown>>;
      const individual = tRows.find((r) => r.journey_id === j2);
      expect(individual).toBeDefined();
      expect(individual!.kind).toBe('individual');
      expect(individual!.journey_title).toBe('JA Second Public Journey');
      expect(individual!).toHaveProperty('last_accessed_at');
    });
  });

  // ==========================================================================
  // STORY-2 — one journey in full, viewer-shaped
  // ==========================================================================
  describe('STORY-2 — get_journey_detail', () => {
    it('returns fields + steps overview (title/kind/duration — never content payloads) + the viewer block', async () => {
      const c = await asUser(traveller);
      const { data, error } = await c.rpc('get_journey_detail', { p_journey_id: j1 });
      expect(error).toBeNull();
      const d = data as Record<string, unknown>;
      expect(d.title).toBe('JA Public Journey');
      const steps = d.steps as Array<Record<string, unknown>>;
      expect(steps).toHaveLength(3);
      // kind is the registry key now — re-pointed to journey_steps per FEAT-PD003.
      expect(steps[0]).toMatchObject({ title: 'Orient', kind: 'narrative', duration_minutes: 10 });
      for (const s of steps) {
        expect(Object.keys(s).sort()).toEqual(['duration_minutes', 'kind', 'title']);
      }
      expect(d.is_enrolled_individually).toBe(false);
      expect(d.enrolled_via).toEqual([]);
      expect(d.enrollable_groups).toEqual([]);
    });

    it('enrollable_groups is exactly the active groups where the caller holds enroll_group_in_journey', async () => {
      const c = await asUser(steward);
      const { data, error } = await c.rpc('get_journey_detail', { p_journey_id: j2 });
      expect(error).toBeNull();
      const groups = (data as { enrollable_groups: Array<{ group_id: string }> }).enrollable_groups;
      const ids = groups.map((g) => g.group_id).sort();
      // E1 + E2, never the closed E3, never groups without the key.
      expect(ids).toEqual([e1, e2].sort());
    });

    it('a plain member without the key gets an empty enrollable_groups and their enrolled_via truth', async () => {
      const c = await asUser(member);
      const { data, error } = await c.rpc('get_journey_detail', { p_journey_id: j1 });
      expect(error).toBeNull();
      const d = data as Record<string, unknown>;
      expect(d.enrollable_groups).toEqual([]);
      const via = d.enrolled_via as Array<{ group_id: string }>;
      expect(via.map((g) => g.group_id)).toContain(e1);
    });

    it('unpublished and nonexistent are indistinguishable (P0002 twins)', async () => {
      const c = await asUser(traveller);
      const { error: unpubErr } = await c.rpc('get_journey_detail', { p_journey_id: j3 });
      const { error: ghostErr } = await c.rpc('get_journey_detail', { p_journey_id: GHOST });
      expect(unpubErr).not.toBeNull();
      expect(ghostErr).not.toBeNull();
      expect(unpubErr!.code).toBe('P0002');
      expect(ghostErr!.code).toBe(unpubErr!.code);
      expect(ghostErr!.message).toBe(unpubErr!.message);
    });

    it('private-published: P0002 for a non-member, readable for an owner-group member', async () => {
      const ct = await asUser(traveller);
      const { error: privErr } = await ct.rpc('get_journey_detail', { p_journey_id: j4 });
      expect(privErr).not.toBeNull();
      expect(privErr!.code).toBe('P0002');

      const co = await asUser(owner);
      const { data, error } = await co.rpc('get_journey_detail', { p_journey_id: j4 });
      expect(error).toBeNull();
      expect((data as { title: string }).title).toBe('JA Private Published Journey');
    });

    // J-A build finding (gate-amended): STORY-5's "affordance per the payload,
    // never client-guessed" requires the viewer block to carry the withdraw
    // handles — individual_enrollment {enrollment_id, status} and, per
    // enrolled_via entry, enrollment_id/status/can_withdraw (the
    // unenroll_from_journey key resolved platform-side). Red against the
    // pre-amendment payload.
    it('carries the caller-own enrolment handle (individual_enrollment) when enrolled', async () => {
      const c = await asUser(traveller);
      const { data, error } = await c.rpc('get_journey_detail', { p_journey_id: j2 });
      expect(error).toBeNull();
      const d = data as Record<string, unknown>;
      expect(d.is_enrolled_individually).toBe(true);
      const own = d.individual_enrollment as { enrollment_id: string; status: string };
      expect(own).toBeTruthy();
      expect(typeof own.enrollment_id).toBe('string');
      expect(own.status).toBe('active');
    });

    it('carries per-enrolled_via withdraw handles with platform-resolved can_withdraw', async () => {
      const cm = await asUser(member);
      const { data: mData, error: mErr } = await cm.rpc('get_journey_detail', { p_journey_id: j1 });
      expect(mErr).toBeNull();
      const mVia = (mData as { enrolled_via: Array<Record<string, unknown>> }).enrolled_via;
      const mEntry = mVia.find((v) => v.group_id === e1)!;
      expect(mEntry).toBeDefined();
      expect(typeof mEntry.enrollment_id).toBe('string');
      expect(mEntry.status).toBe('active');
      expect(mEntry.can_withdraw).toBe(false); // no unenroll key in E1

      const cs = await asUser(steward);
      const { data: sData, error: sErr } = await cs.rpc('get_journey_detail', { p_journey_id: j1 });
      expect(sErr).toBeNull();
      const sVia = (sData as { enrolled_via: Array<Record<string, unknown>> }).enrolled_via;
      const sEntry = sVia.find((v) => v.group_id === e1)!;
      expect(sEntry.can_withdraw).toBe(true); // Steward template holds unenroll_from_journey
    });

    it('a Mist reads a published journey; the viewer block offers nothing', async () => {
      const c = await asMist();
      const { data, error } = await c.rpc('get_journey_detail', { p_journey_id: j1 });
      expect(error).toBeNull();
      const d = data as Record<string, unknown>;
      expect(d.is_enrolled_individually).toBe(false);
      expect(d.enrollable_groups).toEqual([]);
    });
  });

  // ==========================================================================
  // STORY-3 — enrol myself (personal group as party, ADR-U020)
  // ==========================================================================
  describe('STORY-3 — enroll_self_in_journey', () => {
    it('creates the personal-group enrolment with status active and initial progress_data', async () => {
      const c = await asUser(traveller);
      const { data, error } = await c.rpc('enroll_self_in_journey', { p_journey_id: j1 });
      expect(error).toBeNull();
      const d = data as Record<string, unknown>;
      expect(d.journey_id).toBe(j1);
      expect(d.status).toBe('active');
      expect(d).toHaveProperty('progress_data');

      const { data: rows } = await admin
        .from('journey_enrollments')
        .select('group_id, enrolled_by_group_id, status')
        .eq('journey_id', j1)
        .eq('group_id', traveller.personalGroupId);
      expect(rows).toHaveLength(1);
      expect(rows![0].enrolled_by_group_id).toBe(traveller.personalGroupId);
      expect(rows![0].status).toBe('active');
    });

    it('refuses a duplicate individual enrolment; no second row exists', async () => {
      const c = await asUser(traveller);
      const { error } = await c.rpc('enroll_self_in_journey', { p_journey_id: j1 });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      const { data: rows } = await admin
        .from('journey_enrollments')
        .select('id')
        .eq('journey_id', j1)
        .eq('group_id', traveller.personalGroupId);
      expect(rows).toHaveLength(1);
    });

    it('refuses an already-via-group-enrolled caller (oracle B-JRN-003, one-directional)', async () => {
      // member's E1 is enrolled in J1 (fixture) — self-enrol into J1 is refused.
      const c = await asUser(member);
      const { error } = await c.rpc('enroll_self_in_journey', { p_journey_id: j1 });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      const { data: rows } = await admin
        .from('journey_enrollments')
        .select('id')
        .eq('journey_id', j1)
        .eq('group_id', member.personalGroupId);
      expect(rows).toHaveLength(0);
    });

    it('refuses a Mist on a non-onboarding journey (42501 — the ADR-U045 gate, realized at J-E: FIM-only everywhere but the designated onboarding journey)', async () => {
      const c = await asMist();
      const { error } = await c.rpc('enroll_self_in_journey', { p_journey_id: j1 });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');
    });

    it('refuses a suspended FIM (no new social footprint)', async () => {
      const c = await asUser(suspended);
      const { error } = await c.rpc('enroll_self_in_journey', { p_journey_id: j1 });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');
    });
  });

  // ==========================================================================
  // STORY-4 — enrol a group I may enrol (the wielding walk)
  // ==========================================================================
  describe('STORY-4 — enroll_group_in_journey', () => {
    it('enrols the group with provenance and notifies active members durably (not the actor)', async () => {
      const c = await asUser(steward);
      const { data, error } = await c.rpc('enroll_group_in_journey', { p_group_id: e1, p_journey_id: j6 });
      expect(error).toBeNull();
      expect((data as Record<string, unknown>).journey_id).toBe(j6);

      const { data: rows } = await admin
        .from('journey_enrollments')
        .select('group_id, enrolled_by_group_id')
        .eq('journey_id', j6)
        .eq('group_id', e1);
      expect(rows).toHaveLength(1);
      expect(rows![0].enrolled_by_group_id).toBe(steward.personalGroupId);

      // member (active in E1) has a durable notification row; the actor has none.
      const cm = await asUser(member);
      const { data: notes } = await cm
        .from('notifications')
        .select('type, recipient_group_id, group_id')
        .eq('recipient_group_id', member.personalGroupId)
        .eq('type', 'group_journey_enrollment');
      expect((notes ?? []).some((n) => n.group_id === e1)).toBe(true);

      const cs = await asUser(steward);
      const { data: stewardNotes } = await cs
        .from('notifications')
        .select('id')
        .eq('recipient_group_id', steward.personalGroupId)
        .eq('type', 'group_journey_enrollment');
      expect(stewardNotes ?? []).toHaveLength(0);
    });

    it('refuses a member without the key (42501)', async () => {
      const c = await asUser(member);
      const { error } = await c.rpc('enroll_group_in_journey', { p_group_id: e1, p_journey_id: j2 });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');
    });

    it('answers P0002 for an invisible group and a nonexistent one, indistinguishably', async () => {
      const c = await asUser(traveller);
      const { error: privErr } = await c.rpc('enroll_group_in_journey', { p_group_id: e1, p_journey_id: j2 });
      const { error: ghostErr } = await c.rpc('enroll_group_in_journey', { p_group_id: GHOST, p_journey_id: j2 });
      expect(privErr).not.toBeNull();
      expect(ghostErr).not.toBeNull();
      expect(privErr!.code).toBe('P0002');
      expect(ghostErr!.code).toBe(privErr!.code);
      expect(ghostErr!.message).toBe(privErr!.message);
    });

    it('refuses a duplicate group enrolment; one row only', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('enroll_group_in_journey', { p_group_id: e1, p_journey_id: j6 });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      const { data: rows } = await admin
        .from('journey_enrollments')
        .select('id')
        .eq('journey_id', j6)
        .eq('group_id', e1);
      expect(rows).toHaveLength(1);
    });

    it('refuses honestly when the group is not active (closed)', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('enroll_group_in_journey', { p_group_id: e3, p_journey_id: j2 });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
    });
  });

  // ==========================================================================
  // STORY-5 — withdraw through the same door
  // ==========================================================================
  describe('STORY-5 — withdraw_from_journey', () => {
    it("withdraws an own individual enrolment (Q1 revisited at J-B: terminal 'withdrawn') and my-enrolments no longer lists it", async () => {
      const c = await asUser(traveller);
      const { data: enr, error: enrErr } = await c.rpc('enroll_self_in_journey', { p_journey_id: j5 });
      expect(enrErr).toBeNull();
      const enrollmentId = (enr as { enrollment_id?: string; id?: string }).enrollment_id ?? (enr as { id: string }).id;

      const { error } = await c.rpc('withdraw_from_journey', { p_enrollment_id: enrollmentId });
      expect(error).toBeNull();

      // FEAT-PD003 Q1 revisited: withdraw is a terminal status flip, not a row
      // deletion — the row SURVIVES so its step-instances aren't cascade-destroyed.
      const { data: rows } = await admin.from('journey_enrollments').select('id, status').eq('id', enrollmentId);
      expect(rows).toHaveLength(1);
      expect((rows as Array<{ status: string }>)[0].status).toBe('withdrawn');

      // ...but a withdrawn enrolment is excluded from my-enrolments (Q1 exclusion).
      const { data: mine } = await c.rpc('get_my_enrollments');
      expect((mine as Array<{ journey_id: string }>).map((r) => r.journey_id)).not.toContain(j5);
    });

    it('group withdrawal is unenroll_from_journey-gated: member 42501, steward succeeds', async () => {
      const cs = await asUser(steward);
      const { error: geErr } = await cs.rpc('enroll_group_in_journey', { p_group_id: e1, p_journey_id: j5 });
      expect(geErr).toBeNull();
      // Pick the ACTIVE enrolment explicitly — FEAT-PD003 Q1 keeps withdrawn rows, so
      // a lingering withdrawn row from a re-run must not be selected here.
      const { data: rows } = await admin
        .from('journey_enrollments')
        .select('id')
        .eq('journey_id', j5)
        .eq('group_id', e1)
        .eq('status', 'active');
      const groupEnrollmentId = rows![0].id as string;

      const cm = await asUser(member);
      const { error: memberErr } = await cm.rpc('withdraw_from_journey', { p_enrollment_id: groupEnrollmentId });
      expect(memberErr).not.toBeNull();
      expect(memberErr!.code).toBe('42501');

      const { error: stewardErr } = await cs.rpc('withdraw_from_journey', { p_enrollment_id: groupEnrollmentId });
      expect(stewardErr).toBeNull();
      // Q1 revisited: the row survives with a terminal 'withdrawn' status.
      const { data: after } = await admin.from('journey_enrollments').select('id, status').eq('id', groupEnrollmentId);
      expect(after).toHaveLength(1);
      expect((after as Array<{ status: string }>)[0].status).toBe('withdrawn');
    });

    it('answers P0002 for an invisible enrolment and a nonexistent one, indistinguishably', async () => {
      const ownerEnrollment = await seedEnrollment(j5, owner.personalGroupId);
      const c = await asUser(traveller);
      const { error: invisErr } = await c.rpc('withdraw_from_journey', { p_enrollment_id: ownerEnrollment });
      const { error: ghostErr } = await c.rpc('withdraw_from_journey', { p_enrollment_id: GHOST });
      expect(invisErr).not.toBeNull();
      expect(ghostErr).not.toBeNull();
      expect(invisErr!.code).toBe('P0002');
      expect(ghostErr!.code).toBe(invisErr!.code);
      expect(ghostErr!.message).toBe(invisErr!.message);
      await admin.from('journey_enrollments').delete().eq('id', ownerEnrollment);
    });

    it('refuses withdrawal of a frozen enrolment (B-SEC-003/004 immutability posture)', async () => {
      const frozenId = await seedEnrollment(j6, traveller.personalGroupId, 'frozen');
      const c = await asUser(traveller);
      const { error } = await c.rpc('withdraw_from_journey', { p_enrollment_id: frozenId });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      const { data: rows } = await admin.from('journey_enrollments').select('status').eq('id', frozenId);
      expect(rows).toHaveLength(1);
      expect(rows![0].status).toBe('frozen');
      await admin.from('journey_enrollments').delete().eq('id', frozenId);
    });
  });

  // ==========================================================================
  // STORY-6 — a group's journeys at a glance (the GRP-4 seam)
  // ==========================================================================
  describe('STORY-6 — get_group_enrollment_summary', () => {
    it('returns count + entries to an active member', async () => {
      const c = await asUser(member);
      const { data, error } = await c.rpc('get_group_enrollment_summary', { p_group_id: e1 });
      expect(error).toBeNull();
      const d = data as { count: number; enrollments: Array<{ journey_id: string; title: string; status: string }> };
      const ids = d.enrollments.map((e) => e.journey_id);
      expect(ids).toContain(j1); // fixture enrolment
      expect(ids).toContain(j6); // STORY-4 enrolment
      expect(d.count).toBe(d.enrollments.length);
      const j1Entry = d.enrollments.find((e) => e.journey_id === j1)!;
      expect(j1Entry.title).toBe('JA Public Journey');
      expect(j1Entry.status).toBe('active');
    });

    it('answers P0002 for a private group to a non-member and for a nonexistent group, indistinguishably', async () => {
      const c = await asUser(traveller);
      const { error: privErr } = await c.rpc('get_group_enrollment_summary', { p_group_id: e1 });
      const { error: ghostErr } = await c.rpc('get_group_enrollment_summary', { p_group_id: GHOST });
      expect(privErr).not.toBeNull();
      expect(ghostErr).not.toBeNull();
      expect(privErr!.code).toBe('P0002');
      expect(ghostErr!.code).toBe(privErr!.code);
      expect(ghostErr!.message).toBe(privErr!.message);
    });

    it('returns the summary of a public group to a non-member (the group-detail visibility mirror)', async () => {
      await admin.from('groups').update({ is_public: true }).eq('id', e2);
      const c = await asUser(traveller);
      const { data, error } = await c.rpc('get_group_enrollment_summary', { p_group_id: e2 });
      expect(error).toBeNull();
      const d = data as { count: number; enrollments: unknown[] };
      expect(d.count).toBe(0);
      expect(d.enrollments).toEqual([]);
    });
  });

  // ==========================================================================
  // STORY-7 — no path around the contracts (ADR-U038 direct-caller)
  // ==========================================================================
  describe('STORY-7 — direct PostgREST write surface is narrowed', () => {
    it('refuses a direct individual-shape INSERT (red against the legacy enrollment_insert_individual policy)', async () => {
      const c = await asUser(traveller);
      const { error } = await c.from('journey_enrollments').insert({
        journey_id: j5,
        group_id: traveller.personalGroupId,
        enrolled_by_group_id: traveller.personalGroupId,
        status: 'active',
      });
      // Cleanup guard for the red phase (the legacy policy currently permits this).
      if (!error) {
        await admin
          .from('journey_enrollments')
          .delete()
          .eq('journey_id', j5)
          .eq('group_id', traveller.personalGroupId);
      }
      expect(error).not.toBeNull();
    });

    it('refuses a direct group-shape INSERT even from a key-holder (red against enrollment_insert_group)', async () => {
      const c = await asUser(steward);
      const { error } = await c.from('journey_enrollments').insert({
        journey_id: j5,
        group_id: e2,
        enrolled_by_group_id: steward.personalGroupId,
        status: 'active',
      });
      if (!error) {
        await admin.from('journey_enrollments').delete().eq('journey_id', j5).eq('group_id', e2);
      }
      expect(error).not.toBeNull();
    });

    it('refuses a direct status flip (red against enrollment_update_own)', async () => {
      const c = await asUser(traveller);
      const { data: before } = await admin
        .from('journey_enrollments')
        .select('id, status')
        .eq('journey_id', j2)
        .eq('group_id', traveller.personalGroupId)
        .single();
      const { data: updated, error } = await c
        .from('journey_enrollments')
        .update({ status: 'completed' })
        .eq('id', before!.id)
        .select('id');
      const flipped = !error && (updated ?? []).length > 0;
      if (flipped) {
        await admin.from('journey_enrollments').update({ status: before!.status }).eq('id', before!.id);
      }
      expect(flipped).toBe(false);
    });

    it('refuses a direct progress_data write (red against enrollment_update_own)', async () => {
      const c = await asUser(traveller);
      const { data: row } = await admin
        .from('journey_enrollments')
        .select('id, progress_data')
        .eq('journey_id', j2)
        .eq('group_id', traveller.personalGroupId)
        .single();
      const { data: updated, error } = await c
        .from('journey_enrollments')
        .update({ progress_data: { forged: true } })
        .eq('id', row!.id)
        .select('id');
      const wrote = !error && (updated ?? []).length > 0;
      if (wrote) {
        await admin.from('journey_enrollments').update({ progress_data: row!.progress_data }).eq('id', row!.id);
      }
      expect(wrote).toBe(false);
    });

    it('refuses a Mist direct INSERT (existing substrate, verified not assumed)', async () => {
      const c = await asMist();
      const { error } = await c.from('journey_enrollments').insert({
        journey_id: j1,
        group_id: GHOST,
        enrolled_by_group_id: GHOST,
        status: 'active',
      });
      expect(error).not.toBeNull();
    });

    it('leaves enrolment reads RLS-scoped (own + group-member rows still readable)', async () => {
      const c = await asUser(traveller);
      const { data, error } = await c
        .from('journey_enrollments')
        .select('id')
        .eq('group_id', traveller.personalGroupId);
      expect(error).toBeNull();
      expect((data ?? []).length).toBeGreaterThan(0);
    });
  });
});
