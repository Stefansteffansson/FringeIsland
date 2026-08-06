# Build FEAT-H043 — provenance line, admin retire ceremony, group-side role removal

---
id: TASK-RDA-02
title: Build FEAT-H043 — provenance render on the role row, retire/unretire on /admin/roles, opened removal affordance in RolesPanel; red-first
status: todo
assigned_to: Claude
priority: high
feature: FEAT-H043
owner: hub
wave: ferd
cycle: RD-A
depends_on: [TASK-RDA-01]
estimated_hours: 5
---

## Description

The Hub half of Cycle RD-A, per [FEAT-H043](../../../products/hub/features/FEAT-H043-role-provenance-retirement-and-role-removal.md). Three surface changes, all reading contracts TASK-RDA-01 provides: the provenance line on the role row, the retire/unretire ceremony in the admin plane, and the opening of the group-side removal affordance. Depends on RDA-01's contracts being applied — the payload keys must exist before the render can be driven red honestly.

## Acceptance criteria

- [ ] `RoleEntry` (`hub/lib/groups/queries.ts:184`) gains `created_from_version_number: number | null` and `created_at: string`.
- [ ] **Copy check (quote-bearing AC):** the role row renders exactly `Template · v{N} · copied {date}` for a known version, and exactly `Template · version unknown · copied {date}` when `created_from_version_number` is NULL. Verified against the render, not the payload keys. This replaces the bare `Template` badge at `RolesPanel.tsx:127`.
- [ ] A custom role still renders `Custom`, with no version and no copied-date.
- [ ] The delete affordance's gate at `RolesPanel.tsx:146` — `canManage && !role.created_from_role_template_id` — drops the provenance clause; the affordance renders for template-derived roles.
- [ ] The removal ceremony (`ConfirmModal`, no children — ADM-C finding) names the role and states that removal is permanent for this group and does not affect the source template, **before** the click.
- [ ] When `holder_count > 0` the ceremony states the holder count and that holders must be removed first — the panel already reads `holder_count`, so this is stated before the click, not discovered as a refusal after it.
- [ ] Every PC027 refusal renders **verbatim** — held-by-members `P0001`, the protected-permission lockout naming the lost permission, and the availability guard's refusal under a resting/suspended group (no new branch, no special case).
- [ ] `/admin/roles` gains retire/unretire following the existing admin `ConfirmModal` shape (`AdminRolesView.tsx` / `AdminRoleTemplateDetail.tsx`); the confirmation states that the template stops being offered and that **existing copies in groups are unaffected**.
- [ ] Retired templates stay listed and marked, with unretire available. System templates render **no** retire affordance.
- [ ] `AdminRoleTemplateRow` (`hub/lib/admin/roles.ts:13`) gains `retired_at: string | null`.
- [ ] Retired templates are absent from both offer surfaces: the group-creation template chooser and the roles panel's add-from-template picker. Server-side filtering only — no client-side exclusion.
- [ ] No optimistic removal: the panel repaints from a fresh read via the existing `onMutated` path. Any cached template list is user-scoped and invalidated on retire/unretire (W-9's lesson).
- [ ] Pyramid upright — unit-tier coverage for the provenance render branches and the affordance gate, integration for the BFF routes, E2E for the removal journey and the retire ceremony. E2E asserts the observable effect, not just the click.
- [ ] `npm run lint` + `next build` green (the type gate — ts-jest/eslint do not full-type-check); route-policy conformance test green.
- [ ] ADR-U043 pass at the gate; one deep-cold spot measurement is **not** owed unless a first-paint request is added or rerouted (the budget class is warm interaction on existing surfaces — confirm at build that no new boot-path fetch was introduced).

## Technical notes

`get_group_roles` returns per-role entries built by `role_fabric_entry`, so the two new keys arrive through the fabric the panel already reads — no new round-trip and no new BFF route. The date format for `copied {date}` must be settled once and used in both the known-version and unknown-version strings; Postgres serialises `+00:00` and JS expects `Z`, so parse through `new Date(...)` rather than string-slicing.

The admin roles surface is thin at the route level (`hub/app/admin/roles/page.tsx` is 8 lines); the work lands in `hub/components/admin/AdminRolesView.tsx` and `AdminRoleTemplateDetail.tsx` plus `hub/lib/admin/roles.ts`.

Refusals surface verbatim per the admin plane's established pattern — the refusal strings are the product copy, not paraphrased.

## Verification

Red demonstrated per acceptance criterion before implementation; `npm run test:e2e` for the two journeys; unit + integration green; `next build` green before `6-done`.
