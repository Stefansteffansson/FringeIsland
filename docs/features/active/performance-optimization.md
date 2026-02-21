# Performance Optimization — System-Wide Responsiveness

**Status:** COMPLETE — All Tiers Implemented (1A, 1B, 1C, 2A, 2B, 2C, 3A, 3B)
**Created:** 2026-02-20
**Priority:** HIGH — Blocking user experience on admin panel and groups pages
**Version:** 0.2.26 (target)

---

## Problem Statement

The admin panel (6700 users) and the My Groups / Group Detail pages are unacceptably slow. Loading times range from 800ms to 2+ seconds. The platform should feel instant.

**Symptoms reported:**
- Admin > Users panel takes 1-2 seconds per page load
- My Groups page visibly slow to render
- Group detail page takes noticeable time before content appears
- Pagination in admin feels sluggish

---

## Root Cause Analysis (5 Root Causes)

### Root Cause 1: `has_permission()` as a Per-Row Tax in RLS Policies

**Severity: CRITICAL**

`has_permission()` is a `SECURITY DEFINER` PL/pgSQL function that does **up to 2 separate multi-table JOIN queries** internally:

- **Tier 1 (always runs):** 4-way JOIN across `group_memberships` → `groups` → `user_group_roles` → `group_role_permissions` → `permissions` (filters `group_type = 'system'`)
- **Tier 2 (runs if Tier 1 is false):** 4-way JOIN across `group_memberships` → `user_group_roles` → `group_role_permissions` → `permissions` (filters by specific group)

**The problem:** `has_permission()` is embedded in **SELECT** RLS policies on these tables:

| Table | SELECT Policy Using `has_permission()` |
|-------|---------------------------------------|
| `users` | `deusex_admin_select_all_users` |
| `groups` | `groups_select_by_creator_or_member` (as one of 5 OR branches) |
| `group_memberships` | `deusex_admin_select_all_memberships` |
| `user_group_roles` | `deusex_admin_select_all_role_assignments` |
| `group_roles` | (INSERT/UPDATE/DELETE only) |
| `group_role_permissions` | (INSERT/DELETE only) |
| `admin_audit_log` | SELECT and INSERT policies |

PostgreSQL evaluates ALL SELECT policies with OR semantics. Even for non-admin users, the planner **may** evaluate the admin policy branch. For the admin panel:

- **Active users:** Simpler policies match (`is_active = true`), so `has_permission()` may be skipped
- **Inactive/decommissioned users:** Simpler policies fail → PostgreSQL **must** evaluate `has_permission()` → 2 sub-queries per row
- **`count: 'exact'`** forces evaluation across ALL matching rows

The `groups` SELECT policy is even worse — 5 OR branches:
```sql
is_public = true
OR is_active_group_member(id)          -- 2 sub-queries (SECURITY DEFINER)
OR is_invited_group_member(id)         -- 2 sub-queries (SECURITY DEFINER)
OR created_by_user_id = get_current_user_profile_id()  -- 1 sub-query
OR has_permission(get_current_user_profile_id(), '000...', 'manage_all_groups')  -- up to 2 sub-queries
```

**Worst case per row on groups table: ~8 sub-queries.**

### Root Cause 2: Massive Query Waterfall — No Parallelism, Duplicate Lookups

**Severity: HIGH**

The `auth_user_id → users.id` resolution query runs independently in **up to 7 components** per page load:

1. MessagingContext
2. NotificationContext
3. Navigation
4. Page component (groups page, group detail page, etc.)
5. usePermissions hook
6. ForumSection (if forum tab active)
7. AuthContext (on sign-in active check)

**Group Detail Page — 18 total HTTP requests, 8 sequential on critical path:**

```
[Auth] getSession()                                           (1 RT)
  |
  v  (user available)
  |
  +--[MessagingCtx] users.select('id')                       (1 RT)
  |    v  conversations.select(...)                           (1 RT)
  |
  +--[NotificationCtx] users.select('id')                    (1 RT)
  |    v  notifications.select(*)                             (1 RT)
  |
  +--[Navigation] users.select('id, full_name, avatar_url')  (1 RT)
  |    v  group_memberships count (invited)                   (1 RT)
  |    v  rpc('has_permission') admin check                   (1 RT)
  |
  +--[usePermissions] users.select('id')                      (1 RT)
  |    v  rpc('get_user_permissions')                         (1 RT)
  |
  +--[GroupDetailPage] 8 SEQUENTIAL queries:
       Q1: users.select('id')                                 (1 RT)
       Q2: groups.select('*')                                 (1 RT)
       Q3: group_memberships (am I a member?)                 (1 RT) ← REDUNDANT
       Q4: group_memberships (count active)                   (1 RT) ← REDUNDANT
       Q5: user_group_roles (my roles)                        (1 RT) ← REDUNDANT
       Q6: group_memberships (all members)                    (1 RT)
       Q7: users (member profiles)                            (1 RT)
       Q8: user_group_roles (all member roles)                (1 RT)
```

**Critical path to content: 8 sequential round-trips = 800ms–1.6s** (at ~100-200ms per RT)

**Redundancies in group detail page:**
- Q3 (am I member?) → can be derived from Q6 (all members)
- Q4 (member count) → can be derived from Q6 result length
- Q5 (my roles) → subset of Q8 (all member roles)
- Q1 (resolve user ID) → duplicate of P1 in usePermissions

### Root Cause 3: N+1 Query Pattern on My Groups Page

**Severity: HIGH**

`app/groups/page.tsx` lines 74-87: After fetching all groups, fires **one count query per group** for member counts:

```typescript
const groupsWithCounts = await Promise.all(
  (groupsData || []).map(async (group) => {
    const { count } = await supabase
      .from('group_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group.id)
      .eq('status', 'active');
    return { ...group, memberCount: count || 0 };
  })
);
```

User in 10 groups = 10 additional HTTP requests, each passing through RLS.

**My Groups total: 12 + N HTTP requests** (auth + contexts + nav + 3 page queries + N count queries)

### Root Cause 4: Missing Database Indexes

**Severity: MEDIUM-HIGH**

| Missing Index | Used By | Impact |
|--------------|---------|--------|
| `groups(group_type)` | `has_permission()` Tier 1, admin panel group filter | Full table scan on groups for every `has_permission()` call |
| `group_memberships(user_id, group_id, status)` | `has_permission()`, `is_active_group_member()` | Forces bitmap index merge instead of single index lookup |
| `user_group_roles(user_id, group_id, group_role_id)` | `has_permission()` JOIN chain | Extra table lookup to get `group_role_id` for next JOIN |

**Existing indexes (already in place):**
- `idx_users_auth_user_id` on `users(auth_user_id)`
- `idx_users_active` on `users(is_active) WHERE is_active = true`
- `idx_memberships_user` on `group_memberships(user_id)`
- `idx_memberships_group` on `group_memberships(group_id)`
- `idx_memberships_active` on `group_memberships(group_id, status) WHERE status = 'active'`
- `idx_ugr_user_group` on `user_group_roles(user_id, group_id)`
- `idx_grp_role` on `group_role_permissions(group_role_id)`
- `idx_permissions_name` on `permissions(name)`

### Root Cause 5: Admin Panel Specific Issues

**Severity: MEDIUM**

- **Stat counts duplicated:** Parent `fetchStats` and `AdminDataPanel` both query users count independently
- **`showDecommissioned` toggle re-fetches ALL 4 stat counts** — only users count depends on this filter
- **`commonGroupCount` has no debounce** — fires a `group_memberships` query on every checkbox click
- **`{ count: 'exact' }` forces full scan** through RLS for all accessible rows

---

## Fixes Already Applied (This Session — 2026-02-20)

### Fix 1: Infinite Re-render Loop (DONE)

**File:** `app/admin/page.tsx`

**Problem:** `handleUsersDataChange`, `handleSelectionChange`, `handleShowDecommissionedChange` were plain functions recreated on every render. Passed as props to `AdminDataPanel`, they caused `fetchData` to re-fire infinitely.

**Fix:** Wrapped all three in `useCallback` with empty dependency arrays.

### Fix 2: AdminDataPanel Performance Improvements (DONE)

**File:** `components/admin/AdminDataPanel.tsx`

**Changes:**
1. **Single query with inline count** — `{ count: 'exact' }` on the data query itself. Eliminated the separate count-only query (was 2 HTTP requests, now 1).
2. **Two-tier loading** — `initialLoading` (skeleton on first mount) vs `fetching` (subtle overlay on subsequent fetches). Previous data stays visible during pagination.
3. **Debounced search** — 300ms debounce on search input. Prevents query-per-keystroke.
4. **Prefetch adjacent pages** — After loading page N, silently fetches page N+1 (and N-1) in background. Stored in `prefetchCacheRef`. Cache cleared on filter/search changes.
5. **Extracted `buildQuery()` helper** — Shared query-building logic between main fetch and prefetch.

---

## Redesign Plan — Prioritized Implementation

### Tier 1: Quick Wins (Biggest Impact, Least Effort)

#### 1A. Add Missing Database Indexes

**Type:** Migration
**Files:** New migration in `supabase/migrations/`
**Effort:** ~15 min

```sql
-- Speed up has_permission() Tier 1 and admin panel group filters
CREATE INDEX CONCURRENTLY idx_groups_group_type ON groups(group_type);

-- Speed up has_permission() and is_active_group_member() lookups
CREATE INDEX CONCURRENTLY idx_memberships_user_group_status
  ON group_memberships(user_id, group_id, status);

-- Speed up has_permission() JOIN chain (covering index)
CREATE INDEX CONCURRENTLY idx_ugr_user_group_role
  ON user_group_roles(user_id, group_id, group_role_id);
```

**Impact:** Every `has_permission()` call gets faster. Every membership lookup gets faster. Affects all pages.

#### 1B. Admin API Route with `service_role` — Bypass RLS for Admin

**Type:** New API route + refactor AdminDataPanel
**Files:** New `app/api/admin/users/route.ts`, edit `AdminDataPanel.tsx`
**Effort:** ~1-2 hours

**Approach:**
1. Create a server-side API route at `/api/admin/users`
2. Route validates admin status ONCE (check DeusEx membership or `has_permission()` server-side)
3. Uses `service_role` Supabase client to query — **completely bypasses RLS**
4. Returns paginated JSON with count
5. `AdminDataPanel` calls this API instead of Supabase directly (for users panel)

**Impact:** Admin users panel goes from ~1-2s to ~100-200ms. Eliminates the per-row `has_permission()` tax entirely.

**Security:** Admin status validated at the route level. Service role never exposed to the client.

#### 1C. Shared UserProfile in AuthContext

**Type:** Refactor AuthContext
**Files:** `lib/auth/AuthContext.tsx`, then update all consumers
**Effort:** ~1-2 hours

**Approach:**
1. After `getSession()` succeeds, immediately resolve `auth_user_id → users.id` (+ `full_name`, `avatar_url`)
2. Store in AuthContext as `userProfile: { id, full_name, avatar_url } | null`
3. Export via `useAuth()` hook: `const { user, userProfile } = useAuth()`
4. Update all components that query `users.select('id').eq('auth_user_id', ...)` to read from context instead

**Components to update:**
- `components/Navigation.tsx` (currently queries users for profile)
- `lib/contexts/MessagingContext.tsx` (queries users for id)
- `lib/contexts/NotificationContext.tsx` (queries users for id)
- `app/groups/page.tsx` (queries users for id)
- `app/groups/[id]/page.tsx` (queries users for id)
- `hooks/usePermissions.ts` (queries users for id)
- `components/groups/ForumSection.tsx` (queries users for id)
- Any other component doing this lookup

**Impact:** Eliminates 4-6 duplicate HTTP requests per page load. Every page gets faster.

### Tier 2: Medium Effort, High Impact

#### 2A. Parallelize Group Detail Page Queries ✅ DONE (2026-02-21)

**Type:** Refactor `fetchGroupData` in `app/groups/[id]/page.tsx`
**Status:** COMPLETE

**Was:** 7 sequential queries (Q1 already eliminated by Tier 1C): Q2→Q3→Q4→Q5→Q6→Q7→Q8

**Now:** 4 queries in 2 parallel steps, 3 redundant queries eliminated:

```
Step 1: Promise.all([
  fetch group data (Q2),
  fetch all memberships (Q6)
])
— Derive isMember from Q6 (.some), memberCount from Q6 (.length)  ← eliminates Q3+Q4

Step 2: Promise.all([
  fetch member profiles (Q7),
  fetch all member roles (Q8)
])
— Derive userRoles from Q8 (.filter by current user)  ← eliminates Q5
```

Also parallelized `refetchMembers`: Q6 → Promise.all([Q7, Q8]) + added setMemberCount.

**Impact:** 7 sequential → 2 parallel steps. ~1.2s → ~300-400ms.

#### 2B. Fix Groups Page N+1 — Single RPC for Member Counts ✅ DONE (2026-02-21)

**Type:** New database RPC + edit `app/groups/page.tsx`
**Status:** COMPLETE

**Implementation:**
1. Created `get_group_member_counts(UUID[])` RPC — SECURITY DEFINER, batches all counts in one query
2. Refactored `fetchGroups` in `app/groups/page.tsx`:
   - Q1 (get group IDs) runs first
   - `Promise.all([Q2: group data, Q3: member counts RPC])` runs in parallel
   - Results combined via Map lookup
3. Migration: `20260221090925_get_group_member_counts_rpc.sql`

**Impact:** My Groups with 10 groups: 12 HTTP requests → 3 (2 parallel steps). ~500ms faster.

#### 2C. Remove `has_permission()` from SELECT RLS Policies

**Type:** Migration
**Effort:** ~1-2 hours (careful policy rewrite)

**Approach:** With admin queries handled by `service_role` (Tier 1B), the `deusex_admin_select_*` policies on `users`, `group_memberships`, `user_group_roles` are no longer needed. Drop them.

For the `groups` table SELECT policy, simplify to remove the `has_permission()` branch:
```sql
-- Before (5 OR branches, up to ~8 sub-queries per row):
USING (
  is_public = true
  OR is_active_group_member(id)
  OR is_invited_group_member(id)
  OR created_by_user_id = get_current_user_profile_id()
  OR has_permission(...)  -- EXPENSIVE, remove this
)

-- After (4 OR branches, admin handled by service_role):
USING (
  is_public = true
  OR is_active_group_member(id)
  OR is_invited_group_member(id)
  OR created_by_user_id = get_current_user_profile_id()
)
```

**Impact:** Every SELECT on users/groups/memberships gets faster for ALL users (not just admin).

### Tier 3: Polish ✅ DONE

#### 3A. Debounce `commonGroupCount` in Admin Panel ✅ DONE

**File:** `app/admin/page.tsx`
**Change:** Wrapped `commonGroupCount` computation in 300ms `setTimeout` with proper cleanup (`clearTimeout` + `cancelled` flag). Prevents rapid-fire queries when user clicks through selections quickly.

#### 3B. Deduplicate Admin Stats ✅ DONE

**File:** `app/admin/page.tsx`
**Change:** Added `staticStatsLoadedRef` (`useRef`) to track whether static stats (groups, journeys, enrollments) have been loaded. On filter changes, only re-fetches users count (the only filter-dependent stat). On actions (deactivate, etc.), resets ref to force full refresh. Reduces 4 parallel queries to 1 on every filter toggle.

---

## Expected Performance After Implementation

| Page | Current | After Tier 1 | After Tier 1+2 |
|------|---------|-------------|----------------|
| **Admin Users** | ~1-2s | ~100-200ms (service_role) | ~100-200ms |
| **My Groups** (10 groups) | ~800ms | ~500ms (shared profile) | ~200-300ms (+ RPC counts) |
| **Group Detail** | ~1.2-1.6s | ~800ms (shared profile) | ~300-400ms (+ parallel queries) |
| **All pages** (context overhead) | 4-6 duplicate user queries | 0 duplicate queries | 0 duplicate queries |

---

## Implementation Order (Recommended)

1. **1A: Add indexes** — instant DB-level speedup, no code changes
2. **1C: Shared UserProfile context** — eliminates duplicates, benefits all pages
3. **1B: Admin service_role route** — biggest single win for admin panel
4. **2A: Parallelize group detail** — fast group pages
5. **2B: Fix N+1 with RPC** — fast My Groups
6. **2C: Remove has_permission from SELECT policies** — cleanup + speed for everyone
7. **3A+3B: Admin polish** — minor wins

---

## Key Files Reference

**Files already modified this session:**
- `app/admin/page.tsx` — useCallback fix for infinite loop
- `components/admin/AdminDataPanel.tsx` — single query, prefetch, debounce, two-tier loading

**Files to modify (Tier 1):**
- `supabase/migrations/` — new migration for indexes
- `lib/auth/AuthContext.tsx` — add userProfile
- `app/api/admin/users/route.ts` — new server route (service_role)
- `components/admin/AdminDataPanel.tsx` — use API route for users

**Files to modify (Tier 2):**
- `app/groups/[id]/page.tsx` — parallelize queries, remove redundant
- `app/groups/page.tsx` — replace N+1 with RPC
- `supabase/migrations/` — new RPC + drop admin SELECT policies
- `components/Navigation.tsx` — use shared userProfile
- `lib/contexts/MessagingContext.tsx` — use shared userProfile
- `lib/contexts/NotificationContext.tsx` — use shared userProfile
- `hooks/usePermissions.ts` — use shared userProfile

**Analysis source files (for reference):**
- `has_permission()` defined in: `supabase/migrations/20260216111905_rbac_permission_resolution.sql`
- Admin RLS policies in: `supabase/migrations/20260219160451_fix_admin_update_add_select_policy.sql`
- Groups SELECT policy in: `supabase/migrations/20260219153530_*.sql`
- Helper functions (`is_active_group_member`, `get_current_user_profile_id`) in RBAC migrations

---

## Notes

- `createBrowserClient` from `@supabase/ssr` returns a **singleton** (confirmed in source) — so `supabase` references in dependency arrays are stable.
- `has_permission()` is `SECURITY DEFINER` + `STABLE` — PostgreSQL *may* cache results within a statement, but is not guaranteed to. Don't rely on this for performance.
- The `service_role` approach for admin is the standard Supabase pattern for admin dashboards. It's not a hack — it's the recommended architecture.
