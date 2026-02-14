# Architect Agent — Learning Journal

**Purpose:** Running log of design discoveries, pattern insights, and architectural lessons.
**Curated by:** Sprint Agent during retrospectives
**Promotion:** Confirmed patterns → `docs/agents/contexts/architect-agent.md` (playbook)

---

## Entries

### 2026-02-13: Journal initialized
Starting point. Known patterns captured in playbook from prior sessions:
- Nested RLS requires SECURITY DEFINER escape hatch
- CASCADE vs RESTRICT vs SET NULL decisions matter
- JSONB for flexible content, normalized tables for queryable data
- Migration ordering (functions before policies)
- Always set search_path = '' on public functions

→ Promoted to playbook? ✅ (all in Known Pitfalls + Architecture Patterns)

### 2026-02-11: RBAC design complete (D1-D22)
22 decisions documented. Key architectural insight: universal group pattern
(everything is a group) simplifies permissions dramatically but requires
careful migration from current user-centric memberships.
Migration risk: group_memberships.user_id → member_group_id is a breaking change.
Plan: parallel run with feature flag, not big-bang migration.

→ Promoted to playbook? ✅ (referenced in Current System Map)

---

<!-- Append new entries below this line -->
