# Doc Health Check — 2026-08-11 — post-Phase-4-cutover (on-demand)

**Trigger:** the mandatory on-demand run after a cross-cutting change — Phase-4 W2 deleted the entire `hub-legacy/` tree (PR #502) and W3 restructured the root `package.json` to tooling-only (PR #503). Tree deletion + folder restructure are both named triggers in the skill's own "When to run" table.

**Run conditions.** Checkout on branch `docs/phase-4-w6-carveouts`, working tree clean; no branch switch, no commit, no test run, no `npm install`. Detection greps ran in the context-mode sandbox. Edits limited to documentation; `CLAUDE.md` files, ADRs, and everything under `.claude/` were left untouched by instruction, so findings in those files are **reported, not fixed**.

---

```
Sections run:
1.   Terminology drift            — skipped: no renames in the cutover (no old→new term pair)
1.5  Architectural drift           — 15 keywords checked / 1 critical (living anatomy) / 1 fixed / 0 backlog
1.6  Unfiled deviation markers     — 0 hits (guarded pattern; the seven `one-directional` false positives stayed suppressed)
2.   Schema drift                  — skipped: the cutover applied no migration
3.   Path + README sync            — 2927 relative links resolved / 26 broken in active files (24 benign, 2 real) / 1 README index lag
3.5  Archived-tree leak            — clean: no active file points into old_universe/, old_products/, old_implementation/ for live work
3.6  Deleted-file refs             — 15 filenames checked / 0 directive refs / all hits banner'd-historical
3.7  Snapshot drift (inventories)  — registry files spot-checked / 0 unbannered / 0 divergent
4.   Parked items                  — skipped: no parked features in the tree
5.   Maturity consistency          — 91 specs checked / 91 at 6-done / 0 ABSENT + 0 EMPTY Implementation notes (whole-tree sweep, unconditional)
6.   Entity coverage               — clean; gaps are all registry placeholders
7.   Expected placeholders         — 18 registry entries reviewed / 0 newly authored / 0 newly introduced / 18 still pending
8.   Feature-inventory summary     — 13 features/ dirs checked / 0 drift / platform-core + domain pending (registry)
9.   CLAUDE.md cascade consistency — 22 entities checked / 0 missing / 0 load-order pointer breaks / 1 content soft flag
10.  Graduation-tracker completeness — skipped: no universe core ratified, no discovery-ADR added since last run
11.  Anatomy freshness              — stamp ADR-U047 A3 (explicitly absorbing U048–U052) vs newest ADR-U052 / 0 outstanding / 1 retired-vocab hit in the living pair (FIXED) / ADR index complete 52/52 / measurement ledger complete 3/3
```

---

## Critical findings

**2 critical. One fixed in-place, one reported (steering file — needs the user's nod).**

- **`docs/architecture/ARCHITECTURE_ANATOMY.md:33`** — the **living anatomy overview** asserted in the present tense that "the top-level `hub-legacy/` tree **is** the frozen v1 oracle", describing a top-level directory that no longer exists. Section 11 classes retired vocabulary in the living pair as critical precisely because it misleads every future session at orientation time. **Fixed in-place** — past-tensed and pointed at the annotated tag, using the wording already landed in `hub/SPECIFICATION.md` and `hub/CLAUDE.md` this session. The stamp was **not** moved (no ADR absorbed; this was a factual-staleness repair).

- **`docs/platform/domain/communication/CLAUDE.md:3`** — the DS-5 entity file's **`Applies to:` scope line** still reads "the Hub's messaging and forum surfaces under `hub/` (the v1 messaging code is frozen oracle under `hub-legacy/`)". Present tense, naming a deleted path, in the one line that defines what the cascade file governs. **Reported, not fixed** — `CLAUDE.md` files are carve-out steering files this session. Suggested minimal edit: "(the v1 messaging code was the frozen oracle, retrievable at `hub-legacy-final`)".

## Findings (non-critical)

- **Broken link cluster — `TASK-OBS-01-telemetry-sink-and-analytics-posture.md` does not exist**, yet is linked as a relative markdown path from **`ADR-U052:42`** (a canonical, accepted ADR) and **`docs/planning/hub-v2/phase-3-notifications-completion-plan.md:3`**, plus six historical session/retro files. The task is alive in the standing-tasks table (`backlog/tasks/README.md:66`, third-carry ruling **BET**) but has **no file on disk**. This is exactly the multi-hit cluster Section 3 says to surface on its own line: an ADR — the one document class that is append-only and permanent — carries a dead link. **Unrelated to the cutover; pre-existing.** Fix is either to create the task file or to demote the ADR's link to prose. Not applied: editing an ADR needs the nod.
- **`docs/planning/backlog/tasks/TASK-INT-01-auth-admin-es256-flake.md:140`** — an **open checklist box** `- [ ] hub-legacy/ if it is ever run`, inside the "do not flip this without checking every other consumer" legacy-JWT-key precondition list. The tree is gone, so the box is now permanently satisfiable-by-deletion. Left untouched deliberately: ticking a security precondition is a factual claim I should not make unilaterally. Recommend annotating "n/a — tree deleted 2026-08-11 (W2)".
- **`docs/planning/hub-v2/README.md` index lag — 39 of 58 files on disk are unindexed**, including every gate document, dossier, walk-findings and completion plan since 2026-07-06. This is a **re-find**: the 2026-08-03 Platform-Ops retro recorded the same class ("hub-v2 README indexed none of the five new gate documents (now indexed)") as a fixed soft flag. It has re-accumulated at roughly 8x the size. The README is a 108-line *plan*, not a directory index, and it does say it "references [features], it does not duplicate them" — so this is a judgement call rather than a hard fail, but the precedent set at the last retro says gate documents belong in it.
- **`FEAT-PC022:19` and `FEAT-PC019:26`** — both describe the legacy audit-log write sites as "frozen in `hub-legacy/`" / "hub-legacy's", present tense, as part of load-bearing security reasoning. The reasoning's *conclusion* got stronger (the sites are now deleted, not merely frozen), but the tense is stale. Cosmetic; worth a sweep when those specs are next opened.

## Cascade verdict (Section 9)

**Intact.** The deletion broke nothing structural.

- **Presence:** 22 active entities checked across products, studios, verticals, platform-domain and platform-core. Every one has its `CLAUDE.md`. All three Universe Studio sub-entities (`world-studio`, `arc-studio`, `journey-studio`) are present per ADR-U026. `docs/platform/core/{infrastructure,identity}/CLAUDE.md` remain absent — both are **Section 7 registry entries**, so scaffolding, not drift.
- **Load-order integrity:** every `CLAUDE.md` load-order pointer resolves. Zero broken pointers across the whole cascade — no cascade file was pointing into `hub-legacy/` for load order.
- **Content categorisation:** one soft flag, the DS-5 `Applies to:` line above. `docs/products/hub/CLAUDE.md` was checked closely since it is the file most exposed to the cutover; it is already fully past-tensed and correctly names the tag as the referent of the provenance comments.
- One structural note: `docs/products/hub/tours/` (`HUMAN.md`, `TECHNICAL.md`) has no `CLAUDE.md`. Not a finding — sub-entity files are opt-in by divergence, and `tours/` is not named in the parent as divergent.

## Placeholders confirmed scaffolding (Section 7 registry)

- `docs/products/hub/DESCRIPTION.md:88` and `docs/products/hub/SPECIFICATION.md:13` → `./ROADMAP.md` — registry entry (T3.4), scaffolding, **not** broken links. Registry note: the entry lists DESCRIPTION.md and README.md as its referrers; SPECIFICATION.md is now a third and the row could say so.
- All 18 registry entries verified still absent from disk. None newly authored, none to remove.

## Benign, explicitly not findings (checked and cleared)

- **24 of the 26 "broken" active links are by design:** 11 `link-to-feature-spec` template placeholders (`docs/templates/wave-spec.md`, `wave-planning/SKILL.md`), 2 illustrative heading-form strings in `PROCESS.md:204`, and 11 internal links inside `docs/planning/reference/legacy-feature-docs/` — a pre-Model-A snapshot whose links point at the pre-restructure tree by nature.
- **`docs/planning/reference/FOLDER_STRUCTURE.md`** holds most of the Section 3.6 keyword hits (`SPRINT.md`, `PROJECT_STATUS.md`, `PRODUCT_SPEC.md`, `products/game`, `gimbal/ios`…). It already carries a **STALENESS NOTICE added 2026-08-03 by a prior doc-health run**, and both `planning/README.md:40` and `reference/README.md:25` label it "dated, not current". Correctly banner'd; no action. It never mentioned `hub-legacy/` at all — it predates the v2 rebuild.
- **"cited in README but no file" for FEAT-PC*/FEAT-PD*/FEAT-H* ids** — verified these all resolve to files in *sibling* tiers; they are legitimate cross-tier references, not drift. `FEAT-G001 / V001 / US001 / AS001 / JS001` have no file anywhere but appear once each in an empty `features/README.md` as the entity's naming-convention example.
- **Root `next-env.d.ts` and `tsconfig.tsbuildinfo`** survive at repo root after the manifest restructure, but `git ls-files` confirms **neither is tracked** — local build artifacts, not a repo-state contradiction of "the repo root holds no Hub source".
- **Root `package.json`** is a clean workspace delegator: every script forwards `-w hub`, so every documented `npm run …` invocation still resolves. No doc anywhere instructs a root-level build that has stopped working.

## Table updates owed (could not be applied — `.claude/` is carved out)

- **Section 3.6 deleted-files table needs a `hub-legacy/` row.** The skill's own discipline is "whenever a file is deleted, add a row in the same session that performs the deletion". 178 files went; the table has no entry. Suggested row: `hub-legacy/` (whole tree) | Phase-4 W2 (2026-08-11, PR #502) | repo root | ADR-U032 + annotated tag `hub-legacy-final`; provenance comments in `hub/` now refer to the tag.
- **Section 1.5 architectural-drift table** could gain a row for "the `hub-legacy/` oracle as a live consultable tree" → retired; the referent is the tag. Classify-by-sense: provenance mentions are correct, present-tense "is frozen under `hub-legacy/`" is drift.

## Contradictions to the briefing assumptions

Two of the three assumptions held exactly; one did not.

1. **"No markdown link points into a `hub-legacy/` path" — CONFIRMED independently.** 2927 relative links resolved across 877 markdown files; zero link *targets* contain `hub-legacy`. The deletion broke no links.
2. **"Provenance comments in `hub/` code and two migrations, referent is the tag `hub-legacy-final`" — CONFIRMED and strengthened.** 10 code mentions, all in comments; **zero imports or live path references**; `git rev-parse hub-legacy-final` resolves. The three assertion-bearing SVGs are clean of `hub-legacy` entirely.
3. **"Remaining mentions fall into three legitimate classes" — NOT quite.** Two mentions fall outside classes (a), (b) and (c): `ARCHITECTURE_ANATOMY.md:33` (living overview, present-tense structural assertion — now fixed) and `docs/platform/domain/communication/CLAUDE.md:3` (cascade `Applies to:` scope line — reported). Both are current-state claims in orientation-critical files, not history, provenance, or spec prose.

Also worth correcting for the record: the briefing listed the already-past-tensed files as the complete set. `ARCHITECTURE_ANATOMY.md` needed the same treatment and was not in that set — which is why the deletion's paper trail is otherwise clean but the one-stop overview was still describing the old repo top level.

## Notes for the next check

- `docs/planning/reference/ANATOMY-CONFORMANCE-AUDIT-4.md:110` records **AC4-O2** as "the anatomy pair never mentions `hub-legacy/` … folded into W7 as editor's discretion". That pointer has since been added and, as of this run, corrected — AC4-O2 can be closed.
- The `TASK-OBS-01` dead link from `ADR-U052` is the highest-value carry-over from this run. ADRs are append-only, so the cheapest correct fix is creating the task file rather than editing the ADR.
- Section 11's stamp is healthy: `ADR-U047 Amendment 3` explicitly names U048–U052 as absorbed, ADR index is complete at 52/52 with statuses matching, and all three gate-measurement files have ledger rows.
