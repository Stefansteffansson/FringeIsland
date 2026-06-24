/**
 * Integration Tests: Admin Audit Log
 *
 * Covers:
 * - B-ADMIN-007: Admin Audit Log
 *
 * Tests that the admin_audit_log table exists with correct schema,
 * Deusex members can SELECT/INSERT, and non-admins are blocked.
 * No UPDATE or DELETE is allowed for anyone.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  createAdminClient,
  createTestClient,
  cleanupTestUser,
  signInWithRetry,
} from '@/tests/helpers/supabase';

describe('B-ADMIN-007: Admin Audit Log', () => {
  const admin = createAdminClient();

  let deusexUser: any;
  let deusexClient: ReturnType<typeof createTestClient>;
  let normalUser: any;
  let normalClient: ReturnType<typeof createTestClient>;
  let deusexGroupId: string;
  let deusexRoleId: string;
  let testLogEntryId: string | null = null;

  beforeAll(async () => {
    // Create users
    const deusexResult = await createTestUser({ displayName: 'Audit Deusex User' });
    deusexUser = { ...deusexResult, personalGroupId: deusexResult.personalGroupId };
    const normalResult = await createTestUser({ displayName: 'Audit Normal User' });
    normalUser = { ...normalResult, personalGroupId: normalResult.personalGroupId };

    const { user: dUser, profile: dProfile, personalGroupId: deusexPgId } = deusexResult;
    const { user: nUser, profile: nProfile, personalGroupId: normalPgId } = normalResult;

    deusexUser = { user: dUser, profile: dProfile, personalGroupId: deusexPgId, email: deusexResult.email, password: deusexResult.password };
    normalUser = { user: nUser, profile: nProfile, personalGroupId: normalPgId, email: normalResult.email, password: normalResult.password };

    // Look up Deusex group and role
    const { data: deusexGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'DeusEx')
      .eq('group_type', 'system')
      .single();

    if (!deusexGroup) throw new Error('Deusex system group not found');
    deusexGroupId = deusexGroup.id;

    const { data: deusexRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', deusexGroupId)
      .eq('name', 'DeusEx')
      .single();

    if (!deusexRole) throw new Error('Deusex role not found');
    deusexRoleId = deusexRole.id;

    // Add deusex user to Deusex group
    await admin.from('group_memberships').insert({
      group_id: deusexGroupId,
      member_group_id: deusexUser.personalGroupId,
      added_by_group_id: deusexUser.personalGroupId,
      status: 'active',
    });

    await admin.from('user_group_roles').insert({
      member_group_id: deusexUser.personalGroupId,
      group_id: deusexGroupId,
      group_role_id: deusexRoleId,
      assigned_by_group_id: deusexUser.personalGroupId,
    });

    // Sign in both users
    deusexClient = createTestClient();
    await signInWithRetry(deusexClient, deusexUser.email, deusexUser.password);

    normalClient = createTestClient();
    await signInWithRetry(normalClient, normalUser.email, normalUser.password);
  }, 30000);

  afterAll(async () => {
    // Clean up audit log entries created by tests (via admin client)
    if (testLogEntryId) {
      await admin.from('admin_audit_log').delete().eq('id', testLogEntryId);
    }

    // Clean up Deusex membership
    await admin.from('user_group_roles').delete()
      .eq('member_group_id', deusexUser.personalGroupId)
      .eq('group_id', deusexGroupId);
    await admin.from('group_memberships').delete()
      .eq('member_group_id', deusexUser.personalGroupId)
      .eq('group_id', deusexGroupId);

    if (deusexUser) await cleanupTestUser(deusexUser.user.id);
    if (normalUser) await cleanupTestUser(normalUser.user.id);
  }, 30000);

  it('should have admin_audit_log table with correct columns', async () => {
    // Query the table structure via admin (service role) — just select with limit 0
    const { error } = await admin
      .from('admin_audit_log')
      .select('id, actor_group_id, action, target, metadata, created_at')
      .limit(0);

    expect(error).toBeNull();
  });

  it('should allow Deusex member to INSERT audit log entries', async () => {
    const { data, error } = await deusexClient
      .from('admin_audit_log')
      .insert({
        actor_group_id: deusexUser.personalGroupId,
        action: 'test_action',
        target: 'test_target',
        metadata: { test: true },
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.action).toBe('test_action');
    testLogEntryId = data!.id;
  });

  it('should allow Deusex member to SELECT audit log entries', async () => {
    const { data, error } = await deusexClient
      .from('admin_audit_log')
      .select('*');

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });

  it('should block non-admin from SELECT on audit log', async () => {
    const { data, error } = await normalClient
      .from('admin_audit_log')
      .select('*');

    // RLS should return empty result (not an error)
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('should block non-admin from INSERT on audit log', async () => {
    const { data, error } = await normalClient
      .from('admin_audit_log')
      .insert({
        actor_group_id: normalUser.personalGroupId,
        action: 'unauthorized_action',
        target: 'test',
        metadata: {},
      })
      .select()
      .single();

    // Should fail due to RLS
    expect(error).not.toBeNull();
  });

  it('should block UPDATE on audit log (even for Deusex)', async () => {
    if (!testLogEntryId) {
      // If INSERT test didn't create an entry, skip
      expect(testLogEntryId).not.toBeNull();
      return;
    }

    const { error } = await deusexClient
      .from('admin_audit_log')
      .update({ action: 'tampered_action' })
      .eq('id', testLogEntryId);

    // Should fail — no UPDATE policy exists
    // PostgREST returns 0 rows affected (not an error) when no UPDATE policy matches
    // So we check that the data wasn't actually changed
    const { data: unchanged } = await admin
      .from('admin_audit_log')
      .select('action')
      .eq('id', testLogEntryId)
      .single();

    expect(unchanged!.action).toBe('test_action');
  });

  it('should block DELETE on audit log (even for Deusex)', async () => {
    if (!testLogEntryId) {
      expect(testLogEntryId).not.toBeNull();
      return;
    }

    const { error } = await deusexClient
      .from('admin_audit_log')
      .delete()
      .eq('id', testLogEntryId);

    // Verify the entry still exists
    const { data: stillExists } = await admin
      .from('admin_audit_log')
      .select('id')
      .eq('id', testLogEntryId)
      .single();

    expect(stillExists).not.toBeNull();
  });
});
