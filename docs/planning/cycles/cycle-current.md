# Now building — the Ferd close

| | |
|---|---|
| **Cycle** | The Ferd close — close Wave 1 formally: the wave file, the wave-level DoD walk, DB-4's last live-walk legs, the wave retrospective, then the Eid kickoff. |
| **Plan** | [`../hub-v2/2026-09-05-ferd-close-plan.md`](../hub-v2/2026-09-05-ferd-close-plan.md) |
| **Latest bridge** | [`../sessions/2026-09-06_01_-_FRONT-DOOR-SHAPE-WALK-RUNNER-LEGS-GREEN.md`](../sessions/2026-09-06_01_-_FRONT-DOOR-SHAPE-WALK-RUNNER-LEGS-GREEN.md) |
| **Board** | open 2026-09-06 — the close ran and its last legs are walked; the declaration is Stefan's |
| **Next** | The Eid kickoff — design tools and narrative (Journey Studio v1, the minimal design foundation, the Whisp; studies under `../waves/studies/eid/`). |

## In motion
- The Eid kickoff waits on the close declaration — it opens in a fresh session with `npm run cycle:kickoff`

## Waiting on Stefan
- The close declaration — one change: front door → the Eid kickoff, the plan CLOSED, `ferd.md` `completed`
- The felt items of DB-4 legs 4/5/6/8 (copy, timing, empty states) — read the runner's screenshots (`npm run walk:report` from `hub/`)
- G-04 — the waves README as the ecosystem roadmap band (the [wave retro](../retrospectives/retro-wave-ferd.md) carries the recommendation)
- The three ADR-U053 production commands ([cutover record](../hub-v2/2026-09-05-adr-u053-cutover.md)) — `migration-drift.js` stays red until then
- The E2E smoke job in CI; leaked-password protection (the Vercel Preview → test wiring landed 2026-09-06)

## Landed this cycle
- DB-4 legs 4/5/6/8 walked GREEN 2026-09-06 by the new **walk runner** (`hub/tests/walks`, one test per script step, a screenshot per step; [script](../hub-v2/2026-09-05-db4-walk-legs-4-5-6-8.md)) — one script correction, no product finding
- The front door's fixed shape — the template, `npm run cycle:kickoff`, the gate's shape half (#630); PROCESS.md §3 says so (#631)
- `ferd.md` written — 100 features, the wave DoD; the DoD walked ([record](../hub-v2/2026-09-05-ferd-dod-walk.md)); the wave retrospective drafted; the done tasks swept
- ADR-U053 executed and Accepted — the test project, the fuse, the replay and drift scripts (#624, #625)
- TASK-RACE-01 — the stale-read race the fleet found, fixed (#627); the dependency red line closed — `next` 16.3.4, `npm audit` 0 (#629)

_Read this first. Written at kickoff by `npm run cycle:kickoff` before anything is decomposed; repointed at close. The front door, never the plan — the gate `cycle-current-front-door.test.ts` holds the five fields, the three sections and the size._
