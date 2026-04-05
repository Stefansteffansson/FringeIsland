# SPRINT.md — Active Sprint Tracker

**Last Updated:** 2026-04-05 (product spec review session)
**Version:** v0.2.37

---

## How to Read This File

- **One section per active work stream.** Most of the time there is one. Add more for parallel work.
- **TDD Stage** — where we are in the 0-7 lifecycle (see `docs/workflows/feature-development.md`).
- **Sprint Plan** — steps with status. Tick off as work completes. Update on close-down.
- **Next Sprint** — what we start after the current sprint finishes.

---

## Work Stream 1 — Phase 1.6: Polish & Launch

**Feature / Work Package:** Phase 1.6 Polish & Launch
**TDD Stage:** N/A — no active feature sprint in progress
**Status:** Planning / Ready to start
**Session Bridge:** `docs/products/ferd/sessions/2026-03-20-SESSION-01-journey-designer.md`

### Sprint Plan

| # | Step | Owner | Status |
|---|------|-------|--------|
| 1 | Mobile responsiveness audit | UI Agent | Not started |
| 2 | User onboarding flow (TDD stages 0-7) | Sprint Agent | Not started |
| 3 | Visitor/shadow experience + taster journeys (TDD) | Sprint Agent | Not started |
| 4 | profile_data table (ADR-U005) + travel log (TDD) | Sprint Agent | Not started |
| 5 | i18n framework — string externalization | Integration Agent | Not started |
| 6 | Block/report users (TDD) | Sprint Agent | Not started |
| 7 | Group DMs (TDD) | Sprint Agent | Not started |
| 8 | Basic announcements (TDD) | Sprint Agent | Not started |
| 9 | Expand E2E test coverage beyond 7 starter tests | Test Agent | Not started |
| 10 | Fix known issues: orphan groups, alert() in fix-orphans, hydration warning | Integration Agent | Not started |
| 11 | Beta testing setup — invite 10-20 users | — | Not started |
| 12 | Error monitoring (Sentry) | Integration Agent | Not started |

### Blockers

- None

---

<!--
To add a parallel work stream, copy this template:

## Work Stream N — [Feature Name]

**Feature / Work Package:** [Name]
**TDD Stage:** [0-7 or N/A]
**Status:** [Planning | In progress | Blocked | Complete]
**Session Bridge:** `docs/planning/sessions/YYYY-MM-DD-description.md`

### Sprint Plan

| # | Step | Owner | Status |
|---|------|-------|--------|
| 1 | ... | ... | Not started |

### Blockers

- None
-->

---

## Next Sprint (Backlog)

After Ferd 1.6 ships:

| Priority | Work | Notes |
|----------|------|-------|
| 1 | Hamn M1 — Journey Creation Tools | Visual editor, step types, rich text |
| 2 | Hamn M2 — Journey Marketplace | Publishing workflow, browse, ratings |
| 3 | Hamn M3 — Enhanced Collaboration | Co-creation, groups-join-groups UI |

See `docs/products/ferd/planning/ROADMAP.md` for Wave 2 (Hamn) and beyond, `docs/products/ferd/planning/DEFERRED.md` for deferred scope, and `docs/products/hamn/INDEX.md` for Hamn product docs.

---

## Completed Sprints (Reference)

| Sprint | Feature | Version | Date |
|--------|---------|---------|------|
| Sprint 4 | Platform Exit | v0.2.36 | 2026-02-28 |
| Sprint 3 | Smart Notifications + Steward Nomination | v0.2.35 | 2026-02-28 |
| Sprint 2 | Leave Group Core | v0.2.34 | 2026-02-28 |
| Sprint 1 | Foundation Schema | v0.2.33 | 2026-02-28 |
| Sprint 0 | Security Fixes | v0.2.32 | 2026-02-28 |

---

**Related:** `PROJECT_STATUS.md` | `docs/products/ferd/planning/ROADMAP.md` | `docs/products/ferd/development/WORKFLOW.md`
