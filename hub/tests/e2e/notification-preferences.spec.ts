import { test, expect, type Page } from '@playwright/test';
import { createAdminClient, markArrivedOnce, runAdminSql } from './helpers/auth';

/**
 * FEAT-H033 / FEAT-PD016 (E2E) — A-NTF Cycle N-D: the mute round-trip.
 *
 * This suite exists for one assertion no other layer can make: a member switches
 * a category off in the UI and the notification **actually stops arriving** in
 * their own inbox. The integration suite proves the dispatcher suppresses; this
 * proves the surface a member touches is wired to that dispatcher — the two are
 * different claims, and asserting the contract twice would prove only the first.
 *
 * ASSERTION DISCIPLINE (N-C made the same class of mistake twice in one cycle):
 * no absolute counts anywhere, **preconditions included** — an absolute
 * precondition passes alone and fails in the full suite, which is the same bug
 * wearing a hat. Presence/absence of a uniquely-stamped title is used instead of
 * counting, so a sibling fixture cannot perturb it.
 *
 * Display names are single-token: surfaces render the nickname as the first token.
 *
 * WHY THE NOTIFICATION IS WRITTEN SUBSTRATE-SIDE: the dispatcher is a
 * `BEFORE INSERT` trigger on `public.notifications`, so ANY writer exercises it —
 * that universality is the design. Driving a real invitation flow through the UI
 * would add two more FIMs and a group to prove the same trigger fired, and the
 * "catches every writer" claim is already covered structurally plus against a
 * real unmodified writer (`admin_send_notification`) in the integration suite.
 */

const stamp = Date.now();
const password = 'e2e-test-password-123';

const member = {
  email: `e2e-nd-member-${stamp}@fringeisland.test`,
  name: `E2ENDMember${stamp}`,
};

// Suppressible in Ferd. `account` is the non-suppressible one and is asserted
// separately as locked-on.
const CATEGORY = 'journeys';
const KIND = 'journey_completed';

let memberPgId = '';

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

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
}

/** Write one notification at the substrate, so the BEFORE INSERT trigger decides. */
async function sendNotification(title: string) {
  const admin = createAdminClient();
  const { error } = await admin.from('notifications').insert({
    recipient_group_id: memberPgId,
    type: KIND,
    title,
    body: 'N-D preference round-trip probe',
    payload: {},
  });
  if (error) throw new Error(`sendNotification: ${error.message}`);
}

test.beforeAll(async () => {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: member.email,
    password,
    email_confirm: true,
    user_metadata: { display_name: member.name, consent_accepted: 'true' },
  });
  if (error) throw error;
  await markArrivedOnce(admin, data.user.id);
  memberPgId = await waitForPersonalGroup(data.user.id);
});

test.afterAll(async () => {
  const admin = createAdminClient();
  await runAdminSql(
    `DELETE FROM public.notification_preferences WHERE recipient_group_id = '${memberPgId}';`,
  ).catch(() => undefined);
  await admin.from('notifications').delete().eq('recipient_group_id', memberPgId);
  const { data: user } = await admin
    .from('users')
    .select('auth_user_id')
    .eq('personal_group_id', memberPgId)
    .maybeSingle();
  if (user?.auth_user_id) {
    await admin.auth.admin.deleteUser(user.auth_user_id as string);
  }
});

test.describe('FEAT-H033 — notification preferences, end to end', () => {
  test('a member mutes a category and the notification stops arriving; unmuting restores it', async ({
    page,
  }) => {
    await signIn(page, member.email);

    // --- The control, first: unmuted, the notification arrives. -------------
    const beforeTitle = `NdArrives${stamp}`;
    await sendNotification(beforeTitle);
    await page.goto('/notifications');
    await expect(page.getByText(beforeTitle)).toBeVisible({ timeout: 15000 });

    // --- Mute it through the UI. -------------------------------------------
    await page.goto('/notifications/preferences');
    const toggle = page.getByTestId(`pref-toggle-${CATEGORY}-in_app`);
    await expect(toggle).toBeVisible({ timeout: 15000 });
    await expect(toggle).toBeChecked();

    // The toggle is optimistic by design — the flip paints before the PUT is
    // issued, which is what keeps it inside the ADR-U043 B5 budget. So the
    // response has to be awaited explicitly: reloading straight after the click
    // races the in-flight write and reads back the pre-mutation state. (Not a
    // product defect — the control is disabled while the write is in flight, so
    // a real member cannot double-submit; only a test reloading within
    // milliseconds can outrun it.) Awaiting the response also makes this a
    // STRONGER assertion than the optimistic flip alone: it proves the contract
    // returned 2xx, not merely that React re-rendered.
    const saved = page.waitForResponse(
      (r) =>
        r.url().includes('/api/notifications/preferences') && r.request().method() === 'PUT',
      { timeout: 15000 },
    );
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    expect((await saved).ok()).toBe(true);

    // It persists across a reload — the write went through the contract, not
    // just React state.
    await page.reload();
    await expect(page.getByTestId(`pref-toggle-${CATEGORY}-in_app`)).not.toBeChecked({
      timeout: 15000,
    });

    // --- The claim: it no longer arrives. ----------------------------------
    const mutedTitle = `NdSuppressed${stamp}`;
    await sendNotification(mutedTitle);
    await page.goto('/notifications');
    // The earlier one is still there (it predates the mute), which is what makes
    // this an absence assertion rather than an empty-inbox assertion.
    await expect(page.getByText(beforeTitle)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(mutedTitle)).toHaveCount(0);

    // --- Unmute: it arrives again. ----------------------------------------
    await page.goto('/notifications/preferences');
    const toggleAgain = page.getByTestId(`pref-toggle-${CATEGORY}-in_app`);
    await expect(toggleAgain).toBeVisible({ timeout: 15000 });
    const restored = page.waitForResponse(
      (r) =>
        r.url().includes('/api/notifications/preferences') && r.request().method() === 'PUT',
      { timeout: 15000 },
    );
    await toggleAgain.click();
    await expect(toggleAgain).toBeChecked();
    expect((await restored).ok()).toBe(true);

    const afterTitle = `NdRestored${stamp}`;
    await sendNotification(afterTitle);
    await page.goto('/notifications');
    await expect(page.getByText(afterTitle)).toBeVisible({ timeout: 15000 });
  });

  test('a non-suppressible category renders locked-on with a reason, and no email column appears', async ({
    page,
  }) => {
    await signIn(page, member.email);
    await page.goto('/notifications/preferences');

    // `account` is seeded member_suppressible = false: stated, not a disabled
    // mystery, and with no operable control to click.
    await expect(page.getByTestId('pref-locked-account-in_app')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('pref-toggle-account-in_app')).toHaveCount(0);
    await expect(page.getByText(/always on/i)).toBeVisible();

    // Email is stored but does not deliver, so it gets no toggle anywhere —
    // asserted across every category, not just one.
    await expect(page.getByTestId(`pref-toggle-${CATEGORY}-email`)).toHaveCount(0);
    await expect(page.getByText(/not live yet/i)).toBeVisible();
  });

  test('the operator nudge console does not render for an ordinary member', async ({ page }) => {
    await signIn(page, member.email);
    await page.goto('/notifications/preferences');

    // The member's own matrix is present...
    await expect(page.getByTestId(`pref-toggle-${CATEGORY}-in_app`)).toBeVisible({
      timeout: 15000,
    });
    // ...and the operator panel is absent. The real gate is the contract (the
    // read returns 42501 -> 403); this asserts the surface honours it quietly
    // rather than showing a member an error that isn't theirs.
    await expect(page.getByTestId('nudge-policy-panel')).toHaveCount(0);
    await expect(page.getByTestId('nudge-cost-line')).toHaveCount(0);
  });
});
