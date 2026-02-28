/**
 * Playwright Global Teardown
 *
 * Sweeps all @fringeisland.test users created during E2E tests.
 * FK-safe: deletes journeys -> personal group -> auth user.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(__dirname, '../../.env.local') });

async function deleteGroup(
  admin: ReturnType<typeof createClient>,
  groupId: string
): Promise<boolean> {
  await admin.from('journeys').delete().eq('created_by_group_id', groupId);
  const { error } = await admin.from('groups').delete().eq('id', groupId);
  return !error;
}

export default async function globalTeardown() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.log('[e2e-teardown] Missing env vars — skipping cleanup');
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('\n[e2e-teardown] Sweeping E2E test data...');

  const { data: authList, error: listError } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });

  if (listError) {
    console.error('[e2e-teardown] Failed to list auth users:', listError.message);
    return;
  }

  const testUsers = authList.users.filter(
    (u) => u.email && u.email.endsWith('@fringeisland.test')
  );

  let usersDeleted = 0;
  let groupsDeleted = 0;

  for (const authUser of testUsers) {
    const { data: profile } = await admin
      .from('users')
      .select('id, personal_group_id')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (profile?.personal_group_id) {
      if (await deleteGroup(admin, profile.personal_group_id)) groupsDeleted++;
    }

    const { error } = await admin.auth.admin.deleteUser(authUser.id);
    if (!error) usersDeleted++;
  }

  if (usersDeleted > 0 || groupsDeleted > 0) {
    console.log(
      `[e2e-teardown] Cleaned: ${usersDeleted} test users, ${groupsDeleted} personal groups`
    );
  } else {
    console.log('[e2e-teardown] No E2E test data found');
  }
}
