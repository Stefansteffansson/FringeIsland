# FEAT-PD004: Journey completion, timing, and review-read contracts — the milestone is detected server-side, stamped once, and served to every surface

---
id: FEAT-PD004
title: Journey completion, timing, and review-read contracts
owner: platform/domain/journeys
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

The substrate records every step completion (FEAT-PD003) but nothing ever concludes: `journey_enrollments.completed_at` has no writer, the `completed` status has no producer, and the moment a traveller finishes their last required step passes silently. JRN-12 requires the platform to detect and mark journey completion when all required steps are done — server-side, because a milestone enforced only in a Hub component is not enforced at all (ADR-U038), and because the legacy oracle's rule binds: **idempotent, sets `completed_at` once**. JRN-11 requires per-step time and total elapsed — the raw timestamps already live on step-instances (`created_at`/`completed_at`), but the accounting semantics (what counts as time-on-step, what sums to the total) must be owned once, platform-side, so the Hub and the Gimbal render the same truth. JRN-13's review mode is a Hub read posture, but it needs the payload to say "this walk is complete" honestly — including for a via-group traveller whose *enrolment* row can never carry their personal completion (the enrolment is the party's; the walk is the traveller's — DS-3 invariants 4 + 8).

One V3 obligation rides the detection edge: a **durable completion notification row** (the milestone a FIM cares about; push/bell delivery rides the Notifications area).

## Solution sketch

No new tables, no new columns, no RLS changes — function re-issues and additive payload blocks only (the iteration-zone additive posture).

- **Detection lives inside `complete_journey_step`, on the transition edge.** After the existing stamp logic, with the enrolment row locked (`SELECT … FOR UPDATE` taken before the stamp — serializes two travellers'/two tabs' racing finals), the function evaluates: did this traveller have ≥ 1 required step without a completed instance before this stamp, and zero after? If yes, the **traveller-completion transition** fires exactly once per (enrolment × traveller): (a) the durable notification row inserts (`type = 'journey_completed'`, recipient = the traveller's personal group, passive — no action columns); (b) **iff the traveller is the enrolment party itself** (`traveller_group_id = enrollment.group_id` — the solo walk; no group-type introspection, ADR-U018-safe), the enrolment row takes `status = 'completed'`, `completed_at = now()` (only if currently null — stamps once, ever), `status_changed_at = now()`. Via-group walks never flip the party's row (the group's aggregate is J-D's consent-gated territory); the traveller's completion is derived from instances wherever it's needed.
- **The walk survives the milestone.** `enter_journey_step` and `complete_journey_step` loosen their status guard from `= 'active'` to `IN ('active','completed')` — a **labelled semantic delta** on the J-B contracts. Without it, the solo flip would dead-lock every optional and repeatable step the instant the last required step lands. `withdrawn`/`frozen`/`paused` still refuse exactly as today. No second transition edge is possible (the edge requires an incomplete required step *before* the call), so re-walking repeatables after completion can never re-stamp or re-notify.
- **Timing is derived, never stored.** Time-on-step = the sum of a step's *completed engagements* (`completed_at − created_at` per instance); open engagements are excluded (walking away must cost nothing — an unbounded open engagement is not "time spent"); total elapsed = the sum over steps; the wall-clock span (`enrolled_at → completed_at`) is served alongside as a distinct number, never conflated.
- **The payloads carry it (additive, no v-bump).** `get_player_state` gains `completion` (`{traveller_completed, traveller_completed_at, enrollment_status, enrollment_completed_at}` — traveller-grain derived, row-grain quoted) and `timing` (`{per_step: [{step_id, seconds}], total_seconds, wall_clock: {enrolled_at, completed_at}}`). `complete_journey_step`'s response gains `journey_completed` (boolean transition flag, true only on the edge) plus the same `completion` block — the Hub's background save learns the milestone without a refetch (B5-preserving). Existing keys are untouched; FEAT-H020's types tolerate additive keys by construction (`kind: string`, open payloads).
- **Reactivation composes, untouched:** re-enrolment reactivates the withdrawn row preserving `completed_at` (the Q1 addendum), so a completed-then-withdrawn-then-re-enrolled traveller resumes with their milestone intact — `completed_at` never re-stamps, the payload's completion block is already true at boot, and no duplicate notification can fire.

The consuming FEAT-H021 stories were walked against these payload shapes at decomposition (retro-2026-07-07 §4 discipline): the completion moment consumes the `complete_journey_step` transition flag; review mode and time display consume the `completion` + `timing` blocks; the Review entry points consume the already-shipped `get_my_enrollments.status`.

## Appetite

Half the J-C cycle (platform-first, day-scale) — red suite + one migration through the schema gate. The concurrency edge is a lock, not a design project.

## Rabbit holes

- **Don't invent completion versioning or an epoch model.** The edge definition (incomplete-required-before, none-after, under the row lock) is sufficient; no counters, no generation columns.
- **Don't compute timing at read time from scratch in multiple places.** One derivation, in `get_player_state`'s single round trip; the Hub formats, never re-derives.
- **Don't touch the group-aggregate question.** Any "N of M members finished" read is J-D (consent-gated, never comparative) — even as a convenience field.

## No-gos

- No group or per-member progress/completion aggregates (J-D, JRN-16/17).
- No notification delivery (bell, email, push — A-NTF); the durable row is the whole obligation here.
- No re-walk / fresh-start affordance (deliberate restart is loops/respawn forward shape, ADR-U044).
- No certificates, badges, or reward mechanics (nothing in canon grounds them; if they come, they come through Narrative).
- No frozen-mode semantics (J-D, JRN-14).
- No new tables, columns, or RLS policies.

## Stories

### STORY-1: Completion is detected and marked once (JRN-12, solo)
As the platform, I want the solo traveller's final required completion to conclude the enrolment exactly once, so that completion is a fact of the substrate, not a client's opinion.

**Acceptance criteria:**
- Given a solo enrolment (party = the traveller's personal group) with one required step left, when `complete_journey_step` stamps it, then in the same transaction the enrolment takes `status = 'completed'`, `completed_at` is stamped, and `status_changed_at` touches.
- Given the enrolment is already `completed`, when any further step of it is completed (optional or repeatable), then `completed_at` and `status` are unchanged and no second notification row appears (no edge — idempotent).
- Given two racing completions of the two last required steps (two sessions), when both commit, then exactly one transition fires: one `completed_at`, one notification row (the enrolment row lock serializes the edge check).
- Given all required steps complete but optional steps remain, when the transition fires, then it fires anyway — completion is defined over **required** steps only.

### STORY-2: A via-group traveller's completion is honest and private (JRN-12, group walk)
As the platform, I want a via-group traveller's completion detected at the traveller grain without touching the party's enrolment row, so that one member finishing never speaks for the group (invariants 4 + 8).

**Acceptance criteria:**
- Given a group enrolment and a traveller completing their last required step, when the transition fires, then the enrolment row keeps its `status` and null `completed_at`, and the traveller's `completion` block in `get_player_state` reads `traveller_completed: true` with their `traveller_completed_at`.
- Given the same, then the notification row's recipient is the **traveller's personal group** — never the party group, never any other member.
- Given another member of the same enrolment with required steps open, when they boot the player, then their `completion` block is false — completion never leaks across travellers.

### STORY-3: The milestone lands durably (V3)
As the platform, I want a durable `journey_completed` notification row on the transition edge, so that the milestone survives for the Notifications area to deliver.

**Acceptance criteria:**
- Given a traveller-completion transition, when it fires, then exactly one row inserts into `public.notifications` (`type = 'journey_completed'`, `recipient_group_id` = the traveller's personal group, passive — no `action_type`), with `payload` carrying at least `journey_id`, `enrollment_id`, and the journey title.
- Given any non-edge completion call (idempotent repeat, post-completion repeatable, reactivated already-complete walk), then no additional row ever inserts.
- Given the traveller's account is erased (ADR-U031 path), then the row disappears with their personal group (cascade proof — nothing developmental orphans).

### STORY-4: The walk survives the milestone (labelled J-B delta)
As the platform, I want enter/complete to keep working on a `completed` enrolment, so that the milestone never dead-locks optional and repeatable steps.

**Acceptance criteria:**
- Given a `completed` solo enrolment, when the traveller completes a remaining optional step or re-does a repeatable one, then the call succeeds exactly as it would on `active` (instances record; review of completed non-repeatables still records nothing).
- Given a `withdrawn`, `frozen`, or `paused` enrolment, when enter/complete is called, then P0001 refuses exactly as before this feature (the loosening admits `completed` only).
- Given the four J-B/J-A sibling-suite assertions that pinned `= 'active'`, when the suite adapts, then each adaptation is labelled to this story (the paired-suite adaptation budget, retro-2026-07-08 §4) — never silently weakened.

### STORY-5: Time-on-step and total elapsed are served, honestly accounted (JRN-11)
As the platform, I want the timing semantics owned once, so that every surface renders the same truth about the traveller's own time.

**Acceptance criteria:**
- Given a step with completed engagements, when `get_player_state` returns, then its `timing.per_step` entry is the sum of `completed_at − created_at` across those engagements, in seconds; a step with only an open engagement (or none) carries no accrued time.
- Given a traveller mid-walk, then `timing.total_seconds` equals the sum of the per-step entries and `timing.wall_clock` carries `enrolled_at` and (once complete) `completed_at` — engagement time and calendar span are distinct numbers.
- Given a repeatable step re-done after journey completion, then its later engagements keep accruing into per-step and total time (time is lived history, same grammar as instances).

### STORY-6: The payloads carry the milestone without a refetch
As the platform, I want the transition returned by the completing call itself, so that the Hub's non-blocking background save can render the moment.

**Acceptance criteria:**
- Given the completing call is the edge, when `complete_journey_step` returns, then the response carries `journey_completed: true` and the `completion` block; any non-edge call returns `journey_completed: false`.
- Given any enrolment the caller has standing on (any status — including `completed` and `withdrawn`), when `get_player_state` returns, then `completion` and `timing` are present and every pre-existing key is byte-shape-unchanged (pinned by the red suite).
- Given an actor without standing, then P0002 conceals existence exactly as today.

## Platform dependencies

- FEAT-PD003 entirely (the instances grain, the three player contracts, the reactivation semantics).
- PC-3: the four-hop actor chain and `complete_journey_activities` via-group gating — unchanged, inherited through the re-issued functions.
- The notifications substrate (D15 rebuild + sprint3 columns): insert-only reuse of the existing durable-row pattern (the PD002 group-enrolment fan-out precedent); no schema touch.

## Cross-product impact

FEAT-H021 (Hub completion & review surfaces) is the paired consumer — walked against these payloads at decomposition. The Gimbal inherits the same contracts unchanged (API-first, ADR-U009); because timing and completion are server-derived, a second surface renders identical numbers with zero re-derivation.

## Vertical impact

- **Privacy/GDPR:** Completion and timing are developmental personal data at the traveller grain — served only to the traveller (their own `get_player_state`); nothing comparative, nothing aggregated, nothing visible to Stewards/Guides here (J-D owns consent-gated reads). The notification row names the traveller's own milestone to the traveller only, and erases with their personal group (STORY-3).
- **Notifications:** The V3 obligation this cycle: one durable, passive `journey_completed` row per traveller-completion. Delivery (bell/inbox/push/email + preference controls) explicitly deferred to A-NTF — the row is authored so that area needs no backfill.
- **Administration:** None new (journey admin stays Console scope, ADR-U028).
- **Observability:** The completion transition is traceable from the substrate (status/`status_changed_at`/`completed_at` + the notification row's `created_at`); contract errors keep the house SQLSTATE mapping. No separate event emission.
- **Transactions:** None.
- **Extensibility:** The notification `type` value joins an open TEXT vocabulary (no enum, no CHECK-list extension); no new sealed sets anywhere; timing is derived so no schema commitment constrains future pacing/loops semantics (ADR-U044 forward shape untouched).

## Performance budget

N/A (no surface) — but budget-load-bearing for FEAT-H021: the detection adds bounded work inside `complete_journey_step` (one locked enrolment read + one aggregate over the traveller's own instances + at most one UPDATE and one INSERT — no N+1, no cross-traveller scan), safe behind the player's optimistic advance; `completion`/`timing` compute inside `get_player_state`'s existing single round trip (one extra aggregate over rows already fetched).

## Open spec questions

All to be decided at the schema-review gate (held per the carve-outs), with dev pre-check evidence presented alongside:

1. **Detection site and concurrency.** Default: inside `complete_journey_step`, edge-triggered after the stamp, with the enrolment row taken `FOR UPDATE` before the stamp so racing finals serialize (STORY-1). No trigger, no queue, no epoch model.
2. **Solo detection predicate.** Default: `traveller_group_id = enrollment.group_id` — the walker *is* the party. No group-type introspection (ADR-U018-safe), no personal-group lookup beyond what the function already resolves.
3. **The guard loosening (the labelled J-B delta).** Default: enter/complete admit `('active','completed')`; `withdrawn`/`frozen`/`paused` unchanged. Consequence accepted: a completed journey remains walkable (optionals/repeatables) — review is a Hub posture, not a substrate lock. Sibling-suite adaptations budgeted and labelled (STORY-4).
4. **Notification shape.** Default: `type = 'journey_completed'`, passive (no action columns), recipient = traveller personal group, payload `{journey_id, enrollment_id, journey_title}`; inserted only on the edge. No group-facing or Steward-facing rows (J-D/A-NTF territory).
5. **Timing semantics.** Default: derived-only (no schema change); completed engagements sum per step; open engagements excluded; total = sum of per-step; wall-clock span served separately. Formatting entirely surface-side.
6. **Additive payload posture.** Default: no v-bump — `completion`/`timing`/`journey_completed` are additive keys on existing contracts (iteration-zone additive rule; H020's types are open). A key-shape veto here re-scopes to a v2 endpoint instead.
