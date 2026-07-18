import { test, expect, type Page } from '@playwright/test';
import { createAdminClient, SESSION_EMAIL } from './helpers/auth';

/**
 * FEAT-H024 — the J-F arc end-to-end, against the live FEAT-PD007 contracts on
 * the migrated dev substrate: capture → complete → takeaways → review → revise
 * → download. Authenticated as the shared e2e-session FIM (global-setup
 * storageState) — never a real account.
 *
 * The arc needs a journey with a capture-bearing step CARRYING a takeaway and a
 * journey-level takeaway — none of the seeded journeys has one, so this spec
 * seeds its own (the player-completion-review idiom): a dedicated owner group +
 * a published/public journey with `takeaway` + two required steps
 * ([reflection-with-takeaway, narrative]) + an admin-seeded active enrolment
 * for the session FIM. Teardown is symmetric and id-independent.
 *
 * One arc, one witness:
 *  1. boot -> the reflection step offers the response input labelled by its own
 *     ask_verb; the narrative step (later) offers none — placement is the
 *     payload's captures_response, never a Hub kind list;
 *  2. type -> blur -> the quiet Saved indicator (background save, JRN-9);
 *     no takeaway shows pre-completion;
 *  3. complete the step -> its authored takeaway arrives (after, never before);
 *  4. complete the final step -> the completion panel carries the journey
 *     takeaway AND the returned review entry ("Look back over your journey" —
 *     the J-C summary-not-menu posture retired);
 *  5. follow the entry -> back at step one in review, the words prefilled and
 *     still editable -> revise -> Saved (completed is a living posture);
 *  6. full reload -> the revision survives (server truth, not client residue);
 *  7. download my data (the authenticated export route) -> the `journeys` key
 *     carries the walk with the revised words (STORY-6; the H010 flag live).
 *
 * The Mist onboarding capture (STORY-1's last AC) rides the existing
 * onboarding-arrival entry: a fresh sessionless context enters via "Look
 * around", writes into the onboarding journey's first capture-bearing step,
 * and sees it saved. (Mist sessions are left to the ADR-U033 reaper.)
 */

const JOURNEY_TITLE = 'E2E Response Capture Arc';
const OWNER_GROUP = 'E2E Response Capture Owner';
const STEP1 = 'Turning Inward';
const STEP2 = 'Closing Passage';
const STEP1_TAKEAWAY = 'What you wrote here is yours to keep.';
const JOURNEY_TAKEAWAY = 'The whole walk, gathered into one closing word.';
const WORDS_V1 = 'These are my honest first words.';
const WORDS_V2 = 'Revised on reflection, and better for it.';

let journeyId: string;
let enrollmentId: string;

async function sessionPersonalGroupId(): Promise<string | undefined> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('email', SESSION_EMAIL)
    .maybeSingle();
  return data?.personal_group_id as string | undefined;
}

/** Id-independent teardown (by title/name) — safe before seeding and after. */
async function teardownFixture(): Promise<void> {
  const admin = createAdminClient();
  const { data: journeys } = await admin
    .from('journeys')
    .select('id')
    .eq('title', JOURNEY_TITLE);
  for (const j of journeys ?? []) {
    const jid = j.id as string;
    await admin.from('journey_enrollments').delete().eq('journey_id', jid);
    await admin.from('journey_steps').delete().eq('journey_id', jid);
  }
  await admin.from('journeys').delete().eq('title', JOURNEY_TITLE);
  await admin.from('groups').delete().eq('name', OWNER_GROUP);

  const gid = await sessionPersonalGroupId();
  if (gid) {
    await admin
      .from('notifications')
      .delete()
      .eq('recipient_group_id', gid)
      .eq('type', 'journey_completed')
      .then(
        () => undefined,
        () => undefined,
      );
  }
}

async function seedFixture(): Promise<void> {
  const admin = createAdminClient();

  const { data: group, error: gErr } = await admin
    .from('groups')
    .insert({
      name: OWNER_GROUP,
      description: 'FEAT-H024 E2E fixture owner — JF-05',
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
      description: 'FEAT-H024 E2E capture/review fixture — reflection + narrative.',
      created_by_group_id: ownerG,
      is_published: true,
      is_public: true,
      journey_type: 'predefined',
      difficulty_level: 'beginner',
      estimated_duration_minutes: 10,
      tags: ['jf-05-e2e'],
      content: null,
      takeaway: { body: JOURNEY_TAKEAWAY },
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (jErr) throw new Error(`seedFixture journey: ${jErr.message}`);
  journeyId = journey!.id as string;

  const { error: sErr } = await admin.from('journey_steps').insert([
    {
      journey_id: journeyId,
      step_order: 1,
      title: STEP1,
      step_kind_key: 'reflection',
      content_family_key: 'reflect',
      required: true,
      repeatable: false,
      duration_minutes: 5,
      content: { body: `${STEP1} — what do you notice?`, takeaway: { body: STEP1_TAKEAWAY } },
    },
    {
      journey_id: journeyId,
      step_order: 2,
      title: STEP2,
      step_kind_key: 'narrative',
      content_family_key: 'witness',
      required: true,
      repeatable: false,
      duration_minutes: 5,
      content: { body: `${STEP2} — E2E fixture step` },
    },
  ]);
  if (sErr) throw new Error(`seedFixture steps: ${sErr.message}`);

  // The session FIM's own active walk — admin-seeded (the enrolment door is
  // J-A-tested; this arc is about what happens ON the walk).
  const gid = await sessionPersonalGroupId();
  if (!gid) throw new Error('seedFixture: session FIM has no personal group');
  const { data: enr, error: eErr } = await admin
    .from('journey_enrollments')
    .insert({
      journey_id: journeyId,
      group_id: gid,
      enrolled_by_group_id: gid,
      status: 'active',
      progress_data: {},
    })
    .select('id')
    .single();
  if (eErr) throw new Error(`seedFixture enrolment: ${eErr.message}`);
  enrollmentId = enr!.id as string;
}

async function blurInput(page: Page): Promise<void> {
  // Clicking the step heading takes focus off the textarea — the blur save path.
  await page.getByTestId('step-canvas').getByRole('heading').first().click();
}

test.describe('FEAT-H024 — response capture & review substance', () => {
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

  test('the arc: capture -> complete -> takeaways -> review entry -> revise -> download', async ({
    page,
  }) => {
    await page.goto(`/journeys/${journeyId}/play`);
    await expect(page.getByTestId('journey-player')).toBeVisible({ timeout: 15000 });

    // 1. The reflection step offers the input, labelled by its own ask_verb.
    await expect(page.getByTestId('step-canvas')).toContainText(STEP1);
    await expect(page.getByTestId('response-input')).toBeVisible();
    await expect(page.getByTestId('response-label')).toContainText('Reflect');
    // No takeaway pre-completion — the closing word never front-runs the step.
    await expect(page.getByTestId('step-takeaway')).toHaveCount(0);

    // 2. Write -> blur -> the quiet background save tells the truth.
    await page.getByTestId('response-input').fill(WORDS_V1);
    await blurInput(page);
    await expect(page.getByTestId('response-indicator')).toContainText('Saved', {
      timeout: 10000,
    });

    // 3. Complete the step -> its authored takeaway arrives.
    await page.getByTestId('step-complete').click();
    await expect(page.getByTestId('step-takeaway')).toContainText(STEP1_TAKEAWAY, {
      timeout: 15000,
    });

    // 4. The final step captures nothing (narrative) — the registry decides.
    await page.getByTestId('player-next').click();
    await expect(page.getByTestId('step-canvas')).toContainText(STEP2);
    await expect(page.getByTestId('response-input')).toHaveCount(0);
    await page.getByTestId('step-complete').click();

    // The completion moment: panel + journey takeaway + the returned entry.
    await expect(page.getByTestId('journey-completion-panel')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('journey-takeaway')).toContainText(JOURNEY_TAKEAWAY);
    const entry = page.getByTestId('review-enter');
    await expect(entry).toContainText(/look back/i);

    // 5. Follow it -> step one in review, words prefilled, still editable.
    await entry.click();
    await expect(page.getByTestId('step-canvas')).toContainText(STEP1);
    await expect(page.getByTestId('response-input')).toHaveValue(WORDS_V1);
    await expect(page.getByTestId('step-takeaway')).toContainText(STEP1_TAKEAWAY);
    await page.getByTestId('response-input').fill(WORDS_V2);
    await blurInput(page);
    await expect(page.getByTestId('response-indicator')).toContainText('Saved', {
      timeout: 10000,
    });

    // 6. Full reload -> the revision is the server truth. A COMPLETED walk no
    // longer resolves from a param-less /play (that door lists active walks
    // only) — review re-entry carries the enrolment, the H021 affordance shape.
    // (A completed walk resumes at the last step; walk back to the reflection.)
    await page.goto(`/journeys/${journeyId}/play?enrollment=${enrollmentId}`);
    await expect(page.getByTestId('journey-player')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('player-prev').click();
    await expect(page.getByTestId('step-canvas')).toContainText(STEP1);
    await expect(page.getByTestId('response-input')).toHaveValue(WORDS_V2, { timeout: 10000 });

    // 7. Download my data -> the walks section carries the revised words
    // (STORY-6 — the FEAT-H010 flag live before/with the first real response).
    const res = await page.request.get('/api/account/export');
    expect(res.ok()).toBe(true);
    const doc = (await res.json()) as {
      journeys: Array<{
        journey_title: string;
        steps: Array<{ step_title: string; response: { body?: string } | null }>;
      }>;
    };
    const walk = doc.journeys.find((w) => w.journey_title === JOURNEY_TITLE);
    expect(walk).toBeDefined();
    const exported = walk!.steps.find((s) => s.step_title === STEP1);
    expect(exported?.response?.body).toBe(WORDS_V2);
  });
});

test.describe('FEAT-H024 — the Mist onboarding capture (STORY-1)', () => {
  // Fresh sessionless context — the front door, not the shared session FIM.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a Mist writes into the onboarding walk and the words are saved', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /look around/i }).click();
    await expect(page.getByTestId('journey-player')).toBeVisible({ timeout: 15000 });

    // Find the first capture-bearing step — the onboarding seed's reflection
    // steps carry the input; walk forward until it appears (bounded).
    for (let i = 0; i < 6; i++) {
      if ((await page.getByTestId('response-input').count()) > 0) break;
      await page.getByTestId('player-next').click();
    }
    await expect(page.getByTestId('response-input')).toBeVisible();
    await page.getByTestId('response-input').fill('A Mist reflects like anyone.');
    await blurInput(page);
    await expect(page.getByTestId('response-indicator')).toContainText('Saved', {
      timeout: 10000,
    });
  });
});
