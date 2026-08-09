import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createAdminClient, markArrivedOnce, deleteE2EUserByAuthId } from './helpers/auth';

/**
 * FEAT-H032 (E2E) — A-NTF Cycle N-C: the bell goes LIVE (NTF-9).
 *
 * The three things only a browser can prove, and the reason this spec exists:
 *
 *  1. **Live arrival.** A member sitting still on a page learns about a real
 *     invitation without navigating or remounting. Driven by a REAL steward
 *     invitation, so the whole path is exercised — the invite RPC, the
 *     pre-existing delivery trigger, the new N-C emit trigger, the private
 *     channel, the tenant, and the bell's authorized re-read.
 *  2. **Reconnect reconciliation — the ported oracle's SILENT row.** NTF-9 has
 *     never had coverage anywhere: v1 had no reconnect path to port. A dropped
 *     socket and a hidden tab both cost latency and never data (ADR-U039:25).
 *  3. **The capability MOVED, it did not vanish.** N-B deleted the bespoke
 *     nominations panel and N-C removed its orphaned read; a real stewardship
 *     nomination must still reach the member in the bell.
 *
 * Test-tier discipline: the coalescing, status-transition, teardown and
 * no-payload-render logic lives at the unit tier
 * (tests/unit/lib/realtime/notifications-tenant.test.ts) — this spec asserts
 * only the journey, and asserts the OBSERVABLE EFFECT of every interaction
 * rather than the interaction itself.
 *
 * Session isolation: own spec-created FIMs in their own contexts (never the
 * shared storageState). Single-token display names (the personal-group nickname
 * render rule).
 */

const stamp = Date.now();
const password = 'e2e-test-password-123';
const stewardEmail = `e2e-nc-steward-${stamp}@fringeisland.test`;
const memberEmail = `e2e-nc-member-${stamp}@fringeisland.test`;
const memberName = `E2ENCMember${stamp}`;
const groupName = `E2E N-C Live ${stamp}`;

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

/** Seed a durable notification the same way any platform writer does — the
 *  N-C trigger fires on the INSERT, so this exercises the real emit path. */
async function seedNotification(recipientPgId: string, title: string, type = 'admin_notification') {
  const admin = createAdminClient();
  const { error } = await admin.from('notifications').insert({
    recipient_group_id: recipientPgId,
    type,
    title,
    body: 'N-C live E2E body',
    payload: {},
  });
  if (error) throw new Error(`seed notification: ${error.message}`);
}

const badge = (page: Page) => page.getByTestId('notification-unread-badge');

/**
 * Unread count as a number. Assertions below are RELATIVE to a baseline taken
 * after the first live arrival, never absolute: the platform emits its own
 * notifications organically (account creation, membership churn — by design,
 * per the FEAT-PD013 flip-green amendment), so pinning an absolute total would
 * couple this spec to unrelated emissions and rot. What NTF-9 must prove is the
 * DELTA arriving without a remount, which is exactly what these assert.
 */
async function unreadCount(page: Page): Promise<number> {
  const b = badge(page);
  if ((await b.count()) === 0) return 0;
  const text = (await b.innerText()).trim();
  return text.endsWith('+') ? Number.parseInt(text, 10) : Number(text);
}

/**
 * Wait until the badge has risen by at least `delta` from `before`.
 *
 * `>=` rather than `===` deliberately: the platform emits its own notifications
 * organically and one can land mid-test. An exact match would then fail for a
 * reason that has nothing to do with NTF-9. `>=` still fails honestly if the
 * seeded arrivals never reach the surface — which is the whole claim.
 */
async function expectRisenBy(page: Page, before: number, delta: number, timeout = 30000) {
  await expect
    .poll(() => unreadCount(page), {
      timeout,
      message: `unread should rise from ${before} by at least ${delta}`,
    })
    .toBeGreaterThanOrEqual(before + delta);
}

test.describe.serial('FEAT-H032 — the notification bell goes live (NTF-9)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let stewardCtx: BrowserContext;
  let stewardPage: Page;
  let memberCtx: BrowserContext;
  let memberPage: Page;

  let steward: { authId: string; pgId: string };
  let member: { authId: string; pgId: string };
  let groupId: string | null = null;
  /** Unread count right after the first live arrival — every later assertion
   *  is a delta from here, never an absolute total. */
  let baseline = 0;

  test.beforeAll(async ({ browser }) => {
    steward = await createFim(stewardEmail, `E2ENCSteward${stamp}`);
    member = await createFim(memberEmail, memberName);

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

    memberCtx = await browser.newContext();
    memberPage = await memberCtx.newPage();
    await signIn(memberPage, memberEmail);
  });

  test.afterAll(async () => {
    await stewardCtx?.close();
    await memberCtx?.close();
    const admin = createAdminClient();
    for (const u of [steward, member]) {
      if (!u) continue;
      await admin.from('notifications').delete().eq('recipient_group_id', u.pgId);
    }
    if (groupId) await admin.from('groups').delete().eq('id', groupId);
    for (const u of [member, steward]) {
      if (!u) continue;
      if (u.pgId) await admin.from('groups').delete().eq('id', u.pgId);
      if (u.authId) await deleteE2EUserByAuthId(admin, u.authId);
    }
  });

  test('STORY-1: a real invitation lights the bell with no navigation', async () => {
    // The member parks on a page and does NOT touch it again for the rest of
    // the test. Any badge change therefore cannot come from a remount.
    await memberPage.goto('/journal');
    await expect(memberPage.getByTestId('notification-bell')).toBeVisible({ timeout: 15000 });

    // No absolute precondition: the platform emits organically at account
    // creation, so whether the badge starts at zero depends on how long ago the
    // fixture user was made. (Learned the hard way — an earlier version asserted
    // an empty badge, passed when run alone, and failed inside the full suite
    // where the organic rows had had time to land.) The claim is a RISE.
    const before = await unreadCount(memberPage);
    const urlBefore = memberPage.url();

    // A real steward invitation, driven through the Steward's OWN browser —
    // the whole delivery path, and a genuine second actor. (The RPC is
    // FIM-only by design, so a service-role call is refused 42501; the UI is
    // both the faithful path and the only one a Steward actually has.)
    await stewardPage.goto(`/groups/${groupId}`);
    await expect(stewardPage.getByTestId('invitations-panel')).toBeVisible({ timeout: 15000 });
    await stewardPage.getByTestId('member-search-input').fill(memberName);
    const hit = stewardPage.getByTestId('member-search-results').getByText(memberName);
    await expect(hit).toBeVisible({ timeout: 10000 });
    await hit.click();
    await expect(stewardPage.getByTestId('pending-invitations').getByText(memberName)).toBeVisible({
      timeout: 15000,
    });

    // The observable effect: the badge appears while the member sits still.
    // It was ABSENT a moment ago (asserted above), so its appearance is the
    // live arrival — the whole point of NTF-9.
    await expectRisenBy(memberPage, before, 1);

    // Proof it was live, not a navigation: the URL never changed.
    expect(memberPage.url()).toBe(urlBefore);

    // The invitation itself is really there — a count alone is not coverage.
    await memberPage.getByTestId('notification-bell').click();
    const dd = memberPage.getByTestId('notification-dropdown');
    await expect(dd).toBeVisible();
    await expect(dd.getByText(/invitation/i).first()).toBeVisible({ timeout: 15000 });
    await memberPage.getByTestId('notification-bell').click(); // close

    baseline = await unreadCount(memberPage);
    expect(baseline).toBeGreaterThan(before);
  });

  test('STORY-2: notifications arriving while OFFLINE are reconciled on reconnect', async () => {
    // The oracle's SILENT row. A dropped socket must cost latency, never data.
    const before = await unreadCount(memberPage);
    await memberCtx.setOffline(true);
    await seedNotification(member.pgId, `Offline arrival ${stamp}`);
    await seedNotification(member.pgId, `Offline arrival two ${stamp}`);

    // Offline, the hints cannot land — the badge is allowed to be stale here.
    await memberCtx.setOffline(false);

    // On reconnect the surface re-reads through the authorized path and
    // catches up on everything it missed.
    await expectRisenBy(memberPage, before, 2);
  });

  test('STORY-2: a hidden tab catches up on visibility regain', async () => {
    const before = await unreadCount(memberPage);

    // Hide the tab, so the visibility listener — not the socket — is the path
    // under test.
    await memberPage.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await seedNotification(member.pgId, `Hidden-tab arrival ${stamp}`);

    await memberPage.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await expectRisenBy(memberPage, before, 1);
  });

  test('STORY-1: the dropdown shows the live-arrived rows, and mark-all clears the badge', async () => {
    await memberPage.getByTestId('notification-bell').click();
    const dropdown = memberPage.getByTestId('notification-dropdown');
    await expect(dropdown).toBeVisible();

    // The rows that arrived live are really there — not just a count.
    await expect(dropdown.getByText(/Offline arrival/).first()).toBeVisible({ timeout: 15000 });
    await expect(dropdown.getByText(/Hidden-tab arrival/).first()).toBeVisible();

    await dropdown.getByRole('button', { name: /mark all read/i }).click();
    await expect(badge(memberPage)).toHaveCount(0);
  });

  test('the live subscription survives a client-side route change', async () => {
    // REPLACED a "read-state survives a revisit" assertion that belonged to
    // N-A and is already covered by notifications.spec.ts. It also pinned an
    // absolute zero, which is brittle here for the same reason the counts above
    // are deltas — the platform emits organically, so "no badge" is not a
    // stable post-condition.
    //
    // What N-C actually needs proving, and nothing else covers: the tenant is
    // APP-WIDE (registered in AuthContext, not per page), so a client-side
    // route change must not cost the subscription. A per-page subscription
    // would pass every test above and still go deaf the moment a member
    // navigated — which is most of a session.
    //
    // Navigation is in ONE JS context (the J-D rule): a full page.goto would
    // remount everything and prove nothing about continuity.
    const before = await unreadCount(memberPage);

    await memberPage.getByRole('link', { name: /notifications/i }).first().click();
    await expect(memberPage).toHaveURL(/\/notifications/, { timeout: 15000 });

    // Arrive AFTER the route change, with no remount in between.
    await seedNotification(member.pgId, `Post-navigation arrival ${stamp}`);
    await expectRisenBy(memberPage, before, 1);
  });
});
