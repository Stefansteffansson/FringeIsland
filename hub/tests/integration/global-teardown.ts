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
 * SCOPE. Integration fixtures are `test-<seed>-<hash>@fringeisland.test`
 * (`generateTestEmail`); E2E's are `e2e-*`. This sweeps only the former, so the
 * tiers never reach into each other's fixtures, and it never touches an address
 * outside `@fringeisland.test` — a real account cannot be caught by it. That
 * scoping care is deliberate: a broader rule cost a hand-made persona on
 * 2026-08-12.
 *
 * CONCURRENCY. Assumes the standing house rule — never two integration suites
 * against the shared dev DB at once. A concurrent run's live fixtures would look
 * like residue here.
 *
 * It sweeps AND reports. Sweeping silently would let leaky suites hide forever;
 * reporting without sweeping leaves the database dirty, which is what prompted
 * this. The run stays green: a leak is a hygiene defect, not a failed assertion.
 */

const RESIDUE_SQL = `
  SELECT
    (SELECT count(*) FROM auth.users WHERE email LIKE 'test-%@fringeisland.test') AS accounts,
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
    (SELECT count(*) FROM public.telemetry_events) AS telemetry_rows
`;

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
       WHERE au.email LIKE 'test-%@fringeisland.test');

    DELETE FROM public.consent_records cr
     WHERE cr.subject_group_id IN (
       SELECT u.personal_group_id FROM public.users u
       JOIN auth.users au ON au.id = u.auth_user_id
       WHERE au.is_anonymous);

    DELETE FROM auth.users
     WHERE email LIKE 'test-%@fringeisland.test'
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

    -- Trails. A run's notifications, audit rows and telemetry are as much its
    -- residue as its accounts — they describe fixtures that no longer exist.
    -- Cleared wholesale on Stefan's ruling (2026-08-12). TRADE-OFF, stated:
    -- this also clears trails from a manual walk, so if you are inspecting an
    -- audit trail by hand, read it before running a suite.
    DELETE FROM public.notifications;
    DELETE FROM public.admin_audit_log;
    DELETE FROM public.telemetry_events;
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
};

type RunAdminSql = (sql: string) => Promise<Array<Record<string, unknown>>>;

const read = async (runAdminSql: RunAdminSql): Promise<Residue> => {
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
  };
};

const sum = (r: Residue) =>
  r.accounts +
  r.mists +
  r.personal_groups +
  r.engagement_groups +
  r.test_journeys +
  r.orphaned_conversations +
  r.notifications +
  r.audit_rows +
  r.telemetry_rows;

const describe = (r: Residue) =>
  `${r.accounts} accounts, ${r.mists} Mists, ${r.personal_groups} personal groups, ` +
  `${r.engagement_groups} engagement groups, ${r.test_journeys} test journeys, ` +
  `${r.orphaned_conversations} orphaned conversations, ${r.notifications} notifications, ` +
  `${r.audit_rows} audit rows, ${r.telemetry_rows} telemetry rows`;

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

  if (sum(before) === 0) {
    console.log('[integration-teardown] Clean — every fixture was torn down by its own suite.');
    return;
  }

  await runAdminSql(SWEEP_SQL);
  const after = await read(runAdminSql);

  console.warn(
    `[integration-teardown] Swept residue a suite left behind: ${describe(before)}. ` +
      `A suite is not cleaning up after itself.`,
  );

  if (sum(after) > 0) {
    console.warn(
      `[integration-teardown] STILL PRESENT after the sweep: ${describe(after)}. ` +
        `Something holds a reference the sweep respects (e.g. last-Steward) — needs a human.`,
    );
  }
}
