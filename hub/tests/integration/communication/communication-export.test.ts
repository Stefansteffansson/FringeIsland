/**
 * FEAT-PD012 — own-communication export (Cycle C-E): STORY-4/5 (+ STORY-3's
 * export sliver).
 *
 * `get_own_messages_export()` joins the composite under the `communication`
 * key (the journal/journeys merge shape); actor resolution is UNGATED
 * (`auth.uid()` direct — the composite's own precedent), which is the CB-6
 * right-of-access posture: suspended members export. The same cycle repairs
 * the walks-section 42501 asymmetry at source (FEAT-PC008 §155).
 *
 * Red-first (authored 2026-07-21, pre-migration). Expected red classes:
 * `communication` key absent from the composite (assertion failures on
 * undefined), and the suspended-member composite call throwing the standing
 * 42501 (the PC008 §155 asymmetry, demonstrated).
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

jest.setTimeout(120_000);

interface CommunicationExport {
  messages: Array<Record<string, unknown>>;
  conversation_participations: Array<Record<string, unknown>>;
  forum_posts: Array<Record<string, unknown>>;
  reports_submitted: Array<Record<string, unknown>>;
}
type DocWithComm = DataExport & { communication?: CommunicationExport };

describe('FEAT-PD012 — own-communication export, CB-6 posture (C-E)', () => {
  const admin = createAdminClient();
  const runTag = Date.now().toString(36);

  // Distinctive strings — the own-data wall is asserted on these.
  const E_DM_LINE = `E-dm-line-${runTag}`;
  const P_DM_LINE = `P-dm-line-${runTag}`;
  const E_CONV_LINE = `E-conv-line-${runTag}`;
  const E_POST_KEPT = `E-post-kept-${runTag}`;
  const E_POST_GONE = `E-post-gone-${runTag}`;
  const P_REPORTED_POST = `P-reported-${runTag}`;
  const S_DM_LINE = `S-dm-line-${runTag}`;

  let exporterE: TestUser;
  let partnerP: TestUser;
  let freshF: TestUser;
  let suspendedS: TestUser;
  let ge: string; // E's group (closed before the export assertions — STORY-3)
  let convGe: string;
  let dmEP: string;
  let dmES: string;

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const grantMember = async (groupId: string, owner: TestUser, u: TestUser) => {
    await runAdminSql(`
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${u.personalGroupId}', gr.group_id, gr.id, '${owner.personalGroupId}'
        FROM public.group_roles gr
       WHERE gr.group_id = '${groupId}'
         AND (gr.created_from_role_template_id =
                (SELECT id FROM public.role_templates WHERE name = 'Member Role Template')
              OR gr.name = 'Member')
       LIMIT 1
      ON CONFLICT DO NOTHING;`);
  };

  const adminDepart = async (groupId: string, u: TestUser) => {
    await runAdminSql(`
      DO $$ BEGIN
        PERFORM set_config('app.hard_delete_in_progress', 'true', true);
        DELETE FROM public.user_group_roles
         WHERE group_id = '${groupId}' AND member_group_id = '${u.personalGroupId}';
        DELETE FROM public.group_memberships
         WHERE group_id = '${groupId}' AND member_group_id = '${u.personalGroupId}';
      END $$;`);
  };

  beforeAll(async () => {
    [exporterE, partnerP, freshF, suspendedS] = await Promise.all([
      createTestUser({ displayName: `CEx E ${runTag}` }),
      createTestUser({ displayName: `CEx P ${runTag}` }),
      createTestUser({ displayName: `CEx F ${runTag}` }),
      createTestUser({ displayName: `CEx S ${runTag}` }),
    ]);

    // Group GE: E steward, P member; forum posts by E (kept + self-deleted) and
    // the reported post by P; a group conversation both speak in.
    const ce = await asUser(exporterE);
    const { data: gid, error: gErr } = await ce.rpc('create_engagement_group', {
      p_name: `CEx Group ${runTag}`,
    });
    expect(gErr).toBeNull();
    ge = gid as string;
    await admin.from('groups').update({ is_public: false }).eq('id', ge);
    const { error: mErr } = await admin.from('group_memberships').insert({
      group_id: ge,
      member_group_id: partnerP.personalGroupId,
      status: 'active',
      added_by_group_id: exporterE.personalGroupId,
    });
    expect(mErr).toBeNull();
    await grantMember(ge, exporterE, partnerP);

    const cp = await asUser(partnerP);

    // Forum: E's kept + tombstoned posts; P's post that E reports.
    expect(
      (await ce.rpc('create_forum_post', { p_group_id: ge, p_content: E_POST_KEPT })).error,
    ).toBeNull();
    const { data: gone, error: goneErr } = await ce.rpc('create_forum_post', {
      p_group_id: ge,
      p_content: E_POST_GONE,
    });
    expect(goneErr).toBeNull();
    expect(
      (await ce.rpc('delete_own_forum_post', { p_post_id: (gone as { id: string }).id })).error,
    ).toBeNull();
    const { data: reported, error: repErr } = await cp.rpc('create_forum_post', {
      p_group_id: ge,
      p_content: P_REPORTED_POST,
    });
    expect(repErr).toBeNull();
    expect(
      (
        await ce.rpc('submit_content_report', {
          p_target_kind: 'forum_post',
          p_target_id: (reported as { id: string }).id,
          p_reason: 'harmful',
          p_details: 'C-E export fixture',
        })
      ).error,
    ).toBeNull();

    // Group conversation: E creates, P joins, both speak.
    const { data: cv, error: cvErr } = await ce.rpc('create_group_conversation', {
      p_group_id: ge,
      p_title: `CEx conv ${runTag}`,
    });
    expect(cvErr).toBeNull();
    convGe = cv as string;
    expect((await cp.rpc('join_group_conversation', { p_conversation_id: convGe })).error).toBeNull();
    expect(
      (await ce.rpc('send_message', { p_conversation_id: convGe, p_content: E_CONV_LINE })).error,
    ).toBeNull();

    // DMs: E↔P (both speak), E↔S (both speak).
    const { data: dm1 } = await ce.rpc('get_or_create_dm_conversation', {
      p_other_group_id: partnerP.personalGroupId,
    });
    dmEP = dm1 as string;
    expect(
      (await ce.rpc('send_message', { p_conversation_id: dmEP, p_content: E_DM_LINE })).error,
    ).toBeNull();
    expect(
      (await cp.rpc('send_message', { p_conversation_id: dmEP, p_content: P_DM_LINE })).error,
    ).toBeNull();

    const cs = await asUser(suspendedS);
    const { data: dm2 } = await cs.rpc('get_or_create_dm_conversation', {
      p_other_group_id: exporterE.personalGroupId,
    });
    dmES = dm2 as string;
    expect(
      (await cs.rpc('send_message', { p_conversation_id: dmES, p_content: S_DM_LINE })).error,
    ).toBeNull();

    // STORY-3's export sliver rides a *closed* group: P departs, E closes GE.
    await adminDepart(ge, partnerP);
    const { error: closeErr } = await ce.rpc('close_group', { p_group_id: ge });
    expect(closeErr).toBeNull();

    // Suspend S — the admin hold (IDN-9 semantics), not an exit.
    const { error: susErr } = await admin
      .from('users')
      .update({ is_active: false })
      .eq('auth_user_id', suspendedS.user.id);
    expect(susErr).toBeNull();
  });

  afterAll(async () => {
    // Reactivate S so cleanup helpers run against an active account.
    await admin.from('users').update({ is_active: true }).eq('auth_user_id', suspendedS.user.id);
    if (ge) await cleanupTestGroup(ge);
    for (const u of [exporterE, partnerP, freshF, suspendedS].filter(Boolean)) {
      await cleanupTestUser(u.user.id);
    }
  });

  // -------------------------------------------------------------------------
  describe('STORY-4 — my communication is in my export, reports included', () => {
    it('the composite carries communication.{messages, conversation_participations, forum_posts, reports_submitted}', async () => {
      const ce = await asUser(exporterE);
      const doc = (await fetchOwnDataExport(ce)) as DocWithComm;
      expect(doc.communication).toBeDefined();
      const comm = doc.communication!;
      expect(Array.isArray(comm.messages)).toBe(true);
      expect(Array.isArray(comm.conversation_participations)).toBe(true);
      expect(Array.isArray(comm.forum_posts)).toBe(true);
      expect(Array.isArray(comm.reports_submitted)).toBe(true);

      const commText = JSON.stringify(comm);
      // Own messages present — DM and group-conversation lines both.
      expect(commText).toContain(E_DM_LINE);
      expect(commText).toContain(E_CONV_LINE);
      // Participations reference both conversations.
      expect(commText).toContain(dmEP);
      expect(commText).toContain(convGe);
      // Forum posts: kept AND tombstoned, with the flag honest (STORY-3 sliver:
      // these live in a *closed* group and still export).
      expect(commText).toContain(E_POST_KEPT);
      expect(commText).toContain(E_POST_GONE);
      const tombstoned = comm.forum_posts.find(
        (p) => typeof p.content === 'string' && (p.content as string).includes(E_POST_GONE),
      );
      expect(tombstoned).toBeDefined();
      expect(tombstoned!.is_deleted).toBe(true);
      // The report: reason + snapshot of what was reported, at report time.
      const report = comm.reports_submitted[0];
      expect(report).toBeDefined();
      expect(report.reason).toBe('harmful');
      expect(String(report.content_snapshot)).toContain(P_REPORTED_POST);
    });

    it('the own-data wall holds — no other participant’s message body appears anywhere in my document', async () => {
      const ce = await asUser(exporterE);
      const doc = (await fetchOwnDataExport(ce)) as DocWithComm;
      const text = JSON.stringify(doc);
      expect(text).not.toContain(P_DM_LINE); // P's DM line is P's data
      expect(text).not.toContain(S_DM_LINE); // S's DM line is S's data
    });

    it('a member with no communication activity gets a present, empty-shaped communication section', async () => {
      const cf = await asUser(freshF);
      const doc = (await fetchOwnDataExport(cf)) as DocWithComm;
      expect(doc.communication).toBeDefined();
      const comm = doc.communication!;
      expect(comm.messages).toEqual([]);
      expect(comm.conversation_participations).toEqual([]);
      expect(comm.forum_posts).toEqual([]);
      expect(comm.reports_submitted).toEqual([]);
    });

    it('W12 — get_own_messages_export as a direct RPC serves only the caller’s own rows', async () => {
      const cp = await asUser(partnerP);
      const { data, error } = await cp.rpc('get_own_messages_export');
      expect(error).toBeNull();
      const text = JSON.stringify(data);
      expect(text).toContain(P_DM_LINE); // P's own line present
      expect(text).not.toContain(E_DM_LINE); // E's line is E's data
      expect(text).not.toContain(E_POST_KEPT); // E's forum content is E's data
    });
  });

  // -------------------------------------------------------------------------
  describe('STORY-5 — a suspended member’s export works (CB-6; PC008 §155 dies here)', () => {
    it('the full composite returns for a suspended member — no 42501 from any section', async () => {
      const cs = await asUser(suspendedS);
      // Red today: the walks section resolves its actor through the
      // is_active-gated helper and the whole composite throws 42501.
      const doc = (await fetchOwnDataExport(cs)) as DocWithComm;
      expect(doc.subject).toBeDefined();
      expect(doc.account_state).toBeDefined();
      expect((doc.account_state as { is_active?: boolean }).is_active).toBe(false);
      expect(doc.journeys).toBeDefined(); // the repaired walks section answered
      expect(doc.communication).toBeDefined();
      expect(JSON.stringify(doc.communication)).toContain(S_DM_LINE);
    });
  });
});
