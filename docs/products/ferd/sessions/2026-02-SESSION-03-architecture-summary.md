# FringeIsland — Session Summary
*Created: March 2026 — Architecture & Anatomy Session*
*Status: FULLY COMMITTED AND PUSHED*

---

## PROJECT/CONTEXT: What is this about?

FringeIsland is an Immersive Edutainment project — a movement and platform creating an alternative world parallel to everyday life. Three core questions drive everything: Who am I? What do I want? How do I get there?

Stefan is the founder and sole developer, working via a vibe coding methodology — planning in Claude, implementing in Claude Code.

**This session** built and validated a complete system anatomy for FringeIsland — a layered architectural framework serving as the contract for all future development. The session originated from a concrete, recurring problem: Stefan was experiencing rebuilds during Ferd development — implementing features that then required rework of foundations not designed to support them. The anatomy solves this by making dependency order explicit and visible.

**Everything was committed and pushed to the main branch by the end of the session.**

---

## DECISIONS MADE: What did we decide, and why?

### 1. Layered anatomy as the primary architectural framework
**Decision:** Eight horizontal layers (L0–L7). L0 is the ground. Nothing above a layer exists without everything below it being solid.
**Why:** The recurring rebuild problem was caused by building without a dependency map. A visible dependency order makes build sequence obvious and prevents discovering incomplete foundations mid-implementation.

### 2. Five vertical concerns
**Decision:** Administration, Privacy/GDPR, Notifications/Email, Observability/Audit, Transactions — each cross-cutting, touching every layer simultaneously.
**Why:** Some concerns are not horizontal — they cut through every layer at once. Each vertical has a different actor and interaction pattern, justifying separate treatment.
**Ordering (layers outward):** Administration → Privacy → Notifications → Observability → Transactions

### 3. Visitor anonymous sign-in with temporary profile (L1)
**Decision:** Supabase anonymous sign-in on first visit. Temporary profile created (`is_temporary: true`). Everything carries over on registration. pg_cron cleans up stale profiles.
**Why:** The only approach that delivers the garden door metaphor — the garden exists before it is claimed. Browser storage cannot survive device switching or browser clearing.

### 4. profile_data as a separate flexible table (L1)
**Decision:** Dynamic member data in `profile_data` table. Buckets are data, not schema. New types added without migrations.
**Why:** Fixed JSONB fields lock the schema. Separate tables per type require new migrations per type. The bucket model makes the container the schema and the content flexible.

### 5. API-first, frontend-agnostic backend
**Decision:** Every feature through a clean `/api/...` route. Business logic in API routes, never in pages or components. Database → API route → Frontend component.
**Why:** Retrofitting this when iOS and Android arrive is very expensive. Getting it right now costs almost nothing — it is a discipline of where code is written.

### 6. Privacy as a dedicated vertical
**Decision:** Fifth vertical — not absorbed into Administration.
**Why:** "Member privacy over commercial opportunity" is a manifesto principle. Absorbing privacy into Administration makes it architecturally invisible. A visible vertical communicates to every developer that privacy implications are part of every feature specification.

### 7. Transactions via Stripe Connect
**Decision:** Dedicated vertical. FringeIsland never builds payment logic. Stores only: Stripe reference, entitlement unlocked, creator earning record.
**Why:** Building payment processing from scratch takes years and introduces significant compliance risk. Stripe Connect is designed precisely for marketplace splits.

### 8. Observability as dedicated vertical
**Decision:** Read-only, passive vertical. Logs, metrics, audit trail, error tracking.
**Why:** The audit trail answers "what has been done with my data?" — a member rights concern as much as an operational one. GDPR requires it.

### 9. Platform API ring — present contract and future extension surface
**Decision:** Present: frontend contract with rate limiting and API versioning (`/api/v1/`). Future: extension surface for Hamn plugins.
**Why API versioning from day one:** Adding it retroactively means renaming every route and updating every client. A path prefix costs nothing now.

### 10. i18n and a11y as design system constraints
**Decision:** All user-facing strings externalised from day one. WCAG 2.1 AA as baseline.
**Why:** Retrofitting i18n costs 3-5x more than doing it correctly initially. "Belonging over fitting in" requires accessibility — excluding members with disabilities contradicts the manifesto directly.

### 11. Feature flags in L0
**Decision:** Database configuration table. Toggle features without deployment.
**Why:** Environment variables require a redeploy. Database flags can be toggled in real time for specific users, groups or environments.

### 12. Administration — cascade specification before implementation
**Decision:** Every lifecycle event must have a complete cascade spec before code is written.
**Why:** The recurring rebuild problem was caused precisely by implementing lifecycle events without knowing their full cross-layer consequences.

### 13. Forum anonymisation — soft-flag
**Decision:** Posts retain `author_id`. Display "Former Member" based on current membership. Data never mutated. Rejoin restores name automatically.
**Why:** Deleting posts damages conversation integrity. Mutating stored author is irreversible and breaks the historical record.

### 14. ARCHITECTURE_BASELINE.md is Claude Code generated
**Decision:** Generated by Claude Code reading the live repository. Never hand-written. Regenerated after each significant implementation session.
**Why:** Accuracy requires generation from the source of truth. A hand-written baseline will inevitably go stale.

### 15. Three architecture documents
**Decision:** ARCHITECTURE_ANATOMY.md (what), ARCHITECTURE_DECISIONS.md (why), ARCHITECTURE_BASELINE.md (how implemented). ARCHITECTURE_OVERVIEW.md renamed to ARCHITECTURE_DECISIONS_LEGACY.md.
**Why "architecture" not "anatomy" in filenames:** Convention — developers search for "architecture." The word "anatomy" is used within documents and in sessions for its warmth and meaning.

### 16. Media and assets explicitly named in L4
**Decision:** Named nodes in L4. Supabase Storage for Ferd. Dedicated media delivery strategy flagged as `→` future concern.

### 17. L3 is the architectural linchpin
**Decision:** L3 Experience engine must be fully specced before significant L4/L5/L6/L7 work. Step type extensibility is the most important architectural decision in L3.
**Why:** Everything above L3 depends on it. Building above an unspecced L3 causes the same rebuild pattern this session was designed to solve.

---

## REJECTED ALTERNATIVES: What did we consider but discard?

| Decision | Rejected alternative | Why rejected |
|----------|---------------------|--------------|
| Layered anatomy | Feature-based organisation | Obscures cross-feature dependencies, ambiguous build order |
| Layered anatomy | Domain-driven design | Unnecessary complexity for solo developer |
| Five verticals | Single cross-cutting concerns band | Loses important actor/trigger distinctions |
| Privacy as vertical | Absorb into Administration | Architecturally invisible — contradicts manifesto value |
| Privacy as vertical | Sublayer within L0/L1 | Privacy is cross-cutting — erasure touches every layer |
| Transactions as vertical | Horizontal layer | Transactions don't depend on layers — they are event-driven |
| Stripe Connect | Build payment logic | Years of engineering + significant compliance risk |
| profile_data table | JSONB on profile record | Schema locked — new data category requires migration on all profiles |
| profile_data table | Separate table per type | New migration per type, complex cross-type queries |
| Anonymous sign-in | Browser storage | Lost on browser clear or device switch — cannot deliver garden door |
| API-first from Ferd | Defer to Hamn | Retrofitting when iOS/Android arrive is very expensive |
| API versioning from Ferd | Add when needed | Retroactively means renaming all routes and updating all clients |
| i18n/a11y as constraints | Add as features later | Retrofitting costs 3-5x more; component redesign required |
| Feature flags in database | Environment variables | Cannot toggle without redeploy |
| Soft-flag anonymisation | Delete posts | Damages conversation integrity, irreversible |
| Soft-flag anonymisation | Mutate stored author | Irreversible, breaks historical record |
| Claude Code generated baseline | Hand-written | Inevitable staleness |

---

## CURRENT STATE: Exactly where are we now?

### All committed and pushed ✅

**New architecture documents:**
- `docs/architecture/ARCHITECTURE_ANATOMY.md` — locked v1.0
- `docs/architecture/ARCHITECTURE_DECISIONS.md` — locked v1.0 (24 ADRs)
- `docs/architecture/ARCHITECTURE_ANATOMY_DIAGRAM.svg` — locked v1
- `docs/architecture/ARCHITECTURE_BASELINE.md` — regenerated, anatomy-structured
- `docs/architecture/ARCHITECTURE_DECISIONS_LEGACY.md` — renamed from ARCHITECTURE_OVERVIEW.md

**Updated by Claude Code:**
- `README.md` — new architecture doc links
- `CLAUDE.md` — anatomy as primary ref, wave model, API-first pattern (ADR-009)
- `PROJECT_STATUS.md` — stale refs cleaned
- `docs/INDEX.md` — stale refs cleaned
- `docs/agents/contexts/architect-agent.md` — stale refs cleaned
- `docs/workflows/close-down.md` — stale refs cleaned
- `docs/workflows/feature-development.md` — stale refs cleaned
- `docs/planning/PRODUCT_SPEC.md` — stale refs cleaned
- `docs/features/implemented/notification-system.md` — stale refs cleaned

**Not modified (correctly protected):**
- All files in `docs/vision/`
- `ARCHITECTURE_ANATOMY.md`, `ARCHITECTURE_DECISIONS.md`, `ARCHITECTURE_DECISIONS_LEGACY.md`

### Anatomy completion state

| Layer | Status | Notes |
|-------|--------|-------|
| L0 Infrastructure | ✅ Solid | All infrastructure in place |
| L1 Identity | ⚠️ Mostly solid | Visitor/temporary profile not yet implemented |
| L2 Organisation | ✅ Solid | Groups, roles, permissions complete |
| L3 Experience engine | ⚠️ Partial | Catalogue exists — spec session needed before building above |
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

### Most urgent — Journey specification session
L3 is the linchpin. This session must happen before significant L4/L5/L6 work. Covers:
- Journey data model
- Step type data model and extensibility constraint
- Branching/path logic
- Journey Zero design
- Enrolment model detail

### Other dedicated sessions (priority order)
1. Journey + Journey Designer specification ← MOST URGENT
2. Roadmap rewrite — replace Phase 1-4 with wave model
3. Shadow/visitor access model detail
4. Avatar and parallel self mechanic (Hamn)
5. First Season Design — S1:E1 founding narrative
6. Kickstarter Campaign Design

### Still to implement in Ferd
- Visitor/temporary profile — anonymous sign-in + `is_temporary` flag + pg_cron cleanup
- `profile_data` table — flexible dynamic profile data with indexes
- `feature_flags` table — L0 database configuration
- Administration cascade specifications — write before implementing lifecycle events
- Privacy vertical foundation — consent records, erasure flow

---

## TECHNICAL STATE: Code, configuration, file structure

### Stack
```
Framework:    Next.js 16.1 App Router
Language:     TypeScript
Styling:      Tailwind CSS
Database:     Supabase (PostgreSQL)
Auth:         Supabase Auth
Tests:        659 unit/integration + 7 E2E (Playwright)
Repo:         Stefansteffansson/FringeIsland (main branch)
Supabase URL: https://jveybknjawtvosnahebd.supabase.co
DB:           19 tables, RLS on all tables
```

### Always follow these patterns
```
API pattern:     Database → /api/v1/route → React component (never skip)
Auth pattern:    AuthContext + useAuth() hook
Route guard:     proxy.ts (not middleware.ts — Next.js 16.1)
Default landing: /groups
Modals:          ConfirmModal (never browser alerts)
Permissions:     has_permission() (never hardcode role names)
DB field:        users.full_name (not display_name)
Role names:      Steward (not "Group Leader"), Guide (not "Travel Guide")
```

### New tables to implement (not yet in DB)

**profile_data:**
```sql
profile_data (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL → profiles,
  bucket text,        -- 'assessment', 'reflection', 'insight', 'intention'
  source text,        -- 'journey_step', 'ai_mentor', 'self', 'community'
  source_id uuid,
  content jsonb,
  visibility text,    -- 'private', 'semi_public', 'public'
  created_at timestamptz
)
Indexes: (user_id), (user_id, bucket), (source, source_id), (user_id, visibility)
```

**feature_flags:**
```sql
feature_flags (
  id uuid PRIMARY KEY,
  key text UNIQUE NOT NULL,
  enabled boolean DEFAULT false,
  description text,
  created_at timestamptz
)
```

**L1 identity additions:**
- `is_temporary boolean DEFAULT false` on profiles table
- Supabase anonymous sign-in flow
- pg_cron cleanup job for stale temporary profiles

### Complete repo structure
```
docs/
  vision/           ← locked, never modified by Claude Code
  architecture/
    ARCHITECTURE_ANATOMY.md            ✅ v1.0 locked
    ARCHITECTURE_DECISIONS.md          ✅ v1.0 locked (24 ADRs)
    ARCHITECTURE_ANATOMY_DIAGRAM.svg   ✅ v1 locked
    ARCHITECTURE_BASELINE.md           ✅ Claude Code generated
    ARCHITECTURE_DECISIONS_LEGACY.md   ✅ renamed from OVERVIEW
    DATABASE_SCHEMA.md                 ✅ valid
    AUTHORIZATION.md                   ✅ valid
    DOMAIN_ENTITIES.md                 ✅ valid
  planning/
    ROADMAP.md                         ⏳ needs rewrite
    VISION_DECISIONS.md                ✅
    DEFERRED_DECISIONS.md              ✅
  agents/, workflows/, features/       ✅ stale refs cleaned
README.md                              ✅ updated
CLAUDE.md                              ✅ updated
PROJECT_STATUS.md                      ⏳ needs rewrite
```

---

## ASSUMPTIONS: What do we take for granted that a new session won't know?

1. **The anatomy is the contract** — `ARCHITECTURE_ANATOMY.md` is the primary reference for all development. Identify layer and vertical touches before implementing any feature.

2. **L3 is the linchpin** — do not build significant L4/L5/L6/L7 features before the Journey specification session. This is the single most important constraint on what to build next.

3. **Cascade before implementation** — every lifecycle event in the Administration vertical needs a complete cascade spec before code is written.

4. **API-first is non-negotiable** — every feature goes through `/api/v1/...`. Applies in Ferd now, not deferred.

5. **Ferd is a PoC, not a constraint** — the codebase never constrains the vision. Platform follows vision.

6. **Vision documents are locked** — `docs/vision/` files are never modified by Claude Code or implementation sessions.

7. **Architecture anatomy and decisions are locked** — `ARCHITECTURE_ANATOMY.md` and `ARCHITECTURE_DECISIONS.md` are locked v1.0. Changes require deliberate architectural review and a new ADR.

8. **ARCHITECTURE_BASELINE.md is always Claude Code generated** — never hand-written. Regenerated after each significant implementation session.

9. **Wave model, not phase model** — old Phase 1-4 is superseded. Correct model: Wave 1 (Ferd) → Wave 2 (Hamn) → Wave 3 → Wave 3+ (Game). Waves overlap.

10. **Buckets are data not schema** — `profile_data` extensibility principle. New data types never require migrations.

11. **Privacy is a founding value** — the Privacy vertical exists because "member privacy over commercial opportunity" is in the manifesto. Not a legal checkbox.

12. **The garden door metaphor is an architecture decision** — visitor/temporary profile exists to support this product principle. It is not optional.

13. **Stefan works alone** — vibe coding with AI is the primary development method. No other developers.

14. **Governance is locked** — Foundation → Dreamineer Council → Open Community. Not to be questioned in implementation sessions.

15. **The ADR format is standard** — any new significant architectural decision gets an ADR added to `ARCHITECTURE_DECISIONS.md`.

---

*This summary document can be discarded after the next session begins successfully. The permanent record lives in `ARCHITECTURE_ANATOMY.md` and `ARCHITECTURE_DECISIONS.md` in the repo.*
