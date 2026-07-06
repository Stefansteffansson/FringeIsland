# ADR-U042: First-paint bootstrap read — a BFF bundle, not a platform RPC

**Status:** Accepted (nod 2026-07-06)
**Date:** 2026-07-06
**Deciders:** Stefan + Claude (from the measured groups first-load investigation)
**Tags:** scope:product (Hub BFF + shell providers) · wave:ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

Measured 2026-07-06 (investigation + waterfalls: `docs/planning/hub-v2/2026-07-06-groups-first-load-perf.md`): the post-login `/groups` first paint fires **five parallel BFF reads** — `/api/groups`, `/api/me/invitations`, `/api/me/nominations`, `/api/account/state`, `/api/profile/me`. On a cold deployment each pays its own function boot: measured 2.9–4.75 s TTFB per route, ≈ 7 s from sign-in click to rendered list. PR #102 (Phase 1) removed the duplicate-fetch multiplier and added session caching — revisits now paint instantly — but the **true-first-visit cold stack remains: five boots for one paint**.

The five reads are all existing platform contracts; the question is purely how the Hub transports them at first paint.

## Decision drivers

- **One function boot per first paint, not five** — the only cold-relevant variable in our control before the Vercel-layer work (Phase 3).
- **Anatomy:** platform contracts stay surface-agnostic (ADR-U038); the Hub's first-paint bundle is surface-shaped (its contents = what the Hub happens to render at landing).
- **No rule may have its sole home in a Surface route** (ADR-U038 clause 1).
- **Privacy:** the bundle returns only what first paint needs — no over-fetch (`docs/verticals/privacy/SPECIFICATION.md` §Surfaces).
- The five standalone reads remain canonical — siblings (the Gimbal, Studios) inherit *them*, never the bundle.

## Considered options

- **Option A** — platform RPC `get_me_overview()` (SECURITY DEFINER; one DB round trip; composition substrate-side).
- **Option B** — Hub BFF bundle route `GET /api/me/overview` fanning out to the five existing substrate reads **in parallel** inside one Edge invocation.
- **Option C** — status quo (five calls) + attack cold boots at the infrastructure layer only.

## Decision outcome

**Chosen option: B.** One Edge invocation, five concurrent substrate reads, one auth verification. The guardrails below are the load-bearing part of the decision:

1. **Bundle-only.** The route may aggregate and shape; it may never *decide*. No filtering, no derivation, no authorization beyond what the five substrate reads already enforce. Each slice stays payload-equivalent to its standalone contract read, asserted by contract tests — the day the route decides something, CI breaks before the anatomy does.
2. **Per-slice envelopes.** Each slice resolves to `{ data }` or `{ error }` independently; one failed slice does not fail the paint. Slice failures are logged server-side (observability §7 — structured, content-free), never silently swallowed into an empty section.
3. **Standalone routes remain canonical and untouched.** The bundle is a transport optimization the Hub may drop at any time without contract loss.
4. **Promotion rule.** A composition moves substrate-side (platform RPC) only when it becomes a genuine platform concept — the evidence bar: a second surface wants the *same* bundle. Until then it is Hub presentation.
5. **Hot-read policies apply:** `runtime='edge'`, `preferredRegion='dub1'` (ADR-U036), `getClaims()` local verification (ADR-U037).
6. **Consumer shape:** an `OverviewProvider` in the Hub shell fires the bundle once per session at auth-ready and revalidates on groups-surface mount; slices seed the existing session caches (profile, groups — PR #102) and feed `MyInvitations` / `PendingNominations` / account state, which stop self-fetching at first paint.

### Consequences

- Cold first paint: **one** boot instead of five stacked; warm bundle ≈ RTT + max(five reads) ≈ ~300 ms.
- One more route to maintain, bound to the standalone reads by slice-equivalence tests.
- Supersedes the platform-RPC recommendation recorded in `docs/planning/hub-v2/2026-07-06-groups-first-load-perf.md` §5/§6 (corrected in the same PR).

## Pros and cons of each option

### Option A — platform RPC
Letter-clean under U009/U038 (everything substrate-side; sibling-consumable via PostgREST). But: **ownerless** — the bundle spans Identity (profile, account state) and Organisation (groups, invitations, nominations), so no platform entity's L3 inventory can own it; **surface-shaped** — its contents churn with the Hub's landing UI, and a differing Gimbal first paint breeds `get_me_overview_*` variants (surface leakage into the substrate — the inverse of the FEAT-H001 F2 case, where "the groups a member belongs to" is a surface-agnostic platform concept). Also: migration + schema gate + L3/L4 ceremony. Warm ≈ RTT + **sum**(queries) — PL/pgSQL executes serially.

### Option B — BFF bundle (chosen)
Anatomy-true: a surface-shaped concern lives in the surface's BFF — the thing ADR-U038 built the BFF layer *for*. No schema. Warm ≈ RTT + **max**(queries) — the parallel fan-out ties or beats the RPC. Risk: rule-drift into the route over time — held by guardrail 1 + contract tests.

### Option C — status quo
No code risk; leaves the true first visit at ~7 s until infrastructure work proves out; keeps five auth verifications per paint.

## Links

- Investigation, measured waterfalls, conformance addendum: `docs/planning/hub-v2/2026-07-06-groups-first-load-perf.md`
- Phase 1: PR #102 (single-fire read + session cache)
- ADR-U036 (Edge + dub1), ADR-U037 (local JWT verification), ADR-U038 (platform contracts / Surface BFF, clauses 1–3), FEAT-H001 finding F2 (the promotion precedent)
- Verticals: `docs/verticals/observability/SPECIFICATION.md` §7, `docs/verticals/privacy/SPECIFICATION.md` §7
