# FringeIsland — Feature Discussion Review
## Leave Group & Steward Handover Flow
*February 2026 | Draft for Review*

---

## 1. Purpose of This Document

This document summarises the feature discussion regarding the Leave Group and Steward Handover flow for the FringeIsland platform. It is intended as a review document prior to writing a formal BDD/TDD specification for implementation.

Topics not yet fully resolved are flagged explicitly. Related features identified during discussion are also noted.

---

## 2. Scope

This feature covers the following user-initiated actions:

- A group member leaving an engagement group entirely
- A Steward (sole leader) leaving an engagement group with mandatory handover
- A user leaving the FringeIsland platform entirely (platform exit)

The following is explicitly **OUT of scope** for this feature:

- Stepping down as Steward while remaining a group member (separate feature, separate entry point)
- The DeusEx admin backlog/dashboard (flagged as related feature)

---

## 3. Architectural Context

Key architectural facts relevant to this feature:

- The permission system is fully group-based. Authentication only establishes identity. All permissions flow through roles assigned to groups.
- Every user has a **personal group** (`users.personal_group_id`), auto-created on signup. It is the personal group that joins engagement groups — not the user directly.
- `group_memberships` uses `member_group_id` (not `user_id`). The personal group's ID is used as `member_group_id` when joining an engagement group.
- The personal group `name` field is the single source of truth for display identity. It may contain a nickname or real name depending on `users.display_preference` (see `docs/features/planned/display-name-system.md`).
- Three group types exist: `'system'` (DeusEx, FringeIsland Members), `'personal'` (one per user), `'engagement'` (user-created groups).
- **Group lifecycle** is managed via a new `groups.status` column (see Section 3.1 below). Groups are never hard-deleted — they transition through statuses.
- The role formerly known as Group Leader has been **renamed to Steward** in the D15 migration.
- **DeusEx** is a system group with a super-admin role (named `deusex`) holding all permissions platform-wide. It serves as the last-resort fallback for group stewardship.
- Last-leader (Steward) protection is already enforced at the database level via trigger (`prevent_last_leader_removal` on `user_group_roles`).
- All stewardship handover nominations are restricted to existing FringeIsland users only (existing group members or other platform users). No off-platform email invitations are permitted in the handover flow.
- **Smart notifications** are internal FringeIsland notifications (not emails) that include embedded action logic — e.g. Yes/No decisions, or multiple choice actions. They extend the existing notification system (v0.2.14, 7 notification types, Realtime push, database triggers, bell UI).

### 3.1 Group Status Column (NEW — schema change required)

The `groups` table currently has no lifecycle management. This feature requires a new `status` column:

```sql
ALTER TABLE groups
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'closed', 'suspended'));

-- Partial index for fast RLS filtering (common case)
CREATE INDEX idx_groups_status_active ON groups(id) WHERE status = 'active';
```

| Status | Meaning | Set By | Reversible? |
|--------|---------|--------|-------------|
| `active` | Normal operation | Default on creation | — |
| `closed` | Last member left — group is empty | System (leave group flow) | Yes — if a member rejoins (e.g., via DeusEx assigning a new Steward) |
| `archived` | Admin chose to archive — read-only, content preserved | DeusEx admin | Yes — admin can reactivate |
| `suspended` | Admin suspended for moderation — hidden from members | DeusEx admin | Yes — admin can lift suspension |

**RLS impact:** All existing `groups` SELECT policies gain an additional `AND status = 'active'` condition for non-admin users. Admin/DeusEx users can see all statuses. Performance impact is negligible — a single indexed equality check (see performance discussion in project notes).

**On last member leaving:** `UPDATE groups SET status = 'closed' WHERE id = <group_id>`

**On admin archive:** `UPDATE groups SET status = 'archived' WHERE id = <group_id>`

**On reactivation:** `UPDATE groups SET status = 'active' WHERE id = <group_id>`

### Tables Affected by Leave Group

| Table | Impact | FK Behavior |
|-------|--------|-------------|
| `groups` | Status set to `'closed'` when last member leaves. No row deletion. | — |
| `group_memberships` | Membership row removed (personal group leaves engagement group) | CASCADE on `member_group_id` |
| `user_group_roles` | Role assignments removed (Steward, Member, etc.) | CASCADE on `member_group_id` |
| `forum_posts` | `author_group_id` retained — display name resolved at query time via membership check | SET NULL on delete of personal group |
| `journey_enrollments` | Group enrollments (`group_id` = engagement group) unaffected. Individual enrollments (`group_id` = personal group) unaffected. Non-public Journey enrollments set to `status = 'frozen'` for the leaving member (read-only access). |  |
| `journeys` | Non-Public Journeys (`is_public = false`) created by the engagement group transferred to DeusEx on group closure only | `created_by_group_id` ON DELETE RESTRICT |
| `pending_email_invitations` | If last Steward leaves without waiting for handover, `invited_by_group_id` transferred to DeusEx for any pending invitations in this group | SET NULL on delete of personal group |
| `notifications` | Notifications addressed to `recipient_group_id` (personal group) persist | CASCADE on delete of personal group |
| `conversations` | Between personal groups — not tied to engagement groups, unaffected by leaving | CASCADE on delete of personal group |
| `direct_messages` | `sender_group_id` preserved | SET NULL on delete of personal group |
| `admin_audit_log` | Should log stewardship transfers and group departures | SET NULL on `actor_group_id` |

---

## 4. Leave Group Flow

This flow is triggered exclusively when a user clicks the **"Leave Group"** button. It is not the entry point for stepping down as Steward while remaining a member.

### 4.1 Entry Point Decision Tree

| Condition | Sub-condition | Outcome |
|-----------|---------------|---------|
| User is the **last member** in the group | — | Warn: *"Leaving will close this group."* On confirm → `groups.status` set to `'closed'` → Non-Public Journeys created by the engagement group transferred to DeusEx → DeusEx backlog smart notification → exit completes |
| User does **not** hold the Steward role | — | Simple confirmation dialog (includes Non-Public Journey warning if applicable — see Section 7.5) → exit completes → anonymisation triggers → Non-Public Journey enrollments frozen → Steward(s) notified |
| User holds the Steward role AND **other Stewards exist** | — | Simple confirmation dialog (includes Non-Public Journey warning if applicable — see Section 7.5) → exit completes → anonymisation triggers → Non-Public Journey enrollments frozen → Steward(s) notified |
| User is the **sole Steward** | — | Handover dialog presented. User must choose Track 1 or Track 2 before exit can proceed |

### 4.2 Sole Steward — Handover Dialog

When the leaving user is the sole Steward, the system presents a dialog:

> *"You are the sole Steward of this group. Stewardship must be transferred before you can leave. What would you like to do?"*

- **Option A** — Nominate a successor → Track 1
- **Option B** — Hand Stewardship to FringeIsland (DeusEx) immediately → Track 2

### 4.3 Track 1 — Nominate a Successor

The leaving Steward nominates one or more people as a **ranked list**. Invitations are sent sequentially in ranked order — the next invitation is only sent after the previous is declined or has timed out.

Nominees must be existing FringeIsland users and can be:
- **Existing group members** → they receive a smart notification (Yes/No) to accept the Steward role
- **Other FringeIsland users** not yet in the group → they receive a smart notification (Yes/No) to join the group AND receive the Steward role simultaneously on acceptance

The leaving Steward also chooses at this point whether to:
- **Leave now** → DeusEx holds stewardship temporarily while the system works through the nominee list in the background
- **Stay until handover complete** → Steward retains stewardship and remains available for handover conversations until a nominee accepts or the full list is exhausted

> **Note (Leave Now):** The incoming Steward will not have the opportunity for a handover conversation with the outgoing Steward in this mode, as the outgoing Steward has already left.

If the leaving member is enrolled in any Non-Public Journeys, the confirmation dialog includes:

> *"You are enrolled in [X] Non-Public Journey(s) in this group. Your progress will be preserved in read-only mode after leaving. If you rejoin this group in the future, full access will be automatically restored."*

#### Track 1A — Nominee Accepts

**If Steward chose "Leave now":**
- Steward's membership was already removed and anonymisation already triggered at departure
- DeusEx was holding stewardship temporarily
- Nominee accepts → stewardship transfers from DeusEx to nominee
- Leaving Steward notified: *"Your exit from [Group] is now complete. [Nominee] is the new Steward."*
- All group members notified: *"[Nominee] has been appointed as the new Steward of [Group]."*

**If Steward chose "Stay until handover complete":**
- Nominee accepts → stewardship transfers from leaving Steward to nominee
- Exit now completes → membership removed → anonymisation triggers
- Leaving Steward notified: *"Your exit from [Group] is now complete. [Nominee] is the new Steward."*
- All group members notified: *"[Nominee] has been appointed as the new Steward of [Group]."*

#### Track 1B — Nominee Declines or Timeout Expires (Steward Returns)

**If Steward chose "Leave now":**
- Steward has already left — notification is sent to their personal group
- Smart notification: *"Your nomination was not accepted. Would you like to nominate someone else, or hand Stewardship to FringeIsland?"*
- Steward actively chooses: nominate another person (→ new cycle) OR opt out to DeusEx (→ DeusEx keeps stewardship permanently)

**If Steward chose "Stay until handover complete":**
- Same smart notification sent
- Steward actively chooses: nominate another person (→ new cycle) OR opt out to DeusEx (→ Track 2 logic, exit completes)

#### Track 1C — Nominee Declines or Timeout Expires (Steward Goes Absent)
- Same trigger as 1B — decline or timeout
- Steward is notified via smart notification but never responds
- A second, longer timeout elapses
- **If Steward chose "Leave now":** DeusEx was already holding stewardship — it becomes permanent. No further action needed.
- **If Steward chose "Stay until handover complete":** System transfers stewardship to DeusEx → exit completes → membership removed → anonymisation triggers silently
- All group members notified: *"FringeIsland has temporarily assumed stewardship of this group."*
- DeusEx backlog receives smart notification: *"[Group] requires a permanent Steward. Please review and assign."*

> ⚑ **OPEN:** Timeout durations for Track 1 (invitation acceptance window) and Track 1C (absence window) are not yet defined. To be decided — consider whether these should be platform-wide configurable values.

### 4.4 Track 2 — Immediate DeusEx Handover

The leaving Steward chooses to hand Stewardship to DeusEx immediately with no nomination process.

- Stewardship transfers to DeusEx instantly
- Exit completes immediately
- Anonymisation triggers
- All group members notified: *"FringeIsland has temporarily assumed stewardship of this group."*
- DeusEx backlog receives smart notification: *"[Group] requires a permanent Steward. Please review and assign."*

### 4.5 Pending Invitations on Steward Exit

When the last Steward leaves a group (via Track 1 "Leave now", Track 2, or Track 1C timeout), any pending invitations in the group must be preserved:

- **`group_memberships`** rows with `status = 'invited'`: Update `added_by_group_id` from the leaving Steward's personal group to the DeusEx system group
- **`pending_email_invitations`** rows with `status = 'pending'`: Update `invited_by_group_id` from the leaving Steward's personal group to the DeusEx system group

This ensures invitations remain valid and can still be accepted. The invitation now shows as sent by "FringeIsland" (DeusEx) rather than the departed Steward.

> **Note:** No emails are ever sent as part of the leave group flow. All invitation and nomination communications are internal FringeIsland notifications only.

> **Note:** When DeusEx takes stewardship of a living group (Track 2 or Track 1C), Non-Public Journeys remain with the group untouched. DeusEx holds stewardship temporarily — the group and its content continue to exist normally.

---

## 5. Platform Exit Flow

When a user chooses to leave the FringeIsland platform entirely, a different flow applies. The user may be a Steward in multiple groups simultaneously. No additional platform-exit-specific notifications are sent — the standard per-group notification logic (Track 1/2) runs for each affected group and handles all member communications.

> **Note — Account state on platform exit:** This document covers only the group-leaving and stewardship-handover aspects of platform exit. The account lifecycle itself (soft delete, decommission, hard delete, data retention) is specified separately in the authentication/account management feature documentation. See `docs/features/implemented/authentication.md` or a future dedicated platform exit feature doc.

### 5.1 Disengaged Exit

The user simply wants out with no further involvement.

- All stewardships across all groups transfer directly to DeusEx immediately
- User is free immediately
- DeusEx backlog receives items for each affected group
- Anonymisation triggers across all groups

### 5.2 Engaged Exit — Leave Now

The user cares about their groups but wants immediate freedom.

- User submits ranked nominee lists for all stewarded groups
- DeusEx takes stewardship immediately across all groups → user is free
- System continues working through nominee lists in background (Track 1 logic per group)
- If a nominee accepts → stewardship transfers from DeusEx to them

> **Note:** The incoming Steward will not have the opportunity for a handover conversation with the outgoing Steward in this mode, as the outgoing Steward has already left.

### 5.3 Engaged Exit — Stay Until Handover Complete

The user wants to ensure a proper handover for each group.

- User submits ranked nominee lists for all stewarded groups
- User retains stewardship across all groups while the system works through lists
- User remains available for handover conversations with incoming Stewards
- DeusEx only gets involved per group if the full nominee list for that group is exhausted (Track 1B/1C)
- User is fully free only when all groups have a confirmed Steward OR have fallen back to DeusEx

---

## 6. Forum Post Anonymisation

### 6.1 Scope

- Anonymisation applies only within the group the member's personal group has left
- The member retains their display name (resolved from their personal group `name` — may be a nickname or real name depending on their `display_preference`) in all other groups where they remain an active member
- See `docs/features/planned/display-name-system.md` for the display name resolution model

### 6.2 Implementation Approach — Soft Flag (Option B)

Forum posts store the `author_group_id` (the personal group ID of the author) at the time of posting. This value is **never changed**.

The display name is derived at query time by checking current membership status:

- `author_group_id` is an active member of this group → display the author's display name (resolved from their personal group `name`)
- `author_group_id` is no longer an active member → display **"Former Member"**

This means:
- No mutation of forum post data is required when a member leaves
- If a member's personal group rejoins the same engagement group, their display name is automatically restored — no additional work required
- Hard account deletion uses `ON DELETE SET NULL` on the `author_group_id` foreign key (already implemented) — posts survive with "Former Member" attribution permanently

### 6.3 Coverage

- All references to the leaving member's personal group within the engagement group — posts, replies, quotes — display as "Former Member"
- Post content is preserved unchanged. Only the attribution (display name) changes.
- Direct messages and conversations are **unaffected** by leaving an engagement group — they exist between personal groups, not within engagement groups

### 6.4 Timing

- Anonymisation takes effect at the exact moment the membership record is removed from the database

> ⚑ **OPEN — GDPR / Right to Erasure:** If a user hard-deletes their account, should post content also be erased (truly anonymous empty posts) or only the attribution? This is a legal/policy decision to be resolved before implementation.

> ✅ **RESOLVED — Forum schema:** Forum tables were built in the D15 Universal Group Pattern rebuild (v0.2.29). The `forum_posts` table already has `author_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL`. The display-layer logic (membership check at query time) needs to be implemented in the `ForumSection` component.

---

## 7. Journey Access on Exit

### 7.1 Journey Types

| Journey Type | Created By | `is_public` | Access After Leaving Group |
|-------------|------------|-------------|---------------------------|
| Platform journey | **"FringeIsland Journeys"** engagement group | `true` | Unaffected — full access retained |
| Group-created public journey | Any engagement group | `true` | Unaffected — full access retained |
| **Non-Public Journey** | Engagement group | `false` | Read-only (`frozen` status). Further engagement locked. |
| Personal journey | Personal group | either | Unaffected — not tied to engagement group |

> **Note — Platform journeys ownership:** The 8 predefined journeys are currently owned by an arbitrary user's personal group (legacy from pre-D15 seed migration). These need to be migrated to a new **"FringeIsland Journeys"** engagement group (`group_type = 'engagement'`) with `is_public = true`. This group serves as the canonical owner for all platform-provided journeys. Migration: create group → update `journeys.created_by_group_id` for all predefined journeys → set `is_public = true` on all.

### 7.2 Non-Public Journeys — Detail

A **Non-Public Journey** is any journey where `journeys.is_public = false`. In practice, these are journeys created by an engagement group for its own members — they do not appear in the general platform catalog.

**Schema definition:** `journeys.is_public = false` — no additional column needed. The `created_by_group_id` determines ownership.

**Enforcement mechanism:** On exit from the engagement group, the leaving member's enrollment status is set to `journey_enrollments.status = 'frozen'`:
- The `'frozen'` status already exists in the CHECK constraint: `CHECK (status IN ('active', 'completed', 'paused', 'frozen'))`
- The UI/application layer treats `'frozen'` as read-only: the member can view their progress, responses, reflections, and completed activities, but cannot continue incomplete steps, post in journey discussions, or access content not yet unlocked
- RLS policies and/or application-layer checks enforce the read-only constraint based on enrollment status
- If the member **rejoins** the same engagement group, `status` is updated from `'frozen'` back to `'active'` — they continue from where they left off with no data loss

> **Note — strategic extensibility:** The `'frozen'` status is intentionally generic. It can be reused for other scenarios where a member's journey engagement needs to be locked (e.g., moderation action, payment lapse, group suspension). The triggering reason should be tracked in `journey_enrollments.progress_data` JSONB (e.g., `{ "frozen_reason": "left_group", "frozen_at": "..." }`) so the UI can display context-appropriate messaging.

### 7.3 Non-Public Journeys on Group Closure

When the last member leaves an engagement group (`groups.status` → `'closed'`):
- **All `journey_enrollments` where `group_id` = the closed engagement group** are set to `status = 'frozen'` with `progress_data` updated to include `{ "frozen_reason": "group_closed", "frozen_at": "..." }`
- **Non-Public Journeys created by the engagement group** are transferred to DeusEx (`journeys.created_by_group_id` → DeusEx)
- DeusEx backlog receives a smart notification to review and decide the fate of orphaned journeys (repurpose, publish to catalog, or delete)
- **Journeys created by personal groups** are unaffected — they belong to the individual user, not the engagement group

### 7.4 Non-Public Journeys Under DeusEx Stewardship

When DeusEx takes stewardship of a living group (Track 2 or Track 1C), Non-Public Journeys remain with the group untouched. The group continues to exist normally — only the Steward has changed.

### 7.5 Confirmation Dialog Note

If the leaving member is enrolled in any Non-Public Journeys, the leave group confirmation dialog includes:

> *"You are enrolled in [X] Non-Public Journey(s) in this group. Your progress will be preserved in read-only mode after leaving. If you rejoin this group in the future, full access will be automatically restored."*

---

## 8. Notification Map

All notifications are internal FringeIsland notifications — no emails. **Smart notifications** include embedded action logic (Yes/No or multiple choice).

| Event | Recipient | Type | Message |
|-------|-----------|------|---------|
| Regular member exits group | Group Steward(s) | Standard | *"[Member] has left the group."* |
| Steward nomination sent (Track 1) | Nominee | Smart (Yes/No) | *"[Steward] has nominated you as Steward of [Group]. Do you accept?"* |
| Exit complete — nomination accepted (Track 1A) | Leaving Steward | Standard | *"Your exit from [Group] is now complete. [Nominee] is the new Steward."* |
| New Steward appointed (Track 1A) | All group members | Standard | *"[Nominee] has been appointed as the new Steward of [Group]."* |
| Nomination declined OR timeout (Track 1B/1C) | Leaving Steward | Smart (Try again / Hand to DeusEx) | *"Your nomination was not accepted. Would you like to nominate someone else, or hand Stewardship to FringeIsland?"* |
| DeusEx takes stewardship (Track 1C, Track 2) | All group members | Standard | *"FringeIsland has temporarily assumed stewardship of this group."* |
| DeusEx takes stewardship (Track 1C, Track 2) | DeusEx | Smart (backlog item) | *"[Group] requires a permanent Steward. Please review and assign."* |
| Group closed (last member left) — orphaned Non-Public Journeys | DeusEx | Smart (backlog item) | *"[Group] has been closed. [X] Non-Public Journey(s) require review."* |
| Group closed (last member left) — no orphaned journeys | — | No notification | Logged only (see note below) |

> **Note — Group closure logging:** Simple group closures (no orphaned Non-Public Journeys) do not notify DeusEx. However, these events should be recorded. The platform currently has `admin_audit_log` for admin-initiated actions only. A general-purpose **event log** or **activity log** does not yet exist. Consider whether group closures (and other user-initiated lifecycle events) should be recorded in `admin_audit_log` with a system actor, or in a future dedicated event log table. This is a cross-cutting concern that affects multiple features beyond leave-group.

---

## 9. Topics Not Yet Fully Resolved

- **Timeout durations:** Track 1 invitation acceptance window and Track 1C absence window not yet defined. Consider platform-wide configurable values.
- **GDPR / Right to Erasure:** On hard account delete, should post content be erased or only attribution? Legal/policy decision required.
- ✅ **RESOLVED — `[Deleted User]` sentinel group created:** Migration `20260227120843_seed_deleted_user_sentinel_group.sql` seeds the `[Deleted User]` system group (`group_type = 'system'`, `is_public = false`). The `admin_hard_delete_user` RPC now correctly reassigns `forum_posts.author_group_id`, `journeys.created_by_group_id`, and `groups.created_by_group_id` to this sentinel before deleting the personal group.
- **Conversations on platform exit (hard delete):** `conversations` reference personal groups as `participant_1`/`participant_2` with `ON DELETE CASCADE` — conversations are **deleted** when a personal group is hard-deleted. Consider whether conversations should be reassigned to `[Deleted User]` to preserve message history for the other participant. For platform exit with soft delete (`is_active = false`), the personal group survives and conversations are unaffected.
- **Journey frozen enforcement detail:** The `'frozen'` status on `journey_enrollments` is confirmed as the mechanism. Remaining: which UI surfaces need frozen-state checks, and whether RLS policies should also enforce it or if application-layer only is sufficient.
- **"FringeIsland Journeys" group creation:** The 8 predefined journeys need migrating from their current owner (arbitrary user's personal group) to a new "FringeIsland Journeys" engagement group. Migration to be written.
- ✅ **RESOLVED — Group lifecycle:** New `groups.status` column with values: `'active'`, `'closed'`, `'archived'`, `'suspended'`. Last member leaving sets status to `'closed'`. See Section 3.1. Migration to be written.
- **Event logging for user-initiated actions:** `admin_audit_log` exists for admin actions, but no general event log covers user-initiated lifecycle events (group closures, member departures, stewardship transfers). Cross-cutting concern — may warrant a dedicated `event_log` or `activity_log` table in a future sprint.

---

## 10. Related Features to Develop Separately

> → **RELATED FEATURE: DeusEx Admin Backlog / Dashboard**
> A platform admin task queue is needed for DeusEx users to manage groups and Non-Public Journeys that have landed under DeusEx stewardship. Should include: priority/urgency indicators, group context (size, active journeys, member count), and action options (promote a member to Steward, reach out to members, archive group, repurpose or publish orphaned Non-Public Journeys).

> → **RELATED FEATURE: Step Down as Steward (Remain as Member)**
> A user may want to give up the Steward role without leaving the group. This shares the same handover logic as Leave Group but has a different outcome (user stays as regular member). Requires a separate entry point — e.g. from a "Manage My Role" section.

> → **RELATED FEATURE: Display Name / Nickname System**
> See `docs/features/planned/display-name-system.md`. Users can set a nickname and toggle between displaying their real name or nickname platform-wide. The personal group `name` is the single source of truth for display identity, synced via database trigger. Currently in planning (Phase 1.6). This feature affects how "Former Member" vs. display name resolution works in the anonymisation logic.

---

## 11. Key Decisions Made

| Decision | Resolution |
|----------|------------|
| What is "Steward"? | The renamed Group Leader role. Last-leader protection already enforced at DB level. |
| What is DeusEx? | System group with super-admin role (`deusex`). Last-resort fallback for stewardship. |
| DeusEx transfer — deliberate or automatic? | Always a deliberate choice (Track 2) OR automatic after Track 1C absence timeout. |
| Ranked nominee list? | Yes. Sequential — next invite sent only after previous is declined or timed out. |
| Who can be nominated? | Existing group members OR other FringeIsland platform users. No off-platform invitations. |
| Can nominees be outside the group? | Yes. Outside nominees join the group AND receive Steward role simultaneously on acceptance. |
| Last member in group? | `groups.status` set to `'closed'`. Non-Public Journeys created by the engagement group transferred to DeusEx. |
| Group lifecycle mechanism? | New `groups.status` column: `'active'`, `'closed'`, `'archived'`, `'suspended'`. No hard deletes. RLS filters non-active groups for regular users. Indexed with partial index. |
| Non-Public Journeys under DeusEx stewardship (living group)? | Journeys remain with the group untouched. Only Steward has changed. |
| Forum anonymisation scope? | Only within the group left. Display name preserved in all other groups. |
| Forum anonymisation approach? | Soft flag (Option B) — derived from membership status at query time. No data mutation. Forum schema already built (D15). |
| Forum anonymisation timing? | Exact moment membership record is removed from the database. |
| Rejoin restores display name? | Yes — automatically, at no extra coding cost due to Option B approach. |
| Post content on leave? | Preserved unchanged. Only attribution changes to "Former Member". |
| Journey access — platform & public journeys? | Unaffected by leaving a group. |
| Journey access — Non-Public Journeys? | Read-only via `journey_enrollments.status = 'frozen'`. Reason tracked in `progress_data` JSONB. Auto-restored to `'active'` on rejoin. |
| "Private journey" terminology? | Renamed to **"Non-Public Journey"** — defined as `journeys.is_public = false`. |
| Frozen status — strategic? | Yes. `'frozen'` is generic and reusable for moderation, payment, suspension scenarios. |
| Platform journeys ownership? | New **"FringeIsland Journeys"** engagement group. Predefined journeys migrated from arbitrary personal group. |
| Pending invitations on Steward exit? | `added_by_group_id` and `invited_by_group_id` transferred to DeusEx. Invitations remain valid. |
| `[Deleted User]` sentinel? | System group used by `admin_hard_delete_user` to reassign content from deleted personal groups. Seeded via migration `20260227120843`. |
| Notifications — email or internal? | Internal FringeIsland notifications only. No emails sent during leave/exit flows. |
| Smart notifications? | Standard notifications with embedded action logic (Yes/No or multiple choice). |
| Platform exit notifications? | No additional platform-exit-specific notifications. Per-group Track 1/2 logic handles all member communications. |
| Platform exit account state? | Out of scope for this doc. Covered in authentication/account management feature documentation. |
| Group closure without orphaned journeys? | No DeusEx notification. Logged only. General event logging is a cross-cutting concern to be addressed separately. |
| Group enrollments on closure? | All `journey_enrollments` for the closed group set to `'frozen'` with `frozen_reason: 'group_closed'` in `progress_data`. |

---

*This document reflects a design discussion only. It is not a final specification. Topics marked ⚑ require resolution before BDD scenarios can be written.*