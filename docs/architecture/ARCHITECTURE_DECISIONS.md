# FringeIsland — Architecture Decisions
*Version 1.0 — March 2026*
*Status: Living document — new ADRs added as significant decisions are made.*

---

## How to Use This Document

This document records the reasoning behind every significant architectural decision in FringeIsland. It answers the question that ARCHITECTURE_ANATOMY.md cannot: **why**.

Each decision is recorded as an Architecture Decision Record (ADR) — a well-established format specifically designed to preserve reasoning across time and team members. When you encounter a constraint in the anatomy and wonder why it exists, the answer is here.

**When to add an ADR:** any time a significant architectural decision is made — a new layer, a new vertical, a choice between two viable approaches, or a deliberate decision to defer something. Small implementation details do not need ADRs. Foundational choices do.

**ADR status values:**
- **Locked** — decided, reasoned, not to be revisited without deliberate review
- **Provisional** — decided but acknowledged as potentially revisitable with new information
- **Superseded** — replaced by a later ADR (links to successor)
- **Deferred** — a decision that needs to be made but is deliberately left for a future session

---

## ADR Index

| ID | Title | Status |
|----|-------|--------|
| ADR-001 | Layered anatomy as the architectural framework | Locked |
| ADR-002 | Administration, Privacy, Notifications, Observability, Transactions as verticals | Locked |
| ADR-003 | L0 Infrastructure — Supabase as the backend platform | Locked |
| ADR-004 | L1 Identity — visitor anonymous sign-in with temporary profile | Locked |
| ADR-005 | L1 Identity — profile_data as a separate flexible table | Locked |
| ADR-006 | L2 Organisation — Universal Group Pattern | Locked |
| ADR-007 | L2 Organisation — three-layer permission model | Locked |
| ADR-008 | L3 Experience engine — step type extensibility as core constraint | Locked |
| ADR-009 | Platform API ring — API-first, frontend-agnostic backend | Locked |
| ADR-010 | Privacy as a dedicated vertical, not absorbed into Administration | Locked |
| ADR-011 | Transactions as a dedicated vertical using Stripe Connect | Locked |
| ADR-012 | Observability as a dedicated vertical — audit trail as trust concern | Locked |
| ADR-013 | Design system — i18n and a11y as constraints, not features | Locked |
| ADR-014 | Feature flags in L0 Infrastructure | Locked |
| ADR-015 | API versioning in the Platform API ring | Locked |
| ADR-016 | Administration vertical — cascade specification before implementation | Locked |
| ADR-017 | Journeys as content templates, not organisational nodes | Locked (from legacy) |
| ADR-018 | No hardcoded group types | Locked (from legacy) |
| ADR-019 | Universal Group Pattern for individual users | Locked (from legacy) |
| ADR-020 | Steward safeguard — DeusEx as authority of last resort | Locked (from legacy) |
| ADR-021 | Pairs are groups with two members | Locked (from legacy) |
| ADR-022 | Forum anonymisation — soft-flag, not data mutation | Locked |
| ADR-023 | Platform evolution — Ferd and Hamn as named waves | Locked |
| ADR-024 | ARCHITECTURE_BASELINE.md — Claude Code generated, not hand-written | Locked |

---

## The Decisions

---

### ADR-001 — Layered anatomy as the architectural framework
**Status:** Locked
**Date:** March 2026

**Context:**
FringeIsland is a complex platform with many interdependent capabilities. Development was experiencing a recurring problem: implementing features that required rebuilding foundational elements that hadn't been designed to support them. Features were discovered to have incomplete foundations mid-implementation. The question was how to organise the architectural thinking to prevent this.

**Decision:**
Adopt a layered anatomy model as the primary architectural framework. Eight horizontal layers (L0–L7), each depending on all layers below it. Nothing at a higher layer can exist without everything below it being solid. The anatomy is the primary reference for all development work.

**Why this approach:**
The layered model makes dependency order explicit and visible. It transforms the question "what should I build next?" into "what is the lowest incomplete layer?" It prevents the pattern of building features on foundations that weren't designed to support them. It also makes it obvious when a feature crosses layer boundaries in a way that signals an architectural concern.

**Alternatives considered:**
- *Feature-based organisation* — organise around features (auth, groups, journeys, forums). Rejected because it obscures cross-feature dependencies and makes build order ambiguous.
- *Domain-driven design with bounded contexts* — a valid approach but adds significant complexity that isn't warranted at FringeIsland's current scale and with a solo developer.
- *No explicit framework* — continue building without a formal model. Rejected because the recurring rebuild problem was caused precisely by this approach.

**Consequences:**
- All development work must identify which layers a feature touches before implementation begins
- L3 Experience engine is identified as the linchpin — the most critical layer to specify correctly before building above it
- The anatomy becomes a living document that evolves as the platform grows

---

### ADR-002 — Administration, Privacy, Notifications, Observability, Transactions as verticals
**Status:** Locked
**Date:** March 2026

**Context:**
The layered model captures horizontal dependencies well. But some concerns are not horizontal — they cut through every layer simultaneously. The administration of a user soft-delete touches L1, L2, L3, L4, L5, L6, L7. Privacy/GDPR compliance touches every layer that holds member data. These don't belong in any single layer.

**Decision:**
Introduce five vertical concerns that run alongside the layers: Administration, Privacy/GDPR, Notifications/Email, Observability/Audit, Transactions. Each vertical is a cross-cutting concern that touches every layer simultaneously.

**Why five verticals and not fewer or more:**
- *Administration* — lifecycle events are human-operated cascades. Fundamentally different from the others.
- *Privacy/GDPR* — a founding FringeIsland value that deserves first-class architectural status. Cannot be absorbed into Administration without losing visibility.
- *Notifications/Email* — observational and outbound. Does not mutate state. Fundamentally different from Administration.
- *Observability/Audit* — read-only system health. Fundamentally different from all others.
- *Transactions* — automated Stripe-driven entitlements. External actor. Fundamentally different from human-operated Administration.

Each vertical has a different actor (human, member, system, external service) and a different interaction pattern (mutation, rights, signals, observation, entitlements). These differences justify separate verticals.

**Alternatives considered:**
- *Single "cross-cutting concerns" vertical* — simpler but loses the important distinction between human-operated and automated concerns.
- *Absorbing privacy into administration* — rejected because privacy is a founding value, not a subset of administration. Making it a separate vertical makes it visible to every developer building every feature.
- *Notifications as part of L5 Communication* — rejected because notifications are triggered by events at every layer, not just L5. Placing it in L5 incorrectly implies it only relates to communication.

**Ordering of verticals (from layers outward):**
Administration → Privacy → Notifications → Observability → Transactions
- Administration is tightest to the layers (most coupled, most internal)
- Privacy follows — internal rights concern
- Notifications — internal listener, outward deliverer
- Observability — read-only, passive
- Transactions — most external (Stripe-driven)

---

### ADR-003 — L0 Infrastructure — Supabase as the backend platform
**Status:** Locked
**Date:** January 2026 (confirmed March 2026)

**Context:**
FringeIsland is built by a solo developer using a vibe coding methodology with AI assistance. The infrastructure choice needed to be: capable of supporting the full vision, manageable by one person, well-supported by AI coding tools, and cost-effective at early scale.

**Decision:**
Supabase as the primary backend platform. PostgreSQL as the database. Supabase Auth for authentication. Supabase Storage for assets. Supabase Real-time for subscriptions. RLS for all security enforcement.

**Why Supabase:**
- PostgreSQL is the correct database for FringeIsland's data model — relational, consistent, excellent RLS support
- Supabase provides managed PostgreSQL with built-in auth, storage, real-time and edge functions
- RLS policies enforce data access at the database level — the most reliable security enforcement layer
- Well-supported by Claude Code and other AI coding tools
- Generous free tier for early development, predictable scaling costs
- Open source — can self-host if needed

**Why RLS over application-level security:**
Application-level security can be bypassed. RLS cannot be bypassed by application code — it is enforced at the database level for every query regardless of how it originates. This is the correct security model for a platform handling deeply personal member data.

**Alternatives considered:**
- *Firebase/Firestore* — rejected because NoSQL does not fit FringeIsland's relational data model (groups, memberships, roles, permissions all require joins)
- *PlanetScale/MySQL* — rejected because no native RLS support
- *Custom backend (Node.js/Django)* — rejected because the overhead of building and maintaining infrastructure is not appropriate for a solo developer at this stage
- *Neon/Prisma* — valid alternative but Supabase's auth and storage integration makes it simpler as a complete backend solution

**Consequences:**
- All security is enforced through RLS policies — no exceptions
- SECURITY DEFINER functions are used only for operations that need to bypass RLS for legitimate platform-level reasons (e.g. `is_platform_admin()`, `has_permission()`)
- PostgreSQL constraint: does not allow subqueries in CHECK constraints — use triggers instead

---

### ADR-004 — L1 Identity — visitor anonymous sign-in with temporary profile
**Status:** Locked
**Date:** March 2026

**Context:**
FringeIsland's Contribution Architecture locked a visitor/shadow experience: visitors can explore the island before registering. Everything they do should carry over seamlessly on registration. The question was how to implement this technically.

**Decision:**
Use Supabase's built-in anonymous sign-in. Every visitor receives a real but temporary Supabase auth session on arrival. A temporary profile is created simultaneously, flagged `is_temporary: true`. Visitor activity saves to this temporary profile. On registration, the anonymous session converts to a permanent account — a supported Supabase API call. `is_temporary` flips to `false`. If the visitor never registers, a pg_cron job cleans up temporary profiles after a configured period.

**Why anonymous sign-in over browser storage:**
Browser storage (localStorage, sessionStorage) loses data if the visitor clears their browser, switches devices, or the session expires. Anonymous sign-in creates a real database record that persists across browser sessions and can survive the conversion to a permanent account without any data migration.

**Why this matches the garden door metaphor:**
The garden exists before it is claimed. The temporary profile is the garden waiting. The door opening on registration is the session conversion. This is not a clever technical trick — it is the technical expression of a product principle.

**Alternatives considered:**
- *Browser storage only* — rejected because it cannot survive device switching and cannot deliver the seamless conversion experience the product principle requires
- *Cookie-based tracking without auth* — rejected because it doesn't integrate with the profile system and creates a more complex conversion path
- *No visitor persistence* — rejected because it contradicts the locked Contribution Architecture principle

**Consequences:**
- pg_cron cleanup job must be implemented to remove stale temporary profiles
- Visitor temporary profiles consume database resources — retention period must be configured
- The conversion moment (anonymous → permanent) must be tested carefully to ensure no data loss

---

### ADR-005 — L1 Identity — profile_data as a separate flexible table
**Status:** Locked
**Date:** March 2026

**Context:**
The member profile needs to accumulate dynamic data from multiple sources over time: assessment results from L3 journeys, reflections from L4 content, insights from L7 Intelligence, self-defined intentions. The question was how to store this flexible, growing data.

**Decision:**
A separate `profile_data` table with a bucket/source model. Buckets are data, not schema. New data types (new buckets) are added by inserting records with a new `bucket` value — no migration required.

```sql
profile_data (
  id, user_id, bucket, source, source_id, content (jsonb), visibility, created_at
)
```

**Why not JSONB on the profile record:**
Fixed JSONB fields on the profile record lock the schema at the field level. Adding a new data category means a migration touching every profile record. The profile_data table approach makes the schema the container — the content (bucket types) is data, not schema.

**Why not separate tables per data type:**
A table per data type (assessments_data, reflections_data, insights_data) would require a new migration for every new type. More importantly, it makes querying a member's complete portrait across all data types more complex, not less.

**Performance:**
This pattern is standard and battle-tested. A typical active member accumulates hundreds of rows over years of engagement — trivially fast with proper indexes. Required indexes: `(user_id)`, `(user_id, bucket)`, `(source, source_id)`, `(user_id, visibility)`.

**Alternatives considered:**
- *JSONB fields on profile record* — rejected (see above)
- *Separate tables per data type* — rejected (see above)
- *EAV (Entity-Attribute-Value) pattern* — essentially what profile_data is, but with JSONB content for flexibility within each bucket

---

### ADR-006 — L2 Organisation — Universal Group Pattern
**Status:** Locked (confirmed from legacy ADR-003)
**Date:** January 2026 (confirmed March 2026)

**Context:**
The permission system needs to handle both individual users and groups uniformly. A user enrolling in a journey and a group enrolling in a journey should be treated the same way by the permission system.

**Decision:**
Every user belongs to an auto-created personal group. That personal group joins other groups. Individuals and groups are treated identically by the permission system. There are no special cases.

**Why this works:**
The Universal Group Pattern eliminates a class of special-case code. `has_permission(user_id, group_id, permission)` works the same whether the user is acting as an individual or as a member of a group. Journey enrolments work the same for individuals and groups. The data model is simpler and more consistent.

**Consequences:**
- `get_current_personal_group_id()` is a key function — returns the personal group for a given user
- Every new user creation must trigger personal group creation

---

### ADR-007 — L2 Organisation — three-layer permission model
**Status:** Locked (confirmed from legacy ADR-002, ADR-004)
**Date:** January 2026 (confirmed March 2026)

**Context:**
FringeIsland needs a flexible permission system that can handle different roles in different groups, customisable permissions per group, and platform-level administration — without becoming a maintenance nightmare.

**Decision:**
Three layers: atomic Permissions → Role Templates → Group Roles (instances). Runtime enforcement via `has_permission(user_id, group_id, permission_name)`.

**Why three layers:**
- Permissions are atomic and system-defined — they grow only when developers add new features
- Role Templates provide sensible defaults without forcing groups to start from scratch
- Group Roles are per-group instances — customisable, so "Steward" in one group can have different permissions than "Steward" in another

**Never hardcode role names in application code.** Always use `has_permission()`. This ensures that role customisation by groups doesn't break application logic.

**Consequences:**
- 31 atomic permissions across 7 categories (at time of writing)
- 4 role templates: Steward, Guide, Member, Observer
- Every permission check must go through `has_permission()` — no shortcuts

---

### ADR-008 — L3 Experience engine — step type extensibility as core constraint
**Status:** Locked
**Date:** March 2026

**Context:**
L3 is the architectural linchpin. The step type system defines what can happen inside a journey. If the step type data model is rigid, adding new step types later requires rebuilding the core data model — and everything above L3 that depends on it.

**Decision:**
The step type system must be extensible from day one. New step types are addable without rebuilding the core data model. The step type is a discriminator on a shared base structure — not a separate table per type.

**Why this matters:**
Tier 1 step types (narrative, reflection, assessment, choice, activity, journal, checklist) are the core. Tier 2 (video, file, quiz, mood check-in, external link) follow. Future step types (AR triggers, physical world activations, AI-generated content) will come later. Each new type must slot in without schema redesign.

**Consequences:**
- Step type specification session is required before significant L3 implementation
- The data model must be designed with this extensibility constraint in mind from the first migration
- This is the single most important architectural decision in L3

---

### ADR-009 — Platform API ring — API-first, frontend-agnostic backend
**Status:** Locked
**Date:** March 2026

**Context:**
FringeIsland will eventually have multiple frontends: web platform, iOS app, Android app, and a game. If the backend is built tightly coupled to the Next.js web platform, every subsequent frontend will require significant rework.

**Decision:**
Every piece of Ferd functionality is accessible through a clean API endpoint. Business logic lives in API routes (`/api/...`), not in Next.js server components or page files. The frontend calls the API — it does not reach into the database directly. A future iOS app calls the same routes without redesign.

**Pattern:**
```
Database → API route → Frontend component
```
Never: `Database → Frontend component directly`

**Why API-first:**
The cost of getting this right in Ferd is minimal — it's a discipline of where code is written, not additional infrastructure. The cost of retrofitting it when iOS and Android arrive is very high — every feature that reaches directly into the database needs to be wrapped in an API route before native clients can use it.

**Alternatives considered:**
- *Next.js server components with direct database access* — faster to build initially, but creates tight coupling that makes multi-frontend impossible without significant rework
- *GraphQL* — valid but adds complexity that isn't warranted for a solo developer at this stage

**Consequences:**
- All database access in application code goes through API routes
- Supabase client in the browser is acceptable for real-time subscriptions but not for data mutations
- API versioning (`/api/v1/`) must be implemented to allow the API to evolve without breaking existing clients

---

### ADR-010 — Privacy as a dedicated vertical
**Status:** Locked
**Date:** March 2026

**Context:**
Privacy and GDPR compliance could be absorbed into the Administration vertical (erasure is a lifecycle event) or into L0 Infrastructure (RLS handles data access). The question was whether it deserved its own architectural element.

**Decision:**
Privacy is a dedicated fifth vertical — not absorbed into Administration, not buried in L0.

**Why:**
FringeIsland's manifesto says "member privacy over commercial opportunity." That is a founding value, not a compliance requirement. If privacy is absorbed into Administration, it architecturally becomes a subset of operational concerns. Making it a visible vertical communicates to every developer building every feature: this platform takes privacy seriously. The question "what are the privacy implications of this feature?" becomes part of the build process, not an afterthought.

GDPR also requires more than lifecycle events. Consent management, right to portability, data map (Article 30 record), and AI data handling are distinct concerns that don't fit cleanly in Administration.

**Alternatives considered:**
- *Absorb into Administration* — rejected (see above)
- *Sublayer within L0/L1* — rejected because privacy is cross-cutting — right to erasure touches every layer, not just the lower ones
- *Implicit in RLS policies* — rejected because RLS enforces access control, not consent management, portability or audit

---

### ADR-011 — Transactions as a dedicated vertical using Stripe Connect
**Status:** Locked
**Date:** March 2026

**Context:**
FringeIsland needs a marketplace (Hamn+) where Dreamineers can sell journeys, physical products and experiences. Revenue needs to be split between the Foundation and creators. Payment processing needs to be compliant and reliable.

**Decision:**
Transactions are a dedicated vertical, implemented via Stripe Connect. FringeIsland never builds payment logic. FringeIsland stores only: Stripe payment reference, entitlement unlocked, creator earning record.

**Why Stripe Connect specifically:**
Stripe Connect is designed precisely for marketplace payment splits — a buyer pays, Stripe splits between platform and creator automatically. It handles PCI compliance, fraud detection, international payments, payouts, refunds and disputes. Building any of this from scratch would take years and introduce significant compliance risk.

**Why a separate vertical from Administration:**
Both are cross-cutting but operated by different actors with different triggers. Administration is human-operated lifecycle events. Transactions are automated Stripe webhook events. Keeping them separate makes the distinction visible.

**Consequences:**
- Transactions vertical is a placeholder in Ferd
- First subscription tier may introduce basic Stripe integration in late Ferd
- Full marketplace launches in Hamn

---

### ADR-012 — Observability as a dedicated vertical
**Status:** Locked
**Date:** March 2026

**Context:**
Without observability, production issues are invisible until users report them. Audit trails are required by GDPR for data access events. Error tracking is essential for a platform handling sensitive personal data.

**Decision:**
Observability is a dedicated fourth vertical — read-only, passive, touching every layer. Three components: structured logs, performance metrics, and immutable audit trail. Error tracking (Sentry or equivalent) named explicitly.

**Why observability is a vertical and not a layer:**
Observability does not depend on layers below it — it observes them. It is purely read-only. It fits the vertical model precisely: it touches every layer simultaneously without being part of the functional stack.

**Why audit trail is a trust concern not just a technical one:**
When a member asks "what has been done with my data?", the audit trail answers. This is a member rights concern (Privacy vertical) as much as an operational concern. The audit trail is shared between Observability and Privacy — Observability records it, Privacy exposes it to members.

---

### ADR-013 — Design system — i18n and a11y as constraints
**Status:** Locked
**Date:** March 2026

**Context:**
FringeIsland has Swedish roots, a European Foundation, and a global ambition. Members with visual, motor or cognitive differences should be welcomed. Both internationalisation and accessibility are much cheaper to build correctly from the start than to retrofit later.

**Decision:**
i18n and a11y are constraints on how the design system is built — not features to be added later. All user-facing strings are externalised to translation files from day one. Components meet WCAG 2.1 AA as a baseline.

**Why constraints rather than features:**
Retrofitting i18n costs 3-5x more than building it correctly initially. Retrofitting accessibility often requires redesigning components entirely. Treating them as constraints — things that are true of how we build, not things we add — prevents the retrofitting problem.

**Why a11y aligns with the manifesto:**
"Belonging over fitting in" — excluding members with disabilities contradicts this principle directly. Accessibility is not a compliance concern for FringeIsland. It is a values concern.

---

### ADR-014 — Feature flags in L0 Infrastructure
**Status:** Locked
**Date:** March 2026

**Context:**
FringeIsland uses a vibe coding methodology — building with AI assistance in rapid sessions. Features are often built and tested before they are ready for all members. The transition from Ferd to Hamn requires new experiences to be deployed but not yet visible.

**Decision:**
Feature flags live in L0 as a simple database configuration table. A helper function reads flag state. Features can be deployed to production but remain invisible until the flag is enabled.

**Why L0:**
Feature flags are infrastructure — they are read before any application logic executes. They live closest to the ground.

**Why database over environment variables:**
Environment variables require a redeploy to change. A database flag can be toggled without deployment — enabling or disabling features for specific users, groups or environments in real time.

---

### ADR-015 — API versioning in the Platform API ring
**Status:** Locked
**Date:** March 2026

**Context:**
When Hamn introduces native iOS and Android apps, those clients will connect to the same API as the web platform. As the API evolves, existing clients (web) must continue working while new clients use updated endpoints.

**Decision:**
API versioning is a named concern in the Platform API ring from Ferd day one. Version prefix on all API routes (`/api/v1/...`). New versions introduced when breaking changes are needed. Old versions maintained until all clients have migrated.

**Why from day one:**
Adding versioning retroactively means renaming every existing route and updating every existing client. Doing it from day one costs nothing extra — it is a path prefix.

---

### ADR-016 — Administration vertical — cascade specification before implementation
**Status:** Locked
**Date:** March 2026

**Context:**
The recurring problem in early Ferd development was discovering the cross-layer consequences of lifecycle events mid-implementation. Soft-deleting a user revealed incomplete handling in groups, journeys, forum posts and more — each discovery requiring backtracking and rebuilding.

**Decision:**
Every significant lifecycle event must have a complete cascade specification before it is implemented. The cascade documents what happens at every layer when the event fires. Database triggers and RLS policies do the heavy lifting — application code does not patch layer-by-layer.

**The cascade pattern:**
```
Event: [lifecycle event name]
Actor: [who triggers it]
L0: [what happens at infrastructure level]
L1: [what happens to identity/profile]
L2: [what happens to organisation/memberships]
L3: [what happens to journeys/enrolments]
L4: [what happens to content]
L5: [what happens to communication]
L6: [what happens to discovery/visibility]
L7: [what happens to intelligence/AI context]
Verticals: [privacy implications, notifications triggered, audit recorded]
```

**Why this solves the rebuild problem:**
The rebuild problem was caused by implementing features without knowing their full cascade. Writing the cascade specification first forces the question: what does this event do to every layer? The answer identifies incomplete foundations before implementation begins.

---

### ADR-017 — Journeys as content templates, not organisational nodes
**Status:** Locked (from legacy ADR-001)
**Date:** January 2026

**Context:**
Early design considered whether journeys should be organisational units (like groups) or content templates. Groups are containers for people. Journeys are experiences people go through.

**Decision:**
Journeys are content templates. Groups enrol in journeys. Journeys are not groups.

**Why:**
Cleaner separation of concerns. Groups handle organisation. Journeys handle experience. The same journey template can be used by many different groups simultaneously. Conflating them would make the data model and permission system significantly more complex.

---

### ADR-018 — No hardcoded group types
**Status:** Locked (from legacy ADR-002)
**Date:** January 2026

**Context:**
Early design considered whether to have typed groups: Team, Organisation, Cohort etc. as distinct entity types.

**Decision:**
All groups are simply Groups. They have labels (user-defined) and templates (system-provided starting points) but no type-based code paths.

**Why:**
Hardcoded group types create a false taxonomy that doesn't match real-world usage. Users create groups that don't fit the predefined types. The label and template system provides all the UX benefit of types without the architectural rigidity.

---

### ADR-019 — Steward safeguard — DeusEx as authority of last resort
**Status:** Locked (from legacy ADR-005)
**Date:** January 2026

**Context:**
Every group must have at least one Steward. What happens if the last Steward leaves?

**Decision:**
If the last Steward is removed or leaves, the DeusEx system group becomes the Steward. DeusEx can then reassign Stewardship to restore group autonomy.

**Why:**
Prevents orphaned groups with no management capability. DeusEx membership provides platform-level recovery without requiring complex automated logic for the general case.

---

### ADR-020 — Pairs are groups with two members
**Status:** Locked (from legacy ADR-006)
**Date:** January 2026

**Context:**
Should pairs (two-person relationships) be a distinct entity type?

**Decision:**
No. Pairs are groups with two members.

**Why:**
Simpler data model. No arbitrary distinction between two-person and three-person groups. All group features work for pairs automatically.

---

### ADR-021 — Forum anonymisation — soft-flag, not data mutation
**Status:** Locked
**Date:** March 2026

**Context:**
When a member leaves a group, their forum posts remain. Should they be deleted, anonymised in the database, or handled differently?

**Decision:**
Posts retain their original `author_id`. Display logic shows "Former Member" based on current membership status — not based on the stored author field. If the member rejoins, their name reappears automatically. Historical data is never mutated.

**Why:**
Mutating historical data creates data integrity problems and is irreversible. Soft-flag display logic is reversible, honest, and respects the historical record. It also handles the rejoin case automatically without any additional logic.

**Why not delete posts:**
Deleting posts damages the integrity of forum conversations. A thread where half the replies have disappeared is worse than a thread with "Former Member" attributions.

---

### ADR-022 — Platform evolution — Ferd and Hamn as named waves
**Status:** Locked
**Date:** March 2026

**Context:**
The platform evolves in waves, not hard-sequential phases. The current web platform needed a name that connected it to the vision without overpromising its current state.

**Decision:**
The current web platform is named Ferd (Old Norse/Swedish: journey, departure). The evolved FringeIsland experience platform is Hamn (harbour — where members truly arrive). Future releases named when they arrive.

**Why names matter:**
Names carry intent. "Phase 1" carries no meaning beyond sequencing. "Ferd" — departure — correctly communicates that the current platform is the beginning of a journey, not the destination. "Hamn" — harbour — communicates arrival, belonging, the moment FringeIsland becomes a real world. The naming connects the technical work to the vision.

**Wave model vs phases:**
Phases imply sequential completion. Waves imply overlap — Ferd continues evolving as Hamn begins. Native apps may start being built during Ferd even if they launch with Hamn. This is more honest about how software actually develops.

---

### ADR-023 — ARCHITECTURE_BASELINE.md — Claude Code generated
**Status:** Locked
**Date:** March 2026

**Context:**
The architecture baseline — the document that maps the anatomy to actual code — requires reading the live codebase, database schema, migrations, and API routes to be accurate. Hand-writing it introduces the risk of the document diverging from reality.

**Decision:**
ARCHITECTURE_BASELINE.md is generated by Claude Code reading the live repository. It is not hand-written. It is regenerated after each significant implementation session to stay current.

**Why Claude Code rather than hand-writing:**
Claude Code can read every file, every migration, every API route and generate an accurate inventory. A human writing this document will inevitably miss things or let it go stale. The document's value is its accuracy — and accuracy requires generation from the source of truth.

**Consequences:**
- ARCHITECTURE_BASELINE.md must be regenerated as part of the close-out of every significant implementation session
- The document is structured around the anatomy layers — each layer has a section listing its tables, API routes, and components
- The regeneration prompt must reference ARCHITECTURE_ANATOMY.md so the baseline is structured consistently

---

## Deferred Decisions

The following architectural decisions have been identified but deliberately left for future dedicated sessions:

| Topic | Deferred to | Reason |
|-------|-------------|--------|
| Journey data model detail | Journey specification session | Requires full dedicated session — most important L3 decision |
| Step type data model | Journey specification session | Depends on journey data model |
| Shadow access model detail | Post-spec session | What specifically can visitors see before registering |
| Avatar and parallel self mechanic | Hamn specification session | Narrative design, UX and data architecture |
| First Season narrative design | First Season Design session | Creative work requiring fresh mind and dedicated time |
| Kickstarter campaign design | After First Season Design | Requires complete vision before campaign can be designed |
| Marketplace plugin extension points | Hamn specification session | Requires Contribution Architecture detail session |
| Native app architecture | Hamn specification session | Requires validation of what AR layer actually needs |
| Game engine integration | Wave 3+ session | Built on validated, thriving community |
| Endowment fund structure | Phase 3 session | Foundation formally established in Wave 3 |

---

*This document grows as FringeIsland grows. Every significant architectural decision deserves an ADR. The reasoning preserved here is as valuable as the decisions themselves — it prevents the same ground from being re-argued and ensures that future changes are made with full awareness of why things are the way they are.*
