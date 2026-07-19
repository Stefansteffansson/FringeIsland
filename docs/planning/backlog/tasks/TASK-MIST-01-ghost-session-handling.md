# Ghost Mist sessions — a browser session outliving its erased subject

---
id: TASK-MIST-01
title: Handle the ghost window - a client session whose Mist was erased server-side
status: todo
assigned_to: claude
priority: medium
feature: FEAT-H003
owner: hub
wave: ferd
cycle: none
depends_on: []
estimated_hours: 3
---

## Description

J-O3 area-gate finding (2026-07-19, Stefan's live walk + diagnosis): when a Mist is erased server-side (the 72 h ADR-U033 reaper, or a cross-domain Say-goodbye) while a browser still holds its session, the client reads `identity === 'mist'` from the JWT's `is_anonymous` claim (a local derivation — correct by design, ADR-U037) while every platform call fails: the arrival check 42501s silently (`onboarding.arrival_failed` telemetry, no navigation), the catalogue shows no walk, and the Mist-presence page renders a beginning that cannot continue. The state self-heals when the token refresh fails (≤ 1 h), but inside the window the front door is broken in exactly the way a confused first-time visitor would hit.

## Acceptance criteria

- [ ] A resolvable-actor failure (42501) from the arrival check or the Mist-page walk resolution is treated as a broken session: drop the local session (sign out) so the visitor lands sessionless and the next "keep looking around" mints a fresh Mist — the first-time experience restored within one interaction
- [ ] The farewell path is re-verified on one domain end-to-end (it is E2E-green today) and the per-domain session split is documented in the Mist-presence spec (a goodbye on one domain cannot clear another domain's remembered Mist — browser fact, worth a line in FEAT-H003/H004's notes)
- [ ] Red-first units for the ghost-detection branch

## Verification

Unit + the Mist E2E arc; manual: erase a Mist server-side with the browser session alive, reload — sessionless entry, fresh Mist on next look-around, auto-launch fires.
