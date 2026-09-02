import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import {
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import {
  read,
  sweepGovernanceCatalogs,
  FIXTURE_CATALOG_NAME_RE,
  SEEDED_GROUP_TEMPLATE_NAMES,
} from '../global-teardown';

jest.setTimeout(120_000);

/**
 * TASK-DBT-03 — the integration-tier global teardown learns the governance
 * catalogs.
 *
 * On 2026-08-19 a PC025 run died mid-way and left a "Steward Clone" role
 * template (3 versions, 1 platform-wide publication) and a "synthetic gt"
 * group template on the one shared database. The `[integration-teardown]`
 * sweep reported the run "clean": it counts accounts, groups, journeys,
 * conversations and trails — and nothing in `role_templates`,
 * `role_template_versions`, `role_template_publications` or `group_templates`.
 * What a residue query does not COUNT it cannot report. The stake is sharper
 * than untidiness: a clone a run has OFFERED is refused by RD-4a forever, so
 * every leak of this class is a permanent row in the production catalog.
 *
 * This suite reproduces that exact leaked shape data-level and pins three
 * things: the residue read SEES the four catalog classes; the sweep REMOVES
 * the run-tagged rows and their children while leaving alone (a) a template a
 * group still carries a copy of (RD-4a's one structural reason) and (b) a
 * non-system template outside the fixture-name convention (hand-made on
 * production, or a suite naming outside the convention — reported, never
 * swept); and the convention itself names the shapes the suites actually use.
 *
 * RED AT HEAD, three mechanisms: `read` is not exported (undefined is not a
 * function); the residue carries no catalog columns; `sweepGovernanceCatalogs`
 * does not exist.
 */

// The exact tag shape of the 2026-08-19 leak.
const TOKEN = `pc025x${Date.now().toString(36)}`;
// Outside the convention on purpose: the control that must SURVIVE the sweep.
const HANDMADE = `DBT-03 hand-made ${Date.now().toString(36)}`;

type Ids = { leaked: string; gt: string; adopted: string; handmade: string };

describe('TASK-DBT-03 — integration-teardown sweeps the governance catalogs', () => {
  const admin = createAdminClient();
  let ids: Ids;
  let holder: TestUser | undefined;
  let holderGroupId: string | undefined;

  beforeAll(async () => {
    const rows = (await runAdminSql(`
      WITH t AS (
        INSERT INTO public.role_templates (name, description, is_system)
        VALUES ('${TOKEN} Steward Clone', 'DBT-03 leak probe', false) RETURNING id
      ),
      v AS (
        INSERT INTO public.role_template_versions (role_template_id, version_number, name)
        SELECT id, 1, '${TOKEN} Steward Clone' FROM t
      ),
      p AS (
        INSERT INTO public.role_template_publications (role_template_id, group_id)
        SELECT id, NULL FROM t
      ),
      g AS (
        INSERT INTO public.group_templates (name, description)
        VALUES ('${TOKEN} synthetic gt', 'DBT-03 leak probe') RETURNING id
      ),
      gr AS (
        INSERT INTO public.group_template_roles (group_template_id, role_template_id, is_default)
        SELECT g.id, t.id, true FROM g, t
      ),
      a AS (
        INSERT INTO public.role_templates (name, description, is_system)
        VALUES ('${TOKEN} Adopted', 'DBT-03: a group still carries a copy', false) RETURNING id
      ),
      h AS (
        INSERT INTO public.role_templates (name, description, is_system)
        VALUES ('${HANDMADE}', 'DBT-03: not a fixture by name', false) RETURNING id
      )
      SELECT (SELECT id::text FROM t) AS leaked, (SELECT id::text FROM g) AS gt,
             (SELECT id::text FROM a) AS adopted, (SELECT id::text FROM h) AS handmade;`)) as Ids[];
    ids = rows[0];

    // The adopter: a real personal group carrying a copy made from the
    // "Adopted" template. The sweep must respect it — it is the provenance
    // line RD-4a exists to protect, and the one reason the sweep leaves a
    // run-tagged template standing.
    holder = await createTestUser({ displayName: `${TOKEN} Holder` });
    const { data: u } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('auth_user_id', holder.user.id)
      .single();
    holderGroupId = u!.personal_group_id as string;
    await runAdminSql(`
      INSERT INTO public.group_roles (group_id, name, created_from_role_template_id)
      VALUES ('${holderGroupId}', '${TOKEN} Adopted', '${ids.adopted}');`);
  });

  afterAll(async () => {
    // Data-level in, data-level out — and by token, so a cell that died
    // before the sweep still leaves nothing. The hand-made control goes by
    // its own name.
    await runAdminSql(`
      DELETE FROM public.group_roles WHERE created_from_role_template_id IN
        (SELECT id FROM public.role_templates WHERE name LIKE '${TOKEN}%');
      DELETE FROM public.group_templates WHERE name LIKE '${TOKEN}%';
      DELETE FROM public.role_templates WHERE name LIKE '${TOKEN}%' OR name = '${HANDMADE}';`).catch(
      (err: Error) => console.error(`[dbt-03 suite teardown] ${err.message}`),
    );
    if (holder) await cleanupTestUser(holder.user.id);
  });

  it('the residue read counts the four catalog classes, and notes the hand-made template without blaming a run', async () => {
    const r = await read(runAdminSql);
    expect(r.fixture_role_templates).toBeGreaterThanOrEqual(2); // leaked + adopted
    expect(r.fixture_role_template_versions).toBeGreaterThanOrEqual(1);
    expect(r.fixture_role_template_publications).toBeGreaterThanOrEqual(1);
    expect(r.fixture_group_templates).toBeGreaterThanOrEqual(1);
    // The note class: present, unattributable, never swept — and never in the
    // residue sum, or a legitimately hand-made template would make the
    // "STILL PRESENT" warning permanent.
    expect(r.foreign_role_templates).toBeGreaterThanOrEqual(1);
  });

  it('the sweep removes the run-tagged catalog rows and their children, and leaves the adopted and the hand-made ones standing', async () => {
    await sweepGovernanceCatalogs(runAdminSql);

    const [after] = (await runAdminSql(`
      SELECT
        (SELECT count(*) FROM public.role_templates WHERE id = '${ids.leaked}') AS leaked,
        (SELECT count(*) FROM public.role_template_versions WHERE role_template_id = '${ids.leaked}') AS leaked_versions,
        (SELECT count(*) FROM public.role_template_publications WHERE role_template_id = '${ids.leaked}') AS leaked_publications,
        (SELECT count(*) FROM public.group_templates WHERE id = '${ids.gt}') AS gt,
        (SELECT count(*) FROM public.group_template_roles WHERE group_template_id = '${ids.gt}') AS gt_roles,
        (SELECT count(*) FROM public.role_templates WHERE id = '${ids.adopted}') AS adopted,
        (SELECT count(*) FROM public.group_roles WHERE created_from_role_template_id = '${ids.adopted}') AS adopted_copies,
        (SELECT count(*) FROM public.role_templates WHERE id = '${ids.handmade}') AS handmade;`)) as Array<
      Record<string, number | string>
    >;

    expect(Number(after.leaked)).toBe(0);
    expect(Number(after.leaked_versions)).toBe(0);
    expect(Number(after.leaked_publications)).toBe(0);
    expect(Number(after.gt)).toBe(0);
    expect(Number(after.gt_roles)).toBe(0);
    // RD-4a's structural reason, respected: a group still carries a copy.
    expect(Number(after.adopted)).toBe(1);
    expect(Number(after.adopted_copies)).toBe(1);
    // Outside the convention: not a run's to sweep.
    expect(Number(after.handmade)).toBe(1);

    // And the read afterwards still says so: the adopted one is fixture
    // residue the sweep respects; the hand-made one stays a note.
    const r = await read(runAdminSql);
    expect(r.fixture_role_templates).toBeGreaterThanOrEqual(1);
    expect(r.foreign_role_templates).toBeGreaterThanOrEqual(1);
  });

  it('the fixture-name convention matches every shape the catalog-writing suites use, and nothing seeded', async () => {
    // Evaluated IN POSTGRES — the sweep runs `~`, not a JS RegExp, so a JS
    // assertion would prove the wrong engine.
    const rows = (await runAdminSql(`
      SELECT n AS name, n ~ '${FIXTURE_CATALOG_NAME_RE}' AS fixture
      FROM (VALUES
        ('pc025xmsq8d0lb Steward Clone'),   -- role-template-editing (the 2026-08-19 leak)
        ('pc029xabc123 clean'),             -- role-template-disposal
        ('RD-A Ambiguous'),                 -- role-provenance-and-retirement
        ('RDB Distributable'),              -- role-publication-and-diff
        ('Steward Role Template'),          -- seeded
        ('RDBX something'),                 -- a near-miss
        ('${HANDMADE}')                     -- this suite's hand-made control
      ) AS v(n);`)) as Array<{ name: string; fixture: boolean }>;
    const byName = Object.fromEntries(rows.map((r) => [r.name, r.fixture]));
    expect(byName['pc025xmsq8d0lb Steward Clone']).toBe(true);
    expect(byName['pc029xabc123 clean']).toBe(true);
    expect(byName['RD-A Ambiguous']).toBe(true);
    expect(byName['RDB Distributable']).toBe(true);
    expect(byName['Steward Role Template']).toBe(false);
    expect(byName['RDBX something']).toBe(false);
    expect(byName[HANDMADE]).toBe(false);

    // The seeded four, by the names production carries today (verified
    // 2026-09-02). A fifth seeded by a later migration shows up as a note,
    // never as a sweep.
    const seeded = (await runAdminSql(
      `SELECT name FROM public.group_templates WHERE name IN (${SEEDED_GROUP_TEMPLATE_NAMES.map(
        (n) => `'${n}'`,
      ).join(', ')}) ORDER BY name;`,
    )) as Array<{ name: string }>;
    expect(seeded.map((s) => s.name)).toEqual([...SEEDED_GROUP_TEMPLATE_NAMES].sort());
  });
});
