import { test, expect } from '@playwright/test';
import {
  createAdminClient,
  cleanupAnonymousUsers,
  anonymousSweepWatermark,
  deleteTranscendedUser,
} from './helpers/auth';

/**
 * FEAT-H004 (E2E) — the IDN-2 journeys, end-to-end:
 *  - transcendence: Look around -> become-a-FIM (credentials + consent) -> lands
 *    on /groups as a FIM, the SAME session continued (nothing restarts). The
 *    data-level continuity (same personal_group_id) is asserted at the
 *    integration tier (transcendence.test.ts); here it is the journey-level proof.
 *  - consent gate: no consent -> the flow does not proceed.
 *  - farewell: Look around -> say goodbye -> ConfirmModal -> back to the
 *    sessionless entry.
 *
 * Runs WITHOUT the shared storageState (fresh, sessionless). Transcendence mints a
 * permanent FIM (cleaned up by email, consent-aware); the farewell erases its own
 * Mist; afterAll sweeps any anon stragglers.
 */
test.use({ storageState: { cookies: [], origins: [] } });

function freshEmail(tag: string): string {
  return `e2e-h004-${tag}-${Date.now()}@fringeisland.test`;
}

// TASK-E2E-04 — bounded to this spec's own Mists; see entry.spec.ts.
let specStart: string;

test.beforeAll(async () => {
  specStart = await anonymousSweepWatermark();
});

test.afterAll(async () => {
  await cleanupAnonymousUsers(createAdminClient(), { since: specStart });
});

test('become-a-FIM in place: Mist -> credentials + consent -> the carried walk RESUMES (continuity)', async ({
  page,
}) => {
  const email = freshEmail('transcend');
  const admin = createAdminClient();
  try {
    // Labelled adaptation (FEAT-H023, Cycle J-E): a fresh Mist now arrives
    // THROUGH the front door — wait for the auto-launch to settle before
    // navigating, then reach the flow from the Mist landing (no re-launch:
    // the enrolment exists).
    await page.goto('/');
    await page.getByRole('button', { name: /look around/i }).click();
    await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+\/play/, { timeout: 30000 });

    await page.goto('/mist');
    await page.getByRole('link', { name: /become a fim/i }).click();
    await expect(page).toHaveURL(/\/become-a-fim/, { timeout: 10000 });

    await page.locator('#fullName').fill('Mae Jemison');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('Transcend123!@#');
    await page.getByTestId('consent-checkbox').check();
    await page.getByRole('button', { name: /become a fim/i }).click();

    // Continuity — the same session, continued. FEAT-H023 STORY-4: the Mist
    // was mid-onboarding, so the landing RESUMES the carried walk in the
    // player (the /groups + "No groups yet" landing now belongs to travellers
    // with nothing to resume — asserted in onboarding-arrival.spec's
    // completed-walk coverage at unit tier).
    await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+\/play/, { timeout: 20000 });
    await expect(page.getByTestId('journey-player')).toBeVisible({ timeout: 15000 });

    // TASK-TRX-01/02 (2026-08-13): the ENTERED identity is the FIM's identity —
    // the header label renders the nickname (first token of the entered name),
    // never the Mist default. Pre-fix, transcendence left full_name='Mist' and
    // this header read "Mist" (red demonstrated at the integration tier; the
    // migration was applied before this journey-level extension, so this cell
    // is the observable-effect proof, not the red demonstration).
    await expect(page.getByText('Mae', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Mist', { exact: true })).not.toBeVisible();
  } finally {
    await deleteTranscendedUser(admin, email);
  }
});

test('the consent gate blocks transcendence (no consent -> stays on the flow)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /look around/i }).click();
  // FEAT-H023: let the arrival auto-launch settle, then reach the flow.
  await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+\/play/, { timeout: 30000 });
  await page.goto('/mist');
  await page.getByRole('link', { name: /become a fim/i }).click();
  await expect(page).toHaveURL(/\/become-a-fim/, { timeout: 10000 });

  await page.locator('#fullName').fill('No Consent');
  await page.locator('#email').fill(freshEmail('noconsent'));
  await page.locator('#password').fill('Transcend123!@#');
  // Leave the consent box unchecked.
  await page.getByRole('button', { name: /become a fim/i }).click();

  await expect(page.getByTestId('inline-error')).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/\/become-a-fim/);
});

test('the farewell erases the Mist and returns to the sessionless entry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /look around/i }).click();
  // FEAT-H023: let the arrival auto-launch settle; the Mist landing stays
  // reachable (no re-launch — the enrolment exists).
  await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+\/play/, { timeout: 30000 });
  await page.goto('/mist');

  await page.getByRole('button', { name: /say goodbye/i }).click();
  await expect(page.getByTestId('confirm-modal')).toBeVisible();
  await page.getByTestId('confirm-modal-confirm').click();

  // Back to the sessionless entry — "Look around" is offered again (a later return
  // is a new Mist; nothing from the erased visit is kept).
  await expect(page.getByRole('button', { name: /look around/i })).toBeVisible({ timeout: 20000 });
});
