/**
 * Integration Tests: Pending Email Invitations for Non-Users
 *
 * Tests: B-INV-001: Pending Email Invitations
 *
 * Verifies that Stewards can create pending invitations for non-users,
 * RLS blocks unauthorized access, and the handle_new_user() trigger
 * auto-claims pending invitations on signup.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createTestClient,
  cleanupTestUser,
  cleanupTestGroup,
  createAdminClient,
  signInWithRetry,
  generateTestEmail,
} from '@/tests/helpers/supabase';

describe('B-INV-001: Pending Email Invitations', () => {
  let steward: any;
  let regularMember: any;
  let testGroup: any;
  let stewardRole: any;
  let memberRole: any;
  const admin = createAdminClient();

  beforeAll(async () => {
    // Create test users
    steward = await createTestUser({ displayName: 'Test Steward' });
    regularMember = await createTestUser({ displayName: 'Regular Member' });

    // Create group
    const { data: group, error: gErr } = await admin
      .from('groups')
      .insert({
        name: 'Test Group - Pending Invitations',
        description: 'Testing pending email invitations',
        is_public: false,
        created_by_group_id: steward.personalGroupId,
      })
      .select()
      .single();

    expect(gErr).toBeNull();
    testGroup = group;

    // Add steward as active member
    const { error: smErr } = await admin.from('group_memberships').insert({
      group_id: testGroup.id,
      member_group_id: steward.personalGroupId,
      added_by_group_id: steward.personalGroupId,
      status: 'active',
    });
    expect(smErr).toBeNull();

    // Create Steward role and assign
    const { data: sRole, error: srErr } = await admin
      .from('group_roles')
      .insert({ group_id: testGroup.id, name: 'Steward' })
      .select()
      .single();
    expect(srErr).toBeNull();
    stewardRole = sRole;

    const { error: assignErr } = await admin.from('user_group_roles').insert({
      member_group_id: steward.personalGroupId,
      group_id: testGroup.id,
      group_role_id: stewardRole.id,
      assigned_by_group_id: steward.personalGroupId,
    });
    expect(assignErr).toBeNull();

    // Create Member role and assign to regularMember
    const { data: mRole, error: mrErr } = await admin
      .from('group_roles')
      .insert({ group_id: testGroup.id, name: 'Member' })
      .select()
      .single();
    expect(mrErr).toBeNull();
    memberRole = mRole;

    // Add regular member as active member
    const { error: mmErr } = await admin.from('group_memberships').insert({
      group_id: testGroup.id,
      member_group_id: regularMember.personalGroupId,
      added_by_group_id: steward.personalGroupId,
      status: 'active',
    });
    expect(mmErr).toBeNull();

    const { error: mrAssignErr } = await admin.from('user_group_roles').insert({
      member_group_id: regularMember.personalGroupId,
      group_id: testGroup.id,
      group_role_id: memberRole.id,
      assigned_by_group_id: steward.personalGroupId,
    });
    expect(mrAssignErr).toBeNull();

    // Grant invite_members permission to Steward role
    // First, find the invite_members permission ID
    const { data: perm } = await admin
      .from('permissions')
      .select('id')
      .eq('name', 'invite_members')
      .single();

    if (perm) {
      await admin.from('group_role_permissions').insert({
        group_role_id: stewardRole.id,
        permission_id: perm.id,
        granted: true,
      });
    }
  });

  afterAll(async () => {
    if (testGroup) {
      // Clean up pending invitations
      await admin
        .from('pending_email_invitations')
        .delete()
        .eq('group_id', testGroup.id);
      // Clean up roles
      await admin.from('user_group_roles').delete().eq('group_id', testGroup.id);
      await cleanupTestGroup(testGroup.id);
    }
    if (regularMember) await cleanupTestUser(regularMember.user.id);
    if (steward) await cleanupTestUser(steward.user.id);
  });

  // --- Storage Tests ---

  it('should allow Steward to create a pending invitation for a non-existent email', async () => {
    const nonExistentEmail = generateTestEmail();

    const supabase = createTestClient();
    await signInWithRetry(supabase, steward.email, steward.password);

    const { data, error } = await supabase
      .from('pending_email_invitations')
      .insert({
        group_id: testGroup.id,
        invited_email: nonExistentEmail,
        invited_by_group_id: steward.personalGroupId,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.status).toBe('pending');
    expect(data!.invited_email).toBe(nonExistentEmail);
    expect(data!.token).toBeTruthy(); // UUID token generated
    expect(data!.expires_at).toBeTruthy(); // 30-day expiration set

    // Clean up
    await admin.from('pending_email_invitations').delete().eq('id', data!.id);
    await supabase.auth.signOut();
  });

  it('should block duplicate pending invitations (same group + same email)', async () => {
    const duplicateEmail = generateTestEmail();

    // Create first invitation via admin
    const { data: first } = await admin
      .from('pending_email_invitations')
      .insert({
        group_id: testGroup.id,
        invited_email: duplicateEmail,
        invited_by_group_id: steward.personalGroupId,
      })
      .select()
      .single();

    // Try to create duplicate as Steward
    const supabase = createTestClient();
    await signInWithRetry(supabase, steward.email, steward.password);

    const { data, error } = await supabase
      .from('pending_email_invitations')
      .insert({
        group_id: testGroup.id,
        invited_email: duplicateEmail,
        invited_by_group_id: steward.personalGroupId,
      })
      .select()
      .single();

    expect(error).not.toBeNull(); // UNIQUE constraint violation
    expect(data).toBeNull();

    // Clean up
    if (first) await admin.from('pending_email_invitations').delete().eq('id', first.id);
    await supabase.auth.signOut();
  });

  it('should generate a token UUID and set 30-day expiration', async () => {
    const testEmail = generateTestEmail();

    const { data } = await admin
      .from('pending_email_invitations')
      .insert({
        group_id: testGroup.id,
        invited_email: testEmail,
        invited_by_group_id: steward.personalGroupId,
      })
      .select()
      .single();

    expect(data).not.toBeNull();
    expect(data!.token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    ); // UUID format

    // Check expiration is roughly 30 days from now
    const expiresAt = new Date(data!.expires_at).getTime();
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(expiresAt - now).toBeGreaterThan(thirtyDaysMs - 60000); // within 1 minute
    expect(expiresAt - now).toBeLessThan(thirtyDaysMs + 60000);

    // Clean up
    await admin.from('pending_email_invitations').delete().eq('id', data!.id);
  });

  // --- RLS Tests ---

  it('should block regular members (without invite_members) from creating pending invitations', async () => {
    const testEmail = generateTestEmail();

    const supabase = createTestClient();
    await signInWithRetry(supabase, regularMember.email, regularMember.password);

    const { data, error } = await supabase
      .from('pending_email_invitations')
      .insert({
        group_id: testGroup.id,
        invited_email: testEmail,
        invited_by_group_id: regularMember.personalGroupId,
      })
      .select()
      .single();

    // Should be blocked by RLS — no invite_members permission
    expect(error).not.toBeNull();
    expect(data).toBeNull();

    await supabase.auth.signOut();
  });

  it('should allow Steward to view pending invitations for their group', async () => {
    const testEmail = generateTestEmail();

    // Create via admin
    const { data: created } = await admin
      .from('pending_email_invitations')
      .insert({
        group_id: testGroup.id,
        invited_email: testEmail,
        invited_by_group_id: steward.personalGroupId,
      })
      .select()
      .single();

    // Query as Steward
    const supabase = createTestClient();
    await signInWithRetry(supabase, steward.email, steward.password);

    const { data, error } = await supabase
      .from('pending_email_invitations')
      .select('*')
      .eq('group_id', testGroup.id);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    expect(data!.some((r: any) => r.invited_email === testEmail)).toBe(true);

    // Clean up
    if (created) await admin.from('pending_email_invitations').delete().eq('id', created.id);
    await supabase.auth.signOut();
  });

  it('should allow Steward to cancel (DELETE) a pending invitation', async () => {
    const testEmail = generateTestEmail();

    // Create via admin
    const { data: created } = await admin
      .from('pending_email_invitations')
      .insert({
        group_id: testGroup.id,
        invited_email: testEmail,
        invited_by_group_id: steward.personalGroupId,
      })
      .select()
      .single();

    // Delete as Steward
    const supabase = createTestClient();
    await signInWithRetry(supabase, steward.email, steward.password);

    const { error } = await supabase
      .from('pending_email_invitations')
      .delete()
      .eq('id', created!.id);

    expect(error).toBeNull();

    // Verify gone
    const { data: remaining } = await admin
      .from('pending_email_invitations')
      .select('id')
      .eq('id', created!.id);

    expect(remaining).toHaveLength(0);

    await supabase.auth.signOut();
  });

  // --- Trigger: Auto-Claim on Signup ---

  it('should auto-claim pending invitation when new user signs up with matching email', async () => {
    const futureUserEmail = generateTestEmail();

    // Create pending invitation for this email
    const { data: pending } = await admin
      .from('pending_email_invitations')
      .insert({
        group_id: testGroup.id,
        invited_email: futureUserEmail,
        invited_by_group_id: steward.personalGroupId,
      })
      .select()
      .single();

    expect(pending).not.toBeNull();

    // Now create a user with that email (triggers handle_new_user)
    const newUser = await createTestUser({
      email: futureUserEmail,
      displayName: 'Future User',
    });

    try {
      // Check: pending invitation should be claimed
      const { data: claimedInvitation } = await admin
        .from('pending_email_invitations')
        .select('*')
        .eq('id', pending!.id)
        .single();

      expect(claimedInvitation).not.toBeNull();
      expect(claimedInvitation!.status).toBe('claimed');
      expect(claimedInvitation!.claimed_at).not.toBeNull();

      // Check: group_memberships row should exist with status='invited'
      const { data: membership } = await admin
        .from('group_memberships')
        .select('*')
        .eq('group_id', testGroup.id)
        .eq('member_group_id', newUser.personalGroupId)
        .single();

      expect(membership).not.toBeNull();
      expect(membership!.status).toBe('invited');
    } finally {
      // Clean up
      await admin.from('group_memberships').delete().eq('group_id', testGroup.id).eq('member_group_id', newUser.personalGroupId);
      await admin.from('pending_email_invitations').delete().eq('id', pending!.id);
      await cleanupTestUser(newUser.user.id);
    }
  });

  it('should claim multiple pending invitations from different groups on signup', async () => {
    const futureUserEmail = generateTestEmail();

    // Create second group
    const { data: group2 } = await admin
      .from('groups')
      .insert({
        name: 'Second Group - Multi Claim',
        is_public: false,
        created_by_group_id: steward.personalGroupId,
      })
      .select()
      .single();

    // Create pending invitations in both groups
    const { data: pending1 } = await admin
      .from('pending_email_invitations')
      .insert({
        group_id: testGroup.id,
        invited_email: futureUserEmail,
        invited_by_group_id: steward.personalGroupId,
      })
      .select()
      .single();

    const { data: pending2 } = await admin
      .from('pending_email_invitations')
      .insert({
        group_id: group2!.id,
        invited_email: futureUserEmail,
        invited_by_group_id: steward.personalGroupId,
      })
      .select()
      .single();

    // Sign up
    const newUser = await createTestUser({
      email: futureUserEmail,
      displayName: 'Multi Claim User',
    });

    try {
      // Both should be claimed
      const { data: claimed1 } = await admin
        .from('pending_email_invitations')
        .select('status')
        .eq('id', pending1!.id)
        .single();
      expect(claimed1!.status).toBe('claimed');

      const { data: claimed2 } = await admin
        .from('pending_email_invitations')
        .select('status')
        .eq('id', pending2!.id)
        .single();
      expect(claimed2!.status).toBe('claimed');

      // Both memberships should exist
      const { data: memberships } = await admin
        .from('group_memberships')
        .select('group_id, status')
        .eq('member_group_id', newUser.personalGroupId)
        .in('group_id', [testGroup.id, group2!.id]);

      expect(memberships).not.toBeNull();
      expect(memberships!.length).toBe(2);
      expect(memberships!.every((m: any) => m.status === 'invited')).toBe(true);
    } finally {
      await admin.from('group_memberships').delete().eq('member_group_id', newUser.personalGroupId);
      await admin.from('pending_email_invitations').delete().eq('id', pending1!.id);
      await admin.from('pending_email_invitations').delete().eq('id', pending2!.id);
      await cleanupTestUser(newUser.user.id);
      await cleanupTestGroup(group2!.id);
    }
  });

  it('should NOT claim expired pending invitations on signup', async () => {
    const futureUserEmail = generateTestEmail();

    // Create expired invitation (set expires_at in the past)
    const { data: expired } = await admin
      .from('pending_email_invitations')
      .insert({
        group_id: testGroup.id,
        invited_email: futureUserEmail,
        invited_by_group_id: steward.personalGroupId,
        expires_at: new Date(Date.now() - 1000).toISOString(), // expired 1 second ago
      })
      .select()
      .single();

    expect(expired).not.toBeNull();

    // Sign up
    const newUser = await createTestUser({
      email: futureUserEmail,
      displayName: 'Expired Invite User',
    });

    try {
      // Pending invitation should NOT be claimed
      const { data: stillPending } = await admin
        .from('pending_email_invitations')
        .select('status')
        .eq('id', expired!.id)
        .single();
      expect(stillPending!.status).toBe('pending');

      // No membership should exist
      const { data: memberships } = await admin
        .from('group_memberships')
        .select('id')
        .eq('group_id', testGroup.id)
        .eq('member_group_id', newUser.personalGroupId);

      expect(memberships).toHaveLength(0);
    } finally {
      await admin.from('pending_email_invitations').delete().eq('id', expired!.id);
      await cleanupTestUser(newUser.user.id);
    }
  });

  it('should handle case-insensitive email matching on signup', async () => {
    // Create invitation with lowercase email
    const baseEmail = generateTestEmail();
    const lowercaseEmail = baseEmail.toLowerCase();

    const { data: pending } = await admin
      .from('pending_email_invitations')
      .insert({
        group_id: testGroup.id,
        invited_email: lowercaseEmail,
        invited_by_group_id: steward.personalGroupId,
      })
      .select()
      .single();

    expect(pending).not.toBeNull();

    // Sign up with same email (Supabase normalizes to lowercase anyway)
    const newUser = await createTestUser({
      email: lowercaseEmail,
      displayName: 'Case Test User',
    });

    try {
      const { data: claimedInvitation } = await admin
        .from('pending_email_invitations')
        .select('status')
        .eq('id', pending!.id)
        .single();

      expect(claimedInvitation!.status).toBe('claimed');
    } finally {
      await admin.from('group_memberships').delete().eq('group_id', testGroup.id).eq('member_group_id', newUser.personalGroupId);
      await admin.from('pending_email_invitations').delete().eq('id', pending!.id);
      await cleanupTestUser(newUser.user.id);
    }
  });
});
