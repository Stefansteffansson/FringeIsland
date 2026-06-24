import { test, expect } from '@playwright/test';

/**
 * FEAT-H001 STORY-2/3 (E2E) — the authed /groups landing.
 * Uses the shared storageState (logged-in e2e-session user) from global-setup.
 */
test('authenticated /groups renders without redirect, with the bell mount (V3 seam)', async ({ page }) => {
  await page.goto('/groups');
  await expect(page).toHaveURL(/\/groups/);
  await expect(page.locator('h1')).toBeVisible();
  // V3 Notifications seam — the bell mount point is present in the shell.
  await expect(page.getByTestId('notification-bell')).toBeVisible();
});
