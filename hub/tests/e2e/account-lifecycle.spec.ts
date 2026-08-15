import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient, markArrivedOnce, E2E_PASSWORD, deleteE2EUserByAuthId } from './helpers/auth';

/**
 * FEAT-H029 + FEAT-H007 — Cycle C-F E2E (IDN-10/IDN-12).
 *
 * Journey 1 — the absence loop: an active FIM pauses from the profile page
 * (ConfirmModal), lands on the paused surface, reactivates (ConfirmModal),
 * and is back in the active experience with everything intact.
 *
 * Journey 2 — the departure: a purpose-created FIM (deletion is terminal —
 * never the shared session fixture) walks the delete ceremony (consequence
 * copy, export offer, type-to-confirm), reaches the farewell, and is signed
 * out for good; a co-member still reads the departed member's forum post,
 * no longer attributed by the departed member's name (F-2 communal
 * retention + read-time tombstone, ADR-U021).
 *
 * Journey 3 — the return (TASK-IDN-01, journey tier, labelled post-
 * implementation per the H018 pattern — the demonstrated reds live at the
 * integration + unit tiers): a FIM deletes, signs back in inside the grace
 * window, meets the restore door naming the scheduled date, restores behind
 * the ConfirmModal, and lands back in the active experience with their
 * identity whole.
 *
 * Fresh logins per journey, no shared storageState (the TASK-E2E-01 rule);
 * each user is created in-test and cleaned up.
 */
const RUN = Date.now().toString(36);
const PAUSER_EMAIL = `cf-pauser-${RUN}@fringeisland.test`;
const PAUSER_NAME = `CFPauser${RUN}`;
const DEPARTER_EMAIL = `cf-departer-${RUN}@fringeisland.test`;
const DEPARTER_NAME = `CFDeparter${RUN}`;
const WITNESS_EMAIL = `cf-witness-${RUN}@fringeisland.test`;
const WITNESS_NAME = `CFWitness${RUN}`;
const GROUP_NAME = `CF Departure ${RUN}`;
const POST = `The departed member's words ${RUN}`;
const DM_TEXT = `A private word between us ${RUN}`;
const CONFIRM_PHRASE = 'delete my account';

async function createFim(admin: SupabaseClient, email: string, displayName: string) {
  const { error } = await admin.auth.admin.createUser({
    email,
    password: E2E_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName, consent_accepted: 'true' },
  });
  if (error) throw new Error(`fixture ${email}: ${error.message}`);
  const { data } = await admin
    .from('users')
    .select('auth_user_id, personal_group_id')
    .eq('email', email)
    .single();
  await markArrivedOnce(admin, data!.auth_user_id as string);
  return data as { auth_user_id: string; personal_group_id: string };
}

async function loginAs(context: BrowserContext, email: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(E2E_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
  return page;
}

async function cleanupFim(admin: SupabaseClient, email: string) {
  const { data } = await admin
    .from('users')
    .select('auth_user_id, personal_group_id')
    .eq('email', email)
    .maybeSingle();
  if (data?.personal_group_id) {
    // DM threads are not group-anchored (FEAT-PD018 / TASK-DM-01), and this
    // cleanup deletes the personal group DIRECTLY — bypassing the contract
    // that would have disposed the thread. Without this the conversation
    // orphans and the leak instrument attributes it to the next suite.
    const { data: convs } = await admin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('participant_group_id', data.personal_group_id);
    for (const c of convs ?? []) {
      await admin.from('conversations').delete().eq('id', c.conversation_id as string);
    }
    await admin.from('journeys').delete().eq('created_by_group_id', data.personal_group_id);
    await admin.from('groups').delete().eq('id', data.personal_group_id);
  }
  if (data?.auth_user_id) await deleteE2EUserByAuthId(admin, data.auth_user_id as string);
}

test.describe('C-F — the absence loop (pause → reactivate)', () => {
  const admin = createAdminClient();

  test.beforeAll(async () => {
    await createFim(admin, PAUSER_EMAIL, PAUSER_NAME);
  });
  test.afterAll(async () => {
    await cleanupFim(admin, PAUSER_EMAIL);
  });

  test('pause from the profile, land on the paused surface, reactivate, land back active', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext();
    const page = await loginAs(context, PAUSER_EMAIL);

    // Pause behind the ConfirmModal (FEAT-H029 STORY-1).
    await page.goto('/profile');
    await expect(page.getByTestId('account-lifecycle-section')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('pause-account').click();
    await page.getByTestId('confirm-modal-confirm').click();

    // The gate swaps the whole experience to the paused surface.
    await expect(page.getByTestId('account-paused-surface')).toBeVisible({ timeout: 15000 });

    // The return path (FEAT-H007): reactivate behind its ConfirmModal.
    await page.getByTestId('reactivate-account').click();
    await page.getByTestId('confirm-modal-confirm').click();

    // Back in the active experience, landing on groups/home (STORY-5).
    await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
    await expect(page.getByTestId('account-paused-surface')).not.toBeVisible();

    // Everything intact: the profile renders active again.
    await page.goto('/profile');
    await expect(page.getByTestId('account-state-line')).toContainText('active', {
      timeout: 15000,
    });
    await context.close();
  });
});

test.describe('C-F — the departure (delete → farewell; the record survives)', () => {
  const admin = createAdminClient();
  let groupId: string | null = null;
  let departerPgid: string | null = null;
  let dmId: string | null = null;
  let dmMsgId: string | null = null;

  test.beforeAll(async () => {
    const departer = await createFim(admin, DEPARTER_EMAIL, DEPARTER_NAME);
    departerPgid = departer.personal_group_id;
    await createFim(admin, WITNESS_EMAIL, WITNESS_NAME);
  });
  test.afterAll(async () => {
    if (groupId) {
      await admin.from('forum_posts').delete().eq('group_id', groupId);
      await admin.from('journeys').delete().eq('created_by_group_id', groupId);
      await admin.from('groups').delete().eq('id', groupId);
    }
    await cleanupFim(admin, DEPARTER_EMAIL);
    await cleanupFim(admin, WITNESS_EMAIL);
  });

  test('the ceremony deletes for good; the co-member keeps the words, not the name', async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // ── The departer builds a life: a group and a forum post (real UI path).
    const departerContext = await browser.newContext();
    const departerPage = await loginAs(departerContext, DEPARTER_EMAIL);
    await departerPage.goto('/groups');
    await departerPage.getByRole('button', { name: /create group/i }).click();
    await departerPage.getByLabel(/group name/i).fill(GROUP_NAME);
    await departerPage.getByRole('button', { name: /^create$/i }).click();
    await expect(departerPage).toHaveURL(/\/groups\/[0-9a-f-]{36}/, { timeout: 15000 });
    groupId = departerPage.url().match(/\/groups\/([0-9a-f-]{36})/)?.[1] ?? null;
    expect(groupId).not.toBeNull();

    const forum = departerPage.getByTestId('group-forum');
    await expect(forum).toBeVisible({ timeout: 60_000 });
    await forum.getByRole('textbox', { name: 'Forum post' }).fill(POST);
    await forum.getByTestId('forum-post-submit').click();
    await expect(departerPage.getByText(POST)).toBeVisible({ timeout: 15000 });

    // The witness joins (seeded — invitation flows are another spec's). The
    // invited -> active transition matters: the auto-role trigger assigns the
    // Member role on that edge, and the forum read rides the role's
    // permissions — a bare 'active' insert leaves a roleless reader.
    const { data: witness } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('email', WITNESS_EMAIL)
      .single();
    await admin.from('group_memberships').insert({
      group_id: groupId,
      member_group_id: witness!.personal_group_id,
      added_by_group_id: departerPgid,
      status: 'invited',
    });
    await admin
      .from('group_memberships')
      .update({ status: 'active' })
      .eq('group_id', groupId)
      .eq('member_group_id', witness!.personal_group_id);

    // ── A private word, so the departure gets asked the DM question too.
    //    The forum keeps the words and drops the name (ADR-U021); a two-party
    //    thread does the opposite, because anonymising a name in front of the
    //    one person who was there hides nothing. Both answers, one walk.
    await departerPage.goto(`/groups/${groupId}`);
    const witnessRow = departerPage.getByTestId(`member-row-${witness!.personal_group_id}`);
    await expect(witnessRow).toBeVisible({ timeout: 60_000 });
    await witnessRow.getByRole('button', { name: /^Message/ }).click();
    await expect(departerPage).toHaveURL(/\/messages\/[0-9a-f-]{36}/, { timeout: 15000 });
    dmId = departerPage.url().match(/\/messages\/([0-9a-f-]{36})/)?.[1] ?? null;
    expect(dmId).not.toBeNull();

    await expect(departerPage.getByRole('textbox', { name: 'Message' })).toBeVisible({
      timeout: 60_000,
    });
    await departerPage.getByRole('textbox', { name: 'Message' }).fill(DM_TEXT);
    await departerPage.getByRole('button', { name: /^send$/i }).click();
    await expect(departerPage.getByText(DM_TEXT)).toBeVisible({ timeout: 15000 });
    // The bubble renders OPTIMISTICALLY with a "Sending…" label — the text
    // being visible does not mean the row exists yet (this raced once,
    // 2026-08-15: the substrate read below answered null under a slow send).
    // Wait for the confirmed state before reading the substrate.
    await expect(departerPage.getByText(/sending…/i)).toHaveCount(0, { timeout: 15000 });

    // The tombstone renders by message id, so resolve it from the substrate
    // rather than scraping the DOM for a testid the erasure is about to change.
    await expect
      .poll(
        async () => {
          const { data: sent } = await admin
            .from('messages')
            .select('id')
            .eq('conversation_id', dmId)
            .eq('sender_group_id', departerPgid)
            .maybeSingle();
          dmMsgId = (sent?.id as string | undefined) ?? null;
          return dmMsgId;
        },
        { timeout: 15000 },
      )
      .not.toBeNull();

    // ── The ceremony (FEAT-H029 STORY-2): consequences, export offer,
    //    type-to-confirm — then the farewell (STORY-3).
    await departerPage.goto('/profile');
    await departerPage.getByTestId('open-delete-ceremony').click();
    await expect(departerPage.getByTestId('delete-consequences')).toContainText(/erased/i);
    await expect(departerPage.getByTestId('delete-export-offer')).toBeVisible();
    await expect(departerPage.getByTestId('delete-account-confirm')).toBeDisabled();
    await departerPage.getByTestId('delete-confirm-input').fill(CONFIRM_PHRASE);
    await departerPage.getByTestId('delete-account-confirm').click();

    await expect(departerPage).toHaveURL(/\/farewell/, { timeout: 30_000 });
    await expect(departerPage.getByTestId('farewell-surface')).toBeVisible();

    // Signed out for good — the observable effect: the departed member can
    // never reach the active experience again unbidden. Three honest
    // outcomes exist since TASK-IDN-01: cleared credentials → the /login
    // redirect; a stale ssr cookie → H006's gate intercepts — with the
    // RESTORE DOOR while the grace window is open (a member-origin deletion
    // is restorable now, and this fixture is exactly that), or the terminal
    // closed card otherwise. Either way, no groups chrome, no data; the
    // restore loop itself is Journey 3's walk.
    await expect(departerPage.getByTestId('farewell-signed-out')).toBeAttached({
      timeout: 15000,
    });
    await departerPage.goto('/groups');
    await expect(
      departerPage
        .getByTestId('account-closed-surface')
        .or(departerPage.getByTestId('account-restorable-surface'))
        .or(departerPage.locator('#email')),
    ).toBeVisible({ timeout: 15000 });
    await expect(departerPage.getByTestId('account-lifecycle-section')).not.toBeVisible();
    await departerContext.close();

    // ── The witness still reads the words — attributed by tombstone, never
    //    by the departed member's name (F-2 + ADR-U021, observable effect).
    const witnessContext = await browser.newContext();
    const witnessPage = await loginAs(witnessContext, WITNESS_EMAIL);
    await witnessPage.goto(`/groups/${groupId}`);
    await expect(witnessPage.getByTestId('group-forum')).toBeVisible({ timeout: 60_000 });
    await expect(witnessPage.getByText(POST)).toBeVisible({ timeout: 15000 });
    await expect(witnessPage.getByText(DEPARTER_NAME)).toHaveCount(0);

    // ── The contrast, in the same walk: the forum post above survived the
    //    departure; the private message did not. FEAT-PD018 content-level
    //    tombstone — the words go, the thread shape and the witness's own
    //    access stay, so their record of the exchange is not destroyed to
    //    satisfy someone else's erasure.
    await witnessPage.goto(`/messages/${dmId}`);
    await expect(witnessPage.getByTestId(`message-tombstone-${dmMsgId}`)).toBeVisible({
      timeout: 60_000,
    });
    await expect(witnessPage.getByText(DM_TEXT)).toHaveCount(0);
    await witnessContext.close();
  });
});

test.describe('TASK-IDN-01 — the return (delete → sign back in → restore)', () => {
  const admin = createAdminClient();
  const RETURNER_EMAIL = `cf-returner-${RUN}@fringeisland.test`;
  const RETURNER_NAME = `CFReturner${RUN}`;

  test.beforeAll(async () => {
    await createFim(admin, RETURNER_EMAIL, RETURNER_NAME);
  });
  test.afterAll(async () => {
    await cleanupFim(admin, RETURNER_EMAIL);
  });

  test('the restore door names the date; one confirm returns the identity whole', async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // ── The ceremony tells the grace truth before the click (the amended
    //    copy: the account is SCHEDULED, the way back is named, the content
    //    erasure keeps its "cannot be undone").
    const firstContext = await browser.newContext();
    const firstPage = await loginAs(firstContext, RETURNER_EMAIL);
    await firstPage.goto('/profile');
    await firstPage.getByTestId('open-delete-ceremony').click();
    const consequences = firstPage.getByTestId('delete-consequences');
    await expect(consequences).toContainText(/scheduled for permanent deletion/i);
    await expect(consequences).toContainText(/signing back in/i);
    await expect(consequences).toContainText(/cannot be undone/i);
    await firstPage.getByTestId('delete-confirm-input').fill(CONFIRM_PHRASE);
    await firstPage.getByTestId('delete-account-confirm').click();
    await expect(firstPage).toHaveURL(/\/farewell/, { timeout: 30_000 });
    await firstContext.close();

    // ── The return: credentials survive the window by design — a fresh
    //    sign-in works and the gate meets the member with the door, not the
    //    wall. The scheduled date is named (the year pins the render).
    const returnContext = await browser.newContext({ storageState: undefined });
    const returnPage = await returnContext.newPage();
    await returnPage.goto('/login');
    await expect(returnPage.locator('#email')).toBeVisible({ timeout: 15000 });
    await returnPage.locator('#email').fill(RETURNER_EMAIL);
    await returnPage.locator('#password').fill(E2E_PASSWORD);
    await returnPage.locator('button[type="submit"]').click();
    await expect(returnPage).toHaveURL(/\/groups/, { timeout: 30_000 });

    // Full mount (goto, not the SPA hop): the gate's provider resolves the
    // account state on a page it owns from the first render.
    await returnPage.goto('/groups');
    const door = returnPage.getByTestId('account-restorable-surface');
    await expect(door).toBeVisible({ timeout: 30_000 });
    await expect(door).toContainText(/202\d/);
    await expect(returnPage.getByTestId('account-lifecycle-section')).not.toBeVisible();

    // ── Restore behind the ConfirmModal; land back in the active experience.
    await returnPage.getByTestId('restore-account').click();
    await returnPage.getByTestId('confirm-modal-confirm').click();
    await expect(returnPage).toHaveURL(/\/groups/, { timeout: 30_000 });
    await expect(door).not.toBeVisible();

    // ── Identity whole: the profile is active again under the stashed name
    //    (never the scrub literal).
    await returnPage.goto('/profile');
    await expect(returnPage.getByTestId('account-state-line')).toContainText('active', {
      timeout: 15000,
    });
    await expect(returnPage.getByText(RETURNER_NAME).first()).toBeVisible({ timeout: 15000 });
    await expect(returnPage.getByText('[Deleted User]')).toHaveCount(0);
    await returnContext.close();
  });
});
