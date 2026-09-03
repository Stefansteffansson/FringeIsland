import { test, expect, type Page } from '@playwright/test';
import {
  createAdminClient,
  markArrivedOnce,
  runAdminSql,
  SESSION_EMAIL,
  deleteE2EUserByAuthId,
} from './helpers/auth';

/**
 * FEAT-H049 STORY-5 (DB-4, TASK-DB4-01) — the sanction communication arc,
 * end to end on the applied substrate (migration 20260903120000):
 *
 *   1. an admin suspends a group WITH A REASON (the ceremony refuses to confirm
 *      without one) → the member's suspended-group wall shows the reason → the
 *      member's inbox holds `group_suspended` with the reason as its body →
 *      reactivation (with a reason) clears the wall and the reason;
 *   2. the Steward rests the group with an OPTIONAL note → the member's held
 *      view shows the note under the Resting label → the Steward wakes it;
 *   3. the member-suspension arc: the admin suspends the member with a reason →
 *      the member's account surface shows it above the exit → reinstatement
 *      (with a reason) returns them to the normal app.
 *
 * Fixtures: the e2e-session user (storageState) is elevated to platform admin
 * for the run; the Steward and the member are created fresh and deleted after.
 * Every assertion is on the observable effect, never just the click (J-C).
 */

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const password = 'e2e-test-password-123';

const fims = {
  stew: { email: `e2e-db4-stew-${stamp}@fringeisland.test`, name: `E2EDb4Stew${stamp}` },
  memb: { email: `e2e-db4-memb-${stamp}@fringeisland.test`, name: `E2EDb4Memb${stamp}` },
} as const;

type Fim = { authId: string; pgId: string; userId: string };

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

async function waitForUserRow(authUserId: string): Promise<{ pgId: string; userId: string }> {
  const admin = createAdminClient();
  for (let i = 0; i < 20; i++) {
    const { data } = await admin
      .from('users')
      .select('id,personal_group_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (data?.personal_group_id) return { pgId: data.personal_group_id, userId: data.id };
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
  const { pgId, userId } = await waitForUserRow(data.user.id);
  return { authId: data.user.id, pgId, userId };
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

/** The admin ceremony: the reason is required — Confirm stays disabled until it is given. */
async function confirmWithReason(page: Page, reason: string) {
  const modal = page.getByTestId('confirm-modal');
  await expect(modal).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('confirm-modal-confirm')).toBeDisabled();
  await page.getByTestId('ceremony-reason').fill(reason);
  await page.getByTestId('confirm-modal-confirm').click();
}

test.describe('FEAT-H049 — sanction communication: the reason travels, the bell says it happened', () => {
  const groupName = `E2E DB4 Held ${stamp}`;
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
        WHERE (action LIKE 'group.%' OR action LIKE 'member.%') AND actor_group_id = '${pg}'
          AND created_at > now() - interval '30 minutes';`,
    ).catch(() => undefined);
  });

  test('admin suspends with a reason → the wall says why → the bell holds it → reactivation clears it', async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);

    const stewCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const stewPage = await stewCtx.newPage();
    await signIn(stewPage, fims.stew.email);
    groupId = await createGroupViaUi(stewPage, groupName);

    await runAdminSql(`
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
      VALUES ('${groupId}', '${memb.pgId}', '${stew.pgId}', 'active');`);

    const membCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const membPage = await membCtx.newPage();
    await signIn(membPage, fims.memb.email);

    // 1. The admin ceremony collects the reason (ADM-9): no reason, no confirm.
    await page.goto(`/admin/groups/${groupId}`);
    await expect(page.getByTestId('suspend-group')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('suspend-group').click();
    await confirmWithReason(page, 'E2E: repeated reports');
    await expect(page.getByTestId('status-badge')).toHaveText('suspended', { timeout: 15000 });

    // 2. The member's wall says the state AND the why (GRP-10).
    await membPage.goto(`/groups/${groupId}`);
    await expect(membPage.getByTestId('suspended-group-shell')).toBeVisible({ timeout: 15000 });
    await expect(membPage.getByTestId('hold-reason')).toContainText('E2E: repeated reports');

    // 3. The bell says it happened (NTF-1): a plain notice, title = the kind's
    //    label, body = the reason, no action affordance.
    await membPage.goto('/notifications');
    const row = membPage
      .locator('[data-testid^="notification-row-"]')
      .filter({ hasText: 'E2E: repeated reports' })
      .first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toContainText('Your group has been suspended');
    await expect(row.getByTestId('notif-action-accept')).toHaveCount(0);

    // 4. Reactivation carries its own reason and clears the wall and the why.
    await page.goto(`/admin/groups/${groupId}`);
    await page.getByTestId('reactivate-group').click();
    await confirmWithReason(page, 'E2E: resolved');
    await expect(page.getByTestId('suspend-group')).toBeVisible({ timeout: 15000 });

    await membPage.goto(`/groups/${groupId}`);
    await expect(membPage.getByTestId('suspended-group-shell')).toHaveCount(0, { timeout: 15000 });
    await expect(membPage.getByTestId('hold-reason')).toHaveCount(0);
    await membPage.goto('/notifications');
    await expect(
      membPage.locator('[data-testid^="notification-row-"]').filter({ hasText: 'E2E: resolved' }).first(),
    ).toContainText('Your group has been reactivated', { timeout: 15000 });

    // 5. The Steward's optional note (GRP-10): rest with a note → the member's
    //    held view shows it under the Resting label; wake needs no note.
    await stewPage.goto(`/groups/${groupId}`);
    await stewPage.getByTestId('rest-group').click();
    await expect(stewPage.getByTestId('confirm-modal')).toBeVisible({ timeout: 15000 });
    await expect(stewPage.getByTestId('confirm-modal-confirm')).toBeEnabled(); // optional
    await stewPage.getByTestId('ceremony-note').fill('E2E: summer break');
    await stewPage.getByTestId('confirm-modal-confirm').click();
    await expect(stewPage.getByTestId('status-badge')).toHaveText('Resting', { timeout: 15000 });

    await membPage.goto(`/groups/${groupId}`);
    await expect(membPage.getByTestId('resting-banner')).toBeVisible({ timeout: 15000 });
    await expect(membPage.getByTestId('hold-reason')).toContainText('E2E: summer break');

    await stewPage.getByTestId('wake-group').click();
    await expect(stewPage.getByTestId('confirm-modal-confirm')).toBeEnabled();
    await stewPage.getByTestId('confirm-modal-confirm').click();
    await expect(stewPage.getByTestId('status-badge')).toHaveCount(0, { timeout: 15000 });
    await membPage.goto(`/groups/${groupId}`);
    await expect(membPage.getByTestId('hold-reason')).toHaveCount(0);

    await stewCtx.close();
    await membCtx.close();
  });

  test('admin suspends a member with a reason → the account surface says why → reinstatement returns them', async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);

    const membCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const membPage = await membCtx.newPage();
    await signIn(membPage, fims.memb.email);
    await membPage.goto('/profile');
    await expect(membPage.getByTestId('account-suspended-surface')).toHaveCount(0);

    // The admin ceremony (ADM-3): reason required, shown to the member.
    await page.goto(`/admin/members/${memb.userId}`);
    await expect(page.getByTestId('suspend-member')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('suspend-member').click();
    await confirmWithReason(page, 'E2E: terms breach');
    await expect(page.getByTestId('reactivate-member')).toBeVisible({ timeout: 15000 });

    // The member's account surface (IDN-13): the state, the why, and the exit.
    await membPage.goto('/profile');
    await expect(membPage.getByTestId('account-suspended-surface')).toBeVisible({ timeout: 15000 });
    await expect(membPage.getByTestId('suspension-reason')).toContainText('E2E: terms breach');

    // Reinstatement (with its own reason) returns them to the normal app.
    await page.getByTestId('reactivate-member').click();
    await confirmWithReason(page, 'E2E: cleared');
    await expect(page.getByTestId('suspend-member')).toBeVisible({ timeout: 15000 });

    await membPage.goto('/groups');
    await expect(membPage.getByTestId('account-suspended-surface')).toHaveCount(0, { timeout: 15000 });
    await membPage.goto('/notifications');
    await expect(
      membPage.locator('[data-testid^="notification-row-"]').filter({ hasText: 'E2E: cleared' }).first(),
    ).toContainText('Your account has been reinstated', { timeout: 15000 });

    await membCtx.close();
  });
});
