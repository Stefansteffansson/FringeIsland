import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient, markArrivedOnce, SESSION_EMAIL } from './helpers/auth';

/**
 * FEAT-H038 STORY-7 (E2E) — the account journey, the walk's scenario
 * automated: suspend mid-session → the in-session wall (NO hard reload — the
 * W-7 refusal-triggered re-check carries the truth in) → the explicit W-10
 * exit ("Sign out to use another account" → /login) → signing in as another
 * account reaches the normal app (person-binding, proven at the walk, stays
 * proven).
 *
 * Coverage label (honest): written AFTER the surface implementation — the
 * red-first demonstrations live at the unit tier (the four W-suites,
 * red 2026-08-03 pre-implementation). Integrative journey coverage,
 * labelled test-after by the house rule.
 *
 * The wall trigger is the W-7 refusal path (a refused profile save fires
 * `requestAccountStateRecheck()`, throttle-bypassing) — the soft-nav/focus
 * cadence would need a ≥30 s wait; the refusal path is the same revalidator
 * arriving faster, and it exercises W-8 (the typed refusal) on the way.
 *
 * Serial + shared-session mutation: the suite flips the shared e2e-session
 * FIM's lifecycle and restores it in afterAll (the account-state.spec
 * precedent; workers: 1 keeps this safe).
 */

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const password = 'e2e-test-password-123';
const other = {
  email: `e2e-h038-other-${stamp}@fringeisland.test`,
  name: `E2EH038Other${stamp}`,
};

async function setSessionLifecycle(admin: SupabaseClient, isActive: boolean): Promise<void> {
  const { error } = await admin
    .from('users')
    .update({ is_active: isActive, is_decommissioned: false })
    .eq('email', SESSION_EMAIL);
  if (error) throw new Error(`Failed to set lifecycle: ${error.message}`);
}

test.describe('FEAT-H038 — the suspension journey (W-7/W-10, STORY-7)', () => {
  let admin: SupabaseClient;
  let otherAuthId: string | null = null;
  let otherPgId: string | null = null;

  test.beforeAll(async () => {
    admin = createAdminClient();
    await setSessionLifecycle(admin, true);
    const { data, error } = await admin.auth.admin.createUser({
      email: other.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: other.name, consent_accepted: 'true' },
    });
    if (error) throw error;
    otherAuthId = data.user.id;
    await markArrivedOnce(admin, data.user.id);
    for (let i = 0; i < 20 && !otherPgId; i++) {
      const { data: profile } = await admin
        .from('users')
        .select('personal_group_id')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();
      otherPgId = (profile?.personal_group_id as string | null) ?? null;
      if (!otherPgId) await new Promise((r) => setTimeout(r, 500));
    }
  });

  test.afterAll(async () => {
    await setSessionLifecycle(admin, true);
    if (otherPgId) await admin.from('groups').delete().eq('id', otherPgId);
    if (otherAuthId) await admin.auth.admin.deleteUser(otherAuthId);
  });

  test('suspend → in-session wall (no hard load) → explicit exit → sign-in-as-other lands in the normal app', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    // 1. The session FIM is browsing normally, standing on their profile.
    await page.goto('/profile');
    await expect(page.getByTestId('account-state-line')).toContainText(/active/i);
    await expect(page.getByTestId('account-suspended-surface')).toHaveCount(0);

    // 2. An administrator suspends them mid-session — no reload follows.
    await setSessionLifecycle(admin, false);

    // 3. Their next write is refused typed (W-8), the refusal fires the
    //    re-check (W-7), and the wall renders IN SESSION — the page was never
    //    reloaded (the URL never left /profile until the wall replaced it).
    await page.getByLabel(/display name/i).fill(`${other.name}x`);
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByTestId('account-suspended-surface')).toBeVisible({ timeout: 15000 });
    expect(page.url()).toContain('/profile');

    // 4. The exit is explicit and takes them there (W-10).
    await page.getByRole('button', { name: /sign out to use another account/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    // 5. Signing in as another account reaches the normal app — the wall was
    //    person-bound, never machine-bound.
    await page.locator('#email').fill(other.email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /my groups/i })).toBeVisible();
    await expect(page.getByTestId('account-suspended-surface')).toHaveCount(0);
  });
});
