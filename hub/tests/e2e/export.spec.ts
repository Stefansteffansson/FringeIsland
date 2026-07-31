import { test, expect } from '@playwright/test';
import { createAdminClient, SESSION_EMAIL, runAdminSql } from './helpers/auth';

/**
 * FEAT-H010 — download my data (IDN-8) E2E, against the live FEAT-PC008 contract.
 * Authenticated as the shared e2e-session FIM (global-setup storageState). The
 * surface is a faithful courier: it fetches `GET /api/account/export` and hands
 * the member a file. These journey tests layer on the red-first unit specs
 * (DataExportPanel + export-client) — they verify the end-to-end download path,
 * not the orchestration logic (which is unit-covered).
 *
 * The export writes a `data_export` audit row (actor_group_id ON DELETE SET NULL,
 * so it never blocks global-teardown). The afterAll purge is tidiness only.
 */
async function purgeSessionExportAudit(): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('email', SESSION_EMAIL)
    .maybeSingle();
  const gid = data?.personal_group_id as string | undefined;
  if (gid) {
    await runAdminSql(
      `DELETE FROM public.admin_audit_log WHERE action = 'data_export' AND actor_group_id = '${gid}';`,
    ).catch(() => undefined);
  }
}

test.describe('FEAT-H010 — download my data', () => {
  test.beforeAll(async () => {
    // Order-independence: ensure the shared session FIM is active so the
    // account-state gate passes through to the export surface.
    const admin = createAdminClient();
    await admin
      .from('users')
      .update({ is_active: true, is_decommissioned: false })
      .eq('email', SESSION_EMAIL);
  });

  test.afterAll(async () => {
    await purgeSessionExportAudit();
  });

  test('STORY-4: a FIM sees the export surface — explanation + action', async ({ page }) => {
    await page.goto('/export');
    await expect(page.getByRole('heading', { name: /download my data/i })).toBeVisible();
    await expect(page.getByText(/consent history/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /download my data/i })).toBeEnabled();
  });

  test('STORY-1: clicking the action downloads a JSON file', async ({ page }) => {
    await page.goto('/export');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download my data/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('fringeisland-data-export.json');
  });

  test('STORY-3: a FIM reaches the export surface from the account menu', async ({ page }) => {
    await page.goto('/groups');
    await page.getByRole('button', { name: /account menu/i }).click();
    // COR-C W5 (#342): menu entries carry role="menuitem" — adapted at ADM-A, found-not-caused.
    await page.getByRole('menuitem', { name: /download my data/i }).click();
    await expect(page).toHaveURL(/\/export$/);
    await expect(page.getByRole('button', { name: /download my data/i })).toBeVisible();
  });
});
