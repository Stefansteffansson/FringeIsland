# TASK-PC001-02: Mist-creation cascade verification + observability + finalize to 6-done

---
id: TASK-PC001-02
title: Mist-creation cascade verification + observability event + DoD finalize (6-done, §L4)
status: todo
feature: FEAT-PC001
owner: platform/core/identity
wave: ferd
depends_on: [TASK-PC001-01]
estimated_hours: 2
---

## Description

Close FEAT-PC001: verify the ADR-U016 Mist-creation cascade end-to-end, emit/enable the Mist-session-creation observability event (STORY-5), and finalize the platform feature to `6-done`.

## Acceptance criteria

- [ ] **STORY-5:** the Mist-creation cascade (PC-2 profile · PC-3 proto group · Privacy/Observability/Administration effects) is verified against the spec's cascade table; a **Mist-session-creation observability event** (actor + outcome) is emitted toward the platform path, failures included.
- [ ] **Test DoD:** every FEAT-PC001 acceptance criterion has a passing test demonstrated red first; integration suite + lint green; the FIM path unregressed.
- [ ] FEAT-PC001 → **6-done**; Implementation notes record the migration file + the red→green evidence honestly (any test-after labelled).
- [ ] **Same commit:** identity-spec **§L4** row → 6-done; Core `features/README.md` → 6-done; `CHANGELOG.md` updated (substrate: Mist anonymous identity).

## Technical notes

- Observability binds to the existing telemetry/structured-log seam (PC-1 sink still unrealised — mirror FEAT-H001/H002 honesty; record the seam in Implementation notes).
- Record the deferred FEAT-PC002 items (TTL reaper, consent, transcendence, erasure cascade) in Implementation notes — honest seams, nothing dropped.

## Verification

- `npm run test:integration -w hub` green; `npm run lint -w hub` clean.
- identity-spec §L4 + Core README + CHANGELOG reflect 6-done.
