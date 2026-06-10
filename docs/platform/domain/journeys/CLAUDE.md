# CLAUDE.md — DS-3 Journeys

**Applies to:** anything under `docs/platform/domain/journeys*` and the corresponding code (DS-3's tables — `journeys`, `journey_enrollments` — RLS policies, SQL functions, journey routes, hooks, types, and Platform-API surface).
**Load order:** root [`CLAUDE.md`](../../../../CLAUDE.md) → [`AGENTS.md`](../../../../AGENTS.md) → [`PROCESS.md`](../../../planning/PROCESS.md) → the skill matching the task → [`../../CLAUDE.md`](../../CLAUDE.md) (platform tier) → [`../CLAUDE.md`](../CLAUDE.md) (domain sub-tier) → **this file** → [`../journeys.md`](../journeys.md) (the service spec) → the feature spec.
**Reads as a delta.** Assumes root, platform-tier, and domain sub-tier `CLAUDE.md` are already loaded. Contains only what's specific to DS-3.

---

## What makes this entity different

DS-3 owns the **structured travel of travellers through the experience** — journeys as content templates, steps, enrolments, progress, the delivery runtime, respawn delivery, loop runtime state, and signature-vs-charter personalisation — never narrative structure (DS-2), respawn position resolution (DS-1), or content (DS-4). Its developmental ground truth is the personal-growth core ([`docs/ecosystem/universe/personal-growth/README.md`](../../../ecosystem/universe/personal-growth/README.md)) plus the narrative core's journeys line. The service was renamed from "Experience Engine" at its descent ([`PENDING.md`](../../../architecture/decisions/PENDING.md)) — older material may carry the old name; *experience* is identity-layer vocabulary and never re-enters this entity's naming. **DS-3 is the first Domain Service with realized code substrate** — unlike DS-1/DS-2, work here reconciles against live tables, policies, and surfaces (see the spec's §L3 Step 2 block before assuming anything is greenfield).

## Rules that only apply at this entity

- **The eight service-level invariants in the spec's §7 are architecture, not features.** Meta-safety in delivery; growth pressure = Void distance (never bodily distance); voluntariness (Immunity to Change as the personalisation compass); developmental privacy (Stewards/Guides cannot read private developmental data — enforced in RLS, not product filters); entertainment-first; non-closure; transcendence continuity (atomic, nothing restarts); no comparative-progress surface (no leaderboards, no "behind/ahead", to any consumer). A feature spec or migration violating one fails review.
- **The respawn three-way split (ratified 2026-06-10):** DS-1 resolves respawn *position*; DS-2 declares *topologies, textures, return shapes*; DS-3 delivers the *experience* — composing both, authoring neither. Don't re-derive position mechanics or loop declarations here.
- **Loop runtime state and per-FIM pacing are DS-3's (resolved DS-2 §8 Q1+Q2, 2026-06-10)** — and with them the personal-data weight: per-traveller runtime state, persisted loop outcomes, and personalisation state are FIM/Shadow personal data; Shadow-generated state inherits ADR-U027 TTL-erasure.
- **Journeys are content templates; groups enrol (ADR-U017/U020).** The enrolment party is always a PC-3 group — personal group for solo, two-member group for pairs. Never add a `user_id` to an enrolment; never model a journey as an organisational node.
- **Equipment is declared at authoring, named by equipment, never by device (ADR-U025).** The Game is a depth setting in the depth registry, not a product or a fork of this service.
- **Every kind-vocabulary is a registry, and the step-kind system is the canonical extension surface (ADR-U008).** The realized `journey_type`/`difficulty_level` CHECK lists and the sealed TS `StepType` union are inherited closure patterns scheduled for registry-ization at the code correction target — do not extend them with new CHECK values; a new kind motivates the registry migration instead. The step-type specification session ADR-U008 mandates (now carrying three vocabularies — see spec §8 Q1) precedes significant step-system implementation.

## Gotchas

- **Progress is per-enrolment on disk, per-traveller in the architecture.** `journey_enrollments.progress_data` is enrolment-grain JSONB; group journeys must not carry developmental state until the per-traveller grain exists (invariants 4+8). Don't put per-FIM data into the shared enrolment row as a shortcut.
- **The enroll route is the sanctioned custom-route exception, and it open-codes service-role plumbing.** `app/api/v1/journeys/[id]/enroll/route.ts` is the A#9 three-justification case, but its service-role construction + JWT/profile plumbing is a PC-1 Finding #4 instance — when the two-tier centralization lands, this route migrates; don't clone its pattern into new routes.
- **PC-4/PC-3-tier lifecycle functions write DS-3 tables directly** (admin reassignment, enrolment freeze on leave/exit, DeusEx transfer of non-public journeys). The publish-primitives-vs-direct-write question is an open substrate question routed to pickups — don't add new cross-tier writes without surfacing it.
- **The RLS recursion trap is live here:** `is_enrolled_in_journey` / `is_journey_enrollable` exist precisely because journey policies query enrollments and vice versa (sprint0). Extend the helpers; don't inline cross-table subqueries into journey RLS.
- **Transcendence migrates journey state.** A Shadow's enrolments/progress/loop state are "the session's experience" under ADR-U027's atomic, nothing-restarts migration — any new Shadow-touching DS-3 table joins that cascade spec (ADR-U016, jointly with PC-2) before build.

## Where to go next

- **The service spec:** [`../journeys.md`](../journeys.md) — L2 identity + §7 invariants + §L3 capability inventory (Steps 1-3 complete 2026-06-10; first non-zero-delta stress-test — 6 capabilities partially realized, 9 full forward-commitment).
- **Ground truth:** the personal-growth core (+ three-questions, engagement-spectrum, privacy-model sub-pages); the narrative core (respawn section + journeys line); cosmology core (sections 8 + 10); roles core (Wayfinder; Steward/Guide/Participant/Observer); universe-discovery S19 (signature vs charter).
- **Relevant decisions:** ADR-U023 (anatomy) · ADR-U025/U026 (equipment, depth, Journey Studio writes → DS-3) · ADR-U017 (journeys as content templates) · ADR-U020 (pairs are groups) · ADR-U008/U018 (non-closure; step types) · ADR-U027 (Shadow lifecycle) · ADR-U016 (cascade first) · the rename and Whisp-split entries in [`PENDING.md`](../../../architecture/decisions/PENDING.md).
