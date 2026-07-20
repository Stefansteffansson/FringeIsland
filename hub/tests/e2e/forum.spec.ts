import { test, expect } from '@playwright/test';
import { createAdminClient, SESSION_EMAIL, deleteE2EUser, markArrivedOnce } from './helpers/auth';

/**
 * FEAT-H026 — Group forum + attribution (COM-5/6a/6b/7/14) E2E, against the
 * live FEAT-PD009 contracts. Authenticated as the shared e2e-session FIM, who
 * stewards the fixture group (Steward template → all four forum permissions).
 * Effects asserted (never just clicks):
 *  1. Post a thread → the confirmed post renders.
 *  2. Reply → it renders beneath its parent.
 *  3. Remove (moderate_forum) → the post becomes a tombstone in place.
 *  4. Attribution (COM-14): a member's post, after the member leaves the group
 *     (admin-removed membership; no session switch needed), renders
 *     "Former member" — the MEM-9 un-seam, rendered.
 * Coverage split (labelled): role-gated refusals (Observer can't post, Mist
 * refused) and the flat-threading P0001 live at the integration tier
 * (forum-contracts.test.ts); the E2E covers the Steward's happy path + the
 * attribution render. Fixture hygiene: run-unique names; admin cleanup.
 *
 * NOTE: red until the C-B schema gate (PR #210) merges + applies — the PD009
 * contracts do not exist pre-apply, so the section renders honest-unavailable.
 */

const RUN = Date.now();
const MEMBER_EMAIL = `e2e-cb-member-${RUN}@fringeisland.test`;
const GROUP_NAME = `CB Forum G ${RUN}`;
const THREAD = `First thread ${RUN}`;
const REPLY = `A reply ${RUN}`;
const MOD_TARGET = `Please remove me ${RUN}`;
const MEMBER_POST = `Member's words ${RUN}`;

let createdGroupId: string | null = null;

test.describe('FEAT-H026 — group forum & attribution', () => {
  test.beforeAll(async () => {
    const admin = createAdminClient();
    await admin
      .from('users')
      .update({ is_active: true, is_decommissioned: false })
      .eq('email', SESSION_EMAIL);
    const { data: sess } = await admin
      .from('users')
      .select('auth_user_id')
      .eq('email', SESSION_EMAIL)
      .single();
    await markArrivedOnce(admin, sess!.auth_user_id as string);
    const { error } = await admin.auth.admin.createUser({
      email: MEMBER_EMAIL,
      password: 'e2e-test-password-123',
      email_confirm: true,
      user_metadata: { display_name: `CBMember${RUN}`, consent_accepted: 'true' },
    });
    if (error) throw new Error(`member fixture: ${error.message}`);
  });

  test.afterAll(async () => {
    const admin = createAdminClient();
    if (createdGroupId) {
      await admin.from('forum_posts').delete().eq('group_id', createdGroupId);
      await admin.from('groups').delete().eq('id', createdGroupId);
    }
    await deleteE2EUser(admin, MEMBER_EMAIL);
  });

  test('post → reply → moderate → former-member attribution', async ({ page }) => {
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

    const forum = page.getByTestId('group-forum');
    await expect(forum).toBeVisible({ timeout: 60_000 });

    // -- 1. post a thread → confirmed render ------------------------------
    await forum.getByRole('textbox', { name: 'Forum post' }).fill(THREAD);
    await forum.getByTestId('forum-post-submit').click();
    await expect(page.getByText(THREAD)).toBeVisible({ timeout: 15000 });

    // -- 2. reply → renders beneath the parent ----------------------------
    const threadPost = page
      .getByTestId(/^forum-post-/)
      .filter({ hasText: THREAD })
      .first();
    const threadId = (await threadPost.getAttribute('data-testid'))!.replace('forum-post-', '');
    await page.getByTestId(`forum-reply-open-${threadId}`).click();
    await page.getByRole('textbox', { name: 'Reply' }).fill(REPLY);
    await page.getByTestId(`forum-reply-submit-${threadId}`).click();
    await expect(page.getByText(REPLY)).toBeVisible({ timeout: 15000 });

    // -- 3. moderate → tombstone in place ---------------------------------
    await forum.getByRole('textbox', { name: 'Forum post' }).fill(MOD_TARGET);
    await forum.getByTestId('forum-post-submit').click();
    await expect(page.getByText(MOD_TARGET)).toBeVisible({ timeout: 15000 });
    const modPost = page
      .getByTestId(/^forum-post-/)
      .filter({ hasText: MOD_TARGET })
      .first();
    const modId = (await modPost.getAttribute('data-testid'))!.replace('forum-post-', '');
    await page.getByTestId(`forum-remove-${modId}`).click();
    await page.getByRole('dialog').getByRole('button', { name: /^remove$/i }).click();
    await expect(page.getByTestId(`forum-tombstone-${modId}`)).toHaveText(
      /removed by a group moderator/i,
      { timeout: 15000 },
    );
    await expect(page.getByText(MOD_TARGET)).toHaveCount(0);

    // -- 4. former-member attribution (COM-14) ----------------------------
    // Seed a member + a post authored by them, then remove their membership
    // (admin-side — no session switch): the forum must render "Former member".
    const { data: member } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('email', MEMBER_EMAIL)
      .single();
    const { data: me } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('email', SESSION_EMAIL)
      .single();
    await admin.from('group_memberships').insert({
      group_id: createdGroupId,
      member_group_id: member!.personal_group_id,
      status: 'active',
      added_by_group_id: me!.personal_group_id,
    });
    const { data: seeded } = await admin
      .from('forum_posts')
      .insert({
        group_id: createdGroupId,
        author_group_id: member!.personal_group_id,
        content: MEMBER_POST,
      })
      .select('id')
      .single();

    // while a member: their name resolves (active)
    await page.reload();
    await expect(page.getByTestId(`forum-author-${seeded!.id}`)).not.toHaveText('Former member', {
      timeout: 15000,
    });

    // remove the membership → the ladder renders "Former member"
    await admin
      .from('group_memberships')
      .delete()
      .eq('group_id', createdGroupId)
      .eq('member_group_id', member!.personal_group_id);
    await page.reload();
    await expect(page.getByTestId(`forum-author-${seeded!.id}`)).toHaveText('Former member', {
      timeout: 15000,
    });
    // the post content itself survives (ADR-U021 — display law, never deletion)
    await expect(page.getByText(MEMBER_POST)).toBeVisible();
  });
});
