#!/usr/bin/env node
/**
 * Prints the target project's database host / port / name from the management
 * API (test by default; `--production` + ALLOW_PRODUCTION=1 for production —
 * the fuse names the intent even for a read, ADR-U053 §3). The connection
 * string it prints carries the database password: never paste it anywhere
 * that is committed. Registry: scripts/README.md.
 */
const { loadTarget } = require('./lib/target');

let target;
try {
  target = loadTarget({ argv: process.argv });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const projectRef = target.ref;
const accessToken = target.accessToken;

fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/database`, {
  headers: { 'Authorization': `Bearer ${accessToken}` },
}).then(r => r.json()).then(d => {
  console.log(`Target: ${target.target} (${projectRef})`);
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
