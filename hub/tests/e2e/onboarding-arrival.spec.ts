import { test, expect } from '@playwright/test';
import {
  createAdminClient,
  cleanupAnonymousUsers,
  deleteTranscendedUser,
} from './helpers/auth';

/**
 * FEAT-H023 (E2E) — the onboarding front door, end-to-end (JRN-5 + JRN-15):
 *  - a Mist's first arrival auto-launches the welcome in the ordinary player;
 *    the traveller leaves freely (never a wall), the walk stays reachable from
 *    the journeys list, and a later landing never re-launches;
 *  - a brand-new FIM (never a Mist) meets the identical front door at first
 *    sign-in, and a later landing never re-launches;
 *  - a Mist who advanced partway resumes at the carried position after
 *    transcendence — same walk, no restart (JRN-5).
 *
 * Effects are asserted, never just interactions (J-C rule): every arrival
 * asserts the landed-in-player observable state, every no-relaunch asserts
 * the URL held.
 *
 * Runs WITHOUT the shared storageState (fresh identities per flow). The shared
 * session FIM is pre-enrolled at global-setup, so these are the only specs
 * where the launch fires. afterAll sweeps anon stragglers; transcended FIMs
 * are deleted by email.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const PLAYER_URL = /\/journeys\/[0-9a-f-]+\/play/;
const PASSWORD = 'Transcend123!@#';

test.afterAll(async () => {
  await cleanupAnonymousUsers(createAdminClient());
});

test('a Mist arrives through the front door: welcome, free to leave, listed, never re-launched (STORY-1 + STORY-3)', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /look around/i }).click();

  // STORY-1: the arrival lands IN the player at the welcome (post-paint launch).
  await expect(page).toHaveURL(PLAYER_URL, { timeout: 30000 });
  await expect(page.getByTestId('journey-player')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Welcome to FringeIsland' })).toBeVisible();

  // STORY-3 (never a wall): ordinary navigation leaves freely — no step is
  // forced, nothing gates the rest of the Hub.
  await page.goto('/journeys');
  await expect(page.getByTestId('journeys-list')).toBeVisible({ timeout: 15000 });
  // ...and the walk stays deliberately resumable from the journeys list.
  await expect(page.getByTestId('journeys-list').getByText('Arrival on FringeIsland')).toBeVisible();

  // STORY-1 AC2: a later landing does NOT re-launch — the enrolment exists.
  await page.goto('/mist');
  await expect(page.getByTestId('mist-presence')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(4000); // give a wrong re-launch time to fire
  await expect(page).toHaveURL(/\/mist/);
});

test('a brand-new FIM meets the identical front door at first sign-in (STORY-2)', async ({
  page,
}) => {
  const admin = createAdminClient();
  const email = `e2e-h023-firstfim-${Date.now()}@fringeisland.test`;
  const { error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: 'H023 First Signin', consent_accepted: 'true' },
  });
  expect(error).toBeNull();

  try {
    await page.goto('/login');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();

    // The identical has_enrollment=false path — no separate first-sign-in state.
    await expect(page).toHaveURL(PLAYER_URL, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'Welcome to FringeIsland' })).toBeVisible({ timeout: 15000 });

    // A later landing does not re-launch (STORY-2 AC2).
    await page.goto('/groups');
    await page.waitForTimeout(4000);
    await expect(page).toHaveURL(/\/groups/);
  } finally {
    await deleteTranscendedUser(admin, email);
  }
});

test('onboarding carries across transcendence: same walk, carried position, no restart (STORY-4, JRN-5)', async ({
  page,
}) => {
  const admin = createAdminClient();
  const email = `e2e-h023-carry-${Date.now()}@fringeisland.test`;

  await page.goto('/');
  await page.getByRole('button', { name: /look around/i }).click();
  await expect(page).toHaveURL(PLAYER_URL, { timeout: 30000 });
  await expect(page.getByRole('heading', { name: 'Welcome to FringeIsland' })).toBeVisible({ timeout: 15000 });

  // Advance partway: complete the welcome (the kind's ask-verb affordance —
  // the player completes in place), then walk onto step 2.
  await page.getByTestId('step-complete').click();
  await expect(page.getByTestId('step-completed')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Three questions' })).toBeVisible({ timeout: 15000 });

  try {
    await page.goto('/become-a-fim');
    await page.locator('#fullName').fill('Carried Walk');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(PASSWORD);
    await page.getByTestId('consent-checkbox').check();
    await page.getByRole('button', { name: /become a fim/i }).click();

    // STORY-4: the landing RESUMES the carried walk — into the player, at the
    // carried position (step 2), not the welcome, not /groups, not a restart.
    await expect(page).toHaveURL(PLAYER_URL, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'Three questions' })).toBeVisible({ timeout: 15000 });
  } finally {
    await deleteTranscendedUser(admin, email);
  }
});
