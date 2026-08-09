import { test, expect, type Page } from '@playwright/test';
import { createAdminClient, markArrivedOnce, runAdminSql, SESSION_EMAIL, deleteE2EUserByAuthId } from './helpers/auth';

/**
 * FEAT-H038 STORY-7 (E2E) — the two-mode group journey: steward rest →
 * member read-only + holder exemption → steward wake → admin suspend (the
 * mode-choice ceremony) → the found-but-that's-it shell → admin reactivate.
 *
 * Coverage label (honest): written AFTER the surface implementation — the
 * red-first demonstrations live at the unit tier (GroupDetailPanel
 * availability / groups-page / group-detail-page / admin-group-detail suites,
 * red 2026-08-03 pre-implementation) and at the platform tier (the PC023 gate
 * suite, red pre-migration). Integrative journey coverage, labelled
 * test-after by the house rule.
 *
 * Serial + one narrative test: the walk is a single story whose state
 * advances; the default `page` fixture is the shared session FIM, elevated to
 * platform admin for the ceremony steps (the admin-groups.spec idiom).
 */

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const password = 'e2e-test-password-123';

const fims = {
  stew: { email: `e2e-h038-stew-${stamp}@fringeisland.test`, name: `E2EH038Stew${stamp}` },
  memb: { email: `e2e-h038-memb-${stamp}@fringeisland.test`, name: `E2EH038Memb${stamp}` },
} as const;

type Fim = { authId: string; pgId: string };

async function sessionPersonalGroupId(): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('email', SESSION_EMAIL)
    .maybeSingle();
  return data?.personal_group_id as string;
}

async function setPlatformAdmin(elevate: boolean): Promise<void> {
  const pg = await sessionPersonalGroupId();
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

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
}

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

test.describe('FEAT-H038 — the two-mode group journey (STORY-7)', () => {
  const groupName = `E2E H038 TwoMode ${stamp}`;
  const created: Fim[] = [];
  let stew: Fim, memb: Fim;
  let groupId: string | null = null;

  test.beforeAll(async () => {
    await setPlatformAdmin(true);
    [stew, memb] = await Promise.all([
      createFim(fims.stew.email, fims.stew.name),
      createFim(fims.memb.email, fims.memb.name),
    ]);
    created.push(stew, memb);
  });

  test.afterAll(async () => {
    await setPlatformAdmin(false);
    const admin = createAdminClient();
    if (groupId) await admin.from('groups').delete().eq('id', groupId);
    for (const u of created) {
      if (u?.pgId) await admin.from('groups').delete().eq('id', u.pgId);
      if (u?.authId) await deleteE2EUserByAuthId(admin, u.authId);
    }
    const pg = await sessionPersonalGroupId();
    await runAdminSql(
      `DELETE FROM public.admin_audit_log
        WHERE action LIKE 'group.%' AND actor_group_id = '${pg}'
          AND created_at > now() - interval '30 minutes';`,
    ).catch(() => undefined);
  });

  test('rest → read-only + holder exemption → wake → suspend → shell → reactivate', async ({
    page,
    browser,
  }) => {
    test.setTimeout(300_000);

    // The steward builds the group through the real door; the member joins.
    const stewCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const stewPage = await stewCtx.newPage();
    await signIn(stewPage, fims.stew.email);
    groupId = await createGroupViaUi(stewPage, groupName);
    const admin = createAdminClient();
    const { error: mErr } = await admin.from('group_memberships').insert({
      group_id: groupId,
      member_group_id: memb.pgId,
      added_by_group_id: stew.pgId,
      status: 'active',
    });
    if (mErr) throw new Error(`member join failed: ${mErr.message}`);

    const membCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const membPage = await membCtx.newPage();
    await signIn(membPage, fims.memb.email);

    // --- The steward rests the group (the capability-gated control). ---
    await stewPage.goto(`/groups/${groupId}`);
    await stewPage.getByTestId('rest-group').click();
    await expect(stewPage.getByTestId('confirm-modal')).toContainText(groupName);
    await stewPage.getByTestId('confirm-modal-confirm').click();
    await expect(stewPage.getByTestId('status-badge')).toHaveText('Resting', { timeout: 15000 });
    // Holder exemption: the steward keeps the working surface — no banner,
    // and the control has flipped to Wake.
    await expect(stewPage.getByTestId('resting-banner')).toHaveCount(0);
    await expect(stewPage.getByTestId('wake-group')).toBeVisible();

    // --- The member sees the label on the list and the read-only surface. ---
    await membPage.goto('/groups');
    await expect(membPage.getByTestId('group-status-badge')).toHaveText('Resting');
    await membPage.goto(`/groups/${groupId}`);
    await expect(membPage.getByTestId('resting-banner')).toBeVisible();
    await expect(membPage.getByTestId('resting-banner')).toContainText(/read-only/i);
    // Content still renders — resting is visible, never a lockout.
    await expect(membPage.getByTestId('member-count-line')).toBeVisible();

    // --- The steward wakes the group. ---
    await stewPage.getByTestId('wake-group').click();
    await stewPage.getByTestId('confirm-modal-confirm').click();
    await expect(stewPage.getByTestId('status-badge')).toHaveCount(0, { timeout: 15000 });
    await membPage.goto(`/groups/${groupId}`);
    await expect(membPage.getByTestId('resting-banner')).toHaveCount(0);

    // --- The admin suspends through the mode-choice ceremony. ---
    await page.goto(`/admin/groups/${groupId}`);
    // The mode choice: an active group offers BOTH Rest and Suspend.
    await expect(page.getByTestId('rest-group')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('suspend-group').click();
    await expect(page.getByTestId('confirm-modal')).toContainText(groupName);
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByTestId('status-badge')).toHaveText('suspended', { timeout: 15000 });

    // --- The member finds the shell: no content, no actions, not even leave. ---
    await membPage.goto(`/groups/${groupId}`);
    await expect(membPage.getByTestId('suspended-group-shell')).toBeVisible({ timeout: 15000 });
    await expect(membPage.getByTestId('suspended-group-shell')).toContainText(groupName);
    await expect(membPage.getByTestId('suspended-group-shell')).toContainText('Suspended');
    await expect(membPage.getByTestId('leave-group')).toHaveCount(0);
    await expect(membPage.getByTestId('member-list')).toHaveCount(0);
    await expect(membPage.getByTestId('member-count-line')).toHaveCount(0);
    await membPage.goto('/groups');
    await expect(membPage.getByTestId('group-status-badge')).toHaveText('Suspended');

    // The steward — a rest_group holder — gets the shell too: no path out of
    // the hard state from the member plane.
    await stewPage.goto(`/groups/${groupId}`);
    await expect(stewPage.getByTestId('suspended-group-shell')).toBeVisible({ timeout: 15000 });
    await expect(stewPage.getByTestId('wake-group')).toHaveCount(0);

    // --- The admin reactivates; the group returns whole. ---
    await page.getByTestId('reactivate-group').click();
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByTestId('status-badge')).toHaveCount(0, { timeout: 15000 });
    await membPage.goto(`/groups/${groupId}`);
    await expect(membPage.getByTestId('suspended-group-shell')).toHaveCount(0);
    await expect(membPage.getByTestId('leave-group')).toBeVisible({ timeout: 15000 });

    await stewCtx.close();
    await membCtx.close();
  });
});
