import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import { fetchMyProfile, updateMyProfile, ProfileValidationError } from '@/lib/profile/queries';

/**
 * FEAT-PC003 STORY-2 (identity-scope-gated own-row update) + STORY-3 (the
 * display-name cascade, owned by the existing sync_display_name_to_personal_group
 * trigger). Run as the authenticated caller under the existing own-row UPDATE
 * RLS (users_update_own) — no service_role, no SECURITY DEFINER.
 */
describe('FEAT-PC003 STORY-2/3 — own-row update, gating, and cascade', () => {
  const admin = createAdminClient();
  let user: TestUser;
  let other: TestUser;

  beforeAll(async () => {
    user = await createTestUser({ displayName: 'Grace Hopper' });
    other = await createTestUser({ displayName: 'Other Person' });
  });

  afterAll(async () => {
    if (user) await cleanupTestUser(user.user.id);
    if (other) await cleanupTestUser(other.user.id);
  });

  it('updates the caller own identity-scope fields and reads them back', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);

    const updated = await updateMyProfile(supabase, {
      full_name: 'Grace B. Hopper',
      bio: 'Compiler pioneer.',
      show_real_name: true,
    });
    expect(updated.full_name).toBe('Grace B. Hopper');
    expect(updated.bio).toBe('Compiler pioneer.');
    expect(updated.show_real_name).toBe(true);

    const read = await fetchMyProfile(supabase);
    expect(read!.full_name).toBe('Grace B. Hopper');
    expect(read!.bio).toBe('Compiler pioneer.');
  });

  it('cascades a display-name change to the personal-group name via the existing trigger', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);

    await updateMyProfile(supabase, { display_preference: 'nickname', nickname: 'Amazing Grace' });
    const afterNick = await admin
      .from('groups')
      .select('name')
      .eq('id', user.personalGroupId)
      .single();
    expect(afterNick.data!.name).toBe('Amazing Grace');

    await updateMyProfile(supabase, {
      display_preference: 'real_name',
      full_name: 'Grace Murray Hopper',
    });
    const afterReal = await admin
      .from('groups')
      .select('name')
      .eq('id', user.personalGroupId)
      .single();
    expect(afterReal.data!.name).toBe('Grace Murray Hopper');
  });

  it('rejects a non-identity-scope column at the contract (gating is the boundary, not RLS)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);

    await expect(
      updateMyProfile(supabase, { is_temporary: true } as never),
    ).rejects.toThrow(ProfileValidationError);

    const { data } = await admin
      .from('users')
      .select('is_temporary')
      .eq('auth_user_id', user.user.id)
      .single();
    expect(data!.is_temporary).toBe(false);
  });

  it('denies updating another user row (own-row RLS)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);

    const { data } = await supabase
      .from('users')
      .update({ full_name: 'HACKED' })
      .eq('auth_user_id', other.user.id)
      .select('full_name');
    expect(data ?? []).toHaveLength(0);

    const { data: otherRow } = await admin
      .from('users')
      .select('full_name')
      .eq('auth_user_id', other.user.id)
      .single();
    expect(otherRow!.full_name).toBe('Other Person');
  });

  it('rejects invalid values at the existing DB constraints (defense-in-depth backstop)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);

    const empty = await supabase
      .from('users')
      .update({ nickname: '' })
      .eq('auth_user_id', user.user.id)
      .select();
    expect(empty.error).not.toBeNull(); // nickname_not_empty CHECK

    const badPref = await supabase
      .from('users')
      .update({ display_preference: 'bogus' })
      .eq('auth_user_id', user.user.id)
      .select();
    expect(badPref.error).not.toBeNull(); // users_display_preference_check
  });
});
