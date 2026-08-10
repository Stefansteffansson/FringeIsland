# Build FEAT-PC029 — role-template catalogue disposal contracts (HELD AT THE SCHEMA GATE)

---
id: TASK-RDC-02
title: "FEAT-PC029 — deletable/undeletable_reason on the list read + the guarded admin_delete_role_template, red-first, held at the schema gate"
status: done
assigned_to: Claude
priority: high
feature: FEAT-PC029
owner: platform/core/governance
wave: ferd
depends_on: []
estimated_hours: 3
---

## Description

The platform half of RD-B walk finding **W-10**, per
[FEAT-PC029](../../../platform/core/features/FEAT-PC029-role-template-catalogue-disposal-contracts.md).
One migration carrying the shared disposal predicate, the additive widening of
`admin_get_role_templates`, and the guarded `admin_delete_role_template`.

**Unblocks [FEAT-H045](../../../products/hub/features/FEAT-H045-retired-template-collapse-and-mistake-disposal.md) STORY-2 and STORY-3**, which are the only reason
H045 sits at `5-in-cycle` rather than `6-done`.

**HELD AT THE SCHEMA GATE.** The migration is written and NOT applied. Status is
`review`, per the platform-tier rule. The merge unlocks only on an explicitly
**named** approval — a generic "go on" does not unlock it.

## THE PREMISE CORRECTION — read this before reviewing the guard

The spec's guard read *"zero rows **ever** in `role_template_publications`"*, and
called that clause **"the load-bearing half"**. Measured against the live
catalogue 2026-08-10, **it is not implementable against that table**:

| | |
|---|---|
| `admin_unpublish_role_template` | **hard-deletes** its publication rows |
| `role_template_publications.unpublished_at` | **does not exist** |

So publish → unpublish leaves **zero rows**, and a template that *was* offered
would read as never-offered, become `deletable`, and be destroyed — breaching
RD-4a in precisely the case RD-4 still protects.

**Where the truth survives:** `admin_audit_log`. Its publication record is
**complete, not partial** — earliest `role_template.publish` audit row
**2026-08-07**, earliest surviving publication row **2026-08-09**, because
publication shipped with PC028 and has audited every publish since.

**Measured exposure at authoring time: 0 templates.** The defect is **latent, not
live** — and reachable by exactly the journey this feature serves (clone it, try
it out, unpublish, retire, delete).

**Decision (Stefan, 2026-08-10): consult the audit log.** The tombstone
alternative — adding `unpublished_at` and making unpublish a soft delete — was
rejected: it changes shipped PC028 semantics and forces every existing reader
(publish picker, available-roles read, retire's notification-reach query) to
filter, where missing one silently breaks unpublish. That is the "grows a state
machine" case the appetite calls escaped.

**Consequence to carry, stated plainly:** `admin_audit_log` is now load-bearing
for a **guard**, not only for observability. Anything that prunes that table must
exclude `role_template.publish` rows or this delete silently widens.

## What the migration contains

`supabase/migrations/20260810090000_rd_c_pc029_role_template_catalogue_disposal.sql`

- `role_template_undeletable_reason(uuid)` — **the single predicate**, written
  once so the badge and the guard cannot disagree. Fixed precedence
  `system → not_retired → published → adopted`.
- `admin_get_role_templates()` — widened by `deletable` + `undeletable_reason`,
  **additive only**, computed inside the read the catalogue already makes so the
  surface gains no second round-trip per template.
- `admin_delete_role_template(uuid)` — guarded hard delete. Refuses **before any
  write**, audits its refusals, and captures name + version count **before** the
  delete because the target ceases to exist.
- Both new functions carry the explicit `revoke … from public, anon` / `grant …`
  pair (TASK-SEC-01: load-bearing, not hygiene).

## Red evidence (at head, migration unapplied)

`hub/tests/integration/admin/role-template-disposal.test.ts` — **15 cells, 15 red**,
by two mechanisms: `admin_delete_role_template` does not exist (PGRST202), and
`admin_get_role_templates` carries neither new key (`undefined` where a boolean
or the literal is asserted).

The cell that matters most is **"THE CORRECTION: a template published then
UNPUBLISHED still reads as offered"** — it plants a template whose publication
row is gone but whose publish is in the audit trail, which is exactly the state
the spec-as-written would have mis-read as disposable.

Fixtures verified cleaned after the red run: 0 stray templates, 0 stray group
roles, orphan instrument 954 → 954.

## Apply commands (for the gate)

```bash
node scripts/apply-migration-temp.js 20260810090000_rd_c_pc029_role_template_catalogue_disposal.sql
bash supabase-cli.sh migration repair --status applied 20260810090000
bash supabase-cli.sh migration list
```

Then re-run to green:

```bash
npm --prefix hub run test:integration:admin -- --testPathPatterns=role-template-disposal
```

## Reviewer checklist (platform-tier gate)

- [ ] **The direct-caller question (ADR-U038):** what can a direct PostgREST
      caller — including an anonymous-session Mist holding `authenticated` — do
      here that a product route would not allow? Both new functions are
      `is_platform_admin()`-gated; the suite exercises the direct RPC path and
      the Mist case explicitly.
- [ ] **Read the APPLIED functions' ACLs**, not the migration text:
      `select proacl from pg_proc where proname in
       ('admin_delete_role_template','role_template_undeletable_reason');`
      The answer must contain neither a bare `=X/` (PUBLIC) nor `anon=X`.
- [ ] The audit-log dependency above is accepted, or the tombstone alternative
      is preferred after all.
- [ ] Sibling assertions named in the migration header are correct and complete.

## Out of scope

Hub rendering of `deletable` / `undeletable_reason` — that is FEAT-H045
STORY-2/STORY-3, a separate task once this is applied.
