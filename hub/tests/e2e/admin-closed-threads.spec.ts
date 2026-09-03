import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  createAdminClient,
  cleanupE2EGroup,
  countDeusExE2ELeaks,
  deleteE2EUser,
  markArrivedOnce,
  runAdminSql,
  runAdminSqlRows,
  SESSION_EMAIL,
} from './helpers/auth';

/**
 * TASK-SEAL-01, Hub half (E2E) — sealed-thread sight on the admin plane.
 *
 * AB-6 ruling B1 (re-scoped to `closed` at the DoR walk, since `sealed_at`
 * has one writer and it fires only while a group closes): an admin opening a
 * CLOSED engagement group on /admin/groups/[id] sees its group-kind threads,
 * sealed ones INCLUDED and LABELLED — never presented as live. Bullying
 * evidence lands exactly there when the author departs.
 *
 * The fixture is the platform suite's own recipe (`sealed-thread-admin-
 * sight.test.ts`): a steward FIM creates the group and a thread through the
 * real doors; the seal is written by the REAL sealer and the status set to
 * closed in one statement. The shared session user is elevated to platform
 * admin for the walk and demoted after (symmetric with global-setup's
 * baseline — the E2E-03 audit's out-of-class rule).
 *
 * Red at head: /admin/groups/[id] renders a closed group with no thread
 * section at all — the H041 wing mounts for suspended groups only.
 *
 * TASK-SEAL-02 (2026-09-03, the rider): the sealed row gains exactly ONE
 * affordance — Open — leading to a read-only thread view (the sealed label,
 * the evidence body, no composer) over the audited platform door. SEAL-01's
 * "never a door" assertion is adapted below, labelled.
 */

const stamp = Date.now();
const password = 'e2e-test-password-123';
const stew = { email: `e2e-seal-stew-${stamp}@fringeisland.test`, name: `E2ESealStew${stamp}` };

async function setPlatformAdmin(elevate: boolean): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('email', SESSION_EMAIL)
    .maybeSingle();
  const pg = data?.personal_group_id as string;
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

async function waitForPersonalGroup(authUserId: string): Promise<void> {
  const admin = createAdminClient();
  for (let i = 0; i < 20; i++) {
    const { data } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (data?.personal_group_id) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`personal group never materialised for ${authUserId}`);
}

async function contractClient(email: string): Promise<SupabaseClient> {
  const c = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`contract sign-in ${email}: ${error.message}`);
  return c;
}

const rpcOk = async (c: SupabaseClient, fn: string, args: Record<string, unknown>) => {
  const { data, error } = await c.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as never;
};

test.describe('TASK-SEAL-01 — sealed-thread sight on a closed group', () => {
  let groupId: string | null = null;
  let conversationId: string | null = null;
  let leaksBefore = 0;

  test.beforeAll(async () => {
    const admin = createAdminClient();
    leaksBefore = await countDeusExE2ELeaks(admin);
    await setPlatformAdmin(true);

    const { data, error } = await admin.auth.admin.createUser({
      email: stew.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: stew.name, consent_accepted: 'true' },
    });
    if (error) throw error;
    await markArrivedOnce(admin, data.user.id);
    await waitForPersonalGroup(data.user.id);

    const c = await contractClient(stew.email);
    groupId = (await rpcOk(c, 'create_engagement_group', {
      p_name: `E2E SEAL Closed Cohort ${stamp}`,
    })) as string;
    const created = (await rpcOk(c, 'create_group_conversation', {
      p_group_id: groupId,
      p_title: 'SEAL evidence thread',
    })) as string | { id?: string };
    conversationId = typeof created === 'string' ? created : (created.id as string);
    // TASK-SEAL-02: the evidence itself — a message body the admin will read.
    await rpcOk(c, 'send_message', {
      p_conversation_id: conversationId,
      p_content: 'SEAL evidence message body',
    });
    // The REAL sealer, then the real status — the platform suite's fixture recipe.
    await runAdminSql(`
      DO $$ BEGIN
        PERFORM public.ds5_lifecycle_group_closed('${groupId}', 'group_closed');
        UPDATE public.groups SET status = 'closed' WHERE id = '${groupId}';
      END $$;`);
  });

  test.afterAll(async () => {
    const admin = createAdminClient();
    if (groupId) await cleanupE2EGroup(groupId).catch(() => undefined);
    await deleteE2EUser(admin, stew.email);
    await setPlatformAdmin(false);
    expect(await countDeusExE2ELeaks(admin)).toBe(leaksBefore); // 0→0
  });

  test('an admin opening the closed group sees its preserved threads, the sealed one labelled and never live', async ({
    page,
  }) => {
    await page.goto(`/admin/groups/${groupId}`);
    await expect(page.getByTestId('status-badge')).toContainText('closed', { timeout: 20000 });

    const section = page.getByTestId('closed-threads-section');
    await expect(section).toBeVisible({ timeout: 20000 });
    await expect(section.getByRole('heading', { name: /preserved threads/i })).toBeVisible();

    const row = section.getByTestId('closed-thread-row').filter({ hasText: 'SEAL evidence thread' });
    await expect(row).toHaveCount(1);
    await expect(row.getByTestId('sealed-badge')).toHaveText(/sealed/i);
    // TASK-SEAL-02 (labelled adaptation of SEAL-01's "never a door"): the sealed
    // row now carries exactly ONE affordance — Open — and still no link, no live chrome.
    await expect(row.getByRole('link')).toHaveCount(0);
    await expect(row.getByRole('button')).toHaveCount(1);
    await row.getByTestId(`open-closed-thread-${conversationId}`).click();

    // The read-only thread view: the sealed label, the evidence, no composer.
    const view = section.getByTestId('closed-thread-view');
    await expect(view).toBeVisible({ timeout: 20000 });
    await expect(view.getByTestId('sealed-thread-label')).toContainText(/sealed/i);
    await expect(view.getByTestId('sealed-thread-label')).toContainText(/nothing here is live/i);
    await expect(view.getByText('SEAL evidence message body')).toBeVisible();
    await expect(view.getByRole('textbox')).toHaveCount(0);
    await expect(view.getByRole('button', { name: /send|reply|react|join|leave/i })).toHaveCount(0);

    // Bound 4: the read left an audit row (ids only) — the platform wrote it, not the Hub.
    const audit = await runAdminSqlRows(
      `SELECT action, target FROM public.admin_audit_log
        WHERE action = 'sealed_thread.read' AND target = '${conversationId}';`,
    );
    expect(audit.length).toBeGreaterThanOrEqual(1);

    // Back returns to the list; the row is still there, still one door.
    await section.getByTestId('closed-thread-back').click();
    await expect(
      section.getByTestId('closed-thread-row').filter({ hasText: 'SEAL evidence thread' }),
    ).toHaveCount(1);
  });
});
