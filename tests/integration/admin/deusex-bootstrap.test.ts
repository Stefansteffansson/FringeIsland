/**
 * Integration Tests: Deusex Bootstrap
 *
 * Covers:
 * - B-ADMIN-006: Deusex Bootstrap
 *
 * Tests that `deusex@fringeisland.com` has been bootstrapped as an
 * active Deusex member with the correct role and permissions.
 *
 * NOTE: deusex@fringeisland.com is treated as a persistent system fixture.
 * If the user does not exist, this test creates them and bootstraps the
 * DeusEx membership + role. The auth user and DeusEx memberships are NOT
 * cleaned up in afterAll because the prevent_last_deusex_* triggers block
 * deletion when there is only one member. Only the temporary engagement
 * group used for permission context checks is cleaned up.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  cleanupTestGroup,
} from '@/tests/helpers/supabase';

describe('B-ADMIN-006: Deusex Bootstrap', () => {
  const admin = createAdminClient();

  let deusexGroupId: string;
  let deusexUserProfileId: string; // public.users.id
  let deusexPersonalGroupId: string; // deusex user's personal group (their identity)
  let testGroup: any;
  let tempUser: any;

  beforeAll(async () => {
    // --- Step 1: Look up the DeusEx system group ---
    const { data: deusexGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'DeusEx')
      .eq('group_type', 'system')
      .single();

    if (!deusexGroup) throw new Error('DeusEx system group not found — has the migration run?');
    deusexGroupId = deusexGroup.id;

    // --- Step 2: Look up or create deusex@fringeisland.com ---
    const { data: existingUser } = await admin
      .from('users')
      .select('id, email, personal_group_id')
      .eq('email', 'deusex@fringeisland.com')
      .maybeSingle();

    if (existingUser && existingUser.personal_group_id) {
      // User already exists — use them as-is
      deusexUserProfileId = existingUser.id;
      deusexPersonalGroupId = existingUser.personal_group_id;
    } else {
      // Create the deusex user fresh
      const deusexUser = await createTestUser({
        email: 'deusex@fringeisland.com',
        displayName: 'DeusEx Admin',
      });
      deusexUserProfileId = deusexUser.profile.id;
      deusexPersonalGroupId = deusexUser.personalGroupId;

      // --- Step 3: Add deusex user to the DeusEx system group as active member ---
      const { error: membershipErr } = await admin
        .from('group_memberships')
        .insert({
          group_id: deusexGroupId,
          member_group_id: deusexPersonalGroupId,
          added_by_group_id: deusexPersonalGroupId,
          status: 'active',
        });
      if (membershipErr) {
        throw new Error(`Failed to add deusex to DeusEx group: ${membershipErr.message}`);
      }

      // --- Step 4: Look up the DeusEx role and assign it ---
      const { data: deusexRole } = await admin
        .from('group_roles')
        .select('id')
        .eq('group_id', deusexGroupId)
        .eq('name', 'DeusEx')
        .single();

      if (!deusexRole) throw new Error('DeusEx role not found in DeusEx group');

      const { error: roleErr } = await admin
        .from('user_group_roles')
        .insert({
          member_group_id: deusexPersonalGroupId,
          group_id: deusexGroupId,
          group_role_id: deusexRole.id,
          assigned_by_group_id: deusexPersonalGroupId,
        });
      if (roleErr) {
        throw new Error(`Failed to assign DeusEx role: ${roleErr.message}`);
      }
    }

    // --- Step 5: Create a temporary engagement group for permission context checks ---
    tempUser = await createTestUser({ displayName: 'Bootstrap Context User' });
    const { data: group } = await admin
      .from('groups')
      .insert({
        name: 'Bootstrap Test Group',
        group_type: 'engagement',
        created_by_group_id: tempUser.personalGroupId,
      })
      .select()
      .single();
    testGroup = group;
  }, 30000);

  afterAll(async () => {
    // Only clean up the temporary engagement group and context user.
    // deusex@fringeisland.com is a persistent system fixture — do NOT delete
    // the DeusEx membership or role because the prevent_last_deusex_* triggers
    // will block deletion when there is only one member.
    if (testGroup) await cleanupTestGroup(testGroup.id);
    if (tempUser) await cleanupTestUser(tempUser.user.id);
  }, 30000);

  it('should have deusex@fringeisland.com as an active Deusex member', async () => {
    const { data: membership, error } = await admin
      .from('group_memberships')
      .select('id, status')
      .eq('group_id', deusexGroupId)
      .eq('member_group_id', deusexPersonalGroupId)
      .eq('status', 'active')
      .single();

    expect(error).toBeNull();
    expect(membership).not.toBeNull();
    expect(membership!.status).toBe('active');
  });

  it('should have the Deusex role assigned', async () => {
    const { data: deusexRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', deusexGroupId)
      .eq('name', 'DeusEx')
      .single();

    expect(deusexRole).not.toBeNull();

    const { data: roleAssignment, error } = await admin
      .from('user_group_roles')
      .select('id')
      .eq('member_group_id', deusexPersonalGroupId)
      .eq('group_id', deusexGroupId)
      .eq('group_role_id', deusexRole!.id)
      .single();

    expect(error).toBeNull();
    expect(roleAssignment).not.toBeNull();
  });

  it('should have manage_all_groups permission via has_permission()', async () => {
    const { data, error } = await admin.rpc('has_permission', {
      p_acting_group_id: deusexPersonalGroupId,
      p_context_group_id: testGroup.id,
      p_permission_name: 'manage_all_groups',
    });

    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it('should have ALL permissions (Tier 1 system group resolution)', async () => {
    const { data: allPerms } = await admin
      .from('permissions')
      .select('name');

    expect(allPerms).not.toBeNull();
    expect(allPerms!.length).toBeGreaterThanOrEqual(42);

    const results = await Promise.all(
      allPerms!.map(async (perm: { name: string }) => {
        const { data } = await admin.rpc('has_permission', {
          p_acting_group_id: deusexPersonalGroupId,
          p_context_group_id: testGroup.id,
          p_permission_name: perm.name,
        });
        return { permission: perm.name, granted: data };
      })
    );

    const denied = results.filter((r) => r.granted !== true);
    expect(denied).toEqual([]);
  });
});
