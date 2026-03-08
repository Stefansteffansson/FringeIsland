/**
 * Jest Global Teardown — Integration Tests
 *
 * Runs automatically after every integration suite completes (success,
 * failure, or Ctrl+C). Sweeps orphaned test data that leaked when
 * afterAll hooks crashed or timed out.
 *
 * Three-phase cleanup:
 * 1. Delete test auth users (@fringeisland.test) + their personal groups
 * 2. Delete orphan personal groups (no matching public.users row)
 * 3. Delete orphan engagement groups (created_by_group_id IS NULL)
 *
 * This runs in a SEPARATE Node process (not a Jest worker), so it
 * needs its own Supabase client and dotenv setup.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(__dirname, '../.env.local') });

/** Delete a group safely: pre-delete journeys (RESTRICT FK), then delete group. */
async function deleteGroup(
  admin: ReturnType<typeof createClient<any, any, any>>,
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
    console.log('[globalTeardown] Missing env vars — skipping cleanup');
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('\n[globalTeardown] Sweeping orphaned test data...');

  // ── Phase 1: Delete test auth users ──────────────────────────────────
  const { data: authList, error: listError } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });

  if (listError) {
    console.error('[globalTeardown] Failed to list auth users:', listError.message);
    return;
  }

  const testUsers = (authList.users as Array<{ id: string; email?: string }>).filter(
    (u) => u.email && u.email.endsWith('@fringeisland.test')
  );

  let usersDeleted = 0;
  let phase1Groups = 0;

  for (const authUser of testUsers) {
    const { data: profile } = await admin
      .from('users')
      .select('id, personal_group_id')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (profile?.personal_group_id) {
      if (await deleteGroup(admin, profile.personal_group_id)) phase1Groups++;
    }

    const { error } = await admin.auth.admin.deleteUser(authUser.id);
    if (!error) usersDeleted++;
  }

  // ── Phase 2: Delete orphan personal groups ───────────────────────────
  const { data: remainingUsers } = await admin
    .from('users')
    .select('personal_group_id');
  const validPGIds = new Set(
    (remainingUsers || []).map((u: any) => u.personal_group_id).filter(Boolean)
  );

  // Fetch all personal groups (paginate since there could be >1000)
  let allPersonalGroups: { id: string }[] = [];
  let offset = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data } = await admin
      .from('groups')
      .select('id')
      .eq('group_type', 'personal')
      .range(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    allPersonalGroups = allPersonalGroups.concat(data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const orphanPersonal = allPersonalGroups.filter((g) => !validPGIds.has(g.id));
  let phase2Deleted = 0;
  for (const group of orphanPersonal) {
    if (await deleteGroup(admin, group.id)) phase2Deleted++;
  }

  // ── Phase 3: Delete orphan engagement groups ─────────────────────────
  const { data: orphanEngagement } = await admin
    .from('groups')
    .select('id')
    .is('created_by_group_id', null)
    .not('group_type', 'eq', 'system')
    .not('group_type', 'eq', 'personal');

  let phase3Deleted = 0;
  for (const group of orphanEngagement || []) {
    if (await deleteGroup(admin, group.id)) phase3Deleted++;
  }

  // ── Summary ──────────────────────────────────────────────────────────
  const total = usersDeleted + phase1Groups + phase2Deleted + phase3Deleted;
  if (total > 0) {
    console.log(
      `[globalTeardown] Cleaned: ${usersDeleted} test users, ` +
        `${phase1Groups} personal groups (phase 1), ` +
        `${phase2Deleted} orphan personal (phase 2), ` +
        `${phase3Deleted} orphan engagement (phase 3)`
    );
  } else {
    console.log('[globalTeardown] No orphaned test data found');
  }
}
