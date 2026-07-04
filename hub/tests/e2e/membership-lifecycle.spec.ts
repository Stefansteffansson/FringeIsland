import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createAdminClient } from './helpers/auth';

/**
 * FEAT-H016 (E2E) — Cycle G-D: the pause round-trip (paused member's honest
 * absence + return), the sole-Steward and last-member leave refusals rendered
 * honestly (the G-E seams), removal, and the regular leave.
 *
 * Session isolation: own spec-created FIMs in their own browser contexts
 * (the G-B suite-isolation default). Memberships are seeded substrate-side
 * (admin insert — the invitation arc is FEAT-H015's covered journey; this
 * spec's point is the lifecycle). Display names single-token (nickname rule).
 */

const stamp = Date.now();
const password = 'e2e-test-password-123';
const stewardEmail = `e2e-gd-steward-${stamp}@fringeisland.test`;
const targetEmail = `e2e-gd-target-${stamp}@fringeisland.test`;
const leaverEmail = `e2e-gd-leaver-${stamp}@fringeisland.test`;
const targetName = `E2EGDTarget${stamp}`;
const leaverName = `E2EGDLeaver${stamp}`;
const groupName = `E2E G-D Lifecycle ${stamp}`;

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

test.describe.serial('FEAT-H016 — membership lifecycle (MEM-4/5/6)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let stewardCtx: BrowserContext;
  let stewardPage: Page;
  let steward: { authId: string; pgId: string };
  let target: { authId: string; pgId: string };
  let leaver: { authId: string; pgId: string };
  let groupId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    steward = await createFim(stewardEmail, `E2EGDSteward${stamp}`);
    target = await createFim(targetEmail, targetName);
    leaver = await createFim(leaverEmail, leaverName);

    stewardCtx = await browser.newContext();
    stewardPage = await stewardCtx.newPage();
    await signIn(stewardPage, stewardEmail);

    // The group, through the UI (the proven G-A path; private by default).
    await stewardPage.goto('/groups');
    await stewardPage.getByRole('button', { name: /create group/i }).click();
    await stewardPage.getByLabel(/group name/i).fill(groupName);
    await stewardPage.getByRole('button', { name: /^create$/i }).click();
    await expect(stewardPage).toHaveURL(/\/groups\/[0-9a-f-]{36}/, { timeout: 15000 });
    groupId = stewardPage.url().match(/\/groups\/([0-9a-f-]{36})/)?.[1] ?? null;
    expect(groupId).not.toBeNull();

    // Memberships substrate-side — the invitation arc is H015's journey.
    const admin = createAdminClient();
    for (const member of [target, leaver]) {
      const { error } = await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: member.pgId,
        status: 'active',
        added_by_group_id: steward.pgId,
      });
      if (error) throw new Error(`membership seed: ${error.message}`);
    }
  });

  test.afterAll(async () => {
    await stewardCtx?.close();
    const admin = createAdminClient();
    if (groupId) await admin.from('groups').delete().eq('id', groupId);
    for (const u of [leaver, target, steward]) {
      if (u?.pgId) await admin.from('groups').delete().eq('id', u.pgId);
      if (u?.authId) await admin.auth.admin.deleteUser(u.authId);
    }
  });

  test('the pause round-trip: paused member vanishes honestly, reactivation brings them back', async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    // Precondition: the member sees their group.
    const targetCtx = await browser.newContext();
    const targetPage = await targetCtx.newPage();
    await signIn(targetPage, targetEmail);
    await expect(targetPage.getByText(groupName)).toBeVisible({ timeout: 15000 });

    // The Steward pauses them; the badge appears from the re-read payload.
    await stewardPage.goto(`/groups/${groupId}`);
    await stewardPage.getByTestId(`pause-member-${target.pgId}`).click();
    await stewardPage.getByTestId('confirm-modal-confirm').click();
    await expect(stewardPage.getByTestId(`paused-badge-${target.pgId}`)).toBeVisible({
      timeout: 15000,
    });

    // The paused member's honest experience: the private group is gone from
    // the list, and the deep link renders the not-found view (substrate truth).
    await targetPage.goto('/groups');
    await expect(targetPage.getByText(groupName)).not.toBeVisible({ timeout: 15000 });
    await targetPage.goto(`/groups/${groupId}`);
    await expect(targetPage.getByText(/group not found/i)).toBeVisible({ timeout: 15000 });

    // Reactivation: the badge leaves; the member's group is back and opens.
    await stewardPage.getByTestId(`activate-member-${target.pgId}`).click();
    await stewardPage.getByTestId('confirm-modal-confirm').click();
    await expect(stewardPage.getByTestId(`paused-badge-${target.pgId}`)).not.toBeVisible({
      timeout: 15000,
    });

    await targetPage.goto('/groups');
    await expect(targetPage.getByText(groupName)).toBeVisible({ timeout: 15000 });
    await targetPage.goto(`/groups/${groupId}`);
    await expect(
      targetPage.getByRole('heading', { name: groupName }),
    ).toBeVisible({ timeout: 15000 });

    await targetCtx.close();
  });

  test('the sole active Steward is refused leave with the honest copy — nothing mutates', async () => {
    await stewardPage.goto(`/groups/${groupId}`);
    await stewardPage.getByTestId('leave-group').click();
    await stewardPage.getByTestId('confirm-modal-confirm').click();
    await expect(stewardPage.getByText(/only active steward/i)).toBeVisible({ timeout: 15000 });
    // Still here: the page stands and the member list still renders.
    await expect(stewardPage.getByTestId(`member-row-${target.pgId}`)).toBeVisible();
  });

  test('removal: the row leaves, and the removed member finds the group gone', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    await stewardPage.goto(`/groups/${groupId}`);
    await stewardPage.getByTestId(`remove-member-${target.pgId}`).click();
    await stewardPage.getByTestId('confirm-modal-confirm').click();
    await expect(stewardPage.getByTestId(`member-row-${target.pgId}`)).not.toBeVisible({
      timeout: 15000,
    });

    const targetCtx = await browser.newContext();
    const targetPage = await targetCtx.newPage();
    await signIn(targetPage, targetEmail);
    await expect(targetPage.getByText(groupName)).not.toBeVisible({ timeout: 15000 });
    await targetCtx.close();
  });

  test('the regular leave: the member exits by their own decision and lands on /groups', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const leaverCtx = await browser.newContext();
    const leaverPage = await leaverCtx.newPage();
    await signIn(leaverPage, leaverEmail);
    await leaverPage.goto(`/groups/${groupId}`);
    await expect(
      leaverPage.getByRole('heading', { name: groupName }),
    ).toBeVisible({ timeout: 15000 });

    await leaverPage.getByTestId('leave-group').click();
    await leaverPage.getByTestId('confirm-modal-confirm').click();
    await expect(leaverPage).toHaveURL(/\/groups$/, { timeout: 15000 });
    await expect(leaverPage.getByText(groupName)).not.toBeVisible({ timeout: 15000 });
    await leaverCtx.close();
  });

  test('the last member is refused leave with the honest closure copy (the MEM-8 seam)', async () => {
    await stewardPage.goto(`/groups/${groupId}`);
    await stewardPage.getByTestId('leave-group').click();
    await stewardPage.getByTestId('confirm-modal-confirm').click();
    await expect(stewardPage.getByText(/last member/i)).toBeVisible({ timeout: 15000 });
    await expect(stewardPage.getByRole('heading', { name: groupName })).toBeVisible();
  });
});
