import { test, expect, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient, deleteE2EUserByAuthId, markArrivedOnce } from './helpers/auth';

/**
 * FEAT-H006 — render account state (IDN-9) E2E, against the real FEAT-PC004
 * contract.
 *
 * TASK-E2E-03 (2026-09-02): this spec used to ride the shared `e2e-session`
 * storageState and flip THAT user's lifecycle columns by email, relying on
 * `beforeEach` / `afterAll` to put them back. The spec-by-spec audit found it
 * to be the fleet's one remaining shared-identity hazard: neither hook is
 * guaranteed (an aborted run, a worker crash, `--max-failures`, or the 30 s
 * hook budget skips them), STORY-3 runs last, so the leaked condition was the
 * terminal one — `is_active=false, is_decommissioned=true` — and the poison is
 * STATE, not a token: `user.json` stayed valid, every downstream rider signed
 * in fine and then painted the closed-account surface instead of the app. The
 * thirteen specs that self-heal in `beforeAll` hid it; the eight admin specs,
 * groups, notification-preferences, group-availability and the three wielded
 * specs failed as a block, and a solo re-run "fixed" it via `beforeEach` —
 * which is why it read as an intermittent bug somewhere else.
 *
 * Mechanism removed, per the profile/sessions precedent: a DEDICATED
 * spec-created FIM, fresh context + UI sign-in per story. The lifecycle flips
 * act on an identity that belongs to nobody else, and the fixture is torn down
 * through the consented-fixture path (`deleteE2EUserByAuthId` throws if the
 * personal group survives — TASK-INT-03's instrument). Nothing here can reach
 * the shared session any more.
 *
 * `page.goto()` does a full navigation, remounting the AccountStateProvider so
 * the account state is re-resolved from the (just-mutated) substrate.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const stamp = Date.now();
const password = 'e2e-test-password-123';
const fim = {
  email: `e2e-account-state-${stamp}@fringeisland.test`,
  name: `E2EAccountState${stamp}`,
};
let fimAuthId: string | null = null;

async function waitForPersonalGroup(admin: SupabaseClient, authUserId: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const { data } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (data?.personal_group_id) return data.personal_group_id as string;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`personal group never materialised for ${authUserId}`);
}

async function setLifecycle(
  admin: SupabaseClient,
  patch: { is_active: boolean; is_decommissioned: boolean },
): Promise<void> {
  const { error } = await admin.from('users').update(patch).eq('email', fim.email);
  if (error) throw new Error(`Failed to set lifecycle state: ${error.message}`);
}

async function signIn(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill(fim.email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
}

test.describe('FEAT-H006 — render account state', () => {
  let admin: SupabaseClient;

  test.beforeAll(async () => {
    admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: fim.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: fim.name, consent_accepted: 'true' },
    });
    if (error) throw error;
    await markArrivedOnce(admin, data.user.id); // FEAT-H023: arrived once — no auto-launch
    fimAuthId = data.user.id;
    await waitForPersonalGroup(admin, data.user.id);
  });

  // Active + signed in at the start of every story; the story then flips the
  // fixture's OWN state and re-navigates.
  test.beforeEach(async ({ page }) => {
    await setLifecycle(admin, { is_active: true, is_decommissioned: false });
    await signIn(page);
  });

  test.afterAll(async () => {
    // Not swallowed: the primitive throws if the personal group survives.
    await deleteE2EUserByAuthId(createAdminClient(), fimAuthId ?? undefined);
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
