import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
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

jest.setTimeout(180_000); // real-substrate suite: many users, groups, sign-ins

/**
 * FEAT-PC017 (C-F, IDN-10) — account lifecycle self-service — RED-FIRST.
 * Also carries FEAT-PC005 STORY-6 (the reactivation origin gate).
 *
 * Written BEFORE the C-F schema-gate migration. Expected red classes pre-apply:
 *   - PGRST202 / 42883 — pause_own_account / delete_own_account /
 *     reactivate_own_account do not exist yet
 *   - 42703 — users.deactivation_origin does not exist yet (fixture sets and
 *     row asserts via runAdminSql)
 *   - payload-key fails — get_own_account_state() carries no
 *     deactivation_origin key and never returns 'paused'
 *   - S8a — admin_exit_user_from_platform still exists (retirement pending)
 * LABELLED GREEN (green before AND after by design — never claimed as red-first):
 *   - S1c — pause-cascades-nothing invariant-holds baseline
 *   - S6a-pre — fixture pre-condition (a live session exists to kill)
 *   - S8b — the admin lifecycle RPCs exist and stay untouched
 *
 * Board decisions under test (C-F 2026-07-21): F-1 full slice, F-2
 * private-erase + communal-tombstone, F-3 immediate + confirm.
 *
 * COR-C W1 (2026-07-30, AC3-2): STORY-2's hold fixture now drives the REAL
 * producer — admin_update_user_status() as a manage_all_groups actor — instead
 * of hand-writing a row shape no production path creates. RED pre-W1-migration
 * (20260730210000): the S2a/S2c origin asserts; green after.
 */

const RPC_PAUSE = 'pause_own_account';
const RPC_DELETE = 'delete_own_account';
const RPC_REACTIVATE = 'reactivate_own_account';

describe('FEAT-PC017 — account lifecycle self-service (C-F red suite)', () => {
  const admin = createAdminClient();

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  /** Lifecycle columns incl. the C-F origin field — 42703 pre-apply (named red). */
  const lifecycleRowOf = async (authUserId: string) =>
    (
      await runAdminSql(
        `SELECT is_active, is_decommissioned, deactivation_origin, nickname, bio
           FROM public.users WHERE auth_user_id = '${authUserId}';`,
      )
    )[0];

  /** Authenticated DeusEx caller — the house manage_all_groups elevation. */
  const makePlatformAdmin = async (personalGroupId: string): Promise<void> => {
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
  };

  const demotePlatformAdmin = async (personalGroupId: string): Promise<void> => {
    await runAdminSql(`
      DO $$
      DECLARE v_deusex uuid;
      BEGIN
        SELECT id INTO v_deusex FROM public.groups
          WHERE name = 'DeusEx' AND group_type = 'system';
        DELETE FROM public.user_group_roles
          WHERE member_group_id = '${personalGroupId}' AND group_id = v_deusex;
        DELETE FROM public.group_memberships
          WHERE group_id = v_deusex AND member_group_id = '${personalGroupId}';
      END $$;`).catch(() => undefined);
  };

  /**
   * COR-C W1 (AC3-2): the admin hold is imposed through the REAL producer —
   * admin_update_user_status() as an authenticated manage_all_groups actor —
   * never by fixture SQL. The transient actor is demoted and removed before
   * the helper returns.
   */
  const setAdminHold = async (authUserId: string): Promise<void> => {
    const actor = await createTestUser({ displayName: 'Ada Adminhold' });
    try {
      await makePlatformAdmin(actor.personalGroupId);
      const c = await asUser(actor);
      const target = await runAdminSql(
        `SELECT id FROM public.users WHERE auth_user_id = '${authUserId}';`,
      );
      const { error } = await c.rpc('admin_update_user_status', {
        target_user_id: target[0].id,
        new_is_active: false,
      });
      if (error) throw new Error(`producer hold fixture: ${error.message}`);
      await c.auth.signOut();
    } finally {
      await demotePlatformAdmin(actor.personalGroupId);
      await cleanupTestUser(actor.user.id);
    }
  };

  const readState = async (client: SupabaseClient) => {
    const { data, error } = await client.rpc('get_own_account_state');
    if (error) throw new Error(`get_own_account_state: ${error.message}`);
    return data as {
      state: string;
      is_active: boolean;
      is_decommissioned: boolean;
      deactivation_origin: string | null;
    };
  };

  const auditCount = async (action: string, actorGroupId: string): Promise<number> => {
    const rows = await runAdminSql(
      `SELECT count(*)::int AS n FROM public.admin_audit_log
        WHERE action = '${action}' AND actor_group_id = '${actorGroupId}';`,
    );
    return rows[0].n as number;
  };

  const sessionCount = async (authUserId: string): Promise<number> => {
    const rows = await runAdminSql(
      `SELECT count(*)::int AS n FROM auth.sessions WHERE user_id = '${authUserId}';`,
    );
    return rows[0].n as number;
  };

  describe('STORY-1 + STORY-7: pause is a cascade-free, audited, idempotent absence', () => {
    let paula: TestUser;
    let groupId: string;

    beforeAll(async () => {
      paula = await createTestUser({ displayName: 'Paula Pauser' });
      const c = await asUser(paula);
      const { data, error } = await c.rpc('create_engagement_group', {
        p_name: 'CF Pause Fixture',
      });
      if (error) throw new Error(`group fixture: ${error.message}`);
      groupId = data as string;
      await c.auth.signOut();
    });
    afterAll(async () => {
      if (groupId) await cleanupTestGroup(groupId);
      if (paula) await cleanupTestUser(paula.user.id);
    });

    it('S1a: an active FIM pauses; the state read answers paused with member origin', async () => {
      const c = await asUser(paula);
      const { error } = await c.rpc(RPC_PAUSE);
      expect(error).toBeNull(); // RED pre-apply: PGRST202

      const state = await readState(c);
      expect(state.state).toBe('paused');
      expect(state.is_active).toBe(false);
      expect(state.is_decommissioned).toBe(false);
      expect(state.deactivation_origin).toBe('member');
    });

    it('S1b + S7: a second pause is an idempotent success with exactly one audit row', async () => {
      const c = await asUser(paula);
      const { error } = await c.rpc(RPC_PAUSE);
      expect(error).toBeNull(); // RED pre-apply: PGRST202
      expect(await auditCount('self_pause_account', paula.personalGroupId)).toBe(1);
    });

    it('S1c [LABELLED GREEN — invariant-holds, green before and after]: pause cascades nothing — memberships, roles, group untouched', async () => {
      const count = async (sql: string) =>
        (await runAdminSql(sql))[0].n as number;
      const memberships = `SELECT count(*)::int AS n FROM public.group_memberships
        WHERE member_group_id = '${paula.personalGroupId}' AND status = 'active';`;
      const roles = `SELECT count(*)::int AS n FROM public.user_group_roles
        WHERE member_group_id = '${paula.personalGroupId}';`;

      // Paula is already paused from S1a — the counts must equal a never-paused
      // baseline: her Steward membership + role from the fixture group plus the
      // system enrolments createTestUser produces. Assert non-zero and stable.
      const m = await count(memberships);
      const r = await count(roles);
      expect(m).toBeGreaterThan(0); // membership rows survived the pause
      expect(r).toBeGreaterThan(0); // role rows survived the pause

      // And the group itself is untouched by a member's pause.
      const g = await runAdminSql(
        `SELECT status FROM public.groups WHERE id = '${groupId}';`,
      );
      expect(g[0].status).toBe('active');
    });
  });

  describe('STORY-2: an admin hold is never self-escapable', () => {
    let harry: TestUser;

    beforeAll(async () => {
      harry = await createTestUser({ displayName: 'Harry Held' });
      await setAdminHold(harry.user.id); // producer-driven since COR-C W1 (AC3-2)
    });
    afterAll(async () => {
      if (harry) await cleanupTestUser(harry.user.id);
    });

    it('S2a: pause rejects on an admin-held account, changing nothing', async () => {
      const c = await asUser(harry);
      const { error } = await c.rpc(RPC_PAUSE);
      expect(error).not.toBeNull();
      const row = await lifecycleRowOf(harry.user.id);
      expect(row.is_active).toBe(false);
      expect(row.deactivation_origin).toBe('admin');
    });

    it('S2b: delete rejects on an admin-held account — the hold is not escapable', async () => {
      const c = await asUser(harry);
      const { error } = await c.rpc(RPC_DELETE);
      expect(error).not.toBeNull();
      const row = await lifecycleRowOf(harry.user.id);
      expect(row.is_decommissioned).toBe(false);
    });

    it('S2c (PC005 STORY-6): reactivate rejects an admin-origin hold', async () => {
      const c = await asUser(harry);
      const { error } = await c.rpc(RPC_REACTIVATE);
      expect(error).not.toBeNull();
      const row = await lifecycleRowOf(harry.user.id);
      expect(row.is_active).toBe(false);
      expect(row.deactivation_origin).toBe('admin');
    });
  });

  describe('STORY-3 + PC005 STORY-6: the origin field splits paused from suspended', () => {
    let nora: TestUser; // off with no origin recorded (the pre-origin shape)
    let rita: TestUser; // pause -> reactivate round trip

    beforeAll(async () => {
      nora = await createTestUser({ displayName: 'Nora Norigin' });
      rita = await createTestUser({ displayName: 'Rita Returns' });
      const { error } = await admin
        .from('users')
        .update({ is_active: false })
        .eq('auth_user_id', nora.user.id);
      if (error) throw error;
    });
    afterAll(async () => {
      if (nora) await cleanupTestUser(nora.user.id);
      if (rita) await cleanupTestUser(rita.user.id);
    });

    it('S3a: an off row without member origin reads suspended — and the payload carries the origin key', async () => {
      const c = await asUser(nora);
      const state = await readState(c);
      expect(state.state).toBe('suspended'); // never 'paused' without member origin
      // RED pre-apply: the key does not exist on the payload at all.
      expect('deactivation_origin' in state).toBe(true);
      expect(state.deactivation_origin).not.toBe('member');
    });

    it('S3b (PC005 STORY-6): pause then reactivate — success, active again, origin cleared', async () => {
      const c = await asUser(rita);
      const { error: pauseErr } = await c.rpc(RPC_PAUSE);
      expect(pauseErr).toBeNull(); // RED pre-apply: PGRST202

      const { error: reactErr } = await c.rpc(RPC_REACTIVATE);
      expect(reactErr).toBeNull();

      const state = await readState(c);
      expect(state.state).toBe('active');
      expect(state.deactivation_origin).toBeNull();
      expect(await auditCount('self_reactivate_account', rita.personalGroupId)).toBe(1);
    });
  });

  describe('STORY-4/5/6/7: the departing member — walk, F-2 split, terminal, audited', () => {
    // dave: regular member of sam's group, with a lived record (enrolment,
    // journal), communal contributions (forum post, DM with sam), and an open
    // session. One delete; many assertions.
    let sam: TestUser;
    let dave: TestUser;
    let groupId: string;
    let journeyId: string;
    let dmConversationId: string;
    let forumPostId: string;
    let daveClient: SupabaseClient;

    beforeAll(async () => {
      sam = await createTestUser({ displayName: 'Sam Steward' });
      dave = await createTestUser({ displayName: 'Dave Departing' });

      // Sam creates the group (Steward); dave joins as a plain active member.
      const samClient = await asUser(sam);
      const { data: gid, error: gErr } = await samClient.rpc('create_engagement_group', {
        p_name: 'CF Departure Fixture',
      });
      if (gErr) throw new Error(`group fixture: ${gErr.message}`);
      groupId = gid as string;
      await runAdminSql(
        `INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
         VALUES ('${groupId}', '${dave.personalGroupId}', '${sam.personalGroupId}', 'active')
         ON CONFLICT (group_id, member_group_id) DO UPDATE SET status = 'active';`,
      );

      // Lived record (private classes, F-2-erased): an enrolment + a journal entry.
      const { data: j, error: jErr } = await admin
        .from('journeys')
        .insert({ title: 'CF Departure Journey', created_by_group_id: sam.personalGroupId, is_public: false })
        .select('id')
        .single();
      if (jErr) throw new Error(`journey fixture: ${jErr.message}`);
      journeyId = j!.id as string;
      const { error: eErr } = await admin.from('journey_enrollments').insert({
        journey_id: journeyId,
        group_id: dave.personalGroupId,
        enrolled_by_group_id: dave.personalGroupId,
        status: 'active',
      });
      if (eErr) throw new Error(`enrollment fixture: ${eErr.message}`);
      await admin
        .from('journal_entries')
        .insert({ owner_group_id: dave.personalGroupId, body: 'CF private words' })
        .throwOnError();

      // Communal contributions (F-2-retained): a forum post + a DM to sam.
      const { data: fp } = await admin
        .from('forum_posts')
        .insert({ group_id: groupId, author_group_id: dave.personalGroupId, content: 'CF forum words' })
        .select('id')
        .single()
        .throwOnError();
      forumPostId = fp!.id as string;

      daveClient = await asUser(dave);
      // Signature per the C-A rider 20260720003000 (recipient by group) —
      // cumulative-forward read: the original C-A p_other_user_id shape is DROPped.
      const { data: convId, error: dmErr } = await daveClient.rpc('get_or_create_dm_conversation', {
        p_other_group_id: sam.personalGroupId,
      });
      if (dmErr) throw new Error(`dm fixture: ${dmErr.message}`);
      dmConversationId = convId as string;
      const { error: msgErr } = await daveClient.rpc('send_message', {
        p_conversation_id: dmConversationId,
        p_content: 'CF dm words',
      });
      if (msgErr) throw new Error(`message fixture: ${msgErr.message}`);
      await samClient.auth.signOut();
    });

    afterAll(async () => {
      if (journeyId) await admin.from('journey_enrollments').delete().eq('journey_id', journeyId);
      if (journeyId) await admin.from('journeys').delete().eq('id', journeyId);
      if (groupId) await cleanupTestGroup(groupId);
      if (dave) await cleanupTestUser(dave.user.id);
      if (sam) await cleanupTestUser(sam.user.id);
    });

    it('S6a-pre [LABELLED GREEN — fixture pre-condition]: the departing member holds at least one live session', async () => {
      expect(await sessionCount(dave.user.id)).toBeGreaterThan(0);
    });

    it('S4a: delete succeeds and resolves the regular membership; own enrolments do not survive', async () => {
      const { error } = await daveClient.rpc(RPC_DELETE);
      expect(error).toBeNull(); // RED pre-apply: PGRST202

      const m = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.group_memberships
          WHERE group_id = '${groupId}' AND member_group_id = '${dave.personalGroupId}';`,
      );
      expect(m[0].n).toBe(0);
      // F-2: the lived record is erased — the transient departure freeze is
      // superseded in the same transaction (PC017 STORY-4/5).
      const e = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.journey_enrollments
          WHERE group_id = '${dave.personalGroupId}';`,
      );
      expect(e[0].n).toBe(0);
      // The group itself survives a regular member's departure.
      const g = await runAdminSql(`SELECT status FROM public.groups WHERE id = '${groupId}';`);
      expect(g[0].status).toBe('active');
    });

    it('S5a: private classes are erased — the journal is gone', async () => {
      const j = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.journal_entries
          WHERE owner_group_id = '${dave.personalGroupId}';`,
      );
      expect(j[0].n).toBe(0);
    });

    it('S5b: communal classes are retained untouched and stay readable to the other party', async () => {
      const fp = await runAdminSql(
        `SELECT content, is_deleted FROM public.forum_posts WHERE id = '${forumPostId}';`,
      );
      expect(fp[0].content).toBe('CF forum words'); // no content rewrite (ADR-U021 read-time attribution)
      expect(fp[0].is_deleted).toBe(false);

      // `messages` — direct_messages was RENAMEd in place at C-A (PD008 Q2).
      const dm = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.messages
          WHERE conversation_id = '${dmConversationId}' AND content = 'CF dm words';`,
      );
      expect(dm[0].n).toBe(1);

      // Sam (the surviving party) still reads the conversation via the contract.
      const samClient = await asUser(sam);
      const { data, error } = await samClient.rpc('get_conversation_detail', {
        p_conversation_id: dmConversationId,
      });
      expect(error).toBeNull();
      expect(JSON.stringify(data)).toContain('CF dm words');
      await samClient.auth.signOut();
    });

    it('S5c: the users row is decommissioned, member-origin, and display-scrubbed', async () => {
      const row = await lifecycleRowOf(dave.user.id); // RED pre-apply: 42703
      expect(row.is_decommissioned).toBe(true);
      expect(row.is_active).toBe(false);
      expect(row.deactivation_origin).toBe('member');
      // ADAPTATION (flip-green, labelled): nickname is NOT NULL (display-name
      // system 20260227), so the scrub is the tombstone string, not NULL —
      // repaired in migration 20260721170000. Same no-PII semantic.
      expect(row.nickname).toBe('[Deleted User]');
      expect(row.bio).toBeNull();
    });

    it('S6a: every auth session for the departed member is gone', async () => {
      expect(await sessionCount(dave.user.id)).toBe(0);
    });

    it('S6b: a second delete rejects as terminally closed; the decommission invariant holds', async () => {
      const c = await asUser(dave); // auth user still exists; account is terminal
      const { error } = await c.rpc(RPC_DELETE);
      expect(error).not.toBeNull();
      const row = await lifecycleRowOf(dave.user.id);
      expect(row.is_decommissioned).toBe(true);
    });

    it('S7: the deletion is audited exactly once, actor = the departed personal group', async () => {
      expect(await auditCount('self_delete_account', dave.personalGroupId)).toBe(1);
    });
  });

  describe('STORY-4b: the sole Steward with co-members — handover, group survives', () => {
    let leaver: TestUser;
    let stayer: TestUser;
    let groupId: string;

    beforeAll(async () => {
      leaver = await createTestUser({ displayName: 'Lena Leaving Steward' });
      stayer = await createTestUser({ displayName: 'Stan Staying' });
      const c = await asUser(leaver);
      const { data, error } = await c.rpc('create_engagement_group', {
        p_name: 'CF Handover Fixture',
      });
      if (error) throw new Error(`group fixture: ${error.message}`);
      groupId = data as string;
      await runAdminSql(
        `INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
         VALUES ('${groupId}', '${stayer.personalGroupId}', '${leaver.personalGroupId}', 'active')
         ON CONFLICT (group_id, member_group_id) DO UPDATE SET status = 'active';`,
      );
      await c.auth.signOut();
    });
    afterAll(async () => {
      if (groupId) await cleanupTestGroup(groupId);
      if (leaver) await cleanupTestUser(leaver.user.id);
      if (stayer) await cleanupTestUser(stayer.user.id);
    });

    it('S4b: the steward_handover scenario runs — the group stays active without the leaver', async () => {
      const c = await asUser(leaver);
      const { error } = await c.rpc(RPC_DELETE);
      expect(error).toBeNull(); // RED pre-apply: PGRST202

      const g = await runAdminSql(`SELECT status FROM public.groups WHERE id = '${groupId}';`);
      expect(g[0].status).toBe('active'); // survivors keep their group
      const m = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.group_memberships
          WHERE group_id = '${groupId}' AND member_group_id = '${leaver.personalGroupId}';`,
      );
      expect(m[0].n).toBe(0);
    });
  });

  describe('STORY-4c: the sole member — closure with the C-E seal, not without it', () => {
    let solo: TestUser;
    let groupId: string;
    let conversationId: string;

    beforeAll(async () => {
      solo = await createTestUser({ displayName: 'Sol Solo' });
      const c = await asUser(solo);
      const { data: gid, error: gErr } = await c.rpc('create_engagement_group', {
        p_name: 'CF Closure Fixture',
      });
      if (gErr) throw new Error(`group fixture: ${gErr.message}`);
      groupId = gid as string;
      const { data: cid, error: cErr } = await c.rpc('create_group_conversation', {
        p_group_id: groupId,
        p_title: 'CF closure thread',
      });
      if (cErr) throw new Error(`conversation fixture: ${cErr.message}`);
      conversationId = cid as string;
      await c.auth.signOut();
    });
    afterAll(async () => {
      if (groupId) await cleanupTestGroup(groupId);
      if (solo) await cleanupTestUser(solo.user.id);
    });

    it('S4c: delete closes the group AND seals its group conversation (ds5 not skipped)', async () => {
      const c = await asUser(solo);
      const { error } = await c.rpc(RPC_DELETE);
      expect(error).toBeNull(); // RED pre-apply: PGRST202

      const g = await runAdminSql(`SELECT status FROM public.groups WHERE id = '${groupId}';`);
      expect(g[0].status).toBe('closed');
      const conv = await runAdminSql(
        `SELECT sealed_at FROM public.conversations WHERE id = '${conversationId}';`,
      );
      expect(conv[0].sealed_at).not.toBeNull(); // the admin path predated this seal; the self path must not
    });
  });

  describe('STORY-8: the old exit path is retired; the admin lifecycle paths are not', () => {
    it('S8a: the C-F retirement is superseded — FEAT-PC021 gate 2 re-derives admin_exit_user_from_platform', async () => {
      // ADAPTED at PC021 gate 2 (sibling-assertion rule, migration
      // 20260801190000): this cell pinned the C-F DROP (count 0). ADM-6
      // deliberately re-derives the admin exit as a NEW contract — the walk
      // without the F-2 erasure legs or profile scrub, admin origin, typed
      // refusals. The retirement claim this story made now reads: the LEGACY
      // exit stays retired; what exists is the PC021 re-derivation. Red from
      // the adaptation until that migration applies (count 0 at head).
      const rows = await runAdminSql(
        `SELECT count(*)::int AS n FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'admin_exit_user_from_platform';`,
      );
      expect(rows[0].n).toBe(1);
    });

    it('S8b [LABELLED GREEN — invariant-holds, green before and after]: the admin lifecycle RPCs stand', async () => {
      const rows = await runAdminSql(
        `SELECT count(*)::int AS n FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname IN ('admin_update_user_status', 'admin_decommission_user', 'admin_hard_delete_user');`,
      );
      expect(rows[0].n).toBeGreaterThanOrEqual(3);
    });
  });

  describe('STORY-9: no session, no Mist — the walls hold on both new doors', () => {
    it('S9a: a session-less direct PostgREST call answers the grant wall (42501), not a body error', async () => {
      const anon = createTestClient(); // no sign-in — anon role
      const { error: pauseErr } = await anon.rpc(RPC_PAUSE);
      expect(pauseErr).not.toBeNull();
      // RED pre-apply: PGRST202 (missing function) — the assertion demands the
      // post-apply grant wall specifically, so this cannot green early.
      expect(pauseErr!.code).toBe('42501');
      const { error: delErr } = await anon.rpc(RPC_DELETE);
      expect(delErr).not.toBeNull();
      expect(delErr!.code).toBe('42501');
    });

    it('S9b: a Mist session is refused by the FIM wall and mutates nothing', async () => {
      const mist = createTestClient();
      const { error: signInErr } = await withAnonRateLimitRetry(() =>
        mist.auth.signInAnonymously(),
      );
      expect(signInErr).toBeNull();

      const { error } = await mist.rpc(RPC_PAUSE);
      expect(error).not.toBeNull();
      // RED pre-apply: PGRST202. Post-apply: the in-body FIM/actor wall (P0001).
      expect(error!.code).toBe('P0001');
      await mist.auth.signOut();
    });
  });
});
