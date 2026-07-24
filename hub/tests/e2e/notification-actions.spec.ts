import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createAdminClient, markArrivedOnce } from './helpers/auth';

/**
 * FEAT-H031 / FEAT-PD014 (E2E) — A-NTF Cycle N-B: the actionable notification,
 * end-to-end, including the piece no other suite reaches — **co-leader
 * convergence**.
 *
 * A context group invites an engagement group. The invited group has TWO
 * `act_as_group` holders (ADR-U041 — the permission, never the "Steward" role
 * name), so the substrate fans out one `acting_invitation` per holder. Either
 * may answer; the first answer wins, and the sibling's letter must then read
 * "Answered by [name]" with its buttons gone — the durable convergence
 * recorded on the notification rows (ADR-U051 Option A), which survives the
 * membership row the answer may delete.
 *
 * Session isolation: dedicated spec-created FIMs in their own browser contexts
 * (the G-B default). Display names are single-token — surfaces render the
 * nickname as the first token, and "Answered by [name]" asserts against it.
 */

const stamp = Date.now();
const password = 'e2e-test-password-123';

const fims = {
  host: { email: `e2e-nb-host-${stamp}@fringeisland.test`, name: `E2ENBHost${stamp}` },
  lead: { email: `e2e-nb-lead-${stamp}@fringeisland.test`, name: `E2ENBLead${stamp}` },
  colead: { email: `e2e-nb-colead-${stamp}@fringeisland.test`, name: `E2ENBColead${stamp}` },
} as const;

type Fim = { authId: string; pgId: string };

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

/** The proven G-A creation path, through the UI (private by default). */
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

async function makePublic(groupId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from('groups').update({ is_public: true }).eq('id', groupId);
  if (error) throw new Error(`makePublic: ${error.message}`);
}

/**
 * Give `pgId` a second seat at the invited group's table WITH `act_as_group`.
 * Seeded substrate-side (the role-grant arc is not this suite's journey), but
 * resolved by PERMISSION — never by a role name — so the fixture matches the
 * contract the fan-out actually queries.
 */
async function seedActingHolder(groupId: string, pgId: string, addedBy: string) {
  const admin = createAdminClient();

  const { error: mErr } = await admin.from('group_memberships').insert({
    group_id: groupId,
    member_group_id: pgId,
    status: 'active',
    added_by_group_id: addedBy,
  });
  if (mErr) throw new Error(`seedActingHolder membership: ${mErr.message}`);

  const { data: perm, error: pErr } = await admin
    .from('permissions')
    .select('id')
    .eq('name', 'act_as_group')
    .single();
  if (pErr) throw new Error(`act_as_group permission lookup: ${pErr.message}`);

  const { data: grants, error: gErr } = await admin
    .from('group_role_permissions')
    .select('group_role_id')
    .eq('permission_id', perm.id)
    .eq('granted', true);
  if (gErr) throw new Error(`act_as_group grants lookup: ${gErr.message}`);

  const { data: roles, error: rErr } = await admin
    .from('group_roles')
    .select('id')
    .eq('group_id', groupId)
    .in('id', (grants ?? []).map((g) => g.group_role_id as string));
  if (rErr) throw new Error(`acting role lookup: ${rErr.message}`);
  if (!roles || roles.length !== 1) {
    throw new Error(`expected exactly one act_as_group role on ${groupId}, got ${roles?.length}`);
  }

  const { error: uErr } = await admin.from('user_group_roles').insert({
    group_id: groupId,
    member_group_id: pgId,
    group_role_id: roles[0].id as string,
  });
  if (uErr) throw new Error(`seedActingHolder role: ${uErr.message}`);
}

/** Open the bell and return its dropdown locator. */
async function openBell(page: Page) {
  await page.getByTestId('notification-bell').click();
  const dropdown = page.getByTestId('notification-dropdown');
  await expect(dropdown).toBeVisible({ timeout: 15000 });
  return dropdown;
}

test.describe.serial('FEAT-H031 — typed actions & co-leader convergence (N-B)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const created: Fim[] = [];
  const groupIds: string[] = [];
  let host: Fim;
  let lead: Fim;
  let colead: Fim;

  test.beforeAll(async () => {
    host = await createFim(fims.host.email, fims.host.name);
    lead = await createFim(fims.lead.email, fims.lead.name);
    colead = await createFim(fims.colead.email, fims.colead.name);
    created.push(host, lead, colead);
  });

  test.afterAll(async () => {
    const admin = createAdminClient();
    for (const id of groupIds) await admin.from('groups').delete().eq('id', id);
    for (const u of [...created].reverse()) {
      if (u?.pgId) await admin.from('groups').delete().eq('id', u.pgId);
      if (u?.authId) await admin.auth.admin.deleteUser(u.authId);
    }
  });

  test('an acting-invitation fans out to both holders; the first answer wins and the co-leader sees who answered', async ({
    browser,
  }) => {
    test.setTimeout(240_000);

    const contextName = `E2E N-B Context ${stamp}`;
    const invitedName = `E2E N-B Invited ${stamp}`;

    const hostCtx: BrowserContext = await browser.newContext();
    const leadCtx: BrowserContext = await browser.newContext();
    const coleadCtx: BrowserContext = await browser.newContext();
    const hostPage = await hostCtx.newPage();
    const leadPage = await leadCtx.newPage();
    const coleadPage = await coleadCtx.newPage();

    await signIn(hostPage, fims.host.email);
    await signIn(leadPage, fims.lead.email);
    await signIn(coleadPage, fims.colead.email);

    const contextGroup = await createGroupViaUi(hostPage, contextName);
    const invitedGroup = await createGroupViaUi(leadPage, invitedName);
    groupIds.push(contextGroup, invitedGroup);
    await makePublic(contextGroup); // admission targets are public (PC015 Open Q1)
    await makePublic(invitedGroup);

    // The invited group gets its SECOND act_as_group holder — the whole point:
    // a fan-out of one is not convergence.
    await seedActingHolder(invitedGroup, colead.pgId, lead.pgId);

    // The host invites the group. The substrate fans out one acting_invitation
    // per act_as_group holder (FEAT-PD014).
    await hostPage.goto(`/groups/${contextGroup}`);
    await hostPage.getByTestId('invite-group-query').fill(invitedName);
    await hostPage.getByTestId('invite-group-search').click();
    await hostPage.getByTestId(`invite-group-hit-${invitedGroup}`).click();
    await expect(hostPage.getByText(/the invitation to .* is out/i)).toBeVisible({
      timeout: 15000,
    });

    // BOTH holders' bells carry it, with Accept AND Decline (STORY-1/3).
    const leadDropdown = await openBell(leadPage);
    await expect(
      leadDropdown.getByText(new RegExp(`${invitedName}.*has been invited to join`, 'i')),
    ).toBeVisible({ timeout: 15000 });
    await expect(leadDropdown.getByTestId('notif-action-accept')).toBeVisible();
    await expect(leadDropdown.getByTestId('notif-action-decline')).toBeVisible();

    const coleadDropdown = await openBell(coleadPage);
    await expect(
      coleadDropdown.getByText(new RegExp(`${invitedName}.*has been invited to join`, 'i')),
    ).toBeVisible({ timeout: 15000 });
    await expect(coleadDropdown.getByTestId('notif-action-accept')).toBeVisible();

    // The lead answers first — the first answer wins. Assert the DISPATCH, not
    // just the optimistic button vanish (which happens either way): the route
    // must actually accept, and its body names the reason when it doesn't.
    const dispatched = leadPage.waitForResponse(
      (r) => r.url().includes('/acting-response') && r.request().method() === 'POST',
    );
    await leadDropdown.getByTestId('notif-action-accept').first().click();
    await leadPage.getByTestId('confirm-modal-confirm').click();
    const dispatchRes = await dispatched;
    const dispatchStatus = dispatchRes.status();
    const dispatchBody = await dispatchRes.text();
    expect(
      dispatchStatus,
      `acting-response returned ${dispatchStatus}: ${dispatchBody}`,
    ).toBe(200);
    await expect(leadDropdown.getByTestId('notif-action-accept')).toHaveCount(0, {
      timeout: 15000,
    });

    // The membership actually resolved — the answer did the work, not just the
    // UI: the host's member list now carries the invited group.
    await hostPage.goto(`/groups/${contextGroup}`);
    await expect(hostPage.getByTestId(`kind-badge-${invitedGroup}`)).toHaveText('Group', {
      timeout: 15000,
    });

    // CONVERGENCE (STORY-3/4): the co-leader's letter, freshly re-read, names
    // who answered and no longer asks. Read via the inbox in one client-side
    // context — a resolved row must come from server state, not a stale cache.
    await coleadPage.goto('/notifications');
    const coleadRow = coleadPage
      .locator('[data-testid^="notification-row-"]')
      .filter({ hasText: new RegExp(`${invitedName}.*has been invited to join`, 'i') })
      .first();
    await expect(coleadRow).toBeVisible({ timeout: 15000 });
    await expect(coleadRow).toContainText(new RegExp(`Answered by ${fims.lead.name}`, 'i'), {
      timeout: 15000,
    });
    await expect(coleadRow.getByTestId('notif-action-accept')).toHaveCount(0);
    await expect(coleadRow.getByTestId('notif-action-decline')).toHaveCount(0);

    await hostCtx.close();
    await leadCtx.close();
    await coleadCtx.close();
  });
});
