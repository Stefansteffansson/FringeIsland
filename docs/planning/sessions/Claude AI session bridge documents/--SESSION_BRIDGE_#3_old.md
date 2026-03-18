# FringeIsland — Session Bridge
*Created: March 2026 — End of Architecture & Anatomy Session*
*Purpose: Carry full context into the next fresh chat session*

---

## How to Start the Next Session

1. Upload this SESSION_BRIDGE document
2. Upload relevant docs from `docs/vision/` and `docs/architecture/` as needed
3. State what you want to focus on
4. Claude will be immediately in context

---

## What This Session Covered

This was a deep architecture session. The primary output was the **FringeIsland System Anatomy** — a complete layered model of the platform that serves as the architectural contract for all future development.

### Documents Produced (all ready for repo)

| File | Location | Purpose |
|------|----------|---------|
| `ARCHITECTURE_ANATOMY.md` | `docs/architecture/` | The complete layer/vertical model — what the system is |
| `ARCHITECTURE_DECISIONS.md` | `docs/architecture/` | 24 ADRs with full reasoning — why the system is this way |
| `ARCHITECTURE_ANATOMY_DIAGRAM.svg` | `docs/architecture/` | Visual anatomy map — v1 locked |

### Claude Code Tasks Ready to Run

The following prompt is ready to paste directly into Claude Code:

```
Please complete the following tasks to integrate our new 
architecture documentation:

STEP 1 — Read these documents before doing anything else:
- docs/vision/VISION.md
- docs/vision/MANIFESTO.md
- docs/vision/CONTRIBUTION_ARCHITECTURE.md
- docs/vision/PRODUCTS_AND_PLATFORM.md
- docs/architecture/ARCHITECTURE_ANATOMY.md
- docs/architecture/ARCHITECTURE_DECISIONS.md
- docs/architecture/DATABASE_SCHEMA.md
- docs/architecture/AUTHORIZATION.md
- docs/architecture/DOMAIN_ENTITIES.md
- docs/planning/DEFERRED_DECISIONS.md
- CLAUDE.md

STEP 2 — File operations:
- RENAME docs/architecture/ARCHITECTURE_OVERVIEW.md 
  → docs/architecture/ARCHITECTURE_DECISIONS_LEGACY.md
- CONFIRM new files are present:
  docs/architecture/ARCHITECTURE_ANATOMY.md
  docs/architecture/ARCHITECTURE_DECISIONS.md
  docs/architecture/ARCHITECTURE_ANATOMY_DIAGRAM.svg

STEP 3 — Regenerate docs/architecture/ARCHITECTURE_BASELINE.md
Read the entire live codebase — every table, migration, API 
route, component, RLS policy, helper function and hook — and 
regenerate the baseline structured around the anatomy layers 
from ARCHITECTURE_ANATOMY.md.

Structure it as follows:
- For each layer L0–L7: list what is implemented (tables, 
  API routes, components, RLS policies) vs what is a 
  placeholder (not yet built, or deliberately deferred per 
  DEFERRED_DECISIONS.md)
- For each vertical: what is implemented vs placeholder
- Platform API section: all current /api/... routes listed
- A summary table showing Ferd completion state per layer

Use the terminology from ARCHITECTURE_ANATOMY.md throughout.
Reference DEFERRED_DECISIONS.md to correctly distinguish 
"not yet built" from "deliberately deferred".

STEP 4 — UPDATE README.md
Reflect the new docs/architecture/ document structure.

STEP 5 — UPDATE CLAUDE.md
- Add ARCHITECTURE_ANATOMY.md as the primary architectural 
  reference
- Update any references to old phase model with wave model 
  (Ferd/Hamn)
- Add the API-first pattern explicitly

Do not modify any files in docs/vision/.
Do not modify ARCHITECTURE_DECISIONS_LEGACY.md after renaming.
Do not modify ARCHITECTURE_ANATOMY.md or ARCHITECTURE_DECISIONS.md.
```

---

## The Anatomy — Summary of What Was Locked

### Eight Layers (L0 at ground, builds upward)

| Layer | Name | Key contents |
|-------|------|-------------|
| L7 | Intelligence | AI Mentor, profile accumulation, insights, AI provider → |
| L6 | Discovery | Search, recommendations, marketplace, search index → |
| L5 | Communication | DM, forums, announcements, activity feed |
| L4 | Content | Narrative, reflections, assessments, journal, media, i18n strings → |
| L3 | Experience engine | Journey catalogue, designer, enrolments, step types, progress, Journey Zero |
| L2 | Organisation | Groups, memberships, roles, permissions, DeusEx |
| L1 | Identity | Temporary (visitor), permanent (member), profile, profile_data, sessions |
| L0 | Infrastructure | Supabase, PostgreSQL, Auth, RLS, Storage, pg_cron, feature flags, i18n config, email, AI provider, backup → |

### Five Verticals (cross-cutting, touch every layer)

| Vertical | Actor | Nature |
|----------|-------|--------|
| Administration · Moderation | Human — DeusEx, Council | Lifecycle cascades, content moderation |
| Privacy · GDPR · AI consent | Member rights | Consent, erasure, portability, data map |
| Notifications · Email · Push → | Automated signals | Observes events, delivers to member |
| Observability · Audit · Errors | System | Read-only, logs, metrics, audit trail, error tracking |
| Transactions · Stripe → | Automated — Stripe | Entitlement events, revenue splits |

### Outer Elements

**Platform API ring:** Frontend contract (Ferd) · API versioning · Rate limiting · Extension surface (Hamn)

**Design System:** Visual language · Components · World aesthetic · i18n constraint · a11y constraint

**Frontends:** Web platform (Ferd→Hamn) · iOS (Hamn+) · Android (Hamn+) · Game (Wave 3+)

---

## Key Architectural Decisions Locked This Session

### The anatomy itself
- Layered model is the primary architectural framework
- Nothing at a higher layer can exist without everything below it being solid
- L3 Experience engine is the linchpin — spec before building above it

### Visitor/Identity (L1)
- Supabase anonymous sign-in creates temporary profile on first visit (`is_temporary: true`)
- Everything carries over on registration — session converts, flag flips
- pg_cron cleans up stale temporary profiles

### Profile data (L1)
- Dynamic profile data lives in a separate `profile_data` table — not JSONB fields
- Buckets are data, not schema — new types added without migrations
- Required indexes: `(user_id)`, `(user_id, bucket)`, `(source, source_id)`, `(user_id, visibility)`

### API-first (Platform API ring)
- Every feature accessible through clean `/api/...` route
- Business logic in API routes — never in Next.js pages or components
- Database → API route → Frontend component. Never database → frontend directly.
- Applies from day one in Ferd — not deferred to Hamn

### Privacy as dedicated vertical
- First-class architectural concern — not absorbed into Administration
- Architectural expression of manifesto value: "member privacy over commercial opportunity"

### Transactions as dedicated vertical
- Stripe Connect for all marketplace payments — FringeIsland never builds payment logic
- Placeholder in Ferd, implemented in Hamn

### Feature flags in L0
- Simple database configuration table
- Toggle features without deployment — essential for Ferd→Hamn transition

### API versioning
- `/api/v1/...` prefix from day one
- Costs nothing now, prevents painful retrofit when iOS/Android arrive

### i18n and a11y as design system constraints
- All user-facing strings externalised to translation files from day one
- WCAG 2.1 AA as baseline — "belonging over fitting in" requires it

### Administration cascade specification
- Every lifecycle event must have complete cascade spec before implementation
- Documents what happens at every layer — prevents mid-implementation surprises

### Forum anonymisation
- Soft-flag approach — posts retain `author_id`, display "Former Member" based on current membership
- Historical data never mutated — rejoin restores name automatically

### Document structure
- `ARCHITECTURE_OVERVIEW.md` → renamed to `ARCHITECTURE_DECISIONS_LEGACY.md` (historical ADRs preserved)
- `ARCHITECTURE_BASELINE.md` is Claude Code generated, not hand-written — regenerated after each significant implementation session

---

## Current Repo Structure (as of end of session)

```
docs/
  vision/
    VISION.md                          ✅ locked v0.1
    MANIFESTO.md                       ✅ locked v0.1
    CONTRIBUTION_ARCHITECTURE.md       ✅ locked v0.2
    PRODUCTS_AND_PLATFORM.md           ✅ locked v0.2
  architecture/
    ARCHITECTURE_ANATOMY.md            ✅ new — locked v1.0
    ARCHITECTURE_DECISIONS.md          ✅ new — locked v1.0
    ARCHITECTURE_ANATOMY_DIAGRAM.svg   ✅ new — locked v1
    ARCHITECTURE_DECISIONS_LEGACY.md   ⏳ needs rename from ARCHITECTURE_OVERVIEW.md
    ARCHITECTURE_BASELINE.md           ⏳ needs regeneration by Claude Code
    DATABASE_SCHEMA.md                 ✅ existing — still valid
    AUTHORIZATION.md                   ✅ existing — still valid
    DOMAIN_ENTITIES.md                 ✅ existing — still valid
  planning/
    VISION_DECISIONS.md                ✅ decision record
    ROADMAP.md                         ⏳ needs rewrite (dedicated session)
    DEFERRED_DECISIONS.md              ✅ existing
README.md                              ⏳ needs light update (Claude Code)
CLAUDE.md                              ⏳ needs update (Claude Code)
```

---

## What Is Still Open

### Immediate (Claude Code — run the prompt above)
- Rename ARCHITECTURE_OVERVIEW.md → ARCHITECTURE_DECISIONS_LEGACY.md
- Regenerate ARCHITECTURE_BASELINE.md structured around anatomy layers
- Update README.md and CLAUDE.md

### Dedicated sessions still needed (in priority order)
1. **Journey + Journey Designer specification** — the most urgent. L3 is the linchpin. Nothing above it should be built without this session. Covers: journey data model, step type data model, branching logic, Journey Zero design.
2. **Roadmap rewrite** — replace old phase 1-4 model with wave model (Ferd/Hamn/Wave 3/Wave 3+) reflecting full ecosystem and anatomy
3. **Shadow access model** — what specifically can visitors see before registering
4. **Avatar and parallel self mechanic** — narrative design, UX and data architecture for Hamn
5. **First Season Design** — founding narrative, S1:E1
6. **Kickstarter Campaign Design** — after First Season Design

### Vision sessions still needed
- First Season Design
- Kickstarter Campaign Design

---

## Technical State (Ferd v0.2.7+)

```
Stack:     Next.js 16.1, TypeScript, Tailwind CSS, Supabase/PostgreSQL
Repo:      Stefansteffansson/FringeIsland (main branch)
Supabase:  https://jveybknjawtvosnahebd.supabase.co
DB:        19 tables, RLS on all tables
```

### Anatomy completion state

| Layer | Status |
|-------|--------|
| L0 Infrastructure | ✅ Solid |
| L1 Identity | ⚠️ Mostly solid — visitor/temporary profile not yet implemented |
| L2 Organisation | ✅ Solid |
| L3 Experience engine | ⚠️ Partial — catalogue exists, full spec session needed |
| L4 Content | ⏳ Not yet built |
| L5 Communication | ⚠️ Partial — DM and forum foundations exist |
| L6 Discovery | ⏳ Not yet built |
| L7 Intelligence | ⏳ Not yet built |
| Administration vertical | ⚠️ Partial — cascade specs not yet written |
| Privacy vertical | ⏳ Placeholder |
| Notifications vertical | ⚠️ Partial — in-app notifications exist |
| Observability vertical | ⏳ Placeholder |
| Transactions vertical | ⏳ Placeholder — Hamn |

### Key technical patterns (always follow)
- Use `proxy.ts` not `middleware.ts` (Next.js 16.1)
- Use `ConfirmModal` — never browser alerts
- Use `has_permission()` — never hardcode role names
- Use `users.full_name` — not `display_name`
- Default landing: `/groups`
- API-first: Database → `/api/...` route → React component

---

## Important Principles to Carry Forward

1. **Platform follows vision** — the codebase never constrains the vision
2. **API-first from day one** — every feature through a clean API route
3. **Anatomy is the contract** — identify layer touches before implementing any feature
4. **Cascade before implementation** — every lifecycle event needs a cascade spec first
5. **L3 is the linchpin** — spec the experience engine before building above it
6. **Buckets are data not schema** — profile_data extensibility principle
7. **Privacy is first-class** — not absorbed into administration
8. **i18n and a11y are constraints** — not features to add later
9. **ARCHITECTURE_BASELINE.md is Claude Code generated** — not hand-written

---

*This bridge document can be discarded after the next session begins successfully.*
