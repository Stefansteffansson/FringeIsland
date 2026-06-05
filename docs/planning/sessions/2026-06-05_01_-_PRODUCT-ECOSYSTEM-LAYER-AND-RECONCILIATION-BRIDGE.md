# Session bridge - 2026-06-05_01 - Product/ecosystem layer; bridge to a full-description reconciliation session

**Date:** 2026-06-05
**Branch:** main (last commit b1f34ca, the 2026-06-01 Statements 37-40 resume; this session's edits to the universe-discovery file are not yet committed - see "Commit and push" below)
**Type:** Bridge (permanent record - not rewritten after the fact)
**Prior session:** universe-discovery Session 01, 2026-06-01 resume (Statements 37-40)
**This session's authoring:** appended a 2026-06-05 resume to `docs/ecosystem/thinking/universe-discovery/2026-05-18_universe-discovery-session-01.md` (product/ecosystem layer design locks + Statements 41-46; new Patterns bullets; a Divergences entry; an Open-threads resolution note; header refreshed 40 -> 46).

---

## What this session locked (carried forward)

All detail lives in the 2026-06-05 resume of the universe-discovery Session 01 file; this is the index.

**Product/ecosystem layer (design locks):**
- **Not clones.** One shared core (ADR-U023: products are clients over the Platform API) plus a situation-specific surface. Products are complementary surfaces, not device-clones.
- **Two affordance profiles, device-independent.** "Gimbal" and "Hub" name two affordance *profiles*, not two devices: a physical-world membrane (camera, LiDAR, GPS, mic, AR, portability - perception and capture) and a canvas/tooling membrane (screen, precision input, keyboard, file system, external plugins). Devices are points in that space (phone, laptop, tablet = convergence, AR glasses). Capabilities key to required affordances and appear on any device that offers them.
- **Feature-grain affordance-keying (thread #4, LOCKED).** Keying is per-feature, against a small coarse affordance set (sensors / comfortable-canvas / precision-input / none). Chosen restriction allowed (Option A), but every restriction must be named by its affordance. Forward consequence: feature specs carry required-affordance metadata beside the Model A `maturity:` field.
- **The Game is depth, not a product.** Revisit trigger: a journey needs fidelity/engine/play-surface the mobile-web stack cannot render (AR glasses a candidate spark).
- **Studios = role-gated authoring mode** (World/Arc/Journey under Universe Studio); World Studio access tiers by *scope* (own home open to all FIMs; shared world Dreamineer/Creator-gated).
- **The console** = a distinct back-of-house surface for universe-scoped governance (DeusEx/Universeers); community-scoped care stays woven in-place. Governance splits by scope (thread #1, LOCKED). Fiction name deferred.
- **Placement rule (final):** each feature declares the affordances it requires; appears wherever they exist; chosen restrictions named by affordance.

**Universe-fiction (Statements 41-46):**
- 41 "the village" = working name for the safe harbour.
- 42 the glowing glass ball is a two-zone gateway (inside = private home; rim = the village).
- 43 the private home = a self-chosen representation of where the FIM feels safest; inviolable (default-locked); selectively shareable (whole or parts).
- 44 home furnished with the personal-scope slice of World Studio; evolves as the FIM grows.
- 45 anchoring is the real gate: near-side (body-anchored, Shadow-open) vs Beyond (ball- or seed-anchored, FIM-only). The village is FIM-only; transcendence opens it. Corrects an in-session "Shadow visits the village" misstep.
- 46 Shadow access = anonymous auth; ephemeral data; erased soon after inactivity/close; transcendence is the persistence-and-consent threshold (migration must be atomic).

**Deferred / open (not blockers):**
- Exact TTL and inactivity threshold for Shadow-data erasure (Privacy-vertical / Identity config); migration atomicity.
- Fiction name for "the console"; canonicalization of "the village".
- How a FIM acquires Dreamineer authority (home-creation on-ramp offered, not locked).

---

## Next session - mission

Two phases, in order. **Phase 1 must complete before Phase 2 starts.**

### Refinement (2026-06-05, forward note)

Added after this bridge was first committed, at Stefan's request. This supersedes the two-phase framing in the Phase 1 / Phase 2 subsections below; those are retained intact as the original record. Net change: split into two sessions, a purpose-scoped inventory, a CC bootstrap, and named gated deliverables.

1. **Split into two sessions.** Inventory and challenge are each a full session's work; bundled, they yield a shallow pass at both. The next session is the map only, ending with a ratified inventory; the challenge is the session after.
2. **Scope the inventory by purpose, not exhaustiveness.** Map only files that assert what FringeIsland *is* or how it *works* (universe, products, roles, cosmology, platform behaviour). Skip pure process / tooling / planning files unless they describe the thing. This keeps Phase 1 from becoming a repo-wide crawl (Tripwire #6).
3. **Bootstrap with CC, not memory or `search_files`.** Open Phase 1 with a CC prompt that emits (a) the full `docs/` tree and (b) a grep for a fixed term list - Hub, Gimbal, Game, studio, village, safe harbour, console, Shadow, FIM, Whisp, ball, affordance, Dreamineer, DeusEx, transcend, anchor/seed, portal. Claude.ai organizes the raw output. Avoids the recursive-search trap and memory drift.
4. **Phase 1 deliverable (named).** A concept -> where-described map (which file carries each concept, at what status: canonical / thinking / planning); a gap list in three buckets - (i) locks/statements with no home, (ii) docs that are stale or contradict the locked set, (iii) implied-but-missing files; and one explicit finding: does a single canonical "what FringeIsland is" description exist, or is it emergent across files? Treat the map as a session snapshot, not a new maintained state-doc (generate-on-demand principle).
5. **Phase 2 deliverable (named) and gated.** A statement-driven reconciliation register: each of Statements 1-46 + the product locks -> {reflected / stale / contradicts / missing, proposed resolution, graduate-or-defer}, cross-checked doc-driven for staleness. Output is the register for ratification; canonical edits to VISION / manifesto / Hub-DESCRIPTION / universe happen only on ratified items, at graduation. The session does not rewrite canon from not-yet-ratified discovery.

### Phase 1 - Inventory and map (analyse before challenging)

Before complementing or challenging anything, build a map of what already exists and where:
- Walk the relevant trees and record **what file describes what** - the ecosystem tree (WHAT/structural), the planning tree (HOW/operational), and the architecture tree.
- Identify **gaps**: concepts now locked (this session and the full Statements 1-46) that have **no home** in the existing writings, and existing files that are **stale** or contradict the locked model.
- Identify **missing files** that the locked model implies should exist but do not.
- Produce a short inventory artifact (what exists, what is described where, what is missing) and surface it for review before any edits.

Tooling note: `fringeisland:search_files` does not recurse reliably - do **not** accept "no matches" as canonical. Use `list_directory` per subdirectory, or ask Stefan to run grep/find/PowerShell in CC.

### Phase 2 - Complement and challenge (reconcile)

With the map in hand, challenge the complete description of what FringeIsland is and how it works against everything locked (Statements 1-46 + the product/ecosystem locks), and complement where thin. Reconcile the divergences logged in the universe-discovery file's Divergences section, in particular:
- The **affordance-profile** reading of Gimbal/Hub (two membranes, device-independent, feature-grain keying) vs how products are currently described.
- **The console** as a distinct universe-governance surface (new).
- The **role ladder** (Member / Steward / Dreamineer / DeusEx; Hub "FIM-facing" in the April-10 Hub DESCRIPTION.md) squared with the two-profiles reading and the scope-based governance and authoring gates.
- **"The village"** working name vs existing safe-harbour language.
- The **feature-spec template**: add a required-affordance metadata field beside `maturity:` (the feature-grain affordance-keying consequence).

Discipline: bridges and prior statements are permanent - reconciliation is forward-only and happens at graduation; nothing in VISION/manifesto/universe/Hub-DESCRIPTION was edited this session by design.

---

## Candidate starting read-list (seed for the Phase 1 inventory; verify on disk, do not treat as complete)

- `docs/ecosystem/` - VISION.md (constitutional), the manifesto, Hub DESCRIPTION.md
- `docs/ecosystem/universe/` - the universe writings (beings/README.md and siblings)
- `docs/ecosystem/thinking/universe-discovery/2026-05-18_universe-discovery-session-01.md` - Statements 1-46 + the 2026-06-05 product locks (the source of truth for this session)
- `docs/architecture/` - ARCHITECTURE_ANATOMY_V1.md, ECOSYSTEM_ANATOMY_V4.svg, decisions/ADR-U023-*
- `docs/ecosystem/how-we-work/` - the five chapters
- `AGENTS.md` (root) + the five tier CLAUDE.md files
- `docs/templates/` - the feature-spec template (Model A) for the affordance-metadata change
- `STATUS.md` - pipeline tracker
- `.claude/skills/ecosystem-decomposition/SKILL.md` - if the product/affordance model should inform decomposition

---

## Disciplines (carry into the next session)

- Two-tree separation: ecosystem (WHAT, permanent) vs planning (HOW, temporal).
- Trust disk over memory (G-28); read state at session-open and after every gate.
- Sub-batch-of-1 Edit cadence: dryRun before every live edit on existing files; new-file writes need no dry-run.
- Forward-only correction; in-commit consistency; no Greek or non-ASCII labels.
- Use the FringeIsland MCP for disk operations.

---

## Commit and push (this session's authoring is uncommitted)

The universe-discovery file edits and this bridge are written to disk but **not committed** (no git_commit/git_push via MCP - run in CC / Stefan's terminal).

- Pre-existing unrelated working-tree changes (CLAUDE.md, docs/planning/sessions/openers/cc-execute-prompt.md) are **not** part of this session - leave unstaged.
- Suggested commit (authoring): the universe-discovery 2026-06-05 resume + this bridge.
- Still to sync before/with the commit: the universe-discovery folder README session-table (Session 01 status/date), the sessions folder README and the root README if they index session files. Flagged for review.

**Suggested commit message:**
```
docs(universe): Session 01 resume 2026-06-05 - product/ecosystem layer + Statements 41-46

Appends a 2026-06-05 resume to the universe-discovery Session 01 file turning from
universe-fiction to the product/ecosystem layer (what Hub, Gimbal, Game, and the three
studios are and what lands where), plus six fiction statements the product questions
forced open:

- Product/ecosystem design locks: not clones (one shared core per ADR-U023 + a
  situation-specific surface); "Gimbal"/"Hub" as two affordance PROFILES not devices,
  device-independent; feature-grain affordance-keying with named chosen-restriction
  (Option A); the Game as depth-not-product; Studios as a role-gated authoring mode with
  World Studio access tiered by scope; the console as a universe-governance surface
  (governance split by scope); the final placement rule.
- 41: "the village" as the working name for the safe harbour.
- 42: the glowing glass ball as a two-zone gateway (inside = private home, rim = village).
- 43: the private home as a self-chosen, inviolable, selectively shareable representation
      of where the FIM feels safest.
- 44: the home furnished with the personal-scope slice of World Studio; evolves as the FIM grows.
- 45: anchoring is the gate - near-side (body-anchored, Shadow-open) vs Beyond (ball/seed-
      anchored, FIM-only); the village is FIM-only; corrects an in-session Shadow-visit misstep.
- 46: Shadow access via anonymous auth, ephemeral data erased on inactivity/close,
      transcendence as the persistence-and-consent threshold.

Statements 41-46 and the product locks extend earlier material by ADDITION only; none is
edited. Header refreshed (count 40->46; status/last-edited to 2026-06-05; a 2026-06-05
resume note added). Three Patterns bullets appended; a dated 2026-06-05 Divergences entry
added; a "Resolved/answered in the 2026-06-05 resume" note added at the top of Open threads.

Adds bridge docs/planning/sessions/2026-06-05_01_-_PRODUCT-ECOSYSTEM-LAYER-AND-RECONCILIATION-BRIDGE.md
to a full-description reconciliation session (inventory-then-challenge).

Not in scope: the pre-existing working-tree changes to CLAUDE.md and
docs/planning/sessions/openers/cc-execute-prompt.md are unrelated and left unstaged.
```

---

## Refinement (2026-06-05, forward note)

Added after this bridge was first committed (forward-only; the Phase 1 / Phase 2 text above is left intact). It sharpens the next-session plan and names what the reconciliation produces - because the capability descent (PC-1..PC-4 derived; DS-1..DS-7 pending) will later be validated against the reconciled description.

**Split into two sessions.** The map and the challenge are each a full session; bundled they yield a shallow pass at both.

**Session A - the map.**
- Scope by purpose: inventory only files that assert what FringeIsland *is* or how it *works* (universe, products, roles, cosmology, platform behaviour). Skip pure process/tooling/planning unless it describes the thing.
- Bootstrap with CC, not memory or `search_files`: have CC emit (a) the full `docs/` tree and (b) a grep for a fixed term list (Hub, Gimbal, Game, studio, village, safe harbour, console, Shadow, FIM, Whisp, ball, affordance, Dreamineer, DeusEx, transcend, anchor/seed, portal). Claude.ai organizes the raw output.
- Deliverable: a concept -> where-described map (file + status: canonical / thinking / planning); a gap list in three buckets - (i) locks/statements with no home, (ii) docs stale or contradicting the locked set, (iii) implied-but-missing files; and one explicit finding - does a single canonical "what FringeIsland is" description exist, or is it emergent across files? The map is a session snapshot, not a maintained state-doc.

**Session B - the challenge.** Statement-driven spine: each of Statements 1-46 + the product locks -> {reflected / stale / contradicts / missing, proposed resolution, graduate-or-defer}, cross-checked doc-driven for staleness. Session B produces two artifacts:

1. **A ratified, reconciled description** of what FringeIsland is and how it works - divergences resolved into one coherent picture, each marked graduate-now or defer. Canonical edits (VISION / manifesto / universe / Hub DESCRIPTION) happen only on ratified items, at graduation; the session does not rewrite canon from not-yet-ratified discovery. Whether this lands as one description doc or as the existing set is decided by Session A's canonical-description finding.
2. **A descent-impact register** - the artifact that feeds the later validation of the L1->L3 capability descent. For every reconciled point that bears on the architecture, an entry naming the capability area it touches (PC-1..PC-4, DS-1..DS-7, a vertical, the Products / Platform API layer) and whether it **confirms / revises / adds-to** that capability, split into:
   - **Already-derived** (PC-1..PC-4 L1->L3 complete): points needing a re-check or revision of work already done.
   - **Not-yet-derived** (DS-1 World Model next, then DS-2..DS-7): new constraints the upcoming derivations must honour from the start, so they are derived right rather than re-derived.
   - Seeds already visible: the required-affordance metadata field on feature specs (a template change touching every spec); the console's home in PC-4 Governance / the Admin vertical; governance-by-scope in PC-4; Shadow anonymous-auth + ephemeral erasure in PC-2 Identity + the Privacy vertical; the home/village per-region permissions across PC-2 / PC-3 / DS-1 World Model / Privacy; studios-as-mode + World-Studio personal-vs-shared scope across the studios products / DS-1 / PC-2.

**Sequencing decision this surfaces.** With the descent-impact register in hand, decide on evidence whether to pause the Domain-Service descent (DS-1 is next) until reconciliation lands - so DS-1..DS-7 derive on solid ground - or let DS-1 proceed now and re-check it against the register afterward. Expectation: the reconciled description should mostly *confirm* the existing descent with targeted revisions (ADR-U023 still holds; affordance profiles refine the Products layer; the console likely slots into existing Governance/Admin), not force a teardown.

**Net chain:** Session A (map) -> Session B (reconciled description + descent-impact register) -> later validation/correction of the descent against the register (re-check PC-1..PC-4; constrain DS-1..DS-7).
