> **Note:** This session predates ADR-U022 (2026-04-06).
> Wave references in this document use the original numbering.
> Current canonical wave arc: Ferd → Eid → Hamn → Heim → Brim → Urd.

# FringeIsland — Session Summary
*Created: March 2026 — Architecture & Anatomy Session + Journey Enrollment*
*Status: FULLY COMMITTED AND PUSHED*

---

## PROJECT/CONTEXT: What is this about?

FringeIsland is an Immersive Edutainment project — a movement and platform creating an alternative world parallel to everyday life. Three core questions drive everything: Who am I? What do I want? How do I get there?

Stefan is the founder and sole developer, working via a vibe coding methodology — planning in Claude, implementing in Claude Code.

**This session** covered two major areas:
1. Built and validated the complete FringeIsland system anatomy — a layered architectural framework serving as the contract for all future development
2. Completed journey enrollment (L3) — the first feature built under the new API-first architecture

---

## DECISIONS MADE: What did we decide, and why?

### Architecture decisions (17 total — see ARCHITECTURE_DECISIONS.md for full ADRs)

**1. Layered anatomy as primary architectural framework**
Eight layers (L0–L7), L0 at ground. Nothing above a layer exists without everything below it. Solves the recurring rebuild problem caused by building without a visible dependency order.

**2. Five vertical concerns**
Administration, Privacy/GDPR, Notifications/Email, Observability/Audit, Transactions. Each cross-cutting, different actor and interaction pattern. Ordering from layers outward: Admin → Privacy → Notifications → Observability → Transactions.

**3. Visitor anonymous sign-in with temporary profile (L1)**
Supabase anonymous sign-in on first visit. Temporary profile (`is_temporary: true`). Everything carries over on registration via session conversion. pg_cron cleans up stale profiles. Delivers the garden door metaphor correctly — browser storage cannot.

**4. profile_data as separate flexible table (L1)**
Buckets are data, not schema. New data types added without migrations. Required indexes from day one.

**5. API-first, frontend-agnostic backend (ADR-009)**
Database → /api/v1/route → React component. Never skip the middle step. Enforced from Ferd day one — retrofitting when iOS/Android arrive is very expensive.

**6. Privacy as dedicated vertical**
"Member privacy over commercial opportunity" is a manifesto principle. A visible vertical makes privacy implications part of every feature specification.

**7. Transactions via Stripe Connect**
Never build payment logic. FringeIsland stores only: Stripe reference, entitlement, creator earning record.

**8. Observability as dedicated vertical**
Audit trail answers "what has been done with my data?" — a member rights concern. GDPR requires it.

**9. API versioning from day one**
/api/v1/ prefix. Costs nothing now, prevents painful retrofit when iOS/Android arrive.

**10. i18n and a11y as design system constraints**
Not features — built correctly from day one. Retrofitting costs 3-5x more.

**11. Feature flags in L0**
Database configuration table — toggleable without redeploy.

**12. Administration cascade specification before implementation**
Every lifecycle event needs complete cascade spec before code. Prevents the recurring rebuild pattern.

**13. Forum anonymisation — soft-flag**
Posts retain author_id. Display "Former Member" based on current membership. Data never mutated.

**14. ARCHITECTURE_BASELINE.md is Claude Code generated**
Never hand-written. Regenerated after each significant implementation session.

**15. Three architecture documents**
ARCHITECTURE_ANATOMY.md (what), ARCHITECTURE_DECISIONS.md (why), ARCHITECTURE_BASELINE.md (how).

**16. Media and assets in L4**
Named explicitly. Supabase Storage for Ferd. Dedicated delivery strategy flagged as future concern.

**17. L3 is the architectural linchpin**
Must be fully specced before significant L4/L5/L6/L7 work. Step type extensibility is the most important L3 architectural decision.

### Journey Enrollment decision

**18. API-first enforcement on first new Ferd feature**
Journey enrollment was implemented as the first feature under the new architecture. All enrollment writes go through /api/v1/ routes. No direct Supabase mutations remain in the enrollment flow. This establishes the pattern for all future Ferd features.

---

## REJECTED ALTERNATIVES: What did we consider but discard?

| Decision | Rejected alternative | Why rejected |
|----------|---------------------|--------------|
| Layered anatomy | Feature-based organisation | Obscures dependencies, ambiguous build order |
| Five verticals | Single cross-cutting band | Loses actor/trigger distinctions |
| Privacy as vertical | Absorb into Administration | Architecturally invisible — contradicts manifesto |
| Stripe Connect | Build payment logic | Years of engineering + compliance risk |
| profile_data table | JSONB on profile record | Schema locked — new types require migrations |
| Anonymous sign-in | Browser storage | Lost on clear/device switch — breaks garden door |
| API-first from Ferd | Defer to Hamn | Retrofitting when iOS/Android arrive is very expensive |
| API versioning from Ferd | Add when needed | Retroactively renames all routes |
| i18n/a11y as constraints | Features to add later | Retrofitting costs 3-5x more |
| Feature flags in database | Environment variables | Cannot toggle without redeploy |
| Soft-flag anonymisation | Delete posts | Damages conversation integrity |
| Soft-flag anonymisation | Mutate stored author | Irreversible, breaks history |
| Claude Code generated baseline | Hand-written | Inevitable staleness |
| Roadmap rewrite now | Wait until after Journey spec | Old Phase 1-4 actively misleads Claude Code |
| Roadmap rewrite now | Rewrite twice (now + after spec) | Wasteful — added notice instead, full rewrite after Journey spec |

---

## CURRENT STATE: Exactly where are we now?

### All committed and pushed ✅

**Architecture (this session):**
- `docs/architecture/ARCHITECTURE_ANATOMY.md` — locked v1.0
- `docs/architecture/ARCHITECTURE_DECISIONS.md` — locked v1.0 (24 ADRs)
- `docs/architecture/ARCHITECTURE_ANATOMY_DIAGRAM.svg` — locked v1
- `docs/architecture/ARCHITECTURE_BASELINE.md` — Claude Code generated
- `docs/architecture/ARCHITECTURE_DECISIONS_LEGACY.md` — renamed
- `README.md`, `CLAUDE.md` + 8 additional files updated

**Journey Enrollment (this session):**
- `app/api/v1/journeys/[id]/enroll/route.ts` — POST + DELETE
- `app/api/v1/journeys/enrollments/route.ts` — GET
- `components/journeys/EnrollmentModal.tsx` — refactored
- `app/journeys/[id]/page.tsx` — refactored
- `app/my-journeys/page.tsx` — refactored
- ADR-009 enforced: no direct Supabase mutations in enrollment flow

### Anatomy completion state

| Layer | Status |
|-------|--------|
| L0 Infrastructure | ✅ Solid |
| L1 Identity | ⚠️ Visitor/temporary profile not yet implemented |
| L2 Organisation | ✅ Solid |
| L3 Experience engine | ⚠️ Catalogue ✅ Enrolment ✅ Content delivery ⏳ |
| L4 Content | ⏳ Not built |
| L5 Communication | ⚠️ Partial |
| L6 Discovery | ⏳ Not built |
| L7 Intelligence | ⏳ Not built |
| Administration vertical | ⚠️ Cascade specs not written |
| Privacy vertical | ⏳ Placeholder |
| Notifications vertical | ⚠️ Partial |
| Observability vertical | ⏳ Placeholder |
| Transactions vertical | ⏳ Placeholder — Hamn |

---

## NEXT STEPS: What would we do next?

### Immediate Claude Code
1. Journey content delivery — step navigation, content display, progress tracking
2. Visitor/temporary profile — anonymous sign-in + is_temporary + pg_cron
3. profile_data table — flexible dynamic profile data
4. feature_flags table — L0 database configuration
5. Communication basics (L5) — forums and DM
6. Administration cascade specs

### Planning sessions (priority order)
1. **Journey + Journey Designer specification** ← MOST URGENT
2. **Roadmap rewrite** (after Journey spec)
3. Shadow/visitor access model detail
4. Avatar and parallel self mechanic (Hamn)
5. First Season Design
6. Kickstarter Campaign Design

---

## TECHNICAL STATE: Code, configuration, file structure

### Stack
```
Framework:    Next.js 16.1 App Router
Language:     TypeScript
Styling:      Tailwind CSS
Database:     Supabase (PostgreSQL)
Auth:         Supabase Auth
Version:      v0.2.37
Tests:        659 unit/integration + 7 E2E
Repo:         Stefansteffansson/FringeIsland (main branch)
Supabase URL: https://jveybknjawtvosnahebd.supabase.co
DB:           19 tables, RLS on all tables
```

### Current API routes (v1)
```
POST   /api/v1/journeys/[id]/enroll    — enroll individual or group
DELETE /api/v1/journeys/[id]/enroll    — unenroll
GET    /api/v1/journeys/enrollments    — list user's active enrollments
```

### Always follow these patterns
```
API:          Database → /api/v1/route → React component (never skip)
Auth:         AuthContext + useAuth() hook
Route guard:  proxy.ts (not middleware.ts — Next.js 16.1)
Landing:      /groups
Modals:       ConfirmModal (never browser alerts)
Permissions:  has_permission() (never hardcode role names)
Field:        users.full_name (not display_name)
Roles:        Steward (not "Group Leader"), Guide (not "Travel Guide")
```

### New tables still to implement
```sql
-- profile_data (L1)
profile_data (id, user_id, bucket, source, source_id,
              content jsonb, visibility, created_at)
Indexes: (user_id), (user_id, bucket), (source, source_id), (user_id, visibility)

-- feature_flags (L0)
feature_flags (id, key text UNIQUE, enabled boolean DEFAULT false,
               description, created_at)

-- L1 addition needed:
ALTER TABLE profiles ADD COLUMN is_temporary boolean DEFAULT false;
```

---

## ASSUMPTIONS: What do we take for granted that a new session won't know?

1. **The anatomy is the contract** — ARCHITECTURE_ANATOMY.md is the primary reference. Identify layer and vertical touches before implementing any feature.

2. **L3 is the linchpin** — the Journey + Journey Designer specification session must happen before building significant L4/L5/L6/L7 features.

3. **API-first is non-negotiable (ADR-009)** — every feature through /api/v1/. No exceptions. Established and enforced from the first feature built under the new architecture.

4. **Cascade before implementation** — every lifecycle event needs a complete cascade spec before code.

5. **Ferd is a PoC, not a constraint** — platform follows vision.

6. **Vision documents are locked** — docs/vision/ never modified by Claude Code.

7. **Architecture anatomy and decisions are locked** — ARCHITECTURE_ANATOMY.md and ARCHITECTURE_DECISIONS.md are locked v1.0.

8. **ARCHITECTURE_BASELINE.md is Claude Code generated** — never hand-written. Regenerate after each significant implementation session.

9. **Wave model, not phase model** — Wave 1 (Ferd) → Wave 2 (Hamn) → Wave 3 → Wave 3+ (Game). Waves overlap.

10. **Roadmap is outdated** — ROADMAP.md has a notice at the top. Full rewrite planned after Journey specification session.

11. **Buckets are data not schema** — profile_data extensibility principle.

12. **Privacy is a founding value** — the Privacy vertical exists because of the manifesto, not GDPR compliance.

13. **Stefan works alone** — vibe coding with AI is the primary development method.

14. **ADR format is standard** — new significant architectural decisions get an ADR in ARCHITECTURE_DECISIONS.md.

15. **All new API routes use /api/v1/ prefix** — established with journey enrollment. All future routes follow the same pattern.

---

*This summary can be discarded after the next session begins successfully. The permanent record lives in ARCHITECTURE_ANATOMY.md and ARCHITECTURE_DECISIONS.md in the repo.*
