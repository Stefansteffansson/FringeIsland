---
id: TASK-H006-02
title: Non-blocking account-state gate — render optimistically, intercept only on confirmed off-state
status: done
assigned_to: Claude
priority: high
feature: FEAT-H006
owner: hub
wave: ferd
cycle: perf-tier-1
depends_on: [TASK-H006-01]
estimated_hours: 2
---

# TASK-H006-02: Make the account-state gate non-blocking (perf Tier 1)

## Description

Perf Tier 1 from the 2026-07-01 client-render finding (perf bridge `2026-07-01_01`,
[`../../hub-v2/perf-hardening-backlog.md`](../../hub-v2/perf-hardening-backlog.md)).
After region co-location (ADR-U035) the residual responsiveness cost was the
**client-render waterfall**: the root-layout `AccountStateGate` blocked **every**
page on a serial `/api/account/state` round-trip (`AccountStateView`
`if (loading) return <LoadingState/>`) before the page rendered and started its own
`/api/groups` + `/api/profile/me` fetches.

The gate is now **optimistic, intercept-on-confirmed**:

- In flight → render the page **optimistically** (member treated as active); the
  page's own fetches fire **in parallel** with the account-state read instead of
  behind it (they already live in sibling components — `GroupsPage` / `AccountMenu` —
  so de-blocking the gate is the only change needed).
- Intercept **only** on a confirmed off-state (`suspended` / `decommissioned` /
  unknown-non-active) or a read **error** (error interception preserved — never
  silently leave a member on the optimistic active experience).
- Trade-off (deliberate): a switched-off member may briefly see the chrome flash
  before the surface intercepts — acceptable because the data is RLS-protected
  (`users_select_active`).

Hub shell rendering only — API-first (ADR-U009) and the L1-L5 decomposition are
untouched. Maturity stays `6-done` (a documented 6-done amendment; FEAT-H006 spec
"Performance revision (2026-07-01)" + revised STORY-4).

## Acceptance criteria

- [x] An active / in-flight FIM sees the page with **no** blocking "Checking your
      account…" gate (optimistic render).
- [x] A `suspended` / `decommissioned` FIM is **still intercepted** (interception
      preserved).
- [x] A read **error** still shows the retry surface (not the active experience).
- [x] `/api/groups` + `/api/profile/me` fire in parallel (structural — sibling
      components, no longer serialized by the gate).

## Technical notes

- `hub/components/account/AccountStateView.tsx` — remove the blocking `if (loading)`
  block + its now-unused `LoadingState` import; add `if (loading && !error) return
  children` (optimistic; `loading` still suppresses a stale-surface flash during
  `reload()`).
- `AccountStateGate.tsx` / `AccountStateContext.tsx` unchanged (provider still
  exposes `loading` for the profile legibility line).

## Verification

- Unit `hub/tests/unit/components/account/AccountStateView.test.tsx` — STORY-4
  rewritten red→green (in-flight renders children, no blocking gate); STORY-2/3
  interception + error retry still green.
- E2E `hub/tests/e2e/account-state.spec.ts` — active path asserts no "Checking your
  account…" gate; suspended/closed interception unchanged.
- `npm run lint` + `next build` clean.
