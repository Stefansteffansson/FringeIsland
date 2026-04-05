# Dynamic Permissions System

**Status:** ✅ Implemented (v0.2.16–v0.2.20) — Design reference retained
**Created:** February 11, 2026
**Last Updated:** February 27, 2026 (moved to implemented; RBAC shipped across 4 sub-sprints)
**Related:** [PRODUCT_SPEC](../../specification/PRODUCT_SPEC.md) | [ROADMAP](../../planning/ROADMAP.md) | [DEFERRED](../../planning/DEFERRED.md)

---

## Purpose

FringeIsland currently enforces access control through **hardcoded role name checks** in the UI (e.g., `group_roles.name === 'Group Leader'`) and coarse RLS policies in the database. This works for the MVP but creates several problems:

1. **Rigid** — Adding a new role or tweaking what a role can do requires code changes.
2. **Fragile** — Permission logic is scattered across components, not centralized.
3. **Not user-configurable** — Stewards can't customize what their Guides or Members can do.
4. **Inconsistent** — The database already has `permissions`, `role_template_permissions`, and `group_role_permissions` tables, but they are **not wired up at runtime**. Checks are done by role name, not by permission lookup.

This document captures the **complete activity inventory** of the system and lays the groundwork for replacing hardcoded checks with a **dynamic, database-driven permission system** where roles are defined by the set of permissions they hold.

---

## What is RBAC?

**Role-Based Access Control (RBAC)** is a model where:

- **Users** are assigned **Roles** (within a context, e.g., a group).
- **Roles** are assigned **Permissions** (discrete, granular actions).
- Access decisions are made by checking: _"Does this user have a role that grants permission X in context Y?"_

This replaces checking _"Is this user a Group Leader?"_ with checking _"Does this user have the `members.invite` permission in this group?"_ — which is more flexible and future-proof.

### Three-Layer Architecture (KEY DESIGN DECISION)

The RBAC system has three distinct layers, each with different rules about what is static vs. dynamic:

#### Layer 1: Permissions (the atoms) — SYSTEM-DEFINED, NOT DYNAMIC

Permissions represent actual enforced code paths in the application. `invite_members` exists because there's a UI button, a Supabase insert, and an RLS policy behind it. A permission only makes sense if the application knows how to check and enforce it.

**Users cannot create new permissions.** There is no code path behind a user-invented `do_magic_thing`. New permissions emerge **only** when developers build new features (e.g., Phase 1.5 adds communication → `moderate_forum` becomes enforceable).

The `permissions` table is a **system catalog** that grows with the codebase, not with user actions.

#### Layer 2: Roles (named bundles) — DYNAMIC, GROUP-SCOPED

Group Leaders can create **custom roles** beyond the 5 system templates. A leadership cohort might need a "Mentor" role. A corporate group might need "Department Head".

The schema already supports this — `group_roles.created_from_role_template_id` is **nullable**, so a role can exist without originating from a template.

Roles are scoped to a group. Group #42's "Mentor" role is independent of Group #99's "Mentor" role.

#### Layer 3: Permission Sets (role → permissions mapping) — DYNAMIC, GROUP-SCOPED

When a Group Leader creates or customizes a role, they select which permissions from the system catalog that role should grant. This is the core of RBAC flexibility.

The `group_role_permissions` junction table stores this: _"In Group #42, the 'Mentor' role grants `view_member_list`, `view_others_progress`, and `provide_feedback_to_members`."_

#### How the Three Layers Interact

```
LAYER 1: System-Defined        LAYER 2: Group-Defined           LAYER 3: User-Assigned
(developers)                   (Group Leaders)                  (Group Leaders)
────────────────────           ─────────────────────            ──────────────────────

permissions                    group_roles                      user_group_roles
┌──────────────────┐           ┌──────────────────────┐         ┌──────────────────┐
│ invite_members   │──────┐    │ "Mentor" (Group #42) │         │ Alice → Mentor   │
│ remove_members   │──┐   ├──>│   invite_members: ✗  │         │ Bob   → Guide    │
│ view_member_list │──┼───┤    │   view_members:   ✓  │         │ Carol → Mentor   │
│ assign_roles     │  │   │    │   view_progress:  ✓  │         └──────────────────┘
│ view_progress    │──┼───┘    │   give_feedback:  ✓  │
│ give_feedback    │──┘        └──────────────────────┘
│ ...30+ more      │
└──────────────────┘           Customized permission set
                               per group role
Grows ONLY when new
features are built
```

#### Template-to-Instance Flow

When a group is created, roles are instantiated from templates. After instantiation, the group's role is **independent** — the Group Leader can customize it without affecting other groups or the original template.

```
role_template ("Group Leader Template")
    │
    │  has default permissions via role_template_permissions
    │
    ▼  COPY on group creation
group_role ("Group Leader" in Group #42)
    │
    │  permissions copied into group_role_permissions
    │  (now independent — leader can customize)
    │
    ▼
group_role_permissions (Group #42's "Group Leader" grants X, Y, Z)
    │
    │  Leader later removes 'control_member_list_visibility'
    │  → only affects Group #42, not the template or other groups
    │
    ▼
CUSTOMIZED: Group #42's leader role is now different from template
```

#### Summary Table

| Layer | What | Who Controls | Dynamic? | Table |
|-------|------|-------------|----------|-------|
| **Permissions** | Discrete actions the app can enforce | Developers (code + migrations) | No — grows with features | `permissions` |
| **Roles** | Named bundles of permissions, scoped to a group | Group Leaders | Yes — create, rename, delete | `group_roles` |
| **Permission Sets** | Which permissions each role grants | Group Leaders (from system catalog) | Yes — add/remove per role | `group_role_permissions` |
| **Role Templates** | Starting-point defaults for new roles | Developers / Platform Admins | Rarely — updated with new features | `role_templates` + `role_template_permissions` |
| **User Assignments** | Which users hold which roles | Group Leaders | Yes — assign/remove | `user_group_roles` |

### Group Type Model (KEY DESIGN DECISION)

Everything in FringeIsland flows through the same universal pattern: **Group → Role(s) → Permission Set(s)**. There are no special cases or bypasses. The system recognizes five group types, organized into two tiers.

**The fundamental membership mechanism is group-to-group.** Users are represented by their personal group. When a user "joins" an engagement group, their personal group joins. When an engagement group joins another engagement group, the same mechanism applies. The host group always assigns roles to the joining group.

#### Tier 1: System Groups (always active)

System group permissions apply **regardless of which context the user is currently in**. They represent platform-wide capabilities and baselines.

| Group | Membership | Roles | Purpose |
|-------|-----------|-------|---------|
| **Visitor** | Implicit (non-logged-in users) | Guest | Minimal public access: browse public pages, view public content |
| **FringeIsland Members** | Auto-assigned on signup | Member | Platform capabilities: create engagement groups, browse catalog, enroll in journeys, send messages |
| **Deusex** | Manually assigned (personal group joins) | Deusex | ALL permissions. CRUD templates, roles, permission sets. Full governance. |

#### Tier 2: Context Groups (active only in that group's context)

Context group permissions apply **only when the user is operating within that specific group**.

| Group | Membership | Roles | Purpose |
|-------|-----------|-------|---------|
| **Personal Group** | Auto-created per user (exactly 1 member: themselves) | Myself | User's identity + "My Home" — manage own profile, view own enrollments, track own progress. Named by the user (alias). |
| **Engagement Groups** | User-created, groups join groups | Steward, Guide, Member, Observer, custom | Collaborative access: journeys, book circles, communities of practice, guide networks, organizational units, etc. |

#### How Groups Join Groups

```
JOINING:
  Joining Group ──requests to join──> Host Group ──assigns──> Roles ──have──> Permissions

PERSONAL GROUP JOINING AN ENGAGEMENT GROUP:
  "Mogwai" (Stefan's personal group)
      ──joins──> "Alpha" (engagement group)
      ──gets──> Roles A+B+C in Alpha
      ──has──> Read/Edit/Create/Delete in Alpha's context

ENGAGEMENT GROUP JOINING ANOTHER ENGAGEMENT GROUP:
  "Alpha" (engagement group)
      ──joins──> "Beta" (engagement group)
      ──gets──> Roles A+B in Beta
      ──has──> Read/Edit in Beta's context

  Stefan (Mogwai), already in Alpha, AUTOMATICALLY gains access to Beta
  with Beta's roles A+B (determined by Beta, not by Stefan's roles in Alpha).

ATTRIBUTION:
  Stefan acting in Alpha:   "Mogwai"
  Stefan acting in Beta:    "Mogwai in 'Alpha'"
  (If Beta → Gamma):        "Mogwai in 'Alpha' in 'Beta'"
```

#### Permission Resolution

When checking "can user X do action Y in context Z?":

```
effective_permissions(user, context) =
    permissions from Tier 1 system groups (always active)
  + permissions from ALL paths to context group (union, see D12)

Example: Stefan (Mogwai) is a direct member of Alpha (Leader) and Alpha is a member of Beta
──────────────────────────────────────────────────────────────────────────────────────────────

  In Alpha:
    System:  FringeIsland Members → "Member" role → {create_group, browse_catalog, enroll_self}
    Context: Alpha → "Leader" role → {edit_group, invite_members, assign_roles, remove_members}
    Effective: {create_group, browse_catalog, enroll_self, edit_group, invite_members, assign_roles, remove_members}

  In Beta (through Alpha, joined as Member by default):
    System:  FringeIsland Members → "Member" role → {create_group, browse_catalog, enroll_self}
    Context: Beta's roles assigned to Alpha → "Member" role → {view_members, view_content, complete_activities, post_forum, ...}
    Effective: {create_group, browse_catalog, enroll_self, view_members, view_content, complete_activities, post_forum, ...}
    (Stefan has Member permissions in Beta — same as any member. Beta's Steward can promote Alpha to Guide or restrict to Observer.)

Example: Deusex user in ANY engagement group
─────────────────────────────────────────────
  System:  Deusex group → "Deusex" role → {ALL permissions}
  Context: (doesn't matter — system tier always active)
  Effective: {ALL permissions}
```

#### Signup Flow

When a new user registers, three things happen:

```
1. User profile created              (existing trigger: on_auth_user_created)
2. Personal Group created             (auto-create, named by user, assign "Myself" role)
3. FringeIsland Members membership    (personal group auto-joins system group, gets "Member" role)
```

#### Default Roles — One Model for All (D21)

All groups — whether personal or engagement — join as **Member** by default. There is no separate "joining-group role" category. The same four roles apply to everyone:

```
ROLES (for ALL groups that join — personal or engagement):
  ├── Steward     (long-term group care — membership, settings, structure)
  ├── Guide       (journey facilitation — content expertise, progress, feedback)
  ├── Member      (active participation — DEFAULT for all joining groups)
  ├── Observer    (supportive follow-along — watching, feedback)
  └── custom...   (created by steward)
```

The host group Steward can:
- Promote a joining group to Guide (if they bring expertise)
- Create a custom role for specific joining groups
- Restrict a joining group to Observer if less access is desired
- But the default is always **Member** — engagement and active participation

#### Visual Overview

```
TIER 1 — SYSTEM GROUPS (always active):

┌─────────────────────┐     ┌──────────┐     ┌──────────────────────────────────┐
│ Visitor Group        │────>│ Guest    │────>│ browse public pages,             │
│ (non-logged-in)     │     │          │     │ view public content              │
└─────────────────────┘     └──────────┘     └──────────────────────────────────┘

┌─────────────────────┐     ┌──────────┐     ┌──────────────────────────────────┐
│ FringeIsland Members │────>│ Member   │────>│ create engagement groups,        │
│ (all logged-in)     │     │          │     │ browse catalog, enroll self,     │
└─────────────────────┘     └──────────┘     │ send messages                    │
                                              └──────────────────────────────────┘

┌─────────────────────┐     ┌──────────┐     ┌──────────────────────────────────┐
│ Deusex Group         │────>│ Deusex   │────>│ ALL permissions                  │
│ (superusers)        │     │          │     │ CRUD templates, roles, perms     │
└─────────────────────┘     └──────────┘     └──────────────────────────────────┘


TIER 2 — CONTEXT GROUPS (active only in that group):

┌─────────────────────┐     ┌──────────┐     ┌──────────────────────────────────┐
│ Personal Group       │────>│ Myself   │────>│ edit own profile, view own       │
│ "Mogwai" (1 member) │     │          │     │ enrollments, track own progress  │
└─────────────────────┘     └──────────┘     └──────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Engagement Group "Alpha"                                                     │
│                                                                              │
│  ROLES (same for personal groups AND engagement groups that join):           │
│  ┌──────────┐     ┌──────────────────────────────────┐                      │
│  │ Steward  │────>│ edit group, invite, assign roles  │  ← "Mogwai" has this│
│  └──────────┘     └──────────────────────────────────┘                      │
│  ┌──────────┐     ┌──────────────────────────────────┐                      │
│  │ Guide    │────>│ facilitate, track progress, feedback│                    │
│  └──────────┘     └──────────────────────────────────┘                      │
│  ┌──────────┐     ┌──────────────────────────────────┐                      │
│  │ Member   │────>│ view content, complete, post forum│  ← DEFAULT for all  │
│  └──────────┘     └──────────────────────────────────┘    joining groups     │
│  ┌──────────┐     ┌──────────────────────────────────┐                      │
│  │ Observer │────>│ view content, view progress, DMs  │                      │
│  └──────────┘     └──────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

> **Note:** The RBAC system replaced the original `isLeader` boolean pattern (v0.2.13). The pre-RBAC schema had the permission and role template tables but they were unwired — `role_template_permissions` and `group_role_permissions` were empty. The D15 rebuild (v0.2.22) wired everything up. For the current schema, see [Group Management](./FR-group-management.md) and the D15 migration doc.

---

## Activity Catalog

The RBAC system was designed against a complete inventory of ~73 discrete platform actions across 10 domains: auth, profile, groups, members, roles, journeys, enrollments, communication, feedback, and admin. The implemented permission set (41 permissions, D22) is a coarse-grained subset — multiple leaf activities map to a single permission where they share a UI context and security impact.

Full activity tree, summary table, and activity-to-permission mapping: see **[Activity Catalog](../../specification/ACTIVITY_CATALOG.md)**.

---

## Permission Scope Model

Permissions are distributed across the group types defined in D4/D5. Each activity lives in exactly one group type. See "Group Type Model" section for the two-tier resolution logic.

### Visitor Group (Tier 1 — system, pre-auth)
```
auth.signup                     # Create account
auth.signin                     # Sign in
journeys.browse.*               # Browse public catalog
groups.browse_public            # Discover public groups
```

### FringeIsland Members Group (Tier 1 — system, all authenticated users)
```
auth.signout                    # End session
groups.create                   # Create a new engagement group
groups.list                     # View own groups
journeys.browse.*               # Browse full catalog (published)
journeys.view.*                 # View journey details
enrollments.enroll.individual   # Enroll self in journeys
enrollments.view.individual     # View own enrollments
communication.messaging.send    # Send direct messages (platform-wide)
```

### Personal Group (Tier 2 — context, per-user "My Home")
```
profile.view_own                # View own profile
profile.edit.*                  # Edit name, bio, avatar
enrollments.progress.*          # Play journeys, complete steps, resume, track own progress
enrollments.view.*              # View own enrollments (individual + group)
```

### Engagement Groups (Tier 2 — context, user-created)
```
groups.view.*                   # View group details, member list
groups.edit.*                   # Edit group settings (leader)
groups.delete                   # Delete group (leader)
groups.leave                    # Leave the group
members.*                       # Invite, remove, view, pause, activate
roles.*                         # Assign, remove, view, manage
enrollments.enroll.group        # Enroll group in journey (leader)
enrollments.progress.view_others    # View other members' progress
enrollments.progress.track_group    # Group-wide progress overview
communication.forum.*           # Group forums
feedback.*                      # Member feedback
```

### Deusex Group (Tier 1 — system, superusers)
```
ALL permissions                 # Every permission in the system catalog
admin.*                         # CRUD templates, roles, permission sets
journeys.manage.*               # Create, edit, publish, delete journeys
```

---

## Mapping: Activity Tree to Permissions

> **Note:** The activity-to-permission mapping was a design-time gap analysis (completed Feb 11, 2026). D22 resolved all identified gaps (added `browse_journey_catalog` and `browse_public_groups`). The full mapping table and remaining gaps are documented in `docs/reference/activity-catalog.md`.

---

---

## Design Decisions (Resolved)

Decisions made during planning that shape the architecture:

### D1: Three-Layer Architecture (Resolved 2026-02-11)

**Decision:** Permissions are system-defined atoms (not user-creatable). Roles and permission sets are dynamic and group-scoped. See "Three-Layer Architecture" section above.

**Rationale:** Permissions represent enforced code paths — they only make sense if the application has logic behind them. Letting users invent arbitrary permissions would create phantom entries with no enforcement. Roles and their permission sets, however, must be flexible so Group Leaders can tailor access to their group's needs without developer involvement.

### D2: Self-Service Role Customization (Resolved 2026-02-11)

**Decision:** Group Leaders CAN create custom roles AND customize which permissions those roles grant, selecting from the system permission catalog.

**Rationale:** Different groups have fundamentally different needs. A corporate training group needs different roles than a peer learning cohort. Restricting leaders to the 5 system templates would recreate the rigidity problem we're solving.

**Constraints:**
- Leaders select from existing permissions only (can't invent new ones).
- Template-based roles start with default permissions but can be customized after creation.
- Customizations are scoped to the group — they don't affect the template or other groups.

### D3: Deusex is a Group, Not a Bypass (Resolved 2026-02-11)

**Decision:** "Deusex" is a **system group** with a role (which may also be named "Deusex") that has all permissions activated. Users whose personal groups belong to the Deusex group do not bypass the permission system — they go through the same `hasPermission()` checks as everyone else. The Deusex group's role simply happens to have every permission granted.

**Rationale:** The permission system must be the single source of truth for ALL users, including superusers. No special-case `if (user === 'deusex') return true` code. This validates that the RBAC model is comprehensive enough to express "can do everything" purely through permissions. The Deusex group follows the exact same Group → Role → Permission Set pattern as every other group.

**Implication:** When new permissions are added (new features), they must be explicitly added to the Deusex group's role permission set. This is a deliberate trade-off: it forces awareness of new permissions rather than silently granting them.

### D4: Universal Group Pattern + Groups Join Groups (Resolved 2026-02-11)

**Decision:** All access control flows through the same universal pattern: **Group → Role(s) → Permission Set(s)**. There are five group types but the pattern is identical for all of them.

**The fundamental membership mechanism is group-to-group.** Users are represented by their personal group. When a user "joins" an engagement group, their personal group joins that group. When an engagement group joins another engagement group, it works the same way. The host group always assigns roles to the joining group.

**Group types:**
- **Visitor** (system, implicit for anonymous users)
- **FringeIsland Members** (system, auto-join on signup)
- **Personal Group** (context, auto-created per user, user's identity/"My Home")
- **Engagement Groups** (context, user-created — journeys, book circles, communities of practice, guide networks, etc.)
- **Deusex** (system, manually assigned superusers)

**Rationale:** A uniform model means no special cases in the permission checking code. Visitors, regular members, group leaders, and superusers all go through the exact same mechanism. The group-to-group model also naturally supports organizational structures — engagement groups joining other engagement groups — without needing a separate "relationship" or "hierarchy" system.

### D5: Two-Tier Permission Scoping (Resolved 2026-02-11)

**Decision:** Groups are organized into two tiers that determine when their permissions are active:
- **Tier 1 (System groups):** Permissions are always active, regardless of context. They represent platform-wide capabilities.
- **Tier 2 (Context groups):** Permissions are only active when operating within that specific group's context.

**Permission resolution:** `effective_permissions(user, context) = system group permissions + context group permissions`

**With transitive access:** When Group Alpha is a member of Group Beta, and Stefan's personal group is a member of Group Alpha, Stefan gets access to Group Beta with whatever roles Beta assigned to Alpha. His effective permissions in Beta = system group permissions + Beta's roles assigned to Alpha. (NOT Stefan's Alpha permissions projected onto Beta.)

**Rationale:** This solves the scope problem cleanly. A user's "Leader" role in Group #42 doesn't bleed into Group #99 (context-scoped). But Deusex's "all permissions" works everywhere (system-scoped). No complex priority/override logic — just additive layering.

**Implication:** The `groups` table needs a way to distinguish system groups from context groups (e.g., `group_type` column: `'system'` vs. `'personal'` vs. `'engagement'`).

### D6: FringeIsland Members Group — Keep It (Resolved 2026-02-11)

**Decision:** The FringeIsland Members system group is a separate group from the Personal Group, even though both are auto-assigned on signup.

**Rationale — the decisive argument:** Centralized platform policy control. When Deusex needs to change what all users can do platform-wide (e.g., temporarily disable group creation, add a new capability), they update ONE role in ONE group. Without the Members group, this would require updating the "Myself" role in every personal group individually — potentially thousands of updates with no reliable propagation mechanism (since we decided templates don't auto-propagate after creation).

**Separation of concerns:**
- **Personal Group** ("Myself" role) = what I can do with *my own stuff* (profile, enrollments, progress)
- **FringeIsland Members** ("Member" role) = what the *platform* lets me do (create groups, browse catalog, interact with others)

**Future benefit:** If membership tiers are ever needed (free/premium), the Members group naturally supports multiple roles: "Free Member" with limited permissions, "Premium Member" with full access. Personal groups stay identical for everyone.

### D7: Groups Join Groups — Universal Membership Model (Resolved 2026-02-11)

**Decision:** The fundamental membership mechanism is **group-to-group**. A personal group joining an engagement group IS the same as "a user joining a group." An engagement group joining another engagement group follows the exact same pattern. The host group always assigns roles to the joining group.

**How it works:**
```
Joining Group ──joins──> Host Group ──assigns──> Roles ──have──> Permissions

"Mogwai" (personal) ──joins──> "Alpha"   ──assigns──> Leader role   ──> Read/Edit/Create/Delete
"Alpha" (engagement) ──joins──> "Beta"    ──assigns──> Observer role ──> Read/Edit
```

**Attribution chain:** When Stefan (personal group "Mogwai") acts in Group Beta through Group Alpha, the action is attributed as **"Mogwai in 'Alpha'"**. This provides a clear audit trail showing who acted and through which membership chain.

**The host group always decides.** When any group joins your group, YOU define what roles it gets. The joining group has no say in what permissions it receives — only the host group controls this.

**Rationale:** This eliminates the need for special relationship types (hierarchical, peer, observer), cross-group role mapping rules, or separate "group-to-group" permission systems. It's all just groups joining groups with assigned roles. The same mechanism that handles a user joining a book circle also handles a department joining a company group.

### D8: Engagement Groups (Terminology) (Resolved 2026-02-11)

**Decision:** Rename "journey groups" to **"engagement groups"** throughout the system. Engagement groups can serve many purposes:

- Journey groups (people learning together)
- Book circles
- Travel guide networks
- Communities of practice
- Project teams
- Organizational units
- Any other collaborative context

**Rationale:** "Journey groups" implies groups only exist for journeys. The platform supports many types of collaborative engagement. "Engagement group" is broad enough to encompass all of them while still conveying active participation.

**Impact:** All references to "engagement groups" in code, docs, and UI need updating.

### D9: Personal Group = User Identity (Resolved 2026-02-11)

**Decision:** Each user's personal group IS their identity in the system.

**Properties:**
- Auto-created on signup (alongside FringeIsland Members membership)
- Exactly **1 member**: the user themselves. Never more.
- Named by the user (alias/avatar name, e.g., "Mogwai"). This is how they appear in other groups.
- Has one role: "Myself" with permissions for managing own profile, enrollments, progress
- When the personal group joins an engagement group, that IS the user joining

**Rationale:** Unifies the membership model. There's no separate concept of "user joins group" vs. "group joins group." It's always group-to-group. The personal group is the bridge.

### D10: Transitive Membership With Configurable Depth (Resolved 2026-02-11)

**Decision:** Membership is **fully transitive** with no depth limit by default.

If Mogwai → Alpha → Beta → Gamma, then Stefan (Mogwai) has access to Gamma through the chain. Permissions at each level are determined by the host group's role assignments to the joining group.

**Configurable depth limit:** A system setting `max_membership_depth` (default: unlimited) can be toggled on later without schema changes. This is a safety valve, not an initial constraint. We'll add it if/when deep chains cause performance issues.

**Attribution at depth:** "Mogwai in 'Alpha' in 'Beta'" — the full chain is visible.

### D11: Circularity Prevention via Constraint (Resolved 2026-02-11)

**Decision:** Circular group membership is **prevented at insert time** via a recursive constraint check.

Before allowing Group A to join Group B, the system walks B's membership chain upward (recursively) and verifies A doesn't appear anywhere in it. If it does, the join is rejected with a clear error.

**Why constraint over detection:** A constraint prevents the problem rather than handling it after the fact. It's more future-proof — no data cleanup needed, no edge cases with partially-formed cycles.

**Implementation:** A `BEFORE INSERT` trigger on `group_memberships` that performs a recursive CTE check when `member_group_id` is not null.

### D12: Multiple Path Permissions = Union (Resolved 2026-02-11)

**Decision:** If a user has access to a group through multiple paths (e.g., directly AND through another group), their effective permissions are the **union** of all paths.

**Example:** Stefan (Mogwai) is a direct member of Group Beta with role A (Read). Stefan is also in Group Alpha, which is a member of Group Beta with roles A+B (Read/Edit). Stefan's effective permissions in Beta = A + A+B = {Read, Edit} (union of both paths).

**Rationale:** Additive (union) is simpler and more permissive than intersection or priority-based resolution. Since permissions are grants (not denials), there's no conflict — you either have a permission or you don't.

### D13: Notification Model for Group Membership (Resolved 2026-02-11)

**Decision:** Group membership notifications use the in-app communication/messaging system, NOT email. Email is only for platform-level authentication (signup, password reset).

**Flows:**
- **Personal group joins engagement group:** Request/acceptance handled via in-app messaging. No email.
- **User invited to engagement group:** Notification via in-app messaging system.
- **Engagement group A joins engagement group B:** On acceptance, all users in Group A receive an in-app notification that they now belong to Group B.
- **Group B is notified** that Group A has joined (group-level "news flash"), but this is NOT pushed to all individual users in Group B.

**Implication:** The communication/messaging system (Phase 1.5) is not just a social feature — it's **infrastructure** for the membership and permissions system. Its priority may need to increase.

### D14: Role Selector — "Act as..." UI Filter (Resolved 2026-02-11)

**Decision:** Users with multiple roles in a group can select which role to "act as" via a UI toggle. This filters the visible actions/buttons to only those the selected role permits.

**How it works:**
- The `usePermissions(groupId)` hook already fetches all roles and their permission sets.
- A dropdown/toggle shows: "All roles (default)" plus each individual role the user holds.
- When a specific role is selected, `hasPermission()` checks against that role's permission set only (not the union).
- Default is "All roles" = union behavior (D12 unchanged).

**This is purely a client-side UI filter.** The server/RLS always evaluates the full union of permissions. This means:
- No backend changes, no schema changes, no RLS changes.
- No risk of locking yourself out — the server always allows your full permissions.
- The UI experience IS the "act as" experience: if the button isn't visible, you can't click it.

**Use cases:**
- Leader wants to see the group as a Member sees it (verify member experience)
- User wants to intentionally limit their available actions to reduce mistakes
- Training/onboarding: show someone what a specific role can do

**Rationale:** Practically zero implementation cost (one dropdown + one filter parameter on the existing hook). Provides real value for group leaders without any architectural complexity. Server-side role restriction is unnecessary since the UI filter achieves the same user experience.

### D15: Schema — Group-to-Group Only (Option A) (Resolved 2026-02-11)

**Decision:** Migrate to `member_group_id` only. All memberships are group-to-group. Drop `user_id` from `group_memberships` after migration. Same for role assignments — roles are assigned to joining groups, not directly to users.

**Current state:**
- `group_memberships` has both `user_id` and `member_group_id` with CHECK constraint (exactly one set)
- `user_group_roles` assigns roles to `user_id` directly

**Target state:**
- `group_memberships` uses only `member_group_id` (always a group joining a group)
- Role assignments reference the joining group, not a user directly
- To find "which user": join through personal group (one extra JOIN, negligible cost at any scale)

**Why not denormalize (keep both columns)?**
At <100 users the extra JOIN is sub-millisecond. At 100K+ users it's ~1-2ms — still negligible compared to the recursive CTE for transitive membership. Simplicity wins over micro-optimization. One mechanism, one model, no duplication to maintain.

**Migration steps:**
1. Create personal groups for all existing users
2. Convert existing `user_id` memberships to `member_group_id` (pointing to personal group)
3. Convert `user_group_roles` to reference joining groups instead of users
4. Drop `user_id` column from `group_memberships`
5. Update all application queries to join through personal groups

---

### D16: Leaving/Removal — Preserve Data As-Is (Resolved 2026-02-11)

**Decision:** When a group leaves another group, all data created by its members (forum posts, journey progress, feedback) is **preserved as-is** in the host group. The membership record transitions to a departed status rather than being deleted.

**What happens:**
- Access is revoked (permissions no longer apply)
- Forum posts, progress data, feedback remain visible and attributed to the original author
- Attribution shows the member is no longer active (e.g., "Mogwai (via Alpha, left)")
- Membership record status → `'departed'` (preserves audit trail)
- If the group rejoins later, a new membership is created (clean slate for permissions)

**Why not delete or hide:** Forum discussions make no sense with holes. Progress data may be needed for reporting. The data belongs to the host group's context, not the departing group.

---

### D17: Four Default Engagement Group Roles (Resolved 2026-02-11)

**Decision:** Engagement groups have four default internal roles, each with a distinct function:

| Role | Function | Analogy |
|------|----------|---------|
| **Steward** | Long-term group care — membership, settings, structure, oversight | "Cares for the house" |
| **Guide** | Journey facilitation — content expertise, progress tracking, feedback | "Knows the path" |
| **Member** | Active participation — learning, completing activities, engaging | "Walking the path" |
| **Observer** | Supportive follow-along — watching, feedback, extra perspective | "A companion on the sideline" |

**Key separation:** Steward manages the GROUP (membership, settings, roles). Guide manages the LEARNING (facilitates journeys, tracks progress, gives feedback). These are intentionally separate because:
- A group may have a long-term caretaker who isn't a subject-matter expert
- Facilitators/guides may have deep journey expertise without needing group management powers
- In small groups, one person may hold both roles (union gives them both permission sets)

**Observer is not passive surveillance.** It's a supportive role: external mentors, peer reviewers from another group, coaches checking in. Read access with view-only participation.

**No separate "joining-group role."** When an engagement group joins another engagement group, it gets the **Member** role by default — the same as a personal group joining. The platform values engagement over passive observation. The Steward can promote (to Guide) or restrict (to Observer) per joining group as needed. See D21.

**These are defaults — fully customizable.** Stewards can rename roles, adjust permissions, or create additional custom roles. The templates exist to give groups a sensible starting point.

**Replaces:** The previous 5 role templates (Platform Admin, Group Leader, Guide, Member, Observer) will be updated. "Platform Admin" becomes system-level only (Deusex). "Group Leader" → "Steward". "Travel Guide" → "Guide". Member and Observer remain (with updated permissions).

### D18: Data Privacy — Feedback Privacy + Sharing Consent (Resolved 2026-02-11)

**Decision:** Personal data (feedback, assessment results, individual progress) is private by default. Sharing is always opt-in, never opt-out. Three mechanisms handle different scopes:

#### 1. Feedback is Private (Giver + Receiver Only)

Feedback directed at a member is visible ONLY to the giver and receiver. No one else — not the Steward, not the Guide, not the Observer. The `view_member_feedback` permission is **dropped** from the system.

- Feedback I received → always visible to me
- Feedback I gave → always visible to me + the recipient
- Feedback others received → not visible to anyone else

#### 2. Within-Group Sharing: `sharing_level` Column

Personal data (assessment results, individual progress, journey outcomes) has a `sharing_level` column:

| Level | Who can see | Example |
|-------|------------|---------|
| `private` (default) | Only me | My Big 5 scores — nobody else sees them |
| `guide` | Me + Guides/Steward in my direct group | Guide can use my scores for facilitation |
| `group` | Everyone in my direct group | Peers can see my scores |

The member controls this setting at any time. Default is always `private`.

**Interaction with permissions:** Both must be true. A Guide with `view_others_progress` can only see data from members who set `sharing_level` to `'guide'` or `'group'`. Permission = "allowed to see shared data." Consent = "I allow my data to be seen."

#### 3. Cross-Group Reports: Aggregates Freely, Individual by Consent

When groups are nested (Alpha in Beta in Gamma), cross-group reporting follows these rules:

| Report type | Consent needed | Example |
|-------------|---------------|---------|
| **Aggregate** | None — not personal data | "Alpha's average Openness: 72, spread: 15" |
| **Individual** | Explicit per-request consent | Beta's Guide requests Stefan's scores → Stefan approves/denies |

Aggregates can include any statistical measure that doesn't identify individuals: averages, spread/range, standard deviation, distributions, percentiles, etc.

**Small group protection:** When fewer than 3 members have shared data, aggregates are suppressed (because with 1-2 data points, aggregates can identify individuals). Implementation detail for later.

#### 4. Permission Changes from D18

- **Drop** `view_member_feedback` — feedback is always private between giver and receiver
- **Rename** `track_group_progress` → `view_group_progress` — available to all four roles
- **Update** `provide_feedback_to_members` — add Member (peer feedback), remove Observer

---

### D18a: Updated Default Permission Grid for Engagement Group Roles (Resolved 2026-02-11)

The complete default permission mapping for the four engagement group roles (D17), incorporating all D18 changes:

**Group Management:**

| Permission | Steward | Guide | Member | Observer |
|---|---|---|---|---|
| `edit_group_settings` | ✓ | | | |
| `delete_group` | ✓ | | | |
| `set_group_visibility` | ✓ | | | |
| `control_member_list_visibility` | ✓ | | | |
| `invite_members` | ✓ | | | |
| `remove_members` | ✓ | | | |
| `activate_members` | ✓ | | | |
| `pause_members` | ✓ | | | |
| `assign_roles` | ✓ | | | |
| `remove_roles` | ✓ | | | |
| `view_member_list` | ✓ | ✓ | ✓ | ✓ |
| `view_member_profiles` | ✓ | ✓ | ✓ | ✓ |

**Journey (group-scoped):**

| Permission | Steward | Guide | Member | Observer |
|---|---|---|---|---|
| `enroll_group_in_journey` | ✓ | | | |
| `unenroll_from_journey` | ✓ | | | |
| `freeze_journey` | ✓ | ✓ | | |

**Journey Participation:**

| Permission | Steward | Guide | Member | Observer |
|---|---|---|---|---|
| `view_journey_content` | | ✓ | ✓ | ✓ |
| `complete_journey_activities` | | ✓ | ✓ | |
| `view_own_progress` | | ✓ | ✓ | |
| `view_others_progress` | ✓ | ✓ | | ✓ |
| `view_group_progress` | ✓ | ✓ | ✓ | ✓ |

**Communication:**

| Permission | Steward | Guide | Member | Observer |
|---|---|---|---|---|
| `view_forum` | ✓ | ✓ | ✓ | ✓ |
| `post_forum_messages` | ✓ | ✓ | ✓ | |
| `reply_to_messages` | ✓ | ✓ | ✓ | |
| `moderate_forum` | ✓ | | | |
| `send_direct_messages` | ✓ | ✓ | ✓ | ✓ |

**Feedback:**

| Permission | Steward | Guide | Member | Observer |
|---|---|---|---|---|
| `provide_feedback_to_members` | ✓ | ✓ | ✓ | |
| `receive_feedback` | ✓ | ✓ | ✓ | |

**Totals:** Steward: 24 | Guide: 15 | Member: 12 | Observer: 7

**Removed from previous grid:** `view_member_feedback` (dropped — feedback is private, D18).
**Renamed:** `track_group_progress` → `view_group_progress` (all roles).
**Changed:** `provide_feedback_to_members` added to Member, removed from Observer.

---

### D19: Try-It Journeys + Anonymous-to-Member Conversion (Resolved 2026-02-11)

**Decision:** Visitors can start designated "try-it" journeys without creating an account. This is a fundamental product feature designed from the start, not an afterthought. Two signup paths coexist:

```
PATH A (traditional):  Sign up → create personal group → start using
PATH B (try-it):       Start try-it journey anonymously → experience the platform → sign up to save
Both paths converge:   Authenticated user with personal group and data intact.
```

#### Technical Approach: Supabase Anonymous Auth

Supabase's `signInAnonymously()` creates a real `auth.uid()` without credentials. On signup, `linkIdentity()` converts the anonymous record to a full account — **same user ID, no data migration needed.**

#### Flow

```
1. Visitor clicks "Try this journey"
2. System calls signInAnonymously() → visitor gets a temp auth.uid()
3. Proto-personal-group created (will become real personal group on conversion)
4. Progress stored in database normally, attributed to temp user
5. Visitor experiences the platform — activities, progress, their own space
6. Prompt: "Save your progress — create an account"
7. On signup: linkIdentity() converts anonymous → real account
8. Proto-personal-group becomes real personal group
9. FringeIsland Members membership created
10. All progress is already attached to the same user ID ✓
```

#### Permission Implications

**Visitor group updated permissions:**

| Permission | Granted | Scope |
|---|---|---|
| `browse_journey_catalog` | ✓ | Full public catalog |
| `browse_public_groups` | ✓ | Public groups |
| `view_journey_content` | ✓ | Try-it journeys only |
| `complete_journey_activities` | ✓ | Try-it journeys only |
| `view_own_progress` | ✓ | Own try-it progress only |

**Journey flag:** Journeys need an `allow_anonymous` boolean (default: false). Only journeys with this flag set can be started by visitors.

**Scoped enforcement:** The "try-it journeys only" restriction is enforced by combining the permission with the journey's `allow_anonymous` flag — the permission allows the action type, the flag gates which specific journeys.

#### Why Design From Start

This is a core selling point: "The journey starts before you commit." For a personal development platform, letting users experience the value before signing up is fundamental, not a growth hack. The proto-personal-group concept means the visitor is already building their space — signup just makes it permanent.

---

### D20: System-Level Role Permission Grids (Resolved 2026-02-11)

**Decision:** System-level roles have the following default permissions. Some user activities (profile editing, viewing own data) are handled by RLS alone, not permissions — see rationale below.

#### Guest (Visitor Group)

Maps to Supabase `anon` role. Includes try-it journey access (D19).

| Permission | Notes |
|---|---|
| `browse_journey_catalog` | Public catalog (new permission) |
| `browse_public_groups` | Discover public groups (new permission) |
| `view_journey_content` | Try-it journeys only (scoped by `allow_anonymous` flag) |
| `complete_journey_activities` | Try-it journeys only |
| `view_own_progress` | Own try-it progress only |

**Total: 5 permissions**

#### FringeIsland Member (all logged-in users)

Platform-wide capabilities. Tier 1 — always active.

| Permission | Notes |
|---|---|
| `browse_journey_catalog` | Full catalog (published journeys) |
| `browse_public_groups` | Discover groups |
| `create_group` | Create engagement groups |
| `enroll_self_in_journey` | Individual enrollment |
| `send_direct_messages` | Platform-wide messaging |
| `view_journey_content` | For individual enrollments |
| `complete_journey_activities` | For individual enrollments |
| `view_own_progress` | For individual enrollments |

**Total: 8 permissions**

Note: `view_journey_content`, `complete_journey_activities`, and `view_own_progress` serve double duty — granted here for individual enrollments AND in engagement group roles for group context.

#### Myself (Personal Group)

**No permissions.** Profile management and own-data visibility are handled by RLS:
- Edit own profile (name, bio, avatar) → RLS: `auth_user_id = auth.uid()`
- View own profile → always allowed
- View own enrollments → always allowed

The "Myself" role exists for model consistency (every group has at least one role) but carries no permission entries. These activities are too fundamental to revoke — every user can always manage their own profile.

#### Deusex

**All permissions.** Every permission in the system catalog is granted. When new permissions are added (new features), they must be explicitly added to the Deusex role (D3 — no bypass, deliberate awareness of new permissions).

#### What's NOT a Permission (RLS Only)

These activities are enforced by RLS rules, not the permission system:

| Activity | Enforcement | Rationale |
|---|---|---|
| Edit own profile | RLS: `auth_user_id = auth.uid()` | Fundamental right, never revokable |
| View own profile | Always allowed | Your data |
| View own enrollments | Always allowed | Your data |
| Sign up / sign in / sign out | Supabase Auth layer | Pre-auth, outside RBAC |

#### New Permissions Required

These permissions need to be added to the `permissions` table:

| Permission | Category | Notes |
|---|---|---|
| `browse_journey_catalog` | `journey_management` | View the journey catalog |
| `browse_public_groups` | `group_management` | Discover public groups |

#### New Journey Flag

| Column | Table | Type | Default | Purpose |
|---|---|---|---|---|
| `allow_anonymous` | `journeys` | boolean | false | Marks try-it journeys accessible to visitors |

---

### D21: Joining Groups Get Member Role by Default (Resolved 2026-02-11)

**Decision:** When an engagement group joins another engagement group, it receives the **Member** role by default — the same role a personal group gets when joining. There is no separate "joining-group role" or "External Observer" category.

**Rationale:** The platform's core value is engagement and active participation. If a group joins another group, they're joining to participate, not to watch. Making the default passive (observer/read-only) contradicts this. The host group's Steward already accepted the join — they want engagement.

**One model for all:** The same four roles (Steward, Guide, Member, Observer) apply to every group that joins, whether personal or engagement. The mechanism is identical. This simplifies the model — no special-case role categories.

**Steward controls customization per joining group:**
- Promote to **Guide** if the joining group brings subject-matter expertise
- Keep as **Member** for standard participation (default)
- Restrict to **Observer** if less access is desired
- Create a **custom role** for specific joining groups

**Implication:** The earlier concept of "internal roles vs. joining-group roles" (from the initial D4 discussion) is eliminated. All roles are just roles. The Steward assigns them based on the relationship, not based on whether the joiner is a person or a group.

---

### D22: Seeded Permissions & Templates — Final Delta (Resolved 2026-02-11)

**Decision:** The existing permissions need minimal changes. The new model requires 1 rename, 1 removal, 2 additions. Role templates need 1 removal and 2 renames (net: 4 templates).

> **CORRECTION (2026-02-16):** D22 originally stated "30 seeded permissions → 31 final." The actual DB has **40 seeded permissions** (the original count of 30 was a math error — category totals 13+9+5+5+3+5=40, not 30). The `platform_admin` category has 5 permissions (including `view_platform_analytics`, which was omitted from D22's listing). Correct final count: **41 permissions** (40 - 1 removed + 2 added). Template permission counts (Steward 24, Guide 15, Member 12, Observer 7) are unaffected — the extra perm is `platform_admin`, not granted to any engagement group template.

#### Permission Changes

| Change | Permission | Category | Reason |
|---|---|---|---|
| **Rename** | `track_group_progress` → `view_group_progress` | journey_participation | D18 — all roles should view group progress |
| **Remove** | `view_member_feedback` | feedback | D18 — feedback is private between giver and receiver |
| **Add** | `browse_journey_catalog` | journey_management | D20 — needed for Guest and FI Member system roles |
| **Add** | `browse_public_groups` | group_management | D20 — needed for Guest and FI Member system roles |

#### Final Permission Catalog (41 permissions)

| Category | Count | Permissions |
|---|---|---|
| `group_management` | 14 | `create_group`, `edit_group_settings`, `delete_group`, `invite_members`, `remove_members`, `activate_members`, `pause_members`, `assign_roles`, `remove_roles`, `view_member_list`, `view_member_profiles`, `set_group_visibility`, `control_member_list_visibility`, **`browse_public_groups`** (new) |
| `journey_management` | 10 | `enroll_group_in_journey`, `enroll_self_in_journey`, `unenroll_from_journey`, `freeze_journey`, `create_journey`, `edit_journey`, `publish_journey`, `unpublish_journey`, `delete_journey`, **`browse_journey_catalog`** (new) |
| `journey_participation` | 5 | `view_journey_content`, `complete_journey_activities`, `view_own_progress`, `view_others_progress`, **`view_group_progress`** (renamed) |
| `communication` | 5 | `post_forum_messages`, `send_direct_messages`, `moderate_forum`, `view_forum`, `reply_to_messages` |
| `feedback` | 2 | `provide_feedback_to_members`, `receive_feedback` |
| `platform_admin` | 5 | `manage_platform_settings`, `manage_all_groups`, `manage_role_templates`, `manage_group_templates`, `view_platform_analytics` |
| **Total** | **41** | (was 40: +2 added, -1 removed, 1 renamed) |

#### Role Template Changes

| Current Template | Change | New Name |
|---|---|---|
| Platform Admin Role Template | **Remove** | Becomes Deusex group role (system-level, not a group template) |
| Group Leader Role Template | **Rename** | Steward Role Template |
| Guide Role Template | **Rename** | Guide Role Template |
| Member Role Template | Keep | Member Role Template (update permissions per D18a) |
| Observer Role Template | Keep | Observer Role Template (update permissions per D18a) |

**Final templates: 4** (Steward, Guide, Member, Observer)

#### New Schema Additions

| Item | Table | Type | Purpose |
|---|---|---|---|
| `allow_anonymous` | `journeys` | boolean, default false | D19 — marks try-it journeys |
| `sharing_level` | progress/results tables | text, default 'private' | D18 — data sharing consent ('private'/'guide'/'group') |
| `group_type` | `groups` | text | D5 — distinguish 'system'/'personal'/'engagement' |

---

## All Design Decisions Complete

22 design decisions (D1-D22) resolved across two sessions. All original open questions (Q1-Q11) answered. The dynamic permissions system is fully designed and ready for implementation planning.

**Summary of all decisions:**

| # | Decision | Key Point |
|---|---|---|
| D1 | Three-Layer Architecture | Permissions (system) → Roles (dynamic) → Permission Sets (dynamic) |
| D2 | Self-Service Role Customization | Stewards can create/customize roles from system permission catalog |
| D3 | Deusex is a Group | Not a bypass — goes through same hasPermission() checks |
| D4 | Universal Group Pattern | Everything is Group → Role(s) → Permission Set(s) |
| D5 | Two-Tier Permission Scoping | System groups (always active) + Context groups (group-scoped) |
| D6 | FringeIsland Members Group | Separate from Personal Group — centralized platform policy control |
| D7 | Groups Join Groups | Universal membership model — group-to-group for everything |
| D8 | Engagement Groups | Renamed from "journey groups" — broader purpose |
| D9 | Personal Group = User Identity | Named by user (alias), exactly 1 member, bridge to groups |
| D10 | Transitive Membership | Unlimited depth, configurable limit for later |
| D11 | Circularity Prevention | BEFORE INSERT constraint with recursive CTE |
| D12 | Multiple Paths = Union | Additive permissions, no conflicts |
| D13 | Notification Model | In-app messaging for all group flows, email only for platform auth |
| D14 | Role Selector "Act as..." | Client-side UI filter, server always uses full union |
| D15 | Schema: Group-to-Group Only | Drop user_id from memberships, use member_group_id only |
| D16 | Preserve Data on Leaving | Data stays, membership → 'departed', attribution preserved |
| D17 | Four Default Roles | Steward, Guide, Member, Observer |
| D18 | Data Privacy & Consent | Feedback private, sharing_level column, cross-group aggregates |
| D18a | Permission Grid | Complete mapping: Steward 24, Guide 15, Member 12, Observer 7 |
| D19 | Try-It Journeys | Anonymous-to-member conversion, fundamental product feature |
| D20 | System-Level Role Grids | Guest 5, FI Member 8, Myself 0 (RLS), Deusex all |
| D21 | Joining Groups = Member | No separate External Observer, engagement over observation |
| D22 | Seeded Permissions Delta | 41 permissions (1 rename, 1 remove, 2 add from base of 40), 4 role templates |

---

## Remaining Future Work

- **Group-joins-group UI** — schema supports it (`member_group_id`), but no frontend for groups requesting to join other groups
- **Custom role UI** — role management, permission picker, guardrails for preventing privilege escalation
- **Attribution display** — "Mogwai in 'Alpha'" chain display in group contexts

> **Note:** The original design included Phases A–F of next steps. Phases A–D are complete (implemented in D15 rebuild, v0.2.22–v0.2.29). The notification system (Phase E item 22) was implemented in v0.2.14. The remaining items above are from Phases E and F.

---

## Revision History

| Date | Change |
|------|--------|
| 2026-02-11 | Design completed: 22 decisions (D1–D22), activity tree, three-layer architecture, permission grids, scope model. All design questions (Q1–Q8) resolved and approved. |
| 2026-02-16 | UI note: permission display order hardcoded in `lib/constants/permissions.ts` — new permissions need `PERMISSION_DISPLAY_ORDER` entry. |
