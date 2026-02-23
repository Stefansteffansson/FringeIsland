#!/usr/bin/env node
/**
 * One-time cleanup: purge orphaned test data from Supabase
 *
 * Three-phase cleanup:
 * 1. Delete test auth users (@fringeisland.test) + their personal groups
 * 2. Delete orphan personal groups (no matching public.users row)
 * 3. Delete orphan engagement groups (created_by_group_id IS NULL after cascades)
 *
 * Each group delete CASCADEs to: memberships, roles, user_group_roles,
 * enrollments, notifications, conversations, DMs, forum_posts, pending_invitations.
 *
 * Usage: node scripts/cleanup-test-data.js
 *        node scripts/cleanup-test-data.js --dry-run   (preview only)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const dryRun = process.argv.includes('--dry-run');

async function getRowCount(table) {
  const { count, error } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) return '?';
  return count;
}

/**
 * Delete a group safely: pre-delete journeys (RESTRICT FK), then delete group.
 * Returns true on success.
 */
async function deleteGroup(groupId) {
  await admin.from('journeys').delete().eq('created_by_group_id', groupId);
  const { error } = await admin.from('groups').delete().eq('id', groupId);
  return !error;
}

/**
 * Fetch all rows from a table with pagination (Supabase caps at 1000 per query).
 */
async function fetchAll(table, selectCols, filters) {
  const PAGE_SIZE = 1000;
  let all = [];
  let offset = 0;
  while (true) {
    let query = admin.from(table).select(selectCols).range(offset, offset + PAGE_SIZE - 1);
    if (filters) query = filters(query);
    const { data, error } = await query;
    if (error) {
      console.error(`fetchAll(${table}) error:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

async function main() {
  console.log(dryRun ? '\n=== DRY RUN (no changes) ===' : '\n=== Cleaning up test data ===');

  // Snapshot before counts
  const tables = [
    'groups', 'group_memberships', 'user_group_roles', 'notifications',
    'journey_enrollments', 'journeys', 'users',
  ];
  const before = {};
  for (const t of tables) {
    before[t] = await getRowCount(t);
  }
  console.log('\nBefore counts:');
  for (const [t, c] of Object.entries(before)) {
    console.log(`  ${t}: ${c}`);
  }

  // ── Phase 1: Delete test auth users ──────────────────────────────────
  console.log('\n--- Phase 1: Delete test auth users (@fringeisland.test) ---');
  const { data: authList, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error('Failed to list auth users:', listError.message);
    process.exit(1);
  }

  const testUsers = authList.users.filter(
    (u) => u.email && u.email.endsWith('@fringeisland.test')
  );
  console.log(`  Found ${testUsers.length} test auth users`);

  let usersDeleted = 0;
  let phase1Groups = 0;

  for (const authUser of testUsers) {
    const { data: profile } = await admin
      .from('users')
      .select('id, personal_group_id')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (profile?.personal_group_id && !dryRun) {
      if (await deleteGroup(profile.personal_group_id)) phase1Groups++;
    } else if (profile?.personal_group_id) {
      phase1Groups++;
    }

    if (!dryRun) {
      const { error } = await admin.auth.admin.deleteUser(authUser.id);
      if (!error) usersDeleted++;
      else console.error(`  Failed to delete ${authUser.email}:`, error.message);
    } else {
      usersDeleted++;
    }
  }
  console.log(`  ${dryRun ? 'Would delete' : 'Deleted'}: ${usersDeleted} auth users, ${phase1Groups} personal groups`);

  // ── Phase 2: Delete orphan personal groups ───────────────────────────
  console.log('\n--- Phase 2: Delete orphan personal groups ---');

  // Get valid personal_group_ids from remaining users
  const { data: remainingUsers } = await admin
    .from('users')
    .select('personal_group_id');
  const validPGIds = new Set(
    (remainingUsers || []).map((u) => u.personal_group_id).filter(Boolean)
  );
  console.log(`  ${validPGIds.size} valid personal groups (linked to existing users)`);

  // Get ALL personal groups (may exceed 1000)
  const allPersonalGroups = await fetchAll('groups', 'id', (q) =>
    q.eq('group_type', 'personal')
  );

  const orphanPersonal = allPersonalGroups.filter((g) => !validPGIds.has(g.id));
  console.log(`  Found ${orphanPersonal.length} orphan personal groups (out of ${allPersonalGroups.length} total)`);

  let phase2Deleted = 0;
  for (const group of orphanPersonal) {
    if (!dryRun) {
      if (await deleteGroup(group.id)) phase2Deleted++;
    } else {
      phase2Deleted++;
    }
  }
  console.log(`  ${dryRun ? 'Would delete' : 'Deleted'}: ${phase2Deleted} orphan personal groups`);

  // ── Phase 3: Delete orphan engagement groups ─────────────────────────
  console.log('\n--- Phase 3: Delete orphan engagement groups ---');

  // After Phase 2 deletes, engagement groups with created_by_group_id pointing
  // to deleted personal groups will have been SET NULL by the FK cascade.
  const { data: orphanEngagement } = await admin
    .from('groups')
    .select('id, name')
    .is('created_by_group_id', null)
    .not('group_type', 'eq', 'system')
    .not('group_type', 'eq', 'personal');

  const engOrphans = orphanEngagement || [];
  console.log(`  Found ${engOrphans.length} orphan engagement groups`);

  let phase3Deleted = 0;
  for (const group of engOrphans) {
    if (!dryRun) {
      if (await deleteGroup(group.id)) phase3Deleted++;
    } else {
      phase3Deleted++;
    }
  }
  console.log(`  ${dryRun ? 'Would delete' : 'Deleted'}: ${phase3Deleted} orphan engagement groups`);

  // ── Summary ──────────────────────────────────────────────────────────
  if (!dryRun) {
    console.log('\nAfter counts:');
    for (const t of tables) {
      const after = await getRowCount(t);
      console.log(`  ${t}: ${before[t]} → ${after}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`  Auth users deleted:           ${usersDeleted}`);
  console.log(`  Personal groups (Phase 1):    ${phase1Groups}`);
  console.log(`  Orphan personal (Phase 2):    ${phase2Deleted}`);
  console.log(`  Orphan engagement (Phase 3):  ${phase3Deleted}`);
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
