import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  createAdminClient,
  cleanupE2EGroup,
  countDeusExE2ELeaks,
  deleteE2EUser,
  markArrivedOnce,
  runAdminSql,
  SESSION_EMAIL,
} from './helpers/auth';

/**
 * FEAT-H041 — the suspended-group admin content wing, end to end (the J-B
 * narrative): suspend a group through the existing ceremony → the content
 * wing appears → read all four families → the member is refused on every new
 * BFF route while the hold stands → moderate a post → remove a member →
 * /admin/audit carries both act rows → reactivate → the wing is gone and the
 * member plane is restored (tombstone visible to the remaining member; the
 * removed member has no group).
 *
 * HONEST COVERAGE LABEL: this journey spec is test-after at the surface tier
 * — the red-first demonstrations for H041 live in the unit suites
 * (admin-suspended-content-wing / admin-group-content-routes, module-absent
 * red 2026-08-04) and in the FEAT-PC026 platform gate suite (12 red at
 * head). Content fixtures are laid through the member CONTRACTS with the
 * fixture users' own authed clients (the same doors the member UI calls);
 * the journey under test — every admin act and read — is driven through the
 * real UI. Member-side verification happens AFTER reactivation: while the
 * hold stands, the member plane is quarantined by design (H038), so the
 * tombstone/membership checks land where members can see again.
 */

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const password = 'e2e-test-password-123';
const fims = {
  stew: { email: `e2e-admg-stew-${stamp}@fringeisland.test`, name: `E2EADMGStew${stamp}` },
  memb: { email: `e2e-admg-memb-${stamp}@fringeisland.test`, name: `E2EADMGMemb${stamp}` },
} as const;

type Fim = { authId: string; pgId: string };

async function setPlatformAdmin(elevate: boolean): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('email', SESSION_EMAIL)
    .maybeSingle();
  const pg = data?.personal_group_id as string;
  if (elevate) {
    await runAdminSql(`
      DO $$
      DECLARE v_deusex uuid; v_role uuid;
      BEGIN
        SELECT id INTO v_deusex FROM public.groups
          WHERE name = 'DeusEx' AND group_type = 'system';
        SELECT id INTO v_role FROM public.group_roles
          WHERE group_id = v_deusex AND name = 'DeusEx';
        INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
          VALUES (v_deusex, '${pg}', v_deusex, 'active')
          ON CONFLICT (group_id, member_group_id) DO UPDATE SET status = 'active';
        INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
          VALUES ('${pg}', v_deusex, v_role, v_deusex)
          ON CONFLICT DO NOTHING;
      END $$;`);
  } else {
    await runAdminSql(`
      DO $$
      DECLARE v_deusex uuid;
      BEGIN
        SELECT id INTO v_deusex FROM public.groups
          WHERE name = 'DeusEx' AND group_type = 'system';
        DELETE FROM public.user_group_roles
          WHERE member_group_id = '${pg}' AND group_id = v_deusex;
        DELETE FROM public.group_memberships
          WHERE group_id = v_deusex AND member_group_id = '${pg}';
      END $$;`).catch(() => undefined);
  }
}

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

/** An authed contract client for fixture-laying (the same doors the member UI calls). */
async function contractClient(email: string): Promise<SupabaseClient> {
  const c = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`contract sign-in ${email}: ${error.message}`);
  return c;
}

const rpcOk = async (c: SupabaseClient, fn: string, args: Record<string, unknown>) => {
  const { data, error } = await c.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as never;
};

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
}

test.describe('FEAT-H041 — the suspended-group admin content wing', () => {
  const groupName = `E2E ADMG Held ${stamp}`;
  let stew: Fim, memb: Fim;
  let groupId: string;
  let postToModerateId: string;
  let leaksBefore: number;

  test.beforeAll(async () => {
    test.setTimeout(240_000);
    const admin = createAdminClient();
    leaksBefore = await countDeusExE2ELeaks(admin);
    await setPlatformAdmin(true);
    [stew, memb] = await Promise.all([
      createFim(fims.stew.email, fims.stew.name),
      createFim(fims.memb.email, fims.memb.name),
    ]);

    // The group + membership + content, laid while active through the member
    // contracts (see the coverage label). Steward creates; the member joins
    // via the house supporting-membership insert + the group's own role
    // fabric (every catalog permission except rest_group — the proven
    // integration-suite idiom for admin-inserted memberships).
    const stewC = await contractClient(fims.stew.email);
    groupId = (await rpcOk(stewC, 'create_engagement_group', { p_name: groupName })) as string;
    await admin.from('group_memberships').insert({
      group_id: groupId,
      member_group_id: memb.pgId,
      status: 'active',
      added_by_group_id: stew.pgId,
    });
    await runAdminSql(`
      DO $$
      DECLARE v_role uuid;
      BEGIN
        INSERT INTO public.group_roles (group_id, name, description)
        VALUES ('${groupId}', 'E2E ADMG Doorholder', 'every door permission except rest_group')
        RETURNING id INTO v_role;
        INSERT INTO public.group_role_permissions (group_role_id, permission_id)
        SELECT v_role, p.id FROM public.permissions p WHERE p.name <> 'rest_group'
        ON CONFLICT DO NOTHING;
        INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
        VALUES ('${memb.pgId}', '${groupId}', v_role, '${memb.pgId}')
        ON CONFLICT DO NOTHING;
      END $$;`);

    const membC = await contractClient(fims.memb.email);
    postToModerateId = (
      (await rpcOk(membC, 'create_forum_post', {
        p_group_id: groupId,
        p_content: 'ADMG offending post',
      })) as { id: string }
    ).id;
    await rpcOk(membC, 'create_forum_post', {
      p_group_id: groupId,
      p_content: 'ADMG surviving post',
    });
    await rpcOk(stewC, 'send_community_announcement', {
      p_group_id: groupId,
      p_title: 'ADMG announcement',
      p_body: 'laid while active',
    });
    const conversationId = (await rpcOk(membC, 'create_group_conversation', {
      p_group_id: groupId,
      p_title: 'ADMG evidence thread',
    })) as string;
    await rpcOk(membC, 'send_message', {
      p_conversation_id: conversationId,
      p_content: 'ADMG message body evidence',
    });
    await stewC.auth.signOut();
    await membC.auth.signOut();
  });

  test.afterAll(async () => {
    test.setTimeout(120_000);
    const admin = createAdminClient();
    if (groupId) await cleanupE2EGroup(groupId).catch(() => undefined);
    await deleteE2EUser(admin, fims.stew.email).catch(() => undefined);
    await deleteE2EUser(admin, fims.memb.email).catch(() => undefined);
    // Purge this spec's audit rows so reruns stay clean (house idiom).
    await runAdminSql(`
      DELETE FROM public.admin_audit_log
       WHERE (action = 'moderation.forum_post_moderated' AND target = '${postToModerateId}')
          OR (action = 'member.remove_from_group' AND metadata->>'group_id' = '${groupId}');`).catch(
      () => undefined,
    );
    await setPlatformAdmin(false);
    expect(await countDeusExE2ELeaks(admin)).toBe(leaksBefore); // leak check 0→0
  });

  test('suspend → the wing appears and serves all four families', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`/admin/groups/${groupId}`);
    await expect(page.getByRole('heading', { name: groupName })).toBeVisible({ timeout: 15000 });
    await page.getByTestId('suspend-group').click();
    await page.getByTestId('ceremony-reason').fill('E2E H041: held for the content wing'); // FEAT-H049 adaptation: the suspend ceremony requires a reason
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByTestId('status-badge')).toHaveText('suspended', { timeout: 15000 });

    // The wing and its four families.
    await expect(page.getByTestId('admin-content-plane-banner')).toBeVisible();
    const members = page.getByRole('region', { name: 'Members' });
    await expect(members.getByText(fims.memb.email)).toBeVisible();
    const forum = page.getByRole('region', { name: 'Forum' });
    await expect(forum.getByText('ADMG offending post')).toBeVisible({ timeout: 15000 });
    await expect(forum.getByText('ADMG surviving post')).toBeVisible();
    const announcements = page.getByRole('region', { name: 'Announcements' });
    await expect(announcements.getByText('ADMG announcement')).toBeVisible({ timeout: 15000 });
    const conversations = page.getByRole('region', { name: 'Conversations' });
    await conversations.getByText('ADMG evidence thread').click();
    await expect(conversations.getByText('ADMG message body evidence')).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId('conversation-back').click();
  });

  test('while held, the member is refused with the 404 shape on every new BFF route', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const membCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const membPage = await membCtx.newPage();
    await signIn(membPage, fims.memb.email);
    for (const path of [
      `/api/admin/groups/${groupId}/forum`,
      `/api/admin/groups/${groupId}/announcements`,
      `/api/admin/groups/${groupId}/conversations`,
    ]) {
      const res = await membPage.request.get(path);
      expect(res.status(), path).toBe(404);
    }
    const moderate = await membPage.request.post(
      `/api/admin/groups/${groupId}/forum/${postToModerateId}/moderate`,
      { data: { reason: 'not yours' } },
    );
    expect(moderate.status()).toBe(404);
    const remove = await membPage.request.post(
      `/api/admin/groups/${groupId}/members/${stew.authId}/remove`,
    );
    expect(remove.status()).toBe(404);
    await membCtx.close();
  });

  test('moderate a post through the ceremony — tombstone lands in the wing', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`/admin/groups/${groupId}`);
    const forum = page.getByRole('region', { name: 'Forum' });
    await expect(forum.getByText('ADMG offending post')).toBeVisible({ timeout: 15000 });
    await page.getByTestId(`moderate-post-${postToModerateId}`).click();
    const modal = page.getByTestId('confirm-modal');
    await expect(modal).toContainText(fims.memb.name); // the author, named
    await expect(modal).toContainText(groupName);
    await expect(page.getByTestId('confirm-modal-confirm')).toBeDisabled(); // reason required
    await page.getByTestId('ceremony-reason').fill('harassment — WF-2 cleanup');
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(forum.getByText('This post was removed')).toBeVisible({ timeout: 15000 });
    await expect(forum.getByText('ADMG offending post')).not.toBeVisible();
    await expect(forum.getByText('ADMG surviving post')).toBeVisible();
  });

  test('remove the member through the ceremony — the row leaves the wing', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`/admin/groups/${groupId}`);
    const members = page.getByRole('region', { name: 'Members' });
    await expect(members.getByText(fims.memb.email)).toBeVisible({ timeout: 15000 });
    await page.getByTestId(`remove-member-${memb.pgId}`).click();
    const modal = page.getByTestId('confirm-modal');
    await expect(modal).toContainText(fims.memb.name);
    await expect(modal).toContainText(fims.memb.email); // the W-4 echo
    await expect(modal).toContainText(groupName);
    await expect(page.getByTestId('confirm-modal-confirm')).toBeDisabled();
    await page.getByTestId('ceremony-reason').fill('coordinated the bullying');
    await page.getByTestId('confirm-modal-confirm').click();
    // The busy modal echoes the email (W-4) — wait for it to close, then
    // assert the exact-text row (the modal copy holds it only as substring).
    await expect(page.getByTestId('confirm-modal')).not.toBeVisible({ timeout: 15000 });
    await expect(members.getByText(fims.memb.email, { exact: true })).not.toBeVisible({
      timeout: 15000,
    });
    await expect(members.getByText(fims.stew.email, { exact: true })).toBeVisible();
  });

  test('/admin/audit carries both act rows', async ({ page }) => {
    await page.goto('/admin/audit');
    await expect(page.getByText('moderation.forum_post_moderated').first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('member.remove_from_group').first()).toBeVisible();
  });

  test('reactivate — the wing is gone and the member plane is restored', async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);
    await page.goto(`/admin/groups/${groupId}`);
    await page.getByTestId('reactivate-group').click();
    await page.getByTestId('ceremony-reason').fill('E2E H041: wing closed, group restored'); // FEAT-H049 adaptation: the reactivate ceremony requires a reason
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByTestId('suspend-group')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('admin-content-plane-banner')).not.toBeVisible();

    // The remaining member sees the restored plane — with the tombstone (the
    // one law, both planes); the removed member has no group.
    const stewCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const stewPage = await stewCtx.newPage();
    await signIn(stewPage, fims.stew.email);
    await stewPage.goto(`/groups/${groupId}`);
    await expect(stewPage.getByText('ADMG surviving post')).toBeVisible({ timeout: 20000 });
    await expect(stewPage.getByText('This post was removed').first()).toBeVisible();
    await expect(stewPage.getByText('ADMG offending post')).not.toBeVisible();
    await stewCtx.close();

    const membCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const membPage = await membCtx.newPage();
    await signIn(membPage, fims.memb.email);
    await membPage.goto(`/groups/${groupId}`);
    // The member-plane no-leak copy (the groups.spec.ts precedent): a private
    // group is indistinguishable from absent for a non-member.
    await expect(membPage.getByText(/group not found/i)).toBeVisible({ timeout: 15000 });
    await membCtx.close();
  });
});
