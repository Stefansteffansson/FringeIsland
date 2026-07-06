import { describe, it, expect, afterAll } from '@jest/globals';
import {
  createTestClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  type TestUser,
} from '../../helpers/supabase';

/**
 * Security audit 2026-07-06 — anon EXECUTE lockdown (substrate).
 *
 * Supabase default privileges hand EXECUTE to `anon` (and PUBLIC) on every new
 * public function, defeating per-function `REVOKE ... FROM PUBLIC` statements.
 * The advisor flagged 77 anon-executable SECURITY DEFINER functions; live ACLs
 * confirmed `anon=X` — including `_erase_mist(uuid)`, the UNGATED erasure
 * primitive (its wrapper `explicit_erase_mist()` authorizes; the primitive
 * does not). Per ADR-U038 L27, PostgREST is directly reachable with the public
 * anon key — the grant layer IS an enforcement surface.
 *
 * The lockdown migration sweeps anon/PUBLIC EXECUTE off every public function,
 * fixes the DEFAULT PRIVILEGES so future functions never inherit the grant,
 * and drops `authenticated` from the two internal primitives (`_erase_mist`,
 * `reap_expired_mists`) that no client contract calls directly.
 *
 * Red-first: before the migration these anon calls EXECUTE (the erasure
 * primitive runs — with a nonexistent UUID, a no-op); after, PostgREST refuses
 * with 42501.
 */

const NO_SUCH_USER = '00000000-0000-4000-8000-000000000000';

describe('anon EXECUTE lockdown (PostgREST, anon key, no session)', () => {
  it('anon cannot execute the internal erasure primitive _erase_mist', async () => {
    const anon = createTestClient();
    const { error } = await anon.rpc('_erase_mist', { p_user_id: NO_SUCH_USER });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('anon cannot trigger the reaper', async () => {
    const anon = createTestClient();
    const { error } = await anon.rpc('reap_expired_mists');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('anon cannot probe the metadata read-helpers', async () => {
    const anon = createTestClient();
    const { error } = await anon.rpc('get_user_permissions', {
      p_acting_group_id: NO_SUCH_USER,
      p_context_group_id: NO_SUCH_USER,
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });

  it('anon cannot reach a member contract (get_member_groups)', async () => {
    const anon = createTestClient();
    const { error } = await anon.rpc('get_member_groups');
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });
});

describe('authenticated members are unaffected (the sweep must not over-revoke)', () => {
  let testUser: TestUser | null = null;

  afterAll(async () => {
    if (testUser) await cleanupTestUser(testUser.user.id);
  });

  it('a signed-in FIM still reaches the contracts', async () => {
    testUser = await createTestUser();
    const client = createTestClient();
    await signInWithRetry(client, testUser.email, testUser.password);

    const { data, error } = await client.rpc('get_member_groups');
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('the internal primitives are closed to authenticated members too', async () => {
    expect(testUser).not.toBeNull();
    const client = createTestClient();
    await signInWithRetry(client, testUser!.email, testUser!.password);

    const { error } = await client.rpc('_erase_mist', { p_user_id: NO_SUCH_USER });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('42501');
  });
});
