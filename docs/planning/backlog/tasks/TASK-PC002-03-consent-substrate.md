---
id: TASK-PC002-03
title: Append-only consent-record substrate (table + RLS + append-only enforcement)
status: review
assigned_to: Claude
priority: high
feature: FEAT-PC002
owner: platform/core/identity
wave: ferd
cycle: IDN-2
depends_on: []
estimated_hours: 4
---

# TASK-PC002-03: Append-only consent-record substrate

## Description

FEAT-PC002 STORY-5 (schema half), ADR-U034. Create the append-only consent-record
table the transcendence finalisation (TASK-PC002-04) writes into atomically. PC-2
owns the table; the Privacy vertical levies obligations; PC-4 consumes. IDN-2
captures only the **transcendence** purpose, but the substrate is shaped so future
purposes are data, not schema change.

Status `review`: new table behind the schema-review gate.

## Acceptance criteria

- [x] `consent_records` table exists with **RLS** (subject reads only its own
      rows; no broad exposure), an **open purpose identifier** (text/lookup — not a
      sealed enum), policy version, timestamp, and capture context.
- [x] Any UPDATE or DELETE on a consent record outside the controlled erasure path
      is **rejected** (append-only enforced by RLS/trigger).

## Technical notes

- **New table → RLS without exception** (platform rule). Subject keyed via the
  repo actor chain (`users.id` / `personal_group_id`, ADR-U006/U007), **not**
  `auth.uid()` directly (P-O1).
- `INSERT…RETURNING` dual-policy trap: include the creator's identity in the SELECT
  policy so a freshly-inserted row survives its return trip.
- Append-only: a withdrawal is a **new appended row** (later feature) — no in-place
  mutation. Enforce via trigger raising on UPDATE/DELETE (CHECK can't subquery).
- The atomic write itself is TASK-PC002-04 (same txn as transcendence).

## Verification

- Integration tests: RLS subject-scoping, append-only rejection (UPDATE + DELETE),
  open-purpose acceptance, column shape. Red-first.
