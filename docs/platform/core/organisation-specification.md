# Platform Core — Organisation (PC-3)

<!-- Valid area slugs: infrastructure | identity | organisation | governance -->

---
slug: organisation
owner: platform/core/organisation
consumers: [platform/domain/{any DS}, products/{any}, studios/{any}]
status: proposed
last_updated: 2026-05-13
tier: Platform Core
tags: [platform-core:organisation]
feature_prefix: PC
---

> One file per Platform Core area. Platform Core is the domain-agnostic foundation everything else depends on. Each area (Infrastructure, Identity, Organisation, Governance) has its own SPECIFICATION.md; there is no PC-wide SPECIFICATION.md (locked 2026-04-26). This file is the inward-facing build spec for PC-3 Organisation.

**Authorship note.** L2 owns the identity, boundaries, and technical shape (§L2). L3 owns the capability inventory (§L3). L4 owns the feature-inventory summary (§L4). Sections are not modified across levels. The `doc-health-check` skill verifies section boundaries.

**Phase 2 / entity 3 derivation note.** This spec is the PC-3 instantiation of the L1 to L3 cold-derivation flow established at PC-1 and continued at PC-2. Step 1 (this file as initially landed) was derived from L1 ground (root `CLAUDE.md`, `docs/platform/CLAUDE.md`), the sub-tier `docs/platform/core/CLAUDE.md` (note the temporary anchor for the four FringeIsland roles and `has_permission()` — slated for migration to this area's entity-level CLAUDE.md as part of this entity's commit batch), the L2 inventory line ("Organisation (PC-3) — Groups, memberships, roles, permissions" in `docs/platform/core/README.md`), ADR-U023 (Core/Domain decomposition), ADR-U006 (Universal Group Pattern), ADR-U007 (Three-layer permission model), ADR-U016 (Cascade specification first), ADR-U018 (No hardcoded group types), ADR-U020 (Pairs are groups), and the platform-core-spec template — together with the **PC-2 carry-forward block** (four cross-entity findings and two phase-wide watches from `docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md`) and **three Experiment A pre-loaded priors** (P-O1 actor-primitive prior, D7 named-constant-table prior, X3 ADR-U007 signature-staleness prior from `docs/planning/sessions/2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md`). Step 1 did **not** read `supabase/migrations/`, `lib/`, `app/`, or any existing `FEAT-PC*` file. This is a methodological variant of PC-1/PC-2 pure-cold derivation — see §L3 sources-status. Steps 2 (code-informed stress-test) and 3 (adjudication) follow under §L3.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision, the platform-tier `CLAUDE.md`, the sub-tier `docs/platform/core/CLAUDE.md`, the L2 inventory line, ADR-U023, ADR-U006, ADR-U007, ADR-U016, ADR-U018, ADR-U020, the PC-2 carry-forward block, the Experiment A pre-loaded priors, and the platform-core-spec template. Revised when the area's boundaries, contract surface, dependencies, or stability posture change. Changes here are rare by design — see §7.*

### 1. Purpose

PC-3 Organisation owns the answer to *how is this actor situated relative to other actors and rules right now?* — turning the `user_id` PC-2 publishes into a position in the platform's organisational structure: which groups the actor belongs to, in what role, with what permissions. PC-3 is **domain-agnostic** in the Platform Core sense: groups, memberships, role templates, role instances, and atomic permissions are not FringeIsland-specific concerns — they would be present in any multi-user platform that supports collective work over time. PC-3 does *not* own authentication or sessions (PC-2 Identity — see §6 for the actor-primitive partition), governance, audit, moderation, or DeusEx authority (PC-4 Governance), the RLS substrate or migration discipline itself (PC-1 Infrastructure), or any domain-scope content (Domain Services consume PC-3, never define it).

### 2. Concepts

The entities this area owns. Per ADR-U006 (Universal Group Pattern), the central architectural commitment is that **individuals and groups are treated identically by the permission system** — a User is represented by their personal group when participating in any group-shaped interaction. The concepts below are the building blocks of that uniform model.

| Entity | Definition | Persisted in (cold-derived; Step 2 confirms) |
|--------|------------|-----------------------------------------------|
| Group | Universal organisational unit. All groups are simply Groups (ADR-U018); they have labels (user-defined) and templates (system-provided starting points) but no type-based code paths. Personal groups (one auto-created per User per ADR-U006), pair groups (two members per ADR-U020), arbitrarily-sized groups, and system groups (e.g., FringeIsland Members) are all instances of the same entity. | `public.groups` |
| Membership | The link between an acting group (often a User's personal group) and a context group. Carries lifecycle state (active, suspended, exited). | `public.memberships` |
| Role Template | System-defined starting point for a role. The four FringeIsland role-name templates (Steward, Guide, Member, Observer per ADR-U007) live here; each group may instantiate any subset and customise the per-role permission set. | `public.role_templates` (named-constant table per D7 prior — TEXT values; no PG ENUM) |
| Group Role | Per-group instance of a Role Template, carrying that specific group's customised permission set (ADR-U007 layer 3). The same template name (e.g., "Steward") may resolve to different permission sets in different groups. | `public.group_roles` |
| Permission | Atomic, system-defined capability bit. Permissions are developer-grown (added only when new features require them); they are not user-editable. ADR-U007 names ~31 atomic permissions across 7 categories at time of writing. | `public.permissions` |
| Role-Permission link | Many-to-many junction between a Group Role and a Permission. Per ADR-U007, each Group Role's permission set is customisable by the group, so this is the per-group mutable surface. | `public.role_permissions` (cold-derived name) |
| Personal Group | Auto-created Group per User per ADR-U006. Carries the User's individual position in the universal group system; the User acts through this group when participating in any membership / permission interaction. Access primitive: `get_current_personal_group_id()` (ADR-U006). | Row in `public.groups` distinguished by FK or label; the existing `personal_group_id UUID` column on PC-2's `public.users` is the cross-spec FK (C3-2 carry-forward; see §5). |
| "Myself" Role | The role a User holds in their own personal group, instantiated at User creation per PC-2's `handle_new_user` cascade. | Row in `public.group_roles` |
| Permission resolution surface | The SQL function `has_permission(p_acting_group_id, p_context_group_id, p_permission_name)` per X3 disk-signature prior. Resolves "may this acting group exercise this permission against this context?" — the canonical runtime enforcement point per ADR-U007. | SQL function in `public` schema; latent on disk per PC-2 §L3 finding C3-4 (RLS uses `auth.uid()` directly today; RBAC realised via direct triggers like `prevent_last_leader_removal()`). |
| System group | A platform-wide group used as a coordination anchor (e.g., FringeIsland Members enrols every User per PC-2 §5 cascade; `[Deleted User]` reassignment target per Experiment A C1.6 finding). Per ADR-U018, system groups are not entity-distinct from regular groups — they are Groups with a system label. | `public.groups` (label-distinguished; Step 2 confirms) |

Open at §2 (carried into §8):
- Whether Personal Group is a distinct entity or just a label/FK pattern on `public.groups` — pending Step 2 schema evidence. §8 Q3.
- Whether system groups carry an explicit `is_system` boolean or are label-distinguished only — pending Step 2. §8 Q4.

### 3. Contract surface — what this area exposes and to whom

PC-3 exposes its contract via the **Internal API** consumed by Domain Services (and, for the SQL primitives, consumed by every tier via direct SQL or via the Supabase client libraries through RLS evaluation). This is *not* the Platform API consumed by Surfaces.

**Current contract surface (cold-derived; Step 2 confirms existence and signatures):** SQL helpers and primitives plus schema-level contracts. The public HTTP API surface (`/api/v1/groups/*`, `/api/v1/memberships/*`, `/api/v1/roles/*`) is **directional future state per §7, not part of the current contract.** PW-2 promotion-watch armed (speculative as third shape beyond latent / delta).

#### SQL helpers and primitives

- **`get_current_personal_group_id()` — canonical actor primitive.** Per ADR-U006, this function returns the personal group for the calling User. PC-3 publishes this as the canonical "who is the actor in any permission interaction?" primitive. Every RLS policy and SECURITY DEFINER helper that resolves a User's acting position consumes this function. (P-O1 prior applied — see §6 actor-primitive partition.)
- **`has_permission(p_acting_group_id, p_context_group_id, p_permission_name) → boolean` — atomic permission resolution.** Per ADR-U007, the canonical runtime enforcement point. Disk signature per X3 prior: three positional `p_*` parameters. ADR-U007 documents a different signature (`user_id, group_id, permission_name`); see §6 signature partition and §8 Q2.
- **Group-membership invariants — `prevent_last_leader_removal()` and siblings.** Trigger-based-validation pattern (per platform CLAUDE gotcha: PG CHECK constraints can't carry subqueries). These triggers enforce structural invariants on the group / membership tables. PC-2 §L3 carry-forward cites `prevent_last_leader_removal()` explicitly as PC-3-owned.
- **Cascade-response surface for User-creation** — PC-3's cascade work is materialised inside `handle_new_user` per the §5 / §6 PC-2/PC-3 seam disposition (accept-seam permanently).

#### Schema-level contracts

Six anchor tables published as schema-level contracts (cold-derived; Step 2 confirms names and shapes):

- `public.groups` — Group rows. FK target for every other tier's "this entity belongs to a group" relationship.
- `public.memberships` — User-to-group (or group-to-group, per ADR-U006) link rows.
- `public.role_templates` — System-defined role-name vocabulary (D7 prior: named-constant table, not PG ENUM).
- `public.group_roles` — Per-group instances of templates with customised permission sets.
- `public.permissions` — Atomic permission registry.
- `public.role_permissions` — Junction between Group Role and Permission.

**One PC-2-side column carries PC-3 scope today.** `public.users.personal_group_id UUID` (PC-2 §5; C3-2 carry-forward) FK-references `public.groups`. Per the §5 disposition (accept-seam permanently), the column remains where it is, documented as an intentional override of the §4 strict upward-only chain authorised by ADR-U006 (see §5 paragraph and §8 Q8).

#### Operations

Operations against the SQL primitives consume the standard auth posture (per-call permission resolution via `has_permission()`, RLS at the table layer). For the speculative HTTP operations (`createGroup`, `deleteGroup`, `addMember`, `removeMember`, `assignRole`, `revokeRole`, and their permission-management siblings), see §7 — these are directional future state, not current contract.

#### Note on PC-3's "primitives, not endpoints" shape

PC-3, like PC-1, is a special case relative to the template's default surface shape. Most of what it exposes is not a conventional API but a set of platform primitives — the actor-primitive function, the permission-resolution function, the schema-level contracts. Domain Services and Surfaces consume these through SQL or through the Supabase client libraries; the future HTTP API surface (per §7) would wrap them, not replace them.

### 4. Internal dependencies — strict upward-only chain

Per `docs/platform/CLAUDE.md` ("Dependency direction is strictly one-way") and ADR-U023, the Platform Core chain is:

```
PC-1 Infrastructure ──► PC-2 Identity ──► PC-3 Organisation ──► PC-4 Governance
```

PC-3 depends on PC-1 and PC-2 only. PC-3 does **not** depend on PC-4, Domain Services, Products, Studios, or anything downstream.

#### What this area depends on (within Platform Core)

| Upstream area | What this area consumes | Used for |
|---|---|---|
| PC-1 Infrastructure | RLS substrate; SECURITY DEFINER pattern and discipline; `is_platform_admin()` for admin-tier policy bodies (per PG17 RLS complexity-ceiling gotcha); migration timestamp-ordering; trigger-based-validation pattern for invariant enforcement. | RLS on every PC-3 table; admin overrides; schema migrations; structural-invariant triggers (`prevent_last_leader_removal()` and siblings). |
| PC-2 Identity | The `user_id UUID` contract surface (every PC-3 table that attributes data to an actor uses the `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE ...` shape); the authenticated-context handoff (`auth.uid()` as JWT projection, consumed as upstream input to `get_current_personal_group_id()`); the User-row lifecycle (PC-3's cascade-response work executes inside `handle_new_user` per the §6 cascade-response partition). | FK targets on memberships, role assignments, audit fields; actor derivation; cascade-response transactional bootstrap. |

#### What this area does NOT depend on

- **PC-4 Governance.** PC-4 consumes PC-3 (audit subjects, moderation surfaces, DeusEx scope); the chain never reverses.
- **Domain Services.** PC-3's group / membership / role / permission model is fully Platform Core; Domain Service concepts (Journey, Universe, Arc, etc.) consume PC-3 by FK to `public.groups` and by calling `has_permission()`. If a PC-3 capability appears to need a Domain Service concept, the design has an inversion error — surface as open question.
- **Products / Studios / Design System.** None of these may appear in PC-3's dependency graph.

### 5. Storage & schema

PC-3's storage model is the load-bearing instantiation of the Universal Group Pattern (ADR-U006), the rejection of group typing (ADR-U018), the pair-as-group commitment (ADR-U020), and the three-layer permission model (ADR-U007).

**Six anchor tables** plus one cross-spec column on PC-2's `public.users` (the `personal_group_id UUID` FK to `public.groups`).

- **`public.groups`** (PC-3-owned). One row per group. Identity columns include id, label, template-reference, lifecycle state, and a system flag-or-label per §2 Q4. Includes personal groups, pair groups, arbitrarily-sized groups, and system groups uniformly (ADR-U018). RLS posture: SELECT gated by membership-or-admin; INSERT permitted to authenticated User for non-system groups (admin-only for system groups); UPDATE gated by Group Role with appropriate permission; DELETE typically prohibited (soft-delete via lifecycle column).
- **`public.memberships`** (PC-3-owned). One row per (acting group, context group) pair. RLS posture: own-membership-readable + admin-override; INSERT gated by invite or join-flow per group's `has_permission()` policy; UPDATE / DELETE gated by Group Role.
- **`public.role_templates`** (PC-3-owned; **D7 prior pinned — named-constant table**, not PG ENUM). Holds the four FringeIsland role names (Steward, Guide, Member, Observer) plus the "Myself" template per ADR-U006 personal-group semantics. Per ADR-U018's analogous rejection of typed groups, role names are TEXT values in a constant table rather than a PG ENUM — preserving the ability to add or rename templates without schema migrations and avoiding the false-taxonomy failure mode.
- **`public.group_roles`** (PC-3-owned). Per-group instances of templates. RLS posture: SELECT gated by membership-in-group + admin; UPDATE / DELETE gated by Group Role with template-management permission.
- **`public.permissions`** (PC-3-owned). Atomic permission registry, developer-grown. ~31 atomic permissions across 7 categories per ADR-U007 at time of writing. Changes are migration-only; no runtime mutation.
- **`public.role_permissions`** (PC-3-owned). Many-to-many junction between Group Role and Permission. RLS posture: SELECT gated by membership; UPDATE gated by Group Role with permission-management permission.

**`personal_group_id UUID` on `public.users` — PC-2 schema, PC-3 reference (C3-2 carry-forward).** Per the §5 PC-2/PC-3 seam disposition below, the column **remains on `public.users`** as part of the accept-seam-permanently position. This places a PC-3 reference in a PC-2 table — a violation of the strict upward-only §4 chain on its face. PC-3's position is that this is an intentional override authorised by ADR-U006: the Universal Group Pattern's commitment that "every user belongs to an auto-created personal group" defines a structural one-to-one relationship between User and Personal Group, and the FK direction (column on `public.users`, pointing into `public.groups`) is the natural concrete instantiation of that commitment — it preserves O(1) lookup of the actor-primitive directly off the user row. The §4 strict upward-only chain is a tier-shape rule about how Platform Core *areas* relate; ADR-U006 is a constitutive architectural commitment about how Users and Groups relate. Where the two touch — the existence of a PC-3 FK target on a PC-2 table — the ADR-U006 commitment governs and the chain rule yields. The alternative shapes (a `personal_group_memberships` table on the PC-3 side, or a `user_id` column on `public.groups` for personal groups specifically) would relocate the coupling rather than eliminate it, at the cost of an extra index lookup on every actor-primitive resolution. The override is currently §5-prose-anchored; canonicalising it via ADR-U006 amendment is §8 Q8.

**`handle_new_user` cross-seam acceptance (PC-3 §5 position) — accept-seam permanently.** PC-2's §L3 Step 3 carry-forward to PC-3 named three options: (a) accept-seam permanently with bilateral partition documentation; (b) factor into PC-2 emission + PC-3 cascade response per ADR-U016 cascade-spec discipline; (c) escalate as an ADR if the factoring touches §4 dependency-chain semantics. **PC-3 adopts (a).** Reasons:

- The composed transactional invariant — "no User exists without a user-row in `public.users` + personal group + memberships + Myself role + FringeIsland Members enrollment" — is structurally tight; factoring creates a transactional brittleness for marginal architectural gain.
- ADR-U016's discipline ("specify the full cascade before implementation") is satisfied by *documenting* the cascade at PC-2 §5 and PC-3 §5 / §6, not by separating the transactions.
- Personal-group creation per ADR-U006 is conceptually inseparable from User creation. The Universal Group Pattern presupposes that every User exists with a personal group; that presupposition is best preserved by a single transaction.

The alternative positions ((b) factor and (c) ADR-escalate) are recorded at §8 Q1. If Step 2 surfaces disk evidence that the seam-trigger is brittle (e.g., recent commits working around it, leaking partial states, or failing under concurrent load), the Step 3 adjudication may shift the disposition toward (b) or (c).

**Trigger-based validation pattern — `prevent_last_leader_removal()` and siblings.** Per PC-2 §L3 carry-forward and the platform-tier gotcha "PG CHECK constraints can't carry subqueries," PC-3 enforces structural invariants via `BEFORE INSERT OR UPDATE OR DELETE` triggers. The canonical example is `prevent_last_leader_removal()`: a group must always have at least one member with the appropriate leader-equivalent role; removing the last such member raises an exception rather than leaving the group leaderless. Other expected siblings (per Step 2 verification): cascade triggers on Group soft-delete, on User soft-delete, on Role retirement.

**SECURITY DEFINER discipline.** Every SECURITY DEFINER function in PC-3 (including `get_current_personal_group_id`, `has_permission`, and cascade triggers) declares `SET search_path = ''` per platform-tier rule. Bodies are minimal per the PG17 RLS complexity-ceiling gotcha. The function-vs-RLS partition with PC-1 is documented at §6: `is_platform_admin()` (PC-1, minimal body) for admin-tier RLS; `has_permission()` (PC-3, in-group resolution) for in-group RLS.

**Migration discipline.** Migrations timestamp-ordered; never rewrite an applied migration; new tables require RLS without exception (per platform-tier rules). All PC-3 tables have RLS from day one.

### 6. Authentication & authorization

This section documents four partitions: (i) the PC-1 / PC-3 RLS-substrate partition; (ii) the PC-2 / PC-3 actor-primitive partition; (iii) the PC-2 / PC-3 cascade-response partition (`handle_new_user` seam); (iv) the PC-1 / PC-3 complexity-ceiling partition (`has_permission()` vs `is_platform_admin()`). Plus role-name vocabulary ownership and the `has_permission()` signature disposition.

#### PC-1 / PC-3 RLS-substrate partition

PC-1 owns the RLS substrate itself — the migration discipline that every new table carries RLS without exception, the SECURITY DEFINER pattern, the PG17 complexity-ceiling gotcha, the helper convention `is_platform_admin()`. PC-3 owns the *content* of its RLS policies — what counts as a permitted SELECT / INSERT / UPDATE / DELETE on `public.groups`, `public.memberships`, `public.role_templates`, `public.group_roles`, `public.permissions`, `public.role_permissions`. The platform-tier rule "new tables require RLS — without exception" is the consumption discipline.

#### PC-2 / PC-3 actor-primitive partition

The actor-primitive question resolves at this §6, not at either spec alone. PC-3 owns the actor primitive for in-group permission resolution: `get_current_personal_group_id()` (per ADR-U006). PC-2 owns the authenticated-context handoff: `auth.uid()` as the SQL-side projection of the Supabase Auth JWT, which is the upstream input from which `get_current_personal_group_id()` derives.

RLS policies for PC-3-owned tables (and, by transitive consumption, every Domain Service table whose permission gating routes through `has_permission()`) consume `get_current_personal_group_id()` — not `auth.uid()` directly. RLS policies for PC-2-owned tables (auth-context handoff, own-profile reads) consume `auth.uid()`. The platform-wide actor-primitive question is therefore scope-dependent: at the JWT-projection layer it is `auth.uid()`; at the universal-group-acting-position layer it is `get_current_personal_group_id()`.

This partition has cross-spec implication for PC-2's currently-written §3 / §6 (which name `auth.uid()` as canonical "platform-wide"); the implication is surfaced at §8 Q6 and routed via Experiment A's deferred-amendment channel.

#### PC-2 / PC-3 cascade-response partition (`handle_new_user` seam)

PC-2 owns User-lifecycle initiation. PC-3 owns membership / role cascade response. Today's `handle_new_user` AFTER INSERT trigger on `auth.users` executes both PC-2 and PC-3 work transactionally per PC-2 §5 and per the §5 acceptance position above. The composed invariant is preserved by the single transaction. The bilateral documentation requirement of accept-seam (option (a)) is satisfied by PC-2 §5 and this §6 together; both specs describe the seam from their own side without contradiction.

#### Role-name vocabulary and the four FringeIsland roles

The four FringeIsland role names (Steward, Guide, Member, Observer) live in PC-3 per PC-2 §L3 finding C3-3 — TEXT values in `public.role_templates` per D7 prior (named-constant table; no PG ENUM). The platform-tier rule "never hardcode role names; use `has_permission(...)`" (per ADR-U007 and platform CLAUDE) is the consumption discipline; PC-3's `public.role_templates` is the anchor. The sub-tier `docs/platform/core/CLAUDE.md` temporary anchor naming PC-2 as home of these roles + `has_permission()` migrates to this entity's CLAUDE.md as part of this commit batch per the cascade policy in root `CLAUDE.md`.

#### `has_permission()` — signature partition and latent status

`has_permission()` is PC-3-owned. PC-2 §L3 finding C3-4 records the function as latent on disk: no such function exists; RLS uses `auth.uid()` directly with policy-specific logic (96 references across `supabase/migrations/`); RBAC is realised via direct triggers like `prevent_last_leader_removal()`.

Two signatures are recorded:

- **Documented (ADR-U007):** `has_permission(user_id, group_id, permission_name)`.
- **Disk (per Experiment A X3 prior):** `has_permission(p_acting_group_id, p_context_group_id, p_permission_name)`.

PC-3's §6 cold-derivation position: adopt the disk signature. Reasoning: (a) `has_permission()` is not yet instantiated as a callable function, so the question is forward-looking rather than retrospective; (b) the disk signature reflects the actual actor primitive (`acting_group_id` per ADR-U006's Universal Group Pattern), whereas `user_id` would force `has_permission()` to perform the personal-group-id derivation internally on every call; (c) the `acting_group_id, context_group_id` framing is structurally honest about the symmetry the Universal Group Pattern enables (any group may be the actor; any group may be the context). The disposition is surfaced at §8 Q2 as ADR-U007 amendment candidate.

#### PC-1 / PC-3 complexity-ceiling partition

Per the platform CLAUDE gotcha "PG17 RLS silently drops complex PLPGSQL," PC-1's `is_platform_admin()` (minimal SECURITY DEFINER body) is the canonical primitive for admin-tier RLS. PC-3's `has_permission()` (richer body — must traverse memberships and role-permission junctions) is reserved for in-group checks. RLS policies that need both compose them at the policy level (e.g., `is_platform_admin() OR has_permission(get_current_personal_group_id(), :context_group, :permission)`), not inside a single helper. Whether a canonical composition helper belongs in PC-1 or PC-3 is surfaced at §8 Q5.

### 7. Stability posture

Per `docs/platform/core/CLAUDE.md` ("Platform Core changes are rare by design") and ADR-U023, PC-3 sits at the highest blast-radius layer in the ecosystem. A change to the group / membership / role / permission model propagates to every tier above. Specific cadences and triggers:

| Aspect | This area's posture |
|---|---|
| **Change cadence** | ADR-required for any change to `has_permission()` signature, the actor-primitive function name or shape, or the role-template-vocabulary canonical artifact. Wave-boundary for the schema-level contracts (`public.groups`, `public.memberships`, `public.role_templates`, `public.group_roles`, `public.permissions`, `public.role_permissions`) — changes ripple to every consumer FK. Per-cycle with review for new atomic permissions (developer-grown additions to `public.permissions`). |
| **Triggers a change** | New vertical obligation (e.g., a new audit requirement landing in PC-4 that needs a role-template-vocabulary entry); ADR superseded (e.g., a future ADR redefining the Universal Group Pattern); security finding (RLS gap discovered); scale ceiling hit (the role-resolution function becoming a hot path requiring caching). |
| **Review escalation** | Stefan reviews; for changes touching the `has_permission()` contract surface, the review also requires evidence that every consumer's RLS policies have been audited for compatibility (the silent-miscompile failure mode per PG17 RLS gotcha applies). For changes to the four FringeIsland role-name templates, a wave-boundary migration window is required because the names are consumed by every product, studio, and Domain Service. |
| **Default answer to "we want to change this"** | Per `platform/core/CLAUDE.md`: "model it in a Domain Service or via the Extension System first." For PC-3 specifically: a domain need for a "new kind of group" is rejected per ADR-U018 (all groups are simply Groups; use labels and templates instead). A domain need for a "new kind of permission check" is rejected unless it cannot be modelled as a new atomic permission consumed by `has_permission()`. |
| **Deprecation pathway** | For SQL primitives: signature changes go through ADR + version-bump-equivalent (a new function name; the old function deprecated but still callable until all consumers migrate). For HTTP API surface (directional future state below): API endpoints under `/api/v1/...`; breaking changes introduce `/api/v2/...` per ADR-U015 with both versions live until all Surfaces have migrated. |

**Directional future state — public HTTP API surface (PW-2 promotion-watch armed).** The cold derivation produced six speculative API operations: `createGroup`, `deleteGroup`, `addMember`, `removeMember`, `assignRole`, `revokeRole` (with their permission-management siblings). None exist on disk today (Step 2 confirms). They are recorded here as **speculative directional future state per PW-2** (not latent — disk does not currently exercise them; not delta — the cold derivation did not produce them as current contract; the third shape: hypotheses appropriate as directional future state) under `/api/v1/groups/*`, `/api/v1/memberships/*`, `/api/v1/roles/*` per the platform-tier API-versioning rule (ADR-U015) and the API-first-frontend-agnostic discipline (ADR-U009). A FEAT-PC3-* pickup candidate is "wrap the SQL primitives behind `/api/v1/groups/*` per the platform-tier `Authorization: Bearer` rule"; routing decision deferred to Phase 2 close-out or Phase 3 entry (when Domain Service derivation may pressure the wrap timing).

### 8. Open spec questions

L2-level questions still under design. Each is a candidate research spike or ADR.

- **Q1 — `handle_new_user` factoring position.** Step 1 cold position (§5) = accept-seam permanently with bilateral partition documentation (PC-2 §L3 Step 3 option (a)). The alternatives are (b) factor into PC-2 emission + PC-3 cascade response per ADR-U016 cascade-spec discipline, and (c) escalate as ADR if the factoring touches §4 dependency-chain semantics. Step 2 disk evidence may shift the position toward (b) or (c) — specifically, evidence of seam-trigger brittleness (recent workarounds, partial-state leaks, concurrent-load failures) would pressure away from accept-seam. Step 3 adjudicates.

- **Q2 — ADR-U007 signature staleness.** Step 1 cold position (§6) = adopt the disk signature `has_permission(p_acting_group_id, p_context_group_id, p_permission_name)` and amend ADR-U007 accordingly. Alternative: amend the disk-target implementation to match the ADR signature (`user_id, group_id, permission_name`). The ADR-amendment route is preferred per the three reasons at §6 (latent status; actor-primitive reflection; internal-derivation cost). Resolution at Step 3; if adopted, the ADR-U007 amendment is a separate commit outside the PC-3 spec batch.

- **Q3 — Personal Group entity-vs-label.** Whether Personal Group is a distinct entity (separate table, dedicated FK column on `public.groups`) or just a label/FK pattern on a regular `public.groups` row. Likely the latter per ADR-U018's general posture against type-distinct rows; Step 2 disk evidence settles.

- **Q4 — System groups entity-vs-label.** Whether system groups (FringeIsland Members, `[Deleted User]`) carry an explicit `is_system` boolean or are label-distinguished only. Likely label-distinguished per ADR-U018; Step 2 confirms.

- **Q5 — `has_permission` vs `is_platform_admin` policy-composition pattern.** §6 names the composition shape (`is_platform_admin() OR has_permission(...)`); §8 surfaces the question of whether a canonical composition helper belongs in PC-1 (where `is_platform_admin` lives) or PC-3 (where `has_permission` lives), or remains a per-policy compose-inline pattern. Step 2 disk evidence settles. Cold-derivation prediction: compose-inline pattern; confirm or contradict at Step 2.

- **Q6 — PC-2 spec actor-primitive amendment carry-forward.** PC-2 currently names `auth.uid()` as canonical "platform-wide." PC-3 §6 actor-primitive partition (this spec) implies PC-2 spec needs amendment for actor-primitive scope (PC-2's actual scope is the JWT-projection layer; PC-3 owns the universal-group-acting-position layer). Resolution deferred to post-Experiment-B PC-2 amendment work per Experiment A bridge ("amend PC-2 spec only after Experiment B replicates or contradicts the pattern"). Recorded here so the cross-spec implication is honest and traceable; not PC-3's to amend.

- **Q7 — Speculative HTTP API surface materialisation.** §7 records six speculative operations as directional future state per PW-2. The question is *when* (which wave) and *how* (which FEAT-PC3-*) the wrap lands; today's contract is SQL primitives + schema only. Pickup-list candidate for Phase 2 close-out or Phase 3 (Domain Services L1→L3 derivation may pressure the wrap timing).

- **Q8 — ADR-U006 amendment candidate: canonicalise the FK-direction commitment.** The Universal Group Pattern's structural one-to-one between User and Personal Group is materialised today as a `personal_group_id UUID` column on `public.users` pointing into `public.groups`. §5 documents this as an intentional override of the §4 strict upward-only chain, authorised by ADR-U006. The override would benefit from explicit ADR-level codification rather than relying on §5 prose to carry the rationale. Pickup-list candidate; ADR-U006 amendment commit separate from this spec batch.

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above), together with the PC-2 carry-forward block and the Experiment A pre-loaded priors per the §L2 derivation note. L3 does not read existing feature specs or code during derivation. **Methodological variant:** Step 1 is cold-derivation-with-Experiment-A-priors (P-O1, D7, X3) — distinct from PC-1/PC-2 pure-cold derivations; see sources-status block. Step 2 (code-informed stress-test) and Step 3 (adjudication) follow after Step 1 lands.*

### Capabilities

| Capability | Internal area | Depends on (internal) | Depends on (external, upstream PC only) | Vertical impact |
|---|---|---|---|---|
| Universal Group Pattern | PC-3 | — | PC-1 (RLS substrate; migration discipline) | Administration (every group has a lifecycle); Observability (every group-creation event recorded); Privacy (group membership is FIM data) |
| Personal Group bootstrap | PC-3 | Universal Group Pattern | PC-1 (SECURITY DEFINER; trigger discipline); PC-2 (User-lifecycle initiation; `user_id` contract) | Administration (cross-seam cascade response per ADR-U016); Observability (personal-group-creation event); Privacy (consent state established at personal-group-creation per future PC-2 amendment scope) |
| Membership lifecycle | PC-3 | Universal Group Pattern; Personal Group bootstrap | PC-1 (RLS posture; cascade triggers per ADR-U016); PC-2 (`user_id` contract) | Administration (add/remove/transfer; cascade on User soft-delete per ADR-U016); Observability (every membership-change event); Notifications (welcome/leave triggers); Privacy (membership state is FIM data) |
| Role Template management | PC-3 | Universal Group Pattern | PC-1 (RLS posture; migration discipline) | Administration (template versioning); Observability (template-edit events) |
| Group Role lifecycle | PC-3 | Role Template management; Membership lifecycle | PC-1 (RLS posture; cascade triggers) | Administration (role-instance lifecycle); Observability (role-change events per platform-tier role-change cascade); Notifications (role-change triggers) |
| Permission registry | PC-3 | — | PC-1 (migration discipline) | Administration (developer-grown growth discipline); Observability (permission-set additions are traceable) |
| Permission resolution — `has_permission()` | PC-3 | Permission registry; Group Role lifecycle; Personal-group actor primitive | PC-1 (SECURITY DEFINER discipline; PG17 RLS complexity-ceiling gotcha); PC-2 (`auth.uid()` as upstream input) | Administration (every permission-check denial is auditable per platform CLAUDE); Privacy (permission resolution gates FIM-data reads); Observability (RLS denial events recorded, not silently empty) |
| Personal-group actor primitive — `get_current_personal_group_id()` | PC-3 | Personal Group bootstrap | PC-1 (SECURITY DEFINER discipline); PC-2 (`auth.uid()` as upstream input) | Observability (every authenticated permission interaction carries the resolved acting position) |
| Group-membership invariants | PC-3 | Membership lifecycle; Group Role lifecycle | PC-1 (trigger-based-validation pattern) | Administration (invariants enforced at write time); Observability (invariant-violation events are first-class errors, not silent rollbacks) |
| Cascade-response for User-creation | PC-3 | Personal Group bootstrap; Membership lifecycle; Group Role lifecycle | PC-2 (`handle_new_user` seam-trigger; User-lifecycle initiation) | Administration (composed-invariant cascade per ADR-U016); Observability (User-creation cascade event recorded as one unit); Notifications (welcome-to-FringeIsland trigger) |
| Pending-invitation claim | PC-3 | Membership lifecycle; Cascade-response for User-creation | PC-2 (email match against pending invites at User creation) | Administration (invitation lifecycle); Notifications (claim event triggers welcome variant) |

The **Vertical impact** column lists per-capability touch points across Administration / Privacy / Notifications / Observability / Transactions per ADR-U002. Verticals not touched are omitted from the cell. The full per-vertical obligation set lives in each vertical's `SPECIFICATION.md` (§L3 Obligation inventory); when those exist, this table is the entry point.

Per §7, the **public HTTP API surface** is directional future state, not a current L3 capability. The pickup ("wrap SQL primitives behind `/api/v1/groups/*` etc.") is queued for a future FEAT-PC3-* and a future Phase 2 close-out or Phase 3 entry. **Not enumerated here as a Step 1 L3 capability per PW-2 (speculative-as-third-shape).**

### Dependency chain

Within-area dependencies (capability A in PC-3 depends on capability B in PC-3):

- *Foundational:* **Universal Group Pattern** is depended on by every other PC-3 capability.
- *Identity-organisation bootstrap layer:* **Personal Group bootstrap** depends on Universal Group Pattern + cross-seam input from PC-2.
- *Lifecycle layer:* **Membership lifecycle** depends on Universal Group Pattern and Personal Group bootstrap.
- *Vocabulary layer:* **Role Template management** depends on Universal Group Pattern; **Permission registry** depends on none (atomic).
- *Resolution layer:* **Group Role lifecycle** depends on Role Template management + Membership lifecycle; **Permission resolution** depends on Permission registry + Group Role lifecycle + Personal-group actor primitive; **Personal-group actor primitive** depends on Personal Group bootstrap.
- *Invariant layer:* **Group-membership invariants** depends on Membership lifecycle + Group Role lifecycle.
- *Cascade-response layer:* **Cascade-response for User-creation** depends on Personal Group bootstrap + Membership lifecycle + Group Role lifecycle; **Pending-invitation claim** depends on Membership lifecycle + Cascade-response for User-creation.

Cross-area dependencies (PC-3 capability depends on upstream PC area's capability):

- Every PC-3 capability depends on PC-1's RLS substrate + migration discipline + SECURITY DEFINER pattern.
- Bootstrap, lifecycle, and cascade-response capabilities depend on PC-2's `user_id` contract surface, authenticated-context handoff, and (for cascade-response) the User-lifecycle initiation via `handle_new_user`.

### External dependencies

Capabilities PC-3 consumes from upstream Platform Core areas:

- **From PC-1 Infrastructure:**
  - RLS substrate (every PC-3 table has RLS without exception).
  - SECURITY DEFINER pattern with `search_path = ''` (every PC-3 SECURITY DEFINER function follows the discipline).
  - `is_platform_admin()` (consumed in admin-tier RLS clauses on every PC-3 table).
  - Migration timestamp-ordering and trigger-based-validation pattern.
  - PG17 RLS complexity-ceiling discipline (informs the `has_permission` vs `is_platform_admin` partition at §6).

- **From PC-2 Identity:**
  - `user_id UUID` contract surface (every PC-3 table that attributes data to a User uses `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE ...` per ADR-U016 cascade-spec per consumer table).
  - Authenticated-context handoff via `auth.uid()` (upstream input to `get_current_personal_group_id()`).
  - User-lifecycle initiation via `handle_new_user` (cross-seam cascade-response substrate; see §5 / §6 disposition).

**Disallowed sources:** PC-4 Governance, Domain Services, Products, Studios, Design System. PC-3 must not depend on any of these — surface as open question if Step 2 reveals an inversion.

### Sources-status block

- **Step 1 methodology — cold-derivation-with-Experiment-A-priors (P-O1, D7, X3).** Distinct from PC-1/PC-2 pure-cold derivations. Three priors actively held throughout Step 1: P-O1 (actor primitive is `get_current_personal_group_id()`, not `auth.uid()` directly; applied at §3 SQL helpers, §5 storage discussion of `personal_group_id` column, §6 actor-primitive partition); D7 (role-name vocabulary canonical artifact is named-constant table, not PG ENUM; applied at §2 Concepts table, §5 `public.role_templates` row); X3 (ADR-U007 documented signature is stale; disk signature has three `p_*` positional parameters; applied at §3 SQL helpers, §6 signature partition, §8 Q2). Pre-loading from Experiment A's deferred-amendment ledger per the session-opener's authority chain. Promotion candidate (A-candidate #6): "Cold-derivation-with-priors as methodology variant"; promotion criterion is recurrence at PC-4 and Phase 3 entities.
- **PW-1 (schema-predates-partition) — promotion-watch armed.** PC-2 §L3 Step 3 named PC-3 as the most likely site for recurrence given that C3-1, C3-2, C3-3, C3-4 all carry-forward with the same temporal-shape signature. Step 2 disk evidence likely confirms; promotion to named program-level pattern expected at Phase 2 close-out.
- **PW-2 (speculative as third shape) — promotion-watch armed.** §7 directional future state for the public HTTP API surface is the canonical site; tagged at §7 explicitly so the promotion-watch can fire when Step 2 / Step 3 confirms the speculative-vs-current-state distinction.
- **A-candidate #5 (multi-Edit gate emission discipline) — promotion-watch armed.** Sub-batch-of-1 default holds for Step 1 (single Write to create this file; no batched-Edit ladders planned). Step 2 / Step 3 may produce multi-Edit work; sub-batch-of-1 will be the default unless discipline holds for sub-batch-of-3 at Step 2's first multi-Edit point.
- **PC-1 Finding #4 (secrets/credentials substrate is app-tier) — carry-forward status.** Step 1 cold derivation surfaced no app-tier substrate adjacent to secrets/credentials in PC-3 scope. Will re-check at Step 2 (PC-3 RLS policies adjacent to service-role escalation per Experiment A X5 prior may pressure the carry-forward). Phase 2 close-out adjudicates.
- **Experiment A X5 (service-role escalation in business-domain routes) — Step 2 watch.** Five business-domain routes per Experiment A open-code service-role escalation. Step 2 disk-check will record whether any PC-3-owned operation (group / membership / role mutation) is among them, and whether the pattern routes via PC-1's Finding #4 channel.
- **PC-2 amendment carry-forward (Q6) — deferred routing.** PC-3 §6 actor-primitive partition implies PC-2 spec needs amendment; resolution deferred to post-Experiment-B PC-2 amendment work per Experiment A bridge. Recorded at §8 Q6.

*Note: no status column in the capability table. Status (shipped / in flight / not started / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's capability inventory. Updated whenever a `FEAT-PC###.md` file under `docs/platform/core/features/` that this area owns a capability for is created, advances in maturity, or is deleted. Maintenance discipline is tracked as G-21 — the `doc-health-check` skill verifies this section reflects the current state of `features/`.*

**Note on shared `features/` directory.** The four Platform Core areas share a single `docs/platform/core/features/` directory (locked 2026-04-26: flat layout, single shared features directory). Each `FEAT-PC###.md` is routed to its owning area via the L4 feature-inventory summary in that area's SPECIFICATION.md. A feature may appear in only one area's L4 summary — the owning area.

### Summary

| Capability (from §L3) | Feature spec | Maturity | Notes |
|---|---|---|---|
| *(populated at first reconciliation pass after Step 3 lands)* | — | — | — |

### Capabilities without specs

To be populated at first reconciliation pass after Step 3 lands.

### Features without capabilities

To be populated at first reconciliation pass after Step 3 lands.

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level. See `docs/platform/CLAUDE.md` for the platform-tier obligations this template encodes. See `docs/planning/sessions/2026-05-04_02_-_PC2-L1-L3-COMPLETE.md` for the PC-2 carry-forward block. See `docs/planning/sessions/2026-05-04_03_-_EXPERIMENT-A-COMPLETE-AND-DEFERRED-WORK.md` for the Experiment A priors applied at Step 1. See `docs/planning/sessions/2026-05-12_01_-_EXPERIMENT-B-ABORTED-RESTART-PLAN.md` for the Experiment B restart specification this entity participates in.*
