import { test, expect } from '@playwright/test';
import { createAdminClient, cleanupAnonymousUsers, anonymousSweepWatermark } from './helpers/auth';

/**
 * FEAT-H003 (E2E) — the Mist arrival journey:
 *   sessionless entry → "Look around" → a Mist materialises → Mist-presence state
 *   → become-a-FIM CTA → /become-a-fim (the FEAT-H004 in-place transcendence flow).
 *
 * Runs WITHOUT the shared storageState (fresh, unauthenticated = sessionless).
 * Each "Look around" mints an anonymous Mist; there is no FEAT-PC002 reaper yet,
 * so afterAll deletes the anon users this spec created (the accumulation gap).
 */
test.use({ storageState: { cookies: [], origins: [] } });

// TASK-E2E-04 — sweep only the Mists THIS spec minted. Unbounded, this teardown
// pays for every anonymous user in the database inside a 30s budget, and N grows
// during a fleet because the fleet is what mints Mists. Residue from earlier
// runs is collected once, unbounded, in global teardown.
let specStart: string;

test.beforeAll(async () => {
  specStart = await anonymousSweepWatermark();
});

test.afterAll(async () => {
  await cleanupAnonymousUsers(createAdminClient(), { since: specStart });
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

test('"Look around" materialises a Mist and arrives through the front door; the Mist-presence state stays reachable', async ({
  page,
}) => {
  // Labelled adaptation (FEAT-H023, Cycle J-E): first arrival now auto-launches
  // the onboarding welcome — the /mist presence state is no longer the landing,
  // but it remains fully reachable (never a wall, never a re-launch).
  await page.goto('/');
  await page.getByRole('button', { name: /look around/i }).click();

  await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+\/play/, { timeout: 30000 });

  await page.goto('/mist');
  await expect(page.getByTestId('mist-presence')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('link', { name: /become a fim/i })).toBeVisible();
});

test('the become-a-FIM CTA opens the in-place transcendence flow (FEAT-H004)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /look around/i }).click();
  // FEAT-H023: let the arrival auto-launch settle, then reach the CTA from /mist.
  await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+\/play/, { timeout: 30000 });
  await page.goto('/mist');

  await page.getByRole('link', { name: /become a fim/i }).click();
  await expect(page).toHaveURL(/\/become-a-fim/, { timeout: 10000 });
});
