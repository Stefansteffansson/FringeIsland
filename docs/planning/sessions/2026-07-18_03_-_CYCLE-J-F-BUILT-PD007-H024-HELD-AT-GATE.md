# Session bridge — 2026-07-18_03 — Cycle J-F built: FEAT-PD007 + FEAT-H024, held at the schema gate

**Session class:** build session (`feature-development`) for **Cycle J-F — Step-response capture & review substance**, platform-half-first per the `_02` bridge. Hub v2 Phase 3 state after this session: Journeys J-A..J-E `6-done`; **J-F built end-to-end and held at the schema gate** (PR pending the explicitly-NAMED nod); the J-O3 area gate is next after the merge.

## What happened

1. **FEAT-PD007 built red-first.** The 28-test contract suite (`journey-step-response-capture-contracts.test.ts`) was authored against the PD006 substrate and run: **23 red / 5 passed**, the passes audited — 4 PIN-class invariants green by design. **One green-at-red anomaly caught and fixed in-session** (the J-B rule working): the `journey.takeaway` assertion used a bare `not.toBeNull()`, which `undefined` (key absent pre-migration) satisfies; tightened to `toHaveProperty` + non-null and re-demonstrated red before any implementation. Three migrations authored and **applied to dev** (`20260718090000` response substrate, `..0100` `save_step_response`, `..0200` player-read re-issue + walks export); post-apply the suite went **28/28 green first run**. The `migration repair --status applied` bookkeeping was classifier-blocked in the autonomous session — the three repair commands ride the PR body as pending (the schema is applied; only the migration log lags).
2. **Sibling adaptations, labelled (the J-B budget):** the PD004/PD005 exact-key-set pins gained the four additive PD007 keys (`journey.takeaway`, `steps[].captures_response`, `instances[].response`/`response_updated_at`) — 3 tests across 2 suites, each adaptation labelled at the assertion. Adapted suites 50/50; **journeys slice 162/162**.
3. **FEAT-H024 built red-first.** 12 Hub unit tests demonstrated red (StepResponseInput missing; canvas placement + takeaway positives; panel takeaway + review entry; the `saveStepResponse` transport with J-D cache write-through), then green: `StepResponseInput` (ask_verb label, background save on blur + unmount flush = save-on-navigation, retry-keeps-words, frozen pen-down), canvas placement by `captures_response` alone (an unknown kind declaring capture gets the input with zero Hub changes — pinned), per-step takeaway once completed, the completion panel's journey takeaway + the **returned review entry** (the J-C summary-not-menu posture retired; the H021 pins adapted, labelled), the response BFF route (content-free telemetry; 22001/22023 → 422), and the export route's additive `journeys` key (**the FEAT-H010 flag discharged**; H010 spec amended). **Full unit sweep 718/718; lint clean; `next build` clean.**
4. **The E2E arc** (`player-response-capture-review.spec.ts`): capture → complete → per-step takeaway arrives after passage → completion panel with journey takeaway + review entry → revise in review → full-reload server truth → the download carries the words; plus the Mist onboarding capture. **2/2 standalone.** One finding kept in H024's notes: a completed walk no longer resolves from a param-less `/play` (active-walks-only door) — review re-entry carries `?enrollment=`, the H021 affordance shape.
5. **Full-sweep findings (first run 62/66, all four diagnosed; re-run after fixes green — see PR):**
   - *Labelled adaptation:* `player-completion-review.spec.ts` still pinned the retired "no review-entry" posture (`toHaveCount(0)` — "no fake doors"); adapted to pin the entry's existence (the click path is covered by the H024 arc + page unit), the walk untouched.
   - *Selector hardening:* the onboarding spec's `getByRole('button', {name:'Next'})` strict-mode-collides with the Next.js dev-tools overlay button ("Open **Next**.js Dev Tools" — role name matching is substring); hardened to `getByTestId('player-next')`.
   - *Ordering hazard, pre-existing in shape, first bitten by J-F:* `profile.spec.ts`'s sign-out test **globally revokes the shared session FIM's server-side session**; reads keep passing afterwards (local JWT verification, ADR-U037) but `getUser()`-verified **mutations 401**. The new spec was the first mutation-bearing spec to sort after `profile` — renamed into the player cluster (`player-response-capture-review.spec.ts`, filename load-bearing, documented in its header). The underlying constraint — no shared-session mutations after `profile` in sweep order — is now written down; a structural fix (fresh-identity spec, or `scope:'local'` sign-out per the H012 targeted-revocation design) is a candidate J-O3 rider.
   - *Flake, fenced:* `profile.spec` STORY-4's post-sign-out `/groups`-gates-to-`/login` assertion missed its 5 s window once in the long-running sweep; green in isolation and on the re-run — not a J-F behaviour.
6. **Build-time defaults added to the gate board** (recorded in PD007's Implementation notes): JF-5 value = `char_length(body) <= 100000` (the PD001 journal precedent) refused 22001 + a 256 KiB payload backstop; malformed payloads (no object / no `body` key / non-string body) refuse 22023 and never clear; no `captures_response` gate on the verb (placement data, not a write guard); no via-group permission key (responding = own words, ungated beyond standing like enter); explicit-empty with no prior instance creates the open instance (one targeting path); the verb touches `last_accessed_at` (sibling-verb consistency).

## Plain-English walkthrough (what did we build, as a traveller would tell it)

I open a step that asks me to reflect, and under the prompt there's a place to actually write. I type; when I move on, it quietly says "Saved" — if the save hiccups, my words stay right there with a Retry. Nothing ever makes me write: I can walk the whole journey silent and it behaves exactly as before. When I finish a step that asks, the author's closing word appears — after I've passed, never before. When I finish the journey, the completion panel now carries the journey's own closing word and offers "Look back over your journey"; following it, I find my words where I wrote them, still mine to revise — or to erase entirely (the record keeps that I passed, not what I said). If my walk freezes, my words are still there to read but the pen is down. Nobody else — Steward, Guide, group member, admin — can read a word of it; the group progress panel still shows only completion marks. And if I download my data, my walks and words come with it — that section existed before the first word was ever stored.

Continuity questions asked against the shipped behaviour: a Mist's words carry across transcendence to the same personal group (proven over `finalise_transcendence`); erasure forgets them with the enrolment (proven over `explicit_erase_mist`); a withdrawn walk's words survive as lived history and export under right-of-access; re-enrolment after withdrawal reactivates the same rows, words included.

## Open items / next session

1. **The schema gate (blocking):** PR held for the explicitly-NAMED nod — the board is JF-1..JF-6 + the five build-time defaults above + the ADR-U038 direct-caller answers per touch (all in PD007's spec + the PR body). On the nod: merge, run the three pending `migration repair --status applied 202607180900{00,100,200}` commands, then flip both specs `6-done` + L4 rows same-commit (the gate-close ritual, J-E precedent).
2. **Then the J-O3 area gate** — riders standing per the `_02` bridge (journey-detail Mist seam, enrolled-catalogue nuance, explicit `/journeys` gate waterfall, Stefan's live walk + formal budget/tail pass, L3 fan-out reduction). The gate verifies J-F shipped ADR-U046.
3. **doc-health full run at the J-F cycle close** (Section 11 anatomy freshness fires live for the first time).
4. **CQ-010 real onboarding content** (carried — the takeaway renderers now exist as its landing surface).
5. **Parked with Stefan (unchanged):** Vercel Pro scale-to-one · logo pick · launch checklist · dashboard toggles.

## Sweep evidence (this session)

- PD007 contract suite: 23 red → 28/28 green; journeys integration slice **162/162**.
- Hub units: 12 red → journeys units 114/114; **full unit sweep 718/718**; route-policy conformance green over the new route; lint clean; `next build` clean.
- E2E: the J-F arc + Mist capture 2/2 standalone; **full E2E sweep 66/66** (after the `_03` §5 fixes).
- **Full integration sweep 465/466** — the one failure fenced **"found (not caused)"** by name: `membership-lifecycle.test.ts › search_invitable_members reflects the paused row` (PC013/G-D, groups — J-F touches nothing in its path). Verified at the data layer, which is stronger than a main-HEAD re-run here: `search_invitable_members` returns `LIMIT 8`, and the shared dev DB holds **17 residue `GDTarget` fixture users** (oldest 2026-07-04 — crashed runs skip their own teardown), so the current run's target falls outside the window regardless of code HEAD; reproduces in isolation on this branch for the same reason. **Routed to its own diagnosis:** purge the pre-J-F fixture residue on dev + make the groups-suite fixture names run-unique (the journeys suites already are) — a cooldown/J-O3 hygiene item, not a J-F defect.

## Doc health

```
Doc Health Check — 2026-07-18 — J-F cycle close (full run; Section 11 first live run)

Sections run:
1.   Terminology drift            — skipped: no renames since the last full run (this morning's
                                     J-E-boundary session); no term decisions in the J-F sessions
1.5  Architectural drift           — skipped: no concepts retired this cycle; table unchanged
1.6  Unfiled deviation markers     — clean: zero markers in any J-F file (route, components,
                                     3 migrations); the 4 legacy hits are filed ADR-U045/U038
                                     disposition tags or the phrase "one-directional" (false positive)
2.   Schema drift                  — 3 migrations checked; specs + L4 rows current; 1 finding:
                                     DOMAIN_ENTITIES.md carries NO step substrate (pre-J-F gap,
                                     five cycles behind) -> backlog TASK-DOC-003
3.   Path + README sync            — clean: hub features README 24 rows = 24 files; domain 7 = 7;
                                     all links added this cycle resolve
3.5  Archived-tree leak            — clean for the cycle: 0 old_*/ refs in the J-F diff
                                     (392 standing hits = the previously classified historical set)
3.6  Deleted-file refs             — clean: only the known historical/provenance notes
                                     (ADR-U025, extraction headers, FOLDER_STRUCTURE snapshot);
                                     nothing deleted this cycle; table unchanged
3.7  Snapshot drift (inventories)  — clean: only the known banner'd hub-l3-input.md; the new
                                     bridges restate no inventory tables
4.   Parked items                  — 2 reviewed (FEAT-H007 + FEAT-PC005, the IDN-12 pair);
                                     both carry parked_reason; reason unchanged and still valid
5.   Maturity consistency          — 38 specs swept (hub 24, core 7, domain 7); all maturity
                                     values canonical; PD007+H024 6-done with filled notes;
                                     1 critical: FEAT-PC002 is 6-done with NO Implementation
                                     notes (shipped 2026-06-27; first full-sweep catch)
                                     -> backlog TASK-DOC-004
6.   Entity coverage               — skipped: no entity changed status this cycle
7.   Expected placeholders         — registry reviewed: no entries authored, none introduced;
                                     all still pending as registered
8.   Feature-inventory summary     — hub + platform/domain checked: all rows match disk maturity
                                     (H007's cell reads "4-ready (parked)" — honest, not drift);
                                     platform/core pending (registry: core SPECIFICATION.md)
9.   CLAUDE.md cascade consistency — presence clean (hub, gimbal, core, domain, design-system +
                                     the seven service entity files); no cascade changes this cycle;
                                     content/load-order checks deferred to next structural change
10.  Graduation-tracker completeness — skipped: no cores ratified, no discovery-sourced ADRs added
11.  Anatomy freshness (FIRST LIVE RUN) — CLEAN: stamp ADR-U046 = newest ADR on disk (J-F added
                                     no ADR); zero retired-vocab hits in the living pair (the one
                                     "Shadow" is the correct menace-sense disambiguation); V1.md
                                     banner + V4/V5 SUPERSEDED watermarks present; all current-
                                     anatomy pointers (CLAUDE.md map, PROCESS.md, architecture
                                     README) resolve to the living pair; superseded-version
                                     mentions in ADRs are correctly historical

Critical findings:
- docs/platform/core/features/FEAT-PC002-mist-transcendence-reaper-consent.md — 6-done with no
  Implementation notes section — backlog item TASK-DOC-004 (retroactive backfill, honestly labelled)
- docs/architecture/DOMAIN_ENTITIES.md — active entity inventory missing the whole ADR-U044/U046
  step substrate incl. the new response personal-data category — backlog item TASK-DOC-003

Backlog items created:
- TASK-DOC-003 — DOMAIN_ENTITIES.md Journeys-substrate refresh
- TASK-DOC-004 — FEAT-PC002 Implementation notes backfill

Table updates made during this run: none needed (no retirements, no deletions, no new
snapshots/placeholders/diagrams this cycle).

Notes:
- Section 11's first live run cost ~2 minutes and found the pair healthy the same day it was
  refreshed — the check is cheap; keep it in every cycle-boundary run.
- Section 5's full sweep (vs changed-specs-only) is what surfaced PC002 — prior runs' incremental
  scope let a June gap survive three cycle boundaries. The full sweep stays the baseline.
- The e2e ordering hazard (profile sign-out poisons shared-session mutations) and the dev-DB
  fixture residue (GDTarget x17 vs LIMIT 8) are test-infrastructure findings recorded in the sweep
  section above; both are routed to the J-O3/cooldown hygiene list, not doc drift.
```
