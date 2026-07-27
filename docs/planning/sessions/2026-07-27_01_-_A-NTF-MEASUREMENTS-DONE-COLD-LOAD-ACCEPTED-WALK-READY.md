# Session bridge — A-NTF measurements done, cold load accepted for demo, the walk is ready to run

**Date:** 2026-07-27 (session 01) · **Wave:** Ferd · **Area:** A-NTF (Notifications) — the **area gate**
**Follows:** [`2026-07-26_02_-_A-NTF-GATE-PAPERWORK-CLEARED-U039-U050-ACCEPTED-RETRO-WRITTEN.md`](./2026-07-26_02_-_A-NTF-GATE-PAPERWORK-CLEARED-U039-U050-ACCEPTED-RETRO-WRITTEN.md)

---

## Read this first if you are the walk session

**Stefan is walking the A-NTF area live and wants a sounding board for his findings.** Everything he needs is prepared:

- **The script:** [`../hub-v2/2026-07-26-antf-live-walk-script.md`](../hub-v2/2026-07-26-antf-live-walk-script.md) — 10 scenarios, every account/group/role DB-verified. **Scenario 1 is struck through** (the measurements are done); he starts at Scenario 2 and needs no cold window.
- **Your job:** take findings as they come, help him decide *seam vs defect vs known*, and file what deserves filing. Don't pre-empt the walk — he is the instrument.
- **The known-and-expected list** is in the script's own section of that name. Check it before treating anything as new.
- **Expected and NOT a bug:** the first page after an idle gap takes **~5.5 s**. Formally accepted (below). Everything after it should be ~380 ms.

## One-paragraph state

The two owed ADR-U043 measurements are **done**, and the cold-load question is **closed by decision, not deferred**. `main` at `b021879`, tree clean, no open PRs, discovery synced 0/0. Four PRs this session (#306 measurements, #307 brief, #308 correction, #309 close+delete). **The A-NTF gate now needs exactly one thing: Stefan's live walk**, then the verdict written into the retro's open gate section, the queued task sweep, and A-ADM opens.

## What happened

### The measurements (PR #306)

Production, authenticated real path, headless FIM created and erased in-run, four separate ≥20-min enforced-idle windows. Full record: [`../hub-v2/2026-07-27-antf-gate-measurements.md`](../hub-v2/2026-07-27-antf-gate-measurements.md).

| Scenario | Result | Budget | Verdict |
|---|---|---|---|
| B2 cold `/notifications/preferences` | 5 864 / 5 142 ms | ≤ 2 500 | FAIL ~2× |
| B2 cold `/groups` | 5 617 ms | ≤ 2 500 | FAIL ~2.25× |
| B1 sign-in → content (deep-cold) | 2 377 ms | ≤ 2 500 | PASS |
| Semi-warm, both pages | 379–402 ms | — | PASS |
| B3 warm soft-nav ×3 | 272–399 ms | ≤ 1 000 | PASS, wide |
| B3 warm full load, fresh context | 937 ms | ≤ 1 000 | PASS, 63 ms spare |

**Warm/semi-warm are the binding signal per the standing rider and all pass.** The one tight number is 937 ms against the 1.0 s B3 ceiling — same ceiling-hugging class A-COM flagged on the group page, and a live item **not** covered by the cold exception.

### The cold load — closed 2026-07-27

**Stefan: "the long loading time is okay for demo."** The deep-cold overshoot extends the standing labelled exception (J-gate 07-19, A-COM 07-22). **No investigation is commissioned.** Vercel Pro scale-to-one stays a parked pre-launch comfort decision, not a gate condition.

The composition was already established and is now consolidated in the measurement record: **document TTFB ~2.7 s (provisioning) → hydration ~0.7 s → cold reads ~1.3–2 s → render**, serialized on a cold backend. The measured numbers sit at the *fast end* of a band running 5.2–6.9 s across the J-gate and A-COM gate. **No regression.**

### Two corrections I made, both worth knowing

1. **Mid-measurement:** I concluded the preferences page was slow because it misses `OverviewBoot`'s `BOOT_PATHS` gate — built on comparing a **cold** number (5 864 ms) against a **semi-warm** one (379 ms). The control run put `/groups` cold at 5 617 ms and killed it. *In this system a page's position in the session dominates which page it is. Always compare cold-to-cold.*
2. **The whole brief (PR #307 → corrected #308 → deleted #309).** I wrote an investigation brief for a Fable session that **substantially reinvented settled work** — it claimed "~2.0 s unaccounted" (it is the known 2.7 s TTFB), implied a regression (there is none), and proposed an experiment the **J-gate had already closed with evidence** (R3: concurrent reads share one instance's boot). **Stefan caught it by asking whether the Hobby→Pro assessment had been taken into account. It had not.** I had under-read `2026-07-19-journeys-area-gate.md` and `2026-07-21-communication-area-gate.md`.

**The durable lesson, now encoded in the measurement record's "closed with evidence — do not reopen" table:** five prior investigations (fan-out reduction, asset optimization, keep-warm pinging, Edge runtime, DB/region/route-code) each cost real time and were closed deliberately. **Read the gate documents before proposing performance work.**

### Artifacts

- **Deleted:** the Fable investigation brief — no investigation is happening, so it had no purpose. Its durable content was folded into the measurement record first.
- **Kept:** [`hub/scripts/perf-measure.mjs`](../../../hub/scripts/perf-measure.mjs) — the first committed measurement harness; every prior gate re-improvised. **A-ADM's gate is next and should use it.** Run with no args for usage; it leads with the two-phase deep-cold protocol.
- **Kept:** the gate measurement record — an owed A-NTF deliverable, linked from the retro and the walk script.
- `.gitignore` now covers the harness's local output.

## Where the next session starts

**Stefan's live walk — the last blocking A-NTF gate item.** Then, in order:

1. **Triage the walk findings.** A-COM's precedent: every walk finding was a **seam between units of work**, not a defect inside one. Expect the same shape; "it worked but felt confusing" is a real finding.
2. **Write the verdict** into the retro's open gate section ([`../retrospectives/retro-2026-07-26-notifications-area.md`](../retrospectives/retro-2026-07-26-notifications-area.md), §"Gate — to be completed") and create the gate document, following the A-COM/A-JRN pattern.
3. **The queued ephemeral task sweep** — `TASK-NC-01..04`, `TASK-NC-06`, `TASK-ND-01..05` are ready to delete; **`TASK-NC-05` must survive** (it carried the owed `/groups` measurement — now done, so re-check whether it can finally close). Deletion is a carve-out.
4. Smaller, still open: **NB-8** Mist-posture proof · **W12** per-RPC verification · **U049 §8 Q1** adapter ownership · the **email-deferral** recording · the **DS-5 spec advance** · the 937 ms warm ceiling-hugger.

**Then A-ADM (Platform-Ops)** — the sixth and last Phase-3 area, whose area-open design session is where [`TASK-OBS-01`](../backlog/tasks/TASK-OBS-01-telemetry-sink-and-analytics-posture.md) lands.

## Close ritual

- [x] `npm run dashboard` — refreshed (7 tabs, 731 files)
- [x] Session bridge (this file)
- [x] Discovery sweep — synced **0/0**
- [x] All PRs merged, branches deleted, `main` at `b021879`, tree clean, **no open PRs**
- [ ] **`doc-health-check` NOT run.** A file was created and deleted this session, which is a named trigger. A **targeted** check was done instead — no surviving references to the deleted brief, and every link out of the touched documents verified. **The full skill is owed at the next cycle boundary** (carried from the previous bridge, which owes it for the same reason).
