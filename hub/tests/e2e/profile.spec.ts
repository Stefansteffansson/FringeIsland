import { test, expect, type Page } from '@playwright/test';
import { createAdminClient, markArrivedOnce } from './helpers/auth';

/**
 * FEAT-H005 STORY-1/2/3/4 (E2E) — the member-profile + sign-out journeys against
 * the real PC003 contract and the platform display-name cascade trigger.
 *
 * TASK-E2E-01 (fixed 2026-08-05, the 4th recorded occurrence — by then
 * deterministic, red even solo): this spec used to ride the shared
 * `e2e-session` storageState, and STORY-4's sign-out is SCOPE-GLOBAL — it
 * server-revoked the shared session, so any later rider (entry.spec, the
 * suite's own re-runs) inherited a dead session whose `/auth/v1/logout` 403s
 * `session_not_found`, leaves the cookie, and stops protected surfaces from
 * gating. The audit (AC-2) found this was the fleet's ONLY scope-global
 * sign-out on the shared state (account-state.spec only asserts the button's
 * visibility). Fix, per the sessions/realtime precedent: a DEDICATED
 * spec-created FIM, fresh context + UI sign-in per story — the sign-out under
 * test acts on a session that is provably live and belongs to nobody else.
 */

const stamp = Date.now();
const password = 'e2e-test-password-123';
const fim = {
  email: `e2e-profile-${stamp}@fringeisland.test`,
  name: `E2EProfile${stamp}`,
};

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

async function signIn(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill(fim.email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
}

test.describe('FEAT-H005 — member profile + sign-out', () => {
  test.beforeAll(async () => {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: fim.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: fim.name, consent_accepted: 'true' },
    });
    if (error) throw error;
    await markArrivedOnce(admin, data.user.id);
    await waitForPersonalGroup(data.user.id);
  });

  test('STORY-1: open the account menu and view the profile', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await signIn(page);
    await page.getByRole('button', { name: /account menu/i }).click();
    // COR-C W5 (#342): menu entries carry role="menuitem" — adapted at ADM-A, found-not-caused.
    await page.getByRole('menuitem', { name: /profile/i }).click();

    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.getByLabel(/bio/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
    await ctx.close();
  });

  test('STORY-2/3: editing the display name propagates to the account-menu label (platform cascade)', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await signIn(page);
    await page.goto('/profile');
    const nickname = page.getByLabel(/display name/i);
    await expect(nickname).toBeVisible();
    const edited = `E2E ${Date.now() % 100000}`;

    // Make the nickname the shown label so the cascade is visible in the menu.
    // The subject is this spec's own FIM — no shared-state restore obligation.
    await page.getByRole('radio', { name: /show my nickname/i }).check();
    await nickname.fill(edited);
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByTestId('profile-success')).toBeVisible();

    // The account-menu label reflects the new display name (refreshNavigation +
    // the platform sync trigger renamed the personal group).
    await expect(page.getByRole('button', { name: /account menu/i })).toContainText(edited);
    await ctx.close();
  });

  test('STORY-4: sign out returns to the entry and protected surfaces then gate', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await signIn(page);
    await page.getByRole('button', { name: /account menu/i }).click();
    // COR-C W5 (#342): sign-out is a menuitem now — adapted at ADM-A, found-not-caused.
    await page.getByRole('menuitem', { name: /sign out/i }).click();

    await expect(page).toHaveURL('/');
    // A protected surface now gates as for any sessionless visitor.
    await page.goto('/groups');
    await expect(page).toHaveURL(/\/login/);
    await ctx.close();
  });
});
