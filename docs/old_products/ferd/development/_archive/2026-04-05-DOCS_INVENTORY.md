# FringeIsland Documentation Inventory

**Generated:** 2026-04-05
**Scope:** All `.md` files in repo root + `docs/` (excluding `docs/refactor_docs/`)
**Total files:** 139 (6 root + 133 under docs/)

---

## Repository Root

| File | Size | Description |
|------|------|-------------|
| `CHANGELOG.md` | 67 KB | Version history following Keep a Changelog format; all notable changes per release |
| `CLAUDE.md` | 8 KB | AI context routing document: project overview, architecture patterns, dev workflow, document map, critical gotchas |
| `DASHBOARD.md` | 5 KB | Instructions for the local dark-themed development dashboard at `/dev/dashboard` |
| `PROJECT_STATUS.md` | 13 KB | Current project state, version, active sprint reference, quick stats, blockers |
| `README.md` | 5 KB | Public-facing project overview: tech stack, setup instructions, project description |
| `SPRINT.md` | 3 KB | Active sprint tracker: TDD stage, step plan, next sprint backlog |

---

## docs/ (root level)

| File | Size | Description |
|------|------|-------------|
| `docs/old_INDEX.md` | 10 KB | Master navigation index for all FringeIsland documentation with quick-nav table |

---

## docs/-- design-system/ (placeholder files)

| File | Size | Description |
|------|------|-------------|
| `docs/-- design-system/-- README.md` | 0 KB | Empty placeholder |
| `docs/-- design-system/-- components.md` | 0 KB | Empty placeholder |
| `docs/-- design-system/-- foundations.md` | 0 KB | Empty placeholder |
| `docs/-- design-system/-- guidelines.md` | 0 KB | Empty placeholder |
| `docs/-- design-system/-- patterns.md` | 0 KB | Empty placeholder |

---

## docs/agents/

| File | Size | Description |
|------|------|-------------|
| `docs/agents/README.md` | 7 KB | Agent system overview: two-tier architecture, 7 agents, three-layer learning model |

### docs/agents/contexts/ (Agent Playbooks)

| File | Size | Description |
|------|------|-------------|
| `docs/agents/contexts/architect-agent.md` | 10 KB | Architect Agent playbook: system design, schema evolution, technical decisions, pattern consistency |
| `docs/agents/contexts/database-agent.md` | 13 KB | Database Agent playbook: schema changes, migrations, RLS policies, PostgreSQL patterns |
| `docs/agents/contexts/integration-agent.md` | 9 KB | Integration Agent playbook: data flow, Supabase queries, state management, API layer wiring |
| `docs/agents/contexts/qa-agent.md` | 8 KB | QA/Review Agent playbook: code review, security audit, RLS verification, regression detection |
| `docs/agents/contexts/sprint-agent.md` | 12 KB | Sprint Agent playbook: sprint planning, task breakdown, retrospectives, knowledge curation |
| `docs/agents/contexts/test-agent.md` | 11 KB | Test Agent playbook: behavior specs, test design, test running, coverage tracking |
| `docs/agents/contexts/ui-agent.md` | 16 KB | UI Agent playbook: components, styling, responsive design, Next.js 16.1 App Router patterns |

### docs/agents/contexts/archive/

| File | Size | Description |
|------|------|-------------|
| `docs/agents/contexts/archive/feature-agent.md` | 14 KB | Archived Feature Agent playbook (replaced by Integration Agent + feature-development workflow) |

### docs/agents/learnings/ (Agent Journals)

| File | Size | Description |
|------|------|-------------|
| `docs/agents/learnings/architecture.md` | 4 KB | Architect Agent learning journal: design discoveries, pattern insights |
| `docs/agents/learnings/database.md` | 19 KB | Database Agent learning journal: schema, migration, and RLS discoveries |
| `docs/agents/learnings/integration.md` | 10 KB | Integration Agent learning journal: data flow, queries, state management findings |
| `docs/agents/learnings/qa.md` | 1 KB | QA Agent learning journal: recurring issues, review findings |
| `docs/agents/learnings/sprints.md` | 4 KB | Sprint Agent learning journal: process insights, planning patterns |
| `docs/agents/learnings/testing.md` | 11 KB | Test Agent learning journal: test patterns, debugging discoveries |
| `docs/agents/learnings/ui.md` | 5 KB | UI Agent learning journal: component, styling, and UX discoveries |

---

## docs/architecture/

| File | Size | Description |
|------|------|-------------|
| `docs/architecture/ARCHITECTURE_ANATOMY.md` | 31 KB | Primary architecture reference: layered anatomy (L0-L7), 5 verticals, Platform API ring. Locked. |
| `docs/architecture/ARCHITECTURE_BASELINE.md` | 32 KB | Live implementation state mapped to ARCHITECTURE_ANATOMY layers; generated from repo analysis |
| `docs/architecture/ARCHITECTURE_DECISIONS.md` | 35 KB | Architecture Decision Records (ADRs): reasoning behind every significant architectural decision |
| `docs/architecture/ARCHITECTURE_DECISIONS_LEGACY.md` | 20 KB | Superseded architecture doc; retained for historical context |
| `docs/architecture/AUTHORIZATION.md` | 5 KB | Authorization model: RLS policies to add, updated for RBAC v0.2.5+ |
| `docs/architecture/DATABASE_SCHEMA.md` | 38 KB | Complete PostgreSQL schema: all tables, relationships, indexes, RLS policies |
| `docs/architecture/DOMAIN_ENTITIES.md` | 22 KB | Core business entities: User, Group, Journey, etc. with properties and relationships |

### docs/architecture/architecture-analysis-taskplan/

| File | Size | Description |
|------|------|-------------|
| `docs/architecture/architecture-analysis-taskplan/fringeisland-architecture-analysis-taskplan_1.md` | 9 KB | Task plan for comprehensive system architecture analysis; defines mission and output goals |

### docs/architecture/archive/

| File | Size | Description |
|------|------|-------------|
| `docs/architecture/archive/ARCHITECTURE_BASELINE_LEGACY.md` | 84 KB | Legacy architecture baseline from 2026-03-03; superseded by current ARCHITECTURE_BASELINE |

---

## docs/archive/

| File | Size | Description |
|------|------|-------------|
| `docs/archive/leave_group_feature_review.md` | 37 KB | Archived design discussion for leave group and steward handover flow; sprints complete |

---

## docs/database/

| File | Size | Description |
|------|------|-------------|
| `docs/database/migrations-log.md` | 8 KB | Database migrations log: tracks all migrations with notes on what changed and why |
| `docs/database/rls-policies.md` | 1 KB | Quick reference for RLS policies (points to AUTHORIZATION.md for details) |
| `docs/database/schema-export-pre-d15.md` | 10 KB | Pre-D15 schema reference export; snapshot before Universal Group Pattern rebuild |
| `docs/database/schema-overview.md` | 8 KB | High-level database schema overview (v0.2.10); points to DATABASE_SCHEMA.md for full SQL |

---

## docs/design-reviews/

| File | Size | Description |
|------|------|-------------|
| `docs/design-reviews/rbac-sprint1-migration-plan.md` | 9 KB | RBAC Sub-Sprint 1 migration plan design review; gap analysis of permission count |

---

## docs/features/implemented/

| File | Size | Description |
|------|------|-------------|
| `docs/features/implemented/authentication.md` | 20 KB | Authentication system feature doc: Supabase Auth, session management, profile creation |
| `docs/features/implemented/d15-universal-group-pattern-migration.md` | 9 KB | D15 Universal Group Pattern migration: schema rebuild to universal group model |
| `docs/features/implemented/deusex-admin-foundation.md` | 14 KB | DeusEx admin foundation: system group, admin panel, platform administration |
| `docs/features/implemented/direct-messaging.md` | 6 KB | Direct messaging system: 1:1 messaging between users |
| `docs/features/implemented/display-name-system.md` | 15 KB | Display name / nickname system: user-facing names decoupled from auth email |
| `docs/features/implemented/dynamic-permissions-system.md` | 59 KB | Dynamic permissions (RBAC) design: 22 decisions (D1-D22), 4 roles, 31 permissions |
| `docs/features/implemented/enhanced-member-invitations.md` | 4 KB | Enhanced member invitations: improved invitation flow for group membership |
| `docs/features/implemented/foundation-schema.md` | 6 KB | Foundation schema (Sprint 1): groups.status + FI Journeys group prerequisites |
| `docs/features/implemented/group-forum-system.md` | 11 KB | Group forum system: in-group discussion forums with topics and posts |
| `docs/features/implemented/group-management.md` | 35 KB | Group management system: creation, membership, roles, RBAC, leave-group, stewardship |
| `docs/features/implemented/journey-system.md` | 25 KB | Journey system: catalog, enrollment, content delivery, progress tracking, access control |
| `docs/features/implemented/leave-group-core.md` | 10 KB | Leave group core (Sprint 2): member departure, steward handover, cleanup |
| `docs/features/implemented/notification-system.md` | 17 KB | Notification system: in-app notifications, smart/actionable notifications, steward nomination |
| `docs/features/implemented/performance-optimization.md` | 17 KB | Performance optimization: system-wide responsiveness across admin panel and groups pages |
| `docs/features/implemented/platform-exit.md` | 4 KB | Platform exit (Sprint 4): admin-assisted user removal with cascade cleanup |
| `docs/features/implemented/smart-notifications.md` | 6 KB | Smart notifications (Sprint 3): actionable notification infrastructure + stewardship nomination |

---

## docs/flows/

| File | Size | Description |
|------|------|-------------|
| `docs/flows/lifecycle-flows.md` | 16 KB | Lifecycle flows reference: leave group, smart notifications, platform exit across sprints 2-4 |

---

## docs/old_implementation/

| File | Size | Description |
|------|------|-------------|
| `docs/old_implementation/AUTH_IMPLEMENTATION.md` | 6 KB | Authentication implementation: file structure, component details, integration guide |
| `docs/old_implementation/AUTH_IMPLEMENTATION_SUMMARY.md` | 6 KB | Authentication implementation summary: what was built, completion status |
| `docs/old_implementation/INSTALLATION.md` | 5 KB | Authentication system installation guide: step-by-step setup instructions |

---

## docs/planning/

| File | Size | Description |
|------|------|-------------|
| `docs/planning/ACTUAL_STATE.md` | 24 KB | Ferd actual state analysis (v0.2.37): comprehensive current platform assessment |
| `docs/planning/CLAUDE_CODE_HANDOFF-ferd-feature-inventory.md` | 33 KB | Ferd feature inventory and gap analysis session from Claude Code |
| `docs/planning/DEFERRED_DECISIONS.md` | 34 KB | Deferred decisions tracker: features/questions deferred to later waves with rationale |
| `docs/planning/PRODUCT_SPEC.md` | 17 KB | Product specification: what to build, MVP scope, Wave 1/Ferd features |
| `docs/planning/REQUIREMENTS-ferd-complete.md` | 61 KB | Complete Ferd requirements document based on actual state analysis |
| `docs/planning/ROADMAP.md` | 13 KB | Wave roadmap: when features are built, how platform evolves over time |
| `docs/planning/VISION_DECISIONS.md` | 11 KB | Vision session progress record: locked decisions, conclusions, open questions from sessions |
| `docs/planning/lifecycle-roadmap-decisions.md` | 22 KB | Lifecycle feature roadmap decision record: 5-sprint structure, binding decisions, deferrals |

### docs/planning/archive/

| File | Size | Description |
|------|------|-------------|
| `docs/planning/archive/DEFERRED_DECISIONS_2026-03-20.md` | 28 KB | Archived snapshot of deferred decisions from 2026-03-20 |
| `docs/planning/archive/PLANNING_DOCS_GUIDE.md` | 9 KB | Guide for using and maintaining ROADMAP.md and DEFERRED_DECISIONS.md |
| `docs/planning/archive/STRUCTURE_MIGRATION_PLAN.md` | 15 KB | Structure migration plan (Option B): prepare for TDD + behavior-first development |
| `docs/planning/archive/STRUCTURE_REVIEW.md` | 10 KB | Structure review and recommendations: pre-implementation analysis for Option B |
| `docs/planning/archive/phase-2-designs/FringeIsland_Journal_System_Design.md` | 26 KB | Phase 2 journal system design: travel metaphor, learning modules, complete design summary |
| `docs/planning/archive/phase-2-designs/FringeIsland_Journey_Architecture_v2.md` | 60 KB | Phase 2 journey architecture v2: Journey Designer visual canvas tool, complete architecture |

### docs/planning/sessions/ (Active)

| File | Size | Description |
|------|------|-------------|
| `docs/planning/sessions/2026-02-27-display-name-system.md` | 4 KB | Session log: Display Name / Nickname System TDD sprint |
| `docs/planning/sessions/2026-02-27-leave-group-feature-review.md` | 6 KB | Session log: Leave group feature review + [Deleted User] sentinel seed |
| `docs/planning/sessions/2026-02-28-documentation-restructuring.md` | 2 KB | Session log: Deep analysis and restructuring of all planning/workflow/context docs |
| `docs/planning/sessions/2026-02-28-lifecycle-roadmap-decisions.md` | 4 KB | Session log: Lifecycle feature dependencies mapping + binding decisions |
| `docs/planning/sessions/2026-02-28-sprint1-foundation-schema.md` | 4 KB | Session log: Sprint 1 TDD implementation (groups.status + FI Journeys group) |
| `docs/planning/sessions/2026-02-28-sprint2-leave-group-core.md` | 5 KB | Session log: Sprint 2 TDD workflow + feature doc review |
| `docs/planning/sessions/2026-02-28-sprint3-smart-notifications.md` | 5 KB | Session log: Sprint 3 actionable notifications + steward nomination |
| `docs/planning/sessions/2026-03-03-architecture-baseline-live-validation.md` | 2 KB | Session log: 6-phase architecture analysis with live database validation |
| `docs/planning/sessions/2026-03-03-doc-restructuring-overlap-elimination.md` | 3 KB | Session bridge: Documentation overlap elimination + SPRINT.md creation |
| `docs/planning/sessions/2026-03-14-architecture-docs-integration.md` | 4 KB | Session bridge: Integration of three new architecture documents + baseline regeneration |
| `docs/planning/sessions/2026-03-20-JOURNEY_DESIGNER_SESSION.md` | 63 KB | Journey Designer Discovery Session 01: foundational vocabulary, cosmology, data model concepts |
| `docs/planning/sessions/2026-03-25-JOURNEY_DESIGNER_SESSION_02_1.md` | 26 KB | Journey Designer Session 02: Seasons & Episodes, The Whisp, Three Perspectives |
| `docs/planning/sessions/2026-03-27-JOURNEY_DESIGNER_SESSION_03_1.md` | 29 KB | Journey Designer Session 03: The Three-Dimensional Void breakthrough |
| `docs/planning/sessions/2026-03-27-JOURNEY_DESIGNER_SESSION_03_BRIDGE.md` | 8 KB | Journey Designer Session 03 bridge: context brief for Session 03 |
| `docs/planning/sessions/2026-03-27-JOURNEY_DESIGNER_SESSION_04_BRIDGE.md` | 11 KB | Journey Designer Session 04 bridge: context brief for Session 04 |
| `docs/planning/sessions/input to claude.md` | 1 KB | Input prompt: list of docs for Claude to read (vision, products, sessions) |

### docs/planning/sessions/Claude AI session bridge documents/

| File | Size | Description |
|------|------|-------------|
| `docs/planning/sessions/Claude AI session bridge documents/-- SESSION_1_SUMMARY.md` | 13 KB | Session 3 summary (Swedish): vision & specification session decisions |
| `docs/planning/sessions/Claude AI session bridge documents/-- SESSION_2_SUMMARY.md` | 21 KB | Session 4 decision document (Swedish): complete record of locked decisions |
| `docs/planning/sessions/Claude AI session bridge documents/-- SESSION_BRIDGE #1.md` | 7 KB | Session bridge #1: carry context from Vision & Specification Session 3 |
| `docs/planning/sessions/Claude AI session bridge documents/-- SESSION_BRIDGE #2.md` | 13 KB | Session bridge #2: carry context from Vision & Specification Session 4 |
| `docs/planning/sessions/Claude AI session bridge documents/--SESSION_3_SUMMARY.md` | 17 KB | Session 3 summary: Architecture & Anatomy session (committed version) |
| `docs/planning/sessions/Claude AI session bridge documents/--SESSION_3_SUMMARY_old.md` | 22 KB | Session 3 summary: Architecture & Anatomy session (older version) |
| `docs/planning/sessions/Claude AI session bridge documents/--SESSION_BRIDGE_#3.md` | 8 KB | Session bridge #3: Architecture & Anatomy session (committed version) |
| `docs/planning/sessions/Claude AI session bridge documents/--SESSION_BRIDGE_#3_old.md` | 12 KB | Session bridge #3: Architecture & Anatomy session (older version) |
| `docs/planning/sessions/Claude AI session bridge documents/SESSION_BRIDGE_ARCHITECTURE_4.md` | 7 KB | Session bridge #4: Architecture & Anatomy + Journey Enrollment |
| `docs/planning/sessions/Claude AI session bridge documents/SESSION_SUMMARY_ARCHITECTURE_3.md` | 12 KB | Architecture session 3 summary: Architecture & Anatomy + Journey Enrollment |

### docs/planning/sessions/archive/

| File | Size | Description |
|------|------|-------------|
| `docs/planning/sessions/archive/2026-02-08-bug-fix-last-leader-protection.md` | 8 KB | Archived session: critical bug fix for last leader protection |
| `docs/planning/sessions/archive/2026-02-08-rls-security-fixes.md` | 9 KB | Archived session: critical RLS security fixes (6-hour effort) |
| `docs/planning/sessions/archive/2026-02-08-testing-infrastructure.md` | 12 KB | Archived session: testing infrastructure & BDD setup |
| `docs/planning/sessions/archive/2026-02-09-bdd-hierarchy.md` | 10 KB | Archived session: documentation restructuring for BDD hierarchy |
| `docs/planning/sessions/archive/2026-02-10-journey-player-and-test-stability.md` | 6 KB | Archived session: JourneyPlayer UI + test stability fixes |
| `docs/planning/sessions/archive/2026-02-10-journey-tests-and-rls-fixes.md` | 8 KB | Archived session: journey integration tests & RLS fixes |
| `docs/planning/sessions/archive/2026-02-11-rbac-design-complete.md` | 4 KB | Archived session: RBAC / Dynamic Permissions design completion |
| `docs/planning/sessions/archive/2026-02-11-rls-bootstrap-fixes-and-group-deletion.md` | 6 KB | Archived session: RLS bootstrap fixes + group deletion + auth hardening |
| `docs/planning/sessions/archive/2026-02-11-security-behavior-docs-and-tests.md` | 6 KB | Archived session: security fixes, behavior docs & role tests |
| `docs/planning/sessions/archive/2026-02-13-agent-system-architecture.md` | 4 KB | Archived session: agent system architecture design |
| `docs/planning/sessions/archive/2026-02-16-rbac-bugfixes-and-notifications.md` | 6 KB | Archived session: RBAC bug fixes, bootstrap patterns, notification UX |
| `docs/planning/sessions/archive/2026-02-16-rbac-sub-sprint-1.md` | 4 KB | Archived session: RBAC Sub-Sprint 1 schema foundation |
| `docs/planning/sessions/archive/2026-02-16-rbac-sub-sprint-2.md` | 4 KB | Archived session: RBAC Sub-Sprint 2 permission resolution |
| `docs/planning/sessions/archive/2026-02-16-rbac-sub-sprint-3.md` | 4 KB | Archived session: RBAC Sub-Sprint 3 UI migration |
| `docs/planning/sessions/archive/2026-02-16-rbac-sub-sprint-4.md` | 4 KB | Archived session: RBAC Sub-Sprint 4 role management |
| `docs/planning/sessions/archive/2026-02-17-deusex-admin-foundation.md` | 7 KB | Archived session: DeusEx admin foundation + crash recovery |
| `docs/planning/sessions/archive/2026-02-18-admin-user-actions-specs-and-tests.md` | 6 KB | Archived session: admin user actions specs & failing tests |
| `docs/planning/sessions/archive/v0.2.7-session-bridge.md` | 5 KB | Archived session bridge for v0.2.7 |
| `docs/planning/sessions/archive/v0.2.8-session-bridge.md` | 8 KB | Archived session bridge for v0.2.8 |
| `docs/planning/sessions/archive/v0.2.10-session-bridge.md` | 10 KB | Archived session bridge for v0.2.10 |

---

## docs/reference/

| File | Size | Description |
|------|------|-------------|
| `docs/reference/activity-catalog.md` | 12 KB | Activity catalog: every discrete user action organized by domain; maps to RBAC permissions |

---

## docs/research/

| File | Size | Description |
|------|------|-------------|
| `docs/research/Kegan_ITC_Research_Report.md` | 35 KB | Research: Kegan's Adult Development and Immunity to Change theory for FringeIsland |
| `docs/research/Theory_U_Research_Report.md` | 39 KB | Research: Theory U phenomenology of transformation for FringeIsland |
| `docs/research/What_Fills_a_Life_Human_Flourishing.md` | 38 KB | Research: architecture of human flourishing; developmental profile synthesis (v1) |
| `docs/research/What_Fills_a_Life_Human_Flourishing_v2.md` | 62 KB | Research: architecture of human flourishing v2; adds Ikigai and Three Perspectives |

---

## docs/specs/behaviors/

| File | Size | Description |
|------|------|-------------|
| `docs/specs/behaviors/_template.md` | 2 KB | Behavior spec template: copy for each new feature/domain |
| `docs/specs/behaviors/admin.md` | 40 KB | Behavior spec: DeusEx admin foundation rules and guarantees |
| `docs/specs/behaviors/authentication.md` | 10 KB | Behavior spec: user authentication, session management, profile creation |
| `docs/specs/behaviors/communication.md` | 21 KB | Behavior spec: in-app notifications and group forums |
| `docs/specs/behaviors/d15-hardening.md` | 4 KB | Behavior spec: D15 Universal Group Pattern hardening guarantees |
| `docs/specs/behaviors/display-name.md` | 23 KB | Behavior spec: display name / nickname system rules |
| `docs/specs/behaviors/groups.md` | 31 KB | Behavior spec: group creation, membership, and role management |
| `docs/specs/behaviors/invitations.md` | 4 KB | Behavior spec: pending email invitations to non-users |
| `docs/specs/behaviors/journeys.md` | 30 KB | Behavior spec: journey discovery, enrollment, content delivery, progress tracking |
| `docs/specs/behaviors/messaging.md` | 13 KB | Behavior spec: 1:1 direct messaging between users |
| `docs/specs/behaviors/notifications.md` | 7 KB | Behavior spec: notification system including smart/actionable notifications |
| `docs/specs/behaviors/platform-exit.md` | 5 KB | Behavior spec: admin-assisted platform exit rules |
| `docs/specs/behaviors/rbac.md` | 68 KB | Behavior spec: RBAC dynamic permissions system (largest spec) |
| `docs/specs/behaviors/roles.md` | 16 KB | Behavior spec: role assignment, removal, permission enforcement |
| `docs/specs/behaviors/security.md` | 13 KB | Behavior spec: journey access control and enrollment enforcement |

---

## docs/vision/

| File | Size | Description |
|------|------|-------------|
| `docs/vision/CONTRIBUTION_ARCHITECTURE.md` | 9 KB | Contribution architecture: how the community contributes to the ecosystem |
| `docs/vision/MANIFESTO.md` | 6 KB | The FringeIsland Manifesto: philosophical foundation and purpose statement |
| `docs/vision/PRODUCTS_AND_PLATFORM.md` | 13 KB | Products & platform strategy: wave model (Ferd -> Hamn), product family overview |
| `docs/vision/VISION.md` | 24 KB | Vision document: the full FringeIsland world vision by Stefan Stefansson |

---

## docs/workflows/

| File | Size | Description |
|------|------|-------------|
| `docs/workflows/boot-up.md` | 5 KB | Session boot-up workflow: standard procedure for starting a work session |
| `docs/workflows/close-down.md` | 5 KB | Session close-down workflow: standard procedure for ending a work session |
| `docs/workflows/doc-health-check.md` | 4 KB | Doc health check workflow: periodic audit to catch documentation drift |
| `docs/workflows/feature-development.md` | 19 KB | Feature development workflow: authoritative 8-stage TDD lifecycle (stages 0-7) |

---

## Summary by Directory

| Directory | File Count | Total Size |
|-----------|-----------|------------|
| Root (`/`) | 6 | 103 KB |
| `docs/` (root) | 1 | 10 KB |
| `docs/-- design-system/` | 5 | 0 KB |
| `docs/agents/` | 16 | 136 KB |
| `docs/architecture/` | 9 | 277 KB |
| `docs/archive/` | 1 | 37 KB |
| `docs/database/` | 4 | 28 KB |
| `docs/design-reviews/` | 1 | 9 KB |
| `docs/features/implemented/` | 16 | 261 KB |
| `docs/flows/` | 1 | 16 KB |
| `docs/old_implementation/` | 3 | 17 KB |
| `docs/planning/` (non-archive, non-session) | 8 | 217 KB |
| `docs/planning/archive/` | 6 | 149 KB |
| `docs/planning/sessions/` (active) | 16 | 174 KB |
| `docs/planning/sessions/Claude AI session bridge documents/` | 10 | 134 KB |
| `docs/planning/sessions/archive/` | 20 | 133 KB |
| `docs/reference/` | 1 | 12 KB |
| `docs/research/` | 4 | 175 KB |
| `docs/specs/behaviors/` | 15 | 288 KB |
| `docs/vision/` | 4 | 53 KB |
| `docs/workflows/` | 4 | 33 KB |
| **TOTAL** | **139** | **~2.3 MB** |
