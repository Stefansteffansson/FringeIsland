import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import {
  createTestClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(180_000); // real-substrate suite: many users, sign-ins

/**
 * COR-C W1 — the admin half of ADR-U050, driven through the REAL producer
 * (Anatomy Audit III: AC3-1 CRITICAL, AC3-2, AC3-13, AC3-14 · closes GC-10).
 *
 * Every hold in this suite is imposed by invoking admin_update_user_status()
 * as an authenticated manage_all_groups actor — never by fixture SQL (AC3-2's
 * complaint against the self-service suite). Green means: the producer stamps
 * deactivation_origin, and the self-service gates hold against what the
 * producer actually writes.
 *
 * RED AT HEAD (pre-W1 migration 20260730210000), by case:
 *  - W1a: a hold on an ACTIVE account leaves deactivation_origin NULL —
 *    state reads suspended only via the NULL-origin fail-safe
 *  - W1b (the AC3-1 escape, end-to-end): pause -> admin hold -> the hold is
 *    a silent no-op; state reads 'paused' and reactivate_own_account()
 *    SUCCEEDS — the member walks out of an admin hold
 *  - W1d: release after pause->hold leaves a stale 'member' residue (the
 *    re-arm), and a re-imposed hold is escapable again
 *  - W1e: admin_decommission_user leaves the terminal record origin-less
 * LABELLED GREEN (green before AND after by design — never claimed as red):
 *  - W1c (AC3-13): the NULL-origin fail-safe — an off row of unknown origin
 *    reads suspended and neither self-service door opens
 *  - W1f: the admin wall on the producer refuses a plain member. ADAPTED at
 *    FEAT-PC021 gate 2 (sibling-assertion rule, migration 20260801190000):
 *    the wall is now the typed platform-admin gate — the cell pins 42501
 *    'platform administrator required' instead of the legacy P0001
 *    'Unauthorized: manage_all_groups…' prose, so it is red from the
 *    adaptation until that migration applies.
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

describe('COR-C W1 — ADR-U050 admin half through the real producer', () => {
  let ada: TestUser; // the manage_all_groups actor
  let adaClient: SupabaseClient;

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  /** admin_update_user_status targets public.users.id, not the auth id. */
  const publicUserIdOf = async (authUserId: string): Promise<string> => {
    const rows = await runAdminSql(
      `SELECT id FROM public.users WHERE auth_user_id = '${authUserId}';`,
    );
    return rows[0].id as string;
  };

  const lifecycleRowOf = async (authUserId: string) =>
    (
      await runAdminSql(
        `SELECT is_active, is_decommissioned, deactivation_origin
           FROM public.users WHERE auth_user_id = '${authUserId}';`,
      )
    )[0];

  const readState = async (client: SupabaseClient) => {
    const { data, error } = await client.rpc('get_own_account_state');
    if (error) throw new Error(`get_own_account_state: ${error.message}`);
    return data as {
      state: string;
      is_active: boolean;
      is_decommissioned: boolean;
      deactivation_origin: string | null;
    };
  };

  const adminSetStatus = async (targetPublicId: string, active: boolean) =>
    adaClient.rpc('admin_update_user_status', {
      target_user_id: targetPublicId,
      new_is_active: active,
      p_reason: 'FEAT-PC030 adapted: reason required', // DB-4: the admin sanctions require a reason (labelled adaptation)
    });

  beforeAll(async () => {
    ada = await createTestUser({ displayName: 'Ada Adminactor' });
    await makePlatformAdmin(ada.personalGroupId);
    adaClient = await asUser(ada);
  });
  afterAll(async () => {
    if (adaClient) await adaClient.auth.signOut();
    if (ada) {
      await demotePlatformAdmin(ada.personalGroupId);
      await cleanupTestUser(ada.user.id);
    }
  });

  describe('W1a: a hold on an active account stamps the admin origin', () => {
    let hilda: TestUser;
    beforeAll(async () => {
      hilda = await createTestUser({ displayName: 'Hilda Held' });
    });
    afterAll(async () => {
      if (hilda) await cleanupTestUser(hilda.user.id);
    });

    it('the producer writes deactivation_origin = admin in the same statement', async () => {
      const { error } = await adminSetStatus(await publicUserIdOf(hilda.user.id), false);
      expect(error).toBeNull();
      const row = await lifecycleRowOf(hilda.user.id);
      expect(row.is_active).toBe(false);
      // RED AT HEAD: the mutation never touches the column — NULL here.
      expect(row.deactivation_origin).toBe('admin');
    });

    it('[LABELLED GREEN — held via the NULL fail-safe at HEAD, via the explicit origin post-W1] the held member reads suspended and neither door opens', async () => {
      const c = await asUser(hilda);
      expect((await readState(c)).state).toBe('suspended');
      const { error: reactErr } = await c.rpc('reactivate_own_account');
      expect(reactErr).not.toBeNull();
      const { error: pauseErr } = await c.rpc('pause_own_account');
      expect(pauseErr).not.toBeNull();
      const row = await lifecycleRowOf(hilda.user.id);
      expect(row.is_active).toBe(false);
    });
  });

  describe('W1b: THE ESCAPE (AC3-1) — a hold imposed on a member-paused account', () => {
    let ella: TestUser;
    beforeAll(async () => {
      ella = await createTestUser({ displayName: 'Ella Escapes' });
      const c = await asUser(ella);
      const { error } = await c.rpc('pause_own_account');
      if (error) throw new Error(`pause fixture: ${error.message}`);
      await c.auth.signOut();
      const { error: holdErr } = await adminSetStatus(await publicUserIdOf(ella.user.id), false);
      if (holdErr) throw new Error(`hold fixture: ${holdErr.message}`);
    });
    afterAll(async () => {
      if (ella) await cleanupTestUser(ella.user.id);
    });

    it('the hold converts the member pause — origin admin, state suspended', async () => {
      // RED AT HEAD: the hold is a silent no-op on the already-off row;
      // origin stays 'member' and the state read still answers 'paused'.
      const row = await lifecycleRowOf(ella.user.id);
      expect(row.deactivation_origin).toBe('admin');
      const c = await asUser(ella);
      expect((await readState(c)).state).toBe('suspended');
    });

    it('the member cannot walk out of the hold', async () => {
      const c = await asUser(ella);
      const { error } = await c.rpc('reactivate_own_account');
      // RED AT HEAD: this call SUCCEEDS — the AC3-1 escape, end-to-end.
      expect(error).not.toBeNull();
      const row = await lifecycleRowOf(ella.user.id);
      expect(row.is_active).toBe(false);
    });
  });

  describe('W1c (AC3-13) [LABELLED GREEN — the NULL-origin fail-safe, green before and after]', () => {
    let nell: TestUser;
    beforeAll(async () => {
      nell = await createTestUser({ displayName: 'Nell Nullorigin' });
      // Deliberate fixture SQL: this case tests the DERIVATION fail-safe for
      // a row of unknown origin (the shape HEAD's admin suspend produces, and
      // the shape legacy rows may still carry post-W1) — not a producer.
      await runAdminSql(
        `UPDATE public.users SET is_active = false, deactivation_origin = NULL
          WHERE auth_user_id = '${nell.user.id}';`,
      );
    });
    afterAll(async () => {
      if (nell) await cleanupTestUser(nell.user.id);
    });

    it('an off row of unknown origin reads suspended and neither self-service door opens', async () => {
      const c = await asUser(nell);
      expect((await readState(c)).state).toBe('suspended');
      const { error: reactErr } = await c.rpc('reactivate_own_account');
      expect(reactErr).not.toBeNull();
      const { error: pauseErr } = await c.rpc('pause_own_account');
      expect(pauseErr).not.toBeNull();
    });
  });

  describe('W1d: an admin release clears the origin — the stale-member re-arm is dead', () => {
    let rea: TestUser;
    let reaId: string;
    beforeAll(async () => {
      rea = await createTestUser({ displayName: 'Rea Rearm' });
      reaId = await publicUserIdOf(rea.user.id);
      const c = await asUser(rea);
      const { error } = await c.rpc('pause_own_account');
      if (error) throw new Error(`pause fixture: ${error.message}`);
      await c.auth.signOut();
      const { error: holdErr } = await adminSetStatus(reaId, false);
      if (holdErr) throw new Error(`hold fixture: ${holdErr.message}`);
    });
    afterAll(async () => {
      if (rea) await cleanupTestUser(rea.user.id);
    });

    it('release returns the account to active with no origin residue', async () => {
      const { error } = await adminSetStatus(reaId, true);
      expect(error).toBeNull();
      const row = await lifecycleRowOf(rea.user.id);
      expect(row.is_active).toBe(true);
      // RED AT HEAD: the release never touches the column — 'member' residue.
      expect(row.deactivation_origin).toBeNull();
    });

    it('a re-imposed hold holds — the residue cannot re-arm the escape', async () => {
      const { error } = await adminSetStatus(reaId, false);
      expect(error).toBeNull();
      const c = await asUser(rea);
      // RED AT HEAD: residue 'member' + no-op hold -> 'paused' and escapable.
      expect((await readState(c)).state).toBe('suspended');
      const { error: reactErr } = await c.rpc('reactivate_own_account');
      expect(reactErr).not.toBeNull();
    });
  });

  describe('W1e: admin decommission stamps the admin origin (record hygiene)', () => {
    let dora: TestUser;
    beforeAll(async () => {
      dora = await createTestUser({ displayName: 'Dora Decom' });
    });
    afterAll(async () => {
      if (dora) await cleanupTestUser(dora.user.id);
    });

    it('the terminal record carries who closed it', async () => {
      const { error } = await adaClient.rpc('admin_decommission_user', {
        target_user_id: await publicUserIdOf(dora.user.id),
      });
      expect(error).toBeNull();
      const row = await lifecycleRowOf(dora.user.id);
      expect(row.is_decommissioned).toBe(true);
      expect(row.is_active).toBe(false);
      // RED AT HEAD: origin-blind decommission — NULL here.
      expect(row.deactivation_origin).toBe('admin');
      const c = await asUser(dora);
      expect((await readState(c)).state).toBe('decommissioned');
    });
  });

  describe('W1f — the platform-admin wall on the producer (adapted at PC021 gate 2: typed 42501)', () => {
    let mia: TestUser;
    let tia: TestUser;
    beforeAll(async () => {
      mia = await createTestUser({ displayName: 'Mia Member' });
      tia = await createTestUser({ displayName: 'Tia Target' });
    });
    afterAll(async () => {
      if (mia) await cleanupTestUser(mia.user.id);
      if (tia) await cleanupTestUser(tia.user.id);
    });

    it('a plain member cannot drive the producer', async () => {
      const c = await asUser(mia);
      const { error } = await c.rpc('admin_update_user_status', {
        target_user_id: await publicUserIdOf(tia.user.id),
        new_is_active: false,
      });
      expect(error).not.toBeNull();
      // PC021 gate 2 re-issue: the producer refuses with the typed
      // platform-admin gate, not the legacy manage_all_groups prose.
      expect(error!.code).toBe('42501');
      expect(error!.message).toMatch(/platform administrator/i);
      const row = await lifecycleRowOf(tia.user.id);
      expect(row.is_active).toBe(true);
    });
  });
});
