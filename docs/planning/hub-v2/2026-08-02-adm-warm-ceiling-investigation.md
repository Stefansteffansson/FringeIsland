# The detail-page ceiling crossings — investigated: the pages render on time; the crossings live in the harness's completion waiter

**Date:** 2026-08-02 · **Area:** A-ADM · **Gate item:** leg 1 of the gate close — the warm investigation commissioned at the [measurement pass](./2026-08-02-adm-gate-measurements.md) (Stefan, 2026-08-02)
**Environment:** production `fringe-island.vercel.app`, authenticated real path, Playwright **1.58.2** headless Chromium. Measurement FIM re-provisioned by the standing harness, DeusEx-elevated, one seeded open report (fabricated target) — all erased at teardown, residue-verified `{fimUsers:0, reports:0, elevations:0}`. Fixture mechanics now reproducible: [`hub/scripts/perf-adm-fixture.mjs`](../../hub/scripts/perf-adm-fixture.mjs) `up|down|verify`.

---

## Verdict

**Not a page defect, and not bundle + hydration.** Across 78 fresh-context runs of the two detail pages, genuine user-visible completion — the target element committed to the DOM and painted — is **median 466 ms, max 733 ms** (n = 28 instrumented runs), **zero runs over the 1 000 ms B3 ceiling**. The 1 036–1 127 ms crossings the gate carried are produced *inside the harness's completion waiter*: Playwright's `locator.waitFor({state:'visible'})` resolves **~300–470 ms after the element is visibly painted** in roughly 40 % of runs, bimodally. The same call (`measureNav`) produced every gate number, so the carried finding's crossings measure the tool, not the page.

The commissioned scope read "bundle + hydration + the ~500 ms unaccounted slice." The waterfall refuted that framing in the first round — the template's lesson held a second time: **the suspected lever went down by measurement before any hypothesis was needed.**

## What was measured

A new harness command, `breakdown <path> '<selector>'` ([`perf-measure.mjs`](../../hub/scripts/perf-measure.mjs)), tracks **every** request Playwright sees (locally stamped — ResourceTiming is unusable here, see `measureNav`), plus in-page observers: long tasks, paints, a MutationObserver stamping DOM insertion of the target selector, an rAF heartbeat, and the page-clock→harness-clock offset (measured: 1–3 ms, so the timelines align directly).

Fresh-context segment decomposition, all runs (ms):

| Segment | member detail (n=41) | report detail (n=37) | members list, control (n=18) |
|---|---|---|---|
| Document (SSR shell) | 137–484 | 139–484 | 79–335 |
| All JS chunks done @ | 150–422 (10 chunks, fully parallel) | 155–514 | 97–531 |
| Boot gap (last pre-fan-out js → fan-out) | 4–154, median ~32 | 4–39 | 5–48 |
| Fan-out @ | med 250, p90 392 | med 229, p90 307 | med 152 |
| Last read end @ | med 494, p90 750 | med 447, p90 598 | med 507 |
| **Render tail (read end → locator visible)** | **med 93, p90 432, max 523** | **med 62, p90 498, max 514** | **med 299, max 545** |
| Wall (locator) | med 554, p90 1 047; **13/41 over 1 000** | med 505, p90 1 059; **6/37 over** | med 919; 2/18 over |

Client boot is exonerated outright: bundles download in parallel and finish within ~30 ms of the document; the boot gap is ≤ 154 ms in the worst single run. The reads are what the gate pass said they were (2 reads, warm ~200–300 ms). The whole question was the render tail.

## The decisive experiment

Three independent completion signals raced on the **same navigation**:

1. MutationObserver: when the selector first enters the DOM;
2. `page.waitForFunction` checking the ADR-U043 visibility semantics directly (non-empty box, not `visibility:hidden`/`display:none`), rAF-polled;
3. the production waiter, `locator.waitFor({state:'visible'})` — the call every gate number came from.

Slow-mode runs, nav-clock ms:

| Run | Last read end | DOM found | Box-visible (waitForFunction) | Locator visible | Locator lag past painted-visible |
|---|---|---|---|---|---|
| member #1 | 696 | 703 | 718 | **1 034** | 316 |
| member #5 | 628 | 635 | 643 | **999** | 356 |
| member #7 | 619 | 627 | 640 | **1 047** | 407 |
| list #2 | 501 | 534 | 591 | **937** | 346 |

In every run — fast and slow — the element is in the DOM ~5–30 ms after the last read and the independent box-check confirms visibility 10–60 ms later. First-contentful-paint (captured in the paint-observer rounds) lands ~20 ms after DOM insertion. The locator adds ~30–80 ms on top in fast mode and **~300–470 ms in slow mode**, with a healthy rAF heartbeat (17 ms frame gaps), zero long tasks, and an idle main thread throughout the lag window. The bimodality that read as "3 of 5 runs cross" is this waiter's slow mode landing on a run or not.

The mechanism past the tool boundary was deliberately not chased: it sits inside Playwright 1.58.2's locator machinery, version-pinned here for reproducibility. What matters for the gate is that two independent signals with the ADR's own semantics contradict it on the same navigation.

## What remains real

1. **The correlated read stall, occasionally.** 1 of 37 report-detail runs had its reads end at 1 092 ms — genuine, rare, and exactly the A-NTF class (every concurrent read stalling together; platform-tier, parked with the standing cold exception at that gate). **The Vercel Hobby-tier lens applies** (Stefan, this session): the document-request variance (140–484 ms for the same SSR shell) and these stalls are both function-serving variance a paid tier would be expected to shrink — pre-launch build work against them would be spent against the infra tier, not the product.
2. **The list pages' "ceiling-hugging" (920–964 ms at the gate) largely dissolves too** — the members-list control shows the same waiter tails (240–490 ms) over a ~530 ms painted page. By extension the A-NTF 937 ms fresh-context class deserves the same suspicion; nothing re-opens there (it PASSED anyway), but future passes should read the dual signal.
3. **First-contact runs** (edge re-warming after a deploy) remain genuinely slower (1.1–1.7 s observed) — already excluded from the B3 form by the gate pass, unchanged.

## Disposition (evidence for the gate verdict — the call is Stefan's, leg 1)

- **Recommended: close the carried finding as harness-attributed, B3 PASS on true completion.** Genuine completion: detail pages med ~466 ms, max 733 ms, n = 28, zero over ceiling; the crossings reproduce only through the locator waiter.
- **Protocol consequence (ADR-U043 amendment candidate, not enacted):** `measureNav` should record an independent box-visible completion alongside the locator wall, and B3 verdicts should read the box signal — it implements the ADR's "usable content = data-derived selector visible" definition with less machinery between the paint and the number. `breakdown` already records both; touching the protocol is a process call, so it rides the gate board.
- **The platform-tier stall watch** stays where A-NTF put it: with the standing exception, with the Hobby-tier consideration now recorded beside it.

## Method notes (adding to the set)

- **An init script that touches `document.documentElement` at `document_start` dies silently** — it doesn't exist yet; observe `document` itself. The dead script cost one full round of empty probes that *looked* like "no data" rather than "no instrument."
- **A filtered pipeline hides a thrown run**: one round's summary printer threw after the marks line; `grep` passed only the healthy-looking lines and the exit code vanished (watch-item 6's lesson, paid again). The run wrapper now prints `RC=` on failure.
- The walls measured while probes were broken remain valid — the marks print precedes the crash site — and all rounds agree with the final instrumented distribution.

## Harness changes shipped with this record

`breakdown` command (all-request timeline + segment marks + in-page observers + dual completion signals) and `perf-adm-fixture.mjs` (reproducible admin elevation/seed with explicit `down` and `verify`). One ledger row appended in the same PR.
