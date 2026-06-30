import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient, SESSION_EMAIL } from './helpers/auth';

/**
 * FEAT-H006 — render account state (IDN-9) E2E, against the real FEAT-PC004
 * contract. Authenticated as the shared e2e-session FIM (global-setup
 * storageState). Each test flips that user's lifecycle state via the admin client
 * and `beforeEach`/`afterAll` restore it to active, so the serial suite
 * (workers: 1) stays stable across reruns.
 *
 * `page.goto()` does a full navigation, remounting the AccountStateProvider so the
 * account state is re-resolved from the (just-mutated) substrate.
 */
async function setLifecycle(
  admin: SupabaseClient,
  patch: { is_active: boolean; is_decommissioned: boolean },
): Promise<void> {
  const { error } = await admin.from('users').update(patch).eq('email', SESSION_EMAIL);
  if (error) throw new Error(`Failed to set lifecycle state: ${error.message}`);
}

test.describe('FEAT-H006 — render account state', () => {
  let admin: SupabaseClient;

  test.beforeAll(() => {
    admin = createAdminClient();
  });

  test.beforeEach(async () => {
    await setLifecycle(admin, { is_active: true, is_decommissioned: false });
  });

  test.afterAll(async () => {
    await setLifecycle(admin, { is_active: true, is_decommissioned: false });
  });

  test('STORY-1: an active FIM is not interrupted', async ({ page }) => {
    await page.goto('/groups');
    await expect(page.getByRole('heading', { name: /my groups/i })).toBeVisible();
    await expect(page.getByTestId('account-suspended-surface')).toHaveCount(0);
    await expect(page.getByTestId('account-closed-surface')).toHaveCount(0);
    // STORY-4 (revised 2026-07-01): the gate is non-blocking — the old serial
    // "Checking your account…" loading screen no longer gates the page render.
    await expect(page.getByText(/checking your account/i)).toHaveCount(0);
  });

  test('STORY-1: account state is legible in profile settings (Account: active)', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByTestId('account-state-line')).toContainText(/account:\s*active/i);
  });

  test('STORY-2: a suspended FIM sees the suspended surface, no reactivation, not stranded', async ({
    page,
  }) => {
    await setLifecycle(admin, { is_active: false, is_decommissioned: false });
    await page.goto('/groups');

    await expect(page.getByTestId('account-suspended-surface')).toBeVisible();
    // The normal experience is replaced, not merely hidden.
    await expect(page.getByRole('heading', { name: /my groups/i })).toHaveCount(0);
    // No way back this cycle — self-reactivation (IDN-12) is deferred.
    await expect(page.getByRole('button', { name: /reactivate/i })).toHaveCount(0);
    // Not trapped — sign-out is offered.
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
  });

  test('STORY-3: a decommissioned FIM sees the terminal closed surface, no reactivation', async ({
    page,
  }) => {
    await setLifecycle(admin, { is_active: false, is_decommissioned: true });
    await page.goto('/groups');

    await expect(page.getByTestId('account-closed-surface')).toBeVisible();
    await expect(page.getByTestId('account-suspended-surface')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /reactivate/i })).toHaveCount(0);
  });
});
