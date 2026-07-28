/**
 * FEAT-PD014 — actionable-notification dispatch, acting-invitation fan-out &
 * convergence (Cycle N-B). Realises ADR-U051.
 *   STORY-1 (action_data on the list contract),
 *   STORY-2 (acting_invitation kind + permission fan-out at invite-time),
 *   STORY-3 (thin dispatch + first-answer-wins convergence, durable who-answered),
 *   STORY-4 (NTF-8 lazy expiry-on-view).
 *
 * Red-first (authored 2026-07-24, pre-migration). Expected red classes:
 *   - action_data absent from the get_own_notifications payload (STORY-1);
 *   - acting_invitation kind unregistered → the invite fan-out emits nothing
 *     an actionable notification (STORY-2 finds zero acting_invitation rows);
 *   - respond_to_acting_invitation absent (PGRST202 function not found) → the
 *     dispatch/convergence assertions fail (STORY-3);
 *   - lazy-expiry not wired → a past-deadline actionable row stays unresolved
 *     (STORY-4).
 *
 * Fan-out topology: context group A (Alice, invite_members) invites engagement
 * group B; B has two act_as_group holders (Bob = creator-Steward, Carol =
 * assigned) and one non-holder active member (Dave). Each invite fans one
 * acting_invitation per holder; first answer converges both.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
  signInWithRetry,
  runAdminSql,
  type TestUser,
} from '@/tests/helpers/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

jest.setTimeout(240_000);

/** The N-B list payload keys — N-A's set + action_data. */
const N_B_PAYLOAD_KEYS = [
  'id', 'kind', 'category', 'title', 'body', 'group_id', 'created_at',
  'is_read', 'read_at', 'action_type', 'action_data', 'action_taken', 'expires_at',
].sort();

type NotificationRow = {
  id: string;
  kind: string;
  action_type: string | null;
  action_data: Record<string, unknown> | null;
  action_taken: string | null;
  expires_at: string | null;
  title: string;
};

describe('FEAT-PD014 — actionable notifications: fan-out, dispatch & convergence (N-B)', () => {
  const admin = createAdminClient();
  const runTag = Date.now().toString(36);
  let ctxCounter = 0;

  /** TASK-INT-03: every engagement group this suite creates, torn down in
   *  afterAll BEFORE `cleanupTestUser`.
   *
   *  This suite was the attributed source of both orphaned personal groups per
   *  notifications run (captured 2026-07-28, `cleanupTestUser` at :176). It
   *  creates a fresh context group on every `freshActingInvite()` call plus one
   *  in the personal-branch test, and tore down only `groupB` — so Alice and Bob
   *  stayed sole Steward of the rest, `cleanupTestUser` hit the sole-Steward
   *  guard, and their personal groups leaked.
   *
   *  The guard is CORRECT and is not weakened: the fix is that a suite which
   *  creates an engagement group is the suite that deletes it. */
  const createdGroupIds: string[] = [];

  let alice: TestUser; // owns each context group, invites B
  let bob: TestUser;   // B's creator-Steward — act_as_group holder #1
  let carol: TestUser; // assigned act_as_group holder #2
  let dave: TestUser;  // active member of B WITHOUT act_as_group
  let eve: TestUser;   // unrelated — the adversarial / personal-branch actor
  let groupB: string;  // the invited engagement group
  let bobName: string; // Bob's display name (= personal group name)

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  /** Alice creates a fresh context group and invites B into it. Returns the
   *  membership_id and the acting_invitation notification ids fanned to Bob/Carol. */
  const freshActingInvite = async (): Promise<{
    contextGroup: string;
    membershipId: string;
    bobNotifId: string;
    carolNotifId: string | null;
  }> => {
    const ca = await asUser(alice);
    const { data: gid, error: gErr } = await ca.rpc('create_engagement_group', {
      p_name: `NB-ctx-${runTag}-${ctxCounter++}`,
    });
    expect(gErr).toBeNull();
    const contextGroup = gid as string;
    createdGroupIds.push(contextGroup);
    const { data: inv, error: iErr } = await ca.rpc('invite_group', {
      p_group_id: contextGroup,
      p_invited_group_id: groupB,
    });
    expect(iErr).toBeNull();
    const membershipId = (inv as { membership_id: string }).membership_id;

    const rows = await runAdminSql(
      `SELECT id, recipient_group_id FROM public.notifications
        WHERE type = 'acting_invitation'
          AND action_data->>'membership_id' = '${membershipId}';`,
    );
    const bobRow = rows.find((r) => r.recipient_group_id === bob.personalGroupId);
    const carolRow = rows.find((r) => r.recipient_group_id === carol.personalGroupId);
    return {
      contextGroup,
      membershipId,
      bobNotifId: bobRow?.id,
      carolNotifId: carolRow?.id ?? null,
    };
  };

  beforeAll(async () => {
    [alice, bob, carol, dave, eve] = await Promise.all([
      createTestUser({ displayName: `NBa Alice ${runTag}` }),
      createTestUser({ displayName: `NBb Bob ${runTag}` }),
      createTestUser({ displayName: `NBc Carol ${runTag}` }),
      createTestUser({ displayName: `NBd Dave ${runTag}` }),
      createTestUser({ displayName: `NBe Eve ${runTag}` }),
    ]);

    // Bob creates B — creator becomes Steward (act_as_group holder #1).
    const cb = await asUser(bob);
    const { data: bId, error: bErr } = await cb.rpc('create_engagement_group', {
      p_name: `NB-invited-B-${runTag}`,
    });
    expect(bErr).toBeNull();
    groupB = bId as string;

    // invite_group requires a PUBLIC ACTIVE engagement target.
    const { error: pubErr } = await admin
      .from('groups')
      .update({ is_public: true })
      .eq('id', groupB);
    expect(pubErr).toBeNull();

    // Carol → active member of B + B's act_as_group role (holder #2).
    const roleRows = await runAdminSql(
      `SELECT gr.id AS role_id
         FROM public.group_roles gr
         JOIN public.group_role_permissions grp ON grp.group_role_id = gr.id
         JOIN public.permissions p ON p.id = grp.permission_id
        WHERE gr.group_id = '${groupB}' AND p.name = 'act_as_group' AND grp.granted = true
        LIMIT 1;`,
    );
    expect(roleRows.length).toBe(1);
    const actingRoleId = roleRows[0].role_id;
    for (const person of [carol, dave]) {
      const { error: mErr } = await admin.from('group_memberships').insert({
        group_id: groupB,
        member_group_id: person.personalGroupId,
        status: 'active',
        added_by_group_id: bob.personalGroupId,
      });
      expect(mErr).toBeNull();
    }
    // Only Carol gets act_as_group; Dave stays a plain member (non-holder).
    const { error: rErr } = await admin.from('user_group_roles').insert({
      member_group_id: carol.personalGroupId,
      group_id: groupB,
      group_role_id: actingRoleId,
    });
    expect(rErr).toBeNull();

    const bn = await runAdminSql(
      `SELECT name FROM public.groups WHERE id = '${bob.personalGroupId}';`,
    );
    bobName = bn[0].name;
  });

  afterAll(async () => {
    await admin.from('notifications').delete().like('title', `%${runTag}%`);
    // Fan-out rows carry no runTag in title ('Group Invitation'); clear by recipient.
    for (const u of [alice, bob, carol, dave, eve].filter(Boolean)) {
      await admin.from('notifications').delete().eq('recipient_group_id', u.personalGroupId);
    }
    // TASK-INT-03: every engagement group this suite made, before the users —
    // otherwise their creators are still sole Steward and cleanupTestUser is
    // refused, orphaning the personal group.
    if (groupB) await cleanupTestGroup(groupB);
    for (const id of createdGroupIds) {
      if (id) await cleanupTestGroup(id);
    }
    for (const u of [alice, bob, carol, dave, eve].filter(Boolean)) {
      await cleanupTestUser(u.user.id);
    }
  });

  // ---------------------------------------------------------------------------
  describe('setup sanity — the fan-out target set', () => {
    it('B has exactly two act_as_group holders: Bob and Carol (Dave excluded)', async () => {
      const holders = await runAdminSql(
        `SELECT DISTINCT gm.member_group_id AS pg
           FROM public.group_memberships gm
           JOIN public.user_group_roles ugr
             ON ugr.member_group_id = gm.member_group_id AND ugr.group_id = gm.group_id
           JOIN public.group_role_permissions grp ON grp.group_role_id = ugr.group_role_id
           JOIN public.permissions p ON p.id = grp.permission_id
          WHERE gm.group_id = '${groupB}' AND gm.status = 'active'
            AND grp.granted = true AND p.name = 'act_as_group';`,
      );
      const pgs = holders.map((h) => h.pg).sort();
      expect(pgs).toEqual([bob.personalGroupId, carol.personalGroupId].sort());
    });
  });

  // ---------------------------------------------------------------------------
  describe('STORY-2 — acting-invitation fans out to permission-holders', () => {
    it('one acting_invitation per holder, addressed to Bob and Carol, none to Dave', async () => {
      const { membershipId, bobNotifId, carolNotifId } = await freshActingInvite();
      expect(bobNotifId).toBeTruthy();
      expect(carolNotifId).toBeTruthy();

      const rows = await runAdminSql(
        `SELECT recipient_group_id, action_type, action_data
           FROM public.notifications
          WHERE type = 'acting_invitation'
            AND action_data->>'membership_id' = '${membershipId}';`,
      );
      const recipients = rows.map((r) => r.recipient_group_id).sort();
      expect(recipients).toEqual([bob.personalGroupId, carol.personalGroupId].sort());
      expect(recipients).not.toContain(dave.personalGroupId);
      for (const r of rows) {
        expect(r.action_type).toBe('accept_decline');
        expect(r.action_data.membership_id).toBe(membershipId);
        expect(r.action_data.invited_group_id).toBe(groupB);
      }
    });

    it('the group-addressed invitation_received orphan is NOT emitted for the group branch', async () => {
      const { membershipId } = await freshActingInvite();
      const orphans = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.notifications
          WHERE type = 'invitation_received' AND recipient_group_id = '${groupB}';`,
      );
      expect(orphans[0].n).toBe(0);
      // the acting rows for this membership do exist (sanity)
      const acting = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.notifications
          WHERE type = 'acting_invitation' AND action_data->>'membership_id' = '${membershipId}';`,
      );
      expect(acting[0].n).toBe(2);
    });

    it('a PERSONAL invitation still emits invitation_received unchanged (branch preserved)', async () => {
      // A personal 'invited' membership (member is Eve's personal group).
      const cb = await asUser(bob);
      const { data: gid } = await cb.rpc('create_engagement_group', {
        p_name: `NB-personal-ctx-${runTag}`,
      });
      createdGroupIds.push(gid as string);
      const { error } = await admin.from('group_memberships').insert({
        group_id: gid as string,
        member_group_id: eve.personalGroupId,
        status: 'invited',
        added_by_group_id: bob.personalGroupId,
      });
      expect(error).toBeNull();
      const rows = await runAdminSql(
        `SELECT type FROM public.notifications
          WHERE recipient_group_id = '${eve.personalGroupId}' AND type = 'invitation_received';`,
      );
      expect(rows.length).toBeGreaterThanOrEqual(1);
      const acting = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.notifications
          WHERE recipient_group_id = '${eve.personalGroupId}' AND type = 'acting_invitation';`,
      );
      expect(acting[0].n).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  describe('STORY-1 — action_data reaches the list contract', () => {
    it('get_own_notifications now carries action_data (payload key set = N-A + action_data)', async () => {
      await freshActingInvite();
      const cb = await asUser(bob);
      const { data, error } = await cb.rpc('get_own_notifications', { p_limit: 50 });
      expect(error).toBeNull();
      const rows = data as NotificationRow[];
      expect(Object.keys(rows[0]).sort()).toEqual(N_B_PAYLOAD_KEYS);
      const acting = rows.find((r) => r.kind === 'acting_invitation');
      expect(acting).toBeTruthy();
      expect(acting!.action_data).toBeTruthy();
      expect(typeof (acting!.action_data as Record<string, unknown>).membership_id).toBe('string');
    });
  });

  // ---------------------------------------------------------------------------
  describe('STORY-3 — dispatch + first-answer-wins convergence', () => {
    it('accept resolves the membership and converges both holders — co-leader sees "answered by Bob"', async () => {
      const { contextGroup, membershipId, bobNotifId } = await freshActingInvite();
      const cb = await asUser(bob);
      const { data: res, error } = await cb.rpc('respond_to_acting_invitation', {
        p_notification_id: bobNotifId,
        p_accept: true,
      });
      expect(error).toBeNull();
      expect((res as { outcome: string }).outcome).toBe('accepted');

      // Membership B-in-context is now active (Core handler ran).
      const mem = await runAdminSql(
        `SELECT status FROM public.group_memberships WHERE id = '${membershipId}';`,
      );
      expect(mem[0].status).toBe('active');

      // BOTH holders' rows converged; Carol's shows resolved_by_name = Bob.
      const converged = await runAdminSql(
        `SELECT recipient_group_id, action_taken, action_data->>'resolved_by_name' AS by
           FROM public.notifications
          WHERE type = 'acting_invitation' AND action_data->>'membership_id' = '${membershipId}';`,
      );
      expect(converged.length).toBe(2);
      for (const r of converged) {
        expect(r.action_taken).toBe('accepted');
        expect(r.by).toBe(bobName);
      }
      expect(contextGroup).toBeTruthy();
    });

    it('decline deletes the membership yet the who-answered survives on the notification rows', async () => {
      const { membershipId, bobNotifId } = await freshActingInvite();
      const cb = await asUser(bob);
      const { data: res, error } = await cb.rpc('respond_to_acting_invitation', {
        p_notification_id: bobNotifId,
        p_accept: false,
      });
      expect(error).toBeNull();
      expect((res as { outcome: string }).outcome).toBe('declined');

      const mem = await runAdminSql(
        `SELECT count(*)::int AS n FROM public.group_memberships WHERE id = '${membershipId}';`,
      );
      expect(mem[0].n).toBe(0); // membership gone

      const converged = await runAdminSql(
        `SELECT action_taken, action_data->>'resolved_by_name' AS by
           FROM public.notifications
          WHERE type = 'acting_invitation' AND action_data->>'membership_id' = '${membershipId}';`,
      );
      expect(converged.length).toBe(2); // rows survive the delete
      for (const r of converged) {
        expect(r.action_taken).toBe('declined');
        expect(r.by).toBe(bobName);
      }
    });

    it('the co-leader answering after resolution gets already:true, not an error', async () => {
      const { bobNotifId, carolNotifId } = await freshActingInvite();
      const cb = await asUser(bob);
      await cb.rpc('respond_to_acting_invitation', { p_notification_id: bobNotifId, p_accept: true });

      const cc = await asUser(carol);
      const { data: res, error } = await cc.rpc('respond_to_acting_invitation', {
        p_notification_id: carolNotifId,
        p_accept: false, // Carol tries to decline — but Bob already accepted
      });
      expect(error).toBeNull();
      expect((res as { already: boolean; outcome: string }).already).toBe(true);
      expect((res as { outcome: string }).outcome).toBe('accepted'); // Bob's outcome stands
    });

    it("adversarial: another actor's notification id is refused (own-only)", async () => {
      const { bobNotifId } = await freshActingInvite();
      const ce = await asUser(eve);
      const { error } = await ce.rpc('respond_to_acting_invitation', {
        p_notification_id: bobNotifId,
        p_accept: true,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('P0002'); // not found (not yours to see)
    });

    it('a caller lacking act_as_group is refused 42501 by the Core gate — nothing converges', async () => {
      const { membershipId } = await freshActingInvite();
      // Seed an acting_invitation for Dave (a non-holder) pointing at the real
      // invited membership — mimics a holder who lost the key post-emission.
      const seeded = await runAdminSql(
        `INSERT INTO public.notifications
           (recipient_group_id, type, title, body, group_id, action_type, action_data)
         VALUES ('${dave.personalGroupId}', 'acting_invitation', 'Group Invitation',
                 'seeded ${runTag}', NULL, 'accept_decline',
                 jsonb_build_object('membership_id', '${membershipId}'))
         RETURNING id;`,
      );
      const daveNotifId = seeded[0].id;
      const cd = await asUser(dave);
      const { error } = await cd.rpc('respond_to_acting_invitation', {
        p_notification_id: daveNotifId,
        p_accept: true,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501'); // insufficient_privilege from the Core gate
      // The invitation is untouched (still invited; the two real holders' rows unconverged).
      const mem = await runAdminSql(
        `SELECT status FROM public.group_memberships WHERE id = '${membershipId}';`,
      );
      expect(mem[0].status).toBe('invited');
    });

    it('an anonymous caller is refused with a permission denial', async () => {
      const anon = createTestClient();
      const { error } = await anon.rpc('respond_to_acting_invitation', {
        p_notification_id: '00000000-0000-0000-0000-000000000000',
        p_accept: true,
      });
      expect(error).not.toBeNull();
      expect(error!.code).toBe('42501');
    });
  });

  // ---------------------------------------------------------------------------
  describe('STORY-4 — NTF-8 lazy expiry-on-view', () => {
    it('an unanswered actionable row past its deadline is marked expired on the next fetch', async () => {
      const seeded = await runAdminSql(
        `INSERT INTO public.notifications
           (recipient_group_id, type, title, body, action_type, action_data, expires_at)
         VALUES ('${eve.personalGroupId}', 'acting_invitation', 'expiring ${runTag}',
                 'past deadline', 'accept_decline', '{}'::jsonb, now() - interval '1 hour')
         RETURNING id;`,
      );
      const expiringId = seeded[0].id;
      const ce = await asUser(eve);
      const { data, error } = await ce.rpc('get_own_notifications', { p_limit: 50 });
      expect(error).toBeNull();
      const row = (data as NotificationRow[]).find((r) => r.id === expiringId)!;
      expect(row.action_taken).toBe('expired');

      // Idempotent — a second fetch leaves it expired, action_taken unchanged.
      const after = await runAdminSql(
        `SELECT action_taken FROM public.notifications WHERE id = '${expiringId}';`,
      );
      expect(after[0].action_taken).toBe('expired');
    });

    it('a not-yet-expired actionable row stays pending (no premature expiry)', async () => {
      const seeded = await runAdminSql(
        `INSERT INTO public.notifications
           (recipient_group_id, type, title, body, action_type, action_data, expires_at)
         VALUES ('${eve.personalGroupId}', 'acting_invitation', 'future ${runTag}',
                 'future deadline', 'accept_decline', '{}'::jsonb, now() + interval '7 days')
         RETURNING id;`,
      );
      const futureId = seeded[0].id;
      const ce = await asUser(eve);
      await ce.rpc('get_own_notifications', { p_limit: 50 });
      const after = await runAdminSql(
        `SELECT action_taken FROM public.notifications WHERE id = '${futureId}';`,
      );
      expect(after[0].action_taken).toBeNull();
    });
  });
});
