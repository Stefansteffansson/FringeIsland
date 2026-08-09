import { test, expect } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient, markArrivedOnce, deleteE2EUserByAuthId } from './helpers/auth';

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
 * Fixture isolation (the TASK-E2E-01 trap class, sprung by this spec's first
 * full-sweep run): the journey ENDS IN A SIGN-OUT, so it must never run on
 * the shared e2e-session storageState — the wall exit revokes the stored
 * session server-side and every later spec's mutation (getUser) 401s. The
 * subject is a dedicated FIM in a fresh browser context; the shared session
 * is never touched.
 */

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const password = 'e2e-test-password-123';
const fims = {
  subject: { email: `e2e-h038-subj-${stamp}@fringeisland.test`, name: `E2EH038Subj${stamp}` },
  other: { email: `e2e-h038-other-${stamp}@fringeisland.test`, name: `E2EH038Other${stamp}` },
} as const;

type Fim = { authId: string; pgId: string };

async function createFim(
  admin: SupabaseClient,
  email: string,
  displayName: string,
): Promise<Fim> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, consent_accepted: 'true' },
  });
  if (error) throw error;
  await markArrivedOnce(admin, data.user.id);
  for (let i = 0; i < 20; i++) {
    const { data: profile } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();
    if (profile?.personal_group_id) {
      return { authId: data.user.id, pgId: profile.personal_group_id as string };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`personal group never materialised for ${email}`);
}

test.describe('FEAT-H038 — the suspension journey (W-7/W-10, STORY-7)', () => {
  let admin: SupabaseClient;
  const created: Fim[] = [];
  let subject: Fim, other: Fim;

  test.beforeAll(async () => {
    admin = createAdminClient();
    [subject, other] = await Promise.all([
      createFim(admin, fims.subject.email, fims.subject.name),
      createFim(admin, fims.other.email, fims.other.name),
    ]);
    created.push(subject, other);
  });

  test.afterAll(async () => {
    for (const u of created) {
      if (u?.pgId) await admin.from('groups').delete().eq('id', u.pgId);
      if (u?.authId) await deleteE2EUserByAuthId(admin, u.authId);
    }
  });

  test('suspend → in-session wall (no hard load) → explicit exit → sign-in-as-other lands in the normal app', async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // A fresh context — the shared e2e-session storageState is deliberately
    // not loaded (this journey ends in a sign-out; see the header note).
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();

    // 1. The subject signs in and is browsing normally, standing on their profile.
    await page.goto('/login');
    await page.locator('#email').fill(fims.subject.email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
    await page.goto('/profile');
    await expect(page.getByTestId('account-state-line')).toContainText(/active/i);
    await expect(page.getByTestId('account-suspended-surface')).toHaveCount(0);

    // 2. An administrator suspends them mid-session — no reload follows.
    const { error } = await admin
      .from('users')
      .update({ is_active: false, is_decommissioned: false })
      .eq('email', fims.subject.email);
    if (error) throw new Error(`Failed to suspend: ${error.message}`);

    // 3. Their next write is refused typed (W-8), the refusal fires the
    //    re-check (W-7), and the wall renders IN SESSION — the page was never
    //    reloaded (the URL never left /profile until the wall replaced it).
    await page.getByLabel(/display name/i).fill(`${fims.subject.name}x`);
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByTestId('account-suspended-surface')).toBeVisible({ timeout: 15000 });
    expect(page.url()).toContain('/profile');

    // 4. The exit is explicit and takes them there (W-10).
    await page.getByRole('button', { name: /sign out to use another account/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    // 5. Signing in as another account reaches the normal app — the wall was
    //    person-bound, never machine-bound.
    await page.locator('#email').fill(fims.other.email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /my groups/i })).toBeVisible();
    await expect(page.getByTestId('account-suspended-surface')).toHaveCount(0);

    await ctx.close();
  });
});
