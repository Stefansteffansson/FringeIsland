import { test, expect, type Browser } from '@playwright/test';
import { openAs, evidence, groupByName, auditRows, type Actor } from './helpers/cast';

/**
 * DB-4 live walk — Leg 8: preserved threads — a platform admin reads a closed
 * group's sealed thread, read-only and audited (FEAT-H041, TASK-SEAL-01/02).
 * Script: docs/planning/hub-v2/2026-09-05-db4-walk-legs-4-5-6-8.md.
 *
 * Actors: Astrid and Wanda in B (both signed in, in turn); walk-admin in A.
 * Closing Drift as its last member seals its group conversations — the walk
 * CLOSES the cast's Drift, as the script says. On a re-run with Drift already
 * closed the leg skips and says so: re-create the cast (`walk:cast teardown`
 * then `create`) rather than improvising a group the script never named.
 */

test.describe.configure({ mode: 'serial' });

// Stamped per run: a re-run must not collide with an earlier run's thread of the same title.
const TITLE = `Walk leg 8 — evidence thread (run ${new Date().toISOString().slice(11, 19)})`;
const LINE = 'Leg 8 evidence: this line is what the admin will read.';
const REPLY = 'Leg 8 evidence: the reply.';

let astrid: Actor;
let wanda: Actor;
let admin: Actor;
let drift: { id: string; status: string };
let conversationId: string;

test.beforeAll(async ({ browser }: { browser: Browser }) => {
  const g = await groupByName('Drift');
  test.skip(!g || g.status !== 'active', `Drift is ${g?.status ?? 'missing'} on the test project — re-create the cast before leg 8`);
  drift = g!;
  astrid = await openAs(browser, 'astrid');
  wanda = await openAs(browser, 'wanda');
  admin = await openAs(browser, 'admin');
});

test.afterAll(async () => {
  for (const a of [astrid, wanda, admin]) await a?.context.close();
});

test.describe('Leg 8 — preserved threads: the admin reads a closed group\'s sealed thread', () => {
  test('step 1 — B, Astrid: a new group conversation in Drift, one line sent', async () => {
    await astrid.page.goto(`/groups/${drift.id}`);
    const panel = astrid.page.getByTestId('group-conversations');
    await expect(panel).toBeVisible({ timeout: 20_000 });
    await panel.getByTestId('conversation-create').click();
    const title = panel.getByLabel('Conversation title');
    await title.fill(TITLE);
    // The create row's own Open — existing threads in the list carry an Open too.
    await title.locator('xpath=..').getByRole('button', { name: /^open$/i }).click();
    await expect(astrid.page).toHaveURL(/\/messages\/[0-9a-f-]{36}/, { timeout: 20_000 });
    conversationId = astrid.page.url().match(/\/messages\/([0-9a-f-]{36})/)![1];
    await astrid.page.getByRole('textbox', { name: 'Message' }).fill(LINE);
    await astrid.page.getByRole('button', { name: /^send$/i }).click();
    await expect(astrid.page.getByText(LINE)).toBeVisible({ timeout: 20_000 });
    await expect(astrid.page.getByTestId('pending-sending')).toHaveCount(0, { timeout: 20_000 });
    await evidence(astrid.page, 'leg8 step1 astrid line sent');
  });

  test('step 2 — B, Wanda: reply once, then leave Drift — one member remains', async () => {
    await wanda.page.goto(`/groups/${drift.id}`);
    const panel = wanda.page.getByTestId('group-conversations');
    await expect(panel).toBeVisible({ timeout: 20_000 });
    // The row renders Join until Wanda is a participant, Open after — wait for
    // either (the list loads async), join if offered, then the thread is hers.
    const row = panel.locator(
      `[data-testid="conversation-join-${conversationId}"], [data-testid="conversation-open-${conversationId}"]`,
    );
    await expect(row.first()).toBeVisible({ timeout: 20_000 });
    const join = panel.getByTestId(`conversation-join-${conversationId}`);
    if (await join.count()) {
      // Without an acting hat, Join needs no confirmation: `doJoin` calls the
      // platform and pushes straight into the thread (a confirm appears only
      // when a group acts as a member — not this walk).
      await join.click();
      await wanda.page.waitForURL(new RegExp(`/messages/${conversationId}`), { timeout: 20_000 });
    } else {
      await wanda.page.goto(`/messages/${conversationId}`);
    }
    await wanda.page.getByRole('textbox', { name: 'Message' }).fill(REPLY);
    await wanda.page.getByRole('button', { name: /^send$/i }).click();
    await expect(wanda.page.getByText(REPLY)).toBeVisible({ timeout: 20_000 });
    await expect(wanda.page.getByTestId('pending-sending')).toHaveCount(0, { timeout: 20_000 });
    await evidence(wanda.page, 'leg8 step2 wanda replied');

    await wanda.page.goto(`/groups/${drift.id}`);
    await wanda.page.getByTestId('leave-group').click();
    await wanda.page.getByTestId('confirm-modal-confirm').click();
    await expect(wanda.page.getByTestId('leave-group')).toHaveCount(0, { timeout: 20_000 });
    await evidence(wanda.page, 'leg8 step2 wanda left drift');
  });

  test('step 3 — B, Astrid: the End of this group box → Close this group → Close group; Drift reads closed', async () => {
    await astrid.page.goto(`/groups/${drift.id}`);
    await expect(astrid.page.getByText('End of this group')).toBeVisible({ timeout: 20_000 });
    await evidence(astrid.page, 'leg8 step3 end of this group box');
    await astrid.page.getByTestId('close-group').click();
    await expect(astrid.page.getByText('Close this group?')).toBeVisible();
    await astrid.page.getByRole('button', { name: /^close group$/i }).click();
    await expect.poll(async () => (await groupByName('Drift'))?.status, { timeout: 20_000 }).toBe('closed');
    await astrid.page.goto('/groups');
    await evidence(astrid.page, 'leg8 step3 astrid groups after close');
  });

  test('step 4 — A, walk-admin: /admin/groups → Drift (closed) → Preserved threads; the thread carries Sealed', async () => {
    await admin.page.goto(`/admin/groups/${drift.id}`);
    await expect(admin.page.getByTestId('status-badge')).toContainText('closed', { timeout: 20_000 });
    const section = admin.page.getByTestId('closed-threads-section');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { name: /preserved threads/i })).toBeVisible();
    const row = section.getByTestId('closed-thread-row').filter({ hasText: TITLE });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByTestId('sealed-badge')).toContainText(/sealed/i);
    await evidence(admin.page, 'leg8 step4 preserved threads');
  });

  test('step 5 — A: the read-only sealed view — both lines readable; no composer, no reply, no reactions', async () => {
    const section = admin.page.getByTestId('closed-threads-section');
    await section.getByTestId(`open-closed-thread-${conversationId}`).click();
    const view = section.getByTestId('closed-thread-view');
    await expect(view.getByTestId('sealed-thread-label')).toContainText(/sealed/i);
    await expect(view.getByTestId('sealed-thread-label')).toContainText(/nothing here is live/i);
    await expect(view.getByText(LINE)).toBeVisible();
    await expect(view.getByText(REPLY)).toBeVisible();
    await expect(view.getByRole('textbox')).toHaveCount(0);
    await expect(view.getByRole('button', { name: /send|reply|react|join|leave/i })).toHaveCount(0);
    await evidence(admin.page, 'leg8 step5 sealed view read-only');
  });

  test('step 6 — A: the read is audited — a row for this thread, and /admin/audit shows it newest', async () => {
    const rows = await auditRows({ target: conversationId });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    await admin.page.goto('/admin/audit');
    const first = admin.page.locator('[data-testid^="admin-audit-row-"]').first();
    await expect(first).toBeVisible({ timeout: 20_000 });
    await expect(first).toContainText(rows[0].action);
    await evidence(admin.page, 'leg8 step6 audit row');
  });

  test('step 7 — B, Astrid (the member door): the sealed thread is not a live conversation', async () => {
    await astrid.page.goto(`/messages/${conversationId}`);
    await expect(astrid.page.getByRole('textbox', { name: 'Message' })).toHaveCount(0, { timeout: 20_000 });
    await evidence(astrid.page, 'leg8 step7 member door refuses');
  });
});
