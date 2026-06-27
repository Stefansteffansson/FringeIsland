---
id: TASK-PC002-02
title: Scheduled ephemerality reaper (pg_cron sweep + inactivity TTL + reaper-run event)
status: done
assigned_to: Claude
priority: high
feature: FEAT-PC002
owner: platform/core/identity
wave: ferd
cycle: IDN-2
depends_on: [TASK-PC002-01]
estimated_hours: 5
---

# TASK-PC002-02: Scheduled ephemerality reaper

## Description

FEAT-PC002 STORY-1 + the reaper-run half of STORY-4 (ADR-U033). Enable `pg_cron`
and run a scheduled `SECURITY DEFINER` sweep that erases expired, un-transcended
Mists — closing the accumulation gap and making ephemerality an enforced
guarantee. Reuses `_erase_mist(uuid)` from TASK-PC002-01.

Status `review`: schema change (extension enablement + scheduled job + function)
behind the schema-review gate.

## Acceptance criteria

- [x] Given `pg_cron` enabled by migration and a Mist whose **inactivity** exceeds
      the configured TTL, when the sweep runs, then the Mist's `auth.users` row,
      proto group + membership, journeys, and session-scoped rows are erased with
      **no orphaned child rows**.
- [x] Given a Mist active within the TTL, when the sweep runs, then it is **not**
      erased (inactivity-based, not creation-based).
- [x] Given a transcended FIM (`is_temporary = false`), when the sweep runs, then
      it is **never** in the sweep set.
- [x] Given the TTL/inactivity threshold, when read, then it resolves from **PC-2
      configuration**, not a hardcoded literal in the function body.
- [x] A reaper-run event (counts swept/erased/skipped, failures included) is
      emitted (V4), flipping the `reaperRealised` signal **true**.

## Technical notes

- `pg_cron` is available (`default_version 1.6.4`) but **not enabled** — enable by
  migration. Standing platform commitment + monitored job (ADR-U033). Sweep
  cadence ≪ TTL so expiry is bounded by the TTL, not the cadence.
- Inactivity signal: candidate `auth.users.last_sign_in_at` — decide + justify at
  build (TDD). TTL config store (config row vs server constant) is a build detail;
  the value must be changeable without altering the function.
- **Race guard (ADR-U031 "no erase mid-migration"):** inactivity-based exclusion
  + exclude any row with an in-flight-migration marker; transcendence runs in a
  single txn with row-level locking. Test the concurrent reap-vs-transcend window
  (shared with TASK-PC002-04).
- Reuse `public._erase_mist(uuid)` (do not duplicate the cascade).

## Verification

- Integration tests: expired-erased / active-survives / transcended-never-swept /
  TTL-from-config; reaper-run event asserted. Red-first, full pyramid.
