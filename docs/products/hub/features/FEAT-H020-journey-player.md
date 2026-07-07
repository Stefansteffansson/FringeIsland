# FEAT-H020: The journey player — walk, complete, auto-save, resume, and render every kind DS-3 publishes

---
id: FEAT-H020
title: Journey player
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

A FIM can browse, inspect, and enrol (FEAT-H019) — and then nothing: no surface walks the journey. JRN-6..10 + JRN-18 are the area's core experience ("How do I get there?"). The player is the Hub's B5-critical surface for the area (step navigation must paint ≤ 200 ms), and JRN-18 commits the Hub to rendering whatever the DS-3 step-kind registry publishes — an open vocabulary, never an enumerated union (the sealed TS union died with ADR-U044).

## Implementation notes

*(Built Cycle J-B, 2026-07-07, on the FEAT-PD003 contracts. TASK-JB-03/04/05/06; commits `dc7f7c9` → close-out.)*

**Data path (JB-03).** Three BFF routes: `GET /api/journeys/enrollments/[enrollmentId]/player` (Edge + `dub1` + `getVerifiedUserId` → `get_player_state`, wrapped `{ player }`), `POST .../steps/[stepId]/enter` and `.../complete` (Node + `getUser`, raw instance payload). SQLSTATE→HTTP per house pattern (42501→403, P0002→404, P0001→409 message-passthrough, XX000→500 content-free). **Route-policy conformance walk green with zero new exceptions.** Client `hub/lib/journeys/player.ts`: per-enrolment session cache (shared in-flight per key, failed-read-never-cached, `peek`/`fetch`), `enterStep`/`completeStep` thin wrappers (no cache writes — the page owns optimistic state), `invalidatePlayerCache()` wired into the AuthContext sign-out block after `invalidateJourneysCache()`. Types keep the open vocabulary (`kind`/`family`/`ask_verb: string`; `content: unknown`).

**The page (JB-04).** `/journeys/[id]/play`, FIM-gated, Suspense-wrapped. Disambiguation: one active enrolment straight in · several → named chooser (`?enrollment=` pre-selects; the detail page's enrolment panel gained per-enrolment Continue deep-links) · none → honest redirect to detail. One-read boot; header seeds from the cached catalogue/detail card; canvas opens at the payload's resume pointer; `StepRail` (order/required/ticks); prev/next paint from the in-memory payload with `enterStep` fired as background auto-save — failures never block, a non-blocking "not saved — retry" indicator clears on a later success; non-active enrolments (frozen/completed/withdrawn) render one honest status panel; deferred 300 ms `PlayerSkeleton` (B6); the 3x-refire guard asserted (zero duplicate reads across auth churn). `enterStep` fires on explicit navigation, not on boot (position stays derivable — the resume pointer's first-incomplete branch covers un-entered arrivals).

**Renderers + completion (JB-05).** `step-renderers/` registry: `Record<string, StepRenderer>` looked up by the payload's `kind` with a **mandatory fallback** (unknown kinds render title + payload + generic affordance — never a crash); seven Tier-1 renderers presenting payloads plainly; ask verbs always from the payload, never a client map. `StepCanvas` states: completable (optimistic tick, background confirm, rollback + retry on failure), locked (disabled with the blocking predecessor named; a raced server P0001 lands in the same posture), completed non-repeatable (review), completed repeatable (verb offered again; repeat = enter-then-complete). **The scoped optimistic-progress deviation is confined to player progress marks exactly as spec'd** — enrolment mutations everywhere else stay re-read.

**Red → green.** Every behaviour block demonstrated red first (module-absence and missing-affordance reds recorded per task: 10 routes/client, page + panel reds, 13 renderer/canvas reds) → unit project **578/578** (81 suites), lint 0 errors. The perf assertion file is **labelled test-after** (house pattern, mirrors `journeys-page-perf`). `set-state-in-effect` suppressions now 4 repo-wide (≤ 5 retro budget). E2E (`player.spec.ts`): the full arc — catalogue → detail → self-enrol → Continue → resume at step 1 → complete via the ask verb → advance (the auto-save POST asserted) → leave → re-enter → **resume at step 2 from the substrate after a full reload** → the gated step 3 locked with its reason named — **1/1, re-run clean isolated; `journeys.spec` 2/2 unchanged; zero app defects found at E2E.** `next build` green — after catching one real type-seam defect the unit tier missed (`PlayerStep` imported from `player.ts` but only exported from `queries.ts`; re-export added — the type gate earning its DoD row again). Lint 0 errors (1 pre-existing warning). **The production waterfall (player boot cold/warm + step-nav B5) deliberately rides the J-O3 area-gate protocol with Stefan's live walk — pending at 6-done, per the H019 precedent.**

## No-gos

- No journey-completion detection or celebration (J-C owns JRN-12).
- No review mode for completed journeys (J-C, JRN-13).
- No group or per-member progress views (J-D, JRN-16/17 — never comparative).
- No non-linear sequencing UX (`open`/`gated` are stored data, forward shape).
- No onboarding auto-launch (J-E, ADR-U045).
- No realtime (ADR-U039 — the player is single-traveller state).

## Stories

### STORY-1: Boot the player (JRN-6)
As an enrolled member, I want `/journeys/[id]/play` to render my journey's player, so that I can walk what I enrolled in.

**Acceptance criteria:**
- Given one active enrolment, when I open the player, then the step canvas renders my resume position with the step rail and journey header (header seeded from cache, canvas after the boot read).
- Given both an individual and a via-group enrolment, when I arrive without `?enrollment`, then I choose which enrolment to walk (the detail page's Continue affordances deep-link each).
- Given no active enrolment (or no standing), when I open the player, then an honest state routes me to the journey detail — never a broken shell.

### STORY-2: Walk linearly (JRN-7)
As a traveller, I want previous/next navigation through the ordered steps, so that the journey guides me.

**Acceptance criteria:**
- Given the player is booted, when I press next/previous, then the adjacent step paints ≤ 200 ms from the in-memory payload (B5) with pressed feedback within 100 ms.
- Given I navigate to a step, then `enter` fires as a background auto-save and never blocks the paint.
- Given the first/last step, then the corresponding affordance is absent (no wrap-around).

### STORY-3: Complete steps under gating (JRN-8)
As a traveller, I want to mark a step complete with its own ask verb, and be honestly told when a required predecessor blocks me, so that progress is real.

**Acceptance criteria:**
- Given an unlocked step, when I complete it, then the tick paints optimistically, the contract confirms in the background, and a failure rolls the tick back with a retry surface.
- Given an incomplete required predecessor, when I view a later step, then the complete affordance is locked with the reason (which step blocks it); a raced server P0001 renders the same honest state.
- Given an already-completed non-repeatable step, when I revisit it, then it renders in review posture (content visible, complete affordance replaced by its completion mark).

### STORY-4: Progress auto-saves (JRN-9)
As a traveller, I want every navigation and completion persisted without a save button, so that leaving costs nothing.

**Acceptance criteria:**
- Given I navigate or complete, then the corresponding contract call fires in the background; no interaction waits on it.
- Given a background save fails, then a non-blocking indicator offers retry; a subsequent successful save clears it.
- Given auth-event churn (the groups-page 3x-refire class), then no duplicate player-state fetches fire (asserted).

### STORY-5: Resume where I left off (JRN-10)
As a returning traveller, I want the player to open at my resume position, so that I continue instead of restarting.

**Acceptance criteria:**
- Given prior progress, when I boot the player, then the canvas opens at the payload's resume pointer (latest open engagement, else first incomplete step).
- Given a revisit within the session, when I reopen the player, then the cached state paints with no visible loading (B4) and revalidates in the background.
- Given sign-out, then the player cache is invalidated with the other caches (AuthContext block).

### STORY-6: Render every kind (JRN-18)
As a traveller, I want every step kind DS-3 publishes to render properly, so that journeys are experiences rather than uniform pages.

**Acceptance criteria:**
- Given the seven seeded Tier-1 kinds, when each renders, then its content payload and ask-verb affordance display per kind (asserted kind-by-kind).
- Given a step whose kind key is unknown to the renderer map, when it renders, then the fallback renderer presents title + content payload + a generic complete affordance — never a crash, never a blank canvas.
- Given the registry gains a kind (data only), then the player needs no schema or type change to keep functioning (open vocabulary held client-side: `kind: string`, no union).

### STORY-7: The player meets its budgets (Performance DoD)
As the area gate, I want the player's budget rows asserted, so that the B5-critical surface ships measured.

**Acceptance criteria:**
- Given a cold player boot, then exactly one player-state read fires (plus the cache-seeded header) — no request waterfall, no duplicate fetches (asserted at unit tier).
- Given the boot exceeds the skeleton threshold, then a player skeleton (deferred 300 ms, B6 — skeleton, never spinner) renders in the canvas and rail.
- Given the production waterfall at the area gate, then cold/warm player boot and step navigation ride the J-O3 protocol (≥ 3 runs per scenario, every run within budget) with Stefan's live walk.

## Platform dependencies

FEAT-PD003 entirely: `get_player_state` (boot), `enter_journey_step` (auto-save), `complete_journey_step` (completion + gating), the re-pointed detail payload (per-enrolment Continue handles already shipped in v1.1). PC-2 session; PC-3 permissions resolve server-side.

## Cross-product impact

None beyond the shared contracts (the Gimbal player will consume the same payloads). The detail page (FEAT-H019) gains Continue/Start deep-links into the player — an additive touch to the enrolment block.

## Vertical impact

- **Privacy/GDPR:** Renders the caller's own developmental data only; no comparative framing anywhere (invariant 8 — no "ahead/behind", no percentages against others). Nothing new collected beyond the step-instances FEAT-PD003 owns.
- **Notifications:** None (J-C owns milestone notifications).
- **Administration:** None.
- **Observability:** Standard route/client error surfacing; no new event emission.
- **Transactions:** None.
- **Extensibility:** The renderer map is keyed by open-vocabulary registry keys with a mandatory fallback path; no sealed unions anywhere in the player types (`kind: string`).

## Performance budget

*(Classes B1–B6 per ADR-U043; data-boot per ADR-U042.)*

- **First-paint class:** `/journeys/[id]/play` is a navigation target → B2 (cold ≤ 2.5 s, target 2.0 s) / B3 (warm ≤ 1.0 s) / B4 (revisit: cached paint + background revalidate). Data-boot: one justified standalone read (`get_player_state`, single round trip) + session cache; header seeds from the cached detail/catalogue card. Not an overview-bundle slice (nothing is landing-at-first-paint).
- **Interaction class:** step prev/next and complete are B5 — pressed feedback within 100 ms, next paint ≤ 200 ms via optimistic advance from the in-memory payload; contract writes ride behind as background saves (the scoped optimistic-progress deviation, §Solution sketch).
- **Loading states:** B6 — < 1 s nothing (deferred 300 ms), 1–3 s player skeleton (canvas + rail), > 3 s defect. Skeleton, never spinner.
- **Gate:** production stable domain, authenticated real path, cold + warm, ≥ 3 runs per scenario, every run within budget (J-O3 protocol) + Stefan's live walk.

## Open spec questions

1. **Player route shape.** Default: `/journeys/[id]/play` with optional `?enrollment=`; BFF at `/api/journeys/enrollments/[enrollmentId]/player`. Confirmed at task review before build (no gate implication — pure Hub surface).
