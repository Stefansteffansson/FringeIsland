# FringeIsland Journey Architecture - The Journey Designer

## Overview

This document defines the complete architecture for journeys in FringeIsland, centered around **The Journey Designer** - a visual canvas tool that empowers creators to build any type of learning journey imaginable.

**Design Philosophy:** Simple now, scalable forever. Phase 1 implements linear journeys while the architecture supports infinite future complexity, including AI-powered dynamic journey generation.

---

## Table of Contents

1. [Core Concept & Metaphor](#core-concept--metaphor)
2. [The Journey Designer](#the-journey-designer)
3. [Journey Structure Options](#journey-structure-options)
4. [Database Architecture](#database-architecture)
5. [Templates & Components Library](#templates--components-library)
6. [AI Dynamic Journey Building](#ai-dynamic-journey-building)
7. [Integration with Journal System](#integration-with-journal-system)
8. [Journey Lifecycle](#journey-lifecycle)
9. [Implementation Roadmap](#implementation-roadmap)

---

## Core Concept & Metaphor

### Travel Metaphor Consistency

FringeIsland uses authentic travel terminology throughout:

- **Guidebooks** = Journey templates (master blueprints)
- **Locations** = Waypoints/places to visit on the journey
- **Activities/Experiences** = Things to do at each location
- **Transitions** = Travel between locations
- **My Trip** = User's personal journey instance
- **Travel Journal** = User's journal for this journey
- **Travel Album** = Complete record upon journey completion

### The Journey Designer

**The Journey Designer** is FringeIsland's visual canvas tool where journey creators:
- Design journey structures by connecting locations
- Use templates to start quickly
- Drag in components (tidbits) to build faster
- Customize every aspect of the journey
- Publish journeys for travelers to embark upon

**Key Principle:** Structure emerges from how locations are connected, not from rigid type selection.

---

## The Journey Designer

### What is The Journey Designer?

The Journey Designer is the primary interface for creating journeys on FringeIsland. It provides:

✅ **Visual Canvas** - See your journey structure as you build it
✅ **Drag & Drop** - Intuitive location and component placement
✅ **Flexible Connections** - Draw arrows to create prerequisites
✅ **Template Library** - Start from proven journey patterns
✅ **Component Library** - Reusable building blocks (tidbits)
✅ **Live Preview** - Test your journey before publishing
✅ **AI Assistant** - Get suggestions and auto-generation (future)

---

### The Journey Designer Interface

```
┌──────────────────────────────────────────────────────────────────┐
│  🎨 The Journey Designer: "Leadership Fundamentals"   [Save] [•••]│
├────────┬─────────────────────────────────────────────────────────┤
│        │                                                          │
│ 📚     │                    CANVAS                                │
│ Library│                                                          │
│        │    🏁 START                                             │
│ Search │      ↓                                                   │
│ [____] │    📍 Welcome                                           │
│        │      ↓                                                   │
│ ━━━━━  │    📍 Foundation                                        │
│        │      ↓                                                   │
│ System │    ┌─────────────────┐                                  │
│ ▼      │    │ 📦 Core Skills  │                                  │
│        │    │   📍 📍 📍     │                                  │
│ Linear │    └─────────────────┘                                  │
│ Chain  │      ↓                                                   │
│ [Drag] │    🔀 Choose Focus                                      │
│        │    ↙     ↘                                             │
│ Choice │  📍       📍                                           │
│ Point  │    ↘     ↙                                             │
│ [Drag] │      ↓                                                   │
│        │    🎯 Integration Hub                                   │
│ Hub &  │   ↙  ↓  ↘                                              │
│ Spokes │ 📍  📍  📍                                            │
│ [Drag] │      ↓                                                   │
│        │    📍 Final Reflection                                  │
│ Region │      ↓                                                   │
│ [Drag] │    🏆 COMPLETE                                          │
│        │                                                          │
│ ━━━━━  │                                                          │
│        │                                                          │
│ My     │  Properties (Welcome selected):                         │
│ Comps  │  ┌──────────────────────────────────┐                  │
│ ▼      │  │ Location: "Welcome"              │                  │
│        │  │ Type: Regular                    │                  │
│ (none) │  │ Required: ☑ Yes                 │                  │
│        │  │ Prerequisites: (none)            │                  │
│        │  │                                  │                  │
│ ━━━━━  │  │ [Edit Content] [Add Activity]    │                  │
│        │  │                                  │                  │
│ Content│  │ Activities (2):                  │                  │
│ ▼      │  │ • Welcome message                │                  │
│        │  │ • Set intentions                 │                  │
│ Welcome│  │                                  │                  │
│ [Drag] │  └──────────────────────────────────┘                  │
│        │                                                          │
│ Reflect│                                                          │
│ [Drag] │                                                          │
│        │                                                          │
│ Final  │                                                          │
│ [Drag] │                                                          │
│        │                                                          │
├────────┴──────────────────────────────────────┬──────────────────┤
│  [Templates] [Test Journey] [Preview as User] │ Zoom: 100% [+][-]│
└────────────────────────────────────────────────┴──────────────────┘
```

---

### Creating a Journey in The Journey Designer

#### **Method 1: Start from Template**

```
Step 1: New Journey → "Start from Template"

Step 2: Choose template
  - Simple Linear Journey
  - Regional Mastery
  - Branching Adventure
  - Hub & Spoke Exploration
  - Hybrid Journey
  - Blank Canvas

Step 3: Template loads on canvas
  - All locations pre-positioned
  - All connections pre-drawn
  - Ready to customize

Step 4: Customize
  - Rename locations
  - Edit content
  - Add/remove locations
  - Change connections
  - Add activities

Step 5: Publish
  - Set metadata (title, description, difficulty)
  - Preview as user
  - Publish to catalog
```

#### **Method 2: Build from Scratch with Components**

```
Step 1: New Journey → "Blank Canvas"

Step 2: Drag components from library
  - Drag "Linear Chain (3)" → 3 connected locations appear
  - Drag "Choice Point" → branching structure appears
  - Drag "Hub with Spokes" → hub structure appears

Step 3: Connect components
  - Draw arrows between structures
  - Creates prerequisites automatically

Step 4: Add content
  - Click locations to edit
  - Add activities
  - Set requirements

Step 5: Publish
```

#### **Method 3: AI-Assisted Creation** 🤖 (Future)

```
Step 1: New Journey → "AI Assistant"

Step 2: Describe your journey
  "I want to create a 4-week leadership journey 
   that starts with self-awareness, then branches 
   into either strategic or empathetic leadership, 
   and ends with a practical application project."

Step 3: AI generates structure
  - Creates locations based on description
  - Sets up branching structure
  - Suggests content for each location
  - Proposes activities

Step 4: Review and refine
  - Accept AI suggestions
  - Modify as needed
  - Add personal touches

Step 5: Publish
```

---

## Journey Structure Options

The Journey Designer supports all journey structure types. While Phase 1 implements **Linear** structure, the architecture is built to support all patterns from day one.

### **Option A: Linear Path** ⭐ **PHASE 1 IMPLEMENTATION**

```
Start → Location 1 → Location 2 → Location 3 → Location 4 → Complete
```

**Description:**
- Strict sequential order
- Must complete Location N before accessing Location N+1
- Single path from start to finish
- Like a guided tour

**Real-World Examples:**
- Step-by-step online course
- Pilgrimage with fixed route
- Progressive skill building

**In The Journey Designer:**
- Drag locations onto canvas
- Connect with arrows: 1→2→3→4
- System automatically sets prerequisites
- User sees: "Complete this to unlock next"

**Phase 1 Implementation:**
- All journeys use this structure
- Simple, proven, easy to understand
- Foundation for all other patterns

---

### **Option B: Regional/Modular** 📅 **PHASE 2+**

```
Start → Region 1 [Loc 1, 2, 3 - any order] → 
        Region 2 [Loc 4, 5, 6 - any order] → 
        Region 3 [Loc 7, 8 - any order] → Complete
```

**Description:**
- Locations grouped into regions/modules
- Complete all in region before next unlocks
- Freedom within each region
- Like island hopping

**Real-World Examples:**
- University courses (100-level, 200-level, 300-level)
- Multi-city trip (Paris district, then Rome district)
- Skill modules

**In The Journey Designer:**
- Drag "Region" component onto canvas
- Drag locations into region box
- All locations in region require previous region
- No prerequisites within region

---

### **Option C: Branching Paths** 📅 **PHASE 3+**

```
Start → Location 1 → Choice Point:
                     ├─ Path A: Locations 2a → 3a → 4a
                     └─ Path B: Locations 2b → 3b → 4b
                     Both converge → Location 5 → Complete
```

**Description:**
- Decision points where travelers choose routes
- Different paths teach different approaches
- Some locations mutually exclusive
- Like choosing scenic vs. fast route

**Real-World Examples:**
- Choose-your-own-adventure books
- Role-based training (technical vs. leadership track)
- Specialization paths

**In The Journey Designer:**
- Drag "Choice Point" component
- Create paths branching from choice
- Set mutual exclusivity automatically
- Optional convergence point

---

### **Option D: Hub & Spoke** 📅 **PHASE 3+**

```
Central Hub ←→ Location 1
            ←→ Location 2
            ←→ Location 3
            ←→ Location 4
All accessible anytime, return to hub between visits
```

**Description:**
- Central "home base" location
- All other locations radiate from center
- Return to hub for integration
- Like day trips from a hotel

**Real-World Examples:**
- Conference with breakout sessions
- University major with electives
- Central theme with deep dives

**In The Journey Designer:**
- Drag "Hub & Spokes" component
- Hub is central location
- Spokes connect both ways
- Can require hub return

---

### **Option E: Open World** 📅 **PHASE 2+**

```
Start → [All locations accessible from beginning] → Complete when criteria met
```

**Description:**
- Complete freedom to explore
- No enforced prerequisites
- Suggested path exists
- Like backpacking with a guidebook

**Real-World Examples:**
- Museum visit
- Self-directed learning
- Exploration journey

**In The Journey Designer:**
- Drag locations onto canvas
- Don't draw prerequisite arrows (or make them "suggested")
- Set completion criteria (visit X of Y)
- User chooses their own path

---

### **Option F: Network/Web** 📅 **PHASE 3+**

```
        Location 1
       ↙    ↓    ↘
   Loc 2  Loc 3  Loc 4
      ↘    ↓    ↙
       Location 5
```

**Description:**
- Complex prerequisite webs
- Multiple prerequisites for locations
- Multiple valid paths
- Like skill trees

**Real-World Examples:**
- Academic prerequisites
- Technology dependencies
- Skill unlocking

**In The Journey Designer:**
- Draw multiple arrows to same location
- Set logic: "Requires ALL" or "Requires ANY"
- Visual network automatically created
- Shows unlocking patterns

---

### **Option G: Time-Based** 📅 **PHASE 2+**

```
Week 1: Locations 1, 2, 3 available
Week 2: Locations 4, 5 available  
Week 3: Locations 6, 7, 8 available
```

**Description:**
- Locations unlock on schedule
- Cohort-based progression
- Can't rush ahead
- Like a semester course

**Real-World Examples:**
- University semester
- Group program with set dates
- Advent calendar

**In The Journey Designer:**
- Set unlock dates per location
- Relative (X days after start) or absolute
- Set optional deadlines
- Cohort scheduling

---

### **Option H: AI-Powered Dynamic** 🤖 **PHASE 4+**

```
Start → AI Assessment → [Personalized path] → Adapts based on progress → Complete
```

**Description:**
- Journey adapts to each traveler
- Different users see different paths
- AI analyzes progress and adjusts
- Like a personal trainer

**Real-World Examples:**
- Adaptive learning platforms
- Personal fitness programs
- Therapeutic interventions

**In The Journey Designer:**
- Enable "AI Dynamic Mode"
- Define assessment criteria
- Set adaptation rules
- AI generates personalized paths

**See [AI Dynamic Journey Building](#ai-dynamic-journey-building) for details**

---

### **Hybrid Journeys** (All Phases)

The Journey Designer's power is that creators can **mix any patterns** in one journey:

**Example: Complete Leadership Program**
```
Linear intro (2 locations)
  ↓
Regional section (2 regions, 6 locations total)
  ↓
Branching choice (2 paths)
  ↓
Hub with optional deep dives
  ↓
Linear conclusion
  ↓
Complete
```

**In The Journey Designer:**
- No "choose one structure" limitation
- Draw whatever makes sense
- Structure emerges from connections
- Unlimited creativity

---

## Comparison Matrix

| Structure | Flexibility | Complexity | Best For | Phase | Designer Effort |
|-----------|-------------|------------|----------|-------|----------------|
| A. Linear | Low | Low | Structured learning | **1** | ⭐ Easiest |
| B. Regional | Medium | Low-Med | Modular content | 2 | ⭐⭐ Easy |
| C. Branching | Med-High | Medium | Choice-driven | 3 | ⭐⭐⭐ Moderate |
| D. Hub & Spoke | Medium | Medium | Integration-focused | 3 | ⭐⭐⭐ Moderate |
| E. Open World | High | Low-Med | Self-directed | 2 | ⭐⭐ Easy |
| F. Network | Very High | High | Complex skills | 3 | ⭐⭐⭐⭐ Hard |
| G. Time-Based | Low | Medium | Cohorts | 2 | ⭐⭐⭐ Moderate |
| H. AI Dynamic | Highest | Very High | Personalization | 4 | 🤖 AI-Assisted |
| **Hybrid** | **Ultimate** | **Variable** | **Any use case** | **All** | **Flexible** |

---

## Database Architecture

The database is designed to support The Journey Designer's visual canvas approach and all structure types.

### Core Principle

**Structure emerges from connections, not from rigid type definitions.**

- **No `structure_type` field** on guidebooks
- Structure is determined by how locations are connected
- Each location can behave differently
- Complete flexibility for hybrid journeys

---

### **guidebooks** (Journey Templates)

The master template created in The Journey Designer.

```sql
CREATE TABLE guidebooks (
  guidebook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  title VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255) UNIQUE NOT NULL,
  
  -- Categorization & Discovery
  category VARCHAR(100), -- Leadership, Communication, etc.
  difficulty_level VARCHAR(50), -- Beginner, Intermediate, Advanced
  tags TEXT[], -- Flexible labeling: ['linear', 'hands-on', 'reflective']
  
  -- Estimates
  estimated_duration VARCHAR(100), -- "4 weeks", "20 hours", "self-paced"
  
  -- Prerequisites
  prerequisite_guidebooks UUID[], -- Other journeys to complete first
  
  -- Behavior Settings
  strict_prerequisites BOOLEAN DEFAULT true, -- Enforce or suggest
  allow_skip_ahead BOOLEAN DEFAULT false,
  
  -- Completion Criteria
  completion_type VARCHAR(50) DEFAULT 'all_required',
    -- 'all_required', 'milestone_based', 'percentage', 'breadth'
  completion_criteria JSONB,
    -- Flexible configuration for completion logic
  
  -- Computed Metadata (cached for performance)
  metadata JSONB,
    -- Auto-computed from location analysis:
    -- {
    --   "total_locations": 12,
    --   "has_regions": true,
    --   "has_branching": true,
    --   "complexity_score": 6
    -- }
  
  -- Publishing
  created_by UUID REFERENCES users(user_id),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  version VARCHAR(20) DEFAULT '1.0',
  
  -- Rich Content
  cover_image_url TEXT,
  introduction_content TEXT,
  
  -- Statistics
  total_enrollments INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2),
  average_rating DECIMAL(3,2),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_guidebooks_published ON guidebooks(is_published, published_at);
CREATE INDEX idx_guidebooks_tags ON guidebooks USING GIN(tags);
```

---

### **locations** (Waypoints on Canvas)

Locations are the nodes on The Journey Designer canvas.

```sql
CREATE TABLE locations (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guidebook_id UUID REFERENCES guidebooks(guidebook_id) ON DELETE CASCADE,
  
  -- Identity
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255), -- URL-friendly within guidebook
  
  -- Canvas Positioning (for The Journey Designer)
  canvas_x INTEGER, -- X coordinate on canvas
  canvas_y INTEGER, -- Y coordinate on canvas
  
  -- Ordering (for linear/suggested paths)
  sequence_order INTEGER, -- 1, 2, 3... (used in Phase 1)
  
  -- Prerequisites (SUPPORTS ALL STRUCTURES)
  prerequisite_locations UUID[], -- Array of location IDs
  prerequisite_logic VARCHAR(20) DEFAULT 'all',
    -- 'all' = need ALL prerequisites (AND logic)
    -- 'any' = need ANY prerequisite (OR logic)
    -- 'custom' = use prerequisite_formula
  prerequisite_formula TEXT, -- Complex: "(loc1 OR loc2) AND loc3"
  
  -- Location Behavior
  location_type VARCHAR(50) DEFAULT 'regular',
    -- Phase 1: 'regular' (required)
    -- Phase 2+: 'optional', 'bonus'
    -- Phase 3+: 'hub', 'spoke', 'choice_point', 'convergence'
  
  -- Grouping (for visual organization)
  region_id UUID REFERENCES regions(region_id), -- Optional regional grouping
  
  -- Branching (Option C)
  path_variant VARCHAR(50), -- 'main', 'path_a', 'path_b', null
  mutually_exclusive_with UUID[], -- Can't visit both this and those
  
  -- Time-Based (Option G)
  unlock_date TIMESTAMP, -- Absolute unlock date
  unlock_days_offset INTEGER, -- Days after journey start
  due_date TIMESTAMP, -- Optional deadline
  due_days_offset INTEGER,
  late_access_allowed BOOLEAN DEFAULT true,
  
  -- Adaptive/Dynamic (Option H)
  difficulty_level INTEGER, -- 1-10 scale
  topic_tags TEXT[], -- For AI matching
  unlock_conditions JSONB, -- Complex AI rules
  
  -- Content
  location_content TEXT, -- Rich text/markdown
  cover_image_url TEXT,
  
  -- Estimates
  estimated_duration VARCHAR(100), -- "2-3 hours", "1 week"
  estimated_duration_minutes INTEGER,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_locations_guidebook ON locations(guidebook_id, sequence_order);
CREATE INDEX idx_locations_canvas ON locations(guidebook_id, canvas_x, canvas_y);
CREATE INDEX idx_locations_region ON locations(region_id);
CREATE UNIQUE INDEX idx_locations_slug ON locations(guidebook_id, slug);
```

---

### **location_connections** (Canvas Arrows)

Visual connections drawn in The Journey Designer.

```sql
CREATE TABLE location_connections (
  connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guidebook_id UUID REFERENCES guidebooks(guidebook_id) ON DELETE CASCADE,
  
  -- Connection
  from_location_id UUID REFERENCES locations(location_id) ON DELETE CASCADE,
  to_location_id UUID REFERENCES locations(location_id) ON DELETE CASCADE,
  
  -- Connection Type
  connection_type VARCHAR(50) DEFAULT 'prerequisite',
    -- 'prerequisite' = must complete FROM before TO
    -- 'suggested' = recommended but not enforced
    -- 'alternative' = either/or choice
  
  -- Visual Properties (for canvas rendering)
  visual_properties JSONB,
    -- { "color": "#3B82F6", "style": "solid", "label": "Complete first" }
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(from_location_id, to_location_id)
);

CREATE INDEX idx_connections_guidebook ON location_connections(guidebook_id);
CREATE INDEX idx_connections_from ON location_connections(from_location_id);
CREATE INDEX idx_connections_to ON location_connections(to_location_id);
```

**Note:** When a connection is created, the system also updates `locations.prerequisite_locations[]` array for query efficiency.

---

### **regions** (Visual Grouping on Canvas)

Optional boxes on The Journey Designer canvas to group related locations.

```sql
CREATE TABLE regions (
  region_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guidebook_id UUID REFERENCES guidebooks(guidebook_id) ON DELETE CASCADE,
  
  -- Identity
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Canvas Properties
  canvas_x INTEGER,
  canvas_y INTEGER,
  canvas_width INTEGER,
  canvas_height INTEGER,
  
  -- Visual Styling
  color VARCHAR(20), -- Hex color for region box
  
  -- Ordering
  sequence_order INTEGER, -- Region 1, 2, 3...
  
  -- Prerequisites (for regional structure)
  prerequisite_regions UUID[], -- Must complete these regions first
  
  -- Completion
  completion_type VARCHAR(50) DEFAULT 'all_locations',
  completion_criteria JSONB,
  
  -- Metadata
  estimated_duration VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_regions_guidebook ON regions(guidebook_id, sequence_order);
```

---

### **activities** (Things to Do at Locations)

```sql
CREATE TABLE activities (
  activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(location_id) ON DELETE CASCADE,
  
  -- Identity
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Ordering
  sequence_order INTEGER,
  
  -- Activity Type
  activity_type VARCHAR(50) NOT NULL,
    -- 'reading', 'video', 'exercise', 'reflection', 
    -- 'discussion', 'quiz', 'project', 'journal_prompt'
  
  -- Content
  content TEXT, -- Rich text, markdown, or JSON
  content_url TEXT, -- For external videos, files
  
  -- Completion
  is_required BOOLEAN DEFAULT true,
  completion_criteria VARCHAR(50) DEFAULT 'self_check',
    -- 'self_check', 'submission_required', 'quiz_score', 
    -- 'time_based', 'facilitator_approval'
  completion_metadata JSONB,
  
  -- Estimates
  estimated_duration VARCHAR(100),
  estimated_duration_minutes INTEGER,
  
  -- Journal Integration
  prompts_journal_entry BOOLEAN DEFAULT false,
  journal_prompt_text TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activities_location ON activities(location_id, sequence_order);
CREATE INDEX idx_activities_type ON activities(activity_type);
```

---

### **transitions** (Travel Between Locations)

Optional activities/content between locations.

```sql
CREATE TABLE transitions (
  transition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guidebook_id UUID REFERENCES guidebooks(guidebook_id) ON DELETE CASCADE,
  
  -- Connection
  from_location_id UUID REFERENCES locations(location_id) ON DELETE CASCADE,
  to_location_id UUID REFERENCES locations(location_id) ON DELETE CASCADE,
  
  -- Transition Type
  transition_type VARCHAR(50) DEFAULT 'reflection',
    -- 'preparation', 'reflection', 'rest', 'integration', 'preview'
  
  -- Content
  description TEXT,
  transition_content TEXT,
  
  -- Requirements
  is_required BOOLEAN DEFAULT false,
  estimated_duration VARCHAR(100),
  minimum_duration_days INTEGER, -- Must wait X days
  
  -- Activities
  activities JSONB, -- Simple activities during transition
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transitions_guidebook ON transitions(guidebook_id);
CREATE INDEX idx_transitions_from ON transitions(from_location_id);
CREATE INDEX idx_transitions_to ON transitions(to_location_id);
```

---

## User Journey Instance Schema

When a user enrolls in a journey, we create their personal trip.

### **user_journey_instances** (My Trip)

```sql
CREATE TABLE user_journey_instances (
  trip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  guidebook_id UUID REFERENCES guidebooks(guidebook_id) ON DELETE RESTRICT,
  
  -- Enrollment
  enrolled_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP, -- When user actually began
  
  -- Status
  status VARCHAR(50) DEFAULT 'enrolled',
    -- 'enrolled', 'in_progress', 'paused', 'completed', 'abandoned'
  
  -- Progress
  current_location_id UUID REFERENCES locations(location_id),
  last_location_id UUID REFERENCES locations(location_id),
  completed_at TIMESTAMP,
  
  -- AI Dynamic (Option H)
  personalization_profile JSONB,
    -- AI-generated user profile for adaptive journeys
  adaptive_path_version VARCHAR(50),
  ai_recommendations JSONB,
    -- Current AI suggestions for this user
  
  -- Branching (Option C)
  path_choices JSONB,
    -- Records which paths user chose
    -- {"choice_point_1": "path_a", "choice_point_2": "path_b"}
  
  -- Time-Based (Option G)
  scheduled_completion_date TIMESTAMP,
  cohort_id UUID, -- For group-paced journeys
  
  -- Travel Mode (for future pair/group journeys)
  journey_mode VARCHAR(50) DEFAULT 'solo',
    -- 'solo', 'pair', 'group'
  companion_user_ids UUID[],
  group_id UUID,
  
  -- Statistics
  total_time_spent_minutes INTEGER DEFAULT 0,
  locations_visited INTEGER DEFAULT 0,
  locations_completed INTEGER DEFAULT 0,
  activities_completed INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_trips_user ON user_journey_instances(user_id, status);
CREATE INDEX idx_user_trips_guidebook ON user_journey_instances(guidebook_id);
CREATE INDEX idx_user_trips_status ON user_journey_instances(status);
```

---

### **user_location_visits** (My Progress at Each Location)

```sql
CREATE TABLE user_location_visits (
  visit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES user_journey_instances(trip_id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(location_id) ON DELETE CASCADE,
  
  -- Visit Status
  status VARCHAR(50) DEFAULT 'not_started',
    -- 'not_started', 'locked', 'available', 'in_progress', 
    -- 'completed', 'skipped'
  
  -- Timestamps
  first_visited_at TIMESTAMP,
  last_visited_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Time Tracking
  time_spent_minutes INTEGER DEFAULT 0,
  
  -- Notes
  user_notes TEXT,
  
  -- AI Interaction (Option H)
  ai_difficulty_adjustment JSONB,
    -- How AI adapted this location for this user
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(trip_id, location_id)
);

CREATE INDEX idx_location_visits_trip ON user_location_visits(trip_id, status);
CREATE INDEX idx_location_visits_location ON user_location_visits(location_id);
```

---

### **user_activity_completions** (What I Did)

```sql
CREATE TABLE user_activity_completions (
  completion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES user_location_visits(visit_id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(activity_id) ON DELETE CASCADE,
  
  -- Completion
  completed_at TIMESTAMP DEFAULT NOW(),
  
  -- Submission
  submission_data JSONB,
  
  -- Assessment
  score INTEGER, -- 0-100
  passed BOOLEAN,
  feedback TEXT,
  
  -- Time
  time_spent_minutes INTEGER,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(visit_id, activity_id)
);

CREATE INDEX idx_activity_completions_visit ON user_activity_completions(visit_id);
CREATE INDEX idx_activity_completions_activity ON user_activity_completions(activity_id);
```

---

### **user_transition_progress** (Travel Between)

```sql
CREATE TABLE user_transition_progress (
  transition_progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES user_journey_instances(trip_id) ON DELETE CASCADE,
  transition_id UUID REFERENCES transitions(transition_id) ON DELETE CASCADE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'not_started',
    -- 'not_started', 'in_transit', 'completed', 'skipped'
  
  -- Timestamps
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Activities
  activities_completed JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(trip_id, transition_id)
);

CREATE INDEX idx_transition_progress_trip ON user_transition_progress(trip_id);
```

---

## Templates & Components Library

The Journey Designer includes a rich library of templates and components to accelerate journey creation.

### Templates vs. Components

**Templates** = Full journey blueprints
- Complete journey structures
- Start here, customize to fit
- 5-10 system templates

**Components** = Reusable building blocks (tidbits)
- Partial structures to drag into canvas
- Structure patterns (chains, hubs, branches)
- Content blocks (welcome, reflection, assessment)

---

### **journey_templates** Table

```sql
CREATE TABLE journey_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'beginner', 'intermediate', 'advanced'
  
  -- Preview
  thumbnail_url TEXT,
  preview_description TEXT,
  
  -- Template Structure (JSON representation)
  template_structure JSONB,
    -- Contains locations, connections, regions as JSON
    -- Can be instantiated into new journey
  
  -- Metadata
  created_by UUID REFERENCES users(user_id),
  is_system_template BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON journey_templates(category);
CREATE INDEX idx_templates_system ON journey_templates(is_system_template);
```

**Example template_structure:**
```json
{
  "locations": [
    {"name": "Welcome", "type": "regular", "x": 100, "y": 100},
    {"name": "Foundation", "type": "regular", "x": 100, "y": 200},
    {"name": "Practice", "type": "regular", "x": 100, "y": 300}
  ],
  "connections": [
    {"from": 0, "to": 1, "type": "prerequisite"},
    {"from": 1, "to": 2, "type": "prerequisite"}
  ],
  "regions": []
}
```

---

### **journey_components** Table

```sql
CREATE TABLE journey_components (
  component_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  name VARCHAR(255) NOT NULL,
  description TEXT,
  component_type VARCHAR(50),
    -- 'pattern', 'content_block', 'region_template'
  
  -- Visual
  icon_url TEXT,
  category VARCHAR(100), -- 'structure', 'content', 'assessment'
  
  -- Component Structure
  component_structure JSONB,
    -- Partial journey structure that can be inserted
  
  -- Metadata
  is_system_component BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_components_type ON journey_components(component_type);
CREATE INDEX idx_components_category ON journey_components(category);
```

**Example component_structure (Linear Chain):**
```json
{
  "locations": [
    {"name": "Location 1", "type": "regular", "offset_x": 0, "offset_y": 0},
    {"name": "Location 2", "type": "regular", "offset_x": 0, "offset_y": 100},
    {"name": "Location 3", "type": "regular", "offset_x": 0, "offset_y": 200}
  ],
  "connections": [
    {"from": 0, "to": 1, "type": "prerequisite"},
    {"from": 1, "to": 2, "type": "prerequisite"}
  ],
  "relative_positioning": true
}
```

---

### System-Provided Templates

#### **Template 1: Simple Linear Journey**
- 6 locations in sequence
- Welcome → Foundation → Core → Practice → Assessment → Reflection
- Best for: Beginner courses, step-by-step learning

#### **Template 2: Regional Mastery**
- 3 regions with 3-4 locations each
- Region 1: Foundations → Region 2: Application → Region 3: Mastery
- Best for: Modular learning, flexible pacing

#### **Template 3: Branching Adventure**
- Linear intro → Choice Point → 2 paths → Convergence
- Best for: Personalized learning, role-based training

#### **Template 4: Hub & Spoke Exploration**
- Central hub with 6 optional spokes + final synthesis
- Best for: Deep dives, self-directed exploration

#### **Template 5: Hybrid Journey**
- Linear intro → Regional → Branching → Hub → Linear finish
- 18 total locations in sophisticated structure
- Best for: Comprehensive programs

---

### System-Provided Components

#### **Structure Patterns**
- Linear Chain (3, 5, or 10 locations)
- Parallel Paths
- Choice Point (2-way, 3-way)
- Hub with Spokes (4, 6, or 8 spokes)
- Region Container (empty box for grouping)

#### **Content Blocks**
- Welcome & Orientation (with pre-written activities)
- Self-Assessment
- Reflection Checkpoint
- Practice Exercise
- Peer Discussion
- Final Synthesis

---

### User-Created Components

```sql
CREATE TABLE user_saved_components (
  saved_component_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id),
  component_id UUID REFERENCES journey_components(component_id),
  
  -- Customization
  custom_name VARCHAR(255),
  custom_description TEXT,
  modified_structure JSONB,
  
  saved_at TIMESTAMP DEFAULT NOW()
);
```

Users can:
1. Select locations on canvas
2. Right-click → "Save as Component"
3. Name and save to "My Components"
4. Reuse in future journeys

---

## AI Dynamic Journey Building

🤖 **Phase 4+ Feature: AI-Powered Adaptive Journey Creation and Personalization**

### Vision

AI can help journey creators AND travelers in powerful ways:

**For Creators:**
- Generate journey structures from descriptions
- Suggest content for locations
- Recommend optimal paths
- Auto-create activities

**For Travelers:**
- Personalize existing journeys
- Adapt difficulty in real-time
- Suggest next locations
- Generate custom paths

---

### Two AI Modes

#### **Mode 1: AI-Assisted Journey Creation** (The Journey Designer)

Creator describes what they want, AI builds it.

**User Flow:**
```
Step 1: Creator opens The Journey Designer

Step 2: Clicks "AI Assistant" button

Step 3: Describes desired journey:
  "Create a 4-week leadership journey that starts 
   with self-awareness, then lets users choose 
   between strategic or empathetic leadership focus, 
   and ends with a practical project."

Step 4: AI generates structure
  → Analyzes description
  → Creates 12 locations
  → Sets up linear intro (2 locations)
  → Creates choice point with 2 branches
  → Adds hub for project work
  → Suggests content for each location
  → Proposes activities

Step 5: Creator reviews on canvas
  → All locations positioned
  → All connections drawn
  → Can edit everything

Step 6: Creator customizes
  → Accepts AI suggestions
  → Modifies content
  → Adds personal touches
  → Rearranges if needed

Step 7: Publish
```

**AI Capabilities:**
- Natural language understanding of journey requirements
- Structure generation based on pedagogical best practices
- Content suggestions based on topic and difficulty
- Activity recommendations based on learning objectives

---

#### **Mode 2: AI Dynamic Journey (Real-Time Personalization)**

Journey adapts to each traveler as they progress.

**How It Works:**

**Initial Assessment:**
```
User enrolls in "AI-Powered Leadership Journey"
↓
AI presents initial assessment
  - Current leadership experience?
  - Learning goals?
  - Preferred pace?
  - Time available?
↓
AI creates personalized path
  - Skips content user already knows
  - Emphasizes identified gaps
  - Adjusts difficulty level
  - Sets realistic pacing
```

**Real-Time Adaptation:**
```
User completes Location 1
↓
AI analyzes:
  - Time spent (too long? too short?)
  - Journal entries (struggling? confident?)
  - Activity performance
  - Engagement level
↓
AI adapts:
  - Adjusts difficulty of Location 2
  - Suggests additional resources if struggling
  - Unlocks advanced content if excelling
  - Recommends different path if needed
```

**Example Scenario:**

**Traditional Journey:**
```
Every user sees same 12 locations
Location 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12
```

**AI Dynamic Journey:**
```
User A (Beginner, struggling):
  Location 1 → 1.5 (AI adds remedial) → 2 (simplified) → 3 → 
  Skip 4 (too advanced) → 5 → 6 (extended) → etc.

User B (Advanced, excelling):
  Location 1 (speeds through) → Skip 2 (already knows) → 
  3 (advanced version) → 4 → 5 → 6 (challenge mode) → 
  + Bonus location (AI adds) → etc.

User C (Intermediate, steady):
  Location 1 → 2 → 3 → 4 → 5 → 6 → etc. (standard path)
```

Each user gets a **unique journey** tailored to their needs.

---

### Database Support for AI Dynamic Journeys

```sql
-- Extended fields in user_journey_instances:

user_journey_instances:
  -- AI Personalization Profile
  personalization_profile JSONB
    -- {
    --   "skill_level": "intermediate",
    --   "learning_pace": "fast",
    --   "time_availability": "30min/day",
    --   "preferred_content": ["video", "exercise"],
    --   "skill_gaps": ["delegation", "feedback"],
    --   "mastered_topics": ["self_awareness"],
    --   "learning_style": "visual"
    -- }
  
  -- Current AI Recommendations
  ai_recommendations JSONB
    -- {
    --   "next_locations": ["loc-5", "loc-6"],
    --   "skip_locations": ["loc-4"],
    --   "difficulty_adjustments": {
    --     "loc-5": "increase",
    --     "loc-6": "standard"
    --   },
    --   "additional_resources": [...]
    -- }
  
  -- AI Path Version
  adaptive_path_version VARCHAR(50)
    -- Tracks which personalized variant user is on

-- Extended fields in user_location_visits:

user_location_visits:
  -- AI Difficulty Adjustment
  ai_difficulty_adjustment JSONB
    -- {
    --   "original_difficulty": 5,
    --   "adjusted_difficulty": 3,
    --   "reason": "User struggling with previous content",
    --   "modifications": ["simplified_language", "added_examples"]
    -- }
```

---

### AI Decision Log Table

Track AI decisions for transparency and learning.

```sql
CREATE TABLE ai_journey_decisions (
  decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES user_journey_instances(trip_id) ON DELETE CASCADE,
  
  -- Decision Details
  decision_timestamp TIMESTAMP DEFAULT NOW(),
  decision_type VARCHAR(50),
    -- 'show_location', 'hide_location', 'adjust_difficulty', 
    -- 'suggest_path', 'add_content', 'recommend_pace'
  
  -- What AI Decided
  affected_location_id UUID REFERENCES locations(location_id),
  decision_action VARCHAR(50),
  decision_parameters JSONB,
  
  -- Why (Transparency)
  reasoning JSONB,
    -- {
    --   "factors": [
    --     "User spent 2x expected time on previous location",
    --     "Journal entries show frustration",
    --     "Activity completion rate: 60%"
    --   ],
    --   "confidence": 0.85
    -- }
  
  -- User Feedback
  user_feedback VARCHAR(50), -- 'helpful', 'not_helpful', 'neutral'
  user_feedback_note TEXT,
  
  -- AI Learning
  ai_model_version VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_decisions_trip ON ai_journey_decisions(trip_id, decision_timestamp);
CREATE INDEX idx_ai_decisions_type ON ai_journey_decisions(decision_type);
```

---

### AI Journey Creation Workflow

**In The Journey Designer:**

```
Creator: "AI, create a journey about emotional intelligence"

AI Process:
1. Analyze request
   - Topic: Emotional Intelligence
   - Implicit: Beginner-friendly (no expertise mentioned)
   - Implicit: Standard length (not specified)

2. Generate structure
   - Research best practices for EI learning
   - Determine optimal progression
   - Decide on 10 locations (manageable for beginners)

3. Create locations
   Location 1: "What is Emotional Intelligence?"
     - Type: Introduction
     - Activities: Reading, self-assessment
   
   Location 2: "Self-Awareness Foundations"
     - Type: Core content
     - Activities: Reflection exercises, journal prompts
   
   Location 3-4: Self-Regulation (2 locations)
   Location 5-6: Empathy (2 locations)
   Location 7: Choice Point - "Focus on Relationships or Leadership?"
     - Path A: Relationships (2 locations)
     - Path B: Leadership (2 locations)
   Location 10: "Creating Your EI Action Plan"

4. Suggest content
   - Pulls from content library
   - Generates activity templates
   - Suggests reflection prompts
   - Recommends resources

5. Present to creator
   - Full structure on canvas
   - All content as suggestions
   - Creator can accept/modify/reject anything

6. Creator customizes
   - Tweaks structure
   - Edits content
   - Adds personal examples
   - Adjusts difficulty

7. Publish
```

---

### AI Real-Time Adaptation Workflow

**While User Travels:**

```
User starts "AI-Powered Leadership Journey"

Initial Assessment (Location 0):
  AI: "Tell me about your leadership experience"
  User: "I've been leading a small team for 2 years"
  
  AI: "What challenges do you face?"
  User: "Giving difficult feedback and delegating"
  
  AI: "How much time can you dedicate weekly?"
  User: "About 3-4 hours"

AI Creates Personalized Path:
  - Skip basic "What is Leadership?" (has experience)
  - Include "Foundations of Feedback" (identified gap)
  - Include "Delegation Mastery" (identified gap)
  - Emphasize practical exercises (time-constrained)
  - Set weekly pacing (3-4 hours)

User Progresses:
  Location 1: "Foundations of Feedback"
    - Time spent: 45 minutes (expected: 60)
    - Activity completion: 100%
    - Journal sentiment: Confident
    
    AI Decision: "User is excelling, can handle more challenge"
    AI Action: Increase difficulty of Location 2
  
  Location 2: "Delivering Difficult Feedback" (increased difficulty)
    - Time spent: 120 minutes (expected: 60)
    - Activity completion: 75%
    - Journal sentiment: Struggling, frustrated
    
    AI Decision: "User needs support"
    AI Actions:
      - Add transition with encouragement
      - Suggest additional resource (video on technique)
      - Reduce difficulty of Location 3
      - Add optional "Feedback Practice" location before Location 3

User Completes Journey:
  - 12 locations total (original had 10)
  - 2 locations added by AI for support
  - 1 location removed (too advanced)
  - Difficulty adjusted 5 times
  - Path personalized to exact needs
  
  Result: User successfully completes, feels challenged but supported
```

---

### AI Transparency & User Control

**Principles:**
1. **Transparent**: User always knows when AI made a decision
2. **Controllable**: User can reject AI suggestions
3. **Explainable**: AI explains why it made decisions
4. **Feedback-driven**: User feedback improves AI

**UI Example:**
```
┌────────────────────────────────────────┐
│ 🤖 AI Suggestion                       │
├────────────────────────────────────────┤
│                                        │
│ Based on your progress, I recommend:  │
│                                        │
│ • Skip "Basic Delegation" (you know   │
│   this already based on your journal) │
│                                        │
│ • Add "Advanced Delegation Scenarios" │
│   (you're ready for more challenge)   │
│                                        │
│ Why? You completed the last 2         │
│ locations quickly and showed strong   │
│ understanding in your reflections.    │
│                                        │
│ [Accept] [Decline] [Show Standard Path]│
│                                        │
│ [✓] Don't show suggestions for a while│
└────────────────────────────────────────┘
```

---

### AI Model & Training

**Phase 4 Implementation:**

**Initial Model:**
- Rule-based system with ML enhancement
- Analyzes: time spent, completion rates, journal sentiment
- Decisions: difficulty adjustment, content suggestions
- Training data: aggregated user behavior (anonymized)

**Advanced Model (Phase 5+):**
- Deep learning for pattern recognition
- Natural language understanding of journal entries
- Predictive modeling of user success
- Continuous learning from user feedback

**Data Sources:**
- User journey progress
- Activity completion patterns
- Time spent on locations
- Journal entry sentiment analysis
- User feedback on AI decisions
- Completion rates
- Satisfaction scores

**Privacy:**
- All data anonymized
- User can opt out of AI features
- AI decisions logged for transparency
- User owns all their data

---

## Integration with Journal System

The journey system integrates seamlessly with the journal system (defined in FringeIsland_Journal_System_Design.md).

### How Journeys and Journals Connect

**1. Journey Enrollment Creates Travel Journal**

When user enrolls in a journey:
```
User clicks "Enroll in Leadership Fundamentals"
↓
System creates:
  - user_journey_instances record (trip_id)
  - Travel Journal book for this journey (in journal system)
  - Travel Journal automatically tagged to this journey
```

**2. Location Pages Have Journal Buttons**

At each location:
```
┌─────────────────────────────────────────┐
│ Location: "Understanding Your Values"   │
├─────────────────────────────────────────┤
│                                         │
│ [Location content here]                 │
│                                         │
│ Activities:                             │
│ ✓ Read: Introduction to Values         │
│ ○ Exercise: Values Card Sort           │
│ ○ Reflection: My Top 5 Values          │
│                                         │
│ [📝 Reflect in Journal]                 │
│                                         │
└─────────────────────────────────────────┘
```

Click "Reflect in Journal" → Opens journal with entry pre-tagged to:
- Journey: Leadership Fundamentals
- Location: Understanding Your Values

**3. Activity-Prompted Journal Entries**

Activities can prompt journaling:
```sql
activities:
  prompts_journal_entry: true
  journal_prompt_text: "How did identifying your values make you feel?"
```

When user completes activity:
```
Activity Complete! ✓

📝 Take a moment to reflect:
"How did identifying your values make you feel?"

[Write in Journal] [Skip for Now]
```

Creates journal entry:
- Entry type: 'journey'
- Primary trip: Leadership Fundamentals
- Associated location: Understanding Your Values
- Prompt: Pre-filled with question

**4. Transition Reflections**

Transitions can include reflection prompts:
```
You're traveling from "Values" to "Values in Action"

Before continuing, reflect:
"What surprised you most about your values?"

[Write Reflection]
```

Creates journal entry during transition.

**5. Travel Journal Filtering**

In the Travel Journal for "Leadership Fundamentals":
- Shows all entries tagged to this journey
- Chronologically ordered
- Can filter by location
- Can include Musings if user enables filter

**6. Travel Album Integration**

When journey completes:
- Travel Album includes all journal entries from journey
- Entries shown chronologically with location context
- User's complete reflective record of the journey

---

### Journal Entry Flow Example

```
User at Location 3: "Giving Feedback"
↓
Completes Activity: "Practice Feedback Conversation"
↓
Activity prompts: "How did it feel to give direct feedback?"
↓
User clicks "Reflect in Journal"
↓
Journal opens with new entry:
  - Pre-tagged: Leadership Fundamentals journey
  - Associated: Location "Giving Feedback"
  - Prompt shown: "How did it feel to give direct feedback?"
  - User writes reflection
  - Saves
↓
Entry appears in:
  - Travel Journal for Leadership Fundamentals
  - Can be filtered into My Diary (if user enables)
  - Eventually in Travel Album when journey completes
```

---

### Database Connection

```sql
-- Journal entries reference journey instances:

journal_entries:
  entry_type: 'journey' (vs 'diary' or 'musing')
  primary_trip_id: UUID REFERENCES user_journey_instances(trip_id)
  associated_location: UUID REFERENCES locations(location_id)
  journey_tags[]: Array of trip_ids for cross-journey entries

-- Query for Travel Journal:
SELECT * FROM journal_entries
WHERE user_id = ?
  AND primary_trip_id = ? -- specific journey
ORDER BY created_at ASC
```

---

## Journey Lifecycle

### From Creation to Completion

```
┌──────────────────────────────────────────────────────────┐
│                    JOURNEY LIFECYCLE                     │
└──────────────────────────────────────────────────────────┘

1. CREATION (The Journey Designer)
   Creator opens The Journey Designer
   ↓
   Chooses template or starts blank
   ↓
   Builds journey structure on canvas
   ↓
   Adds content and activities
   ↓
   Tests journey (preview mode)
   ↓
   Saves as draft

2. PUBLISHING
   Creator clicks "Publish"
   ↓
   Sets metadata (title, description, difficulty)
   ↓
   Reviews journey summary
   ↓
   Publishes to catalog
   ↓
   Journey appears in browse/search

3. DISCOVERY
   User browses journey catalog
   ↓
   Views journey detail page
   ↓
   Reads overview, sees structure preview
   ↓
   Checks prerequisites
   ↓
   Decides to enroll

4. ENROLLMENT
   User clicks "Embark on This Journey"
   ↓
   System creates:
     - user_journey_instances record (My Trip)
     - Travel Journal for this journey
     - Initial location visits records
   ↓
   Status: 'enrolled'

5. JOURNEY START
   User clicks "Begin Journey"
   ↓
   Status: 'in_progress'
   ↓
   Taken to first location
   ↓
   Sees welcome content
   ↓
   Can start activities

6. TRAVELING (User's Experience)
   At Location 1:
     - View content
     - Complete activities
     - Write journal entries
     - Mark location complete
   ↓
   Optional transition (if configured)
   ↓
   Location 2 unlocks
   ↓
   Repeat...

7. PROGRESS TRACKING
   System tracks:
     - Current location
     - Locations visited
     - Activities completed
     - Time spent
     - Journal entries
     - Path choices (if branching)
   ↓
   Updates:
     - user_journey_instances
     - user_location_visits
     - user_activity_completions

8. COMPLETION
   User completes final location
   ↓
   System checks completion criteria
   ↓
   Status: 'completed'
   ↓
   Generates Travel Album
   ↓
   Shows completion celebration
   ↓
   Awards completion badge/certificate

9. POST-JOURNEY
   User can:
     - View Travel Album (complete record)
     - Revisit locations (read-only)
     - Add journal entries (reflection)
     - Rate journey
     - Recommend to others
     - Export Travel Album
```

---

### Journey States

**Guidebook States:**
```
Draft → Published → Active → Archived
```

- **Draft**: Being created, not visible to users
- **Published**: Visible in catalog, users can enroll
- **Active**: Has enrolled users
- **Archived**: No longer accepting enrollments (existing users can continue)

**User Journey Instance States:**
```
Enrolled → In Progress → [Paused] → Completed / Abandoned
```

- **Enrolled**: User committed but hasn't started
- **In Progress**: Actively traveling
- **Paused**: Temporarily stopped, can resume
- **Completed**: Finished successfully
- **Abandoned**: User gave up

**Location Visit States:**
```
Locked → Available → In Progress → Completed
```

- **Locked**: Can't access (prerequisites not met)
- **Available**: Can start now
- **In Progress**: Currently working on this
- **Completed**: Finished all requirements

---

## Implementation Roadmap

### Phase 1: Linear Journeys (Current - 70% Complete)

**Status:** In development

**Features:**
- ✅ Guidebook catalog browsing
- ✅ Journey detail pages
- ✅ Basic journey structure (8 predefined journeys)
- 🔲 The Journey Designer (basic canvas)
- 🔲 Linear structure only
- 🔲 Journey enrollment
- 🔲 Location navigation
- 🔲 Activity completion
- 🔲 Journal integration
- 🔲 Travel Album generation

**Database:**
- ✅ Core tables created
- ✅ Sample data seeded
- 🔲 User journey tracking tables

**Focus:**
- Prove core journey concept
- Validate user experience
- Build foundation for future complexity

---

### Phase 2: Templates, Components & Enhanced Structures

**Target:** 3-4 months after Phase 1 launch

**Features:**
- **The Journey Designer (Full)**
  - Visual canvas interface
  - Drag & drop locations
  - Draw connections
  - Real-time validation
  
- **Templates Library**
  - 5-10 system templates
  - Template browser
  - One-click instantiation
  
- **Components Library**
  - 15-20 system components
  - Drag components onto canvas
  - Structure patterns + content blocks
  
- **Enhanced Structures**
  - Regional/Modular journeys (Option B)
  - Open World journeys (Option E)
  - Time-based unlocking (Option G)
  
- **User Features**
  - Save custom components
  - Journey testing mode
  - Preview before publishing

**Database:**
- journey_templates table
- journey_components table
- user_saved_components table
- Enhanced location fields (regions, time-based)

**Focus:**
- Empower creators
- Accelerate journey creation
- Expand structure options

---

### Phase 3: Advanced Structures & Collaboration

**Target:** 6-9 months after Phase 1 launch

**Features:**
- **Advanced Journey Structures**
  - Branching paths (Option C)
  - Hub & Spoke (Option D)
  - Network/Web dependencies (Option F)
  - Full hybrid support
  
- **The Journey Designer (Advanced)**
  - Choice point creator
  - Hub configuration
  - Complex prerequisite logic
  - Visual dependency graphs
  
- **Collaboration**
  - Co-create journeys
  - Share components with community
  - Community component marketplace
  - Journey versioning
  
- **User Features**
  - Pair journeys (travel with buddy)
  - Group journeys (cohort-based)
  - Facilitator roles
  - Live cohorts with schedules

**Database:**
- choice_points table
- Complex prerequisite logic
- Collaboration tables
- Community marketplace

**Focus:**
- Sophisticated journey designs
- Community engagement
- Social learning

---

### Phase 4: AI-Powered Dynamic Journeys

**Target:** 12-18 months after Phase 1 launch

**Features:**
- **AI Journey Creator**
  - Natural language journey generation
  - "Describe your journey" → AI builds it
  - Content suggestions
  - Activity recommendations
  
- **AI Dynamic Journeys**
  - Initial assessment
  - Real-time personalization
  - Adaptive difficulty
  - Custom path generation
  - Smart recommendations
  
- **AI Features**
  - Analyze journal sentiment
  - Detect struggles/mastery
  - Suggest next steps
  - Generate insights
  - Predict success
  
- **Transparency**
  - AI decision logging
  - Explainable recommendations
  - User control and override
  - Feedback collection

**Database:**
- ai_journey_decisions table
- Enhanced personalization_profile fields
- AI model versioning
- Training data collection

**Focus:**
- Cutting-edge personalization
- Scale individualized learning
- AI-human collaboration
- Platform differentiation

---

### Phase 5: Advanced AI & Ecosystem

**Target:** 18-24 months after Phase 1 launch

**Features:**
- **Advanced AI**
  - Deep learning models
  - Multi-modal content generation
  - Predictive analytics
  - Continuous learning
  
- **Journey Ecosystem**
  - User-generated journey marketplace
  - Journey remixing
  - Cross-journey progression
  - Journey series/programs
  
- **Rich Media**
  - Video content creation
  - Interactive simulations
  - VR/AR experiences (future)
  - Multimedia activities
  
- **Platform Integration**
  - API for external tools
  - Third-party journey components
  - Integration with LMS systems
  - Mobile app parity

**Focus:**
- Platform maturity
- Ecosystem growth
- Innovation leadership
- Global scale

---

## Success Metrics

### Journey Creation Metrics

- **The Journey Designer**
  - Time to create first journey (target: <30 minutes with template)
  - Template usage rate (target: 70% of new journeys use templates)
  - Component usage rate (target: 80% of journeys use components)
  - Creator satisfaction (target: 4.5/5 stars)

- **Journey Quality**
  - Completion rate by structure type
  - User ratings
  - Time to complete vs. estimated
  - Activity engagement rates

### Journey Participation Metrics

- **Enrollment & Completion**
  - Browse → Enrollment conversion (target: 15%)
  - Enrollment → Start conversion (target: 80%)
  - Start → Completion rate (target: 60%)
  - Average time to complete

- **Engagement**
  - Locations visited per session
  - Time spent per location
  - Activity completion rate
  - Journal entries per journey (target: 10+)

### AI Metrics (Phase 4+)

- **AI Journey Creation**
  - AI-generated journeys created
  - Creator acceptance rate of AI suggestions
  - Time saved using AI vs. manual

- **AI Dynamic Journeys**
  - Users on AI-personalized paths
  - AI decision acceptance rate
  - User satisfaction with personalization
  - Completion rate: AI vs. static journeys

---

## Conclusion

FringeIsland's journey architecture, centered around **The Journey Designer**, provides:

✅ **Simple Phase 1** - Linear journeys validate the concept
✅ **Scalable Architecture** - Supports all 8+ structure types
✅ **Visual Creation Tool** - Intuitive canvas-based journey building
✅ **Templates & Components** - Accelerate creation with proven patterns
✅ **AI-Powered Future** - Dynamic personalization and generation
✅ **No Breaking Changes** - Future features activate existing architecture
✅ **Travel Metaphor** - Authentic, consistent terminology
✅ **Journal Integration** - Seamless reflective learning
✅ **Hybrid by Default** - Mix any patterns in one journey

**The Journey Designer empowers creators to build any learning experience imaginable, from simple linear paths to AI-powered adaptive journeys, all on one flexible canvas.**

---

## Appendices

### Appendix A: Journey Designer UI Specifications
(Detailed mockups and interaction patterns - to be developed)

### Appendix B: Template & Component Catalog
(Complete list of system-provided templates and components - to be developed)

### Appendix C: AI Model Specifications
(Technical details of AI journey generation and personalization - to be developed)

### Appendix D: API Documentation
(For external integrations and journey component development - to be developed)

---

**Document Version:** 2.0
**Last Updated:** February 1, 2026
**Status:** Architecture Complete, Phase 1 Implementation In Progress

---

**Related Documents:**
- FringeIsland_Journal_System_Design.md
- FringeIsland_ROADMAP.md
- FringeIsland_Database_Schema.md (to be created)
- The_Journey_Designer_User_Guide.md (to be created)
