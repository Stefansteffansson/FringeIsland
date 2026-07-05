# Sprint3 grant-hole closure + handle_notification_action neutralization + groups_delete drop + STORY-6 adversarial suite

---
id: TASK-PC014-03
title: Revoke anon/PUBLIC execute on the sprint3 nomination surface + neutralize handle_notification_action's caller-data stewardship dispatch (Open Q2) + drop the raw groups_delete RLS policy (Open Q4) + the STORY-6 adversarial direct-path suite + hygiene re-asserts + gate paperwork
status: done
assigned_to: claude
priority: high
feature: FEAT-PC014
owner: platform/core/organisation
wave: ferd
cycle: Groups G-E
depends_on: [TASK-PC014-01, TASK-PC014-02]
estimated_hours: 3
---

## Description

The ADR-U038 half of the cycle: closing the **live** sprint3 hole (a second confirmed instance after `leave_group`'s EXECUTE-to-PUBLIC — feeds the standing pre-partition SECURITY DEFINER grant-sweep line) and the raw deletion path. Three narrowings in the shared migration: (1) revoke `anon`/`PUBLIC` execute across the sprint3 nomination surface (`nominate_steward` / `handle_notification_action` / `_handle_stewardship_nomination_action`); (2) neutralize `handle_notification_action`'s stewardship dispatch — spec Open Q2 default is to **drop** `handle_notification_action` + `_handle_stewardship_nomination_action` outright, routing responses solely through `respond_to_stewardship_nomination` (the generic actionable-notification handler is A-NTF's to re-derive under ADR-U039); the in-place-strip alternative is the gate's to choose; (3) drop the raw `groups_delete` RLS policy (Open Q4 default — the contract is the only client-role deletion path; the raw DELETE bypasses freeze/reassignment/notification and hits the `journeys` RESTRICT wall anyway; PC013's member-exit-policy drop + the G-A `groups` narrowing are the precedents). Admin policies (`admin_*`) and `admin_exit_user_from_platform` untouched.

**Red-first shape (PC013-02 verbatim):** the holes are demonstrated red *before* the closure — the anon-role call to the sprint3 surface succeeds pre-migration (TASK-PC014-01 carries the nominate_steward red; this task carries the `handle_notification_action` caller-data-dispatch red — a hand-crafted `action_data` driving a stewardship side effect — and the `delete_group`-holder direct `DELETE` on `public.groups` succeeding on a journey-less group) — then the post-migration asserts prove privilege/RLS refuses each.

## Acceptance criteria

- [ ] Pre-migration reds, each labelled as the red-demonstration of a hole, not kept behaviour: (a) anon-role execute on the sprint3 surface not privilege-refused; (b) a direct `handle_notification_action` call with hand-crafted `action_data` drives a stewardship side effect; (c) a direct client-role `DELETE` on a journey-less group succeeds via `groups_delete` (and, asserted separately, errors on a journey-owning group — the RESTRICT wall)
- [ ] Post-migration: `anon` and `PUBLIC` hold no execute on any PC014 contract nor on any surviving sprint3 function (asserted via `pg_proc.proacl` / `has_function_privilege` at the gate, plus the anon PostgREST call refused)
- [ ] Post-migration: no caller can drive a stewardship side effect via hand-crafted `action_data` — under the Open Q2 default the two sprint3 functions are dropped (PGRST202); under the strip alternative the dispatch is inert (whichever the gate rules, the assert pins it)
- [ ] Post-migration: direct client-role `DELETE` on `public.groups` refused by RLS (0 rows, row survives re-read) for both a plain member and a `delete_group` holder; the `delete_group` **contract** remains the working path (re-asserted)
- [ ] Direct UPDATE setting `status='closed'`/`'archived'` on `public.groups` refused — the PC010 column-grant narrowing excludes `status` (re-asserted, not assumed)
- [ ] `TRUNCATE` on `groups` / `group_memberships` / `user_group_roles` from client roles still revoked (re-asserted via `information_schema.table_privileges`)
- [ ] Admin surface untouched and functioning: `admin_*` policies still permit a platform admin direct-DELETE (the makePlatformAdmin helper); `admin_exit_user_from_platform` unaffected (smoke-asserted or verified by inspection at the gate)
- [ ] Migration comment documents: each drop/revoke rationale, each SECURITY DEFINER elevation, the DS-4/DS-5 `pending-*` cascade tags, and the ADR-U038 direct-caller answer for the gate (intended: post-migration a direct PostgREST caller — including an anonymous-session Mist — can do nothing to stewardship, closure, or deletion that the contracts refuse)
- [ ] Gate package assembled: Open Q1–Q5 (Q5 load-bearing: soft-terminal `archived` vs hard-delete), the Open Q2 drop-vs-strip choice, the sprint3-grant-hole closure, the direct-caller question — PR prepared and **held for Stefan's nod**

## Technical notes

STORY-6 describe blocks live with their homes: the sprint3-surface reds + grant asserts in `stewardship-succession.test.ts`; the `groups_delete` drop + status-UPDATE + TRUNCATE + admin-intact asserts in `group-closure-deletion.test.ts`. Drop with exact policy/function names verified against `pg_policies` / `pg_proc` first (the `DROP POLICY IF EXISTS` wrong-name trap — platform CLAUDE.md gotcha). RLS refusals on UPDATE/DELETE surface as 0-row results, not errors — assert row-count + row-survival re-read (PC013-02 pattern). The anon client uses the publishable key with no session; the caller-data-dispatch red needs an authenticated non-recipient hand-crafting `action_data` against a live nomination fixture. Same migration as TASK-PC014-01/-02 — this task appends the revokes, the Open Q2 disposition, and the policy drop, and owns the migration's closing comment block.

## Verification

`npm run test:integration:groups` green post-migration; full `npm run test:integration` green (`--runInBand`, background); task lands at **`review`, not `done`** — the FEAT-PC014 schema gate (all five Open Qs + ADR-U038) waits for Stefan's explicit nod before the PR merges.
