import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  runAdminSql,
  signInWithRetry,
  withAnonRateLimitRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(240_000); // real-substrate suite: five users + a Mist, real state producers, full page walk

/**
 * FEAT-PC024 gate (Cycle ADM-E, TASK-ADME-01) — the bounded member enumeration
 * re-issue of admin_get_users: composite (display_name, id) keyset, server-side
 * p_search over display name/email, cap LEAST(GREATEST(COALESCE(p_limit,50),1),200),
 * keyed return {users, next_cursor, generated_at}.
 *
 * RED AT HEAD (pre-migration), by design: EVERY call in this suite passes at
 * least one NEW parameter (p_limit / p_search / p_after_*), so at head every
 * cell fails PGRST202 ("Could not find the function") against the live
 * single-parameter signature (20260801180000) rather than passing on the old
 * shape. Green post-apply.
 *
 * The whole suite runs the direct PostgREST path (supabase-js rpc) — STORY-4's
 * adversarial direct-door proof is the suite's own transport, not a separate
 * cell. The big-walk ground truth (B1a) counts users via the service-role
 * client in the same seconds as the walk; a mismatch is signal, not flake
 * (nothing else runs against the dev DB concurrently — house rule).
 */

/** Authenticated DeusEx caller — the house elevation (gate-1 suite pattern). */
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

const LIST_KEYS = [
  'account_state',
  'created_at',
  'display_name',
  'email',
  'id',
  'is_platform_admin',
];

type ListRow = {
  id: string;
  display_name: string;
  email: string | null;
  account_state: string;
  is_platform_admin: boolean;
  created_at: string;
};

type Page = {
  users: ListRow[];
  next_cursor: { name: string; id: string } | null;
  generated_at: string;
};

// Unique run token carried in fixture display names so server search can
// isolate exactly this run's rows against the ~2k-user shared dev DB.
const TOKEN = `pc024x${Date.now().toString(36)}`;

describe('FEAT-PC024 gate — bounded member enumeration (ADM-E)', () => {
  const admin = createAdminClient();
  let oda: TestUser; // platform admin caller (token-free name)
  let alpha: TestUser; // active — the search target
  let bea: TestUser; // paused via her own pause_own_account()
  let cyr: TestUser; // suspended via admin_update_user_status(false)
  let dre: TestUser; // decommissioned via admin_decommission_user()

  let odaClient: SupabaseClient;
  let mistClient: SupabaseClient | null = null;
  let mistAuthId: string | null = null;
  let mistUserId: string | null = null;

  const users: TestUser[] = [];
  const userIds = new Map<string, string>();

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

  const page = async (args: Record<string, unknown>): Promise<Page> => {
    const { data, error } = await odaClient.rpc('admin_get_users', args);
    expect(error).toBeNull();
    return data as Page;
  };

  beforeAll(async () => {
    oda = await createTestUser({ displayName: 'PC024 Oda Admin' });
    alpha = await createTestUser({ displayName: `${TOKEN} A Alpha` });
    bea = await createTestUser({ displayName: `${TOKEN} B Paused` });
    cyr = await createTestUser({ displayName: `${TOKEN} C Suspended` });
    dre = await createTestUser({ displayName: `${TOKEN} D Decommissioned` });
    users.push(oda, alpha, bea, cyr, dre);

    await makePlatformAdmin(oda.personalGroupId);
    odaClient = await asUser(oda);

    // Real state producers (the gate-1 discipline — no fixture SQL state writes).
    const beaClient = await asUser(bea);
    {
      const { error } = await beaClient.rpc('pause_own_account');
      if (error) throw new Error(`pause_own_account(bea): ${error.message}`);
    }
    {
      const { error } = await odaClient.rpc('admin_update_user_status', {
        target_user_id: await idOf(cyr),
        new_is_active: false,
      });
      if (error) throw new Error(`suspend(cyr): ${error.message}`);
    }
    {
      const { error } = await odaClient.rpc('admin_decommission_user', {
        target_user_id: await idOf(dre),
      });
      if (error) throw new Error(`decommission(dre): ${error.message}`);
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

    await Promise.all(users.map(idOf));
  });

  afterAll(async () => {
    if (mistAuthId) {
      await runAdminSql(`SELECT public._erase_mist('${mistAuthId}'::uuid);`).catch(() => undefined);
    }
    await demotePlatformAdmin(oda.personalGroupId);
    for (const u of users) {
      await cleanupTestUser(u.user.id).catch(() => undefined);
    }
  });

  describe('STORY-1 — pages that walk the whole truth', () => {
    it('B1a the full walk: union equals the census, no gap, no overlap, Mists absent, fixtures present once', async () => {
      const { count } = await admin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .not('is_temporary', 'is', true);
      expect(count).not.toBeNull();

      const seen = new Set<string>();
      let cursor: Page['next_cursor'] = null;
      let hops = 0;
      do {
        const p: Page = await page({
          p_filter: 'all',
          p_limit: 200,
          ...(cursor ? { p_after_name: cursor.name, p_after_id: cursor.id } : {}),
        });
        expect(p.users.length).toBeLessThanOrEqual(200);
        for (const r of p.users) {
          expect(seen.has(r.id)).toBe(false); // no overlap across page boundaries
          seen.add(r.id);
        }
        cursor = p.next_cursor;
        hops += 1;
      } while (cursor !== null && hops < 60);
      expect(cursor).toBeNull(); // the walk terminates honestly
      expect(seen.size).toBe(count); // no gap: the union is the census
      for (const u of users) {
        expect(seen.has(userIds.get(u.email) as string)).toBe(true);
      }
      expect(seen.has(mistUserId as string)).toBe(false);
    });

    it('B1b p_limit honesty: floor 1, cap 200, default 50', async () => {
      // These bounds are asserted RELATIVE TO THE CENSUS. The original cells
      // asserted the literal 200 and 50 on the strength of a comment reading
      // "dev census > 200" — true only while the dev database was full of
      // fixture residue. The 2026-08-12 reset emptied it, and both cells went
      // red without a single contract changing. A test that passes only on a
      // cluttered database is measuring the clutter, not the contract.
      //
      // min(bound, census) is exact at ANY size: with a large census it still
      // pins the bound exactly (a cap wrongly raised to 500 fails here), and
      // with a small one it pins the honest weaker truth — never over-return.
      const { count: censusRaw } = await admin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .not('is_temporary', 'is', true);
      const census = censusRaw as number;
      expect(census).toBeGreaterThan(0);

      const one = await page({ p_filter: 'all', p_limit: 1 });
      expect(one.users).toHaveLength(1); // the floor binds at any census >= 1
      expect(one.next_cursor).toEqual(census > 1 ? expect.anything() : null);

      const capped = await page({ p_filter: 'all', p_limit: 500 });
      expect(capped.users).toHaveLength(Math.min(200, census));

      const dflt = await page({ p_filter: 'all', p_search: null });
      expect(dflt.users).toHaveLength(Math.min(50, census));
      // A cursor is owed only when the page did not exhaust the census.
      expect(dflt.next_cursor === null).toBe(census <= 50);
    });

    it('B1c an incomplete cursor refuses 22023, both halves', async () => {
      const nameOnly = await odaClient.rpc('admin_get_users', {
        p_filter: 'all',
        p_limit: 5,
        p_after_name: 'anything',
      });
      expect(nameOnly.error?.code).toBe('22023');
      const idOnly = await odaClient.rpc('admin_get_users', {
        p_filter: 'all',
        p_limit: 5,
        p_after_id: '00000000-0000-4000-8000-000000000000',
      });
      expect(idOnly.error?.code).toBe('22023');
    });

    it('B1d generated_at rides every page as a real timestamp', async () => {
      const p = await page({ p_filter: 'all', p_limit: 1 });
      expect(typeof p.generated_at).toBe('string');
      expect(Number.isNaN(new Date(p.generated_at).getTime())).toBe(false);
    });
  });

  describe('STORY-2 — search where the data lives', () => {
    it('B2a case-insensitive name search composes with filters', async () => {
      const all = await page({ p_filter: 'all', p_search: TOKEN.toUpperCase(), p_limit: 50 });
      const allIds = all.users.map((r) => r.id).sort();
      const fixtureIds = [alpha, bea, cyr, dre]
        .map((u) => userIds.get(u.email) as string)
        .sort();
      expect(allIds).toEqual(fixtureIds);

      const dflt = await page({ p_filter: 'default', p_search: TOKEN, p_limit: 50 });
      expect(dflt.users.map((r) => r.id)).not.toContain(userIds.get(dre.email)); // filter still binds
      expect(dflt.users).toHaveLength(3);
    });

    it('B2b email search finds the row, case-insensitively', async () => {
      const p = await page({
        p_filter: 'all',
        p_search: alpha.email.toUpperCase(),
        p_limit: 50,
      });
      expect(p.users).toHaveLength(1);
      expect(p.users[0].id).toBe(userIds.get(alpha.email));
    });

    it('B2c a search matching nothing returns empty honestly', async () => {
      const p = await page({ p_filter: 'all', p_search: `${TOKEN}-no-such-member`, p_limit: 50 });
      expect(p.users).toEqual([]);
      expect(p.next_cursor).toBeNull();
    });

    it('B2d search composes with the keyset: two pages of two, then done', async () => {
      const first = await page({ p_filter: 'all', p_search: TOKEN, p_limit: 2 });
      expect(first.users).toHaveLength(2);
      expect(first.next_cursor).not.toBeNull();
      const second = await page({
        p_filter: 'all',
        p_search: TOKEN,
        p_limit: 2,
        p_after_name: first.next_cursor!.name,
        p_after_id: first.next_cursor!.id,
      });
      expect(second.users).toHaveLength(2);
      expect(second.next_cursor).toBeNull();
      const union = new Set([...first.users, ...second.users].map((r) => r.id));
      expect(union.size).toBe(4);
    });
  });

  describe('STORY-3 — the preserved laws', () => {
    it('B3a payload keys and derived states are byte-unchanged per row', async () => {
      const p = await page({ p_filter: 'all', p_search: TOKEN, p_limit: 50 });
      const byId = new Map(p.users.map((r) => [r.id, r]));
      const alphaRow = byId.get(userIds.get(alpha.email) as string) as ListRow;
      expect(Object.keys(alphaRow).sort()).toEqual(LIST_KEYS);
      expect(alphaRow.account_state).toBe('active');
      expect(alphaRow.is_platform_admin).toBe(false);
      expect(alphaRow.email).toBe(alpha.email);
      expect(byId.get(userIds.get(bea.email) as string)?.account_state).toBe('paused');
      expect(byId.get(userIds.get(cyr.email) as string)?.account_state).toBe('suspended');
      expect(byId.get(userIds.get(dre.email) as string)?.account_state).toBe('decommissioned');
    });

    it('B3b an unknown filter still refuses 22023 on the new signature', async () => {
      const { error } = await odaClient.rpc('admin_get_users', {
        p_filter: 'nonsense',
        p_limit: 5,
      });
      expect(error?.code).toBe('22023');
    });

    it('B3c a non-admin refuses 42501 with the member family message', async () => {
      const alphaClient = await asUser(alpha);
      const { error } = await alphaClient.rpc('admin_get_users', { p_limit: 5 });
      expect(error?.code).toBe('42501');
      expect(error?.message ?? '').toMatch(/platform administrator required/i);
    });

    it('B3d anon EXECUTE stays refused', async () => {
      const anon = createTestClient();
      const { error } = await anon.rpc('admin_get_users', { p_limit: 5 });
      expect(error?.code).toBe('42501');
      expect(error?.message ?? '').toMatch(/permission denied/i);
    });
  });
});
