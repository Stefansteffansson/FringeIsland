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

jest.setTimeout(300_000);

/**
 * TASK-SEAL-01 — sealed-thread admin sight, bounded (AB-6 ruling B1).
 *
 * SCOPE NOTE — the ruling's own scope word changed before this suite existed.
 * B1 said "suspended-scope only". The Phase-4 W7 contract walk found that scope
 * unmatchable: `sealed_at` has exactly one writer (`ds5_lifecycle_group_closed`)
 * and all five callers seal while setting the group to 'closed', so a read gated
 * on 'suspended' could never return a row. Stefan ruled option A (2026-08-11):
 * scope is CLOSED. Bounds 2-4 are unchanged and pinned below.
 *
 * RED AT HEAD (pre-migration): both contracts are absent, so every cell calling
 * `admin_get_group_conversations` fails PGRST202, and the seal-from-client-roles
 * cell fails because a missing function reports "not found", not "permission
 * denied".
 *
 * LABELLED GREEN (green before AND after, never claimed as red):
 *  - STORY-5, the member-plane law. `get_group_conversations`' own
 *    `sealed_at IS NULL` clause is UNTOUCHED by this work (ruling bound 4); the
 *    cell exists to prove this migration did not leak sealed rows sideways into
 *    the member plane, so it must pass on both sides of the apply.
 */
describe('TASK-SEAL-01 — sealed-thread admin sight (closed-scope)', () => {
  const admin = createAdminClient();

  let ada: TestUser; // platform admin — never a member of the target groups
  let stella: TestUser; // steward of both groups
  const users: TestUser[] = [];
  const groupIds: string[] = [];

  let adaC: SupabaseClient;
  let stellaC: SupabaseClient;

  let gClosed: string; // closed + its group thread sealed — the target
  let gActive: string; // active control — the scope refusal
  let sealedConvId: string;
  let activeConvId: string;

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

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

  beforeAll(async () => {
    ada = await createTestUser({ displayName: 'SealAda' });
    stella = await createTestUser({ displayName: 'SealStella' });
    users.push(ada, stella);

    await makePlatformAdmin(ada.personalGroupId);
    adaC = await asUser(ada);
    stellaC = await asUser(stella);

    for (const name of ['SEAL Closed Cohort', 'SEAL Active Cohort']) {
      const { data, error } = await stellaC.rpc('create_engagement_group', { p_name: name });
      if (error) throw new Error(`seed ${name}: ${error.message}`);
      groupIds.push(data as string);
    }
    [gClosed, gActive] = groupIds;

    for (const [gid, title] of [
      [gClosed, 'SEAL evidence thread'],
      [gActive, 'SEAL active thread'],
    ] as const) {
      const { data, error } = await stellaC.rpc('create_group_conversation', {
        p_group_id: gid,
        p_title: title,
      });
      if (error) throw new Error(`seed conversation (${title}): ${error.message}`);
      const id = typeof data === 'string' ? data : (data as { id?: string })?.id;
      if (gid === gClosed) sealedConvId = id as string;
      else activeConvId = id as string;
    }

    // Seed the sealed state through the REAL sealer, then the real status —
    // this suite pins admin sight, not PD012's sealing behaviour (which has its
    // own coverage). Fixture seeding, deliberately not a behavioural assertion.
    await runAdminSql(`
      DO $$ BEGIN
        PERFORM public.ds5_lifecycle_group_closed('${gClosed}', 'group_closed');
        UPDATE public.groups SET status = 'closed' WHERE id = '${gClosed}';
      END $$;`);
  });

  afterAll(async () => {
    await demotePlatformAdmin(ada.personalGroupId);
    for (const id of groupIds) await cleanupTestGroup(id);
    for (const u of users) if (u) await cleanupTestUser(u.user.id);
  });

  // ---------------------------------------------------------------- premise

  it('premise: the fixture thread really is sealed, and its group really is closed', async () => {
    const { data: conv } = await admin
      .from('conversations')
      .select('sealed_at, kind')
      .eq('id', sealedConvId)
      .single();
    expect(conv!.sealed_at).not.toBeNull();
    expect(conv!.kind).toBe('group');

    const { data: g } = await admin.from('groups').select('status').eq('id', gClosed).single();
    expect(g!.status).toBe('closed');
  });

  // ---------------------------------------------------------------- STORY-1

  describe('STORY-1: the admin sees the sealed thread in a closed group', () => {
    it('returns it, labelled explicitly as sealed', async () => {
      const { data, error } = await adaC.rpc('admin_get_group_conversations', {
        p_group_id: gClosed,
      });
      expect(error).toBeNull();

      const payload = data as { group_id: string; conversations: Array<Record<string, unknown>> };
      expect(payload.group_id).toBe(gClosed);

      const row = payload.conversations.find((c) => c.id === sealedConvId);
      expect(row).toBeDefined();
      // Bound 3: never presented as live.
      expect(row!.is_sealed).toBe(true);
      expect(row!.sealed_at).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------- STORY-2

  describe('STORY-2: the wall — who may open this door', () => {
    it('refuses a non-admin FIM (42501)', async () => {
      const { error } = await stellaC.rpc('admin_get_group_conversations', {
        p_group_id: gClosed,
      });
      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/unauthorized/i);
    });

    it('refuses an unknown group (P0002), without leaking whether it exists', async () => {
      const { error } = await adaC.rpc('admin_get_group_conversations', {
        p_group_id: '00000000-0000-0000-0000-00000000dead',
      });
      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/not found/i);
    });
  });

  // ---------------------------------------------------------------- STORY-3

  describe('STORY-3: the scope bound — closed groups only (ruling A)', () => {
    it('refuses an ACTIVE group even for the admin, naming the status', async () => {
      const { error } = await adaC.rpc('admin_get_group_conversations', {
        p_group_id: gActive,
      });
      expect(error).not.toBeNull();
      expect(error!.message).toMatch(/closed groups/i);
      expect(error!.message).toMatch(/active/i);
    });
  });

  // ---------------------------------------------------------------- STORY-4

  describe('STORY-4: bound 2 — direct conversations stay outside admin sight', () => {
    it('returns only group-kind rows', async () => {
      const { data, error } = await adaC.rpc('admin_get_group_conversations', {
        p_group_id: gClosed,
      });
      expect(error).toBeNull();
      const payload = data as { conversations: Array<{ id: string }> };
      const ids = payload.conversations.map((c) => c.id);

      const { data: kinds } = await admin
        .from('conversations')
        .select('id, kind')
        .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      for (const k of kinds ?? []) expect(k.kind).toBe('group');
    });
  });

  // ---------------------------------------------------------------- STORY-5

  describe('STORY-5: bound 4 — the member plane is untouched (labelled green)', () => {
    it('the member-plane read still hides sealed threads from a member', async () => {
      // gActive's thread is NOT sealed, so it must still be visible there —
      // the control proving the member door works at all.
      const { data, error } = await stellaC.rpc('get_group_conversations', {
        p_group_id: gActive,
      });
      expect(error).toBeNull();
      const ids = (data as { conversations: Array<{ id: string }> }).conversations.map((c) => c.id);
      expect(ids).toContain(activeConvId);
      // And the sealed one never appears through the member door.
      expect(ids).not.toContain(sealedConvId);
    });
  });

  // ---------------------------------------------------------------- STORY-6

  describe('STORY-6: the DS-5 body is sealed from client roles (ADR-U047 A3)', () => {
    it('an authenticated caller cannot execute the inner primitive directly', async () => {
      const { error } = await adaC.rpc('ds5_admin_group_conversations', {
        p_group_id: gClosed,
      });
      expect(error).not.toBeNull();
      // Red at head reports "not found" (absent); green reports a permission
      // refusal — the distinction is the point of this cell.
      expect(error!.message).toMatch(/permission denied/i);
    });
  });
});
