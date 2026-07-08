# FEAT-H021: Journey completion and review — the milestone renders honestly, time is visible, and completed journeys stay open to revisit

---
id: FEAT-H021
title: Journey completion and review
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

A traveller can walk to the end of a journey (FEAT-H020) and the Hub says nothing: the final required completion looks identical to every other tick, completed journeys render as a bare status panel instead of the lived walk, and the time a traveller gave to each step is recorded (FEAT-PD003 instances) but never shown. JRN-12 needs the completion moment surfaced the instant the platform confirms it; JRN-13 needs review mode — a read posture over the player, not a new surface — so a completed journey remains a place a FIM can return to ("Who am I?" is asked again in review); JRN-11 needs per-step time and total elapsed rendered, own-data-only. The Hub renders what FEAT-PD004 detects — no completion logic lives client-side (ADR-U038).

## Implementation notes

*(Built Cycle J-C, 2026-07-08, on the FEAT-PD004 contracts. TASK-JC-03/04/05; PR #135 + the close-out PR.)*

**Data path (JC-03).** Additive types in `hub/lib/journeys/queries.ts` (`PlayerCompletion`/`PlayerTiming`/`PlayerStepTiming`/`StepCompletionResult`; `completion`/`timing` optional-tolerant on `PlayerState`), re-exported through `player.ts`; `completeStep` returns `StepCompletionResult`. **Zero BFF changes** — the pass-through routes carry the additive keys untouched (verified before build). Session-cache semantics unchanged.

**The moment (JC-03).** Server-confirmed only: the background save's response merges `journey_completed` + the completion block into player state; on the transition edge the player renders its completed framing — header, full-tick `StepRail`, and the in-canvas `JourneyCompletionPanel` (canon voice, existing primitives, total elapsed + calendar span labelled as two different things, a path into review) — painted from the response + the in-memory boot timing with **zero additional reads** (the perf test asserts the panel renders while the reconcile read hangs; exactly 2 reads at boot, unchanged). The optimistic step-tick + rollback/retry ship byte-identical from H020; a failed save shows no milestone; non-edge completions change nothing.

**Review + timing (JC-04).** Review posture is **derived per render** (`completion.traveller_completed` OR enrolment `status='completed'` — no client mode enum): all steps navigable through the unchanged renderer registry, per-step time + completion marks on the rail, the bare completed-status card replaced; `frozen`/`withdrawn`/`paused` keep the honest H020 panel. In review, navigation fires **no background `enter`** (asserted); explicit re-engagement verbs on repeatables/incomplete optionals ride the normal complete path, which the PD004 guard loosening admits. `hub/lib/journeys/timing.ts` owns formatting (coarse: minutes, h:mm ≥ 1 h; em-dash for no accrued time — never a fabricated zero; never re-derived from instances client-side). Entry points: the `/journeys` cards gained the status-conditional Continue/Review pair (cards carried neither under H020 — the detail panel was the only Continue site), and the detail enrolment panel offers Review on own-completed rows only — a via-group traveller whose walk is complete sees Continue until boot, then the player's completion block takes over (the honest divergence the spec names).

**Red → green.** Red-first per block: Block A 3 suites red (module absences + the completed enrolment rendering the bare non-active card) → green, +17 tests; Block B 6 red (review nav still fired `enter`; no rail times; no card/panel affordances) → green, +15. Unit **578 → 610** (81 → 83 suites), lint 0 errors, `set-state-in-effect` suppressions unchanged at 4 (≤ 5 budget). `next build` green. E2E (`player-completion-review.spec.ts`): the full arc — enrol → walk both required steps → **the milestone renders on server confirm** → full reload → Review entry from the journeys/detail surfaces → review posture (navigation with **no `enter` POST fired**, per-step times visible) → an explicit repeatable re-engagement succeeding — green, with a clean isolated re-run; `player.spec` + `journeys.spec` unchanged green. **The production waterfall (review boot + completion moment) deliberately rides the J-O3 area-gate protocol with Stefan's live walk — pending at 6-done, per the H019/H020 precedent.**

**Post-6-done note (same day, Stefan's live walk):** the completion panel's "Review your journey" button could sit clickable-but-inert — it only set the canvas to the first step, so it did nothing whenever the canvas was already there (born inert on a completed enrolment with no step-instance record — the legacy-completed shape boots at step one — and permanently inert after one use), and even a successful jump could land below the fold with no visible feedback (the panel sits above the canvas). Fixed red-first (2 reds → green, unit 612/612): the page hands the panel the callback **only while it would do something** (on the first step the affordance retires — no fake doors, the H018 principle), and the entry now **brings the canvas into view**. E2E arc + player.spec unchanged green. Lesson: the E2E witnessed the click but never asserted its *effect* — a button's assertion must include what visibly changed.

**Post-6-done note 2 (same day, the product question behind the button):** Stefan's follow-up — "what's the purpose of review-entry at all?" — surfaced the real finding: review-as-a-destination was a spec-time framing error (review is the posture the player is already in; prev/next navigates it), and review's *value* needs substance the substrate doesn't capture yet — the step grammar's Ask collects nothing. **The button was removed** (red-first; the panel is a summary, not a menu; unit 611/611, E2E arc retargeted to prev/next and asserting `review-enter` absent), and the substance question was routed as **J-O6 — step-response capture / review substance** in the [Journeys completion plan](../../../planning/hub-v2/phase-3-journeys-completion-plan.md) (design session at a boundary; candidate sources: traveller responses on the instance or Journal-linked, authored takeaways via DS-4/Studio, DS-7 synthesis). A richer review entry returns with J-O6's resolution.

## No-gos

- No group or per-member progress views (J-D, JRN-16/17 — never comparative).
- No frozen-enrolment work (J-D, JRN-14).
- No notification bell/inbox UI (A-NTF; the durable row is platform-side, invisible here).
- No certificates, badges, sharing, or streak mechanics.
- No fresh-start / walk-again-from-zero affordance (loops/respawn forward shape).
- No non-linear sequencing UX (unchanged from H020).

## Stories

### STORY-1: The completion moment renders on confirm (JRN-12)
As a traveller finishing my last required step, I want the Hub to mark the arrival the moment the platform confirms it, so that completing a journey feels like something happened.

**Acceptance criteria:**
- Given my final required completion, when the background save returns `journey_completed: true`, then the completion panel renders (total elapsed shown) with the header and rail in their completed state — without blocking the optimistic tick that already painted (B5).
- Given the completing save fails, when the rollback fires, then no milestone framing appears anywhere (the moment is server-confirmed only) and the existing retry surface stands.
- Given I complete a non-final step (or a repeatable re-do after completion), then no completion moment fires (`journey_completed: false` — the platform decides, the Hub renders).

### STORY-2: Completed journeys open in review (JRN-13)
As a FIM returning to a completed journey, I want the whole walk readable — steps, content, my marks — so that I can revisit what I did rather than face a status card.

**Acceptance criteria:**
- Given my completed walk, when I boot the player, then review posture renders: every step navigable, content via the same renderer registry, completion marks and per-step times on the rail — and the bare completed-status panel is gone.
- Given review navigation, then no background `enter` fires (asserted — navigation records nothing), while an explicit re-engagement verb on a repeatable/optional step still works through the normal complete path.
- Given a `frozen` or `withdrawn` enrolment, when I boot, then the honest status panel renders exactly as H020 shipped it — review admits `completed` walks only.
- Given a via-group enrolment where my own walk is complete, when I boot, then review framing renders from my `completion` block even though the enrolment row stays `active` — and nothing about any other member shows.

### STORY-3: My time is visible, honestly (JRN-11)
As a traveller, I want to see what time I gave each step and in total, so that my effort is part of my record.

**Acceptance criteria:**
- Given accrued engagements, when review or the completion panel renders, then per-step time and total elapsed display from the payload's `timing` block (never re-derived client-side), formatted coarsely (minutes; h:mm above an hour).
- Given a step with no completed engagement, then it shows an em-dash — never "0 min", never a fabricated value.
- Given the completion panel, then engagement total and calendar span (enrolled → completed) are labelled as two different things, and no number anywhere compares me to anyone (invariant 8).

### STORY-4: Completed enrolments offer Review where active ones offer Continue
As a FIM, I want my completed journeys reachable from the places I already look, so that review is a door, not a hunt.

**Acceptance criteria:**
- Given a `completed` enrolment, when the journeys page or the detail page's enrolment panel renders it, then a Review affordance deep-links into the player (`?enrollment=` preserved for dual-enrolment cases).
- Given an `active` enrolment, then Continue renders exactly as H019/H020 ship it — the affordance swaps on status, nothing else moves.
- Given a withdrawn enrolment, then no Review affordance appears (re-enrolment stays the only door, per the reactivation semantics).

### STORY-5: The surfaces meet their budgets (Performance DoD)
As the area gate, I want completion and review to ride the player's existing budget rows, so that J-C adds no perf regression.

**Acceptance criteria:**
- Given a review-mode boot, then it is the same single `get_player_state` read + session cache as any player boot (B2/B3/B4 unchanged; no extra request for timing/completion — asserted).
- Given the completion moment, then it renders from the completing save's response with zero additional reads (asserted), and step navigation in review paints ≤ 200 ms from the in-memory payload (B5).
- Given boot latency, then the existing deferred `PlayerSkeleton` covers review boots unchanged (B6 — skeleton, never spinner).

## Platform dependencies

FEAT-PD004 entirely: the `journey_completed` transition flag (moment), the `completion` block (review posture, via-group honesty), the `timing` block (time display), the guard loosening (post-completion re-engagement). FEAT-PD003/H020 substrate otherwise unchanged. PC-2 session; PC-3 permissions resolve server-side.

## Cross-product impact

None beyond the shared contracts — the Gimbal's player will render the same `completion`/`timing` blocks. The journeys page + detail enrolment panel gain the status-conditional Review affordance (additive touch, same shape as H020's Continue deep-links).

## Vertical impact

- **Privacy/GDPR:** Renders the caller's own completion and timing only — no other traveller's state, nothing comparative, no aggregate framing (invariants 4 + 8). Nothing new collected; timing derives from instances FEAT-PD003 already owns.
- **Notifications:** None Hub-side (the durable `journey_completed` row lands platform-side per FEAT-PD004; bell/inbox delivery rides A-NTF).
- **Administration:** None.
- **Observability:** Standard route/client error surfacing; the completion moment is client-observable via the existing telemetry pattern — no new event schema.
- **Transactions:** None.
- **Extensibility:** Review posture derives from payload state (no client mode enum); renderer registry untouched (open vocabulary holds); timing formatting is a pure function over the platform block — a future pacing model changes the platform, not the Hub.

## Performance budget

*(Classes B1–B6 per ADR-U043; data-boot per ADR-U042.)*

- **First-paint class:** review mode is the player page — B2 (cold ≤ 2.5 s) / B3 (warm ≤ 1.0 s) / B4 (revisit: cached paint + background revalidate); data-boot unchanged: one justified standalone read (`get_player_state`) + session cache; header seeds from the cached card. The completion/timing blocks ride the same read — zero new requests.
- **Interaction class:** completion tick stays B5 exactly as H020 (optimistic tick ≤ 200 ms; the milestone panel is additive rendering off the async confirm, never on the interaction path); review prev/next is B5 from the in-memory payload.
- **Loading states:** B6 unchanged — deferred 300 ms `PlayerSkeleton` for boots; the completion panel needs no loading state (it renders from an already-returned response).
- **Gate:** review boot + completion moment join the J-O3 area-gate waterfall scenarios (production stable domain, cold + warm, ≥ 3 runs, every run within budget) with Stefan's live walk.

## Open spec questions

1. **Completion-panel placement.** Default confirmed at task review (2026-07-08, lead): an in-canvas panel at the top of the completed framing (not a modal — nothing to confirm, nothing blocking). Built as confirmed.
2. **Review suppression of `enter`.** Default confirmed at task review (2026-07-08, lead): suppress background enters whenever review posture is derived (traveller-complete or enrolment `completed`); explicit verbs still ride the normal paths. Built as confirmed.
