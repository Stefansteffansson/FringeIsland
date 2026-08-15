/**
 * TASK-IDN-01 — the self-deletion grace period: schedule, restore door, reaper.
 *
 * The ruling (Stefan, 2026-08-15; board settled same day): the click keeps
 * today's behaviour exactly (membership walk, dispositions, scrub, sessions
 * die) and STARTS a 30-day grace window; identity is stashed at the scrub
 * moment; login within the window offers restore (identity only — groups
 * were left and content dispositioned at click, by ruling); past the window
 * a scheduled reaper hard-erases via the admin_hard_delete_user mechanics.
 * Admin-origin decommission stays terminal.
 *
 * Red-first (authored 2026-08-15, pre-migration 20260815210000). Expected
 * red classes:
 *   - 42703 — users.decommissioned_at / pre_deletion_identity absent
 *   - PGRST202 / 42883 — get_own_restore_state, restore_own_account,
 *     reap_expired_member_deletions absent
 *   - behavioural: nothing schedules, nothing restores, nothing reaps
 *
 * Labelled GREEN guards (not TDD reds):
 *   - a member-deleted account can still SIGN IN (credentials survive —
 *     the finding this task exists to complete, true before and after)
 *   - reactivate_own_account still refuses a decommissioned account
 *     ("terminally closed") — restore is a different, narrower door
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  generateTestEmail,
  signInWithRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(180_000);

describe('TASK-IDN-01 — self-deletion grace period', () => {
  const admin = createAdminClient();
  const runTag = Date.now().toString(36);

  let deleter: TestUser;   // deletes, signs back in, restores
  let expired: TestUser;   // deletes, is backdated past the window, is reaped
  let inwindow: TestUser;  // deletes, stays inside the window — the reaper must not touch
  let adminheld: TestUser; // admin-origin decommission — the reaper must not touch

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  /** Stable columns only — never fails 42703 for the wrong reason. */
  const userCore = async (u: TestUser) => {
    const { data } = await admin
      .from('users')
      .select('id, full_name, nickname, is_active, is_decommissioned, deactivation_origin, personal_group_id')
      .eq('auth_user_id', u.user.id)
      .maybeSingle();
    return data as {
      id: string;
      full_name: string;
      nickname: string;
      is_active: boolean;
      is_decommissioned: boolean;
      deactivation_origin: string | null;
      personal_group_id: string;
    } | null;
  };

  /** Includes the schedule columns. Pre-migration this returns null (42703) —
   *  that IS the expected red. */
  const userSchedule = async (u: TestUser) => {
    const { data } = await admin
      .from('users')
      .select('id, decommissioned_at, pre_deletion_identity')
      .eq('auth_user_id', u.user.id)
      .maybeSingle();
    return data as {
      id: string;
      decommissioned_at: string | null;
      pre_deletion_identity: { full_name?: string; nickname?: string } | null;
    } | null;
  };

  beforeAll(async () => {
    const fixture = (role: string) =>
      createTestUser({ email: generateTestEmail(`idn01-${role}-${runTag}`) });
    deleter = await fixture('deleter');
    expired = await fixture('expired');
    inwindow = await fixture('inwindow');
    adminheld = await fixture('adminheld');
  });

  afterAll(async () => {
    // The reaper may have erased some of these; cleanup is idempotent.
    for (const u of [deleter, expired, inwindow, adminheld].filter(Boolean)) {
      await cleanupTestUser(u.user.id);
    }
  });

  // ------------------------------------------------------------- the schedule
  describe('the click starts the clock and stashes the identity', () => {
    it('sets decommissioned_at and captures the pre-scrub identity', async () => {
      const before = await userCore(deleter);
      expect(before?.full_name).toBeTruthy();
      const originalName = before!.full_name;
      const originalNickname = before!.nickname;

      const c = await asUser(deleter);
      const { error } = await c.rpc('delete_own_account');
      expect(error).toBeNull();

      const sched = await userSchedule(deleter);
      expect(sched).not.toBeNull(); // 42703 pre-migration — the expected red
      expect(sched?.decommissioned_at).toBeTruthy();
      expect(sched?.pre_deletion_identity?.full_name).toBe(originalName);
      expect(sched?.pre_deletion_identity?.nickname).toBe(originalNickname);

      // The scrub itself is unchanged (today's behaviour, kept by ruling 1).
      const after = await userCore(deleter);
      expect(after?.is_decommissioned).toBe(true);
      expect(after?.deactivation_origin).toBe('member');
      expect(after?.nickname).toBe('[Deleted User]');
    });
  });

  // --------------------------------------------------------- the restore door
  describe('login within the window restores the account whole (identity)', () => {
    it('[guard, green today] the deleted member can still sign in — credentials survive', async () => {
      const c = createTestClient();
      await expect(signInWithRetry(c, deleter.email, deleter.password)).resolves.not.toThrow();
    });

    it('serves the restore state: restorable, with the scheduled date', async () => {
      const c = await asUser(deleter);
      const { data, error } = await c.rpc('get_own_restore_state');
      expect(error).toBeNull(); // PGRST202 pre-migration — the expected red

      const state = data as {
        restorable: boolean;
        decommissioned_at: string;
        scheduled_deletion_at: string;
      };
      expect(state.restorable).toBe(true);
      const decommissioned = new Date(state.decommissioned_at).getTime();
      const scheduled = new Date(state.scheduled_deletion_at).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      expect(scheduled - decommissioned).toBe(thirtyDays);
    });

    it('[guard, green today] reactivate_own_account still refuses — restore is a different door', async () => {
      const c = await asUser(deleter);
      const { error } = await c.rpc('reactivate_own_account');
      expect(error).not.toBeNull();
      expect(error?.message).toContain('terminally closed');
    });

    it('restore_own_account returns the identity whole and clears the schedule', async () => {
      const c = await asUser(deleter);
      const { error } = await c.rpc('restore_own_account');
      expect(error).toBeNull(); // PGRST202 pre-migration — the expected red

      const core = await userCore(deleter);
      expect(core?.is_active).toBe(true);
      expect(core?.is_decommissioned).toBe(false);
      expect(core?.deactivation_origin).toBeNull();
      expect(core?.nickname).not.toBe('[Deleted User]');
      expect(core?.full_name).not.toBe('[Deleted User]');

      const sched = await userSchedule(deleter);
      expect(sched?.decommissioned_at).toBeNull();
      expect(sched?.pre_deletion_identity).toBeNull();

      // The sync trigger propagated the name back to the personal group.
      const { data: pg } = await admin
        .from('groups')
        .select('name')
        .eq('id', core!.personal_group_id)
        .maybeSingle();
      expect((pg as { name: string } | null)?.name).not.toBe('[Deleted User]');

      // The audit row names the act.
      const restoreAudit = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.admin_audit_log
          WHERE action = 'self_restore_account' AND target = '${core!.id}';`,
      );
      expect((restoreAudit as Array<{ n: number }>)[0].n).toBe(1);
    });

    it('a second restore refuses — nothing left to restore', async () => {
      const c = await asUser(deleter);
      const { error } = await c.rpc('restore_own_account');
      expect(error).not.toBeNull();
      expect(error?.message).toContain('nothing to restore');
    });
  });

  // -------------------------------------------------------------- the window
  describe('the window closes', () => {
    it('a past-window restore refuses with the honest reason', async () => {
      const c = await asUser(expired);
      const { error: delError } = await c.rpc('delete_own_account');
      expect(delError).toBeNull();

      await runAdminSql(`
        UPDATE public.users SET decommissioned_at = now() - interval '31 days'
        WHERE auth_user_id = '${expired.user.id}';`);

      const c2 = await asUser(expired);
      const { error } = await c2.rpc('restore_own_account');
      expect(error).not.toBeNull(); // pre-migration: PGRST202; post: P0001
      expect(error?.message).toContain('grace window has closed');
    });
  });

  // -------------------------------------------------------------- the reaper
  describe('the reaper erases past-window member deletions — and only those', () => {
    it('erases the expired account: credentials, row, residue all gone; leaves the others', async () => {
      // Arrange the two must-not-touch shapes before the sweep.
      const cIn = await asUser(inwindow);
      const { error: inDelError } = await cIn.rpc('delete_own_account');
      expect(inDelError).toBeNull();

      await runAdminSql(`
        UPDATE public.users
           SET is_active = false, is_decommissioned = true,
               deactivation_origin = 'admin'
         WHERE auth_user_id = '${adminheld.user.id}';`);

      const expiredCore = await userCore(expired);
      expect(expiredCore).not.toBeNull();

      const sweep = await runAdminSql('SELECT public.reap_expired_member_deletions() AS r;');
      // Pre-migration: the function does not exist — the expected red.
      const result = (sweep as Array<{ r: { swept: number; erased: number } }>)[0].r;
      expect(result.erased).toBeGreaterThanOrEqual(1);

      // The expired account is GONE — users row and auth credentials.
      expect(await userCore(expired)).toBeNull();
      const authRow = await runAdminSql(
        `SELECT count(*)::int AS n FROM auth.users WHERE id = '${expired.user.id}';`,
      );
      expect((authRow as Array<{ n: number }>)[0].n).toBe(0);

      // The audit row names the reaper's act.
      const reapAudit = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.admin_audit_log
          WHERE action = 'member.grace_expiry_erase' AND target = '${expiredCore!.id}';`,
      );
      expect((reapAudit as Array<{ n: number }>)[0].n).toBe(1);

      // The sweep logged its run.
      const runRow = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.reaper_runs
          WHERE outcome = 'success' AND ran_at > now() - interval '2 minutes';`,
      );
      expect((runRow as Array<{ n: number }>)[0].n).toBeGreaterThanOrEqual(1);

      // In-window member deletion: untouched, still restorable.
      expect(await userCore(inwindow)).not.toBeNull();

      // Admin-origin decommission: terminal, never the reaper's (no
      // decommissioned_at was ever set for it — the member-origin trigger
      // deliberately does not fire on admin holds).
      expect(await userCore(adminheld)).not.toBeNull();
    });
  });
});
