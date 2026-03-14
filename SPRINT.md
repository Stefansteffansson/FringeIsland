# SPRINT.md — Active Sprint Tracker

**Last Updated:** 2026-03-14
**Version:** v0.2.37

---

## How to Read This File

- **One section per active work stream.** Most of the time there is one. Add more for parallel work.
- **TDD Phase** — where we are in the 0-7 lifecycle (see `docs/workflows/feature-development.md`).
- **Sprint Plan** — steps with status. Tick off as work completes. Update on close-down.
- **Next Sprint** — what we start after the current sprint finishes.

---

## Work Stream 1 — Phase 1.6: Polish & Launch

**Feature / Work Package:** Phase 1.6 Polish & Launch
**TDD Phase:** N/A — no active feature sprint in progress
**Status:** Planning / Ready to start
**Session Bridge:** `docs/planning/sessions/2026-03-03-architecture-baseline-live-validation.md`

### Sprint Plan

| # | Step | Owner | Status |
|---|------|-------|--------|
| 1 | Mobile responsiveness audit | UI Agent | Not started |
| 2 | User onboarding flow (TDD phases 0-7) | Sprint Agent | Not started |
| 3 | Expand E2E test coverage beyond 7 starter tests | Test Agent | Not started |
| 4 | Fix known issues: orphan groups, alert() in fix-orphans, hydration warning | Integration Agent | Not started |
| 5 | Beta testing setup — invite 10-20 users | — | Not started |
| 6 | Error monitoring (Sentry) | Integration Agent | Not started |

### Blockers

- None

---

<!--
To add a parallel work stream, copy this template:

## Work Stream N — [Feature Name]

**Feature / Work Package:** [Name]
**TDD Phase:** [0-7 or N/A]
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

After Phase 1.6 ships:

| Priority | Work | Notes |
|----------|------|-------|
| 1 | Phase 2.1 — Journey Creation Tools | Visual editor, step types, rich text |
| 2 | Phase 2.2 — Journey Marketplace | Publishing workflow, browse, ratings |
| 3 | Phase 2.3 — Enhanced Collaboration | Co-creation, groups-join-groups UI |

See `docs/planning/ROADMAP.md` for full Phase 2-4 details and `docs/planning/DEFERRED_DECISIONS.md` for deferred scope.

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

**Related:** `PROJECT_STATUS.md` | `docs/planning/ROADMAP.md` | `docs/workflows/feature-development.md`
