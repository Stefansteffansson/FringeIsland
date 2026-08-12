import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import {
  createTestClient,
  createTestUser,
  cleanupTestUser,
  runAdminSql,
  signInWithRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(300_000);

/**
 * FEAT-PC029 gate (RD-C, TASK-RDC-02) — role-template catalogue disposal.
 *
 * RED AT HEAD (pre-migration), by two mechanisms:
 *  - `admin_delete_role_template` does not exist -> every STORY-2/3 cell fails
 *    PGRST202;
 *  - `admin_get_role_templates` carries no `deletable` / `undeletable_reason`
 *    -> every STORY-1 cell reads `undefined` where a boolean or a string is
 *    asserted.
 *
 * THE PREMISE CORRECTION THIS SUITE EXISTS TO PIN (cell "ever offered"):
 * the spec's guard said "zero rows EVER in role_template_publications". It
 * cannot mean that — `admin_unpublish_role_template` HARD-DELETES those rows
 * and the table has no `unpublished_at`. So publish -> unpublish leaves zero
 * rows and a template that WAS offered would read as never-offered and be
 * destroyed, breaching RD-4a in exactly the case RD-4 still protects. "Ever
 * offered" is therefore read from `admin_audit_log`, whose publish record is
 * COMPLETE (earliest publish audit 2026-08-07 predates the earliest surviving
 * publication row, 2026-08-09). Decision taken by Stefan 2026-08-10.
 *
 * The whole suite runs the direct PostgREST path (supabase-js rpc), which is
 * also the adversarial door proof. Nothing else runs against the dev DB
 * concurrently (house rule); fixtures carry the run token.
 */

/** The migration's literals. Asserted verbatim — server-authored copy, checked
 *  against the migration rather than paraphrased (STORY-1's third criterion). */
const REASON = {
  system: 'seeded role templates are part of the platform and can never be deleted',
  notRetired: 'retire this role template before deleting it',
  published: 'this role template was offered to groups and cannot be deleted',
  adopted: 'groups carry copies made from this role template',
} as const;

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

const TOKEN = `pc029x${Date.now().toString(36)}`;

type TemplateEntry = {
  id: string;
  name: string;
  is_system: boolean;
  retired_at: string | null;
  version_count: number;
  instantiated_role_count: number;
  deletable: boolean;
  undeletable_reason: string | null;
};

let admin: TestUser;
let client: SupabaseClient;
/** name -> id, for the fixtures this suite plants. */
const ids: Record<string, string> = {};
let seededSystemId: string;

const listEntry = async (id: string): Promise<TemplateEntry> => {
  const { data, error } = await client.rpc('admin_get_role_templates');
  expect(error).toBeNull();
  const entry = (data as { templates: TemplateEntry[] }).templates.find((t) => t.id === id);
  expect(entry).toBeDefined();
  return entry!;
};

const stillExists = async (id: string): Promise<boolean> => {
  const rows = (await runAdminSql(
    `SELECT count(*)::int AS n FROM public.role_templates WHERE id = '${id}';`,
  )) as unknown as Array<{ n: number }> | undefined;
  // runAdminSql returns rows for SELECTs in this helper family; fall back to a
  // second read if the shape differs, rather than silently passing.
  if (Array.isArray(rows) && rows.length) return Number(rows[0].n) > 0;
  const { data } = await client.rpc('admin_get_role_templates');
  return (data as { templates: TemplateEntry[] }).templates.some((t) => t.id === id);
};

beforeAll(async () => {
  admin = await createTestUser(`${TOKEN}-admin@fringeisland.test`);
  await makePlatformAdmin(admin.personalGroupId);
  client = createTestClient();
  await signInWithRetry(client, admin.email, admin.password);

  // A host group for the "adopted" fixture, and the seeded template for the
  // is_system fixture — both read from the live catalogue rather than assumed.
  await runAdminSql(`
    DO $$
    DECLARE v_host uuid; v_sys uuid;
    BEGIN
      SELECT id INTO v_host FROM public.groups
       WHERE group_type <> 'personal' AND status = 'active' LIMIT 1;
      SELECT id INTO v_sys FROM public.role_templates WHERE is_system LIMIT 1;

      -- CLEAN: retired, never offered, never adopted -> the RD-4a carve-out
      INSERT INTO public.role_templates (name, description, is_system, retired_at)
        VALUES ('${TOKEN} clean', 'disposable', false, now());
      -- LIVE: not retired
      INSERT INTO public.role_templates (name, description, is_system)
        VALUES ('${TOKEN} live', 'not retired', false);
      -- PUB: retired, carries a LIVE publication row
      INSERT INTO public.role_templates (name, description, is_system, retired_at)
        VALUES ('${TOKEN} pub', 'offered', false, now());
      -- UNPUB: retired, NO publication row, but a publish in the audit trail.
      -- THE CORRECTION: published then unpublished. The table says "never
      -- offered"; the truth is "was offered".
      INSERT INTO public.role_templates (name, description, is_system, retired_at)
        VALUES ('${TOKEN} unpub', 'offered then withdrawn', false, now());
      -- ADOPTED: retired, never offered, but a group carries a copy
      INSERT INTO public.role_templates (name, description, is_system, retired_at)
        VALUES ('${TOKEN} adopted', 'copied', false, now());
      -- PRECEDENCE: not retired AND published -> must read not_retired
      INSERT INTO public.role_templates (name, description, is_system)
        VALUES ('${TOKEN} precedence', 'two failures', false);

      INSERT INTO public.role_template_publications (role_template_id, group_id)
        SELECT id, NULL FROM public.role_templates WHERE name = '${TOKEN} pub';
      INSERT INTO public.role_template_publications (role_template_id, group_id)
        SELECT id, NULL FROM public.role_templates WHERE name = '${TOKEN} precedence';

      INSERT INTO public.admin_audit_log (action, target, metadata)
        SELECT 'role_template.publish', id::text, '{"seeded_by":"pc029 suite"}'::jsonb
          FROM public.role_templates WHERE name = '${TOKEN} unpub';

      INSERT INTO public.group_roles (group_id, name, created_from_role_template_id)
        SELECT v_host, '${TOKEN} copy', id
          FROM public.role_templates WHERE name = '${TOKEN} adopted';
    END $$;`);

  const { data } = await client.rpc('admin_get_role_templates');
  for (const t of (data as { templates: TemplateEntry[] }).templates) {
    if (t.name.startsWith(TOKEN)) ids[t.name.replace(`${TOKEN} `, '')] = t.id;
    if (t.is_system && !seededSystemId) seededSystemId = t.id;
  }
});

afterAll(async () => {
  await runAdminSql(`
    DELETE FROM public.group_roles WHERE name = '${TOKEN} copy';
    DELETE FROM public.admin_audit_log
      WHERE target IN (SELECT id::text FROM public.role_templates WHERE name LIKE '${TOKEN}%');
    DELETE FROM public.role_template_publications
      WHERE role_template_id IN (SELECT id FROM public.role_templates WHERE name LIKE '${TOKEN}%');
    DELETE FROM public.role_templates WHERE name LIKE '${TOKEN}%';`).catch(() => undefined);
  await demotePlatformAdmin(admin.personalGroupId).catch(() => undefined);
  // Takes an AUTH USER ID, not the TestUser. Passing the object made this a
  // silent no-op and leaked the fixture on every run; ts-jest does not
  // type-check, so nothing flagged it.
  await cleanupTestUser(admin.user.id);
});

describe('FEAT-PC029 STORY-1 — the list says whether a template can be disposed of, and why not', () => {
  it('every entry carries deletable and undeletable_reason', async () => {
    const { data, error } = await client.rpc('admin_get_role_templates');
    expect(error).toBeNull();
    const templates = (data as { templates: TemplateEntry[] }).templates;
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) {
      expect(typeof t.deletable).toBe('boolean');
      expect(t.undeletable_reason === null || typeof t.undeletable_reason === 'string').toBe(true);
      // the two must never disagree — one predicate, one truth
      expect(t.deletable).toBe(t.undeletable_reason === null);
    }
  });

  it('the RD-4a carve-out reads deletable with no reason', async () => {
    const entry = await listEntry(ids.clean);
    expect(entry.deletable).toBe(true);
    expect(entry.undeletable_reason).toBeNull();
  });

  it('names each failing condition in the migration’s own words', async () => {
    expect((await listEntry(seededSystemId)).undeletable_reason).toBe(REASON.system);
    expect((await listEntry(ids.live)).undeletable_reason).toBe(REASON.notRetired);
    expect((await listEntry(ids.pub)).undeletable_reason).toBe(REASON.published);
    expect((await listEntry(ids.adopted)).undeletable_reason).toBe(REASON.adopted);
    for (const key of ['live', 'pub', 'adopted'] as const) {
      expect((await listEntry(ids[key])).deletable).toBe(false);
    }
  });

  it('THE CORRECTION: a template published then UNPUBLISHED still reads as offered', async () => {
    // Its publication row is gone — unpublish hard-deletes. The table alone
    // would call this pristine. RD-4a protects it, so the audit trail answers.
    const rows = (await runAdminSql(
      `SELECT count(*)::int AS n FROM public.role_template_publications
        WHERE role_template_id = '${ids.unpub}';`,
    )) as unknown as Array<{ n: number }> | undefined;
    if (Array.isArray(rows) && rows.length) expect(Number(rows[0].n)).toBe(0);

    const entry = await listEntry(ids.unpub);
    expect(entry.deletable).toBe(false);
    expect(entry.undeletable_reason).toBe(REASON.published);
  });

  it('precedence is deterministic — system, then not_retired, then published, then adopted', async () => {
    // not retired AND published: the admin must retire it first, so that is
    // what the reason names.
    expect((await listEntry(ids.precedence)).undeletable_reason).toBe(REASON.notRetired);
  });

  it('the widening is ADDITIVE — no existing key changed name, type, or meaning', async () => {
    const entry = await listEntry(ids.clean);
    for (const key of [
      'id',
      'name',
      'description',
      'is_system',
      'default_version_number',
      'retired_at',
      'version_count',
      'group_template_refs',
      'instantiated_role_count',
    ]) {
      expect(Object.prototype.hasOwnProperty.call(entry, key)).toBe(true);
    }
    expect(typeof entry.is_system).toBe('boolean');
    expect(typeof entry.version_count).toBe('number');
    expect(typeof entry.instantiated_role_count).toBe('number');
  });
});

describe('FEAT-PC029 STORY-2 — a template never offered and never adopted can be deleted', () => {
  it('refuses a template that was ever OFFERED, even with no copy surviving today', async () => {
    const { error } = await client.rpc('admin_delete_role_template', {
      p_template_id: ids.pub,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain(REASON.published);
    expect(await stillExists(ids.pub)).toBe(true);
  });

  it('refuses the published-then-unpublished template — the guard’s load-bearing half', async () => {
    const { error } = await client.rpc('admin_delete_role_template', {
      p_template_id: ids.unpub,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain(REASON.published);
    expect(await stillExists(ids.unpub)).toBe(true);
  });

  it('refuses a template groups carry copies of', async () => {
    const { error } = await client.rpc('admin_delete_role_template', {
      p_template_id: ids.adopted,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain(REASON.adopted);
    expect(await stillExists(ids.adopted)).toBe(true);
  });

  it('refuses a template that has not been retired', async () => {
    const { error } = await client.rpc('admin_delete_role_template', {
      p_template_id: ids.live,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain(REASON.notRetired);
    expect(await stillExists(ids.live)).toBe(true);
  });

  it('refuses a seeded template', async () => {
    const { error } = await client.rpc('admin_delete_role_template', {
      p_template_id: seededSystemId,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain(REASON.system);
    expect(await stillExists(seededSystemId)).toBe(true);
  });

  it('refuses a non-admin caller at the gate, and an anonymous Mist too', async () => {
    const outsider = createTestClient();
    const { error: anonErr } = await outsider.rpc('admin_delete_role_template', {
      p_template_id: ids.clean,
    });
    expect(anonErr).not.toBeNull();

    const mist = createTestClient();
    await mist.auth.signInAnonymously();
    const { error: mistErr } = await mist.rpc('admin_delete_role_template', {
      p_template_id: ids.clean,
    });
    expect(mistErr).not.toBeNull();
    expect(mistErr!.message).toMatch(/platform administrator required|permission denied/i);
    expect(await stillExists(ids.clean)).toBe(true);
    await mist.auth.signOut();
  });

  it('deletes the carve-out case, cascading its versions, and reports success', async () => {
    const { data, error } = await client.rpc('admin_delete_role_template', {
      p_template_id: ids.clean,
    });
    expect(error).toBeNull();
    expect((data as { deleted: boolean }).deleted).toBe(true);
    expect(await stillExists(ids.clean)).toBe(false);
  });
});

describe('FEAT-PC029 STORY-3 — the deletion outlives the thing it deleted', () => {
  it('the audit row names what was deleted, captured before the row ceased to exist', async () => {
    const { data, error } = await client.rpc('admin_get_audit_log', {});
    // The audit read's own signature is not this feature's business; if it
    // takes args this cell reads the substrate instead rather than guessing.
    if (error) {
      const rows = (await runAdminSql(
        `SELECT metadata->>'template_name' AS nm, metadata->>'version_count' AS vc
           FROM public.admin_audit_log
          WHERE action = 'role_template.delete' AND target = '${ids.clean}';`,
      )) as unknown as Array<{ nm: string; vc: string }> | undefined;
      expect(Array.isArray(rows) && rows.length).toBeTruthy();
      expect(rows![0].nm).toBe(`${TOKEN} clean`);
      expect(rows![0].vc).not.toBeNull();
      return;
    }
    const rows = (data as Array<{ action: string; target: string; metadata: Record<string, unknown> }>)
      .filter((r) => r.action === 'role_template.delete' && r.target === ids.clean);
    expect(rows.length).toBe(1);
    expect(rows[0].metadata.template_name).toBe(`${TOKEN} clean`);
    expect(rows[0].metadata).toHaveProperty('version_count');
  });

  it('the target resolves to nothing, and the metadata still says what was deleted', async () => {
    expect(await stillExists(ids.clean)).toBe(false);
    const rows = (await runAdminSql(
      `SELECT metadata->>'template_name' AS nm FROM public.admin_audit_log
        WHERE action = 'role_template.delete' AND target = '${ids.clean}';`,
    )) as unknown as Array<{ nm: string }> | undefined;
    if (Array.isArray(rows) && rows.length) expect(rows[0].nm).toBe(`${TOKEN} clean`);
  });

  it('a refusal writes NO deletion row — and no refusal row, which is now the RULED behaviour', async () => {
    // THE ACCEPTANCE CRITERION is "no deletion row was written". That holds.
    //
    // THE SECOND ASSERTION CHANGED MEANING, NOT VALUE (TASK-RDC-03, ruled
    // 2026-08-10). It was written on 2026-08-10 to pin a DEFECT: the family
    // wrote a refusal row and then RAISEd in the same transaction, so Postgres
    // discarded the INSERT along with the exception. Measured across the whole
    // live log at the time: 0 rows matching '%_refused' out of 6 619, against
    // 118 successful retires. Dead code since those functions shipped.
    //
    // The ruling was option 1 — DELETE the dead INSERTs rather than pretend,
    // because Postgres has no autonomous transactions and the alternatives
    // (dblink/pg_background, or turning every refusal into a returned result)
    // cost more than a trail nobody has missed. So this cell now pins a
    // DECISION: refusals are deliberately not audited. It is the deliberate
    // flip the earlier comment promised, and it must stay red-proof — if a
    // refusal row ever appears here again, someone has re-added an INSERT that
    // its own RAISE will discard.
    const rows = (await runAdminSql(
      `SELECT
         (SELECT count(*)::int FROM public.admin_audit_log
           WHERE action = 'role_template.delete' AND target = '${ids.pub}') AS deletions,
         (SELECT count(*)::int FROM public.admin_audit_log
           WHERE action = 'role_template.delete_refused' AND target = '${ids.pub}') AS refusals;`,
    )) as unknown as Array<{ deletions: number; refusals: number }> | undefined;
    if (Array.isArray(rows) && rows.length) {
      expect(Number(rows[0].deletions)).toBe(0);
      expect(Number(rows[0].refusals)).toBe(0);
    }

    // and the refusal genuinely changed nothing
    expect(await stillExists(ids.pub)).toBe(true);
  });
});
