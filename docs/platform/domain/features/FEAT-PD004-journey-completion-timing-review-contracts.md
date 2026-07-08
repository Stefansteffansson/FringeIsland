# FEAT-PD004: Journey completion, timing, and review-read contracts — the milestone is detected server-side, stamped once, and served to every surface

---
id: FEAT-PD004
title: Journey completion, timing, and review-read contracts
owner: platform/domain/journeys
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

The substrate records every step completion (FEAT-PD003) but nothing ever concludes: `journey_enrollments.completed_at` has no writer, the `completed` status has no producer, and the moment a traveller finishes their last required step passes silently. JRN-12 requires the platform to detect and mark journey completion when all required steps are done — server-side, because a milestone enforced only in a Hub component is not enforced at all (ADR-U038), and because the legacy oracle's rule binds: **idempotent, sets `completed_at` once**. JRN-11 requires per-step time and total elapsed — the raw timestamps already live on step-instances (`created_at`/`completed_at`), but the accounting semantics (what counts as time-on-step, what sums to the total) must be owned once, platform-side, so the Hub and the Gimbal render the same truth. JRN-13's review mode is a Hub read posture, but it needs the payload to say "this walk is complete" honestly — including for a via-group traveller whose *enrolment* row can never carry their personal completion (the enrolment is the party's; the walk is the traveller's — DS-3 invariants 4 + 8).

One V3 obligation rides the detection edge: a **durable completion notification row** (the milestone a FIM cares about; push/bell delivery rides the Notifications area).

## Implementation notes

*(Built Cycle J-C, 2026-07-08. Migration `20260708120000_feat_pd004_completion_timing_review_contracts.sql`, held at the schema gate and nodded by Stefan — "yes to all" on Q1–Q6, PR #134.)*

**What was built.** Exactly the sketch: three contract re-issues, zero new tables/columns/indexes/RLS. `complete_journey_step` takes the enrolment row `FOR UPDATE` before the pre-stamp edge read (re-checking status under the lock so a racing withdraw/freeze can't slip through), detects the traveller-completion transition (incomplete-required-before → none-after), and on the edge: inserts the passive `journey_completed` notification row (recipient = the traveller's personal group; payload `{journey_id, enrollment_id, journey_title}`; `group_id` = the party for context) and — iff the walker IS the party (Q2's `traveller_group_id = group_id` predicate) — concludes the enrolment (`status='completed'`, `completed_at` stamped once via `coalesce`, `status_changed_at` touched). Both walk guards loosened to `in ('active','completed')` (the labelled J-B delta — the milestone is not a lock). `get_player_state` gained the additive `completion` and `timing` blocks (completed-engagement sums per step, open engagements excluded, totals, wall-clock span served separately); `complete_journey_step`'s response gained `journey_completed` + the completion block so the Hub's background save carries the milestone with zero extra reads. One in-flight correctness fix during authoring: a late edge on a legacy-completed row re-reads the enrolment after the guarded flip (the `WHERE status='active'` UPDATE may match nothing) so the returned completion block can never null out.

**Gate resolutions (Q1–Q6, all defaults nodded):** as recorded in the Open-spec-questions section below, with dev pre-check evidence on PR #134 (7 active / 2 legacy-completed / 7 withdrawn enrolments; `journey_completed` unused among 16 live notification types; all seeded journeys all-required). The two legacy-completed rows never receive retroactive notifications (no edge can fire for them) — no backfill, by decision.

**Red → green.** 23 red-first integration tests (`journey-completion-timing-contracts.test.ts`): 17 red verified against the live PD003 substrate (13 missing-behaviour/missing-key + 4 intended-red on the legacy `= 'active'` guard) + 6 green pins (via-group row never flipped, terminal-state refusals, payload byte-shape, P0002 concealment) → **88/88** across the three journeys suites post-apply → full integration sweep **392/392** (37 suites), no flake. **One labelled test adaptation, zero sibling adaptations:** the STORY-3 erasure proof rides the real `erase_fim_account` path (DeusEx-called) because a bare group-delete is impossible by design — `consent_records.subject_group_id` is ON DELETE RESTRICT *and* append-only (`enforce_consent_append_only`, 42501) outside the controlled erasure path; the ADR-U034 substrate working as intended.

**Notes for successors.** The STORY-1 "two racing last required steps" AC is topologically impossible under linear gating (required steps are totally ordered — one always gates the other); the suite races two parallel completes of the *same* final step, which exercises the identical row-lock serialization. A journey with zero required steps is vacuously `traveller_completed` in the payload but can never fire the edge (documented in the migration). J-D's consent-gated group-progress reads derive from the same instances grain; A-NTF delivers the durable row this feature only stores.

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

All decided at the schema-review gate (2026-07-08, Stefan: "yes to all — apply and continue", PR #134), with the dev pre-check evidence presented alongside; every default below is the ratified resolution:

1. **Detection site and concurrency.** Default: inside `complete_journey_step`, edge-triggered after the stamp, with the enrolment row taken `FOR UPDATE` before the stamp so racing finals serialize (STORY-1). No trigger, no queue, no epoch model.
2. **Solo detection predicate.** Default: `traveller_group_id = enrollment.group_id` — the walker *is* the party. No group-type introspection (ADR-U018-safe), no personal-group lookup beyond what the function already resolves.
3. **The guard loosening (the labelled J-B delta).** Default: enter/complete admit `('active','completed')`; `withdrawn`/`frozen`/`paused` unchanged. Consequence accepted: a completed journey remains walkable (optionals/repeatables) — review is a Hub posture, not a substrate lock. Sibling-suite adaptations budgeted and labelled (STORY-4).
4. **Notification shape.** Default: `type = 'journey_completed'`, passive (no action columns), recipient = traveller personal group, payload `{journey_id, enrollment_id, journey_title}`; inserted only on the edge. No group-facing or Steward-facing rows (J-D/A-NTF territory).
5. **Timing semantics.** Default: derived-only (no schema change); completed engagements sum per step; open engagements excluded; total = sum of per-step; wall-clock span served separately. Formatting entirely surface-side.
6. **Additive payload posture.** Default: no v-bump — `completion`/`timing`/`journey_completed` are additive keys on existing contracts (iteration-zone additive rule; H020's types are open). A key-shape veto here re-scopes to a v2 endpoint instead.
