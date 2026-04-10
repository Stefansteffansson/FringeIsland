# DeusEx Administration — Gap Analysis

**Date:** 2026-04-10
**Scope:** Complete inventory of admin/DeusEx capabilities — what exists, what's designed but not built, and what's missing entirely.

---

## 1. Database Layer — What Exists Today

### Tables

| Table | Purpose | Location |
|---|---|---|
| `admin_audit_log` | Immutable log of admin actions (id, actor_group_id, action, target, metadata, created_at) | `20260222000000_rebuild_universal_group_pattern.sql` line 270 |
| `users.is_decommissioned` | Soft-delete flag on users table | Same migration |
| `users.is_active` | Active/inactive toggle | Original schema |

### RPCs (SECURITY DEFINER)

| RPC | Purpose | Migration |
|---|---|---|
| `admin_hard_delete_user(target_user_id UUID)` | FK-safe cascade delete of user + all records; audit-logged before deletion | `20260222000000` (base) + `20260223171200` (fix for personal group immutability bypass) |
| `admin_send_notification(target_user_ids UUID[], title TEXT, message TEXT)` | Batch insert notifications with type `admin_notification` | `20260222000000` |
| `admin_force_logout(target_user_ids UUID[])` | Revoke refresh tokens + delete sessions for target users | `20260222000000` |
| `admin_exit_user_from_platform(p_target_user_id UUID)` | Cascade leave all groups (L1/L2/L3) + decommission | `20260228144747_sprint4_platform_exit.sql` |
| `is_platform_admin()` | Simple SQL check: current user's personal group is active member of DeusEx system group. Used in all admin RLS policies (PG17-safe). | `20260223171200` |
| `has_permission(p_acting_group_id, p_context_group_id, p_permission_name)` | Two-tier RBAC check (system groups + context group). Not used in RLS directly (PG17 issues). | `20260222000000` |

### Triggers

| Trigger | Table | Purpose |
|---|---|---|
| `auto_grant_permission_to_deusex()` | `permissions` (AFTER INSERT) | Auto-grants new permissions to DeusEx role |
| `prevent_last_deusex_role_removal()` | `user_group_roles` (BEFORE DELETE) | Blocks removal of last DeusEx role assignment |
| `prevent_last_deusex_membership_removal()` | `group_memberships` (BEFORE DELETE) | Blocks removal of last DeusEx membership |
| `auto_assign_deusex_role_on_accept()` | `group_memberships` (AFTER UPDATE) | Auto-assigns DeusEx role when DeusEx invitation accepted |
| Audit triggers on `group_memberships` | `group_memberships` (AFTER INSERT/DELETE) | Logs admin group membership operations |
| Audit triggers on `direct_messages` | `direct_messages` (AFTER INSERT) | Logs admin DM operations |

### RLS Policies (Admin-specific)

| Policy | Table | Effect |
|---|---|---|
| Admin SELECT on `groups` | `groups` | `is_platform_admin()` → see all groups |
| Admin UPDATE on `users` | `users` | `is_platform_admin()` → set `is_active`, `is_decommissioned` |
| Admin SELECT on `admin_audit_log` | `admin_audit_log` | `is_platform_admin()` → read all entries |
| Admin INSERT on `admin_audit_log` | `admin_audit_log` | `is_platform_admin()` → write entries |
| No UPDATE/DELETE on `admin_audit_log` | `admin_audit_log` | Immutability enforced by absence of policies |
| Admin SELECT/INSERT on `group_memberships` | `group_memberships` | `is_platform_admin()` → invite/join users to any group |
| Admin SELECT/INSERT/DELETE on `user_group_roles` | `user_group_roles` | `is_platform_admin()` → assign/remove roles in any group |
| Admin SELECT on `group_roles` | `group_roles` | `is_platform_admin()` → see all group roles |

### Indexes

| Index | Table |
|---|---|
| `idx_audit_log_actor` | `admin_audit_log(actor_group_id)` |
| `idx_audit_log_action` | `admin_audit_log(action)` |
| `idx_audit_log_created` | `admin_audit_log(created_at DESC)` |

---

## 2. UI Layer — What Exists Today

### Admin Pages

| Page | Path | Purpose |
|---|---|---|
| Admin Layout (gate) | `app/admin/layout.tsx` | Permission gate via `has_permission('manage_all_groups')` — blocks non-DeusEx users |
| Admin Dashboard | `app/admin/page.tsx` | 4 stat cards (Users, Groups, Journeys, Enrollments) + Users data panel with selection + action bar |
| DeusEx Members | `app/admin/deusex/page.tsx` | List/add/remove DeusEx members by email; audit-logged |
| Fix Orphans | `app/admin/fix-orphans/page.tsx` | Utility page to find/fix groups without a Steward |

### Admin Components

| Component | Path | Purpose |
|---|---|---|
| `AdminStatCard` | `components/admin/AdminStatCard.tsx` | Expandable stat card for dashboard |
| `AdminDataPanel` | `components/admin/AdminDataPanel.tsx` | Paginated user table with checkboxes, toggle-click, Shift+range, cross-page selection persistence |
| `UserActionBar` | `components/admin/UserActionBar.tsx` | 3-group action bar (Communication / Account / Group) with 11 context-sensitive buttons |
| `NotifyModal` | `components/admin/NotifyModal.tsx` | Title + message form for admin notifications |
| `MessageModal` | `components/admin/MessageModal.tsx` | DM compose form for admin messages |
| `GroupPickerModal` | `components/admin/GroupPickerModal.tsx` | Searchable group picker with 3 modes (invite/join/remove) |
| `DeusexMemberList` | `components/admin/DeusexMemberList.tsx` | Member list for DeusEx management page |

### Admin Library Code

| File | Path | Purpose |
|---|---|---|
| `selection-model.ts` | `lib/admin/selection-model.ts` | Pure selection logic (toggle, range, cross-page) |
| `admin-users-query.ts` | `lib/admin/admin-users-query.ts` | Server-side admin user queries (paginated + IDs-only) |
| `user-filter.ts` | `lib/admin/user-filter.ts` | Filter logic for active/inactive/decommissioned users |
| `action-bar-logic.ts` | `lib/admin/action-bar-logic.ts` | Context-sensitive action enablement logic |

### API Routes

| Route | Path | Purpose |
|---|---|---|
| `GET /api/admin/users` | `app/api/admin/users/route.ts` | Server-side paginated user listing with search + filters; uses service_role to bypass RLS; validates JWT + DeusEx membership |

### Navigation Integration

- `components/Navigation.tsx` — conditional "Admin" link shown only to platform admins (uses `is_platform_admin` / `manage_all_groups` permission check)

### Test Coverage

| Category | Files | Test Count |
|---|---|---|
| Integration tests | 18 files in `tests/integration/admin/` | ~120+ tests |
| Unit tests | 3 files in `tests/unit/admin/` | 99 tests |

**Integration test files:**
- `deusex-auto-grant.test.ts`, `deusex-last-member.test.ts`, `deusex-bootstrap.test.ts`
- `admin-audit-log.test.ts`, `admin-route-access.test.ts`
- `deusex-member-management.test.ts`, `admin-users-api.test.ts`
- `user-decommission.test.ts`, `user-hard-delete.test.ts`, `admin-user-management.test.ts`
- `admin-notification-send.test.ts`, `admin-group-visibility.test.ts`
- `admin-message-send.test.ts`, `admin-invite-to-group.test.ts`, `admin-join-group.test.ts`
- `admin-remove-from-group.test.ts`, `admin-force-logout.test.ts`, `platform-exit.test.ts`

---

## 3. Designed But Not Built

These capabilities are specified in feature docs or behavior specs but have no implementation.

| Capability | Design Reference | Gap Description |
|---|---|---|
| **Tiered admin access** | AR-deusex-admin-foundation Decision 6 | Only one admin tier exists (DeusEx = full access). Multi-tier (e.g., content moderator, support agent) deferred to future wave. |
| **Audit log UI viewer** | B-ADMIN-007 specifies table exists | The `admin_audit_log` table exists and is populated by triggers, but there is **no UI to view it**. Admins cannot browse, search, or filter audit entries in the Hub. |
| **Group status management UI** | `groups.status` column exists (active/closed/archived/suspended), GROUP-MODEL-CURRENT-STATE.md "Designed But Not Built" section | The DB column and RLS filtering exist. `leave_group()` RPC sets status to 'closed'. But there is **no admin UI** to archive, suspend, or reactivate groups. |
| **Full role template expansion** | GROUP-MODEL-CURRENT-STATE.md | Only Steward + Member roles auto-created at group creation. Guide and Observer role instances are NOT auto-created from templates. |
| **Self-service role customization UI** | RBAC design D2 | `RoleFormModal` exists but full permission picker for customizing which permissions a role grants is incomplete. |
| **Visitor system group** | RBAC design D4 | Designed as implicit group for non-logged-in users with Guest role. Not created in any migration. |
| **Group-in-group admin tooling** | ADR D4, D7, D10, D11 | Schema supports group-in-group but `has_permission()` only resolves depth 1. No admin UI for managing nested group memberships. No circularity prevention trigger (D11). |

---

## 4. Missing Entirely — Not Even Designed

These are capabilities a production admin system would need that have no specification or implementation in the codebase.

### 4.1 Group Administration

| Capability | Priority | Notes |
|---|---|---|
| **Archive/suspend groups via admin UI** | HIGH | `groups.status` column supports it but no UI or API endpoint exists for admins to change group status |
| **Reactivate archived/suspended groups** | HIGH | No mechanism to transition groups back to 'active' |
| **View group details from admin panel** | MEDIUM | Admin can see all groups (RLS policy) but no dedicated admin group detail view with membership/role inspection |
| **Transfer group ownership (Steward)** | MEDIUM | No admin mechanism to reassign Steward when the current one is unavailable |
| **Merge groups** | LOW | No mechanism to merge two groups into one |
| **Manage system groups (FI Members, DeusEx, [Deleted User])** | MEDIUM | DeusEx is manageable via `/admin/deusex`, but no admin view for FI Members or [Deleted User] system groups |
| **Bulk group operations** | LOW | No batch actions on groups (archive multiple, etc.) |

### 4.2 Journey Administration

| Capability | Priority | Notes |
|---|---|---|
| **Unpublish/remove journeys** | HIGH | No admin action to unpublish or remove a journey. `is_published` exists but no admin UI to toggle it. |
| **Journey content moderation** | MEDIUM | No mechanism to review or flag journey content |
| **Journey analytics (per-journey stats)** | MEDIUM | Dashboard shows total count but no per-journey enrollment/completion rates |
| **Reassign journey ownership** | LOW | No mechanism to transfer a journey to a different group |
| **Journey template management** | LOW | No admin UI for managing journey templates |

### 4.3 User Administration Enhancements

| Capability | Priority | Notes |
|---|---|---|
| **User search with advanced filters** | MEDIUM | Current search is basic text match on name/email. No filter by role, group membership, enrollment status, activity date, etc. |
| **User profile detail view (admin)** | MEDIUM | No admin-side user detail page showing full profile, group memberships, enrollments, roles, activity history |
| **Shadow/visitor account management** | LOW | No concept of visitor/shadow accounts exists yet (Visitor system group not created) |
| **User export (CSV/JSON)** | LOW | No data export capability |
| **User activity log (per-user)** | MEDIUM | `admin_audit_log` captures admin actions but there is no per-user activity timeline (logins, enrollments, group joins, etc.) |

### 4.4 Content Moderation

| Capability | Priority | Notes |
|---|---|---|
| **Reported content queue** | HIGH | No reporting mechanism exists. Users cannot flag content, messages, or other users. |
| **Content review workflow** | HIGH | No review/approve/reject flow for reported items |
| **Message moderation** | MEDIUM | Admins can send DMs but cannot view/moderate existing conversations between users |
| **Forum post moderation** | MEDIUM | No admin view of forum posts across groups |
| **Automated content filters** | LOW | No profanity/spam detection |

### 4.5 Platform Operations

| Capability | Priority | Notes |
|---|---|---|
| **System health dashboard** | MEDIUM | No metrics on API response times, error rates, active sessions, DB connection pool, etc. |
| **Platform configuration UI** | MEDIUM | No admin UI for changing platform settings (e.g., max group size, invitation expiry, default permissions) |
| **Announcement/banner system** | MEDIUM | Admin can send notifications to individual users but no platform-wide announcement mechanism |
| **Email template management** | LOW | No admin UI for managing email templates |
| **Feature flags** | LOW | No feature flag system for gradual rollouts |
| **Scheduled maintenance mode** | LOW | No way to put platform in maintenance mode |
| **Rate limiting configuration** | LOW | No admin-configurable rate limits |
| **Storage/upload management** | LOW | No admin visibility into file uploads or storage usage |

### 4.6 Analytics and Reporting

| Capability | Priority | Notes |
|---|---|---|
| **Platform usage analytics** | MEDIUM | Dashboard has 4 counts but no trends, charts, or time-series data |
| **Enrollment funnel** | MEDIUM | No visibility into enrollment → started → completed conversion rates |
| **Group engagement metrics** | LOW | No metrics on group activity, message volume, journey completion rates per group |
| **Admin action reports** | LOW | Audit log exists in DB but no aggregation, filtering, or export |
| **User retention metrics** | LOW | No cohort analysis, churn rate, or engagement scoring |

### 4.7 Security and Compliance

| Capability | Priority | Notes |
|---|---|---|
| **Login/session audit trail** | HIGH | No record of user login events, IP addresses, or device info |
| **Failed login monitoring** | HIGH | No visibility into brute-force attempts or account lockouts |
| **GDPR data export (user request)** | MEDIUM | `admin_hard_delete_user` handles right-to-erasure but no "export my data" flow |
| **Permission change audit** | MEDIUM | Role assignments are not audit-logged (only admin group actions are) |
| **Suspicious activity alerts** | LOW | No automated alerting on anomalous patterns |
| **Two-factor authentication management** | LOW | No admin visibility or control over 2FA settings |

---

## 5. Summary

### What's Strong

The admin foundation is solid for Wave 1 (Ferd). The system has:
- A well-designed RBAC model with `is_platform_admin()` PG17-safe checks
- 6 admin RPCs with proper SECURITY DEFINER and permission validation
- An immutable audit log with DB triggers auto-logging admin operations
- A functional Users panel with 11 context-sensitive actions (all wired end-to-end)
- DeusEx member self-management
- Comprehensive test coverage (~220 admin tests)
- Proper last-member protection preventing admin lockout

### What's Weak

| Area | Severity | Summary |
|---|---|---|
| **Audit log has no UI** | HIGH | Data is collected but invisible to admins — they must query the DB directly |
| **Group lifecycle management** | HIGH | `groups.status` column exists but no admin UI to archive/suspend/reactivate groups |
| **Journey administration** | HIGH | Zero admin controls over journeys (unpublish, remove, reassign) |
| **Content moderation** | HIGH | No reporting, review, or moderation tools at all |
| **User detail view** | MEDIUM | No way to inspect a user's full profile, memberships, enrollments from admin |
| **Platform operations** | MEDIUM | No health metrics, configuration UI, or maintenance tools |
| **Advanced search/filter** | MEDIUM | Basic text search only — no filter by role, group, activity |
| **Analytics** | MEDIUM | 4 flat counts, no trends or per-entity metrics |
| **Security monitoring** | HIGH | No login audit trail, failed login detection, or session monitoring |
| **Tiered admin access** | LOW (for now) | Single-tier is fine for solo dev/small team; becomes critical at scale |

### Recommended Priority Order for Next Waves

1. **Audit log viewer UI** — data already exists, just needs a frontend page
2. **Group status management UI** — column + RLS exist, just needs admin controls
3. **Journey admin controls** — unpublish/remove at minimum
4. **Content reporting + moderation queue** — safety-critical for any user-generated content
5. **Login/session audit trail** — security baseline for production
6. **User detail view** — needed for effective user support
7. **Advanced user search/filters** — efficiency for admin operations at scale
8. **Platform analytics dashboard** — time-series trends beyond flat counts

---

## 6. File Reference Index

### Source Documentation
- `docs/old_products/ferd/development/features/AR-deusex-admin-foundation.md` — feature design (14 decisions, 4 sub-sprints)
- `docs/old_products/ferd/development/specs/admin.md` — 19 behavior specs (B-ADMIN-001 through B-ADMIN-019)
- `docs/old_products/ferd/development/specs/security.md` — 4 security behaviors (B-SEC-001 through B-SEC-004)
- `docs/TMP/ecosystem-session/GROUP-MODEL-CURRENT-STATE.md` — group model current state + designed-but-not-built

### Key Migrations
- `supabase/migrations/20260222000000_rebuild_universal_group_pattern.sql` — admin_audit_log table, admin RPCs, admin RLS policies, triggers
- `supabase/migrations/20260223171200_fix_rc7_admin_user_ops.sql` — admin_hard_delete fixes, is_platform_admin()
- `supabase/migrations/20260228144747_sprint4_platform_exit.sql` — admin_exit_user_from_platform RPC
- `supabase/migrations/20260228111514_sprint1_foundation_schema.sql` — groups.status column
- `supabase/migrations/archive/` — 13 archived admin-related migrations (folded into rebuild)

### Application Code
- `app/admin/` — 4 pages (layout, dashboard, deusex members, fix-orphans)
- `components/admin/` — 7 components
- `lib/admin/` — 4 utility modules
- `app/api/admin/users/route.ts` — server-side admin users API

### Tests
- `tests/integration/admin/` — 18 integration test files
- `tests/unit/admin/` — 3 unit test files
- `tests/integration/groups/group-status.test.ts` — group status integration tests
