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
 * Delete every anonymous (Mist) auth user — the E2E janitor for FEAT-H003.
 * There is no FEAT-PC002 reaper yet (the known, bounded accumulation gap), so the
 * Mist journey specs clean up after themselves. The only source of anonymous
 * users in this project is the Mist feature, so deleting all of them is safe.
 * Mirrors the D15 cleanup chain (journeys → personal group → auth.users).
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
    if (profile?.personal_group_id) {
      await admin.from('journeys').delete().eq('created_by_group_id', profile.personal_group_id);
      await admin.from('groups').delete().eq('id', profile.personal_group_id);
    }
    await admin.auth.admin.deleteUser(u.id);
  }
}

/**
 * Delete a leftover E2E user by email. D15 cleanup chain: journeys (RESTRICT FK)
 * → personal group (CASCADE) → auth.users (CASCADE removes public.users).
 */
export async function deleteE2EUser(admin: SupabaseClient, email: string): Promise<void> {
  const { data: profile } = await admin
    .from('users')
    .select('auth_user_id, personal_group_id')
    .eq('email', email)
    .maybeSingle();

  if (profile?.personal_group_id) {
    await admin.from('journeys').delete().eq('created_by_group_id', profile.personal_group_id);
    await admin.from('groups').delete().eq('id', profile.personal_group_id);
  }
  if (profile?.auth_user_id) {
    await admin.auth.admin.deleteUser(profile.auth_user_id as string);
  }
}
