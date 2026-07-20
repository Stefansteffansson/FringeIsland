import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import {
  createAdminClient,
  SESSION_EMAIL,
  E2E_PASSWORD,
  deleteE2EUser,
  markArrivedOnce,
} from './helpers/auth';

/**
 * FEAT-H027 — live messages, forum & badge (COM-10 / COM-11) E2E: the ADR-U039
 * hint layer proven end-to-end across TWO browser contexts.
 *
 * JOURNEY VERIFICATION — not red-first. The red-first proof for this behaviour
 * lives at the contract tier (FEAT-PD010, the 9-red flip) and the unit tier
 * (the CC-03/04/05/06 per-suite reds). Here we prove the lived journey: a member
 * sees another member's activity WITHOUT navigating or reloading.
 *
 * DETERMINISM (ADR-U039 rule 6): after the actor acts, we `bringToFront` the
 * observer so BOTH reconciliation paths arm on purpose — the realtime hint
 * carries the immediacy, and the visibility/focus fallback carries the
 * guarantee. So the observable assertion holds even if a single hint is
 * dropped. Observer changes are effects only — never an observer navigation,
 * reload, or click that would fetch the truth by itself.
 *
 * Fixture hygiene: run-unique names; `markArrivedOnce` for both fixture FIMs;
 * admin cleanup either side. Serial suite (workers:1) against the shared dev DB.
 */

const RUN = Date.now();
const PARTNER_EMAIL = `e2e-cc-partner-${RUN}@fringeisland.test`;
const GROUP_NAME = `CC Realtime G ${RUN}`;
const DM_TEXT = `Live DM across the mist ${RUN}`;
const DM_TEXT_2 = `And a second live line ${RUN}`;
const DRAFT_TEXT = `a half-written post ${RUN}`;
const THREAD_TEXT = `Live forum thread ${RUN}`;

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

/**
 * The session FIM (A) creates a group via the UI, then B is admin-seeded as an
 * active member WITH the group's Member role — a direct membership insert does
 * NOT fire the invited->active auto-assign trigger, so the role (which carries
 * `post_forum_messages`, needed for B's forum composer/draft) is granted here.
 */
async function seedGroupWithPartner(
  pageA: Page,
): Promise<{ groupId: string; partnerGroupId: string }> {
  const admin = createAdminClient();

  await pageA.goto('/groups');
  await pageA.getByRole('button', { name: /create group/i }).click();
  await pageA.getByLabel(/group name/i).fill(GROUP_NAME);
  await pageA.getByRole('button', { name: /^create$/i }).click();
  await expect(pageA).toHaveURL(/\/groups\/[0-9a-f-]{36}/, { timeout: 15000 });
  const groupId = pageA.url().match(/\/groups\/([0-9a-f-]{36})/)![1];
  createdGroupIds.push(groupId);

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
  const partnerGroupId = partner!.personal_group_id as string;

  const { error: mErr } = await admin.from('group_memberships').insert({
    group_id: groupId,
    member_group_id: partnerGroupId,
    status: 'active',
    added_by_group_id: me!.personal_group_id,
  });
  if (mErr) throw new Error(`membership seed: ${mErr.message}`);

  // A v2-created group (create_engagement_group) names its role instances
  // verbatim after the templates ('Member Role Template'), so resolve the
  // Member role by the created_from_role_template_id linkage — the same key the
  // PC012 auto-assign-on-accept trigger uses, not the legacy short name.
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
    member_group_id: partnerGroupId,
    group_id: groupId,
    group_role_id: memberRole!.id,
    assigned_by_group_id: me!.personal_group_id,
  });
  if (rErr) throw new Error(`role grant: ${rErr.message}`);

  return { groupId, partnerGroupId };
}

test.describe('FEAT-H027 — live messages, forum & badge (journey verification)', () => {
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
      user_metadata: { display_name: `CCPartner${RUN}`, consent_accepted: 'true' },
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
    for (const gid of createdGroupIds) {
      await admin.from('forum_posts').delete().eq('group_id', gid);
      await admin.from('conversations').delete().eq('group_id', gid);
      await admin.from('user_group_roles').delete().eq('group_id', gid);
      await admin.from('group_memberships').delete().eq('group_id', gid);
      await admin.from('groups').delete().eq('id', gid);
    }
    await deleteE2EUser(admin, PARTNER_EMAIL);
  });

  test('live DM: B’s inbox rises + badge moves, then B’s open conversation stays current — no B navigation', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    // A is a FRESH login, NOT the shared storageState — an earlier spec's global
    // sign-out revokes that shared session, and A's mutations (getUser-gated)
    // would fail (the sessions.spec suite-order lesson).
    const ctxA = await browser.newContext();
    const pageA = await loginAs(ctxA, SESSION_EMAIL);
    const { groupId, partnerGroupId } = await seedGroupWithPartner(pageA);

    // -- B logs in and PARKS on the inbox (empty to start) -----------------
    const ctxB = await browser.newContext();
    const pageB = await loginAs(ctxB, PARTNER_EMAIL);
    await pageB.goto('/messages');
    await expect(pageB.getByTestId('inbox-empty')).toBeVisible({ timeout: 30_000 });
    // The realtime subscription joins post-paint; give the socket a moment to
    // be subscribed before A acts (so the hint has a live channel to ride).
    await pageB.waitForTimeout(1500);

    // -- A opens a DM with B via the roster and sends ----------------------
    await pageA.goto(`/groups/${groupId}`);
    const partnerRow = pageA.getByTestId(`member-row-${partnerGroupId}`);
    await expect(partnerRow).toBeVisible({ timeout: 20_000 });
    await partnerRow.getByRole('button', { name: /^Message/ }).click();
    await expect(pageA).toHaveURL(/\/messages\/[0-9a-f-]{36}/, { timeout: 15000 });
    await expect(pageA.getByRole('textbox', { name: 'Message' })).toBeVisible({ timeout: 60_000 });
    await pageA.getByRole('textbox', { name: 'Message' }).fill(DM_TEXT);
    await pageA.getByRole('button', { name: /^send$/i }).click();
    await expect(pageA.getByText(DM_TEXT)).toBeVisible({ timeout: 15000 }); // A's confirmed send

    // -- B, WITHOUT navigating: inbox rises with unread + badge moves ------
    // bringToFront arms BOTH paths (hint = immediacy, visibility = guarantee).
    await pageB.bringToFront();
    await expect(pageB.getByTestId(/^inbox-row-/)).toBeVisible({ timeout: 30_000 });
    await expect(pageB.getByTestId(/^inbox-unread-/)).toBeVisible({ timeout: 30_000 });
    await expect(pageB.getByTestId('messages-unread-badge')).toHaveText('1', { timeout: 30_000 });

    // -- B opens the conversation IN-CONTEXT; A sends again; B stays current
    await pageB.getByTestId(/^inbox-row-/).first().click();
    await expect(pageB).toHaveURL(/\/messages\/[0-9a-f-]{36}/, { timeout: 15000 });
    await expect(pageB.getByText(DM_TEXT)).toBeVisible({ timeout: 30_000 });

    await pageA.getByRole('textbox', { name: 'Message' }).fill(DM_TEXT_2);
    await pageA.getByRole('button', { name: /^send$/i }).click();
    await expect(pageA.getByText(DM_TEXT_2)).toBeVisible({ timeout: 15000 });

    // B's open detail shows the new message live — no navigation.
    await pageB.bringToFront();
    await expect(pageB.getByText(DM_TEXT_2)).toBeVisible({ timeout: 30_000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('live forum: B sees A’s new thread with B’s draft intact, then the moderation tombstone — no B navigation', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    // A is a FRESH login (see the DM journey's note on the shared-session hazard).
    const ctxA = await browser.newContext();
    const pageA = await loginAs(ctxA, SESSION_EMAIL);
    const { groupId } = await seedGroupWithPartner(pageA);

    // -- B logs in, PARKS on the group page, starts a composer draft -------
    const ctxB = await browser.newContext();
    const pageB = await loginAs(ctxB, PARTNER_EMAIL);
    await pageB.goto(`/groups/${groupId}`);
    const forumB = pageB.getByTestId('group-forum');
    await expect(forumB).toBeVisible({ timeout: 60_000 });
    const composerB = forumB.getByRole('textbox', { name: 'Forum post' });
    await expect(composerB).toBeVisible({ timeout: 15000 });
    await composerB.fill(DRAFT_TEXT); // a half-written post a live refresh must not eat
    await pageB.waitForTimeout(1500); // let the forum channel subscribe

    // -- A posts a thread --------------------------------------------------
    await pageA.goto(`/groups/${groupId}`);
    const forumA = pageA.getByTestId('group-forum');
    await expect(forumA).toBeVisible({ timeout: 60_000 });
    await forumA.getByRole('textbox', { name: 'Forum post' }).fill(THREAD_TEXT);
    await forumA.getByTestId('forum-post-submit').click();
    await expect(pageA.getByText(THREAD_TEXT)).toBeVisible({ timeout: 15000 });
    const threadPostA = pageA.getByTestId(/^forum-post-/).filter({ hasText: THREAD_TEXT }).first();
    const threadId = (await threadPostA.getAttribute('data-testid'))!.replace('forum-post-', '');

    // -- B, WITHOUT navigating: the thread appears, B's draft survives -----
    await pageB.bringToFront();
    await expect(pageB.getByText(THREAD_TEXT)).toBeVisible({ timeout: 30_000 });
    await expect(composerB).toHaveValue(DRAFT_TEXT); // a refresh never eats the draft

    // -- A moderates (removes) the post ------------------------------------
    await pageA.getByTestId(`forum-remove-${threadId}`).click();
    await pageA.getByRole('dialog').getByRole('button', { name: /^remove$/i }).click();
    await expect(pageA.getByTestId(`forum-tombstone-${threadId}`)).toBeVisible({ timeout: 15000 });

    // -- B, WITHOUT navigating: the tombstone materializes live ------------
    await pageB.bringToFront();
    await expect(pageB.getByTestId(`forum-tombstone-${threadId}`)).toBeVisible({ timeout: 30_000 });
    await expect(pageB.getByTestId(`forum-tombstone-${threadId}`)).toHaveText(
      /removed by a group moderator/i,
    );

    await ctxA.close();
    await ctxB.close();
  });
});
