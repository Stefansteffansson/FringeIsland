#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1];
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/database`, {
  headers: { 'Authorization': `Bearer ${accessToken}` },
}).then(r => r.json()).then(d => {
  if (d.host) {
    console.log('Host:', d.host);
    console.log('Port:', d.port);
    console.log('DB:', d.db_name || 'postgres');
    console.log('Has password:', !!d.password);
    // Save connection string to env for the direct-sql script
    const connStr = `postgresql://postgres.${projectRef}:${d.password}@${d.host}:${d.port}/${d.db_name || 'postgres'}`;
    console.log('CONNECTION_STRING:', connStr);
  } else {
    console.log('Response:', JSON.stringify(d, null, 2));
  }
}).catch(console.error);
