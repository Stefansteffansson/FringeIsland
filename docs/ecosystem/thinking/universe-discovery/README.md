# Universe Discovery

**Purpose:** Working sessions exploring the FringeIsland universe — its cosmology, beings, dynamics, and meaning. Each session is a discrete artifact capturing statements, "held" interpretations, and emerging patterns.

**Status:** Exploration. Content here is not yet canonical. When concepts crystallise into stable positions about how the universe works, they graduate into `../../universe/` per the standard graduation path.

**Related research:** External cross-media research dossiers feeding this work live in `../../../research/` (Portal_Fantasy_Research_Report.md, Parallel_Worlds_Research_Report.md, and others).

**Discipline:**
- One session = one file. Named `YYYY-MM-DD_universe-discovery-session-NN.md`.
- Sessions are append-only during the session; closed when the session ends.
- Direct statements from Stefan are recorded verbatim; Claude's "held" paraphrases are kept as separate interpretation checks so drift is visible.
- Divergence from existing universe writings is permitted and expected — reconciliation happens when concepts are promoted to `../../universe/`.
- **Sounding-board notes** are exploratory outputs from non-session conversations (e.g. parking-lot files for ideas not yet considered). They live alongside sessions but follow no fixed schema and carry an explicit `decision_status: open` marker. Distinguished from sessions in the directory by their filename (not `*-session-NN.md`).

---

## Sessions

| Session | Date | Focus | Status |
|---------|------|-------|--------|
| [Session 01](./2026-05-18_universe-discovery-session-01.md) | 2026-05-18 | Foundations: Whisp as inner dialogue and avatar; two-register universe topology; full tonal range; Universe Studio frame; Shadows, NPCs, Dreamineers, Creators; assessment-as-dialogue; signature journeys; respawn and the Jake/Avatar metaphor | In progress, resumed 2026-06-05 (product/ecosystem layer + Statements 41-46: products are situations not devices and Gimbal/Hub are two affordance profiles, the glowing glass ball is a two-zone home/village gateway, the self-chosen inviolable private home, anchoring as the near-side/Beyond gate making the village FIM-only, and Shadow anonymous-auth with ephemeral erased-on-inactivity data); resumed 2026-06-01 (Statements 37-40: balls glow equal while the cord carries health, the branches are the visible crown, every FIM and Shadow has their own Whisp and cord with only the ball granted at transcendence, and the seed / portal / anchor mechanics); prior resume 2026-05-29 (Statements 31-36: the Fringe reshaped) |
| [Session 02](./2026-06-14_universe-discovery-session-02.md) | 2026-06-14 | The first hour / first experience — the new-arrival journey from first touch through (possibly) Shadow→FIM transcendence; the universe's named highest-risk gap (CQ-010) | Open — scaffolded, not yet run |

---

## Discovery backlog (open topics awaiting sessions)

These concepts are named in the universe design and in [`../OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md) but have **no firm canonical home yet** (they also appear in the "not yet graduated" note under the graduation tracker below). Each needs its own discovery session to crystallise before it can graduate. The first-hour topic is scaffolded as Session 02; the rest are not yet scheduled.

| Topic | Why it needs a session | Status |
|-------|------------------------|--------|
| The first hour / first experience | The universe's named highest-risk gap; DS-3 Journeys and `narrative/` are waiting on it (CQ-010) | **Session 02 scaffolded** (running first) |
| Narrative beyond respawn | Content families, journey route types, and arc/episode design as universe canon — only the respawn section is ratified so far | Not yet scheduled |
| Community formation / cold-start | How the relational and communal layers work when few members are present (CQ-001, CQ-002, CQ-003) | Not yet scheduled |
| Kickstarter / founding moment | The "Season Zero" launch, arrival rituals, and the founding Dreamineer cohort (currently an old-vision sketch only) | Not yet scheduled |

---

## Sounding-board notes

Exploratory outputs from non-session conversations. Not decisions; not statements; reference material for future sessions to draw on or supersede.

| Note | Date | Focus | Decision status |
|------|------|-------|-----------------|
| [Portal ideas from research](./2026-05-28_portal-ideas-from-research.md) | 2026-05-28 | Ten candidate portal-type ideas for FringeIsland, sourced from the Portal Fantasy and Parallel Worlds research dossiers (see `../../../research/`) and cross-checked against Session 01's locked topology | open — no decision made |

---

## Graduation tracker

When a concept from these sessions reaches stable form and moves into canon — a `../../universe/` core, or an ADR when the concept is an architectural decision — record the move here. The discovery notes are never canon; the "Canonical home" below is the single source of truth for each concept. (Verified complete against the canonical cores and the discovery-sourced ADRs on 2026-06-14.)

| Concept | Source | Canonical home (single source of truth) | Type | Date |
|---------|--------|------------------------------------------|------|------|
| Worlds topology (Ordinary World / Shimmer / Fringe; the Void as axis; cord, balls, branches, seeds, anchoring, portals, severance & respawn; the comfort→growth→panic gradient) | Session 01 (S-numbers cited in the core) | [`../../universe/cosmology/README.md`](../../universe/cosmology/README.md) (supersedes the Three Worlds model) | universe core | 2026-06-10 |
| Role taxonomy (Shadow → FIM transcendence; Steward / Guide / Participant / Observer; Universeers / Council / DeusEx / Console; Dreamineer sub-roles) | Session 01 (S16, S29-30, S39, S44, S46) + 2026-06-05 product locks | [`../../universe/roles/README.md`](../../universe/roles/README.md) | universe core | 2026-06-10 |
| The Whisp (inner dialogue, fills-by-growth, dissolved assessment, senses, internalisation) + NPCs as layered composites | Session 01 (S1-9, S15, S17-18, S22, S30) | [`../../universe/beings/README.md`](../../universe/beings/README.md) | universe core | 2026-06-10 |
| Respawn — "the loop is the medium" | Session 01 (S19-21) | [`../../universe/narrative/README.md`](../../universe/narrative/README.md) (Respawn section; remainder still placeholder) | universe section (partial) | 2026-06-10 |
| Products as equipment profiles; the Game as journey-depth | 2026-06-05 product locks | [ADR-U025](../../../architecture/decisions/ADR-U025-products-as-equipment-profiles.md) | ADR | 2026-06-10 |
| Studio decomposition — Universe Studio parent + World Studio | Session 01 (S13-14, S29-30, S44) + 2026-06-05 locks | [ADR-U026](../../../architecture/decisions/ADR-U026-studio-decomposition-universe-studio-parent.md) | ADR | 2026-06-10 |
| Shadow identity lifecycle (anon auth, ephemerality, transcendence) | Session 01 (S16, S39, S45, S46) | [ADR-U027](../../../architecture/decisions/ADR-U027-shadow-identity-lifecycle.md) | ADR | 2026-06-10 |
| Governance by scope (Console, Universeers, DeusEx) | Session 01 (S29) + 2026-06-05 locks | [ADR-U028](../../../architecture/decisions/ADR-U028-governance-by-scope.md) | ADR | 2026-06-10 |

**Not yet graduated — still open, no firm canonical home yet (do not treat as settled truth):** the rest of `narrative/` beyond respawn (content families, journey route types as universe canon), the first-hour / first experience, community formation / cold-start, and the Kickstarter / founding-moment design. These remain in discovery or as open questions ([`../OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md)) until a session crystallizes them.
