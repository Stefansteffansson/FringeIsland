import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createAdminClient } from './helpers/auth';

/**
 * FEAT-H014 (E2E) — Cycle G-B: the delegation journey (Steward shapes a
 * custom role, assigns it from the member list, the assignee's "what I can
 * do here" shows the capability), the assignment-time escalation refusal
 * (a limited assigner cannot hand out the Steward instance), and the
 * last-Steward invariant surfacing in place.
 *
 * Session isolation: this suite runs on its OWN spec-created steward FIM in
 * its own browser context — NOT the shared storageState session. The shared
 * session's single refresh token is contended by parallel workers and
 * profile.spec's sign-out journey revokes it globally mid-run; a dedicated
 * user makes this suite order- and worker-safe (the H013 second-FIM
 * precedent, extended). Both FIMs are spec-created via the admin client
 * (service_role; consent metadata per the ADR-U038 S3 gate) and cleaned up.
 */

const stamp = Date.now();
const stewardEmail = `e2e-gb-steward-${stamp}@fringeisland.test`;
const memberEmail = `e2e-gb-member-${stamp}@fringeisland.test`;
const password = 'e2e-test-password-123';
const groupName = `E2E G-B Roles ${stamp}`;

/** handle_new_user materialises the profile + personal group; poll for it. */
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

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
}

test.describe.serial('FEAT-H014 — roles & permissions (GRP-6/7/8)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let stewardCtx: BrowserContext;
  let stewardPage: Page;
  let stewardAuthId: string | null = null;
  let stewardPgId: string | null = null;
  let memberAuthId: string | null = null;
  let memberPgId: string | null = null;
  let groupId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const admin = createAdminClient();
    const { data: steward, error: sErr } = await admin.auth.admin.createUser({
      email: stewardEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'GB Steward', consent_accepted: 'true' },
    });
    if (sErr) throw sErr;
    stewardAuthId = steward.user.id;
    stewardPgId = await waitForPersonalGroup(stewardAuthId);

    const { data: member, error: mErr } = await admin.auth.admin.createUser({
      email: memberEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'GB Assignee', consent_accepted: 'true' },
    });
    if (mErr) throw mErr;
    memberAuthId = member.user.id;
    memberPgId = await waitForPersonalGroup(memberAuthId);

    stewardCtx = await browser.newContext();
    stewardPage = await stewardCtx.newPage();
    await signIn(stewardPage, stewardEmail);
  });

  test.afterAll(async () => {
    await stewardCtx?.close();
    const admin = createAdminClient();
    if (groupId) await admin.from('groups').delete().eq('id', groupId);
    for (const [authId, pgId] of [
      [memberAuthId, memberPgId],
      [stewardAuthId, stewardPgId],
    ] as const) {
      if (pgId) await admin.from('groups').delete().eq('id', pgId);
      if (authId) await admin.auth.admin.deleteUser(authId);
    }
  });

  test('Steward shapes a custom role, assigns it, and the assignee sees the capability; escalation is refused', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const page = stewardPage;

    // --- Steward creates the group through the UI (the proven G-A path).
    await page.goto('/groups');
    await page.getByRole('button', { name: /create group/i }).click();
    await page.getByLabel(/group name/i).fill(groupName);
    await page.getByRole('button', { name: /^create$/i }).click();
    await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}/, { timeout: 15000 });
    groupId = page.url().match(/\/groups\/([0-9a-f-]{36})/)?.[1] ?? null;
    expect(groupId).not.toBeNull();

    // The roles panel renders the bootstrap fabric (GRP-6 read, live).
    await expect(page.getByTestId('roles-panel')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByTestId('roles-panel').getByText('Steward Role Template'),
    ).toBeVisible();

    // --- Admin-built state: active membership + the limited 'E2E Wrangler'
    // role (assign_roles + remove_roles only) for the assignee.
    const admin = createAdminClient();
    await admin.from('group_memberships').insert({
      group_id: groupId,
      member_group_id: memberPgId,
      status: 'active',
      added_by_group_id: stewardPgId,
    });
    // 'E2E Wrangler Role Template' does not exist → no auto-link; grants are
    // exactly what we seed.
    const { data: wrangler } = await admin
      .from('group_roles')
      .insert({ group_id: groupId, name: 'E2E Wrangler' })
      .select('id')
      .single();
    const { data: perms } = await admin
      .from('permissions')
      .select('id, name')
      .in('name', ['assign_roles', 'remove_roles']);
    await admin.from('group_role_permissions').insert(
      (perms ?? []).map((p) => ({ group_role_id: wrangler!.id, permission_id: p.id })),
    );
    await admin.from('user_group_roles').insert({
      member_group_id: memberPgId,
      group_id: groupId,
      group_role_id: wrangler!.id,
      assigned_by_group_id: stewardPgId,
    });

    // --- Steward adds a custom role from the catalog checklist (GRP-6).
    await page.reload();
    await expect(page.getByTestId(`member-row-${memberPgId}`)).toBeVisible({ timeout: 15000 });
    await page.getByTestId('add-role-button').click();
    await page.getByTestId('role-name-input').fill('E2E Greeter');
    await page.getByTestId('perm-checkbox-invite_members').check();
    // view_member_list too: on a private group the contract omits the member
    // list from viewers without it — the assignee needs the list rendered to
    // reach the assign affordance for the escalation probe below.
    await page.getByTestId('perm-checkbox-view_member_list').check();
    await page.getByTestId('add-role-submit').click();
    await expect(
      page.getByTestId('roles-panel').getByText('E2E Greeter'),
    ).toBeVisible({ timeout: 15000 });

    // --- Steward assigns it from the member list (GRP-7) — chips re-read.
    await page
      .getByTestId(`assign-select-${memberPgId}`)
      .selectOption({ label: 'E2E Greeter' });
    await expect(
      page.getByTestId(`member-chips-${memberPgId}`).getByText('E2E Greeter'),
    ).toBeVisible({ timeout: 15000 });

    // --- The assignee's "what I can do here" shows the capability (GRP-8).
    const ctx = await browser.newContext();
    const memberPage = await ctx.newPage();
    await signIn(memberPage, memberEmail);
    await memberPage.goto(`/groups/${groupId}`);
    await expect(
      memberPage.getByTestId('my-permissions-panel').getByText('invite_members'),
    ).toBeVisible({ timeout: 15000 });
    // The act-as shell is real and honestly v1: exactly one context.
    await expect(memberPage.getByTestId('act-as-select')).toBeVisible();
    await expect(memberPage.getByTestId('act-as-select').locator('option')).toHaveCount(1);

    // --- Escalation refusal (GRP-7): the limited assigner picks the Steward
    // instance for themselves; the wall's message surfaces in place.
    await memberPage
      .getByTestId(`assign-select-${memberPgId}`)
      .selectOption({ label: 'Steward Role Template' });
    await expect(
      memberPage.getByText(/cannot assign a role granting permissions you do not hold/i),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      memberPage.getByTestId(`member-chips-${memberPgId}`).getByText('Steward Role Template'),
    ).toHaveCount(0);
    await ctx.close();
  });

  test('the last-Steward refusal surfaces in place and the chip stays (GRP-7 invariant)', async () => {
    test.setTimeout(60_000);
    expect(groupId).not.toBeNull();
    const page = stewardPage;
    await page.goto(`/groups/${groupId}`);
    await expect(page.getByTestId('member-list')).toBeVisible({ timeout: 15000 });

    // The spec steward is the only Steward — removal must be refused.
    await page
      .getByRole('button', { name: /remove steward role template from/i })
      .click();
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByText(/last steward/i)).toBeVisible({ timeout: 15000 });
    // The chip stays: its remove affordance is still there (an assign picker's
    // hidden <option> would false-match a bare text locator).
    await expect(
      page.getByRole('button', { name: /remove steward role template from/i }),
    ).toBeVisible();
  });
});
