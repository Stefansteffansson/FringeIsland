import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { SESSION_EMAIL, E2E_PASSWORD } from './helpers/auth';

/**
 * FEAT-H012 — per-device sessions (IDN-11) E2E, against the live FEAT-PC009
 * contracts and the ADR-U039 signal path.
 *
 * IMPORTANT: the shared storageState session (global-setup) is never revoked —
 * later specs depend on it. Remote-revoke targets fresh UI-login sessions, and
 * the current-device flow runs in a second context on itself.
 */

async function loginFresh(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto('/login');
  await page.locator('#email').fill(SESSION_EMAIL);
  await page.locator('#password').fill(E2E_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
  return page;
}

const nonCurrentRows = (page: Page) =>
  page.locator('[data-testid="session-row"]:not(:has([data-testid="this-device"]))');

test.describe('FEAT-H012 — gate', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a sessionless visit to /sessions is sent to login with the destination preserved', async ({
    page,
  }) => {
    await page.goto('/sessions');
    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)sessions/, { timeout: 10000 });
  });
});

test.describe('FEAT-H012 — per-device sessions', () => {
  test('remote sign-out: revoking another device removes it here and signs it out there', async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    // Two FRESH sessions, independent of the shared storageState one. This was
    // originally forced by profile.spec STORY-4 signing out GLOBALLY, which
    // server-revoked the shared session (the suite-order lesson from the first
    // full run). That hazard is gone as of 2026-07-27 — deliberate sign-out is
    // now `scope: 'local'` — but fresh sessions are kept deliberately: this
    // journey revokes sessions, and it must never revoke one another spec is
    // relying on. Device B logs in LAST, so it is the newest non-current row on
    // device A's inventory.
    const ctxA = await browser.newContext();
    const pageA = await loginFresh(ctxA);
    const ctxB = await browser.newContext();
    const pageB = await loginFresh(ctxB); // parked on /groups

    await pageA.goto('/sessions');
    await expect(pageA.getByTestId('session-row').first()).toBeVisible({ timeout: 15000 });
    await expect(pageA.getByTestId('this-device')).toBeVisible();

    const before = await nonCurrentRows(pageA).count();
    expect(before).toBeGreaterThanOrEqual(1); // at least device B

    // Revoke exactly device B (the newest non-current row). Stale rows from
    // other specs are left alone — nothing else in the suite is disturbed.
    await nonCurrentRows(pageA).first().getByRole('button', { name: 'Sign out' }).click();
    await expect(pageA.getByText('Sign out this device?')).toBeVisible();
    await pageA.getByRole('button', { name: 'Yes, sign out' }).click();
    await expect(nonCurrentRows(pageA)).toHaveCount(before - 1, { timeout: 15000 });
    await expect(pageA.getByTestId('this-device')).toBeVisible();

    // Device B ends up on /login: the hint lands in moments when the socket is
    // live; bringing the page to front also fires the focus/visibility fallback,
    // so the assertion is deterministic either way (ADR-U039 rules 4 + 6).
    await pageB.bringToFront();
    await pageB.waitForURL(/\/login/, { timeout: 25000 });
    await ctxA.close();
    await ctxB.close();
  });

  test('W-05: a transient network failure never signs the member out', async ({ browser }) => {
    test.setTimeout(60_000);
    const ctx = await browser.newContext();
    const page = await loginFresh(ctx);

    // The auth server becomes unreachable. `getUser()` RETURNS this failure
    // rather than throwing (AuthRetryableFetchError is an AuthError), so the
    // guard's `catch` never fired and the blip took the refusal branch — a
    // GLOBAL signOut that ended every session the member had, silently,
    // landing them on "Welcome Back — Sign in to continue your journey."
    let attempts = 0;
    await page.route('**/auth/v1/user**', (route) => {
      attempts += 1;
      return route.abort('failed');
    });

    // Fire the guard's focus/visibility fallback (ADR-U039 rule 6).
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));

    // The guard must ACTUALLY have revalidated — without this the test would
    // pass vacuously if the guard never ran at all.
    await expect.poll(() => attempts, { timeout: 15_000 }).toBeGreaterThan(0);

    // ...and having run, it must have done nothing destructive.
    await expect(page).toHaveURL(/\/groups/);
    await expect(page.getByText(/Sign in to continue your journey/i)).toHaveCount(0);

    // Once the network returns, the session is still alive server-side — it was
    // never dropped, on this device or any other.
    await page.unroute('**/auth/v1/user**');
    await page.goto('/sessions');
    await expect(page.getByTestId('this-device')).toBeVisible({ timeout: 15_000 });

    await ctx.close();
  });

  test('current-device sign-out: distinct copy, immediate local sign-out', async ({ browser }) => {
    const ctxB = await browser.newContext();
    const pageB = await loginFresh(ctxB);

    await pageB.goto('/sessions');
    const currentRow = pageB.locator(
      '[data-testid="session-row"]:has([data-testid="this-device"])',
    );
    await expect(currentRow).toBeVisible({ timeout: 15000 });

    await currentRow.getByRole('button', { name: 'Sign out' }).click();
    await expect(pageB.getByText('Sign out here?')).toBeVisible();
    await expect(pageB.getByText(/right now/)).toBeVisible();
    await pageB.getByRole('button', { name: 'Yes, sign out' }).click();

    await pageB.waitForURL(/\/login/, { timeout: 15000 });
    await ctxB.close();
  });
});
