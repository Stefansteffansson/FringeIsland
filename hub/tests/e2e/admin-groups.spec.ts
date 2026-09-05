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
 * FEAT-H035 (E2E) — Cycle ADM-B: the group administration journey (STORY-5).
 * A real hand-to-FringeIsland group appears under Platform-stewarded → the
 * admin reassigns it back to a member → it leaves the tab; the
 * suspend/reactivate round-trip through the ceremonies; the demoted operator
 * gets the 404 shape.
 *
 * Coverage label (honest): this journey spec was written AFTER the surface
 * implementation — the red-first demonstrations for every story behaviour
 * live at the unit tier (admin-groups-list / admin-group-detail /
 * admin-dashboard suites, red 2026-08-01 pre-implementation) and at the
 * platform tier (the PC020 integration suite, red pre-migration). This file
 * is integrative journey coverage, labelled test-after by the house rule.
 *
 * Serial: the tests share one fixture group whose state advances
 * (caretaker → reassigned → suspended → active), and the last test demotes
 * the shared session FIM. The hand-over itself runs through the REAL UI path
 * (the TASK-INT-05 law: caretakership through the real door, never fixture
 * SQL). afterAll demotes, deletes fixture groups + FIMs (the caretaker
 * membership is already gone via the reassignment — the leak instrument
 * stays at delta 0 either way), and purges fixture audit rows.
 */

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const password = 'e2e-test-password-123';

const fims = {
  stew: { email: `e2e-admb-stew-${stamp}@fringeisland.test`, name: `E2EADMBStew${stamp}` },
  memb: { email: `e2e-admb-memb-${stamp}@fringeisland.test`, name: `E2EADMBMemb${stamp}` },
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

test.describe('FEAT-H035 — group administration (ADM-8/ADM-9, the RW-05 exit)', () => {
  const groupName = `E2E ADMB Caretaker ${stamp}`;
  const groupIds: string[] = [];
  const created: Fim[] = [];
  let stew: Fim, memb: Fim;
  let caretakerGroupId: string;

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
    for (const id of groupIds) await admin.from('groups').delete().eq('id', id);
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

  test('a real hand-to-FringeIsland group appears under Platform-stewarded', async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);

    // The steward builds and hands the group over through the REAL UI door.
    const stewCtx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const stewPage = await stewCtx.newPage();
    await signIn(stewPage, fims.stew.email);
    caretakerGroupId = await createGroupViaUi(stewPage, groupName);
    groupIds.push(caretakerGroupId);
    const admin = createAdminClient();
    const { error: mErr } = await admin.from('group_memberships').insert({
      group_id: caretakerGroupId,
      member_group_id: memb.pgId,
      status: 'active',
      added_by_group_id: stew.pgId,
    });
    if (mErr) throw new Error(`membership seed: ${mErr.message}`);

    await stewPage.goto(`/groups/${caretakerGroupId}`);
    await stewPage.getByTestId('hand-over-leadership').click();
    await stewPage.getByTestId('hand-to-deusex').click();
    await stewPage.getByTestId('confirm-modal-confirm').click();
    await expect(stewPage).toHaveURL(/\/groups$/, { timeout: 15000 });
    await stewCtx.close();

    // The admin operator sees it under the caretaker tab — RW-05 discharged.
    await page.goto('/admin/groups');
    await page.getByRole('tab', { name: 'Platform-stewarded' }).click();
    await expect(page.getByRole('link', { name: groupName })).toBeVisible({ timeout: 15000 });
    // Scoped to the fixture row: the dev DB legitimately holds other
    // platform-stewarded groups — surfacing them is RW-05's whole point.
    await expect(
      page.getByTestId(`admin-group-row-${caretakerGroupId}`).getByTestId('caretaker-flag'),
    ).toBeVisible();
  });

  test('reassigning hands the group back to the member and it leaves the tab', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`/admin/groups/${caretakerGroupId}`);
    await expect(page.getByTestId('caretaker-banner')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('reassign-stewardship').click();
    await page.getByTestId('reassign-picker').selectOption(memb.pgId);
    await page.getByTestId('reassign-confirm').click();
    await confirmCeremony(page);

    // The honest repaint: the banner goes, the member reads as steward.
    await expect(page.getByTestId('caretaker-banner')).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('steward-row')).toHaveText(fims.memb.name);

    await page.goto('/admin/groups');
    await page.getByRole('tab', { name: 'Platform-stewarded' }).click();
    await expect(page.getByRole('link', { name: groupName })).not.toBeVisible({ timeout: 15000 });
  });

  test('the suspend/reactivate round-trip through the ceremonies', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`/admin/groups/${caretakerGroupId}`);
    await page.getByTestId('suspend-group').click();
    await confirmCeremony(page);
    await expect(page.getByTestId('status-badge')).toHaveText('suspended', { timeout: 15000 });

    await page.getByTestId('reactivate-group').click();
    await confirmCeremony(page);
    await expect(page.getByTestId('status-badge')).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByTestId('suspend-group')).toBeVisible();
  });

  test('a demoted operator gets the 404 shape on list and detail', async ({ page }) => {
    test.setTimeout(120_000);
    await setPlatformAdmin(false);
    await page.goto('/admin/groups');
    await expect(page.getByText(/could not be found/i)).toBeVisible({ timeout: 15000 });
    await page.goto(`/admin/groups/${caretakerGroupId}`);
    await expect(page.getByText(/could not be found/i)).toBeVisible({ timeout: 15000 });
  });
});
