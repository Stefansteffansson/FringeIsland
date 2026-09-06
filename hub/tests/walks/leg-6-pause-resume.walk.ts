import { test, expect, type Browser } from '@playwright/test';
import { openAs, evidence, type Actor } from './helpers/cast';

/**
 * DB-4 live walk — Leg 6: pause in the player, resume from the list, position
 * carried (FEAT-H019 STORY-8, TASK-JRN-PAUSE-01).
 * Script: docs/planning/hub-v2/2026-09-05-db4-walk-legs-4-5-6-8.md.
 *
 * Actor: Kalle in B, on his own active walk (the cast's arrival latch on the
 * onboarding-designated journey). `pause_journey_enrollment` moves it
 * active → paused and touches no progress; `resume_journey_enrollment` moves
 * it back. Re-runnable: the leg completes whatever step Kalle is on and
 * proves the position it then reaches is the one the player reopens at.
 */

test.describe.configure({ mode: 'serial' });

let kalle: Actor;
let journeyId: string;
let positionText: string;
let ticksAtPause: number;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  kalle = await openAs(browser, 'kalle');
});

test.afterAll(async () => {
  await kalle?.context.close();
});

test.describe('Leg 6 — pause in the player, resume from the list, position carried', () => {
  test('step 1 — B: Kalle\'s own walk shows Continue → the player opens', async () => {
    await kalle.page.goto('/journeys');
    const card = kalle.page.locator('[data-testid^="journey-card-"]').filter({ has: kalle.page.getByTestId('card-continue') }).first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    journeyId = (await card.getAttribute('data-testid'))!.replace('journey-card-', '');
    await evidence(kalle.page, 'leg6 step1 journeys list continue');
    await card.getByTestId('card-continue').click();
    await kalle.page.waitForURL(/\/play\?enrollment=/, { timeout: 20_000 });
    await expect(kalle.page.getByTestId('journey-player')).toBeVisible();
  });

  test('step 2 — B: complete the current step and advance, so there is a position to carry', async () => {
    const canvas = kalle.page.getByTestId('step-canvas');
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    const ticksBefore = await kalle.page.getByTestId('rail-tick').count();
    const complete = kalle.page.getByTestId('step-complete');
    if (await complete.count()) {
      await complete.click();
      await expect(kalle.page.getByTestId('rail-tick')).toHaveCount(ticksBefore + 1, { timeout: 20_000 });
    }
    const before = (await canvas.textContent()) ?? '';
    const [enter] = await Promise.all([
      kalle.page.waitForResponse((r) => r.request().method() !== 'GET' && r.url().includes('/api/'), { timeout: 20_000 }),
      kalle.page.getByTestId('player-next').click(),
    ]);
    expect(enter.ok()).toBeTruthy();
    await expect(canvas).not.toHaveText(before, { timeout: 20_000 });
    positionText = ((await canvas.locator('h1, h2, h3').first().textContent()) ?? '').trim();
    ticksAtPause = await kalle.page.getByTestId('rail-tick').count();
    expect(positionText.length).toBeGreaterThan(0);
    await evidence(kalle.page, `leg6 step2 at ${positionText}`);
  });

  test('step 3 — B: Pause → "Resume whenever you are ready…" with a Resume control; no confirm modal', async () => {
    await kalle.page.getByTestId('player-pause').click();
    await expect(kalle.page.getByTestId('player-paused')).toBeVisible({ timeout: 20_000 });
    await expect(kalle.page.getByTestId('player-paused')).toContainText(/resume whenever you are ready/i);
    await expect(kalle.page.getByTestId('player-resume')).toBeVisible();
    await expect(kalle.page.getByTestId('step-canvas')).toHaveCount(0);
    await expect(kalle.page.getByTestId('confirm-modal')).toHaveCount(0);
    await evidence(kalle.page, 'leg6 step3 paused in the player');
  });

  test('step 4 — B: /journeys → the card reads (paused) with Resume, never Continue', async () => {
    await kalle.page.goto('/journeys');
    const card = kalle.page.getByTestId(`journey-card-${journeyId}`);
    await expect(card.getByTestId('card-paused')).toBeVisible({ timeout: 20_000 });
    await expect(card.getByTestId('card-paused')).toContainText(/paused/i);
    await expect(card.getByTestId('card-resume')).toBeVisible();
    await expect(card.getByTestId('card-continue')).toHaveCount(0);
    await evidence(kalle.page, 'leg6 step4 card paused with resume');
  });

  test('step 5 — B: Resume from the list → the player opens at the carried position, the completed step still completed', async () => {
    const card = kalle.page.getByTestId(`journey-card-${journeyId}`);
    await card.getByTestId('card-resume').click();
    await expect(card.getByTestId('card-continue')).toBeVisible({ timeout: 20_000 });
    await expect(card.getByTestId('card-paused')).toHaveCount(0);
    await card.getByTestId('card-continue').click();
    await kalle.page.waitForURL(/\/play\?enrollment=/, { timeout: 20_000 });
    await expect(kalle.page.getByTestId('journey-player')).toBeVisible();
    await expect(kalle.page.getByTestId('step-canvas')).toContainText(positionText, { timeout: 20_000 });
    await expect(kalle.page.getByTestId('rail-tick')).toHaveCount(ticksAtPause);
    await expect(kalle.page.getByTestId('player-pause')).toBeVisible();
    await evidence(kalle.page, 'leg6 step5 resumed at the carried position');
  });

  test('step 6 — B: a group\'s walk, if any, offers Kalle no Resume (own walks only)', async () => {
    await kalle.page.goto('/journeys');
    const groupPaused = kalle.page.locator('[data-testid^="journey-card-"]').filter({ hasText: /\(paused \(/ });
    const n = await groupPaused.count();
    for (let i = 0; i < n; i++) await expect(groupPaused.nth(i).getByTestId('card-resume')).toHaveCount(0);
    await evidence(kalle.page, `leg6 step6 group walks paused by a steward: ${n}`);
  });
});
