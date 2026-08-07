# H044 — the available-roles view, the diff-on-copy ceremony, the admin reach surface, and three passive bell renders

---
id: TASK-RDB-03
title: FEAT-H044 — Steward's available-roles section, diff-on-copy ceremony, AdminRoleTemplateDetail reach section, and the three passive notification renders
status: done
assigned_to: claude
priority: high
feature: FEAT-H044
owner: hub
wave: ferd
cycle: RD-B
depends_on: [TASK-RDB-01, TASK-RDB-02]
estimated_hours: 7
---

## Description

RD-B's surface half. Covers FEAT-H044 STORY-1 through STORY-4. Consumes FEAT-PC028's contracts API-first and **carries no migration of its own**.

Depends on both platform tasks because every read and write it makes is one of theirs. The unit tier can be driven red before the migration is applied (component logic against fixture payloads); the integration and E2E tiers wait on the gate.

## Acceptance criteria

- [ ] **Available-roles section** in the group roles panel, rendering three states from a **single** `get_available_role_templates(group_id)` read: not adopted (Copy) / adopted-and-current (state it, no action) / adopted-and-behind (Review update)
- [ ] Loads **behind an affordance** — not part of the group-detail composed first read. This is the ADR-U043 placement the spec's performance budget is drawn against; a test asserts the first-paint request count is unchanged
- [ ] `version unknown` copies still offer **Review update** (the diff is computable from grants even when the label is not)
- [ ] Section **not rendered at all** for members without `manage_roles`
- [ ] Read-only under the availability guard (resting/suspended groups)
- [ ] Empty state stated in words, not an empty box
- [ ] **Diff ceremony** shows two labelled lists — *will be added* / *will be removed* — using permission **display names**, not internal keys
- [ ] The RD-3 sentence renders verbatim where it applies: *"This will restore permissions you removed from this role."* — pinned by its own copy-check cell, per the N-E rider (the payload walk traces keys and cannot see rendered copy)
- [ ] Holder count named in the ceremony, with the statement that holders keep the role and their permissions change with it — consequence before the click
- [ ] Empty diff (reachable as a race) states there is nothing to apply and offers only Close
- [ ] Refusals surfaced **verbatim**, ceremony stays open, panel unchanged
- [ ] Cancel makes **no** contract call
- [ ] **Admin reach section** on `AdminRoleTemplateDetail.tsx`: current reach in words, publish platform-wide / to named groups / unpublish, with the statement that withdrawing an offer leaves adopted copies working
- [ ] **No** reach section on system templates; publish unavailable with a stated reason on retired templates
- [ ] **Three passive bell renders**, each naming its own group, each carrying **no** accept/decline affordance
- [ ] The retired notice includes the sentence that the group's existing copy is unaffected — the line that stops it reading as a loss
- [ ] `hub/lib/groups/queries.ts:239-244` moved from the dropped `get_role_templates()` to the scoped read
- [ ] Uses `ConfirmModal` — never browser `confirm()`/`alert()`
- [ ] **The new `roles` category needs an icon entry.** `hub/components/notifications/NotificationItem.tsx:15` keys an icon map by category (`'group-lifecycle': Flag, …`). Found during the platform half's sweep; a missing key renders the fallback rather than failing, which is exactly how it would ship unnoticed
- [ ] **Pyramid upright**: unit-tier coverage for the three-state render logic, the diff list construction, and the permission-gated visibility — not only integration + E2E
- [ ] **E2E sweep obligation discharged and recorded**: this feature adds Copy / Review update / Confirm / Publish / Unpublish to pages that already carry buttons. Grep the fleet for **bare accessible-name selectors** (`getByRole('button', {name: …})` without a scoping container) and **positional resolution** (`.first()` / `.last()`) on every page these surfaces touch — in addition to the normal object-named sweep. This is the RD-A miss generalised
- [ ] `npm run lint` clean and **`next build` green** before `6-done` — ts-jest and eslint do not full-type-check
- [ ] Route-policy conformance test green

## Technical notes

- Surfaces: `hub/components/groups/RolesPanel.tsx` (444 lines — already renders the provenance line at `:21-26` and the template picker at `:301-303, :357`), `hub/components/admin/AdminRoleTemplateDetail.tsx` (415 lines), plus the notification render path.
- API routes under `hub/app/api/admin/roles/[id]/` already carry `clone`, `default`, `retire`, `versions` — the publish/unpublish routes join that family. These are **private BFF** plumbing: no business rule may live only here (ADR-U038).
- The admin reach display reads from the **widened** `admin_get_role_template_detail`, not a fourth read — this was the payload walk's second finding.
- Branch on the permission, never on a role-name string.
- Mutating verbs authenticate with `getUser()`; GET-exporting files use `getClaims()`/`getVerifiedUserId()`; no `runtime`/`preferredRegion` exports.

## Verification

```
npm run lint
npm run build            # next build is the type gate
npm run test:unit
npm run test:integration:groups
npm run test:e2e
```

E2E requires the dev server on `localhost:3000`.

---

## Outcome (2026-08-07) — `done`, all four stories

STORY-1, STORY-2 and STORY-4 were built and green first. **STORY-3 was built but
unverifiable** until [TASK-RDB-04](./TASK-RDB-04-pc028-corrective-widen-admin-role-template-detail.md)'s
migration was applied — the reach section had no server key, because the widening
FEAT-H044's payload walk committed to was never carried into PC028's migration. That
migration was applied the same day on a named approval, its cells went red → green, and
`FEAT-H044` closed at `6-done`.

**A journey-level E2E was added beyond the AC list** (`tests/e2e/role-distribution.spec.ts`)
to keep the pyramid upright at all three tiers: offered → copied → catalogue moves →
ceremony → provenance moves (asserted in the render **and** at row level) → offer
withdrawn → copy survives. Labelled test-after; proven non-vacuous by control.

**Two acceptance criteria were resolved differently than written, both deliberately:**

- **`hub/lib/groups/queries.ts:239-244` was already repointed** by the platform half —
  the zero-arg contract was dropped, so the Hub would have been broken on `main`
  otherwise. Nothing to do; verified on `main`.
- **"permission display names, not internal keys"** had no substrate to draw on.
  `public.permissions` is `(id, name, description, category, created_at)` — there is no
  display-name column anywhere, and `get_role_copy_diff` returns `p.name`, the key. Closed
  Surface-side with `hub/lib/groups/permission-label.ts`, a *total* humaniser rather than a
  lookup table (a table renders raw keys for every permission seeded after it was written —
  the open-registry failure the notification icon map already carries). Presentation
  mapping, which ADR-U038 permits in a Surface. **Applied across the whole roles panel**,
  not only the ceremony, on Stefan's call — one panel showing two conventions was the
  alternative. Two RolesPanel chip assertions adapted, labelled.

**Known remaining inconsistency, filed not fixed:** `MyPermissionsPanel` and the admin
draft editor (`AdminRoleTemplateDetail`'s catalogue checkboxes) still render raw keys.
Out of the scope Stefan set ("the roles panel"); widening it is a one-line change per
surface plus its assertions.
