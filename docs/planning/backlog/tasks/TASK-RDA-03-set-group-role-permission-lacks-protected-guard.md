# set_group_role_permission has no protected-permission guard — a group can be bricked without deleting anything

---
id: TASK-RDA-03
title: RD-5's lockout guard is on the delete door only; the grant-flip door can strip a group's last protected permission unguarded
status: todo
assigned_to: unassigned
priority: high
feature: FEAT-PC027
owner: platform/core/organisation
wave: ferd
cycle: RD-A (found), fix unscheduled
depends_on: []
estimated_hours: 3
---

## What was found

While building RD-A's S4c fixture, the reachable path to the lockout guard turned out to require **revoking a protected permission from the group's Steward role instance** — and `set_group_role_permission` allowed it without complaint.

Read the contract body (`20260803190000`, `set_group_role_permission`): its only refusals are the FIM gate, the account-suspended gate, `P0002` not-found, `manage_roles`, `assert_group_writable`, unknown-permission `22023`, and the anti-escalation *"cannot grant a permission you do not hold"*. **There is no `is_protected` check on the revoke direction.**

Proven incidentally by RD-A's own S4c cell, which revokes `rest_group` from a group's Steward instance and gets `error === null`.

## Why it matters

RD-A bound PC025's `is_protected` guard to the **delete** door (`delete_group_role`) — a role that is the group's last definer of a protected permission cannot be removed. That closes one door and leaves the neighbouring one open:

1. A Steward holds `manage_roles` through the group's only role granting it.
2. They call `set_group_role_permission(thatRole, 'manage_roles', false)`. Allowed.
3. Now no role in the group grants `manage_roles`. Nobody can grant it back — `set_group_role_permission` itself requires `manage_roles`, and `create_group_role`'s anti-escalation refuses to grant a permission the author does not hold.

**The group is bricked from inside, without a single row being deleted** — which is precisely the outcome RD-5 exists to prevent. The delete-door guard RD-A shipped is necessary but not sufficient.

## Not fixed in RD-A, deliberately

Out of scope: RD-A's board settled the delete door, and widening a shipped sibling contract's refusal set mid-cycle is the class of change that needs its own gate, its own sibling sweep, and its own decision about whether existing groups are already in this state.

## Acceptance criteria

- [ ] **First: verify the brick end-to-end**, red-first. The reasoning above is read from the contract body and one incidental green revoke — it has not been driven all the way to an unrecoverable group. Confirm or refute before designing the fix.
- [ ] Survey live data: are any groups already missing a definer for a protected permission? That answer changes whether the fix needs a repair pass.
- [ ] If confirmed, `set_group_role_permission` refuses a revoke that would leave the group with no definer of a protected permission, naming it — the same shape and wording as RD-A's delete-door refusal, so the two doors speak with one voice.
- [ ] Sibling-assertion sweep: `set_group_role_permission` carries live cells in `role-permission-contracts.test.ts` and `group-availability-enforcement.test.ts`.
- [ ] Decide whether the admin plane can override (a DeusEx repair path) or whether a bricked group needs `admin_reassign_group_stewardship`.

## Related

- RD-A shipped the delete-door half: [FEAT-PC027](../../../platform/core/features/FEAT-PC027-role-provenance-retirement-and-group-side-removal-contracts.md) STORY-4.
- `permissions.is_protected` and the RB-4 guard: FEAT-PC025 (`20260804190000:133-143`).
- Note the third neighbouring door, already guarded: `prevent_last_leader_removal` refuses unbinding the last Steward, which is why the Steward instance can never be made unheld and why RD-A's lockout only fires for non-Steward roles.
