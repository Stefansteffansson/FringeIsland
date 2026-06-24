# Hub v2 — Phase 2 kickoff (the walking skeleton)

**Status:** Active (opened 2026-06-24, on the Phase-1 gate PASS).
**Plan:** [Hub v2 README](./README.md) (Part 2, Phase 2) · **Gate that opened it:** [phase-1-gate-brief.md](./phase-1-gate-brief.md) (PASS, 2026-06-24).
**Decision record:** [ADR-U030](../../architecture/decisions/ADR-U030-hub-v2-greenfield-rebuild.md). **Wave:** Ferd.

> This page tees up Phase 2 so the next build session can start cold. It scopes the *first* walking-skeleton slice and names its inputs, outputs, and gate. It does not duplicate the plan — it points into it.

---

## The one slice

**Sign in -> land on `/groups`** — running end-to-end **DB -> API -> frontend** over the conformant substrate, with the five vertical obligations present from line one. One thin, real, tested path through the whole stack — not a feature, a *spine*.

`/groups` is the landing because the substrate audit rated groups/admin/permissions **conformant and STRONG** in the oracle, and the group-keyed actor is the load-bearing identity primitive the rest of the Hub hangs off — so the skeleton stands on the firmest ground we inherited.

## What stands up in the skeleton (the non-negotiables, from line one)

These are the Phase-2 "present from the start" requirements (README Part 2, Phase 2) — the skeleton exists to prove each one is wired, not retrofitted:

- **API-first layering** — DB -> API route -> frontend component. No direct table calls from app code (the exact v1 sin: ~165 direct calls / ~8:1 inversion).
- **The five vertical obligations** (ADR-U002: Administration · Privacy/GDPR · Notifications · Observability · Transactions) wired into the baseline, not bolted on later.
- **The design system extracted as its own layer** (not inline in components).
- **Equipment-keying** (ADR-U025) — the Hub as an equipment profile, keyed from line one.
- **Identity / auth bootstrap + the test harness** — Supabase Auth context; Jest + Playwright green from the first slice.

## Slice gate (Definition of Done for Phase 2)

**One thin slice (sign in -> land on `/groups`) runs end-to-end through DB->API->frontend, the vertical obligations are met, and tests are green.** (README Part 2, Phase 2 gate.)

## Inputs (what to load)

- The refreshed Hub [SPECIFICATION](../../products/hub/SPECIFICATION.md) — the Identity + Groups capability rows for this slice.
- The five vertical specs ([`../../verticals/`](../../verticals/)) — their §6/§7 baseline checklists.
- The [design-system](../../design-system/) spec — the extract target.
- Platform Core **Identity** + **Infrastructure** specs ([`../../platform/core/`](../../platform/core/)).
- ADR-[U009](../../architecture/decisions/) (API-first) + ADR-U025 (equipment-keying).
- The [substrate-audit](./substrate-audit.md) tags — which tables/functions/RLS carry forward conformant vs. adapt (the slice should ride the conformant ones).
- The [behaviour-inventory](./behaviour-inventory.md) — the old suite's groups/auth/permissions behaviours to seed TDD from (the oracle).

## Outputs (what Phase 2 produces)

- The v2 app skeleton: `app/` + the API layer + the design-system layer + auth + the test harness.
- The first walking-skeleton `FEAT-H###` spec under [`hub/features/`](../../products/hub/features/).
- Any adapted migrations under `supabase/migrations/`.
- Per-slice notes in this directory (`docs/planning/hub-v2/`).

## Suggested first moves (proposal — adjust at build time)

A starting sequence, not a contract; the build loop (PROCESS §9) will reshape it:

1. **Harness + skeleton app** — stand up `app/`, the API-route layer, and Jest/Playwright green-on-empty, so every later step lands on a runnable, tested base.
2. **Auth bootstrap** — Supabase Auth context + sign-in, equipment-keyed (U025), wired through an API route (not direct).
3. **The `/groups` read path** — one conformant groups query exposed DB -> API -> frontend, TDD-seeded from the oracle's groups/permissions behaviours.
4. **Vertical baseline pass** — walk the five §6/§7 checklists against the slice; close gaps before calling the gate.

Write the `FEAT-H###` spec for this slice via [`feature-development`](../../../.claude/skills/feature-development/SKILL.md) before coding (TDD is mandatory).

## Open items inherited into Phase 2 (flagged, not blockers)

- **DS reciprocation (G-29)** — the Hub's external-dependency claims are consumer-side only; reciprocal Domain-Service contracts resolve as each area builds.
- **Per-policy RLS review** — deferred to the per-area Phase-3 builds (TDD-seeded), by design.
- **Two gate cleanups (non-blocking)** — SPEC §L3 "42 seeded permissions" -> **44**; substrate-audit "(deliverable 3, pending)" cross-ref -> done. Fold into the next reconcile.
- **The build-new cluster** — the **Mist** lifecycle, the **Whisp**, and the **Journal** are canon-true but have no substrate and no oracle; they are designed fresh from canon, not back-derived. None blocks the walking skeleton (the skeleton rides conformant substrate); they surface in Phase 3.
