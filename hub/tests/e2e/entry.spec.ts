import { test, expect } from '@playwright/test';
import { createAdminClient, cleanupAnonymousUsers } from './helpers/auth';

/**
 * FEAT-H003 (E2E) — the Mist arrival journey:
 *   sessionless entry → "Look around" → a Mist materialises → Mist-presence state
 *   → become-a-FIM CTA → /signup (the existing FEAT-H002 flow).
 *
 * Runs WITHOUT the shared storageState (fresh, unauthenticated = sessionless).
 * Each "Look around" mints an anonymous Mist; there is no FEAT-PC002 reaper yet,
 * so afterAll deletes the anon users this spec created (the accumulation gap).
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.afterAll(async () => {
  await cleanupAnonymousUsers(createAdminClient());
});

test('the FringeIsland entry loads sessionless with three doors and no redirect', async ({
  page,
}) => {
  await page.goto('/');
  // Sessionless: stays on the entry — never bounced to /login.
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('button', { name: /look around/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
});

test('"Look around" materialises a Mist and lands on the Mist-presence state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /look around/i }).click();

  await expect(page).toHaveURL(/\/mist/, { timeout: 20000 });
  await expect(page.getByTestId('mist-presence')).toBeVisible();
  await expect(page.getByRole('link', { name: /become a fim/i })).toBeVisible();
});

test('the become-a-FIM CTA routes to sign-up (FEAT-H002)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /look around/i }).click();
  await expect(page).toHaveURL(/\/mist/, { timeout: 20000 });

  await page.getByRole('link', { name: /become a fim/i }).click();
  await expect(page).toHaveURL(/\/signup/, { timeout: 10000 });
});
