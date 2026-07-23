/**
 * FEAT-PD013 — notification routing contracts & category registry (Cycle N-A):
 * STORY-1 (registries + FK), STORY-2 (list contract), STORY-3 (unread count),
 * STORY-4 (read-state contracts + write-narrowing), STORY-5 (export section).
 *
 * Oracle spine ported and labelled (adapted from
 * hub-legacy/tests/integration/communication/notifications.test.ts to the
 * contract door): B-COMM-002 (own-only read, no cross-actor visibility),
 * B-COMM-003 (read-state default false/NULL, mark-own, accurate unread count).
 * The trigger-emission row (B-COMM-001's shape) seeds via a genuine
 * group_memberships 'invited' INSERT so emission→registry→list continuity is
 * proven on the real path, not only synthetic fixtures.
 *
 * Red-first (authored 2026-07-23, pre-migration). Expected red classes:
 * registries absent (runAdminSql throws relation-does-not-exist), contracts
 * absent (PGRST202 function not found), FK absent (unregistered-type INSERT
 * succeeds where it must fail), v1 UPDATE/DELETE policies still present
 * (pg_policies assertion fails), `notifications` key absent from the export
 * composite.
 */

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
import { fetchOwnDataExport, type DataExport } from '@/lib/account/export';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(180_000);

/** The exact N-A payload keys (FEAT-PD013 STORY-2; action_data/action_taken_at
 *  deliberately excluded until N-B names their consumer). */
const N_A_PAYLOAD_KEYS = [
  'id',
  'kind',
  'category',
  'title',
  'body',
  'group_id',
  'created_at',
  'is_read',
  'read_at',
  'action_type',
  'action_taken',
  'expires_at',
].sort();

type NotificationRow = {
  id: string;
  kind: string;
  category: string;
  title: string;
  body: string;
  group_id: string | null;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
  action_type: string | null;
  action_taken: string | null;
  expires_at: string | null;
};

describe('FEAT-PD013 — notification contracts & category registry (N-A)', () => {
  const admin = createAdminClient();
  const runTag = Date.now().toString(36);

  // Distinctive strings — own-data walls are asserted on these.
  const rTitle = (i: number) => `NA-R-${i}-${runTag}`;
  const O_TITLE = `NA-O-${runTag}`;
  const S_TITLE = `NA-S-${runTag}`;
  const TEST_KIND = `na_test_kind_${runTag}`;
  const TEST_KIND_TITLE = `NA-testkind-${runTag}`;

  let recipientR: TestUser;
  let otherO: TestUser;
  let freshF: TestUser;
  let suspendedS: TestUser;
  let groupO: string; // O's group — the trigger-path invitation rides it
  const rRowIds: string[] = []; // synthetic rows for R, index-aligned to rTitle(i)
  let oRowId: string;

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  /** Admin-seeded delivery row (service role = obligation-fulfilment writer
   *  per ADR-U048; user-facing INSERT stays impossible — B-COMM-002). */
  const seedNotification = async (
    recipient: TestUser,
    title: string,
    opts?: { type?: string; groupId?: string | null; createdAt?: string },
  ): Promise<string> => {
    const { data, error } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: recipient.personalGroupId,
        type: opts?.type ?? 'admin_notification',
        title,
        body: `body of ${title}`,
        group_id: opts?.groupId ?? null,
        ...(opts?.createdAt ? { created_at: opts.createdAt } : {}),
      })
      .select('id')
      .single();
    expect(error).toBeNull();
    return (data as { id: string }).id;
  };

  beforeAll(async () => {
    [recipientR, otherO, freshF, suspendedS] = await Promise.all([
      createTestUser({ displayName: `NAn R ${runTag}` }),
      createTestUser({ displayName: `NAn O ${runTag}` }),
      createTestUser({ displayName: `NAn F ${runTag}` }),
      createTestUser({ displayName: `NAn S ${runTag}` }),
    ]);

    // O's group — carries the genuine trigger-path row for R.
    const co = await asUser(otherO);
    const { data: gid, error: gErr } = await co.rpc('create_engagement_group', {
      p_name: `NAn Group ${runTag}`,
    });
    expect(gErr).toBeNull();
    groupO = gid as string;

    // Trigger path (B-COMM-001 shape): 'invited' membership INSERT →
    // notify_invitation_received → an 'invitation_received' row for R.
    const { error: invErr } = await admin.from('group_memberships').insert({
      group_id: groupO,
      member_group_id: recipientR.personalGroupId,
      status: 'invited',
      added_by_group_id: otherO.personalGroupId,
    });
    expect(invErr).toBeNull();

    // Synthetic rows: 6 for R (staggered created_at so keyset order is
    // deterministic), 2 for O, 1 for S.
    const base = Date.now() - 60_000;
    for (let i = 1; i <= 6; i++) {
      rRowIds[i] = await seedNotification(recipientR, rTitle(i), {
        createdAt: new Date(base + i * 1000).toISOString(),
      });
    }
    oRowId = await seedNotification(otherO, O_TITLE);
    await seedNotification(otherO, `${O_TITLE}-second`);
    await seedNotification(suspendedS, S_TITLE);

    // Suspend S — the admin hold (IDN-9 semantics).
    const { error: susErr } = await admin
      .from('users')
      .update({ is_active: false })
      .eq('auth_user_id', suspendedS.user.id);
    expect(susErr).toBeNull();
  });

  afterAll(async () => {
    await admin.from('users').update({ is_active: true }).eq('auth_user_id', suspendedS.user.id);
    await admin.from('notifications').delete().like('title', `%${runTag}%`);
    // Test-kind registry rows (open-registry proof) — tolerate absence pre-migration.
    try {
      await runAdminSql(
        `DELETE FROM public.notification_kinds WHERE kind = '${TEST_KIND}';`,
      );
    } catch {
      /* registries not born yet — red phase */
    }
    if (groupO) await cleanupTestGroup(groupO);
    for (const u of [recipientR, otherO, freshF, suspendedS].filter(Boolean)) {
      await cleanupTestUser(u.user.id);
    }
  });

  // ---------------------------------------------------------------------------
  describe('STORY-1 — category & kind registries, FK-enforced, open', () => {
    it('both registries exist; every category carries lawful_basis + interruption_grade', async () => {
      const cats = await runAdminSql(
        `SELECT key, lawful_basis, interruption_grade FROM public.notification_categories;`,
      );
      expect(cats.length).toBeGreaterThan(0);
      for (const c of cats) {
        expect(['transactional', 'consent']).toContain(c.lawful_basis);
        expect(typeof c.interruption_grade).toBe('string');
      }
    });

    it('every realized kind is registered — zero orphaned type strings in the delivery table', async () => {
      const orphans = await runAdminSql(
        `SELECT count(*)::int AS n
           FROM public.notifications n
           LEFT JOIN public.notification_kinds k ON n.type = k.kind
          WHERE k.kind IS NULL;`,
      );
      expect(orphans[0].n).toBe(0);
    });

    it('an INSERT with an unregistered type is rejected by the FK', async () => {
      const { error } = await admin.from('notifications').insert({
        recipient_group_id: recipientR.personalGroupId,
        type: `bogus_${runTag}`,
        title: 'must not land',
        body: 'must not land',
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('23503'); // foreign_key_violation
    });

    it('open-registry proof: a fresh kind row flows end-to-end with no code change', async () => {
      await runAdminSql(
        `INSERT INTO public.notification_kinds (kind, category_key, label)
         VALUES ('${TEST_KIND}',
                 (SELECT key FROM public.notification_categories LIMIT 1),
                 'N-A open-registry probe');`,
      );
      await seedNotification(recipientR, TEST_KIND_TITLE, { type: TEST_KIND });
      const cr = await asUser(recipientR);
      const { data, error } = await cr.rpc('get_own_notifications', { p_limit: 50 });
      expect(error).toBeNull();
      const rows = data as NotificationRow[];
      expect(rows.some((r) => r.kind === TEST_KIND && r.title === TEST_KIND_TITLE)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  describe('STORY-2 — list contract: own-only, ordered, keyset, exact payload', () => {
    it('returns only my rows, newest-first, with exactly the N-A payload keys (B-COMM-002 spine, contract door)', async () => {
      const cr = await asUser(recipientR);
      const { data, error } = await cr.rpc('get_own_notifications', { p_limit: 50 });
      expect(error).toBeNull();
      const rows = data as NotificationRow[];
      // Own rows present — synthetic and the genuine trigger-path row both.
      for (let i = 1; i <= 6; i++) {
        expect(rows.some((r) => r.title === rTitle(i))).toBe(true);
      }
      expect(rows.some((r) => r.kind === 'invitation_received')).toBe(true);
      // The wall: O's rows never appear (B-COMM-002).
      expect(rows.some((r) => r.title.includes(O_TITLE))).toBe(false);
      // Ordering: newest-first.
      const times = rows.map((r) => new Date(r.created_at).getTime());
      expect([...times].sort((a, b) => b - a)).toEqual(times);
      // Exact payload keys — no action_data/action_taken_at until N-B.
      expect(Object.keys(rows[0]).sort()).toEqual(N_A_PAYLOAD_KEYS);
    });

    it('keyset pagination: no gaps, no duplicates across pages', async () => {
      const cr = await asUser(recipientR);
      const { data: p1, error: e1 } = await cr.rpc('get_own_notifications', { p_limit: 3 });
      expect(e1).toBeNull();
      const page1 = p1 as NotificationRow[];
      expect(page1.length).toBe(3);
      const last = page1[page1.length - 1];
      const { data: p2, error: e2 } = await cr.rpc('get_own_notifications', {
        p_limit: 50,
        p_before_created_at: last.created_at,
        p_before_id: last.id,
      });
      expect(e2).toBeNull();
      const page2 = p2 as NotificationRow[];
      const ids1 = new Set(page1.map((r) => r.id));
      expect(page2.some((r) => ids1.has(r.id))).toBe(false); // no duplicates
      const { data: all } = await cr.rpc('get_own_notifications', { p_limit: 50 });
      expect(page1.length + page2.length).toBe((all as NotificationRow[]).length); // no gaps
    });

    it('a member with no notifications gets an empty list', async () => {
      const cf = await asUser(freshF);
      const { data, error } = await cf.rpc('get_own_notifications', { p_limit: 50 });
      expect(error).toBeNull();
      expect(data as NotificationRow[]).toEqual([]);
    });

    it('an anonymous caller is refused with a permission denial (not function-absence)', async () => {
      // Red-first note: asserting the CODE keeps this red pre-migration —
      // today the call fails PGRST202 (no such function); only the real,
      // REVOKE-from-anon contract yields the 42501 refusal this demands.
      const anon = createTestClient(); // never signed in
      const { error } = await anon.rpc('get_own_notifications', { p_limit: 5 });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501'); // insufficient_privilege
    });
  });

  // ---------------------------------------------------------------------------
  describe('STORY-3 — unread count (B-COMM-003 spine: count accuracy)', () => {
    it('counts exactly my unread rows and tracks a mark-read', async () => {
      const cr = await asUser(recipientR);
      const { data: before, error: e1 } = await cr.rpc('get_own_unread_notification_count');
      expect(e1).toBeNull();
      const n = before as number;
      expect(n).toBeGreaterThanOrEqual(6); // 6 synthetic + trigger row + probe row, none read yet

      const { error: mErr } = await cr.rpc('mark_notification_read', {
        p_notification_id: rRowIds[6],
      });
      expect(mErr).toBeNull();
      const { data: after, error: e2 } = await cr.rpc('get_own_unread_notification_count');
      expect(e2).toBeNull();
      expect(after as number).toBe(n - 1);
    });

    it('the unread predicate stays on the partial index (substrate-shape proof; LABELLED test-after — the index predates N-A (sprint3), so this is a regression guard, not a red-first behaviour test)', async () => {
      const idx = await runAdminSql(
        `SELECT indexname FROM pg_indexes
          WHERE tablename = 'notifications' AND indexname = 'idx_notifications_recipient_unread';`,
      );
      expect(idx.length).toBe(1);
      const plan = await runAdminSql(
        `EXPLAIN (FORMAT JSON)
         SELECT count(*) FROM public.notifications
          WHERE recipient_group_id = '${recipientR.personalGroupId}' AND is_read = false;`,
      );
      expect(JSON.stringify(plan)).toContain('idx_notifications_recipient_unread');
    });
  });

  // ---------------------------------------------------------------------------
  describe('STORY-4 — read-state through the contract door only', () => {
    it('mark_notification_read flips my row, sets read_at, and is idempotent (B-COMM-003 spine)', async () => {
      const cr = await asUser(recipientR);
      const { error: e1 } = await cr.rpc('mark_notification_read', {
        p_notification_id: rRowIds[5],
      });
      expect(e1).toBeNull();
      const { data: l1 } = await cr.rpc('get_own_notifications', { p_limit: 50 });
      const row1 = (l1 as NotificationRow[]).find((r) => r.id === rRowIds[5])!;
      expect(row1.is_read).toBe(true);
      expect(row1.read_at).not.toBeNull();

      const { error: e2 } = await cr.rpc('mark_notification_read', {
        p_notification_id: rRowIds[5],
      });
      expect(e2).toBeNull(); // idempotent — no error
      const { data: l2 } = await cr.rpc('get_own_notifications', { p_limit: 50 });
      const row2 = (l2 as NotificationRow[]).find((r) => r.id === rRowIds[5])!;
      expect(new Date(row2.read_at!).getTime()).toBe(new Date(row1.read_at!).getTime());
    });

    it("adversarial: another member's mark attempt touches nothing", async () => {
      const co = await asUser(otherO);
      await co.rpc('mark_notification_read', { p_notification_id: rRowIds[4] });
      // Whether it errors or no-ops, R's row must be untouched.
      const cr = await asUser(recipientR);
      const { data } = await cr.rpc('get_own_notifications', { p_limit: 50 });
      const row = (data as NotificationRow[]).find((r) => r.id === rRowIds[4])!;
      expect(row.is_read).toBe(false);
      expect(row.read_at).toBeNull();
    });

    it("mark_all_notifications_read flips all mine, returns the count, and leaves O's rows alone", async () => {
      const cr = await asUser(recipientR);
      const { data: unreadBefore } = await cr.rpc('get_own_unread_notification_count');
      const { data: flipped, error } = await cr.rpc('mark_all_notifications_read');
      expect(error).toBeNull();
      expect(flipped as number).toBe(unreadBefore as number);
      const { data: unreadAfter } = await cr.rpc('get_own_unread_notification_count');
      expect(unreadAfter as number).toBe(0);

      const co = await asUser(otherO);
      const { data: oCount } = await co.rpc('get_own_unread_notification_count');
      expect(oCount as number).toBe(2); // O's two rows untouched
    });

    it('write-narrowing: no user-facing UPDATE/DELETE policy remains; a direct UPDATE affects zero rows', async () => {
      const policies = await runAdminSql(
        `SELECT policyname, cmd FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'notifications';`,
      );
      expect(policies.some((p) => p.cmd === 'SELECT')).toBe(true); // select_own stands
      expect(policies.some((p) => p.cmd === 'UPDATE')).toBe(false);
      expect(policies.some((p) => p.cmd === 'DELETE')).toBe(false);

      // Direct-caller probe (ADR-U038): O updates O's own unread row directly.
      const co = await asUser(otherO);
      const { data: updated, error } = await co
        .from('notifications')
        .update({ is_read: true })
        .eq('id', oRowId)
        .select('id');
      expect(error).toBeNull(); // RLS filters silently
      expect(updated).toEqual([]); // zero rows affected
      const { data: oCount } = await co.rpc('get_own_unread_notification_count');
      expect(oCount as number).toBe(2); // still unread — the contract is the only door
    });
  });

  // ---------------------------------------------------------------------------
  describe('STORY-5 — notifications join the own-data export (CB-6 posture)', () => {
    type DocWithNotifs = DataExport & {
      notifications?: Array<Record<string, unknown>>;
    };

    it('my export carries a notifications section with my rows — and only mine', async () => {
      const cr = await asUser(recipientR);
      const doc = (await fetchOwnDataExport(cr)) as DocWithNotifs;
      expect(doc.notifications).toBeDefined();
      const text = JSON.stringify(doc.notifications);
      expect(text).toContain(rTitle(1));
      expect(text).not.toContain(O_TITLE);
    });

    it('a suspended member exports notifications too (right-of-access)', async () => {
      const cs = await asUser(suspendedS);
      const doc = (await fetchOwnDataExport(cs)) as DocWithNotifs;
      expect(doc.notifications).toBeDefined();
      expect(JSON.stringify(doc.notifications)).toContain(S_TITLE);
    });
  });
});
