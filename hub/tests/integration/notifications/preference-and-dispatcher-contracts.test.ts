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
 * FEAT-PD016 (A-NTF Cycle N-D) — notification preference contracts and the
 * shared suppression dispatcher. NTF-10, the area's last capability.
 *
 * Sibling precedent: `./realtime-hint-and-policy.test.ts` (N-C, FEAT-PD015)
 * solved the hint-counting shape; its `realtime.messages` helpers and its
 * direct-insert justification are copied-with-correction here.
 *
 * RED-FIRST (these CANNOT pass before the migration):
 *  - STORY-1 registry: `public.notification_channels` does not exist, so the
 *    seeded-rows and RLS-posture assertions fail on a missing relation.
 *  - STORY-1 matrix: `get_own_notification_preferences()` does not exist.
 *  - STORY-1 columns: `notification_categories.member_suppressible` and
 *    `.nudge` do not exist, so the seeded-values assertion fails.
 *  - STORY-1 own-rows-only: `public.notification_preferences` does not exist.
 *  - STORY-2 suppression: no dispatcher exists, so a muted category is still
 *    delivered and the PAIRED assertion fails on its muted half.
 *  - STORY-2 real writer: `admin_send_notification` is not suppressed today.
 *  - STORY-2 hint: a suppressed insert currently still emits a hint.
 *  - STORY-2 override: `member_suppressible` does not exist to outrank anything.
 *  - STORY-2 fail-open: `ds5_may_deliver()` does not exist.
 *  - STORY-3 get/set: `set_own_notification_preference()` does not exist, so the
 *    upsert and all three typed refusals fail.
 *  - STORY-3 export: the preferences section is absent from the export.
 *  - STORY-4 operator: `get_notification_nudge_policy()`,
 *    `set_notification_category_nudge()` and
 *    `get_platform_announcement_reach()` do not exist.
 *  - STORY-4 nudge: a category-level nudge switch does not exist, so its PAIRED
 *    assertion fails on the nudge-off half.
 *
 * EVERY SUPPRESSION ASSERTION IS A PAIR, AND THAT IS DELIBERATE. N-C wrote 19
 * red-first assertions and only 18 failed: the vacuous one asserted "platform
 * emits zero hints", which was already true because nothing emitted at all.
 * "No notification arrived" is the same trap in a stronger form — it is
 * trivially true before a dispatcher exists. So each suppression test mutes one
 * category and leaves a SIBLING category unmuted in the same test, asserting
 * both halves. Only a real, selective dispatcher can pass that.
 *
 * LABELLED HONESTLY — green pre- AND post-apply (regression guards, NOT
 * red-first, and NOT counted in the red-first claim):
 *  - `ds5_may_deliver` is not callable by a client (PGRST202 pre-apply because
 *    it does not exist; 42501/PGRST202 post-apply because it is REVOKEd) — the
 *    assertion is "a client cannot reach the dispatcher", true either way;
 *  - N-C's platform-announcement `ds5_config` suppression still holds
 *    (this feature must not regress it);
 *  - an unmuted member's notification is delivered and readable — the baseline
 *    this feature must not break.
 *
 * WHY DIRECT INSERTS FOR THE BRANCH LOGIC: the dispatcher branches on
 * `NEW.recipient_group_id` + `NEW.type`, so a controlled insert exercises the
 * exact branch (N-C's ruling, same reasoning). But the "catches every writer"
 * claim is not provable by inserts alone, so it is proved TWO other ways: a
 * structural assertion that the trigger is `BEFORE INSERT … FOR EACH ROW` on
 * the table itself (which is what makes it universal), and one real
 * unmodified writer — `admin_send_notification`, a PC-4-audited RPC this
 * feature does not touch.
 *
 * WHY `notifications.type` CANNOT CARRY AN UNKNOWN KIND: `notifications_type_fkey`
 * references `notification_kinds(kind)` (N-A), so the fail-open-on-unknown-kind
 * case is unreachable through an insert. It is asserted against
 * `ds5_may_deliver()` directly via admin SQL instead.
 *
 * WHY THERE IS NO ENGAGEMENT-GROUP GUARD TO TEST: preferences are keyed by
 * `recipient_group_id`, and an engagement group cannot own preference rows, so
 * absence-means-allowed already delivers those notifications. The guarantee is
 * asserted, but no special-case code should exist to find.
 */

const CHANNEL_IN_APP = 'in_app';
const CHANNEL_EMAIL = 'email';

// A suppressible category and a control, chosen so the pair can never collide.
const MUTED_CATEGORY = 'membership';
const MUTED_KIND = 'invitation_received';
const CONTROL_CATEGORY = 'journeys';
const CONTROL_KIND = 'journey_completed';
// Seeded non-suppressible: the member's own participation/access notices.
const LOCKED_CATEGORY = 'account';
const LOCKED_KIND = 'participation_paused';

/**
 * Promote a personal group to platform admin: active DeusEx member + DeusEx role.
 * Copied-with-correction from `../auth/fim-account-erasure.test.ts:46`.
 *
 * REQUIRED, not convenience. `is_platform_admin()` resolves through
 * `get_current_personal_group_id()`, so it is FALSE for the service-role client
 * (whose `auth.uid()` is null). The first version of this suite called
 * `admin_send_notification` and every operator contract as service_role, and the
 * refusals made the SUPPRESSED half of the admin-writer pair pass for entirely
 * the wrong reason — nothing was suppressed, the RPC was simply refused. That is
 * N-C's vacuous-test failure wearing a different hat, and the PAIR discipline is
 * what caught it: the "delivers when unmuted" half failed, which is the only
 * reason the false green next to it was visible at all.
 */
async function makePlatformAdmin(personalGroupId: string) {
  await runAdminSql(`
    DO $$
    DECLARE v_deusex uuid; v_role uuid;
    BEGIN
      SELECT id INTO v_deusex FROM public.groups
        WHERE name = 'DeusEx' AND group_type = 'system';
      SELECT id INTO v_role FROM public.group_roles
        WHERE group_id = v_deusex AND name = 'DeusEx';
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
        VALUES (v_deusex, '${personalGroupId}', v_deusex, 'active')
        ON CONFLICT (group_id, member_group_id) DO UPDATE SET status = 'active';
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
        VALUES ('${personalGroupId}', v_deusex, v_role, v_deusex)
        ON CONFLICT DO NOTHING;
    END $$;`);
}

async function demotePlatformAdmin(personalGroupId: string) {
  await runAdminSql(`
    DO $$
    DECLARE v_deusex uuid;
    BEGIN
      SELECT id INTO v_deusex FROM public.groups
        WHERE name = 'DeusEx' AND group_type = 'system';
      DELETE FROM public.user_group_roles
        WHERE member_group_id = '${personalGroupId}' AND group_id = v_deusex;
      DELETE FROM public.group_memberships
        WHERE member_group_id = '${personalGroupId}' AND group_id = v_deusex;
    END $$;`).catch(() => undefined);
}

describe('FEAT-PD016 — notification preferences & the shared suppression dispatcher (N-D)', () => {
  let admin: SupabaseClient;
  let member: TestUser;
  let bystander: TestUser;
  let operator: TestUser;
  let asOperator: SupabaseClient;
  let memberUserId: string;
  const createdNotificationIds: string[] = [];
  const touchedGroupIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const asMist = async (): Promise<SupabaseClient> => {
    const c = createTestClient();
    await c.auth.signInAnonymously();
    return c;
  };

  /** Insert a notification straight at the substrate, bypassing every contract. */
  const rawInsert = async (
    recipientGroupId: string,
    kind: string,
    payload: Record<string, unknown> = {},
  ): Promise<{ id: string | null; error: unknown }> => {
    const { data, error } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: recipientGroupId,
        type: kind,
        title: `ND probe ${kind}`,
        body: 'ND probe body',
        payload,
      })
      .select('id')
      .maybeSingle();
    const id = (data as { id: string } | null)?.id ?? null;
    if (id) createdNotificationIds.push(id);
    return { id, error };
  };

  /** How many notifications of this kind does the member actually hold? */
  const deliveredCount = async (recipientGroupId: string, kind: string): Promise<number> => {
    const { count } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_group_id', recipientGroupId)
      .eq('type', kind);
    return count ?? 0;
  };

  const hintCount = async (authUid: string): Promise<number> =>
    (
      (
        await runAdminSql(
          `SELECT count(*)::int AS n FROM realtime.messages
            WHERE topic = 'account:${authUid}:notifications';`,
        )
      )?.[0] as { n: number }
    ).n;

  /** Write a preference row directly, bypassing the contract's gating. */
  const rawPreference = async (
    recipientGroupId: string,
    categoryKey: string,
    channel: string,
    allowed: boolean,
  ): Promise<void> => {
    await runAdminSql(
      `INSERT INTO public.notification_preferences
         (recipient_group_id, category_key, channel, allowed)
       VALUES ('${recipientGroupId}', '${categoryKey}', '${channel}', ${allowed})
       ON CONFLICT (recipient_group_id, category_key, channel)
       DO UPDATE SET allowed = EXCLUDED.allowed;`,
    );
  };

  beforeAll(async () => {
    admin = createAdminClient();
    // Single-token display names: surfaces render nickname = first token, and
    // the E2E fixtures downstream depend on the same shape.
    member = await createTestUser({ displayName: 'NdMember' });
    bystander = await createTestUser({ displayName: 'NdBystander' });
    operator = await createTestUser({ displayName: 'NdOperator' });
    touchedGroupIds.push(member.personalGroupId, bystander.personalGroupId, operator.personalGroupId);
    await makePlatformAdmin(operator.personalGroupId);
    asOperator = await asUser(operator);

    // `admin_send_notification` resolves `users.id = ANY(target_user_ids)`, and
    // TestUser.user is the AUTH user — different id space. Passing the auth id
    // matched no row, so the RPC returned success with count 0 and BOTH halves of
    // the admin-writer pair were vacuous. Resolved to the profile id here.
    const { data: profile } = await admin
      .from('users')
      .select('id')
      .eq('auth_user_id', member.user.id)
      .single();
    memberUserId = (profile as { id: string }).id;
  }, 90_000);

  afterAll(async () => {
    if (createdNotificationIds.length) {
      await admin.from('notifications').delete().in('id', createdNotificationIds);
    }
    // Preference rows cascade with the personal group, but delete explicitly so
    // a failed cleanup cannot leave a poison row in the shared dev DB.
    for (const g of touchedGroupIds) {
      await runAdminSql(
        `DELETE FROM public.notification_preferences WHERE recipient_group_id = '${g}';`,
      ).catch(() => undefined);
    }
    await demotePlatformAdmin(operator.personalGroupId);
    await cleanupTestUser(member.user.id);
    await cleanupTestUser(bystander.user.id);
    await cleanupTestUser(operator.user.id);
  }, 90_000);

  // ------------------------------------------------------------------
  describe('STORY-1 — the substrate and its open channel registry', () => {
    it('notification_channels is seeded with in_app (delivering) and email (not delivering)', async () => {
      const rows = await runAdminSql(
        `SELECT channel, delivers FROM public.notification_channels ORDER BY channel;`,
      );
      const byChannel = Object.fromEntries(
        (rows as { channel: string; delivers: boolean }[]).map((r) => [r.channel, r.delivers]),
      );
      expect(byChannel[CHANNEL_IN_APP]).toBe(true);
      // The honest half: email is stored so preferences bind the day it ships,
      // and flagged non-delivering so no surface promises what it cannot do.
      expect(byChannel[CHANNEL_EMAIL]).toBe(false);
    });

    it('notification_channels carries the reference-data RLS posture — readable, not member-writable', async () => {
      const policies = (await runAdminSql(
        `SELECT cmd FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'notification_channels';`,
      )) as { cmd: string }[];
      const rlsOn = (await runAdminSql(
        `SELECT relrowsecurity FROM pg_class
          WHERE oid = 'public.notification_channels'::regclass;`,
      )) as { relrowsecurity: boolean }[];

      expect(rlsOn[0].relrowsecurity).toBe(true);
      expect(policies.map((p) => p.cmd)).toContain('SELECT');
      // No user-facing write door: registries are migration/service_role only.
      expect(policies.filter((p) => p.cmd !== 'SELECT')).toHaveLength(0);
    });

    it('a fresh member sees the full categories x channels matrix, every pair allowed', async () => {
      const c = await asUser(member);
      const { data, error } = await c.rpc('get_own_notification_preferences');
      expect(error).toBeNull();

      const rows = (data ?? []) as {
        category_key: string;
        channel: string;
        allowed: boolean;
        member_suppressible: boolean;
        channel_delivers: boolean;
        category_label: string;
      }[];

      const categories = new Set(rows.map((r) => r.category_key));
      const channels = new Set(rows.map((r) => r.channel));
      // 6 seeded categories x 2 channels — the matrix, not the stored rows.
      expect(categories.size).toBeGreaterThanOrEqual(6);
      expect(channels).toContain(CHANNEL_IN_APP);
      expect(channels).toContain(CHANNEL_EMAIL);
      expect(rows).toHaveLength(categories.size * channels.size);

      // Absence means allowed: no rows were seeded for this member.
      expect(rows.every((r) => r.allowed === true)).toBe(true);
      const stored = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.notification_preferences
          WHERE recipient_group_id = '${member.personalGroupId}';`,
      );
      expect((stored[0] as { n: number }).n).toBe(0);

      // Every payload-walk key the surface renders is actually served.
      expect(rows.every((r) => typeof r.category_label === 'string' && r.category_label)).toBe(true);
      expect(rows.every((r) => typeof r.member_suppressible === 'boolean')).toBe(true);
      expect(rows.every((r) => typeof r.channel_delivers === 'boolean')).toBe(true);
    });

    it('member_suppressible is false for account only; nudge defaults true for every category', async () => {
      const rows = (await runAdminSql(
        `SELECT key, member_suppressible, nudge FROM public.notification_categories ORDER BY key;`,
      )) as { key: string; member_suppressible: boolean; nudge: boolean }[];

      const locked = rows.filter((r) => !r.member_suppressible).map((r) => r.key);
      expect(locked).toEqual([LOCKED_CATEGORY]);
      expect(rows.every((r) => r.nudge === true)).toBe(true);
      // The GDPR field is untouched — suppressibility is its own axis.
      const basis = (await runAdminSql(
        `SELECT DISTINCT lawful_basis FROM public.notification_categories;`,
      )) as { lawful_basis: string }[];
      expect(basis.map((b) => b.lawful_basis).sort()).toEqual(['transactional']);
    });

    it('preference rows are own-rows-only — a bystander sees none of the member’s', async () => {
      await rawPreference(member.personalGroupId, MUTED_CATEGORY, CHANNEL_IN_APP, false);

      const cb = await asUser(bystander);
      const { data: theirs } = await cb.from('notification_preferences').select('category_key');
      expect(theirs ?? []).toHaveLength(0);

      const cm = await asUser(member);
      const { data: mine } = await cm.from('notification_preferences').select('category_key');
      expect((mine ?? []).length).toBeGreaterThan(0);

      await runAdminSql(
        `DELETE FROM public.notification_preferences
          WHERE recipient_group_id = '${member.personalGroupId}';`,
      );
    });

    // ADR-U038's direct-caller question, as a test rather than a migration
    // comment. The migration header answers it in prose; prose is not a guard.
    // A rule enforced only in a Hub route is not enforced at all, so the door a
    // PostgREST caller can actually reach has to be proved shut.
    it('no client can write notification_preferences directly — the contract is the only door', async () => {
      const c = await asUser(member);

      const { error: insertErr } = await c
        .from('notification_preferences')
        .insert({
          recipient_group_id: member.personalGroupId,
          category_key: MUTED_CATEGORY,
          channel: CHANNEL_IN_APP,
          allowed: false,
        });
      expect(insertErr).not.toBeNull();

      // Seed a row through the substrate, then prove the member cannot mutate or
      // remove it either — RLS grants SELECT on own rows and nothing more.
      await rawPreference(member.personalGroupId, MUTED_CATEGORY, CHANNEL_IN_APP, false);

      const { error: updateErr, count: updated } = await c
        .from('notification_preferences')
        .update({ allowed: true }, { count: 'exact' })
        .eq('recipient_group_id', member.personalGroupId);
      expect(updateErr !== null || (updated ?? 0) === 0).toBe(true);

      const { error: deleteErr, count: deleted } = await c
        .from('notification_preferences')
        .delete({ count: 'exact' })
        .eq('recipient_group_id', member.personalGroupId);
      expect(deleteErr !== null || (deleted ?? 0) === 0).toBe(true);

      // Still exactly as the substrate left it.
      const after = await runAdminSql(
        `SELECT allowed FROM public.notification_preferences
          WHERE recipient_group_id = '${member.personalGroupId}'
            AND category_key = '${MUTED_CATEGORY}' AND channel = '${CHANNEL_IN_APP}';`,
      );
      expect(after).toHaveLength(1);
      expect((after[0] as { allowed: boolean }).allowed).toBe(false);

      // And a Mist — the anonymous session holding the `authenticated` role,
      // which is the caller ADR-U038's S1/S2 holes were about — writes nothing.
      const mist = await asMist();
      const { error: mistErr } = await mist
        .from('notification_preferences')
        .insert({
          recipient_group_id: member.personalGroupId,
          category_key: CONTROL_CATEGORY,
          channel: CHANNEL_IN_APP,
          allowed: false,
        });
      expect(mistErr).not.toBeNull();
      await mist.auth.signOut();

      await runAdminSql(
        `DELETE FROM public.notification_preferences
          WHERE recipient_group_id = '${member.personalGroupId}';`,
      );
    });

    it('a preference cannot name a category or channel the platform does not have', async () => {
      await expect(
        rawPreference(member.personalGroupId, 'no-such-category', CHANNEL_IN_APP, false),
      ).rejects.toThrow();
      await expect(
        rawPreference(member.personalGroupId, MUTED_CATEGORY, 'carrier-pigeon', false),
      ).rejects.toThrow();
    });
  });

  // ------------------------------------------------------------------
  describe('STORY-2 — the shared dispatcher suppresses centrally', () => {
    it('the dispatcher is a BEFORE INSERT row trigger on the table — which is what makes it universal', async () => {
      const rows = (await runAdminSql(
        `SELECT t.tgname, pg_get_triggerdef(t.oid) AS def
           FROM pg_trigger t
          WHERE t.tgrelid = 'public.notifications'::regclass
            AND NOT t.tgisinternal;`,
      )) as { tgname: string; def: string }[];

      const dispatcher = rows.find((r) => r.def.includes('BEFORE INSERT'));
      expect(dispatcher).toBeDefined();
      expect(dispatcher!.def).toMatch(/FOR EACH ROW/);
      // N-C's AFTER INSERT hint trigger must still be there, unharmed.
      expect(rows.some((r) => r.def.includes('AFTER INSERT'))).toBe(true);
    });

    it('PAIR: a muted category is not delivered AND an unmuted sibling still is', async () => {
      await rawPreference(member.personalGroupId, MUTED_CATEGORY, CHANNEL_IN_APP, false);

      const mutedBefore = await deliveredCount(member.personalGroupId, MUTED_KIND);
      const controlBefore = await deliveredCount(member.personalGroupId, CONTROL_KIND);

      await rawInsert(member.personalGroupId, MUTED_KIND);
      await rawInsert(member.personalGroupId, CONTROL_KIND);

      // The muted half — nothing was written at all.
      expect(await deliveredCount(member.personalGroupId, MUTED_KIND)).toBe(mutedBefore);
      // The control half — suppression is SELECTIVE, not a global off-switch.
      expect(await deliveredCount(member.personalGroupId, CONTROL_KIND)).toBe(controlBefore + 1);

      await runAdminSql(
        `DELETE FROM public.notification_preferences
          WHERE recipient_group_id = '${member.personalGroupId}';`,
      );
    });

    it('PAIR: a real unmodified writer (admin_send_notification) is suppressed too, and delivers when unmuted', async () => {
      const kind = 'admin_notification';
      // Called as a REAL platform admin. As service_role the RPC is refused
      // outright, which would make the muted half pass without suppressing
      // anything — see makePlatformAdmin's note.
      await rawPreference(member.personalGroupId, 'platform', CHANNEL_IN_APP, false);
      const before = await deliveredCount(member.personalGroupId, kind);
      const { error: mutedErr } = await asOperator.rpc('admin_send_notification', {
        target_user_ids: [memberUserId],
        title: 'ND admin probe (muted)',
        message: 'should not arrive',
      });
      // The send must SUCCEED and be suppressed downstream — a refused send
      // proves nothing about the dispatcher.
      expect(mutedErr).toBeNull();
      expect(await deliveredCount(member.personalGroupId, kind)).toBe(before);

      // Unmuted: the same untouched RPC now delivers — proving the dispatcher
      // gates the writer rather than the writer being broken.
      await rawPreference(member.personalGroupId, 'platform', CHANNEL_IN_APP, true);
      const { error: allowedErr } = await asOperator.rpc('admin_send_notification', {
        target_user_ids: [memberUserId],
        title: 'ND admin probe (allowed)',
        message: 'should arrive',
      });
      expect(allowedErr).toBeNull();
      expect(await deliveredCount(member.personalGroupId, kind)).toBe(before + 1);

      const { data: rows } = await admin
        .from('notifications')
        .select('id')
        .eq('recipient_group_id', member.personalGroupId)
        .eq('type', kind);
      for (const r of (rows ?? []) as { id: string }[]) createdNotificationIds.push(r.id);
      await runAdminSql(
        `DELETE FROM public.notification_preferences
          WHERE recipient_group_id = '${member.personalGroupId}';`,
      );
    });

    it('PAIR: a suppressed notification costs no realtime hint, while a delivered one still emits', async () => {
      const authUid = member.user.id;
      await rawPreference(member.personalGroupId, MUTED_CATEGORY, CHANNEL_IN_APP, false);

      const before = await hintCount(authUid);
      await rawInsert(member.personalGroupId, MUTED_KIND);
      const afterMuted = await hintCount(authUid);
      // No row was written, so N-C's AFTER INSERT trigger never fired.
      expect(afterMuted).toBe(before);

      await rawInsert(member.personalGroupId, CONTROL_KIND);
      expect(await hintCount(authUid)).toBeGreaterThan(afterMuted);

      await runAdminSql(
        `DELETE FROM public.notification_preferences
          WHERE recipient_group_id = '${member.personalGroupId}';`,
      );
    });

    it('member_suppressible = false outranks a stored preference row written behind the contract’s back', async () => {
      // Bypasses set_own_notification_preference entirely — the substrate must
      // hold even when the contract is not the writer.
      await rawPreference(member.personalGroupId, LOCKED_CATEGORY, CHANNEL_IN_APP, false);

      const before = await deliveredCount(member.personalGroupId, LOCKED_KIND);
      await rawInsert(member.personalGroupId, LOCKED_KIND);
      expect(await deliveredCount(member.personalGroupId, LOCKED_KIND)).toBe(before + 1);

      await runAdminSql(
        `DELETE FROM public.notification_preferences
          WHERE recipient_group_id = '${member.personalGroupId}';`,
      );
    });

    it('ds5_may_deliver fails OPEN on an unknown kind, an unknown channel, and an unknown recipient', async () => {
      // Fail-open is a decision, not an accident, so it gets a guard. A missed
      // notification is invisible to the member; an unwanted one is not.
      const probe = async (recipient: string, kind: string, channel: string) =>
        (
          (
            await runAdminSql(
              `SELECT public.ds5_may_deliver('${recipient}', '${kind}', '${channel}') AS ok;`,
            )
          )[0] as { ok: boolean }
        ).ok;

      expect(await probe(member.personalGroupId, 'kind_that_does_not_exist', CHANNEL_IN_APP)).toBe(
        true,
      );
      expect(await probe(member.personalGroupId, MUTED_KIND, 'channel_that_does_not_exist')).toBe(
        true,
      );
      // An engagement group cannot own preference rows, so absence-means-allowed
      // already covers it — there should be no special-case code to find.
      expect(await probe(bystander.personalGroupId, MUTED_KIND, CHANNEL_IN_APP)).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  describe('STORY-3 — a member reads and sets their own preferences', () => {
    it('set is an idempotent own-subject upsert and returns the updated row', async () => {
      const c = await asUser(member);

      const { data: off, error: offErr } = await c.rpc('set_own_notification_preference', {
        p_category_key: MUTED_CATEGORY,
        p_channel: CHANNEL_IN_APP,
        p_allowed: false,
      });
      expect(offErr).toBeNull();
      expect((off as { allowed: boolean } | null)?.allowed).toBe(false);

      // Called twice — one row, not two.
      await c.rpc('set_own_notification_preference', {
        p_category_key: MUTED_CATEGORY,
        p_channel: CHANNEL_IN_APP,
        p_allowed: false,
      });
      const stored = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.notification_preferences
          WHERE recipient_group_id = '${member.personalGroupId}'
            AND category_key = '${MUTED_CATEGORY}' AND channel = '${CHANNEL_IN_APP}';`,
      );
      expect((stored[0] as { n: number }).n).toBe(1);

      // It wrote against the caller's OWN group, not some other member's.
      const owner = await runAdminSql(
        `SELECT recipient_group_id FROM public.notification_preferences
          WHERE category_key = '${MUTED_CATEGORY}' AND channel = '${CHANNEL_IN_APP}'
            AND recipient_group_id = '${member.personalGroupId}';`,
      );
      expect(owner).toHaveLength(1);

      const { data: on } = await c.rpc('set_own_notification_preference', {
        p_category_key: MUTED_CATEGORY,
        p_channel: CHANNEL_IN_APP,
        p_allowed: true,
      });
      expect((on as { allowed: boolean } | null)?.allowed).toBe(true);
    });

    it('an unknown category or channel is refused 22023', async () => {
      const c = await asUser(member);
      const { error: badCategory } = await c.rpc('set_own_notification_preference', {
        p_category_key: 'no-such-category',
        p_channel: CHANNEL_IN_APP,
        p_allowed: false,
      });
      expect((badCategory as { code?: string } | null)?.code).toBe('22023');

      const { error: badChannel } = await c.rpc('set_own_notification_preference', {
        p_category_key: MUTED_CATEGORY,
        p_channel: 'carrier-pigeon',
        p_allowed: false,
      });
      expect((badChannel as { code?: string } | null)?.code).toBe('22023');
    });

    it('muting a non-suppressible category is refused 42501 — with a reason, not silently ignored', async () => {
      const c = await asUser(member);
      const { error } = await c.rpc('set_own_notification_preference', {
        p_category_key: LOCKED_CATEGORY,
        p_channel: CHANNEL_IN_APP,
        p_allowed: false,
      });
      expect((error as { code?: string } | null)?.code).toBe('42501');

      // And nothing was written.
      const stored = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.notification_preferences
          WHERE recipient_group_id = '${member.personalGroupId}'
            AND category_key = '${LOCKED_CATEGORY}';`,
      );
      expect((stored[0] as { n: number }).n).toBe(0);
    });

    it('a Mist holds no durable preferences — both contracts refuse 28000', async () => {
      const mist = await asMist();
      const { error: readErr } = await mist.rpc('get_own_notification_preferences');
      expect((readErr as { code?: string } | null)?.code).toBe('28000');
      const { error: writeErr } = await mist.rpc('set_own_notification_preference', {
        p_category_key: MUTED_CATEGORY,
        p_channel: CHANNEL_IN_APP,
        p_allowed: false,
      });
      expect((writeErr as { code?: string } | null)?.code).toBe('28000');
      await mist.auth.signOut();
    });

    // Decomposition correction (2026-07-26): this assertion originally read the
    // preferences out of `get_own_notifications_export()`. That contract is a
    // shipped jsonb ARRAY of notifications, composed into `get_own_data_export()`
    // under the `notifications` key — turning it into an object to make room for
    // preferences would have broken PC008's composite and FEAT-H010's download,
    // i.e. exactly the sibling-breakage class TASK-INT-02 just diagnosed three
    // times. A payload-walk miss on my part, caught before the migration rather
    // than after: preferences get their OWN additive export contract, and the
    // shipped shape is untouched.
    it('preferences have their own export contract, additive to the shipped notifications array', async () => {
      const c = await asUser(member);
      await c.rpc('set_own_notification_preference', {
        p_category_key: MUTED_CATEGORY,
        p_channel: CHANNEL_IN_APP,
        p_allowed: false,
      });

      const { data, error } = await c.rpc('get_own_notification_preferences_export');
      expect(error).toBeNull();
      const prefs = data as { category_key: string; channel: string; allowed: boolean }[];
      expect(Array.isArray(prefs)).toBe(true);
      expect(
        prefs.some(
          (p) =>
            p.category_key === MUTED_CATEGORY &&
            p.channel === CHANNEL_IN_APP &&
            p.allowed === false,
        ),
      ).toBe(true);

      // The shipped notifications export is still an array — regression guard on
      // the contract this feature deliberately did not reshape.
      const { data: notifExport } = await c.rpc('get_own_notifications_export');
      expect(Array.isArray(notifExport)).toBe(true);

      await runAdminSql(
        `DELETE FROM public.notification_preferences
          WHERE recipient_group_id = '${member.personalGroupId}';`,
      );
    });
  });

  // ------------------------------------------------------------------
  describe('STORY-4 — the operator nudge policy is readable, settable, and priced', () => {
    it('the nudge policy read returns the ds5_config rows and every category’s nudge', async () => {
      const { data, error } = await asOperator.rpc('get_notification_nudge_policy');
      expect(error).toBeNull();
      const doc = data as {
        config: { key: string; value: string }[];
        categories: { key: string; nudge: boolean }[];
      };
      expect(
        doc.config.some(
          (c) => c.key === 'realtime_hint_platform_announcements' && c.value === 'false',
        ),
      ).toBe(true);
      expect(doc.categories.length).toBeGreaterThanOrEqual(6);
    });

    it('a non-admin cannot change the nudge policy — the gate is the contract', async () => {
      const c = await asUser(member);
      const { error: policyErr } = await c.rpc('set_notification_nudge_policy', {
        p_key: 'realtime_hint_platform_announcements',
        p_value: 'true',
      });
      expect((policyErr as { code?: string } | null)?.code).toBe('42501');

      const { error: categoryErr } = await c.rpc('set_notification_category_nudge', {
        p_category_key: MUTED_CATEGORY,
        p_nudge: false,
      });
      expect((categoryErr as { code?: string } | null)?.code).toBe('42501');

      // Unchanged on disk.
      const cfg = await runAdminSql(
        `SELECT value FROM public.ds5_config
          WHERE key = 'realtime_hint_platform_announcements';`,
      );
      expect((cfg[0] as { value: string }).value).toBe('false');
    });

    it('the reach count is a real measured number, not a warning', async () => {
      const { data, error } = await asOperator.rpc('get_platform_announcement_reach');
      expect(error).toBeNull();
      // The number ADR-U039:46's fan-out budget is discharged against — 1,274
      // reachable at the N-C measurement. Asserted as a floor, never absolute.
      expect(typeof data).toBe('number');
      expect(data as number).toBeGreaterThan(0);
    });

    it('PAIR: nudge = false stops the hint but not the delivery; nudge = true restores it', async () => {
      const authUid = member.user.id;

      await asOperator.rpc('set_notification_category_nudge', {
        p_category_key: CONTROL_CATEGORY,
        p_nudge: false,
      });
      const rowsBefore = await deliveredCount(member.personalGroupId, CONTROL_KIND);
      const hintsBefore = await hintCount(authUid);
      await rawInsert(member.personalGroupId, CONTROL_KIND);

      // Delivery unaffected — loudness changed, not reach.
      expect(await deliveredCount(member.personalGroupId, CONTROL_KIND)).toBe(rowsBefore + 1);
      expect(await hintCount(authUid)).toBe(hintsBefore);

      await asOperator.rpc('set_notification_category_nudge', {
        p_category_key: CONTROL_CATEGORY,
        p_nudge: true,
      });
      await rawInsert(member.personalGroupId, CONTROL_KIND);
      expect(await hintCount(authUid)).toBeGreaterThan(hintsBefore);
    });
  });

  // ------------------------------------------------------------------
  describe('Labelled regression guards — green pre- and post-apply, not red-first', () => {
    it('a client cannot reach the dispatcher directly (missing pre-apply, REVOKEd post-apply)', async () => {
      const c = await asUser(member);
      const { error } = await c.rpc('ds5_may_deliver', {
        p_recipient_group_id: member.personalGroupId,
        p_kind: MUTED_KIND,
        p_channel: CHANNEL_IN_APP,
      });
      expect(error).not.toBeNull();
      expect(['PGRST202', '42501']).toContain((error as { code?: string }).code);
    });

    it('N-C’s platform-announcement suppression still holds — this feature must not regress it', async () => {
      const authUid = member.user.id;
      const before = await hintCount(authUid);
      await rawInsert(member.personalGroupId, 'announcement', { scope_kind: 'platform' });
      // Config is 'false': the row is delivered, the hint is not emitted.
      expect(await hintCount(authUid)).toBe(before);
    });

    it('an unmuted member’s notification is delivered and readable through the contract', async () => {
      const before = await deliveredCount(member.personalGroupId, CONTROL_KIND);
      await rawInsert(member.personalGroupId, CONTROL_KIND);
      expect(await deliveredCount(member.personalGroupId, CONTROL_KIND)).toBe(before + 1);

      const c = await asUser(member);
      const { data, error } = await c.rpc('get_own_notifications', { p_limit: 50 });
      expect(error).toBeNull();
      // The contract's payload key is `kind`, not the column name `type` (N-A
      // renamed it at the contract boundary; the export does the same).
      expect((data as { kind: string }[]).some((n) => n.kind === CONTROL_KIND)).toBe(true);
    });
  });
});
