# Build the bounded members list + bulk actions (FEAT-H039)

---
id: TASK-ADME-02
title: Rework /admin/members to server paging + search with As-of/Refresh, add page-scoped selection and the three-action bulk family as BFF-looped singles with per-row outcomes, and sweep the W-4 email echo across every member ceremony
status: todo
assigned_to: claude
priority: high
feature: FEAT-H039
owner: hub
wave: ferd
cycle: ADM-E
depends_on: [TASK-ADME-01]
estimated_hours: 6
---

## Description

Build FEAT-H039 against the applied FEAT-PC024 read: the bounded list (pager + debounced server search + As-of/Refresh), the explicit page-scoped selection model, the bulk bar (Suspend / Reactivate / Force sign-out) through the widened ConfirmModal, the three serial-looping BFF routes with per-row outcome reporting, and the W-4 email-echo rider over all existing member-ceremony confirms. Red-first at the unit tier; E2E journey labelled test-after per the house rule.

## Acceptance criteria

- [ ] Unit suites demonstrated red pre-implementation for the reworked list (pager, server search, selection, As-of/Refresh), the bulk bar + ceremony + outcome panel, and the ConfirmModal `ReactNode` widening (string callers pinned unchanged); all green post-build; jest-axe clean on new states.
- [ ] Three routes `POST /api/admin/users/bulk/{suspend|reactivate|force-logout}`: `getUser` auth, 50-id cap → 400, serial loop in selection order, per-row `{id, ok, error?}` with platform messages verbatim, 200 partial-success response, durable telemetry (action + requested + succeeded); route-policy + outer-ring gates zero exceptions.
- [ ] Per-member audit rows asserted against the real contracts (one row per acted-on member; force-logout called one-id-per-call, never the batch shape).
- [ ] Every detail-page ceremony confirm + the hard-delete panel + the bulk listing carries display name **and email** (W-4).
- [ ] E2E journey per STORY-7 green; full unit sweep green; lint 0; `next build` green (the type gate).

## Technical notes

Fact anchors from the decomposition walk: list `AdminMembersList.tsx` (full-fetch at :52, client search :85-94 — both retired); ceremonies `AdminMemberDetail.tsx:332-481`; As-of idiom `AdminDashboard.tsx:131-141`; `ConfirmModal.tsx:15-25` (`message` widens to ReactNode, additive); mutation-route idiom `app/api/admin/users/[id]/suspend/route.ts:10-15` (SQLSTATE map). Selection clears on any page/filter/search/refresh change.

## Verification

`npm run test:e2e` admin specs green incl. the new journey (dev server on 3000, no concurrent integration suite vs the shared dev DB); full unit sweep; the two conformance gates; manual walk of a mixed-selection bulk suspend showing a verbatim refusal row.
