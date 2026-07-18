# Player-read additive keys, the privacy wall, and the walks export

---
id: TASK-JF-03
title: get_player_state additive keys + private-only pins + get_own_step_instances_export
status: done
assigned_to: claude
priority: high
feature: FEAT-PD007
owner: platform/domain/journeys
wave: ferd
cycle: J-F
depends_on: [TASK-JF-01]
estimated_hours: 4
---

## Description

Re-issue `get_player_state` (latest def: PD005) with the four byte-additive keys — `instances[].response`, `instances[].response_updated_at`, `steps[].captures_response`, `journey.takeaway` — no existing key changes shape. Pin the privacy wall: `get_group_journey_progress` carries no response key/content in any consent state; travellers see only their own instances; frozen read standing (Q9) serves responses read-only. Add `get_own_step_instances_export()` (own-subject, fixed shape, Mist-callable, 42501 on no actor) discharging the FEAT-H010 step-instances flag.

## Acceptance criteria

- [ ] FEAT-PD007 STORY-3 + STORY-4 + STORY-6 ACs green, demonstrated red first
- [ ] Byte-additivity pinned: existing H020/H021/H022 payload consumers' keys unchanged in shape
- [ ] The onboarding journey's seeded takeaways verified served end-to-end (`journey.takeaway` non-null; steps 1/4 `content.takeaway` present)

## Technical notes

Follow the PD004/PD005 additive-block pattern. The export read joins step + journey titles for legibility but takes no filters — not a query surface. Response content must never appear in `get_group_journey_progress` — write the negative test across consent states.

## Verification

`npm run test:integration:journeys` red-first then green; full integration sweep unregressed.
