# Cold-load investigation brief — the first authenticated page costs ~5.5 s

**Written:** 2026-07-27 · **For:** a dedicated investigation session, starting cold
**Status:** open question, not a diagnosis. This brief deliberately separates *measured fact* from *hypothesis*, and records one conclusion that was already reached and **retracted**.

---

## 1. The question

On production, a member with a valid session who returns after ≥20 minutes of platform idle waits **~5.5 seconds** for their first page to become usable. Every subsequent page in that session takes **~380 ms**.

The budget (ADR-U043 B2) is **≤ 2 500 ms**. We are ~2.2× over. Over 3 s also trips **B6**, which classes it a defect independent of B2.

**The job:** find where those ~5.5 seconds go, and decide what — if anything — to do before launch.

**What this is not:** a request to make it fast at any cost. Cold overshoot is currently an *accepted, labelled pre-launch exception*. Warm and semi-warm performance is the binding signal and it passes comfortably. This is a "understand it properly and decide deliberately" task.

---

## 2. Measured facts (2026-07-27)

**Protocol:** production `fringe-island.vercel.app`; authenticated real path; headless FIM created and erased in-run; completion measured to a **data-derived selector** (not a 200, which only proves the static shell rendered); deep-cold = **22 min enforced zero traffic**, four separate windows.

### Deep-cold — first authenticated navigation of a session

| First page of session | Wall to usable | n |
|---|---|---|
| `/notifications/preferences` | **5 864 ms** | 1 |
| `/notifications/preferences` | **5 142 ms** | 2 |
| `/groups` | **5 617 ms** | 1 |

Mean ≈ **5 541 ms**, range 5 142–5 864, across **two different pages**.

### Everything else

| Scenario | Measured | Budget | Verdict |
|---|---|---|---|
| Second navigation of same session | 379 / 389 / 402 ms | — | fine |
| B1 sign-in click → content (deep-cold) | **2 377 ms** | ≤ 2 500 | PASS |
| B3 warm soft-nav ×3, both pages | 272–399 ms | ≤ 1 000 | PASS |
| B3 warm full load, fresh browser context | 937 ms | ≤ 1 000 | PASS, 63 ms spare |

### The two numbers that frame everything

1. **Slowest individual API request, cold: 1 298 ms and 1 485 ms.**
2. **A full sign-in from cold (2 377 ms) is 2.3× FASTER than a returning member's first page (~5 500 ms).**

Fact 2 is coherent, not paradoxical: the sign-in flow loads `/login` first, warming the document and edge path, so part of the stack is hot by the time content paints. A restored session skips that warm-up and pays full price. **The worst experience on the platform belongs to returning members, not new ones** — which no "first-time visitor" framing captures.

---

## 3. The critical comparison — and its caveat

On **2026-07-10**, immediately after the edge→Node migration (ADR-U036 Amendment 2, PR #159), a deep-cold `/journeys` walk under the same 22-minute protocol measured ([`2026-07-09-cold-load-regression-analysis.md`](./2026-07-09-cold-load-regression-analysis.md) §8):

- fan-out fired at **2 342 ms** (client render/boot)
- 4 concurrent requests: **1 328 / 1 378 / 1 483 / 1 612 ms** — a tight unimodal band, boot lottery eliminated
- **data complete ≈ 3.9 s** deep-cold worst case (down from ≈7.2 s pre-migration)

Against today's ~5.5 s, two things stand out:

**A. The per-request cold cost has NOT moved.** Today's slowest cold requests (1 298, 1 485 ms) sit squarely inside the 07-10 band (1 328–1 612 ms). Whatever grew, **it is not the function boot** — the thing the edge→Node migration fixed has stayed fixed.

**B. The total grew by ~1.6 s and the arithmetic no longer closes.** Using the 07-10 decomposition: 2 342 ms to fan-out + ~1 485 ms slowest request ≈ **3.8 s expected**, versus **5 864 ms measured**. That leaves **~2.0 s unaccounted for**.

> ⚠️ **Caveat that must not be skipped.** This is **not** a like-for-like comparison. Different page (`/journeys` vs `/notifications/preferences`), and — more importantly — a different completion definition: 07-10 measured *data complete* from the browser Performance API; 2026-07-27 measured *navigation start → data-derived selector visible*, which includes render. Mine is larger by construction. **Do not call this a regression until §5 experiment 1 has run.**

---

## 4. What is already ruled out — do not re-tread

Each of these cost real time previously. All are documented in [`2026-07-09-cold-load-regression-analysis.md`](./2026-07-09-cold-load-regression-analysis.md).

| Ruled out | Evidence |
|---|---|
| **Database / RLS** | warm slices 48–109 ms; cold-with-connection 460–495 ms in-function |
| **Region / colocation** | `dub1` pin held across all sessions (ADR-U035); `vercel.json` still pins it |
| **Route code** | client patterns conformant — stable-key effects, shared in-flight, session caches |
| **Edge runtime** | already migrated off. **Verified today: 79 API route files, zero `export const runtime` declarations** — all on platform-default Node/Fluid. The migration holds. |
| **Keep-warm pinging — RETIRED AS A STRATEGY** | Single-ping holds exactly one instance; the first real fan-out sails past it. Multi-ping (L2′) was tested and **failed both ways**: pool persistence across a 4.5-min gap is a coin flip, and even a **60-second-old** pool did not cover a 4-route concurrent boot. The multi-second cost sits in the **function-sandbox layer below the middleware, provisioned per concurrent request with opaque decay**. **No pinger at sane cadence can pin that layer.** |
| **GitHub Actions as scheduler** | measured cadence 1.5–4 h vs the required 5 min |

---

## 5. Open hypotheses, each with its falsifying experiment

Ranked by expected information per unit of effort. **Every deep-cold experiment costs a ≥20-minute idle window, so order matters.**

### Experiment 1 — Establish like-for-like (DO THIS FIRST)

Re-measure **`/journeys`** with today's harness, same protocol.

- Against the 07-10 baseline of ≈3.9 s data-complete.
- Because the harness now records **`fanOutAt`** (when the first API request fires), this directly reproduces the 07-10 decomposition.
- **If `/journeys` lands near 3.9 s** → the difference is page-specific and §3B's "~2 s unaccounted" is largely the selector-visible-vs-data-complete definition gap. Not a regression.
- **If `/journeys` also lands near 5.5 s** → a genuine platform-wide regression since 07-10, and the next question is *what changed in 17 days*.

```
node scripts/perf-measure.mjs signin
# wait >= 20 min, zero traffic
node scripts/perf-measure.mjs coldnav-path /journeys '[data-testid="journeys-list"]'
```

Selector **verified** (`hub/app/journeys/page.tsx:97`). It is guarded by the same empty-state pattern that bit `/groups` — `journeys-list` renders only when `journeys.length > 0` — but the catalogue is platform-wide *published* journeys rather than the member's own, and there are **9 published (8 public)** on the shared DB, so the fixture will see them.

### Experiment 2 — Which term grew: client boot, or requests?

The harness now prints `fan-out fires @ N ms` and `unaccounted N ms` for every navigation. On any deep-cold run, read the split:

- **`fanOutAt` ≫ 2 342 ms** → the cost moved into **client boot / hydration / bundle parse**. That points at JS bundle growth over 17 days of features, and is measurable without any idle window (compare bundle sizes across deploys).
- **`fanOutAt` ≈ 2 342 ms but `unaccounted` is large** → time is going into a **second request wave** (a dependency chain — e.g. auth resolves, *then* reads fire) or into render-after-data. A second wave would show as a bimodal spread in request start times.

This is nearly free — it rides on whatever run happens anyway.

### Experiment 3 — Does fan-out width actually matter?

Deep-cold navigate to the **thinnest** authenticated surface available (fewest API reads).

- **Lands near 5.5 s too** → read count is irrelevant; cost is per-session sandbox provisioning, and fan-out reduction (below) is not worth building.
- **Lands materially lower** → fan-out reduction is the lever, and the numbers below become actionable.

### Experiment 4 — Vercel Pro scale-to-one

Parked with Stefan since 07-10. Would hold a warm instance at the platform level — the one thing pinging demonstrably cannot do, because it operates *at* the sandbox layer rather than trying to poke it from outside. **Cost question, not an engineering one.**

---

## 6. The fan-out observation — true, but its causal claim is UNTESTED

Recorded because it is well-evidenced and someone will otherwise rediscover it. **It is not established that this causes the cold cost** (see the retraction, §7).

`/notifications/preferences` fires **6 API reads, fully concurrent** — all six start at ~178 ms warm, each 242–302 ms (deterministic warm waterfall run).

**Only 2 of the 6 belong to the page:**

| Read | Fired by | Whose? |
|---|---|---|
| `/api/notifications/preferences` | `NotificationPreferencesPanel` | page |
| `/api/notifications/nudge-policy` | `NudgePolicyPanel` | page |
| `/api/notifications/unread-count` | `NotificationBell` → `AppShell` | **shell** |
| `/api/messages` | `MessagesLink` → `AppShell` | **shell** |
| `/api/profile/me` | shell profile | **shell** |
| `/api/account/state` | `AccountStateProvider` → `app/layout.tsx` | **shell** |

The ADR-U042 bootstrap bundle (`/api/me/overview`) carries **5 slices** — `profile`, `account_state`, `groups`, `invitations`, `onboarding` — and is **path-gated**:

```
hub/components/shell/OverviewBoot.tsx:17
const BOOT_PATHS = /^\/(?:$|login\/?$|groups\/?$)/;
```

So on `/notifications/preferences` the bundle never fires. Two consequences:

- Adding the path to `BOOT_PATHS` absorbs `profile` + `account_state` → **6 reads becomes 5**. Modest.
- The two shell *badge* reads (`unread-count`, `messages`) **predate the bundle and were never folded into it**. Covering them too → **6 reads becomes 3**.

The parked **L3 lever** argues exactly this — *"fan-out is precisely what is expensive… session-caching app-boot reads so full boots don't re-fire them"* — and marks itself **"un-park candidate at J-F or the area gate"** ([`2026-07-09-cold-load-regression-analysis.md:113`](./2026-07-09-cold-load-regression-analysis.md)). Experiment 3 is what tells you whether to build it.

---

## 7. Retracted conclusion — recorded so it is not re-derived

**Claim made and withdrawn during the 2026-07-27 pass:** *"`/notifications/preferences` is slow because it misses the `BOOT_PATHS` gate; `/groups` gets the bundle and is fast."*

It was built on measuring `/notifications/preferences` cold at **5 864 ms** against `/groups` at **379 ms** — but that 379 ms reading was **second-of-session (semi-warm)**. A cold number was compared against a warm one and the gap attributed to the bundle.

The control run — identical protocol, `/groups` going **first** — returned **5 617 ms**.

**The bundle gate does not explain the cold cost.** Whichever page is first pays ~5.5 s.

*Lesson for whoever picks this up: in this system a page's position in the session dominates which page it is. Always compare cold-to-cold.*

---

## 8. Reproduction

Harness committed at **`hub/scripts/perf-measure.mjs`** (`node scripts/perf-measure.mjs` for usage). Requires `hub/.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

```
node scripts/perf-measure.mjs setup      # provision FIM + 3 groups
node scripts/perf-measure.mjs signin     # persist session (warms; unmeasured)
#   >>> wait >= 20 min with ZERO traffic to the deployment <<<
node scripts/perf-measure.mjs coldnav    # the real measurement
node scripts/perf-measure.mjs warm       # warm comparison
node scripts/perf-measure.mjs teardown   # ALWAYS
```

### Traps that cost time on 2026-07-27 — all now guarded in the harness

1. **Signing in immediately before a "cold" navigation destroys it.** The sign-in warms every function it touches. This reported `/notifications/preferences` cold at **368 ms**; the corrected two-phase protocol reports **5 864 ms** on the same page. **A 16× error, in the direction of a false pass.** This is the single most important thing to get right.
2. **Production shares the dev Supabase project** (`jveybknjawtvosnahebd`) — verified from the deployed client bundle. Fixtures work against production; be careful what you create.
3. **A fresh FIM has no groups**, so `/groups` renders `EmptyState` and `data-testid="groups-list"` never appears. `setup` creates three fixture-owned groups for this reason.
4. **Fixture creation requires `user_metadata: { display_name, consent_accepted: 'true' }`** — signup is consent-gated at the substrate (ADR-U038 S3). Omitting it fails with an opaque *"Database error creating new user"*.
5. **Cold read *counts* are unreliable** (6 vs 3 captured for the same page): the listener's capture window closes when the selector appears. Use the `waterfall` command for the authoritative read inventory. Wall-clock timings are unaffected.
6. **`ResourceTiming.responseEnd` returns 0** on these responses — durations are stamped from request/response events instead.
7. **An unauthenticated 200 is not a measurement.** `/notifications/preferences` returns 200 in ~340 ms signed-out; that is the static shell, not the real path.

---

## 9. Prior art

| Document | Why it matters |
|---|---|
| [`2026-07-09-cold-load-regression-analysis.md`](./2026-07-09-cold-load-regression-analysis.md) | **Read this first.** Root causes RC-A..RC-E, the five candidate levers, the failed pinger experiments (§7), and the edge→Node migration result (§8) that is today's baseline |
| [`2026-07-27-antf-gate-measurements.md`](./2026-07-27-antf-gate-measurements.md) | The raw measurement record this brief is drawn from |
| [ADR-U043](../../architecture/decisions/ADR-U043-performance-budgets.md) | The budgets (B1–B6) and Amendment 1's cold definition (≥20 min enforced idle) |
| [ADR-U036](../../architecture/decisions/ADR-U036-edge-runtime-hot-read-routes.md) | Amendment 2 reversed the Edge choice; the pinger was retired here |
| [ADR-U042](../../architecture/decisions/ADR-U042-first-paint-bootstrap-read-bff-bundle.md) | The bootstrap-bundle pattern and its guardrails |
| [ADR-U035](../../architecture/decisions/ADR-U035-compute-datastore-colocation.md) | Region colocation — ruled out, but the pin must stay |

**Standing rider (Stefan, 2026-07-22):** the cold exception never waives the measurement pass; warm and semi-warm numbers are the binding signal — *"the semi-warm loading times really matter regardless of our current long cold loading times."*
