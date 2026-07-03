---
id: TASK-PD001-02
title: Journal erasure cascade + own-subject export contract + hub lib
status: review
assigned_to: Claude
priority: high
feature: FEAT-PD001
owner: platform/domain/intelligence
wave: ferd
cycle: IDN-5
depends_on: [TASK-PD001-01]
estimated_hours: 3
---

# TASK-PD001-02: Erasure cascade + export contract + lib (STORY-4..5)

## Description

- **STORY-4 (erasure leaves nothing behind):** integration test — seed a FIM
  with entries, run `erase_fim_account` (admin caller; delegates to
  `admin_hard_delete_user`), assert **zero** `journal_entries` rows remain and
  none were sentinel-reassigned (no rows under the `[Deleted User]` group).
  Enforcement is the TASK-PD001-01 FK `ON DELETE CASCADE`; this task proves it
  end-to-end against the real teardown path.
- **STORY-5 (export):** `get_own_journal_export()` — SECURITY DEFINER,
  `SET search_path = ''`, resolves via `auth.uid()` → `users` **directly**
  (NOT the `is_active`-gated helper — PC008 precedent: a suspended member
  keeps their right of access). Returns versioned jsonb
  `{ schema_version: 1, exported_at, entries: [...] }` — all and only the
  caller's entries; `entries` present-and-empty (never absent) for a FIM with
  none. Ships in the TASK-PD001-01 migration file (one schema-gate review).
- **Hub lib:** `hub/lib/journal/queries.ts` — typed wrappers over the five
  RPCs (the `fetchOwnDataExport` shape: take `SupabaseClient`, `.rpc()`, throw
  `PostgrestError`). Tests exercise the contracts through the lib.

## Acceptance check

- Erasure test: entries exist → erase → zero rows for the erased member;
  suspended-member export succeeds (suspend via admin flag flip, then export).
- Export doc: `schema_version === 1`, own entries only (Alice/Bob isolation),
  empty-array shape for entry-less FIM.
- No content-bearing logging anywhere; RPC errors never echo `body`.

## Verification

`npm run test:integration:journal -w hub` green (was red);
`npm run test:integration:auth -w hub` no regression (erasure path touched);
`npm run lint`.
