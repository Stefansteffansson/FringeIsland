# FringeIsland — Session Bridge
*Created: March 2026 — Architecture & Anatomy Session + Journey Enrollment*
*Status: FULLY COMMITTED AND PUSHED*
*Purpose: Carry full context into the next fresh chat session*

---

## How to Start the Next Session

1. Upload this SESSION_BRIDGE document
2. Upload `docs/architecture/ARCHITECTURE_ANATOMY.md` — primary reference
3. Upload any other specific docs needed for the session focus
4. State what you want to focus on
5. Claude will be immediately in context

---

## What Was Completed This Session

### Architecture documents (all committed) ✅

| File | Location | Status |
|------|----------|--------|
| `ARCHITECTURE_ANATOMY.md` | `docs/architecture/` | ✅ Locked v1.0 |
| `ARCHITECTURE_DECISIONS.md` | `docs/architecture/` | ✅ Locked v1.0 (24 ADRs) |
| `ARCHITECTURE_ANATOMY_DIAGRAM.svg` | `docs/architecture/` | ✅ Locked v1 |
| `ARCHITECTURE_BASELINE.md` | `docs/architecture/` | ✅ Claude Code generated |
| `ARCHITECTURE_DECISIONS_LEGACY.md` | `docs/architecture/` | ✅ Renamed from OVERVIEW |
| `README.md` | root | ✅ Updated |
| `CLAUDE.md` | root | ✅ Updated (v0.2.37) |
| 8 additional files | various | ✅ Stale refs cleaned |

### Journey Enrollment — L3 (committed) ✅

| File | Action |
|------|--------|
| `app/api/v1/journeys/[id]/enroll/route.ts` | ✅ New — POST (enroll) + DELETE (unenroll) |
| `app/api/v1/journeys/enrollments/route.ts` | ✅ New — GET (list user enrollments) |
| `components/journeys/EnrollmentModal.tsx` | ✅ Refactored — calls POST API route |
| `app/journeys/[id]/page.tsx` | ✅ Refactored — calls GET enrollments API route |
| `app/my-journeys/page.tsx` | ✅ Refactored — calls GET enrollments API route |
| `CHANGELOG.md` | ✅ Updated |
| `CLAUDE.md` | ✅ Version bumped to 0.2.37 |

**ADR-009 enforced throughout:** No direct Supabase data mutations remain in the enrollment flow — all writes go through API routes.

---

## Current Anatomy Completion State

| Layer | Status | Notes |
|-------|--------|-------|
| L0 Infrastructure | ✅ Solid | All infrastructure in place |
| L1 Identity | ⚠️ Mostly solid | Visitor/temporary profile not yet implemented |
| L2 Organisation | ✅ Solid | Groups, roles, permissions complete |
| L3 Experience engine | ⚠️ Advancing | Catalogue ✅ Enrolment ✅ Content delivery ⏳ |
| L4 Content | ⏳ Not built | Placeholder |
| L5 Communication | ⚠️ Partial | DM and forum foundations exist |
| L6 Discovery | ⏳ Not built | Placeholder |
| L7 Intelligence | ⏳ Not built | Placeholder |
| Administration vertical | ⚠️ Partial | Cascade specs not yet written |
| Privacy vertical | ⏳ Placeholder | Architecture present, not implemented |
| Notifications vertical | ⚠️ Partial | In-app notifications exist |
| Observability vertical | ⏳ Placeholder | Not implemented |
| Transactions vertical | ⏳ Placeholder | Hamn concern |

---

## What Is Still Open — Ordered by Priority

### Immediate Claude Code tasks (Ferd completion)
1. **Journey content delivery** — step-by-step navigation, content display, progress tracking
2. **Visitor/temporary profile (L1)** — anonymous sign-in, `is_temporary` flag, pg_cron cleanup
3. **profile_data table (L1)** — flexible dynamic profile data with indexes
4. **feature_flags table (L0)** — database configuration, toggleable without redeploy
5. **Communication basics (L5)** — forums and DM completion
6. **Administration cascade specs** — write before implementing lifecycle events

### Planning sessions (in priority order)
1. **Journey + Journey Designer specification** ← MOST URGENT
   L3 linchpin — spec before building L4/L5/L6/L7.
   Covers: journey data model, step type extensibility, Journey Zero, branching logic.

2. **Roadmap rewrite**
   Full rewrite after Journey spec session. Replace Phase 1-4 with wave model.

3. **Shadow/visitor access model detail**
4. **Avatar and parallel self mechanic** (Hamn)
5. **First Season Design** — founding narrative, S1:E1
6. **Kickstarter Campaign Design**

---

## Key Architectural Decisions (quick reference)

| Decision | Summary |
|----------|---------|
| Layered anatomy | 8 layers, L0 is ground, nothing above exists without below |
| Five verticals | Admin, Privacy, Notifications, Observability, Transactions |
| API-first (ADR-009) | Database → /api/v1/route → component. Always. |
| Visitor anonymous sign-in | Supabase anon → temporary profile → converts on registration |
| profile_data table | Separate flexible table — buckets are data not schema |
| Privacy as dedicated vertical | Founding value — not absorbed into Administration |
| Stripe Connect | Never build payment logic |
| Feature flags in L0 | Database table — toggleable without redeploy |
| API versioning | /api/v1/ prefix from day one |
| i18n + a11y | Design system constraints — not features |
| Cascade before implementation | Every lifecycle event needs full cascade spec first |
| Forum anonymisation | Soft-flag — historical data never mutated |
| Baseline is Claude Code generated | Regenerated after each significant session |

---

## Technical State

```
Stack:        Next.js 16.1, TypeScript, Tailwind CSS, Supabase/PostgreSQL
Version:      v0.2.37
Repo:         Stefansteffansson/FringeIsland (main branch)
Supabase URL: https://jveybknjawtvosnahebd.supabase.co
DB:           19 tables, RLS on all tables
Tests:        659 unit/integration + 7 E2E
API routes:   /api/v1/journeys/[id]/enroll (POST, DELETE)
              /api/v1/journeys/enrollments (GET)
```

### Always follow these patterns
```
API:          Database → /api/v1/route → React component
Auth:         AuthContext + useAuth() hook
Route guard:  proxy.ts (not middleware.ts)
Landing:      /groups
Modals:       ConfirmModal (never browser alerts)
Permissions:  has_permission() (never hardcode role names)
Field:        users.full_name (not display_name)
Roles:        Steward (not "Group Leader"), Guide (not "Travel Guide")
```

### New tables still to implement
```sql
-- profile_data (L1 — dynamic member data)
profile_data (id, user_id, bucket, source, source_id, content jsonb,
              visibility, created_at)
Indexes: (user_id), (user_id, bucket), (source, source_id), (user_id, visibility)

-- feature_flags (L0)
feature_flags (id, key text UNIQUE, enabled boolean DEFAULT false,
               description, created_at)

-- L1 addition: is_temporary boolean DEFAULT false on profiles table
```

---

## Repo Structure (current)

```
docs/
  vision/           ← locked, never modified by Claude Code
  architecture/
    ARCHITECTURE_ANATOMY.md            ✅ v1.0 locked
    ARCHITECTURE_DECISIONS.md          ✅ v1.0 locked (24 ADRs)
    ARCHITECTURE_ANATOMY_DIAGRAM.svg   ✅ v1 locked
    ARCHITECTURE_BASELINE.md           ✅ Claude Code generated
    ARCHITECTURE_DECISIONS_LEGACY.md   ✅
    DATABASE_SCHEMA.md                 ✅
    AUTHORIZATION.md                   ✅
    DOMAIN_ENTITIES.md                 ✅
  planning/
    ROADMAP.md                         ⚠️ Outdated — notice added at top
    VISION_DECISIONS.md                ✅
    DEFERRED_DECISIONS.md              ✅
README.md                              ✅
CLAUDE.md                              ✅ v0.2.37
```

---

*This bridge document can be discarded after the next session begins successfully.*
