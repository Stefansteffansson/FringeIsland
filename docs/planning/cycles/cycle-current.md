# Now building — The Eid kickoff

| | |
|---|---|
| **Cycle** | The Eid kickoff — open Wave 2 — the wave file with its DoD on day one, the carry-overs dispositioned, design tools and narrative decomposed to 4-ready |
| **Plan** | [`2026-09-07-eid-kickoff-plan.md`](2026-09-07-eid-kickoff-plan.md) |
| **Latest bridge** | [`../sessions/2026-09-11_01_-_EMAIL-RECTIFICATION-SHIPPED-ART16-CLOSED.md`](../sessions/2026-09-11_01_-_EMAIL-RECTIFICATION-SHIPPED-ART16-CLOSED.md) |
| **Board** | open 2026-09-07 — the kickoff still decomposes in a fresh session; an unplanned build (email rectification) shipped 2026-09-11 alongside it |
| **Next** | the first Eid build cycle — Journey Studio v1, the minimal design foundation or the Whisp, whichever the kickoff bets on first |

## In motion
- The kickoff itself — a fresh session under `wave-planning`: `waves/eid.md` with its DoD on day one, then the decomposition of design tools and narrative (studies under `../waves/studies/eid/`)
- The carry-over dispositions listed in the [plan](2026-09-07-eid-kickoff-plan.md) §2, and the §2b candidates — each gets a written in-or-out at the kickoff

## Waiting on Stefan
- The two kickoff decisions in the plan §4 — the Eid appetite, and which of the three themes goes first
- Leaked-password protection — a Supabase Pro decision (the org is on Free; the toggle refuses to save)
- The E2E smoke job in CI — Eid's first tooling item, a ruling on design before a build
- Self-service email rectification and a notice to the OLD address — both gated on the same Supabase Pro decision as leaked-password protection ([Privacy §5 Q8](../../verticals/privacy/SPECIFICATION.md))

## Landed this cycle
- **Email rectification, shipped 2026-09-11** — an administrator can correct a member's email; nobody could before ([ADR-U054](../../architecture/decisions/ADR-U054-admin-email-rectification.md); the bridge carries the rest)
- **The Art. 16 gap closed in the Privacy vertical** — rectification was absent from V2 entirely; the right, the tooling status, a failure mode, two open questions, one obligation per tier and two checklist items
- **Wave 1, Ferd, declared CLOSED 2026-09-07** — `ferd.md` completed, the [close plan](../hub-v2/2026-09-05-ferd-close-plan.md) CLOSED, the [DoD walk](../hub-v2/2026-09-05-ferd-dod-walk.md) with no open row, the [wave retro](../retrospectives/retro-wave-ferd.md) carrying the carry-overs
- G-04 ruled and executed — the waves band is the ecosystem roadmap; six pointers repointed, nothing deleted
- The front door written by `npm run cycle:kickoff`; cycle plans live in `cycles/` from now on

_Read this first. Written at kickoff by `npm run cycle:kickoff` before anything is decomposed; repointed at close. The front door, never the plan — the gate `cycle-current-front-door.test.ts` holds the five fields, the three sections and the size._
