# The Hub — Specification

---
slug: hub
owner: products/hub
status: active
last_updated: 2026-06-17
tier: Surfaces
tags: [product:hub]
feature_prefix: H
---

> The inward-facing build spec for the Hub. For developers who need to know how the thing actually works, what it depends on, and what its contracts are. Identity and "why" live in [`DESCRIPTION.md`](./DESCRIPTION.md) — don't repeat them here. Companion files: [`DESCRIPTION.md`](./DESCRIPTION.md) (outward-facing), [`ROADMAP.md`](./ROADMAP.md) (when written), [`features/`](./features/) (feature specs).

**Authorship note.** This file is authored across three decomposition levels (see [`.claude/skills/ecosystem-decomposition/SKILL.md`](../../../.claude/skills/ecosystem-decomposition/SKILL.md)). L2 owns the identity, boundaries, and technical shape (§L2 below). L3 owns the capability inventory (§L3). L4 owns the feature-inventory summary (§L4). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

**Current authorship state:** §L2, §L3 (capability inventory), and the §L4 feature-inventory summary are all authored. §L3 was re-grounded for the Hub v2 greenfield rebuild (ADR-U030) — see the §L3 intro and Sources-status block.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision and the ecosystem anatomy. Revised when the entity's boundaries, technical surface, or architectural position change.*

### 1. Surface

- **Platform target:** Next.js web application — server-rendered React with App Router.
- **Repo location:** [`Stefansteffansson/FringeIsland`](https://github.com/Stefansteffansson/FringeIsland) — a monorepo of surfaces ([ADR-U032](../../architecture/decisions/ADR-U032-hub-v2-coexistence-separate-tree.md)). The v2 Hub is built fresh under `hub/`; the frozen old-Hub oracle lives under `hub-legacy/`. Implementation paths (within `hub/`): `app/` (routes and pages), `components/` (shared UI), `lib/` (client-side utilities, Supabase clients, hooks).
- **Build / deploy pipeline:** Vercel preview deployments per pull request; production deploys from `main`. CI runs ESLint, TypeScript strict-mode checks, and unit tests on every PR (per [root `CLAUDE.md`](../../../CLAUDE.md) DoD).
- **Environments:**
  - **Development** — local against a Supabase project shared with preview.
  - **Preview** — Vercel preview URL per PR, against the development Supabase project.
  - **Production** — Vercel production URL, against the production Supabase project.
- **Tech stack:**
  - Next.js 16.1 with App Router (note: `proxy.ts`, not `middleware.ts`).
  - TypeScript in strict mode.
  - Tailwind CSS for styling.
  - Supabase client SDK (`sb_publishable_*` key format) — used only for the auth and realtime channels Hub is permitted to subscribe to (DM and notification-bell channels per Ferd scope), never for direct database queries (see §4).

### 2. Architecture position

Where the Hub sits in the ecosystem anatomy ([`../../architecture/ECOSYSTEM_ANATOMY_V5.svg`](../../architecture/ECOSYSTEM_ANATOMY_V5.svg), [ADR-U023](../../architecture/decisions/ADR-U023-platform-core-domain-services-decomposition.md)):

- **Tier:** Surfaces (Products).
- **Sibling Surfaces:** the Gimbal (the senses surface, planned; the Hub is the canvas surface — the two equipment profiles of the one experience, [ADR-U025](../../architecture/decisions/ADR-U025-products-as-equipment-profiles.md)), the Studios (World, Arc, and Journey Studios under Universe Studio as parent, [ADR-U026](../../architecture/decisions/ADR-U026-studio-decomposition-universe-studio-parent.md)), and the Design System (consumed for shared visual language).

**Domain services consumed (currently):**

| Domain service | What the Hub calls it for |
|---|---|
| Journeys | Journey enrollment, journey progress (start, pause, resume, leave, complete), content delivery to enrolled members |
| Content | Media and asset delivery (narrative blocks, images, embedded media within journeys) |
| Communication | Forums, direct messages (1-1 and group), activity feeds, notification delivery |

**Domain services not yet consumed** (will be consumed in later waves; see [`DESCRIPTION.md`](./DESCRIPTION.md) "Relationship to ecosystem"): World Model, Narrative, Discovery, Intelligence.

**Domain services not consumed by design:** Extension System (meta-module for runtime extension; not a product-surface concern).

**Platform Core capabilities used:**

| Platform Core area | What the Hub uses it for |
|---|---|
| PC-1 Infrastructure | Hosting, build pipeline, observability infrastructure, transactional substrate |
| PC-2 Identity | Authentication (sign-in, sign-out, session management), member profiles (display name, full name, avatar), the personal Journal, role identity |
| PC-3 Organisation | Groups (personal, engagement, system), memberships, role assignment, permission resolution (`has_permission()`) |
| PC-4 Governance | Audit log access (Steward and DeusEx UIs), content reporting, GDPR consent state, data export request flow, feature flags |

**Verticals it must satisfy:** all five (Administration · Privacy · Notifications · Observability · Transactions) per [ADR-U002](../../architecture/decisions/ADR-U002-five-cross-cutting-verticals.md). The tier-level obligations on the Hub for each vertical are stated in [`../CLAUDE.md`](../CLAUDE.md) "Verticals: obligations on this tier"; per-capability detail will live in §L3 once authored.

### 3. Authentication & authorization

**Sign-in surface.** Sign-in flows are owned by Platform Core / Identity (PC-2). The Hub renders the sign-in screen and surrounding navigation, but the credential exchange itself is a Platform API call. Mists (the anonymous entrants — the canonical name for what ADR-U004 calls visitors) arrive via anonymous session ([ADR-U004](../../architecture/decisions/ADR-U004-visitor-anonymous-sign-in.md)) — their activity and preferences accumulate against the anonymous session and transfer into a FIM account upon sign-up. The Hub treats Mist → FIM as a soft transition, not a wall. Per [ADR-U031](../../architecture/decisions/ADR-U031-mist-identity-lifecycle.md), the Mist's own generated data is ephemeral (erased after inactivity or explicit close — a Privacy-vertical / PC-2 configuration), and transcendence (metamorphosis) is the persistence-and-consent threshold: becoming a FIM is the one moment data binds durably — consent is captured and the session transfers into the FIM account atomically, with continuity (nothing restarts).

**Identity states and roles served by the Hub** (canonical taxonomy: [`docs/ecosystem/universe/roles/README.md`](../../ecosystem/universe/roles/README.md) — identity states Mist/FIM; per-group roles Steward/Guide/Participant/Observer; Dreamineer as the authorial mode; enterprise plane Universeers/Council/DeusEx):

| Identity state / role | Source of authority | Hub responsibility |
|---|---|---|
| **Mist** | Anonymous session (ADR-U004) | Browse, explore, begin participating; render the sign-up upgrade path |
| **FIM** | The base authenticated identity ("Member" is the platform-technical synonym) | Default authenticated experience — journeys, forums, messages, Journal, profile |
| **Steward** (per-group role) | Role granted via group leadership | FIM affordances plus group leadership UI (invite, role assignment, group enrollment, moderation) |
| **Guide** (per-group role) | Role granted within a group | FIM affordances plus joint-journey facilitation UI |
| **Participant** (per-group role) | Default per-group role (ratified rename of the group role "Member") | Takes part in the group's journeys and forums |
| **Observer** (per-group role) | Role granted within a group | Watches |
| **Dreamineer** (authorial mode) | Authority granted via group/role permission | FIM affordances plus cross-ecosystem community participation; their authoring lives in Studios, not the Hub |
| **DeusEx** (enterprise plane) | Membership in the DeusEx root-admin group | Universe-scope platform operations under governance-by-scope ([ADR-U028](../../architecture/decisions/ADR-U028-governance-by-scope.md)): content moderation and self-service exit stay woven in-place; the audit-log viewer, feature flags, and economy management route to **the Console** (surface status — own entity vs Hub-shell bundle — deferred per U028/U025) |

**Permission resolution.** The Hub never computes permissions locally. Every permission decision is a Platform API call through `has_permission(...)` (resolved in PC-3 Organisation). Per the tier rule in [`../CLAUDE.md`](../CLAUDE.md): UI branches on the *permission*, not on the role string. Roles can be renamed or reorganised; permissions are stable contracts. The three-layer permission model is locked by [ADR-U007](../../architecture/decisions/ADR-U007-three-layer-permission-model.md).

**Group-to-group memberships.** All memberships are group-to-group: a personal group joins an engagement group. The Hub renders group membership state through Platform API calls; it does not reason about membership chains locally. Transitive group resolution beyond depth 1 is currently not implemented platform-side (open spec question — see §8).

**Under-18 scope boundary.** The Hub does not serve users under 18 years of age. This is a hard scope boundary (see [`DESCRIPTION.md`](./DESCRIPTION.md) "Boundaries"). Sign-up flows enforce age attestation; the enforcement mechanism is owned by PC-2 Identity.

**`useAuth()` gotcha.** The Hub's auth context requires a client component. A server component that calls `useAuth()` returns silently empty rather than erroring — components that need the auth state must be marked `'use client'`. See [`../CLAUDE.md`](../CLAUDE.md) "Gotchas."

### 4. Data ownership

**Tables the Hub writes to: none.** [ADR-U009](../../architecture/decisions/ADR-U009-api-first-frontend-agnostic.md) (API-first, frontend-agnostic) prohibits direct database access from product surfaces. All writes go through the Platform API.

**Tables the Hub reads from: none directly.** All reads also go through the Platform API. The Hub's Supabase client is permitted to subscribe to specific realtime channels for the Ferd-scope features that need them — DM channels and the notification-bell channel — but does not query tables directly. Realtime channel subscription is therefore a narrow exception to "no direct database access," scoped to channel reads only (no row reads, no writes).

**Storage buckets / CDN paths.** Asset and media delivery is owned by the Content domain service. The Hub holds no storage buckets and no CDN paths of its own.

**Sync, offline, and caching strategy.** The Hub is online-only — Next.js server-rendered with client-side hydration. No offline mode is in scope for Ferd; SWR-style client caching of Platform API responses is acceptable where it improves perceived performance, but no persistent client-side data store is in scope. Realtime updates (DMs, notifications) flow through the Supabase realtime channels named above.

**Cross-component update mechanism.** Components that need to coordinate updates without sharing a parent (e.g., a navigation list refreshing after a role change made elsewhere) use the `refreshNavigation` custom event documented in [`../CLAUDE.md`](../CLAUDE.md). New cross-component coordination must check whether `refreshNavigation` already covers the case before inventing a new mechanism.

### 5. Public API surface

**The Hub exposes no public API.** It is a consumer surface — it calls the Platform API and renders results. Sibling Surfaces (the Gimbal, the Studios) consume the same Platform API directly; they do not call the Hub.

If a future need arises for the Hub to expose data or operations to a sibling Surface, that need would be implemented as a new Platform API capability rather than as a Hub-owned API. The discipline in [`../CLAUDE.md`](../CLAUDE.md) ("permissions come from Platform Core, not from product code") generalises: shared product behaviour belongs in Platform Core, not in any one product.

For the Platform API surface itself, see [`../../platform/`](../../platform/) and the relevant Platform Core component specifications when authored.

### 6. Cross-product contracts

The Hub's siblings are the Gimbal (the senses surface), the Studios (under Universe Studio), and the Design System.

**Contract pattern (locked at the tier level, see [`../CLAUDE.md`](../CLAUDE.md), and by [ADR-U025](../../architecture/decisions/ADR-U025-products-as-equipment-profiles.md)):** features are placed by equipment, not by product. Every feature spec declares `requires-equipment:` and appears on any device offering that equipment; the Hub carries the features keyed to canvas equipment. Where a feature is deliberately restricted, the restriction must be named by its equipment (e.g., `precision-input`), never by device, in the feature spec's No-gos section with rationale. Only shell features (navigation, rendering, packaging) are Hub-owned.

**Paired-spec discipline.** A Hub UI feature that depends on a new platform capability is two features: the Hub spec (`FEAT-H*`) consuming the capability, and the platform spec (`FEAT-PC*` or `FEAT-PD*`) providing it. Both reference each other in their "Platform dependencies" and "Cross-product impact" sections. Synchronisation between paired specs is currently a known gap (G-02) — there is no automatic mechanism that alerts the platform spec owner when the Hub-side acceptance criteria change.

**Currently named contracts.** None enumerated at this stage. Cross-product contracts will accumulate as features advance through maturity. They will be listed here once they exist as concrete commitments rather than as a discipline in the abstract.

**Design System consumption.** The Hub consumes the Design System's tokens, components, and patterns. Per the design-system tier rules, the Hub is committed to consuming Design System primitives over hardcoded styles, and the Design System is committed to honouring additive-over-breaking change discipline. Specific consumption commitments will be detailed in §L3 once both inventories are populated.

**Mists before FIMs.** Where a feature can be offered to Mists meaningfully, design for Mists first and let FIMs inherit. Anonymous sessions are first-class (ADR-U004). This is a tier-level rule that the Hub honours by default.

### 7. Operational concerns

**Observability.** Every meaningful user action emits a telemetry event per the Observability vertical's obligation on this tier (see [`../CLAUDE.md`](../CLAUDE.md) "Verticals: obligations on this tier"). Page views are the low bar; feature-level events (enrolled in journey, accepted invitation, left group, sent message) carry the signal. Error states emit observability events too — silent failures are a vertical-level violation, not just a product bug. The instrumentation primitives are owned by PC-1 Infrastructure; the Hub calls them.

**Feature flags.** Feature flags are part of the Ferd scope and are owned by PC-4 Governance. The Hub reads flag state through the Platform API and renders accordingly. Flag authoring (creating, toggling, scoping flags) is a DeusEx surface within the Hub but the storage and resolution live in PC-4.

**Audit log surface.** Steward and DeusEx UIs include audit log views per the Administration vertical's obligation. Audit log entries themselves are written by Platform Core (every action that mutates state writes an audit entry); the Hub renders a viewer over those entries.

**Notification preferences.** The Hub exposes the notification preferences UI and the inbox; notification copy and delivery are shared concerns owned by Communication and surfaced via the Notifications vertical. Realtime delivery to the Hub uses the notification-bell channel named in §4.

**Transactions.** The Hub may *initiate* transactions (enroll in a paid journey, accept a premium invite) but never *processes* them (Stripe integration, entitlement resolution, receipt handling all live behind the Platform API per the Transactions vertical's obligation).

**Known degradation modes.**
- Platform API unavailable → the Hub displays a degraded state; no offline-mode replacement exists in Ferd.
- Realtime channel disconnect → DM and notification UIs surface a reconnecting state; the rest of the Hub continues to function over polling.
- Supabase auth session expiry → the Hub redirects to sign-in and preserves the original destination URL where feasible.

**Backup and disaster recovery.** No Hub-owned data; recovery posture is inherited from Platform Core (PC-1 Infrastructure). The Hub itself is stateless server-rendering plus client hydration — recovery means redeploying the latest known-good build.

**Feature-flag-gated rollout.** New Hub features in Ferd are rolled out behind feature flags by default. The flag scope (per-user, per-group, percentage rollout) is decided per-feature in the feature spec.

### 8. Open spec questions

Listed in priority order. Each is a candidate for resolution by an ADR, a research spike, or a future authoring session.

- **The worlds cosmology naming — resolved (2026-06-10).** The Three Worlds model (*Ordinary World, Safe Harbour, The Other Side*) is superseded by the worlds topology in the cosmology core, [`docs/ecosystem/universe/cosmology/README.md`](../../ecosystem/universe/cosmology/README.md): the safe-harbour commons is **the village**, in the Beyond of the warm place. The Hub's user-facing copy and DESCRIPTION.md follow the cosmology core; this spec points there rather than restating the topology.

- **RBAC role-to-screen mapping.** The Hub renders different screens for Mists, FIMs, the per-group roles (Steward / Guide / Participant / Observer), Dreamineers, and DeusEx, but the per-screen permission requirements are not yet documented in any one place. Currently each component asks `has_permission(...)` for the specific permission it needs. A consolidated mapping (which roles see which screens) would strengthen the auth model's surface and ease onboarding. Candidate for an L3-scoped clarification once the capability inventory exists, or for a dedicated document.

- **Transitive group resolution beyond depth 1.** All memberships are group-to-group, and the schema supports group-in-group. But `has_permission()` only resolves at depth 1 today. Transitive resolution and circularity prevention are noted as upcoming work in the user-memory horizon. Hub features that would need transitive resolution must surface this in their Platform dependencies section until the platform capability exists.

- **Cross-product feature sync mechanism (G-02).** When a Hub feature spec's acceptance criteria change, no mechanism alerts the paired platform spec owner. The Hub's current mitigation is the paired-spec discipline (both specs reference each other), but the synchronisation is manual. Resolution belongs in a `doc-health-check` extension or in the `ecosystem-decomposition` skill — not Hub-specific.

- **Cross-product paired-spec naming convention.** Cross-product impact sections currently reference paired specs by `FEAT-H*` and `FEAT-PC*`/`FEAT-PD*` IDs. When those IDs do not yet exist (because the paired spec has not been written), the discipline for "draft a placeholder pair vs. wait until both are written" is undefined. Surfaced for a future decision.

- **Design System consumption commitments.** The Hub commits to consuming the Design System over hardcoded styles, but the specific consumption surface (which components, which tokens, which patterns) will only become concrete once both the Hub's L3 capability inventory and the Design System's L3 vocabulary inventory exist. No action this session.

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the entity enters active development, has its boundaries materially revised, or is affected by an architectural change. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

*This §L3 was authored in two phases per the code-informed stress-test pattern locked in [`../../planning/sessions/2026-04-30_01_-_CODE-INFORMED-STRESS-TEST-PATTERN.md`](../../planning/sessions/2026-04-30_01_-_CODE-INFORMED-STRESS-TEST-PATTERN.md): a cold-derivation pass produced the candidate capability inventory from L1 + L2 + DESCRIPTION + the eight-area decomposition; a stress-test pass against `docs/TMP/capabilities.md` (the Ferd-current synthesis of the OLDFEAT corpus — a scratch artifact from the 2026-04-30 authoring, no longer on disk) classified each capability's activation timing as current-commitment, partial forward-commitment within Ferd, or full forward-commitment beyond Ferd; an adjudication step reconciled the resulting delta. The candidate inventory survived empirical pressure without structural revision. The per-row forward-commitment annotations that pass produced were retired in the 2026-06-17 ADR-U030 re-grounding (the inventory is now anchor-neutral — see the note under "### Capabilities" below). See the Sources-status block for the methodology deliverables this authoring produced.*

### Capabilities

**Anchor-neutral inventory (re-grounded 2026-06-17, ADR-U030).** This inventory states *what the Hub should do* — full stop. It carries no implementation-status or activation-timing annotations. The earlier version (2026-04-30) tagged each row with a three-way forward-commitment marker anchored to *"implemented in the running system per `docs/TMP/capabilities.md`"* — i.e. the old Hub MVP. ADR-U030 retires that MVP (greenfield v2), so an "implemented in the running system" anchor no longer means "v2 has it." Per the [`ecosystem-decomposition`](../../../.claude/skills/ecosystem-decomposition/SKILL.md) skill's no-status rule (status is a reconciliation output, not a derivation output), that information now lives downstream: *does the old Hub do this?* → the **behaviour inventory**; *does the substrate support it?* → the **substrate audit**; *in what order does v2 build it?* → **ROADMAP** / wave-planning.

The template's prescribed five columns (Capability, Internal area, Depends on (internal), Depends on (external), Vertical impact) are joined by two columns added per a deliberate template deviation locked in the B.2 resumption bridge: **Founding question(s) served** (one or more of *Who am I? · What do I want? · How do I get there?* per VISION.md) and **Dimension(s) engaged** (one or more of *1 · 1+1 · 1+Community* per VISION.md's Three Dimensions). Both columns make Vision traceability explicit at the row level. The deviation is flagged in the Sources-status block as a candidate for template-wide elevation when the next entity-L3 derivation runs.

#### A-IDN — Identity, Onboarding & Profile (12 capabilities)

The Hub provides each person — Mist or FIM — with a stable, persistent identity, with a soft conversion path from Mist to FIM, and with a private workspace for reflection that no one but the FIM can see. Privacy and consent capabilities are interleaved into A-IDN rather than living in a separate area; see the Sources-status block for the OQ-1 disposition.

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Founding question(s) | Dimension(s) | Vertical impact |
|---|---|---|---|---|---|---|---|
| IDN-1 | Provide anonymous Mist identity on arrival | A-IDN | — | PC-2 (anonymous session per ADR-U004), PC-3 (proto personal group) | Who am I? | 1 | V2, V4 |
| IDN-2 | Convert Mist to authenticated FIM identity | A-IDN | IDN-1 | PC-2, PC-3, PC-4 (consent capture at transcendence per ADR-U031), DS-3 (triggers carry-over of in-flight journey enrolment owned by JRN-5) | Who am I?, What do I want? | 1 | V2, V3, V4 |
| IDN-3 | Provide authenticated, persistent FIM identity (sign in, sign out, refresh) | A-IDN | IDN-2 | PC-2 | Who am I? | 1 | V2, V4 |
| IDN-4 | Render and edit member profile (full name, avatar, bio, display name) | A-IDN | IDN-3 | PC-2, PC-3 (display name and personal group naming are coupled) | Who am I? | 1 | V2, V4 |
| IDN-5 | Provide private personal Journal surface | A-IDN | IDN-3 | PC-2 (Journal primitive) | Who am I?, What do I want? | 1 | V2, V4 |
| IDN-6 | Render member-visible consent state and consent history | A-IDN | IDN-3 | PC-4 | Who am I? | 1 | V2, V4 |
| IDN-7 | Update granular consent decisions and sharing controls | A-IDN | IDN-6 | PC-4, PC-3 | Who am I? | 1, 1+1, 1+Community | V2, V4 |
| IDN-8 | Request and receive complete data export | A-IDN | IDN-3 | PC-4 | Who am I? | 1 | V2, V4 |
| IDN-9 | Render account state to the member (active / deactivated / decommissioned) | A-IDN | IDN-3 | PC-2, PC-4 | Who am I? | 1 | V1, V4 |
| IDN-10 | Initiate self-service exit / deletion request | A-IDN | IDN-3, IDN-9 | PC-2, PC-4, PC-3 (group-membership cascade), DS-3 (enrolment freeze trigger), DS-5 (forum content disposition) | Who am I? | 1, 1+1, 1+Community | V1, V2, V3, V4 |
| IDN-11 | Render and manage per-device sessions (active sessions list, remote sign-out) | A-IDN | IDN-3 | PC-2 (session inventory and remote-sign-out RPC — cross-entity finding routed to G-29) | Who am I? | 1 | V2, V4 |
| IDN-12 | Self-service account reactivation | A-IDN | IDN-9 | PC-2 (state transition), PC-4 (audit) | Who am I? | 1 | V1, V2, V4 |

#### A-GRP — Groups & Belonging (19 capabilities)

Groups are the primary social container per DESCRIPTION.md. The Hub lets a member create, configure, and inhabit groups, manage their membership and roles, and exit gracefully when their participation ends — with multiple lifecycle paths so that nothing is destroyed unnecessarily. Steward operations within group scope live in A-GRP; DeusEx-scoped admin operations live in A-ADM.

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Founding question(s) | Dimension(s) | Vertical impact |
|---|---|---|---|---|---|---|---|
| GRP-1 | Create an engagement group (creator becomes Steward) | A-GRP | IDN-3 | PC-3 | What do I want?, How do I get there? | 1+Community | V1, V4 |
| GRP-2 | Edit group settings (name, description, branding) | A-GRP | GRP-1 | PC-3 | What do I want? | 1+Community | V1, V4 |
| GRP-3 | Configure group visibility and member-list visibility independently | A-GRP | GRP-1 | PC-3 | What do I want? | 1+Community | V2, V4 |
| GRP-4 | Render member's group list and group detail view | A-GRP | IDN-3 | PC-3, DS-3 (enrolment summary in detail view) | Who am I?, What do I want? | 1+Community | V2, V4 |
| GRP-5 | Display group lifecycle status (active / closed / archived / suspended) | A-GRP | GRP-1 | PC-3 | What do I want? | 1+Community | V4 |
| GRP-6 | Apply foundational role templates and define custom roles within a group | A-GRP | GRP-1 | PC-3 | What do I want? | 1+Community | V1, V4 |
| GRP-7 | Manage member roles (assign / remove / change) | A-GRP | GRP-1, GRP-6 | PC-3 | What do I want? | 1+1, 1+Community | V1, V3, V4 |
| GRP-8 | Render "act as" context selector and effective permissions for the current actor | A-GRP | GRP-4 | PC-3 (canonical permission resolution) | Who am I?, How do I get there? | 1, 1+Community | V4 |
| GRP-9 | Delete an engagement group (Steward action, distinct from MEM-8 last-member closure on intent grounds) | A-GRP | GRP-1, GRP-7 | PC-3, DS-3 (cascade enrolment freeze), DS-5 (forum content disposition) | What do I want? | 1+Community | V1, V2, V3, V4 |
| MEM-1 | Invite an existing FIM to a group (with member search) | A-GRP | GRP-1, GRP-6 | PC-3, DS-6 (member search) | What do I want? | 1+Community | V1, V2, V3, V4 |
| MEM-2 | Invite a non-FIM by email (pending invitation, auto-claim on signup) | A-GRP | GRP-1, GRP-6 | PC-3, PC-2 (auto-claim binding), V3 (outbound channel) | What do I want? | 1+Community | V1, V2, V3, V4 |
| MEM-3 | Accept or decline an invitation | A-GRP | MEM-1 or MEM-2 | PC-3 | What do I want? | 1+Community | V3, V4 |
| MEM-4 | Pause or activate a member's group participation | A-GRP | GRP-6 | PC-3 | What do I want? | 1+Community | V1, V3, V4 |
| MEM-5 | Remove a member from a group (Steward action) | A-GRP | GRP-6 | PC-3, DS-3 (enrolment freeze) | What do I want? | 1+Community | V1, V3, V4 |
| MEM-6 | Voluntary leave (regular) | A-GRP | IDN-3, GRP-4 | PC-3, DS-3 (enrolment freeze), DS-5 (former-member attribution) | Who am I?, What do I want? | 1+Community | V2, V3, V4 |
| MEM-7 | Voluntary leave with leadership transfer (sole-leader handover or nominated succession) | A-GRP | IDN-3, GRP-4, GRP-7, MEM-6 | PC-3, DS-3 (enrolment freeze), V3 (succession notifications, nominee expiry), ADM-* (DeusEx-fallback for sole-leader handover) | Who am I?, What do I want? | 1+1, 1+Community | V1, V2, V3, V4 |
| MEM-8 | Last-member group closure with content reassignment | A-GRP | MEM-6 | PC-3, DS-3 (mass enrolment freeze + reassignment), DS-5 (forum preservation or sentinel-author reassignment), DS-4 (asset disposition) | What do I want? | 1+Community | V1, V2, V3, V4 |
| MEM-9 | Display "former member" attribution after exit | A-GRP | MEM-5, MEM-6, MEM-7, MEM-8, GRP-9 | PC-3, DS-5 (content authorship layer) | What do I want? | 1+Community | V2, V4 |
| MEM-10 | Engagement group joins another engagement group (group-of-groups) | A-GRP | GRP-1, GRP-6 | PC-3 (transitive resolution beyond depth 1 — open spec question per §L2 §8; cross-entity finding routed to G-29) | What do I want? | 1+Community | V1, V4 |

#### A-JRN — Journeys (18 capabilities)

Journeys are the primary developmental experience per VISION.md. The Hub renders journeys (player surface, catalogue, progress display) while narrative content and step semantics live in DS-3 + DS-2 + DS-4. Journey Zero is no longer modelled as a special journey — only its first-arrival auto-launch trigger is Hub-side; the journey itself is walked through JRN-6..JRN-11.

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Founding question(s) | Dimension(s) | Vertical impact |
|---|---|---|---|---|---|---|---|
| JRN-1 | Browse journey catalogue (member-initiated browsing operation) | A-JRN | DIS-1 | DS-3, DS-6 | What do I want?, How do I get there? | 1, 1+Community | V2, V4 |
| JRN-2 | View journey detail | A-JRN | JRN-1 | DS-3, DS-4 (preview content) | What do I want?, How do I get there? | 1, 1+Community | V2, V4 |
| JRN-3 | Enrol self in a journey (individual) | A-JRN | IDN-3, JRN-2 | DS-3, PC-3 (personal group as enrolling entity) | What do I want?, How do I get there? | 1 | V2, V3, V4 |
| JRN-4 | Enrol an engagement group in a journey | A-JRN | GRP-1, GRP-8, JRN-2 | DS-3, PC-3 | What do I want?, How do I get there? | 1+Community | V2, V3, V4 |
| JRN-5 | Preserve in-flight journey enrolment across Mist→FIM conversion | A-JRN | JRN-3, IDN-2 | DS-3 (anonymous-session enrolment carry-over), PC-2 (session binding) | How do I get there? | 1 | V2, V4 |
| JRN-6 | Render the journey player | A-JRN | JRN-3, JRN-4 | DS-3, DS-4 | How do I get there? | 1, 1+Community | V2, V4 |
| JRN-7 | Walk steps with linear navigation (previous / next) | A-JRN | JRN-6 | DS-3 | How do I get there? | 1, 1+Community | V4 |
| JRN-8 | Mark step complete and enforce required-step gating | A-JRN | JRN-6 | DS-3 | How do I get there? | 1, 1+Community | V4 |
| JRN-9 | Auto-save progress on every navigation and interaction | A-JRN | JRN-6 | DS-3 | How do I get there? | 1, 1+Community | V4 |
| JRN-10 | Resume from last position on return | A-JRN | JRN-9 | DS-3 | How do I get there? | 1, 1+Community | V4 |
| JRN-11 | Track per-step time and total elapsed | A-JRN | JRN-6 | DS-3 | How do I get there? | 1, 1+Community | V2, V4 |
| JRN-12 | Detect and mark journey completion when all required steps done | A-JRN | JRN-8 | DS-3 | How do I get there? | 1, 1+Community | V3, V4 |
| JRN-13 | Render review mode for completed journeys | A-JRN | JRN-12 | DS-3, DS-4 | Who am I?, How do I get there? | 1, 1+Community | V4 |
| JRN-14 | Render frozen-enrolment read-only mode with explanation | A-JRN | JRN-6, MEM-* (cross-area dependency on the membership-lifecycle exit cluster) | DS-3 (frozen-state semantics), PC-3 (group-context-disappearance trigger) | How do I get there? | 1+Community | V2, V3, V4 |
| JRN-15 | Detect first-arrival state and auto-launch a designated journey | A-JRN | IDN-3 | DS-3 (enrolment trigger), PC-2 (first-arrival state from session history) | Who am I? | 1 | V3, V4 |
| JRN-16 | Render group-level progress (role-gated) | A-JRN | JRN-4, GRP-8 | DS-3, PC-3 | How do I get there? | 1+Community | V2, V4 |
| JRN-17 | Render per-member progress within a group (role-gated, privacy-respecting) | A-JRN | JRN-4, GRP-8 | DS-3, PC-3, PC-4 (visibility consent) | How do I get there? | 1+Community | V2, V4 |
| JRN-18 | Render every foundational step type DS-3 publishes | A-JRN | JRN-6 | DS-3 (step-type catalogue authority), DS-4 (step content) | Who am I?, What do I want?, How do I get there? | 1, 1+1, 1+Community | V2, V4 |

#### A-COM — Communication & Community (15 capabilities)

Communication spans 1+1 (DM), 1+Community (forum), and 1→many (announcements), with real-time delivery and graceful handling of historical authorship across membership changes. A-COM serves *What do I want?* exclusively — communication is a destination dimension, not a directional one; this is structurally honest, not a derivation gap (see Sources-status, methodology observation #5).

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Founding question(s) | Dimension(s) | Vertical impact |
|---|---|---|---|---|---|---|---|
| COM-1 | Send a direct message to another FIM | A-COM | IDN-3 | DS-5, PC-3 (personal group as author) | What do I want? | 1+1 | V1, V2, V3, V4 |
| COM-2 | Render conversation inbox | A-COM | COM-1 | DS-5 | What do I want? | 1+1 | V2, V4 |
| COM-3 | Render conversation detail with chronological history | A-COM | COM-2 | DS-5 | What do I want? | 1+1 | V2, V4 |
| COM-4 | Track per-conversation read state | A-COM | COM-3 | DS-5 | What do I want? | 1+1 | V4 |
| COM-5 | Render group forum surface | A-COM | GRP-1, GRP-8 | DS-5, PC-3 | What do I want? | 1+Community | V1, V2, V4 |
| COM-6a | Post top-level forum message (role-gated) | A-COM | COM-5 | DS-5, PC-3 | What do I want? | 1+Community | V1, V3, V4 |
| COM-6b | Reply to forum message (role-gated) | A-COM | COM-5, COM-6a | DS-5, PC-3 | What do I want? | 1+Community | V1, V3, V4 |
| COM-7 | Moderate forum content (role-gated to Steward) | A-COM | COM-5, COM-6a, COM-6b | DS-5, PC-3 | What do I want? | 1+Community | V1, V4 |
| COM-8 | Send a Steward announcement to a group (1→many) | A-COM | GRP-8 | DS-5, V3 (delivery to group members) | What do I want? | 1+Community | V1, V3, V4 |
| COM-9 | Send a platform-wide admin announcement (1→all) | A-COM | A-ADM | DS-5, V3 | What do I want? | 1+Community | V1, V3, V4 |
| COM-10 | Receive real-time updates for messages, forum posts, and activity events | A-COM | COM-1, COM-5 | DS-5 (real-time primitive), PC-1 (Supabase realtime channel infrastructure — load-bearing per §L2 §4) | What do I want? | 1+1, 1+Community | V4 |
| COM-11 | Reconcile missed messages and forum updates on reconnect | A-COM | COM-10 | DS-5 | What do I want? | 1+1, 1+Community | V4 |
| COM-12 | Edit or delete own message or post within configurable window | A-COM | COM-1, COM-6a, COM-6b | DS-5 | What do I want? | 1+1, 1+Community | V2, V4 |
| COM-13 | Submit content report from forum or DM surface | A-COM | COM-3, COM-6a, COM-6b | DS-5, PC-4, A-ADM (moderation queue) | What do I want? | 1+1, 1+Community | V1, V2, V4 |
| COM-14 | Render former-member attribution at content-display layer | A-COM | MEM-9, COM-3, COM-5 | DS-5, PC-3 | Who am I?, What do I want? | 1+1, 1+Community | V2, V4 |

#### A-NTF — Notifications & Inbox (10 capabilities)

Notifications are the connective tissue. The Hub renders them, lets the member act on smart ones directly, reconciles missed events, and lets the member configure how they are notified. A-NTF serves *What do I want?* exclusively — notifications are a routing/awareness layer, not a directional capability; structurally honest mono-founding-question profile (see Sources-status, methodology observation #5).

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Founding question(s) | Dimension(s) | Vertical impact |
|---|---|---|---|---|---|---|---|
| NTF-1 | Receive and render passive notifications | A-NTF | IDN-3 | DS-5 (delivery substrate), V3 (notification copy and routing) | What do I want? | 1, 1+1, 1+Community | V3, V4 |
| NTF-2 | Render notification bell with unread count | A-NTF | NTF-1 | V3 | What do I want? | 1, 1+1, 1+Community | V4 |
| NTF-3 | Render notification inbox / history surface | A-NTF | NTF-1 | V3 | What do I want? | 1, 1+1, 1+Community | V4 |
| NTF-4 | Receive and render smart (actionable) notifications | A-NTF | NTF-1 | V3, DS-5 | What do I want? | 1+1, 1+Community | V3, V4 |
| NTF-5 | Render typed-action UI (Accept/Decline and other action types) | A-NTF | NTF-4 | V3 | What do I want? | 1+1, 1+Community | V3, V4 |
| NTF-6 | Submit response to smart notification with server-side dispatch to handler | A-NTF | NTF-5 | V3, PC-4 (audit), downstream domain (PC-3 for stewardship transfer, A-GRP for invitation acceptance, A-COM for moderation-decision communication) | What do I want? | 1+1, 1+Community | V3, V4 |
| NTF-7 | Track per-notification read state | A-NTF | NTF-1 | V3 | What do I want? | 1, 1+1, 1+Community | V4 |
| NTF-8 | Resolve expired smart notifications lazily on view | A-NTF | NTF-4 | V3 | What do I want? | 1+1, 1+Community | V3, V4 |
| NTF-9 | Reconcile missed notifications on client reconnect | A-NTF | NTF-1 | V3, DS-5, PC-1 (Supabase realtime — load-bearing per §L2 §4) | What do I want? | 1, 1+1, 1+Community | V4 |
| NTF-10 | Configure notification preferences per category and channel | A-NTF | IDN-7 | V3, PC-4 (preference persistence) | What do I want? | 1, 1+1, 1+Community | V2, V3, V4 |

#### A-COI — Companion & Insight (7 capabilities)

The Hub provides the canvas surfaces for the member's **Whisp** — the FIM's growth-oriented inner dialogue voice. The Whisp is **AI-driven** (DS-7 Intelligence) but is **represented and experienced as the FIM's own inner voice**, not as a separate external companion (*the Whisp is the human*; beings core S1/S4, [ADR-U029](../../architecture/decisions/ADR-U029-whisp-ownership-split-by-face.md)). It is universal — every Mist and FIM has one (S39) — and engagement is always voluntary (the FIM decides whether to listen, S5); the Hub never imposes it and never exposes the member's private interior to anyone but themselves. The Whisp is **dialogic** (its curious questions drive self-reflection; assessment dissolves into dialogue, S17-18), and **it mentors through that dialogue — challenging the FIM when needed, but always warmly and caringly** (canon "tough love", S3). **"Mentor" is a function the Whisp performs, never a separate entity or surface.** Private reflective/insight views are a second face of the same being, not a replacement for the dialogue. Per ADR-U029 the Whisp is split across **DS-7 Intelligence** (the being-face: dialogue, growth-driven filling, the senses model, maturity) and **DS-1 World Model** (the world-presence/avatar face); A-COI **surfaces** the Whisp, it does not define it — the canonical statement is the beings core (and the pending `whisp.md`), and the Hub's no-AR representation in Ferd/Eid is an open question (CQ-012). Per §L2's "Domain services not yet consumed" list, A-COI builds only once DS-7/DS-1 enter consumption (post-Ferd; sequencing tracked in ROADMAP, not here).

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Founding question(s) | Dimension(s) | Vertical impact |
|---|---|---|---|---|---|---|---|
| COI-1 | Configure the member's Whisp engagement and consent (the Whisp is universal — this governs voluntary engagement and data/persistence consent, not whether a Whisp exists) | A-COI | IDN-7 | DS-7 (Whisp being-face, ADR-U029), PC-4 (consent persistence) | Who am I?, What do I want? | 1 | V2, V4 |
| COI-2 | Configure per-context Whisp engagement preferences (per-journey-step granularity) | A-COI | COI-1 | DS-7, PC-4 | Who am I?, What do I want? | 1 | V2, V4 |
| COI-3 | Render the Whisp's dialogic presence within a journey step (when invited by step content and the member engages) | A-COI | JRN-6, COI-1, COI-2 | DS-7, DS-3 (step-level Whisp invitation hook) | Who am I?, How do I get there? | 1 | V2, V4 |
| COI-4 | Render the standalone Whisp dialogue surface | A-COI | COI-1 | DS-7 | Who am I?, How do I get there? | 1 | V2, V4 |
| COI-5 | Reset or delete the Whisp's accumulated memory at the member's request (real deletion) | A-COI | COI-1 | DS-7, PC-4 (deletion audit) | Who am I? | 1 | V1, V2, V4 |
| COI-6 | Render the member's private Whisp reflective view — the Whisp's growth-driven filling / state, visible only to the member (the Whisp is dialogic, not a passive surface) | A-COI | IDN-3 | DS-7 (filling / senses model, S17-18; re-pointed from DS-1 per ADR-U029) | Who am I? | 1 | V2, V4 |
| COI-7 | Render the member's private insight portrait — a longer reflective narrative aggregated from the Whisp's accumulation | A-COI | IDN-3, JRN-* (wildcard area-dependency convention; see Sources-status) | DS-7 (insight aggregation), PC-4 (visibility — always-private) | Who am I?, What do I want? | 1 | V2, V4 |

#### A-DIS — Discovery & Direction-Finding (7 capabilities)

The Hub renders discovery surfaces; the underlying logic (search, ranking, recommendations) lives in DS-6. Per-row external dependencies are stated in the table below; build sequencing relative to DS-6 and the §L2 not-yet-consumed list is a ROADMAP concern, not stated here.

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Founding question(s) | Dimension(s) | Vertical impact |
|---|---|---|---|---|---|---|---|
| DIS-1 | Render journey catalogue surface | A-DIS | — | DS-3 (catalogue listing in Ferd; cross-entity finding routed to G-29 for shape-reciprocation), DS-6 (ranking) | What do I want?, How do I get there? | 1, 1+Community | V2, V4 |
| DIS-2 | Render group browse surface (publicly-visible groups) | A-DIS | GRP-3 | DS-3 (group listing in Ferd), DS-6 (ranking), PC-3 (visibility filtering) | What do I want? | 1+Community | V2, V4 |
| DIS-3 | Render member-search surface (only opted-in members) | A-DIS | DIS-6 | DS-6 (search index), PC-3 (consent filtering) | What do I want? | 1+1, 1+Community | V2, V4 |
| DIS-4 | Render recommendations surface (opt-in, explained) | A-DIS | IDN-7 | DS-6, DS-7 | What do I want?, How do I get there? | 1, 1+Community | V2, V4 |
| DIS-5 | Surface "why this recommendation" explanation alongside each recommendation | A-DIS | DIS-4 | DS-6, DS-7 | What do I want? | 1, 1+Community | V2, V4 |
| DIS-6 | Configure member's own discoverability defaults (per-aspect, per-audience) | A-DIS | IDN-7 | PC-3, PC-4 | Who am I? | 1, 1+1, 1+Community | V2, V4 |
| DIS-7 | Render activity feed (aggregated ambient surface) | A-DIS | GRP-4, COM-1, COM-5 | DS-5 (event substrate), DS-6 (ranking), PC-3 (visibility filtering) | What do I want? | 1+Community | V2, V4 |

#### A-ADM — Platform Operations (18 capabilities, meta-area)

DeusEx-scoped operations. **A-ADM is a meta-area**: zero capabilities serve the founding questions directly, because admin actions are *about keeping the platform healthy* rather than about identity-work, want-finding, or directional progress for the admin actor. The platform exists to serve members' founding-question work; A-ADM serves the founding questions transitively, by keeping the platform operational. This is the only area in the inventory with the meta-area shape; structurally honest finding (see Sources-status, methodology observation #13).

Per governance-by-scope ([ADR-U028](../../architecture/decisions/ADR-U028-governance-by-scope.md)), A-ADM's universe-scope operations route by capability: content moderation (ADM-10/11) stays woven in-place in the FIM experience, while the audit-log viewer (ADM-13, ADM-16), feature flags (ADM-15), and economy management route to **the Console** — a back-of-house surface whose status as its own entity vs a Hub-shell feature bundle is a deferred decomposition decision (U028/U025). The A-ADM rows are retained in this inventory pending that decision; none are relocated yet.

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Founding question(s) | Dimension(s) | Vertical impact |
|---|---|---|---|---|---|---|---|
| ADM-1 | Render admin dashboard with platform statistics | A-ADM | GRP-8 | PC-1 (statistics aggregation — load-bearing infrastructure commitment), PC-3, PC-4 | — | 1+Community | V1, V4 |
| ADM-2 | Search, filter, and list members at platform scope | A-ADM | ADM-1 | PC-3, DS-6 (member search ranking) | — | 1+Community | V1, V2, V4 |
| ADM-3 | Activate, deactivate, or decommission a member account (reversible vs. irreversible) | A-ADM | ADM-2 | PC-2, PC-4 | — | 1+Community | V1, V2, V3, V4 |
| ADM-4 | Hard-delete a member with content reassignment to sentinel author | A-ADM | ADM-2 | PC-2, PC-3, PC-4, DS-3 (enrolment cleanup), DS-5 (forum reassignment) | — | 1+Community | V1, V2, V4 |
| ADM-5 | Force-logout a member's active sessions | A-ADM | ADM-2 | PC-2, V3 (session-broadcast) | — | 1+Community | V1, V4 |
| ADM-6 | Sweep a member from every group on the platform (auto-routing through MEM-5/MEM-6/MEM-7/MEM-8) | A-ADM | ADM-2, MEM-5, MEM-6, MEM-7, MEM-8 | PC-2, PC-3, PC-4, DS-3, DS-5 | — | 1+Community | V1, V2, V3, V4 |
| ADM-7 | Bulk-action selected members (within a safe action subset) | A-ADM | ADM-2 | PC-3, PC-4 | — | 1+Community | V1, V4 |
| ADM-8 | Render group administration view (cross-platform group list and detail) | A-ADM | ADM-1 | PC-3 | — | 1+Community | V1, V4 |
| ADM-9 | Suspend, reassign, or reactivate a group at platform scope | A-ADM | ADM-8, GRP-5 | PC-3 | — | 1+Community | V1, V4 |
| ADM-10 | Render content-moderation queue (incoming reports across the platform) | A-ADM | COM-13 | PC-4 | — | 1+Community | V1, V4 |
| ADM-11 | Triage and resolve content reports (with action dispatch and resolution communication) | A-ADM | ADM-10 | PC-4, DS-5 (resolution communication channel), PC-3 (member-state changes if escalating) | — | 1+Community | V1, V3, V4 |
| ADM-12 | Manage Platform Administrator membership (add and remove with last-administrator protection) | A-ADM | ADM-1 | PC-3 | — | 1+Community | V1, V4 |
| ADM-13 | Render auto-grant verification view (filtered audit log surface specific to permission-catalogue auto-grants) | A-ADM | ADM-16 | PC-3 (auto-grant trigger — cross-entity finding routed to G-29 for surface-publication reciprocation), PC-4 (audit log entries) | — | 1+Community | V1, V4 |
| ADM-14 | Configure platform policy (versioned, reversible) | A-ADM | ADM-1 | PC-4 | — | 1+Community | V1, V4 |
| ADM-15 | Manage feature flags (create, toggle, scope) | A-ADM | ADM-1 | PC-4 | — | 1+Community | V1, V4 |
| ADM-16 | Render platform-scope audit log surface | A-ADM | ADM-1 | PC-4 | — | 1+Community | V1, V4 |
| ADM-17 | Render and manage role templates and the permission catalogue (DeusEx-scope CRUD) | A-ADM | ADM-1, ADM-13 | PC-3 (role-template + permission-catalogue authority) | — | 1+Community | V1, V4 |
| ADM-18 | Remove one or more members from a specific group (or a chosen set of named groups) at platform scope — a DeusEx override of the Steward-scoped MEM-5, routing each removal through the group's exit path (MEM-5 / MEM-7 sole-leader transfer / MEM-8 last-member closure) | A-ADM | ADM-2, ADM-8, MEM-5, MEM-7, MEM-8 | PC-3, PC-4 (audit), DS-3 (enrolment freeze), DS-5 (former-member attribution) | — | 1+Community | V1, V2, V3, V4 |

### Dependency chain

The build order across areas reflects the layered structure of the Hub's developmental experience and the dependency graph between areas. A-IDN is the foundation — every other area's first row depends on IDN-3 (authenticated FIM identity) directly or transitively. A-GRP is the social substrate — once members exist, groups are the container that makes 1+Community participation possible, and journey enrolment, communication, and discovery all depend on group-context affordances (GRP-1, GRP-4, GRP-8 in particular). A-JRN builds on top of A-IDN and A-GRP — the journey player is only meaningful for an enrolled member acting in a (personal or engagement) group context. A-COM operates in parallel with A-JRN once A-GRP is in place — communication is its own destination dimension and doesn't gate on journey work. A-NTF is connective tissue across the prior areas and depends on real-time delivery primitives shared with A-COM. A-COI depends entirely on DS-1 World Model and DS-7 Intelligence, which §L2 lists as not-yet-consumed — it builds only once those services enter consumption. A-DIS depends on DS-6 Discovery (also on §L2's not-yet-consumed list); the catalogue and group-browse surfaces have degraded forms via DS-3 + PC-3 fallbacks while DS-6 ranking is unavailable, and member search and recommendations additionally depend on DS-6 / DS-7. A-ADM is foundational platform-health work needed from launch. Build sequencing across and within areas (which rows land in which wave) is a ROADMAP / wave-planning concern, not stated here.

The dependency chain has one important cross-area nuance: **A-COM and A-NTF share a real-time delivery substrate** (DS-5 + PC-1 Supabase realtime channels per §L2 §4). COM-10 and NTF-9 both depend on that substrate; their reconciliation rows (COM-11, NTF-9 itself) handle the same class of degradation. A-COM and A-NTF activate together for real-time delivery but their feature-spec authoring can proceed in parallel.

### External dependencies

Capabilities consumed from other entities. Each entry names the source entity, the consumed capability shape, and the consuming Hub internal area(s).

| Source entity | Consumed capability shape | Consuming Hub internal area(s) | Consumption notes |
|---|---|---|---|
| PC-1 Infrastructure | Supabase realtime channel infrastructure (load-bearing per §L2 §4; not universal substrate) | A-COM (COM-10), A-NTF (NTF-9) | — |
| PC-1 Infrastructure | Statistics aggregation primitive | A-ADM (ADM-1) | — |
| PC-2 Identity | Authentication, sessions, profile primitives | A-IDN (IDN-1..IDN-4, IDN-9..IDN-12), A-ADM (ADM-3..ADM-6) | — |
| PC-2 Identity | Anonymous session per ADR-U004 | A-IDN (IDN-1, IDN-2), A-JRN (JRN-5) | — |
| PC-2 Identity | Personal Journal primitive | A-IDN (IDN-5) | — |
| PC-3 Organisation | Group lifecycle, memberships, role assignment | A-GRP (most rows), A-JRN (JRN-3, JRN-4 enrolment), A-COM (forum role-gating), A-ADM (group lifecycle, admin membership) | — |
| PC-3 Organisation | Permission resolution `has_permission()` | A-GRP (GRP-8), all role-gated capabilities | — |
| PC-3 Organisation | Transitive group-of-groups resolution beyond depth 1 | A-GRP (MEM-10) | **Cross-entity finding routed to G-29** — schema supports nesting; resolution machinery is depth-1-only per §L2 §8 |
| PC-3 Organisation | Auto-grant trigger publication for verification surface | A-ADM (ADM-13) | **Cross-entity finding routed to G-29** — trigger mechanism exists; Hub-renderable surface for verification not yet reciprocated |
| PC-2 Identity | Per-device session inventory and remote-sign-out RPC | A-IDN (IDN-11) | **Cross-entity finding routed to G-29** — capability gap flagged in capabilities.md; PC-2 reciprocation needed |
| PC-4 Governance | Audit log entries, GDPR consent state, data export request flow, feature flags | A-IDN (IDN-6, IDN-7, IDN-8), A-NTF (NTF-10), A-ADM (multiple) | — |
| DS-1 World Model | the Whisp's world-presence / avatar face (cord, anchoring, severance), ADR-U029 | A-COI only if/when the Hub canvas surfaces world-presence — open (CQ-012); COI-6's filling/state view moved to DS-7 | Not yet consumed (§L2 not-yet-consumed list) |
| DS-3 Journeys | Journey enrolment, progress, content delivery, frozen-state semantics, step-type catalogue | A-JRN (most rows), A-DIS (DIS-1, DIS-2 catalogue listing in Ferd) | — |
| DS-3 Journeys | Catalogue listing with Ferd-acceptable filters and metadata | A-DIS (DIS-1, DIS-2) | **Cross-entity finding routed to G-29** — basic browse confirmed; specific shape needs reciprocation |
| DS-4 Content | Media and asset delivery | A-JRN (JRN-2, JRN-13, JRN-18), A-GRP (MEM-8 asset disposition) | — |
| DS-5 Communication | Direct messaging, forums, real-time delivery, activity feed event substrate | A-COM (most rows), A-NTF (NTF-1, NTF-9), A-DIS (DIS-7) | — |
| DS-6 Discovery | Search, ranking, recommendations | A-DIS (all rows), A-GRP (MEM-1 member search), A-ADM (ADM-2 member search ranking) | Not yet consumed (§L2 not-yet-consumed list) |
| DS-7 Intelligence | the Whisp as a being (ADR-U029): dialogue, growth-driven filling, the senses model, maturity/internalisation; perceptual + insight aggregation | A-COI (all rows), A-DIS (DIS-4, DIS-5) | Not yet consumed (§L2 not-yet-consumed list) |
| V3 Notifications | Notification copy, routing, delivery, expiry semantics | A-NTF (all rows), A-COM (announcement delivery), A-GRP (MEM-2 outbound, MEM-7 succession) | — |

### Sources-status block

Remarks recording prerequisite-check pauses, methodology observations, and cross-entity findings produced during this §L3 authoring. Each entry references the gap or open question it relates to, where applicable.

**2026-06-17 re-grounding (ADR-U030 Hub v2 greenfield rebuild).**
- **Anchor-neutralisation (Option A).** The per-row forward-commitment annotations (`*` / `**`) and the External-dependencies "Activation timing" column were retired. They were anchored to "implemented in the running system per `docs/TMP/capabilities.md`" — the old Hub MVP that ADR-U030 retires. Per the no-status rule, implementation/activation status now lives downstream (behaviour inventory, substrate audit, ROADMAP). The eight-area structure and ~100 rows were unchanged — the re-grounding removed status, not capabilities. The historical authoring record below (Observations A–G, the stress-test methodology) is preserved as provenance, not as live classification.
- **ADR-U031 (Mist lifecycle) reflected.** §L2 §3 now records Mist data ephemerality (erase-on-inactivity/close) and atomic transcendence as the persistence-and-consent threshold; IDN-2 gains a PC-4 dependency (consent capture at transcendence).
- **ADR-U028 (governance by scope) recorded.** §L2 §3's DeusEx row and the A-ADM intro now carry the locked Ferd routing: content moderation + self-service exit stay woven in-place; the audit-log viewer (ADM-13/16), feature flags (ADM-15), and economy management route to the Console. No rows relocated — the Console's status (own entity vs Hub-shell bundle) is a deferred decomposition decision (U028/U025).
- **DS reciprocation now possible.** All seven Domain Service L3 inventories now exist (`docs/platform/domain/*.md`), so the Hub's external-dependency claims (marked "reciprocation pending" below) can now be reconciled against them. That row-by-row reconciliation is deferred to the Phase-1 substrate-audit deliverable and the G-29 lateral-routing mechanism; it was not done in this re-grounding.

**2026-06-22 Whisp reconciliation (finding F-04; build-informed spec-evolution loop, PROCESS §9).** A-COI was authored around a separate "AI Mentor" entity plus a passive "Whisp internal-state surface"; this diverged from canon (beings core S1/S3/S4/S5/S17-18/S39 — Status: Canonical; [ADR-U029](../../architecture/decisions/ADR-U029-whisp-ownership-split-by-face.md)): the **Whisp** is the FIM's inner dialogue voice — **AI-driven** (DS-7) but represented as the member's own voice — universal and voluntary, which **mentors through warm, caring challenge** ("tough love", S3). There is no separate "Mentor" *entity*; mentoring is a function the one Whisp performs. ("Mentor" as a noun is not ratified canon for the companion; its only canon-tree use is CQ-009's distinct *human* 50+ Mentor/Elder role.) The seven A-COI rows were recast onto the Whisp; COI-6's passive-surface framing was corrected (the Whisp is dialogic) and its external dependency re-pointed DS-1 -> DS-7 (the being-face owns filling/senses/maturity per ADR-U029); the DS-7 and DS-1 external-dependency rows were re-described accordingly. Per the rename-pass discipline this amendment points the capabilities at the Whisp and corrects the mischaracterisation but does **not** specify the Hub's Whisp-surface mechanics — those derive from the pending `whisp.md` + DS-7, and the Ferd/Eid no-AR representation is open (CQ-012). Source: finding F-04 in [`../../planning/hub-v2/phase-1-review-findings.md`](../../planning/hub-v2/phase-1-review-findings.md); authority `docs/ecosystem/universe/beings/README.md` + ADR-U029.

**2026-06-23 A-ADM capability addition (finding F-05; build-informed spec-evolution loop, PROCESS §9).** Added **ADM-18** — admin-scoped removal of one or more members from a specific group or a chosen set of named groups (a DeusEx override of the Steward-scoped MEM-5, routing through each group's MEM-5/MEM-7/MEM-8 exit path). Closes a gap between ADM-6 (sweep from *every* group) and MEM-5 (Steward, *one* group): there was no targeted admin removal from named group(s). A-ADM count 17 -> 18. Source: finding F-05 in [`../../planning/hub-v2/phase-1-review-findings.md`](../../planning/hub-v2/phase-1-review-findings.md).

**Authoring methodology.**
- This §L3 was authored using the code-informed stress-test pattern locked in [`../../planning/sessions/2026-04-30_01_-_CODE-INFORMED-STRESS-TEST-PATTERN.md`](../../planning/sessions/2026-04-30_01_-_CODE-INFORMED-STRESS-TEST-PATTERN.md): cold derivation from L1 + L2 + DESCRIPTION + the eight-area decomposition produced a candidate inventory of 100 capabilities; a stress-test pass against `docs/TMP/capabilities.md` (the Ferd-current synthesis of the OLDFEAT corpus — a scratch artifact from the 2026-04-30 authoring, no longer on disk) classified each row's activation timing; an adjudication step reconciled the resulting delta. The candidate inventory survived empirical pressure without structural revision — eight areas hold, ~100 rows hold, the four true misses surfaced by the stress-test (GRP-9 group deletion, IDN-11 per-device sessions, IDN-12 self-service reactivation, ADM-17 role-template management) integrated cleanly into existing areas.

**Methodology observations elevated to closing-bridge deliverables.**
- **Observation A: Cold derivation cannot determine which L2-committed capabilities are implemented vs planned.** The stress-test pass against capabilities.md reclassified ~30 rows from current-commitment (cold-derivation default) to partial-forward-commitment-within-Ferd. Cold derivation systematically under-estimates how much L2-committed surface is unimplemented. The empirical-comparison step is structurally necessary for honest forward-commitment classification, not optional efficiency. This goes beyond what the 2026-04-30 stress-test pattern bridge anticipated and is the deepest finding from this session.
- **Observation B: The eight-area decomposition is validated by empirical pressure, not just by cold derivation.** Eight areas hold; ~100 rows hold; the four true misses are recoverable as new rows within existing areas. The decomposition's structural soundness is now a stress-test-validated property, not a design assumption.
- **Observation C: The Founding-question column has structural diagnostic value beyond Vision-traceability bookkeeping.** Each area has a distinct founding-question signature; the signature space is two-dimensional (which questions × flavour of service); seven areas are member-facing and serve at least one founding question; A-ADM is a meta-area and serves none directly. The column is now a derivation tool for future entity-L3 authoring.
- **Observation D: Forward-commitment classification is three-way, not binary** — current-commitment / partial forward-commitment within Ferd / full forward-commitment beyond Ferd. The three-way classification has implications for wave-planning and L4 derivation timing.
- **Observation E: Configuration surfaces live where the consequence lives** (the L3 placement principle that resolved OQ-14: DIS-6 stays in A-DIS regardless of OQ-1). Reusable principle for future area-placement decisions.
- **Observation F: Backward-edits to closed areas pause for review and queue for consolidation.** Area-level "one Lₙ per session" discipline. Surfaced when a JRN-1 → DIS-1 inline edit was caught; the JRN-1 / DIS-1 distinction was preserved and the discipline strengthened.
- **Observation G: Cold derivation can produce cross-entity findings ad-hoc.** The 2026-04-30 stress-test bridge framed the stress-test pass as the primary structured generator of cross-entity findings; cold derivation produced four findings (MEM-10 / OQ-6, ADM-13 / OQ-15, IDN-11 / OQ-17, DIS-1 / OQ-13) before the stress-test pass opened. Refines the stress-test bridge's methodology claim to: stress-test is the *primary structured* generator with three named output classes and a routing mechanism; cold derivation produces the same class of finding ad-hoc when L1 + L2 surface unmet architectural claims. Cold derivation can also produce false-positive cross-entity findings that dissolve under granularity correction (one instance: OQ-8, JRN-15 DS-2 dep, dissolved by JRN-15 split).

**Conventions used.**
- **PC-1 naming rule.** PC-1 is named in external-deps cells only when load-bearing for a specific Hub-side architectural commitment, not as universal substrate. Two qualifying patterns emerged: realtime-channel reads (COM-10, NTF-9) and statistics aggregation primitive (ADM-1). Naming PC-1 universally would dilute the column's diagnostic value.
- **Wildcard area-dependency convention.** `AREA-*` (e.g., `JRN-*` on COI-7, `MEM-*` on JRN-14) indicates dependency on the aggregate of an area, not on any specific capability row. Used where the consuming capability operates over the full set rather than a discrete instance. Two instances in the inventory.
- **Forward-commitment annotation convention (RETIRED 2026-06-17, ADR-U030).** The original §L3 marked rows `*` (partial forward-commitment within Ferd) / `**` (full forward-commitment beyond Ferd) / unannotated (current-commitment), anchored to the old Hub MVP's running state. The greenfield rebuild retires that anchor; the inventory is now anchor-neutral, and implementation/activation status lives in the behaviour inventory, substrate audit, and ROADMAP. The ASCII-marker choice (no Greek letters or non-ASCII typographic symbols, per the user-memory rule) remains the standing convention for any future annotation.
- **Two-column template deviation.** Founding-question(s) and Dimension(s) columns added beyond the template's prescribed five. Both columns make Vision traceability explicit at the row level. The deviation is a candidate for template-wide elevation when the next entity-L3 derivation runs (cascade-plan Session 3 territory).

**Open questions resolved during authoring.**
- **OQ-1: A-PRV vs A-IDN privacy split.** Held; no split. Empirical evidence (capabilities.md folds privacy into identity; OLDFEAT corpus didn't surface privacy as a separate concern) aligns with the experiential argument (members don't experience privacy as separate from identity). Five cross-area dep edges into IDN-7 from A-JRN, A-COM, A-NTF, A-COI, A-DIS are documented as a known consent-resolution-authority concentration but not a structural problem requiring split. Splitting would relocate three rows (IDN-6, IDN-7, IDN-8) without changing dep-graph topology. Configuration-surfaces-live-where-the-consequence-lives principle (Observation E) means a hypothetical A-PRV would house consent persistence and policy, not configuration UX. Revisit if future evidence (DS-7 / DS-1 introduction) or contributor-scale concerns materialise.
- **OQ-7: GRP-3 visibility merge.** Closed; merge stands. capabilities.md §4 treats group visibility and member-list visibility as one set; merge validated empirically.
- **OQ-9: COM-6 post + reply split.** Closed via split. capabilities.md §8 treats `post_forum_messages` and `reply_to_messages` as distinct permissions; L3-meaningful distinction. COM-6 split into COM-6a (post top-level) and COM-6b (reply).
- **OQ-16: ADM-13 collapse vs retention.** Closed via reframe. ADM-13 retained with refined wording ("Render auto-grant verification view — filtered audit log surface specific to permission-catalogue auto-grants"). Internal-dep on ADM-16 makes the relationship load-bearing.
- **OQ-2, OQ-3, OQ-8, OQ-11, OQ-14.** Closed earlier in cold derivation (Journey Zero placement, IDN-2 carry-over phrase, JRN-15 DS-2 dep dissolution, A-COM mono-founding-question finding, DIS-6 placement principle).
- **OQ-4 (GRP-6 role-template merge), OQ-5 (MEM-7 leadership-transfer split), OQ-10 (COM-12 edit/delete merge), OQ-12 (NTF-10 preferences merge).** L4-deferred. Stress-test produced no L3-level evidence requiring split; the merges stand at L3 and L4 derivation may revisit if feature shapes diverge.

**Cross-entity findings routed to G-29.**
- **OQ-6: PC-3 transitive group-of-groups resolution beyond depth 1.** Schema supports nesting (capabilities.md §2 confirms); resolution machinery is depth-1-only per §L2 §8 and user-memory. MEM-10's external-deps cell carries the dependency claim with reciprocation pending.
- **OQ-13: DS-3 catalogue-listing shape with Ferd-acceptable filters and ranking metadata.** Basic catalogue browse confirmed (capabilities.md §7); specific shape needs DS-3-side reciprocation when DS-3's L3 descends.
- **OQ-15: PC-3 auto-grant verification surface publication.** Trigger mechanism exists in PC-3 (capabilities.md §3 confirms); whether PC-3 publishes a Hub-renderable surface for verification (ADM-13's claim) is unreciprocated.
- **OQ-17: PC-2 per-device session inventory and remote-sign-out RPC.** Capability gap flagged in capabilities.md §1 as a member-facing miss; whether PC-2 supports the underlying API is unknown without PC-2 L3 reciprocation.

**Cross-entity findings routed to other entities (architectural rules, content authority).**
- D15 architectural rule (no `user_id` columns in domain tables) — PC-3 + DS-* architectural authority, not Hub L3.
- 44 seeded permissions catalogue — PC-3 authority.
- `has_permission()` machinery — PC-3 authority.
- RLS-first security pattern — PC-3 + V4 cross-cutting.
- Step-type catalogue — DS-3 authority (Hub commits to rendering whatever DS-3 publishes; JRN-18 doesn't enumerate types).
- Notification type catalogue — DS-5 + V3 authority.
- Bootstrapped journey content (FringeIsland Journeys group + 8 predefined journeys) — Journey Studio + DS-3 / DS-4 content authority.

**Outstanding caveats.**
- **Outward dependency claims are claims-from-the-consumer.** External-deps cells in the capability table represent the Hub's commitments to consume capabilities from other entities. Reciprocal commitments from the targeted entities (PC-1, PC-2, PC-3, PC-4, DS-1, DS-3, DS-4, DS-5, DS-6, DS-7, V3) are pending. The four cross-entity findings explicitly routed to G-29 are the highest-priority cases; the routine consumption claims (PC-3 group lifecycle, DS-3 enrolment, DS-5 messaging) are reciprocally implicit but not yet formally affirmed in the targeted entities' L3 inventories. The G-29 lateral-routing mechanism, when designed, will provide the structured handoff for these claims.
- **G-03 vertical specs scaffold caveat.** §L3's per-row Vertical Impact column references V1 Administration, V2 Privacy, V3 Notifications, V4 Observability, V5 Transactions. Per the gaps register, the vertical specs' §§3-6 are scaffolds (G-03, highest-priority gap). Vertical impact assignments here use the locked vertical names but cannot reference specific obligation IDs that don't yet exist. When G-03 resolves, vertical impact entries can be enriched.
- **Cosmology naming Open question.** §L2 §8's first open question (the worlds cosmology naming) is resolved (2026-06-10): the cosmology core supersedes the Three Worlds model. Capability names in this §L3 are cosmology-neutral; user-facing copy carries cosmology language at the feature-spec level, sourced from [`docs/ecosystem/universe/cosmology/README.md`](../../ecosystem/universe/cosmology/README.md).
- **L2 §2 "Domain services not yet consumed" list.** This list correctly identifies DS-1, DS-2, DS-6, DS-7 as not-yet-consumed; the rows depending on those services (all of A-COI; DIS-3, DIS-4, DIS-5) honour that list. During cold derivation, JRN-15 originally claimed a DS-2 dep; the JRN-15 split (per area-level discipline) dissolved the claim as a derivation false-positive. The §L2 §2 list stands; no L2 revision implied by this §L3.
- **Namespace-collision check (B.2 bridge).** The B.2 bridge worried that DS-1..DS-7 might collide between Domain Services (per ADR-U023) and Design System surfaces. Resolution: ADR-U023 doesn't number Design System components; the Design System uses `FEAT-DS###` for feature specs and a vocabulary inventory (tokens / components / patterns) at L3, with no numbered surface IDs. The DS-1..DS-7 numbering in this §L3 unambiguously refers to Domain Services. No collision; no disambiguation needed.

*Note: no status column in the capability table. Status (shipped / in flight / not started / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's capability inventory. Updated whenever a `FEAT-*.md` file under this entity's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it reflects the current state of `features/`.*

*Pending — will be populated after §L3 is authored. The summary will list every `FEAT-H*` spec under [`./features/`](./features/) with its maturity and the capability it serves.*

---

*See [`.claude/skills/ecosystem-decomposition/SKILL.md`](../../../.claude/skills/ecosystem-decomposition/SKILL.md) for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*
