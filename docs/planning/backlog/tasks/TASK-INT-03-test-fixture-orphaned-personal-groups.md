# Test fixtures still orphan personal groups — the universal blocker is fixed, two residual sources are not

---
id: TASK-INT-03
title: Test teardown leaks personal groups (sole-Steward guard + suites bypassing cleanupTestUser) — close the residual sources
status: todo
assigned_to: unassigned
priority: high
feature: none
owner: platform/core/organisation
wave: ferd
cycle: unscheduled
depends_on: []
estimated_hours: 3
---

## Impact — TEST-ONLY, but it accumulated to 87% of a production table

Raised at the A-NTF area gate (2026-07-28) while scoping the orphan cleanup.

**Measured before any fix:** 11 150 orphaned personal groups (groups of `group_type = 'personal'` that no `users` row points at) out of 12 687 total — **87%** — holding **36 961 notification rows**, which was **73% of `public.notifications`**. 2 248 of the orphans had been created in the preceding 7 days, so it was actively growing, not historical.

The rows were retired by migration `20260728080000`. **The groups themselves were deliberately left in place** — 8 690 are active members of real (non-personal) groups, 577 hold journey enrolments and 401 authored messages, so deleting them would cascade into real member lists and destroy message attribution (against ADR-U021's spirit). That is a separate decision with a separate blast radius.

## The separate decision — MADE AND EXECUTED 2026-07-28 (migration `20260728200000`)

**It was a delete, for 10 598 of 11 272.** The characterisation above was right to stop the delete and wrong about its size — both halves matter, so both are recorded.

**What the blast-radius numbers actually meant, measured rather than inferred:**

- *"8 690 are active members of real groups"* — **8 808 of those memberships are of ONE group**, the `FringeIsland Members` system group every account joins. Removing a departed test account from the everyone-group is not damage to a member list; it is the correct state. Exactly **two** engagement groups held an orphan (one each), and only **three** groups in total also held a live member.
- *"401 authored messages"* — exactly **one** sat in a conversation any live user participates in.
- **0 RESTRICT referrers** — no consent records, no authored journeys. The delete could not half-fail.

**The trap that made the first strict pass say "zero are safe".** Every personal group is `created_by_group_id` / `added_by_group_id` / `assigned_by_group_id` of its own bootstrap rows, so a naive "does it attribute anything?" test keeps all 11 272. That is **self-referential attribution — the same shape NB-8 found**, where a Mist held a durable notification addressed to itself. Attribution to rows that cascade away with you is not attribution. The strict definition was wrong, not the data.

**The discriminator that works:** does this orphan attribute anything that *survives* the delete?

| | Count | Why |
|---|---|---|
| Orphaned | 11 272 | |
| **Kept** | **674** | 195 sent a message that outlives them · 413 are the actor on an `admin_audit_log` row (audit rows never cascade — each would be a real loss) · a handful attribute a surviving group / membership / role / enrolment / notification-context |
| **Deleted** | **10 598** | attribute nothing that survives |

**Reclaimed:** 10 598 groups · 18 783 memberships · 651 notifications · 526 enrolments. Personal groups **12 946 → 2 352**; orphan share **87% → 28.7%**, and every remaining orphan is there for a stated reason rather than by neglect.

**The control that mattered** — asserted in the migration, then verified independently afterwards: **messages 420, all 420 still carrying a sender.** Not one message lost its author. Audit actors (883) unchanged, forum posts unchanged, live personal groups unchanged.

**An audit trail that forgets who acted is worth more than the rows it would reclaim** — which is why the 674 stay, and why "delete the orphans" was never the right instruction, only "delete the ones that attribute nothing."

No end-user exposure: an orphaned group is unreachable (every read door resolves the caller via `get_current_personal_group_id()`, and with no `users` row no caller can ever resolve it). The cost is table bloat and a badly misleading denominator in any count over `groups` or `notifications`.

## What was fixed (2026-07-28)

`cleanupTestUser` (`hub/tests/helpers/supabase.ts`) deleted the personal group **before** the auth user, and **ignored the result**. That delete could never succeed: `users` references the group, so deleting it fires the FK's `SET NULL` on `users.personal_group_id`, which an immutability trigger rejects —

```
personal_group_id cannot be changed after it has been set (old: <id>, new: <NULL>)
```

The discarded error was followed by the auth delete, which CASCADEd `public.users` away and left the group with nothing pointing at it. **Every single cleanup leaked.** The order is now auth-user-first (so `public.users` CASCADEs, leaving the group unreferenced), then the group, and the failure is logged loudly instead of swallowed.

The Mist teardown in `mist-posture-and-ask-delivery.test.ts` had the same shape and was fixed with it: deleting a Mist's auth user never removes its personal group, because `groups` carries no FK to `users`.

## What is still open

A full `tests/integration/notifications` run still leaks **~6 personal groups**, from two distinct sources:

1. **The sole-Steward guard, ~2 per run.** A test user who created an engagement group and remains its only Steward cannot have their personal group deleted — the domain rule is *"Cannot remove the last Steward from the group. Assign another Steward first."* **This rule is correct and must not be weakened.** The fix belongs in the fixtures: a suite that creates an engagement group should delete that group in its own teardown, before `cleanupTestUser` runs.
2. **The remainder, ~4 per run — unattributed.** Suites that create users or groups without going through `cleanupTestUser`, or that create secondary groups nothing tears down. Needs attribution before it can be fixed; the loud logging added above is the instrument for that.

## Acceptance

- [x] Attribute the leaks to specific suites — **done 2026-07-28.** The loud logging added here was the instrument, exactly as intended: the leak lines were harvested from the TASK-INT-04 capture logs at no extra cost. **The real rate was 2 per notifications run, not ~6, and all of them came from one suite**, `actionable-notifications.test.ts`. (The earlier "~6" double-counted: jest echoes the `console.error` source line, so each leak prints its message twice.)
- [x] Engagement groups created by a suite are torn down by that suite — **done 2026-07-28.** `actionable-notifications.test.ts` creates a fresh context group on **every** `freshActingInvite()` call plus one in the personal-branch test, and tore down only `groupB`. Alice and Bob therefore stayed sole Steward of the rest, so `cleanupTestUser` was refused and their personal groups leaked. The suite now records every group it creates and deletes them all before the users. **The sole-Steward guard is untouched** — it was never the defect; being refused was the correct behaviour, and the fixture was the thing in the wrong.
- [x] A full `tests/integration` run leaks **zero** personal groups, asserted by a before/after count rather than by inspection — **done 2026-07-29.** Bracketed run, 58 suites / **715 tests green**: orphans **689 → 689 (delta 0)** and engagement groups **429 → 429 (delta 0)**, with `leaks=0` and zero refused group cleanups in the log. Before the fixes: +2 per notifications run and +1 per full run.
- [x] ~~Decide separately what to do with the 11 150 groups already orphaned~~ **DECIDED AND EXECUTED 2026-07-28** — migration `20260728200000`. It *was* a delete, for 10 598 of them. See below.

## The second source — a different bug wearing the same error message

Found only because the acceptance criterion says **full `tests/integration`**, not the notifications directory. Notifications was clean at zero across 11 runs; the whole-suite run still leaked one, from `tests/integration/groups/group-of-groups.test.ts`. **The narrower run would have let this box be ticked while it was false.**

That suite was already doing the two obvious things right — it tracked every group it created and deleted them all *before* its users. The mechanism is sharper:

**`user_group_roles` cascades on `member_group_id` as well as `group_id`.** So deleting a group that is the sole Steward **of another group** cascades into *that other group's* role rows — and the guard's "parent is gone, allow it" exemption (`20260228120745:32`) tests `OLD.group_id`, the group whose roles they are, which still exists. The delete is refused, `cleanupTestGroup` only logs the refusal, and the stranded Steward then fails `cleanupTestUser`.

In a group-of-groups suite the later-created groups are precisely the ones the earlier groups hold roles in, so **creation-order teardown kills the parents first and strands the rest**. Fixed by tearing down in reverse creation order.

Both sources were teardown-ordering faults in fixtures, and **neither was a fault in the guard** — a real member list must never lose its last Steward. Worth carrying: `cleanupTestGroup` swallows its refusal into a `console.error`, so a group that will not delete is only ever a log line. That is the same swallow-shape as the original `cleanupTestUser` defect, one level up.

## Verification

Run any integration directory, counting `public.groups WHERE group_type = 'personal'` before and after. The delta must be zero. Before this task: +6 to +7 per notifications run. Before the 2026-07-28 partial fix: every cleanup leaked.

## REPRODUCED 2026-08-09 — a single instance, with an id and a 47-minute lifetime

The RD-B gate perf pass (`hub/scripts/perf-measure.mjs`) provisions a measurement FIM and
erases it at teardown. `teardown` reported "done". Verified against the database rather
than trusted:

| Object | After teardown |
|---|---|
| `auth.users` row | 0 — erased |
| the 3 engagement groups | 0 — erased |
| **the personal group `Perfwalker`** | **1 — SURVIVES** |

`e378c1b5-a0f5-4a94-9f19-a1d300e0f850`, created 14:58:07 UTC, torn down 15:45:03 UTC. It
has **no owning `users` row** and still holds **2 memberships and 10 notification rows**.

**Why this instance is worth more than the population.** The 11 150 orphans are an
accumulated mess of unknown provenance; this one has a known creator (one script), a known
lifetime (47 minutes), and a known teardown path that believed it had succeeded. The
harness's teardown deletes the auth user and the engagement groups and does not delete the
personal group — so the mechanism is legible in one file rather than inferred across
thousands of rows.

**Left in place deliberately**, not cleaned up: deleting it destroys the cleanest
reproduction of this leak that exists, and the row is harmless where it sits.

**FIXED 2026-08-09 (session 15).** `hub/scripts/perf-measure.mjs:110` deleted the personal
group **before** the auth user and discarded the result — byte-for-byte the `cleanupTestUser`
defect described above, in a file nobody re-checked when that one was fixed.

*Demonstrated red, then green, against the harness itself:*

| | personal | orphaned |
|---|---|---|
| baseline | 5 765 | 2 688 |
| after `setup` + `teardown` (before fix) | 5 766 | **2 689** ← leaked, while printing `teardown: done` |
| after `setup` + `teardown` (after fix) | 5 766 | 2 689 — **delta 0** |

Teardown now deletes the auth user first, checks both errors, and **verifies the group is
actually gone** before claiming success — it throws and exits non-zero if it is not. The old
version's failure mode was reporting a success it had not achieved, so a self-check is the
fix, not just the reordering. Red-run debris removed; counts back to 5 765 / 2 688.

## THE MIST SOURCE — found, attributed and fixed 2026-08-09

The AC above (*"a full `tests/integration` run leaks zero"*) was verified 2026-07-29 at
**674 orphans**. Today: **2 688**. Roughly **2 000 new orphans in 11 days**, so an active
source has been running the whole time and the delta-zero check did not see it.

Attributed by name, orphans created since 2026-07-29:

| Name | n | Window |
|---|---|---|
| **`Mist`** | **1 357** | 2026-07-30 → 2026-08-08 |
| `E2E` | 82 | |
| `Grace` / `HygaStella` / `H023` | 78 combined | |
| `Perfwalker` | 4 | the harness fixed above |

**`Mist` is 88% of it.** Both production paths are ruled out, read from the live catalogue
rather than assumed:

- **`_erase_mist` is correct** — it deletes `auth.users` first, then the group, with the
  immutability bypass set. The exact ordering this task prescribes.
- **`reap_expired_mists` is correct** — it delegates to `_erase_mist` inside a per-row
  subtransaction. Since 2026-07-29: **1 175 runs, 105 swept, 105 erased, 0 skipped, 0 failed
  runs.** It cannot account for 1 357.

**The integration tier is clean**, established by bracketed runs rather than inspection:
`mist-substrate.test.ts` alone → delta 0; the whole `tests/integration/auth` directory
(12 suites, 35 tests) → delta 0.

**The source is the E2E tier**, and one function accounts for the volume:

> `cleanupAnonymousUsers` (`hub/tests/e2e/helpers/auth.ts`) lists **every anonymous user
> (`perPage: 200`)** and, for each, deleted the personal group **before** the auth user and
> discarded the result. It is called by three Mist specs — `entry.spec.ts:16`,
> `onboarding-arrival.spec.ts:33`, `transcendence.spec.ts:25` — so **every E2E run orphaned
> up to 200 Mist personal groups at once.**

The same defect sat in **three** helpers in that one file (`cleanupAnonymousUsers`,
`deleteTranscendedUser`, `deleteE2EUser`), plus **24 spec teardowns** calling
`admin.auth.admin.deleteUser(authId)` directly with no group handling at all — those produce
the non-Mist orphans, and the names confirm it exactly: `E2E` 82, `Grace` 27, `HygaStella`
26, `H023` 25, `GB`/`JA`/`JC` — all E2E fixture names.

**This is the fourth instance of one defect**: `cleanupTestUser` (fixed 2026-07-28),
`perf-measure.mjs` (fixed 2026-08-09), and now the E2E tier's three helpers and 24 call
sites. Each time it was re-diagnosed from scratch, because nothing counted the orphans.

### The fix

- **One primitive**, `eraseUserAndPersonalGroup` — consent → journeys → **auth user** →
  group, and it **verifies the group is gone**, throwing if not. The old code's failure mode
  was reporting a success it had not achieved, so a silent path would rebuild the bug.
- **`deleteE2EUserByAuthId`** — the shape the 24 sites wanted. All 24, across 21 spec files,
  now route through it (codemod; 0 leftovers, 0 new `tsc` errors against a 968-error
  pre-existing baseline).
- **A leak instrument** in E2E global setup/teardown, mirroring TASK-INT-05's DeusEx counter:
  orphan growth **fails the run**. This is the piece that stops a fifth instance — the class
  survived four times because nothing counted.
- **Four regression tests** (`tests/integration/auth/e2e-teardown-erases-personal-group.test.ts`),
  including one pinning **why** the order is mandatory: deleting the group first is refused
  with *"personal_group_id cannot be changed after it has been set"*. The E2E helpers are
  plain TS over supabase-js, so the integration tier can exercise them and then assert on the
  substrate — the only tier that can.

**No guard was weakened.** Every fix was a teardown-ordering correction, exactly as in July.

### The 2 688 existing orphans — APPLIED 2026-08-09, and verified rather than trusted

Migration `20260809200000`, applied on the named approval *"ok apply the orphan reclaim
migration"*, then **re-checked against the live catalogue independently** — the migration's
own green was not taken as the answer:

| | Before | After | |
|---|---|---|---|
| Orphaned personal groups | 2 688 | **954** | exactly the classified KEEP |
| `groups` total | 6 142 | **4 408** | −1 734, exactly the classified DELETE |
| Messages / **with a sender** | 1 112 / **523** | 1 112 / **523** | **not one message lost its author** |
| Audit rows / **with an actor** | 6 327 / **3 355** | 6 327 / **3 355** | **not one audit row lost its actor** |
| **Live** personal groups | 2 976 | **2 976** | untouched |

Journeys 58, consent 3 349, forum authors 45 — all unchanged. Deliberately sequenced *after*
the confirming E2E fleet finished: a 1 734-row delete cascading through `group_memberships`
and `notifications` holds locks, and landing it mid-fleet would have made a teardown timeout
impossible to attribute.

**Notifications fell only 82 943 → 82 732 (−211).** Worth recording, because it is the
counter-evidence to this task's own hypothesis: the deleted orphans were **not** holding the
notification bloat. See the TASK-E2E-04 note.

Same discriminator as 2026-07-28, and the same trap avoided: **not** *"does it attribute
anything?"* — every personal group is the `created_by` / `added_by` / `assigned_by` of its own
bootstrap rows, so that test is self-referential and keeps everything (July's first strict pass
said *"zero are safe"* and was wrong). The test is **does it attribute anything that SURVIVES
its own deletion?** Every clause excludes the referencing rows this orphan's delete would take
with it.

Classified against the full FK surface — 2 RESTRICT columns that could block, 17 SET NULL
columns that would silently lose attribution:

| | Count |
|---|---|
| Orphans | **2 688** |
| Blocked by RESTRICT | **0** — the delete cannot half-fail |
| **KEEP** | **954** |
| **DELETE** | **1 734** |

Keep reasons: **audit actor 640** (audit rows never cascade — each would be a real, permanent
loss) · **message sender 220** · created a surviving group 146 · enrolment 26 · authored content
26 · inviter 26 · member/role 5.

The classification is **recomputed inside the migration** rather than pasted as an id list, so
the set deleted is the set true at apply time. Conservative by construction: a row attributed to
orphan A but living inside orphan B counts as surviving for A, so A is kept — over-keeping is
cheap, over-deleting is not.

**Controls asserted in the migration, failing it rather than reporting a false green:** messages
and their sender count unchanged (July's decisive control — *420 messages, all 420 still
carrying a sender*), audit rows and actor count unchanged, **live** personal groups unchanged,
forum authors unchanged, journeys and consent unchanged.

This is a **one-time** reclaim, not a recurring one: the E2E orphan leak instrument now fails any
run that grows the count.

**It also links two open threads.** Orphaned personal groups holding notification rows are
what inflate `public.notifications` (73 % of it, per the original finding) — and that table
is the prime suspect in `TASK-E2E-04` / walk finding W-7, where emission assertions across
BOTH test tiers fail in fleet, pass in isolation, and pick a different victim each run. If
the volume hypothesis holds, this task is the upstream cause and E2E-04 closes through it.
