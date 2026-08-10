import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createAdminClient, markArrivedOnce, runAdminSql, SESSION_EMAIL, deleteE2EUserByAuthId } from './helpers/auth';

/**
 * FEAT-H040 (E2E) — Cycle ADM-F: the role-template editor journey (STORY-8)
 * plus the walk-rider verification cells (STORY-4/6/7).
 *
 * Elevate → roles card → clone a seed (both consequences named) → draft →
 * apply with the diff preview → a template-less group carries the clone's
 * role (the STORY-2 contract pin, observed through the session's own
 * authorized door) → rollback through the same ceremony → audit rows carry
 * the diffs → WA-4: force sign-out reaches the signed-in device within
 * seconds → WA-3: a CONSENTED member hard-deletes end-to-end through the
 * console (consent proof survives anonymised) → the STORY-4 route-tier pin
 * (P0001 verbatim on a seed write) → demoted operator gets the 404 shape.
 *
 * Coverage label (honest): written AFTER the surface implementation — the
 * red-first demonstrations live at the unit tier (admin-roles-view /
 * admin-role-template-detail / admin-dashboard, red 2026-08-04
 * pre-implementation) and at the platform tier (the PC025 gate suite, red
 * pre-migration). Integrative journey coverage, labelled test-after by the
 * house rule.
 *
 * Serial: the clone's ledger advances test to test. The session FIM is never
 * signed out (WA-4 signs out a FIXTURE's context only — the TASK-E2E-01 trap
 * class). Single-token fixture display names (nickname = first token).
 */

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const password = 'e2e-test-password-123';
const CLONE_NAME = `E2EADMFScribe${stamp}`;
const GROUP_NAME = `E2EADMFCircle${stamp}`;
const A_NAME = `E2EADMFTargetA${stamp}`;
const B_NAME = `E2EADMFTargetB${stamp}`;
const A_EMAIL = `e2e-admf-target-a-${stamp}@fringeisland.test`;
const B_EMAIL = `e2e-admf-target-b-${stamp}@fringeisland.test`;
const TOGGLED_PERMISSION = 'view_member_profiles';

type Fim = { authId: string; pgId: string; userId: string };

let memberA: Fim; // WA-4 target — force sign-out reaches their device
let memberB: Fim; // WA-3 target — consented, hard-deleted through the console
let stewardId: string;
let cloneId: string | null = null;
let groupId: string | null = null;
let consentIdB: string | null = null;

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

async function loginAs(context: BrowserContext, email: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 15000 });
  return page;
}

test.beforeAll(async () => {
  await setPlatformAdmin(true);
  memberA = await createFim(A_EMAIL, A_NAME);
  memberB = await createFim(B_EMAIL, B_NAME);
  const admin = createAdminClient();
  const { data: steward } = await admin
    .from('role_templates')
    .select('id')
    .eq('name', 'Steward Role Template')
    .single();
  stewardId = steward!.id as string;
  const { data: consent } = await admin
    .from('consent_records')
    .select('id')
    .eq('subject_user_id', memberB.userId)
    .maybeSingle();
  consentIdB = (consent?.id as string) ?? null;
});

test.afterAll(async () => {
  await setPlatformAdmin(false);
  const admin = createAdminClient();
  if (groupId) {
    await runAdminSql(`DELETE FROM public.groups WHERE id = '${groupId}';`).catch(() => undefined);
  }
  await runAdminSql(`DELETE FROM public.role_templates WHERE name LIKE 'E2EADMF%';`).catch(
    () => undefined,
  );
  await runAdminSql(
    `DELETE FROM public.admin_audit_log
      WHERE target IN ('${cloneId ?? '00000000-0000-4000-8000-000000000000'}',
                       '${memberA.userId}', '${memberB.userId}')
         OR metadata::text LIKE '%E2EADMF%'
         OR metadata::text LIKE '%${memberA.userId}%';`,
  ).catch(() => undefined);
  if (consentIdB) {
    await runAdminSql(`DELETE FROM public.consent_records WHERE id = '${consentIdB}';`).catch(
      () => undefined,
    );
  }
  await deleteE2EUserByAuthId(admin, memberA.authId).catch(() => undefined);
  // No-op after a green run (WA-3 hard-deletes B in-journey); a failed run
  // must not leak the fixture.
  await deleteE2EUserByAuthId(admin, memberB.authId).catch(() => undefined);
});

test('the dashboard offers the Roles card and /admin/roles renders both panes', async ({
  page,
}) => {
  await page.goto('/admin');
  await page.getByTestId('admin-nav-roles').click();
  await expect(page).toHaveURL(/\/admin\/roles$/);
  await expect(page.getByTestId(`template-row-${stewardId}`)).toBeVisible();
  await expect(page.getByTestId(`seeded-badge-${stewardId}`)).toBeVisible();
  await expect(page.getByTestId('catalogue-browser')).toBeVisible();
  await expect(page.getByTestId('as-of')).toBeVisible();
});

test('cloning a seed names both member-visible consequences and the clone joins the list', async ({
  page,
}) => {
  await page.goto(`/admin/roles/${stewardId}`);
  await page.getByTestId('clone-button').click();
  const modal = page.getByTestId('confirm-modal');
  await expect(modal).toContainText('group-creation options');
  await expect(modal).toContainText('without a chosen template');
  await page.getByTestId('clone-name-input').fill(CLONE_NAME);
  await page.getByTestId('confirm-modal-confirm').click();
  await expect(page.getByTestId('ceremony-outcome')).toContainText('Cloned.');

  await page.goto('/admin/roles');
  await expect(page.getByRole('link', { name: CLONE_NAME })).toBeVisible();

  const admin = createAdminClient();
  const { data } = await admin
    .from('role_templates')
    .select('id, is_system')
    .eq('name', CLONE_NAME)
    .single();
  cloneId = data!.id as string;
  expect(data!.is_system).toBe(false);
});

test('a saved draft appears in the history while the live default is unchanged', async ({
  page,
}) => {
  await page.goto(`/admin/roles/${cloneId}`);
  const editor = page.getByTestId('draft-editor');
  await expect(editor).toBeVisible();
  await editor.getByTestId(`grant-toggle-${TOGGLED_PERMISSION}`).uncheck();
  await page.getByTestId('save-draft-button').click();
  await expect(page.getByTestId('confirm-modal')).toContainText(/nothing changes/i);
  await page.getByTestId('confirm-modal-confirm').click();
  // WA-7 (2026-08-05, labelled adaptation — observed red first): the outcome
  // now names the ledger row awaiting Apply instead of the bare "Draft saved."
  await expect(page.getByTestId('ceremony-outcome')).toContainText('Draft saved as v2');
  await expect(page.getByTestId('ceremony-outcome')).toContainText('awaiting Apply');

  await expect(page.getByTestId('version-row-2')).toBeVisible();
  // The live default is still v1 — a draft applies nothing.
  await expect(
    page.getByTestId('version-row-1').getByTestId('default-version-marker'),
  ).toBeVisible();
});

test('Apply shows the diff preview + blast radius, and the default pointer moves', async ({
  page,
}) => {
  await page.goto(`/admin/roles/${cloneId}`);
  await page.getByTestId('apply-version-2').click();
  const modal = page.getByTestId('confirm-modal');
  await expect(modal.getByTestId('diff-removed')).toContainText(TOGGLED_PERMISSION);
  await expect(modal.getByTestId('blast-radius')).toContainText(
    'future groups instantiate the new set',
  );
  await page.getByTestId('confirm-modal-confirm').click();
  await expect(page.getByTestId('ceremony-outcome')).toContainText('Applied.');
  await expect(
    page.getByTestId('version-row-2').getByTestId('default-version-marker'),
  ).toBeVisible();
});

test('a template-less group carries the SYSTEM set only — the clone does not ride (WA-6 pinned live)', async ({
  page,
}) => {
  const res = await page.request.post('/api/groups', { data: { name: GROUP_NAME } });
  expect(res.status()).toBe(201);
  groupId = ((await res.json()) as { id: string }).id;

  const admin = createAdminClient();
  const { data: roles } = await admin
    .from('group_roles')
    .select('name, created_from_role_template_id')
    .eq('group_id', groupId);
  // WA-6 (walk ruling 2026-08-05): flipped from the STORY-2 pin — the clone
  // does NOT ride; what rides is the non-empty system set.
  expect(roles!.some((r) => r.created_from_role_template_id === cloneId)).toBe(false);
  expect(roles!.length).toBeGreaterThan(0);
  const { data: seedTemplates } = await admin
    .from('role_templates')
    .select('id')
    .eq('is_system', true);
  const seedIds = new Set((seedTemplates ?? []).map((t) => t.id));
  expect(roles!.every((r) => seedIds.has(r.created_from_role_template_id as string))).toBe(true);
});

test('rollback is the same ceremony pointed at the older version, diff reversed', async ({
  page,
}) => {
  await page.goto(`/admin/roles/${cloneId}`);
  await page.getByTestId('apply-version-1').click();
  const modal = page.getByTestId('confirm-modal');
  await expect(modal.getByTestId('diff-added')).toContainText(TOGGLED_PERMISSION);
  await page.getByTestId('confirm-modal-confirm').click();
  await expect(page.getByTestId('ceremony-outcome')).toContainText('Applied.');
  await expect(
    page.getByTestId('version-row-1').getByTestId('default-version-marker'),
  ).toBeVisible();
});

test('audit rows carry the diffs and the browser renders the family', async ({ page }) => {
  const admin = createAdminClient();
  const { data: applies } = await admin
    .from('admin_audit_log')
    .select('metadata')
    .eq('action', 'role_template.apply')
    .eq('target', cloneId!);
  expect(applies!.length).toBeGreaterThanOrEqual(2); // apply + rollback
  for (const row of applies!) {
    expect(row.metadata).toHaveProperty('added');
    expect(row.metadata).toHaveProperty('removed');
  }

  await page.goto('/admin/audit');
  await expect(page.getByText('role_template.apply').first()).toBeVisible();
});

test('WA-4: force sign-out reaches the signed-in device within seconds', async ({
  page,
  browser,
}) => {
  const deviceContext = await browser.newContext();
  const devicePage = await loginAs(deviceContext, A_EMAIL);

  await page.goto(`/admin/members/${memberA.userId}`);
  await page.getByRole('button', { name: 'Force sign-out' }).click();
  await page.getByTestId('confirm-modal-confirm').click();

  // The session-guard hint path, not token expiry: the untouched tab lands
  // on /login within seconds.
  await expect(devicePage).toHaveURL(/\/login/, { timeout: 10000 });
  await deviceContext.close();
});

test('WA-3: a consented member hard-deletes end-to-end through the console', async ({ page }) => {
  expect(consentIdB).not.toBeNull(); // the fixture is genuinely consented

  await page.goto(`/admin/members/${memberB.userId}`);
  await page.getByTestId('hard-delete-member').click();
  await page.getByTestId('hard-delete-input').fill(B_NAME);
  await page.getByTestId('hard-delete-confirm').click();

  // WA-5 (2026-08-05, labelled adaptation — observed red first): completion no
  // longer strands on the 404 shape — the ceremony ends on the explicit
  // erased confirmation, member named (W-4 echo), with the way back.
  const erased = page.getByTestId('member-erased-panel');
  await expect(erased).toBeVisible({ timeout: 15000 });
  await expect(erased).toContainText(B_NAME);
  await expect(erased).toContainText(B_EMAIL);
  await expect(erased.getByRole('link', { name: /back to members/i })).toBeVisible();

  const admin = createAdminClient();
  const { data: gone } = await admin
    .from('users')
    .select('id')
    .eq('id', memberB.userId)
    .maybeSingle();
  expect(gone).toBeNull();
  // The consent EVENT survives as proof, subject links anonymised (WA-3).
  const { data: consent } = await admin
    .from('consent_records')
    .select('subject_user_id, subject_group_id')
    .eq('id', consentIdB!)
    .single();
  expect(consent!.subject_user_id).toBeNull();
  expect(consent!.subject_group_id).toBeNull();
});

test('STORY-4 route pin: a seed write refuses with the platform message, verbatim', async ({
  page,
}) => {
  const res = await page.request.post(`/api/admin/roles/${stewardId}/versions`, {
    data: { name: 'Nope', description: null, permission_names: [] },
  });
  expect(res.status()).toBe(409);
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe('Seeded role templates are immutable — clone, then edit the clone');
});

/**
 * FEAT-H045 STORY-1, last criterion — returning to the list after the template's
 * state changed shows it under the correct heading WITHOUT a manual refresh.
 *
 * PREMISE CORRECTION (2026-08-09): the story words this as "retired or unretired
 * *from the detail view*". **The detail view carries no retire affordance** —
 * retire/unretire live on the list, and only the route
 * `/api/admin/roles/[id]/retire` exists. So the criterion's stated trigger is not
 * a user action on today's surface. What the criterion is actually protecting is
 * the no-stale-list guarantee, and that is what is pinned here: the state changes
 * while the admin is on the detail view, driving the same endpoint the detail
 * view would call if it ever grows the button. If that button is added, this
 * criterion should be re-walked as written.
 *
 * TEST-AFTER, labelled honestly: the partition it asserts was implemented
 * before this spec was written (the unit tier carried the red-first work). The
 * repaint-on-return behaviour it pins is pre-existing component behaviour.
 */
test('FEAT-H045 STORY-1: the list repaints on return from the detail view, with no manual refresh', async ({
  page,
}) => {
  /** Robust to templates already retired in the dev catalogue. */
  const retiredCount = async (): Promise<number> => {
    const toggle = page.getByTestId('retired-templates-toggle');
    if ((await toggle.count()) === 0) return 0;
    return Number(/Retired \((\d+)\)/.exec((await toggle.textContent()) ?? '')?.[1] ?? 0);
  };

  await page.goto('/admin/roles');
  await expect(page.getByTestId(`template-row-${cloneId}`)).toBeVisible();
  const before = await retiredCount();

  // Into the detail the way an admin gets there — client-side, from the list.
  await page.getByRole('link', { name: CLONE_NAME }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/roles/${cloneId}$`));

  const res = await page.request.post(`/api/admin/roles/${cloneId}/retire`);
  expect(res.ok()).toBe(true);

  // Back CLIENT-SIDE, never `page.goto` — a full load resets module state and
  // would mask exactly the staleness this criterion exists to catch (J-D).
  await page.goBack();
  await expect(page).toHaveURL(/\/admin\/roles$/);

  // No Refresh is clicked anywhere in this test.
  await expect(page.getByTestId('retired-templates-toggle')).toBeVisible();
  expect(await retiredCount()).toBe(before + 1);
  await expect(page.getByTestId(`template-row-${cloneId}`)).toHaveCount(0);

  await page.getByTestId('retired-templates-toggle').click();
  await expect(page.getByTestId(`template-row-${cloneId}`)).toBeVisible();
  await expect(page.getByTestId(`retired-badge-${cloneId}`)).toBeVisible();

  // Leave the catalogue as we found it.
  expect((await page.request.delete(`/api/admin/roles/${cloneId}/retire`)).ok()).toBe(true);
});

/**
 * FEAT-H045 STORY-2 + STORY-3 / FEAT-PC029 — disposal, end to end.
 *
 * The second cell is the ROUTE-LEVEL PROOF the corrective migration
 * (20260810120000) promised in its header. The integration suite calls the RPC
 * directly and so stayed green while the BFF path was broken: the lib mapped
 * the guard's old 42501 to "not authorised" and returned an existence-hiding
 * 404 with the reason discarded. Only a cell that goes through the ROUTE can
 * catch that, which is precisely why the gap existed.
 */
test('FEAT-H045 STORY-3: a never-offered retired clone is disposed of from inside the fold', async ({
  page,
}) => {
  const name = `${CLONE_NAME} disposable`;
  const admin = createAdminClient();
  expect((await page.request.post(`/api/admin/roles/${stewardId}/clone`, { data: { name } })).ok()).toBe(
    true,
  );
  const { data: made } = await admin.from('role_templates').select('id').eq('name', name).single();
  const id = made!.id as string;

  // Disposal is two deliberate acts — retire first, as the guard requires.
  expect((await page.request.post(`/api/admin/roles/${id}/retire`)).ok()).toBe(true);

  await page.goto('/admin/roles');
  await page.getByTestId('retired-templates-toggle').click();
  await page.getByTestId(`delete-button-${id}`).click();

  const modal = page.getByTestId('confirm-modal');
  await expect(modal).toContainText('cannot be undone');
  await expect(modal).toContainText('never offered to any group');
  await expect(modal).toContainText(name);
  await page.getByTestId('confirm-modal-confirm').click();

  await expect(page.getByTestId(`template-row-${id}`)).toHaveCount(0);
  const { data: after } = await admin.from('role_templates').select('id').eq('id', id).maybeSingle();
  expect(after).toBeNull();
});

test('FEAT-H045 STORY-2: an offered-then-withdrawn template refuses VERBATIM, not as Not found', async ({
  page,
}) => {
  const name = `${CLONE_NAME} offered`;
  const admin = createAdminClient();
  expect((await page.request.post(`/api/admin/roles/${stewardId}/clone`, { data: { name } })).ok()).toBe(
    true,
  );
  const { data: made } = await admin.from('role_templates').select('id').eq('name', name).single();
  const id = made!.id as string;

  // Offer it to ONE group, then withdraw the offer. Publishing platform-wide
  // would emit hundreds of notices for no extra coverage.
  const { data: group } = await admin
    .from('groups')
    .select('id')
    .neq('group_type', 'personal')
    .eq('status', 'active')
    .limit(1)
    .single();
  expect(
    (
      await page.request.post(`/api/admin/roles/${id}/publish`, {
        data: { group_ids: [group!.id] },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.delete(`/api/admin/roles/${id}/publish`, {
        data: { group_ids: [group!.id] },
      })
    ).ok(),
  ).toBe(true);
  expect((await page.request.post(`/api/admin/roles/${id}/retire`)).ok()).toBe(true);

  // The publication row is gone; the audit trail remembers. THE guard case.
  const res = await page.request.delete(`/api/admin/roles/${id}`);
  expect(res.status()).toBe(409); // NOT 404 — that was the defect
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe('this role template was offered to groups and cannot be deleted');

  // and nothing was deleted
  const { data: after } = await admin.from('role_templates').select('id').eq('id', id).maybeSingle();
  expect(after).not.toBeNull();

  await admin.from('role_templates').delete().eq('id', id);
});

/**
 * TASK-RDC-03 (route tier). Both cells below are RED before the corrective.
 *
 * A business refusal is not an authorization failure. Both siblings raised
 * 42501 for theirs, and `call()` in lib/admin/roles.ts collapses EVERY 42501
 * into `refused` — so the routes' own `42501 -> 403` branch never runs, and
 * the refusal leaves as the existence-hiding 404 shape. The admin was told
 * "Not found" about a template plainly visible in the list they were reading.
 *
 * The integration tier could not catch this: it calls the RPC directly and
 * sees the raise. Only the route tier crosses `call()`. Same missing-tier
 * lesson as PC029's delete guard, in the two functions that guard did not
 * touch.
 */
test('retiring a system template refuses in its own words, not as Not found', async ({ page }) => {
  const res = await page.request.post(`/api/admin/roles/${stewardId}/retire`);
  expect(res.status()).toBe(409); // NOT 404 — that was the defect
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe('a system role template cannot be retired');

  // and the floor every group is built on is untouched
  const admin = createAdminClient();
  const { data: after } = await admin
    .from('role_templates')
    .select('retired_at')
    .eq('id', stewardId)
    .single();
  expect(after!.retired_at).toBeNull();
});

test('publishing a retired template refuses in its own words, not as Not found', async ({
  page,
}) => {
  const admin = createAdminClient();
  const name = `E2ERDC03Retired${stamp}`;
  expect(
    (await page.request.post(`/api/admin/roles/${stewardId}/clone`, { data: { name } })).ok(),
  ).toBe(true);
  const { data: made } = await admin.from('role_templates').select('id').eq('name', name).single();
  const id = made!.id as string;

  expect((await page.request.post(`/api/admin/roles/${id}/retire`)).ok()).toBe(true);

  const { data: group } = await admin
    .from('groups')
    .select('id')
    .neq('group_type', 'personal')
    .eq('status', 'active')
    .limit(1)
    .single();

  const res = await page.request.post(`/api/admin/roles/${id}/publish`, {
    data: { group_ids: [group!.id] },
  });
  expect(res.status()).toBe(409); // NOT 404 — that was the defect
  const body = (await res.json()) as { error: string };
  expect(body.error).toBe('a retired role template cannot be published');

  // the catalogue offered nothing
  const { count } = await admin
    .from('role_template_publications')
    .select('*', { count: 'exact', head: true })
    .eq('role_template_id', id);
  expect(count).toBe(0);

  await admin.from('role_templates').delete().eq('id', id);
});

test('a demoted operator gets the 404 shape on the new routes', async ({ page }) => {
  await setPlatformAdmin(false);

  const res = await page.request.post(`/api/admin/roles/${stewardId}/clone`, {
    data: { name: 'NopeToo' },
  });
  expect(res.status()).toBe(404);

  await page.goto('/admin/roles');
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  await page.goto(`/admin/roles/${stewardId}`);
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
});
