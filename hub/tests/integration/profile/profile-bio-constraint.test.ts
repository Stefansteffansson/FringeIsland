import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  type TestUser,
} from '@/tests/helpers/supabase';
import { PROFILE_BIO_MAX_LENGTH } from '@/lib/profile/queries';

/**
 * FEAT-PC003 / TASK-PC003-02 — the bio-length DB CHECK backstop (schema-review
 * gated). Because the own-row UPDATE policy (users_update_own) lets an
 * authenticated caller write their own bio directly, the contract's length
 * validation is not a sufficient guard on its own. This proves the DB-level
 * CHECK rejects an over-long bio written directly (bypassing the contract).
 *
 * The over-long case is RED until the bio_max_length migration is applied.
 */
describe('FEAT-PC003 — bio length DB CHECK backstop', () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createTestUser({ displayName: 'Bio Tester' });
  });

  afterAll(async () => {
    if (user) await cleanupTestUser(user.user.id);
  });

  it('rejects an over-long bio written directly to the DB (bypassing the contract)', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);

    const { error } = await supabase
      .from('users')
      .update({ bio: 'x'.repeat(PROFILE_BIO_MAX_LENGTH + 1) })
      .eq('auth_user_id', user.user.id)
      // Select an explicit non-sensitive column: a bare .select() returns SELECT *,
      // which now includes the client-revoked `email` (ADR-U038 S2) and would 42501
      // before the bio CHECK is reached, masking what this test asserts.
      .select('bio');
    expect(error).not.toBeNull();
  });

  it('accepts a bio of exactly the bound', async () => {
    const supabase = createTestClient();
    await signInWithRetry(supabase, user.email, user.password);

    const { error } = await supabase
      .from('users')
      .update({ bio: 'x'.repeat(PROFILE_BIO_MAX_LENGTH) })
      .eq('auth_user_id', user.user.id)
      .select('bio');
    expect(error).toBeNull();
  });
});
