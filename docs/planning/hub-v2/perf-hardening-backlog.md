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
| **T2** | **Server-render the initial page with its data** (Next.js RSC; data fetched via the Platform API server-side — API-first preserved) | **ADR** + `hub/CLAUDE.md` update (revisits the CSR lean) | One round-trip to a complete page. **Deprioritized 2026-07-01:** RSC does **not** fix cold starts (it runs in the same cold-startable function; a cold RSC page blocks *entirely*). The felt slowness was cold starts (fixed below), not the client waterfall — so T2 is now a nice-to-have, not the top lever. |

**Resume point + the full Tier-1 plan:** session bridge [`../sessions/2026-07-01_01_-_PERF-INVESTIGATION-COLOCATION-AND-CLIENT-RENDER-FINDING.md`](../sessions/2026-07-01_01_-_PERF-INVESTIGATION-COLOCATION-AND-CLIENT-RENDER-FINDING.md).

---

## Cold-start fix (2026-07-01) — Edge runtime for the hot read routes ✅ SHIPPED ([ADR-U036](../../architecture/decisions/ADR-U036-edge-runtime-hot-read-routes.md), PR #39)

After T1 shipped, live browser measurement of the *deployed* app found the residual "spinning wheel before each page" was **not** primarily the client-render waterfall — it was **serverless cold starts**:

- The Node lambda **cold-started at ~740–790 ms** on the first hit after idle (two independent samples, minutes apart); warm was **~115 ms** (just the Sweden↔Dublin RTT). Not the DB (401s return before any query), not the network.
- **Vercel Fluid Compute was already ON** and did not prevent it — on low traffic the function goes cold on multi-minute idle, so sporadic clicking re-pays the cold start on nearly every navigation.

**Fix:** `/api/account/state`, `/api/profile/me`, `/api/groups` → `runtime = 'edge'` + `preferredRegion = 'dub1'` (V8 isolate ~0 ms cold start, pinned to Dublin so ADR-U035 co-location is preserved). **Re-measured on the PR preview AND production:** cold-start penalty **gone** (first hit **285–313 ms** vs ~740–790 ms; steady ~115 ms), every `x-vercel-id` reads `arn1::dub1` (pin held; warm did not balloon to ~245 ms). **Runtime policy:** hot reads → Edge/`dub1`; mutations + Node-dependent routes (auth flows, `/api/account/export`) → Node.

**⚠ Parked (separate, bigger question — flagged 2026-07-01):** whether the platform-contract API routes should live **inside the Hub app** at all, or be realised as Supabase PostgREST RPC / an extracted platform service that every surface calls directly (Hub SPECIFICATION §4: *"sibling Surfaces consume the same Platform API directly; they do not call the Hub"*; Platform Core specs: *PostgREST RPC is canonical, custom Next.js routes are selective escape-hatches*). ADR-U036 is scoped to the routes **as currently co-hosted** and travels with them if they extract. Needs its own adjudication before more is built on the Hub-hosted-API pattern.

---

## Parked items (scale / cleanliness / hygiene — lower priority than T1/T2 above)

| # | Item | Effort | Form (no shortcuts) | Why / payoff |
|---|------|--------|---------------------|--------------|
| **P1** | `getUser()` → `getClaims()` (local JWT verification) across the read routes | ~½ day | **ADR** (auth-pattern/contract change) + verify/enable asymmetric JWT signing keys + change the 8 routes + security review + tests | Removes the per-request Auth round-trip; more importantly keeps the **Auth service** off the hot path at high user counts. Latency win is small *after L0* (intra-region) — this is a scale/robustness item. Trade-off to record in the ADR: `getClaims` trusts the JWT until expiry (won't catch mid-session revocation) — acceptable for reads + RLS-enforced, but state it explicitly. |
| **P2** | Collapse the `/groups` read (3 sequential queries) into **one `SECURITY DEFINER` RPC** (personal-group + memberships + groups + counts) | ~1 paired spec (platform RPC + Hub consumer) | Decompose like `get_own_consent_state` / `get_own_data_export`; migration through the schema gate | *More* API-first, not less — the platform does the work behind one contract. Fewer round-trips + fewer pooler checkouts at scale. Want the Groups area's query work fresh in mind → do this **at the boundary**. |
| **P3** | DB scale-readiness: `(select auth.uid())` sweep across **all** RLS policies + add the **14 FK covering indexes** + consolidate the **duplicate permissive policies** | migrations (schema gate) | Split into (a) zero-risk batch — `auth.uid()` wrap + additive FK indexes; (b) careful batch — permissive-policy consolidation (changes RLS logic; needs RLS regression tests) | 3 ms at 644 rows → keeps it 3 ms at 644k. The advisor's exact findings are the work-list (see Diagnosis). |
| **P4** | **Test isolation** — stop the suites running against **prod**; move to a Supabase **branch** (or local stack). Then purge the ~629 orphan groups + their memberships | ~ADR + CI/test-config change + a one-off cleanup migration/script | **ADR** (environment/architecture: where tests run) | Correctness + hygiene: tests currently mutate the production DB and leave orphans. Decouples test runs from prod data and from the prod DB's connection budget. |
| **P5** | Global-scale topology: **read replicas** per region + **edge caching** for cacheable reads; reconsider DB region (`eu-north-1`) if the base is Nordic-concentrated | large | ADR(s) + infra | **Future only** — when the user base goes genuinely global. Co-location (L0) is the correct single-region base until then. |

---

## Sequencing notes

- **Order at the boundary:** P3a (zero-risk DB wins) → P2 (groups RPC, pairs with Groups-area query work) → P1 (getClaims ADR) → P3b (policy consolidation, with RLS regression tests) → P4 (test isolation). P5 stays future.
- **Re-entry trigger:** planted in [`phase-3-identity-completion-plan.md`](./phase-3-identity-completion-plan.md) §"After Identity" so this backlog is consulted before Groups work begins.
- **Each item gets its own PR + (where noted) ADR.** Schema-touching items pause at the schema-review gate; ADRs and `platform/core/` changes pause for the merge nod.
