# Cold-load regression analysis — 2026-07-09

**Status:** diagnosis complete; no fixes applied (analysis-only session, per Stefan's ask).
**Symptoms (Stefan, 2026-07-09):** (1) cold sign-in → `/groups` extremely slow again; (2) `/journeys` paints its frame fast but the journey boxes sit empty for a long time; (3) `/journal` shows a spinner (shorter, but visible). Hot loads are all fast.
**Method:** ADR-U043 protocol — production stable domain (`fringe-island.vercel.app`), authenticated real path, cold + warm; cold defined here as **22.5 minutes of zero traffic** (timer-enforced). Per-slice decomposition via the `x-overview-timing` header (PR #123).

---

## 1. Measured evidence

### Warm (all healthy — the 07-06/07-07 fixes hold)

| Page (hard load) | API calls fired | TTFBs | Notes |
|---|---|---|---|
| `/groups` | `GET /api/me/overview` ×1 only | 280–779 ms | ADR-U042 bundle intact; single-fire holds |
| `/journeys` | `profile/me`, `account/state`, `journeys`, `me/journeys` | 268–372 ms | standalone fan-out (not a boot path) |
| `/journal` | `profile/me`, `account/state`, `journal` | 257–341 ms | standalone fan-out |

Warm in-function bundle cost: **113 ms** (auth 4 ms, slowest slice 109 ms). Client↔edge network constant ~167 ms. Bimodal nothing — warm is uniformly within budget (B3).

### Cold (22.5 min idle, scripted sequential pass, Stefan-session cookies)

| Request (in order) | Browser TTFB | In-function | Outside-function |
|---|---|---|---|
| `/api/me/overview` (first request) | **4 690 ms** | **614 ms** (auth 118; slices 460–495 concurrent) | **~3.9 s** |
| `/api/journeys` ∥ `/api/me/journeys` | **4 162 ms** ∥ 423 ms | — | one request drew a **second ~4 s boot**; its concurrent sibling rode warm |
| `/api/journal` (after the above) | 336 ms | — | rode warm |
| Warm repeats (all four) | 159–280 ms | 113 ms | ~167 ms |

Corroborating uncontrolled sample (same morning, first `/journeys` hard load of the session): `account/state` **4 783 ms** while its three concurrent siblings did 638–696 ms — same bimodal signature.

## 2. Root causes

**RC-A — The cold boot is ~4 s and lives OUTSIDE the function; ADR-U036's Edge premise does not hold under real idle.**
Cold overview: TTFB 4 690 ms, in-function 614 ms → ~3.9 s is isolate/instance provisioning before the function's first line. ADR-U036 was premised on "V8 isolate ~0 ms cold start"; the 07-06 investigation already flagged (and left unexamined) *"what infrastructure the deprecated `edge` runtime actually runs on now."* That question is now load-bearing: today's boot cost is lambda-class, not isolate-class. Note the inversion: the measured **Node** cold start (2026-06-30, pre-Fluid) was 740–790 ms — **5× cheaper than today's Edge cold boot**. Timeline note: Fluid compute was enabled 2026-07-06; whether it changed Edge-route hosting behavior is part of the same vendor question.
**Related earlier evidence, reinterpreted:** the 07-06 Phase-3.5 "boot is innocent" finding (401 probes: 153–187 ms) measured the unauthenticated fast path only; the 07-06 *authenticated* cold waterfalls (3.1–4.7 s ×5 routes, 15 min idle) and today's pass agree with each other. Deep-cold has *always* been 3–5 s; it was the shallow-cold samples that said otherwise (see RC-E).

**RC-B — Concurrent fan-out multiplies the boot lottery.**
Evidence is bimodal in every cold sample: of N concurrent cold requests, some ride a just-booted warm instance (0.3–0.7 s), others trigger an additional ~4–5 s boot (`journeys` 4 162 vs `me/journeys` 423, fired together; `account/state` 4 783 vs three siblings ~0.7 s). Best-fit model (hypothesis, not verified vendor fact): the Edge routes share deployment infrastructure; the first request boots one instance, and concurrency above its capacity spawns additional cold instances. Consequence: **every extra first-paint request is another ticket in a 4-second lottery.**

**RC-C — The new pages reintroduced the fan-out that ADR-U042 killed on boot paths.**
`OverviewBoot` arms only on `/`, `/login`, `/groups` (`hub/components/shell/OverviewBoot.tsx:12`). A hard load of `/journeys` fires **4** standalone cold requests; `/journal` fires **3**; an SPA navigation to `/journeys` fires 2. The journeys client documents its exemption deliberately (`hub/lib/journeys/client.ts` header: "navigation targets, not first-paint-at-landing — no overview-bundle slice"). The client-side patterns are all conformant (stable-key effect, shared in-flight, session caches, SkeletonGrid) — the cost is structural, not a code bug. The "empty boxes" are `SkeletonGrid` correctly waiting out a 4 s cold TTFB (B6 makes >3 s a defect regardless of skeleton).

**RC-D — Journal predates the rules and was never retrofitted.**
`hub/lib/journal/client.ts` has **no session cache** (every visit refetches → spinner on every revisit — a B4 violation by construction) and the page uses `LoadingState` (spinner), not a skeleton (B6). Built 2026-07-03; ADR-U043 landed 07-07; no retrofit sweep exists.

**RC-E — Why the captured rules didn't prevent this (the process finding).**
1. **"Cold" was never operationalized.** ADR-U043 mandates cold+warm but doesn't define minimum idle. The J-A gate's cold samples (07-07: bundle 1 374 ms, slices 233–446 ms) were taken ~30 min after deploy during an active session — shallow-cold. Every deep-cold sample on record (≥15 min idle: 07-06 and today) is 3–5 s. The gate *passed* on numbers that don't represent Stefan's morning.
2. **The area perf gate (J-O3) runs after J-E** — J-A..J-D shipped user-visible for two days before any gate measurement was due. The per-cycle "ADR-U043 Performance rows" in DoD verify code patterns, not measured budgets.
3. **A flagged vendor premise had no owner.** The "what does `edge` run on now" question was recorded 07-06 as needing "one confirming look" and never landed anywhere (no ADR addendum, no task).
4. **No retrofit rule** for surfaces built before a budget ADR (Journal).

**Ruled out (again):** DB/RLS (warm slices 48–109 ms, cold-with-connection 460–495 ms in-function); region (pin held all session); route code; the 07-06 fixes regressing — bundle single-fires, caches hold, audit is fire-and-forget (`hub/app/login/page.tsx:42`).

## 3. Reconstruction of the three symptoms

| Symptom | Reconstruction |
|---|---|
| Cold sign-in → `/groups` "extremely slow" | token exchange ~1.0 s (vendor floor) + hydrate ~0.9 s + **overview cold 4.7 s** (overlaps redirect) ≈ **5–6 s felt** — vs 2.4 s verified 07-06, whose cold overview sample happened to be 1.4 s (shallow-cold). B1 ceiling 2.5 s: **failed at deep-cold**. |
| `/journeys` empty boxes | frame paints at ~0.5 s (hydration); `SkeletonGrid` then waits on 2 cold requests, one of which can draw a 4 s boot → boxes empty 4+ s. B2 ceiling 2.5 s: **failed at deep-cold**. |
| `/journal` spinner (shorter) | 1 page-read ticket; often rides an instance already booted by a previous page → usually sub-second cold, spinner *every* visit though (no cache, B4 fail). |

## 4. Candidate levers (not implemented — for the decision board)

| # | Lever | Expected effect | Cost/canon |
|---|---|---|---|
| L1 | **Answer the vendor question** (what runs `edge` now; Vercel support ticket / docs / test deploy), then revisit ADR-U036 — possibly Node+Fluid for hot reads (measured Node cold 740–790 ms, and Fluid adds bytecode caching + warm pools) | caps the boot at <1 s instead of 4–5 s | ADR-U036 addendum territory; the decisive lever |
| L2 | **Keep-warm ping** (cron GET every ~5 min to one hot route). Previously dismissed as a *measurement* proxy — as a *fix* it's legitimate: today's dominant term is precisely the pre-function boot a ping keeps warm | eliminates deep-cold for interactive hours at ~zero cost | config-only; cheap interim regardless of L1 |
| L3 | **Arm `OverviewBoot` on all authenticated paths** (it's once-per-session anyway) and/or serialize a "boot barrier": let the bundle's first request boot the instance before page reads fan out | one boot lottery ticket per session instead of 2–4 per page | Hub-only; consistent with ADR-U042 guardrails |
| L4 | **Journal retrofit**: session cache + skeleton (the groups/journeys client pattern) | B4/B6 conformance; kills the every-visit spinner | small, pattern exists |
| L5 | **Protocol amendment (ADR-U043):** define cold = ≥20 min idle (or overnight); add a tail rule ("no single run >2× budget"); pull a per-cycle spot measurement forward instead of area-gate-only | prevents shallow-cold false passes | doc + skill DoD rows |

## 5. What this does NOT reopen

The 07-06/07-07 architecture holds: bundle-only composition (ADR-U042 guardrail 4 stands — the substrate RPC would still save only ~60 ms), Edge+`dub1` conformance, local-JWT reads, session caches, fire-and-forget audit. This analysis adds one vendor-layer fact those decisions were missing: the deep-cold boot is 4–5 s and bimodal under concurrency.

## 6. L1 A/B results (same day, post-PR #148 — probes + `x-proxy-timing` live)

Instrumented pass, 22.5-min enforced idle, both probe twins fired concurrently, `/api/me/overview` fired ~5 s after them:

| Request | TTFB | middleware (`x-proxy-timing`) | in-function (`x-probe-timing`) | unaccounted provisioning |
|---|---|---|---|---|
| `probe-edge` (cold) | 4 592 ms | 347 ms, n:1 fresh | 200 ms (auth 110, read 90) | **~3.9 s** |
| `probe-node` (cold) | 2 519 ms | 322 ms, n:1 fresh (separate instance) | 667 ms (read 537) | ~1.4 s |
| `overview` (cold instance, fired after the wave) | **497 ms** | 7 ms, n:2 warm | 286 ms | **~34 ms** |
| both probes warm | 186–~250 ms | 3–14 ms | 54–115 ms | ≈ network |

Fresh-deploy shallow-cold control (same day, deploy +3.5 min): edge 2 216 ms / node 2 223 ms — runtimes identical.

**Findings (supersede the L1 framing in §4):**

1. **Runtime class acquitted.** Edge and Node both pay multi-second provisioning after deep idle and are identical shallow-cold; the deep-idle spread (4.6 vs 2.5 s) matches the bimodal lottery seen all session, not a runtime difference. **An Edge→Node migration is not a cold-load fix** — ADR-U036 needs no perf-forced revisit (Vercel's deprecation direction remains a strategic reason to migrate eventually, on its own clock).
2. **The cost is a front-loaded provisioning wave, not per-function boot.** An equally-idle Edge route (`overview`, `n:1` fresh instance) provisioned in ~34 ms once the first request wave had run. After the wave, everything — including brand-new instances — is cheap. Middleware instances are also per-wave (~300-620 ms first invocation each, concurrent requests get separate ones).
3. **L2 keep-warm is therefore the primary fix**, not a stopgap: one request every ~5 min holds the provisioned environment and the deep-cold class disappears for interactive hours. **Validated (same day, third idle window):** an unauthenticated cookie-less ping after 22.5 min idle paid the provisioning wave itself (TTFB 3 735 ms, in-function 4 ms, middleware 9 ms → ~3.7 s provisioning), and authenticated requests 20 s later landed at 1 194/1 290 ms — the 4–5 s class gone; the residual is per-instance middleware first-invocation (~115–260 ms) + fresh Supabase connections (~380 ms in-function). The 2026-07-06 Phase-3.5 fast cold 401s (153–187 ms "after ~2 h idle") are thereby reinterpreted: those probes must have hit still-warm infrastructure — an unauth request does NOT ride a light path. Keep-warm target: `/api/me/overview` (permanent route — the probe twins are temporary), unauthenticated, with a dummy cookie header to also exercise the cookie-bearing middleware path (harmless — cannot authenticate; costs nothing if it makes no difference). Hobby-limit impact: ~8.6 K invocations/month against the 1 M cap, in-function ~4 ms per ping — negligible.

## 7. 2026-07-10 follow-up — the wave is per-instance; concurrency defeats a single-ping keep-warm

**Context.** Stefan's live walk (fresh Edge-browser session, morning of 2026-07-10): groups fast, `/journeys` ~5 s to populated boxes — *within one session*. Investigated same day during the J-E decomposition session. Keep-warm state: **GitHub Actions never held the schedule** — 10 scheduled fires in the first ~23 h, gaps 1 h 22 m–3 h 55 m against the requested `*/5` (GitHub best-effort throttling of high-frequency crons); the workflow was **disabled 09:19 UTC** for clean measurement and stayed off for all samples below.

**Measurements (production stable domain, pinger off; diagnostic samples — idle depths bounded by known anchors, not timer-enforced; the decisive datum below is idle-independent):**

1. **Sequential 401 probes** (~40 min after the last scheduled ping + Stefan's uninstrumented visit in between): `/api/journeys` **4 552 ms → 129 ms**; then first hits to `/api/me/journeys` 131 ms and `/api/groups` 193 ms. One payment; *sequential* cross-route followers all ride it. `x-proxy-timing` showed one middleware instance (n incrementing continuously, age ~20 min) — the wave is below the middleware.
2. **DB acquitted:** `EXPLAIN ANALYZE SELECT public.get_journey_catalog()` = **76 ms** total. Route config acquitted too: all Journeys routes are Edge + `dub1`, identical to Groups.
3. **The decisive walk (authenticated, Stefan's session, driven via browser automation):** landing paid the wave on `/api/me/overview` (**3 768 ms**) — then, **~2 minutes later with the environment demonstrably warm**, the `/journeys` full page boot fired 4 concurrent reads: `profile/me` 656 ms, **`journeys` 4 846 ms, `me/journeys` 3 643 ms, `account/state` 4 876 ms** — three of four each drew a fresh full boot. Immediate reload of the same 4-way boot: **243–511 ms** across the board.

**Refined model (supersedes §6 finding 2's "after the wave, everything is cheap"):** provisioning is **per-instance**. A warm instance is reused across routes by *sequential* traffic — which is exactly the evidence shape §6 finding 2 was built on (`overview` fired ~5 s *after* the probe wave) and why it read as environment-scoped. **Concurrent requests cannot share it:** an N-way fan-out needs up to N instances, and every instance beyond the warm pool pays its own ~3.6–4.9 s boot — even minutes after other traffic. §6's "bimodal lottery" (4 162/423 ms) was this mechanism, undersampled at N=2.

**Symptom explained.** The Journeys page is the Hub's fan-out page (2 concurrent reads on SPA nav; 4 on a full boot re-firing the app-boot reads) — so it repeatedly *presents* as "the slow page" while containing nothing slow. Groups boots on one call. Any single-request page rides warm capacity; any fan-out page rolls the per-instance dice.

**Consequences for the levers (§4 / §6 finding 3):**

- **A single-ping keep-warm cannot fully fix this** — it holds exactly one instance; the first real fan-out sails past it. §6 finding 3 ("L2 is the primary fix") is downgraded to *partial*: it removes the sequential first-visitor wave only. **L2′ — concurrent multi-ping** (each tick fires ~4 concurrent requests to hold a pool) was the candidate stopgap; the validation experiment (ticks at 4.5-min gaps, then a 4-way real-route page-boot burst 60 s after the last tick) ran this session and **FAILED both ways**: pool persistence across a 4.5-min gap is a coin flip (tick-2: 3/4 re-drew full ~3.7 s boots; tick-3: all warm, on instances that survived the identical gap), and even a **60-second-old** pool did not cover the real 4-route concurrent boot (`journeys` 3 842 ms and `account/state` 5 219 ms drew fresh boots while their two siblings rode warm; the slow pair's `x-proxy-timing` showed *warm 5.5-min-old middleware instances* — the multi-second cost sits in the function-sandbox layer below the middleware, provisioned per concurrent request with opaque decay). **No pinger at sane cadence can pin that layer. Pinging is retired as a strategy**; the app-side levers above (fan-out reduction; the Node/Fluid in-instance-concurrency evaluation) are the path. The disabled GitHub workflow stays disabled pending its removal decision.
- **The parked L3 (bundle/OverviewBoot on authed paths) inverts its premise.** It was parked as "cheap fan-out once the environment stays warm" — but fan-out is precisely what is expensive. Reducing concurrent first-paint reads (bundling the journeys pair; session-caching app-boot reads so full boots don't re-fire them) attacks the root, not the symptom. Un-park candidate at J-F or the area gate.
- **New input for the ADR-U036 addendum's deferred edge→Node question:** Vercel Fluid Compute offers *in-instance concurrency* for Node functions — one warm Node instance could serve an entire fan-out where Edge isolates measurably cannot. The deferral was decided under the environment-scoped model; this does not reopen it by itself, but the next touch of that decision should weigh it.
- GitHub Actions is retired as the scheduler regardless of lever choice (measured cadence 1.5–4 h vs the required 5 min).

## Appendix — session measurement log

Warm page loads 06:3x–06:4x UTC (groups/journeys/journal, per-page waterfalls via Performance API); cold pass 07:0x UTC after 22.5 min enforced idle: overview 4 690 ms (in-function 614 ms), journeys pair 4 162/423 ms, journal 336 ms, warm repeats 159–280 ms. Uncontrolled morning sample: account/state 4 783 ms vs siblings 638–696 ms. All requests 200, Stefan's live session, `x-vercel-id: arn1::dub1` unchanged. Prior baselines: `2026-07-06-groups-first-load-perf.md`, `2026-07-07-journeys-j-a-waterfall.md`, ADR-U043.
