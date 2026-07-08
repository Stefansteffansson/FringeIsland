# H021 completion moment + payload types — the milestone renders on confirm

---
id: TASK-JC-03
title: H021 completion moment + payload types
status: done
assigned_to: Claude
priority: high
feature: FEAT-H021
owner: hub
wave: ferd
cycle: J-C
depends_on: [TASK-JC-02]
estimated_hours: 3
---

## Description

Extend the player's types and completion flow for the PD004 payload: the `completion`/`timing` blocks on player state, the `journey_completed` transition flag on the completing save's response, and the completion moment (panel + header/rail completed state) rendered strictly on server confirm. BFF routes are pass-through — expect zero route changes; verify, don't assume.

## Acceptance criteria

- [ ] STORY-1 red-first: milestone renders on `journey_completed: true` from the background save; never optimistically; rollback path shows no milestone; non-edge completions show nothing.
- [ ] Types in `hub/lib/journeys/player.ts` gain the additive blocks (open shapes, no unions); session cache unchanged.
- [ ] Completion panel: existing primitives, canon voice, total elapsed shown, path into review; no new design-system components.
- [ ] Unit suite green; lint clean.

## Technical notes

The optimistic tick and rollback/retry stay exactly as H020 ships them — the milestone is additive rendering off the async confirm. Panel placement per FEAT-H021 OQ-1 default (in-canvas top, not a modal).

## Verification

`npm run test -- --selectProjects unit` (player suites) green; red-first reds recorded per block.
