import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  runAdminSql,
  withAnonRateLimitRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(240_000); // real-substrate suite: seven users + a Mist, real state producers

/**
 * FEAT-PC021 gate 1 (Cycle ADM-C, TASK-ADMC-01) — the member read family,
 * producer-driven: admin_get_users(p_filter) + admin_get_user_detail(p_user_id).
 *
 * Fixture states are arranged through the REAL producers wherever one exists:
 * paused via the member's own pause_own_account(); suspended via
 * admin_update_user_status(active=false); decommissioned via
 * admin_decommission_user(); the Mist via a real anonymous session
 * (handle_new_user materialises the is_temporary row). No state column is
 * written by fixture SQL.
 *
 * RED AT HEAD (pre-migration), by case: every STORY-1/2 case fails PGRST202
 * ("Could not find the function") — neither admin_get_users nor
 * admin_get_user_detail exists at head (finding 1 of the 2026-08-01 contract
 * walk: no admin member read exists in any form). That includes the refusal
 * cells (non-admin 42501, anon EXECUTE, unknown-filter 22023, ghost/Mist
 * P0002): each pins its SPECIFIC typed refusal, so at head it fails
 * function-absent rather than passing on mere error-presence.
 *
 * AMENDMENT RED (2026-08-01, after gate 1 applied): 3 failed / 12 — exactly
 * the big-population filter cases (S1a default / S1c active / S1f all).
 * PostgREST db-max-rows truncates SET-RETURNING RPCs at 1000, and the dev DB
 * holds 1,918 non-Mist users (1,589 sorting before the axel fixture) — the
 * first-contact finding. The 20260801180000 amendment makes admin_get_users
 * return a jsonb ARRAY (scalar — outside the row cap; identical client
 * shape): these 12 assertions are byte-unchanged across both reds.
 *
 * PC024 ADAPTATION (2026-08-03, migration 20260803210000, Cycle ADM-E): the
 * re-issue changed the return to {users, next_cursor, generated_at} with a
 * 200-row page cap. These cells pin FULL-POPULATION filter semantics, so the
 * rows() helper now walks pages to exhaustion; every cell's assertions are
 * otherwise byte-unchanged. Red at head against the single-parameter
 * signature (PGRST202 on p_limit) for S1a-S1f; S1g/S1h/S1i stay
 * signature-compatible (defaults) and green across the apply.
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

const GHOST_USER = '00000000-0000-4000-8000-000000000000';

const LIST_KEYS = [
  'account_state',
  'created_at',
  'display_name',
  'email',
  'id',
  'is_platform_admin',
];

const DETAIL_KEYS = [
  'account_state',
  'created_at',
  'deactivation_origin',
  'display_name',
  'email',
  'id',
  'is_platform_admin',
  'memberships',
];

type ListRow = {
  id: string;
  display_name: string;
  email: string | null;
  account_state: string;
  is_platform_admin: boolean;
  created_at: string;
};

describe('FEAT-PC021 gate 1 — member administration read family (ADM-2)', () => {
  const admin = createAdminClient();
  let ada: TestUser; // platform admin (DeusEx member)
  let axel: TestUser; // active — the STORY-2 detail target (three membership scenarios)
  let pia: TestUser; // paused via her own pause_own_account()
  let sven: TestUser; // suspended via admin_update_user_status(false)
  let dag: TestUser; // decommissioned via admin_decommission_user()
  let stella: TestUser; // plain FIM — the non-admin caller; steward of g1
  let brit: TestUser; // g2 second member (the steward_handover remainder)

  let adaClient: SupabaseClient;
  let mistClient: SupabaseClient | null = null;
  let mistAuthId: string | null = null;
  let mistUserId: string | null = null;

  const userIds = new Map<string, string>(); // TestUser.email -> public.users.id
  let g1 = ''; // stella stewards; axel regular member  -> regular_leave
  let g2 = ''; // axel sole steward; brit member        -> steward_handover
  let g3 = ''; // axel sole member                      -> group_closure

  const createdGroupIds: string[] = [];
  const users: TestUser[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const idOf = async (u: TestUser): Promise<string> => {
    const cached = userIds.get(u.email);
    if (cached) return cached;
    const { data, error } = await admin
      .from('users')
      .select('id')
      .eq('auth_user_id', u.user.id)
      .single();
    if (error || !data) throw new Error(`idOf(${u.email}): ${error?.message}`);
    userIds.set(u.email, data.id);
    return data.id;
  };

  const seedGroup = async (
    creator: TestUser,
    name: string,
    members: TestUser[],
  ): Promise<string> => {
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
      if (mErr) throw new Error(`seedGroup(${name}) member: ${mErr.message}`);
    }
    return groupId as string;
  };

  beforeAll(async () => {
    ada = await createTestUser({ displayName: 'PC021 Ada Admin' });
    axel = await createTestUser({ displayName: 'PC021 Axel Active' });
    pia = await createTestUser({ displayName: 'PC021 Pia Paused' });
    sven = await createTestUser({ displayName: 'PC021 Sven Suspended' });
    dag = await createTestUser({ displayName: 'PC021 Dag Decommissioned' });
    stella = await createTestUser({ displayName: 'PC021 Stella Steward' });
    brit = await createTestUser({ displayName: 'PC021 Brit Member' });
    users.push(ada, axel, pia, sven, dag, stella, brit);

    await makePlatformAdmin(ada.personalGroupId);
    adaClient = await asUser(ada);

    // Membership scenarios BEFORE any sanction (all actors active while arranging).
    g1 = await seedGroup(stella, 'PC021 g1 regular', [axel]);
    g2 = await seedGroup(axel, 'PC021 g2 handover', [brit]);
    g3 = await seedGroup(axel, 'PC021 g3 closure', []);

    // Real state producers.
    const piaClient = await asUser(pia);
    {
      const { error } = await piaClient.rpc('pause_own_account');
      if (error) throw new Error(`pause_own_account(pia): ${error.message}`);
    }
    {
      const { error } = await adaClient.rpc('admin_update_user_status', {
        target_user_id: await idOf(sven),
        new_is_active: false,
        p_reason: 'FEAT-PC030 adapted: reason required', // DB-4 adaptation
      });
      if (error) throw new Error(`suspend(sven): ${error.message}`);
    }
    {
      const { error } = await adaClient.rpc('admin_decommission_user', {
        target_user_id: await idOf(dag),
      });
      if (error) throw new Error(`decommission(dag): ${error.message}`);
    }

    // A real Mist — is_temporary via handle_new_user on an anonymous session.
    mistClient = createTestClient();
    const anon = await withAnonRateLimitRetry(() => mistClient!.auth.signInAnonymously());
    const anonUser = (anon as { data?: { user?: { id: string } } }).data?.user;
    if (!anonUser) throw new Error('anonymous sign-in did not yield a user');
    mistAuthId = anonUser.id;
    const { data: mistRow } = await admin
      .from('users')
      .select('id')
      .eq('auth_user_id', mistAuthId)
      .single();
    if (!mistRow) throw new Error('Mist users row not materialised');
    mistUserId = mistRow.id;
  });

  afterAll(async () => {
    if (mistAuthId) {
      await runAdminSql(`SELECT public._erase_mist('${mistAuthId}'::uuid);`).catch(() => undefined);
    }
    for (const gid of createdGroupIds) {
      await cleanupTestGroup(gid).catch(() => undefined);
    }
    await demotePlatformAdmin(ada.personalGroupId);
    for (const u of users) {
      await cleanupTestUser(u.user.id).catch(() => undefined);
    }
  });

  const rows = async (filter?: string): Promise<ListRow[]> => {
    // PC024 (20260803210000): keyed {users, next_cursor} pages — walk to
    // exhaustion so the full-population predicate assertions keep their
    // original semantics.
    const all: ListRow[] = [];
    let cursor: { name: string; id: string } | null = null;
    let hops = 0;
    do {
      const { data, error } = await adaClient.rpc('admin_get_users', {
        ...(filter === undefined ? {} : { p_filter: filter }),
        p_limit: 200,
        ...(cursor ? { p_after_name: cursor.name, p_after_id: cursor.id } : {}),
      });
      expect(error).toBeNull();
      const page = data as {
        users: ListRow[];
        next_cursor: { name: string; id: string } | null;
      };
      all.push(...page.users);
      cursor = page.next_cursor;
      hops += 1;
    } while (cursor !== null && hops < 60);
    return all;
  };

  const rowOf = (list: ListRow[], u: TestUser): ListRow | undefined =>
    list.find((r) => r.id === userIds.get(u.email));

  describe('STORY-1 — enumeration with honest filters', () => {
    it('S1a default: active + inactive fixtures present with derived states; decommissioned and Mist absent; exact payload keys', async () => {
      await Promise.all(users.map(idOf));
      const list = await rows();
      const axelRow = rowOf(list, axel);
      expect(axelRow).toBeDefined();
      expect(Object.keys(axelRow as object).sort()).toEqual(LIST_KEYS);
      expect(axelRow?.account_state).toBe('active');
      expect(axelRow?.is_platform_admin).toBe(false);
      expect(axelRow?.email).toBe(axel.email);
      expect(rowOf(list, pia)?.account_state).toBe('paused');
      expect(rowOf(list, sven)?.account_state).toBe('suspended');
      expect(rowOf(list, dag)).toBeUndefined();
      expect(list.find((r) => r.id === mistUserId)).toBeUndefined();
    });

    it('S1b decommissioned: exactly the terminal fixtures, visible to admins (B-ADMIN-008)', async () => {
      const list = await rows('decommissioned');
      expect(rowOf(list, dag)?.account_state).toBe('decommissioned');
      expect(rowOf(list, axel)).toBeUndefined();
    });

    it('S1c active: the on fixtures only', async () => {
      const list = await rows('active');
      expect(rowOf(list, axel)).toBeDefined();
      expect(rowOf(list, pia)).toBeUndefined();
      expect(rowOf(list, sven)).toBeUndefined();
    });

    it('S1d inactive: paused + suspended, never the decommissioned or active', async () => {
      const list = await rows('inactive');
      expect(rowOf(list, pia)).toBeDefined();
      expect(rowOf(list, sven)).toBeDefined();
      expect(rowOf(list, axel)).toBeUndefined();
      expect(rowOf(list, dag)).toBeUndefined();
    });

    it('S1e platform_admins: the elevated fixture with the flag true; plain members absent', async () => {
      const list = await rows('platform_admins');
      const adaRow = rowOf(list, ada);
      expect(adaRow).toBeDefined();
      expect(adaRow?.is_platform_admin).toBe(true);
      expect(rowOf(list, axel)).toBeUndefined();
    });

    it('S1f all: every non-Mist fixture including the terminal one; the Mist still never appears', async () => {
      const list = await rows('all');
      expect(rowOf(list, axel)).toBeDefined();
      expect(rowOf(list, pia)).toBeDefined();
      expect(rowOf(list, sven)).toBeDefined();
      expect(rowOf(list, dag)).toBeDefined();
      expect(list.find((r) => r.id === mistUserId)).toBeUndefined();
    });

    it('S1g unknown filter refuses 22023', async () => {
      const { error } = await adaClient.rpc('admin_get_users', { p_filter: 'nonsense' });
      expect(error?.code).toBe('22023');
    });

    it('S1h non-admin caller refuses 42501 on both contracts', async () => {
      const stellaClient = await asUser(stella);
      const list = await stellaClient.rpc('admin_get_users', {});
      expect(list.error?.code).toBe('42501');
      const detail = await stellaClient.rpc('admin_get_user_detail', {
        p_user_id: await idOf(axel),
      });
      expect(detail.error?.code).toBe('42501');
    });

    it('S1i anon caller: EXECUTE refused on both contracts', async () => {
      const anon = createTestClient();
      const list = await anon.rpc('admin_get_users', {});
      expect(list.error?.code).toBe('42501');
      expect(list.error?.message ?? '').toMatch(/permission denied/i);
      const detail = await anon.rpc('admin_get_user_detail', { p_user_id: GHOST_USER });
      expect(detail.error?.code).toBe('42501');
    });
  });

  describe('STORY-2 — detail with the removal picker source', () => {
    it('S2a detail carries identity, state, and the three walked membership scenarios', async () => {
      const { data, error } = await adaClient.rpc('admin_get_user_detail', {
        p_user_id: await idOf(axel),
      });
      expect(error).toBeNull();
      const detail = data as {
        id: string;
        display_name: string;
        email: string;
        account_state: string;
        deactivation_origin: string | null;
        is_platform_admin: boolean;
        memberships: Array<{
          group_id: string;
          group_name: string;
          status: string;
          removal_scenario: string;
        }>;
      };
      expect(Object.keys(detail).sort()).toEqual(DETAIL_KEYS);
      expect(detail.id).toBe(await idOf(axel));
      expect(detail.email).toBe(axel.email);
      expect(detail.account_state).toBe('active');
      expect(detail.deactivation_origin).toBeNull();
      // Row-scoped by group id — the dev DB legitimately holds other groups.
      const byGroup = new Map(detail.memberships.map((m) => [m.group_id, m]));
      expect(byGroup.get(g1)?.removal_scenario).toBe('regular_leave');
      expect(byGroup.get(g1)?.group_name).toBe('PC021 g1 regular');
      expect(byGroup.get(g1)?.status).toBe('active');
      expect(byGroup.get(g2)?.removal_scenario).toBe('steward_handover');
      expect(byGroup.get(g3)?.removal_scenario).toBe('group_closure');
    });

    it('S2b detail states are origin-honest: paused/member, suspended/admin, decommissioned visible', async () => {
      const piaDetail = await adaClient.rpc('admin_get_user_detail', {
        p_user_id: await idOf(pia),
      });
      expect(piaDetail.error).toBeNull();
      expect((piaDetail.data as { account_state: string }).account_state).toBe('paused');
      expect((piaDetail.data as { deactivation_origin: string }).deactivation_origin).toBe(
        'member',
      );
      const svenDetail = await adaClient.rpc('admin_get_user_detail', {
        p_user_id: await idOf(sven),
      });
      expect((svenDetail.data as { account_state: string }).account_state).toBe('suspended');
      expect((svenDetail.data as { deactivation_origin: string }).deactivation_origin).toBe(
        'admin',
      );
      const dagDetail = await adaClient.rpc('admin_get_user_detail', {
        p_user_id: await idOf(dag),
      });
      expect((dagDetail.data as { account_state: string }).account_state).toBe('decommissioned');
    });

    it('S2c unknown and Mist targets are existence-hidden P0002', async () => {
      const ghost = await adaClient.rpc('admin_get_user_detail', { p_user_id: GHOST_USER });
      expect(ghost.error?.code).toBe('P0002');
      const mist = await adaClient.rpc('admin_get_user_detail', { p_user_id: mistUserId });
      expect(mist.error?.code).toBe('P0002');
    });
  });
});
