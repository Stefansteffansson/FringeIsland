# The Hub — Specification

---
slug: hub
owner: products/hub
status: draft
last_updated: 2026-04-26
tier: Surfaces
tags: [product:hub]
feature_prefix: H
---

> The inward-facing build spec for the Hub. For developers who need to know how the thing actually works, what it depends on, and what its contracts are. Identity and "why" live in [`DESCRIPTION.md`](./DESCRIPTION.md) — don't repeat them here. Companion files: [`DESCRIPTION.md`](./DESCRIPTION.md) (outward-facing), [`ROADMAP.md`](./ROADMAP.md) (when written), [`features/`](./features/) (feature specs).

**Authorship note.** This file is authored across three decomposition levels (see [`.claude/skills/ecosystem-decomposition/SKILL.md`](../../../.claude/skills/ecosystem-decomposition/SKILL.md)). L2 owns the identity, boundaries, and technical shape (§L2 below). L3 owns the capability inventory (§L3). L4 owns the feature-inventory summary (§L4). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

**Current authorship state:** L2 sections are populated. §L3 and §L4 are placeholders awaiting their own authoring sessions.

---

## L2 — Identity, boundaries, and technical shape

*L2 authorship. Derived from Vision and the ecosystem anatomy. Revised when the entity's boundaries, technical surface, or architectural position change.*

### 1. Surface

- **Platform target:** Next.js web application — server-rendered React with App Router.
- **Repo location:** [`Stefansteffansson/FringeIsland`](https://github.com/Stefansteffansson/FringeIsland) — the Hub is currently the primary application in this monorepo. Implementation paths: `app/` (routes and pages), `components/` (shared UI), `lib/` (client-side utilities, Supabase clients, hooks).
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

Where the Hub sits in the ecosystem anatomy ([`../../architecture/ECOSYSTEM_ANATOMY_V4.svg`](../../architecture/ECOSYSTEM_ANATOMY_V4.svg), [ADR-U023](../../architecture/decisions/ADR-U023-platform-core-domain-services-decomposition.md)):

- **Tier:** Surfaces (Products).
- **Sibling Surfaces:** the Gimbal (mobile, planned), the Game (placeholder), the three Studios (Journey Studio, Universe Studio, Arc Studio), and the Design System (consumed for shared visual language).

**Domain services consumed (currently):**

| Domain service | What the Hub calls it for |
|---|---|
| Experience Engine | Journey enrollment, journey progress (start, pause, resume, leave, complete), content delivery to enrolled members |
| Content | Media and asset delivery (narrative blocks, images, embedded media within journeys) |
| Communication | Forums, direct messages (1-1 and group), activity feeds, notification delivery |

**Domain services not yet consumed** (will be consumed in later waves; see [`DESCRIPTION.md`](./DESCRIPTION.md) "Relationship to ecosystem"): World Model, Narrative Engine, Discovery, Intelligence.

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

**Sign-in surface.** Sign-in flows are owned by Platform Core / Identity (PC-2). The Hub renders the sign-in screen and surrounding navigation, but the credential exchange itself is a Platform API call. Visitors arrive via anonymous session ([ADR-U004](../../architecture/decisions/ADR-U004-visitor-anonymous-sign-in.md)) — visitor activity and preferences accumulate against the anonymous session and transfer into a full member account upon sign-up. The Hub treats visitor → FIM as a soft transition, not a wall.

**Roles served by the Hub:**

| Role | Source of authority | Hub responsibility |
|---|---|---|
| **Visitor** | Anonymous session (ADR-U004) | Browse, explore, begin participating; render the sign-up upgrade path |
| **Member (FIM)** | Membership in any non-system group | Default authenticated experience — journeys, forums, messages, Journal, profile |
| **Steward** | Role granted via group leadership | Member affordances plus group leadership UI (invite, role assignment, group enrollment, moderation) |
| **Dreamineer** | Role granted via Dreamineer system group | Member affordances plus cross-ecosystem community participation; their authoring lives in Studios, not the Hub |
| **DeusEx** | Membership in the DeusEx system group | Platform-administration UI (member management, group lifecycle, role oversight, threat response, data hygiene) |

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

**The Hub exposes no public API.** It is a consumer surface — it calls the Platform API and renders results. Sibling Surfaces (Gimbal, Game, Studios) consume the same Platform API directly; they do not call the Hub.

If a future need arises for the Hub to expose data or operations to a sibling Surface, that need would be implemented as a new Platform API capability rather than as a Hub-owned API. The discipline in [`../CLAUDE.md`](../CLAUDE.md) ("permissions come from Platform Core, not from product code") generalises: shared product behaviour belongs in Platform Core, not in any one product.

For the Platform API surface itself, see [`../../platform/`](../../platform/) and the relevant Platform Core component specifications when authored.

### 6. Cross-product contracts

The Hub's siblings are the Gimbal, the Game, the three Studios, and the Design System.

**Contract pattern (locked at the tier level, see [`../CLAUDE.md`](../CLAUDE.md)):** every Hub feature is cross-product by default. A Hub-only solution that "we'll port to the Gimbal later" is a Hub-only solution forever. Where a feature genuinely cannot generalise (depends on a web-only capability), the No-gos section of the feature spec must state so explicitly with rationale.

**Paired-spec discipline.** A Hub UI feature that depends on a new platform capability is two features: the Hub spec (`FEAT-H*`) consuming the capability, and the platform spec (`FEAT-PC*` or `FEAT-PD*`) providing it. Both reference each other in their "Platform dependencies" and "Cross-product impact" sections. Synchronisation between paired specs is currently a known gap (G-02) — there is no automatic mechanism that alerts the platform spec owner when the Hub-side acceptance criteria change.

**Currently named contracts.** None enumerated at this stage. Cross-product contracts will accumulate as features advance through maturity. They will be listed here once they exist as concrete commitments rather than as a discipline in the abstract.

**Design System consumption.** The Hub consumes the Design System's tokens, components, and patterns. Per the design-system tier rules, the Hub is committed to consuming Design System primitives over hardcoded styles, and the Design System is committed to honouring additive-over-breaking change discipline. Specific consumption commitments will be detailed in §L3 once both inventories are populated.

**Visitors before members.** Where a feature can be offered to visitors meaningfully, design for visitors first and let members inherit. Anonymous sessions are first-class (ADR-U004). This is a tier-level rule that the Hub honours by default.

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

- **The Three Worlds cosmology naming.** [VISION.md](../../ecosystem/VISION.md) names the three worlds as *Ordinary World, Safe Harbour, The Other Side*. A drift-correction proposed in a 2026-04-26 session bridge offered an alternative naming (*Ordinary World, FringeIsland, the Void*). The constitutional authority and the proposed correction disagree. This is a constitutional question, not a Hub question — but the Hub references the Three Worlds (visitor experience, future Whisp presence, Three Worlds atmosphere) and so inherits the unresolved naming. Deferred per Stefan's call for further thinking-through time. Until resolved, the Hub's user-facing copy and DESCRIPTION.md continue to use the VISION.md naming.

- **RBAC role-to-screen mapping.** The Hub renders different screens for Visitor, Member, Steward, Dreamineer, and DeusEx roles, but the per-screen permission requirements are not yet documented in any one place. Currently each component asks `has_permission(...)` for the specific permission it needs. A consolidated mapping (which roles see which screens) would strengthen the auth model's surface and ease onboarding. Candidate for an L3-scoped clarification once the capability inventory exists, or for a dedicated document.

- **Transitive group resolution beyond depth 1.** All memberships are group-to-group, and the schema supports group-in-group. But `has_permission()` only resolves at depth 1 today. Transitive resolution and circularity prevention are noted as upcoming work in the user-memory horizon. Hub features that would need transitive resolution must surface this in their Platform dependencies section until the platform capability exists.

- **Cross-product feature sync mechanism (G-02).** When a Hub feature spec's acceptance criteria change, no mechanism alerts the paired platform spec owner. The Hub's current mitigation is the paired-spec discipline (both specs reference each other), but the synchronisation is manual. Resolution belongs in a `doc-health-check` extension or in the `ecosystem-decomposition` skill — not Hub-specific.

- **Cross-product paired-spec naming convention.** Cross-product impact sections currently reference paired specs by `FEAT-H*` and `FEAT-PC*`/`FEAT-PD*` IDs. When those IDs do not yet exist (because the paired spec has not been written), the discipline for "draft a placeholder pair vs. wait until both are written" is undefined. Surfaced for a future decision.

- **Design System consumption commitments.** The Hub commits to consuming the Design System over hardcoded styles, but the specific consumption surface (which components, which tokens, which patterns) will only become concrete once both the Hub's L3 capability inventory and the Design System's L3 vocabulary inventory exist. No action this session.

---

## L3 — Capability inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the entity enters active development, has its boundaries materially revised, or is affected by an architectural change. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

*Pending — to be authored in a dedicated L3 session. The capability inventory will populate this section in full, including the capability-to-internal-owner table, the dependency chain, the external dependencies, and the Sources-status block.*

---

## L4 — Feature inventory summary

*L4 authorship. Reconciliation output against L3's capability inventory. Updated whenever a `FEAT-*.md` file under this entity's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline is tracked as G-21 — the `doc-health-check` skill verifies this section reflects the current state of `features/`.*

*Pending — will be populated after §L3 is authored. The summary will list every `FEAT-H*` spec under [`./features/`](./features/) with its maturity and the capability it serves.*

---

*See [`.claude/skills/ecosystem-decomposition/SKILL.md`](../../../.claude/skills/ecosystem-decomposition/SKILL.md) for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*
