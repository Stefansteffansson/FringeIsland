# Session bridge — the A-ADM gate CLOSED on all four legs; the live walk ran in full; Phase 3's build scope is done (except the two re-scoped additions)

**Date:** 2026-08-02 → 2026-08-03 (one continuous session) · **Wave:** Ferd · **Area:** A-ADM — **GATE CLOSED 2026-08-03**
**Follows:** [`2026-08-02_01_-_ADM-D-BUILT-AREA-GATE-OPENED-AND-MEASURED.md`](./2026-08-02_01_-_ADM-D-BUILT-AREA-GATE-OPENED-AND-MEASURED.md)

---

## READ THIS FIRST — the next session opens the ADM-7 + ADM-17 decomposition board

The gate is CLOSED ([gate record](../hub-v2/2026-08-02-platform-ops-area-gate.md) §Gate verdict), the [area retro](../retrospectives/retro-2026-08-03-platform-ops-area.md) is written (ADM-C + ADM-D folded), doc-health ran (two criticals found and FIXED same-session), the task sweep deleted 16 `done` files. The next work, in order:

1. **The ADM-7 + ADM-17 decomposition board** (one board covering both — Stefan's re-scope, 2026-08-02). It must absorb: **Stefan's fix directive** ("all these stalled and/or cached issues need to be fixed" — walk findings W-5/W-7/W-8/W-9/W-10, see [findings](../hub-v2/2026-08-02-admin-live-walk-findings.md)), the **W-3 suspended-refusal-matrix decision** (what does a suspended group refuse, for whom — the enforcement home is the member-facing walls, never the admin contract), and the **ADM-17 design skeleton** recorded in the gate record (atoms code-owned / templates clone-don't-edit / versioned / diff-preview / lockout guards / diff-audit / the propagation question with snapshot-now default).
2. The member-side fixes that don't belong to the admin plane (W-7 revalidation, W-8 typed-refusal surfacing, W-9 cache scoping, W-10 wall exit) — place at the board; likely one small Hub hygiene cycle.
3. **AB-6 FULL anatomy audit** after the re-scoped builds — the Phase-4 cutover's entry condition; carries the ADR-U052 absorption + notes ADR-U043 Amendment 2 (doc-health re-find, second boundary).

## One-paragraph state

The gate-close session ran all four legs in Stefan's order and closed the gate. **Leg 1:** the commissioned warm investigation (#382) refuted "bundle + hydration" by waterfall and attributed the B3 crossings to the harness's own completion waiter (`locator.waitFor(visible)` adds a bimodal ~300–470 ms lag past paint; genuine completion med 466 / max 733 ms, zero over ceiling, 78 runs, three-signal triangulation) → carried finding CLOSED harness-attributed; **ADR-U043 Amendment 2 (dual signal — verdicts read box-visible) ADOPTED** and merged on the named nod (#384); `measureNav` + new `breakdown` command implement it; `perf-adm-fixture.mjs` makes admin measurement reproducible. **Leg 2:** the deferred five CALLED — 13 (G-29-activated) / 14 (dated trigger) / 15 (Phase-4) as proposed; **ADM-7 and ADM-17 re-scoped INTO Ferd** (build-scope sentence now "complete except two named in-wave additions"). **Leg 3:** both process questions ADOPTED (migrations changing surface-reachable behavior pull affected E2E into post-apply verification; mutations/admin-plane durable telemetry, reads mirror-only until a named consumer). **Leg 4:** Stefan walked all eight surfaces live with real-time DB verification behind every ceremony — **twelve findings (W-1..W-12)**, none blocking, and the walk *cleaned* production: admin roster 7 → 2 (four leaked fixture elevations + one live-mis-granted doppelganger revoked through the real ceremony), nine relic reports resolved, Ada/Gracy restored. Then the tail: retro, doc-health (criticals fixed: the phase-3 plan still routed ADM-7/17 to Eid in five places — the board would have read stale scope; three short link depths), task sweep, dashboard, this bridge.

## Watch-items (hard-won this session, new)

1. **The stopwatch was the defect** — three gates' "ceiling-hugging" numbers carried the locator waiter's bimodal lag. Amendment 2 binds verdicts to the box signal; when a number surprises, suspect the harness before the page. (Also in auto-memory.)
2. **Any client cache keyed by nothing is keyed by the wrong thing** — `hub.adminEntry` in sessionStorage leaked the admin menu across sign-in boundaries in BOTH directions (photographed). Rule: user-scope + clear on auth change.
3. **A list without a bound is a latent stall** — 1 900 rendered rows made field-focus a ~10 s system-affecting freeze on real Windows (clean renderer ~50 ms; OS-side accessibility/input consumers amplify). DOM size proven the variable by differential.
4. **The elevation-leak class survived its own fix** — TASK-INT-05 killed the group variant; the walk found four leaked DeusEx *memberships* (suites 2026-07-06..08-01). Consider a "no fixture holds admin at rest" conformance check.
5. **"The existing paths pick the state up" is a claim to prove, not assume** — suspension was status-write-only by design and the member-facing paths were status-blind (forum write through the wall at +84 s, DB-timestamped). Refusal matrices get written before states ship.
6. **The shared dev/prod project is ~90 % fixture data** (2 015 users / 3 612 groups; domain tally proves it) — the dashboard tiles reconcile to the digit anyway (contract definitions verified). Pre-launch data hygiene is a named plan item.
7. **MSYS/silent-pipeline traps paid twice more** (grep-filtered thrown runs; cwd drift on `git add`). Run the control; print `RC=`.
8. **Stefan's account carries a walk-set temporary password** — he was reminded to change it in account settings. His account is now a real platform admin (granted through the ceremony, on record).

## Decisions made this session

1. Leg-1 verdict + Amendment 2 adoption (named nod "merge 384") · 2. The five deferred-row calls incl. the two Ferd re-scopes · 3. Both process-question adoptions · 4. **The fix directive** (stall/cache family = committed work) · 5. Walk-support: temp password on Stefan's own account (his ask); fixture password reuse for Gracy · 6. W-11/W-12 (outcome-only reporter feedback confirmed-as-designed; lifetime report-uniqueness) → Eid moderation pile unless Stefan re-scopes.

## PR ledger

#382 warm investigation + harness `breakdown` + admin fixture · #383 gate-close decisions + walk script + `measureNav` dual-signal · #384 ADR-U043 Amendment 2 (**held → named nod → merged**) · #385 walk findings + fix directive · close PR (this bridge + retro + doc-health fixes + task sweep) — all fuller-auto except #384.

## Verification at close

Gate record CLOSED on disk · walk findings W-1..W-12 recorded with directive · retro written (ADM-C/D folded; doc-health summary pasted) · doc-health: 11/11 sections, 2 criticals FIXED same-session, 3 soft flags FIXED, 1 re-find carried by AB-6 · 16 task files swept · perf fixture 0/0/0 (verified before the walk) · admin roster = root + Stefan (DB-verified) · open reports 3 (all relics, deliberate) · production left cleaner than found.

## Close ritual

- [x] Session bridge (this file)
- [x] `npm run dashboard` — refreshed at close
- [x] doc-health-check — **RUN (the owed cycle-boundary audit)**; criticals fixed in the close PR
- [x] Area retro (ADM-C + ADM-D folded in, per the standing decision)
- [x] Task sweep
- [ ] Discovery sweep — run after the close PR merges (last step)
