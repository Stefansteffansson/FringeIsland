# Multi-Product Ecosystem Management for Solo Developers

**Research companion to: The Solo Developer's Complete Guide to Systematic Web Development**

The previous research covered how to manage *work items* — from vague idea to shipped code. This companion report covers the layer above that: how to manage *products* when your platform is actually a family of related products sharing a universe, a backend, and a cosmology but serving users through different clients and experiences.

---

## 1. The document hierarchy you're missing

The first research report introduced a work item hierarchy (Theme → Epic → Story → Task) and a lightweight PRD template. But it assumed a single-product context. When you have multiple products — a web platform, a future mobile-native app, and eventually a game — you need a **product document hierarchy** that sits above the work item hierarchy.

*(See the "Document hierarchy pyramid" diagram above for the visual overview.)*

The four levels are:

- **Ecosystem level** — One vision document governing the entire product family
- **Product level** — Description, specification, and roadmap per product surface
- **Platform level** — Shared API contracts, schema, and cross-product dependency tracking
- **Work level** — Epics, stories, tasks, and feature-level PRDs (covered in the first report)

Each level serves a different purpose, a different audience, and changes at a different pace. The key principle: **each level governs the one below it, and changes flow downward while dependencies flow upward.**

---

## 2. Ecosystem vision — the umbrella document

### What it is

A single, short document (ideally one page) capturing the overarching purpose of the entire product family. It answers: *Why do all these products exist together?*

### What it should contain

- **Mission statement** — Why does the ecosystem exist?
- **Founding principles** — The non-negotiable values all products must embody
- **Shared universe concepts** — The cosmological foundations that create coherence across products (e.g., Three Worlds, the Whisp, the three founding questions)
- **Target audience** — At the broadest level, who is this for?
- **Wave model** — How the ecosystem unfolds over time (Wave 1 → 2 → 3+)

### Key characteristics

- Changes **rarely** — only through deliberate, locked decisions
- Acts as the "constitutional document" for all product decisions
- Every product-level document should trace back to this vision
- If a feature doesn't serve the ecosystem's founding questions, it needs justification

Geoffrey Moore's classic template works as a starting point:

> "For [target users], who [need], the [product family] is a [category] that [key benefit]. Unlike [alternatives], our products [differentiator]."

---

## 3. Product Description vs. Product Specification

This is the critical distinction. These are two different documents serving fundamentally different purposes.

*(See the "Product description vs specification" comparison diagram above.)*

### Product Description — the "what and why" document

**Purpose:** Outward-facing, vision-level. The document you'd hand to a collaborator, investor, Dreamineer, or new community member.

**What it answers:**

- What is this product?
- Who is it for?
- What problem does it solve?
- What makes it different?
- What can users do with it?
- What it intentionally does NOT do (boundaries)

**Key characteristics:**

- Relatively **stable** — changes when the product's identity changes, not when features ship
- Written in **accessible language** — no technical jargon
- Explicitly defines **boundaries** — what this product is NOT prevents scope creep and clarifies where sibling products pick up

**Suggested template:**

```markdown
# Product Description: [Product Name]
**Wave:** [1/2/3]  |  **Status:** [Active/Planned/Concept]  |  **Updated:** [date]

## Identity
One-paragraph elevator pitch.

## Target Users
Who specifically uses this product surface?

## Core Experience
What does using this product feel like?

## Key Capabilities (current)
What can users do today? (High-level, not feature-list.)

## Boundaries
What this product intentionally does NOT do.

## Relationship to Ecosystem
How does this connect to the shared universe and sibling products?

## Success Metrics
How do we know this product is working?
```

### Product Specification — the "how it works" document

**Purpose:** Inward-facing, build-level. For you-as-developer and for Claude Code.

**What it answers:**

- What's the complete feature inventory (shipped, in progress, planned)?
- How does the shared permission system manifest in this product?
- What are the UI/UX principles and patterns?
- What technical constraints apply (browsers, performance, accessibility)?
- Which platform APIs does this product consume?
- What non-functional requirements are product-specific?

**Key characteristics:**

- **Evolves with each release** — updated as features ship
- More **technical** than the Description
- Product-scoped (one per product), unlike PRDs which are feature-scoped

**Important distinction from PRDs:**

- A **PRD** is feature-scoped → one PRD per major feature (e.g., "Quiz Engine PRD")
- A **Product Spec** is product-scoped → one per product (e.g., "Ferd Specification")
- The Product Spec is the parent document that PRDs decompose from

**Suggested template:**

```markdown
# Product Specification: [Product Name]
**Version:** [semver]  |  **Updated:** [date]

## Product Overview
Brief summary (reference the Product Description for identity/vision).

## User Roles & Permissions
How the shared permission system manifests in this product.

## Feature Inventory
### Shipped (v0.x.x)
- Feature A: [brief description, link to PRD]
- Feature B: [brief description]
### In Progress
- Feature C: [status, link to current sprint/cycle]
### Planned
- Feature D: [maturity level, link to discovery backlog]

## UI/UX Principles
Design system, component library, interaction patterns.

## Technical Constraints
- Browser support targets
- Performance budgets (LCP, FID, CLS)
- Accessibility standards (WCAG level)

## API Dependencies
Which platform APIs does this product consume?

## Non-Functional Requirements
Security, performance, scalability specific to this product.

## Integration Points
How this product exchanges data with sibling products.
```

### The relationship between them

- Description flows **into** Specification
- Description = "why and what" → Specification operationalizes it into "how"
- Changes to the Description should trigger a review of the Specification
- The Specification should **never contradict** the Description's stated boundaries

---

## 4. Platform vs. Product — the split that matters

*(See the "Platform and product architecture" diagram above for the visual overview.)*

You've already made the key architectural decision: Hamn should require only a new client, no migrations. That decision implicitly creates a **platform layer** — the shared backend all products consume.

### What belongs to the platform (shared)

- Database schema
- API contracts
- Authentication system
- Permission model (groups, roles, Stewards)
- Core domain entities (Users, Groups, Journeys, Nodes, Beats)
- Supabase RLS policies
- Product-agnostic business logic

### What belongs to individual products (owned)

- UI components and design system
- Navigation patterns
- Rendering approach (SSR for Ferd, native for Hamn)
- Product-specific features (GPS for Hamn, AR for Hamn)
- Client-side state management

### Why this split needs its own documentation

Without explicit platform documentation, you risk two failure modes:

1. **Accidental coupling** — Building something in Ferd's codebase that should be a platform API, making it unavailable to Hamn without refactoring
2. **Invisible dependencies** — Changing a platform API without realizing it affects a sibling product's specification

Your existing `ARCHITECTURE_BASELINE.md` is already close to a Platform Specification — it may just need a "consumer products" column added to API documentation.

---

## 5. Portfolio roadmap — seeing the whole picture

### Why a single roadmap breaks down

Your current `ROADMAP.md` is a single-product roadmap for Ferd. That works today. But once Hamn enters even the planning phase, you need to see how work across products relates.

### The three-roadmap model

| Roadmap | Scope | Format | Example |
|---------|-------|--------|---------|
| **Ecosystem roadmap** | All products | NOW/NEXT/LATER by outcomes | "NOW: Ferd MVP. NEXT: Journey Designer. LATER: Hamn." |
| **Product roadmaps** | One per product | Epics and milestones | Your current ROADMAP.md = Ferd's product roadmap |
| **Platform roadmap** | Shared infrastructure | API contracts, migrations | Schema changes, auth enhancements |

### Two types of milestones

- **Ecosystem milestones** — When the overall vision advances: "First FIM completes a physical journey," "Hamn beta launch," "First community-created journey published"
- **Product milestones** — Internal delivery checkpoints: "Auth complete," "Group management shipped," "Journey Designer v1"

Ecosystem milestones create natural **synchronization points** where products must align.

---

## 6. Inter-product relationships

When products share a backend and a universe, you need to track how they relate. Key relationship types:

- **Shared data** — Ferd and Hamn share the same user profiles, group memberships, journey progress, and Whisp state. A change to the `users` table affects both products.
- **API dependencies** — Both products consume the same platform APIs. When Ferd needs a new endpoint, ask: "Will Hamn also need this?" If yes, design it as a platform API from day one.
- **Feature parity vs. divergence** — Some features should be identical across products (authentication, group management). Others should intentionally diverge (GPS journeys are Hamn-only). Document these explicitly in each Product Description's "Boundaries" section.
- **Data flow between products** — If a user starts a journey in Ferd and continues in Hamn, how does state transfer? This is a platform concern, not a product concern.
- **Cosmological coherence** — The Whisp manifests differently across the Three Worlds. Each product surface is a different "lens" on the same universe. Cosmological decisions must be validated against *all* product surfaces.

### Cross-product dependency table

Maintain this in your Platform Specification or a dedicated `DEPENDENCIES.md`:

```markdown
| Capability | Platform API | Ferd | Hamn | Game |
|-----------|-------------|------|------|------|
| Auth/login | /api/auth/* | ✅ Shipped | 🔮 Planned | 🔮 Planned |
| Groups | /api/groups/* | ✅ Shipped | 🔮 Will consume | — |
| Journey progress | /api/progress/* | 🔄 In progress | 🔮 Must support offline | — |
| GPS node arrival | /api/nodes/arrive | — | 🔮 Primary consumer | — |
| Whisp state | /api/whisp/* | 🔮 Companion voice | 🔮 Active instrument | 🔮 Full form |
```

This makes invisible dependencies visible at a glance.

---

## 7. Recommended folder structure

```
docs/
├── ecosystem/
│   └── VISION.md                    # Ecosystem vision, founding principles, wave model
├── products/
│   ├── ferd/
│   │   ├── DESCRIPTION.md           # What Ferd is, who it's for, boundaries
│   │   ├── SPECIFICATION.md         # Feature inventory, technical constraints
│   │   └── ROADMAP.md               # Ferd-specific roadmap
│   ├── hamn/
│   │   ├── DESCRIPTION.md           # What Hamn will be (concept doc for now)
│   │   └── ROADMAP.md               # Hamn roadmap (placeholder until Wave 2)
│   └── game/
│       └── DESCRIPTION.md           # High-level concept only
├── platform/
│   ├── SPECIFICATION.md             # Shared API contracts, schema, auth, RLS
│   ├── ROADMAP.md                   # Platform infrastructure roadmap
│   └── DEPENDENCIES.md             # Cross-product dependency table
├── planning/
│   ├── backlog.md                   # Product backlog (work items)
│   ├── prd-quiz-engine.md           # Feature-level PRDs
│   ├── DEFERRED_DECISIONS.md        # (existing)
│   └── sessions/                    # (existing) Journey Designer sessions
├── decisions/                       # ADRs (existing pattern)
└── research/                        # AI-generated research (existing pattern)
```

---

## 8. How this connects to the first research report

The first report's recommendations remain fully valid — they slot in at the right level:

| Concept from Report 1 | Where it fits |
|----------------------|---------------|
| Maturity pipeline (Concept → Study → Specify → Build) | Applies to work items within any product or the platform |
| Shaped Personal Kanban | Daily execution, product-agnostic |
| Definition of Ready | Add check: "Cross-product dependencies identified?" |
| Definition of Done | Add check: "Platform Spec updated if shared API changed?" |
| NOW/NEXT/LATER roadmap | Works at both ecosystem and individual product level |
| BDD/TDD | Applies at story level regardless of which product |
| PRD template | Feature-scoped, should reference parent Product Specification |

### What the first report missed

- **PRDs need a parent** — Each PRD should reference its parent Product Specification and note whether the feature is product-specific or platform-level
- **Backlog tagging** — Items should be tagged by product (Ferd, Hamn, Platform) so you can filter. A single backlog with product tags is simpler than separate backlogs until you have a team

---

## 9. What to do right now (and what to defer)

### Create immediately

1. **`docs/ecosystem/VISION.md`** — Distill the founding principles, Three Worlds, wave model, and founding questions into a one-page constitutional document
2. **`docs/old_products/ferd/DESCRIPTION.md`** — Consolidate the "what and why" from ROADMAP.md, ARCHITECTURE.md, and Journey Designer sessions
3. **`docs/platform/SPECIFICATION.md`** — Start documenting the API contracts that are mobile-ready

### Create when Hamn planning begins

4. **`docs/old_products/hamn/DESCRIPTION.md`** — Writing Hamn's Description forces clarity on Ferd's boundaries
5. **`docs/platform/DEPENDENCIES.md`** — Start with Ferd as the only consumer; add Hamn as "planned"

### Defer until complexity demands it

6. **Product-level roadmap split** — Current single ROADMAP.md works while Ferd is the only active product
7. **Formal Product Specifications** — Ferd's is partially captured in ARCHITECTURE.md and DOMAIN_ENTITIES.md already; formalize when the Journey Designer arc stabilizes

---

## Key takeaway

The first research report answered: *"How do I turn ideas into shipped code?"*

This companion answers: *"How do I keep multiple products coherent while sharing a platform?"*

The answer is a **document hierarchy that mirrors your architecture**:

- An **ecosystem vision** at the top
- **Product descriptions and specifications** in the middle
- A **platform specification** tracking shared infrastructure
- **Work items** at the bottom

For a solo developer, the important thing is not to create all these documents at once. Start with the ecosystem vision and one product description. Let the rest emerge as the complexity demands it — just as the first report advised: *"Start minimal, add only when you feel pain."*
