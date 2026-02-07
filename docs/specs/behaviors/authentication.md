# Authentication Behaviors

> **Purpose:** Document the fundamental rules and guarantees for user authentication, session management, and profile creation.
> **Domain Code:** AUTH

---

## B-AUTH-001: Sign Up Creates Profile

**Rule:** When a user signs up, BOTH an auth.users record AND a public.users profile record MUST be created atomically.

**Why:** Profile data (name, avatar, bio) is stored separately from auth credentials. Missing profile breaks the app (user has account but no profile).

**Verified by:**
- **Test:** `tests/integration/auth/signup.test.ts` (TODO - HIGH PRIORITY)
- **Code:** `components/auth/AuthForm.tsx` (sign up form)
- **Database:** `supabase/migrations/20260123_fix_user_trigger_and_rls.sql`
- **Trigger:** `create_user_profile()` function (creates profile automatically)

**Acceptance Criteria:**
- [x] Sign up creates auth.users record
- [x] Trigger automatically creates public.users record
- [x] Profile has auth_user_id linked to auth.users.id
- [x] Profile has email and full_name populated
- [x] If trigger fails, sign up transaction rolls back
- [x] User cannot sign up with existing email

**Examples:**

✅ **Valid:**
- User signs up with email + password + name → auth.users created → trigger creates public.users → Success
- Query `public.users WHERE auth_user_id = user.id` → Returns profile record

❌ **Invalid:**
- Auth.users created but trigger fails → **TRANSACTION ROLLED BACK** (no orphaned auth account)
- Sign up with email already in use → **BLOCKED** (unique constraint)
- Manual INSERT into auth.users → Profile might not exist (avoid direct DB manipulation)

**Edge Cases:**

- **Scenario:** Trigger function disabled/broken
  - **Behavior:** Sign up fails (no profile created)
  - **Impact:** High - users cannot sign up
  - **Mitigation:** Monitor trigger health, have rollback plan

- **Scenario:** User signs up, then immediately deleted from auth.users
  - **Behavior:** Trigger `on_auth_user_deleted` soft-deletes profile (sets is_active=false)
  - **Why:** Maintains data integrity, allows audit trail

- **Scenario:** Concurrent sign-ups with same email
  - **Behavior:** One succeeds, others get unique constraint error
  - **Why:** Database prevents duplicates

**Related Behaviors:**
- B-AUTH-002: Sign In Requires Active Profile
- B-AUTH-003: Session Management
- B-USR-001: Profile Soft Delete

**Testing Priority:** 🔴 CRITICAL (core functionality, data integrity)

**History:**
- 2026-01-24: Implemented (v0.1.0) - Initial trigger
- 2026-01-23: Fixed (v0.1.2) - Trigger bug fixes
- 2026-02-07: Documented

---

## B-AUTH-002: Sign In Requires Active Profile

**Rule:** Users can only sign in if they have an active profile (is_active=true).

**Why:** Soft-deleted users should not be able to access the app even if auth credentials are valid.

**Verified by:**
- **Test:** `tests/integration/auth/signin.test.ts` (TODO)
- **Code:** `components/auth/AuthForm.tsx` (sign in form)
- **Code:** `lib/auth/AuthContext.tsx` (session check)
- **Database:** RLS policies check is_active flag

**Acceptance Criteria:**
- [x] Sign in with valid credentials succeeds if is_active=true
- [ ] Sign in with valid credentials fails if is_active=false (TODO - verify)
- [x] Auth context checks is_active on session load
- [ ] Inactive users are redirected to account reactivation page (TODO)

**Examples:**

✅ **Valid:**
- User signs in with correct email/password → Profile has is_active=true → Success
- Active user navigates to protected route → Allowed

❌ **Invalid:**
- Deleted user signs in with correct credentials → **SHOULD BE BLOCKED** (verify)
- Inactive user accesses protected route → **SHOULD REDIRECT** (implement)

**Edge Cases:**

- **Scenario:** User deactivated while logged in
  - **Behavior:** Current session remains valid (no real-time check)
  - **Future:** Add real-time session validation

- **Scenario:** User self-deactivates, then tries to reactivate
  - **Behavior:** Contact support (no self-service reactivation yet)
  - **Future:** Add reactivation flow

**Related Behaviors:**
- B-AUTH-001: Sign Up Creates Profile
- B-USR-001: Profile Soft Delete

**Testing Priority:** 🔴 CRITICAL (security, prevents deleted users from accessing)

**Status:** 🟡 PARTIALLY IMPLEMENTED (needs verification)

**History:**
- 2026-01-24: Implemented (v0.1.0) - is_active flag
- 2026-02-07: Documented (needs testing)

---

## B-AUTH-003: Session Persistence

**Rule:** User sessions persist across browser refreshes and tab closes.

**Why:** Users expect to stay logged in. Improves UX, reduces friction.

**Verified by:**
- **Test:** `tests/e2e/auth/session-persistence.test.ts` (TODO)
- **Code:** `lib/auth/AuthContext.tsx` (onAuthStateChange listener)
- **Supabase:** Local storage for session tokens

**Acceptance Criteria:**
- [x] Sign in stores session in local storage
- [x] Refresh page maintains session
- [x] Close and reopen browser maintains session
- [x] Session expires after Supabase timeout (default: 7 days)
- [x] Sign out clears session from storage

**Examples:**

✅ **Valid:**
- User signs in → Closes tab → Reopens site → Still logged in
- User signs in → Waits 6 days → Still logged in
- User signs out → Session cleared immediately

❌ **Invalid:**
- User signs in → Waits 8 days → **SESSION EXPIRED** (must sign in again)
- User signs in → Clears local storage → **SESSION LOST**

**Edge Cases:**

- **Scenario:** User signs in on multiple devices
  - **Behavior:** Independent sessions (both valid)
  - **Why:** Supabase allows multiple sessions

- **Scenario:** User changes password
  - **Behavior:** All sessions invalidated
  - **Why:** Security - prevents unauthorized access with old password

- **Scenario:** Session token stolen/leaked
  - **Behavior:** Attacker can use until expiry
  - **Mitigation:** Short expiry time, sign out revokes token

**Related Behaviors:**
- B-AUTH-004: Sign Out Cleanup
- B-AUTH-005: Session Refresh

**Testing Priority:** 🟡 HIGH (UX, security)

**History:**
- 2026-01-24: Implemented (v0.2.0) - AuthContext with Supabase
- 2026-02-07: Documented

---

## B-AUTH-004: Sign Out Cleanup

**Rule:** Sign out MUST clear session tokens, cookies, and local storage.

**Why:** Prevents session hijacking, especially on shared devices.

**Verified by:**
- **Test:** `tests/integration/auth/signout.test.ts` (TODO)
- **Code:** `lib/auth/AuthContext.tsx` (signOut function)
- **Supabase:** supabase.auth.signOut()

**Acceptance Criteria:**
- [x] Sign out calls Supabase signOut()
- [x] Local storage cleared
- [x] User redirected to login page
- [x] Subsequent requests show user as unauthenticated
- [x] Cannot access protected routes after sign out

**Examples:**

✅ **Valid:**
- User clicks "Sign Out" → Session cleared → Redirected to /login
- After sign out, accessing /groups → Redirected to /login

❌ **Invalid:**
- Sign out but session remains → **SECURITY ISSUE** (should not happen)
- Sign out but can still access protected routes → **SECURITY ISSUE**

**Edge Cases:**

- **Scenario:** Sign out while offline
  - **Behavior:** Local session cleared, server notified when back online
  - **Why:** Client-side cleanup happens immediately

- **Scenario:** Multiple tabs open, sign out in one
  - **Behavior:** All tabs should reflect signed-out state
  - **Current:** May require refresh (Supabase event propagation)

**Related Behaviors:**
- B-AUTH-003: Session Persistence

**Testing Priority:** 🔴 CRITICAL (security)

**History:**
- 2026-01-24: Implemented (v0.2.0) - Basic sign out
- 2026-02-07: Documented

---

## B-AUTH-005: Protected Route Enforcement

**Rule:** Users MUST be authenticated to access protected routes.

**Why:** Prevents unauthorized access to app features and user data.

**Verified by:**
- **Test:** `tests/e2e/auth/protected-routes.test.ts` (TODO)
- **Code:** `proxy.ts` (Next.js 16 middleware)
- **Code:** `lib/auth/AuthContext.tsx` (client-side checks)

**Acceptance Criteria:**
- [x] Unauthenticated users redirected from protected routes
- [x] Authenticated users can access protected routes
- [x] Redirect preserves original destination (return URL)
- [x] Public routes (/, /login, /signup) accessible to all
- [x] Middleware runs on all requests

**Examples:**

✅ **Valid:**
- Logged-out user navigates to /groups → Redirected to /login
- Logged-in user navigates to /groups → Allowed
- Anyone can access / (landing page)

❌ **Invalid:**
- Logged-out user accesses /groups → **BLOCKED** (redirect)
- Logged-out user accesses /profile → **BLOCKED** (redirect)

**Edge Cases:**

- **Scenario:** Session expires while on protected route
  - **Behavior:** Next request redirects to /login
  - **UX:** Could add session expiry warning (future)

- **Scenario:** User manually types protected URL
  - **Behavior:** Middleware catches, redirects to /login
  - **Why:** Server-side enforcement

**Protected Routes:**
- `/groups`, `/groups/[id]`, `/groups/create`, `/groups/[id]/edit`
- `/journeys/[id]`, `/my-journeys`
- `/invitations`
- `/profile`, `/profile/edit`
- `/admin/*`

**Public Routes:**
- `/`, `/login`, `/signup`

**Related Behaviors:**
- B-AUTH-003: Session Persistence
- B-AUTH-002: Sign In Requires Active Profile

**Testing Priority:** 🔴 CRITICAL (security, core functionality)

**History:**
- 2026-01-24: Implemented (v0.2.0) - Middleware protection
- 2026-02-07: Documented

---

## Notes

**Implemented Behaviors:**
- ✅ B-AUTH-001: Sign Up Creates Profile
- 🟡 B-AUTH-002: Sign In Requires Active Profile (needs verification)
- ✅ B-AUTH-003: Session Persistence
- ✅ B-AUTH-004: Sign Out Cleanup
- ✅ B-AUTH-005: Protected Route Enforcement

**Test Coverage:**
- 0 / 5 behaviors have tests (0%)
- **Priority:** Write tests for B-AUTH-001 and B-AUTH-005 (critical paths)

**Next Behaviors to Document:**
- B-AUTH-006: Password Reset Flow
- B-AUTH-007: Email Verification (if implemented)
- B-AUTH-008: OAuth Integration (deferred to Phase 2)
