# The Hub Ask capture — input, background save, cache write-through, frozen read-only

---
id: TASK-JF-04
title: Ask capture UI in the player — optional-always input, JRN-9-doctrine save, frozen read-only
status: done
assigned_to: claude
priority: high
feature: FEAT-H024
owner: hub
wave: ferd
cycle: J-F
depends_on: [TASK-JF-03]
estimated_hours: 5
---

## Description

FEAT-H024 STORY-1/2/3: the response input on `captures_response` steps (labelled by `ask_verb`, prefilled from `instances[].response`), background save on blur/navigation through a new BFF endpoint wrapping `save_step_response` (never blocking, rollback + retry, quiet saved/unsaved indicator), confirmed-response write-through to the session player cache in the same handler, the explicit-empty retraction path, and the frozen posture rendering words read-only via the existing `readOnly` path.

## Acceptance criteria

- [ ] FEAT-H024 STORY-1 + STORY-2 + STORY-3 ACs green (unit red-first; E2E in TASK-JF-05's arc)
- [ ] No kind list in Hub code — placement keys off the payload's `captures_response` only
- [ ] Route-policy conformance green over the new BFF route; response content absent from telemetry/logs

## Technical notes

Player page `hub/app/journeys/[id]/play/page.tsx`; renderers `hub/components/journeys/step-renderers/index.tsx`; canvas `StepCanvas.tsx` (readOnly path); cache `hub/lib/journeys/player.ts` (write-through per the J-D session-cache doctrine); transports + types `hub/lib/journeys/queries.ts`. Save ordering: independent background writes, never serialized with enter/complete (B5).

## Verification

`cd hub && npm test` (unit red-first then green); lint; `next build` green (the type gate).
