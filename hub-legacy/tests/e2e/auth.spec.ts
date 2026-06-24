import { test, expect } from '@playwright/test';

// Run these tests WITHOUT auth (unauthenticated visitor)
// Must use explicit empty state — `undefined` doesn't clear HttpOnly cookies
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toHaveText('Welcome Back');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email').fill('nonexistent@example.com');
    await page.locator('#password').fill('wrong-password');
    await page.locator('button[type="submit"]').click();

    // Wait for error message to appear
    const errorBox = page.locator('.bg-red-50');
    await expect(errorBox).toBeVisible({ timeout: 10000 });
    await expect(errorBox).toContainText(/invalid|credentials|error/i);
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/profile');

    // Should redirect to /login (client-side guard in profile page)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('successful login redirects to /groups', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email').fill('e2e-session@fringeisland.test');
    await page.locator('#password').fill('e2e-test-password-123');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
  });
});
