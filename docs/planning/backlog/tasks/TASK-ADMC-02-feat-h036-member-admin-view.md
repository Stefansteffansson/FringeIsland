# Build FEAT-H036 — member administration view

---
id: TASK-ADMC-02
title: Build FEAT-H036 — /admin/members list + detail with the state-honest action rail, nine mutation ceremonies, dashboard card — red-first at the unit tier, fuller-auto
status: done
assigned_to: unassigned
priority: high
feature: FEAT-H036
owner: hub
wave: ferd
cycle: ADM-C
depends_on: [TASK-ADMC-01]
estimated_hours: 10
---

## Description

The surface half of Cycle ADM-C, per [FEAT-H036](../../../products/hub/features/FEAT-H036-member-administration-view.md), consuming FEAT-PC021 API-first (no migration of its own). `lib/admin/users.ts` outer-ring wrapper (`import type` only), eleven BFF routes (2 reads + 9 mutations), `AdminMembersList` + `AdminMemberDetail` under `components/admin/`, two `'use client'` route pages, the "Member administration" dashboard card. The H035 conventions bind: 42501/P0002→404, P0001→409 verbatim, 22023→400; reads on the claims path, mutations on `getUser`; fresh-per-mount; durable telemetry; repaint from fresh reads, never optimistic-only.

## Acceptance criteria

- [ ] Stories 1–7 realized; unit suites demonstrated red pre-implementation and closed green; route-policy + outer-ring gates accept all routes and the wrapper with zero exception entries; jest-axe clean on list + detail loaded states; `next build` green (the type gate — before any 6-done claim).
- [ ] The state-honest action rail derives from payload facts only (`account_state`, `is_platform_admin`, `deactivation_origin`, `memberships[].removal_scenario`) — no client-side lifecycle recomputation.
- [ ] Ceremony copy per the spec: origin-honest Reactivate, scenario-naming Remove, aggregate + no-erasure Platform exit, type-to-confirm Hard delete with the sentinel consequence, refresh-layer-honest Force sign-out, self-demotion named on self-revoke.
- [ ] E2E journey (labelled test-after if written post-implementation, per the ADM-B precedent): elevate → suspend/reactivate round-trip → scenario-named removal → platform exit → grant/revoke with the demoted-404 check. Row-scoped `getByTestId` locators throughout (bridge watch-item 3 — the dev DB legitimately holds plural fixtures).
- [ ] Feature maturity to 6-done with Implementation notes + the L4 summary row updated in the same commit.

## Technical notes

Run hub tests from `hub/`; dev server logs to a file, never through a pipe (bridge watch-items 1/5). Playwright probes under plain `node`, never the ctx-sandbox Bun runtime (watch-item 2). ADR-U043 numbers ride the registered area-gate perf pass.

## Verification

`cd hub && npx jest tests/unit` full sweep green; route-policy/outer-ring/axe gates green; `cd hub && npm run test:e2e` admin specs green; `next build` green.
