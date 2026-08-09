# Build FEAT-H045 STORY-1 — the catalogue shows what is live, and says how much it is not showing

---
id: TASK-RDC-01
title: "FEAT-H045 STORY-1 — partition /admin/roles into live templates + a `Retired (N)` disclosure, red-first"
status: done
assigned_to: Claude
priority: high
feature: FEAT-H045
owner: hub
wave: ferd
depends_on: []
estimated_hours: 2
---

## Description

The Hub half of RD-B walk finding **W-10**, per
[FEAT-H045](../../../products/hub/features/FEAT-H045-retired-template-collapse-and-mistake-disposal.md).

**STORY-1 only.** It is deliberately separable: STORY-2 and STORY-3 consume `deletable` /
`undeletable_reason` from [FEAT-PC029](../../../platform/core/features/FEAT-PC029-role-template-catalogue-disposal-contracts.md),
which has not landed. **STORY-1 needs nothing from the platform** — `admin_get_role_templates`
already serves `retired_at`, verified against the live catalogue at spec time. This is a
partition of a list the surface already holds, so it ships alone and is the larger half of the
felt problem.

**No migration. No API change. No new component family** (the appetite says if it grows one, it
has escaped).

## Scope

`hub/components/admin/AdminRolesView.tsx` — the template list only. The permission-catalogue
pane, the retire/unretire ceremony, and the detail view are untouched.

## Acceptance criteria (from the story — each needs a test seen red first)

- [ ] Only live templates render in the main list.
- [ ] A disclosure reads **`Retired (N)`**, N counted from **the same payload the rows come
      from** (never a second source — the rabbit hole is a count that can lie).
- [ ] Expanded, retired templates render with their existing affordances **including unretire**,
      and the section states plainly they are not offered to any group.
- [ ] No retired templates → the disclosure is **absent entirely**, not `Retired (0)`.
- [ ] Every template retired → the live list shows a **named empty state**, never a blank region
      (the W-3 lesson from this same panel family).
- [ ] Retired/unretired from the **detail view** → returning to the list shows the template under
      the correct heading **without a manual refresh**.

## Technical notes

- The partition is `retired_at === null`. `retired_at` is already on `AdminRolesPayload`.
- Keep `data-testid` row ids stable (`template-row-${id}`) — E2E and unit specs address them.
- Reuse the existing row markup for both sections; a second row renderer is drift.
- **Sibling adaptation, in scope and to be labelled:** the existing unit case *"offers unretire
  on a retired template"* addresses a row that now starts collapsed. It must expand first. That
  is an adaptation to a deliberate behaviour change, not a weakening — record it as such.
- The last AC is the J-D client-cache trap: an in-context navigation back to the list must repaint.
  Assert it with a **client-side** navigation, not `page.goto` (a full load resets module state
  and would mask staleness).

## Verification

- Unit: `hub/tests/unit/components/admin/admin-roles-view.test.tsx`
- E2E: `hub/tests/e2e/admin-roles.spec.ts` (the return-from-detail criterion)
- `npm run lint`, `next build`, then the full fleet.

## Out of scope

STORY-2 (delete ceremony) and STORY-3 (the two halves agreeing) — both blocked on PC029.
No bulk delete, no third archive state, no change to retire/unretire semantics or the
group-side roles panel, no change to what members see.
