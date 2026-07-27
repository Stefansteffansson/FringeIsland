import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A-NTF area-gate remediation — board GB-1 (Mist posture) and GB-3 (the
 * asks-versus-news split), settled 2026-07-27.
 *
 * WHY THIS SUITE EXISTS. NB-8 asked for an adversarial proof that the delivery
 * path structurally excludes Mist durable rows. The proof was run against the
 * live DB and REFUTED its own premise
 * (`docs/planning/hub-v2/2026-07-27-antf-nb8-mist-posture-proof.md`): every Mist
 * held one `role_assigned` row from its own personal-group bootstrap, could read
 * / mark-read / export it, and was refused only at the preference doors — a
 * notification it could see and could not silence. This suite is the invariant
 * that keeps the refutation from recurring.
 *
 * RED-FIRST (these CANNOT pass before the migration):
 *  - GB-1a: a Mist recipient is not excluded today, so the Mist half of the
 *    PAIR fails (the row IS written).
 *  - GB-1b: `notify_role_assigned` fires on self-assignment today, so the
 *    self half of the PAIR fails (a notification IS emitted).
 *  - GB-3a: the `asks` category does not exist, so the seeded-row assertion
 *    fails on a missing row.
 *  - GB-3b: the three ask kinds still carry their old category keys.
 *  - GB-3c: `membership` is suppressible and holds `invitation_received`
 *    today, so muting it DOES silence an ask and the ask half fails.
 *  - GB-3d: muting `asks` is accepted today (no such category), so the 42501
 *    policy refusal is absent.
 *  - GB-3e: the labels still advertise what the categories will no longer hold.
 *
 * PAIR DISCIPLINE, inherited from `./preference-and-dispatcher-contracts.test.ts`
 * and non-negotiable here. "No notification arrived" is trivially true for a
 * dozen wrong reasons — a broken fixture, a missing group, a typo'd kind. Every
 * exclusion assertion in this file therefore asserts a SIBLING that must still
 * be delivered in the same test. Only a real, selective guard passes both halves.
 * N-C shipped 19 red-first assertions and one was vacuous; that is the trap.
 */

const ASKS_CATEGORY = 'asks';
const NEWS_CATEGORY = 'membership';

/** The three asks, verified live 2026-07-27 — two actionable, one not. */
const ASK_KINDS = ['invitation_received', 'acting_invitation', 'stewardship_nomination'];
/** `invitation_received` carries NO action_type — which is exactly why the
 *  surgical `action_type IS NOT NULL` exemption was rejected at W-09. */
const ASK_KIND_WITHOUT_ACTION = 'invitation_received';
/** A genuine piece of news that stays in `membership` and stays mutable. */
const NEWS_KIND = 'member_left';

describe('A-NTF gate — Mist posture (GB-1) and the asks-versus-news split (GB-3)', () => {
  let admin: SupabaseClient;
  let member: TestUser;
  let memberGroupId: string;
  const createdNotificationIds: string[] = [];
  const createdRoleIds: string[] = [];
  let mistClient: SupabaseClient | null = null;
  let mistPersonalGroupId: string | null = null;
  let mistAuthUid: string | null = null;

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  /** Insert straight at the substrate, bypassing every contract — the only way
   *  to prove the dispatcher itself excludes, rather than some caller upstream. */
  const rawInsert = async (recipientGroupId: string, kind: string): Promise<void> => {
    const { data } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: recipientGroupId,
        type: kind,
        title: `gate probe ${kind}`,
        body: 'gate probe body',
        payload: {},
      })
      .select('id')
      .maybeSingle();
    const id = (data as { id: string } | null)?.id ?? null;
    if (id) createdNotificationIds.push(id);
  };

  const deliveredCount = async (recipientGroupId: string, kind: string): Promise<number> => {
    const { count } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_group_id', recipientGroupId)
      .eq('type', kind);
    return count ?? 0;
  };

  const rawPreference = async (
    recipientGroupId: string,
    categoryKey: string,
    allowed: boolean,
  ): Promise<void> => {
    await runAdminSql(
      `INSERT INTO public.notification_preferences
         (recipient_group_id, category_key, channel, allowed)
       VALUES ('${recipientGroupId}', '${categoryKey}', 'in_app', ${allowed})
       ON CONFLICT (recipient_group_id, category_key, channel)
       DO UPDATE SET allowed = EXCLUDED.allowed;`,
    );
  };

  beforeAll(async () => {
    admin = createAdminClient();
    member = await createTestUser();
    memberGroupId = member.personalGroupId;

    // A real Mist — the anonymous session holding `authenticated`, the exact
    // caller the NB-8 proof walked.
    mistClient = createTestClient();
    const { data: anon } = await mistClient.auth.signInAnonymously();
    mistAuthUid = anon?.user?.id ?? null;
    if (mistAuthUid) {
      const rows = (await runAdminSql(
        `SELECT personal_group_id FROM public.users WHERE auth_user_id = '${mistAuthUid}';`,
      )) as Array<{ personal_group_id: string }> | null;
      mistPersonalGroupId = rows?.[0]?.personal_group_id ?? null;
    }
  }, 60_000);

  afterAll(async () => {
    for (const id of createdNotificationIds) {
      await admin.from('notifications').delete().eq('id', id);
    }
    for (const id of createdRoleIds) {
      await runAdminSql(`DELETE FROM public.group_roles WHERE id = '${id}';`).catch(
        () => undefined,
      );
    }
    await runAdminSql(
      `DELETE FROM public.notification_preferences WHERE recipient_group_id = '${memberGroupId}';`,
    ).catch(() => undefined);
    // Erase the Mist rather than merely signing it out — this suite exists
    // because Mists were leaving durable traces, so it must not leave one.
    if (mistAuthUid) await admin.auth.admin.deleteUser(mistAuthUid).catch(() => undefined);
    if (mistClient) await mistClient.auth.signOut();
    if (member) await cleanupTestUser(member.user.id);
  }, 60_000);

  // ---------------------------------------------------------------------------
  describe('GB-1 — a Mist leaves no trace, by construction', () => {
    it('the Mist fixture is real: it has a personal group (which is why the read doors admitted it)', () => {
      // Guards the suite against its own vacuity. If this were null, every
      // exclusion assertion below would pass for the wrong reason. The NB-8
      // proof turned on exactly this fact: handle_new_user Step 2 is
      // unconditional, so a Mist DOES get a personal group; only Step 7
      // (FringeIsland Members enrolment) is skipped.
      expect(mistPersonalGroupId).not.toBeNull();
    });

    it('PAIR: a durable row is refused for a Mist recipient AND still written for a FIM', async () => {
      const mistBefore = await deliveredCount(mistPersonalGroupId!, NEWS_KIND);
      const fimBefore = await deliveredCount(memberGroupId, NEWS_KIND);

      await rawInsert(mistPersonalGroupId!, NEWS_KIND);
      await rawInsert(memberGroupId, NEWS_KIND);

      // The Mist half — V3's rule made true by construction, not by hope.
      expect(await deliveredCount(mistPersonalGroupId!, NEWS_KIND)).toBe(mistBefore);
      // The FIM half — the guard is about Mists, not a global off-switch.
      expect(await deliveredCount(memberGroupId, NEWS_KIND)).toBe(fimBefore + 1);
    });

    it('a Mist that holds no rows also reads none — the bell is empty, not merely quiet', async () => {
      const { data, error } = await mistClient!.rpc('get_own_notifications', { p_limit: 50 });
      expect(error).toBeNull();
      expect((data as unknown[]).length).toBe(0);
      const { data: cnt } = await mistClient!.rpc('get_own_unread_notification_count');
      expect(cnt as number).toBe(0);
    });

    it('PAIR: assigning a personal group a role in ITSELF emits nothing, while a real group assignment still notifies', async () => {
      // The bootstrap shape: "Myself" in your own personal group, assigned by
      // yourself. 1516 of 1548 FIMs carry this row and it tells them nothing.
      const selfBefore = await deliveredCount(memberGroupId, 'role_assigned');

      const selfRole = (await runAdminSql(
        `INSERT INTO public.group_roles (group_id, name)
         VALUES ('${memberGroupId}', 'GateProbeSelfRole')
         RETURNING id;`,
      )) as Array<{ id: string }> | null;
      const selfRoleId = selfRole?.[0]?.id;
      expect(selfRoleId).toBeTruthy();
      createdRoleIds.push(selfRoleId!);

      await runAdminSql(
        `INSERT INTO public.user_group_roles
           (member_group_id, group_id, group_role_id, assigned_by_group_id)
         VALUES ('${memberGroupId}', '${memberGroupId}', '${selfRoleId}', '${memberGroupId}')
         ON CONFLICT DO NOTHING;`,
      );

      // The self half — a personal group giving itself a role is plumbing, not news.
      expect(await deliveredCount(memberGroupId, 'role_assigned')).toBe(selfBefore);

      // The control half — a role in a REAL group is genuine news and must survive.
      const g = (await runAdminSql(
        `SELECT id FROM public.groups
          WHERE group_type = 'system' AND name = 'FringeIsland Members' LIMIT 1;`,
      )) as Array<{ id: string }> | null;
      const fiMembers = g?.[0]?.id;
      const realRole = (await runAdminSql(
        `SELECT id FROM public.group_roles WHERE group_id = '${fiMembers}' AND name = 'Member' LIMIT 1;`,
      )) as Array<{ id: string }> | null;

      const controlBefore = await deliveredCount(memberGroupId, 'role_assigned');
      await runAdminSql(
        `DELETE FROM public.user_group_roles
          WHERE member_group_id = '${memberGroupId}' AND group_id = '${fiMembers}';`,
      );
      await runAdminSql(
        `INSERT INTO public.user_group_roles
           (member_group_id, group_id, group_role_id, assigned_by_group_id)
         VALUES ('${memberGroupId}', '${fiMembers}', '${realRole?.[0]?.id}', '${fiMembers}');`,
      );
      expect(await deliveredCount(memberGroupId, 'role_assigned')).toBe(controlBefore + 1);
    });
  });

  // ---------------------------------------------------------------------------
  describe('GB-3 — an ask is not news, and cannot be silenced', () => {
    it('the asks category exists and is NOT member-suppressible', async () => {
      const rows = (await runAdminSql(
        `SELECT member_suppressible, lawful_basis FROM public.notification_categories
          WHERE key = '${ASKS_CATEGORY}';`,
      )) as Array<{ member_suppressible: boolean; lawful_basis: string }> | null;
      expect(rows?.length).toBe(1);
      expect(rows![0].member_suppressible).toBe(false);
    });

    it('all three asks live in it — including stewardship_nomination, which W-09 never named', async () => {
      const rows = (await runAdminSql(
        `SELECT kind FROM public.notification_kinds
          WHERE category_key = '${ASKS_CATEGORY}' ORDER BY kind;`,
      )) as Array<{ kind: string }> | null;
      expect((rows ?? []).map((r) => r.kind).sort()).toEqual([...ASK_KINDS].sort());
    });

    it('PAIR: a preference written behind the contract’s back cannot silence an ask, but does silence news', async () => {
      // `member_suppressible = false` must outrank a stored row — the same
      // guarantee `account` already carries (FEAT-PD016).
      await rawPreference(memberGroupId, ASKS_CATEGORY, false);
      await rawPreference(memberGroupId, NEWS_CATEGORY, false);

      const askBefore = await deliveredCount(memberGroupId, ASK_KIND_WITHOUT_ACTION);
      const newsBefore = await deliveredCount(memberGroupId, NEWS_KIND);

      await rawInsert(memberGroupId, ASK_KIND_WITHOUT_ACTION);
      await rawInsert(memberGroupId, NEWS_KIND);

      // The ask half — a question only you can answer always reaches you.
      expect(await deliveredCount(memberGroupId, ASK_KIND_WITHOUT_ACTION)).toBe(askBefore + 1);
      // The news half — muting still means something, or the split is theatre.
      expect(await deliveredCount(memberGroupId, NEWS_KIND)).toBe(newsBefore);

      await runAdminSql(
        `DELETE FROM public.notification_preferences WHERE recipient_group_id = '${memberGroupId}';`,
      );
    });

    it('the contract refuses to mute asks with 42501 — a policy refusal, with a reason', async () => {
      // 42501 (policy), NOT 28000 (identity) — the distinction FEAT-PD016 built
      // `ds5_require_fim_subject` for. The member is allowed to ask; the answer
      // is no, and the surface must be able to say which.
      const c = await asUser(member);
      const { error } = await c.rpc('set_own_notification_preference', {
        p_category_key: ASKS_CATEGORY,
        p_channel: 'in_app',
        p_allowed: false,
      });
      expect((error as { code?: string } | null)?.code).toBe('42501');
    });

    it('the labels name the telling, not the thing — and no longer advertise what they no longer carry', async () => {
      const rows = (await runAdminSql(
        `SELECT key, label FROM public.notification_categories
          WHERE key IN ('${ASKS_CATEGORY}', '${NEWS_CATEGORY}', 'stewardship') ORDER BY key;`,
      )) as Array<{ key: string; label: string }> | null;
      const byKey = Object.fromEntries((rows ?? []).map((r) => [r.key, r.label]));

      // `membership` no longer holds invitations, so its label must stop saying so.
      expect(byKey[NEWS_CATEGORY]).not.toMatch(/invitation/i);
      // `stewardship` no longer holds the nomination.
      expect(byKey['stewardship']).not.toMatch(/nomination/i);
      // The asks category says what it is in plain language.
      expect(byKey[ASKS_CATEGORY]).toBeTruthy();
    });
  });
});
