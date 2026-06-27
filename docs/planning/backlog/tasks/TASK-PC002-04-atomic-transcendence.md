---
id: TASK-PC002-04
title: Atomic persistence-and-consent transcendence (finalise-in-place)
status: review
assigned_to: Claude
priority: high
feature: FEAT-PC002
owner: platform/core/identity
wave: ferd
cycle: IDN-2
depends_on: [TASK-PC002-03]
estimated_hours: 5
---

# TASK-PC002-04: Atomic persistence-and-consent transcendence

## Description

FEAT-PC002 STORY-3 + the transcendence-event half of STORY-4 + the atomic-write
half of STORY-5 (ADR-U031 stage 4, ADR-U034). A `SECURITY DEFINER`
`finalise_transcendence()` function runs **in one transaction** after the Supabase
anonymous→permanent conversion (which preserves the same `auth.users.id` →
continuity, nothing restarts). **Scope: the persistence-and-consent threshold
only** — the metamorphosis/ball/Beyond completion gate is a forward-looking seam,
not built.

Status `review`: schema change behind the schema-review gate.

## Acceptance criteria

- [x] In one transaction: `is_temporary => false`, enrol the user in **"FringeIsland
      Members"**, write the transcendence consent record (purpose = transcendence,
      TASK-PC002-03), and emit the transcendence event — **all-or-nothing**.
- [x] Continuity: all former-Mist FK-linked rows (proto group → personal group,
      journeys) belong to the now-permanent FIM unchanged — **same
      `personal_group_id`, no row recreation**.
- [x] On partway failure → rollback: the user remains a valid Mist (no half-FIM
      state) and **no consent record** is written.
- [x] Mid-transcendence, a concurrent reaper sweep does **not** erase the Mist
      (race guard — ADR-U031 "no erase mid-migration").

## Technical notes

- **Finalise-in-place, not a copy** — do not build a cross-account migration.
- Members enrolment mirrors `handle_new_user`'s FI-Members step (gated off for a
  Mist in FEAT-PC001 STORY-3; now run at transcendence).
- Invoked via additive PostgREST RPC / `/api/v1` (ADR-U009/U015) — no version bump.
- Notifications: emit the welcome/onboarding trigger (copy/routing is the
  Notifications area, consumed by FEAT-H004).
- Race guard pairs with TASK-PC002-02's in-flight-migration marker.

## Verification

- Integration tests: one-txn finalisation, continuity (same `personal_group_id`),
  rollback safety, concurrent reap-vs-transcend window. Red-first, full pyramid.
