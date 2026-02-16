#!/usr/bin/env node
/**
 * Query: Find active members with no roles assigned
 * 
 * Usage:
 *   node scripts/query-members-no-roles.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

(async () => {
  try {
    console.log('🔍 Querying active members with no roles assigned...\n');

    // Get all active members with their group info
    const { data, error } = await admin
      .from('group_memberships')
      .select(`
        user_id,
        group_id,
        users!group_memberships_user_id_fkey(id, full_name),
        groups!group_memberships_group_id_fkey(id, name, group_type)
      `)
      .eq('status', 'active');

    if (error) {
      console.error('❌ Query error:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('✅ No active members found.');
      process.exit(0);
    }

    console.log(`Found ${data.length} active members total.\n`);

    // Now, for each member, check if they have roles
    const membersWithoutRoles = [];

    for (const member of data) {
      const { data: roles, error: rolesError } = await admin
        .from('user_group_roles')
        .select('id')
        .eq('user_id', member.user_id)
        .eq('group_id', member.group_id);

      if (rolesError) {
        console.error(`❌ Error checking roles for user ${member.user_id}:`, rolesError);
        continue;
      }

      if (!roles || roles.length === 0) {
        membersWithoutRoles.push({
          user_id: member.user_id,
          group_id: member.group_id,
          full_name: member.users?.full_name || 'Unknown',
          group_name: member.groups?.name || 'Unknown',
          group_type: member.groups?.group_type || 'Unknown',
        });
      }
    }

    console.log(`📊 Results: ${membersWithoutRoles.length} active members with NO roles assigned\n`);

    if (membersWithoutRoles.length > 0) {
      console.table(membersWithoutRoles);
      console.log('\nDetailed output:');
      membersWithoutRoles.forEach(m => {
        console.log(`  - ${m.full_name} (${m.user_id}) in group "${m.group_name}" (${m.group_id}) [type: ${m.group_type}]`);
      });
    } else {
      console.log('✅ All active members have at least one role assigned.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
})();
