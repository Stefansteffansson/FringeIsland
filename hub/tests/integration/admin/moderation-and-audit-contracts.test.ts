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

jest.setTimeout(240_000); // real-substrate suite: four users, five reports, two target kinds

/**
 * FEAT-PC022 gate (Cycle ADM-D, TASK-ADMD-01) — the moderation family, the
 * audit family, and the AB-4 execution, producer-driven. Sibling of the
 * PC020/PC021 gate suites.
 *
 * One migration: the content_reports resolution ALTER (resolved_by_group_id
 * SET NULL / resolved_at / resolution_kind / resolution_note),
 * admin_get_content_reports(p_filter) + admin_get_content_report_detail
 * (live author resolution, drift honesty), admin_resolve_content_report
 * (per-report; audit moderation.report_resolved; P0001 on second resolve),
 * the notify_report_resolved trigger + the report_resolved registered kind
 * (category 'platform'; the N-D dispatcher and N-C hint compose free),
 * admin_get_audit_log (keyset, cap 200, open-namespace prefix), DROP
 * audit_log_insert_admin + SELECT re-issue on is_platform_admin(), and the
 * get_own_data_export re-issue (audit_trail own-actor section, reports
 * resolution keys, schema_version 2 — ADR-U052 §6 / board AB-4).
 *
 * RED AT HEAD (pre-migration), by case:
 *  - STORY-1/2/3/5 cells: all four contracts absent — PGRST202 per call. The
 *    refusal cells (42501 / 22023 / P0002 / anon EXECUTE) each pin their
 *    SPECIFIC shape, so absence can't satisfy them.
 *  - STORY-4: the report_resolved kind row is absent (0 ≠ 1); the closure,
 *    mute, and erased-reporter cells fail on the resolve call (PGRST202).
 *  - STORY-6: audit_log_insert_admin EXISTS at head and the admin-authed
 *    direct INSERT SUCCEEDS (the ADR-U038 direct-caller hole, walk finding 3);
 *    the SELECT-policy predicate still reads has_permission (finding 4).
 *  - STORY-7: schema_version is 1 (pins 2); doc.audit_trail is absent; the
 *    exported reports carry no resolution keys (columns absent).
 *  - STORY-8: the action catalog holds zero moderation.* rows.
 * LABELLED GREEN (green before AND after by design — never claimed as red):
 *  - S6c append-only: no UPDATE/DELETE policies on admin_audit_log (the
 *    PC020 S5b invariant, re-pinned across the policy re-issue).
 *  - S8b: the N-D BEFORE INSERT dispatcher and the N-C AFTER INSERT hint
 *    triggers stand unharmed on notifications (regression guard — the new
 *    producer must ride them, not replace them).
 */

const CHANNEL_IN_APP = 'in_app';

const LIST_KEYS = [
  'id',
  'target_kind',
  'target_id',
  'target_group_id',
  'target_group_name',
  'reporter_display_name',
  'reason',
  'details',
  'content_snapshot',
  'status',
  'created_at',
  'resolution_kind',
  'resolved_at',
].sort();

type ReportRow = {
  id: string;
  target_kind: string;
  target_id: string;
  target_group_id: string | null;
  target_group_name: string | null;
  reporter_display_name: string | null;
  reason: string;
  details: string | null;
  content_snapshot: string | null;
  status: string;
  created_at: string;
  resolution_kind: string | null;
  resolved_at: string | null;
};

type AuditRow = {
  id: string;
  actor_group_id: string | null;
  actor_display_name: string | null;
  action: string;
  target: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

describe('FEAT-PC022 — moderation + audit-read contracts (ADM-D gate)', () => {
  const admin = createAdminClient();
  const runTag = `admd${Date.now()}`;

  let operator: TestUser; // platform admin — resolves, reads the trail
  let reporter: TestUser; // Member: files R1/R2/R3/R5
  let author: TestUser; // creates the group; authors the reported content
  let erased: TestUser; // files R4, then hard-deleted (the CASCADE cell)

  let g: string;
  let p1: string; // forum post — R1 + R4 target
  let p2: string; // forum post — R3 target
  let p3: string; // forum post — R5 target, tombstoned for the drift cell
  let dmConversationId: string;
  let dmMessageId: string; // R2 target

  let r1: string; // forum, resolved actioned + note
  let r2: string; // direct_message, resolved dismissed
  let r3: string; // forum, unknown-kind guard then muted resolve
  let r4: string; // erased reporter's — dies with them
  let r5: string; // forum, tombstoned target, stays open

  const createdAuthIds: string[] = [];
  const createdGroupIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const makePlatformAdmin = async (personalGroupId: string) => {
    await runAdminSql(`
      DO $$
      DECLARE v_deusex uuid; v_role uuid;
      BEGIN
        SELECT id INTO v_deusex FROM public.groups
          WHERE name = 'DeusEx' AND group_type = 'system';
        SELECT id INTO v_role FROM public.group_roles
          WHERE group_id = v_deusex AND name = 'DeusEx';
        INSERT INTO public.group_memberships (group_id, member_group_id, status, added_by_group_id)
          VALUES (v_deusex, '${personalGroupId}', 'active', v_deusex)
          ON CONFLICT DO NOTHING;
        INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
          VALUES ('${personalGroupId}', v_deusex, v_role, v_deusex)
          ON CONFLICT DO NOTHING;
      END $$;`);
  };

  const demotePlatformAdmin = async (personalGroupId: string) => {
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
  };

  const addMember = async (u: TestUser) => {
    const { error } = await admin.from('group_memberships').insert({
      group_id: g,
      member_group_id: u.personalGroupId,
      status: 'active',
      added_by_group_id: author.personalGroupId,
    });
    if (error) throw new Error(`seed membership: ${error.message}`);
    const rows = await runAdminSql(`
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${u.personalGroupId}', '${g}', gr.id, '${author.personalGroupId}'
      FROM public.group_roles gr
      WHERE gr.group_id = '${g}' AND gr.name = 'Member Role Template'
      RETURNING group_role_id;`);
    if (!rows || rows.length === 0) throw new Error('Member role template not instantiated');
  };

  const submitReport = async (
    asClient: SupabaseClient,
    kind: string,
    targetId: string,
    reason: string,
  ): Promise<string> => {
    const { data, error } = await asClient.rpc('submit_content_report', {
      p_target_kind: kind,
      p_target_id: targetId,
      p_reason: reason,
      p_details: `${reason} details`,
    });
    if (error) throw new Error(`fixture report: ${error.message}`);
    return (data as { id: string }).id;
  };

  const closureCount = async (personalGroupId: string): Promise<number> => {
    const rows = (await runAdminSql(
      `SELECT count(*)::int AS n FROM public.notifications
        WHERE recipient_group_id = '${personalGroupId}' AND type = 'report_resolved';`,
    )) as { n: number }[];
    return rows[0]?.n ?? 0;
  };

  beforeAll(async () => {
    operator = await createTestUser({ displayName: `AdmDOp${runTag}` });
    reporter = await createTestUser({ displayName: `AdmDRep${runTag}` });
    author = await createTestUser({ displayName: `AdmDAut${runTag}` });
    erased = await createTestUser({ displayName: `AdmDGone${runTag}` });
    for (const u of [operator, reporter, author, erased]) createdAuthIds.push(u.user.id);

    const ca = await asUser(author);
    const { data: groupId, error } = await ca.rpc('create_engagement_group', {
      p_name: `AdmDFix${runTag}`,
    });
    if (error) throw new Error(`seed group: ${error.message}`);
    g = groupId as string;
    createdGroupIds.push(g);
    await addMember(reporter);
    await addMember(erased);
    await makePlatformAdmin(operator.personalGroupId);

    const mkPost = async (content: string): Promise<string> => {
      const { data, error: postErr } = await ca.rpc('create_forum_post', {
        p_group_id: g,
        p_content: content,
      });
      if (postErr) throw new Error(`fixture post: ${postErr.message}`);
      return (data as { id: string }).id;
    };
    p1 = await mkPost(`AdmD target one ${runTag}`);
    p2 = await mkPost(`AdmD target two ${runTag}`);
    p3 = await mkPost(`AdmD target three ${runTag}`);

    const { data: convId, error: convErr } = await ca.rpc('get_or_create_dm_conversation', {
      p_other_group_id: reporter.personalGroupId,
    });
    if (convErr) throw new Error(`fixture conversation: ${convErr.message}`);
    dmConversationId = convId as string;
    const { data: msg, error: msgErr } = await ca.rpc('send_message', {
      p_conversation_id: dmConversationId,
      p_content: `AdmD dm target ${runTag}`,
    });
    if (msgErr) throw new Error(`fixture message: ${msgErr.message}`);
    dmMessageId = (msg as { id: string }).id;

    const cr = await asUser(reporter);
    r1 = await submitReport(cr, 'forum_post', p1, `AdmD reason r1 ${runTag}`);
    r2 = await submitReport(cr, 'direct_message', dmMessageId, `AdmD reason r2 ${runTag}`);
    r3 = await submitReport(cr, 'forum_post', p2, `AdmD reason r3 ${runTag}`);
    r5 = await submitReport(cr, 'forum_post', p3, `AdmD reason r5 ${runTag}`);
    const ce = await asUser(erased);
    r4 = await submitReport(ce, 'forum_post', p1, `AdmD reason r4 ${runTag}`);
  }, 180_000);

  afterAll(async () => {
    await demotePlatformAdmin(operator.personalGroupId);
    await runAdminSql(
      `DELETE FROM public.notifications
        WHERE recipient_group_id = '${reporter.personalGroupId}' AND type = 'report_resolved';`,
    ).catch(() => undefined);
    await runAdminSql(
      `DELETE FROM public.content_reports WHERE reporter_group_id IN
        ('${reporter.personalGroupId}','${erased.personalGroupId}');`,
    ).catch(() => undefined);
    await runAdminSql(
      `DELETE FROM public.admin_audit_log WHERE action = 'forged.test';`,
    ).catch(() => undefined);
    try {
      await admin.from('forum_posts').delete().in('group_id', createdGroupIds);
      await admin.from('messages').delete().eq('conversation_id', dmConversationId);
      await admin.from('conversations').delete().eq('id', dmConversationId);
    } catch {
      /* nothing to sweep */
    }
    for (const gid of createdGroupIds) await cleanupTestGroup(gid);
    for (const uid of createdAuthIds) await cleanupTestUser(uid).catch(() => undefined);
  }, 120_000);

  // ------------------------------------------------------------------
  describe('STORY-1 — the queue read, honestly filtered', () => {
    it('S1a: open (the default) returns the walked payload rows, newest-first', async () => {
      const co = await asUser(operator);
      const { data, error } = await co.rpc('admin_get_content_reports');
      expect(error).toBeNull();
      const rows = data as ReportRow[];
      const ours = rows.filter((r) => [r1, r2, r3, r4, r5].includes(r.id));
      expect(ours.map((r) => r.id).sort()).toEqual([r1, r2, r3, r4, r5].sort());
      // Every row carries exactly the walked keys.
      const row1 = rows.find((r) => r.id === r1)!;
      expect(Object.keys(row1).sort()).toEqual(LIST_KEYS);
      expect(row1.status).toBe('open');
      expect(row1.target_kind).toBe('forum_post');
      expect(row1.target_group_name).toBe(`AdmDFix${runTag}`);
      expect(row1.reporter_display_name).toContain(`AdmDRep`);
      expect(row1.content_snapshot).toBe(`AdmD target one ${runTag}`);
      // Newest-first over the whole returned array.
      for (let i = 1; i < rows.length; i++) {
        expect(new Date(rows[i - 1].created_at).getTime()).toBeGreaterThanOrEqual(
          new Date(rows[i].created_at).getTime(),
        );
      }
    });

    it('S1b: an unknown filter refuses 22023', async () => {
      const co = await asUser(operator);
      const { error } = await co.rpc('admin_get_content_reports', { p_filter: 'no-such' });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('22023');
    });

    it('S1c: every contract refuses a non-admin 42501', async () => {
      const cr = await asUser(reporter);
      const calls: [string, Record<string, unknown>][] = [
        ['admin_get_content_reports', {}],
        ['admin_get_content_report_detail', { p_report_id: r1 }],
        ['admin_resolve_content_report', { p_report_id: r1, p_resolution_kind: 'actioned' }],
        ['admin_get_audit_log', {}],
      ];
      for (const [fn, args] of calls) {
        const { error } = await cr.rpc(fn, args);
        expect(error).not.toBeNull();
        expect(error!.code).toBe('42501');
      }
    });

    it('S1d: anon EXECUTE is revoked family-wide', async () => {
      const c = createTestClient();
      const { error } = await withAnonRateLimitRetry(() => c.auth.signInAnonymously());
      expect(error).toBeNull();
      const { error: refusal } = await c.rpc('admin_get_content_reports');
      expect(refusal).not.toBeNull();
      expect(`${refusal!.code} ${refusal!.message}`).toMatch(/42501|permission denied/i);
      await c.auth.signOut();
    });
  });

  // ------------------------------------------------------------------
  describe('STORY-2 — detail with live-resolved escalation keys and drift honesty', () => {
    it('S2a: a live forum target resolves its author for escalation', async () => {
      const co = await asUser(operator);
      const { data, error } = await co.rpc('admin_get_content_report_detail', {
        p_report_id: r1,
      });
      expect(error).toBeNull();
      const d = data as ReportRow & {
        author_user_id: string | null;
        author_display_name: string | null;
        live_target_exists: boolean;
        resolved_by_display_name: string | null;
      };
      expect(d.id).toBe(r1);
      expect(d.live_target_exists).toBe(true);
      expect(d.author_user_id).toBe(author.user.id);
      expect(d.author_display_name).toContain('AdmDAut');
      expect(d.content_snapshot).toBe(`AdmD target one ${runTag}`);
    });

    it('S2b: a tombstoned target reads live_target_exists=false; the author and the snapshot stand', async () => {
      const ca = await asUser(author);
      const { error: delErr } = await ca.rpc('delete_own_forum_post', { p_post_id: p3 });
      expect(delErr).toBeNull();

      const co = await asUser(operator);
      const { data, error } = await co.rpc('admin_get_content_report_detail', {
        p_report_id: r5,
      });
      expect(error).toBeNull();
      const d = data as { live_target_exists: boolean; author_user_id: string | null; content_snapshot: string };
      expect(d.live_target_exists).toBe(false);
      // The row knows its author — escalation survives the tombstone.
      expect(d.author_user_id).toBe(author.user.id);
      // What the content said when reported — the C-D drift rule doing its job.
      expect(d.content_snapshot).toBe(`AdmD target three ${runTag}`);
    });

    it('S2c: an unknown report id is existence-hidden P0002', async () => {
      const co = await asUser(operator);
      const { error } = await co.rpc('admin_get_content_report_detail', {
        p_report_id: '00000000-0000-4000-8000-000000000000',
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0002');
    });
  });

  // ------------------------------------------------------------------
  describe('STORY-3 — resolve, both outcomes, exactly once', () => {
    it('S3a: actioned with a note — fields, status, audit row', async () => {
      const co = await asUser(operator);
      const { data, error } = await co.rpc('admin_resolve_content_report', {
        p_report_id: r1,
        p_resolution_kind: 'actioned',
        p_resolution_note: `AdmD note ${runTag}`,
      });
      expect(error).toBeNull();
      expect((data as { status: string }).status).toBe('resolved');

      const rows = (await runAdminSql(
        `SELECT status, resolved_by_group_id, resolved_at, resolution_kind, resolution_note
           FROM public.content_reports WHERE id = '${r1}';`,
      )) as {
        status: string;
        resolved_by_group_id: string;
        resolved_at: string;
        resolution_kind: string;
        resolution_note: string;
      }[];
      expect(rows[0].status).toBe('resolved');
      expect(rows[0].resolved_by_group_id).toBe(operator.personalGroupId);
      expect(rows[0].resolved_at).toBeTruthy();
      expect(rows[0].resolution_kind).toBe('actioned');
      expect(rows[0].resolution_note).toBe(`AdmD note ${runTag}`);

      const audit = (await runAdminSql(
        `SELECT action, actor_group_id, metadata FROM public.admin_audit_log
          WHERE action = 'moderation.report_resolved' AND target = '${r1}';`,
      )) as { action: string; actor_group_id: string; metadata: Record<string, unknown> }[];
      expect(audit).toHaveLength(1);
      expect(audit[0].actor_group_id).toBe(operator.personalGroupId);
      expect(audit[0].metadata.resolution_kind).toBe('actioned');
    });

    it('S3b: dismissed without a note', async () => {
      const co = await asUser(operator);
      const { error } = await co.rpc('admin_resolve_content_report', {
        p_report_id: r2,
        p_resolution_kind: 'dismissed',
      });
      expect(error).toBeNull();
      const rows = (await runAdminSql(
        `SELECT resolution_kind, resolution_note FROM public.content_reports WHERE id = '${r2}';`,
      )) as { resolution_kind: string; resolution_note: string | null }[];
      expect(rows[0].resolution_kind).toBe('dismissed');
      expect(rows[0].resolution_note).toBeNull();
    });

    it('S3c: a second resolve refuses P0001 and writes nothing', async () => {
      const before = (await runAdminSql(
        `SELECT resolved_at FROM public.content_reports WHERE id = '${r1}';`,
      )) as { resolved_at: string }[];
      const co = await asUser(operator);
      const { error } = await co.rpc('admin_resolve_content_report', {
        p_report_id: r1,
        p_resolution_kind: 'dismissed',
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0001');
      const after = (await runAdminSql(
        `SELECT resolved_at, resolution_kind FROM public.content_reports WHERE id = '${r1}';`,
      )) as { resolved_at: string; resolution_kind: string }[];
      expect(after[0].resolved_at).toBe(before[0].resolved_at);
      expect(after[0].resolution_kind).toBe('actioned');
      const audit = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.admin_audit_log
          WHERE action = 'moderation.report_resolved' AND target = '${r1}';`,
      )) as { n: number }[];
      expect(audit[0].n).toBe(1);
    });

    it('S3d: an unknown resolution kind refuses 22023 writing nothing', async () => {
      const co = await asUser(operator);
      const { error } = await co.rpc('admin_resolve_content_report', {
        p_report_id: r3,
        p_resolution_kind: 'obliterated',
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('22023');
      const rows = (await runAdminSql(
        `SELECT status FROM public.content_reports WHERE id = '${r3}';`,
      )) as { status: string }[];
      expect(rows[0].status).toBe('open');
    });

    it('S3e: an unknown report id refuses P0002', async () => {
      const co = await asUser(operator);
      const { error } = await co.rpc('admin_resolve_content_report', {
        p_report_id: '00000000-0000-4000-8000-000000000000',
        p_resolution_kind: 'actioned',
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0002');
    });

    it('S3f: the resolved filter carries the outcomes; detail names the resolver', async () => {
      const co = await asUser(operator);
      const { data } = await co.rpc('admin_get_content_reports', { p_filter: 'resolved' });
      const ids = (data as ReportRow[]).map((r) => r.id);
      expect(ids).toContain(r1);
      expect(ids).toContain(r2);
      expect(ids).not.toContain(r3);
      expect(ids).not.toContain(r5);

      const { data: all } = await co.rpc('admin_get_content_reports', { p_filter: 'all' });
      const allIds = (all as ReportRow[]).map((r) => r.id);
      for (const id of [r1, r2, r3, r5]) expect(allIds).toContain(id);

      const { data: detail } = await co.rpc('admin_get_content_report_detail', {
        p_report_id: r1,
      });
      expect((detail as { resolved_by_display_name: string }).resolved_by_display_name).toContain(
        'AdmDOp',
      );
    });
  });

  // ------------------------------------------------------------------
  describe('STORY-4 — the reporter learns the outcome through the registry and the dispatcher', () => {
    it('S4a: the closure lands — registered kind, content-free payload, no note, no admin identity', async () => {
      const rows = (await runAdminSql(
        `SELECT type, title, body, payload FROM public.notifications
          WHERE recipient_group_id = '${reporter.personalGroupId}'
            AND type = 'report_resolved'
          ORDER BY created_at;`,
      )) as { type: string; title: string; body: string; payload: Record<string, unknown> }[];
      // R1 (actioned) + R2 (dismissed) both closed above.
      expect(rows).toHaveLength(2);
      const p = rows[0].payload;
      expect(Object.keys(p).sort()).toEqual(['report_id', 'resolution_kind', 'target_kind']);
      expect(p.report_id).toBe(r1);
      expect(p.resolution_kind).toBe('actioned');
      expect(rows[0].title.length).toBeGreaterThan(0);
      expect(rows[0].body.length).toBeGreaterThan(0);
      // Neither the note nor the resolver appears anywhere in the row.
      const flat = JSON.stringify(rows);
      expect(flat).not.toContain(`AdmD note ${runTag}`);
      expect(flat).not.toContain('AdmDOp');
    });

    it('S4b: report_resolved is a REGISTERED kind under the platform category', async () => {
      const rows = (await runAdminSql(
        `SELECT kind, category_key FROM public.notification_kinds WHERE kind = 'report_resolved';`,
      )) as { kind: string; category_key: string }[];
      expect(rows).toHaveLength(1);
      expect(rows[0].category_key).toBe('platform');
    });

    it('S4c: a muted platform category suppresses the closure via the N-D dispatcher — the resolve itself is unaffected', async () => {
      const cr = await asUser(reporter);
      const { error: muteErr } = await cr.rpc('set_own_notification_preference', {
        p_category_key: 'platform',
        p_channel: CHANNEL_IN_APP,
        p_allowed: false,
      });
      expect(muteErr).toBeNull();

      const before = await closureCount(reporter.personalGroupId);
      const co = await asUser(operator);
      const { error } = await co.rpc('admin_resolve_content_report', {
        p_report_id: r3,
        p_resolution_kind: 'actioned',
      });
      expect(error).toBeNull();
      expect(await closureCount(reporter.personalGroupId)).toBe(before);

      const { error: unmuteErr } = await cr.rpc('set_own_notification_preference', {
        p_category_key: 'platform',
        p_channel: CHANNEL_IN_APP,
        p_allowed: true,
      });
      expect(unmuteErr).toBeNull();
    });

    it('S4d: an erased reporter takes their report with them — the CASCADE covers the new columns', async () => {
      // Test FIMs are consented; hard delete needs the trigger's sanctioned
      // controlled-teardown path first (the ADM-C lesson).
      await runAdminSql(
        `SELECT set_config('app.consent_erasure_in_progress', 'true', true);
         DELETE FROM public.consent_records WHERE user_id = '${erased.user.id}';`,
      );
      const co = await asUser(operator);
      const { error: delErr } = await co.rpc('admin_hard_delete_user', {
        target_user_id: erased.user.id,
      });
      expect(delErr).toBeNull();

      const rows = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.content_reports WHERE id = '${r4}';`,
      )) as { n: number }[];
      expect(rows[0].n).toBe(0);

      const { error } = await co.rpc('admin_resolve_content_report', {
        p_report_id: r4,
        p_resolution_kind: 'actioned',
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0002');
    });
  });

  // ------------------------------------------------------------------
  describe('STORY-5 — the audit read pages honestly over the open namespace', () => {
    it('S5a: keyset pages descend created_at without overlap; the cap holds', async () => {
      const co = await asUser(operator);
      const { data: page1, error } = await co.rpc('admin_get_audit_log', { p_limit: 2 });
      expect(error).toBeNull();
      const rows1 = page1 as AuditRow[];
      expect(rows1).toHaveLength(2);
      expect(new Date(rows1[0].created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(rows1[1].created_at).getTime(),
      );

      const { data: page2 } = await co.rpc('admin_get_audit_log', {
        p_limit: 2,
        p_before: rows1[1].created_at,
      });
      const rows2 = page2 as AuditRow[];
      expect(rows2.length).toBeGreaterThan(0);
      const ids1 = rows1.map((r) => r.id);
      for (const r of rows2) {
        expect(ids1).not.toContain(r.id);
        expect(new Date(r.created_at).getTime()).toBeLessThan(
          new Date(rows1[1].created_at).getTime(),
        );
      }

      const total = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.admin_audit_log;`,
      )) as { n: number }[];
      const { data: capped } = await co.rpc('admin_get_audit_log', { p_limit: 500 });
      expect((capped as AuditRow[]).length).toBe(Math.min(200, total[0].n));
    });

    it('S5b: a prefix narrows over the open namespace; the moderation row renders its actor', async () => {
      const co = await asUser(operator);
      const { data, error } = await co.rpc('admin_get_audit_log', {
        p_action_prefix: 'moderation.',
        p_limit: 200,
      });
      expect(error).toBeNull();
      const rows = data as AuditRow[];
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) expect(r.action.startsWith('moderation.')).toBe(true);
      const ours = rows.find((r) => r.target === r1);
      expect(ours).toBeDefined();
      expect(ours!.action).toBe('moderation.report_resolved');
      expect(ours!.actor_display_name).toContain('AdmDOp');
    });

    it('S5c: an unmatched prefix returns empty, honestly', async () => {
      const co = await asUser(operator);
      const { data, error } = await co.rpc('admin_get_audit_log', {
        p_action_prefix: 'zz-no-such-family.',
      });
      expect(error).toBeNull();
      expect(data as AuditRow[]).toEqual([]);
    });

    it('S5d: every row carries the display key; a null actor renders null-safe', async () => {
      const co = await asUser(operator);
      const { data } = await co.rpc('admin_get_audit_log', { p_limit: 200 });
      const rows = data as AuditRow[];
      for (const r of rows) {
        expect(Object.keys(r)).toEqual(
          expect.arrayContaining([
            'id',
            'actor_group_id',
            'actor_display_name',
            'action',
            'target',
            'metadata',
            'created_at',
          ]),
        );
      }
      // The PC019 signup rows are pre-session null-actor rows; if one is in
      // range it must render with a null display name, never break the read.
      const nullActor = rows.find((r) => r.actor_group_id === null);
      if (nullActor) expect(nullActor.actor_display_name).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  describe('STORY-6 — the client write door closes', () => {
    it('S6a: audit_log_insert_admin is gone; the SELECT policy runs is_platform_admin()', async () => {
      const rows = (await runAdminSql(
        `SELECT polname, pg_get_expr(polqual, polrelid) AS qual,
                pg_get_expr(polwithcheck, polrelid) AS withcheck, polcmd
           FROM pg_policy WHERE polrelid = 'public.admin_audit_log'::regclass;`,
      )) as { polname: string; qual: string | null; withcheck: string | null; polcmd: string }[];
      // The client INSERT door is gone (walk finding 3 — the ADR-U038 hole).
      expect(rows.filter((r) => r.polcmd === 'a')).toEqual([]);
      // The read license is the PG17-safe admin shape (walk finding 4).
      const select = rows.find((r) => r.polcmd === 'r');
      expect(select).toBeDefined();
      expect(select!.qual).toContain('is_platform_admin');
      expect(select!.qual).not.toContain('has_permission');
    });

    it('S6b: an admin-authenticated direct INSERT refuses — contracts are the only door', async () => {
      const co = await asUser(operator);
      const { error } = await co.from('admin_audit_log').insert({
        actor_group_id: operator.personalGroupId,
        action: 'forged.test',
        target: 'forged',
        metadata: {},
      });
      expect(error).not.toBeNull();
      expect(`${error!.code} ${error!.message}`).toMatch(/42501|row-level security/i);
    });

    it('[LABELLED GREEN — the PC020 S5b invariant, re-pinned across the re-issue] S6c: append-only holds — no UPDATE/DELETE policies', async () => {
      const rows = (await runAdminSql(
        `SELECT polcmd FROM pg_policy WHERE polrelid = 'public.admin_audit_log'::regclass;`,
      )) as { polcmd: string }[];
      expect(rows.filter((r) => r.polcmd === 'w' || r.polcmd === 'd')).toEqual([]);
    });
  });

  // ------------------------------------------------------------------
  describe('STORY-7 — AB-4 executed end-to-end (ADR-U052 §6)', () => {
    it('S7a: the export gains the audit_trail own-actor section; schema_version reads 2', async () => {
      const cr = await asUser(reporter);
      const { data, error } = await cr.rpc('get_own_data_export');
      expect(error).toBeNull();
      const doc = data as {
        schema_version: number;
        audit_trail: { action: string; actor_group_id?: string }[];
      };
      expect(doc.schema_version).toBe(2);
      expect(Array.isArray(doc.audit_trail)).toBe(true);
      // The call's own fresh data_export row is an own-actor row — it appears.
      expect(doc.audit_trail.some((r) => r.action === 'data_export')).toBe(true);
    });

    it('S7b: resolved own reports export the outcome, never the resolver or the note', async () => {
      const cr = await asUser(reporter);
      const { data } = await cr.rpc('get_own_data_export');
      const doc = data as {
        communication: { reports_submitted: Record<string, unknown>[] };
      };
      const mine = doc.communication.reports_submitted.find((r) => r.id === r1);
      expect(mine).toBeDefined();
      expect(mine!.resolution_kind).toBe('actioned');
      expect(mine!.resolved_at).toBeTruthy();
      expect('resolved_by_group_id' in mine!).toBe(false);
      expect('resolution_note' in mine!).toBe(false);
    });

    it('S7c: rows where the member is only the TARGET of admin action stay out of their trail', async () => {
      const co = await asUser(operator);
      const { error: suspendErr } = await co.rpc('admin_update_user_status', {
        target_user_id: author.user.id,
        new_is_active: false,
      });
      expect(suspendErr).toBeNull();
      const { error: reactivateErr } = await co.rpc('admin_update_user_status', {
        target_user_id: author.user.id,
        new_is_active: true,
      });
      expect(reactivateErr).toBeNull();

      const ca = await asUser(author);
      const { data } = await ca.rpc('get_own_data_export');
      const doc = data as { audit_trail: { action: string }[] };
      expect(doc.audit_trail.some((r) => r.action === 'member.suspend')).toBe(false);
      expect(doc.audit_trail.some((r) => r.action === 'member.reactivate')).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  describe('STORY-8 — producer-driven catalog proof', () => {
    it('S8a: moderation.* joins the catalog only via the contract', async () => {
      const rows = (await runAdminSql(
        `SELECT DISTINCT action FROM public.admin_audit_log
          WHERE action LIKE 'moderation.%' ORDER BY action;`,
      )) as { action: string }[];
      expect(rows.map((r) => r.action)).toEqual(['moderation.report_resolved']);
      const actors = (await runAdminSql(
        `SELECT count(*)::int AS n FROM public.admin_audit_log
          WHERE action LIKE 'moderation.%' AND actor_group_id IS NULL;`,
      )) as { n: number }[];
      expect(actors[0].n).toBe(0);
    });

    it('[LABELLED GREEN — regression guard] S8b: the dispatcher and the hint still stand on notifications', async () => {
      const rows = (await runAdminSql(
        `SELECT pg_get_triggerdef(t.oid) AS def
           FROM pg_trigger t
          WHERE t.tgrelid = 'public.notifications'::regclass
            AND NOT t.tgisinternal;`,
      )) as { def: string }[];
      expect(rows.some((r) => r.def.includes('BEFORE INSERT'))).toBe(true);
      expect(rows.some((r) => r.def.includes('AFTER INSERT'))).toBe(true);
    });
  });
});
