# FEAT-PD006: Onboarding designation, the Mist-scoped enrolment gate, and first-arrival contracts — ADR-U045 realized

---
id: FEAT-PD006
title: Onboarding designation and first-arrival contracts
owner: platform/domain/journeys
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

ADR-U045 designates exactly one journey as the onboarding journey — the one journey a Mist (anonymous entrant) may walk, auto-launched at first arrival for both a Mist and a brand-new FIM, its progress carrying across Mist→FIM transcendence. The substrate to express any of this is **absent**: there is no designation column or registry anywhere (`journeys` carries `is_published`/`is_public`/`journey_type` but nothing marking an onboarding journey — confirmed by a full `supabase/` sweep), self-enrolment is flatly FIM-only (`enroll_self_in_journey` raises `42501` on a Mist via an `is_temporary` guard — `FEAT-PD003` migration, the guard already comment-tagged for this replacement), no read tells a Surface whether a caller has ever arrived into onboarding, and no onboarding journey is seeded (the 8 seeded journeys are all ordinary published journeys; none is a Journey Zero).

JRN-5's carry-over, by contrast, is **already continuity-free at the substrate** — `finalise_transcendence` (FEAT-PC002) mutates only `is_temporary = false`, preserving the personal group, and `journey_enrollments` are `group_id`-keyed to that personal group, so a Mist's enrolment and step-instances survive transcendence with no data move. JRN-5's platform work is therefore *proof*, not mechanism.

This is the platform half of JRN-5 + JRN-15, consumed API-first by the Hub ([FEAT-H023](../../../products/hub/features/FEAT-H023-onboarding-arrival-and-carry-over.md)) and any future surface (the Gimbal). Per ADR-U038 every rule lives platform-side: the designation, the identity gate, and the first-arrival logic are RLS/RPC/index, never a Hub route.

## Implementation notes

*(Built Cycle J-E 2026-07-10; **gate nodded and merged the same day** — PR #163, Stefan's explicit merge go-ahead executed via the permission gate; the two migrations were applied to the production project and repaired in-session before the merge. Tasks TASK-JE-01..03 `done`.)*

- **Migrations:** `20260710170000_feat_pd006_onboarding_designation_arrival_contracts.sql` (the two columns + the partial unique index + both contract touches) and `20260710171000_feat_pd006_onboarding_journey_seed.sql` (the native-seeded placeholder, 4 steps, DeusEx-owned). Applied to the dev DB and repaired in-session; the schema gate holds the merge.
- **The gate change, surgically:** the Mist branch admits exactly the designated journey, and only that branch bypasses `has_permission` — the FIM path keeps both gates everywhere, onboarding included; Tier-1 (the context-free system-group grant via FringeIsland Members, `04_system_groups.sql:48`) is what resolves the FIM permission gate for the DeusEx-owned journey, verified at build. **One delta inside the same replacement:** the visibility disjunction gains `or j.is_onboarding_designated` — without it first-arrival enrolment dies P0002 for Mist *and* brand-new FIM (`is_public=false` and no other disjunct fires on a first arrival). The front door is unavoidable-but-unwalled (Amendment 1): out of browse, never out of reach.
- **Seed decisions (gate items 4+5):** the catalogue filter is `is_published AND (is_public OR owning-group-member OR enrolled OR admin)` — `is_public=false` hides onboarding from every non-enrolled browser (pinned by test), and the owner is **DeusEx** (deliberately not FringeIsland Members: every FIM is a member there, and the member-disjunct would leak it into every browse view). **Nuance surfaced for the gate:** once a traveller is auto-enrolled, the existing enrolled-visibility disjunct admits the onboarding journey into *their own* catalogue payload (pinned by test as current semantics — nobody *discovers* a journey they already walk; excluding it would be a third contract touch beyond this spec's declared scope). Placeholder: 4 native steps (welcome narrative first, two reflections, one optional narrative), throwaway content, re-authoring hook comment planted for CQ-010.
- **Tests (red-first):** the 19-test integration suite `onboarding-designation-arrival-contracts.test.ts` — **17 demonstrated red** (columns/function/seed absent; FIM-onboarding P0002; Mist-onboarding 42501), 2 labelled pins (a Mist stays refused off-onboarding; a FIM's ordinary-journey path unregressed); green post-apply **19/19**. STORY-4 carry-over and STORY-6 ephemerality are **labelled proofs over existing machinery** (`finalise_transcendence` continuity; the `explicit_erase_mist` cascade), not TDD. Journeys domain **134/134**; full sweep **438/438** (39 suites). **One labelled sibling adaptation:** PD003's migrated-provenance invariant is now all-or-nothing per journey (the PD006 seed is the first authored-NATIVE journey — `legacy_step_id NULL` by design) plus a non-vacuity sanity assert; the PD002 Mist-refusal test retitled to its realized semantics.

## Solution sketch

One schema-gate migration + one seed, all over the existing `journeys` / `journey_enrollments` / `journey_steps` substrate. No new table.

**Schema (2 additive columns on `journeys`):**
- `is_onboarding_designated boolean NOT NULL DEFAULT false` — designation as data (ADR-U045 §1). A **partial unique index** `WHERE is_onboarding_designated` guarantees at-most-one designated journey at the substrate — the "exactly one" rule lives in the database, not in code. A boolean, not a vocabulary (ADR-U018-clean: nothing to seal).
- `takeaway jsonb` (nullable, tagged `pending-DS-4`) — the journey-level closing word (ADR-U046 §4). Needed because the seed's own `_migrate_journey_content_steps()` NULLs `journeys.content`, so a journey-level takeaway has nowhere else to live; per-step takeaways ride the existing `journey_steps.content` payload. Rendered at J-F, seeded here.

**Contracts:**
- **Replace `enroll_self_in_journey(p_journey_id)` in place** (the ADR-U045 disposition already tagged in `PD003`). New identity gate: a FIM enrols in any published journey (unchanged); a **Mist enrols iff `p_journey_id` is the designated onboarding journey**, else `42501`. On the Mist-onboarding branch the second gate — `has_permission(actor, journey.created_by_group_id, 'enroll_self_in_journey')` — is **bypassed**: the designation *is* the authorization (a Mist holds no permission in the onboarding journey's owning group). FIM path keeps both gates. Everything else (duplicate refusal, `status='active'`, party = personal group) is unchanged.
- **`get_onboarding_status() → jsonb`** — the single first-arrival read. Returns `{onboarding_journey_id, has_enrollment, has_completed}`: the designated journey's id (or `null` if none designated — defensive), whether the caller has *ever* enrolled in it (`is_enrolled_in_journey`, no status filter — a withdrawn/completed row still counts as "has arrived once"), and whether a `completed` enrolment exists. Callable by **Mist and FIM** (grant to `authenticated`); an actorless session is refused `42501`, never a silent empty. Per ADR-U045 Amendment 1 there is no `opted_out` field — auto-launch fires only when `has_enrollment` is false.

**Seed — the placeholder onboarding journey (ADR-U045 §5):** a new `predefined` journey, `is_published=true` (a valid enrollable published journey for the FIM path) and `is_public=false` (kept out of the browse catalogue — it is not a discovery target), `is_onboarding_designated=true`. Seeded as **native `journey_steps` rows** (not via the legacy `content.steps[]` conversion path — this is a brand-new ADR-U044-native journey, and native inserts let the seed carry per-step `content` payloads including the ADR-U046 per-step takeaway keys, which the legacy conversion would not). Throwaway welcome-and-a-few-steps content; a journey-level `takeaway`. The real content arrives at the first-experience (CQ-010) work — a re-authoring hook is planted at the seed.

**Proofs (no new mechanism):**
- **JRN-5 carry-over** — an integration test enrols a Mist in onboarding, advances a step, runs `finalise_transcendence`, and asserts the same `enrollment_id` + step-instances survive on the same personal group, `is_temporary` now false, resume pointer intact.
- **Ephemerality** — a Mist's onboarding enrolment + step-instances are erased by the existing ADR-U031 path (row-delete cascade), proven by test over the house erasure function, not a bare delete.

## Appetite

One schema-gate migration + one seed + the two contract touches, with the carry-over and ephemerality proofs as tests over existing machinery. Comparable to PD002 (contracts-over-substrate), lighter than PD003 (no new tables). A few days.

## Rabbit holes

- **The catalogue filter.** Confirm whether `get_journey_catalog` filters on `is_published` or `is_public` before trusting `is_public=false` to keep the onboarding journey out of the browse catalogue — pin it with a test either way (the onboarding journey must not surface as a discovery result).
- **The second enrolment gate.** The Mist-onboarding bypass of `has_permission` must be surgical — bypass *only* on the designated-journey + Mist branch; a FIM, and a Mist on any other journey, keep the full gate. Adversarially test that a Mist cannot ride the bypass onto a non-onboarding journey.
- **Native-seed vs conversion.** Seeding the placeholder as native `journey_steps` diverges from the house `content.steps[]` + `_migrate` pattern. Keep the divergence honest and commented; don't let the parity-guard machinery half-run over it.
- **Single-designation race.** The partial unique index is the guarantee; don't also try to enforce single-designation in application code (belt-and-suspenders that can disagree). The index is the single source of truth.

## No-gos

- No response capture and no review rendering — those are J-F (ADR-U046 §6). This feature seeds takeaway content; it does not read it back or capture traveller input.
- No opt-out / skip-onboarding store (ADR-U045 Amendment 1).
- No designation *authoring* surface — designation is seed/data-defined until Journey Studio exists (ADR-U026).
- No change to `enroll_group_in_journey` — group enrolment stays FIM-only (ADR-U045 scopes only self-enrolment for the Mist).
- No new first-arrival state in PC-2 — enrolment-absence keyed on the personal group is the entire first-arrival signal.

## Stories

### STORY-1: Designate exactly one onboarding journey
As the platform, I want exactly one journey markable as the onboarding journey, so that the Mist gate and the arrival read have a single unambiguous target.

**Acceptance criteria:**
- Given the migration has run, when `journeys` is inspected, then `is_onboarding_designated boolean NOT NULL DEFAULT false` exists and a partial unique index covers `WHERE is_onboarding_designated`.
- Given one journey already designated, when a second journey is set `is_onboarding_designated=true`, then the write is refused by the unique index (single-designation enforced at the substrate, not in code).
- Given no journey designated, when `get_onboarding_status()` is called, then `onboarding_journey_id` is `null` and no error is raised.

### STORY-2: A Mist enrols in — and only in — the designated onboarding journey
As a Mist, I want to enrol in the onboarding journey, so that I can walk it before deciding to transcend; and I must not be able to enrol in anything else.

**Acceptance criteria:**
- Given a materialised Mist and the designated onboarding journey, when they call `enroll_self_in_journey(onboarding_id)`, then an enrolment exists (`group_id` = their personal group, `status='active'`), even though they hold no permission in the journey's owning group.
- Given a materialised Mist and any non-onboarding published journey, when they call `enroll_self_in_journey(other_id)`, then `42501` — the FIM-only gate still holds everywhere but onboarding.
- Given a FIM and any published journey, when they call `enroll_self_in_journey(id)`, then enrolment succeeds exactly as before this feature (both gates run; no regression).
- Given a direct PostgREST caller (any client role, including a Mist), when they attempt to INSERT into `journey_enrollments` or set `is_onboarding_designated` directly, then the substrate refuses — designation and enrolment exist only through the contracts / seed.

### STORY-3: The first-arrival read
As a Surface, I want one read that tells me whether to auto-launch onboarding for the current caller, so that the "never arrived" logic lives platform-side.

**Acceptance criteria:**
- Given a caller who has never enrolled in onboarding, when they call `get_onboarding_status()`, then `has_enrollment=false` and `has_completed=false` and `onboarding_journey_id` is the designated id.
- Given a caller with any onboarding enrolment (active, completed, or withdrawn), when they call `get_onboarding_status()`, then `has_enrollment=true` (arrival is recorded regardless of later status).
- Given a materialised Mist, when they call `get_onboarding_status()`, then it succeeds (Mist-callable); given an actorless session, then `42501`, never a silent empty.

### STORY-4: Enrolment and progress carry across transcendence (JRN-5)
As a Mist who started onboarding, I want my progress preserved when I transcend to a FIM, so that nothing restarts.

**Acceptance criteria:**
- Given a Mist enrolled in onboarding with at least one completed step-instance, when `finalise_transcendence` runs, then the same `enrollment_id` and step-instances persist on the same personal group, `is_temporary` is now false, and the resume pointer is unchanged.
- Given the carried enrolment, when the now-FIM calls `get_player_state(onboarding_id)`, then it resumes at the same step — no new enrolment row, no step-1 restart.

### STORY-5: The placeholder onboarding journey is seeded (ADR-U044 structure + ADR-U046 takeaway seed)
As the platform, I want a real-structured placeholder onboarding journey, so that JRN-5/JRN-15 build and E2E-prove against a real journey and J-F has takeaway content to render.

**Acceptance criteria:**
- Given the seed has run, when the onboarding journey is inspected, then it is `predefined`, `is_published=true`, `is_public=false`, `is_onboarding_designated=true`, with ordered native `journey_steps` rows typed against the seeded registries (a welcome step first).
- Given the seeded journey, when its steps and journey row are read, then per-step `content` payloads carry the ADR-U046 per-step takeaway keys and `journeys.takeaway` carries the journey-level closing word (both `pending-DS-4`).
- Given the onboarding journey, when `get_journey_catalog()` is called, then it does **not** appear (kept out of the browse catalogue).

### STORY-6: A Mist's onboarding data is forgotten (ADR-U031 ephemerality)
As the platform, I want a drifting Mist's onboarding enrolment and progress erased, so that abandonment leaves nothing behind.

**Acceptance criteria:**
- Given a Mist enrolled and progressed in onboarding, when the ADR-U031 erasure path runs (via the house erasure function, not a bare delete), then the enrolment and its step-instances are gone, cascading cleanly.

## Platform dependencies

- **PC-2 Identity:** the `is_temporary` FIM/Mist distinction (the gate); `finalise_transcendence` (JRN-5 carry-over — consumed, not modified); ADR-U031 ephemerality path.
- **PC-3 Organisation:** `get_current_personal_group_id()` (P-O1 four-hop actor); `has_permission()` + the seeded `enroll_self_in_journey` key (the FIM path); the personal group as enrolment party (ADR-U020).
- **DS-3 self:** `is_enrolled_in_journey`, `enroll_self_in_journey`, `get_player_state`, the `journey_steps` / `journey_step_instances` substrate (FEAT-PD002/PD003), and the seed conversion machinery.

## Cross-product impact

The Gimbal inherits every contract unchanged (API-first, ADR-U009) — first-arrival auto-launch is a senses-surface arrival too. The arrival read and the Mist-scoped gate are surface-agnostic; only the launch UX differs by surface (Hub owns its own, FEAT-H023).

## Vertical impact

- **Privacy/GDPR:** a Mist's onboarding enrolment + progress are personal developmental data under ADR-U031 ephemerality (TTL + explicit erase, cascading). Carry-over at transcendence moves nothing new — the personal group is preserved. No comparative surface (invariant 8) is introduced.
- **Notifications:** none this feature (no milestone/enrolment notification is authored here; the onboarding journey's own completion notification rides the existing JRN-12 `journey_completed` machinery if it fires — not in scope to add).
- **Administration:** designation is seed/data-defined (no admin surface); no lifecycle cascade changes (enrolment freeze/withdraw semantics are unchanged from PD002/PD003).
- **Observability:** the two contract touches emit content-free structured events at their consuming routes (FEAT-H023); refusals are SQLSTATEs (`42501`), never silent empties; the migration is traceable.
- **Transactions:** none — onboarding sells nothing.
- **Extensibility:** designation is a boolean, not a vocabulary — nothing to seal. The placeholder's steps type against the existing open registries (ADR-U008/U018); no new sealed sets. `takeaway` is free-form JSONB (`pending-DS-4`).

## Performance budget

N/A (no surface). The `get_onboarding_status()` read is a single indexed lookup (designated journey via the partial index + one `is_enrolled_in_journey` existence check); the consuming first-paint budget is FEAT-H023's (B1 arrival path).

## Schema-gate decisions (surfaced for the review gate)

1. **Designation mechanism** — boolean flag + partial unique index (JE-1, Stefan 2026-07-09). Decided; the gate confirms the index shape.
2. **Journey-level takeaway home** — nullable `journeys.takeaway` JSONB, `pending-DS-4` (JE-2, Stefan 2026-07-09). Decided.
3. **First-arrival read shape** — dedicated `get_onboarding_status()` (JE-3, Stefan 2026-07-09). Decided.
4. **Catalogue filter (`is_published` vs `is_public`)** — confirmed at the gate against `get_journey_catalog` so `is_public=false` reliably hides onboarding from browse.
5. **Placeholder step count + throwaway content** — presented at the gate (welcome + a small number of steps; content is throwaway, structure is real).
