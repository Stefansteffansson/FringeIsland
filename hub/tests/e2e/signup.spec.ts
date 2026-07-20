import { test, expect } from '@playwright/test';
import { createAdminClient, deleteE2EUser } from './helpers/auth';

/**
 * FEAT-H002 (E2E) — credentialed FIM sign-up.
 * Runs WITHOUT the shared storageState (fresh, unauthenticated).
 */
test.use({ storageState: { cookies: [], origins: [] } });

function freshEmail(tag: string): string {
  return `e2e-signup-${tag}-${Date.now()}@fringeisland.test`;
}

test('sign-up page loads with the form and the consent gate', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.locator('h1')).toHaveText('Create your account');
  await expect(page.locator('#fullName')).toBeVisible();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.getByTestId('consent-checkbox')).toBeVisible();
});

test('submitting without consent is blocked and shows an inline error', async ({ page }) => {
  await page.goto('/signup');
  await page.locator('#fullName').fill('No Consent');
  await page.locator('#email').fill(freshEmail('noconsent'));
  await page.locator('#password').fill('Test123!@#$');
  // Leave the consent box unchecked.
  await page.locator('button[type="submit"]').click();

  await expect(page.getByTestId('inline-error')).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/\/signup/);
});

test('a new FIM can sign up and lands authenticated on /groups (empty state)', async ({ page }) => {
  const email = freshEmail('happy');
  const admin = createAdminClient();
  try {
    await page.goto('/signup');
    await page.locator('#fullName').fill('Grace Hopper');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('Test123!@#$');
    await page.getByTestId('consent-checkbox').check();
    await page.locator('button[type="submit"]').click();

    // C-A adaptation (labelled): a brand-new FIM auto-launches into the
    // designated onboarding journey at first sign-in (FEAT-H023 / JRN-15 —
    // the front door, post-paint). The old "lands on /groups" assertion only
    // ever passed by winning the post-paint race against the launch. Assert
    // the real arrival, then the original intent: /groups shows the honest
    // empty state (no re-launch — the arrived-once rule).
    await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+\/play/, { timeout: 20000 });
    await page.goto('/groups');
    await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
    await expect(page.getByText('No groups yet')).toBeVisible({ timeout: 15000 });
  } finally {
    await deleteE2EUser(admin, email);
  }
});

test('signing up with an already-registered email shows an inline error', async ({ page }) => {
  // The shared E2E session user (created by global-setup) already exists.
  await page.goto('/signup');
  await page.locator('#fullName').fill('Already Exists');
  await page.locator('#email').fill('e2e-session@fringeisland.test');
  await page.locator('#password').fill('Test123!@#$');
  await page.getByTestId('consent-checkbox').check();
  await page.locator('button[type="submit"]').click();

  await expect(page.getByTestId('inline-error')).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/\/signup/);
});
