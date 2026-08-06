# RD-A substrate dossier — provenance, central retire, group-side retire

**Filed:** 2026-08-06, at the RD-A decomposition open. **Cycle:** RD-A (role distribution, foundation).
**Board:** [role-distribution design note](./2026-08-05-role-distribution-design-note.md) — CLOSED; RD-1 settled, RD-2..RD-10 confirmed.
**Purpose:** establish the substrate facts RD-A's specs derive from, *before* the specs are written. Every claim below is anchored to a file and line, read cumulative-forward. Three of the last four cycles shipped a decomposition-time premise that the substrate did not honour; this dossier exists to spend that cost up front instead.

---

## The three instantiation doors

Every `group_roles` row is born at one of exactly three doors. The WA-8 provenance stamp must land at all three or it lies by omission.

| # | Door | Where | What it copies |
|---|---|---|---|
| 1 | **Group creation, template chosen** | `create_engagement_group` (latest `20260805150000:36`) | the chosen group template's registered role set, via `group_template_roles` |
| 2 | **Group creation, template-less** | same function, the no-template branch | **the system templates only** — clones excluded (WA-6 ruling, 2026-08-05, migration `20260805150000`) |
| 3 | **The pull door** | `create_group_role(p_group_id, p_name, p_description, p_role_template_id, p_permissions)` (latest `20260803190000:1897`-adjacent re-issue; first def `20260704090434:401`) | one named template, on the Steward's demand |

Door 2's shape is **two days old** and reversed the law that door's own gate cell had pinned a day earlier. Any spec statement about "what template-less instantiation copies" must cite `20260805150000`, never PC025's as-found section.

---

## Finding 1 — the copied-date needs no new column

`group_roles` already carries `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (`20260222000000_rebuild_universal_group_pattern.sql:178-186`). All three doors `INSERT` the row at copy time, so **the row's own `created_at` *is* the copied-date.** WA-8's second half is a render change, not a schema change.

**Consequence for the schema gate:** RD-A's migration adds *one* column, not two.

## Finding 2 — the "version" to stamp is the default pointer, not a snapshot

PC025 built versioning as: `role_template_versions (role_template_id, version_number, name, description, created_by, created_at)` with `UNIQUE (role_template_id, version_number)` (`20260804190000:~100`), and `role_templates.default_version_id` as the live pointer (`:121`).

The load-bearing detail is in `default_version_id`'s own comment (`20260804190000:126-131`): **Apply = repoint + *materialise* the version onto `role_templates` / `role_template_permissions` — the live rows `create_engagement_group` + `copy_template_permissions` actually read.** The doors never read the version tables.

So at copy time the honest provenance is *the version whose materialisation is live*: `role_templates.default_version_id → role_template_versions.version_number`. No snapshot join, no new read path.

**Store the integer, not only the FK.** `role_template_versions.role_template_id` is `ON DELETE CASCADE`, so an FK-only stamp would evaporate if a template were ever deleted — the exact dangle RD-4 exists to prevent. A denormalised `version_number` survives independently and is also what renders.

## Finding 3 — the group-side delete refusal is THREE layers deep, not one

**This corrects the board's own framing.** The design note recorded the Hub gate ("`RolesPanel` gates deletion on `created_from_role_template_id` being null"). That is true and it is one third of the picture:

| Layer | Where | What it does |
|---|---|---|
| **RLS** | the `group_roles` delete policy, `created_from_role_template_id IS NULL` | named in the contract's own comment at `20260803190000` |
| **Contract** | `delete_group_role` | `raise exception 'template-derived role instances cannot be deleted' using errcode = '42501'` — deliberately an explicit refusal rather than a silent zero-row delete |
| **Surface** | `hub/components/groups/RolesPanel.tsx:146` | `{canManage && !role.created_from_role_template_id && (` — the affordance never renders |

**RD-A's third leg is therefore a schema + contract + surface change, not a Hub-only unlock.** A spec that only relaxes the panel would produce a button whose click is refused twice below it.

## Finding 4 — `delete_group_role` already refuses a role held by members

Same function: after the template-derived refusal, an `exists` check over `user_group_roles` raises `P0001` — *"role is held by members — remove the role from all holders first"*, recorded as **Open Q3's default: unbinding is explicit, never cascade.**

RD-A's third leg inherits this unchanged: a Steward strips holders first, then deletes. Worth stating in the spec as inherited behaviour so nobody "discovers" it at build and files it as a defect.

## Finding 5 — the lockout guard already exists; RD-5 should reuse it

`permissions.is_protected boolean NOT NULL DEFAULT false` was added at PC025 (`20260804190000:133`), set true for exactly: **`assign_roles`, `manage_roles`, `remove_roles`, `invite_members`, `remove_members`, `rest_group`** (`:141-143`). Its comment names it the **RB-4 self-lockout guard**: protected permissions cannot lose their last holder on any instantiation path via the template editor. Code-owned — seed/migration-set only, no client write path.

RD-5 ("refuse the retire that strips a group's last management role") is the same guard pointed at a new verb. **Reuse `is_protected`; do not introduce a second protected-permission concept.** Note the asymmetry to settle in the spec: PC025's guard protects against *losing the last holder*; RD-5's retire acts on *offerability*, which by RD-2 never reaches into a group at all — so the guard binds the group-side delete (leg 3), and central retire needs it only if retire is ever allowed to touch live copies. Per RD-2 and RD-4 it is not.

## Finding 6 — provenance dangles on template delete, which is why RD-4 is right

`group_roles.created_from_role_template_id` is `REFERENCES role_templates(id) ON DELETE SET NULL` (`20260222000000:182`). Deleting a template silently converts every adopted copy into an orphan reading "Custom". RD-4's retire-never-delete ruling is not merely an audit preference — it is the only thing standing between the catalogue and a mass provenance wipe.

---

## Conformance gates this object class faces

Per the decomposition walk added 2026-08-06 (`ecosystem-decomposition` §Decomposition verification walks):

- **No first-of-its-kind object class.** RD-A adds a column to `group_roles` (PC-3) and a column to `role_templates` (PC-3), and re-issues existing PC-3-owned contracts. No new table class, no cross-owner trigger mount, no new owner pairing. The GC-8 class does **not** fire here.
- **Ownership manifest:** the whole `role_templates` family is already registered `PC-3` (`supabase/ownership.manifest.json:18-21`), as are the contracts. Any *new* function RD-A introduces must be registered in the same migration — `functionOwner()` defaults to CORE, and an unregistered function fails two conformance suites.
- **Re-issue discipline (COR-A pattern):** `delete_group_role`, `create_engagement_group`, `create_group_role` and `get_role_templates` are all re-issued in place with byte-identical signatures so the ACL is preserved by create-or-replace.
- **Sibling-assertion sweep** is still owed at the migration header — three of these functions have live gate cells from PC023, PC025 and WA-6.

## The honest-unknown backfill (RD-10)

Existing `group_roles` rows predate the stamp. Per RD-10: backfill `version_number` by grant-set match against `role_template_versions` where the match is unambiguous; where two versions share a grant set, or none matches, leave NULL and render **"version unknown"**. Never guess a version onto a role. Note that `created_at` needs no backfill at all (Finding 1) — every existing row already has an honest one.
