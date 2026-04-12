# ADR-U015: API versioning

**Status:** Accepted
**Date:** 2026-03 (original), 2026-04-05 (extracted)
**Deciders:** Stefan
**Tags:** scope:platform-core · wave:ferd

---

## Context

When later waves introduce native mobile apps (The Gimbal), those clients will connect to the same API as The Hub. As the API evolves, existing clients must continue working while new clients use updated endpoints.

## Decision

API versioning is a named concern from Ferd day one. Version prefix on all API routes (`/api/v1/...`). New versions introduced when breaking changes are needed. Old versions maintained until all clients have migrated.

## Why from day one

Adding versioning retroactively means renaming every existing route and updating every existing client. Doing it from day one costs nothing extra — it is a path prefix.

## Links

- Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05
- Related: [ADR-U009 — API-first, frontend-agnostic](ADR-U009-api-first-frontend-agnostic.md)
