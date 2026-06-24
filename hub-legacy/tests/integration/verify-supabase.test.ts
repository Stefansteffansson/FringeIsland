/**
 * Supabase Connection Verification Test
 *
 * Verifies that both anon key and service role key work correctly.
 */

import { describe, it, expect } from '@jest/globals';
import { createTestClient, createAdminClient } from '@/tests/helpers/supabase';

describe('Supabase Connection Verification', () => {
  it('should connect with anon key', async () => {
    const supabase = createTestClient();

    // Try a simple query (should work even unauthenticated)
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(0);

    // Should not error (might return empty, but connection works)
    expect(error).toBeNull();
  });

  it('should connect with service role key', async () => {
    const admin = createAdminClient();

    // Service role can bypass RLS - try listing users
    const { data, error } = await admin
      .from('users')
      .select('id')
      .limit(1);

    // Should work without auth errors
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have admin auth capabilities', async () => {
    const admin = createAdminClient();

    // Try to access admin auth API (requires service role)
    // This will fail gracefully if key is wrong
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // If service role key is correct, this should not error
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data.users).toBeDefined();
  });
});
