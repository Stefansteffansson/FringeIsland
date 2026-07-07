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

/** The six canon content families (ADR-U044 §3; FEAT-PD003 STORY-1). */
const FAMILY_KEYS = ['act', 'decide', 'encounter', 'reflect', 'rest', 'witness'];
/** The seven ADR-U008 Tier-1 step kinds seeded as registry rows (STORY-1). */
const KIND_KEYS = [
  'activity',
  'assessment',
  'checklist',
  'choice',
  'journal',
  'narrative',
  'reflection',
];

/**
 * FEAT-PD003 (Journeys Cycle J-B) — journey step substrate & per-traveller
 * progress contracts. ADR-U044 realized: steps become rows, registries seed,
 * step-instances carry the progress grain.
 *
 * RED-FIRST classification (this suite is authored BEFORE the TASK-JB-02
 * migration exists — every assertion below is red by absence today):
 *  - The four new tables (journey_steps, step_kinds, content_families,
 *    journey_step_instances) DO NOT EXIST yet → every `.from(<table>)` read/write
 *    returns a relation-absent / not-in-schema-cache error. That is red for the
 *    right reason (missing table), per the task's "fail earlier" note.
 *  - The three new contracts (get_player_state, enter_journey_step,
 *    complete_journey_step) DO NOT EXIST yet → PGRST202 (function absent). Red
 *    for the right reason.
 *  - STORY-3 (catalog/detail re-point) is red against the LEGACY contracts:
 *    get_journey_detail today emits the legacy `type` ('content'/'activity'/
 *    'assessment') as `kind`, none of which is a registry key — the assertion
 *    "kind ∈ KIND_KEYS" fails until the re-point lands.
 *  - STORY-7 withdraw is red against LEGACY withdraw (Q1 pre-amendment deletes
 *    the enrolment row; the test asserts terminal `withdrawn` status + surviving
 *    instances).
 *
 * DESIGN NOTES bound at authoring (deviations the lead folds into the gate board):
 *  - Parity-at-migration (row count == pre-migration jsonb_array_length) lives in
 *    the migration's guarded DO block, NOT here (retro-2026-07-07). This suite
 *    asserts POST-state invariants instead (STORY-2).
 *  - Count-agnostic throughout: no 47/21/5/8 literals — every count is derived
 *    from the DB at runtime. Pre-existing journeys are identified by EXCLUSION of
 *    this suite's own fixture journey ids.
 *  - Side-effects (instance create/complete) are verified by admin SELECT on
 *    journey_step_instances rather than by coupling to RPC return shapes — the
 *    grain is (enrollment_id × traveller_group_id × step_id), created_at =
 *    engagement, completed_at nullable.
 *  - Fixture journeys are created post-migration and therefore carry NO migrated
 *    steps (nothing back-fills a journey created after the data migration ran);
 *    this suite seeds their journey_steps rows explicitly via the admin client
 *    (service role bypasses the contract-only write posture, Q4). Those seeded
 *    rows carry NO legacy_step_id — only genuinely-migrated seed journeys do.
 *  - SPEC AMBIGUITIES the migration author must ratify are called out inline with
 *    `AMBIGUITY:` and summarised in the final report.
 */
describe('FEAT-PD003 — journey step substrate & progress contracts (J-B)', () => {
  const admin = createAdminClient();

  let owner: TestUser; // owns the fixture journeys (ownerG)
  let traveller: TestUser; // solo enrolments (linear / progress / withdraw / frozen)
  let member: TestUser; // active in e1; the group-traveller of jGroup
  let steward: TestUser; // enrols e1; holds enroll_group_in_journey
  let outsider: TestUser; // no standing on any enrolment (the P0002 subject)

  let ownerG: string;
  let e1: string;

  // Fixture journeys (admin-seeded with legacy content.steps[] for pre-migration
  // validity; their journey_steps rows are seeded post-migration via seedSteps).
  let jLinear: string; // catalogue / detail / player-state (solo, active)
  let jProgress: string; // enter / complete (solo, active)
  let jWithdraw: string; // withdraw-preserves-instances (solo)
  let jGroup: string; // group-member player-state (e1 enrolled)
  let jFrozen: string; // non-active player-state (solo, frozen)
  let jErase: string; // erasure-cascade proof (admin-seeded enrolment)

  // Enrolment ids (via the shipped J-A contracts, so they exist pre-migration).
  let linearEnrollmentId: string;
  let progressEnrollmentId: string;
  let frozenEnrollmentId: string;
  let groupEnrollmentId: string;

  // Seeded journey_steps rows (populated post-migration; empty pre-migration).
  type StepRow = { id: string; step_order: number; title: string };
  let linearSteps: StepRow[] = [];
  let progressSteps: StepRow[] = [];
  let groupSteps: StepRow[] = [];

  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];
  const createdJourneyIds: string[] = [];
  const adminEnrollmentIds: string[] = []; // admin-seeded enrolments to clean up

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

  /**
   * Seed a journey with NO content.steps[] — post-migration the substrate lives in
   * journey_steps rows (added by seedSteps), and catalog/detail read rows. A mixed
   * JSONB-steps + rows state is what broke the STORY-2 sweeps, so content stays null.
   */
  const seedJourney = async (title: string): Promise<string> => {
    const { data, error } = await admin
      .from('journeys')
      .insert({
        title,
        description: `${title} — J-B PD003 fixture`,
        created_by_group_id: ownerG,
        is_published: true,
        is_public: true,
        journey_type: 'predefined',
        difficulty_level: 'beginner',
        estimated_duration_minutes: 60,
        tags: ['j-b-test'],
        content: null,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) throw new Error(`seedJourney(${title}): ${error.message}`);
    createdJourneyIds.push(data!.id as string);
    return data!.id as string;
  };

  /**
   * Seed journey_steps rows for a fixture journey (admin / service role — bypasses
   * the contract-only write posture). NON-throwing: pre-migration the table is
   * absent, so this returns [] and the reds surface in the tests themselves rather
   * than aborting beforeAll. Column set is ADR-U044's beat record (per the lead's
   * design constraints). No legacy_step_id — these are test-authored, not migrated.
   */
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
    if (error) return []; // pre-migration: relation absent — red surfaces in tests
    return (data as StepRow[]) ?? [];
  };

  /** Enrol a user solo via the shipped J-A contract; returns the enrolment id. */
  const enrolSelf = async (u: TestUser, journeyId: string): Promise<string | undefined> => {
    const c = await asUser(u);
    const { data, error } = await c.rpc('enroll_self_in_journey', { p_journey_id: journeyId });
    if (error) return undefined;
    const d = data as { enrollment_id?: string; id?: string };
    return d.enrollment_id ?? d.id;
  };

  beforeAll(async () => {
    owner = await createTestUser({ displayName: 'JB Owner' });
    traveller = await createTestUser({ displayName: 'JB Traveller' });
    member = await createTestUser({ displayName: 'JB Member' });
    steward = await createTestUser({ displayName: 'JB Steward' });
    outsider = await createTestUser({ displayName: 'JB Outsider' });
    createdUserIds.push(owner.user.id, traveller.user.id, member.user.id, steward.user.id, outsider.user.id);

    ownerG = await seedGroup('JB Journey Owners', [], owner);
    e1 = await seedGroup('JB E1 Party', [member], steward);

    jLinear = await seedJourney('JB Linear Journey');
    jProgress = await seedJourney('JB Progress Journey');
    jWithdraw = await seedJourney('JB Withdraw Journey');
    jGroup = await seedJourney('JB Group Journey');
    jFrozen = await seedJourney('JB Frozen Journey');
    jErase = await seedJourney('JB Erase Journey');

    // Step rows (post-migration only; [] pre-migration). Registry keys are seeded
    // canon: narrative/witness, activity/act, reflection/reflect. jProgress's third
    // step is repeatable (STORY-5 repeat semantics).
    linearSteps = await seedSteps(jLinear, [
      { title: 'Orient', kind: 'narrative', family: 'witness', duration: 10 },
      { title: 'Practise', kind: 'activity', family: 'act', duration: 30 },
      { title: 'Reflect', kind: 'reflection', family: 'reflect', duration: 20, required: false },
    ]);
    progressSteps = await seedSteps(jProgress, [
      { title: 'Step One', kind: 'narrative', family: 'witness' },
      { title: 'Step Two', kind: 'activity', family: 'act' },
      { title: 'Step Three (repeatable)', kind: 'journal', family: 'reflect', repeatable: true },
    ]);
    groupSteps = await seedSteps(jGroup, [
      { title: 'Gather', kind: 'narrative', family: 'witness' },
      { title: 'Decide together', kind: 'choice', family: 'decide' },
    ]);
    await seedSteps(jFrozen, [
      { title: 'Frozen A', kind: 'narrative', family: 'witness' },
      { title: 'Frozen B', kind: 'activity', family: 'act' },
    ]);
    await seedSteps(jWithdraw, [{ title: 'Withdraw Step', kind: 'narrative', family: 'witness' }]);
    await seedSteps(jErase, [{ title: 'Solo', kind: 'narrative', family: 'witness' }]);

    // Enrolments through the shipped J-A contracts (exist pre-migration).
    linearEnrollmentId = (await enrolSelf(traveller, jLinear)) ?? GHOST;
    progressEnrollmentId = (await enrolSelf(traveller, jProgress)) ?? GHOST;

    // Group enrolment (steward wields the key on e1).
    const cs = await asUser(steward);
    const { data: geData } = await cs.rpc('enroll_group_in_journey', { p_group_id: e1, p_journey_id: jGroup });
    groupEnrollmentId = ((geData as { enrollment_id?: string; id?: string })?.enrollment_id
      ?? (geData as { id?: string })?.id) ?? GHOST;

    // Non-active enrolment fixture: admin-seed a `frozen` enrolment for the
    // traveller (any non-active status exercises the STORY-4c path; `frozen` is a
    // status proven valid by the J-A CHECK, whereas `withdrawn` only becomes valid
    // once the Q1 amendment lands).
    const { data: frozen } = await admin
      .from('journey_enrollments')
      .insert({
        journey_id: jFrozen,
        group_id: traveller.personalGroupId,
        enrolled_by_group_id: traveller.personalGroupId,
        status: 'frozen',
      })
      .select('id')
      .single();
    frozenEnrollmentId = (frozen?.id as string) ?? GHOST;
    if (frozen?.id) adminEnrollmentIds.push(frozen.id as string);
  }, 120000);

  afterAll(async () => {
    // FK-safe order: instances (child of steps + enrolments) → steps → journeys →
    // groups → users. Delete instances via a subquery over the fixtures' steps so a
    // RESTRICT FK on either parent can't block the step/journey deletes.
    if (createdJourneyIds.length) {
      const idList = createdJourneyIds.map((id) => `'${id}'`).join(',');
      await runAdminSql(
        `DELETE FROM public.journey_step_instances WHERE step_id IN ` +
          `(SELECT id FROM public.journey_steps WHERE journey_id IN (${idList}));`,
      ).catch(() => undefined);
      await admin.from('journey_steps').delete().in('journey_id', createdJourneyIds);
    }
    for (const id of adminEnrollmentIds) {
      await admin.from('journey_enrollments').delete().eq('id', id);
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
  // STORY-1 — Steps become rows, registries seed (JRN-18 substrate)
  // ==========================================================================
  describe('STORY-1 — registries seed & the beat-record substrate', () => {
    it('content_families holds exactly the six canon families', async () => {
      // AC: "content_families holds exactly the six canon families".
      const { data, error } = await admin.from('content_families').select('key');
      expect(error).toBeNull();
      const keys = (data as Array<{ key: string }>).map((r) => r.key).sort();
      expect(keys).toEqual([...FAMILY_KEYS].sort());
    });

    it('step_kinds holds the seven Tier-1 kinds, each a preset (default family + ask/change semantics)', async () => {
      // AC: "step_kinds holds the seven ADR-U008 Tier-1 types, each a preset bundle
      // of default family + ask/change semantics". Presence-not-wording, and column
      // names discovered from the row (AMBIGUITY: exact semantics-column names).
      const { data, error } = await admin.from('step_kinds').select('*');
      expect(error).toBeNull();
      const rows = data as Array<Record<string, unknown>>;
      expect(rows.map((r) => r.key as string).sort()).toEqual([...KIND_KEYS].sort());
      for (const row of rows) {
        const keys = Object.keys(row);
        const familyCol = keys.find((k) => /family/i.test(k));
        const askCol = keys.find((k) => /ask/i.test(k));
        const changeCol = keys.find((k) => /change/i.test(k));
        expect(familyCol).toBeDefined();
        expect(row[familyCol as string]).toBeTruthy(); // a default family is bound
        expect(askCol).toBeDefined(); // ask semantic present
        expect(changeCol).toBeDefined(); // change semantic present
      }
    });

    it('the beat-record columns all exist and (journey_id, step_order) is unique', async () => {
      // AC: "every column of the beat record exists and (journey_id, step_order)
      // is unique". Selecting the beat columns proves their existence (an absent
      // column errors); a duplicate insert proves the uniqueness constraint.
      const { error: colErr } = await admin
        .from('journey_steps')
        .select('journey_id, step_order, title, step_kind_key, content_family_key, required, repeatable, unlocked_by, duration_minutes, content, legacy_step_id')
        .eq('journey_id', jLinear)
        .limit(1);
      expect(colErr).toBeNull();

      const { error: dupErr } = await admin.from('journey_steps').insert({
        journey_id: jLinear,
        step_order: 1, // collides with the seeded first step
        title: 'Duplicate order',
        step_kind_key: 'narrative',
        content_family_key: 'witness',
        required: true,
        repeatable: false,
        duration_minutes: 5,
        content: {},
      });
      expect(dupErr).not.toBeNull();
      // Defensive cleanup if the constraint were (wrongly) absent.
      if (!dupErr) {
        await admin.from('journey_steps').delete().eq('journey_id', jLinear).eq('title', 'Duplicate order');
      }
    });

    it('a new step kind is usable as data, no schema change required (invariant 6)', async () => {
      // AC: "a new kind inserted into step_kinds (as data) — steps reference it,
      // no schema change required". Clone an existing registry row's shape so the
      // probe adapts to whatever columns exist.
      const { data: sample } = await admin.from('step_kinds').select('*').limit(1).maybeSingle();
      const clone = { ...(sample as Record<string, unknown> | null), key: 'jb_probe_kind' };
      const familyKey =
        (sample as Record<string, unknown> | null)
          ? (Object.entries(sample as Record<string, unknown>).find(([k]) => /family/i.test(k))?.[1] as string) ?? 'witness'
          : 'witness';

      const { error: kindErr } = await admin.from('step_kinds').insert(clone);
      expect(kindErr).toBeNull();

      const { error: stepErr } = await admin.from('journey_steps').insert({
        journey_id: jLinear,
        step_order: 99,
        title: 'Probe step (new kind)',
        step_kind_key: 'jb_probe_kind',
        content_family_key: familyKey,
        required: false,
        repeatable: false,
        duration_minutes: 5,
        content: {},
      });
      expect(stepErr).toBeNull();

      await admin.from('journey_steps').delete().eq('journey_id', jLinear).eq('step_order', 99);
      await admin.from('step_kinds').delete().eq('key', 'jb_probe_kind');
    });
  });

  // ==========================================================================
  // STORY-2 — The legacy steps migrate mechanically (POST-state invariants)
  // ==========================================================================
  describe('STORY-2 — post-migration invariants over pre-existing journeys', () => {
    /**
     * The sweeps are about MIGRATED journeys only. Exclude every test fixture — this
     * run's AND any leftover from a prior run — by its tag, not just by this run's ids
     * (test-authored fixtures carry no legacy_step_id and would fail the sweep).
     */
    const FIXTURE_TAGS = ['j-a-test', 'j-b-test'];
    const preExistingJourneyIds = async (): Promise<string[]> => {
      const { data } = await admin.from('journeys').select('id, tags');
      return (data as Array<{ id: string; tags: string[] | null }>)
        .filter((j) => !(j.tags ?? []).some((t) => FIXTURE_TAGS.includes(t)))
        .map((j) => j.id);
    };

    it('every pre-existing journey has at least one journey_steps row', async () => {
      // AC: "every journey with content.steps[] migrated to >=1 row" (parity count
      // proven in the migration's DO block; here: nothing lost).
      const ids = await preExistingJourneyIds();
      const { data: steps, error } = await admin.from('journey_steps').select('journey_id');
      expect(error).toBeNull();
      const withSteps = new Set((steps as Array<{ journey_id: string }>).map((s) => s.journey_id));
      for (const id of ids) {
        expect(withSteps.has(id)).toBe(true);
      }
      // Sanity: the seed set actually migrated (at least one journey has steps).
      expect(withSteps.size).toBeGreaterThan(0);
    });

    it('migrated steps are contiguous from 1, carry valid registry FKs, and preserve legacy_step_id', async () => {
      // AC: contiguous order following array position; kind/family resolve into the
      // registries; legacy_step_id preserves the JSONB id on migrated rows.
      const ids = await preExistingJourneyIds();
      const { data: fams, error: famErr } = await admin.from('content_families').select('key');
      const { data: kinds, error: kindErr } = await admin.from('step_kinds').select('key');
      expect(famErr).toBeNull(); // pre-migration: registries absent → clean red (not a null.map TypeError)
      expect(kindErr).toBeNull();
      const famSet = new Set(((fams ?? []) as Array<{ key: string }>).map((r) => r.key));
      const kindSet = new Set(((kinds ?? []) as Array<{ key: string }>).map((r) => r.key));

      const { data: allSteps, error } = await admin
        .from('journey_steps')
        .select('journey_id, step_order, step_kind_key, content_family_key, legacy_step_id');
      expect(error).toBeNull();
      const rows = allSteps as Array<{
        journey_id: string; step_order: number; step_kind_key: string; content_family_key: string; legacy_step_id: string | null;
      }>;

      for (const id of ids) {
        const js = rows.filter((s) => s.journey_id === id).sort((a, b) => a.step_order - b.step_order);
        expect(js.length).toBeGreaterThanOrEqual(1);
        expect(js.map((s) => s.step_order)).toEqual(js.map((_, i) => i + 1)); // contiguous 1..N
        for (const s of js) {
          expect(kindSet.has(s.step_kind_key)).toBe(true);
          expect(famSet.has(s.content_family_key)).toBe(true);
          expect(s.legacy_step_id).not.toBeNull(); // migrated rows carry provenance
        }
      }
    });

    it('journeys.content is disposed per Q2 (content NULLed, sequencing_mode populated)', async () => {
      // AC: "journeys.content disposition matches Q2's resolution and no contract
      // still reads content->'steps'" (the re-point is proven in STORY-3).
      // AMBIGUITY: Q2 default = NULL content + add sequencing_mode (default linear).
      const ids = await preExistingJourneyIds();
      const { data, error } = await admin.from('journeys').select('id, content, sequencing_mode').in('id', ids);
      expect(error).toBeNull();
      for (const row of data as Array<{ content: unknown; sequencing_mode: string | null }>) {
        expect(row.content).toBeNull();
        expect(row.sequencing_mode).toBeTruthy();
      }
    });
  });

  // ==========================================================================
  // STORY-3 — The catalogue and detail contracts survive the move
  // ==========================================================================
  describe('STORY-3 — get_journey_catalog / get_journey_detail re-pointed to rows', () => {
    it('get_journey_catalog.step_count equals the journey_steps row count (not content->steps)', async () => {
      // AC: "step_count equals the journey's row count; shape unchanged".
      const { data: rows, error: rowsErr } = await admin
        .from('journey_steps')
        .select('id')
        .eq('journey_id', jLinear);
      expect(rowsErr).toBeNull(); // pre-migration: table absent → red
      const rowCount = (rows ?? []).length;

      const c = await asUser(traveller);
      const { data, error } = await c.rpc('get_journey_catalog');
      expect(error).toBeNull();
      const mine = (data as Array<Record<string, unknown>>).find((r) => r.id === jLinear);
      expect(mine).toBeDefined();
      expect(mine!.step_count).toBe(rowCount);
    });

    it('get_journey_detail.steps[] returns {title, kind, duration_minutes} in order, kind = registry key, no content payloads', async () => {
      // AC: "steps[] returns {title, kind, duration_minutes} per row in order —
      // kind now the registry key — never content payloads".
      const c = await asUser(traveller);
      const { data, error } = await c.rpc('get_journey_detail', { p_journey_id: jLinear });
      expect(error).toBeNull();
      const steps = (data as { steps: Array<Record<string, unknown>> }).steps;
      expect(steps.length).toBeGreaterThan(0);
      if (linearSteps.length) expect(steps.length).toBe(linearSteps.length); // post-migration: one row per step
      for (const s of steps) {
        expect(Object.keys(s).sort()).toEqual(['duration_minutes', 'kind', 'title']); // no content payload leaks
        expect(KIND_KEYS).toContain(s.kind as string); // registry key, not legacy type
      }
      // Order preserved: first row is the seeded first step.
      expect(steps[0].title).toBe('Orient');
    });
  });

  // ==========================================================================
  // STORY-4 — The player boots in one read (get_player_state)
  // ==========================================================================
  describe('STORY-4 — get_player_state', () => {
    it('returns the full traveller payload in one round trip (solo actor = enrolment party)', async () => {
      // AC: journey meta + sequencing mode + ordered steps (kind, family, ask verb,
      // required, duration, content payload) + caller's instances + resume pointer
      // + enrolment status.
      // AMBIGUITY: payload key names (`steps`, `instances`, `resume_step_id`,
      // `sequencing_mode`, `status`) and per-step keys are the contract this suite
      // DEFINES — flagged for gate ratification.
      const c = await asUser(traveller);
      const { data, error } = await c.rpc('get_player_state', { p_enrollment_id: linearEnrollmentId });
      expect(error).toBeNull();
      const d = data as Record<string, unknown>;

      expect(d.status).toBe('active'); // enrolment status
      expect(d.sequencing_mode).toBeTruthy(); // sequencing mode present
      const steps = d.steps as Array<Record<string, unknown>>;
      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBe(linearSteps.length);
      // ordered + carries kind/family/required/duration + the content payload
      expect(steps.map((s) => s.step_order)).toEqual(steps.map((_, i) => i + 1));
      for (const s of steps) {
        expect(KIND_KEYS).toContain(s.kind as string);
        expect(FAMILY_KEYS).toContain(s.family as string);
        expect(s).toHaveProperty('required');
        expect(s).toHaveProperty('duration_minutes');
        expect(s).toHaveProperty('content'); // player needs the payload (unlike detail)
      }
      expect(d).toHaveProperty('instances'); // caller's step-instances
      expect(d).toHaveProperty('resume_step_id'); // resume pointer (Q6)
    });

    it('answers P0002 for an actor with no standing (existence not revealed)', async () => {
      // AC: "an actor with no standing → P0002 — existence is not revealed."
      const c = await asUser(outsider);
      const { error } = await c.rpc('get_player_state', { p_enrollment_id: linearEnrollmentId });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0002');
    });

    it('still returns the payload for a non-active enrolment, honestly stamped with its status', async () => {
      // AC: "a non-active enrolment → payload still returns with its status."
      const c = await asUser(traveller);
      const { data, error } = await c.rpc('get_player_state', { p_enrollment_id: frozenEnrollmentId });
      expect(error).toBeNull();
      expect((data as Record<string, unknown>).status).toBe('frozen');
    });

    it('resolves a group member as a traveller of the party enrolment', async () => {
      // AC (group arm): "group: active member of the party" is a valid actor.
      const c = await asUser(member);
      const { data, error } = await c.rpc('get_player_state', { p_enrollment_id: groupEnrollmentId });
      expect(error).toBeNull();
      const d = data as Record<string, unknown>;
      expect(d.status).toBe('active');
      expect((d.steps as unknown[]).length).toBe(groupSteps.length);
    });
  });

  // ==========================================================================
  // STORY-5 — Engagement is recorded, auto-save is cheap (enter_journey_step)
  // ==========================================================================
  describe('STORY-5 — enter_journey_step', () => {
    // Reset this enrolment's instances before each test so ordering can't couple.
    beforeEach(async () => {
      await admin.from('journey_step_instances').delete().eq('enrollment_id', progressEnrollmentId)
        .then(() => undefined, () => undefined);
    });

    const openInstances = async (stepId: string) => {
      const { data } = await admin
        .from('journey_step_instances')
        .select('id, completed_at')
        .eq('enrollment_id', progressEnrollmentId)
        .eq('step_id', stepId);
      return (data as Array<{ id: string; completed_at: string | null }>) ?? [];
    };

    it('creates an open instance when the traveller enters a step with none', async () => {
      // AC: "no open instance → an open instance is created (completed_at null)."
      const stepId = progressSteps[0]?.id ?? GHOST;
      const c = await asUser(traveller);
      const { error } = await c.rpc('enter_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: stepId });
      expect(error).toBeNull();
      const rows = await openInstances(stepId);
      expect(rows.length).toBe(1);
      expect(rows[0].completed_at).toBeNull();
    });

    it('does not create a duplicate when an open instance already exists', async () => {
      // AC: "open instance exists → called again → no duplicate."
      const stepId = progressSteps[0]?.id ?? GHOST;
      const c = await asUser(traveller);
      await c.rpc('enter_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: stepId });
      const { error } = await c.rpc('enter_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: stepId });
      expect(error).toBeNull();
      expect((await openInstances(stepId)).length).toBe(1);
    });

    it('creates no new instance when re-entering a completed NON-repeatable step (review)', async () => {
      // AC: "completed, non-repeatable → entered again → no new instance."
      const stepId = progressSteps[0]?.id ?? GHOST; // step 1 is non-repeatable
      const c = await asUser(traveller);
      const { error: enterErr } = await c.rpc('enter_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: stepId });
      expect(enterErr).toBeNull(); // pre-migration: function absent → clean red
      await c.rpc('complete_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: stepId });
      await c.rpc('enter_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: stepId });
      const rows = await openInstances(stepId);
      expect(rows.length).toBe(1); // still the single completed instance
      expect(rows[0].completed_at).not.toBeNull();
    });

    it('creates a fresh open instance when re-entering a completed REPEATABLE step (repeat = new instance)', async () => {
      // AC: "completed repeatable → new open instance (repeat = new instance, never an update)."
      const c = await asUser(traveller);
      // Step 3's completion is gated on the required predecessors (steps 1 & 2, correct
      // P0001 behaviour) — clear them deterministically before exercising the repeat.
      const { error: p0 } = await c.rpc('complete_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: progressSteps[0]?.id ?? GHOST });
      expect(p0).toBeNull();
      const { error: p1 } = await c.rpc('complete_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: progressSteps[1]?.id ?? GHOST });
      expect(p1).toBeNull();

      const stepId = progressSteps[2]?.id ?? GHOST; // step 3 is repeatable
      await c.rpc('enter_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: stepId });
      const { error: compErr } = await c.rpc('complete_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: stepId });
      expect(compErr).toBeNull();
      const { error } = await c.rpc('enter_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: stepId });
      expect(error).toBeNull();
      const rows = await openInstances(stepId);
      expect(rows.length).toBe(2); // one completed + one fresh open
      expect(rows.some((r) => r.completed_at === null)).toBe(true);
    });
  });

  // ==========================================================================
  // STORY-6 — Completion stamps once, gating holds (complete_journey_step)
  // ==========================================================================
  describe('STORY-6 — complete_journey_step', () => {
    beforeEach(async () => {
      await admin.from('journey_step_instances').delete().eq('enrollment_id', progressEnrollmentId)
        .then(() => undefined, () => undefined);
    });

    const completedInstances = async (stepId: string) => {
      const { data } = await admin
        .from('journey_step_instances')
        .select('id, completed_at')
        .eq('enrollment_id', progressEnrollmentId)
        .eq('step_id', stepId);
      return (data as Array<{ id: string; completed_at: string | null }>) ?? [];
    };

    it('stamps completed_at once and is idempotent on a second call', async () => {
      // AC: "completed_at stamps once; a second call is a no-op returning the existing completion."
      const stepId = progressSteps[0]?.id ?? GHOST;
      const c = await asUser(traveller);
      await c.rpc('enter_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: stepId });
      const { error: e1c } = await c.rpc('complete_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: stepId });
      expect(e1c).toBeNull();
      const first = await completedInstances(stepId);
      expect(first.length).toBe(1);
      expect(first[0].completed_at).not.toBeNull();

      const { error: e2c } = await c.rpc('complete_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: stepId });
      expect(e2c).toBeNull();
      const second = await completedInstances(stepId);
      expect(second.length).toBe(1);
      expect(second[0].completed_at).toBe(first[0].completed_at); // unchanged stamp
    });

    it('refuses with P0001 when a required predecessor is incomplete (linear gating) and writes nothing', async () => {
      // AC: "linear journey, incomplete required predecessor → P0001, nothing written."
      const step2 = progressSteps[1]?.id ?? GHOST; // requires step 1 (incomplete)
      const c = await asUser(traveller);
      const { error } = await c.rpc('complete_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: step2 });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      expect((await completedInstances(step2)).length).toBe(0); // nothing written
    });

    it('creates-and-completes in one call when the client skipped enter (unlocked step)', async () => {
      // AC: "no instance yet → completing an unlocked step → created-and-completed in one call."
      const step1 = progressSteps[0]?.id ?? GHOST;
      const c = await asUser(traveller);
      const { error } = await c.rpc('complete_journey_step', { p_enrollment_id: progressEnrollmentId, p_step_id: step1 });
      expect(error).toBeNull();
      const rows = await completedInstances(step1);
      expect(rows.length).toBe(1);
      expect(rows[0].completed_at).not.toBeNull();
    });
  });

  // ==========================================================================
  // STORY-7 — Withdraw preserves the lived record; forgetting still forgets
  // ==========================================================================
  describe('STORY-7 — withdraw revisit, erasure cascade, direct-DML hardening', () => {
    it('withdraw reaches a terminal `withdrawn` status, instances survive, and re-enrolment succeeds', async () => {
      // AC: "withdraw → Q1-resolved terminal state, instances survive, re-enrolment possible."
      // AMBIGUITY: this asserts the Q1 DEFAULT terminal value = 'withdrawn'.
      const enrollmentId = (await enrolSelf(traveller, jWithdraw)) ?? GHOST;
      const c = await asUser(traveller);

      // Fetch a step and record engagement so there is a lived instance to preserve.
      const { data: wsteps } = await admin.from('journey_steps').select('id').eq('journey_id', jWithdraw).limit(1);
      const stepId = ((wsteps as Array<{ id: string }>) ?? [])[0]?.id ?? GHOST;
      const { error: enterErr } = await c.rpc('enter_journey_step', { p_enrollment_id: enrollmentId, p_step_id: stepId });
      expect(enterErr).toBeNull();

      const { error: wErr } = await c.rpc('withdraw_from_journey', { p_enrollment_id: enrollmentId });
      expect(wErr).toBeNull();

      // Terminal status (legacy withdraw DELETES the row → status row absent → red).
      const { data: after } = await admin.from('journey_enrollments').select('status').eq('id', enrollmentId);
      expect(after).toHaveLength(1);
      expect((after as Array<{ status: string }>)[0].status).toBe('withdrawn');

      // Instances survive the withdrawal.
      const { data: survived, error: survErr } = await admin
        .from('journey_step_instances')
        .select('id')
        .eq('enrollment_id', enrollmentId);
      expect(survErr).toBeNull();
      expect((survived ?? []).length).toBeGreaterThan(0);

      // Re-enrolment succeeds (the partial unique index scopes actives only).
      const { error: reErr } = await c.rpc('enroll_self_in_journey', { p_journey_id: jWithdraw });
      expect(reErr).toBeNull();
    });

    it('erasure cascade: deleting the enrolment row removes its step-instances', async () => {
      // AC: "enrolment row deleted (ADR-U031 erasure) → its step-instances are gone."
      const { data: seeded } = await admin
        .from('journey_enrollments')
        .insert({
          journey_id: jErase,
          group_id: outsider.personalGroupId,
          enrolled_by_group_id: outsider.personalGroupId,
          status: 'active',
        })
        .select('id')
        .single();
      const enrollmentId = (seeded?.id as string) ?? GHOST;

      const { data: es } = await admin.from('journey_steps').select('id').eq('journey_id', jErase).limit(1);
      const stepId = ((es as Array<{ id: string }>) ?? [])[0]?.id ?? GHOST;
      const { error: insErr } = await admin.from('journey_step_instances').insert({
        enrollment_id: enrollmentId,
        traveller_group_id: outsider.personalGroupId,
        step_id: stepId,
      });
      expect(insErr).toBeNull(); // pre-migration: table absent → red

      await admin.from('journey_enrollments').delete().eq('id', enrollmentId);

      const { data: remaining } = await admin
        .from('journey_step_instances')
        .select('id')
        .eq('enrollment_id', enrollmentId);
      expect((remaining ?? []).length).toBe(0);
    });

    it('refuses a direct INSERT on all four new tables (contracts are the only write path)', async () => {
      // AC: "anon/authenticated → direct INSERT/UPDATE/DELETE on any of the four
      // tables → permission denied." A refusal is only meaningful once the table
      // EXISTS — so probe existence via the service role first (pre-migration these
      // fail relation-absent → clean red; the refusal alone can't tell absence from
      // a grant denial, so this probe is what makes the test red-first).
      for (const t of ['content_families', 'step_kinds', 'journey_steps', 'journey_step_instances']) {
        const { error: existErr } = await admin.from(t).select('*').limit(1);
        expect(existErr).toBeNull();
      }

      const c = await asUser(traveller);
      const stepId = linearSteps[0]?.id ?? GHOST;

      const { error: fam } = await c.from('content_families').insert({ key: 'jb_forge_family' });
      expect(fam).not.toBeNull();

      const { error: kind } = await c.from('step_kinds').insert({ key: 'jb_forge_kind' });
      expect(kind).not.toBeNull();

      const { error: step } = await c.from('journey_steps').insert({
        journey_id: jLinear, step_order: 100, title: 'forged', step_kind_key: 'narrative',
        content_family_key: 'witness', required: false, repeatable: false, duration_minutes: 1, content: {},
      });
      expect(step).not.toBeNull();

      const { error: inst } = await c.from('journey_step_instances').insert({
        enrollment_id: linearEnrollmentId, traveller_group_id: traveller.personalGroupId, step_id: stepId,
      });
      expect(inst).not.toBeNull();
    });

    it('refuses a direct UPDATE and DELETE on journey_step_instances (no write grant)', async () => {
      // AC (verbs): UPDATE/DELETE refused on the traveller-own instance table.
      const c = await asUser(traveller);

      const { error: existErr } = await admin.from('journey_step_instances').select('*').limit(1);
      expect(existErr).toBeNull(); // table must exist for a write-refusal to be meaningful (red-first probe)

      const { error: updErr } = await c
        .from('journey_step_instances')
        .update({ completed_at: new Date().toISOString() })
        .eq('enrollment_id', linearEnrollmentId);
      expect(updErr).not.toBeNull();

      const { error: delErr } = await c
        .from('journey_step_instances')
        .delete()
        .eq('enrollment_id', linearEnrollmentId);
      expect(delErr).not.toBeNull();
    });
  });
});
