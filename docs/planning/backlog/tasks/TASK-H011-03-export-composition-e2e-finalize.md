---
id: TASK-H011-03
title: Export composition (download includes journal) + E2E + finalize 6-done
status: todo
assigned_to: Claude
priority: high
feature: FEAT-H011
owner: hub
wave: ferd
cycle: IDN-5
depends_on: [TASK-H011-02]
estimated_hours: 3
---

# TASK-H011-03: Export composition + E2E + finalize (STORY-5)

## Description

- **STORY-5:** the "Download my data" flow additionally fetches
  `get_own_journal_export()` and delivers `{ ...pc008Doc, journal: {...} }` —
  an **additive** top-level key at the surface (BFF composition, ADR-U038;
  the PC008 platform document itself stays journal-free — one-way Core→Domain
  boundary). `journal` present-and-empty for an entry-less FIM (stable shape).
  Integration test red-first on the composed route response.
- **E2E (Playwright):** the critical journey — sign in → /journal → write →
  see it listed → edit → delete (ConfirmModal) → empty state.
- **Finalize:** both specs → `6-done` with Implementation notes (red→green
  evidence, honest labelling); §L4 rows (hub `SPECIFICATION.md` +
  `intelligence.md`) + both `features/README.md` indexes in the same commit;
  **FEAT-H010 provenance amendment** (the download route now composes two
  contracts — supersedes its "no Hub change" courier line); `CHANGELOG.md`;
  `next build` (the type gate) before 6-done.

## Acceptance check

- Composed download carries both sections, clearly versioned; empty journal is
  present, not absent.
- Full suite + lint + `next build` green; API-boundary DoD checklist satisfied
  (adversarial direct-caller tests exist from TASK-PD001-01).

## Verification

`npm run test:e2e -w hub` (dev server up); `npm run test:integration -w hub`;
`next build`; feature maturity + §L4 + indexes verified consistent.
