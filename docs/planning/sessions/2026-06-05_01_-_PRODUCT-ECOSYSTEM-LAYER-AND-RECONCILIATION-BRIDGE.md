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
