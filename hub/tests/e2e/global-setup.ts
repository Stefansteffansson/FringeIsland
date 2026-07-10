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
    // consent_accepted: credentialed FIM creation is consent-gated at the
    // substrate (handle_new_user, ADR-U038 S3) — same as the integration
    // helper. Without it the trigger refuses ("Database error creating new
    // user") and the whole E2E suite cannot start.
    user_metadata: { display_name: 'E2E Session', consent_accepted: 'true' },
  });
  if (error) throw new Error(`Failed to create session user: ${error.message}`);
  console.log(`[e2e-setup] Created user: ${data.user.email}`);

  // FEAT-H023: the shared FIM has "arrived once" BY CONSTRUCTION. Without
  // this, the first /groups landing of every run auto-launches onboarding and
  // yanks whichever spec lands first into the player. Arrival flows are
  // onboarding-arrival.spec's own fixtures, on fresh identities.
  const { data: profile } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('auth_user_id', data.user.id)
    .single();
  const { data: onboarding } = await admin
    .from('journeys')
    .select('id')
    .eq('is_onboarding_designated', true)
    .maybeSingle();
  if (profile?.personal_group_id && onboarding?.id) {
    const { error: enrolErr } = await admin.from('journey_enrollments').insert({
      journey_id: onboarding.id,
      group_id: profile.personal_group_id,
      enrolled_by_group_id: profile.personal_group_id,
      status: 'active',
    });
    if (enrolErr) throw new Error(`Failed to pre-enrol session user: ${enrolErr.message}`);
    console.log('[e2e-setup] Session user pre-enrolled in onboarding (arrived once)');
  } else {
    console.log(
      '[e2e-setup] WARNING: no designated onboarding journey found — arrival will fire live',
    );
  }

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
