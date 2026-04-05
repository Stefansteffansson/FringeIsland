# D15: Universal Group Pattern Migration

**Status:** COMPLETE
**Version:** v0.2.29 (schema rebuild) + v0.2.29-fix (residual fixes)
**Completed:** February 22, 2026
**Design Doc:** `docs/features/implemented/dynamic-permissions-system.md` (Decision D15)

---

## Overview

D15 is the schema-level implementation of the Universal Group Pattern from the RBAC design (22 decisions, D1-D22). The core change: **drop `user_id` from `group_memberships`** and use `member_group_id` only. Every user is represented by a personal group, and all relationships are group-to-group.

This was a breaking migration that touched the entire stack: database schema, RLS policies, all frontend queries, and all integration tests.

---

## What Changed

### Database (Schema Rebuild)

**71 incremental migrations → 5 consolidated migrations:**

| Migration | Purpose |
|-----------|---------|
| `20260221000000_drop_old_schema.sql` | Drop all old tables, functions, triggers |
| `20260222000000_rebuild_universal_group_pattern.sql` | Complete schema rebuild (74 KB) |
| `20260221221300_fix_users_select_policy.sql` | RLS policy fix for users table |
| `20260221222339_auto_link_role_templates.sql` | Auto-linking role templates |
| `20260221224330_fix_personal_group_myself_role.sql` | Personal group self-membership + "Myself" role |

**Post-rebuild addition:**
| `20260222131712_add_avatar_url_to_groups.sql` | Avatar support for groups |

**Key column renames across tables:**

| Table | Old Column | New Column |
|-------|-----------|------------|
| `group_memberships` | `user_id` | `member_group_id` |
| `group_memberships` | `added_by_user_id` | `added_by_group_id` |
| `user_group_roles` | `user_id` | `member_group_id` |
| `user_group_roles` | `assigned_by_user_id` | `assigned_by_group_id` |
| `groups` | `created_by_user_id` | `created_by_group_id` |
| `journey_enrollments` | `user_id` | _(removed — use `group_id` with personal group)_ |
| `journey_enrollments` | `enrolled_by_user_id` | `enrolled_by_group_id` |
| `forum_posts` | `author_id` | `author_group_id` |
| `direct_messages` | `sender_id` | `sender_group_id` |
| `notifications` | `recipient_id` | `recipient_group_id` |

**Terminology change:** "Group Leader" → "Steward" throughout.

### Frontend (28-Step Migration Plan)

All 26 files (28 steps) migrated. Organized by complexity:

**13 Simple | 7 Moderate | 5 Structural | 2 Major = 27 files total** (includes `route.ts`)

#### Step 0: Auth Foundation
| File | Change |
|------|--------|
| `lib/auth/AuthContext.tsx` | Exposes `personal_group_id` on `userProfile` |

#### Steps 1a-1d: Shared Libraries
| File | Change |
|------|--------|
| `lib/hooks/usePermissions.ts` | Uses `p_acting_group_id` with `personal_group_id` |
| `lib/notifications/NotificationContext.tsx` | `recipient_group_id`, `personal_group_id` |
| `lib/messaging/MessagingContext.tsx` | `sender_group_id`, `personal_group_id` |
| `lib/admin/admin-users-query.ts` | `personal_group_id` in admin queries |
| `app/api/admin/users/route.ts` | `personal_group_id` resolution |

#### Step 2: Navigation
| File | Change |
|------|--------|
| `components/Navigation.tsx` | `.eq('member_group_id', userProfile.personal_group_id)` |

#### Steps 3a-3h: Components
| File | Change |
|------|--------|
| `components/groups/GroupCreateForm.tsx` | `member_group_id`, `added_by_group_id`, `assigned_by_group_id`, creates "Steward" role |
| `app/groups/create/page.tsx` | Passes `personal_group_id` as `userId` |
| `components/groups/InviteMemberModal.tsx` | `member_group_id: invitedUser.personal_group_id` |
| `components/groups/AssignRoleModal.tsx` | `assigned_by_group_id` |
| `components/groups/RoleFormModal.tsx` | `member_group_id` in lockout check |
| `components/groups/forum/ForumSection.tsx` | `author_group_id`, `groups!author_group_id` join |
| `components/journeys/EnrollmentModal.tsx` | `enrolled_by_group_id`, `member_group_id` |
| `components/admin/GroupPickerModal.tsx` | `member_group_id` in membership queries |
| `components/admin/DeusexMemberList.tsx` | `member_group_id` interface |

#### Steps 4a-4b: Group Pages
| File | Change |
|------|--------|
| `app/groups/page.tsx` | `.eq('member_group_id', userProfile.personal_group_id)` |
| `app/invitations/page.tsx` | `member_group_id`, `added_by_group_id` |

#### Step 5: Group Detail (Major)
| File | Change |
|------|--------|
| `app/groups/[id]/page.tsx` | Full migration: membership queries, role queries, member display via `groups` table, last-Steward UI protection |

#### Steps 6a-6c: Journey Pages
| File | Change |
|------|--------|
| `app/my-journeys/page.tsx` | `group_id: userProfile.personal_group_id` for individual enrollment |
| `app/journeys/[id]/page.tsx` | Individual/group enrollment checks via `group_id` |
| `app/journeys/[id]/play/page.tsx` | Enrollment lookup via `group_id` |

#### Steps 7a-7d: Admin Pages
| File | Change |
|------|--------|
| `app/admin/layout.tsx` | `p_acting_group_id` permission check |
| `app/admin/page.tsx` | Full migration: `member_group_id`, `added_by_group_id`, `assigned_by_group_id`, `actor_group_id`, `sender_group_id` |
| `app/admin/deusex/page.tsx` | `groups!group_memberships_member_group_id_fkey` join |
| `app/admin/fix-orphans/page.tsx` | `created_by_group_id`, Steward terminology |

#### Steps 8a-8b: Messaging Pages
| File | Change |
|------|--------|
| `app/messages/page.tsx` | `sender_group_id`, `personal_group_id` lookups |
| `app/messages/[conversationId]/page.tsx` | `sender_group_id` in sends and display |

### Integration Tests

- 40+ test files updated with new column names
- 4 new type files added: `admin.ts`, `group.ts`, `messaging.ts`, `user.ts`

---

## Residual Fixes (Post-Migration)

Two issues found and fixed after the initial 28-step migration:

### Fix 1: `components/admin/AdminDataPanel.tsx` (not in original plan)
- **Problem:** Enrollment query joined via `users!journey_enrollments_user_id_fkey(full_name)` — FK no longer exists
- **Fix:** Replaced with `groups!journey_enrollments_group_id_fkey(name)` — works for both individual (personal group name) and group enrollments
- **Commit:** `bf7b076`

### Fix 2: `app/groups/[id]/page.tsx` (stale role name)
- **Problem:** Last-leader UI protection checked for `'Group Leader'` instead of `'Steward'` — X button showed for last Steward
- **Fix:** Updated both the filter and comparison to use `'Steward'`
- **Commit:** `bf7b076`

### Fix 3: Cosmetic terminology (found in audit)
- `app/my-journeys/page.tsx` line 399 — UI text "Group Leaders" → "Stewards"
- `app/admin/fix-orphans/page.tsx` lines 35/39 — comments "Group Leader" → "Steward"

---

## Verification

### Codebase-wide search (post-fix): Zero old patterns in production code

| Pattern | Result |
|---------|--------|
| `added_by_user_id` in app/components/lib | 0 matches |
| `assigned_by_user_id` | 0 matches |
| `'Group Leader'` in app/components/lib | 0 matches |
| `users!journey_enrollments` | 0 matches |
| `users!group_memberships` | 0 matches |
| `created_by_user_id` | 0 matches |
| `enrolled_by_user_id` | 0 matches |

---

## Git History

| Commit | Description |
|--------|-------------|
| `ce58227` | Schema rebuild — 71 migrations → 5 consolidated (143 files, 4,931+/929-) |
| `4ac03fc` | PROJECT_STATUS.md update for schema rebuild |
| `ba74674` | Frontend migration — Universal Group Pattern across 36 files |
| `bf7b076` | Fix D15 residuals — broken enrollment query + stale Steward check |

---

## Hardening (2026-02-23)

Post-migration hardening sprint that closed 7 gaps found in a full-stack audit.

### Track A — Security: `personal_group_id` Immutability

**Migration:** `20260223075926_protect_personal_group_id.sql`

New `BEFORE UPDATE` trigger on `public.users` that raises an exception if:
- `personal_group_id` is changed to a different UUID
- `personal_group_id` is set to NULL

Safe for existing triggers: `handle_new_user()` sets from NULL → UUID (allowed), `admin_hard_delete_user()` uses DELETE (trigger never fires).

**Tests:** `tests/integration/rbac/d15-hardening.test.ts` (3 tests)

### Track B — Test Coverage: Documenting Guarantees

| Test File | Tests Added | Behavior |
|-----------|------------|----------|
| `tests/integration/auth/signup.test.ts` | 1 | `personal_group_id` non-null after signup |
| `tests/integration/rbac/groups-join-groups.test.ts` | 4 | Engagement group as member + `has_permission()` with engagement group actor |
| `tests/integration/rbac/personal-groups.test.ts` | 2 | Myself role has zero permissions |
| `tests/integration/admin/deusex-bootstrap.test.ts` | 1 | Admin auth resolution chain (blocked by pre-existing fixture issue) |

### Track C — Stale Comments

Fixed 7 comments across 4 test files to reflect D15 column renames and Steward terminology. Renamed `travelGuideRole` → `guideRole` variable in deletion tests.

### Behavior Specs

- `docs/specs/behaviors/d15-hardening.md` — B-D15-001 through B-D15-005
- `docs/specs/behaviors/authentication.md` — Updated B-AUTH-001 criteria

---

## Reference

- **Pre-D15 schema snapshot:** `docs/database/schema-export-pre-d15.md`
- **RBAC design (D1-D22):** `docs/features/implemented/dynamic-permissions-system.md`
- **Archived migrations:** `supabase/migrations/archive/` (71 files)
- **RBAC design session notes:** `docs/planning/sessions/2026-02-11-rbac-design-complete.md`
