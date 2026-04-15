# FringeIsland docs/ Status Report — Pre-Phase 4

**Date:** 2026-04-08
**Branch:** main
**Last commit at time of report:** `1196bef` (Phase 3)
**Purpose:** Comprehensive status snapshot before beginning Phase 4 (content migration from `old_*/` to new structure)

---

## 1. `docs/` tree (live, non-parked)

```
docs/
├── architecture/
│   ├── decisions/
│   │   ├── PENDING.md
│   │   └── README.md
│   └── README.md
├── design-system/
│   └── README.md
├── ecosystem/
│   └── README.md
├── planning/
│   ├── backlog/README.md
│   ├── cycles/README.md
│   ├── prds/README.md
│   ├── sessions/README.md
│   ├── PROCESS.md          ← canonical way of working
│   └── README.md
├── platform/
│   ├── core/README.md
│   ├── domain/README.md
│   ├── extensions/README.md
│   └── README.md
├── products/
│   ├── android/.gitkeep
│   ├── game/.gitkeep
│   ├── ios/.gitkeep
│   ├── web/.gitkeep
│   └── README.md
├── research/README.md
├── studios/
│   ├── arc-designer/.gitkeep
│   ├── journey-designer/.gitkeep
│   ├── universe-designer/.gitkeep
│   └── README.md
├── templates/              ← 13 templates + index (see §3)
├── verticals/              ← V1–V5 + README
└── TMP/                    ← UNTRACKED scratch (planning docs, will be moved/cleaned in Phase 4)
```

**Untracked items in `docs/TMP/`:** `EXECUTION-PLAN-DOC-RESTRUCTURE.md`, `EXECUTION-PLAN-DOC-RESTRUCTURE_1.md`, `multi-product-ecosystem-management_2.md`, `Solo-Developers-Guide-to-Systematic-Web-Development.docx`, two `.docx` ecosystem mgmt files, `DOMAIN_SERVICE_DEPENDENCIES.svg`, `ECOSYSTEM_ANATOMY_V2.svg`, `The solo developer's complete guide to systematic web development.md`, `test`. **Decision needed in Phase 4:** which of these become `docs/research/`, which become `docs/architecture/`, which get archived.

---

## 2. Parked legacy (`docs/old_*/`) — totals

| Folder | File count |
|---|---|
| `old_implementation/` | 21 |
| `old_products/` | 249 |
| `old_universe/` | 51 |
| `old_INDEX.md` (root) | 1 |
| **Total parked** | **322 files** |

Highlights inside `old_*`:
- `old_universe/decisions/` — 22 ADRs (`ADR-U001` … `ADR-U022`) — these will migrate to `docs/architecture/decisions/`
- `old_universe/architecture/ARCHITECTURE_ANATOMY.md` + `ARCHITECTURE_ANATOMY_DIAGRAM.svg` + `DOMAIN_SERVICE_DEPENDENCIES.svg` + `ECOSYSTEM_ANATOMY_V2.svg`
- `old_universe/vision/{VISION,MANIFESTO,VISION_DECISIONS}.md` — feed `docs/ecosystem/`
- `old_universe/strategy/{PRODUCTS_AND_PLATFORM,CONTRIBUTION_ARCHITECTURE,OPEN_QUESTIONS}.md`
- `old_universe/research/` — adult-development, human-flourishing, theory-u (3 dirs, 4 reports) → feeds `docs/research/`
- `old_products/ferd/` — the bulk: 7 agent contexts + 7 journals, 17 feature docs (FR/AR/NF), 16 spec files, full sessions/ archive, planning study/, BOOT_UP/CLOSE_DOWN/WORKFLOW
- `old_products/{eid,hamn,heim,brim,urd}/` — wave folders with `planning/study/*.md` (research notes per wave) and mostly `.gitkeep` placeholders elsewhere
- `old_products/hamn/_archive/2026-04-06-wave2-content/` — 7 files (legacy Hamn-as-product content, archived during wave restructuring)
- `old_implementation/shared/` — DATABASE_CURRENT, RLS_POLICIES, AUTH_SYSTEM, MIGRATIONS_LOG, SCHEMA_OVERVIEW
- `old_implementation/ferd/baseline/` — BASELINE, ACTUAL_STATE, AUTH_IMPLEMENTATION, INSTALLATION

---

## 3. `docs/templates/` — confirmed complete

14 files (1 README + 13 templates):

```
README.md  ← populated index
adr.md
cycle-plan.md
domain-service-spec.md
prd.md
product-description.md
product-roadmap.md
product-specification.md
research-spike.md
retrospective.md
session-bridge.md
studio-description.md
user-story.md
vertical-spec.md
```

✅ All 13 templates referenced from PROCESS.md §6 exist.

---

## 4. `docs/planning/PROCESS.md` — section headings

```
## Section 1 — Work item lifecycle
  ### Visual flow
  ### Maturity table
## Section 2 — Work item types
## Section 3 — Cadence (Shaped Personal Kanban)
  ### Recommended starting cadence
  ### Wave overlap rule (locked)        ← added in patch
  ### Wave transition                   ← added in patch
  ### Why this shape
  ### What to adjust first
## Section 4 — Definition of Ready (DoR)
## Section 5 — Definition of Done (DoD)
## Section 6 — Document lifecycle (what gets created when)
## Section 7 — Backlog tagging
  ### Tag format
## Section 8 — How this process evolves
  ### Rules for changing the process
  ### What never changes
## Quick reference
```

> Note: a stray `## Add group polls` heading appeared in the scan — that's the inline code-block example in §7's "Tag format" subsection (it's inside a fenced code block but the regex caught it). Cosmetic only.

---

## 5. `docs/products/` structure — verified

```
products/
├── android/.gitkeep
├── game/.gitkeep
├── ios/.gitkeep
├── web/.gitkeep
└── README.md
```

| Check | Result |
|---|---|
| `products/ferd/` exists? | ❌ (correctly removed) |
| `products/hamn/` exists? | ❌ (correctly removed) |
| `products/web/` exists? | ✅ |
| Subfolders | `android`, `game`, `ios`, `web` (clean) |

---

## 6. `ferd`/`hamn` as PRODUCT identifiers in live docs

**Search excluded:** `docs/old_*/`, `docs/TMP/`. **Patterns hunted:** `products/ferd`, `products/hamn`, `product: ferd`, `product: hamn`, `Product tag: ferd`, `` `ferd` ·``, `` `hamn` ·``.

Two raw hits, **both legitimate (not product misuse):**

| File:line | Context | Verdict |
|---|---|---|
| `planning/PROCESS.md:197` | `` \| **Wave** *(optional)* \| `ferd` · `eid` · `hamn` · ... `` | ✅ Legitimate **wave** tag list, not product list |
| `templates/domain-service-spec.md:38` | Path link `../../old_products/ferd/sessions/2026-04-08-...` | ⚠️ Real path to a parked file. Will need updating in Phase 4 when that session bridge migrates |

**Conclusion: zero product-tag misuse.** No `products/ferd`, no `products/hamn`, no `product:ferd`, no `product:hamn` anywhere in live docs.

---

## 7. `docs/architecture/decisions/`

```
README.md
PENDING.md   ← queued: "Wave overlap rule" ADR (to be promoted in Phase 4)
```

No numbered ADRs yet. The 22 `ADR-U***` files in `docs/old_universe/decisions/` will migrate here in Phase 4.

---

## 8. Repo-root documentation files

```
CHANGELOG.md
CLAUDE.md
PROJECT_STATUS.md
README.md
SPRINT.md
folders_and_files.md   ← unclear purpose, candidate for review
```

Per the agreed Phase 4 plan: **`SPRINT.md` and `PROJECT_STATUS.md` move to `docs/old_planning/`** (or equivalent parked location) at migration time. `CLAUDE.md` and `README.md` stay at root but get rewritten to point at the new structure. `CHANGELOG.md` stays. `folders_and_files.md` needs a decision (looks like a generated/scratch file).

---

## Phase 4 readiness summary

| Item | Status |
|---|---|
| Phase 1 scaffold | ✅ |
| Phase 2 PROCESS.md | ✅ + wave overlap patch |
| Phase 3 templates + verticals | ✅ |
| Wave-name leakage in live docs | ✅ Clean |
| Untracked sessions in `old_products/ferd/sessions/` | ✅ Resolved in commit `04b1013` |
| Parked SVG diagrams | ✅ Resolved in commit `04b1013` |
| `docs/TMP/` content | ⚠️ Untracked, needs triage decision |
| Stale path link in `templates/domain-service-spec.md:38` | ⚠️ Will resolve naturally during Phase 4 migration |
| 322 parked files awaiting migration mapping | ⏳ Phase 4 work |

**Recommended Phase 4 first step:** build a fresh inventory mapping `old_*` → new paths before any `git mv` operations. The mapping should list every parked file, its proposed new home, and any reference-rewrite implications.

---

*Generated 2026-04-08 as a checkpoint between Phase 3 and Phase 4 of the doc restructure. Lives in `docs/TMP/` because TMP is the catch-all for in-flight planning artifacts; will be either archived or promoted into a more permanent location once Phase 4 completes.*
