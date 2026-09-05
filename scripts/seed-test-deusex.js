#!/usr/bin/env node
/**
 * The standing DeusEx member of the TEST project (ADR-U053 seed pre-flight, 2026-09-05).
 *
 * Production has one hand-made platform administrator (Stefan's account) whose
 * DeusEx membership is what lets every admin fixture come and go: the
 * `prevent_last_deusex_membership_removal` / `prevent_last_deusex_role_removal`
 * guards refuse to remove the LAST DeusEx member. A project built from the
 * chain has none — so the first suite that elevated and then demoted a fixture
 * admin (tier1-context-free-arm) found its demotion silently refused and the
 * teardown could not delete the fixture's personal group. This script gives the
 * test project the same standing member: `deusex@fringeisland-test.internal`, created
 * through the real sign-up path (handle_new_user makes the profile, the personal
 * group and the FringeIsland Members enrolment; consent recorded) and elevated
 * with the house idiom. Nobody signs in as it — the password is random and
 * discarded; live walks elevate their own cast. Its address is deliberately
 * OUTSIDE `@fringeisland.test`: the integration teardown sweeps every account
 * on that domain except `walk-*` and the E2E session user, and a standing
 * member must survive every run.
 *
 * Idempotent: re-running ensures the account and the elevation exist and prints
 * the census (exactly one such account). The fuse refuses production — production
 * has its own standing member and must never get a fixture-domain account.
 *
 *   node scripts/seed-test-deusex.js
 *
 * Registry: scripts/README.md.
 */
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { loadTarget } = require('./lib/target');

const EMAIL = 'deusex@fringeisland-test.internal';

async function main() {
  const target = loadTarget({ argv: process.argv });
  if (target.target !== 'test') throw new Error('The standing test DeusEx belongs to the test project only.');
  const admin = createClient(target.url, target.serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const sql = async (query) => {
    const r = await fetch(`https://api.supabase.com/v1/projects/${target.ref}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${target.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const body = await r.json();
    if (!r.ok || (body && !Array.isArray(body) && body.error)) throw new Error(JSON.stringify(body).slice(0, 400));
    return body;
  };

  console.log(`Target: ${target.target} (${target.ref})`);

  // 1. the account, through the real sign-up path (consent-gated, ADR-U038 S3)
  const existing = (await sql(`select id::text from auth.users where email = '${EMAIL}'`))[0];
  let authUserId = existing ? existing.id : null;
  if (!authUserId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: crypto.randomBytes(24).toString('base64url'),
      email_confirm: true,
      user_metadata: { display_name: 'DeusEx', consent_accepted: 'true' },
    });
    if (error) throw new Error(`createUser: ${error.message}`);
    authUserId = data.user.id;
    console.log('created', EMAIL);
  } else {
    console.log('exists', EMAIL);
  }

  // 2. the elevation (the house idiom — the same SQL the suites use)
  const profile = (await sql(`select personal_group_id::text from public.users where auth_user_id = '${authUserId}'`))[0];
  if (!profile) throw new Error('profile row not materialised — handle_new_user did not run?');
  await sql(`
    DO $$
    DECLARE v_deusex uuid; v_role uuid;
    BEGIN
      SELECT id INTO v_deusex FROM public.groups WHERE name = 'DeusEx' AND group_type = 'system';
      SELECT id INTO v_role FROM public.group_roles WHERE group_id = v_deusex AND name = 'DeusEx';
      INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
        VALUES (v_deusex, '${profile.personal_group_id}', v_deusex, 'active')
        ON CONFLICT (group_id, member_group_id) DO UPDATE SET status = 'active';
      INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
        VALUES ('${profile.personal_group_id}', v_deusex, v_role, v_deusex)
        ON CONFLICT DO NOTHING;
    END $$;`);

  // 3. the census
  const census = (await sql(`
    select (select count(*)::int from auth.users where email = '${EMAIL}') as accounts,
           (select count(*)::int from public.group_memberships m join public.groups g on g.id = m.group_id
             where g.name = 'DeusEx' and g.group_type = 'system' and m.status = 'active') as deusex_members`))[0];
  console.log(`census: ${EMAIL} accounts=${census.accounts} (expect 1) · active DeusEx members=${census.deusex_members}`);
  if (census.accounts !== 1) { console.error('census failed'); process.exitCode = 1; }
}

main().catch((e) => { console.error('seed-test-deusex:', e.message); process.exitCode = 1; });
