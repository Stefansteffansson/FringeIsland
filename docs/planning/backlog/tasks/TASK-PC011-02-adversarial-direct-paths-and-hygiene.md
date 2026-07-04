# Adversarial direct-path verification + TRUNCATE hygiene (ADR-U038, STORY-6)

---
id: TASK-PC011-02
title: Adversarial direct PostgREST paths on the three role tables + TRUNCATE revokes + Open Q4 predicate record
status: review
assigned_to: claude
priority: high
feature: FEAT-PC011
owner: platform/core/organisation
wave: ferd
cycle: Groups G-B
depends_on: [TASK-PC011-01]
estimated_hours: 2
---

## Description

STORY-6: prove the substrate refuses what the contracts refuse — direct INSERT/UPDATE/DELETE on `group_roles`, `user_group_roles`, `group_role_permissions` as a non-privileged member and as a Mist (the existing RLS verified, not assumed). TRUNCATE revoked from client roles on all three tables (verified currently GRANTED to anon+authenticated on dev — the G-A hygiene rule applied). Record Open Q4's verified predicate for the gate.

**Gate notes (surface at schema review, not silently changed):**
- `ugr_delete` RLS gates on `assign_roles`; the contract's `remove_member_role` gates on `remove_roles`. A member holding `assign_roles` but not `remove_roles` could remove a binding via the direct path that the contract would refuse. Spec posture is "existing write policies are substantively correct — no narrowing beyond TRUNCATE"; flagged for the gate's direct-caller question rather than unilaterally narrowed.
- The `copy_template_permissions` auto-link-by-name behaviour (see TASK-PC011-01) is a substrate-side trapdoor on the direct path too: RLS `group_roles_insert` only requires `manage_roles`, so a direct INSERT of a role named `Steward` auto-copies Steward grants. Same class as above — a `manage_roles` holder can mint (not wield) an over-granted role directly. `can_assign_role` remains the wall that stops it being bound. Flagged for the gate.

## Acceptance criteria

- [ ] Direct INSERT/UPDATE/DELETE on all three role tables refused for a plain member (no role-management permissions) — every refusal the contracts make, the substrate also makes
- [ ] Direct writes refused for an anonymous-session Mist on all three tables
- [ ] Direct UPDATE on `group_role_permissions` and `user_group_roles` refused even for the Steward (no UPDATE policy — default deny, verified)
- [ ] TRUNCATE revoked from `anon`/`authenticated` on all three tables (verified currently granted; PostgREST exposes no TRUNCATE verb and no `information_schema`, so this is verified by direct SQL audit at the gate and recorded in Implementation notes — not a Jest assert)
- [ ] Open Q4's `grp_insert` predicate recorded in the migration comment + feature spec Implementation notes

## Technical notes

Same test file as TASK-PC011-01 (STORY-6 describe block); same migration carries the revokes. Direct UPDATE/DELETE under RLS with a non-matching qual returns success with zero rows (no error) — the adversarial asserts check no-effect via the admin client, not error codes, for those verbs; INSERT with_check violations do raise 42501. TRUNCATE revoke verified by SQL audit at the gate (see acceptance criteria).

## Verification

Adversarial block green post-migration; `npm run test:integration:groups` + full suite green.
