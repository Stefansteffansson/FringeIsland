# Session bridge — the A-NTF gate's paperwork cleared: U039 and U050 accepted, both changelogs whole, the retro written

**Date:** 2026-07-26 (session 02) · **Wave:** Ferd · **Area:** A-NTF (Notifications) — the **area gate**, not a cycle
**Follows:** [`2026-07-26_01_-_A-NTF-N-D-BUILT-PREFERENCE-HOME-SETTLED-AREA-BUILD-COMPLETE.md`](./2026-07-26_01_-_A-NTF-N-D-BUILT-PREFERENCE-HOME-SETTLED-AREA-BUILD-COMPLETE.md)

---

## One-paragraph state

Six PRs, all merged (#298–#303), `main` at `7db71a9`, working tree clean, no open PRs, discovery synced 0/0. **Every gate item that does not need Stefan or a deployed environment is now done.** ADR-U039 got its Amendment 2; ADR-U050 was **accepted**; both changelogs carry all four A-NTF cycles; the merged DOC-003 + DOC-005 architecture-doc pass ran; the area retrospective is written; and the two steering-file fixes it routed are in force. **No ADR in the repo now sits at `Proposed`** — verified. What remains at the gate is exactly and only: **Stefan's live walk**, **two ADR-U043 measurements** (deployed environment, ≥20-min idle each), the **queued ephemeral task sweep**, and writing the verdict into the retro's open gate section.

## The session's shape: two of the first three items were half-stale

The prior bridge's standing list was written in good faith and was **wrong in two places**. Both were caught by verifying before executing, which is the transferable lesson.

| Bridge item | Reality |
|---|---|
| "ADR-U039 is still `Status: Proposed`" | **Already accepted** in `6c2e72c` (PR #292) — *before that bridge was written*. A stale item carried forward. |
| "ADR-U050 blocked, hold until the C-F gate accepts it" | **The gate merged 2026-07-21**, five days earlier. The blocker had dissolved; only the status line lagged. |
| "Root CHANGELOG missing N-A/N-B" | True, but **the diagnosis was wrong**: N-B *had* written its entry — into `hub/CHANGELOG.md`. Only N-A wrote nothing anywhere. |

The live half of the U039 item was different from the filed one: Amendment 1 named **N-D** as the home of the shared-topic optimisation, ND-6 deferred it to **Eid**, and N-D then closed — so the ADR was pointing a future reader at a finished cycle. **Amendment 2** records the deferral, both reasons (the saving is currently zero because NC-2 defaults the platform nudge off; a shared topic is a channel-taxonomy change, not a tuning), and makes the revisit trigger **a number, not a date** — ND-4's live cost line showing something someone wants smaller.

## What shipped

| PR | Item |
|---|---|
| **#298** | ADR-U039 Amendment 2 — shared-topic optimisation repointed N-D → Eid |
| **#299** | Root `CHANGELOG.md` — N-A and N-B backfilled, labelled as area-gate backfills |
| **#300** | `hub/CHANGELOG.md` — N-A, N-C and N-D backfilled (the mirror gap) |
| **#301** | Merged DOC-003 + DOC-005 architecture-doc pass; **ADR-U050 accepted** |
| **#302** | A-NTF area retrospective |
| **#303** | The two steering-file fixes the retro routed |

### The changelog gap was a 2×2, not the two holes filed

Both files were half-right and neither was whole:

| Cycle | Root | `hub/` |
|---|---|---|
| N-A | missing | missing |
| N-B | missing | **present** |
| N-C · N-D | **present** | missing |

**Root cause:** the DoD said only *"Update `CHANGELOG.md`"* and never named a file, while **three** changelogs exist. Every close-ritual checkbox read "done" and was locally honest each time. Fixed in #303 — see below.

### ADR-U050 accepted on evidence, not on the gate's say-so

All five decision points verified realized in `20260721161500_c_f_account_lifecycle_self_service.sql`: the origin column (L42), the `'admin'` backfill (L52), the three self-service RPCs (L123/191/257), both ADR-U047 fact handlers (L58/89), the state derivation (L561), and `DROP FUNCTION admin_exit_user_from_platform` (L611). An Acceptance record states that evidence in the ADR.

### DOMAIN_ENTITIES was worse than its task described

TASK-DOC-003 called the step substrate *missing*. It was not merely missing — the doc **actively asserted the superseded model**, presenting `content.steps[]` with the sealed `content | activity | assessment` union as the live shape, when ADR-U044 had converted that into rows and **nulls `content` on conversion**. A reader arriving from the root `CLAUDE.md` document map was being confidently misinformed. It now carries a freshness marker (with an explicit Ferd-era caveat), the substrate at entity grain, and the `response` payload's full privacy posture; the legacy JSONB is **demoted, not deleted**, so an unconverted row stays recognisable.

`ARCHITECTURE_ANATOMY.md` absorbed U050 on the PC-2 Identity row, stated as the ownership line the anatomy actually draws. Doc and diagram were deliberately **separated in depth**: the SVG was reviewed for U050 with *no diagram impact*, and its companion line no longer claims a currency it never had.

## The retro, and the two fixes it produced

[`retro-2026-07-26-notifications-area.md`](../retrospectives/retro-2026-07-26-notifications-area.md) is written **at the build close with its gate section deliberately open** — the walk goes better with the learnings in hand, and every prior area found the walk *generates* retro material rather than confirming it.

Three of its seven learnings are **classes, not incidents**: the sibling-assertion defect at its third strike; false greens that only a paired failing twin exposes; and ADR status lines lagging their own acceptance conditions (U039 and U050 both, this session).

Both steering fixes landed in **#303**:

1. **`PROCESS.md` §DoD is now canonical** on which changelog is owed — all three named, with who each is owed to and its register. **`AGENTS.md` and `SKILL.md` (both occurrences) now point at it rather than restating it** — four independent wordings free to drift is what caused the rot, so collapsing them to one source is the fix; four *corrected* wordings would only reset the clock.
2. **The sibling-grep rule** requires a migration changing shipped semantics to list the assertions it invalidates **in its header**, each marked adapted or deliberately left, and says explicitly that naming only your own guarded test is insufficient. **Deviation, recorded:** the retro called this "a migration-template line" — **there is no migration template**, so it landed in `docs/platform/CLAUDE.md` beside the schema-gate discipline.

## Honest record

- **I violated an already-codified rule three times.** `AGENTS.md:85` already said to cross-check a negative search result before logging something as absent. Three greps this session returned nothing and I twice began reasoning from the absence — the schema uses lowercase `create table`, and **four of six ADR filenames differ from their obvious slug**. Each was caught before it reached a document, but the rule didn't need writing; it needed following. The retro carries this as learning 6 and notes it was already on the books.
- **An ordering slip in `hub/CHANGELOG.md`** — the first insert put 07-23 above 07-24. Caught and fixed before commit.
- **I merged #302 under fuller-auto** rather than holding it, on the reading that a retro is additive docs and the document itself declares its gate section open. Flagging in case that call should have been a pause.

## Two findings surfaced but deliberately not acted on

- **`doc-health-check` has no check that an owed changelog entry exists** — it only ever *excludes* `CHANGELOG.md` from its greps as an append-only record. The DoD now says what's owed; **nothing verifies it at a cycle boundary**, which is the same shape of hole the honest-but-wrong checkboxes fell through. Worth a Section in the skill.
- **`docs/platform/core/CHANGELOG.md`'s last entry is 2026-06-26**, though Core specs have shipped since (C-F's PC017/PC005). The new rule applied retroactively would show it behind. Not backfilled — it raises the same "from outside the cycle" question the root backfill faced, and deserves its own decision.

## Where the next session starts

**Still the A-NTF area gate — but only the parts that need Stefan or a deployed environment.**

- **Stefan's live walk.** The retro is written and in hand for it.
- **Two owed ADR-U043 measurements** — N-C's `/groups` before/after and N-D's preferences page. Each needs a deployed environment and a ≥20-minute enforced idle window. The standing cold exception applies with its 2026-07-22 rider: the exception never waives the measurement pass, and warm/semi-warm budgets remain fully binding.
- **Write the verdict** into the retro's open gate section, and create the gate document (`docs/planning/hub-v2/2026-XX-XX-notifications-area-gate.md`) following the A-COM/A-JRN pattern.
- **The queued ephemeral task sweep** — `TASK-NC-01..04`, `TASK-NC-06`, `TASK-ND-01..05` are ready to delete; **`TASK-NC-05` must survive** (it carries the owed `/groups` measurement). Deliberately not done: no gate verdict yet, and deletion is a carve-out.
- Smaller, still open: **NB-8** Mist-posture proof · **W12** per-RPC verification · **U049 §8 Q1** adapter ownership · the **email-deferral** recording · the **DS-5 spec advance**.

**Then A-ADM (Platform-Ops)** — the sixth and last Phase-3 area, whose area-open design session is where [`TASK-OBS-01`](../backlog/tasks/TASK-OBS-01-telemetry-sink-and-analytics-posture.md) finally lands. It was bet at the N-D boundary precisely because that dependency is now the very next thing to happen.

## Close ritual

- [x] `npm run dashboard` — refreshed (7 tabs, 728 files indexed)
- [x] Targeted doc-health checks run inline (pointer integrity, link resolution, cascade-adjacent steering edits); **a full `doc-health-check` was not run** — the cross-cutting changes here were doc-and-steering only, each verified in place, but the next cycle boundary should run the full skill
- [x] Session bridge (this file)
- [x] Discovery sweep — worktree clean, `discovery` 0 ahead, `main` 6 ahead → fast-forwarded and pushed; now **0/0**
- [x] All six PRs merged, branches deleted, `main` synced at `7db71a9`, working tree clean, **no open PRs**
