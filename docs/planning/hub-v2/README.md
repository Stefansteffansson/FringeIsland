# Hub v2 — rebuild plan

**Status:** Living plan (v1, 2026-06-15). Subject to change as we learn — see the spec-evolution loop below.
**Decision record:** [ADR-U030](../../architecture/decisions/ADR-U030-hub-v2-greenfield-rebuild.md) · **Open question it closes:** CQ-015.
**Wave:** Ferd. **Features** live in the ecosystem tree under the Hub (`../../products/hub/features/`); this plan references them, it does not duplicate them.

---

## Current status

**Phase 0 — Locking the decision.** The greenfield rebuild is decided and recorded (ADR-U030); the next step is **Phase 1**: refresh the Hub DESCRIPTION + SPECIFICATION against today's architecture, audit the database substrate, and inventory the old Hub's behaviour. No v2 code has been written yet. The old Hub MVP stays frozen as a reference and behavioural oracle.

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

**Phase 1 — Know the target and the inheritance.**
- Refresh the Hub `DESCRIPTION.md` + `SPECIFICATION.md` against the reconciled model = the "should-be" v2 (good-enough and changeable; the loop below corrects it as we build).
- **Substrate audit:** tag every table/function/RLS policy *conformant / adapt / replace* against `DOMAIN_ENTITIES.md` + the 4 Platform Core specs + the 7 Domain Service specs + the 5 verticals' §6/§7 obligations + the anatomy and relevant ADRs (U009 API-first, U012 observability).
- **Behaviour inventory:** catalogue what the old Hub's ~69 tests guarantee — the oracle for "v2 must still do this."
*Gate: refreshed spec + audit + behaviour inventory reviewed.*

**Phase 2 — Lay the clean foundation (a walking skeleton).** Stand up the v2 app with the non-negotiables present from line one: API-first layering (DB → API → frontend), the five vertical obligations wired into the baseline, the design system extracted as its own layer, equipment-keying (U025), and the identity/auth bootstrap + test harness. *Gate: one thin slice (e.g. sign in → land on your home) runs end-to-end through DB→API→frontend, vertical obligations met, tests green.*

**Phase 3 — Build area by area, in dependency order.** Identity/Onboarding → Groups → Journeys → Communication → Notifications → Platform-Ops. Each area: feature spec → realise the platform/Domain-Service API contract beneath it (reusing/adapting the substrate) → frontend consuming it **via API only** → TDD seeded from the ported behaviours → vertical checklists pass → retire the old area. *Gate per area: feature DoD + vertical checklist + tests green.*

**Phase 4 — Cutover and retire.** When every area is replaced, cut over and archive/delete the old Hub. *Gate: v2 is the Hub.*

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
