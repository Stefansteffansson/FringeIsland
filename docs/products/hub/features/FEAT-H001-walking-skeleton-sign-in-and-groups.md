# FEAT-H001: Walking skeleton — sign in and land on your groups

---
id: FEAT-H001
title: Walking skeleton — sign in and land on your groups
owner: hub
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

We have a canon-true substrate, a refreshed Hub spec, and a behaviour-inventory oracle — but **zero v2 code**. Before building any area, the v2 *architecture* must be proven to stand up end-to-end on one thin, real, tested path: `DB → API → frontend` (API-first, ADR-U009), the design-system layer extracted, equipment-keying (ADR-U025), the auth bootstrap, the test harness, and a wired **seam for each of the five verticals**. Without this spine, every later area would be built on unproven foundations — the exact greenfield risk ADR-U030 set out to retire.

## Solution sketch

The thinnest real path: an existing **FIM signs in (IDN-3)** and **lands on `/groups`**, which **renders their group list (GRP-4)** fetched through a real `hub/` API route that reads the conformant substrate via **PC-3** — never a direct table call.

Stand up, in `hub/` (per [ADR-U032](../../../architecture/decisions/ADR-U032-hub-v2-coexistence-separate-tree.md)):
- the Next.js 16.1 app shell (App Router, `proxy.ts`, TypeScript strict, Tailwind);
- the **design-system layer** as its own location, with only the primitive(s) this slice renders extracted (loading state, empty state, inline error, the bell mount);
- **equipment-keying** scaffolding (`requires-equipment` honored at placement, ADR-U025);
- the **Supabase auth context** (client-side; auth is the narrow direct-Supabase exception per Hub `CLAUDE.md`);
- the **API layer** (one route: the member's groups) reading the substrate via PC-3;
- the **Jest + Playwright** harness, green.

Wire the **vertical seams** (see the vertical-readiness block in `phase-2-kickoff.md`): telemetry emit on sign-in and groups-load (V4); an audit entry for the auth action where the substrate supports it (V1); the notification-bell mount point in the shell (V3); a privacy-correct, RLS-backed group fetch that returns only what the viewer may see (V2). Transactions: none (V5).

## Appetite

A focused **foundation slice** — small in feature breadth, but non-negotiably *complete* in architecture. Fixed: get the spine green end-to-end (sign-in → `/groups`, DB→API→frontend, harness passing, vertical seams present). Variable: how many design-system primitives we extract — start with the minimum this slice needs, no more.

## Rabbit holes

- **Don't rebuild full IDN-3** — no sign-up, no Mist→FIM transcendence, no session-refresh edge cases. Just sign-in of an existing account + redirect.
- **Don't rebuild full GRP-4** — no group detail view, no create/edit, no membership management. Just render the list.
- **Don't extract the whole design system** — only the primitives this slice renders.
- **Don't solve Mist/consent here** — consent capture is IDN-2 (transcendence), a later slice.
- **Don't port old Hub code by import-and-patch** — copy-with-correction only (plan rule); the old Hub is a read-only oracle.
- **Don't broaden Supabase direct access** — auth only; no table reads/writes from the frontend; no third realtime channel (Hub `CLAUDE.md`).

## No-gos

- No sign-up, no Mist→FIM transcendence, no consent capture (IDN-2 — later).
- No group create / edit / detail / visibility config / membership management (GRP-1/2/3/6/7, MEM-* — later).
- No journeys, messaging, notification *content/delivery*, or profile editing.
- No direct DB calls from frontend code (ADR-U009) — ever.
- No business logic in server components — logic lives behind the API (Hub `CLAUDE.md`).

## Stories

### STORY-1: Sign in (IDN-3, thin)
As an existing FIM, I want to sign in with my credentials, so that I reach my authenticated home.

**Acceptance criteria:**
- Given a registered FIM with valid credentials, when they submit the sign-in form, then a Supabase auth session is established and they are redirected to `/groups`.
- Given an unauthenticated visitor, when they navigate to `/groups`, then they are redirected to sign-in and the original destination is preserved where feasible.
- Given invalid credentials, when they submit, then an inline error renders via a design-system primitive and no session is created.
- Given the sign-in action completes, when the session is established, then a telemetry event is emitted (V4) and the auth action is recorded as an audit entry where the substrate supports it (V1).

### STORY-2: Land on your groups (GRP-4 read path, API-first)
As a signed-in FIM, I want to see the groups I belong to, so that I land somewhere meaningful and the v2 architecture is proven end-to-end.

**Acceptance criteria:**
- Given a signed-in FIM with N memberships, when `/groups` loads, then the list is fetched through a `hub/` API route (DB→API→frontend) — no direct table call from the frontend.
- Given the API route reads groups, when it queries, then it goes through PC-3 / the conformant substrate and returns only groups the viewer is authorized to see (V2 — RLS-backed, no client-side over-fetch-and-filter).
- Given the list renders, when it is displayed, then it uses design-system primitives, shows a loading state while fetching, and an empty state when N = 0.
- Given `/groups` loads, when groups are fetched, then a telemetry event is emitted (V4), error states (failed fetch) are surfaced and tracked (not silently swallowed), and the notification-bell mount point is present in the shell (V3 seam).

### STORY-3: The skeleton stands up green (architecture proof + harness)
As the v2 build, I want the thin slice to run end-to-end with tests green, so that the Phase-2 gate is met and later areas build on a proven spine.

**Acceptance criteria:**
- Given `hub/` (ADR-U032), when `npm run dev` runs against the shared substrate, then sign-in → `/groups` works end-to-end.
- Given the test harness, when the suite runs, then there is at least one Jest integration test (API route → substrate) and one Playwright E2E (sign-in → `/groups`), and both pass.
- Given equipment-keying (ADR-U025), when the feature is placed, then `requires-equipment: none` is honored by the placement scaffolding.
- Given the five verticals, when the slice is reviewed against the vertical-readiness block, then each seam is present (V1 audit, V2 RLS-backed fetch, V3 bell mount, V4 telemetry) or explicitly N/A (V5 transactions).

## Platform dependencies

- **PC-2 Identity** — authentication / session (IDN-3).
- **PC-3 Organisation** — group membership + canonical permission resolution (GRP-4).
- **PC-1 Infrastructure** — telemetry primitive (V4 seam).
- **PC-4 Governance** — audit entry for the auth action (V1 seam), where the substrate supports it.
- *Not in this slice:* DS-3 enrolment summary (belongs to GRP-4's detail view, deferred). Where PC/DS L3 reciprocation is still pending, the consumer-side claim is routed to **G-29** (per the plan's carried risks).

## Cross-product impact

Establishes the v2 app shell and the extracted **design-system layer** — both Hub-stack. The **Gimbal will not inherit** them (it is native iOS/Android, not Next — Hub `CLAUDE.md`); only the design-system *spec* is shared. `requires-equipment: none` means this capability is equipment-agnostic and would appear on any surface; the Gimbal realizes its own shell for the same capability later.

## Vertical impact

- **Privacy/GDPR:** Reads personal group-membership data. The API must return only what the viewer is authorized to see (RLS-backed; no client-side filtering of over-fetched rows). **No new consent collected** in this slice — consent capture is IDN-2 (transcendence), deferred. No right-to-deletion path exercised here.
- **Notifications:** No notifications triggered. The **notification-bell mount point** is wired into the shell as a seam (V3); no delivery logic in this slice.
- **Administration:** The sign-in/auth action is audit-relevant — emit an **audit entry** where the substrate supports it (V1 seam). No DeusEx / moderation surface here.
- **Observability:** **Telemetry events** on sign-in and groups-load (feature-level, not just page views). Error states (failed sign-in, failed fetch) are observability events, never silently swallowed (V4).
- **Transactions:** None — sign-in and a read-only group list involve no payments, subscriptions, or entitlements.
- **Extensibility:** Introduces no new types, enums, or permission scopes. Group types stay non-hardcoded (ADR-U018) — the list renders whatever PC-3 returns; no sealed group-type set.

## Implementation notes (6-done — 2026-06-24)

Built under `hub/` ([ADR-U032](../../../architecture/decisions/ADR-U032-hub-v2-coexistence-separate-tree.md)), TDD test-first, as the Phase-2 walking skeleton. The spine runs end-to-end DB -> API -> frontend and is green: **5 Jest integration tests + 5 Playwright E2E tests** (`npm run test:integration -w hub`; `npm run test:e2e -w hub`). `npm run lint -w hub` + `npm run build -w hub` clean.

**Key code:**
- **Read path (GRP-4, V2):** `hub/lib/groups/queries.ts` (`fetchMemberGroups` — PC-3 actor via `get_current_personal_group_id()` -> active `group_memberships` -> engagement `groups`, RLS-scoped at every step) exposed at `hub/app/api/groups/route.ts` (`GET`). The frontend (`hub/app/groups/page.tsx`) only `fetch`es the route — no direct table calls (ADR-U009).
- **Auth/login (IDN-3 thin):** `hub/app/login/page.tsx` over the existing `lib/auth/AuthContext`; a client guard redirects an unauthenticated `/groups` to `/login` with the destination preserved.
- **Design-system layer:** `hub/components/ui/` (`LoadingState`, `EmptyState`, `InlineError`, `Button`, `TextField`, `NotificationBell`) + `hub/components/shell/AppShell.tsx`.
- **Vertical seams:** V1 `hub/app/api/auth/audit/route.ts` + `hub/lib/audit/audit.ts`; V2 RLS-backed `/api/groups`; V3 `NotificationBell` mounted in `AppShell`; V4 `hub/lib/observability/telemetry.ts` (sign-in + groups-load, failures included); V5 none (read-only + sign-in).
- **Harness:** `hub/jest.config.js` (unit jsdom + integration node), `hub/playwright.config.ts` (storageState auth + auto dev server); helpers copy-with-corrected from the `hub-legacy/` oracle.

**Deviations / deferred (build-informed loop, PROCESS §9):** the V1 audit + V4 telemetry seams are structured records, **not yet bound to the PC-4 audit substrate / PC-1 telemetry sink** (deep build = Phase-3 Identity). No `tests/unit` suite yet — the slice is covered by integration + E2E. Tasks: `TASK-H001-01..05`.

---

## Amendment — 2026-07-03 (ADR-U038 F2 / PR #49)

The GRP-4 read path above — `fetchMemberGroups` composing `get_current_personal_group_id()` → `group_memberships` → engagement `groups` → counts in `hub/lib/groups/queries.ts` — was relocated into the platform substrate as the single `get_member_groups()` RPC (SECURITY DEFINER, self-scoped) per **[ADR-U038](../../../architecture/decisions/ADR-U038-platform-contracts-platform-side-surface-bff.md)** (F2 — the composition is a platform contract a sibling Surface inherits, not Hub client code). Migration `20260702130100`; `hub/lib/groups/queries.ts` now calls the RPC. Behaviour is unchanged (RLS-equivalent scoping; empty for a member with no engagement memberships). Evidence: [`../../../planning/hub-v2/api-conformance-register.md`](../../../planning/hub-v2/api-conformance-register.md) §5 (F2).
