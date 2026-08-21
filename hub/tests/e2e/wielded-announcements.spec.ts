import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  createAdminClient,
  deleteE2EUser,
  runAdminSql,
  SESSION_EMAIL,
} from './helpers/auth';

/**
 * FEAT-H048 (TASK-H048-1) — the wielded announcements journey, end to end.
 *
 * The same cast as the wielded-forum walk: the session FIM wields engagement
 * group A (holds `act_as_group` there) but is NOT a member of community B; A
 * is an active member of B and carries a role there granting
 * `send_announcements` — the hat's grant, never the wielder's own.
 *
 * The journey: open B's page → no banner (the wielder is a stranger) → select
 * the hat → the board renders with the substitution banner → announce as the
 * group through the confirm that names the wielding → the board carries the
 * announcement attributed to A with the Group badge → retract as the group
 * through the confirm that names the wielding → it leaves the board. Each
 * assertion is the observable effect, never just the click.
 */

const RUN = Date.now();
const STEWARD_EMAIL = `e2e-h048-steward-${RUN}@fringeisland.test`;
const GROUP_B = `H048 Harbour ${RUN}`;
const GROUP_A = `H048Reps${RUN}`;
const WIELDED_TITLE = `Spoken to the whole group ${RUN}`;
const WIELDED_BODY = `The board carries the group's name, not mine. ${RUN}`;

test.describe('FEAT-H048 — announcing as the group (wielded board)', () => {
  let groupAId: string | null = null;
  let groupBId: string | null = null;

  test.beforeAll(async () => {
    const admin = createAdminClient();

    // A fixture steward creates both groups through the real contract (role
    // instantiation rides create_engagement_group; no data-level replicas).
    const { error: createErr } = await admin.auth.admin.createUser({
      email: STEWARD_EMAIL,
      password: 'e2e-test-password-123',
      email_confirm: true,
      user_metadata: { display_name: `H048Stw${RUN}`, consent_accepted: 'true' },
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

    const { data: stewardRow } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('email', STEWARD_EMAIL)
      .single();

    // A joins B via the invited→active two-step, then receives a role in B
    // carrying exactly `send_announcements` — the hat's standing on the board.
    await runAdminSql(`
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
      VALUES ('${groupBId}', '${groupAId}', '${stewardRow!.personal_group_id}', 'invited');
      UPDATE public.group_memberships SET status = 'active'
      WHERE group_id = '${groupBId}' AND member_group_id = '${groupAId}';
      WITH r AS (
        INSERT INTO public.group_roles (group_id, name)
        VALUES ('${groupBId}', 'H048 Herald ${RUN}') RETURNING id
      ), p AS (
        INSERT INTO public.group_role_permissions (group_role_id, permission_id)
        SELECT r.id, perm.id FROM r, public.permissions perm
        WHERE perm.name = 'send_announcements' RETURNING group_role_id
      )
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${groupAId}', '${groupBId}', r.id, '${stewardRow!.personal_group_id}' FROM r;`);

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
        VALUES ('${groupAId}', 'H048 Hat ${RUN}') RETURNING id
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
      await admin.from('announcements').delete().eq('scope_group_id', gid);
      await admin.from('groups').delete().eq('id', gid);
    }
    await deleteE2EUser(admin, STEWARD_EMAIL);
  });

  test('the hat opens the board: banner, confirmed wielded announce, Group-badged author, wielded retract', async ({
    page,
  }) => {
    await page.goto(`/groups/${groupBId}`);

    // Before the hat: the wielder is a stranger to B — no wielded banner.
    await expect(page.getByTestId('group-announcements')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('announcements-acting-banner')).toHaveCount(0);

    // STORY-1: select the hat; the wielded read serves and the banner names
    // the substitution.
    await page.getByTestId('act-as-select').selectOption(groupAId!);
    await expect(page.getByTestId('announcements-acting-banner')).toHaveText(
      `Viewing as ${GROUP_A}`,
      { timeout: 15000 },
    );

    // STORY-2: the composer opens on the HAT's send_announcements (the wielder
    // holds nothing of their own in B); the confirm names the wielding first.
    await page.getByTestId('announcement-compose-title').fill(WIELDED_TITLE);
    await page.getByTestId('announcement-compose-body').fill(WIELDED_BODY);
    await page.getByTestId('announcement-send').click();
    await expect(
      page.getByText(`You are announcing as ${GROUP_A}`, { exact: false }),
    ).toBeVisible();
    await page.getByRole('button', { name: `Announce as ${GROUP_A}` }).click();

    // The observable effect: the board carries it, attributed to A with the
    // Group badge (STORY-3) — never the wielder's own name.
    await expect(page.getByText(WIELDED_TITLE)).toBeVisible({ timeout: 15000 });
    const row = page
      .locator('[data-testid^="announcement-"]')
      .filter({ hasText: WIELDED_TITLE })
      .first();
    await expect(row.getByText(GROUP_A, { exact: true }).first()).toBeVisible();
    await expect(row.locator('[data-testid^="announcement-author-badge-"]').first()).toHaveText(
      'Group',
    );

    // STORY-2 (the correction): retract as the group — the confirm names the
    // wielding, and the row leaves the board.
    await row.locator('[data-testid^="announcement-retract-"]').first().click();
    await expect(
      page.getByText(`You are retracting as ${GROUP_A}`, { exact: false }),
    ).toBeVisible();
    await page.getByRole('button', { name: `Retract as ${GROUP_A}` }).click();
    await expect(page.getByText(WIELDED_TITLE)).toHaveCount(0, { timeout: 15000 });
  });
});
