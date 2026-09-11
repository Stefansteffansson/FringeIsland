import { test, expect } from '@playwright/test';
import {
  createAdminClient,
  markArrivedOnce,
  runAdminSql,
  runAdminSqlRows,
  E2E_PASSWORD,
  SESSION_EMAIL,
  deleteE2EUserByAuthId,
} from './helpers/auth';

/**
 * FEAT-H050 (E2E) — the member email rectification journey (ADM-19).
 * Member console → the address carries a control → the ceremony names its
 * consequences → confirm → the confirmation reports the contract's real
 * counts → the header shows the new address → the audit browser shows the
 * `member.email_change` row.
 *
 * Coverage label (honest): this journey spec was written AFTER the surface
 * implementation. The red-first demonstrations live at the unit tier (three
 * suites, 25 cells, red 2026-09-11 pre-implementation) and at the platform
 * tier (the PC031 gate suite, 11 cells, red pre-migration). Integrative
 * journey coverage, labelled test-after by the house rule (the ADM-B
 * precedent).
 *
 * Serial: the tests share one fixture member whose address advances, and the
 * last test demotes the shared session FIM.
 *
 * Small-population note (ADR-U053): the test project holds a handful of
 * accounts, so every locator here is scoped by the fixture's own id — never
 * by position in a list.
 */

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
// Single-token display name: surfaces render the nickname as the first token.
const FIXTURE = {
  email: `e2e-eml-${stamp}@fringeisland.test`,
  next: `e2e-eml-${stamp}-rectified@fringeisland.test`,
  name: `E2EEml${stamp}`,
} as const;

type Fim = { authId: string; pgId: string; userId: string };
let member: Fim;

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

test.beforeAll(async () => {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: FIXTURE.email,
    password: E2E_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: FIXTURE.name, consent_accepted: 'true' },
  });
  if (error) throw error;
  await markArrivedOnce(admin, data.user.id);
  const { pgId, userId } = await waitForUserRow(data.user.id);
  member = { authId: data.user.id, pgId, userId };
  await setPlatformAdmin(true);
});

test.afterAll(async () => {
  await setPlatformAdmin(false);
  // No leftover test accounts (the hard rule): delete through the chain and
  // fail loudly if the fixture survives.
  await deleteE2EUserByAuthId(createAdminClient(), member.authId);
  const rows = await runAdminSqlRows(
    `SELECT count(*)::int AS n FROM public.users WHERE id = '${member.userId}';`,
  );
  expect(Number(rows[0]?.n ?? -1)).toBe(0);
});

test.describe('FEAT-H050 — email rectification on the member console (ADM-19)', () => {
  test('the address carries a control, and the ceremony names its consequences', async ({ page }) => {
    await page.goto(`/admin/members/${member.userId}`);
    await expect(page.getByText(FIXTURE.email)).toBeVisible();

    const control = page.getByTestId('rectify-email');
    await expect(control).toBeVisible();
    await control.click();

    const modal = page.getByTestId('confirm-modal');
    await expect(modal).toBeVisible();
    // The three consequences, stated before the click.
    await expect(modal).toContainText(/sessions will end/i);
    await expect(modal).toContainText(/invitations/i);
    await expect(modal).toContainText(/no email is sent/i);
    // Both addresses readable against each other at the moment of confirming.
    await expect(modal).toContainText(FIXTURE.email);

    // Confirm is gated until both the address and the reason are present.
    await expect(page.getByTestId('confirm-modal-confirm')).toBeDisabled();
    await page.getByTestId('rectify-email-input').fill(FIXTURE.next);
    await expect(page.getByTestId('confirm-modal-confirm')).toBeDisabled();
    await page.getByTestId('ceremony-reason').fill('E2E: member lost the old mailbox');
    await expect(page.getByTestId('confirm-modal-confirm')).toBeEnabled();
  });

  test('a collision is refused in place, with the typed address kept', async ({ page }) => {
    await page.goto(`/admin/members/${member.userId}`);
    await page.getByTestId('rectify-email').click();
    // The shared session FIM's own address is certainly taken.
    await page.getByTestId('rectify-email-input').fill(SESSION_EMAIL);
    await page.getByTestId('ceremony-reason').fill('E2E: collision probe');
    await page.getByTestId('confirm-modal-confirm').click();

    await expect(page.getByTestId('ceremony-error')).toContainText(/already in use/i);
    // The ceremony stays open and the address survives the refusal.
    await expect(page.getByTestId('confirm-modal')).toBeVisible();
    await expect(page.getByTestId('rectify-email-input')).toHaveValue(SESSION_EMAIL);
  });

  test('the rectification lands, reports real counts, and reaches the audit log', async ({ page }) => {
    await page.goto(`/admin/members/${member.userId}`);
    await page.getByTestId('rectify-email').click();
    await page.getByTestId('rectify-email-input').fill(FIXTURE.next);
    await page.getByTestId('ceremony-reason').fill('E2E: member lost the old mailbox');
    await page.getByTestId('confirm-modal-confirm').click();

    // The observable effect, not just the interaction.
    const success = page.getByTestId('action-success');
    await expect(success).toBeVisible();
    await expect(success).toContainText(FIXTURE.email);
    await expect(success).toContainText(FIXTURE.next);
    // Zero is reported honestly — this fixture never signed in.
    await expect(success).toContainText(/no sessions were active/i);

    // The header now shows the new address.
    await expect(page.getByText(FIXTURE.next)).toBeVisible();

    // The platform actually moved: the mirror, and the audit row.
    const rows = await runAdminSqlRows(
      `SELECT email FROM public.users WHERE id = '${member.userId}';`,
    );
    expect(String(rows[0]?.email)).toBe(FIXTURE.next);

    await page.goto('/admin/audit');
    await expect(page.getByText('member.email_change').first()).toBeVisible();
  });

  test('a demoted operator gets the 404 shape on the member console', async ({ page }) => {
    await setPlatformAdmin(false);
    await page.goto(`/admin/members/${member.userId}`);
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByTestId('rectify-email')).toHaveCount(0);
  });
});
