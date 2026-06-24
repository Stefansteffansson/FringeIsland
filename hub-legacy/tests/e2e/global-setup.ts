/**
 * Playwright Global Setup
 *
 * 1. Cleans up any leftover E2E session user from previous runs
 * 2. Creates a fresh e2e-session@fringeisland.test user via admin API
 * 3. Logs in via the real browser (required for @supabase/ssr HttpOnly cookies)
 * 4. Saves storageState to tests/e2e/.auth/user.json
 */

import { chromium, type FullConfig } from '@playwright/test';
import { createAdminClient, deleteE2EUser, E2E_PASSWORD } from './helpers/auth';

const SESSION_EMAIL = 'e2e-session@fringeisland.test';

export default async function globalSetup(config: FullConfig) {
  const admin = createAdminClient();
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  // ── Clean up leftover session user ─────────────────────────────────
  console.log('[e2e-setup] Cleaning up previous session user...');
  await deleteE2EUser(admin, SESSION_EMAIL);

  // ── Create fresh session user ──────────────────────────────────────
  console.log('[e2e-setup] Creating session user...');
  const { data, error } = await admin.auth.admin.createUser({
    email: SESSION_EMAIL,
    password: E2E_PASSWORD,
    email_confirm: true,
  });

  if (error) throw new Error(`Failed to create session user: ${error.message}`);
  console.log(`[e2e-setup] Created user: ${data.user.email}`);

  // ── Login via browser ──────────────────────────────────────────────
  console.log('[e2e-setup] Logging in via browser...');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseURL}/login`);
  await page.locator('#email').fill(SESSION_EMAIL);
  await page.locator('#password').fill(E2E_PASSWORD);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to /groups (successful login)
  await page.waitForURL('**/groups', { timeout: 15000 });
  console.log('[e2e-setup] Login successful, saving auth state...');

  // ── Save storage state ─────────────────────────────────────────────
  await context.storageState({ path: 'tests/e2e/.auth/user.json' });

  await browser.close();
  console.log('[e2e-setup] Global setup complete');
}
