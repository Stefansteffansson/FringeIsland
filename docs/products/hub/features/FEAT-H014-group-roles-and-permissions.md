# FEAT-H014: Group roles & permissions surfaces — see the role fabric, shape it, and know what you can do here

---
id: FEAT-H014
title: Group roles & permissions surfaces — the roles panel (fabric read, template/custom definition, grant editing), role chips + assign/remove on the member list, and the "what I can do here" effective-permissions view with the v1 act-as shell (GRP-6/7/8)
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

After Cycle G-A a group exists, renders, and is stewarded — but its **role structure is invisible and immutable** from the Hub: no way to see which roles exist (GRP-6), give or take them (GRP-7), or see what you're actually allowed to do in a group (GRP-8). The Steward the bootstrap created is alone and can't delegate.

The platform half is [FEAT-PC011](../../../platform/core/features/FEAT-PC011-group-role-and-permission-contracts.md): the role-fabric read with capability flags, template/custom role definition with two anti-escalation walls, assignment/removal riding the existing invariants, and the already-published `get_user_permissions` effective read. This is the Surface consuming it API-first (ADR-U009/U038): render, relay, gate nothing client-side.

## Solution sketch

Three surface pieces on the `/groups/[id]` page (no new top-level route), plus BFF plumbing:

- **Roles panel** — a "Roles" section rendering `get_group_roles`: per role a card/row with name, template badge (template-derived vs custom), holder count, and its granted permissions as chips (grouped by catalog category). Management affordances appear iff the payload's capability flags say so: **Add role** (choose a foundational template, or "custom" → name + description + a permission checklist built from `available_permissions`), **rename/describe**, **grant toggles** per role, and **delete** (custom + unheld only — the contract refuses otherwise; ConfirmModal, destructive). Every mutation re-reads the fabric (house pattern); refused escalations surface the contract's error honestly ("you can't grant what you don't hold").
- **Role chips + assignment on the member list** — the detail page's member list (now carrying `member_group_id` + `roles[]` from the extended payload) shows each member's roles as chips; holders of `assign_roles`/`remove_roles` get an assign affordance per member (role picker from the fabric read) and a chip-remove (ConfirmModal — removing the last Steward surfaces the invariant's refusal, never pre-hidden). Mutations re-read detail + fabric together.
- **"What I can do here" (GRP-8)** — an effective-permissions view on the group page: the caller's permission names (via `GET` on the BFF wrapping `get_user_permissions`), rendered as readable capability chips grouped by category. Above it, the **act-as selector shell, honestly v1**: a context control showing exactly one context — "Myself" — with copy that further acting contexts (acting *as* a group) arrive when group-of-groups lands (the PC011 Open Q1 / G-F seam). No fake affordance: the selector renders, is real, and has one option.
- **BFF routes** — `GET /api/groups/[id]/roles` (fabric; Edge+`dub1` hot read, ADR-U037 identity), `POST /api/groups/[id]/roles` (create), `PATCH`/`DELETE /api/groups/[id]/roles/[roleId]` (update/grant-toggle via PATCH body; delete), `POST`/`DELETE /api/groups/[id]/members/[memberGroupId]/roles/[roleId]` (assign/remove), `GET /api/groups/[id]/my-permissions`. SQLSTATE→HTTP per house map; **id-only telemetry** (role names are member content — never in events).

## Appetite

Medium-plus — the widest Hub surface so far (a panel, list integration, a permissions view, ~6 route handlers), but every mechanism is established (capability flags, mutation-re-read, ConfirmModal, Edge reads). First cuts if it swells: rename/describe editing (contract exists, UI later), and the category grouping of permission chips (flat list first).

## Rabbit holes

- **Don't compute permissions client-side — anywhere.** Both walls (definition-time, assignment-time) live in the substrate; the UI only renders capability flags and maps refusals. No "disable the option because we predicted the wall" beyond what the flags state.
- **Don't build a permission-matrix editor.** Per-role grant toggles, one role at a time — no cross-role grid, no bulk operations, no diff views.
- **Don't invent role iconography/hierarchy.** Roles are named chips; template-derived vs custom is the only visual distinction. No seniority styling.
- **Don't fake the act-as selector.** One real context in v1 with honest copy beats a mocked dropdown of contexts nobody can wield (Open Q1 is unresolved governance, not missing UI).
- **Don't drag membership management in.** Assign/remove **roles** only; pausing/removing **members** is Cycle G-D — resist the adjacent affordance.
- **Mind the invariant errors.** The last-Steward refusal arrives as a contract error — surface its message in place (the member keeps their chip); never pre-compute "is this the last Steward" client-side.

## No-gos

- No invitations/joining (G-C), no member pause/activate/remove (G-D), no group deletion (G-E).
- No template or catalog management (platform-admin scope, A-ADM).
- No group-as-actor acting contexts (PC011 Open Q1 → G-F); no cross-group role views.
- No Mist surface (inherited gate — the pages are FIM-only already).
- No realtime, no notification UI (durable rows exist substrate-side; A-NTF renders them later).

## Stories

### STORY-1: See the role fabric (GRP-6 read)
As a group member, I want to see the group's roles, what each allows, and who holds how many, so the group's structure is legible.

**Acceptance criteria:**
- Given an active member on the group page, when the roles panel loads, then every role shows its name, template-or-custom badge, holder count, and granted permissions as chips.
- Given a viewer without management flags, when the panel renders, then no add/edit/delete/assign affordances exist — the panel is purely legible.
- Given the fabric read fails, when the error returns, then the panel shows a non-destructive error and the rest of the page stands.

### STORY-2: Shape the roles (GRP-6 define)
As a Steward, I want to add a role from a template or define a custom one — and tend its grants — so the group's structure fits its life.

**Acceptance criteria:**
- Given a `can_manage_roles` viewer, when they add a role from a foundational template, then the panel re-reads and shows the instance with the template's grants.
- Given the custom path, when they name a role and tick permissions from the catalog checklist and submit, then the role appears with exactly those grants; when the contract refuses a grant they don't hold themselves, then the wall's message shows and the form keeps its state.
- Given a grant toggle on an existing role, when they flip it, then the re-read reflects it; given delete on a held or template-derived role, then the affordance behaviour matches the contract (refusal surfaced honestly; ConfirmModal on the destructive path).

### STORY-3: Give and take roles (GRP-7)
As a Steward, I want to assign and remove member roles from the member list, so delegation is a two-click act.

**Acceptance criteria:**
- Given a `can_assign_roles` viewer, when they pick a role for a member from the assign affordance, then the member's chips re-read to include it.
- Given the anti-escalation wall refuses (the role grants something the assigner lacks), when the error returns, then it is surfaced in place and nothing changes visually.
- Given a `can_remove_roles` viewer removing a chip via ConfirmModal, then the re-read drops it; given it was the last Steward binding, then the invariant's refusal shows and the chip stays.
- Given a viewer without the flags, when the member list renders, then chips are read-only.

### STORY-4: Know what I can do here (GRP-8)
As a FIM, I want to see my effective permissions in this group — as myself — so what I can do is never a guess.

**Acceptance criteria:**
- Given an active member, when the "What I can do here" view loads, then their effective permission names render as readable chips (empty state honest: "You can view this group").
- Given the act-as selector, when it renders, then it offers exactly one context — "Myself" — with copy naming when further contexts arrive; selecting it is a no-op re-read.
- Given the member's roles change (assigned/removed while the page is open), when the affected mutation completes, then the permissions view re-reads with the member list (one truth, one refresh path).

### STORY-5: Meaningful actions leave a trace (V4)
As the platform, I want every role operation observable, content-free.

**Acceptance criteria:**
- Given any create/update/assign/remove/delete via the BFF, when the route completes, then a structured event fires (actor, group id, role id, outcome) — role names and member display data never in events.
- Given any refusal (403/404/400), when the route returns, then a failure-variant event fires with the mapped status.

## Platform dependencies

- **[FEAT-PC011](../../../platform/core/features/FEAT-PC011-group-role-and-permission-contracts.md)** — all six contracts + capability flags + the extended `get_group_detail` members payload + `get_user_permissions` (existing, published). Schema gate lands platform-side; this feature carries no migration.
- **FEAT-H013 surfaces** — the group detail page and member list this feature extends; the house gate, ConfirmModal, Edge+`dub1` conventions.

## Cross-product impact

The Gimbal consumes the same contracts, flags, and refusal semantics; only composition differs. The roles panel establishes the capability-flag + anti-escalation UX pattern later assignment surfaces (journey roles, moderation) reuse.

## Vertical impact

- **Privacy/GDPR:** renders role data strictly per the membership-scoped contracts; member identity stays display-identity; nothing new collected; role names never enter telemetry.
- **Notifications:** None new — assignment/removal already writes durable notification rows substrate-side (PC011); this surface neither sends nor renders them (A-NTF later).
- **Administration:** all management affordances are capability-flag-gated and wrapped in named flows; destructive paths ConfirmModal-gated; invariant refusals surfaced verbatim, never pre-empted.
- **Observability:** STORY-5 — id-only structured events on every operation and refusal.
- **Transactions:** None.
- **Extensibility:** the permission checklist and chips render from the payload's catalog (new permissions appear with zero Surface change); custom roles are the member-facing extensibility mechanism; the act-as selector is built as a real control with one context so G-F extends it rather than replacing a mock.

## Implementation notes (6-done — Cycle G-B, 2026-07-04)

Built TDD red-first, after the FEAT-PC011 schema-gate nod + merge (PR #65). **No migration of its own.**

- **BFF (six handlers + the GRP-8 read):** `GET/POST /api/groups/[id]/roles`, `PATCH/DELETE /api/groups/[id]/roles/[roleId]` (PATCH is one-operation-per-call: a rename **or** one `set_permission` flip — mixed/empty bodies 400), `POST/DELETE /api/groups/[id]/members/[memberGroupId]/roles/[roleId]`, `GET /api/groups/[id]/my-permissions` (= `get_current_personal_group_id` → the published `get_user_permissions`). Fabric + my-permissions are Edge+`dub1` page-load hot reads (ADR-U036/U037, getClaims identity); mutations keep per-request `getUser`. SQLSTATE→HTTP extends the house map with **23505/P0001 → 409**, the invariant messages passed through verbatim so the panels show them in place. Telemetry id-only on every success and refusal (STORY-5) — role names are member content.
- **Build-resolved gap — the template picker's source:** the PC011 fabric payload carries the catalog but not the template vocabulary. `role_templates` is RLS-readable by any authenticated client (`auth_read_role_templates`, qual TRUE — platform-side rule, Gimbal reads the same table), so the fabric BFF **composes** `{ fabric, templates }` in one response; no new contract.
- **Surface:** `RolesPanel` (cards with template/custom badge + holder count + grant chips; add-from-template with the instance name prefilled from the template's short name, or custom with a category-grouped catalog checklist; per-role grant editor; delete via ConfirmModal — hidden for template-derived roles, payload-categorical, while held-role refusals stay server-surfaced 409s); member-list role chips + assign picker + chip-remove on `GroupDetailPanel` (affordances iff the fabric's `can_assign_roles`/`can_remove_roles`); `MyPermissionsPanel` with the honest v1 act-as shell (one real context, "Myself", copy naming G-F). The page composes the three reads with **one refresh path** (any mutation re-reads detail + fabric + permissions together); fabric/permissions failures stay panel-local (STORY-1 AC3).
- **First cuts taken (per Appetite):** rename/describe UI (the PATCH path exists and is route-unit-covered; no panel affordance yet) and category-grouping of chips on role cards (flat; the checklist is grouped).
- **Substrate reality carried:** G-A-bootstrapped instances are named verbatim after templates (`'Steward Role Template'`) — rendered as-is, no client-side prettifying; rename is the per-group remedy. On a **private** group a viewer without `view_member_list` gets no member list from the contract, hence no assignment surface — surfaced live by the E2E's first red run (the fixture role now grants it; the honest-system behaviour, not a bug).
- **Red→green evidence:** 40 new unit tests demonstrated RED → GREEN: 20 route-units (`group-roles-routes.test.ts`, modules absent → PGRST-shape mocks), 9 `RolesPanel` + 4 `MyPermissionsPanel` + 6 member-chips/assign/remove (`GroupDetailPanel.test.tsx`) + 1 one-refresh-path page test (components/affordances absent). Two in-flight test corrections labelled honestly: the chips assert re-scoped to its container (an assign-picker `<option>` false-matched the bare text locator — test precision, not behaviour), and the same option-vs-chip fix in the E2E's chip-stays assert. E2E: 2 new journeys — the delegation arc (create role from checklist → assign from the member list → the assignee's "what I can do here" shows the capability → the assignee's own escalation attempt refused in place) and the last-Steward refusal (chip stays).
- **Gates:** full unit **289/289** (48 suites); integration **160/160** (27 suites, the PC011 session run — no substrate change since); full E2E **40/40** — after a found-and-fixed suite-isolation break: this spec initially rode the shared storageState session, whose single refresh token is contended by parallel workers and revoked globally by profile.spec's sign-out journey (two cross-spec failures); rewritten onto a dedicated spec-created steward FIM in its own context (the H013 second-FIM precedent, extended), after which the full suite is green including profile. `next build` clean (the type gate); lint 0 errors (one pre-existing warning).
