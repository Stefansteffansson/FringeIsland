import { config } from 'dotenv';
import { resolve } from 'node:path';

// Global hooks run OUTSIDE the normal test module lifecycle, so neither of the
// two things every test file takes for granted holds here:
//   - `moduleNameMapper` is not consulted, so the `@/…` alias does not resolve;
//   - `setupFilesAfterEnv` has not run, so `.env.local` is not loaded.
// The env must therefore be loaded before the Supabase helper is evaluated —
// it reads the project URL at module scope and throws if it is missing. A
// top-level `import` would not do: imports are hoisted above statements, so the
// helper would load first regardless of source order. Hence the dynamic import
// inside the hook, after config().

/**
 * Integration-tier global teardown — cleanup as part of testing, not after it.
 *
 * WHY THIS EXISTS. The E2E tier has had a global teardown with leak instruments
 * since TASK-INT-05. The integration tier had NONE: every suite relied on its
 * own `afterAll`, and when one was missing, threw early, or never covered the
 * fixtures it made, the residue was nobody's job. Measured 2026-08-12: a single
 * verification pass over a freshly-emptied database left 63 fixture accounts,
 * 77 personal groups, 3 engagement groups, 2 direct-message threads, 157
 * notifications and 160 audit rows behind.
 *
 * THE RULE THIS ENCODES: a run owns everything it creates. At the end of a run
 * there is no such thing as a legitimate surviving `test-*` fixture, so residue
 * is defined STRUCTURALLY rather than as a before/after delta — nothing to plumb
 * between setup and teardown, and it stays correct when a run dies half-way.
 *
 * SCOPE (widened 2026-09-04, Stefan: "we do NOT want any test accounts to be
 * left overs from testing — this needs to STOP"). Every `@fringeisland.test`
 * address is residue EXCEPT the allowlist — the standing walk cast (`walk-*`)
 * and the E2E session user (`e2e-session@`). That reaches `test-*` (integration,
 * `generateTestEmail`), `e2e-*` (a leaked E2E fixture is caught here as the
 * backstop to the E2E teardown's own census), and any probe or one-off script's
 * family — `intprobe-*` (scripts/auth-admin-es256-probe.mjs) left 180 accounts
 * across two runs that the old `test-*` rule could not see. It still never
 * touches an address outside `@fringeisland.test`, so a real account cannot be
 * caught by it; the 2026-08-12 lesson (a broader rule cost a hand-made persona)
 * survives as the allowlist: hand-made personas live under `walk-*`.
 *
 * CONCURRENCY. Assumes the standing house rule — never two integration suites
 * against the shared dev DB at once. A concurrent run's live fixtures would look
 * like residue here.
 *
 * It sweeps AND reports. Sweeping silently would let leaky suites hide forever;
 * reporting without sweeping leaves the database dirty, which is what prompted
 * this. The run stays green: a leak is a hygiene defect, not a failed assertion.
 *
 * GOVERNANCE CATALOGS (TASK-DBT-03). On 2026-08-19 a PC025 run died mid-way and
 * left a "Steward Clone" role template (3 versions, 1 platform-wide
 * publication) and a "synthetic gt" group template behind — and this teardown
 * reported the next runs "clean", because nothing above counted
 * `role_templates`, `role_template_versions`, `role_template_publications` or
 * `group_templates`. What a residue query does not COUNT it cannot report. The
 * stake is sharper than untidiness: a clone a run has OFFERED is refused by
 * RD-4a forever (`role_template_undeletable_reason`), so a leak of this class
 * is a permanent row in the production catalog. The catalog has no structural
 * fixture marker (no `created_by`, no fixture-only column), so the discriminator
 * is the one the suites already carry: the run-token NAME convention below —
 * the same species of rule as `test-%@fringeisland.test` for accounts. A
 * non-system template OUTSIDE the convention is hand-made on production, or a
 * suite naming its fixtures outside the convention; either way it is nobody's
 * to sweep, so it is reported as a NOTE and left standing, and it is kept out
 * of the residue sum so it cannot make the "STILL PRESENT" warning permanent.
 */

/**
 * The fixture-name convention for governance-catalog rows, as a Postgres ARE
 * (the sweep runs `~`, not a JS RegExp). Shapes in use today:
 *   `pc025x<base36> …`  role-template-editing      (the 2026-08-19 leak's tag)
 *   `pc029x<base36> …`  role-template-disposal
 *   `RD-A …`            role-provenance-and-retirement
 *   `RDB …`             role-publication-and-diff
 * A new catalog-writing suite either names inside this convention or extends
 * it here — `integration-teardown-governance-catalogs.test.ts` pins the shapes
 * against the seeded names and a near-miss.
 */
export const FIXTURE_CATALOG_NAME_RE = '^(pc0[0-9]{2}x[0-9a-z]+|RD-A|RDB)( |$)';

/**
 * The seeded group templates, by the names production carries today (verified
 * 2026-09-02; `group_templates.is_system` is false on all four, so the name is
 * the only handle). Anything else is either a fixture (by the convention) or a
 * note. A fifth seeded by a later migration shows up as a note, never a sweep.
 */
export const SEEDED_GROUP_TEMPLATE_NAMES = [
  'Small Team',
  'Large Group',
  'Organization',
  'Learning Cohort',
] as const;

const SEEDED_GROUP_TEMPLATE_LIST = SEEDED_GROUP_TEMPLATE_NAMES.map((n) => `'${n}'`).join(', ');

const RESIDUE_SQL = `
  SELECT
    (SELECT count(*) FROM auth.users WHERE email LIKE '%@fringeisland.test' AND email NOT LIKE 'walk-%' AND email <> 'e2e-session@fringeisland.test') AS accounts,
    -- Mists carry no email, so the pattern above cannot see them. Any anonymous
    -- user alive at the end of an integration run was minted by it (the E2E tier
    -- sweeps its own the same way, TASK-E2E-04).
    (SELECT count(*) FROM auth.users WHERE is_anonymous) AS mists,
    (SELECT count(*) FROM public.groups g WHERE g.group_type='personal'
       AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.personal_group_id=g.id)) AS personal_groups,
    -- No journey guard here. An earlier version spared any engagement group
    -- that owned a journey, to protect the seeded catalogue — and test-created
    -- journeys then shielded their own test groups, which in turn kept a
    -- fixture Steward alive and blocked the personal-group sweep. One wrong
    -- discriminator held up the whole chain. Ownership is the right one:
    -- every canonical journey is owned by a SYSTEM group.
    (SELECT count(*) FROM public.groups g WHERE g.group_type='engagement'
       AND NOT EXISTS (SELECT 1 FROM public.group_memberships gm
                       JOIN public.users u ON u.personal_group_id=gm.member_group_id
                       WHERE gm.group_id=g.id)) AS engagement_groups,
    (SELECT count(*) FROM public.journeys j
       JOIN public.groups g ON g.id=j.created_by_group_id
      WHERE g.group_type <> 'system') AS test_journeys,
    (SELECT count(*) FROM public.conversations c
       WHERE NOT EXISTS (SELECT 1 FROM public.conversation_participants cp
                         WHERE cp.conversation_id=c.id)) AS orphaned_conversations,
    (SELECT count(*) FROM public.notifications) AS notifications,
    (SELECT count(*) FROM public.admin_audit_log) AS audit_rows,
    (SELECT count(*) FROM public.telemetry_events) AS telemetry_rows,
    -- Consent rows with NO subject group. The FK is ON DELETE RESTRICT, which
    -- only protects a row that still references something — a NULL subject
    -- slips it entirely and is attributable to nobody. ~18 accumulate per full
    -- run. This was invisible until the DB was compared against a known
    -- baseline: the teardown reported "clean" while they sat there, because
    -- what a residue query does not COUNT it cannot report.
    (SELECT count(*) FROM public.consent_records WHERE subject_group_id IS NULL) AS orphaned_consent,
    -- Governance catalogs (TASK-DBT-03): run-tagged rows a suite left behind.
    -- Versions and publications are counted separately so the line says what
    -- the leak carried; they cascade with their template on the sweep.
    (SELECT count(*) FROM public.role_templates rt
      WHERE NOT rt.is_system AND rt.name ~ '${FIXTURE_CATALOG_NAME_RE}') AS fixture_role_templates,
    (SELECT count(*) FROM public.role_template_versions v
       JOIN public.role_templates rt ON rt.id = v.role_template_id
      WHERE NOT rt.is_system AND rt.name ~ '${FIXTURE_CATALOG_NAME_RE}') AS fixture_role_template_versions,
    (SELECT count(*) FROM public.role_template_publications p
       JOIN public.role_templates rt ON rt.id = p.role_template_id
      WHERE NOT rt.is_system AND rt.name ~ '${FIXTURE_CATALOG_NAME_RE}') AS fixture_role_template_publications,
    (SELECT count(*) FROM public.group_templates gt
      WHERE gt.name ~ '${FIXTURE_CATALOG_NAME_RE}'
        AND gt.name NOT IN (${SEEDED_GROUP_TEMPLATE_LIST})) AS fixture_group_templates,
    -- The NOTE classes: present, attributable to no run, never swept, never in
    -- the residue sum. A non-system template outside the convention; a group
    -- template that is neither seeded nor convention-named; a publication of a
    -- SEEDED template whose publisher no longer exists (published_by SET NULL
    -- when a fixture admin's group went — a leaked offer that changes what
    -- every group can pull, so a human should hear of it).
    (SELECT count(*) FROM public.role_templates rt
      WHERE NOT rt.is_system AND rt.name !~ '${FIXTURE_CATALOG_NAME_RE}') AS foreign_role_templates,
    (SELECT count(*) FROM public.group_templates gt
      WHERE gt.name !~ '${FIXTURE_CATALOG_NAME_RE}'
        AND gt.name NOT IN (${SEEDED_GROUP_TEMPLATE_LIST})) AS foreign_group_templates,
    (SELECT count(*) FROM public.role_template_publications p
       JOIN public.role_templates rt ON rt.id = p.role_template_id
      WHERE rt.is_system AND p.published_by IS NULL) AS publisherless_system_publications
`;

/**
 * The governance-catalog sweep, on its own so the suite can exercise it
 * without running the account sweep mid-run. Spliced into SWEEP_SQL below —
 * one text, two callers — AFTER the group deletes: copies made from a fixture
 * template live in fixture groups, and the template must not go while any
 * copy survives (RD-4a's last clause is the provenance line FEAT-H043 renders;
 * the audit-trail clause is moot here because the trails are cleared in the
 * same sweep). Children cascade: versions, publications, permissions,
 * group_template_roles.
 */
const GOVERNANCE_SWEEP = `
    DELETE FROM public.group_templates gt
     WHERE gt.name ~ '${FIXTURE_CATALOG_NAME_RE}'
       AND gt.name NOT IN (${SEEDED_GROUP_TEMPLATE_LIST});
    DELETE FROM public.role_templates rt
     WHERE NOT rt.is_system AND rt.name ~ '${FIXTURE_CATALOG_NAME_RE}'
       AND NOT EXISTS (SELECT 1 FROM public.group_roles gr
                       WHERE gr.created_from_role_template_id = rt.id);
`;

export const GOVERNANCE_SWEEP_SQL = `DO $$ BEGIN ${GOVERNANCE_SWEEP} END $$;`;

const SWEEP_SQL = `
  DO $$
  DECLARE r record;
  BEGIN
    PERFORM set_config('app.consent_erasure_in_progress','true',true);
    PERFORM set_config('app.bypass_personal_group_id_immutability','true',true);

    -- consent RESTRICTs the personal group, so it clears first
    DELETE FROM public.consent_records cr
     WHERE cr.subject_group_id IN (
       SELECT u.personal_group_id FROM public.users u
       JOIN auth.users au ON au.id = u.auth_user_id
       WHERE au.email LIKE '%@fringeisland.test' AND au.email NOT LIKE 'walk-%' AND au.email <> 'e2e-session@fringeisland.test');

    DELETE FROM public.consent_records cr
     WHERE cr.subject_group_id IN (
       SELECT u.personal_group_id FROM public.users u
       JOIN auth.users au ON au.id = u.auth_user_id
       WHERE au.is_anonymous);

    DELETE FROM auth.users
     WHERE (email LIKE '%@fringeisland.test' AND email NOT LIKE 'walk-%' AND email <> 'e2e-session@fringeisland.test')
        OR is_anonymous;

    -- Test-created journeys, BEFORE the groups that own them: journeys RESTRICT
    -- their owning group, and progress rows RESTRICT the steps. Canonical
    -- journeys are system-owned and are never touched here.
    DELETE FROM public.journey_step_instances i
     USING public.journey_steps s, public.journeys j, public.groups g
     WHERE i.step_id = s.id AND s.journey_id = j.id
       AND j.created_by_group_id = g.id AND g.group_type <> 'system';
    DELETE FROM public.journey_enrollments e
     USING public.journeys j, public.groups g
     WHERE e.journey_id = j.id AND j.created_by_group_id = g.id AND g.group_type <> 'system';
    DELETE FROM public.journeys j
     USING public.groups g
     WHERE j.created_by_group_id = g.id AND g.group_type <> 'system';

    -- engagement groups no surviving member belongs to (conversations, forum
    -- posts and memberships cascade with them)
    DELETE FROM public.groups g
     WHERE g.group_type = 'engagement'
       AND NOT EXISTS (SELECT 1 FROM public.group_memberships gm
                       JOIN public.users u ON u.personal_group_id = gm.member_group_id
                       WHERE gm.group_id = g.id);

    -- personal groups do NOT cascade from their user. One at a time, so
    -- prevent_last_leader_removal can veto a single row without killing the batch.
    FOR r IN SELECT g.id FROM public.groups g
              WHERE g.group_type='personal'
                AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.personal_group_id=g.id)
    LOOP
      BEGIN DELETE FROM public.groups WHERE id = r.id;
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP;

    -- TASK-DM-01: direct threads are NOT group-anchored, so neither sweep above
    -- reaches them. A thread with no participants left is unreachable by every
    -- contract — residue by definition.
    DELETE FROM public.messages m
     WHERE NOT EXISTS (SELECT 1 FROM public.conversation_participants cp
                       WHERE cp.conversation_id = m.conversation_id);
    DELETE FROM public.conversations c
     WHERE NOT EXISTS (SELECT 1 FROM public.conversation_participants cp
                       WHERE cp.conversation_id = c.id);

    -- Governance catalogs (TASK-DBT-03), after the groups above.
    ${GOVERNANCE_SWEEP}

    -- Trails. A run's notifications, audit rows and telemetry are as much its
    -- residue as its accounts — they describe fixtures that no longer exist.
    -- Cleared wholesale on Stefan's ruling (2026-08-12). TRADE-OFF, stated:
    -- this also clears trails from a manual walk, so if you are inspecting an
    -- audit trail by hand, read it before running a suite.
    DELETE FROM public.notifications;
    DELETE FROM public.admin_audit_log;
    DELETE FROM public.telemetry_events;

    -- Subject-less consent: unattributable to any member, so it can only be
    -- residue. See TASK-DM-01's closing note — whether a NULL subject is ever
    -- legitimate is a live question, and until it is settled this keeps the
    -- rows from accumulating unseen.
    DELETE FROM public.consent_records WHERE subject_group_id IS NULL;
  END $$;
`;

type Residue = {
  accounts: number;
  mists: number;
  personal_groups: number;
  engagement_groups: number;
  test_journeys: number;
  orphaned_conversations: number;
  notifications: number;
  audit_rows: number;
  telemetry_rows: number;
  orphaned_consent: number;
  // Governance catalogs (TASK-DBT-03) — fixture classes, swept and blamed…
  fixture_role_templates: number;
  fixture_role_template_versions: number;
  fixture_role_template_publications: number;
  fixture_group_templates: number;
  // …and the note classes: reported, never swept, never summed.
  foreign_role_templates: number;
  foreign_group_templates: number;
  publisherless_system_publications: number;
};

type RunAdminSql = (sql: string) => Promise<Array<Record<string, unknown>>>;

export const read = async (runAdminSql: RunAdminSql): Promise<Residue> => {
  const rows = await runAdminSql(RESIDUE_SQL);
  const r = (rows?.[0] ?? {}) as Record<string, unknown>;
  return {
    accounts: Number(r.accounts ?? 0),
    mists: Number(r.mists ?? 0),
    personal_groups: Number(r.personal_groups ?? 0),
    engagement_groups: Number(r.engagement_groups ?? 0),
    test_journeys: Number(r.test_journeys ?? 0),
    orphaned_conversations: Number(r.orphaned_conversations ?? 0),
    notifications: Number(r.notifications ?? 0),
    audit_rows: Number(r.audit_rows ?? 0),
    telemetry_rows: Number(r.telemetry_rows ?? 0),
    orphaned_consent: Number(r.orphaned_consent ?? 0),
    fixture_role_templates: Number(r.fixture_role_templates ?? 0),
    fixture_role_template_versions: Number(r.fixture_role_template_versions ?? 0),
    fixture_role_template_publications: Number(r.fixture_role_template_publications ?? 0),
    fixture_group_templates: Number(r.fixture_group_templates ?? 0),
    foreign_role_templates: Number(r.foreign_role_templates ?? 0),
    foreign_group_templates: Number(r.foreign_group_templates ?? 0),
    publisherless_system_publications: Number(r.publisherless_system_publications ?? 0),
  };
};

/** Runs only the governance-catalog half of the sweep (see GOVERNANCE_SWEEP). */
export const sweepGovernanceCatalogs = (runAdminSql: RunAdminSql) =>
  runAdminSql(GOVERNANCE_SWEEP_SQL);

/**
 * Governance-catalog residue a suite left behind. Versions and publications
 * ride their template, so the class is counted by templates + group templates;
 * the child counts only decorate the line.
 */
const catalog = (r: Residue) => r.fixture_role_templates + r.fixture_group_templates;

const sum = (r: Residue) =>
  r.accounts +
  r.mists +
  r.personal_groups +
  r.engagement_groups +
  r.test_journeys +
  r.orphaned_conversations +
  r.notifications +
  r.audit_rows +
  r.telemetry_rows +
  r.orphaned_consent +
  catalog(r);

/**
 * Entity residue: things a SUITE created and should have removed. Non-zero here
 * means a spec is not cleaning up after itself, and is worth a warning.
 */
const entities = (r: Residue) =>
  r.accounts +
  r.mists +
  r.personal_groups +
  r.engagement_groups +
  r.test_journeys +
  r.orphaned_conversations +
  catalog(r);

/** The note classes — see the header. Never part of sum(). */
const notes = (r: Residue) =>
  r.foreign_role_templates + r.foreign_group_templates + r.publisherless_system_publications;

/**
 * Trails: rows the SYSTEM writes in response to what a test did — an admin
 * action really does append to the audit log, and that is the log working. A
 * spec cannot avoid generating them without avoiding the behaviour under test,
 * so they are swept centrally by design (Stefan's ruling, 2026-08-12) and
 * reported without blame. Counting them as "a suite failed to clean up" would
 * make the warning permanent, and a warning that is always on is not a signal.
 */
const trails = (r: Residue) => r.notifications + r.audit_rows + r.telemetry_rows + r.orphaned_consent;

/*
 * A NOTE ON WHERE subject-less consent sits, because moving it here could look
 * like moving the goalposts to earn a green line.
 *
 * It is counted as a TRAIL, not as a suite's uncleaned fixture, for one
 * reason: a consent row with a NULL `subject_group_id` is attributable to
 * NOBODY. No suite can clean up "its own" — there is no link back to the
 * fixture that caused it. It is produced by consent flows exercised during
 * tests, which is the definition used for the other trails.
 *
 * That is containment, NOT a fix. The real question — whether an unattributable
 * consent record should be creatable at all, i.e. whether the column should be
 * NOT NULL — is open and filed under TASK-DM-01, where it was first measured
 * (379 at the 2026-08-12 reset, ~7-18 per full run since). Sweeping them here
 * stops the accumulation; it does not answer the question, and this comment
 * exists so nobody mistakes the quiet log line for the question being settled.
 */

const describe = (r: Residue) =>
  `${r.accounts} accounts, ${r.mists} Mists, ${r.personal_groups} personal groups, ` +
  `${r.engagement_groups} engagement groups, ${r.test_journeys} test journeys, ` +
  `${r.orphaned_conversations} orphaned conversations, ${r.notifications} notifications, ` +
  `${r.audit_rows} audit rows, ${r.telemetry_rows} telemetry rows, ` +
  `${r.orphaned_consent} subject-less consent rows, ` +
  `${r.fixture_role_templates} fixture role templates ` +
  `(${r.fixture_role_template_versions} versions, ${r.fixture_role_template_publications} publications), ` +
  `${r.fixture_group_templates} fixture group templates`;

const describeNotes = (r: Residue) =>
  `${r.foreign_role_templates} non-system role templates and ${r.foreign_group_templates} ` +
  `group templates outside the fixture-name convention, ${r.publisherless_system_publications} ` +
  `publications of seeded templates whose publisher no longer exists`;

export default async function globalTeardown(): Promise<void> {
  config({ path: resolve(__dirname, '..', '..', '.env.local') });
  const { runAdminSql } = (await import('../helpers/supabase')) as { runAdminSql: RunAdminSql };

  let before: Residue;
  try {
    before = await read(runAdminSql);
  } catch (err) {
    // The management API is flaky by nature (isManagementApiTransient). A
    // teardown that cannot measure must not fail an otherwise-green run.
    console.warn(`[integration-teardown] Could not read residue: ${(err as Error).message}`);
    return;
  }

  if (notes(before) > 0) {
    // Attributable to no run, so not blamed on one and not swept: hand-made on
    // production, a suite naming outside the convention, or a leaked offer
    // whose publisher is gone. Said once per run, for a human.
    console.log(
      `[integration-teardown] Catalog note (left alone — nobody's to sweep): ${describeNotes(before)}.`,
    );
  }

  if (sum(before) === 0) {
    console.log('[integration-teardown] Clean — every fixture was torn down by its own suite.');
    return;
  }

  await runAdminSql(SWEEP_SQL);
  const after = await read(runAdminSql);

  if (entities(before) === 0) {
    console.log(
      `[integration-teardown] Clean — every fixture was torn down by its own suite. ` +
        `Swept ${trails(before)} trail rows (notifications / audit / telemetry), which are ` +
        `side effects of the behaviour under test and are cleared here by design.`,
    );
  } else {
    console.warn(
      `[integration-teardown] Swept residue a suite left behind: ${describe(before)}. ` +
        `A suite is not cleaning up after itself.`,
    );
  }

  if (sum(after) > 0) {
    console.warn(
      `[integration-teardown] STILL PRESENT after the sweep: ${describe(after)}. ` +
        `Something holds a reference the sweep respects (e.g. last-Steward) — needs a human.`,
    );
  }
}
