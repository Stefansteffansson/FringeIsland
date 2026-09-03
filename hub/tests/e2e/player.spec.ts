import { test, expect } from '@playwright/test';
import { createAdminClient, SESSION_EMAIL } from './helpers/auth';

/**
 * FEAT-H020 — the journey player (JRN-6/7/8/9) end-to-end, against the live
 * FEAT-PD003 contracts (get_player_state / enter_journey_step /
 * complete_journey_step) on the migrated dev substrate. Authenticated as the
 * shared e2e-session FIM (global-setup storageState) — the suite's dedicated
 * test user, never a real account.
 *
 * One focused walk on a DEDICATED seeded journey (five required steps):
 * catalogue -> detail -> self-enrol -> enter via Continue -> boot resumes
 * at the first (incomplete) step -> complete step 1 (the ask-verb affordance,
 * the rail tick confirms the landed write) -> advance (the click auto-saves
 * engagement with step 2, JRN-9) -> leave the player entirely -> re-enter
 * through the catalogue -> the boot resumes at step 2 (latest open engagement
 * / first incomplete, Q6) -> walk onto step 3 and see it gated behind the
 * required step 2 with the reason naming it (JRN-8).
 *
 * A second arc covers the FEAT-PD003 re-enrolment amendment (Stefan's finding):
 * walk to step 2, WITHDRAW from the detail page (the enrolment goes terminal
 * 'withdrawn', instances survive as lived history), confirm the not-enrolled
 * posture returns, then RE-ENROL — the substrate reactivates the SAME withdrawn
 * row (never a fresh start), so Continue resumes at step 2 with step 1 still
 * ticked. Withdraw-then-restart would have reset to step 1; this proves it doesn't.
 *
 * TASK-E2E-04 (2026-09-03, labelled test maintenance): this spec walked the
 * pre-2026-08-12 seed journey the Phase-4 reseed removed (TASK-E2E-04 names it) —
 * both cells sat red for three weeks because E2E is not in
 * CI. It now seeds its own five-step journey by title in beforeAll and tears
 * it down by title (the pattern the later journey specs follow), purging only
 * the fixture's enrolments between the arcs — the session FIM's onboarding
 * enrolment is never touched, so no arrived-once re-arm is needed.
 */

const OWNER_GROUP = 'E2E H020 Player Owner';
const JOURNEY = 'E2E H020 Player Walk';
const STEP1 = 'Player Marker One';
const STEP2 = 'Player Marker Two';
const STEP3 = 'Player Marker Three';
const STEPS = [STEP1, STEP2, STEP3, 'Player Marker Four', 'Player Marker Five'];

let journeyId: string;

/** Id-independent teardown (by title/name) — safe before seeding and after. */
async function teardownFixture(): Promise<void> {
  const admin = createAdminClient();
  const { data: journeys } = await admin.from('journeys').select('id').eq('title', JOURNEY);
  for (const j of journeys ?? []) {
    const jid = j.id as string;
    // Enrolment deletion cascades journey_step_instances (the progress grain).
    await admin.from('journey_enrollments').delete().eq('journey_id', jid);
    await admin.from('journey_steps').delete().eq('journey_id', jid);
  }
  await admin.from('journeys').delete().eq('title', JOURNEY);
  await admin.from('groups').delete().eq('name', OWNER_GROUP);
}

async function seedFixture(): Promise<void> {
  const admin = createAdminClient();
  const { data: group, error: gErr } = await admin
    .from('groups')
    .insert({
      name: OWNER_GROUP,
      description: 'FEAT-H020 E2E fixture owner',
      group_type: 'engagement',
      is_public: false,
      show_member_list: false,
    })
    .select('id')
    .single();
  if (gErr) throw new Error(`seedFixture group: ${gErr.message}`);
  const ownerG = group!.id as string;

  const { data: journey, error: jErr } = await admin
    .from('journeys')
    .insert({
      title: JOURNEY,
      description: 'FEAT-H020 E2E player fixture — five required steps.',
      created_by_group_id: ownerG,
      is_published: true,
      is_public: true,
      journey_type: 'predefined',
      difficulty_level: 'beginner',
      estimated_duration_minutes: 25,
      tags: ['h020-e2e'],
      content: null,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (jErr) throw new Error(`seedFixture journey: ${jErr.message}`);
  journeyId = journey!.id as string;

  const { error: sErr } = await admin.from('journey_steps').insert(
    STEPS.map((title, i) => ({
      journey_id: journeyId,
      step_order: i + 1,
      title,
      step_kind_key: 'narrative',
      content_family_key: 'witness',
      required: true,
      repeatable: false,
      duration_minutes: 5,
      content: { body: `${title} — E2E fixture step` },
    })),
  );
  if (sErr) throw new Error(`seedFixture steps: ${sErr.message}`);
}

/** Between the arcs: only the fixture's enrolments go (instances cascade). */
async function purgeFixtureEnrollments(): Promise<void> {
  const admin = createAdminClient();
  if (journeyId) await admin.from('journey_enrollments').delete().eq('journey_id', journeyId);
}

test.describe('FEAT-H020 — journey player: enrol, walk, resume, gating', () => {
  test.beforeAll(async () => {
    const admin = createAdminClient();
    await admin
      .from('users')
      .update({ is_active: true, is_decommissioned: false })
      .eq('email', SESSION_EMAIL);
    await teardownFixture();
    await seedFixture();
  });

  test.afterEach(async () => {
    await purgeFixtureEnrollments();
  });

  test.afterAll(async () => {
    await teardownFixture();
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

  test('withdraw then re-enrol reactivates the enrolment and resumes, not restarts', async ({
    page,
  }) => {
    // Enrol and walk to step 2 (condensed arc from the first test).
    await page.goto('/journeys');
    await page.getByRole('link', { name: JOURNEY }).click();
    await page.getByTestId('enroll-self').click();
    await expect(page.getByTestId('enrolled-individually')).toBeVisible();
    await page.getByTestId('continue-individual').click();
    await page.waitForURL(/\/play\?enrollment=/);

    const canvas = page.getByTestId('step-canvas');
    await expect(canvas).toContainText(STEP1);
    await page.getByTestId('step-complete').click();
    await expect(page.getByTestId('rail-tick')).toHaveCount(1);

    const [enterResp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/steps\/[0-9a-f-]+\/enter$/.test(r.url()) && r.request().method() === 'POST',
      ),
      page.getByTestId('player-next').click(),
    ]);
    expect(enterResp.ok()).toBeTruthy();
    await expect(canvas).toContainText(STEP2);

    // Back on the detail page, WITHDRAW behind the destructive ConfirmModal.
    await page.goto('/journeys');
    await page.getByRole('link', { name: JOURNEY }).click();
    await expect(page.getByTestId('enrolled-individually')).toBeVisible();
    await page.getByTestId('withdraw-self').click();
    await expect(page.getByTestId('confirm-modal')).toBeVisible();
    await page.getByTestId('confirm-modal-confirm').click();

    // The not-enrolled posture returns — the Start affordance is back.
    await expect(page.getByTestId('enroll-self')).toBeVisible();
    await expect(page.getByTestId('enrolled-individually')).toHaveCount(0);

    // RE-ENROL. The amendment reactivates the SAME withdrawn row; instances carry.
    await page.getByTestId('enroll-self').click();
    await expect(page.getByTestId('enrolled-individually')).toBeVisible();

    // Continue back in: the player RESUMES at step 2 (not step 1) with step 1 ticked.
    await page.getByTestId('continue-individual').click();
    await page.waitForURL(/\/play\?enrollment=/);
    await expect(page.getByTestId('step-canvas')).toContainText(STEP2);
    await expect(page.getByTestId('rail-tick')).toHaveCount(1);
  });
});
