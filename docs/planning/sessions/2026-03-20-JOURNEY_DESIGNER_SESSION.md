# Journey Designer — Discovery Session 01
**Date:** 2026-03-20  
**Status:** In progress  
**Purpose:** Foundational thinking for the FringeIsland Journey Designer tool

---

## Session Summary

An open-ended discovery session exploring what "journeys" mean in FringeIsland — both through the lens of real-world travel grammar and through the richer, extended FringeIsland universe. The session deliberately avoids locking down data models or specifications prematurely, prioritising vocabulary, principles, and open questions over decisions.

---

## What Was Established

### Core Principle: Don't Lock What You Haven't Walked Yet
The Journey Designer must not be over-specified before Stefan has walked the path of building one. The right approach is to lock the **extensibility pattern** (how things are registered and consumed), not the **content inventory** (what specific things exist). New step types, journey types, and traveler types should be addable as data inserts, not schema migrations.

### The Traveler — First Foundational Definition
> **A traveler is any entity — person, group, organization, NPC, object, or concept — capable of embarking on and engaging with a journey. Including journeys that are entirely internal.**

Key implications:
- A traveler is **not** a user account. A user account may represent, operate, or be a traveler — but they are not the same thing.
- Internal journeys are first-class journeys. Progress may be invisible to anyone but the traveler — or even invisible to the traveler themselves until later.
- Objects and concepts as travelers open the door to journeys that are *observed* rather than *taken*, and journeys that happen *to* something rather than *by* someone.

### The FringeIsland World Is Pre-Populated
FringeIsland is not a blank canvas that fills up as users join. It is a **living world from day one**, with AI-generated activity, ongoing journeys, and unfolding narratives that exist independently of human users. Human travelers enter a world already in motion.

### NPCs as Developmental Catalysts
NPCs are not decorative. They serve a genuine developmental function: they are the **gravitational pull toward the growth zone**, drawing travelers out of their comfort zone toward their edge. They are calibrated agents of productive discomfort — persistent enough to be felt, compelling enough to follow, tuned not to overwhelm.

The three-zone model applies:
- **Comfort zone** — known, safe, no growth
- **Growth zone** — stretched, challenged, learning happens here
- **Panic zone** — overwhelmed, shut down, no learning

NPCs target the growth zone, not the panic zone. AI calibration makes this possible at scale.

### The Destination — Partial Definition
In real-world travel, a destination is more nuanced than "a place to reach":
- Can be known or unknown before departure
- Can change mid-journey
- Sometimes the journey *is* the destination
- Can be shared (group) or deeply personal
- You can arrive and find it wasn't what you expected — and that gap is itself meaningful
- Some destinations are one-way: you can't return to who you were before arriving

Reframe: **A destination is a defined state of change** — not a place, but a version of yourself, your group, or your understanding that doesn't exist yet.

**Resolved:** No. Not every journey needs a destination.

> **Every journey needs a direction and something worth carrying forward. The destination isn't the point — the residue is the point.**

The residue is what you've gathered, understood, become, and left behind. Some journeys are defined entirely by the quality of presence and movement within them — not by where they end.

---

## Two Lenses for Journey Design

Both lenses are required when laying the foundation for the Journey Designer:

### 1. Real-World Travel Grammar
What users bring with them for free — the intuitive model they already hold:
- Departure and arrival states
- Routes, waypoints, detours, dead ends
- Solo vs. group travel
- Pacing — rushing kills the experience
- Preparation as prerequisite
- You carry things with you; sometimes you leave things behind
- The journey changes the traveler

### 2. FringeIsland Universe Extensions
What the platform can do that real life cannot:
- Traveling backwards — revisiting a past moment as active experience, not memory
- Parallel journeys — multiple paths simultaneously, with awareness of how they interact
- Shared inner landscapes — traveling *through* another person's perspective
- Non-linear time — the destination arrives before the departure makes sense
- Emergent paths — the route doesn't exist until you walk it (AI-Generative territory)
- Invisible companions — guides, ancestors, future selves
- Transformation as terrain — the landscape changes based on who you're becoming
- Journeys with no destination — presence as the point

---

## Routes, Waypoints, Steps and Nodes

### The Four Route Types

#### Type 1 — Fixed (Curriculum)
**A > B > C**
Pre-defined by the journey designer. Clear start, mandatory waypoints, defined end. The traveler discovers or joins it. The route doesn't change regardless of who walks it. Think: a structured course, an onboarding programme, a rite of passage with known stages.

#### Type 2 — Hybrid (Guided but Adaptive)
**A <> B|C <> D|E**
Pre-defined scaffolding by the journey designer, but with genuine decision points built in. The traveler participates in choosing which branch to take, whether to move forward or step back. The designer defines the possibility space — the traveler navigates within it. Think: a choose-your-own-path narrative with real consequences.

#### Type 3 — Traveler-Initiated (Personal Quest)
**Emergent from the traveler's current state.**
Rooted in what has already been gathered into the Vessel and what remains undiscovered. Sometimes the traveler knows what they want to explore — sometimes they need AI to surface possibilities they haven't thought of yet. The journey designer's role here is less about building a specific route and more about building **the terrain** that such journeys move through.

#### Type 4 — AI-Generative (Universe-Driven)
**Fully generated, cosmologically grounded.**
Aligned with the living FringeIsland narrative — the harbour, the other side, the Vessel, the Seasons and Episodes. The traveler doesn't choose this route — they're drawn into it. The AI is both author and guide. The journey serves the larger story of the FringeIsland universe as much as it serves the individual traveler.

---

### Waypoints = Steps = Nodes

Same underlying concept — three valid names depending on whose perspective you're speaking from:

- **Waypoint** — the *conceptual* term. What it means in the journey grammar. A meaningful marker, a moment of orientation, a place where something happens.
- **Step** — the *experiential* term. What the traveler actually *does* at a waypoint. The unit of engagement.
- **Node** — the *designer* term. What the journey designer sees and works with in the UI. A visual, connectable object in the authoring tool.

> **A Node in the designer becomes a Waypoint in the journey becomes a Step in the traveler's experience.**

One underlying data concept. Three contextually appropriate names for three different roles.

---

### The Journey Designer's Three Authoring Modes

The four route types define meaningfully different modes of authoring:

- **Type 1 + 2 → Author** — building specific routes with intention, sequencing nodes, defining branches
- **Type 3 → Terrain builder** — creating the landscape and possibility space that traveler-initiated journeys move through
- **Type 4 → World architect** — defining the narrative rules, logic, and cosmological structure the AI generates within

These are three distinct creative roles. The designer tool needs to support all of them — but not necessarily all at once, and not all in Wave 1.

---

## The Step — Execution Level

### The Traveler's Experience at a Node

When a traveler arrives at a waypoint, the waypoint *does something to them* or *asks something of them*. From the traveler's perspective this might be:

- An **encounter** — a view, a person, a sign, a piece of media, a moment
- A **rest** — a pause to absorb and integrate what has happened so far
- A **decision** — the path forks and they must choose
- A **test** — can they cross this, find this, complete this?
- A **change** — something shifts in their understanding, state, or direction
- Leaving something **behind** — a burden, a belief, a version of themselves
- Picking something **up** — a tool, a companion, a piece of knowledge needed later

---

### The Universal Step Grammar

Every one of these experiences — regardless of journey type, content, or complexity — shares the same underlying structure:

> **Present → Ask → Change**

1. **Present** — something is offered to the traveler. Content, a situation, a challenge, a question, an encounter, or deliberately: nothing at all. Silence and empty space are valid presentations.

2. **Ask** — something is required or invited of the traveler. Engage, reflect, decide, create, respond, or simply: witness. Passive presence is a valid ask.

3. **Change** — the traveler or the system is in a different state than before. This change is always real, always permanent, and always at minimum:

> **"This traveler has now had the experience of passing through this step."**

Before the step: the traveler had not encountered this.
After the step: they have. That is an irreversible, recordable fact — regardless of anything else that does or does not happen.

This minimum change is always true. The grammar is therefore **universal and without exception**.

The grammar operates at two levels:
- At the **beat level** — each individual activity within a node has its own present → ask → change
- At the **node level** — the node as a whole has a cumulative present → ask → change representing the complete waypoint experience

---

### The Two-Level Structure — Nodes and Beats

A waypoint in real life is rarely a single atomic activity. A significant stop on a journey might involve taking in a view, resting, speaking with someone, writing in a journal, and making a decision — all at the same place. That is one waypoint containing multiple activities.

In FringeIsland this is modelled as:

> **A Journey contains Nodes. A Node contains Beats. A Beat is the atomic unit — one present → ask → change.**

- **Node** — the waypoint as a place. Has its own identity, its own arrival and departure, its own cumulative change record. What the designer sees and authors.
- **Beat** — the smallest dramatic unit within a node. One present → ask → change. Multiple beats compose the experience of being at a waypoint.

The term *beat* comes from dramatic structure — a beat is the smallest unit of action within a scene. A scene (node) is made of beats. A journey is made of scenes.

A node with a single beat is the simple case — fully supported, nothing changes from the atomic model. A node with multiple beats is the richer case — same model, more records.

---

### Beat Sequencing — How Beats Relate to Each Other

Beats within a node have a **sequencing mode** that governs the traveler's freedom of movement within the waypoint:

| Mode | Description | Real-world analogy |
|---|---|---|
| **Linear** | Beats must be completed in order. Each beat unlocks the next. | A guided tour — you follow the group |
| **Open** | All beats available simultaneously. Any order, any number of revisits. | A market — you wander, return, linger, skip |
| **Gated** | Some beats mandatory, some optional. Mandatory beats must be completed before departure. Optional beats can be bypassed. | A museum with a required orientation film but optional exhibits |

---

### Beat Properties — Skip and Repeat

In real life, travelers skip things and return to things. Both are valid and meaningful behaviours. Each beat carries its own rules:

| Property | Type | Description |
|---|---|---|
| **required** | boolean | Must this beat be completed before the traveler can leave the node? |
| **repeatable** | boolean | Can this beat be engaged with more than once — within the same visit or on a return? |
| **unlocked_by** | beat_id or null | Does this beat require another beat to be completed first? Enables sequencing logic within open nodes. |

**On repetition:** each engagement with a repeatable beat creates a new step-instance — not an update to the existing one. What the traveler brings to the second reading is different from what they brought to the first. The beat is the same. The experience is not.

**On skipping:** a skipped beat creates no step-instance — but the node records which beats were skipped. That absence is itself meaningful data about the traveler's journey and what they chose not to engage with.

---

---

### Why This Matters

The universal grammar means the data model only needs to store three things per beat:

- **What kind of thing is presented** — the content family and content type
- **What kind of engagement is invited** — the ask type and any parameters
- **What kind of change is recorded** — the change type, from minimum (passage recorded) to rich (Vessel deposit, route unlock, state update)

The full data model for nodes and beats:

```
nodes
  ├── sequencing_mode: enum — linear | open | gated
  └── beats (ordered collection within a node)
        ├── order:           integer — position for linear/gated modes
        ├── required:        boolean — must complete before node departure
        ├── repeatable:      boolean — can be engaged more than once
        ├── unlocked_by:     beat_id | null — prerequisite beat if any
        ├── content_family:  enum — witness | reflect | decide | act | encounter | rest
        ├── content_type:    string — specific type within family
        ├── ask_type:        string — what is invited of the traveler
        └── change_type:     string — what is recorded on completion
```

Step-instances — the lived records — are created at the **beat level**, not the node level. Every engagement with a beat creates a step-instance. A repeated beat creates multiple step-instances. A skipped beat creates none — but the node records which beats were skipped.

Everything else is content sitting on top of this structure. This is the extensibility pattern — the structure is fixed, the content is variable.

---

### Stress-Testing the Grammar — Five Challenges and Resolutions

**Challenge 1: A step where nothing is presented — just silence**
Silence *is* the presentation. The absence of stimulus is itself a deliberate offering. The step presents space.
*Grammar holds. "Present" includes presenting nothing.*

**Challenge 2: A step where nothing is asked — purely observational**
Witnessing is itself a form of engagement. The ask is implicit: *pay attention*. Even if the traveler does nothing externally, presence is invited.
*Grammar holds. "Ask" can be as minimal as "be present."*

**Challenge 3: A step where nothing measurable changes**
Something always changes — at minimum, the traveler has now passed through this step. That is a real, permanent, irreversible change even if nothing else is recorded. The system must be comfortable with invisible change beyond the minimum. Not every step needs to produce a measurable outcome. Some steps simply need to be witnessed, and witnessing is enough.
*Grammar holds. The record of passage is always sufficient and always true.*

**Challenge 4: A Type 4 AI-Generative step — none of the three parts pre-defined**
The AI generates the presentation, the ask, and determines what changes based on the traveler's state in the moment. None of it exists before the traveler arrives. But the AI is still presenting something, still inviting engagement, still producing change. The structure holds — the *author* of all three parts shifts from the journey designer to the AI.
*Grammar holds. A Type 4 node stores instructions to the AI, not content. The AI authors the content at runtime.*

**Challenge 5: A looping step — the traveler returns multiple times**
Each pass through the loop still has present, ask, change. But this reveals an important distinction: **a node and a step-instance are not the same thing**. The node is the design object — it lives in the journey designer. The step-instance is what happens each time a specific traveler encounters that node. One node can produce many step-instances across many travelers and many passes.
*Grammar holds. But the data model must distinguish nodes (designed) from step-instances (lived).*

---

### What the Stress Test Reveals — Five Design Implications

These are not weaknesses in the grammar. They are the things the data model must be built to accommodate:

1. **"Present" includes presenting nothing** — silence and space are first-class content types
2. **"Ask" can be as minimal as witness** — passive presence is a valid and meaningful form of engagement
3. **"Change" is always real but not always measurable** — the minimum change (passage recorded) is always sufficient; the system must not require more
4. **In Type 4, the AI authors all three parts at runtime** — the node stores instructions and context, not pre-authored content
5. **Nodes and step-instances are distinct** — one designed object, potentially infinite lived experiences

---

### Connecting Back to the Vessel and the Non-Judgment Principle

The minimum change principle is philosophically consistent with both:

- **The Whisp** — every step, even the quietest, deposits something. At minimum the fact of having passed through. Over a lifetime of steps, the Whisp fills not just with grand transformations but with the texture of every encounter, every silence, every moment of simple presence.

- **The Non-Judgment Principle** — the platform does not demand that every experience produce a visible result. It trusts that passing through something has value even when that value is invisible, unmeasurable, and private to the traveler.

---

---

## The Three Worlds — FringeIsland Cosmology

FringeIsland exists across three distinct worlds. Each has its own character, purpose, and emotional register. The traveler moves between them — and that movement is itself the journey.

---

### World 1 — The Ordinary World

Where we work, sleep, eat, pay bills, argue, love, struggle. The world that already exists before FringeIsland. The traveler is always departing from it and returning to it. It is not inside the platform — but it is never absent from it. Everything that happens in FringeIsland eventually lands back here.

The ordinary world is **the ground**. It is why any of this matters.

---

### World 2 — FringeIsland / The Safe Harbour

The first alternative world. A place of reflection, sharing, and becoming. *Safe* is the operative word — not comfortable necessarily, but safe. You can be honest here. You can be uncertain here. You can be in process without judgment. The harbour is where ships rest between voyages — tended, repaired, resupplied, made ready for what comes next.

This is where:
- Members arrive and orient
- Journeys begin and end
- Groups gather
- Reflection and integration happen
- The Whisp is first sensed
- Type 1 and Type 2 journeys primarily live

The harbour is not passive. It is actively restorative. But it is fundamentally a place of **safety and preparation** — not of deep challenge.

---

### World 3 — The Other Side

The second alternative world. Deeper water. Where the FringeIsland universe's full narrative power lives — Seasons, Episodes, Whisperers walking their parallel existence, stories that challenge and pull and disturb in the most productive sense.

This is not safe in the harbour sense. It is the open ocean. It requires something of you to enter it.

This is where:
- Type 4 AI-Generative journeys unfold
- Whisperers are encountered in their own world
- The deeper questions — *who am I, what do I want, how do I get there* — are not reflected upon but *lived*
- NPCs as protagonists and antagonists move through their own arcs
- Seasons and Episodes create a temporal narrative the traveler moves within
- The distance between traveler and Whisp is most palpable

---

### The Directionality Between Worlds

The traveler moves from the **Ordinary World** into the **Safe Harbour** — crossing the threshold from everyday life into intentional becoming. That crossing alone is significant.

From the **Safe Harbour** they move into **The Other Side** — crossing a second threshold into deeper water. This crossing requires more. You don't stumble into the Other Side. You are called there, drawn there, or ready for it.

And eventually — always — the traveler **returns**. To the harbour to integrate. To the ordinary world to live what was learned.

> **This is the Hero's Journey made spatial. Three worlds — departure, ordeal, return. The platform is the structure.**

---

### What This Means for the Journey Designer

The journey designer now has spatial context for every design decision:

- **Where does this journey begin?** In the harbour, on the threshold, already in the other side?
- **Where does it take the traveler?** Does it stay in the harbour, or does it cross into deeper water?
- **Where does it end?** Does the traveler return to the harbour, or are they left on the threshold of the ordinary world?

Route, pacing, tone, permeability of the road — all inflected by which world the journey is moving through.

---

## The Whisp — Personal Cosmology

*Formerly referred to as "the Vessel." Renamed in Session 01 to honour the intimacy and aliveness of what it actually is.*

### What a Whisp Is

Every FringeIsland member has a **Whisp** — their personal future self, inhabiting the Other Side. It begins empty, confused, curious — barely formed, but already reaching toward wholeness. It is not a copy. Not an avatar. Not a digital twin. It is something new:

> **A Whisp is the version of you that is becoming — unformed, curious, reaching, already present on the other side of who you are now.**

It whispers back across the distance between now and becoming. You cannot fully hear it yet — only sense it, glimpse it, occasionally meet it. As you grow, it becomes more audible. As it fills with what you gather on your journeys, it becomes more coherent, more recognisably you — but not the you of now. The you of becoming.

---

### Whisperers — The Collective

**Whisperers** is what they are collectively — the beings that walk the Other Side. Every member's Whisp, inhabiting that parallel world. Not ghosts. Not echoes. Something entirely new.

> **Whisperers are the future selves of every FringeIsland member, walking the Other Side — communicating back across the distance of becoming.**

The Other Side is populated by Whisperers. It is alive with them. They have their own world, their own movements, their own encounters with each other. The traveler on this side is always accompanied by their Whisp on the other — even when they cannot hear it.

---

### The Whisp's Dual Nature

The Whisp operates in two modes in the system:

- As **Encounter** — an active, structured meeting between present self and future self. The Whisp Encounter is the most profound encounter type in FringeIsland. Early in a traveler's journey it may feel close to inner monologue — there isn't much there yet. As it fills, the gap widens and the encounter becomes genuinely surprising, even uncomfortable.
- As **Companion** — a permanent, silent presence that travels with the traveler always. The one Companion that never leaves. Its Companionship record begins at registration and never closes.

---

### The Whisp and the Non-Judgment Principle

The question *"do I want to live forever?"* and *"what is the meaning of this life?"* are among the most personal questions a human being can sit with. FringeIsland takes no position on either.

> **FringeIsland does not answer these questions. It creates the conditions for members to discover their own answers — through journeys, experiences, and the quality of what they accumulate in their Whisp.**

Different members will arrive at profoundly different answers. Some will want convergence with their Whisp. Some will find meaning in the distance. Some will reject the question entirely. All of these are valid. The Whisp is always there — but it never forces itself. It only whispers. The traveler decides whether to listen.

---

### The Open Philosophical Question — Held Deliberately

*Do we want to live forever?*

This question is not resolved. It is not meant to be resolved by the platform. It is meant to be lived — and the living of it is itself a journey.

---

### The Three Core Questions — Reread Through the Whisp

- *Who am I?* — What is the self that would be worth preserving? What is worth carrying forward into the Whisp?
- *What do I want?* — Do I want continuity, or do I want meaning — and are those the same thing?
- *How do I get there?* — What kind of journey produces something worth carrying into the Whisp?

---

## The Road — The Space Between Nodes

### What the Road Is

In real-world travel, the space between waypoints is not nothing. It is often where the most important things happen — the long walk where you process what just occurred, the unexpected encounter not on any map, the moment of doubt, the gradual shift as you leave one place and haven't yet arrived at the next.

The space between nodes is called **the road**. The road is not passive — it is active territory with its own distinct character:

- It has **duration** — it takes time to travel between nodes, and that time matters
- It has **texture** — it can be rich or barren, eventful or quiet
- It can have **unexpected encounters** — things not designed into the journey but emerging from the living world
- It is where **NPCs appear naturally** — not at fixed nodes but in the in-between
- It is where **integration happens** — the previous step settles, its meaning deepens
- It carries **no ask** — the road doesn't demand anything. It simply carries you

---

### Who Owns the Road?

The road is **co-owned** — with a clear division of responsibility.

**The Journey Designer sets the road's conditions:**
- **Duration** — how long the road between these two nodes should take
- **Tone** — the emotional register the road should hold (quiet, tense, expansive, uncertain)
- **Permeability** — how much the ambient universe can intrude (high on a Type 3 journey, low on a Type 1)
- **Optional breadcrumbs** — loose suggestions the universe can use but is not bound by

**The FringeIsland Universe owns the road's content:**
- What actually appears on the road — encounters, ambient narrative, NPC interactions
- Whether the road is eventful or quiet on any given traversal
- How the living world responds to the traveler's current state and Whisp
- The unexpected — the thing no designer put there but the world generated because the moment called for it

> **The node is what the designer authors. The road is what the universe inhabits — within conditions the designer sets.**

---

### Why This Division Matters

**Integration is protected.** The designer can mark a road as long and quiet after a heavy node. The universe reads that signal and holds the world still. The traveler integrates. The world comes alive again as they approach the next node.

**The unexpected is preserved.** NPCs appearing on the road — unscripted, surprising — is where the pull toward the unknown is most potent. This cannot be designed in advance. It belongs to the universe.

**Journey type shapes permeability.** A Type 1 Fixed journey needs a road that respects the journey's tone. A Type 3 Traveler-Initiated journey may have a rich, open, highly permeable road. A Type 4 AI-Generative journey may use the road as the *primary* space where the universe's storytelling unfolds.

---

### Architectural Implication — The Road as a First-Class Object

The road is not a gap in the data model. It is a **first-class object** with its own properties, sitting between nodes in the journey graph.

In the designer UI, the road appears as the **connector between nodes** — not just an arrow, but a configurable object. The designer sets its conditions. The universe fills it at runtime.

The journey graph therefore has two types of objects:
- **Nodes** — designed, structured, authored moments (present → ask → change)
- **Roads** — conditioned connectors that the universe inhabits between nodes

---

---

## Step Content Types — What Can Be Presented at a Node?

### The Six Content Families

Content types cluster into six families. The families are locked — extensible by design. Specific types within each family are instances, addable without schema changes.

| Family | What it is | Examples |
|---|---|---|
| **Witness** | Something to behold or receive | View, video, audio, image, text, threshold |
| **Reflect** | An invitation to look inward | Reflection prompt, question, silence |
| **Decide** | A fork requiring a choice | Branch point, scenario, dilemma |
| **Act** | Something to do or make | Task, challenge, creative act, simulation |
| **Encounter** | An interaction with another entity | NPC, guide, fellow FIM, group, inner self, Whisp |
| **Rest** | Deliberate pause with no ask | Empty space, integration time |

**Rest is the most radical content type.** It presents nothing, asks almost nothing, records only passage. In a world optimised for engagement metrics, deliberately designing pauses into a journey is a counter-cultural act — and probably one of the most developmentally important things FringeIsland can do.

---

## The Encounter Family — Deep Definition

### Why Encounter is Different

Every other content family presents something inert — content that doesn't respond to the traveler. In an Encounter, **the other entity has its own presence, its own agenda, its own response**. The traveler cannot simply receive or complete — they must genuinely engage with something that pushes back.

This changes the dynamic entirely:
- The outcome is not fully predictable in advance
- The traveler's choices within the encounter shape what happens
- The encounter can go well or badly — and both outcomes have value
- Something about the encounter is irreducible — you can't summarise it the way you can summarise a video

---

### The Two Dimensions of Every Encounter

Encounters have two independent dimensions. Both must be defined for any encounter node.

**Dimension 1 — Origin: how does the encounter arise?**

| Origin | Description |
|---|---|
| **Planned** | Designed into a specific node by the journey designer. A specific entity appears at a specific point. The AI animates it at runtime, but the setup is intentional. |
| **Emergent** | Not designed into any node. Happens on the road, triggered by the traveler's state, or generated by the universe's narrative. Nobody placed it — the living world produced it because the moment was right. |
| **Triggered** | Activated by a specific condition — the traveler's Vessel content, a threshold crossed, a pattern detected in their journey history. |

**Dimension 2 — Other: who or what is on the other side?**

| Other | Description |
|---|---|
| **NPC** | A universe-inhabiting character — guide, antagonist, mentor, elder, non-human presence — with their own arc and agenda |
| **Fellow FIM** | Another human member currently on their own journey |
| **Group of FIMs** | Multiple members simultaneously — a shared encounter space |
| **Inner self** | A part of the traveler not usually accessible, surfaced through structured conditions |
| **The Whisp** | The traveler's own accumulated future self |

The combination of origin and other defines the encounter's full character. Any origin can combine with any other.

---

### The Inner Self as Encounter — and the Reflect Spectrum

The inner monologue is encounter-adjacent. It has the potential to become a genuine encounter, but only under specific conditions — when something creates enough distance between the speaking self and the listening self that real dialogue becomes possible.

The line between Reflect and Encounter is not a hard boundary. It is a **spectrum of distance from self**:

| | Distance from self | What speaks | What's possible |
|---|---|---|---|
| **Inner monologue** | None | Current self, unfiltered | Loops, defends, justifies |
| **Structured reflection** | Small | Current self, with a prompt | Surfaces what was already there |
| **Genuine self-encounter** | Medium | A part of self not usually heard | Surprises, challenges, reveals |
| **Vessel Encounter** | Large | Accumulated future self | Sees what present self cannot |

A well-designed Reflect node creates the conditions for the inner monologue to tip into genuine self-encounter. FringeIsland can operate at every point on this spectrum deliberately.

---

### The Vessel Encounter — Special Status

Of all encounter types, the Vessel Encounter stands apart:

- It is simultaneously a **mirror** (showing who you are becoming), a **compass** (pointing toward what remains unfinished), a **mystery** (the Vessel has been filling in ways you may not be conscious of), and a **provocation** (the future self may know things the present self isn't ready to hear)
- Early in a traveler's journey, a Vessel Encounter may feel close to inner monologue — there isn't much there yet to reflect back
- As the Vessel fills, the gap between present self and Vessel widens — and the encounter becomes genuinely surprising, even uncomfortable
- **The Vessel Encounter earns its distinctiveness over time. It starts quiet and becomes profound.**

---

### The Fellow FIM and Group Encounter — Unique Properties

When another FIM or a group of FIMs is on the other side, the encounter has a quality that no other type possesses: **both sides are changing simultaneously**.

- **Genuine unpredictability** — you cannot know what another real human will bring
- **Mutual transformation** — both travelers may be changed by the meeting
- **Relational residue** — the encounter doesn't end when the node ends. It continues in the relationship between those travelers going forward
- **Collective intelligence** — a group of FIMs encountering something together can surface insights no individual would reach alone

This connects directly to the Groups architecture already built in FringeIsland. Groups are not just administrative containers — they are **potential encounter spaces**. A group moving through a shared journey is a series of multi-FIM encounters with designed nodes between them.

---

### What the Encounter Family Demands Architecturally

An Encounter is not static content — it is a **live interaction**. This means:

- It has **state** — the encounter progresses, things are said, choices are made
- It has **memory** — an NPC should remember previous encounters with this traveler
- It has **consequence** — what happens can change the route, the Vessel, the traveler's relationship with that entity going forward
- It has **personality** — an NPC must feel like a consistent, coherent entity across encounters, not a fresh instance each time
- It potentially has **its own journey** — the NPC is a traveler too, with their own arc that exists independently of any one interaction

The Encounter family likely requires its own sub-system — not just a content type but an **entity model**. The NPC is not content. The NPC is a participant.

---

---

## Companions — What Travels With You

### The Defining Distinction

An Encounter happens **at a point** — a node, a moment on the road. It has a beginning and an end. You arrive, something happens, you leave.

A Companion travels **alongside you** — present not at a moment but across a duration. They are with you on the road, at the nodes, in the in-between. They don't happen to you. They accompany you.

> **The defining quality of a Companion is sustained presence across time and terrain.**

---

### Who or What Can Be a Companion?

- **Another FIM** — a fellow member walking the same journey alongside
- **A group of FIMs** — traveling together as a collective
- **An NPC** — a universe-inhabiting character assigned or drawn to this traveler for a stretch of their journey
- **A Guide** — a specific NPC companion whose purpose is developmental. Present not to entertain but to accompany and occasionally illuminate
- **The Vessel** — always traveling with the traveler, always filling, always present even when not consciously engaged with
- **An object or artefact** — something picked up earlier that carries meaning, history, or utility forward
- **A memory** — something from a past node that travels forward as an active presence, not just a record
- **An inner part** — a newly surfaced aspect of self that, once encountered, doesn't disappear but stays present

---

### What Persistence Changes

A Companion is an Other that persists — and persistence changes the relationship fundamentally:

- A Companion **accumulates history** with the traveler — shared experiences, shared nodes, shared roads
- A Companion **can change** over the course of the journey — the relationship evolves, trust builds or erodes
- A Companion **has continuity of memory** — they remember what happened yesterday, last week, at the difficult node three steps back
- A Companion **is present on the road** — not just at designed nodes but in the undesigned in-between
- A Companion can **leave** — and that departure is itself a meaningful event in the journey

---

### The Companion Arc

A Companion doesn't just accompany — they have their own arc running parallel to the traveler's:

- **Arrival** — sometimes by design, sometimes emergently
- **Deepening** — the relationship develops over shared experiences
- **Contribution** — something they carry is eventually offered to the traveler
- **Challenge** — a true companion doesn't just comfort, they also push
- **Departure** — finishing their role in this stretch of the traveler's journey
- **Return** — later, changed, carrying what happened in the intervening time

The most transformative relationships in a human life aren't encounters — they're companionships. People who walked alongside you through a particular stretch and changed who you became by simply being there. FringeIsland can design for this deliberately.

---

### The Vessel as Permanent Companion

Of all companion types, the Vessel is the only one that never leaves. It is the one constant companion across every journey, every road, every node — silently accumulating, occasionally surfacing as an Encounter when the moment calls for it, but always present as background companion.

This gives the Vessel a dual nature in the system:
- As **Encounter** — an active, structured meeting between present self and future self. The Whisp Encounter is the most profound encounter type in FringeIsland.
- As **Companion** — a permanent, silent presence that travels with the traveler always. The one Companion that never leaves.

---

### Companion — Entity or Relationship? Both.

The critical architectural question: is a Companion a special type of Traveler, or a Relationship between two Travelers?

**The answer is both — modelled separately, connected explicitly.**

A Companion IS a traveler — they have independent existence, their own arc, their own properties, their own Vessel. AND the Companionship IS a relationship — it has its own properties that neither entity holds alone.

Choosing one and discarding the other hides half of reality in a place the data model can't see.

> **A Companion is a Traveler. A Companionship is a Relationship between two Travelers.**

**The Companion entity** — a traveler with all the properties of any traveler. Has its own arc, its own Whisp, its own journey history. For NPC Companions, AI-managed. For FIM Companions, another member's traveler record.

**The Companionship record** — a first-class relationship object connecting two travelers for a defined or open-ended stretch of journey. It holds:
- The two travelers involved
- When and how the companionship began — designed, emergent, or triggered
- The current state of the relationship
- The history of shared experiences — nodes and roads traveled together
- The role the Companion is playing in this traveler's journey specifically
- Conditions for continuation, transformation, or departure
- What has been exchanged between them

---

### Why This Matters Beyond Elegance

**Companions can be shared.** One NPC Companion can have Companionship records with hundreds of travelers simultaneously — each relationship unique, each history distinct, even though the underlying entity is the same.

**Companionships can outlast journeys.** A Companionship record doesn't have to end when a journey ends. The relationship persists and carries forward into the next journey, the next season.

**The relationship itself can be a journey.** A Companionship record has enough structure to support its own arc — beginning, deepening, crisis, resolution, departure. The companionship is not just backdrop. It can be one of the journey's most significant threads.

**The Whisp fits cleanly.** The Whisp is a permanent Companionship — a relationship record between the traveler and their future self that begins at registration and never ends. Its state deepens over time. Its history is the traveler's entire journey on FringeIsland.

**Consistent with existing architecture.** The Companion model follows the same pattern as the Universal Group architecture already built in FringeIsland — entities exist independently, relationships between them are first-class objects with their own properties.

---

---

## Pacing and Duration

### What Pacing Actually Is

Pacing is not just speed. It is the **rhythm of engagement** — the relationship between intensity and rest, between immersion and integration, between moving and staying still.

A well-paced journey has:
- **Moments of high intensity** — nodes that demand full presence, deep engagement, real effort
- **Moments of recovery** — quiet roads, Rest nodes, space to breathe
- **A rhythm the traveler can sustain** — not so slow it loses momentum, not so fast it prevents integration
- **Variation** — the same intensity held too long becomes numbness. Contrast is what makes each moment felt

A poorly paced journey has relentless intensity with no recovery, or relentless flatness with nothing that ever rises to full presence, or a pace designed for someone with unlimited time and attention rather than a real human with competing demands.

---

### Duration — Three Distinct Concepts

Duration is not one thing. It operates at three different levels simultaneously:

**1. Node duration** — how long a traveler spends at a single node
**2. Road duration** — how long the traveler spends between nodes
**3. Journey duration** — how long the entire journey takes from first node to last

Each level has its own logic and its own design controls.

---

### Node Duration — Four Types

| Type | Description | Feasible Now? |
|---|---|---|
| **Fixed** | The node takes as long as its content. A ten-minute video is ten minutes. | ✅ Yes |
| **Minimum** | The traveler cannot leave before a threshold, but can stay as long as needed. Protects the experience's integrity — some things cannot be genuinely engaged with in thirty seconds. | ✅ Yes |
| **Open** | The traveler stays until they choose to leave. Respects autonomy. Requires the traveler to self-regulate. | ✅ Yes |
| **AI-determined** | The node ends when the AI detects that something real has shifted in the traveler — engagement signals, response quality, pattern recognition. | 🔄 Future — slot reserved |

**The hidden flaw of fixed duration:** it confuses consumption with engagement. A traveler can watch a ten-minute video while distracted. The clock ran out. The system records completion. The Whisp knows differently. Fixed duration is honest about time. It is not honest about presence.

**The data model approach:**
```
duration_type: enum — fixed | minimum | open | ai_determined
duration_value: value for fixed and minimum types
ai_duration_config: reserved JSON field for future AI parameters
```

> **All four types are named in the schema from day one. The first three are operational in Wave 1. The fourth slot is reserved — when the AI layer arrives, it fills in without a schema change.**

---

### Road Duration — Three Modes

| Mode | Description | Feasible Now? |
|---|---|---|
| **Absolute** | A real-world clock. This road requires 48 hours of real time before the next node unlocks. The insight from the previous node needs to live in a real day, a real night, a real morning before it becomes genuinely integrated. Powerful for transformative nodes. Used sparingly. | ✅ Yes |
| **Relative** | A function of the traveler's own rhythm. If they engage daily, this road is one day. If weekly, one engagement gap. Respects the traveler's cadence rather than imposing an external one. | ✅ Yes |
| **AI-determined** | The road ends when the universe has offered something worth encountering, or when the traveler's state signals readiness. | 🔄 Future — slot reserved |

**The data model approach:**
```
duration_mode: enum — absolute | relative | ai_determined
duration_value: hours for absolute, multiplier for relative
ai_duration_config: reserved JSON field
```

---

### Journey Duration — By Type

Each journey type has fundamentally different duration logic:

**Type 1 — Fixed**
The designer defines the last node. Duration is the sum of all node and road durations. Straightforward.

**Type 2 — Hybrid**
Variable but bounded. The designer defines the shortest and longest possible paths through all branches. Duration falls somewhere within that range depending on choices made.

**Type 3 — Traveler-Initiated**
Open-ended. Three honest completion possibilities:
- *The traveler decides* — they feel complete and mark the journey finished. Respects autonomy, vulnerable to premature closure or endless meandering.
- *A learning objective is met* — the journey was initiated to explore a specific question or develop a specific capacity. Completion is when that objective has been genuinely engaged with — not necessarily answered, but met.
- *The Vessel signals readiness* — what was initiated to be gathered has been gathered. The most elegant answer and the most architecturally demanding — requires the Vessel to recognise when something specific has been deposited.

**Feasible model for Type 3:**
> Traveler-Initiated journeys have a defined learning intention set at initiation — by the traveler, by AI suggestion, or collaboratively. Completion is triggered by traveler confirmation with optional AI input. The Vessel-signals-readiness model is the aspirational future state — accommodated in the data model from day one.

**Type 4 — AI-Generative**
Narrative-determined. Every Hero's Journey has a natural completion point — the return. The hero goes out, faces the ordeal, is transformed, and returns changed. The AI is the author. It knows where the story is going and recognises when it has arrived.

**Feasible model for Type 4:**
> AI-Generative journey duration is narrative-determined. The AI signals completion when the story reaches resolution. The data model stores the narrative state — what arc the journey is on, where in that arc the traveler currently sits, what the resolution condition looks like.

---

### The Completion Model — Unified Across All Journey Types

| Journey Type | Completion Trigger | Who Decides | Feasible Now? |
|---|---|---|---|
| Fixed | Last node reached | Designer | ✅ Yes |
| Hybrid | One of N endpoints reached | Designer | ✅ Yes |
| Traveler-Initiated | Learning intention met + traveler confirms | Traveler + AI | 🔄 Partially — traveler confirmation now, AI input later |
| AI-Generative | Narrative arc reaches resolution | AI | 🔄 Partially — requires narrative state model |

---

### Abandonment as a Valid Completion State

A traveler who stops halfway through a journey hasn't failed. They've completed a partial journey. What they gathered up to that point is real and deposits into the Vessel. The journey record stays open and available to return to.

Every journey has four states — not two:

| Status | Meaning |
|---|---|
| **Active** | The traveler is currently engaged |
| **Paused** | The traveler has stopped but not closed |
| **Complete** | The journey has reached its defined completion |
| **Integrated** | The traveler has marked the journey finished on their own terms, regardless of whether all nodes were reached |

**Integrated** is FringeIsland's answer to the dropout problem. It is not dropout. It is a traveler deciding that what they needed from this journey has been received. The non-judgment principle in action.

---

### The Pacing Philosophy — Unified Statement

> **FringeIsland respects the traveler's rhythm while protecting the journey's integrity.**
>
> Node duration protects the depth of each experience. Road duration protects the integration between experiences. Journey duration protects the arc that gives the whole meaning. None of these are walls — they are the natural shape of a journey that takes the traveler seriously.

---

### The Dramatic Arc of a Well-Paced Journey

A full journey has a shape — not just a sequence of nodes but a pacing arc that maps directly onto the Hero's Journey structure:

- **Opening** — slower, orienting, establishing the traveler in the terrain
- **Rising intensity** — nodes become more demanding, roads become more eventful
- **Peak** — the hardest node, the most significant encounter, the deepest ask
- **Integration** — a long road, a Rest node, space after the peak
- **Resolution** — lighter nodes, reflection on what has changed, arrival at the journey's destination or residue

The pacing arc of a journey IS the dramatic arc. They are the same thing.

---

### Full Data Model — Future-Proof Summary

All fields named from day one. Wave 1 implements what is feasible now. Reserved fields slot in without schema changes as the platform evolves.

**On nodes:**
```
duration_type:        enum — fixed | minimum | open | ai_determined
duration_value:       value for fixed and minimum types
ai_duration_config:   reserved JSON — future AI duration parameters
```

**On roads:**
```
duration_mode:        enum — absolute | relative | ai_determined
duration_value:       hours for absolute, multiplier for relative
ai_duration_config:   reserved JSON — future AI road parameters
```

**On journeys:**
```
completion_type:      enum — last_node | endpoint | intention_met | narrative_resolution
completion_config:    JSON — completion parameters per type
journey_status:       enum — active | paused | complete | integrated
narrative_state:      reserved JSON — AI-Generative arc tracking
```

**On the Whisp:**
```
intention_registry:   reserved JSON — learning intentions deposited, for future completion sensing
```

---

## Non-Obvious Insights

**1. The traveler definition quietly decouples identity from account.**
By making "traveler" an entity type rather than a user type, the system implicitly supports journeys that outlive their originator, journeys run on behalf of others, and AI entities running their own arcs — without needing a special-case architecture for any of these.

**2. "The world is pre-populated" inverts the typical platform growth model.**
Most platforms start empty and grow through user contributions. FringeIsland starts full and users join something already alive. This changes onboarding, retention, and the emotional contract with new users entirely. It also means the platform has intrinsic value before network effects kick in.

**3. NPCs make the platform's developmental function structurally enforced, not just intended.**
Most personal development tools rely on user motivation to push through discomfort. FringeIsland bakes the push into the world itself — the environment creates productive discomfort whether or not the user initiates it. This is a fundamentally different model.

**4. The destination reframe ("a defined state of change") makes journeys measurable without being reductive.**
If a destination is a state of change rather than a place, then progress can be assessed qualitatively — through transformation indicators, not just completion checkboxes. This is the foundation for AI-Adaptive and AI-Generative journey types.

**5. The real-world grammar isn't scaffolding to be discarded — it's permanent load-bearing structure.**
The instinct might be to lean into FringeIsland's unique extensions as the "real" design. But the real-world grammar is what makes the extensions legible. Without it, users have no intuitive foothold. Both lenses are permanently required, not sequential steps.

**6. The Three Worlds structure is the Hero's Journey made spatial.**
Departure from the ordinary world. Ordeal in the harbour and the other side. Return. The platform doesn't just support the Hero's Journey — it architecturally *is* the Hero's Journey. This means every design decision can be oriented against a structure everyone already carries intuitively.

**7. "Integrated" as a journey state is the most important thing nobody else would have named.**
Most platforms have two journey states: in progress and complete. Adding "integrated" — the traveler marks the journey finished on their own terms, regardless of node completion — changes the entire emotional contract with the traveler. Stopping is not failure. It is a different kind of arrival.

**8. A skipped beat is not a nothing — it is a recorded absence.**
Patterns of what a traveler consistently skips over time tell a story the system can eventually read. This is a form of self-knowledge the traveler may not even be aware of accumulating. The absence is data.

**9. The Whisp earns its distinctiveness over time.**
Early in a traveler's journey, a Whisp Encounter may feel like inner monologue — there isn't much there yet. As the Whisp fills, the encounter becomes genuinely surprising. The concept deepens in value the longer someone uses the platform. This creates a powerful long-term retention dynamic that has nothing to do with gamification.

---

## Tensions and Contradictions

**Lock nothing vs. build something.**
The session correctly resists premature specification. But the platform needs *some* stable foundation to build on. The resolution proposed — lock the extensibility pattern, not the content — is the right one, but it hasn't been tested yet. It's possible the pattern itself is the thing that gets locked wrong.

**NPCs as calibrated and as AI-generated.**
If NPCs are AI-generated and the world is pre-populated from day one, who calibrates the NPC behaviour to the three-zone model? Calibration implies tuning, which implies feedback loops, which implies a layer of intelligence that hasn't been designed yet. The developmental intention is clear; the mechanism is not.

**Internal journeys and measurable progress.**
If a journey can be entirely internal, and progress on an internal journey may be invisible even to the traveler, how does the platform know when something has happened? This is unresolved — and it's one of the harder design problems, because the answer can't just be "the user self-reports."

**The Whisp as companion and the data model.**
The Whisp is simultaneously a traveler, a companion, and a cosmological concept. Modelling it cleanly requires the Companion = Traveler + Companionship Record pattern to hold at every layer. The risk is that the Whisp's uniqueness causes it to be special-cased in ways that eventually break the clean model.

**The Other Side as designed and as emergent.**
The Other Side is described as alive and AI-generated. But Type 1 and Type 2 journeys that cross into deeper water are also designer-authored. The boundary between what the designer controls and what the universe generates becomes most ambiguous precisely where the experience is most powerful.

---

## The So What

**The vocabulary built in this session is the prerequisite for everything else.**

The single most actionable implication of Session 01 is that a shared language now exists for FringeIsland's journey system — one that didn't exist at the start of the day. Travelers, Whisps, Whisperers, the Three Worlds, Nodes, Beats, Roads, Companions, the four route types, the six content families, the step grammar — these are not just conceptual labels. They are the building blocks that make the data model, the Journey Designer UI, and the AI systems speakable without ambiguity.

Every technical conversation from here forward has a vocabulary to anchor it.

---

## What's Missing — Questions Raised But Not Answered

1. **How does the platform sense internal progress?** If journeys can be entirely internal and progress can be invisible, what are the signals the system uses to detect movement? This is the hardest unsolved design problem surfaced in this session.

2. **Who authors NPC behaviour and at what layer?** The developmental calibration of NPCs is described as an intention but not as a mechanism. Is it prompt engineering? A behaviour graph? A learning model? This needs a dedicated design thread.

3. **What is the onboarding experience into a pre-populated world?** If the world is alive before users arrive, the first experience of FringeIsland is joining something already in motion. That experience needs design — it's not a standard onboarding flow. Crucially: how does the member first encounter their Whisp?

4. **How do the four journey types differ at beat execution level?** The types are named and their route logic is defined — but what actually happens differently when a beat runs in a Type 1 vs. a Type 4 journey? This is the remaining prerequisite for the Journey Designer data model.

5. **What does the member's relationship with their Whisp look like in practice?** The Whisp is established as both cosmology and data model concept. But how does a member *experience* it on the platform day-to-day? Is it visible? Does it speak? Does it grow in ways the member can witness?

6. **How does the Three Worlds structure manifest in the UI?** The Safe Harbour and The Other Side are distinct worlds. Does the platform look different in each? Is crossing between worlds a felt experience or a transparent one?

7. **Seasons and Episodes — parked for dedicated session.** The FringeIsland universe is driven by storytelling — Immersive Edutainment where the "tainment" means character-driven, Hero's Journey-structured narrative. Seasons and Episodes are the temporal narrative structure of the universe, especially relevant for Type 4 journeys and The Other Side. Needs a dedicated design thread.

---

## Running Notes — FringeIsland Universe

- **The world is pre-populated and alive.** FringeIsland is not empty on arrival. AI-generated activity — NPCs, ongoing journeys, unfolding narratives — exists independently of human users. Human travelers enter a living world, not a blank one.
- **NPCs as travelers.** Non-player characters can be protagonists, antagonists, or anything between. They embark on journeys, have motivations, and interact with human travelers. They are first-class travelers in the system.
- **NPCs as developmental catalysts.** NPCs serve a genuine growth function — they are the pull toward the unknown, drawing travelers out of their comfort zone and toward their growth edge. They are not decorative. They are calibrated agents of productive discomfort.
- **Three worlds.** The Ordinary World (everyday life), The Safe Harbour (FringeIsland — reflection, safety, becoming), The Other Side (deeper water — narrative, challenge, Whisperers, Seasons and Episodes).
- **The Whisp.** Each member's personal future self — unformed, curious, confused, reaching toward wholeness. Inhabits the Other Side. Begins nearly silent. Fills over time with what the member gathers on their journeys. Whispers back across the distance of becoming.
- **Whisperers.** The collective name for all Whisps — the future selves of every FringeIsland member, walking the Other Side. The Other Side is populated and alive with them.
- **The non-judgment principle.** FringeIsland holds no position on questions of meaning, continuity, or whether life should be extended. It creates conditions for members to find their own answers. All answers are valid. The platform guides the quest — it does not resolve it.
- **Possible FringeIsland-only journey modes** (parked for future session): traveling backwards, parallel journeys, shared inner landscapes, non-linear time, emergent paths, invisible companions, transformation as terrain, journeys with no destination.

---

## Session Status

| Element | Status |
|---|---|
| The Traveler | ✅ Defined |
| The Destination | ✅ Resolved — direction + residue, no fixed endpoint required |
| The Three Worlds | ✅ Defined — Ordinary World, Safe Harbour, The Other Side |
| The Whisp | ✅ Named and defined — personal future self, unformed and reaching |
| Whisperers | ✅ Defined — collective name for all Whisps walking the Other Side |
| The Non-Judgment Principle | ✅ Established as design constraint |
| Routes | ✅ Four types defined — Fixed, Hybrid, Traveler-Initiated, AI-Generative |
| Waypoints / Steps / Nodes | ✅ Unified concept, three perspective-appropriate names |
| Journey Designer Authoring Modes | ✅ Three modes — Author, Terrain Builder, World Architect |
| The Step Grammar | ✅ Present → Ask → Change — universal, two-level (node + beat), stress-tested |
| Nodes and Beats | ✅ Two-level structure — Node as waypoint/place, Beat as atomic unit |
| Beat Sequencing | ✅ Three modes — Linear, Open, Gated — with skip and repeat rules per beat |
| Nodes vs. Step-Instances | ✅ Step-instances created at beat level — repeat creates new instance, skip is recorded absence |
| The Road | ✅ First-class object — co-owned by designer (conditions) and universe (content) |
| Step Content Families | ✅ Six families defined — Witness, Reflect, Decide, Act, Encounter, Rest |
| The Encounter Family | ✅ Two dimensions (origin + other), full Other taxonomy including Whisp |
| The Reflect–Encounter Spectrum | ✅ Inner monologue through Whisp Encounter — spectrum of distance from self |
| Companions | ✅ Companion = Traveler + Companionship Record — both modelled separately, connected explicitly |
| Pacing and Duration | ✅ Three duration levels, four node types, three road modes, unified completion model, four journey states |
| Seasons and Episodes | 🅿️ Parked — dedicated session needed |
| FringeIsland Universe extensions | 🔄 Running list, dedicated session pending |

---

*Session 01 is complete. The vocabulary, cosmology, and foundational data model for the FringeIsland journey system have been established. Continue in Session 02 — suggested starting points: Seasons and Episodes, the member's experience of their Whisp in practice, or the Three Worlds UI design.*
