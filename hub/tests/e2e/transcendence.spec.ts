import { test, expect } from '@playwright/test';
import { createAdminClient, cleanupAnonymousUsers, deleteTranscendedUser } from './helpers/auth';

/**
 * FEAT-H004 (E2E) — the IDN-2 journeys, end-to-end:
 *  - transcendence: Look around -> become-a-FIM (credentials + consent) -> lands
 *    on /groups as a FIM, the SAME session continued (nothing restarts). The
 *    data-level continuity (same personal_group_id) is asserted at the
 *    integration tier (transcendence.test.ts); here it is the journey-level proof.
 *  - consent gate: no consent -> the flow does not proceed.
 *  - farewell: Look around -> say goodbye -> ConfirmModal -> back to the
 *    sessionless entry.
 *
 * Runs WITHOUT the shared storageState (fresh, sessionless). Transcendence mints a
 * permanent FIM (cleaned up by email, consent-aware); the farewell erases its own
 * Mist; afterAll sweeps any anon stragglers.
 */
test.use({ storageState: { cookies: [], origins: [] } });

function freshEmail(tag: string): string {
  return `e2e-h004-${tag}-${Date.now()}@fringeisland.test`;
}

test.afterAll(async () => {
  await cleanupAnonymousUsers(createAdminClient());
});

test('become-a-FIM in place: Mist -> credentials + consent -> /groups (continuity)', async ({
  page,
}) => {
  const email = freshEmail('transcend');
  const admin = createAdminClient();
  try {
    await page.goto('/');
    await page.getByRole('button', { name: /look around/i }).click();
    await expect(page).toHaveURL(/\/mist/, { timeout: 20000 });

    await page.getByRole('link', { name: /become a fim/i }).click();
    await expect(page).toHaveURL(/\/become-a-fim/, { timeout: 10000 });

    await page.locator('#fullName').fill('Mae Jemison');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('Transcend123!@#');
    await page.getByTestId('consent-checkbox').check();
    await page.getByRole('button', { name: /become a fim/i }).click();

    // Continuity — the same session, continued: lands authenticated on /groups
    // (no "welcome new user" reset; a continued-but-fresh FIM shows the empty state).
    await expect(page).toHaveURL(/\/groups/, { timeout: 20000 });
    await expect(page.getByText('No groups yet')).toBeVisible({ timeout: 15000 });
  } finally {
    await deleteTranscendedUser(admin, email);
  }
});

test('the consent gate blocks transcendence (no consent -> stays on the flow)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /look around/i }).click();
  await expect(page).toHaveURL(/\/mist/, { timeout: 20000 });
  await page.getByRole('link', { name: /become a fim/i }).click();
  await expect(page).toHaveURL(/\/become-a-fim/, { timeout: 10000 });

  await page.locator('#fullName').fill('No Consent');
  await page.locator('#email').fill(freshEmail('noconsent'));
  await page.locator('#password').fill('Transcend123!@#');
  // Leave the consent box unchecked.
  await page.getByRole('button', { name: /become a fim/i }).click();

  await expect(page.getByTestId('inline-error')).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/\/become-a-fim/);
});

test('the farewell erases the Mist and returns to the sessionless entry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /look around/i }).click();
  await expect(page).toHaveURL(/\/mist/, { timeout: 20000 });

  await page.getByRole('button', { name: /say goodbye/i }).click();
  await expect(page.getByTestId('confirm-modal')).toBeVisible();
  await page.getByTestId('confirm-modal-confirm').click();

  // Back to the sessionless entry — "Look around" is offered again (a later return
  // is a new Mist; nothing from the erased visit is kept).
  await expect(page.getByRole('button', { name: /look around/i })).toBeVisible({ timeout: 20000 });
});
