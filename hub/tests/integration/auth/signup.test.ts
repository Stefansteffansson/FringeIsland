import { describe, it, expect, afterAll } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createTestClient,
  createAdminClient,
  generateTestEmail,
  cleanupTestUser,
} from '@/tests/helpers/supabase';
import { signUpFim } from '@/lib/auth/signup';

/**
 * FEAT-H002 STORY-1/3 — credentialed FIM sign-up, substrate contract.
 * Seeded from oracle behaviours B-AUTH-001, B-RBAC-017, B-DISP-001..011.
 *
 * These tests drive the real anon `signUp` endpoint (not the admin createUser
 * helper) so they exercise the `handle_new_user` trigger the same way the app
 * does. Each mints a fresh unique email and tears the user down.
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
  throw new Error('profile did not materialise in time');
}

describe('FEAT-H002 STORY-1/3 — credentialed FIM sign-up (substrate contract)', () => {
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdUserIds) await cleanupTestUser(id);
  });

  it('creates a FIM with profile, personal group, "Myself" zero-perm role, Members enrolment, and display defaults', async () => {
    const email = generateTestEmail(`h002-create-${process.hrtime.bigint()}`);
    const supabase = createTestClient();

    const result = await signUpFim(supabase, {
      email,
      password: 'Test123!@#$',
      displayName: 'Ada Lovelace',
      consentAccepted: true,
    });

    expect(result.error).toBeNull();
    expect(result.user).not.toBeNull();
    createdUserIds.push(result.user!.id);

    const admin = createAdminClient();
    const profile = await waitForProfile(admin, result.user!.id);

    // B-AUTH-001 + B-DISP-001..011 — profile + display defaults.
    expect(profile.personal_group_id).not.toBeNull();
    expect(profile.full_name).toBe('Ada Lovelace');
    expect(profile.nickname).toBe('Ada'); // first word of display name
    expect(profile.show_real_name).toBe(false);
    expect(profile.display_preference).toBe('nickname');

    // B-RBAC-017 — personal group named after the nickname.
    const { data: pg } = await admin
      .from('groups')
      .select('name, group_type')
      .eq('id', profile.personal_group_id)
      .single();
    expect(pg!.name).toBe('Ada');
    expect(pg!.group_type).toBe('personal');

    // "Myself" role exists with ZERO granted permissions.
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

    // Auto-enrolled into "FringeIsland Members" (system group), status active.
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
    expect(enrolment).toBeTruthy();
    expect(enrolment!.status).toBe('active');
  });

  it('rejects a duplicate email and creates no second account', async () => {
    const email = generateTestEmail(`h002-dupe-${process.hrtime.bigint()}`);

    const first = await signUpFim(createTestClient(), {
      email,
      password: 'Test123!@#$',
      displayName: 'Dupe Tester',
      consentAccepted: true,
    });
    expect(first.error).toBeNull();
    expect(first.user).not.toBeNull();
    createdUserIds.push(first.user!.id);

    const second = await signUpFim(createTestClient(), {
      email,
      password: 'Test123!@#$',
      displayName: 'Dupe Tester',
      consentAccepted: true,
    });
    expect(second.error).not.toBeNull();
    expect(second.user).toBeNull();
  });

  it('refuses to create an account when consent is not accepted (no auth user, no profile)', async () => {
    const email = generateTestEmail(`h002-noconsent-${process.hrtime.bigint()}`);

    const result = await signUpFim(createTestClient(), {
      email,
      password: 'Test123!@#$',
      displayName: 'No Consent',
      consentAccepted: false,
    });

    expect(result.error).not.toBeNull();
    expect(result.user).toBeNull();

    // Nothing was created.
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    expect(profile).toBeNull();
  });
});
