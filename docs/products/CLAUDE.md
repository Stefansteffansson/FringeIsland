# CLAUDE.md — Products tier

**Applies to:** anything under `docs/products/` and the corresponding code (app/, components/, lib/ that implements product surfaces).
**Load order:** root [`CLAUDE.md`](../../CLAUDE.md) → [`AGENTS.md`](../../AGENTS.md) → [`PROCESS.md`](../planning/PROCESS.md) → the skill matching the task → **this file** → the product's `README.md` → the feature spec.
**Reads as a delta.** Assumes root `CLAUDE.md` is already loaded. Contains only what's specific to product-tier work.

---

## What makes this tier different

Products are **surfaces** — the places where FIMs actually touch FringeIsland. The Hub (web), The Gimbal (mobile, planned), and The Game (placeholder) are the three products. All product work is constrained by two facts: products *consume* the Platform API but don't *define* it, and every FIM-facing experience must work across all planned products eventually. Writing a feature that only makes sense on web is a bug, not a shortcut.

Products serve **FIMs** (members), **Visitors** (pre-signup), **Stewards** (group leaders), **Dreamineers** (as members, not as authors — their authoring home is in Studios), and **DeusEx** (platform admins). Each has different permissions and different UI affordances. Products do not serve under-18s — that's a hard scope boundary (see [`hub/DESCRIPTION.md`](./hub/DESCRIPTION.md)).

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
- **Every feature is cross-product by default.** Build as if all three products already exist. A Hub-only solution that "we'll port to Gimbal later" is a Hub-only solution forever. If a feature genuinely can't generalise (e.g., depends on web-only capability), state that explicitly in the feature spec's No-gos section with rationale.
- **UI conventions are shared across products.** `ConfirmModal`, loading states, and "update all related state together" are in root CLAUDE.md for everyone. The tier-specific addition: these rules exist so Hub and Gimbal feel like the same product family. Inventing a one-off pattern for a single product is drift — use the shared primitive or extend it for everyone.
- **Permissions come from Platform Core, not from product code.** Product UI asks `has_permission(...)` — it doesn't compute permissions locally. Product-tier permission logic is a sign that something belongs in Platform Core / Organisation, not in the product.
- **Cross-product features require paired specs.** A Hub UI feature that relies on a new platform capability is actually two features: the Hub spec (prefix `H`) consuming the capability, and the platform spec (`PC` or `PD`) providing it. Both reference each other in their "Platform dependencies" and "Cross-product impact" sections.
- **Visitors before members (where applicable).** Anonymous sessions are first-class (ADR-U004). If a feature can be offered to visitors meaningfully, design for visitors first and let members inherit; don't gate everything behind sign-up.

---

## Gotchas (tier-specific)

- **`refreshNavigation` is the canonical cross-component update mechanism.** Components that don't share a parent (e.g., nav list refreshing after a role change elsewhere) coordinate through this custom event. Don't invent new cross-component mechanisms without checking if this one already covers it.
- **Hub is Ferd-present but Gimbal-future-aware.** If you're adding a feature to the Hub that has obvious mobile implications, at minimum write a one-line note in the feature spec's Cross-product impact section. The Gimbal team (= future you) will thank you.
- **Role-specific UI branching:** don't branch on role string equality (`role === 'steward'`). Branch on the permission (`has_permission(user, 'invite_member')`). Roles can be renamed or reorganised; permissions are stable contracts.

---

## Where to go next

- **Feature ID prefixes at this tier:** `H` (Hub), `G` (Gimbal), `GM` (Game). See `docs/products/README.md`.
- **Products:** [`hub/`](./hub/) · [`gimbal/`](./gimbal/) · [`game/`](./game/) — each has its own `README.md` + `DESCRIPTION.md`, and (when active) `SPECIFICATION.md` + `ROADMAP.md`.
- **Relevant ADRs:** U002 (five verticals) · U004 (visitor anonymous sign-in) · U007 (three-layer permission model) · U009 (API-first) · U018 (no hardcoded group types) · U022 (named waves) · U024 (wave model semantics).
- **Relevant skills:** [`feature-development`](../../.claude/skills/feature-development/SKILL.md) when implementing a maturity-4 feature; [`ecosystem-decomposition`](../../.claude/skills/ecosystem-decomposition/SKILL.md) when writing or advancing a spec.
- **Sibling tier CLAUDE.md files:** [`../platform/CLAUDE.md`](../platform/CLAUDE.md) (when writing the paired platform feature) · [`../design-system/CLAUDE.md`](../design-system/CLAUDE.md) (when touching shared UI components).
