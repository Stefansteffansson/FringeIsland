# Ferd — Research

**Last Updated:** April 5, 2026

---

## Status Legend

- **Open** — Not yet investigated
- **In Progress** — Active investigation
- **Resolved** — Answer found (see resolution)
- **Parked** — Deprioritized, revisit later

---

## Open — Blocking

### RQ-F-001: Visitor/Shadow Experience — Technical Design
**Status:** Open
**Raised:** 2026-04-05
**Blocks:** Ferd spec feature: visitor experience, taster journeys
**Context:** How do anonymous sessions work with RLS? Temporary profile storage and lifecycle? What data carries over on registration? How does this interact with the garden door metaphor? Taster journey selection criteria?

### RQ-F-002: profile_data Table — Ferd Usage Scope
**Status:** Open
**Raised:** 2026-04-05
**Blocks:** Ferd spec feature: profile_data (L1), travel log
**Context:** ADR-U005 defines the schema. What data does Ferd actually write to profile_data? Journey completions? Reflection responses? Assessment results? Define the minimum Ferd usage so the schema is validated with real data, not just empty infrastructure.

### RQ-F-003: Internationalization Framework
**Status:** Open
**Raised:** 2026-04-05
**Blocks:** Ferd spec feature: i18n string externalization
**Context:** Which i18n library? next-intl? react-i18next? How does this interact with Next.js 16 App Router? Scope: extract all user-facing strings to locale files, English as default.

---

## Open — Active

### RQ-F-004: Travel Log — Scope and Design
**Status:** Open
**Raised:** 2026-04-05
**Blocks:** Ferd spec feature: travel log/journal
**Context:** What does the travel log contain? Step completions only? Personal notes/reflections? Is it viewable by others or private? How does it relate to profile_data?

### RQ-F-005: AI Mentor Foundation — Reality Check
**Status:** Open
**Raised:** 2026-04-05
**Blocks:** Nothing immediate in Ferd — informs Hamn planning
**Context:** Architecture Anatomy says "For Ferd, the AI Mentor foundation is built: privacy controls, consent model, context storage." But Ferd spec doesn't mention AI Mentor. Is any foundation actually built, or is this aspirational architecture? Clarify what exists vs what's assumed.

---

## Open — Parked

_No parked items._

---

## Resolved

_No resolved items yet._
