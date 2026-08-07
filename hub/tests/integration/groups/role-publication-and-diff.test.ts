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

/**
 * FEAT-PC028 (Cycle RD-B) — role-template publication, scoped offer, and
 * diff-on-copy contracts.
 *
 * RED-FIRST. Before the migration lands:
 *  - every publish/unpublish call fails PGRST202 (function absent)
 *  - `get_available_role_templates` fails PGRST202
 *  - `get_role_copy_diff` / `apply_role_template_update` fail PGRST202
 *  - the three notification kinds are absent from the registry
 *
 * THE PREMISE PROBE (this file's first describe block) is different, and is
 * the reason it is written before any migration SQL exists.
 *
 * FEAT-PC028 STORY-3 rests on a claim the RD-B dossier makes from source and
 * from the live catalogue: `create_group_role` refuses NEITHER a retired nor
 * an unoffered template today, because its template branch validates
 * existence and nothing else (20260806170000:404-408).
 *
 * Reading a missing predicate is not the same as driving the hole. A refusal
 * could still arrive from a trigger, a grant, or a downstream check that the
 * function body does not name. RD-A shipped two decomposition premises that
 * verification later overturned — both caught at build, neither at spec time.
 * This block is that check, run ON TIME and against the CURRENT contract.
 *
 * So the probe is deliberately written to ASSERT THE HOLE:
 *   - if it passes now, the hole is real and STORY-3 is correctly specified;
 *     the assertions then INVERT when the migration lands (marked below)
 *   - if it fails now, the premise is wrong, and both specs are corrected
 *     before a single line of migration SQL is written
 *
 * It is therefore green-before / red-after by design, which is the inverse of
 * this suite's other cells, and is labelled here so no reader mistakes it for
 * ordinary red-first coverage.
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

const TOKEN = 'RDB';

describe('FEAT-PC028 — publication, scoped offer, diff-on-copy (RD-B)', () => {
  const admin = createAdminClient();
  let steward: TestUser;
  let adminUser: TestUser;

  let stewardTemplateId: string;
  /** A non-system clone RD-B may retire and publish without disturbing the floor. */
  let probeTemplateId: string;

  const createdGroupIds: string[] = [];
  const createdTemplateIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const newGroup = async (u: TestUser, name: string): Promise<string> => {
    const c = await asUser(u);
    const { data, error } = await c.rpc('create_engagement_group', { p_name: name });
    if (error) throw new Error(`newGroup(${name}): ${error.message}`);
    createdGroupIds.push(data as string);
    return data as string;
  };

  beforeAll(async () => {
    steward = await createTestUser({ displayName: `${TOKEN} Steward` });
    adminUser = await createTestUser({ displayName: `${TOKEN} DeusEx Admin` });
    await makePlatformAdmin(adminUser.personalGroupId);

    const { data: templates } = await admin
      .from('role_templates')
      .select('id, name')
      .eq('name', 'Steward Role Template');
    stewardTemplateId = (templates as Array<{ id: string }>)[0].id;

    // A clone of the Steward template: is_system=false, version 1, default set.
    const a = await asUser(adminUser);
    const { data: cloned, error: cloneErr } = await a.rpc('admin_clone_role_template', {
      p_source_id: stewardTemplateId,
      p_name: `${TOKEN} Probe Template`,
    });
    if (cloneErr) throw new Error(`clone: ${cloneErr.message}`);
    probeTemplateId = (cloned as { id: string }).id;
    createdTemplateIds.push(probeTemplateId);
  }, 180_000);

  afterAll(async () => {
    for (const g of createdGroupIds) await cleanupTestGroup(g);
    for (const t of createdTemplateIds) {
      await runAdminSql(`DELETE FROM public.role_templates WHERE id = '${t}';`);
    }
    for (const u of [steward, adminUser]) {
      if (u) await cleanupTestUser(u.user.id).catch(() => undefined);
    }
  }, 180_000);

  // ==========================================================================
  // PREMISE PROBE — dossier Finding 2, driven rather than read.
  // Green BEFORE the migration (the hole is real), red after (it is closed).
  // ==========================================================================
  describe('PREMISE — the write door does not know about retirement (pre-migration)', () => {
    it('P1: a Steward can adopt a RETIRED template through create_group_role', async () => {
      // Retire the clone through the real RD-A door.
      const a = await asUser(adminUser);
      const { error: retireErr } = await a.rpc('admin_retire_role_template', {
        p_role_template_id: probeTemplateId,
      });
      expect(retireErr).toBeNull();

      // Confirm RD-A's READ filter does hold — the template is not offered.
      const c = await asUser(steward);
      const { data: offered } = await c.rpc('get_role_templates');
      const offeredIds = (offered as Array<{ id: string }>).map((t) => t.id);
      expect(offeredIds).not.toContain(probeTemplateId);

      // ...and now adopt it anyway, by id, exactly as a direct PostgREST
      // caller would. ADR-U038: this RPC *is* the API; the picker hiding the
      // template is not an access control.
      const groupId = await newGroup(steward, `${TOKEN} premise probe`);
      const { data: roleId, error } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: `${TOKEN} Adopted While Retired`,
        p_role_template_id: probeTemplateId,
      });

      // PRE-MIGRATION EXPECTATION (the hole):
      expect(error).toBeNull();
      expect(roleId).toBeTruthy();

      // And the copy is fully live — grants materialised by the trigger.
      const grants = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.group_role_permissions
          WHERE group_role_id = '${roleId as string}';`,
      )) as Array<{ n: number }>;
      expect(grants[0].n).toBeGreaterThan(0);

      // POST-MIGRATION (STORY-3): this whole cell inverts — the call is
      // refused, no role row is created, and no grant is materialised.
    }, 180_000);

    it('P2: the refusal, if any, does not come from a trigger or a grant either', async () => {
      // P1 proves the contract permits it. This cell proves nothing ELSE in
      // the substrate refuses it — the reason the catalogue check alone was
      // not treated as sufficient. A second adoption into a second group,
      // asserted at the row level rather than through the RPC's return.
      const c = await asUser(steward);
      const groupId = await newGroup(steward, `${TOKEN} premise probe 2`);
      const { error } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: `${TOKEN} Second Adoption`,
        p_role_template_id: probeTemplateId,
      });
      expect(error).toBeNull();

      const rows = (await runAdminSql(
        `SELECT gr.id, gr.created_from_role_template_id, gr.created_from_version_number,
                rt.retired_at IS NOT NULL AS source_is_retired
           FROM public.group_roles gr
           JOIN public.role_templates rt ON rt.id = gr.created_from_role_template_id
          WHERE gr.group_id = '${groupId}'
            AND gr.created_from_role_template_id = '${probeTemplateId}';`,
      )) as Array<{
        id: string;
        created_from_version_number: number | null;
        source_is_retired: boolean;
      }>;

      // The row exists, is stamped, and its source is provably retired.
      expect(rows).toHaveLength(1);
      expect(rows[0].source_is_retired).toBe(true);
      expect(rows[0].created_from_version_number).toBe(1);
    }, 180_000);

    it('P3: create_engagement_group does not filter retired templates either', async () => {
      // Dossier Finding 5, half one — driven at the row level. The hole is
      // unreachable via group_template_roles today (only system templates are
      // registered there, and those cannot be retired), so this cell asserts
      // the PREDICATE's absence directly rather than a reachable adoption.
      const defs = (await runAdminSql(
        `SELECT (pg_get_functiondef(p.oid) ILIKE '%retired_at%') AS mentions_retired_at
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'create_engagement_group';`,
      )) as Array<{ mentions_retired_at: boolean }>;
      expect(defs[0].mentions_retired_at).toBe(false);

      // POST-MIGRATION (STORY-7): inverts to true, and the reachable cell
      // (a retired template registered to a group template, not instantiating)
      // replaces this catalogue-level assertion.
    }, 120_000);
  });
});
