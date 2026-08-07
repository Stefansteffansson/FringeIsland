# FEAT-PC028: Role-template publication, scoped offer, and diff-on-copy contracts

---
id: FEAT-PC028
title: Role-template publication scope, group-scoped offer read, diff-on-copy contracts, and the three passive distribution notices
owner: platform/core/governance
consumers: [hub]
wave: ferd
maturity: 6-done
---

> **REOPENED AND RECLOSED 2026-08-07 — STORY-8 (corrective).** This feature
> first reached `6-done` with a payload-walk commitment unbuilt:
> `admin_get_role_template_detail` was never widened. Found at the start of the
> Hub half, when FEAT-H044 STORY-3 had no server key to read. Migration
> `20260807140000` applied on the named approval *"ok apply the RD-B corrective
> migration"*; cells C1–C5 went red → green and the live catalogue was
> re-verified (both keys present, signature byte-identical, ACL preserved —
> `anon` denied, `authenticated`/`service_role` allowed). See STORY-8 below.

**Cycle:** RD-B (role distribution, distribution) · **Pairs with:** [FEAT-H044](../../../products/hub/features/FEAT-H044-available-roles-view-and-diff-on-copy-ceremony.md)
**Board:** [role-distribution design note](../../../planning/hub-v2/2026-08-05-role-distribution-design-note.md) — CLOSED (RD-1 settled; RD-2..RD-10 confirmed 2026-08-06)
**Substrate evidence:** [RD-B substrate dossier](../../../planning/hub-v2/2026-08-06-rd-b-substrate-dossier.md) — every claim below traces there with `file:line`. Its seven-row decomposition board (RDB-1..RDB-7) was settled **all as recommended**, 2026-08-06.
**Builds on:** [FEAT-PC027](./FEAT-PC027-role-provenance-retirement-and-group-side-removal-contracts.md) (RD-A) — the provenance stamp and central retirement this feature distributes against.
**Schema-gated.** The migration PR holds for a named approval; tasks land at `review`, not `done`.

## Problem

The catalogue has no idea who anything is *for*, and an adopted copy has no way *forward*.

**Every template is offered to every group.** `get_role_templates()` takes no arguments (`20260806170000:608`). It returns the whole non-retired catalogue to any authenticated caller. An admin who clones a role for one pilot group has published it to the entire platform, because "publish" as a concept does not exist — there is only "exists". ADR-U007's three verbs (define / instantiate / customise) have no *distribute* between the first two.

**And RD-A only filtered the read.** `create_group_role` validates that the template **exists** and nothing more (`20260806170000:404-408`) — no `retired_at` predicate, no scope predicate. Under ADR-U038 that RPC *is* the API, so a retired clone is still adoptable by anyone holding `manage_roles` who knows its id. The Hub's picker hiding it is not an access control. This is the same shape as TASK-RDA-03: a rule enforced at one door while a neighbouring door onto the same state stays open.

**A copy can never catch up.** RD-A made divergence *legible* — a group role now says `Template · v1 · copied 12 Mar` while the catalogue serves v6. It gave it nowhere to go. Grepping `sync_group_role|refresh_group_role|update_group_role_from_template` across `supabase/migrations` returns nothing; the group-role doors that exist (`create_group_role`, `update_group_role`, `delete_group_role`, `set_group_role_permission`) either make a *new* role or edit one field at a time. None knows what a template version is. A Steward's only route to v6 is to delete and re-adopt, losing every local edit and every holder.

**And nobody is ever told anything.** RD-A shipped the state changes and deliberately left the telling to this cycle: a retire performed today is silent.

## Solution sketch

One migration. One new table, five new contracts, three re-issues, four seed rows.

**1. Publication as data (RD-8).** `role_template_publications` — one row per reach: `role_template_id`, a **nullable** `group_id` where NULL means platform-wide, plus `published_at` / `published_by`. "All groups" is a NULL, never a code path.

The nullable scope column forces a uniqueness question the constraint syntax does not answer for free: in a plain `UNIQUE (role_template_id, group_id)`, **NULLs are distinct**, so the same template could be published platform-wide twice. Two mechanisms exist — `UNIQUE NULLS NOT DISTINCT` (PG15+), which has **zero precedent in this repo** (grep over `supabase/migrations`: no hits), and a partial unique index, which has three (`uq_journey_enrollments_active_party`, `uq_step_instance_open`, `uq_journeys_single_onboarding_designation`). **Take the precedented one:** `UNIQUE (role_template_id, group_id)` for the targeted rows plus `CREATE UNIQUE INDEX … ON role_template_publications (role_template_id) WHERE group_id IS NULL` for the platform-wide one.

**2. Publish and unpublish, idempotent (RDB-5).** `admin_publish_role_template(p_role_template_id, p_group_ids uuid[] DEFAULT NULL)` — NULL means platform-wide; a non-empty array names its targets; an **empty** array is a `22023` refusal rather than a silent platform-wide publish. Re-publishing an existing reach returns the current state with `already_published: true` rather than raising, matching `admin_retire_role_template`'s own `already_retired: true` return (`20260806170000:~715`). `admin_unpublish_role_template` is the same door in reverse. Both audit-log through the existing admin path, and both refuse a retired template.

**3. The scoped offer read (RDB-1).** A **new** contract, `get_available_role_templates(p_group_id uuid)` — not a re-issue. COR-A's discipline is that a re-issued function keeps a byte-identical signature so `create or replace` preserves its ACL; adding a parameter makes a different function. The zero-arg `get_role_templates()` is **dropped in the same migration** once its one wrapper moves (`hub/lib/groups/queries.ts:239-244`). One live door onto offerability, not two — an overload would let a caller that omits the argument silently receive the unscoped catalogue, which is the exact footgun this feature exists to close.

The read is scoped **and** retirement-filtered, and it carries the adoption state each entry needs, so the Steward's view is one read: whether this group already holds a copy, which version that copy is on, and which version the catalogue serves now.

**4. The write door learns the rule.** `create_group_role` re-issued (byte-identical signature) to refuse a retired template and refuse one not offered to that group. **The read filter is not the rule; the contract is.**

**5. The diff, computed against the group's own grants (RD-3).** `get_role_copy_diff(p_group_role_id)` returns `added` / `removed` / `unchanged` plus both version numbers, and `apply_role_template_update(p_group_role_id)` applies it transactionally and re-stamps `created_from_version_number`.

The diff is computed against the group role's **current** grant set, never against the version it was copied from. This is the whole of RD-3 and the single most inviting wrong turn in the cycle: a version-vs-version diff renders the *template's* changelog and hides the *Steward's* divergence — so a permission the Steward deliberately revoked would appear nowhere in the ceremony and be silently re-granted on apply. That is escalation by merge wearing a diff's clothes.

**6. Three passive kinds (RD-7), in their own category (RDB-3).** `role_template_published` / `role_template_updated` / `role_template_retired`, `dispatch_segment` left NULL — the column's default, because the Steward acts in the roles panel, not the bell. No dispatcher segment, no handler, no framework. Emission from the publish contract, from `admin_set_role_template_default_version` (`20260804190000:513` — the Apply door, where "updated" actually happens), and from `admin_retire_role_template`.

**7. The defensive creation-time guard (RDB-4).** `create_engagement_group` re-issued with `retired_at IS NULL` on both instantiation branches (`20260806170000:274-284` carries neither today).

## Appetite

One cycle. The publication table is small and the notices are seed rows; the work is concentrated in the diff semantics, in the two doors that must now agree about offerability, and in getting the DS-5 registry write past the conformance gate cleanly.

## Rabbit holes

- **Making publish write into groups.** RD-2 forbids it absolutely. Publish changes *where a template is offerable*; adoption stays the Steward's act. The moment publish creates a `group_roles` row, group sovereignty is gone and consent machinery becomes necessary.
- **Diffing version N against version N+1.** See Solution sketch §5. It looks like the obvious implementation and it defeats RD-3.
- **A `publish` boolean on `role_templates`.** Cheaper than a table and unable to express scope; RD-8 settled the data-driven shape precisely so "all" is not a special case.
- **Auto-applying updates to copies that haven't diverged.** Tempting ("no diff to show, so just do it") and wrong: it makes a central act rewrite a group's roles without the Steward, which is RD-2 again through a side door.
- **Folding in TASK-RDA-03.** `set_group_role_permission`'s missing revoke-side `is_protected` check is a neighbouring hole in the same family. It stays its own task — it has its own unverified premise to drive red first.

## No-gos

- No write into any group as a consequence of a central publish, update, or retire (RD-2).
- No silent union on copy. The diff ceremony is the only path from template to existing role (RD-3).
- No central **delete** of a role template, and no deletion of publication rows on retire (RD-4, RDB-6).
- No `get_role_templates` overload. The zero-arg contract is dropped, not shadowed (RDB-1).
- No new SECURITY DEFINER function or table unregistered in `supabase/ownership.manifest.json` in the same migration.

## Object class and conformance gates

Named before `4-ready`, per the N-E lesson — a keyword sweep finds what resembles the past, this question asks what the object *is*.

- **`role_template_publications` is not a new object class.** A PC-3 table with FKs to `role_templates` and `groups` is exactly `group_template_roles`' shape (`20260222000000:169`). Registered `PC-3`, `memberData: false` — it is communal catalogue reach, carrying no FIM data; the `published_by` actor id is admin attribution already exported through the admin's own `audit_trail` rows, the reasoning `role_template_versions` uses verbatim (`ownership.manifest.json:325`).
- **The DS-5 registry write is the gate that matters.** `notification_kinds` and `notification_categories` are owned by **DS-5**, not by the notifications vertical — relabelled at COR-C W4 (Audit III ruling R-4) precisely so `dsTables()` covers them and a non-DS-5 reach-in fails the inner-ring gate. The manifest note also records a **pinned vertical-set test in `ownership-manifest-conformance.test.ts`**. Adding a `roles` category and three kinds is a *migration-level seed* into DS-5-owned reference data — the N-A/N-B/N-E precedent, and not a function-body crossing.

**Checked at build, and the first reading was wrong.** This spec originally said the pinned expected-set would change. It does not: that test pins the set of tables owned by `vertical:*`, which is exactly `['notifications']`, and RD-B adds no vertical-owned table — `role_template_publications` is PC-3, and the category and kinds are *rows in* DS-5-owned tables, not new tables. The suite was also swept for any exact-set assertion over categories or kinds; there is none (`preference-and-dispatcher-contracts.test.ts:722` asserts `>= 6`, which survives a seventh). **No conformance expected-set update is owed.** The DS-5 ownership still matters for a different reason — a *function body* reaching into those tables would fail the inner-ring gate — but a migration seed does not.
- **Notice emission is explicitly blessed, not a crossing.** `public.notifications` is owned by `vertical:notifications`, whose manifest note states it is *"written by every tier as obligation-fulfilment, NEVER a boundary crossing (ADR-U047 rule 5)"* and is deliberately not a DS table so the inner-ring gate does not treat writes to it as crossings. PC-4 contracts writing notices need no licence.
- **The `get_role_templates` drop** is the one destructive schema act in the migration. It is a contract removal, so it belongs to the held schema gate like the rest, and its single caller moves in the same change.

## Stories

### STORY-1: An admin publishes a template to one group, several, or all

- Given a non-retired clone and a list of group ids, when an admin publishes it, then one `role_template_publications` row exists per named group, each with `published_at` and `published_by` set to the admin's personal group id.
- Given the same template and no group list (argument omitted or NULL), when an admin publishes it, then exactly one row exists with `group_id IS NULL` — the platform-wide reach, expressed as data and not as a flag (RD-8).
- Given a template already published platform-wide, when an admin publishes it platform-wide again, then the call **succeeds** and returns the current state with `already_published: true`; no second row is created and the partial unique index is not violated (RDB-5).
- Given a template published to group A, when an admin publishes it to groups A and B, then B gains a row, A's row is untouched (its original `published_at` preserved), and the result reports both reaches.
- Given an **empty** group array, when publish is called, then it is refused `22023` — an empty list is a caller mistake, not a request to publish to everyone.
- Given a **retired** template, when publish is attempted, then it is refused: the catalogue cannot begin offering something it has stopped offering.
- Given a non-admin caller, when publish or unpublish is attempted, then it is refused `42501` and the refusal is audit-logged, matching `admin_retire_role_template`'s shape.
- Given a publish or unpublish that succeeds, when the audit log is read, then a row names the actor, the template, and the reach that changed.

### STORY-2: A Steward sees only what is offered to their group

- Given a template published to group A only, when `get_available_role_templates(A)` is read, then it is present; when read for group B, then it is absent.
- Given a template published platform-wide, when the read is made for any group, then it is present.
- Given a template with **no** publication rows, when the read is made for any group, then it is absent — an unpublished clone reaches nobody.
- Given a **system** template, when the read is made for any group, then it is present regardless of publication rows — the four seeded roles are the floor every group is built on and are not subject to distribution (the same exemption `admin_retire_role_template` already makes for retirement).
- Given a **retired** template that is still published, when the read is made, then it is absent — retirement and scope are independent filters and both must pass. The publication rows are **kept**, not deleted, so an unretire restores the reach that existed before (RDB-6).
- Given a template the group has **already adopted**, when the read is made, then its entry carries `adopted_group_role_id`, the copy's `adopted_version_number`, and the catalogue's `current_version_number` — the three keys FEAT-H044 needs to render "copied · current" versus "copied · update available" without a second read.
- Given a copy whose provenance is honestly unknown (`created_from_version_number IS NULL`, RD-10), when the read is made, then `adopted_version_number` is null and the entry is still returned — the view states what it knows and does not guess.

  **Recorded at build, not decided: a group can adopt the same template twice.** `group_roles` is `UNIQUE(group_id, name)`, not unique per source template, so one group may hold two copies of template T under different names. `adopted_group_role_id` is therefore genuinely ambiguous, and the contract resolves it as the **earliest** adoption. Either choice is arbitrary for a single-pointer key, and the cost of the current one is small but real: the offer entry could read the older copy's version and show "update available" while a newer copy of the same template is already current.

  Not fixed here, deliberately — the migration is applied, and the house rule is that an applied migration is corrected by a new one rather than rewritten, which would cost a second schema gate for an ambiguity that is not a defect. **Surfaced by a failing cell rather than reasoned about in advance:** S2f asserted against a group earlier cells had already adopted into, so it was testing cell ordering rather than the contract. The cell now uses a fresh group; the ambiguity is recorded here instead of being papered over there. If FEAT-H044's surface finds the earliest-copy pointer misleading, the fix is a one-line `order by` change in its own migration.
- Given the zero-arg `get_role_templates()`, when it is called after this migration, then it **does not exist** (RDB-1).

### STORY-3: Adoption refuses what is not offered

> **Prove it red first.** The premise — that `create_group_role` refuses neither a retired nor an unoffered template today — is read from source (`20260806170000:404-408`), not driven. The first cell written for this story retires a clone and then attempts adoption **against the current contract**. If it refuses already, the premise is wrong and this story is corrected before the migration is written. RD-A's two overturned premises were both caught at build; this one is checked on time.

- Given a **retired** template, when a Steward with `manage_roles` calls `create_group_role` with its id, then it is refused — not merely hidden from the picker.
- Given a template **not published** to this group, when adoption is attempted, then it is refused with the same "not offered" reason. A caller who learns an id from another group cannot adopt across the scope boundary.
- Given a template **published** to this group, when adoption is attempted, then it succeeds and the provenance stamp lands exactly as RD-A specified (`created_from_role_template_id` + `created_from_version_number` from the live `default_version_id`).
- Given a system template, when adoption is attempted, then it succeeds regardless of publication rows, matching STORY-2's exemption.
- Given a caller **without** `manage_roles`, when adoption is attempted, then the existing `42501` fires first and unchanged — the permission check precedes the offerability check, so the anti-escalation pin stays exactly where it is.
- Given a resting or suspended group, when adoption is attempted, then `assert_group_writable` (FEAT-PC023) refuses first and unchanged.
- Given the custom path (`p_permissions` supplied, no template), when a role is created, then nothing in this feature applies — a custom role has no offer to check.

### STORY-4: A Steward can see exactly how their copy differs from the template today

- Given an adopted role whose group has not edited it and whose template has not moved, when the diff is read, then `added` and `removed` are both empty, `from_version` equals `to_version`, and the surface has nothing to offer.
- Given an adopted role on v1 whose template now serves v3 with two permissions added, when the diff is read, then those two appear in `added`, `from_version` is 1 and `to_version` is 3.
- Given an adopted role from which **the Steward deliberately revoked** a permission that the template still grants, when the diff is read, then that permission appears in **`added`** — because the diff is computed against the group role's *current* grants, and re-granting it is exactly what applying would do. **This is the acceptance criterion RD-3 exists for.** A diff computed version-to-version would omit it entirely and the ceremony would lie.
- Given an adopted role to which the Steward **added** a permission the template does not grant, when the diff is read, then it appears in `removed` — applying the template's set would take it away, and the Steward must see that before confirming.
- Given a copy with unknown provenance (`created_from_version_number IS NULL`), when the diff is read, then `from_version` is null and the added/removed sets are still computed correctly from the grants — an unknown version blocks the *label*, never the comparison.
- Given a **custom** role (no `created_from_role_template_id`), when the diff is read, then it is refused `P0002`: there is no template to diff against.
- Given an adopted role whose source template has since been **retired**, when the diff is read, then it is still computed and returned — the group owns its copy and is entitled to know how it stands, even against a template no longer offered. Whether it may *apply* is STORY-5.
- Given a caller without `manage_roles` in that group, when the diff is read, then it is refused `42501`.

### STORY-5: Applying an update is the diff and nothing but the diff

- Given a diff with two additions and one removal, when a Steward with `manage_roles` applies it, then after the call the group role's grant set equals the template's live materialised set exactly — not a union with what was there before (RD-3).
- Given the apply succeeds, when the role is read, then `created_from_version_number` equals the template's current default version number: the copy has honestly moved, and the next diff is empty.
- Given the apply succeeds, when the source template and its versions are read, then they are untouched — this is the group acting on its own property, in the same direction as RD-A's group-side removal.
- Given an apply that would leave the group with **no definer** of a protected permission (because the template's newer version dropped it), when apply is attempted, then it is refused naming the permission that would be lost — the RD-5 lockout guard, reused at the door where a version update can now brick a group. The reachability caveat RD-A recorded holds here too: in a default group the Steward instance is the sole definer and can never be made unheld, so this fires where some *other* role is the last definer.
- Given a resting or suspended group, when apply is attempted, then `assert_group_writable` refuses first and unchanged.
- Given a template that has since been **retired**, when apply is attempted, then it is refused: the catalogue has stopped offering this, so it will not push a new version into a group. The copy is untouched and the Steward keeps what they have (RD-2 — retire never reaches into a group, in either direction).
- Given two concurrent applies of the same role, when both run, then the second observes the first's result rather than both computing against the same pre-state — the apply reads and writes the grant set in one transaction.
- Given members holding the role, when apply completes, then their holdings are unchanged; only the permissions the role grants have moved. No member is stripped of the role itself.

### STORY-6: The three notices are news, not asks

- Given the registry after this migration, when `notification_kinds` is read, then `role_template_published`, `role_template_updated`, and `role_template_retired` each exist with `dispatch_segment IS NULL` — passive by construction, not by configuration (RD-7).
- Given the registry, when `notification_categories` is read, then a `roles` category exists, `transactional` / `badge` like every Ferd category. It is separate from `platform` deliberately: a member can mute a category as a unit, and muting *admin announcements* must not silently also mute *"a role your group holds has changed"* (RDB-3).
- Given a template published to group A, when the publish completes, then every member of A holding **`manage_roles`** receives a `role_template_published` notice naming the template and the group. `manage_roles` — not `assign_roles` — because it is the permission `create_group_role` gates adoption on, so the notice reaches exactly the people who can act on it (RDB-2). The two sets coincide today (`supabase/seeds/02_role_templates.sql:28` grants both to the Steward template); they diverge the moment a group defines a roles-only delegate.
- Given a **platform-wide** publish, when it completes, then `manage_roles` holders across all active groups receive the notice — resolved from the publication row's NULL scope, not from a separate broadcast path.
- Given an admin applies a new default version to a template (`admin_set_role_template_default_version`), when it completes, then `manage_roles` holders in every group **that has adopted that template** receive `role_template_updated`. Groups that never adopted it are not told about a version they do not hold.
- Given an admin retires a template, when it completes, then `manage_roles` holders in every group that has adopted it, plus those in every group it was published to, receive `role_template_retired`.
- Given any of the three notices, when it is delivered, then `ds5_may_deliver` / `ds5_apply_notification_preference` gate it exactly as they gate every other kind — no bypass, no new path.
- Given a notice payload, when it is read, then it carries ids and the template name only — no member PII, matching the content-minimal shape of the lifecycle fan-outs (`20260721100000:279-290`).
- Given a group with zero `manage_roles` holders, when a publish or retire occurs, then the contract completes and notifies nobody, without raising.

### STORY-7: Retirement reaches the instantiation path it currently misses

- Given a **retired** role template registered to a group template via `group_template_roles`, when a group is created from that group template, then the retired template does **not** instantiate.
- Given a group created with **no** template, when it is created, then it receives the system role set exactly as WA-6 specified — unchanged, because system templates cannot be retired.
- Given a group template registering only non-retired templates, when a group is created from it, then the instantiated role set is identical to today's, provenance stamps included.

**Why this is defensive depth, stated plainly.** Verified 2026-08-06: `create_engagement_group` filters neither branch by `retired_at` (`20260806170000:274-284`), *and* the hole is unreachable — the template-less branch selects only `rt.is_system`, and `admin_retire_role_template` refuses system templates outright (`20260806170000:~700`), while the template-chosen branch selects through `group_template_roles`, which registers only the four system templates (`20260804210000:10-13`).

**And RD-9, honestly.** The settled row reads *"only platform-wide publications appear in the group-creation template chooser."* No publication row reaches that chooser at all: publications are `role_template ↔ group`, while creation-time instantiation runs through `group_template_roles`, which is `group_template ↔ role_template`. RD-9 rules against a door that does not exist, and RD-B as scoped does not open it — publish **offers**, it does not register anything anywhere (RD-2). The predicate is written anyway because it is one line and one cell against a hole that is one future junction row from live, on the precedent of RD-A's own rarely-reached `is_protected` guard. RD-9's intent is honoured; its stated mechanism is recorded as not existing.

### STORY-8 (CORRECTIVE): The admin detail read carries reach and retirement

- Given an admin opens a non-system template's detail, when the payload returns, then it carries `publications[]` — one entry per reach, `{group_id, group_name, published_at}` — with `group_id` NULL for the platform-wide row, sorted first.
- Given a template published to nobody, when the detail loads, then `publications` is present and empty — never absent, because the surface renders *"Not published"* from `[]` and an absent key is indistinguishable from a failed read.
- Given a template published to named groups, when the detail loads, then each entry carries the group's **name**, because the Hub has no group-lookup read of its own and STORY-3 lists the named groups.
- Given any template, when the detail loads, then `template.retired_at` is present whether retired or not — FEAT-H044 STORY-3 branches on it unconditionally to state why publishing is unavailable.
- Given a **retired** template with existing reach, when the detail loads, then the publication rows are still returned (RDB-6 — reach survives retirement, so an unretire restores it rather than silently publishing to nobody).
- Given a non-admin, when they call the read, then it still refuses with 42501 — the widening opens no side door onto admin-plane data.

**Why this is a corrective and not a new story.** FEAT-H044's payload walk recorded this as *finding 2, fixed in PC028 before `4-ready`*: **"the admin reach display had no server key at all — `admin_get_role_template_detail` knows nothing about publications. PC028 widens it rather than adding a fourth read."** The finding was written into the **consumer's** payload walk and into TASK-RDB-03's technical notes, but never transcribed into a story **here**, in the provider's spec — so there was nothing in PC028's own scope to build it from, and its absence survived the build, the schema gate, the full suite, and doc-health.

**The generalisable lesson: a cross-spec commitment recorded only in the consumer's payload walk has no home to be built from.** The walk is what *finds* the gap; the provider's stories are what *close* it. Both halves are needed, and a walk finding that changes the provider's payload must land as a story on the provider before either spec goes `4-ready`. Two keys were missing rather than one — `retired_at` was never on the detail read either — which is what a missing story looks like from the outside.

Verified three ways before the corrective was written: PC028's migration does not mention the function; no later migration re-issues it; and the **live catalogue's** definition contains neither `role_template_publications` nor `retired_at` (`pg_get_functiondef`, 2026-08-07).

## Platform dependencies

- **FEAT-PC027** (RD-A) — `group_roles.created_from_version_number`, `role_templates.retired_at` / `retired_by`, and the retirement contracts this feature notifies from and filters on. Hard prerequisite: without the provenance stamp there is no `from_version` and the diff has no anchor.
- **FEAT-PC025** (ADM-F) — `role_template_versions`, `default_version_id`, the Apply materialisation (`admin_set_role_template_default_version`, `20260804190000:513`) which becomes an emission point here, and `permissions.is_protected` which STORY-5's guard reuses.
- **FEAT-PC023** (HYG-A) — `assert_group_writable`, called unchanged by both new write doors.
- **FEAT-PC011** — `create_group_role`, re-issued here with a byte-identical signature (COR-A; ACL preserved by create-or-replace).
- **FEAT-PD013 / FEAT-PD016** (N-A, N-D) — the `notification_kinds` registry and the `ds5_may_deliver` / `ds5_apply_notification_preference` delivery gate. Consumed as-is; RD-B adds rows, not machinery.
- **WA-6 / migration `20260805150000`** — the template-less instantiation law STORY-7 must leave exactly as it stands.

## Cross-area note (PC-4 owner, PC-3 tables, DS-5 seed)

Owned by **PC-4 Governance**, following FEAT-PC025 and FEAT-PC027 — the role-template family's established home — while the tables it writes are registered **PC-3** (`role_templates`, `group_roles`, and the new `role_template_publications`). That split is precedented and ownership registrations do not move.

Three of this feature's contracts are member-facing rather than admin-plane (`get_available_role_templates`, `get_role_copy_diff`, `apply_role_template_update`) and belong to the PC-3 group-roles contract family by behaviour: their refusal semantics stay consistent with `create_group_role` and `delete_group_role`, not with the admin plane's. The DS-5 registry seed is covered under "Object class and conformance gates" above.

## Cross-product impact

Hub consumes every contract through [FEAT-H044](../../../products/hub/features/FEAT-H044-available-roles-view-and-diff-on-copy-ceremony.md). Gimbal has no role-management surface. No studio reads these contracts.

## Vertical impact

- **Administration** — Publish, unpublish, and the reach they change are admin lifecycle acts, each audit-logged with actor, template, and reach, and each refusing with a recorded reason rather than a silent no-op. The admin plane keeps seeing the whole catalogue, including retired and unpublished templates; scoping applies to the member-facing read only.
- **Privacy / GDPR** — No FIM data enters the new table. `published_by` holds a personal group id (the repo's actor primitive), classified `memberData: false` on the reasoning `role_template_versions` already carries: admin attribution is exported through the admin's own audit rows. Notice payloads are ids plus a template name — no member PII. `role_template_publications` is registered in the export classifier in the same change.
- **Notifications** — The whole of RD-B's third leg. Three registered kinds in a new `roles` category, `dispatch_segment` NULL, delivered through the existing dispatcher and gated by the existing preference machinery. No new channel, segment, or handler. Recipients are resolved by permission (`manage_roles`), never by role name.
- **Observability** — Publish, unpublish, version-apply, and retire each emit an audit row and a notice; the counts they report (groups reached, groups notified) are returned by the contract so a failure to fan out is visible rather than silent. Refusals — retired-template publish, empty group array, unoffered adoption, lockout-guarded apply — are recorded as refusals.
- **Transactions** — None. No entitlement, price, or receipt surface is touched.

## Implementation notes

Built and applied 2026-08-07 on the named approval "ok apply the RD-B migration". Migration `20260807090000` — one table, nine functions (five new, four re-issued), four seed rows, one contract dropped.

### Red → green evidence

Written red-first as one suite, `hub/tests/integration/groups/role-publication-and-diff.test.ts`. **36 red / 4 green** before the migration, **40 / 40** after.

Every red failed for the right reason: `PGRST202` on the five absent contracts, `PGRST205` on the absent table, and STORY-3/STORY-7 failing *by succeeding* — the write door was still open.

The four pre-migration greens are labelled pins in the file header, not coverage: S3c/S3f are positive-path pins guarding against the new scope check **over**-refusing; S3d pins FEAT-PC011's anti-escalation ordering; S7b pins WA-6's template-less role set.

### The premise was driven before the migration was written

FEAT-PC028's largest area rests on the claim that `create_group_role` refused neither a retired nor an unoffered template. RD-A shipped two premises that verification overturned *at build*; this one was checked first, three ways, in increasing order of authority:

1. **source** — `20260806170000:404-408` validates existence and nothing else;
2. **live catalogue** — `pg_get_functiondef` shows no `retired_at` in `create_group_role` or `create_engagement_group`, while `get_role_templates` and `admin_retire_role_template` both carry one;
3. **driven** (commit `ab2cc7b`) — a Steward adopted a **retired** template end-to-end: the call succeeded, the copy was created, its grants materialised, and the row was asserted at row level with its source provably retired.

(3) is the one that mattered. Absence of a predicate from a function body is not proof of reachability — a trigger or a grant could still have refused. Nothing did. **No spec correction was owed**, which is the outcome RD-A did not get.

### Six vacuous cells, caught and hardened

The first red run came back **30 / 10**. Six of those ten passes were vacuous — they passed *because their subject did not exist yet*: `PGRST202` satisfies `expect(error).not.toBeNull()`; a `for` loop over zero notification rows asserts nothing; "before === after" holds when nothing ran. Each is now pinned so it can only pass for the intended reason.

**`U038a` needed a second pass, and the reason generalises.** The first hardening *guessed* the error shape — Postgres `42P01` / "does not exist". PostgREST actually reports an unknown table as `PGRST205` / "in the schema cache", so the guard did not bite and the cell still passed. The shape was then verified against the live stack and the guard rewritten. **Guessing an error shape is how a vacuous test survives its own hardening.**

### Three things the build corrected

- **A claim in this spec was wrong and was retracted.** The spec, TASK-RDB-02 and the migration header all said the pinned vertical-set conformance expectation would need updating for the DS-5 registry seed. It does not: that test pins the set of tables owned by `vertical:*` — exactly `['notifications']` — and RD-B adds no vertical-owned table. `role_template_publications` is PC-3; the category and kinds are *rows in* DS-5-owned tables. The suite carries no exact-set assertion over categories or kinds either (`preference-and-dispatcher-contracts.test.ts:722` asserts `>= 6`, which survives a seventh).
- **Two cells asserted the wrong group state, and the code was right.** S3e and S5d used `resting` to pin the availability guard. `assert_group_writable` deliberately lets a resting group be written by an actor holding `rest_group`, which the Steward template grants — a Steward managing their own resting group is designed behaviour. `suspended` is the state that refuses below the admin plane, so the cells now use it.
- **A failing cell leaked state into a later one.** S5d set `groupA` to resting and failed *before* its trailing reset, so STORY-6's fan-out found no active group and reported a failure that was a **cascade, not a bug**. Both status mutations now sit in `try/finally`. The generalisable form: a trailing cleanup statement is not cleanup, because a failed `expect()` throws past it.

### The regression the E2E fleet caught, and the unit tier should have

The scoped read raises `42501` for a caller without `manage_roles`, where the dropped zero-arg catalogue was readable by any authenticated caller. Composed naively in `app/api/groups/[id]/roles/route.ts`'s `Promise.all`, that refusal rejected the whole route and the catch mapped it to **403** — so a *limited assigner* (holds `assign_roles`, not `manage_roles`) lost the **entire** roles panel: their own roles and the assign control they are entitled to use.

`roles.spec.ts:102` caught it by timing out waiting for `assign-select`. The fix degrades a refused offer to an empty list, which is exactly FEAT-H044 STORY-1's specified surface behaviour; ADR-U038 holds because the *rule* about who may see the offer stays in the contract and the route only composes.

**Labelled honestly: the two route cells in `group-roles-routes.test.ts` are test-AFTER.** The fix was written first, from the E2E diagnosis. They were then verified by reverting the fix — 1 failed / 21 passed with it reverted, 22 passed with it in place — so the coverage is demonstrated-red retroactively, which is not the same as test-first and is not claimed as such.

### Recorded, not decided

- **A group can adopt the same template twice** (`group_roles` is `UNIQUE(group_id, name)`, not unique per source template), so `adopted_group_role_id` is genuinely ambiguous; the contract resolves it as the earliest adoption. Detail and reasoning in STORY-2 above.
- **Uniqueness on the nullable scope column** took the partial unique index (three repo precedents) over `UNIQUE NULLS NOT DISTINCT` (zero). S1c is the proof cell — a plain `UNIQUE` would not have caught a second platform-wide row, because NULLs are distinct in a UNIQUE constraint.

### Sibling adaptation

The sweep's good news: nearly every existing adoption uses a **system** template, and system templates are exempt from distribution. **No live group breaks** — the gate is at adoption time only, and existing copies are never re-checked. Adapted, never weakened: the BFF wrapper and its route; `role-templates-contract.test.ts` (the suite dedicated to the dropped contract, rewritten against the scoped one, with the INVOKER→DEFINER posture change stated in its header); RD-A's `role-provenance-and-retirement.test.ts` (clone fixture published, two offer reads repointed); ADM-F's `role-template-editing.test.ts` (clone published — **initially half-done**, which the admin slice caught as two failures). `role-permission-contracts.test.ts` needed no change.

### Numbers at close

Integration **1102/1102** (76 suites) · unit **1313/1313** (161 suites) · E2E **133/133**, leak delta 0 · lint **0 errors** (3 pre-existing warnings, none from these files) · `next build` green.

### ADR-U043

**Not triggered by this half and no number is claimed.** PC028 adds no request to any user-facing first paint — the scoped read replaces the catalogue read the roles route already made, one-for-one. The placement decision that *could* trigger it (the available-roles section) belongs to FEAT-H044, whose performance budget draws it behind an affordance.

## Performance budget

Per ADR-U043, stated at spec time rather than discovered at the gate. `get_available_role_templates` is a **new read**, not a widening of an existing one — RD-A avoided a cycle-level deep-cold measurement by riding the fabric read the panel already made, and this feature cannot repeat that trick. The budget is therefore drawn to keep it off the first-paint path: the available-roles view loads **behind an affordance** in FEAT-H044, not as part of the group-detail composed read. If that placement changes, the deep-cold spot measurement triggers and is owed at the area gate.

Index obligations, named now: `role_template_publications (group_id)` and `(role_template_id)` — the scoped read filters on the first and the notice fan-out on the second, and the FK-index discipline of `20260704075549` applies to both.
