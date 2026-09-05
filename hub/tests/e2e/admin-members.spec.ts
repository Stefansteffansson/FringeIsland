import { test, expect, type Page } from '@playwright/test';
import { createAdminClient, markArrivedOnce, runAdminSql, SESSION_EMAIL, deleteE2EUserByAuthId } from './helpers/auth';

/**
 * DB-4 (FEAT-H049, 2026-09-03): the admin sanctions require a reason in words
 * the member will see; Confirm stays disabled until it is given. Ceremonies
 * that carry no reason field confirm as before. (This spec predated DB-4 and
 * clicked Confirm bare; caught by the first full fleet run after the cutover,
 * ADR-U053, 2026-09-05.)
 */
async function confirmCeremony(page: Page) {
  const reason = page.getByTestId('ceremony-reason');
  if (await reason.count()) await reason.fill('E2E: the reason, as the member will read it.');
  await page.getByTestId('confirm-modal-confirm').click();
}

/**
 * FEAT-H036 (E2E) — Cycle ADM-C: the member administration journey (STORY-7).
 * Elevate → the list finds the fixture members → the suspend/reactivate
 * round-trip through the ceremonies → a scenario-named removal → the platform
 * exit of a second fixture → grant + revoke on a third → the demoted operator
 * gets the 404 shape.
 *
 * Coverage label (honest): this journey spec was written AFTER the surface
 * implementation — the red-first demonstrations for every story behaviour
 * live at the unit tier (admin-members-list / admin-member-detail /
 * admin-dashboard suites, red 2026-08-01 pre-implementation) and at the
 * platform tier (the PC021 gate-2 integration suite, red pre-migration).
 * This file is integrative journey coverage, labelled test-after by the
 * house rule (the ADM-B precedent).
 *
 * Serial: the tests share fixture FIMs whose state advances, and the last
 * test demotes the shared session FIM. Fixture groups are created through
 * the REAL UI door by their owners; every list/detail locator is row-scoped
 * by fixture id — the dev DB legitimately holds plural members and groups.
 */

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const password = 'e2e-test-password-123';

const fims = {
  sanc: { email: `e2e-admc-sanc-${stamp}@fringeisland.test`, name: `E2EADMCSanc${stamp}` },
  exit: { email: `e2e-admc-exit-${stamp}@fringeisland.test`, name: `E2EADMCExit${stamp}` },
  grantee: { email: `e2e-admc-grant-${stamp}@fringeisland.test`, name: `E2EADMCGrant${stamp}` },
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
      .select('id, personal_group_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (data?.personal_group_id) return { pgId: data.personal_group_id, userId: data.id };
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`users row never materialised for ${authUserId}`);
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

test.describe('FEAT-H036 — member administration (ADM-2/3/4/5/6/12/18)', () => {
  const groupIds: string[] = [];
  const created: Fim[] = [];
  let sanc: Fim, exitFim: Fim, grantee: Fim;
  let sancGroupId: string;
  let exitGroupId: string;

  test.beforeAll(async () => {
    await setPlatformAdmin(true);
    [sanc, exitFim, grantee] = await Promise.all([
      createFim(fims.sanc.email, fims.sanc.name),
      createFim(fims.exit.email, fims.exit.name),
      createFim(fims.grantee.email, fims.grantee.name),
    ]);
    created.push(sanc, exitFim, grantee);
  });

  test.afterAll(async () => {
    await setPlatformAdmin(false);
    const admin = createAdminClient();
    for (const id of groupIds) await admin.from('groups').delete().eq('id', id);
    for (const u of created) {
      if (u?.pgId) await admin.from('groups').delete().eq('id', u.pgId);
      if (u?.authId) await deleteE2EUserByAuthId(admin, u.authId);
    }
    const pg = await sessionPersonalGroupId();
    await runAdminSql(
      `DELETE FROM public.admin_audit_log
        WHERE (action LIKE 'member.%' OR action LIKE 'platform_admin.%')
          AND actor_group_id = '${pg}'
          AND created_at > now() - interval '30 minutes';`,
    ).catch(() => undefined);
  });

  test('the list finds the fixture members and search narrows to one', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/admin/members');
    // Row-scoped: the dev DB holds ~2k members; only the fixture rows matter.
    await page.getByRole('searchbox', { name: /search/i }).fill(fims.sanc.name);
    await expect(page.getByTestId(`admin-member-row-${sanc.userId}`)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId(`admin-member-row-${exitFim.userId}`)).not.toBeVisible();
  });

  test('the suspend/reactivate round-trip through the ceremonies', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`/admin/members/${sanc.userId}`);
    await page.getByTestId('suspend-member').click();
    await confirmCeremony(page);
    await expect(page.getByTestId('state-badge')).toHaveText('suspended', { timeout: 15000 });

    await page.getByTestId('reactivate-member').click();
    // Origin-honest copy: this lift names the admin hold, not a self-pause.
    await expect(page.getByText(/admin hold/i)).toBeVisible();
    await confirmCeremony(page);
    await expect(page.getByTestId('state-badge')).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByTestId('suspend-member')).toBeVisible();
  });

  test('a scenario-named removal: the sole member leaves and the ceremony says the group closes', async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    // The fixture builds their group through the REAL UI door.
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const fixturePage = await ctx.newPage();
    await signIn(fixturePage, fims.sanc.email);
    sancGroupId = await createGroupViaUi(fixturePage, `E2E ADMC Removal ${stamp}`);
    groupIds.push(sancGroupId);
    await ctx.close();

    await page.goto(`/admin/members/${sanc.userId}`);
    const row = page.getByTestId(`membership-row-${sancGroupId}`);
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByTestId(`remove-from-group-${sancGroupId}`).click();
    await expect(page.getByText(/closes the group/i)).toBeVisible();
    await confirmCeremony(page);
    await expect(row).not.toBeVisible({ timeout: 15000 });
  });

  test('the platform exit: aggregate ceremony, no-erasure boundary, decommissioned on repaint', async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const fixturePage = await ctx.newPage();
    await signIn(fixturePage, fims.exit.email);
    exitGroupId = await createGroupViaUi(fixturePage, `E2E ADMC Exit ${stamp}`);
    groupIds.push(exitGroupId);
    await ctx.close();

    await page.goto(`/admin/members/${exitFim.userId}`);
    await expect(page.getByTestId(`membership-row-${exitGroupId}`)).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId('platform-exit-member').click();
    await expect(page.getByText(/1 will close/i)).toBeVisible();
    await expect(page.getByText(/profile remains/i)).toBeVisible();
    await confirmCeremony(page);
    await expect(page.getByTestId('state-badge')).toHaveText('decommissioned', {
      timeout: 20000,
    });
    await expect(page.getByTestId(`membership-row-${exitGroupId}`)).toHaveCount(0);
  });

  test('grant then revoke platform administration on the third fixture', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`/admin/members/${grantee.userId}`);
    await page.getByTestId('grant-admin').click();
    await confirmCeremony(page);
    await expect(page.getByTestId('admin-chip')).toBeVisible({ timeout: 15000 });

    await page.getByTestId('revoke-admin').click();
    await confirmCeremony(page);
    await expect(page.getByTestId('admin-chip')).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByTestId('grant-admin')).toBeVisible();
  });

  test('a demoted operator gets the 404 shape on list and detail', async ({ page }) => {
    test.setTimeout(120_000);
    await setPlatformAdmin(false);
    await page.goto('/admin/members');
    await expect(page.getByText(/could not be found/i)).toBeVisible({ timeout: 15000 });
    await page.goto(`/admin/members/${grantee.userId}`);
    await expect(page.getByText(/could not be found/i)).toBeVisible({ timeout: 15000 });
  });
});
