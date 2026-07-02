# Session bridge — Cold-start root-caused + fixed (Edge runtime), and a parked API-location question

**Date:** 2026-07-01 (continues `2026-07-01_02`)
**Session type:** Perf investigation + fix (browser-measured), then a governance pause.
**Status:** **Cold starts root-caused + FIXED + production-confirmed** (Edge runtime, ADR-U036, PR #39 merged `3b9ef58`). A **bigger architectural question was surfaced and parked** at Stefan's request.
**Participants:** Stefan + Claude

---

## What happened

1. **Tier 1 E2E-verified** (from `2026-07-01_02`): full Playwright suite **31/31 green** live; recorded (PR #38).
2. **Stefan reported the deployed Hub still felt slow** ("spinning wheel before each page") — *after* Tier 1 + ADR-U035 co-location. So we measured the deployed app directly.
3. **Measured via the browser** (Claude-in-Chrome extension → same-origin timed `fetch` probes against the live deployment, past the Vercel SSO wall using the logged-in session; 401s still execute the function, so they time cold/warm/network truthfully):
   - **Node lambda cold-started at ~740–790 ms** on first hit after idle (two independent samples); **warm ~115 ms** (just the Sweden↔Dublin RTT).
   - **Vercel Fluid Compute was already ON** and did not prevent it — low-traffic idle → cold, so sporadic clicking re-pays the cold start on nearly every navigation. **That was the felt slowness.**
   - Not the DB (401s return pre-query), not the network, not the client-render waterfall.
4. **Fix shipped: Edge runtime, region-pinned** ([ADR-U036](../../architecture/decisions/ADR-U036-edge-runtime-hot-read-routes.md), PR #39). `/api/account/state`, `/api/profile/me`, `/api/groups` → `runtime = 'edge'` + `preferredRegion = 'dub1'` (V8 isolate ~0 ms cold start; pinned to Dublin so ADR-U035 co-location holds).
   - **Verified on PR preview AND production:** cold-start gone (**285–313 ms** first hit vs ~740–790 ms; steady ~115 ms); every `x-vercel-id` = `arn1::dub1` (**pin held**, warm not ballooned to ~245 ms). `next build` + E2E clean (30/31; the 1 a re-run-green sign-out-race flake).

## Key reprioritization

- **T2 (RSC server-render) is NOT a cold-start fix** and is **deprioritized** as a responsiveness lever — RSC runs in the same cold-startable function; a cold RSC page would block *entirely*. Cold starts were the real cause; Edge addressed them. (Backlog updated.)
- **Runtime policy (now explicit, ADR-U036):** hot reads → Edge/`dub1`; mutations + Node-dependent routes (auth flows, `/api/account/export`) → Node. New routes default to Node.

## ⚠ PARKED — the bigger question Stefan wants revisited later

While justifying the Edge change I surfaced (and Stefan flagged to **keep for later, not resolve now**): **should the platform-contract API routes live inside the Hub app at all?**

- The Hub v2 rebuild realises platform contracts (FEAT-PC004 / FEAT-PC003 Identity + the groups read) as **Next.js routes inside `hub/app/api/`**, with some logic in `hub/lib/*`.
- This sits in tension with the canon: Hub SPECIFICATION §4 (*"sibling Surfaces consume the same Platform API directly; they do not call the Hub"*; *"the Hub exposes no public API"*) and the Platform Core specs (*PostgREST RPC is the canonical HTTP surface; custom Next.js routes are selective escape-hatches for the PC-3 §7 three-justification cases*). If real logic lives only in Hub routes, the Gimbal can't inherit it — the exact thing ADR-U009 exists to prevent.
- **Nothing was moved this session** — the routes have been Hub-hosted since the FEAT-H001 walking skeleton; the Edge change relocated zero code (2 config lines × 3 files). The data layer (`supabase/`: Postgres, RLS, SECURITY DEFINER functions, Auth) is untouched.
- **Owed next:** a route-by-route audit (how much is thin-wrapper-over-Supabase vs Hub-only logic) → a verdict per endpoint → decide (keep as Hub BFF / push logic into Supabase RPC / plan an extraction). ADR-U036 is deliberately scoped to the routes *as currently co-hosted* and travels with them if they extract.

## Carry-forward

- **The parked API-location question above** is the most important open item — it likely deserves its own ADR/adjudication before more is built on the Hub-hosted-API pattern.
- **Perf:** cold starts fixed; warm ~115 ms is the geographic floor (Sweden↔Dublin). Remaining perf items in [`../hub-v2/perf-hardening-backlog.md`](../hub-v2/perf-hardening-backlog.md) are scale/cleanliness (P1–P5), not felt latency.
- **Cycle D (IDN-5 Journal)** remains the next *feature* cycle.
- **Tooling note:** the Claude-in-Chrome extension (once connected — needed a full Chrome restart / reinstall) was what let us measure the SSO-protected deployment from the logged-in session. The sandbox alone hit the SSO wall.

---

## Follow-up (same session) — `/api/account/consent` → Edge + close ritual

A user symptom sharpened the picture: **Privacy & consent spun, but Download-my-data was instant.** Diagnosis — the export page **fetches nothing on mount** (defers to the download click), while `/consent` (and `/profile`) fetch on mount; and `/api/account/consent` was the **last on-mount read still on Node** → it cold-started ~740 ms.

- **Fixed:** `/api/account/consent` → `runtime='edge'` + `preferredRegion='dub1'` (PR #41, `49c7bdb`; ADR-U036 addendum). GET (PC-6 read, the target) + POST (PC-7 grant/withdraw, edge-safe RPC) both move (per-file runtime). `next build` + consent E2E 6/6 clean.
- **Production-confirmed:** consent **373 ms cold (fresh deploy) → ~110 ms warm**, `x-vercel-id = arn1::dub1` (pin held) — was ~740 ms Node cold. **All four hot read routes** (`account/state`, `profile/me`, `groups`, `account/consent`) are now uniform on Edge/`dub1`.
- **RSC re-elevated:** the residual ~110 ms flash on data-on-load pages (Profile, Consent) is purely the client-side on-mount fetch. Perf backlog **T2 (RSC server-render) is now the top responsiveness lever** — the real "zero spinner everywhere" fix — to be scoped alongside the parked API-location question.

**Close ritual (2026-07-02):** dashboard refreshed (582 files); session-doc links verified; full `doc-health-check` not triggered (no renames/deletions/schema-migrations/restructures this session). **Final state:** `main` @ `49c7bdb`, PRs #36–#41 merged, tree clean.
