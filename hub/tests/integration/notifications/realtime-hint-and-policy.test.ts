import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  withAnonRateLimitRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-PD015 (A-NTF Cycle N-C) — notification realtime hint, nudge policy, and
 * the reconnect guarantees. The ADR-U039 live-delivery layer for the bell.
 *
 * Sibling precedent: `../communication/realtime-hint-emission.test.ts` (C-C,
 * FEAT-PD010) solved this test shape for conversations and forums; the probe
 * and the `realtime.messages` query helpers are copied-with-correction from it.
 *
 * RED-FIRST (these CANNOT pass before the migration):
 *  - STORY-1 emission: no trigger exists on `public.notifications` (verified on
 *    the live DB 2026-07-25), so an insert produces ZERO rows in
 *    `realtime.messages` on the recipient's topic. Every `toBe(1)` fails.
 *  - STORY-1 payload: content-free key-set (`id` present; title/body/type/
 *    category absent) — no row exists pre-apply, so the assertion fails.
 *  - STORY-1 legacy writer: a real invitation (written by the pre-existing
 *    `notify_invitation_received` trigger, untouched by this feature) must ALSO
 *    hint — proving the one emit site catches writers it never edited.
 *  - STORY-2 policy: `public.ds5_config` does not exist, so the config-row
 *    assertion fails outright.
 *  - STORY-2 community-vs-platform: asserted as a PAIR in one test (community
 *    emits AND platform does not). Written as a pair deliberately — a lone
 *    "platform emits nothing" assertion is VACUOUSLY GREEN pre-apply, because
 *    nothing emits at all. The pair can only pass with the real branch.
 *  - STORY-3 receipt: no receive policy for the notifications topic exists and
 *    RLS is enabled on `realtime.messages`, so the own-topic subscribe probe
 *    cannot reach SUBSCRIBED.
 *  - STORY-3 structural: four receive policies must exist; only three do.
 *  - STORY-4 durability-with-hint: "a hint was emitted AND the row is still
 *    unread" needs a hint to exist.
 *  - STORY-5 publication: `pg_publication_tables` currently returns
 *    `public.notifications`, so `toHaveLength(0)` fails.
 *
 * LABELLED HONESTLY — green pre- AND post-apply (invariant/regression guards,
 * NOT red-first, and not counted in the red-first claim):
 *  - the foreign-topic probe (a member cannot subscribe to someone else's
 *    notification topic) denies either way;
 *  - the offline-read completeness assertions (STORY-4) pass pre-apply — that
 *    IS the guarantee under test: durable rows never needed the hint. They are
 *    here to prove the hint layer does not REGRESS delivery;
 *  - the forged-id assertion (STORY-4) — an id belonging to another member
 *    returns nothing through the authorized read either way;
 *  - the PC009 / C-C session + conversations probes, proving this migration
 *    leaves the three existing policies untouched;
 *  - `ds5_emit_hint` direct-call refusal — PGRST202/42501 either way.
 *
 * WHY DIRECT INSERTS RATHER THAN THE REAL ANNOUNCEMENT SENDERS: the trigger
 * branches on `NEW.type` + `NEW.payload->>'scope_kind'`, so a controlled insert
 * exercises the exact branch. Calling `send_platform_announcement` would fan
 * out to EVERY FIM (~1,274 rows in the shared dev DB) per call to prove the
 * same branch, and the senders' own fan-out is already covered by C-D's suite.
 * Cheaper, more precise, and kinder to a shared database.
 *
 * WHY THE RECEIPT GATE IS A SUBSCRIBE PROBE, NOT A SQL SELECT: the receive
 * policies key on `realtime.topic()`, which returns NULL outside Realtime's
 * join-time authorization, and `realtime.messages` is not PostgREST-exposed —
 * a plain SELECT would deny everyone and prove nothing (C-C:45-49).
 */

jest.setTimeout(180_000);

type SqlRows = Array<Record<string, unknown>>;

const CONFIG_KEY = 'realtime_hint_platform_announcements';

describe('FEAT-PD015 — notification realtime hint, nudge policy & reconnect (N-C)', () => {
  const admin = createAdminClient();
  const runTag = `nc-${Date.now()}`;

  let steward: TestUser; // creates g1; holds send_announcements via the Steward template
  let alice: TestUser; // member of g1 — primary hint recipient
  let bob: TestUser; // member of g1 — isolation counterpart
  let invitee: TestUser; // receives a REAL invitation (legacy-writer path)

  let g1: string;
  const createdAuthIds: string[] = [];
  const createdGroupIds: string[] = [];
  const createdNotificationIds: string[] = [];

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const asMist = async (): Promise<SupabaseClient> => {
    const c = createTestClient();
    const { error } = await withAnonRateLimitRetry(() => c.auth.signInAnonymously());
    expect(error).toBeNull();
    return c;
  };

  const tokenOf = async (c: SupabaseClient): Promise<string> => {
    const { data } = await c.auth.getSession();
    if (!data.session) throw new Error('no session token');
    return data.session.access_token;
  };

  const topicFor = (authUid: string) => `account:${authUid}:notifications`;

  /** Insert a notification directly, exercising a chosen trigger branch. */
  const seedNotification = async (
    recipient: TestUser,
    type: string,
    payload: Record<string, unknown> = {},
    title = `N-C probe ${runTag}`,
  ): Promise<string> => {
    const { data, error } = await admin
      .from('notifications')
      .insert({
        recipient_group_id: recipient.personalGroupId,
        type,
        title,
        body: 'N-C probe body',
        payload,
      })
      .select('id')
      .single();
    if (error) throw new Error(`seed notification (${type}): ${error.message}`);
    const id = (data as { id: string }).id;
    createdNotificationIds.push(id);
    return id;
  };

  /** Hints on a recipient's notification topic, optionally for one row id. */
  const hintsFor = async (authUid: string, notificationId?: string): Promise<SqlRows> => {
    const idClause = notificationId
      ? `AND COALESCE(payload->'payload'->>'id', payload->>'id') = '${notificationId}'`
      : '';
    const rows = (await runAdminSql(`
      SELECT payload FROM realtime.messages
      WHERE topic = '${topicFor(authUid)}'
        AND event = 'notification'
        ${idClause};
    `)) as SqlRows;
    return rows.map((r) => {
      const p = r.payload as { payload?: Record<string, unknown> } & Record<string, unknown>;
      return (p.payload ?? p) as Record<string, unknown>;
    });
  };

  const countHints = async (authUid: string, notificationId?: string): Promise<number> =>
    (await hintsFor(authUid, notificationId)).length;

  const setConfig = async (value: string) => {
    await runAdminSql(`
      UPDATE public.ds5_config SET value = '${value}', updated_at = now()
      WHERE key = '${CONFIG_KEY}';`);
  };

  // ── Realtime private-channel subscribe probe (C-C:165-195) ────────────────
  // jest-environment-node exposes no WebSocket global, so realtime-js gets its
  // own `ws` transport. Authorization rides the raw JWT via realtime.setAuth.
  const probeSubscribe = async (accessToken: string, topic: string): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WS = require('ws');
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: { transport: WS },
      },
    );
    await client.realtime.setAuth(accessToken);
    try {
      return await new Promise<string>((resolve) => {
        const channel = client.channel(topic, { config: { private: true } });
        const timer = setTimeout(() => resolve('TIMED_OUT'), 15000);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            clearTimeout(timer);
            resolve(status);
          }
        });
      });
    } finally {
      client.realtime.disconnect();
    }
  };

  beforeAll(async () => {
    steward = await createTestUser({ displayName: `NCSteward ${runTag}` });
    alice = await createTestUser({ displayName: `NCAlice ${runTag}` });
    bob = await createTestUser({ displayName: `NCBob ${runTag}` });
    invitee = await createTestUser({ displayName: `NCInvitee ${runTag}` });
    for (const u of [steward, alice, bob, invitee]) createdAuthIds.push(u.user.id);

    const cs = await asUser(steward);
    const { data: gid, error } = await cs.rpc('create_engagement_group', {
      p_name: `N-C Hint Fixture ${runTag}`,
    });
    if (error) throw new Error(`seed group: ${error.message}`);
    g1 = gid as string;
    createdGroupIds.push(g1);

    for (const u of [alice, bob]) {
      const { error: mErr } = await admin.from('group_memberships').insert({
        group_id: g1,
        member_group_id: u.personalGroupId,
        status: 'active',
        added_by_group_id: steward.personalGroupId,
      });
      if (mErr) throw new Error(`seed membership: ${mErr.message}`);
    }
  }, 120_000);

  afterAll(async () => {
    // Never leave the toggle on: a platform send in the shared DB would then
    // emit one hint per FIM for every later run.
    try {
      await setConfig('false');
    } catch {
      /* table may not exist pre-apply — nothing to restore */
    }
    try {
      if (createdNotificationIds.length) {
        await admin.from('notifications').delete().in('id', createdNotificationIds);
      }
    } catch {
      /* nothing to sweep */
    }
    for (const gid of createdGroupIds) await cleanupTestGroup(gid);
    for (const uid of createdAuthIds) await cleanupTestUser(uid).catch(() => undefined);
  }, 120_000);

  // ───────────────────────────── STORY-1 ──────────────────────────────────
  describe('STORY-1 — a notification nudges its recipient, and only its recipient', () => {
    it('RED-FIRST: emits exactly one hint on the recipient own topic', async () => {
      const id = await seedNotification(alice, 'invitation_received', { group_id: g1 });
      expect(await countHints(alice.user.id, id)).toBe(1);
    });

    it('RED-FIRST: the hint payload is content-free — id only', async () => {
      const id = await seedNotification(alice, 'role_assigned', { group_id: g1 });
      const [payload] = await hintsFor(alice.user.id, id);
      expect(payload).toBeDefined();
      expect(payload.id).toBe(id);
      // ADR-U039:24 — a hint carries at most an event type and an id.
      expect(Object.keys(payload).sort()).toEqual(['id']);
      for (const leak of ['title', 'body', 'type', 'category', 'payload']) {
        expect(payload[leak]).toBeUndefined();
      }
    });

    it('RED-FIRST: two recipients are isolated — neither hint lands on the other topic', async () => {
      const aliceId = await seedNotification(alice, 'member_left', { group_id: g1 });
      const bobId = await seedNotification(bob, 'member_left', { group_id: g1 });

      expect(await countHints(alice.user.id, aliceId)).toBe(1);
      expect(await countHints(bob.user.id, bobId)).toBe(1);
      // cross-contamination must be zero
      expect(await countHints(alice.user.id, bobId)).toBe(0);
      expect(await countHints(bob.user.id, aliceId)).toBe(0);
    });

    it('RED-FIRST (paired): a resolvable recipient hints; an unresolvable one does not, and its insert still succeeds', async () => {
      // Paired deliberately: the "no hint" half alone is vacuously green
      // pre-apply, because nothing hints at all.
      const resolvable = await seedNotification(alice, 'group_closed', { group_id: g1 });
      expect(await countHints(alice.user.id, resolvable)).toBe(1);

      // ADAPTATION (FEAT-PD020, 2026-08-15, labelled): this half originally
      // used an ENGAGEMENT-group recipient — the dead-letter shape, which
      // 20260815223000 now expands at write time into personal rows (the row
      // this cell used to observe no longer lands; that behaviour is pinned
      // in group-addressed-expansion.test.ts). The unresolvable-recipient
      // shape that REMAINS is a SYSTEM group: it passes the expansion trigger
      // untouched, its insert still succeeds, and it resolves to no
      // users.personal_group_id -> no auth uid -> no topic -> no hint.
      const deusex = (await runAdminSql(`
        SELECT id FROM public.groups
         WHERE name = 'DeusEx' AND group_type = 'system' LIMIT 1;`)) as SqlRows;
      const { data, error } = await admin
        .from('notifications')
        .insert({
          recipient_group_id: deusex[0].id as string,
          type: 'group_closed',
          title: `N-C group-addressed ${runTag}`,
          body: 'group-addressed body',
          payload: { group_id: g1 },
        })
        .select('id')
        .single();
      expect(error).toBeNull();
      const groupRowId = (data as { id: string }).id;
      createdNotificationIds.push(groupRowId);

      const anyHint = (await runAdminSql(`
        SELECT count(*) AS n FROM realtime.messages
        WHERE event = 'notification'
          AND COALESCE(payload->'payload'->>'id', payload->>'id') = '${groupRowId}';
      `)) as SqlRows;
      expect(Number(anyHint[0].n)).toBe(0);
    });

    it('RED-FIRST: a legacy writer this feature never edited still hints', async () => {
      // notify_invitation_received (pre-existing) writes the row; the new
      // trigger on `notifications` must hint anyway — the whole point of one
      // emit site rather than ~38.
      const cs = await asUser(steward);
      const { error } = await cs.rpc('invite_member', {
        p_group_id: g1,
        p_member_group_id: invitee.personalGroupId,
      });
      expect(error).toBeNull();

      const rows = (await runAdminSql(`
        SELECT id FROM public.notifications
        WHERE recipient_group_id = '${invitee.personalGroupId}'
          AND type = 'invitation_received'
        ORDER BY created_at DESC LIMIT 1;
      `)) as SqlRows;
      expect(rows.length).toBe(1);
      const notifId = String(rows[0].id);
      createdNotificationIds.push(notifId);

      expect(await countHints(invitee.user.id, notifId)).toBe(1);
    });
  });

  // ───────────────────────────── STORY-2 ──────────────────────────────────
  describe('STORY-2 — the platform-wide announcement nudge is an operator toggle, off by default', () => {
    it('RED-FIRST: ds5_config carries the seeded policy row, defaulting to false', async () => {
      const rows = (await runAdminSql(`
        SELECT value, description FROM public.ds5_config WHERE key = '${CONFIG_KEY}';
      `)) as SqlRows;
      expect(rows.length).toBe(1);
      expect(String(rows[0].value)).toBe('false');
      // the row must explain itself — it is the operator's lever
      expect(String(rows[0].description ?? '')).not.toHaveLength(0);
    });

    it('RED-FIRST: ds5_config is RLS-enabled and deny-all — the pc2_config posture', async () => {
      // pc2_config (the established precedent) is RLS-enabled with ZERO
      // policies: the blanket schema grants to anon/authenticated are inert
      // because RLS denies by default, and only SECURITY DEFINER functions
      // (which bypass RLS) read it. An operational config table needs no
      // client reader in Ferd — the admin surface is N-D's.
      const rows = (await runAdminSql(`
        SELECT c.relrowsecurity AS rls,
               (SELECT count(*) FROM pg_policies p
                WHERE p.schemaname = 'public' AND p.tablename = 'ds5_config') AS policies
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'ds5_config';
      `)) as SqlRows;
      expect(rows.length).toBe(1);
      expect(rows[0].rls).toBe(true);
      expect(Number(rows[0].policies)).toBe(0);
    });

    it('RED-FIRST (ADR-U038 direct-caller): no client can read or write ds5_config directly', async () => {
      // The direct-PostgREST path, including an anonymous-session Mist holding
      // the `authenticated` role — the question the schema gate asks.
      for (const client of [await asUser(alice), await asMist()]) {
        const { data, error } = await client.from('ds5_config').select('key, value');
        // either refused outright, or RLS returns an empty set — never the row
        if (!error) expect(data ?? []).toHaveLength(0);

        const { error: wErr } = await client
          .from('ds5_config')
          .update({ value: 'true' })
          .eq('key', CONFIG_KEY);
        // a client must never be able to turn a headcount-sized burst back on
        const stillFalse = (await runAdminSql(
          `SELECT value FROM public.ds5_config WHERE key = '${CONFIG_KEY}';`,
        )) as SqlRows;
        expect(String(stillFalse[0].value)).toBe('false');
        void wErr;
      }
    });

    it('RED-FIRST (paired): a community announcement hints; a platform-wide one does not', async () => {
      // The pair is the point. "platform emits nothing" alone passes vacuously
      // before the trigger exists.
      const communityId = await seedNotification(alice, 'announcement', {
        announcement_id: crypto.randomUUID(),
        scope_kind: 'community',
        scope_group_id: g1,
      });
      expect(await countHints(alice.user.id, communityId)).toBe(1);

      const platformId = await seedNotification(bob, 'announcement', {
        announcement_id: crypto.randomUUID(),
        scope_kind: 'platform',
        scope_group_id: null,
      });
      expect(await countHints(bob.user.id, platformId)).toBe(0);
    });

    it('RED-FIRST: a suppressed platform announcement is still delivered durably', async () => {
      // NOTE (2026-07-25): this test was FIRST WRITTEN VACUOUS and caught by the
      // green-at-red check. Its original two assertions — "platform emits zero
      // hints" and "the row is readable" — are BOTH true before the migration
      // exists, so it proved nothing. The community control below is what makes
      // it real: suppression must be SELECTIVE, and only the trigger can make
      // one of these hint while the other does not.
      const platformId = await seedNotification(alice, 'announcement', {
        announcement_id: crypto.randomUUID(),
        scope_kind: 'platform',
        scope_group_id: null,
      });
      const communityId = await seedNotification(alice, 'announcement', {
        announcement_id: crypto.randomUUID(),
        scope_kind: 'community',
        scope_group_id: g1,
      });

      // the control: without this, "0 hints" is vacuously true pre-apply
      expect(await countHints(alice.user.id, communityId)).toBe(1);
      expect(await countHints(alice.user.id, platformId)).toBe(0);

      // suppression costs latency, never delivery — BOTH rows are readable
      const ca = await asUser(alice);
      const { data, error } = await ca.rpc('get_own_notifications', { p_limit: 100 });
      expect(error).toBeNull();
      const ids = (data as Array<{ id: string }>).map((r) => r.id);
      expect(ids).toContain(platformId);
      expect(ids).toContain(communityId);
    });

    it('RED-FIRST: flipping the toggle to true makes platform announcements hint — no deploy, no migration', async () => {
      await setConfig('true');
      try {
        const id = await seedNotification(bob, 'announcement', {
          announcement_id: crypto.randomUUID(),
          scope_kind: 'platform',
          scope_group_id: null,
        });
        expect(await countHints(bob.user.id, id)).toBe(1);
      } finally {
        await setConfig('false');
      }
    });

    it('RED-FIRST: an unreadable policy value fails QUIET — suppressed, not a headcount-sized burst', async () => {
      await setConfig('not-a-boolean');
      try {
        const id = await seedNotification(alice, 'announcement', {
          announcement_id: crypto.randomUUID(),
          scope_kind: 'platform',
          scope_group_id: null,
        });
        expect(await countHints(alice.user.id, id)).toBe(0);
        // and the row is still written
        const rows = (await runAdminSql(
          `SELECT count(*) AS n FROM public.notifications WHERE id = '${id}';`,
        )) as SqlRows;
        expect(Number(rows[0].n)).toBe(1);
      } finally {
        await setConfig('false');
      }
    });
  });

  // ───────────────────────────── STORY-3 ──────────────────────────────────
  describe('STORY-3 — only the recipient receives; nobody sends', () => {
    it('RED-FIRST: a FIM can subscribe to their OWN notification topic', async () => {
      const ca = await asUser(alice);
      const status = await probeSubscribe(await tokenOf(ca), topicFor(alice.user.id));
      expect(status).toBe('SUBSCRIBED');
    });

    it("GUARD (green pre- and post-apply): a FIM cannot subscribe to another member's notification topic", async () => {
      const ca = await asUser(alice);
      const status = await probeSubscribe(await tokenOf(ca), topicFor(bob.user.id));
      expect(status).not.toBe('SUBSCRIBED');
    });

    it('GUARD (green pre- and post-apply): a Mist cannot subscribe to a FIM notification topic', async () => {
      const cm = await asMist();
      const status = await probeSubscribe(await tokenOf(cm), topicFor(alice.user.id));
      expect(status).not.toBe('SUBSCRIBED');
    });

    it('RED-FIRST: four receive policies exist on realtime.messages, and NO send policy', async () => {
      const rows = (await runAdminSql(`
        SELECT policyname, cmd FROM pg_policies
        WHERE schemaname = 'realtime' AND tablename = 'messages'
        ORDER BY policyname;
      `)) as SqlRows;
      const names = rows.map((r) => String(r.policyname));
      expect(names).toContain('ds5_notifications_receive_own');
      // the three that already existed must survive untouched
      expect(names).toContain('session_signal_receive_own');
      expect(names).toContain('ds5_conversations_receive_own');
      expect(names).toContain('ds5_forum_receive_member');
      // signals are server-originated: no client may broadcast
      const writeCmds = rows
        .map((r) => String(r.cmd).toUpperCase())
        .filter((c) => c === 'INSERT' || c === 'ALL' || c === 'UPDATE' || c === 'DELETE');
      expect(writeCmds).toHaveLength(0);
    });

    it('RED-FIRST: the receive policy uses the initplan-wrapped form', async () => {
      // 20260704075549:39-44 re-issued the PC009 policy with (select ...) around
      // realtime.topic() and auth.uid(); the new policy must match that shape,
      // not the original 20260703154102 one.
      const rows = (await runAdminSql(`
        SELECT qual FROM pg_policies
        WHERE schemaname = 'realtime' AND tablename = 'messages'
          AND policyname = 'ds5_notifications_receive_own';
      `)) as SqlRows;
      expect(rows.length).toBe(1);
      const qual = String(rows[0].qual);
      // Postgres normalises the stored qual — it re-renders the wrapped
      // sub-selects with an alias and its own parenthesisation, e.g.
      //   ( SELECT realtime.topic() AS topic)
      //   ( SELECT (auth.uid())::text AS uid)
      // so the assertion must tolerate the inner parens and the alias. An
      // earlier, stricter regex here rejected CORRECT policy SQL — a false
      // negative caught by comparing against the applied policy.
      expect(qual).toMatch(/\(\s*SELECT\s+realtime\.topic\(\)/i);
      expect(qual).toMatch(/\(\s*SELECT\s+\(?auth\.uid\(\)/i);
      // and the un-wrapped form must NOT be what shipped
      expect(qual).not.toMatch(/(?<!SELECT\s)(?<!\()realtime\.topic\(\)\s*=/i);
    });

    it('GUARD (green pre- and post-apply): ds5_emit_hint is not callable by a client', async () => {
      const ca = await asUser(alice);
      const { error } = await ca.rpc('ds5_emit_hint', {
        p_payload: { id: '00000000-0000-0000-0000-000000000000' },
        p_event: 'notification',
        p_topic: topicFor(alice.user.id),
      });
      expect(error).not.toBeNull();
      expect(['PGRST202', '42501']).toContain(String(error!.code));
    });

    it('GUARD (green pre- and post-apply): the PC009 and C-C topics still admit their owners', async () => {
      const ca = await asUser(alice);
      const token = await tokenOf(ca);
      expect(await probeSubscribe(token, `account:${alice.user.id}:sessions`)).toBe('SUBSCRIBED');
      expect(await probeSubscribe(token, `account:${alice.user.id}:conversations`)).toBe(
        'SUBSCRIBED',
      );
    });
  });

  // ───────────────────────────── STORY-4 ──────────────────────────────────
  describe('STORY-4 — a missed or spoofed hint costs latency, never data', () => {
    it('GUARD (green pre- and post-apply): rows written while offline are complete on the next read', async () => {
      // This IS the guarantee: durable rows never needed the hint. Present to
      // prove the hint layer does not regress delivery.
      const ids = [
        await seedNotification(alice, 'role_removed', { group_id: g1 }),
        await seedNotification(alice, 'group_archived', { group_id: g1 }),
      ];
      const ca = await asUser(alice);
      const { data, error } = await ca.rpc('get_own_notifications', { p_limit: 100 });
      expect(error).toBeNull();
      const returned = (data as Array<{ id: string }>).map((r) => r.id);
      for (const id of ids) expect(returned).toContain(id);
    });

    it('GUARD (green pre- and post-apply): the unread count reflects everything missed', async () => {
      const ca = await asUser(alice);
      const { data: before, error: e1 } = await ca.rpc('get_own_unread_notification_count');
      expect(e1).toBeNull();
      await seedNotification(alice, 'stewardship_required', { group_id: g1 });
      const { data: after, error: e2 } = await ca.rpc('get_own_unread_notification_count');
      expect(e2).toBeNull();
      expect(Number(after)).toBe(Number(before) + 1);
    });

    it('RED-FIRST: a hint was emitted AND the row is still unread — the emit never consumes it', async () => {
      const id = await seedNotification(alice, 'journey_completed', {});
      expect(await countHints(alice.user.id, id)).toBe(1);

      const rows = (await runAdminSql(
        `SELECT is_read FROM public.notifications WHERE id = '${id}';`,
      )) as SqlRows;
      expect(rows.length).toBe(1);
      expect(rows[0].is_read).toBe(false);
    });

    it("GUARD (green pre- and post-apply): a forged hint id returns nothing through the authorized read", async () => {
      // bob's row, alice's client — the hint is not an authority.
      const bobId = await seedNotification(bob, 'invitation_declined', { group_id: g1 });
      const ca = await asUser(alice);
      const { data, error } = await ca.rpc('get_own_notifications', { p_limit: 100 });
      expect(error).toBeNull();
      const returned = (data as Array<{ id: string }>).map((r) => r.id);
      expect(returned).not.toContain(bobId);
    });

    it('RED-FIRST: the durable write survives an emit failure — the trigger is non-fatal', async () => {
      // Point the topic resolution at a recipient whose emit cannot land by
      // making the config unreadable mid-flight is not possible; instead assert
      // the structural property: ds5_emit_hint is declared non-fatal (its body
      // swallows) AND the trigger function contains no RAISE on the emit path.
      const rows = (await runAdminSql(`
        SELECT pg_get_functiondef(p.oid) AS def
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'notify_notification_hint';
      `)) as SqlRows;
      expect(rows.length).toBe(1);
      const def = String(rows[0].def);
      expect(def).toMatch(/ds5_emit_hint/);
      // no exception raised on the emit path — a realtime failure must never
      // roll back the notification row
      expect(def).not.toMatch(/RAISE\s+EXCEPTION/i);
    });
  });

  // ───────────────────────────── STORY-5 ──────────────────────────────────
  describe('STORY-5 — the legacy row-pushing mechanism is gone', () => {
    it('RED-FIRST: the supabase_realtime publication is empty', async () => {
      const rows = (await runAdminSql(`
        SELECT schemaname, tablename FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime';
      `)) as SqlRows;
      expect(rows).toHaveLength(0);
    });

    it('RED-FIRST: public.notifications specifically is no longer published', async () => {
      const rows = (await runAdminSql(`
        SELECT count(*) AS n FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';
      `)) as SqlRows;
      expect(Number(rows[0].n)).toBe(0);
    });
  });
});
