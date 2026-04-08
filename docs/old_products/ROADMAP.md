# FringeIsland Platform Roadmap

**Version:** 1.0
**Created:** 2026-04-06
**Status:** Living document — updated as waves progress

---

## Development Philosophy

Every item in this roadmap must pass through this gate before moving forward:

> *"Is this understood well enough to specify, or does it need study first?"*

```
Concept → Study → Specify → Build
```

| Status | Meaning |
|--------|---------|
| 🟢 Ready to specify | No open questions blocking progress |
| 🟡 Needs study | Open questions must be answered first |
| 🔴 Needs concept work | Not yet defined well enough to study or specify |

---

## Wave Overview

Waves are not strictly sequential — one wave winds down as the next builds up.

```
Ferd ────────────────▶
          Eid ──────────────────▶
                    Hamn ──────────────────▶
                                Heim ──────────────────▶
                                            Brim ──────────────────▶
                                                        Urd ────────▶
```

| Wave | Name | Meaning | Core Focus | Status |
|------|------|---------|------------|--------|
| 1 | **Ferd** | Voyage, departure | Foundation — infrastructure, RBAC, journeys, auth | 🟡 In progress |
| 2 | **Eid** | Passage, crossing | The Whisp concept, Journey Studio v.1, design foundation | 🔴 Not started |
| 3 | **Hamn** | Harbour | Design system, accessibility, UX/UI redesign | 🔴 Not started |
| 4 | **Heim** | Home | FringeIsland world, My Garden, Studios v.1 | 🔴 Not started |
| 5 | **Brim** | Edge, horizon | The Void, mobile beta, cross-world journeys | 🔴 Not started |
| 6 | **Urd** | Fate, the deep well | Arc Studio, full mobile release, living universe | 🔴 Not started |

---

## Wave 1 — Ferd (Voyage)

> *You set out.*

**Mission:** Establish the complete foundational infrastructure. Define and lock the system anatomy. Validate the existing codebase for conformance before building further.

**Done when:** Architecture locked → Conformance audit complete → All violations resolved → Core platform functional

### Architecture & System Anatomy

| Item | Status |
|------|--------|
| System anatomy (L0–L7) definition | 🟡 Needs study |
| API ring specification | 🟡 Needs study |
| Verticals definition (Admin, Privacy, Notifications, Observability, Transactions) | 🟡 Needs study |
| **Architecture conformance audit** — validate entire codebase against anatomy | 🟡 Needs study (blocked: architecture must be locked first) |

### Authentication

| Item | Status |
|------|--------|
| Visitor (unauthenticated) experience | 🟡 Needs study |
| Member sign up | 🟡 Needs study |
| Member sign in | 🟡 Needs study |
| Member sign out | 🟡 Needs study |
| Member leave platform | 🟡 Needs study |

### General

| Item | Status |
|------|--------|
| Members | 🟡 Needs study |
| Groups (standalone, groups of groups, system-level) | 🟡 Needs study |
| Roles (connected to groups) | 🟡 Needs study |
| Permissions (connected to roles) | 🟡 Needs study |
| Journeys (join, undertake, leave) | 🟡 Needs study |
| Journals (personal member notes) | 🟡 Needs study |

### Communication

| Item | Status |
|------|--------|
| Direct messaging (1:1 and group DM) | 🟡 Needs study |
| Group forum | 🟡 Needs study |
| Notifications (system and admin) | 🟡 Needs study |

### Internationalisation

| Item | Status |
|------|--------|
| Multi-language support | 🟡 Needs study |

---

## Wave 2 — Eid (Passage)

> *You navigate the narrow gate.*

**Mission:** Introduce the Whisp concept, Journey Studio v.1 for real-world journeys, and a minimal design foundation.

**Done when:** Whisp concept fully defined and documented → Journey Studio v.1 functional → Minimal design foundation in place

### Features

| Item | Status |
|------|--------|
| The Whisp — concept definition and documentation | 🔴 Needs concept work |
| The Whisp — foundational implementation | 🔴 Needs concept work |
| Journey Studio v.1 — visual authoring for real-world journeys | 🔴 Needs concept work |

### Architecture

| Item | Status |
|------|--------|
| Minimal design foundation (tokens, base components) | 🟡 Needs study |

---

## Wave 3 — Hamn (Harbour)

> *You arrive safely.*

**Mission:** Build the FringeIsland design system and accessibility framework. Redesign the full platform UX/UI to match.

**Done when:** Design system complete → Accessibility standard met → Full UX/UI redesign applied

### Features

| Item | Status |
|------|--------|
| Design system (tokens, component library, guidelines) | 🔴 Needs concept work |
| Accessibility system (WCAG standard, audit process) | 🟡 Needs study |
| UX/UI redesign of full platform | 🔴 Needs concept work |

---

## Wave 4 — Heim (Home)

> *You arrive. This is yours.*

**Mission:** Bring FringeIsland to life as a place. Give each member a personal home. Expand journeys and studios into the imaginary world.

**Done when:** FringeIsland world accessible → My Garden live → Journey Studio v.2 functional → FringeIsland Studio v.1 live

### Features

| Item | Status |
|------|--------|
| FringeIsland world — definition, geography, access | 🔴 Needs concept work |
| My Garden — member's personal home on the island | 🔴 Needs concept work |
| Journey Studio v.2 — real world + FringeIsland + deeper Whisp | 🔴 Needs concept work |
| FringeIsland Studio v.1 — Dreamineer environment authoring | 🔴 Needs concept work |

---

## Wave 5 — Brim (Horizon)

> *You stand at the edge. Beyond is everything.*

**Mission:** Introduce the Void. Enable full three-dimensional journeys in testing. Give members agency over their Garden. Launch mobile beta.

**Done when:** Void defined and accessible → Journey Studio v.3 cross-world testing live → Mobile betas launched

### Features

| Item | Status |
|------|--------|
| The Void — definition, experience, rules | 🔴 Needs concept work |
| The Whisp across all three dimensions | 🔴 Needs concept work |
| Journey Studio v.3 — cross-world journeys (limited testing) | 🔴 Needs concept work |
| FringeIsland Studio v.2 — member Garden customisation + Void development | 🔴 Needs concept work |
| iOS mobile app v.01 — beta, limited members, limited features | 🔴 Needs concept work |
| Android mobile app v.01 — beta, limited members, limited features | 🔴 Needs concept work |

---

## Wave 6 — Urd (The Deep Well)

> *Beyond the horizon lies something older than the journey itself.*

**Mission:** Bring the narrative engine live with Arc Studio. Launch mobile to all members. Mature all studios.

**Done when:** Arc Studio v.1 live → Seasons and episodes running → Mobile apps released to all members

### Features

| Item | Status |
|------|--------|
| Arc Studio v.1 — seasons and episodes authoring | 🔴 Needs concept work |
| Journey Studio v.4 — natural evolution | 🔴 Needs concept work |
| FringeIsland Studio v.3 — natural evolution | 🔴 Needs concept work |
| iOS mobile app v.1 — full release to all members | 🔴 Needs concept work |
| Android mobile app v.1 — full release to all members | 🔴 Needs concept work |

---

## Beyond Urd

After Urd the universe continues. The focus will shift toward the FringeIsland community,
the Dreamineers ecosystem, and the worldbuilding infrastructure needed to sustain
a living, growing universe. What that looks like cannot be fully foreseen from here —
and that is by design.

---

## Critical Path — Ferd

The architecture work is the blocker for everything else in Ferd:

```
1. Lock system anatomy (L0–L7)
2. Lock API ring specification
3. Lock verticals scope for Ferd
4. Run architecture conformance audit on existing codebase
5. Resolve all blocking violations
6. Study phase for each feature (close open questions)
7. Specify (BDD/Gherkin scenarios, acceptance criteria)
8. Build (TDD implementation)
```

No feature in Ferd should move to Specify until its open questions are closed.

---

## Item Counts

| Wave | 🟢 Ready | 🟡 Needs study | 🔴 Needs concept | Total |
|------|---------|----------------|-----------------|-------|
| Ferd | 0 | 18 | 0 | 18 |
| Eid | 0 | 1 | 3 | 4 |
| Hamn | 0 | 1 | 2 | 3 |
| Heim | 0 | 0 | 4 | 4 |
| Brim | 0 | 0 | 6 | 6 |
| Urd | 0 | 0 | 5 | 5 |
| **Total** | **0** | **20** | **20** | **40** |

---

*For detailed open questions and feature breakdowns see each wave's individual files.*
*For the canonical wave naming rationale see ADR-U022.*
