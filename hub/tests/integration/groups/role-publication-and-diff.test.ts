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
    // WALK FIX W-7 — this suite dispatches real notifications and used to
    // leave every one behind. C3 alone publishes PLATFORM-WIDE, so its
    // fan-out scales with the whole group table: ~427 rows per run, each
    // firing the realtime hint trigger, immediately before the notifications
    // directory runs. The suite now clears its own dispatch.
    //
    // Not cosmetic. Measured 2026-08-09: `tests/integration/notifications`
    // alone is 120/120 clean; run after `tests/integration/groups` it loses a
    // PAIR cell, and WHICH cell varies between runs. That is the profile of a
    // volume- or timing-sensitive emission assertion, not of a broken test.
    await runAdminSql(
      `DELETE FROM public.notifications WHERE type LIKE 'role_template_%';`,
    ).catch(() => undefined);
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

      // A FRESH group deliberately. group_roles is UNIQUE(group_id, name),
      // so one group may adopt the SAME template more than once under
      // different names — which makes adopted_group_role_id genuinely
      // ambiguous, and the contract resolves it as the earliest adoption.
      // Asserting against groupA (which earlier cells already adopted into)
      // was testing cell ordering, not the contract. The multi-adoption
      // ambiguity is recorded in the spec, not papered over here.
      const freshGroup = await newGroup(steward, `${TOKEN} adoption keys`);
      const c = await asUser(steward);
      const { data: roleId } = await c.rpc('create_group_role', {
        p_group_id: freshGroup,
        p_name: `${TOKEN} Adoption Keys`,
        p_role_template_id: clonedTemplateId,
      });

      const row = (await offers(c, freshGroup)).find((t) => t.id === clonedTemplateId)!;
      expect(row.adopted_group_role_id).toBe(roleId);
      expect(row.adopted_version_number).toBe(1);
      expect(row.current_version_number).toBe(1);
    }, 240_000);

    it('S2g: an un-stamped copy yields a null adopted_version_number, not a guess', async () => {
      // RD-10's honest-unknown, surfaced through the offer read.
      const c = await asUser(steward);
      const unstampedGroup = await newGroup(steward, `${TOKEN} unstamped`);
      await c.rpc('create_group_role', {
        p_group_id: unstampedGroup,
        p_name: `${TOKEN} Unstamped Copy`,
        p_role_template_id: clonedTemplateId,
      });
      await runAdminSql(
        `UPDATE public.group_roles SET created_from_version_number = NULL
          WHERE group_id = '${unstampedGroup}' AND created_from_role_template_id = '${clonedTemplateId}';`,
      );
      const row = (await offers(c, unstampedGroup)).find((t) => t.id === clonedTemplateId)!;
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

    it('S3e: NOT red-first — assert_group_writable still fires first on a SUSPENDED group', async () => {
      // FEAT-PC023's availability guard, pinned unchanged.
      //
      // CORRECTED AT BUILD: this cell first used 'resting' and failed — and
      // the CODE was right, not the test. assert_group_writable lets a
      // resting group be written by an actor holding 'rest_group', which the
      // Steward template grants (a Steward managing their own resting group
      // is the designed behaviour, not a hole). 'suspended' is the state that
      // refuses everyone below the admin plane, so it is the state that
      // actually pins "the guard fires first".
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', { p_role_template_id: clonedTemplateId });

      const groupId = await newGroup(steward, `${TOKEN} suspended`);
      try {
        await runAdminSql(
          `UPDATE public.groups SET status = 'suspended' WHERE id = '${groupId}';`,
        );
        const c = await asUser(steward);
        const { error } = await c.rpc('create_group_role', {
          p_group_id: groupId,
          p_name: `${TOKEN} Suspended Adopt`,
          p_role_template_id: clonedTemplateId,
        });
        expect(error).not.toBeNull();
      } finally {
        // try/finally, not a trailing statement: a failed expect() throws, and
        // a leaked group status poisons every later cell that filters on
        // status='active'. That is exactly how S6b failed on the first green
        // run — a cascade from this cell, not a bug of its own.
        await runAdminSql(`UPDATE public.groups SET status = 'active' WHERE id = '${groupId}';`);
      }
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
      // CORRECTED AT BUILD, same reason as S3e: 'resting' is writable by a
      // rest_group holder by design. 'suspended' is the refusing state.
      const roleId = await adopt(`${TOKEN} Apply Suspended`);
      try {
        await runAdminSql(
          `UPDATE public.groups SET status = 'suspended' WHERE id = '${groupA}';`,
        );
        const c = await asUser(steward);
        const { error } = await c.rpc('apply_role_template_update', { p_group_role_id: roleId });
        expect(error).not.toBeNull();
        // Not vacuous: the guard must be what refuses, not a missing function.
        expect(error!.code).not.toBe('PGRST202');
      } finally {
        // See S3e — groupA is shared, so a leak here breaks STORY-6.
        await runAdminSql(`UPDATE public.groups SET status = 'active' WHERE id = '${groupA}';`);
      }
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

    // ========================================================================
    // WALK FIX W-8 — the notices name their group. RED until 20260808120000.
    //
    // Found live 2026-08-08: a Steward of five groups received five identical
    // notices, all reading "...into your group". The rows were genuinely about
    // five different groups; only the body was anonymous.
    //
    // These cells assert the SERVER'S literal. The unit cells that were
    // supposed to cover this asserted bodies a fixture hand-authored — the
    // substrate never wrote them, so they were green and meaningless. When
    // copy is server-authored, this is where it must be pinned.
    // ========================================================================
    const groupNameOf = async (id: string): Promise<string> => {
      const r = (await runAdminSql(
        `SELECT name FROM public.groups WHERE id = '${id}';`,
      )) as Array<{ name: string }>;
      return r[0].name;
    };

    it('W8a: the published notice names the group and never says "your group"', async () => {
      await clearPublications();
      await runAdminSql(`DELETE FROM public.notifications WHERE type LIKE 'role_template_%';`);
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA],
      });

      const nameA = await groupNameOf(groupA);
      const rows = (await runAdminSql(
        `SELECT body FROM public.notifications WHERE type = 'role_template_published';`,
      )) as Array<{ body: string }>;
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        expect(r.body).toContain(nameA);
        expect(r.body.toLowerCase()).not.toContain('your group');
      }
    }, 240_000);

    it('W8b: the retired notice names the group AND keeps the reassurance clause', async () => {
      await runAdminSql(`DELETE FROM public.notifications WHERE type LIKE 'role_template_%';`);
      const a = await asUser(adminUser);
      await a.rpc('admin_retire_role_template', { p_role_template_id: clonedTemplateId });

      // try/finally, NOT a trailing statement — a failed expect() throws past
      // a trailing cleanup and leaves the template retired, which silently
      // refuses every later publish and turns the next cells' failures into a
      // cascade. That exact trap was recorded at the PC028 build (S5d) and is
      // the reason this reads the way it does.
      try {
        const rows = (await runAdminSql(
          `SELECT n.body, g.name AS group_name
             FROM public.notifications n
             JOIN public.groups g ON g.id = n.group_id
            WHERE n.type = 'role_template_retired';`,
        )) as Array<{ body: string; group_name: string }>;
        expect(rows.length).toBeGreaterThan(0);
        for (const r of rows) {
          expect(r.body).toContain(r.group_name);
          // The clause that stops the notice reading as a loss must survive
          // the rename — it is the whole reason this notice is not frightening.
          expect(r.body).toContain('existing copy is unaffected');
          expect(r.body.toLowerCase()).not.toContain('your group');
        }
      } finally {
        await a.rpc('admin_unretire_role_template', { p_role_template_id: clonedTemplateId });
      }
    }, 240_000);

    it('W8c: the update notice names the group', async () => {
      await runAdminSql(`DELETE FROM public.notifications WHERE type LIKE 'role_template_%';`);
      const a = await asUser(adminUser);

      // PRECONDITION, made explicit rather than inherited from cell order: the
      // "updated" notice only reaches groups that ADOPTED the template, so a
      // copy must exist. Running this cell alone (-t "W8") would otherwise
      // assert against zero rows and fail for the wrong reason.
      const adopted = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.group_roles
          WHERE group_id = '${groupA}' AND created_from_role_template_id = '${clonedTemplateId}';`,
      )) as Array<{ n: number }>;
      if (adopted[0].n === 0) {
        await clearPublications();
        await a.rpc('admin_publish_role_template', {
          p_role_template_id: clonedTemplateId,
          p_group_ids: [groupA],
        });
        const s = await asUser(steward);
        const { error: adoptErr } = await s.rpc('create_group_role', {
          p_group_id: groupA,
          p_name: `${TOKEN} Adopted For W8c`,
          p_role_template_id: clonedTemplateId,
        });
        if (adoptErr) throw new Error(`W8c precondition adopt: ${adoptErr.message}`);
        await runAdminSql(`DELETE FROM public.notifications WHERE type LIKE 'role_template_%';`);
      }

      // A second version, applied — the emission point for "updated".
      const { data: ver, error: verErr } = await a.rpc('admin_create_role_template_version', {
        p_template_id: clonedTemplateId,
        p_name: `${TOKEN} Distributable`,
        p_description: null,
        p_permission_names: ['view_member_list'],
      });
      if (verErr) throw new Error(`create version: ${verErr.message}`);
      const { error: applyErr } = await a.rpc('admin_set_role_template_default_version', {
        p_template_id: clonedTemplateId,
        p_version_id: (ver as { id: string }).id,
      });
      if (applyErr) throw new Error(`apply version: ${applyErr.message}`);

      const rows = (await runAdminSql(
        `SELECT n.body, g.name AS group_name
           FROM public.notifications n
           JOIN public.groups g ON g.id = n.group_id
          WHERE n.type = 'role_template_updated';`,
      )) as Array<{ body: string; group_name: string }>;
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        expect(r.body).toContain(r.group_name);
        expect(r.body.toLowerCase()).not.toContain('your group');
      }
    }, 240_000);

    it('W8d: THE AC — one recipient, two groups, two distinguishable notices', async () => {
      // FEAT-H044 STORY-4: "the recipient must not have to guess which group a
      // notice is about." This is the cell the live walk proved was missing:
      // the same Steward, two groups, and until the fix both notices read
      // identically.
      await clearPublications();
      await runAdminSql(`DELETE FROM public.notifications WHERE type LIKE 'role_template_%';`);
      const groupC = await newGroup(steward, `${TOKEN} Group C`);

      const a = await asUser(adminUser);
      const { error: pubErr } = await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA, groupC],
      });
      // Checked, not assumed: a refused publish would otherwise surface as
      // "0 rows" and read as the wrong defect entirely.
      if (pubErr) throw new Error(`W8d publish refused: ${pubErr.message}`);

      const rows = (await runAdminSql(
        `SELECT n.body, n.group_id
           FROM public.notifications n
          WHERE n.type = 'role_template_published'
            AND n.recipient_group_id = '${steward.personalGroupId}'
          ORDER BY n.group_id;`,
      )) as Array<{ body: string; group_id: string }>;

      expect(rows).toHaveLength(2);
      expect(new Set(rows.map((r) => r.group_id)).size).toBe(2);
      // The point: two DIFFERENT sentences, each naming its own group.
      expect(new Set(rows.map((r) => r.body)).size).toBe(2);
      const nameA = await groupNameOf(groupA);
      const nameC = await groupNameOf(groupC);
      const forA = rows.find((r) => r.group_id === groupA)!;
      const forC = rows.find((r) => r.group_id === groupC)!;
      expect(forA.body).toContain(nameA);
      expect(forC.body).toContain(nameC);
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

  // ==========================================================================
  // WALK FIX W-6 — the publish ceremony can state its blast radius.
  // RED until 20260809100000 is applied.
  //
  // Ruled 2026-08-09. The Steward's diff ceremony names its holder count; the
  // admin's publish ceremony named nothing, though its reach is two orders of
  // magnitude larger and the notices cannot be withdrawn.
  //
  // W6c is the cell that matters: a preview whose predicate drifts from the act
  // it previews is WORSE than no preview, because it states a confident number
  // that is wrong. So it previews, publishes, and compares.
  // ==========================================================================
  describe('WALK FIX W-6 — admin_preview_publication_reach', () => {
    const preview = async (c: SupabaseClient, groupIds: string[] | null) => {
      const { data, error } = await c.rpc('admin_preview_publication_reach', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: groupIds,
      });
      if (error) throw new Error(`preview: ${error.message}`);
      return data as { group_count: number; recipient_count: number; notice_count: number };
    };

    it('W6a: a targeted preview counts only the named groups', async () => {
      const a = await asUser(adminUser);
      const r = await preview(a, [groupA]);
      expect(r.group_count).toBe(1);
      expect(r.recipient_count).toBeGreaterThan(0);
      // One Steward in one group = one notice; the pair count never undercounts
      // a recipient who holds manage_roles in several groups.
      expect(r.notice_count).toBeGreaterThanOrEqual(r.recipient_count);
    }, 180_000);

    it('W6b: a platform-wide preview is at least as large as any targeted one', async () => {
      const a = await asUser(adminUser);
      const one = await preview(a, [groupA]);
      const all = await preview(a, null);
      expect(all.group_count).toBeGreaterThanOrEqual(one.group_count);
      expect(all.notice_count).toBeGreaterThanOrEqual(one.notice_count);
    }, 180_000);

    it('W6c: THE MIRROR — the preview equals what publishing actually creates', async () => {
      // The whole reason this contract can be trusted. If anyone edits the
      // publish predicate without editing the preview's, this fails.
      await clearPublications();
      await runAdminSql(`DELETE FROM public.notifications WHERE type LIKE 'role_template_%';`);
      const a = await asUser(adminUser);

      const predicted = await preview(a, [groupA, groupB]);
      const { error } = await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA, groupB],
      });
      expect(error).toBeNull();

      const actual = (await runAdminSql(
        `SELECT count(*)::int AS notices,
                count(DISTINCT recipient_group_id)::int AS recipients,
                count(DISTINCT group_id)::int AS groups
           FROM public.notifications
          WHERE type = 'role_template_published';`,
      )) as Array<{ notices: number; recipients: number; groups: number }>;

      expect(actual[0].notices).toBe(predicted.notice_count);
      expect(actual[0].recipients).toBe(predicted.recipient_count);
      expect(actual[0].groups).toBe(predicted.group_count);
    }, 240_000);

    it('W6d: an empty array is refused rather than read as platform-wide', async () => {
      // Same refusal as the write door. Reading [] as "everyone" would preview
      // an act vastly larger than the one asked about.
      const a = await asUser(adminUser);
      const { error } = await a.rpc('admin_preview_publication_reach', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [],
      });
      expect(error).not.toBeNull();
      expect(error!.code).not.toBe('PGRST202'); // not vacuous: absence refuses everyone
      expect(error!.code).toBe('22023');
    }, 180_000);

    it('W6e: it writes nothing — a preview that publishes would be a trap', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      await preview(a, null);
      const rows = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.role_template_publications
          WHERE role_template_id = '${clonedTemplateId}';`,
      )) as Array<{ n: number }>;
      expect(rows[0].n).toBe(0);
    }, 180_000);

    it('W6g: the preview carries the house grant posture — anon cannot execute it', async () => {
      // CORRECTIVE 20260809140000. The original migration granted EXECUTE to
      // `authenticated` and never revoked the one Postgres gives PUBLIC by
      // default, so `anon` could execute it — the only one of the eight
      // role-distribution functions that could be. Caught by verifying the
      // live catalogue after the apply rather than trusting the migration.
      //
      // The is_platform_admin() gate meant nothing leaked (W6f pins that), but
      // an unintended grant is not made acceptable by a gate behind it, and
      // the next function created by copying this one would inherit the
      // omission. Pinned here so it cannot recur silently.
      const rows = (await runAdminSql(
        `SELECT has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon,
                has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authed,
                has_function_privilege('service_role', p.oid, 'EXECUTE')  AS svc
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname = 'admin_preview_publication_reach';`,
      )) as Array<{ anon: boolean; authed: boolean; svc: boolean }>;
      expect(rows).toHaveLength(1);
      expect(rows[0].anon).toBe(false);
      expect(rows[0].authed).toBe(true);
      expect(rows[0].svc).toBe(true);
    }, 180_000);

    it('W6f: a non-admin cannot read the platform-wide reach', async () => {
      const c = await asUser(steward);
      const { error } = await c.rpc('admin_preview_publication_reach', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: null,
      });
      expect(error).not.toBeNull();
      expect(error!.code).not.toBe('PGRST202');
      expect(error!.code).toBe('42501');
    }, 180_000);
  });

  // ==========================================================================
  // CORRECTIVE — the widening the payload walk committed to and the migration
  // omitted. RED until 20260807140000 is applied.
  //
  // FEAT-PC028's spec states finding 2: "admin_get_role_template_detail knows
  // nothing about publications. PC028 widens it rather than adding a fourth
  // read." It was never widened. Found at the start of the Hub half, when
  // FEAT-H044 STORY-3's reach section had no server key to read. Two keys are
  // missing, not one — `retired_at` was never added to the DETAIL read either,
  // though RD-A added it to the LIST read.
  // ==========================================================================
  describe('CORRECTIVE — admin_get_role_template_detail carries reach and retirement', () => {
    const detail = async (c: SupabaseClient, templateId: string) => {
      const { data, error } = await c.rpc('admin_get_role_template_detail', {
        p_template_id: templateId,
      });
      if (error) throw new Error(`admin_get_role_template_detail: ${error.message}`);
      return data as {
        template: { id: string; is_system: boolean; retired_at: string | null };
        versions: unknown[];
        publications: Array<{
          group_id: string | null;
          group_name: string | null;
          published_at: string;
        }>;
      };
    };

    it('C1: an unpublished template reports empty reach — the key exists and is []', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      const d = await detail(a, clonedTemplateId);
      // The key must be PRESENT and empty, never absent: the surface renders
      // "Not published" from [], and an absent key is indistinguishable from a
      // read that failed.
      expect(Array.isArray(d.publications)).toBe(true);
      expect(d.publications).toHaveLength(0);
    }, 180_000);

    it('C2: named-group reach lists each group with its name and publication date', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA, groupB],
      });

      const d = await detail(a, clonedTemplateId);
      expect(d.publications).toHaveLength(2);
      const ids = d.publications.map((p) => p.group_id).sort();
      expect(ids).toEqual([groupA, groupB].sort());
      // STORY-3 lists the NAMED groups, so the name must ride the payload —
      // the Hub may not look groups up itself (it has no such read).
      for (const p of d.publications) {
        expect(typeof p.group_name).toBe('string');
        expect(p.group_name).toBeTruthy();
        expect(p.published_at).toBeTruthy();
      }
    }, 180_000);

    it('C3: platform-wide reach is one row with a NULL group_id, sorted first', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: null,
      });
      await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA],
      });

      const d = await detail(a, clonedTemplateId);
      expect(d.publications.length).toBeGreaterThanOrEqual(2);
      // NULL = platform-wide (RD-8), and it sorts first so the surface reads
      // the broadest reach before the named ones.
      expect(d.publications[0].group_id).toBeNull();
      expect(d.publications[0].group_name).toBeNull();
    }, 180_000);

    it('C4: the detail read carries retired_at, present whether retired or not', async () => {
      const a = await asUser(adminUser);
      const before = await detail(a, clonedTemplateId);
      // Present-and-null, not absent — STORY-3 branches on it unconditionally.
      expect(before.template).toHaveProperty('retired_at');
      expect(before.template.retired_at).toBeNull();

      await a.rpc('admin_retire_role_template', { p_role_template_id: clonedTemplateId });
      const after = await detail(a, clonedTemplateId);
      expect(after.template.retired_at).not.toBeNull();

      await a.rpc('admin_unretire_role_template', { p_role_template_id: clonedTemplateId });
      const restored = await detail(a, clonedTemplateId);
      expect(restored.template.retired_at).toBeNull();
    }, 180_000);

    it('C5: reach SURVIVES retirement (RDB-6) and the detail read still shows it', async () => {
      await clearPublications();
      const a = await asUser(adminUser);
      await a.rpc('admin_publish_role_template', {
        p_role_template_id: clonedTemplateId,
        p_group_ids: [groupA],
      });
      await a.rpc('admin_retire_role_template', { p_role_template_id: clonedTemplateId });

      const d = await detail(a, clonedTemplateId);
      // The retirement filter lives at the OFFER read, not in a delete — so an
      // unretire restores the reach that existed rather than silently
      // publishing to nobody. The admin surface must be able to see that.
      expect(d.publications).toHaveLength(1);
      expect(d.publications[0].group_id).toBe(groupA);
      expect(d.template.retired_at).not.toBeNull();

      await a.rpc('admin_unretire_role_template', { p_role_template_id: clonedTemplateId });
    }, 180_000);

    // LABELLED GREEN BEFORE AND AFTER — a guard cell, not a red-first driver.
    // C1–C5 are red until 20260807140000 lands; C6 pins the admin gate that
    // must survive the widening untouched, so it passes today and is
    // load-bearing only if the corrective ever loosens it.
    it('C6: the widening does not open the payload to a non-admin', async () => {
      // The function stays SECURITY DEFINER behind is_platform_admin; reach is
      // admin-plane data and the widening must not have become a side door.
      const c = await asUser(steward);
      const { error } = await c.rpc('admin_get_role_template_detail', {
        p_template_id: clonedTemplateId,
      });
      expect(error).not.toBeNull();
      // Not vacuous: an absent function refuses everyone equally.
      expect(error!.code).not.toBe('PGRST202');
      expect(error!.code).toBe('42501');
    }, 180_000);
  });
});
