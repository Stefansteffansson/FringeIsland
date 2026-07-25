# N-C: the hint-emission migration — trigger, ds5_config, receive policy, publication DROP (SCHEMA GATE)

---
id: TASK-NC-02
title: "N-C: the hint-emission migration — trigger, ds5_config, receive policy, publication DROP (SCHEMA GATE)"
status: review
assigned_to: claude
priority: high
feature: FEAT-PD015
owner: platform/domain/communication
wave: ferd
cycle: A-NTF N-C
depends_on: [TASK-NC-01]
estimated_hours: 4
---

## Description

One migration carrying all four platform changes. **This task ends at `review`, never `done`** — it creates a table, a trigger, and an RLS policy, and drops a publication membership. Per the platform-tier rule, schema changes stop for human approval, and the merge unlocks only on an explicitly-named approval.

**1. `public.ds5_config`** — key/value operational settings for DS-5, mirroring `pc2_config` (`key TEXT PRIMARY KEY, value TEXT NOT NULL, description TEXT, updated_at TIMESTAMPTZ`). **RLS enabled with ZERO policies — deny-all.** *(Corrected 2026-07-25 from an earlier "SELECT to `authenticated`" draft: `pc2_config`, the precedent, is RLS-enabled with no policies at all. The blanket schema grants to `anon`/`authenticated` are inert because RLS denies by default, and only SECURITY DEFINER functions — which bypass RLS — read it. An operational config table needs no client reader in Ferd; the admin surface is N-D's. This is tighter than a SELECT policy and still satisfies the platform-tier "new tables require RLS" rule.)* Seeded with one row:

```
realtime_hint_platform_announcements | false | Whether a platform-wide announcement emits per-recipient ADR-U039 hints. Default false: a platform send reaches every FIM, so hints scale with headcount, not activity (N-C, ADR-U039:46 fan-out budget). Changeable without altering notify_notification_hint().
```

**2. `notify_notification_hint()` + `AFTER INSERT ... FOR EACH ROW` trigger on `public.notifications`.** SECURITY DEFINER, `SET search_path = ''`. Resolves `NEW.recipient_group_id` → `users.personal_group_id` → `users.auth_user_id`; emits nothing when that resolves NULL (group-addressed rows, Mists). Calls the **existing** `public.ds5_emit_hint(payload, event, topic)` with a content-free payload (`{"id": NEW.id}`), event `notification`, topic `account:<auth_uid>:notifications`. Suppresses when `NEW.type = 'announcement' AND NEW.payload->>'scope_kind' = 'platform'` **and** the config row is not `'true'` — fail-quiet, so an absent/garbage value suppresses rather than bursting.

**3. `ds5_notifications_receive_own`** on `realtime.messages`, `FOR SELECT TO authenticated`, `extension = 'broadcast'`, own topic only. **Must** use the initplan-wrapped form `(select realtime.topic())` / `(select auth.uid()::text)` per `20260704075549:39-44` — not the original PC009 shape. No send policy.

**4. `ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications`** (NB-7). Guard with the `pg_publication_tables` existence check the C-A precedent uses (`20260719230500:180-189`). The publication ends **empty**.

## Acceptance criteria

- [ ] Migration header documents: what it does, why the trigger needs SECURITY DEFINER elevation, the direct-caller question (ADR-U038), and the fan-out budget with the measured numbers.
- [ ] `ds5_config` has RLS enabled with a SELECT policy and **no** client write policy.
- [ ] The trigger is **non-fatal by construction** — `ds5_emit_hint` already swallows; the trigger function adds no `RAISE` on the emit path, so a realtime failure can never roll back the durable notification row.
- [ ] The receive policy uses the `(select ...)` initplan-wrapped form.
- [ ] The DROP is in the **same migration** as the emit (replace-then-remove — the capability is never absent).
- [ ] Task status set to `review` with the applied-or-blocked state recorded; **not** `done`.
- [ ] If the dev-DB apply is permission-denied in this session, the PR ships **held at the gate** with the red test output and the exact apply commands in its body — never bypassed.

## Technical notes

- Apply sequence (bash form only): `bash supabase-cli.sh migration new n_c_notification_hint_and_policy` → edit SQL → `node scripts/apply-migration-temp.js <ts>_name.sql` → `bash supabase-cli.sh migration repair --status applied <ts>` → `bash supabase-cli.sh migration list`.
- Reuse `ds5_emit_hint` **unchanged** — no wrapper, no fork, no inline `realtime.send` (the C-C Q2 ruling, `20260720153000:44`).
- Topic-resolution precedent: `20260720153000:120` resolves personal group → `users.auth_user_id` the same way.
- Write-path cost: keep to one indexed lookup plus one config read. A platform announcement inserting N rows must not become N table scans — the config read in particular must not re-plan per row unnecessarily.
- Conformance lockstep in the same PR: `DS_OWNED_ALLOWLIST` += the new function if the register requires it; `ds5_config` joins `DS_TABLES`; `notifications` **stays out** of `DS_TABLES` (ADR-U048).

## Verification

- The TASK-NC-01 suite flips green (TASK-NC-03 owns the full sweep).
- `SELECT * FROM pg_publication_tables WHERE pubname='supabase_realtime';` → zero rows.
- `SELECT policyname FROM pg_policies WHERE schemaname='realtime' AND tablename='messages';` → four receive policies, no INSERT/ALL.
- Direct-caller check: an anonymous-session Mist holding `authenticated` can neither execute `ds5_emit_hint` nor write `ds5_config`.
