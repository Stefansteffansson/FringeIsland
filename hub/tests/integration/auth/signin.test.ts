import { describe, it, expect, afterAll } from '@jest/globals';
import {
  createTestClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  type TestUser,
} from '@/tests/helpers/supabase';

/**
 * FEAT-H001 STORY-1 — sign in (IDN-3, thin).
 * Seeded from the oracle behaviours B-AUTH-001/002.
 */
describe('FEAT-H001 STORY-1 — sign in (IDN-3, thin)', () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  it('signs in an existing FIM with valid credentials and establishes a session', async () => {
    const u: TestUser = await createTestUser({ displayName: 'Signin Valid' });
    createdUserIds.push(u.user.id);

    const supabase = createTestClient();
    await signInWithRetry(supabase, u.email, u.password);

    const { data: { session } } = await supabase.auth.getSession();
    expect(session).not.toBeNull();
    expect(session?.user.email).toBe(u.email);
  });

  it('rejects invalid credentials and creates no session', async () => {
    const supabase = createTestClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'nonexistent@fringeisland.test',
      password: 'wrong-password',
    });

    expect(error).not.toBeNull();
    expect(data.session).toBeNull();
  });
});
