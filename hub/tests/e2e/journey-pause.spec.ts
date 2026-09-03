import { test, expect } from '@playwright/test';
import { createAdminClient } from './helpers/auth';

/**
 * FEAT-H019 STORY-8 (TASK-JRN-PAUSE-01) — pause in the player, resume from the
 * list, position carried. Against the live FEAT-PD002 STORY-8 contracts
 * (pause_journey_enrollment / resume_journey_enrollment) on the applied
 * substrate. Authenticated as the shared e2e-session FIM (global-setup
 * storageState).
 *
 * One arc on a DEDICATED seeded journey (never the live seed set, and never a
 * sibling spec's fixture — the J-B retro trap): catalogue -> detail -> self-
 * enrol -> Continue -> complete step 1 -> advance to step 2 -> PAUSE in the
 * player (no ConfirmModal; the honest paused panel replaces the canvas) ->
 * /journeys shows "(paused)" + Resume and NO Continue -> Resume from the card
 * -> Continue returns -> re-enter -> the canvas is on step 2 with step 1 still
 * ticked. The pause held nothing back and lost nothing.
 *
 * Teardown is id-independent (by title) — safe before seeding and after.
 */

const JOURNEY_TITLE = 'E2E Pause Arc';
const OWNER_GROUP = 'E2E Pause Arc Owner';
const STEP1 = 'Pause Marker One';
const STEP2 = 'Pause Marker Two';
const STEP3 = 'Pause Marker Three';

let journeyId: string;

async function teardownFixture(): Promise<void> {
  const admin = createAdminClient();
  const { data: journeys } = await admin.from('journeys').select('id').eq('title', JOURNEY_TITLE);
  for (const j of journeys ?? []) {
    const jid = j.id as string;
    await admin.from('journey_enrollments').delete().eq('journey_id', jid);
    await admin.from('journey_steps').delete().eq('journey_id', jid);
  }
  await admin.from('journeys').delete().eq('title', JOURNEY_TITLE);
  await admin.from('groups').delete().eq('name', OWNER_GROUP);
}

async function seedFixture(): Promise<void> {
  const admin = createAdminClient();
  const { data: group, error: gErr } = await admin
    .from('groups')
    .insert({
      name: OWNER_GROUP,
      description: 'FEAT-H019 STORY-8 E2E fixture owner',
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
      title: JOURNEY_TITLE,
      description: 'FEAT-H019 STORY-8 E2E pause/resume fixture — three required steps.',
      created_by_group_id: ownerG,
      is_published: true,
      is_public: true,
      journey_type: 'predefined',
      difficulty_level: 'beginner',
      estimated_duration_minutes: 15,
      tags: ['jrn-pause-e2e'],
      content: null,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (jErr) throw new Error(`seedFixture journey: ${jErr.message}`);
  journeyId = journey!.id as string;

  const { error: sErr } = await admin.from('journey_steps').insert(
    [STEP1, STEP2, STEP3].map((title, i) => ({
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

test.describe('FEAT-H019 STORY-8 — pause in the player, resume from the list, position carried', () => {
  test.beforeAll(async () => {
    await teardownFixture();
    await seedFixture();
  });

  test.afterAll(async () => {
    await teardownFixture();
  });

  test('pause -> "(paused)" + Resume on the card -> resume -> the walk continues at step 2', async ({ page }) => {
    // Catalogue -> detail -> self-enrol -> the player.
    await page.goto('/journeys');
    await page.getByRole('link', { name: JOURNEY_TITLE }).click();
    await expect(page.getByRole('heading', { name: JOURNEY_TITLE, exact: true })).toBeVisible();
    await page.getByTestId('enroll-self').click();
    await expect(page.getByTestId('enrolled-individually')).toBeVisible();
    await page.getByTestId('continue-individual').click();
    await page.waitForURL(/\/play\?enrollment=/);
    await expect(page.getByTestId('journey-player')).toBeVisible();

    // Walk: complete step 1, advance onto step 2 (the auto-save lands).
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

    // PAUSE in the player — no modal; the honest paused panel replaces the canvas.
    await page.getByTestId('player-pause').click();
    await expect(page.getByTestId('player-paused')).toBeVisible();
    await expect(page.getByTestId('player-resume')).toBeVisible();
    await expect(page.getByTestId('step-canvas')).toHaveCount(0);

    // The list tells it: "(paused)" + Resume, never Continue.
    await page.goto('/journeys');
    const card = page.getByTestId(`journey-card-${journeyId}`);
    await expect(card.getByTestId('card-paused')).toBeVisible();
    await expect(card.getByTestId('card-resume')).toBeVisible();
    await expect(card.getByTestId('card-continue')).toHaveCount(0);

    // RESUME from the card — Continue returns on re-read.
    await page.getByTestId('card-resume').click();
    await expect(card.getByTestId('card-continue')).toBeVisible();
    await expect(card.getByTestId('card-paused')).toHaveCount(0);

    // Re-enter: the walk is exactly where it stopped — step 2, step 1 ticked.
    await card.getByTestId('card-continue').click();
    await page.waitForURL(/\/play\?enrollment=/);
    await expect(page.getByTestId('journey-player')).toBeVisible();
    await expect(page.getByTestId('step-canvas')).toContainText(STEP2);
    await expect(page.getByTestId('rail-tick')).toHaveCount(1);
    await expect(page.getByTestId('player-pause')).toBeVisible();
  });
});
