# TASK-PC001-01: Mist substrate migration + PC-2 contract tests (TDD red-first)

---
id: TASK-PC001-01
title: Mist substrate migration (is_temporary + handle_new_user Mist branch + Visitor→Mist rename) + PC-2 contract tests
status: review
feature: FEAT-PC001
owner: platform/core/identity
wave: ferd
depends_on: []
estimated_hours: 4
---

## Description

The platform substrate for IDN-1 arrival. **Schema change → `review`, not `done`, on completion** (platform tier rule); the shape was pre-approved by Stefan (Q1, 2026-06-26). TDD red-first: write the PC-2 integration contract tests, demonstrate red (no `is_temporary`, anon insert null-crashes), then the migration makes them green.

Migration (new file via the supabase-CLI workflow — never rewrite `20260222000000`):
1. `users.is_temporary boolean not null default false` (existing FIM rows backfill `false`).
2. Amend `handle_new_user`: `is_temporary => COALESCE(NEW.is_anonymous, false)`; name fallback `COALESCE(display_name, email, 'Mist')` (Steps 1 & 2); branch Step 4 to **skip FringeIsland Members enrolment for anon**.
3. Seed rename `'Visitor'` group → `'Mist'`, `'Guest'` role → `'Mist'` (`supabase/seeds/04_system_groups.sql`).

## Acceptance criteria (each demonstrated red first)

- [ ] **STORY-1:** anon auth insert → `users` profile with `is_temporary = true` + non-null `personal_group_id`; credentialed insert → `is_temporary = false` with the FIM path byte-for-byte unchanged (FEAT-H002 contract green); existing rows backfill `false`.
- [ ] **STORY-2:** anon insert with no `display_name`/`email` → profile + proto group materialise with `'Mist'` default, **no null-crash**.
- [ ] **STORY-3:** anon insert → exactly one proto personal group (sole member, zero-perm "Myself" role), **not** enrolled in FringeIsland Members; the Mist reads its **own** `users` row under the existing own-row RLS (anon `auth.uid()` resolves).
- [ ] **STORY-4:** seeds rename 'Visitor'→'Mist' (group) / 'Guest'→'Mist' (role); no dangling refs.

## Technical notes

- Workflow (platform `CLAUDE.md`): `bash supabase-cli.sh migration new mist_anonymous_substrate` → edit SQL → `node scripts/apply-migration-temp.js <ts>_*.sql` → `bash supabase-cli.sh migration repair --status applied <ts>` → `migration list`.
- Read the live `handle_new_user` body (`20260222000000` L538-595) + `04_system_groups.sql` (L55-65) before editing; amend additively, preserve SECURITY DEFINER + `search_path = ''`.
- Anon session in tests: `supabase.auth.signInAnonymously()`; `handle_new_user` is AFTER INSERT — poll/retry for the profile (precedent `signInWithRetry`).
- Harness: `createTestClient` / `createAdminClient` / `cleanupTestUser`. Mint + tear down anon users (no FEAT-PC002 reaper yet).
- **Do NOT** add TTL-marker columns or factor the seam (FEAT-PC002 / ADR-U016 pickup).

## Verification

- `npm run test:integration -w hub` (or `npm run test:integration:auth`) green — new `mist-substrate.test.ts`; existing FIM suites unregressed.
- Migration applied + repaired; `bash supabase-cli.sh migration list` clean.
- **Set status `review`** for the schema approval before merge.
