# Session bridge — perf root cause MEASURED and FIXED (ADR-U037, PR #44)

**Date:** 2026-07-02
**Session type:** deep front-end perf investigation (resumes bridge `2026-07-02_01`). **Resolved.**
**Status:** The felt 1–4 s Profile ↔ Privacy & consent spinner is **root-caused, fixed, re-measured on the authenticated path** (preview deployment, logged in), and **felt-check CONFIRMED by Stefan on production** ("works great"). Merged to main (`48b001b`, PR #44).
**Same-day follow-up (PR #46, `fc5a77f`):** **deferred loading indicator** — Stefan flagged on the felt-check that an instantly-shown spinner for a ~0.4 s wait is itself the irritation. `LoadingState` now renders nothing for its first 300 ms, then fades in (250 ms, reduced-motion honored); warm navs complete spinner-free, buttons/modals keep immediate busy feedback, `delay={0}` opts out. Red-first TDD; two prior-contract tests updated to the deferred contract.
**Participants:** Stefan + Claude

---

## What this session did differently (the measurement)

Per the prior bridge's hard rule: **logged-in browser, full per-request resource timings + response headers — no 401 probes.** Protocol: baseline `performance.now()` mark → drive the real menu → in-app `Link` navs (client-side, exactly the symptom path) → dump `performance.getEntriesByType('resource')` deltas; repeat warm and after a 5-minute no-touch idle.

## Root cause (measured, three stacked costs)

1. **`proxy.ts` ran a network `getUser()` on EVERY request** — from the user's nearest edge (arn1) to Supabase Auth (eu-west-1): ~250–350 ms warm, **400–750 ms after idle** (cold connections). Even fully static pages paid it: a `x-vercel-cache: PRERENDER` page measured **406 ms**. This is why ADR-U036 (Edge routes) didn't fix the feel — the cost sat **in front of** the routes, and it also made `Link` prefetching useless (prefetches never finished before the click).
2. **Each API route paid a second `getUser()`** inside the handler.
3. **Profile fetched `/api/profile/me` twice per nav** (AccountMenu + page; AppShell remounts per page), re-fetched on every nav.

Felt result measured pre-fix: **0.7–1.1 s warm, ~2.0 s after idle** (3–4 s with Auth latency variance / token refresh) — the reported symptom, fully accounted for. `/export` felt instant only because it fetches nothing on mount.

## The fix (ADR-U037, all measured-cost driven)

- **Local JWT verification on the hot path:** `proxy.ts` + the 4 hot read GETs (`account/state`, `profile/me`, `groups`, `account/consent`) use `getClaims()` — local ES256 verify (project keys confirmed ES256 from the live session cookie), cached JWKS, session-refresh-when-expired preserved via `getSession`. **Mutations keep server-verified `getUser()`.** New helper: `hub/lib/supabase/auth.ts` (`getVerifiedUserId`).
- **Session-cached profile client** (`hub/lib/profile/client.ts`): concurrent callers share one request; resolved profile reused across navs; failed reads never cached; `updateProfile` re-seeds; invalidated on session end (AuthContext listener — pure local drop, no query, deadlock gotcha respected).
- `Server-Timing` (auth/query) on profile/consent GETs — **caveat: Vercel drops `Server-Timing` on Edge-runtime responses** (verified absent from the same-origin header list), so it is not browser-readable today; code + unit assertion kept at zero cost.
- Perf backlog updated: **P1 partially realised** (its "low latency impact" rating assumed dub1-local hops; the proxy pays from arn1 — measurement overturned it). Remaining P1 residual: the non-hot read routes.

## Re-measured (preview deployment, authenticated, same protocol)

| Metric | Before (prod) | After (preview) |
|---|---|---|
| Static/RSC request | 406 ms every time | **63–104 ms** (CDN HIT; proxy ≈ 0 network) |
| Read API | ~300–560 ms warm | **176–178 ms steady** (363 ms first-hit after idle) |
| Nav → Profile, after 5-min idle | **~2,020 ms** spinner | **~250 ms** (zero API calls — cache) |
| Nav → Consent, after 5-min idle | ~2,000 ms | **~450 ms** |
| Prefetches | 400–930 ms, never done before click | 70–300 ms, complete before click |

## Verification trail

- Red-first TDD: 6 suites red (16 tests) → **unit 172/172** green (incl. new: groups-route, supabase-auth helper, profile client-cache specs)
- Integration profile+account: **42/42 green with `--runInBand`** — ⚠ parallel runs flake intermittently (Auth/prod-DB contention, the known **P4** problem; solo/serial always green). P4 just got more evidence.
- eslint clean; `next build` clean (`next lint` is gone in Next 16 — use `npm run lint`)
- ADR-U037 Accepted (nod 2026-07-02); merged squash as `48b001b` (#44)

## Open / follow-ups

- ~~Stefan: felt-check production~~ — **DONE, confirmed** ("feels much more responsive"; the deferred-indicator follow-up #46 shipped off that check).
- P1 residual: remaining read routes → `getClaims()` (small; at the Identity→Groups boundary with the rest of the backlog).
- **T2 (RSC server-render) stays parked** — the trace showed the tax was per-request auth, not the fetch pattern; T2 remains the "zero spinner" endgame, scoped with the parked API-location question.
- Consent fetch stays per-mount by design (re-read after POST is the source-of-truth rule); at ~176 ms it renders the panel fast.
- doc-health-check not run: no renames/deletions/schema/restructure this session, not a cycle boundary.

## How to resume perf work later

Read: `perf-hardening-backlog.md` (P1 residual, P2–P5, T2) → ADR-U037. Measurement protocol lives in this bridge — reuse it; never 401 probes.
