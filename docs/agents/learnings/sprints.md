# Sprint Agent — Learning Journal

**Purpose:** Running log of process insights, planning patterns, and retrospective outcomes.
**Curated by:** Sprint Agent (self) during retrospectives
**Promotion:** Confirmed process patterns → `docs/agents/contexts/sprint-agent.md` (playbook)

---

## Entries

### 2026-02-16: RBAC Sub-Sprint 4 completed full TDD cycle successfully
Full workflow: 8 behavior specs → 47 tests (15 RED) → design → 2 migrations → fix nested RLS → all GREEN → 2x QA runs. The nested RLS issue was caught by tests (not manual testing), validating the TDD approach. Session continued from context compaction mid-stream — no data loss. Total RBAC: 4 sub-sprints, 25 behaviors, ~110 tests, 7 migrations.
> Promoted to playbook? Not yet

### 2026-02-13: Journal initialized
Sprint process established. Key insights from project history:
- XL tasks (like RBAC design) should be split across sessions with checkpoints
- Boot-up/close-down workflows prevent context loss between sessions
- Session bridges in docs/planning/sessions/ provide continuity
- MEMORY.md must stay under 150 lines (200-line system limit minus buffer)

→ Promoted to playbook? ✅ (all in Sprint Workflow + Scope Management)

### 2026-02-16: Write Tests vs Run Tests split (workflow improvement)
- Separating "write tests" (Phase 2) from "run tests to confirm RED" (Phase 3) caught a real insight: UI migration tests pass immediately (GREEN) because the infrastructure already exists. This is correct and expected for migration sub-sprints — the tests serve as safety nets, not TDD in the classical sense.
- Updated both `docs/workflows/feature-development.md` and `docs/agents/contexts/sprint-agent.md` with the split. The workflow now has 7 phases (was 6).
→ Promoted to playbook? ✅ (already applied to sprint-agent.md and feature-development.md)

---

### 2026-02-14: CRITICAL — TDD ordering violation in Sprint 1.5-A

**What happened:** Sprint Agent ordered tasks with Tests last (Task 10, blocked by all implementation). This resulted in test-after development, NOT TDD. Tests ran against a fully implemented system — no RED phase, no failing tests driving implementation.

**Actual order:** Architect → Database → UI → Integration → Tests (WRONG)
**Correct order:** Feature doc → Behaviors → Tests (RED) → Architect → Database/UI/Integration (GREEN) → Refactor

**Root cause:** Sprint Agent treated tests as "verification at the end" rather than "specification before implementation." The dependency graph had tests blocked by implementation tasks, inverting the TDD cycle.

**MANDATORY RULE — TDD ordering for ALL future sprints:**
1. Feature doc (verify in Product Spec, create/update feature doc)
2. Behavior specs (B-XXX-NNN in docs/specs/behaviors/)
3. Integration tests written and run — MUST FAIL (RED)
4. THEN Architect designs schema/system
5. THEN Database Agent implements migrations
6. THEN UI + Integration Agents build and wire
7. Tests run again — MUST PASS (GREEN)
8. Refactor, document

**The Test Agent runs SECOND (after feature context), not LAST.**

→ Promoted to playbook? MUST PROMOTE — this is a critical process rule.

---

<!-- Append new entries below this line -->
