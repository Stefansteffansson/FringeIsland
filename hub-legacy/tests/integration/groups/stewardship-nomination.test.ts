/**
 * Integration Tests: B-GRP-011 — Stewardship Nomination (Track 1)
 *
 * Sprint 3: Smart Notifications + Stewardship Nomination
 *
 * Tests the Track 1 stewardship nomination flow:
 * - Sole Steward nominates successors via nominate_steward RPC
 * - First nominee receives stewardship_nomination smart notification
 * - Nominee accepts → gets Steward role, original Steward exits via leave_group
 * - Nominee declines → next nominee notified
 * - All nominees decline → DeusEx fallback (L2 flow)
 * - Validation: only sole Steward, valid nominees, no duplicate nominations
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  cleanupTestGroup,
  createAdminClient,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-GRP-011: Stewardship Nomination (Track 1)', () => {
  let steward: any;
  let nominee1: any;
  let nominee2: any;
  let regularMember: any;

  let deusexGroupId: string;

  const admin = createAdminClient();
  const createdGroupIds: string[] = [];

  /**
   * Helper: Create an engagement group with a Steward and members
   */
  async function createEngagementGroup(
    name: string,
    stewardPersonalGroupId: string,
  ) {
    const { data: group } = await admin
      .from('groups')
      .insert({
        name,
        description: `Test group: ${name}`,
        group_type: 'engagement',
        is_public: false,
        created_by_group_id: stewardPersonalGroupId,
      })
      .select()
      .single();

    createdGroupIds.push(group!.id);

    // Add membership
    await admin.from('group_memberships').insert({
      group_id: group!.id,
      member_group_id: stewardPersonalGroupId,
      added_by_group_id: stewardPersonalGroupId,
      status: 'active',
    });

    // Create Steward role
    const { data: stewardRole } = await admin
      .from('group_roles')
      .insert({ group_id: group!.id, name: 'Steward' })
      .select()
      .single();

    // Create Member role
    const { data: memberRole } = await admin
      .from('group_roles')
      .insert({ group_id: group!.id, name: 'Member' })
      .select()
      .single();

    // Assign Steward role
    await admin.from('user_group_roles').insert({
      member_group_id: stewardPersonalGroupId,
      group_id: group!.id,
      group_role_id: stewardRole!.id,
      assigned_by_group_id: stewardPersonalGroupId,
    });

    return {
      group: group!,
      stewardRole: stewardRole!,
      memberRole: memberRole!,
    };
  }

  /**
   * Helper: Add a member to a group with Member role
   */
  async function addMember(
    groupId: string,
    memberPersonalGroupId: string,
    memberRoleId: string,
    addedByGroupId: string,
  ) {
    await admin.from('group_memberships').insert({
      group_id: groupId,
      member_group_id: memberPersonalGroupId,
      added_by_group_id: addedByGroupId,
      status: 'active',
    });

    await admin.from('user_group_roles').insert({
      member_group_id: memberPersonalGroupId,
      group_id: groupId,
      group_role_id: memberRoleId,
      assigned_by_group_id: addedByGroupId,
    });
  }

  beforeAll(async () => {
    steward = await createTestUser({ displayName: 'Nomination Steward' });
    nominee1 = await createTestUser({ displayName: 'Nominee 1' });
    nominee2 = await createTestUser({ displayName: 'Nominee 2' });
    regularMember = await createTestUser({ displayName: 'Regular Member' });

    // Look up DeusEx group
    const { data: deusex } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'DeusEx')
      .eq('group_type', 'system')
      .single();

    deusexGroupId = deusex!.id;
  });

  afterAll(async () => {
    // Clean up notifications for all test users
    for (const user of [steward, nominee1, nominee2, regularMember]) {
      if (user) {
        await admin.from('notifications').delete().eq('recipient_group_id', user.personalGroupId);
      }
    }

    // Clean up groups (reverse order)
    for (const gid of [...createdGroupIds].reverse()) {
      await admin.from('user_group_roles').delete().eq('group_id', gid);
      await admin.from('group_memberships').delete().eq('group_id', gid);
      await admin.from('group_roles').delete().eq('group_id', gid);
      await admin.from('groups').delete().eq('id', gid);
    }

    if (steward) await cleanupTestUser(steward.user.id);
    if (nominee1) await cleanupTestUser(nominee1.user.id);
    if (nominee2) await cleanupTestUser(nominee2.user.id);
    if (regularMember) await cleanupTestUser(regularMember.user.id);
  });

  // ============================================================
  // nominate_steward RPC — validation
  // ============================================================

  it('sole Steward can call nominate_steward with valid nominees', async () => {
    const { group, memberRole } = await createEngagementGroup(
      'Nomination Valid Test',
      steward.personalGroupId,
    );
    await addMember(group.id, nominee1.personalGroupId, memberRole.id, steward.personalGroupId);
    await addMember(group.id, nominee2.personalGroupId, memberRole.id, steward.personalGroupId);

    const supabase = createTestClient();
    await signInWithRetry(supabase, steward.email, steward.password);

    try {
      const { data, error } = await supabase.rpc('nominate_steward', {
        p_group_id: group.id,
        p_nominee_ids: [nominee1.personalGroupId, nominee2.personalGroupId],
      });

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data.success).toBe(true);
    } finally {
      await supabase.auth.signOut();
    }

    // Verify first nominee received a stewardship_nomination notification
    const { data: notifs } = await admin
      .from('notifications')
      .select('*')
      .eq('recipient_group_id', nominee1.personalGroupId)
      .eq('type', 'stewardship_nomination');

    expect(notifs).not.toBeNull();
    expect(notifs!.length).toBeGreaterThanOrEqual(1);
    expect(notifs![0].action_type).toBe('accept_decline');
    expect(notifs![0].expires_at).not.toBeNull();

    // Second nominee should NOT have a notification yet
    const { data: notifs2 } = await admin
      .from('notifications')
      .select('*')
      .eq('recipient_group_id', nominee2.personalGroupId)
      .eq('type', 'stewardship_nomination');

    expect(notifs2).toHaveLength(0);

    // Cleanup notifications
    await admin.from('notifications').delete().eq('group_id', group.id);
  });

  it('rejects nomination from non-Steward', async () => {
    const { group, memberRole } = await createEngagementGroup(
      'Nomination Non-Steward Test',
      steward.personalGroupId,
    );
    await addMember(group.id, regularMember.personalGroupId, memberRole.id, steward.personalGroupId);
    await addMember(group.id, nominee1.personalGroupId, memberRole.id, steward.personalGroupId);

    // regularMember (not a Steward) tries to nominate
    const supabase = createTestClient();
    await signInWithRetry(supabase, regularMember.email, regularMember.password);

    try {
      const { data, error } = await supabase.rpc('nominate_steward', {
        p_group_id: group.id,
        p_nominee_ids: [nominee1.personalGroupId],
      });

      expect(error).not.toBeNull();
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('rejects nomination of non-member', async () => {
    const { group } = await createEngagementGroup(
      'Nomination Non-Member Test',
      steward.personalGroupId,
    );

    // nominee1 is NOT a member of this group
    const supabase = createTestClient();
    await signInWithRetry(supabase, steward.email, steward.password);

    try {
      const { data, error } = await supabase.rpc('nominate_steward', {
        p_group_id: group.id,
        p_nominee_ids: [nominee1.personalGroupId],
      });

      expect(error).not.toBeNull();
    } finally {
      await supabase.auth.signOut();
    }
  });

  it('rejects self-nomination', async () => {
    const { group, memberRole } = await createEngagementGroup(
      'Self-Nomination Test',
      steward.personalGroupId,
    );
    await addMember(group.id, nominee1.personalGroupId, memberRole.id, steward.personalGroupId);

    const supabase = createTestClient();
    await signInWithRetry(supabase, steward.email, steward.password);

    try {
      const { data, error } = await supabase.rpc('nominate_steward', {
        p_group_id: group.id,
        p_nominee_ids: [steward.personalGroupId], // Self-nomination
      });

      expect(error).not.toBeNull();
    } finally {
      await supabase.auth.signOut();
    }
  });

  // ============================================================
  // Nominee accepts → Steward transition + leave
  // ============================================================

  it('nominee accepts nomination → gets Steward role, original Steward leaves', async () => {
    const { group, memberRole, stewardRole } = await createEngagementGroup(
      'Accept Nomination Test',
      steward.personalGroupId,
    );
    await addMember(group.id, nominee1.personalGroupId, memberRole.id, steward.personalGroupId);
    await addMember(group.id, nominee2.personalGroupId, memberRole.id, steward.personalGroupId);

    // Steward initiates nomination
    const stewardClient = createTestClient();
    await signInWithRetry(stewardClient, steward.email, steward.password);

    const { error: nomError } = await stewardClient.rpc('nominate_steward', {
      p_group_id: group.id,
      p_nominee_ids: [nominee1.personalGroupId, nominee2.personalGroupId],
    });
    expect(nomError).toBeNull();
    await stewardClient.auth.signOut();

    // Find the nomination notification for nominee1
    const { data: notifs } = await admin
      .from('notifications')
      .select('*')
      .eq('recipient_group_id', nominee1.personalGroupId)
      .eq('type', 'stewardship_nomination')
      .is('action_taken', null);

    expect(notifs).not.toBeNull();
    expect(notifs!.length).toBe(1);
    const nominationNotif = notifs![0];

    // Nominee1 accepts
    const nominee1Client = createTestClient();
    await signInWithRetry(nominee1Client, nominee1.email, nominee1.password);

    const { data: actionResult, error: actionError } = await nominee1Client.rpc('handle_notification_action', {
      p_notification_id: nominationNotif.id,
      p_action: 'accepted',
    });
    expect(actionError).toBeNull();
    expect(actionResult.success).toBe(true);
    await nominee1Client.auth.signOut();

    // Verify: nominee1 now has Steward role
    const { data: nominee1Roles } = await admin
      .from('user_group_roles')
      .select('group_roles(name)')
      .eq('member_group_id', nominee1.personalGroupId)
      .eq('group_id', group.id);

    const roleNames = (nominee1Roles || []).map((r: any) => r.group_roles?.name);
    expect(roleNames).toContain('Steward');

    // Verify: original Steward is no longer a member
    const { data: stewardMembership } = await admin
      .from('group_memberships')
      .select('id')
      .eq('group_id', group.id)
      .eq('member_group_id', steward.personalGroupId)
      .maybeSingle();

    expect(stewardMembership).toBeNull();

    // Cleanup
    await admin.from('notifications').delete().eq('group_id', group.id);
  });

  // ============================================================
  // Nominee declines → next nominee notified
  // ============================================================

  it('nominee declines → next nominee receives nomination', async () => {
    const { group, memberRole } = await createEngagementGroup(
      'Decline Nomination Test',
      steward.personalGroupId,
    );
    await addMember(group.id, nominee1.personalGroupId, memberRole.id, steward.personalGroupId);
    await addMember(group.id, nominee2.personalGroupId, memberRole.id, steward.personalGroupId);

    // Steward initiates nomination
    const stewardClient = createTestClient();
    await signInWithRetry(stewardClient, steward.email, steward.password);
    const { error: nomError } = await stewardClient.rpc('nominate_steward', {
      p_group_id: group.id,
      p_nominee_ids: [nominee1.personalGroupId, nominee2.personalGroupId],
    });
    expect(nomError).toBeNull();
    await stewardClient.auth.signOut();

    // Nominee1 declines
    const { data: notifs } = await admin
      .from('notifications')
      .select('*')
      .eq('recipient_group_id', nominee1.personalGroupId)
      .eq('type', 'stewardship_nomination')
      .is('action_taken', null);

    expect(notifs!.length).toBe(1);

    const nominee1Client = createTestClient();
    await signInWithRetry(nominee1Client, nominee1.email, nominee1.password);
    const { error: declineError } = await nominee1Client.rpc('handle_notification_action', {
      p_notification_id: notifs![0].id,
      p_action: 'declined',
    });
    expect(declineError).toBeNull();
    await nominee1Client.auth.signOut();

    // Verify: nominee2 now has a stewardship_nomination notification
    const { data: nominee2Notifs } = await admin
      .from('notifications')
      .select('*')
      .eq('recipient_group_id', nominee2.personalGroupId)
      .eq('type', 'stewardship_nomination')
      .is('action_taken', null);

    expect(nominee2Notifs).not.toBeNull();
    expect(nominee2Notifs!.length).toBe(1);
    expect(nominee2Notifs![0].action_type).toBe('accept_decline');

    // Cleanup
    await admin.from('notifications').delete().eq('group_id', group.id);
  });

  // ============================================================
  // All nominees decline → DeusEx fallback
  // ============================================================

  it('all nominees decline → DeusEx fallback (L2 flow)', async () => {
    const { group, memberRole } = await createEngagementGroup(
      'All Decline Fallback Test',
      steward.personalGroupId,
    );
    await addMember(group.id, nominee1.personalGroupId, memberRole.id, steward.personalGroupId);

    // Steward nominates only nominee1
    const stewardClient = createTestClient();
    await signInWithRetry(stewardClient, steward.email, steward.password);
    const { error: nomError } = await stewardClient.rpc('nominate_steward', {
      p_group_id: group.id,
      p_nominee_ids: [nominee1.personalGroupId],
    });
    expect(nomError).toBeNull();
    await stewardClient.auth.signOut();

    // Nominee1 declines
    const { data: notifs } = await admin
      .from('notifications')
      .select('*')
      .eq('recipient_group_id', nominee1.personalGroupId)
      .eq('type', 'stewardship_nomination')
      .is('action_taken', null);

    const nominee1Client = createTestClient();
    await signInWithRetry(nominee1Client, nominee1.email, nominee1.password);
    const { error: declineError } = await nominee1Client.rpc('handle_notification_action', {
      p_notification_id: notifs![0].id,
      p_action: 'declined',
    });
    expect(declineError).toBeNull();
    await nominee1Client.auth.signOut();

    // Verify: DeusEx is now a member with Steward role (L2 fallback)
    const { data: deusexMembership } = await admin
      .from('group_memberships')
      .select('id')
      .eq('group_id', group.id)
      .eq('member_group_id', deusexGroupId)
      .eq('status', 'active')
      .maybeSingle();

    expect(deusexMembership).not.toBeNull();

    // Verify: original Steward has left (membership deleted)
    const { data: stewardMembership } = await admin
      .from('group_memberships')
      .select('id')
      .eq('group_id', group.id)
      .eq('member_group_id', steward.personalGroupId)
      .maybeSingle();

    expect(stewardMembership).toBeNull();

    // Cleanup
    await admin.from('notifications').delete().eq('group_id', group.id);
    // Also clean DeusEx membership from this group
    await admin.from('user_group_roles').delete().eq('group_id', group.id).eq('member_group_id', deusexGroupId);
    await admin.from('group_memberships').delete().eq('group_id', group.id).eq('member_group_id', deusexGroupId);
  });

  // ============================================================
  // Duplicate nomination prevention
  // ============================================================

  it('rejects duplicate nomination while one is in progress', async () => {
    const { group, memberRole } = await createEngagementGroup(
      'Duplicate Nomination Test',
      steward.personalGroupId,
    );
    await addMember(group.id, nominee1.personalGroupId, memberRole.id, steward.personalGroupId);
    await addMember(group.id, nominee2.personalGroupId, memberRole.id, steward.personalGroupId);

    const stewardClient = createTestClient();
    await signInWithRetry(stewardClient, steward.email, steward.password);

    // First nomination — should succeed
    const { error: firstError } = await stewardClient.rpc('nominate_steward', {
      p_group_id: group.id,
      p_nominee_ids: [nominee1.personalGroupId],
    });
    expect(firstError).toBeNull();

    // Second nomination — should fail (one already in progress)
    const { error: secondError } = await stewardClient.rpc('nominate_steward', {
      p_group_id: group.id,
      p_nominee_ids: [nominee2.personalGroupId],
    });
    expect(secondError).not.toBeNull();

    await stewardClient.auth.signOut();

    // Cleanup
    await admin.from('notifications').delete().eq('group_id', group.id);
  });
});
