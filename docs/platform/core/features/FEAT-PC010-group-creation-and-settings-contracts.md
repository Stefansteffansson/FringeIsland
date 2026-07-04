# FEAT-PC010: Group creation & settings contracts — create an engagement group atomically stewarded, read it honestly, and steward its settings

---
id: FEAT-PC010
title: Group creation & settings contracts — atomic create-engagement-group bootstrap, the group-detail read, and permission-gated settings/visibility updates, plus the system-group seeding repair (first PC-3 feature spec)
owner: platform/core/organisation
consumers: [hub]
wave: ferd
maturity: 5-in-cycle
requires-equipment: none
---

## Problem

The Groups area (A-GRP) opens with group CRUD & rendering (Cycle G-A of the [Groups completion plan](../../../planning/hub-v2/phase-3-groups-completion-plan.md)): Hub §L3 GRP-1 (create an engagement group, creator becomes Steward), GRP-2 (edit settings), GRP-3 (visibility + member-list visibility independently), GRP-5 (display lifecycle status), and the completion of GRP-4 (group **detail** view — the list read already exists). Every one of those rows names **PC-3** as the platform dependency — and PC-3 has **zero feature specs** (§L4 zero-state): its Conformant substrate (`groups`, `group_memberships`, the three-layer permission model, `has_permission()`, the invariant triggers) carries forward from the legacy MVP, but the **member-facing contracts** over that substrate do not exist. The legacy Hub created groups by direct multi-table INSERTs from the browser — exactly the v1 sin the rebuild exists to end (ADR-U009/U030).

Two substrate debts ride along (substrate-audit findings): the `FringeIsland Members` and `DeusEx` system groups are **not seeded by any active migration** (dev-DB carried state only — a fresh DB cannot boot the platform), and seed files carry vestigial pre-Mist vocabulary flagged for rename.

### Why Platform Core (Organisation), not a Domain Service

Groups, memberships, roles, and permission resolution are PC-3's constitutive substrate (ADR-U006 Universal Group Pattern, ADR-U007 three-layer permissions): every Domain Service FKs to `public.groups` and calls `has_permission()`. Modelling group creation or settings in any Domain Service would invert the one-way Domain→Core dependency (a DS defining the thing Core and every sibling DS depend on), and the creation bootstrap requires writes across four PC-3 tables under one transaction with SECURITY DEFINER elevation — precisely the privilege Core exists to bound. It cannot be modelled in Domain or via Extensions.

## Solution sketch

Three own-actor `SECURITY DEFINER` contracts over **existing** substrate (**no new table**), consumed as PostgREST RPC per PC-3 §3 (the canonical HTTP surface), plus one seeding-repair story. Actor resolution uses the four-hop personal-group primitive `get_current_personal_group_id()` (P-O1 — the house actor; the PC008/PC009 `auth.uid()`-direct override is *not* used here: these are social-fabric operations, not protective data-rights ones).

- **`create_engagement_group(p_name, p_description ⇒ null, p_label ⇒ null, p_is_public ⇒ false, p_show_member_list ⇒ true, p_group_template_id ⇒ null) → uuid`** — FIM-only (Mist → 42501; GRP-1 depends on IDN-3), **active-account-only** (a `suspended` FIM cannot open new social footprint — decision-default, confirm at the schema gate; state read via the PC004 substrate). Atomic bootstrap in one transaction: the `groups` row (`group_type = 'engagement'`, `created_by_group_id` = actor personal group, default `status`), role instances materialised for the group (from `p_group_template_id`'s `group_template_roles` when given, else the build-confirmed default set — at minimum a Steward role from the Steward template), the creator's **active** membership (`group_memberships.member_group_id` = actor personal group), and the creator's Steward binding (`user_group_roles`). The composed invariant — *no engagement group exists without an active, Steward-bound creator membership* — is documented here per ADR-U016 and holds from birth (`group_has_leader` / `prevent_last_leader_removal` are never violated at any point in the group's life).
- **`get_group_detail(p_group_id) → jsonb`** — FIM-only. Visible to the caller iff they hold an **active membership** or the group `is_public`; anything else raises **`P0002`** (no existence leak — private groups are indistinguishable from absent ones, the house pattern). Returns the group's own fields (`id, name, description, label, status, is_public, show_member_list, created_at`), `member_count` (active), a **viewer block** (`is_member`, `joined_at`, and **`can_manage_settings`** — computed via `has_permission()` so the Surface branches on capability flags, never on roles), and a **`members` array** (per-member: display name resolved from the member's personal-group name — the display-identity substrate, never `full_name` — and `joined_at`), included iff the viewer is an active member **or** (`is_public` **and** `show_member_list`). Default semantic for the member-list toggle stated here; verified against the legacy oracle at build (Open Q3). **No DS-3 enrolment summary** — that slot fills at the Journeys area (plan seam).
- **`update_group_settings(p_group_id, …) → jsonb`** — partial-update semantics over `name, description, label, is_public, show_member_list` (mechanics per the FEAT-PC003 own-profile precedent), gated inside the function by `has_permission(actor, p_group_id, <settings key from the 44-key catalog — Open Q2>)`; refusals: `P0002` for not-visible/absent (same no-leak rule as the read), `42501` for visible-but-not-permitted; `status` and `group_type` are **not** updatable here (lifecycle transitions are GRP-9/MEM-8/A-ADM territory, later cycles). Returns the updated detail. Suspended actors refused as in creation.
- **Direct-caller hardening (ADR-U038).** Today `public.groups` carries broad `authenticated` RLS policies (`groups_insert`, `groups_update`, …) — the legacy client-write surface. With the RPCs as the canonical path, the migration **narrows the direct writes**: a direct PostgREST caller must not be able to create an un-bootstrapped group row (bypassing the Steward invariant) or flip columns the contract refuses (`status`, `group_type`, `created_by_group_id`) — column privileges + policy tightening, exact shape decided at the schema-review gate (Open Q4). Reads stay RLS-scoped as today.
- **Seeding repair (fresh-DB deployability).** An idempotent migration seeds `FringeIsland Members` + `DeusEx` (no-op where rows exist, as on dev), closing the substrate-audit C3-1 concern for PC-3's slice; the flagged vestigial pre-Mist seed vocabulary is checked and renamed in the same pass where present.

## Appetite

Medium — one migration (three functions + grants + write-narrowing + idempotent seeds), integration tests for the bootstrap atomicity, the visibility/no-leak matrix, the permission gate, and the adversarial direct-caller paths. The Cycle B platform shape; substrate and invariant triggers all exist.

## Rabbit holes

- **Don't rebuild role management.** Creation *materialises* roles; defining/renaming/assigning roles beyond the creator's Steward binding is GRP-6/GRP-7 (Cycle G-B). If template-instantiation grows arms, cut to the minimal Steward-only bootstrap and let G-B own the rest.
- **Don't design the template picker.** `p_group_template_id` is accepted and validated; which templates a Surface offers (and whether v1 offers any) is Surface scope. No template CRUD.
- **Don't touch `handle_new_user` / personal groups.** Personal-group bootstrap is the settled PC-2/PC-3 seam (accept-seam-permanently, §5); engagement-group creation is a sibling path, not a refactor invitation.
- **Don't invent visibility semantics beyond the two columns.** `is_public` and `show_member_list` are the substrate; per-audience sharing controls are G-34 (parked), discoverability is A-DIS/DS-6. If a semantic question can't be answered by the two booleans + the oracle, it's out of scope.
- **Don't chase group avatars.** `avatar_url` exists but has no upload pipeline (storage is a DS-4/PC-1 seam); it stays read-only-absent in these contracts (additive later).
- **Mind the timestamp boundary** (`+00:00` vs `Z`) in the jsonb payloads — ISO strings, consumers compare as epoch ms.

## No-gos

- No invitations, joining, or membership mutation beyond the creator bootstrap (MEM-1..3 = G-C; MEM-4..6 = G-D).
- No role definition/assignment surface (GRP-6/7 = G-B) and no act-as/effective-permissions read (GRP-8 = G-B).
- No lifecycle transitions (close/archive/suspend/delete — GRP-9/MEM-8 = G-E; A-ADM for admin holds) — G-A only *renders* `status`.
- No group deletion path and no cascade work beyond the creation bootstrap.
- No member search (DS-6 seam, G-C decision D3) and no notification triggers (no V3 on any G-A §L3 row; group-event notifications land with A-NTF under ADR-U039).
- No new table, no `postgres_changes`, no realtime tenant.

## Stories

### STORY-1: Create an engagement group, atomically stewarded (GRP-1)
As the platform, I want an authenticated FIM to create an engagement group through one contract that bootstraps the whole social container, so no group can ever exist half-born.

**Acceptance criteria:**
- Given an active FIM, when they call `create_engagement_group('Book circle')`, then one transaction creates the group row (`group_type='engagement'`, provenance `created_by_group_id` = their personal group), its role instances (at minimum a Steward role), their active membership, and their Steward binding — and returns the new group id.
- Given the same call fails at any step, when the transaction rolls back, then no partial artifact remains (no group without membership, no membership without Steward).
- Given an anonymous-session Mist, when they call it, then it raises `42501` (FIM-only per GRP-1's IDN-3 dependency).
- Given a suspended FIM, when they call it, then it is refused (suspension halts new social footprint — decision-default, gate-confirmed).
- Given a valid `p_group_template_id`, when the group is created, then its role instances match the template's `group_template_roles`; given an unknown template id, then the call fails without creating anything.

### STORY-2: Read one group honestly (GRP-4 detail · GRP-5 status)
As the platform, I want a single detail contract that tells a member everything they may see about a group — including its lifecycle status — and nothing they may not.

**Acceptance criteria:**
- Given an active member of a group, when they call `get_group_detail(id)`, then they receive the group fields incl. `status`, `member_count`, their viewer block (`is_member`, `joined_at`, `can_manage_settings`), and the `members` array with display names resolved from personal-group names (never `full_name`).
- Given a non-member and a group with `is_public = true`, when they call it, then they receive the group fields and `member_count`; the `members` array is included only if `show_member_list = true`.
- Given a non-member and a private group — or any caller and a nonexistent id — when they call it, then it raises `P0002`, indistinguishably (no existence leak).
- Given a group whose `status` is `closed`, `archived`, or `suspended`, when a permitted viewer reads it, then the payload carries that status verbatim (rendering posture is Surface scope).
- Given a Mist, when they call it, then `42501`.

### STORY-3: Steward the settings — and the two visibilities independently (GRP-2 · GRP-3)
As the platform, I want settings changes gated by permission and expressed as one partial-update contract, so stewarding a group is a capability, not a role-string.

**Acceptance criteria:**
- Given a member whose `has_permission(actor, group, <settings key>)` resolves true, when they call `update_group_settings(id, p_name ⇒ 'New name')`, then only the name changes (partial update), `updated_at` moves, and the updated detail returns.
- Given the same caller, when they set `p_is_public ⇒ true` without touching `p_show_member_list` (and vice versa), then exactly that one toggle changes — the two visibilities are independent (GRP-3).
- Given an active member **without** the permission, when they call it, then `42501`; given a non-member on a private group, then `P0002` (the read's no-leak rule).
- Given any caller, when they attempt to change `status` or `group_type` through this contract, then no such parameter exists — those columns are not updatable here.

### STORY-4: No path around the contracts (ADR-U038 direct-caller)
As the platform, I want the direct PostgREST surface narrowed so the contracts are the only way to do what the contracts do.

**Acceptance criteria:**
- Given a direct PostgREST caller (any client role, including an anonymous-session Mist), when they attempt to INSERT into `public.groups`, then the un-bootstrapped write is refused — a group cannot be created outside `create_engagement_group`.
- Given a direct PostgREST caller with an active membership, when they attempt to UPDATE `status`, `group_type`, or `created_by_group_id` on a group row, then the write is refused at the substrate (column privilege / policy), not merely absent from a route.
- Given the adversarial integration suite, when it exercises these direct paths alongside the RPC paths, then every refusal is a tested behaviour (the GP2 DoD row).

### STORY-5: A fresh database boots the platform (seeding repair)
As the platform, I want the system groups seeded by active migrations, so a fresh environment doesn't depend on carried dev-DB state.

**Acceptance criteria:**
- Given a fresh database with all migrations applied, when the platform boots, then `FringeIsland Members` and `DeusEx` exist as system groups — and on the existing dev DB the same migration is a no-op (idempotent).
- Given the flagged vestigial pre-Mist seed vocabulary, when the migration lands, then any occurrences found in active seeds are renamed to the Mist vocabulary (checked at build; recorded either way).

## Platform dependencies

- **PC-3 substrate (existing, Conformant):** `groups`, `group_memberships`, `group_roles`, `user_group_roles`, `role_templates`, `group_templates`/`group_template_roles`, the 44-key `permissions` catalog, `has_permission()`, `get_current_personal_group_id()`, `group_has_leader`/`prevent_last_leader_removal` invariants.
- **PC-2 Identity:** the FIM/Mist distinction (`users.is_temporary`) and the account-state substrate (FEAT-PC004) for the suspended-actor refusal.
- **PC-1 Infrastructure:** SECURITY DEFINER discipline (`SET search_path = ''`), RLS substrate, migration/repair workflow.
- **Schema gate.** New SECURITY DEFINER functions + write-narrowing on `groups` + idempotent seeds + grants → task status `review`, explicit nod (Platform Core + schema carve-outs); the gate asks the direct-caller question against every touched table.

## Cross-product impact

Consumed by **Hub [FEAT-H013](../../../products/hub/features/FEAT-H013-group-creation-and-stewardship.md)** (Cycle G-A's Surface half). The **Gimbal** consumes the same contracts later — capability flags in the detail payload keep role logic platform-side for every surface. Additive except the deliberate direct-write narrowing on `public.groups` (STORY-4), which removes a legacy client-write path no v2 surface uses (v2's only groups consumer is the `get_member_groups()` read).

## Stability posture (Platform Core §7)

Additive contracts plus one deliberate narrowing (direct writes on `groups`). No existing function signature changes; `get_member_groups()` untouched. Each SECURITY DEFINER function documents its elevation rationale in the migration; all bodies minimal per the PG17 complexity ceiling; the narrowing is the ADR-U038 posture applied to PC-3's anchor table.

## Vertical impact

- **Privacy/GDPR:** group membership is FIM data — the detail contract exposes the member list strictly per the visibility toggles, and member identity resolves through the display-identity substrate (personal-group name), never `full_name`/email. The no-existence-leak rule keeps private groups unenumerable. No new personal data collected.
- **Notifications:** None — no G-A §L3 row carries V3; group-event triggers (created/joined/changed) are A-NTF scope on the ADR-U039 doctrine, and G-A operations are self-originated (the actor sees the result in the response).
- **Administration:** the creation cascade is documented per ADR-U016 (composed invariant above); lifecycle-state vocabulary surfaces read-only (transitions stay with GRP-9/A-ADM); provenance (`created_by_group_id`) makes every group attributable; DeusEx paths untouched.
- **Observability:** contract refusals are SQLSTATEs (`42501`/`P0002`), never silent empties; rows carry provenance and `updated_at`; the consuming route layer emits the structured events (see FEAT-H013). Seeding migration is traceable like any other.
- **Transactions:** None.
- **Extensibility:** no new enums — `status` remains an entity-state CHECK (ADR-U018 narrowing), role/template vocabulary stays in named-constant tables; the detail payload is jsonb-additive (new fields extend, never reshape); the settings contract's updatable-column set can grow additively.

## Open spec questions

1. **Default role materialisation when `p_group_template_id` is null.** Default: the minimal set — a Steward role instantiated from the Steward template (creator bound to it); whether the four seeded group templates imply a richer default is read from `group_templates`/`group_template_roles` at build. Decided with the migration.
2. **Exact permission key(s) for settings management.** Read from the 44-key `permissions` catalog at build (never invented here); if no suitable key exists, adding one is a seed change through the same gate.
3. **Member-list visibility semantic.** Default stated in STORY-2 (members always see the list; non-members of public groups see it iff `show_member_list`). Verified against the legacy oracle's behaviour at build; deviation recorded if the oracle differs.
4. **Write-narrowing shape on `public.groups`.** Column privileges vs policy predicate vs both — decided at the schema-review gate with the direct-caller question on the table; the outcome must satisfy STORY-4's ACs either way.
