# Nominated succession contracts: nominate_steward replaced in place + respond_to_stewardship_nomination + red-first nomination matrix

---
id: TASK-PC014-01
title: nominate_steward replaced in place (template-aware + active-membership Steward resolution, house no-leak, grant hardened) + respond_to_stewardship_nomination (accept / decline→next / decline→DeusEx fallback / expiry predicate) + the _transfer_stewardship_to_deusex internal helper + red-first nomination-matrix integration tests
status: review
assigned_to: claude
priority: high
feature: FEAT-PC014
owner: platform/core/organisation
wave: ferd
cycle: Groups G-E
depends_on: []
estimated_hours: 6
---

## Description

The MEM-7 core (STORY-1 + STORY-2): the sole active Steward's nominated succession, re-derived from the sprint3 oracle under current authority. `nominate_steward(p_group_id, p_nominee_ids uuid[])` is **replaced in place** (same name + signature — spec Open Q1 default; nothing in v2 calls the sprint3 body, grep-verified at decompose). `respond_to_stewardship_nomination(p_notification_id, p_accept boolean)` is **new, dedicated** — it replaces the caller-data-dispatch inside `handle_notification_action` (whose neutralization is TASK-PC014-03's). The all-decline DeusEx fallback births the internal helper `_transfer_stewardship_to_deusex(p_group_id, p_departing_group_id)` (no client execute — the `active_steward_count` posture), which TASK-PC014-02's `hand_stewardship_to_deusex` then wraps — the single re-landing of the sprint2 `steward_handover` branch.

Red-first: `respond_to_stewardship_nomination` is absent (PGRST202 red); `nominate_steward` exists as the sprint3 body, so its asserts go **red against legacy behaviour, honestly labelled** — the PC013 `leave_group` replaced-in-place pattern verbatim. Two adversarial reds demonstrate the live hole before TASK-PC014-03 closes it: the anon-role call to `nominate_steward` succeeds pre-migration (grant to `anon`/`PUBLIC`), and the v2-named-Steward regression (nominee granted nothing on a group whose Steward role is named `'Steward Role Template'`).

**Substrate facts (verified on disk + dev DB 2026-07-04, decompose session — see FEAT-PC014 §Problem):**
- Sprint3 (`20260228125730`) implements ranked-nominee succession: durable `stewardship_nomination` notification, `action_type='accept_decline'`, `expires_at = now()+7d`, ranked list + nominator in `action_data`, one nomination in flight per group; all three functions carry `EXECUTE` to `anon` + `PUBLIC` (`pg_proc.proacl`).
- `_handle_stewardship_nomination_action` resolves the Steward role by `name = 'Steward'` only — on a v2-created group (roles named by **template name** per `create_engagement_group`, PC010) the accept branch resolves no Steward role and grants nothing (the G-C `'Member'`-class bug).
- `nominate_steward`'s sole-Steward check counts raw `user_group_roles` rows — a paused Steward counts as cover (the blind spot G-D closed with `active_steward_count()`, PC013 internal helper — reused here).
- The nomination lives entirely in the durable `notifications` row (`action_type`/`action_data`/`expires_at`/`action_taken`) — no new table, no nomination state columns (spec Rabbit holes).
- Departure cascade shape is PC013's `leave_group` verbatim: freeze own active non-public enrolments (`'left_group'`) → delete roles → delete membership; the existing `notify_invitation_declined_or_member_change` AFTER-DELETE branch writes `member_left` — consumed, never duplicated.
- Steward resolution everywhere: `created_from_role_template_id` = the `'Steward Role Template'` template id, with the `name='Steward'` legacy fallback; Steward *counting* via `active_steward_count()`.

## Acceptance criteria

- [ ] `nominate_steward(p_group_id, p_nominee_ids uuid[])` replaced in place — sole-**active**-Steward-gated via `active_steward_count()` (P0001 with the not-sole/not-a-Steward refusals; a paused co-Steward does **not** make the caller sole — regression asserted); nominees distinct active members, not the caller (else `22023` with the specific reason; empty list `22023`); one nomination in flight per group (P0001); writes the durable `stewardship_nomination` notification (`action_type='accept_decline'`, `expires_at = now()+7d`, ranked list + nominator in `action_data`) to the **first** nominee; no membership or role changes yet
- [ ] House map on `nominate_steward`: non-member / invisible private group / ghost id → `P0002` indistinguishably (no leak); Mist or suspended caller → `42501`; FIM-only + active-account-only gate (PC012/PC013 verbatim)
- [ ] Adversarial red demonstrated **pre-migration**: the anon-role PostgREST call to `nominate_steward` is not refused by privilege (the sprint3 grant hole, labelled as the red demonstration; the post-migration refusal assert is TASK-PC014-03's)
- [ ] `respond_to_stewardship_nomination(p_notification_id, p_accept boolean)` new — recipient-only (else `P0002`, no leak of another's notification); expired or already-answered → `P0001`; marks `action_taken`/`action_taken_at`
- [ ] Accept branch: nominee granted the group's Steward role resolved **template-first with the legacy `name='Steward'` fallback** — asserted on **both** a v2-created group (role named `'Steward Role Template'` — the regression the legacy body fails) **and** a legacy-named group (name=`'Steward'`, seeded via admin SQL); then the nominator departs (freeze `'left_group'` → roles → membership; trigger writes `member_left` — asserted, not duplicated); group's active members receive `stewardship_transferred`
- [ ] Decline with a next-ranked nominee: a fresh 7-day `stewardship_nomination` is written to the next nominee, nothing else changes (no membership/role writes)
- [ ] Decline with the list exhausted: the DeusEx fallback runs via `_transfer_stewardship_to_deusex` — DeusEx becomes active member + Steward of the group (idempotent), the nominator's pending invitations transfer to DeusEx, the nominator departs, members + DeusEx notified (`stewardship_transferred` / `stewardship_required`) — ADR-U019; DeusEx resolved by system-label, not a hardcoded id
- [ ] Expiry is predicate-based: an `expires_at`-past nomination refuses response (`P0001`) and the group keeps its Steward; **no reaper exists** (documented honestly — spec Rabbit holes)
- [ ] Group-as-member nominee rows behave identically (ADR-U006 uniformity — one assert)
- [ ] All new-contract tests demonstrated RED → GREEN post-migration, migration untouched between runs; `nominate_steward` replaced-in-place asserts labelled red-against-legacy

## Technical notes

Test file `hub/tests/integration/groups/stewardship-succession.test.ts` on the `invitation-contracts.test.ts` harness (createTestUser/createAdminClient/signInWithRetry/cleanup*/runAdminSql; single-token display names). Personas: soleSteward (v2 group), a second Steward + a paused Steward (sole-ness matrices), nominee1/nominee2/nominee3 (ranked list; decline chains), plainMember, outsider, suspended, Mist/anon client; a legacy-named-Steward group seeded via runAdminSql (role `name='Steward'`, no template linkage) for the fallback-resolution assert. One migration shared with TASK-PC014-02/-03 (`feat_pc014_leadership_transfer_closure_contracts`): this task's items are `nominate_steward` (replace), `respond_to_stewardship_nomination` (new), `_transfer_stewardship_to_deusex` (new, internal — revoke all client execute, the `active_steward_count` posture). Grants on the two contracts: revoke from `public`, `anon`; grant execute to `authenticated`, `service_role`. SQLSTATEs per house map (42501 FIM-only/suspended/not-permitted, P0002 no-leak, P0001 state-conflict, 22023 bad-input). Actor via `get_current_personal_group_id()` (P-O1). Each SECURITY DEFINER function documents its elevation + `SET search_path = ''`; bodies minimal per the PG17 ceiling; no role-name strings in **gates** (ADR-U007) — the Steward-template linkage (+ legacy name fallback) is invariant plumbing, not a permission gate. Sprint3 notification shape (type/action_type/action_data keys) verified against the sprint3 migration body before authoring — the durable-row columns are the contract with H017's pending-nomination read.

## Verification

`npm run test:integration:groups` red before migration (labelled), green after; task lands at **`review`, not `done`** — the migration rides the FEAT-PC014 schema gate (Open Q1/Q2 + the ADR-U038 direct-caller question).
