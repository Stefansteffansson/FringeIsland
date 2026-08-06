# Build FEAT-PC027 — provenance stamp, central retirement, group-side removal (one schema gate)

---
id: TASK-RDA-01
title: Build FEAT-PC027 — group_roles provenance column, role_templates retirement, relaxed group-side delete, honest-unknown backfill; red-first, held at the schema gate
status: todo
assigned_to: Claude
priority: high
feature: FEAT-PC027
owner: platform/core/governance
wave: ferd
cycle: RD-A
depends_on: []
estimated_hours: 6
---

## Description

The platform half of Cycle RD-A, per [FEAT-PC027](../../../platform/core/features/FEAT-PC027-role-provenance-retirement-and-group-side-removal-contracts.md). One migration carrying: `group_roles.created_from_version_number` stamped at all three instantiation doors, `role_templates.retired_at` + `retired_by` with a retire/unretire contract pair, the relaxed group-side delete in `delete_group_role`, the two picker filters, the `role_fabric_entry` payload widening, and the honest-unknown backfill. Red-first at every tier; the PR holds at the schema gate with red evidence + apply commands for **named** approval (a generic "go on" does not unlock the merge).

## Correction to the decomposition premise — carried into this task

**The dossier's Finding 3 ("the refusal is THREE layers deep") is one layer stale, and the spec inherits the error.** HYG-A `20260803190000:4533` dropped the `group_roles_delete` RLS policy, and `:4545` revoked `insert, update, delete` on `public.group_roles` from `authenticated, anon`. Verified against the live DB (2026-08-06): `group_roles` carries exactly one policy, `group_roles_select`, and `authenticated` holds SELECT/REFERENCES/TRIGGER only. The comment the dossier read as evidence of a live RLS rule (`delete_group_role`'s "The RLS delete rule … carried into the contract") is a **tombstone** the same migration left when it moved that rule *into* the contract.

**Consequence:** leg 3 is **contract + surface (2 layers)**, not schema + contract + surface (3). The migration carries **no RLS delete change**. Re-adding a `group_roles` DELETE policy would re-open the direct-PostgREST write path HYG-A deliberately closed — an ADR-U038 regression, not a relaxation. The spec's Solution sketch §4 and STORY-4 AC1 both need this correction; make it in the same PR.

## Acceptance criteria

- [ ] `group_roles.created_from_version_number integer` added; stamped at **all three doors** — `create_engagement_group`'s single insert covers doors 1 (template chosen) and 2 (template-less, system-only per WA-6 `20260805150000:55-63`); `create_group_role`'s template branch is door 3. The custom-role branch leaves it NULL.
- [ ] The stamped value is read from `role_templates.default_version_id → role_template_versions.version_number` (dossier Finding 2), denormalised as an integer — never an FK.
- [ ] `role_templates.retired_at timestamptz` + `retired_by uuid` added; retire/unretire contracts written, system templates (`is_system = true`) refused, audit rows written on both verbs and on every refusal.
- [ ] Retire writes **nothing** into any group — no `group_roles`, `group_role_permissions`, or version row is touched (RD-2/RD-4). A test asserts the untouched-copy invariant directly, not by absence of error.
- [ ] `get_role_templates` filters `retired_at IS NULL`; `admin_get_role_templates` keeps retired rows and adds `retired_at` to each entry.
- [ ] `role_fabric_entry` gains `created_from_version_number` + `created_at` — this is where `get_group_roles`'s per-role shape is built (`20260704090434:~55`), not in `get_group_roles` itself.
- [ ] `delete_group_role`: the `created_from_role_template_id is not null` refusal removed; the held-by-members `P0001` refusal **unchanged** (Finding 4); `assert_group_writable` call unchanged (PC023); a new `is_protected` lockout refusal naming the permission that would be lost (Finding 5 — reuse `permissions.is_protected`, do not introduce a second concept).
- [ ] Honest-unknown backfill: unambiguous grant-set match only; ties and non-matches stay NULL. A test asserts a deliberately-ambiguous fixture stays NULL.
- [ ] Gate suite red at head covering STORY-1..4, including the ambiguous-backfill cell and the protected-permission lockout cell.
- [ ] **Sibling-assertion sweep enumerated in the migration header** — `create_engagement_group`, `create_group_role`, `delete_group_role`, `get_role_templates`, `role_fabric_entry`/`get_group_roles` all carry live gate cells from PC011, PC023, PC025 and WA-6. Each marked adapted or deliberately left.
- [ ] Any new function registered PC-3/PC-4 in `supabase/ownership.manifest.json` in the same migration; conformance suites green.
- [ ] Adversarial ADR-U038 test: the direct PostgREST path (including an anonymous-session Mist) is refused everything the contract refuses — retire by a non-admin, delete of a held role, delete that would brick the group.
- [ ] PR held at the schema gate with red evidence + apply commands; post-apply: full integration green + affected-E2E verification set + ADR-U043 pass.

## Technical notes

Re-issue discipline (COR-A pattern): `create_engagement_group(text, text, text, boolean, boolean, uuid)`, `create_group_role(uuid, text, text, uuid, text[])`, `delete_group_role(uuid)`, `get_role_templates()`, `admin_get_role_templates()`, `role_fabric_entry(uuid)` — all re-issued in place with byte-identical signatures so the ACL is preserved by create-or-replace.

`get_role_templates` is SECURITY INVOKER (`20260722190000:48`) with `auth_read_role_templates` as the enforcement point — the retired filter is a body predicate, and the function's security mode does not change. `retired_by` holds a personal group id via the four-hop actor chain (`get_current_personal_group_id()`), never raw `auth.uid()`.

`role_templates.id` is `ON DELETE SET NULL` from `group_roles` (`20260222000000:182`, Finding 6) — this is why retire-never-delete is the ruling; do not add a delete path.

## Verification

Red demonstrated at head (suite output in the PR body); post-apply `npm run test:integration` green; conformance suites green; `migration list` consistent after repair.
