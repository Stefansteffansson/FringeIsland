# ADR-009 — Platform API ring — API-first, frontend-agnostic backend

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

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
