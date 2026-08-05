/**
 * FEAT-PD017 — bell-answerable personal invitations: armed dispatch, typed
 * response & all-doors convergence (Cycle N-E; WF-1 per the HYG-A walk;
 * ADR-U051 Amendment 2).
 *   STORY-1 (the personal invitation dispatches armed),
 *   STORY-2 (accept/decline lands from the notification — thin dispatch over
 *            the untouched Core pair, first-answer-wins/idempotent),
 *   STORY-3 (every door converges the standing notification — bell,
 *            MyInvitations, cancel, service-role delete; cancelled withholds
 *            the resolver's name).
 *
 * Red-first (authored 2026-08-05, pre-migration). Expected red classes:
 *   - the personal branch emits invitation_received with NO action_type /
 *     action_data (STORY-1 arming assertions fail on null);
 *   - notification_kinds.dispatch_segment is NULL for invitation_received
 *     (STORY-1 list-contract assertion fails);
 *   - respond_to_personal_invitation absent (PGRST202 function-not-found) →
 *     every STORY-2 dispatch/refusal assertion fails;
 *   - no convergence trigger on group_memberships → STORY-3 rows stay
 *     action_taken NULL after every door.
 * Labelled designed-green controls (green at red by nature, pinning current
 * behaviour): the notification's server copy (title/body/payload keys) is
 * unchanged by the arming; an unarmed orphan row stays passive.
 *
 * Topology: Alice creates engagement group G (fresh per case where the flow
 * consumes the invitation) and invites Eve (a personal invitation — the
 * invited member is a personal group). Frank is the cross-subject control.
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

type ArmedRow = {
  id: string;
  action_type: string | null;
  action_data: Record<string, unknown> | null;
  action_taken: string | null;
  expires_at: string | null;
};

describe('FEAT-PD017 — bell-answerable personal invitations (N-E)', () => {
  const admin = createAdminClient();
  const runTag = Date.now().toString(36);
  let grpCounter = 0;

  const createdGroupIds: string[] = [];

  let alice: TestUser; // inviter — Steward of each fresh group
  let eve: TestUser;   // invitee (personal invitation recipient)
  let frank: TestUser; // second invitee — cross-subject isolation control
  let eveName: string; // Eve's display name (= personal group name)

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  /** Alice creates a fresh group and personally invites the target. Returns
   *  the group, the invited membership id, and the invitation notification. */
  const freshPersonalInvite = async (
    target: TestUser,
  ): Promise<{ groupId: string; membershipId: string; notif: ArmedRow }> => {
    const ca = await asUser(alice);
    const { data: gid, error: gErr } = await ca.rpc('create_engagement_group', {
      p_name: `NE-grp-${runTag}-${grpCounter++}`,
    });
    expect(gErr).toBeNull();
    const groupId = gid as string;
    createdGroupIds.push(groupId);

    const { error: iErr } = await ca.rpc('invite_member', {
      p_group_id: groupId,
      p_member_group_id: target.personalGroupId,
    });
    expect(iErr).toBeNull();

    const mRows = await runAdminSql(
      `SELECT id FROM public.group_memberships
        WHERE group_id = '${groupId}'
          AND member_group_id = '${target.personalGroupId}'
          AND status = 'invited';`,
    );
    expect(mRows.length).toBe(1);
    const membershipId = mRows[0].id as string;

    const nRows = await runAdminSql(
      `SELECT id, action_type, action_data, action_taken, expires_at
         FROM public.notifications
        WHERE type = 'invitation_received'
          AND recipient_group_id = '${target.personalGroupId}'
          AND group_id = '${groupId}';`,
    );
    expect(nRows.length).toBe(1);
    return { groupId, membershipId, notif: nRows[0] as ArmedRow };
  };

  const notifById = async (id: string): Promise<ArmedRow> => {
    const rows = await runAdminSql(
      `SELECT id, action_type, action_data, action_taken, expires_at
         FROM public.notifications WHERE id = '${id}';`,
    );
    expect(rows.length).toBe(1);
    return rows[0] as ArmedRow;
  };

  beforeAll(async () => {
    [alice, eve, frank] = await Promise.all([
      createTestUser({ displayName: `NEa Alice ${runTag}` }),
      createTestUser({ displayName: `NEe Eve ${runTag}` }),
      createTestUser({ displayName: `NEf Frank ${runTag}` }),
    ]);
    const en = await runAdminSql(
      `SELECT name FROM public.groups WHERE id = '${eve.personalGroupId}';`,
    );
    eveName = en[0].name;
  });

  afterAll(async () => {
    for (const u of [alice, eve, frank].filter(Boolean)) {
      await admin.from('notifications').delete().eq('recipient_group_id', u.personalGroupId);
    }
    // TASK-INT-03: every engagement group this suite made, before the users.
    for (const id of createdGroupIds) {
      if (id) await cleanupTestGroup(id);
    }
    for (const u of [alice, eve, frank].filter(Boolean)) {
      await cleanupTestUser(u.user.id);
    }
  });

  // -------------------------------------------------------------------------
  // STORY-1 — the personal invitation dispatches armed
  // -------------------------------------------------------------------------

  it('STORY-1: a personal invite emits invitation_received armed with accept_decline + action_data, no expiry', async () => {
    const { groupId, membershipId, notif } = await freshPersonalInvite(eve);
    expect(notif.action_type).toBe('accept_decline');
    expect(notif.expires_at).toBeNull();
    const ad = notif.action_data as Record<string, unknown>;
    expect(ad).not.toBeNull();
    expect(ad.membership_id).toBe(membershipId);
    expect(ad.group_id).toBe(groupId);
    expect(typeof ad.group_name).toBe('string');
    expect(typeof ad.inviter_name).toBe('string');
    // Payload-walk honesty: exactly the spec'd keys ride action_data at dispatch.
    expect(Object.keys(ad).sort()).toEqual(
      ['group_id', 'group_name', 'inviter_name', 'membership_id'].sort(),
    );
  });

  it('STORY-1: the list contract serves dispatch_segment=invitation-response + the accept/decline responses (registry join)', async () => {
    await freshPersonalInvite(eve);
    const ce = await asUser(eve);
    const { data, error } = await ce.rpc('get_own_notifications', { p_limit: 50 });
    expect(error).toBeNull();
    const rows = (data as Array<Record<string, unknown>>).filter(
      (r) => r.type === 'invitation_received' || r.kind === 'invitation_received',
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows.filter((x) => x.action_type === 'accept_decline' && x.action_taken == null)) {
      expect(r.dispatch_segment).toBe('invitation-response');
      const responses = r.responses as Array<{ key: string }>;
      expect(responses.map((x) => x.key).sort()).toEqual(['accept', 'decline']);
    }
    // At red: dispatch_segment is NULL for the kind — the filter above still
    // finds armed rows only post-migration, so pin the direct claim too:
    const seg = await runAdminSql(
      `SELECT dispatch_segment FROM public.notification_kinds WHERE kind = 'invitation_received';`,
    );
    expect(seg[0].dispatch_segment).toBe('invitation-response');
  });

  it('STORY-1 (designed-green control): the server copy is unchanged by the arming', async () => {
    const { notif } = await freshPersonalInvite(eve);
    const rows = await runAdminSql(
      `SELECT title, body, payload FROM public.notifications WHERE id = '${notif.id}';`,
    );
    expect(rows[0].title).toBe('Group Invitation');
    expect(String(rows[0].body)).toContain('You have been invited to join');
    const payload = rows[0].payload as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(
      ['group_id', 'group_name', 'inviter_group_id', 'inviter_name'].sort(),
    );
  });

  it('STORY-1 (designed-green control): an unarmed orphan row stays passive and refuses the typed response', async () => {
    // Simulate a historical orphan: an unarmed invitation_received with no
    // membership behind it (the pre-N-E convergence hole's residue).
    const ins = await runAdminSql(
      `INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)
       VALUES ('${eve.personalGroupId}', 'invitation_received', 'Group Invitation',
               'orphan-${runTag}', '{}'::jsonb, NULL)
       RETURNING id, action_type;`,
    );
    expect(ins[0].action_type).toBeNull(); // stays passive — backfill must not fabricate
    const ce = await asUser(eve);
    const { error } = await ce.rpc('respond_to_personal_invitation', {
      p_notification_id: ins[0].id,
      p_accept: true,
    });
    expect(error).not.toBeNull(); // unarmed → refused (P0002-class), never a crash
  });

  // -------------------------------------------------------------------------
  // STORY-2 — accept/decline lands from the notification
  // -------------------------------------------------------------------------

  it('STORY-2: accept via the bell activates the membership and converges my row with my name', async () => {
    const { groupId, notif } = await freshPersonalInvite(eve);
    const ce = await asUser(eve);
    const { data, error } = await ce.rpc('respond_to_personal_invitation', {
      p_notification_id: notif.id,
      p_accept: true,
    });
    expect(error).toBeNull();
    const res = data as { outcome: string; resolved_by_name: string; already: boolean };
    expect(res.outcome).toBe('accepted');
    expect(res.resolved_by_name).toBe(eveName);
    expect(res.already).toBe(false);

    const m = await runAdminSql(
      `SELECT status FROM public.group_memberships
        WHERE group_id = '${groupId}' AND member_group_id = '${eve.personalGroupId}';`,
    );
    expect(m[0].status).toBe('active'); // the untouched Core door did the join
    const after = await notifById(notif.id);
    expect(after.action_taken).toBe('accepted');
    expect((after.action_data as Record<string, unknown>).resolved_by_name).toBe(eveName);
    expect((after.action_data as Record<string, unknown>).resolved_outcome).toBe('accepted');
  });

  it('STORY-2: decline via the bell deletes the membership; the converged record survives (Option A)', async () => {
    const { groupId, notif } = await freshPersonalInvite(eve);
    const ce = await asUser(eve);
    const { data, error } = await ce.rpc('respond_to_personal_invitation', {
      p_notification_id: notif.id,
      p_accept: false,
    });
    expect(error).toBeNull();
    expect((data as { outcome: string }).outcome).toBe('declined');

    const m = await runAdminSql(
      `SELECT id FROM public.group_memberships
        WHERE group_id = '${groupId}' AND member_group_id = '${eve.personalGroupId}';`,
    );
    expect(m.length).toBe(0); // the row it answered is gone —
    const after = await notifById(notif.id); // — the record outlives it
    expect(after.action_taken).toBe('declined');
    expect((after.action_data as Record<string, unknown>).resolved_by_name).toBe(eveName);
  });

  it('STORY-2: a held group refuses both answers verbatim and nothing converges (PC023 composes)', async () => {
    const { groupId, notif } = await freshPersonalInvite(eve);
    await runAdminSql(
      `UPDATE public.groups SET status = 'suspended' WHERE id = '${groupId}';`,
    );
    const ce = await asUser(eve);
    const acc = await ce.rpc('respond_to_personal_invitation', {
      p_notification_id: notif.id,
      p_accept: true,
    });
    expect(acc.error).not.toBeNull();
    expect(String(acc.error?.message)).toMatch(/suspended/i);
    const dec = await ce.rpc('respond_to_personal_invitation', {
      p_notification_id: notif.id,
      p_accept: false,
    });
    expect(dec.error).not.toBeNull();
    const after = await notifById(notif.id);
    expect(after.action_taken).toBeNull(); // the ask still stands
    await runAdminSql(
      `UPDATE public.groups SET status = 'active' WHERE id = '${groupId}';`,
    );
  });

  it('STORY-2 (adversarial): another actor cannot see or answer my notification', async () => {
    const { notif } = await freshPersonalInvite(eve);
    const ca = await asUser(alice);
    const { error } = await ca.rpc('respond_to_personal_invitation', {
      p_notification_id: notif.id,
      p_accept: true,
    });
    expect(error).not.toBeNull(); // P0002 not-found — own-notification only
    const after = await notifById(notif.id);
    expect(after.action_taken).toBeNull();
  });

  it('STORY-2: answering an already-resolved invitation is idempotent (already:true, no duplicate side effects)', async () => {
    const { notif } = await freshPersonalInvite(eve);
    const ce = await asUser(eve);
    const first = await ce.rpc('respond_to_personal_invitation', {
      p_notification_id: notif.id,
      p_accept: true,
    });
    expect(first.error).toBeNull();
    const second = await ce.rpc('respond_to_personal_invitation', {
      p_notification_id: notif.id,
      p_accept: false, // a contradictory second answer must NOT decline
    });
    expect(second.error).toBeNull();
    const res = second.data as { outcome: string; already: boolean };
    expect(res.already).toBe(true);
    expect(res.outcome).toBe('accepted'); // first answer won
  });

  // -------------------------------------------------------------------------
  // STORY-3 — every door converges the standing notification
  // -------------------------------------------------------------------------

  it('STORY-3: accepting on /groups (accept_group_invitation) converges the standing row with my name', async () => {
    const { groupId, notif } = await freshPersonalInvite(eve);
    const ce = await asUser(eve);
    const { error } = await ce.rpc('accept_group_invitation', { p_group_id: groupId });
    expect(error).toBeNull();
    const after = await notifById(notif.id);
    expect(after.action_taken).toBe('accepted');
    const ad = after.action_data as Record<string, unknown>;
    expect(ad.resolved_by_name).toBe(eveName);
    expect(ad.resolved_outcome).toBe('accepted');
  });

  it('STORY-3: declining on /groups (decline_group_invitation) converges declined with my name', async () => {
    const { groupId, notif } = await freshPersonalInvite(eve);
    const ce = await asUser(eve);
    const { error } = await ce.rpc('decline_group_invitation', { p_group_id: groupId });
    expect(error).toBeNull();
    const after = await notifById(notif.id);
    expect(after.action_taken).toBe('declined');
    expect((after.action_data as Record<string, unknown>).resolved_by_name).toBe(eveName);
  });

  it('STORY-3: a cancelled invitation converges cancelled and WITHHOLDS the canceller name', async () => {
    const { groupId, notif } = await freshPersonalInvite(eve);
    const ca = await asUser(alice);
    const { error } = await ca.rpc('cancel_member_invitation', {
      p_group_id: groupId,
      p_member_group_id: eve.personalGroupId,
    });
    expect(error).toBeNull();
    const after = await notifById(notif.id);
    expect(after.action_taken).toBe('cancelled');
    const ad = after.action_data as Record<string, unknown>;
    expect(ad.resolved_outcome).toBe('cancelled');
    expect(ad.resolved_by_name ?? null).toBeNull(); // the fact, never the actor
  });

  it('STORY-3: a service-role delete of the invited row converges cancelled without erroring (NULL actor fallback)', async () => {
    const { groupId, notif } = await freshPersonalInvite(eve);
    await runAdminSql(
      `DELETE FROM public.group_memberships
        WHERE group_id = '${groupId}'
          AND member_group_id = '${eve.personalGroupId}'
          AND status = 'invited';`,
    );
    const after = await notifById(notif.id);
    expect(after.action_taken).toBe('cancelled');
    expect(((after.action_data as Record<string, unknown>).resolved_by_name) ?? null).toBeNull();
  });

  it('STORY-3: convergence keys on membership_id — a sibling invitation is untouched', async () => {
    const a = await freshPersonalInvite(eve);
    const b = await freshPersonalInvite(frank);
    const ce = await asUser(eve);
    const { error } = await ce.rpc('accept_group_invitation', { p_group_id: a.groupId });
    expect(error).toBeNull();
    const mine = await notifById(a.notif.id);
    expect(mine.action_taken).toBe('accepted');
    const theirs = await notifById(b.notif.id);
    expect(theirs.action_taken).toBeNull(); // Frank's ask still stands
  });
});
