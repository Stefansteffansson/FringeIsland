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
 *
 * TASK-E2E-04 (2026-09-03, labelled test maintenance): this spec walked the
 * pre-2026-08-12 seed titles (two journeys the Phase-4 reseed removed —
 * see TASK-E2E-04 for the names), which is why four cells sat
 * red for three weeks because E2E is not in CI. It now seeds two DEDICATED
 * journeys by title in beforeAll and tears them down by title (the pattern
 * the later journey specs already follow), never touching the live seed set
 * (the one database is production). Assertions keep their intent.
 */

const E2E_GROUP = 'E2E Journey Party';
const OWNER_GROUP = 'E2E H019 Journey Owner';
const SOLO_JOURNEY = 'E2E H019 Solo Walk';
const GROUP_JOURNEY = 'E2E H019 Group Walk';

async function seedJourney(title: string, ownerG: string): Promise<string> {
  const admin = createAdminClient();
  const { data: journey, error: jErr } = await admin
    .from('journeys')
    .insert({
      title,
      description: `${title} — FEAT-H019 E2E fixture, three steps.`,
      created_by_group_id: ownerG,
      is_published: true,
      is_public: true,
      journey_type: 'predefined',
      difficulty_level: 'beginner',
      estimated_duration_minutes: 15,
      tags: ['h019-e2e'],
      content: null,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (jErr) throw new Error(`seedJourney(${title}): ${jErr.message}`);
  const journeyId = journey!.id as string;
  const { error: sErr } = await admin.from('journey_steps').insert(
    ['One', 'Two', 'Three'].map((n, i) => ({
      journey_id: journeyId,
      step_order: i + 1,
      title: `${title} Step ${n}`,
      step_kind_key: 'narrative',
      content_family_key: 'witness',
      required: true,
      repeatable: false,
      duration_minutes: 5,
      content: { body: `${title} step ${n} — E2E fixture` },
    })),
  );
  if (sErr) throw new Error(`seedJourney steps(${title}): ${sErr.message}`);
  return journeyId;
}

/** Id-independent teardown (by title/name) — safe to run before seeding and after. */
async function teardownFixture(): Promise<void> {
  const admin = createAdminClient();
  const { data: journeys } = await admin
    .from('journeys')
    .select('id')
    .in('title', [SOLO_JOURNEY, GROUP_JOURNEY]);
  for (const j of journeys ?? []) {
    const jid = j.id as string;
    await admin.from('journey_enrollments').delete().eq('journey_id', jid);
    await admin.from('journey_steps').delete().eq('journey_id', jid);
  }
  await admin.from('journeys').delete().in('title', [SOLO_JOURNEY, GROUP_JOURNEY]);
  await admin.from('groups').delete().eq('name', E2E_GROUP);
  await admin.from('groups').delete().eq('name', OWNER_GROUP);
}

async function seedFixture(): Promise<void> {
  const admin = createAdminClient();
  const { data: group, error: gErr } = await admin
    .from('groups')
    .insert({
      name: OWNER_GROUP,
      description: 'FEAT-H019 E2E fixture owner',
      group_type: 'engagement',
      is_public: false,
      show_member_list: false,
    })
    .select('id')
    .single();
  if (gErr) throw new Error(`seedFixture owner group: ${gErr.message}`);
  const ownerG = group!.id as string;
  await seedJourney(SOLO_JOURNEY, ownerG);
  await seedJourney(GROUP_JOURNEY, ownerG);
}

test.describe('FEAT-H019 — journey catalogue & enrolment', () => {
  test.beforeAll(async () => {
    const admin = createAdminClient();
    await admin
      .from('users')
      .update({ is_active: true, is_decommissioned: false })
      .eq('email', SESSION_EMAIL);
    await teardownFixture();
    await seedFixture();
  });

  test.afterAll(async () => {
    await teardownFixture();
  });

  test('solo travel: browse → open → start → badged → withdraw', async ({ page }) => {
    await page.goto('/journeys');
    await expect(page.getByRole('heading', { name: 'Journeys', exact: true })).toBeVisible();

    // JRN-1: the catalogue renders as cards — the fixture journey among them.
    const list = page.getByTestId('journeys-list');
    await expect(list).toBeVisible();
    const card = page.getByRole('link', { name: SOLO_JOURNEY });
    await expect(card).toBeVisible();

    // JRN-2: detail — fields + the steps overview (no step content).
    await card.click();
    await expect(page.getByRole('heading', { name: SOLO_JOURNEY })).toBeVisible();
    await expect(page.getByTestId('steps-overview')).toBeVisible();

    // JRN-3: start; the affordance becomes the enrolled state on re-read.
    await page.getByTestId('enroll-self').click();
    await expect(page.getByTestId('enrolled-individually')).toBeVisible();

    // The catalogue badge reflects the enrolment — scoped to the fixture card
    // (the session FIM also carries its onboarding enrolment; a global badge
    // locator would honestly find two).
    await page.goto('/journeys');
    const soloCard = page
      .getByTestId('journeys-list')
      .locator('li')
      .filter({ has: page.getByRole('link', { name: SOLO_JOURNEY }) });
    await expect(soloCard.getByTestId('enrolled-badge')).toBeVisible();

    // STORY-5: withdraw behind the destructive ConfirmModal; badge clears.
    await page.getByRole('link', { name: SOLO_JOURNEY }).click();
    await page.getByTestId('withdraw-self').click();
    await expect(page.getByTestId('confirm-modal')).toBeVisible();
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByTestId('enroll-self')).toBeVisible();
    await page.goto('/journeys');
    await expect(
      page
        .getByTestId('journeys-list')
        .locator('li')
        .filter({ has: page.getByRole('link', { name: SOLO_JOURNEY }) })
        .getByTestId('enrolled-badge'),
    ).toHaveCount(0);
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
    await page.getByRole('link', { name: GROUP_JOURNEY }).click();
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
    await expect(section).toContainText(GROUP_JOURNEY);

    // Withdraw the group (the session FIM holds the Steward key).
    await page.goto('/journeys');
    await page.getByRole('link', { name: GROUP_JOURNEY }).click();
    await page.getByTestId('withdraw-group').click();
    await expect(page.getByTestId('confirm-modal')).toContainText(E2E_GROUP);
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByTestId('withdraw-group')).toHaveCount(0);
  });
});
