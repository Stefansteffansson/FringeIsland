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
  validate that the active tree is consistent with the latest architectural decisions.
  Also fires automatically at cycle boundaries (part of the cooldown-week ritual, per
  PROCESS.md §3) and on-demand after any cross-cutting change — renames, terminology shifts,
  schema migrations, folder restructures, tree archivings, file deletions, or ADR-triggered
  document moves. Produces a summary suitable for pasting into the cycle retrospective.
---

# Doc Health Check

This skill performs a periodic audit of the FringeIsland documentation tree to catch drift — stale paths, terminology that moved on, concepts that have been retired, active references into archived trees, references to deleted files, README indexes that no longer match their directories, missing entity docs, unfilled Implementation notes in shipped features, parked items whose reason no longer holds, and broken cross-references.

The skill is the execution layer for the "Continuous learning and quality" goal (B2) as it applies to documentation. PROCESS.md §3 names the cycle boundary as the baseline cadence; this skill runs the checks.

The skill has nine sections. Three (1.5, 3.5, 3.6) exist to catch drift introduced by decisions — concept retirements, tree archivings, file deletions. One (7) protects architectural scaffolding from being pruned as drift: intentional placeholders (files the design expects to exist but that haven't been authored yet) are registered there so references to them are correctly read as scaffolding rather than broken links. These four sections — 1.5, 3.5, 3.6, and 7 — were the gaps that caused the 2026-04-17 first-invocation miss on root `CLAUDE.md` and the sub-folder `CLAUDE.md` erosion concern.

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
| On-demand, any time | Any subset — the skill is cheap to invoke partially |

**Skip a section** when nothing has triggered it since the last run. Don't skip all eight just because the cycle was quiet — a quiet cycle is still worth 15 minutes of checking. **Never skip Section 1.5 or 3.6 after a refactor session** — those are the sections that catch the drift a refactor is most likely to introduce.

## Scope

**In scope (edit targets):**
- All active `.md` files under `docs/` (ecosystem + planning trees)
- Root files: `README.md`, `AGENTS.md`, `CLAUDE.md`, per-tier `CLAUDE.md` files
- Skill files under `.claude/skills/*/SKILL.md`
- Templates under `docs/templates/`

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
     --include="*.md" \
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

### Procedure

1. For each row in the table above, grep the active tree for the keyword(s):
   ```
   grep -rniI "<keyword>" docs/ .claude/skills/ AGENTS.md CLAUDE.md README.md CHANGELOG.md \
     --include="*.md" \
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

1. Scan for markdown link targets that don't resolve:
   - Relative links to `.md` files — verify target exists
   - Links to sections (`#anchor`) — verify the heading still exists in the target file
   - Links to skill files — verify `.claude/skills/{name}/SKILL.md` exists
2. For each broken link, fix the target or remove the link.

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
| `docs/products/hub/SPECIFICATION.md` | Hub technical build spec | Referenced by `products/hub/DESCRIPTION.md`, `products/hub/README.md`, `docs/products/CLAUDE.md` | T3.3 (deferred at 2026-04-17 WoW review) |
| `docs/products/hub/ROADMAP.md` | Hub NOW/NEXT/LATER | Referenced by `products/hub/DESCRIPTION.md`, `products/hub/README.md` | T3.4 (deferred at 2026-04-17 WoW review) |
| `docs/products/gimbal/DESCRIPTION.md` | Gimbal product identity | Expected per `products/gimbal/README.md`; product is planned, not yet scoped | Pending — wave Eid+ |
| `docs/products/gimbal/SPECIFICATION.md` | Gimbal build spec | Expected per product-tier pattern | Pending — wave Eid+ |
| `docs/products/gimbal/ROADMAP.md` | Gimbal roadmap | Expected per product-tier pattern | Pending — wave Eid+ |
| `docs/products/game/DESCRIPTION.md` | Game product identity | Expected per `products/game/README.md`; scope TBD | Pending — wave TBD |
| `docs/platform/core/SPECIFICATION.md` | Platform Core technical spec | Referenced by PROCESS.md §5 DoD ("Platform Specification updates for shared API surface changes") | Pending |
| `docs/platform/core/ROADMAP.md` | Platform Core roadmap | Expected per platform-tier pattern | Pending |
| `docs/studios/journey-studio/DESCRIPTION.md` | Journey Studio identity | Expected per `studios/journey-studio/README.md` ("to be written") | Pending — wave Eid+ |
| `docs/studios/journey-studio/SPECIFICATION.md` | Journey Studio build spec | Expected per `studios/journey-studio/README.md` ("to be written") | Pending — wave Eid+ |
| `docs/studios/universe-studio/DESCRIPTION.md` | Universe Studio identity | Expected per `studios/universe-studio/README.md` ("to be written") | Pending — wave Eid+ |
| `docs/studios/universe-studio/SPECIFICATION.md` | Universe Studio build spec | Expected per `studios/universe-studio/README.md` ("to be written") | Pending — wave Eid+ |
| `docs/studios/arc-studio/DESCRIPTION.md` | Arc Studio identity | Expected per `studios/arc-studio/README.md` ("to be written") | Pending — wave Urd |
| `docs/studios/arc-studio/SPECIFICATION.md` | Arc Studio build spec | Expected per `studios/arc-studio/README.md` ("to be written") | Pending — wave Urd |

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

**Skip if:** No new architectural placeholders have been introduced, no registry entries have been authored (and thus need removal), and no entity has moved from "planned" to "active" since the last check. Default is to run the registry review briefly — it's cheap, and the erosion loop it prevents is expensive.

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
- **`ecosystem-decomposition` skill** — defines what each entity needs at Level 2 (Section 6 enforces it)
- **`feature-development` skill** — responsible for setting `maturity: 6-done` correctly with Implementation notes filled in (Section 5 catches failures)
- **AGENTS.md** — cross-check rule: when a grep returns no hits, confirm with a direct listing before concluding something is absent. Section 3.6 applies this rule explicitly (cross-check the deleted-files table against disk every run).

## Known gaps / skill calibration

Session 1 of the 2026-04-17 way-of-working refactor surfaced three blind spots in the skill's original design:

1. **Scope exclusion conflated "don't edit" with "don't detect."** The original `--exclude-dir=old_*` pattern prevented fixes inside archived trees (correct) but also prevented detection of active files referencing those trees (incorrect). Fixed by splitting Scope into "edit targets" and "detection targets," and adding Section 3.5.

2. **Workflow-file detection was keyword-scoped to archived-path results.** The skill looked for deleted filenames like `BOOT_UP.md` but didn't recognise hits where the path prefix was in `old_*`. Fixed by Section 3.6, which explicitly scans active files for deleted filenames and treats any directive reference as a finding regardless of the path prefix inside the reference.

3. **"Terminology drift" (Section 1) couldn't model obsoleted *concepts*.** Section 1 handles renames (A → B). It doesn't handle whole workflows being retired ("boot-up ritual no longer exists as a concept, not just renamed"). Fixed by Section 1.5.

4. **README index file-count lag.** (Surfaced 2026-04-17 Session A Step 1.) Section 3's README-sync procedure checks that every file listed in a README still exists on disk, but does not check the inverse — that every file on disk is listed in the README. `docs/planning/sessions/README.md` passed its Section 3 check despite being ~10× out of date (4 files listed, 43+ files actually present), because all 4 listed files did still exist. The inverse check — directory listing vs. README content — catches drift like this. **Mitigation:** in Section 3's README-sync procedure, add as step 2.5 after the existing steps: "Compare total README entries against directory listing count. If the ratio is off by more than ~20%, the README is lagging and needs a refresh pass even if no individual entry is broken." A stricter version would list every file on disk in the README; a lighter version tolerates curated subsets but at least flags the count gap. The lighter version is probably correct default.

These gaps allowed the root `CLAUDE.md` file to pass the 2026-04-17 first-invocation check despite having nine separate stale references (four to deleted workflow files, the Sprint Agent handoff, the PRODUCT_SPEC.md + REQUIREMENTS.md model, etc.). The user caught them by eye during review. The skill has been updated; next invocation should catch all nine.

If future runs reveal further blind spots, document them here before fixing, so the pattern of the failure is captured alongside the fix.
