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

`vercel.json` pins the Hub's functions to `dub1` (eu-west-1, the DB's region). [ADR-U035](../../architecture/decisions/ADR-U035-compute-datastore-colocation.md). ~700 ms → ~45 ms on `/groups`, zero architectural change. **This is why everything below is parkable** — with intra-region hops at ~1–2 ms, round-trip *count* stops being a latency emergency and becomes deliberate hardening.

---

## Parked items (run between Identity → Groups)

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
