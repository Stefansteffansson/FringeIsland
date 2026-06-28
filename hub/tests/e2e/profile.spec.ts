import { test, expect } from '@playwright/test';

/**
 * FEAT-H005 STORY-1/2/3/4 (E2E) — the member-profile + sign-out journeys against
 * the real PC003 contract and the platform display-name cascade trigger.
 *
 * Authenticated as the shared `e2e-session` FIM (from global-setup's storageState).
 * The edit journey mutates the shared user's display name, then restores it, so
 * the serial suite (workers: 1) stays stable across reruns.
 */

test.describe('FEAT-H005 — member profile + sign-out', () => {
  test('STORY-1: open the account menu and view the profile', async ({ page }) => {
    await page.goto('/groups');
    await page.getByRole('button', { name: /account menu/i }).click();
    await page.getByRole('link', { name: /profile/i }).click();

    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.getByLabel(/bio/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
  });

  test('STORY-2/3: editing the display name propagates to the account-menu label (platform cascade)', async ({
    page,
  }) => {
    await page.goto('/profile');
    const nickname = page.getByLabel(/display name/i);
    await expect(nickname).toBeVisible();
    const original = await nickname.inputValue();
    const edited = `E2E ${Date.now() % 100000}`;

    // Make the nickname the shown label so the cascade is visible in the menu.
    await page.getByRole('radio', { name: /show my nickname/i }).check();
    await nickname.fill(edited);
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByTestId('profile-success')).toBeVisible();

    // The account-menu label reflects the new display name (refreshNavigation +
    // the platform sync trigger renamed the personal group).
    await expect(page.getByRole('button', { name: /account menu/i })).toContainText(edited);

    // Restore the shared user's display name.
    await nickname.fill(original);
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByTestId('profile-success')).toBeVisible();
  });

  test('STORY-4: sign out returns to the entry and protected surfaces then gate', async ({
    page,
  }) => {
    await page.goto('/groups');
    await page.getByRole('button', { name: /account menu/i }).click();
    await page.getByRole('button', { name: /sign out/i }).click();

    await expect(page).toHaveURL('/');
    // A protected surface now gates as for any sessionless visitor.
    await page.goto('/groups');
    await expect(page).toHaveURL(/\/login/);
  });
});
