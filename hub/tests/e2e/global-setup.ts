/**
 * Playwright global setup:
 *  1. Clean up any leftover E2E session user from a previous run.
 *  2. Create a fresh e2e-session@fringeisland.test via the admin API.
 *  3. Log in through the real browser (required for @supabase/ssr HttpOnly cookies).
 *  4. Save storageState to tests/e2e/.auth/user.json for the authed specs.
 */
import { chromium, type FullConfig } from '@playwright/test';
import { createAdminClient, deleteE2EUser, E2E_PASSWORD, SESSION_EMAIL } from './helpers/auth';

export default async function globalSetup(config: FullConfig) {
  const admin = createAdminClient();
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  console.log('[e2e-setup] Cleaning up previous session user...');
  await deleteE2EUser(admin, SESSION_EMAIL);

  console.log('[e2e-setup] Creating session user...');
  const { data, error } = await admin.auth.admin.createUser({
    email: SESSION_EMAIL,
    password: E2E_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`Failed to create session user: ${error.message}`);
  console.log(`[e2e-setup] Created user: ${data.user.email}`);

  console.log('[e2e-setup] Logging in via browser...');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseURL}/login`);
  await page.locator('#email').fill(SESSION_EMAIL);
  await page.locator('#password').fill(E2E_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/groups', { timeout: 15000 });

  await context.storageState({ path: 'tests/e2e/.auth/user.json' });
  await browser.close();
  console.log('[e2e-setup] Global setup complete');
}
