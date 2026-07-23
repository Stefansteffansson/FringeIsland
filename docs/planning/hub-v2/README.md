# Hub v2 — rebuild plan

**Status:** Living plan (v1, 2026-06-15). Subject to change as we learn — see the spec-evolution loop below.
**Decision record:** [ADR-U030](../../architecture/decisions/ADR-U030-hub-v2-greenfield-rebuild.md) · **Open question it closes:** CQ-015.
**Wave:** Ferd. **Features** live in the ecosystem tree under the Hub (`../../products/hub/features/`); this plan references them, it does not duplicate them.

---

## Current status

**Phase 1 — Target & inheritance (Done; gate PASSED 2026-06-24).** All three Phase-1 outputs exist: the refreshed Hub [DESCRIPTION](../../products/hub/DESCRIPTION.md) + [SPECIFICATION](../../products/hub/SPECIFICATION.md) (§L3 re-grounded anchor-neutral; U031/U028 reconciled), the [substrate audit](./substrate-audit.md) (substrate is canon-true and carries forward almost wholesale; the Mist lifecycle is the one substantial gap), and the [behaviour inventory](./behaviour-inventory.md) (the old suite's ~650 tests catalogued as the v2 oracle, with coverage map + silences). No v2 code yet; the old Hub MVP stays frozen as the behavioural oracle. **Canon dependency cleared (2026-06-21):** the three Phase-1 outputs were authored against the old "Shadow" vocabulary; the **Mist reconciliation pass** (Phase 1.5 — discovery Statements 47-48, [ADR-U031](../../architecture/decisions/ADR-U031-mist-identity-lifecycle.md) superseding U027; register [`../reference/mist-reconciliation-register.md`](../reference/mist-reconciliation-register.md)) re-grounded all three on the **Mist** identity state and ADR-U031, so the gate no longer carries stale vocabulary/mechanics into the walking skeleton. **Phase-1 gate verdict (2026-06-24): PASS** (Stefan) — the three outputs reviewed together against ADR-U030's thesis; nothing load-bearing missing or wrong; two non-blocking cleanups tracked as follow-ups (SPEC "42"->44 seeded-permissions; substrate-audit "deliverable 3, pending" cross-ref). **Phase 2 — Clean foundation (Done).** The walking skeleton landed: [FEAT-H001](../../products/hub/features/FEAT-H001-walking-skeleton-sign-in-and-groups.md) — sign-in -> land on `/groups`, end-to-end DB->API->frontend over the conformant substrate — is `6-done`, and its DoD *is* the Phase-2 gate (see [`phase-2-kickoff.md`](./phase-2-kickoff.md)). **Now active: Phase 3 — build area by area, Identity first.** [FEAT-H002](../../products/hub/features/FEAT-H002-credentialed-fim-sign-up.md) (credentialed FIM sign-up) and [FEAT-H003](../../products/hub/features/FEAT-H003-mist-identity-on-arrival.md) (Mist arrival = IDN-1) are `6-done`. **IDN-2** (Mist→FIM transcendence + farewell — [FEAT-PC002](../../platform/core/features/FEAT-PC002-mist-transcendence-reaper-consent.md) ↔ [FEAT-H004](../../products/hub/features/FEAT-H004-mist-transcendence-and-farewell.md), ADR-U033/U034) and **IDN-4** (own-profile contract + sign-out — [FEAT-PC003](../../platform/core/features/FEAT-PC003-self-service-profile.md) ↔ [FEAT-H005](../../products/hub/features/FEAT-H005-member-profile-and-sign-out.md)) are now `6-done` too — so the Identity capabilities every other area depends on (IDN-1..4, incl. IDN-3) are complete. The Identity long-tail (IDN-5..12) was sequenced and built via [`phase-3-identity-completion-plan.md`](./phase-3-identity-completion-plan.md) — **the Identity area closed 2026-07-03** ([cycle retro](../retrospectives/retro-2026-07-03.md)): 10 of 12 capabilities live (`6-done`), **IDN-12 parked** (needs deactivation-origin + self-pause), **IDN-10 a forward-seam** to after Journeys/Communication, when DS-3/DS-5 land. **Groups closed 2026-07-06, Journeys closed 2026-07-19** (area gates passed; COR-A anatomy correction executed 2026-07-19 — ADR-U047/U048). **Communication (A-COM) closed 2026-07-22** (area gate PASS with riders dispositioned). **Now kicking off: Notifications (A-NTF)** — see [`phase-3-notifications-completion-plan.md`](./phase-3-notifications-completion-plan.md) (v1; kickoff sweep complete, decision board OPEN — settle before Cycle N-A decomposes).

**Parallel thread (not a phase): CQ-016 — the Hub's experiential trajectory.** Runs *alongside* this build, not inside it — it blocks nothing in Ferd (the experiential mechanisms land Eid+), so the walking skeleton and the early Phase-3 areas proceed independently. Two sizes (see [CQ-016](../../ecosystem/thinking/OPEN_QUESTIONS.md)): a **framing slice** — does the DESCRIPTION convey the ambition, or undersell the Hub as a utility? — is runnable now in one focused session; the **full trajectory design** (wave-staging the experiential mechanisms) is multi-session and partly blocked, so it's deferred. **Coordination constraint:** the discovery's DESCRIPTION / §L3 / ROADMAP reconcile must land before Phase 3 reaches the experiential areas (Companion/Insight, Discovery) — a long runway, since those come last in the Phase-3 order.

## Phases at a glance

| Phase | What it does | Status |
|---|---|---|
| 0 — Lock the decision | Record the rebuild decision (ADR-U030); confirm pre-launch | **Done** |
| 1 — Target & inheritance | Refresh the Hub spec; audit the DB substrate; inventory old behaviours | **Done** (gate PASSED 2026-06-24) |
| 2 — Clean foundation | Walking skeleton: API-first layering, verticals baseline, design system, auth | **Done** (FEAT-H001) |
| 3 — Build area by area | Identity → Groups → Journeys → Communication → Notifications → Platform-Ops | **Active** (Identity, Groups, Journeys, Communication complete; Notifications kicking off — see [`phase-3-notifications-completion-plan.md`](./phase-3-notifications-completion-plan.md)) |
| 4 — Cutover & retire | Replace every area, then freeze and delete the old Hub | Upcoming |

*(Full detail with per-phase gates in Part 2 below. Update the Status column as phases complete.)*

---

## Part 1 — In plain words

**What FringeIsland is.** An edutainment platform for group-based personal development, built around three questions: *Who am I? What do I want? How do I get there?* The Hub is its first surface — the web app members and groups actually use.

**Where we came from.** There's a real, tested Hub MVP, built Feb–Mar 2026. Since then, ~3 months of deep architecture work defined the platform properly: Platform Core, seven Domain Services, the Extension System, five cross-cutting verticals, and the universe canon. The design ran well ahead of the code.

**Why a v2.** The MVP was a prototype that *proved the foundation* but pervasively violates the architecture we've since defined — most visibly an ~8:1 inversion of the API-first rule (the frontend calls the database directly in ~165 places), plus pre-canon vocabulary, no equipment-keying, no extracted design system. We are **not fixing the old code slice by slice.** We are building a **new Hub, clean and true to the anatomy**, while keeping the old MVP as a reference to look up and reuse from.

**What we keep vs. rebuild.** The violations live in the *app/frontend* tier, not the database. So the **database substrate (schema, functions, RLS) is the asset we carry forward** (curated and adapted where it diverges from canon); the **app, API, and frontend are rebuilt fresh**. We carry the old Hub's *knowledge* — its ~69 tests and proven behaviours become the specification for what v2 must still do — but we write the implementation new. The old Hub becomes a read-only oracle, then is retired.

**Where we're heading.** A robust, viable v2 that is API-first, satisfies the five verticals from line one, consumes the Domain Services through real contracts, and is built area by area in dependency order. Time is acceptable; robustness is the goal.

---

## Part 2 — The plan (phases, each with a gate)

**Phase 0 — Lock the decision.** Record the greenfield-rebuild decision (ADR-U030); confirm pre-launch / no users (so the old Hub can be frozen with no live migration). *Gate: ADR ratified; CQ-015 un-parked.* ✅ done.
- **Uses:** [PROCESS §9](../PROCESS.md) (spec-evolution loop); the [ADR template](../../templates/adr.md).
- **Inputs:** CQ-015 (the parked question); ADRs U009 / U023 / U025; the v1 violation measurements.
- **Outputs:** [ADR-U030](../../architecture/decisions/ADR-U030-hub-v2-greenfield-rebuild.md); this plan; the CQ-015 resolution.

**Phase 1 — Know the target and the inheritance.**
- Refresh the Hub `DESCRIPTION.md` + `SPECIFICATION.md` against the reconciled model = the "should-be" v2 (good-enough and changeable; the loop below corrects it as we build).
- **Substrate audit:** tag every table/function/RLS policy *conformant / adapt / replace*.
- **Behaviour inventory:** catalogue what the old Hub's ~69 tests guarantee — the oracle for "v2 must still do this."
- **Uses:** [`ecosystem-decomposition`](../../../.claude/skills/ecosystem-decomposition/SKILL.md) (re-derive the Hub spec) + chapter [01 Decomposition](../../ecosystem/how-we-work/01-decomposition.md); [`doc-health-check`](../../../.claude/skills/doc-health-check/SKILL.md).
- **Inputs:** [VISION](../../ecosystem/VISION.md) / MANIFESTO / PRINCIPLES-AI; the universe cores (cosmology, roles, beings); the 4 Platform Core specs; the 7 [Domain Service specs](../../platform/domain/); the 5 [vertical specs](../../verticals/) (§6/§7 obligations); [DOMAIN_ENTITIES](../../architecture/DOMAIN_ENTITIES.md); ADRs U009/U012/U025; the existing [Hub SPECIFICATION](../../products/hub/SPECIFICATION.md) (for the Step-2 reconcile); the DB substrate (`supabase/migrations/`); the old Hub's tests (`tests/`).
- **Outputs:** refreshed [Hub DESCRIPTION](../../products/hub/DESCRIPTION.md) + [SPECIFICATION](../../products/hub/SPECIFICATION.md); `./substrate-audit.md`; `./behaviour-inventory.md`.
*Gate: refreshed spec + audit + behaviour inventory reviewed.*

**Phase 2 — Lay the clean foundation (a walking skeleton).** Stand up the v2 app with the non-negotiables present from line one: API-first layering (DB → API → frontend), the five vertical obligations wired into the baseline, the design system extracted as its own layer, equipment-keying (U025), and the identity/auth bootstrap + test harness. *Gate: one thin slice (e.g. sign in → land on your home) runs end-to-end through DB→API→frontend, vertical obligations met, tests green.*
- **Uses:** [`feature-development`](../../../.claude/skills/feature-development/SKILL.md) + chapters [03 Kanban](../../ecosystem/how-we-work/03-execution-kanban.md) / [04 Build loop](../../ecosystem/how-we-work/04-execution-build-loop.md).
- **Inputs:** the refreshed Hub spec; the 5 vertical §6/§7 checklists; the [design-system](../../design-system/) spec (extract); PC Identity + Infrastructure specs; ADR-U009/U025; the substrate-audit tags.
- **Outputs:** the v2 app skeleton (`app/` + API layer + design-system layer + auth + test harness); the first walking-skeleton `FEAT-H###` spec under [`hub/features/`](../../products/hub/features/); any adapted migrations (`supabase/migrations/`).

**Phase 3 — Build area by area, in dependency order.** Identity/Onboarding → Groups → Journeys → Communication → Notifications → Platform-Ops. Each area: feature spec → realise the platform/Domain-Service API contract beneath it (reusing/adapting the substrate) → frontend consuming it **via API only** → TDD seeded from the ported behaviours → vertical checklists pass → retire the old area. *Gate per area: feature DoD + vertical checklist + tests green + performance gate ([ADR-U043](../../architecture/decisions/ADR-U043-performance-budgets.md)): cold + warm authenticated waterfall measured on the production stable domain (≥ 3 runs per scenario, every run within budget; cold per ADR-U043 Amendment 1 — ≥ 20 min enforced zero traffic, no synthetic warm-up traffic (pinger retired, ADR-U036 Amendment 2), idle depth recorded; **tail rule:** no single request in any cold run may exceed 2× its scenario budget — a tail draw is a failure, not noise) and Stefan's manual live walk — both before the area retro — plus **per-RPC gate verification** (COR-A W12, decided 2026-07-19, closes anatomy-audit AC-9): every RPC the area shipped has its permission / lifecycle / consent gates verified against its spec (function body read against the spec's rules; adversarial direct-call tests for any gate not already covered); sole-home-in-BFF is an automatic fail (ADR-U038); core-referencing-domain is an automatic fail (ADR-U047 — enforced continuously by the internal-api-conformance suite test). **Cycle COR-B (2026-07-22) widened that mechanical half** ([plan](./anatomy-correction-plan-cor-b.md), [audit II](../reference/ANATOMY-CONFORMANCE-AUDIT-2.md)): ownership now derives from `supabase/ownership.manifest.json` so an unclassified new table fails red; DS-to-DS crossings are direction-checked (the anatomy's acyclicity rule, previously unenforced); and a static outer-ring gate fails any browser-reachable module that calls `.from()`/`.rpc()` (ADR-U009). What stays a human gate row is the per-RPC *internal* gate reading — no static check discharges it.*
- **Uses:** [`feature-development`](../../../.claude/skills/feature-development/SKILL.md) per area; chapters 03/04; [`doc-health-check`](../../../.claude/skills/doc-health-check/SKILL.md) at each reconcile.
- **Inputs (per area):** that area's capability rows (refreshed Hub spec); the relevant [Domain Service spec(s)](../../platform/domain/) for its contract (e.g. DS-3 Journeys for the Journeys area); the vertical checklists; the substrate-audit tags; the behaviour inventory (ported tests).
- **Outputs (per area):** `FEAT-H###` specs in [`hub/features/`](../../products/hub/features/); the realised API contract + frontend + tests; retired old-area code; per-slice notes here (`./`).

**Phase 4 — Cutover and retire.** When every area is replaced, cut over and archive/delete the old Hub. *Gate: v2 is the Hub.*
- **Uses:** [`doc-health-check`](../../../.claude/skills/doc-health-check/SKILL.md); [`wave-planning`](../../../.claude/skills/wave-planning/SKILL.md) (wave DoD).
- **Inputs:** all area completions; the old Hub code.
- **Outputs:** the cutover; old Hub archived/deleted; a closing session bridge (`../sessions/`); STATUS + wave updates.

---

## Cross-cutting rules (what makes it robust)

- **API-first, always** — no direct table calls from app code (the exact sin that sank v1).
- **Verticals are baseline, never retrofit** — every slice satisfies the five vertical obligations.
- **Carry knowledge, write code fresh** — tests and schema carry forward; app/frontend code is new.
- **Old Hub is a read-only oracle** — copy-with-correction only; never import-and-patch.
- **Every slice ships runnable and tested** — always a walking skeleton.
- **TDD is mandatory.**

---

## The build-informed spec-evolution loop

Building will teach us things the specs got wrong or left out. That learning is welcome — specs are servants of end-user value, not cages. The canonical mechanism lives in [`PROCESS.md` §9](../PROCESS.md). In short: *ratified ≠ frozen*; deviations are captured at the moment of discovery (never silent); each is triaged local / upstream-bearing / open-question; load-bearing findings amend the owning spec now, smaller ones batch to the cooldown; amendments are appended with provenance; changes propagate via the cascade; and **when a validated build-learning conflicts with a spec, the spec yields.**

## Cadence

Tight early, lengthening as it stabilises. While unknowns are densest (foundation + first 2–3 areas), reconcile at **each slice/area completion (~weekly)** with a light reconcile (fold findings, run doc-health on what changed, update OPEN_QUESTIONS, adjust the spec). Re-evaluate after ~3–4 of those and lengthen toward the 3-week cycle / 1-week cooldown default (PROCESS.md §3) as churn drops. Findings are captured continuously regardless of cadence; load-bearing ones amend immediately.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Greenfield "long dark" (nothing runnable for a long stretch) | Build in dependency order; always keep a runnable, tested core (walking skeleton). |
| Losing hard-won edge cases the old code solved | Behaviour inventory from the old tests; carry the schema/functions forward. |
| Building ahead of contracts | API-first per area: realise each Domain-Service contract *as* you build the area that needs it. |
| Universe-fundamentals dependency | Stay in the product/platform layer; defer world-experience features (first-hour) until those fundamentals firm (CQ-010). |
| Scope creep | The refreshed Hub spec is the scope boundary; changes are explicit, via the loop. |

## Tracking

Wave = Ferd. Per-area feature specs live under `../../products/hub/features/`. Substrate-audit output and per-slice notes land in this directory (`docs/planning/hub-v2/`) as they're produced.
