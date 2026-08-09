# RD-B gate — ADR-U043 measurement pass (2026-08-09)

**Status:** IN PROGRESS — deep-cold window open, results below are appended as they land.

**Environment:** production `fringe-island.vercel.app` · same Supabase project · authenticated real path · the standing measurement FIM (`perf-antf@fringeisland.test`, 3 groups) provisioned by `hub/scripts/perf-measure.mjs setup`, **not** platform-admin-elevated for this pass (see Scope below), erased at teardown.

**Protocol:** ADR-U043 + Amendment 1 via `hub/scripts/perf-measure.mjs`. Two phases, as the script's own docstring insists:

1. `signin` — **14:58:27 UTC**. Warms every function it touches; deliberately unmeasured.
2. **≥20 min enforced zero traffic** to the deployment. Held 22 min (matching the A-ADM pass's 22.5).
3. `coldnav` — the first authenticated navigation of the restored session.

> The script records why this matters: getting the phases wrong reported **368 ms where the correct protocol reports 5 864 ms on the same page — a 16× error, in the direction of a false pass.**

**Traffic discipline during the window:** no request of any kind to `fringe-island.vercel.app`. Integration and E2E suites were not run either — they reach Supabase and `localhost:3000` rather than the deployment, but Postgres cache state is a plausible confounder and the window is cheap to keep clean. Local-only work (docs, git) only.

---

## Scope — what this pass does and does not cover

**Why a pass at all.** RD-B added **no request to any first paint**: the available-roles section consumes a read that already rode the roles payload, and the W-6 preview is fetched on ceremony open. So ADR-U043's cycle-level trigger (*"a cycle that adds or reroutes a request on a user-facing first paint"*) is **not** met. This pass runs because the ADR-U043 pass runs at every gate regardless.

**One change is worth watching despite that.** The group detail page gained a **Suspense boundary** wrapping the roles panel, so `?focus=roles` can be read without bailing the whole page out of static rendering (W-1). That is a render-path change on a first-paint surface even though it adds no request, and it is the reason `/groups/<id>` is measured here rather than only the standard pages.

**Not covered: `/admin/roles/<id>`.** The A-ADM pass elevated the measurement FIM to platform admin to reach the admin plane. **Deliberately not done here** — creating a platform admin unattended is not a call to make without Stefan, and the admin surface is not a member-facing first paint. The W-5 picker and W-6 preview both load behind affordances, so neither is on any first-paint path. Recorded as a gap rather than quietly omitted.

---

## Results

### Deep-cold, window 1 — 22 m 20 s idle (14:58:27 → 15:20:47 UTC)

| Page | Measured | B2 ceiling | Verdict |
|---|---|---|---|
| `/notifications/preferences` (first nav of session) | **5 538 ms** box-visible (locator 6 007 ms) | ≤ 2 500 ms | **FAIL — 2.2×**, the standing labelled pre-launch exception |
| `/groups` (second of session, **semi-warm**) | 594 ms | — | not a cold number; recorded for shape |

Diagnostics on the cold nav: **fan-out fires at 4 378 ms**, 7 API reads, slowest 1 549 ms, 80 ms unaccounted. So **79 % of the wall elapses before the first data request is even issued** — provisioning-dominated, matching the A-ADM characterisation.

### The comparison, and a correction I owe

A first reading of 5 538 ms against A-ADM's headline (*"cold is 3.6–4.4 s"*) says RD-B regressed the cold path. **That comparison is wrong and is retracted before it could travel.** A-ADM's 3.6–4.4 s was measured on **admin pages**; this is `/notifications/preferences`. Against the same page:

| Pass | `/notifications/preferences` deep-cold |
|---|---|
| A-NTF, 2026-07-27 (n=1) | 5 864 ms |
| A-NTF, 2026-07-27 (n=2) | 5 142 ms |
| **RD-B, 2026-08-09** | **5 538 ms** |

Today's number sits **between the two prior samples for the same page** — statistically indistinguishable, and no regression. This is exactly the error class the A-NTF pass caught in itself (*"That compared a cold number against a semi-warm one"*), reproduced here in a new shape: comparing a cold number against a **differently-scoped** one. Recorded because the wrong version of this claim would have read as a real regression caused by this cycle, and it is neither.

**One change worth a follow-up, not RD-B's:** the A-NTF pass recorded `/notifications/preferences` firing **6** API reads; today it fires **7**. Nothing in RD-B touches that page. Whatever added the seventh read did so between 2026-07-27 and now, and no pass has noticed. Filed as an observation for the next perf look rather than chased here.

### Deep-cold, window 2 — `/groups/<id>`, the surface RD-B changed

22 m 40 s idle (15:20:47 → 15:43:27 UTC).

| Page | Measured | B2 ceiling | Verdict |
|---|---|---|---|
| `/groups/<id>` to `roles-panel` visible | **2 433 ms** (locator 2 674 ms) | ≤ 2 500 ms | **PASS — 67 ms spare** |

Diagnostics: fan-out at 1 003 ms, **12 API reads**, slowest 1 412 ms, 259 ms unaccounted.

**The page RD-B changed passes B2 cold.** The Suspense boundary added for `?focus=roles` (W-1) does not cost first paint, and the available-roles section adds no request — it consumes a read that already rode the roles payload.

**A caveat that keeps this number honest.** Window 2 followed window 1, so Vercel's CDN had already served this deployment's static bundles. The *functions* were genuinely cold (≥20 min idle, first navigation of the session — what ADR-U043 defines), but the JS was not first-ever-fetch. That is why fan-out fires at 1 003 ms here against 4 378 ms in window 1. The A-NTF and A-ADM passes both used consecutive windows the same way, so this is consistent with precedent rather than a new liberty — but a true never-before-visited number would be higher, and nothing in this pass measures one.

### Warm — B3

| Page | Runs | Ceiling | Verdict |
|---|---|---|---|
| `/groups` soft-nav | 327 / 271 / 248 ms | ≤ 1 000 ms | **PASS**, wide |
| `/notifications/preferences` soft-nav | 283 / 248 / 270 ms | ≤ 1 000 ms | **PASS**, wide |
| `/groups/<id>` **fresh context** (the strict form) | box-visible **521 ms** (locator 572 ms) | ≤ 1 000 ms | **PASS — 479 ms spare** |

The fresh-context breakdown for `/groups/<id>`: doc done @ 223 ms, 12 of 15 JS chunks pre-fan-out and done @ 246 ms, fan-out @ 287 ms, boot gap 41 ms, last read end @ 523 ms, render tail 49 ms. First paint and FCP both @ 248 ms, no long tasks.

**This is the one to note against A-ADM's carried finding.** That pass flagged its two *admin* detail pages crossing the 1.0 s B3 ceiling in 3 of 5 fresh-context runs. The group detail page — a different page, so not a like-for-like rebuttal — sits at **521 ms, roughly half the ceiling**. It says nothing about whether the admin detail pages have improved; those were not measured here (see Scope).

---

## Findings

1. **No RD-B regression.** `/notifications/preferences` cold is indistinguishable from the A-NTF samples for the same page, and the page RD-B actually changed passes both B2 cold and B3 warm with room.
2. **A seventh API read appeared on `/notifications/preferences`** — the A-NTF pass recorded 6. Nothing in RD-B touches that page, so it arrived between 2026-07-27 and now and no pass noticed. Observation for the next perf look.
3. **The perf harness leaks an orphaned personal group** — see below. A dated, single-instance reproduction of `TASK-INT-03`.

## The teardown leak — TASK-INT-03, reproduced under controlled conditions

`teardown` reported *"done"*. Verified against the database rather than trusted:

| Object | After teardown |
|---|---|
| `auth.users` row | **0** — erased |
| the 3 engagement groups (`Perf Alpha/Beta/Gamma`) | **0** — erased |
| **the personal group `Perfwalker`** | **1 — SURVIVES** |

The survivor (`e378c1b5-…`, created 14:58:07 UTC) has **no owning `users` row**, yet still holds **2 memberships and 10 notification rows**.

This is exactly `TASK-INT-03`'s mechanism (*11 150 of 12 687 personal groups orphaned, holding 73 % of `public.notifications`*), caught here as a **single instance with a known id and a 47-minute lifetime** — far easier to reason about than the accumulated population.

It also connects two open threads: orphaned personal groups holding notification rows are precisely what inflates the table that `TASK-E2E-04` and walk finding W-7 suspect of destabilising the emission assertions across both test tiers.

**Deliberately not deleted.** Deleting it would destroy the cleanest reproduction anyone has of this leak, and a destructive write is not a call to make unattended. Left in place, with its id recorded, for whoever picks up `TASK-INT-03`.

---

## Ledger

| Phase | Time (UTC) | Note |
|---|---|---|
| `setup` | 14:5x | measurement FIM + 3 groups provisioned |
| `signin` | 14:58:27 | session persisted; deployment warmed, unmeasured |
| idle window opens | 14:58:27 | zero traffic to the deployment held from here |
