# Session bridge — {topic}

**Filename convention:** `YYYY-MM-DD_-_{TOPIC}.md` (date first, then descriptive text)
**Example:** `2026-04-12_-_SESSION-BRIDGE.md`

**Date:** YYYY-MM-DD
**Session type:** {planning · architecture · design · debug · research · review}
**Status:** {Open / Closed / Decisions pending}
**Participants:** {names + Claude}

> A "session bridge" is the durable artifact of a conversation with Claude (or any deep working session). It exists so the *next* session can pick up without re-reading a transcript. Write it at the end of the session, while everything is still fresh.

---

## Session summary

Two or three paragraphs. What was the session about, what was the arc of the conversation, where did it land?

## What was decided

Bullet list. Each decision: the decision, the rationale (one line), and a flag if it's locked vs. proposed.

- **{decision}** — {rationale}. *Locked / Proposed.*

## What was produced

Files created, edits made, diagrams sketched, commits landed. Link to each.

- `path/to/file.md` — {description}
- commit `abcd1234` — {description}

## What is still open

Questions raised but not resolved. Each one is a candidate for a spike, an ADR, or a follow-up session.

- {question}
- {question}

## Tensions and contradictions

Things that don't yet fit together. Naming them is more valuable than resolving them too early.

## Non-obvious insights

The "huh, didn't see that coming" moments. These are the highest-leverage notes — they capture meta-learning that would otherwise be lost.

## For the next session

What the next person (or next Claude) needs to know to pick this up cleanly. Read order, locked vs. open decisions, current focus, explicit user instructions.

---

## Open items

### Immediate
- [ ] ...

### Near-term
- [ ] ...

### Deferred
- [ ] ...
