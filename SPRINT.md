# SPRINT.md — Active Sprint Tracker

**Last Updated:** 2026-04-09 (doc restructure Phases 1–3 complete; no sprint step changes)
**Version:** v0.2.37

---

## How to Read This File

- **One section per active work stream.** Most of the time there is one. Add more for parallel work.
- **TDD Stage** — where we are in the 0-7 lifecycle (see `docs/old_products/ferd/development/WORKFLOW.md`).
- **Sprint Plan** — steps with status. Tick off as work completes. Update on close-down.
- **Next Sprint** — what we start after the current sprint finishes.

---

## Work Stream 1 — Ferd 1.6: Polish & Launch

**Feature / Work Package:** Ferd 1.6 Polish & Launch
**TDD Stage:** N/A — no active feature sprint in progress
**Status:** Planning / Ready to start
**Session Bridge:** `docs/old_products/ferd/sessions/2026-03-20-SESSION-01-journey-designer.md`

### Sprint Plan

| # | Step | Owner | Status |
|---|------|-------|--------|
| 1 | 🔥 AR-001: ADR-009 API-first compliance (refactor ~40+ direct writes) | Architect + Integration | Not started |
| 2 | 🔥 AR-002: Permission enforcement (39 defined, 8 enforced → full coverage) | Architect + Integration | Not started |
| 3 | 🔥 AR-003: Layer boundary compliance (L0–L7 audit) | Architect | Not started |
| 4 | 🔥 AR-004: Vertical coverage (admin, notifications, observability hooks) | Architect + Integration | Not started |
| 5 | Mobile responsiveness audit | UI Agent | Not started |
| 6 | User onboarding flow (TDD stages 0-7) | Sprint Agent | Not started |
| 7 | Visitor/shadow experience + taster journeys (TDD) | Sprint Agent | Not started |
| 8 | profile_data table (ADR-U005) + travel log (TDD) | Sprint Agent | Not started |
| 9 | i18n framework — string externalization | Integration Agent | Not started |
| 10 | Block/report users (TDD) | Sprint Agent | Not started |
| 11 | Group DMs (TDD) | Sprint Agent | Not started |
| 12 | Basic announcements (TDD) | Sprint Agent | Not started |
| 13 | Expand E2E test coverage beyond 7 starter tests | Test Agent | Not started |
| 14 | Fix known issues: orphan groups, alert() in fix-orphans, hydration warning | Integration Agent | Not started |
| 15 | D11 circularity prevention trigger (hard prerequisite for #16) | Database Agent | Not started |
| 16 | Group-to-Group Relationships UI / Subgroups (groups-join-groups) — pulled back from Wave 3 on 2026-04-07 | Sprint Agent | Not started |
| 17 | Beta testing setup — invite 10-20 users | — | Not started |
| 18 | Error monitoring (Sentry) | Integration Agent | Not started |

### Blockers

- None

---

<!--
To add a parallel work stream, copy this template:

## Work Stream N — [Feature Name]

**Feature / Work Package:** [Name]
**TDD Stage:** [0-7 or N/A]
**Status:** [Planning | In progress | Blocked | Complete]
**Session Bridge:** `docs/old_products/ferd/sessions/YYYY-MM-DD-description.md`

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
| 3 | Hamn M3 — Enhanced Collaboration | Co-creation features (groups-join-groups UI pulled back into Ferd 1.6) |

See `docs/old_products/ferd/planning/ROADMAP.md` for wave roadmap, `docs/old_products/ferd/planning/DEFERRED.md` for deferred scope, and `docs/old_products/INDEX.md` for all waves. (Wave redistribution completed 2026-04-07 — see `docs/old_products/_archive/2026-04-07-WAVE_REDISTRIBUTION-completed.md`.)

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

**Related:** `PROJECT_STATUS.md` | `docs/old_products/ferd/planning/ROADMAP.md` | `docs/old_products/ferd/development/WORKFLOW.md`
