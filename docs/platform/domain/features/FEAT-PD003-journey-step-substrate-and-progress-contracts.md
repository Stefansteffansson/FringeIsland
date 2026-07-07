# FEAT-PD003: The journey step substrate and per-traveller progress contracts — ADR-U044 realized (steps become rows, registries seed, step-instances carry the progress grain)

---
id: FEAT-PD003
title: Journey step substrate and per-traveller progress contracts
owner: platform/domain/journeys
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

The player cycle (J-B: JRN-6/7/8/9/10/18) cannot build on the realized substrate. Steps live as JSONB `content.steps[]` inside the journey row — "a JSONB blob cannot be pointed at cleanly" (ADR-U044) — so per-traveller progress has nothing to address. Progress today is a per-enrolment `progress_data` JSONB, which violates the forward requirement of DS-3 invariants 4 + 8 (per-traveller grain, private by default, never comparative) the moment a group walks a journey. The step-type vocabulary was triply motivated and is now reconciled (ADR-U044): step rows as single-beat nodes, step-kind + content-family registries with ADR-U008's Tier-1 types as seed presets, and per-traveller step-instances as the progress grain. This feature realizes that decision and gives the Hub player its contracts.

Two carried obligations land here: **the FEAT-PD002 Q1 withdraw revisit** (row-deletion withdraw would cascade-destroy step-instances once they FK to enrolments) and **the contract re-point** (`get_journey_catalog.step_count` and `get_journey_detail.steps[]` read `content->'steps'` today and break the moment steps leave the JSONB — they must be re-pointed to rows in the same migration).

## Implementation notes

*(Built Cycle J-B, 2026-07-07. Migration `20260707190000_feat_pd003_step_substrate_progress_contracts.sql`, held at the schema gate and nodded by Stefan — "yes to all", PR #128.)*

**What was built.** The four tables exactly as sketched (`content_families` 6 canon rows · `step_kinds` 7 Tier-1 presets with `default_content_family`/`ask_verb`/`change_semantic` · `journey_steps` with the beat-record columns + `legacy_step_id` · `journey_step_instances` at the enrolment × traveller-personal-group × step grain with the open-instance partial unique index). The conversion is a **reusable service-role function** `_migrate_journey_content_steps()` — count-agnostic, parity-guarded per journey, idempotent-by-refusal; it returned **47** at apply and is now called by `seeds/05` after its legacy-shaped inserts so fresh stacks can't end up half-modelled. `get_journey_catalog`/`get_journey_detail` re-pointed to rows in the same migration (shapes preserved; `kind` = registry key). Player contracts: `get_player_state` (single-round-trip boot; payload keys pinned by the red suite: top-level `sequencing_mode`, per-step `step_order`), `enter_journey_step` (open instance = the engagement; repeat of a repeatable step = a new instance; review of completed non-repeatable records nothing), `complete_journey_step` (idempotent stamp; create-and-complete; P0001 predecessor gating), plus the internal `_enrollment_traveller_standing` helper (service-role only).

**Gate resolutions (Q1–Q7, all defaults nodded):** Q1 — withdraw is a **terminal `withdrawn` status** (CHECK gains one value; instances survive; ADR-U031 erasure still row-deletes and cascades) with four labelled consequence deltas: `enroll_self`/`enroll_group` blocking checks + the dual-enrolment probe and `get_my_enrollments`/detail viewer block all exclude `withdrawn`. Q2 — `journeys.sequencing_mode` column (unconstrained TEXT, only `linear` exercised), `content` NULLed per converted journey. Q3 — all five live assessment steps → family `reflect` (titles verified reflection-shaped at the gate). Q4 — steps + instances **contract-only** (RLS, zero policies, zero grants); registries SELECT-to-authenticated. Q5 — `progress_data` demoted: no new writer, retained for the PC013/PC014 `frozen_reason` metadata (deprecation comment on the column). Q6 — resume = latest open engagement → first step lacking a completed instance → last step. Q7 — via-group completion rides the party group's `complete_journey_activities` (an Observer watches, never completes); solo ungated beyond traveller standing; player contracts deliberately **not FIM-only** (ADR-U045-forward: a Mist walks the onboarding journey through these contracts at J-E).

**Red → green.** 24 red-first integration tests (`journey-step-progress-contracts.test.ts`), all absence-failures (10× missing table, 11× missing function, 1× missing column, 2× intended legacy-behaviour reds) → 61/61 across both journeys suites post-apply. Full integration sweep 364/365 — the single failure a Supabase-side Cloudflare 522 during fixture creation in `membership-lifecycle`, green 24/24 isolated (sweep-flake class, recorded on PR #128). **Labelled test adaptations, none weakened:** both suites' fixtures now seed native `journey_steps` rows (the legacy JSONB shape is dead); the J-A suite's withdraw tests assert the surviving terminal row per Q1; its detail test asserts `kind: 'narrative'` (registry key); STORY-2 sweeps scope to migrated journeys by tag exclusion.

**Post-6-done note — the Q1 addendum (same day, Stefan's catch on the plain-English walkthrough):** the nodded Q1 preserved step-instance *records* but re-enrolment inserted a new row, so the surviving history never carried into the new walk — the player restarted at step 1. Amended in place (migration `20260707213500`, schema gate): **re-enrolment reactivates the most recent withdrawn row** (same `enrollment_id` — instances carry, the traveller resumes; `enrolled_at` preserved, `enrolled_by_group_id` becomes the reactivator, every guard incl. the dual-enrolment rule runs before the branch; the group fan-out fires on reactivation). Canon ground: the grammar's minimum change is a fact about the *traveller* — it does not un-happen at withdrawal. A deliberate fresh-start affordance stays loops/respawn forward shape.

**Notes for successors.** `step_id` FK is ON DELETE RESTRICT (protects lived records; journey deletion has no Ferd path). The FEAT-H010 export contract inherits step-instances as a new personal-data category at its next touch (§L4 row carries the flag). FEAT-PD002's prose says "six" own-actor contracts; the substrate defines seven (`get_group_enrollment_summary` counted separately as the G-A seam) — noted, not edited.

## No-gos

- No authoring/editing contracts (Journey Studio, ADR-U026; registries are seed-defined until an authoring surface exists).
- No `journey_type` CHECK extension (board J-D1 — route-type reconciliation follows the registry pattern later).
- No comparative or aggregate progress surface of any kind (invariant 8 — J-D builds the consent-gated reads).
- No timers/elapsed-time capture (JRN-11, J-C).
- No Mist enrolment paths (J-E, ADR-U045).

## Stories

### STORY-1: Steps become rows, registries seed (JRN-18 substrate)
As the platform, I want journey steps as ordered rows typed against seed-defined registries, so that step-addressable progress and open-vocabulary rendering are possible.

**Acceptance criteria:**
- Given the migration has run, when `journey_steps` is inspected, then every column of the beat record (order, required, repeatable, unlocked_by, content family, step kind, duration, content payload) exists and `(journey_id, step_order)` is unique.
- Given the registries, when seeded, then `content_families` holds exactly the six canon families and `step_kinds` holds the seven ADR-U008 Tier-1 types (narrative, reflection, assessment, choice, activity, journal, checklist), each a preset bundle of default family + ask/change semantics.
- Given a new kind is inserted into `step_kinds` (as data), when steps reference it, then no schema change is required (invariant 6 holds).

### STORY-2: The legacy steps migrate mechanically
As the platform, I want every existing journey's JSONB steps converted to rows under the ADR-U044 mapping, so that no seeded journey loses structure.

**Acceptance criteria:**
- Given any journey with `content.steps[]`, when migrated, then its `journey_steps` row count equals the pre-migration `jsonb_array_length(content->'steps')` and order follows array position (asserted per journey, count-agnostic).
- Given a legacy step of type `content`/`activity`/`assessment`, when migrated, then its kind/family follows the ADR-U044 §3 mapping (assessment families per Q3) and `legacy_step_id` preserves the JSONB `id`.
- Given the migration has run, when `journeys.content` is read, then its disposition matches Q2's resolution and no contract still reads `content->'steps'`.

### STORY-3: The catalogue and detail contracts survive the move
As the platform, I want `get_journey_catalog` and `get_journey_detail` re-pointed to step rows in the same migration, so that the shipped J-A surfaces never see a broken payload.

**Acceptance criteria:**
- Given the migrated substrate, when `get_journey_catalog()` runs, then `step_count` equals the journey's row count and the payload shape is unchanged.
- Given the migrated substrate, when `get_journey_detail()` runs, then `steps[]` returns `{title, kind, duration_minutes}` per row in order — `kind` now the registry key — and never includes content payloads (preview stays content-free).

### STORY-4: The player boots in one read
As the platform, I want `get_player_state(p_enrollment_id)` returning everything the player needs in a single round trip, so that the Hub can meet B2/B3 without request waterfalls.

**Acceptance criteria:**
- Given an actor who is the enrolment's traveller (solo: actor = enrolment party; group: active member of the party), when called, then the payload carries journey meta, sequencing mode, ordered steps (kind, family, ask verb, required, duration, content payload), the caller's step-instances, a resume pointer (Q6 semantics), and the enrolment status.
- Given an actor with no standing on the enrolment, when called, then P0002 (not found) — existence is not revealed.
- Given a non-`active` enrolment, when called, then the payload still returns with its `status` — the Hub renders the honest state; no affordance semantics are decided here (J-C/J-D own those).

### STORY-5: Engagement is recorded, auto-save is cheap
As the platform, I want `enter_journey_step` to record engagement per the Designer semantics, so that navigation auto-saves without ceremony.

**Acceptance criteria:**
- Given a traveller entering a step with no open instance, when called, then an open instance is created (`completed_at` null) and `last_accessed_at` touches.
- Given an open instance already exists for the triple, when called again, then no duplicate is created (the open instance is the engagement).
- Given a completed, non-repeatable step, when entered again (review), then no new instance is created; given a completed **repeatable** step, then a new open instance is created (repeat = new instance, never an update).

### STORY-6: Completion stamps once, gating holds
As the platform, I want `complete_journey_step` idempotent with required-predecessor gating, so that JRN-8's rule is substrate-enforced.

**Acceptance criteria:**
- Given an open instance, when completed, then `completed_at` stamps once; a second call is a no-op returning the existing completion (idempotent — the legacy oracle's completion idempotency holds).
- Given a linear journey and an incomplete required predecessor, when completing a later step, then P0001 (`required predecessor incomplete`) and nothing is written.
- Given no instance yet (client skipped `enter`), when completing an unlocked step, then the instance is created-and-completed in one call.

### STORY-7: Withdraw preserves the lived record; forgetting still forgets
As the platform, I want the Q1 revisit landed and the erasure cascade proven, so that withdrawing never silently destroys developmental history while ADR-U031 erasure still removes everything.

**Acceptance criteria:**
- Given an active enrolment with step-instances, when `withdraw_from_journey` runs, then the enrolment takes the Q1-resolved terminal state, instances survive, and re-enrolment is possible (the partial unique index scopes actives only).
- Given an enrolment row is deleted (ADR-U031 erasure / GDPR path), when cascades run, then its step-instances are gone (proof-by-test).
- Given `anon`/`authenticated`, when attempting direct INSERT/UPDATE/DELETE on any of the four new tables, then permission denied — contracts are the only write path.

## Platform dependencies

- PC-3: `has_permission()` + the personal-group actor chain (P-O1 four-hop). The J-B progress keys already seeded and unexercised (`view_own_progress`, `complete_journey_activities`, `view_journey_content`) resolve here.
- PC-1: nothing new.
- DS-4: reference-only forward shape — content payloads inline, tagged `pending-DS-4` (DS-3 §8 Q7).

## Cross-product impact

FEAT-H020 (the Hub player) is the paired consumer — its stories were walked against the `get_player_state` payload at decomposition (retro-2026-07-07 §4). The Gimbal will consume the same contracts unchanged (API-first, ADR-U009).

## Vertical impact

- **Privacy/GDPR:** Step-instances ARE developmental personal data — the heart of invariants 4 + 8. Traveller-own reads only in J-B; Steward/Guide visibility deferred to J-D's consent-gated contracts; never comparative, enforced at the DB layer. ADR-U031 erasure cascades through enrolments to instances (STORY-7 proof). The FEAT-H010 data export inherits a new category — flagged to the export contract's next touch (not blocking J-B; noted in §L4 row).
- **Notifications:** None in J-B (milestone notifications ride J-C's completion detection, gentle and never comparative).
- **Administration:** None new (journey admin is Console scope, ADR-U028).
- **Observability:** Progress events derivable from instance rows (created/completed timestamps); no separate event emission in J-B. Contract errors surface as SQLSTATE per house pattern.
- **Transactions:** None.
- **Extensibility:** The registries are the extension surface (ADR-U008/U018): new kinds/families are seed/data inserts, no schema change; `sequencing_mode` is unconstrained stored data; no new sealed CHECK lists (the Q1 status value is a lifecycle state, not a vocabulary).

## Performance budget

N/A (no surface) — but the contract shapes are budget-load-bearing for FEAT-H020: `get_player_state` is a single round trip by design (no N+1 across steps/instances); `enter_journey_step` and `complete_journey_step` are single-statement writes safe to fire as background saves behind the player's optimistic advance (B5 ≤ 200 ms lives Hub-side; the platform's obligation is that no contract forces a blocking read-modify-write chain).

## Open spec questions

All decided at the schema-review gate (held per the carve-outs), with dev pre-check evidence presented alongside:

1. **Withdraw semantics (the carried Q1 revisit).** Default: withdraw becomes a **terminal `withdrawn` status** (CHECK gains one lifecycle value; `withdraw_from_journey` flips status instead of deleting; instances preserved; `uq_journey_enrollments_active_party` already scopes actives, so re-enrolment works). Row-deletion remains only as the ADR-U031/GDPR erasure path, which cascades instances by design. Decided at the schema-review gate.
2. **`journeys.content` disposition post-migration.** Default: add `journeys.sequencing_mode` (TEXT, default `linear`, unconstrained — invariant 6), populate from `content->>'structure'`, then NULL the `content` column (its only realized payload was version/structure/steps). Decided at the schema-review gate.
3. **Assessment-step family assignment (per-journey Reflect vs Decide).** Default: `reflect` for every seeded assessment step unless the dev pre-check surfaces decision-shaped ones; the concrete per-step mapping table is presented at the gate. Decided at the schema-review gate.
4. **Read posture on the four new tables.** Default: `journey_steps` + `journey_step_instances` are **contract-only** (no SELECT grant — a published-mirror RLS policy on steps would leak content payloads around the preview contract; instances are traveller-own via `get_player_state`); registries readable by `authenticated` (public vocabulary). Decided at the schema-review gate.
5. **`progress_data` demotion mechanics.** Default: **stop writing it** — reads derive live from instances; the column stays (frozen-reason data from PC013/PC014 cascades still lives there) and is documented as cache/frozen-metadata only. No summary maintenance in J-B. Decided at the schema-review gate.
6. **Resume-pointer semantics (design confirmation, not schema).** Default: latest open instance if any, else the first step in order lacking a completed instance, else the last step. Confirmed at the gate alongside Q1–Q5.
