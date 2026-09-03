# Session bridge — 2026-09-03 (2): next-session brief — the four decisions, ruled; build order and entry points

**Continuation of `2026-09-03_01`.** Stefan ruled the four open rows in one line — *"retire H017-01, DB-4 and journey pause and seal-01 now"* — and chose a fresh session for the build. This bridge IS the preparation; start here.

## Live state (verified 2026-09-03 — cite, don't re-derive)

- Main = discovery, clean, at the INT-01 close (#597). Both schema gates of the night applied and merged (#594 ANN-01, #593 SEC-02 + #596 its sibling correction). The last full integration runs: **91/91, 1 245/1 245, twice consecutively**, zero ES256. Unit tier 183 suites, 1 537/1 537. Every DBT / E2E / INT / MIST / SEAL-01 row is `done`.
- **The substrate posture changed on 2026-09-03 and every new suite must know it:** the client roles hold **no** table DML (TASK-SEC-02). An adversarial direct write now refuses at the grant, 42501 `permission denied for table …`, *before* RLS's silent 0 rows — write new adversarial cells to that, and grep **every** suite naming a re-issued function (the ANN-01 lesson; Q1).
- The obsidian-git plugin is disabled on Stefan's side; `.obsidian/` is gitignored. Still: print the full `git status` and compare `main` to `origin/main` before every commit chain (memory `obsidian-git-vault-backup-commits`).

## The four rulings and the build order (smallest first; each its own schema gate, held for the named approval)

| # | Task | Ruling | Size | Entry point |
|---|---|---|---|---|
| 1 | [TASK-H017-01](../backlog/tasks/TASK-H017-01-nominations-standalone-read-disposition.md) | **Retire** the whole dead chain: route + client fn + `get_my_pending_nominations` (DROP) + its six-cell test + manifest + conformance registers; FEAT-PC016 "superseded by the bell, retired"; MEM-7 §L3 + Hub §L4 rows | ~2h | the task's own chain diagram; `hub/app/api/me/nominations/route.ts`, `lib/groups/leadership.ts:97`, `tests/integration/groups/pending-nominations-contract.test.ts`, `supabase/ownership.manifest.json:143` |
| 2 | [TASK-JRN-PAUSE-01](../backlog/tasks/TASK-JRN-PAUSE-01-journey-enrolment-pause-write-path.md) | **Build** pause/resume: two contracts (own enrolment; cascade check vs. frozen), Hub affordance, FEAT-PD002 + FEAT-H019 amendments | 4–6h | `FEAT-PD002:55`, `FEAT-H019:47`; the enrolment contract family in `20260707130821` |
| 3 | [TASK-SEAL-02](../backlog/tasks/TASK-SEAL-02-sealed-thread-message-read.md) | **Build** the message-level admin read of a sealed thread on a closed group — sealed DS-5 body + audited admin door, bounded exactly as SEAL-01; Hub thread view, read-only, labelled | 5–7h | the SEAL-01 migration `20260811220000` as the shape; `AdminClosedThreadsSection.tsx`; `admin-closed-threads.spec.ts` |
| 4 | [TASK-DB4-01](../backlog/tasks/TASK-DB4-01-sanction-communication-pulled-into-ferd.md) | **Decompose, then build** sanction communication: transition notification kinds + a reason on the transition, member wall/label says why, the bell says it happened; amends FEAT-PC023 + FEAT-H038 No-gos | 1–2 days | the task's DoR board — run the `ecosystem-decomposition` skill first; paired PC/PD + H specs to 4-ready before code |

**Skills:** `feature-development` for 1–3 (task files carry the AC); `ecosystem-decomposition` first for 4.

## House rules that bit this pass — carry them

- Playwright only from `hub/`; `toContainText`, not `toHaveTextContent`. A jest integration invocation's teardown sweeps a concurrent full run's fixtures — never beside a full run.
- The migration apply is two steps from the repo root: `node scripts/apply-migration-temp.js <file>` then `bash supabase-cli.sh migration repair --status applied <version>`; read the **applied** object's ACL at the gate.
- `npm run typecheck` (app + tests) and `next build` are both gates; CI runs both.
- A stash-and-restore to prove an E2E red is honest, but print the full status before the next `git add`.

## After the four: the Ferd close

Unchanged from `2026-09-02_02`'s answer: write `ferd.md` (the 97 specs, the DoD), walk the quality gates (the deep-cold ADR-U043 pass needs Stefan's walking first), the "v2 is the Hub" verdict line, a ruling on CQ-014 (what a Mist sees), the wave retro, then Eid kickoff (roadmap, G-3, the deferred piles).
