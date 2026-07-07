import { test, expect } from '@playwright/test';
import { createAdminClient, SESSION_EMAIL } from './helpers/auth';

/**
 * FEAT-H020 — the journey player (JRN-6/7/8/9) end-to-end, against the live
 * FEAT-PD003 contracts (get_player_state / enter_journey_step /
 * complete_journey_step) on the migrated dev substrate. Authenticated as the
 * shared e2e-session FIM (global-setup storageState) — the suite's dedicated
 * test user, never a real account.
 *
 * One focused walk on a seeded journey ("Leadership Fundamentals", five required
 * steps): catalogue -> detail -> self-enrol -> enter via Continue -> boot resumes
 * at the first (incomplete) step -> complete step 1 (the ask-verb affordance, the
 * rail tick confirms the landed write) -> advance (the click auto-saves engagement
 * with step 2, JRN-9) -> leave the player entirely -> re-enter through the
 * catalogue -> the boot resumes at step 2 (latest open engagement / first
 * incomplete, Q6) -> walk onto step 3 and see it gated behind the required step 2
 * with the reason naming it (JRN-8). Distinct journey from journeys.spec so the
 * two specs never contend for the session FIM's enrolments.
 *
 * Cleanup purges the session FIM's enrolments either side; step-instances ride the
 * enrolment's ON DELETE CASCADE (ADR-U031 erasure), so a re-run starts clean.
 */

const JOURNEY = 'Leadership Fundamentals';
const STEP1 = 'What is Leadership?';
const STEP2 = 'Self-Assessment: Your Leadership Style';
const STEP3 = 'Building Trust and Credibility';

async function purgePlayerState(): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('email', SESSION_EMAIL)
    .maybeSingle();
  const gid = data?.personal_group_id as string | undefined;
  if (gid) {
    // Enrolment deletion cascades journey_step_instances (the progress grain).
    await admin.from('journey_enrollments').delete().eq('group_id', gid);
  }
}

test.describe('FEAT-H020 — journey player: enrol, walk, resume, gating', () => {
  test.beforeAll(async () => {
    const admin = createAdminClient();
    await admin
      .from('users')
      .update({ is_active: true, is_decommissioned: false })
      .eq('email', SESSION_EMAIL);
    await purgePlayerState();
  });

  test.afterAll(async () => {
    await purgePlayerState();
  });

  test('enrol -> walk -> complete step -> leave -> resume -> gated step', async ({ page }) => {
    // Catalogue -> detail.
    await page.goto('/journeys');
    await page.getByRole('link', { name: JOURNEY }).click();
    await expect(page.getByRole('heading', { name: JOURNEY, exact: true })).toBeVisible();

    // Self-enrol; the enrolled state exposes the player entry (FEAT-H020 seam).
    await page.getByTestId('enroll-self').click();
    await expect(page.getByTestId('enrolled-individually')).toBeVisible();

    // Enter the player via Continue.
    await page.getByTestId('continue-individual').click();
    await page.waitForURL(/\/journeys\/[0-9a-f-]+\/play\?enrollment=/);
    await expect(page.getByTestId('journey-player')).toBeVisible();

    // Boot (one get_player_state read) resumes at the first, incomplete step; the
    // rail paints the whole journey with the required marks.
    const canvas = page.getByTestId('step-canvas');
    await expect(canvas).toContainText(STEP1);
    await expect(page.locator('[data-testid^="rail-step-"]')).toHaveCount(5);
    await expect(page.getByTestId('rail-required').first()).toBeVisible();

    // Complete step 1 via its ask-verb affordance. The optimistic mark paints, then
    // the re-read reconciles — the rail tick is the landed-write signal (invariant 4).
    await page.getByTestId('step-complete').click();
    await expect(page.getByTestId('step-completed')).toBeVisible();
    await expect(page.getByTestId('rail-tick')).toHaveCount(1);

    // Advance. The navigation click fires enter_journey_step as a background
    // auto-save (JRN-9) — assert it lands before we leave.
    const [enterResp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/steps\/[0-9a-f-]+\/enter$/.test(r.url()) && r.request().method() === 'POST',
      ),
      page.getByTestId('player-next').click(),
    ]);
    expect(enterResp.ok()).toBeTruthy();
    await expect(canvas).toContainText(STEP2);

    // Leave the player entirely (full navigation drops the in-memory cache), then
    // re-enter through the catalogue — the resume must come from the substrate.
    await page.goto('/journeys');
    await page.getByRole('link', { name: JOURNEY }).click();
    await page.getByTestId('continue-individual').click();
    await page.waitForURL(/\/play\?enrollment=/);

    // Resume lands on step 2 (latest open engagement / first incomplete, Q6);
    // step 1 stays ticked.
    await expect(page.getByTestId('step-canvas')).toContainText(STEP2);
    await expect(page.getByTestId('rail-tick')).toHaveCount(1);

    // Walk forward onto step 3 — gated behind the still-incomplete required step 2;
    // the affordance is disabled and the reason names the blocking predecessor.
    await page.getByTestId('player-next').click();
    await expect(page.getByTestId('step-canvas')).toContainText(STEP3);
    await expect(page.getByTestId('step-lock-reason')).toContainText(STEP2);
    await expect(page.getByTestId('step-complete')).toBeDisabled();
  });
});
