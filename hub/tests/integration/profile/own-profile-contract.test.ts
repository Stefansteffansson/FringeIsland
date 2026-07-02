import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  type TestUser,
} from '@/tests/helpers/supabase';

/**
 * FEAT-PC003 / ADR-U038 F1 — the own-profile contract is PLATFORM-SIDE. These tests
 * call the RPCs DIRECTLY (the sibling-Surface / Gimbal path), bypassing the Hub lib's
 * client-side validateProfilePatch, to prove the gating + validation are enforced at
 * the substrate — not only in TypeScript. Red-first: fails until the two RPCs land.
 */
describe('FEAT-PC003 / ADR-U038 F1 — own-profile contract (server-side enforcement)', () => {
  const admin = createAdminClient();
  let user: TestUser;
  let other: TestUser;

  beforeAll(async () => {
    user = await createTestUser({ displayName: 'Contract User' });
    other = await createTestUser({ displayName: 'Other Contract' });
  });

  afterAll(async () => {
    if (user) await cleanupTestUser(user.user.id);
    if (other) await cleanupTestUser(other.user.id);
  });

  it('get_own_profile returns only the six identity-scope fields — never email', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);

    const { data, error } = await supabase.rpc('get_own_profile');
    expect(error).toBeNull();
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
    expect(Object.keys(row).sort()).toEqual(
      ['avatar_url', 'bio', 'display_preference', 'full_name', 'nickname', 'show_real_name'].sort(),
    );
    expect(row).not.toHaveProperty('email');
    expect(row.full_name).toBe('Contract User');
  });

  it('update_own_profile REJECTS a non-identity-scope key at the substrate (22023), bypassing TS', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);

    // The Gimbal-equivalent direct call with a forbidden key — the RPC must refuse it,
    // even though no client-side validateProfilePatch runs on this path.
    const { error } = await supabase.rpc('update_own_profile', {
      p_patch: { is_temporary: true },
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('22023');

    const { data: row } = await admin
      .from('users')
      .select('is_temporary')
      .eq('auth_user_id', user.user.id)
      .single();
    expect(row!.is_temporary).toBe(false);
  });

  it('update_own_profile REJECTS an invalid value at the substrate (full_name too short)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);

    const { error } = await supabase.rpc('update_own_profile', {
      p_patch: { full_name: 'x' },
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('22023');
  });

  it('update_own_profile applies a valid patch and is own-scoped by auth.uid()', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);

    const { data, error } = await supabase.rpc('update_own_profile', {
      p_patch: { full_name: 'Contract Userson', bio: 'via the contract' },
    });
    expect(error).toBeNull();
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
    expect(row.full_name).toBe('Contract Userson');
    expect(row.bio).toBe('via the contract');

    // `other` was never touched — the RPC resolves the subject from auth.uid(), with
    // no target parameter to point at another user.
    const { data: otherRow } = await admin
      .from('users')
      .select('full_name')
      .eq('auth_user_id', other.user.id)
      .single();
    expect(otherRow!.full_name).toBe('Other Contract');
  });
});
