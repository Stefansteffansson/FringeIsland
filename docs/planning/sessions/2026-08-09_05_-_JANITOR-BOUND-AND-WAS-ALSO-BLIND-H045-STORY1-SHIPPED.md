# Session bridge — the janitor was blind as well as unbounded, and H045's smaller-sounding half shipped

**Date:** 2026-08-09 (session 16) · **Wave:** Ferd · **Cycle:** none active
**Continues:** [`2026-08-09_04`](./2026-08-09_04_-_RECLAIM-APPLIED-FIRST-GREEN-FLEET-E2E-04-MECHANISM-FOUND.md) — **discharges both items in its "Next".**

---

## READ THIS FIRST

1. **`TASK-E2E-04` is CLOSED on the mechanism** — and the mechanism was **two defects**, not the one the task recorded. The janitor was *blind* as well as unbounded.
2. **`FEAT-H045` STORY-1 is built and shipped.** The feature is **`5-in-cycle`, NOT `6-done`** — STORY-2 and STORY-3 need PC029, which has not landed.
3. **One acceptance criterion turned out to have a false premise.** It is recorded as a correction, not quietly reinterpreted, and **not** built around by inventing scope.
4. **Two PRs merged (#471, #472)**, each verified by `mergedAt` + content on `origin/main`. **Zero open.**
5. Fleets: **136/136 (9.0m)** then **137/137 (9.3m)**. Second one includes the new E2E cell.

## TASK-E2E-04 — the correction is the interesting part

The task's own premise was *"O(every anonymous user in the database)"*. **That was half right, and the other half was hiding the opposite failure.**

`auth.admin.listUsers({ perPage: 200 })` pages over **all** users and filters `is_anonymous` client-side. Measured against the dev DB before any change:

| | |
|---|---|
| `auth.users` total | **2 978** |
| of which anonymous | **43** |
| anonymous inside the **newest 200** | **0** |
| oldest surviving Mist | **2026-06-27** |

So the janitor never saw "every anonymous user" — it saw whichever anonymous users happened to land on page 1 of 2 978. **During a fleet that is nearly all of them** (fresh Mists are the newest rows — hence the recorded 156). **At rest it was almost none of them.** Six weeks of Mists had survived every sweep behind a janitor that reported success every run.

The red test recorded it flatly: against the old code, an unbounded sweep left **43 of 43** standing — `Expected: 0, Received: 43`. A behavioural red, not an import error.

**One mechanism fixed both:** resolve the batch by **SQL against `auth.users`** (exact, one round-trip regardless of N, personal group carried on the row), and bound each spec's sweep with a watermark read from the **database clock** — not the local one, because they are different clocks and a few seconds of skew would silently widen or narrow the bound. The unbounded sweep survives where it belongs: **global teardown, paid once**. A malformed watermark **throws** rather than degrading quietly into a full sweep inside the 30s budget.

Verified against the substrate rather than trusted: anon **43 → 0**, `auth.users` **2 978 → 2 935** (−43 exactly), orphaned personal groups **954 → 954** — not one deletion orphaned a group, so INT-03's property held through the change.

**The evidence worth carrying forward is the teardown instrument, reproduced across two independent fleets:**

```
[e2e-teardown] Anonymous sweep (unbounded, once): 1 -> 0
```

Across a whole fleet the bounded per-spec sweeps left **exactly one** Mist outside their watermarks, and the once-paid global sweep collected it. Both halves working, neither masking the other. A large number would have meant mis-cut watermarks; a zero would have meant the global sweep was never exercised.

**Scope held back deliberately:** the **integration-tier half** of E2E-04 (W-7's PAIR-shaped emission cells) is **NOT closed**. That tier never called the janitor, so this cannot be its mechanism. Folding it in because the two shared a *profile* is exactly the error the task warns against. It needs its own observation.

**The volume hypothesis is RETIRED, not confirmed** — three measurements undercut it, and it was never tested directly. It did not need to be: it was superseded.

## FEAT-H045 STORY-1 — shipped, and one AC could not be met as written

The partition, the `Retired (N)` disclosure, absent-at-zero, the named empty state, unretire still reachable inside the fold. Reuses the H044 disclosure idiom; one row renderer for both sections; count and rows from the same array so it cannot lie. No migration, no API change, no new component family.

**Red-first at the unit tier** — 6 cases seen failing first. Unit tier **1420/1420**.

**THE PREMISE CORRECTION.** STORY-1's last AC says a template is retired *"from the detail view"*. **The detail view carries no retire affordance** — retire/unretire live on the list; only the route exists. Building the button is scope the story never asked for, so what is pinned is the guarantee the criterion protects: **the list must not come back stale**. The E2E returns via a client-side `goBack()`, never `page.goto`, which resets module state and would mask exactly that staleness (J-D). **Recorded in the spec for re-walk if that button is ever added.**

**Two sibling unit cases adapted, labelled in place.** The notable one asserted *"the row REMAINS listed, marked — retirement is not a disappearance."* STORY-1 changes that assertion's **reach**, not its truth, so it was **kept and extended** — the disclosure must appear *and* the row be revealed under it, still badged — never dropped.

**Labelled honestly:** the E2E is **test-after** and passed first run. Not vacuous (`retired-templates-toggle` did not exist at head), but not red-first either, and it does not claim to be.

## A trap that nearly produced a false finding

Bash cwd drifted into `hub/` mid-session. Two `grep`s over `docs/products/hub/...` returned **clean empty results** that read as *"H045 has no inventory rows"*. Both rows existed. The zero was an artefact of the relative path resolving under `hub/`. Caught by re-running from an absolute root — the standing *"run the control before believing a zero"* rule, earning its place again.

## Standing items

- **The integration-tier half of E2E-04** (W-7 PAIR cells) — open, needs its own observation and mechanism.
- **`FEAT-H045` STORY-2 + STORY-3** — blocked on **FEAT-PC029** (`4-ready`, unbuilt).
- **A detail-view retire affordance** — not built, not requested; would make H045 STORY-1's last AC literally true.
- Carried: **AB-6's docket** · Phase-4 cutover · the `done`-no-longer-implies-sweepable tension · deferred Eid piles · G-3 journeys deferral · `TASK-RDA-03` · `TASK-E2E-02/03` · the `hub/SPECIFICATION.md` → `./ROADMAP.md` placeholder · `TASK-INT-03`'s 954 orphans by design.

## Numbers at close

E2E **137/137** (9.3 min) · unit **1420/1420** (170 suites) · integration `e2e-janitor-is-bounded` 4/4 (red-first) + INT-03 regression 4/4 · eslint **0 errors** (3 warnings, all pre-existing in untouched files — found, not caused) · `next build` clean · anonymous users **43 → 0** · orphan instrument **954 → 954** · DeusEx leak **0 → 0** · dashboard refreshed (836 files) · discovery clean and **0/0**.

## Next

**FEAT-PC029** (unblocks H045 STORY-2/3), then **AB-6** and Phase-4 cutover. The integration-tier PAIR-cell mechanism remains open and un-owned.

## Close ritual

- [x] A task closed on the **mechanism removed**, never a count of green fleets — and a green fleet explicitly refused as the argument
- [x] The task's **own recorded premise corrected** on measurement rather than inherited
- [x] A feature's acceptance criterion found false, **recorded rather than reinterpreted**, and not built around by inventing scope
- [x] Sibling test adaptations **labelled in place**, assertions extended rather than dropped
- [x] Test-after coverage **labelled as test-after**, never claimed as TDD
- [x] A feature left at `5-in-cycle` because two of its three stories are genuinely unbuilt
- [x] Two PRs merged and verified by `mergedAt` + content; zero open
- [x] Dashboard refreshed; discovery swept and synced **0/0** at open and close
