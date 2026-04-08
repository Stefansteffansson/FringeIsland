# Authentication System

**Status:** IMPLEMENTED
**Date:** January 20, 2026
**Completed:** February 27, 2026
**Version:** v0.2.31
**Phase:** 1.2 (Authentication) + 1.6 (Polish & Launch)
**Related:** [Display Name System](./FR-display-name-system.md) | [Group Management](./FR-group-management.md) | [Dynamic Permissions System](./AR-dynamic-permissions-system.md)

---

## Context

FringeIsland uses a two-layer authentication model. **Layer 1** is Supabase Auth (`auth.users`) — it owns credentials, sessions, and JWTs. **Layer 2** is the application profile (`public.users`) — it extends the auth record with platform-specific data like display names, bios, and decommission state.

The D15 Universal Group Pattern introduced the **personal group** as the user's identity anchor in the group system. Every user gets a personal group at signup, and all group-facing references (memberships, role assignments, forum authorship) use `personal_group_id` instead of `user_id`. The personal group's `name` field is the single source of truth for the user's display name, driven by the display name / nickname system.

Account lifecycle is split between **self-service** (signup, signin, signout) and **admin-only** operations (deactivate, decommission, hard-delete). There is no self-service account deletion.

---

## Feature Summary

1. **Signup** creates an `auth.users` record, which fires the `handle_new_user()` trigger — an 8-step function that bootstraps the user profile, personal group, self-membership, Myself role, FI Members enrollment, and pending invitation claims
2. **Active-user gate** on sign-in: RLS hides deactivated users (`is_active = false`), and `signIn()` explicitly checks + auto-signs-out deactivated accounts
3. **Session management** via Supabase Auth cookies, refreshed transparently by `proxy.ts` on every request
4. **Force-logout** for admin-deactivated users via three mechanisms: Realtime broadcast, server-side session deletion, and 10-second polling fallback
5. **Route protection** via `proxy.ts` (Next.js 16 proxy pattern) — refreshes sessions only, no redirect logic
6. **AuthContext** provides `UserProfile` (including `personal_group_id`, `display_name` resolved from personal group) via React Context + `useAuth()` hook
7. **Display name system** — nickname/real-name toggle synced to personal group `name`; cross-reference [display-name-system.md](./FR-display-name-system.md) for full details
8. **Admin account lifecycle** — four operations (activate, deactivate, decommission, hard-delete) via SECURITY DEFINER RPCs; no self-service deletion
9. **[Deleted User] sentinel** — hard-deleted users' content (forum posts, journeys, groups) is reassigned to a system sentinel group

---

## Data Model

### `users` table

| Column | Type | Default | Nullable | Purpose |
|--------|------|---------|----------|---------|
| `id` | UUID | `gen_random_uuid()` | No | Primary key |
| `auth_user_id` | UUID | — | No | FK to `auth.users(id)` ON DELETE CASCADE. UNIQUE. |
| `email` | TEXT | — | No | UNIQUE. Copied from auth on signup. |
| `full_name` | TEXT | — | No | Legal / real name |
| `avatar_url` | TEXT | — | Yes | Profile picture URL |
| `bio` | TEXT | — | Yes | Free-text biography |
| `is_active` | BOOLEAN | `true` | No | `false` = deactivated (hidden by RLS) |
| `is_decommissioned` | BOOLEAN | `false` | No | `true` = permanently retired, cannot be reactivated |
| `personal_group_id` | UUID | — | Yes | FK to `groups(id)` ON DELETE SET NULL. Set in Step 3 of signup. Immutable after set. |
| `nickname` | TEXT | — | No | Alias / display name. Defaults to first word of `full_name`. CHECK `char_length >= 1`. |
| `display_preference` | TEXT | `'nickname'` | No | `'real_name'` or `'nickname'` — controls personal group `name` |
| `show_real_name` | BOOLEAN | `false` | No | Whether non-admin users can see `full_name` |
| `created_at` | TIMESTAMPTZ | `NOW()` | No | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | `NOW()` | No | Auto-updated by `set_users_updated_at` trigger |

---

## Core Mechanisms

### Signup: `handle_new_user()` — 8-step trigger

Fires `AFTER INSERT ON auth.users`. SECURITY DEFINER. Creates the entire identity scaffold:

```sql
-- Step 1: Create user profile (personal_group_id = NULL initially)
INSERT INTO public.users (auth_user_id, email, full_name, avatar_url, nickname)
VALUES (NEW.id, NEW.email, v_full_name, v_avatar_url, v_nickname);

-- Step 2: Create personal group (group_type = 'personal', is_public = false)
INSERT INTO public.groups (name, group_type, is_public, show_member_list, avatar_url)
VALUES (v_nickname, 'personal', false, false, v_avatar_url);

-- Step 3: Break circular dependency — link user ↔ personal group
UPDATE public.users SET personal_group_id = v_personal_group_id WHERE id = v_user_id;
UPDATE public.groups SET created_by_group_id = v_personal_group_id WHERE id = v_personal_group_id;

-- Step 4: Self-membership — personal group is a member of itself
INSERT INTO public.group_memberships (group_id, member_group_id, added_by_group_id, status)
VALUES (v_personal_group_id, v_personal_group_id, v_personal_group_id, 'active');

-- Step 5: Create "Myself" role in the personal group
INSERT INTO public.group_roles (group_id, name)
VALUES (v_personal_group_id, 'Myself');

-- Step 6: Assign "Myself" role to the personal group
INSERT INTO public.user_group_roles (member_group_id, group_id, group_role_id, assigned_by_group_id)
VALUES (v_personal_group_id, v_personal_group_id, v_myself_role_id, v_personal_group_id);

-- Step 7: Enroll personal group in FringeIsland Members system group + assign Member role
INSERT INTO public.group_memberships (group_id, member_group_id, ...)
VALUES (v_fi_members_group_id, v_personal_group_id, ...);

-- Step 8: Claim pending email invitations (match by email, create 'invited' memberships)
FOR v_pending IN SELECT ... FROM public.pending_email_invitations
  WHERE LOWER(invited_email) = LOWER(NEW.email) AND status = 'pending' AND expires_at > NOW()
LOOP
  INSERT INTO public.group_memberships (...) VALUES (...) ON CONFLICT DO NOTHING;
  UPDATE public.pending_email_invitations SET status = 'claimed', claimed_at = NOW() WHERE id = v_pending.id;
END LOOP;
```

**Key details:**
- `v_full_name` = `COALESCE(raw_user_meta_data->>'display_name', email)`
- `v_nickname` = `split_part(v_full_name, ' ', 1)` — first word of full name
- Personal group `name` is set to `v_nickname` (not full name) — users appear by first name by default
- `display_preference` and `show_real_name` use column defaults (`'nickname'`, `false`)

### Sign-in: active-user gate

```typescript
// AuthContext.tsx — signIn()
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;

// Application-layer active check (RLS hides deactivated users)
const { data: profile, error: profileError } = await supabase
  .from('users')
  .select('is_active')
  .eq('auth_user_id', data.user.id)
  .maybeSingle();

if (profileError || !profile || !profile.is_active) {
  await supabase.auth.signOut();
  throw new Error('Your account has been deactivated. Please contact support.');
}
```

**Why `.maybeSingle()`:** RLS policy `users_select_active` filters `WHERE is_active = true`. A deactivated user's row is invisible, so the query returns null — which triggers the sign-out and error message.

### Session management: `proxy.ts`

Next.js 16 uses `proxy.ts` (not `middleware.ts`). The proxy runs on every matching request and refreshes the Supabase session cookie:

```typescript
// proxy.ts
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}
```

`updateSession()` creates a server-side Supabase client, calls `getUser()` to refresh the session token if expired, and writes updated cookies to the response. It does **not** redirect — route protection is handled at the component level via `useAuth()`.

### Force-logout: three mechanisms

When an admin deactivates a user, the platform attempts to force-sign-out any active sessions:

1. **Realtime broadcast** — AuthContext subscribes to `force-logout:{userId}` channel; admin sends a broadcast event; client calls `signOut()` immediately
2. **Server-side session deletion** — `admin_force_logout(target_user_ids UUID[])` RPC deletes both `auth.sessions` and `auth.refresh_tokens` for the target users
3. **10-second polling fallback** — `validateSession()` runs on a 10-second interval and on tab focus/visibility change; calls `supabase.auth.getUser()` and signs out if the session is invalid

```typescript
// AuthContext.tsx — Realtime force-logout subscription
const channel = supabase.channel(`force-logout:${userProfile.id}`)
  .on('broadcast', { event: 'force_logout' }, () => {
    supabase.auth.signOut();
  })
  .subscribe();

// AuthContext.tsx — Periodic session validation (fallback)
const interval = setInterval(() => { validateSession(); }, 10_000);
```

### AuthContext: `UserProfile` interface

```typescript
export interface UserProfile {
  id: string;              // public.users.id
  full_name: string;       // Legal name
  avatar_url: string | null;
  personal_group_id: string; // The user's personal group UUID
  nickname: string;        // Alias / display name
  display_preference: 'real_name' | 'nickname';
  show_real_name: boolean;
  display_name: string;    // Resolved from personal group name (single source of truth)
}
```

`display_name` is computed at query time by joining the personal group:

```typescript
const { data } = await supabase
  .from('users')
  .select('..., personal_group:groups!personal_group_id(name)')
  .eq('auth_user_id', user.id)
  .single();

// display_name = pg?.name || data.nickname || data.full_name
```

### Display name sync

When `nickname`, `full_name`, or `display_preference` changes on `users`, the `sync_display_name_to_personal_group` AFTER UPDATE trigger writes the appropriate value to `groups.name` on the user's personal group. See [display-name-system.md](./FR-display-name-system.md) for full details.

---

## Security Functions

| Function | Type | Purpose |
|----------|------|---------|
| `get_current_user_profile_id()` | SQL, SECURITY DEFINER, STABLE | Returns `public.users.id` for the current `auth.uid()` (active users only) |
| `get_current_personal_group_id()` | SQL, SECURITY DEFINER, STABLE | Returns `personal_group_id` for the current `auth.uid()` — the primary identity function for all D15 RLS policies |
| `is_platform_admin()` | SQL, SECURITY DEFINER, STABLE | Returns `true` if current user's personal group is an active member of the DeusEx system group. Used in RLS policies (PG17-safe). |

---

## RLS Policies (`users` table)

### SELECT: `users_select_active`

```sql
CREATE POLICY "users_select_active"
  ON public.users FOR SELECT TO authenticated
  USING (is_active = true);
```

All authenticated users can see all active user profiles. Deactivated users are invisible. No column-level filtering — `show_real_name` enforcement is application-layer.

### UPDATE: `users_update_own`

```sql
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
```

Users can only update their own profile.

### UPDATE: admin operations (no RLS policy)

The base D15 migration created a `deusex_admin_update_users` policy using `has_permission()`, but RC7 dropped it without replacement. Admin user mutations (activate, deactivate, decommission, hard-delete) go through SECURITY DEFINER RPCs (`admin_update_user_status`, `admin_decommission_user`, `admin_hard_delete_user`) which bypass RLS entirely.

### INSERT / DELETE

No INSERT or DELETE policies. User creation is handled by the `handle_new_user()` SECURITY DEFINER trigger. Deletion is handled by admin RPCs (`admin_hard_delete_user()`).

---

## Admin Account Lifecycle

All admin operations require `manage_all_groups` permission (DeusEx system group membership). Executed via SECURITY DEFINER RPCs.

| Operation | RPC | Effect | Reversible? |
|-----------|-----|--------|-------------|
| **Activate** | `admin_update_user_status(target_user_id, true)` | Sets `is_active = true` | Yes |
| **Deactivate** | `admin_update_user_status(target_user_id, false)` | Sets `is_active = false`. User hidden by RLS. Typically followed by `admin_force_logout()`. | Yes (unless decommissioned) |
| **Decommission** | `admin_decommission_user(target_user_id)` | Sets `is_decommissioned = true`, `is_active = false`. Cannot be reactivated. | No |
| **Hard-delete** | `admin_hard_delete_user(target_user_id)` | Reassigns content to [Deleted User] sentinel, deletes personal group (CASCADE), deletes user record, deletes auth.users record | No |

### Hard-delete cascade detail

`admin_hard_delete_user()` performs these steps in a single transaction:

1. Verify caller has `manage_all_groups` permission
2. Get target's `personal_group_id` and `auth_user_id`
3. Get `[Deleted User]` sentinel system group ID
4. Write audit log entry
5. Reassign content FKs: `forum_posts.author_group_id`, `journeys.created_by_group_id`, `groups.created_by_group_id`, `admin_audit_log.actor_group_id`, `group_memberships.added_by_group_id`, `user_group_roles.assigned_by_group_id`, `journey_enrollments.enrolled_by_group_id`
6. Set session variables to bypass `enforce_personal_group_id_immutability` and notification triggers
7. `DELETE FROM groups WHERE id = personal_group_id` — CASCADE removes memberships, roles, notifications, enrollments, conversations
8. `DELETE FROM users WHERE id = target_user_id`
9. `DELETE FROM auth.users WHERE id = auth_user_id`

---

## Triggers on `users`

| Trigger | Timing | Event | Function | Purpose |
|---------|--------|-------|----------|---------|
| `set_users_updated_at` | BEFORE UPDATE | UPDATE | `update_updated_at_column()` | Auto-sets `updated_at = NOW()` |
| `enforce_decommission_invariant` | BEFORE UPDATE | UPDATE | `enforce_decommission_invariant()` | If `is_decommissioned = true`, forces `is_active = false` |
| `enforce_personal_group_id_immutability` | BEFORE UPDATE | UPDATE | `enforce_personal_group_id_immutability()` | Blocks changes to `personal_group_id` after it's set (bypass via `app.bypass_personal_group_id_immutability` session var) |
| `sync_display_name_to_personal_group` | AFTER UPDATE OF nickname, full_name, display_preference | UPDATE | `sync_personal_group_display_name()` | Syncs personal group `name` to match display preference |

### Triggers on `auth.users`

| Trigger | Timing | Event | Function | Purpose |
|---------|--------|-------|----------|---------|
| `on_auth_user_created` | AFTER INSERT | INSERT | `handle_new_user()` | 8-step user bootstrap (profile, personal group, memberships, roles, pending invitations) |
| `on_auth_user_deleted` | AFTER DELETE | DELETE | `handle_user_deletion()` | Soft-delete: sets `is_active = false` on public.users |

---

## Behaviors & Testing

### Behavior Specs

- `docs/old_products/ferd/development/specs/authentication.md` — Sign-up, sign-in, sign-out, session management behaviors
- `docs/old_products/ferd/development/specs/admin.md` — Admin user lifecycle behaviors (activate, deactivate, decommission, hard-delete)
- `docs/old_products/ferd/development/specs/display-name.md` — Display name / nickname behaviors (B-DISP-001 through B-DISP-011)

### Integration Tests

- `tests/integration/auth/signup.test.ts` — Signup flow, handle_new_user trigger
- `tests/integration/auth/signin.test.ts` — Sign-in, active-user gate, deactivated user rejection
- `tests/integration/auth/signout.test.ts` — Sign-out flow
- `tests/integration/auth/session-persistence.test.ts` — Session persistence across reloads
- `tests/integration/auth/protected-routes.test.ts` — Route protection via proxy.ts
- `tests/integration/admin/admin-user-management.test.ts` — Admin activate/deactivate
- `tests/integration/admin/user-decommission.test.ts` — Decommission flow
- `tests/integration/admin/user-hard-delete.test.ts` — Hard-delete cascade + [Deleted User] sentinel
- `tests/integration/admin/admin-force-logout.test.ts` — Force-logout mechanisms
- `tests/integration/users/display-name.test.ts` — Display name toggle, nickname sync
- `tests/integration/users/display-name-rls.test.ts` — Display name RLS visibility

---

## Known Limitations

1. **No self-service account deletion** — users cannot delete their own accounts; only admins can decommission or hard-delete
2. **No self-service reactivation page** — deactivated users see a generic error; no dedicated "contact admin" flow
3. **No per-device session management** — users cannot view or revoke individual sessions
4. **Force-logout is best-effort** — Realtime broadcast may not reach the client (network issues, tab closed); 10-second polling is the fallback
5. **`signOut()` scope:local** — `supabase-js 2.91.0` `signOut()` defaults to `scope: 'local'` (does not invalidate server-side session); force-logout relies on server-side session deletion as a separate step
6. **`onAuthStateChange` deadlock risk** — DB queries inside the Supabase SSR `onAuthStateChange` callback cause deadlocks. Profile resolution is done in a separate `useEffect` triggered by user state changes.

---

## Out of Scope

- OAuth / social authentication (Google, GitHub)
- Two-factor authentication (2FA)
- Password reset UI (deferred to Wave TBD — pending redistribution (see WAVE_REDISTRIBUTION.md))
- Email verification requirement (email confirmation disabled for MVP)
- Magic link authentication
- SSO / SAML integration

---

## Related Documentation

- **Display name system:** `docs/old_products/ferd/development/features/FR-display-name-system.md`
- **Group management:** `docs/old_products/ferd/development/features/FR-group-management.md`
- **RBAC design:** `docs/old_products/ferd/development/features/AR-dynamic-permissions-system.md`
- **Behavior specs:** `docs/old_products/ferd/development/specs/authentication.md`, `docs/old_products/ferd/development/specs/admin.md`, `docs/old_products/ferd/development/specs/platform-exit.md`
- **Platform exit:** `docs/old_products/ferd/development/features/FR-platform-exit.md` (decommission + force-logout after admin exit)
- **D15 base migration:** `supabase/migrations/20260222000000_rebuild_universal_group_pattern.sql`
- **RC7 admin fixes:** `supabase/migrations/20260223171200_fix_rc7_admin_user_ops.sql`
- **Display name migration:** `supabase/migrations/20260227095615_add_display_name_system.sql`
- **[Deleted User] sentinel:** `supabase/migrations/20260227120843_seed_deleted_user_sentinel_group.sql`

---

## Version History

- **v0.2.31** (2026-02-27): Display name system (nickname, display_preference, show_real_name), personal group name sync trigger, updated handle_new_user() for nickname. [Deleted User] sentinel group. Personal group RLS visibility fix.
- **v0.2.30** (2026-02-27): Display name / nickname columns and sync trigger added.
- **v0.2.23** (2026-02-23): RC7 admin fixes — `is_platform_admin()`, admin RPCs (activate, deactivate, decommission, hard-delete), force-logout, session variable bypasses for immutability and notification triggers.
- **v0.2.22** (2026-02-22): D15 Universal Group Pattern — complete schema rebuild. `personal_group_id` on users, `handle_new_user()` creates personal group + self-membership + Myself role + FI Members enrollment. Two-layer identity model established.
- **v0.2.7** (2026-01-26): Default landing page changed to /groups.
- **v0.2.1** (2026-01-23): Fixed user profile creation trigger, added soft delete on auth.users removal, updated RLS policies.
- **v0.2.0** (2026-01-20): Initial authentication system — login, signup, AuthContext, proxy.ts route protection.
