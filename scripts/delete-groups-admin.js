#!/usr/bin/env node
/**
 * Admin script: Delete specific groups by owner email.
 *
 * Usage:
 *   node scripts/delete-groups-admin.js                  -- list all groups for stefan@example.com
 *   node scripts/delete-groups-admin.js --delete         -- delete the two orphan E3 Team Camp #3 groups
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * On DELETE CASCADE from groups cleans up:
 *   - group_memberships
 *   - group_roles  →  group_role_permissions, user_group_roles
 *   - journey_enrollments
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const OWNER_EMAIL = 'stefan@example.com';
// Descriptions of the two duplicate groups that cannot be managed via the UI.
const DESCRIPTIONS_TO_DELETE = [
  'Ersätter tidigare grupp!',
  'Testar',
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const shouldDelete = process.argv.includes('--delete');

async function main() {
  // ── 1. Resolve owner profile ──────────────────────────────────────────────
  const { data: owner, error: ownerErr } = await admin
    .from('users')
    .select('id, full_name, email')
    .eq('email', OWNER_EMAIL)
    .single();

  if (ownerErr || !owner) {
    console.error('❌  Could not find user with email', OWNER_EMAIL, ownerErr?.message ?? '');
    process.exit(1);
  }

  console.log(`\n✅  Found user: ${owner.full_name} (${owner.email})  id=${owner.id}\n`);

  // ── 2. List all groups created by this user ───────────────────────────────
  const { data: groups, error: groupsErr } = await admin
    .from('groups')
    .select('id, name, description, is_public, created_at')
    .eq('created_by_user_id', owner.id)
    .order('created_at', { ascending: true });

  if (groupsErr) {
    console.error('❌  Failed to fetch groups:', groupsErr.message);
    process.exit(1);
  }

  console.log(`📋  Groups owned by ${OWNER_EMAIL} (${groups.length} total):\n`);
  groups.forEach((g, i) => {
    const marker = DESCRIPTIONS_TO_DELETE.includes(g.description ?? '') ? '  ← WILL DELETE' : '';
    console.log(`  [${i + 1}] ${g.name}`);
    console.log(`       id:          ${g.id}`);
    console.log(`       description: ${g.description ?? '(none)'}`);
    console.log(`       public:      ${g.is_public}`);
    console.log(`       created:     ${g.created_at}${marker}`);
    console.log();
  });

  // ── 3. Identify targets ───────────────────────────────────────────────────
  const targets = groups.filter(g => DESCRIPTIONS_TO_DELETE.includes(g.description ?? ''));

  if (targets.length === 0) {
    console.log('ℹ️   No groups matched the target descriptions. Nothing to delete.');
    return;
  }

  console.log(`🎯  Targets identified (${targets.length}):`);
  targets.forEach(g => console.log(`     • "${g.name}" — "${g.description}"  (${g.id})`));
  console.log();

  if (!shouldDelete) {
    console.log('ℹ️   Dry-run complete. Re-run with --delete to remove these groups.');
    console.log('     All related records (memberships, roles, enrollments) will be');
    console.log('     removed automatically via ON DELETE CASCADE.\n');
    return;
  }

  // ── 4. Confirm related records before deletion ────────────────────────────
  for (const g of targets) {
    console.log(`🔍  Checking related records for: "${g.name}" (${g.id})`);

    const [memberships, roles, enrollments] = await Promise.all([
      admin.from('group_memberships').select('id', { count: 'exact', head: true }).eq('group_id', g.id),
      admin.from('group_roles').select('id', { count: 'exact', head: true }).eq('group_id', g.id),
      admin.from('journey_enrollments').select('id', { count: 'exact', head: true }).eq('group_id', g.id),
    ]);

    console.log(`     memberships:         ${memberships.count ?? 0}`);
    console.log(`     group_roles:         ${roles.count ?? 0}`);
    console.log(`     journey_enrollments: ${enrollments.count ?? 0}`);
    console.log(`     (user_group_roles and group_role_permissions cascade from group_roles)`);
    console.log();
  }

  // ── 5. Delete ─────────────────────────────────────────────────────────────
  console.log('🗑️   Deleting groups...\n');

  for (const g of targets) {
    const { error: delErr } = await admin
      .from('groups')
      .delete()
      .eq('id', g.id);

    if (delErr) {
      console.error(`❌  Failed to delete "${g.name}" (${g.id}): ${delErr.message}`);
    } else {
      console.log(`✅  Deleted "${g.name}" — "${g.description}"  (${g.id})`);
    }
  }

  // ── 6. Verify ─────────────────────────────────────────────────────────────
  const { data: remaining } = await admin
    .from('groups')
    .select('id, name, description')
    .eq('created_by_user_id', owner.id);

  console.log(`\n📋  Remaining groups for ${OWNER_EMAIL} (${remaining?.length ?? 0}):`);
  (remaining ?? []).forEach(g =>
    console.log(`     • "${g.name}" — "${g.description ?? '(none)'}"`)
  );
  console.log('\n✅  Done.\n');
}

main().catch(e => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
