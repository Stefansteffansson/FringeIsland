/**
 * FEAT-PD018 — member-erasure conversation disposition: STORY-1/2/3/5/6/7.
 *
 * The ruled disposition (2026-08-12) is the CONTENT-level tombstone: the
 * erased member's DM message bodies go (`content IS NULL, is_deleted = true`),
 * the thread shape and the survivor's own words stay. Author-level tombstoning
 * was rejected because it is ALREADY the live behaviour (get_conversation_detail
 * resolves departed senders to 'Former member') — choosing it would have been a
 * no-op leaving the Article 17 exposure untouched.
 *
 * Red-first (authored 2026-08-12, pre-migration). Expected red classes:
 *   - 42703 — `messages.is_deleted` absent (the column does not exist yet)
 *   - PGRST202 / 42883 — `ds5_lifecycle_account_deleted` absent
 *   - behavioural: on the un-disposed substrate, message bodies survive
 *     self-delete and hard delete intact, and orphaned DM conversations remain
 *
 * STORY-6 (Mist exclusion) is labelled REGRESSION — verify-and-record, the
 * FEAT-PD012 STORY-6 posture. `get_or_create_dm_conversation` refuses a
 * temporary actor (…c_a…:230) and a temporary recipient (…c_a…:446), so no
 * Mist can be either party to a DM. These assertions are expected GREEN before
 * the migration: they prove the Mist leg of the cascade is structurally empty,
 * which is why no Mist scrub is built. Labelled honestly, not counted as TDD red.
 *
 * STORY-5 (platform exit does NOT tombstone) is likewise expected GREEN both
 * before and after: it asserts an invariant the migration must not break —
 * exit is a removal, not an erasure, consistent with its own posture of leaving
 * the journal and enrolments standing (20260801190000:232-241).
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  generateTestEmail,
  signInWithRetry,
  withAnonRateLimitRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(180_000);

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

describe('FEAT-PD018 — member-erasure conversation disposition (content-level tombstone)', () => {
  const admin = createAdminClient();
  const runTag = Date.now().toString(36);

  // Self-delete pair (STORY-1/2): leaver erases, survivor keeps their record.
  let leaver: TestUser;
  let survivor: TestUser;
  let dmSelfDelete: string;
  let leaverMsgId: string;
  let survivorMsgId: string;

  // Hard-delete pair (STORY-3): both sides gone -> conversation must not orphan.
  let doomed: TestUser;
  let counterpart: TestUser;
  let platformAdmin: TestUser;
  let dmHardDelete: string;

  // Platform-exit pair (STORY-5): removal, not erasure -> bodies stand.
  let exited: TestUser;
  let exitPeer: TestUser;
  let dmExit: string;
  let exitedMsgId: string;

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const asMist = async (): Promise<SupabaseClient> => {
    const c = createTestClient();
    const { error } = await withAnonRateLimitRetry(() => c.auth.signInAnonymously());
    expect(error).toBeNull();
    return c;
  };

  /** Open a DM between two fixtures and have each send one message. */
  const seedDm = async (
    a: TestUser,
    b: TestUser,
    label: string,
  ): Promise<{ conversationId: string; aMsgId: string; bMsgId: string }> => {
    const ca = await asUser(a);
    const cb = await asUser(b);
    const { data: conversationId, error } = await ca.rpc('get_or_create_dm_conversation', {
      p_other_group_id: b.personalGroupId,
    });
    if (error) throw new Error(`seedDm(${label}): ${error.message}`);

    const { data: aMsg, error: ae } = await ca.rpc('send_message', {
      p_conversation_id: conversationId,
      p_content: `from-a ${label} ${runTag}`,
    });
    if (ae) throw new Error(`seedDm(${label}) a-send: ${ae.message}`);

    const { data: bMsg, error: be } = await cb.rpc('send_message', {
      p_conversation_id: conversationId,
      p_content: `from-b ${label} ${runTag}`,
    });
    if (be) throw new Error(`seedDm(${label}) b-send: ${be.message}`);

    return {
      conversationId: conversationId as string,
      aMsgId: (aMsg as { id: string }).id,
      bMsgId: (bMsg as { id: string }).id,
    };
  };

  /** `admin_*` contracts key on `public.users.id`, which is NOT the auth user
   *  id that `TestUser.user.id` carries. Passing the wrong one answers a
   *  perfectly plausible P0002 "user not found" — the same class of mistake
   *  that put five silent no-op `cleanupTestUser` calls into the admin specs. */
  const publicUserId = async (u: TestUser): Promise<string> => {
    const { data } = await admin
      .from('users')
      .select('id')
      .eq('auth_user_id', u.user.id)
      .maybeSingle();
    if (!data) throw new Error(`publicUserId: no users row for ${u.email}`);
    return (data as { id: string }).id;
  };

  /** Stable columns only — usable before and after the migration, so setup
   *  reads and body assertions never fail for the wrong reason (a select that
   *  names a not-yet-existing column answers 42703 and returns null, which
   *  would mask the behaviour under test). */
  const messageBody = async (id: string) => {
    const { data } = await admin
      .from('messages')
      .select('id, content, sender_group_id')
      .eq('id', id)
      .maybeSingle();
    return data as { id: string; content: string | null; sender_group_id: string | null } | null;
  };

  /** Includes the tombstone flag. Pre-migration this returns null (42703 —
   *  `messages.is_deleted` does not exist); that IS the expected red. */
  const messageRow = async (id: string) => {
    const { data } = await admin
      .from('messages')
      .select('id, content, sender_group_id, is_deleted')
      .eq('id', id)
      .maybeSingle();
    return data as {
      id: string;
      content: string | null;
      sender_group_id: string | null;
      is_deleted: boolean;
    } | null;
  };

  const conversationExists = async (id: string): Promise<boolean> => {
    const { data } = await admin.from('conversations').select('id').eq('id', id).maybeSingle();
    return data !== null;
  };

  beforeAll(async () => {
    const fixture = (role: string) =>
      createTestUser({ email: generateTestEmail(`pd018-${role}-${runTag}`) });

    leaver = await fixture('leaver');
    survivor = await fixture('survivor');
    doomed = await fixture('doomed');
    counterpart = await fixture('counterpart');
    platformAdmin = await fixture('admin');
    exited = await fixture('exited');
    exitPeer = await fixture('exitpeer');

    await makePlatformAdmin(platformAdmin.personalGroupId);

    const selfDelete = await seedDm(leaver, survivor, 'self-delete');
    dmSelfDelete = selfDelete.conversationId;
    leaverMsgId = selfDelete.aMsgId;
    survivorMsgId = selfDelete.bMsgId;

    const hardDelete = await seedDm(doomed, counterpart, 'hard-delete');
    dmHardDelete = hardDelete.conversationId;

    const exit = await seedDm(exited, exitPeer, 'exit');
    dmExit = exit.conversationId;
    exitedMsgId = exit.aMsgId;
  });

  afterAll(async () => {
    for (const u of [
      leaver,
      survivor,
      doomed,
      counterpart,
      platformAdmin,
      exited,
      exitPeer,
    ].filter(Boolean)) {
      await cleanupTestUser(u.user.id);
    }
    // The disposition may have already removed these; cleanup is idempotent.
    for (const cid of [dmSelfDelete, dmHardDelete, dmExit].filter(Boolean)) {
      await admin.from('conversations').delete().eq('id', cid);
    }
  });

  // ---------------------------------------------------------------- STORY-6
  // REGRESSION (expected green pre-migration): the Mist leg is structurally
  // empty, which is the evidence for building no Mist scrub at all.
  describe('STORY-6 — no Mist has ever held a conversation (REGRESSION, verify-and-record)', () => {
    it('refuses a Mist as the DM initiator', async () => {
      const mist = await asMist();
      const { error } = await mist.rpc('get_or_create_dm_conversation', {
        p_other_group_id: survivor.personalGroupId,
      });
      expect(error).not.toBeNull();
    });

    it('refuses a Mist as the DM recipient', async () => {
      const mist = await asMist();
      const { data: mistUser } = await admin
        .from('users')
        .select('personal_group_id')
        .eq('auth_user_id', (await mist.auth.getUser()).data.user?.id ?? '')
        .maybeSingle();

      const c = await asUser(survivor);
      const { error } = await c.rpc('get_or_create_dm_conversation', {
        p_other_group_id: (mistUser as { personal_group_id: string }).personal_group_id,
      });
      expect(error).not.toBeNull();
    });

    it('no dm conversation anywhere has a temporary participant', async () => {
      const rows = await runAdminSql(`
        SELECT count(*)::int AS n
        FROM public.conversation_participants cp
        JOIN public.conversations c ON c.id = cp.conversation_id AND c.kind = 'dm'
        JOIN public.users u ON u.personal_group_id = cp.participant_group_id
        WHERE u.is_temporary = true;`);
      expect((rows[0] as { n: number }).n).toBe(0);
    });
  });

  // ---------------------------------------------------------------- STORY-1
  describe('STORY-1 — I delete my account, and my words leave the conversation', () => {
    it('tombstones the leaver message bodies and leaves the survivor untouched', async () => {
      const before = await messageBody(leaverMsgId);
      expect(before?.content).toContain('from-a self-delete');

      const c = await asUser(leaver);
      const { error } = await c.rpc('delete_own_account');
      expect(error).toBeNull();

      const leaverMsg = await messageRow(leaverMsgId);
      expect(leaverMsg).not.toBeNull();
      expect(leaverMsg?.is_deleted).toBe(true);
      expect(leaverMsg?.content).toBeNull();

      const survivorMsg = await messageRow(survivorMsgId);
      expect(survivorMsg?.is_deleted).toBe(false);
      expect(survivorMsg?.content).toContain('from-b self-delete');

      // The ruling is content-level, not author-level: attribution is
      // deliberately left alone (it already resolves to 'Former member').
      expect(leaverMsg?.sender_group_id).toBe(leaver.personalGroupId);
    });

    it('keeps the thread standing — the shape is not destroyed with the content', async () => {
      expect(await conversationExists(dmSelfDelete)).toBe(true);
    });
  });

  // ---------------------------------------------------------------- STORY-2
  describe('STORY-2 — the survivor keeps their record', () => {
    it('serves the survivor their own words, the thread, and a tombstone marker', async () => {
      const c = await asUser(survivor);
      const { data, error } = await c.rpc('get_conversation_detail', {
        p_conversation_id: dmSelfDelete,
      });
      expect(error).toBeNull();

      const messages = (data as { messages: Array<{ id: string; content: string | null }> })
        .messages;
      const mine = messages.find((m) => m.id === survivorMsgId);
      const theirs = messages.find((m) => m.id === leaverMsgId);

      expect(mine?.content).toContain('from-b self-delete');
      expect(theirs).toBeDefined();
      expect(theirs?.content).toBeNull();
    });
  });

  // ---------------------------------------------------------------- STORY-3
  describe('STORY-3 — hard delete leaves nothing standing', () => {
    it('tombstones before the cascade and removes the participant-less thread', async () => {
      const c = await asUser(platformAdmin);
      const { error } = await c.rpc('admin_hard_delete_user', {
        target_user_id: await publicUserId(doomed),
      });
      expect(error).toBeNull();

      // Counterpart is still live, so the thread stands with a tombstoned side.
      expect(await conversationExists(dmHardDelete)).toBe(true);

      // Now erase the other side: no surviving participant -> the thread goes.
      const { error: e2 } = await c.rpc('admin_hard_delete_user', {
        target_user_id: await publicUserId(counterpart),
      });
      expect(e2).toBeNull();

      expect(await conversationExists(dmHardDelete)).toBe(false);
    });
  });

  // ---------------------------------------------------------------- STORY-5
  describe('STORY-5 — platform exit is a removal, not an erasure', () => {
    it('leaves DM bodies standing, consistent with the journal and enrolments it also leaves', async () => {
      const c = await asUser(platformAdmin);
      const { error } = await c.rpc('admin_exit_user_from_platform', {
        p_target_user_id: await publicUserId(exited),
      });
      expect(error).toBeNull();

      // Asserted on the stable column so this reads the same either side of
      // the migration — it is an invariant the migration must not break.
      const msg = await messageBody(exitedMsgId);
      expect(msg?.content).toContain('from-a exit');
      expect(await conversationExists(dmExit)).toBe(true);
    });
  });

  // ---------------------------------------------------------------- STORY-7
  describe('STORY-7 — the instrument counts the right noun', () => {
    it('reports zero participant-less dm conversations after the dispositions ran', async () => {
      const rows = await runAdminSql(`
        SELECT count(*)::int AS n
        FROM public.conversations c
        WHERE c.kind = 'dm'
          AND NOT EXISTS (
            SELECT 1 FROM public.conversation_participants cp
             WHERE cp.conversation_id = c.id
          );`);
      expect((rows[0] as { n: number }).n).toBe(0);
    });
  });
});
