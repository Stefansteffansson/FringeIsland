# FEAT-PC025: Role-template editing contracts + the walk riders — versions with a default pointer over the write-sealed template substrate, and the three ADM-E re-issues

---
id: FEAT-PC025
title: Role-template editing contracts (ADM-17 platform half per RB-4/RB-5 — versioned templates, clone-don't-edit seeds, apply-as-repoint, the protected-permission guard) + the ADM-E walk riders (WA-2 audit-target resolution, WA-3 consent-erasure leg, WA-4 per-session sign-out hints) in one schema gate
owner: platform/core/governance
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

ADM-F's platform half. ADM-17 was re-scoped into Ferd at the area-gate close (2026-08-02, the zero-active-members rationale — blast radius on people is minimal today and only grows) and shaped by the settled RB board (RB-4 ratified the recorded design skeleton; RB-5 settled propagation as snapshot-now, 2026-08-03). The three ADM-E walk directives (WA-2/WA-3/WA-4, [findings](../../../planning/hub-v2/2026-08-04-adme-walk-findings.md)) ride this opener's schema gate by their recorded routing. The [substrate dossier](../../../planning/hub-v2/2026-08-04-admf-substrate-dossier.md) (both delegated walks, cumulative-forward + seeds; no migrations landed since) plus the spec-time live verification (2026-08-04) ground every premise:

1. **Template/catalogue CRUD is genuinely greenfield, and the substrate is write-sealed.** Zero writer functions exist against any of the five tables (verified-zero sweep); RLS is SELECT-only `TO authenticated USING (true)` (rebuild `20260222000000:1438-1450`), no write policies ever, no table grants — mutations reach the tables only via seed/migration DML. The sole read contract is `get_role_templates()` (SECURITY INVOKER, `20260722190000:48`), returning `{id,name,description}` only — nowhere near what an editor needs.
2. **The catalogue is 48 on the live DB** (live-counted at spec time, discharging the dossier's caveat (a)): 46 seeded rows (`supabase/seeds/01_permissions.sql:7`) + 2 net-new by migration (`create_group_conversations` `20260719230500:196`, `rest_group` `20260803190000:111`). The carried "44" is retired.
3. **Snapshot-now is already the physics** (RB-5 confirms, doesn't introduce): `create_engagement_group` (LATEST `20260704204343:24`) copies `rt.name/description/id` into `group_roles` (`:72-80`); grants materialise via the `copy_template_permissions` trigger (rebuild `:1347` → `:819`); instances carry `created_from_role_template_id` (SET NULL). Template edits never reach existing `group_roles` by construction — this spec changes **nothing** in that path.
4. **The template-less instantiation path copies EVERY role template** (`create_engagement_group` selects via `group_template_roles` for a chosen group template *or every role template when none chosen*). Consequence: any new `role_templates` row — including a clone — rides every future template-less instantiation, and appears in `get_role_templates()` (the member-facing group-creation options). The editor must say so; the contracts must pin it.
5. **The composition is all-seeds, Member-default** (live-verified, discharging caveat (d)): all 4 group templates reference exactly the 4 seeded role templates (`is_system=true`, `02_role_templates.sql:9`), Member the default role everywhere. Group-template composition references only immutable seeds — load-bearing for the guard's reachability analysis below.
6. **The DeusEx auto-grant is the key integrity constraint:** `auto_grant_permission_to_deusex()` (rebuild `:846`, AFTER INSERT on `permissions`) auto-grants any new catalogue row to the DeusEx role. RB-4's atoms-code-owned ruling keeps the catalogue read-only to the editor, so this trigger continues to fire **only via migrations** — stated in No-gos.
7. **The B-RBAC "exact-count pins" barely exist** (dossier correction): `role-permission-contracts.test.ts:148,196` already derives the count at runtime ("catalogue equals manifest"-shaped); `role-templates-contract.test.ts:59,64,76` pins shape/order only. One brittle spot: `communication/conversation-contracts.test.ts:530` filters two template rows by seed name — safe under seed immutability, recorded for the sweep.
8. **The walk riders' substrate facts:** WA-2 — `admin_get_audit_log` (sole def `20260802120000:365-411`) already LEFT JOINs groups for `actor_display_name` but echoes `target` as raw TEXT; the amendment is the symmetric joins, server-side, in the same `jsonb_build_object`. WA-3 — `admin_hard_delete_user` (`20260801190000`) has no consent handling; every consented member's personal-group delete hits `consent_records_subject_group_id_fkey` RESTRICT → 23503 → a generic 500 — the last-resort tool refuses on precisely the members it exists for, and no test tier ever covered the consented case. WA-4 — `admin_force_logout` (`20260801190000:399`) emits nothing; the pattern to copy is `revoke_own_session`'s non-fatal `realtime.send` (`20260703154102:130-135`), and the Hub guard acts only on a matching `session_id` — so the amendment must SELECT the target's session ids **before** deleting and emit **one hint per session id, per target** (`ds5_emit_hint` is not reused — trigger-path-only per its comment `20260720153000:114`).

### Why Platform Core (PC-4)

The `admin_* → PC-4` pin binds the whole family (the standing default): platform-admin-gated contracts over PC-3-owned substrate, the ADM-B/C/D precedent (`admin_reassign_group_stewardship` already composes PC-3 fabric from PC-4). This is a core-to-core composition — no Domain modelling question exists for the admin plane's editing of Core-owned building blocks, and no Domain service could own it without inverting the one-way rule. The new tables extend the PC-3 template substrate and register PC-3 in the ownership manifest, like their five siblings; the functions register PC-4.

## Solution sketch

One migration, one schema gate (held with red evidence + apply commands for **named** approval — the standing rule; ADR-U043 pass at the gate; the post-apply E2E-journey verification set and the sibling-assertion sweep both apply).

### Part 1 — the versioning substrate (new tables, RLS from birth, manifest-registered PC-3)

- **`role_template_versions`** — `id`, `role_template_id` FK CASCADE, `version_number` (UNIQUE per template), `name`, `description`, `created_by` (the actor's personal group id — the four-hop chain, never `auth.uid()` raw), `created_at`. Append-only by construction: SELECT-only RLS to authenticated (matching the five siblings), no UPDATE/DELETE path in any contract — versions are the ledger.
- **`role_template_version_permissions`** — `role_template_version_id` FK CASCADE, `permission_id` FK, UNIQUE pair.
- **`role_templates` gains `default_version_id`** FK (nullable, RESTRICT — a pointer's target can't vanish; nothing deletes versions anyway).
- **`permissions` gains `is_protected` boolean NOT NULL DEFAULT false** — the protected-permission set, code-owned like the catalogue itself (seed/migration-set only; the editor renders it, never writes it; the auto-grant trigger is untouched). Membership criteria: permissions whose loss leaves a future group without a functioning governance plane — the role-assignment/membership-management family plus `rest_group`; the exact list is settled at build against the live catalogue and enumerated in the migration header.
- **Backfill in the same migration:** each seeded template gets version 1 = its current live state, default pointer set — history starts honest, and `is_system` templates stay pointed at version 1 forever.

### Part 2 — the contract family (all `admin_*` → PC-4; SECURITY DEFINER, `SET search_path = ''`; `is_platform_admin()` gate refusing `42501` `'platform administrator required'`; REVOKE PUBLIC/anon, EXECUTE authenticated + service_role; every mutation writes `admin_audit_log`)

- **`admin_get_role_templates()`** → `{templates: [{id, name, description, is_system, default_version_number, version_count, group_template_refs: [names], instantiated_role_count}], catalog: [{name, category, description, is_protected}], generated_at}`. One read serving the editor's list, the read-only catalogue browser, and the blast-radius facts (`instantiated_role_count` = existing `group_roles` born from this template — the "N existing group roles keep their snapshot" line; `group_template_refs` = which compositions include it).
- **`admin_get_role_template_detail(p_template_id uuid)`** → `{template: {…}, versions: [{id, version_number, name, description, created_at, created_by_display_name, permission_names: […], is_default}], generated_at}`; unknown id refuses `P0002`.
- **`admin_clone_role_template(p_source_id uuid, p_name text)`** — creates a new template (`is_system = false`), version 1 copying the source's **current live** set, default pointer set, live rows (`role_templates` + `role_template_permissions`) materialised. Duplicate name refuses typed `22023` (the UNIQUE surfaced as a refusal, not a 500). Audit `role_template.clone` with `{source_id, source_name, new_id, new_name, permission_names}`.
- **`admin_create_role_template_version(p_template_id uuid, p_name text, p_description text, p_permission_names text[])`** — appends version N+1 as an unapplied draft (no draft-status machinery — a draft *is* an unapplied version). Refuses typed `P0001` on `is_system` (seeds immutable — clone-don't-edit); unknown permission name refuses `22023` (names validated against the catalogue, resolved to ids server-side). Audit `role_template.version_create` with the draft's diff vs the current default (`{added, removed, name_from, name_to}`).
- **`admin_set_role_template_default_version(p_template_id uuid, p_version_id uuid)`** — the apply; **rollback = the same door pointed at an older version.** Repoints `default_version_id` and materialises the version's name/description onto `role_templates` and its set onto `role_template_permissions` (the live rows the untouched instantiation physics read) in one function body. Refuses typed on `is_system`, on a version not belonging to the template (`22023`), and on the protected-set guard (below). Audit `role_template.apply` with `{from_version, to_version, added, removed, name_from, name_to}` — RB-4's old-set → new-set requirement, on the state change itself.
- **The protected-set guard (the last-DeusEx instinct, one level up):** an apply refuses `P0001` — naming the permission and where it's lost — if it would leave a protected permission with **no holder on some instantiation path**: for any group template, no member role template's live default grants it; or, on the template-less path, no role template at all grants it. **Reachability stated honestly:** with today's all-seeds composition and seed immutability the refusal is structurally unreachable — the guard is the invariant's contract-level home so Eid's re-opens (group-template editing, by-reference propagation) inherit it, not a Ferd-reachable ceremony. Its red-first cell builds a synthetic composition under the service role to make the guard fire for real.
- **No delete doors.** No template delete, no version delete — absence is the contract, pinned by the direct-caller story.

### Part 3 — the walk riders (three re-issues, same gate)

- **WA-2 — `admin_get_audit_log` re-issue:** resolve targets the way actors already resolve — symmetric LEFT JOINs in the same `jsonb_build_object`: a user-id target gains `target_display_name` + `target_email`; a group-id target gains `target_display_name` (the group name); literals and unresolvable/erased targets pass through with null resolution; the raw `target` stays in every row (the audit record itself is untouched — append-only; resolution is read-time display shaping). The `'Unauthorized'` message drift recorded at PC024 is **settled here by the re-issue** — the family message `'platform administrator required'` lands with it (its own tiny decision, arrived).
- **WA-3 — `admin_hard_delete_user` re-issue:** the consent-erasure leg — purge the subject's `consent_records` under the sanctioned erasure GUC (the `app.consent_erasure_in_progress`-class mechanism the member-initiated erasure legs use; exact GUC name verified cumulative-forward at build) **before** the personal-group cascade, so the FK RESTRICT never fires. Hard delete *is* the full-erasure tool; the audit-before-delete row, DS-5 reattribution, DS-3 cleanup, and cascade order stay verbatim. The gate suite gains **the consented-member cell the family never had** (cross-ref: TASK-E2E-02 — the same FK silently leaked 1,289 E2E fixtures).
- **WA-4 — `admin_force_logout` re-issue:** per target — SELECT the target's session ids from `auth.sessions` **before** the deletes, then after them emit one `session_revoked` hint **per session id** on `account:<target_auth_uid>:sessions` via `PERFORM realtime.send(jsonb_build_object('session_id', …), 'session_revoked', topic, TRUE)` inside the non-fatal `BEGIN…EXCEPTION WHEN OTHERS THEN NULL` wrap — `revoke_own_session`'s pattern verbatim (`20260703154102:130-135`); `ds5_emit_hint` deliberately not reused (trigger-path-only per its comment). Audit rows and sweep semantics unchanged — force sign-out stays a sweep, not a lock; Suspend is the lock.

**Sibling-assertion sweep (mandatory, the three-times-bitten rule):** every assertion naming `admin_get_audit_log` (the PC022 gate cells + `lib/admin/audit.ts` + the H037 audit browser suite), `admin_hard_delete_user` (the ADM-C family cells), `admin_force_logout` (ADM-C + the H039 bulk suite), `get_role_templates` (`role-templates-contract.test.ts` shape pins; the `conversation-contracts.test.ts:530` name filter), and the five template tables — enumerated in the migration header, each marked adapted or deliberately left.

## Appetite

Small-to-medium — one migration, one gate; two new tables + two column adds + five contracts + three re-issues, zero changes to instantiation physics. The care points are the materialise-on-apply body, the guard predicate, and the three sibling sweeps — not volume.

## Rabbit holes

- **Don't touch instantiation.** Zero changes to `create_engagement_group` or `copy_template_permissions` — apply materialises onto the live rows those already read. If the build finds itself editing either, the shape is wrong.
- **Don't version group templates or composition.** `group_templates` / `group_template_roles` editing is Eid surface; the guard reads composition, never writes it.
- **Don't build propagation or a migrate-existing-groups tool.** RB-5's dated record (No-gos) is the whole answer.
- **Don't grow catalogue CRUD.** Atoms are code-owned; the editor renders `is_protected` and categories, writes neither.
- **Don't build a server-side diff engine.** The preview is Hub presentation over the detail payload; the server's diff lives in audit metadata, computed inline at mutation time.
- **Don't invent draft-status machinery.** A draft is an unapplied version; the ledger needs no state column.

## No-gos

No catalogue CRUD (additions stay migrations — the DeusEx auto-grant continues to fire only there). No group-template editing. No template or version deletion. No by-reference propagation — **the RB-5 dated record: snapshot-now settled 2026-08-03, ratified here 2026-08-04; re-openable at Eid when a real fleet exists.** No changes to `create_engagement_group` / `copy_template_permissions` / the member-facing role fabric. No new realtime channels (WA-4 emits on the existing ADR-U039 session channel). No Mist-plane involvement.

## Stories

### STORY-1: The ledger starts honest
- Given the applied migration, when `admin_get_role_templates()` is called, then the 4 seeded templates return with `is_system = true`, `version_count = 1`, `default_version_number = 1` (the backfilled snapshot of their live state), the catalog carries all 48 live rows with `category` and `is_protected`, blast-radius facts are correct against live data, and `generated_at` rides the payload; `admin_get_role_template_detail` shows version 1 as default with the seed's exact permission names.

### STORY-2: Clone, honestly announced
- Given a seeded template, when `admin_clone_role_template` runs with a fresh name, then a new `is_system = false` template exists with version 1 = the source's live set, live rows materialised, and an audit row carrying the full copied set; a duplicate name refuses `22023` typed.
- Given the clone exists, when a group is created **without** a chosen group template, then the clone's role is copied into the new group (the every-template path — the consequence the ceremony names); and the clone appears in `get_role_templates()` (the member-facing options) — both pinned.

### STORY-3: Versions append; seeds refuse
- Given a clone, when `admin_create_role_template_version` runs with a changed set, then version 2 exists as an unapplied draft (live rows unchanged, default pointer unchanged) with the draft diff in its audit row; an unknown permission name refuses `22023`; the same call against any `is_system` template refuses `P0001` typed.

### STORY-4: Apply is a repoint; rollback is the same door
- Given a clone with a draft version, when `admin_set_role_template_default_version` applies it, then the pointer moves, the live rows carry the new name/description/set, a group instantiated afterwards copies the **new** set, every `group_roles` row instantiated **before** keeps its snapshot verbatim (the RB-5 physics, pinned), and the audit row carries `{from_version, to_version, added, removed}`; applying the older version afterwards restores the prior live state exactly — rollback = repoint, same audit shape reversed.

### STORY-5: The guard fires where the topology allows it
- Given a synthetic composition (service-role fixture: a group template referencing only a clone, or a catalogue where a protected permission's sole holder is the template under edit), when an apply would strip the last holder of a protected permission on any instantiation path, then `P0001` refuses typed, naming the permission and the path; given the shipped all-seeds topology, the guard is structurally unreachable (seeds immutable) — recorded, not chased.

### STORY-6: The riders keep their families' laws
- Given audit rows whose `target` is a user id, a group id, and a literal, when `admin_get_audit_log` returns them, then the user id resolves to `target_display_name` + `target_email`, the group id to its name, the literal passes through with null resolution, the raw `target` stays in every row, keyset/cap/filter semantics are unchanged, and the gate message is the family's `'platform administrator required'`.
- Given a member with consent records (every credentialed signup), when `admin_hard_delete_user` runs, then the full cascade completes — consent purge under the sanctioned GUC, audit-before-delete, DS-5 reattribution, DS-3 cleanup, personal-group cascade, `users` + `auth.users` rows gone — with no 23503 anywhere; the consented-member cell is red-first at head.
- Given a target with N live sessions, when `admin_force_logout` runs, then N `session_revoked` hints emit — one per session id on the target's session channel — the deletes and per-member audit rows are unchanged, and a hint failure never fails the sweep (non-fatal wrap pinned).

### STORY-7: The direct door stays sealed
- Given a direct PostgREST caller (the ADR-U038 adversarial path, anonymous-session Mist included), then the five template tables and the two new tables remain write-sealed (SELECT-only), every new contract refuses non-admins `42501` and anon EXECUTE outright, no delete door exists for templates or versions, and `is_protected` is not writable through any client path.

## Decomposition verification walk — payload ↔ consumer ([FEAT-H040](../../../products/hub/features/FEAT-H040-role-template-editor-and-audit-target-honesty.md))

| Key | FEAT-H040 consumer |
|---|---|
| `templates[]` (id, name, description, is_system, default_version_number, version_count, group_template_refs, instantiated_role_count) | the `/admin/roles` list rows + seeded badge + the blast-radius line in the apply preview |
| `catalog[]` (name, category, description, is_protected) | the read-only catalogue browser + the draft editor's checkbox fabric + protected badges |
| `generated_at` | the As-of line beside Refresh (both reads) |
| `versions[]` (version_number, name, description, created_at, created_by_display_name, permission_names, is_default) | the version history + the diff preview's before/after sets + rollback targets |
| `p_source_id`/`p_name` ← | the clone ceremony |
| `p_template_id`/`p_name`/`p_description`/`p_permission_names` ← | the draft-save ceremony (checkbox set serialised by name) |
| `p_template_id`/`p_version_id` ← | the apply and rollback ceremonies |
| `target_display_name` / `target_email` / raw `target` (audit re-issue) | the audit browser's human target line; raw uuid moves to the metadata details |
| `session_revoked` per-session hints | no new Hub consumer — the existing app-wide session-guard tenant (verified in H040 STORY-6) |

Every key has a consumer; every ceremony input traces to a parameter. The H040 surface renders from no other payloads than these plus the already-walked H034/H037 reads it embeds in.

## Platform dependencies

PC-3 substrate (the five template tables + instantiation physics, untouched), PC-2 (`users` for WA-2 email resolution; the four-hop actor chain), PC-4 own (`is_platform_admin`, `admin_audit_log`, the manifest), `auth.sessions` (WA-4 read-before-delete), `realtime.send` on the ADR-U039 session channel (existing, no new channel).

## Cross-product impact

Hub consumes via FEAT-H040 (BFF-wrapped); Gimbal inherits the contracts. Member-facing surfaces change **behaviourally, not in code**: a clone appears in `get_role_templates()` (group-creation options) and rides template-less instantiation — deliberate, pinned in STORY-2, named in the Hub ceremony copy.

## Vertical impact

- **Privacy/GDPR:** WA-3 completes the erasure tool — the right-to-erasure path now reaches consented members (its whole purpose); WA-2 surfaces target emails behind the same `42501` wall admins already see them behind; `created_by` on versions is admin-action attribution, same class as audit rows; no new member-personal-data store.
- **Notifications:** none — template edits shape future groups only and notify no one; sanction communication stays the DB-4 Eid deferral.
- **Administration:** ADM-17's platform half realized within RB-4's skeleton; every mutation audited with old-set → new-set diffs; seeds stay the known-good rollback anchor.
- **Observability:** audit rows carry diffs, not just events; every refusal typed; WA-4's hint is non-fatal-wrapped (hint failure never fails the sweep — the `revoke_own_session` law); reads stay unaudited (the shipped posture).
- **Transactions:** none.
- **Extensibility:** versions are additive substrate a future by-reference mode can build on (the RB-5 re-open); `is_protected` is an open column, not a sealed list; the audit action namespace extends the dot vocabulary; no enums, no sealed sets; the catalogue stays open-by-migration with the auto-grant intact.

## Performance budget

N/A (no surface). All reads are small (4-ish templates, 48 catalogue rows, version lists); FEAT-H040 carries the page budgets. ADR-U043 measurement pass at the gate regardless (standing; the Amendment-2 dual signal applies).
