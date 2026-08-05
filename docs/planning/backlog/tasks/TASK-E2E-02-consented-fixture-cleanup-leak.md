# E2E fixture cleanup silently leaks consented FIMs — 1,289 detritus users on the dev DB

---
id: TASK-E2E-02
title: Fix the E2E fixture-cleanup pattern (consent FK RESTRICT + swallowed supabase-js errors) and decide the detritus purge
status: todo
assigned_to: unassigned
priority: medium
feature: none
owner: hub
wave: ferd
cycle: unscheduled
depends_on: []
estimated_hours: 3
---

## Description

Found at the ADM-E close (2026-08-03), while sweeping this cycle's own leaked fixtures: **the standing E2E afterAll cleanup pattern silently fails for every consent-bearing fixture FIM.** `admin.from('groups').delete().eq('id', pgId)` hits the `consent_records_subject_group_id_fkey` RESTRICT (every `createFim` fixture carries `consent_accepted: 'true'`) — and supabase-js **returns** the error instead of throwing, so nothing notices; the follow-up `auth.admin.deleteUser().catch(() => undefined)` swallows its own failure too. Measured: **1,289 users matching `e2e-%@fringeisland.test`** live on the dev DB — most of the ~1,900-member census that (a) triggered the PostgREST row-cap finding at ADM-C and (b) sized the PC024 page walks. The TASK-INT-05 DeusEx detritus was this same family.

The proven-good teardown order (used by this cycle's manual sweep): `set_config('app.consent_erasure_in_progress','true',true)` → delete the subject's `consent_records` → delete `auth.users` (cascades `public.users`) → delete the personal group. Group-before-auth trips `enforce_personal_group_id_immutability` on the SET NULL.

## Acceptance criteria

- [ ] The shared E2E cleanup helper performs the proven-good order and **checks every returned error** (a failed cleanup fails the teardown loudly, never silently).
- [ ] All specs using the local `createFim`/afterAll copy route through the shared helper (grep the e2e tree; admin-members / admin-bulk-members / admin-groups at minimum).
- [ ] The detritus question decided by Stefan and executed accordingly: purge the 1,289 (shrinks the census ~1,900 → ~600 — perf/pagination test expectations re-checked, e.g. the PC024 B1b "census > 200" cells) or keep as scale ballast with a dated record.
- [ ] The leak instrument (TASK-INT-05's) extended or a one-off audit run confirming zero new leaks after one full E2E sweep.

## Technical notes

Sanctioned GUCs: `app.consent_erasure_in_progress` (`20260626205412:68`), `app.bypass_personal_group_id_immutability` (`20260223171200:514`). The E2E `runAdminSql` (management API) is void — result-reading verification goes through `createAdminClient()`.

## Verification

`select count(*) from users where email like 'e2e-%@fringeisland.test'` stable across two consecutive full E2E sweeps; teardown fails red when a delete is refused.

---

**2026-08-05 occurrence (walk-debris sweep, mechanism confirmed live):** the two specs authored this session (`invitation-bell-answers.spec.ts`, the rebuilt `profile.spec.ts`) shipped without teardowns and leaked 13 consented fixture users + 20 groups in one day; a bare `auth.admin.deleteUser` fails `23503` on `consent_records_subject_user_id_fkey`, and the append-only consent trigger rightly refuses a bare purge — the sanctioned path is the transaction-local `app.consent_erasure_in_progress` setting, then the user, then the personal group (groups never cascade from users). Both specs gained that teardown same-day (the sweep PR). **Audit lead for this task:** `admin-roles.spec.ts` wraps its fixture `deleteUser` in `.catch(() => undefined)` — the same refusal would be swallowed silently there; sweep every spec's fixture-deletion path for the pattern when this task runs. The standing purge decision (the historical leaked population) remains Stefan's.
