import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createAdminClient, markArrivedOnce } from './helpers/auth';

/**
 * FEAT-H030 (E2E) — A-NTF Cycle N-A: the notification surface end-to-end.
 * A Steward's invitation seeds a real passive `invitation_received`
 * notification for the invitee (the trigger path, not a fixture). The invitee
 * then: sees the bell badge on sign-in (NTF-2), opens the dropdown and finds
 * the "Group Invitation" (NTF-1/3), marks all read (NTF-7), sees it in the
 * `/notifications` history (NTF-3), and the read-state survives a full reload
 * — proving server state, not local cache (NTF-7).
 *
 * Session isolation: own spec-created FIMs in their own contexts (never the
 * shared storageState). Single-token display names (the personal-group
 * nickname render rule).
 */

const stamp = Date.now();
const password = 'e2e-test-password-123';
const stewardEmail = `e2e-na-steward-${stamp}@fringeisland.test`;
const inviteeEmail = `e2e-na-invitee-${stamp}@fringeisland.test`;
const inviteeName = `E2ENAInvitee${stamp}`;
const groupName = `E2E N-A Notifications ${stamp}`;

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

async function createFim(email: string, displayName: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, consent_accepted: 'true' },
  });
  if (error) throw error;
  await markArrivedOnce(admin, data.user.id); // arrived once — no onboarding redirect
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

test.describe.serial('FEAT-H030 — notification bell, dropdown & inbox (NTF-1/2/3/7)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let stewardCtx: BrowserContext;
  let stewardPage: Page;
  const users: Array<{ authId: string; pgId: string }> = [];
  let groupId: string | null = null;
  /** The invitee's personal group — notifications are addressed to it
   *  (`recipient_group_id`), so it is the handle for re-arming unread state. */
  let inviteePgId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    users.push(await createFim(stewardEmail, `E2ENASteward${stamp}`));
    const invitee = await createFim(inviteeEmail, inviteeName);
    users.push(invitee);
    inviteePgId = invitee.pgId;

    stewardCtx = await browser.newContext();
    stewardPage = await stewardCtx.newPage();
    await signIn(stewardPage, stewardEmail);

    await stewardPage.goto('/groups');
    await stewardPage.getByRole('button', { name: /create group/i }).click();
    await stewardPage.getByLabel(/group name/i).fill(groupName);
    await stewardPage.getByRole('button', { name: /^create$/i }).click();
    await expect(stewardPage).toHaveURL(/\/groups\/[0-9a-f-]{36}/, { timeout: 15000 });
    groupId = stewardPage.url().match(/\/groups\/([0-9a-f-]{36})/)?.[1] ?? null;
    expect(groupId).not.toBeNull();
  });

  test.afterAll(async () => {
    await stewardCtx?.close();
    const admin = createAdminClient();
    if (groupId) await admin.from('groups').delete().eq('id', groupId);
    for (const u of [...users].reverse()) {
      if (u.pgId) await admin.from('groups').delete().eq('id', u.pgId);
      if (u.authId) await admin.auth.admin.deleteUser(u.authId);
    }
  });

  test('an invitation surfaces in the bell + inbox, and read-state survives reload', async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    // The Steward invites the invitee by name — the substrate emits a real
    // `invitation_received` notification (title "Group Invitation").
    await stewardPage.goto(`/groups/${groupId}`);
    await expect(stewardPage.getByTestId('invitations-panel')).toBeVisible({ timeout: 15000 });
    await stewardPage.getByTestId('member-search-input').fill(inviteeName);
    const hit = stewardPage.getByTestId('member-search-results').getByText(inviteeName);
    await expect(hit).toBeVisible({ timeout: 10000 });
    await hit.click();
    await expect(
      stewardPage.getByTestId('pending-invitations').getByText(inviteeName),
    ).toBeVisible({ timeout: 15000 });

    // The invitee signs in — the bell badge is present (NTF-2).
    const inviteeCtx = await browser.newContext();
    const inviteePage = await inviteeCtx.newPage();
    await signIn(inviteePage, inviteeEmail);
    await expect(inviteePage.getByTestId('notification-bell')).toBeVisible({ timeout: 15000 });
    await expect(inviteePage.getByTestId('notification-unread-badge')).toBeVisible({
      timeout: 15000,
    });

    // Opening the bell reveals the invitation (NTF-1/3).
    await inviteePage.getByTestId('notification-bell').click();
    await expect(
      inviteePage.getByTestId('notification-dropdown').getByText('Group Invitation'),
    ).toBeVisible({ timeout: 15000 });

    // Mark all read clears the badge (NTF-7).
    await inviteePage.getByRole('button', { name: /mark all read/i }).click();
    await expect(inviteePage.getByTestId('notification-unread-badge')).toBeHidden({
      timeout: 15000,
    });

    // The inbox carries the history, and the invitation reads as read (NTF-3/7).
    await inviteePage.goto('/notifications');
    const row = inviteePage.locator('[data-read]', { hasText: 'Group Invitation' });
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toHaveAttribute('data-read', 'true');

    // A full reload proves the read-state is server state, not local cache.
    await inviteePage.reload();
    const reloadedRow = inviteePage.locator('[data-read]', { hasText: 'Group Invitation' });
    await expect(reloadedRow).toBeVisible({ timeout: 15000 });
    await expect(reloadedRow).toHaveAttribute('data-read', 'true');

    // ── W-01 / W-02 — the inbox is a surface, not a display case ───────────
    //
    // Both defects escaped THIS journey, which is why they reached a live walk:
    // above, mark-all is pressed in the BELL dropdown, and the inbox is reached
    // only to assert history rendering. The journey never clicked an inbox row
    // (W-01) and never checked the badge after a PAGE-side mark-all (W-02).
    // Extended here rather than duplicated in a parallel spec, per the finding.
    //
    // Re-arming flips the existing row back to unread rather than inserting a
    // synthetic one — the same technique the live walk used, so what is asserted
    // is a real trigger-emitted notification throughout.
    // Scoped to the invitation alone (`type` is the DB column the RPC exposes
    // as `kind`): the invitee carries other notifications, and leaving those
    // read makes the badge assertions exact — one unread in, zero expected out.
    const adminRearm = createAdminClient();
    const rearmUnread = async () => {
      const { error } = await adminRearm
        .from('notifications')
        .update({ is_read: false, read_at: null })
        .eq('recipient_group_id', inviteePgId!)
        .eq('type', 'invitation_received');
      if (error) throw error;
    };
    const badge = inviteePage.getByTestId('notification-unread-badge');

    // W-01 (FEAT-H030:88 — "when I click it (dropdown or inbox)"): an unread
    // inbox row is clickable, marks itself read, and goes where it points.
    await rearmUnread();
    await inviteePage.goto('/notifications');
    await expect(badge).toBeVisible({ timeout: 15000 });
    const unreadRow = inviteePage.locator('[data-read="false"]', { hasText: 'Group Invitation' });
    await expect(unreadRow).toBeVisible({ timeout: 15000 });
    await unreadRow.getByRole('button').first().click();

    // TASK-DBT-02 adjudication (canonical-wins): W-04 made /groups the kind's
    // ANSWER PATH — "an explicit answering surface wins over the row's group,
    // because arriving at a page that cannot answer the question is the defect
    // W-04 named" (client.ts). The old /groups/<id> expectation was the
    // pre-W-04 dead end; the spec was behind canon, not the code.
    await expect(inviteePage).toHaveURL(/\/groups$/, { timeout: 15000 });
    // The badge follows the click without a reload — the sync contract spoken.
    await expect(badge).toBeHidden({ timeout: 15000 });

    // ...and it was server state, not a local flip.
    await inviteePage.goto('/notifications');
    await expect(
      inviteePage.locator('[data-read]', { hasText: 'Group Invitation' }),
    ).toHaveAttribute('data-read', 'true', { timeout: 15000 });

    // W-02 (FEAT-H030:72 — "...and the badge clears"): page-side mark-all, the
    // control the walk found stale. No reload between the press and the assert.
    await rearmUnread();
    await inviteePage.goto('/notifications');
    await expect(badge).toBeVisible({ timeout: 15000 });
    await inviteePage.getByRole('button', { name: /mark all read/i }).click();
    await expect(badge).toBeHidden({ timeout: 15000 });

    await inviteeCtx.close();
  });
});
