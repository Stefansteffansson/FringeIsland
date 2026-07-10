import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createAdminClient, markArrivedOnce } from './helpers/auth';

/**
 * FEAT-H015 (E2E) — Cycle G-C: the invitation arc (Steward finds a FIM by
 * name, invites, the invitee accepts from /groups and the group appears), the
 * email-invited newcomer's arrival (the invitation waits at sign-up — the
 * substrate auto-claim exercised end-to-end), and decline + cancel.
 *
 * Session isolation: own spec-created FIMs in their own browser contexts —
 * never the shared storageState session (the G-B suite-isolation default).
 * The newcomer's sign-up happens through the substrate path (admin
 * createUser → handle_new_user Step 8 auto-claim) — the sign-up FORM is
 * FEAT-H002's covered journey; this spec's point is the invitation waiting on
 * first arrival. Display names are single-token: the display identity is the
 * first word (the personal-group nickname rule).
 */

const stamp = Date.now();
const password = 'e2e-test-password-123';
const stewardEmail = `e2e-gc-steward-${stamp}@fringeisland.test`;
const inviteeEmail = `e2e-gc-invitee-${stamp}@fringeisland.test`;
const declinerEmail = `e2e-gc-decliner-${stamp}@fringeisland.test`;
const newcomerEmail = `e2e-gc-newcomer-${stamp}@fringeisland.test`;
const cancelledEmail = `e2e-gc-cancelled-${stamp}@fringeisland.test`;
const inviteeName = `E2EInvitee${stamp}`;
const declinerName = `E2EDecliner${stamp}`;
const groupName = `E2E G-C Invitations ${stamp}`;

async function waitForPersonalGroup(authUserId: string): Promise<string> {
  const admin = createAdminClient();
  for (let i = 0; i < 20; i++) {
    const { data } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (data?.personal_group_id) return data.personal_group_id;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`personal group never materialised for ${authUserId}`);
}

async function createFim(email: string, displayName: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, consent_accepted: 'true' },
  });
  if (error) throw error;
  await markArrivedOnce(admin, data.user.id); // FEAT-H023: fixture FIMs have arrived once
  const pgId = await waitForPersonalGroup(data.user.id);
  return { authId: data.user.id, pgId };
}

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
}

test.describe.serial('FEAT-H015 — invitations & joining (MEM-1/2/3)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let stewardCtx: BrowserContext;
  let stewardPage: Page;
  const users: Array<{ authId: string; pgId: string }> = [];
  let groupId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const steward = await createFim(stewardEmail, `E2EGCSteward${stamp}`);
    users.push(steward);
    users.push(await createFim(inviteeEmail, inviteeName));
    users.push(await createFim(declinerEmail, declinerName));

    stewardCtx = await browser.newContext();
    stewardPage = await stewardCtx.newPage();
    await signIn(stewardPage, stewardEmail);

    // The group, through the UI (the proven G-A path).
    await stewardPage.goto('/groups');
    await stewardPage.getByRole('button', { name: /create group/i }).click();
    await stewardPage.getByLabel(/group name/i).fill(groupName);
    await stewardPage.getByRole('button', { name: /^create$/i }).click();
    await expect(stewardPage).toHaveURL(/\/groups\/[0-9a-f-]{36}/, { timeout: 15000 });
    groupId = stewardPage.url().match(/\/groups\/([0-9a-f-]{36})/)?.[1] ?? null;
    expect(groupId).not.toBeNull();
  });

  test.afterAll(async () => {
    await stewardCtx?.close();
    const admin = createAdminClient();
    // The newcomer signed up mid-test; find and include them.
    const { data: newcomer } = await admin
      .from('users')
      .select('auth_user_id, personal_group_id')
      .eq('email', newcomerEmail.toLowerCase())
      .maybeSingle();
    if (groupId) await admin.from('groups').delete().eq('id', groupId);
    const all = [...users];
    if (newcomer?.auth_user_id) {
      all.push({
        authId: newcomer.auth_user_id as string,
        pgId: newcomer.personal_group_id as string,
      });
    }
    for (const u of all.reverse()) {
      if (u.pgId) await admin.from('groups').delete().eq('id', u.pgId);
      if (u.authId) await admin.auth.admin.deleteUser(u.authId);
    }
  });

  test('the invitation arc: search → invite → the invitee accepts and the group appears', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const page = stewardPage;
    await page.goto(`/groups/${groupId}`);

    // The invitations panel renders for the invite_members-holding Steward.
    await expect(page.getByTestId('invitations-panel')).toBeVisible({ timeout: 15000 });

    // Find the invitee by their (unique, single-token) display name and invite.
    await page.getByTestId('member-search-input').fill(inviteeName);
    const hit = page.getByTestId('member-search-results').getByText(inviteeName);
    await expect(hit).toBeVisible({ timeout: 10000 });
    await hit.click();

    // The pending list re-reads and carries the membership invitation.
    await expect(
      page.getByTestId('pending-invitations').getByText(inviteeName),
    ).toBeVisible({ timeout: 15000 });

    // The invitee finds the invitation on /groups, accepts, and is in.
    const inviteeCtx = await browser.newContext();
    const inviteePage = await inviteeCtx.newPage();
    await signIn(inviteePage, inviteeEmail);
    await expect(inviteePage.getByTestId('my-invitations')).toBeVisible({ timeout: 15000 });
    await expect(inviteePage.getByTestId('my-invitations').getByText(groupName)).toBeVisible();
    await inviteePage.getByTestId(`accept-invitation-${groupId}`).click();
    await expect(inviteePage.getByTestId('my-invitations')).toBeHidden({ timeout: 15000 });
    await expect(
      inviteePage.getByTestId('groups-list').getByText(groupName),
    ).toBeVisible({ timeout: 15000 });
    await inviteeCtx.close();

    // The Steward's member list shows the new member on re-read.
    await page.goto(`/groups/${groupId}`);
    await expect(page.getByText(inviteeName)).toBeVisible({ timeout: 15000 });
  });

  test('the email-invited newcomer: the invitation waits at sign-up (auto-claim), accepting joins', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const page = stewardPage;
    await page.goto(`/groups/${groupId}`);
    await expect(page.getByTestId('invitations-panel')).toBeVisible({ timeout: 15000 });

    // Invite an address nobody holds — the honest copy: no email is sent.
    await page.getByTestId('invite-email-input').fill(newcomerEmail);
    await page.getByTestId('invite-email-button').click();
    await expect(page.getByTestId('invite-sent-note')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByTestId('pending-invitations').getByText(newcomerEmail.toLowerCase()),
    ).toBeVisible({ timeout: 15000 });

    // The person signs up with that email (substrate path — auto-claim fires),
    // then arrives at /groups for the first time: the invitation is waiting.
    await createFim(newcomerEmail, `E2ENewcomer${stamp}`);
    const newcomerCtx = await browser.newContext();
    const newcomerPage = await newcomerCtx.newPage();
    await signIn(newcomerPage, newcomerEmail);
    await expect(newcomerPage.getByTestId('my-invitations')).toBeVisible({ timeout: 15000 });
    await expect(
      newcomerPage.getByTestId('my-invitations').getByText(groupName),
    ).toBeVisible();
    await newcomerPage.getByTestId(`accept-invitation-${groupId}`).click();
    await expect(
      newcomerPage.getByTestId('groups-list').getByText(groupName),
    ).toBeVisible({ timeout: 15000 });
    await newcomerCtx.close();
  });

  test('decline leaves no trace; cancelling an email invitation removes it', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const page = stewardPage;
    await page.goto(`/groups/${groupId}`);
    await expect(page.getByTestId('invitations-panel')).toBeVisible({ timeout: 15000 });

    // Inviting an existing FIM's address converts server-side (Open Q2, live):
    // the pending list shows a MEMBERSHIP invitation for the decliner.
    await page.getByTestId('invite-email-input').fill(declinerEmail);
    await page.getByTestId('invite-email-button').click();
    await expect(page.getByTestId('invite-sent-note')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByTestId('pending-invitations').getByText(declinerName),
    ).toBeVisible({ timeout: 15000 });

    // The decliner says no, through the ConfirmModal; no group card appears.
    const declinerCtx = await browser.newContext();
    const declinerPage = await declinerCtx.newPage();
    await signIn(declinerPage, declinerEmail);
    await expect(declinerPage.getByTestId('my-invitations')).toBeVisible({ timeout: 15000 });
    await declinerPage.getByTestId(`decline-invitation-${groupId}`).click();
    await declinerPage
      .getByTestId('confirm-modal')
      .getByRole('button', { name: 'Decline invitation' })
      .click();
    await expect(declinerPage.getByTestId('my-invitations')).toBeHidden({ timeout: 15000 });
    await expect(declinerPage.getByText(groupName)).toBeHidden();
    await declinerCtx.close();

    // The Steward cancels a fresh email invitation; the row leaves the list.
    await page.goto(`/groups/${groupId}`);
    await page.getByTestId('invite-email-input').fill(cancelledEmail);
    await page.getByTestId('invite-email-button').click();
    const row = page
      .getByTestId('pending-invitations')
      .locator('li', { hasText: cancelledEmail.toLowerCase() });
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole('button', { name: 'Cancel' }).click();
    await page
      .getByTestId('confirm-modal')
      .getByRole('button', { name: 'Cancel invitation' })
      .click();
    await expect(
      page.getByTestId('pending-invitations').getByText(cancelledEmail.toLowerCase()),
    ).toBeHidden({ timeout: 15000 });
  });
});
