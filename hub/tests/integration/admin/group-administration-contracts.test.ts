import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
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

jest.setTimeout(240_000); // real-substrate suite: six users, real hand-over path

/**
 * FEAT-PC020 (Cycle ADM-B, board AB-5: ADM-8 + ADM-9) — the five group
 * administration contracts, producer-driven. The DeusEx-stewarded fixture is
 * created through the REAL hand-over path (hand_stewardship_to_deusex, the
 * sole-active-Steward door) — never fixture SQL; deusex_stewarded derives
 * from membership rows, never name matching (the TASK-INT-05 warning made
 * law, PC020 §Rabbit holes).
 *
 * RED AT HEAD (pre-migration 20260801120000), by case: every STORY-1..5
 * producer case fails PGRST202 ("Could not find the function") — none of
 * admin_get_groups / admin_get_group_detail / admin_suspend_group /
 * admin_reactivate_group / admin_reassign_group_stewardship exists at head
 * (AC3-O8: the platform cannot see its own groups). That includes the
 * refusal cells (non-admin 42501, anon EXECUTE, unknown-filter 22023,
 * suspend matrix, non-member reassign): at head they fail function-absent,
 * not with the typed refusal they pin.
 *
 * LABELLED GREEN (green before AND after by design — never claimed as red):
 *  - S5b: admin_audit_log append-only catalog (no UPDATE/DELETE policies) —
 *    existing PC-4 substrate, re-pinned against the post-change catalog.
 *    The suite's ONLY green at head (demonstrated 2026-08-01: 29 failed,
 *    1 passed, 30 total).
 *  - S5c pins carried-forward RLS substrate (audit rows refuse authenticated
 *    UPDATE) but sits RED at head anyway: its fixture row comes from the
 *    absent producer. Green post-apply; the refusal itself is not new
 *    behaviour.
 */

/** Authenticated DeusEx caller — the house manage_all_groups elevation. */
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

const GHOST_GROUP = '00000000-0000-4000-8000-000000000000';

const LIST_KEYS = [
  'created_at',
  'deusex_stewarded',
  'group_type',
  'id',
  'member_count',
  'name',
  'non_system_member_count',
  'status',
];

describe('FEAT-PC020 — group administration contracts (ADM-8/ADM-9, RW-05 exit)', () => {
  const admin = createAdminClient();
  let ada: TestUser; // platform admin (DeusEx member)
  let stella: TestUser; // steward of gActive/gCycle — also the non-admin caller
  let mona: TestUser; // gActive member, second Steward (STORY-2)
  let caro: TestUser; // creator of gCaretaker; departs via the real hand-over
  let hilda: TestUser; // gCaretaker human member — the RW-05 reassign target
  let nomi: TestUser; // FIM, never a member — non-member reassign target

  let adaClient: SupabaseClient;
  let deusexId: string;

  let gActive: string; // engagement, two human stewards
  let gCaretaker: string; // DeusEx-stewarded via the real hand-over path
  let gCycle: string; // suspend/reactivate round-trip target
  let gSusp: string; // stays suspended for the 'suspended' filter
  let gClosed: string; // refusal matrix
  let gArchived: string; // refusal matrix

  const createdGroupIds: string[] = [];
  const users: TestUser[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const seedGroup = async (creator: TestUser, name: string, members: TestUser[]): Promise<string> => {
    const c = await asUser(creator);
    const { data: groupId, error } = await c.rpc('create_engagement_group', { p_name: name });
    if (error) throw new Error(`seedGroup(${name}): ${error.message}`);
    createdGroupIds.push(groupId as string);
    await admin.from('groups').update({ is_public: false }).eq('id', groupId);
    for (const member of members) {
      const { error: mErr } = await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: member.personalGroupId,
        status: 'active',
        added_by_group_id: creator.personalGroupId,
      });
      if (mErr) throw new Error(`seedGroup membership: ${mErr.message}`);
    }
    await c.auth.signOut();
    return groupId as string;
  };

  const grantSteward = async (groupId: string, u: TestUser, assigner: TestUser) => {
    await runAdminSql(`
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${u.personalGroupId}', gr.group_id, gr.id, '${assigner.personalGroupId}'
        FROM public.group_roles gr
       WHERE gr.group_id = '${groupId}'
         AND (gr.created_from_role_template_id =
                (SELECT id FROM public.role_templates WHERE name = 'Steward Role Template')
              OR gr.name = 'Steward')
       LIMIT 1
      ON CONFLICT DO NOTHING;`);
  };

  const groupStatus = async (groupId: string): Promise<string> => {
    const rows = await runAdminSql(`SELECT status FROM public.groups WHERE id = '${groupId}';`);
    return rows[0].status as string;
  };

  const auditRows = async (action: string, target: string) =>
    runAdminSql(
      `SELECT actor_group_id, action, target, metadata FROM public.admin_audit_log
        WHERE action = '${action}' AND target = '${target}';`,
    );

  const deusexCaretakerState = async (groupId: string) => {
    const membership = await runAdminSql(
      `SELECT status FROM public.group_memberships
        WHERE group_id = '${groupId}' AND member_group_id = '${deusexId}';`,
    );
    const stewardRole = await runAdminSql(
      `SELECT ugr.id FROM public.user_group_roles ugr
         JOIN public.group_roles gr ON gr.id = ugr.group_role_id
        WHERE ugr.group_id = '${groupId}' AND ugr.member_group_id = '${deusexId}'
          AND (gr.created_from_role_template_id =
                 (SELECT id FROM public.role_templates WHERE name = 'Steward Role Template')
               OR gr.name = 'Steward');`,
    );
    return { isActiveMember: membership[0]?.status === 'active', holdsSteward: stewardRole.length > 0 };
  };

  beforeAll(async () => {
    ada = await createTestUser({ displayName: 'Adminessa' });
    stella = await createTestUser({ displayName: 'Stella' });
    mona = await createTestUser({ displayName: 'Mona' });
    caro = await createTestUser({ displayName: 'Caro' });
    hilda = await createTestUser({ displayName: 'Hilda' });
    nomi = await createTestUser({ displayName: 'Nomi' });
    users.push(ada, stella, mona, caro, hilda, nomi);

    await makePlatformAdmin(ada.personalGroupId);
    adaClient = await asUser(ada);

    deusexId = (
      await runAdminSql(`SELECT id FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';`)
    )[0].id as string;

    gActive = await seedGroup(stella, 'PC020 Active Cohort', [mona]);
    await grantSteward(gActive, mona, stella); // two human stewards (STORY-2)
    gCycle = await seedGroup(stella, 'PC020 Lifecycle Cohort', [mona]);
    gSusp = await seedGroup(stella, 'PC020 Suspended Cohort', []);
    gClosed = await seedGroup(stella, 'PC020 Closed Cohort', []);
    gArchived = await seedGroup(stella, 'PC020 Archived Cohort', []);

    // The caretaker fixture, through the REAL hand-over path: caro (sole
    // active Steward) hands the group to DeusEx and departs; hilda remains.
    gCaretaker = await seedGroup(caro, 'PC020 Caretaker Cohort', [hilda]);
    const caroClient = await asUser(caro);
    const { error: handErr } = await caroClient.rpc('hand_stewardship_to_deusex', {
      p_group_id: gCaretaker,
    });
    if (handErr) throw new Error(`hand_stewardship_to_deusex: ${handErr.message}`);
    await caroClient.auth.signOut();
    const caretaker = await deusexCaretakerState(gCaretaker);
    if (!caretaker.isActiveMember || !caretaker.holdsSteward) {
      throw new Error('fixture: DeusEx did not become caretaker through the real hand-over path');
    }

    // Lifecycle refusal fixtures through the real closure contracts.
    const stellaClient = await asUser(stella);
    const { error: closeErr } = await stellaClient.rpc('close_group', { p_group_id: gClosed });
    if (closeErr) throw new Error(`close_group: ${closeErr.message}`);
    const { error: delErr } = await stellaClient.rpc('delete_group', { p_group_id: gArchived });
    if (delErr) throw new Error(`delete_group: ${delErr.message}`);
    await stellaClient.auth.signOut();
  });

  afterAll(async () => {
    if (adaClient) await adaClient.auth.signOut();
    for (const id of createdGroupIds) {
      await cleanupTestGroup(id).catch(() => undefined);
    }
    if (ada) await demotePlatformAdmin(ada.personalGroupId);
    for (const u of users) {
      if (u) await cleanupTestUser(u.user.id).catch(() => undefined);
    }
  });

  describe('STORY-1 — cross-platform enumeration with the caretaker filter', () => {
    it("admin_get_groups('all') returns non-personal groups with the walked payload; personal groups never appear", async () => {
      const { data, error } = await adaClient.rpc('admin_get_groups', { p_filter: 'all' });
      expect(error).toBeNull();
      const rows = data as Record<string, unknown>[];
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(Object.keys(row).sort()).toEqual(LIST_KEYS);
        expect(row.group_type).not.toBe('personal');
      }
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(gActive);
      expect(ids).toContain(gCaretaker);
      expect(ids).toContain(deusexId); // 'all' = non-personal: system groups appear
    });

    it("admin_get_groups('engagement') returns engagement groups only", async () => {
      const { data, error } = await adaClient.rpc('admin_get_groups', { p_filter: 'engagement' });
      expect(error).toBeNull();
      const rows = data as Record<string, unknown>[];
      for (const row of rows) expect(row.group_type).toBe('engagement');
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(gActive);
      expect(ids).toContain(gCaretaker);
      expect(ids).not.toContain(deusexId);
    });

    it("admin_get_groups('deusex_stewarded') is the AC3-O8/RW-05 discharge: caretaker groups only, flag true, derived from membership rows", async () => {
      const { data, error } = await adaClient.rpc('admin_get_groups', { p_filter: 'deusex_stewarded' });
      expect(error).toBeNull();
      const rows = data as Record<string, unknown>[];
      for (const row of rows) {
        expect(row.deusex_stewarded).toBe(true);
        expect(row.group_type).toBe('engagement');
      }
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(gCaretaker);
      expect(ids).not.toContain(gActive);
    });

    it('the Gracy-honest count pair: caretaker group counts DeusEx in member_count but not in non_system_member_count', async () => {
      const { data, error } = await adaClient.rpc('admin_get_groups', { p_filter: 'deusex_stewarded' });
      expect(error).toBeNull();
      const row = (data as Record<string, unknown>[]).find((r) => r.id === gCaretaker);
      expect(row).toBeDefined();
      expect(row!.member_count).toBe(2); // hilda + the DeusEx caretaker
      expect(row!.non_system_member_count).toBe(1); // hilda alone
    });

    it("admin_get_groups('suspended') returns suspended groups once the producer has written one", async () => {
      const { error: suspendErr } = await adaClient.rpc('admin_suspend_group', { p_group_id: gSusp, p_reason: 'FEAT-PC030 adapted: reason required' });
      expect(suspendErr).toBeNull();
      const { data, error } = await adaClient.rpc('admin_get_groups', { p_filter: 'suspended' });
      expect(error).toBeNull();
      const rows = data as Record<string, unknown>[];
      for (const row of rows) expect(row.status).toBe('suspended');
      expect(rows.map((r) => r.id)).toContain(gSusp);
    });

    it('an unknown filter refuses typed 22023 (open TEXT namespace — no sealed enum)', async () => {
      const { error } = await adaClient.rpc('admin_get_groups', { p_filter: 'bogus_filter' });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('22023');
    });

    it('a non-admin FIM caller is refused 42501 on every contract in the feature', async () => {
      const c = await asUser(stella);
      const calls: [string, Record<string, unknown>][] = [
        ['admin_get_groups', { p_filter: 'all' }],
        ['admin_get_group_detail', { p_group_id: gActive }],
        ['admin_suspend_group', { p_group_id: gActive }],
        ['admin_reactivate_group', { p_group_id: gActive }],
        ['admin_reassign_group_stewardship', { p_group_id: gCaretaker, p_new_steward_group_id: hilda.personalGroupId }],
      ];
      for (const [fn, args] of calls) {
        const { error } = await c.rpc(fn, args);
        expect(error).not.toBeNull();
        expect(error!.code).toBe('42501');
      }
      await c.auth.signOut();
    });

    it('an anon caller has no EXECUTE on any contract in the feature', async () => {
      const anon = createTestClient();
      const calls: [string, Record<string, unknown>][] = [
        ['admin_get_groups', { p_filter: 'all' }],
        ['admin_get_group_detail', { p_group_id: GHOST_GROUP }],
        ['admin_suspend_group', { p_group_id: GHOST_GROUP }],
        ['admin_reactivate_group', { p_group_id: GHOST_GROUP }],
        ['admin_reassign_group_stewardship', { p_group_id: GHOST_GROUP, p_new_steward_group_id: GHOST_GROUP }],
      ];
      for (const [fn, args] of calls) {
        const { error } = await anon.rpc(fn, args);
        expect(error).not.toBeNull();
        expect(error!.code).toBe('42501');
      }
    });
  });

  describe('STORY-2 — detail', () => {
    it('detail carries the row, the count pair, both human steward display names, and the caretaker flag', async () => {
      const { data, error } = await adaClient.rpc('admin_get_group_detail', { p_group_id: gActive });
      expect(error).toBeNull();
      const d = data as Record<string, unknown>;
      expect(d.id).toBe(gActive);
      expect(d.name).toBe('PC020 Active Cohort');
      expect(d.group_type).toBe('engagement');
      expect(d.status).toBe('active');
      expect(d.member_count).toBe(2);
      expect(d.non_system_member_count).toBe(2);
      expect(d.deusex_stewarded).toBe(false);
      expect(d.created_at).toBeTruthy();
      expect(d.updated_at).toBeTruthy();
      const stewards = d.stewards as { display_name: string; personal_group_id: string }[];
      expect(stewards).toHaveLength(2);
      const names = stewards.map((s) => s.display_name).sort();
      // Display identity = the personal group's name (the B-DISP oracle).
      expect(names).toEqual(['Mona', 'Stella']);
      expect(stewards.map((s) => s.personal_group_id).sort()).toEqual(
        [stella.personalGroupId, mona.personalGroupId].sort(),
      );
    });

    it('a caretaker group reads deusex_stewarded true with an empty human steward list (the flag carries the caretaker, walked to the H035 banner)', async () => {
      const { data, error } = await adaClient.rpc('admin_get_group_detail', { p_group_id: gCaretaker });
      expect(error).toBeNull();
      const d = data as Record<string, unknown>;
      expect(d.deusex_stewarded).toBe(true);
      expect(d.stewards as unknown[]).toHaveLength(0);
    });

    // The members array (adjudicated at TASK-ADMB-02, Stefan 2026-08-01: the
    // picker source — the walked get_group_memberships_of reads the wrong
    // direction). RED between migration 20260801120000 and 20260801130000:
    // the key is absent from the walked v1 payload.
    it('detail carries the active human members with steward flags (the reassign picker source)', async () => {
      const { data, error } = await adaClient.rpc('admin_get_group_detail', { p_group_id: gActive });
      expect(error).toBeNull();
      const members = (data as Record<string, unknown>).members as
        | { personal_group_id: string; display_name: string; is_steward: boolean }[]
        | undefined;
      expect(members).toBeDefined();
      expect(members!).toHaveLength(2);
      expect(members!.map((m) => m.display_name).sort()).toEqual(['Mona', 'Stella']);
      for (const m of members!) expect(m.is_steward).toBe(true);
    });

    it('a caretaker group lists only its human members — the caretaker never appears as a member row', async () => {
      const { data, error } = await adaClient.rpc('admin_get_group_detail', {
        p_group_id: gCaretaker,
      });
      expect(error).toBeNull();
      const members = (data as Record<string, unknown>).members as
        | { personal_group_id: string; display_name: string; is_steward: boolean }[]
        | undefined;
      expect(members).toBeDefined();
      expect(members!).toHaveLength(1);
      expect(members![0].display_name).toBe('Hilda');
      expect(members![0].personal_group_id).toBe(hilda.personalGroupId);
      expect(members![0].is_steward).toBe(false);
    });

    it('an unknown id refuses typed P0002', async () => {
      const { error } = await adaClient.rpc('admin_get_group_detail', { p_group_id: GHOST_GROUP });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0002');
    });

    it('a personal group id refuses P0002 — personal groups never appear on the admin plane', async () => {
      const { error } = await adaClient.rpc('admin_get_group_detail', {
        p_group_id: mona.personalGroupId,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0002');
    });
  });

  describe("STORY-3 — suspend / reactivate (the first 'suspended' producers)", () => {
    it('suspending an active engagement group writes status + audit row', async () => {
      const { error } = await adaClient.rpc('admin_suspend_group', { p_group_id: gCycle, p_reason: 'FEAT-PC030 adapted: reason required' });
      expect(error).toBeNull();
      expect(await groupStatus(gCycle)).toBe('suspended');
      const rows = await auditRows('group.suspend', gCycle);
      expect(rows).toHaveLength(1);
      expect(rows[0].actor_group_id).toBe(ada.personalGroupId);
    });

    it("the member-facing detail read reports the status — the GRP-5 badge's data path, asserted through the EXISTING contract", async () => {
      const c = await asUser(stella); // stella is a member (creator) of gCycle
      const { data, error } = await c.rpc('get_group_detail', { p_group_id: gCycle });
      expect(error).toBeNull();
      expect((data as Record<string, unknown>).status).toBe('suspended');
      await c.auth.signOut();
    });

    it('re-suspending refuses P0001 and writes nothing', async () => {
      const { error } = await adaClient.rpc('admin_suspend_group', { p_group_id: gCycle, p_reason: 'FEAT-PC030 adapted: reason required' });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      expect(await auditRows('group.suspend', gCycle)).toHaveLength(1); // still exactly one
    });

    it('reactivating a suspended group restores active + audit row', async () => {
      const { error } = await adaClient.rpc('admin_reactivate_group', { p_group_id: gCycle, p_reason: 'FEAT-PC030 adapted: reason required' });
      expect(error).toBeNull();
      expect(await groupStatus(gCycle)).toBe('active');
      const rows = await auditRows('group.reactivate', gCycle);
      expect(rows).toHaveLength(1);
      expect(rows[0].actor_group_id).toBe(ada.personalGroupId);
    });

    it('reactivating an active group refuses P0001 (wrong-state transition)', async () => {
      const { error } = await adaClient.rpc('admin_reactivate_group', { p_group_id: gCycle, p_reason: 'FEAT-PC030 adapted: reason required' });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
    });

    it('suspending a closed group refuses P0001 and writes nothing', async () => {
      const { error } = await adaClient.rpc('admin_suspend_group', { p_group_id: gClosed, p_reason: 'FEAT-PC030 adapted: reason required' });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      expect(await groupStatus(gClosed)).toBe('closed');
      expect(await auditRows('group.suspend', gClosed)).toHaveLength(0);
    });

    it('suspending an archived group refuses P0001', async () => {
      const { error } = await adaClient.rpc('admin_suspend_group', { p_group_id: gArchived, p_reason: 'FEAT-PC030 adapted: reason required' });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      expect(await groupStatus(gArchived)).toBe('archived');
    });

    it('suspending a personal group refuses 22023 (engagement groups only)', async () => {
      const { error } = await adaClient.rpc('admin_suspend_group', {
        p_group_id: mona.personalGroupId,
        p_reason: 'FEAT-PC030 adapted: reason required', // DB-4 adaptation
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('22023');
    });

    it('suspending a system group refuses 22023', async () => {
      const { error } = await adaClient.rpc('admin_suspend_group', { p_group_id: deusexId, p_reason: 'FEAT-PC030 adapted: reason required' });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('22023');
    });

    it('reactivating a closed group refuses P0001 (not suspended)', async () => {
      const { error } = await adaClient.rpc('admin_reactivate_group', { p_group_id: gClosed, p_reason: 'FEAT-PC030 adapted: reason required' });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
    });
  });

  describe('STORY-4 — reassignment out of caretakership (the RW-05 exit)', () => {
    it('a target who is not an active member refuses 22023 with no partial state (transactional)', async () => {
      const { error } = await adaClient.rpc('admin_reassign_group_stewardship', {
        p_group_id: gCaretaker,
        p_new_steward_group_id: nomi.personalGroupId,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('22023');
      const caretaker = await deusexCaretakerState(gCaretaker);
      expect(caretaker.isActiveMember).toBe(true); // caretakership intact
      expect(caretaker.holdsSteward).toBe(true);
      const nomiRoles = await runAdminSql(
        `SELECT id FROM public.user_group_roles
          WHERE group_id = '${gCaretaker}' AND member_group_id = '${nomi.personalGroupId}';`,
      );
      expect(nomiRoles).toHaveLength(0);
    });

    it('a non-human target (the DeusEx group itself, an active member) refuses 22023', async () => {
      const { error } = await adaClient.rpc('admin_reassign_group_stewardship', {
        p_group_id: gCaretaker,
        p_new_steward_group_id: deusexId,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('22023');
    });

    it('reassigning to an active human member grants Steward, ends the caretaker membership, and audits actor + target', async () => {
      const { error } = await adaClient.rpc('admin_reassign_group_stewardship', {
        p_group_id: gCaretaker,
        p_new_steward_group_id: hilda.personalGroupId,
      });
      expect(error).toBeNull();

      const hildaSteward = await runAdminSql(
        `SELECT ugr.id FROM public.user_group_roles ugr
           JOIN public.group_roles gr ON gr.id = ugr.group_role_id
          WHERE ugr.group_id = '${gCaretaker}'
            AND ugr.member_group_id = '${hilda.personalGroupId}'
            AND (gr.created_from_role_template_id =
                   (SELECT id FROM public.role_templates WHERE name = 'Steward Role Template')
                 OR gr.name = 'Steward');`,
      );
      expect(hildaSteward).toHaveLength(1);

      const caretaker = await deusexCaretakerState(gCaretaker);
      expect(caretaker.isActiveMember).toBe(false); // the caretaker membership is ended
      expect(caretaker.holdsSteward).toBe(false);

      const rows = await auditRows('group.reassign_stewardship', gCaretaker);
      expect(rows).toHaveLength(1);
      expect(rows[0].actor_group_id).toBe(ada.personalGroupId);
      expect((rows[0].metadata as Record<string, unknown>).new_steward_group_id).toBe(
        hilda.personalGroupId,
      );
    });

    it('after the exit, deusex_stewarded reads false in detail and the group leaves the caretaker filter', async () => {
      const { data: detail } = await adaClient.rpc('admin_get_group_detail', {
        p_group_id: gCaretaker,
      });
      expect((detail as Record<string, unknown>).deusex_stewarded).toBe(false);
      const { data: list } = await adaClient.rpc('admin_get_groups', {
        p_filter: 'deusex_stewarded',
      });
      expect((list as Record<string, unknown>[]).map((r) => r.id)).not.toContain(gCaretaker);
    });

    it('a group not in caretakership refuses P0001', async () => {
      const { error } = await adaClient.rpc('admin_reassign_group_stewardship', {
        p_group_id: gActive,
        p_new_steward_group_id: mona.personalGroupId,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
    });
  });

  describe('STORY-5 — producer-driven audit proof', () => {
    it('every mutation exercised through the real contracts has its admin_audit_log row', async () => {
      expect(await auditRows('group.suspend', gSusp)).toHaveLength(1);
      expect(await auditRows('group.suspend', gCycle)).toHaveLength(1);
      expect(await auditRows('group.reactivate', gCycle)).toHaveLength(1);
      expect(await auditRows('group.reassign_stewardship', gCaretaker)).toHaveLength(1);
    });

    it('S5b (labelled green, carried forward): append-only holds against the post-change catalog — no UPDATE/DELETE policies on admin_audit_log', async () => {
      const rows = await runAdminSql(
        `SELECT cmd FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'admin_audit_log'
            AND cmd IN ('UPDATE', 'DELETE');`,
      );
      expect(rows).toHaveLength(0);
    });

    it('S5c (labelled green, carried forward): an authenticated UPDATE on an audit row is refused by RLS', async () => {
      const target = await auditRows('group.reactivate', gCycle);
      expect(target).toHaveLength(1);
      const { data } = await adaClient
        .from('admin_audit_log')
        .update({ action: 'tampered' })
        .eq('action', 'group.reactivate')
        .eq('target', gCycle)
        .select();
      expect(data ?? []).toHaveLength(0);
      expect(await auditRows('group.reactivate', gCycle)).toHaveLength(1); // row unchanged
    });
  });
});
