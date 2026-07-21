import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient, markArrivedOnce, E2E_PASSWORD } from './helpers/auth';

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
    await admin.from('journeys').delete().eq('created_by_group_id', data.personal_group_id);
    await admin.from('groups').delete().eq('id', data.personal_group_id);
  }
  if (data?.auth_user_id) await admin.auth.admin.deleteUser(data.auth_user_id as string);
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
    // never reach the active experience again. Two honest terminal outcomes
    // exist (both proven live in this journey's runs): cleared credentials →
    // the /login redirect; a stale ssr cookie → H006's gate intercepts with
    // the terminal "This account is closed" surface. Either way, no groups
    // chrome, no data.
    await expect(departerPage.getByTestId('farewell-signed-out')).toBeAttached({
      timeout: 15000,
    });
    await departerPage.goto('/groups');
    await expect(
      departerPage.getByTestId('account-closed-surface').or(departerPage.locator('#email')),
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
    await witnessContext.close();
  });
});
