# Hub surfaces — announcements sections (group page + home)

---
id: TASK-CD-04
title: Hub announcements sections + compose/retract (H028 STORY-1..3)
status: todo
assigned_to: claude
priority: high
feature: FEAT-H028
owner: hub
wave: ferd
cycle: C-D
depends_on: [TASK-CD-03]
estimated_hours: 5
---

## Description

Group-page Announcements section (newest-first, keyset "load more", empty state, attribution ladder, failure-isolated; compose on `send_announcements` grant; Retract behind ConfirmModal) and the home platform-announcements section (FIM-only, labelled, justified standalone read with session cache + W9). Unit tests red-first per component behaviour.

## Acceptance criteria

- [ ] STORY-1..3 ACs covered unit-tier red-first (grant-gated affordances, empty states, confirmed write-through, failure isolation, Mist-absence)
- [ ] No realtime changes; no new first-paint gating (B6 skeletons)

## Technical notes

Follow the H026 Forum-section pattern (`hub/app/groups/[id]` panel + BFF courier); home section on `hub/app/page.tsx`. Session-cache write-through on send/retract per the Hub confirmed-response rule.

## Verification

`npm run test:unit` green; manual walk on dev server.
