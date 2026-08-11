# set_group_role_permission has no protected-permission guard — a group can be bricked without deleting anything

---
id: TASK-RDA-03
title: RD-5's lockout guard is on the delete door only; the grant-flip door can strip a group's last protected permission unguarded
status: done
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

- [x] **First: verify the brick end-to-end**, red-first. **CONFIRMED, not refuted** (2026-08-11). Red run before the migration: the revoke returned `error === null` and drove `manage_roles` definers **1 → 0** — the group bricked from inside with no row deleted. 2 red / 8 green of 10 cells.
- [x] Survey live data. **No repair pass owed.** Reads alarmingly at first — 3 941 groups hold no definer for a protected permission — but **3 938 are personal groups, which are designed to carry zero permissions** (the "Myself" role), 3 are system groups, and the single engagement group is a suspended dev fixture with **zero roles of any kind**. None reached this state through the grant-flip door, and none is reachable by this contract, which is engagement-only.
- [x] `set_group_role_permission` refuses the revoke that would leave no definer, naming the permission — migration `20260811210000`, wording mirroring the delete door verbatim (`no holder of: % — assign the permission elsewhere first`, P0001) so the two doors speak with one voice. The delete door's message was **left untouched**: three live assertions bind it (`role-provenance-and-retirement.test.ts:666`, `RolesPanel.test.tsx:396,411`) and the Hub renders it.
- [x] Sibling-assertion sweep. **RD-A's S4c cell survives unchanged** — it creates a "Deputy" second definer *before* revoking, so the guard never fires there; its own comment says the revoke is "legal precisely because" of that. Verified, not assumed. Full groups slice **404/404 across 15 suites** after apply; platform conformance **30/30**; applied-function ACL read at the gate (`{postgres,authenticated,service_role}` — no PUBLIC, no `anon`).
- [ ] **STILL OPEN, deliberately:** whether the admin plane gets a DeusEx repair path for an already-bricked group, or whether `admin_reassign_group_stewardship` is the answer. Moot for existing data (none is bricked), so this is a forward-looking design question, not a defect. Carried.

## Closure

**DONE 2026-08-11** (Phase-4 W8, PR #509, merged on Stefan's named approval *"ok merge 509, apply the migration"*). Migration applied to the dev DB and history repaired; red-then-green demonstrated on the same suite (2 red → **10/10 green**).

## Related

- RD-A shipped the delete-door half: [FEAT-PC027](../../../platform/core/features/FEAT-PC027-role-provenance-retirement-and-group-side-removal-contracts.md) STORY-4.
- `permissions.is_protected` and the RB-4 guard: FEAT-PC025 (`20260804190000:133-143`).
- Note the third neighbouring door, already guarded: `prevent_last_leader_removal` refuses unbinding the last Steward, which is why the Steward instance can never be made unheld and why RD-A's lockout only fires for non-Steward roles.
