/**
 * Integration Tests: D15 Hardening — personal_group_id Immutability
 *
 * Covers:
 * - B-D15-001: personal_group_id cannot be changed once set
 *
 * The enforce_personal_group_id_immutability trigger must block UPDATEs
 * that attempt to change or NULL-out a user's personal_group_id.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestUser,
  cleanupTestUser,
  createAdminClient,
} from '@/tests/helpers/supabase';
import { randomUUID } from 'crypto';

describe('B-D15-001: personal_group_id Immutability', () => {
  const admin = createAdminClient();
  let testUser: any;

  beforeAll(async () => {
    testUser = await createTestUser({ displayName: 'D15 Immutability Test User' });
  }, 30000);

  afterAll(async () => {
    if (testUser) await cleanupTestUser(testUser.user.id);
  }, 30000);

  it('should block UPDATE that changes personal_group_id to a different UUID', async () => {
    const fakeGroupId = randomUUID();

    const { error } = await admin
      .from('users')
      .update({ personal_group_id: fakeGroupId })
      .eq('id', testUser.profile.id);

    expect(error).not.toBeNull();
    expect(error!.message).toContain('personal_group_id cannot be changed');
  });

  it('should block UPDATE that sets personal_group_id to NULL', async () => {
    const { error } = await admin
      .from('users')
      .update({ personal_group_id: null })
      .eq('id', testUser.profile.id);

    expect(error).not.toBeNull();
    expect(error!.message).toContain('personal_group_id cannot be changed');
  });

  it('should allow UPDATE of other fields (bio) without error', async () => {
    const { error } = await admin
      .from('users')
      .update({ bio: 'D15 hardening test bio' })
      .eq('id', testUser.profile.id);

    expect(error).toBeNull();

    // Verify the update worked
    const { data: updated } = await admin
      .from('users')
      .select('bio')
      .eq('id', testUser.profile.id)
      .single();

    expect(updated?.bio).toBe('D15 hardening test bio');
  });
});
