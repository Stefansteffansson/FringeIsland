# Cold load — A-NTF confirmation pass, and what is actually still open

**Written:** 2026-07-27 · **Supersedes** the first version of this file (see §0)
**Short version:** the ~5.5 s deep-cold first page is a **known, measured, composition-explained, already-dispositioned** property of the Hobby-tier deployment. The A-NTF measurements reconfirm it on two new surfaces. **There is no engineering investigation outstanding.** What remains is the commercial decision Stefan has parked since 2026-07-10.

---

## 0. Correction — what the first version of this brief got wrong

The first version framed this as an open investigation with "~2.0 s unaccounted for" and a possible regression since 2026-07-10. **That was wrong, and it was wrong because I under-read the prior art.** Stefan caught it by asking whether the Hobby→Pro assessment had been taken into account. It had not.

Three specific errors, corrected below:

| First version claimed | Reality |
|---|---|
| "~2.0 s unaccounted for" | Fully accounted since 2026-07-21: **~2.7 s document TTFB (instance provisioning)** — a term my harness includes but never broke out. The A-COM gate probe-corrected the whole chain. |
| "possibly a regression vs the 07-10 baseline of 3.9 s" | **Not a regression.** The J-gate (07-19) and A-COM gate (07-21) measured **5.2–6.9 s** content-ready at the same protocol depth. My 5.1–5.9 s sits *inside* that band. The 3.9 s figure was a narrower "data complete" term, not content-ready. |
| Proposed "Experiment 3 — does fan-out width matter?" | **Already answered and closed with evidence on 2026-07-19** (J-gate R3). Running it would re-derive a closed finding. |

---

## 1. The settled picture

### The composition, probe-corrected (A-COM gate, 2026-07-21)

Deep-cold is **a serialization problem on a cold backend**, not asset weight and not app code:

```
document TTFB ~2.7 s (instance provisioning)
  → JS parse + hydration ~0.7 s (CPU)
    → authenticated API reads fire ONLY after hydration, ~1.3–2 s on the cold function path
      → render
= ~5–7 s content-ready
```

The empty-cache probe settled the asset question directly: full payload **266 KB** (11 JS chunks = 204 KB), **all served `x-vercel-cache: HIT`**, slowest single asset **105 ms**, all 18 in parallel in ~0.1 s. **Asset optimization has nothing to win.**

### Every deep-cold content-ready measurement on record

| Date | Gate | Surface | Content-ready | TTFB |
|---|---|---|---|---|
| 2026-07-19 | J-gate W1 | `/journeys` | 5 939 ms | 2 744 ms |
| 2026-07-19 | J-gate W2 | journey detail | 5 226 ms | 2 731 ms |
| 2026-07-21 | A-COM W1 | `/messages` | 5 743 ms | 2 723 ms |
| 2026-07-21 | A-COM W2 | group forum | 6 553 ms | 2 731 ms |
| 2026-07-21 | A-COM W3 | conversation detail | 6 946 ms | 2 728 ms |
| **2026-07-27** | **A-NTF** | **`/notifications/preferences`** | **5 864 / 5 142 ms** | not broken out |
| **2026-07-27** | **A-NTF** | **`/groups`** | **5 617 ms** | not broken out |

**The A-NTF numbers are unremarkable within this band** — at the *fast* end of it, in fact. The TTFB floor has been ~2.73 s ± 10 ms across every window since 07-19, which is a vendor provisioning constant, not something the app influences.

### The disposition, already made

**Stefan, 2026-07-22** (A-COM gate verdict): the deep-cold overshoots are **an accepted labelled exception**, on the explicit understanding that

- the cause is the scale-to-zero cold chain — *not app code, not asset weight*;
- **it largely resolves at launch anyway**: a commercial launch leaves the Hobby tier regardless (Vercel paid tier **or any other provider**), and real traffic keeps instances warm during active hours;
- a warm-minimum instance mops up any residue if wanted;
- **the scale-to-one purchase stays a parked pre-launch comfort decision, not a gate condition.**

**Standing rider:** the exception never waives the measurement pass. Warm and semi-warm remain fully binding — *"the semi-warm loading times really matter regardless of our current long cold loading times."*

---

## 2. What the A-NTF pass actually adds

Modest, and that is the correct result:

1. **The two new A-NTF surfaces conform to the known floor.** N-D's brand-new preferences page introduced no new performance problem — it lands at the fast end of the established band. That is the question a gate measurement exists to answer, and the answer is clean.
2. **Warm and semi-warm — the binding signal — pass with wide margin.** 272–402 ms across both pages; the only tight number is a fresh-context full load at **937 ms** against the 1.0 s B3 ceiling (63 ms spare), which is the same ceiling-hugging A-COM already flagged on the group page.
3. **B1 sign-in → content, deep-cold: 2 377 ms — PASS.** Consistent with the J-gate's W3 (1 471 ms) and its explanation: the login-page paint before the click absorbs the provisioning cost, exactly as it does for a real first visitor.
4. **A reusable harness** (`hub/scripts/perf-measure.mjs`) — previously each gate re-improvised its measurement.

**One observation worth keeping**, though it follows from the known composition rather than contradicting it: a **returning member with a live session is slower than a fresh sign-in** (~5.5 s vs 2 377 ms), because the sign-in flow's login-page paint absorbs provisioning while a restored session hits an authenticated page with everything cold. The J-gate documented the mechanism; nobody had stated the consequence in those terms.

---

## 3. Do NOT re-investigate these

Each was closed **with evidence**, and the repo's discipline is that closed things stay closed unless new data reopens them.

| Closed | When | Why |
|---|---|---|
| **Fan-out reduction (R3)** | J-gate, 2026-07-19 | The concurrent reads **share one instance's boot** — 4 `/journeys` reads cost ~1.3 s *wall total*, not 4×, and ~150 ms each warm. Collapsing them "would move neither number meaningfully. The measured pain lives in provisioning and first-visit assets, not the fan-out." **Closed with evidence, never silently.** |
| **Asset optimization** | A-COM gate, 2026-07-21 | 266 KB, all edge-cached HITs, 18 assets in ~0.1 s parallel. Nothing to win. |
| **Keep-warm pinging** | 2026-07-10 | Single-ping holds one instance; multi-ping tested and **failed both ways** — even a 60-second-old pool did not cover a 4-route boot. The cost sits in the sandbox layer, provisioned per concurrent request. **No pinger at sane cadence can pin it.** |
| **Edge runtime** | ADR-U036 Amendment 2 | Migrated off 2026-07-10; boot lottery eliminated. Verified 2026-07-27: 79 route files, zero `export const runtime` declarations. Holds. |
| **DB / RLS, region, route code** | 2026-07-09 analysis | Warm slices 48–109 ms; `dub1` pin held; client patterns conformant. |

> ⚠️ **§6 of the first version of this brief argued the app-shell fan-out on `/notifications/preferences` (6 reads, 4 of them shell) was worth reducing.** Read against J-gate R3, that argument is **already refuted for the cold case** — concurrent reads share the boot. It may still be worth something for *warm* full loads (the 937 ms ceiling-hugger), but that is a B3 question at ~60 ms of headroom, not a cold-load question. Do not confuse the two.

---

## 4. What is actually still open

**One decision, and it is commercial, not technical.**

**Vercel Pro scale-to-one** — parked with Stefan since 2026-07-10, "now carrying two gates' worth of data" (A-COM retro); this pass makes it three. What it buys, per the probe-corrected composition: it removes **both** the ~2.7 s TTFB floor **and** the cold-read cost, *"collapsing the chain to ~1–1.5 s."* That is the only lever measured to move the number.

The framing Stefan already set, which still holds:

- A commercial launch leaves Hobby anyway — so this is about **buying comfort earlier**, not about launch readiness.
- Real traffic keeps instances warm in active hours, so the fix partly arrives free with users.
- It is **not a gate condition** and no gate is blocked on it.

**The genuine question is therefore: is a ~5.5 s first-page wait acceptable for pre-launch demos, testing sessions, and your own daily use — for the months until launch?** That is a judgement about experience and money, and it is Stefan's alone. There is no measurement left that would change the answer.

**Two small live items** (neither cold-related, both already owned elsewhere):

- The **937 ms fresh-context warm full load** vs the 1.0 s B3 ceiling — 63 ms of headroom, same class as A-COM's group-page ceiling-hugging, which was already routed to A-NTF/cooldown as a live item explicitly *not* covered by the cold exception.
- The group page's **12–14 read fan-out** at deep-cold (A-COM's datum) remains the largest on the platform — noted there as a seam, not a failure.

---

## 5. If a session is still wanted

There is no investigation to run. If someone wants to spend a session here productively, the honest options are:

1. **Decision support for scale-to-one** — pricing, what Vercel's warm-instance guarantees actually are in 2026, whether a non-Vercel host changes the arithmetic. That is research, not measurement.
2. **Break out TTFB in the harness** so future gate passes report the composition automatically instead of re-deriving it by hand each time. Small, genuinely useful, no idle window needed to write it.
3. **Nothing.** Defensible. The picture is settled and the disposition is made.

**Do not** commission a session to "find where the 5.5 seconds go." That is answered: ~2.7 s provisioning + ~0.7 s hydration + ~1.3–2 s cold reads, serialized.

---

## 6. Reproduction

Harness at **`hub/scripts/perf-measure.mjs`** — `node scripts/perf-measure.mjs` for usage. Requires `hub/.env.local`.

```
node scripts/perf-measure.mjs setup      # provision FIM + 3 groups
node scripts/perf-measure.mjs signin     # persist session (warms; unmeasured)
#   >>> wait >= 20 min with ZERO traffic <<<
node scripts/perf-measure.mjs coldnav
node scripts/perf-measure.mjs warm
node scripts/perf-measure.mjs teardown   # ALWAYS
```

**Known gap:** the harness reports wall-clock to a data-derived selector but **does not break out document TTFB**, which is why the first version of this brief mistook the ~2.7 s provisioning term for "unaccounted" time. Anyone extending it should add TTFB capture first — see §5 item 2.

Other traps, all guarded in the script: signing in immediately before a "cold" navigation destroys it (**368 ms vs 5 864 ms on the same page — a 16× error toward a false pass**); production shares the dev Supabase project; a fresh FIM has no groups so `/groups` renders `EmptyState`; fixture creation needs `consent_accepted: 'true'` (ADR-U038 S3); cold read *counts* are capture-window-dependent (use `waterfall`); `ResourceTiming.responseEnd` returns 0 here.

---

## 7. Prior art — read in this order

| Document | Why |
|---|---|
| [`2026-07-21-communication-area-gate.md`](./2026-07-21-communication-area-gate.md) **§Deep-cold + verdict** | **The most important single source.** The probe-corrected composition (line 49) and Stefan's disposition (line 59). |
| [`2026-07-19-journeys-area-gate.md`](./2026-07-19-journeys-area-gate.md) | The deep-cold reading, and **R3 closing fan-out reduction with evidence**. |
| [`2026-07-09-cold-load-regression-analysis.md`](./2026-07-09-cold-load-regression-analysis.md) | Root causes RC-A..RC-E, the failed pinger experiments, the edge→Node migration. |
| [`2026-07-27-antf-gate-measurements.md`](./2026-07-27-antf-gate-measurements.md) | The A-NTF raw record. |
| [ADR-U043](../../architecture/decisions/ADR-U043-performance-budgets.md) · [ADR-U036](../../architecture/decisions/ADR-U036-edge-runtime-hot-read-routes.md) · [ADR-U042](../../architecture/decisions/ADR-U042-first-paint-bootstrap-read-bff-bundle.md) · [ADR-U035](../../architecture/decisions/ADR-U035-compute-datastore-colocation.md) | Budgets; the Edge reversal; the bootstrap bundle; colocation. |
