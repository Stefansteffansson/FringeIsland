# Transcendence names the birth, never the consent step — the specs, VISION and the Hub's route still say otherwise

---
id: TASK-VOC-01
title: "Transcendence names the birth, never the consent step: bring VISION, the specs and the Hub's transcend route into line with the bible"
status: open
assigned_to: claude
priority: medium
feature: none  # cross-cutting: FEAT-PC002, FEAT-H004, identity specification, Hub SPECIFICATION, VISION
owner: ecosystem
wave: eid
cycle: none
depends_on: []
estimated_hours: 3
---

## Description

Found by the doc-health run of 2026-09-28 (Sections 1.5 and 10). The bible says it plainly in §3.5, from discovery Session 05 (ruling R-40): **becoming a FIM is consent**, the moment a person agrees to be remembered; **the birth** is completion, always after consent, and *transcendence* is the platform's name for the birth, "never the consent step". The glossary's retired names list "the persistence-and-consent threshold" as a former meaning of transcendence.

Active documents still give transcendence that former meaning:

- `docs/ecosystem/VISION.md:39` — "**transcend** into FIMs at the persistence-and-consent threshold". The R-50 vocabulary pass (#689) did not reach this line. **Fixed 2026-09-28 (#699, on Stefan's "ok merge 699"): VISION 1.4.**
- `docs/platform/core/identity-specification.md:238`, `:482` — "Transcendence (metamorphosis) — the persistence-and-consent threshold".
- `docs/platform/core/features/FEAT-PC002-mist-transcendence-reaper-consent.md` — the title, and `:18`, `:33`, `:79`, `:118`.
- `docs/products/hub/features/FEAT-H004-mist-transcendence-and-farewell.md` — the title, and `:32`, `:50`, `:135`.
- `docs/products/hub/SPECIFICATION.md:389`, `:460`.
- ADR-U031 (`:93`) and ADR-U040 (`:26`) already carry dated amendments (#688); their decision text stays as written, by design.
- Code: the Hub's `transcend` route and its "transcendence" telemetry perform the consent step. The 2026-09-26 bridge named this a follow-up: rename it, with a separate birth event, when the birth is built.

## Acceptance criteria

1. ~~VISION.md:39 corrected, on Stefan's nod.~~ Done 2026-09-28, #699.
2. Each spec's **present-tense** prose names the consent step "becoming a FIM" (or "consent") and keeps "transcendence" for the birth; where a shipped name must stay (a route, a function, a spec filename), one line says it is the platform's historical name for the consent step. Implementation notes and other shipped history are not rewritten.
3. Stefan rules on the code: rename the `transcend` route and its telemetry now, or when the birth is built (the 2026-09-26 recommendation). The ruling is recorded here.
4. A doc-health grep for "persistence-and-consent threshold" and "transcend into FIMs" (the Section 1.5 row added 2026-09-28) returns only history.
