# Collapse `universe/` — decide first whether the canonical cores should be files at all

---
id: TASK-UNI-01
title: "Collapse the single-README directories under docs/ecosystem/universe/ — or rule that the cores stay directories and fix findability at the index"
status: open
assigned_to: unassigned
priority: medium
owner: ecosystem
wave: eid
depends_on: []
estimated_hours: 4
---

## Why

Raised by Stefan 2026-09-14, at the close of the discovery-canvas revert session: `docs/ecosystem/universe/` is hard to navigate because the structure is heavier than the content. Thirteen files, **seven of them `README.md`** — four directories hold nothing but a README.

This was the live half of the session's opening question (flat structure versus nested). It was deferred deliberately; this task carries it.

## What is actually there

| Directory | Files | Inbound references (active tree) |
|---|---|---|
| `beings/` | 1 — README only | 15 |
| `cosmology/` | 1 — README only | 50 |
| `narrative/` | 1 — README only | 9 |
| `roles/` | 1 — README only | 56 |
| `community/` | 2 | 7 |
| `kickstarter/` | 2 | 1 |
| `personal-growth/` | 4 | 15 |

## The tension — read this before starting

**The four single-README directories are exactly the four canonical cores**, and they carry the heaviest inbound reference counts in the tree (~130 referencing files between them). This is not a tidy-up; it is the most cross-cutting rename available in the ecosystem tree.

A naive collapse (`beings/README.md` → `beings.md`) breaks at least:

- ~130 files' relative links, across specs, ADRs, tier `CLAUDE.md` files and assertion-bearing SVGs
- **`doc-health-check` Section 10**, which globs `docs/ecosystem/universe/*/README.md` to enumerate canonical cores (2 occurrences in `SKILL.md`) — the graduation-tracker check goes blind if the shape changes and the skill is not updated in the same pass
- The graduation tracker's **"Canonical home"** column in `thinking/universe-discovery/README.md`
- The root `CLAUDE.md` document-map rows ("Worlds topology (canonical core)", "Role taxonomy (canonical core)")

## The decision to make first

Do **not** start renaming. Rule on this first:

1. **Collapse all four.** Honest about today's content, but the cores are expected to grow — `narrative/` is only partially ratified, and per-section entities for the cores are an explicitly parked idea. Collapsing now may mean re-expanding later, and the rename cost is paid twice.
2. **Keep the cores as directories; fix findability at the index.** A canonical core that will acquire sections is legitimately a directory. The actual navigation problem may be that `universe/README.md` is not a real index — cheaper, reversible, and touches nothing downstream. **Recommended starting position.**
3. **Split the difference** — collapse only those ruled as never-growing (likely `beings/`, possibly `narrative/`), keep `cosmology/` and `roles/` as directories.

Whichever is chosen, the same-session obligations apply: update `doc-health-check` Section 10's glob, the graduation tracker, and the root `CLAUDE.md` doc map, then run the full doc-health check — this is precisely the "renames, deletions, restructures" trigger.

## Not in scope

`community/`, `kickstarter/` and `personal-growth/` hold real multi-file content and are not collapse candidates. `personal-growth/` is also sourced from the founding-vision extraction rather than universe-discovery (doc-health §10 scope note) — leave it alone.

## Related

- Bridge: [`../../sessions/2026-09-14_01_-_DISCOVERY-CANVAS-REVERTED-APP-KEPT.md`](../../sessions/2026-09-14_01_-_DISCOVERY-CANVAS-REVERTED-APP-KEPT.md) — the session that raised it, and the standing view on flat-versus-nested (keep the nesting where the cascade addresses by path; reserve flat-plus-typed-IDs for entity-like material)
- Also open from that session: `docs/research/` carries four coexisting naming conventions and real `.docx`/`.md` duplicate pairs
