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

### 2026-02-16: Move role assignment from client to DB trigger for invitation acceptance
Client-side INSERT into `user_group_roles` after accepting an invitation fails because the newly-accepted member has no `assign_roles` permission. The bootstrap RLS case only helps during group creation (when no Steward exists). For invitation acceptance, use a database trigger (AFTER UPDATE on `group_memberships`) that auto-assigns the Member role. This is more reliable and doesn't require the client to know about role IDs.
> Promoted to playbook? Not yet

### 2026-02-16: Group creation needs multiple SECURITY DEFINER functions working together
Group creation involves a chain: INSERT group → INSERT membership → INSERT group_roles → trigger copies template permissions → INSERT user_group_roles. Each step has RLS policies that assume prior steps are complete. The bootstrap pattern requires: (1) `is_group_creator()` SECURITY DEFINER helper, (2) bootstrap case in group_roles INSERT policy, (3) `copy_template_permissions` trigger as SECURITY DEFINER, (4) bootstrap case in user_group_roles INSERT policy. Missing any link breaks the chain.
> Promoted to playbook? Not yet

<!-- Append new entries below this line -->
