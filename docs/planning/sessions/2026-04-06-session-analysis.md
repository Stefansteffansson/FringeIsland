# Session Analysis — 2026-04-06
# Roadmap Design, Documentation Restructuring & Wave Architecture

**Session type:** Planning / Architecture
**Duration:** Extended single session
**Analyst:** Claude Sonnet 4.6

---

## 1. Non-Obvious Insights

*(Things not stated explicitly — inferred from the conversation arc)*

**1.1 The naming system is load-bearing, not decorative**
The decision to use Old Norse maritime names (Ferd, Eid, Hamn, Heim, Brim, Urd) isn't aesthetic branding. The names encode the *emotional logic* of the journey arc — departure, passage, harbour, home, horizon, the deep well. This means the wave sequence has narrative gravity that a numbered system (v1, v2, v3) would lack entirely. When Stefan rejected "Skål" or "Öl" in favour of more resonant terms, he was protecting that gravity. The names are part of the product, not just the docs.

**1.2 The study/ subfolder is a process innovation, not just an organisational choice**
Creating `planning/study/` and `architecture/study/` as explicit holding areas for items pending the Concept→Study phase is a structural commitment to a new development discipline. In the old workflow, open questions lived scattered across DEFERRED.md and RESEARCH.md — invisible as blockers. The `study/` folder makes the pre-specification gate physically visible in the repo. This is the kind of friction that actually changes behaviour.

**1.3 The conformance audit is the most dangerous item on the roadmap**
It appears as one item among many in Ferd, but it has a unique property: it may invalidate work already done. Every other item on the Ferd list adds something new. The conformance audit may require *removing or rebuilding* existing code. The session treated it as a study item but didn't fully reckon with the possibility that the audit findings could reorder the entire Ferd sequence.

**1.4 The wave redistribution problem is larger than it appears**
WAVE_REDISTRIBUTION.md was created to triage ~20 deferred items. But the real scope is bigger — the old "Wave 3 / Wave 3+" bucket contained conceptual work (The World Expands, The Game) that hasn't been assigned to any wave. These aren't just scheduling decisions. They're scope decisions that will affect whether Heim, Brim and Urd are correctly specified. The triage session needs to be treated as a mini-architecture session, not a quick labelling exercise.

**1.5 The Whisp is the highest-risk item in the entire roadmap**
It appears in Eid as a concept item — seemingly modest. But the Whisp is described as the thing that makes FringeIsland experientially distinct. It touches every other feature (journeys, journals, the three worlds, Arc Studio narratives) and its technical implementation (AI? rules-based? hybrid?) is completely undefined. Getting it wrong in Eid will propagate incorrectness through Heim, Brim and Urd. The session correctly marked it 🔴 but didn't flag it as the single highest-consequence open question in the whole platform.

---

## 2. Tensions and Contradictions

**2.1 Mobile-ready now vs. mobile-native later — the tension isn't resolved**
The locked decision says: build the backend mobile-ready in Ferd so Hamn (Wave 2, now Wave 3) requires only a new client. But the mobile apps appear in Brim (Wave 5). That's three full waves of backend development happening before the mobile client exists. The risk is that "mobile-ready" assumptions made in Ferd will be subtly wrong by the time Brim arrives — because the actual mobile UX won't have been tested against them. This is a known tradeoff but was never explicitly acknowledged as such.

**2.2 Stories as invisible containers vs. the Arc Studio making them visible**
The cosmological principle states that "developmental themes should be invisible in the foundation layer — entertainment is the surface, transformation is the substrate." But Arc Studio (Urd) is explicitly a tool for *authoring* those stories. Once Dreamineers have a studio, the stories become visible artifacts with structure and authorship. This creates a tension between the "invisible container" philosophy and the practical reality of a creative production tool. How does a Dreamineer author something invisible?

**2.3 The three-dimensional void requires others — but the platform currently doesn't**
The Relationship (1+1) and Collective (1+Community) void dimensions "structurally require others to collapse." This is described as developmental interdependence by design. But the current Ferd platform is primarily individual — groups exist but journeys are solo. The platform won't actually support the void's interdependence requirement until significantly later waves. There's a gap between the cosmological architecture and what the platform can deliver.

**2.4 "World-building before schema" vs. the existing schema**
The principle is: lock conceptual foundations before data modelling. But Ferd already has a schema — 16+ migrations, a live database, existing code. The conformance audit is implicitly asking whether the existing schema was built before the world was properly defined. The answer is almost certainly yes. The tension between the principle and the existing reality is never directly confronted.

**2.5 Concept→Study→Specify→Build is a new discipline applied to an existing codebase**
The session introduced a mature development process for future work. But ~90 active files already exist in Ferd's `development/features/` and `specs/` folders — built under the old "loose needs → code" approach. Those files represent a parallel track. The session never addressed how the old artifacts relate to the new process. Are the existing FR-* and AR-* files now inputs to the study phase, or are they the outputs of a study phase that never happened?

---

## 3. The "So What"

**If a smart busy person could take away one thing:**

> *Stop building and study the architecture first.*

Everything else in this session is scaffolding around a single critical path: the Ferd architecture documents (system-anatomy, api-ring, verticals) must be locked before the conformance audit, and the conformance audit must be completed before new feature development resumes. The platform has accumulated code on an unlocked foundation. Every week of new development before the audit makes the eventual remediation more expensive. The roadmap, the wave structure, the study/ folders — all of it is valuable, but none of it changes the fundamental urgency: the architecture study phase is the only thing that matters right now.

---

## 4. What's Missing

**4.1 Who does the study?**
The study phase is described as a gate before specification. But the session never answered: who conducts the study? Is it Stefan alone, in conversation with Claude, in a dedicated session per item? The `study/` files have open questions listed but no process for answering them. Without a defined study methodology the folder will accumulate open questions that never get closed.

**4.2 What does "done" look like for the Whisp?**
The Whisp is marked 🔴 Needs concept work. But unlike the architecture items — which have clear outputs (a locked document, a set of layer definitions) — the Whisp's "done" state is undefined. How will Stefan know when the Whisp concept is sufficiently developed to move to 🟡? What are the outputs of the Whisp concept session?

**4.3 The Dreamineer onboarding path is missing**
FringeIsland Studio appears in Heim (Wave 4) but the process by which an ordinary member becomes a Dreamineer is never defined. Is it an application? A role assignment? An invitation? This matters for the permission model — Dreamineer access to FringeIsland Studio and Arc Studio requires a formal role definition that doesn't yet exist anywhere in the roadmap.

**4.4 What happens when a study item reveals the wave scope is wrong?**
The study phase is designed to close open questions before specification. But some open questions, when answered, may reveal that an item belongs in a different wave — or that a wave needs to be split. The process for handling study findings that change the roadmap is absent. This will happen.

**4.5 The research triptych is never connected to the roadmap**
Three locked theoretical reports exist (Human Flourishing/Ikigai, Theory U, Kegan's Adult Development). The session never referenced them. These were presumably foundational to the platform's developmental philosophy — but there's no explicit traceability from the theory to the wave content. Which wave items are expressions of Theory U? Which of Kegan's immunity to change? The research exists but isn't connected to anything in the new roadmap.

---

*Session file generated: 2026-04-06*
*Next session: WAVE_REDISTRIBUTION.md triage → Architecture study phase*
