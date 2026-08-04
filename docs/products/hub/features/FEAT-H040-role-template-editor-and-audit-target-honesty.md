# FEAT-H040: The role-template editor and audit-target honesty — /admin/roles learns clone, draft, preview, apply; the audit log names its targets; force sign-out reaches the device

---
id: FEAT-H040
title: The role-template editor (/admin/roles per RB-4 — clone / draft / diff-preview / apply-and-rollback ceremonies over the FEAT-PC025 contracts, catalogue read-only) + the WA-2 audit-target rendering + the WA-4 instant-sign-out verification and honesty-copy softening
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

ADM-F's surface half. ADM-17 (Hub §L3: "Render and manage role templates and the permission catalogue (DeusEx-scope CRUD)") re-scoped into Ferd at the area-gate close (2026-08-02) and narrowed by the ratified RB-4 skeleton: only role *templates* get an editor — the catalogue renders read-only (atoms code-owned); the §L3 ADM-13 dependency is waived by the board default (the audit log + RB-4's diff-carrying audit rows cover verification in Ferd). The [substrate dossier](../../../planning/hub-v2/2026-08-04-admf-substrate-dossier.md)'s Hub walk grounds every premise:

1. **No roles admin surface exists** (`app/admin/` = page, audit/, groups/, members/, moderation/ — verified), and the dashboard's nav is 4 hardcoded cards (`AdminDashboard.tsx:173,183,195,215`) — `/admin/roles` needs the 5th.
2. **The member-plane grant idiom is proven and reusable:** `RolesPanel.tsx` renders `grant-toggle-${p.name}` checkboxes over a catalogue that rides the payload (`RolesFabric.available_permissions` — the Hub never computes permissions), with the Template/Custom badge keyed on nullable `created_from_role_template_id`. The editor borrows the idiom, not the component — this is the admin plane over *templates*, not a group's live fabric.
3. **WA-2's surface target:** `AdminAuditLog.tsx` renders `{r.target}` as raw truncated mono (`:225`) — member targets are uuids, "impossible for humans to understand" (the walk). The resolution rides the re-issued contract (server-side, the actor precedent); the surface renders the resolved form and moves the raw value into the existing `<details>` metadata idiom.
4. **WA-4 expects no Hub change, with one constraint verified:** the session-guard tenant is app-wide (`useSessionGuard` at `AuthContext.tsx:270`, AuthProvider wraps the root layout) and acts on a matching `session_id` via verify-on-signal — the platform's per-session hints reach it as-is. What the Hub owes: the verification cell, and the force sign-out ceremonies' refresh-layer honesty copy softening once instant sign-out is proven.
5. **`ConfirmModal.message` is `ReactNode`-capable since H039** — the diff preview renders inside the house confirmation primitive; no fork needed.

## Solution sketch

Surface half of cycle ADM-F, consuming [FEAT-PC025](../../../platform/core/features/FEAT-PC025-role-template-editing-and-walk-rider-contracts.md) API-first; **no migration of its own**. Born under the COR-C lattice (tokens, jest-axe, route-policy + outer-ring, red-first unit); mutations on `getUser()`, reads on `getVerifiedUserId()` (ADR-U037).

- **The fifth card + `/admin/roles`.** The dashboard gains the Roles card; the route renders two panes from one composed BFF read (`GET /api/admin/roles` → `admin_get_role_templates`): the **template list** (name, seeded badge on `is_system`, default version, version count, composition refs, instantiated-roles count) and the **catalogue browser** — read-only, category-grouped, protected badges, no write affordance of any kind. As-of + Refresh from `generated_at` (the H034 idiom — house parity).
- **Template detail** (`GET /api/admin/roles/[id]` → `admin_get_role_template_detail`): the version history (default pointer marked, `created_by` and dates), and — for non-seeded templates — the **draft editor**: name/description fields + the checkbox fabric over the catalogue (borrowing the `grant-toggle-${name}` idiom). Seeded templates render read-only with **Clone as the only action** — no edit affordances exist to refuse.
- **The ceremonies** (all through `ConfirmModal`, refusals verbatim, list/detail repaint from a fresh read — never optimistic):
  - **Clone** (`POST /api/admin/roles/[id]/clone`): names **both consequences** in the confirm — the clone appears in every member's group-creation options, and rides every future group created without a chosen template.
  - **Save draft** (`POST /api/admin/roles/[id]/versions`): appends a version; the copy states nothing changes until Apply.
  - **Apply / Rollback** (`POST /api/admin/roles/[id]/default`): one ceremony, danger variant — the **diff preview**: added/removed permission lists (client-computed presentation over the detail payload), name change if any, and the blast-radius line from payload facts ("N existing group roles keep their snapshot; future groups instantiate the new set"). Rollback is the same ceremony pointed at an older version, diff reversed.
- **WA-2 rendering:** the audit browser renders `target_display_name` (+ email for member targets) where it renders the raw `target` today; literals and unresolved targets render as-is; the raw value joins the expandable metadata `<details>`. No client join — resolution rides the contract.
- **WA-4 verification + copy:** the E2E cell proves the signed-in device signs out within seconds of admin force sign-out (the tenant's verify-on-signal path); once proven, the force sign-out ceremony copy (single and bulk) softens its refresh-layer hedge — the device finds out fast, like self-service revocation.
- **WA-3 surface cell:** the hard-delete ceremony copy is already honest (full erasure); what the surface owes is the pin that a **consented** member's hard delete now completes through the console (the generic-500 path dies with the platform fix).

## Appetite

Small cycle — one new route group + detail view, one card, three ceremony routes, one audit-row render change, one copy softening. Every pattern is proven (H034 As-of/Refresh, H035/H036 detail + ceremony shape, H037 audit rows, RolesPanel checkbox fabric, H039 ReactNode confirm). The care points are ceremony honesty (the clone's two consequences; the diff preview's completeness) — not volume.

## Rabbit holes

- **Don't fork the fabric idiom.** The draft editor borrows the checkbox pattern; it does not import the group-plane `RolesPanel` or its mutation wiring.
- **Don't compute permissions or diffs from Hub state.** The catalogue and both sides of every diff come from the payloads; the client only presents.
- **Don't build catalogue affordances.** No add/edit/protect toggles — read-only rendering is the whole catalogue surface.
- **Don't build a draft workspace.** A draft is an unapplied version in the history; no local persistence, no autosave, no draft-status chrome.
- **Don't pre-block the guard client-side.** The protected-set guard is the platform's refusal; the surface renders it verbatim if it ever fires (structurally unreachable in Ferd — no UI speculation about it).

## No-gos

No catalogue editing. No group-template surface. No template/version deletion affordances. No member-plane changes (the clone's visibility in group creation is contract behaviour, named in ceremony copy — zero Hub member-plane code changes). No new realtime consumption (WA-4 rides the existing session-guard tenant). No CSV export, no search over templates (four-plus rows; a list, not a census).

## Stories

### STORY-1: The fifth card and the honest list
- Given a platform admin, when they open `/admin/roles` (via the new dashboard card), then the template list renders every template with the seeded badge, default version, version count, composition refs, and instantiated-count, the catalogue browser renders all 48 rows grouped by category with protected badges and zero write affordances, the As-of line renders `generated_at` beside a working Refresh, skeleton per B6, failed loads show a visible error with Retry.
- Given a non-admin navigating directly, then the 404 shape — including on every new route.

### STORY-2: Clone, with both consequences on the ceremony
- Given a seeded template's detail, when the admin clones it, then the confirm names the new template's visibility in member group-creation options **and** its ride on template-less instantiation, the clone lands `is_system = false` with version 1 = the source's live set, and the list repaints from a fresh read; a duplicate name renders the platform's `22023` refusal verbatim.

### STORY-3: Draft, preview, apply — and rollback is the same door
- Given a clone's detail, when the admin edits the checkbox fabric and saves, then a new unapplied version appears in the history and the live state is visibly unchanged; when they Apply it, then the danger confirm shows the added/removed lists, any name change, and the blast-radius line from payload facts, and on confirm the default pointer moves and the detail repaints; when they Apply an older version, then the same ceremony renders the reversed diff — rollback without a special affordance.

### STORY-4: Seeds are immutable in the UI and at the door
- Given a seeded template's detail, then no draft editor, no save, no apply affordances render — Clone is the only action; and the pinned platform refusal (`P0001` on `is_system` writes) is asserted at the route tier so a UI regression can't silently re-open the door.

### STORY-5: The audit log names its targets (WA-2)
- Given audit rows whose targets are a member id, a group id, and a literal, when `/admin/audit` renders them, then the member row shows display name + email, the group row its name, the literal as-is, the raw value lives in the expandable metadata, and rows with null resolution (erased targets) render honestly with the raw value only.

### STORY-6: Force sign-out reaches the device (WA-4)
- Given a signed-in member on an untouched browser, when an admin force-signs-them-out (single or bulk), then the member's tab lands on `/login` within seconds (the session-guard hint path, not token expiry), and the ceremony copy states the instant behaviour — the refresh-layer hedge retired; a member with multiple sessions loses all of them.

### STORY-7: The last-resort tool works on the members it exists for (WA-3)
- Given a member with recorded consent decisions, when the admin completes the hard-delete type-to-confirm ceremony, then the operation completes through the console (no generic 500), the member is gone from the list on repaint, and the audit row renders with its resolved target per STORY-5.

### STORY-8: Wired, gated, observable
- E2E journey: elevate → roles card → clone a seed → edit the draft → apply with the diff preview → create a group without a chosen template and see the clone's role in it → rollback → audit rows carry the diffs → non-admin 404 on a ceremony route. Unit: axe-clean list/detail/ceremony/outcome states; route-policy + outer-ring green with zero exception entries; durable telemetry on every mutation route (content-free); refusals rendered verbatim pinned.

## Platform dependencies

FEAT-PC025 API-first — the two reads, three mutations, and three re-issues; walked key-by-key in its payload table. No other payloads change hands; the audit browser's other keys are the already-walked H037 read.

## Cross-product impact

Gimbal inherits the contracts, not the shell. Member-facing surfaces change behaviourally only through the contracts (clone visibility — deliberate, ceremony-named); zero member-plane Hub code changes.

## Vertical impact

- **Privacy/GDPR:** target emails render behind the same admin wall that already shows them on the members list; the WA-3 pin completes the erasure tool's console path; no new collection.
- **Notifications:** none — no new kinds; sanction communication stays the DB-4 Eid deferral.
- **Administration:** ADM-17's surface realized within RB-4 — ceremony weight on every state change (danger variant + diff preview + blast radius), seeds visibly immutable, verification-by-audit (the ADM-13 waiver's compensating control rendered real).
- **Observability:** durable telemetry on mutations; refusals verbatim; the As-of line makes staleness visible; the audit browser's target honesty is itself an observability win.
- **Transactions:** none.
- **Extensibility:** the ceremony routes derive from the contract family (a future door is one route + one list entry); category grouping and protected badges are data-driven (no hardcoded category or permission lists anywhere in the surface).

## Performance budget

- **First-paint class:** B2/B3 for `/admin/roles` and the detail — justified standalone reads (admin-only, ADR-U042 guardrail 3); payloads are small (4-ish templates, 48 catalogue rows).
- **Interaction class:** checkbox toggles, pane switches, and version selection are local state within B5 (100 ms feedback); ceremony submissions show busy states for the round-trip.
- **Loading states:** skeletons on both reads (B6); ceremonies disable-with-progress; nothing renders optimistic.

## Implementation notes (built 2026-08-04, Cycle ADM-F)

**Two tranches (the H039 apply-order-independence pattern), both red-first at the unit tier:**

- **Tranche 1 (PR #409, pre-apply):** the WA-2 shape-tolerant audit-target rendering — `AdminAuditRow` gained optional `target_display_name`/`target_email`, `AdminAuditLog` renders the resolved form with the raw uuid in the metadata details, unresolved rows regression-pinned to today's rendering. 2 red cells + 1 green control; 13/13 after; zero user-visible change pre-apply.
- **Tranche 2 (this close):** `/admin/roles` + detail + the fifth dashboard card + ceremonies + the WA-4 softening. Red demonstrated 2026-08-04 pre-implementation: `admin-roles-view.test.tsx` and `admin-role-template-detail.test.tsx` failed at import (components absent), the dashboard suite red on exactly the Roles-card cell (10 sibling pins green). Green after implementation: 37 cells across the three suites, including the first-paint call-count pins (exactly one composed read per page), the zero-write-affordance catalogue sweep, both clone consequences in the ceremony copy, the client-computed diff + blast-radius line from payload facts, refusals rendered verbatim, and axe-clean list/detail/ceremony/outcome states.

**Surface shape decisions within the spec's frame:** the detail BFF route composes `admin_get_role_template_detail` with the list read (catalogue + blast-radius facts) so the detail paints from ONE client request — presentation composition, both payloads platform-owned. Clone renders on seed details only (the draft editor is the non-seed door). The clone ceremony hosts its name input inside `ConfirmModal.message` (ReactNode, the H039 capability).

**Walk riders, proven then softened:**

- **WA-4:** the E2E cell proved the untouched signed-in device lands on `/login` within seconds of admin force sign-out (session-guard hint path — not token expiry). Only then was the copy softened, red-first: the single ceremony's refresh-layer hedge ("may stay signed in for a few minutes on its current token") retired for "Every session ends now and their open tabs sign out within seconds"; the bulk ceremony gained the instant line (force-logout only). The H036-era unit pin of the hedge was ADAPTED with the rationale in place.
- **WA-3:** the E2E cell hard-deletes a genuinely CONSENTED fixture through the console type-to-confirm — completes (no generic 500), member gone on repaint (the 404 shape), consent record surviving subject-anonymised in the substrate.
- **STORY-4 route pin:** an admin-session `POST /api/admin/roles/<seed>/versions` refuses 409 with the platform message verbatim ("Seeded role templates are immutable — clone, then edit the clone") — asserted via the journey's request context so a UI regression can't silently re-open the door.

**E2E (labelled test-after by the house rule — red-first lives at the unit + platform tiers):** an 11-cell serial journey (`admin-roles.spec.ts`): card → clone (both consequences) → draft (live default unchanged) → apply with diff preview → a template-less group carries the clone's role (created through the session's own `POST /api/groups` door, asserted in the substrate) → rollback (reversed diff) → audit rows carry added/removed diffs (substrate + browser) → WA-4 → WA-3 → the STORY-4 pin → demoted-operator 404 sweep. 11/11 green, leak instrument 0→0. Build-time discovery: seed template display names carry the "Role Template" suffix ("Steward Role Template"), not the bare role names.

**Gates:** route-policy + outer-ring conformance green with zero exception entries; durable content-free telemetry on all three mutation routes (actor + template uuid + counts, never names); mutations on `getUser()`, reads on `getVerifiedUserId()`; lint 0 errors; `next build` green; full unit sweep 1256/1256.

**Performance (ADR-U043):** no member-facing first-paint change anywhere. The two new pages are admin-plane justified standalone reads with the call-count pinned at 1 by unit cells; interactions are local state (B5); skeletons per B6. No deep-cold spot measurement was run this cycle — deliberately: the admin plane's cold class was measured at the A-ADM area gate (provisioning-dominated, the standing pre-launch exception) and these pages ride the same physics with smaller payloads; the next full pass lands at AB-6. Named here so the deferral is visible, not implied.
