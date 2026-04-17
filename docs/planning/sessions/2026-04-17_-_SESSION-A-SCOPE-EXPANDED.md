# Session — Session A: scope-expanded cleanup + sub-folder CLAUDE.md scaffolding (Session A of the way-of-working refactor)

**Date:** 2026-04-17
**Participants:** Stefan + Claude (Claude.ai) + Claude Code (CC)
**Status:** Execution complete — commit pending at write time of this bridge
**Session type:** Execution — extends Session 1 with the deferred root `CLAUDE.md` rewrite, the five sub-folder `CLAUDE.md` files the architecture has expected since Decision #7 (2026-04-09) but never authored, and the architectural-scaffolding protection (Section 7) in `doc-health-check`

**Input documents:**
- `sessions/2026-04-17_-_WAY-OF-WORKING-REVIEW.md` — the 11 locked decisions from the WoW review
- `sessions/2026-04-17_-_SESSION-1-TIER-1-CLEANUP.md` — the prior session's bridge, which deferred the root `CLAUDE.md` rewrite to "a follow-up session" and flagged the sub-folder `CLAUDE.md` gap
- `sessions/2026-04-17_-_DOC-HEALTH-CHECK-POST-SESSION-1.md` — the CC-run health-check report validating Session A's work post-commit

---

## How to use this bridge (read this first if you're a new session)

This document is both a **historical record** of Session A and the **starting point for the next session**. If you (Claude) are being opened fresh with this file uploaded, here is how to proceed:

1. **Read the whole bridge top-to-bottom.** The historical sections give you the context you need to act correctly next — what was decided, what was built, what was deliberately left for later.
2. **Check the "Open items / Next session" section** near the bottom. That's the concrete to-do list.
3. **Execute the instruction in the "Next-session instructions" section** at the very bottom. That section is written in second-person imperative — it is a direct instruction to you, not a description of an instruction.
4. **Do not relitigate locked decisions.** The 11 WoW-review decisions + the Session A decisions (scope pattern, locked skeleton, registry design) are binding. If something seems wrong, surface it as a question rather than silently overriding.

> If Stefan has uploaded this file without additional context, he almost certainly wants you to proceed with the next-session instructions at the bottom. Confirm briefly (one line) and start.

---

## Purpose

Execute the work that Session 1's bridge deferred: root `CLAUDE.md` rewrite, doc-health-sweep cleanup pass, and — as a scope expansion Stefan approved mid-session — the five sub-folder `CLAUDE.md` files, the five vertical spec scaffold cleanups, and a new Section 7 (Expected placeholders) in the `doc-health-check` skill to prevent architectural scaffolding from being pruned as drift.

After this session, the agent-routing layer (root `CLAUDE.md` + five tier-level `CLAUDE.md` files) is internally consistent with Model A; the doc-health-check skill can distinguish "drift" from "expected placeholder"; and the documentation tree passes a full doc-health sweep with only minor in-place fixes (applied during the session).

---

## What was accomplished

### Step 1 — Doc-health-check sweep (initial findings)

Ran the `doc-health-check` skill against the state left by Session 1. Heavy drift surfaced across four files, all introduced by the Session 1 refactor itself:

- **Root `CLAUDE.md`** — 11+ findings including retired "Session Management" block (boot-up/close-down ritual), Sprint Agent handoff reference, pre-refactor version pin, `old_products/` + `old_implementation/` rows in the Document Map, "Doc Structure — In Transition" section, hardcoded test/table/wave numbers.
- **`docs/README.md`** — Legacy Documentation section still described the three archived trees as "source of truth pending migration"; tree diagram still included them as if active.
- **`docs/planning/sessions/README.md`** — 4-file curated index had gone ~10× stale (43+ sessions actually present); naming convention stated incorrectly; Phase 4 language.
- **`docs/templates/domain-service-spec.md`** — Broken session-bridge path: `SESSION-BRIDGE-2026-04-10.md` → should be `2026-04-10_-_SESSION-BRIDGE.md`.

### Step 2 — Root CLAUDE.md rewrite + scope expansion

**Root `CLAUDE.md` — full rewrite.** Removed every retired construct; rewrote to Model A. New structure:
- Header with Model A framing + post-refactor date marker.
- Four-skill routing table (`ecosystem-decomposition` / `feature-development` / `wave-planning` / `doc-health-check`) with load-when guidance per skill.
- Context loading order: this file → AGENTS.md → PROCESS.md → matching skill → **tier-level CLAUDE.md** → owner README → feature spec → task file. (The tier-level step was added after the sub-folder CLAUDE.md files were written; see below.)
- Document Map promoted PROCESS.md to the top; removed the three `old_*` rows and `old_INDEX.md`.
- Architecture patterns (6 bullets): two trees never mixed; wave model (not phases); **five verticals** (one paragraph, ADR-U002 reference, points at tier CLAUDE.md files for per-tier obligations); API-first (ADR-U009); auth/components/state; critical gotchas (11 hard-won lessons retained from prior CLAUDE.md).
- Directory purpose guide (ecosystem vs. planning) preserved as the canonical disambiguation table.
- Hardcoded numbers replaced with "check the source" pointers to migrations/, tests/, and `docs/planning/waves/ferd.md`.

**Three supporting file rewrites:**
- `docs/README.md` — `old_*` rows stripped from tree diagram; Legacy Documentation section rewritten to describe the three trees as deleted with content migrated into the active trees.
- `docs/planning/sessions/README.md` — Full rewrite. Curated 4-file index dropped in favour of "directory listing is the canonical index" + a short recent-highlights list. Naming convention corrected to `YYYY-MM-DD_-_{TOPIC}.md`.
- `docs/templates/domain-service-spec.md` — One-line session-bridge path fix.
- `docs/planning/PROCESS.md` footer — removed the "Phase 2 of restructure" framing; now references today's session bridge as the state marker.

### Bonus work (Option A) — five sub-folder CLAUDE.md files

**Decision cascade that led here.** During Step 2, Stefan asked whether to address the sub-folder `CLAUDE.md` gap now or defer. Three options considered:
- **Option A** — shallow pattern (five tier-level files only, no per-entity nesting). Chosen.
- **Option B** — deep pattern (per-product, per-service, per-studio). Rejected as premature; most entities are pre-scope.
- **Option C** — defer entirely, add a skill-machinery check to enforce the gap later. Rejected; the scaffolding needs to exist for the routing layer to work, not later.

**Locked skeleton (all five files conform):**
```
# CLAUDE.md — {tier name}
Header metadata (Applies to / Load order / "Reads as a delta")
## What makes this tier different
## Verticals: obligations on this tier          ← tier-specific, NOT boilerplate
## Rules that only apply at this tier
## Gotchas (tier-specific)
## Where to go next                              ← feature prefixes, sub-areas, ADRs, skills, sibling CLAUDE.md
```

**Delta-first discipline.** Each tier file assumes root `CLAUDE.md` is already loaded. Content that duplicates root (e.g., RLS-returning gotcha, `@supabase/ssr` cookie gotcha) was cut. What remains is genuinely tier-specific: rules and gotchas that only matter when working in that subtree.

**Files written (sizes reflect genuine tier density, not padding):**
| File | Size | Organising constraint |
|------|------|----------------------|
| `docs/products/CLAUDE.md` | 7.4 KB | API-first; cross-product by default; paired specs for cross-product features |
| `docs/platform/CLAUDE.md` | 9.1 KB | One-way dependencies (Domain → Core); cascade-spec before implementation; RLS without exception |
| `docs/studios/CLAUDE.md` | 9.3 KB | One Studio writes to one Domain Service; full lifecycle (design → deploy → manage → retire) |
| `docs/design-system/CLAUDE.md` | 9.3 KB | Additive over breaking; i18n + a11y as constraints (ADR-U013); tokens over hardcoded values |
| `docs/verticals/CLAUDE.md` | 8.9 KB | Meta-tier: how to write vertical specs (seven-section shape); five locked; obligations tier-specific |

**Discovery mid-session:** `docs/platform/CLAUDE.md` already existed as a 15-line stub. My initial MCP `search_files` call missed it. Captured in memory entry #23 as the recursion blind spot (see "Key learnings" below). The stub was rewritten to the full locked skeleton.

**ADR references verified:** Every ADR cited in every tier file was read-confirmed on disk before writing. 7 ADRs cited across tier files (U002, U006, U007, U008, U009, U013, U015, U016, U017, U022, U023, U024, plus U010-U012 in the verticals file).

### Bonus work — five vertical spec scaffold cleanups

All five vertical spec files carried retired "Phase 3 scaffold / Phase 4 fill-in" language in the Status header, §5 Tooling bullets, §6 Failure modes placeholder, and the footer. Plus `administration.md` §3 had a directive reference to the deleted `../old_implementation/shared/AUTH_SYSTEM.md`.

Rewrote consistently across all five:
- Status line: `Draft (Phase 3 scaffold)` → `Draft (scaffold — Ferd)`
- §5 bullets: `(Phase 4 — currently partial)` / `(Phase 4 — to be designed)` → `(currently partial — to be refined as the tooling matures)` / `(to be designed)`
- §6: `*To be filled in during Phase 4.*` → `*To be filled in as the vertical's tooling and failure cases mature.*`
- Footer: `*Phase 3 scaffold. Real content migrates from ../old_* in Phase 4.*` → `*Scaffold — refine in place as the vertical's tooling, failure modes, and open questions resolve. Treat as a living document; amend via type:process work items (see PROCESS.md §8).*`
- `administration.md §3`: Removed `../old_implementation/shared/AUTH_SYSTEM.md` pointer; replaced with guidance to read live code + migrations directly.

**Self-consistency check:** The `docs/verticals/CLAUDE.md` Gotchas section had flagged these drift items as future-editor warnings. After the fix, those bullets were rewritten to reflect the fixed state ("as of 2026-04-17 the five spec footers read..." rather than "the scaffolds carry...").

### Bonus work — Section 7 (Expected placeholders) added to `doc-health-check` skill

**Problem being solved.** Without explicit protection, Sections 3 (path + README sync), 3.6 (deleted-file refs), and 6 (entity coverage) of the skill would flag every reference to an architecturally-expected-but-not-yet-authored file as drift. Over successive doc-health runs this creates an erosion loop: each sweep prunes more scaffolding, and the designed structure silently degrades.

**What was added:**
- New Section 7 — "Expected placeholders" — with a 16-entry registry table. Each row: path, purpose, why it's expected, pending-since (tier-3/4 task reference or wave scope).
- 5-step procedure: cross-check before flagging; remove on authoring; add on architectural locking; wishlist-discipline; wave-boundary review.
- Explicit "How Sections 3, 3.6, and 6 use this registry" subsection with per-section behaviour.
- Output-format updates: new Section 7 line; Section 6 line gains `N pending-per-registry` field; critical findings now explicitly exclude registry entries; new "Placeholders confirmed scaffolding" output block.
- Intro paragraph updated: "eight sections" → "nine sections"; Section 7's role called out by name.
- New Known-gaps entry: README index file-count lag (caught `docs/planning/sessions/README.md` being 10× stale despite passing Section 3; mitigation: compare total README entries against directory listing count, flag if ratio > ~20% off).

**16 registry entries:** ECOSYSTEM_ROADMAP.md, DEPENDENCIES.md, Hub SPECIFICATION.md/ROADMAP.md, Gimbal DESCRIPTION.md/SPECIFICATION.md/ROADMAP.md, Game DESCRIPTION.md, Platform Core SPECIFICATION.md/ROADMAP.md, per-Studio DESCRIPTION.md + SPECIFICATION.md (×3).

**Validation:** CC-run sweep (Step 3) confirmed Section 7 prevented 10+ false positives that would otherwise have been flagged as broken links or entity-coverage gaps.

### Step 3 — CC-run validation sweep + in-place fixes

Stefan ran the updated `doc-health-check` skill in Claude Code. Output file: `2026-04-17_-_DOC-HEALTH-CHECK-POST-SESSION-1.md`. Summary:

**7 in-place fixes applied by CC:**
- `docs/planning/waves/FERD-CAPABILITY-MAP.md:174` — "Phase 3" → "wave Ferd" (privacy capability row)
- `docs/architecture/ARCHITECTURE_ANATOMY_V1.md:526–528` — Three directive `old_implementation/` links struck-through with pointers to live sources (supabase/migrations/, lib/supabase/, root CLAUDE.md)
- `docs/architecture/ARCHITECTURE_ANATOMY_V1.md:525` — Broken `../decisions/INDEX.md` → `./decisions/` (the directory)
- `docs/architecture/ARCHITECTURE_ANATOMY_V1.md:529–531` — Three broken relative paths (`../vision/VISION.md`, `../vision/MANIFESTO.md`, `../strategy/CONTRIBUTION_ARCHITECTURE.md`) corrected to the current ecosystem/ paths

**1 additional fix applied by Stefan/Claude (not caught by CC's sweep):**
- `docs/ecosystem/strategy/PRODUCTS_AND_PLATFORM.md:177` — CC reported the `../../old_products/ferd/planning/DEFERRED.md` link as "historical; file exists in the archived tree." Cross-check via `list_directory` confirmed `old_products/` is deleted (2026-04-15 legacy migration). CC's classification was wrong; the reference was a directive into a deleted tree. Replaced with a pointer to `../../planning/sessions/2026-04-07-wave-redistribution.md`. Bonus fix on the same line: the ADR-U022 relative path was also broken (`../decisions/` — one level up, not two) and corrected to `../../architecture/decisions/`.

**10 placeholder references correctly classified as scaffolding** (Section 7 worked as designed):
- `docs/products/hub/README.md:13` + `docs/products/hub/DESCRIPTION.md:80` — hub/ROADMAP.md
- `docs/products/gimbal/README.md:17` — gimbal/ROADMAP.md
- `docs/products/game/README.md:12` — game/ROADMAP.md
- `docs/platform/core/README.md:18` — core/ROADMAP.md
- `docs/platform/domain/README.md:27` — SPECIFICATION.md + ROADMAP.md
- `docs/planning/PROCESS.md:121,137,221` — ECOSYSTEM_ROADMAP.md + core/ROADMAP.md
- `docs/templates/product-roadmap.md:6` + `product-description.md:45` + `product-specification.md:6` — various

**All 11 files written during Session A came back CLEAN.**

### CHANGELOG updated

Added a Session A block to `[Unreleased]` documenting all of the above in Keep-a-Changelog format. Kept as a distinct block above the Session 1 block rather than merged (the two are logically separate execution sessions on the same day).

---

## What was NOT touched (deliberate)

- **Files under `docs/TMP/`** — staging area for prior-session work; out of scope for WoW refactor.
- **Session files under `docs/planning/sessions/`** — historical records; never rewrite (per PROCESS.md discipline).
- **Retrospective files** — historical records; don't retouch past retros.
- **`docs/old_universe/`, `docs/old_products/`, `docs/old_implementation/`** — confirmed deleted; nothing to touch.
- **Research reports under `docs/research/`** — out of scope.
- **`PLATFORM-EXIT-GAP-ANALYSIS.md`** — reference snapshot under `docs/planning/reference/`, still carries "Phase 3 / Phase 4" language. CC correctly flagged and left unfixed: reference snapshots are point-in-time records, not living documents. If the snapshot is ever refreshed, the phase language gets updated then.
- **`FERD-CAPABILITY-MAP.md:271`** — cites "Binding rule (REQUIREMENTS.md, 2026-04-05)"; CC classified as historical provenance, not a directive. Left as-is.
- **Feature specs (FEAT-*.md)** — none exist yet in the active ecosystem tree under Model A; Section 5 of the skill will become relevant when the first is specified. No action required now.

---

## Key learnings / discoveries from this session

### 1. MCP `search_files` does not recurse reliably (captured in memory #23)

During Session A's initial file survey, `search_files` reported "no matches" for `CLAUDE.md` across `docs/` despite `docs/platform/CLAUDE.md` existing on disk as a 15-line stub. The tool reliably finds files in the searched directory itself but not in nested subdirectories. This caused me to miss the platform stub during Step 1 and declare the sub-folder CLAUDE.md set "missing" when one was actually partial-present.

**Workaround protocol (now in memory):**
1. Use `list_directory` per subdirectory when tree coverage matters.
2. Or ask Stefan to run `grep -r` / `find` / PowerShell `Get-ChildItem -Recurse` in Claude Code and paste results.
3. Flag the limitation explicitly; never accept "no matches" as canonical for tree-wide questions.

The Session A re-sweep (Step 3) validated this pattern: CC's recursive grep caught 7 drift items (in `ARCHITECTURE_ANATOMY_V1.md` + `FERD-CAPABILITY-MAP.md`) that my Claude.ai MCP sweep had missed. Pattern confirmed: **dual-sweep (Claude.ai + CC) catches what either alone misses.**

### 2. Delta-first discipline is load-bearing for tier CLAUDE.md files

Early drafts of the platform CLAUDE.md duplicated 4+ gotchas from the root file. Pruning those duplicates cut ~0.5 KB and sharpened the file's signal. The rule going forward: **each sub-folder CLAUDE.md is a delta from root, not a restatement.** If a rule or gotcha already lives in root, the tier file only mentions it when adding tier-specific consequence or nuance.

### 3. Five verticals genuinely differ per tier

Drafting the "Verticals: obligations on this tier" section for each of the five tiers revealed that the content is not boilerplate — each tier has meaningfully different obligations under each vertical. Products' Privacy concern is "don't over-fetch from platform"; Platform's is "RLS + consent authority"; Studios' is "creator attribution + pseudonymity"; Design System's is "component-level privacy-aware rendering"; Verticals'-tier is "how to write the rule itself". This validated the choice to embed verticals at the tier level rather than centralising.

### 4. Expected placeholders need explicit protection, not implicit tolerance

Without Section 7, the skill would have flagged 10+ valid architectural scaffolding references as drift in Step 3's sweep. Over three or four sweeps, that would have silently pruned the scaffolding. The registry approach — an explicit, maintained list of "files expected to exist" — works because it makes the expectation visible. Contrast with implicit tolerance ("the skill should just know"), which erodes over time.

### 5. Option A over skill machinery for ADR-reference integrity

Mid-session, I proposed adding an ADR-reference-integrity check as Section 7 of the skill. We chose Option A (manual verification against filesystem during each CLAUDE.md write) because: (a) only one data point (Session A's own work) suggested the need; (b) the verification is cheap when done at authoring time; (c) adding skill machinery for a one-off is over-engineering. If a future session finds ADR references drifting independently of authoring, we'll revisit.

### 6. CC classification errors exist and aren't rare

CC's sweep classified the `PRODUCTS_AND_PLATFORM.md:177` old_products/ link as "historical; file exists." A 10-second `list_directory` check proved the claim false. CC's grep and classification are powerful but not infallible. **The discipline:** always spot-check classification claims when the fix is cheap, especially for archived-tree references where the whole tree's existence is at stake.

---

## Locked decisions / architecture this session

### Decision A1 — Shallow pattern for tier CLAUDE.md files (5 tier files; no per-entity nesting)

Five sub-folder CLAUDE.md files exist (products, platform, studios, design-system, verticals). No per-product, per-service, or per-studio CLAUDE.md files will be authored proactively; if a specific entity develops enough tier-internal complexity to warrant one, that's a future local decision.

### Decision A2 — Locked skeleton for tier CLAUDE.md files

Every tier CLAUDE.md follows the six-section skeleton documented above. Deviations require justification and should be discussed before being made.

### Decision A3 — Section 7 (Expected placeholders) is canonical, not optional

Section 7 is a permanent part of the `doc-health-check` skill, not a one-off. When new architectural placeholders are introduced (a decision locks a new expected structural doc), the registry row must be added in the same session as the decision. When a registry entry is authored (the file finally exists), the row must be removed in the same commit.

### Decision A4 — Dual-sweep protocol for cross-cutting refactors

For any refactor that touches more than three files tree-wide, a dual-sweep (Claude.ai for drafting + CC for recursive validation) is the default. The MCP `search_files` blind spot means Claude.ai sweeps alone are not safe for full-tree coverage questions.

---

## Open items / Next session

### Immediate (pre-commit)

- **Commit Session A as one logical unit.** Proposed message:
  ```
  docs(process): refactor for Model A — PROCESS.md, templates, skills, five sub-folder CLAUDE.md files, vertical spec cleanup

  - Rewrite root CLAUDE.md for Model A (remove retired ritual/agent references, add 4-skill routing, 5 verticals, tier-level loading order)
  - Rewrite docs/README.md, docs/planning/sessions/README.md for post-migration state
  - Author 5 sub-folder CLAUDE.md files (products/platform/studios/design-system/verticals) following delta-first skeleton
  - Clean 5 vertical spec scaffolds of retired Phase 3/4 language + old_implementation/ references
  - Add Section 7 (Expected placeholders) with 16-entry registry to doc-health-check skill
  - Fix ARCHITECTURE_ANATOMY_V1.md cross-references + FERD-CAPABILITY-MAP.md phase language
  - Fix PRODUCTS_AND_PLATFORM.md old_products/ directive link
  - Update PROCESS.md footer, templates/domain-service-spec.md session-bridge path
  ```
  Alternative: split into logical commits (CLAUDE.md files / READMEs + specs / skill + templates). Stefan's call.

### Next session — Tier 3 strategic work (unchanged from the WoW-review bridge)

The following items remain deferred from the 2026-04-17 WoW review; nothing about Session A changes their scoping:

- **T3.1** — Ferd wave file (`docs/planning/waves/ferd.md`) — blocked on T3.2.
- **T3.2** — Ferd feature spec stubs from `FERD-CAPABILITY-MAP.md` (110 capabilities) — the topic for the next session per the WoW review's Session B instructions.
- **T3.3** — Hub SPECIFICATION.md — blocked on T3.2.
- **T3.4** — Hub ROADMAP.md — blocked on T3.2.
- **T3.5** — Ecosystem roadmap (`docs/ecosystem/ECOSYSTEM_ROADMAP.md`).
- **T3.6** — Platform roadmap.
- **T3.7** — Future wave files.

### Tier 4 (trigger-activated)

- **T4.1** — `DEPENDENCIES.md` (`docs/platform/DEPENDENCIES.md`). Placeholder now in the Section 7 registry.
- **T4.2–T4.3** — Other trigger-activated items from the WoW review, unchanged.

### Unresolved from Session 1 (unchanged)

These remained unresolved after Session 1 and are not affected by Session A:

1. Multi-agent task locking mechanism.
2. Review bottleneck not operationalized (no review queue / assignment in task format).
3. Cross-product feature sync (paired Hub UI + Platform data model).
4. Whisp architectural placement.
5. Discovery workflow (maturity 0→2) not connected to `ecosystem-decomposition` skill.
6. Ferd DoD not yet populated.

### Skill calibration items opened by this session

- **README index file-count lag.** Documented as a Known-gaps entry in the skill. No immediate fix; the mitigation (compare total README entries against directory listing count) can be added to Section 3's procedure when Stefan has 15 minutes. Low priority.
- **Second data point for ADR-reference integrity check.** Not opened; will only revisit if drift appears.

---

## Files touched during Session A

**Written/edited by Claude.ai (me):**
- `CLAUDE.md` (root) — full rewrite, then verticals paragraph + tier-CLAUDE.md loading-order step added after sub-folder files were written
- `docs/README.md` — legacy section + tree diagram cleanup
- `docs/planning/sessions/README.md` — full rewrite
- `docs/templates/domain-service-spec.md` — path fix
- `docs/planning/PROCESS.md` — footer refresh
- `docs/products/CLAUDE.md` — new, 7.4 KB
- `docs/platform/CLAUDE.md` — rewrote pre-existing stub, 9.1 KB
- `docs/studios/CLAUDE.md` — new, 9.3 KB
- `docs/design-system/CLAUDE.md` — new, 9.3 KB
- `docs/verticals/CLAUDE.md` — new, 8.9 KB; updated after vertical spec cleanup to reflect fixed state
- `docs/verticals/administration.md` — drift cleanup (phase language + old_implementation/ ref)
- `docs/verticals/privacy.md` — drift cleanup
- `docs/verticals/notifications.md` — drift cleanup
- `docs/verticals/observability.md` — drift cleanup
- `docs/verticals/transactions.md` — drift cleanup
- `.claude/skills/doc-health-check/SKILL.md` — Section 7 added; intro paragraph updated; Known-gaps entry added
- `docs/ecosystem/strategy/PRODUCTS_AND_PLATFORM.md` — old_products/ directive link fix + ADR-U022 relative-path fix (caught in post-CC spot-check)
- `CHANGELOG.md` — Session A block added to `[Unreleased]`

**Edited by CC (during the Step 3 sweep):**
- `docs/planning/waves/FERD-CAPABILITY-MAP.md` — phase language fix
- `docs/architecture/ARCHITECTURE_ANATOMY_V1.md` — 7 fixes in the Related Documents table

**Memory updated:**
- Entry #23 — MCP `search_files` recursion blind spot and workaround protocol

---

## Next-session instructions

If this bridge has been uploaded to you fresh, proceed as follows:

1. **Confirm Session A's commit landed.** Run `git log -1 --oneline` (via Stefan if MCP can't) and verify the commit with "five sub-folder CLAUDE.md files" is present as HEAD or near-HEAD. If it isn't, stop and surface that before doing anything else.

2. **Confirm the five tier CLAUDE.md files exist.** Use `list_directory` per tier (`docs/products/`, `docs/platform/`, `docs/studios/`, `docs/design-system/`, `docs/verticals/`) — do NOT rely on `search_files` (see memory #23).

3. **Read the Session A bridge top-to-bottom once.** You're probably reading it now. Re-read if you skipped any sections.

4. **Start the next session — Tier 3 strategic work.** The primary task is T3.2: generate Ferd feature spec stubs from the 110 capabilities in `docs/planning/waves/FERD-CAPABILITY-MAP.md`. Each stub is a maturity 0-raw or 1-concept FEAT-*.md file under the appropriate owner's `features/` directory, using the feature-spec template. Load the `ecosystem-decomposition` skill first; it's the canonical guide for this work.

5. **Before generating the stubs, reconfirm the feature-spec template's shape** — the template was updated in Session 1 to include `parked: true` / `parked_reason` frontmatter fields. Make sure every stub uses the correct YAML frontmatter (especially `owner:` and `consumers:` per the frontmatter restructure locked April 11).

6. **Don't try to generate all 110 at once.** Batch by capability cluster (the map organises them into clusters). Pause and check in with Stefan after each cluster for signal on depth, tone, and scope of the stubs.

7. **Every stub must have:**
   - YAML frontmatter with `id`, `owner`, `consumers`, `maturity`, `wave`, and any relevant tags
   - A Problem section (maturity 0/1 level — just the itch or hypothesis)
   - A Vertical Impact section addressing all five verticals (Administration / Privacy / Notifications / Observability / Transactions) — even if the address is "None — no user data touched" with rationale

8. **Proactively use the tier CLAUDE.md file** for whatever tier the stub's owner lives in (e.g., reading `docs/products/CLAUDE.md` when generating Hub feature stubs). The files you wrote in Session A are now the canonical guidance for working inside each tier.

9. **Anticipated open questions during stub generation:**
   - Some capabilities in the map will have unclear ownership. Default behaviour: put them under `docs/ecosystem/thinking/OPEN_QUESTIONS.md` as candidate features awaiting ownership, rather than forcing them into a tier.
   - Some capabilities will already be partially implemented (code exists; spec does not). Write the stub as a retroactive-documentation feature spec, following the "retroactive documentation mode" locked on 2026-04-11 (Solution sketch / Appetite / Rabbit holes replaced by `## Implementation notes`).

Confirm briefly that you understand the next-session instructions, note any of the above that's ambiguous, and wait for Stefan's go-ahead before starting generation.
