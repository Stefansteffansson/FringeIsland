# A-NTF gate — ADR-U043 measurement pass (2026-07-27)

Closes the two measurements owed at the [A-NTF area gate](../retrospectives/retro-2026-07-26-notifications-area.md): N-C's `/groups` before/after and N-D's new `/notifications/preferences` page.

**Environment:** production `fringe-island.vercel.app` · same Supabase project as dev (verified from the deployed client bundle) · authenticated real path · headless measurement FIM created and erased in-run (`perf-antf@fringeisland.test`, teardown verified: 0 auth rows, 0 profile rows, 0 leftover groups).
**Protocol:** ADR-U043 + Amendment 1. Deep-cold = **≥ 20 min enforced zero traffic** (22 min actual, four separate windows), n honestly labelled. Completion measured to a **data-derived selector** (`groups-list`, `pref-toggle-*`) — an unauthenticated 200 only proves the static shell rendered and is not the real path.

---

## Headline

**The cold penalty is ~5.5 s, it is paid once per session by whichever authenticated page is loaded first, and it is not page-specific.** Both measured pages fail B2 by roughly 2×. Everything warm and semi-warm passes comfortably.

## Results

### Deep-cold — first authenticated navigation after ≥20 min idle (session cookie alive, functions cold)

| First page of session | Wall | B2 budget | Verdict |
|---|---|---|---|
| `/notifications/preferences` (n=1) | **5 864 ms** | ≤ 2 500 ms | **FAIL** — 2.35× |
| `/notifications/preferences` (n=2) | **5 142 ms** | ≤ 2 500 ms | **FAIL** — 2.06× |
| `/groups` (n=1) | **5 617 ms** | ≤ 2 500 ms | **FAIL** — 2.25× |

Mean ≈ **5 541 ms**, range 5 142–5 864 ms across **two different pages**. Also > 3 s, which **B6 independently classes as a defect** regardless of B2.

### Second navigation of the same session (semi-warm)

| Page | Wall | Verdict |
|---|---|---|
| `/groups` (after preferences) | 379 ms · 389 ms | PASS |
| `/notifications/preferences` (after groups) | 402 ms | PASS |

### Sign-in flow, deep-cold

| Scenario | Wall | Budget | Verdict |
|---|---|---|---|
| **B1** sign-in click → content painted | **2 377 ms** | target 2 000, ceiling 2 500 | **PASS** — 123 ms headroom, over target |

### Warm

| Scenario | Runs | Budget | Verdict |
|---|---|---|---|
| B3 `/groups` soft-nav ×3 | 385 / 368 / 374 ms | ≤ 1 000 ms | PASS, wide |
| B3 `/notifications/preferences` soft-nav ×3 | 272 / 278 / 399 ms | ≤ 1 000 ms | PASS, wide |
| B3 `/notifications/preferences` full load, **fresh context** (uncached bundles) | 937 ms | ≤ 1 000 ms | PASS — **63 ms spare** |

---

## The finding that matters, and the wrong answer it replaced

**A returning member is slower than a new one.** B1 — a full sign-in from cold — costs **2 377 ms**. A returning member whose session is still valid, arriving after ≥20 min idle, waits **~5 500 ms** for their first page. That is **2.3× worse than signing in from scratch**, and it is the case "first-time visitor" intuition never covers.

It is coherent rather than paradoxical: the sign-in flow loads `/login` *first*, which warms the document and edge path, so by the time content paints part of the stack is already hot. A restored session skips that warm-up entirely and pays full price on its first authenticated navigation.

**An earlier conclusion in this pass was wrong and is retracted.** Having measured `/notifications/preferences` cold at 5 864 ms and `/groups` at 379 ms, I attributed the gap to `OverviewBoot`'s `BOOT_PATHS` gate (`components/shell/OverviewBoot.tsx:17` — the ADR-U042 bundle fires only on `/`, `/login`, `/groups`) and concluded the preferences page was slow *because* it misses the bundle. **That compared a cold number against a semi-warm one.** The control run — same protocol with `/groups` going first — returned **5 617 ms**, statistically indistinguishable from the preferences page. The bundle gate does not explain the cold cost.

## Fan-out — a closed question, recorded here only to stop it reopening

> **Corrected 2026-07-27.** The paragraphs below were written before this pass re-read the J-gate, and they treat fan-out reduction as an open lever. **It is not.** The J-gate closed it with evidence on 2026-07-19 (**R3**): the concurrent reads **share one instance's boot** — four `/journeys` reads cost ~1.3 s *wall total*, not 4×, and ~150 ms each warm — so *"collapsing them into one read would save ~0 at deep-cold… The measured pain lives in provisioning + first-visit assets, not the fan-out."* The read-inventory facts below remain accurate; the implied lever does not. Any remaining value is a **warm** B3 question (the 937 ms fresh-context load), not a cold one.

## What survives as an observation (correctly scoped)

The fan-out facts are real; they are simply **not demonstrated to cause the cold penalty**:

- `/notifications/preferences` fires **6 API reads**, **fully concurrent** — all six start at ~178 ms, each 242–302 ms warm (deterministic warm waterfall run).
- **4 of the 6 are app-shell reads**, not the page's: `unread-count` (`NotificationBell` → `AppShell`), `messages` (`MessagesLink` → `AppShell`), `profile/me`, `account/state` (`AccountStateProvider` → `layout.tsx`). Only `preferences` and `nudge-policy` belong to the page.
- The ADR-U042 bundle covers **5 slices** — `profile`, `account_state`, `groups`, `invitations`, `onboarding` — so it would absorb 2 of those 4. The two badge reads (`unread-count`, `messages`) **predate the bundle and were never folded in**.
- Therefore adding a path to `BOOT_PATHS` alone takes 6 reads → 5. Only also covering the two badges takes it to **3**.

Whether that materially moves the cold number is **untested**. The parked L3 ([`2026-07-09-cold-load-regression-analysis.md:113`](./2026-07-09-cold-load-regression-analysis.md)) argues it should — "fan-out is precisely what is expensive… session-caching app-boot reads so full boots don't re-fire them" — and marks itself **"un-park candidate at J-F or the area gate."** This is that gate. But the honest state is: the mechanism is plausible and documented, and this pass did not confirm it.

**The cheap decisive experiment**, if it's wanted: measure a deep-cold authenticated navigation to a surface with the *fewest* possible reads. If it also lands near 5.5 s, read count is not the driver and the cost is per-session sandbox provisioning; if it lands materially lower, fan-out reduction is worth building.

## Disposition against the standing exception

Per the A-COM gate's standing rider (Stefan, 2026-07-22): **the cold exception never waives the measurement pass, and warm/semi-warm are the binding signal.**

- **Warm: all PASS**, with wide margin except the fresh-context full load at 937 ms (63 ms under the B3 ceiling) — worth watching, the same ceiling-hugging A-COM flagged on the group page.
- **Semi-warm: all PASS** (379–402 ms).
- **Deep-cold B2: FAIL on both pages**, recorded as a **labelled accepted exception pre-launch**, not a release blocker.

**Reconciled against history (corrected 2026-07-27, after re-reading the prior gates): these numbers are IN BAND and there is no regression.**

An earlier version of this section compared 5.5 s against the 2026-07-10 figure of ≈3.9 s "data complete" and flagged a possible regression. That was the wrong comparator — 3.9 s was a narrower term. The right comparator is **content-ready at gate protocol depth**, and on that basis every deep-cold measurement on record agrees:

| Date | Surface | Content-ready | TTFB |
|---|---|---|---|
| 2026-07-19 J-gate W1 | `/journeys` | 5 939 ms | 2 744 ms |
| 2026-07-19 J-gate W2 | journey detail | 5 226 ms | 2 731 ms |
| 2026-07-21 A-COM W1 | `/messages` | 5 743 ms | 2 723 ms |
| 2026-07-21 A-COM W2 | group forum | 6 553 ms | 2 731 ms |
| 2026-07-21 A-COM W3 | conversation detail | 6 946 ms | 2 728 ms |
| **2026-07-27 (this pass)** | preferences / groups | **5 142 – 5 864 ms** | not broken out |

**A-NTF sits at the fast end of the established band.** The A-COM gate's empty-cache probe already decomposed the chain: **~2.7 s document TTFB (instance provisioning) → ~0.7 s hydration → ~1.3–2 s cold reads → render**. The "~2 s unaccounted" this pass briefly reported is the **TTFB term**, which this harness includes in its wall-clock but does not break out. Nothing is unexplained.

**Consequence for this gate: the new N-D surface introduced no performance problem** — which is the question a gate measurement exists to answer.

## Disposition — closed 2026-07-27

**Stefan, 2026-07-27: "the long loading time is okay for demo."** The deep-cold overshoot is accepted, extending the standing labelled exception first set at the J-gate (2026-07-19) and re-affirmed at the A-COM gate (2026-07-22). **No further investigation is commissioned.** The Vercel Pro scale-to-one purchase remains a parked pre-launch comfort decision, not a gate condition — it is the only lever measured to move the number (it removes both the TTFB floor and the cold-read cost, collapsing the chain to ~1–1.5 s), and a commercial launch leaves the Hobby tier regardless.

**Warm and semi-warm remain fully binding** (the standing rider): they pass here with margin, the one tight number being the 937 ms fresh-context full load against the 1.0 s B3 ceiling.

### Closed with evidence — do not reopen without new data

Consolidated here so this record stands alone. Each of these cost real investigation time and was closed deliberately:

| Closed | When | Why |
|---|---|---|
| **Fan-out reduction** | J-gate R3, 2026-07-19 | Concurrent reads **share one instance's boot** — 4 `/journeys` reads ≈ 1.3 s wall *total*, not 4×; ~150 ms each warm. *"The measured pain lives in provisioning + first-visit assets, not the fan-out."* |
| **Asset optimization** | A-COM gate, 2026-07-21 | 266 KB total, all `x-vercel-cache: HIT`, 18 assets in ~0.1 s parallel, slowest 105 ms. Nothing to win. |
| **Keep-warm pinging** | 2026-07-10 | Retired as a strategy. Multi-ping failed both ways; even a 60-second-old pool did not cover a 4-route boot. The cost sits in the sandbox layer, provisioned per concurrent request. |
| **Edge runtime** | ADR-U036 Amendment 2, 2026-07-10 | Migrated off; boot lottery eliminated. Verified 2026-07-27: 79 route files, zero `export const runtime`. |
| **DB / RLS · region · route code** | 2026-07-09 analysis | Warm slices 48–109 ms; `dub1` pin held; client patterns conformant. |

**The composition, for anyone tempted to re-derive it:** document TTFB ~2.7 s (instance provisioning, ~2.73 s ± 10 ms across every window since 07-19) → hydration ~0.7 s → cold reads ~1.3–2 s → render. Serialized on a cold backend. Source: the A-COM gate's empty-cache probe, [`2026-07-21-communication-area-gate.md`](./2026-07-21-communication-area-gate.md) §Deep-cold.

**Harness:** [`hub/scripts/perf-measure.mjs`](../../../hub/scripts/perf-measure.mjs) — run with no arguments for usage. It leads with the two-phase deep-cold protocol, because signing in immediately before a "cold" navigation reported **368 ms** where the correct protocol reports **5 864 ms** on the same page.

## Method notes (so the next pass doesn't repeat these)

- **Signing in immediately before a "cold" navigation destroys it.** The sign-in warms every function it touches. A first attempt reported `/notifications/preferences` cold at **368 ms**; the corrected two-phase protocol (persist session → idle 22 min → navigate) returned **5 864 ms** on the same page. A **16× error**, in the direction of a false pass.
- **Cold read *counts* in this harness are unreliable** (6 vs 3 captured for the same page) because the listener's capture window closes when the selector appears. The warm waterfall run is deterministic — treat that as the read inventory. Wall-clock numbers are unaffected.
- `ResourceTiming.responseEnd` was unusable here (returned 0); durations are stamped directly from request/response events.
- A fresh FIM has **no groups**, so `/groups` renders `EmptyState` and `data-testid="groups-list"` never appears. The fixture must own groups, or the harness measures the empty state.
- Creating the fixture requires `user_metadata: { display_name, consent_accepted: 'true' }` — signup is consent-gated at the substrate (ADR-U038 S3). Omitting it fails with an opaque *"Database error creating new user"*.
