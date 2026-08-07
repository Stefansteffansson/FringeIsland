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
 *  - publish / unpublish / get_available_role_templates / get_role_copy_diff /
 *    apply_role_template_update all fail PGRST202 (function absent)
 *  - role_template_publications does not exist
 *  - the `roles` category and the three kinds are absent from the registry
 *  - STORY-3's refusal cells fail BY SUCCEEDING — the write door currently
 *    permits what they assert it refuses
 *  - STORY-7's predicate cell fails (no retirement predicate on either branch)
 *
 * THE PREMISE, ALREADY DRIVEN (commit ab2cc7b, before any migration SQL).
 * FEAT-PC028 STORY-3 rests on a claim the dossier made from source and from
 * the live catalogue: `create_group_role` refuses neither a retired nor an
 * unoffered template (20260806170000:404-408 validates existence and nothing
 * else). Reading a missing predicate is not proof of reachability — a trigger
 * or a grant could still have refused. So it was driven to completion first:
 *
 *   P1  a Steward adopted a RETIRED template; the call succeeded, the copy
 *       was created, and its grants materialised
 *   P2  asserted at the row level, not through the RPC return — the row
 *       existed, stamped v1, source provably retired. Nothing else refused
 *   P3  create_engagement_group carried no retirement predicate
 *
 * All three passed, so the premise stands and no spec correction was owed.
 * Those probe cells have now become the STORY-3 / STORY-7 cells below, which
 * assert the TARGET behaviour and are red until the migration lands. The
 * probe survives in git history; this file asserts where we are going.
 *
 * Labelled honestly — NOT red-first, green before AND after by design:
 *  - S3d (the manage_roles check fires first) pins FEAT-PC011's existing
 *    anti-escalation refusal, which RD-B must leave exactly as it is
 *  - S3e (assert_group_writable fires first) pins FEAT-PC023's guard
 *  - S3c (a published template adopts cleanly) and S3f (the custom path is
 *    untouched) are POSITIVE-path pins: they guard against the new scope
 *    check over-refusing. Green today because no scope check exists at all;
 *    load-bearing the moment one does
 *  - S7b (a template-less group still gets the four system roles) pins WA-6,
 *    which STORY-7's predicate must not perturb
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

type OfferRow = {
  id: string;
  name: string;
  description: string | null;
  /** RD-B STORY-2: the three adoption keys the payload walk added. */
  adopted_group_role_id: string | null;
  adopted_version_number: number | null;
  current_version_number: number | null;
};

type DiffShape = {
  added: string[];
  removed: string[];
  unchanged: string[];
  from_version: number | null;
  to_version: number | null;
};

const TOKEN = 'RDB';

describe('FEAT-PC028 — publication, scoped offer, diff-on-copy (RD-B)', () => {
  const admin = createAdminClient();
  let steward: TestUser;
  let otherSteward: TestUser;
  let plainMember: TestUser;
  let adminUser: TestUser;

  let stewardTemplateId: string;
  /** A non-system clone RD-B may publish, retire, and diff against. */
  let clonedTemplateId: string;

  /** Group A is the publish target; group B is the one that must not see it. */
  let groupA: string;
  let groupB: string;

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

  const offers = async (c: SupabaseClient, groupId: string): Promise<OfferRow[]> => {
    const { data, error } = await c.rpc('get_available_role_templates', { p_group_id: groupId });
    if (error) throw new Error(`get_available_role_templates: ${error.message}`);
    return data as OfferRow[];
  };

  /** Publications are cleared between cells so scope assertions stay independent. */
  const clearPublications = async () => {
    await runAdminSql(
      `DELETE FROM public.role_template_publications WHERE role_template_id = '${clonedTemplateId}';`,
    ).catch(() => undefined);
  };

  beforeAll(async () => {
    steward = await createTestUser({ displayName: `${TOKEN} Steward` });
    otherSteward = await createTestUser({ displayName: `${TOKEN} Other` });
    plainMember = await createTestUser({ displayName: `${TOKEN} Plain` });
    adminUser = await createTestUser({ displayName: `${TOKEN} DeusEx Admin` });
    await makePlatformAdmin(adminUser.personalGroupId);

    const { data: templates } = await admin
      .from('role_templates')
      .select('id, name')
      .eq('name', 'Steward Role Template');
    stewardTemplateId = (templates as Array<{ id: string }>)[0].id;

    const a = await asUser(adminUser);
    const { data: cloned, error: cloneErr } = await a.rpc('admin_clone_role_template', {
      p_source_id: stewardTemplateId,
      p_name: `${TOKEN} Distributable`,
    });
    if (cloneErr) throw new Error(`clone: ${cloneErr.message}`);
    clonedTemplateId = (cloned as { id: string }).id;
    createdTemplateIds.push(clonedTemplateId);

    groupA = await newGroup(steward, `${TOKEN} Group A`);
    groupB = await newGroup(otherSteward, `${TOKEN} Group B`);
  }, 240_000);

  afterAll(async () => {
    for (const g of createdGroupIds) await cleanupTestGroup(g);
    for (const t of createdTemplateIds) {
      await runAdminSql(`DELETE FROM public.role_templates WHERE id = '${t}';`);
    }
    for (const u of [steward, otherSteward, plainMember, adminUser]) {
      if (u) await cleanupTestUser(u.user.id).catch(() => undefined);
    }
  }, 240_000);

  // ==========================================================================
  // STORY-1 — publish to one group, several, or all
  // ==========================================================================
  describe('STORY-1 — scoped publish is data, not a flag', () => {
    it('S1a: publishing to named groups writes one row per group', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      const { error } = await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA, groupB],
      });
      expect(error).toBeNull();

      const rows = (await runAdminSql(
        `SELECT group_id, published_by, published_at IS NOT NULL AS stamped
           FROM public.role_template_publications
          WHERE role_template_id = '${clonedTemplateId}' ORDER BY group_id;`,
      )) as Array<{ group_id: string | null; published_by: string; stamped: boolean }>;
      expect(rows).toHaveLength(2);
      expect(rows.every((r) => r.stamped)).toBe(true);
      expect(rows.every((r) => r.published_by === adminUser.personalGroupId)).toBe(true);
      expect(rows.map((r) => r.group_id).sort()).toEqual([groupA, groupB].sort());
    }, 180_000);

    it('S1b: publishing with no group list writes ONE platform-wide row (NULL scope)', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      const { error } = await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
      });
      expect(error).toBeNull();

      const rows = (await runAdminSql(
        `SELECT group_id FROM public.role_template_publications
          WHERE role_template_id = '${clonedTemplateId}';`,
      )) as Array<{ group_id: string | null }>;
      expect(rows).toHaveLength(1);
      expect(rows[0].group_id).toBeNull();
    }, 180_000);

    it('S1c: re-publishing platform-wide is idempotent, not a unique violation', async () => {
      // RDB-5. This is also the partial-unique-index cell: a plain
      // UNIQUE(role_template_id, group_id) would NOT catch a second NULL row,
      // because NULLs are distinct in a UNIQUE constraint.
      const a = await asUser(adminUser);
      const { data, error } = await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
      });
      expect(error).toBeNull();
      expect((data as { already_published: boolean }).already_published).toBe(true);

      const rows = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.role_template_publications
          WHERE role_template_id = '${clonedTemplateId}' AND group_id IS NULL;`,
      )) as Array<{ n: number }>;
      expect(rows[0].n).toBe(1);
    }, 180_000);

    it('S1d: re-publishing a targeted group preserves its original published_at', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA],
      });
      const first = (await runAdminSql(
        `SELECT published_at FROM public.role_template_publications
          WHERE role_template_id = '${clonedTemplateId}' AND group_id = '${groupA}';`,
      )) as Array<{ published_at: string }>;

      await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA, groupB],
      });
      const after = (await runAdminSql(
        `SELECT group_id, published_at FROM public.role_template_publications
          WHERE role_template_id = '${clonedTemplateId}' ORDER BY group_id;`,
      )) as Array<{ group_id: string; published_at: string }>;

      expect(after).toHaveLength(2);
      const aRow = after.find((r) => r.group_id === groupA)!;
      expect(new Date(aRow.published_at).getTime()).toBe(
        new Date(first[0].published_at).getTime(),
      );
    }, 180_000);

    it('S1e: an EMPTY group array is refused 22023, never read as platform-wide', async () => {
      const a = await asUser(adminUser);
      const { error } = await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [],
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('22023');
    }, 180_000);

    it('S1f: publishing a RETIRED template is refused', async () => {
      const a = await asUser(adminUser);
      await a.rpc('admin_retire_role_template', { p_role_template_id: clonedTemplateId });
      const { error } = await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA],
      });
      expect(error).not.toBeNull();
      // Not vacuous: a missing function also produces an error. The refusal
      // must come from the contract's own logic, not from PGRST202.
      expect(error!.code).not.toBe('PGRST202');
      await a.rpc('admin_unretire_role_template', { p_role_template_id: clonedTemplateId });
    }, 180_000);

    it('S1g: a non-admin is refused 42501 on publish AND unpublish', async () => {
      const c = await asUser(steward);
      for (const fn of ['admin_publish_role_template', 'admin_unpublish_role_template']) {
        const { error } = await c.rpc(fn, {
          p_role_template_id: clonedTemplateId,
          p_group_ids: [groupA],
        });
        expect(error).not.toBeNull();
        expect(error!.code).toBe('42501');
      }
    }, 180_000);

    it('S1h: unpublish removes the reach and leaves adopted copies working', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA],
      });
      const c = await asUser(steward);
      const { data: roleId } = await c.rpc('create_group_role', {
        p_group_id: groupA,
        p_name: `${TOKEN} Adopted Then Unpublished`,
        p_role_template_id: clonedTemplateId,
      });

      await a.rpc('admin_unpublish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA],
      });

      const rows = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.role_template_publications
          WHERE role_template_id = '${clonedTemplateId}' AND group_id = '${groupA}';`,
      )) as Array<{ n: number }>;
      expect(rows[0].n).toBe(0);

      // RD-2: withdrawing an offer never reaches into a group.
      const copy = (await runAdminSql(
        `SELECT gr.id, count(grp.permission_id)::int AS grants
           FROM public.group_roles gr
           LEFT JOIN public.group_role_permissions grp ON grp.group_role_id = gr.id
          WHERE gr.id = '${roleId as string}' GROUP BY gr.id;`,
      )) as Array<{ id: string; grants: number }>;
      expect(copy).toHaveLength(1);
      expect(copy[0].grants).toBeGreaterThan(0);
    }, 240_000);
  });

  // ==========================================================================
  // STORY-2 — the scoped offer read
  // ==========================================================================
  describe('STORY-2 — a Steward sees only what is offered to their group', () => {
    it('S2a: a targeted publication reaches its group and no other', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA],
      });

      const inA = await offers(await asUser(steward), groupA);
      const inB = await offers(await asUser(otherSteward), groupB);
      expect(inA.map((t) => t.id)).toContain(clonedTemplateId);
      expect(inB.map((t) => t.id)).not.toContain(clonedTemplateId);
    }, 180_000);

    it('S2b: a platform-wide publication reaches every group', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', { p_role_template_id: clonedTemplateId });

      for (const [u, g] of [
        [steward, groupA],
        [otherSteward, groupB],
      ] as Array<[TestUser, string]>) {
        const rows = await offers(await asUser(u), g);
        expect(rows.map((t) => t.id)).toContain(clonedTemplateId);
      }
    }, 180_000);

    it('S2c: an UNPUBLISHED clone reaches nobody', async () => {
      await clearPublications();
      const rows = await offers(await asUser(steward), groupA);
      expect(rows.map((t) => t.id)).not.toContain(clonedTemplateId);
    }, 180_000);

    it('S2d: system templates are always offered, publication rows or not', async () => {
      await clearPublications();
      const rows = await offers(await asUser(steward), groupA);
      expect(rows.map((t) => t.id)).toContain(stewardTemplateId);
    }, 180_000);

    it('S2e: retirement and scope are INDEPENDENT filters — both must pass', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', { p_role_template_id: clonedTemplateId });
      await a.rpc('admin_retire_role_template', { p_role_template_id: clonedTemplateId });

      const rows = await offers(await asUser(steward), groupA);
      expect(rows.map((t) => t.id)).not.toContain(clonedTemplateId);

      // RDB-6: the publication row SURVIVES retirement, so unretire restores
      // the prior reach rather than silently publishing to nobody.
      const pubs = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.role_template_publications
          WHERE role_template_id = '${clonedTemplateId}';`,
      )) as Array<{ n: number }>;
      expect(pubs[0].n).toBe(1);

      await a.rpc('admin_unretire_role_template', { p_role_template_id: clonedTemplateId });
      const back = await offers(await asUser(steward), groupA);
      expect(back.map((t) => t.id)).toContain(clonedTemplateId);
    }, 240_000);

    it('S2f: an adopted template carries the three adoption keys', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', { p_role_template_id: clonedTemplateId });

      const c = await asUser(steward);
      const { data: roleId } = await c.rpc('create_group_role', {
        p_group_id: groupA,
        p_name: `${TOKEN} Adoption Keys`,
        p_role_template_id: clonedTemplateId,
      });

      const row = (await offers(c, groupA)).find((t) => t.id === clonedTemplateId)!;
      expect(row.adopted_group_role_id).toBe(roleId);
      expect(row.adopted_version_number).toBe(1);
      expect(row.current_version_number).toBe(1);
    }, 240_000);

    it('S2g: an un-stamped copy yields a null adopted_version_number, not a guess', async () => {
      // RD-10's honest-unknown, surfaced through the offer read.
      const c = await asUser(steward);
      await runAdminSql(
        `UPDATE public.group_roles SET created_from_version_number = NULL
          WHERE group_id = '${groupA}' AND created_from_role_template_id = '${clonedTemplateId}';`,
      );
      const row = (await offers(c, groupA)).find((t) => t.id === clonedTemplateId)!;
      expect(row.adopted_group_role_id).not.toBeNull();
      expect(row.adopted_version_number).toBeNull();
      expect(row.current_version_number).toBe(1);
    }, 180_000);

    it('S2h: the zero-arg get_role_templates() is GONE', async () => {
      // RDB-1: one door onto offerability, not two.
      const c = await asUser(steward);
      const { error } = await c.rpc('get_role_templates');
      expect(error).not.toBeNull();
      expect(error!.code).toBe('PGRST202');
    }, 180_000);
  });

  // ==========================================================================
  // STORY-3 — the write door (the premise, driven in ab2cc7b, now asserted)
  // ==========================================================================
  describe('STORY-3 — adoption refuses what is not offered', () => {
    it('S3a: a RETIRED template cannot be adopted, not merely hidden', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', { p_role_template_id: clonedTemplateId });
      await a.rpc('admin_retire_role_template', { p_role_template_id: clonedTemplateId });

      const c = await asUser(steward);
      const groupId = await newGroup(steward, `${TOKEN} retired adopt`);
      const { error } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: `${TOKEN} Should Not Exist`,
        p_role_template_id: clonedTemplateId,
      });
      expect(error).not.toBeNull();

      const rows = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.group_roles
          WHERE group_id = '${groupId}'
            AND created_from_role_template_id = '${clonedTemplateId}';`,
      )) as Array<{ n: number }>;
      expect(rows[0].n).toBe(0);

      await a.rpc('admin_unretire_role_template', { p_role_template_id: clonedTemplateId });
    }, 240_000);

    it('S3b: a template not published to THIS group cannot be adopted across the boundary', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA],
      });

      // otherSteward learns the id from elsewhere and tries it in group B.
      const c = await asUser(otherSteward);
      const { error } = await c.rpc('create_group_role', {
        p_group_id: groupB,
        p_name: `${TOKEN} Cross Boundary`,
        p_role_template_id: clonedTemplateId,
      });
      expect(error).not.toBeNull();
    }, 240_000);

    it('S3c: a published template adopts cleanly, stamped as RD-A specified', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupB],
      });

      const c = await asUser(otherSteward);
      const { data: roleId, error } = await c.rpc('create_group_role', {
        p_group_id: groupB,
        p_name: `${TOKEN} Properly Offered`,
        p_role_template_id: clonedTemplateId,
      });
      expect(error).toBeNull();

      const rows = (await runAdminSql(
        `SELECT created_from_role_template_id, created_from_version_number
           FROM public.group_roles WHERE id = '${roleId as string}';`,
      )) as Array<{
        created_from_role_template_id: string;
        created_from_version_number: number | null;
      }>;
      expect(rows[0].created_from_role_template_id).toBe(clonedTemplateId);
      expect(rows[0].created_from_version_number).toBe(1);
    }, 240_000);

    it('S3d: NOT red-first — the manage_roles check still fires FIRST', async () => {
      // FEAT-PC011's anti-escalation pin. Green before and after by design:
      // the permission check must precede the offerability check, so a member
      // without manage_roles never learns whether a template is offered.
      const c = await asUser(plainMember);
      const { error } = await c.rpc('create_group_role', {
        p_group_id: groupA,
        p_name: `${TOKEN} No Permission`,
        p_role_template_id: clonedTemplateId,
      });
      expect(error).not.toBeNull();
      expect(['42501', 'P0002']).toContain(error!.code);
    }, 180_000);

    it('S3e: NOT red-first — assert_group_writable still fires first on a rested group', async () => {
      // FEAT-PC023's availability guard, pinned unchanged.
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', { p_role_template_id: clonedTemplateId });

      const groupId = await newGroup(steward, `${TOKEN} rested`);
      await runAdminSql(
        `UPDATE public.groups SET status = 'resting' WHERE id = '${groupId}';`,
      );
      const c = await asUser(steward);
      const { error } = await c.rpc('create_group_role', {
        p_group_id: groupId,
        p_name: `${TOKEN} Rested Adopt`,
        p_role_template_id: clonedTemplateId,
      });
      expect(error).not.toBeNull();
      await runAdminSql(`UPDATE public.groups SET status = 'active' WHERE id = '${groupId}';`);
    }, 240_000);

    it('S3f: the CUSTOM path is untouched — no offer to check', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('create_group_role', {
        p_group_id: groupA,
        p_name: `${TOKEN} Custom Role`,
        p_permissions: ['invite_members'],
      });
      expect(error).toBeNull();
    }, 180_000);
  });

  // ==========================================================================
  // STORY-4 / STORY-5 — the diff, and applying it
  // ==========================================================================
  describe('STORY-4/5 — the diff is against CURRENT grants, and apply is set-equality', () => {
    /** Adopt the clone into group A and return the new role's id. */
    const adopt = async (name: string): Promise<string> => {
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', { p_role_template_id: clonedTemplateId });
      const c = await asUser(steward);
      const { data, error } = await c.rpc('create_group_role', {
        p_group_id: groupA,
        p_name: name,
        p_role_template_id: clonedTemplateId,
      });
      if (error) throw new Error(`adopt(${name}): ${error.message}`);
      return data as string;
    };

    const diff = async (c: SupabaseClient, roleId: string): Promise<DiffShape> => {
      const { data, error } = await c.rpc('get_role_copy_diff', { p_group_role_id: roleId });
      if (error) throw new Error(`get_role_copy_diff: ${error.message}`);
      return data as DiffShape;
    };

    it('S4a: an untouched copy of an unmoved template diffs to nothing', async () => {
      const roleId = await adopt(`${TOKEN} Untouched`);
      const d = await diff(await asUser(steward), roleId);
      expect(d.added).toHaveLength(0);
      expect(d.removed).toHaveLength(0);
      expect(d.from_version).toBe(d.to_version);
    }, 240_000);

    it('S4b: THE RD-3 CELL — a permission the Steward REVOKED shows as ADDED', async () => {
      // This is the acceptance criterion the whole of RD-3 exists for, and
      // the one a version-vs-version implementation fails: the template has
      // not moved at all, so a template-side delta would be EMPTY here and
      // the ceremony would silently re-grant what the Steward removed.
      const roleId = await adopt(`${TOKEN} Revoked`);
      const c = await asUser(steward);

      const before = (await runAdminSql(
        `SELECT p.name FROM public.group_role_permissions grp
           JOIN public.permissions p ON p.id = grp.permission_id
          WHERE grp.group_role_id = '${roleId}' ORDER BY p.name LIMIT 1;`,
      )) as Array<{ name: string }>;
      const victim = before[0].name;

      const { error: revokeErr } = await c.rpc('set_group_role_permission', {
        p_group_role_id: roleId,
        p_permission_name: victim,
        p_granted: false,
      });
      expect(revokeErr).toBeNull();

      const d = await diff(c, roleId);
      expect(d.added).toContain(victim);
      expect(d.removed).not.toContain(victim);
    }, 240_000);

    it('S4c: a permission the Steward ADDED shows as REMOVED', async () => {
      const roleId = await adopt(`${TOKEN} Added Local`);
      const c = await asUser(steward);

      const extra = (await runAdminSql(
        `SELECT p.name FROM public.permissions p
          WHERE p.id NOT IN (
            SELECT permission_id FROM public.group_role_permissions
             WHERE group_role_id = '${roleId}')
          ORDER BY p.name LIMIT 1;`,
      )) as Array<{ name: string }>;

      await c.rpc('set_group_role_permission', {
        p_group_role_id: roleId,
        p_permission_name: extra[0].name,
        p_granted: true,
      });

      const d = await diff(c, roleId);
      expect(d.removed).toContain(extra[0].name);
    }, 240_000);

    it('S4d: a CUSTOM role is refused P0002 — nothing to diff against', async () => {
      const c = await asUser(steward);
      const { data: roleId } = await c.rpc('create_group_role', {
        p_group_id: groupA,
        p_name: `${TOKEN} Custom For Diff`,
        p_permissions: ['invite_members'],
      });
      const { error } = await c.rpc('get_role_copy_diff', {
        p_group_role_id: roleId as string,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0002');
    }, 240_000);

    it('S4e: a retired source still DIFFS but refuses APPLY', async () => {
      const roleId = await adopt(`${TOKEN} Retired Source`);
      const a = await asUser(adminUser);
      await a.rpc('admin_retire_role_template', { p_role_template_id: clonedTemplateId });

      const c = await asUser(steward);
      const d = await diff(c, roleId); // the group is entitled to know where it stands
      expect(d).toHaveProperty('added');

      const { error } = await c.rpc('apply_role_template_update', { p_group_role_id: roleId });
      expect(error).not.toBeNull(); // RD-2: retire never pushes into a group

      await a.rpc('admin_unretire_role_template', { p_role_template_id: clonedTemplateId });
    }, 240_000);

    it('S5a: apply makes the grant set EQUAL the template set, not a union', async () => {
      const roleId = await adopt(`${TOKEN} Apply Equality`);
      const c = await asUser(steward);

      const extra = (await runAdminSql(
        `SELECT p.name FROM public.permissions p
          WHERE p.id NOT IN (
            SELECT permission_id FROM public.group_role_permissions
             WHERE group_role_id = '${roleId}')
          ORDER BY p.name LIMIT 1;`,
      )) as Array<{ name: string }>;
      await c.rpc('set_group_role_permission', {
        p_group_role_id: roleId,
        p_permission_name: extra[0].name,
        p_granted: true,
      });

      const { error } = await c.rpc('apply_role_template_update', { p_group_role_id: roleId });
      expect(error).toBeNull();

      const rows = (await runAdminSql(
        `SELECT
           (SELECT array_agg(p.name ORDER BY p.name) FROM public.group_role_permissions grp
              JOIN public.permissions p ON p.id = grp.permission_id
             WHERE grp.group_role_id = '${roleId}') AS role_set,
           (SELECT array_agg(p.name ORDER BY p.name) FROM public.role_template_permissions rtp
              JOIN public.permissions p ON p.id = rtp.permission_id
             WHERE rtp.role_template_id = '${clonedTemplateId}' AND rtp.granted) AS template_set;`,
      )) as Array<{ role_set: string[]; template_set: string[] }>;
      expect(rows[0].role_set).toEqual(rows[0].template_set);
      // the locally-added permission is GONE — apply is the diff, not a union
      expect(rows[0].role_set).not.toContain(extra[0].name);
    }, 240_000);

    it('S5b: apply re-stamps provenance so the next diff is empty', async () => {
      const roleId = await adopt(`${TOKEN} Restamp`);
      const c = await asUser(steward);
      await c.rpc('set_group_role_permission', {
        p_group_role_id: roleId,
        p_permission_name: 'invite_members',
        p_granted: false,
      });
      await c.rpc('apply_role_template_update', { p_group_role_id: roleId });

      const rows = (await runAdminSql(
        `SELECT gr.created_from_version_number AS stamped,
                v.version_number AS current
           FROM public.group_roles gr
           JOIN public.role_templates rt ON rt.id = gr.created_from_role_template_id
           JOIN public.role_template_versions v ON v.id = rt.default_version_id
          WHERE gr.id = '${roleId}';`,
      )) as Array<{ stamped: number; current: number }>;
      expect(rows[0].stamped).toBe(rows[0].current);

      const d = await diff(c, roleId);
      expect(d.added).toHaveLength(0);
      expect(d.removed).toHaveLength(0);
    }, 240_000);

    it('S5c: apply leaves the source template and its versions untouched', async () => {
      const roleId = await adopt(`${TOKEN} Source Untouched`);
      const before = (await runAdminSql(
        `SELECT
           (SELECT count(*)::int FROM public.role_template_permissions
             WHERE role_template_id = '${clonedTemplateId}') AS perms,
           (SELECT count(*)::int FROM public.role_template_versions
             WHERE role_template_id = '${clonedTemplateId}') AS versions;`,
      )) as Array<{ perms: number; versions: number }>;

      const c = await asUser(steward);
      await c.rpc('set_group_role_permission', {
        p_group_role_id: roleId,
        p_permission_name: 'invite_members',
        p_granted: false,
      });
      const { error: applyErr } = await c.rpc('apply_role_template_update', {
        p_group_role_id: roleId,
      });
      // Not vacuous: "the source is unchanged" is trivially true if the apply
      // never ran. Assert it succeeded before comparing snapshots.
      expect(applyErr).toBeNull();

      const after = (await runAdminSql(
        `SELECT
           (SELECT count(*)::int FROM public.role_template_permissions
             WHERE role_template_id = '${clonedTemplateId}') AS perms,
           (SELECT count(*)::int FROM public.role_template_versions
             WHERE role_template_id = '${clonedTemplateId}') AS versions;`,
      )) as Array<{ perms: number; versions: number }>;
      expect(after[0]).toEqual(before[0]);
    }, 240_000);

    it('S5d: apply refuses under the availability guard', async () => {
      const roleId = await adopt(`${TOKEN} Apply Rested`);
      await runAdminSql(`UPDATE public.groups SET status = 'resting' WHERE id = '${groupA}';`);
      const c = await asUser(steward);
      const { error } = await c.rpc('apply_role_template_update', { p_group_role_id: roleId });
      expect(error).not.toBeNull();
      // Not vacuous: the guard must be what refuses, not a missing function.
      expect(error!.code).not.toBe('PGRST202');
      await runAdminSql(`UPDATE public.groups SET status = 'active' WHERE id = '${groupA}';`);
    }, 240_000);
  });

  // ==========================================================================
  // STORY-6 — the three passive notices
  // ==========================================================================
  describe('STORY-6 — news, not asks', () => {
    it('S6a: the three kinds exist with dispatch_segment NULL, in a roles category', async () => {
      const rows = (await runAdminSql(
        `SELECT k.kind, k.category_key, k.dispatch_segment
           FROM public.notification_kinds k
          WHERE k.kind IN ('role_template_published','role_template_updated','role_template_retired')
          ORDER BY k.kind;`,
      )) as Array<{ kind: string; category_key: string; dispatch_segment: string | null }>;
      expect(rows).toHaveLength(3);
      // RD-7: passive by construction. Asserted, never set.
      for (const r of rows) {
        expect(r.dispatch_segment).toBeNull();
        expect(r.category_key).toBe('roles');
      }

      const cat = (await runAdminSql(
        `SELECT lawful_basis, interruption_grade FROM public.notification_categories
          WHERE key = 'roles';`,
      )) as Array<{ lawful_basis: string; interruption_grade: string }>;
      expect(cat).toHaveLength(1);
      expect(cat[0].lawful_basis).toBe('transactional');
      expect(cat[0].interruption_grade).toBe('badge');
    }, 180_000);

    it('S6b: publishing notifies manage_roles holders in the targeted group only', async () => {
      await clearPublications();
      await runAdminSql(
        `DELETE FROM public.notifications WHERE type LIKE 'role_template_%';`,
      );
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA],
      });

      const rows = (await runAdminSql(
        `SELECT recipient_group_id, group_id FROM public.notifications
          WHERE type = 'role_template_published';`,
      )) as Array<{ recipient_group_id: string; group_id: string | null }>;
      // RDB-2: manage_roles holders — the Steward of A, not of B.
      expect(rows.map((r) => r.recipient_group_id)).toContain(steward.personalGroupId);
      expect(rows.map((r) => r.recipient_group_id)).not.toContain(
        otherSteward.personalGroupId,
      );
      expect(rows.every((r) => r.group_id === groupA)).toBe(true);
    }, 240_000);

    it('S6c: retiring notifies groups that adopted it', async () => {
      await runAdminSql(`DELETE FROM public.notifications WHERE type LIKE 'role_template_%';`);
      const a = await asUser(adminUser);
      await a.rpc('admin_retire_role_template', { p_role_template_id: clonedTemplateId });

      const rows = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.notifications
          WHERE type = 'role_template_retired';`,
      )) as Array<{ n: number }>;
      expect(rows[0].n).toBeGreaterThan(0);
      await a.rpc('admin_unretire_role_template', { p_role_template_id: clonedTemplateId });
    }, 240_000);

    it('S6d: notice payloads carry ids and a template name only — no member PII', async () => {
      const rows = (await runAdminSql(
        `SELECT payload FROM public.notifications
          WHERE type LIKE 'role_template_%' LIMIT 5;`,
      )) as Array<{ payload: Record<string, unknown> }>;
      // Not vacuous: a loop over an empty result set passes trivially.
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        const keys = Object.keys(r.payload ?? {});
        expect(keys).not.toContain('member_name');
        expect(keys).not.toContain('email');
      }
    }, 180_000);
  });

  // ==========================================================================
  // STORY-7 — retirement reaches the instantiation path
  // ==========================================================================
  describe('STORY-7 — the creation-time guard (defensive depth, RDB-4)', () => {
    it('S7a: create_engagement_group filters retired templates on both branches', async () => {
      // Driven at the catalogue level: the hole is unreachable through
      // group_template_roles today (only system templates are registered
      // there, and those cannot be retired — verified 2026-08-06). The
      // predicate's PRESENCE is therefore the honest assertion, and the
      // dossier says so rather than pretending to a reachable scenario.
      const rows = (await runAdminSql(
        `SELECT (pg_get_functiondef(p.oid) ILIKE '%retired_at%') AS guarded
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'create_engagement_group';`,
      )) as Array<{ guarded: boolean }>;
      expect(rows[0].guarded).toBe(true);
    }, 120_000);

    it('S7b: a template-less group still receives the full system role set (WA-6)', async () => {
      const groupId = await newGroup(steward, `${TOKEN} WA-6 unchanged`);
      const rows = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.group_roles gr
           JOIN public.role_templates rt ON rt.id = gr.created_from_role_template_id
          WHERE gr.group_id = '${groupId}' AND rt.is_system;`,
      )) as Array<{ n: number }>;
      expect(rows[0].n).toBe(4);
    }, 180_000);
  });

  // ==========================================================================
  // ADR-U038 — the adversarial direct-path cells
  // ==========================================================================
  describe('ADR-U038 — the substrate refuses what the route refuses', () => {
    it('U038a: role_template_publications is not writable over PostgREST', async () => {
      const c = await asUser(steward);
      const { error } = await c
        .from('role_template_publications')
        .insert({ role_template_id: clonedTemplateId, group_id: groupA });
      expect(error).not.toBeNull();
      // Not vacuous: an ABSENT table errors too. The refusal must come from
      // RLS or the missing grant — never from the relation not existing.
      // Shape verified against the live stack rather than assumed: PostgREST
      // reports an unknown table as PGRST205 / "in the schema cache", NOT as
      // the Postgres 42P01 "does not exist" a first guess reaches for.
      expect(error!.code).not.toBe('PGRST205');
      expect(error!.code).not.toBe('42P01');
      expect(error!.message).not.toMatch(/schema cache/i);
    }, 180_000);

    it('U038b: an anonymous Mist can neither read the offer nor publish', async () => {
      const anon = createTestClient();
      await anon.auth.signInAnonymously();

      const { error: offerErr } = await anon.rpc('get_available_role_templates', {
        p_group_id: groupA,
      });
      expect(offerErr).not.toBeNull();
      // Not vacuous: absence refuses everyone equally. A Mist must be refused
      // by the contract, not by PostgREST failing to find it.
      expect(offerErr!.code).not.toBe('PGRST202');

      const { error: pubErr } = await anon.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA],
      });
      expect(pubErr).not.toBeNull();
      expect(pubErr!.code).not.toBe('PGRST202');
    }, 180_000);

    it('U038c: the publications table carries RLS with no user-facing write policy', async () => {
      const rows = (await runAdminSql(
        `SELECT c.relrowsecurity,
                (SELECT count(*)::int FROM pg_policies pol
                  WHERE pol.tablename = 'role_template_publications') AS policies,
                (SELECT count(*)::int
                   FROM information_schema.role_table_grants g
                  WHERE g.table_name = 'role_template_publications'
                    AND g.grantee = 'authenticated'
                    AND g.privilege_type IN ('INSERT','UPDATE','DELETE')) AS write_grants
           FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname = 'role_template_publications';`,
      )) as Array<{ relrowsecurity: boolean; policies: number; write_grants: number }>;
      expect(rows[0].relrowsecurity).toBe(true);
      expect(rows[0].policies).toBeGreaterThan(0);
      expect(rows[0].write_grants).toBe(0);
    }, 180_000);
  });
});
