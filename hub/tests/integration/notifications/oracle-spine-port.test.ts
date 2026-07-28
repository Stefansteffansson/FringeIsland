/**
 * A-NTF exit-checklist item 1 — the remainder of the v1 oracle spine.
 *
 * The area gate closed with "oracle spine ported" deliberately unticked:
 * B-COMM-001/002/003 were ported and labelled (`notification-contracts.test.ts`
 * header), but B-NOTIF-001, B-NOTIF-003 and B-ADMIN-011 were not carried into
 * `hub/tests/` anywhere. This file discharges that line. Three oracles, three
 * different answers — recorded rather than assumed:
 *
 *  - B-NOTIF-001 (Smart Notification Schema) — PORTED, here. The
 *    `notifications_action_consistency` CHECK (migration 20260228125730:22-27)
 *    is live on the table and was asserted NOWHERE in v2. Its one v1 sibling
 *    assertion — that a recipient can read the smart columns — is already
 *    covered at the contract door (`actionable-notifications.test.ts:264`,
 *    action_data on the get_own_notifications payload) and is not duplicated.
 *
 *  - B-ADMIN-011 (Admin Notification Send) — PORTED, here. ADR-U049:49 keeps
 *    it explicitly valid: `admin_send_notification` "remains untouched as
 *    vertical delivery mechanics per U048 'and kin'; B-ADMIN-011 stays a valid
 *    oracle for it". v2 already USES the RPC — as an unmodified-writer fixture
 *    proving the N-D dispatcher catches writers it does not know about
 *    (`preference-and-dispatcher-contracts.test.ts:61-68`) — but never asserted
 *    the RPC's own contract. Using a function is not testing it.
 *
 *  - B-NOTIF-003 (Notification Action Handler) — SUPERSEDED, not ported, and
 *    this is the ruling. Its subject is the generic `handle_notification_action`
 *    RPC, DROPPED on purpose at migration 20260705072252 (FEAT-PC014) and
 *    confirmed dropped by NB-1's thin-dispatch decision. Re-porting it would
 *    mean testing a function that must not exist. Its six-rejection matrix
 *    survives per dedicated handler, and every row of it is already covered:
 *
 *      v1 rejection            | where it lives now
 *      ------------------------|--------------------------------------------
 *      another user's row      | stewardship-succession.test.ts:629 (P0002)
 *                              | actionable-notifications.test.ts:352
 *      passive notification    | unreachable by construction — a passive kind
 *                              | has no DISPATCH_SEGMENTS entry, so no route
 *                              | exists to call (lib/notifications/client.ts:102)
 *      already-actioned        | stewardship-succession.test.ts:656 (P0001)
 *                              | actionable-notifications.test.ts:337 (already)
 *      expired                 | stewardship-succession.test.ts:640 (P0001)
 *                              | actionable-notifications.test.ts:403 (lazy)
 *      invalid action value    | the boolean body admits no invalid value —
 *                              | the typed contracts took the enum's place
 *      (v2 addition) stale     | stewardship-succession.test.ts:681
 *
 * NOT red-first, and deliberately so. This is a characterization port against
 * behaviour that already shipped — there is no migration in this change. A red
 * here is a defect found, not a build pending. That is the point of porting an
 * oracle late: it can only tell you something you did not already know.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Promote a personal group to platform admin: active DeusEx member + DeusEx
 *  role. Copied from `preference-and-dispatcher-contracts.test.ts:114`, which
 *  copied it from `../auth/fim-account-erasure.test.ts:46`.
 *
 *  REQUIRED, not convenience: `is_platform_admin()` / `has_permission()` resolve
 *  through `get_current_personal_group_id()`, which is NULL for the service-role
 *  client. Calling `admin_send_notification` as service_role would be refused
 *  for the wrong reason and make the non-admin half of the pair vacuous — the
 *  exact trap the N-D suite documents at its own copy of this helper. */
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
        WHERE member_group_id = '${personalGroupId}' AND group_id = v_deusex;
    END $$;`).catch(() => undefined);
}

describe('A-NTF oracle-spine port — B-NOTIF-001 + B-ADMIN-011 (B-NOTIF-003 superseded)', () => {
  let admin: SupabaseClient;
  let operator: TestUser;
  let alpha: TestUser;
  let beta: TestUser;
  let plain: TestUser;
  let asOperator: SupabaseClient;
  let asPlain: SupabaseClient;
  let alphaUserId: string;
  let betaUserId: string;

  /** Every title this suite writes carries this tag, so cleanup can be scoped
   *  to rows this run created.
   *
   *  The v1 oracle tore down with `delete().eq('type','admin_notification')` —
   *  an unscoped delete across the whole table. On the shared dev DB that
   *  destroys other sessions' and other suites' rows, which is precisely the
   *  class of fixture damage the A-NTF cleanup archaeology traced (11 150
   *  orphaned personal groups from one swallowed delete). Scoped by id here. */
  const RUN_TAG = `OSP-${process.hrtime.bigint()}`;
  const createdNotificationIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  /** `public.users.id` for an auth user — a different id space from
   *  `TestUser.user.id`. `admin_send_notification` resolves
   *  `users.id = ANY(target_user_ids)`, so passing the auth id matches no row
   *  and the RPC returns success with count 0: a green test asserting nothing. */
  const profileIdOf = async (u: TestUser): Promise<string> => {
    const { data } = await admin
      .from('users')
      .select('id')
      .eq('auth_user_id', u.user.id)
      .single();
    return (data as { id: string }).id;
  };

  /** Collect ids for teardown, by the run tag. */
  const harvest = async (): Promise<void> => {
    const { data } = await admin
      .from('notifications')
      .select('id')
      .like('title', `${RUN_TAG}%`);
    for (const row of (data ?? []) as { id: string }[]) {
      if (!createdNotificationIds.includes(row.id)) createdNotificationIds.push(row.id);
    }
  };

  /** Raw substrate insert, bypassing every contract — the only way to reach the
   *  CHECK constraint, since no contract will author an inconsistent row. */
  const rawInsert = async (fields: Record<string, unknown>) => {
    const { data, error } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: alpha.personalGroupId,
        title: `${RUN_TAG} constraint probe`,
        body: 'constraint probe body',
        ...fields,
      })
      .select('id')
      .maybeSingle();
    const id = (data as { id: string } | null)?.id ?? null;
    if (id) createdNotificationIds.push(id);
    return { id, error: error as { code?: string; message?: string } | null };
  };

  beforeAll(async () => {
    admin = createAdminClient();
    // Single-token display names — surfaces render nickname = first token.
    operator = await createTestUser({ displayName: 'OspOperator' });
    alpha = await createTestUser({ displayName: 'OspAlpha' });
    beta = await createTestUser({ displayName: 'OspBeta' });
    plain = await createTestUser({ displayName: 'OspPlain' });

    await makePlatformAdmin(operator.personalGroupId);
    asOperator = await asUser(operator);
    asPlain = await asUser(plain);

    alphaUserId = await profileIdOf(alpha);
    betaUserId = await profileIdOf(beta);
  }, 90_000);

  afterAll(async () => {
    await harvest();
    if (createdNotificationIds.length) {
      await admin.from('notifications').delete().in('id', createdNotificationIds);
    }
    if (operator) await demotePlatformAdmin(operator.personalGroupId);
    for (const u of [operator, alpha, beta, plain]) {
      if (u) await cleanupTestUser(u.user.id);
    }
  }, 90_000);

  // --------------------------------------------------------------------------
  // B-NOTIF-001: Smart Notification Schema
  //
  // The constraint, verbatim (20260228125730:23-27):
  //   CHECK ((action_type IS NULL AND action_taken IS NULL AND action_taken_at
  //           IS NULL) OR (action_type IS NOT NULL))
  //
  // Read plainly: a PASSIVE row may not carry an answer. A row with no question
  // on it cannot record having been answered. `action_type` is what makes a row
  // askable, so it is the discriminant on both sides.
  // --------------------------------------------------------------------------
  describe('B-NOTIF-001: smart-notification schema consistency', () => {
    it('a passive row with every smart column NULL is accepted', async () => {
      const { id, error } = await rawInsert({ type: 'admin_notification' });
      expect(error).toBeNull();
      expect(id).not.toBeNull();
    });

    it('a smart row carrying action_type and action_data is accepted', async () => {
      const { id, error } = await rawInsert({
        type: 'acting_invitation',
        action_type: 'accept_decline',
        action_data: { probe: true },
      });
      expect(error).toBeNull();
      expect(id).not.toBeNull();
    });

    it('a PASSIVE row carrying action_taken is refused by the consistency constraint (23514)', async () => {
      const { id, error } = await rawInsert({
        type: 'admin_notification',
        action_taken: true,
      });
      expect(id).toBeNull();
      expect(error?.code).toBe('23514');
      expect(error?.message ?? '').toContain('notifications_action_consistency');
    });

    it('a PASSIVE row carrying action_taken_at is refused by the same constraint — the second limb, which action_taken alone does not reach', async () => {
      const { id, error } = await rawInsert({
        type: 'admin_notification',
        action_taken_at: new Date().toISOString(),
      });
      expect(id).toBeNull();
      expect(error?.code).toBe('23514');
      expect(error?.message ?? '').toContain('notifications_action_consistency');
    });

    it('a SMART row carrying action_taken is accepted — the constraint gates the passive side only', async () => {
      const { id, error } = await rawInsert({
        type: 'acting_invitation',
        action_type: 'accept_decline',
        action_taken: true,
        action_taken_at: new Date().toISOString(),
      });
      expect(error).toBeNull();
      expect(id).not.toBeNull();
    });

    it('the constraint is live on the table, not merely honoured by the rows that happen to exist', async () => {
      const rows = (await runAdminSql(`
        SELECT conname, pg_get_constraintdef(oid) AS def
        FROM pg_constraint
        WHERE conrelid = 'public.notifications'::regclass
          AND conname = 'notifications_action_consistency';`)) as
        | { conname: string; def: string }[]
        | null;
      expect(rows?.length).toBe(1);
      expect(rows![0].def).toContain('CHECK');
      // NOT VALID would let pre-existing bad rows stand and defeat the law.
      expect(rows![0].def).not.toContain('NOT VALID');
    });
  });

  // --------------------------------------------------------------------------
  // B-ADMIN-011: Admin Notification Send
  //
  // Signature as it stands after the RC4 param rename (20260223164813):
  //   admin_send_notification(target_user_ids UUID[], title TEXT, message TEXT)
  // --------------------------------------------------------------------------
  describe('B-ADMIN-011: admin_send_notification', () => {
    it('the RPC exists and an empty target list returns count 0 (v1 asserted this twice; merged)', async () => {
      const { data, error } = await asOperator.rpc('admin_send_notification', {
        target_user_ids: [],
        title: `${RUN_TAG} empty`,
        message: 'Should create nothing.',
      });
      expect(error).toBeNull();
      expect((data as { success: boolean; count: number }).success).toBe(true);
      expect((data as { count: number }).count).toBe(0);

      const { data: rows } = await admin
        .from('notifications')
        .select('id')
        .eq('title', `${RUN_TAG} empty`);
      expect(rows).toEqual([]);
    });

    it('fans out one notification per target, addressed to each target personal group', async () => {
      const title = `${RUN_TAG} fanout`;
      const { data, error } = await asOperator.rpc('admin_send_notification', {
        target_user_ids: [alphaUserId, betaUserId],
        title,
        message: 'This is an admin notification test.',
      });
      expect(error).toBeNull();
      expect((data as { count: number }).count).toBe(2);

      const { data: rows } = await admin
        .from('notifications')
        .select('id, recipient_group_id')
        .eq('type', 'admin_notification')
        .eq('title', title);

      const received = rows as { id: string; recipient_group_id: string }[];
      for (const r of received) createdNotificationIds.push(r.id);

      expect(received.length).toBe(2);
      const recipients = received.map((r) => r.recipient_group_id);
      expect(recipients).toContain(alpha.personalGroupId);
      expect(recipients).toContain(beta.personalGroupId);
    });

    it('writes the registered kind, the given title and body, and lands unread', async () => {
      const title = `${RUN_TAG} fields`;
      const { error } = await asOperator.rpc('admin_send_notification', {
        target_user_ids: [alphaUserId],
        title,
        message: 'Checking notification fields.',
      });
      expect(error).toBeNull();

      const { data } = await admin
        .from('notifications')
        .select('id, type, title, body, recipient_group_id, is_read, action_type')
        .eq('type', 'admin_notification')
        .eq('title', title)
        .single();

      const row = data as {
        id: string;
        type: string;
        title: string;
        body: string;
        recipient_group_id: string;
        is_read: boolean;
        action_type: string | null;
      };
      createdNotificationIds.push(row.id);

      expect(row.type).toBe('admin_notification');
      expect(row.title).toBe(title);
      expect(row.body).toBe('Checking notification fields.');
      expect(row.recipient_group_id).toBe(alpha.personalGroupId);
      expect(row.is_read).toBe(false);
      // v2 addition: the kind is passive, so the row must satisfy the B-NOTIF-001
      // passive limb — the two oracles meet here.
      expect(row.action_type).toBeNull();
    });

    it("its kind is registered, so the N-A FK admits it — the row's type is not free text", async () => {
      const rows = (await runAdminSql(`
        SELECT category_key FROM public.notification_kinds
        WHERE kind = 'admin_notification';`)) as { category_key: string }[] | null;
      expect(rows?.length).toBe(1);
      expect(rows![0].category_key).toBe('platform');
    });

    it('a non-admin caller is refused, and no row is written (PAIRED with the fan-out above, which is what makes this refusal meaningful)', async () => {
      const title = `${RUN_TAG} unauthorized`;
      const { error } = await asPlain.rpc('admin_send_notification', {
        target_user_ids: [alphaUserId],
        title,
        message: 'This should fail.',
      });

      expect(error).not.toBeNull();
      expect(error?.message ?? '').toMatch(/manage_all_groups|Unauthorized/i);

      const { data: rows } = await admin
        .from('notifications')
        .select('id')
        .eq('title', title);
      expect(rows).toEqual([]);
    });
  });
});
