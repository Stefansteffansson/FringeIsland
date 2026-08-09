import { test, expect } from '@playwright/test';
import { createAdminClient, markArrivedOnce, runAdminSql, SESSION_EMAIL, deleteE2EUserByAuthId } from './helpers/auth';

/**
 * FEAT-H039 (E2E) — Cycle ADM-E: the bounded-list + bulk journey (STORY-7).
 * Server search finds the fixtures → page-scoped selection → bulk suspend
 * with one DESIGNED refusal (partial success rendered per row, verbatim) →
 * bulk reactivate → bulk force sign-out → per-member audit rows verified in
 * the substrate.
 *
 * Coverage label (honest): written AFTER the surface implementation — the
 * red-first demonstrations live at the unit tier (admin-members-list rework,
 * users-page-and-bulk, red 2026-08-03 pre-implementation) and at the platform
 * tier (the PC024 gate suite, red pre-migration). Integrative journey
 * coverage, labelled test-after by the house rule. The non-admin 404 shape on
 * admin surfaces is the H036 journey's demotion test; the bulk routes share
 * the same existence-hiding map, pinned at the unit tier.
 *
 * Serial: the fixtures' account state advances test to test. No sign-out ever
 * happens on the shared session (the TASK-E2E-01 trap class — this journey
 * force-logs-out FIXTURES only, never the session FIM). No groups needed.
 */

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const password = 'e2e-test-password-123';
const A_NAME = `E2EADMEBulkA${stamp}`;
const B_NAME = `E2EADMEBulkB${stamp}`;
const A_EMAIL = `e2e-adme-bulk-a-${stamp}@fringeisland.test`;
const B_EMAIL = `e2e-adme-bulk-b-${stamp}@fringeisland.test`;

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

// The E2E runAdminSql discards result rows (management-API helper, void) —
// audit assertions read through the service-role client instead.
async function auditCount(action: string, target: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from('admin_audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('action', action)
    .eq('target', target);
  return count ?? 0;
}

test.describe('FEAT-H039 — bulk member actions on the bounded list (ADM-7)', () => {
  let a: Fim, b: Fim;

  test.beforeAll(async () => {
    await setPlatformAdmin(true);
    [a, b] = await Promise.all([createFim(A_EMAIL, A_NAME), createFim(B_EMAIL, B_NAME)]);
    // The designed-refusal fixture: B is already suspended when bulk suspend
    // runs (E2E state arrangement; the producer path is unit/integration-pinned).
    await runAdminSql(
      `UPDATE public.users SET is_active = false, deactivation_origin = 'admin'
        WHERE id = '${b.userId}';`,
    );
  });

  test.afterAll(async () => {
    await setPlatformAdmin(false);
    const admin = createAdminClient();
    for (const u of [a, b]) {
      if (u?.pgId) await admin.from('groups').delete().eq('id', u.pgId);
      if (u?.authId) await deleteE2EUserByAuthId(admin, u.authId).catch(() => undefined);
    }
    const pg = await sessionPersonalGroupId();
    await runAdminSql(
      `DELETE FROM public.admin_audit_log
        WHERE action LIKE 'member.%'
          AND actor_group_id = '${pg}'
          AND created_at > now() - interval '30 minutes';`,
    ).catch(() => undefined);
  });

  const searchFixtures = async (page: import('@playwright/test').Page) => {
    await page.goto('/admin/members');
    await page.getByRole('searchbox', { name: /search/i }).fill(String(stamp));
    await expect(page.getByTestId(`admin-member-row-${a.userId}`)).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId(`admin-member-row-${b.userId}`)).toBeVisible();
  };

  test('the bounded list: server search isolates the fixtures; As-of and the pager render', async ({
    page,
  }) => {
    await searchFixtures(page);
    await expect(page.getByTestId('as-of')).toBeVisible();
    await expect(page.getByTestId('pager-prev')).toBeDisabled();
    await expect(page.getByTestId('pager-next')).toBeDisabled(); // two matches — one page
    await expect(page.getByTestId(`admin-member-row-${b.userId}`)).toContainText('suspended');
  });

  test('bulk suspend with a designed refusal: partial success reported per member, verbatim; audit per member', async ({
    page,
  }) => {
    await searchFixtures(page);
    await page.getByRole('checkbox', { name: `Select ${A_NAME}` }).check();
    await page.getByRole('checkbox', { name: `Select ${B_NAME}` }).check();
    await expect(page.getByTestId('selection-count')).toHaveText('2 selected');
    await page.getByTestId('bulk-suspend').click();
    const modal = page.getByTestId('confirm-modal');
    await expect(modal).toContainText(A_EMAIL);
    await expect(modal).toContainText(B_EMAIL);
    await page.getByTestId('confirm-modal-confirm').click();

    const outcomes = page.getByTestId('bulk-outcomes');
    await expect(outcomes).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId(`bulk-outcome-${a.userId}`)).toContainText('done');
    await expect(page.getByTestId(`bulk-outcome-${b.userId}`)).toContainText(
      'User is already in the requested state',
    );
    // The repainted list shows A newly suspended; selection cleared.
    await expect(page.getByTestId(`admin-member-row-${a.userId}`)).toContainText('suspended', {
      timeout: 15000,
    });
    await expect(page.getByTestId('selection-count')).toHaveCount(0);
    // Per-member audit: one member.suspend row for A; none for the refused B.
    expect(await auditCount('member.suspend', a.userId)).toBe(1);
    expect(await auditCount('member.suspend', b.userId)).toBe(0);
  });

  test('bulk reactivate restores the pair', async ({ page }) => {
    await searchFixtures(page);
    await page.getByRole('checkbox', { name: 'Select page' }).check();
    await page.getByTestId('bulk-reactivate').click();
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByTestId(`bulk-outcome-${a.userId}`)).toContainText('done', {
      timeout: 15000,
    });
    await expect(page.getByTestId(`bulk-outcome-${b.userId}`)).toContainText('done');
    await expect(page.getByTestId(`admin-member-row-${a.userId}`)).not.toContainText('suspended', {
      timeout: 15000,
    });
  });

  test('bulk force sign-out reports per member with per-member audit rows', async ({ page }) => {
    await searchFixtures(page);
    await page.getByRole('checkbox', { name: 'Select page' }).check();
    await page.getByTestId('bulk-force-logout').click();
    await page.getByTestId('confirm-modal-confirm').click();
    await expect(page.getByTestId(`bulk-outcome-${a.userId}`)).toContainText('done', {
      timeout: 15000,
    });
    await expect(page.getByTestId(`bulk-outcome-${b.userId}`)).toContainText('done');
    // Per-member rows by construction: one array-contract call per member, so
    // each row's metadata carries exactly that member's id.
    const admin = createAdminClient();
    for (const u of [a, b]) {
      const { count } = await admin
        .from('admin_audit_log')
        .select('id', { count: 'exact', head: true })
        .eq('action', 'member.force_logout')
        .contains('metadata', { target_user_ids: [u.userId] });
      expect(count).toBe(1);
    }
  });
});
