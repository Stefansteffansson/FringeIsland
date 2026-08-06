import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
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

/** One role entry in the get_group_roles fabric payload, after RD-A widens it. */
type RoleEntry = {
  id: string;
  name: string;
  description: string | null;
  created_from_role_template_id: string | null;
  /** RD-A STORY-1: the version whose materialisation was live at copy time. */
  created_from_version_number: number | null;
  /** RD-A STORY-1: the copied-date. Pre-existing column, newly served. */
  created_at: string;
  holder_count: number;
  permissions: string[];
};

type FabricShape = {
  group_id: string;
  roles: RoleEntry[];
  viewer: { can_manage_roles: boolean; can_assign_roles: boolean; can_remove_roles: boolean };
  available_permissions: Array<{ name: string; category: string }>;
};

type AdminTemplateRow = {
  id: string;
  name: string;
  is_system: boolean;
  default_version_number: number | null;
  /** RD-A STORY-3: nullable retirement stamp; the admin plane shows it. */
  retired_at: string | null;
};

/**
 * FEAT-PC027 (Cycle RD-A) — role provenance, central retirement, and
 * group-side removal of adopted roles.
 *
 * RED-FIRST. Before the migration lands:
 *  - every `created_from_version_number` assert fails (column absent, key absent)
 *  - every `retired_at` assert fails (columns absent, key absent)
 *  - `admin_retire_role_template` / `admin_unretire_role_template` fail PGRST202
 *  - STORY-4's success cells fail 42501 (the contract still refuses
 *    template-derived deletes) and the lockout cell fails by succeeding
 *
 * Labelled honestly (NOT red-first — green before the migration by design):
 *  - S4b (held-by-members P0001) pins FEAT-PC011's INHERITED refusal, which
 *    RD-A must leave exactly as it is (dossier Finding 4). It is a
 *    regression pin, not a new behaviour.
 *  - S4d (availability guard) pins FEAT-PC023's guard firing first. Same
 *    reason: RD-A must not perturb it.
 *  - The ADR-U038 direct-path cells verify the EXISTING lockdown still holds.
 *    `group_roles` carries no DELETE policy and no DELETE grant below
 *    service_role (HYG-A 20260803190000:4533,:4545) — these assert RD-A did
 *    not re-open that door, so they are green before AND after by design.
 *    This is the corrected Finding 3: the contract is the only door.
 */
/** The house idiom — bind a personal group into the DeusEx system group. */
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

const TOKEN = 'RDA';

describe('FEAT-PC027 — provenance, retirement, group-side removal (RD-A)', () => {
  const admin = createAdminClient();
  let steward: TestUser;
  let holder: TestUser; // binds to a role so the held-refusal has a subject
  let plainMember: TestUser;
  let adminUser: TestUser; // platform admin, drives the retire ceremony

  let stewardTemplateId: string;
  let guideTemplateId: string;
  let stewardTemplateVersion: number;
  let guideTemplateVersion: number;

  /** A non-system template RD-A may retire without disturbing the floor. */
  let retirableTemplateId: string;

  const createdGroupIds: string[] = [];
  const createdTemplateIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const newGroup = async (u: TestUser, name: string, templateId?: string): Promise<string> => {
    const c = await asUser(u);
    const args: Record<string, unknown> = { p_name: name };
    if (templateId) args.p_group_template_id = templateId;
    const { data, error } = await c.rpc('create_engagement_group', args);
    if (error) throw new Error(`newGroup(${name}): ${error.message}`);
    createdGroupIds.push(data as string);
    return data as string;
  };

  const fabric = async (c: SupabaseClient, groupId: string): Promise<FabricShape> => {
    const { data, error } = await c.rpc('get_group_roles', { p_group_id: groupId });
    if (error) throw new Error(`get_group_roles: ${error.message}`);
    return data as FabricShape;
  };

  beforeAll(async () => {
    steward = await createTestUser({ displayName: `${TOKEN} Steward` });
    holder = await createTestUser({ displayName: `${TOKEN} Holder` });
    plainMember = await createTestUser({ displayName: `${TOKEN} Plain Fim` });
    adminUser = await createTestUser({ displayName: `${TOKEN} DeusEx Admin` });

    await makePlatformAdmin(adminUser.personalGroupId);

    const { data: templates } = await admin
      .from('role_templates')
      .select('id, name, is_system, default_version_id')
      .in('name', ['Steward Role Template', 'Guide Role Template']);
    const rows = (templates ?? []) as Array<{ id: string; name: string }>;
    stewardTemplateId = rows.find((r) => r.name === 'Steward Role Template')!.id;
    guideTemplateId = rows.find((r) => r.name === 'Guide Role Template')!.id;

    const liveVersion = async (templateId: string): Promise<number> => {
      const rows = (await runAdminSql(
        `SELECT v.version_number FROM public.role_templates rt
           JOIN public.role_template_versions v ON v.id = rt.default_version_id
          WHERE rt.id = '${templateId}';`,
      )) as Array<{ version_number: number }>;
      return rows[0].version_number;
    };
    stewardTemplateVersion = await liveVersion(stewardTemplateId);
    guideTemplateVersion = await liveVersion(guideTemplateId);
  }, 180_000);

  afterAll(async () => {
    for (const g of createdGroupIds) await cleanupTestGroup(g);
    for (const t of createdTemplateIds) {
      await runAdminSql(`DELETE FROM public.role_templates WHERE id = '${t}';`);
    }
    for (const u of [steward, holder, plainMember, adminUser]) {
      if (u) await cleanupTestUser(u.user.id).catch(() => undefined);
    }
  }, 180_000);

  // ==========================================================================
  // STORY-1 — every adopted role records the version it was copied from
  // ==========================================================================
  describe('STORY-1 — the provenance stamp lands at all three doors', () => {
    it('S1a/S1b: door 2 (template-less) stamps every system-template copy', async () => {
      const groupId = await newGroup(steward, 'RD-A doorless');
      const rows = (await runAdminSql(
        `SELECT gr.name, gr.created_from_version_number, gr.created_at,
                rt.is_system
           FROM public.group_roles gr
           JOIN public.role_templates rt ON rt.id = gr.created_from_role_template_id
          WHERE gr.group_id = '${groupId}';`,
      )) as Array<{
        name: string;
        created_from_version_number: number | null;
        created_at: string;
        is_system: boolean;
      }>;

      // WA-6 (20260805150000): template-less instantiation copies the SYSTEM
      // templates only — clones excluded. Cite that migration, never PC025.
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => r.is_system)).toBe(true);
      // The stamp lands on every one of them — a door that misses lies by omission.
      for (const r of rows) {
        expect(r.created_from_version_number).not.toBeNull();
        expect(r.created_at).not.toBeNull();
      }
      const stewardRow = rows.find((r) => r.name === 'Steward Role Template');
      expect(stewardRow?.created_from_version_number).toBe(stewardTemplateVersion);
    }, 120_000);

    it('S1c: door 3 (the pull door) stamps the copy it pulls', async () => {
      const groupId = await newGroup(steward, 'RD-A pull door');
      const c = await asUser(steward);
      const { data: roleId, error } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'RD-A Pulled Guide',
        p_role_template_id: guideTemplateId,
      });
      expect(error).toBeNull();

      const rows = (await runAdminSql(
        `SELECT created_from_version_number, created_from_role_template_id
           FROM public.group_roles WHERE id = '${roleId as string}';`,
      )) as Array<{
        created_from_version_number: number | null;
        created_from_role_template_id: string | null;
      }>;
      expect(rows[0].created_from_role_template_id).toBe(guideTemplateId);
      expect(rows[0].created_from_version_number).toBe(guideTemplateVersion);
    }, 120_000);

    it('S1d: a custom role carries no provenance at all', async () => {
      const groupId = await newGroup(steward, 'RD-A custom');
      const c = await asUser(steward);
      const { data: roleId, error } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'RD-A Bespoke',
        p_permissions: ['view_forum'],
      });
      expect(error).toBeNull();

      const rows = (await runAdminSql(
        `SELECT created_from_version_number, created_from_role_template_id
           FROM public.group_roles WHERE id = '${roleId as string}';`,
      )) as Array<{
        created_from_version_number: number | null;
        created_from_role_template_id: string | null;
      }>;
      expect(rows[0].created_from_role_template_id).toBeNull();
      expect(rows[0].created_from_version_number).toBeNull();
    }, 120_000);

    it('S1e: the stamp records history — an Apply forward does not rewrite it', async () => {
      const groupId = await newGroup(steward, 'RD-A history');
      const c = await asUser(steward);
      const { data: roleId } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'RD-A Frozen Copy',
        p_role_template_id: guideTemplateId,
      });

      const before = (await runAdminSql(
        `SELECT created_from_version_number FROM public.group_roles
          WHERE id = '${roleId as string}';`,
      )) as Array<{ created_from_version_number: number }>;

      // Apply the template forward to a new version via the PC025 ceremony.
      const a = await asUser(adminUser);
      const { data: newVersionId } = await a.rpc('admin_create_role_template_version', {
        p_role_template_id: guideTemplateId,
        p_name: 'Guide Role Template',
        p_description: 'RD-A history probe',
      });
      await a.rpc('admin_set_role_template_default_version', {
        p_role_template_id: guideTemplateId,
        p_version_id: newVersionId as string,
      });

      const after = (await runAdminSql(
        `SELECT created_from_version_number FROM public.group_roles
          WHERE id = '${roleId as string}';`,
      )) as Array<{ created_from_version_number: number }>;

      expect(after[0].created_from_version_number).toBe(before[0].created_from_version_number);
    }, 180_000);

    it('S1f: get_group_roles serves created_from_version_number and created_at', async () => {
      const groupId = await newGroup(steward, 'RD-A payload');
      const c = await asUser(steward);
      const payload = await fabric(c, groupId);

      expect(payload.roles.length).toBeGreaterThan(0);
      for (const entry of payload.roles) {
        // The two keys FEAT-H043's provenance line renders.
        expect(entry).toHaveProperty('created_from_version_number');
        expect(entry).toHaveProperty('created_at');
        expect(Number.isNaN(new Date(entry.created_at).getTime())).toBe(false);
      }
      const stewardRow = payload.roles.find((r) => r.name === 'Steward Role Template')!;
      expect(stewardRow.created_from_version_number).toBe(stewardTemplateVersion);
    }, 120_000);
  });

  // ==========================================================================
  // STORY-2 — pre-existing copies get an honest version or none
  // ==========================================================================
  describe('STORY-2 — the honest-unknown backfill', () => {
    it('S2a: no backfilled row carries a version that is not an unambiguous grant-set match', async () => {
      // The backfill is a one-shot migration-time pass. The durable assertion
      // is the PROPERTY it must leave behind: every non-null stamp on a row
      // that predates the stamp is justified by exactly one matching version.
      const violations = (await runAdminSql(`
        WITH stamped AS (
          SELECT gr.id, gr.created_from_role_template_id AS tmpl,
                 gr.created_from_version_number AS ver,
                 COALESCE((SELECT array_agg(p.name ORDER BY p.name)
                             FROM public.group_role_permissions grp
                             JOIN public.permissions p ON p.id = grp.permission_id
                            WHERE grp.group_role_id = gr.id AND grp.granted),
                          ARRAY[]::text[]) AS grants
            FROM public.group_roles gr
           WHERE gr.created_from_version_number IS NOT NULL
             AND gr.created_from_role_template_id IS NOT NULL
        ),
        matches AS (
          SELECT s.id, s.ver,
                 (SELECT count(*) FROM public.role_template_versions v
                   WHERE v.role_template_id = s.tmpl
                     AND COALESCE((SELECT array_agg(p.name ORDER BY p.name)
                                     FROM public.role_template_version_permissions vp
                                     JOIN public.permissions p ON p.id = vp.permission_id
                                    WHERE vp.role_template_version_id = v.id),
                                  ARRAY[]::text[]) = s.grants) AS match_count
            FROM stamped s
        )
        SELECT count(*)::int AS bad FROM matches WHERE match_count = 0;
      `)) as Array<{ bad: number }>;

      // A stamp with zero matching versions was invented, not derived.
      expect(violations[0].bad).toBe(0);
    }, 120_000);

    it('S2b: an ambiguous grant-set match leaves the stamp NULL, never guessed', async () => {
      // Construct the ambiguity the backfill must refuse to resolve: one
      // template, two versions sharing an identical grant set, one adopted
      // copy predating the stamp.
      const rows = (await runAdminSql(`
        WITH t AS (
          INSERT INTO public.role_templates (name, description, is_system)
          VALUES ('RD-A Ambiguous', 'two versions, one grant set', false)
          RETURNING id
        ),
        v AS (
          INSERT INTO public.role_template_versions (role_template_id, version_number, name, description)
          SELECT t.id, n, 'RD-A Ambiguous', 'v' || n FROM t, generate_series(1, 2) AS n
          RETURNING id, role_template_id
        )
        SELECT (SELECT id FROM t)::text AS template_id;
      `)) as Array<{ template_id: string }>;
      const templateId = rows[0].template_id;
      createdTemplateIds.push(templateId);

      // Both versions carry the same single grant — indistinguishable.
      await runAdminSql(`
        INSERT INTO public.role_template_version_permissions (role_template_version_id, permission_id)
        SELECT v.id, p.id
          FROM public.role_template_versions v
          CROSS JOIN public.permissions p
         WHERE v.role_template_id = '${templateId}' AND p.name = 'view_forum';
      `);

      const groupId = await newGroup(steward, 'RD-A ambiguity');
      const copy = (await runAdminSql(`
        WITH r AS (
          INSERT INTO public.group_roles (group_id, name, description, created_from_role_template_id)
          VALUES ('${groupId}', 'RD-A Ambiguous', 'pre-stamp copy', '${templateId}')
          RETURNING id
        )
        INSERT INTO public.group_role_permissions (group_role_id, permission_id, granted)
        SELECT r.id, p.id, true FROM r CROSS JOIN public.permissions p WHERE p.name = 'view_forum'
        RETURNING group_role_id::text AS id;
      `)) as Array<{ id: string }>;

      // Re-run the backfill's own predicate over this row. Two versions match,
      // so the honest answer is NULL.
      const resolved = (await runAdminSql(`
        SELECT (SELECT count(*) FROM public.role_template_versions v
                 WHERE v.role_template_id = '${templateId}'
                   AND COALESCE((SELECT array_agg(p.name ORDER BY p.name)
                                   FROM public.role_template_version_permissions vp
                                   JOIN public.permissions p ON p.id = vp.permission_id
                                  WHERE vp.role_template_version_id = v.id),
                                ARRAY[]::text[])
                     = COALESCE((SELECT array_agg(p2.name ORDER BY p2.name)
                                   FROM public.group_role_permissions grp
                                   JOIN public.permissions p2 ON p2.id = grp.permission_id
                                  WHERE grp.group_role_id = '${copy[0].id}' AND grp.granted),
                                ARRAY[]::text[]))::int AS match_count,
               (SELECT created_from_version_number FROM public.group_roles
                 WHERE id = '${copy[0].id}') AS stamp;
      `)) as Array<{ match_count: number; stamp: number | null }>;

      expect(resolved[0].match_count).toBe(2); // genuinely ambiguous
      expect(resolved[0].stamp).toBeNull(); // and therefore left unknown
    }, 180_000);
  });

  // ==========================================================================
  // STORY-3 — central retirement
  // ==========================================================================
  describe('STORY-3 — retire stops the offer and reaches nothing else', () => {
    beforeAll(async () => {
      const rows = (await runAdminSql(`
        INSERT INTO public.role_templates (name, description, is_system)
        VALUES ('RD-A Retirable', 'the retire ceremony probe', false)
        RETURNING id::text AS id;
      `)) as Array<{ id: string }>;
      retirableTemplateId = rows[0].id;
      createdTemplateIds.push(retirableTemplateId);
      await runAdminSql(`
        WITH v AS (
          INSERT INTO public.role_template_versions (role_template_id, version_number, name, description)
          VALUES ('${retirableTemplateId}', 1, 'RD-A Retirable', 'v1')
          RETURNING id
        )
        UPDATE public.role_templates SET default_version_id = v.id
          FROM v WHERE public.role_templates.id = '${retirableTemplateId}';
      `);
    }, 120_000);

    it('S3a: retire sets retired_at/retired_by and modifies no group row anywhere', async () => {
      // Adopt the template into a group FIRST, so the invariant has a subject.
      const groupId = await newGroup(steward, 'RD-A adopter');
      const c = await asUser(steward);
      const { data: roleId } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'RD-A Retirable',
        p_role_template_id: retirableTemplateId,
      });

      const snapshot = async () =>
        (await runAdminSql(`
          SELECT
            (SELECT count(*)::int FROM public.group_roles) AS roles,
            (SELECT count(*)::int FROM public.group_role_permissions) AS grants,
            (SELECT count(*)::int FROM public.role_template_versions) AS versions,
            (SELECT md5(string_agg(gr.id::text || coalesce(gr.created_from_version_number::text,'-'), ','
                        ORDER BY gr.id))
               FROM public.group_roles gr) AS role_digest;
        `)) as Array<{ roles: number; grants: number; versions: number; role_digest: string }>;

      const before = (await snapshot())[0];
      const a = await asUser(adminUser);
      const { error } = await a.rpc('admin_retire_role_template', {
        p_role_template_id: retirableTemplateId,
      });
      expect(error).toBeNull();
      const after = (await snapshot())[0];

      // RD-2/RD-4: retire flips offerability ONLY.
      expect(after.roles).toBe(before.roles);
      expect(after.grants).toBe(before.grants);
      expect(after.versions).toBe(before.versions);
      expect(after.role_digest).toBe(before.role_digest);

      const stamp = (await runAdminSql(
        `SELECT retired_at, retired_by FROM public.role_templates
          WHERE id = '${retirableTemplateId}';`,
      )) as Array<{ retired_at: string | null; retired_by: string | null }>;
      expect(stamp[0].retired_at).not.toBeNull();
      expect(stamp[0].retired_by).toBe(adminUser.personalGroupId);

      // S3d: the adopted copy is untouched and still reports its provenance.
      const copy = (await runAdminSql(
        `SELECT created_from_role_template_id, created_from_version_number
           FROM public.group_roles WHERE id = '${roleId as string}';`,
      )) as Array<{
        created_from_role_template_id: string;
        created_from_version_number: number | null;
      }>;
      expect(copy[0].created_from_role_template_id).toBe(retirableTemplateId);
      expect(copy[0].created_from_version_number).toBe(1);
    }, 180_000);

    it('S3b: get_role_templates stops offering a retired template', async () => {
      const c = await asUser(steward);
      const { data, error } = await c.rpc('get_role_templates');
      expect(error).toBeNull();
      const ids = (data as Array<{ id: string }>).map((t) => t.id);
      expect(ids).not.toContain(retirableTemplateId);
      // The floor is still offered — retire is not a catalogue wipe.
      expect(ids).toContain(stewardTemplateId);
    }, 120_000);

    it('S3c: admin_get_role_templates keeps it, marked, and serves retired_at', async () => {
      const a = await asUser(adminUser);
      const { data, error } = await a.rpc('admin_get_role_templates');
      expect(error).toBeNull();
      const templates = (data as { templates: AdminTemplateRow[] }).templates;
      const row = templates.find((t) => t.id === retirableTemplateId);

      // The admin plane shows the WHOLE catalogue including what it stopped offering.
      expect(row).toBeDefined();
      expect(row!.retired_at).not.toBeNull();
      // Every entry carries the key, retired or not — the render reads it unconditionally.
      for (const t of templates) expect(t).toHaveProperty('retired_at');
      expect(templates.find((t) => t.id === stewardTemplateId)!.retired_at).toBeNull();
    }, 120_000);

    it('S3e: unretire is the same door in reverse', async () => {
      const a = await asUser(adminUser);
      const { error } = await a.rpc('admin_unretire_role_template', {
        p_role_template_id: retirableTemplateId,
      });
      expect(error).toBeNull();

      const stamp = (await runAdminSql(
        `SELECT retired_at, retired_by FROM public.role_templates
          WHERE id = '${retirableTemplateId}';`,
      )) as Array<{ retired_at: string | null; retired_by: string | null }>;
      expect(stamp[0].retired_at).toBeNull();
      expect(stamp[0].retired_by).toBeNull();

      const c = await asUser(steward);
      const { data } = await c.rpc('get_role_templates');
      expect((data as Array<{ id: string }>).map((t) => t.id)).toContain(retirableTemplateId);
    }, 120_000);

    it('S3f: a system template cannot be retired — the four seeded roles are the floor', async () => {
      const a = await asUser(adminUser);
      const { error } = await a.rpc('admin_retire_role_template', {
        p_role_template_id: stewardTemplateId,
      });
      expect(error).not.toBeNull();

      const stamp = (await runAdminSql(
        `SELECT retired_at FROM public.role_templates WHERE id = '${stewardTemplateId}';`,
      )) as Array<{ retired_at: string | null }>;
      expect(stamp[0].retired_at).toBeNull();
    }, 120_000);

    it('S3g: a non-admin cannot retire anything (42501)', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('admin_retire_role_template', {
        p_role_template_id: retirableTemplateId,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');
    }, 120_000);
  });

  // ==========================================================================
  // STORY-4 — group-side removal of an adopted role
  // ==========================================================================
  describe('STORY-4 — a Steward can remove a role the group adopted', () => {
    it('S4a: a template-derived, unheld role is deleted by a Steward with manage_roles', async () => {
      const groupId = await newGroup(steward, 'RD-A removal');
      const c = await asUser(steward);
      const { data: roleId } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'RD-A Removable Guide',
        p_role_template_id: guideTemplateId,
      });

      // THE inversion: this refused with 42501 before RD-A.
      const { error } = await c.rpc('delete_group_role', {
        p_group_role_id: roleId as string,
      });
      expect(error).toBeNull();

      const gone = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.group_roles WHERE id = '${roleId as string}';`,
      )) as Array<{ n: number }>;
      expect(gone[0].n).toBe(0);

      // S4e: the source template and its versions are untouched — group-side
      // removal is the group's act on its own property.
      const src = (await runAdminSql(
        `SELECT (SELECT count(*)::int FROM public.role_templates WHERE id = '${guideTemplateId}') AS tmpl,
                (SELECT count(*)::int FROM public.role_template_versions
                  WHERE role_template_id = '${guideTemplateId}') AS versions;`,
      )) as Array<{ tmpl: number; versions: number }>;
      expect(src[0].tmpl).toBe(1);
      expect(src[0].versions).toBeGreaterThan(0);
    }, 180_000);

    it('S4b: held by members — refused with the inherited P0001, unchanged [regression pin, not red-first]', async () => {
      const groupId = await newGroup(steward, 'RD-A held');
      const c = await asUser(steward);
      const { data: roleId } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'RD-A Held Guide',
        p_role_template_id: guideTemplateId,
      });

      await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: holder.personalGroupId,
        status: 'active',
        added_by_group_id: steward.personalGroupId,
      });
      await admin.from('user_group_roles').insert({
        member_group_id: holder.personalGroupId,
        group_id: groupId,
        group_role_id: roleId as string,
        assigned_by_group_id: steward.personalGroupId,
      });

      const { error } = await c.rpc('delete_group_role', {
        p_group_role_id: roleId as string,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      // The refusal string IS the product copy — H043 renders it verbatim.
      expect(error!.message).toContain('role is held by members');
    }, 180_000);

    it('S4c: removing the sole definer of a protected permission is refused, naming what would be lost', async () => {
      const groupId = await newGroup(steward, 'RD-A lockout');
      const c = await asUser(steward);
      const payload = await fabric(c, groupId);
      const stewardRole = payload.roles.find((r) => r.name === 'Steward Role Template')!;

      // The Steward template is the SOLE definer of all six protected
      // permissions among the system templates (verified against the live
      // catalogue) — Guide/Member/Observer grant none of them.
      expect(stewardRole.permissions).toContain('manage_roles');

      // Reach the guard the way a Steward actually would: the held-by-members
      // refusal fires FIRST, so the holders must be stripped before the delete
      // is even attempted. That is precisely what makes the lockout reachable
      // — and why the guard is by definer, not by holder (a holder-based test
      // could never fire from this line; see the migration's ordering note).
      await runAdminSql(
        `DELETE FROM public.user_group_roles WHERE group_role_id = '${stewardRole.id}';`,
      );

      const { error } = await c.rpc('delete_group_role', {
        p_group_role_id: stewardRole.id,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      // The refusal names the permissions that would be lost, not just that
      // something would be.
      expect(error!.message).toContain('manage_roles');
      expect(error!.message).toContain('no holder of');

      // And the role survives its own refusal.
      const alive = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.group_roles WHERE id = '${stewardRole.id}';`,
      )) as Array<{ n: number }>;
      expect(alive[0].n).toBe(1);
    }, 180_000);

    it('S4d: a suspended group refuses first via the availability guard [regression pin, not red-first]', async () => {
      const groupId = await newGroup(steward, 'RD-A suspended');
      const c = await asUser(steward);
      const { data: roleId } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'RD-A Suspended Guide',
        p_role_template_id: guideTemplateId,
      });

      await runAdminSql(`UPDATE public.groups SET status = 'suspended' WHERE id = '${groupId}';`);
      const { error } = await c.rpc('delete_group_role', {
        p_group_role_id: roleId as string,
      });
      // PC023's assert_group_writable fires BEFORE any RD-A branch. Assert the
      // guard's own refusal by name — a bare not-null passes on whichever
      // refusal happens to fire first, which is exactly how an ordering
      // regression would hide here.
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      expect(error!.message).toContain('group is suspended');
      await runAdminSql(`UPDATE public.groups SET status = 'active' WHERE id = '${groupId}';`);
    }, 180_000);
  });

  // ==========================================================================
  // ADR-U038 — the direct PostgREST path refuses what the contract refuses
  // ==========================================================================
  describe('ADR-U038 — the substrate refuses what the route refuses', () => {
    it('group_roles carries no DELETE door below service_role — the contract is the only way in', async () => {
      // Finding 3 as CORRECTED: HYG-A dropped group_roles_delete and revoked
      // the DELETE grant. RD-A must not re-open it. This cell is the guard
      // against a well-meaning "relax the RLS rule" reading of the old spec.
      const policies = (await runAdminSql(`
        SELECT coalesce(string_agg(policyname || ':' || cmd, ',' ORDER BY policyname), '') AS p
          FROM pg_policies WHERE schemaname = 'public' AND tablename = 'group_roles';
      `)) as Array<{ p: string }>;
      expect(policies[0].p).toBe('group_roles_select:SELECT');

      const grants = (await runAdminSql(`
        SELECT coalesce(string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type), '') AS g
          FROM information_schema.role_table_grants
         WHERE table_schema = 'public' AND table_name = 'group_roles'
           AND grantee IN ('authenticated', 'anon') AND privilege_type = 'DELETE';
      `)) as Array<{ g: string }>;
      expect(grants[0].g).toBe('');
    }, 120_000);

    it('a member without manage_roles is refused the removal the Steward is now allowed', async () => {
      const groupId = await newGroup(steward, 'RD-A adversarial');
      const c = await asUser(steward);
      const { data: roleId } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: 'RD-A Guarded Guide',
        p_role_template_id: guideTemplateId,
      });
      await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: plainMember.personalGroupId,
        status: 'active',
        added_by_group_id: steward.personalGroupId,
      });

      const m = await asUser(plainMember);
      const { error } = await m.rpc('delete_group_role', {
        p_group_role_id: roleId as string,
      });
      // Opening the affordance for template-derived roles must not open it
      // for callers who never had manage_roles.
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');

      // And the direct table path is closed to them too.
      const { error: directErr } = await m
        .from('group_roles')
        .delete()
        .eq('id', roleId as string);
      const stillThere = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.group_roles WHERE id = '${roleId as string}';`,
      )) as Array<{ n: number }>;
      expect(stillThere[0].n).toBe(1);
      void directErr;
    }, 180_000);
  });
});
