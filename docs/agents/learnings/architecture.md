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

### 2026-02-20: Group detail page has 18 HTTP requests with 8 sequential on critical path
Full waterfall: Auth(1) + MessagingCtx(2) + NotificationCtx(2) + Navigation(3) + usePermissions(2) + Page(8 sequential). The page's 8 queries include 3 redundant ones (membership check derivable from all-members query, count derivable from result length, user's roles derivable from all-roles query). Can be reduced to 3 parallel steps by eliminating redundancies and parallelizing independent queries. See performance-optimization.md Tier 2A.
> Promoted to playbook? Not yet

### 2026-02-20: Admin queries should use service_role to bypass RLS entirely
The standard Supabase pattern for admin dashboards is a server-side API route that validates admin status once, then queries with the service_role client (bypasses all RLS). This eliminates the per-row has_permission() tax. The client calls the API route instead of Supabase directly. Security is maintained at the route level, not the row level.
> Promoted to playbook? Not yet

### 2026-02-20: N+1 query patterns on list pages — batch with RPCs
My Groups page fires one count query per group for member counts. Solution: create a SECURITY DEFINER RPC that takes an array of group IDs and returns counts via GROUP BY. One HTTP request replaces N. Same pattern applies anywhere a loop issues per-item queries.
> Promoted to playbook? Not yet

<!-- Append new entries below this line -->
