import { test, expect } from '@playwright/test';

// These tests use the default storageState (logged-in session)

test.describe('Journeys (authenticated)', () => {
  test('journey catalog loads with seeded data', async ({ page }) => {
    await page.goto('/journeys');

    // Page title should be visible
    await expect(page.locator('h1')).toContainText(/journey/i);

    // At least one seeded journey should appear
    await expect(page.getByText('Leadership Fundamentals')).toBeVisible({ timeout: 10000 });
  });

  test('click journey card navigates to detail page', async ({ page }) => {
    await page.goto('/journeys');

    // Wait for journeys to load
    await expect(page.getByText('Leadership Fundamentals')).toBeVisible({ timeout: 10000 });

    // Click the journey card (the link wrapping the card)
    await page.getByText('Leadership Fundamentals').click();

    // Should navigate to a journey detail page
    await expect(page).toHaveURL(/\/journeys\/[a-f0-9-]+/);
    await expect(page.getByRole('heading', { name: 'Leadership Fundamentals' })).toBeVisible();
  });

  test('My Groups page is accessible', async ({ page }) => {
    await page.goto('/groups');

    // Should load without redirect (authenticated)
    await expect(page).toHaveURL(/\/groups/);
    await expect(page.locator('h1')).toBeVisible();
  });
});
