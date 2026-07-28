# The 937 ms warm ceiling-hugger — investigated, and the parked lever refuted

**Date:** 2026-07-28 · **Area:** A-NTF · **Gate item:** the last of the six "still owed"
**Environment:** production `fringe-island.vercel.app`, authenticated real path, measurement FIM `perf-antf@fringeisland.test` created and erased in-run (teardown verified: 0 auth rows, 0 profile rows, 0 leftover groups).

---

## Verdict

**Not a defect, and not the preferences page.** In steady warm state the page loads in **~400 ms**, comfortably inside the 1 000 ms B3 ceiling. The ceiling-hugging is real but it is **platform read-latency variance that both measured pages share**, and the structural lever that was parked against it is **refuted by measurement**.

The [gate measurement pass](./2026-07-27-antf-gate-measurements.md) flagged 937 ms and marked the fan-out theory *"plausible and documented, and this pass did not confirm it"*, with the parked L3 marked **"un-park candidate at J-F or the area gate."** This is that gate. The answer is: **do not build it.**

## What was measured

`/notifications/preferences`, warm, fresh browser context (uncached bundles) — the exact scenario that produced 937 ms.

**n = 10 consecutive runs, fully warm: 308 · 341 · 392 · 392 · 400 · 400 · 408 · 412 · 427 · 436 ms. Zero over the ceiling.**

Earlier runs in the same sequence returned 2 710, 1 143 and 923 ms while the asset/function edge was still warming. **The 937 ms is a partial-warmth number, not a steady-state one** — which matters, because a returning member can genuinely land in that state.

## The decisive experiment, and it went the other way

The parked theory: `/notifications/preferences` fires 6 reads because it is absent from `BOOT_PATHS`; fold the shell reads into the ADR-U042 bundle and 6 → 3 should make it faster. The comparison the measurement doc asked for, run directly:

| Page | API reads | In `BOOT_PATHS` | Walls (ms) |
|---|---|---|---|
| `/groups` | 4 | **yes** | 1 439 · 3 477 · 928 · 938 |
| `/notifications/preferences` | 6 | no | 942 · 328 · 410 · 442 |

**The page with fewer reads and full bundle coverage is the slower one.** Client boot is indistinguishable between them (fan-out fires at 145–171 ms on `/groups`, 150–273 ms on preferences), so the difference is entirely in read time — and more reads did not cost more time.

**Why the theory fails.** The reads are *fully concurrent* — every waterfall shows all of them starting within 1 ms of each other. Concurrent reads cost `max(read)`, not `sum(read)`, so removing three of six changes the critical path by approximately nothing. Consolidation trades several cheap parallel reads for one fat serial one: `/api/me/overview` bundles five slices, and it is on the critical path of the *slower* page.

## The real signature: correlated stalls, not a slow endpoint

Per-request attribution on `/groups` across five warm runs:

| Run | Wall | `/api/me/overview` | `unread-count` | `messages` | `announcements/platform` |
|---|---|---|---|---|---|
| 1 | 942 | 465 | 465 | 466 | 461 |
| 2 | **1 443** | 930 | 903 | 919 | 901 |
| 3 | 411 | 168 | 132 | 164 | 129 |
| 4 | 419 | 183 | 219 | 133 | 162 |
| 5 | 403 | 171 | 175 | 149 | 170 |

**When it is slow, every read is slow by the same amount, finishing within ~5 ms of each other.** That is not one slow contract — it is a shared upstream stall (connection pooler / cold function instance) that every concurrent read pays alike.

This is the second, independent reason fan-out reduction cannot help: **if all concurrent reads stall together on a shared resource, removing some of them leaves the survivors stalling exactly as long.**

## Disposition

- **The 937 ms item is closed as measured-and-not-a-defect.** Warm steady state is ~400 ms with wide margin; the B3 budget is met.
- **The parked fan-out lever is closed as refuted**, not deferred. It was explicitly an un-park candidate at this gate; it has now been tested and the measurement contradicts it. Folding the two badge reads into the bundle should **not** be built for performance reasons. (If it is ever built, it must be justified on some other ground.)
- **What survives as the real perf question** is the correlated stall — every read on a page paying +300 to +750 ms together, occasionally. It affects `/groups` worse than the notifications surfaces (3 477 ms observed). It is a platform-tier concern, not an A-NTF one, and it belongs with the standing cold-load exception rather than in this area's gate.

## Two harness defects found and fixed en route

**1. The state file and the results file were the same file.** `const STATE = OUT.replace('antf-perf-results.jsonl', …)` — the script had been renamed from `antf-perf-measure.mjs` and its results file lost the `antf-` prefix, so **the replace matched nothing and returned `OUT` unchanged**. `signin` wrote the Playwright storage state to `perf-results.jsonl`; the first `measureNav` appended a JSONL row to it; every later context creation died on `Unexpected non-whitespace character after JSON`.

It survived undetected because the multi-nav phases build their context once per process, so the corruption only bites the *next* invocation — i.e. exactly when re-measuring, which is when a deep-cold run has already spent its 20-minute idle window. `STATE` is now derived independently (`PERF_STATE`, default `perf-state.json`).

**2. `waterfall` was hardcoded to `/notifications/preferences`.** The per-request attribution above — the evidence that decided this whole question — was impossible to obtain for `/groups` until the command learned to take a path. It now accepts `waterfall <path> <selector>`, defaulting to its old behaviour.
