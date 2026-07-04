# FEAT-PC011: Group role & permission contracts — read the role fabric, define roles, assign them without escalation

---
id: FEAT-PC011
title: Group role & permission contracts — role-inventory read with capability flags, template/custom role definition, anti-escalation role assignment/removal, and the effective-permissions read (Groups Cycle G-B platform half)
owner: platform/core/organisation
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

Cycle G-A gave a group its container and its bootstrap Steward. The group cannot yet grow a role structure: Hub §L3 **GRP-6** (apply foundational role templates and define custom roles), **GRP-7** (manage member roles — assign / remove / change), and **GRP-8** (render the "act as" context selector and effective permissions) all name **PC-3** as the platform dependency, and no member-facing contracts exist over the role substrate.

The substrate itself is strong and legacy-proven (verified on dev, 2026-07-04): `group_roles` / `user_group_roles` / `group_role_permissions` carry a **substantively correct RLS surface** (`manage_roles`-gated definition, `assign_roles`-gated assignment through the existing **`can_assign_role()` anti-escalation primitive** — you may only assign a role that grants nothing you yourself lack; template-derived instances protected from deletion; `prevent_last_leader_removal` guarding the last Steward), and **`get_user_permissions(acting, context)`** already computes effective permissions (system-group memberships contributing globally — the DeusEx path). What's missing is the contract layer: composed, jsonb-shaped, capability-flagged operations a Surface can consume API-first — and the same ADR-U038 posture G-A established (the contract is canonical; RLS stays as defense-in-depth).

### Why Platform Core (Organisation), not a Domain Service

Roles and permission resolution are the second and third layers of PC-3's constitutive three-layer model (ADR-U007); `has_permission()` is what every Domain Service calls. Role definition and assignment mutate the tables that model reads — modelling them anywhere else inverts the one-way Domain→Core rule. Cannot be modelled in Domain or via Extensions.

## Solution sketch

Contracts over **existing** substrate (**no new table, no new policy model**), PostgREST RPC per PC-3 §3, actor via `get_current_personal_group_id()` (P-O1). All writes FIM-only + active-account-only (the G-A posture); all group resolution uses the G-A visibility rule (member-or-public+active, else **P0002** — no leak).

- **`get_group_roles(p_group_id) → jsonb`** (GRP-6/7 read) — the group's role fabric for a permitted viewer (same visibility as `get_group_detail`): per role instance `id, name, description, created_from_role_template_id, holder_count, permissions[]` (granted keys); a **viewer block** (`can_manage_roles`, `can_assign_roles`, `can_remove_roles` — capability flags via `has_permission()`); and `available_permissions[]` (the catalog: name + category) so a Surface renders a permission picker without a second contract.
- **`create_group_role(p_group_id, p_name, p_description ⇒ null, p_role_template_id ⇒ null, p_permissions ⇒ null::text[]) → uuid`** (GRP-6) — `manage_roles`-gated. From a template: instance + grants via the existing `copy_template_permissions` trigger (`p_permissions` must be null). Custom: named role + explicit grants validated against the catalog; **definition-time anti-escalation** — the author cannot grant a permission they do not themselves hold in the group (mirrors the existing `grp_insert` RLS posture; assignment-time `can_assign_role` remains the second wall). Duplicate role name within the group refused (`23505`-mapped or explicit check).
- **`update_group_role(p_group_role_id, p_name ⇒ null, p_description ⇒ null) → jsonb`** + **`set_group_role_permission(p_group_role_id, p_permission_name, p_granted) → jsonb`** (GRP-6 "define") — `manage_roles`-gated; per-group customisation applies to template-derived instances too (the three-layer model's point — Open Q2); the same definition-time anti-escalation on grants; returns the updated role entry.
- **`delete_group_role(p_group_role_id)`** — custom roles only (template-derived refused — the RLS `created_from_role_template_id IS NULL` rule carried into the contract), `manage_roles`-gated, and **refused while any member holds it** (default per Open Q3 — unbinding first is explicit, never a silent cascade).
- **`assign_member_role(p_group_id, p_member_group_id, p_group_role_id)`** / **`remove_member_role(p_group_id, p_member_group_id, p_group_role_id)`** (GRP-7) — `assign_roles` / `remove_roles`-gated; assignment runs through **`can_assign_role()`** (anti-escalation); the target must be an **active member**; removal rides the existing `prevent_last_leader_removal` / `prevent_last_deusex_role_removal` invariants (their refusals surface as errors, never silent); the existing `notify_role_assigned` / `notify_role_removed` triggers keep writing the durable notification rows (V3's substrate today; push rides A-NTF later).
- **GRP-8 needs no new function** — `get_user_permissions(p_acting_group_id, p_context_group_id)` is the existing, published effective-permissions read (PC-3 §3 names it as the canonical realized RPC example). The Surface calls it with the actor's personal group. The **"act as" selector's additional contexts (group-as-actor wielding)** are deliberately out of scope: who within group A may wield A's agency when A is a member of B is unresolved governance (MEM-10 / G-29 territory) — **Open Q1** routes it to Cycle G-F.
- **`get_group_detail` additive extension** — each `members[]` entry gains `member_group_id` and `roles[]` (names), so the member list can carry role chips and be the assignment surface. Additive jsonb keys only (FEAT-PC010's contract unchanged in signature; cross-feature impact recorded there at build).
- **Hygiene** — `TRUNCATE` revoked from client roles on the three role tables (the G-A rule applied; bypasses RLS). No other narrowing: unlike `groups`, the existing write policies here are substantively correct — they stay as defense-in-depth beneath the contracts.

## Appetite

Medium-plus — one migration (six functions + one additive payload extension + grants + TRUNCATE revokes; **no new table**), integration tests for the definition/assignment matrices, both anti-escalation walls, the invariants surfacing, and the adversarial direct paths. If it swells, `update_group_role` rename/description editing is the first cut (additive later); the assignment pair is the core.

## Rabbit holes

- **Don't redesign the permission model.** Three layers exist and are Conformant (ADR-U007); the contracts compose existing primitives (`has_permission`, `can_assign_role`, `get_user_permissions`, the triggers). Any "while we're here" model change is out.
- **Don't resolve group-as-actor wielding.** GRP-8's selector renders the current actor's contexts; the governance question of acting *as an engagement group* is G-F/G-29 (Open Q1). No speculative contract surface for it.
- **Don't build role ordering/hierarchy.** Roles are flat sets of grants; "senior to" relationships don't exist in the model and don't enter here.
- **Don't touch template management.** `role_templates` / `group_templates` are seed-defined platform vocabulary (`manage_role_templates` is platform-admin scope, A-ADM); GRP-6 instantiates and customises *within a group* only.
- **Mind the trigger fabric.** `copy_template_permissions` auto-grants on template-derived instance creation (never double-copy — the G-A lesson); `notify_role_assigned`/`notify_role_removed` fire on binding changes (durable rows — expected, not duplicated by the contracts); the last-leader/last-DeusEx triggers raise plain exceptions — map them honestly, don't pre-check-and-hide.

## No-gos

- No membership mutation beyond role bindings (pause/activate/remove members = MEM-4/5, Cycle G-D; invitations = G-C).
- No role assignment to non-active members (invited members get the default role via the existing accept trigger — G-C's flow).
- No template CRUD, no permission-catalog mutation (seed/migration-only, per the registry's growth discipline).
- No group-as-actor acting contexts (Open Q1 → G-F); no cross-group role operations.
- No notification *push* (durable rows via existing triggers only; A-NTF owns delivery under ADR-U039).
- No new table, no RLS-model rewrite, no policy consolidation (that's perf P3b, deliberately separate).

## Stories

### STORY-1: Read the role fabric (GRP-6/7 read)
As the platform, I want a permitted viewer to receive the group's roles, their grants, and the viewer's own management capabilities as one payload, so a Surface renders the whole roles picture API-first.

**Acceptance criteria:**
- Given an active member, when they call `get_group_roles(group)`, then they receive every role instance with its name, template linkage, holder count, and granted permission names, plus `available_permissions` (the catalog) and their own `can_manage_roles` / `can_assign_roles` / `can_remove_roles` flags.
- Given a non-member on a private group — or a nonexistent id — when they call it, then `P0002`, indistinguishably.
- Given a Mist, when they call it, then `42501`.

### STORY-2: Instantiate a template, or define a custom role (GRP-6)
As a Steward (a `manage_roles` holder), I want to add a role from a foundational template or define my own, so the group's structure fits its life.

**Acceptance criteria:**
- Given a `manage_roles` holder, when they call `create_group_role(group, 'Reading Guide', p_role_template_id ⇒ <Guide template>)`, then the instance exists with the template's grants (trigger-copied) and appears in the fabric read.
- Given the same caller, when they create a **custom** role with an explicit permission list, then the role exists with exactly those grants — and any permission name not in the catalog fails the whole call.
- Given a caller who lacks one of the requested grants themselves, when they attempt to create (or extend) a custom role carrying it, then the call raises `42501` — **definition-time anti-escalation**.
- Given a member without `manage_roles`, when they call any definition contract, then `42501`; given a duplicate role name in the group, then the create is refused.

### STORY-3: Tend a role's definition (GRP-6 "define", continued)
As a `manage_roles` holder, I want to rename/describe a role and flip individual grants — including on template-derived instances — so per-group customisation is real.

**Acceptance criteria:**
- Given a role instance, when the holder calls `set_group_role_permission(role, 'invite_members', true)`, then the grant exists and the returned entry reflects it; when they revoke a grant, then it is gone — in both cases subject to definition-time anti-escalation.
- Given a **custom** role held by nobody, when `delete_group_role` is called by a `manage_roles` holder, then it is deleted; given it is **held**, then the call is refused (unbind first — explicit, never cascade); given a **template-derived** instance, then deletion is refused regardless.
- Given `update_group_role` with only a new name, then only the name changes (partial update, the house pattern).

### STORY-4: Assign and remove roles without escalation (GRP-7)
As a Steward, I want to give and take member roles, so participation is shaped — and the platform must make privilege escalation structurally impossible.

**Acceptance criteria:**
- Given an `assign_roles` holder and an active member, when they call `assign_member_role`, then the binding exists (and the substrate's durable role-assigned notification row is written by the existing trigger).
- Given a caller whose own permissions do not cover everything the target role grants, when they attempt the assignment, then it is refused (`can_assign_role` — assignment-time anti-escalation).
- Given a target who is not an active member of the group, when assignment is attempted, then it is refused; given a `remove_roles` holder removing a binding, then it is removed — unless it is the **last Steward-equivalent binding**, where the existing invariant refuses with a surfaced error.
- Given a member without the respective permission, when they call either contract, then `42501`; foreign/ghost groups and roles follow the `P0002` no-leak rule.

### STORY-5: What I can do here (GRP-8)
As a FIM, I want my effective permissions in a group context readable as data, so the Surface can show me what I can do — and gate nothing client-side.

**Acceptance criteria:**
- Given an active member, when the Surface calls the existing `get_user_permissions(personal_group, group)`, then it receives the caller's effective permission names — role-derived, deduplicated, with system-group grants contributing per the substrate's existing global rule.
- Given the member list read (`get_group_detail`), when it returns, then each member entry additively carries `member_group_id` and `roles[]` so the assignment surface and role chips need no extra round-trips.
- Given a non-member calling `get_user_permissions` for a foreign group, then the result is empty — never an error that distinguishes private from absent.

### STORY-6: No path around the contracts (ADR-U038)
As the platform, I want the direct PostgREST surface on the role tables verified against the contracts, so the two layers agree.

**Acceptance criteria:**
- Given the adversarial integration suite, when it exercises direct INSERT/UPDATE/DELETE on `group_roles`, `user_group_roles`, and `group_role_permissions` as a non-privileged member and as a Mist, then every refusal the contracts make is also made by the substrate (the existing RLS — verified, not assumed).
- Given `TRUNCATE` on any of the three tables from a client role, then the privilege does not exist.
- Given the `grp_insert` policy's definition-time check (truncated in the audit read), when the gate reviews the migration, then its exact predicate is verified and recorded (Open Q4).

## Platform dependencies

- **PC-3 substrate (existing, Conformant):** the three role tables + RLS, `has_permission()`, `can_assign_role()`, `get_user_permissions()`, `get_group_id_for_role()`, the `copy_template_permissions` / `validate_user_group_role` / `prevent_last_leader_removal` / `prevent_last_deusex_role_removal` / notification triggers, the 44-key catalog, the four foundational role templates.
- **FEAT-PC010:** the G-A visibility rule + `get_group_detail` (extended additively here).
- **Schema gate.** New SECURITY DEFINER functions + the additive payload extension + TRUNCATE revokes + grants → task status `review`, explicit nod; the gate asks the direct-caller question per GP3 and verifies Open Q4.

## Cross-product impact

Consumed by **Hub [FEAT-H014](../../../products/hub/features/FEAT-H014-group-roles-and-permissions.md)** (Cycle G-B Surface half); the Gimbal inherits the same contracts and capability flags. `get_group_detail`'s extension is additive — FEAT-H013's rendering is unaffected. The anti-escalation walls become the precedent every later assignment-shaped contract (journey roles, moderation) should cite.

## Stability posture (Platform Core §7)

Additive: six new functions, one additive jsonb extension, TRUNCATE revokes. No existing signature changes; no policy changes (the role tables' RLS is already substantively correct and stays as defense-in-depth). Each SECURITY DEFINER function documents its elevation; bodies minimal per the PG17 ceiling.

## Vertical impact

- **Privacy/GDPR:** role bindings are FIM data — reads are membership-scoped with the no-leak rule; member entries carry display identity + opaque group ids only. No new personal data.
- **Notifications:** role assignment/removal already writes durable notification rows via existing triggers (GRP-7's V3, satisfied at the substrate); no push here — A-NTF delivers later under ADR-U039.
- **Administration:** definition and assignment are permission-gated with two anti-escalation walls; the last-Steward and last-DeusEx invariants are load-bearing and surfaced, never bypassed; platform-admin paths (`ugr_*_admin` policies) untouched.
- **Observability:** refusals are SQLSTATEs; role changes leave durable rows (bindings + notification rows + `assigned_by_group_id` provenance); the consuming routes emit id-only telemetry (FEAT-H014).
- **Transactions:** None.
- **Extensibility:** custom roles are the extensibility mechanism working as designed (no sealed role set — ADR-U007/U018); the catalog rides the payload so new permissions appear without Surface changes; capability flags extend additively.

## Open spec questions

1. **Group-as-actor contexts for the "act as" selector.** Who may wield an engagement group's agency (when group A is a member of group B) is unresolved governance — routed to **Cycle G-F / G-29**; v1 renders the personal-group context only (FEAT-H014 carries the honest UI). Not decided here.
2. **Template-derived instances' grant editing.** Default: editable (per-group customisation is the three-layer model's point), `manage_roles`-gated + anti-escalation. Confirm at the gate.
3. **`delete_group_role` while held.** Default: refuse (explicit unbind first). Confirm at the gate.
4. **The `grp_insert` policy's second predicate** (truncated in the audit read) — verify the exact existing definition-time check at build; the contract's check must be at least as strict.
