# Build FEAT-H040 — the /admin/roles editor surface + audit-target rendering + the WA-4 verification

---
id: TASK-ADMF-02
title: Build FEAT-H040 — /admin/roles (list, catalogue browser, detail, clone/draft/apply ceremonies), WA-2 target rendering, WA-4 instant-sign-out verification + copy softening
status: todo
assigned_to: Claude
priority: high
feature: FEAT-H040
owner: hub
wave: ferd
cycle: ADM-F
depends_on: [TASK-ADMF-01]
estimated_hours: 8
---

## Description

The surface half of Cycle ADM-F, per [FEAT-H040](../../../products/hub/features/FEAT-H040-role-template-editor-and-audit-target-honesty.md). `/admin/roles` behind the fifth dashboard card: template list + read-only catalogue browser (one composed BFF read, As-of/Refresh), template detail with version history and the draft checkbox fabric, the three ceremonies (clone naming both member-visible consequences; save-draft; apply/rollback as one diff-preview danger ceremony with the blast-radius line). Plus the WA-2 audit-row target rendering, the WA-4 instant-sign-out E2E verification with the ceremony-copy softening once proven, and the WA-3 consented-hard-delete console pin. No migration of its own; consumes FEAT-PC025 API-first. If the gate apply is pending when surface work starts, follow the H039 tranche pattern (shape-tolerant work first, true consumption post-apply) rather than blocking.

## Acceptance criteria

- [ ] STORY-1..8 red-first and green: list/catalogue/detail rendering, both clone consequences in the ceremony copy, diff preview + rollback-as-repoint, seeds read-only in UI with the server refusal pinned at route tier, WA-2 target rendering (raw uuid into metadata details), WA-4 device sign-out within seconds + softened copy, WA-3 console completion, non-admin 404 on every new route
- [ ] COR-C lattice: tokens only, jest-axe clean on new states, route-policy + outer-ring zero exceptions, durable content-free telemetry on the three mutation routes, mutations on `getUser()` (ADR-U037)
- [ ] E2E journey per STORY-8 green; unit sweep green; lint 0 errors; `next build` green (the type gate)
- [ ] Feature-inventory summary + README rows advanced in the same commits as maturity transitions

## Technical notes

Borrow the `grant-toggle-${name}` checkbox idiom from `RolesPanel.tsx` — do not import the component or its mutation wiring. `ConfirmModal.message` is already `ReactNode` (H039). Diffs are client-computed presentation over the detail payload. The session-guard tenant needs no change for WA-4 — the cell verifies, the copy softens.

## Verification

`npm run test:e2e` (dev server on :3000) — the STORY-8 journey; `npm run test:unit`; `next build`; manual: dashboard card → clone → draft → apply → group-created-without-template carries the clone's role.
