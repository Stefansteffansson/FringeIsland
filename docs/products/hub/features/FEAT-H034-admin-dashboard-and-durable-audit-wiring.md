# FEAT-H034: Admin dashboard & durable audit wiring — the Platform-Ops surface opens

---
id: FEAT-H034
title: Admin dashboard & durable audit wiring — the permission-gated /admin entry with live platform statistics, plus the four auth-moment audit calls and the telemetry helper going durable
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

A-ADM opens with no admin surface at all in v2: a platform admin (DeusEx member) has nowhere to see the platform, and ADM-1 (Hub §L3) names the dashboard as the area's root capability (every other ADM row lists it as internal dependency). Meanwhile the Hub's audit seam still writes console-only (`hub/lib/audit/audit.ts` — the AC-6/AC3-O6 TODO, four callers, three GDPR-relevant) and `emitTelemetry` has no durable leg. Cycle ADM-A ships the platform half as FEAT-PC018/FEAT-PC019; this feature is the surface half: the gated dashboard, and the wiring that ends the console-only era.

## Solution sketch

- **`/admin` route group** — the AB-7 shape: Console-routed surfaces live in the Hub shell under one distinct admin section; the Console-as-entity question stays deferred (ADR-U028/U025), recorded not reopened.
- **Gated entry:** nav link rendered only for platform admins (derived from a BFF probe of the statistics read — never role-string matching, per the products-tier rule); direct navigation by a non-admin gets a 404-shaped refusal (no existence leak). BFF route `GET /api/admin/statistics` wraps `get_platform_statistics()` (presentation-only per ADR-U038: SQLSTATE→HTTP, no rule of its own — `42501` → 404).
- **Dashboard render:** four tiles + a 30-day activity trend, keyed exactly to the walked payload (FEAT-PC018's walk table); an "as of" caption from `generated_at`; a refresh affordance; B6 skeleton while loading. Design-system primitives only, tokens only, jest-axe green (the COR-C lattice from first commit).
- **Durable audit wiring:** `lib/audit/audit.ts` gains a persist path calling `record_auth_event` with the route's session-bound server client — **awaited-but-non-fatal** (a refusal or failure logs + keeps the console/telemetry mirror; it never fails the auth flow). All four callers wired (sign-up post-session-establishment, sign-in, transcend, farewell); the stale `A-OPS` area naming in the file's comments corrected to A-ADM; the TODO discharged.
- **Durable telemetry leg:** `lib/observability/telemetry.ts` gains an optional server-side durable path via `record_telemetry_event` (client passed in; fire-and-forget). Adopted now by the four auth routes and the new admin route; the remaining BFF emission sites are swept mechanically in the same cycle task — sites not yet swept are enumerated at build, never silently capped.

## Appetite

Moderate: one new page + BFF route + two lib wirings + the sweep. The risk sits in the wiring semantics (non-fatal must be genuinely non-fatal on every auth path) and in gate compliance for a brand-new page family (first page born under tokens + axe + composition-column gates).

## Rabbit holes

- **Don't build ADM-2..18 affordances.** The dashboard links nowhere yet; member/group/moderation consoles are ADM-B/C/D. A "quick user search box" here is scope creep into ADM-2.
- **Don't put the admin probe in the overview bundle.** Admin state is not member-first-paint data (ADR-U042 guardrail); the standalone read is the justified shape.
- **Don't cache admin status client-side across sessions.** Derive per mount from the probe; a stale "is admin" render is a correctness bug even when the API refuses correctly.
- **Don't let the signup wiring block on audit.** The row is written after the session exists; if signup completes but audit refuses, the member is in and the failure is logged — that ordering is the feature.

## No-gos

No admin actions of any kind (read-only surface). No feature flags, policy editors, or audit-log viewer (ADM-D / deferred rows). No new realtime channel (the dashboard is fetch-based; a live-updating dashboard is unrequested). No browser-side telemetry emission.

## Stories

### STORY-1: Gated entry
As a platform admin, I want an /admin entry that exists only for me, so platform operations have a home without leaking its existence.

**Acceptance criteria:**
- Given a DeusEx member, when any page renders, then the admin nav entry is present; given any other member or a Mist, it is absent.
- Given a non-admin navigating to `/admin` directly, when the page loads, then a 404-shaped refusal renders (no admin chrome, no distinct "forbidden" signal).
- Given an admin's session expires mid-visit, when the statistics read refuses, then the surface degrades to the refusal state rather than rendering stale numbers.

### STORY-2: Statistics render
As a platform admin, I want the platform's live numbers at a glance, so ADM-1 is real.

**Acceptance criteria:**
- Given the statistics payload, when the dashboard renders, then Members (total/active/mists), Groups (total/engagement), Journeys (active enrollments/completions-30d) tiles and the 30-day activity trend render from exactly the walked keys, with the "as of" caption from `generated_at`.
- Given a pending load, then a skeleton renders (B6); given a failed load, a visible error state with retry — never a frozen or empty-zero dashboard.
- Given the refresh affordance is used, then feedback appears within 100 ms (B5) and tiles update from the fresh payload.

### STORY-3: Durable audit wiring (the AC-6 discharge)
As the platform, I want the four auth moments durably audited through the platform contract, so the console-only era ends without endangering a single sign-in.

**Acceptance criteria:**
- Given each of the four flows (sign-up, sign-in, transcend, farewell), when it completes, then `record_auth_event` was invoked with the existing action string and the durable row exists (E2E-verifiable via the platform suite's read).
- Given the recorder fails or refuses, when any of the four flows runs, then the flow still succeeds, the console + telemetry mirror still fire, and the failure is logged.
- Given the codebase, then no `A-OPS` naming remains and the audit TODO comment is gone.

### STORY-4: The telemetry helper goes durable
As the platform, I want `emitTelemetry` to persist server-side where a client is available, so the emit discipline and the sink meet.

**Acceptance criteria:**
- Given a BFF call site passing its server client, when `emitTelemetry` fires, then a `telemetry_events` row lands (fire-and-forget — a sink failure never surfaces to the request path).
- Given call sites not yet passing a client, then behavior is unchanged (console mirror), and the build's sweep list enumerates every remaining site — no silent cap.

## Platform dependencies

FEAT-PC018 (`get_platform_statistics`, `record_telemetry_event`) and FEAT-PC019 (`record_auth_event`) — both consumed API-first; this feature carries **no migration of its own**. Admin gating derives from the platform's own refusal (`is_platform_admin()` inside the contract), never computed Hub-side.

## Cross-product impact

The Gimbal inherits the contracts, not this shell — dashboard chrome is Hub shell; the audit/telemetry wiring pattern (awaited-but-non-fatal, mirror retained) is the reference for the Gimbal's own BFF-equivalent layer. Equipment note: reading a dashboard needs no special equipment (`none`); nothing here is canvas-restricted by choice.

## Vertical impact

- **Privacy/GDPR:** the dashboard renders aggregates only — no per-member data on screen; the audit wiring writes content-free metadata; nothing new is collected browser-side.
- **Notifications:** None (no member-visible state changes).
- **Administration:** this is V1's first v2 surface — read-only by design; every later admin action (ADM-B/C/D) will land on this shell already gated and audited.
- **Observability:** the feature both consumes the sink (trend tile) and feeds it (durable emissions); load/refusal errors are visible states, never swallowed.
- **Transactions:** None.
- **Extensibility:** tiles key off the versioned payload — additive keys render as additive tiles without breaking existing ones; no admin-role string appears anywhere (permission/refusal-derived gating only).

## Performance budget

- **First-paint class:** B2 (cold nav) / B3 (warm nav) for `/admin`; data-boot is a **justified standalone read** (admin-only surface, deliberately outside the overview bundle per ADR-U042 guardrail 3).
- **Interaction class:** refresh affordance — feedback within 100 ms (B5); no other interactions at risk.
- **Loading states:** skeleton tiles (B6, 1–3 s class); a load beyond 3 s is a defect to fix platform-side, not to spinner over.

## Implementation notes (6-done, 2026-07-31)

**Files:** `app/admin/page.tsx` + `components/admin/{AdminDashboard,StatTile}.tsx` (the trend is deliberately a semantic table, not a chart — v1 wants legible numbers); `app/api/admin/statistics/route.ts` (ADR-U037 read-path identity; 42501→404 existence-hiding map) + `lib/admin/queries.ts`; the gated menu entry in `components/shell/AccountMenu.tsx` (lazy probe of the admin read, sessionStorage-cached — at most one extra request per member per browser session; permission-derived, never a role string).

**Audit wiring (STORY-3):** `lib/audit/audit.ts` gains `persistAuditEntry()` (awaited-but-non-fatal; mirror retained; `A-OPS` naming and the AC-6 TODO gone). All four callers wired with the **live** action strings (`auth.sign_in`, `account.created`, `identity.transcended`, `mist.explicit_erase`). Two ordering/content decisions surfaced at build: the **farewell persists BEFORE the erase** (the only attributable moment; the row survives actor-less per the FEAT-PC019 S2 proof), and the **sign-in email stays out of the durable row** (console mirror keeps it; durable metadata is content-free). The sign-up pending-confirmation edge stays mirror-only, recorded.

**Telemetry (STORY-4):** the durable leg lives in `lib/observability/telemetry-server.ts` — a pure-module split the outer-ring gate forced red-first on its first run (the merged shape put an RPC call in browser-reachable `telemetry.ts`; the GC-7 closure caught it exactly as designed). Adopted by the four auth routes + the admin route. **Enumerated, not silently capped:** 398 `emitTelemetry` sites across 79 BFF route files remain mirror-only — bulk adoption is deliberately NOT taken here because per-request read-route events would dominate the sink's cardinality (ADR-U052 §3's budget); the adoption-criteria question is routed to the area gate.

**Found-not-caused:** 7 pre-existing unit reds (3 notification suites) from COR-C W3's registry-carried response sets — fixtures predated the payload shape; control-run on clean main confirmed, adapted with labels.

**Tests:** unit 1068/1068 (incl. jest-axe on the loaded dashboard; red-first for the new suites), `next build` green, E2E `admin-dashboard.spec.ts` (admin renders live numbers · sign-in's durable row end-to-end · demoted 404 shape). No migration of its own.
