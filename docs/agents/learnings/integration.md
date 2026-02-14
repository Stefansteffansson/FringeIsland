# Integration Agent — Learning Journal

**Purpose:** Running log of discoveries about data flow, queries, state management, and wiring.
**Curated by:** Sprint Agent during retrospectives
**Promotion:** Confirmed patterns → `docs/agents/contexts/integration-agent.md` (playbook)

---

## Entries

### 2026-02-13: Journal initialized
Starting point. Known patterns captured in playbook from prior sessions:
- Always refetch after mutations (state can diverge from DB)
- Update ALL related state after role changes (members + userRoles + isLeader)
- .maybeSingle() vs .single() — wrong choice causes crashes
- Supabase returns plural table names in joins, components often expect singular
- PostgREST error codes: PGRST116 (no rows), 23505 (unique), 42501 (RLS)

→ Promoted to playbook? ✅ (all in Core Patterns + Critical Rules)

---

<!-- Append new entries below this line -->
