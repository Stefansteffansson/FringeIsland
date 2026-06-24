import { test, expect } from '@playwright/test';

/**
 * FEAT-H001 STORY-1 (E2E) — sign in → land on /groups.
 * Selectors mirror the oracle's auth.spec.ts so the behaviour carries forward.
 * These tests run WITHOUT the shared storageState (fresh, unauthenticated).
 */
test.use({ storageState: { cookies: [], origins: [] } });

test('login page loads with the sign-in form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('h1')).toHaveText('Welcome Back');
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

test('invalid credentials show an inline error and create no session', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email').fill('nonexistent@fringeisland.test');
  await page.locator('#password').fill('wrong-password');
  await page.locator('button[type="submit"]').click();

  const error = page.getByTestId('inline-error');
  await expect(error).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/\/login/);
});

test('unauthenticated visit to /groups redirects to /login', async ({ page }) => {
  await page.goto('/groups');
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
});

test('successful login redirects to /groups', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email').fill('e2e-session@fringeisland.test');
  await page.locator('#password').fill('e2e-test-password-123');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
});
