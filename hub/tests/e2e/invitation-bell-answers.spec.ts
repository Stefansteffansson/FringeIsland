import { test, expect, type Page } from '@playwright/test';
import { createAdminClient, markArrivedOnce } from './helpers/auth';

/**
 * FEAT-H042 / FEAT-PD017 (E2E) — Cycle N-E: the personal group invitation
 * answers in the bell, end-to-end — the one journey covering WF-1 AND the
 * WS-4 landing focus (the WS-board's own "one E2E covers both" line).
 *
 * Legs, one invitee session throughout (client-side nav where the claim is
 * client-cache truth):
 *   1. WS-4 — clicking the notice BODY lands /groups?focus=invitations and
 *      the MyInvitations card is focused (scrolled + transient highlight).
 *   2. Accept in the bell — dispatch asserted (the H031 abort lesson:
 *      waitForResponse on the route, 200), the row converges "Accepted", and
 *      the groups list beneath gains the group WITHOUT a reload (two doors,
 *      one truth — the refreshNavigation consequence).
 *   3. Decline in the bell — converges "Declined"; the group never joins the
 *      list; the card drops the invitation.
 *   4. Withdrawn — the invitation is cancelled while the letter stands (the
 *      cancel door, exercised substrate-side); the row renders the
 *      fact-only "Withdrawn" chip: no buttons, no actor named
 *      (FEAT-PD017 withholds the canceller — the row's own body legitimately
 *      says "by [inviter]", so the no-actor claim targets the chip).
 *   5. Durability — a full reload re-reads the same outcomes (ADR-U051
 *      Option A: the record survives the rows the answers deleted).
 *
 * Fixtures: FIMs created admin-side (single-token display names — the
 * nickname render); the four groups are created through the real UI by the
 * host; the four invitations are seeded as `invited` membership rows so the
 * letters are REAL trigger-emitted armed notifications (the invite ceremony
 * itself is invitations.spec.ts's journey, not this one's).
 */

const stamp = Date.now();
const password = 'e2e-test-password-123';

const fims = {
  host: { email: `e2e-ne-host-${stamp}@fringeisland.test`, name: `E2ENEHost${stamp}` },
  invitee: { email: `e2e-ne-invitee-${stamp}@fringeisland.test`, name: `E2ENEInvitee${stamp}` },
} as const;

type Fim = { authId: string; pgId: string };

async function waitForPersonalGroup(authUserId: string): Promise<string> {
  const admin = createAdminClient();
  for (let i = 0; i < 20; i++) {
    const { data } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (data?.personal_group_id) return data.personal_group_id;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`personal group never materialised for ${authUserId}`);
}

async function createFim(email: string, displayName: string): Promise<Fim> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, consent_accepted: 'true' },
  });
  if (error) throw error;
  await markArrivedOnce(admin, data.user.id);
  const pgId = await waitForPersonalGroup(data.user.id);
  return { authId: data.user.id, pgId };
}

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
}

/** The proven G-A creation path, through the UI (private by default). */
async function createGroupViaUi(page: Page, name: string): Promise<string> {
  await page.goto('/groups');
  await page.getByRole('button', { name: /create group/i }).click();
  await page.getByLabel(/group name/i).fill(name);
  await page.getByRole('button', { name: /^create$/i }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}/, { timeout: 15000 });
  const id = page.url().match(/\/groups\/([0-9a-f-]{36})/)?.[1];
  if (!id) throw new Error('group id never appeared in the URL');
  return id;
}

/** Seed a real personal invitation: an `invited` membership row fires the
 *  delivery trigger, so the letter under test is genuinely trigger-emitted
 *  and armed (FEAT-PD017), never a synthetic notification insert. */
async function seedInvite(groupId: string, inviteePg: string, hostPg: string) {
  const admin = createAdminClient();
  const { error } = await admin.from('group_memberships').insert({
    group_id: groupId,
    member_group_id: inviteePg,
    status: 'invited',
    added_by_group_id: hostPg,
  });
  if (error) throw new Error(`seedInvite(${groupId}): ${error.message}`);
}

test.describe('FEAT-H042/PD017 — invitations answer in the bell (N-E journey)', () => {
  test('focus landing, bell accept + decline with two-doors truth, withdrawn rendering, durability', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const admin = createAdminClient();

    const host = await createFim(fims.host.email, fims.host.name);
    const invitee = await createFim(fims.invitee.email, fims.invitee.name);

    const names = {
      focus: `NE Focus ${stamp}`,
      accept: `NE Accept ${stamp}`,
      decline: `NE Decline ${stamp}`,
      withdraw: `NE Withdraw ${stamp}`,
    };

    // Host builds the four groups through the real UI, then the invitations
    // are seeded (real trigger-emitted letters — see seedInvite docstring).
    const hostCtx = await browser.newContext();
    const hostPage = await hostCtx.newPage();
    await signIn(hostPage, fims.host.email);
    const groupIds = {
      focus: await createGroupViaUi(hostPage, names.focus),
      accept: await createGroupViaUi(hostPage, names.accept),
      decline: await createGroupViaUi(hostPage, names.decline),
      withdraw: await createGroupViaUi(hostPage, names.withdraw),
    };
    await hostCtx.close();
    for (const gid of Object.values(groupIds)) {
      await seedInvite(gid, invitee.pgId, host.pgId);
    }

    const inviteeCtx = await browser.newContext();
    const page = await inviteeCtx.newPage();
    await signIn(page, fims.invitee.email);

    const card = page.getByTestId('my-invitations');
    await expect(card).toBeVisible({ timeout: 15000 });

    const bell = page.getByTestId('notification-bell');
    const dropdown = page.getByTestId('notification-dropdown');
    const rowFor = (groupName: string) =>
      dropdown.locator('li', { hasText: groupName });

    // ── Leg 1 (WS-4): the notice body lands focused ─────────────────────────
    await bell.click();
    await expect(dropdown).toBeVisible({ timeout: 15000 });
    const focusRow = rowFor(names.focus);
    await expect(focusRow).toBeVisible({ timeout: 15000 });
    // The BODY button (carries the notification title), never the response
    // buttons — the actions render as a separate block below it.
    await focusRow.locator('button', { hasText: 'Group Invitation' }).click();
    await expect(page).toHaveURL(/\/groups\?focus=invitations/, { timeout: 15000 });
    await expect(card).toBeVisible({ timeout: 15000 });
    // The transient highlight is ON at landing (it fades after ~2.5s).
    await expect(card).toHaveClass(/ring-2/, { timeout: 5000 });

    // ── Leg 2: Accept in the bell; the page beneath updates without reload ──
    await bell.click();
    await expect(dropdown).toBeVisible({ timeout: 15000 });
    const acceptRow = rowFor(names.accept);
    await expect(acceptRow.getByTestId('notif-action-accept')).toBeVisible({ timeout: 15000 });
    const acceptDispatch = page.waitForResponse(
      (r) => r.url().includes('/invitation-response') && r.status() === 200,
      { timeout: 20000 },
    );
    await acceptRow.getByTestId('notif-action-accept').click();
    await page.getByTestId('confirm-modal-confirm').click();
    await acceptDispatch; // the dispatch itself, not just the paint (H031 lesson)
    // The chip carries the resolver — the invitee's own name (PD017 records it
    // on accepted/declined; the format layer's "[verb] by [nickname]" rule is
    // the shipped N-B answerer-row behaviour, and single-token fixture names
    // make the nickname the full name).
    await expect(acceptRow.getByText(`Accepted by ${fims.invitee.name}`)).toBeVisible({
      timeout: 15000,
    });
    await expect(acceptRow.getByTestId('notif-action-accept')).toHaveCount(0);
    // Two doors, one truth: the groups list gained the group with NO reload,
    // and the invitation left the card.
    await expect(
      page.getByTestId('groups-list').getByText(names.accept),
    ).toBeVisible({ timeout: 15000 });
    await expect(card.getByText(names.accept)).toHaveCount(0, { timeout: 15000 });

    // ── Leg 3: Decline in the bell ──────────────────────────────────────────
    const declineRow = rowFor(names.decline);
    await expect(declineRow.getByTestId('notif-action-decline')).toBeVisible({
      timeout: 15000,
    });
    const declineDispatch = page.waitForResponse(
      (r) => r.url().includes('/invitation-response') && r.status() === 200,
      { timeout: 20000 },
    );
    await declineRow.getByTestId('notif-action-decline').click();
    await page.getByTestId('confirm-modal-confirm').click();
    await declineDispatch;
    await expect(declineRow.getByText(`Declined by ${fims.invitee.name}`)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('groups-list').getByText(names.decline)).toHaveCount(0);
    await expect(card.getByText(names.decline)).toHaveCount(0, { timeout: 15000 });

    // ── Leg 4: cancelled while the letter stands → fact-only "Withdrawn" ────
    // The cancel door, exercised at the substrate (the canceller UI is not
    // this journey): deleting the invited row converges the letter as
    // cancelled with the actor withheld (FEAT-PD017 STORY-3).
    {
      const { error } = await admin
        .from('group_memberships')
        .delete()
        .eq('group_id', groupIds.withdraw)
        .eq('member_group_id', invitee.pgId)
        .eq('status', 'invited');
      if (error) throw new Error(`withdraw leg delete: ${error.message}`);
    }
    await page.goto('/notifications');
    const withdrawRow = page.locator('li', { hasText: names.withdraw });
    await expect(withdrawRow.getByText('Withdrawn', { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(withdrawRow.getByTestId('notification-actions')).toHaveCount(0);
    // Fact, never actor: the chip names nobody (the body's "by [inviter]" is
    // the inviter's server copy, not a resolver disclosure).
    await expect(withdrawRow.getByText(/Answered by/)).toHaveCount(0);

    // ── Leg 5: durability across a full reload (Option A — the records
    //           survive the membership rows the answers deleted) ─────────────
    await page.reload();
    await expect(
      page
        .locator('li', { hasText: names.accept })
        .getByText(`Accepted by ${fims.invitee.name}`),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page
        .locator('li', { hasText: names.decline })
        .getByText(`Declined by ${fims.invitee.name}`),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('li', { hasText: names.withdraw }).getByText('Withdrawn', { exact: true }),
    ).toBeVisible({ timeout: 15000 });

    await inviteeCtx.close();
  });
});
