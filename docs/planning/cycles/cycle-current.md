# Now building — the Ferd close

| | |
|---|---|
| **Cycle** | The Ferd close — close Wave 1 formally: the wave file, the wave-level DoD walk, DB-4's last live-walk legs, the wave retrospective, then the Eid kickoff. |
| **Plan** | [`../hub-v2/2026-09-05-ferd-close-plan.md`](../hub-v2/2026-09-05-ferd-close-plan.md) |
| **Latest bridge** | [`../sessions/2026-09-05_03_-_FERD-CLOSE-WALKED-RACE-FIXED-DECLARATION-STEFANS.md`](../sessions/2026-09-05_03_-_FERD-CLOSE-WALKED-RACE-FIXED-DECLARATION-STEFANS.md) |
| **Board** | open 2026-09-06 — the close ran; the declaration and the last walk legs are Stefan's |
| **Next** | The Eid kickoff — design tools and narrative (Journey Studio v1, the minimal design foundation, the Whisp; studies under `../waves/studies/eid/`). |

## In motion
- DB-4 legs 4/5/6/8 staged on the test project as a [walk script](../hub-v2/2026-09-05-db4-walk-legs-4-5-6-8.md) — the walk cast and the walk admin exist; the walk itself is Stefan's
- The Eid kickoff waits on the close declaration — it opens in a fresh session with `npm run cycle:kickoff`

## Waiting on Stefan
- The close declaration — one change: front door → the Eid kickoff, the plan CLOSED, `ferd.md` `completed`
- The walk of DB-4 legs 4/5/6/8 (the script above)
- G-04 — the waves README as the ecosystem roadmap band (the [wave retro](../retrospectives/retro-wave-ferd.md) carries the recommendation)
- The three ADR-U053 production commands ([cutover record](../hub-v2/2026-09-05-adr-u053-cutover.md)) — `migration-drift.js` stays red until then
- Vercel Preview → the test project; the E2E smoke job in CI; leaked-password protection

## Landed this cycle
- `ferd.md` written — 100 features, the wave DoD; the DoD walked ([record](../hub-v2/2026-09-05-ferd-dod-walk.md)); the wave retrospective drafted; the done tasks swept
- ADR-U053 executed and Accepted — the test project, the fuse, the replay and drift scripts (#624, #625)
- TASK-RACE-01 — the stale-read race the fleet found, fixed (#627)
- The dependency red line closed — `next` 16.3.4, `npm audit` 0 (#629)

_Read this first. Written at kickoff by `npm run cycle:kickoff` before anything is decomposed; repointed at close. The front door, never the plan — the gate `cycle-current-front-door.test.ts` holds the five fields, the three sections and the size._
