# FEAT-PD002: Journey catalogue & enrolment contracts — read the published catalogue honestly, enrol a party through one door, and summarise a group's journeys

---
id: FEAT-PD002
title: Journey catalogue & enrolment contracts — catalog/detail reads with viewer enrolment state, self- and group-enrolment with withdraw, the group enrolment-summary read (the G-A seam), and enrolment-write narrowing (first DS-3 feature spec)
owner: platform/domain/journeys
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

The Journeys area (A-JRN) opens with catalogue & enrolment (Cycle J-A of the [Journeys completion plan](../../../planning/hub-v2/phase-3-journeys-completion-plan.md)): Hub §L3 JRN-1 (browse catalogue), JRN-2 (view detail), JRN-3 (enrol self), JRN-4 (enrol an engagement group). Every row names **DS-3** as the platform dependency — and DS-3 has **zero feature specs** (`journeys.md` §L4). The substrate is realised and Conformant (`journeys` + `journey_enrollments`, seven RLS policies on the four-hop actor chain, `is_enrolled_in_journey`/`is_journey_enrollable`, the journey-management permission keys in the seeded catalog, 8 predefined journeys) but the **contract layer is absent** — the legacy Hub read and wrote these tables directly from the browser, the v1 sin the rebuild ends (ADR-U009/U030/U038).

One Groups-area seam rides in: GRP-4's group detail renders **without** its DS-3 enrolment summary (Groups plan, G-A row) — this cycle fills that slot.

### Why DS-3, and one anatomy correction

Journeys, steps, enrolments, and progress are DS-3's constitutive domain (ADR-U017 journeys-as-content-templates; ADR-U020 the party is always a PC-3 group). No other service was a candidate. **Decomposition finding:** the Groups plan's premise "additive enrolment-summary on `get_group_detail`" would make a PC-3 function read a DS-3 table — a **Core→Domain dependency, forbidden by the one-way rule** (ADR-U023). The summary therefore lands as a **DS-3 read** (`get_group_enrollment_summary`) that the Hub's group-detail BFF route composes surface-side (the ADR-U042 composition posture). `get_group_detail` is untouched.

## Solution sketch

Six own-actor `SECURITY DEFINER` contracts over **existing** substrate (**no new table** — the ADR-U044 step-model schema is Cycle J-B's), consumed as PostgREST RPC. Actor = `get_current_personal_group_id()` (P-O1). House refusal grammar: `P0002` no-existence-leak, `42501` not-permitted.

- **`get_journey_catalog() → jsonb`** — published journeys: `id, title, description, difficulty_level, estimated_duration_minutes, tags, step_count` (derived from the realized `content` JSONB until J-B re-points it to step rows — payload-stable across that swap). Readable by any authenticated session **including Mists** (published structure is shared-world state, DS-3 §3; mirrors the existing published-select RLS). No rankings, no counts-of-travellers (the anti-leaderboard guardrail holds at the source).
- **`get_journey_detail(p_journey_id) → jsonb`** — the catalogue fields + a **steps overview** (per step: `title`, kind, duration — never the content payload; preview content is a DS-4 seam) + a **viewer block**: `is_enrolled_individually`, `enrolled_via` (groups of the caller's active memberships holding an enrolment), and **`enrollable_groups`** — the caller's active engagement groups where `has_permission(actor, g, 'enroll_group_in_journey')` resolves true (the JRN-4 picker's only source; the Surface never computes it). Unpublished/nonexistent → `P0002`, indistinguishably.
- **`enroll_self_in_journey(p_journey_id) → jsonb`** — the caller's personal group enrols (ADR-U020: solo = personal group as party). Gated by the seeded `enroll_self_in_journey` key resolved in the journey-owning context per the substrate's existing posture, active-account-only. **FIM-only at J-A** (`42501` for a Mist) with the **ADR-U045 disposition tagged**: at Cycle J-E this contract is replaced in place to admit a Mist **iff** the journey is the designated onboarding journey. Creates the enrolment (`group_id` = personal group, `enrolled_by_group_id` = same, `status='active'`, initial `progress_data`); duplicate (same journey + group) refused.
- **`enroll_group_in_journey(p_group_id, p_journey_id) → jsonb`** — gated by `has_permission(actor, p_group_id, 'enroll_group_in_journey')` (ADR-U041 wielding rides the same resolution); the group must be an `active` engagement group; not-visible/absent group → `P0002`; duplicate refused. Emits a **durable notification row** to the group's active members ("your group enrolled") — V3 rides durable rows now, push at the Notifications area.
- **`withdraw_from_journey(p_enrollment_id) → jsonb`** — own individual enrolment: self-serve; group enrolment: `unenroll_from_journey`-gated in that group. DS-3 §3 names withdraw in the enrolment operation family — without it enrolment is a one-way door. Semantics Open Q1 (default: row deletion at J-A, revisited when step-instances land at J-B).
- **`get_my_enrollments() → jsonb`** — the caller's individual enrolments + the enrolments of groups they're an active member of, kind-marked (`individual` | `via_group` with group id/name), each with journey id/title/status/`last_accessed_at`. The Surface's "my journeys" read and the player's entry list (J-B).
- **`get_group_enrollment_summary(p_group_id) → jsonb`** — the G-A seam: count + `[{journey_id, title, status}]` for a group's enrolments. Visibility mirrors `get_group_detail` (active member, or public group), `P0002` otherwise — never a wider window than the group itself.
- **Direct-caller hardening (ADR-U038).** With contracts canonical, the migration narrows direct writes on `journey_enrollments` (the legacy client-write RLS surface): a direct PostgREST caller must not create an enrolment outside the contracts (bypassing duplicate/party/permission invariants) nor flip `status`/`progress_data` directly (progress contracts arrive at J-B over the narrowed substrate). Exact shape at the schema-review gate (Open Q4), reads stay RLS-scoped.

## Appetite

Medium — one migration (six functions + grants + write-narrowing), integration tests for the visibility/no-leak matrix, both enrolment paths incl. the permission gate and duplicate refusals, withdraw, the summary read, and the adversarial direct-caller paths. Substrate and permission keys all exist; the Groups cycles proved this exact shape five times.

## Rabbit holes

- **Don't touch the step model.** Steps stay inside `content` JSONB this cycle; ADR-U044's rows/registries are J-B's migration. The detail read derives its overview from whatever the storage is — payload-stable across the swap.
- **Don't build progress.** No progress reads/writes beyond the enrolment row's existence (JRN-6..11 = J-B/J-C).
- **Don't design discovery.** The catalogue is DS-3's published read; ranking/search/recommendation is the DS-6 seam (board J-A2). No ordering promises beyond a stable default.
- **Don't invent Mist enrolment early.** The J-A gate is FIM-only with the ADR-U045 disposition tagged; the designation substrate and the opened gate are J-E's.
- **Don't reconcile route-type vocabulary here.** `journey_type` CHECK values are read, never extended (board J-D1); the registry mapping is a later FEAT-PD following ADR-U044's pattern.
- **Dual-enrollment semantics come from the oracle, not from taste** (Open Q2).

## No-gos

- No journey authoring, publishing, or unpublishing surface (Journey Studio / ADR-U026 scope; the keys exist unexercised).
- No new table, no step-model migration (J-B), no progress contracts (J-B), no completion detection (J-C), no freeze mechanics (exist in PC013/PC014; re-verified at J-D).
- No onboarding-journey designation substrate (J-E, ADR-U045) and no auto-launch.
- No realtime, no push — enrolment events are durable notification rows only (board J-A1).
- No enrolment pause (`paused` is a CHECK value with no write path — stays that way this cycle; recorded, not built).

## Stories

### STORY-1: The catalogue and my enrolments, honestly (JRN-1 platform half)
As the platform, I want published journeys and the caller's own enrolments readable through contracts, so every surface renders the same truth.

**Acceptance criteria:**
- Given any authenticated session (FIM or Mist), when it calls `get_journey_catalog()`, then it receives every published journey's catalogue fields (incl. derived `step_count`) and nothing about unpublished ones.
- Given a FIM with an individual enrolment and a group enrolment via membership, when they call `get_my_enrollments()`, then both appear, kind-marked, with journey title and status.
- Given any caller, when the catalogue returns, then it contains no traveller counts, rankings, or comparative fields (DS-3 invariant 8 at the source).

### STORY-2: One journey in full, viewer-shaped (JRN-2 platform half · JRN-4's picker source)
As the platform, I want a detail read that tells the caller what the journey is and what *they* can do about it.

**Acceptance criteria:**
- Given a published journey, when a FIM calls `get_journey_detail(id)`, then they receive the catalogue fields, the steps overview (title/kind/duration per step — no content payloads), and their viewer block (`is_enrolled_individually`, `enrolled_via`, `enrollable_groups`).
- Given the caller holds `enroll_group_in_journey` in exactly two of their five active groups, when the detail returns, then `enrollable_groups` lists exactly those two — the Surface never computes eligibility.
- Given an unpublished or nonexistent id, when any non-privileged caller reads it, then `P0002`, indistinguishably (no existence leak).
- Given a Mist, when they call it on a published journey, then the read succeeds and the viewer block shows no enrolment affordance (`enrollable_groups` empty, enrolment refused per STORY-3 until J-E).

### STORY-3: Enrol myself (JRN-3)
As the platform, I want self-enrolment to be one contract that makes the personal group the party, so solo travel and group travel are the same shape (ADR-U020).

**Acceptance criteria:**
- Given an active FIM and a published journey, when they call `enroll_self_in_journey(id)`, then an enrolment exists with `group_id` = their personal group, `status='active'`, initial `progress_data`, and the response carries the enrolment.
- Given they are already individually enrolled, when they call it again, then it is refused and no second row exists.
- Given a Mist, when they call it, then `42501` — **tagged ADR-U045 disposition:** replaced in place at J-E to admit the designated onboarding journey.
- Given a suspended FIM, when they call it, then it is refused (no new social footprint — the house posture).

### STORY-4: Enrol a group I may enrol (JRN-4)
As the platform, I want group enrolment gated by the group-scoped permission, so wielding a group into a journey is a capability, never a role string.

**Acceptance criteria:**
- Given a FIM holding `enroll_group_in_journey` in an active engagement group, when they call `enroll_group_in_journey(group_id, journey_id)`, then the enrolment exists (`group_id` = the group, `enrolled_by_group_id` = the actor's personal group — provenance) and the group's active members each receive a durable notification row.
- Given a member without that permission in the group, when they call it, then `42501`; given a group the caller cannot see (or no group), then `P0002` (the no-leak rule).
- Given the group is already enrolled in that journey, when they call it, then it is refused and no second row exists.
- Given the group's status is not `active` (closed/archived/suspended), when they call it, then it is refused honestly.

### STORY-5: Withdraw through the same door
As the platform, I want withdrawal to be a contract, so enrolment is never a one-way door and the rules live substrate-side.

**Acceptance criteria:**
- Given a FIM with an individual enrolment, when they call `withdraw_from_journey(enrollment_id)`, then the enrolment is gone (per Open Q1's semantics) and `get_my_enrollments()` no longer lists it.
- Given a group enrolment and a caller holding `unenroll_from_journey` in that group, when they call it, then the group's enrolment is withdrawn; without the permission, `42501`.
- Given an enrolment id the caller cannot see (or none), when they call it, then `P0002`.
- Given a `frozen` enrolment, when its traveller attempts withdrawal, then the refusal matches the frozen-immutability posture (oracle B-SEC-003/004; read at build, recorded either way).

### STORY-6: A group's journeys at a glance (the GRP-4 seam)
As the platform, I want a group's enrolment summary readable by exactly those who may see the group, so the Groups detail page completes without a Core→Domain read.

**Acceptance criteria:**
- Given an active member of a group with enrolments, when they call `get_group_enrollment_summary(group_id)`, then they receive the count and `[{journey_id, title, status}]`.
- Given a non-member and a public group, when they call it, then the same summary returns; given a non-member and a private group — or a nonexistent id — then `P0002`, indistinguishably.
- Given the Hub's group-detail BFF composes this read alongside `get_group_detail`, when the summary read fails, then the group detail still renders (slice-envelope posture, ADR-U042).

### STORY-7: No path around the contracts (ADR-U038 direct-caller)
As the platform, I want the direct PostgREST enrolment-write surface narrowed, so the contracts' invariants cannot be bypassed.

**Acceptance criteria:**
- Given a direct PostgREST caller (any client role, including a Mist), when they attempt to INSERT into `journey_enrollments`, then the write is refused at the substrate — an enrolment cannot exist outside the contracts.
- Given a direct caller with an enrolment, when they attempt to UPDATE `status` or `progress_data` directly, then the write is refused (progress contracts arrive at J-B over the narrowed substrate).
- Given the adversarial integration suite, when it exercises these paths alongside the RPC paths, then every refusal is a tested behaviour.

## Platform dependencies

- **DS-3 substrate (existing, Conformant):** `journeys`, `journey_enrollments`, the published-select/enrolment RLS set, `is_enrolled_in_journey`, `is_journey_enrollable`, the 8 seeded journeys.
- **PC-3:** `has_permission()` + the seeded keys (`enroll_self_in_journey`, `enroll_group_in_journey`, `unenroll_from_journey`), `get_current_personal_group_id()` (P-O1), group visibility semantics (mirrored by STORY-6).
- **PC-2:** FIM/Mist distinction (`users.is_temporary`), account-state substrate for the suspended refusal.
- **V3 substrate:** the `notifications` table for the durable group-enrolment rows (the existing `notify_*` fan-out pattern; the DS-3→DS-5-table write follows the realized substrate pattern and is noted against the routed cross-tier-write pickup, `journeys.md` Step 2 Class 3).
- **Schema gate.** New SECURITY DEFINER functions + write-narrowing + grants → task status `review`, explicit nod; the gate asks the direct-caller question against `journeys` and `journey_enrollments`.

## Cross-product impact

Consumed by **Hub [FEAT-H019](../../../products/hub/features/FEAT-H019-journey-catalogue-and-enrolment.md)** (Cycle J-A's Surface half); the **Gimbal** consumes the same contracts later — `enrollable_groups` and the viewer block keep every eligibility decision platform-side. **[FEAT-PC016](../../../platform/core/features/FEAT-PC016-pending-nominations-read-contract.md)** (the pending-nominations read, a Groups-area debt) rides the same schema-gate migration as a sibling rider, not a dependency.

## Vertical impact

- **Privacy/GDPR:** enrolment is FIM (or, from J-E, Mist) personal data — reads are own-scoped (`get_my_enrollments`) or group-visibility-scoped (summary); the catalogue exposes shared-world structure only; no traveller identity appears in any read this cycle; Mist enrolments (J-E) inherit ADR-U031 ephemerality.
- **Notifications:** group enrolment writes durable notification rows to active members (self-enrolment is self-originated — none); push/preferences ride the Notifications area (ADR-U039).
- **Administration:** enrolment participates in the existing ADR-U016 cascades (freeze on leave/close/delete — PC013/PC014, re-verified at J-D); provenance via `enrolled_by_group_id`; withdraw semantics recorded at the gate (Open Q1).
- **Observability:** refusals are SQLSTATEs (`42501`/`P0002`), never silent empties; the consuming routes emit content-free structured events (FEAT-H019); the migration is traceable.
- **Transactions:** None (journeys hold no entitlements — DS-3 §L3's recorded zero).
- **Extensibility:** no CHECK list is extended (board J-D1); payloads are jsonb-additive (the J-B step-row swap changes derivation, not shape); the kind-marking in `get_my_enrollments` is a string vocabulary, not an enum.

## Performance budget

N/A (no surface) — but contract shapes serve the consuming surface's budgets: the catalogue and detail reads are single-call (no N+1 for the Surface), and `get_journey_detail` carries the viewer block so the Surface needs exactly one read per page (FEAT-H019's B2/B3 classes depend on this).

## Open spec questions

1. **Withdraw semantics.** Default: row deletion at J-A (no step-instances exist yet; the CHECK vocabulary is not extended per J-D1). Revisited at J-B when step-instances FK to enrolments (deletion vs terminal status). Decided at the schema-review gate.
2. **Dual-enrollment (individual + via-group, same journey).** The legacy oracle "detects" it (B-JRN-003) — whether detection meant refusal or coexistence is read from the oracle at build; the contract implements the oracle's semantic and records it here.
3. **`is_published` vs `is_public` on `journeys`.** The catalogue predicate mirrors the existing published-select RLS; what `is_public` additionally governs (if anything) is read from the substrate at build and recorded; no new semantic invented.
4. **Write-narrowing shape on `journey_enrollments`.** Column privileges vs policy replacement vs both — decided at the schema-review gate with the direct-caller question on the table; STORY-7's ACs bind either way. (The advisor-flagged duplicate permissive policies on this table may consolidate here **only** if the J-O3 measurement points at the DB layer — else that stays P3b's.)
5. **Notification shape for group enrolment.** Reuses the existing durable `notifications` row pattern; whether it rides a trigger or an in-contract insert is decided at build (the cross-tier-write pickup applies either way).

## Implementation notes

Built Cycle J-A, 2026-07-07. Migrations `20260707130821` (the schema gate — Open Q1–Q5 nodded by Stefan, "yes to all") and `20260707145549` (the build-finding amendment, gate-nodded and applied same day).

**Open-question resolutions (as nodded):** Q1 — withdrawal is **row deletion** (revisit at J-B when step-instances FK to enrolments). Q2 — the oracle's semantic (B-JRN-003, `hub-legacy` enroll route) was **one-directional, app-layer detection**: self-enrol refused when an active via-group enrolment exists; group-enrol never blocked on a member's individual enrolment; the contracts home exactly that, substrate-side. Q3 — the catalogue/detail predicate mirrors `journeys_select_published` **verbatim** (`is_published AND (is_public OR owner-member OR individually-enrolled OR platform-admin)`); `is_public=false` means published-but-owner-scoped; no new semantic. Q4 — **both** (the four sprint0 write policies dropped AND `INSERT/UPDATE/DELETE` revoked from `anon, authenticated`) **plus** the partial unique index `uq_journey_enrollments_active_party` on active `(journey_id, group_id)` — the structural duplicate backstop the 2026-02-21 rebuild lost; reads stay RLS-scoped. Q5 — **in-contract durable insert** (the `nominate_steward` precedent), type `group_journey_enrollment`, fan-out to active members excluding the actor.

**Build finding (gate-amended):** the v1 viewer block could not serve FEAT-H019 STORY-5's "affordance per the payload" rule — `get_journey_detail` was replaced in place additively: `individual_enrollment {enrollment_id, status}` + per-`enrolled_via` `enrollment_id`/`status`/`can_withdraw` (`unenroll_from_journey` resolved platform-side). Also bound at build: self-enrol's key resolves via `has_permission` Tier-1 (the FI Members baseline role carries `enroll_self_in_journey`; `handle_new_user` Step 7 binds every FIM — verified in seeds/04 + the signup-consent migration); group visibility (group-enrol + summary) mirrors `get_group_detail`'s full gate incl. the PC015 wields branch via the internal `_journey_party_visible()`; `get_my_enrollments` admits a materialised Mist (empty until J-E) and refuses an actorless session `42501`, never a silent empty.

**Test evidence (red-first TDD):** the 35-test integration suite was demonstrated red before the migration existed (39 failed / 2 passed — the two greens are labelled existing-substrate verifications: the Mist direct-INSERT refusal and the reads-stay-RLS-scoped regression guard), green post-apply; the 2 amendment asserts were demonstrated red against the applied v1 payload, green post-amendment — **37/37**. Full integration sweep **339/339** after the base migration (no regressions). The direct-caller question's answer is recorded in the migration header and PR #116.
