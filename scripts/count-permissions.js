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
  console.log('=== Permission Counts ===');

  const total = await query('SELECT COUNT(*) as total FROM permissions;');
  console.log('Total permissions:', total[0]?.total);

  const byCategory = await query('SELECT category, COUNT(*) as cnt FROM permissions GROUP BY category ORDER BY category;');
  console.log('\nBy category:');
  byCategory.forEach(r => console.log(`  ${r.category}: ${r.cnt}`));

  const templates = await query(`
    SELECT rt.name, COUNT(rtp.id) as cnt
    FROM role_templates rt
    LEFT JOIN role_template_permissions rtp ON rtp.role_template_id = rt.id
    GROUP BY rt.name ORDER BY rt.name;
  `);
  console.log('\nRole template permission counts:');
  templates.forEach(r => console.log(`  ${r.name}: ${r.cnt}`));

  const systemRoles = await query(`
    SELECT g.name as group_name, gr.name as role_name, COUNT(grp.id) as cnt
    FROM groups g
    JOIN group_roles gr ON gr.group_id = g.id
    LEFT JOIN group_role_permissions grp ON grp.group_role_id = gr.id
    WHERE g.group_type = 'system'
    GROUP BY g.name, gr.name ORDER BY g.name, gr.name;
  `);
  console.log('\nSystem group role permission counts:');
  systemRoles.forEach(r => console.log(`  ${r.group_name} / ${r.role_name}: ${r.cnt}`));

  const allTemplates = await query('SELECT id, name, is_system FROM role_templates ORDER BY name;');
  console.log('\nAll role templates:');
  allTemplates.forEach(r => console.log(`  ${r.name} (system=${r.is_system})`));

  // Check system groups
  const sysGroups = await query("SELECT id, name, group_type FROM groups WHERE group_type = 'system' ORDER BY name;");
  console.log('\nSystem groups:');
  sysGroups.forEach(r => console.log(`  ${r.name} (${r.id})`));

  // List all permission names
  const allPerms = await query('SELECT name, category FROM permissions ORDER BY category, name;');
  console.log('\nAll permissions:');
  allPerms.forEach(r => console.log(`  [${r.category}] ${r.name}`));
}

main().catch(console.error);
