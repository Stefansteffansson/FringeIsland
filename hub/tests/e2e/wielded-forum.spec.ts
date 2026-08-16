import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  createAdminClient,
  deleteE2EUser,
  runAdminSql,
  SESSION_EMAIL,
} from './helpers/auth';

/**
 * FEAT-H046 (TASK-H046-1) — the wielded forum journey, end to end.
 *
 * The session FIM wields engagement group A (holds `act_as_group` there) but
 * is NOT a member of community B; A is an active member of B with the Member
 * instance (view/post/reply). The journey: open B's page → select the hat →
 * the forum renders with the substitution banner → post as the group through
 * the per-act confirm → the thread renders attributed to A with the Group
 * badge (the observable effect, never just the click).
 *
 * STORY-4's delivery loop is deliberately NOT asserted here: its links are
 * individually proven (PD020 expansion integration-tested; the bell's hint
 * event at N-C; revalidateHat + the page listener at the unit tier). The
 * server-side refusal floor for stale hats is PD019's integration suite.
 */

const RUN = Date.now();
const STEWARD_EMAIL = `e2e-h046-steward-${RUN}@fringeisland.test`;
const GROUP_B = `H046 Harbour ${RUN}`;
const GROUP_A = `H046Reps${RUN}`;
const WIELDED_THREAD = `Spoken for the group ${RUN}`;

test.describe('FEAT-H046 — posting as the group (wielded forum)', () => {
  let groupAId: string | null = null;
  let groupBId: string | null = null;

  test.beforeAll(async () => {
    const admin = createAdminClient();

    // A fixture steward creates both groups through the real contract (role
    // instantiation rides create_engagement_group; no data-level replicas).
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: STEWARD_EMAIL,
      password: 'e2e-test-password-123',
      email_confirm: true,
      user_metadata: { display_name: `H046Stw${RUN}`, consent_accepted: 'true' },
    });
    if (createErr) throw new Error(`steward fixture: ${createErr.message}`);

    const steward = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { error: signInErr } = await steward.auth.signInWithPassword({
      email: STEWARD_EMAIL,
      password: 'e2e-test-password-123',
    });
    if (signInErr) throw new Error(`steward sign-in: ${signInErr.message}`);

    const { data: bId, error: bErr } = await steward.rpc('create_engagement_group', {
      p_name: GROUP_B,
    });
    if (bErr) throw new Error(`seed B: ${bErr.message}`);
    groupBId = bId as string;
    const { data: aId, error: aErr } = await steward.rpc('create_engagement_group', {
      p_name: GROUP_A,
    });
    if (aErr) throw new Error(`seed A: ${aErr.message}`);
    groupAId = aId as string;
    await steward.auth.signOut();

    // B is public so the non-member wielder can stand on its page (the walk's
    // exact posture: the representative visits, the hat is the only door).
    await runAdminSql(`
      UPDATE public.groups SET is_public = true WHERE id = '${groupBId}';`);

    // A joins B via the invited→active two-step — the auto-role edge binds
    // the Member instance (view_forum / post_forum_messages / reply).
    const { data: stewardRow } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('email', STEWARD_EMAIL)
      .single();
    await runAdminSql(`
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
      VALUES ('${groupBId}', '${groupAId}', '${stewardRow!.personal_group_id}', 'invited');
      UPDATE public.group_memberships SET status = 'active'
      WHERE group_id = '${groupBId}' AND member_group_id = '${groupAId}';`);

    // The session FIM joins A and receives a custom role carrying exactly
    // act_as_group — the hat, and nothing personal in B.
    const { data: sessionRow } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('email', SESSION_EMAIL)
      .single();
    await runAdminSql(`
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
      VALUES ('${groupAId}', '${sessionRow!.personal_group_id}', '${stewardRow!.personal_group_id}', 'active');
      WITH r AS (
        INSERT INTO public.group_roles (group_id, name)
        VALUES ('${groupAId}', 'H046 Hat ${RUN}') RETURNING id
      ), p AS (
        INSERT INTO public.group_role_permissions (group_role_id, permission_id)
        SELECT r.id, perm.id FROM r, public.permissions perm
        WHERE perm.name = 'act_as_group' RETURNING group_role_id
      )
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${sessionRow!.personal_group_id}', '${groupAId}', r.id, '${stewardRow!.personal_group_id}' FROM r;`);
  });

  test.afterAll(async () => {
    const admin = createAdminClient();
    for (const gid of [groupAId, groupBId].filter(Boolean) as string[]) {
      await admin.from('forum_posts').delete().eq('group_id', gid);
      await admin.from('groups').delete().eq('id', gid);
    }
    await deleteE2EUser(admin, STEWARD_EMAIL);
  });

  test('the hat opens the forum: banner, confirmed wielded post, Group-badged author', async ({
    page,
  }) => {
    await page.goto(`/groups/${groupBId}`);

    // Before the hat: the wielder is not a member — no wielded banner.
    await expect(page.getByTestId('group-forum')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('forum-acting-banner')).toHaveCount(0);

    // Select the hat (offered because A has standing in B and the FIM holds
    // the key in A).
    await page.getByTestId('act-as-select').selectOption(groupAId!);

    // STORY-1: the wielded read serves, and the banner names the substitution.
    await expect(page.getByTestId('forum-acting-banner')).toHaveText(
      `Viewing as ${GROUP_A}`,
      { timeout: 15000 },
    );

    // STORY-2: the composer opens on the hat's permissions; the per-act
    // confirm names the wielding before anything is sent.
    await page.getByLabel('Forum post').fill(WIELDED_THREAD);
    await page.getByTestId('forum-post-submit').click();
    await expect(page.getByText(`You are posting as ${GROUP_A}`, { exact: false })).toBeVisible();
    await page.getByRole('button', { name: `Post as ${GROUP_A}` }).click();

    // The observable effect: the thread renders, attributed to A with the
    // Group badge (STORY-3) — never the wielder's own name.
    await expect(page.getByText(WIELDED_THREAD)).toBeVisible({ timeout: 15000 });
    const thread = page
      .locator('[data-testid^="forum-post-"]')
      .filter({ hasText: WIELDED_THREAD });
    await expect(thread.getByText(GROUP_A, { exact: true }).first()).toBeVisible();
    await expect(thread.locator('[data-testid^="forum-author-badge-"]').first()).toHaveText(
      'Group',
    );
  });
});
