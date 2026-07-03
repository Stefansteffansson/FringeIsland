# FEAT-H013: Group creation & stewardship surfaces — create a group, see it whole, and steward its settings

---
id: FEAT-H013
title: Group creation & stewardship surfaces — the create-group flow, the group detail page with lifecycle-status rendering and visibility-honest member list, and the permission-gated settings editor (GRP-1/2/3/5 + GRP-4 completion)
owner: hub
consumers: []
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

The Hub's Groups area today is exactly one read: the `/groups` list (FEAT-H001, GRP-4's list half). A member can *see that* they belong to groups but cannot **create** one (GRP-1), **open** one (GRP-4's detail half), see its **lifecycle status** (GRP-5), or **steward** its name, description, or visibility (GRP-2/GRP-3). Groups are the primary social container (§L3 A-GRP intro) — without creation and detail, nothing downstream (roles, invitations, membership) has a place to happen.

The platform half now exists as [FEAT-PC010](../../../platform/core/features/FEAT-PC010-group-creation-and-settings-contracts.md) (Cycle G-A, the first PC-3 feature): `create_engagement_group()`, `get_group_detail()` (with viewer capability flags), `update_group_settings()`. This is the Surface consuming them API-first (ADR-U009): the Hub renders and relays; every rule lives in the substrate (ADR-U038).

## Solution sketch

Three surface pieces + the BFF plumbing, all on established house patterns:

- **Create-group flow** on `/groups`: a "Create group" affordance opening the create form (name required; description/label optional; the two visibility toggles with honest copy, defaulting private/list-shown per the contract defaults). Submit → `POST /api/groups` → on success navigate to the new group's detail (re-read, never optimistic). v1 offers **no template picker** — the contract's default role set applies (PC010 Open Q1); the affordance is hidden for Mists (nav + deep-link redirect, the house gate) and follows the FEAT-H006 account-state gate posture for suspended members (the contract refuses regardless).
- **Group detail page** `/groups/[id]`: renders the PC010 detail payload — group fields; a **status badge** (GRP-5: `active` unadorned; `closed` / `archived` / `suspended` visibly distinct, tolerant of unknown future values — render, don't switch-exhaustively); `member_count`; the **member list** exactly as the payload provides it (display names + joined-at; when the contract omits it, the page shows the count with "member list hidden" honesty — never a client-side guess); an **Edit settings** affordance shown iff `viewer.can_manage_settings` (capability flag from the payload — the Hub never computes permissions). Non-member on a private group → the BFF's 404 → the house not-found rendering (indistinguishable from absent, matching the contract's no-leak rule). No enrolment summary — that slot fills at the Journeys area (plan seam).
- **Settings editor** (on the detail page, permission-gated): name/description/label fields + the two **independent** visibility toggles (GRP-3 — separate controls, separate copy: "Who can find this group" vs "Who can see the member list"). Save → `PATCH /api/groups/[id]` (partial update) → re-read; failures non-destructive (form keeps state, error surfaced). Plain save — no ConfirmModal (nothing destructive in G-A).
- **BFF routes** — `POST /api/groups` (create), `GET /api/groups/[id]` (detail; **Edge + `dub1`**, ADR-U036 — a member-facing hot read), `PATCH /api/groups/[id]` (settings; standard runtime). `@supabase/ssr` cookie auth; SQLSTATE→HTTP (`42501`→403, `P0002`→404, sessionless→401); content-free telemetry (`group.created`, `group.detail_loaded`, `group.settings_updated`, failure variants — group id for correlation, never member display data). Private BFF per ADR-U038 — no rule lives only here.

The existing `/groups` list stays on `get_member_groups()` (already a single consolidated RPC — the P2 perf item was realized by the API-boundary tranche); this feature only adds the row → detail navigation.

## Appetite

Medium-plus — the largest Hub cycle so far by surface count (a flow, a page, an editor, three routes), but zero novel mechanism: every piece is an established pattern (journal-pattern gate, mutation-re-read, ConfirmModal-free forms, Edge hot reads). If it swells, the label field and the create-form's optional fields are the first cuts (additive later).

## Rabbit holes

- **Don't compute permissions client-side.** The `can_manage_settings` flag is the only gate the UI reads; no `has_permission` calls from the Hub, no role-string branching (products-tier rule).
- **Don't restyle the world.** The detail page composes existing primitives (cards, badges, forms from `components/ui/`); a "group page design system" is not this cycle.
- **Don't build member management.** The member list renders names — no kick/invite/role affordances (G-B/G-C/G-D); resist every "while we're here" on that list.
- **Don't cache-cleverly.** Detail is fetched on navigation and re-read after mutations — no client store, no optimistic updates (house pattern; the list's `refreshNavigation` event covers the created-group case).
- **Don't promise discovery.** `is_public` affects *access*, not *findability* — there is no browse/search surface in G-A (A-DIS later); copy must not imply one.
- **Status badge is vocabulary-tolerant.** Render the string with known-status styling; an unknown status renders plainly rather than crashing an exhaustive switch (the CHECK can grow — ADR-U018 narrowing).

## No-gos

- No invitations, no join/leave, no member removal, no role management, no act-as selector (G-B/G-C/G-D scope).
- No group deletion, closure, archiving, or any status *transition* — G-A renders status only (G-E/A-ADM).
- No avatar upload (no storage pipeline; `avatar_url` unused in v1), no template picker UI, no group browse/search/discovery.
- No Mist surface (nav hidden + deep-link redirected — contracts are FIM-only).
- No realtime (no A-GRP §L3 realtime row; liveness rides the future Notifications tenant, ADR-U039), no notifications (no V3 on G-A rows).
- No DS-3 enrolment summary on the detail page (Journeys-area seam, per the plan).

## Stories

### STORY-1: Create a group and land in it (GRP-1)
As a FIM, I want to create an engagement group from my groups page, so my community has a container.

**Acceptance criteria:**
- Given an active FIM on `/groups`, when they choose Create group, fill a name, and submit, then the group is created via `POST /api/groups`, and they land on the new group's detail page showing them as its (sole) member with stewarding affordances present.
- Given the create form, when they submit without a name, then the form blocks with a clear message and nothing is sent (defense-in-depth only — the contract is the enforcement).
- Given the newly created group, when they return to `/groups`, then the list (re-read) includes it.
- Given a Mist, when they visit `/groups` or deep-link the create flow, then the affordance is absent and the deep link redirects (house gate).
- Given the platform refuses creation (e.g. suspended account), when the error returns, then the form surfaces it non-destructively — no partial UI state pretends success.

### STORY-2: See a group whole (GRP-4 detail · GRP-5 status)
As a FIM, I want to open a group and see what it is, its lifecycle status, and who's in it — exactly as much as I'm allowed to see.

**Acceptance criteria:**
- Given an active member, when they open `/groups/[id]` from their list, then they see name, description, label, the status badge, member count, and the member list (display names + joined-at, as the payload provides).
- Given a group with status `closed`, `archived`, or `suspended`, when the page renders, then the badge is visibly distinct from `active`; an unrecognised status value renders without crashing.
- Given a non-member opening a **public** group's detail, when the payload omits the member list (`show_member_list = false`), then the page shows the member count with honest "member list hidden" copy — no client-side inference.
- Given a non-member deep-linking a **private** group — or anyone deep-linking a nonexistent id — when the BFF returns 404, then the house not-found rendering shows, indistinguishable between the two cases.
- Given a sessionless visitor deep-linking a detail page, when the gate fires, then they are sent to login and returned after signing in.

### STORY-3: Steward the settings (GRP-2)
As a group Steward, I want to edit the group's name, description, and label, so the container stays truthful as the group evolves.

**Acceptance criteria:**
- Given a viewer whose payload carries `can_manage_settings = true`, when they open Edit settings, change the name, and save, then `PATCH /api/groups/[id]` sends only the changed fields, the page re-reads, and the new name shows.
- Given a viewer without the flag, when the detail renders, then no edit affordance exists; given they craft the PATCH anyway, then the 403 surfaces an honest error (the contract refused — the UI was never the gate).
- Given a failed save (network, 403, 404), when the error returns, then the form keeps its state and the page's rendered data stays at the last-read truth.

### STORY-4: The two visibilities, independently (GRP-3)
As a group Steward, I want group visibility and member-list visibility as two separate controls, so I can run a findable group with a private roster or an invisible group with an open one.

**Acceptance criteria:**
- Given the settings editor, when the Steward toggles group visibility and saves, then only `is_public` changes — the member-list toggle's state is untouched (and vice versa).
- Given the two toggles, when the editor renders, then each carries its own copy naming what it governs ("group visibility" vs "member-list visibility") — never one combined switch.
- Given a Steward flips `show_member_list` off, when a non-member next loads the public group's detail, then the member list is gone from *that* render (server-decided; no stale client cache).

### STORY-5: Meaningful actions leave a trace (V4)
As the platform, I want every G-A surface action observable, so group-creation and stewarding behaviour can be measured and failures diagnosed.

**Acceptance criteria:**
- Given a successful create / detail load / settings save, when the route completes, then a structured telemetry event fires (actor, group id, outcome) — content-free (no names, descriptions, or member data in events).
- Given any refused or failed call, when the route returns, then a failure-variant event fires with the mapped status — refusals are never silent.

## Platform dependencies

- **[FEAT-PC010](../../../platform/core/features/FEAT-PC010-group-creation-and-settings-contracts.md)** — all three contracts + the viewer capability flag + the write-narrowing (schema gate lands platform-side; this feature carries no migration).
- **Existing:** `get_member_groups()` (the list read, FEAT-H001), the FIM-only page-gate pattern (journal/sessions precedent), the FEAT-H006 account-state gate posture, Edge+`dub1` BFF conventions (ADR-U035/U036/U037/U038), `components/ui/` form/badge/card primitives.

## Cross-product impact

The **Gimbal** consumes the same PC010 contracts for its group surfaces; the capability-flag pattern (`can_manage_settings` in the payload) keeps every permission decision platform-side so surfaces stay presentation-only. Nothing here is Hub-specific except the page/flow composition. The created-group container is what every later area (Journeys enrolment, Communication forums, Notifications) attaches to.

## Vertical impact

- **Privacy/GDPR:** renders member identity strictly as the platform resolves it (display names from the display-identity substrate); the member list appears only when the contract provides it; member data never enters telemetry. The visibility toggles are member-facing privacy controls with honest copy.
- **Notifications:** None — no V3 on the G-A §L3 rows; group-event notifications are A-NTF scope (ADR-U039 doctrine) and G-A actions are self-originated.
- **Administration:** stewarding affordances are capability-gated and wrapped in named flows (products-tier rule: no raw primitives); lifecycle states render distinctly so an admin hold (`suspended`) is visible in place; no admin actions ship here.
- **Observability:** STORY-5 — content-free structured events on every meaningful action and failure; the 403/404 mappings keep substrate refusals diagnosable end-to-end.
- **Transactions:** None.
- **Extensibility:** status rendering is vocabulary-tolerant (no exhaustive switch); the settings form renders the contract's updatable set (additive fields extend it); the detail page composes shared primitives rather than minting group-only ones.
