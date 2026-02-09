const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('🧹 Cleaning up test users...\n');

  // Get all users with test emails
  const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    return;
  }

  // Filter test users (emails containing 'test' or 'fringeisland.test')
  const testUsers = users.filter(user =>
    user.email && (
      user.email.includes('test-') ||
      user.email.includes('@fringeisland.test') ||
      user.email.includes('@test.com') ||
      user.email.includes('@example.com')
    )
  );

  console.log(`Found ${testUsers.length} test users to delete:\n`);

  testUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email} (${user.id})`);
  });

  console.log('\n⚠️  WARNING: This will permanently delete these users!');
  console.log('Press Ctrl+C to cancel or wait 5 seconds to proceed...\n');

  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('Deleting users and related data...\n');

  let deleted = 0;
  let failed = 0;

  for (const user of testUsers) {
    try {
      // Get the user's profile ID
      const { data: profile } = await adminClient
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (profile) {
        console.log(`🔍 Cleaning up data for ${user.email}...`);

        // Delete user_group_roles (role assignments)
        const { error: rolesError } = await adminClient
          .from('user_group_roles')
          .delete()
          .eq('user_id', profile.id);

        if (rolesError) {
          console.log(`  ⚠️  Warning: Could not delete roles: ${rolesError.message}`);
        }

        // Delete group_memberships
        const { error: membershipsError } = await adminClient
          .from('group_memberships')
          .delete()
          .eq('user_id', profile.id);

        if (membershipsError) {
          console.log(`  ⚠️  Warning: Could not delete memberships: ${membershipsError.message}`);
        }

        // Delete journey_enrollments
        const { error: enrollmentsError } = await adminClient
          .from('journey_enrollments')
          .delete()
          .eq('user_id', profile.id);

        if (enrollmentsError) {
          console.log(`  ⚠️  Warning: Could not delete enrollments: ${enrollmentsError.message}`);
        }

        // Delete groups created by this user
        const { error: groupsError } = await adminClient
          .from('groups')
          .delete()
          .eq('created_by_user_id', profile.id);

        if (groupsError) {
          console.log(`  ⚠️  Warning: Could not delete groups: ${groupsError.message}`);
        }
      }

      // Finally, delete the auth user (this will cascade to users table via trigger)
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

      if (deleteError) {
        console.error(`❌ Failed to delete ${user.email}: ${deleteError.message}`);
        failed++;
      } else {
        console.log(`✅ Deleted ${user.email} and all related data`);
        deleted++;
      }
    } catch (err) {
      console.error(`❌ Error deleting ${user.email}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Deleted: ${deleted}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total: ${testUsers.length}`);
  console.log('\n✅ Cleanup complete!');
})();
