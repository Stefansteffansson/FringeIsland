# Performance hardening — parked NFR backlog

**Status:** Living backlog (v1, 2026-06-30). **Run window:** between the **Identity** and **Groups** areas (Phase 3).
**Origin:** a measured production-responsiveness investigation (2026-06-30). The one urgent, cheap fix shipped immediately ([ADR-U035](../../architecture/decisions/ADR-U035-compute-datastore-colocation.md) — compute–datastore co-location). Everything else is **scale-hardening**, parked here to run deliberately as ≥1 NFR bet at the Identity→Groups boundary (PROCESS.md §3).

This is a to-do list, not a spec. Each item is decomposed properly (paired specs / ADRs / migrations through the schema gate) when pulled — **no shortcuts**.

---

## Diagnosis (the measured facts this backlog rests on)

- **The DB is fast.** The hottest query (the `/groups` membership→groups join) executes in **~3 ms** server-side (indexed scans, not table scans). Slowness was **topology**, not SQL.
- **It was a region mismatch.** Functions defaulted to `iad1` (US-East); DB is `eu-west-1` (Ireland) → every DB hop was transatlantic, and `/groups` makes **~4 sequential** hops (`getUser`→Auth, `get_current_personal_group_id`, `group_memberships`, `groups`+counts) ≈ **~700 ms**. **Fixed by ADR-U035** (pin functions to `dub1`) → intra-region hops ~1–2 ms.
- **`getUser()` runs on 8 of 9 API routes** — an avoidable Auth round-trip per request (local JWT verification is the alternative).
- **Test pollution in prod:** 15 users but **644 groups / 1,145 memberships** — the suites run against the **production** DB with incomplete teardown.
- **Advisor (scale-readiness):** 1 RLS policy re-evaluates `auth.uid()` per row (`users`); 14 unindexed foreign keys; 8 tables with multiple permissive RLS policies (`group_memberships`, `journey_enrollments`, `user_group_roles`, `forum_posts`).

---

## L0 — Co-locate compute with the datastore — ✅ DONE (2026-06-30)

`vercel.json` pins the Hub's functions to `dub1` (eu-west-1, the DB's region). [ADR-U035](../../architecture/decisions/ADR-U035-compute-datastore-colocation.md). ~700 ms → ~45 ms on `/groups`, zero architectural change. (Confirmed live via `x-vercel-id: arn1::dub1` — the Vercel **dashboard** still shows `iad1`, its saved default, which does **not** reflect the `vercel.json` override; verify region via the response header, not the dashboard.)

---

## Refined diagnosis (2026-07-01): the client-render pattern is now the top responsiveness lever

Co-location fixed the *distance per hop*. A follow-up measurement isolated the **residual** slowness — and it is **not** the parked round-trip-count items:

- Each API call is now **~80 ms** (Sweden→Dublin distance); server-side hops are intra-region (~1–2 ms).
- **So P1/P2 are confirmed LOW latency-impact** (they shave intra-region ~2 ms hops) — they remain valuable for **Auth-service load + cleanliness at scale**, but they are **not** the responsiveness fix. Do not pull them forward for speed.
- **The real lever is the client-render pattern.** The Hub is a client-rendered SPA, and the root layout blocks **every** page render on a serial account-state fetch: `hub/components/account/AccountStateView.tsx:41` → `if (loading) return <LoadingState/>`. So a fresh load waits ~80 ms on `/api/account/state` **before** the page renders + starts its own fetches.

**Both fixes stay inside the hierarchy** (API-first / Platform ownership / decomposition intact); they change only the Hub's own shell rendering (products own their shell).

| Tier | Item | Form (no shortcuts) | Payoff |
|---|---|---|---|
| **T1** ✅ **shipped 2026-07-01** | **De-block the account-state gate** (render optimistically; intercept only on confirmed suspended/decommissioned) + **parallelize** the page's `/api/groups` + `/api/profile/me` calls | `feature-development`: FEAT-H006 spec "Performance revision (2026-07-01)" + revised STORY-4; `AccountStateView` non-blocking (`if (loading && !error) return children`); red→green unit + `next build`/lint clean (TASK-H006-02). The two page fetches were already sibling components, so de-blocking was the only change needed. **Measured live** (browser, 2026-07-01): the gate no longer blocks — but the residual slowness turned out to be **cold starts**, not the waterfall (see the cold-start fix below). | Removes the serial ~80 ms gate from every load. |
| **T2** ⬅ **now the top responsiveness lever (2026-07-01)** | **Server-render the initial page with its data** (Next.js RSC; data fetched via the Platform API server-side — API-first preserved) — the real **"zero spinner everywhere"** fix | **ADR** + `hub/CLAUDE.md` update (revisits the CSR lean); scope **alongside the parked API-location question** | With cold starts fixed (Edge, below), the **residual per-page spinner** is the last responsiveness gap: pages that exist to *show* data — **Profile**, **Privacy & consent** — fetch it client-side **on mount** and spin (~115 ms warm) every visit. RSC removes it by delivering the page **complete from the server** (no client fetch, no wheel). Caveat (why it was briefly deprioritized): RSC alone does **not** help *cold* starts — but those are handled now, so RSC is back to being the top lever. |

**Resume point + the full Tier-1 plan:** session bridge [`../sessions/2026-07-01_01_-_PERF-INVESTIGATION-COLOCATION-AND-CLIENT-RENDER-FINDING.md`](../sessions/2026-07-01_01_-_PERF-INVESTIGATION-COLOCATION-AND-CLIENT-RENDER-FINDING.md).

---

## Cold-start fix (2026-07-01) — Edge runtime for the hot read routes ✅ SHIPPED ([ADR-U036](../../architecture/decisions/ADR-U036-edge-runtime-hot-read-routes.md), PR #39)

After T1 shipped, live browser measurement of the *deployed* app found the residual "spinning wheel before each page" was **not** primarily the client-render waterfall — it was **serverless cold starts**:

- The Node lambda **cold-started at ~740–790 ms** on the first hit after idle (two independent samples, minutes apart); warm was **~115 ms** (just the Sweden↔Dublin RTT). Not the DB (401s return before any query), not the network.
- **Vercel Fluid Compute was already ON** and did not prevent it — on low traffic the function goes cold on multi-minute idle, so sporadic clicking re-pays the cold start on nearly every navigation.

**Fix:** `/api/account/state`, `/api/profile/me`, `/api/groups` → `runtime = 'edge'` + `preferredRegion = 'dub1'` (V8 isolate ~0 ms cold start, pinned to Dublin so ADR-U035 co-location is preserved). **Re-measured on the PR preview AND production:** cold-start penalty **gone** (first hit **285–313 ms** vs ~740–790 ms; steady ~115 ms), every `x-vercel-id` reads `arn1::dub1` (pin held; warm did not balloon to ~245 ms). **Runtime policy:** hot reads → Edge/`dub1`; mutations + Node-dependent routes (auth flows, `/api/account/export`) → Node.

**Follow-up (2026-07-01, same day):** `/api/account/consent` added to the Edge set under the same policy ([ADR-U036 addendum](../../architecture/decisions/ADR-U036-edge-runtime-hot-read-routes.md)) — it was the **last on-mount read still on Node**, and the felt delay entering **Privacy & consent**. Surfaced by a sharp user symptom: *Privacy & consent spun, but **Download-my-data** was instant* — because the export page **fetches nothing on mount** (it defers to the download click), while `/consent` and `/profile` fetch their data on mount. That contrast is the key: the export page's "don't fetch until the user acts" trick can't be copied to pages whose whole purpose is to *show* data — those need the fix below.

## Authenticated-waterfall fix (2026-07-02) — local JWT verification on the hot path ([ADR-U037](../../architecture/decisions/ADR-U037-local-jwt-verification-hot-path.md))

The felt **1–4 s** navigation slowness survived ADR-U036 because the measured cost sat **in front of** the Edge routes. Measured on the **real authenticated path** (logged-in browser waterfall + response headers — not 401 probes; the 2026-07-02_01 bridge owns that correction):

- `proxy.ts` ran a network `getUser()` (arn1 → Supabase Auth, eu-west-1) on **every** request — ~250–350 ms warm, ~400–750 ms after idle — even for fully static pages (`x-vercel-cache: PRERENDER` measured at **406 ms**). Each API route then paid a **second** `getUser()` inside the handler.
- Felt result: warm nav ≈ **0.7–1.1 s** spinner; after 5-min idle ≈ **2.0 s** (to 3–4 s with slower Auth / token refresh). `/export` felt instant only because it fetches nothing on mount.
- The Profile nav fetched `/api/profile/me` **twice** per visit (AccountMenu + page, AppShell remounts per page).

**Follow-up (2026-07-02, after the felt-check):** **deferred loading indicator** — `LoadingState` now renders nothing for its first **300 ms** and then fades in (delayed-spinner pattern: an immediately-flashed spinner for a ~0.4 s response draws the eye to the wait and reads slower than showing nothing). With post-fix latencies, warm navs complete spinner-free; the spinner appears only for genuine waits. Action affordances (buttons/modals) keep immediate busy feedback; `delay={0}` opts out.

**Fix (ADR-U037):** `getClaims()` **local ES256 verification** (cached JWKS; zero Auth round-trip; session-refresh-when-expired preserved via `getSession`) in the proxy and the four hot read GETs — mutations keep the server-verified `getUser()`. Plus a **session-cached profile client** (kills the duplicate + per-nav re-fetch; invalidated on sign-out, re-seeded on update) and `Server-Timing` (auth/query) on the profile/consent GETs as verification instrumentation. **P1 is thereby partially realised** — pulled forward because its "low latency-impact" rating assumed dub1-local hops; the proxy pays the hop from **arn1** on every request.

---

**⚠ Parked (separate, bigger question — flagged 2026-07-01):** whether the platform-contract API routes should live **inside the Hub app** at all, or be realised as Supabase PostgREST RPC / an extracted platform service that every surface calls directly (Hub SPECIFICATION §4: *"sibling Surfaces consume the same Platform API directly; they do not call the Hub"*; Platform Core specs: *PostgREST RPC is canonical, custom Next.js routes are selective escape-hatches*). ADR-U036 is scoped to the routes **as currently co-hosted** and travels with them if they extract. Needs its own adjudication before more is built on the Hub-hosted-API pattern.

---

## Parked items (scale / cleanliness / hygiene — lower priority than T1/T2 above)

| # | Item | Effort | Form (no shortcuts) | Why / payoff |
|---|------|--------|---------------------|--------------|
| **P1** | `getUser()` → `getClaims()` (local JWT verification) across the read routes — **partially realised 2026-07-02 ([ADR-U037](../../architecture/decisions/ADR-U037-local-jwt-verification-hot-path.md)):** the proxy + the 4 hot read GETs now verify locally (keys confirmed ES256); **remaining:** the other read routes | ~½ day (residual: small) | **ADR** ✅ (ADR-U037) + change the remaining routes + tests | Removes the per-request Auth round-trip; keeps the **Auth service** off the hot path at high user counts. The 2026-07-02 measurement **overturned** the "small latency win" note: the *middleware* hop runs from the user's edge (arn1), not dub1 — it was the dominant felt cost. Trade-off recorded in ADR-U037: `getClaims` trusts the JWT until expiry (won't catch mid-session revocation) — acceptable for reads + RLS-enforced. |
| **P2** | ~~Collapse the `/groups` read (3 sequential queries) into **one `SECURITY DEFINER` RPC**~~ — **REALIZED 2026-07-02 by the ADR-U038 API-boundary tranche, verified at the boundary 2026-07-03:** `get_member_groups()` (migration `20260702130100`) is one SECURITY DEFINER RPC resolving personal-group + memberships + groups + counts in a single call, and `GET /api/groups` makes exactly that one RPC (Edge+`dub1`). Nothing remains of the original item; the group **detail** read arrives as its own contract with Groups Cycle G-A ([FEAT-PC010](../../platform/core/features/FEAT-PC010-group-creation-and-settings-contracts.md)). | — (done) | — | Closed. The item was written before the API-boundary tranche landed the same collapse for conformance reasons; recorded here so the boundary bet doesn't re-do realized work. |
| **P3** | DB scale-readiness: `(select auth.uid())` sweep across **all** RLS policies + add the **14 FK covering indexes** + consolidate the **duplicate permissive policies** | migrations (schema gate) | Split into (a) zero-risk batch — `auth.uid()` wrap + additive FK indexes; (b) careful batch — permissive-policy consolidation (changes RLS logic; needs RLS regression tests) | 3 ms at 644 rows → keeps it 3 ms at 644k. The advisor's exact findings are the work-list (see Diagnosis). |
| **P4** | **Test isolation** — stop the suites running against **prod**; move to a Supabase **branch** (or local stack). Then purge the ~629 orphan groups + their memberships | ~ADR + CI/test-config change + a one-off cleanup migration/script | **ADR** (environment/architecture: where tests run) | Correctness + hygiene: tests currently mutate the production DB and leave orphans. Decouples test runs from prod data and from the prod DB's connection budget. |
| **P5** | Global-scale topology: **read replicas** per region + **edge caching** for cacheable reads; reconsider DB region (`eu-north-1`) if the base is Nordic-concentrated | large | ADR(s) + infra | **Future only** — when the user base goes genuinely global. Co-location (L0) is the correct single-region base until then. |

---

## Sequencing notes

- **Order at the boundary:** P3a (zero-risk DB wins) → ~~P2~~ (realized 2026-07-02, see row) → P1 (getClaims residual) → P3b (policy consolidation, with RLS regression tests) → P4 (test isolation). P5 stays future. **Boundary bet taken 2026-07-03 (Groups kickoff, decision D1) and executed 2026-07-04:** P3a shipped as migration `20260704075549` alongside the Cycle G-A build (advisor-verified work-list: 14 FK covering indexes + the 2 remaining `auth_rls_initplan` wraps — the sweep was otherwise already clean); P1-residual/P3b/P4 stay parked.
- **Re-entry trigger:** planted in [`phase-3-identity-completion-plan.md`](./phase-3-identity-completion-plan.md) §"After Identity" so this backlog is consulted before Groups work begins.
- **Each item gets its own PR + (where noted) ADR.** Schema-touching items pause at the schema-review gate; ADRs and `platform/core/` changes pause for the merge nod.
