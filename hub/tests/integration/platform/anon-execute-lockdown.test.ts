import { describe, it, expect, afterAll } from '@jest/globals';
import {
  createTestClient,
  createTestUser,
  cleanupTestUser,
  signInWithRetry,
  runAdminSql,
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

/**
 * The INVARIANT guard (added 2026-07-27, A-NTF gate W12 roll-up).
 *
 * The cases above are a hardcoded list, so they could only ever catch the
 * functions that existed when they were written — and that is exactly how the
 * A-NTF Cycle N-D regression escaped. The 2026-07-06 lockdown removed `anon`
 * from the DEFAULT PRIVILEGES for functions, but Postgres's *built-in* default
 * still grants `EXECUTE TO PUBLIC` on every new function, and `anon` inherits
 * PUBLIC. So each migration must revoke PUBLIC explicitly. N-A, N-B and N-C all
 * wrote `REVOKE ... FROM PUBLIC, anon`; **N-D wrote `FROM anon` alone on all
 * seven of its contracts**, and `REVOKE ... FROM anon` is a no-op against a
 * privilege held via PUBLIC.
 *
 * Measured at the gate: of 181 functions in `public`, exactly those 7 were
 * anon-executable — the lockdown holds everywhere else. Every one of the seven
 * still refused anon *in the body* (42501 admin-gated, or 28000 no-subject), so
 * nothing was exploitable; the defect is that the grant layer — which ADR-U038
 * L27 names as an enforcement surface in its own right — was wider than every
 * one of those bodies intended.
 *
 * This test asserts the property rather than a list, so the next omission fails
 * here instead of at a live walk.
 */
describe('anon EXECUTE lockdown — the invariant, not a list', () => {
  /** Functions deliberately left anon-executable. Empty by design: adding a row
   *  here is a decision that belongs in a spec, not a convenience. */
  const INTENTIONALLY_ANON: string[] = [];

  it('no function in schema public is executable by anon', async () => {
    const rows = await runAdminSql(`
      SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS signature
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND has_function_privilege('anon', p.oid, 'EXECUTE')
      ORDER BY 1;
    `);
    const leaked = rows
      .map((r) => String(r.signature))
      .filter((sig) => !INTENTIONALLY_ANON.includes(sig));
    expect(leaked).toEqual([]);
  });

  it('the notification trigger functions are closed to authenticated too', async () => {
    // A trigger function cannot be usefully invoked directly (Postgres raises
    // 0A000), but its siblings `notify_notification_hint` and
    // `ds5_apply_notification_preference` are explicitly revoked and this one
    // never was — in any migration, ever. Consistency is the point.
    const rows = await runAdminSql(`
      SELECT p.proname,
             has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prorettype = 'trigger'::regtype
        AND p.proname IN ('notify_invitation_received','notify_notification_hint',
                          'ds5_apply_notification_preference')
      ORDER BY 1;
    `);
    expect(rows.filter((r) => r.auth_exec === true).map((r) => r.proname)).toEqual([]);
  });

  it('a member preference contract refuses anon at the GRANT layer, not merely in the body', async () => {
    // Discriminating on purpose: while the PUBLIC grant stands, the call reaches
    // the body and is refused there (28000, "no active subject"). Once the grant
    // is revoked, PostgREST refuses first — 42501. Same member-visible outcome,
    // two very different postures.
    const anon = createTestClient();
    const { error } = await anon.rpc('get_own_notification_preferences');
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
