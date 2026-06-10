# Session openers

This directory holds session-opener artifacts for autonomous L1→L3 derivation runs and for amendment sessions that fold deferred findings into canonical specs. Each per-entity run is bootstrapped by a small `.md` file that the CC terminal reads as its first action.

The canonical template for autonomous L1→L3 openers lives at [`docs/templates/autonomous-l1-l3-session-opener.md`](../../../templates/autonomous-l1-l3-session-opener.md).

The pipeline status across all entities and amendment sessions is tracked in [`STATUS.md`](./STATUS.md).

Executed and superseded openers are preserved in [`archive/`](./archive/) for provenance: the pre-template chain (PC-3 chain + Experiment B + non-experiment PC-3 prep), the executed PC-1..PC-4 amendment/autonomous instances, the old-universe review prompt, and the reconciliation Session B opener (2026-06-09). Only live artifacts stay at this level: the next session's opener, the reusable prompts (`cc-create-opener-prompt.md`, `bounce-back-prompt.md`), `STATUS.md`, and this README.

---

## How to start the next session

Two steps, both inside a single CC terminal session opened in `D:/WebDev/GitHub/FringeIsland/` on `main`. The `Next`-marked row in STATUS.md tells you what kind of session to start: an autonomous L1→L3 run (under one of the entity tables) or an amendment session (under the Amendment sessions table). The two work shapes differ; the prompts below cover the autonomous L1→L3 case. Amendment sessions are a known-scope fold-back (no cold derivation, no Step 2 stress-test); their session-opener authoring is a separate prompt and will be drafted at the first amendment session.

### Step 1 — author the per-entity opener (autonomous L1→L3 runs)

Paste into CC the contents of [`cc-create-opener-prompt.md`](./cc-create-opener-prompt.md), or this verbatim:

> *Read `docs/planning/sessions/openers/STATUS.md`. Find the first row marked `Next`. Author the opener instance for that entity per the template at `docs/templates/autonomous-l1-l3-session-opener.md`, by reading the template's §0 substitution markers and filling each one against the current program state (latest predecessor bridge, current tip SHA, entity-specific carry-forward block from the predecessor's pickup list). Write the result to `docs/planning/sessions/openers/cc-{entity-short-name}-autonomous.md`. Delete §0 from the instance (only needed during authoring). Commit as a small `chore(planning)` commit with one file. Then update STATUS.md to mark the entity `In flight`, fill in its Opener instance column, and commit STATUS.md as a separate small commit.*

CC reads the template + bridges, produces the filled-in instance, commits it, updates STATUS.md, commits STATUS.md. Two small commits. No push.

### Step 2 — execute the run

Optionally `/clear` CC's context to start fresh for the run. Then paste the contents of [`cc-execute-prompt.md`](./cc-execute-prompt.md), or this verbatim:

> *Read `docs/planning/sessions/openers/cc-{entity-short-name}-autonomous.md` and proceed.*

CC runs §1 pre-flight, §2 state-read, §5a Step 1 cold derivation, surfaces the §5a checkpoint, waits for your ratification, then proceeds through Step 2, Step 3, §13 post-run capture, and the closing bridge per the template.

### After the run lands

When the closing bridge has landed, update STATUS.md to mark the entity `Done`, fill in the Closing bridge column, the §13 captured column, and the Template revision column. If the closing bridge's Template revision disposition proposed an amendment, land that as its own small `chore(templates)` commit citing the closing bridge as provenance and update the template's Revision history table.

---

## Files in this directory

- `STATUS.md` — pipeline status across all entities and amendment sessions.
- `cc-create-opener-prompt.md` — the generic Step 1 prompt; paste into CC verbatim to author the next opener.
- `cc-execute-prompt.md` — the generic Step 2 prompt; paste into CC verbatim to execute a freshly-authored opener.
- `cc-{entity-short-name}-autonomous.md` — per-entity opener instances (authored at entity entry; one per entity; e.g. `cc-pc4-autonomous.md` when PC-4 enters).
- `archive/` — historical openers from before the template existed: PC-3 chain + Experiment B + non-experiment PC-3 prep.

---

## Why the rewrite (2026-05-14)

This directory previously held openers for Experiment B (autonomous vs manual comparison on PC-3) and a non-experiment PC-3 workflow. Both workflows are now historical:

- Experiment B closed at the comparison-phase bridge (`2026-05-14_03_-_EXPERIMENT-B-COMPARISON-PHASE-COMPLETE.md`).
- PC-3 derivation completed at the Step 3 closing bridge (`2026-05-14_02_-_PC3-STEP3-LANDED.md`).

PC-4 onward run as canonical autonomous runs against the template at `docs/templates/autonomous-l1-l3-session-opener.md`, which encodes the durable disciplines and carry-forwards surfaced by the PC-3 chain + Experiment B comparison phase. PC-2 amendment session — first in the amendment-sessions queue — runs before PC-4 entry, folding deferred Experiment A + Experiment B findings into the PC-2 canonical spec.
