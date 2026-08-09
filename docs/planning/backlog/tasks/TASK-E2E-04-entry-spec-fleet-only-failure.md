# Fleet-only arrival/emission failures — reproduced 2026-08-09, across both test tiers

---
id: TASK-E2E-04
title: "Fleet-only arrival/emission failures across both tiers — entry.spec + notifications.spec + the integration PAIR cells; reproduced 2026-08-09"
status: todo
assigned_to: unassigned
priority: high
owner: hub
wave: ferd
depends_on: []
estimated_hours: 2
---

## What happened

During the RD-B close (2026-08-07), the full E2E fleet came back **134 passed / 1 failed**.
The failure was:

```
[chromium] › tests/e2e/entry.spec.ts:46:5
  › the become-a-FIM CTA opens the in-place transcendence flow (FEAT-H004)
```

## Found, not caused — and this was established, not assumed

- **The failing path touches none of the RD-B diff.** The test drives `/` → *Look around*
  → a Mist materialises → the onboarding journey auto-launches → `/mist` → *Become a FIM*
  → `/become-a-fim`. RD-B changed the roles panel, the admin role-template surface, the
  notification icon map, three BFF routes, and `ConfirmModal`.
- **`ConfirmModal` is the only shared component in the diff, and it is not on this path** —
  grepped across `app/page.tsx`, `app/become-a-fim/`, `components/onboarding/` and
  `components/auth/`: no usage. The change was also additive (`hideConfirm` defaults
  `false`, and the focus-trap expression is byte-equivalent when it is).
- **It passed in the full fleet earlier the same day on the same branch** (133/133, before
  the corrective migration was applied), and **passes 3/3 in isolation** after the failure.

## Why this is NOT filed as "flake"

The standing-tasks README records exactly this trap: `TASK-INT-04` was filed *"after an
earlier 'flake' call was retracted by a second failure."* One fleet-only failure is one
observation. It is recorded here so a second observation has somewhere to land, rather
than being absorbed into a green sweep and losing its age signal.

## The mechanism worth checking first

Line 50 waits up to 30s for the onboarding auto-launch:

```ts
await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+\/play/, { timeout: 30000 });
```

Under a full single-worker fleet this is the timing-sensitive step: it depends on an
anonymous user being minted, `handle_new_user` materialising the personal group, and the
arrival auto-launch resolving — three round-trips against a dev DB that the rest of the
fleet is also hammering. That is a plausible mechanism *and* a plausible red herring;
neither should be asserted without a second observation.

Note the spec is **not** in `TASK-E2E-03`'s shared-identity class — it runs sessionless
(`test.use({ storageState: { cookies: [], origins: [] } })`), so the revocation-target
audit does not cover it.

## SECOND OBSERVATION CAPTURED — 2026-08-09

`entry.spec.ts:46` failed again in a full fleet run (134 passed / 2 failed of 136), and
passes in isolation immediately afterwards. **The trigger condition this task was filed to
wait for is met: it reproduces, so it is not a flake and the mechanism is now worth
hunting.** Priority raised to **high**.

**A sibling appeared in the same run:** `notifications.spec.ts:101` — *"an invitation
surfaces in the bell + inbox, and read-state survives reload"*. Also fleet-only; both
passed 4/4 when run together in isolation right after.

**And the same profile is now visible one tier down.** The same day, the integration
fleet lost PAIR-shaped emission cells in `tests/integration/notifications` — a *different
suite each run*, every one green alone, and clean when that directory ran by itself
(120/120). See [walk finding W-7](../../hub-v2/2026-08-07-rd-b-desk-walk-findings.md).

**The hypothesis that now spans both tiers:** assertions about *a notification arriving*
are sensitive to notification volume and write pressure, and the dev DB is carrying
**73 633** notification rows (3 851 written in three hours of one session).
`TASK-INT-03` already records this DB as notification-heavy from fixture leakage. Both
failing E2E cells wait on something arriving — a Mist's onboarding auto-launch, and an
invitation reaching the bell.

**This reframes the task.** It is no longer "is `entry.spec` flaky" but "do our
arrival/emission assertions degrade as the notifications table grows, across both tiers".
Retitled accordingly; the original single-observation record is preserved above.

## A CANDIDATE MECHANISM, surfaced 2026-08-09 by breaking it harder

The 2026-08-09 fleet re-run failed **3 of 136** — `entry.spec:46`,
`onboarding-arrival.spec:93`, `transcendence.spec:83` — and **all three failed the same
way: `"afterAll" hook timeout of 30000ms exceeded`.**

Those are **exactly the three specs that call `cleanupAnonymousUsers`**, and the immediate
cause was self-inflicted: that helper had just been rewritten (TASK-INT-03) to route through
a verifying primitive that issues a **Management API round-trip per user**. Fixed by clearing
consent for the whole batch in one statement and resolving profiles in one read.

**But the shape it exposed is not self-inflicted, and it is the best lead this task has had:**

> `cleanupAnonymousUsers` is **O(every anonymous user in the database)** and runs inside a
> **30-second `afterAll`**. It has always been O(N) — the rewrite only raised the constant.
> N grows during a fleet, because the fleet is what mints Mists. So the teardown of these
> three specs gets slower the longer the fleet runs, and fails **only in a fleet**.

That predicts precisely the observed profile — fleet-only, isolation-green, a different
victim each run — **without appealing to notification volume at all**, and it explains why
`entry.spec:46` (the first spec to run of the three) was the repeat victim.

Measured in passing: **156** anonymous users at fleet time; **58** still present after the
timed-out sweep, because the loop never finished.

**Not yet confirmed.** The isolation re-run afterwards was 9/9 green, but with 58 anon users
rather than 156 and without fleet pressure — weaker evidence than the failure it is meant to
explain, and recorded as such. A clean full fleet is what would confirm it.

**If it holds, the fix is to bound the janitor** — scope it to the users the spec created, or
move the sweep out of a per-spec `afterAll` into global teardown where it is paid once.

## Acceptance criteria

- [x] A **second observation** captured — 2026-08-09, full fleet, with a sibling
      (`notifications.spec.ts:101`) and the same profile at the integration tier
- [ ] The failing step identified from the trace/screenshot artefact, not inferred from the
      line number. **CORRECTION 2026-08-09: the artefacts are NOT preserved.**
      `hub/test-results/` is empty — 0 entries. The claim above was written when they
      existed and has since gone stale; nothing was committed and the directory has been
      cleaned. **This AC now requires a fresh reproduction**, which is why the fleet was
      re-run rather than the artefacts read.
- [ ] The volume hypothesis tested directly. **RE-SCOPED 2026-08-09 — its stated premise no
      longer holds.** The link to `TASK-INT-03` rested on July's measurement that orphaned
      personal groups held **73%** of `public.notifications`. Re-measured today:

      | | |
      |---|---|
      | `notifications` total | **82 910** (up from the 73 633 recorded above) |
      | held by orphaned personal groups | **6 807 — 8%** |

      Migration `20260728080000` already retired the July rows, so **orphan leakage is no
      longer what makes this table big**, and INT-03's reclaim (`20260809200000`, held at the
      gate) would move it 82 910 → ~76 100 — not a step change. **So this task probably does
      NOT close through INT-03**, and the "prune and compare" experiment as written would
      prune 8% and prove little.

      What that leaves: the table grew ~9 000 rows in a day from *live* fixture activity, not
      leakage. If volume is still the mechanism, the question is write pressure during a
      fleet run, not accumulated orphan rows — a different experiment (measure emission
      latency under concurrent fleet load) against a different suspect.
- [ ] Closure states the **mechanism removed**, never a count of green fleets (the
      `TASK-E2E-01` discipline)
