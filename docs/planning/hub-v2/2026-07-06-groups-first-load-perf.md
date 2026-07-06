# Groups first-load performance investigation — 2026-07-06

**Status:** diagnosis complete, fix plan proposed (not yet implemented).
**Symptom:** post-login redirect to `/groups` shows the spinner for 3-5 s (measured 6.1 s fully cold). Other pages show the same after long idle.
**Method:** live authenticated waterfall on production (per the ADR-U037 lesson: measure the real path, not a proxy), plus code-path trace and Supabase advisor check.

---

## 1. Measured evidence

Production deployment `fringe-island-jn09487f0`, signed-in session, `/groups` page.

### Warm reload (functions warm)
| Stage | Timing |
|---|---|
| Document TTFB | 10 ms |
| Hydration done (domInteractive) | ~465 ms |
| API burst starts | ~470 ms |
| `/api/profile/me` | 223 ms |
| `/api/me/invitations` | 346 ms |
| `/api/me/nominations` | 493 ms |
| `/api/account/state` | 305 ms |
| `/api/groups` ×3 (duplicates) | 325 / 533 / 710 ms |
| **Spinner clears** | **~1.18 s** |

### Cold reload (~15 min idle; session token still valid, so no auth-refresh contribution)
| Stage | Timing |
|---|---|
| Document TTFB | 40 ms |
| Hydration done | ~880 ms |
| API burst starts | ~892 ms |
| `/api/profile/me` TTFB | 3 124 ms |
| `/api/me/invitations` TTFB | 4 468 ms |
| `/api/account/state` TTFB | 4 594 ms |
| `/api/groups` TTFB (first) | 4 712 ms |
| `/api/me/nominations` TTFB | 4 723 ms |
| `/api/groups` #2 / #3 complete | 5.9 s / 6.07 s |
| **Spinner clears** | **~6.1 s** |

Facts established:

- `x-vercel-id: arn1::dub1` — region pinning works (ADR-U036 intact).
- All five first-paint routes are `runtime='edge'`, `preferredRegion='dub1'`, and use local-JWT `getClaims()` (ADR-U037 intact).
- The session token was ~35 min old during the cold measure — **GoTrue refresh contributed nothing to the 3-4.7 s**; that cost is Vercel-side cold function boot/queueing.
- The DB path is not the problem: warm end-to-end per route is 150-500 ms, and the staggered cold completions (3.1 / 4.5 / 4.6 / 4.7 / 4.7 s) point at instance-level boot + queueing, not query time.

## 2. Root causes (ranked)

**RC1 — Cold function boot dominates (3.1-4.7 s TTFB on every route after idle).**
All five routes pay it simultaneously; completions stagger as if queueing on shared instance boot. Needs one confirming look at Vercel function logs (boot duration; what infrastructure the deprecated `edge` runtime actually runs on now). Five concurrent first-paint calls make one cold visit pay the worst-case boot five ways.

**RC2 — `/api/groups` fetched three times per load.**
`hub/app/groups/page.tsx:41-53`: the load effect is keyed on the `user` **object reference**. `hub/lib/auth/AuthContext.tsx:74-88` emits a new `User` reference on each auth event during hydration (`getSession()` resolve → `INITIAL_SESSION` → `TOKEN_REFRESHED`), so the effect fires up to three times; `loadGroups` has no in-flight guard and no cache. The spinner clears only on the **last** completion. On a true post-login or token-expired load the auth events are spread out by GoTrue round trips (250-750 ms each), stretching the spinner further — this is the multiplier on top of RC1 that the user feels at sign-in.

**RC3 — Structural client waterfall.**
`/groups` is a `'use client'` page; no server prefetch. The data fetch cannot start until document → JS bundle → hydrate → client `getSession()` (the `authLoading` gate) — ~0.9 s cold before the first byte of data is even requested.

**RC4 — Five separate first-paint BFF calls.**
Each pays middleware `getClaims` + route `getClaims` + its own DB round trip. No shared bootstrap fetch.

**RC5 — No caching of the groups list.**
Plain `useState`; every mount refetches. Prior art exists and was not adopted here: session-cached profile client (`hub/lib/profile/client.ts`), once-per-session `AccountStateProvider`, non-blocking `AccountStateView` (2026-07-01 revision).

**Ruled out:** H018 revealed-visibility RLS (`get_member_groups()` is `SECURITY DEFINER` — RLS bypassed on this read; migration `20260702130100_grp4_member_groups_contract.sql`); region mismatch; `auth_rls_initplan` (advisors clean on public tables); DB latency.

## 3. Fix plan

### Phase 1 — stop the bleeding (Hub-only, no schema, small diffs) — **IMPLEMENTED 2026-07-06**
1. **Single-fire fetch** — DONE: effect keyed on `user?.id`; the shared in-flight request in `fetchMyGroups` is the guard. Kills fetches #2/#3 and the auth-event multiplication (RC2). Regression test: `hub/tests/unit/app/groups/groups-page.test.tsx` (auth-reference-churn case).
2. **Stale-while-revalidate groups cache** — DONE: `peekMyGroups`/`fetchMyGroups`/`invalidateGroupsCache` in `hub/lib/groups/client.ts` (profile-client prior art; in-memory only per the §6 conformance condition; dropped by the AuthContext listener on session end). Cache semantics: `hub/tests/unit/lib/groups/client-cache.test.ts`.
3. **Scoped down:** `MyInvitations` / `PendingNominations` keep their direct fetches — they render `null` until loaded (never gate the spinner), and Phase 2's shared provider subsumes them; a cache there now would only add test churn. `AccountStateProvider` verified once-per-session (effect keyed on derived `identity` + `nonce`, not the user object — token refresh cannot refire it).

### Phase 2 — collapse the first-paint fan-out (RC4, halves RC1 exposure) — **IMPLEMENTED 2026-07-06 (ADR-U042 shape; post-deploy verification pending)**
4. Landed as the ADR-U042 BFF bundle (not the RPC this line originally sketched — see §5.1): `GET /api/me/overview` (Edge + `dub1` + `getClaims`) runs the five existing substrate reads concurrently in one invocation with per-slice envelopes; `OverviewBoot` (first child inside `AuthProvider`, so its same-commit effect wins the traversal race) fires it once per session for a FIM on the boot paths (`/`, `/login`, `/groups`); each slice is adopted by its resource client (consume-once for the list reads; the profile/account clients keep their once-per-session semantics; a bundle transport failure falls every consumer back to its standalone read). Tests: `me-overview-route.test.ts`, `overview-client.test.ts`, `OverviewBoot.test.tsx`.
   - ~~*Alternative:* server-component prefetch~~ — non-conformant, dropped (§6).

### Phase 3 — the cold boot itself (RC1 at the root) — **INVESTIGATED 2026-07-06; premise overturned**
5. **Finding: Edge cold-boot is NOT the villain.** Unauthenticated probes on the stable domain `fringe-island.vercel.app` (functions idle ~2 h, `x-vercel-id: arn1::dub1`): `/api/me/overview` first hit **153 ms**, `/api/groups` first hit **187 ms**, warm repeats 112-152 ms. Function boot ≈ 30-70 ms — ADR-U036's Edge premise holds; Vercel's runtime is not the problem. The multi-second "cold" cost in the authenticated waterfalls was **fresh-isolate connection setup to Supabase (TLS + pooler acquisition), multiplied across five concurrent isolates and contended** — which is exactly why collapsing to one function (Phase 2) was the real fix, not a boot fix. (Classic measure-the-real-path corollary: the 401 probe isolates boot, and boot is innocent.)
6. **Fluid compute ENABLED (Stefan, 2026-07-06).** Governs the Node-runtime routes (mutations + `/api/auth/audit`), not the Edge read path — so it does **not** change the already-fixed My Groups numbers. It softens Node cold starts (helping the audit hop and PR #106's two Edge→Node mutation routes) and pre-positions the project for a future Edge-runtime-deprecation ADR (Vercel is steering toward Node+Fluid). Keep-warm pings: not needed.
   - **Stable-domain testing habit:** test on `https://fringe-island.vercel.app` (public, always-latest-prod, accumulates warmth), NOT the per-deploy `fringe-island-<hash>` URLs (SSO-walled, guaranteed cold every visit).
7. **Withdrawn (2026-07-06 conformance check):** browser-direct PostgREST reads were considered and **rejected as Option B in ADR-U038** (L34, L61-63), and `docs/products/hub/CLAUDE.md` L22 forbids browser table reads/writes outright. Pursuing this would mean reopening ADR-U038 — not proposed. (The earlier draft of this line mis-cited ADR-U038 as sanctioning the idea; corrected.)

### Phase 4 — verify like ADR-U037 — **MEASURED 2026-07-06 (post-PR #102, deployment `fringe-island-8hyj63dks`)**
8. Re-measured the real authenticated waterfall on a fresh production deployment, network tracking armed from the first request, true post-login pass (Stefan signing in live):
   - **RC2 fixed:** exactly **one** `GET /api/groups` on the post-login `/groups` load (was three). One each of `invitations` / `nominations` / `profile` / `account/state`.
   - **RC5 fixed:** client-side revisit (`/groups` → home → back) painted the list **with no spinner at all** (MutationObserver on `[data-testid="loading-state"]` across the whole transition: never appeared) while one background revalidate ran (`/api/groups` 596 ms warm). `profile/me` and `account/state` were **not** re-fetched — the session caches hold.
   - **RC1 remains, as predicted:** the fresh-deploy cold boots still cost 2.9-4.75 s TTFB per route (`account/state` 4 750 ms fired at sign-in; `groups` 4 700 ms / `invitations` 4 576 ms / `nominations` 4 648 ms / `profile` 2 946 ms in the post-redirect burst), and `/api/auth/audit` (1 166 ms cold) serializes between sign-in and the redirect. First-ever visit ≈ 7 s sign-in-click → list. This is Phase 2/3 territory (one bootstrap call; Vercel-layer confirmation).

9. **Phase 2 verified live (deployment `fringe-island-b0n46lhi6`, post-PR #103, true post-login pass on a stone-cold deployment):**
   - **RC1/RC4 collapsed:** the post-login path fired **one** `GET /api/me/overview` (1 385 ms cold — a single boot, no instance queueing) and **zero** calls to the five standalone routes; every consumer resolved from the bundle (no transport fallbacks fired). `OverviewBoot` armed on `/login` at auth-ready, before the redirect, as designed.
   - **Sign-in click → fully painted list: ~2.4 s** (was ~7 s) — decomposed: Supabase token exchange 996 ms + `/api/auth/audit` 691 ms (the only serialized route left) + overview 1 385 ms overlapping the redirect/hydration.
   - **Revisit unchanged-correct:** instant paint, spinner never appeared (MutationObserver), three background revalidates (`groups` / `invitations` / `nominations`) — consume-once semantics confirmed.
   - **Remaining levers (Phase 3 / retro):** the audit hook serializes ~0.7 s between sign-in and redirect (could be made non-blocking); Vercel-layer confirmation (Fluid compute, what `edge` runtime maps to) still unexamined; suggested < 2 s first-ever budget is nearly met at ~2.4 s, of which ~1.0 s is the auth exchange itself.

**Tests (TDD, red-first):** unit test asserting the groups effect fires exactly once across a simulated `getSession → INITIAL_SESSION → TOKEN_REFRESHED` event sequence (regression for RC2); contract/integration test for the bootstrap endpoint; E2E assertion on spinner-clear budget.

## 4. Expected impact

| Scenario | Today | After Phase 1 | After Phases 2-3 |
|---|---|---|---|
| Warm repeat visit | ~1.2 s spinner | instant (cached) + silent refresh | instant |
| Cold after idle | ~6.1 s spinner | instant if visited before (cached); else ~1 boot + fetch | single cold boot, bounded |
| Post-login redirect | 3-5 s (multiplied fetches) | single fetch, starts at auth-ready | single bootstrap call |

## 5. Open decisions (retro input)

1. ~~Phase 2 shape~~ **Resolved — ADR-U042 (2026-07-06):** server-component prefetch is non-conformant (ADR-U009 L16; hub CLAUDE.md L23). The sub-decision landed as the **BFF parallel fan-out** (Option B), superseding this doc's earlier platform-RPC recommendation: the bundle is surface-shaped (no platform L3 owner — spans Identity + Organisation; contents churn with Hub UI), the F2 precedent covers surface-agnostic platform concepts not first-paint bundles, and the parallel fan-out's warm cost (RTT + max of the reads) ties or beats the RPC's serial execution (RTT + sum). Guardrails (bundle-only, per-slice envelopes, slice-equivalence tests, promotion rule) are canonical in ADR-U042.
2. ~~Phase 3.7 direct-PostgREST~~ **Withdrawn** — already rejected as ADR-U038 Option B (see Phase 3 note).
3. Perf budget: acceptable ceiling for a true first-ever cold visit (suggest < 2 s to content).
4. Vendor question (Cloudflare etc.): contingency only; any deployment-platform move is ADR territory (ADR-U036's runtime/region policy is premised on Vercel infrastructure). If Vercel's Edge-runtime deprecation invalidates U036's premise, record an ADR addendum either way.

## 6. Architecture conformance check (2026-07-06 addendum)

Canon verified against: ADR-U009, ADR-U036, ADR-U037, ADR-U038 (decision texts), `docs/products/hub/CLAUDE.md`, verticals SPECIFICATION §7 checklists, `AGENTS.md:75`. `ARCHITECTURE_ANATOMY_V1.md` is marked **superseded** (L5-7) and is not binding.

| Fix | Verdict | Binding conditions |
|---|---|---|
| 1.1 effect key on `user?.id` + in-flight guard | **Conformant** | None — client bug fix, no data-layer change. |
| 1.2/1.3 SWR session cache (groups, invitations, nominations) | **Conformant with conditions** | Cache the **BFF response**, never direct table reads (hub CLAUDE.md L22). **In-memory only** — no localStorage/sessionStorage: no canonical rule covers browser persistence of personal data (open gap; privacy spec's device-local "kindness" at `privacy/SPECIFICATION.md:92` is Mist-scoped only). Clear on sign-out auth event. Invalidate via `refreshNavigation` (canonical cross-component update event, hub CLAUDE.md L37). Follow `hub/lib/profile/client.ts` / `AccountStateContext.tsx` prior art. |
| 2 bootstrap endpoint `GET /api/me/overview` | **Conformant with conditions** | (i) The multi-domain composition must live substrate-side as a **SECURITY DEFINER platform RPC** if it is a contract siblings inherit — ADR-U038 clause 1 + FEAT-H001 finding F2 precedent (`FEAT-H001:119`); Hub route stays a thin proxy. (ii) Edge + `dub1` + `getClaims()` — prescribed by U036 L53 / U037 L44-46 for hot render-path reads. (iii) Verticals §7: structured log + metric + data-access audit event, RLS denials recorded not swallowed, content-free log payloads (`observability/SPECIFICATION.md:119-129`); return only what first paint needs — "never over-fetch and filter client-side" (`privacy/SPECIFICATION.md:118`). (iv) New RPC = migration → **schema-review gate** (fuller-auto carve-out); spec'd with mandatory Vertical Impact section (`AGENTS.md:75`). |
| 2-alt server-component prefetch | **Non-conformant — dropped** | ADR-U009 L16; hub CLAUDE.md L23. |
| 3.5/3.6 Vercel infra verification / Fluid compute | **Conformant** | Deployment config, "changes no contract, schema, or anatomy" (U036 L8). If findings invalidate U036's Edge-runtime premise, write an ADR addendum. |
| 3.7 browser-direct PostgREST | **Non-conformant — withdrawn** | Rejected as ADR-U038 Option B; hub CLAUDE.md L22. |

Cross-cutting: BFF response composition has prior art (FEAT-H014 `{fabric, templates}`, FEAT-H011 `/api/account/export`); no rule prohibits cross-domain read aggregation. Flag for verticals backlog: the client-side-persistence gap above deserves a Privacy §7 line eventually.

## Appendix — key files

`hub/app/groups/page.tsx` · `hub/lib/auth/AuthContext.tsx` · `hub/app/api/groups/route.ts` · `hub/lib/groups/queries.ts` · `hub/lib/profile/client.ts` · `hub/proxy.ts` · `hub/lib/supabase/middleware.ts` · `supabase/migrations/20260702130100_grp4_member_groups_contract.sql` · ADR-U036 · ADR-U037 · ADR-U038 · `docs/planning/hub-v2/perf-hardening-backlog.md`
