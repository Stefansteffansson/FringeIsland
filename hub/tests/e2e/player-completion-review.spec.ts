import { test, expect } from '@playwright/test';
import { createAdminClient, SESSION_EMAIL } from './helpers/auth';

/**
 * FEAT-H021 — journey completion & review (JRN-11/12/13 + STORY-4) end-to-end,
 * against the live FEAT-PD004 contracts (get_player_state's `completion`/`timing`
 * blocks + the complete-save `journey_completed` flag) on the migrated dev
 * substrate. Authenticated as the shared e2e-session FIM (global-setup
 * storageState) — never a real account.
 *
 * Unlike player.spec / journeys.spec (which ride the pre-seeded Professional
 * Pathfinders journeys, all long all-required), the completion arc needs a journey
 * WALKABLE TO COMPLETION in-test: a short two-required set so the second required
 * completion IS the final one, plus one optional/repeatable tail step for the
 * post-completion re-engagement. That journey does not exist in the seed, so this
 * spec seeds its own — a dedicated engagement owner group + a published/public
 * journey + three native journey_steps rows ([req1, req2, opt-repeatable]) via the
 * service role (the journey-completion integration idiom) — and never touches the
 * seeded Pathfinders journeys.
 *
 * One arc, one witness:
 *  1. self-enrol -> boot -> complete required 1 -> advance -> complete required 2
 *     (the FINAL required) -> the completion moment renders ONLY on the server-
 *     confirmed save (panel + total elapsed + completed header/rail), never optimistic;
 *  2. full reload -> the entry points swap on status: the /journeys card and the
 *     detail enrolment panel now offer Review where they offered Continue -> follow it;
 *  3. review posture: steps navigable, per-step time on the rail, and NO background
 *     `enter` POST fires on review navigation (asserted via a request listener);
 *  4. re-engagement: the optional/repeatable tail still offers its ask verb in review
 *     -> pressing it rides the normal complete path (2xx) and the rail tick reflects it;
 *  5. honest negative: the completion panel labels engagement time and the calendar
 *     span as two DISTINCT things (invariant 8 — nothing conflated, nothing comparative).
 *
 * Teardown is symmetric and id-independent (by title/name): the enrolment (its
 * step-instances ride ON DELETE CASCADE), the journey_steps, the journey, the owner
 * group, and the `journey_completed` notification the completion fires for the
 * session FIM (payload-scoped, not FK-blocking — so it must be purged explicitly).
 */

const JOURNEY_TITLE = 'E2E Completion & Review Arc';
const OWNER_GROUP = 'E2E Completion Owner';
const STEP1 = 'Setting Out';
const STEP2 = 'The Last Required Marker';
const STEP3 = 'Open Reflection';

async function sessionPersonalGroupId(): Promise<string | undefined> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('email', SESSION_EMAIL)
    .maybeSingle();
  return data?.personal_group_id as string | undefined;
}

/** Id-independent teardown (by title/name) — safe to run before seeding and after. */
async function teardownFixture(): Promise<void> {
  const admin = createAdminClient();
  const { data: journeys } = await admin
    .from('journeys')
    .select('id')
    .eq('title', JOURNEY_TITLE);
  for (const j of journeys ?? []) {
    const jid = j.id as string;
    // Enrolment deletion cascades journey_step_instances (the progress grain).
    await admin.from('journey_enrollments').delete().eq('journey_id', jid);
    await admin.from('journey_steps').delete().eq('journey_id', jid);
  }
  await admin.from('journeys').delete().eq('title', JOURNEY_TITLE);
  await admin.from('groups').delete().eq('name', OWNER_GROUP);

  // The completion fires a journey_completed notification to the traveller's
  // personal group (payload-scoped, not a blocking FK) — purge it for symmetry.
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

  // A dedicated engagement group OWNS the journey (nobody walks as it — the session
  // FIM enrols individually into the public journey, the Pathfinders shape).
  const { data: group, error: gErr } = await admin
    .from('groups')
    .insert({
      name: OWNER_GROUP,
      description: 'FEAT-H021 E2E fixture owner — JC-05',
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
      description: 'FEAT-H021 E2E completion/review fixture — two required, one repeatable tail.',
      created_by_group_id: ownerG,
      is_published: true,
      is_public: true,
      journey_type: 'predefined',
      difficulty_level: 'beginner',
      estimated_duration_minutes: 15,
      tags: ['jc-05-e2e'],
      content: null,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (jErr) throw new Error(`seedFixture journey: ${jErr.message}`);
  const journeyId = journey!.id as string;

  // [req1, req2 (the final required), opt-repeatable tail]. Completion is over
  // REQUIRED steps only, so the two required completions conclude the walk while
  // the repeatable stays open for post-completion re-engagement.
  const { error: sErr } = await admin.from('journey_steps').insert([
    {
      journey_id: journeyId,
      step_order: 1,
      title: STEP1,
      step_kind_key: 'narrative',
      content_family_key: 'witness',
      required: true,
      repeatable: false,
      duration_minutes: 5,
      content: { body: `${STEP1} — E2E fixture step` },
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
    {
      journey_id: journeyId,
      step_order: 3,
      title: STEP3,
      step_kind_key: 'journal',
      content_family_key: 'reflect',
      required: false,
      repeatable: true,
      duration_minutes: 5,
      content: { body: `${STEP3} — E2E fixture step` },
    },
  ]);
  if (sErr) throw new Error(`seedFixture steps: ${sErr.message}`);
}

test.describe('FEAT-H021 — journey completion & review', () => {
  test.beforeAll(async () => {
    const admin = createAdminClient();
    await admin
      .from('users')
      .update({ is_active: true, is_decommissioned: false })
      .eq('email', SESSION_EMAIL);
    await teardownFixture(); // clear any residue from a crashed prior run
    await seedFixture();
  });

  test.afterAll(async () => {
    await teardownFixture();
  });

  test('walk to completion -> milestone on confirm -> Review entry -> review posture -> re-engage', async ({
    page,
  }) => {
    test.setTimeout(120_000); // a long single arc: enrol, two completes, reload, review, re-engage

    // ---- Enrol and boot the player -------------------------------------------
    await page.goto('/journeys');
    await page.getByRole('link', { name: JOURNEY_TITLE }).click();
    await expect(page.getByRole('heading', { name: JOURNEY_TITLE, exact: true })).toBeVisible();

    await page.getByTestId('enroll-self').click();
    await expect(page.getByTestId('enrolled-individually')).toBeVisible();
    await page.getByTestId('continue-individual').click();
    await page.waitForURL(/\/journeys\/[0-9a-f-]+\/play\?enrollment=/);
    await expect(page.getByTestId('journey-player')).toBeVisible();

    // Boot resumes at the first, incomplete step; the rail paints all three.
    const canvas = page.getByTestId('step-canvas');
    await expect(canvas).toContainText(STEP1);
    await expect(page.locator('[data-testid^="rail-step-"]')).toHaveCount(3);
    // No completion framing on an in-progress walk.
    await expect(page.getByTestId('journey-completion-panel')).toHaveCount(0);
    await expect(page.getByTestId('player-complete-header')).toHaveCount(0);

    // ---- Complete required step 1, advance to the final required --------------
    await page.getByTestId('step-complete').click();
    await expect(page.getByTestId('step-completed')).toBeVisible();
    await expect(page.getByTestId('rail-tick')).toHaveCount(1);

    const [enterResp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/steps\/[0-9a-f-]+\/enter$/.test(r.url()) && r.request().method() === 'POST',
      ),
      page.getByTestId('player-next').click(),
    ]);
    expect(enterResp.ok()).toBeTruthy();
    await expect(canvas).toContainText(STEP2);

    // ---- The completion moment renders ONLY on the server-confirmed save ------
    // Still no milestone before the final save lands (the moment is never optimistic).
    await expect(page.getByTestId('journey-completion-panel')).toHaveCount(0);
    const [completeResp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/steps\/[0-9a-f-]+\/complete$/.test(r.url()) && r.request().method() === 'POST',
      ),
      page.getByTestId('step-complete').click(),
    ]);
    expect(completeResp.ok()).toBeTruthy();

    // The milestone paints from the confirm: panel + total elapsed + completed framing.
    await expect(page.getByTestId('journey-completion-panel')).toBeVisible();
    await expect(page.getByTestId('player-complete-header')).toBeVisible();
    await expect(page.getByTestId('completion-total-time')).toBeVisible();
    await expect(page.getByTestId('rail-tick')).toHaveCount(2); // both required ticked

    // ---- Full reload -> the entry points swap Continue -> Review (STORY-4) ----
    await page.goto('/journeys');
    const card = page.locator('li').filter({ has: page.getByRole('link', { name: JOURNEY_TITLE }) });
    await expect(card.getByTestId('card-review')).toBeVisible();
    await expect(card.getByTestId('card-continue')).toHaveCount(0);

    await page.getByRole('link', { name: JOURNEY_TITLE }).click();
    await expect(page.getByTestId('review-individual')).toBeVisible();
    await expect(page.getByTestId('continue-individual')).toHaveCount(0);
    await page.getByTestId('review-individual').click();
    await page.waitForURL(/\/play\?enrollment=/);

    // ---- Review posture: milestone + per-step times + no background `enter` ---
    await expect(page.getByTestId('journey-player')).toBeVisible();
    await expect(page.getByTestId('player-complete-header')).toBeVisible();
    const panel = page.getByTestId('journey-completion-panel');
    await expect(panel).toBeVisible();
    // JRN-11: per-step engagement time renders on the rail in review (one per step).
    await expect(page.locator('[data-testid^="rail-time-"]')).toHaveCount(3);

    // Honest negative (STORY-3): engagement time and calendar span are labelled as
    // two DISTINCT things — never conflated, nothing comparative (invariant 8).
    await expect(page.getByTestId('completion-total-time')).toContainText('Time engaged');
    await expect(page.getByTestId('completion-calendar-span')).toContainText('From start to finish');

    // JRN-13: review navigation records nothing. Listen for enter POSTs, then walk
    // the whole journey via the panel's in-page review path + prev/next.
    const enterPosts: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST' && /\/steps\/[0-9a-f-]+\/enter$/.test(req.url())) {
        enterPosts.push(req.url());
      }
    });
    await page.getByTestId('review-enter').click(); // in-page focus to step 1 (no nav, no enter)
    const reviewCanvas = page.getByTestId('step-canvas');
    await expect(reviewCanvas).toContainText(STEP1);
    await page.getByTestId('player-next').click();
    await expect(reviewCanvas).toContainText(STEP2);
    await page.getByTestId('player-next').click();
    await expect(reviewCanvas).toContainText(STEP3);
    expect(enterPosts).toHaveLength(0); // no engagement opened by mere review navigation

    // ---- Re-engagement: the repeatable tail still offers its ask verb ---------
    await expect(page.getByTestId('step-complete')).toBeVisible();
    await expect(page.getByTestId('rail-tick')).toHaveCount(2); // req1 + req2; the tail is open
    const [repResp] = await Promise.all([
      page.waitForResponse(
        (r) => /\/steps\/[0-9a-f-]+\/complete$/.test(r.url()) && r.request().method() === 'POST',
      ),
      page.getByTestId('step-complete').click(),
    ]);
    expect(repResp.ok()).toBeTruthy(); // the re-engagement rides the normal complete path (2xx)
    await expect(page.getByTestId('rail-tick')).toHaveCount(3); // the UI reflects the re-engagement
  });
});
