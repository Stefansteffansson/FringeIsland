# Journey System

**Status:** ✅ Partially Implemented (85% complete)
**Version:** 0.2.10
**Last Updated:** February 4, 2026

---

## Overview

Educational journey system where users can browse, enroll in, and complete structured learning experiences. Supports both individual and group enrollment.

---

## Implemented Features

### Journey Catalog (v0.2.8)
**Page:** `/journeys`

**Features:**
- Grid layout showing all available journeys
- Search by title and description
- Filter by difficulty (beginner, intermediate, advanced)
- Filter by topic/tags
- Results counter
- Clear filters button
- Responsive design

**Journey Cards Show:**
- Title and description
- Difficulty badge
- Estimated duration
- Tags
- "View Details" button

### Journey Detail Page (v0.2.8)
**Page:** `/journeys/[id]`

**Sections:**
1. **Hero Section**
   - Title and description
   - Gradient background
   - Breadcrumb navigation
   - Enrollment button (dynamic based on status)

2. **Overview Tab**
   - Full description
   - Learning objectives
   - Target audience
   - Prerequisites

3. **Curriculum Tab**
   - Expandable step list
   - Step details (type, duration, description)
   - Visual indicators for step types
   - Total step count

4. **Sidebar (Sticky)**
   - Difficulty level
   - Estimated duration
   - Tags
   - Enrollment button

**Enrollment Button States:**
- Not enrolled → "Enroll in Journey" (opens modal)
- Enrolled individually → "View My Journeys" (green, links to /my-journeys)
- Enrolled via group → "Enrolled via [Group Name]" (info badge)
- Not logged in → "Sign in to Enroll" (links to /login)

### Journey Enrollment (v0.2.10)
**Component:** `components/journeys/EnrollmentModal.tsx`

**Features:**
- Two enrollment types:
  1. **Individual Enrollment** - For personal learning
  2. **Group Enrollment** - Enroll a group (leader-only)
- Dynamic group selection (only shows groups where user is leader)
- Enrollment validation (checks existing enrollments)
- Prevents dual enrollment (individual + group for same journey)
- Success state with confirmation
- Error handling

**Business Rules:**
- ✅ Users can enroll in unlimited journeys individually
- ✅ Users can enroll in same journey via different groups
- ❌ Cannot enroll individually AND via group in same journey
- ✅ Only Group Leaders can enroll groups
- ❌ Groups cannot be enrolled twice in same journey

### My Journeys Page (v0.2.10)
**Page:** `/my-journeys`

**Features:**
- Two tabs:
  1. **Individual Journeys** - Personally enrolled
  2. **Group Journeys** - Enrolled via groups
- Journey cards with:
  - Title and description
  - Status badge (active, completed, paused, frozen)
  - Difficulty badge
  - Duration display
  - "Continue Journey" or "Review Journey" button
  - For group journeys: Shows group name
- Empty states with "Browse Catalog" CTAs
- Responsive grid layout

**Navigation:**
- Added "My Journeys" link (📚) to global navigation
- Active state highlighting

---

## Database Schema

### journeys Table
```sql
CREATE TABLE journeys (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by_user_id UUID REFERENCES users(id),
  is_published BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  journey_type TEXT CHECK (journey_type IN ('predefined', 'user_created', 'dynamic')),
  content JSONB NOT NULL,
  estimated_duration_minutes INTEGER,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
```

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
      "content": {
        "text": "...",
        "resources": [...]
      }
    },
    {
      "id": "step_2",
      "title": "Self-Assessment Exercise",
      "type": "activity",
      "duration_minutes": 45,
      "required": true,
      "description": "Complete the leadership style assessment",
      "instructions": "..."
    }
  ]
}
```

### journey_enrollments Table
```sql
CREATE TABLE journey_enrollments (
  id UUID PRIMARY KEY,
  journey_id UUID REFERENCES journeys(id),
  user_id UUID REFERENCES users(id),        -- NULL for group enrollments
  group_id UUID REFERENCES groups(id),      -- NULL for individual enrollments
  enrolled_by_user_id UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'frozen')),
  progress_data JSONB DEFAULT '{}',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,

  CHECK (
    (user_id IS NOT NULL AND group_id IS NULL) OR
    (user_id IS NULL AND group_id IS NOT NULL)
  )
);
```

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
  "last_checkpoint": "step_2"
}
```

---

## Predefined Journeys (v0.2.8)

**8 journeys seeded** via migration:

1. **Leadership Fundamentals** (180 min, Beginner)
   - Tags: leadership, fundamentals, management
   - 6 steps

2. **Effective Communication Skills** (240 min, Beginner)
   - Tags: communication, soft-skills, collaboration
   - 8 steps

3. **Building High-Performance Teams** (300 min, Intermediate)
   - Tags: team-building, leadership, collaboration
   - 10 steps

4. **Personal Development Kickstart** (150 min, Beginner)
   - Tags: personal-development, goal-setting, productivity
   - 5 steps

5. **Strategic Decision Making** (270 min, Advanced)
   - Tags: strategy, decision-making, critical-thinking
   - 9 steps

6. **Emotional Intelligence at Work** (210 min, Intermediate)
   - Tags: emotional-intelligence, self-awareness, empathy
   - 7 steps

7. **Agile Team Collaboration** (200 min, Intermediate)
   - Tags: agile, collaboration, teamwork
   - 8 steps

8. **Resilience and Stress Management** (180 min, Beginner)
   - Tags: resilience, mental-health, well-being
   - 6 steps

---

## TypeScript Types

**Location:** `lib/types/journey.ts`

```typescript
export interface JourneyStep {
  id: string;
  title: string;
  type: 'content' | 'activity' | 'assessment';
  duration_minutes: number;
  required: boolean;
  description?: string;
  content?: any;
  instructions?: string;
}

export interface JourneyContent {
  version: string;
  structure: 'linear' | 'branching';
  steps: JourneyStep[];
}

export interface Journey {
  id: string;
  title: string;
  description: string;
  created_by_user_id: string;
  is_published: boolean;
  is_public: boolean;
  journey_type: 'predefined' | 'user_created' | 'dynamic';
  content: JourneyContent;
  estimated_duration_minutes: number | null;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface JourneyEnrollment {
  id: string;
  journey_id: string;
  user_id: string | null;
  group_id: string | null;
  enrolled_by_user_id: string;
  status: 'active' | 'completed' | 'paused' | 'frozen';
  progress_data: any;
  enrolled_at: string;
  completed_at: string | null;
  last_accessed_at: string | null;
}

export interface EnrollmentWithJourney extends JourneyEnrollment {
  journey: Journey;
  group?: { id: string; name: string };
}
```

---

## User Flows

### Browse Journeys
1. User navigates to /journeys
2. Sees journey catalog with filters
3. Can search/filter to find relevant journeys
4. Clicks journey card to view details

### View Journey Details
1. User views journey detail page
2. Sees overview, curriculum, and metadata
3. Can expand/collapse curriculum steps
4. Enrollment button shows based on auth and enrollment status

### Enroll Individually
1. User clicks "Enroll in Journey"
2. EnrollmentModal opens
3. User selects "Individual"
4. Confirms enrollment
5. Success state shown
6. Modal closes
7. Button updates to "View My Journeys"

### Enroll Group (Leader Only)
1. Group Leader clicks "Enroll in Journey"
2. EnrollmentModal opens
3. User selects "Group"
4. Dropdown shows only groups where user is leader
5. Selects group
6. Confirms enrollment
7. Success state shown
8. Modal closes

### View My Journeys
1. User navigates to /my-journeys
2. Sees two tabs (Individual, Group)
3. Can view all enrolled journeys
4. Can continue active journeys
5. Can review completed journeys

---

## RLS Policies

### journeys Table
**SELECT:**
- All authenticated users can view published journeys
- Creators can view their own unpublished journeys

**INSERT/UPDATE/DELETE:**
- Creators can manage their own journeys
- (Currently only system-seeded journeys exist)

### journey_enrollments Table
**SELECT:**
- Users can view their own enrollments
- Users can view enrollments for groups they belong to

**INSERT:**
- Users can create individual enrollments
- Group Leaders can create group enrollments

**UPDATE:**
- Users can update their own enrollment status/progress
- Group Leaders can update their group enrollments

**DELETE:**
- Users can delete their own enrollments (unenroll)
- Group Leaders can unenroll their groups

**NOTE:** v0.2.10 simplified RLS to avoid recursion. Dual-enrollment prevention handled in application.

---

## API Patterns

### Check Enrollment Status
```typescript
// Get user's group IDs first
const { data: userGroups } = await supabase
  .from('group_memberships')
  .select('group_id')
  .eq('user_id', userData.id)
  .eq('status', 'active');

const groupIds = userGroups?.map(g => g.group_id) || [];

// Check individual enrollment
const { data: individualEnrollment } = await supabase
  .from('journey_enrollments')
  .select('id')
  .eq('journey_id', journeyId)
  .eq('user_id', userData.id)
  .maybeSingle();

// Check group enrollment
let groupEnrollment = null;
if (groupIds.length > 0) {
  const { data } = await supabase
    .from('journey_enrollments')
    .select('id, groups!inner(name)')
    .eq('journey_id', journeyId)
    .in('group_id', groupIds)
    .maybeSingle();

  groupEnrollment = data;
}
```

### Enroll Individually
```typescript
const { error } = await supabase
  .from('journey_enrollments')
  .insert({
    journey_id: journeyId,
    user_id: userData.id,
    group_id: null,
    enrolled_by_user_id: userData.id,
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
    user_id: null,
    group_id: selectedGroupId,
    enrolled_by_user_id: userData.id,
    status: 'active',
    progress_data: {},
  });
```

### Fetch My Journeys
```typescript
// Individual enrollments
const { data: individualData } = await supabase
  .from('journey_enrollments')
  .select(`
    id,
    journey_id,
    status,
    enrolled_at,
    journeys (
      id,
      title,
      description,
      difficulty_level,
      estimated_duration_minutes
    )
  `)
  .eq('user_id', userData.id)
  .not('journeys', 'is', null)
  .order('enrolled_at', { ascending: false });

// Map data (Supabase returns plural 'journeys', component expects singular 'journey')
const mappedData = individualData
  ?.filter((e: any) => e.journeys)
  .map((e: any) => ({
    ...e,
    journey: e.journeys,
  })) || [];

// Group enrollments (use array in .in() to avoid subquery issues)
if (groupIds.length > 0) {
  const { data: groupData } = await supabase
    .from('journey_enrollments')
    .select(`
      id,
      journey_id,
      status,
      enrolled_at,
      journeys (id, title, description, difficulty_level, estimated_duration_minutes),
      groups (id, name)
    `)
    .in('group_id', groupIds)
    .not('journeys', 'is', null)
    .not('groups', 'is', null);
}
```

---

## Not Yet Implemented

### Journey Content Delivery (Next Priority)
- Step-by-step navigation
- Content rendering (text, video, activities)
- Save progress as you go
- Resume from last position
- Step completion tracking

### Progress Tracking
- Visual progress indicators
- Completion percentage
- Time spent tracking
- Achievement badges
- Progress sharing

### Journey Management (Phase 2)
- User-created journeys
- Journey templates
- Collaborative authoring
- Journey marketplace
- Version control

### Advanced Features (Phase 3)
- Branching journeys (non-linear paths)
- Dynamic/adaptive content
- Prerequisites and dependencies
- Assessments and quizzes
- Certifications

---

## Testing

### Test Cases
- ✅ Journey catalog displays all published journeys
- ✅ Search filters journeys correctly
- ✅ Difficulty filter works
- ✅ Journey detail page shows all information
- ✅ Curriculum steps expand/collapse
- ✅ Individual enrollment works
- ✅ Group enrollment works (leader only)
- ✅ Dual enrollment prevention works
- ✅ My Journeys page shows enrolled journeys
- ✅ Enrollment status checks work
- ✅ Navigation updates after enrollment

### Known Issues
- None currently

---

## Technical Notes

### Supabase Query Patterns
**Issue:** Browser client doesn't support complex subqueries in `.in()` method
**Solution:** Fetch IDs first, then use array in `.in()`

```typescript
// ❌ DON'T: Subquery in .in()
.in('group_id', supabase.from('group_memberships').select('group_id'))

// ✅ DO: Fetch first, then use array
const { data: groups } = await supabase
  .from('group_memberships')
  .select('group_id')
  .eq('user_id', userId);

const groupIds = groups?.map(g => g.group_id) || [];
.in('group_id', groupIds)
```

### Data Mapping
**Issue:** Supabase returns foreign key data with plural table name
**Solution:** Map to singular for component consistency

```typescript
// Supabase returns: { journeys: {...} }
// Component expects: { journey: {...} }
const mapped = data.map(e => ({ ...e, journey: e.journeys }));
```

### JSONB Content Storage
**Benefits:**
- Flexible structure for different journey types
- Easy to add new fields without schema changes
- Can store complex nested data
- Fast JSON queries with PostgreSQL

**Trade-offs:**
- Less strict typing at database level
- Need TypeScript interfaces for application
- More complex validation logic

---

## Related Documentation

- **Database schema:** `docs/database/schema-overview.md`
- **Migration #9:** `docs/database/migrations-log.md` (predefined journeys)
- **Migration #10:** `docs/database/migrations-log.md` (RLS fix)
- **TypeScript types:** `lib/types/journey.ts`
- **Technical patterns:** `CLAUDE.md`

---

## Changelog

**v0.2.10** (Jan 31, 2026)
- Enrollment system (individual + group)
- My Journeys page
- Enrollment status checking
- Fixed RLS recursion issue

**v0.2.8** (Jan 27, 2026)
- Journey catalog page
- Journey detail page
- 8 predefined journeys seeded
- Search and filter functionality
- Curriculum expansion UI

---

**Next up:** Journey content delivery and progress tracking (Phase 1.4 completion)
