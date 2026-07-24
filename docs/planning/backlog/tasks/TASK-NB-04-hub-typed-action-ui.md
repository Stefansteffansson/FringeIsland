# Hub typed-action UI + re-home retirements (FEAT-H031)

---
id: TASK-NB-04
title: Hub typed-action UI + re-home retirements
status: todo
assigned_to: Claude
priority: high
feature: FEAT-H031
owner: hub
wave: ferd
cycle: N-B
depends_on: [TASK-NB-02]
estimated_hours: 5
---

## Description
The Hub half: a generic data-driven typed-action affordance (`NotificationActions` inside `NotificationItem`, response set from `action_type`, ConfirmModal-gated, optimistic + rollback); thin dispatch to the existing nomination route + a new `/api/notifications/[id]/acting-response`; `action_data` on the `NotificationRow` type; retire `PendingNominations`; fold the `GroupMembershipsPanel` acting affordance (read-only status remains); "Answered by [name]" + resolved/expired states with no buttons.

## Acceptance criteria
- [ ] STORY-1..4 unit tests (format/component/page tiers), demonstrated red-first.
- [ ] `PendingNominations` component + `/groups` mount removed.
- [ ] `GroupMembershipsPanel` acting Accept/Decline folded to read-only.
- [ ] `next build` green; full unit suite green; route-policy conformance green.

## Technical notes
Action buttons attach in `hub/components/notifications/NotificationItem.tsx`; new BFF route mirrors `[id]/nomination-response/route.ts` (ADR-U037 getUser on the mutation). Depends on the FEAT-PD014 contracts (schema gate) being merged first.

## Verification
`cd hub && npx jest tests/unit/... && npm run build`
