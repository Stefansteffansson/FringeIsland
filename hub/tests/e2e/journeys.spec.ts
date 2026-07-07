import { test, expect } from '@playwright/test';
import { createAdminClient, SESSION_EMAIL } from './helpers/auth';

/**
 * FEAT-H019 — the journeys surface (JRN-1/2/3/4 + the GRP-4 seam) E2E,
 * against the live FEAT-PD002 contracts. Authenticated as the shared
 * e2e-session FIM (global-setup storageState). Two critical journeys:
 *  1. solo: catalogue → detail (steps overview) → Start → Enrolled badge →
 *     Withdraw (destructive ConfirmModal) → badge gone;
 *  2. wielded: create a group → enrol it from the journey page (the picker
 *     offers exactly the payload's groups; the confirm names the group) →
 *     the group page's journeys section lists it → withdraw the group.
 * Cleanup purges the session FIM's enrolments and the E2E group either side
 * so re-runs stay honest.
 */

const E2E_GROUP = 'E2E Journey Party';

async function purgeJourneyState(): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('email', SESSION_EMAIL)
    .maybeSingle();
  const gid = data?.personal_group_id as string | undefined;
  if (gid) {
    await admin.from('journey_enrollments').delete().eq('group_id', gid);
  }
  await admin.from('groups').delete().eq('name', E2E_GROUP);
}

test.describe('FEAT-H019 — journey catalogue & enrolment', () => {
  test.beforeAll(async () => {
    const admin = createAdminClient();
    await admin
      .from('users')
      .update({ is_active: true, is_decommissioned: false })
      .eq('email', SESSION_EMAIL);
    await purgeJourneyState();
  });

  test.afterAll(async () => {
    await purgeJourneyState();
  });

  test('solo travel: browse → open → start → badged → withdraw', async ({ page }) => {
    await page.goto('/journeys');
    await expect(page.getByRole('heading', { name: 'Journeys', exact: true })).toBeVisible();

    // JRN-1: the seeded catalogue renders as cards.
    const list = page.getByTestId('journeys-list');
    await expect(list).toBeVisible();
    const card = page.getByRole('link', { name: 'Personal Development Kickstart' });
    await expect(card).toBeVisible();

    // JRN-2: detail — fields + the steps overview (no step content).
    await card.click();
    await expect(
      page.getByRole('heading', { name: 'Personal Development Kickstart' }),
    ).toBeVisible();
    await expect(page.getByTestId('steps-overview')).toBeVisible();

    // JRN-3: start; the affordance becomes the enrolled state on re-read.
    await page.getByTestId('enroll-self').click();
    await expect(page.getByTestId('enrolled-individually')).toBeVisible();

    // The catalogue badge reflects the enrolment.
    await page.goto('/journeys');
    await expect(page.getByTestId('enrolled-badge')).toBeVisible();

    // STORY-5: withdraw behind the destructive ConfirmModal; badge clears.
    await page.getByRole('link', { name: 'Personal Development Kickstart' }).click();
    await page.getByTestId('withdraw-self').click();
    await expect(page.getByTestId('confirm-modal')).toBeVisible();
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByTestId('enroll-self')).toBeVisible();
    await page.goto('/journeys');
    await expect(page.getByTestId('enrolled-badge')).toHaveCount(0);
  });

  test('the wielding walk: enrol a group, the group page tells it, withdraw the group', async ({
    page,
  }) => {
    // Create the party (the session FIM stewards it — creator binding);
    // the groups.spec flow: open the panel, name it, Create, land in it.
    await page.goto('/groups');
    await page.getByRole('button', { name: /create group/i }).click();
    await page.getByLabel(/group name/i).fill(E2E_GROUP);
    await page.getByRole('button', { name: /^create$/i }).click();
    await page.waitForURL(/\/groups\/[0-9a-f-]+/);
    const groupUrl = page.url();

    // JRN-4: from the journey page, the picker offers exactly the payload's
    // groups; the confirm names the group (the wielding walk).
    await page.goto('/journeys');
    await page.getByRole('link', { name: 'Effective Communication Skills' }).click();
    await page.getByTestId('enroll-group-open').click();
    const option = page.getByTestId('enroll-group-option').filter({ hasText: E2E_GROUP });
    await expect(option).toBeVisible();
    await option.click();
    const modal = page.getByTestId('confirm-modal');
    await expect(modal).toContainText(E2E_GROUP);
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByText(`Travelling via ${E2E_GROUP}`)).toBeVisible();

    // STORY-6: the group page's journeys section lists the enrolment.
    await page.goto(groupUrl);
    const section = page.getByTestId('group-journeys');
    await expect(section).toBeVisible();
    await expect(section).toContainText('Effective Communication Skills');

    // Withdraw the group (the session FIM holds the Steward key).
    await page.goto('/journeys');
    await page.getByRole('link', { name: 'Effective Communication Skills' }).click();
    await page.getByTestId('withdraw-group').click();
    await expect(page.getByTestId('confirm-modal')).toContainText(E2E_GROUP);
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByTestId('withdraw-group')).toHaveCount(0);
  });
});
