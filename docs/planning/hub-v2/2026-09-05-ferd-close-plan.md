# The Ferd close — plan

**Date:** 2026-09-05 · **Status:** **PLANNED** — written at the COR-E close as the front door's next target (PROCESS.md §3: close repoints the door to what is next); decomposed at its own kickoff under the `wave-planning` skill. Nothing executed.
**Predecessor:** [Cycle COR-E](./anatomy-correction-plan-cor-e.md) — CLOSED 2026-09-05 (#618–#622): the tidy-up that makes the close's reads true (the routing chain, the wave pointer, the entity model, the gates).
**Goal:** close Wave 1 (Ferd) formally — write the wave file, walk the wave-level Definition of Done, finish the last live-walk legs, hold the wave retrospective, kick off Eid.

---

## Sequence (from COR-E "Order", step 6)

1. **`docs/planning/waves/ferd.md` proper** — the `wave-planning` skill, from [`docs/templates/wave-spec.md`](../../templates/wave-spec.md): thematic focus, the features in scope (the 100 specs tagged `wave: ferd`, all `6-done`), and the wave-level DoD. Today the file is an honest pointer (Audit V AC5-2).
2. **The wave DoD walk** — `wave-planning` "Complete a wave": every criterion walked with evidence; the walk record lands under this directory as `2026-MM-DD-ferd-dod-walk.md`.
3. **DB-4 live-walk legs 4, 5, 6 and 8** (bulk bar · preferences locked-on · journey pause/resume · preserved threads) — on a fresh cast (`npm run walk:cast -- create` from `hub/`), ideally on the test project once [ADR-U053](../../architecture/decisions/ADR-U053-test-tier-off-the-production-database.md) lands; `walk:cast teardown` and a clean census after. Legs 1, 2, 3 and 7 walked green on 2026-09-04.
4. **The wave retrospective** — [`docs/templates/retrospective.md`](../../templates/retrospective.md), scope = the whole wave; the retro sweep deletes the done `TASK-*` files (the ten that still cite `apply-migration-temp.js` leave with it).
5. **Roadmap + kickoff** — `docs/ecosystem/ECOSYSTEM_ROADMAP.md` (a registry placeholder since 2026-04-17: write it, or record the deferral once more with a reason), then **the Eid kickoff** — the next front door, written before anything is decomposed.

## Decisions that are Stefan's (the close's board)

| # | Decision | Where it lands |
|---|---|---|
| 1 | **ADR-U053** — ~~the plan, the cost, Option A vs branching, the cutover date~~ **RULED AND EXECUTED 2026-09-05** ("do the ADR-U053 now"): Option A, cost $0, cutover the same day — [record](./2026-09-05-adr-u053-cutover.md). Left for Stefan: the three production commands in the record (history repair, the corrective's production leg, the drift check), the Vercel Preview wiring, and the ADR's Accepted line (held steering PR) | the cutover record |
| 2 | **The E2E smoke job in CI** (TASK-E2E-04's recommendation) | `.github/workflows/ci.yml` |
| 3 | **Where DB-4 legs 4/5/6/8 run** — settled by decision 1: on the test project (`npm run walk:cast -- create` now lands there by default; the fuse refuses production), against the local dev server or a Vercel Preview wired to test | step 3 |
| 4 | **Leaked-password protection** in Supabase Auth (COR-E board row 9 — enable) | the dashboard; note the date in the next bridge |

## Gates

- The wave DoD written in step 1, walked in step 2 — nothing closes on a placeholder.
- Platform family and unit tier green at close; the `doc-health-check` cycle-boundary run; `npm run dashboard`.
- The front door repointed to the Eid kickoff, and this plan's Status set to CLOSED, in the same change.

## Definition of done

- `ferd.md` carries scope and DoD; the DoD walk record exists and is green.
- DB-4 legs 4/5/6/8 walked green; the cast torn down with a census of zero.
- The wave retrospective written; the done tasks swept.
- The Eid front door written; this plan CLOSED.
