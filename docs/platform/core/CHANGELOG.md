# Changelog — Platform Core

Substrate-level changes to Platform Core (Infrastructure, Identity, Organisation, Governance). These are developer-facing platform changes, not end-user features; each entry links the feature spec with the full implementation notes.

*Register note (2026-08-01): entries between FEAT-PC001 and Cycle ADM-A are missing — Core substrate changes from those cycles were recorded in the root `CHANGELOG.md` and the feature specs only. The gap is logged as a doc-health finding; backfill is a hygiene task, not silently absorbed here.*

## 2026-08-01 — Group administration contracts ([FEAT-PC020](./features/FEAT-PC020-group-administration-contracts.md), Cycle ADM-B)

- **Five `admin_*` SECURITY DEFINER contracts** (all PC-4, born classified): `admin_get_groups(p_filter)` — cross-platform enumeration with the `deusex_stewarded` caretaker filter (the AC3-O8/RW-05 discharge; derived from membership rows, never name matching); `admin_get_group_detail` — row + Gracy-honest count pair + human stewards + (second migration) the `members` array serving the Hub reassign picker; `admin_suspend_group` / `admin_reactivate_group` — the **first producers of `groups.status = 'suspended'`** (the CHECK admitted it since sprint1 with zero writers); `admin_reassign_group_stewardship` — the exit from caretakership, composing the PC-3 walls (`can_assign_role` with the true actor, the active-member predicate, `prevent_last_leader_removal` on the caretaker teardown — never reimplemented).
- Every mutation audited (pattern (a), dotted action namespace: `group.suspend` / `group.reactivate` / `group.reassign_stewardship`), `FOR UPDATE` on targets, typed refusals (`42501`/`P0002`/`P0001`/`22023`). No new tables; strictly additive.
- Migrations: `20260801120000_adm_b_pc020_group_administration_contracts.sql`, `20260801130000_adm_b_pc020_detail_members_array.sql`. Consumed by Hub FEAT-H035.

## 2026-07-31 — Telemetry sink + durable auth-event audit ([FEAT-PC018](./features/FEAT-PC018-telemetry-event-store-and-statistics.md) / [FEAT-PC019](./features/FEAT-PC019-durable-auth-event-audit-binding.md), Cycle ADM-A — entry recorded at the ADM-B close)

- **`telemetry_events`** (PC-1, ADR-U052): the V4 sink — RLS deny-all, `record_telemetry_event()` the never-raises sole writer, 90-day prune, `get_platform_statistics()` the admin-gated sole reader (versioned jsonb document).
- **`record_auth_event()`** (PC-4): the durable audit-write primitive for the four member-auth moments (`auth.sign_up` / `auth.sign_in` / `identity.transcended` / `mist.explicit_erase` namespace at the callers); additive over the untouched `admin_audit_log`.
- Migrations: `20260731180000_adm_a_pc018_telemetry_store_and_statistics.sql`, `20260731190000_adm_a_pc019_auth_event_audit.sql`. Consumed by Hub FEAT-H034.

## 2026-06-26 — Mist anonymous-identity substrate, arrival ([FEAT-PC001](./features/FEAT-PC001-mist-anonymous-substrate.md))

- **`users.is_temporary`** identity-state flag (existing FIM rows backfill to `false`).
- **`handle_new_user` Mist branch** — an anonymous auth insert materialises an `is_temporary` profile with a proto personal group, a `'Mist'` name default (no null-crash on the nameless Mist), and **no** FringeIsland Members enrolment (status-driven access).
- **`users.email` made nullable** — a Mist carries no PII (UNIQUE still holds for FIMs).
- **Visitor→Mist rename** — the vestigial `'Visitor'` system group / `'Guest'` role renamed to `'Mist'` (ADR-U031).
- Migration: `supabase/migrations/20260626120000_mist_anonymous_substrate.sql`. Consumed by Hub FEAT-H003. The ephemerality reaper, consent substrate, and transcendence are deferred to FEAT-PC002.
