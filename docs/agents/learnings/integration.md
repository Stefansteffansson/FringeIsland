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

### 2026-02-20: DM find-or-create pattern with sorted participant IDs
The `conversations` table has a CHECK constraint: `participant_1 < participant_2` (lexicographic UUID comparison). When creating admin DMs, sort the two UUIDs before querying or inserting. Pattern: `const p1 = adminId < targetId ? adminId : targetId; const p2 = adminId < targetId ? targetId : adminId;`. Then query `.eq('participant_1', p1).eq('participant_2', p2)` and use `.maybeSingle()` since conversation may not exist yet.
> Promoted to playbook? Not yet

### 2026-02-20: Admin join-group requires explicit Member role assignment
When directly inserting a membership with `status: 'active'` (bypassing the invitation flow), the `assign_member_role_on_accept` trigger does NOT fire because it only activates on UPDATE (invited→active), not INSERT. The admin join handler must explicitly look up the Member role for the group and insert into `user_group_roles`. This is a known gap between the invitation flow and the admin direct-add flow.
> Promoted to playbook? Not yet

### 2026-02-20: Admin remove-from-group requires deleting roles before memberships
Due to FK constraints, `user_group_roles` has a foreign key to `group_memberships` (indirectly via user_id + group_id). Always delete from `user_group_roles` first, then from `group_memberships`. The `prevent_last_leader_removal` trigger may block the role deletion if the user is the last Steward — handle this gracefully and skip the membership deletion for that user.
> Promoted to playbook? Not yet

### 2026-02-20: Audit log metadata field naming matters for test compatibility
DB test suites assert specific metadata keys. The generic `writeAuditLog` helper uses `{ count }` but the message-send tests expect `{ user_count }`. When wiring actions, always check the corresponding test file for expected metadata shape. Custom audit entries may be needed rather than using a generic helper.
> Promoted to playbook? Not yet

### 2026-02-20: Unstable callback references cause infinite re-render loops in data panels
When passing state-setter callbacks as props to child components that include them in useCallback/useEffect dependency arrays, ALWAYS wrap the parent's handler in useCallback. Without this, every parent render creates a new function reference → child's fetchData recreates → useEffect fires → child calls onDataChange → parent re-renders → infinite loop. This affected AdminDataPanel receiving handleUsersDataChange, handleSelectionChange, and handleShowDecommissionedChange from the admin page.
> Promoted to playbook? Not yet

### 2026-02-20: Supabase `{ count: 'exact' }` can be inlined with the data query
Instead of firing a separate HEAD-only count query + a data query (2 HTTP requests), use `.select('columns', { count: 'exact' }).range(from, to)` to get both rows AND total count in a single request. This halves the network round-trips for paginated views.
> Promoted to playbook? Not yet

### 2026-02-20: Prefetch adjacent pages for instant pagination
After loading page N, silently fire background fetches for page N+1 and N-1. Store in a Map ref keyed by (cardType, page, search, filters). Clear cache when filters change. On page navigation, check cache first — if hit, render instantly with zero network wait.
> Promoted to playbook? Not yet

### 2026-02-20: User profile ID resolution runs 4-7 times per page load
The query `users.select('id').eq('auth_user_id', user.id)` is independently executed by MessagingContext, NotificationContext, Navigation, the page component, usePermissions, and ForumSection. Should be resolved once in AuthContext and shared via hook. See performance-optimization.md Tier 1C.
> Promoted to playbook? Not yet

<!-- Append new entries below this line -->
