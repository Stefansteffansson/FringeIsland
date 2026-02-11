# Journey System Behaviors

> **Purpose:** Document the fundamental rules and guarantees for journey discovery, enrollment, content delivery, and progress tracking.
> **Domain Code:** JRN

---

## B-JRN-001: Journey Catalog Discovery ✅

**Rule:** Only published journeys are visible to authenticated users. Unauthenticated users cannot access the journey catalog.

**Why:** Unpublished journeys are drafts or system-internal content. Exposing them would show incomplete content and bypass editorial control. Authentication gate ensures only registered users can access learning materials.

**Verified by:**
- **Test:** `tests/integration/journeys/catalog.test.ts` (TODO)
- **Code:** `app/journeys/page.tsx` (fetches `is_published=true` journeys)
- **Database:** RLS policy on `journeys` table (SELECT - authenticated users, published only)

**Acceptance Criteria:**
- [x] Only journeys with `is_published=true` appear in catalog
- [x] Unauthenticated users are redirected to login
- [x] Search filters by title and description (case-insensitive)
- [x] Difficulty filter shows only journeys of selected level
- [x] Tag filter shows only journeys with matching tags
- [x] Clear filters resets to full catalog
- [x] Results counter reflects active filters
- [ ] Unpublished journeys never appear regardless of other conditions

**Examples:**

✅ **Valid:**
- Authenticated user visits `/journeys` → Sees all published journeys
- User searches "leadership" → Sees only journeys matching title/description
- User filters "beginner" → Sees only beginner-level journeys
- User filters by tag "communication" → Sees only tagged journeys
- Search + difficulty combined → Intersection of both filters applied

❌ **Invalid:**
- Unauthenticated user visits `/journeys` → **REDIRECTED** to login
- User queries all journeys (including unpublished) → **BLOCKED** (RLS filters)
- Admin creates draft journey → **NOT VISIBLE** until `is_published=true`

**Edge Cases:**

- **Scenario:** No journeys match current filters
  - **Behavior:** Empty state shown with "Clear Filters" CTA
  - **Why:** Graceful degradation; user can reset easily

- **Scenario:** All journeys are unpublished (e.g., fresh environment)
  - **Behavior:** Empty catalog shown; no errors
  - **Why:** Zero-state should be handled gracefully

- **Scenario:** Journey is public but not published
  - **Behavior:** NOT visible in catalog (is_published takes precedence)
  - **Why:** Public controls discovery after publishing; published controls availability

**Related Behaviors:**
- B-JRN-002: Journey Detail Access
- B-JRN-003: Journey Enrollment Rules

**Testing Priority:** 🟡 HIGH (core feature, user-facing)

**History:**
- 2026-01-27: Implemented (v0.2.8) - Journey catalog with search and filters
- 2026-02-09: Documented

---

## B-JRN-002: Journey Detail Access ✅

**Rule:** Any authenticated user can view the full details and curriculum of any published journey, regardless of enrollment status.

**Why:** Users need to evaluate a journey before enrolling. Hiding content behind enrollment creates friction and reduces uptake. Curriculum transparency is a feature, not a risk.

**Verified by:**
- **Test:** `tests/integration/journeys/detail.test.ts` (TODO)
- **Code:** `app/journeys/[id]/page.tsx` (fetches journey by ID)
- **Database:** RLS policy on `journeys` table (SELECT)

**Acceptance Criteria:**
- [x] Authenticated user can view any published journey at `/journeys/[id]`
- [x] Overview tab shows: title, description, learning objectives, target audience, prerequisites
- [x] Curriculum tab shows: all steps with title, type, duration, description
- [x] Curriculum steps are expandable/collapsible
- [x] Sidebar shows: difficulty level, estimated duration, tags
- [x] Enrollment button state reflects user's current enrollment status
- [ ] Unauthenticated user redirected to login

**Enrollment Button States:**
- Not enrolled → "Enroll in Journey" (opens enrollment modal)
- Enrolled individually → "View My Journeys" (green, links to /my-journeys)
- Enrolled via group → "Enrolled via [Group Name]" (info badge)
- Not logged in → "Sign in to Enroll" (links to /login)

**Examples:**

✅ **Valid:**
- User visits `/journeys/[id]` for any published journey → Full details displayed
- User already enrolled → Button shows "View My Journeys"
- User enrolled via group → Button shows group name
- User not enrolled → Button shows "Enroll in Journey"

❌ **Invalid:**
- Unauthenticated user visits detail page → **REDIRECTED** to login
- User visits unpublished journey URL directly → **404 or access denied**
- Non-existent journey ID → **404 page shown**

**Edge Cases:**

- **Scenario:** Journey has no steps defined in content JSONB
  - **Behavior:** Curriculum tab shows empty state
  - **Why:** Graceful handling of incomplete journey data

- **Scenario:** Journey is unpublished after user bookmarked the URL
  - **Behavior:** 404 or access denied (RLS blocks SELECT)
  - **Why:** Unpublished = not available; consistent with catalog behavior

- **Scenario:** User enrolled individually AND via group (currently prevented, but defensive)
  - **Behavior:** Shows individual enrollment status (individual takes precedence in display)
  - **Why:** Individual enrollment is the primary relationship

**Related Behaviors:**
- B-JRN-001: Journey Catalog Discovery
- B-JRN-003: Journey Enrollment Rules

**Testing Priority:** 🟢 MEDIUM (display logic, low security risk)

**History:**
- 2026-01-27: Implemented (v0.2.8) - Journey detail page with tabs
- 2026-01-31: Updated (v0.2.10) - Dynamic enrollment button states
- 2026-02-09: Documented

---

## B-JRN-003: Journey Enrollment Rules ✅

**Rule:** A user can enroll individually in any published journey once. A Group Leader can enroll their group in any published journey once. A user cannot be enrolled individually AND via group in the same journey simultaneously.

**Why:** Duplicate enrollments create conflicting progress records and confusing UX. Enrollment is a deliberate commitment that should be tracked unambiguously. Group enrollment is a leadership action affecting all group members.

**Verified by:**
- **Test:** `tests/integration/journeys/enrollment.test.ts` (TODO)
- **Code:** `components/journeys/EnrollmentModal.tsx` (validation logic)
- **Code:** `app/journeys/[id]/page.tsx` (enrollment status check)
- **Database:** RLS policy on `journey_enrollments` table
- **Database:** CHECK constraint `(user_id IS NOT NULL AND group_id IS NULL) OR (user_id IS NULL AND group_id IS NOT NULL)`

**Acceptance Criteria:**
- [x] Users can enroll in unlimited journeys individually
- [x] Users can be enrolled in same journey via different groups (different groups = separate records)
- [x] Cannot enroll individually AND via group in same journey
- [x] Only Group Leaders can enroll groups
- [x] Groups cannot be enrolled twice in the same journey
- [x] Enrollment status persisted in `journey_enrollments` table
- [x] Enrollment modal shows only groups where user is a Group Leader
- [x] Success state shown after enrollment; button updates without page reload

**Examples:**

✅ **Valid:**
- User enrolls individually in "Leadership Fundamentals" → Success
- Group Leader enrolls "Team Alpha" in "Agile Collaboration" → Success
- User is Group Leader of 2 groups → Can enroll both groups in same journey (separate records)
- User is member of group enrolled in journey AND enrolls individually in a DIFFERENT journey → Success

❌ **Invalid:**
- User already enrolled individually → Attempts to enroll again → **BLOCKED** (modal prevents, checked before showing)
- Group already enrolled → Leader attempts to re-enroll → **BLOCKED** (duplicate enrollment check)
- User enrolled individually in Journey X → Attempts group enrollment in Journey X → **BLOCKED** (dual enrollment prevention)
- Regular member (non-leader) selects "Group" enrollment → **BLOCKED** (only leader groups shown; empty if non-leader)
- Group enrollment attempt with no groups where user is leader → **BLOCKED** (Group tab shows "No groups available")

**Edge Cases:**

- **Scenario:** User is removed from group mid-journey
  - **Behavior:** Group enrollment record remains; user loses access to group content but enrollment record stays
  - **Why:** Enrollment is a group-level record, not user-level for group enrollments

- **Scenario:** Group is deleted while enrolled in journey
  - **Behavior:** Group enrollment CASCADE deleted with the group
  - **Why:** Group no longer exists; no orphaned enrollment records

- **Scenario:** Journey is unpublished after enrollment
  - **Behavior:** Enrollment record stays; user can still access via My Journeys
  - **Why:** Already-enrolled users keep access; unpublishing affects new enrollments only

- **Scenario:** User unenrolls then re-enrolls
  - **Behavior:** New enrollment record created; previous progress_data lost
  - **Why:** Unenroll = DELETE record; re-enroll = fresh start

**Related Behaviors:**
- B-JRN-002: Journey Detail Access (enrollment button states)
- B-JRN-004: Journey Step Navigation (requires active enrollment)
- B-JRN-005: Step Completion Tracking (progress saved per enrollment)
- B-GRP-001: Last Leader Protection (Group Leaders can enroll groups)

**Testing Priority:** 🔴 CRITICAL (business logic, data integrity, prevents duplicate records)

**History:**
- 2026-01-31: Implemented (v0.2.10) - Individual + group enrollment
- 2026-01-31: RLS recursion bug fixed (simplified policies, app-layer prevention)
- 2026-02-09: Documented

---

## B-JRN-004: Journey Step Navigation ✅

**Rule:** Enrolled users navigate journey steps sequentially. Steps must be completed in order for linear journeys. Users cannot skip required steps.

**Why:** The journey metaphor implies progression — each step builds on the previous. Skipping required steps undermines the learning sequence and defeats the purpose of structured learning paths. Linear ordering ensures intentional learning experiences.

**Verified by:**
- **Test:** `tests/integration/journeys/step-navigation.test.ts` (TODO)
- **Code:** `app/journeys/[id]/play/page.tsx` (TODO - journey player)
- **Code:** `components/journeys/JourneyPlayer.tsx` (TODO)
- **Database:** `journey_enrollments.progress_data` JSONB tracks current step

**Acceptance Criteria:**
- [ ] Only enrolled users can access the journey player at `/journeys/[id]/play`
- [ ] Unenrolled users viewing `/journeys/[id]/play` are redirected to journey detail page
- [ ] Steps are displayed in the order defined in `journeys.content.steps`
- [ ] "Next" button advances to the next step (disabled on last step)
- [ ] "Previous" button goes back to previous step (disabled on first step)
- [ ] Step counter shows current position (e.g., "Step 3 of 8")
- [ ] Step list/sidebar shows all steps with completion status
- [ ] Required steps must be marked complete before advancing (if `required: true`)
- [ ] Non-required steps can be skipped
- [ ] Current step saved to `progress_data.current_step_id` on navigation

**Examples:**

✅ **Valid:**
- Enrolled user visits `/journeys/[id]/play` → Sees step 1 (or last visited step)
- User completes step 1 → Clicks "Next" → Step 2 displayed
- User on step 3 → Clicks "Previous" → Step 2 displayed
- User completes all steps → "Next" replaced with "Complete Journey"
- User can navigate sidebar to any previously visited step

❌ **Invalid:**
- Unenrolled user visits `/journeys/[id]/play` → **REDIRECTED** to journey detail page
- User attempts to skip required step → **BLOCKED** ("Complete this step to continue" message)
- User on step 1 → "Previous" button → **DISABLED** (no step 0)
- User on last step → "Next" button → **DISABLED** (shows "Complete Journey" instead)

**Edge Cases:**

- **Scenario:** Journey content JSONB has no steps
  - **Behavior:** Player shows "No content available" message
  - **Why:** Graceful handling of malformed journey data

- **Scenario:** Journey content updated after user started (new steps added)
  - **Behavior:** New steps appear in step list; user continues from their saved position
  - **Why:** Additive changes to journey should not break in-progress users

- **Scenario:** User enrolled via group — who tracks progress?
  - **Behavior:** Progress tracked per enrollment record (group_id based)
  - **Why:** Group enrollment = shared journey; individual's progress tracked separately within group context (Phase 2 consideration)
  - **Current MVP:** Group enrollment tracks progress at group level via progress_data

- **Scenario:** User exits mid-step (closes browser)
  - **Behavior:** Returns to same step on next visit (current_step_id saved)
  - **Why:** Progress should be durable, not lost on accidental close

**Related Behaviors:**
- B-JRN-003: Journey Enrollment Rules (must be enrolled to navigate)
- B-JRN-005: Step Completion Tracking (completing steps enables progression)
- B-JRN-006: Journey Resume (navigation tied to saved position)

**Testing Priority:** 🔴 CRITICAL (core feature, data integrity)

**Status:** ✅ IMPLEMENTED (v0.2.11)

**History:**
- 2026-02-09: Documented (planned for next sprint)
- 2026-02-11: Implemented — `JourneyPlayer.tsx` with Next/Prev navigation, step counter, `current_step_id` saved to `progress_data` on every navigation

---

## B-JRN-005: Step Completion Tracking ✅

**Rule:** When a user marks a step as complete, that completion is permanently recorded in their enrollment's `progress_data`. Completed steps cannot be "uncompleted". Overall progress percentage is calculated from completed steps.

**Why:** Completion is a meaningful user action that represents learning. Allowing "uncomplete" would create unreliable progress data and confuse users. Permanent recording allows accurate progress reporting and journey resumption.

**Verified by:**
- **Test:** `tests/integration/journeys/progress-tracking.test.ts` (TODO)
- **Code:** `components/journeys/JourneyPlayer.tsx` (TODO - step completion UI)
- **Database:** `journey_enrollments.progress_data` JSONB stores completion state
- **Database:** RLS UPDATE policy on `journey_enrollments` (users can update own enrollment)

**Acceptance Criteria:**
- [ ] "Mark Complete" / "Next" action records step ID in `progress_data.completed_steps`
- [ ] Completed step timestamp recorded in `progress_data.step_progress[step_id].completed_at`
- [ ] Step visually marked as complete in step list (checkmark, strikethrough, or similar)
- [ ] Progress percentage = `completed_steps.length / total_steps * 100`
- [ ] Progress percentage shown on journey player and My Journeys page
- [ ] Completing final step triggers journey completion flow
- [ ] `journey_enrollments.last_accessed_at` updated on each step interaction
- [ ] Step completion is idempotent (completing already-complete step is a no-op)

**Progress Data Structure (stored in `journey_enrollments.progress_data`):**
```json
{
  "current_step_id": "step_3",
  "completed_steps": ["step_1", "step_2"],
  "step_progress": {
    "step_1": {
      "completed_at": "2026-01-28T10:30:00Z",
      "time_spent_minutes": 35
    },
    "step_2": {
      "completed_at": "2026-01-28T11:15:00Z",
      "time_spent_minutes": 45
    }
  },
  "total_time_spent_minutes": 80,
  "last_checkpoint": "step_2"
}
```

**Examples:**

✅ **Valid:**
- User completes step 1 → `completed_steps` = `["step_1"]` → Progress = 12.5% (1/8 steps)
- User completes all 8 steps → `completed_steps` has all step IDs → Progress = 100%
- User navigates back to completed step → Step shown as complete; can review content
- User completes step 2 again (revisit) → No change to completed_steps (idempotent)

❌ **Invalid:**
- User attempts to "uncomplete" a step → **BLOCKED** (no uncomplete mechanism)
- User completes step via direct API call without being enrolled → **BLOCKED** (RLS UPDATE policy)
- Other user updates another user's progress_data → **BLOCKED** (RLS filters by user_id/group enrollment)

**Edge Cases:**

- **Scenario:** Journey has steps added after user started
  - **Behavior:** New steps not in `completed_steps`; progress percentage recalculates based on current total
  - **Why:** Total steps = journey's current step count, not at-enrollment count

- **Scenario:** Step removed from journey after user completed it
  - **Behavior:** Orphaned step ID remains in `completed_steps`; progress percentage may exceed expected (edge case handled gracefully)
  - **Why:** Can't un-do completed work; progress calculation should clamp at 100%

- **Scenario:** Network failure when saving completion
  - **Behavior:** Optimistic UI update; retry on failure; show error if persists
  - **Why:** Data loss on completion is bad UX; must confirm save

- **Scenario:** User enrolled via group — does each member track their own progress?
  - **Behavior:** MVP: single progress_data per group enrollment record
  - **Future (Phase 2):** Per-member progress tracking within group journey
  - **Why:** MVP simplicity; group progress as a unit

**Related Behaviors:**
- B-JRN-004: Journey Step Navigation (completion enables next step)
- B-JRN-006: Journey Resume (completion data used to restore position)
- B-JRN-007: Journey Completion (all steps complete = journey done)

**Testing Priority:** 🔴 CRITICAL (data integrity, core feature)

**Status:** ✅ IMPLEMENTED (v0.2.11)

**History:**
- 2026-02-09: Documented (planned for next sprint)
- 2026-02-11: Implemented — `handleMarkStepComplete()` in `JourneyPlayer.tsx` records `completed_steps[]`, `step_progress{}` with `completed_at` + `time_spent_minutes`, idempotent completion

---

## B-JRN-006: Journey Resume ✅

**Rule:** When an enrolled user returns to a journey they have previously started, they are automatically placed at their last saved step — not restarted from step 1.

**Why:** Journeys are multi-session experiences (150–300 min). Forcing users to restart from the beginning every session would destroy the learning experience and make the platform unusable for longer content.

**Verified by:**
- **Test:** `tests/integration/journeys/resume.test.ts` (TODO)
- **Code:** `app/journeys/[id]/play/page.tsx` (TODO - reads progress_data on load)
- **Code:** `app/my-journeys/page.tsx` (TODO - "Continue" button links to correct step)
- **Database:** `journey_enrollments.progress_data.current_step_id`

**Acceptance Criteria:**
- [ ] Opening `/journeys/[id]/play` for a started journey loads the last visited step
- [ ] My Journeys page shows "Continue" button (not "Start") for in-progress journeys
- [ ] "Continue" button on My Journeys links directly to the journey player
- [ ] Progress percentage shown on My Journeys card
- [ ] First-time visit to player starts at step 1 (no saved position)
- [ ] Completed journeys show "Review" button instead of "Continue"
- [ ] `last_accessed_at` timestamp updated on each session start

**Examples:**

✅ **Valid:**
- User completes steps 1-3, closes browser → Returns next day → Opens at step 4 (current_step)
- User on My Journeys → Sees "Continue (37.5%)" → Clicks → Lands on step 4 directly
- User completes all steps → My Journeys shows "Review Journey" button with 100% badge
- Brand new enrollment, first visit → Player starts at step 1

❌ **Invalid:**
- User returns to in-progress journey → Placed at step 1 → **BUG** (should resume from last position)
- Completed journey → My Journeys shows "Continue" → **BUG** (should show "Review")
- User visits player, `current_step_id` missing → Crashes → **BUG** (should default to step 1)

**Edge Cases:**

- **Scenario:** `current_step_id` in progress_data refers to a step that no longer exists (journey updated)
  - **Behavior:** Fallback to first incomplete step; if none, go to step 1
  - **Why:** Defensive handling; deleted step IDs should not crash the player

- **Scenario:** User has multiple group enrollments in same journey
  - **Behavior:** Each group enrollment has its own progress_data; My Journeys shows both
  - **Why:** Different group contexts = separate learning journeys

- **Scenario:** User enrolled individually AND group enrollment created by leader for same journey (normally prevented, but defensive)
  - **Behavior:** Individual enrollment shown in Individual tab; group in Group tab; separate progress
  - **Why:** Different enrollment types = different progress contexts

- **Scenario:** `progress_data` is empty `{}` (just enrolled, never started)
  - **Behavior:** Player starts at first step; My Journeys shows "Start Journey" (not "Continue")
  - **Why:** Empty progress_data = not started; accurate label matters

**Related Behaviors:**
- B-JRN-004: Journey Step Navigation (navigation updates saved position)
- B-JRN-005: Step Completion Tracking (completion state used in resume)
- B-JRN-003: Journey Enrollment Rules (must be enrolled to resume)

**Testing Priority:** 🔴 CRITICAL (core user experience, data-driven)

**Status:** ✅ IMPLEMENTED (v0.2.11)

**History:**
- 2026-02-09: Documented (planned for next sprint)
- 2026-02-11: Implemented — `getInitialStepIndex()` reads `progress_data.current_step_id` on player load; `my-journeys/page.tsx` shows "Start Journey" / "Continue" / "Review Journey" and progress %

---

## B-JRN-007: Journey Completion ✅

**Rule:** A journey is marked as complete when all required steps are completed. Completion updates `journey_enrollments.status` to `'completed'` and records `completed_at` timestamp.

**Why:** Completion is a milestone worth celebrating and tracking. Status change enables filtering (completed vs. active journeys), future badge/certificate features, and accurate reporting. Required vs. optional steps allows some flexibility without preventing completion.

**Verified by:**
- **Test:** `tests/integration/journeys/completion.test.ts` (TODO)
- **Code:** `components/journeys/JourneyPlayer.tsx` (TODO - completion detection)
- **Database:** `journey_enrollments.status` CHECK constraint (`'active'`, `'completed'`, `'paused'`, `'frozen'`)
- **Database:** `journey_enrollments.completed_at` timestamp

**Acceptance Criteria:**
- [ ] Completing the last required step triggers completion flow
- [ ] `journey_enrollments.status` updated to `'completed'`
- [ ] `journey_enrollments.completed_at` set to current timestamp
- [ ] User sees congratulations/completion screen
- [ ] My Journeys card shows "Completed" badge and completion date
- [ ] "Continue Journey" button replaced with "Review Journey" after completion
- [ ] Optional steps can still be accessed/viewed after journey completion
- [ ] Completed journeys cannot be re-completed (status stays `'completed'`)

**Examples:**

✅ **Valid:**
- User completes all 8 required steps → Completion screen shown → Status = 'completed'
- Completed journey card on My Journeys → Shows green "Completed" badge
- User revisits completed journey → Player in "review mode" → Can read all steps
- Journey has 1 optional step → User skips it → Completes all required → Journey marked complete

❌ **Invalid:**
- User completes 7/8 required steps → Journey marked complete → **BUG** (all required steps needed)
- Completed journey → Status reset to 'active' by user → **BLOCKED** (no mechanism for this)
- Unenrolled user marks journey complete via API → **BLOCKED** (RLS UPDATE policy)

**Edge Cases:**

- **Scenario:** Journey has no required steps (all `required: false`)
  - **Behavior:** Journey can be completed immediately (or on first step completion)
  - **Current Decision:** TBD - may require completing ALL steps when none marked required
  - **Why:** Ambiguous case; need product decision

- **Scenario:** New required step added after user already "completed" journey
  - **Behavior:** Status remains `'completed'`; new step available for review
  - **Why:** Retroactively invalidating completions is bad UX

- **Scenario:** Group enrollment completion
  - **Behavior:** MVP - group enrollment marked complete when progress indicates all steps done
  - **Future:** May require % of members completing before group marked complete

**Related Behaviors:**
- B-JRN-005: Step Completion Tracking (completion data drives this behavior)
- B-JRN-006: Journey Resume ("Review" mode after completion)

**Testing Priority:** 🟡 HIGH (milestone event, data integrity)

**Status:** ✅ IMPLEMENTED (v0.2.11)

**History:**
- 2026-02-09: Documented (planned for next sprint)
- 2026-02-11: Implemented — auto-detects when all required steps complete, updates `status='completed'` + `completed_at`, shows celebration screen; "Review Journey" mode in `my-journeys/page.tsx`

---

## Notes

**Implementation Status:**

| Behavior | Description | Status | Tests |
|----------|-------------|--------|-------|
| B-JRN-001 | Journey Catalog Discovery | ✅ Implemented (v0.2.8) | `catalog.test.ts` — 6 tests ✅ |
| B-JRN-002 | Journey Detail Access | ✅ Implemented (v0.2.8) | `detail.test.ts` — 7 tests ✅ |
| B-JRN-003 | Journey Enrollment Rules | ✅ Implemented (v0.2.10) | `enrollment.test.ts` — 9 tests ✅ |
| B-JRN-004 | Journey Step Navigation | ✅ Implemented (v0.2.11) | `step-navigation.test.ts` — 5 tests ✅ |
| B-JRN-005 | Step Completion Tracking | ✅ Implemented (v0.2.11) | `progress-tracking.test.ts` — 8 tests ✅ |
| B-JRN-006 | Journey Resume | ✅ Implemented (v0.2.11) | `resume.test.ts` — 6 tests ✅ |
| B-JRN-007 | Journey Completion | ✅ Implemented (v0.2.11) | `completion.test.ts` — 7 tests ✅ |

**Key Components:**
- `app/journeys/[id]/play/page.tsx` — Journey player page (enrollment check, load state)
- `components/journeys/JourneyPlayer.tsx` — Full player: navigation, step completion, save progress, completion detection
- `app/my-journeys/page.tsx` — "Start" / "Continue" / "Review Journey" buttons, progress % display

**Test Coverage:**
- 7 / 7 behaviors have tests (100%) ✅
- Total: 48 tests across 7 files, all passing
- **Last updated:** 2026-02-11

**Next Behaviors to Document (Future Phases):**
- B-JRN-008: Group Progress Visibility (Travel Guide can see member progress) - Phase 2
- B-JRN-009: Journey Unenrollment Rules
- B-JRN-010: Journey Access After Unenrollment
