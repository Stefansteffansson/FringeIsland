# Activity Catalog — FringeIsland Platform Actions

**Source:** Extracted from [Dynamic Permissions System](../features/implemented/dynamic-permissions-system.md) design (Feb 11, 2026)
**Purpose:** Reference catalog of every discrete user action, organized by domain. Each leaf node maps to a candidate permission in the RBAC system.
**Status:** Design-time reference. The implemented permission set (41 permissions, D22) is a coarse-grained subset of these ~73 leaf activities.

---

## Complete Activity Tree

### 1. Authentication

```
auth
 |- auth.signup                          # Create a new account
 |- auth.signin                          # Sign in to existing account
 +- auth.signout                         # End current session
```

> **Note:** Auth actions are pre-authentication and handled by Supabase Auth directly. They don't participate in RBAC. Included for completeness.

### 2. Profile

```
profile
 |- profile.view_own                     # View own profile page
 |- profile.edit
 |   |- profile.edit.name                # Change display name
 |   |- profile.edit.bio                 # Change bio text
 |   +- profile.edit.avatar              # Upload/replace avatar image
 +- profile.deactivate                   # Deactivate account (soft delete; not yet in UI)
```

> **Note:** Profile actions are user-scoped (you can only edit your own). No group context. These may remain outside RBAC or use a simple "authenticated user" baseline.

### 3. Groups

```
groups
 |- groups.list                          # View list of groups user belongs to
 |- groups.browse_public                 # Browse/discover public groups
 |- groups.create                        # Create a new group
 |                                       #   (multi-step: group + membership + role setup)
 |- groups.view
 |   |- groups.view.details              # View group name, description, settings
 |   +- groups.view.members              # View member list
 |                                       #   (currently gated by show_member_list OR isLeader)
 |- groups.edit
 |   |- groups.edit.name                 # Change group name
 |   |- groups.edit.description          # Change group description
 |   |- groups.edit.label                # Change group label
 |   |- groups.edit.visibility           # Toggle public/private
 |   +- groups.edit.member_list_visibility   # Toggle show_member_list
 |- groups.delete                        # Delete group (cascades memberships, roles, enrollments)
 +- groups.leave                         # Leave a group
                                         #   (blocked by trigger if last leader)
```

### 4. Members (group-scoped)

```
members
 |- members.view
 |   |- members.view.list                # See who is in the group
 |   |- members.view.roles               # See what roles each member holds
 |   +- members.view.invitation_count    # See pending invitation badge (navigation)
 |- members.invite
 |   |- members.invite.search_user       # Look up a user by email
 |   +- members.invite.send              # Create invitation (status='invited')
 |- members.remove                       # Remove an active member from group
 |- members.activate                     # Reactivate a paused member (not yet in UI)
 |- members.pause                        # Pause a member (not yet in UI)
 +- members.invitation
     |- members.invitation.view          # View own pending invitations
     |- members.invitation.accept        # Accept an invitation (invited -> active)
     +- members.invitation.decline       # Decline an invitation (delete record)
```

### 5. Roles (group-scoped)

```
roles
 |- roles.view                           # View available roles in a group
 |- roles.assign                         # Assign a role to a member
 |   |- roles.assign.member              # Assign "Member" role
 |   |- roles.assign.travel_guide        # Assign "Guide" role
 |   +- roles.assign.leader              # Promote to "Steward"
 |- roles.remove                         # Remove a role from a member
 |                                       #   (blocked by trigger if last Steward)
 +- roles.manage                         # (Phase 2: custom role creation)
     |- roles.manage.create              # Create a custom role for the group
     |- roles.manage.edit                # Edit a custom role's permissions
     +- roles.manage.delete              # Delete a custom role
```

### 6. Journeys (catalog / browsing)

```
journeys
 |- journeys.browse                      # View the journey catalog
 |   |- journeys.browse.search           # Search by title/description
 |   |- journeys.browse.filter_difficulty # Filter: beginner/intermediate/advanced
 |   +- journeys.browse.filter_tags      # Filter by topic tags
 |- journeys.view
 |   |- journeys.view.details            # View journey overview (description, metadata)
 |   +- journeys.view.curriculum         # View step list (expandable)
 +- journeys.manage                      # (Admin/Creator only; not yet in UI)
     |- journeys.manage.create           # Create a new journey
     |- journeys.manage.edit             # Edit journey content/metadata
     |- journeys.manage.publish          # Publish/unpublish a journey
     +- journeys.manage.delete           # Delete a journey
```

### 7. Enrollments (group-scoped for group enrollments)

```
enrollments
 |- enrollments.view
 |   |- enrollments.view.individual      # View own individual enrollments (My Journeys tab 1)
 |   +- enrollments.view.group           # View group enrollments (My Journeys tab 2)
 |- enrollments.enroll
 |   |- enrollments.enroll.individual    # Enroll self in a journey
 |   +- enrollments.enroll.group         # Enroll a group in a journey
 |- enrollments.unenroll                 # Cancel an enrollment (not yet in UI)
 |- enrollments.freeze                   # Freeze journey progress (not yet in UI)
 +- enrollments.progress
     |- enrollments.progress.view        # See progress bar / completion percentage
     |- enrollments.progress.play        # Launch journey player
     |- enrollments.progress.navigate    # Move between steps (prev/next/sidebar)
     |- enrollments.progress.complete_step     # Mark a step as complete
     |- enrollments.progress.complete_journey  # Complete entire journey
     |- enrollments.progress.resume      # Resume from last saved position
     |- enrollments.progress.view_others # View other members' progress (Guide)
     +- enrollments.progress.track_group # View group-wide progress overview
```

### 8. Communication

```
communication
 |- communication.forum
 |   |- communication.forum.view         # View forum content
 |   |- communication.forum.post         # Post messages in forums
 |   |- communication.forum.reply        # Reply to messages
 |   +- communication.forum.moderate     # Delete/edit others' messages
 +- communication.messaging
     |- communication.messaging.send     # Send direct messages
     |- communication.messaging.view     # View message history
     +- communication.messaging.manage   # Manage message settings
```

### 9. Feedback

```
feedback
 |- feedback.provide                     # Give feedback to members
 |- feedback.receive                     # Receive feedback
 +- feedback.view_others                 # View feedback given to other members
```

### 10. Platform Administration

```
admin
 |- admin.platform
 |   |- admin.platform.settings          # Manage platform-wide settings
 |   |- admin.platform.manage_groups     # Manage all groups on platform
 |   |- admin.platform.manage_templates  # Create/edit role and group templates
 |   +- admin.platform.manage_users      # View/deactivate/reactivate users
 +- admin.dev
     |- admin.dev.dashboard              # View development dashboard (dev mode)
     |- admin.dev.orphan_scan            # Scan for groups without leaders
     +- admin.dev.orphan_fix             # Assign leader to orphaned group
```

---

## Activity Summary

| Domain | Leaf Activities | Scope | Status |
|--------|----------------|-------|--------|
| **Authentication** | 3 | Global (pre-auth) | Implemented |
| **Profile** | 5 | User-scoped | Implemented |
| **Groups** | 11 | Group-scoped | Implemented |
| **Members** | 10 | Group-scoped | Mostly implemented (pause/activate deferred) |
| **Roles** | 7 | Group-scoped | Partially implemented (manage.* deferred) |
| **Journeys** | 8 | Global + group-scoped | Partially implemented (manage.* deferred) |
| **Enrollments** | 12 | User + group-scoped | Mostly implemented (unenroll/freeze deferred) |
| **Communication** | 7 | Group-scoped | Forums implemented, messaging designed |
| **Feedback** | 3 | Group-scoped | Not started |
| **Admin** | 7 | Global (platform) | Partially implemented |
| **Total** | **~73** | | |

---

## Activity-to-Permission Mapping

How the ~73 leaf activities map to the 41 implemented permissions (D22):

| Activity | Permission | Match |
|----------|-----------|-------|
| `groups.edit.*` | `edit_group_settings` | Coarse (one permission for all edit sub-actions) |
| `groups.edit.visibility` | `set_group_visibility` | Exact |
| `groups.edit.member_list_visibility` | `control_member_list_visibility` | Exact |
| `groups.delete` | `delete_group` | Exact |
| `members.invite.*` | `invite_members` | Exact |
| `members.remove` | `remove_members` | Exact |
| `members.activate` | `activate_members` | Exact |
| `members.pause` | `pause_members` | Exact |
| `members.view.list` | `view_member_list` | Exact |
| `members.view.roles` | `view_member_profiles` | Close (profiles includes roles) |
| `roles.assign.*` | `assign_roles` | Coarse (doesn't distinguish which role) |
| `roles.remove` | `remove_roles` | Exact |
| `enrollments.enroll.group` | `enroll_group_in_journey` | Exact |
| `enrollments.enroll.individual` | `enroll_self_in_journey` | Exact |
| `enrollments.unenroll` | `unenroll_from_journey` | Exact |
| `enrollments.freeze` | `freeze_journey` | Exact |
| `enrollments.progress.play` | `view_journey_content` | Close |
| `enrollments.progress.complete_step` | `complete_journey_activities` | Close |
| `enrollments.progress.view` | `view_own_progress` | Exact |
| `enrollments.progress.view_others` | `view_others_progress` | Exact |
| `enrollments.progress.track_group` | `view_group_progress` | Exact (renamed from `track_group_progress`) |
| `communication.forum.*` | `view_forum`, `post_forum_messages`, `reply_to_messages`, `moderate_forum` | Exact |
| `communication.messaging.send` | `send_direct_messages` | Exact |
| `feedback.provide` | `provide_feedback_to_members` | Exact |
| `feedback.receive` | `receive_feedback` | Exact |
| `admin.platform.*` | `manage_platform_settings`, `manage_all_groups`, `manage_role_templates`, `manage_group_templates`, `view_platform_analytics` | Exact |
| `journeys.manage.*` | `create_journey`, `edit_journey`, `publish_journey`, `unpublish_journey`, `delete_journey` | Exact |
| `journeys.browse.*` | `browse_journey_catalog` | Added in D22 |
| `groups.browse_public` | `browse_public_groups` | Added in D22 |

### Activities Without Dedicated Permissions

| Activity | Notes |
|----------|-------|
| `groups.create` | Any authenticated user can create; controlled at platform level |
| `groups.leave` | Unrestricted for members; handled by `leave_group()` RPC |
| `groups.view.details` | Tied to membership/public via RLS; no permission needed |
| `members.invitation.accept/decline` | User-scoped (always own invitations); no permission needed |
| `roles.manage.*` | Deferred to Phase 2 (custom role creation) |
| `enrollments.progress.navigate/resume` | Implicit in having access to the journey player |
| `communication.messaging.view/manage` | Not yet implemented |
