# ADR-015 — API versioning in the Platform API ring

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

**Status:** Locked
**Date:** March 2026

**Context:**
When Hamn introduces native iOS and Android apps, those clients will connect to the same API as the web platform. As the API evolves, existing clients (web) must continue working while new clients use updated endpoints.

**Decision:**
API versioning is a named concern in the Platform API ring from Ferd day one. Version prefix on all API routes (`/api/v1/...`). New versions introduced when breaking changes are needed. Old versions maintained until all clients have migrated.

**Why from day one:**
Adding versioning retroactively means renaming every existing route and updating every existing client. Doing it from day one costs nothing extra — it is a path prefix.
