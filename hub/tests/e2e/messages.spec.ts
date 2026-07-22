import { test, expect } from '@playwright/test';
import { createAdminClient, SESSION_EMAIL, deleteE2EUser, markArrivedOnce } from './helpers/auth';

/**
 * FEAT-H025 — Messages (COM-1/2/3/4/15) E2E, against the live FEAT-PD008
 * contracts. Authenticated as the shared e2e-session FIM. Two journeys,
 * effects asserted (never just clicks):
 *  1. DM: create a group → admin-seed a partner FIM into it → roster
 *     "Message" → send → the CONFIRMED message renders (no pending state
 *     left) → the inbox lists the conversation (in-context navigation via
 *     the Messages chrome — the honest revisit, J-D rule).
 *  2. Group conversation (CB-7): the Steward's Conversations panel → New
 *     conversation → send → visible → leave → rejoin, history intact.
 *     (RIDER-2, A-COM live walk 2026-07-22: this last leg used to read
 *     "leave via contract is covered at the integration tier". That split is
 *     sound for refusals and semantics but blind to AFFORDANCES — the leave
 *     contract, route and client all shipped while no surface rendered a
 *     button, and no tier crossed the surface to notice. STORY-6's acceptance
 *     names the whole arc: "Given I join, open, leave, and rejoin, then each
 *     transition renders from the confirmed response and my message history
 *     survives my absence." It is walked here now.)
 * Coverage split (labelled): the Mist no-chrome/refusal cases live at the
 * unit tier (CB-1 gating) and integration tier (42501s); the E2E covers the
 * sessionless door — a deep link lands on login, not on content.
 * Fixture hygiene: run-unique names; admin cleanup either side.
 */

const RUN = Date.now();
const PARTNER_EMAIL = `e2e-ca-partner-${RUN}@fringeisland.test`;
const GROUP_NAME = `CA Messages G ${RUN}`;
const DM_TEXT = `Hello across the mist ${RUN}`;
const GC_TITLE = `Fireside ${RUN}`;
const GC_TEXT = `Gather round ${RUN}`;

let createdGroupId: string | null = null;

test.describe('FEAT-H025 — messages', () => {
  test.beforeAll(async () => {
    const admin = createAdminClient();
    await admin
      .from('users')
      .update({ is_active: true, is_decommissioned: false })
      .eq('email', SESSION_EMAIL);
    // FEAT-H023: the session FIM has arrived once — sibling specs erase the
    // onboarding enrolment (first-arrival tests), and without this the JRN-15
    // auto-launch hijacks the first navigation (full-sweep interference).
    const { data: sess } = await admin
      .from('users')
      .select('auth_user_id')
      .eq('email', SESSION_EMAIL)
      .single();
    await markArrivedOnce(admin, sess!.auth_user_id as string);
    const { error } = await admin.auth.admin.createUser({
      email: PARTNER_EMAIL,
      password: 'e2e-test-password-123',
      email_confirm: true,
      // consent_accepted: the substrate's consent gate (handle_new_user,
      // ADR-U038 S3) refuses an unconsented signup — simulate a real one.
      user_metadata: { display_name: `CAPartner${RUN}`, consent_accepted: 'true' },
    });
    if (error) throw new Error(`partner fixture: ${error.message}`);
  });

  test.afterAll(async () => {
    const admin = createAdminClient();
    if (createdGroupId) {
      await admin.from('conversations').delete().eq('group_id', createdGroupId);
      await admin.from('groups').delete().eq('id', createdGroupId);
    }
    await deleteE2EUser(admin, PARTNER_EMAIL);
  });

  test('DM journey: roster → send → confirmed → inbox lists it; group conversation via the panel', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const admin = createAdminClient();

    // -- a group the session FIM stewards ---------------------------------
    await page.goto('/groups');
    await page.getByRole('button', { name: /create group/i }).click();
    await page.getByLabel(/group name/i).fill(GROUP_NAME);
    await page.getByRole('button', { name: /^create$/i }).click();
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}/, { timeout: 15000 });
    createdGroupId = page.url().match(/\/groups\/([0-9a-f-]{36})/)?.[1] ?? null;
    expect(createdGroupId).not.toBeNull();

    // -- partner joins (admin-side seed; the UI invite flow is H015's E2E) --
    const { data: partner } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('email', PARTNER_EMAIL)
      .single();
    const { data: me } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('email', SESSION_EMAIL)
      .single();
    const { error: mErr } = await admin.from('group_memberships').insert({
      group_id: createdGroupId,
      member_group_id: partner!.personal_group_id,
      status: 'active',
      added_by_group_id: me!.personal_group_id,
    });
    expect(mErr).toBeNull();

    // -- DM: roster "Message" → conversation → send → CONFIRMED ------------
    await page.reload();
    const partnerRow = page.getByTestId(`member-row-${partner!.personal_group_id}`);
    await expect(partnerRow).toBeVisible({ timeout: 15000 });
    await partnerRow.getByRole('button', { name: /^Message/ }).click();
    await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}/, { timeout: 15000 });

    // First hit of /messages/[id] + its BFF route may pay the dev-server
    // compile cost (dev-only; production has no per-route compile). Allow it
    // before interacting — the composer renders only after the detail read.
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible({ timeout: 60_000 });
    await page.getByRole('textbox', { name: 'Message' }).fill(DM_TEXT);
    await page.getByRole('button', { name: /^send$/i }).click();
    // the observable effect: the confirmed row renders and NO pending state
    // survives (optimistic → confirmed write-through, STORY-4)
    await expect(page.getByText(DM_TEXT)).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('pending-sending')).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByTestId('pending-failed')).toHaveCount(0);

    // -- inbox via IN-CONTEXT navigation (the honest revisit, J-D rule) ----
    await page.getByRole('link', { name: /^messages/i }).click();
    await expect(page).toHaveURL(/\/messages$/);
    await expect(page.getByText(`CAPartner${RUN}`)).toBeVisible({ timeout: 15000 });

    // -- group conversation (CB-7): panel create → send → visible ----------
    await page.goto(`/groups/${createdGroupId}`);
    const panel = page.getByTestId('group-conversations');
    await expect(panel).toBeVisible({ timeout: 15000 });
    await panel.getByTestId('conversation-create').click();
    await panel.getByLabel('Conversation title').fill(GC_TITLE);
    await panel.getByRole('button', { name: /^open$/i }).click();
    await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}/, { timeout: 15000 });
    await expect(page.getByText(GC_TITLE)).toBeVisible({ timeout: 15000 });
    const gcId = page.url().match(/\/messages\/([0-9a-f-]{36})/)?.[1] ?? null;
    expect(gcId).not.toBeNull();

    await page.getByRole('textbox', { name: 'Message' }).fill(GC_TEXT);
    await page.getByRole('button', { name: /^send$/i }).click();
    await expect(page.getByText(GC_TEXT)).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('pending-sending')).toHaveCount(0, { timeout: 15000 });

    // the panel tells the truth about my participation (in-context return)
    await page.getByRole('link', { name: /^messages/i }).click();
    await expect(page.getByText(GC_TITLE)).toBeVisible({ timeout: 15000 });

    // -- leave → rejoin, history intact (STORY-6 acceptance; RIDER-2) -------
    await page.goto(`/groups/${createdGroupId}`);
    await expect(panel.getByTestId(`conversation-leave-${gcId}`)).toBeVisible({ timeout: 15000 });
    await panel.getByTestId(`conversation-leave-${gcId}`).click();
    // renders from the CONFIRMED response: the row flips to the rejoin door
    await expect(panel.getByTestId(`conversation-join-${gcId}`)).toBeVisible({ timeout: 15000 });
    await expect(panel.getByTestId(`conversation-leave-${gcId}`)).toHaveCount(0);

    // the absence is real at the substrate, not just in the panel's paint
    await page.goto(`/messages/${gcId}`);
    await expect(page.getByText(GC_TEXT)).toHaveCount(0, { timeout: 15000 });

    // rejoin through the same door — my history survived my absence
    await page.goto(`/groups/${createdGroupId}`);
    await panel.getByTestId(`conversation-join-${gcId}`).click();
    await expect(page).toHaveURL(new RegExp(`/messages/${gcId}`), { timeout: 15000 });
    await expect(page.getByText(GC_TEXT)).toBeVisible({ timeout: 15000 });
  });

  test('the sessionless door: a /messages deep link lands on login, not content', async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fmessages|\/login\?redirect=\/messages/, {
      timeout: 15000,
    });
    await context.close();
  });
});
