import { test, expect, type Browser } from '@playwright/test';
import { openAs, evidence, type Actor } from './helpers/cast';

/**
 * DB-4 live walk — Leg 5: *Holds & sanctions* renders locked-on with a reason
 * and no toggle (FEAT-H033 + FEAT-H049 STORY-4).
 * Script: docs/planning/hub-v2/2026-09-05-db4-walk-legs-4-5-6-8.md.
 *
 * Actor: Wanda in B. Muting a category writes `set_own_notification_preference`;
 * a locked-on category has no write path at all — that is the proof.
 */

test.describe.configure({ mode: 'serial' });

let wanda: Actor;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  wanda = await openAs(browser, 'wanda');
});

test.afterAll(async () => {
  await wanda?.context.close();
});

test.describe('Leg 5 — preferences: Holds & sanctions locked on, with a reason', () => {
  test('step 1 — B: sign in as Wanda → the preferences surface', async () => {
    await wanda.page.goto('/notifications/preferences');
    await expect(wanda.page.locator('[data-testid^="pref-toggle-"]').first()).toBeVisible({ timeout: 20_000 });
    await evidence(wanda.page, 'leg5 step1 preferences');
  });

  test('step 2 — the locked rows: Holds & sanctions and Account & participation state, the sentence, no switch; no email column', async () => {
    // The locked chip carries the test id; the sentence is its row's — the row is
    // the <li> that holds both (the label, the sentence, the chip; no switch).
    const rows: Array<[string, RegExp]> = [
      ['sanctions', /holds & sanctions/i],
      ['account', /account & participation state/i],
    ];
    for (const [category, label] of rows) {
      const locked = wanda.page.getByTestId(`pref-locked-${category}-in_app`);
      await expect(locked).toBeVisible();
      const row = locked.locator('xpath=ancestor::li[1]');
      await expect(row).toContainText(label);
      await expect(row).toContainText(/always on — this one can.t be switched off/i);
      await expect(row.getByRole('switch')).toHaveCount(0);
      await expect(wanda.page.getByTestId(`pref-toggle-${category}-in_app`)).toHaveCount(0);
    }
    await expect(wanda.page.getByText(/not live yet/i)).toBeVisible();
    await expect(wanda.page.locator('[data-testid$="-email"][data-testid^="pref-toggle-"]')).toHaveCount(0);
    await evidence(wanda.page, 'leg5 step2 locked rows');
  });

  test('step 3 — a row that has a switch: off, reload, still off (the write landed); back on', async () => {
    const toggle = wanda.page.getByTestId('pref-toggle-journeys-in_app');
    await expect(toggle).toBeVisible();
    await expect(toggle).toBeChecked();

    const saved = wanda.page.waitForResponse(
      (r) => r.url().includes('/api/notifications/preferences') && r.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    expect((await saved).ok()).toBe(true);

    await wanda.page.reload();
    await expect(wanda.page.getByTestId('pref-toggle-journeys-in_app')).not.toBeChecked({ timeout: 20_000 });
    await evidence(wanda.page, 'leg5 step3 muted persists');

    const restored = wanda.page.waitForResponse(
      (r) => r.url().includes('/api/notifications/preferences') && r.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await wanda.page.getByTestId('pref-toggle-journeys-in_app').click();
    await expect(wanda.page.getByTestId('pref-toggle-journeys-in_app')).toBeChecked();
    expect((await restored).ok()).toBe(true);
  });

  test('step 4 — the negative: no way to mute Holds & sanctions from this surface, the bell, or the account page', async () => {
    await expect(wanda.page.locator('[data-testid^="pref-toggle-sanctions"]')).toHaveCount(0);
    await wanda.page.getByTestId('notification-bell').click();
    await expect(wanda.page.getByTestId('notification-dropdown')).toBeVisible();
    await expect(wanda.page.locator('[data-testid^="pref-toggle-sanctions"]')).toHaveCount(0);
    await evidence(wanda.page, 'leg5 step4 the bell');
    await wanda.page.goto('/account');
    await expect(wanda.page.locator('[data-testid^="pref-toggle-sanctions"]')).toHaveCount(0);
    await expect(wanda.page.getByText(/holds & sanctions/i)).toHaveCount(0);
    await evidence(wanda.page, 'leg5 step4 the account page');
  });
});
