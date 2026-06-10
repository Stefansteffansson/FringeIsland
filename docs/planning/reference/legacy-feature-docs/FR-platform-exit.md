# Feature: Admin Platform Exit (Sprint 4)

**Version:** 0.2.36
**Status:** Implemented
**Sprint:** Sprint 4 — Platform Exit (Lifecycle Roadmap)
**Decision Reference:** D-R3 (admin-assisted, NOT self-service)

---

## Overview

Admin-assisted platform exit enables a platform administrator to remove a user from all engagement groups and decommission their account in a single action. This is the final sprint in the lifecycle feature roadmap.

## How It Works

1. Admin selects a user in the admin panel
2. Clicks "Exit Platform" button
3. Confirms the action via ConfirmModal
4. The `admin_exit_user_from_platform` RPC processes ALL engagement groups:
   - **L1 (Regular Leave):** User is a regular member → roles deleted, membership removed, non-public enrollments frozen
   - **L2 (Steward Handover):** User is the sole Steward → DeusEx gets membership + Steward role, pending invitations transferred, then user removed
   - **L3 (Group Closure):** User is the last member → group status set to 'closed', all enrollments frozen, non-public journeys transferred to DeusEx
5. User is decommissioned (`is_decommissioned = true`, `is_active = false`)
6. All auth sessions and refresh tokens are deleted (force logout)
7. Action logged to `admin_audit_log`

## Key Design Decisions

- **Admin-assisted only** (D-R3): No self-service "Leave FringeIsland" button. Users leave groups individually; admin handles final account decommission.
- **L4 (Stewardship Nomination) is always skipped:** Admin-initiated exit uses L2 (DeusEx handover) for sole Stewards, never L4 nomination. The user isn't present to pick nominees.
- **Single transaction:** All groups processed atomically. Either all succeed or none do.
- **Safety guards:** Cannot exit yourself, cannot exit already-decommissioned users, cannot exit DeusEx members (platform admins).

## RPC

```sql
admin_exit_user_from_platform(p_target_user_id UUID) → JSONB
```

**Returns:**
```json
{
  "success": true,
  "groups_exited": 3,
  "group_details": [
    { "group_id": "...", "group_name": "Team A", "scenario": "regular_leave" },
    { "group_id": "...", "group_name": "Team B", "scenario": "steward_handover" },
    { "group_id": "...", "group_name": "Solo Group", "scenario": "group_closure" }
  ],
  "decommissioned": true
}
```

## Behavior Specs

- **B-EXIT-001:** Group cascade (L1/L2/L3 per group)
- **B-EXIT-002:** Decommission + force logout after exit
- **B-EXIT-003:** Safety guards (self, decommissioned, admin)
- **B-EXIT-004:** Audit trail

See `docs/old_products/ferd/development/specs/platform-exit.md` for full specs.

## Test Coverage

**10 integration tests** in `tests/integration/admin/platform-exit.test.ts`:
- 4 safety guard tests (non-admin, self-exit, decommissioned, DeusEx member)
- 1 no-groups test (just decommissions)
- 3 single-group scenario tests (L1 regular leave, L2 steward handover, L3 group closure)
- 1 multi-group mixed scenario test
- 1 audit log verification test

## Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260228144747_sprint4_platform_exit.sql` | RPC definition |
| `tests/integration/admin/platform-exit.test.ts` | 10 integration tests |
| `docs/old_products/ferd/development/specs/platform-exit.md` | Behavior specifications |
| `lib/admin/action-bar-logic.ts` | Added `exit_platform` action |
| `components/admin/UserActionBar.tsx` | Added "Exit Platform" button label |
| `app/admin/page.tsx` | Added execute function + handleAction case |

## Cross-References

- **Leave Group Core (Sprint 2):** `docs/old_products/ferd/development/features/FR-leave-group-core.md` — L1/L2/L3 logic
- **Smart Notifications (Sprint 3):** `docs/old_products/ferd/development/features/AR-smart-notifications.md` — L4 nomination (not used here)
- **Lifecycle Roadmap:** `docs/planning/lifecycle-roadmap-decisions.md` — Sprint 4 scope
- **Admin Foundation:** `docs/old_products/ferd/development/features/AR-deusex-admin-foundation.md` — Admin panel architecture
