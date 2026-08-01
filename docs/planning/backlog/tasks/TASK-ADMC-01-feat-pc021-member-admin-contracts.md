# Build FEAT-PC021 — member administration contracts (two schema gates)

---
id: TASK-ADMC-01
title: Build FEAT-PC021 — the member read family (gate 1), then the operations family (gate 2) — red-first, both gates HELD for named approval
status: done
assigned_to: unassigned
priority: high
feature: FEAT-PC021
owner: platform/core/governance
wave: ferd
cycle: ADM-C
depends_on: []
estimated_hours: 10
---

## Description

The platform half of Cycle ADM-C, per [FEAT-PC021](../../../platform/core/features/FEAT-PC021-member-administration-contracts.md). Two migrations through two serial schema gates (the ADM-B shape — each PR held with red evidence + apply commands in the body, merged only on Stefan's NAMED approval, never a generic go-ahead):

1. **Gate 1 — the read family:** `admin_get_users(p_filter)` + `admin_get_user_detail(p_user_id)`. Red first: the integration suite (`hub/tests/integration/admin/member-administration-contracts.test.ts`) demonstrated red (`PGRST202` function-absent) before the migration exists.
2. **Gate 2 — the operations family:** the four re-issues (`admin_update_user_status`, `admin_decommission_user` — gaining audit writes + typed refusals; `admin_hard_delete_user`, `admin_force_logout` — typed refusals + dotted audit action names) and the four new contracts (`admin_exit_user_from_platform` full-exit walk, `admin_remove_member_from_group`, `admin_grant_platform_admin`, `admin_revoke_platform_admin`). Red demonstrated between the gates for the new/changed behavior.

## Acceptance criteria

- [ ] Every contract per the spec's stories (STORY-1..8), producer-driven, including the three-scenario walks (STORY-5/6) exercised through real contracts and the last-admin floor refusal surfacing verbatim (STORY-7).
- [ ] **The sibling-assertion grep executed before gate 2** (the three-times-bitten rule): every suite assertion naming the four re-issued functions (COR-C W1/GC-10 producer suites; anything asserting old audit action strings or untyped refusal shapes) listed in the migration header, each marked adapted or deliberately left.
- [ ] All ten functions born classified PC-4 (the `admin_*` manifest pin); manifest conformance suites green; no new tables (no export-classification change).
- [ ] Audit rows proven producer-driven for every mutation; append-only holds post-change (STORY-8).
- [ ] Grant path verified at build: direct active INSERT does **not** rely on the `auto_assign_deusex_role` trigger (it fires only on the invited→active UPDATE flip) — role row inserted explicitly.
- [ ] Both gates: migration applied on named approval, history repaired, post-apply suite green.

## Technical notes

Signatures, refusal codes, and the `delete_own_account` walk are file:line-anchored in the spec (the 2026-08-01 contract walk) — re-verify cumulative-forward at build, don't trust the anchors blind. Never two integration suites concurrently against the dev DB; explicit `cd` on every test command; the dev-DB auth-admin ES256 flake is known — run the control on main before investigating any all-red.

## Verification

`cd hub && npx jest tests/integration/admin --runInBand` — red pre-gate-1, green post-apply per gate; manifest conformance suites green; full admin integration domain green at cycle close.
