# {Product name} — Specification

**Status:** Draft · Active · Frozen
**Owner:** {name}
**Last updated:** YYYY-MM-DD
**Companion:** `DESCRIPTION.md` (outward-facing) · `ROADMAP.md`

> The inward-facing build spec for a product surface. For developers who need to know how the thing actually works, what it depends on, and what its contracts are. Identity and "why" live in `DESCRIPTION.md` — don't repeat them here.

---

## 1. Surface

- **Platform target:** {Next.js web · iOS native · Android native · Unity game · ...}
- **Repo location:** {paths within the monorepo, or external repo URL}
- **Build / deploy pipeline:** {summary or link}
- **Environments:** {dev, preview, prod URLs / TestFlight / etc.}

## 2. Architecture position

Where this product sits in the three-tier ecosystem anatomy (`../../architecture/`):

- **Tier:** Surfaces
- **Domain services consumed:** {list with the operations called}
- **Platform Core capabilities used:** {auth, identity, organisation, governance}
- **Verticals it must satisfy:** {V1–V5 — admin/privacy/notifications/observability/transactions}

## 3. Authentication & authorization

- How a user signs in on this surface
- Which RBAC roles see which screens
- Any product-specific permission bits that are not in the global RBAC table

## 4. Data ownership

- Tables this product writes to (and which it only reads)
- Storage buckets / CDN paths
- Sync, offline, and caching strategy

## 5. Public API surface

If this product exposes APIs (e.g., for sibling products or extensions), document them here. Otherwise link to `../../platform/core/SPECIFICATION.md`.

## 6. Cross-product contracts

Anything this product *promises* to siblings or *requires* from siblings. Breaking changes here trigger an ADR.

## 7. Operational concerns

- Observability hooks (metrics, error reporting, audit log entries)
- Feature flags and how they're toggled
- Known scaling limits and degradation modes
- Backup and disaster recovery posture

## 8. Open spec questions

Things still under design. Each question is a candidate research spike.
