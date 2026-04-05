# FringeIsland — Session Bridge
*Created: March 2026 — End of Vision & Specification Session 3*
*Purpose: Carry context into the next fresh chat session*

---

## What This Is

This document bridges the gap between sessions. Upload it at the start of the next chat session along with any relevant vision documents from docs/vision/ to restore full context immediately.

---

## What Was Completed This Session

### New Documents Created (all in docs/vision/)
- **VISION.md** — the north star vision document ✅
- **MANIFESTO.md** — the FringeIsland Manifesto v0.1 ✅
- **CONTRIBUTION_ARCHITECTURE.md** — high-level contribution architecture ✅
- **PRODUCTS_AND_PLATFORM.md** — full product ecosystem and platform strategy ✅

### Key Decisions Locked This Session

**Web Platform Naming:**
- **Ferd** — the current web platform PoC. Departure point. Journey foundation, groups, Stewards. What exists now.
- **Hamn** — the evolved FringeIsland experience platform. Where members truly arrive. Launches with native iOS and Android apps.
- Future releases named when they arrive — not before.

**Phase Model — Waves Not Steps:**
- Wave 1: Ferd — prove the ground is solid
- Wave 2: Hamn — the island comes alive
- Wave 3: The World Expands — AR, physical, Summit, Foundation
- Wave 3+: The Game — Unreal Engine, three realms at full fidelity
- Phases overlap and run in parallel — not hard sequential cuts

**Product Family (five expressions):**
1. Web platform — permanent deep work hub
2. Native iOS and Android — on-the-go companion
3. AR layer — world bleeding into physical reality
4. Physical products — world artefacts, printed materials, merchandise
5. The Game — desktop, console, mobile, VR/AR

**Events (part of ecosystem):**
- Online seasonal events
- Regional gatherings
- Training camps and getaways
- Annual FringeIsland Summit

**Device Strategy:**
- 18–29: smartphone first, native apps non-negotiable
- Dreamineers: laptop/desktop for deep work, mobile for light content
- 30–50: balanced smartphone and laptop
- 50+: tablet significant, larger screens preferred
- Phase 3+: console and VR/AR headsets

**Hero's Journey as guiding metaphor:**
- The platform's evolution mirrors the member's journey
- Ferd (Departure) → Hamn (Harbour) → future releases follow the arc
- Not a finite naming series — just the spirit of the arc

**Visitor/Shadow experience (locked in Contribution Architecture):**
- Visitors move through FringeIsland like shadows — present but not yet arrived
- Can glimpse their garden door but not open it
- Registration is gentle and optional
- Everything from visitor session carries over on registration
- Four contributor groups: Visitor → Member → Dreamineer → Council/Foundation

**The Manifesto (11 principles, 4 clusters):**

*What we believe about human beings:*
- Story over data
- Curiosity over certainty
- Lived experience over passive consumption

*How we believe growth happens:*
- Personal growth over performance
- Safe experimentation over fear of failure
- Direction over rigid destination

*How we treat each other:*
- Mutual respect over judgment of others
- Belonging over fitting in

*How the movement operates:*
- Member privacy over commercial opportunity
- Open contribution over closed gatekeeping
- Community ownership over corporate control

---

## What Is Still Open

**Exploration sessions still to do (in order):**
1. **First Season Design** — the founding narrative, S1:E1, the story members first enter. Needs fresh mind and dedicated time.
2. **Kickstarter Campaign Design** — after First Season Design is complete

**Roadmap rewrite — dedicated next session:**
- Current ROADMAP.md is outdated — written for old PoC thinking
- Needs full rewrite to reflect wave model, Ferd/Hamn, full ecosystem
- Claude Code prompt ready — see below

---

## Pending Claude Code Tasks

### Task 1 — Lighter updates (ready to run now)
```
A new document has been added to the repo:
- docs/vision/PRODUCTS_AND_PLATFORM.md

Please update the following files to reference this new document:

1. README.md — add PRODUCTS_AND_PLATFORM.md to the docs/vision/ section
2. docs/planning/DEFERRED_DECISIONS.md — add a note that platform 
   strategy, native mobile apps, physical products, events and the 
   game are addressed at a high level in PRODUCTS_AND_PLATFORM.md
3. CLAUDE.md — add a reference to PRODUCTS_AND_PLATFORM.md in the 
   docs section

Do not modify docs/planning/ROADMAP.md — that will be rewritten in 
a dedicated session.
Do not modify any files in docs/vision/ — those are locked vision documents.
```

### Task 2 — VISION_DECISIONS.md update (ready to run now)
```
Please update docs/planning/VISION_DECISIONS.md to reflect all 
decisions locked in Session 3. Key additions:

- Web platform named Ferd (current) and Hamn (evolved)
- Wave model replacing hard phase cuts (Wave 1-3+)
- Full product family defined in PRODUCTS_AND_PLATFORM.md
- Hero's Journey as guiding metaphor for platform evolution
- Visitor/shadow experience locked in CONTRIBUTION_ARCHITECTURE.md
- Manifesto complete at v0.1 in MANIFESTO.md
- First Season Design and Kickstarter Campaign Design still to do
- Roadmap rewrite scheduled as dedicated next session
```

### Task 3 — Roadmap rewrite (next dedicated session)
Full rewrite of docs/planning/ROADMAP.md to reflect:
- Wave model (Wave 1: Ferd, Wave 2: Hamn, Wave 3, Wave 3+)
- Full product ecosystem
- Ferd technical milestones preserved under Wave 1
- Non-software products and events included
- Hero's Journey arc as the guiding narrative

---

## Repo Structure As Of End Of Session 3

```
docs/
  vision/
    VISION.md                        ← north star vision document
    MANIFESTO.md                     ← FringeIsland Manifesto v0.1
    CONTRIBUTION_ARCHITECTURE.md     ← contribution architecture
    PRODUCTS_AND_PLATFORM.md         ← product ecosystem and strategy
  planning/
    VISION_DECISIONS.md              ← decision record (needs update)
    ROADMAP.md                       ← needs full rewrite next session
    DEFERRED_DECISIONS.md            ← needs light update
README.md                            ← needs light update
CLAUDE.md                            ← needs light update
```

---

## How To Start The Next Session

1. Upload this SESSION-BRIDGE document
2. Upload any specific docs/vision/ files relevant to what we're working on
3. State what you want to focus on — roadmap rewrite, First Season Design, or something else
4. Claude will be immediately in context and ready to continue

---

*This bridge document can be discarded after the next session begins successfully.*
