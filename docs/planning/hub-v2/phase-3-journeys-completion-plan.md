# Phase 3 — Journeys (A-JRN) completion plan

**Status:** Living plan (v2, 2026-07-07). **Decision board SETTLED 2026-07-07** (Stefan — all answers recorded below; the two design sessions ran in-session and landed [ADR-U044](../../architecture/decisions/ADR-U044-journey-step-model.md) + [ADR-U045](../../architecture/decisions/ADR-U045-onboarding-journey.md), both held for the merge nod per the carve-outs). Next: decompose Cycle J-A.
**Parent plan:** [`README.md`](./README.md) (Hub v2 rebuild, Phases 0–4). Pattern: [`phase-3-groups-completion-plan.md`](./phase-3-groups-completion-plan.md).
**Wave:** Ferd. **Canonical capability inventory:** [`../../products/hub/SPECIFICATION.md`](../../products/hub/SPECIFICATION.md) §L3 (A-JRN — 18 capabilities, JRN-1..18). This plan references it; §L3 is the authority. **Platform half:** DS-3 Journeys ([`../../platform/domain/journeys.md`](../../platform/domain/journeys.md), feature prefix **PD** — the area authors the first FEAT-PD specs). **This is the first area bound by [ADR-U043](../../architecture/decisions/ADR-U043-performance-budgets.md)** — every spec carries the Performance-budget section; the area gate includes the measured waterfall + Stefan's live walk.

---

## Where this picks up

The Groups area closed 2026-07-06 ([retro](../retrospectives/retro-2026-07-06.md)): G-A..G-F all `6-done`, MEM-9 the only forward-seam. Next area in the Phase-3 dependency order: **Journeys (A-JRN)** — the primary developmental experience, sitting on the social substrate Groups just finished. At this area (per the Groups plan §After Groups): DS-3 realised → advance IDN-10's enrolment-freeze disposition + fill GRP-4's enrolment-summary seam.

### Substrate audit at kickoff (full depth, verified 2026-07-07)

- **Hub side: zero Journeys surface.** No journey page, route, component, or test exists under `hub/` — every journey artifact lives in the retired `hub-legacy/` tree. All 18 A-JRN rows are unspecced forward-commitment (Hub §L4 coverage note); the first Hub spec is FEAT-H019.
- **Platform side: the schema is realised and seeded; the contract layer is absent** — the same "RLS-table-driven with no contract layer" shape every Groups cycle found. `public.journeys` + `public.journey_enrollments` (D15 rebuild `20260222000000`, RLS recreated by sprint0 `20260228102720`), two SECURITY DEFINER helpers (`is_enrolled_in_journey`, `is_journey_enrollable`), and the journey-management permission keys already in the 44-row catalog (`enroll_group_in_journey` — seeded on the Steward template — plus `unenroll_from_journey`, `freeze_journey`, `publish_journey`, `unpublish_journey`; `supabase/seeds/01_permissions.sql`, `02_role_templates.sql`). 8 predefined journeys seeded under the "FringeIsland Journeys" engagement group (`seeds/05_professional_pathfinders.sql`). **No enrolment/progress/catalog RPC exists** — the platform half is contracts-over-proven-rules, matching the Groups precedent.
- **DS-3 spec state:** §L3 filled (15 capabilities), Step 2/3 complete with forward-commitment classification — 6 partially realised (registry, steps, enrolment, progress, delivery, authoring), 9 full-forward (equipment, depth, attachment, Mist enrolment, loops, respawn, persistence, personalisation, pacing). The area consumes the partially-realised six; the nine full-forward rows are **not** A-JRN scope (no JRN row references them).
- **The recovered design record (the kickoff's biggest find):** the **Journey Designer session of 2026-03-20** ([`../sessions/2026-03-20-SESSION-01-journey-designer.md`](../sessions/2026-03-20-SESSION-01-journey-designer.md)) — the universal step grammar (Present → Ask → Change), Node/Beat containment, the beat record with the six content families, four route types, step-instances-as-lived-records, all stress-tested and status-tabled — existed in the planning tree but had never been absorbed into the canon cores (the DS-3 derivation did not consume it). **ADR-U044** adopts its journey grammar as the step model's DNA and puts the session into the authority chain permanently. The legacy de-facto model (47 seeded steps, flat five-field objects, cosmetic type branching) migrates mechanically.
- **Freeze semantics are procedural, not trigger-standing:** enrolment freezes (`status='frozen'` + `progress_data.frozen_reason` of `group_closed`/`group_archived`) live inside the PC013/PC014 contract cascades (`leave_group` replacement; `close_group`; `delete_group`). Bridge `_14` commissions **re-verification at this area** — seeded as red-first tests where JRN-14 (frozen read-only mode) builds. Known documented gap: the last-leader-removal trigger bypasses on `closed` only, not `archived` (PC014 migration notes).
- **JRN-4 is buildable now:** group enrolment wields via `act_as_group` + `get_acting_contexts()` (ADR-U041, realised through PC015 + the 2026-07-06 post-close fixes — "Surface offers only flagged contexts, never self").
- **JRN-5's substrate is continuity-free:** `finalise_transcendence` (PC002) preserves `personal_group_id` ("same row, same personal group — nothing restarts"), and enrolments are personal-group-keyed, so a Mist's enrolment carries over automatically at transcendence. The canon half (may Mists enrol?) was settled at this kickoff: **ADR-U045** — one designated onboarding journey, Mist access scoped to it, auto-launch with opt-out.
- **Legacy oracle: STRONG** ([behaviour-inventory](./behaviour-inventory.md) §A-JRN — catalog/detail visibility incl. direct-ID prevention, individual + group enroll with dual-enrollment detection, progress/resume/completion incl. idempotency, frozen immutability via the security suite, publish). Named oracle gaps specified fresh from canon: Mist carry-over (JRN-5 → ADR-U045), the inline→DS-4 decision (→ ADR-U044), pause/leave lifecycle thin.
- **Perf posture:** `journey_enrollments` is advisor-flagged for duplicate permissive RLS policies (perf backlog P3b) — a natural boundary-bet candidate **if** measurement points at the DB layer. The amended boundary-bet rule (ADR-U043 / Groups retro §4) binds: **measure the area-gate waterfall first, then choose**; a budget miss requires at least one felt-path item in the bet.

## The 18 capabilities (from §L3, with cycle)

Descriptions + dependencies from `SPECIFICATION.md` §L3 (A-JRN block). FEAT-PD/FEAT-H IDs are assigned at decomposition (paired-spec rule). **All 18 build in-area (J-O4, settled).**

| ID | Capability | Internal dep | External dep (per §L3) | Cycle |
|----|-----------|--------------|------------------------|-------|
| JRN-1 | Browse journey catalogue | DIS-1 | DS-3, DS-6 | **J-A** (DS-3 catalog reads; DS-6 seam) |
| JRN-2 | View journey detail | JRN-1 | DS-3, DS-4 (preview) | **J-A** |
| JRN-3 | Enrol self (individual) | IDN-3 ✓, JRN-2 | DS-3, PC-3 | **J-A** |
| JRN-4 | Enrol an engagement group | GRP-1 ✓, GRP-8 ✓, JRN-2 | DS-3, PC-3 | **J-A** (wielding walk) |
| JRN-5 | Preserve enrolment across Mist→FIM | JRN-3, IDN-2 ✓ | DS-3, PC-2 | **J-E** (ADR-U045) |
| JRN-6 | Render the journey player | JRN-3, JRN-4 | DS-3, DS-4 | **J-B** |
| JRN-7 | Walk steps, linear navigation | JRN-6 | DS-3 | **J-B** |
| JRN-8 | Step completion + required-step gating | JRN-6 | DS-3 | **J-B** |
| JRN-9 | Auto-save progress | JRN-6 | DS-3 | **J-B** (step-instances per ADR-U044) |
| JRN-10 | Resume from last position | JRN-9 | DS-3 | **J-B** |
| JRN-11 | Per-step time + total elapsed | JRN-6 | DS-3 | **J-C** |
| JRN-12 | Detect + mark completion | JRN-8 | DS-3 | **J-C** |
| JRN-13 | Review mode for completed journeys | JRN-12 | DS-3, DS-4 | **J-C** |
| JRN-14 | Frozen-enrolment read-only mode | JRN-6, MEM-* ✓ | DS-3, PC-3 | **J-D** (+ freeze re-verification) |
| JRN-15 | First-arrival auto-launch | IDN-3 ✓ | DS-3, PC-2 | **J-E** (ADR-U045) |
| JRN-16 | Group-level progress (role-gated) | JRN-4, GRP-8 ✓ | DS-3, PC-3 | **J-D** |
| JRN-17 | Per-member progress (role-gated, privacy-respecting) | JRN-4, GRP-8 ✓ | DS-3, PC-3, PC-4 | **J-D** |
| JRN-18 | Render every foundational step type | JRN-6 | DS-3 (step-type catalogue), DS-4 | **J-B** (registry per ADR-U044) |

## The cycle sequence (Foundation-first, paired-platform-first)

Same execution shape as Identity/Groups: platform half (FEAT-PD) authored to `4-ready` and built through its schema gate first, then the Hub half (FEAT-H) consumes it API-first; red-first throughout; decompose/build sessions alternate. **All specs carry the ADR-U043 Performance-budget section (first area, no retrofit) with data-boot classification per ADR-U042.**

| Cycle | Capabilities | Notes / risks |
|-------|--------------|----------------|
| **J-A — Catalogue & enrolment** | JRN-1, 2, 3, 4 + GRP-4 enrolment-summary slot fill | **Decomposed 2026-07-07:** [FEAT-PD002](../../platform/domain/features/FEAT-PD002-journey-catalogue-and-enrolment-contracts.md) (the first DS-3 feature spec) ↔ [FEAT-H019](../../products/hub/features/FEAT-H019-journey-catalogue-and-enrolment.md), both `4-ready`, + the [FEAT-PC016](../../platform/core/features/FEAT-PC016-pending-nominations-read-contract.md) rider (`get_my_pending_nominations()` mirroring `get_my_invitations()`; `leadership.ts` thins — closes the audit LOW finding) on PD002's schema-gate migration. Platform half: six contracts over the existing RLS + permission keys, no new table. **Anatomy correction found at decomposition:** the GRP-4 enrolment summary is a **DS-3 read** (`get_group_enrollment_summary`) composed at the Hub's group-detail BFF as a failure-isolated slice — *not* an additive `get_group_detail` field, which would put a Core→Domain read inside PC-3 (one-way rule, ADR-U023). Enrolment contracts are FIM-only at J-A with the **ADR-U045 disposition tagged** (replaced in place at J-E to admit the designated onboarding journey for Mists). The org-spec §5 seeding-sites staleness fix rides as a docs item (already routed via doc-health at PC010). Perf: catalogue/detail are B2/B3 surfaces; justified standalone reads + session cache (not overview-bundle slices — navigation targets, not first-paint). |
| **J-B — Player core** | JRN-6, 7, 8, 9, 10, 18 | Schema follows **ADR-U044**: step rows (single-beat nodes), step-kind + content-family registries, per-traveller step-instances (the J-S2 grain — RLS traveller-own, Steward/Guide reads consent-gated per DS-3 invariants 4 + 8); the 47 legacy seed steps migrate mechanically; `progress_data` demotes to summary/cache. Perf: the player is the area's B5-critical surface — step navigation must paint ≤ 200 ms (optimistic advance, background save; skeleton-over-spinner per B6). Heaviest cycle. |
| **J-C — Completion & review** | JRN-11, 12, 13 | Completion detection server-side (oracle: idempotent, sets `completed_at` once); durable completion notification row (V3; push rides the Notifications area). Review mode is a read posture over the player. |
| **J-D — Group progress & frozen mode** | JRN-14, 16, 17 | Per-member progress reads over the ADR-U044 step-instances, consent-gated (PC-4; never comparative). **Carries the freeze re-verification** (bridge `_14`): red-first tests over the PC013/PC014 freeze cascades (`group_closed`/`group_archived` reasons) + JRN-14 rendering them; advances **IDN-10's enrolment-freeze disposition** (G-36 hook #4). |
| **J-E — The onboarding arc** | JRN-5, JRN-15 | Per **ADR-U045**: designation-as-data (registry/flag through the schema gate); placeholder onboarding journey seeded (ADR-U044 structure, throwaway content; re-authoring hook planted at the first-experience/CQ-010 work); auto-launch for Mists at arrival AND new FIMs at first sign-in, opt-out honored; JRN-5 proven by E2E across transcendence (continuity is realized substrate); forgetting proven by test over the existing ADR-U031 ephemerality machinery — no new mechanics. |

Order rationale: internal deps force A → B → (C, D) → E; C and D are mutually independent and can swap if a platform half stalls; J-E needs the player (a Mist walking the onboarding journey IS the player) so it closes the area.

---

## Design sessions — RAN 2026-07-07, both landed

- **J-S1 — The step-model session (ADR-U008-mandated)** → **[ADR-U044](../../architecture/decisions/ADR-U044-journey-step-model.md)**. The dig recovered the 2026-03-20 Journey Designer session; ADR-U044 adopts its grammar (Present → Ask → Change; step rows as single-beat nodes; step-kind + content-family registries; ADR-U008 Tier-1 types as registry presets; legacy union dies; Node/Beat/Roads/pacing recorded as forward shape) and puts the session into the authority chain permanently. DS-3 §8 Q1 resolves to it.
- **J-S2 — Progress grain** → folded into **ADR-U044 §4**: per-traveller step-instance rows (enrolment × traveller × step) realize both the progress grain and the Designer's step-instance concept — two decisions, one structure.

## Decision board — SETTLED 2026-07-07 (Stefan)

> All recommendations accepted except where noted; J-O1/J-O2 were answered with **new canon** that unified them (→ ADR-U045); J-O4 strengthened from the recommendation (all 18, not 16).

**Answered by existing canon:** J-A1 no realtime in Journeys (ADR-U039) · J-A2 catalogue rides DS-3 published reads, DS-6 ranking a tagged seam · J-A3 enrolment party always a PC-3 group, wielding per ADR-U041 · J-A4 authoring out of scope (Journey Studio, ADR-U026) · J-A5 journey-admin is Console scope (ADR-U028).

**Defaults confirmed:** J-D1 no CHECK-list extension; route-type mapping follows the ADR-U044 registry pattern at FEAT-PD time · J-D2 cycle grouping as tabled · J-D3 task files for every 4-ready feature · J-D4 kickoff-batch riders on J-A's migration · J-D5 perf classifications as drafted (no new overview-bundle slice).

**Open calls, settled:**

- **J-O1 + J-O2 (unified) → ADR-U045.** One designated onboarding journey (the old "Journey Zero", designation as data); Mist access scoped to exactly it; auto-launch at first arrival for **both** Mists and new FIMs (opt-out honored — advisable, sets the scene, jump-starts the FIM's relation with their Whisp and cord); progress carries at transcendence; forgotten via the existing ephemerality machinery if the Mist drifts or bails; placeholder content seeded now, real content at the first-experience (CQ-010) work.
- **J-O3 — measure first, then choose. MEASURED + CHOSEN (2026-07-07, [waterfall record](./2026-07-07-journeys-j-a-waterfall.md)):** the J-A production waterfall + Stefan's live walk passed every budget (no felt-path item forced); **the bet is P1-residual** (Stefan's pick on the measurement's recommendation — the sign-in landing's `/api/me/overview` bundle at ~870 ms is the largest app-side lever; P3b's "only if the DB layer" condition NOT met, stays parked; P4 unargued-for by the data). Ships within the area, verified at the area gate (exit checklist below).
- **J-O4 — all 18 rows build in-area** (JRN-5 + JRN-15 enabled by ADR-U045; J-E is the onboarding arc).
- **J-O5 — first-ever-cold budget: < 2 s** (Stefan, 2026-07-07). ~1.0 s is the Supabase auth-exchange vendor floor, so the app-controlled share is ≤ ~1.0 s. Recorded in the perf backlog; measured as its own scenario at the area gate. Formalises as an ADR-U043 addendum when that file is next touched.

## Exit checklist — the Journeys area gate (planted now)

Per-area gate (parent plan): feature DoD + vertical checklists + tests green + **performance gate (ADR-U043):** cold + warm authenticated waterfall on the production stable domain (≥ 3 runs per scenario, every run within budget) **and Stefan's manual live walk — both before the area retro.** The **first-ever-cold < 2 s scenario (J-O5)** is measured alongside.

Additionally, at the A-JRN gate:

- **Carried from the Groups plan (verbatim commitment):** the DS-3 freeze re-verification is demonstrated by tests (GRP-4 enrolment summary + MEM-5/6/7/8 freezes → `frozen` enrolments render read-only per JRN-14); the closed-vs-archived last-leader-trigger asymmetry has a recorded disposition.
- **IDN-10's enrolment-freeze disposition advanced** (G-36 hook #4): record what this area's freeze work closes; parked IDN-10 specs authored by next cooldown at latest (standing).
- **ADR-U045 hooks verified:** the placeholder onboarding journey's re-authoring hook is planted at the first-experience/CQ-010 work; JRN-5 carry-over E2E-proven across a real transcendence; forgetting proven over the ephemerality machinery; the auto-launch opt-out is honest (voluntariness invariant).
- MEM-9 untouched (Communication-gate item; not this area's).
- G-29 reviewed: the DS-6 catalogue-ranking seam recorded; depth>1 unchanged.
- Boundary bet (J-O3) verified shipped or explicitly re-parked — never silently dropped.
- The ADR-U044 registries verified non-closing (step kinds, families, route types, designation as data — Ferd non-closure); the sealed TS union is gone.
- Route-policy conformance green over the area's new routes (the PR #111 gate replaces the manual DoD rows).

## After Journeys

Per the parent plan's order: **Communication (A-COM, 15)** → Notifications (A-NTF, 10) → Platform-Ops (A-ADM, 18). At Communication: DS-5 realised → close IDN-10's forum disposition, un-park IDN-10 (Identity Cycle F), un-seam MEM-9 (hook set re-verified at that gate, per the retro's standing line).
