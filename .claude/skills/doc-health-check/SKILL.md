---
name: doc-health-check
description: >
  Runs the periodic health audit across FringeIsland's active documentation tree to catch
  drift before it accumulates. Use this skill whenever someone asks to: run a doc health check,
  audit the docs, check for stale references, verify README indexes, find broken links in docs,
  check for orphaned files, review parked features, look for unfilled Implementation notes,
  verify documentation consistency, check for references to deleted files, find active references
  into archived trees (old_products, old_universe, old_implementation), check for obsoleted
  concepts or retired workflows (Sprint Agent, boot-up ritual, PRD as an artifact, etc.), or
  validate that the active tree is consistent with the latest architectural decisions, or
  verify the CLAUDE.md cascade (entity-CLAUDE coverage, tier-file content categorisation, load-order pointer integrity).
  Also fires automatically at cycle boundaries (part of the cooldown-week ritual, per
  PROCESS.md §3) and on-demand after any cross-cutting change — renames, terminology shifts,
  schema migrations, folder restructures, tree archivings, file deletions, ADR-triggered
  document moves, or CLAUDE.md authoring/restructuring. Produces a summary suitable for
  pasting into the cycle retrospective.
---

# Doc Health Check

This skill performs a periodic audit of the FringeIsland documentation tree to catch drift — stale paths, terminology that moved on, concepts that have been retired, active references into archived trees, references to deleted files, README indexes that no longer match their directories, missing entity docs, unfilled Implementation notes in shipped features, parked items whose reason no longer holds, and broken cross-references.

The skill is the execution layer for the "Continuous learning and quality" goal (B2) as it applies to documentation. PROCESS.md §3 names the cycle boundary as the baseline cadence; this skill runs the checks.

The skill has ten sections. Three (1.5, 3.5, 3.6) exist to catch drift introduced by decisions — concept retirements, tree archivings, file deletions. One (7) protects architectural scaffolding from being pruned as drift: intentional placeholders (files the design expects to exist but that haven't been authored yet) are registered there so references to them are correctly read as scaffolding rather than broken links. These four sections — 1.5, 3.5, 3.6, and 7 — were the gaps that caused the 2026-04-17 first-invocation miss on root `CLAUDE.md` and the sub-folder `CLAUDE.md` erosion concern.

## When to run

| Trigger | Scope |
|---------|-------|
| **Cycle boundary (baseline)** | Full check — all sections below. Part of the cooldown-week ritual. Findings feed the cycle retrospective. |
| After a cross-cutting terminology change (role, entity, permission, concept) | Section 1 (Terminology drift) |
| **After a decision retires a concept, workflow, or artifact type** | Section 1.5 (Architectural drift) — and also update Section 1.5's table in the same session |
| After a schema migration (table, column, RLS policy, trigger) | Section 2 (Schema drift) |
| After a folder rename, file move, or doc restructure | Section 3 (Path references + README indexes) |
| **After archiving a tree or major set of files** | Section 3.5 (References into archived trees) |
| **After deleting files** | Section 3.6 (References to deleted files) — and also update Section 3.6's table in the same session |
| After a wave transition or significant scope shift | Section 4 (Parked items) + Section 5 (Maturity consistency) |
| After a feature ships (maturity → `6-done`) | Section 5 (Maturity consistency) applied to just that feature |
| **After scoping a new product/studio/service, or writing a feature spec that references pending structural docs** | Section 7 (Expected placeholders) — and update Section 7's registry in the same session |
| **After a feature is created, advances in maturity, or is deleted** | Section 8 (Feature-inventory summary consistency) |
| **After authoring or restructuring any `CLAUDE.md` file** | Section 9 (CLAUDE.md cascade consistency) |
| On-demand, any time | Any subset — the skill is cheap to invoke partially |

**Skip a section** when nothing has triggered it since the last run. Don't skip all ten just because the cycle was quiet — a quiet cycle is still worth 15 minutes of checking. **Never skip Section 1.5 or 3.6 after a refactor session** — those are the sections that catch the drift a refactor is most likely to introduce.

## Scope

**In scope (edit targets):**
- All active `.md` files under `docs/` (ecosystem + planning trees)
- Root files: `README.md`, `AGENTS.md`, `CLAUDE.md`, per-tier `CLAUDE.md` files
- Skill files under `.claude/skills/*/SKILL.md`
- Templates under `docs/templates/`
- **Assertion-bearing diagrams (`.svg`)** — their text labels and `<title>`/`<desc>` elements are detection AND edit targets; see the registry below

**Assertion-bearing diagrams (registry — feed it like the Section 1.5 / 3.6 tables; added 2026-06-10):**

| Diagram | What it asserts |
|---------|-----------------|
| `docs/architecture/ECOSYSTEM_ANATOMY_V5.svg` | The entity anatomy: products (equipment profiles), Universe Studio + children, DS-1..DS-7, PC-1..PC-4, verticals |
| `docs/architecture/DOMAIN_SERVICE_DEPENDENCIES.svg` | Domain-service dependency arrows + studio write-paths |
| `docs/ecosystem/how-we-work/assets/01-decomposition-cascade.svg` | The L1-L5 vertical axis + its own gap notes (incl. the open Whisp L2-placement gap) |

Three rules, learned from the 2026-06-05 Session A sweep initially MISSING the SVGs (caught 2026-06-07):
1. Every Section 1 and 1.5 sweep includes `*.svg` (the grep blocks below do this).
2. Every assertion-bearing SVG carries a current `<title>` + `<desc>` whose prose summarizes its assertions — the single greppable source of truth lives INSIDE the artifact. **No `.md` twin files** (duplicated truth drifts).
3. A new diagram that asserts structure is added to this registry in the same session that creates it.

**Out of scope (don't edit):**
- Anything under `docs/old_universe/`, `docs/old_products/`, `docs/old_implementation/` — these are archived; drift is fine
- Session files under `docs/planning/sessions/` — these are historical records; never rewrite them
- Retrospective files under `docs/planning/retrospectives/` — also historical; only update the current in-flight one if it's not yet committed
- `CHANGELOG.md` — append-only historical record; entries describing deletions / retirements / migrations are correct there, not drift. Also excluded from every detection grep (see below).
- `.claude/skills/doc-health-check/SKILL.md` (this file) — the skill's own Section 1.5 and 3.6 tables contain every keyword and filename being searched for; unfiltered grep would report false positives against the skill's own documentation. Excluded from every detection grep.

**Critical distinction — "out of scope as edit target" is NOT "out of scope as detection target":**

The archived trees should not have their content fixed. But active files **referencing** those archived trees for live workflows are a drift signal and MUST be caught. If `CLAUDE.md` tells agents to load `docs/old_products/ferd/development/BOOT_UP.md` as part of the boot-up ritual, that's a critical finding even though `BOOT_UP.md` lives in the archived tree. The fix is in `CLAUDE.md` (active), not in `BOOT_UP.md` (archived).

The same applies to references to deleted files regardless of path. Grep the full active tree for known-deleted filenames; every hit is a finding, whether the hit is in an archived-tree path reference or anywhere else.

**Sections 3.5 and 3.6 enforce this distinction.** Do not skip them on the grounds that the referenced files are archived.

---

## Section 1 — Terminology drift

**Question:** Have any role names, entity names, permission names, or core concepts been renamed since the last check?

This section catches **renames** (old term → new term). For **obsoleted concepts** (whole workflows or artifact types that Model A / later decisions retired), see Section 1.5.

Common drift patterns to watch for:
- Role renames (e.g., *Group Leader* → *Steward*, *Admin* → *DeusEx*)
- Domain term shifts (e.g., *sprint* → *cycle*, *phase* → *wave*, *product* vs *project*)
- Capitalisation drift (*FIM* vs *fim*, *Hub* vs *hub*)
- Structural concept renames (e.g., Model B → Model A; *PRD* retired in favour of *feature spec*)

### Procedure

1. List the old → new terms for this run.
2. For each pair, grep the active tree for the old term:
   ```
   grep -rniI "<old term>" docs/ .claude/skills/ AGENTS.md CLAUDE.md README.md \
     --include="*.md" --include="*.svg" \
     --exclude-dir=old_universe --exclude-dir=old_products --exclude-dir=old_implementation \
     --exclude-dir=sessions --exclude-dir=retrospectives \
     --exclude=".claude/skills/doc-health-check/SKILL.md" \
     --exclude="CHANGELOG.md"
   ```
   Exclude this file (`SKILL.md`) and `CHANGELOG.md` for the same reasons as Section 1.5 — the skill lists old terms in its examples (drift would be false-positive there), and the CHANGELOG is an append-only record.
3. For each hit, decide: rename in place, or leave as-is (quotations, historical references in explanatory paragraphs, glossary-of-old-terms entries). If in doubt, rename.
4. Verify no code references use the old name (grep `app/`, `components/`, `lib/`, `supabase/`).

**Skip if:** No renames happened since the last check.

---

## Section 1.5 — Architectural drift (obsoleted concepts)

**Question:** Do any active files still describe workflows, artifacts, or rituals that Model A (or a later decision) retired?

This is subtler than Section 1 because there's no "old term → new term" mapping. An obsoleted concept is a whole *thing* that no longer exists in the system — a workflow file, an artifact type, a ritual, a role that's been dissolved. Grep for a surviving keyword, read the surrounding context, and judge whether the reference is describing a current practice (stale) or a historical one (fine).

### Known obsoleted concepts (as of 2026-04-17)

| Concept | What it used to be | Current state | Keyword to grep |
|---------|--------------------|--------------|-----------------|
| **Boot-up / close-down ritual** | Mandatory session-start/end protocol tied to `BOOT_UP.md` + `CLOSE_DOWN.md` | Retired in T1.13; replaced by skills | `BOOT_UP`, `CLOSE_DOWN`, "boot up", "close-down", "boot-up ritual" |
| **Sprint Agent** | Context file describing a stepwise-plan agent for feature work | Retired; replaced by `feature-development` skill | `Sprint Agent`, `sprint-agent.md`, `agents/contexts/` |
| **`SPRINT.md`** | Per-sprint active-work file at repo root | Deleted April 11 2026; cycles replace sprints | `SPRINT.md`, "Sprint file", "update SPRINT" |
| **`PROJECT_STATUS.md`** | Rolling project-state dashboard | Not maintained as a file; state is generated on demand | `PROJECT_STATUS.md` |
| **`PRODUCT_SPEC.md` + `REQUIREMENTS.md`** | Two-file product authoritative spec (pre-Model-A) | Superseded by `DESCRIPTION.md` + `SPECIFICATION.md` under each product | `PRODUCT_SPEC.md`, `REQUIREMENTS.md` |
| **Separate behavior specs** (`docs/specs/behaviors/*.md`) | Standalone files for Given/When/Then behaviors | Stories embedded inline in feature specs under Model A | "behavior spec", "behaviour spec", `specs/behaviors/` |
| **Agent playbooks** (`agents/contexts/`) | Per-agent context files (sprint-agent, close-down agent, etc.) | Replaced by skills under `.claude/skills/` | `agents/contexts/`, "agent playbook" |
| **PRD + separate user story** | Two-file feature artifact (PRD.md + user-story.md) | Retired by DECISION-01; single feature-spec.md with stories embedded | `prd.md`, `prds/`, `user-story.md`, "PRD" as a current artifact type |
| **`backlog/discovery.md`, `backlog/product.md`, `backlog/icebox.md`** | Flat backlog files as the home for maturity 0–4 items | Feature specs in the ecosystem tree are the home; parking is a YAML flag | `discovery.md`, `product.md`, `icebox.md` |
| **Four workflow files** (`BOOT_UP.md`, `CLOSE_DOWN.md`, `DOC_HEALTH_CHECK.md` old, `WORKFLOW.md`) | Standalone workflow markdown files | Deleted 2026-04-17; replaced by skills. The containing directory `docs/planning/workflows/` was also deleted. | See Section 3.6 for the deleted-file check |
| **`docs/planning/workflows/` directory** | Home for operational-playbook markdown files | Deleted 2026-04-17; skills under `.claude/skills/` are the canonical execution-mechanics home (per DECISION-02). Directory no longer exists on disk. | `planning/workflows`, `workflows/` (when referring to the planning subdirectory) |
| **Phase 1/2/3/4 model** | Sequential phase progression for the platform | Superseded by Wave model (Ferd → Eid → … → Urd) | "Phase 1", "Phase 2", "Phase 1.5", "phase timeline" (outside wave context) |
| **The Game as a product** (added 2026-06-10) | Third product entity (Unreal Engine, prefix GM, `docs/products/game/`) | Retired by ADR-U025 — the Game is a depth setting of journeys, not a product; GM prefix retired | "The Game" as a current product, `FEAT-GM`, `products/game` |
| **Device sub-entities** (added 2026-06-10) | `gimbal/ios/` + `gimbal/android/` as cascade sub-entities | Dissolved by ADR-U025 — devices are points in equipment space; native builds are shipping targets of the one Gimbal surface | `gimbal/ios`, `gimbal/android`, "Gimbal-iOS vs Gimbal-Android" as the sub-entity canonical case |
| **Sibling-studios model** (added 2026-06-10) | Journey/Universe/Arc as three sibling studios; Universe Studio excluding Arc; "FringeIsland Studio" as the world-authoring tool | Superseded by ADR-U026 — Universe Studio is the parent/binding frame over World, Arc, Journey Studios | "three studios" as siblings, "FringeIsland Studio", flat `docs/studios/{name}` paths |
| **Three Worlds cosmology** (added 2026-06-10) | Ordinary World / Safe Harbour / The Other Side as the cosmological frame; the "three-dimensional void" | Superseded by the cosmology core (`docs/ecosystem/universe/cosmology/README.md`, ratified Session B): Ordinary World -> Shimmer -> Fringe (place 2 + place 3, near side + Beyond); the Void as the axis of separation | "Three Worlds", "Safe Harbour" (as a world), "The Other Side", "void dimensions" |
| **"Affordance" as the device-capability term** (added 2026-06-10) | The discovery log's term for what features require from devices | Renamed to **equipment** in canon (ADR-U025); plain-English "affordance" (UI affordances) remains fine | `affordance` used as the technical keying term (not ordinary UI prose) |

### Procedure

1. For each row in the table above, grep the active tree for the keyword(s):
   ```
   grep -rniI "<keyword>" docs/ .claude/skills/ AGENTS.md CLAUDE.md README.md CHANGELOG.md \
     --include="*.md" --include="*.svg" \
     --exclude-dir=sessions --exclude-dir=retrospectives \
     --exclude=".claude/skills/doc-health-check/SKILL.md" \
     --exclude="CHANGELOG.md"
   ```
   Notes:
   - Do **not** exclude `old_*` directories for this check. References to obsoleted concepts inside `old_*` are fine (those trees ARE the historical record), but a mention of *Sprint Agent* in the active `CLAUDE.md` is drift.
   - Exclude this file (`SKILL.md`) from the grep targets — the keyword table above contains every keyword being searched for, so every unfiltered run would find the skill's own documentation and report false positives.
   - Exclude `CHANGELOG.md` as a grep target because it's an append-only historical record; entries like "removed `BOOT_UP.md`" are correct there, not drift.
2. For each hit, read the surrounding context and classify:
   - **Active directive** (file tells agents/humans to do something with this concept now) — **critical finding**. Fix in-place or flag as a backlog item if the fix needs judgement.
   - **Historical narrative** (file describes what used to be the case, typically in a migration note or "updated 2026-04-XX" section) — fine as-is.
   - **Glossary / retrieval helper** (file explains the old term so future contributors understand legacy references) — fine as-is, ideally tagged as such.
3. For any active directive:
   - If the fix is a one-line path replacement or keyword substitution, apply it.
   - If the fix requires rewriting a section (e.g., an entire "Session Management" subsection that depends on retired ritual files), create a backlog item and flag as high priority. Do NOT patch such sections inline — partial rewrites leave internally inconsistent prose.

### Adding to this table

Whenever a decision retires a concept, add a row to the table above in the same session that locks the decision. This is the skill's only defence against its own knowledge going stale — the table must be fed.

**Skip if:** No decisions have retired concepts since the last check AND you're confident the existing table is complete. Default is to run the check; the cost is one grep per row.

---

## Section 2 — Schema drift

**Question:** Were any tables added/dropped, columns changed, RLS policies modified, or migrations applied since the last check?

### Procedure

1. List the schema changes from the migrations applied this cycle (look in `supabase/migrations/` for new files).
2. For each change, verify the following docs describe it correctly:
   - `docs/platform/core/SPECIFICATION.md` (once it exists — see T3.3 in the 2026-04-17 session notes)
   - `docs/platform/domain/{service}.md` for any domain-service surface
   - The feature spec(s) whose stories introduced the change (look for `FEAT-*.md` files referencing the migration)
3. If a migration dropped something, grep for references to the dropped artifact and either remove them or update them.
4. If a new table was added without RLS, that's a DoD failure — flag it as a backlog item, don't try to fix it in the doc pass.

**Skip if:** No schema changes happened since the last check.

---

## Section 3 — Path references + README indexes

**Question:** Have any files been moved, renamed, or added? Do README directory listings match what's actually on disk?

### Procedure — stale paths

1. Build the mapping of moves/renames since last check (from commit history or session notes).
2. For each old path, grep the active tree for that path substring.
3. Fix every hit that isn't in `sessions/`, `retrospectives/`, or the `old_*` trees.

### Procedure — README index synchronisation

README files at these locations are expected to list their directory contents (or a curated subset) accurately:

| README | Expected to reflect |
|--------|---------------------|
| `docs/README.md` | Top-level ecosystem + planning map |
| `docs/ecosystem/README.md` | Files directly under `ecosystem/` |
| `docs/products/README.md` | All product subdirectories + their status |
| `docs/products/{name}/README.md` | Files and subdirectories under that product |
| `docs/platform/README.md` | Core + domain structure |
| `docs/platform/core/README.md` | Core tier contents |
| `docs/platform/domain/README.md` | Domain service files |
| `docs/studios/README.md` | All studio subdirectories |
| `docs/studios/{name}/README.md` | Files under that studio |
| `docs/design-system/README.md` | Design system contents |
| `docs/verticals/README.md` | Vertical spec files |
| `docs/architecture/README.md` | Architecture docs + decisions/ |
| `docs/templates/README.md` | All templates with use-when descriptions |
| `docs/planning/README.md` | Planning tree structure |
| `docs/planning/waves/README.md` (if present) | Wave files + status |
| `docs/planning/retrospectives/README.md` | Retro scales + naming conventions |
| `docs/planning/reference/README.md` | Reference snapshots |
| `docs/planning/backlog/README.md` | Task lifecycle guidance |
| Per-`features/` README | Feature specs in that owner's directory |

For each README in this list:
1. Compare its listed contents against a direct directory listing.
2. Any file present on disk but not in the README: add it.
3. Any file in the README but not on disk: remove the reference.
4. Check one-line descriptions are still accurate.

### Procedure — broken cross-references

1. Scan the active tree for markdown link targets that don't resolve:
   - **Relative links to `.md` files** — verify the target file exists at the cited path. ADR citations, skill citations, sibling-spec citations, and template citations are particularly prone to this failure mode: filenames drift over time and authors often cite a filename inferred from the file's *description* rather than verified from a directory listing.
   - **Links to sections** (`#anchor`) — verify the heading still exists in the target file.
   - **Links to skill files** — verify `.claude/skills/{name}/SKILL.md` exists.
   - **Links to anatomy diagrams or other binary architecture artifacts** — verify the file exists at the cited path.
2. Cross-check expected-placeholder targets against Section 7's registry. A relative link to a registry entry is scaffolding, not a broken cross-reference — record under "Placeholders confirmed scaffolding," not under critical findings.
3. For each genuinely broken link, fix the target or remove the link. When fixing, **verify the corrected filename against a directory listing** — do not infer it from another stale citation.
4. **Watch for citation-by-inference patterns.** When the same wrong filename appears in multiple files, the failure mode was usually "author A cited the filename from memory; authors B, C, D copied A's citation without verifying." Surface multi-hit broken-link clusters as a finding worth its own line in the output — they suggest a citation discipline gap, not just an isolated drift.

**Skip if:** No files moved, no READMEs touched, and no new features/docs added.

---

## Section 3.5 — References into archived trees (active → archived leak)

**Question:** Do any active files point at `docs/old_universe/`, `docs/old_products/`, or `docs/old_implementation/` for live workflows?

This is the complement of Section 3. Section 3 checks that active paths resolve. Section 3.5 checks that active files **aren't depending on archived paths for current work**. The two are different failure modes: Section 3 catches "I moved a file and forgot to update its referrers"; Section 3.5 catches "I archived a whole tree but some active files still treat it as current."

An active file referencing an archived path is only a problem when the reference is **directive** — i.e., the active file is telling agents or humans to load, follow, update, or treat-as-authoritative something in the archived tree. Historical notes ("this used to live in `old_products/` before the April 12 migration") are fine.

### Procedure

1. Grep the active tree for any `old_*/` path reference:
   ```
   grep -rnI "old_universe/\|old_products/\|old_implementation/" \
     docs/ .claude/skills/ AGENTS.md CLAUDE.md README.md \
     --include="*.md" \
     --exclude-dir=old_universe --exclude-dir=old_products --exclude-dir=old_implementation \
     --exclude-dir=sessions --exclude-dir=retrospectives \
     --exclude="CHANGELOG.md"
   ```
   Exclude `CHANGELOG.md` because it's an append-only historical record; migration notes describing the `old_*/` tree move are correct there, not drift.
2. For each hit, read the surrounding context and classify:
   - **Directive reference** ("load `docs/old_products/.../X.md`", "update `docs/old_implementation/shared/Y.md`", table row listing the path as authoritative) — **critical finding**.
   - **Historical reference** ("previously lived in `old_products/`", "migrated from `old_universe/` on April 12") — fine.
   - **Comparison reference** ("unlike the old_implementation approach, we now…") — fine.
3. For directive references:
   - If the replacement is obvious and local (e.g., a single link needs repointing to the new tree), fix in-place.
   - If the replacement requires rewriting a section (the original `docs/old_products/X.md` no longer exists, or its replacement is a skill rather than a file, or the whole workflow being described has been retired) — flag as a backlog item. Do NOT fix inline; the fix requires judgement about the current Model A equivalent and may require coordinating with Section 1.5 findings.

### Why this check exists

The skill's path-exclusion logic was originally designed to prevent edits to archived content. That was correct. But it accidentally excluded active files from having their `old_*/` references detected, because the grep invocation in Section 3 was typically written with `--exclude-dir=old_*`, which excludes both the archived files *and* any active file whose line of interest matches the pattern. This section fixes that by scanning active files **for** `old_*/` path substrings — the opposite direction.

**Skip if:** No archived trees exist (rare), or a prior run confirmed zero directive references and nothing has changed since.

---

## Section 3.6 — References to deleted files

**Question:** Do any active files reference files that have been deleted from the tree?

This is different from Section 3 (README sync) because it doesn't require knowing the delete-log up front. It's a positive check: maintain a small list of **known deleted filenames** (with the sessions in which they were deleted), and grep the active tree for each one.

### Known deleted files (as of 2026-04-17)

| Filename | Deleted in | Original location | Replacement |
|----------|-----------|-------------------|-------------|
| `BOOT_UP.md` | T1.13 (2026-04-17) | `docs/planning/workflows/` (directory also deleted) | Skills (no direct replacement; boot-up ritual retired) |
| `CLOSE_DOWN.md` | T1.13 (2026-04-17) | `docs/planning/workflows/` (directory also deleted) | Skills + cycle-boundary checklist in PROCESS.md §3 |
| `DOC_HEALTH_CHECK.md` (old) | T1.13 (2026-04-17) | `docs/planning/workflows/` (directory also deleted) | `.claude/skills/doc-health-check/SKILL.md` (this file) |
| `WORKFLOW.md` | T1.13 (2026-04-17) | `docs/planning/workflows/` (directory also deleted) | `feature-development` + `ecosystem-decomposition` skills |
| `user-story.md` | T1.9 (2026-04-17) | `docs/templates/` | Stories embedded inline in `feature-spec.md` |
| `SPRINT.md` | April 11 2026 | Repo root | Cycles (PROCESS.md §3); per-cycle content in `docs/planning/cycles/cycle-current.md` |
| `ROADMAP.md` (old, repo-root or old_products tree) | April 11 2026 | Repo root + `docs/old_products/ferd/planning/` | Product-specific `ROADMAP.md` files under `docs/products/{name}/` (when written) + ecosystem roadmap (when written) |
| `sprint-agent.md` | Retired with agent-playbook model | `docs/old_products/ferd/development/agents/contexts/` | `feature-development` skill |
| `docs/products/game/README.md` + `CLAUDE.md` + `features/README.md` | Session B G-2 (2026-06-10, commit 50a5dae) | `docs/products/game/` (directory deleted) | ADR-U025 + `PRODUCTS_AND_PLATFORM.md` carry the Game-as-depth lock and revisit trigger |
| `docs/products/gimbal/ios/README.md` + `docs/products/gimbal/android/README.md` | Session B G-2 (2026-06-10, commit 50a5dae) | `docs/products/gimbal/{ios,android}/` (directories deleted) | `docs/products/gimbal/` (the one senses surface; native iOS/Android are shipping targets, ADR-U025) |

### Procedure

1. For each row in the table above, grep the **full active tree** for the filename:
   ```
   grep -rnI "<filename>" docs/ .claude/skills/ AGENTS.md CLAUDE.md README.md \
     --include="*.md" \
     --exclude-dir=old_universe --exclude-dir=old_products --exclude-dir=old_implementation \
     --exclude-dir=sessions --exclude-dir=retrospectives \
     --exclude=".claude/skills/doc-health-check/SKILL.md" \
     --exclude="CHANGELOG.md"
   ```
   Notes:
   - Unlike Section 3.5, this check DOES exclude `old_*` — references to deleted files inside the archived trees are expected (the archive is a frozen record of the pre-deletion state). The goal here is to catch references in active files.
   - Exclude this file (`SKILL.md`) from the grep targets — the table above names every filename being searched for, so an unfiltered run would always find the skill's own documentation and report false positives.
   - Exclude `CHANGELOG.md` as a grep target because it's an append-only historical record; entries like "removed `BOOT_UP.md`" are correct there, not drift.
2. For each hit, classify:
   - **Directive reference** (link, "load X", "update X", table row presenting X as authoritative) — **critical finding**. Fix or flag.
   - **Historical / migration note** ("X was deleted in T1.13 and replaced by Y") — fine.
3. For directive references, apply the "Replacement" column as the fix target where possible. Where the replacement is "no direct replacement" (e.g., boot-up ritual), the fix is to remove or rewrite the surrounding section, not to repoint the link. Flag as a backlog item.
4. **Cross-check the deleted-files table with actual disk state**: for each filename in the table, confirm via direct listing that the file is indeed absent from its original location (per AGENTS.md cross-check rule). If a file reappears, remove its row from the table.

### Adding to this table

Whenever a file is deleted, add a row to the table above in the same session that performs the deletion. This is the skill's only defence against its own knowledge going stale — the table must be fed, just like Section 1.5's.

**Skip if:** No files were deleted since the last check AND you're confident the existing table is complete.

---

## Section 4 — Parked items review

**Question:** Do parked features still have a valid `parked_reason`? Is anything parked that should be un-parked?

Under Model A (see PROCESS.md §1), the icebox is a YAML flag, not a separate file.

### Procedure

1. Grep the active tree for `parked: true`:
   ```
   grep -rlI "^parked: true" docs/products/ docs/platform/ docs/studios/ docs/design-system/ docs/verticals/ --include="*.md"
   ```
2. For each parked feature, open the spec and read its `parked_reason`.
3. Decide one of:
   - **Still parked, same reason** — leave untouched.
   - **Still parked, reason has evolved** — update `parked_reason` to reflect current thinking.
   - **Un-park** — remove both `parked: true` and `parked_reason` from frontmatter. Note in the cycle retro why.
   - **Drop the spec entirely** — if the feature is no longer relevant at all and will never return, delete the file. This is rare; prefer un-park-and-reduce-scope over deletion.
4. Flag any parked feature with missing `parked_reason` — that's a hard rule violation (DECISION-11 requires both fields together).

**Skip if:** No parked items exist in the tree.

---

## Section 5 — Maturity consistency

**Question:** Does each feature spec's internal state match its declared YAML `maturity:`?

Under Model A, maturity is a declaration. This section verifies the declaration matches reality.

### Procedure

For each feature spec (grep `docs/**/features/FEAT-*.md`):

1. **`maturity: 0-raw` or `1-concept`** — expect: minimal content, possibly just a one-sentence Problem section. No stories required. No check needed beyond "does the frontmatter exist."

2. **`maturity: 2-explored`** — expect: Problem filled in, Solution sketch present (forward-looking specs), risks or rabbit holes noted. Verify: Solution sketch section is not empty.

3. **`maturity: 3-specified`** — expect: Stories with Given/When/Then acceptance criteria. Verify: at least one Story section with acceptance criteria bullets. No unchecked placeholder text (`{role}`, `{capability}`, `{benefit}`).

4. **`maturity: 4-ready`** — expect: all of 3-specified, plus DoR compliance (PROCESS.md §4). Verify: no open questions marked in the spec, stories are concrete.

5. **`maturity: 5-in-cycle`** — expect: corresponding tasks exist in `docs/planning/backlog/tasks/TASK-*.md` with `feature: FEAT-{id}` in their frontmatter. Verify: at least one task file references this feature.

6. **`maturity: 6-done`** — expect: Implementation notes section is filled in; Solution sketch / Appetite / Rabbit holes may be omitted per the template's retroactive mode. Verify: Implementation notes section exists and is non-empty. Flag as a critical drift item if a `6-done` spec has an empty Implementation notes section.

### Also verify

- `owner:` field is set and points at a valid owner in the ecosystem tree
- `consumers:` field is a list (possibly empty) with only products/studios listed (not platform services)
- `wave:` field names one of the six waves
- `maturity:` value is one of the seven canonical values (`0-raw` through `6-done`)

**Skip if:** No new feature specs written and no specs advanced maturity since last check.

---

## Section 6 — Entity coverage

**Question:** Does every active entity have the docs it's expected to have?

| If an entity is... | It needs... |
|--------------------|-------------|
| A product with a `DESCRIPTION.md` | That description should still accurately describe the product's identity |
| A product in active development (has a `features/` directory with content) | `SPECIFICATION.md` + `ROADMAP.md` (per `ecosystem-decomposition` skill Level 2) |
| A domain service with a `{name}.md` under `docs/platform/domain/` | That spec should describe its current surface |
| A studio with a `DESCRIPTION.md` | That description should describe its scope + lifecycle |
| A vertical with a spec under `docs/verticals/` | That spec should list all features tagged with it |

### Procedure

1. Walk `docs/products/`, `docs/studios/`, `docs/platform/domain/`, `docs/verticals/`.
2. For each subdirectory, check for the expected files.
3. Missing file + entity is pre-scope (no `features/` content, no active work): acceptable, note in the summary as "{name}: pre-scope, no DESCRIPTION.md — fine for now."
4. Missing file + entity is active (has feature specs, has work in flight): flag as a gap, add a task to the next cycle.

**Skip if:** No entities changed status (no new products scoped, no studios activated) since last check.

---

## Section 7 — Expected placeholders

**Question:** Do any active files reference structural documents that are architecturally expected but not yet authored — and if so, are those references being correctly treated as scaffolding rather than drift?

The FringeIsland architecture has intentional placeholders: files the design expects to exist eventually, but that haven't been written yet. Examples: `docs/ecosystem/ECOSYSTEM_ROADMAP.md` (deferred as T3.5), `docs/platform/DEPENDENCIES.md` (deferred as T4.1), per-product `SPECIFICATION.md` and `ROADMAP.md` files for products not yet in active development. References to these files in active docs (feature specs, tier-level `CLAUDE.md` files, PROCESS.md, templates) are **scaffolding, not drift** — they describe the designed structure and point future contributors at where content will land.

Without this section, Sections 3, 3.6, and 6 would flag placeholder references as broken links, missing files, or entity-coverage gaps. That would start an erosion loop: each sweep would prune more architectural scaffolding, and the designed structure would silently degrade with every run.

This section is the explicit protection.

### The expected-placeholders registry

| Path | Purpose | Why it's expected | Pending-since |
|------|---------|-------------------|---------------|
| `docs/ecosystem/ECOSYSTEM_ROADMAP.md` | Ecosystem-level NOW/NEXT/LATER roadmap | Referenced by `wave-planning` skill, `product-roadmap.md` template, `wave-spec.md` template, PROCESS.md §3 cycle-boundary checklist, PROCESS.md §6 trigger table | T3.5 (deferred at 2026-04-17 WoW review) |
| `docs/platform/DEPENDENCIES.md` | Cross-service dependency table | Referenced by `docs/platform/README.md`, `docs/platform/CLAUDE.md` Where-to-go-next | T4.1 (deferred at 2026-04-17 WoW review) |
| `docs/products/hub/ROADMAP.md` | Hub NOW/NEXT/LATER | Referenced by `products/hub/DESCRIPTION.md`, `products/hub/README.md` | T3.4 (deferred at 2026-04-17 WoW review) |
| `docs/products/gimbal/DESCRIPTION.md` | Gimbal product identity | Expected per `products/gimbal/README.md`; product is planned, not yet scoped | Pending — wave Eid+ |
| `docs/products/gimbal/SPECIFICATION.md` | Gimbal build spec | Expected per product-tier pattern | Pending — wave Eid+ |
| `docs/products/gimbal/ROADMAP.md` | Gimbal roadmap | Expected per product-tier pattern | Pending — wave Eid+ |
| `docs/platform/core/SPECIFICATION.md` | Platform Core technical spec | Referenced by PROCESS.md §5 DoD ("Platform Specification updates for shared API surface changes") | Pending |
| `docs/platform/core/ROADMAP.md` | Platform Core roadmap | Expected per platform-tier pattern | Pending |
| `docs/platform/core/infrastructure/CLAUDE.md` | PC-1 Infrastructure entity-level CLAUDE.md | Referenced by `docs/platform/core/CLAUDE.md` Where-to-go-next four-areas pointer | Pending — when area-specific rules warrant a delta |
| `docs/platform/core/identity/CLAUDE.md` | PC-2 Identity entity-level CLAUDE.md | Referenced by `docs/platform/core/CLAUDE.md` Where-to-go-next four-areas pointer | Pending — when area-specific rules warrant a delta |
| `docs/platform/domain/world-model/CLAUDE.md` | DS-1 World Model entity-level CLAUDE.md | Referenced by `docs/platform/domain/CLAUDE.md` Where-to-go-next seven-services pointer | Pending — when L2 specification is authored |
| `docs/platform/domain/narrative-engine/CLAUDE.md` | DS-2 Narrative Engine entity-level CLAUDE.md | Referenced by `docs/platform/domain/CLAUDE.md` Where-to-go-next seven-services pointer | Pending — when L2 specification is authored |
| `docs/platform/domain/experience-engine/CLAUDE.md` | DS-3 Experience Engine entity-level CLAUDE.md | Referenced by `docs/platform/domain/CLAUDE.md` Where-to-go-next seven-services pointer | Pending — when L2 specification is authored |
| `docs/platform/domain/content/CLAUDE.md` | DS-4 Content entity-level CLAUDE.md | Referenced by `docs/platform/domain/CLAUDE.md` Where-to-go-next seven-services pointer | Pending — when L2 specification is authored |
| `docs/platform/domain/communication/CLAUDE.md` | DS-5 Communication entity-level CLAUDE.md | Referenced by `docs/platform/domain/CLAUDE.md` Where-to-go-next seven-services pointer | Pending — when L2 specification is authored |
| `docs/platform/domain/discovery/CLAUDE.md` | DS-6 Discovery entity-level CLAUDE.md | Referenced by `docs/platform/domain/CLAUDE.md` Where-to-go-next seven-services pointer | Pending — when L2 specification is authored |
| `docs/platform/domain/intelligence/CLAUDE.md` | DS-7 Intelligence entity-level CLAUDE.md | Referenced by `docs/platform/domain/CLAUDE.md` Where-to-go-next seven-services pointer | Pending — when L2 specification is authored |
| `docs/platform/extensions/CLAUDE.md` | Extension System entity-level CLAUDE.md | Referenced by `docs/platform/domain/CLAUDE.md` Where-to-go-next, `docs/platform/CLAUDE.md` Where-to-go-next | Pending — when L2 specification is authored |
| `docs/studios/universe-studio/DESCRIPTION.md` | Universe Studio (parent) identity | Expected per `studios/universe-studio/README.md`; parent entity per ADR-U026 | Pending — wave Eid+ |
| `docs/studios/universe-studio/SPECIFICATION.md` | Universe Studio (parent) build spec | Expected per studio-tier pattern | Pending — wave Eid+ |
| `docs/studios/universe-studio/world-studio/DESCRIPTION.md` | World Studio identity | Entity created 2026-06-10 (ADR-U026); README exists, DESCRIPTION pending | Pending — wave Heim+ |
| `docs/studios/universe-studio/world-studio/SPECIFICATION.md` | World Studio build spec | Expected per studio-tier pattern | Pending — wave Heim+ |
| `docs/studios/universe-studio/journey-studio/DESCRIPTION.md` | Journey Studio identity | Expected per its README ("to be written"); path nested per ADR-U026 | Pending — wave Eid+ |
| `docs/studios/universe-studio/journey-studio/SPECIFICATION.md` | Journey Studio build spec | Expected per its README ("to be written") | Pending — wave Eid+ |
| `docs/studios/universe-studio/arc-studio/DESCRIPTION.md` | Arc Studio identity | Expected per its README ("to be written"); path nested per ADR-U026 | Pending — wave Urd |
| `docs/studios/universe-studio/arc-studio/SPECIFICATION.md` | Arc Studio build spec | Expected per its README ("to be written") | Pending — wave Urd |

### Procedure

1. **Before flagging a missing-file finding in Sections 3, 3.6, or 6, cross-check the registry above.** If the missing file is listed here, the reference is scaffolding — do not flag. Record in the output summary under "Placeholders confirmed scaffolding" rather than under "Critical findings."
2. **When a registry entry is authored** (someone finally writes `ECOSYSTEM_ROADMAP.md`, for example), remove its row from the registry in the same commit that adds the file. A stale registry entry pointing at a file that now exists is its own kind of drift.
3. **When a new architectural placeholder is introduced** (a decision locks a new expected structural doc), add a row to the registry in the same session that locks the decision. Same discipline as Sections 1.5 and 3.6 — the registry's value depends on it being fed.
4. **The registry is for structural placeholders, not wishlists.** A file belongs here only if (a) it has a defined purpose, (b) it is referenced by at least one active doc, and (c) its eventual authoring is committed (locked decision, roadmap entry, or session record). Speculative files that someone might write someday do not belong here — they bloat the registry and dilute its signal.
5. **Review the registry at wave boundaries.** At each wave transition (PROCESS.md §3), walk the registry and confirm each pending item still reflects current plans. Items whose purpose has evaporated (the capability was scoped out, the dependency was absorbed elsewhere) are removed. Items whose authoring should happen imminently get promoted to backlog items.

### How Sections 3, 3.6, and 6 use this registry

- **Section 3 (path + README sync)** — when a markdown link points at a registry entry, the "target exists" check passes. The link is valid scaffolding. Record it as such.
- **Section 3.6 (references to deleted files)** — before adding a filename to the deleted-file table, confirm it is not a registry entry. An expected placeholder that has never existed is not a deleted file.
- **Section 6 (entity coverage)** — missing `DESCRIPTION.md` / `SPECIFICATION.md` / `ROADMAP.md` for an entity whose files are in the registry is **not** a gap flagged as critical. It is a pending item, reported in the entity-coverage summary line as "pending (registry)" rather than "gap."
- **Section 8 (feature-inventory summary consistency)** — if an entity's `SPECIFICATION.md` is in the registry (not yet authored), Section 8's consistency check does not run for that entity. The feature-inventory summary cannot drift from its parent file if the parent file does not yet exist. Report as "pending (registry)" in the Section 8 summary line.

**Skip if:** No new architectural placeholders have been introduced, no registry entries have been authored (and thus need removal), and no entity has moved from "planned" to "active" since the last check. Default is to run the registry review briefly — it's cheap, and the erosion loop it prevents is expensive.

---

## Section 8 — Feature-inventory summary consistency

**Question:** For each active entity, does the feature-inventory summary section in its `SPECIFICATION.md` (§L4) accurately reflect the actual state of `FEAT-*.md` files under that entity's `features/` directory?

The L4 feature-inventory summary is a reconciliation output maintained by the `ecosystem-decomposition` skill (L4 write scope) and updated operationally by the `feature-development` skill at maturity transitions 4→5 and 5→6. Closes the prevention loop for the feature-inventory maintenance discipline (formerly G-21, closed 2026-06-10) by detecting drift that prevention missed.

### What counts as drift

Four drift signals, in descending order of severity:

1. **Feature-on-disk, not-in-summary.** A `FEAT-*.md` file exists under `{entity}/features/` that has no corresponding row in the summary. Either the spec was created and the summary not updated, or the summary was never written. Critical finding.
2. **Summary row, no-feature-on-disk.** The summary lists `FEAT-XYZ` but no such file exists under `features/`. Either the spec was deleted and the summary not updated, or the summary references a spec that never existed. Critical finding. Cross-check against the absorb-and-delete discipline (G-22) — if the spec was correctly deleted as part of a fresh L3 run, the summary row should also have been removed.
3. **Maturity column out of sync.** A summary row exists, a matching `FEAT-*.md` exists, but the summary's Maturity column disagrees with the spec's YAML `maturity:` field. Most often caused by maturity 4→5 or 5→6 transitions where the `feature-development` skill's step was missed. Finding; severity depends on the direction of drift (summary claims `6-done` but spec says `4-ready` is more misleading than the reverse).
4. **Capability-row missing or stale.** A capability in the §L3 inventory has no row (either no-spec-yet row with em-dashes, or a feature-spec row); or a capability has been removed from §L3 but its row survives in the summary. Lower severity; often a signal that L4 hasn't run for capabilities added in the most recent L3 revision.

### Procedure

1. **Enumerate active entities** that have both a `features/` directory with at least one `FEAT-*.md` file AND a `SPECIFICATION.md` file. Entities whose `SPECIFICATION.md` is in Section 7's registry are skipped (report as "pending (registry)" per the registry interaction note above).
2. For each such entity:
   - List `{entity}/features/FEAT-*.md` from disk. Extract the spec ID and YAML `maturity:` from each.
   - Parse the feature-inventory summary section of `{entity}/SPECIFICATION.md` (§L4). Extract rows.
   - Compute the four drift signals above by comparing the two sets:
     - (1) files on disk not in summary — by spec ID
     - (2) rows in summary with spec ID but no file on disk
     - (3) matching rows where summary Maturity ≠ spec `maturity:`
     - (4) rows with blank or em-dash capability mapping, or capabilities in §L3 with no row in §L4
3. For each drift signal:
   - **Fix in-place** if the fix is obvious: add a missing row from the spec's YAML, update a stale Maturity column value, remove a row for a non-existent spec.
   - **Flag as backlog item** if the fix requires judgement: e.g., summary row for a spec that correctly should not exist (was absorb-and-delete applied correctly?), or §L3 and §L4 diverge in ways that suggest L4 hasn't run for recent L3 changes.
4. **Cross-reference the maintenance discipline (formerly G-21)** in the output. If consistent drift is found, surface whether the drift came through the `feature-development` skill's maturity-transition step (Steps 3 and 5 of that skill) or through the `ecosystem-decomposition` skill's L4 write (creation / deletion / advance 0→4) — the pattern tells us where prevention is weakest.

### What this section does NOT do

- Does not verify that each summary row's entry is correctly *placed* under its capability in the summary table (that's L4's authorial judgement; the check verifies presence and maturity, not organisation).
- Does not verify that the §L3 capability inventory itself is current (that's L3's property — fresh derivation is not a drift-repair concern).
- Does not verify that FEAT-*.md files have the correct owner's directory (Section 3 path-reference covers that if a feature is misplaced).

### Interaction with the feature-inventory template language

The specification templates (`product-specification.md`, `domain-service-spec.md`, `platform-core-spec.md`, `studio-specification.md`, `design-system-specification.md`, `vertical-spec.md`) each point the §L4 authorship note at this check: "Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it reflects the current state of `features/`." Section 8 is the verification that closes the reference.

**Skip if:** No entity has had a FEAT-*.md created, advanced in maturity, deleted, or otherwise changed since the last check. Default is to run briefly — the check is cheap per entity.

---

## Section 9 — CLAUDE.md cascade consistency

**Question:** Does the agent-context cascade hold? Every active entity has a `CLAUDE.md`; tier files don't carry entity-specific rules; load-order pointers resolve.

The cascade is named in `ecosystem-decomposition` skill ("Agent context cascade" section) and policed by the five-row content policy in root `CLAUDE.md`. This section verifies the cascade in three dimensions: presence, content categorisation, and load-order integrity. Cheap checks (presence/absence, pointer resolution) are hard fails; expensive checks (content miscategorisation) are soft flags for human review.

### Procedure — presence check

1. List active entities under each tier: `docs/products/{name}/`, `docs/platform/core/{component}/` (if instantiated), `docs/platform/domain/{service}/` (if instantiated), `docs/studios/{name}/`, `docs/verticals/{name}/`. Design system is tier-only; the existing `docs/design-system/CLAUDE.md` *is* its entity CLAUDE.
2. For each active entity, check that `{tier}/{entity}/CLAUDE.md` exists.
3. **Cross-check absences against Section 7's expected-placeholders registry before flagging.** A `CLAUDE.md` listed in the registry is scaffolding, not drift — record it under "Placeholders confirmed scaffolding" in the output summary, not under critical findings.
4. For sub-entities with genuinely divergent rules (the canonical case since ADR-U026: Universe Studio's children `world-studio` / `arc-studio` / `journey-studio` — all three have CLAUDE.md files), check that `{tier}/{entity}/{sub-entity}/CLAUDE.md` exists. Sub-entity CLAUDE.md files are opt-in by divergence; absence is only a finding if the sub-entity is named in the parent entity's CLAUDE.md as having divergent rules. (The former canonical case, Gimbal-iOS vs Gimbal-Android, was dissolved by ADR-U025.)

Genuinely missing files (active entity, no `CLAUDE.md`, not in registry) are critical findings.

### Procedure — content categorisation check

This is a soft-flag check. The five-row content policy in root `CLAUDE.md` defines what each level must, may, and must not contain; this procedure surfaces likely violations for human review.

1. For each tier `CLAUDE.md`, scan for entity-specific patterns. Heuristic flags include: entity-named headers (e.g., "Hub-specific gotchas" in `products/CLAUDE.md`), tier-singular language ("our Hub", "the Hub" referenced as if it were the only product), or technical-stack references that apply only to one entity (`useAuth()` and `proxy.ts` are web-stack; `sb_publishable_*` is Hub-specific; tier files mentioning these without explicit "only for entity X" framing are flagged).
2. For each entity `CLAUDE.md`, scan for sibling-generalisable patterns. Heuristic flags include: rules phrased without entity-specific anchoring (a rule that applies to every product belongs in the tier file, not the entity file), or duplications of tier-file content (the entity file should read as a delta from tier, not a restatement).
3. Surface flags as soft findings. Each one needs human judgment: is the pattern genuinely miscategorised, or is it correctly placed and just visually similar to a miscategorisation pattern? Soft findings drive review at cycle boundaries; they don't auto-fix.

The reference standard: G-30 in `gaps.md` documents the known categorisation problems in `products/CLAUDE.md` and `platform/CLAUDE.md` as of 2026-05-01. Cascade-plan Session 4 is the resolution session for those known problems; Section 9 catches future drift after that resolution.

### Procedure — load-order integrity check

1. For each `CLAUDE.md` in the cascade (root, tier, sub-tier where applicable, entity, sub-entity), verify the file's load-order line cites real upstream files. Tier files cite root `CLAUDE.md` and `AGENTS.md`; entity files cite tier `CLAUDE.md`; sub-entity files cite entity `CLAUDE.md`.
2. Apply the citation-verification rule (`ecosystem-decomposition` Quality checklist; G-28): every cited file path is verified against a directory listing, never inferred from another document's citation.
3. Broken pointers are critical findings — the cascade is only as strong as its weakest pointer.

### Adding to this section

When the cascade structure changes (new tier, new sub-tier convention, new sub-entity divergence), update this section's procedures alongside the change. Same discipline as Sections 1.5, 3.6, and 7 — the section's value depends on it being fed.

**Skip if:** No `CLAUDE.md` files have been authored, restructured, or moved since the last check, AND no new entities have entered active development. Default is to run the presence check briefly — it's cheap, and the cascade-erosion failure mode it prevents is structural.

---

## Output format

After running the check, produce a summary in this shape. Paste it into the cycle retrospective under a "Doc health" heading, or into `SESSION_NOTES.md` if run on-demand.

```
Doc Health Check — <date> — <trigger>

Sections run:
1.   Terminology drift            — [N terms checked / N updates made / clean / skipped: <reason>]
1.5  Architectural drift           — [N concepts checked / N critical directives found / N fixed / N flagged as backlog / clean / skipped: <reason>]
2.   Schema drift                  — [N changes checked / N updates made / clean / skipped: <reason>]
3.   Path + README sync            — [N stale refs fixed / N README updates / clean / skipped: <reason>]
3.5  Archived-tree leak            — [N old_*/ refs found / N directive / N historical / N fixed / N flagged / clean / skipped: <reason>]
3.6  Deleted-file refs             — [N deleted filenames checked / N directive refs found / N fixed / N flagged / clean / skipped: <reason>]
4.   Parked items                  — [N parked features reviewed / N un-parked / N reason-updated / clean / skipped: <reason>]
5.   Maturity consistency          — [N specs checked / N drift items / N critical (e.g., 6-done with empty Implementation notes) / skipped: <reason>]
6.   Entity coverage               — [N entities checked / N gaps flagged / N pending-per-registry / clean / skipped: <reason>]
7.   Expected placeholders         — [N registry entries reviewed / N newly authored (removed from registry) / N newly introduced (added) / N still pending / clean / skipped: <reason>]
8.   Feature-inventory summary     — [N entities checked / N drift items / N fixed in-place / N flagged as backlog / N entities pending (registry) / clean / skipped: <reason>]
9.   CLAUDE.md cascade consistency — [N entities checked / N missing CLAUDE.md / N pending (registry) / N content-categorisation soft flags / N load-order pointer breaks / clean / skipped: <reason>]

Critical findings (sections 1.5, 3.5, 3.6, or 5 with active-directive / empty-6-done hits — **excluding** registry entries per Section 7):
- <file>:<line> — <short description> — <fix applied in-place | backlog item created>
- ...

Backlog items created (from critical findings):
- <feature spec / doc> — <what needs to happen>
- ...

Placeholders confirmed scaffolding (per Section 7 registry):
- <file>:<line> — references <registry entry> — scaffolding, not drift
- ...

Table updates made during this run:
- Section 1.5 table — <N rows added for concepts retired this cycle>
- Section 3.6 table — <N rows added for files deleted this cycle>

Notes:
- <any observations worth preserving for the next check>
```

### When to create backlog items vs fix in-place

- **Fix in-place:** stale paths, broken links, missing README entries, outdated one-line descriptions, orphaned references, terminology drift in explanatory prose, single-line Section 3.6 hits where the replacement is obvious (e.g., link update), Section 3.5 hits that need only a path repoint.
- **Create a backlog item:** missing SPECIFICATION.md or ROADMAP.md for an active product, `6-done` specs with empty Implementation notes, missing RLS on a table (DoD failure), missing vertical spec for a vertical that's been referenced, structural inconsistencies that need a decision, **Section 1.5 findings that require rewriting a whole section** (e.g., a "Session Management" block built around a retired ritual), **Section 3.6 findings where the deleted file has no direct replacement** (e.g., `BOOT_UP.md` references where the whole ritual was retired), **Section 3.5 findings where the archived-tree reference is structural** (e.g., a Document Map table row listing an `old_*/` file as "authoritative").

The rule of thumb: if fixing it takes more than 5 minutes or requires thinking, it's a backlog item — not something to do inline during the health check.

**Why this matters for sections 1.5 and 3.5/3.6 specifically:** these sections catch drift from *decisions*, not from typos. Fixing the drift often requires understanding the decision that created it, the current Model-A equivalent, and how the surrounding prose needs to change. That's the kind of work that should be its own focused pass with the session context loaded — not a side effect of a health-check run. When in doubt, flag rather than fix.

---

## Related

- **PROCESS.md §3** — cycle-boundary checklist, where this skill is invoked as part of the cooldown ritual
- **PROCESS.md §1** — Model A pipeline + `parked` YAML mechanism (Section 4 of this skill operates on it)
- **PROCESS.md §6** — trigger-artifact map (Section 6 of this skill checks coverage against it)
- **PROCESS.md §6.5** — Skills as the execution layer (Section 1.5 and 3.6 of this skill depend on the skills-over-workflows transition being complete)
- **`ecosystem-decomposition` skill** — defines what each entity needs at Level 2 (Section 6 enforces it); defines the feature-inventory summary as L4's write scope (Section 8 enforces it); defines the agent context cascade (Section 9 verifies cascade integrity)
- **`feature-development` skill** — responsible for setting `maturity: 6-done` correctly with Implementation notes filled in (Section 5 catches failures); responsible for updating the feature-inventory summary row at maturity 4→5 and 5→6 transitions (Section 8 catches failures)
- **AGENTS.md** — cross-check rule: when a grep returns no hits, confirm with a direct listing before concluding something is absent. Section 3.6 applies this rule explicitly (cross-check the deleted-files table against disk every run).
- **`docs/ecosystem/how-we-work/gaps.md`** — the feature-inventory maintenance discipline (formerly G-21, closed 2026-06-10) is what Section 8 verifies; G-22 (legacy spec absorb-and-delete) is cross-referenced by Section 8 signal (2); G-29 (lateral routing for cross-entity findings) and G-30 (tier-CLAUDE miscategorisation) are referenced by Section 9 as the routing target and the reference standard for content categorisation.

## Known gaps / skill calibration

Session 1 of the 2026-04-17 way-of-working refactor surfaced three blind spots in the skill's original design:

1. **Scope exclusion conflated "don't edit" with "don't detect."** The original `--exclude-dir=old_*` pattern prevented fixes inside archived trees (correct) but also prevented detection of active files referencing those trees (incorrect). Fixed by splitting Scope into "edit targets" and "detection targets," and adding Section 3.5.

2. **Workflow-file detection was keyword-scoped to archived-path results.** The skill looked for deleted filenames like `BOOT_UP.md` but didn't recognise hits where the path prefix was in `old_*`. Fixed by Section 3.6, which explicitly scans active files for deleted filenames and treats any directive reference as a finding regardless of the path prefix inside the reference.

3. **"Terminology drift" (Section 1) couldn't model obsoleted *concepts*.** Section 1 handles renames (A → B). It doesn't handle whole workflows being retired ("boot-up ritual no longer exists as a concept, not just renamed"). Fixed by Section 1.5.

4. **README index file-count lag.** (Surfaced 2026-04-17 Session A Step 1.) Section 3's README-sync procedure checks that every file listed in a README still exists on disk, but does not check the inverse — that every file on disk is listed in the README. `docs/planning/sessions/README.md` passed its Section 3 check despite being ~10× out of date (4 files listed, 43+ files actually present), because all 4 listed files did still exist. The inverse check — directory listing vs. README content — catches drift like this. **Mitigation:** in Section 3's README-sync procedure, add as step 2.5 after the existing steps: "Compare total README entries against directory listing count. If the ratio is off by more than ~20%, the README is lagging and needs a refresh pass even if no individual entry is broken." A stricter version would list every file on disk in the README; a lighter version tolerates curated subsets but at least flags the count gap. The lighter version is probably correct default. **(2026-06-10 refinement, TASK-DOC-002):** a README that *explicitly declares* curation — stating that the directory listing is the canonical index and the README is deliberately partial (as `docs/planning/sessions/README.md` does) — passes the count-lag check by policy; for such READMEs, check instead that the curated highlights are not stale (the newest highlighted entry should be within a wave of the newest file on disk).

These gaps allowed the root `CLAUDE.md` file to pass the 2026-04-17 first-invocation check despite having nine separate stale references (four to deleted workflow files, the Sprint Agent handoff, the PRODUCT_SPEC.md + REQUIREMENTS.md model, etc.). The user caught them by eye during review. The skill has been updated; next invocation should catch all nine.

If future runs reveal further blind spots, document them here before fixing, so the pattern of the failure is captured alongside the fix.
