# H017 flows: transfer choice + nomination pick-list + pending-nomination affordance + close/delete settings actions

---
id: TASK-H017-02
title: The sole-Steward transfer flow (nominate pick-list / hand-to-DeusEx) on /groups/[id], the nominee's pending-nomination affordance on /groups, and the last-member Close + Steward Delete settings actions — with red-first unit tests
status: todo
assigned_to: claude
priority: high
feature: FEAT-H017
owner: hub
wave: ferd
cycle: Groups G-E
depends_on: [TASK-H017-01]
estimated_hours: 6
---

## Description

The four affordances (spec §Solution sketch + Stories 1-5), all ConfirmModal-gated, all relaying the contract's answer in place — never predicting, never gating client-side beyond the my-permissions payload + contract-reported structural position.

- **Transfer choice on `/groups/[id]`** (STORY-1/3): the sole Steward's Leave-refusal moment (or an explicit "Hand over leadership" affordance) opens two paths — **Nominate successors** (an ordered pick-list of active members other than the caller, sourced from the **existing member list** — no separate fetch; produces the ordered id array for `nominate_steward`) and **Hand to FringeIsland** (`hand_stewardship_to_deusex`, styled as the deliberate ADR-U019 last resort, not a primary action). On success → navigate to `/groups`. The G-D refusal copy is retired — the wall becomes a door.
- **Pending-nomination affordance on `/groups`** (STORY-2): a member with a pending `stewardship_nomination` sees the group named + the 7-day window + Accept/Decline (ConfirmModal). Accept → `respond_to_stewardship_nomination(id, true)`; Decline → `(id, false)`. Relay the contract's outcome ("you are now Steward" / "passed on" — never naming next-nominee-vs-DeusEx); expired/answered → the mapped 409 resolves the affordance. Sourced from the TASK-H017-01 scoped read.
- **Close + Delete on `/groups/[id]` settings** (STORY-4/5): **Close** renders for the last active member (the last-member Leave refusal becomes this); **Delete** renders for `delete_group` holders, **danger-styled with an explicit/typed ConfirmModal**, distinct in copy + placement from Leave/Remove/Close. Both relay the cascade result + the honest "your work is preserved and reassigned" framing (no DS-4/DS-5 detail) and navigate to `/groups`.

## Acceptance criteria

- [ ] Sole-Steward transfer flow: Leave-refusal (or explicit affordance) opens Nominate / Hand-over; the nominate pick-list is ordered, sourced from the existing member list (active, non-caller), no separate member fetch; confirming calls the route with the ordered ids; refusals relayed in place
- [ ] Hand-to-FringeIsland: ConfirmModal, styled as a deliberate last resort; success navigates to `/groups`; the last-member 409 (pointing at Close) is relayed in place
- [ ] Pending-nomination affordance on `/groups`: shows group + 7-day window + Accept/Decline; Accept makes them Steward (relayed); Decline relays "passed on" without naming the route; expired/answered resolves via the mapped 409
- [ ] Close: renders only for the last active member; ConfirmModal with the honest preserve/reassign copy; success → `/groups`
- [ ] Delete: renders only for `delete_group` holders (my-permissions payload, never a role-name check); danger-styled explicit ConfirmModal; distinct from Leave/Remove/Close; success → `/groups`
- [ ] Every affordance uses `ConfirmModal` (Hub rule); loading states shown; related UI updates together after each action
- [ ] Red-first unit tests for each affordance's render-gating + confirm/relay behaviour; prior `/groups` and `/groups/[id]` tests stay green
- [ ] `next build` + lint clean

## Technical notes

Reuse the H016 affordance patterns (row actions off the already-fetched my-permissions read; ConfirmModal; the Leave affordance's in-place refusal line — this feature turns its sole-Steward/last-member refusals into the transfer/close flows, extending the one refresh path, not replacing it). No new page. The pending-nomination affordance mounts on `/groups` and re-homes into the A-NTF inbox later (build it to re-home without a rewrite — spec Extensibility). Affordance visibility = my-permissions payload (`delete_group`) + contract-reported structural position (sole Steward / last member), never a role-name equality check (products CLAUDE.md). Copy is driven by the contract's guarantee (so DS-4/DS-5 later enriches copy, not plumbing). No client-side expiry-countdown authority (show the window; the contract enforces).

## Verification

Unit suites green (red-first); `next build` + lint clean.
