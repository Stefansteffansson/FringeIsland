# GroupForumSection + attribution rendering + E2E

---
id: TASK-CB-04
title: The group-page Forum section, permission-gated affordances, attribution rendering (forum + messages detail), E2E
status: todo
assigned_to: claude
priority: high
feature: FEAT-H026
owner: hub
wave: ferd
cycle: C-B
depends_on: [TASK-CB-03]
estimated_hours: 4
---

## Description
`GroupForumSection` beside `GroupConversationsSection` in `app/groups/[id]/page.tsx` (failure-isolated; honest absence on refusal; skeleton per B6): threads newest-first + replies chronological, keyset load-earlier, tombstones in place ("Removed by a group moderator"), composer/reply/remove per the `fetchMyPermissions` grants (Reply on top-level only; Remove behind ConfirmModal), optimistic post/reply with confirmed write-through + visible retry (B5). Attribution rendering: `display_name` styled by `attribution` (former/unknown muted, unlinked) in the forum AND `/messages/[id]`. E2E: post→appears, reply→beneath parent, remove→tombstone (effects asserted, in-context revisits), former-member attribution (leave → "Former member" → rejoin → name), no-permission affordance absence.

## Acceptance criteria
- [ ] Unit red-first for component logic; E2E asserts observable effects with in-context revisits
- [ ] Composer locators by textbox role (`Forum post` / `Reply` aria-labels — never colliding with nav "Messages")
- [ ] Fixture rules: run-unique names, `markArrivedOnce` on fixture FIMs
- [ ] First-paint request test: section = one read, no duplicate fetches across auth churn

## Technical notes
Copy `GroupConversationsSection` posture; tombstone + attribution styling per H026 STORY-4/5. E2E runs green only after the gate merge + apply (stacked PR — retarget base before deleting the parent branch).

## Verification
Unit + route-policy green pre-apply; E2E green post-apply; lint + `next build` clean.
