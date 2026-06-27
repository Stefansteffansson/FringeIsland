import { describe, it, expect, afterAll } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createTestClient,
  createAdminClient,
  createTestUser,
  cleanupTestUser,
  withAnonRateLimitRetry,
} from '@/tests/helpers/supabase';

/**
 * FEAT-PC001 — Mist anonymous-identity substrate (arrival), contract tests.
 *
 * TDD red-first: these FAIL until the migration adds `users.is_temporary` and
 * the `handle_new_user` anon branch (is_temporary flag + 'Mist' name fallback +
 * skip FringeIsland Members enrolment), and the Visitor->Mist seed rename lands.
 *
 * Drives the real anonymous sign-in endpoint so it exercises `handle_new_user`
 * the way the app does. Each anon user is torn down (no FEAT-PC002 reaper yet).
 */

/** handle_new_user fires AFTER INSERT (async) — poll for the materialised profile. */
async function waitForProfile(admin: SupabaseClient, authUserId: string, tries = 12) {
  for (let i = 0; i < tries; i++) {
    const { data } = await admin
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (data) return data;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Mist profile did not materialise in time');
}

describe('FEAT-PC001 — Mist anonymous-identity substrate (arrival)', () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  // STORY-1 + STORY-2 + STORY-3 — anonymous sign-in materialises a Mist.
  it('materialises a Mist: is_temporary=true, proto personal group, "Mist" name default, no Members enrolment', async () => {
    const supabase = createTestClient();
    const { data, error } = await withAnonRateLimitRetry(() => supabase.auth.signInAnonymously());

    // Precondition: anonymous sign-in must be enabled on the project (ADR-U004).
    expect(error).toBeNull();
    expect(data.user).not.toBeNull();
    createdUserIds.push(data.user!.id);

    const admin = createAdminClient();
    const profile = await waitForProfile(admin, data.user!.id);

    // STORY-1 — Mist identity state + actor anchor.
    expect(profile.is_temporary).toBe(true);
    expect(profile.personal_group_id).not.toBeNull();

    // STORY-2 — nameless Mist gets the 'Mist' default (no PII, no null-crash).
    expect(profile.full_name).toBe('Mist');

    // STORY-3 — proto personal group: sole member, zero-perm "Myself" role.
    const { data: pg } = await admin
      .from('groups')
      .select('name, group_type')
      .eq('id', profile.personal_group_id)
      .single();
    expect(pg!.group_type).toBe('personal');
    expect(pg!.name).toBe('Mist');

    const { data: roles } = await admin
      .from('group_roles')
      .select('id, name')
      .eq('group_id', profile.personal_group_id);
    const myself = roles!.find((r) => r.name === 'Myself');
    expect(myself).toBeTruthy();
    const { count: grantCount } = await admin
      .from('group_role_permissions')
      .select('*', { count: 'exact', head: true })
      .eq('group_role_id', myself!.id)
      .eq('granted', true);
    expect(grantCount).toBe(0);

    // STORY-3 — a Mist is NOT a FringeIsland Member (status-driven access, Q2).
    const { data: members } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'FringeIsland Members')
      .eq('group_type', 'system')
      .single();
    const { data: enrolment } = await admin
      .from('group_memberships')
      .select('status')
      .eq('group_id', members!.id)
      .eq('member_group_id', profile.personal_group_id)
      .maybeSingle();
    expect(enrolment).toBeNull();
  });

  // STORY-1 — the FIM path stays byte-for-byte unchanged.
  it('leaves the FIM path unchanged: a credentialed user is is_temporary=false', async () => {
    const user = await createTestUser({ displayName: 'Grace Hopper' });
    createdUserIds.push(user.user.id);

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('users')
      .select('is_temporary, full_name')
      .eq('auth_user_id', user.user.id)
      .single();
    expect(profile!.is_temporary).toBe(false);
    expect(profile!.full_name).toBe('Grace Hopper');
  });

  // STORY-4 — Visitor -> Mist canonical rename (ADR-U031).
  it('renames the vestigial "Visitor" system group / "Guest" role to "Mist"', async () => {
    const admin = createAdminClient();

    const { data: mistGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'Mist')
      .eq('group_type', 'system')
      .maybeSingle();
    expect(mistGroup).toBeTruthy();

    const { data: visitorGroup } = await admin
      .from('groups')
      .select('id')
      .eq('name', 'Visitor')
      .eq('group_type', 'system')
      .maybeSingle();
    expect(visitorGroup).toBeNull();

    const { data: mistRole } = await admin
      .from('group_roles')
      .select('id')
      .eq('group_id', mistGroup!.id)
      .eq('name', 'Mist')
      .maybeSingle();
    expect(mistRole).toBeTruthy();
  });
});
