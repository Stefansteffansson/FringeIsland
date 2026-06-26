# TASK-H003-05: Continuity posture + privacy/observability (STORY-4 + STORY-5)

---
id: TASK-H003-05
title: Continuity posture (fresh-start-on-return) + V2 privacy / V4 telemetry
status: done
feature: FEAT-H003
owner: hub
wave: ferd
depends_on: [TASK-H003-03]
estimated_hours: 3
---

## Description

Lock the **continuity posture** (manifesto-aligned) and the Mist privacy/observability bindings. A Mist returning across a true session boundary is a **new Mist** (no cross-session identifier); durable memory is the FIM reward. No PII / no pre-consent profile at Mist creation; mist-entered telemetry (V4) with the accumulation gap logged.

## Acceptance criteria

- [ ] A Mist whose session ended (expired/reaped) or who returns on a different device is a **new Mist** — no cross-session identifier, no restored location, no "welcome back" derived from a prior anonymous visit.
- [ ] Same-device, live (un-reaped) session within TTL resumes **incidentally** — implemented as live-session persistence, **not** offered/promised as a continuity guarantee (no durable anonymous re-identification built).
- [ ] The become-a-FIM CTA frames durable continuity as a FIM property (conversion incentive), consistent with the platform promise / manifesto.
- [ ] Mist profile carries **no email and no real name** (data-min) and **no trait-profile** is computed (no pre-consent inference).
- [ ] A **mist-entered telemetry** event emits toward the PC-1 seam (V4), **including failures**; the **accumulation gap** (no reaper yet) is recorded (build-informed, PROCESS §9).

## Technical notes

- Continuity is mostly a **negative** guarantee — assert the *absence* of cross-session linking: no persistent anonymous identifier stored, no location restored across a fresh anon session. Test by simulating session-loss → new anon session → distinct Mist (new `users.id`).
- Telemetry binds to the in-memory `emitTelemetry` seam (PC-1 sink unrealised) — mirror FEAT-H001/H002.
- **No-go guardrails:** no device-local persistence built here (canon permits it as a kindness, but it is out of IDN-1 scope); no fingerprinting.
- **Red-first:** integration/unit assertions for the fresh-Mist-on-return behaviour + telemetry emission; confirm red, then green.

## Verification

- `npm run test:integration -w hub` + unit green; `npm run lint -w hub` clean.
