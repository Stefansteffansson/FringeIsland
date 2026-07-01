# ADR-U036: Edge runtime for the Hub's hot read routes — eliminate serverless cold-start latency (region-pinned to preserve co-location)

**Status:** Accepted (preview-deploy re-measured 2026-07-01 — cold-start penalty eliminated + `preferredRegion='dub1'` pin confirmed held; see "Verification (done)" below). Pending production merge (PR #39).
**Date:** 2026-07-01
**Deciders:** Stefan
**Tags:** scope:platform-core · scope:product · wave:ferd

> Architecture Decision Record (MADR-style). **Resolves** a *measured* production responsiveness problem that survived [ADR-U035](./ADR-U035-compute-datastore-colocation.md) (co-location): the Hub's Node serverless functions **cold-start (~740–790 ms)** on the first hit after an idle gap, and re-cold on every navigation that follows a pause — the felt "spinning wheel." Moves the three **hot read routes** (`/api/account/state`, `/api/profile/me`, `/api/groups`) to the **Edge runtime** (V8 isolates, ~0 ms cold start), **pinned to `dub1`** via `preferredRegion` so co-location with the Ireland database (ADR-U035) is preserved. Pure runtime topology — it changes **no** contract, schema, or anatomy (ADR-U009 API-first is untouched; business logic stays in the route handlers).

---

## Context and problem statement

ADR-U035 co-located the Hub's compute with its database (`dub1`, Ireland), collapsing each server→DB hop from transatlantic to intra-region. That fixed *distance per hop*. But the deployed Hub still felt slow, with a spinner before each freshly-loaded page.

A measured investigation (2026-07-01, via the browser against the live `dub1` deployment) isolated the residual cause to **serverless cold starts**, not the render pattern and not the network:

| call | round 0 (first hit after idle) | rounds 1–3 (warm) |
|---|---|---|
| `/api/account/state` | **741–792 ms** | ~110–142 ms |
| `/api/profile/me` | ~124 ms | ~110 ms |
| `/api/groups` | ~113 ms | ~110–120 ms |

- The **first function invocation after idle cold-started at ~740–790 ms** (two independent samples, minutes apart); once a warm instance existed, everything settled to **~115 ms** — which is just the Sweden↔Dublin round-trip (the geographic floor, and fine). The cold penalty is **not** the DB (these are 401s that return before any query) and **not** the network (warm is 115 ms) — it is the **Node lambda booting** (runtime + `@supabase/ssr` client init).
- **Vercel Fluid Compute was already ON** and did **not** prevent this: on a low-traffic deployment the function still goes cold on multi-minute idle, so a user clicking around sporadically re-pays the cold start on nearly every navigation. That is the felt slowness.

*"How do we eliminate the cold-start penalty on the Hub's hot read paths without re-introducing the transatlantic hops that ADR-U035 just removed, and without compromising the API-first anatomy?"*

## Decision drivers

- **Eliminate cold starts (felt now):** the ~740–790 ms first-hit penalty is the dominant responsiveness problem after co-location.
- **Do not regress ADR-U035:** the fix must keep compute co-located with the Ireland DB — a naive Edge move runs the function at the PoP nearest the user (Stockholm), which would put each Supabase call back across the sea (~80 ms/hop, ~245 ms warm).
- **API-first intact (ADR-U009):** business logic stays behind the route handlers; the frontend still never touches the DB directly. Only the routes' *runtime* changes.
- **Minimal blast radius + reversibility:** the change should be a few lines, scoped to the read routes, and trivially revertible.
- **Verifiable before production:** the region-pin behaviour is load-bearing and slightly uncertain in Next.js 16.1, so the decision must be confirmed by measurement, not assumed.

## Considered options

- **Option A — Edge runtime + `preferredRegion='dub1'` on the three hot read routes** (chosen). V8-isolate cold start (~0 ms), pinned to Dublin to keep intra-region DB hops.
- **Option B — Warm-ping cron** — a Vercel Cron hits a light endpoint every few minutes to keep the Node `dub1` function warm. Preserves co-location, no runtime change.
- **Option C — Vercel Fluid Compute alone** — already enabled; measured insufficient on this traffic profile.
- **Option D — Do nothing / accept the cold starts** — or push on the client-render (Tier 2 RSC).

## Decision outcome

**Chosen option: Option A**, because it eliminates the cold-start penalty *structurally* (V8 isolates don't pay the Node boot) while `preferredRegion='dub1'` keeps the function co-located with the database, so ADR-U035's intra-region hops are preserved — and the three routes are already Edge-compatible (they use only `@supabase/ssr`, `next/headers` cookies, `fetch`-based Supabase/PostgREST calls, and `console`/`Date`; no Node-only APIs).

**Verification (done — 2026-07-01, PR #39 preview deploy, browser-measured):** the same probe re-measured the preview edge routes. The cold-start penalty is **gone** — first-hit-after-deploy **313 ms** vs the Node **~740–790 ms**; steady ~130 ms. Every `x-vercel-id` read `arn1::dub1::…`, so the **`preferredRegion='dub1'` pin held** and warm stayed ~130 ms (not the ~245 ms that would signal the function ran near the user). Both gate criteria met → **Accepted**. (Had the pin not held, the fallback was Option B — warm-ping cron — or revert.)

### Scope and runtime policy

- **Why `scope:platform-core` too (corrects an earlier under-scoping):** these three routes implement **Platform Core** contracts — [FEAT-PC004](../../platform/core/features/FEAT-PC004-account-state-read.md) + [FEAT-PC003](../../platform/core/features/FEAT-PC003-self-service-profile.md) (Identity) and the groups read — **currently co-hosted in the Hub's Next.js app**. The runtime/region of the platform API surface is a platform-core deployment concern, not Hub chrome; this is *not* a "Hub shell only" change.
- **Runtime policy (intentional heterogeneity — stated, not implicit):** the API surface is now split by purpose. **Hot READ paths on the critical render path → Edge + `preferredRegion='dub1'`.** **Mutations and Node-dependent routes → the default Node runtime** (the auth flows; and `/api/account/export`, which assembles a document and needs Node). New routes **default to Node**; move a route to Edge **only** when it is a hot read, and **always** with the `dub1` pin.
- **Extraction coupling (revisit-later flag):** this decision is scoped to the platform-contract routes **as currently hosted inside the Hub app**. Whether those routes belong in the Hub at all is a **separate, parked architectural question** (2026-07-01). If that HTTP API surface later extracts to a standalone platform service, this runtime/region choice travels with it and is reconsidered there — it is not a permanent Hub property.

### Consequences

- **Positive:** the first-hit-after-idle penalty (~740–790 ms) disappears on the hot read paths; navigation feels consistent; co-location (ADR-U035) is preserved; no contract/schema/anatomy change; reversible in one commit.
- **Negative:** these three routes now carry an **Edge-compatibility constraint** — any future import that pulls in a Node-only API (Buffer, `node:*`, native crypto, fs) will break the build; the `preferredRegion` pin is load-bearing and must not be dropped (else co-location regresses); Edge runtime has a smaller API surface than Node. Routes that legitimately need Node (e.g. the data-export route that assembles a document) stay on Node deliberately.
- **Neutral:** the Node region pin in `hub/vercel.json` (`dub1`) still governs the remaining Node functions; both runtimes now target Dublin.

## Pros and cons of each option

### Option A — Edge + `preferredRegion='dub1'`
- Pros: ~0 ms cold start (structural); co-location preserved via the region pin; tiny, reversible, scoped to read routes; API-first untouched.
- Cons: Edge-compat constraint on the routes; `preferredRegion` pin is load-bearing and its exact behaviour in Next 16.1 needs deploy-time verification; smaller runtime API surface.

### Option B — Warm-ping cron
- Pros: no runtime change; preserves co-location trivially; keeps the Node function warm.
- Cons: depends on the Vercel plan's cron cadence (Hobby = once/day, useless; needs Pro for minute-level); an always-on synthetic request; keeps only one instance warm (concurrent cold starts still possible); treats the symptom, not the cold-start itself.

### Option C — Fluid Compute alone
- Pros: zero code, already enabled.
- Cons: **measured insufficient** — the function still cold-starts after multi-minute idle on this traffic profile.

### Option D — Do nothing / Tier 2 RSC
- Pros: no change (do nothing); RSC would collapse the client waterfall.
- Cons: do-nothing leaves the pain; **RSC does not fix cold starts** (the RSC render runs in the same cold-startable function, and server-rendering would make the cold page block *entirely* before anything shows) — measuring saved us from building the wrong thing.

## Links

- **Related feature specs:** [FEAT-PC004](../../platform/core/features/FEAT-PC004-account-state-read.md) (`/api/account/state`), [FEAT-PC003](../../platform/core/features/FEAT-PC003-self-service-profile.md) (`/api/profile/me`), and the `/api/groups` read path.
- **Related ADRs:** [ADR-U035](./ADR-U035-compute-datastore-colocation.md) (co-location — this preserves it), [ADR-U009](./ADR-U009-api-first-frontend-agnostic.md) (API-first — untouched).
- **Evidence + backlog:** perf bridges [`../../planning/sessions/2026-07-01_01_-_PERF-INVESTIGATION-COLOCATION-AND-CLIENT-RENDER-FINDING.md`](../../planning/sessions/2026-07-01_01_-_PERF-INVESTIGATION-COLOCATION-AND-CLIENT-RENDER-FINDING.md) and [`../../planning/hub-v2/perf-hardening-backlog.md`](../../planning/hub-v2/perf-hardening-backlog.md).

---

## Addendum — 2026-07-01: `/api/account/consent` added to the Edge set (same policy)

Applying the **runtime policy** above (hot reads on the render path → Edge/`dub1`), `/api/account/consent` was moved to `runtime = 'edge'` + `preferredRegion = 'dub1'`. Trigger: a user-reported symptom — navigating to **Privacy & consent** showed a long spinner while the sibling **Download-my-data** page was instant. Diagnosis: the `/consent` page fetches `GET /api/account/consent` on mount (hot read on its render path), and that route was **still on Node** (it wasn't in the original three) → it cold-started ~740 ms. The Download-my-data page fetches **nothing** on mount (it defers to the download click), so it never paid a cold start.

- **GET** (FEAT-PC006 read) is the hot read the move targets.
- **POST** (FEAT-PC007 grant/withdraw) shares the route file (runtime is per-file), so it moves too. This does **not** contradict "mutations stay on Node" — that rule is for **Node-dependent** mutations (e.g. `/api/account/export`'s document assembly); the consent POST is a single edge-safe SECURITY DEFINER RPC with no Node dependency, and it stays co-located via the `dub1` pin.

This is an *application* of the accepted policy, not a new decision — no status change. Route list is now four: `account/state`, `profile/me`, `groups`, `account/consent`.
