# Security Behaviors

> **Purpose:** Document the fundamental security rules and guarantees for journey access control and enrollment enforcement.
> **Domain Code:** SEC
> **Sprint:** Sprint 0 — Security Fixes (2026-02-28)

---

## B-SEC-001: Non-Public Journey Visibility

**Rule:** Non-public journeys (`is_public = false`) are only visible to members of the group that owns the journey (`created_by_group_id`). Public journeys (`is_public = true`) are visible to all authenticated users. This is enforced at the RLS level.

**Why:** Non-public journeys are exclusive content created by/for specific groups. If any authenticated user can read them by knowing the UUID, the public/non-public distinction is meaningless. RLS enforcement is required because app-layer checks can be bypassed via direct Supabase API calls.

**Verified by:**
- **Test:** `tests/integration/security/journey-access.test.ts`
- **Database:** RLS policy `journeys_select_published` on `journeys` table

**Acceptance Criteria:**
- [x] Public, published journeys (`is_public = true, is_published = true`) are visible to all authenticated users
- [x] Non-public, published journeys (`is_public = false, is_published = true`) are visible ONLY to members of the owning group (`created_by_group_id`)
- [x] Non-public journeys are also visible to users enrolled in them (via `journey_enrollments`)
- [x] Unpublished journeys (`is_published = false`) are not visible to any non-admin user regardless of `is_public`
- [x] Platform admins (DeusEx members) can see all journeys regardless of `is_public`
- [x] Direct Supabase SELECT on a non-public journey UUID returns empty for non-members

**Examples:**

✅ **Valid:**
- Authenticated user queries `/journeys` → Sees all public, published journeys
- Member of "Team Alpha" queries journey owned by "Team Alpha" (`is_public = false`) → Sees it
- User enrolled in a non-public journey → Can still read the journey details
- Platform admin queries any journey → Sees it

❌ **Invalid:**
- Non-member queries a non-public journey by UUID → **EMPTY RESULT** (RLS blocks)
- Unauthenticated request → **BLOCKED** (policy is `TO authenticated`)
- Non-member uses Supabase JS client to `.select()` a non-public journey → **EMPTY RESULT**

**Edge Cases:**

- **Scenario:** User leaves a group that owns a non-public journey, but is still enrolled
  - **Behavior:** User can still see the journey (enrollment-based access)
  - **Why:** Frozen enrollments should allow read-only access until explicitly revoked

- **Scenario:** Journey has `is_public = false` AND `is_published = false`
  - **Behavior:** Not visible to anyone (unpublished takes precedence)
  - **Why:** Unpublished = draft; never exposed regardless of other flags

- **Scenario:** All 8 predefined journeys (currently `is_public = true`)
  - **Behavior:** Visible to everyone (no change to current behavior for public journeys)
  - **Why:** Public journeys are the default; this fix only restricts non-public ones

**Related Behaviors:**
- B-SEC-002: Non-Public Journey Enrollment Gating
- B-JRN-001: Journey Catalog Discovery

**Testing Priority:** 🔴 CRITICAL (security — data exposure)

**History:**
- 2026-02-28: Created (Sprint 0 — Security Fixes)
- 2026-02-28: Verified — all 6 acceptance criteria passing (19/19 security tests GREEN)

---

## B-SEC-002: Non-Public Journey Enrollment Gating

**Rule:** Users can only enroll in non-public journeys (`is_public = false`) if they are a member of the group that owns the journey (`created_by_group_id`). Public journeys have no enrollment restrictions beyond authentication. This is enforced at both the RLS level (INSERT policy) and the application layer (EnrollmentModal).

**Why:** Non-public journeys are exclusive group content. Allowing anyone to enroll bypasses the group's content boundaries. Even if B-SEC-001 hides the journey from non-members, a crafted INSERT via Supabase API could create an enrollment if the INSERT policy doesn't check ownership.

**Verified by:**
- **Test:** `tests/integration/security/journey-access.test.ts`
- **Code:** `components/journeys/EnrollmentModal.tsx`
- **Database:** RLS INSERT policy on `journey_enrollments` table

**Acceptance Criteria:**
- [x] Users can enroll in any public, published journey (existing behavior, unchanged)
- [x] Users can only enroll in non-public journeys if they are members of the owning group
- [x] EnrollmentModal checks `is_public` and shows appropriate error/messaging for non-public journeys
- [x] RLS INSERT policy on `journey_enrollments` validates journey is public OR enrolling user is member of owning group
- [x] Group enrollment in non-public journeys is allowed only if the enrolling group IS the owning group (or a member of it)
- [x] Direct Supabase INSERT for a non-public journey enrollment by non-member → **BLOCKED** by RLS

**Examples:**

✅ **Valid:**
- User enrolls in public journey "Leadership Fundamentals" → Success
- Member of "Team Alpha" enrolls in non-public journey owned by "Team Alpha" → Success
- Steward of "Team Alpha" enrolls "Team Alpha" in their own non-public journey → Success

❌ **Invalid:**
- Non-member crafts Supabase INSERT for a non-public journey enrollment → **BLOCKED** (RLS)
- User sees non-public journey detail page (shouldn't, per B-SEC-001) → enrollment button hidden
- Non-member group enrollment in another group's non-public journey → **BLOCKED**

**Edge Cases:**

- **Scenario:** Journey changes from public to non-public after user enrolled
  - **Behavior:** Existing enrollment preserved; user retains access
  - **Why:** Retroactively revoking access is destructive; enrollment freezing handles this separately

- **Scenario:** All current predefined journeys are `is_public = true`
  - **Behavior:** No enrollment change for existing journeys (all remain freely enrollable)
  - **Why:** This fix only restricts non-public journey enrollment

**Related Behaviors:**
- B-SEC-001: Non-Public Journey Visibility
- B-JRN-003: Journey Enrollment Rules
- B-SEC-003: Frozen Enrollment Enforcement (UI)

**Testing Priority:** 🔴 CRITICAL (security — unauthorized enrollment)

**History:**
- 2026-02-28: Created (Sprint 0 — Security Fixes)
- 2026-02-28: Verified — all 6 acceptance criteria passing (19/19 security tests GREEN)

---

## B-SEC-003: Frozen Enrollment Enforcement (UI)

**Rule:** When an enrollment has `status = 'frozen'`, the JourneyPlayer displays a read-only view with a contextual banner. Step completion is blocked. Navigation to new (unvisited) steps is blocked. Previously visited steps can be reviewed. No progress updates are saved.

**Why:** Frozen enrollments represent access that has been suspended (e.g., user left a group with non-public journey enrollment). Allowing continued progress on a frozen enrollment defeats the purpose of the freeze. Users should see their previous work but not advance further.

**Verified by:**
- **Test:** `tests/integration/security/frozen-enrollment.test.ts`
- **Code:** `components/journeys/JourneyPlayer.tsx`
- **Code:** `app/journeys/[id]/play/page.tsx`

**Acceptance Criteria:**
- [x] JourneyPlayer detects `enrollment.status === 'frozen'` on load
- [x] Frozen enrollment shows a visible banner: "This enrollment has been frozen. You can review previous steps but cannot make new progress."
- [x] "Mark Complete" button is disabled/hidden for frozen enrollments
- [x] "Next" navigation to unvisited steps is blocked for frozen enrollments
- [x] "Previous" navigation to already-visited steps is allowed (review mode)
- [x] No writes to `progress_data` occur for frozen enrollments
- [x] My Journeys page shows "Frozen" badge on frozen enrollment cards
- [x] Frozen enrollment cards do NOT show "Continue" or "Start" — show "Review" or disabled state

**Examples:**

✅ **Valid:**
- User with frozen enrollment visits `/journeys/[id]/play` → Sees banner + read-only view
- User navigates back to step 2 (previously completed) → Content displayed, no "Mark Complete" button
- My Journeys → Frozen card shows "Frozen" badge with grey/muted styling

❌ **Invalid:**
- User with frozen enrollment completes a step → **BLOCKED** (UI prevents)
- User with frozen enrollment navigates to unvisited step 5 → **BLOCKED** (can only review visited steps)
- User with frozen enrollment saves progress → **BLOCKED** (no writes to progress_data)
- Frozen enrollment shows "Continue Journey" button → **BUG** (should show frozen state)

**Edge Cases:**

- **Scenario:** Enrollment is unfrozen (status changed back to 'active')
  - **Behavior:** Normal player behavior resumes on next page load
  - **Why:** Unfreezing is a future feature; UI should respond to current status

- **Scenario:** Enrollment was frozen with 0 progress (never started)
  - **Behavior:** Banner shown, no steps available to review, empty state
  - **Why:** Nothing to review; frozen before starting

- **Scenario:** Completed enrollment is frozen (status changed from 'completed' to 'frozen')
  - **Behavior:** Unlikely scenario, but: treat as frozen (banner, read-only for all steps)
  - **Why:** Frozen overrides completed for display purposes

**Related Behaviors:**
- B-SEC-004: Frozen Enrollment Enforcement (RLS)
- B-JRN-004: Journey Step Navigation
- B-JRN-005: Step Completion Tracking

**Testing Priority:** 🔴 CRITICAL (security — access control enforcement)

**History:**
- 2026-02-28: Created (Sprint 0 — Security Fixes)
- 2026-02-28: Verified — all 8 acceptance criteria passing (19/19 security tests GREEN)

---

## B-SEC-004: Frozen Enrollment Enforcement (RLS)

**Rule:** Frozen enrollments (`status = 'frozen'`) cannot be updated via RLS policies. The `enrollment_update_own` and `enrollment_update_group` policies must include `AND status != 'frozen'` in their USING clause, preventing any progress writes or status changes to frozen enrollments at the database level.

**Why:** UI enforcement (B-SEC-003) can be bypassed via direct Supabase API calls. RLS is the last line of defense — if a frozen enrollment can be updated via the API, the freeze is cosmetic only. Defense in depth: both UI and RLS must enforce the freeze.

**Verified by:**
- **Test:** `tests/integration/security/frozen-enrollment.test.ts`
- **Database:** RLS UPDATE policies on `journey_enrollments` table

**Acceptance Criteria:**
- [x] `enrollment_update_own` RLS policy includes `AND status != 'frozen'` in USING clause
- [x] `enrollment_update_group` RLS policy includes `AND status != 'frozen'` in USING clause
- [x] Direct Supabase UPDATE on a frozen enrollment → **BLOCKED** (RLS returns 0 rows updated)
- [x] Active enrollments can still be updated normally (no regression)
- [x] Completed enrollments can still be updated normally (no regression)
- [x] Paused enrollments can still be updated normally (no regression)
- [x] Only admin/service role can modify frozen enrollments (for unfreezing)

**Examples:**

✅ **Valid:**
- User updates `progress_data` on active enrollment → Success (status = 'active', allowed)
- User updates `progress_data` on completed enrollment → Success (review mode saves allowed)
- Admin unfreezes enrollment via service role → Success (bypasses RLS)

❌ **Invalid:**
- User updates `progress_data` on frozen enrollment via Supabase client → **0 ROWS UPDATED** (RLS blocks)
- User changes frozen enrollment status to 'active' via API → **BLOCKED** (cannot self-unfreeze)
- Group leader updates frozen group enrollment progress → **BLOCKED** (frozen = locked)

**Edge Cases:**

- **Scenario:** Enrollment becomes frozen between user loading page and saving progress
  - **Behavior:** UPDATE silently fails (0 rows); UI should detect and show frozen state on next load
  - **Why:** Race condition; RLS provides safety net

- **Scenario:** Batch update of multiple enrollments (some frozen, some active)
  - **Behavior:** Only active enrollments updated; frozen ones skipped silently
  - **Why:** RLS filters per-row; mixed results are expected

**Related Behaviors:**
- B-SEC-003: Frozen Enrollment Enforcement (UI)
- B-JRN-005: Step Completion Tracking
- B-JRN-003: Journey Enrollment Rules

**Testing Priority:** 🔴 CRITICAL (security — RLS enforcement, defense in depth)

**History:**
- 2026-02-28: Created (Sprint 0 — Security Fixes)
- 2026-02-28: Verified — all 7 acceptance criteria passing (19/19 security tests GREEN)

---

## Notes

**Domain Code:** SEC (Security)

**All behaviors in this file are 🔴 CRITICAL priority** — they address active security gaps identified in the lifecycle roadmap analysis (2026-02-28).

**Sprint 0 Scope:**
| ID | Behavior | Security Item | Layer |
|----|----------|---------------|-------|
| B-SEC-001 | Non-Public Journey Visibility | S1 | RLS |
| B-SEC-002 | Non-Public Journey Enrollment Gating | S2 | RLS + App |
| B-SEC-003 | Frozen Enrollment Enforcement (UI) | S3 | App |
| B-SEC-004 | Frozen Enrollment Enforcement (RLS) | S4 | RLS |

**Dependencies:**
- B-SEC-001 and B-SEC-002 are related (visibility + enrollment) — test together
- B-SEC-003 and B-SEC-004 are related (UI + RLS frozen) — test together
- No dependency between the visibility pair and the frozen pair
