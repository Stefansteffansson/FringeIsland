# FEAT-H024: The Ask captures, and review has substance — the traveller's words and the author's takeaways (ADR-U046's surface)

---
id: FEAT-H024
title: Ask capture and review substance
owner: hub
consumers: []
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

The player shows a Reflect step's prompt and a completion button; the traveller's actual reflection has nowhere to go — the step renderers display content text keys only, no input exists, and review (FEAT-H021's read posture) can only re-show journey content plus timestamps. J-C shipped this honest but thin, the completion panel was deliberately reduced to a summary-not-menu, and the richer review entry was promised back "with this question's resolution." ADR-U046 resolved it; the platform half ([FEAT-PD007](../../../platform/domain/features/FEAT-PD007-step-response-capture-contracts.md)) provides the response payload, the `save_step_response` verb, the additive player-read keys, and the walks export read. The takeaway seeds from J-E (`journey.takeaway`; per-step `content.takeaway` on the onboarding journey's steps 1 and 4) are served by the payload and rendered by nothing — `takeaway` has zero hits in Hub code today.

This feature is the Hub half of Cycle J-F: the Ask capture UI in the player, review rendering of responses and takeaways, the richer review entry's return, and the "Download my data" walks section (the FEAT-H010 composition). No new JRN row — it deepens JRN-9's lived record and JRN-13's review at the surface.

## Solution sketch

**Capture in the player (the Ask starts collecting).** Steps whose payload says `captures_response: true` render a response input (a plain textarea) beneath the step content, labelled with the kind's own `ask_verb` — the registry speaks, the Hub never keys on kind strings. Responding is **optional-always**: the input carries no required state, completion affordances never reference it, and an empty walk-through behaves exactly as today (invariant 3 — capture-if-given, never a toll gate).

**Save like JRN-9 saves.** Responses save in the background — on blur and on step navigation — through the new BFF endpoint wrapping `save_step_response`; never blocking, optimistic local state, rollback + retry on failure (the FEAT-H020 auto-save doctrine extended to words). A quiet saved/unsaved indicator tells the truth without ceremony. The confirmed response writes through to the session player cache in the same handler (the J-D session-cache doctrine — a later mount must not replay the pre-save slice). An explicitly emptied input clears the response (the platform's retraction semantics), surfaced as the same quiet save.

**Review gains substance (both directions).** In review posture (and on completed steps generally): the traveller's own response renders with the step — their words where they wrote them, still editable while the walk lives (`active`/`completed`; the same input, the same background save). The per-step `content.takeaway` renders once the step is **completed** — the author's closing word arrives after the passage, never before (a takeaway shown pre-completion would front-run the step itself). The journey-level `journey.takeaway` renders on the completion panel and at the head of review — the closing word of the whole walk.

**Frozen walks show the words, read-only.** The freeze silences the pen, not the page (PD007's Q9 extension): responses render in the frozen posture, the input is disabled via the existing `readOnly` path, and no save fires. JRN-14's semantics extend; no new rule.

**The richer review entry returns.** The completion panel — a summary-not-menu since J-C — regains an affordance now that review has something to offer: it renders the journey takeaway and a "Look back over your journey" entry into review posture. The enrolments-panel Review entry (FEAT-H021) is unchanged.

**Download my data gains the walks section.** The export route composes `get_own_step_instances_export()` into the download as an additive `journeys` key, exactly the FEAT-H011 journal pattern — the courier renders nothing, Core's document is untouched, and FEAT-H010's step-instances flag (owed since the J-C retro) is discharged. FEAT-H010's spec gains its amendment note at build.

## Appetite

A focused surface cycle over the existing player: one input component + registry-keyed placement, takeaway rendering in two places, the completion-panel affordance, one BFF endpoint, one export-composition touch. Smaller than J-B, comparable to J-C. A few days.

## Rabbit holes

- **Don't invent a rich editor.** A plain textarea with the `{body}` shape. Formatting, attachments, and structured capture are future step-kind territory (the payload is JSONB precisely so this feature doesn't have to anticipate them).
- **Save-on-navigate ordering.** The response save and the step-navigation enter/complete writes are independent background writes; don't serialize them into a blocking chain (B5). Rollback must restore the last confirmed response, not blank the input.
- **The takeaway-timing rule.** "Renders once completed" needs one honest source: the completed-instance set the page already derives. Don't add a second completion computation.
- **Consume-once cache staleness.** Both the response save and any review entry must leave the session player cache truthful (write-through on confirm; invalidate on failure) — the J-D/J-E cache lessons apply verbatim.
- **The export key name.** The download's additive key must not collide with the existing `journal` key and should read as what it is (`journeys`); the courier stays format-blind.

## No-gos

- No sharing affordance for responses, no consent copy touching response content — the sharing toggle's copy continues to name step completion marks only (ADR-U046 §3; any future sharing is its own design decision).
- No response-required states, no completion gating on input (invariant 3).
- No copy-to-Journal affordance (possible-later per ADR-U046 §1; not now).
- No takeaway authoring — seeds only (`pending-DS-4`, ADR-U026).
- No DS-7 synthesis surface (forward seam).
- No new realtime channel, no new first-paint read — all substance rides the existing single player read.
- The journey-detail Mist seam and the enrolled-catalogue nuance stay J-O3 gate riders — not smuggled in here.

## Stories

### STORY-1: The Ask captures the traveller's words
As a traveller on a step that asks, I want to write my response right there, so that my reflection lives in my walk instead of nowhere.

**Acceptance criteria:**
- Given a step with `captures_response: true`, when it renders in the player, then a response input appears beneath the content, labelled by the step's `ask_verb`, prefilled from `instances[].response` when present.
- Given a step with `captures_response: false`, when it renders, then no input appears — the registry decides, never a kind list in Hub code.
- Given a traveller typing a response, when they blur the input or navigate steps, then the save fires in the background (never blocking navigation), a quiet indicator reflects saved/unsaved truthfully, and on failure the input keeps their words with a retry — never silent loss.
- Given a saved response, when the save confirms, then the session player cache is updated from the confirmed payload in the same handler (a later mount shows the words without a refetch).
- Given a traveller who writes nothing, when they complete the step and the journey, then everything behaves exactly as before this feature — responding is optional-always.
- Given a Mist walking the onboarding journey, when they respond to its reflection steps, then capture works identically (the front door asks too).

### STORY-2: Review shows my words, and they stay mine to tend
As a traveller looking back, I want to see and revise what I wrote, so that review is a conversation with my own walk.

**Acceptance criteria:**
- Given a completed walk in review posture, when a capture-bearing step renders, then the traveller's response renders with it, still editable through the same input and background save (`completed` is a living posture).
- Given a revision saved from review, when the platform confirms, then the rendered response and the session cache both reflect it.
- Given a traveller clearing their words, when they empty the input and it saves, then the response is retracted (renders as unanswered) — the passage stays, the words go.

### STORY-3: Frozen walks show the words read-only
As a traveller whose walk froze, I want my words still visible but the pen down, so that the freeze is honest without erasing me.

**Acceptance criteria:**
- Given a frozen enrolment, when a capture-bearing step renders, then the saved response displays, the input is disabled via the read-only posture, and no save can fire.
- Given the frozen posture, when the traveller navigates review, then takeaways and responses render exactly as in review — only the ability to write is gone (JRN-14 extends; no new rule).

### STORY-4: The author's takeaways render
As a traveller, I want the authored closing words to arrive as I earn them, so that the journey answers back.

**Acceptance criteria:**
- Given a step carrying `content.takeaway`, when the step is completed, then the takeaway renders with the step (in the player and in review); when the step is not yet completed, then it does not render.
- Given a journey with a non-null `journey.takeaway`, when the completion panel renders, then the journey-level takeaway renders in it; and when review posture opens, then it renders at the head of the walk.
- Given the seeded onboarding journey, when a traveller completes steps 1 and 4 and the journey, then both per-step takeaways and the journey takeaway render from the J-E seed keys — the seed is finally served.
- Given a journey with no takeaways (the 8 predefined journeys today), when it completes, then the panel renders as today — absence is silent, never an empty frame.

### STORY-5: The richer review entry returns
As a traveller finishing a journey, I want the completion moment to offer the look back, so that completion opens a door instead of closing one.

**Acceptance criteria:**
- Given the completion panel, when it renders, then it carries the journey takeaway (when present) and a review-entry affordance into review posture — the J-C summary-not-menu interim posture is retired by exactly this.
- Given the enrolments panel, when a completed walk renders, then its existing Review entry behaves unchanged.

### STORY-6: Download my data includes my walks
As a member, I want my journeys — passages and words — in my data download, so that nothing of mine is beyond my reach.

**Acceptance criteria:**
- Given a member with enrolments and responses, when they download their data, then the document carries an additive `journeys` key composed from `get_own_step_instances_export()` alongside the existing sections — the courier renders nothing of it.
- Given the composed download, when the platform sections are unchanged, then the existing keys (`profile`, `consent`, `memberships`, `journal`, …) arrive byte-identical to today's composition.

## Platform dependencies

- **FEAT-PD007** (the paired half): `save_step_response`, the additive player-read keys (`instances[].response`, `instances[].response_updated_at`, `steps[].captures_response`, `journey.takeaway`), the privacy wall, `get_own_step_instances_export()`.
- **FEAT-PD003/PD004/PD005**: `get_player_state` (single read; review + freeze postures), enter/complete guards, the step registry serving `ask_verb`.
- **FEAT-PD006**: the seeded takeaway keys (`journeys.takeaway`, `content.takeaway`) this surface finally renders.
- **FEAT-PC008 / FEAT-H010**: the export document the walks section composes into (surface composition, one-way rule).

## Cross-product impact

The Gimbal inherits the contracts unchanged (ADR-U009); a senses-surface capture (voice at a Reflect step) stores into the same response payload — the input widget is Hub-shell-specific, the capture semantics are shared. `requires-equipment: none` — a textarea needs no privileged equipment; richer capture modes are future step-kind territory, named by equipment when they come.

## Vertical impact

- **Privacy/GDPR:** the surface renders only the traveller's own responses (the payload cannot carry anyone else's — platform-walled); response content never leaves the player/review/export surfaces — the group progress panel and sharing-toggle copy are untouched and pinned untouched; retraction (clear) is a first-class path; the download covers the new data category the moment it exists.
- **Notifications:** none — writing a private response announces nothing.
- **Administration:** none — no admin affordance touches response content (deliberately absent, ADR-U046 §3).
- **Observability:** content-free telemetry for the meaningful actions (response saved/cleared, review entered from the panel, walks section downloaded) — ids and outcomes only; **response content never appears in telemetry or logs**; save failures surface honestly (indicator + retry), never swallowed.
- **Transactions:** none.
- **Extensibility:** capture placement keys off registry data (`captures_response`) and labels off `ask_verb` — no kind unions, no code lists; unknown future kinds get capture by declaring it in the registry, with zero Hub changes.

## Performance budget

- **First-paint class:** unchanged — B2/B3/B4 ride FEAT-H020's rows with **zero new reads**; all substance arrives as additive keys on the single player read already fetched (and session-cached). The completion panel and review render from in-memory payload.
- **Interaction class:** response saves are background writes (B5 — typing and navigation never block on them; feedback within 100 ms via the local saved/unsaved indicator). Step navigation keeps its optimistic ≤ 200 ms paint.
- **Loading states:** none new — the input renders with the step from the payload; the export download keeps FEAT-H010's existing request → file flow (B6 unchanged).
- **Cold spot-check (ADR-U043 Amendment 1):** not required — this feature adds no request to any first-paint path (the area-gate waterfall re-verifies the whole area regardless, with J-F's substance live).

## Implementation notes (Cycle J-F build, 2026-07-18)

**Gate closed 2026-07-18: the paired FEAT-PD007 gate nodded "ok merge", PR #174 merged; `6-done`.**

**Surface.** `StepResponseInput` (`hub/components/journeys/StepResponseInput.tsx`) — the plain textarea, `ask_verb`-labelled, never required; background save on blur + on unmount (the save-on-navigation path: the canvas is keyed by step id, so navigating unmounts the input and a dirty draft flushes fire-and-forget); quiet Saving…/Saved/Not saved indicator with retry-keeps-the-words; `readOnly` renders the pen down. `StepCanvas` places it by `step.captures_response` alone (registry data; an unknown future kind that declares capture gets the input with zero Hub changes — unit-pinned) and renders the per-step takeaway once `completed` (page-derived — no second completion computation); frozen with no saved words renders nothing (absence silent). `JourneyCompletionPanel` gains `takeaway` + `onEnterReview` ("Look back over your journey" → step one; the J-C summary-not-menu posture retired — the H021 page unit and panel unit adapted, labelled). Page wiring in `play/page.tsx`: prefill mirrors the platform's open-else-latest targeting; the save handler mirrors the cache truth into page state so an in-mount step revisit prefills correctly.

**Transport + BFF.** `saveStepResponse` (`lib/journeys/player.ts`) maps an empty/whitespace body to the platform retraction (`response: null`) and writes the CONFIRMED payload through to the per-enrolment session cache in the same handler (J-D doctrine); a save-created instance is appended open; a failed save never touches the cache. Route `app/api/journeys/enrollments/[enrollmentId]/steps/[stepId]/response/route.ts` (POST, `getUser()`, route-policy conformant): SQLSTATE→HTTP 42501→403 / P0002→404 / P0001→409 / 22001+22023→422; telemetry content-free (`player.response_saved`/`_cleared`/refusal outcomes — ids only, never words). Export route composes `get_own_step_instances_export()` as the additive `journeys` key (FEAT-H010 amended; existing sections byte-identical, unit-pinned).

**Red → green evidence.** 12 Hub unit tests demonstrated red first (input component suite red on missing module; 4 canvas placement/takeaway positives; 2 panel positives; 6 transport/write-through tests), alongside their negative-space pins (no-input-when-false, takeaway-never-before-completion, absence-silent) whose meaning rides the red positives. Post-implementation: journeys units 114/114, **full unit sweep 718/718** (route-policy conformance green over the new route), lint clean, `next build` clean. **Labelled adaptations** (the J-B rule): `account-export-route.test.ts` (mocks + 3 new STORY-6 tests), `journey-player-page.test.tsx` (the summary-not-menu pin became the review-entry assertion — exactly the posture this cycle retires). **E2E**: `response-capture-review.spec.ts` — the full arc (capture → complete → per-step takeaway arrives after passage → completion panel with journey takeaway + review entry → revise in review → full-reload server truth → download carries the words) + the Mist onboarding capture, 2/2. One E2E finding worth keeping: a **completed** walk no longer resolves from a param-less `/play` (that door lists active walks only) — review re-entry carries `?enrollment=`, the H021 affordance shape; the arc asserts that path honestly.
