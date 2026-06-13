# Brief — Spec alignment challenge (vision-down conformance, bidirectional)

**Authored:** 2026-06-12, in conversation with Stefan (paused for a computer reboot; this brief is the resume point).
**Shape:** interactive challenge session — NOT an autonomous L1->L3 template instance. Conversational; CC cites spec text, Stefan challenges; every divergence logged with a verdict + disposition. No code.
**Start prompt:** `Read docs/planning/sessions/openers/spec-alignment-challenge-brief.md and proceed.`

---

## The problem this solves

FringeIsland now has a large body of specs — Platform Core (PC-1..4), Domain Services (DS-1..7), Extension System, five Verticals, products/studios/design-system scaffolds — all tracing back to the anatomy (`ECOSYSTEM_ANATOMY_V5.svg`, ADR-U002), VISION.md, MANIFESTO.md, PRINCIPLES-AI.md, and the discovery-session documents. A good portion of the recent specs were derived **autonomously** (CC cold-derived, Stefan ratified at gates — a lighter touch than authorship). Stefan is not confident his mental model and the written specs are on par.

**Why no existing tool catches this:** `doc-health-check` verifies the specs against *each other* (links, terminology, cascade consistency). This activity verifies the specs against *Stefan's intent* — a ground truth that lives only in his head. Nothing automated can catch a spec that is internally perfect but says something he never meant.

## The core insight — drift runs in two directions

A one-direction format (Stefan states his view; CC checks the specs) catches only half:

- **Catches well — gaps:** things Stefan believes that the specs are silent on (he voices these naturally).
- **Catches poorly — intrusions:** things the specs assert that Stefan did NOT intend (he won't think to challenge a claim he doesn't know is there).

**So every area is worked BOTH directions:** CC first synthesizes *what the specs currently claim* about the area (surfaces intrusions), then Stefan challenges with *how he sees it* (surfaces gaps). Same area, both lenses, before moving on.

## Verdict vocabulary (the shared scoreboard)

Every statement — Stefan's or CC's — gets one:

- **Affirmed** — specs already say this; cite file + line.
- **Partial** — specs touch it but differ; name how.
- **Gap** — specs are silent; would be new work.
- **Conflict** — specs actively say something different; one party must move.
- **Deferred** — an ADR or wave decision already parked this deliberately.

## Disposition (what happens to every non-Affirmed verdict)

Correct the spec · log a new open question · raise a candidate ADR · update Stefan's model. Anything left undispositioned re-drifts — so nothing is left undispositioned.

## Technique — walk a journey

The sharpest probe is a concrete future moment narrated by Stefan (e.g. "a new member arrives, forms a group, takes a journey, one member leaves partway, a creator publishes a paid journey"). One member story cuts across World Model, Journeys, Identity, Notifications, Transactions, and the roles taxonomy at once — it exercises the cross-entity seams, which is where drift hides. Abstract entity-by-entity challenges also work; journeys surface more per sentence.

## Altitude — top-down

Start at the **anatomy + Vision level** — confirm the skeleton (entities, boundaries, the Three Perspectives, the constitutional principles) before descending into any one entity's capabilities. A misaligned skeleton propagates into every capability beneath it. Descend into entities only where drift is suspected.

## Discipline

CC cites actual spec text (file + line), never recall — verify-before-asserting binds at this volume. ASCII-only labels. Sessions append-only.

## Durable output — the alignment register

A running register (lean path: `docs/planning/reference/alignment-register.md` — confirm at session start) logs each statement, its verdict, the citation, and the disposition. The register IS the worklist for downstream spec corrections; the session produces a worklist, not just a good conversation.

## Recommended first move — a pilot, not a commitment

Run ONE pilot to calibrate the format and the verdict vocabulary before committing to multiple sessions. Two candidate pilots:
- **Roles / Three Perspectives** (Steward / Guide / Participant / Observer; `docs/ecosystem/universe/roles/`) — central, well-specified, fast to confirm the format works.
- **One end-to-end member journey** narrated by Stefan — broader, reveals seam drift quickly.

After the pilot: decide cadence, and whether to formalize this as a named, repeatable session shape.

## Two decisions open at resume

1. **Which pilot** — roles, or a journey Stefan narrates.
2. **Spin up the alignment register** as we go (lean: yes).

## Not in scope

No code. This does not run the breach-response spike (separate brief, running elsewhere) or the Hub re-derivation (separate, parked pending Stefan). It does not modify specs mid-conversation without a ratified disposition.
