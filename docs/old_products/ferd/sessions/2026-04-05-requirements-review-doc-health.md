# Session Bridge: Requirements Review + Doc Health Overhaul

**Date:** 2026-04-05
**Type:** Documentation review & overhaul
**Version:** v0.2.37 (no code changes)

---

## Summary

Comprehensive requirements accuracy check and documentation health overhaul across Ferd and Hamn.

## Key Decision

**Architecture compliance is a LAUNCH BLOCKER.** AR-001 through AR-004 must all complete before Ferd ships. This was a deliberate user decision on 2026-04-05 — not post-launch cleanup.

## Work Completed

### Ferd PRODUCT_SPEC.md
- Full rewrite v1.2 → v2.0
- Removed duplicative content (acceptance criteria belong in REQUIREMENTS.md, technical specs in architecture docs)
- Added Visitor persona, updated Guide persona, rewrote 6 user flows, added safety principle, void dimensions
- File now serves clear purpose: "what Ferd IS and WHY"

### Ferd REQUIREMENTS.md
- 5 status corrections (FR-L0-009, FR-L1-004, FR-L1-005, FR-L5-006, NFR-U-004 changed ⏸️→📋)
- 3 new requirements added (FR-L1-010 Travel Log, FR-L5-009 Group DMs, FR-L5-010 Block/Report)
- 1 accuracy fix (FR-L2-007 Invitations: 🚨→🔄 at 75%)
- Added Binding Architecture Rule section
- AR-001–004 elevated to 🔥 LAUNCH BLOCKER
- Total: 97→100 requirements

### Hamn REQUIREMENTS.md
- Populated from scratch: 82 requirements
- HR- prefix, organized by L0–L7 + V1–V5 + NFRs + ARs
- Sources: Hamn PRODUCT_SPEC themes, Ferd deferrals, Session 01 concepts
- Milestone assignments (M1/M2/M3), research dependencies flagged

### Hamn DEFERRED.md
- Added Whisp Respawning Mechanics (re-deferred Ferd → Hamn → Wave 3)

### DOC_HEALTH_CHECK.md
- Full rewrite: 3 → 6 audit sections
- Added: Path Reference Drift, Cross-Document Consistency (8 alignment pairs), Architecture Compliance Spot-Check
- Added three-tier doc structure reference

### Repo-wide Reference Fix
- ~80 stale path references fixed across ~25 files
- Post-restructuring drift from earlier April 5 three-tier migration

### CLAUDE.md + README.md
- CLAUDE.md: requirements count 97→100, added Hamn entries, added binding architecture rule
- README.md: added Ferd REQUIREMENTS.md, Hamn PRODUCT_SPEC.md, Hamn REQUIREMENTS.md to nav table

## Open Items

- **Permission count discrepancy:** CLAUDE.md/PRODUCT_SPEC say 31 permissions, REQUIREMENTS.md says 39. Needs database verification.
- **Architecture compliance work (AR-001–004):** Launch blockers, not yet started. Sprint plan updated with items 1–4.

## Files Changed

- `docs/products/ferd/specification/PRODUCT_SPEC.md` (rewrite)
- `docs/products/ferd/specification/REQUIREMENTS.md` (8 edits)
- `docs/products/ferd/specification/INDEX.md` (description fix)
- `docs/products/hamn/specification/REQUIREMENTS.md` (rewrite)
- `docs/products/hamn/planning/DEFERRED.md` (new section)
- `docs/products/ferd/development/DOC_HEALTH_CHECK.md` (rewrite)
- `CLAUDE.md` (3 edits)
- `README.md` (1 edit)
- `PROJECT_STATUS.md` (close-down)
- `SPRINT.md` (close-down + AR items added)
- ~25 additional files with stale path reference fixes

## Next Priorities

1. Verify permission count (31 vs 39) against live database
2. Begin AR-001 (ADR-009 API-first compliance) — the biggest architectural debt
3. Mobile responsiveness audit
4. User onboarding flow (TDD)
