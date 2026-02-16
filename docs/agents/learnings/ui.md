# UI Agent — Learning Journal

**Purpose:** Running log of component, styling, and UX discoveries.
**Curated by:** Sprint Agent during retrospectives
**Promotion:** Confirmed patterns → `docs/agents/contexts/ui-agent.md` (playbook)

---

## Entries

### 2026-02-13: Journal initialized
Starting point. Known patterns captured in playbook from prior sessions:
- Always use ConfirmModal, never browser alert()/confirm()
- Always show loading states during async operations
- Responsive design: mobile-first with sm:/md:/lg: breakpoints
- Empty states need helpful messages, not blank space
- ErrorBoundary wraps components; try/catch for async + event handlers

→ Promoted to playbook? ✅ (all in existing playbook)

### 2026-02-16: Permission-gated UI pattern (RBAC Sub-Sprint 3)
- When migrating access control from boolean flags (isLeader) to permission hooks (usePermissions), rename props to reflect the *capability* not the *role*. E.g. `isLeader` → `canModerate` in ForumPost, not `hasModeratePermission`.
- Always wait for `permissionsLoading` before rendering access-denied states — prevents flash of "Access Denied" while permissions load.
- ForumSection owns its own `usePermissions` call rather than receiving a boolean prop — each component that needs permissions should call the hook internally rather than threading booleans through the tree.
- When gating the Danger Zone (delete group), use a *separate* permission (`delete_group`) from the edit page access gate (`edit_group_settings`) — not all editors should be able to delete.
→ Promoted to playbook? Not yet

---

<!-- Append new entries below this line -->
