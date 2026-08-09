# FEAT-PC029: Role-template catalogue disposal — server-computed delete eligibility and the guarded hard delete

---
id: FEAT-PC029
title: Server-computed delete eligibility on the template list, and a hard delete guarded to templates that were never offered and were never adopted
owner: platform/core/governance
consumers: [hub]
wave: ferd
maturity: 3-specified
requires-equipment: none
---

**Follows:** RD-B walk finding **W-10** (*"a clone can never leave the catalogue"* — recorded as an observation, deliberately unruled) · **Pairs with:** [FEAT-H045](../../../products/hub/features/FEAT-H045-retired-template-collapse-and-mistake-disposal.md)

> ## ⛔ GATE — this spec amends settled law RD-4, and cannot go `4-ready` until that amendment is taken
>
> **RD-4 is settled**, confirmed aloud at the RD-A kickoff, not defaulted:
>
> > **Retire only, never delete.** Version history is the audit evidence and provenance must not dangle.
>
> This feature introduces a delete. Per `ecosystem-decomposition`, *a spec that contradicts a
> settled row is wrong, not merely unusual* — so it is written as a **narrow amendment**, and
> the amendment is the one thing that must be granted before build:
>
> **Proposed RD-4a —** *retire-only stands for every template that was ever offered or ever
> adopted. A template that was **never published** and has **no copies** has no provenance to
> dangle and no audit evidence of anything a Steward ever saw; for that case only, delete is
> permitted.*
>
> The amendment is narrow **by construction, not by convention**: STORY-2's guard is exactly
> the set of conditions under which RD-4's own stated rationale does not apply. If the
> rationale binds, the guard refuses.

---

## Problem

`/admin/roles` is the place every experiment accumulates forever. Retire hides a template from
offers; nothing removes it. A clone made by mistake and adopted by nobody is permanent.

The RD-B walk alone added two (`Walk Greeter`, `Walk Second`). Stefan, re-walking 2026-08-09:

> *Over time I guess we will have mega many retired roles in this list. Is this reasonable? Do
> we really need to keep all old roles or can we just delete them with a button after they have
> been retired?*

**Two different problems wear one complaint**, and only one of them is a retention question:

1. **List bloat** — retired templates sit in the working catalogue. That is a *display* problem
   and it is [FEAT-H045](../../../products/hub/features/FEAT-H045-retired-template-collapse-and-mistake-disposal.md) STORY-1's, needing **no contract change at all**.
2. **The mistake clone** — a template that never went anywhere and cannot be removed. That is a
   real gap, and it is this feature's.

### Why a delete button cannot simply be added

Measured against the live catalogue, 2026-08-09 — **the database will not stop you**:

| Referencing table | On delete of `role_templates` |
|---|---|
| `group_roles.created_from_role_template_id` | **SET NULL** |
| `role_template_versions` | CASCADE |
| `role_template_publications` | CASCADE |
| `role_template_permissions`, `group_template_roles` | CASCADE |

An unguarded delete **silently severs the provenance line on every surviving copy** — the
`Template · v{N} · copied {date}` line FEAT-H043 exists to render — and erases the version
history and the record of what was offered to whom. No error, no refusal. RD-4 is right about
the general case; the guard is what carves out the one case it is not right about.

## Solution sketch

Two contract changes, both on the existing admin surface. No new table.

**A. Eligibility is computed on the server and shipped with the list.** `admin_get_role_templates`
already carries `retired_at` (verified in the live catalogue — so the H045 filter needs nothing
from us) but carries **no publication key at all**. The Hub therefore cannot derive "never
published", and must not try: two implementations of one rule drift, and the drifting one is the
one users click. One key, one truth:

```
deletable:          boolean
undeletable_reason: text | null   -- open code, not a sealed enum
```

**B. `admin_delete_role_template(p_template_id uuid)`** — hard delete, refusing unless *all* hold:

| Guard | Why |
|---|---|
| not `is_system` | seeded templates are substrate |
| `retired_at IS NOT NULL` | disposal is two deliberate acts, per Stefan's *"after they have been retired"* |
| **zero rows ever** in `role_template_publications` | publication rows are never deleted, so this is a true "was never offered" — not a "no longer offered" |
| **zero rows** in `group_roles.created_from_role_template_id` | nothing can lose a provenance line it never had |

The same predicate serves `deletable` and enforces the write — **written once, in SQL**, so the
badge and the guard cannot disagree.

## Appetite

**Small — one migration, one cycle-corner.** It is one new function plus two keys on a read that
already exists. If it grows a table, a state machine, or a soft-delete tier, it has escaped.

## Rabbit holes

- **Soft delete / archive tier.** Tempting and wrong: `retired_at` already *is* the archive tier.
  Adding a third state means three states to render and reason about. No-go below.
- **"Zero adoptions now" mistaken for "never adopted."** If a group adopted a copy and later
  deleted it, the `group_roles` row is already gone and the template looks pristine. The
  publication guard is what makes the test honest — a template that was ever *offered* is
  refused regardless of whether any copy survives. **Do not drop the publication clause as
  redundant; it is the load-bearing half.**
- **Deleting the audit trail of the deletion.** See STORY-3 — the audit row's target ceases to
  exist the moment the write succeeds.
- **Retiring a never-published template.** `admin_retire_role_template` may or may not accept a
  template that was never offered; if it refuses, the two-step becomes unreachable and the
  `retired_at` clause must be reconsidered. **Check at build before writing the guard** — this
  is the one unknown in the design.

## No-gos

- No delete of any template that was ever published, ever adopted, or is seeded. RD-4 stands there.
- No soft-delete/archive third state.
- No bulk delete. One template, one deliberate act.
- No unretire-then-delete shortcut that skips the guard.
- No change to what retire means, and no change to group-side copy deletion (RD-A's third leg).

## Stories

### STORY-1: The list says whether a template can be disposed of, and why not

As the **platform admin surface**, I want delete-eligibility computed server-side and returned
with the catalogue, so that the affordance I render and the rule the server enforces are the
same rule.

**Acceptance criteria:**
- Given `admin_get_role_templates` is called, when the payload is read, then every template entry
  carries `deletable` (boolean) and `undeletable_reason` (text or null).
- Given a template that is retired, was never published, and has no copies, when the list is read,
  then `deletable` is `true` and `undeletable_reason` is null.
- Given a template failing any one guard, when the list is read, then `deletable` is `false` and
  `undeletable_reason` names **which** condition failed, in server-authored copy checked against
  the migration's literal.
- Given a template failing more than one guard, when the list is read, then `undeletable_reason`
  is deterministic (a fixed precedence order), so the same state always reads the same way.
- Given the existing consumers of this read, when the payload widens, then no existing key changes
  name, type, or meaning — additive only.

### STORY-2: A template that was never offered and never adopted can be deleted

As a **platform admin**, I want to delete a retired template nobody ever saw, so that a mistake
does not become a permanent catalogue entry.

**Acceptance criteria:**
- Given a retired, never-published, never-adopted, non-system template, when
  `admin_delete_role_template` is called by a platform admin, then the row and its cascading
  versions/permissions are removed and the call reports success.
- Given a template with **any** row in `role_template_publications`, when delete is called, then it
  is refused with a reason naming that it was offered — **even if no copy survives today**.
- Given a template with **any** row in `group_roles.created_from_role_template_id`, when delete is
  called, then it is refused with a reason naming the surviving copies.
- Given a template with `retired_at IS NULL`, when delete is called, then it is refused with a
  reason saying it must be retired first.
- Given `is_system` is true, when delete is called, then it is refused.
- Given a non-admin caller (including an anonymous-session Mist holding `authenticated`), when
  delete is called, then it is refused `42501` at the gate — and the function carries the explicit
  `revoke all … from public, anon` (see TASK-SEC-01: default privileges do **not** cover the apply
  path, so the revoke is load-bearing, not hygiene).
- Given the guard refuses, when the caller inspects the database afterwards, then **nothing was
  deleted** — the refusal is raised before any write, not partway through a cascade.

### STORY-3: The deletion outlives the thing it deleted

As an **auditor**, I want the audit row to remain meaningful after its target is gone, so that the
trail does not forget what was destroyed.

**Acceptance criteria:**
- Given a delete succeeds, when `admin_audit_log` is read, then a row records the act with the
  actor, and its metadata carries the template's **name**, id, and version count **captured before
  the delete** — because the target row no longer exists to be joined against.
- Given the audit row is read a year later, when the template id is resolved, then it resolves to
  nothing and the metadata still says what was deleted, by name.
- Given a delete is refused, when the audit log is read, then no deletion row was written.

> An audit trail that forgets what it acted on is the same defect TASK-INT-03 ruled against when
> it kept 674 orphaned groups precisely because they were audit actors. Same principle, other end.

## Platform dependencies

Platform Core / Governance owns `role_templates`, its versions, publications, and the admin RPC
family (FEAT-PC025, PC027, PC028). This feature adds one function and widens one read within that
family. No Domain Service is involved. Depends on **PC-3** for role-template authority per Hub §L3
ADM-17's dependency column.

## Cross-product impact

**Hub only** ([FEAT-H045](../../../products/hub/features/FEAT-H045-retired-template-collapse-and-mistake-disposal.md)), which consumes both changes API-first. The Gimbal has no admin catalogue.
No studio surface reads role templates.

## Vertical impact

- **Privacy/GDPR:** None. Role templates carry no FIM data; `retired_by` is a personal-group id
  already present and unchanged. No new personal data is stored, and the delete removes no
  member-owned content.
- **Notifications:** **None, by construction.** A template eligible for deletion was never
  published, so no Steward was ever told about it and none can be told of its removal. This is the
  reason the guard's publication clause is load-bearing rather than incidental. Existing retired
  notices (RD-7) are unaffected.
- **Administration:** DeusEx-scope only — `is_platform_admin()` gated, consistent with the rest of
  the `admin_*` family. This *is* the lifecycle-management gap W-10 named.
- **Observability:** STORY-3 is entirely this vertical. Refusals are surfaced verbatim and never
  swallowed (V4). The delete is the only destructive act in the role-template family, so its audit
  row is the one that must survive its target.
- **Transactions:** None.
- **Extensibility:** `undeletable_reason` is an **open code**, not a sealed enum — a future guard
  adds a reason without a type migration or a client-side exhaustiveness break. No new permission
  scope: this rides the existing platform-admin gate rather than minting `delete_role_template`.

## Performance budget

**N/A (no surface)** — platform contracts only. The consuming surface's budget is FEAT-H045's.

Note for that budget: eligibility is computed **inside the existing list read**, deliberately, so
the catalogue does not gain a second round-trip per template — the per-entry-second-call shape the
PC028 payload walk caught and rejected.

## Open questions

1. **Does `admin_retire_role_template` accept a never-published template?** If it refuses, the
   `retired_at` guard makes delete unreachable for exactly the case this feature exists to serve.
   Resolve at build, before the guard is written (named in Rabbit holes).
2. **Precedence order for `undeletable_reason`** when several guards fail. Proposal: system →
   not-retired → published → adopted. Cheap to settle, must be fixed so the copy is deterministic.
