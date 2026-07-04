# Roles panel, member-list role chips + assign/remove, "what I can do here" + act-as shell

---
id: TASK-H014-02
title: RolesPanel (fabric render, add-from-template / custom-with-checklist, grant toggles, delete), member-list role chips + assign/remove on GroupDetailPanel, MyPermissionsPanel with the honest v1 act-as shell; red-first component units
status: done
assigned_to: claude
priority: high
feature: FEAT-H014
owner: hub
wave: ferd
cycle: Groups G-B
depends_on: [TASK-H014-01]
estimated_hours: 5
---

## Description

The three surface pieces on `/groups/[id]` (no new top-level route):

- **`RolesPanel`** — fabric render (name, template-or-custom badge, holder count, permission chips), management affordances iff capability flags (`can_manage_roles`): add role (template picker or custom name+description+catalog checklist), per-role grant toggles, delete (ConfirmModal; contract refusals surfaced honestly — held/template-derived arrive as 409/403 messages). Escalation refusals keep form state. Own fetch + non-destructive error (STORY-1 AC3: panel error, page stands).
- **`GroupDetailPanel` extension** — members render `roles[]` chips; `can_assign_roles` viewers get a per-member role picker (from the fabric read); `can_remove_roles` viewers get chip-remove via ConfirmModal; the last-Steward refusal shows in place, chip stays (never pre-computed).
- **`MyPermissionsPanel`** — effective permission chips via `/my-permissions`; act-as selector with exactly one real context ("Myself") + copy naming that further contexts arrive with group-of-groups (G-F); selecting is a no-op re-read. Honest empty-state copy retained defensively (the global baseline means it rarely fires).
- **One refresh path:** the page bumps one refresh signal on any mutation → detail + fabric + permissions re-read together (STORY-4 AC3).

First cuts taken per spec appetite: no rename/describe UI (contract exists; PATCH route supports it), flat permission chips on role cards (checklist grouped by category — cheap, data is in the payload).

**Substrate note carried from PC011:** G-A-bootstrapped instances are named verbatim after templates ('Steward Role Template') — render as-is, no client-side prettifying.

## Acceptance criteria

- [ ] STORY-1: fabric legible to a flag-less viewer with zero management affordances; fetch failure → panel-local error
- [ ] STORY-2: add-from-template re-reads and shows instance; custom path creates with exactly the ticked grants; wall refusal shows message and keeps form state; grant toggle re-read; delete matrix per contract (ConfirmModal on the destructive path)
- [ ] STORY-3: chips render; assign picker gated on `can_assign_roles`; remove gated on `can_remove_roles` + ConfirmModal; anti-escalation and last-Steward refusals surfaced in place, nothing changes visually
- [ ] STORY-4: permission chips render; act-as shell exactly one context with honest copy; mutation → one refresh path re-reads all three reads
- [ ] All component units demonstrated RED (components absent) → GREEN

## Technical notes

Components `hub/components/groups/RolesPanel.tsx`, `MyPermissionsPanel.tsx`; member-chips inside `GroupDetailPanel.tsx`. Unit files under `hub/tests/unit/components/groups/` + `group-detail-page.test.tsx` extension. Mock `@/lib/groups/client`. ConfirmModal from `components/ui/`. No permission computation client-side — flags and refusals only (rabbit hole #1).

## Verification

`npx jest tests/unit/components/groups tests/unit/app/groups` red → green; lint clean.
