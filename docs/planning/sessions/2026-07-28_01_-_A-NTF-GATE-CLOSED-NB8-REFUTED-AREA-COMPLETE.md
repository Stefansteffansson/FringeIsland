# Session bridge — the A-NTF gate is CLOSED, and NB-8's proof refuted its own premise

**Date:** 2026-07-27 → 2026-07-28 (session 04 / 01) · **Wave:** Ferd · **Area:** A-NTF — closed
**Follows:** [`2026-07-27_03_-_DOC-HEALTH-RUN-W05-W01-W02-FIXED-W12-FOUND-ANON-HOLE.md`](./2026-07-27_03_-_DOC-HEALTH-RUN-W05-W01-W02-FIXED-W12-FOUND-ANON-HOLE.md)

---

## READ THIS FIRST — what the next session must pick up

**A-NTF is closed. A-ADM (Platform-Ops) is next — the sixth and last Phase-3 area**, where [`TASK-OBS-01`](../backlog/tasks/TASK-OBS-01-telemetry-sink-and-analytics-posture.md) lands at area open.

**Three exit-checklist lines were deliberately left unticked, and one of them is a real gap.** They were not gate-closing conditions, and ticking them on "the cycle probably did it" is the locally-honest-checkbox failure this area's own retro warned about. **Take care of these in the upcoming session(s):**

| # | Item | State | What to do |
|---|---|---|---|
| 1 | **Oracle spine ported** | **REAL GAP — the one with positive evidence** | `B-COMM-001/002/003` **are** ported and labelled (`notification-contracts.test.ts:8-10`). **`B-NOTIF-001`, `B-NOTIF-003` and `B-ADMIN-011` were not found anywhere under `hub/tests/`.** Port them, or rule explicitly that they are superseded and record why. Do not close this by re-grepping and shrugging |
| 2 | **NTF-6 wired to the three dedicated handlers, with adversarial direct-call tests per handler** | Unconfirmed | The capability is built and its suite is green, but a grep for the three handler names in `actionable-notifications.test.ts` returned nothing. Likely my naming/location miss rather than an absent test — confirm where those adversarial tests live, or write them |
| 3 | **Conformance gate: `DS_OWNED_ALLOWLIST` += DS-5 notification RPCs** | Unconfirmed | The conformance suite passes (platform 15/15), which is the outcome the line protects — but I could not locate the allowlist entries themselves, so I cannot say whether the edit was made as written or the RPCs pass via the `/^ds\d+_lifecycle_/` auto-allow. Confirm which |

Also open, filed not buried: [`TASK-INT-03`](../backlog/tasks/TASK-INT-03-test-fixture-orphaned-personal-groups.md) and [`TASK-INT-04`](../backlog/tasks/TASK-INT-04-nd-pair-suppression-intermittent.md) (below). Still non-blocking from the walk: **W-03**, **W-07**, **W-08**.

---

## One-paragraph state

`main` at `142f8d9`, tree clean, no open PRs. **Five PRs merged (#321–#325)** and **four migrations applied and verified live**. The A-NTF area gate is **CLOSED** — all six independently-owed items discharged, the task sweep executed, the area retro already written. `public.notifications` went **65 654 → 16 923** rows across three cleanups, with every survivor provably reachable. Suites at close: unit **998/998**, integration notifications **89/89**, platform **15/15**, groups **198/198**, `next build` clean, eslint 0 errors.

## The through-line: three owed items were WRONG, not merely undone

That is the session's real finding, and it is worth carrying into A-ADM as a prior.

1. **NB-8's premise was false.** It asked for an adversarial proof that the delivery path *structurally excludes* Mist durable rows. Run against the live DB, the proof **refuted itself**: every Mist held a `role_assigned` row from its own personal-group bootstrap, could read / mark-read / **export** it, and was refused only at the preference doors — **a notification it could see and had no mechanism to silence.** Not a leak (self-referential, CASCADEs away on erase), and not even Mist-specific: **1516 of 1548 FIMs carried the identical row.** V3's own risk register had predicted this at `:57` and named the detection method; this was the first time anyone ran it.
2. **W-09 was filed against the wrong scope.** It named `membership`. But **`stewardship_nomination` — 802 rows, the largest ask population in the system** — sat in the equally-suppressible `stewardship` category with the identical defect, and the finding never named it. The ruled principle does not care which category an ask sits in, so all three asks moved.
3. **The 937 ms had a documented cause that measurement contradicted.** See below.

A fourth was *worse* than filed: **W-04** did not merely fail to point anywhere — it navigated to `/groups/[id]`, which offers an invited viewer **no accept/decline affordance at all**. The letter led to a dead end.

## Decisions taken (Stefan, presented as one board)

[`2026-07-27-antf-gate-decision-board.md`](../hub-v2/2026-07-27-antf-gate-decision-board.md) — all three adopted as recommended.

- **GB-1 — Both guards.** The dispatcher refuses any row whose recipient is `is_temporary` (catching all ~38 writers *by construction*, the NC-1 precedent), **and** `notify_role_assigned` skips self-assignment (guarded on the structural shape `member_group_id = group_id`, never the seeded role name "Myself", so a rename cannot silently re-open it).
- **GB-2 — U049 §8 Q1 resolved:** DS-5 owns channel adapters below the Platform API; PC-1 owns transport substrate. Two facts settled it: the opposing lean's anchor (`app/api/invitations/send-email`) lives **only in `hub-legacy/`**, the frozen v1 oracle — it was never part of the app being built — and **ADR-U038** forbids a BFF route being the sole home of a rule regardless. Recorded **resolved-in-principle, unrealized**.
- **GB-3 — Asks split from news, asks unmutable.** New `asks` category (`member_suppressible = false`, reusing the axis `account` already proved) holding all three asks. `membership` / `stewardship` are news-only and relabelled to name the telling. **W-04 shipped with it**, as required.

## Migrations applied (all verified live)

| Migration | What |
|---|---|
| `20260727180000` | Mist posture + the asks split (board GB-1 + GB-3) |
| `20260728060000` | Retired **12 512** bootstrap self-rows |
| `20260728080000` | Retired **36 961** unreachable orphan rows |

**The control that mattered:** legitimate `role_assigned` rows were **24 420 before and 24 420 after** — a real role in a real group is real news and had to survive. Final reconciliation: 16 923 rows = 15 312 reachable by a live user + 1 611 addressed to engagement groups. **Nothing orphaned remains, nothing reachable was touched.**

## Corrections I had to make to my own numbers — twice

Both are recorded because the pattern matters more than either number.

- **"~1516 FIM bootstrap rows" was wrong; the real population was 12 512.** My count had joined to `users`, so it only saw rows whose personal group still had an owner.
- **"47 866 orphan rows" was wrong by the time I acted; the remainder was 36 961**, because the bootstrap cleanup had already taken the overlap.

**And I characterised the orphaned groups as inert. They are not** — 8 690 are members of real groups, 577 hold journey enrolments, 401 authored messages. **They were deliberately left in place**; deleting them would cascade into live member lists and destroy message attribution (against ADR-U021's spirit). That remains an open decision, not a to-do.

## A retraction worth reading

The N-D suppression PAIR test failed once in a fleet run. I called it a flake on the strength of one isolation pass and one clean re-run. **It failed again — 2 of 5 full-directory runs, 25/25 in isolation.** That is not a flake profile. Filed as [`TASK-INT-04`](../backlog/tasks/TASK-INT-04-nd-pair-suppression-intermittent.md), which records the retraction explicitly so the next person does not repeat the dismissal. **The failing assertion was never captured** — every attempt landed on a passing run — so the task requires capturing it before acting on my hypothesis (that changing `MUTED_KIND` to `member_left` is implicated).

## The 937 ms — and a lever closed by measurement

[Full record.](../hub-v2/2026-07-28-antf-warm-ceiling-investigation.md) **Not a defect.** Warm steady state is **~400 ms** (n=10, 308–436, zero over the 1 000 ms ceiling); the 937 ms was a **partial-warmth** number.

**The parked fan-out lever is REFUTED, not deferred** — it was an explicit un-park candidate at this gate, and the decisive comparison went the other way:

| Page | Reads | In `BOOT_PATHS` | Walls (ms) |
|---|---|---|---|
| `/groups` | 4 | **yes** | 1 439 · 3 477 · 928 · 938 |
| `/notifications/preferences` | 6 | no | 942 · 328 · 410 · 442 |

Fewer reads with full bundle coverage measured **slower**. The reads are fully concurrent, so cost is `max(read)`, not `sum(read)`. **Do not build the badge-read consolidation for performance reasons.**

**What survives is the real signature: correlated stalls.** When a page is slow, *every* read is slow by the same amount, finishing within ~5 ms of each other — a shared pooler/instance stall, worst observed **3 477 ms on `/groups`**. Platform-tier, belongs with the standing cold-load exception.

## Two harness defects and one test-fixture leak, all fixed at source

- **`perf-measure.mjs`: `STATE` and `OUT` resolved to the same file.** A rename from `antf-perf-measure.mjs` left `OUT.replace('antf-perf-results.jsonl', …)` matching nothing, so `signin` wrote the Playwright session into the results file and the first `measureNav` corrupted it. It hid because multi-nav phases build their context once per process — **so it only bites the *next* invocation, i.e. exactly when re-measuring after spending a 20-minute idle window.**
- **`waterfall` was hardcoded to one path** — which is why the `/groups` attribution that settled the perf question had never been obtainable.
- **`cleanupTestUser` orphaned a personal group on every single call.** It deleted the group *before* the auth user and **ignored the result** — and that delete could never succeed, because `users` still referenced the group and the FK's `SET NULL` trips a `personal_group_id` immutability trigger. The swallowed error was followed by the auth delete, which CASCADEd `public.users` away. **11 150 of 12 687 personal groups (87%) were orphaned, holding 73% of the notifications table.** Order corrected; failures now logged loudly. **Residual ~6/run remains → [`TASK-INT-03`](../backlog/tasks/TASK-INT-03-test-fixture-orphaned-personal-groups.md)**, from the sole-Steward guard (correct, must not be weakened) plus unattributed sources.

## Task sweep

`TASK-NC-01..06` + `TASK-ND-01..05` (11 files) swept, link-checked first — zero markdown links broken. `TASK-NC-05`'s verdict was **lifted into the gate before deletion** (six of seven criteria met; the seventh, `/groups` before-and-after, is **half-unobtainable** — the slice was already retired when the measurement pass ran, so only after-numbers exist).

**`TASK-DOC-003/004/005` and `TASK-INT-02` were NOT swept** despite being carried as awaiting it: they are the target of live markdown links from the A-NTF retro, and editing a historical retrospective to accommodate a deletion is the worse trade. *(My first link-check reported zero inbound links and was **wrong** — the pattern was too strict. The looser control caught them. Run both.)*

## Doc health check — run 2026-07-28

```
Sections run:
1.5  Architectural drift  — 2 new concepts retired; table fed; 2 directive hits found + fixed
2    Schema drift          — 3 migrations; PD016 amendment + gate carry the record
3    Path + README sync    — 15 new links verified, all resolve; README sweep line updated
3.6  Deleted-file refs     — 11 swept task files; ZERO markdown links (ephemeral tasks are
                             out of the table by policy)
5    Maturity consistency  — 66 `6-done` specs swept whole-tree; 0 missing Implementation notes
1.6  Deviation markers     — clean in all code touched this session
8    Feature-inventory     — PD015/PD016 amended in place; maturities unchanged
```

**Fixed in place:** the live-walk script instructed muting *"Group membership & invitations"*, a label that no longer exists — annotated with the rename **and** with what Scenario 7 can no longer prove (an ask arriving despite a mute is now the *correct* result).
**Table fed, per the skill's own rule:** two Section 1.5 rows added — *invitations as a mutable `membership` notification*, and *"Mists hold no durable notification rows"*.
**Skipped:** 1 (no renames), 3.5, 3.7, 4, 6, 7, 9, 10, 11 (no ADRs added, nothing moved under `docs/architecture/`).

## Close ritual

- [x] `npm run dashboard` — refreshed (7 tabs, **730** files, down from 735 after the sweep)
- [x] `doc-health-check` — run, above
- [x] Session bridge (this file)
- [x] Discovery sweep — worktree clean and **not ahead** (no Claude.ai findings to carry up), `main` merged back into `discovery`, pushed, **synced 0/0**
- [x] Five PRs merged (#321–#325); `main` at `142f8d9`, tree clean
- [ ] **PR #326 (this bridge + the doc-health fixes) is HELD** — it edits `.claude/skills/doc-health-check/SKILL.md`, a steering file and therefore a fuller-auto carve-out. The edit is the skill's own mandated table-feeding, but it wants the nod rather than a self-merge. **The discovery sweep above ran against `main` at `142f8d9`, so it does not yet include this bridge** — nothing is lost, but re-sync after #326 merges if you want the worktree byte-identical.
