# UI Agent — Learning Journal

**Purpose:** Running log of component, styling, and UX discoveries.
**Curated by:** Sprint Agent during retrospectives
**Promotion:** Confirmed patterns → `docs/agents/contexts/ui-agent.md` (playbook)

---

## Entries

### 2026-02-16: PermissionPicker anti-escalation UX
The PermissionPicker component disables checkboxes for permissions the user doesn't hold, with a tooltip "You don't hold this permission". This enforces anti-escalation at the UI level (RLS also enforces it at the DB level). Category accordion with auto-expand for categories with selected permissions provides good UX for 42+ permissions.
> Promoted to playbook? Not yet

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

### 2026-02-16: Self-lockout warning must be in footer, not scrollable content
When editing role permissions in a modal, a "you will lose access" warning shown at the TOP of the scrollable content is invisible when the user is scrolled down to the permission checkboxes. Move warnings to the footer area (below the scroll container, always visible). Use a two-button footer pattern: "Go Back" (secondary) and "Save Anyway" (amber) that replaces the normal Cancel/Save buttons.
> Promoted to playbook? Not yet

### 2026-02-16: AssignRoleModal anti-escalation filtering
The AssignRoleModal now receives `userPermissions: string[]` and fetches each candidate role's permissions from `group_role_permissions` joined with `permissions`. Roles where the user doesn't hold all permissions are filtered out. This prevents the user from seeing roles they can't assign (DB-level RLS would also block it, but the UI should not offer invalid options).
> Promoted to playbook? Not yet

### 2026-02-16: Notifications should be self-contained, not navigate elsewhere
Notification clicks should only mark as read, not navigate to other pages. If a referenced entity (e.g., a deleted group) no longer exists, navigation causes 404 errors. Keep notifications informational. If full content can't fit in the dropdown, consider a modal — but don't auto-navigate.
> Promoted to playbook? Not yet

### 2026-02-16: Notification dropdown — show unread first
When sorting notifications, always put unread items first, then read items. Without this, unread notifications can be hidden below the fold (visible limit of ~10-15 items), causing the badge count to not match what the user sees.
> Promoted to playbook? Not yet

<!-- Append new entries below this line -->
