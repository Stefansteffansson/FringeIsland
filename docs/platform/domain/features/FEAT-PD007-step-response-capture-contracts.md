# FEAT-PD007: Step-response capture & review-substance contracts — the lived record learns to hold the traveller's words (ADR-U046)

---
id: FEAT-PD007
title: Step-response capture and review-substance contracts
owner: platform/domain/journeys
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

The step grammar's **Ask collects nothing**. A Reflect step shows its prompt and a completion affordance; the traveller's actual reflection lives nowhere — `journey_step_instances` carries exactly six columns (id, enrollment_id, traveller_group_id, step_id, created_at, completed_at; the PD003 migration) and no response payload, no save verb exists (`enter_journey_step` is the only auto-save write, and it records passage, not words), and `get_player_state.instances[]` exposes only timestamps. Review can therefore only re-show journey content plus timestamps — the J-C "honest but thin" finding, routed as J-O6 and decided as **ADR-U046**: responses live on the per-traveller step-instance (the ADR-U044 §4 lived record realized), responding is optional-always, and response content is **private-only in Ferd**.

The other half of review substance is already seeded but rendered nowhere: J-E landed `journeys.takeaway` (PD006 migration) and per-step `content.takeaway` payloads (the onboarding seed, steps 1 and 4), yet `get_player_state` does not return the journey-level takeaway and no Hub surface reads either key.

One flag also comes due here: FEAT-H010 (Download my data) has owed a step-instances section since the J-C retro ("owner: whoever next touches H010"), and ADR-U046 rides response rows on that section. The privacy posture decided that responses are the most personal data in the system; their export path must exist before the first response is stored.

This is the platform half of Cycle J-F, consumed API-first by the Hub ([FEAT-H024](../../../products/hub/features/FEAT-H024-ask-capture-and-review-substance.md)). No new JRN capability row — this deepens JRN-9's lived record and JRN-13's review. Per ADR-U038 every rule lives platform-side: the capture write, the privacy wall, and the frozen refusal are RPC/RLS/grant, never a Hub route.

## Solution sketch

One schema-gate migration over the existing substrate. **No new table** (ADR-U046 rejected option C — the grain already exists), no new RLS policy shape (the table stays contract-only: RLS enabled, zero direct policies, all access through SECURITY DEFINER RPCs keyed to the P-O1 actor).

**Schema (additive columns only):**
- `journey_step_instances.response jsonb` (nullable) — the traveller's words on the lived record. `NULL` = never responded; shape `{body: text}` mirroring the takeaway payload (free-form JSONB, open to structured capture by future step kinds — nothing sealed). Everything the lived record already has comes free: traveller-own contract scoping, transcendence carry-over (personal-group-keyed), ADR-U031 forgetting via the enrolment cascade.
- `journey_step_instances.response_updated_at timestamptz` (nullable) — when the words were last touched.
- `step_kinds.captures_response boolean NOT NULL DEFAULT false` — **the capture set as registry data**, not a code list (ADR-U044 registry pattern; non-closure per ADR-U008/U018). Seeded `true` for the Ask-verbed kinds `reflection`, `assessment`, `choice`, `journal`; `false` for `narrative`, `activity`, `checklist` (receipt/action marks). Extension kinds choose for themselves at INSERT. A per-step "response required" flag is deliberately **not** built (ADR-U046 §2).

**Contracts:**
- **`save_step_response(p_enrollment_id uuid, p_step_id uuid, p_response jsonb) → jsonb`** — the new write verb. Capture is orthogonal to completion (optional-always, invariant 3): saving never completes, completing never requires. Semantics:
  - Actor = `get_current_personal_group_id()` (P-O1); traveller standing per the existing `_enrollment_traveller_standing` helper (P0002 on no standing — existence hidden). The write targets **the caller's own instance only** (`traveller_group_id` = actor).
  - Status guard mirrors enter/complete exactly: `status not in ('active','completed')` → refuse P0001 — frozen, withdrawn, paused are read-only (JRN-14's semantics extend; **no new rule**). `completed` is admitted — the J-C re-engagement loosening carries over; "editable while the enrolment is active" includes the completed walk, and the frozen walk is the named read-only boundary.
  - Instance targeting: the open instance for (enrolment, traveller, step) if one exists, else the **most recent** completed instance (editing revises the lived record; it never fabricates a new engagement). If no instance exists at all, one is created open (capture-before-complete; mirrors complete's create-and-complete). Responding never flips `completed_at`, never duplicates an open instance.
  - An explicitly empty save (`null` or empty/whitespace `body`) **clears** the response to `NULL` — the traveller may retract their words entirely (privacy-positive; the record keeps the passage, not the words).
  - `response_updated_at` stamps on every effective write. Returns `{instance_id, step_id, response, response_updated_at}` for confirmed-write cache write-through.
  - **Mist-compatible by construction** — no Mist branch, same as enter/complete: once enrolled (PD006's onboarding gate), the Mist is the traveller. The onboarding walker's reflections are captured like anyone's; ADR-U031 ephemerality erases them with the enrolment.
- **`get_player_state` gains additive keys** (the PD004/PD005 byte-additive pattern; no existing key changes shape): `instances[].response`, `instances[].response_updated_at`, `steps[].captures_response` (from the registry), and `journey.takeaway` (from `journeys.takeaway` — the J-E seed finally served). Per-step takeaways need no platform change — they already ride `steps[].content.takeaway`.
- **`get_own_step_instances_export() → jsonb`** — the own-subject export read discharging the H010 flag. Returns the caller's walks across all their enrolments: per enrolment `{journey_id, journey_title, status, enrolled_at, completed_at, steps[]{step_id, step_title, kind, created_at, completed_at, response, response_updated_at}}`. Own data only (P-O1 actor; personal-group-keyed enrolments), Mist-callable, `42501` on no actor. Composed at the Hub's export route as an additive key (the FEAT-H011 journal pattern — Domain sections arrive by surface composition, never by extending the PC-4 document; the one-way rule holds).

**The privacy wall (ADR-U046 §3, pinned by test):** response content is readable by exactly one principal — the traveller who wrote it. `get_group_journey_progress` continues to expose **progress facts only**; no response key appears in its payload in any consent state (the J-D `journey_progress_visibility` consent covers facts, never content). No Steward, Guide, group-member, or admin read exists. A direct PostgREST caller cannot read or write `journey_step_instances` (contract-only table; pinned).

## Appetite

One schema-gate migration (three additive columns + registry seed update), one new write verb, one export read, additive payload keys on an existing read. Comparable to PD004 (function semantics over existing substrate) plus a light schema touch. A few days.

## Rabbit holes

- **The instance-targeting rule.** Open-else-latest-else-create must be deterministic for repeatable steps (multiple completed instances): "latest" is by `completed_at` then `created_at`. Don't invent per-instance response history UI semantics here — one response per instance, the instance the rule selects.
- **Response size.** Free-form JSONB needs a sanity ceiling so a hostile caller can't store megabytes on the lived record — propose a guard (e.g. refuse `body` beyond a fixed length with a clear SQLSTATE) at the gate; don't silently truncate.
- **The empty-save clear.** Distinguish "no response key sent" (refuse — the verb always carries `p_response`) from "explicit empty" (clear). Don't let a malformed payload clear words by accident.
- **Byte-additivity.** The four new payload keys must not reshape existing keys — the Hub's H020/H021/H022 consumers keep rendering unchanged before FEAT-H024 lands (API-first ordering).
- **The export read's join width.** Step titles and journey titles ride the export for legibility, but the read must not become a general query surface — own-subject, fixed shape, no filters.

## No-gos

- No response sharing, no consent surface for response content — any future sharing is its own design decision with its own consent surface, never a rider on the progress toggle (ADR-U046 §3).
- No DS-7 synthesis — a recorded forward seam; it needs captured responses to exist first (ADR-U046 §5).
- No "response required" flag, no completion gating on responses (invariant 3 — capture-if-given, never a toll gate).
- No copy-to-Journal affordance (named as possible-later in ADR-U046 §1; the Journal is not the home and is FIM-only while the onboarding walker is a Mist).
- No authoring surface for takeaways (seed-defined until DS-4 / Journey Studio — ADR-U026; the `pending-DS-4` tag stands).
- No change to enter/complete semantics beyond the additive return keys they already carry.

## Stories

### STORY-1: The lived record gains the response payload
As the platform, I want the response to live on the per-traveller step-instance, so that traveller-own scoping, transcendence carry-over, and forgetting come free (ADR-U044 §4 realized).

**Acceptance criteria:**
- Given the migration has run, when `journey_step_instances` is inspected, then `response jsonb` (nullable) and `response_updated_at timestamptz` (nullable) exist, and `step_kinds.captures_response boolean NOT NULL DEFAULT false` exists with `reflection`, `assessment`, `choice`, `journal` seeded `true` and `narrative`, `activity`, `checklist` seeded `false`.
- Given a Mist's onboarding enrolment with a saved response, when `finalise_transcendence` runs, then the same instance rows with their responses persist on the same personal group (carry-over is free — proven, not mechanized).
- Given a Mist with saved responses, when the ADR-U031 erasure path runs, then the responses are gone with the enrolment cascade (no orphaned words).

### STORY-2: Saving a response is optional and orthogonal to completion
As a traveller, I want to write a response to a step that asks, or not, so that reflection is invited and never tolled (invariant 3).

**Acceptance criteria:**
- Given an active enrolment and a capture-bearing step, when the traveller calls `save_step_response` with `{body}`, then the response lands on their instance (open-else-latest-else-created), `response_updated_at` stamps, and `completed_at` is untouched.
- Given a step with no prior instance, when a response is saved, then an open instance is created carrying it — and a later `complete_journey_step` completes that same instance (no duplicate).
- Given a completed step, when the traveller saves a revised response, then the latest instance's response updates — no new instance appears.
- Given a saved response, when the traveller saves an explicitly empty response, then the response clears to `NULL` (words retracted; passage kept).
- Given any step, when the traveller completes it without ever responding, then completion succeeds exactly as today — no response is required anywhere.
- Given a materialised Mist walking the onboarding journey, when they save a response, then it succeeds identically (no Mist branch).

### STORY-3: The player read returns the substance
As a Surface, I want the responses and the authored takeaways in the single player read, so that review substance costs zero extra round-trips.

**Acceptance criteria:**
- Given an enrolment with responses, when `get_player_state` is called by the traveller, then `instances[]` carries `response` and `response_updated_at`, `steps[]` carries `captures_response`, and `journey.takeaway` carries the journey-level seed — all additive; every pre-existing key unchanged in shape.
- Given the seeded onboarding journey, when its player state is read, then steps 1 and 4 carry `content.takeaway` (already served — pinned) and `journey.takeaway` is non-null.
- Given a frozen enrolment, when the traveller reads player state (Q9 lived-record standing), then their responses are present and readable — the freeze silences the pen, not the page.

### STORY-4: Response content is private-only
As the platform, I want response content readable by exactly the traveller who wrote it, so that the most personal data in the system has the narrowest read in the system (ADR-U046 §3; invariants 4 + 8).

**Acceptance criteria:**
- Given a via-group enrolment whose traveller opted `journey_progress_visibility` in, when a Steward/Guide calls `get_group_journey_progress`, then no response key or content appears in any row of the payload — consent covers progress facts, never words.
- Given another member of the same group enrolment, when they read their own player state, then they see only their own instances and responses, never a sibling traveller's.
- Given a direct PostgREST caller (any client role), when they SELECT, INSERT, or UPDATE `journey_step_instances` directly, then the substrate refuses — the table remains contract-only.
- Given a caller without traveller standing on the enrolment, when they call `save_step_response` or `get_player_state`, then P0002 (existence hidden), never a partial read.

### STORY-5: Frozen and withdrawn walks are read-only for responses
As the platform, I want the response write to refuse non-living walks, so that JRN-14's read-only posture extends with no new rule.

**Acceptance criteria:**
- Given a frozen enrolment, when the traveller calls `save_step_response`, then P0001 (same guard family as enter/complete) — and their existing responses remain readable via STORY-3.
- Given a withdrawn enrolment, when `save_step_response` is called, then P0001.
- Given a completed enrolment, when the traveller revises a response, then the write succeeds (the J-C re-engagement loosening carried over — completed is a living posture, frozen is not).

### STORY-6: The traveller's walks export (the H010 flag discharged)
As a member, I want my step-instances — passages and words — in my data download, so that the right of access covers the most personal data before the first word is ever stored.

**Acceptance criteria:**
- Given a caller with enrolments and responses, when `get_own_step_instances_export()` is called, then it returns all their enrolments' walks with step titles, kinds, timestamps, and responses — own data only, fixed shape.
- Given a Mist, when they call the export read, then their onboarding walk exports identically (Mist-callable); given no actor, then `42501`.
- Given another member's data, when any caller exports, then nothing of anyone else's walks or words appears.

## Platform dependencies

- **DS-3 self:** `journey_step_instances` + the `uq_step_instance_open` grain (PD003), `_enrollment_traveller_standing` / `_enrollment_traveller_read_standing` (PD003/PD005), `get_player_state` (latest PD005), enter/complete status guards (PD004), the step-kind registry (PD003), `journeys.takeaway` + the seeded per-step `content.takeaway` keys (PD006).
- **PC-3 Organisation:** `get_current_personal_group_id()` (P-O1 four-hop actor).
- **PC-2 Identity:** `finalise_transcendence` continuity + ADR-U031 ephemerality (consumed as guarantees for the STORY-1 proofs).
- **PC-4 / FEAT-PC008 + FEAT-H010:** the export composition seam (the Hub route composes; the Core document is untouched — one-way rule).

## Cross-product impact

The Gimbal inherits every contract unchanged (API-first, ADR-U009) — capture and review substance are surface-agnostic; a senses-surface Ask (voice, capture) would store into the same `response` payload, which is JSONB precisely so richer capture shapes need no schema change. The Hub half is [FEAT-H024](../../../products/hub/features/FEAT-H024-ask-capture-and-review-substance.md).

## Vertical impact

- **Privacy/GDPR:** responses are the most personal data in the system — private-only by contract (STORY-4), erased with the enrolment cascade (ADR-U031), exported under right-of-access (STORY-6), retractable by the traveller (the empty-save clear). No consent surface exists because no sharing exists (ADR-U046 §3). Developmental privacy invariants 4 + 8 are pinned in the group-progress non-exposure AC.
- **Notifications:** none — saving a response notifies no one (it is private; there is nothing to announce).
- **Administration:** no admin read of response content exists — deliberately (ADR-U046 §3: "No Steward, Guide, group member, or admin read"). Lifecycle rides the existing enrolment cascades unchanged.
- **Observability:** the new verb emits content-free structured events at its consuming route (FEAT-H024); refusals are SQLSTATEs (P0001/P0002/42501), never silent empties; response **content never appears in logs or telemetry**.
- **Transactions:** none.
- **Extensibility:** the capture set is registry data (`captures_response`), open at INSERT like every ADR-U044 registry column; the response payload is free-form JSONB (structured capture shapes need no migration); no enum, no sealed set, no code list.

## Performance budget

N/A (no surface). The player read stays a single read — the four new keys are byte-additive on payloads already fetched; `save_step_response` is a single-row write designed for background (non-blocking) use by the surface; the export read is on-demand only. The consuming budgets are FEAT-H024's.

## Schema-gate decisions (surfaced for the review gate)

1. **Response DDL** — `response jsonb` + `response_updated_at timestamptz` on `journey_step_instances`, `NULL` = never responded; `{body}` shape by convention, not constraint (JF-1, this decomposition's default). The gate confirms.
2. **Capture set as registry data** — `step_kinds.captures_response` seeded true for the four Ask-verbed kinds (JF-2). Alternative considered and rejected: inferring from `ask_verb`/family in Surface code (a code list — closure; and the registry is the house pattern for exactly this kind of fact).
3. **Write verb** — a dedicated `save_step_response`, not a parameter on enter/complete (JF-3): capture is orthogonal to both passage and completion, and editing-after-completion needs a verb that neither records passage nor re-completes.
4. **Instance targeting** — open-else-latest-else-create (JF-4). The gate reviews the ordering rule for repeatable steps.
5. **Response size guard** — a fixed `body` length ceiling with a clear SQLSTATE, value proposed at the gate (JF-5).
6. **Export read in-scope** — `get_own_step_instances_export()` discharges the J-C flag at J-F, before the first response exists (JF-6). The direct-caller question (ADR-U038) is asked of all three touches at the gate.

## Implementation notes (Cycle J-F build, 2026-07-18)

**Gate closed 2026-07-18: nodded "ok merge", PR #174 merged; the three migrations repaired `applied` in the migration log; `6-done`.** The JF-1..JF-6 defaults and the five build-time defaults below stand as ratified.

**Migrations (held at the schema gate):** `20260718090000_feat_pd007_response_substrate.sql` (JF-01: columns + registry seed), `20260718090100_feat_pd007_save_step_response.sql` (JF-02: the verb), `20260718090200_feat_pd007_player_read_walks_export_contracts.sql` (JF-03: the player-read re-issue + walks export). Applied to dev via `apply-migration-temp.js`; the three `supabase-cli.sh migration repair --status applied 202607180901{0,1,2}00`-equivalents were classifier-blocked in the autonomous session and ride the gate PR body as pending commands.

**Red → green evidence:** the 28-test contract suite (`journey-step-response-capture-contracts.test.ts`) was authored before any migration existed and run against the PD006 substrate: **23 red / 5 passed**, the passes audited — 4 are PIN-class invariants (contract-only posture, completion-without-response, sibling isolation, direct-caller refusal) green by design. **One green-at-red anomaly caught and fixed in-session:** the `journey.takeaway` assertion used a bare `not.toBeNull()`, which `undefined` (key absent pre-migration) passes; fixed to `toHaveProperty` + non-null and re-demonstrated red before implementation. The two STORY-1 cascade proofs (transcendence carry-over, ADR-U031 erasure) are labelled proofs over existing machinery, not TDD. Post-apply: **28/28 green** first run; full journeys slice run for regression (see gate PR).

**Build-time defaults added to the gate board (beyond JF-1..6):**
- **JF-5 value proposed:** `char_length(body) <= 100000` (the PD001 journal-body precedent, `feat_pd001` line 34), refused `22001`; a 256 KiB whole-payload backstop (conventional extra keys ride — non-sealed — megabytes do not). Malformed payloads (non-object / missing `body` key / non-string body) refuse `22023` and never clear existing words (the rabbit-hole pin, tested).
- **No `captures_response` gate on the verb** — the registry flag places surface affordances; a traveller's words are storable on any step of their own walk (the spec's solution sketch names no such refusal; refusing would make the registry a write-guard vocabulary).
- **No via-group permission key on the verb** — responding is the traveller's own words on their own instance, ungated beyond standing like `enter` (an Observer may write privately; they still cannot complete).
- **An explicit-empty save with no prior instance creates the open instance** (single deterministic targeting path; stamps `response_updated_at`, stores `NULL`) — same one-path shape as the store case.
- **`save_step_response` touches `last_accessed_at`** — consistent with the sibling verbs (activity is activity).

**ADR-U038 direct-caller answers (per touch):** (1) columns — the table keeps RLS-on/zero-policies/zero-grants; response content is unreachable around the verbs, pinned by test. (2) `save_step_response` — writes exactly the caller's own (enrolment × traveller × step) response under the same standing + status guards the route relies on. (3) reads — both resolve the P-O1 actor and serve only that traveller's rows; `get_group_journey_progress` is untouched and its payload carries no response key in any consent state (regex-pinned).
