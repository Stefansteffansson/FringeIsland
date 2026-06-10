---
title: Decide and execute the disposition of docs/TMP/
status: done
assigned_to: Claude (CC), ratified by Stefan
priority: medium
completed: 2026-06-10
feature: none (doc hygiene — raised by doc-health-check 2026-06-10)
owner: planning
wave: ferd
---

# TASK: Decide and execute the disposition of docs/TMP/

## Why

The 2026-06-10 doc-health-check (run after reconciliation Session B) found `docs/TMP/` is the
largest remaining carrier of the superseded model in the active tree: Three Worlds / Safe Harbour
/ The Other Side framing, Whisp-as-future-self, "visitor" identity language, and an `OLDFEAT/`
subfolder of legacy feature specs referencing the deleted `old_*` trees (files incl.
`capability-foundation.md`, `hub-l3-input.md`, `prose.md`, `capabilities.md`, `Things to check.md`,
`OLD-UNIVERSE-REVIEW-PROMPT.md`, `OLDFEAT/*`).

`docs/TMP/` is not classified in any register (Session A scoped it out implicitly; it is neither
planning/reference snapshot nor ecosystem canon), so the conformance machinery cannot reason about
it.

## What to do

Decide per file (or for the folder wholesale): delete, move to `docs/planning/reference/` as a
dated point-in-time snapshot, or absorb into an active doc. Then remove `docs/TMP/`. Until then,
nothing in the active tree may cite `docs/TMP/**` as authoritative.

## Done when

`docs/TMP/` no longer exists; anything retained has a proper home and a dated snapshot header.

## Disposition record (2026-06-10)

Nothing was deleted — only the two small files were git-tracked; everything else (incl. OLDFEAT)
existed nowhere in git history, so every file was MOVED and committed (durable for the first time).
OLDFEAT preserved per Stefan's explicit instruction.

| Was | Now |
|---|---|
| `docs/TMP/OLDFEAT/**` (16 feature docs + INDEX + _archive) | `docs/planning/reference/legacy-feature-docs/` (+ provenance README) |
| `capability-foundation.md`, `hub-l3-input.md`, `prose.md`, `capabilities.md`, `ARCHITECTURE_ANATOMY_DIAGRAM.svg` | `docs/planning/reference/2026-04_hub-l3-working-set/` (+ provenance README with superseded-model caveat; NOT derivation input for DS-1) |
| `Things to check.md` | `docs/planning/reference/2026-04-12-things-to-check.md` (Stefan: worth a skim for still-live intentions) |
| `OLD-UNIVERSE-REVIEW-PROMPT.md` | `docs/planning/sessions/openers/archive/` (archived with the other executed openers, 2026-06-10) |
| `prompts.md` | `docs/planning/sessions/openers/bounce-back-prompt.md` |

`docs/planning/reference/README.md` index updated. `docs/TMP/` removed.
