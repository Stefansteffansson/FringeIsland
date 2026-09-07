# Session bridge — 2026-09-07 (1): Wave 1, Ferd, declared CLOSED; G-04 ruled; the front door opens on the Eid kickoff

**Continuation of `2026-09-06_01` (this session).** Stefan walked DB-4 legs 4/5/6/8 by hand on a fresh cast, ran the three ADR-U053 production commands, ruled G-04 ("you have my go on this") and declared the close ("done and close"). This bridge is the wave-close record the kickoff script links from the new front door.

## Live state (verified at close — cite, don't re-derive)

- **Wave 1, Ferd: `status: completed`, `completed: 2026-09-07`** (`docs/planning/waves/ferd.md`). The Ferd close plan reads **CLOSED 2026-09-07**; the DoD walk record's open row reads *none*; the wave retro's action boxes for the declaration, the production commands, the Preview wiring, the legs and G-04 are ticked. The waves README's band: Ferd completed, **Eid NOW**.
- **G-04 executed as decided (option a):** the waves band (`docs/planning/waves/README.md`) is the ecosystem roadmap; `ECOSYSTEM_ROADMAP.md` is never written. Repointed: PROCESS.md §3 (two lines) and §6 (the wave-completes row), the `wave-planning` skill (context list + the wave-boundary step), the `doc-health-check` placeholder registry (row removed, resolution noted, the rule's example changed), the `product-roadmap.md` template's companion pointer, `how-we-work/gaps.md` (register row, gap paragraph, priority list) and chapter 02. Nothing deleted; six pointers that aimed at a file that never existed now aim at the file that does.
- **The front door** (`cycles/cycle-current.md`) names **the Eid kickoff**, written by `npm run cycle:kickoff` from the template and pointing at the stub plan `cycles/2026-09-07-eid-kickoff-plan.md` (Status: Planned; the bets, the carry-overs from the retro, a DoD for the kickoff cycle, two decisions for Stefan). **Cycle plans live in `docs/planning/cycles/` from now on**, beside the front door; the Ferd-era plans stay under `hub-v2/` (cycles README, templates index and PROCESS.md say so).
- **The test project:** the cast is up on Stefan's password with Drift closed (leg 8); `npm run walk:cast -- teardown` before the next full pass. The dev server started for the walk is still running on `localhost:3000`.
- **Production owes nothing to the cutover:** history repaired, corrective migration applied and recorded, `migration-drift.js` green (142 = 142 = 142). Vercel Preview → the test project, proven on a Preview bundle. Leaked-password protection is plan-gated (Supabase Free; Pro needed).

## Findings worth carrying

- **The hand-walk found what the runner could not:** three script over-claims (the admin rail and the reason; a hold ending sessions; a Steward pausing a group walk), each settled by reading the contract, not the script. The runner is the mechanism; the walker's eyes are still the instrument for "is this what we meant".
- **A gap can be closed by a decision rather than a document.** G-04 sat as a placeholder for five months because the checklist asked for a file; the answer was that the file already existed under another name.
- **Fixture-state arrangements belong to the walk, not the product:** two service-role writes on Kalle's walk (un-complete step 4; reset to step 1) served the hand-walk and the runner's proof — on the test project only, never around a contract on production.
- **A Chrome extension that lists a second "browser" you do not own** is a stale registration after its worker restarted; it drops off on its own, and the fix for the timeouts is `select_browser`, not a hunt for a Mac.

## Not done — plainly

- **The Eid kickoff session** — fresh session: the wave file `waves/eid.md` with its DoD on day one, the carry-over dispositions, the decomposition under `wave-planning` / `ecosystem-decomposition`; the stub plan is the door's target until then.
- **Leaked-password protection** — a Supabase Pro decision, Stefan's.
- **The `next dev` agent-rules files** (`hub/AGENTS.md`, `hub/CLAUDE.md`) — Stefan's ruling; recommendation: commit them.
- **The E2E smoke job in CI**, TASK-FORUM-01, the un-specced fundamentals, the latest-read-wins rule, the four §4 process changes — the retro's open boxes, now Eid's kickoff board.
- **Legs 1/2/3/7 as walk specs** — not codified; walked by hand 2026-09-04.
