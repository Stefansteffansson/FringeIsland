import { test, expect, type Browser } from '@playwright/test';
import { openAs, evidence, userByEmail, auditRows, CAST, type Actor, type CastUser } from './helpers/cast';

/**
 * DB-4 live walk — Leg 4: the bulk bar collects ONE member-facing reason and
 * reports per member (FEAT-H039 + FEAT-H049 STORY-1; FEAT-PC030 requires the
 * reason per call). Script: docs/planning/hub-v2/2026-09-05-db4-walk-legs-4-5-6-8.md.
 *
 * Actors: walk-admin in A; Mona in B — two contexts, both signed in at once, so
 * Mona's window is live while the admin acts on her (the in-session wall, the
 * instant sign-out hint). Kalle is acted upon but never signs in.
 *
 * Every numbered test is the script's step of the same number; "Green" and
 * "Red looks like" are the script's. A red here is a finding to record with
 * the leg and step — the script is wrong first (the leg-7 lesson), then the
 * product.
 */

test.describe.configure({ mode: 'serial' });

// The script's wording, stamped per run: a re-run on the same cast leaves the
// earlier run's notices in Mona's bell, and each body must resolve to ONE row.
const RUN = new Date().toISOString().slice(11, 19);
const REASON_HOLD = `Walk leg 4 — a bulk hold, one reason for both. (run ${RUN})`;
const REASON_LIFT = `Walk leg 4 — reinstated. (run ${RUN})`;
const REASON_KALLE = `Walk leg 4 — Kalle alone, for the mixed pair. (run ${RUN})`;
const REASON_MIXED = `Walk leg 4 — the mixed pair. (run ${RUN})`;
const REASON_LIFT_2 = `Walk leg 4 — reinstated after the mixed pair. (run ${RUN})`;
const REFUSAL = 'User is already in the requested state';

let admin: Actor;
let mona: Actor;
let monaAgain: Actor | null = null;
let monaUser: CastUser;
let kalleUser: CastUser;

async function searchWalk(page: Actor['page']) {
  await page.goto('/admin/members');
  await page.getByRole('searchbox', { name: /search/i }).fill('walk-');
  // Exactly the six walk rows — on any other count the population is wrong (P4).
  await expect(page.getByTestId(/^admin-member-row-/)).toHaveCount(6, { timeout: 20_000 });
}

async function tick(page: Actor['page'], ...names: string[]) {
  for (const n of names) await page.getByRole('checkbox', { name: `Select ${n}` }).check();
  await expect(page.getByTestId('selection-count')).toHaveText(`${names.length} selected`);
}

async function confirmWithReason(page: Actor['page'], reason: string) {
  const modal = page.getByTestId('confirm-modal');
  await expect(modal).toBeVisible();
  // The leg's first proof: a blank reason cannot be sent.
  await expect(page.getByTestId('confirm-modal-confirm')).toBeDisabled();
  await page.getByTestId('ceremony-reason').fill(reason);
  await expect(page.getByTestId('confirm-modal-confirm')).toBeEnabled();
  await page.getByTestId('confirm-modal-confirm').click();
}

/**
 * Settle: an interrupted earlier run can leave Mona or Kalle suspended; the leg
 * starts from an active pair (step 2 asserts Reactivate disabled). Done through
 * the product's own bulk reactivate — a walk never writes around the product.
 */
async function ensureActive(page: Actor['page']) {
  await searchWalk(page);
  const held: string[] = [];
  for (const [name, u] of [['Mona', monaUser], ['Kalle', kalleUser]] as const) {
    if ((await page.getByTestId(`admin-member-row-${u.id}`).textContent())?.includes('suspended')) held.push(name);
  }
  if (!held.length) return;
  await tick(page, ...held);
  await page.getByTestId('bulk-reactivate').click();
  await confirmWithReason(page, 'Walk leg 4 — settling an interrupted run before the leg starts.');
  for (const u of [monaUser, kalleUser]) {
    await expect(page.getByTestId(`admin-member-row-${u.id}`)).not.toContainText('suspended', { timeout: 20_000 });
  }
}

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  [monaUser, kalleUser] = await Promise.all([userByEmail(CAST.mona.email), userByEmail(CAST.kalle.email)]);
  admin = await openAs(browser, 'admin');
  await ensureActive(admin.page);
  mona = await openAs(browser, 'mona');
  await mona.page.goto('/groups');
});

test.afterAll(async () => {
  for (const a of [admin, mona, monaAgain]) await a?.context.close();
});

test.describe('Leg 4 — the bulk bar: one reason, per-member outcomes', () => {
  test('step 1 — A: the search shows exactly the six walk rows; As-of and the pager render', async () => {
    await searchWalk(admin.page);
    await expect(admin.page.getByTestId('as-of')).toBeVisible();
    await expect(admin.page.getByTestId('pager-prev')).toBeDisabled();
    await evidence(admin.page, 'leg4 step1 six walk rows');
  });

  test('step 2 — A: Select Mona and Kalle → "2 selected"; Reactivate disabled, Suspend enabled', async () => {
    await tick(admin.page, 'Mona', 'Kalle');
    await expect(admin.page.getByTestId('bulk-reactivate')).toBeDisabled();
    await expect(admin.page.getByTestId('bulk-suspend')).toBeEnabled();
    await expect(admin.page.getByTestId('bulk-force-logout')).toBeVisible();
    await evidence(admin.page, 'leg4 step2 two selected');
  });

  test('step 3 — A: Bulk suspend — ONE reason field; Confirm disabled until the reason is non-blank', async () => {
    await admin.page.getByTestId('bulk-suspend').click();
    await expect(admin.page.getByTestId('confirm-modal')).toContainText(/bulk suspend/i);
    await expect(admin.page.getByTestId('ceremony-reason')).toHaveCount(1);
    await evidence(admin.page, 'leg4 step3 modal confirm disabled');
    await confirmWithReason(admin.page, REASON_HOLD);
  });

  test('step 4 — A: per-member outcomes, both rows Suspended, selection cleared; the detail shows the reason', async () => {
    await expect(admin.page.getByTestId('bulk-outcomes')).toBeVisible({ timeout: 20_000 });
    await expect(admin.page.getByTestId(`bulk-outcome-${monaUser.id}`)).toContainText('done');
    await expect(admin.page.getByTestId(`bulk-outcome-${kalleUser.id}`)).toContainText('done');
    await expect(admin.page.getByTestId(`admin-member-row-${monaUser.id}`)).toContainText('suspended', { timeout: 20_000 });
    await expect(admin.page.getByTestId(`admin-member-row-${kalleUser.id}`)).toContainText('suspended');
    await expect(admin.page.getByTestId('selection-count')).toHaveCount(0);
    await evidence(admin.page, 'leg4 step4 outcomes');

    // Script correction (first run, 2026-09-06): the script claimed the admin
    // detail "shows Suspended and the reason". FEAT-H049's privacy line says the
    // reason renders only where the platform delivers it — the member's own
    // account read and the notification rows — and `AdminMemberDetail` renders
    // no reason line. The rail shows the state; the reason is proved on Mona's
    // own surface (step 5) and in her notices (step 7).
    await admin.page.goto(`/admin/members/${monaUser.id}`);
    await expect(admin.page.getByTestId('state-badge')).toHaveText('suspended', { timeout: 20_000 });
    await evidence(admin.page, 'leg4 step4 mona detail suspended');
  });

  test('step 5 — B: Mona\'s live window hits the suspended-account surface with the reason (no hard reload)', async () => {
    // "click anything" — a navigation inside her signed-in window.
    await mona.page.goto('/groups');
    await expect(mona.page.getByTestId('account-suspended-surface')).toBeVisible({ timeout: 20_000 });
    await expect(mona.page.getByTestId('suspension-reason')).toContainText(REASON_HOLD);
    await evidence(mona.page, 'leg4 step5 mona suspended surface');
  });

  test('step 6 — A: Bulk reactivate — Suspend disabled, Reactivate enabled, its own reason; rows Active', async () => {
    await searchWalk(admin.page);
    await tick(admin.page, 'Mona', 'Kalle');
    await expect(admin.page.getByTestId('bulk-suspend')).toBeDisabled();
    await expect(admin.page.getByTestId('bulk-reactivate')).toBeEnabled();
    await admin.page.getByTestId('bulk-reactivate').click();
    await expect(admin.page.getByTestId('confirm-modal')).toContainText(/bulk reactivate/i);
    await confirmWithReason(admin.page, REASON_LIFT);
    await expect(admin.page.getByTestId(`bulk-outcome-${monaUser.id}`)).toContainText('done', { timeout: 20_000 });
    await expect(admin.page.getByTestId(`bulk-outcome-${kalleUser.id}`)).toContainText('done');
    await expect(admin.page.getByTestId(`admin-member-row-${monaUser.id}`)).not.toContainText('suspended', { timeout: 20_000 });
    await expect(admin.page.getByTestId(`admin-member-row-${kalleUser.id}`)).not.toContainText('suspended');
    await evidence(admin.page, 'leg4 step6 reactivated');
  });

  test('step 7 — B: Mona signs in again — two plain notices, the reasons as bodies, no action affordance', async ({ browser }) => {
    monaAgain = await openAs(browser, 'mona');
    await monaAgain.page.goto('/notifications');
    await expect(monaAgain.page.getByText(REASON_HOLD)).toBeVisible({ timeout: 20_000 });
    await expect(monaAgain.page.getByText(REASON_LIFT)).toBeVisible();
    await expect(monaAgain.page.getByText(/suspended/i).first()).toBeVisible();
    await expect(monaAgain.page.getByText(/reinstated/i).first()).toBeVisible();
    await expect(monaAgain.page.locator('[data-testid^="notif-action-"]')).toHaveCount(0);
    await evidence(monaAgain.page, 'leg4 step7 two plain notices');
  });

  test('step 8 — A: the mixed pair — Mona succeeds, Kalle refused verbatim; then both reactivated', async () => {
    // Kalle alone first, so the pair is mixed.
    await searchWalk(admin.page);
    await tick(admin.page, 'Kalle');
    await admin.page.getByTestId('bulk-suspend').click();
    await confirmWithReason(admin.page, REASON_KALLE);
    await expect(admin.page.getByTestId(`bulk-outcome-${kalleUser.id}`)).toContainText('done', { timeout: 20_000 });

    await searchWalk(admin.page);
    await tick(admin.page, 'Mona', 'Kalle');
    await expect(admin.page.getByTestId('bulk-suspend')).toBeEnabled(); // one of them could take it
    await admin.page.getByTestId('bulk-suspend').click();
    await confirmWithReason(admin.page, REASON_MIXED);
    await expect(admin.page.getByTestId(`bulk-outcome-${monaUser.id}`)).toContainText('done', { timeout: 20_000 });
    await expect(admin.page.getByTestId(`bulk-outcome-${kalleUser.id}`)).toContainText(REFUSAL);
    await evidence(admin.page, 'leg4 step8 mixed pair refusal verbatim');

    // Leave the cast clean for leg 5.
    await searchWalk(admin.page);
    await tick(admin.page, 'Mona', 'Kalle');
    await admin.page.getByTestId('bulk-reactivate').click();
    await confirmWithReason(admin.page, REASON_LIFT_2);
    await expect(admin.page.getByTestId(`bulk-outcome-${monaUser.id}`)).toContainText('done', { timeout: 20_000 });
    await expect(admin.page.getByTestId(`bulk-outcome-${kalleUser.id}`)).toContainText('done');
    await expect(admin.page.getByTestId(`admin-member-row-${monaUser.id}`)).not.toContainText('suspended', { timeout: 20_000 });
  });

  test('step 9 — A: force sign-out — no reason field; B: Mona\'s next request lands on sign-in', async () => {
    await searchWalk(admin.page);
    await tick(admin.page, 'Mona');
    await admin.page.getByTestId('bulk-force-logout').click();
    await expect(admin.page.getByTestId('confirm-modal')).toContainText(/force sign-out/i);
    await expect(admin.page.getByTestId('ceremony-reason')).toHaveCount(0);
    await evidence(admin.page, 'leg4 step9 force sign-out no reason field');
    await admin.page.getByTestId('confirm-modal-confirm').click();
    await expect(admin.page.getByTestId(`bulk-outcome-${monaUser.id}`)).toContainText('done', { timeout: 20_000 });

    // ADR-U039's instant hint: Mona's window moves itself to sign-in within
    // seconds. A navigation of our own may be aborted by that very move
    // (net::ERR_ABORTED on the first run) — which is the proof, not a failure.
    const m = monaAgain ?? mona;
    try {
      await m.page.goto('/groups', { waitUntil: 'commit' });
    } catch {
      /* the hint navigated first */
    }
    await expect(m.page).toHaveURL(/\/login/, { timeout: 20_000 });
    await evidence(m.page, 'leg4 step9 mona on sign-in');
  });

  test('the substrate — an audit row per member for every hold; none for the refusal', async () => {
    const monaHolds = await auditRows({ action: 'member.suspend', target: monaUser.id });
    const kalleHolds = await auditRows({ action: 'member.suspend', target: kalleUser.id });
    // Mona: the bulk hold + the mixed pair; Kalle: the bulk hold + his solo hold (the refusal writes none).
    expect(monaHolds.length).toBeGreaterThanOrEqual(2);
    expect(kalleHolds.length).toBeGreaterThanOrEqual(2);
  });
});
