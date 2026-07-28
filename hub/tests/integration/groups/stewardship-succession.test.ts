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

jest.setTimeout(60_000); // real-substrate suite: sign-ins + fixtures per test

const GHOST = '00000000-0000-0000-0000-00000000dead';

/**
 * FEAT-PC014 (Groups Cycle G-E) — stewardship succession contracts (MEM-7).
 *
 * Red-first:
 *  - respond_to_stewardship_nomination fails PGRST202 (absent) until the
 *    migration lands.
 *  - nominate_steward asserts go red against the LEGACY sprint3 body's
 *    different behaviour: legacy raises P0001 free-text where the contract
 *    answers P0002 no-leak / 42501 FIM-gate / 22023 bad-input; legacy counts
 *    raw role rows where the contract counts ACTIVE memberships (the
 *    paused-co-Steward cell flips from refused to permitted); legacy accepts
 *    duplicate nominees where the contract refuses 22023. Genuine reds, red
 *    for the right reason.
 *  - STORY-6's sprint3-surface asserts are the ADR-U038 adversarial reds:
 *    pre-migration the anon role holds EXECUTE on the nomination surface and
 *    the internal _handle_stewardship_nomination_action dispatches entirely
 *    caller-supplied action_data with NO caller validation — the crafted-data
 *    test drives a stewardship grant off-contract today (RED) and must be
 *    refused (function dropped, Open Q2 default) post-migration.
 *
 * Labelled honestly (carried-forward, green against legacy by design):
 *  - The happy-path nomination write (durable stewardship_nomination row,
 *    7-day expiry, ranked action_data) and the one-in-flight guard (P0001)
 *    are sprint3 behaviour the replacement keeps green.
 *  - The not-a-Steward and active-co-Steward refusals stay P0001 in both
 *    bodies (message hardened, code unchanged).
 */
describe('FEAT-PC014 — stewardship succession contracts (G-E, MEM-7)', () => {
  const admin = createAdminClient();
  let steward: TestUser; // sole active Steward of the fixture groups
  let coSteward: TestUser; // second Steward for sole-ness matrices
  let nominee1: TestUser; // first-ranked nominee
  let nominee2: TestUser; // second-ranked nominee (decline chains)
  let plainMember: TestUser; // active member, participation role only
  let outsider: TestUser; // FIM, never a member
  let suspended: TestUser; // member, then is_active=false

  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];
  const createdJourneyIds: string[] = [];

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

  /** Steward bootstraps a PRIVATE v2 group via the PC010 contract — role
   *  instances are named by TEMPLATE name ('Steward Role Template', …), the
   *  substrate fact behind the v2-named-Steward regression. */
  const seedGroup = async (name: string, members: TestUser[]): Promise<string> => {
    const c = await asUser(steward);
    const { data: groupId, error } = await c.rpc('create_engagement_group', { p_name: name });
    if (error) throw new Error(`seedGroup(${name}): ${error.message}`);
    createdGroupIds.push(groupId as string);
    await admin.from('groups').update({ is_public: false }).eq('id', groupId);
    for (const member of members) {
      const { error: mErr } = await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: member.personalGroupId,
        status: 'active',
        added_by_group_id: steward.personalGroupId,
      });
      if (mErr) throw new Error(`seedGroup membership: ${mErr.message}`);
    }
    return groupId as string;
  };

  /** A LEGACY-shaped group: roles named by SHORT name ('Steward'/'Member'),
   *  no template linkage — the 8-groups-on-dev shape the sprint2/3 bodies
   *  were written against. Seeded via admin SQL, not the v2 contract. */
  const seedLegacyGroup = async (name: string, members: TestUser[]): Promise<string> => {
    const rows = await runAdminSql(`
      WITH g AS (
        INSERT INTO public.groups (name, group_type, is_public, status, created_by_group_id)
        VALUES ('${name}', 'engagement', false, 'active', '${steward.personalGroupId}')
        RETURNING id
      ), sr AS (
        INSERT INTO public.group_roles (group_id, name)
        SELECT id, 'Steward' FROM g RETURNING id, group_id
      ), mr AS (
        INSERT INTO public.group_roles (group_id, name)
        SELECT id, 'Member' FROM g RETURNING id
      ), sm AS (
        INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
        SELECT id, '${steward.personalGroupId}', '${steward.personalGroupId}', 'active' FROM g
      )
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${steward.personalGroupId}', sr.group_id, sr.id, '${steward.personalGroupId}' FROM sr
      RETURNING group_id;`);
    const groupId = rows[0].group_id as string;
    createdGroupIds.push(groupId);
    for (const member of members) {
      await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: member.personalGroupId,
        status: 'active',
        added_by_group_id: steward.personalGroupId,
      });
    }
    return groupId;
  };

  /** Bind a user to the group's Steward role (template-aware lookup with the
   *  legacy short-name fallback — the house resolution). */
  const grantSteward = async (groupId: string, u: TestUser) => {
    await runAdminSql(`
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${u.personalGroupId}', gr.group_id, gr.id, '${steward.personalGroupId}'
        FROM public.group_roles gr
       WHERE gr.group_id = '${groupId}'
         AND (gr.created_from_role_template_id =
                (SELECT id FROM public.role_templates WHERE name = 'Steward Role Template')
              OR gr.name = 'Steward')
       LIMIT 1
      ON CONFLICT DO NOTHING;`);
  };

  const setMembershipStatus = async (groupId: string, u: TestUser, status: string) => {
    const { error } = await admin
      .from('group_memberships')
      .update({ status, status_changed_at: new Date().toISOString() })
      .eq('group_id', groupId)
      .eq('member_group_id', u.personalGroupId);
    if (error) throw new Error(`setMembershipStatus: ${error.message}`);
  };

  /** Latest pending stewardship_nomination row for a recipient in a group. */
  const nominationFor = async (recipientGroupId: string, groupId: string) => {
    const { data } = await admin
      .from('notifications')
      .select('*')
      .eq('recipient_group_id', recipientGroupId)
      .eq('group_id', groupId)
      .eq('type', 'stewardship_nomination')
      .order('created_at', { ascending: false })
      .limit(1);
    return data?.[0] ?? null;
  };

  const stewardRoleNames = async (groupId: string, u: TestUser): Promise<string[]> => {
    const rows = await runAdminSql(`
      SELECT gr.name FROM public.user_group_roles ugr
        JOIN public.group_roles gr ON gr.id = ugr.group_role_id
       WHERE ugr.group_id = '${groupId}' AND ugr.member_group_id = '${u.personalGroupId}';`);
    return rows.map((r) => r.name as string);
  };

  const membershipRow = async (groupId: string, memberGroupId: string) => {
    const { data } = await admin
      .from('group_memberships')
      .select('status')
      .eq('group_id', groupId)
      .eq('member_group_id', memberGroupId)
      .maybeSingle();
    return data;
  };

  const seedJourneyWithEnrollment = async (groupId: string, enrolleeGroupId: string) => {
    const { data: j, error: jErr } = await admin
      .from('journeys')
      .insert({ title: 'SuccessionFixture', created_by_group_id: groupId, is_public: false })
      .select('id')
      .single();
    if (jErr) throw new Error(`journey fixture: ${jErr.message}`);
    createdJourneyIds.push(j.id as string);
    const { data: e, error: eErr } = await admin
      .from('journey_enrollments')
      .insert({ journey_id: j.id, group_id: enrolleeGroupId, status: 'active' })
      .select('id')
      .single();
    if (eErr) throw new Error(`enrollment fixture: ${eErr.message}`);
    return { journeyId: j.id as string, enrollmentId: e.id as string };
  };

  const deusExGroupId = async (): Promise<string> => {
    const rows = await runAdminSql(
      `SELECT id FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';`,
    );
    return rows[0].id as string;
  };

  beforeAll(async () => {
    steward = await createTestUser({ displayName: 'Steward' });
    coSteward = await createTestUser({ displayName: 'CoSteward' });
    nominee1 = await createTestUser({ displayName: 'NomineeOne' });
    nominee2 = await createTestUser({ displayName: 'NomineeTwo' });
    plainMember = await createTestUser({ displayName: 'Plain' });
    outsider = await createTestUser({ displayName: 'Outsider' });
    suspended = await createTestUser({ displayName: 'Suspended' });
    for (const u of [steward, coSteward, nominee1, nominee2, plainMember, outsider, suspended]) {
      createdUserIds.push(u.user.id);
    }
    await admin.from('users').update({ is_active: false }).eq('auth_user_id', suspended.user.id);
  }, 120_000);

  afterAll(async () => {
    for (const id of createdJourneyIds) {
      await admin.from('journeys').delete().eq('id', id);
    }
    for (const id of createdGroupIds) {
      await cleanupTestGroup(id);
    }
    for (const id of createdUserIds) {
      await cleanupTestUser(id);
    }
  }, 120_000);

  // ==========================================================================
  // STORY-1 — nominate_steward (REPLACED IN PLACE)
  // ==========================================================================
  describe('STORY-1: nominate a successor', () => {
    it('sole active Steward nominates a ranked list — durable actionable notification to the first nominee, nothing mutates yet (carried-forward green: the sprint3 write shape)', async () => {
      const groupId = await seedGroup('NominateHappy', [nominee1, nominee2, plainMember]);
      const c = await asUser(steward);
      const { error } = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nominee1.personalGroupId, nominee2.personalGroupId],
      });
      expect(error).toBeNull();

      const n = await nominationFor(nominee1.personalGroupId, groupId);
      expect(n).not.toBeNull();
      expect(n.action_type).toBe('accept_decline');
      expect(n.action_taken).toBeNull();
      const msUntilExpiry = new Date(n.expires_at).getTime() - Date.now();
      expect(msUntilExpiry).toBeGreaterThan(6.9 * 24 * 3600 * 1000);
      expect(msUntilExpiry).toBeLessThan(7.1 * 24 * 3600 * 1000);
      expect(n.action_data.nominee_ids).toEqual([
        nominee1.personalGroupId,
        nominee2.personalGroupId,
      ]);
      expect(n.action_data.nominee_rank).toBe(1);
      expect(n.action_data.nominator_group_id).toBe(steward.personalGroupId);

      // nothing mutates yet
      expect(await stewardRoleNames(groupId, nominee1)).not.toContain('Steward Role Template');
      expect((await membershipRow(groupId, steward.personalGroupId))?.status).toBe('active');
    });

    it('an ACTIVE co-Steward means not sole — P0001 (carried-forward refusal, hardened copy)', async () => {
      const groupId = await seedGroup('NominateCoActive', [coSteward, nominee1]);
      await grantSteward(groupId, coSteward);
      const c = await asUser(steward);
      const res = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nominee1.personalGroupId],
      });
      expect(res.error?.code).toBe('P0001');
    });

    it('a PAUSED co-Steward is NOT cover — nomination permitted (RED against legacy: raw role-count sees two Stewards and refuses)', async () => {
      const groupId = await seedGroup('NominateCoPaused', [coSteward, nominee1]);
      await grantSteward(groupId, coSteward);
      await setMembershipStatus(groupId, coSteward, 'paused');
      const c = await asUser(steward);
      const { error } = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nominee1.personalGroupId],
      });
      expect(error).toBeNull();
      expect(await nominationFor(nominee1.personalGroupId, groupId)).not.toBeNull();
    });

    it('a non-Steward member cannot nominate — P0001 (carried-forward refusal)', async () => {
      const groupId = await seedGroup('NominateNotSteward', [plainMember, nominee1]);
      const c = await asUser(plainMember);
      const res = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nominee1.personalGroupId],
      });
      expect(res.error?.code).toBe('P0001');
    });

    // W-03 #1 (gate walk 2026-07-27) — the imperative cannot expire.
    //
    // The emitted body read "…Accept or decline within 7 days." Copy is
    // server-authored and frozen at emit, and the surface is forbidden to
    // re-word it (the V3 surfaces law), so an embedded call-to-action and an
    // embedded deadline age badly BY CONSTRUCTION: three weeks later the row
    // still instructs the member to act, and only a small pill says the window
    // closed. That is a consequence of the copy law, not a Hub defect — so the
    // fix belongs at the emit site, not the surface.
    //
    // The deadline is NOT lost: `expires_at` already carries it, and the surface
    // already renders "Respond by <date>" while the row is actionable
    // (NotificationItem.tsx:45-46). The body was duplicating a fact the
    // machinery already held, in the one form that can never expire.
    it('the emitted nomination body states the fact and leaves the deadline to expires_at — no imperative, no embedded window (RED pre-migration: the body ends "Accept or decline within 7 days.")', async () => {
      const groupId = await seedGroup('NominateBodyCopy', [nominee1]);
      const c = await asUser(steward);
      const { error } = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nominee1.personalGroupId],
      });
      expect(error).toBeNull();

      const row = await nominationFor(nominee1.personalGroupId, groupId);
      expect(row).not.toBeNull();
      const body = (row as { body: string }).body;

      // The fact survives, named to the group.
      expect(body).toMatch(/nominated as Steward of NominateBodyCopy/i);
      // The imperative and the embedded window are gone.
      expect(body).not.toMatch(/accept or decline/i);
      expect(body).not.toMatch(/within \d+ days/i);
      expect(body).not.toMatch(/respond (by|within)/i);

      // And the deadline is still carried where it can actually expire.
      const expiresAt = (row as { expires_at: string | null }).expires_at;
      expect(expiresAt).not.toBeNull();
      const days = (new Date(expiresAt!).getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(6.5);
      expect(days).toBeLessThan(7.5);
    });

    it('empty nominee list — 22023 (RED against legacy P0001 free-text)', async () => {
      const groupId = await seedGroup('NominateEmpty', [nominee1]);
      const c = await asUser(steward);
      const res = await c.rpc('nominate_steward', { p_group_id: groupId, p_nominee_ids: [] });
      expect(res.error?.code).toBe('22023');
    });

    it('self-nomination — 22023 (RED against legacy P0001)', async () => {
      const groupId = await seedGroup('NominateSelf', [nominee1]);
      const c = await asUser(steward);
      const res = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [steward.personalGroupId],
      });
      expect(res.error?.code).toBe('22023');
    });

    it('duplicate nominees — 22023 (RED: the legacy body accepts duplicates silently)', async () => {
      const groupId = await seedGroup('NominateDup', [nominee1]);
      const c = await asUser(steward);
      const res = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nominee1.personalGroupId, nominee1.personalGroupId],
      });
      expect(res.error?.code).toBe('22023');
    });

    it('a non-member nominee — 22023 (RED against legacy P0001)', async () => {
      const groupId = await seedGroup('NominateNonMember', [nominee1]);
      const c = await asUser(steward);
      const res = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [outsider.personalGroupId],
      });
      expect(res.error?.code).toBe('22023');
    });

    it('a PAUSED nominee is not an active member — 22023', async () => {
      const groupId = await seedGroup('NominatePausedNominee', [nominee1, nominee2]);
      await setMembershipStatus(groupId, nominee1, 'paused');
      const c = await asUser(steward);
      const res = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nominee1.personalGroupId],
      });
      expect(res.error?.code).toBe('22023');
    });

    it('one nomination in flight per group — P0001 (carried-forward guard)', async () => {
      const groupId = await seedGroup('NominateInFlight', [nominee1, nominee2]);
      const c = await asUser(steward);
      const first = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nominee1.personalGroupId],
      });
      expect(first.error).toBeNull();
      const second = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nominee2.personalGroupId],
      });
      expect(second.error?.code).toBe('P0001');
    });

    it('non-member caller on a private group — P0002 no-leak (RED against legacy P0001 free-text)', async () => {
      const groupId = await seedGroup('NominateOutsider', [nominee1]);
      const c = await asUser(outsider);
      const res = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nominee1.personalGroupId],
      });
      expect(res.error?.code).toBe('P0002');
    });

    it('ghost group id — P0002 indistinguishably (RED against legacy P0001)', async () => {
      const c = await asUser(steward);
      const res = await c.rpc('nominate_steward', {
        p_group_id: GHOST,
        p_nominee_ids: [nominee1.personalGroupId],
      });
      expect(res.error?.code).toBe('P0002');
    });

    it('Mist callers — 42501 FIM-only (RED against legacy membership free-text)', async () => {
      const groupId = await seedGroup('NominateMist', [nominee1]);
      const c = await asMist();
      const res = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nominee1.personalGroupId],
      });
      expect(res.error?.code).toBe('42501');
      await c.auth.signOut();
    });

    it('suspended callers — 42501 (RED against legacy)', async () => {
      const groupId = await seedGroup('NominateSuspended', [suspended, nominee1]);
      const c = await asUser(suspended);
      const res = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nominee1.personalGroupId],
      });
      expect(res.error?.code).toBe('42501');
    });

    // Amended 2026-07-06 (FEAT-PC015 / ADR-U041 §4): the ADR-U006-uniformity
    // posture this test carried ("any active member is a valid nominee") was
    // deliberately reversed by the G-F design session — stewardship
    // succession lands on people. The same fixture now proves the refusal.
    it('a group-as-member row is NOT a valid nominee (ADR-U041 §4 — persons only)', async () => {
      const groupId = await seedGroup('NominateGroupMember', [nominee1]);
      // an engagement group as an active member row of the fixture group
      const memberGroupRows = await runAdminSql(`
        INSERT INTO public.groups (name, group_type, is_public, status, created_by_group_id)
        VALUES ('NestedMemberGroup', 'engagement', false, 'active', '${steward.personalGroupId}')
        RETURNING id;`);
      const nestedId = memberGroupRows[0].id as string;
      createdGroupIds.push(nestedId);
      await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: nestedId,
        status: 'active',
        added_by_group_id: steward.personalGroupId,
      });
      const c = await asUser(steward);
      const { error } = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nestedId],
      });
      expect(error?.code).toBe('22023');
      expect(error?.message).toContain('not a person');
      expect(await nominationFor(nestedId, groupId)).toBeNull();
    });
  });

  // ==========================================================================
  // STORY-2 — respond_to_stewardship_nomination (NEW — PGRST202 red until the
  // migration lands)
  // ==========================================================================
  describe('STORY-2: respond to a nomination', () => {
    /** Nominate via the contract as steward; returns the first nominee's
     *  pending notification id. */
    const nominate = async (groupId: string, nominees: TestUser[]): Promise<string> => {
      const c = await asUser(steward);
      const { error } = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: nominees.map((n) => n.personalGroupId),
      });
      if (error) throw new Error(`nominate fixture: ${error.message}`);
      const n = await nominationFor(nominees[0].personalGroupId, groupId);
      if (!n) throw new Error('nominate fixture: no notification row');
      return n.id as string;
    };

    it('accept on a V2-CREATED group grants the template-named Steward role — the regression the name-only legacy body fails — and the nominator departs with the full cascade', async () => {
      const groupId = await seedGroup('AcceptV2', [nominee1, plainMember]);
      const { enrollmentId } = await seedJourneyWithEnrollment(groupId, steward.personalGroupId);
      const nid = await nominate(groupId, [nominee1]);

      const c = await asUser(nominee1);
      const { error } = await c.rpc('respond_to_stewardship_nomination', {
        p_notification_id: nid,
        p_accept: true,
      });
      expect(error).toBeNull();

      // nominee holds the group's Steward role — resolved by TEMPLATE linkage
      // (on a v2 group the instance is named 'Steward Role Template')
      expect(await stewardRoleNames(groupId, nominee1)).toContain('Steward Role Template');
      // nominator departed: membership + roles gone, non-public enrolment frozen
      expect(await membershipRow(groupId, steward.personalGroupId)).toBeNull();
      expect(await stewardRoleNames(groupId, steward)).toEqual([]);
      const { data: enr } = await admin
        .from('journey_enrollments')
        .select('status, progress_data')
        .eq('id', enrollmentId)
        .single();
      expect(enr?.status).toBe('frozen');
      expect((enr?.progress_data as Record<string, unknown>).frozen_reason).toBe('left_group');
      // remaining active members are told
      const { data: told } = await admin
        .from('notifications')
        .select('id')
        .eq('recipient_group_id', plainMember.personalGroupId)
        .eq('group_id', groupId)
        .eq('type', 'stewardship_transferred');
      expect(told?.length ?? 0).toBeGreaterThan(0);
      // the nomination is settled
      const { data: settled } = await admin
        .from('notifications')
        .select('action_taken')
        .eq('id', nid)
        .single();
      expect(settled?.action_taken).toBe('accepted');
    });

    it('accept on a LEGACY-named group resolves the Steward role by the short-name fallback', async () => {
      const groupId = await seedLegacyGroup('AcceptLegacy', [nominee1, plainMember]);
      const nid = await nominate(groupId, [nominee1]);
      const c = await asUser(nominee1);
      const { error } = await c.rpc('respond_to_stewardship_nomination', {
        p_notification_id: nid,
        p_accept: true,
      });
      expect(error).toBeNull();
      expect(await stewardRoleNames(groupId, nominee1)).toContain('Steward');
      expect(await membershipRow(groupId, steward.personalGroupId)).toBeNull();
    });

    it('decline with a next-ranked nominee — a fresh 7-day offer to the next nominee, nothing else changes', async () => {
      const groupId = await seedGroup('DeclineNext', [nominee1, nominee2]);
      const nid = await nominate(groupId, [nominee1, nominee2]);
      const c = await asUser(nominee1);
      const { error } = await c.rpc('respond_to_stewardship_nomination', {
        p_notification_id: nid,
        p_accept: false,
      });
      expect(error).toBeNull();

      const next = await nominationFor(nominee2.personalGroupId, groupId);
      expect(next).not.toBeNull();
      expect(next.action_taken).toBeNull();
      expect(next.action_data.nominee_rank).toBe(2);
      // the steward keeps stewarding; no membership changed
      expect((await membershipRow(groupId, steward.personalGroupId))?.status).toBe('active');
      expect(await stewardRoleNames(groupId, nominee1)).toEqual(
        expect.not.arrayContaining(['Steward Role Template', 'Steward']),
      );
      const { data: first } = await admin
        .from('notifications')
        .select('action_taken')
        .eq('id', nid)
        .single();
      expect(first?.action_taken).toBe('declined');
    });

    it('the last-ranked decline exhausts the list — the ADR-U019 DeusEx fallback runs (member+Steward, invitation transfer, nominator departs, both notices)', async () => {
      const groupId = await seedGroup('DeclineDeusEx', [nominee1, plainMember]);
      const deusEx = await deusExGroupId();
      // pending FIM invitation + pending email invitation issued by the nominator
      await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: nominee2.personalGroupId,
        status: 'invited',
        added_by_group_id: steward.personalGroupId,
      });
      await admin.from('pending_email_invitations').insert({
        group_id: groupId,
        invited_email: 'succession-fixture@example.com',
        invited_by_group_id: steward.personalGroupId,
        status: 'pending',
      });
      const nid = await nominate(groupId, [nominee1]);

      const c = await asUser(nominee1);
      const { error } = await c.rpc('respond_to_stewardship_nomination', {
        p_notification_id: nid,
        p_accept: false,
      });
      expect(error).toBeNull();

      // DeusEx is an active member and Steward of the group
      expect((await membershipRow(groupId, deusEx))?.status).toBe('active');
      const deusExRoles = await runAdminSql(`
        SELECT gr.name FROM public.user_group_roles ugr
          JOIN public.group_roles gr ON gr.id = ugr.group_role_id
         WHERE ugr.group_id = '${groupId}' AND ugr.member_group_id = '${deusEx}';`);
      expect(
        deusExRoles.some((r) => r.name === 'Steward Role Template' || r.name === 'Steward'),
      ).toBe(true);
      // pending invitations transferred
      const { data: invRow } = await admin
        .from('group_memberships')
        .select('added_by_group_id')
        .eq('group_id', groupId)
        .eq('member_group_id', nominee2.personalGroupId)
        .single();
      expect(invRow?.added_by_group_id).toBe(deusEx);
      const { data: emailInv } = await admin
        .from('pending_email_invitations')
        .select('invited_by_group_id')
        .eq('group_id', groupId)
        .eq('invited_email', 'succession-fixture@example.com')
        .single();
      expect(emailInv?.invited_by_group_id).toBe(deusEx);
      // nominator departed; members + DeusEx notified
      expect(await membershipRow(groupId, steward.personalGroupId)).toBeNull();
      const { data: told } = await admin
        .from('notifications')
        .select('id')
        .eq('recipient_group_id', plainMember.personalGroupId)
        .eq('group_id', groupId)
        .eq('type', 'stewardship_transferred');
      expect(told?.length ?? 0).toBeGreaterThan(0);
      const { data: required } = await admin
        .from('notifications')
        .select('id')
        .eq('recipient_group_id', deusEx)
        .eq('group_id', groupId)
        .eq('type', 'stewardship_required');
      expect(required?.length ?? 0).toBeGreaterThan(0);
    });

    // W2 characterization (COR-A / spec D) — GREEN-BEFORE for the W4 relocation.
    // The exhaust-the-list DeusEx fallback departs the nominator via the same
    // cascade as a leave: its non-public enrolment must freeze 'left_group'.
    // Pins that disposition explicitly (the DeclineDeusEx test above does not
    // assert it) so W4's DS-3 leadership_transferred fact preserves it.
    it('[characterization] the DeusEx-fallback departure freezes the nominator’s own non-public enrolment (left_group)', async () => {
      const groupId = await seedGroup('DeclineDeusExFreeze', [nominee1, plainMember]);
      const { enrollmentId } = await seedJourneyWithEnrollment(groupId, steward.personalGroupId);
      const nid = await nominate(groupId, [nominee1]);

      const c = await asUser(nominee1);
      const { error } = await c.rpc('respond_to_stewardship_nomination', {
        p_notification_id: nid,
        p_accept: false,
      });
      expect(error).toBeNull();

      const { data: enr } = await admin
        .from('journey_enrollments')
        .select('status, progress_data')
        .eq('id', enrollmentId)
        .single();
      expect(enr?.status).toBe('frozen');
      expect((enr?.progress_data as Record<string, unknown>).frozen_reason).toBe('left_group');
      // the nominator departed under the fallback
      expect(await membershipRow(groupId, steward.personalGroupId)).toBeNull();
    });

    it("responding to another member's nomination — P0002 (no leak of another's notification)", async () => {
      const groupId = await seedGroup('RespondNotYours', [nominee1, plainMember]);
      const nid = await nominate(groupId, [nominee1]);
      const c = await asUser(plainMember);
      const res = await c.rpc('respond_to_stewardship_nomination', {
        p_notification_id: nid,
        p_accept: true,
      });
      expect(res.error?.code).toBe('P0002');
    });

    it('an expired nomination refuses response — P0001; no reaper: the group keeps its Steward', async () => {
      const groupId = await seedGroup('RespondExpired', [nominee1]);
      const nid = await nominate(groupId, [nominee1]);
      await admin
        .from('notifications')
        .update({ expires_at: new Date(Date.now() - 3600_000).toISOString() })
        .eq('id', nid);
      const c = await asUser(nominee1);
      const res = await c.rpc('respond_to_stewardship_nomination', {
        p_notification_id: nid,
        p_accept: true,
      });
      expect(res.error?.code).toBe('P0001');
      expect((await membershipRow(groupId, steward.personalGroupId))?.status).toBe('active');
    });

    it('an already-answered nomination refuses a second response — P0001', async () => {
      const groupId = await seedGroup('RespondTwice', [nominee1, nominee2]);
      const nid = await nominate(groupId, [nominee1, nominee2]);
      const c = await asUser(nominee1);
      const first = await c.rpc('respond_to_stewardship_nomination', {
        p_notification_id: nid,
        p_accept: false,
      });
      expect(first.error).toBeNull();
      const again = await c.rpc('respond_to_stewardship_nomination', {
        p_notification_id: nid,
        p_accept: true,
      });
      expect(again.error?.code).toBe('P0001');
    });

    it('a ghost notification id — P0002', async () => {
      const c = await asUser(nominee1);
      const res = await c.rpc('respond_to_stewardship_nomination', {
        p_notification_id: GHOST,
        p_accept: true,
      });
      expect(res.error?.code).toBe('P0002');
    });

    it('a STALE nomination (the nominator already departed) refuses — P0001 (contract-side robustness the trusting legacy dispatch lacked)', async () => {
      const groupId = await seedGroup('RespondStale', [nominee1, plainMember]);
      const nid = await nominate(groupId, [nominee1]);
      // the nominator departs out-of-band (substrate manipulation — the
      // DeusEx-handover shape without the contract)
      const deusEx = await deusExGroupId();
      await runAdminSql(`
        INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
        VALUES ('${groupId}', '${deusEx}', '${steward.personalGroupId}', 'active')
        ON CONFLICT (group_id, member_group_id) DO UPDATE SET status = 'active';`);
      await grantSteward(groupId, { personalGroupId: deusEx } as TestUser);
      await runAdminSql(`
        DELETE FROM public.user_group_roles
         WHERE group_id = '${groupId}' AND member_group_id = '${steward.personalGroupId}';
        DELETE FROM public.group_memberships
         WHERE group_id = '${groupId}' AND member_group_id = '${steward.personalGroupId}';`);

      const c = await asUser(nominee1);
      const res = await c.rpc('respond_to_stewardship_nomination', {
        p_notification_id: nid,
        p_accept: true,
      });
      expect(res.error?.code).toBe('P0001');
      // nothing granted
      expect(await stewardRoleNames(groupId, nominee1)).toEqual(
        expect.not.arrayContaining(['Steward Role Template', 'Steward']),
      );
    });

    it('Mist and suspended callers — 42501', async () => {
      const groupId = await seedGroup('RespondGates', [nominee1]);
      const nid = await nominate(groupId, [nominee1]);
      const mist = await asMist();
      const mistRes = await mist.rpc('respond_to_stewardship_nomination', {
        p_notification_id: nid,
        p_accept: true,
      });
      expect(mistRes.error?.code).toBe('42501');
      await mist.auth.signOut();
      const susp = await asUser(suspended);
      const suspRes = await susp.rpc('respond_to_stewardship_nomination', {
        p_notification_id: nid,
        p_accept: true,
      });
      expect(suspRes.error?.code).toBe('42501');
    });
  });

  // ==========================================================================
  // STORY-6 (sprint3 surface) — the ADR-U038 closure, demonstrated red first
  // ==========================================================================
  describe('STORY-6: the sprint3 nomination surface is closed (ADR-U038)', () => {
    it('anon holds no EXECUTE anywhere on the PC014 surface — the five contracts and the dropped sprint3 pair (RED pre-migration: the sprint3 grants are live; RED again at build for the four fresh contracts — Supabase default privileges grant new functions to anon directly, so revoking PUBLIC alone is not enough)', async () => {
      const rows = await runAdminSql(`
        SELECT p.proname
          FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname IN ('nominate_steward', 'respond_to_stewardship_nomination',
                             'hand_stewardship_to_deusex', 'close_group', 'delete_group',
                             '_transfer_stewardship_to_deusex',
                             'handle_notification_action', '_handle_stewardship_nomination_action')
           AND has_function_privilege('anon', p.oid, 'EXECUTE')
         ORDER BY p.proname;`);
      expect(rows.map((r) => r.proname)).toEqual([]);
    });

    it('a hand-crafted action_data can no longer drive a stewardship grant — the internal dispatch helper is not callable (RED pre-migration: an outsider grants themselves Steward on a legacy-named group and deletes the real Steward)', async () => {
      const groupId = await seedLegacyGroup('CraftedData', [plainMember]);
      const c = await asUser(outsider);
      const res = await c.rpc('_handle_stewardship_nomination_action', {
        p_notification_id: GHOST,
        p_nominee_group_id: outsider.personalGroupId,
        p_action_data: {
          group_id: groupId,
          nominator_group_id: steward.personalGroupId,
          nominee_ids: [outsider.personalGroupId],
          nominee_rank: 1,
          total_nominees: 1,
        },
        p_action: 'accepted',
      });
      // Open Q2 default: the function is DROPPED — PostgREST cannot resolve it.
      expect(res.error?.code).toBe('PGRST202');
      // and no stewardship was granted off-contract
      expect(await stewardRoleNames(groupId, outsider)).toEqual([]);
      expect((await membershipRow(groupId, steward.personalGroupId))?.status).toBe('active');
    });

    it('the generic handle_notification_action is gone — nomination responses ride the dedicated contract only (RED pre-migration: the generic handler answers)', async () => {
      const groupId = await seedGroup('GenericHandlerGone', [nominee1]);
      const cSteward = await asUser(steward);
      const { error: nomErr } = await cSteward.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nominee1.personalGroupId],
      });
      expect(nomErr).toBeNull();
      const n = await nominationFor(nominee1.personalGroupId, groupId);
      const c = await asUser(nominee1);
      const res = await c.rpc('handle_notification_action', {
        p_notification_id: n.id,
        p_action: 'accepted',
      });
      expect(res.error?.code).toBe('PGRST202');
    });

    it('an anonymous-session (anon-role) call to nominate_steward is refused by privilege, not by body guards (RED pre-migration: anon reaches the function body)', async () => {
      const groupId = await seedGroup('AnonPrivilege', [nominee1]);
      const c = createTestClient(); // no session — the anon role
      const res = await c.rpc('nominate_steward', {
        p_group_id: groupId,
        p_nominee_ids: [nominee1.personalGroupId],
      });
      // post-migration: EXECUTE revoked from anon — PostgREST surfaces 42501.
      // pre-migration RED: the call reaches the body and fails on the auth
      // guard instead (P0001 'Not authenticated') — proof the grant is live.
      expect(res.error?.code).toBe('42501');
    });
  });
});
