# N-C: the first-paint cleanup — retire the orphaned nominations slice, and measure it

---
id: TASK-NC-05
title: "N-C: the first-paint cleanup — retire the orphaned nominations slice, and measure it"
status: review
assigned_to: claude
priority: medium
feature: FEAT-H032
owner: hub
wave: ferd
cycle: A-NTF N-C
depends_on: []
estimated_hours: 3
---

## Description

FEAT-H032 STORY-4. Remove the dead `nominations` chain from the `/groups` first paint. This is **subtraction** — if it turns into reshaping the bundle, stop and keep it surgical (a named rabbit hole).

Independent of the migration, so it can proceed while TASK-NC-02 sits at the schema gate.

**Remove:**
- the `nominations` slice from `hub/app/api/me/overview/route.ts` — the `fetchPendingNominations` import, the concurrent read, the destructure, the failure tally, and the response object entry
- the adoption in `hub/lib/me/overview-client.ts` (the import and the `adoptMyNominationsRead(...)` call)
- in `hub/lib/groups/client.ts`: `adoptMyNominationsRead`, `fetchMyNominations`, `requestMyNominations`, the `adoptedNominations` module state, and its reset
- the tests covering the above

**Keep:** `/api/me/nominations` and `fetchPendingNominations` in `hub/lib/groups/leadership.ts` — FEAT-H017-owned, ADR-U042 guardrail 3, and the whole-chain question is filed as `TASK-H017-01`. The route keeps working; only the bundle stops calling it.

## Acceptance criteria

- [ ] No nominations lookup on a `/groups` load — absent from the request path and from the bundle response.
- [ ] Bundle slices and their consumers match one-to-one: every slice served has a consumer, every consumer has a slice. Assert this rather than eyeballing it — an orphan in either direction is the bug this task exists to fix.
- [ ] `/api/me/nominations` still responds correctly when called directly (a test proves the contract survived).
- [ ] The two stale comments are resolved or corrected: `hub/app/groups/page.tsx:88` and `hub/components/notifications/NotificationItem.tsx:42`.
- [ ] A member with pending leadership offers still sees them in the bell and can act — the capability moved, it did not vanish (covered at E2E in TASK-NC-06).
- [ ] **Measured, not asserted.** `/groups` first paint before and after, under the ADR-U043 method — this is a cleanup justified on loading-time grounds, so it must show its number. One deep-cold spot measurement of the touched page (>= 20 min enforced idle, no synthetic warm-up in the window; a fresh-deploy or active-day sample is *shallow-cold* and satisfies no cold scenario). Record the idle depth alongside the number.
- [ ] No other bundle slice regresses.

## Gate re-check — 2026-07-27

The area gate's task sweep says this task must survive and asks whether its owed measurement lets it finally close. **Re-checked against the code and suites: six of seven criteria are satisfied on disk; the seventh is half-unobtainable and should not be silently ticked.**

| Criterion | Verdict |
|---|---|
| No nominations lookup on `/groups` | **Met** — the slice is gone from `hub/app/api/me/overview/route.ts`; only the explanatory header comment remains |
| Slice/consumer parity | **Met** — covered by `hub/tests/unit/app/api/me-overview-route.test.ts` |
| `/api/me/nominations` still responds | **Met** — route present (deliberately left, FEAT-H017-owned); covered by `hub/tests/unit/app/api/group-leadership-routes.test.ts` |
| The two stale comments | **Met** — both now describe the retirement rather than pointing at a live section |
| Offers still reachable in the bell | **Met** — `hub/tests/e2e/leadership-transfer.spec.ts:168` asserts `pending-nominations` is count 0 and answers through the bell |
| No other slice regresses | **Met** — bundle route suite green |
| **Measured before and after** | **Half-unobtainable.** The [gate measurement pass](../../hub-v2/2026-07-27-antf-gate-measurements.md) recorded `/groups` deep-cold at **5 617 ms**, semi-warm **379/389 ms**, warm soft-nav **385/368/374 ms** — all *after* the cleanup. The **before** number cannot be taken retrospectively: the slice was already retired on production when the pass ran. What the pass did establish is that the after-number is **in band with history and shows no regression** |

**Recommendation:** close this task when the gate closes, ticking six criteria and recording the seventh as *after-only, before unobtainable, no regression shown* — rather than claiming a delta that was never measured. The trio `fetchMyNominations` / `adoptMyNominationsRead` / `requestMyNominations` is confirmed **fully deleted** (zero occurrences repo-wide), which was the cleanup's actual point.

## Technical notes

- `fetchMyNominations` has **zero callers** — confirmed 2026-07-25. Its deliberate `guarded.catch(() => {})` ("may go unconsumed; never unhandled") is why the dead chain never surfaced as an unhandled rejection; expect no runtime signal to guide the removal.
- Removing the slice also removes its `overview.slice_failed` telemetry path. The standalone route's `nominations.mine*` telemetry is untouched.
- `PendingNomination` type: check whether it still has consumers after the removal before deleting it — the standalone route's response still uses the shape.
- Bundle guardrails stay exactly as they are: bundle-only (aggregates, never decides), per-slice envelopes, standalone routes canonical.

## Verification

- `cd hub && npx jest --selectProjects unit` — green, new/changed tests demonstrated red first where they assert new behaviour (the slice-to-consumer parity assertion is genuinely new).
- `cd hub && npx next build` — the type gate.
- `grep -rn "adoptMyNominationsRead\|fetchMyNominations\|requestMyNominations\|adoptedNominations" hub/app hub/lib hub/components` → no hits.
- `grep -rn "nominations" hub/app/api/me/overview/route.ts` → no hits.
