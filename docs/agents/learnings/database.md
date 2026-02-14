# Database Agent — Learning Journal

**Purpose:** Running log of schema, migration, and RLS discoveries.
**Curated by:** Sprint Agent during retrospectives
**Promotion:** Confirmed patterns → `docs/agents/contexts/database-agent.md` (playbook)

---

## Entries

### 2026-02-13: Journal initialized
Starting point. Known patterns captured in playbook from prior sessions:
- Always set search_path = '' on public functions
- PostgREST INSERT...RETURNING triggers SELECT policy
- Catalog tables need explicit SELECT USING (true)
- SECURITY DEFINER for helper functions, never for data-modifying functions
- Nested RLS: use SECURITY DEFINER to bypass inner checks

→ Promoted to playbook? ✅ (all in existing playbook)

---

<!-- Append new entries below this line -->
