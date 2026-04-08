# FringeIsland — Session Progress Record
*Last updated: March 2026 — Session 1*

---

## PURPOSE OF THIS DOCUMENT

This document records all decisions, locked conclusions and open questions from the initial vision and specification sessions for FringeIsland. It serves as the foundation for the full Vision, Project Specification and Roadmap document to be written in a future session.

---

## WHAT WE ARE BUILDING — THE CORE CONCEPT

FringeIsland is an **Immersive Edutainment** experience — a movement and platform that creates an imaginary alternative world running parallel to everyday life. It is:

- **Immersive** — an alternative reality world with its own narrative, characters, locations and rules
- **Educational** — grounded in research-based personal development frameworks
- **Entertainment** — experienced as story-driven seasons and episodes, alone and with others
- **A movement** — not a product; an open, collaborative, community-owned ecosystem

The tagline concept: *"An island in the fringe of our ordinary world — where people gain new experiences in an environment where it's safe to fail, always with the possibility to try again."*

The SFM vision (Swedish origin): *"En värld med friska vindar och varma ljuspunkter"*
Translation: *"A world of fresh winds and warm points of light"*

The SFM mission: *"To equip people, groups, organisations and communities with the best tools and capabilities to live, grow and matter — in a balanced and harmonious way."*

Core human questions that drive everything:
1. **Who am I?**
2. **What do I want?**
3. **How do I get there?**

---

## TARGET AUDIENCE — LOCKED ✓

- **Primary:** Young adults, 18+ with no upper age limit
- **Life stages served:**
  - 18–30 — primary explorers, self-discovery, identity formation, early adulthood navigation
  - 30–50 — growth, leadership, purpose, balancing inner and outer worlds
  - 50+ — re-emergence, wisdom-sharing, content creation, mentorship, community building
- **The 50+ demographic is explicitly welcomed** as contributors, mentors, lore-keepers and content creators — not just experience consumers
- The through-line for ALL ages: *"Who am I? What do I want? How do I get there?"* — at different life stages and depths
- Previous focus on "Hacking Youth" (under 18) is **retired** — replaced by "young adults" framing

---

## THE RED THREAD — LOCKED ✓

**"The Journey from Empty to Whole"**

Every member arrives on FringeIsland as an undefined soul. Their avatar begins completely empty — no identity, no character, no story. Through narrative, challenge, reflection and connection, the avatar gradually becomes a **mirror of the user's true self**.

### The Three Instruments:
- **Who am I?** — Research-based tools: Big 5/OCEAN, VIA (Values in Action), Culture Map, and similar validated psychological frameworks
- **What do I want?** — Purpose, values and vision discovery tools
- **How do I get there?** — Skills, habits, relationships and pathway tools

### Avatar Privacy Model — LOCKED ✓
- **Private by default** — avatar's inner journey, home/garden, self-discovery progress
- **Selectively shared** — member chooses what to reveal, to whom, and when (individuals or specific groups)
- **Transparently shared** — special opt-in groups where members agree to greater openness (accountability circles, growth cohorts, mastermind groups)
- Sharing is **always voluntary** and **never coerced**

### The World Structure:
- Three realms: **Earth**, **Fringe Island**, **"The Other Side"**
- Narrative runs in **Seasons and Episodes** (S1:E1, S1:E2... S2:E1 etc.)
- Story has **A-Plot, B-Story and Sub-plots**
- Members co-create and shape the narrative trajectory through their engagement
- Inspired by: Matrix, Inception, Westworld, Limitless, Under the Dome

---

## THE ECOSYSTEM — KEY PRINCIPLES

FringeIsland is **not a product — it is a movement with an ecosystem.** The web platform is one node in a broader universe that includes:

- A game / games
- Physical representations of FI worlds
- iOS and Android native apps (wave TBD — pending redistribution)
- Physical meetups, training camps, getaways
- 3D printed physical representations of member homes, gardens, avatars, items
- AR/mixed reality layer blending digital and physical worlds
- Plugins, skins, extensions, add-ons (marketplace)
- Community-created content, events, IRL gatherings

### The Dreamineer Roles:
- **Makers** — content creators (narratives, worlds, challenges, media, episodes)
- **Weavers** — experience architects who stitch content into coherent end-to-end journeys
- Together: **Dreamineers** — the living creative organism that keeps FringeIsland evolving

### Engagement Spectrum:
Members can engage anywhere on this spectrum:
- "Homebody" — tends inner garden, builds home, never ventures far into the narrative world
- "Explorer" — deep in narrative arcs, seasons, episodes, quests
- Everything in between — all paths are valid, all lead to personal growth

---

## GOVERNANCE MODEL — LOCKED ✓

**Three-Layer Structure:**

### Layer 1 — The FringeIsland Foundation
- Legal form: Non-profit *stichting* (Dutch) or equivalent
- Guardian of: core values, red thread, manifesto, brand, IP
- Lean, permanent, uncapturable — cannot be bought or sold
- Inspired by: Blender Foundation, Godot Foundation, Wikimedia Foundation

### Layer 2 — The Dreamineer Council
- Meritocratic body of trusted Makers and Weavers
- Govern narrative direction, season/episode approval, experience quality
- Membership is **earned through contribution**, not appointed
- Inspired by: Apache meritocracy, Godot area maintainers

### Layer 3 — The Open Community
- All members, contributors, plugin builders, event organisers, physical product makers
- Free to contribute within the values framework
- The best rise naturally into Layer 2 over time
- Inspired by: Wikipedia volunteer model, Linux contributor community

---

## IP & LICENSING MODEL — LOCKED ✓

**Three-layer licensing structure, marketplace-ready from day one:**

### Layer A — Platform Core (web platform code)
- Licence: **MIT or Apache 2.0**
- Fully open, anyone can contribute and audit
- No commercial restriction
- Builds maximum developer trust

### Layer B — Community Experience Content
*(narrative episodes, world-building, tools, frameworks, learning content)*
- Licence: **CC BY-SA + CLA (Contributor Licence Agreement)**
- Free to share and remix with attribution
- Share-alike required (derivatives carry same licence)
- **NC clause deliberately excluded** to future-proof the marketplace
- Commercial marketplace use enabled through transparent CLA
- CLA terms: contributor keeps copyright, grants Foundation marketplace rights, revenue sharing transparent from day one (creator % + Foundation %)

### Layer C — Physical Products, Add-ons, 3D Items, Plugins
- Licence: **Commercial marketplace licence**
- Creator sets price
- FringeIsland Foundation takes platform percentage
- Creator keeps the rest
- Similar model to: Blender Market, Unreal Engine Marketplace

### Key Principle:
*"Open the tools, protect the soul."* Code is free. Content flows openly. Identity, values and experience integrity are guarded — not for commercial reasons, but to protect members and the movement.

---

## PLATFORM STRATEGY — LOCKED ✓

**Three-phase approach:**

### Wave 1 (Ferd) — Now (Web Platform as Hub)
- Web platform handles: identity, profiles, home gardens, groups, journey browsing, community forums, contribution tools
- Optimised as a **PWA (Progressive Web App)** for basic mobile access
- **Discord used temporarily** as community campfire scaffold — explicitly a temporary scaffold, not the permanent home
- Tech stack: Next.js 16.1, TypeScript, Tailwind CSS, Supabase/PostgreSQL (already in progress at v0.2.7)

### Post-Ferd — Near Term (wave TBD — pending redistribution)
- Camera access for **basic AR experiments** (location-based, QR-triggered world moments)
- **Push notifications** for episode drops and narrative events
- **Offline access** to journey content
- Discord retired — all community moves into the owned FringeIsland platform

### Wave TBD — When Validated (Native Apps)
- Full **native iOS and Android apps** for complete AR/mixed reality experience
- Built with validated knowledge of what the AR layer needs
- Native apps become the **primary experience layer**
- Web platform remains the permanent **hub for deep work**, contribution and desktop-first activities (plugin development, complex narrative creation, profile/garden detailed work, community check-ins)

---

## OPEN QUESTIONS — STILL TO DISCUSS

The following questions were identified during session but not yet fully answered:

### Q6 — Contribution Architecture (NEXT UP)
How should the platform be open for contributions — plugins, additions, skins, extensions? What kinds of things should contributors be able to build? What is off-limits — parts of the core that only the Foundation and Dreamineer Council can touch?

### Q7 — Target Audience (refined)
Who specifically are the intended members beyond "18+"? Are there specific personas, entry points or communities FringeIsland will target first?

### Q8 — Specific Experience Types
Are there specific experience types, worlds or initial narrative experiments already envisioned for the first seasons?

### Q9 — The Base Story / Red Thread Detail
What is the founding narrative in more detail? What is the core conflict, mystery or driving force of Season 1?

### Q10 — Business Model & Sustainability
How does FringeIsland sustain itself financially? What is the revenue model across phases? (Crowdfunding, memberships, marketplace revenue share, grants, donations, events?)

---

## BACKGROUND RESEARCH COMPLETED

The following reference organisations were studied in depth for governance, licensing and platform strategy learnings:
- Blender Foundation
- Godot Foundation
- Wikimedia / Wikipedia
- Apache Software Foundation
- Linux Foundation
- Mozilla Foundation
- Creative Commons

Key open source governance models understood:
- Benevolent Founder Model
- Foundation + Operating Entity Split
- Meritocracy Model
- Stewardship + Community Co-governance Model

---

## THE WEB PLATFORM — CURRENT STATE

> **Note:** This is a historical snapshot from Session 1 (January 26, 2026). Current state: v0.2.37, Wave 1 (Ferd) ~95% complete. See `PROJECT_STATUS.md` for live status.

- **Version:** v0.2.7 (as of January 26, 2026)
- **Wave:** 1.3 complete, 70% through Wave 1 (Ferd)
- **Tech Stack:** Next.js 16.1, TypeScript, Tailwind CSS, Supabase/PostgreSQL
- **Database:** 13 tables, 8 migrations, Row Level Security policies
- **Completed features:** Authentication, user profiles with avatar upload, group management (create/edit/invite/roles), navigation bar, modal systems
- **Current default landing:** /groups
- **Next milestone:** Wave 1, Ferd 1.4 — Journey System (catalog, browsing, search, filtering, enrollment)
- **Repository:** GitHub — Stefansteffansson/FringeIsland

---

## NEXT SESSION AGENDA

1. Answer Q6 — Contribution architecture (plugins, skins, extensions)
2. Answer remaining open questions (Q7–Q10)
3. Begin drafting the full Vision, Project Specification and Roadmap document in Markdown

---

*This document will be updated after each session until the full specification document is complete.*
