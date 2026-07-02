# ADR-U037: Local JWT verification on the request hot path (proxy + read routes)

**Status:** Accepted (nod 2026-07-02)
**Date:** 2026-07-02
**Deciders:** Stefan + Claude (from the measured authenticated-waterfall investigation)
**Tags:** scope:product (Hub shell + Hub-hosted platform routes) · wave:ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

Signed-in navigation between Hub pages (Profile ↔ Privacy & consent) still showed a **1–4 s spinner** after the Edge/cold-start work (ADR-U036). The 2026-07-01 measurements that declared the problem fixed used unauthenticated 401 probes — a flawed proxy for felt speed (session bridge `2026-07-02_01`). This session measured the **real authenticated waterfall** (logged-in browser, per-request resource timings + response headers) and localized the time:

- **Every request** — pages, RSC prefetches, API calls, even fully static content — passes through the Hub's `proxy.ts` → `updateSession()` → `supabase.auth.getUser()`: a **network round-trip to Supabase Auth (eu-west-1) from the user's nearest edge (arn1)**. Measured: a static `x-vercel-cache: PRERENDER` page served from the edge cache took **406 ms**; the proxy's Auth hop accounts for ~350 ms of it. After idle (cold connections) the same hop cost **400–750 ms per request**.
- The API routes then pay a **second** `getUser()` Auth round-trip inside the route handler.
- The client-render pattern serializes 2–3 such taxed legs per navigation (nav RSC fetch → mount → on-mount data fetch), and the Profile nav fetches `/api/profile/me` **twice** (AccountMenu + page).
- Measured felt result: **0.7–1.1 s warm, ~2.0 s after 5-min idle** (to 3–4 s with slower Auth responses / token refresh) — the reported symptom, fully accounted for. `/export` feels instant because it fetches nothing on mount.

ADR-U035 (dub1 co-location) and ADR-U036 (Edge runtime) stand — but they optimize what happens *behind* a front door that itself costs an Auth round-trip per request. How should the Hub authenticate requests on the hot path without paying a per-request Auth-server round-trip?

## Decision drivers

- Felt responsiveness: the per-request Auth hop is the single largest measured cost on every navigation.
- Session-refresh semantics must be preserved (the reason `updateSession` exists): expired tokens must still refresh and re-set cookies.
- Authorization must remain enforced: RLS at the DB stays the authority regardless of how the route resolves identity.
- No schema change, no API-contract change, Edge-runtime-safe.
- The project's JWT signing keys are **asymmetric (ES256)** — verified live from the session cookie — so local verification is available.

## Considered options

- **Option A** — Keep `getUser()` everywhere (status quo): server-verified on every request, per-request Auth round-trip.
- **Option B** — **`getClaims()` local verification** in the proxy and on the **read (GET) routes**; keep `getUser()` on mutations (PATCH/POST). ES256 signature checked locally via WebCrypto against a cached JWKS; refresh-when-expired preserved (`getClaims()` resolves the session via `getSession()`, which refreshes and re-sets cookies).
- **Option C** — Remove auth from the proxy entirely (narrow the matcher / drop `updateSession`): fastest, but loses centralized session refresh — an expired token would only refresh wherever a route happens to handle it.
- **Option D** — Server-render pages with their data (RSC, perf-backlog T2): removes the on-mount fetch leg altogether, but is a rearchitecture entangled with the parked API-location question, and does not remove the proxy's per-request hop.

## Decision outcome

**Chosen option:** Option B, because it removes the measured dominant cost (one-to-two Auth round-trips per request) while preserving session refresh, keeping RLS enforcement untouched, and requiring no architectural change. Verified against the installed SDK (`@supabase/auth-js` in `supabase-js` 2.91): ES256 + `kid` + WebCrypto → local `crypto.subtle.verify` with a module-cached JWKS; HS fallback does not apply (project keys are ES256).

Scope of the change:

- `hub/lib/supabase/middleware.ts` (`updateSession`): `getUser()` → `getClaims()`.
- The four hot read routes' GET handlers (`/api/account/state`, `/api/profile/me`, `/api/groups`, `/api/account/consent`): `getUser()` → a shared `getVerifiedUserId()` helper wrapping `getClaims()` (identity = `claims.sub`).
- **Mutations keep `getUser()`** (PATCH `/api/profile/me`, POST `/api/account/consent`, auth flows): server-verified check retained where state changes, at negligible frequency.
- This partially realises perf-backlog **P1** — pulled forward because P1's "low latency impact" rating assumed dub1-local hops; the measured reality is the proxy pays the hop from **arn1** on **every** request.

### Consequences

- **Positive:** removes ~250–350 ms (warm) to ~400–750 ms (cold) from every request; static pages and RSC prefetches return at network speed, so `Link` prefetching starts working as designed (nav commits instantly); read APIs drop to roughly RTT + query.
- **Negative:** on read paths a revoked-but-unexpired JWT is trusted until expiry (≤1 h revocation window). Accepted: reads are additionally RLS-enforced at the DB, and mutations still use the server-verified check. State it plainly: mid-session revocation no longer interrupts *reads* until token expiry.
- **Negative:** first `getClaims()` per isolate fetches the JWKS (one small, CDN-cacheable call; cached ~10 min in-module). Negligible in practice.
- **Neutral:** `Server-Timing: auth,query` headers added to the profile/consent GETs as verification instrumentation. Preview-measured caveat: **Vercel drops `Server-Timing` on Edge-runtime responses** (absent from the same-origin header list in the browser), so the split is not readable from the Network tab today — the code and unit assertion stay (zero cost, useful if the routes move runtimes or the platform passes it through later).

## Pros and cons of each option

### Option A — status quo
- Pros: strongest per-request identity check; zero change.
- Cons: measured 0.7–2 s felt navigation; pays Auth round-trips even for static content; Auth service on every request's critical path (scale risk noted in perf backlog).

### Option B — local verification on the hot path (chosen)
- Pros: removes the dominant measured cost everywhere at once; session refresh preserved; RLS untouched; Edge-safe; smallest diff for the effect.
- Cons: read-path revocation window (≤1 h); depends on asymmetric signing keys staying enabled.

### Option C — no auth in the proxy
- Pros: absolute fastest front door.
- Cons: loses the centralized refresh seam — the actual purpose of `updateSession`; refresh behavior becomes route-dependent and fragile.

### Option D — RSC server-render (T2)
- Pros: removes the on-mount fetch leg and the spinner as a category ("zero spinner").
- Cons: rearchitecture; entangled with the parked platform-API-location question; does not remove the proxy hop; not required to fix the measured symptom.

## Links

- Perf backlog: `docs/planning/hub-v2/perf-hardening-backlog.md` (P1 partially realised here; T2 remains the parked endgame)
- Session bridges: `docs/planning/sessions/2026-07-02_01_-_RESUME-DEEP-FRONTEND-PERF-INVESTIGATION.md` (the brief + measurement-flaw warning); this session's closing bridge (measured waterfall + re-measure)
- Related ADRs: ADR-U035 (dub1 co-location), ADR-U036 (Edge runtime for hot reads) — both stand; this ADR removes the front-door cost in front of them
- External: Supabase `getClaims()` / asymmetric JWT signing keys; `@supabase/ssr` middleware session-refresh pattern
