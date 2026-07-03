# Session contracts: get_own_sessions + revoke_own_session (migration + red-first contract tests)

---
id: TASK-PC009-01
title: Session contracts — migration (get_own_sessions + revoke_own_session) + red-first integration contract tests
status: todo
assigned_to: claude
priority: high
feature: FEAT-PC009
owner: platform/core/identity
wave: ferd
cycle: E
depends_on: []
estimated_hours: 4
---

## Description

The two own-subject SECURITY DEFINER contracts over `auth.sessions` (FEAT-PC009 STORY-1/2/4): `get_own_sessions()` (jsonb inventory, newest-last-active first, `is_current` via the JWT `session_id` claim; `auth.uid()`-direct — survives suspension; FIM-only → 42501 for a Mist) and `revoke_own_session(p_session_id)` (own-row delete, refresh tokens die by FK cascade; foreign/nonexistent → P0002 no-existence-leak; current-session revoke allowed). One migration; **no new table**. Red first: integration contract tests written and demonstrated red (functions absent) before the migration is authored.

## Acceptance criteria

- [ ] Contract tests demonstrated RED (functions missing), then GREEN post-migration
- [ ] Inventory shape: id / created_at / last_active / user_agent / ip / is_current; ordered by last_active desc; exactly one `is_current=true` for the caller's session
- [ ] Two-session user: revoking B from A removes B only; B's `getUser()` subsequently fails; A unaffected
- [ ] Foreign or nonexistent session id → P0002 (same error both cases)
- [ ] Mist (anonymous session) → 42501 on both contracts; suspended FIM → both contracts still work
- [ ] Migration applied to dev DB + repaired; task set to `review` (schema gate)

## Technical notes

Mechanics precedent: `admin_force_logout` (migration `20260222000000` line ~2163) — SECURITY DEFINER deletes from `auth.sessions`. `SET search_path = ''`; FIM-only via `public.users.is_temporary IS DISTINCT FROM false` → 42501; caller via `auth.uid()` directly (NOT `get_current_personal_group_id()` — that is `is_active`-gated; PC008 precedent). `is_current` via `nullif(auth.jwt()->>'session_id','')::uuid`. `ip` via `host(s.ip)`. Grants: EXECUTE to `authenticated` + `service_role` only. Tests: `hub/tests/integration/account/sessions.test.ts`, harness `hub/tests/helpers/supabase.ts` (createTestUser, signInWithRetry ×2 clients for two sessions, withAnonRateLimitRetry for the Mist, cleanupTestUser).

## Verification

`npm run test:integration:auth` (or the account slice) red→green; `bash supabase-cli.sh migration list` shows the migration applied.
