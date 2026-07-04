// One-off dev-DB seeding: five clean FIMs for manual testing.
// Mirrors the E2E createFim path: admin createUser with email_confirm +
// consent metadata (the ADR-U038 S3 gate), then handle_new_user materialises
// profile + personal group + FringeIsland Members enrolment.
require('dotenv').config({ path: 'D:/WebDev/GitHub/FringeIsland/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const PASSWORD = 'fringe123';
const MEMBERS = [
  { email: 'alice@fringe.test', name: 'Alice' },
  { email: 'bob@fringe.test', name: 'Bob' },
  { email: 'carol@fringe.test', name: 'Carol' },
  { email: 'dave@fringe.test', name: 'Dave' },
  { email: 'erin@fringe.test', name: 'Erin' },
];

async function waitForPersonalGroup(authUserId) {
  for (let i = 0; i < 20; i++) {
    const { data } = await admin
      .from('users')
      .select('personal_group_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (data?.personal_group_id) return data.personal_group_id;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

(async () => {
  for (const m of MEMBERS) {
    const { data: existing } = await admin
      .from('users')
      .select('id, personal_group_id')
      .eq('email', m.email)
      .maybeSingle();
    if (existing) {
      console.log(`= ${m.email} already exists (personal group ${existing.personal_group_id})`);
      continue;
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: m.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: m.name, consent_accepted: 'true' },
    });
    if (error) {
      console.log(`! ${m.email} FAILED: ${error.message}`);
      continue;
    }
    const pg = await waitForPersonalGroup(data.user.id);
    console.log(pg ? `+ ${m.email} created (${m.name}, personal group ${pg})` : `! ${m.email} created but personal group never materialised`);
  }
})();
