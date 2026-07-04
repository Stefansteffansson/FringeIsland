# Member-row lifecycle actions + the Leave affordance on the group page

---
id: TASK-H016-02
title: GroupDetailPanel gains permission-gated Pause/Reactivate/Remove row actions with the Paused badge, and the Leave affordance with honest G-E refusal rendering; page passes permissions + navigates after leave
status: done
assigned_to: claude
priority: high
feature: FEAT-H016
owner: hub
wave: ferd
cycle: Groups G-D
depends_on: [TASK-H016-01]
estimated_hours: 3
---

## Description

The surface half, red-first component units before the panel changes.

- `GroupDetailPanel` gains `permissions: string[] | null` and `onLeft: () => void` props. Member rows: **Pause** renders iff `pause_members` held and the row is active; **Reactivate** iff `activate_members` held and the row is paused; **Remove** iff `remove_members` held — three independent keys, any subset renders exactly that subset. Paused rows carry a **Paused badge** keyed off the payload's `membership_status` (never client state). All three ConfirmModal-gated (Remove danger-variant). Refusals surface in place via the existing member-error line; the list state survives.
- **Leave group** affordance on the detail card for any active member (`viewer.is_member`); ConfirmModal; on success the page navigates to `/groups` (`onLeft`). The sole-Steward and last-member 409s render their copy in place — the affordance is never hidden client-side (the honest answer comes from the refusal).
- `app/groups/[id]/page.tsx`: passes `permissions` + `onLeft` (router.replace('/groups')); mutations ride the existing one-refresh-path (`onRefresh={loadAll}`).

## Acceptance criteria

- [ ] Component units demonstrated RED → GREEN (new affordances/badge absent before implementation)
- [ ] Affordance gating: each of the three keys independently controls exactly its affordance; no keys → no actions; paused row shows Reactivate (not Pause)
- [ ] Paused badge renders from `membership_status`; active rows carry no badge
- [ ] Remove uses danger ConfirmModal; pause/reactivate ConfirmModal; refusal message renders in place and rows persist
- [ ] Leave renders for members, ConfirmModal-gated; success calls `onLeft`; 409 copy renders in place
- [ ] Existing H013/H014 panel behaviour untouched (settings editor, role chips, assign/remove role) — prior units stay green

## Technical notes

Extend `tests/unit/components/groups/GroupDetailPanel.test.tsx` (new describe blocks) — new props are optional so existing cases compile unchanged. Follow the existing removeTarget/ConfirmModal state pattern; use one lifecycle-action state (`{kind, member}`) + the existing `memberError` line. Test-ids: `paused-badge-<id>`, `pause-member-<id>`, `activate-member-<id>`, `remove-member-<id>`, `leave-group`.

## Verification

`npx jest tests/unit/components/groups/GroupDetailPanel.test.tsx tests/unit/app/groups` red before, green after; lint clean.
