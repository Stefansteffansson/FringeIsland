# Session bridge — RD-B walked; ten findings, and two acceptance criteria that had shipped unbuilt

**Date:** 2026-08-07 → 2026-08-09 (session 14, long) · **Wave:** Ferd · **Cycle:** RD-B (**CLOSED** — both halves `6-done`, walked, fixed, merged)
**Follows:** [`2026-08-07_01_-_RD-B-DECOMPOSED-BUILT-APPLIED-MERGED-H044-REMAINS.md`](./2026-08-07_01_-_RD-B-DECOMPOSED-BUILT-APPLIED-MERGED-H044-REMAINS.md)

---

## READ THIS FIRST

1. **RD-B is closed.** `FEAT-H044` and `FEAT-PC028` are both `6-done`. Four PRs merged and verified by `mergedAt` + ancestry + content on `origin/main`: **#453** (the H044 build + the PC028 STORY-8 corrective), **#454** (walk findings), **#455** (the walk fixes). Two migrations applied on named approvals: `20260807140000` and `20260808120000`.
2. **The live walk found two acceptance criteria that had shipped `6-done` unbuilt** — and Stefan found both in his first two clicks of the surface. Detail below; the root cause is the most valuable thing this session produced.
3. **Four findings remain open and unruled: W-6, W-9, W-10, and the deeper half of W-7.** All recorded in the [walk findings](../hub-v2/2026-08-07-rd-b-desk-walk-findings.md).
4. **`TASK-E2E-04` reproduced and was reframed** — it is no longer "is `entry.spec` flaky" but "do arrival/emission assertions degrade as the notifications table grows, across both tiers". Raised to high.

## The two ACs that shipped unbuilt

| | What was claimed | What was true |
|---|---|---|
| **W-5** | STORY-3: *"publish platform-wide, **publish to named groups**, unpublish"* | The contract accepted `p_group_ids uuid[]`, the route accepted `group_ids`, the lib passed it through — **and the UI had no picker**, so the targeted publish that is RD-B's entire point was unreachable. |
| **W-8** | STORY-4: *"each names its own group — the recipient must not have to guess"* | All three notices said *"your group"*. A Steward of five groups received five identical notices about five different groups. |

## The root cause — one mistake, made twice, green both times

**A fixture that invents a payload the substrate never produces.**

- W-5's unit cell asserted named reach *renders* from a hand-authored `publications` payload — a state no door could create.
- W-8's asserted that two notice bodies naming different groups render distinctly — bodies the server never wrote.

Both proved the **surface renders a distinction correctly**. In both cases the distinction did not exist upstream. Green, and meaningless, at `6-done`.

**Why the payload walk missed it:** the walk traces **keys** and never asks what the **value** reads like. `group_id` is present ✅ — and the sentence still said "your group". The N-E copy-check rider was meant to cover exactly this, but as practised it verified the strings the **component** renders in its own test, not the strings the **server** authors. For server-authored copy those are different documents and only one of them ships.

**Two rules now encoded in the suite:**

1. **When copy is server-authored, the copy check reads the migration's literal**, never the component's fixture. A component test can prove the surface renders what it is given; it can never prove the server gives it that.
2. **When a feature adds a write door, at least one test must reach the state through that door.** A fixture may set up everything the door is not responsible for — never the thing it produces.

`role-distribution.spec.ts` now signs an admin in and **publishes through the picker** instead of inserting the row — which is also what finally verified the scoping claim the live walk could not reach.

## What the walk produced

Ten findings. Six acted on, four open.

| | Finding | State |
|---|---|---|
| W-1 | Notices landed at the top of the group page, six sections above the roles panel | **fixed** — `?focus=roles`, section expands, scrolls, rings |
| W-2 | The section was stricter than the panel it lived in | **ruled + fixed** — `canManage` alone; **amends STORY-1's AC** |
| W-3 | The section opened with four nothing-to-do rows | **ruled + fixed** — actionable only |
| W-4 | *"0 members hold this role. They keep the role…"* | **fixed** |
| W-5 | Publish to named groups never built | **fixed** — the picker |
| W-6 | The publish ceremony never states its blast radius | **OPEN, unruled** |
| W-7 | Integration cell C3 fans out across the whole group table | **half fixed** — see below |
| W-8 | The notices never named their group | **ruled + fixed** (migration) |
| W-9 | A guaranteed refusal is still offered as a button | **OPEN** — RD-A's, routed there |
| W-10 | A clone can never leave the catalogue | **OPEN** — observation |

## W-7 was worse than it was filed as, and partly my doing

Filed as tidiness. After the W-8 apply the integration fleet came back **1109/1112** — three assertion failures across two `tests/integration/notifications` suites.

| Run | Result |
|---|---|
| notifications **alone** | **120/120 clean** |
| each failing suite alone | **51/51 clean** |
| groups + notifications | 1 failure — **a different suite** |
| full fleet | 3 failures, two suites |
| groups + notifications, after the fix | **507/507 clean** |
| full integration, after the fix | **1112/1112 clean** |

The victim **moves between runs** and everything is green alone — a volume/timing-sensitive emission assertion, not a broken test. Every failing cell is PAIR-shaped (*"X emits and Y does not"*).

**I could not fence it as "found, not caused."** The morning's clean run had cell C3's platform-wide publish but **not** the four new W8 cells, which also publish, retire and dispatch. I added to a load that directory was already carrying badly, so I removed my own contribution rather than blaming the pre-existing one: the suite now clears its dispatched notices in `afterAll`.

**One clean run each way is supporting evidence, not proof** — `TASK-INT-04` measured a sibling at 2 failures in 5. **And the deeper half is untouched:** those cells are sensitive to notification volume *at all*. Cleaning one suite's rows treats the instance, not the cause.

## Method notes worth carrying

- **The desk walk earns its keep.** Four of the ten findings came from walking the narrative against the code before anyone opened a browser — including W-1, which was the highest-value one.
- **Two rulings amended written ACs.** W-2 and W-3 both overrode acceptance criteria whose premises were false. That is the walk working, not the walk failing.
- **A control that does not verify its own precondition is not a control.** The first attempt to prove the notification-icon cell non-vacuous used `\n` in a perl substitution against a CRLF file, silently did nothing, and reported a false green.
- **A trailing cleanup is not cleanup.** A new W8 cell's trailing `unretire` threw past its assertion and cascaded two later failures into a wrong diagnosis — the exact trap the PC028 build had already recorded. Now `try/finally`.
- **I wrote a bare unscoped `getByRole` in the very cycle whose sweep obligation is about unscoped selectors.** Caught by its own ambiguity error.

## Standing items

- **W-6, W-9, W-10** — need Stefan's ruling. W-9 is RD-A's behaviour and he already ruled the pattern at the ADM-E walk (WA-1: guaranteed no-ops disable).
- **The deeper half of W-7** — emission assertions sensitive to notification volume, both tiers.
- **`TASK-E2E-04`** (reproduced, high) · **`TASK-INT-03`** (fixture leakage; likely the upstream cause of the above) · **`TASK-RDA-03`** · **`TASK-E2E-03`** · **`TASK-E2E-02`**.
- **A short re-walk is owed** on the three changed surfaces: the available-roles section, the admin picker, and clicking a notice.
- Carried: AB-6's docket · the `done`-no-longer-implies-sweepable tension · the deferred Eid piles · the G-3 journeys deferral · the pre-existing `hub/SPECIFICATION.md` → `./ROADMAP.md` broken link (a registry placeholder).

## Numbers at close

Unit **1403/1403** (170 suites) · integration **1112/1112** (76 suites) · lint 0 errors (3 pre-existing warnings) · `next build` green · E2E **134/136**, both failures fleet-only and green in isolation, filed under `TASK-E2E-04` rather than absorbed. Dashboard refreshed (824 files). Discovery worktree clean and in sync at open and close.

## Next

**The RD-B re-walk** (three surfaces), then rulings on W-6/W-9/W-10, then **AB-6** and Phase-4 cutover.
