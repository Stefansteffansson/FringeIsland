import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  createAdminClient,
  deleteE2EUser,
  runAdminSql,
  SESSION_EMAIL,
} from './helpers/auth';

/**
 * FEAT-H047 (TASK-H047-1) — the wielded conversation journey, end to end.
 *
 * The session FIM wields engagement group A but is NOT a member of community
 * B; A is an active member of B. The journey: open B's page → select the hat
 * → the Conversations section renders through A's standing with the banner →
 * Join as the group through the one-time confirm → land on the param-carried
 * thread (`?acting=`) → the composer wears the "Sending as" label → send →
 * the message renders attributed to A with the Group badge (the observable
 * effect, never just the click).
 */

const RUN = Date.now();
const STEWARD_EMAIL = `e2e-h047-steward-${RUN}@fringeisland.test`;
const GROUP_B = `H047 Harbour ${RUN}`;
const GROUP_A = `H047Reps${RUN}`;
const THREAD_TITLE = `H047 thread ${RUN}`;
const WIELDED_LINE = `Spoken in thread for the group ${RUN}`;

test.describe('FEAT-H047 — the group takes its seat (wielded conversations)', () => {
  let groupAId: string | null = null;
  let groupBId: string | null = null;
  let threadId: string | null = null;

  test.beforeAll(async () => {
    const admin = createAdminClient();

    const { error: createErr } = await admin.auth.admin.createUser({
      email: STEWARD_EMAIL,
      password: 'e2e-test-password-123',
      email_confirm: true,
      user_metadata: { display_name: `H047Stw${RUN}`, consent_accepted: 'true' },
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

    // A thread for A to join (the steward's own Steward instance carries
    // create_group_conversations).
    const { data: convId, error: convErr } = await steward.rpc('create_group_conversation', {
      p_group_id: groupBId,
      p_title: THREAD_TITLE,
    });
    if (convErr) throw new Error(`seed thread: ${convErr.message}`);
    threadId = convId as string;
    await steward.auth.signOut();

    await runAdminSql(`
      UPDATE public.groups SET is_public = true WHERE id = '${groupBId}';`);

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
        VALUES ('${groupAId}', 'H047 Hat ${RUN}') RETURNING id
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
      await admin.from('groups').delete().eq('id', gid);
    }
    await deleteE2EUser(admin, STEWARD_EMAIL);
  });

  test('the hat opens the conversations: banner, confirmed join, labelled send, Group-badged message', async ({
    page,
  }) => {
    await page.goto(`/groups/${groupBId}`);

    // Before the hat: honest members-only copy, no banner.
    await expect(page.getByTestId('group-conversations')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('conversations-acting-banner')).toHaveCount(0);

    await page.getByTestId('act-as-select').selectOption(groupAId!);

    // STORY-1: the wielded list serves with the banner; the thread offers Join.
    await expect(page.getByTestId('conversations-acting-banner')).toHaveText(
      `Viewing as ${GROUP_A}`,
      { timeout: 15000 },
    );
    await page.getByTestId(`conversation-join-${threadId}`).click();
    await expect(page.getByText(`You are joining as ${GROUP_A}`, { exact: false })).toBeVisible();
    await page.getByRole('button', { name: `Join as ${GROUP_A}` }).click();

    // STORY-2: the param-carried thread — banner + the composer label.
    await expect(page).toHaveURL(new RegExp(`/messages/${threadId}\\?acting=${groupAId}`), {
      timeout: 15000,
    });
    await expect(page.getByTestId('thread-acting-banner')).toHaveText(`Viewing as ${GROUP_A}`);
    await expect(page.getByTestId('thread-acting-send-label')).toHaveText(
      `Sending as ${GROUP_A}`,
    );

    await page.getByRole('textbox', { name: 'Message' }).fill(WIELDED_LINE);
    await page.getByRole('button', { name: 'Send' }).click();

    // STORY-2/3: the observable effect — the confirmed row, attributed to A
    // with the Group badge; no per-message dialog interrupted the send.
    await expect(page.getByText(WIELDED_LINE)).toBeVisible({ timeout: 15000 });
    const message = page
      .locator('[data-testid^="message-"]')
      .filter({ hasText: WIELDED_LINE });
    await expect(message.locator('p').first()).toContainText(GROUP_A);
    await expect(
      message.locator('[data-testid^="message-sender-badge-"]').first(),
    ).toHaveText('Group');
  });
});
