# ADR-U038: Platform contracts live platform-side; Surface API routes are private BFF plumbing

**Status:** Accepted (Option A approved 2026-07-02, Stefan)
**Date:** 2026-07-02
**Deciders:** Stefan + Claude (from the API-boundary conformance audit)
**Tags:** scope:platform + scope:product (Hub) · wave:ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

The Hub v2 rebuild realises platform contracts (Identity, consent, groups read) as Next.js routes inside `hub/app/api/`, with some logic in `hub/lib/*`. The question — parked at Stefan's request in session bridge `2026-07-01_03` and adjudicated now with evidence — is: **where do platform-contract endpoints live, and where must their logic be enforced?**

The canon was in tension with itself:

- Hub SPECIFICATION §5: *the Hub exposes no public API; sibling Surfaces consume the same Platform API directly.*
- PC-3 organisation-specification §3/§7: *PostgREST RPC is the canonical realized public HTTP API surface; custom Next.js routes apply only per the three-justification rule (cross-table mutations / external service-role calls / multi-step transactions); default is "expose via PostgREST RPC."*
- Hub `CLAUDE.md` (line 23): *"Business logic lives in `app/api/...` route handlers … so iOS and Android inherit them"* — a mis-encoding: native Gimbal clients can never call Hub route handlers.

The 2026-07-02 audit ([`../../planning/hub-v2/api-conformance-register.md`](../../planning/hub-v2/api-conformance-register.md)) measured the v2 surface: 9 Hub-hosted routes, of which 7 are thin proxies over platform-owned SECURITY DEFINER RPCs, and 2 (`/api/profile/me`, `/api/groups`) carry platform logic only in Hub code. It also confirmed empirically that a BFF layer cannot be the enforcement layer: everything the Hub gates in TypeScript was reachable un-gated via direct PostgREST (findings S1 — consent-bypass via own-row `is_temporary` write; S2 — email over-exposure through `users_select_active`; S3 — sign-up consent enforced only in the Hub route and never durably recorded).

## Decision drivers

- **Sibling-surface inheritance (ADR-U009's purpose):** the Gimbal must inherit every platform rule without reimplementing it — impossible if rules live in Hub route handlers.
- **Enforcement reality:** PostgREST is directly reachable with the public anon key; any rule not enforced in the substrate (RLS / triggers / grants / SECURITY DEFINER RPCs) is not enforced at all.
- **Minimal delta:** 7 of 9 shipped routes are already thin proxies over platform contracts; the substrate already carries REVOKE/guard discipline.
- **Perf decisions must survive:** ADR-U035/U036/U037 attach to the routes as currently co-hosted.

## Considered options

- **Option A — Hub routes are a private BFF; every platform contract must exist platform-side.**
- **Option B — Pure PostgREST: the browser consumes RPCs directly; delete most Hub routes.**
- **Option C — Extract a standalone Platform API host now.**

## Decision outcome

**Chosen option: Option A.** Five clauses:

1. **The Surface-BFF pattern is legitimate, with hard limits.** A Surface MAY host API routes for its own plumbing: cookie/session handling, presentation mapping (SQLSTATE→HTTP, download headers), telemetry seams, response shaping. A Surface route may NEVER be the sole home of a platform rule — every business rule, authorization decision, and consent/lifecycle invariant is enforced in the substrate (RLS, column privileges, triggers, SECURITY DEFINER RPCs). App-layer gates are UX/defense-in-depth only.
2. **PostgREST RPC remains the canonical Platform API HTTP surface** (reaffirming PC-3 §3/§7). Sibling Surfaces (the Gimbal, Studios) consume it directly. Custom *platform-hosted* routes remain governed by the three-justification rule.
3. **Versioning and auth-header rules bind the platform surface, not BFF plumbing.** ADR-U015 (`/api/v1/`) and the Bearer-token contract (platform `CLAUDE.md`) apply to platform-owned endpoints — PostgREST function signatures (versioned per PC-3 §7 deprecation rules) and any future platform-hosted custom routes. Hub-internal BFF routes are product-internal plumbing: cookie-session auth and unversioned paths are compliant *for them*. This resolves the "directional `/api/v1` + Bearer" deviations (register V1/V2) by definition rather than by migration.
4. **Hub `CLAUDE.md` line 23 is superseded.** New wording (steering-file edit, separate approval): *"Platform rules live in the platform substrate; Hub `app/api/` routes are private BFF plumbing (session handling, presentation, telemetry) and must never be the only place a rule is enforced. Server components render; they don't author logic."*
5. **ADR-U035/U036/U037 carry forward unchanged** and travel with the BFF routes if any are ever extracted.

### Consequences

- **Positive:** the Gimbal consumes the same contracts the Hub does, from day one of its build; enforcement is uniform for every caller, polite or hostile; the shipped v2 code needs relocation of only two contracts.
- **Corrective work (tranche 1, substrate enforcement — schema gate applies):** S1 column-privilege hardening on `public.users` (client UPDATE limited to the FEAT-PC003 identity-scope set); S2 revoke client SELECT on `users.email`; S3 sign-up consent enforced + durably recorded in `handle_new_user` (same `transcendence` purpose — the foundational membership agreement — with `capture_context.flow = 'credentialed-signup'`).
- **Corrective work (tranche 2, contract relocation):** `update_own_profile()` RPC (F1) and `get_member_groups()` RPC (F2); the Hub routes become thin proxies.
- **Negative / accepted:** client roles lose `select('*')` on `public.users` (Postgres expands `*` into revoked columns) — consumers name columns explicitly. Future admin mutations on users go through platform RPCs (the Administration vertical's posture anyway), not direct table writes.
- **Docs:** PC-3 §7's stale route inventory is replaced with a pointer (pointer-not-snapshot); FEAT-PC003/GRP-4/FEAT-H002 amended as the tranches land.

## Pros and cons of each option

### Option A — private BFF + platform-side contracts (chosen)
- Pros: matches 7/9 of the shipped surface; keeps server-side seams (telemetry, Server-Timing, HTTP mapping, consent defense-in-depth); smallest diff; resolves V1/V2 cleanly; Gimbal-ready.
- Cons: two places to read a request path (route + RPC); discipline required so BFF convenience never re-becomes enforcement (guarded by the new DoD row, retro GP2).

### Option B — pure PostgREST from the browser
- Pros: purest reading of PC-3 §7; deletes a layer.
- Cons: loses all server-side seams; large churn in `lib/*/client.ts` + tests; ADR-U036 Edge work becomes moot; no enforcement gain (S1–S3 are substrate fixes either way).

### Option C — standalone Platform API host
- Pros: cleanest long-term boundary if PostgREST proves insufficient.
- Cons: premature with one surface and zero realised Domain Services; adds an ops surface now for a hypothetical consumer; PC-3 §3 already names PostgREST as the realized surface.

## Links

- Evidence: [`../../planning/hub-v2/api-conformance-register.md`](../../planning/hub-v2/api-conformance-register.md) (baseline, per-route verdicts, findings S1–S3/F1–F3/V1–V2)
- Retro (why the drift happened + gate patches): [`../../planning/retrospectives/2026-07-02-api-boundary-compliance-retro.md`](../../planning/retrospectives/2026-07-02-api-boundary-compliance-retro.md)
- Related ADRs: U009 (API-first — this ADR pins *where* the API lives), U015 (versioning — scope clarified in clause 3), U030 (v2 rebuild), U034 (consent substrate), U035/U036/U037 (carry forward)
- Canon: Hub SPECIFICATION §5; PC-3 organisation-specification §3/§7
