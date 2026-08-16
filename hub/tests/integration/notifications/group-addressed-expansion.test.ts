/**
 * FEAT-PD020 — group-addressed notification delivery: dead letters stop being
 * written, by construction.
 *
 * A notification addressed to an engagement group is a letter no one can read
 * (get_own_notifications serves personal rows only; the hint resolver answers
 * no-topic for a non-personal recipient — 20260726120000:272-276). The board
 * (2026-08-15): expand at WRITE TIME to the people who answer for the group —
 * act_as_group holders ∪ Stewards, one level, deduplicated, the triggering
 * actor excluded — via a BEFORE INSERT trigger on public.notifications
 * (trg_ds5_aa_expand_group_addressed, named to fire before the N-D dispatcher
 * so the group row is expanded, never fed to a preference read with no user
 * behind it). Expanded rows are ordinary personal rows: the dispatcher and the
 * hint trigger apply per recipient exactly as if each person had been
 * addressed directly.
 *
 * Red-first (authored 2026-08-15, pre-migration 20260815223000). Expected red
 * classes — all behavioural (the writers exist; nothing expands):
 *   - the announcement fan-out leaves a row addressed to the member-GROUP and
 *     none for its answerers
 *   - direct group-addressed writes (the role/participation family's shape)
 *     land on the group, invisible forever
 *
 * Labelled guards (green both sides):
 *   - a personal-addressed insert is byte-identical before and after (the
 *     shape guard — no re-expansion; PD014's acting_invitation writer emits
 *     personal rows by construction and inherits this guard as a class)
 *
 * NOT re-tested here: hint emission for personal rows (N-C's suite owns it —
 * expanded rows are personal rows, so the no-topic branch cannot fire for
 * them by shape) and the STORY-3 disposition of the 6 live prod rows (dev has
 * 0 — probed 2026-08-15; the migration RAISEs its re-address counts and the
 * schema gate verifies them at prod apply).
 */

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

jest.setTimeout(240_000);

describe('FEAT-PD020 — group-addressed expansion (dead letters stop)', () => {
  const admin = createAdminClient();
  const runTag = `pd020${Date.now().toString(36)}`;

  let hostSteward: TestUser; // Steward of B; the announcement actor; ALSO holds act_as_group in A (the exclusion case)
  let stewardA: TestUser; // Steward of A (template carries act_as_group — the dedupe case)
  let holder: TestUser; // member of A with a custom act_as_group role
  let bystander: TestUser; // plain member of A — must never receive via expansion
  let steward2: TestUser; // Steward of A2, whose Steward role is stripped of act_as_group (the floor case)

  let groupB: string; // the host
  let groupA: string; // member-group of B, fully staffed
  let groupA2: string; // member-group of B, Stewards-only floor
  let globalGroupAddressedBefore = 0;

  const asUser = async (u: TestUser): Promise<SupabaseClient> => {
    const c = createTestClient();
    await signInWithRetry(c, u.email, u.password);
    return c;
  };

  const countFor = async (recipientGroupId: string, type?: string): Promise<number> => {
    const rows = (await runAdminSql(`
      SELECT count(*)::int AS n FROM public.notifications
       WHERE recipient_group_id = '${recipientGroupId}'
         ${type ? `AND type = '${type}'` : ''};`)) as Array<{ n: number }>;
    return rows[0].n;
  };

  /** Title-scoped count — the fixture setup itself fires real role_assigned /
   *  invitation traffic (the writers are live, which is the point), so
   *  per-kind absolute counts collide; the cell's unique title isolates
   *  exactly the row under test. */
  const countTitled = async (recipientGroupId: string, title: string): Promise<number> => {
    const rows = (await runAdminSql(`
      SELECT count(*)::int AS n FROM public.notifications
       WHERE recipient_group_id = '${recipientGroupId}' AND title = '${title}';`)) as Array<{
      n: number;
    }>;
    return rows[0].n;
  };

  const globalGroupAddressed = async (): Promise<number> => {
    const rows = (await runAdminSql(`
      SELECT count(*)::int AS n
        FROM public.notifications n
        JOIN public.groups g ON g.id = n.recipient_group_id
       WHERE g.group_type = 'engagement';`)) as Array<{ n: number }>;
    return rows[0].n;
  };

  /** Active membership for a PERSON in a group, with the Member-template role. */
  const addPerson = async (u: TestUser, groupId: string, addedBy: string) => {
    await runAdminSql(`
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
      VALUES ('${groupId}', '${u.personalGroupId}', '${addedBy}', 'active');
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${u.personalGroupId}', '${groupId}', gr.id, '${addedBy}'
      FROM public.group_roles gr
      WHERE gr.group_id = '${groupId}' AND gr.name = 'Member Role Template';`);
  };

  /** A custom role carrying exactly act_as_group, assigned to one person. */
  const grantActAsGroup = async (u: TestUser, groupId: string, roleName: string, by: string) => {
    await runAdminSql(`
      WITH r AS (
        INSERT INTO public.group_roles (group_id, name)
        VALUES ('${groupId}', '${roleName}') RETURNING id
      ), p AS (
        INSERT INTO public.group_role_permissions (group_role_id, permission_id)
        SELECT r.id, perm.id FROM r, public.permissions perm
        WHERE perm.name = 'act_as_group' RETURNING group_role_id
      )
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
      SELECT '${u.personalGroupId}', '${groupId}', r.id, '${by}' FROM r;`);
  };

  /** The invited -> active two-step, so the auto-role edge fires for the
   *  member-GROUP exactly as the real join path does. */
  const addGroupMember = async (memberGroupId: string, hostId: string, addedBy: string) => {
    await runAdminSql(`
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
      VALUES ('${hostId}', '${memberGroupId}', '${addedBy}', 'invited');
      UPDATE public.group_memberships SET status = 'active'
      WHERE group_id = '${hostId}' AND member_group_id = '${memberGroupId}';`);
  };

  beforeAll(async () => {
    hostSteward = await createTestUser({ displayName: `PDtHost${runTag}` });
    stewardA = await createTestUser({ displayName: `PDtStewA${runTag}` });
    holder = await createTestUser({ displayName: `PDtHold${runTag}` });
    bystander = await createTestUser({ displayName: `PDtByst${runTag}` });
    steward2 = await createTestUser({ displayName: `PDtStew2${runTag}` });

    const cHost = await asUser(hostSteward);
    const { data: bId, error: bErr } = await cHost.rpc('create_engagement_group', {
      p_name: `PDtHostGrp${runTag}`,
    });
    if (bErr) throw new Error(`seed B: ${bErr.message}`);
    groupB = bId as string;

    const cA = await asUser(stewardA);
    const { data: aId, error: aErr } = await cA.rpc('create_engagement_group', {
      p_name: `PDtRepGrp${runTag}`,
    });
    if (aErr) throw new Error(`seed A: ${aErr.message}`);
    groupA = aId as string;

    const c2 = await asUser(steward2);
    const { data: a2Id, error: a2Err } = await c2.rpc('create_engagement_group', {
      p_name: `PDtFloorGrp${runTag}`,
    });
    if (a2Err) throw new Error(`seed A2: ${a2Err.message}`);
    groupA2 = a2Id as string;

    // A's people: the holder (custom key), the bystander (no key), and the
    // host steward (key held ACROSS groups — the actor-exclusion case).
    await addPerson(holder, groupA, stewardA.personalGroupId);
    await grantActAsGroup(holder, groupA, `PDtRep${runTag}`, stewardA.personalGroupId);
    await addPerson(bystander, groupA, stewardA.personalGroupId);
    await addPerson(hostSteward, groupA, stewardA.personalGroupId);
    await grantActAsGroup(hostSteward, groupA, `PDtRepX${runTag}`, stewardA.personalGroupId);

    // The floor: strip act_as_group from A2's Steward role instance — the
    // customized-template shape the Steward limb exists for.
    await runAdminSql(`
      DELETE FROM public.group_role_permissions grp
      USING public.group_roles gr, public.permissions p
      WHERE grp.group_role_id = gr.id AND grp.permission_id = p.id
        AND gr.group_id = '${groupA2}' AND p.name = 'act_as_group';`);

    // Both member-groups join the host.
    await addGroupMember(groupA, groupB, hostSteward.personalGroupId);
    await addGroupMember(groupA2, groupB, hostSteward.personalGroupId);

    globalGroupAddressedBefore = await globalGroupAddressed();
  });

  afterAll(async () => {
    for (const gid of [groupA, groupA2, groupB].filter(Boolean)) {
      await admin.from('groups').delete().eq('id', gid);
    }
    for (const u of [hostSteward, stewardA, holder, bystander, steward2].filter(Boolean)) {
      await cleanupTestUser(u.user.id);
    }
  });

  // ------------------------------------------------------------------ STORY-1
  it('the announcement fan-out reaches the answerers, once each, never the group, never the actor', async () => {
    const title = `PDt announcement ${runTag}`;
    const cHost = await asUser(hostSteward);
    const { error } = await cHost.rpc('send_community_announcement', {
      p_group_id: groupB,
      p_title: title,
      p_body: 'the expansion proof',
    });
    expect(error).toBeNull();

    // Never the group: no row addressed to A or A2 survives the write.
    expect(await countFor(groupA)).toBe(0);
    expect(await countFor(groupA2)).toBe(0);

    // The answerers, once each: A's Steward (whose template also carries the
    // key — the dedupe proof is the count staying 1) and the custom holder.
    expect(await countFor(stewardA.personalGroupId, 'announcement')).toBe(1);
    expect(await countFor(holder.personalGroupId, 'announcement')).toBe(1);

    // The floor, through the writer path too: A2's Steward role lost the key,
    // the Steward limb still delivers.
    expect(await countFor(steward2.personalGroupId, 'announcement')).toBe(1);

    // A plain member of A is not an answerer.
    expect(await countFor(bystander.personalGroupId, 'announcement')).toBe(0);

    // The actor: hostSteward holds the key IN A, but sent the announcement —
    // the sender is excluded from A's expansion (and from B's own fan-out,
    // which already excluded senders).
    expect(await countFor(hostSteward.personalGroupId, 'announcement')).toBe(0);
  });

  // ------------------------------------------------------------------ STORY-2
  it('a muteable kind respects each recipient’s preference — per person, not per group', async () => {
    // S mutes the roles category (the registered suppressible family the
    // dead letters actually carried).
    await runAdminSql(`
      INSERT INTO public.notification_preferences (recipient_group_id, category_key, channel, allowed)
      VALUES ('${stewardA.personalGroupId}', 'roles', 'in_app', false)
      ON CONFLICT (recipient_group_id, category_key, channel) DO UPDATE SET allowed = false;`);

    await runAdminSql(`
      INSERT INTO public.notifications (recipient_group_id, type, title, body)
      VALUES ('${groupA}', 'role_assigned', 'PDt role news ${runTag}', 'x');`);

    expect(await countFor(groupA)).toBe(0);
    // The holder hears it; the muted Steward does not — suppression applied
    // per expanded recipient by the dispatcher, exactly as a direct address.
    expect(await countTitled(holder.personalGroupId, `PDt role news ${runTag}`)).toBe(1);
    expect(await countTitled(stewardA.personalGroupId, `PDt role news ${runTag}`)).toBe(0);
  });

  it('a non-suppressible kind rings through a behind-the-back preference row', async () => {
    await runAdminSql(`
      INSERT INTO public.notification_preferences (recipient_group_id, category_key, channel, allowed)
      VALUES ('${stewardA.personalGroupId}', 'account', 'in_app', false)
      ON CONFLICT (recipient_group_id, category_key, channel) DO UPDATE SET allowed = false;`);

    await runAdminSql(`
      INSERT INTO public.notifications (recipient_group_id, type, title, body)
      VALUES ('${groupA}', 'participation_paused', 'PDt pause notice ${runTag}', 'x');`);

    expect(await countFor(groupA)).toBe(0);
    expect(await countTitled(stewardA.personalGroupId, `PDt pause notice ${runTag}`)).toBe(1);
    expect(await countTitled(holder.personalGroupId, `PDt pause notice ${runTag}`)).toBe(1);
  });

  // ------------------------------------------- the shape guard (green-both-sides)
  it('[guard, green today] a personal-addressed insert is byte-identical — no re-expansion, ever', async () => {
    await runAdminSql(`
      INSERT INTO public.notifications (recipient_group_id, type, title, body)
      VALUES ('${bystander.personalGroupId}', 'role_assigned', 'PDt direct ${runTag}', 'x');`);

    const rows = (await runAdminSql(`
      SELECT recipient_group_id, type, title FROM public.notifications
       WHERE title = 'PDt direct ${runTag}';`)) as Array<{
      recipient_group_id: string;
      type: string;
      title: string;
    }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].recipient_group_id).toBe(bystander.personalGroupId);
    expect(rows[0].type).toBe('role_assigned');
  });

  // ------------------------------------------------------------------ STORY-3
  it('the residue instrument: this suite grew the group-addressed row count by exactly zero', async () => {
    expect(await countFor(groupA)).toBe(0);
    expect(await countFor(groupA2)).toBe(0);
    expect(await globalGroupAddressed()).toBe(globalGroupAddressedBefore);
  });
});
