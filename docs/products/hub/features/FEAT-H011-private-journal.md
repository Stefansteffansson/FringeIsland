# FEAT-H011: Private journal — the Hub surface where a FIM writes, reads, and tends their own journal

---
id: FEAT-H011
title: Private journal — the Hub surface for writing, reading, editing, and deleting one's own journal entries, private by construction
owner: hub
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

> **Routing provenance (ratified 2026-07-03).** Paired with [FEAT-PD001](../../../platform/domain/features/FEAT-PD001-personal-journal-primitive.md); the Journal primitive is routed to DS-7 Intelligence (adjudicated at the Cycle D decomposition — see that spec's provenance note and `intelligence.md`'s Sources-status amendment).

## Problem

IDN-5 ("Provide private personal Journal surface", `docs/products/hub/SPECIFICATION.md:190`) is the last purely-additive capability in the Phase-3 Identity area: the Hub gives a FIM no place to write. The ecosystem treats journaling as a complete engagement mode, not an accessory — the Homebody "tends their inner garden … reflects quietly" (`engagement-spectrum.md`), and the individual perspective of the three questions runs through "reflection, assessment, journaling" (`three-questions.md`). Today that mode has zero surface.

This is the Hub half of IDN-5: a journal page where a FIM writes, reads, edits, and deletes their own entries — and nothing else. All privacy rules live platform-side in FEAT-PD001 (ADR-U038); the Hub renders the experience and carries no rule the substrate doesn't already enforce. It also closes the export seam at the surface: "Download my data" comes to include the journal by composing the two platform contracts.

## Solution sketch

A `/journal` route (authenticated, FIM-only): a reverse-chronological entry list with an empty state that invites the first entry; a plain editor (optional title, body); edit and delete (with confirmation) on own entries. Hub lib functions call the FEAT-PD001 RPCs directly (thin plumbing, no business logic in routes per Hub `CLAUDE.md`). Mists don't see the Journal in navigation — journaling is part of FIM life (ADR-U031 keeps Mist ephemerality out of v1); the standing account-state gate (FEAT-H006 precedent) keeps suspended members out along with the rest of the app. The "Download my data" flow (FEAT-H010) additionally fetches `get_own_journal_export()` and bundles it with the PC008 document — surface composition, one download.

## Appetite

One to two focused sessions (page, editor, list, gating, export composition), matching prior Hub-half scale (FEAT-H010).

## Rabbit holes

- **Editor ambition.** Plain text v1 — no rich text, no autosave choreography beyond a simple explicit save, no drafts.
- **Journal-as-home framing.** The garden/rooms/home metaphor (S43) is future experience design; v1 is a clean page, not a metaphor build-out.
- **Retro-editing FEAT-H010.** The export composition is specified here; H010 (6-done) gets only a short provenance amendment at close, not a reopened spec.

## No-gos

- No sharing, no visibility controls, no public anything.
- No Whisp presence, prompts, or AI features on the journal page.
- No search, tags, media, or export formats beyond the composed machine-readable download.
- No Mist journaling (nav hidden; deep-link blocked by the FIM gate).
- No Gimbal surface in this feature (the contract inherits; the surface is future).

## Stories

### STORY-1: A place to write
As a FIM, I want a journal page where I can write a new entry, so that reflection has a home in my Hub.

**Acceptance criteria:**
- Given an authenticated FIM on `/journal`, when they write a body (title optional) and save, then the entry appears at the top of their list and survives reload.
- Given a FIM with no entries, when they open `/journal`, then an empty state invites the first entry.
- Given a save that fails (network/RPC error), when the error returns, then the member sees a non-destructive error and their typed text is not lost.

### STORY-2: Read my journal
As a FIM, I want to see my entries newest-first, so that I can revisit my own thinking.

**Acceptance criteria:**
- Given a FIM with entries, when they open `/journal`, then their entries render newest-first with title (when present), body, and a human-readable date.
- Given more entries than one page, when the member reaches the end of the list, then older entries load (keyset pagination via `p_before`).

### STORY-3: Tend my entries
As a FIM, I want to edit and delete entries, so that the journal stays mine to shape.

**Acceptance criteria:**
- Given an entry, when the FIM edits and saves it, then the updated content renders in place.
- Given an entry, when the FIM chooses delete, then a confirmation is required, and on confirm the entry disappears from the list.

### STORY-4: The journal is FIM-only and signed-in-only
As the platform, I want the journal surface gated, so that the surface matches the substrate's rules.

**Acceptance criteria:**
- Given a signed-out visitor, when they request `/journal`, then they are redirected to sign-in.
- Given an authenticated Mist, when they look at navigation, then no Journal item is shown; when they deep-link to `/journal`, then they are redirected (consistent with the transcendence invitation pattern, FEAT-H004).

### STORY-5: My download includes my journal
As a FIM, I want "Download my data" to include my journal entries, so that my export is actually complete.

**Acceptance criteria:**
- Given a FIM with journal entries, when they use the FEAT-H010 download control, then the delivered file contains both the PC008 document and the journal export section (`get_own_journal_export()`), clearly versioned.
- Given a FIM with no entries, when they download, then the journal section is present and empty (not absent), so the document shape is stable.

## Platform dependencies

FEAT-PD001 (all journal RPCs + export contract); PC-2 (session, FIM/Mist distinction); the existing account-state gate (FEAT-PC004/H006) for suspended members; FEAT-PC008 (the document the journal export composes with).

## Cross-product impact

None beyond the Hub. The Gimbal, when it arrives, builds its own surface on FEAT-PD001's contracts; nothing here constrains it.

## Vertical impact

- **Privacy/GDPR:** Renders private personal data to its owner only; no rule of its own — enforcement is substrate-side (FEAT-PD001). Closes the export completeness gap at the surface (STORY-5).
- **Notifications:** None.
- **Administration:** None — no admin surface touches journal content.
- **Observability:** Standard error monitoring only; no journal content in logs, analytics, or error payloads (explicit test: RPC error paths don't echo bodies).
- **Transactions:** None.
- **Extensibility:** The page composes platform contracts and adds no types or enums; a future sharing surface (S43) or Whisp integration arrives as new features, not edits to this one.
