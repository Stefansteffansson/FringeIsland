# Documentation Migration Mapping (v2)

**Generated:** 2026-04-05 | **Revised:** 2026-04-05 (Stefan feedback incorporated)
**Total Files:** 139 .md files + 1 .svg
**Actions:** 81 move, 22 extract (ADR split), ~30 create new (INDEX + content), 35 archive (distributed), 5 delete (empty placeholders), 5 stay (root files updated)

---

## Revision Notes (v2)

1. **Feature doc prefix convention** — FR- (functional), AR- (architectural), NF- (non-functional)
2. **Distributed `_archive/` folders** — each subfolder gets its own `_archive/` instead of one centralized archive. 10 archive folders total.
3. **File change types clarified** — explicit section on which files are moved-only vs split vs rewritten

---

## Resolved Decision Points

| # | Decision | Resolution |
|---|----------|------------|
| DP-1 | Root operational files | **Keep at root** — PROJECT_STATUS.md, SPRINT.md, CHANGELOG.md stay |
| DP-2 | Agent system + workflows | **Move to** `products/ferd/development/` |
| DP-3 | Behavior specs | **Move to** `products/ferd/development/specs/` |
| DP-4 | Feature docs | **Move to** `products/ferd/development/features/` with FR-/AR-/NF- prefixes |
| DP-5 | Session bridge `_old` duplicates | **Archive** to `products/ferd/sessions/_archive/` |
| DP-6 | DOMAIN_ENTITIES.md | **Universe-level** — `universe/architecture/` |

---

## File Operation Types

| Operation | Count | Description |
|-----------|-------|-------------|
| **Move only** | ~56 | File relocates, content untouched |
| **Move + rename** | ~41 | New filename (prefixes, date standardization), content untouched |
| **Split** | 1 → 23 | `ARCHITECTURE_DECISIONS.md` split into 23 individual ADR files |
| **Cross-ref update** | ~50+ | Internal `.md` links updated to new paths (Phase 3, after all moves) |
| **Rewrite** | 3 | `CLAUDE.md`, `README.md`, `docs/INDEX.md` |
| **Create new** | ~30 | INDEX.md files, KANBAN.md, REFERENCES_SHARED.md |
| **Archive** | 35 | Moved to distributed `_archive/` folders |
| **Delete** | 5 | Empty 0 KB placeholders in `-- design-system/` |

---

## Old Directories — Post-Migration Cleanup

All old directories are emptied and deleted after migration:

| Old Directory | Fate |
|---|---|
| `docs/-- design-system/` | Delete (5 empty placeholders deleted) |
| `docs/agents/` | Delete (moved to `products/ferd/development/agents/`) |
| `docs/architecture/` | Delete (split across universe/, implementation/) |
| `docs/archive/` | Delete (file moved to `products/ferd/development/features/_archive/`) |
| `docs/database/` | Delete (moved to `implementation/shared/`) |
| `docs/design-reviews/` | Delete (moved to `products/ferd/architecture/`) |
| `docs/features/` | Delete (moved to `products/ferd/development/features/`) |
| `docs/flows/` | Delete (moved to `products/ferd/architecture/`) |
| `docs/implementation/` | **Repurposed** as Tier 3 root (`implementation/shared/`, `implementation/ferd/`) |
| `docs/planning/` | Delete (split across `products/ferd/` subdirectories) |
| `docs/reference/` | Delete (moved to `products/ferd/specification/`) |
| `docs/research/` | Delete (moved to `universe/research/`) |
| `docs/specs/` | Delete (moved to `products/ferd/development/specs/`) |
| `docs/vision/` | Delete (split across `universe/vision/`, `universe/strategy/`) |
| `docs/workflows/` | Delete (moved to `products/ferd/development/`) |

---

## Universe Tier

### /docs/universe/vision/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/vision/VISION.md` | `docs/universe/vision/VISION.md` | move | Core vision, product-agnostic |
| `docs/vision/MANIFESTO.md` | `docs/universe/vision/MANIFESTO.md` | move | Philosophical foundation |
| `docs/planning/VISION_DECISIONS.md` | `docs/universe/vision/VISION_DECISIONS.md` | move | Locked vision decisions from sessions |

### /docs/universe/strategy/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/vision/PRODUCTS_AND_PLATFORM.md` | `docs/universe/strategy/PRODUCTS_AND_PLATFORM.md` | move | Multi-product wave model |
| `docs/vision/CONTRIBUTION_ARCHITECTURE.md` | `docs/universe/strategy/CONTRIBUTION_ARCHITECTURE.md` | move | Ecosystem contribution model |

### /docs/universe/architecture/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/architecture/ARCHITECTURE_ANATOMY.md` | `docs/universe/architecture/ARCHITECTURE_ANATOMY.md` | move | L0-L7 layered model, all products |
| `docs/architecture/ARCHITECTURE_ANATOMY_DIAGRAM.svg` | `docs/universe/architecture/ARCHITECTURE_ANATOMY_DIAGRAM.svg` | move | Companion diagram |
| `docs/architecture/DOMAIN_ENTITIES.md` | `docs/universe/architecture/DOMAIN_ENTITIES.md` | move | Core domain model (universe-level) |

### /docs/universe/architecture/_archive/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/architecture/architecture-analysis-taskplan/...taskplan_1.md` | `docs/universe/architecture/_archive/2026-03-03-architecture-analysis-taskplan.md` | archive | Completed one-time task plan |

### /docs/universe/research/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/research/What_Fills_a_Life_Human_Flourishing.md` | `docs/universe/research/human-flourishing/What_Fills_a_Life_v1.md` | move+rename | Foundational research v1 |
| `docs/research/What_Fills_a_Life_Human_Flourishing_v2.md` | `docs/universe/research/human-flourishing/What_Fills_a_Life_v2.md` | move+rename | Foundational research v2 (current) |
| `docs/research/Theory_U_Research_Report.md` | `docs/universe/research/theory-u/Theory_U_Research_Report.md` | move | Theory U phenomenology |
| `docs/research/Kegan_ITC_Research_Report.md` | `docs/universe/research/adult-development/Kegan_ITC_Research_Report.md` | move | Kegan adult development |

### /docs/universe/decisions/ (ADR split — 22 universe-level ADRs)

**Source file:** `docs/architecture/ARCHITECTURE_DECISIONS.md` — **SPLIT** into 23 individual files.

| ADR # | New File | Summary |
|-------|----------|---------|
| ADR-001 | `ADR-U001-layered-anatomy-framework.md` | L0-L7 dependency model |
| ADR-002 | `ADR-U002-five-cross-cutting-verticals.md` | Admin, Privacy, Notifs, Observability, Transactions |
| ADR-003 | `ADR-U003-supabase-backend-platform.md` | Supabase as shared backend |
| ADR-004 | `ADR-U004-visitor-anonymous-sign-in.md` | Anonymous sessions with conversion |
| ADR-005 | `ADR-U005-profile-data-flexible-table.md` | Bucket/source model for profile data |
| ADR-006 | `ADR-U006-universal-group-pattern.md` | Personal groups, universal membership |
| ADR-007 | `ADR-U007-three-layer-permission-model.md` | Permissions > Role Templates > Group Roles |
| ADR-008 | `ADR-U008-step-type-extensibility.md` | Extensible step types from day one |
| ADR-009 | `ADR-U009-api-first-frontend-agnostic.md` | API routes for all business logic |
| ADR-010 | `ADR-U010-privacy-dedicated-vertical.md` | Privacy as founding value vertical |
| ADR-011 | `ADR-U011-transactions-stripe-connect.md` | Marketplace payments via Stripe Connect |
| ADR-012 | `ADR-U012-observability-dedicated-vertical.md` | Structured logs, metrics, audit trail |
| ADR-013 | `ADR-U013-design-system-i18n-a11y.md` | i18n and a11y as build constraints |
| ADR-014 | `ADR-U014-feature-flags-infrastructure.md` | DB-backed feature flags in L0 |
| ADR-015 | `ADR-U015-api-versioning.md` | Version prefixes from day one |
| ADR-016 | `ADR-U016-cascade-specification-first.md` | Complete cascade spec before implementation |
| ADR-017 | `ADR-U017-journeys-content-templates.md` | Journeys as templates, groups as containers |
| ADR-018 | `ADR-U018-no-hardcoded-group-types.md` | Labels and templates, no type-based code paths |
| ADR-019 | `ADR-U019-deusex-authority-last-resort.md` | DeusEx steward safeguard |
| ADR-020 | `ADR-U020-pairs-are-groups.md` | No special entity for pairs |
| ADR-021 | `ADR-U021-forum-anonymisation-soft-flag.md` | Display logic, never mutate data |
| ADR-022 | `ADR-U022-ferd-hamn-named-waves.md` | Wave-based product evolution |

### /docs/universe/decisions/_archive/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/architecture/ARCHITECTURE_DECISIONS.md` | `docs/universe/decisions/_archive/2026-04-05-ARCHITECTURE_DECISIONS-monolithic.md` | archive | Original monolithic file preserved after split |
| `docs/architecture/ARCHITECTURE_DECISIONS_LEGACY.md` | `docs/universe/decisions/_archive/2026-03-14-ARCHITECTURE_DECISIONS_LEGACY.md` | archive | Superseded legacy ADR doc |

---

## Products Tier — Ferd

### /docs/products/ferd/specification/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/planning/PRODUCT_SPEC.md` | `docs/products/ferd/specification/PRODUCT_SPEC.md` | move | Ferd product scope and MVP |
| `docs/planning/REQUIREMENTS-ferd-complete.md` | `docs/products/ferd/specification/REQUIREMENTS.md` | move+rename | Complete Ferd requirements (97 total) |
| `docs/reference/activity-catalog.md` | `docs/products/ferd/specification/ACTIVITY_CATALOG.md` | move+rename | User action catalog, maps to RBAC |

### /docs/products/ferd/specification/_archive/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/planning/CLAUDE_CODE_HANDOFF-ferd-feature-inventory.md` | `docs/products/ferd/specification/_archive/2026-04-05-feature-inventory-handoff.md` | archive | Planning artifact from gap analysis |

### /docs/products/ferd/architecture/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/flows/lifecycle-flows.md` | `docs/products/ferd/architecture/LIFECYCLE_FLOWS.md` | move+rename | Ferd lifecycle flow reference |
| `docs/design-reviews/rbac-sprint1-migration-plan.md` | `docs/products/ferd/architecture/RBAC_MIGRATION_REVIEW.md` | move+rename | RBAC migration design review |

### /docs/products/ferd/architecture/decisions/ (1 Ferd-specific ADR)

| ADR # | New File | Summary |
|-------|----------|---------|
| ADR-023 | `ADR-F001-baseline-claude-code-generated.md` | Baseline doc regenerated by Claude Code |

### /docs/products/ferd/planning/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/planning/ROADMAP.md` | `docs/products/ferd/planning/ROADMAP.md` | move | Ferd wave roadmap |
| `docs/planning/DEFERRED_DECISIONS.md` | `docs/products/ferd/planning/DEFERRED.md` | move+rename | Deferred features with rationale |
| `docs/planning/lifecycle-roadmap-decisions.md` | `docs/products/ferd/planning/LIFECYCLE_DECISIONS.md` | move+rename | 5-sprint lifecycle decisions |

### /docs/products/ferd/planning/_archive/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/planning/archive/DEFERRED_DECISIONS_2026-03-20.md` | `docs/products/ferd/planning/_archive/2026-03-20-DEFERRED_DECISIONS_snapshot.md` | archive | Snapshot, superseded |
| `docs/planning/archive/phase-2-designs/FringeIsland_Journal_System_Design.md` | `docs/products/ferd/planning/_archive/2026-02-JOURNAL_SYSTEM_DESIGN.md` | archive | Phase 2 design, superseded by Journey Designer sessions |
| `docs/planning/archive/phase-2-designs/FringeIsland_Journey_Architecture_v2.md` | `docs/products/ferd/planning/_archive/2026-02-JOURNEY_ARCHITECTURE_V2.md` | archive | Phase 2 architecture, superseded |

### /docs/products/ferd/sessions/

**Active sessions** (already date-prefixed, move as-is or rename for consistency):

| Current Location | New Location | Action |
|------------------|--------------|--------|
| `docs/planning/sessions/2026-02-27-display-name-system.md` | `docs/products/ferd/sessions/2026-02-27-display-name-system.md` | move |
| `docs/planning/sessions/2026-02-27-leave-group-feature-review.md` | `docs/products/ferd/sessions/2026-02-27-leave-group-feature-review.md` | move |
| `docs/planning/sessions/2026-02-28-documentation-restructuring.md` | `docs/products/ferd/sessions/2026-02-28-documentation-restructuring.md` | move |
| `docs/planning/sessions/2026-02-28-lifecycle-roadmap-decisions.md` | `docs/products/ferd/sessions/2026-02-28-lifecycle-roadmap-decisions.md` | move |
| `docs/planning/sessions/2026-02-28-sprint1-foundation-schema.md` | `docs/products/ferd/sessions/2026-02-28-sprint1-foundation-schema.md` | move |
| `docs/planning/sessions/2026-02-28-sprint2-leave-group-core.md` | `docs/products/ferd/sessions/2026-02-28-sprint2-leave-group-core.md` | move |
| `docs/planning/sessions/2026-02-28-sprint3-smart-notifications.md` | `docs/products/ferd/sessions/2026-02-28-sprint3-smart-notifications.md` | move |
| `docs/planning/sessions/2026-03-03-architecture-baseline-live-validation.md` | `docs/products/ferd/sessions/2026-03-03-architecture-baseline-live-validation.md` | move |
| `docs/planning/sessions/2026-03-03-doc-restructuring-overlap-elimination.md` | `docs/products/ferd/sessions/2026-03-03-doc-restructuring-overlap-elimination.md` | move |
| `docs/planning/sessions/2026-03-14-architecture-docs-integration.md` | `docs/products/ferd/sessions/2026-03-14-architecture-docs-integration.md` | move |
| `docs/planning/sessions/2026-03-20-JOURNEY_DESIGNER_SESSION.md` | `docs/products/ferd/sessions/2026-03-20-SESSION-01-journey-designer.md` | move+rename |
| `docs/planning/sessions/2026-03-25-JOURNEY_DESIGNER_SESSION_02_1.md` | `docs/products/ferd/sessions/2026-03-25-SESSION-02-journey-designer.md` | move+rename |
| `docs/planning/sessions/2026-03-27-JOURNEY_DESIGNER_SESSION_03_1.md` | `docs/products/ferd/sessions/2026-03-27-SESSION-03-journey-designer.md` | move+rename |
| `docs/planning/sessions/2026-03-27-JOURNEY_DESIGNER_SESSION_03_BRIDGE.md` | `docs/products/ferd/sessions/2026-03-27-SESSION-03-bridge.md` | move+rename |
| `docs/planning/sessions/2026-03-27-JOURNEY_DESIGNER_SESSION_04_BRIDGE.md` | `docs/products/ferd/sessions/2026-03-27-SESSION-04-bridge.md` | move+rename |
| `docs/planning/sessions/input to claude.md` | `docs/products/ferd/sessions/2026-04-01-input-to-claude.md` | move+rename |

**Claude AI session bridge documents** (committed versions):

| Current Location | New Location | Action |
|------------------|--------------|--------|
| `.../Claude AI session bridge documents/-- SESSION_1_SUMMARY.md` | `docs/products/ferd/sessions/2026-01-SESSION-01-vision-spec-summary.md` | move+rename |
| `.../Claude AI session bridge documents/-- SESSION_2_SUMMARY.md` | `docs/products/ferd/sessions/2026-01-SESSION-02-vision-spec-decisions.md` | move+rename |
| `.../Claude AI session bridge documents/-- SESSION_BRIDGE #1.md` | `docs/products/ferd/sessions/2026-01-SESSION-01-bridge.md` | move+rename |
| `.../Claude AI session bridge documents/-- SESSION_BRIDGE #2.md` | `docs/products/ferd/sessions/2026-01-SESSION-02-bridge.md` | move+rename |
| `.../Claude AI session bridge documents/--SESSION_3_SUMMARY.md` | `docs/products/ferd/sessions/2026-02-SESSION-03-architecture-summary.md` | move+rename |
| `.../Claude AI session bridge documents/--SESSION_BRIDGE_#3.md` | `docs/products/ferd/sessions/2026-02-SESSION-03-bridge.md` | move+rename |
| `.../Claude AI session bridge documents/SESSION_BRIDGE_ARCHITECTURE_4.md` | `docs/products/ferd/sessions/2026-02-SESSION-04-architecture-bridge.md` | move+rename |
| `.../Claude AI session bridge documents/SESSION_SUMMARY_ARCHITECTURE_3.md` | `docs/products/ferd/sessions/2026-02-SESSION-03-architecture-journey-summary.md` | move+rename |

### /docs/products/ferd/sessions/_archive/

**Old/duplicate session bridge drafts:**

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `.../Claude AI session bridge documents/--SESSION_3_SUMMARY_old.md` | `docs/products/ferd/sessions/_archive/2026-02-SESSION-03-architecture-summary-old.md` | archive | Superseded by committed version |
| `.../Claude AI session bridge documents/--SESSION_BRIDGE_#3_old.md` | `docs/products/ferd/sessions/_archive/2026-02-SESSION-03-bridge-old.md` | archive | Superseded by committed version |

**Previously archived session logs (20 files):**

| Current Location | New Location | Action |
|------------------|--------------|--------|
| `docs/planning/sessions/archive/2026-02-08-bug-fix-last-leader-protection.md` | `docs/products/ferd/sessions/_archive/2026-02-08-bug-fix-last-leader-protection.md` | move |
| `docs/planning/sessions/archive/2026-02-08-rls-security-fixes.md` | `docs/products/ferd/sessions/_archive/2026-02-08-rls-security-fixes.md` | move |
| `docs/planning/sessions/archive/2026-02-08-testing-infrastructure.md` | `docs/products/ferd/sessions/_archive/2026-02-08-testing-infrastructure.md` | move |
| `docs/planning/sessions/archive/2026-02-09-bdd-hierarchy.md` | `docs/products/ferd/sessions/_archive/2026-02-09-bdd-hierarchy.md` | move |
| `docs/planning/sessions/archive/2026-02-10-journey-player-and-test-stability.md` | `docs/products/ferd/sessions/_archive/2026-02-10-journey-player-and-test-stability.md` | move |
| `docs/planning/sessions/archive/2026-02-10-journey-tests-and-rls-fixes.md` | `docs/products/ferd/sessions/_archive/2026-02-10-journey-tests-and-rls-fixes.md` | move |
| `docs/planning/sessions/archive/2026-02-11-rbac-design-complete.md` | `docs/products/ferd/sessions/_archive/2026-02-11-rbac-design-complete.md` | move |
| `docs/planning/sessions/archive/2026-02-11-rls-bootstrap-fixes-and-group-deletion.md` | `docs/products/ferd/sessions/_archive/2026-02-11-rls-bootstrap-fixes-and-group-deletion.md` | move |
| `docs/planning/sessions/archive/2026-02-11-security-behavior-docs-and-tests.md` | `docs/products/ferd/sessions/_archive/2026-02-11-security-behavior-docs-and-tests.md` | move |
| `docs/planning/sessions/archive/2026-02-13-agent-system-architecture.md` | `docs/products/ferd/sessions/_archive/2026-02-13-agent-system-architecture.md` | move |
| `docs/planning/sessions/archive/2026-02-16-rbac-bugfixes-and-notifications.md` | `docs/products/ferd/sessions/_archive/2026-02-16-rbac-bugfixes-and-notifications.md` | move |
| `docs/planning/sessions/archive/2026-02-16-rbac-sub-sprint-1.md` | `docs/products/ferd/sessions/_archive/2026-02-16-rbac-sub-sprint-1.md` | move |
| `docs/planning/sessions/archive/2026-02-16-rbac-sub-sprint-2.md` | `docs/products/ferd/sessions/_archive/2026-02-16-rbac-sub-sprint-2.md` | move |
| `docs/planning/sessions/archive/2026-02-16-rbac-sub-sprint-3.md` | `docs/products/ferd/sessions/_archive/2026-02-16-rbac-sub-sprint-3.md` | move |
| `docs/planning/sessions/archive/2026-02-16-rbac-sub-sprint-4.md` | `docs/products/ferd/sessions/_archive/2026-02-16-rbac-sub-sprint-4.md` | move |
| `docs/planning/sessions/archive/2026-02-17-deusex-admin-foundation.md` | `docs/products/ferd/sessions/_archive/2026-02-17-deusex-admin-foundation.md` | move |
| `docs/planning/sessions/archive/2026-02-18-admin-user-actions-specs-and-tests.md` | `docs/products/ferd/sessions/_archive/2026-02-18-admin-user-actions-specs-and-tests.md` | move |
| `docs/planning/sessions/archive/v0.2.7-session-bridge.md` | `docs/products/ferd/sessions/_archive/v0.2.7-session-bridge.md` | move |
| `docs/planning/sessions/archive/v0.2.8-session-bridge.md` | `docs/products/ferd/sessions/_archive/v0.2.8-session-bridge.md` | move |
| `docs/planning/sessions/archive/v0.2.10-session-bridge.md` | `docs/products/ferd/sessions/_archive/v0.2.10-session-bridge.md` | move |

### /docs/products/ferd/development/

**Workflows:**

| Current Location | New Location | Action |
|------------------|--------------|--------|
| `docs/workflows/feature-development.md` | `docs/products/ferd/development/WORKFLOW.md` | move+rename |
| `docs/workflows/boot-up.md` | `docs/products/ferd/development/BOOT_UP.md` | move+rename |
| `docs/workflows/close-down.md` | `docs/products/ferd/development/CLOSE_DOWN.md` | move+rename |
| `docs/workflows/doc-health-check.md` | `docs/products/ferd/development/DOC_HEALTH_CHECK.md` | move+rename |

### /docs/products/ferd/development/_archive/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/planning/archive/PLANNING_DOCS_GUIDE.md` | `docs/products/ferd/development/_archive/2026-02-28-PLANNING_DOCS_GUIDE.md` | archive | Superseded by new structure |
| `docs/planning/archive/STRUCTURE_MIGRATION_PLAN.md` | `docs/products/ferd/development/_archive/2026-02-09-STRUCTURE_MIGRATION_PLAN.md` | archive | Old migration plan, completed |
| `docs/planning/archive/STRUCTURE_REVIEW.md` | `docs/products/ferd/development/_archive/2026-02-09-STRUCTURE_REVIEW.md` | archive | Old review, completed |

### /docs/products/ferd/development/agents/

| Current Location | New Location | Action |
|------------------|--------------|--------|
| `docs/agents/README.md` | `docs/products/ferd/development/agents/README.md` | move |
| `docs/agents/contexts/architect-agent.md` | `docs/products/ferd/development/agents/contexts/architect-agent.md` | move |
| `docs/agents/contexts/database-agent.md` | `docs/products/ferd/development/agents/contexts/database-agent.md` | move |
| `docs/agents/contexts/integration-agent.md` | `docs/products/ferd/development/agents/contexts/integration-agent.md` | move |
| `docs/agents/contexts/qa-agent.md` | `docs/products/ferd/development/agents/contexts/qa-agent.md` | move |
| `docs/agents/contexts/sprint-agent.md` | `docs/products/ferd/development/agents/contexts/sprint-agent.md` | move |
| `docs/agents/contexts/test-agent.md` | `docs/products/ferd/development/agents/contexts/test-agent.md` | move |
| `docs/agents/contexts/ui-agent.md` | `docs/products/ferd/development/agents/contexts/ui-agent.md` | move |
| `docs/agents/learnings/architecture.md` | `docs/products/ferd/development/agents/learnings/architecture.md` | move |
| `docs/agents/learnings/database.md` | `docs/products/ferd/development/agents/learnings/database.md` | move |
| `docs/agents/learnings/integration.md` | `docs/products/ferd/development/agents/learnings/integration.md` | move |
| `docs/agents/learnings/qa.md` | `docs/products/ferd/development/agents/learnings/qa.md` | move |
| `docs/agents/learnings/sprints.md` | `docs/products/ferd/development/agents/learnings/sprints.md` | move |
| `docs/agents/learnings/testing.md` | `docs/products/ferd/development/agents/learnings/testing.md` | move |
| `docs/agents/learnings/ui.md` | `docs/products/ferd/development/agents/learnings/ui.md` | move |

### /docs/products/ferd/development/agents/_archive/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/agents/contexts/archive/feature-agent.md` | `docs/products/ferd/development/agents/_archive/2026-02-13-feature-agent.md` | archive | Replaced by Integration Agent |

### /docs/products/ferd/development/specs/

| Current Location | New Location | Action |
|------------------|--------------|--------|
| `docs/specs/behaviors/_template.md` | `docs/products/ferd/development/specs/_template.md` | move |
| `docs/specs/behaviors/admin.md` | `docs/products/ferd/development/specs/admin.md` | move |
| `docs/specs/behaviors/authentication.md` | `docs/products/ferd/development/specs/authentication.md` | move |
| `docs/specs/behaviors/communication.md` | `docs/products/ferd/development/specs/communication.md` | move |
| `docs/specs/behaviors/d15-hardening.md` | `docs/products/ferd/development/specs/d15-hardening.md` | move |
| `docs/specs/behaviors/display-name.md` | `docs/products/ferd/development/specs/display-name.md` | move |
| `docs/specs/behaviors/groups.md` | `docs/products/ferd/development/specs/groups.md` | move |
| `docs/specs/behaviors/invitations.md` | `docs/products/ferd/development/specs/invitations.md` | move |
| `docs/specs/behaviors/journeys.md` | `docs/products/ferd/development/specs/journeys.md` | move |
| `docs/specs/behaviors/messaging.md` | `docs/products/ferd/development/specs/messaging.md` | move |
| `docs/specs/behaviors/notifications.md` | `docs/products/ferd/development/specs/notifications.md` | move |
| `docs/specs/behaviors/platform-exit.md` | `docs/products/ferd/development/specs/platform-exit.md` | move |
| `docs/specs/behaviors/rbac.md` | `docs/products/ferd/development/specs/rbac.md` | move |
| `docs/specs/behaviors/roles.md` | `docs/products/ferd/development/specs/roles.md` | move |
| `docs/specs/behaviors/security.md` | `docs/products/ferd/development/specs/security.md` | move |

### /docs/products/ferd/development/features/ (with FR-/AR-/NF- prefixes)

| Current Location | New Location | Action |
|------------------|--------------|--------|
| `docs/features/implemented/authentication.md` | `docs/products/ferd/development/features/FR-authentication.md` | move+rename |
| `docs/features/implemented/direct-messaging.md` | `docs/products/ferd/development/features/FR-direct-messaging.md` | move+rename |
| `docs/features/implemented/display-name-system.md` | `docs/products/ferd/development/features/FR-display-name-system.md` | move+rename |
| `docs/features/implemented/enhanced-member-invitations.md` | `docs/products/ferd/development/features/FR-enhanced-member-invitations.md` | move+rename |
| `docs/features/implemented/group-forum-system.md` | `docs/products/ferd/development/features/FR-group-forum-system.md` | move+rename |
| `docs/features/implemented/group-management.md` | `docs/products/ferd/development/features/FR-group-management.md` | move+rename |
| `docs/features/implemented/journey-system.md` | `docs/products/ferd/development/features/FR-journey-system.md` | move+rename |
| `docs/features/implemented/leave-group-core.md` | `docs/products/ferd/development/features/FR-leave-group-core.md` | move+rename |
| `docs/features/implemented/notification-system.md` | `docs/products/ferd/development/features/FR-notification-system.md` | move+rename |
| `docs/features/implemented/platform-exit.md` | `docs/products/ferd/development/features/FR-platform-exit.md` | move+rename |
| `docs/features/implemented/d15-universal-group-pattern-migration.md` | `docs/products/ferd/development/features/AR-d15-universal-group-pattern-migration.md` | move+rename |
| `docs/features/implemented/deusex-admin-foundation.md` | `docs/products/ferd/development/features/AR-deusex-admin-foundation.md` | move+rename |
| `docs/features/implemented/dynamic-permissions-system.md` | `docs/products/ferd/development/features/AR-dynamic-permissions-system.md` | move+rename |
| `docs/features/implemented/foundation-schema.md` | `docs/products/ferd/development/features/AR-foundation-schema.md` | move+rename |
| `docs/features/implemented/smart-notifications.md` | `docs/products/ferd/development/features/AR-smart-notifications.md` | move+rename |
| `docs/features/implemented/performance-optimization.md` | `docs/products/ferd/development/features/NF-performance-optimization.md` | move+rename |

### /docs/products/ferd/development/features/_archive/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/archive/leave_group_feature_review.md` | `docs/products/ferd/development/features/_archive/2026-02-27-leave-group-feature-review.md` | archive | Superseded design discussion |

---

## Implementation Tier

### /docs/implementation/shared/

| Current Location | New Location | Action |
|------------------|--------------|--------|
| `docs/architecture/DATABASE_SCHEMA.md` | `docs/implementation/shared/DATABASE_CURRENT.md` | move+rename |
| `docs/architecture/AUTHORIZATION.md` | `docs/implementation/shared/AUTH_SYSTEM.md` | move+rename |
| `docs/database/rls-policies.md` | `docs/implementation/shared/RLS_POLICIES.md` | move+rename |
| `docs/database/schema-overview.md` | `docs/implementation/shared/SCHEMA_OVERVIEW.md` | move+rename |
| `docs/database/migrations-log.md` | `docs/implementation/shared/MIGRATIONS_LOG.md` | move+rename |

### /docs/implementation/shared/_archive/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/database/schema-export-pre-d15.md` | `docs/implementation/shared/_archive/2026-02-22-schema-export-pre-d15.md` | archive | Pre-D15 snapshot, historical only |

### /docs/implementation/ferd/baseline/

| Current Location | New Location | Action |
|------------------|--------------|--------|
| `docs/architecture/ARCHITECTURE_BASELINE.md` | `docs/implementation/ferd/baseline/BASELINE.md` | move+rename |
| `docs/planning/ACTUAL_STATE.md` | `docs/implementation/ferd/baseline/ACTUAL_STATE.md` | move |
| `docs/implementation/AUTH_IMPLEMENTATION.md` | `docs/implementation/ferd/baseline/AUTH_IMPLEMENTATION.md` | move |
| `docs/implementation/AUTH_IMPLEMENTATION_SUMMARY.md` | `docs/implementation/ferd/baseline/AUTH_IMPLEMENTATION_SUMMARY.md` | move |
| `docs/implementation/INSTALLATION.md` | `docs/implementation/ferd/baseline/INSTALLATION.md` | move |
| (new) | `docs/implementation/ferd/baseline/REFERENCES_SHARED.md` | create |

### /docs/implementation/ferd/baseline/_archive/

| Current Location | New Location | Action | Rationale |
|------------------|--------------|--------|-----------|
| `docs/architecture/archive/ARCHITECTURE_BASELINE_LEGACY.md` | `docs/implementation/ferd/baseline/_archive/2026-03-03-ARCHITECTURE_BASELINE_LEGACY.md` | archive | 84 KB legacy baseline, superseded |

### /docs/implementation/ferd/status/

| Current Location | New Location | Action |
|------------------|--------------|--------|
| `DASHBOARD.md` | `docs/implementation/ferd/status/DASHBOARD.md` | move |
| (new) | `docs/implementation/ferd/status/KANBAN.md` | create |

### /docs/implementation/ferd/changelog/

CHANGELOG.md stays at repo root (DP-1). This folder holds a link or supplementary migration guides.

### /docs/implementation/ferd/testing/

No files to move here yet. Behavior specs are in `development/specs/`. This folder is for future test results and coverage reports.

---

## Root Files (stay at root, update paths)

| File | Action | Notes |
|------|--------|-------|
| `CLAUDE.md` | **rewrite** | Complete document map rewrite with new paths |
| `README.md` | **rewrite** | Add documentation structure section |
| `CHANGELOG.md` | **stay** | Conventional root location |
| `PROJECT_STATUS.md` | **stay + update** | Update Quick Context Links paths |
| `SPRINT.md` | **stay + update** | Update Related section paths |

---

## Delete (empty placeholders)

| Current Location | Rationale |
|------------------|-----------|
| `docs/-- design-system/-- README.md` | Empty 0 KB placeholder |
| `docs/-- design-system/-- components.md` | Empty 0 KB placeholder |
| `docs/-- design-system/-- foundations.md` | Empty 0 KB placeholder |
| `docs/-- design-system/-- guidelines.md` | Empty 0 KB placeholder |
| `docs/-- design-system/-- patterns.md` | Empty 0 KB placeholder |

Design system concept preserved in ADR-U013.

---

## Not Mapped (handled separately)

| File | Reason |
|------|--------|
| `docs/INDEX.md` | **Rewritten** in place as three-tier navigation hub |
| `docs/DOCS_INVENTORY.md` | Generated by this session — delete or archive after migration |
| `docs/refactor_docs/*` | Planning artifacts — archive entire folder after migration completes |

---

## Navigation INDEX Files to Create (26 total)

| Location | Purpose |
|----------|---------|
| `docs/INDEX.md` | Rewrite: three-tier navigation hub |
| `docs/universe/INDEX.md` | Universe tier overview |
| `docs/universe/vision/INDEX.md` | Vision docs |
| `docs/universe/strategy/INDEX.md` | Strategy docs |
| `docs/universe/architecture/INDEX.md` | Architecture docs |
| `docs/universe/research/INDEX.md` | Research collections |
| `docs/universe/decisions/INDEX.md` | Universe ADRs (22) |
| `docs/products/INDEX.md` | Products tier overview |
| `docs/products/ferd/INDEX.md` | Ferd product hub |
| `docs/products/ferd/specification/INDEX.md` | Spec docs |
| `docs/products/ferd/architecture/INDEX.md` | Ferd architecture |
| `docs/products/ferd/architecture/decisions/INDEX.md` | Ferd ADRs |
| `docs/products/ferd/planning/INDEX.md` | Planning docs |
| `docs/products/ferd/sessions/INDEX.md` | Session logs |
| `docs/products/ferd/development/INDEX.md` | Development hub |
| `docs/products/ferd/development/agents/INDEX.md` | Agent system |
| `docs/products/ferd/development/specs/INDEX.md` | Behavior specs |
| `docs/products/ferd/development/features/INDEX.md` | Feature docs (grouped by FR/AR/NF) |
| `docs/implementation/INDEX.md` | Implementation tier overview |
| `docs/implementation/shared/INDEX.md` | Shared infrastructure |
| `docs/implementation/ferd/INDEX.md` | Ferd implementation |
| `docs/implementation/ferd/baseline/INDEX.md` | Baseline docs |
| `docs/implementation/ferd/status/INDEX.md` | Status tracking |
| `docs/implementation/ferd/changelog/INDEX.md` | Changelog |
| `docs/implementation/ferd/testing/INDEX.md` | Testing |

---

## Distributed _archive/ Folders (10 total)

| Archive Location | Contents |
|---|---|
| `docs/universe/architecture/_archive/` | 1 file (completed task plan) |
| `docs/universe/decisions/_archive/` | 2 files (monolithic ADR file + legacy ADR doc) |
| `docs/products/ferd/specification/_archive/` | 1 file (feature inventory handoff) |
| `docs/products/ferd/planning/_archive/` | 3 files (deferred snapshot + 2 phase-2 designs) |
| `docs/products/ferd/sessions/_archive/` | 22 files (20 archived sessions + 2 old bridge drafts) |
| `docs/products/ferd/development/_archive/` | 3 files (old process docs) |
| `docs/products/ferd/development/agents/_archive/` | 1 file (retired feature agent) |
| `docs/products/ferd/development/features/_archive/` | 1 file (leave group design discussion) |
| `docs/implementation/shared/_archive/` | 1 file (pre-D15 schema snapshot) |
| `docs/implementation/ferd/baseline/_archive/` | 1 file (legacy baseline 84 KB) |

**Total archived files: 35**

---

## Folders to Create (40 total)

```
docs/universe/
docs/universe/vision/
docs/universe/strategy/
docs/universe/architecture/
docs/universe/architecture/_archive/
docs/universe/research/
docs/universe/research/human-flourishing/
docs/universe/research/theory-u/
docs/universe/research/adult-development/
docs/universe/decisions/
docs/universe/decisions/_archive/
docs/products/
docs/products/ferd/
docs/products/ferd/specification/
docs/products/ferd/specification/_archive/
docs/products/ferd/architecture/
docs/products/ferd/architecture/decisions/
docs/products/ferd/planning/
docs/products/ferd/planning/_archive/
docs/products/ferd/sessions/
docs/products/ferd/sessions/_archive/
docs/products/ferd/development/
docs/products/ferd/development/_archive/
docs/products/ferd/development/agents/
docs/products/ferd/development/agents/contexts/
docs/products/ferd/development/agents/learnings/
docs/products/ferd/development/agents/_archive/
docs/products/ferd/development/specs/
docs/products/ferd/development/features/
docs/products/ferd/development/features/_archive/
docs/implementation/shared/
docs/implementation/shared/_archive/
docs/implementation/ferd/
docs/implementation/ferd/baseline/
docs/implementation/ferd/baseline/_archive/
docs/implementation/ferd/status/
docs/implementation/ferd/changelog/
docs/implementation/ferd/testing/
```

---

## Summary Statistics (v2)

| Metric | Count |
|--------|-------|
| Files moved (simple) | 56 |
| Files moved + renamed | 41 |
| Files extracted (ADR split) | 23 |
| Files archived (distributed) | 35 |
| Files deleted | 5 |
| Files staying at root (updated) | 5 |
| INDEX files created | 26 |
| Content files created | 2 (KANBAN, REFERENCES_SHARED) |
| New folders created | 38 |
| Old folders deleted | 15 |
| Cross-reference updates | ~200-300 links |
