# FEAT-PC027: Role provenance, central retirement, and group-side removal contracts

---
id: FEAT-PC027
title: Role-template provenance stamp, central retirement, and group-side removal of adopted roles
owner: platform/core/governance
consumers: [hub]
wave: ferd
maturity: 6-done
---

**Cycle:** RD-A (role distribution, foundation) · **Pairs with:** [FEAT-H043](../../../products/hub/features/FEAT-H043-role-provenance-retirement-and-role-removal.md)
**Board:** [role-distribution design note](../../../planning/hub-v2/2026-08-05-role-distribution-design-note.md) — CLOSED (RD-1 settled; RD-2..RD-10 confirmed 2026-08-06)
**Substrate evidence:** [RD-A substrate dossier](../../../planning/hub-v2/2026-08-06-rd-a-substrate-dossier.md) — every claim below traces there with file:line.
**Schema-gated.** The migration PR holds for a named approval; tasks land at `review`, not `done`.

## Problem

A group role copied from a central template is, today, **illegible and permanent**.

**Illegible:** `group_roles` records *which* template it came from (`created_from_role_template_id`) but not *which version*. Since PC025 gave templates versions and an Apply ceremony, a group can hold a copy of v1 while the catalogue serves v6, and nothing on either side can tell. Stefan's walk hit this exactly — "Nya gruppen #2", a v1-snapshot copy read against a v5 template: lawful, and illegible (WA-8).

**Permanent:** an adopted role cannot be removed from its group at all. The refusal is two layers deep — an explicit contract exception and a hidden affordance (dossier Finding 3, as corrected). A Steward who adopts a role by mistake, or outgrows it, has no way back.

**And the catalogue cannot forget.** There is no way to stop offering a template. "Steward clone" persists platform-wide with live copies and no retire affordance; the only way to un-offer something today is to delete it, which `ON DELETE SET NULL` would convert into a silent mass provenance wipe across every adopted copy (Finding 6).

These three are one foundation: provenance makes copies legible, retirement gives the catalogue an off-switch, and group-side removal gives the group its sovereignty back. RD-B's publishing sits on top of all three.

## Solution sketch

One migration, four contract areas, no new object class.

**1. The provenance stamp.** Add `group_roles.created_from_version_number integer` — the version whose materialisation was live at copy time, read from `role_templates.default_version_id → role_template_versions.version_number` (Finding 2). Stamped at **all three instantiation doors** (Finding 1's table). The copied-date needs **no column**: `group_roles.created_at` already exists and is set by every door at copy time.

The integer is denormalised deliberately. A version FK would evaporate under `ON DELETE CASCADE` from `role_templates` — the same dangle RD-4 exists to prevent.

**2. Honest-unknown backfill.** Existing rows get a version by unambiguous grant-set match against `role_template_versions`; ties and non-matches stay NULL and render "version unknown" (RD-10). Never a guessed version.

**3. Central retirement.** Add `role_templates.retired_at timestamptz` + `retired_by uuid`. Retire flips offerability only — **it never reaches into a group** (RD-2), never deletes (RD-4), and leaves every existing copy and its history untouched. Both picker reads filter it: `get_role_templates` (member-facing) and `admin_get_role_templates` (admin plane, which shows retired rows explicitly rather than hiding them). Unretire is the same door in reverse.

**4. Group-side removal.** Relax **both** live refusal layers for template-derived roles — the contract exception in `delete_group_role`, and (in H043) the affordance. The inherited held-by-members refusal stays exactly as it is (Finding 4), and the `is_protected` lockout guard binds here (Finding 5): a delete that would leave the group with no holder of a protected permission is refused with its reason.

**No RLS change is carried, and none may be.** The dossier's Finding 3 counted three layers; the third is a tombstone. HYG-A dropped the `group_roles_delete` policy (`20260803190000:4533`) and revoked `insert, update, delete` on `group_roles` from `authenticated, anon` (`:4545`) — verified against the live catalogue 2026-08-06: one policy (`group_roles_select`), and `authenticated` holds SELECT/REFERENCES/TRIGGER only. The comment inside `delete_group_role` naming "the RLS delete rule" records where that rule *went*, not that it still stands. Re-adding a `group_roles` DELETE policy would re-open the direct-PostgREST write path HYG-A deliberately closed — an ADR-U038 regression, not a relaxation. **Leg 3 is contract + surface.**

## Appetite

One cycle. The schema is one column plus two, the doors already exist, and the guard is already built — the work is in doing all three doors honestly and in the refusal copy.

## Rabbit holes

- **Rebuilding versioning.** PC025's version tables and Apply ceremony are done. This feature reads `default_version_id`; it does not touch the ceremony.
- **A second protected-permission concept.** `permissions.is_protected` exists and is already correct for this permission set (Finding 5). Reuse it.
- **Making retire touch live copies.** It must not. RD-2 and RD-4 both forbid it, and the moment retire mutates a group the whole "offer, never write" model collapses.
- **Cascading the group-side delete.** Open Q3's default is settled: unbinding is explicit, never cascade.

## No-gos

- No central **delete** of a role template. Retire only (RD-4).
- No write into any group as a consequence of a central action (RD-2).
- No guessed version on backfill (RD-10).
- No new SECURITY DEFINER function that isn't registered in `supabase/ownership.manifest.json` in the same migration.

## Stories

### STORY-1: Every adopted role records the version it was copied from

- Given a group is created with a chosen group template, when the roles are instantiated, then each `group_roles` row carries `created_from_version_number` equal to the source template's live default version number, and `created_at` set at copy time.
- Given a group is created **template-less**, when the system templates only are instantiated (per WA-6, migration `20260805150000`), then each row carries the same stamp.
- Given a Steward pulls a single role through the pull door (`create_group_role` with `p_role_template_id`), when the role is created, then it carries the same stamp.
- Given a role is created with **no** template (`p_role_template_id` null, a custom role), when it is created, then `created_from_version_number` is NULL and `created_from_role_template_id` is NULL — a custom role has no provenance to record.
- Given the source template's default version is later Applied forward to a new version, when the group's copy is read, then it still reports the version it was copied from — the stamp records history, not the catalogue's present.
- Given any group role, when `get_group_roles(p_group_id)` is read, then each entry carries **`created_from_version_number` (integer, nullable)** and **`created_at` (timestamptz)** alongside the existing `id`, `name`, `description`, `created_from_role_template_id`, `holder_count` and `permissions` — the two keys FEAT-H043's provenance line renders, added to the read the panel already uses.

### STORY-2: Pre-existing copies get an honest version or none

- Given a `group_roles` row predating this feature whose grant set matches exactly one `role_template_versions` row of its source template, when the backfill runs, then that version number is written.
- Given a row whose grant set matches two or more versions, or none, when the backfill runs, then `created_from_version_number` stays NULL.
- Given the backfill has run, when any row is inspected, then no row carries a version number that was inferred from anything other than an unambiguous grant-set match.

### STORY-3: An admin can stop offering a template without disturbing anyone who has it

- Given an admin retires a role template, when the retire completes, then `retired_at` and `retired_by` are set, and **no** `group_roles` row, `group_role_permissions` row, or version row is modified anywhere.
- Given a retired template, when `get_role_templates` is read, then the template is absent from the member-facing offer. **[Contract superseded 2026-08-07 by RD-B / FEAT-PC028 (RDB-1): the zero-arg `get_role_templates()` was dropped and the member-facing offer is now `get_available_role_templates(p_group_id)`, which filters retirement *and* publication scope. The behaviour this AC pins is unchanged and still enforced — only the door moved.]**
- Given a retired template, when `admin_get_role_templates` is read, then the template is present and each entry carries **`retired_at` (timestamptz, nullable)** — the admin plane shows the whole catalogue including what it has stopped offering, and the key FEAT-H043's retired-state render reads.
- Given a retired template that some group adopted before retirement, when that group's roles are read, then the adopted role is unchanged and still reports its source and version.
- Given a retired template, when an admin unretires it, then `retired_at` and `retired_by` return to NULL and it is offerable again.
- Given a **system** template (`is_system = true`), when a retire is attempted, then it is refused — the four seeded roles are the floor every group is built on.

**Recorded at build, deliberately not decided: does retire stop a role template riding *group-template* instantiation?** A role template can be registered to a group template via `group_template_roles`; `create_engagement_group` instantiates that registered set. This build does **not** filter retired templates out of that path — retire removes the template from the two *offer* surfaces (`get_role_templates` — since RD-B, `get_available_role_templates`; and the chooser by consequence) but does not silently change what an existing group template produces, which is the reading most consistent with RD-2 (a central act never rewrites a composition someone else made).

The question is **currently unreachable**: verified against the live catalogue 2026-08-06, `group_template_roles` registers only the four system templates, and system templates cannot be retired. It becomes live the moment RD-B lets a clone be registered to a group template. **RD-B must settle it** — either retire filters the instantiation path too, or retiring a registered template is refused until it is unregistered.

### STORY-4: A Steward can remove a role the group adopted

- Given a group role derived from a template and held by nobody, when a Steward with `manage_roles` deletes it, then it is deleted — the contract refusal and the affordance both permit it. (There is no RLS layer to permit: `group_roles` carries no DELETE policy and no DELETE grant below `service_role`, so the SECURITY DEFINER contract is the only door. See the Solution sketch §4 note.)
- Given the same role **held by one or more members**, when a delete is attempted, then it is refused with the inherited `P0001` — *"role is held by members — remove the role from all holders first"* (Open Q3's default, unchanged by this feature).
- Given a role that is the group's **only definer** of a protected permission (`assign_roles`, `manage_roles`, `remove_roles`, `invite_members`, `remove_members`, `rest_group`), when a delete is attempted, then it is refused naming the permission that would be lost — the group cannot be bricked from inside.

  **Two things learned at build about when this guard actually fires.** In a default group the Steward instance is the sole definer of all six protected permissions *and can never be made unheld* — `prevent_last_leader_removal` refuses to unbind the last Steward. So this guard fires only where some **other** role is the last definer of a protected permission. It is defensive depth, correctly placed and rarely reached, not a common path.

  And the neighbouring door is still open: `set_group_role_permission` carries **no** `is_protected` check on the revoke direction, so a group can be bricked by flipping a grant off rather than by deleting a role — the same outcome RD-5 exists to prevent, through a door RD-A did not close. Filed as [TASK-RDA-03](../../../planning/backlog/tasks/TASK-RDA-03-set-group-role-permission-lacks-protected-guard.md); deliberately out of RD-A's scope.

  **Corrected at build (2026-08-06), from "no holder" to "only definer".** As first written this AC was unreachable. The held-by-members refusal fires *first*, so by the time the lockout guard is evaluated the role provably has zero holders — deleting it removes no holder at all, and a holder-based test could never fire. The reachable and meaningful guard is by definer: if this role is the only one in the group granting a protected permission, deleting it means no member can be given that permission again without admin intervention. That is the brick RD-5 exists to prevent, and it is exactly the state a Steward reaches by obeying the held-first instruction — strip the holders, then delete. The guard is implemented by definer and the wording is corrected to match, rather than the guard being written to a test that cannot fire.
- Given a resting or suspended group, when a delete is attempted, then the existing availability guard (`assert_group_writable`, FEAT-PC023) refuses first and unchanged.
- Given a deleted adopted role, when the source template is read, then the template and its versions are untouched — group-side removal is the group's act on its own property.

## Platform dependencies

- **FEAT-PC025** — role-template versioning, `default_version_id`, the Apply materialisation, and `permissions.is_protected`. This feature reads all four; it changes none of them.
- **FEAT-PC023** — `assert_group_writable`, the availability guard the group-side delete already calls.
- **FEAT-PC011** — `create_group_role` / `delete_group_role`, both re-issued here with byte-identical signatures (COR-A pattern, ACL preserved by create-or-replace).
- **WA-6 / migration `20260805150000`** — the current template-less instantiation law. Door 2's behaviour must be cited from here, never from PC025's as-found section.

## Cross-area note (PC-4 owner, PC-3 tables)

This spec is owned by **PC-4 Governance**, following FEAT-PC025 — the role-template family's established home — even though the tables it writes (`role_templates`, `group_roles`) are registered **PC-3** in `supabase/ownership.manifest.json`. That split is precedented, not new: PC025 is governance-owned and altered `role_templates` and `permissions` the same way. Ownership registrations do not move; STORY-4 in particular extends the member-facing group-roles contract family (PC011 / PC023), and its refusal semantics stay consistent with those siblings rather than with the admin plane's.

## Cross-product impact

Hub consumes all four areas through [FEAT-H043](../../../products/hub/features/FEAT-H043-role-provenance-retirement-and-role-removal.md). Gimbal has no role-management surface. No studio reads these contracts.

## Vertical impact

- **Administration** — Central retirement is an admin lifecycle act and needs its cascade stated: retire touches offerability and nothing else; no group, copy, holder, or version row changes. Unretire is symmetric. System templates are exempt from retirement entirely.
- **Privacy / GDPR** — No FIM data enters any new column. `retired_by` holds a personal group id (the repo's actor primitive), consistent with every sibling admin contract. The provenance stamp is an integer about a template, not about a person.
- **Notifications** — **None in this feature.** The three passive notice kinds (published / updated / retired) are RD-B's scope, deliberately: RD-A ships the state changes, RD-B ships the telling. A retire performed during RD-A is silent by design, and RD-B's retired-kind will announce retirements from then on.
- **Observability** — Retire, unretire, and group-side role removal each write an audit-log row through the existing admin audit path, naming actor, target template or role, and the group where applicable. The refusals (held-by-members, protected-permission lockout, system-template retire) **raise rather than no-op silently, and their message reaches the caller verbatim** — but they are **not** written to the audit trail. *Corrected 2026-08-10 (TASK-RDC-03): this line previously claimed refusals "are recorded as refusals". They never were — the refusal INSERT sat in the transaction its own `RAISE` aborted, so Postgres discarded it. Measured: 0 rows matching `%_refused` in 6 808. The dead INSERTs are now deleted by ruling; refusal traceability is a deliberate non-goal.*
- **Transactions** — None. No entitlement, price, or receipt surface is touched.

## Implementation notes

**Built 2026-08-06, Cycle RD-A. Migration `20260806170000`, applied on the named approval "ok apply the RD-A migration and merge 448".**

### Red → green evidence

Red-first throughout, at `hub/tests/integration/groups/role-provenance-and-retirement.test.ts`.

**Red at head: 16 failed / 3 passed**, every failure for the right reason — `column created_from_version_number does not exist` (STORY-1/2 and the retire snapshot), `column retired_at does not exist`, `PGRST202` on both new functions, and STORY-4's cells hitting the exact `42501 template-derived role instances cannot be deleted` refusal this feature inverts. Notably S4b (held-by-members) failed *red* rather than passing, because the template refusal masked the held check — proving the ordering claim rather than assuming it.

**Green after apply: 19/19.** Full integration **1060/1060 across 75 suites** — no sibling fallout.

**One suspect passer caught before implementation.** S4d asserted only `error not null` on a suspended group, which the *template-derived* refusal also satisfied — it would have passed for the wrong reason and gone on passing after the refusal it was meant to pin was removed. Tightened to assert `P0001` and `group is suspended` by name. This is the "green when it should be red" rule doing its job.

**Three cells labelled honestly as NOT red-first**, green before and after by design: S4b and S4d pin *inherited* behaviour (PC011's held refusal, PC023's availability guard) that this feature must leave untouched; the ADR-U038 policy/grant cells assert the *existing* lockdown still holds.

### The two corrections, and what produced them

Both came from checking the substrate rather than trusting the decomposition. Both are recorded in full above (Solution sketch §4, and STORY-4's AC). The generalisable lesson from the first: **a comment naming a mechanism is evidence the mechanism was once there; the catalogue is the authority for whether it is there now.** The dossier read a tombstone as a live rule.

### Sibling-assertion sweep

Enumerated in the migration header. Two shipped assertions adapted as **labelled inversions** — `role-permission-contracts.test.ts:489`'s template-derived refusal clause and `RolesPanel.test.tsx:204`'s absent-affordance assertion. The anti-escalation pins (a caller without `manage_roles` still gets `42501`) deliberately left, because the permission check precedes the provenance check and those cells never exercised the removed refusal.

One coupling trap caught while adapting: the rewritten clause originally deleted `guideInstanceId`, which a later cell still needs to exist — its `42501` would have silently decayed to `P0002` and passed for the wrong reason. Uses a freshly-pulled role instead.

### Applied backfill result

1771 rows stamped, **1** left honestly unknown, 4656 custom rows untouched. The unknown row is a `Member` instance in the FringeIsland Members system group whose grant set had drifted from its template's only version — a genuine ambiguity the backfill correctly declined to resolve. It is the live proof of the `version unknown` render path.

### Found, filed, not fixed

`set_group_role_permission` carries no `is_protected` check on the revoke direction — a group can be bricked by flipping a grant off rather than by deleting a role. Same outcome RD-5 prevents, neighbouring door. [TASK-RDA-03](../../../planning/backlog/tasks/TASK-RDA-03-set-group-role-permission-lacks-protected-guard.md), which leads with verifying the brick end-to-end rather than treating the reasoning as proven.

## Performance budget

N/A (no surface). Platform-only contracts; the consuming surface's budget is carried by FEAT-H043. Two notes for the build: the picker reads gain a `retired_at IS NULL` predicate on an already-small table, and the backfill in STORY-2 is a one-shot migration-time pass over `group_roles`, not a runtime path.
