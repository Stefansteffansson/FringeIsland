import { test, expect } from '@playwright/test';
import { createAdminClient, SESSION_EMAIL } from './helpers/auth';

/**
 * FEAT-H008 — render consent state (IDN-6) E2E, against the live FEAT-PC006
 * contract. Authenticated as the shared e2e-session FIM (global-setup
 * storageState). The effective view is catalog-driven, so the two seeded purposes
 * (transcendence + product_analytics) always render regardless of whether this
 * FIM has decided them — a robust, state-independent assertion. The surface is
 * read-only (grant/withdraw is FEAT-H009).
 */
test.describe('FEAT-H008 — render consent state', () => {
  test.beforeAll(async () => {
    // Order-independence: ensure the shared session FIM is active so the
    // account-state gate (FEAT-H006) passes through to the consent surface.
    const admin = createAdminClient();
    await admin
      .from('users')
      .update({ is_active: true, is_decommissioned: false })
      .eq('email', SESSION_EMAIL);
  });

  test('STORY-1: a FIM sees their effective consent (catalog-driven) on /consent', async ({ page }) => {
    await page.goto('/consent');
    await expect(page.getByRole('heading', { name: /privacy & consent/i })).toBeVisible();

    await expect(page.getByTestId('consent-effective-row-transcendence')).toBeVisible();
    await expect(page.getByTestId('consent-effective-row-product_analytics')).toBeVisible();
    await expect(page.getByText('Becoming a member')).toBeVisible();
    await expect(page.getByText('Product analytics')).toBeVisible();
  });

  test('STORY-2: the full consent history section is present', async ({ page }) => {
    await page.goto('/consent');
    await expect(page.getByTestId('consent-history')).toBeVisible();
    await expect(page.getByRole('heading', { name: /consent history/i })).toBeVisible();
  });

  test('STORY-1: the surface is read-only — no grant/withdraw controls (those are FEAT-H009)', async ({
    page,
  }) => {
    await page.goto('/consent');
    await expect(page.getByTestId('consent-effective')).toBeVisible();
    await expect(page.getByRole('button', { name: /withdraw/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /grant/i })).toHaveCount(0);
  });

  test('STORY-5: a FIM reaches the consent surface from the account menu', async ({ page }) => {
    await page.goto('/groups');
    await page.getByRole('button', { name: /account menu/i }).click();
    await page.getByRole('link', { name: /privacy & consent/i }).click();
    await expect(page).toHaveURL(/\/consent$/);
    await expect(page.getByTestId('consent-effective')).toBeVisible();
  });
});
