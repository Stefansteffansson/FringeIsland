# DeusEx handover, last-member closure, deliberate deletion: the content-reassignment cascade family

---
id: TASK-PC014-02
title: hand_stewardship_to_deusex (ADR-U019 last resort, wrapping the _transfer_stewardship_to_deusex helper) + close_group (MEM-8 last-member closure, status='closed') + delete_group (GRP-9 soft-terminal deletion, status='archived') + red-first integration tests for both closure arcs and deletion-with-remaining-members
status: review
assigned_to: claude
priority: high
feature: FEAT-PC014
owner: platform/core/organisation
wave: ferd
cycle: Groups G-E
depends_on: [TASK-PC014-01]
estimated_hours: 5
---

## Description

The content-reassignment cascade family (STORY-3 + STORY-4 + STORY-5): three new contracts sharing the freeze + journeys→DeusEx + notify shape, re-landing the two sprint2 `leave_group` branches (`steward_handover`, `group_closure`) that G-D's replacement removed and specifying GRP-9's deletion for the first time. All red-first: the three functions are absent (PGRST202 reds), and the two G-D honest refusals (`leave_group` sole-Steward / last-member P0001s) are re-asserted as *still standing* — these contracts are what those refusals point at, not a change to `leave_group`.

**Substrate facts (verified on disk + dev DB 2026-07-04, decompose session — see FEAT-PC014 §Problem):**
- The sprint2 `steward_handover` branch (DeusEx becomes member + Steward, pending invites transfer, leaver departs, members notified — ADR-U019) and `group_closure` branch (status→`'closed'`, freeze non-public enrolments, transfer owned non-public journeys to DeusEx, notify DeusEx) were **removed at G-D** when `leave_group` was replaced in place; the frozen oracle is git history + `migrations/archive/` + behaviour inventory §A-GRP.
- `groups.status` CHECK already admits `'closed'` and `'archived'` (two distinct terminal states — intent stays distinguishable, GRP-5 renders both); `status_changed_at` exists.
- `journeys.created_by_group_id` is `ON DELETE RESTRICT` — a journey-owning group cannot be hard-deleted; soft-terminal is substrate-forced, not aesthetic (spec Open Q5, the load-bearing gate decision).
- The sprint2 cascade order is the trigger-bypass mechanism: status→terminal **first**, so `check_last_leader_removal` bypasses on the role/membership cleanup; the trigger walls keep their bodies (spec Rabbit holes).
- `notify_group_deleted` is BEFORE-DELETE — it fires only on hard `DELETE`, so `delete_group`'s member notices are written **in-contract**.
- `delete_group` is a seeded catalog key, Steward-template-held; `close_group` needs no permission — being the last active member is the authority (spec Open Q3 default, mirroring the legacy auto-closure).
- Enrolment-freeze SQL shape is PC013's verbatim: active non-public enrolments owned by the group → `status='frozen'`, `progress_data || {frozen_reason, frozen_at}`, `status_changed_at`.

## Acceptance criteria

- [ ] `hand_stewardship_to_deusex(p_group_id)` — sole-active-Steward-gated (`active_steward_count()`; else `P0001`); last-remaining-member caller → `P0001` pointing at `close_group` (handing to DeusEx is for groups with members to keep); on success (via `_transfer_stewardship_to_deusex`): DeusEx active member + Steward (idempotent), caller's pending invitations transfer to DeusEx, caller's non-public enrolments freeze (`'left_group'`), caller's roles + membership deleted, members + DeusEx notified (`stewardship_transferred` / `stewardship_required`)
- [ ] `close_group(p_group_id)` — last-active-member-only (else `P0001` — *"you are not the only member; leave or transfer instead"*; no permission gate, Open Q3 default); one transaction in the sprint2 order: status→`'closed'` first (last-leader trigger bypasses), freeze all active non-public enrolments owned by the group (`frozen_reason: 'group_closed'`), reassign owned non-public journeys to DeusEx, notify DeusEx (`group_closed`), delete caller's roles + membership; the row persists as a `'closed'` tombstone
- [ ] `delete_group(p_group_id)` — `delete_group`-permission-gated (`has_permission`; else `42501`); works with other members remaining; one transaction: status→`'archived'`, freeze (`'group_archived'`), journeys→DeusEx, every **other** active member receives an in-contract `group_deleted` notification, every member's roles + memberships deleted (the caller last; last-leader trigger bypasses on terminal status); the row persists as an `'archived'` tombstone
- [ ] The two terminal states asserted distinct: `'closed'` (MEM-8) vs `'archived'` (GRP-9) — same cascade shape, different status + `frozen_reason`
- [ ] DS-4 asset + DS-5 forum dispositions are **tagged `pending-DS-4`/`pending-DS-5`, not executed** — no asset re-hosting, no forum re-authorship (spec Rabbit holes; the tags live in the spec's cascade documentation + migration comment, and the tests assert forum/asset rows are untouched where such rows exist)
- [ ] House map on all three: non-member / invisible private group / ghost → `P0002` indistinguishably; Mist or suspended → `42501`; group-active + engagement-group preconditions per the G-A rule
- [ ] `leave_group`'s sole-Steward and last-member P0001 refusals re-asserted standing (unchanged by this migration — the refusal copy is H017's seam)
- [ ] Group-as-member rows treated uniformly in the departure cascades (ADR-U006 — one assert)
- [ ] All tests demonstrated RED (PGRST202) → GREEN post-migration, migration untouched between runs

## Technical notes

Test file `hub/tests/integration/groups/group-closure-deletion.test.ts`, same harness as TASK-PC014-01. Personas: soleSteward-with-members (handover), lastMember (closure; a Participant holding no `delete_group` — proves Open Q3's no-gate default), steward-with-`delete_group` + two remaining members (deletion — both receive the in-contract notice and their membership rows go), outsider, suspended, Mist. Journey fixtures: a non-public journey owned by the group (created via admin SQL or the PD-001 primitive) so the journeys→DeusEx reassignment and the RESTRICT-wall sidestep are asserted with content present; enrolment fixtures riding it for the freeze asserts. Same migration as TASK-PC014-01 (this task's items: `hand_stewardship_to_deusex`, `close_group`, `delete_group` — all SECURITY DEFINER, documented elevation, `SET search_path = ''`, minimal bodies; grants: revoke `public`/`anon`, grant `authenticated`/`service_role`). DeusEx resolved by system-label. No trigger edits, no unfreeze, no reaper, no hard DELETE on the client path (the raw-policy drop is TASK-PC014-03's). Notification rows follow the PC013 in-contract insert shape (recipient personal group id, type, id-only payload + group name).

## Verification

`npm run test:integration:groups` red before migration, green after; task lands at **`review`, not `done`** — the migration rides the FEAT-PC014 schema gate (Open Q3/Q5 are this task's load-bearing rulings).
