# ADR-U003: Supabase as the backend platform

**Status:** Accepted
**Date:** 2026-01 (original), 2026-03 (confirmed), 2026-04-05 (extracted)
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

---

## Context

FringeIsland is built by a solo developer using a vibe coding methodology with AI assistance. The infrastructure choice needed to be: capable of supporting the full vision, manageable by one person, well-supported by AI coding tools, and cost-effective at early scale.

## Decision

Supabase as the primary backend platform. PostgreSQL as the database. Supabase Auth for authentication. Supabase Storage for assets. Supabase Real-time for subscriptions. RLS for all security enforcement.

## Why Supabase

- PostgreSQL is the correct database for FringeIsland's data model — relational, consistent, excellent RLS support
- Supabase provides managed PostgreSQL with built-in auth, storage, real-time and edge functions
- RLS policies enforce data access at the database level — the most reliable security enforcement layer
- Well-supported by Claude Code and other AI coding tools
- Generous free tier for early development, predictable scaling costs
- Open source — can self-host if needed

## Why RLS over application-level security

Application-level security can be bypassed. RLS cannot be bypassed by application code — it is enforced at the database level for every query regardless of how it originates. This is the correct security model for a platform handling deeply personal member data.

## Alternatives considered

- *Firebase/Firestore* — rejected because NoSQL does not fit FringeIsland's relational data model (groups, memberships, roles, permissions all require joins)
- *PlanetScale/MySQL* — rejected because no native RLS support
- *Custom backend (Node.js/Django)* — rejected because the overhead of building and maintaining infrastructure is not appropriate for a solo developer at this stage
- *Neon/Prisma* — valid alternative but Supabase's auth and storage integration makes it simpler as a complete backend solution

## Consequences

- All security is enforced through RLS policies — no exceptions
- SECURITY DEFINER functions are used only for operations that need to bypass RLS for legitimate platform-level reasons (e.g. `is_platform_admin()`, `has_permission()`)
- PostgreSQL constraint: does not allow subqueries in CHECK constraints — use triggers instead

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
