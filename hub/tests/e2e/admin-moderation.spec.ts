import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  createAdminClient,
  markArrivedOnce,
  runAdminSql,
  E2E_PASSWORD,  deleteE2EUserByAuthId,
} from './helpers/auth';

/**
 * FEAT-H037 (E2E) — Cycle ADM-D: the moderation + audit journey (STORY-7).
 * Dashboard cards → queue → detail → resolve (actioned, with note) → the
 * reporter's closure landed platform-side → the audit browser shows the
 * moderation row under its chip → the demoted operator gets the 404 shape
 * on all three routes.
 *
 * Coverage label (honest): this journey spec was written AFTER the surface
 * implementation — the red-first demonstrations live at the unit tier (the
 * three admin component suites + the dashboard cells, red 2026-08-02
 * pre-implementation) and at the platform tier (the PC022 gate suite, red
 * pre-migration). Integrative journey coverage, labelled test-after by the
 * house rule (the ADM-B precedent).
 *
 * Serial: the tests share one report fixture whose state advances (open →
 * resolved), and the last test demotes the shared session FIM. The report
 * fixture is arranged through the REAL platform doors (create_engagement_group,
 * create_forum_post, submit_content_report as the fixture FIMs); locators are
 * row-scoped by fixture id — the dev DB legitimately holds other reports.
 */

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const fims = {
  author: { email: `e2e-admd-auth-${stamp}@fringeisland.test`, name: `E2EADMDAuth${stamp}` },
  reporter: { email: `e2e-admd-rep-${stamp}@fringeisland.test`, name: `E2EADMDRep${stamp}` },
} as const;

type Fim = { authId: string; pgId: string; userId: string };

const SESSION_EMAIL = 'e2e-session@fringeisland.test';

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
    password: E2E_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName, consent_accepted: 'true' },
  });
  if (error) throw error;
  await markArrivedOnce(admin, data.user.id);
  const { pgId, userId } = await waitForUserRow(data.user.id);
  return { authId: data.user.id, pgId, userId };
}

async function clientAs(email: string): Promise<SupabaseClient> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await client.auth.signInWithPassword({ email, password: E2E_PASSWORD });
  if (error) throw new Error(`clientAs(${email}): ${error.message}`);
  return client;
}

test.describe('FEAT-H037 — moderation + audit view (ADM-10/11/16)', () => {
  let author: Fim;
  let reporter: Fim;
  let groupId: string;
  let reportId: string;
  const snapshotText = `E2E ADMD reported words ${stamp}`;

  test.beforeAll(async () => {
    test.setTimeout(180_000);
    await setPlatformAdmin(true);
    author = await createFim(fims.author.email, fims.author.name);
    reporter = await createFim(fims.reporter.email, fims.reporter.name);

    // The real platform doors: author founds the group and posts; reporter
    // joins (membership + Member-template role) and files the report.
    const ca = await clientAs(fims.author.email);
    const { data: gid, error: gErr } = await ca.rpc('create_engagement_group', {
      p_name: `E2EADMDFix${stamp}`,
    });
    if (gErr) throw new Error(`fixture group: ${gErr.message}`);
    groupId = gid as string;

    const admin = createAdminClient();
    const { error: mErr } = await admin.from('group_memberships').insert({
      group_id: groupId,
      member_group_id: reporter.pgId,
      status: 'active',
      added_by_group_id: author.pgId,
    });
    if (mErr) throw new Error(`fixture membership: ${mErr.message}`);
    await runAdminSql(`
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${reporter.pgId}', '${groupId}', gr.id, '${author.pgId}'
      FROM public.group_roles gr
      WHERE gr.group_id = '${groupId}' AND gr.name = 'Member Role Template';`);

    const { data: post, error: pErr } = await ca.rpc('create_forum_post', {
      p_group_id: groupId,
      p_content: snapshotText,
    });
    if (pErr) throw new Error(`fixture post: ${pErr.message}`);

    const cr = await clientAs(fims.reporter.email);
    const { data: report, error: rErr } = await cr.rpc('submit_content_report', {
      p_target_kind: 'forum_post',
      p_target_id: (post as { id: string }).id,
      p_reason: `E2E ADMD reason ${stamp}`,
      p_details: null,
    });
    if (rErr) throw new Error(`fixture report: ${rErr.message}`);
    reportId = (report as { id: string }).id;
  });

  test.afterAll(async () => {
    await setPlatformAdmin(false);
    const admin = createAdminClient();
    await runAdminSql(
      `DELETE FROM public.notifications WHERE recipient_group_id = '${reporter.pgId}';`,
    ).catch(() => undefined);
    await runAdminSql(
      `DELETE FROM public.content_reports WHERE id = '${reportId}';`,
    ).catch(() => undefined);
    await admin.from('forum_posts').delete().eq('group_id', groupId);
    await admin.from('groups').delete().eq('id', groupId);
    for (const u of [author, reporter]) {
      if (u?.pgId) await admin.from('groups').delete().eq('id', u.pgId);
      if (u?.authId) await deleteE2EUserByAuthId(admin, u.authId);
    }
  });

  test('the dashboard offers the Moderation card (with the open count) and the Audit card', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto('/admin');
    const moderation = page.getByTestId('admin-nav-moderation');
    await expect(moderation).toBeVisible({ timeout: 15000 });
    await expect(moderation).toHaveAttribute('href', '/admin/moderation');
    // Our fixture report is open — the badge exists and is at least 1.
    await expect(page.getByTestId('admin-nav-moderation-count')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('admin-nav-audit')).toHaveAttribute('href', '/admin/audit');
  });

  test('the queue renders the fixture report and links into detail', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/admin/moderation');
    const row = page.getByTestId(`admin-report-row-${reportId}`);
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toContainText(fims.reporter.name);
    await expect(row).toContainText(snapshotText);
    await row.getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`/admin/moderation/${reportId}`));
  });

  test('detail shows the record and the resolve ceremony completes with repaint', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto(`/admin/moderation/${reportId}`);
    await expect(page.getByText(snapshotText)).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('report-author-link')).toHaveAttribute(
      'href',
      `/admin/members/${author.userId}`,
    );
    const panel = page.getByTestId('resolve-panel');
    await expect(panel).toContainText(/the reporter will be told the outcome/i);
    await expect(page.getByRole('button', { name: /resolve report/i })).toBeDisabled();
    await page.getByRole('radio', { name: /actioned/i }).check();
    await page.getByRole('textbox', { name: /note/i }).fill(`E2E note ${stamp}`);
    await page.getByRole('button', { name: /resolve report/i }).click();
    // The fresh-read repaint: provenance in, panel out.
    await expect(page.getByTestId('report-provenance')).toContainText('actioned', {
      timeout: 15000,
    });
    await expect(page.getByTestId('resolve-panel')).toHaveCount(0);
  });

  test('the closure landed for the reporter — registered kind, content-free payload', async () => {
    const admin = createAdminClient();
    const { data } = await admin
      .from('notifications')
      .select('type, payload')
      .eq('recipient_group_id', reporter.pgId)
      .eq('type', 'report_resolved');
    expect(data ?? []).toHaveLength(1);
    const payload = (data![0] as { payload: Record<string, unknown> }).payload;
    expect(payload.report_id).toBe(reportId);
    expect(payload.resolution_kind).toBe('actioned');
    expect('resolution_note' in payload).toBe(false);
  });

  test('the audit browser shows the moderation row under its chip', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/admin/audit');
    await expect(page.getByRole('tab', { name: 'moderation.' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: 'moderation.' }).click();
    // Row-scoped: the row whose target is our report id.
    await expect(page.getByText(reportId).first()).toBeVisible({ timeout: 15000 });
  });

  test('a demoted operator gets the 404 shape on all three routes', async ({ page }) => {
    test.setTimeout(120_000);
    await setPlatformAdmin(false);
    for (const path of ['/admin/moderation', `/admin/moderation/${reportId}`, '/admin/audit']) {
      await page.goto(path);
      await expect(page.getByText(/could not be found/i)).toBeVisible({ timeout: 15000 });
    }
  });
});
