# Leave Group Core (Sprint 2)

**Status:** IMPLEMENTED
**Sprint:** 2 (Lifecycle Roadmap)
**Date:** February 28, 2026
**Completed:** February 28, 2026
**Version:** v0.2.34
**Phase:** 1.6 (Polish and Launch — lifecycle features)
**Dependencies:** Sprint 0 (v0.2.32) + Sprint 1 (v0.2.33) — both COMPLETE
**Related:** [Group Management](./group-management.md) | [Foundation Schema](./foundation-schema.md) | [Leave Group Review](../../archive/leave_group_feature_review.md)

---

## Context

Sprint 2 implements the core leave-group flows that do NOT require smart notifications. These are the scenarios where a member can leave immediately without an asynchronous nomination process. The `leave_group(p_group_id)` SECURITY DEFINER RPC handles all three scenarios automatically based on membership count and role status.

**Full spec:** `docs/archive/leave_group_feature_review.md`
**Roadmap decisions:** `docs/planning/lifecycle-roadmap-decisions.md`

---

## Scope

- **L1:** Regular member leaves engagement group
- **L2:** Sole Steward exits immediately to DeusEx (Track 2)
- **L3:** Group closure (last member leaves)

**NOT in scope:** Track 1 (stewardship nomination), smart notifications, platform exit.

---

## L1: Regular Member Leaves

**Trigger:** User clicks "Leave Group" button on group detail page.

**Preconditions:**
- User is an active member of the engagement group
- User does NOT hold the sole Steward role (or other Stewards exist)

**Actions:**
1. Confirmation dialog shown (with Non-Public Journey warning if applicable)
2. Non-public journey enrollments frozen (`status='frozen'`, `progress_data.frozen_reason='left_group'`)
3. Role assignments deleted (`user_group_roles`)
4. Membership row deleted (`group_memberships`)
5. Steward(s) notified via existing `notify_invitation_declined_or_member_change` trigger (`member_left` type)
6. Forum posts show "Former Member" (query-time, no data mutation)

**Note:** Roles are explicitly deleted by the RPC before membership deletion. `user_group_roles` does NOT cascade on membership deletion — it only cascades on group deletion.

---

## L2: Sole Steward -> DeusEx (Track 2)

**Trigger:** Sole Steward clicks "Leave Group" -> chooses "Hand to FringeIsland"

**Preconditions:**
- User is the sole Steward (only member with Steward role)
- Group has other active members (not last member — that's L3)

**Actions:**
1. Handover dialog shown (Track 2 option only for Sprint 2)
2. DeusEx added as member of group (`ON CONFLICT DO NOTHING` — idempotent)
3. DeusEx assigned Steward role in the group (`ON CONFLICT DO NOTHING` — idempotent)
4. Pending invitations transferred (`invited_by_group_id` -> DeusEx on `pending_email_invitations`)
5. Non-public journey enrollments frozen for leaving Steward
6. Leaving Steward's roles deleted, then membership deleted
7. All group members notified: `stewardship_transferred` — "FringeIsland has temporarily assumed stewardship"
8. DeusEx notified: `stewardship_required` — "[Group] requires a permanent Steward"

**Key detail:** Adding DeusEx as Steward BEFORE deleting the old Steward's roles means the `prevent_last_leader_removal` trigger sees 2 Stewards and allows the deletion. No trigger modification needed for L2.

---

## L3: Group Closure (Last Member Leaves)

**Trigger:** Last active member clicks "Leave Group"

**Preconditions:**
- User is the last active member in the group

**Actions:**
1. Warning: "Leaving will close this group"
2. `groups.status` set to `'closed'`
3. ALL journey enrollments for this group frozen (`frozen_reason='group_closed'`)
4. Non-public journeys (`is_public = false`) where `created_by_group_id = group_id` transferred to DeusEx
5. DeusEx notified with `group_closed` if orphaned non-public journeys exist
6. Role assignments deleted (trigger bypassed — group is `'closed'`)
7. Membership deleted

**Key detail:** The `prevent_last_leader_removal` trigger was updated to bypass when `groups.status = 'closed'`. The RPC sets status to `'closed'` BEFORE deleting roles, so the trigger allows it.

---

## Implementation Details

### `leave_group(p_group_id UUID)` RPC

**Type:** PLPGSQL, SECURITY DEFINER, SET search_path = ''

**Migration:** `supabase/migrations/20260228120745_sprint2_leave_group_core.sql`

**Flow:**
1. Get caller's personal group via `get_current_personal_group_id()`
2. Validate: must be an engagement group, status must be `'active'`, caller must be an active member
3. Count active members and check if caller is the sole Steward
4. Determine scenario:
   - `active_member_count = 1` -> `group_closure` (L3)
   - Sole Steward with other members -> `steward_handover` (L2)
   - Everything else -> `regular_leave` (L1)
5. Execute scenario-specific logic
6. Return JSONB: `{ "scenario": "...", "group_id": "...", "group_name": "...", ... }`

**GRANT:** `EXECUTE ON FUNCTION public.leave_group(UUID) TO authenticated`

### `prevent_last_leader_removal()` Trigger Update

Added closed-group bypass at the top of the function:

```sql
SELECT status INTO v_group_status FROM public.groups WHERE id = OLD.group_id;
IF v_group_status = 'closed' THEN
  RETURN OLD;
END IF;
```

This allows role deletion when a group is being closed (L3 scenario).

### Notification Types Created by RPC

> These types are also registered in the [Notification System — Sprint 2 Types](./notification-system.md).

| Type | Scenario | Recipient | Message |
|------|----------|-----------|---------|
| `stewardship_transferred` | L2 | All group members | "FringeIsland has temporarily assumed stewardship of [Group]." |
| `stewardship_required` | L2 | DeusEx | "[Group] requires a permanent Steward. Please review and assign." |
| `group_closed` | L3 (with orphaned journeys) | DeusEx | "[Group] has been closed. [N] non-public journey(s) require review." |
| `member_left` | L1/L2 | Steward(s) | (via existing membership deletion trigger) |

### Forum Anonymisation

No data mutation occurs. The `forum_posts.author_group_id` is never changed. At query time:
- If `author_group_id` references an active member -> display their personal group `name`
- If `author_group_id` is no longer an active member -> display "Former Member"
- If `author_group_id` points to `[Deleted User]` sentinel -> display "[Deleted User]"

This is a display-layer concern handled by ForumSection component's membership check.

---

## Behaviors & Testing

### Behavior Specs

- `docs/specs/behaviors/groups.md` — B-GRP-008 (Regular Leave), B-GRP-009 (DeusEx Handover), B-GRP-010 (Group Closure)

### Integration Tests

**File:** `tests/integration/groups/leave-group.test.ts` — 17 tests

**L1 tests (7):**
- Regular member can leave engagement group
- Roles are cascade-deleted when member leaves
- Non-public journey enrollments are frozen on leave
- Public journey enrollments are NOT frozen
- Cannot leave personal group (rejected)
- Cannot leave group if not a member (rejected)
- Steward is notified when member leaves

**L2 tests (4):**
- Sole Steward leave -> DeusEx gets membership + Steward role
- Pending invitations transferred to DeusEx
- All members notified of stewardship transfer
- Multi-Steward group -> regular leave (not handover)

**L3 tests (6):**
- Last member leave -> group status set to `'closed'`
- All group enrollments frozen with `group_closed` reason
- Non-public journeys transferred to DeusEx
- Public journeys NOT transferred
- DeusEx notified of orphaned non-public journeys
- Sole Steward who is also last member -> group closure (not handover)

### Test Results

- 17/17 new tests passing
- 630/630 full suite GREEN, zero regressions

---

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260228120745_sprint2_leave_group_core.sql` | `leave_group()` RPC + trigger update |
| `tests/integration/groups/leave-group.test.ts` | 17 integration tests |
| `docs/specs/behaviors/groups.md` | B-GRP-008, B-GRP-009, B-GRP-010 |
| `docs/archive/leave_group_feature_review.md` | Full design spec (archived) |
| `docs/planning/lifecycle-roadmap-decisions.md` | Sprint structure and decisions |

---

## Known Limitations

1. **No UI yet** — the `leave_group()` RPC is tested but no frontend button/modal exists. UI will be built as a follow-up.
2. ~~**No Track 1 (stewardship nomination)**~~ — **RESOLVED (v0.2.35, Sprint 3).** `nominate_steward()` RPC, smart notifications with Accept/Decline, sequential nominees, 7-day expiry, DeusEx fallback. See [smart-notifications.md](./smart-notifications.md).
3. ~~**No platform exit**~~ — **RESOLVED (v0.2.36, Sprint 4).** `admin_exit_user_from_platform()` RPC cascades leave across all engagement groups (L1/L2/L3 per group), decommissions user, force-logs-out. See [platform-exit.md](./platform-exit.md).
4. **Forum "Former Member" display** — the query-time membership check needs to be implemented in the `ForumSection` component. Currently, ex-member posts still show the author's display name.
5. **Enrollment unfreezing on rejoin** — not yet implemented. When a member rejoins a group, frozen enrollments are not automatically restored to `'active'`.

---

## Out of Scope

- ~~Track 1 stewardship nomination flow~~ — **IMPLEMENTED (v0.2.35, Sprint 3).** See [smart-notifications.md](./smart-notifications.md).
- ~~Smart notification schema and UI~~ — **IMPLEMENTED (v0.2.35, Sprint 3).** See [smart-notifications.md](./smart-notifications.md).
- ~~Platform exit cascade (Sprint 4)~~ — **IMPLEMENTED (v0.2.36, Sprint 4).** See [platform-exit.md](./platform-exit.md).
- Self-service account deletion
- Group-joins-group leave flows (Wave 2 (Hamn))

---

## Version History

- **v0.2.36** (2026-02-28): Platform exit implemented in Sprint 4 — `admin_exit_user_from_platform()` RPC cascades L1/L2/L3 across all engagement groups, decommissions user, force-logs-out. Known Limitation #3 resolved. See [platform-exit.md](./platform-exit.md).
- **v0.2.35** (2026-02-28): Track 1 stewardship nomination implemented in Sprint 3 — `nominate_steward()` RPC, smart notifications, sequential nominees, DeusEx fallback. Known Limitation #2 resolved. See [smart-notifications.md](./smart-notifications.md).
- **v0.2.34** (2026-02-28): Sprint 2 complete — `leave_group()` RPC (L1 + L2 + L3), `prevent_last_leader_removal` trigger update for closed groups, 17 integration tests, 3 behavior specs (B-GRP-008, B-GRP-009, B-GRP-010).
