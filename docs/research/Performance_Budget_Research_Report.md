# Performance Budget Research Report

**Date:** 2026-07-07
**Question:** Before locking a first-paint performance budget into the feature-spec template and surface-half DoD (Groups retro §4, 2026-07-06), how do the proposed numbers — cold first-ever < 2 s, warm < 1 s, revisit instant — compare against common practice and what users in general accept?
**Method:** Web review of the canonical standards (Google Core Web Vitals, RAIL, Nielsen/NN-g response-time limits, MDN guidance) plus SaaS-specific benchmarks and perceived-performance research. Sources linked inline; retrieved 2026-07-07.
**Consumers:** the budget decision (perf doc §5.3, [`../planning/hub-v2/2026-07-06-groups-first-load-perf.md`](../planning/hub-v2/2026-07-06-groups-first-load-perf.md)), the `type:process` template/DoD work item from [`retro-2026-07-06.md`](../planning/retrospectives/retro-2026-07-06.md).

---

## 1. The canonical anchors

### Core Web Vitals (Google — the de-facto industry budget)

| Metric | "Good" threshold | What it measures |
|---|---|---|
| LCP (Largest Contentful Paint) | **≤ 2.5 s** | Loading — main content painted |
| INP (Interaction to Next Paint) | **≤ 200 ms** | Responsiveness — every interaction |
| CLS (Cumulative Layout Shift) | **≤ 0.1** | Visual stability |

Two properties of these thresholds matter for how we adopt them ([web.dev: how the thresholds were defined](https://web.dev/articles/defining-core-web-vitals-thresholds)):

1. **They are percentile budgets, not single-run budgets.** Google evaluates the **75th percentile of real user visits**; a page is "good" when p75 meets the threshold. A budget without a percentile and a measurement protocol is not comparable to these numbers.
2. **They are per-navigation metrics.** A cross-page *flow* (sign-in click → redirect → dashboard painted) is not an LCP; CWV has no direct metric for it. Flow budgets have to be composed.

INP is currently the most-failed vital industry-wide (~43% of sites miss 200 ms — [corewebvitals.io](https://www.corewebvitals.io/core-web-vitals)), which argues for including an interaction row in our budget, not only load rows.

### Human response-time limits (Nielsen/NN-g — stable since 1993, still the reference)

From [Response Time Limits](https://www.nngroup.com/articles/response-times-3-important-limits/):

- **0.1 s** — feels instantaneous; no feedback needed.
- **1.0 s** — the limit for the user's flow of thought to stay unbroken; the delay is noticed but no feedback is needed below this.
- **10 s** — the limit for keeping attention at all; beyond it, percent-done indicators and interruptibility are required.

[RAIL](https://web.dev/articles/rail) operationalizes the same: respond to input within 100 ms (budget 50 ms), users lose task focus beyond ~1 s, and full load should be interactive within 5 s **on a mid-range phone on slow 3G** — i.e., the 5 s figure is a worst-network bound, not a desktop target. [MDN's guidance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_long_is_too_long) is congruent: ~5 s first load on mobile 3G, **~1.5 s on fast office connections**, subsequent (cached) loads faster, and explicit feedback if anything runs 3–4 s.

### SaaS / authenticated-app practice

- Best-in-class authenticated apps paint key content around **0.8–1.1 s** (Trello ~0.8 s, Tableau ~1.1 s — [Catchpoint 2025 SaaS benchmark](https://www.catchpoint.com/learn/2025-saas-website-performance-benchmark-report)).
- Practitioner consensus: **~1 s feels right, 3 s is the pain line, a 6-second dashboard "feels broken"** even at 100% uptime ([UptimeRobot](https://uptimerobot.com/knowledge-hub/monitoring/saas-monitoring-how-to-monitor-saas-applications-effectively/), [Orbix](https://www.orbix.studio/blogs/app-performance-ui-ux-optimization)).
- Login flows get slightly more tolerance than in-app navigation (users expect an auth round trip), but auth latency drifting from ~250 ms toward ~1.2 s is treated as an incident signal, not a norm ([PerkyDash](https://perkydash.com/guides/saas-login-monitoring)).

### Perceived performance

Skeleton screens are consistently perceived ~30% faster than spinners for identical wait times, because a spinner communicates "wait" while a skeleton communicates "the page is here" ([UI Deploy](https://ui-deploy.com/blog/skeleton-screens-vs-spinners-optimizing-perceived-performance), [UX Collective](https://uxdesign.cc/what-you-should-know-about-skeleton-screens-a820c45a571a)). The Hub currently uses a spinner (`loading-state`) on list surfaces.

## 2. Holding our proposed numbers against practice

| Proposed (Groups retro follow-up) | Verdict against practice |
|---|---|
| Revisit / in-session soft-nav: **instant** | **Aligned.** Maps to the 0.1 s "instantaneous" class; the ADR-U042 cached-paint + background-revalidate pattern already achieves it and the E2E already asserts "spinner never appears". Keep. |
| Warm navigation / warm first load: **< 1 s** | **Aligned.** Exactly Nielsen's flow-of-thought limit and the SaaS best-in-class band (0.8–1.1 s). Keep. |
| Cold first-ever visit (sign-in click → painted list): **< 2 s** | **Slightly stricter than practice requires, and partly outside our control.** This is a *flow* (Supabase token exchange ~1.0 s + redirect + first paint), not a navigation; CWV's per-navigation "good" bar is 2.5 s. With a ~1.0 s vendor auth floor, a 2 s flow ceiling leaves the app ~1.0 s — tighter than best-in-class SaaS achieves for a full login flow. Recommend: **2.0 s target, 2.5 s ceiling**, with the app-controlled share explicitly budgeted at ≤ 1.5 s. |
| (absent) interaction responsiveness | **Gap.** Practice budgets every interaction (INP ≤ 200 ms; feedback within 100 ms), and INP is the most-failed vital in the wild. Add a row. |
| (absent) percentile + protocol | **Gap.** CWV thresholds are p75-of-field-data numbers. We have no RUM, so our gate measurements are lab-style spot checks — the honest adaptation is: every measured run meets the budget (a stricter reading than p75), on the stable production domain, cold and warm, ≥ 3 runs. |

## 3. Recommended budget (to lock)

Measured at the area gate on production (`fringe-island.vercel.app`), authenticated real path (the ADR-U037 rule), ≥ 3 runs per scenario, every run within budget. "Painted" = primary content rendered, not spinner-cleared-to-empty-shell.

| # | Scenario | Budget | Anchor |
|---|---|---|---|
| B1 | Sign-in flow: click → primary content painted | **target 2.0 s, ceiling 2.5 s** (app-controlled share ≤ 1.5 s; auth exchange ~1.0 s is the vendor floor) | CWV LCP-good; login-flow tolerance |
| B2 | Cold authenticated navigation (idle functions, first page of a session) | **≤ 2.5 s**, target 2.0 s | CWV LCP-good (p75) |
| B3 | Warm navigation / warm first load | **≤ 1.0 s** | Nielsen 1 s; SaaS best-in-class |
| B4 | Revisit / in-session soft-nav | **no visible loading state** (cached paint + background revalidate) | Nielsen 0.1 s class |
| B5 | Any interaction | **≤ 200 ms to next paint; visible feedback within 100 ms** | INP-good; RAIL |
| B6 | Loading-state rule | < 1 s: no indicator needed · 1–3 s: skeleton (not spinner) · > 3 s: treat as a defect | MDN/NN-g feedback guidance; skeleton ≈ 30% perceived gain |

Current standing vs. this budget: B1 ≈ 2.4 s (inside ceiling, misses target — the residual is mostly the auth exchange), B3/B4 met and asserted, B2 unmeasured-as-protocol (single runs suggest met), B5 never measured, B6 currently spinner-based.

## 4. Deliberately out of scope / follow-ups

- **Mobile/3G budgets** (RAIL/MDN's 5 s class): deferred until the Gimbal / Hamn-wave mobile work; the Hub budget above assumes desktop-class networks.
- **RUM (field p75):** the protocol above is a lab proxy. If/when traffic is real, adopt RUM (e.g., Vercel analytics / CrUX-style) and restate budgets at p75 — the numbers themselves shouldn't need to change.
- **Skeleton migration** of list surfaces (B6) is a design-system work item, not a blocker for locking the budget.
- **CLS** not budgeted separately — no measured layout-shift complaints; revisit if skeletons land (skeletons are also the standard CLS mitigation).

## Sources

- [web.dev — Defining the Core Web Vitals metrics thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)
- [corewebvitals.io — What Are the Core Web Vitals? (2026)](https://www.corewebvitals.io/core-web-vitals)
- [NN/g — Response Times: The 3 Important Limits](https://www.nngroup.com/articles/response-times-3-important-limits/)
- [MDN — Recommended Web Performance Timings: How long is too long?](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_long_is_too_long)
- [web.dev — Measure performance with the RAIL model](https://web.dev/articles/rail)
- [Catchpoint — 2025 SaaS Website Performance Benchmark Report](https://www.catchpoint.com/learn/2025-saas-website-performance-benchmark-report)
- [UptimeRobot — SaaS Monitoring: Metrics, Tools, and Best Practices](https://uptimerobot.com/knowledge-hub/monitoring/saas-monitoring-how-to-monitor-saas-applications-effectively/)
- [PerkyDash — How to Monitor SaaS Login & Auth Flow](https://perkydash.com/guides/saas-login-monitoring)
- [UI Deploy — Skeleton Screens vs. Spinners: Optimizing Perceived Performance](https://ui-deploy.com/blog/skeleton-screens-vs-spinners-optimizing-perceived-performance)
- [UX Collective — Everything you need to know about skeleton screens](https://uxdesign.cc/what-you-should-know-about-skeleton-screens-a820c45a571a)
