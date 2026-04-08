# FringeIsland — Session Summary
*Created: March 2026 — Architecture & Anatomy Session*
*Language: English — internal documentation for Stefan*

---

## PROJECT/CONTEXT: What is this about?

FringeIsland is an Immersive Edutainment project — a movement and platform creating an alternative world parallel to everyday life. Three core questions drive everything: Who am I? What do I want? How do I get there?

Stefan is the founder and sole developer, working via a vibe coding methodology — planning in Claude, implementing in Claude Code.

**This session** focused entirely on building and validating a complete system anatomy for FringeIsland — a layered architectural framework that serves as the contract for all future development.

The session originated from a concrete problem: Stefan had been experiencing recurring rebuilds during Ferd development — implementing features that then required rework of foundational elements that weren't designed to support them. The problem was diagnosed as building without a dependency map. The solution was to build one.

---

## DECISIONS MADE: What did we decide, and why?

---

### 1. Layered anatomy as the primary architectural framework

**Decision:** Eight horizontal layers (L0–L7) with L0 as the ground and each layer building on everything below it. The fundamental rule: nothing at a higher layer can exist without everything below it being solid.

**Why:** The recurring rebuild problem was caused by building features without knowing their full cross-layer dependencies. A visible dependency order makes build sequence obvious and prevents the pattern of discovering incomplete foundations mid-implementation.

**Why layers specifically over other approaches:**
- Feature-based organisation obscures cross-feature dependencies
- Domain-driven design adds complexity not warranted for a solo developer
- No explicit framework was what caused the rebuild problem in the first place

---

### 2. Five vertical concerns alongside the layers

**Decision:** Administration, Privacy/GDPR, Notifications/Email, Observability/Audit, Transactions — each a cross-cutting concern touching every layer simultaneously.

**Why five and not fewer:**
Each vertical has a fundamentally different actor and interaction pattern:
- Administration — human-operated lifecycle mutations
- Privacy — member data rights and compliance
- Notifications — observational, outbound signals
- Observability — read-only system health
- Transactions — automated Stripe-driven entitlements

Merging any two would obscure the distinction between different kinds of cross-cutting responsibility.

**Ordering from layers outward:** Administration → Privacy → Notifications → Observability → Transactions
(Tightest to layers → most external)

---

### 3. L1 Identity — visitor anonymous sign-in with temporary profile

**Decision:** Supabase anonymous sign-in creates a real but temporary session on first visit. A temporary profile is created simultaneously (`is_temporary: true`). Everything a visitor does saves to this temporary profile. On registration, the anonymous session converts to permanent and `is_temporary` flips to `false`. pg_cron cleans up stale temporary profiles.

**Why anonymous sign-in over browser storage:**
Browser storage is lost if the visitor clears their browser or switches devices. Anonymous sign-in creates a real database record that persists and converts cleanly. This is the only approach that delivers the garden door metaphor properly — the garden exists before it is claimed.

---

### 4. L1 Identity — profile_data as a separate flexible table

**Decision:** Dynamic member data lives in a separate `profile_data` table with a bucket/source model. Buckets are data, not schema. New data types added without migrations.

```sql
profile_data (
  id, user_id, bucket, source, source_id, content (jsonb), visibility, created_at
)
```

**Why not JSONB on the profile record:**
Fixed JSONB fields lock the schema — adding a new data category requires a migration touching every profile record. The `profile_data` table approach makes the container the schema and the content flexible.

**Why not separate tables per data type:**
A new table per type means a new migration for every new type. Querying a member's complete portrait across all types becomes unnecessarily complex.

---

### 5. API-first, frontend-agnostic backend

**Decision:** Every piece of Ferd functionality is accessible through a clean `/api/...` route. Business logic lives in API routes, not in Next.js server components or page files. Database → API route → Frontend component. Never database → frontend directly.

**Why from day one in Ferd:**
The cost of getting this right now is minimal — it is a discipline of where code is written, not additional infrastructure. The cost of retrofitting it when iOS and Android arrive is very high — every feature that reaches directly into the database needs to be wrapped in an API route before native clients can use it.

---

### 6. Privacy as a dedicated vertical

**Decision:** Privacy/GDPR is a fifth vertical — not absorbed into Administration, not buried in L0.

**Why:**
FringeIsland's manifesto says "member privacy over commercial opportunity." If privacy is absorbed into Administration, it architecturally becomes a subset of operational concerns. Making it a visible vertical communicates to every developer: privacy implications are part of every feature specification. GDPR also requires more than lifecycle events — consent management, portability, Article 30 data map, and AI data handling are distinct from administration.

---

### 7. Transactions as a dedicated vertical using Stripe Connect

**Decision:** Transactions are a dedicated vertical. FringeIsland never builds payment logic. Stripe Connect handles marketplace payments. FringeIsland stores only: Stripe payment reference, entitlement unlocked, creator earning record.

**Why Stripe Connect:** It is designed precisely for marketplace payment splits. Building payment processing from scratch would take years and introduce significant compliance risk.

**Why separate from Administration:** Different actors (automated vs human), different triggers (Stripe webhooks vs human decisions), different consequence patterns.

---

### 8. Observability as a dedicated vertical

**Decision:** Observability is a fourth vertical — read-only, passive, touching every layer. Three components: structured logs, performance metrics, immutable audit trail. Error tracking (Sentry or equivalent) named explicitly.

**Why the audit trail is a trust concern:**
When a member asks "what has been done with my data?" the audit trail answers. This is a member rights concern as much as an operational one. GDPR requires it.

---

### 9. Platform API ring — present contract and future extension surface

**Decision:** The Platform API ring serves two purposes simultaneously — it is the present frontend contract for Ferd, and the future extension surface for Hamn plugins. It includes: rate limiting, API versioning (`/api/v1/`), authentication middleware.

**Why API versioning from day one:**
Adding versioning retroactively means renaming every existing route and updating every client. Doing it from day one is a path prefix that costs nothing.

---

### 10. Design system — i18n and a11y as constraints, not features

**Decision:** All user-facing strings externalised to translation files from day one. WCAG 2.1 AA as a baseline accessibility target.

**Why constraints and not features:**
Retrofitting i18n costs 3-5x more than building it correctly initially. Retrofitting accessibility often requires redesigning components entirely. Treating them as constraints — things that are true of how we build — prevents the retrofitting problem.

**Why a11y aligns with the manifesto:**
"Belonging over fitting in" — excluding members with disabilities contradicts this principle directly.

---

### 11. Feature flags in L0

**Decision:** Simple database configuration table in L0. Toggle features without deployment.

**Why database over environment variables:**
Environment variables require a redeploy to change. A database flag can be toggled in real time for specific users, groups or environments — essential for the Ferd→Hamn transition.

---

### 12. Administration — cascade specification before implementation

**Decision:** Every significant lifecycle event must have a complete cascade specification before it is implemented — documenting what happens at every layer when the event fires.

**Why:** The recurring rebuild problem during Ferd development was caused precisely by implementing lifecycle events without knowing their full cross-layer consequences. Specifying the cascade first forces the question: what does this event do to every layer?

---

### 13. Forum anonymisation — soft-flag, not data mutation

**Decision:** Forum posts retain `author_id`. Display logic shows "Former Member" based on current membership status. Historical data is never mutated. Rejoin restores the member's name automatically.

**Why not delete posts:**
Deleting posts damages the integrity of forum conversations.

**Why not mutate the stored author:**
Irreversible. Breaks the historical record. The soft-flag approach is reversible and handles the rejoin case automatically.

---

### 14. ARCHITECTURE_BASELINE.md is Claude Code generated

**Decision:** The baseline is generated by Claude Code reading the live repository — not hand-written. Regenerated after each significant implementation session.

**Why:** Claude Code can read every file, every migration, every API route and generate an accurate inventory. A human writing this document will inevitably let it go stale. Accuracy requires generation from the source of truth.

---

### 15. Document structure — three architecture documents

**Decision:**
- `ARCHITECTURE_ANATOMY.md` — what the system is (layers, verticals, outer elements)
- `ARCHITECTURE_DECISIONS.md` — why it is this way (24 ADRs with full reasoning)
- `ARCHITECTURE_BASELINE.md` — how it is currently implemented (Claude Code generated)
- `ARCHITECTURE_OVERVIEW.md` → renamed to `ARCHITECTURE_DECISIONS_LEGACY.md` (historical ADRs preserved)

**Why "architecture" not "anatomy" in filenames:**
Developers and collaborators recognise and search for "architecture." The word "anatomy" is used within the documents and in sessions — it carries warmth and meaning. Filenames use convention; content uses the right language.

---

### 16. Media and assets named in L4

**Decision:** Media (images, video, audio) and assets (3D models, files) are explicitly named in L4 Content. Supabase Storage handles it in Ferd. A dedicated media delivery strategy is flagged as a `→` future concern for Hamn.

---

### 17. L3 is the architectural linchpin

**Decision:** L3 Experience engine is identified as the most critical layer to specify correctly before building above it. Every layer above L3 (L4, L5, L6, L7) depends on it being solid.

**Why this matters right now:** L3 is partially built but not fully specified. The step type data model must be extensible from day one. A dedicated Journey specification session is the most urgent next piece of work.

---

## REJECTED ALTERNATIVES: What did we consider but discard?

| Decision | Rejected alternative | Why rejected |
|----------|---------------------|--------------|
| Layered anatomy | Feature-based organisation | Obscures cross-feature dependencies, ambiguous build order |
| Layered anatomy | Domain-driven design | Unnecessary complexity for solo developer at this stage |
| Five verticals | Single "cross-cutting concerns" vertical | Loses important distinctions between human vs automated, mutating vs observational |
| Privacy as dedicated vertical | Absorb into Administration | Privacy is a founding value — absorbing it makes it architecturally invisible |
| Privacy as dedicated vertical | Sublayer within L0/L1 | Privacy is cross-cutting — erasure touches every layer, not just the lower ones |
| Transactions as dedicated vertical | Layer in the horizontal stack | Transactions don't depend on layers below them — they are event-driven |
| Stripe Connect | Build payment logic ourselves | Years of engineering, significant compliance risk |
| profile_data separate table | JSONB fields on profile record | Locks schema — adding new data category requires migration on every profile |
| profile_data separate table | Separate table per data type | New migration per type, complex cross-type queries |
| Anonymous sign-in for visitors | Browser storage only | Lost on browser clear or device switch, cannot deliver seamless conversion |
| API-first from Ferd | Defer to Hamn | Retrofitting costs very high when iOS/Android arrive |
| API versioning from Ferd | Add versioning when needed | Adding retroactively means renaming all routes and updating all clients |
| i18n/a11y as constraints | Add as features later | Retrofitting i18n costs 3-5x more; retrofitting a11y requires component redesign |
| Feature flags in database | Environment variables | Cannot be toggled without redeploy |
| Soft-flag forum anonymisation | Delete posts on member exit | Damages conversation integrity, irreversible |
| Soft-flag forum anonymisation | Mutate stored author | Irreversible, breaks historical record |
| Claude Code generated baseline | Hand-written baseline | Inevitable staleness — accuracy requires generation from source of truth |

---

## CURRENT STATE: Exactly where are we now?

### Documents produced (ready for repo)

| File | Destination | Status |
|------|-------------|--------|
| `ARCHITECTURE_ANATOMY.md` | `docs/architecture/` | ✅ Complete — locked v1.0 |
| `ARCHITECTURE_DECISIONS.md` | `docs/architecture/` | ✅ Complete — locked v1.0 (24 ADRs) |
| `ARCHITECTURE_ANATOMY_DIAGRAM.svg` | `docs/architecture/` | ✅ Complete — locked v1 |
| `SESSION_BRIDGE_ARCHITECTURE.md` | Reference only | ✅ Complete |
| `SESSION_SUMMARY_ARCHITECTURE.md` | Reference only | ✅ This document |

### Repo files awaiting Claude Code

| File | Action needed |
|------|--------------|
| `docs/architecture/ARCHITECTURE_OVERVIEW.md` | Rename → `ARCHITECTURE_DECISIONS_LEGACY.md` |
| `docs/architecture/ARCHITECTURE_BASELINE.md` | Regenerate structured around anatomy layers |
| `README.md` | Light update — new document structure |
| `CLAUDE.md` | Update — add anatomy as primary reference, API-first pattern, wave model |

### Anatomy completion state per layer

| Layer | Status | Notes |
|-------|--------|-------|
| L0 Infrastructure | ✅ Solid | All infrastructure in place |
| L1 Identity | ⚠️ Mostly solid | Visitor/temporary profile not yet implemented |
| L2 Organisation | ✅ Solid | Groups, roles, permissions complete |
| L3 Experience engine | ⚠️ Partial | Catalogue exists — full spec session needed |
| L4 Content | ⏳ Not built | Placeholder |
| L5 Communication | ⚠️ Partial | DM and forum foundations exist |
| L6 Discovery | ⏳ Not built | Placeholder |
| L7 Intelligence | ⏳ Not built | Placeholder |
| Administration vertical | ⚠️ Partial | Cascade specs not yet written |
| Privacy vertical | ⏳ Placeholder | Architecture present, not implemented |
| Notifications vertical | ⚠️ Partial | In-app notifications exist |
| Observability vertical | ⏳ Placeholder | Architecture present, not implemented |
| Transactions vertical | ⏳ Placeholder | Hamn concern |

---

## NEXT STEPS: What would we do next?

### Immediate — Claude Code (prompt is in SESSION_BRIDGE_ARCHITECTURE.md)
1. Rename `ARCHITECTURE_OVERVIEW.md` → `ARCHITECTURE_DECISIONS_LEGACY.md`
2. Regenerate `ARCHITECTURE_BASELINE.md` structured around anatomy layers
3. Update `README.md` and `CLAUDE.md`

### Most urgent development session
**Journey + Journey Designer specification** — L3 is the linchpin. Nothing above it should be significantly built without this. Covers:
- Journey data model
- Step type data model and extensibility
- Branching/path logic
- Journey Zero design
- Enrolment model detail

### Remaining dedicated sessions (priority order)
1. Journey + Journey Designer specification
2. Roadmap rewrite — replace old phase 1-4 with wave model
3. Shadow/visitor access model detail
4. Avatar and parallel self mechanic (Hamn)
5. First Season Design — founding narrative, S1:E1
6. Kickstarter Campaign Design

---

## TECHNICAL STATE: Code, configuration, file structure

### Stack
```
Framework:    Next.js 16.1 App Router
Language:     TypeScript
Styling:      Tailwind CSS
Database:     Supabase (PostgreSQL)
Auth:         Supabase Auth (anonymous + email/password)
Repo:         Stefansteffansson/FringeIsland (main branch)
Supabase URL: https://jveybknjawtvosnahebd.supabase.co
```

### Database
- 19 tables, RLS enabled on all tables
- Key field: `users.full_name` (not `display_name`)
- Permission system: `has_permission(user_id, group_id, permission_name)`
- Platform admin: `is_platform_admin()` — SECURITY DEFINER function checking DeusEx membership
- Leadership role: **Steward** (not "Group Leader")
- Journey facilitation role: **Guide** (not "Travel Guide")

### Critical technical patterns
```
API pattern:    Database → /api/route → React component (never skip middle step)
Auth pattern:   AuthContext + useAuth() hook
Route guard:    proxy.ts (not middleware.ts — Next.js 16.1)
Default landing: /groups
Modals:         ConfirmModal (never browser alerts)
Role checks:    has_permission() (never hardcode role names)
```

### Document structure (complete picture)
```
docs/
  vision/
    VISION.md                          ← north star vision
    MANIFESTO.md                       ← 11 principles, 4 clusters
    CONTRIBUTION_ARCHITECTURE.md       ← who can build what
    PRODUCTS_AND_PLATFORM.md           ← product ecosystem and waves
  architecture/
    ARCHITECTURE_ANATOMY.md            ← NEW — layer/vertical model
    ARCHITECTURE_DECISIONS.md          ← NEW — 24 ADRs with reasoning
    ARCHITECTURE_ANATOMY_DIAGRAM.svg   ← NEW — visual anatomy map
    ARCHITECTURE_DECISIONS_LEGACY.md   ← RENAMED from ARCHITECTURE_OVERVIEW.md
    ARCHITECTURE_BASELINE.md           ← REGENERATE via Claude Code
    DATABASE_SCHEMA.md                 ← complete schema
    AUTHORIZATION.md                   ← RLS patterns, has_permission()
    DOMAIN_ENTITIES.md                 ← domain model
  planning/
    VISION_DECISIONS.md                ← session decision record
    ROADMAP.md                         ← needs rewrite (dedicated session)
    DEFERRED_DECISIONS.md              ← deliberately deferred items
README.md                              ← needs light update
CLAUDE.md                              ← needs update
```

### Profile data table (new — not yet implemented)
```sql
profile_data (
  id          uuid PRIMARY KEY
  user_id     uuid → profiles (NOT NULL)
  bucket      text    -- 'assessment', 'reflection', 'insight', 'intention' etc.
  source      text    -- 'journey_step', 'ai_mentor', 'self', 'community' etc.
  source_id   uuid    -- reference to whatever generated this
  content     jsonb   -- flexible per bucket type
  visibility  text    -- 'private', 'semi_public', 'public'
  created_at  timestamptz
)

Required indexes:
  (user_id)
  (user_id, bucket)
  (source, source_id)
  (user_id, visibility)
```

### Feature flags table (new — not yet implemented)
```sql
feature_flags (
  id          uuid PRIMARY KEY
  key         text UNIQUE NOT NULL   -- e.g. 'visitor_profiles', 'ai_mentor'
  enabled     boolean DEFAULT false
  description text
  created_at  timestamptz
)
```

### Visitor identity (new — not yet implemented)
- Use Supabase anonymous sign-in on first visit
- Create profile record with `is_temporary: true`
- On registration: convert session, flip `is_temporary` to `false`
- pg_cron job: delete temporary profiles older than configured period

---

## ASSUMPTIONS: What do we take for granted that a new session won't know?

1. **Ferd is a PoC, not a constraint** — the current codebase does not define or limit the vision. The platform follows the vision, never the other way around.

2. **The anatomy is the contract** — `ARCHITECTURE_ANATOMY.md` is the primary reference for all development work. Before implementing any feature, identify which layers and verticals it touches.

3. **L3 is the linchpin** — building significant L4, L5, L6 or L7 features before L3 is properly specced will cause rebuilds. This is the single most important constraint on what to build next.

4. **Cascade before implementation** — every lifecycle event in the Administration vertical must have a complete cascade specification before it is implemented. This is how the recurring rebuild problem is solved.

5. **API-first is non-negotiable** — every feature goes through a clean `/api/...` route. This applies in Ferd now, not deferred to Hamn.

6. **Vision documents are locked** — files in `docs/vision/` are not modified by Claude Code or implementation sessions. They are locked founding documents.

7. **Architecture documents are locked** — `ARCHITECTURE_ANATOMY.md` and `ARCHITECTURE_DECISIONS.md` are locked v1.0. Changes require deliberate architectural review.

8. **ARCHITECTURE_BASELINE.md is always Claude Code generated** — it is never hand-written. It must be regenerated after each significant implementation session.

9. **Stefan works alone** — no other developers or team members. Vibe coding with AI is the primary development method.

10. **Wave model, not phase model** — the old Phase 1-4 model in the legacy documents is superseded. The correct model is Wave 1 (Ferd) → Wave 2 (Hamn) → Wave 3 → Wave 3+ (The Game). Waves overlap — they are not sequential.

11. **The garden door metaphor is an architecture decision** — the visitor/temporary profile system exists precisely to support this product principle. It is not optional.

12. **Privacy is a founding value, not compliance** — the Privacy vertical exists because "member privacy over commercial opportunity" is in the manifesto. It is not a legal checkbox.

13. **Governance is locked** — three-layer structure (Foundation → Dreamineer Council → Open Community) is not to be questioned in implementation sessions.

14. **Business model is locked** — five revenue streams (subscriptions, donations, marketplace, events, endowment). No VC, no equity crowdfunding, no corporate sponsorship.

15. **The ADR format is the standard** — any new significant architectural decision gets an ADR in `ARCHITECTURE_DECISIONS.md`. The reasoning preserved is as valuable as the decision itself.

---

*This summary document can be discarded after the next session begins successfully. The permanent record lives in `ARCHITECTURE_ANATOMY.md` and `ARCHITECTURE_DECISIONS.md`.*
