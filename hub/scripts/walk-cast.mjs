#!/usr/bin/env node
/**
 * The standing walk cast — created and torn down by ONE script, so a live walk
 * never leaves hand-made accounts behind (Stefan, 2026-09-04: "we do NOT want
 * any test accounts to be left overs from testing … this needs to STOP").
 *
 * USAGE (from hub/):
 *   npm run walk:cast -- create              # five accounts + three groups; prints the password once
 *   npm run walk:cast -- create --password X # your own password
 *   npm run walk:cast -- teardown            # everything the cast made, in the house order, then a census
 *   npm run walk:cast -- census              # read-only: what of the cast exists right now
 *
 * THE CAST (the 2026-08-18 shape, walk-*@fringeisland.test):
 *   Bert   — Steward of Harbour (public)      Mona  — member of Harbour
 *   Astrid — Steward of Riverside and Drift   Wanda — member of Riverside and Drift
 *   Kalle  — member of Riverside
 * Walk-specific extras (the Hat roles, Herald, Riverside as a member-group of
 * Harbour) are the walk's to add through the UI, not this script's.
 *
 * WHY THE HOUSE ORDER MATTERS ON TEARDOWN: journeys RESTRICT their owning group;
 * consent records RESTRICT the personal group AND the user, so a bare
 * `auth.admin.deleteUser` is refused (the 180-probe leak of 2026-09-02/03).
 * Teardown runs one transaction through the management API — the integration
 * teardown's own path — and then CENSUSES; a survivor fails the run.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
 * SUPABASE_ACCESS_TOKEN in hub/.env.local. Touches only walk-* accounts and
 * what they own.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import target from '../../scripts/lib/target.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.resolve(here, '..', '.env.local'), 'utf8');
const g = (k) => (env.match(new RegExp(`^${k}\\s*=\\s*(\\S+)`, 'm')) || [])[1];
const url = g('NEXT_PUBLIC_SUPABASE_URL');
const secret = g('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = g('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const accessToken = g('SUPABASE_ACCESS_TOKEN');
const projectRef = url?.match(/https:\/\/([^.]+)\./)?.[1];
// ADR-U053 §3 — the fuse: the walk cast lives on the test project only.
target.assertNotProduction(url, process.env);
if (!url || !secret || !anonKey || !accessToken || !projectRef) {
  console.error('hub/.env.local must carry NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}
const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });

async function adminSql(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!r.ok) throw new Error(`management API ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

const CAST = [
  { key: 'wanda', name: 'Wanda' },
  { key: 'bert', name: 'Bert' },
  { key: 'mona', name: 'Mona' },
  { key: 'astrid', name: 'Astrid' },
  { key: 'kalle', name: 'Kalle' },
];
const GROUPS = [
  { name: 'Harbour', steward: 'bert', members: ['mona'], isPublic: true },
  { name: 'Riverside', steward: 'astrid', members: ['wanda', 'kalle'], isPublic: false },
  { name: 'Drift', steward: 'astrid', members: ['wanda'], isPublic: false },
];
const emailOf = (key) => `walk-${key}@fringeisland.test`;

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const pick = (n) => Array.from(crypto.randomBytes(n)).map((b) => alphabet[b % alphabet.length]).join('');

async function census() {
  const rows = await adminSql(`
    SELECT
      (SELECT count(*) FROM auth.users WHERE email LIKE 'walk-%') AS accounts,
      (SELECT count(*) FROM public.groups g WHERE g.group_type = 'engagement'
         AND (g.created_by_group_id IN (SELECT personal_group_id FROM public.users WHERE email LIKE 'walk-%')
              OR EXISTS (SELECT 1 FROM public.group_memberships gm JOIN public.users u ON u.personal_group_id = gm.member_group_id
                          WHERE gm.group_id = g.id AND u.email LIKE 'walk-%'))) AS groups,
      (SELECT count(*) FROM public.groups g WHERE g.group_type = 'personal'
         AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.personal_group_id = g.id)) AS orphan_personal_groups;`);
  return rows[0];
}

async function waitForUserRow(authId) {
  for (let i = 0; i < 20; i++) {
    const { data } = await admin.from('users').select('id,personal_group_id').eq('auth_user_id', authId).maybeSingle();
    if (data?.personal_group_id) return data;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`personal group never materialised for ${authId}`);
}

async function create(password) {
  const before = await census();
  if (Number(before.accounts) > 0) {
    console.error(`refusing: ${before.accounts} walk-* account(s) already exist — run teardown first`);
    process.exit(1);
  }
  const { data: onboarding } = await admin.from('journeys').select('id').eq('is_onboarding_designated', true).maybeSingle();
  const pg = {};
  for (const c of CAST) {
    const { data, error } = await admin.auth.admin.createUser({
      email: emailOf(c.key),
      password,
      email_confirm: true,
      user_metadata: { display_name: c.name, consent_accepted: 'true' },
    });
    if (error) throw new Error(`create ${c.name}: ${error.message}`);
    const row = await waitForUserRow(data.user.id);
    pg[c.key] = row.personal_group_id;
    if (onboarding?.id) {
      // The arrival latch (the E2E helper's markArrivedOnce shape): an active own walk on the onboarding journey.
      await admin.from('journey_enrollments').insert({
        journey_id: onboarding.id, group_id: row.personal_group_id, enrolled_by_group_id: row.personal_group_id, status: 'active',
      });
    }
    console.log(`ok   ${emailOf(c.key)} (${c.name})`);
  }
  for (const grp of GROUPS) {
    // The group is created THROUGH THE CONTRACT as its Steward (the creator gets the Steward role).
    const stew = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: signInErr } = await stew.auth.signInWithPassword({ email: emailOf(grp.steward), password });
    if (signInErr) throw new Error(`sign in ${grp.steward}: ${signInErr.message}`);
    const { data: groupId, error } = await stew.rpc('create_engagement_group', { p_name: grp.name });
    if (error) throw new Error(`create group ${grp.name}: ${error.message}`);
    await stew.auth.signOut({ scope: 'local' });
    if (grp.isPublic) await admin.from('groups').update({ is_public: true }).eq('id', groupId);
    for (const m of grp.members) {
      const { error: mErr } = await admin.from('group_memberships').insert({
        group_id: groupId, member_group_id: pg[m], added_by_group_id: pg[grp.steward], status: 'active',
      });
      if (mErr) throw new Error(`membership ${grp.name}/${m}: ${mErr.message}`);
    }
    console.log(`ok   group ${grp.name} (Steward ${grp.steward}; members ${grp.members.join(', ') || 'none'}; ${grp.isPublic ? 'public' : 'private'})`);
  }
  const after = await census();
  console.log('');
  console.log(`cast created: ${after.accounts} accounts, ${after.groups} groups`);
  console.log(`PASSWORD ${password}`);
}

async function teardown() {
  await adminSql(`
    DO $$
    DECLARE v_auth uuid[]; v_pgs uuid[]; v_groups uuid[]; v_all uuid[]; v_user_ids uuid[];
    BEGIN
      PERFORM set_config('app.consent_erasure_in_progress','true',true);
      SELECT array_agg(u.auth_user_id), array_agg(u.personal_group_id), array_agg(u.id)
        INTO v_auth, v_pgs, v_user_ids FROM public.users u WHERE u.email LIKE 'walk-%';
      IF v_auth IS NULL THEN RETURN; END IF;
      SELECT array_agg(g.id) INTO v_groups FROM public.groups g
       WHERE g.group_type = 'engagement'
         AND (g.created_by_group_id = ANY(v_pgs)
              OR EXISTS (SELECT 1 FROM public.group_memberships gm WHERE gm.group_id = g.id AND gm.member_group_id = ANY(v_pgs)));
      v_all := v_pgs || COALESCE(v_groups, ARRAY[]::uuid[]);

      DELETE FROM public.journey_step_instances i USING public.journey_enrollments e WHERE i.enrollment_id = e.id AND e.group_id = ANY(v_all);
      DELETE FROM public.journey_enrollments e WHERE e.group_id = ANY(v_all);
      DELETE FROM public.journeys j WHERE j.created_by_group_id = ANY(v_all);
      DELETE FROM public.consent_records cr WHERE cr.subject_group_id = ANY(v_all) OR cr.subject_user_id = ANY(v_user_ids);
      DELETE FROM public.announcements a WHERE a.scope_group_id = ANY(v_all) OR a.author_group_id = ANY(v_all);
      DELETE FROM public.admin_audit_log a WHERE a.actor_group_id = ANY(v_all)
         OR a.target = ANY(SELECT unnest(v_all)::text) OR a.target = ANY(SELECT unnest(v_user_ids)::text);
      DELETE FROM public.telemetry_events t WHERE t.actor_group_id = ANY(v_all);
      DELETE FROM public.notifications n WHERE n.recipient_group_id = ANY(v_all) OR n.group_id = ANY(v_all);
      DELETE FROM auth.users a WHERE a.id = ANY(v_auth);
      DELETE FROM public.groups g WHERE g.id = ANY(COALESCE(v_groups, ARRAY[]::uuid[]));
      DELETE FROM public.groups g WHERE g.group_type = 'personal' AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.personal_group_id = g.id);
    END $$;`);
  const after = await census();
  const clean = Number(after.accounts) === 0 && Number(after.groups) === 0 && Number(after.orphan_personal_groups) === 0;
  console.log(`teardown: ${clean ? 'clean' : 'FAILED'} — accounts=${after.accounts} groups=${after.groups} orphan_personal_groups=${after.orphan_personal_groups}`);
  if (!clean) process.exit(1);
}

const cmd = process.argv[2];
const pwArg = process.argv.indexOf('--password');
const password = pwArg > -1 ? process.argv[pwArg + 1] : `${pick(4)}-${pick(4)}-${pick(4)}!`;
if (cmd === 'create') await create(password);
else if (cmd === 'teardown') await teardown();
else if (cmd === 'census') console.log(await census());
else { console.error('usage: walk-cast.mjs create [--password X] | teardown | census'); process.exit(1); }
