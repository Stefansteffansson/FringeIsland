# Member-exit DELETE-policy narrowing + adversarial direct paths + hygiene

---
id: TASK-PC013-02
title: Drop memberships_delete_leave + memberships_delete_remove (the raw exit paths that bypass the cascades) + STORY-6 adversarial direct-path suite + hygiene re-asserts
status: review
assigned_to: claude
priority: high
feature: FEAT-PC013
owner: platform/core/organisation
wave: ferd
cycle: Groups G-D
depends_on: [TASK-PC013-01]
estimated_hours: 2
---

## Description

The ADR-U038 half of the cycle: after PC013's contracts exist, the two raw RLS DELETE paths on `group_memberships` are the only client-role way around the composed cascades — `memberships_delete_leave` (self-delete, any status: today's decline residue + a freeze-less leave that lets a sole Steward strand a group headless) and `memberships_delete_remove` (`remove_members`-gated, active-only: a freeze-less removal that orphans `user_group_roles` rows). Both drop (spec Open Q2 default, G-A `groups`-narrowing precedent) in the same migration as TASK-PC013-01's contracts. The admin policies (`memberships_delete_admin`, `memberships_insert_admin`) and `admin_exit_user_from_platform` are untouched.

**Red-first shape:** the bypass is demonstrated red *before* the drop — a direct self-DELETE of an active membership succeeds against the pre-migration substrate (no freeze, roles orphaned) — then the post-migration asserts prove RLS refuses it. PC012's decline contract (`decline_group_invitation`, SECURITY DEFINER) is re-asserted working after the drop: it never rode the policy.

## Acceptance criteria

- [ ] Pre-migration red: direct self-DELETE of own active membership succeeds via PostgREST (the bypass exists) — labelled as the red-demonstration of the hole, not a kept behaviour
- [ ] Post-migration: direct self-DELETE of own **active** membership refused by RLS (0 rows); direct DELETE of another's membership by a `remove_members` holder refused (0 rows)
- [ ] PC012 decline still works after the drop: an invited FIM's `decline_group_invitation()` deletes the row (SECURITY DEFINER, policy-independent — asserted)
- [ ] Direct UPDATE attempting `status='paused'` (and `active→invited`) refused by RLS for member and Steward alike — no client-role write path to pause exists (verified, not assumed)
- [ ] `memberships_delete_admin` / `memberships_insert_admin` untouched: a platform admin (DeusEx member+role, the makePlatformAdmin helper) can still direct-DELETE a membership (A-ADM inherits intact)
- [ ] `admin_exit_user_from_platform` unaffected (it inlines its own tracks as definer — smoke-asserted or verified by inspection at the gate, whichever the suite can reach without decommissioning a shared persona)
- [ ] `TRUNCATE` on `group_memberships` from client roles still revoked (PC012's revoke re-asserted via `information_schema.table_privileges` at the gate)
- [ ] Migration comment documents the drop rationale + the ADR-U038 direct-caller answer for the gate

## Technical notes

Same migration + same test file as TASK-PC013-01 (STORY-6 describe block). Drop with exact policy names verified against `pg_policies` first (the `DROP POLICY IF EXISTS` wrong-name trap — platform CLAUDE.md gotcha). Direct-path calls use an authenticated non-privileged client and a `remove_members`-holder client via PostgREST (`.from('group_memberships').delete()/.update()`); RLS refusals on UPDATE/DELETE surface as 0-row results, not errors — assert row-count + row-survival re-read. The schema gate reviews: the two drops, the `leave_group` replacement, the read amendment, Open Q1–Q4, and the direct-caller question (what can a direct caller — including an anonymous-session Mist — still do to `group_memberships` that the contracts would refuse? Intended answer post-drop: nothing beyond the admin policies).

## Verification

`npm run test:integration:groups` green post-migration; task lands at **`review`, not `done`** — schema gate (policy drops + function replacement) waits for Stefan's nod.
