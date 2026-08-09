# Session bridge — the reclaim applied, the first fully green fleet, and a regression I shipped and caught

**Date:** 2026-08-09 (session 15, continued) · **Wave:** Ferd · **Cycle:** none active
**Continues:** [`2026-08-09_03`](./2026-08-09_03_-_SEC-01-PREMISE-FALSIFIED-INT-03-CLOSED-REWALK-PASSED.md) — **supersedes its "Next" and its one open item.**

---

## READ THIS FIRST

1. **`TASK-SEC-01` is CLOSED.** The residual window is now an explicit accepted risk, owner Stefan, recorded in `docs/platform/CLAUDE.md` beside the rule that mitigates it.
2. **The orphan reclaim is APPLIED and independently verified.** 2 688 → **954**; not one message lost its author, not one audit row lost its actor.
3. **The E2E fleet is 136/136 for the first time.** Previous best was 134/136.
4. **I shipped a regression and only the fleet caught it.** Owned below — it is the most useful thing in this bridge.
5. **`TASK-E2E-04` is NOT closed**, deliberately, despite a green fleet. Its mechanism is identified but only *mitigated*.
6. **Ten PRs merged this session** (#460–#469), each verified by `mergedAt` + content on `origin/main`. **Zero open.**

## RD-4a settled — W-10's pair is buildable (#463, #465)

Stefan accepted the amendment (*"i accept and agree"*). Recorded **in the role-distribution design note beside RD-4 itself**, so the next reader of the law meets the amendment in the same breath rather than discovering it in a spec.

**RD-4 is not weakened.** Retire-only stands for anything ever offered or ever adopted; RD-4a carves out the case RD-4 never contemplated — the mistake clone nobody ever saw.

Both open questions were closed **on evidence, before `4-ready`**, not deferred to build:

- **Does `admin_retire_role_template` accept a never-published template? YES** — read from the live catalogue. It refuses exactly one case, `is_system`. So the retire-first step is reachable for precisely the case the feature serves; the rabbit hole is closed, not carried.
- **`undeletable_reason` precedence: SETTLED** — `system` → `not_retired` → `published` → `adopted`.

`FEAT-PC029` and `FEAT-H045` are both **`4-ready`**. **H045 STORY-1 needs nothing from the platform and should ship first** — it is the larger half of the felt problem.

## The reclaim — applied, then verified rather than trusted (#467)

Applied on the named approval, then re-checked against the live catalogue:

| | Before | After | |
|---|---|---|---|
| Orphaned personal groups | 2 688 | **954** | exactly the classified KEEP |
| `groups` total | 6 142 | **4 408** | −1 734, exactly the classified DELETE |
| Messages / **with a sender** | 1 112 / **523** | 1 112 / **523** | **not one message lost its author** |
| Audit / **with an actor** | 6 327 / **3 355** | 6 327 / **3 355** | **not one audit row lost its actor** |
| **Live** personal groups | 2 976 | **2 976** | untouched |

**Sequenced deliberately after the confirming fleet.** A 1 734-row delete cascading through `group_memberships` and `notifications` holds locks; landing it mid-fleet would have made any teardown timeout impossible to attribute — destroying the answer that fleet existed to give. Nine minutes of patience bought an interpretable result.

**Notifications fell only 82 943 → 82 732 (−211).** This is counter-evidence to INT-03's own hypothesis and matters more than the reclaim: **the orphans were not holding the notification bloat.**

## The regression I shipped — and why it is the useful part

The first confirming fleet came back **3 failed / 133 passed**, and all three failures were **`"afterAll" hook timeout of 30000ms exceeded`** in exactly the three specs that call `cleanupAnonymousUsers` — **the function I had rewritten hours earlier in #462.**

My verifying primitive issues a **Management API round-trip per user**; the janitor loops over **every** anonymous user (156 at the time). That is ~156 extra HTTP calls inside a 30-second hook.

Fixed (#468) by clearing consent for the whole batch in one statement and resolving profiles in one read; per-user verification kept, because that is the point. Re-run: **136/136 green**.

**Nothing else would have caught it** — not unit, not integration, not lint, not `tsc`. The standing consequence:

> **Run the full E2E fleet after any change to an E2E helper, not only after feature work.** A helper change is a change to every spec that calls it, and the tiers below cannot see it.

The same gap had existed all day: 21 specs and a throwing teardown instrument were merged in #462 with nobody having run the fleet.

## TASK-E2E-04 — mechanism identified, deliberately NOT closed

Breaking it harder exposed the shape:

> `cleanupAnonymousUsers` is **O(every anonymous user in the database)** inside a **30-second `afterAll`**. It always was — my change only raised the constant. N grows during a fleet, because the fleet is what mints Mists.

That predicts the recorded profile exactly — **fleet-only, isolation-green, a different victim each run** — and explains why `entry.spec:46` (first of the three to run) was the repeat victim. It does so **without appealing to notification volume at all**, which the −211 measurement above independently undercuts.

**Not closed, and the distinction is the point.** Per `TASK-E2E-01`'s discipline, closure states *the mechanism removed*, never a count of green fleets. The constant was cut; the loop is still O(N). Bigger headroom, identical shape — it returns when N grows again.

**A retrospective reading, recorded as a candidate and explicitly not proven:** Playwright attributes an `afterAll` timeout to the preceding test, so the original failures — recorded by line number as *the become-a-FIM CTA test failing*, with the artefacts never read — may have been this same teardown timeout all along. It explains every recorded property. The artefacts are gone, so it cannot now be checked.

**To close it:** bound the janitor — scope it to the users the spec created, or move the sweep into global teardown where it is paid once.

## Two stale claims corrected in `TASK-E2E-04`

- *"artefacts preserved under `test-results/`"* — **they are not.** The directory is empty; the AC needed a fresh reproduction, which is why the fleet was re-run rather than read.
- *"the volume hypothesis closes through INT-03"* — **it does not.** That rested on July's *73% of notifications sit on orphans*. Re-measured: **8%**. Migration `20260728080000` already retired July's rows, so the "prune and compare" experiment would have pruned 8% and proven nothing.

## Standing items

- **Bound the janitor** — the real `TASK-E2E-04` close.
- **Build `FEAT-H045` STORY-1** — no platform dependency, ships alone.
- **`TASK-INT-03`'s 954 remaining orphans** stay by design, each for a stated reason (640 audit actors, 220 message senders, 146 created a surviving group, …).
- Carried: **AB-6's docket** · Phase-4 cutover · the `done`-no-longer-implies-sweepable tension · deferred Eid piles · G-3 journeys deferral · `TASK-RDA-03` · `TASK-E2E-02/03` · the `hub/SPECIFICATION.md` → `./ROADMAP.md` placeholder.

## Numbers at close

E2E **136/136** (10.5 min, first fully green fleet) · INT-03 regression suite 4/4 · `anon-execute-lockdown` 9/9 · integration `auth` 12 suites / 35 tests · eslint clean · 0 new `tsc` errors against the 968-error test-tier baseline · orphan instrument **954 → 954** and DeusEx **0 → 0** on the green fleet · dashboard refreshed (834 files) · discovery clean and **0/0**.

## Next

**Bound the janitor** (closes E2E-04 properly), then **`FEAT-H045` STORY-1**, then **AB-6** and Phase-4 cutover.

## Close ritual

- [x] Migration applied on a named approval and **verified against the live catalogue afterwards**, not trusted
- [x] The destructive apply sequenced after the fleet so the fleet stayed interpretable
- [x] A regression I introduced found, owned, fixed, and re-verified under real fleet pressure
- [x] A green fleet explicitly **refused** as closure evidence where the mechanism survives
- [x] Two stale claims in `TASK-E2E-04` corrected rather than inherited
- [x] Ten PRs merged and verified by `mergedAt` + content; zero open
- [x] Dashboard refreshed; discovery swept and synced **0/0** at open and close
