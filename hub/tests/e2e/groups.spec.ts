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

/**
 * FEAT-H013 (E2E) — Cycle G-A: create a group, see it whole, steward its
 * settings; the honesty matrix for non-members; the sessionless gate.
 * The create/steward journey runs on the shared storageState session (it never
 * signs out — suite-order-safe). The honesty test builds its state via the
 * admin client (service_role — the ADR-U038 narrowing does not bind it) and a
 * second, spec-created FIM. Everything created here is cleaned up.
 */
import { createAdminClient, markArrivedOnce, deleteE2EUserByAuthId } from './helpers/auth';

test.describe('FEAT-H013 — create & steward (GRP-1/2/3/5 + GRP-4 detail)', () => {
  const stamp = Date.now();
  const groupName = `E2E G-A Cohort ${stamp}`;
  const renamed = `E2E G-A Cohort ${stamp} renamed`;
  let createdGroupId: string | null = null;

  test.afterAll(async () => {
    const admin = createAdminClient();
    if (createdGroupId) await admin.from('groups').delete().eq('id', createdGroupId);
  });

  test('create a group, land in it, steward its name and visibility', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/groups');
    await page.getByRole('button', { name: /create group/i }).click();
    await page.getByLabel(/group name/i).fill(groupName);
    await page.getByRole('button', { name: /^create$/i }).click();

    // Lands on the new group's detail (GRP-1 → GRP-4).
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}/, { timeout: 15000 });
    createdGroupId = page.url().match(/\/groups\/([0-9a-f-]{36})/)?.[1] ?? null;
    await expect(page.getByRole('heading', { name: groupName })).toBeVisible({ timeout: 15000 });
    // The creator is the Steward: the capability-gated affordance is present,
    // and the member list shows them (display identity, GRP-4).
    await expect(page.getByTestId('member-list')).toBeVisible();

    // Steward the name (GRP-2) — mutation re-reads, never optimistic.
    await page.getByRole('button', { name: /edit settings/i }).click();
    await page.getByLabel(/group name/i).fill(renamed);
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByRole('heading', { name: renamed })).toBeVisible({ timeout: 15000 });

    // Toggle exactly group visibility (GRP-3) — the Public chip appears.
    await page.getByRole('button', { name: /edit settings/i }).click();
    await page.getByLabel(/group visibility/i).check();
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText('Public', { exact: true })).toBeVisible({ timeout: 15000 });
  });
});

test.describe('FEAT-H013 — non-member honesty (no-leak + member-list toggle)', () => {
  const stamp = Date.now();
  const probeEmail = `e2e-ga-outsider-${stamp}@fringeisland.test`;
  const probePassword = 'e2e-test-password-123';
  let probeAuthId: string | null = null;
  let probeGroupId: string | null = null;

  test.beforeAll(async () => {
    const admin = createAdminClient();
    // A private group owned by the shared session user (admin-built state —
    // service_role; the UI journey above already proves the contract path).
    const { data: owner } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('email', 'e2e-session@fringeisland.test')
      .single();
    const { data: g } = await admin
      .from('groups')
      .insert({
        name: `E2E G-A Private ${stamp}`,
        group_type: 'engagement',
        is_public: false,
        show_member_list: false,
        created_by_group_id: owner!.personal_group_id,
      })
      .select('id')
      .single();
    probeGroupId = g!.id;
    await admin.from('group_memberships').insert({
      group_id: probeGroupId,
      member_group_id: owner!.personal_group_id,
      status: 'active',
      added_by_group_id: owner!.personal_group_id,
    });
    // The outsider FIM (handle_new_user builds the profile + personal group).
    // consent_accepted: credentialed FIM creation is consent-gated at the
    // substrate (ADR-U038 S3) — same shape as global-setup.
    const { data: created, error } = await admin.auth.admin.createUser({
      email: probeEmail,
      password: probePassword,
      email_confirm: true,
      user_metadata: { display_name: 'GA Outsider', consent_accepted: 'true' },
    });
    if (error) throw error;
    await markArrivedOnce(admin, created.user.id); // FEAT-H023: fixture FIMs have arrived once
    probeAuthId = created.user.id;
  });

  test.afterAll(async () => {
    const admin = createAdminClient();
    if (probeGroupId) await admin.from('groups').delete().eq('id', probeGroupId);
    if (probeAuthId) {
      const { data: profile } = await admin
        .from('users')
        .select('personal_group_id')
        .eq('auth_user_id', probeAuthId)
        .maybeSingle();
      if (profile?.personal_group_id) {
        await admin.from('groups').delete().eq('id', profile.personal_group_id);
      }
      await deleteE2EUserByAuthId(admin, probeAuthId);
    }
  });

  test('a private group 404s for a non-member; public + hidden list renders honestly', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/login');
    await page.locator('#email').fill(probeEmail);
    await page.locator('#password').fill(probePassword);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });

    // Private → indistinguishable from absent (the FEAT-PC010 no-leak rule).
    await page.goto(`/groups/${probeGroupId}`);
    await expect(page.getByText(/group not found/i)).toBeVisible({ timeout: 15000 });

    // Public with the member list hidden → fields + honest copy, no list.
    const admin = createAdminClient();
    await admin.from('groups').update({ is_public: true }).eq('id', probeGroupId!);
    await page.reload();
    await expect(page.getByRole('heading', { name: new RegExp(`E2E G-A Private ${stamp}`) })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/member list hidden/i)).toBeVisible();
    await expect(page.getByTestId('member-list')).toHaveCount(0);
    await ctx.close();
  });
});

test.describe('FEAT-H013 — sessionless gate', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a sessionless deep link to a group detail is sent to login with the destination preserved', async ({
    page,
  }) => {
    await page.goto('/groups/00000000-0000-0000-0000-000000000000');
    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)groups(%2F|\/)/, { timeout: 10000 });
  });
});
