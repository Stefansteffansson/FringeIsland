# Selector contexts, wielded memberships panel, kind badges, honest counts

---
id: TASK-H018-02
title: Act-as selector contexts + invite-a-group + memberships panel + badges/counts/pick-list
status: done
assigned_to: claude
priority: high
feature: FEAT-H018
owner: hub
wave: ferd
cycle: G-F
depends_on: [TASK-H018-01]
estimated_hours: 4
---

## Description

The five surface moves per the spec: MyPermissionsPanel gains real acting contexts (substitution rendered honestly); the detail gains an invite-a-group affordance (`invite_members`-gated, typeahead cap 8); the wielded group's page gains the memberships panel (accept/decline/withdraw as the group, confirms naming the wielding); member rows badge by `member_group_type` (Group / FringeIsland, never hidden); counts + Close key on `non_system_member_count`; the nominate pick-list filters to persons.

## Acceptance criteria

- [ ] Component unit tests red-first per story AC (selector, badges, counts/Close Gracy case, pick-list filter, panel gating)
- [ ] No affordance renders that the contract refuses (honest-surface discipline); refusal copy passes through verbatim
- [ ] Unknown `member_group_type` values render with a safe default (open-set, no sealed switch)

## Technical notes

`GroupDetailPanel.tsx` carries nominable/canClose/member-roster; `MyPermissionsPanel.tsx` carries the v1 shell built to extend. ConfirmModal for every wielded act. No optimistic state — re-read after mutations (D8 posture).

## Verification

`npm run test:unit` green; manual smoke on `/groups/[id]`.
