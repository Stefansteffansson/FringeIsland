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

---

## 2026-08-11 (Phase-4 W9) — measured; the live mechanism is NOT the one this task describes

**This task's premise has been overtaken by TASK-INT-03.** The shared helper it proposes to write already exists and is already correct: `eraseUserAndPersonalGroup` (`hub/tests/e2e/helpers/auth.ts:43`) performs exactly the order above and **throws** when the personal group survives. The consent-FK RESTRICT defect is closed.

**What is actually still leaking, measured across two full sweeps:** exactly **five identities per sweep**, from three specs, the same five every time:

| Fixture family | Owning spec | Shape |
|---|---|---|
| `gf-stewa`, `gf-stewb`, `gf-gracy` | `group-of-groups.spec.ts` | teardown deleted **groups only** — never the three FIMs it created |
| `h023-carry` | `onboarding-arrival.spec.ts` | identity created **through the UI** (transcendence flow) |
| `h004-transcend` | `transcendence.spec.ts` | identity created **through the UI** |

**Why no instrument caught this.** These users keep their personal groups, so nothing is ever *orphaned*: the orphan instrument read a clean delta of 0 (955 → 955) on every sweep while the census climbed. **The instrument was measuring the wrong noun** — orphaned groups, not surviving fixtures. That is the transferable lesson, and it is why this ran for months looking healthy.

**Fixed and verified — 3 of 5.** `group-of-groups.spec.ts` now resolves its three fixtures by email and deletes them through the throwing helper. Verified by measurement rather than assertion: a targeted run created three and left **zero**, while the prior sweep's three remain on record.

**Still open — 2 of 5.** The UI-created identities (`onboarding-arrival`, `transcendence`). Different shape: the spec never holds an `authId`, so cleanup must resolve by the email it typed into the form. Not attempted here.

**Also done:** eight `.catch(() => undefined)` wrappers around `deleteE2EUserByAuthId` removed across seven specs — they were filing the teeth off a helper that already throws.

**Census is now 2 052**, up from the 1 289 recorded when this task was filed on 2026-08-03.

**SUPERSEDED — FULL DEV-DB RESET 2026-08-12.** Stefan changed the ask from "purge the fixture residue" to "wipe user data for a clean Hub v2 start". Final state: **1 account** (`deusex@fringeisland.com`), **5 groups** (the four system groups + DeusEx's personal group), **1 journey** (`Arrival on FringeIsland`, the onboarding-designated one, kept by explicit instruction, with its 4 steps), **4 foundational role templates**, and **zero** messages / conversations / consent records / notifications / audit rows / telemetry. Preserved deliberately as vocabulary rather than data: the 48-permission catalogue, `step_kinds` (7), `content_families` (6), the notification registries.

**Two things did not fall out with their owners, and would have been missed by a group-scoped wipe:**
- **Direct-message conversations are not group-anchored** (`conversations.group_id IS NULL` for `kind='dm'`), so 557 DM threads and their 1 123 messages survived the deletion of every group and every account. They are only reachable through their participants, and the participants were gone — silent orphans.
- **379 consent records had no subject group at all**, so the `RESTRICT` that normally protects them never engaged.
Both were cleared in a follow-up pass. Worth remembering: "delete the groups and the people" does **not** empty the messaging substrate.

**Consequence now live, previously predicted:** `member-enumeration-bounded.test.ts:234,237` assert the admin list caps at 200 and defaults to 50, commented "dev census > 200". With one account those cannot bind and will fail until the census is rebuilt. The fix is to assert the cap *behaviour* without depending on a crowded database — a test that only passes on a cluttered dev DB is exactly what this reset exists to end.

**Also closed by this reset:** the offer to restore the `Gracy` persona. Her personal group and social graph survived the earlier purge and could have been re-linked to a new login; this pass deleted them along with everything else, per the instruction.

---

**Prior (superseded) — partial fixture purge, same day.** Scoped to the reserved `.test` domains only, sparing `dev-login@fringeisland.test` (his manual-testing account, in use since June).

| | before | after |
|---|---|---|
| auth users | 3 014 | **44** (11 named + 33 anonymous Mists) |
| groups | 4 450 | **140** |
| — personal | 3 968 | 73 (29 still orphaned, see below) |
| — engagement | 478 | 63 |
| — system | 4 | **4, untouched** |
| notifications | 87 274 | 4 185 |
| journey enrolments | 2 294 | 69 |
| consent records | 3 372 | 395 |
| **journeys** | 62 | **62 — deliberately untouched** |

**Journeys were NOT purged, and that is the finding worth keeping.** The measurement before deleting showed **61 of the 62 journeys are public and owned by engagement groups that every "is this test residue?" test classified as residue** — they have no surviving real member, because the seed data was created by fixture users. They are the published catalogue. A purge that trusted the residue classification would have destroyed it (or been blocked by the `RESTRICT` on `journeys.created_by_group_id`, which is the guard that exists for exactly this). The 54 groups owning them were excluded from deletion by name.

**Other things the substrate refused, correctly:** 29 orphaned personal groups survive because `prevent_last_leader_removal` refuses to unbind the last Steward of a surviving group. They were deleted one-by-one with per-row exception handling precisely so the trigger could veto individual cases without aborting the batch.

**Incidental finding:** three of the leaked fixtures held **platform-admin** rights (`e2e-rdb-admin-*`, `test-*`, granted 2026-08-08 and never cleaned up). Gone with the purge, but tests that grant admin and leak the account are worth a look — that is a wider blast radius than an ordinary fixture leak.

**Verified after:** platform conformance **30/30**, auth slice **47/47** (which creates users, so the signup path is proven, not assumed).

**Prior note — the risk assessment that cleared this:** `member-enumeration-bounded.test.ts:234,237` require a dev census > 200. Purging the 2 052 `e2e-%` fixtures leaves ~927 of 2 974 `public.users`, so both cells still bind. No other census-size-dependent assertion exists in the tree.

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
