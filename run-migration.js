// Temporary script to run the journey enrollment RLS migration
// This script will be deleted after running

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Supabase credentials not found in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🚀 Running journey enrollment RLS migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260131_journey_enrollment_rls.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split into individual statements (separated by semicolons)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comment-only statements
      if (statement.trim().startsWith('--')) continue;

      console.log(`[${i + 1}/${statements.length}] Executing statement...`);

      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try direct execution if RPC fails
        const { error: directError } = await supabase.from('_').select('*').limit(0);

        // For Supabase, we need to use the REST API or dashboard
        // Let's try a different approach
        console.log('⚠️  Cannot execute via client. Need to use Supabase Dashboard.\n');
        throw new Error('Client-side SQL execution not available. Please use Supabase Dashboard.');
      }

      console.log(`✅ Statement ${i + 1} executed successfully\n`);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('Next steps:');
    console.log('  1. Test individual enrollment');
    console.log('  2. Test group enrollment (as Group Leader)');
    console.log('  3. Check /my-journeys page\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.log('\n📋 Manual Migration Instructions:');
    console.log('  1. Go to https://supabase.com/dashboard');
    console.log('  2. Select your project: FringeIsland');
    console.log('  3. Navigate to: SQL Editor');
    console.log('  4. Copy the contents of: supabase/migrations/20260131_journey_enrollment_rls.sql');
    console.log('  5. Paste into SQL Editor and click "Run"\n');
    process.exit(1);
  }
}

runMigration();
