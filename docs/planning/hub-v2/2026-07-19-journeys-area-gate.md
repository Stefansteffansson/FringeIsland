# The Journeys area gate (J-O3 gate) — 2026-07-19

**Protocol:** the [exit checklist](./phase-3-journeys-completion-plan.md) planted at area open, executed per [ADR-U043](../../architecture/decisions/ADR-U043-performance-budgets.md) + Amendment 1: production stable domain (`fringe-island.vercel.app`), authenticated real path, warm runs ≥ 3 per scenario, deep-cold **one enforced-idle window (≥ 20 min zero traffic) per cold scenario, n=1 per scenario, honestly labelled** (Stefan's depth call, 2026-07-19 — the strict 3× cold reading traded against ~4 h of idle windows), tail rule (no request > 2× scenario budget) applied to the cold runs, Stefan's live walk alongside the warm pass.

**Production state at gate start (verified):** the Hub deployment carries J-F (the response route answers 405/exists, served from `dub1`); the one FringeIsland Supabase project carries the three PD007 migrations (applied at build, log repaired at the gate nod). The area's whole substance — J-A catalogue/enrolment through J-F response capture — is live for this pass.

## Checklist dispositions (the planted exit checklist, walked)

| Item | Disposition |
|---|---|
| Feature DoD + verticals + tests green across the area | **Verified** — J-A..J-F all `6-done` with per-cycle gate nods (PRs #124..#174); at J-F close: journeys integration 162/162, full integration 465/466 (the one failure fenced found-not-caused — dev fixture residue vs the `search_invitable_members` LIMIT 8, routed to cooldown hygiene), Hub unit 718/718, E2E 66/66, `next build` + lint clean |
| Freeze re-verification demonstrated by tests (Groups-plan carry) | **Verified** — the J-D red-first suite pins all four PC013/PC014 cascades → `frozen` enrolments render read-only per JRN-14 (`journey-group-progress-frozen-contracts.test.ts`, green in the J-F sweep); closed-vs-archived last-leader asymmetry disposition recorded at J-D (working-as-intended) |
| IDN-10 enrolment-freeze disposition advanced (G-36 hook #4) | **Advanced** — this area realized and test-pinned the enrolment-freeze half of account exit: leave/removal/closure/archival freeze the member's walks (J-D), frozen walks stay readable to their traveller (Q9 lived-record standing), and erasure via the house paths cascades the lived record including J-F's responses (PD007 STORY-1 proofs). IDN-10 itself stays parked on the DS-5 forum-content disposition — the Communication area un-parks it (standing: parked IDN-10 specs authored by next cooldown at latest) |
| ADR-U045 hooks verified | **Verified** — re-authoring hook planted at first-experience/CQ-010 (carried in every bridge since J-E; the J-F takeaway renderers are its landing surface); JRN-5 carry-over E2E-proven across a real transcendence (`transcendence.spec.ts`, green 2026-07-18); forgetting proven over the ephemerality machinery (J-E STORY-6 + J-F's response-erasure proof); auto-launch honesty deep-cold-verified at J-E (arrived-once honoured, zero standalone arrival calls) |
| MEM-9 untouched | **Confirmed** — Communication-gate item; nothing in A-JRN touched it |
| G-29 reviewed | **Confirmed** — the DS-6 catalogue-ranking seam stays recorded; depth>1 unchanged |
| Boundary bet (J-O3) verified shipped or re-parked | **Closed with evidence** (2026-07-07, [waterfall record](./2026-07-07-journeys-j-a-waterfall.md)): P1-residual measured to the floor, `x-overview-timing` shipped (PR #123), P3b's DB condition not met (stays parked), never silently dropped |
| J-O6 recorded disposition + J-F shipped it | **Verified** — ADR-U046 (2026-07-09) → Cycle J-F built and merged 2026-07-18 (PR #174): responses captured (28/28 contract suite, 23 red-first), review rendering live (takeaways + the returned review entry, E2E-proven), privacy posture exactly as decided (no response key in the group-progress payload in any consent state, regex-pinned; no Steward/Guide/admin read exists; content-free telemetry) |
| ADR-U044 registries non-closing | **Verified at gate** — `step_kinds`/`content_families` extensible by INSERT (J-F's `captures_response` is registry data, not a code list); designation is data (boolean + partial unique index); the sealed TS `StepType` union is gone and no kind-string switch exists anywhere in Hub code (grepped 2026-07-19, zero hits); the `journey_type`/`difficulty_level` CHECK lists remain the *inherited* closure pattern with its recorded deferred disposition (registry-ization at a later FEAT-PD — J-A L4 row), not silent closure |
| Route-policy conformance green over the area's routes | **Verified** — `route-policy-conformance.test.ts` green at every cycle close including J-F (covers all six area cycles' routes incl. the new response route) |

## Rider decisions (Stefan, 2026-07-19)

1. **Journey-detail Mist seam — KEEP the FIM gate, recorded as intended.** A Mist's path is the front door (the auto-launched onboarding walk), not the detail page; a detail page for journeys a Mist cannot enrol in is a fake door (the J-E fake-door-avoidance rationale ratified). Re-examine when Mist-enrollable journeys beyond onboarding exist (Eid+).
2. **Enrolled-catalogue nuance — RATIFIED as intended semantics.** Enrolment grants catalogue visibility: your own walks are always visible to you, public or not (the substrate's visibility disjunction is the rule, not a quirk).
3. **L3 fan-out reduction — decided from this gate's data** (see the measurement section: the `/journeys` fan-out verdict).

## Measurements

### Warm pass (headless measurement FIM, created + erased in-run; 2026-07-19)

| Scenario | Budget | Runs | Verdict |
|---|---|---|---|
| Sign-in click → content (S5 class, **shallow** — active-day, labelled) | B1 target 2.0 s | **1 409 ms** | PASS (shallow class; deep-cold W3 below) |
| `/journeys` first-of-session full load | B2 ≤ 2.5 s | **1 151 ms** | PASS |
| `/journeys` warm repeats | B3 ≤ 1.0 s | **384 / 888 ms** | PASS (888 noted — headroom thin) |
| Card → detail soft-nav | B4 no loading state | **22 ms, 0 new API calls** (header from card seed, catalogue from session cache) | PASS — textbook |
| Detail first-of-session / warm repeats | B2 / B3 | **1 078** / **462 / 399 ms** | PASS |
| Player first-of-session / warm repeats | B2 / B3 | **1 011** / **991 / 395 ms** | PASS (991 noted — headroom thin) |
| **Response save (J-F), blur → confirmed "Saved"** | B5 (background; feedback instant) | **224 ms** round-trip; indicator immediate | PASS — the new surface measured live on production |

Request-count row: `/journeys` fires **4 API reads per full load** (`journeys`, `me/journeys`, `profile/me`, `account/state`) — the R3 fan-out datum; zero duplicate fetches; soft-nav adds zero.

### Deep-cold windows (one per scenario, ≥ 20 min enforced idle, n=1 labelled)

*(pending — windows start when Stefan's live walk ends)*

## Gate verdict

*(pending measurements + live walk)*
