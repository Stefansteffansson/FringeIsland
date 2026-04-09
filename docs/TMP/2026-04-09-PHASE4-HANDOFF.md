# Phase 4 Handoff — Migration Inventory

**Date:** 2026-04-09
**Branch:** main
**Purpose:** Complete inventory for Phase 4 content migration planning

---

## 1. docs/old_\*/ — Full file listing (322 files)

These are the parked legacy files awaiting migration mapping. Each needs a decision: migrate, archive, or delete.

```
docs/old_INDEX.md
docs/old_implementation/INDEX.md
docs/old_implementation/ferd/INDEX.md
docs/old_implementation/ferd/baseline/ACTUAL_STATE.md
docs/old_implementation/ferd/baseline/AUTH_IMPLEMENTATION.md
docs/old_implementation/ferd/baseline/AUTH_IMPLEMENTATION_SUMMARY.md
docs/old_implementation/ferd/baseline/BASELINE.md
docs/old_implementation/ferd/baseline/INDEX.md
docs/old_implementation/ferd/baseline/INSTALLATION.md
docs/old_implementation/ferd/baseline/_archive/2026-03-03-ARCHITECTURE_BASELINE_LEGACY.md
docs/old_implementation/ferd/changelog/INDEX.md
docs/old_implementation/ferd/status/DASHBOARD.md
docs/old_implementation/ferd/status/INDEX.md
docs/old_implementation/ferd/status/KANBAN.md
docs/old_implementation/ferd/testing/INDEX.md
docs/old_implementation/shared/AUTH_SYSTEM.md
docs/old_implementation/shared/DATABASE_CURRENT.md
docs/old_implementation/shared/INDEX.md
docs/old_implementation/shared/MIGRATIONS_LOG.md
docs/old_implementation/shared/RLS_POLICIES.md
docs/old_implementation/shared/SCHEMA_OVERVIEW.md
docs/old_implementation/shared/_archive/2026-02-22-schema-export-pre-d15.md
docs/old_products/INDEX.md
docs/old_products/ROADMAP.md
docs/old_products/_archive/2026-04-07-WAVE_REDISTRIBUTION-completed.md
docs/old_products/brim/INDEX.md
docs/old_products/brim/architecture/decisions/.gitkeep
docs/old_products/brim/development/agents/contexts/.gitkeep
docs/old_products/brim/development/agents/learnings/.gitkeep
docs/old_products/brim/development/features/.gitkeep
docs/old_products/brim/development/specs/.gitkeep
docs/old_products/brim/planning/.gitkeep
docs/old_products/brim/planning/study/WAVE_OVERVIEW.md
docs/old_products/brim/planning/study/android-app-v01.md
docs/old_products/brim/planning/study/fringeisland-studio-v2.md
docs/old_products/brim/planning/study/ios-app-v01.md
docs/old_products/brim/planning/study/journey-studio-v3.md
docs/old_products/brim/planning/study/void.md
docs/old_products/brim/sessions/.gitkeep
docs/old_products/brim/specification/.gitkeep
docs/old_products/eid/INDEX.md
docs/old_products/eid/architecture/decisions/.gitkeep
docs/old_products/eid/development/agents/contexts/.gitkeep
docs/old_products/eid/development/agents/learnings/.gitkeep
docs/old_products/eid/development/features/.gitkeep
docs/old_products/eid/development/specs/.gitkeep
docs/old_products/eid/planning/.gitkeep
docs/old_products/eid/planning/study/WAVE_OVERVIEW.md
docs/old_products/eid/planning/study/journey-studio-v1.md
docs/old_products/eid/planning/study/minimal-design-foundation.md
docs/old_products/eid/planning/study/whisp.md
docs/old_products/eid/sessions/.gitkeep
docs/old_products/eid/specification/.gitkeep
docs/old_products/ferd/INDEX.md
docs/old_products/ferd/architecture/INDEX.md
docs/old_products/ferd/architecture/LIFECYCLE_FLOWS.md
docs/old_products/ferd/architecture/RBAC_MIGRATION_REVIEW.md
docs/old_products/ferd/architecture/decisions/ADR-F001-baseline-claude-code-generated.md
docs/old_products/ferd/architecture/decisions/INDEX.md
docs/old_products/ferd/architecture/study/api-ring.md
docs/old_products/ferd/architecture/study/conformance-audit.md
docs/old_products/ferd/architecture/study/system-anatomy.md
docs/old_products/ferd/architecture/study/verticals.md
docs/old_products/ferd/development/BOOT_UP.md
docs/old_products/ferd/development/CLOSE_DOWN.md
docs/old_products/ferd/development/DOC_HEALTH_CHECK.md
docs/old_products/ferd/development/INDEX.md
docs/old_products/ferd/development/WORKFLOW.md
docs/old_products/ferd/development/_archive/2026-02-09-STRUCTURE_MIGRATION_PLAN.md
docs/old_products/ferd/development/_archive/2026-02-09-STRUCTURE_REVIEW.md
docs/old_products/ferd/development/_archive/2026-02-28-PLANNING_DOCS_GUIDE.md
docs/old_products/ferd/development/_archive/2026-04-05-DOCS_INVENTORY.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/CLAUDE_CODE_HANDOFF-ferd-feature-inventory.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/CLAUDE_CODE_PROMPT-documentation-restructuring_2.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/COMPLETE_FOLDER_STRUCTURE.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/FRINGEISLAND_DOCUMENTATION_ARCHITECTURE_PROPOSAL.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/MIGRATION_MAPPING.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/MIGRATION_RISKS.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/NEXT_STEPS.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/QUICK_REFERENCE-documentation-restructuring_1.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/README.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/examples/DATABASE_CURRENT-shared.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/examples/FRONTEND_CURRENT-ferd.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/examples/INDEX-ferd.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/examples/INDEX-root.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/examples/INDEX-universe.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/examples/KANBAN-ferd.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/examples/REFERENCES_SHARED-ferd.md
docs/old_products/ferd/development/_archive/2026-04-05-refactor-planning/examples/REQUIREMENTS-ferd.md
docs/old_products/ferd/development/agents/INDEX.md
docs/old_products/ferd/development/agents/README.md
docs/old_products/ferd/development/agents/_archive/2026-02-13-feature-agent.md
docs/old_products/ferd/development/agents/contexts/architect-agent.md
docs/old_products/ferd/development/agents/contexts/database-agent.md
docs/old_products/ferd/development/agents/contexts/integration-agent.md
docs/old_products/ferd/development/agents/contexts/qa-agent.md
docs/old_products/ferd/development/agents/contexts/sprint-agent.md
docs/old_products/ferd/development/agents/contexts/test-agent.md
docs/old_products/ferd/development/agents/contexts/ui-agent.md
docs/old_products/ferd/development/agents/learnings/architecture.md
docs/old_products/ferd/development/agents/learnings/database.md
docs/old_products/ferd/development/agents/learnings/integration.md
docs/old_products/ferd/development/agents/learnings/qa.md
docs/old_products/ferd/development/agents/learnings/sprints.md
docs/old_products/ferd/development/agents/learnings/testing.md
docs/old_products/ferd/development/agents/learnings/ui.md
docs/old_products/ferd/development/features/AR-d15-universal-group-pattern-migration.md
docs/old_products/ferd/development/features/AR-deusex-admin-foundation.md
docs/old_products/ferd/development/features/AR-dynamic-permissions-system.md
docs/old_products/ferd/development/features/AR-foundation-schema.md
docs/old_products/ferd/development/features/AR-smart-notifications.md
docs/old_products/ferd/development/features/FR-authentication.md
docs/old_products/ferd/development/features/FR-direct-messaging.md
docs/old_products/ferd/development/features/FR-display-name-system.md
docs/old_products/ferd/development/features/FR-enhanced-member-invitations.md
docs/old_products/ferd/development/features/FR-group-forum-system.md
docs/old_products/ferd/development/features/FR-group-management.md
docs/old_products/ferd/development/features/FR-journey-system.md
docs/old_products/ferd/development/features/FR-leave-group-core.md
docs/old_products/ferd/development/features/FR-notification-system.md
docs/old_products/ferd/development/features/FR-platform-exit.md
docs/old_products/ferd/development/features/INDEX.md
docs/old_products/ferd/development/features/NF-performance-optimization.md
docs/old_products/ferd/development/features/_archive/2026-02-27-leave-group-feature-review.md
docs/old_products/ferd/development/specs/INDEX.md
docs/old_products/ferd/development/specs/_template.md
docs/old_products/ferd/development/specs/admin.md
docs/old_products/ferd/development/specs/authentication.md
docs/old_products/ferd/development/specs/communication.md
docs/old_products/ferd/development/specs/d15-hardening.md
docs/old_products/ferd/development/specs/display-name.md
docs/old_products/ferd/development/specs/groups.md
docs/old_products/ferd/development/specs/invitations.md
docs/old_products/ferd/development/specs/journeys.md
docs/old_products/ferd/development/specs/messaging.md
docs/old_products/ferd/development/specs/notifications.md
docs/old_products/ferd/development/specs/platform-exit.md
docs/old_products/ferd/development/specs/rbac.md
docs/old_products/ferd/development/specs/roles.md
docs/old_products/ferd/development/specs/security.md
docs/old_products/ferd/planning/DEFERRED.md
docs/old_products/ferd/planning/INDEX.md
docs/old_products/ferd/planning/LIFECYCLE_DECISIONS.md
docs/old_products/ferd/planning/RESEARCH.md
docs/old_products/ferd/planning/ROADMAP.md
docs/old_products/ferd/planning/_archive/2026-02-JOURNAL_SYSTEM_DESIGN.md
docs/old_products/ferd/planning/_archive/2026-02-JOURNEY_ARCHITECTURE_V2.md
docs/old_products/ferd/planning/_archive/2026-03-20-DEFERRED_DECISIONS_snapshot.md
docs/old_products/ferd/planning/study/WAVE_OVERVIEW.md
docs/old_products/ferd/planning/study/authentication.md
docs/old_products/ferd/planning/study/direct-messaging.md
docs/old_products/ferd/planning/study/forum.md
docs/old_products/ferd/planning/study/groups.md
docs/old_products/ferd/planning/study/internationalisation.md
docs/old_products/ferd/planning/study/journals.md
docs/old_products/ferd/planning/study/journeys.md
docs/old_products/ferd/planning/study/members.md
docs/old_products/ferd/planning/study/notifications.md
docs/old_products/ferd/planning/study/roles-permissions.md
docs/old_products/ferd/sessions/2026-01-SESSION-01-bridge.md
docs/old_products/ferd/sessions/2026-01-SESSION-01-vision-spec-summary.md
docs/old_products/ferd/sessions/2026-01-SESSION-02-bridge.md
docs/old_products/ferd/sessions/2026-01-SESSION-02-vision-spec-decisions.md
docs/old_products/ferd/sessions/2026-02-27-display-name-system.md
docs/old_products/ferd/sessions/2026-02-27-leave-group-feature-review.md
docs/old_products/ferd/sessions/2026-02-28-documentation-restructuring.md
docs/old_products/ferd/sessions/2026-02-28-lifecycle-roadmap-decisions.md
docs/old_products/ferd/sessions/2026-02-28-sprint1-foundation-schema.md
docs/old_products/ferd/sessions/2026-02-28-sprint2-leave-group-core.md
docs/old_products/ferd/sessions/2026-02-28-sprint3-smart-notifications.md
docs/old_products/ferd/sessions/2026-02-SESSION-03-architecture-journey-summary.md
docs/old_products/ferd/sessions/2026-02-SESSION-03-architecture-summary.md
docs/old_products/ferd/sessions/2026-02-SESSION-03-bridge.md
docs/old_products/ferd/sessions/2026-02-SESSION-04-architecture-bridge.md
docs/old_products/ferd/sessions/2026-03-03-architecture-baseline-live-validation.md
docs/old_products/ferd/sessions/2026-03-03-doc-restructuring-overlap-elimination.md
docs/old_products/ferd/sessions/2026-03-14-architecture-docs-integration.md
docs/old_products/ferd/sessions/2026-03-20-SESSION-01-journey-designer.md
docs/old_products/ferd/sessions/2026-03-25-SESSION-02-journey-designer.md
docs/old_products/ferd/sessions/2026-03-27-SESSION-03-bridge.md
docs/old_products/ferd/sessions/2026-03-27-SESSION-03-journey-designer.md
docs/old_products/ferd/sessions/2026-03-27-SESSION-04-bridge.md
docs/old_products/ferd/sessions/2026-04-01-input-to-claude.md
docs/old_products/ferd/sessions/2026-04-05-documentation-restructuring-execution.md
docs/old_products/ferd/sessions/2026-04-05-documentation-restructuring-mapping.md
docs/old_products/ferd/sessions/2026-04-05-requirements-review-doc-health.md
docs/old_products/ferd/sessions/2026-04-06-SESSION-BRIDGE.md
docs/old_products/ferd/sessions/2026-04-06-documentation-restructuring-proposal.md
docs/old_products/ferd/sessions/2026-04-06-session-analysis.md
docs/old_products/ferd/sessions/2026-04-06-wave-reference-update-plan.md
docs/old_products/ferd/sessions/2026-04-07-wave-redistribution.md
docs/old_products/ferd/sessions/2026-04-08-ECOSYSTEM-ARCHITECTURE-SESSION-BRIDGE.md
docs/old_products/ferd/sessions/INDEX.md
docs/old_products/ferd/sessions/_archive/2026-02-08-bug-fix-last-leader-protection.md
docs/old_products/ferd/sessions/_archive/2026-02-08-rls-security-fixes.md
docs/old_products/ferd/sessions/_archive/2026-02-08-testing-infrastructure.md
docs/old_products/ferd/sessions/_archive/2026-02-09-bdd-hierarchy.md
docs/old_products/ferd/sessions/_archive/2026-02-10-journey-player-and-test-stability.md
docs/old_products/ferd/sessions/_archive/2026-02-10-journey-tests-and-rls-fixes.md
docs/old_products/ferd/sessions/_archive/2026-02-11-rbac-design-complete.md
docs/old_products/ferd/sessions/_archive/2026-02-11-rls-bootstrap-fixes-and-group-deletion.md
docs/old_products/ferd/sessions/_archive/2026-02-11-security-behavior-docs-and-tests.md
docs/old_products/ferd/sessions/_archive/2026-02-13-agent-system-architecture.md
docs/old_products/ferd/sessions/_archive/2026-02-16-rbac-bugfixes-and-notifications.md
docs/old_products/ferd/sessions/_archive/2026-02-16-rbac-sub-sprint-1.md
docs/old_products/ferd/sessions/_archive/2026-02-16-rbac-sub-sprint-2.md
docs/old_products/ferd/sessions/_archive/2026-02-16-rbac-sub-sprint-3.md
docs/old_products/ferd/sessions/_archive/2026-02-16-rbac-sub-sprint-4.md
docs/old_products/ferd/sessions/_archive/2026-02-17-deusex-admin-foundation.md
docs/old_products/ferd/sessions/_archive/2026-02-18-admin-user-actions-specs-and-tests.md
docs/old_products/ferd/sessions/_archive/2026-02-SESSION-03-architecture-summary-old.md
docs/old_products/ferd/sessions/_archive/2026-02-SESSION-03-bridge-old.md
docs/old_products/ferd/sessions/_archive/v0.2.10-session-bridge.md
docs/old_products/ferd/sessions/_archive/v0.2.7-session-bridge.md
docs/old_products/ferd/sessions/_archive/v0.2.8-session-bridge.md
docs/old_products/ferd/specification/ACTIVITY_CATALOG.md
docs/old_products/ferd/specification/INDEX.md
docs/old_products/ferd/specification/PRODUCT_SPEC.md
docs/old_products/ferd/specification/REQUIREMENTS.md
docs/old_products/ferd/specification/_archive/2026-04-05-feature-inventory-handoff.md
docs/old_products/hamn/INDEX.md
docs/old_products/hamn/_archive/2026-04-06-wave2-content/DEFERRED.md
docs/old_products/hamn/_archive/2026-04-06-wave2-content/INDEX.md
docs/old_products/hamn/_archive/2026-04-06-wave2-content/PRODUCT_SPEC.md
docs/old_products/hamn/_archive/2026-04-06-wave2-content/README.md
docs/old_products/hamn/_archive/2026-04-06-wave2-content/REQUIREMENTS.md
docs/old_products/hamn/_archive/2026-04-06-wave2-content/RESEARCH.md
docs/old_products/hamn/_archive/2026-04-06-wave2-content/VISION_TO_SPEC_MAPPING.md
docs/old_products/hamn/architecture/decisions/.gitkeep
docs/old_products/hamn/development/agents/contexts/.gitkeep
docs/old_products/hamn/development/agents/learnings/.gitkeep
docs/old_products/hamn/development/features/.gitkeep
docs/old_products/hamn/development/specs/.gitkeep
docs/old_products/hamn/planning/.gitkeep
docs/old_products/hamn/planning/INDEX.md
docs/old_products/hamn/planning/study/WAVE_OVERVIEW.md
docs/old_products/hamn/planning/study/accessibility-system.md
docs/old_products/hamn/planning/study/design-system.md
docs/old_products/hamn/planning/study/uxui-redesign.md
docs/old_products/hamn/sessions/.gitkeep
docs/old_products/hamn/specification/.gitkeep
docs/old_products/hamn/specification/INDEX.md
docs/old_products/heim/INDEX.md
docs/old_products/heim/architecture/decisions/.gitkeep
docs/old_products/heim/development/agents/contexts/.gitkeep
docs/old_products/heim/development/agents/learnings/.gitkeep
docs/old_products/heim/development/features/.gitkeep
docs/old_products/heim/development/specs/.gitkeep
docs/old_products/heim/planning/.gitkeep
docs/old_products/heim/planning/study/WAVE_OVERVIEW.md
docs/old_products/heim/planning/study/fringeisland-studio-v1.md
docs/old_products/heim/planning/study/fringeisland-world.md
docs/old_products/heim/planning/study/journey-studio-v2.md
docs/old_products/heim/planning/study/my-garden.md
docs/old_products/heim/sessions/.gitkeep
docs/old_products/heim/specification/.gitkeep
docs/old_products/urd/INDEX.md
docs/old_products/urd/architecture/decisions/.gitkeep
docs/old_products/urd/development/agents/contexts/.gitkeep
docs/old_products/urd/development/agents/learnings/.gitkeep
docs/old_products/urd/development/features/.gitkeep
docs/old_products/urd/development/specs/.gitkeep
docs/old_products/urd/planning/.gitkeep
docs/old_products/urd/planning/study/WAVE_OVERVIEW.md
docs/old_products/urd/planning/study/android-app-v1.md
docs/old_products/urd/planning/study/arc-studio-v1.md
docs/old_products/urd/planning/study/fringeisland-studio-v3.md
docs/old_products/urd/planning/study/ios-app-v1.md
docs/old_products/urd/planning/study/journey-studio-v4.md
docs/old_products/urd/sessions/.gitkeep
docs/old_products/urd/specification/.gitkeep
docs/old_universe/INDEX.md
docs/old_universe/architecture/ARCHITECTURE_ANATOMY.md
docs/old_universe/architecture/ARCHITECTURE_ANATOMY_DIAGRAM.svg
docs/old_universe/architecture/DOMAIN_ENTITIES.md
docs/old_universe/architecture/DOMAIN_SERVICE_DEPENDENCIES.svg
docs/old_universe/architecture/ECOSYSTEM_ANATOMY_V2.svg
docs/old_universe/architecture/INDEX.md
docs/old_universe/architecture/_archive/2026-03-03-architecture-analysis-taskplan.md
docs/old_universe/community/INDEX.md
docs/old_universe/community/OPEN_QUESTIONS.md
docs/old_universe/decisions/ADR-U001-layered-anatomy-framework.md
docs/old_universe/decisions/ADR-U002-five-cross-cutting-verticals.md
docs/old_universe/decisions/ADR-U003-supabase-backend-platform.md
docs/old_universe/decisions/ADR-U004-visitor-anonymous-sign-in.md
docs/old_universe/decisions/ADR-U005-profile-data-flexible-table.md
docs/old_universe/decisions/ADR-U006-universal-group-pattern.md
docs/old_universe/decisions/ADR-U007-three-layer-permission-model.md
docs/old_universe/decisions/ADR-U008-step-type-extensibility.md
docs/old_universe/decisions/ADR-U009-api-first-frontend-agnostic.md
docs/old_universe/decisions/ADR-U010-privacy-dedicated-vertical.md
docs/old_universe/decisions/ADR-U011-transactions-stripe-connect.md
docs/old_universe/decisions/ADR-U012-observability-dedicated-vertical.md
docs/old_universe/decisions/ADR-U013-design-system-i18n-a11y.md
docs/old_universe/decisions/ADR-U014-feature-flags-infrastructure.md
docs/old_universe/decisions/ADR-U015-api-versioning.md
docs/old_universe/decisions/ADR-U016-cascade-specification-first.md
docs/old_universe/decisions/ADR-U017-journeys-content-templates.md
docs/old_universe/decisions/ADR-U018-no-hardcoded-group-types.md
docs/old_universe/decisions/ADR-U019-deusex-authority-last-resort.md
docs/old_universe/decisions/ADR-U020-pairs-are-groups.md
docs/old_universe/decisions/ADR-U021-forum-anonymisation-soft-flag.md
docs/old_universe/decisions/ADR-U022-named-waves.md
docs/old_universe/decisions/INDEX.md
docs/old_universe/decisions/_archive/2026-03-14-ARCHITECTURE_DECISIONS_LEGACY.md
docs/old_universe/decisions/_archive/2026-04-05-ARCHITECTURE_DECISIONS-monolithic.md
docs/old_universe/processes/DEFERRAL_PROTOCOL.md
docs/old_universe/processes/INDEX.md
docs/old_universe/processes/PLANNING_PROTOCOL.md
docs/old_universe/research/INDEX.md
docs/old_universe/research/adult-development/Kegan_ITC_Research_Report.md
docs/old_universe/research/human-flourishing/What_Fills_a_Life_v1.md
docs/old_universe/research/human-flourishing/What_Fills_a_Life_v2.md
docs/old_universe/research/theory-u/Theory_U_Research_Report.md
docs/old_universe/strategy/CONTRIBUTION_ARCHITECTURE.md
docs/old_universe/strategy/INDEX.md
docs/old_universe/strategy/OPEN_QUESTIONS.md
docs/old_universe/strategy/PRODUCTS_AND_PLATFORM.md
docs/old_universe/vision/INDEX.md
docs/old_universe/vision/MANIFESTO.md
docs/old_universe/vision/VISION.md
docs/old_universe/vision/VISION_DECISIONS.md
```

---

## 2. docs/TMP/ — Full file listing (11 files)

Untracked scratch/planning files. Each needs a decision: promote to new structure, archive, or delete.

```
docs/TMP/2026-04-08-PHASE-4-PRECHECK.md
docs/TMP/DOMAIN_SERVICE_DEPENDENCIES.svg
docs/TMP/ECOSYSTEM_ANATOMY_V2.svg
docs/TMP/EXECUTION-PLAN-DOC-RESTRUCTURE_1.md
docs/TMP/EXECUTION-PLAN-DOC-RESTRUCTURE.md
docs/TMP/multi-product-ecosystem-management_2.md
docs/TMP/Multi-Product-Ecosystem-Management-FringeIsland rev 2.docx
docs/TMP/Multi-Product-Ecosystem-Management-FringeIsland.docx
docs/TMP/Solo-Developers-Guide-to-Systematic-Web-Development.docx
docs/TMP/test
docs/TMP/The solo developer's complete guide to systematic web development.md
```

---

## 3. docs/planning/PROCESS.md — Final version

```markdown
# PROCESS — How Work Flows at FringeIsland

**Status:** Authoritative way of working
**Audience:** Anyone building, designing, deciding, or contributing
**Companion docs:** `../ecosystem/VISION.md` (the why) · `../templates/` (reusable shapes) · `../architecture/ARCHITECTURE_ANATOMY.md` (the what)

This document is the single canonical reference for how work moves from idea to shipped code at FringeIsland. Read it once, then return to it whenever you're not sure what to do next.

It is **descriptive of the current process**, not aspirational. When the process changes, this file changes with it (see Section 8).

---

## Section 1 — Work item lifecycle

Every piece of work — feature, bug, spike, decision — moves through the same maturity pipeline. An item enters at level 0 and is only built once it has reached level 4. Items that can't reach level 4 stay parked until they can.

### Visual flow

```
   ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
   │ 0 RAW IDEA │ →  │ 1 CONCEPT  │ →  │ 2 EXPLORED │ →  │3 SPECIFIED │ →  │  4 READY   │
   └────────────┘    └────────────┘    └────────────┘    └────────────┘    └────────────┘
       one              problem          research            user             DoR
     sentence           +  who           sketched           stories          met
                        benefits         approach           +  PRD

     ─── lives in backlog/discovery.md ───┤├── lives in backlog/product.md ───────┤
                                                                                  │
                                                                                  ▼
                                                                          ┌────────────┐    ┌────────────┐
                                                                          │ 5 IN CYCLE │ →  │   6 DONE   │
                                                                          └────────────┘    └────────────┘
                                                                            pulled            DoD
                                                                            into              met
                                                                            cycle
                                                                          ─── lives in cycles/cycle-current.md ───
```

### Maturity table

| Level | Name | Meaning | Where it lives | Who advances it |
|-------|------|---------|----------------|-----------------|
| 0 | Raw idea | One sentence — "wouldn't it be cool if..." | `backlog/discovery.md` | Anyone |
| 1 | Concept | Problem identified, who benefits, rough shape | `backlog/discovery.md` | Product owner |
| 2 | Explored | Research done, approach sketched, risks named | `backlog/discovery.md` → `backlog/product.md` | Product owner + research |
| 3 | Specified | User stories with acceptance criteria + PRD | `backlog/product.md` + `prds/prd-*.md` | Product owner |
| 4 | Ready | All questions answered, estimable, DoR met | `backlog/product.md` (tagged "ready") | Product owner confirms DoR |
| 5 | In cycle | Pulled into the active build cycle | `cycles/cycle-current.md` | Developer |
| 6 | Done | Implemented, tested, deployed, DoD met | `cycles/cycle-current.md` (marked done) | Developer confirms DoD |

**Movement is one-directional in normal operation.** Items only move backwards when something is wrong (e.g., a "Ready" item turns out to have an unanswered question and drops back to Level 3 until the question is resolved).

**Items at any maturity can be parked in `backlog/icebox.md`** when they're correct but not currently relevant. Icebox items are reviewed at cycle boundaries.

---

## Section 2 — Work item types

Every work item has a type. The type determines which template to use, which DoD checks apply, and what kind of artifact gets produced.

| Type | What it is | Template | Notes |
|------|-----------|----------|-------|
| **feature** | Functional requirement, user-facing | `../templates/prd.md` + `../templates/user-story.md` | Tag with product (`hub`/`gimbal`/etc.) |
| **nfr** | Non-functional / quality attribute (performance, security, a11y) | `../templates/prd.md` | Often produced by a vertical owner |
| **architectural** | Technical decision or infrastructure change | `../templates/adr.md` | Always produces an ADR |
| **spike** | Time-boxed research / exploration | `../templates/research-spike.md` | Output is findings + follow-up items |
| **bug** | Defect in existing functionality | (lightweight — backlog entry only, no PRD unless complex) | Bypasses maturity 0–2 if obvious |
| **tech-debt** | Known shortcut that needs addressing | `../templates/prd.md` (lightweight) | Allocate ~15-20% of cycle capacity |
| **process** | Change to the way of working itself | (this file gets updated) | See Section 8 |

---

## Section 3 — Cadence (Shaped Personal Kanban)

> ⚠️ **The cadence below is a recommended starting point, not law.**
> Run a few cycles, see what fights you, and adjust. It is far better to evolve a cadence that matches your real rhythm than to preserve one that you keep skipping. The shape (cycles + cooldown + WIP limit + daily/weekly/cycle reflection) matters more than the specific durations. **Update this section when your actual cadence changes** — don't run on a different rhythm than what's documented here.

### Recommended starting cadence

- **3-week build cycles** with a **1-week cooldown** between cycles
- **WIP limit:** 3 items in "doing" at any time (anything beyond gets blocked or returned)
- **Daily practice (~8 min):**
  - Morning: write a one-sentence intention for the day
  - End of day: log what was done, what was learned, what's blocked
- **Weekly practice (~30 min, Friday):**
  - Three Ls retrospective (Liked / Learned / Lacked)
  - Reprioritise the backlog
  - Adjust the current cycle plan if the week revealed new information
- **Cycle boundary (~2 hrs):**
  - Shape 1–2 bets for the next cycle (Shape Up style)
  - Review metrics (cycle time, throughput, deployment frequency)
  - Update the relevant roadmaps (`docs/ecosystem/ECOSYSTEM_ROADMAP.md`, product roadmaps, `docs/platform/core/ROADMAP.md`)
  - Run retrospective for the cycle that just ended (template: `../templates/retrospective.md`)

### Waves as thematic focus

Waves (Ferd → Eid → Hamn → Heim → Brim → Urd) are **thematic focus buckets**, not sequential gates. They communicate what the ecosystem prioritises during a period — earlier waves are generally prioritised over later waves, but this is a guideline, not a rule.

Work from any wave can be in any maturity state (Concept, Study, Specify, Build) at any time. Waves overlap naturally: one winds down as the next builds up, and items from different waves may coexist in the same cycle. **WIP limits constrain total active work regardless of which wave items come from** — that's the real concurrency control, not wave boundaries.

Wave tags (`ferd`, `eid`, `hamn`, etc.) are used for filtering, prioritisation, and strategic overview — see Section 7. They are not permissions.

### Wave transition

When a wave's core work is substantially complete, it triggers:
- A **wave retrospective** (use `../templates/retrospective.md`, scope = entire wave, not just last cycle)
- An **ecosystem roadmap update** (`docs/ecosystem/ECOSYSTEM_ROADMAP.md`) reflecting the shift in strategic focus

### Why this shape

- **Cycles + cooldown** — gives a forcing function to ship and a buffer to absorb spillover, fix bugs, and rest. Without cooldown, every cycle's overflow becomes the next cycle's starting debt.
- **WIP limit of 3** — concurrent work multiplies cognitive load nonlinearly. Three is the empirical sweet spot for solo and small-team work.
- **Daily intention + log** — replaces the "where was I?" startup tax with a 30-second read.
- **Weekly Three Ls** — the smallest retrospective that still produces signal. Not optional even when "nothing happened."
- **Cycle boundary** — the only time you allow yourself to zoom out. Without it, urgent work eats important work.

### What to adjust first

If something is wrong, this is the order to try changes in:
1. **Lower the WIP limit** before lengthening cycles. Most cadence pain is concurrency pain in disguise.
2. **Shorten cycles** if you keep underestimating; **lengthen cycles** if shaping repeatedly fails to fit.
3. **Compress the daily practice** before dropping it. Even 60 seconds beats zero.
4. **Move the weekly retro** to a different day before skipping it.

---

## Section 4 — Definition of Ready (DoR)

A work item is ready to be pulled into a cycle when **every** box is checked. If any box can't be checked, the item stays at Level 3 (Specified) until it can.

- [ ] **User story format** — "As a [role], I want [capability], so that [benefit]"
- [ ] **Value is clear** — there is a one-sentence answer to "why does this matter?"
- [ ] **Acceptance criteria** — at least one Given/When/Then scenario per behavior
- [ ] **Independent** — no unresolved blockers; if blocked, the blocker is its own work item
- [ ] **Small enough** — fits in 1–3 days of focused work; if larger, split it
- [ ] **UI/UX approach sketched** — for user-facing items, at least a wireframe or written flow
- [ ] **Data model implications understood** — new tables, new columns, RLS impact named
- [ ] **Edge cases identified** — what happens on empty / failure / concurrent / unauthorized?
- [ ] **Cross-product dependencies identified** — does this require Platform Core or Domain Service changes? Are sibling products affected?
- [ ] **No unresolved open questions** — if there are open questions, they become spikes first

DoR enforcement is the product owner's job, not the developer's. Don't pull items that don't meet DoR — push back instead.

---

## Section 5 — Definition of Done (DoD)

A work item is done when **every** applicable box is checked. "Applicable" matters: a docs-only change does not need RLS policies; a backend-only change does not need mobile responsive checks.

- [ ] **All acceptance criteria implemented and verified**
- [ ] **ESLint + TypeScript strict** pass with no new warnings
- [ ] **Key logic unit-tested** (the parts that would be hardest to debug after a regression)
- [ ] **Mobile responsive** — manual check on a small viewport for any UI change
- [ ] **Supabase RLS policies applied** — every new table or new access pattern has explicit row-level security
- [ ] **Builds without errors** locally and in CI
- [ ] **Deployed to preview environment and verified** — not just merged
- [ ] **README and/or CHANGELOG updated** if user-visible behavior changed
- [ ] **Platform Specification updated** if a shared API surface changed (`docs/platform/core/SPECIFICATION.md` or a domain service file in `docs/platform/domain/`)
- [ ] **Complex decisions documented as ADR** (`docs/architecture/decisions/`) — if you had to choose between options, future you will thank you

DoD enforcement is the developer's job. Don't mark items done that don't meet DoD — leave them open and finish the missing checks.

---

## Section 6 — Document lifecycle (what gets created when)

This is the trigger → artifact map. Whenever you find yourself starting work, look up the trigger here and create the right document from the right template.

| Trigger | Document created | Template | Location |
|---------|-----------------|----------|----------|
| New product surface identified (e.g., a new platform target) | Product Description | `../templates/product-description.md` | `../products/{name}/DESCRIPTION.md` |
| Product enters active development | Product Specification + Roadmap | `../templates/product-specification.md` + `../templates/product-roadmap.md` | `../products/{name}/` |
| New domain service scoped | Domain Service Specification | `../templates/domain-service-spec.md` | `../platform/domain/{name}.md` |
| New Studio scoped | Studio Description | `../templates/studio-description.md` | `../studios/{name}/DESCRIPTION.md` |
| Major feature reaches maturity 3 (Specified) | PRD | `../templates/prd.md` | `prds/prd-{slug}.md` |
| Significant architectural decision is taken | ADR | `../templates/adr.md` | `../architecture/decisions/NNNN-{title}.md` |
| Planning / design session with Claude | Session bridge | `../templates/session-bridge.md` | `sessions/YYYY-MM-DD-{topic}.md` |
| Research needed before specifying | Research spike | `../templates/research-spike.md` | `../research/{topic}.md` |
| Cycle starts | Cycle plan | `../templates/cycle-plan.md` | `cycles/cycle-current.md` |
| Cycle ends | Retrospective | `../templates/retrospective.md` | `cycles/retro-YYYY-MM-DD.md` |
| Wave completes (last Build item Done) | Wave retrospective + ecosystem roadmap update | `../templates/retrospective.md` (wave-scoped) | `cycles/retro-wave-{name}.md` + edit `../ecosystem/ECOSYSTEM_ROADMAP.md` |
| Cross-cutting vertical concern needs specifying | Vertical spec | `../templates/vertical-spec.md` | `../verticals/{name}.md` |
| Ecosystem vision changes | Update VISION.md | (no template — constitutional) | `../ecosystem/VISION.md` |

If your trigger isn't in this table, it's either too small for a document (just put it in the backlog) or it's a new kind of work that should be added to this table.

---

## Section 7 — Backlog tagging

Every backlog item carries four tags. Without tags, prioritisation across the ecosystem is impossible.

| Tag | Values |
|-----|--------|
| **Product** | `hub` · `gimbal` · `game` · `journey-designer` · `universe-designer` · `arc-designer` · `platform-core` · `platform-domain` · `design-system` |
| **Type** | `feature` · `nfr` · `architectural` · `spike` · `bug` · `tech-debt` · `process` |
| **Maturity** | `0-raw` · `1-concept` · `2-explored` · `3-specified` · `4-ready` |
| **Domain service** *(if applicable)* | `world-model` · `narrative` · `experience` · `content` · `communication` · `discovery` · `intelligence` · `extension` |
| **Wave** *(optional)* | `ferd` · `eid` · `hamn` · `heim` · `brim` · `urd` — separate from and in addition to the product/studio/platform tag |

> **Gimbal platform sub-tags:** For platform-specific work on The Gimbal, use `gimbal:ios` or `gimbal:android` in the Product tag. For work that applies to both platforms, use `gimbal` alone.

### Tag format

In `backlog/discovery.md` and `backlog/product.md`, write tags as a single line beneath the item title:

```
## Add group polls
**Tags:** product:hub · type:feature · maturity:2-explored · domain-service:communication

[item description...]
```

Tags are required. An untagged item is invisible — it cannot be prioritised, filtered, or assigned to a cycle.

---

## Section 8 — How this process evolves

The process is not sacred. It exists to serve the work, not the other way around. When the process gets in the way, the process changes.

### Rules for changing the process

1. **Process changes are work items** — type `process`. They go through the same maturity pipeline.
2. **PROCESS.md is versioned alongside code** — every change is a normal git commit with a clear "why."
3. **Quarterly process audit** — once per quarter, ask:
   - What did I skip? (and why — was the rule wrong, or was I wrong?)
   - What's missing? (something we did informally that should be codified)
   - What can be automated? (a checklist that became a script, a template that became a generator)
4. **The process must survive continuous refinement** — adding structure should never erase existing tracking. If a new rule makes an old artifact obsolete, archive the old artifact rather than deleting it.
5. **No hidden process** — if you're following an unwritten rule, write it down here.

### What never changes

- The maturity pipeline (Sections 1–2) — items always move 0 → 4 → 6
- The DoR/DoD shape (Sections 4–5) — checklists may grow or shrink, but every item passes both
- Tag categories (Section 7) — tag values may evolve, but every item carries tags

Everything else — cadence, durations, retrospective format, document templates — is open to revision when experience demands it.

---

## Quick reference

- **Where do I put a new idea?** `backlog/discovery.md`, with tags
- **Where do I write a feature spec?** `prds/prd-{slug}.md`, using `../templates/prd.md`
- **Where do I record a decision?** `../architecture/decisions/NNNN-{title}.md`, using `../templates/adr.md`
- **Where do I find what I'm working on this cycle?** `cycles/cycle-current.md`
- **Where do I park something I don't want to forget but can't act on?** `backlog/icebox.md`
- **Where do I document a session with Claude?** `sessions/YYYY-MM-DD-{topic}.md`
- **What's the way of working?** This file.

---

**Last updated:** April 2026 — Phase 2 of the doc restructure. See `../../CLAUDE.md` for restructure phase status.

```

---

## 4. docs/products/README.md — Final version

```markdown
# Products

One folder per product that members or creators actually touch. Studios live in their own peer folder. Waves are time phases, NOT products.

## Products

- **The Hub** (`hub/`) — the full browser-based FringeIsland experience. The web platform where FIMs explore journeys, manage groups, reflect, and connect.
- **The Gimbal** (`gimbal/`) — mobile app, one product across iOS and Android. The Whisp's stabilizing instrument in the Ordinary World — AR overlay, navigation, journal, messaging, inventory. Shared product description at `gimbal/` level; platform-specific implementation docs in `ios/` and `android/` subfolders.
- **The Game** (`game/`) — placeholder until named.

## Per-product files
- `DESCRIPTION.md` — outward-facing identity (template: `../templates/product-description.md`)
- `SPECIFICATION.md` — inward-facing build spec (template: `../templates/product-specification.md`)
- `ROADMAP.md` — product slice of NOW/NEXT/LATER (template: `../templates/product-roadmap.md`)

```

---

## 5. Git log — Restructuring session commits

```
49cda3e docs: lock product names — The Hub, The Gimbal, The Game
b36d2ab docs: revoke wave hard-cut — waves are thematic focus buckets, not gates
521597c docs: save pre-Phase-4 status report to docs/TMP/
04b1013 docs: commit parked session bridges and ecosystem anatomy diagrams in place
1196bef docs: phase 3 — 13 templates + 5 vertical scaffolds
2bf130b docs: PROCESS.md patch — wave overlap rule, wave tag, wave-completion trigger
05caa18 docs: fix wave-name leakage — products are surfaces (web/ios/android/game), not waves
5bcd13b docs: phase 2 — write PROCESS.md (way of working)
a84c338 docs: phase 1 — scaffold new ecosystem structure (folders + READMEs)
e4d405f docs: rewrite all references to old_products/old_implementation/old_universe/old_INDEX.md
a3b5704 docs: rename products/implementation/universe/INDEX.md to old_* for restructure
```

---

*Generated 2026-04-09 as the handoff artifact between the restructuring session (Phases 1–3) and the content migration session (Phase 4).*
