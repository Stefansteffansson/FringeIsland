# Preference substrate + shared dispatcher migration — HELD AT THE SCHEMA GATE

---
id: TASK-ND-02
title: Migration — notification_preferences, notification_channels, two category columns, ds5_may_deliver, the BEFORE INSERT dispatcher, and the preference/operator contracts
status: done
assigned_to: claude
priority: high
feature: FEAT-PD016
owner: platform/domain/communication
wave: ferd
cycle: N-D
depends_on: [TASK-ND-01]
estimated_hours: 4
---

## Description

The one migration N-D carries (board row ND-8). Per the platform-tier rule, **schema changes set status to `review`, not `done`**, and per the standing house rule the PR **ships held at the schema gate** with the red test and the apply commands in its body. **The gate merges only on an explicitly-named nod** ("ok merge #NNN") — never on a generic "go on".

Contents:

1. `notification_channels(channel PK, label, delivers, created_at)` — open registry, reference-data RLS posture (SELECT for `authenticated`, no user-facing write policy — the `notification_kinds` / `conversation_kinds` precedent). Seed `in_app` (`delivers = true`), `email` (`delivers = false`).
2. `notification_preferences(recipient_group_id, category_key, channel)` PK + `allowed`, `updated_at`. FKs to `groups(id)`, `notification_categories(key)`, `notification_channels(channel)`. RLS own-rows-only.
3. `ALTER notification_categories` — `member_suppressible BOOLEAN NOT NULL DEFAULT true` (seed `false` for `account` only), `nudge BOOLEAN NOT NULL DEFAULT true`.
4. `ds5_may_deliver(recipient_group_id, kind, channel)` — the single decision point. **Fails open.**
5. `trg_ds5_apply_notification_preference` — `BEFORE INSERT ON public.notifications`, `RETURN NULL` on suppression.
6. `notify_notification_hint` amended for the per-category `nudge` check (existing `ds5_config` platform path unchanged).
7. Contracts: `get_own_notification_preferences`, `set_own_notification_preference`, `get_notification_nudge_policy`, `set_notification_nudge_policy`, `set_notification_category_nudge`, `get_platform_announcement_reach`; preferences added to the export section.

## Acceptance criteria

- [ ] Both new tables have RLS (the tier rule admits no exception, including reference-data tables).
- [ ] Every new function is `SECURITY DEFINER` with `SET search_path = ''`, REVOKEd from `PUBLIC`/`anon` where not intended for clients, and its elevation justified in a migration comment.
- [ ] **The direct-caller question (ADR-U038) is answered in the migration header** for each new table and function: what can a direct PostgREST caller — including an anonymous-session Mist holding `authenticated` — do here that the Hub route would not allow? Column privileges checked, not just row RLS.
- [ ] Operator contracts are `is_platform_admin()`-gated (the minimal-body helper, per the PG17 RLS complexity ceiling), not `has_permission()`.
- [ ] No hardcoded channel list, category list, or grade list anywhere in the migration — channels arrive as data (the Ferd non-closure constraint).
- [ ] The `lawful_basis` CHECK is untouched.
- [ ] Migration applied to the dev DB and marked repaired; if the apply is permission-denied in an autonomous session, the PR ships held with the apply commands in its body rather than bypassing the gate.

## Verification

`bash supabase-cli.sh migration list` shows it applied; TASK-ND-01's suite flips green (TASK-ND-03).

## Outcome (2026-07-26)

Applied and repaired (`20260726120000`, local+remote confirmed). Shipped held at the gate in PR #295 and **merged on an explicitly-named nod** — the gate rule honoured.

Two corrections during the build: `set_own_notification_preference` moved from `RETURNS TABLE` to `RETURNS jsonb` (OUT params collide with column references, making `ON CONFLICT (category_key, …)` ambiguous — `42702`), with the `DROP FUNCTION` a return-type change requires so the migration stays re-runnable; and `ds5_require_fim_subject()` added so `28000` (identity) and `42501` (policy) do not collapse into one refusal code.
