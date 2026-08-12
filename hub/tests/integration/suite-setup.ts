// Integration suite setup — real Supabase, so allow generous time for
// create-user → trigger → sign-in → RLS-scoped reads, and fail loudly if the
// service-role key (setup/teardown) is missing.
jest.setTimeout(30000);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Integration tests require NEXT_PUBLIC_SUPABASE_URL (hub/.env.local)');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Integration tests require SUPABASE_SERVICE_ROLE_KEY (hub/.env.local)');
}

/**
 * Erase the Mists this file minted — every integration file, automatically.
 *
 * The house pattern for probing anonymous refusals is inline and everywhere:
 *
 *     const c = createTestClient();
 *     await c.auth.signInAnonymously();
 *     ...expect 42501...
 *     await c.auth.signOut();
 *
 * `signOut()` ends the SESSION; the anonymous user and its personal group stay.
 * Measured 2026-08-12: 55 Mists survived one full run, from six slices — by far
 * the largest single residue class, and invisible to any `test-*` email pattern
 * because a Mist has no email at all.
 *
 * Fixing it at ~40 call sites would be a large diff that the 41st probe forgets.
 * This file is loaded into EVERY integration suite (`setupFilesAfterEach`), so
 * one hook here makes the cleanup structural: a suite cannot opt out, and a new
 * probe inherits it for free.
 *
 * Safe to delete ALL anonymous users rather than only this file's: integration
 * runs `--runInBand`, so files never overlap, and no Mist is meant to outlive
 * the file that made it. Personal groups do NOT cascade from their user, so
 * their ids are captured before the users go and removed explicitly after.
 */
/**
 * SERVICE-ROLE CLIENT ONLY — deliberately no `runAdminSql` here.
 *
 * The first version of this hook used the Supabase MANAGEMENT API, which is
 * rate-limited far more tightly than the service-role key. One call per test
 * file across 83 files was enough to earn `ThrottlerException: Too Many
 * Requests`, and a throttled teardown does worse than nothing: the residue it
 * fails to clear is then attributed to the NEXT slice, which is how a re-check
 * blamed `account` for 77 accounts that belonged to `admin`. Instrumentation
 * that distorts the thing it measures is worse than no instrumentation.
 *
 * PostgREST + the auth-admin API carry their own, much larger budgets, and this
 * needs no elevated SQL: the auth user goes first so `public.users` CASCADEs,
 * which leaves the personal group unreferenced and deletable — the same proven
 * order as `cleanupTestUser`, and the reason no immutability bypass is required.
 */
afterAll(async () => {
  const { createAdminClient } = await import('@/tests/helpers/supabase');
  const admin = createAdminClient();
  try {
    // `is_temporary` is the Mist marker on the profile row, so the anonymous
    // population is reachable without querying the `auth` schema.
    const { data: mists } = await admin
      .from('users')
      .select('auth_user_id, personal_group_id')
      .eq('is_temporary', true);

    for (const m of mists ?? []) {
      if (m.auth_user_id) await admin.auth.admin.deleteUser(m.auth_user_id as string);
      if (m.personal_group_id) {
        await admin.from('groups').delete().eq('id', m.personal_group_id as string);
      }
    }

    // Direct threads are not group-anchored (TASK-DM-01), so deleting the
    // participants' groups leaves the conversation standing. One with no
    // participants left is unreachable by every contract — residue by
    // definition, and why account/admin/groups/communication each leaked
    // conversations while cleaning their groups correctly. Resolved in JS
    // because PostgREST has no NOT EXISTS.
    const [{ data: convs }, { data: parts }] = await Promise.all([
      admin.from('conversations').select('id'),
      admin.from('conversation_participants').select('conversation_id'),
    ]);
    const live = new Set((parts ?? []).map((p) => p.conversation_id as string));
    const orphaned = (convs ?? []).map((c) => c.id as string).filter((id) => !live.has(id));
    if (orphaned.length) {
      await admin.from('messages').delete().in('conversation_id', orphaned);
      await admin.from('conversations').delete().in('id', orphaned);
    }
  } catch (err) {
    // A hygiene sweep must never turn a green suite red — the global teardown
    // is the backstop, and it reports whatever this missed.
    console.warn(`[suite-setup] per-file sweep skipped: ${(err as Error).message}`);
  }
});
