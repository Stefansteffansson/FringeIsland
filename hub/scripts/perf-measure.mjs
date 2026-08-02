/**
 * A-NTF gate measurement — ADR-U043 (+ Amendment 1).
 *
 * Measures the AUTHENTICATED REAL PATH end-to-end, not a proxy:
 * an unauthenticated 200 on /groups only proves the static shell rendered.
 * "Usable content" here = a data-derived selector is visible, which can only
 * happen after the API round-trip completes.
 *
 * Scenarios:
 *   B1  sign-in click -> primary content painted      (target 2.0s, ceiling 2.5s)
 *   B2  cold authenticated navigation, first of session (<= 2.5s, target 2.0s)
 *   B3  warm navigation, >= 3 runs                     (<= 1.0s)
 *
 * Pages: /groups (N-C's owed before/after) and /notifications/preferences (N-D's owed).
 *
 * Usage:
 *   node antf-perf-measure.mjs cold    # run ONCE, after >=20 min enforced zero traffic
 *   node antf-perf-measure.mjs warm    # run immediately after cold
 *   node antf-perf-measure.mjs setup   # provision the measurement FIM only
 *   node antf-perf-measure.mjs teardown
 */
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.E2E_BASE_URL ?? 'https://fringe-island.vercel.app';
// Results land next to the script unless PERF_OUT overrides. Append-only JSONL,
// one row per measured navigation.
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.PERF_OUT ?? join(HERE, 'perf-results.jsonl');

// --- env from hub/.env.local -------------------------------------------------
const envPath = process.env.PERF_ENV ?? join(HERE, '..', '.env.local');
// NB: .env.local is CRLF. In JS regex `\r` is a line terminator, so `.` will not
// match it and `$` will not match before it — splitting on /\r?\n/ is required,
// or every line except the last (which has no trailing newline) silently fails.
for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

// Single-token display name: surfaces render nickname = first token, and a
// multi-token name has previously broken fixture assertions.
const EMAIL = 'perf-antf@fringeisland.test';
const PASSWORD = 'perf-antf-password-123';
const NAME = 'Perfwalker';

const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

const sql = async (query) => {
  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\./)[1];
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const b = await r.json();
  if (!r.ok || b?.error) throw new Error(`sql failed: ${JSON.stringify(b)}`);
  return b;
};

// The auth-admin ES256 transient (TASK-INT-01) is vendor-confirmed and
// unrelated to any diff — retry rather than treat it as a failure.
const isTransient = (m = '') =>
  /unrecognized JWT|ES256|kid <nil>|fetch failed|503|502|timeout/i.test(m);

async function withRetry(fn, label, tries = 5) {
  let last;
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isTransient(e.message)) throw e;
      console.log(`  ! ${label} transient (${i}/${tries}): ${e.message.slice(0, 70)}`);
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  throw last;
}

async function teardown() {
  const a = admin();
  const { data: p } = await a
    .from('users')
    .select('auth_user_id, personal_group_id')
    .eq('email', EMAIL)
    .maybeSingle();
  if (p?.personal_group_id) {
    const pg = p.personal_group_id;
    await sql(
      `DO $$ BEGIN PERFORM set_config('app.consent_erasure_in_progress','true',true); ` +
        `DELETE FROM public.consent_records WHERE subject_group_id = '${pg}'; END $$;`,
    ).catch(() => {});
    // The fixture's own engagement groups, created in setup. Membership and role
    // rows hang off these, so clear them via SQL cascade rather than the JS client.
    await sql(
      `DELETE FROM public.groups WHERE created_by_group_id = '${pg}' AND id <> '${pg}';`,
    ).catch((e) => console.log('  ! group cleanup: ' + e.message.slice(0, 90)));
    await a.from('journey_enrollments').delete().eq('group_id', pg);
    await a.from('journeys').delete().eq('created_by_group_id', pg);
    await a.from('groups').delete().eq('id', pg);
  }
  if (p?.auth_user_id) await a.auth.admin.deleteUser(p.auth_user_id);
  console.log('teardown: done');
}

async function setup() {
  await teardown().catch(() => {});
  const a = admin();
  const { data, error } = await withRetry(
    async () => {
      const r = await a.auth.admin.createUser({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        // consent_accepted is REQUIRED: a credentialed FIM signup is consent-gated
        // at the substrate (handle_new_user, ADR-U038 S3). Omitting it fails with
        // an opaque "Database error creating new user". Key is display_name, not
        // full_name. Mirrors tests/helpers/supabase.ts createTestUser.
        user_metadata: { display_name: NAME, consent_accepted: 'true' },
      });
      if (r.error) throw new Error(r.error.message);
      return r;
    },
    'createUser',
  );
  if (error) throw error;
  const authId = data.user.id;

  // Wait for the profile trigger to materialise public.users + personal group.
  let profile = null;
  for (let i = 0; i < 20 && !profile?.personal_group_id; i++) {
    const { data: p } = await a
      .from('users')
      .select('personal_group_id')
      .eq('auth_user_id', authId)
      .maybeSingle();
    profile = p;
    if (!profile?.personal_group_id) await new Promise((r) => setTimeout(r, 500));
  }
  if (!profile?.personal_group_id) throw new Error('profile/personal group never materialised');

  // CRITICAL: without this the first /groups landing auto-launches onboarding
  // (correct product behaviour) and yanks the page into the journey player,
  // which would measure the wrong thing entirely.
  const { data: onboarding } = await a
    .from('journeys')
    .select('id')
    .eq('is_onboarding_designated', true)
    .maybeSingle();
  if (onboarding?.id) {
    await a.from('journey_enrollments').insert({
      journey_id: onboarding.id,
      group_id: profile.personal_group_id,
      enrolled_by_group_id: profile.personal_group_id,
      status: 'active',
    });
  }
  // /groups renders data-testid="groups-list" ONLY when the FIM has >= 1 group;
  // with none it renders EmptyState instead. A fresh FIM therefore measures the
  // empty state, which is not the path N-C changed. Give the fixture its OWN
  // groups (not Stefan's) so the page is representative and teardown is clean.
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error: signInErr } = await anon.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signInErr) throw new Error(`fixture sign-in failed: ${signInErr.message}`);
  for (const n of ['Perf Alpha', 'Perf Beta', 'Perf Gamma']) {
    const { error } = await anon.rpc('create_engagement_group', { p_name: n });
    if (error) throw new Error(`create_engagement_group(${n}): ${error.message}`);
  }
  console.log(`setup: ${EMAIL} ready (personal group ${profile.personal_group_id}, 3 groups)`);
  return profile.personal_group_id;
}

/** Instrument one navigation: wall time to a data-derived selector + API waterfall. */
async function measureNav(page, path, selector, label, phase) {
  // ResourceTiming.responseEnd came back 0 for these responses, so it is not a
  // usable source here. Stamp the times ourselves — a wrong duration is worse
  // than no duration, and "slowest 0 ms" is a wrong duration that looks real.
  const reqs = [];
  const started = new Map();
  const firstReqAt = { t: 0 };
  const isTracked = (u) => u.includes('/api/') || u.includes('supabase.co');
  const onStart = (req) => {
    if (!isTracked(req.url())) return;
    const now = Date.now();
    if (!firstReqAt.t) firstReqAt.t = now;
    started.set(req, now);
  };
  const onDone = (res) => {
    const req = res.request();
    if (!isTracked(req.url())) return;
    const t0 = started.get(req);
    reqs.push({
      url: req.url().replace(BASE, '').slice(0, 70),
      ms: t0 ? Date.now() - t0 : -1,
    });
  };
  page.on('request', onStart);
  page.on('response', onDone);

  const t0 = Date.now();
  await page.goto(BASE + path, { waitUntil: 'commit' });
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 30000 });
  const ms = Date.now() - t0;

  page.off('request', onStart);
  page.off('response', onDone);
  const valid = reqs.filter((r) => r.ms >= 0);
  const maxReq = valid.length ? Math.max(...valid.map((r) => r.ms)) : 0;
  // THE decisive split. The 2026-07-10 post-migration baseline decomposed cold
  // time as: client boot before the fan-out fires (2 342 ms) + slowest request
  // (1 612 ms) ~= 3.9 s. Without fanOutAt you cannot tell which term grew.
  const fanOutAt = firstReqAt.t ? firstReqAt.t - t0 : -1;
  const row = { phase, label, path, ms, apiReads: reqs.length, maxReqMs: maxReq, fanOutAt };
  console.log(
    `  ${phase.toUpperCase().padEnd(5)} ${label.padEnd(34)} ${String(ms).padStart(6)} ms   ` +
      `(fan-out fires @ ${fanOutAt} ms · ${reqs.length} api reads · slowest ${maxReq} ms · ` +
      `unaccounted ${ms - fanOutAt - maxReq} ms)`,
  );
  appendFileSync(OUT, JSON.stringify({ ...row, at: new Date().toISOString() }) + '\n');
  return row;
}

/** A timeout that just says "selector not visible" costs another 20-minute idle
 *  window to diagnose. Dump enough to explain itself the first time. */
async function diagnose(page, where) {
  try {
    console.log(`\n  !! FAILED at ${where}`);
    console.log(`     url : ${page.url()}`);
    const text = (await page.locator('body').innerText().catch(() => '')) || '';
    console.log(`     text: ${text.replace(/\s+/g, ' ').slice(0, 220)}`);
  } catch (e) {
    console.log(`     (diagnose failed: ${e.message.slice(0, 60)})`);
  }
}

async function run(phase) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const results = [];

  try {
    if (phase === 'cold') {
      // B1 — sign-in click -> primary content. This is the FIRST hit; it carries
      // the deep-cold penalty for the whole stack.
      await page.goto(BASE + '/login', { waitUntil: 'commit' });
      await page.locator('#password').waitFor({ state: 'visible', timeout: 30000 });
      await page.locator('#email').fill(EMAIL);
      await page.locator('#password').fill(PASSWORD);
      const t0 = Date.now();
      await page.locator('button[type="submit"]').click();
      await page.locator('[data-testid="groups-list"]').first().waitFor({ state: 'visible', timeout: 45000 });
      const b1 = Date.now() - t0;
      console.log(`  COLD  ${'B1 sign-in -> content'.padEnd(34)} ${String(b1).padStart(6)} ms`);
      appendFileSync(OUT, JSON.stringify({ phase: 'cold', label: 'B1 sign-in -> content', ms: b1, at: new Date().toISOString() }) + '\n');
      results.push({ phase: 'cold', label: 'B1 sign-in -> content', ms: b1 });

      // B2 — first-of-session navigation to the new N-D page.
      results.push(await measureNav(page, '/notifications/preferences', '[data-testid^="pref-toggle-"]', 'B2 /notifications/preferences', 'cold'));
    } else {
      // warm: sign in first (not measured), then repeat navigations
      await page.goto(BASE + '/login', { waitUntil: 'commit' });
      await page.locator('#password').waitFor({ state: 'visible', timeout: 30000 });
      await page.locator('#email').fill(EMAIL);
      await page.locator('#password').fill(PASSWORD);
      await page.locator('button[type="submit"]').click();
      await page.locator('[data-testid="groups-list"]').first().waitFor({ state: 'visible', timeout: 45000 });

      for (let i = 1; i <= 3; i++) {
        results.push(await measureNav(page, '/groups', '[data-testid="groups-list"]', `B3 /groups run ${i}`, 'warm'));
      }
      for (let i = 1; i <= 3; i++) {
        results.push(await measureNav(page, '/notifications/preferences', '[data-testid^="pref-toggle-"]', `B3 /notifications/preferences run ${i}`, 'warm'));
      }
    }
  } catch (e) {
    await diagnose(page, phase);
    throw e;
  } finally {
    await browser.close();
  }
  return results;
}

// FIXED 2026-07-28 (A-NTF gate). This read:
//   const STATE = OUT.replace('antf-perf-results.jsonl', 'antf-perf-state.json');
// The script was renamed from `antf-perf-measure.mjs` and its results file lost
// the `antf-` prefix, so that replace matched NOTHING and silently returned OUT
// unchanged — making STATE and OUT the same file. `signin` wrote the Playwright
// storage state there, then the first `measureNav` appended a JSONL result row
// to it, and every later context creation died on
// "Unexpected non-whitespace character after JSON".
//
// It survived because the multi-nav phases build their context ONCE per process,
// so the corruption only bites the NEXT invocation — i.e. exactly when you are
// re-measuring, which is when a deep-cold run has already spent its idle window.
// Derive it independently rather than by string surgery on a sibling path.
const STATE = process.env.PERF_STATE ?? join(HERE, 'perf-state.json');

/**
 * B2 is "cold authenticated navigation — idle functions, first page of a
 * session". Signing in immediately before navigating DEFEATS that: the sign-in
 * itself warms every function, so the navigation that follows is warm no matter
 * how long you idled beforehand. The first run made exactly that mistake.
 *
 * Correct protocol, in two parts:
 *   signin   -> authenticate and persist the session (warms things; not measured)
 *   <idle >= 20 min, functions go cold, session cookie survives>
 *   coldnav  -> restore the session; the FIRST authenticated navigation is cold
 */
async function signin() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/login', { waitUntil: 'commit' });
  await page.locator('#password').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#email').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.locator('[data-testid="groups-list"]').first().waitFor({ state: 'visible', timeout: 45000 });
  await ctx.storageState({ path: STATE });
  await browser.close();
  console.log(`signin: session persisted -> ${STATE}`);
}

/** Same protocol, /groups first — N-C's owed number needs /groups to carry the
 *  cold penalty, and in coldnav() it is always second-of-session (semi-warm). */
async function coldnavGroups() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: STATE });
  const page = await ctx.newPage();
  try {
    return [
      await measureNav(page, '/groups', '[data-testid="groups-list"]', 'B2 /groups (COLD nav)', 'coldnav-groups'),
      await measureNav(page, '/notifications/preferences', '[data-testid^="pref-toggle-"]', 'B2 /notifications/preferences (semi-warm, 2nd)', 'coldnav-groups'),
    ];
  } catch (e) {
    await diagnose(page, 'coldnav-groups');
    throw e;
  } finally {
    await browser.close();
  }
}

async function coldnav() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: STATE });
  const page = await ctx.newPage();
  const out = [];
  try {
    // Order matters: whichever page goes first carries the true cold penalty.
    // /notifications/preferences is N-D's owed number, so it goes first.
    out.push(await measureNav(page, '/notifications/preferences', '[data-testid^="pref-toggle-"]', 'B2 /notifications/preferences (COLD nav)', 'coldnav'));
    out.push(await measureNav(page, '/groups', '[data-testid="groups-list"]', 'B2 /groups (semi-warm, 2nd of session)', 'coldnav'));
  } catch (e) {
    await diagnose(page, 'coldnav');
    throw e;
  } finally {
    await browser.close();
  }
  return out;
}

const cmd = process.argv[2];
if (cmd === 'setup') await setup();
else if (cmd === 'teardown') await teardown();
else if (cmd === 'signin') await signin();
else if (cmd === 'waterfall') {
  // A cold FAIL needs a diagnosis, not just a number. The waterfall SHAPE
  // (concurrent vs serialized) is the same warm as cold — cold only multiplies
  // each leg — so the shape can be characterised without another idle window.
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: STATE });
  const page = await ctx.newPage();
  const rows = [];
  const t0map = new Map();
  const navStart = { t: 0 };
  const track = (u) => u.includes('/api/') || u.includes('supabase.co');
  page.on('request', (r) => { if (track(r.url())) t0map.set(r, Date.now()); });
  page.on('response', (res) => {
    const r = res.request();
    if (!track(r.url())) return;
    const s = t0map.get(r);
    rows.push({
      url: r.url().replace(BASE, '').replace(/https:\/\/[a-z0-9]+\.supabase\.co/, 'SUPABASE').slice(0, 62),
      startAt: s ? s - navStart.t : -1,
      ms: s ? Date.now() - s : -1,
    });
  });
  // Generalised 2026-07-28 (A-NTF gate): was hardcoded to the preferences page.
  // Attributing a slow leg needs the per-request breakdown on WHICHEVER page is
  // hugging its ceiling — /groups turned out to be the worse of the two, and it
  // could not be inspected at all while this only knew one path.
  const wfPath = process.argv[3] ?? '/notifications/preferences';
  const wfSel = process.argv[4] ?? '[data-testid^="pref-toggle-"]';
  navStart.t = Date.now();
  await page.goto(BASE + wfPath, { waitUntil: 'commit' });
  await page.locator(wfSel).first().waitFor({ state: 'visible', timeout: 30000 });
  const wall = Date.now() - navStart.t;
  await browser.close();
  rows.sort((a, b) => a.startAt - b.startAt);
  console.log(`\n== ${wfPath} WARM waterfall — wall ${wall} ms ==`);
  console.log('  start@   dur   request');
  for (const r of rows) console.log(`  ${String(r.startAt).padStart(5)}  ${String(r.ms).padStart(5)}   ${r.url}`);
  const overlap = rows.length > 1 && rows.some((r, i) => i > 0 && r.startAt < rows[i - 1].startAt + rows[i - 1].ms - 20);
  console.log(`\n  concurrency: ${overlap ? 'OVERLAPPING (fan-out)' : 'SERIALIZED (waterfall) — each read waits for the previous'}`);
}
else if (cmd === 'breakdown') {
  // ADM warm investigation 2026-08-02: the detail pages' fresh-context walls are
  // NOT read-dominated (2 reads, slowest ~300 ms warm), so the waterfall's
  // api-only lens cannot attribute them. Track EVERY request Playwright sees,
  // stamped locally (ResourceTiming responseEnd is 0 here — see measureNav),
  // and mark the segments of a fresh-context load: document · bundle download ·
  // boot gap (last pre-fan-out js end -> fan-out) · reads · render tail
  // (last read end -> selector visible).
  const bdPath = process.argv[3];
  const bdSel = process.argv[4];
  if (!bdPath || !bdSel) {
    console.log("usage: breakdown <path> '<selector>'");
  } else {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: STATE });
    const page = await ctx.newPage();
    const events = [];
    const started = new Map();
    const nav = { t: 0 };
    const isApi = (u) => u.includes('/api/') || u.includes('supabase.co');
    const classify = (req) => {
      if (isApi(req.url())) return 'api';
      const rt = req.resourceType();
      if (rt === 'document') return 'doc';
      if (rt === 'script') return 'js';
      if (rt === 'stylesheet') return 'css';
      if (rt === 'font') return 'font';
      return rt === 'image' ? 'img' : 'other';
    };
    page.on('request', (r) => started.set(r, Date.now()));
    const finish = (r, failed) => {
      const s = started.get(r);
      if (!s) return;
      events.push({
        kind: classify(r),
        url: r.url().replace(BASE, '').replace(/https:\/\/[a-z0-9]+\.supabase\.co/, 'SUPABASE').slice(0, 80),
        startAt: s - nav.t,
        ms: Date.now() - s,
        failed: failed || undefined,
      });
    };
    page.on('requestfinished', (r) => finish(r, false));
    page.on('requestfailed', (r) => finish(r, true));
    // The render tail (last read end -> selector visible) is invisible to the
    // network lens. Instrument the page itself: long tasks + paints (is the
    // main thread busy?), a MutationObserver stamping when the selector first
    // enters the DOM (late commit vs late detection), an rAF heartbeat (frame
    // throttling would delay Playwright's visibility check), and the page
    // clock's offset from the harness clock so the timelines align.
    await ctx.addInitScript((sel) => {
      window.__perfLog = [];
      window.__probe = { domFoundAt: -1, boxFoundAt: -1, samples: [], maxRafGap: 0, rafCount: 0 };
      const found = () => {
        if (window.__probe.domFoundAt < 0 && document.querySelector(sel)) {
          window.__probe.domFoundAt = Math.round(performance.now());
        }
      };
      // document_start: documentElement does not exist yet — observe the
      // document node itself or the whole init script dies silently.
      new MutationObserver(found).observe(document, { childList: true, subtree: true });
      let last = performance.now();
      const tick = (t) => {
        const gap = Math.round(t - last);
        if (gap > window.__probe.maxRafGap) window.__probe.maxRafGap = gap;
        last = t;
        window.__probe.rafCount++;
        found();
        // After the element exists, sample its box each frame until it is
        // non-empty — a zero-size window here would explain a visibility
        // waiter resolving long after DOM insertion.
        if (window.__probe.domFoundAt >= 0 && window.__probe.boxFoundAt < 0) {
          const el = document.querySelector(sel);
          if (el) {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none') {
              window.__probe.boxFoundAt = Math.round(t);
            } else if (window.__probe.samples.length < 25) {
              window.__probe.samples.push({ t: Math.round(t), w: Math.round(r.width), h: Math.round(r.height), d: cs.display, v: cs.visibility });
            }
          }
        }
      };
      requestAnimationFrame(tick);
      try {
        new PerformanceObserver((l) =>
          l.getEntries().forEach((e) => window.__perfLog.push({ type: 'longtask', at: Math.round(e.startTime), ms: Math.round(e.duration) })),
        ).observe({ type: 'longtask', buffered: true });
        new PerformanceObserver((l) =>
          l.getEntries().forEach((e) => window.__perfLog.push({ type: e.name, at: Math.round(e.startTime) })),
        ).observe({ type: 'paint', buffered: true });
      } catch {}
    }, bdSel);
    try {
      nav.t = Date.now();
      await page.goto(BASE + bdPath, { waitUntil: 'commit' });
      // Race an independent box-check (same visibility semantics, rAF polling)
      // against the production waiter. If the two disagree, the gap is inside
      // the locator machinery, not the page.
      const boxWaiter = page
        .waitForFunction(
          (s) => {
            const el = document.querySelector(s);
            if (!el) return false;
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
          },
          bdSel,
          { polling: 'raf', timeout: 30000 },
        )
        .then(() => Date.now() - nav.t)
        .catch(() => -1);
      await page.locator(bdSel).first().waitFor({ state: 'visible', timeout: 30000 });
      const wall = Date.now() - nav.t;
      const boxWall = await boxWaiter;
      const inPage = await page
        .evaluate(() => ({ log: window.__perfLog ?? [], probe: window.__probe ?? {}, dateNow: Date.now(), perfNow: performance.now() }))
        .catch(() => ({ log: [], probe: {}, dateNow: 0, perfNow: 0 }));
      events.sort((a, b) => a.startAt - b.startAt);
      const end = (e) => e.startAt + e.ms;
      const of = (k) => events.filter((e) => e.kind === k);
      const api = of('api');
      const js = of('js');
      const docEnd = of('doc').length ? Math.max(...of('doc').map(end)) : -1;
      const fanOutAt = api.length ? Math.min(...api.map((e) => e.startAt)) : -1;
      const lastApiEnd = api.length ? Math.max(...api.map(end)) : -1;
      // js chunks that STARTED before the fan-out — the bundle the boot waited on
      const preFanJs = js.filter((e) => fanOutAt < 0 || e.startAt < fanOutAt);
      const preFanJsEnd = preFanJs.length ? Math.max(...preFanJs.map(end)) : -1;
      const bootGap = fanOutAt >= 0 && preFanJsEnd >= 0 ? fanOutAt - preFanJsEnd : -1;
      const renderTail = lastApiEnd >= 0 ? wall - lastApiEnd : -1;
      console.log(`\n== BREAKDOWN ${bdPath} — wall ${wall} ms (fresh context) ==`);
      console.log('  start@   dur  kind  request');
      for (const e of events) {
        console.log(`  ${String(e.startAt).padStart(5)}  ${String(e.ms).padStart(5)}  ${e.kind.padEnd(5)} ${e.failed ? '!! ' : ''}${e.url}`);
      }
      console.log(
        `\n  marks: doc done @ ${docEnd} · ${preFanJs.length}/${js.length} js pre-fan-out, done @ ${preFanJsEnd} · ` +
          `fan-out @ ${fanOutAt} · boot gap ${bootGap} ms · last read end @ ${lastApiEnd} · render tail ${renderTail} ms`,
      );
      // In-page times are relative to the page's own timeOrigin. clockOffset
      // (timeOrigin minus nav.t, both epoch-anchored via Date.now) aligns them
      // to the request timeline exactly — do not eyeball the two clocks.
      const tasks = (inPage.log ?? []).filter((e) => e.type === 'longtask');
      const paints = (inPage.log ?? []).filter((e) => e.type !== 'longtask');
      const clockOffset = inPage.dateNow ? Math.round(inPage.dateNow - inPage.perfNow - nav.t) : null;
      const probe = inPage.probe ?? {};
      const domFoundNav = probe.domFoundAt >= 0 && clockOffset != null ? probe.domFoundAt + clockOffset : -1;
      console.log(
        `  in-page: ${paints.map((p) => `${p.type} @ ${p.at}`).join(' · ') || 'no paint entries'}` +
          `${tasks.length ? ` · long tasks: ${tasks.map((t) => `${t.ms}ms @ ${t.at}`).join(', ')}` : ' · no long tasks'}` +
          ` · clock offset ${clockOffset} ms`,
      );
      const boxFoundNav = probe.boxFoundAt >= 0 && clockOffset != null ? probe.boxFoundAt + clockOffset : -1;
      console.log(
        `  probe: dom found @ ${domFoundNav} nav-clock · box non-empty @ ${boxFoundNav} · ` +
          `waitForFunction box-visible @ ${boxWall} · locator visible @ ${wall} ` +
          `(locator lag vs box ${boxFoundNav >= 0 ? wall - boxFoundNav : '?'} ms) · max rAF gap ${probe.maxRafGap} ms · frames ${probe.rafCount}` +
          `${probe.samples?.length ? ` · zero-box samples: ${probe.samples.slice(0, 5).map((s) => `${s.t}:${s.w}x${s.h}/${s.d}/${s.v}`).join(' ')}` : ''}`,
      );
      appendFileSync(
        OUT,
        JSON.stringify({
          phase: 'breakdown', path: bdPath, wall, docEnd, jsCount: js.length, preFanJsCount: preFanJs.length,
          preFanJsEnd, fanOutAt, bootGap, apiReads: api.length, lastApiEnd, renderTail, api,
          inPage: inPage.log, probe, clockOffset, domFoundNav, boxFoundNav, boxWall,
          at: new Date().toISOString(),
        }) + '\n',
      );
    } catch (e) {
      await diagnose(page, 'breakdown');
      throw e;
    } finally {
      await browser.close();
    }
  }
}
else if (cmd === 'coldnav-path') {
  // Generic: node perf-measure.mjs coldnav-path /journeys '[data-testid="journeys-list"]'
  // Exists chiefly for the like-for-like /journeys re-measure against the
  // 2026-07-10 post-migration baseline (data-complete ~= 3.9 s deep-cold).
  const p = process.argv[3];
  const sel = process.argv[4];
  if (!p || !sel) {
    console.log("usage: coldnav-path <path> '<selector>'");
  } else {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, storageState: STATE });
    const page = await ctx.newPage();
    try {
      console.log(`\n== COLD NAV ${p} against ${BASE} ==`);
      await measureNav(page, p, sel, `B2 ${p} (COLD nav)`, 'coldnav-path');
    } catch (e) {
      await diagnose(page, 'coldnav-path');
      throw e;
    } finally {
      await browser.close();
    }
  }
} else if (cmd === 'coldnav-groups') {
  console.log(`\n== COLD NAV (/groups first) against ${BASE} ==`);
  await coldnavGroups();
  console.log(`\nresults appended to ${OUT}`);
} else if (cmd === 'coldnav') {
  console.log(`\n== COLD NAV against ${BASE} ==`);
  await coldnav();
  console.log(`\nresults appended to ${OUT}`);
} else if (cmd === 'cold' || cmd === 'warm') {
  console.log(`\n== ${cmd.toUpperCase()} against ${BASE} ==`);
  await run(cmd);
  console.log(`\nresults appended to ${OUT}`);
} else {
  console.log(`usage: node scripts/perf-measure.mjs <command>

  setup        provision the measurement FIM (+3 groups so /groups is not empty)
  teardown     erase it — ALWAYS run this when finished
  signin       authenticate and persist the session to disk (warms; not measured)
  coldnav      after >=20 min idle: /notifications/preferences then /groups
  coldnav-groups   same, /groups first
  coldnav-path <path> '<selector>'   generic single cold navigation
  warm         3x soft-nav each page (signs in first, unmeasured)
  waterfall    warm request-by-request timeline for /notifications/preferences
  breakdown <path> '<selector>'   fresh-context ALL-request timeline + segment marks

  DEEP-COLD PROTOCOL (ADR-U043 Amendment 1) — read before trusting any number:
    Signing in immediately before a "cold" navigation DESTROYS it: the sign-in
    warms every function it touches. Use two phases —
      1. node scripts/perf-measure.mjs signin
      2. wait >= 20 min with ZERO traffic to the deployment
      3. node scripts/perf-measure.mjs coldnav
    Getting this wrong reported 368 ms where the correct protocol reports
    5 864 ms on the same page: a 16x error, in the direction of a false pass.

  env: E2E_BASE_URL (default production), PERF_OUT, PERF_ENV`);
}
