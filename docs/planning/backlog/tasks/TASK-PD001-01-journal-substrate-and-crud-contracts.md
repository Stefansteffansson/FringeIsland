---
id: TASK-PD001-01
title: Journal substrate — journal_entries table + RLS/grants + CRUD RPCs, red-first
status: todo
assigned_to: Claude
priority: high
feature: FEAT-PD001
owner: platform/domain/intelligence
wave: ferd
cycle: IDN-5
depends_on: []
estimated_hours: 4
---

# TASK-PD001-01: Journal substrate + CRUD contracts (STORY-1..3)

## Description

The net-new Journal substrate (the first Domain-tier build). One migration:

- **`public.journal_entries`** — `id` uuid pk, `owner_group_id` uuid NOT NULL
  REFERENCES `public.groups(id)` **ON DELETE CASCADE** (rides
  `admin_hard_delete_user`'s personal-group hard delete; never in its
  sentinel-reassignment UPDATE list), `title` text (nullable, ≤300),
  `body` text NOT NULL (non-empty, ≤100k), `created_at`/`updated_at`
  timestamptz. Index `(owner_group_id, created_at DESC)`.
- **RLS enabled + own-rows policies** (defense-in-depth), **all table grants
  revoked from client roles** — no direct PostgREST table access; a direct
  `.from('journal_entries')` from any authenticated session (including an
  anonymous-session Mist) gets 42501.
- **CRUD RPCs** (SECURITY DEFINER, `SET search_path = ''`, EXECUTE to
  `authenticated` only): `create_journal_entry(p_title,p_body)` — **FIM-only**
  (refuses `is_temporary`, ERRCODE 42501); `update_journal_entry(p_entry_id,
  p_title,p_body)` + `delete_journal_entry(p_entry_id)` — own rows only,
  foreign/nonexistent id → P0002 (no existence leak);
  `get_own_journal_entries(p_limit,p_before)` — own rows, newest-first,
  keyset-paginated. Writers resolve the actor via
  `get_current_personal_group_id()` (the four-hop chain).

TDD: integration tests at `hub/tests/integration/journal/journal-contract.test.ts`
FIRST (helpers from `@/tests/helpers/supabase`; Mist via `signInAnonymously` +
`withAnonRateLimitRetry`), demonstrated red (RPCs absent → every call errors),
then the migration turns them green. Add `test:integration:journal` scripts
(hub + root package.json).

## Acceptance check

- Red run captured before the migration; green after.
- STORY-1: FIM create round-trips via list; Mist create refused (42501), no row.
- STORY-2 (adversarial, ADR-U038 direct-caller): direct table SELECT/INSERT/
  UPDATE/DELETE refused for authenticated + anon-session callers; foreign-id
  RPC access yields zero rows / P0002, never content.
- STORY-3: update changes title/body and advances `updated_at`; delete removes
  from all subsequent reads.
- Schema gate: task lands at **review**, not done (new table + RLS + grants).

## Verification

`npm run test:integration:journal -w hub`; migration applied + repaired
(`bash supabase-cli.sh migration list`); `npm run lint`.
