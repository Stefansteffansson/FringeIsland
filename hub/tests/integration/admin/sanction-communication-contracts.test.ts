import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  withAnonRateLimitRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(300_000); // real-substrate gate suite: eight users, three groups, one Mist

/**
 * FEAT-PC030 (DB-4, TASK-DB4-01) — sanction communication contracts.
 * The seven hold-family transitions gain a member-facing reason (required on
 * the five admin sanctions, optional on the Steward's rest/wake), record it on
 * the current hold (`groups.hold_reason`, `users.suspension_reason`) and in
 * the audit row, write one locked-on notice per affected member (FEAT-PD021's
 * kinds), and the current-hold reads carry the reason to the right people.
 * The groups SELECT grant becomes column-scoped so the reason never reaches a
 * direct caller. Migration `20260903120000`.
 *
 * RED AT HEAD (pre-migration), by class:
 *  - Every call carrying `p_reason` is PGRST202 (no such overload) — the
 *    STORY-1 admin cells, the STORY-2 note cells, every STORY-3 transition.
 *  - `hold_reason` / `suspension_reason` do not exist: the row reads (42703)
 *    and the direct-caller cells (which expect 42501, not 42703) fail.
 *  - No notice row lands (the kinds are unregistered); the reads carry no
 *    reason key; the blank-reason cells find no 22023.
 *
 * LABELLED GREEN (green before AND after by design — never claimed as red):
 *  - the non-admin wall (42501) on the admin contracts;
 *  - the PC023 refusals on rest_group / wake_group WITHOUT a note
 *    ('rest_group required', 'group is suspended');
 *  - the old-shape Steward call `rest_group(p_group_id)` still resolving
 *    (the defaulted parameter) — STORY-5's continuity pin;
 *  - the non-member P0002 on a held public group (get_group_detail's law).
 */

const KIND_LABEL: Record<string, string> = {
  group_rested: 'Your group is resting',
  group_woken: 'Your group is awake again',
  group_suspended: 'Your group has been suspended',
  group_reactivated: 'Your group has been reactivated',
  account_suspended: 'Your account has been suspended',
  account_reinstated: 'Your account has been reinstated',
};

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

type NoticeRow = {
  recipient_group_id: string;
  type: string;
  title: string;
  body: string;
  group_id: string | null;
};

describe('FEAT-PC030 — sanction communication contracts (DB-4)', () => {
  const admin = createAdminClient();

  let ada: TestUser; // platform admin
  let stella: TestUser; // steward of gHold + gPublic — rest_group holder
  let mona: TestUser; // active member of gHold + gPublic (no rest_group key)
  let olle: TestUser; // active member of gHold
  let paula: TestUser; // active member of gHold — the account-hold target
  let ida: TestUser; // PAUSED member of gHold — never a recipient
  let leo: TestUser; // steward of gActing (an active non-FIM member of gHold) — the wielder
  let nils: TestUser; // a stranger — non-member of everything
  const users: TestUser[] = [];

  let adaC: SupabaseClient;
  let stellaC: SupabaseClient;
  let monaC: SupabaseClient;
  let paulaC: SupabaseClient;
  let leoC: SupabaseClient;
  let nilsC: SupabaseClient;

  let gHold: string; // stella's PRIVATE group — the transitions target
  let gPublic: string; // stella's PUBLIC group — the direct-caller + non-member cells
  let gActing: string; // leo's group, an active member of gHold (non-FIM member)
  let paulaUserId: string; // public.users.id (the admin_update_user_status target)
  let fixturePgs: string[]; // every fixture personal group — the notice-count universe

  const groupRow = async (groupId: string): Promise<{ status: string; hold_reason: string | null }> => {
    const { data, error } = await admin
      .from('groups')
      .select('status,hold_reason')
      .eq('id', groupId)
      .single();
    if (error) throw new Error(`groupRow(${groupId}): ${error.message}`);
    return data as { status: string; hold_reason: string | null };
  };

  const userRow = async (userId: string): Promise<{ is_active: boolean; suspension_reason: string | null }> => {
    const { data, error } = await admin
      .from('users')
      .select('is_active,suspension_reason')
      .eq('id', userId)
      .single();
    if (error) throw new Error(`userRow(${userId}): ${error.message}`);
    return data as { is_active: boolean; suspension_reason: string | null };
  };

  const latestAudit = async (action: string, target: string): Promise<Record<string, unknown> | null> => {
    const { data, error } = await admin
      .from('admin_audit_log')
      .select('metadata')
      .eq('action', action)
      .eq('target', target)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw new Error(`latestAudit(${action}): ${error.message}`);
    const rows = data as Array<{ metadata: Record<string, unknown> }>;
    return rows.length ? rows[0].metadata : null;
  };

  const auditCount = async (action: string, target: string): Promise<number> => {
    const { count, error } = await admin
      .from('admin_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('action', action)
      .eq('target', target);
    if (error) throw new Error(`auditCount(${action}): ${error.message}`);
    return count ?? 0;
  };

  const notices = async (kind: string): Promise<NoticeRow[]> => {
    const { data, error } = await admin
      .from('notifications')
      .select('recipient_group_id,type,title,body,group_id')
      .eq('type', kind)
      .in('recipient_group_id', fixturePgs);
    if (error) throw new Error(`notices(${kind}): ${error.message}`);
    return data as NoticeRow[];
  };

  const clearNotices = async () => {
    const { error } = await admin.from('notifications').delete().in('recipient_group_id', fixturePgs);
    if (error) throw new Error(`clearNotices: ${error.message}`);
  };

  const expectRefusal = async (
    client: SupabaseClient,
    fn: string,
    args: Record<string, unknown>,
    code: string,
    msg?: string,
  ) => {
    const { error } = await client.rpc(fn, args);
    expect(error).not.toBeNull();
    expect(error?.code).toBe(code);
    if (msg) expect(String(error?.message)).toContain(msg);
  };

  const expectOk = async (
    client: SupabaseClient,
    fn: string,
    args: Record<string, unknown>,
  ): Promise<unknown> => {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw new Error(`${fn} expected ok: ${error.message}`);
    return data;
  };

  const recipientsOf = (rows: NoticeRow[]) => rows.map((r) => r.recipient_group_id).sort();

  /** Recovery so one red cell never cascades: put gHold back to active. */
  afterEach(async () => {
    if (!gHold || !adaC) return;
    const { status } = await groupRow(gHold);
    if (status === 'suspended') {
      await adaC.rpc('admin_reactivate_group', { p_group_id: gHold, p_reason: 'test recovery' });
    } else if (status === 'resting') {
      await adaC.rpc('admin_wake_group', { p_group_id: gHold, p_reason: 'test recovery' });
    }
  });

  beforeAll(async () => {
    ada = await createTestUser({ displayName: 'Db4Ada' });
    stella = await createTestUser({ displayName: 'Db4Stella' });
    mona = await createTestUser({ displayName: 'Db4Mona' });
    olle = await createTestUser({ displayName: 'Db4Olle' });
    paula = await createTestUser({ displayName: 'Db4Paula' });
    ida = await createTestUser({ displayName: 'Db4Ida' });
    leo = await createTestUser({ displayName: 'Db4Leo' });
    nils = await createTestUser({ displayName: 'Db4Nils' });
    users.push(ada, stella, mona, olle, paula, ida, leo, nils);
    fixturePgs = users.map((u) => u.personalGroupId);
    await makePlatformAdmin(ada.personalGroupId);

    const signIn = async (u: TestUser) => {
      const c = createTestClient();
      await signInWithRetry(c, u.email, u.password);
      return c;
    };
    adaC = await signIn(ada);
    stellaC = await signIn(stella);
    monaC = await signIn(mona);
    paulaC = await signIn(paula);
    leoC = await signIn(leo);
    nilsC = await signIn(nils);

    const { data: paulaRow, error: paulaErr } = await admin
      .from('users')
      .select('id')
      .eq('auth_user_id', paula.user.id)
      .single();
    if (paulaErr) throw new Error(`paula users.id: ${paulaErr.message}`);
    paulaUserId = (paulaRow as { id: string }).id;

    const mkGroup = async (c: SupabaseClient, name: string): Promise<string> => {
      const { data, error } = await c.rpc('create_engagement_group', { p_name: name });
      if (error) throw new Error(`create ${name}: ${error.message}`);
      return data as string;
    };
    gHold = await mkGroup(stellaC, 'DB4 Hold Target');
    gPublic = await mkGroup(stellaC, 'DB4 Public Target');
    gActing = await mkGroup(leoC, 'DB4 Acting');
    await admin.from('groups').update({ is_public: true }).eq('id', gPublic);

    // Members — the house admin-insert idiom.
    const insertMembership = async (g: string, memberGroupId: string, status: string) => {
      const { error } = await admin.from('group_memberships').insert({
        group_id: g,
        member_group_id: memberGroupId,
        status,
        added_by_group_id: stella.personalGroupId,
      });
      if (error) throw new Error(`membership ${g}/${memberGroupId}: ${error.message}`);
    };
    await insertMembership(gHold, mona.personalGroupId, 'active');
    await insertMembership(gHold, olle.personalGroupId, 'active');
    await insertMembership(gHold, paula.personalGroupId, 'active');
    await insertMembership(gHold, ida.personalGroupId, 'paused');
    await insertMembership(gHold, gActing, 'active'); // non-FIM member; leo wields it
    await insertMembership(gPublic, mona.personalGroupId, 'active');
  });

  afterAll(async () => {
    for (const g of [gActing, gHold, gPublic]) {
      if (g) await cleanupTestGroup(g).catch(() => undefined);
    }
    if (ada) await demotePlatformAdmin(ada.personalGroupId);
    for (const u of users) {
      await cleanupTestUser(u.user.id).catch(() => undefined);
    }
  });

  // ---------------------------------------------------------------------------
  describe('STORY-1 — the admin sanctions require a reason and record it', () => {
    it('admin_suspend_group with a reason: suspended, hold_reason set, audit carries reason + previous_status', async () => {
      await expectOk(adaC, 'admin_suspend_group', {
        p_group_id: gHold,
        p_reason: 'Repeated harassment reports',
      });
      expect(await groupRow(gHold)).toEqual({
        status: 'suspended',
        hold_reason: 'Repeated harassment reports',
      });
      const meta = await latestAudit('group.suspend', gHold);
      expect(meta).toMatchObject({ reason: 'Repeated harassment reports', previous_status: 'active' });
    });

    it('admin_reactivate_group: blank → 22023 and still suspended; with a reason → active, hold_reason cleared, audited', async () => {
      // Self-contained: the afterEach recovery puts gHold back to active between cells.
      await expectOk(adaC, 'admin_suspend_group', { p_group_id: gHold, p_reason: 'Held for the reactivation cell' });
      expect((await groupRow(gHold)).status).toBe('suspended');
      await expectRefusal(adaC, 'admin_reactivate_group', { p_group_id: gHold, p_reason: '   ' }, '22023', 'Reason required');
      await expectRefusal(adaC, 'admin_reactivate_group', { p_group_id: gHold }, '22023', 'Reason required');
      expect((await groupRow(gHold)).status).toBe('suspended');

      await expectOk(adaC, 'admin_reactivate_group', { p_group_id: gHold, p_reason: 'Review complete' });
      expect(await groupRow(gHold)).toEqual({ status: 'active', hold_reason: null });
      expect(await latestAudit('group.reactivate', gHold)).toMatchObject({ reason: 'Review complete' });
    });

    it('admin_suspend_group refuses a null or blank reason with 22023 and changes nothing', async () => {
      const before = await auditCount('group.suspend', gPublic);
      await expectRefusal(adaC, 'admin_suspend_group', { p_group_id: gPublic, p_reason: '' }, '22023', 'Reason required');
      await expectRefusal(adaC, 'admin_suspend_group', { p_group_id: gPublic }, '22023', 'Reason required');
      expect(await groupRow(gPublic)).toEqual({ status: 'active', hold_reason: null });
      expect(await auditCount('group.suspend', gPublic)).toBe(before);
    });

    it('admin_rest_group / admin_wake_group — the same shape on resting ↔ active', async () => {
      await expectRefusal(adaC, 'admin_rest_group', { p_group_id: gHold }, '22023', 'Reason required');
      await expectOk(adaC, 'admin_rest_group', { p_group_id: gHold, p_reason: 'Maintenance window' });
      expect(await groupRow(gHold)).toEqual({ status: 'resting', hold_reason: 'Maintenance window' });
      expect(await latestAudit('group.rest', gHold)).toMatchObject({ reason: 'Maintenance window' });

      await expectRefusal(adaC, 'admin_wake_group', { p_group_id: gHold, p_reason: ' ' }, '22023', 'Reason required');
      expect((await groupRow(gHold)).status).toBe('resting');
      await expectOk(adaC, 'admin_wake_group', { p_group_id: gHold, p_reason: 'Maintenance done' });
      expect(await groupRow(gHold)).toEqual({ status: 'active', hold_reason: null });
      expect(await latestAudit('group.wake', gHold)).toMatchObject({ reason: 'Maintenance done' });
    });

    it('admin_update_user_status — reason required either way; recorded on suspend, cleared on reinstate, audited', async () => {
      await expectRefusal(adaC, 'admin_update_user_status', { target_user_id: paulaUserId, new_is_active: false }, '22023', 'Reason required');
      expect((await userRow(paulaUserId)).is_active).toBe(true);

      await expectOk(adaC, 'admin_update_user_status', {
        target_user_id: paulaUserId,
        new_is_active: false,
        p_reason: 'Terms breach',
      });
      expect(await userRow(paulaUserId)).toEqual({ is_active: false, suspension_reason: 'Terms breach' });
      expect(await latestAudit('member.suspend', paulaUserId)).toMatchObject({ reason: 'Terms breach' });

      await expectRefusal(adaC, 'admin_update_user_status', { target_user_id: paulaUserId, new_is_active: true, p_reason: '' }, '22023', 'Reason required');
      expect((await userRow(paulaUserId)).is_active).toBe(false);

      await expectOk(adaC, 'admin_update_user_status', {
        target_user_id: paulaUserId,
        new_is_active: true,
        p_reason: 'Cleared on appeal',
      });
      expect(await userRow(paulaUserId)).toEqual({ is_active: true, suspension_reason: null });
      expect(await latestAudit('member.reactivate', paulaUserId)).toMatchObject({ reason: 'Cleared on appeal' });
    });

    it('a non-admin with a reason still meets the admin wall (42501) — labelled green', async () => {
      await expectRefusal(stellaC, 'admin_suspend_group', { p_group_id: gHold, p_reason: 'x' }, '42501', 'platform administrator required');
      await expectRefusal(monaC, 'admin_update_user_status', { target_user_id: paulaUserId, new_is_active: false, p_reason: 'x' }, '42501', 'platform administrator required');
      expect((await groupRow(gHold)).status).toBe('active');
    });
  });

  // ---------------------------------------------------------------------------
  describe('STORY-3 premise — the notice titles are Core literals equal to the registry labels', () => {
    // LABELLED PIN (not red-first): the invocation-axis gate refused the first
    // issue's read of notification_kinds (DS-5) from the PC-3/PC-4 contracts;
    // 20260903130000 made the titles Core literals. This cell keeps the two
    // vocabularies equal — drift in the registry OR the contracts fails red.
    it('every hold kind label in the registry equals the title the contract writes', async () => {
      const { data, error } = await admin
        .from('notification_kinds')
        .select('kind,label')
        .in('kind', Object.keys(KIND_LABEL));
      if (error) throw new Error(`registry: ${error.message}`);
      const registry = Object.fromEntries(
        (data as Array<{ kind: string; label: string }>).map((r) => [r.kind, r.label]),
      );
      expect(registry).toEqual(KIND_LABEL);
    });
  });

  // ---------------------------------------------------------------------------
  describe("STORY-2 — the Steward's rest/wake carry an optional note", () => {
    it('rest_group with a note lands resting with hold_reason = note; wake_group clears it regardless of its note', async () => {
      await expectOk(stellaC, 'rest_group', { p_group_id: gHold, p_reason: 'Summer break' });
      expect(await groupRow(gHold)).toEqual({ status: 'resting', hold_reason: 'Summer break' });
      await expectOk(stellaC, 'wake_group', { p_group_id: gHold, p_reason: 'Back from the break' });
      expect(await groupRow(gHold)).toEqual({ status: 'active', hold_reason: null });
    });

    it('rest_group without a note is never refused (the old-shape call — STORY-5 continuity pin); a blank note is none', async () => {
      await expectOk(stellaC, 'rest_group', { p_group_id: gHold });
      expect(await groupRow(gHold)).toEqual({ status: 'resting', hold_reason: null });
      await expectOk(stellaC, 'wake_group', { p_group_id: gHold });
      expect(await groupRow(gHold)).toEqual({ status: 'active', hold_reason: null });

      await expectOk(stellaC, 'rest_group', { p_group_id: gHold, p_reason: '   ' });
      expect(await groupRow(gHold)).toEqual({ status: 'resting', hold_reason: null });
      await expectOk(stellaC, 'wake_group', { p_group_id: gHold });
    });

    it('the PC023 refusals answer byte-identically with or without a note', async () => {
      await expectRefusal(monaC, 'rest_group', { p_group_id: gHold, p_reason: 'x' }, '42501', 'rest_group required');
      await expectRefusal(monaC, 'rest_group', { p_group_id: gHold }, '42501', 'rest_group required');

      await expectOk(adaC, 'admin_suspend_group', { p_group_id: gHold, p_reason: 'Hold for review' });
      await expectRefusal(stellaC, 'rest_group', { p_group_id: gHold, p_reason: 'x' }, 'P0001', 'group is suspended');
      await expectRefusal(stellaC, 'rest_group', { p_group_id: gHold }, 'P0001', 'group is suspended');
      await expectRefusal(stellaC, 'wake_group', { p_group_id: gHold, p_reason: 'x' }, 'P0001', 'group is suspended');
      await expectRefusal(stellaC, 'wake_group', { p_group_id: gHold }, 'P0001', 'group is suspended');
      await expectOk(adaC, 'admin_reactivate_group', { p_group_id: gHold, p_reason: 'Review done' });
      expect(await groupRow(gHold)).toEqual({ status: 'active', hold_reason: null });
    });
  });

  // ---------------------------------------------------------------------------
  describe('STORY-3 — every affected member hears, and cannot be spared', () => {
    beforeEach(async () => {
      await clearNotices();
    });

    it('a Steward rest with a note reaches exactly the active FIM members — not the actor, the paused, or the non-FIM member', async () => {
      await expectOk(stellaC, 'rest_group', { p_group_id: gHold, p_reason: 'Summer break' });
      const rows = await notices('group_rested');
      expect(recipientsOf(rows)).toEqual(
        [mona.personalGroupId, olle.personalGroupId, paula.personalGroupId].sort(),
      );
      for (const r of rows) {
        expect(r.title).toBe(KIND_LABEL.group_rested);
        expect(r.body).toBe('Summer break');
        expect(r.group_id).toBe(gHold);
      }
      await expectOk(stellaC, 'wake_group', { p_group_id: gHold, p_reason: 'Welcome back' });
      const woken = await notices('group_woken');
      expect(recipientsOf(woken)).toEqual(
        [mona.personalGroupId, olle.personalGroupId, paula.personalGroupId].sort(),
      );
      expect(woken.every((r) => r.body === 'Welcome back' && r.title === KIND_LABEL.group_woken)).toBe(true);
    });

    it('a Steward rest with no note carries the label as the body — never an empty body', async () => {
      await expectOk(stellaC, 'rest_group', { p_group_id: gHold });
      const rows = await notices('group_rested');
      expect(rows.length).toBe(3);
      expect(rows.every((r) => r.body === KIND_LABEL.group_rested)).toBe(true);
      await expectOk(stellaC, 'wake_group', { p_group_id: gHold });
      expect((await notices('group_woken')).every((r) => r.body === KIND_LABEL.group_woken)).toBe(true);
    });

    it('admin suspend / reactivate / rest / wake each write their kind with the reason as the body', async () => {
      // The ADMIN is the actor here, so the Steward (an active member) hears too: four, not three.
      const four = [mona.personalGroupId, olle.personalGroupId, paula.personalGroupId, stella.personalGroupId].sort();

      await expectOk(adaC, 'admin_suspend_group', { p_group_id: gHold, p_reason: 'Repeated reports' });
      let rows = await notices('group_suspended');
      expect(recipientsOf(rows)).toEqual(four);
      expect(rows.every((r) => r.body === 'Repeated reports' && r.title === KIND_LABEL.group_suspended && r.group_id === gHold)).toBe(true);

      await expectOk(adaC, 'admin_reactivate_group', { p_group_id: gHold, p_reason: 'Resolved' });
      rows = await notices('group_reactivated');
      expect(recipientsOf(rows)).toEqual(four);
      expect(rows.every((r) => r.body === 'Resolved' && r.title === KIND_LABEL.group_reactivated)).toBe(true);

      await expectOk(adaC, 'admin_rest_group', { p_group_id: gHold, p_reason: 'Audit in progress' });
      rows = await notices('group_rested');
      expect(recipientsOf(rows)).toEqual(four);
      expect(rows.every((r) => r.body === 'Audit in progress')).toBe(true);

      await expectOk(adaC, 'admin_wake_group', { p_group_id: gHold, p_reason: 'Audit done' });
      rows = await notices('group_woken');
      expect(recipientsOf(rows)).toEqual(four);
      expect(rows.every((r) => r.body === 'Audit done')).toBe(true);
    });

    it('a member who muted every suppressible category still receives the sanction notice (locked on)', async () => {
      const { data: cats, error } = await admin
        .from('notification_categories')
        .select('key')
        .eq('member_suppressible', true);
      if (error) throw new Error(`categories: ${error.message}`);
      for (const c of cats as Array<{ key: string }>) {
        await expectOk(monaC, 'set_own_notification_preference', {
          p_category_key: c.key,
          p_channel: 'in_app',
          p_allowed: false,
        });
      }
      await clearNotices();
      await expectOk(adaC, 'admin_suspend_group', { p_group_id: gHold, p_reason: 'Locked on' });
      const rows = await notices('group_suspended');
      expect(recipientsOf(rows)).toContain(mona.personalGroupId);
      await expectOk(adaC, 'admin_reactivate_group', { p_group_id: gHold, p_reason: 'Unlocked' });
    });

    it("an account hold writes exactly one account_suspended row to the member's personal group; reinstatement one account_reinstated", async () => {
      await expectOk(adaC, 'admin_update_user_status', {
        target_user_id: paulaUserId,
        new_is_active: false,
        p_reason: 'Terms breach',
      });
      const held = await notices('account_suspended');
      expect(held).toEqual([
        {
          recipient_group_id: paula.personalGroupId,
          type: 'account_suspended',
          title: KIND_LABEL.account_suspended,
          body: 'Terms breach',
          group_id: null,
        },
      ]);

      await expectOk(adaC, 'admin_update_user_status', {
        target_user_id: paulaUserId,
        new_is_active: true,
        p_reason: 'Cleared',
      });
      const back = await notices('account_reinstated');
      expect(back).toEqual([
        {
          recipient_group_id: paula.personalGroupId,
          type: 'account_reinstated',
          title: KIND_LABEL.account_reinstated,
          body: 'Cleared',
          group_id: null,
        },
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  describe('STORY-4 — the current-hold reads say why, to the right people', () => {
    it('get_group_detail carries hold_reason for an active member on a resting group; null once active', async () => {
      await expectOk(stellaC, 'rest_group', { p_group_id: gHold, p_reason: 'Summer break' });
      const held = (await expectOk(monaC, 'get_group_detail', { p_group_id: gHold })) as Record<string, unknown>;
      expect(held.status).toBe('resting');
      expect(held.hold_reason).toBe('Summer break');
      const stewardView = (await expectOk(stellaC, 'get_group_detail', { p_group_id: gHold })) as Record<string, unknown>;
      expect(stewardView.hold_reason).toBe('Summer break');

      await expectOk(stellaC, 'wake_group', { p_group_id: gHold });
      const active = (await expectOk(monaC, 'get_group_detail', { p_group_id: gHold })) as Record<string, unknown>;
      expect(active.status).toBe('active');
      expect('hold_reason' in active).toBe(true);
      expect(active.hold_reason).toBeNull();
    });

    it('the suspended minimal payload carries hold_reason for the member; the wielding non-member sees null', async () => {
      await expectOk(adaC, 'admin_suspend_group', { p_group_id: gHold, p_reason: 'Repeated reports' });
      const memberView = (await expectOk(monaC, 'get_group_detail', { p_group_id: gHold })) as Record<string, unknown>;
      expect(Object.keys(memberView).sort()).toEqual(['hold_reason', 'id', 'name', 'status']);
      expect(memberView.status).toBe('suspended');
      expect(memberView.hold_reason).toBe('Repeated reports');

      // leo wields gActing (an active member of gHold) — the revealed case reads
      // the held group as a NON-member: the reason is not his.
      const wielderView = (await expectOk(leoC, 'get_group_detail', { p_group_id: gHold })) as Record<string, unknown>;
      expect(wielderView.status).toBe('suspended');
      expect(wielderView.hold_reason).toBeNull();

      await expectOk(adaC, 'admin_reactivate_group', { p_group_id: gHold, p_reason: 'Done' });
    });

    it('a non-member reads a public group only while active (P0002 while held — labelled continuity); active → hold_reason null', async () => {
      const activeView = (await expectOk(nilsC, 'get_group_detail', { p_group_id: gPublic })) as Record<string, unknown>;
      expect(activeView.hold_reason).toBeNull();
      await expectOk(stellaC, 'rest_group', { p_group_id: gPublic, p_reason: 'Members only note' });
      await expectRefusal(nilsC, 'get_group_detail', { p_group_id: gPublic }, 'P0002', 'group not found');
      await expectOk(stellaC, 'wake_group', { p_group_id: gPublic });
    });

    it('get_own_account_state carries suspension_reason while suspended, null when active', async () => {
      const before = (await expectOk(paulaC, 'get_own_account_state', {})) as Record<string, unknown>;
      expect('suspension_reason' in before).toBe(true);
      expect(before.suspension_reason).toBeNull();

      await expectOk(adaC, 'admin_update_user_status', {
        target_user_id: paulaUserId,
        new_is_active: false,
        p_reason: 'Terms breach',
      });
      const held = (await expectOk(paulaC, 'get_own_account_state', {})) as Record<string, unknown>;
      expect(held.state).toBe('suspended');
      expect(held.suspension_reason).toBe('Terms breach');

      await expectOk(adaC, 'admin_update_user_status', {
        target_user_id: paulaUserId,
        new_is_active: true,
        p_reason: 'Cleared',
      });
      const after = (await expectOk(paulaC, 'get_own_account_state', {})) as Record<string, unknown>;
      expect(after.state).toBe('active');
      expect(after.suspension_reason).toBeNull();
    });

    it('a direct PostgREST SELECT of groups.hold_reason is 42501 for a member and for a Mist; every other column still reads', async () => {
      const denied = await monaC.from('groups').select('hold_reason').eq('id', gPublic);
      expect(denied.error).not.toBeNull();
      expect(denied.error?.code).toBe('42501');

      const allowed = await monaC.from('groups').select('id,name,status,is_public').eq('id', gPublic);
      expect(allowed.error).toBeNull();
      expect((allowed.data as unknown[]).length).toBe(1);

      const deniedUsers = await monaC.from('users').select('suspension_reason').eq('id', paulaUserId);
      expect(deniedUsers.error).not.toBeNull();
      expect(deniedUsers.error?.code).toBe('42501');

      const mist = createTestClient();
      const anon = await withAnonRateLimitRetry(() => mist.auth.signInAnonymously());
      if (anon.error) throw new Error(`anonymous sign-in: ${anon.error.message}`);
      try {
        const mistDenied = await mist.from('groups').select('hold_reason').eq('id', gPublic);
        expect(mistDenied.error).not.toBeNull();
        expect(mistDenied.error?.code).toBe('42501');
        const mistAllowed = await mist.from('groups').select('id,name').eq('id', gPublic);
        expect(mistAllowed.error).toBeNull();
      } finally {
        await mist.auth.signOut({ scope: 'local' }).catch(() => undefined);
        const mistId = anon.data.user?.id;
        if (mistId) await cleanupTestUser(mistId).catch(() => undefined);
      }
    });
  });
});
