# CLAUDE.md — Products tier

**Applies to:** anything under `docs/products/` and the corresponding code in each surface's directory (e.g. `hub/app/`, `hub/components/`, `hub/lib/`; the old Hub MVP is frozen under `hub-legacy/`, per [ADR-U032](../architecture/decisions/ADR-U032-hub-v2-coexistence-separate-tree.md)).
**Load order:** root [`CLAUDE.md`](../../CLAUDE.md) → [`AGENTS.md`](../../AGENTS.md) → [`PROCESS.md`](../planning/PROCESS.md) → the skill matching the task → **this file** → the product's `README.md` → the feature spec.
**Reads as a delta.** Assumes root `CLAUDE.md` is already loaded. Contains only what's specific to product-tier work.

---

## What makes this tier different

Products are **equipment profiles** of the one FringeIsland experience, not devices ([ADR-U025](../architecture/decisions/ADR-U025-products-as-equipment-profiles.md)). There are two: **The Hub — the canvas surface** (screen room, keyboard, precision input, file system) and **The Gimbal — the senses surface** (camera, LiDAR, GPS, mic, AR, portability). Devices (phone, laptop, tablet, AR glasses) are points in equipment space; a surface lights up on any device whose equipment matches. The Game is not a product — it is a depth setting of journeys (ADR-U025). All product work is constrained by two facts: products *consume* the Platform API but don't *define* it, and products own only their **shell** (navigation, rendering, packaging, chrome) — experience features belong to their capabilities and are placed by equipment, never by device.

Products serve everyone in the one experience — **Mists** (anonymous entrants) and **FIMs** (the base identity), wearing whatever per-group role applies (**Steward / Guide / Participant / Observer**), in whatever mode (experiential or authorial — a **Dreamineer's** authoring home is in Studios), plus the enterprise plane (**Universeers / the Council / DeusEx**). The canonical role taxonomy lives in [`docs/ecosystem/universe/roles/README.md`](../ecosystem/universe/roles/README.md) — point there, don't restate it. Each role has different permissions and different UI affordances. Products do not serve under-18s — that's a hard scope boundary (see [`hub/DESCRIPTION.md`](./hub/DESCRIPTION.md)).

---

## Verticals: obligations on this tier

The five verticals (ADR-U002) are obligations on every tier. Here's what each requires specifically when you're working at the products tier. Every feature spec's Vertical Impact section must address all five — address each or mark "None" with rationale (AGENTS.md, always-do).

- **Administration** — Every admin action taken from a product surface must be auditable and reversible where feasible. Steward and DeusEx actions surface differently from Member actions (affordances, confirmations, audit-trail entries). Product UIs never expose raw admin primitives; admin flows are wrapped and named for the role using them.
- **Privacy / GDPR** — Every field shown to a FIM about another FIM must respect the other's privacy settings (display name vs full name, visibility scope, consent). Product UIs show only what the viewer is authorised to see — don't over-fetch and filter client-side; ask for exactly what's needed. Data export and deletion flows are product-tier responsibilities (the UI for them), even though the data lives in Platform Core.
- **Notifications** — Notifications are triggered by events at every layer, not just Communication. If a product feature changes state that a FIM cares about (enrollment, role change, message received, journey milestone), that's a notification trigger. Product surfaces expose notification preferences and the inbox; they don't author notification copy — that's shared.
- **Observability** — Every meaningful user action emits a telemetry event. "Meaningful" means: anything a future product decision would want to measure. Page views are the low bar; feature-level events (enrolled in journey, accepted invitation, left group) are where signal lives. Error states are observability events too — don't silently swallow failures.
- **Transactions** — Product surfaces may *initiate* transactions (enroll in a paid journey, accept a premium invite) but never *process* them. Stripe integration, entitlement resolution, and receipt handling live behind the Platform API. Product UI displays entitlements (has access / doesn't) by asking the platform, not by inspecting transaction history.

---

## Rules that only apply at this tier

- **API-first, no exceptions.** Products call the Platform API. Products never access the database directly (ADR-U009). If you're writing a product feature that needs data the Platform API doesn't expose, stop — you need a paired platform feature spec first. Don't work around the API by adding product-tier database access.
- **Features are placed by equipment, not by product (the placement rule, ADR-U025).** Every feature spec declares `requires-equipment:` (`sensors | comfortable-canvas | precision-input | none`) and appears on any device offering that equipment. A chosen restriction is allowed, but it must be named by its equipment, never by device or whim. The question "is this a Hub feature or a Gimbal feature?" is retired; the question is "what equipment does it need?" Only shell features (navigation, rendering, packaging) belong to a product.
- **UI conventions span all products.** Always show loading states — never present a frozen UI to the user. After a data change, update ALL related UI state together; partial updates leave the UI inconsistent. These conventions exist so Hub and Gimbal feel like the same product family — inventing a one-off pattern for a single product is drift. Use the shared pattern or extend it for everyone.
- **Permissions come from Platform Core, not from product code.** Product UI asks `has_permission(...)` — it doesn't compute permissions locally. Product-tier permission logic is a sign that something belongs in Platform Core / Organisation, not in the product.
- **Cross-product features require paired specs.** A Hub UI feature that relies on a new platform capability is actually two features: the Hub spec (prefix `H`) consuming the capability, and the platform spec (`PC` or `PD`) providing it. Both reference each other in their "Platform dependencies" and "Cross-product impact" sections.
- **Mists before FIMs (where applicable).** Anonymous sessions are first-class (ADR-U004; the anonymous entrant is canonically the **Mist** — see the roles core). If a feature can be offered to Mists meaningfully, design for Mists first and let FIMs inherit; don't gate everything behind transcendence (sign-up).

---

## Gotchas (tier-specific)

- **Hub is Ferd-present but Gimbal-future-aware.** The Hub ships today; the Gimbal is planned. If a feature you're building against the Hub shell has an obvious senses-surface life (capture, location, AR), at minimum write a one-line note in the feature spec's Cross-product impact section — and check its `requires-equipment:` value is honest, not defaulted.
- **Role-specific UI branching:** don't branch on role string equality (`role === 'steward'`). Branch on the permission (`has_permission(user, 'invite_member')`). Roles can be renamed or reorganised; permissions are stable contracts.

---

## Where to go next

- **Feature ID prefixes at this tier:** `H` (Hub) and `G` (Gimbal), shell features only; `GM` is retired. See `docs/products/README.md`.
- **Products:** [`hub/`](./hub/) · [`gimbal/`](./gimbal/) — each has its own `README.md` + `DESCRIPTION.md`, and (when active) `SPECIFICATION.md` + `ROADMAP.md`.
- **Relevant ADRs:** U002 (five verticals) · U004 (anonymous sign-in — the Mist) · U007 (three-layer permission model) · U009 (API-first) · U018 (no hardcoded group types) · U022 (named waves) · U024 (wave model semantics) · U025 (products as equipment profiles).
- **Relevant skills:** [`feature-development`](../../.claude/skills/feature-development/SKILL.md) when implementing a maturity-4 feature; [`ecosystem-decomposition`](../../.claude/skills/ecosystem-decomposition/SKILL.md) when writing or advancing a spec.
- **Sibling tier CLAUDE.md files:** [`../platform/CLAUDE.md`](../platform/CLAUDE.md) (when writing the paired platform feature) · [`../design-system/CLAUDE.md`](../design-system/CLAUDE.md) (when touching shared UI components).
