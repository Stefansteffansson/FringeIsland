import { test, expect } from '@playwright/test';
import { createAdminClient, SESSION_EMAIL, runAdminSql } from './helpers/auth';

/**
 * Purge the shared session FIM's consent rows under the controlled erasure
 * bypass (append-only + ON DELETE RESTRICT). Needed so a grant/withdraw round
 * trip doesn't block global-teardown from deleting the session user, and to give
 * the grant test a clean (undecided) baseline.
 */
async function purgeSessionConsent(): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('email', SESSION_EMAIL)
    .maybeSingle();
  const gid = data?.personal_group_id as string | undefined;
  if (gid) {
    await runAdminSql(
      `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
        `DELETE FROM public.consent_records WHERE subject_group_id = '${gid}'; END $$;`,
    ).catch(() => undefined);
  }
}

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

  test('STORY-5: a FIM reaches the consent surface from the account menu', async ({ page }) => {
    await page.goto('/groups');
    await page.getByRole('button', { name: /account menu/i }).click();
    await page.getByRole('link', { name: /privacy & consent/i }).click();
    await expect(page).toHaveURL(/\/consent$/);
    await expect(page.getByTestId('consent-effective')).toBeVisible();
  });
});

/**
 * FEAT-H009 — grant/withdraw controls (IDN-7 consent half) E2E, against the live
 * FEAT-PC007 write + FEAT-PC006 re-read. The shared session FIM grants then
 * withdraws the withdrawable `product_analytics` purpose through the ConfirmModal;
 * `transcendence` (non-withdrawable) renders locked. Consent rows are purged
 * before + after so the round trip leaves the session user deletable.
 */
test.describe('FEAT-H009 — grant/withdraw consent', () => {
  test.beforeAll(async () => {
    const admin = createAdminClient();
    await admin
      .from('users')
      .update({ is_active: true, is_decommissioned: false })
      .eq('email', SESSION_EMAIL);
    await purgeSessionConsent(); // clean (undecided) baseline
  });

  test.afterAll(async () => {
    await purgeSessionConsent(); // leave the session user deletable (RESTRICT FK)
  });

  test('STORY-1+2: grant then withdraw product_analytics through the ConfirmModal', async ({
    page,
  }) => {
    await page.goto('/consent');
    const row = page.getByTestId('consent-effective-row-product_analytics');
    await expect(row).toBeVisible();

    // Grant — control opens the ConfirmModal; confirm; row reflects granted after re-read.
    await row.getByTestId('consent-action-product_analytics').click();
    await expect(page.getByTestId('confirm-modal')).toBeVisible();
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByTestId('confirm-modal')).toHaveCount(0);
    await expect(row.getByText(/granted/i)).toBeVisible();

    // Withdraw — the control now offers withdraw; confirm; row reflects withdrawn.
    await row.getByTestId('consent-action-product_analytics').click();
    await expect(page.getByTestId('confirm-modal')).toContainText(/again later/i);
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByTestId('confirm-modal')).toHaveCount(0);
    await expect(row.getByText(/withdrawn/i)).toBeVisible();
  });

  test('STORY-3: a non-withdrawable purpose (transcendence) is locked — no control', async ({
    page,
  }) => {
    await page.goto('/consent');
    const row = page.getByTestId('consent-effective-row-transcendence');
    await expect(row.getByTestId('consent-locked-transcendence')).toBeVisible();
    await expect(row.getByRole('button')).toHaveCount(0);
  });

  test('STORY-4: cancelling the ConfirmModal makes no change', async ({ page }) => {
    await purgeSessionConsent();
    await page.goto('/consent');
    const row = page.getByTestId('consent-effective-row-product_analytics');
    await row.getByTestId('consent-action-product_analytics').click();
    await page.getByTestId('confirm-modal-cancel').click();
    await expect(page.getByTestId('confirm-modal')).toHaveCount(0);
    // unchanged — still undecided (no optimistic flip)
    await expect(row.getByText(/not yet decided/i)).toBeVisible();
  });
});
