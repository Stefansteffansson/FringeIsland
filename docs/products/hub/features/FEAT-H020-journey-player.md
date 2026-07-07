# FEAT-H020: The journey player — walk, complete, auto-save, resume, and render every kind DS-3 publishes

---
id: FEAT-H020
title: Journey player
owner: hub
consumers: []
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

A FIM can browse, inspect, and enrol (FEAT-H019) — and then nothing: no surface walks the journey. JRN-6..10 + JRN-18 are the area's core experience ("How do I get there?"). The player is the Hub's B5-critical surface for the area (step navigation must paint ≤ 200 ms), and JRN-18 commits the Hub to rendering whatever the DS-3 step-kind registry publishes — an open vocabulary, never an enumerated union (the sealed TS union died with ADR-U044).

## Solution sketch

- **Route:** `/journeys/[id]/play` (client page behind the FIM gate). Enrolment disambiguation: exactly one active enrolment → straight in; several (individual + via-group, the one-directional dual-enrolment case) → `?enrollment=<id>` chosen from the detail page's per-enrolment Continue affordances; no active enrolment → honest redirect to detail.
- **Data-boot (ADR-U042):** one justified standalone read — `GET /api/journeys/enrollments/[enrollmentId]/player` → `get_player_state` — plus a session cache (`peekPlayerState`/`fetchPlayerState`, PR #102 pattern) so revisits paint per B4. The header seeds from the cached detail/catalogue card (title paints immediately). New `invalidatePlayerCache()` joins the AuthContext sign-out block.
- **The player shell:** step canvas + linear prev/next + step rail (order, required marks, completion ticks). All steps arrive in the boot payload, so **advance is optimistic by design** — next step paints from memory (B5), while `enter` fires as a background auto-save. **Deliberate, scoped deviation from the "mutations re-read, never optimistic" client doctrine:** progress marks in the player are optimistic-with-rollback (background confirm; on failure the mark rolls back with a non-blocking retry surface); enrolment mutations elsewhere stay re-read. The completion plan mandates this ("optimistic advance, background save").
- **Kind-driven rendering (JRN-18):** a registry-key → renderer map covering the seven seeded Tier-1 kinds (each rendering its content payload and ask-verb affordance), with a safe fallback renderer for unknown keys — new kinds must render as data, never crash.
- **Completion + gating (JRN-8):** the complete affordance carries the kind's ask verb; a required-predecessor-gated step shows why it is locked; the server's P0001 maps to the honest 409 state client-side.

## Appetite

One to two Hub sessions after the platform half lands — routes + client lib + shell first, then renderers + E2E + perf rows. Heaviest Hub half of the area.

## Rabbit holes

- **Renderer scope:** the seeds carry placeholder-quality content; renderers present the payload plainly per kind. No rich content authoring/preview work (DS-4 is forward).
- **Timers** (JRN-11), **completion celebration/detection** (JRN-12/13), **frozen read-only mode** (JRN-14) — later cycles. Non-`active` enrolments get one honest state screen, not designed affordances.
- **Auto-save failure handling:** background `enter`/`complete` failures must not block navigation — rollback + retry surface, no blocking modals, no infinite retry loops.
- **Whisp presence in steps** (COI-3) — Communication area; do not scaffold hooks.

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
