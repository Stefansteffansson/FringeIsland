#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1];
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

async function query(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return r.json();
}

async function main() {
  const tables = ['users', 'groups', 'group_memberships', 'user_group_roles', 'journey_enrollments', 'direct_messages'];
  for (const t of tables) {
    const d = await query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${t}' ORDER BY ordinal_position;`);
    console.log(`${t}: ${d.map(r => r.column_name).join(', ')}`);
  }
}
main().catch(console.error);
