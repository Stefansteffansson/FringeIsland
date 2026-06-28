import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import { fetchMyProfile } from '@/lib/profile/queries';

/**
 * FEAT-PC003 STORY-1 — own-profile read. The contract resolves the caller's own
 * row by construction (`/profile/me`), so it never exposes another user's
 * profile even though the broad `users_select_active` SELECT policy would let a
 * direct query read other active rows. Exercised with an authenticated anon
 * client (RLS-enforced), mirroring the FEAT-H001 groups read-path harness.
 */
describe('FEAT-PC003 STORY-1 — own-profile read (own-row by construction)', () => {
  const admin = createAdminClient();
  let alice: TestUser;
  let bob: TestUser;

  beforeAll(async () => {
    alice = await createTestUser({ displayName: 'Alice Ada' });
    bob = await createTestUser({ displayName: 'Bob Babbage' });
    const { error } = await admin
      .from('users')
      .update({ bio: "Alice's bio" })
      .eq('auth_user_id', alice.user.id);
    if (error) throw error;
  });

  afterAll(async () => {
    if (alice) await cleanupTestUser(alice.user.id);
    if (bob) await cleanupTestUser(bob.user.id);
  });

  it("returns the caller's own identity-scope fields (and only those)", async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, alice.email, alice.password);

    const profile = await fetchMyProfile(supabase);
    expect(profile).not.toBeNull();
    expect(profile!.full_name).toBe('Alice Ada');
    expect(profile!.nickname).toBe('Alice');
    expect(profile!.bio).toBe("Alice's bio");
    expect(profile!.display_preference).toBe('nickname');
    expect(typeof profile!.show_real_name).toBe('boolean');
    expect(Object.keys(profile!).sort()).toEqual(
      ['avatar_url', 'bio', 'display_preference', 'full_name', 'nickname', 'show_real_name'].sort(),
    );
  });

  it('resolves to the signed-in caller, never another user', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, bob.email, bob.password);

    const profile = await fetchMyProfile(supabase);
    expect(profile!.full_name).toBe('Bob Babbage');
    expect(profile!.bio).not.toBe("Alice's bio");
  });

  it('returns null when there is no session', async () => {
    const supabase = createTestClient();
    const profile = await fetchMyProfile(supabase);
    expect(profile).toBeNull();
  });
});
