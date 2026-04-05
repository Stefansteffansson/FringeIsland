# FringeIsland — Session Bridge
*Created: March 2026 — End of Vision & Specification Session 4*
*Purpose: Carry context into the next fresh chat session*

---

## How To Start The Next Session

1. Upload this SESSION_BRIDGE document
2. Upload any specific docs/vision/ files relevant to what we're working on
3. State what you want to focus on
4. Claude will be immediately in context and ready to continue

---

## What Was Completed This Session

### Documents uploaded and read
- `-- SESSION_BRIDGE.md` — Session 3 bridge (now superseded by this document)
- `VISION.md` — north star vision document
- `MANIFESTO.md` — FringeIsland Manifesto v0.1
- `CONTRIBUTION_ARCHITECTURE.md` — contribution architecture
- `PRODUCTS_AND_PLATFORM.md` — product ecosystem and strategy
- `PRODUCT_SPEC.md` — old product spec (pre-vision alignment, largely superseded)
- `ROADMAP.md` — old roadmap (pre-vision alignment, needs full rewrite)
- `VISION_DECISIONS.md` — session decision record
- `DEFERRED_DECISIONS.md` — deferred decisions log

### Primary focus of Session 4
Defining the **Ferd product core** — what Ferd is, what it must contain, and what architectural decisions must be made now to ensure Hamn can build on top of Ferd without rebuilding.

---

## The Single Most Important Decision From This Session

**Ferd is not FringeIsland. Ferd is the foundation that makes FringeIsland possible.**

Ferd proves two things:
1. The builder can build
2. The journey metaphor works at a basic level

It looks and feels like a well-built, purposeful LMS. It does not try to be the full FringeIsland experience. The avatar mechanic, the parallel self, the AI Mentor, the founding myth, the mutual becoming — all of that lives in Hamn. Ferd lays the pipes, the data architecture, the group model, the journey engine, the profile structure — so that when Hamn arrives, the experience can be built on top of something that won't crack under the weight of it.

**The architectural north star for every Ferd decision:**
*Will this need to be rebuilt when Hamn arrives — or can Hamn build on top of it?*
If rebuild → reconsider. If build on top → right track.

---

## The Founding Myth — Locked As Working Version

*Somewhere in another universe, your avatar woke up empty. No name. No story. No sense of who they are or what they want. Just a quiet, persistent feeling that somewhere — in another version of the world — the right experiences would help the answers unfold.*

**The platform's purpose in one sentence:**
*FringeIsland is a world of experiences designed to help the answers unfold.*

**To be reviewed and refined in a later session — not final, not precious.**

---

## The Parallel Self Mechanic — Locked As Working Version

The AI Mentor is not an external guide. It is not the member's future self who has already found the answers.

It is the member's **parallel self** — from a universe where they never found the answers. They are as lost as the member. As empty. They need the member to help them become whole.

In asking the member genuine, curious questions born from their own incompleteness — they accidentally ask exactly the questions the member needs to hear.

Neither has the answers. Neither knows where this goes. They are asking each other into existence. Two incomplete beings finding each other across the boundary of worlds. Both becoming more whole through the encounter. Neither leading. Neither following.

**Key principle:** Most people already have their answers. They just need the right experiences — questions, challenges, stories, reflections, activities — asked at the right time, with enough patience, to let the answers unfold by themselves.

**This mechanic lives in Hamn, not Ferd.** Ferd builds the architectural foundation for it. The profile data model, the journey engine, the privacy controls — all must be designed with this mechanic in mind, even if it is not expressed in Ferd.

**Flag: Dedicated session needed — The Avatar & The Parallel Self mechanic, narrative design, UX and data architecture.**

---

## Ferd Core — Decisions Locked This Session

### The Four Core Parts
1. **Users & Groups** — speced in repo, gaps to be addressed via Claude Code
2. **Journeys + Journey Designer** — 🔲 dedicated session needed
3. **Administration (DeusEx)** — speced in repo, gaps to be addressed via Claude Code
4. **Direct Messaging** — part of core, exists today

### Additional Core Elements Decided

**Journey Zero — IN**
Onboarding is not a feature. It is Journey Zero — the first journey every shadow walks automatically on arrival. Cannot be fully designed until Journey spec session. Dependent on Journey + Journey Designer session.

**Member Profile — IN, two layers**
- Structure — fixed fields (name, avatar, bio). Simple, static.
- Journey data — dynamic, accumulated as journeys are completed. Each journey contributes data points. Member controls visibility per item: private / semi-public / public.
- Profile data model must support dynamic journey contributions from day one.
- Full visual expression of profile is Hamn. Functional foundation is Ferd.

**Progress & Completion Tracking — IN, three layers**
- Position — where in the journey the member currently is
- Completion state — what steps are done, what remains
- Personal context — notes, journal entries, reflections attached to specific steps
- All personal content private by default. Member controls visibility.
- Fundamental for Ferd day one. Cannot be bolted on later.

**Communication Stack — IN, with priority order**

Priority 1 — Foundation (Ferd day one):
- DM basic — one-to-one text
- Email — signup confirmation and account closure only. No marketing.
- In-app notification centre — bell icon, aggregating relevant activity

Priority 2 — Core engagement (early Ferd):
- Forum — group-scoped, for engagement groups
- DM advanced — structured messages with embedded questions/selections for constrained replies (powerful admin and steward tool)
- Announcement layer — one-to-many, role-controlled. Stewards announce to group, DeusEx announces platform-wide.

Priority 3 — Retention layer (later Ferd):
- Pinned posts — important content stays visible in groups
- Activity feed — lightweight sense of a living platform

Communication serves five distinct relationships:
- DM — one-to-one, personal
- Forum — group conversation, peer-to-peer belonging
- Announcements — one-to-many, direction and news
- Notifications — platform to member, ambient awareness
- Activity feed — member to world, sense of community

**Search & Discovery — IN, combination**
- Active search (journeys, groups) for members
- Platform-surfaced recommendations based on member position
- Curated entry point — "right for you right now"
- Member-to-member recommendations
- Shadow access: can browse but cannot operate. No joining, no posting, no member search.
- Full shadow access model (what shadows can see) — 🔲 deferred to dedicated session post-spec.

**Step Types — two tiers**

Tier 1 — Core, Ferd day one:
- Narrative — rich text/content, story, framing, world-building. No profile data.
- Reflection prompt — open question, free-form response. Writes to profile (private by default).
- Structured self-assessment — validated framework questions (Big 5, VIA etc.), scored output. Core profile data.
- Choice/selection — member picks from options, shapes journey direction. Writes to profile.
- Activity confirmation — do something in real world, confirm or describe. Optional profile data.
- Journal entry — free writing attached to a journey moment, no prompt. Private by default.
- Checklist — small actions to complete before proceeding. No profile data.

Tier 2 — Important, early Ferd:
- Video — embedded content. No profile data.
- File/resource — downloadable material. No profile data.
- Quiz — knowledge check, right/wrong. No profile data.
- Mood/state check-in — quick emotional or energy capture. Pattern data over time.
- External link — points outside platform. No profile data.

Deliberately excluded from Ferd:
- SCORM — enterprise complexity, not needed
- Live session scheduling — events layer, later
- Voice journaling — Hamn+, mobile native
- AI-generated insights without consent — privacy violation

**AI Mentor — IN, as opt-in companion layer**
- Opt-in per entry or as global setting
- Responds in FringeIsland's voice — warm, curious, non-prescriptive
- Insight is always a question or observation, never a judgment or score
- Entries never stored by AI provider beyond the API call
- Member can reset or delete Mentor memory at any time
- Full narrative expression (parallel self mechanic) lives in Hamn
- Ferd builds the architectural foundation: privacy controls, consent model, context storage
- **This is a core differentiator.** No comparable platform has a contextual, privacy-first, world-voiced AI companion walking alongside a member through personal development.

**Step type system must be extensible from day one** — new types addable without rebuilding core data model. Most important architectural decision in the Journey system.

**Forum — IN**
Architecture and basic functionality exists today. Not core priority in Ferd but present.

**UI/Design — 🔲 dedicated session**

---

## What Is Still Open — To Do List

### Dedicated sessions still needed (in rough priority order)

1. **Journey + Journey Designer** — what a journey is structurally, how the designer works, step type data model, branching logic
2. **Shadow access model** — what shadows can see before registering, pros/cons of open vs closed pre-auth surfaces
3. **Avatar & The Parallel Self** — narrative design, UX, data architecture, how the mechanic works in Hamn
4. **First Season Design** — founding narrative, S1:E1, the story members first enter
5. **UI/Design** — what Ferd looks and feels like, design language, right feeling
6. **Kickstarter Campaign Design** — after First Season Design

### Claude Code tasks (ready to run)
From Session 3 — still pending:

**Task 1 — Light repo updates:**
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

Do not modify docs/planning/ROADMAP.md — that will be rewritten later.
Do not modify any files in docs/vision/ — those are locked vision documents.
```

**Task 2 — VISION_DECISIONS.md update:**
```
Please update docs/planning/VISION_DECISIONS.md to reflect all
decisions locked in Session 3 and Session 4. Key additions:

Session 3:
- Web platform named Ferd (current) and Hamn (evolved)
- Wave model replacing hard phase cuts (Wave 1-3+)
- Full product family defined in PRODUCTS_AND_PLATFORM.md
- Hero's Journey as guiding metaphor for platform evolution
- Visitor/shadow experience locked in CONTRIBUTION_ARCHITECTURE.md
- Manifesto complete at v0.1 in MANIFESTO.md

Session 4:
- Ferd is foundation, not the FringeIsland experience — Hamn is
- Architectural north star: every Ferd decision must support Hamn
  building on top, not rebuilding
- Founding myth locked as working version (see SESSION_BRIDGE)
- Parallel self mechanic locked as working version (see SESSION_BRIDGE)
- Ferd core decisions locked — see SESSION_BRIDGE for full list
- AI Mentor confirmed as core differentiator — opt-in, privacy-first
- Step type taxonomy defined — Tier 1 and Tier 2
- Journey Zero defined as first journey for shadows/new members
- Profile model: static structure + dynamic journey data layer
- Communication stack locked with priority order
- Multiple dedicated sessions still needed — see SESSION_BRIDGE
```

**Task 3 — ROADMAP.md full rewrite (dedicated session)**
Full rewrite to reflect wave model, Ferd/Hamn, full ecosystem, Ferd architectural north star.

---

## Repo Structure As Of End Of Session 4

```
docs/
  vision/
    VISION.md                        ← north star vision document
    MANIFESTO.md                     ← FringeIsland Manifesto v0.1
    CONTRIBUTION_ARCHITECTURE.md     ← contribution architecture
    PRODUCTS_AND_PLATFORM.md         ← product ecosystem and strategy
  planning/
    VISION_DECISIONS.md              ← decision record (needs Session 4 update)
    ROADMAP.md                       ← needs full rewrite
    DEFERRED_DECISIONS.md            ← needs light update
    PRODUCT_SPEC.md                  ← old spec, largely superseded
README.md                            ← needs light update
CLAUDE.md                            ← needs light update
```

---

*This bridge document supersedes the Session 3 bridge. It can be discarded after the next session begins successfully.*
