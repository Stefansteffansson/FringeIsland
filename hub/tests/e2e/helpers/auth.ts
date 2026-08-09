import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SESSION_EMAIL = 'e2e-session@fringeisland.test';
export const E2E_PASSWORD = 'e2e-test-password-123';

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    throw new Error('E2E requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (hub/.env.local)');
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * THE erasure primitive for the E2E tier (TASK-INT-03, 2026-08-09).
 *
 * Every path that removes an E2E identity must go through this. The order is
 * the whole point and it is not negotiable:
 *
 *   consent (RESTRICT) → journeys (RESTRICT) → **auth user** → personal group
 *
 * Deleting the group FIRST can never succeed: `users` references it, so the
 * delete fires the FK's SET NULL on `users.personal_group_id`, which an
 * immutability trigger rejects with
 *   "personal_group_id cannot be changed after it has been set"
 * If that error is discarded, the following auth delete CASCADEs `public.users`
 * away and leaves the group with nothing pointing at it — an orphan, permanently
 * unidentifiable as anyone's.
 *
 * That exact defect was fixed in the integration tier on 2026-07-28
 * (`tests/helpers/supabase.ts`) and in `scripts/perf-measure.mjs` on 2026-08-09.
 * The E2E tier never got the fix and carried it in THREE helpers plus 24 direct
 * `auth.admin.deleteUser` call sites, which is why 1 357 orphaned personal
 * groups named "Mist" accumulated in 11 days — `cleanupAnonymousUsers` alone
 * orphaned up to 200 of them per run.
 *
 * It VERIFIES rather than trusts: the old code's failure mode was reporting a
 * success it had not achieved, so a silent path here would rebuild the bug.
 */
export async function eraseUserAndPersonalGroup(
  admin: SupabaseClient,
  authUserId: string | null | undefined,
  personalGroupId: string | null | undefined,
): Promise<void> {
  if (personalGroupId) {
    // Consent rows FK-reference the group ON DELETE RESTRICT (retention,
    // ADR-U034) — clear via the controlled-erasure bypass, as teardown is a
    // legitimate bypass caller. Journeys are RESTRICT too.
    await runAdminSql(
      `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
        `DELETE FROM public.consent_records WHERE subject_group_id = '${personalGroupId}'; END $$;`,
    ).catch(() => undefined);
    await admin.from('journeys').delete().eq('created_by_group_id', personalGroupId);
  }

  // AUTH FIRST — so `public.users` CASCADEs and only then is the group
  // unreferenced and deletable.
  if (authUserId) {
    const { error: authErr } = await admin.auth.admin.deleteUser(authUserId);
    // "not found" means an earlier call already erased it — teardown is
    // idempotent by design, and a false alarm here would train readers to
    // ignore this line, which is how the original defect stayed invisible.
    if (authErr && !/not.?found/i.test(authErr.message)) {
      console.error(`[e2e-cleanup] auth user ${authUserId}: ${authErr.message}`);
    }
  }

  if (personalGroupId) {
    const { error: groupErr } = await admin.from('groups').delete().eq('id', personalGroupId);
    if (groupErr) {
      console.error(`[e2e-cleanup] personal group ${personalGroupId} REFUSED: ${groupErr.message}`);
    }
    const { count } = await admin
      .from('groups')
      .select('id', { count: 'exact', head: true })
      .eq('id', personalGroupId);
    if (count) {
      throw new Error(
        `[e2e-cleanup] LEAKED personal group ${personalGroupId} — it survived teardown (TASK-INT-03)`,
      );
    }
  }
}

/**
 * Delete an E2E identity by its AUTH user id — the shape 24 spec teardowns used
 * to write by hand as a bare `admin.auth.admin.deleteUser(authId)`, which
 * removed the account and left its personal group behind every single time.
 */
export async function deleteE2EUserByAuthId(
  admin: SupabaseClient,
  authUserId: string | null | undefined,
): Promise<void> {
  if (!authUserId) return;
  const { data: profile } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  await eraseUserAndPersonalGroup(admin, authUserId, profile?.personal_group_id as string | null);
}

/** Count orphaned personal groups — groups no `users` row points at. The leak
 *  instrument for TASK-INT-03, used by E2E global setup/teardown. */
export async function countOrphanedPersonalGroups(): Promise<number> {
  const rows = await runAdminSqlRows(
    `SELECT count(*)::int AS n FROM public.groups g
      WHERE g.group_type = 'personal'
        AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.personal_group_id = g.id);`,
  );
  return Number(rows?.[0]?.n ?? 0);
}

/**
 * Delete every anonymous (Mist) auth user — the E2E janitor for FEAT-H003.
 * The only source of anonymous users in this project is the Mist feature, so
 * deleting all of them is safe.
 *
 * Routed through `eraseUserAndPersonalGroup` (TASK-INT-03): this function used
 * to delete the personal group before the auth user and discard the result, and
 * because it sweeps EVERY anonymous user (perPage 200) on each of the three Mist
 * specs that call it, it was the single largest orphan source in the project.
 */
export async function cleanupAnonymousUsers(admin: SupabaseClient): Promise<void> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error || !data) return;
  const anon = data.users.filter((u) => u.is_anonymous);
  for (const u of anon) {
    const { data: profile } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('auth_user_id', u.id)
      .maybeSingle();
    await eraseUserAndPersonalGroup(admin, u.id, profile?.personal_group_id as string | null);
  }
}

/**
 * Run admin SQL via the Supabase Management API (test-only) — the channel for
 * substrate manipulation the JS client cannot do, here the controlled
 * consent-erasure bypass. Mirrors `tests/helpers/supabase.ts`. Requires
 * SUPABASE_ACCESS_TOKEN (hub/.env.local).
 */
export async function runAdminSql(sql: string): Promise<void> {
  await runAdminSqlRows(sql);
}

/** As `runAdminSql`, but returns the result rows (the Management API replies
 *  with an array). Used by the TASK-INT-03 orphan leak instrument. */
export async function runAdminSqlRows(sql: string): Promise<Array<Record<string, unknown>>> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('runAdminSql requires SUPABASE_ACCESS_TOKEN (management API) in hub/.env.local');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ref = url.match(/https:\/\/([^.]+)\./)?.[1];
  if (!ref) throw new Error(`Could not derive project ref from ${url}`);
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.json();
  if (!res.ok || (body && !Array.isArray(body) && (body as { error?: unknown }).error)) {
    throw new Error(`runAdminSql failed: ${JSON.stringify(body)}`);
  }
  return Array.isArray(body) ? (body as Array<Record<string, unknown>>) : [];
}

/**
 * Delete a leftover transcended FIM by email (FEAT-H004). A transcended FIM
 * carries an append-only consent record (FK RESTRICT), so the consent must be
 * removed via the controlled erasure bypass BEFORE the proto group can be torn
 * down — then the D15 cleanup chain (journeys → group → auth.users) applies.
 */
export async function deleteTranscendedUser(admin: SupabaseClient, email: string): Promise<void> {
  const { data: profile } = await admin
    .from('users')
    .select('auth_user_id, personal_group_id')
    .eq('email', email)
    .maybeSingle();
  if (!profile) return;
  // ORDER CORRECTED 2026-08-09 (TASK-INT-03) — see eraseUserAndPersonalGroup.
  await eraseUserAndPersonalGroup(
    admin,
    profile.auth_user_id as string | null,
    profile.personal_group_id as string | null,
  );
}

/**
 * Delete a leftover E2E user by email. D15 cleanup chain: consent rows (RESTRICT
 * FK, purged under the controlled-erasure bypass — the session FIM carries the
 * ADR-U038 S3 signup consent) → journeys (RESTRICT FK) → personal group
 * (CASCADE; journal entries ride this) → auth.users (CASCADE removes public.users).
 */
export async function deleteE2EUser(admin: SupabaseClient, email: string): Promise<void> {
  const { data: profile } = await admin
    .from('users')
    .select('auth_user_id, personal_group_id')
    .eq('email', email)
    .maybeSingle();

  // ORDER CORRECTED 2026-08-09 (TASK-INT-03) — see eraseUserAndPersonalGroup.
  await eraseUserAndPersonalGroup(
    admin,
    profile?.auth_user_id as string | null,
    profile?.personal_group_id as string | null,
  );
}

/**
 * FEAT-H023: mark a fixture FIM as having "arrived once" — pre-enrol them in
 * the designated onboarding journey. Without this, the fixture's first
 * /groups landing auto-launches onboarding (correct product behaviour) and
 * yanks the spec into the player. Arrival flows belong to
 * onboarding-arrival.spec, which uses fresh un-arrived identities.
 */
/** TASK-INT-05 — E2E group teardown. THROWS on refusal (decided deliberately:
 *  a teardown failure is a suite failure, never a console line — a swallowed
 *  refusal is exactly how 39 caretaker memberships accumulated unseen).
 *  Order mirrors the integration-tier precedent: roles, then memberships in
 *  both directions, then enrolments, then the group row. */
export async function cleanupE2EGroup(groupId: string): Promise<void> {
  // The proven integration-tier path (cleanupTestGroup): owned journeys first,
  // then the GROUP ROW — FK CASCADE takes memberships/roles/enrolments. A
  // direct role-row delete is refused by prevent_last_leader_removal (the
  // last-Steward wall holds even for service-role SQL — found when the first
  // draft of this helper hit it); the cascade path is the sanctioned door.
  await runAdminSql(`
    DELETE FROM public.journeys WHERE created_by_group_id = '${groupId}';
    DELETE FROM public.groups WHERE id = '${groupId}';
  `);
}

/** TASK-INT-05 — the leak instrument: E2E-named groups holding the DeusEx
 *  system group as a member, counted before and after a full run. Derived from
 *  membership rows (the name filter is fixture-scoping only, never load-bearing
 *  logic — the FEAT-PC020 rule). */
export async function countDeusExE2ELeaks(admin: SupabaseClient): Promise<number> {
  const { data: deusex, error: dErr } = await admin
    .from('groups')
    .select('id')
    .eq('name', 'DeusEx')
    .eq('group_type', 'system')
    .single();
  if (dErr) throw new Error(`DeusEx lookup: ${dErr.message}`);
  const { count, error } = await admin
    .from('group_memberships')
    .select('group_id, groups!group_memberships_group_id_fkey!inner(name)', {
      count: 'exact',
      head: true,
    })
    .eq('member_group_id', deusex.id)
    .like('groups.name', 'E2E%');
  if (error) throw new Error(`leak count: ${error.message}`);
  return count ?? 0;
}

export async function markArrivedOnce(admin: SupabaseClient, authUserId: string): Promise<void> {
  const { data: profile } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('auth_user_id', authUserId)
    .single();
  const { data: onboarding } = await admin
    .from('journeys')
    .select('id')
    .eq('is_onboarding_designated', true)
    .maybeSingle();
  if (!profile?.personal_group_id || !onboarding?.id) return;
  await admin.from('journey_enrollments').insert({
    journey_id: onboarding.id,
    group_id: profile.personal_group_id,
    enrolled_by_group_id: profile.personal_group_id,
    status: 'active',
  });
}
