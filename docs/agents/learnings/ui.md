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

### 2026-02-20: Admin action modals — three modal patterns for different action types
1. **ConfirmModal** — for destructive/irreversible actions (deactivate, delete, logout). Shows warning, requires explicit click.
2. **Form modals** (NotifyModal, MessageModal) — for compose-and-send actions. Include form validation, loading spinner, error display within modal.
3. **Picker modals** (GroupPickerModal) — for selection-then-action flows. Searchable list, selected highlight, mode-dependent button colors (red for remove, blue for invite/join).

Key pattern: GroupPickerModal uses a single component with 3 modes (`invite`/`join`/`remove`) via `MODE_CONFIG` record. For `remove` mode, it computes the intersection of groups shared by ALL selected users. This is better than 3 separate modals.
> Promoted to playbook? Not yet

### 2026-02-20: Status message banner pattern for admin actions
Instead of toast libraries or alert(), use a state-driven banner: `statusMessage: { type: 'success' | 'error', text: string } | null`. Auto-clear with `setTimeout` (5s) in a `useEffect`, plus a dismiss button. Shows above the main content area. Green for success, red for error, with border for subtle distinction. This is simpler than a toast system and works well for admin panels.
> Promoted to playbook? Not yet

### 2026-02-20: refreshTrigger pattern for parent-controlled data re-fetch
When a parent component performs an action that changes data displayed by a child, pass a `refreshTrigger: number` prop that the parent increments after each mutation. The child includes this in its `useCallback` dependency array. This is cleaner than exposing a `refresh()` method via ref and works naturally with React's re-render cycle.
> Promoted to playbook? Not yet

<!-- Append new entries below this line -->
