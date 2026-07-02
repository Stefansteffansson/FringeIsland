# Session bridge — RESUME HERE: deep front-end perf investigation (authenticated page-load slowness)

**Date:** 2026-07-02
**Session type:** OPEN investigation brief for a fresh session. **Not yet solved.**
**Status:** The felt slowness is **NOT fixed**. Profile + Privacy & consent still spin **~1–4 s** on navigation; Download-my-data is instant. Prior "fixed" claims were based on a **flawed measurement** — see below.
**Participants:** Stefan + Claude

---

## The symptom (Stefan, verbatim-ish)

Signed in. Navigating **Profile → Privacy & consent** shows the spinning wheel for **~1–4 s**; back to **Profile**, another ~1–4 s spin. **Download my data** loads **instantly, no wheel.** This is client-side navigation between authenticated pages.

## ⚠ The measurement flaw (own it, don't repeat it)

Everything measured on 2026-07-01 used **unauthenticated same-origin `fetch` probes → HTTP 401**. A 401 returns **before the real work**: no DB query, and it tells us **nothing about the authenticated client-side page-load sequence**.

- What the 401 probes **validly** showed: the **function cold-start** (~740 ms Node → ~110 ms Edge). That finding stands; the Edge move (ADR-U036) was real and correct **for cold starts**.
- What they **did NOT** measure: the **authenticated, end-to-end page load** — client auth resolution, token refresh, the full on-mount fetch waterfall, the actual RLS/RPC query cost, redundant fetches. **The 1–4 s lives here and is unexplained by the 401 model.**

**Do not trust unauthenticated 401 timings as a proxy for felt page speed. Measure the authenticated path.**

## What is DONE and still valid (don't re-do)

- **Tier 1** — non-blocking account-state gate (FEAT-H006 revision). Shipped, E2E-verified.
- **Edge + `dub1`** on the 4 hot read routes (`account/state`, `profile/me`, `groups`, `account/consent`) — ADR-U036 + addendum. Cold-start eliminated. Keep.

## Hypotheses to TEST (ranked — measure, don't assume)

1. **Client auth resolution blocks every nav.** Pages do `if (authLoading) return;` before their fetch → **serial**: AuthContext resolves session (`getSession`/`getUser`, possibly a **token refresh** round-trip) → *then* the page fetch fires. If AuthContext re-resolves on each client nav, that's a per-nav tax.
2. **Middleware (`proxy.ts`) runs `getUser()` on EVERY request and is NOT region-pinned** → it runs at the **Stockholm edge**, so its Auth call is transatlantic (~80 ms+) per request, and may trigger token refresh. (API routes are Edge/`dub1`; the *middleware* is not pinned.)
3. **Redundant/unshared fetches.** `AppShell` (hence `AccountMenu` → `/api/profile/me`) remounts per page; the page *also* fetches (`/profile` fetches profile/me again; `/consent` fetches consent); `AccountStateProvider` fetches `/api/account/state`. Nothing shared/cached across nav → every nav re-fetches.
4. **Token-refresh storm / auth deadlock** — check the "don't query inside `onAuthStateChange`" gotcha; look for repeated/duplicated auth calls or effects firing multiple times.
5. **RLS `auth.uid()` re-eval per row** (advisor flag on `users`) over the **polluted prod data** (644 groups / 1,145 memberships) — the authenticated query cost the 401 skipped.
6. **Something pathological** — a retry loop, a failing request retrying, a render storm.

## The plan (measure-first, no guessing)

1. **Measure the REAL authenticated waterfall.** Log into the deployed app (or the Claude-in-Chrome controlled tab), open DevTools **Network** (Disable cache), navigate **Profile ↔ Consent**. Capture **every request**, its **timing breakdown** (queued/stalled/TTFB/download), and the **sequence** (what waits on what). Compare against the instant **Download-my-data** nav. A screenshot of the waterfall is gold. Also grab the **Performance** panel for a slow nav to see main-thread vs network.
2. **Instrument to localize the time.** Add **`Server-Timing`** headers to the routes (middleware-auth vs route-auth vs query) and **client `console.time` markers** (authLoading start/end, fetch start/end, render). Deploy to a preview, read them off the Network tab. This turns "1–4 s somewhere" into "X ms here, Y ms there."
3. **Root-cause from the trace** — not from this hypothesis list.
4. **Fix the actual bottleneck.** Likely candidates (pick per the trace): pin/again-optimize middleware auth (P1 `getUser`→`getClaims`/local JWT, in the perf backlog); **share** profile/account-state via one provider so navs don't re-fetch; **RSC server-render** Profile/Consent (backlog **T2** — the "zero spinner" fix) — *but only if the trace confirms the cost is the client fetch, not auth/middleware*.
5. **Re-measure the authenticated waterfall** to confirm the felt fix (Network tab, logged in — NOT a 401 probe).

## Related / entangled

- **Perf backlog:** [`../hub-v2/perf-hardening-backlog.md`](../hub-v2/perf-hardening-backlog.md) (T2/RSC = top lever; P1 getClaims; the advisor/data-pollution notes).
- **Parked architectural question:** should the platform-contract API routes live inside the Hub app at all? (bridge `2026-07-01_03` + backlog). RSC touches this seam — scope together.

## How to start the fresh session

Read: this bridge → `perf-hardening-backlog.md` → the Hub pages `hub/app/{profile,consent,export}/page.tsx` + `hub/lib/auth/AuthContext.tsx` + `hub/lib/supabase/middleware.ts` + `proxy.ts`. **First action: the authenticated Network-tab measurement (step 1).** Do not ship a fix before the trace localizes the time.
