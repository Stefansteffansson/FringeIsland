# FEAT-H021: Journey completion and review — the milestone renders honestly, time is visible, and completed journeys stay open to revisit

---
id: FEAT-H021
title: Journey completion and review
owner: hub
consumers: []
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

A traveller can walk to the end of a journey (FEAT-H020) and the Hub says nothing: the final required completion looks identical to every other tick, completed journeys render as a bare status panel instead of the lived walk, and the time a traveller gave to each step is recorded (FEAT-PD003 instances) but never shown. JRN-12 needs the completion moment surfaced the instant the platform confirms it; JRN-13 needs review mode — a read posture over the player, not a new surface — so a completed journey remains a place a FIM can return to ("Who am I?" is asked again in review); JRN-11 needs per-step time and total elapsed rendered, own-data-only. The Hub renders what FEAT-PD004 detects — no completion logic lives client-side (ADR-U038).

## Solution sketch

Three layers over the existing player, no new routes, no BFF changes (the additive PD004 payload keys flow through the pass-through routes):

- **The completion moment (JRN-12).** The background `complete` save's response now carries `journey_completed`. On `true`, the player transitions to its completed framing: header states the completion, `StepRail` shows the full-tick state, and a **gentle completion panel** appears (canon voice — an arrival, not a jackpot; no confetti mechanics) with the total elapsed and a path into review. The milestone renders **only on server confirm** — never optimistically. The optimistic step-tick itself stays exactly as H020 ships it; a failed save rolls back the tick per the existing rollback/retry and no milestone ever shows. Non-blocking throughout (B5 holds).
- **Review mode (JRN-13).** A completed walk boots the same player in **review posture**: all steps navigable, content rendered by the same renderer registry, per-step completion marks and times visible, navigation local-only (background `enter` auto-saves are suppressed in review — position saving is meaningless when resume = last, and mere navigation must not open instances on repeatable steps). Per-step affordances stay honest to the substrate: completed non-repeatables render their review posture (H020); incomplete optionals still offer their ask verb; repeatables offer re-engagement — an explicit verb press rides the normal complete path (create-and-complete), which the PD004 guard loosening admits. Review replaces the bare "completed" status panel; `frozen`/`withdrawn` keep the honest panel (J-D owns frozen).
- **Time display (JRN-11).** The payload's `timing` block renders in review (per-step, on the rail/step header) and in the completion panel (total elapsed + calendar span, labelled distinctly). Steps with no accrued time show an honest em-dash, never zero. Formatting is coarse (minutes-grade; hours:minutes above one hour) — own data only, no comparison against `duration_minutes` estimates framed as judgement.
- **Entry points.** Wherever an enrolment renders with `status`, `completed` now offers **Review** (deep-link into the player) where `active` offers Continue — the journeys page cards and the detail page's enrolment panel (additive touch, H019 precedent). A via-group traveller whose own walk is complete while the enrolment stays `active` sees Continue until boot, then the player's completion block takes over with the completed framing — the honest divergence is deliberate (the row is the party's, the walk is theirs).

Consuming stories were walked against the PD004 payload at decomposition: the moment ← `journey_completed` flag; review + times ← `completion`/`timing` blocks; entry points ← the shipped `get_my_enrollments.status`.

## Appetite

Half the J-C cycle (day-scale), after the platform half applies.

## Rabbit holes

- **Celebration design.** One panel, existing primitives, canon voice. No new design-system components, no animation work beyond what exists.
- **Timing typography.** Coarse formatting, one helper, done. No live-ticking timers anywhere.
- **Review-vs-walk mode borders.** Don't build a mode machine — review posture is derived per render from the payload (`completion.traveller_completed` / terminal panel states), not stored client state.

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

1. **Completion-panel placement.** Default: an in-canvas panel at the top of the completed framing (not a modal — nothing to confirm, nothing blocking). Confirmed at task review before build (pure Hub surface, no gate implication).
2. **Review suppression of `enter`.** Default: suppress background enters whenever review posture is derived (traveller-complete or enrolment `completed`); explicit verbs still ride the normal paths. Confirmed at task review before build.
