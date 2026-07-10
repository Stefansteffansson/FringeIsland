import { test, expect, type Page } from '@playwright/test';
import { createAdminClient, markArrivedOnce } from './helpers/auth';

/**
 * FEAT-H018 (E2E) — Cycle G-F: group-of-groups, wielded end-to-end.
 *
 * Journey 1 (STORY-1/2/3): a Steward invites a group; the invited group's
 * wielder finds the pending invitation on ITS page, accepts AS the group
 * (the confirm names the wielding), sees the "Group" badge appear in the
 * context group's member list, flips the act-as selector to the group on the
 * context page (substitution named honestly), then withdraws.
 *
 * Journey 2 (STORY-4, the Gracy case): a lone human sharing a group with the
 * FringeIsland caretaker sees the honest badge, the non-system count, and the
 * Close affordance.
 *
 * Session isolation: dedicated spec-created FIMs in their own browser
 * contexts (the G-B default). Groups create through the proven UI path;
 * visibility + the caretaker row seed substrate-side (admission targets must
 * be public — the PC015 Open Q1 posture; DeusEx resolves by system-label,
 * never a hardcoded id).
 */

const stamp = Date.now();
const password = 'e2e-test-password-123';

const fims = {
  stewB: { email: `e2e-gf-stewb-${stamp}@fringeisland.test`, name: `E2EGFStewB${stamp}` },
  stewA: { email: `e2e-gf-stewa-${stamp}@fringeisland.test`, name: `E2EGFStewA${stamp}` },
  gracy: { email: `e2e-gf-gracy-${stamp}@fringeisland.test`, name: `E2EGFGracy${stamp}` },
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
  await markArrivedOnce(admin, data.user.id); // FEAT-H023: fixture FIMs have arrived once
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

async function deusExGroupId(): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('groups')
    .select('id')
    .eq('name', 'DeusEx')
    .eq('group_type', 'system')
    .single();
  if (error) throw new Error(`DeusEx lookup: ${error.message}`);
  return data.id as string;
}

test.describe('FEAT-H018 — group-of-groups (Cycle G-F)', () => {
  test('a group is invited, answers through its wielder, and withdraws (STORY-1/2/3)', async ({
    browser,
  }) => {
    const stewB = await createFim(fims.stewB.email, fims.stewB.name);
    const stewA = await createFim(fims.stewA.email, fims.stewA.name);
    void stewB;
    void stewA;

    const ctxB = await browser.newContext();
    const ctxA = await browser.newContext();
    const pageB = await ctxB.newPage();
    const pageA = await ctxA.newPage();

    await signIn(pageB, fims.stewB.email);
    await signIn(pageA, fims.stewA.email);

    const groupB = await createGroupViaUi(pageB, `E2E GF Byalaget ${stamp}`);
    const groupA = await createGroupViaUi(pageA, `E2E GF Familjen ${stamp}`);
    await makePublic(groupA); // admission targets are public (PC015 Open Q1)
    await makePublic(groupB); // so A's wielder can visit B's page for the selector

    // STORY-2 — the Steward of B invites group A by typeahead.
    await pageB.goto(`/groups/${groupB}`);
    await pageB.getByTestId('invite-group-query').fill(`E2E GF Familjen ${stamp}`);
    await pageB.getByTestId('invite-group-search').click();
    await pageB.getByTestId(`invite-group-hit-${groupA}`).click();
    await expect(pageB.getByText(/the invitation to .* is out/i)).toBeVisible({
      timeout: 15000,
    });

    // STORY-3 — A's wielder answers on A's page; the confirm names the wielding.
    await pageA.goto(`/groups/${groupA}`);
    const panel = pageA.getByTestId('group-memberships-panel');
    await expect(panel).toBeVisible({ timeout: 15000 });
    await expect(panel.getByText(`E2E GF Byalaget ${stamp}`)).toBeVisible();
    // Post-6-done fix: on A's OWN page the selector offers no hat (a group
    // never acts as itself) — while the wielder's memberships panel renders.
    await expect(pageA.getByTestId('act-as-select').locator('option')).toHaveCount(1);
    const acceptButtons = panel.getByTestId(/accept-as-group-/);
    await acceptButtons.first().click();
    await expect(pageA.getByText(/you are answering for/i)).toBeVisible();
    await pageA.getByRole('button', { name: 'Accept', exact: true }).click();
    await expect(panel.getByTestId(/membership-status-/).first()).toHaveText(/active/i, {
      timeout: 15000,
    });

    // STORY-4 seam — B's member list now carries A with the "Group" badge.
    await pageB.goto(`/groups/${groupB}`);
    await expect(pageB.getByTestId(`kind-badge-${groupA}`)).toHaveText('Group', {
      timeout: 15000,
    });

    // STORY-1 — on B's page, A's wielder flips the hat; substitution is named.
    await pageA.goto(`/groups/${groupB}`);
    const select = pageA.getByTestId('act-as-select');
    await expect(select).toBeVisible({ timeout: 15000 });
    await select.selectOption(groupA);
    await expect(pageA.getByText(/acting as E2E GF Familjen/i)).toBeVisible({
      timeout: 15000,
    });

    // STORY-3 — the wielded exit, from A's page.
    await pageA.goto(`/groups/${groupA}`);
    await pageA.getByTestId(/withdraw-as-group-/).first().click();
    await expect(pageA.getByText(/you are acting for/i)).toBeVisible();
    await pageA.getByRole('button', { name: 'Yes, withdraw' }).click();
    await expect(
      pageA.getByText(/is not a member of any group/i),
    ).toBeVisible({ timeout: 15000 });

    await ctxA.close();
    await ctxB.close();
  });

  test('the Gracy case: honest caretaker badge, non-system count, and Close (STORY-4)', async ({
    browser,
  }) => {
    const gracy = await createFim(fims.gracy.email, fims.gracy.name);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await signIn(page, fims.gracy.email);
    const groupC = await createGroupViaUi(page, `E2E GF Nya gruppen ${stamp}`);

    // The caretaker joins substrate-side (the post-fallback shape).
    const deusEx = await deusExGroupId();
    const admin = createAdminClient();
    const { error } = await admin.from('group_memberships').insert({
      group_id: groupC,
      member_group_id: deusEx,
      status: 'active',
      added_by_group_id: gracy.pgId,
    });
    if (error) throw new Error(`caretaker seed: ${error.message}`);

    await page.goto(`/groups/${groupC}`);
    await expect(page.getByTestId(`kind-badge-${deusEx}`)).toHaveText('FringeIsland', {
      timeout: 15000,
    });
    // Count copy keys on the non-system count: one human, one caretaker.
    await expect(page.getByText(/^1 member$/)).toBeVisible();
    // The last human alone with the caretaker sees Close (the retired wall).
    await expect(page.getByTestId('close-group')).toBeVisible();

    await ctx.close();
  });
});
