import { test, expect } from '@playwright/test';
import { createAdminClient, SESSION_EMAIL, runAdminSql } from './helpers/auth';

/**
 * FEAT-H034 — the /admin dashboard (ADM-1) + the durable audit wiring, E2E.
 *
 * Serial: the tests flip the shared session FIM's platform-admin elevation
 * (the house manage_all_groups elevation) and order matters — admin renders
 * first, then the demoted 404 shape. afterAll restores the demoted state and
 * purges fixture audit rows.
 */

test.describe.configure({ mode: 'serial' });

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

test.describe('FEAT-H034 — admin dashboard & durable audit', () => {
  test.beforeAll(async () => {
    await setPlatformAdmin(true);
  });

  test.afterAll(async () => {
    await setPlatformAdmin(false);
    const pg = await sessionPersonalGroupId();
    await runAdminSql(
      `DELETE FROM public.admin_audit_log
        WHERE action = 'auth.sign_in' AND actor_group_id = '${pg}'
          AND created_at > now() - interval '30 minutes';`,
    ).catch(() => undefined);
  });

  test('a platform admin sees the dashboard render live numbers', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Platform dashboard' })).toBeVisible();
    await expect(page.getByText('Members')).toBeVisible();
    await expect(page.getByText('Groups')).toBeVisible();
    await expect(page.getByText('Journeys')).toBeVisible();
    await expect(page.getByText(/as of/i)).toBeVisible();
    await expect(page.getByRole('table', { name: /activity/i })).toBeVisible();
    // Live numbers, not an empty-zero dashboard: the session FIM itself counts.
    const membersTile = page.getByRole('region', { name: 'Members' });
    await expect(membersTile).not.toContainText('Members 0 total');
  });

  test('a sign-in persists its durable audit row end-to-end (BFF -> record_auth_event -> row)', async ({
    page,
  }) => {
    await page.goto('/');
    const res = await page.request.post('/api/auth/audit');
    expect(res.ok()).toBeTruthy();

    // Read back via the service client — the E2E runAdminSql is execute-only
    // (Promise<void>, management-API runner), it cannot return SELECT rows.
    const pg = await sessionPersonalGroupId();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('admin_audit_log')
      .select('id, target, created_at')
      .eq('action', 'auth.sign_in')
      .eq('actor_group_id', pg)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());
    expect(error).toBeNull();
    expect(data ?? []).not.toHaveLength(0);
    expect((data ?? [])[0]?.target).toBe('self');
  });

  test('a demoted member gets the 404 shape — no admin chrome, no forbidden signal', async ({
    page,
  }) => {
    await setPlatformAdmin(false);
    await page.goto('/admin');
    await expect(page.getByText(/could not be found/i)).toBeVisible();
    await expect(page.getByText('Platform dashboard')).toHaveCount(0);
    await expect(page.getByText(/forbidden|not authorized/i)).toHaveCount(0);
  });
});
