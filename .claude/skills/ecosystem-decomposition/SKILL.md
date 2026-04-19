---
name: ecosystem-decomposition
description: >
  The core methodology skill for the FringeIsland ecosystem. Handles ALL decomposition
  work from ecosystem vision down to ready-to-build tasks — across all products, platform
  services, and studios, across all waves. Use this skill whenever someone asks to:
  define or update the ecosystem vision, write or review product/service/studio descriptions
  or specifications, map capabilities across the ecosystem, identify dependencies between
  products and platform services, scope a wave, break down a concept into features,
  create feature specs, decompose features into stories and tasks, or understand what
  any part of the ecosystem needs to deliver. Also use when asked to "decompose",
  "break down", "spec out", "what does X need", "map capabilities", "plan the ecosystem",
  "what's needed for wave Y", "populate features", or "define the scope of Z".
  This skill operates at five levels and can be entered at any level.
---

# Ecosystem Decomposition

The methodology for systematically decomposing work in the FringeIsland ecosystem.
Operates across ALL products, platform services, and studios, across ALL waves.
Can be entered at any level — from ecosystem vision down to task creation.

## The two trees (never mixed)

**Ecosystem tree (WHAT)** — permanent, structural:
`docs/ecosystem/`, `docs/products/`, `docs/platform/`, `docs/studios/`,
`docs/design-system/`, `docs/verticals/`, `docs/architecture/`

**Planning tree (HOW)** — temporal, operational:
`docs/planning/` (waves, cycles, backlog, sessions, retrospectives)

Features belong to the ecosystem tree. Tasks belong to the planning tree.
Waves reference features — they don't contain them.

## The decomposition hierarchy

```
Level 1: VISION          docs/ecosystem/VISION.md
Level 2: ENTITIES         docs/products/{name}/, docs/platform/{tier}/, docs/studios/{name}/
Level 3: CAPABILITIES     Analytical output — capability map + dependency chains
Level 4: FEATURES         docs/{owner}/features/FEAT-{PREFIX}{NNN}-{slug}.md
                          (Stories with Given/When/Then embedded within)
Level 5: TASKS            docs/planning/backlog/tasks/TASK-{NNN}.md
```

Each level answers a different question:

| Level | Name | Question | Frequency |
|-------|------|----------|-----------|
| 1 | Vision | Why does this ecosystem exist? | Rarely (constitutional) |
| 2 | Entities | What are we building and for whom? | Occasionally |
| 3 | Capabilities | What capabilities are needed, who owns them, what depends on what? | At wave boundaries, cooldown |
| 4 | Features | How is each capability specified? | Regular |
| 5 | Tasks | What implementation work is needed? | Daily during build |

Each level feeds the next. You can enter at any level, but upstream levels
must exist before downstream levels are meaningful.

---

## Level 1 — Vision

**When:** Starting the ecosystem from scratch, or revisiting foundational purpose.
**Frequency:** Rarely (constitutional document, changes only through deliberate locked decisions).
**File:** `docs/ecosystem/VISION.md`

**What to produce:**
- Mission statement — why the ecosystem exists
- The three founding questions (Who am I? What do I want? How do I get there?)
- Founding principles — non-negotiable values all products must embody
- Shared universe concepts — Three Worlds, the Whisp, the Hero's Journey framework
- Target audience — who is this for at the broadest level
- The non-judgment principle
- Ecosystem boundaries — what this ecosystem intentionally is NOT

**Quality check:**
- [ ] Every product/service/studio can trace its purpose back to this vision
- [ ] The vision constrains (says what we don't do) as much as it enables

---

## Level 2 — Entities (Products, Services, Studios)

**When:** Defining what the ecosystem is made of, adding a new product/service/studio, or clarifying boundaries between existing ones.
**Frequency:** Occasionally — when the ecosystem evolves or boundaries become unclear.
**Files:** `DESCRIPTION.md` + `SPECIFICATION.md` + `ROADMAP.md` per entity.

### 2a. Entity inventory

Before writing any descriptions, map the full ecosystem:

**Products (surfaces FIMs touch):**
| Product | Path | Status |
|---------|------|--------|
| The Hub | `docs/products/hub/` | Active |
| The Gimbal | `docs/products/gimbal/` | Planned |
| The Game | `docs/products/game/` | Placeholder |

**Platform Core (domain-agnostic foundation):**
| Component | Path | What it covers |
|-----------|------|----------------|
| Infrastructure (PC-1) | `docs/platform/core/` | Supabase, PostgreSQL, RLS, Storage, feature flags |
| Identity (PC-2) | `docs/platform/core/` | Auth, profile, sessions, MFA |
| Organisation (PC-3) | `docs/platform/core/` | Groups, memberships, roles, permissions |
| Governance (PC-4) | `docs/platform/core/` | DeusEx policies, platform rules |

**Domain Services (FringeIsland-specific):**
| Service | Path | What it covers |
|---------|------|----------------|
| World Model (DS-1) | `docs/platform/domain/` | Universe, Three Worlds, Whisp, lore |
| Narrative Engine (DS-2) | `docs/platform/domain/` | Seasons, episodes, story beats |
| Experience Engine (DS-3) | `docs/platform/domain/` | Journeys, steps, progress, enrolments |
| Content (DS-4) | `docs/platform/domain/` | Media, assets, narrative blocks |
| Communication (DS-5) | `docs/platform/domain/` | DM, forums, activity feeds |
| Discovery (DS-6) | `docs/platform/domain/` | Search, recommendations, marketplace |
| Intelligence (DS-7) | `docs/platform/domain/` | AI mentor, profile accumulation |

**Studios (full lifecycle environments for Dreamineers):**
| Studio | Path | Writes to |
|--------|------|-----------|
| Journey Studio | `docs/studios/journey-studio/` | Experience Engine |
| Universe Studio | `docs/studios/universe-studio/` | World Model |
| Arc Studio | `docs/studios/arc-studio/` | Narrative Engine |

**Cross-cutting verticals:**
Administration, Privacy/GDPR, Notifications, Observability, Transactions

### 2b. Write descriptions and specifications

For each entity that is Active or entering active development:

**DESCRIPTION.md** (outward-facing — what + why):
Use template `docs/templates/product-description.md` or `docs/templates/studio-description.md`
- Identity — what is this?
- Target users — who uses it?
- Core experience — what does using it feel like?
- Boundaries — what this intentionally does NOT do
- Relationship to ecosystem — how it connects to siblings

**SPECIFICATION.md** (inward-facing — how it works):
Use template `docs/templates/product-specification.md` or `docs/templates/domain-service-spec.md`
- Feature inventory (shipped, in progress, planned)
- User roles and permissions
- Technical constraints
- API dependencies

**Quality check:**
- [ ] Every active entity has at least a DESCRIPTION.md
- [ ] Boundaries are explicit — where does this entity stop and a sibling begin?
- [ ] Platform dependencies are documented

---

## Level 3 — Capabilities (Ecosystem-wide mapping)

**When:** Scoping a wave, planning a major release, onboarding to the ecosystem, or discovering that a feature needs capabilities that don't exist yet.
**Frequency:** At wave boundaries, during cooldown weeks, when strategic planning happens.
**Output:** Capability map + dependency graph informing wave scope and feature creation.

This is the level most often skipped — and skipping it causes the most pain.
It answers: "What capabilities does the ecosystem need, which entities own them,
and what are the dependencies?"

### 3a. Map capabilities to owners

For a given scope (a wave, a product area, or a user journey), list every
capability needed and identify which entity owns it:

```markdown
## Capability map: Ferd (Foundation)

| Capability | Owner | Depends on | Status |
|-----------|-------|------------|--------|
| User authentication | Platform Core — Identity | Infrastructure | Done |
| User profiles | Platform Core — Identity | Infrastructure | Done |
| Group CRUD | Platform Core — Organisation | Identity | Done |
| Role assignment | Platform Core — Organisation | Identity | Done |
| RLS policies | Platform Core — Infrastructure | — | Done |
| Auth UI (signup, login) | Hub | Identity | Done |
| Profile UI | Hub | Identity | Done |
| Group management UI | Hub | Organisation | Done |
| Journey data model | Experience Engine | Organisation, Identity | Done |
| Journey catalog UI | Hub | Experience Engine | Done |
| Journey enrollment | Experience Engine | Organisation, Identity | Not started |
| Journey enrollment UI | Hub | Experience Engine enrollment | Not started |
| Journey content delivery | Experience Engine | Content | Not started |
```

### 3b. Identify dependency chains

Order capabilities by their dependencies — what must exist before what:

```
Infrastructure → Identity → Organisation → Experience Engine → Hub UI
                                         → Communication → Hub UI
                                         → Content → Experience Engine
```

**Rule:** Platform capabilities must be specified before product features that
consume them. You cannot write FEAT-H005 (journey enrollment UI) before
FEAT-D003 (journey enrollment API) exists in Experience Engine.

### 3c. Identify gaps

Compare the capability map against:
- The wave's intended scope
- Existing feature specs
- The current codebase

Gaps fall into three categories:
- **Missing platform capability** — needs a platform feature spec first
- **Missing product feature** — needs a product feature spec
- **Missing specification** — capability exists in code but has no feature spec (retroactive documentation needed)

### 3d. Feed into wave scoping

The capability map directly informs the wave file. Each capability in scope
should have a corresponding feature spec (or need one created).

**Quality check:**
- [ ] Every capability has exactly one owner
- [ ] Dependencies are documented — no circular dependencies
- [ ] Platform capabilities specified before product features that consume them
- [ ] Gaps identified and categorised

---

## Level 4 — Features (with Stories embedded)

**When:** A capability has been identified (Level 3) and its dependencies are met.
**Frequency:** Regular — during cooldown (shaping) and build cycles (mid-cycle discoveries).
**Files:** `docs/{owner}/features/FEAT-{PREFIX}{NNN}-{slug}.md`

### 4a. Identify the owner

| If the capability is about... | Owner | Prefix |
|-------------------------------|-------|--------|
| Web UI, FIM-facing browser experience | Hub | H |
| Mobile experience, AR, GPS | The Gimbal | G |
| Game experience (scope TBD) | The Game | GM |
| Auth, profiles, sessions, Journal | Platform Core — Identity | PC |
| Groups, roles, permissions | Platform Core — Organisation | PC |
| Database, RLS, infrastructure, feature flags | Platform Core — Infrastructure | PC |
| DeusEx, platform governance, audit | Platform Core — Governance | PC |
| Universe, Three Worlds, Whisp, lore | Platform Domain — World Model | PD |
| Seasons, episodes, story beats | Platform Domain — Narrative Engine | PD |
| Journeys, steps, progress, enrolments | Platform Domain — Experience Engine | PD |
| Media, assets, narrative blocks | Platform Domain — Content | PD |
| DM, forums, activity feeds | Platform Domain — Communication | PD |
| Search, recommendations, marketplace | Platform Domain — Discovery | PD |
| AI mentor, profile accumulation | Platform Domain — Intelligence | PD |
| Journey lifecycle (design, deploy, manage, retire) | Journey Studio | JS |
| World/universe authoring and management | Universe Studio | US |
| Season/episode authoring and management | Arc Studio | AS |
| Shared visual language, components | Design System | DS |
| Cross-cutting concern | Verticals | V |

**Cross-cutting features:** A single capability often spans multiple owners
(e.g., Hub UI + Platform data model). Create separate feature specs for each
owner and link them via "Platform dependencies" and "Cross-product impact."

### 4b. Check what already exists

Read the owner's `features/README.md` before creating new specs.
Do not duplicate. Update existing specs rather than creating new ones.

### 4c. Write the feature spec

Use template `docs/templates/feature-spec.md`. Shape Up pitch format:

**YAML frontmatter:**
```yaml
---
id: FEAT-{PREFIX}{NNN}
title: {Feature title}
owner: {platform/core/infrastructure | platform/core/identity | platform/core/organisation | platform/core/governance | platform/domain/experience-engine | platform/domain/content | platform/domain/communication | platform/domain/world-model | platform/domain/narrative-engine | platform/domain/discovery | platform/domain/intelligence | hub | gimbal | game | studio/journey-studio | studio/universe-studio | studio/arc-studio | design-system}
consumers: [{hub} | {gimbal} | {game} | {studio/journey-studio} | {studio/universe-studio} | {studio/arc-studio}]
wave: {ferd | eid | hamn | heim | brim | urd}
maturity: {0-raw | 1-concept | 2-explored | 3-specified | 4-ready | 5-in-cycle | 6-done}
---
```

**Body (forward-looking specs):** Problem → Appetite → Solution sketch → Rabbit holes →
No-gos → Stories (with Given/When/Then acceptance criteria) → Platform dependencies →
Cross-product impact → Vertical impact.

**Body (retroactive 6-done specs):** Problem → Implementation notes → No-gos →
Stories (with Given/When/Then acceptance criteria) → Platform dependencies →
Cross-product impact → Vertical impact.

Omit Appetite, Solution sketch, and Rabbit holes from retroactive specs — these are
pre-build planning fields that have no meaning for already-shipped work.
Implementation notes replace Solution sketch: describe what was actually built,
where it lives (key files, migrations, RPCs, components), and any decisions made
during implementation.

### 4d. Stories (embedded in the feature spec)

Each feature contains one or more stories. Stories are NOT separate files.

A good story follows INVEST: Independent, Negotiable, Valuable, Estimable,
Small (1-3 days), Testable.

```markdown
### STORY-1: {Title}
As a {role}, I want {capability}, so that {benefit}.

**Acceptance criteria:**
- Given {context}, when {action}, then {outcome}
```

### 4e. Maturity controls depth

| Maturity | What to write |
|----------|---------------|
| 0-raw | Problem statement only |
| 1-concept | Problem + rough solution sketch |
| 2-explored | Full spec minus detailed stories |
| 3-specified | Complete spec with all stories and Given/When/Then |
| 4-ready | All questions answered, DoR met, ready for task creation |

**Rule: Never skip levels.** Each level requires genuine work.

**Documenting already-built features (retroactive):** When capturing work that
has already been implemented, set maturity directly to `6-done`. Write the full
feature spec as a record of what was built. Do NOT create tasks for
already-built features.

### 4f. Update the feature index

After creating or updating specs, update `features/README.md`:

```markdown
| ID | Title | Maturity | Wave |
|----|-------|----------|------|
| FEAT-H001 | Authentication | 6-done | ferd |
```

---

## Level 5 — Tasks

**When:** A feature reaches maturity 4-ready and is pulled into a cycle.
**Frequency:** Daily during build cycles.
**Files:** `docs/planning/backlog/tasks/TASK-{NNN}.md`

Tasks are ONLY created for features at maturity 4+. Do NOT create tasks for
features still being specified.

### 5a. Create tasks from stories

For each story in the feature spec, create one or more tasks.
Use template `docs/templates/task.md`.

**YAML frontmatter:**
```yaml
---
id: TASK-{NNN}
title: {Task title}
status: {todo | in_progress | review | done | blocked}
assigned_to: {person or agent name}
priority: {low | medium | high | critical}
feature: {FEAT-ID}
product: {hub | gimbal | game | platform-core | platform-domain | ...}
tier: {products/hub | platform/core | platform/domain | ...}
wave: {ferd | eid | ...}
depends_on: [{TASK-IDs}]
estimated_hours: {number}
---
```

**Task sizing:** One task = one focused agent session. If more than a day, split it.

**Task lifecycle:** todo → in_progress → review → done → survives cooldown/retro → deleted after retrospective committed.

### 5b. Link to wave

Ensure the wave file (`docs/planning/waves/{wave}.md`) references the parent feature.

---

## Choosing the right entry point

| Situation | Start at |
|-----------|----------|
| Starting a new ecosystem | Level 1 — write VISION.md, cascade down |
| Adding a new product/studio | Level 2 — write DESCRIPTION.md + SPECIFICATION.md |
| Scoping a wave / "what does Ferd need?" | Level 3 — map capabilities across ecosystem |
| Spec out a specific feature | Level 4 — write feature spec with stories |
| Build a ready feature | Level 5 — create tasks (then use feature-development skill) |
| Document already-built work | Level 4 — write retroactive spec at maturity 6-done |
| Check dependencies between X and Y | Level 3 — map capabilities and dependency chains |
| Is a wave complete? | Level 3 — map capabilities + use wave-planning skill for DoD |

---

## Quality checklist (any decomposition)

- [ ] Every feature has exactly one owner (product/service/studio)
- [ ] Every feature has a unique ID with the correct prefix
- [ ] Feature maturity level is honest (not inflated)
- [ ] Platform capabilities specified before product features that consume them
- [ ] Cross-product dependencies documented in both directions
- [ ] The features/README.md index is updated for every affected owner
- [ ] No feature duplicates work in another feature
- [ ] Wave file references all in-scope features (if wave-tagged)
- [ ] Vertical impact section is complete — no blanks, every vertical addressed or marked "None"
- [ ] Extensibility addressed — no hardcoded enums, no sealed type systems, no closed permission sets

## Context loading order

Load progressively — never load everything at once:

1. `docs/README.md` — overall structure
2. `docs/ecosystem/VISION.md` — purpose and constraints (if doing Level 1-3 work)
3. The owner's `README.md` — this product/service/studio
4. The owner's `features/README.md` — what already exists
5. The owner's `DESCRIPTION.md` — boundaries and identity
6. The owner's `SPECIFICATION.md` — current technical state
7. The specific feature spec (if updating one)
8. `docs/planning/waves/{wave}.md` — wave scope (if relevant)

## References

- `docs/templates/feature-spec.md` — feature spec template
- `docs/templates/task.md` — task template
- `docs/templates/wave-spec.md` — wave template
- `docs/templates/product-description.md` — product description template
- `docs/templates/product-specification.md` — product specification template
- `docs/templates/domain-service-spec.md` — domain service template
- `docs/templates/studio-description.md` — studio description template
