# FringeIsland — System Architecture & Anatomy Analysis

## Mission

Perform a comprehensive analysis of the FringeIsland platform's current system architecture and anatomy. The output should serve as an **architectural baseline** that can be used to:

1. Ground BDD scenarios in structural reality
2. Inform Solution Package (SP) boundaries
3. Enable Roadmap Dependency Analysis
4. Support Sprint Autonomy Planning

---

## Context

FringeIsland is an "Immersive Edutainment" platform built with **Next.js + React + TypeScript** on the frontend and **Supabase (PostgreSQL)** on the backend. The platform features a flexible node/group-based authorization system with many-to-many relationships allowing context-dependent roles. Key infrastructure includes RPC functions, Row Level Security policies, and pg_cron jobs for temporal logic (e.g., stewardship transfer timeouts).

This analysis follows a development lifecycle flow of: OA → MR → POC / Main Studies → SP → Implementation, where BDD and TDD operate *on* the system architecture as the medium they probe and shape.

---

## Phase 1: Repository Structure & Application Layer

### Tasks

- Scan the full repo directory tree and document the top-level structure
- Map the **frontend component hierarchy**: pages, layouts, shared components, feature-specific components
- Identify the **routing structure** (Next.js App Router or Pages Router, dynamic routes, route groups)
- Document **state management** patterns: React state, context providers, any global state libraries
- Identify **shared utilities, hooks, and helper modules**
- Note any **configuration files** of architectural significance (next.config, tsconfig, environment setup)

### Expected Output

A section called **"Application Layer Anatomy"** with:

- Directory structure overview (annotated)
- Component hierarchy map
- Routing map
- State management patterns
- Key shared modules and their purposes

---

## Phase 2: Database Layer (CRITICAL — Equal Weight to Application)

### Tasks

#### Schema Structure

- Extract the **complete database schema**: all tables, columns, types, constraints, primary keys, foreign keys
- Map all **table relationships** — especially the many-to-many relationships in the node/group authorization model
- Document **enums and custom types**
- Identify the **core domain tables** vs. supporting/utility tables

#### Behavioral Layer

- List and document all **RPC functions** (Supabase/PostgreSQL functions): name, parameters, return type, what they do, which tables they touch
- List all **database triggers** and what they respond to
- Document any **pg_cron jobs**: schedule, what they execute, purpose (e.g., stewardship transfer timeout logic)
- Identify any **views** or **materialized views**

#### Security Model

- Document all **Row Level Security (RLS) policies**: which tables, what conditions, for which roles
- Map how the **context-dependent role system** works at the database level (admin in one group, participant in another)
- Identify any **service role** vs. **anon role** distinctions and their implications

#### Data Patterns

- Identify **data flow patterns** for key operations (what gets read/written and in what order)
- Note any **soft deletes**, **audit trails**, or **temporal patterns**
- Document **indexing strategy** if visible

### Expected Output

A section called **"Database Layer Anatomy"** with:

- Schema diagram (can be text-based/mermaid)
- Table inventory with relationships
- RPC function catalog
- Trigger and pg_cron inventory
- RLS policy map
- Authorization model explanation

### How to Extract

```bash
# If Supabase CLI is available:
supabase db dump --schema public > schema_dump.sql

# Or check for migration files in the repo:
# Look in supabase/migrations/ or similar directories

# Also check for:
# - seed files
# - type generation files (e.g., database.types.ts)
# - Any schema documentation already in the repo
```

---

## Phase 3: API / Service Boundary

### Tasks

- Map all **Supabase client calls** from the frontend: which tables/views/RPCs are called, from which components
- Identify any **Edge Functions** or **API routes** (Next.js API routes or Supabase Edge Functions)
- Document the **contract** between frontend and backend: what data shapes flow across the boundary
- Identify any **real-time subscriptions** (Supabase Realtime)
- Note any **external API integrations** (third-party services, Trafiklab, etc.)

### Expected Output

A section called **"API & Service Boundary"** with:

- Frontend-to-backend call inventory
- Edge Function / API route catalog
- Data contract summary
- Real-time subscription map
- External integration points

---

## Phase 4: Cross-Layer Journey Traces

This is the most valuable part. Pick **2-3 key user journeys** and trace them through every layer.

### Suggested Journeys (adapt based on what exists in the codebase)

1. **User joins a group and receives a role** — touches auth, group/node model, RLS
2. **User progresses through a learning journey / episode** — touches navigation, state, data persistence
3. **Stewardship transfer with timeout** — touches pg_cron, RPC functions, authorization changes

### For Each Journey, Document

1. **Trigger**: What initiates the journey (user action, system event)
2. **Frontend path**: Which components render, what state changes
3. **API calls**: Which Supabase calls fire, in what order
4. **Database operations**: Which tables get read/written, which RPC functions execute
5. **Security checkpoints**: Which RLS policies gate access at each step
6. **State transitions**: What changes in the system after the journey completes

### Expected Output

A section called **"Cross-Layer Journey Traces"** with the journey traces formatted as step-by-step flows showing all layers.

---

## Phase 5: Dependency Map & Architectural Observations

### Tasks

- Identify **tightly coupled components** — things that cannot change independently
- Identify **natural boundaries** — areas that are relatively isolated and could form independent SPs
- Note **architectural risks** — single points of failure, overly complex areas, missing abstractions
- Document **technical debt** observations — things that work but are fragile or hard to extend
- Identify where the architecture **supports** vs. **fights against** the platform goals (seasons/episodes, AR integration, collaboration mechanics, governance)

### Expected Output

A section called **"Architectural Observations"** with:

- Dependency graph (text-based or mermaid)
- Coupling hotspots
- Natural SP boundaries (suggested)
- Risk inventory
- Technical debt notes
- Alignment assessment (architecture vs. platform vision)

---

## Phase 6: BDD Connection Points

### Tasks

- For each cross-layer journey trace, draft **1-2 high-level Gherkin scenarios** that describe the behavior
- Note which architectural components each scenario touches
- Identify which scenarios would be **architecturally independent** (good SP candidates) vs. **cross-cutting** (need coordination)
- Flag any behaviors that the current architecture **cannot cleanly support** — these are architectural evolution candidates

### Expected Output

A section called **"BDD Connection Points"** with:

- Sample Gherkin scenarios tied to journey traces
- Scenario-to-architecture mapping
- Independence assessment
- Architecture evolution candidates

---

## Output Format

Produce a single markdown document called `ARCHITECTURE_BASELINE.md` structured with the six sections above. Use mermaid diagrams where they add clarity (especially for schema relationships, dependency graphs, and journey flows).

Include a **metadata header** with:

- Date of analysis
- Git commit hash analyzed
- Any areas that could not be fully analyzed (and why)

---

## Important Notes

- **Do not skip the database.** It deserves equal or greater depth than the application layer. The database is where authorization, business logic, and temporal behavior live.
- **Be specific, not generic.** Reference actual file names, function names, table names. This is a baseline of *this* system, not a template.
- **Flag what is missing.** If expected documentation, tests, or patterns are absent, note that — gaps are valuable findings.
- **Preserve the "why".** If you can infer *why* an architectural decision was made (from comments, naming, patterns), capture that reasoning.
- **Think about scale.** The platform is designed for 10,000+ users. Note where the architecture supports or limits this.
