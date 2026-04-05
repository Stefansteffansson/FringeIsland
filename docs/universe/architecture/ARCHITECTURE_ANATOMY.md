# FringeIsland — Architecture Anatomy
*Version 1.0 — March 2026*
*Status: Locked. Changes require deliberate architectural review.*

---

## How to Use This Document

This document describes the anatomy of the FringeIsland platform — what it is made of, how the parts relate, and what depends on what. It is the architectural contract that all development work is written against.

**Before implementing any feature:** identify which layers and verticals it touches. A feature that touches L5 Communication without L3 Experience engine being solid will need to be rebuilt.

**Before making any architectural change:** read the relevant decisions in `ARCHITECTURE_DECISIONS.md`. Every element here has reasoning behind it.

**For Claude Code:** read this document before generating or modifying any code. The layer a piece of functionality belongs to determines how it is built and what it can depend on.

---

## The Anatomy at a Glance

The FringeIsland platform anatomy has four structural elements:

1. **Eight horizontal layers** — L0 at the ground, each layer building on everything below it
2. **Five vertical concerns** — cross-cutting concerns that touch every layer simultaneously
3. **Platform API ring** — the contract between the backend and every frontend
4. **Design system and frontends** — the presentation layer above the API ring

The fundamental rule: **nothing at a higher layer can exist without everything below it being solid.**

---

## The Eight Layers

### L0 — Infrastructure
*The ground. Everything else depends on this.*

| Element | Role |
|---------|------|
| Supabase | Managed backend platform — database, auth, storage, real-time |
| PostgreSQL | Primary database — all persistent data |
| Auth | Supabase Auth — session management, anonymous sign-in, JWT tokens |
| RLS | Row Level Security — all data access enforced at database level |
| Storage | Supabase Storage — media assets, user uploads, journey content files |
| pg_cron | Scheduled database jobs — temporary profile cleanup, data retention |
| Feature flags | Configuration table enabling/disabling features per environment or user segment |
| i18n config | Internationalisation configuration — locale routing, translation file references |
| Email service | Third-party transactional email (Resend or equivalent) — auth emails, lifecycle emails |
| AI provider | Third-party AI API (Anthropic or equivalent) — powers AI Mentor in L7 |
| Backup | Automated database backup and disaster recovery strategy |

**What L0 does not include:** business logic, user-facing features, application code. L0 is infrastructure only.

**Critical constraint:** RLS policies are the security enforcement layer. No application code should bypass RLS except through explicitly designated SECURITY DEFINER functions. Every table has RLS enabled.

**Feature flags** live in L0 as a simple database table. A helper function reads flag state. This enables features to be deployed but not yet visible — essential for the Ferd → Hamn transition and for testing in production.

**i18n** is a constraint, not a feature. All user-facing strings must be externalised to translation files from day one. Retrofitting internationalisation costs 3-5x more than building it correctly initially.

---

### L1 — Identity
*Who is here? Two states: temporary and permanent.*

| Element | Role |
|---------|------|
| Temporary identity (visitor) | Anonymous Supabase session created on first visit. Real but flagged `is_temporary: true`. |
| Permanent identity (member) | Registered member. Full profile. Created when visitor registers. |
| Profile (static) | Fixed fields: name, avatar, bio. Exists from visitor arrival. |
| profile_data (dynamic) | Flexible accumulation table — assessments, reflections, insights, intentions. Grows with engagement. |
| Sessions | Supabase Auth session management. Anonymous → authenticated on registration. |

**The visitor/shadow experience:**
Visitors arrive and receive an anonymous Supabase session immediately. A temporary profile is created. Everything they do — taster journeys, choices, glimpsing their garden — is saved to this temporary profile. When they register, the anonymous session converts to a permanent account and `is_temporary` flips to `false`. Nothing is lost. The garden door opens.

If a visitor never registers, a pg_cron job (L0) cleans up temporary profiles after a configured period.

**The profile_data table:**
Dynamic profile data does not live as JSONB fields on the profile record. It lives in a separate `profile_data` table:

```sql
profile_data (
  id
  user_id       → profiles
  bucket        text     -- 'assessment', 'reflection', 'insight', 'intention' etc.
  source        text     -- 'journey_step', 'ai_mentor', 'self', 'community' etc.
  source_id     uuid     -- reference to whatever generated this entry
  content       jsonb    -- flexible per bucket type
  visibility    text     -- 'private', 'semi_public', 'public'
  created_at
)
```

Buckets are data, not schema. Adding a new bucket type requires no migration — just insert records with a new `bucket` value. Required indexes from day one: `(user_id)`, `(user_id, bucket)`, `(source, source_id)`, `(user_id, visibility)`.

**What L1 depends on:** L0 entirely. Supabase anonymous sign-in, RLS policies, pg_cron for cleanup.

---

### L2 — Organisation
*How are people structured?*

| Element | Role |
|---------|------|
| Groups | Flexible organisational units. No hardcoded group types. |
| Memberships | Users and groups belonging to groups. Network-based, not just hierarchical. |
| Roles | Group-scoped roles. Customisable per group. |
| Permissions | Atomic capabilities. 31 system-defined. Enforced via `has_permission()`. |
| DeusEx | System super-admin group. Authority of last resort for lifecycle edge cases. |

**The Universal Group Pattern:**
Every user belongs to a personal group. That personal group joins other groups. This unified model means individuals and groups are treated identically by the permission system. There are no special cases for individual users vs group members.

**The three-layer permission model:**
1. **Permissions** — atomic capabilities (e.g. `members.invite`, `journey.enroll`). System-defined. Grows only when developers add new features.
2. **Role templates** — system-level blueprints. Four templates: Steward (full management), Guide (journey facilitation), Member (standard participation), Observer (read-only).
3. **Group roles** — instances per group, copied from templates and customisable. "Steward" in Group A may have different permissions than "Steward" in Group B.

**Runtime enforcement:** `has_permission(user_id, group_id, permission_name)` — never hardcode role name checks in application code.

**DeusEx:** The system group whose members have platform-level authority. Used for stewardship transfer when a Steward exits without a nominated successor, for platform administration, and as the fallback for any lifecycle edge case that no regular role can resolve. Checked via `is_platform_admin()` — a SECURITY DEFINER function.

**What L2 depends on:** L0 (RLS, database), L1 (users must exist before they can be organised).

---

### L3 — Experience Engine
*What do people do? The architectural linchpin.*

| Element | Role |
|---------|------|
| Journey catalogue | Browsable collection of available journeys |
| Journey designer | Tool for creating and editing journeys (Dreamineer-facing) |
| Enrolments | User or group signing up for a journey |
| Step types | The building blocks of a journey — content units with defined behaviour |
| Progress tracking | Where a member is in a journey, what is complete, personal context |
| Journey Zero | The onboarding journey — the first journey every new member walks automatically |

**Why L3 is the linchpin:**
Everything above L3 depends on it. L4 Content is the substance inside journeys. L5 Communication is contextualised by journey membership. L6 Discovery surfaces journeys. L7 Intelligence accumulates insights from journey engagement. Building features above L3 before L3 is correctly specced means rebuilding those features when L3 changes.

**Step types — two tiers:**

*Tier 1 — Ferd core:*
- Narrative — rich text/story content. No profile data written.
- Reflection prompt — open question, free-form response. Writes to profile_data (private by default).
- Structured self-assessment — validated framework questions (Big 5, VIA etc.). Core profile data.
- Choice/selection — member picks from options, can shape journey direction. Writes to profile_data.
- Activity confirmation — member does something in real world and confirms. Optional profile data.
- Journal entry — free writing attached to a journey moment. Private by default.
- Checklist — small actions to complete before proceeding. No profile data.

*Tier 2 — Early Ferd:*
- Video — embedded content.
- File/resource — downloadable material.
- Quiz — knowledge check with right/wrong answers.
- Mood/state check-in — quick emotional or energy capture. Pattern data over time.
- External link — points outside platform.

**The step type system must be extensible from day one.** New step types must be addable without rebuilding the core data model. This is the most important architectural decision in L3.

**Journey Zero:**
Onboarding is not a feature — it is a journey. Journey Zero is the first journey every shadow (visitor) walks automatically on arrival. It cannot be fully designed until the Journey specification session is complete. It is a placeholder in the anatomy, not yet implemented.

**What L3 depends on:** L0 (storage, database), L1 (member identity, profile_data), L2 (group enrolments, permissions).

---

### L4 — Content
*The substance inside journeys.*

| Element | Role |
|---------|------|
| Narrative | Story content — world-building, episode text, framing |
| Reflections | Member-generated responses to prompts |
| Assessments | Structured self-knowledge tools (Big 5, VIA, Culture Map etc.) |
| Journal | Free-form member writing |
| Media | Images, video, audio assets |
| Assets | 3D models, downloadable files, attachments |
| i18n strings → | User-facing text externalised to translation files (grows in Hamn) |

**i18n constraint:**
All user-facing strings in L4 — narrative text, prompt questions, assessment labels — must be externalised to translation files, not hardcoded in components or database records. This is a build constraint, not a feature. It applies from day one even if FringeIsland launches in English only.

**Media and assets:**
For Ferd, media lives in Supabase Storage (L0). Basic image upload and retrieval. In Hamn, as the Dreamineer marketplace grows and video content increases, a dedicated media delivery strategy (CDN, video transcoding) becomes necessary. This is flagged as a future concern — `→` — but the L0 Storage foundation is correct for now.

**Content moderation:**
In Ferd, content is Foundation-created — moderation is trivial. In Hamn, Dreamineer-created content requires a moderation workflow. This is a cross-cutting concern handled by the Administration vertical, not a separate layer. The anatomy supports it — no structural change needed.

**What L4 depends on:** L0 (storage), L1 (content belongs to members or is authored by Dreamineers), L3 (content lives inside journeys).

---

### L5 — Communication
*How do people connect?*

| Element | Role |
|---------|------|
| DM | Direct messages between two members. One-to-one, personal. |
| Forums | Group-scoped discussion boards. Posts and replies. Peer-to-peer belonging. |
| Announcements | One-to-many messages. Role-controlled. Stewards announce to group, DeusEx platform-wide. |
| Activity feed | Lightweight sense of a living platform. Member-to-world ambient awareness. |

**Forum anonymisation:**
When a member leaves a group, their forum posts are not deleted and not mutated. A soft-flag approach is used: posts retain their original `author_id` but display "Former Member" based on current membership status. If the member rejoins, their name reappears automatically. This is enforced at the display layer, not the data layer.

**Real-time:**
Supabase provides real-time subscriptions via PostgreSQL LISTEN/NOTIFY. Activity feeds and forum updates can use this without additional infrastructure. DM delivery benefits from real-time. This is an implementation detail for L5 features — the architecture supports it via L0.

**What L5 depends on:** L0 (database, real-time), L1 (sender/receiver identity), L2 (group membership determines forum access), L3 (some communication is journey-contextual).

---

### L6 — Discovery
*How do people find things?*

| Element | Role |
|---------|------|
| Search | Full-text search across journeys, groups, members, content |
| Recommendations | Surface relevant journeys and groups based on member profile and activity |
| Marketplace browsing | Browse Dreamineer-created journeys, experiences, physical products |
| Search index → | Dedicated search infrastructure (grows from PostgreSQL tsvector in Ferd to dedicated service in Hamn) |

**Search infrastructure:**
For Ferd, PostgreSQL's built-in full-text search (`tsvector`, `tsquery`) is sufficient. As the journey catalogue, member directory and marketplace grow in Hamn, a dedicated search service (Algolia, Meilisearch, or scaled PostgreSQL) becomes necessary. This is flagged as a future concern — `→`.

**Recommendations depend on data:**
Meaningful recommendations require L3 journey progress data, L1 profile_data (assessments, interests), and aggregated behaviour across members. Recommendations are impossible to build correctly before L3 is solid. Discovery is correctly placed above the Experience engine in the layer stack.

**Visitor access:**
Visitors can browse the marketplace and preview journeys in L6. They cannot enrol (L3) or participate in community spaces (L5) without registering. This boundary is enforced by RLS policies in L0.

**What L6 depends on:** L0 (search indexes, database), L1 (member identity for personalisation), L2 (group visibility), L3 (journey catalogue), L4 (content to surface), L5 (community spaces to discover).

---

### L7 — Intelligence
*What does the platform learn?*

| Element | Role |
|---------|------|
| AI Mentor | Opt-in conversational companion. Contextually aware. Privacy-first. |
| Profile accumulation | Aggregation of profile_data into a coherent member portrait |
| Insights | Patterns surfaced from journey engagement and reflection over time |
| AI provider → | External AI API dependency — grows in capability and privacy significance in Hamn |

**The AI Mentor:**
The AI Mentor is not an external guide. It is the member's parallel self — a companion from a universe where they never found the answers either. It asks genuine questions born from its own incompleteness, which accidentally ask exactly what the member needs to hear.

Implementation principles:
- Opt-in per entry or as global setting — never imposed
- Responds in FringeIsland's voice — warm, curious, non-prescriptive
- Insight is always a question or observation, never a judgment or score
- Member data never stored by AI provider beyond the API call
- Member can reset or delete Mentor memory at any time
- Consent managed through the Privacy vertical

For Ferd, the AI Mentor foundation is built: privacy controls, consent model, context storage in profile_data. The full narrative expression (parallel self mechanic) lives in Hamn.

**AI provider dependency:**
The AI Mentor calls an external AI provider. This is a L0-level external service dependency — like Stripe for Transactions. Member reflection data sent to an AI provider requires explicit consent (Privacy vertical) and data processing agreements (GDPR). The AI provider must be named in L0 and the Privacy vertical must explicitly cover AI data handling.

**What L7 depends on:** everything below it. Profile accumulation draws from L3 (journey progress), L4 (content engaged with), L5 (community participation). Intelligence without the lower layers is empty.

---

## The Five Vertical Concerns

Verticals are cross-cutting concerns that touch every layer simultaneously. They are not features — they are constraints and capabilities that apply everywhere.

### Administration
*Lifecycle events — human operated*

Administration manages state changes that cascade across multiple layers simultaneously. When a user is soft-deleted, the consequences ripple through L1 (profile), L2 (memberships, stewardship), L3 (enrolments), L4 (content), L5 (forum posts anonymised), L6 (removed from discovery), L7 (Mentor context archived).

**The cascade principle:** Every significant lifecycle event must have a complete cascade specification before it is implemented. The cascade documents what happens at every layer. Database triggers and RLS policies do the heavy lifting — application code does not patch layer-by-layer after the fact.

**Key lifecycle events:**
- User soft-delete — cascades L7 → L0
- User reactivation — reverses the cascade
- Stewardship transfer — L2 event with L3, L5 consequences
- Group archive — L2 event with L3, L4, L5 consequences
- Journey completion — L3 event with L1 (profile_data), L7 (insights) consequences
- Content moderation action — L4 event with L5, L6 consequences

**DeusEx authority:** DeusEx is the actor of last resort in the Administration vertical. Operations that no regular role can perform — emergency stewardship transfer, platform-level data correction — are executed by DeusEx members.

**Moderation** lives in Administration. In Ferd, content is Foundation-controlled and moderation is trivial. In Hamn, Dreamineer-created content requires a moderation workflow — review, approve, reject, remove — all administered through this vertical.

---

### Privacy · GDPR
*Member data sovereignty — always*

Privacy is a founding value of FringeIsland, not a compliance checkbox. The manifesto principle is "member privacy over commercial opportunity." This vertical is the architectural expression of that promise.

**Member rights implemented through this vertical:**
- **Right to access** — aggregate all member data from every layer on request
- **Right to erasure** — cascade deletion across every layer, leaving no orphaned data
- **Right to portability** — export member data in a usable format
- **Right to rectification** — correct member data across layers
- **Consent management** — record what each member consented to and when
- **Privacy preferences** — member-controlled visibility per data type and bucket
- **Data map** — GDPR Article 30 record of what data exists where

**AI data handling:**
Member data sent to the AI provider (L7) requires explicit, granular consent. This consent is recorded in the Privacy vertical. The data processing agreement with the AI provider must be documented. Members must be able to withdraw AI consent and have their AI Mentor context deleted.

**Privacy by design:**
Every new feature touches the Privacy vertical during specification. The question is not "does this feature need a privacy policy?" but "what data does this feature collect, from which layer, under what consent basis, for how long?"

---

### Notifications · Email
*Event signals — observes all layers, delivers to member*

Notifications observe events across every layer and deliver signals to members. Nothing in the system changes as a result of a notification — it is purely informational.

**Delivery channels:**
- In-app notification centre — bell icon, aggregates relevant activity
- Email — transactional only in Ferd (registration, account events). No marketing without explicit consent.
- Push notifications → — APNS (iOS) and FCM (Android) when native apps launch in Hamn

**Communication relationships served:**
- DM — one-to-one personal signal
- Forum — group activity signal
- Announcements — one-to-many direction
- Notifications — platform to member ambient awareness
- Activity feed — member to world presence

**Email delivery service** lives in L0 as a named external dependency. Resend, Postmark or equivalent. Email is not the same as in-app notifications — it is an outbound channel with its own deliverability, unsubscribe management and GDPR consent concerns.

---

### Observability · Audit
*System health and accountability — read only*

Observability observes the system and records what happened. It never mutates state. It is the answer to "what is happening right now?" and "what went wrong and why?"

**Three components:**
- **Logs** — structured event logs from every layer. Who did what, when, to what data.
- **Metrics** — system performance indicators. Response times, error rates, database query performance.
- **Audit trail** — immutable record of significant actions. Required by GDPR for data access and modification events.

**Error tracking:**
Production errors must be captured, aggregated and alerted on. A dedicated error tracking service (Sentry or equivalent) is the standard approach. Knowing when things break is as important as knowing what happened in audit logs.

**Audit trail** is not just a technical concern — it is a trust and privacy concern. When a member asks "what has been done with my data?", the audit trail answers. When DeusEx performs a lifecycle operation, the audit trail records it. This is also a GDPR requirement for data access logs.

---

### Transactions · Stripe
*Entitlement events — automated*

Transactions are cross-cutting entitlement events driven by Stripe webhooks. A purchase triggers consequences that ripple across layers: L6 (what was bought), L3 (what journey is now accessible), L2 (what group tier the member belongs to), L1 (subscription state reflected in profile).

**Stripe Connect:**
FringeIsland never builds payment logic. Stripe Connect handles marketplace payments — a buyer pays, Stripe splits revenue between the Foundation (platform %) and the creator automatically. FringeIsland stores only: Stripe payment reference, entitlement unlocked, creator earning record.

**Ferd scope:**
Transactions vertical is a placeholder in Ferd — architecture present, not implemented. The first tier subscription (free → paid) may introduce a basic Stripe integration in late Ferd. Full marketplace launches in Hamn.

**Transactions vertical vs Administration vertical:**
Both are cross-cutting but operated by different actors. Administration is human-operated lifecycle events. Transactions are automated Stripe-driven entitlement events. They are separate verticals precisely because they have different actors, different triggers, and different consequence patterns.

---

## The Platform API Ring

The Platform API ring is the contract between the backend anatomy and every frontend that connects to it.

**It serves two purposes simultaneously:**

**Now (Ferd):** Frontend contract. The web platform calls these API routes. Every piece of functionality is accessible through a clean `/api/...` route. Business logic lives in API routes, not in Next.js server components or page files. The frontend calls the API — it does not reach into the database directly.

**Later (Hamn):** Extension surface. Native iOS and Android apps call the same API routes. Dreamineer plugins connect through defined extension points. Third-party integrations connect via webhooks.

**API-first principle:**
Every Ferd feature is built as if iOS and Android already exist. The API is designed to serve multiple clients without redesign. This costs almost nothing to get right now and is very expensive to fix later.

**The ring includes:**
- Rate limiting — protecting the system from abuse and ensuring fair usage
- API versioning — enabling the API to evolve from Ferd to Hamn without breaking existing clients (`/api/v1/`, `/api/v2/`)
- Authentication middleware — JWT validation on every request
- Extension surface → — plugin connection points, defined in Hamn

**Pattern — always follow this:**
```
Database (Supabase/PostgreSQL with RLS)
    ↓
API route (/api/feature/action)
    ↓
Frontend component (React/Next.js)
```

**Never:**
```
Database → Frontend component directly
```

---

## The Design System

The design system sits above the Platform API ring and feeds every frontend. It is not a layer — it is a shared resource that every frontend draws from.

**What it defines:**
- Visual language — colours, typography, spacing, iconography
- World aesthetic — how FringeIsland feels — atmosphere, tone, visual metaphors
- Component library — buttons, cards, forms, navigation patterns
- Interaction patterns — how things move, respond, animate
- World-specific elements — garden interface, avatar display, journey step presentation

**Two constraints that apply at the design system level:**

**i18n (Internationalisation):** The design system must be built assuming multiple languages from day one. Components must accommodate varying text lengths. No hardcoded string content in components. All user-facing text references translation keys.

**a11y (Accessibility):** FringeIsland's manifesto says "belonging over fitting in." Excluding members with visual, motor or cognitive differences contradicts that principle directly. The design system must meet WCAG 2.1 AA as a baseline. Semantic HTML, keyboard navigation, screen reader support, and sufficient colour contrast are not optional.

---

## The Frontends

Multiple frontend clients connect to the same backend anatomy through the Platform API ring. They share the same data, the same identity, the same journeys — but present them differently.

| Frontend | Wave | Primary context |
|----------|------|----------------|
| Web platform (Ferd) | Wave 1 — now | Deep work, reflection, Dreamineer creation |
| Web platform (Hamn) | Wave 2 | Full FringeIsland member experience |
| iOS native app | Wave 2 — Hamn | On-the-go, notifications, quick engagement |
| Android native app | Wave 2 — Hamn | On-the-go, notifications, quick engagement |
| Game | Wave 3+ | Immersive three-realm experience, Unreal Engine |

**The same world, different entry points:**
A member might use the web platform for deep reflection in the evening, the iOS app for a journey activity during their commute, and the game on a weekend to explore The Other Side. The backend anatomy serves all of them identically. The design system makes them feel like the same world.

---

## Dependency Summary

| Layer | Depends on |
|-------|------------|
| L7 Intelligence | L0, L1, L2, L3, L4, L5, L6 |
| L6 Discovery | L0, L1, L2, L3, L4, L5 |
| L5 Communication | L0, L1, L2, L3 |
| L4 Content | L0, L1, L3 |
| L3 Experience engine | L0, L1, L2 |
| L2 Organisation | L0, L1 |
| L1 Identity | L0 |
| L0 Infrastructure | — |

**Verticals touch:** every layer simultaneously
**Platform API ring touches:** all layers via API routes
**Design system touches:** all frontends
**Frontends connect through:** Platform API ring

---

## What This Means for Build Order

The anatomy dictates the build order. You cannot build a layer before everything below it is solid.

**Already solid (Ferd v0.2.7+):**
- L0 — Infrastructure complete
- L1 — Identity mostly complete (visitor/temporary profile to be added)
- L2 — Organisation complete

**The linchpin — spec before building above:**
- L3 — Experience engine — requires a dedicated specification session before significant L4/L5/L6 work

**Build after L3 is specced:**
- L4 — Content
- L5 — Communication (partial already exists)
- L6 — Discovery
- L7 — Intelligence (foundation in Ferd, full expression in Hamn)

**Verticals to implement progressively:**
- Administration — implement cascade specs as each lifecycle event is built
- Privacy — implement consent and erasure as each data-generating feature is built
- Notifications — implement as L5 communication features are built
- Observability — implement audit logging from day one, error tracking from first deploy
- Transactions — placeholder in Ferd, implement in Hamn

---

## Glossary

| Term | Definition |
|------|------------|
| Anatomy | The layered model of FringeIsland's platform — what it is made of and how parts relate |
| Layer | A horizontal capability level. Nothing above a layer exists without everything below it. |
| Vertical | A cross-cutting concern that touches every layer simultaneously |
| L0 | Infrastructure — Supabase, PostgreSQL, Auth, RLS, Storage, pg_cron |
| L1 | Identity — visitor and member profiles, profile_data, sessions |
| L2 | Organisation — groups, memberships, roles, permissions, DeusEx |
| L3 | Experience engine — journeys, steps, enrolments, progress |
| L4 | Content — narrative, reflections, assessments, journal, media |
| L5 | Communication — DM, forums, announcements, activity feed |
| L6 | Discovery — search, recommendations, marketplace browsing |
| L7 | Intelligence — AI Mentor, profile accumulation, insights |
| profile_data | Dynamic member data table — flexible buckets, no fixed schema |
| Visitor | Anonymous user with temporary profile. Moves through FringeIsland like a shadow. |
| Member | Registered user with permanent profile. Garden door is open. |
| DeusEx | System super-admin group. Authority of last resort for lifecycle edge cases. |
| Steward | Group leadership role. Formerly "Group Leader". |
| Guide | Journey facilitation role. Formerly "Travel Guide". |
| has_permission() | Runtime permission check function. Always use this — never hardcode role names. |
| is_platform_admin() | SECURITY DEFINER function checking DeusEx membership. |
| Feature flag | Database-stored on/off switch for features. Lives in L0. |
| Journey Zero | First journey every new member walks. Onboarding as a journey. |
| Ferd | Current web platform. Departure point. Wave 1. |
| Hamn | Evolved FringeIsland experience platform. Wave 2. |
| Platform API ring | Contract between backend anatomy and all frontends |
| → | Marks a known future concern within an existing element — grows over time |
| ADR | Architecture Decision Record — documented decision with context and reasoning |

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `ARCHITECTURE_DECISIONS.md` | Why each architectural decision was made — ADRs with full reasoning |
| `ARCHITECTURE_BASELINE.md` | Current implementation state — tables, routes, components mapped to anatomy layers |
| `ARCHITECTURE_DECISIONS_LEGACY.md` | Historical decisions from pre-anatomy phase — ADR-001 through ADR-006 |
| `DATABASE_SCHEMA.md` | Complete PostgreSQL schema with RLS policies |
| `AUTHORIZATION.md` | Authorization model detail — has_permission(), RLS patterns |
| `docs/vision/VISION.md` | The north star — why FringeIsland exists |
| `docs/vision/MANIFESTO.md` | The values — what FringeIsland believes |
| `docs/vision/CONTRIBUTION_ARCHITECTURE.md` | Who can build what — visitor through Foundation |

---

*This document is locked at v1.0. Changes to the anatomy require deliberate architectural review and updates to ARCHITECTURE_DECISIONS.md. The anatomy is a living contract — it evolves as FringeIsland grows, but never casually.*
