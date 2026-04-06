# Journey System

**Status:** ✅ Implemented (v0.2.8–v0.2.11, security fixes v0.2.32)
**Last Updated:** February 28, 2026
**Covers:** Catalog, enrollment, content delivery, progress tracking, access control

---

## Overview

Educational journey system where users can browse, enroll in, and complete structured learning experiences. Supports both individual enrollment (via personal group) and group enrollment (via engagement group). Content is delivered step-by-step through the JourneyPlayer.

**Key architectural note (D15):** The journey system uses the universal group pattern. There is no `user_id` anywhere in the journey tables. Individual enrollments use the user's `personal_group_id` as the `group_id`. Group enrollments use the engagement group's ID.

---

## Implemented Features

### Journey Catalog (v0.2.8)
**Page:** `/journeys` (`app/journeys/page.tsx`)

**Features:**
- Grid layout showing all published journeys
- Search by title and description
- Filter by difficulty (beginner, intermediate, advanced)
- Filter by topic/tags
- Results counter and clear filters button
- Responsive design

**Journey Cards Show:**
- Title and description
- Difficulty badge
- Estimated duration
- Tags
- "View Details" button

### Journey Detail Page (v0.2.8)
**Page:** `/journeys/[id]` (`app/journeys/[id]/page.tsx`)

**Sections:**
1. **Hero Section** — Title, description, gradient background, breadcrumb navigation
2. **Overview Tab** — Full description, learning objectives, target audience, prerequisites
3. **Curriculum Tab** — Expandable step list with type icons, duration, required tags
4. **Sidebar (Sticky)** — Difficulty, duration, tags, enrollment button

**Enrollment Button States:**
- Not enrolled: "Enroll in Journey" (opens EnrollmentModal)
- Enrolled individually: "View My Journeys" (green, links to /my-journeys)
- Enrolled via group: "Enrolled via [Group Name]" (info badge)
- Not logged in: "Sign in to Enroll" (links to /login)

### Journey Enrollment (v0.2.10)
**Component:** `components/journeys/EnrollmentModal.tsx`

**Features:**
- Two enrollment types:
  1. **Individual** — uses `userProfile.personal_group_id` as `group_id`
  2. **Group** — selects from groups where user has `enroll_group_in_journey` permission
- Permission check via `supabase.rpc('has_permission', ...)` per group
- Dual-enrollment prevention (individual + group for same journey)
- Catches `23505` unique violation as defensive fallback (no UNIQUE constraint on `(journey_id, group_id)` — see note below — but catches any unexpected DB-level duplicate)
- Success state with 1500ms delay before close

**Business Rules:**
- Users can enroll in unlimited journeys individually
- Users can enroll in the same journey via different groups
- Cannot enroll individually AND via group in same journey
- Only users with `enroll_group_in_journey` permission (Steward/Guide) can enroll groups
- Groups cannot be enrolled twice in same journey

### JourneyPlayer (v0.2.11)
**Page:** `/journeys/[id]/play` (`app/journeys/[id]/play/page.tsx`)
**Component:** `components/journeys/JourneyPlayer.tsx`

The main content delivery engine. Receives journey data and enrollment, renders step-by-step content.

**Features:**
- Linear step-by-step navigation (Previous / Next)
- Required-step gating (Next blocked until step marked complete)
- Progress saved to `progress_data` JSONB on every navigation and completion
- Resume from last position via `current_step_id`
- Completion detection (all required steps done -> `status = 'completed'`)
- Review mode for completed journeys (free navigation, review banner)
- `last_accessed_at` updated on mount (skipped for frozen enrollments)
- **Frozen enrollment enforcement (Sprint 0, v0.2.32):**
  - Detects `enrollment.status === 'frozen'` on load
  - Shows amber banner: "This enrollment has been frozen. You can review previous steps but cannot make new progress."
  - "Mark Complete" button hidden (passes `isReviewMode || isFrozen` to StepContent)
  - Navigation to unvisited steps blocked (only already-completed steps accessible)
  - No writes to `progress_data` (navigateToStep returns early when frozen)
  - `last_accessed_at` update skipped on mount
  - Next button label shows "End of Review" on last step

**Progress tracking per step:**
- `completed_at` timestamp
- `time_spent_minutes` (calculated from step entry time)
- Running `total_time_spent_minutes`
- `last_checkpoint` for resume

**Layout:** StepSidebar (left) + StepContent (main) in flex layout.

### Supporting Components (v0.2.11)

**`StepSidebar.tsx`** — Left panel showing:
- ProgressBar at top
- Clickable step list with status indicators (completed: green check, current: blue dot, future: gray number)
- Type icons (content: pencil, activity: pencil, assessment: check)
- Duration, required tags
- Steps only clickable if completed, current, or in review mode

**`StepContent.tsx`** — Main content area showing:
- Step header (type, step N of M, duration, required tag, completed badge)
- Description text
- Instructions in blue callout block (if present)
- Placeholder for rich `step.content` JSONB ("coming soon")
- Mark Complete / Complete Activity / Submit Assessment button

**`ProgressBar.tsx`** — Simple progress bar component:
- Props: `percent` (0-100), optional `label`, `size` (sm/md)
- Turns green at 100%

### My Journeys Page (v0.2.10)
**Page:** `/my-journeys` (`app/my-journeys/page.tsx`)

**Features:**
- Two tabs: Individual Journeys / Group Journeys
- Individual tab: enrollments where `group_id = personal_group_id`
- Group tab: enrollments where `group_id` is in user's active engagement groups
- Journey cards with title, description, status badge, difficulty, duration
- Progress bar when `total_steps` known and status is active or frozen
- Smart button labels: "Start Journey" / "Continue" / "Review Journey" / "Review Steps" (frozen)
- **Frozen enrollment display (Sprint 0, v0.2.32):**
  - Frozen cards show "Review Steps" button label (not "Continue" or "Start")
  - Progress bar uses grey color (`bg-gray-400`) instead of blue for frozen enrollments
- All links go to `/journeys/[id]/play`
- Empty states with "Browse Catalog" CTAs

**Navigation:**
- `🗺️ Journeys` link (exact match on `/journeys`)
- `📚 My Journeys` link (`startsWith` match on `/my-journeys`)

---

## Database Schema

### journeys Table
```sql
CREATE TABLE public.journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by_group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  journey_type TEXT NOT NULL DEFAULT 'predefined'
    CHECK (journey_type IN ('predefined', 'user_created', 'dynamic')),
  content JSONB,
  estimated_duration_minutes INTEGER,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
```

**D15 change:** `created_by_user_id` replaced by `created_by_group_id NOT NULL`. The RESTRICT constraint means a group cannot be deleted while it owns journeys. Auto-update trigger on `updated_at`.

**Content Structure (JSONB):**
```json
{
  "version": "1.0",
  "structure": "linear",
  "steps": [
    {
      "id": "step_1",
      "title": "Introduction to Leadership",
      "type": "content",
      "duration_minutes": 30,
      "required": true,
      "description": "Learn the fundamentals...",
      "instructions": "Read through the material and reflect on...",
      "content": { }
    }
  ]
}
```

### journey_enrollments Table
```sql
CREATE TABLE public.journey_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  enrolled_by_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'paused', 'frozen')),
  progress_data JSONB NOT NULL DEFAULT '{}',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ
);
```

**D15 changes:**
- No `user_id` column. The universal group pattern means `group_id` is always set:
  - Individual enrollment: `group_id` = user's `personal_group_id`
  - Group enrollment: `group_id` = engagement group's ID
- `enrolled_by_group_id` replaces `enrolled_by_user_id`
- `status_changed_at` is new (tracks when status last changed)
- The old XOR CHECK constraint (`user_id IS NOT NULL AND group_id IS NULL OR ...`) no longer exists
- No UNIQUE constraint on `(journey_id, group_id)` — duplicate prevention at application layer

**Progress Data Structure (JSONB):**
```json
{
  "current_step_id": "step_3",
  "completed_steps": ["step_1", "step_2"],
  "step_progress": {
    "step_1": {
      "completed_at": "2026-01-28T10:30:00Z",
      "time_spent_minutes": 35
    }
  },
  "total_time_spent_minutes": 125,
  "last_checkpoint": "step_2",
  "total_steps": 6
}
```

**Indexes:**
```sql
CREATE INDEX idx_journeys_published ON public.journeys(is_published, is_public);
CREATE INDEX idx_enrollments_group ON public.journey_enrollments(group_id);
CREATE INDEX idx_enrollments_journey ON public.journey_enrollments(journey_id);
```

---

## RLS Policies

### journeys Table

One SELECT policy — published journeys visible based on `is_public` flag (updated in Sprint 0, v0.2.32):

```sql
CREATE POLICY "journeys_select_published"
  ON public.journeys FOR SELECT TO authenticated
  USING (
    is_published = true
    AND (
      -- Public journeys: visible to all authenticated users
      is_public = true
      -- Non-public journeys: visible to owning group members
      OR public.is_active_group_member(created_by_group_id)
      -- Non-public journeys: visible to enrolled users (including frozen — for review)
      OR public.is_enrolled_in_journey(id)
      -- Platform admins: see all published journeys
      OR public.is_platform_admin()
    )
  );
```

No INSERT/UPDATE/DELETE policies for regular users (all journeys are system-seeded). Admins use service role.

**Helper function (Sprint 0):**
```sql
-- SECURITY DEFINER to avoid nested RLS on journey_enrollments
CREATE OR REPLACE FUNCTION public.is_enrolled_in_journey(check_journey_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.journey_enrollments
    WHERE journey_id = check_journey_id
      AND group_id = public.get_current_personal_group_id()
  );
$$;
```

### journey_enrollments Table

Five policies using RBAC helper functions:

**SELECT — own enrollments (personal group):**
```sql
CREATE POLICY "enrollment_select_own"
  ON public.journey_enrollments FOR SELECT TO authenticated
  USING (group_id = public.get_current_personal_group_id());
```

**SELECT — group enrollments (active member):**
```sql
CREATE POLICY "enrollment_select_group"
  ON public.journey_enrollments FOR SELECT TO authenticated
  USING (public.is_active_group_member(group_id));
```

**INSERT — individual (personal group only, with enrollability check — Sprint 0):**
```sql
CREATE POLICY "enrollment_insert_individual"
  ON public.journey_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    group_id = public.get_current_personal_group_id()
    AND enrolled_by_group_id = public.get_current_personal_group_id()
    AND public.is_journey_enrollable(journey_id)
  );
```

**INSERT — group (requires `enroll_group_in_journey` permission, with enrollability check — Sprint 0):**
```sql
CREATE POLICY "enrollment_insert_group"
  ON public.journey_enrollments FOR INSERT TO authenticated
  WITH CHECK (
    group_id != public.get_current_personal_group_id()
    AND enrolled_by_group_id = public.get_current_personal_group_id()
    AND public.has_permission(
      public.get_current_personal_group_id(),
      group_id,
      'enroll_group_in_journey'
    )
    AND public.is_journey_enrollable(journey_id)
  );
```

**Helper function (Sprint 0):**
```sql
-- SECURITY DEFINER to avoid nested RLS on journeys table
CREATE OR REPLACE FUNCTION public.is_journey_enrollable(check_journey_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.journeys
    WHERE id = check_journey_id
      AND is_published = true
      AND (
        is_public = true
        OR public.is_active_group_member(created_by_group_id)
      )
  );
$$;
```

**UPDATE — own enrollment (frozen enrollments blocked — Sprint 0):**
```sql
CREATE POLICY "enrollment_update_own"
  ON public.journey_enrollments FOR UPDATE TO authenticated
  USING (
    group_id = public.get_current_personal_group_id()
    AND status != 'frozen'
  )
  WITH CHECK (group_id = public.get_current_personal_group_id());
```

**UPDATE — group enrollment (with permission, frozen enrollments blocked — Sprint 0):**
```sql
CREATE POLICY "enrollment_update_group"
  ON public.journey_enrollments FOR UPDATE TO authenticated
  USING (
    public.has_permission(
      public.get_current_personal_group_id(), group_id, 'enroll_group_in_journey'
    )
    AND status != 'frozen'
  )
  WITH CHECK (
    public.has_permission(
      public.get_current_personal_group_id(), group_id, 'enroll_group_in_journey'
    )
  );
```

**Note:** No DELETE policy exists. Unenrollment is not currently implemented at the RLS level.

**Helper functions used:**
- `get_current_personal_group_id()` — returns `users.personal_group_id` for the authenticated user
- `is_active_group_member(group_id)` — checks active membership
- `has_permission(acting_group_id, context_group_id, permission_name)` — RBAC permission check
- `is_enrolled_in_journey(journey_id)` — checks enrollment via personal group (SECURITY DEFINER, Sprint 0)
- `is_journey_enrollable(journey_id)` — checks journey is published AND (public OR user is owning group member) (SECURITY DEFINER, Sprint 0)

---

## Predefined Journeys (v0.2.8)

**8 journeys seeded** via migration:

1. **Leadership Fundamentals** (180 min, Beginner) — 6 steps
2. **Effective Communication Skills** (240 min, Beginner) — 8 steps
3. **Building High-Performance Teams** (300 min, Intermediate) — 10 steps
4. **Personal Development Kickstart** (150 min, Beginner) — 5 steps
5. **Strategic Decision Making** (270 min, Advanced) — 9 steps
6. **Emotional Intelligence at Work** (210 min, Intermediate) — 7 steps
7. **Agile Team Collaboration** (200 min, Intermediate) — 8 steps
8. **Resilience and Stress Management** (180 min, Beginner) — 6 steps

---

## TypeScript Types

**Source of truth:** `lib/types/journey.ts`

Key types: `Journey`, `JourneyEnrollment`, `PlayerEnrollment`, `JourneyContent`, `JourneyStep`, `JourneyProgressData`, `StepProgressEntry`, `EnrollmentWithJourney`. Enums: `JourneyType`, `DifficultyLevel`, `StepType`, `EnrollmentStatus`.

---

## User Flows

### Browse Journeys
1. Navigate to `/journeys`
2. See catalog with search/filter controls
3. Search/filter to find relevant journeys
4. Click journey card to view details

### View Journey Details
1. View journey detail page at `/journeys/[id]`
2. See overview, curriculum, and metadata
3. Expand/collapse curriculum steps
4. Enrollment button shown based on auth and enrollment status

### Enroll Individually
1. Click "Enroll in Journey"
2. EnrollmentModal opens
3. Select "Myself" tab
4. Confirm enrollment
5. Insert: `group_id = personal_group_id`, `enrolled_by_group_id = personal_group_id`
6. Success state shown, modal closes
7. Button updates to "View My Journeys"

### Enroll Group (Steward/Guide)
1. Click "Enroll in Journey"
2. EnrollmentModal opens
3. Select "A Group" tab
4. Dropdown shows groups where user has `enroll_group_in_journey` permission
5. Select group, confirm
6. Insert: `group_id = engagement_group_id`, `enrolled_by_group_id = personal_group_id`
7. Success state shown, modal closes

### Play Journey
1. From My Journeys, click "Start Journey" / "Continue" / "Review Journey"
2. `/journeys/[id]/play` loads enrollment and journey data
3. JourneyPlayer renders with sidebar + content
4. Navigate steps with Previous/Next
5. Mark steps complete (required steps gate the Next button)
6. Progress auto-saved on every navigation
7. On all required steps complete: enrollment marked `completed`
8. Review mode allows free navigation of completed journeys

---

## API Patterns (Post-D15)

### Check Individual Enrollment
```typescript
const { data: individualEnrollment } = await supabase
  .from('journey_enrollments')
  .select('id')
  .eq('journey_id', journeyId)
  .eq('group_id', userProfile.personal_group_id)
  .maybeSingle();
```

### Find User's Groups (D15 Pattern)
```typescript
const { data: userGroups } = await supabase
  .from('group_memberships')
  .select('group_id')
  .eq('member_group_id', userProfile.personal_group_id)
  .eq('status', 'active');

const groupIds = userGroups?.map(g => g.group_id) || [];
```

### Check Group Enrollment
```typescript
// Explicit FK hint needed — two FKs to groups table
const { data: groupEnrollment } = await supabase
  .from('journey_enrollments')
  .select('id, groups!journey_enrollments_group_id_fkey(id, name)')
  .eq('journey_id', journeyId)
  .in('group_id', groupIds)
  .maybeSingle();
```

### Enroll Individually
```typescript
const { error } = await supabase
  .from('journey_enrollments')
  .insert({
    journey_id: journeyId,
    group_id: userProfile.personal_group_id,
    enrolled_by_group_id: userProfile.personal_group_id,
    status: 'active',
    progress_data: {},
  });
```

### Enroll Group
```typescript
const { error } = await supabase
  .from('journey_enrollments')
  .insert({
    journey_id: journeyId,
    group_id: selectedEngagementGroupId,
    enrolled_by_group_id: userProfile.personal_group_id,
    status: 'active',
    progress_data: {},
  });
```

### Fetch My Journeys (Individual)
```typescript
const { data } = await supabase
  .from('journey_enrollments')
  .select(`
    id, journey_id, status, enrolled_at, progress_data,
    journeys (id, title, description, difficulty_level, estimated_duration_minutes)
  `)
  .eq('group_id', userProfile.personal_group_id)
  .not('journeys', 'is', null)
  .order('enrolled_at', { ascending: false });

// Map: Supabase returns 'journeys' (plural), component expects 'journey' (singular)
const mapped = (data || [])
  .filter((e: any) => e.journeys)
  .map((e: any) => ({ ...e, journey: e.journeys }));
```

### Fetch My Journeys (Group)
```typescript
if (groupIds.length > 0) {
  const { data } = await supabase
    .from('journey_enrollments')
    .select(`
      id, journey_id, status, enrolled_at, progress_data,
      journeys (id, title, description, difficulty_level, estimated_duration_minutes),
      groups!group_id (id, name)
    `)
    .in('group_id', groupIds)
    .not('journeys', 'is', null)
    .not('groups', 'is', null);
}
```

---

## File Map

### Pages
| Route | File | Purpose |
|-------|------|---------|
| `/journeys` | `app/journeys/page.tsx` | Catalog with search and filters |
| `/journeys/[id]` | `app/journeys/[id]/page.tsx` | Detail page with Overview/Curriculum tabs |
| `/journeys/[id]/play` | `app/journeys/[id]/play/page.tsx` | Player wrapper (auth/enrollment checks) |
| `/my-journeys` | `app/my-journeys/page.tsx` | Enrolled journeys (Individual/Group tabs) |

### Components
| File | Purpose |
|------|---------|
| `components/journeys/JourneyPlayer.tsx` | Main player orchestrator |
| `components/journeys/StepSidebar.tsx` | Left sidebar with step list and progress |
| `components/journeys/StepContent.tsx` | Step content display and completion UI |
| `components/journeys/ProgressBar.tsx` | Reusable progress bar |
| `components/journeys/EnrollmentModal.tsx` | Enrollment modal (individual + group) |

### Types
| File | Purpose |
|------|---------|
| `lib/types/journey.ts` | All journey/enrollment TypeScript interfaces |

---

## Technical Notes

### FK Disambiguation
`journey_enrollments` has two FKs to `groups` (`group_id` and `enrolled_by_group_id`). Supabase requires an explicit FK hint to avoid PGRST201 ambiguous relationship errors:
```typescript
// Use FK name hint
.select('groups!journey_enrollments_group_id_fkey(id, name)')
// Or use column hint
.select('groups!group_id(id, name)')
```

### Data Mapping
Supabase returns foreign key data with the plural table name. Map to singular for component consistency:
```typescript
// Supabase returns: { journeys: {...} }
// Component expects: { journey: {...} }
const mapped = data.map(e => ({ ...e, journey: e.journeys }));
```

### JSONB Content Storage
**Benefits:** Flexible structure, easy to extend without migrations, fast PostgreSQL JSON queries.
**Trade-offs:** Less strict DB-level typing, need TypeScript interfaces, more complex validation.

---

## Not Yet Implemented

### Journey Management (Wave 2 — Hamn)
- User-created journeys (journey builder)
- Journey templates and duplication
- Collaborative authoring
- Journey marketplace
- Version control

### Advanced Features (wave TBD)
- Branching journeys (non-linear paths)
- Dynamic/adaptive content
- Prerequisites and dependencies
- Assessments and quizzes
- Certifications

### Deferred
- Group progress overview (Steward/Guide view of member progress)
- Rich content rendering in StepContent (currently placeholder)
- DELETE RLS policy for unenrollment
- Achievement badges

---

## Changelog

**v0.2.34** (Feb 28, 2026) — Sprint 2: Leave Group Core
- `leave_group()` RPC freezes non-public journey enrollments on member exit (`frozen_reason: 'left_group'`)
- Group closure (L3) freezes ALL group journey enrollments (`frozen_reason: 'group_closed'`)
- Non-public journeys transferred to DeusEx on group closure (`created_by_group_id` updated)
- Public journey enrollments are NOT affected by leave-group
- 17 integration tests in `tests/integration/groups/leave-group.test.ts`
- Migration: `20260228120745_sprint2_leave_group_core.sql`

**v0.2.33** (Feb 28, 2026) — Sprint 1: Foundation Schema
- "FringeIsland Journeys" engagement group created — 8 predefined journeys migrated to platform ownership
- All 8 journeys confirmed `is_public = true`, `created_by_group_id` → FI Journeys group
- `groups.status` column added (prerequisite for leave-group enrollment freezing)
- Migration: `20260228110815_sprint1_foundation_schema.sql`

**v0.2.32** (Feb 28, 2026) — Sprint 0: Security Fixes
- Non-public journey visibility enforced at RLS level (`is_public` check in `journeys_select_published`)
- Non-public journey enrollment gated at RLS level (`is_journey_enrollable()` in INSERT policies)
- Frozen enrollment UPDATE blocked at RLS level (`AND status != 'frozen'` in USING clauses)
- Frozen enrollment UI enforcement in JourneyPlayer (amber banner, blocked actions, read-only navigation)
- Frozen badge and "Review Steps" label on My Journeys cards
- 2 new SECURITY DEFINER helper functions: `is_enrolled_in_journey()`, `is_journey_enrollable()`
- 19 new security integration tests
- Migration: `20260228102720_sprint0_security_fixes.sql`
- Behaviors: B-SEC-001, B-SEC-002, B-SEC-003, B-SEC-004

**v0.2.11** (Feb 10, 2026)
- JourneyPlayer with step-by-step content delivery
- 4 new components: JourneyPlayer, StepSidebar, StepContent, ProgressBar
- Progress saved to `progress_data` JSONB on every action
- Resume from last position via `current_step_id`
- Required-step gating
- Completion detection and review mode
- My Journeys: progress bars, play links, smart labels

**v0.2.10** (Jan 31, 2026)
- Enrollment system (individual + group)
- EnrollmentModal component
- My Journeys page with two tabs
- Enrollment status checking
- Fixed RLS recursion issue

**v0.2.8** (Jan 27, 2026)
- Journey catalog page with search/filter
- Journey detail page with Overview/Curriculum tabs
- 8 predefined journeys seeded
- TypeScript types in `lib/types/journey.ts`

---

**Related Documentation:**
- Database schema: `docs/implementation/shared/SCHEMA_OVERVIEW.md`
- RBAC permissions: `docs/features/implemented/dynamic-permissions-system.md`
- D15 migration: `docs/features/implemented/d15-universal-group-pattern-migration.md`
