import { test, expect } from '@playwright/test';
import { createAdminClient, SESSION_EMAIL } from './helpers/auth';

/**
 * FEAT-H022 — frozen read-only mode (JRN-14) + the group progress window and its
 * consent toggle (JRN-16/17) end-to-end, against the live FEAT-PD005 contracts
 * (get_group_journey_progress / set_journey_progress_sharing + the additive
 * get_player_state `freeze`/`progress_sharing` blocks) and the PD005 rider that
 * teaches get_group_enrollment_summary to carry `enrollment_id` (the panel's key).
 * Authenticated as the shared e2e-session FIM (global-setup storageState) — never
 * a real account.
 *
 * The session FIM plays BOTH roles the arc needs — it is the Steward/creator of
 * the walking group (so it holds view_group_progress + view_others_progress from
 * the default Steward template) AND the group's one active member who walks the
 * journey. The consent read is uniform (no self-special-case in the contract:
 * migration 20260708150000 derives each member's `sharing` purely from that
 * member's own latest consent), so the FIM's own row reads "not shared" until it
 * shares — exactly the effect this arc drives and re-reads.
 *
 * One arc, effects asserted (never the mere interaction):
 *   1. create the walking group, enrol it in a seeded two-required-step journey;
 *   2. walk it via-group -> the sharing toggle renders OFF by default -> complete
 *      the first required step (rail tick = the landed write);
 *   3. Steward opens the group detail -> the Progress affordance renders, fetch is
 *      expand-on-demand (ZERO progress requests on page boot; exactly one on
 *      expand) -> the panel shows the honest zero-sharing state + the member "not
 *      shared";
 *   4. the member flips sharing ON (optimistic B5 paint, server-confirmed) -> the
 *      Steward's REFRESHED panel now shows the member's marks + "1 of 2 required"
 *      (the effect, not the click);
 *   5. the member flips sharing OFF -> the Steward's refreshed panel reads "not
 *      shared" again (revocation immediate);
 *   6. the group-level enrolment freezes (admin-seeded to the exact terminal shape
 *      a close_group cascade writes: status='frozen' + progress_data.frozen_reason
 *      /frozen_at — E2E cannot drive the real closure without destroying the group
 *      the panel reads) -> the member boots the frozen walk: the freeze banner
 *      names the reason, the posture is read-only (no completion affordance, the
 *      write-surface toggle suppressed), the rail stays navigable, and navigating
 *      fires ZERO background `enter` POSTs (the effect) on exactly one boot read.
 *
 * Id-independent teardown (by title/name): the enrolment (its step-instances ride
 * ON DELETE CASCADE), the journey_steps, the journey, and both fixture groups.
 * The append-only consent rows the sharing flips write are payload-scoped (not
 * FK-blocking) and keyed to a per-run enrolment id, so they are inert on re-run
 * and left in place (never blanket-purged — the session FIM's signup consent
 * shares the ledger).
 */

const JOURNEY_TITLE = 'H022 E2E Frozen and Progress Arc';
const OWNER_GROUP = 'H022 E2E Progress Owner';
const WALK_GROUP = 'H022 E2E Walk Party';
const STEP1 = 'Progress Marker One';
const STEP2 = 'Progress Marker Two';

const PROGRESS_ROUTE = /\/api\/groups\/[0-9a-f-]+\/journeys\/[0-9a-f-]+\/progress$/;
const PLAYER_ROUTE = /\/api\/journeys\/enrollments\/[0-9a-f-]+\/player$/;
const SHARING_ROUTE = /\/api\/journeys\/enrollments\/[0-9a-f-]+\/sharing$/;
const ENTER_ROUTE = /\/steps\/[0-9a-f-]+\/enter$/;

let journeyId: string;

/** Id-independent teardown (by title/name) — safe to run before seeding and after. */
async function teardownFixture(): Promise<void> {
  const admin = createAdminClient();
  const { data: journeys } = await admin.from('journeys').select('id').eq('title', JOURNEY_TITLE);
  for (const j of journeys ?? []) {
    const jid = j.id as string;
    // Enrolment deletion cascades journey_step_instances (the progress grain).
    await admin.from('journey_enrollments').delete().eq('journey_id', jid);
    await admin.from('journey_steps').delete().eq('journey_id', jid);
  }
  await admin.from('journeys').delete().eq('title', JOURNEY_TITLE);
  await admin.from('groups').delete().eq('name', WALK_GROUP);
  await admin.from('groups').delete().eq('name', OWNER_GROUP);
}

/** A dedicated owner group + public journey with two required steps (never the
 *  live seed set — the J-B retro trap; parallel specs must not contend). The walk
 *  group is created in-test via the real UI so the session FIM earns the Steward
 *  role (creator binding) that grants the progress permissions. */
async function seedFixture(): Promise<void> {
  const admin = createAdminClient();

  const { data: group, error: gErr } = await admin
    .from('groups')
    .insert({
      name: OWNER_GROUP,
      description: 'FEAT-H022 E2E fixture owner — JD-05',
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
      description: 'FEAT-H022 E2E frozen/group-progress fixture — two required steps.',
      created_by_group_id: ownerG,
      is_published: true,
      is_public: true,
      journey_type: 'predefined',
      difficulty_level: 'beginner',
      estimated_duration_minutes: 15,
      tags: ['jd-05-e2e'],
      content: null,
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
  ]);
  if (sErr) throw new Error(`seedFixture steps: ${sErr.message}`);
}

test.describe('FEAT-H022 — frozen mode & group progress', () => {
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

  test('group progress + sharing round-trip, then the frozen walk explains itself', async ({
    page,
  }) => {
    test.setTimeout(120_000); // a long single arc: create, enrol, walk, share/revoke, freeze

    // ---- 1. Create the walking group (the session FIM stewards it) -----------
    await page.goto('/groups');
    await page.getByRole('button', { name: /create group/i }).click();
    await page.getByLabel(/group name/i).fill(WALK_GROUP);
    await page.getByRole('button', { name: /^create$/i }).click();
    await page.waitForURL(/\/groups\/[0-9a-f-]+/);
    const groupUrl = page.url();

    // ---- 1b. Enrol the group in the seeded journey (the wielding walk) -------
    await page.goto(`/journeys/${journeyId}`);
    await page.getByTestId('enroll-group-open').click();
    const option = page.getByTestId('enroll-group-option').filter({ hasText: WALK_GROUP });
    await expect(option).toBeVisible();
    await option.click();
    const enrolModal = page.getByTestId('confirm-modal');
    await expect(enrolModal).toContainText(WALK_GROUP);
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByText(`Travelling via ${WALK_GROUP}`)).toBeVisible();

    // ---- 2. Walk the group-level enrolment; the sharing control renders OFF ---
    await page.getByTestId('continue-via').click();
    await page.waitForURL(/\/journeys\/[0-9a-f-]+\/play\?enrollment=/);
    const groupEnrollmentId = new URL(page.url()).searchParams.get('enrollment');
    expect(groupEnrollmentId).toBeTruthy();
    await expect(page.getByTestId('journey-player')).toBeVisible();

    const canvas = page.getByTestId('step-canvas');
    await expect(canvas).toContainText(STEP1);
    await expect(page.locator('[data-testid^="rail-step-"]')).toHaveCount(2);

    // STORY-2: the via-group walk carries the sharing toggle, off by default (no
    // consent yet), booted from the player payload with no extra read.
    await expect(page.getByTestId('sharing-toggle')).toBeVisible();
    await expect(page.getByTestId('sharing-checkbox')).not.toBeChecked();

    // Complete the first required step — the rail tick is the landed-write signal.
    await page.getByTestId('step-complete').click();
    await expect(page.getByTestId('step-completed')).toBeVisible();
    await expect(page.getByTestId('rail-tick')).toHaveCount(1);

    // ---- 3. Steward view (pre-sharing): honest "not shared", fetch on expand --
    const progressReqs: string[] = [];
    page.on('request', (req) => {
      if (PROGRESS_ROUTE.test(req.url())) progressReqs.push(req.url());
    });

    await page.goto(groupUrl);
    await expect(page.getByTestId('group-journey-progress')).toBeVisible();
    const expander = page.locator('[data-testid^="progress-expand-"]');
    await expect(expander).toBeVisible();
    // Perf AC (STORY-5 / B6): the panel is expand-on-demand — nothing fetched on
    // group-page boot.
    expect(progressReqs).toHaveLength(0);

    const [firstProgress] = await Promise.all([
      page.waitForResponse((r) => PROGRESS_ROUTE.test(r.url())),
      expander.click(),
    ]);
    expect(firstProgress.ok()).toBeTruthy();
    expect(progressReqs).toHaveLength(1); // exactly one read, and only on expand

    let panel = page.locator('[data-testid^="progress-panel-"]');
    await expect(panel).toBeVisible();
    // Zero-sharing renders the honest empty state (counts absent, basis shown) and
    // the member reads "not shared" — never a fabricated zero (STORY-3/4).
    await expect(panel.getByTestId('progress-empty')).toBeVisible();
    await expect(panel.getByTestId('member-not-shared')).toBeVisible();
    await expect(panel.getByTestId('member-required')).toHaveCount(0);

    // ---- 4. Member shares -> the Steward's refreshed panel shows the marks -----
    const playerUrl = `/journeys/${journeyId}/play?enrollment=${groupEnrollmentId}`;
    await page.goto(playerUrl);
    await expect(page.getByTestId('journey-player')).toBeVisible();
    const toggleOn = page.getByTestId('sharing-checkbox');
    await expect(toggleOn).not.toBeChecked();

    const [shareOn] = await Promise.all([
      page.waitForResponse(
        (r) => SHARING_ROUTE.test(r.url()) && r.request().method() === 'POST',
      ),
      toggleOn.click(),
    ]);
    expect(shareOn.ok()).toBeTruthy();
    await expect(toggleOn).toBeChecked(); // optimistic paint (B5) held, server-confirmed

    // The EFFECT: a fresh Steward read (full reload remounts the panel, dropping the
    // per-enrolment session cache) now surfaces the member's marks.
    await page.goto(groupUrl);
    await expect(page.getByTestId('group-journey-progress')).toBeVisible();
    const expanderShared = page.locator('[data-testid^="progress-expand-"]');
    await expect(expanderShared).toBeVisible();
    await Promise.all([
      page.waitForResponse((r) => PROGRESS_ROUTE.test(r.url())),
      expanderShared.click(),
    ]);
    panel = page.locator('[data-testid^="progress-panel-"]');
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId('progress-aggregate')).toBeVisible();
    await expect(panel.getByTestId('member-required')).toContainText('1 of 2 required');
    await expect(panel.getByTestId('progress-empty')).toHaveCount(0);

    // ---- 5. Member revokes -> the refreshed panel reads "not shared" again ----
    await page.goto(playerUrl);
    const toggleOff = page.getByTestId('sharing-checkbox');
    await expect(toggleOff).toBeChecked();
    const [shareOff] = await Promise.all([
      page.waitForResponse(
        (r) => SHARING_ROUTE.test(r.url()) && r.request().method() === 'POST',
      ),
      toggleOff.click(),
    ]);
    expect(shareOff.ok()).toBeTruthy();
    await expect(toggleOff).not.toBeChecked();

    await page.goto(groupUrl);
    await expect(page.getByTestId('group-journey-progress')).toBeVisible();
    const expanderRevoked = page.locator('[data-testid^="progress-expand-"]');
    await expect(expanderRevoked).toBeVisible();
    await Promise.all([
      page.waitForResponse((r) => PROGRESS_ROUTE.test(r.url())),
      expanderRevoked.click(),
    ]);
    panel = page.locator('[data-testid^="progress-panel-"]');
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId('progress-empty')).toBeVisible();
    await expect(panel.getByTestId('member-not-shared')).toBeVisible();
    await expect(panel.getByTestId('member-required')).toHaveCount(0);

    // ---- 6. Freeze -> the member boots a read-only walk that explains itself ---
    // Seed the exact terminal shape a close_group cascade writes (the integration
    // fixtures' idiom): status='frozen' + progress_data.frozen_reason/frozen_at.
    const admin = createAdminClient();
    const { error: freezeErr } = await admin
      .from('journey_enrollments')
      .update({
        status: 'frozen',
        progress_data: { frozen_reason: 'group_closed', frozen_at: new Date().toISOString() },
      })
      .eq('id', groupEnrollmentId!);
    expect(freezeErr).toBeNull();

    const playerReqs: string[] = [];
    const enterPosts: string[] = [];
    page.on('request', (req) => {
      const u = req.url();
      if (PLAYER_ROUTE.test(u)) playerReqs.push(u);
      if (req.method() === 'POST' && ENTER_ROUTE.test(u)) enterPosts.push(u);
    });

    await Promise.all([
      page.waitForResponse((r) => PLAYER_ROUTE.test(r.url())),
      page.goto(playerUrl),
    ]);
    await expect(page.getByTestId('journey-player')).toBeVisible();

    // STORY-1: the freeze banner names the reason (group_closed) in canon voice,
    // and renders when it froze.
    const banner = page.getByTestId('freeze-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('has closed');
    await expect(page.getByTestId('freeze-banner-when')).toBeVisible();

    // Read-only posture: no completion affordance, and the write-surface sharing
    // toggle is suppressed inside the frozen frame.
    await expect(page.getByTestId('step-complete')).toHaveCount(0);
    await expect(page.getByTestId('sharing-toggle')).toHaveCount(0);

    // The rail stays navigable (resume = first incomplete = STEP2); prev/next walk
    // the record read-only.
    const frozenCanvas = page.getByTestId('step-canvas');
    await expect(frozenCanvas).toContainText(STEP2);
    await page.getByTestId('player-prev').click();
    await expect(frozenCanvas).toContainText(STEP1);
    await page.getByTestId('player-next').click();
    await expect(frozenCanvas).toContainText(STEP2);

    // STORY-1 (the effect, not the absence of a handler): frozen navigation opens
    // NO background engagement.
    expect(enterPosts).toHaveLength(0);
    // STORY-5 perf: the frozen boot is exactly one get_player_state read + cache.
    expect(playerReqs).toHaveLength(1);
  });
});
