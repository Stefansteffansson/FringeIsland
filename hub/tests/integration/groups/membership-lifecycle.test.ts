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

const GHOST = '00000000-0000-0000-0000-00000000dead';

/** Promote a personal group to platform admin (the invitation-contracts
 *  suite's pattern, reused): active DeusEx member + DeusEx role — Tier-1
 *  grants manage_all_groups context-free. */
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

/** One member entry of the get_group_detail members payload (PC013 shape). */
type MemberEntry = {
  display_name: string;
  joined_at: string;
  member_group_id: string;
  roles: string[];
  membership_status: string;
};

/**
 * FEAT-PC013 (Groups Cycle G-D) — membership lifecycle contracts.
 *
 * Red-first:
 *  - pause_member / activate_member / remove_member fail PGRST202 (absent)
 *    until the migration lands.
 *  - get_group_detail's membership_status key + paused-row inclusion are
 *    absent until the migration replaces the function.
 *  - leave_group asserts go red against the LEGACY body's different
 *    behaviour: legacy raises P0001 free-text where the contract answers
 *    P0002 no-leak, and legacy EXECUTES the sole-Steward handover and the
 *    last-member closure (on this suite's own fixtures) where the contract
 *    refuses P0001. Genuine reds, red for the right reason.
 *
 * Labelled honestly (not red-first):
 *  - Regular-leave cascade asserts (freeze / roles / membership / member_left)
 *    are carried-forward legacy behaviour — green against the legacy body by
 *    design; the replacement must keep them green.
 *  - STORY-6's admin-policy and decline asserts verify EXISTING substrate
 *    ("verified, not assumed"). The direct self-DELETE/UPDATE refusals are
 *    red-first: the pre-drop policies permit what the narrowing forbids.
 *  - The TRUNCATE revoke is verified by SQL audit at the schema gate
 *    (PostgREST exposes no TRUNCATE verb).
 */
describe('FEAT-PC013 — group membership lifecycle contracts (G-D)', () => {
  const admin = createAdminClient();
  let steward: TestUser;
  let steward2: TestUser; // second Steward for the last-active-Steward matrices
  let pauser: TestUser; // holds pause_members ONLY
  let activator: TestUser; // holds activate_members ONLY
  let remover: TestUser; // holds remove_members ONLY
  let target: TestUser; // the paused/removed subject (holds a probe permission)
  let plainMember: TestUser; // active member, Member-template role only
  let leaver: TestUser; // STORY-5 regular-leave subject
  let outsider: TestUser; // FIM, never a member
  let suspendedHolder: TestUser; // pause+activate+remove holder, then is_active=false

  const createdUserIds: string[] = [];
  const createdGroupIds: string[] = [];

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

  /** Steward bootstraps a PRIVATE group; `members` join active; per-holder
   *  minimal-permission custom roles prove the three keys gate independently. */
  const seedGroup = async (
    name: string,
    members: TestUser[],
    grants: Array<{ holder: TestUser; roleName: string; perms: string[] }> = [],
  ): Promise<string> => {
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

    for (const grant of grants) {
      const { data: role, error: rErr } = await admin
        .from('group_roles')
        .insert({ group_id: groupId, name: grant.roleName })
        .select('id')
        .single();
      if (rErr) throw new Error(`seedGroup role ${grant.roleName}: ${rErr.message}`);
      for (const permName of grant.perms) {
        const { data: perm } = await admin
          .from('permissions')
          .select('id')
          .eq('name', permName)
          .single();
        const { error: gErr } = await admin
          .from('group_role_permissions')
          .insert({ group_role_id: role!.id, permission_id: perm!.id });
        if (gErr) throw new Error(`seedGroup grant ${permName}: ${gErr.message}`);
      }
      const { error: bErr } = await admin.from('user_group_roles').insert({
        member_group_id: grant.holder.personalGroupId,
        group_id: groupId,
        group_role_id: role!.id,
        assigned_by_group_id: steward.personalGroupId,
      });
      if (bErr) throw new Error(`seedGroup binding ${grant.roleName}: ${bErr.message}`);
    }
    return groupId as string;
  };

  /** Bind the group's template-derived role instance (G-A bootstrap names
   *  instances verbatim after templates) to a member. */
  const bindTemplateRole = async (groupId: string, user: TestUser, templateName: string) => {
    const { data: tpl } = await admin
      .from('role_templates')
      .select('id')
      .eq('name', templateName)
      .single();
    const { data: role } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', groupId)
      .eq('created_from_role_template_id', tpl!.id)
      .single();
    const { error } = await admin.from('user_group_roles').insert({
      member_group_id: user.personalGroupId,
      group_id: groupId,
      group_role_id: role!.id,
      assigned_by_group_id: steward.personalGroupId,
    });
    if (error) throw new Error(`bindTemplateRole(${templateName}): ${error.message}`);
  };

  /** Non-public journey owned by the group + an active individual enrolment
   *  for the member — the DS-3 freeze probe. Returns the enrolment id. */
  const seedFreezeProbe = async (groupId: string, member: TestUser): Promise<string> => {
    const { data: journey, error: jErr } = await admin
      .from('journeys')
      .insert({
        title: `GD freeze probe ${Date.now()}`,
        created_by_group_id: groupId,
        is_public: false,
      })
      .select('id')
      .single();
    if (jErr) throw new Error(`seedFreezeProbe journey: ${jErr.message}`);
    const { data: enr, error: eErr } = await admin
      .from('journey_enrollments')
      .insert({
        journey_id: journey!.id,
        group_id: member.personalGroupId,
        enrolled_by_group_id: member.personalGroupId,
        status: 'active',
        progress_data: {},
      })
      .select('id')
      .single();
    if (eErr) throw new Error(`seedFreezeProbe enrolment: ${eErr.message}`);
    return enr!.id as string;
  };

  const membershipRow = async (groupId: string, member: TestUser) => {
    const { data } = await admin
      .from('group_memberships')
      .select('status, status_changed_at')
      .eq('group_id', groupId)
      .eq('member_group_id', member.personalGroupId)
      .maybeSingle();
    return data as { status: string; status_changed_at: string } | null;
  };

  const roleCount = async (groupId: string, member: TestUser): Promise<number> => {
    const { data } = await admin
      .from('user_group_roles')
      .select('id')
      .eq('group_id', groupId)
      .eq('member_group_id', member.personalGroupId);
    return (data ?? []).length;
  };

  const hasPerm = async (actor: TestUser, groupId: string, perm: string): Promise<boolean> => {
    const { data, error } = await admin.rpc('has_permission', {
      p_acting_group_id: actor.personalGroupId,
      p_context_group_id: groupId,
      p_permission_name: perm,
    });
    expect(error).toBeNull();
    return data as boolean;
  };

  const notificationCount = async (recipient: TestUser, groupId: string, type: string) => {
    const { data } = await admin
      .from('notifications')
      .select('id')
      .eq('recipient_group_id', recipient.personalGroupId)
      .eq('group_id', groupId)
      .eq('type', type);
    return (data ?? []).length;
  };

  beforeAll(async () => {
    // Single-token display names (the nickname rule — the G-C finding).
    steward = await createTestUser({ displayName: 'GDSteward' });
    steward2 = await createTestUser({ displayName: 'GDStewardTwo' });
    pauser = await createTestUser({ displayName: 'GDPauser' });
    activator = await createTestUser({ displayName: 'GDActivator' });
    remover = await createTestUser({ displayName: 'GDRemover' });
    target = await createTestUser({ displayName: 'GDTarget' });
    plainMember = await createTestUser({ displayName: 'GDPlain' });
    leaver = await createTestUser({ displayName: 'GDLeaver' });
    outsider = await createTestUser({ displayName: 'GDOutsider' });
    suspendedHolder = await createTestUser({ displayName: 'GDSuspended' });
    for (const u of [
      steward, steward2, pauser, activator, remover, target,
      plainMember, leaver, outsider, suspendedHolder,
    ]) {
      createdUserIds.push(u.user.id);
    }
    await admin
      .from('users')
      .update({ is_active: false })
      .eq('auth_user_id', suspendedHolder.user.id);
  }, 180_000);

  afterAll(async () => {
    for (const g of createdGroupIds) await cleanupTestGroup(g);
    for (const id of createdUserIds) await cleanupTestUser(id);
  }, 180_000);

  // -------------------------------------------------------------------------
  // STORY-1 — pause_member (MEM-4)
  // -------------------------------------------------------------------------
  describe('STORY-1: pause a member', () => {
    let groupId: string;
    beforeAll(async () => {
      groupId = await seedGroup(
        'GD S1 Pause Group',
        [pauser, activator, target, plainMember, suspendedHolder],
        [
          { holder: pauser, roleName: 'GD Pauser', perms: ['pause_members'] },
          { holder: activator, roleName: 'GD Activator', perms: ['activate_members'] },
          { holder: suspendedHolder, roleName: 'GD SuspHolder', perms: ['pause_members'] },
          // the darkness probe: target holds a live permission
          { holder: target, roleName: 'GD Probe', perms: ['view_member_profiles'] },
        ],
      );
    });

    it('pauses an active member: status flip + timestamp, roles preserved, permission goes dark, durable row', async () => {
      const before = await membershipRow(groupId, target);
      expect(before?.status).toBe('active');
      const rolesBefore = await roleCount(groupId, target);
      expect(rolesBefore).toBeGreaterThan(0);
      expect(await hasPerm(target, groupId, 'view_member_profiles')).toBe(true);

      const c = await asUser(pauser);
      const { error } = await c.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: target.personalGroupId,
      });
      expect(error).toBeNull();

      const after = await membershipRow(groupId, target);
      expect(after?.status).toBe('paused');
      expect(new Date(after!.status_changed_at).getTime()).toBeGreaterThan(
        new Date(before!.status_changed_at).getTime(),
      );
      expect(await roleCount(groupId, target)).toBe(rolesBefore);
      // the substrate filter, exercised: permission dark while paused
      expect(await hasPerm(target, groupId, 'view_member_profiles')).toBe(false);
      expect(await notificationCount(target, groupId, 'participation_paused')).toBeGreaterThanOrEqual(1);
    });

    it('refuses: already-paused P0001, self-target P0001, ghost/non-member P0002', async () => {
      const c = await asUser(pauser);
      const again = await c.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: target.personalGroupId,
      });
      expect(again.error?.code).toBe('P0001');

      const self = await c.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: pauser.personalGroupId,
      });
      expect(self.error?.code).toBe('P0001');

      const ghost = await c.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: GHOST,
      });
      expect(ghost.error?.code).toBe('P0002');

      const nonMember = await c.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: outsider.personalGroupId,
      });
      expect(nonMember.error?.code).toBe('P0002');
    });

    it('gates: wrong key 42501, plain member 42501, non-member P0002, suspended 42501, Mist 42501', async () => {
      // activator holds activate_members, not pause_members — keys gate independently
      const ca = await asUser(activator);
      const wrongKey = await ca.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: plainMember.personalGroupId,
      });
      expect(wrongKey.error?.code).toBe('42501');

      const cp = await asUser(plainMember);
      const noPerm = await cp.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: target.personalGroupId,
      });
      expect(noPerm.error?.code).toBe('42501');

      const co = await asUser(outsider);
      const hidden = await co.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: target.personalGroupId,
      });
      expect(hidden.error?.code).toBe('P0002');

      const cs = await asUser(suspendedHolder);
      const susp = await cs.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: plainMember.personalGroupId,
      });
      expect(susp.error?.code).toBe('42501');

      const cm = await asMist();
      const mist = await cm.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: target.personalGroupId,
      });
      expect(mist.error?.code).toBe('42501');
      await cm.auth.signOut();
    });

    it('never leaves a group effectively headless: last-active-Steward target P0001', async () => {
      // steward is this group's only Steward — pausing them is refused
      const c = await asUser(pauser);
      const res = await c.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: steward.personalGroupId,
      });
      expect(res.error?.code).toBe('P0001');
      expect((await membershipRow(groupId, steward))?.status).toBe('active');
    });
  });

  // -------------------------------------------------------------------------
  // STORY-2 — activate_member (MEM-4)
  // -------------------------------------------------------------------------
  describe('STORY-2: reactivate a paused member', () => {
    let groupId: string;
    beforeAll(async () => {
      groupId = await seedGroup(
        'GD S2 Activate Group',
        [pauser, activator, target],
        [
          { holder: pauser, roleName: 'GD Pauser2', perms: ['pause_members'] },
          { holder: activator, roleName: 'GD Activator2', perms: ['activate_members'] },
          { holder: target, roleName: 'GD Probe2', perms: ['view_member_profiles'] },
        ],
      );
      const c = await asUser(pauser);
      const { error } = await c.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: target.personalGroupId,
      });
      if (error) throw new Error(`S2 setup pause: ${error.message}`);
    });

    it('reactivates: status flip, preserved roles resume, durable row, no invitation-era side effects', async () => {
      const rolesBefore = await roleCount(groupId, target);
      const acceptedBefore = await notificationCount(target, groupId, 'invitation_accepted');

      const c = await asUser(activator);
      const { error } = await c.rpc('activate_member', {
        p_group_id: groupId,
        p_member_group_id: target.personalGroupId,
      });
      expect(error).toBeNull();

      expect((await membershipRow(groupId, target))?.status).toBe('active');
      expect(await hasPerm(target, groupId, 'view_member_profiles')).toBe(true);
      // no duplicate Member-role binding, no invitation_accepted row —
      // the invited→active triggers stay silent on paused→active (asserted)
      expect(await roleCount(groupId, target)).toBe(rolesBefore);
      expect(await notificationCount(target, groupId, 'invitation_accepted')).toBe(acceptedBefore);
      expect(await notificationCount(target, groupId, 'participation_activated')).toBeGreaterThanOrEqual(1);
    });

    it('refuses: active target P0001, ghost P0002, wrong key 42501', async () => {
      const c = await asUser(activator);
      const active = await c.rpc('activate_member', {
        p_group_id: groupId,
        p_member_group_id: target.personalGroupId,
      });
      expect(active.error?.code).toBe('P0001');

      const ghost = await c.rpc('activate_member', {
        p_group_id: groupId,
        p_member_group_id: GHOST,
      });
      expect(ghost.error?.code).toBe('P0002');

      const cp = await asUser(pauser); // holds pause_members, not activate_members
      const wrongKey = await cp.rpc('activate_member', {
        p_group_id: groupId,
        p_member_group_id: target.personalGroupId,
      });
      expect(wrongKey.error?.code).toBe('42501');
    });
  });

  // -------------------------------------------------------------------------
  // STORY-3 — paused state is honest in every read (MEM-4)
  // -------------------------------------------------------------------------
  describe('STORY-3: paused state in the reads', () => {
    let groupId: string;
    beforeAll(async () => {
      groupId = await seedGroup(
        'GD S3 Reads Group',
        [pauser, target, plainMember],
        [
          { holder: pauser, roleName: 'GD Pauser3', perms: ['pause_members'] },
          // the group-scoped grant the paused-permissions assert bites on
          { holder: target, roleName: 'GD Probe3', perms: ['view_member_profiles'] },
        ],
      );
      // plainMember views the list via the group's own Member-template instance
      // (view_member_list, none of the three management keys)
      await bindTemplateRole(groupId, plainMember, 'Member Role Template');
      const c = await asUser(pauser);
      const { error } = await c.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: target.personalGroupId,
      });
      if (error) throw new Error(`S3 setup pause: ${error.message}`);
    });

    it('management-permission viewer sees the paused row flagged; member_count stays active-only', async () => {
      const c = await asUser(pauser);
      const { data, error } = await c.rpc('get_group_detail', { p_group_id: groupId });
      expect(error).toBeNull();
      const detail = data as { member_count: number; members: MemberEntry[] };
      const paused = detail.members.find(
        (m) => m.member_group_id === target.personalGroupId,
      );
      expect(paused?.membership_status).toBe('paused');
      const activeRow = detail.members.find(
        (m) => m.member_group_id === plainMember.personalGroupId,
      );
      expect(activeRow?.membership_status).toBe('active');
      // steward + pauser + plainMember are active; target is paused
      expect(detail.member_count).toBe(3);
    });

    it('ordinary list viewer sees the active-only list unchanged (Open Q3)', async () => {
      const c = await asUser(plainMember);
      const { data, error } = await c.rpc('get_group_detail', { p_group_id: groupId });
      expect(error).toBeNull();
      const detail = data as { members: MemberEntry[] };
      expect(
        detail.members.find((m) => m.member_group_id === target.personalGroupId),
      ).toBeUndefined();
      for (const m of detail.members) expect(m.membership_status).toBe('active');
    });

    it("the paused member's own reads: group gone from the list, private detail P0002, permissions empty", async () => {
      const c = await asUser(target);
      const { data: groups, error: gErr } = await c.rpc('get_member_groups');
      expect(gErr).toBeNull();
      const ids = ((groups ?? []) as Array<{ id: string }>).map((g) => g.id);
      expect(ids).not.toContain(groupId);

      const detail = await c.rpc('get_group_detail', { p_group_id: groupId });
      expect(detail.error?.code).toBe('P0002');

      // Tier-1 platform-baseline permissions (FringeIsland Members) are
      // context-free and legitimately survive a group pause — the honest
      // assert is that the GROUP-scoped grant resolves nothing while paused.
      // (In-flight test correction: the original [] expectation missed Tier-1.)
      const { data: perms, error: pErr } = await admin.rpc('get_user_permissions', {
        p_acting_group_id: target.personalGroupId,
        p_context_group_id: groupId,
      });
      expect(pErr).toBeNull();
      expect(perms as string[]).not.toContain('view_member_profiles');
    });

    it('search_invitable_members reflects the paused row (no re-invite path around a pause)', async () => {
      const c = await asUser(steward); // Steward template holds invite_members
      const { data, error } = await c.rpc('search_invitable_members', {
        p_group_id: groupId,
        p_query: 'GDTarget',
      });
      expect(error).toBeNull();
      const hit = (data as Array<{ member_group_id: string; membership_status: string | null }>).find(
        (h) => h.member_group_id === target.personalGroupId,
      );
      expect(hit?.membership_status).toBe('paused');
    });
  });

  // -------------------------------------------------------------------------
  // STORY-4 — remove_member (MEM-5)
  // -------------------------------------------------------------------------
  describe('STORY-4: remove a member, with the cascade', () => {
    let groupId: string;
    let enrolmentId: string;
    beforeAll(async () => {
      groupId = await seedGroup(
        'GD S4 Remove Group',
        [remover, pauser, target, plainMember, leaver],
        [
          { holder: remover, roleName: 'GD Remover', perms: ['remove_members'] },
          { holder: pauser, roleName: 'GD Pauser4', perms: ['pause_members'] },
          { holder: target, roleName: 'GD Probe4', perms: ['view_member_profiles'] },
        ],
      );
      enrolmentId = await seedFreezeProbe(groupId, target);
    });

    it('removes an active member in one composed cascade: freeze + roles + membership + durable row', async () => {
      expect(await roleCount(groupId, target)).toBeGreaterThan(0);

      const c = await asUser(remover);
      const { error } = await c.rpc('remove_member', {
        p_group_id: groupId,
        p_member_group_id: target.personalGroupId,
      });
      expect(error).toBeNull();

      expect(await membershipRow(groupId, target)).toBeNull();
      expect(await roleCount(groupId, target)).toBe(0);
      const { data: enr } = await admin
        .from('journey_enrollments')
        .select('status, progress_data')
        .eq('id', enrolmentId)
        .single();
      expect(enr?.status).toBe('frozen');
      expect((enr?.progress_data as { frozen_reason?: string }).frozen_reason).toBe(
        'removed_from_group',
      );
      expect(await notificationCount(target, groupId, 'member_removed')).toBeGreaterThanOrEqual(1);
    });

    it('removes a paused member (the RLS path never could)', async () => {
      const cp = await asUser(pauser);
      const { error: pErr } = await cp.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: plainMember.personalGroupId,
      });
      expect(pErr).toBeNull();

      const c = await asUser(remover);
      const { error } = await c.rpc('remove_member', {
        p_group_id: groupId,
        p_member_group_id: plainMember.personalGroupId,
      });
      expect(error).toBeNull();
      expect(await membershipRow(groupId, plainMember)).toBeNull();
    });

    it('refuses: self P0001, invited/ghost/non-member P0002, no key 42501', async () => {
      const c = await asUser(remover);
      const self = await c.rpc('remove_member', {
        p_group_id: groupId,
        p_member_group_id: remover.personalGroupId,
      });
      expect(self.error?.code).toBe('P0001');

      // an invited (not yet joined) row is invitation territory — P0002
      const ci = await asUser(steward);
      const { error: invErr } = await ci.rpc('invite_member', {
        p_group_id: groupId,
        p_member_group_id: outsider.personalGroupId,
      });
      expect(invErr).toBeNull();
      const invited = await c.rpc('remove_member', {
        p_group_id: groupId,
        p_member_group_id: outsider.personalGroupId,
      });
      expect(invited.error?.code).toBe('P0002');
      await ci.rpc('cancel_member_invitation', {
        p_group_id: groupId,
        p_member_group_id: outsider.personalGroupId,
      });

      const ghost = await c.rpc('remove_member', {
        p_group_id: groupId,
        p_member_group_id: GHOST,
      });
      expect(ghost.error?.code).toBe('P0002');

      const cl = await asUser(leaver); // active member, no keys
      const noKey = await cl.rpc('remove_member', {
        p_group_id: groupId,
        p_member_group_id: remover.personalGroupId,
      });
      expect(noKey.error?.code).toBe('42501');
    });

    it('last-active-Steward guard: a paused Steward is not cover', async () => {
      // dedicated group: steward + steward2 both Stewards, remover holds the key
      const gid = await seedGroup(
        'GD S4 Steward Cover Group',
        [remover, pauser, steward2],
        [
          { holder: remover, roleName: 'GD RemoverSC', perms: ['remove_members'] },
          { holder: pauser, roleName: 'GD PauserSC', perms: ['pause_members'] },
        ],
      );
      await bindTemplateRole(gid, steward2, 'Steward Role Template');

      // with two active Stewards, pausing one is allowed…
      const cp = await asUser(pauser);
      const { error: pErr } = await cp.rpc('pause_member', {
        p_group_id: gid,
        p_member_group_id: steward2.personalGroupId,
      });
      expect(pErr).toBeNull();

      // …but now the remaining active Steward is protected from removal:
      // the paused Steward's surviving role row does not count as cover.
      const c = await asUser(remover);
      const res = await c.rpc('remove_member', {
        p_group_id: gid,
        p_member_group_id: steward.personalGroupId,
      });
      expect(res.error?.code).toBe('P0001');
      expect((await membershipRow(gid, steward))?.status).toBe('active');
    });
  });

  // -------------------------------------------------------------------------
  // STORY-5 — leave_group, replaced in place (MEM-6)
  // -------------------------------------------------------------------------
  describe('STORY-5: leave a group — the regular exit', () => {
    it('regular leave: freeze + roles + membership in one transaction; Stewards learn', async () => {
      const groupId = await seedGroup(
        'GD S5 Leave Group',
        [leaver, plainMember],
        [{ holder: leaver, roleName: 'GD LeaverProbe', perms: ['view_member_profiles'] }],
      );
      const enrolmentId = await seedFreezeProbe(groupId, leaver);
      const leftBefore = await notificationCount(steward, groupId, 'member_left');

      const c = await asUser(leaver);
      const { data, error } = await c.rpc('leave_group', { p_group_id: groupId });
      expect(error).toBeNull();
      const payload = data as { group_id: string; group_name: string };
      expect(payload.group_id).toBe(groupId);
      expect(typeof payload.group_name).toBe('string');

      expect(await membershipRow(groupId, leaver)).toBeNull();
      expect(await roleCount(groupId, leaver)).toBe(0);
      const { data: enr } = await admin
        .from('journey_enrollments')
        .select('status, progress_data')
        .eq('id', enrolmentId)
        .single();
      expect(enr?.status).toBe('frozen');
      expect((enr?.progress_data as { frozen_reason?: string }).frozen_reason).toBe('left_group');
      expect(await notificationCount(steward, groupId, 'member_left')).toBeGreaterThan(leftBefore);
    });

    it('sole active Steward is refused (MEM-7 arrives with G-E) — nothing mutates', async () => {
      const groupId = await seedGroup('GD S5 Sole Steward Group', [plainMember]);
      const c = await asUser(steward);
      const res = await c.rpc('leave_group', { p_group_id: groupId });
      expect(res.error?.code).toBe('P0001');
      // red note: the LEGACY body executes the DeusEx handover here instead
      expect((await membershipRow(groupId, steward))?.status).toBe('active');
      expect(await roleCount(groupId, steward)).toBeGreaterThan(0);
    });

    it('a paused Steward is not cover for the leaving one', async () => {
      const groupId = await seedGroup(
        'GD S5 Paused Cover Group',
        [pauser, steward2],
        [{ holder: pauser, roleName: 'GD PauserS5', perms: ['pause_members'] }],
      );
      await bindTemplateRole(groupId, steward2, 'Steward Role Template');
      const cp = await asUser(pauser);
      const { error: pErr } = await cp.rpc('pause_member', {
        p_group_id: groupId,
        p_member_group_id: steward2.personalGroupId,
      });
      expect(pErr).toBeNull();

      const c = await asUser(steward);
      const res = await c.rpc('leave_group', { p_group_id: groupId });
      expect(res.error?.code).toBe('P0001');
      expect((await membershipRow(groupId, steward))?.status).toBe('active');
    });

    it('last remaining member is refused (MEM-8 arrives with G-E) — nothing mutates', async () => {
      const groupId = await seedGroup('GD S5 Last Member Group', []);
      const c = await asUser(steward);
      const res = await c.rpc('leave_group', { p_group_id: groupId });
      expect(res.error?.code).toBe('P0001');
      // red note: the LEGACY body executes closure here instead
      const { data: g } = await admin.from('groups').select('status').eq('id', groupId).single();
      expect(g?.status).toBe('active');
      expect((await membershipRow(groupId, steward))?.status).toBe('active');
    });

    it('no-leak refusals: non-member P0002, ghost P0002, non-engagement P0002; Mist 42501; suspended 42501', async () => {
      const groupId = await seedGroup('GD S5 NoLeak Group', [suspendedHolder]);

      const co = await asUser(outsider);
      const nonMember = await co.rpc('leave_group', { p_group_id: groupId });
      expect(nonMember.error?.code).toBe('P0002'); // legacy: P0001 free-text — red-first

      const ghost = await co.rpc('leave_group', { p_group_id: GHOST });
      expect(ghost.error?.code).toBe('P0002');

      // own personal group: invisible under member-or-public — P0002, not enumerable
      const ownPersonal = await co.rpc('leave_group', { p_group_id: outsider.personalGroupId });
      expect(ownPersonal.error?.code).toBe('P0002');

      const cm = await asMist();
      const mist = await cm.rpc('leave_group', { p_group_id: groupId });
      expect(mist.error?.code).toBe('42501');
      await cm.auth.signOut();

      const cs = await asUser(suspendedHolder);
      const susp = await cs.rpc('leave_group', { p_group_id: groupId });
      expect(susp.error?.code).toBe('42501');
    });
  });

  // -------------------------------------------------------------------------
  // STORY-6 — no path around the contracts (ADR-U038)
  // -------------------------------------------------------------------------
  describe('STORY-6: adversarial direct paths', () => {
    let groupId: string;
    beforeAll(async () => {
      groupId = await seedGroup(
        'GD S6 Direct Group',
        [remover, target, plainMember],
        [{ holder: remover, roleName: 'GD RemoverS6', perms: ['remove_members'] }],
      );
    });

    it('direct self-DELETE of an active membership is refused (the pre-drop bypass closes)', async () => {
      const c = await asUser(target);
      const { error } = await c
        .from('group_memberships')
        .delete()
        .eq('group_id', groupId)
        .eq('member_group_id', target.personalGroupId);
      expect(error).toBeNull(); // RLS refusal = 0 rows, not an error
      expect((await membershipRow(groupId, target))?.status).toBe('active');
    });

    it("direct DELETE of another's membership by a remove_members holder is refused", async () => {
      const c = await asUser(remover);
      const { error } = await c
        .from('group_memberships')
        .delete()
        .eq('group_id', groupId)
        .eq('member_group_id', plainMember.personalGroupId);
      expect(error).toBeNull();
      expect((await membershipRow(groupId, plainMember))?.status).toBe('active');
    });

    it('no client-role UPDATE path to paused exists (self or holder)', async () => {
      for (const u of [target, remover]) {
        const c = await asUser(u);
        const { error } = await c
          .from('group_memberships')
          .update({ status: 'paused' })
          .eq('group_id', groupId)
          .eq('member_group_id', target.personalGroupId);
        expect(error).toBeNull();
        expect((await membershipRow(groupId, target))?.status).toBe('active');
      }
    });

    it('PC012 decline still works after the drop (SECURITY DEFINER, policy-independent)', async () => {
      const ci = await asUser(steward);
      const { error: invErr } = await ci.rpc('invite_member', {
        p_group_id: groupId,
        p_member_group_id: outsider.personalGroupId,
      });
      expect(invErr).toBeNull();
      const co = await asUser(outsider);
      const { error: decErr } = await co.rpc('decline_group_invitation', {
        p_group_id: groupId,
      });
      expect(decErr).toBeNull();
      expect(await membershipRow(groupId, outsider)).toBeNull();
    });

    it('the admin policies stay intact (A-ADM inherits): a platform admin can direct-DELETE', async () => {
      // seed a disposable member, promote outsider to platform admin, and
      // exercise memberships_delete_admin through their authenticated client
      const disposable = await createTestUser({ displayName: 'GDDisposable' });
      createdUserIds.push(disposable.user.id);
      await admin.from('group_memberships').insert({
        group_id: groupId,
        member_group_id: disposable.personalGroupId,
        status: 'active',
        added_by_group_id: steward.personalGroupId,
      });
      await makePlatformAdmin(outsider.personalGroupId);
      try {
        const c = await asUser(outsider);
        const { error } = await c
          .from('group_memberships')
          .delete()
          .eq('group_id', groupId)
          .eq('member_group_id', disposable.personalGroupId);
        expect(error).toBeNull();
        expect(await membershipRow(groupId, disposable)).toBeNull();
      } finally {
        await demotePlatformAdmin(outsider.personalGroupId);
      }
    });
  });
});
