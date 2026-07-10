import { test, expect, type Page } from '@playwright/test';
import { createAdminClient, markArrivedOnce } from './helpers/auth';

/**
 * FEAT-H017 (E2E) — Cycle G-E: the ways a group ends or changes hands.
 * Nomination accept across FIMs; the single-nominee decline → DeusEx fallback
 * (ADR-U019); the direct hand-over; the last-member close; the Steward delete
 * with a remaining member finding the group gone (tombstone + notification
 * asserted substrate-side). The two G-D honest refusals are exercised as the
 * flows they became.
 *
 * Session isolation: dedicated spec-created FIMs in their own browser
 * contexts (the G-B suite-isolation default — shared-session refresh-token
 * contention broke earlier runs). Memberships seed substrate-side (the
 * invitation arc is FEAT-H015's journey).
 */

const stamp = Date.now();
const password = 'e2e-test-password-123';

const fims = {
  alpha: { email: `e2e-ge-alpha-${stamp}@fringeisland.test`, name: `E2EGEAlpha${stamp}` },
  bruno: { email: `e2e-ge-bruno-${stamp}@fringeisland.test`, name: `E2EGEBruno${stamp}` },
  freja: { email: `e2e-ge-freja-${stamp}@fringeisland.test`, name: `E2EGEFreja${stamp}` },
  helge: { email: `e2e-ge-helge-${stamp}@fringeisland.test`, name: `E2EGEHelge${stamp}` },
  ines: { email: `e2e-ge-ines-${stamp}@fringeisland.test`, name: `E2EGEInes${stamp}` },
  jonas: { email: `e2e-ge-jonas-${stamp}@fringeisland.test`, name: `E2EGEJonas${stamp}` },
  klara: { email: `e2e-ge-klara-${stamp}@fringeisland.test`, name: `E2EGEKlara${stamp}` },
  liv: { email: `e2e-ge-liv-${stamp}@fringeisland.test`, name: `E2EGELiv${stamp}` },
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

async function seedMembership(groupId: string, member: Fim, addedBy: Fim) {
  const admin = createAdminClient();
  const { error } = await admin.from('group_memberships').insert({
    group_id: groupId,
    member_group_id: member.pgId,
    status: 'active',
    added_by_group_id: addedBy.pgId,
  });
  if (error) throw new Error(`membership seed: ${error.message}`);
}

test.describe.serial('FEAT-H017 — leadership transfer, closure & deletion (MEM-7/8, GRP-9)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  const created: Fim[] = [];
  const groupIds: string[] = [];
  let alpha: Fim, bruno: Fim, freja: Fim, helge: Fim, ines: Fim, jonas: Fim, klara: Fim, liv: Fim;

  test.beforeAll(async () => {
    [alpha, bruno, freja, helge, ines, jonas, klara, liv] = await Promise.all([
      createFim(fims.alpha.email, fims.alpha.name),
      createFim(fims.bruno.email, fims.bruno.name),
      createFim(fims.freja.email, fims.freja.name),
      createFim(fims.helge.email, fims.helge.name),
      createFim(fims.ines.email, fims.ines.name),
      createFim(fims.jonas.email, fims.jonas.name),
      createFim(fims.klara.email, fims.klara.name),
      createFim(fims.liv.email, fims.liv.name),
    ]);
    created.push(alpha, bruno, freja, helge, ines, jonas, klara, liv);
  });

  test.afterAll(async () => {
    const admin = createAdminClient();
    for (const id of groupIds) await admin.from('groups').delete().eq('id', id);
    for (const u of created) {
      if (u?.pgId) await admin.from('groups').delete().eq('id', u.pgId);
      if (u?.authId) await admin.auth.admin.deleteUser(u.authId);
    }
  });

  test('nomination accept across FIMs: the sole-Steward Leave wall becomes the transfer door; the nominee becomes Steward and the nominator departs', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const groupName = `E2E G-E Succession ${stamp}`;

    const alphaCtx = await browser.newContext();
    const alphaPage = await alphaCtx.newPage();
    await signIn(alphaPage, fims.alpha.email);
    const groupId = await createGroupViaUi(alphaPage, groupName);
    groupIds.push(groupId);
    await seedMembership(groupId, bruno, alpha);

    // The retired G-D refusal, exercised as the new flow: Leave → honest 409
    // → the transfer choice opens alongside it.
    await alphaPage.goto(`/groups/${groupId}`);
    await alphaPage.getByTestId('leave-group').click();
    await alphaPage.getByTestId('confirm-modal-confirm').click();
    await expect(alphaPage.getByText(/only active steward/i)).toBeVisible({ timeout: 15000 });
    await expect(alphaPage.getByTestId('transfer-leadership')).toBeVisible();

    // Nominate Bruno (the pick-list is the existing member list, minus Alpha).
    await expect(
      alphaPage.getByTestId(`nominate-candidate-${alpha.pgId}`),
    ).not.toBeVisible();
    await alphaPage.getByTestId(`nominate-candidate-${bruno.pgId}`).click();
    await alphaPage.getByTestId('send-nomination').click();
    await alphaPage.getByTestId('confirm-modal-confirm').click();
    await expect(alphaPage.getByText(/offer is out/i)).toBeVisible({ timeout: 15000 });
    // No pre-empted departure: Alpha still opens the group.
    await alphaPage.goto(`/groups/${groupId}`);
    await expect(alphaPage.getByRole('heading', { name: groupName })).toBeVisible({
      timeout: 15000,
    });

    // Bruno finds the offer on /groups — with the window shown — and accepts.
    const brunoCtx = await browser.newContext();
    const brunoPage = await brunoCtx.newPage();
    await signIn(brunoPage, fims.bruno.email);
    await expect(brunoPage.getByTestId('pending-nominations')).toBeVisible({ timeout: 15000 });
    await expect(brunoPage.getByText(/respond by/i)).toBeVisible();
    await brunoPage.locator('[data-testid^="accept-nomination-"]').click();
    await brunoPage.getByTestId('confirm-modal-confirm').click();
    await expect(brunoPage.getByText(/you are now the steward/i)).toBeVisible({
      timeout: 15000,
    });

    // Succession resolved: the nominator has left…
    await alphaPage.goto('/groups');
    await expect(alphaPage.getByText(groupName)).not.toBeVisible({ timeout: 15000 });
    // …and the group shows Bruno without Alpha's row.
    await brunoPage.goto(`/groups/${groupId}`);
    await expect(brunoPage.getByRole('heading', { name: groupName })).toBeVisible({
      timeout: 15000,
    });
    await expect(brunoPage.getByTestId(`member-row-${alpha.pgId}`)).not.toBeVisible();

    await alphaCtx.close();
    await brunoCtx.close();
  });

  test('the DeusEx fallback: the single nominee declines, the offer passes on unnamed, the nominator departs, the group persists', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const groupName = `E2E G-E Succession ${stamp}`; // Bruno's group from above
    const groupId = groupIds[0];
    await seedMembership(groupId, freja, bruno);

    // Bruno (now the sole Steward) nominates Freja — the explicit door.
    const brunoCtx = await browser.newContext();
    const brunoPage = await brunoCtx.newPage();
    await signIn(brunoPage, fims.bruno.email);
    await brunoPage.goto(`/groups/${groupId}`);
    await brunoPage.getByTestId('hand-over-leadership').click();
    await brunoPage.getByTestId(`nominate-candidate-${freja.pgId}`).click();
    await brunoPage.getByTestId('send-nomination').click();
    await brunoPage.getByTestId('confirm-modal-confirm').click();
    await expect(brunoPage.getByText(/offer is out/i)).toBeVisible({ timeout: 15000 });

    // Freja declines — the only nominee, so the contract routes to DeusEx.
    const frejaCtx = await browser.newContext();
    const frejaPage = await frejaCtx.newPage();
    await signIn(frejaPage, fims.freja.email);
    await expect(frejaPage.getByTestId('pending-nominations')).toBeVisible({ timeout: 15000 });
    await frejaPage.locator('[data-testid^="decline-nomination-"]').click();
    await frejaPage.getByTestId('confirm-modal-confirm').click();
    const passedOn = frejaPage.getByText(/passed on/i);
    await expect(passedOn).toBeVisible({ timeout: 15000 });
    // The Surface never names the routing (next nominee vs FringeIsland).
    await expect(frejaPage.getByTestId('pending-nominations')).not.toContainText(
      /FringeIsland|DeusEx/i,
    );

    // The fallback resolved: the nominator departed, the group persists for Freja.
    await brunoPage.goto('/groups');
    await expect(brunoPage.getByText(groupName)).not.toBeVisible({ timeout: 15000 });
    await frejaPage.goto('/groups');
    await expect(frejaPage.getByText(groupName)).toBeVisible({ timeout: 15000 });

    // Substrate: the group is alive and never headless (ADR-U019).
    const admin = createAdminClient();
    const { data: grp } = await admin
      .from('groups')
      .select('status')
      .eq('id', groupId)
      .single();
    expect(grp?.status).toBe('active');

    await brunoCtx.close();
    await frejaCtx.close();
  });

  test('the direct hand-over: the sole Steward hands to FringeIsland and leaves; the member keeps the group', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const groupName = `E2E G-E Handover ${stamp}`;

    const helgeCtx = await browser.newContext();
    const helgePage = await helgeCtx.newPage();
    await signIn(helgePage, fims.helge.email);
    const groupId = await createGroupViaUi(helgePage, groupName);
    groupIds.push(groupId);
    await seedMembership(groupId, ines, helge);

    await helgePage.goto(`/groups/${groupId}`);
    await helgePage.getByTestId('hand-over-leadership').click();
    await helgePage.getByTestId('hand-to-deusex').click();
    await helgePage.getByTestId('confirm-modal-confirm').click();
    await expect(helgePage).toHaveURL(/\/groups$/, { timeout: 15000 });
    await expect(helgePage.getByText(groupName)).not.toBeVisible({ timeout: 15000 });

    const inesCtx = await browser.newContext();
    const inesPage = await inesCtx.newPage();
    await signIn(inesPage, fims.ines.email);
    await expect(inesPage.getByText(groupName)).toBeVisible({ timeout: 15000 });

    await helgeCtx.close();
    await inesCtx.close();
  });

  test('the last-member close: the retired G-D refusal becomes the Close affordance and the group ends cleanly', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const groupName = `E2E G-E Closing ${stamp}`;

    const jonasCtx = await browser.newContext();
    const jonasPage = await jonasCtx.newPage();
    await signIn(jonasPage, fims.jonas.email);
    const groupId = await createGroupViaUi(jonasPage, groupName);
    groupIds.push(groupId);

    // The last member sees the Close door where the G-D wall stood.
    await jonasPage.goto(`/groups/${groupId}`);
    await expect(jonasPage.getByTestId('close-group')).toBeVisible({ timeout: 15000 });
    await jonasPage.getByTestId('close-group').click();
    await jonasPage.getByTestId('confirm-modal-confirm').click();
    await expect(jonasPage).toHaveURL(/\/groups$/, { timeout: 15000 });
    await expect(jonasPage.getByText(groupName)).not.toBeVisible({ timeout: 15000 });

    // Substrate: the closed tombstone (MEM-8 — ran its course).
    const admin = createAdminClient();
    const { data: grp } = await admin
      .from('groups')
      .select('status')
      .eq('id', groupId)
      .single();
    expect(grp?.status).toBe('closed');

    await jonasCtx.close();
  });

  test('the Steward delete: danger-confirmed, the remaining member finds the group gone — tombstone and notice substrate-side', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const groupName = `E2E G-E Deleting ${stamp}`;

    const klaraCtx = await browser.newContext();
    const klaraPage = await klaraCtx.newPage();
    await signIn(klaraPage, fims.klara.email);
    const groupId = await createGroupViaUi(klaraPage, groupName);
    groupIds.push(groupId);
    await seedMembership(groupId, liv, klara);

    // Liv sees the group before the deletion.
    const livCtx = await browser.newContext();
    const livPage = await livCtx.newPage();
    await signIn(livPage, fims.liv.email);
    await expect(livPage.getByText(groupName)).toBeVisible({ timeout: 15000 });

    // Delete is its own danger-styled, explicitly-confirmed act — distinct
    // from Leave (also on the page) and from member Remove.
    await klaraPage.goto(`/groups/${groupId}`);
    await expect(klaraPage.getByTestId('leave-group')).toBeVisible({ timeout: 15000 });
    await klaraPage.getByTestId('delete-group').click();
    await expect(klaraPage.getByText(/cannot be undone/i)).toBeVisible();
    await klaraPage.getByTestId('confirm-modal-confirm').click();
    await expect(klaraPage).toHaveURL(/\/groups$/, { timeout: 15000 });
    await expect(klaraPage.getByText(groupName)).not.toBeVisible({ timeout: 15000 });

    // The remaining member's next visit: the group is absent.
    await livPage.goto('/groups');
    await expect(livPage.getByText(groupName)).not.toBeVisible({ timeout: 15000 });

    // Substrate: soft-terminal archived (GRP-9, Open Q5) + Liv's durable
    // group_deleted notice (A-NTF renders it later).
    const admin = createAdminClient();
    const { data: grp } = await admin
      .from('groups')
      .select('status')
      .eq('id', groupId)
      .single();
    expect(grp?.status).toBe('archived');
    const { data: notice } = await admin
      .from('notifications')
      .select('id, type')
      .eq('recipient_group_id', liv.pgId)
      .eq('type', 'group_deleted')
      .limit(1);
    expect(notice?.length).toBe(1);

    await klaraCtx.close();
    await livCtx.close();
  });
});
