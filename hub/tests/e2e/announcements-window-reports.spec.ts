import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  createAdminClient,
  SESSION_EMAIL,
  E2E_PASSWORD,
  deleteE2EUser,
  markArrivedOnce,
  runAdminSql,
} from './helpers/auth';

/**
 * FEAT-H028 — announcements, the edit window & reporting (COM-8/9/12/13) E2E.
 *
 * JOURNEY VERIFICATION — not red-first. The red-first proof lives at the
 * contract tier (FEAT-PD011's 24-red flip) and the unit tier (the CD surface
 * suites). Here we prove the lived journeys:
 *  - a Steward says it once and a member reads it on the group page (and a
 *    retract takes it back);
 *  - a platform announcement reaches a plain member's /groups landing;
 *  - an author gets fifteen minutes: edit (with the honest "(edited)" mark)
 *    and self-delete (tombstone in place, via the EXISTING moderation-hint
 *    channel — no new realtime);
 *  - a report lands, and reporting twice reads as "already reported".
 *
 * Fresh logins for BOTH contexts (the C-C shared-storageState lesson —
 * bridge 2026-07-20_04 finding 1). Run-unique single-token fixture names.
 * Serial against the shared dev DB; admin cleanup either side.
 */

const RUN = Date.now();
const PARTNER_EMAIL = `e2e-cd-partner-${RUN}@fringeisland.test`;
const GROUP_NAME = `CDGroup${RUN}`;
const ANN_TITLE = `CDTitle${RUN}`;
const ANN_BODY = `The village meets at dusk ${RUN}.`;
const PLATFORM_TITLE = `CDPlat${RUN}`;
const EDIT_THREAD = `CDEditable${RUN}`;
const EDIT_THREAD_2 = `CDEdited${RUN}`;
const DELETE_THREAD = `CDDeletable${RUN}`;
const REPORT_THREAD = `CDReportable${RUN}`;

const createdGroupIds: string[] = [];
let platformAnnouncementId: string | null = null;

async function loginAs(context: BrowserContext, email: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(E2E_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
  return page;
}

/** Provision a group for the session FIM WITHOUT the UI — an authenticated
 *  supabase-js client calling the same contract the UI calls. Keeps every
 *  test self-sufficient (green standalone AND under fleet ordering — the
 *  /groups/undefined empty-module-state cascade caught at first run). */
async function provisionGroup(name: string): Promise<string> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error: signInErr } = await client.auth.signInWithPassword({
    email: SESSION_EMAIL,
    password: E2E_PASSWORD,
  });
  if (signInErr) throw new Error(`provision sign-in: ${signInErr.message}`);
  const { data: groupId, error } = await client.rpc('create_engagement_group', {
    p_name: name,
  });
  // NO signOut: supabase-js signOut() is GLOBAL scope — it would revoke the
  // shared storageState session server-side and poison every downstream spec
  // (the C-C fleet trap). The client is throwaway (persistSession: false).
  if (error) throw new Error(`provision group: ${error.message}`);
  createdGroupIds.push(groupId as string);
  return groupId as string;
}

/** B admin-seeded active WITH the Member role (direct membership inserts skip
 *  the invited->active auto-assign trigger — the realtime.spec precedent). */
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

/** Test 1's journey keeps UI creation (creating the group IS part of the
 *  Steward's walk); partner seeding shared with the self-sufficient tests. */
async function seedGroupWithPartner(pageA: Page): Promise<string> {
  await pageA.goto('/groups');
  await pageA.getByRole('button', { name: /create group/i }).click();
  await pageA.getByLabel(/group name/i).fill(GROUP_NAME);
  await pageA.getByRole('button', { name: /^create$/i }).click();
  await expect(pageA).toHaveURL(/\/groups\/[0-9a-f-]{36}/, { timeout: 15000 });
  const groupId = pageA.url().match(/\/groups\/([0-9a-f-]{36})/)![1];
  createdGroupIds.push(groupId);
  await addPartnerToGroup(groupId);
  return groupId;
}

test.describe('FEAT-H028 — announcements, edit window & reporting (journey verification)', () => {
  // Serial: tests 3/4 reuse test 1's UI-created group; a mid-file failure must
  // SKIP the rest, never cascade into a fresh worker with empty module state
  // (the /groups/undefined class caught at first run).
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
      user_metadata: { display_name: `CDPartner${RUN}`, consent_accepted: 'true' },
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
    if (platformAnnouncementId) {
      await admin.from('announcements').delete().eq('id', platformAnnouncementId);
    }
    for (const gid of createdGroupIds) {
      await admin.from('content_reports').delete().eq('target_group_id', gid);
      await admin.from('announcements').delete().eq('scope_group_id', gid);
      await admin.from('forum_posts').delete().eq('group_id', gid);
      await admin.from('conversations').delete().eq('group_id', gid);
      await admin.from('user_group_roles').delete().eq('group_id', gid);
      await admin.from('group_memberships').delete().eq('group_id', gid);
      await admin.from('groups').delete().eq('id', gid);
    }
    await deleteE2EUser(admin, PARTNER_EMAIL);
  });

  test('a Steward announces once; a member reads it on the group page; retract takes it back', async ({
    browser,
  }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await loginAs(ctxA, SESSION_EMAIL);
    const groupId = await seedGroupWithPartner(pageA);

    // A (Steward — send_announcements via the template) composes in place.
    const sectionA = pageA.locator('section', { has: pageA.getByRole('heading', { name: 'Announcements' }) });
    await expect(sectionA).toBeVisible();
    await pageA.getByLabel('Announcement title').fill(ANN_TITLE);
    await pageA.getByLabel('Announcement body').fill(ANN_BODY);
    await pageA.getByRole('button', { name: 'Announce' }).click();
    await expect(pageA.getByText(ANN_TITLE)).toBeVisible({ timeout: 10000 });

    // B (Member role — no grant) reads it read-time, sees NO compose/retract.
    const pageB = await loginAs(ctxB, PARTNER_EMAIL);
    await pageB.goto(`/groups/${groupId}`);
    await expect(pageB.getByText(ANN_TITLE)).toBeVisible({ timeout: 15000 });
    await expect(pageB.getByText(ANN_BODY)).toBeVisible();
    await expect(pageB.getByLabel('Announcement title')).toHaveCount(0);
    await expect(pageB.getByRole('button', { name: 'Retract' })).toHaveCount(0);

    // A retracts behind ConfirmModal; B's fresh read no longer holds it.
    await pageA.getByRole('button', { name: 'Retract' }).first().click();
    await pageA.getByRole('button', { name: /^Retract$/ }).last().click();
    await expect(pageA.getByText(ANN_TITLE)).toHaveCount(0, { timeout: 10000 });
    await pageB.reload();
    await expect(pageB.getByRole('heading', { name: 'Announcements' })).toBeVisible({
      timeout: 15000,
    });
    await expect(pageB.getByText(ANN_TITLE)).toHaveCount(0);

    await ctxA.close();
    await ctxB.close();
  });

  test('a platform announcement reaches a plain member on /groups', async ({ browser }) => {
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from('announcements')
      .insert({
        scope_kind: 'platform',
        scope_group_id: null,
        author_group_id: null, // author resolution folds to 'Unknown' — display-only
        title: PLATFORM_TITLE,
        body: 'One word for the whole platform.',
      })
      .select('id')
      .single();
    if (error) throw new Error(`platform announcement seed: ${error.message}`);
    platformAnnouncementId = row!.id as string;

    const ctxB = await browser.newContext();
    const pageB = await loginAs(ctxB, PARTNER_EMAIL);
    await pageB.goto('/groups');
    await expect(pageB.getByRole('heading', { name: 'Platform announcements' })).toBeVisible({
      timeout: 15000,
    });
    await expect(pageB.getByText(PLATFORM_TITLE)).toBeVisible();
    await ctxB.close();
  });

  test('the author edits freely: "(edited)" shows once the three-minute grace has passed, self-delete tombstones in place', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const groupId = await provisionGroup(`CDGroupW${RUN}`);
    const ctxA = await browser.newContext();
    const pageA = await loginAs(ctxA, SESSION_EMAIL);
    await pageA.goto(`/groups/${groupId}`);
    const forum = pageA.getByTestId('group-forum');
    await expect(forum).toBeVisible({ timeout: 60_000 });

    // Post, then edit — no window since EDT-01; the grace governs the label only.
    await forum.getByRole('textbox', { name: 'Forum post' }).fill(EDIT_THREAD);
    await forum.getByTestId('forum-post-submit').click();
    await expect(pageA.getByText(EDIT_THREAD)).toBeVisible({ timeout: 15000 });

    // Pin the post's testid BEFORE editing: opening the editor swaps the text
    // for a textarea, so a hasText-filtered locator stops matching mid-edit
    // (the realtime.spec getAttribute precedent).
    const postId = (await pageA
      .getByTestId(/^forum-post-/)
      .filter({ hasText: EDIT_THREAD })
      .first()
      .getAttribute('data-testid'))!;
    const post = pageA.getByTestId(postId);
    // TASK-EDT-01 (2026-08-21): the fifteen-minute window is gone; "(edited)"
    // renders only when the edit lands more than three minutes after the post
    // (the silent typo-repair grace). Age the post past the grace before
    // editing — the label is the thing under test, not the wait. (This spec
    // still expected the label immediately; caught by the first full fleet run
    // after the cutover, ADR-U053, 2026-09-05.)
    await runAdminSql(
      `UPDATE public.forum_posts SET created_at = now() - interval '5 minutes' WHERE id = '${postId.replace('forum-post-', '')}'`,
    );
    await post.getByRole('button', { name: /^Edit$/ }).click();
    await post.locator('textarea').fill(EDIT_THREAD_2);
    await post.getByRole('button', { name: 'Save' }).click();
    await expect(pageA.getByText(EDIT_THREAD_2)).toBeVisible({ timeout: 15000 });
    await expect(pageA.locator('[data-testid^="forum-edited-"]').first()).toBeVisible();

    // A second post, self-deleted: the tombstone renders in place.
    await forum.getByRole('textbox', { name: 'Forum post' }).fill(DELETE_THREAD);
    await forum.getByTestId('forum-post-submit').click();
    await expect(pageA.getByText(DELETE_THREAD)).toBeVisible({ timeout: 15000 });
    const delPost = pageA.getByTestId(/^forum-post-/).filter({ hasText: DELETE_THREAD }).first();
    await delPost.getByRole('button', { name: 'Delete' }).click();
    // ADAPTED at RD-A: this was `getByRole('button', {name: /^Delete$/}).last()`
    // — page-wide, positional, and therefore hostage to how many other things
    // on the group page happen to render a button labelled "Delete". RD-A
    // opened the roles-panel remove affordance for template-derived roles, so
    // the page gained four, and `.last()` started resolving to one of them
    // behind the modal backdrop. Scoped to the modal's own confirm control,
    // which is what the step always meant.
    await pageA.getByTestId('confirm-modal-confirm').click();
    await expect(pageA.getByText(DELETE_THREAD)).toHaveCount(0, { timeout: 15000 });
    await expect(pageA.locator('[data-testid^="forum-tombstone-"]').first()).toBeVisible();

    await ctxA.close();
  });

  test('a member reports another\'s post; reporting twice reads as already reported', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const groupId = await provisionGroup(`CDGroupR${RUN}`);
    await addPartnerToGroup(groupId);
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await loginAs(ctxA, SESSION_EMAIL);
    await pageA.goto(`/groups/${groupId}`);
    const forumA = pageA.getByTestId('group-forum');
    await expect(forumA).toBeVisible({ timeout: 60_000 });
    await forumA.getByRole('textbox', { name: 'Forum post' }).fill(REPORT_THREAD);
    await forumA.getByTestId('forum-post-submit').click();
    await expect(pageA.getByText(REPORT_THREAD)).toBeVisible({ timeout: 15000 });

    const pageB = await loginAs(ctxB, PARTNER_EMAIL);
    await pageB.goto(`/groups/${groupId}`);
    await expect(pageB.getByTestId('group-forum')).toBeVisible({ timeout: 60_000 });
    await expect(pageB.getByText(REPORT_THREAD)).toBeVisible({ timeout: 15000 });

    const target = pageB.getByTestId(/^forum-post-/).filter({ hasText: REPORT_THREAD }).first();
    await target.getByRole('button', { name: /^Report$/ }).click();
    const dialog = pageB.getByRole('dialog', { name: 'Report content' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/reason/i).fill('harmful content');
    await dialog.getByTestId('report-submit').click();
    await expect(pageB.getByText(/report submitted/i)).toBeVisible({ timeout: 10000 });

    // The affordance now reads as already-reported (idempotent).
    await expect(target.getByRole('button', { name: /^Reported$/ })).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });
});
