import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import {
  createAdminClient,
  SESSION_EMAIL,
  E2E_PASSWORD,
  deleteE2EUser,
  markArrivedOnce,
  runAdminSql,
} from './helpers/auth';

/**
 * FEAT-PD012 — lifecycle seal & communication export (journey verification
 * through the EXISTING Hub surfaces — the cycle is surface-neutral, no new UI).
 *
 * JOURNEY VERIFICATION — not red-first. The red-first proof lives at the
 * contract tier (FEAT-PD012's 14-red flip). Here we prove the lived endings:
 *  - a group closes; its conversation goes quiet and leaves the member's
 *    Messages inbox — while the DM between the same people survives untouched;
 *  - the account export download carries the communication record: messages,
 *    forum posts, participations, and the report the member filed.
 *
 * Fresh logins for both contexts (the C-C shared-storageState lesson); no
 * signOut() anywhere (GLOBAL scope — the C-C fleet trap); RPC-provisioned
 * self-sufficient fixtures; run-unique single-token names; serial.
 */

const RUN = Date.now();
const PARTNER_EMAIL = `e2e-ce-partner-${RUN}@fringeisland.test`;
const SEAL_GROUP = `CESealGroup${RUN}`;
const EXPORT_GROUP = `CEExportGroup${RUN}`;
const CONV_TITLE = `CESealThread${RUN}`;
const DM_LINE = `CEDmLine${RUN}`;
const MY_POST = `CEOwnPost${RUN}`;
const PARTNER_POST = `CEPartnerPost${RUN}`;

const createdGroupIds: string[] = [];

async function loginAs(context: BrowserContext, email: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(E2E_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
  return page;
}

/** Throwaway authenticated client (persistSession:false, NEVER signOut —
 *  the C-C fleet trap). */
async function clientAs(email: string): Promise<SupabaseClient> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await client.auth.signInWithPassword({
    email,
    password: E2E_PASSWORD,
  });
  if (error) throw new Error(`clientAs(${email}): ${error.message}`);
  return client;
}

async function provisionGroup(name: string): Promise<string> {
  const client = await clientAs(SESSION_EMAIL);
  const { data: groupId, error } = await client.rpc('create_engagement_group', {
    p_name: name,
  });
  if (error) throw new Error(`provision group: ${error.message}`);
  createdGroupIds.push(groupId as string);
  return groupId as string;
}

async function addPartnerToGroup(groupId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: partner } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('email', PARTNER_EMAIL)
    .single();
  const { data: me } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('email', SESSION_EMAIL)
    .single();

  const { error: mErr } = await admin.from('group_memberships').insert({
    group_id: groupId,
    member_group_id: partner!.personal_group_id,
    status: 'active',
    added_by_group_id: me!.personal_group_id,
  });
  if (mErr) throw new Error(`membership seed: ${mErr.message}`);

  const { data: memberTemplate } = await admin
    .from('role_templates')
    .select('id')
    .eq('name', 'Member Role Template')
    .single();
  const { data: memberRole } = await admin
    .from('group_roles')
    .select('id')
    .eq('group_id', groupId)
    .eq('created_from_role_template_id', memberTemplate!.id)
    .single();
  const { error: rErr } = await admin.from('user_group_roles').insert({
    member_group_id: partner!.personal_group_id,
    group_id: groupId,
    group_role_id: memberRole!.id,
    assigned_by_group_id: me!.personal_group_id,
  });
  if (rErr) throw new Error(`role grant: ${rErr.message}`);
}

/** The out-of-band departure the integration tier established: roles +
 *  membership deleted under the transaction-local cascade flag so the
 *  last-leader wall stands down and close_group's last-active-member
 *  authority holds for the session Steward. */
async function departPartner(groupId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: partner } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('email', PARTNER_EMAIL)
    .single();
  await runAdminSql(`
    DO $$ BEGIN
      PERFORM set_config('app.hard_delete_in_progress', 'true', true);
      DELETE FROM public.user_group_roles
       WHERE group_id = '${groupId}' AND member_group_id = '${partner!.personal_group_id}';
      DELETE FROM public.group_memberships
       WHERE group_id = '${groupId}' AND member_group_id = '${partner!.personal_group_id}';
    END $$;`);
}

test.describe('FEAT-PD012 — lifecycle seal & communication export (journey verification)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const admin = createAdminClient();
    await admin
      .from('users')
      .update({ is_active: true, is_decommissioned: false })
      .eq('email', SESSION_EMAIL);
    const { data: sess } = await admin
      .from('users')
      .select('auth_user_id')
      .eq('email', SESSION_EMAIL)
      .single();
    await markArrivedOnce(admin, sess!.auth_user_id as string);

    const { error } = await admin.auth.admin.createUser({
      email: PARTNER_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: `CEPartner${RUN}`, consent_accepted: 'true' },
    });
    if (error) throw new Error(`partner fixture: ${error.message}`);
    const { data: partner } = await admin
      .from('users')
      .select('auth_user_id')
      .eq('email', PARTNER_EMAIL)
      .single();
    await markArrivedOnce(admin, partner!.auth_user_id as string);
  });

  test.afterAll(async () => {
    const admin = createAdminClient();
    await runAdminSql(
      `DELETE FROM public.admin_audit_log WHERE action = 'data_export';`,
    );
    for (const gid of createdGroupIds) {
      await admin.from('content_reports').delete().eq('target_group_id', gid);
      await admin.from('forum_posts').delete().eq('group_id', gid);
      await admin.from('conversations').delete().eq('group_id', gid);
      await admin.from('user_group_roles').delete().eq('group_id', gid);
      await admin.from('group_memberships').delete().eq('group_id', gid);
      await admin.from('groups').delete().eq('id', gid);
    }
    await deleteE2EUser(admin, PARTNER_EMAIL);
  });

  test('a group closes; its thread goes quiet and leaves the inbox; the DM between the same people survives', async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // --- provision: group with partner, a group conversation both joined,
    //     and a DM — all via the same contracts the UI calls.
    const groupId = await provisionGroup(SEAL_GROUP);
    await addPartnerToGroup(groupId);

    const stewardClient = await clientAs(SESSION_EMAIL);
    const partnerClient = await clientAs(PARTNER_EMAIL);

    const { data: convId, error: convErr } = await stewardClient.rpc(
      'create_group_conversation',
      { p_group_id: groupId, p_title: CONV_TITLE },
    );
    if (convErr) throw new Error(`conv: ${convErr.message}`);
    const { error: joinErr } = await partnerClient.rpc('join_group_conversation', {
      p_conversation_id: convId,
    });
    if (joinErr) throw new Error(`join: ${joinErr.message}`);
    const { error: sendErr } = await partnerClient.rpc('send_message', {
      p_conversation_id: convId,
      p_content: `still here ${RUN}`,
    });
    if (sendErr) throw new Error(`send: ${sendErr.message}`);

    const { data: partnerRow } = await createAdminClient()
      .from('users')
      .select('personal_group_id')
      .eq('email', PARTNER_EMAIL)
      .single();
    const { data: dmId, error: dmErr } = await stewardClient.rpc(
      'get_or_create_dm_conversation',
      { p_other_group_id: partnerRow!.personal_group_id },
    );
    if (dmErr) throw new Error(`dm: ${dmErr.message}`);
    const { error: dmSendErr } = await stewardClient.rpc('send_message', {
      p_conversation_id: dmId,
      p_content: DM_LINE,
    });
    if (dmSendErr) throw new Error(`dm send: ${dmSendErr.message}`);

    // --- before the end: the partner's inbox lists both threads.
    const ctxB = await browser.newContext();
    const pageB = await loginAs(ctxB, PARTNER_EMAIL);
    await pageB.goto('/messages');
    await expect(pageB.getByTestId(`inbox-row-${convId}`)).toBeVisible({
      timeout: 15000,
    });
    await expect(pageB.getByTestId(`inbox-row-${dmId}`)).toBeVisible();

    // --- the ending: partner departs; the Steward (now last active member)
    //     closes the group through the UI.
    await departPartner(groupId);
    const ctxA = await browser.newContext();
    const pageA = await loginAs(ctxA, SESSION_EMAIL);
    await pageA.goto(`/groups/${groupId}`);
    await pageA.getByTestId('close-group').click();
    await pageA.getByTestId('confirm-modal-confirm').click();
    await expect(pageA).toHaveURL(/\/groups(\/)?$/, { timeout: 20000 });

    // --- the observable effect: the sealed thread is GONE from the partner's
    //     live inbox; the DM survives byte-for-byte.
    await pageB.goto('/messages');
    await expect(pageB.getByTestId(`inbox-row-${dmId}`)).toBeVisible({
      timeout: 15000,
    });
    await expect(pageB.getByTestId(`inbox-row-${convId}`)).toHaveCount(0);

    await ctxA.close();
    await ctxB.close();
  });

  test('the export download carries the communication record — messages, posts, participations, and the filed report', async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // --- provision: a group where the session FIM posts, the partner posts,
    //     and the session FIM reports the partner's post.
    const groupId = await provisionGroup(EXPORT_GROUP);
    await addPartnerToGroup(groupId);

    const me = await clientAs(SESSION_EMAIL);
    const partner = await clientAs(PARTNER_EMAIL);

    const { error: myPostErr } = await me.rpc('create_forum_post', {
      p_group_id: groupId,
      p_content: MY_POST,
    });
    if (myPostErr) throw new Error(`my post: ${myPostErr.message}`);
    const { data: theirPost, error: theirErr } = await partner.rpc('create_forum_post', {
      p_group_id: groupId,
      p_content: PARTNER_POST,
    });
    if (theirErr) throw new Error(`their post: ${theirErr.message}`);
    const { error: repErr } = await me.rpc('submit_content_report', {
      p_target_kind: 'forum_post',
      p_target_id: (theirPost as { id: string }).id,
      p_reason: 'harmful',
      p_details: 'C-E journey fixture',
    });
    if (repErr) throw new Error(`report: ${repErr.message}`);

    // --- the journey: /export → download → the JSON document tells the whole
    //     communication story.
    const ctx = await browser.newContext();
    const page = await loginAs(ctx, SESSION_EMAIL);
    await page.goto('/export');
    await expect(page.getByRole('heading', { name: /download my data/i })).toBeVisible({
      timeout: 15000,
    });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download my data/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('fringeisland-data-export.json');

    const doc = JSON.parse(await readFile((await download.path())!, 'utf8')) as {
      communication?: {
        messages: unknown[];
        conversation_participations: unknown[];
        forum_posts: Array<{ content: string }>;
        reports_submitted: Array<{ content_snapshot: string | null; reason: string }>;
      };
    };
    expect(doc.communication).toBeDefined();
    const comm = doc.communication!;
    expect(Array.isArray(comm.messages)).toBe(true);
    expect(Array.isArray(comm.conversation_participations)).toBe(true);
    // Own forum voice present; the DM line from journey 1's fixture rides too
    // when both journeys run (serial), but the assertion stands standalone.
    expect(comm.forum_posts.some((p) => p.content === MY_POST)).toBe(true);
    expect(comm.forum_posts.some((p) => p.content === PARTNER_POST)).toBe(false);
    // The filed report, snapshot honest.
    expect(
      comm.reports_submitted.some(
        (r) => r.reason === 'harmful' && (r.content_snapshot ?? '').includes(PARTNER_POST),
      ),
    ).toBe(true);

    await ctx.close();
  });
});
