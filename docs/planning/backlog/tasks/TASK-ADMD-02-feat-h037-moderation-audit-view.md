# Build FEAT-H037 — moderation and audit view (fuller-auto after the gate)

---
id: TASK-ADMD-02
title: Build FEAT-H037 — /admin/moderation queue + detail with the resolve ceremony, /admin/audit browser, the two dashboard cards — red-first at the unit tier
status: done
assigned_to: unassigned
priority: high
feature: FEAT-H037
owner: hub
wave: ferd
cycle: ADM-D
depends_on: [TASK-ADMD-01]
estimated_hours: 8
---

## Description

The surface half of Cycle ADM-D, per [FEAT-H037](../../../products/hub/features/FEAT-H037-moderation-and-audit-view.md). Starts only after TASK-ADMD-01's gate is applied (fuller-auto thereafter — no schema, no carve-out). The H034/H035/H036 idiom throughout: wrappers (`lib/admin/reports.ts`, `lib/admin/audit.ts`, `import type` only), four BFF routes, `AdminModerationQueue` + `AdminReportDetail` + `AdminAuditLog` under `components/admin/`, three `'use client'` route pages, the two dashboard cards, the H035 SQLSTATE→HTTP map (409 verbatim on the stale second resolve).

## Acceptance criteria

- [ ] Every story (STORY-1..7): honest queue filters + target grouping + empty state, drift-honesty detail with live-only escalation links, the resolve panel (bespoke inline — the ConfirmModal-carries-no-children precedent) with the consequence copy naming what the reporter will and will not learn, the keyset audit browser with open-namespace prefix chips + free input and null-safe erased actors, dashboard cards with the open-count.
- [ ] Red-first at the unit tier (component suites demonstrated red pre-implementation); jest-axe clean on all three loaded states; route-policy + outer-ring conformance gates green with **zero exception entries**; full unit suite green; `next build` green (the type gate).
- [ ] E2E journey (`admin-moderation.spec.ts`, labelled test-after per the ADM-B precedent): submit → queue → detail → resolve → reporter's bell closure → audit row under the `moderation.` chip → demoted 404 on all three routes; DeusEx leak instrument delta 0.
- [ ] No optimistic state; fresh-per-mount reads; every mutation repaints from the fresh read (the H035 rule).
- [ ] Docs close rides the build PR: both specs to `6-done` with Implementation notes, §L4 rows + feature READMEs updated in the same commit, changelog registers per the which-CHANGELOG check (root + hub/ + platform-core as applicable).
