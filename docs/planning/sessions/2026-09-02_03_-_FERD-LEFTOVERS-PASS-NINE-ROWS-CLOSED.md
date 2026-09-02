# Session bridge — 2026-09-02 (3): the Ferd leftovers pass — nine rows closed, three waiting on Stefan or a gate

**Continuation of `2026-09-02_02`** (DBT-01 done). Stefan asked to close Ferd with a proper retro, but first to see the leftovers "in plain English". The board was laid out (backlog tasks + a sweep of riders, parked items and open questions in bridges, specs and OPEN_QUESTIONS); he pulled **the whole finish bucket, plus E2E-03, plus sanction communication (DB-4), plus the two adopted rules**. This bridge is the checkpoint after nine of those rows.

## Live state (verified this session — cite, don't re-derive)

**Merged to main today, in order:** #579 DBT-03 · #580 DBT-01 · #581 DoD names `npm run typecheck` (nodded) · #582 backlog-truth pass · #583 E2E-02 · #584 INT-03 + lint · #585 Q1/Q2 rules codified (nodded) · #586 invitation-copy guard · #587 MIST-01 · #588 E2E-03 · #589 SEAL-01 Hub half · #590 untrack `.obsidian/`. Main = discovery, clean. Every PR fuller-auto; no schema gate touched.

**Closed (`done`), with the honest one-liner each:**
- **TASK-E2E-02** — the E2E teardown now lists, sweeps and *names* surviving `e2e-*` fixture accounts and fails the run (the class the orphan/caretaker instruments could not see); the three 2026-08-11 leakers were already fixed; detritus superseded by the reset.
- **TASK-INT-03** — closed on measurement: 0 orphaned personal groups; growth instrumented in both tiers; Mist source fixed 2026-08-09.
- **Lint** 4 → 0 warnings (all pre-existing, untouched files).
- **Q1 / Q2** (adopted 2026-08-02, uncodified) — now in PROCESS.md §5 DoD + `docs/platform/CLAUDE.md` (Q1: affected E2E journeys join post-apply verification, run not re-authored) and `docs/products/hub/CLAUDE.md` (Q2: mutations + admin-plane events adopt durable telemetry; reads stay mirror-only). The 2026-08-06 retro's two "held" rows were already applied that day.
- **CQ-017's duplicate-invite text** — found already fixed platform-side (`invite_member` raises a human message under 23505); the BFF gained a guard so a raw constraint message can never become copy; OPEN_QUESTIONS annotated closed.
- **TASK-MIST-01** — the ghost window: the two BFF reads name a `no_resolvable_actor` refusal, clients carry it, `AuthContext.dropGhostSession()` ends the local session, the arrival latch is released; red-first unit ×6 + E2E `mist-ghost.spec.ts`; FEAT-H003/H004 note the per-domain session split.
- **TASK-E2E-03** — 15 revocation-verb specs adjudicated by target identity; **one hazard**, `account-state.spec` (flipped the shared FIM's lifecycle; the leaked terminal state was *decommissioned*, which is why a block of specs failed intermittently) → dedicated FIM; 17 out of class.
- **TASK-SEAL-01 Hub half** — a closed group's "Preserved threads" on `/admin/groups/[id]` over `admin_get_group_conversations`; sealed threads labelled "Sealed <date>" with no open affordance; new BFF route with durable telemetry; red-first unit ×10 + E2E with the implementation stashed to prove the red. **Rider named:** message-level read of a sealed thread has no contract (a platform follow-on, schema gate).

**Test tiers at close:** unit **183 suites, 1 537/1 537**; the touched integration suites green; every new E2E green; lint 0; `npm run typecheck` 0; `next build` compiled.

## Still open — waiting on Stefan or a gate

| Row | Waits on | Note |
|---|---|---|
| **H017-01** dead nominations chain | **Stefan: retire or keep** | Retire = route + client fn + contract (migration → schema gate) + 6-cell test + manifest + PC016 note, ~2h. Recommended: retire. |
| **DB-4 sanction communication** | **Stefan: confirm Ferd scope** | Both specs list it as an Eid no-go. Needs a decomposition: notification kinds (registry migration), dispatch on transitions, a reason field + contract, Hub rendering — 1–2 days, schema gate. |
| **SEC-02** grant narrowing + TRUNCATE + gate | schema gate at merge | No exploit today (RLS holds; no TRUNCATE verb reachable). The gate test is the deliverable. Buildable now, held at the gate. |
| **INT-01** ES256 flake | the wave gate | `npm run probe:auth` was started at this checkpoint (result in the next bridge); closing needs two consecutive green full integration runs. |
| **Journey pause** (`paused` recorded, not built) | Stefan | Not named in the pull; recorded as a carry-over to Eid unless he says otherwise. |
| **SEAL-01 message-level read** | Stefan (Ferd or Eid) | The named rider from the Hub half. |

## The close itself (unchanged from `2026-09-02_02`'s answer)

Ferd's wave file is a placeholder; no DoD, no retro; the Phase-4 "v2 is the Hub" verdict line is Stefan's; the ADR-U043 performance pass was deliberately deferred until real walking makes it representative; **CQ-014** (what a Mist sees) is the biggest open product question in Ferd scope. All ten April launch blockers are addressed by 6-done specs.

## Process notes from this pass

- **A stash-and-restore step can leave unrelated untracked files staged.** `.obsidian/` rode into #589 that way; #590 untracked and ignored it. Before `git add -A`, print the full status, not just `??`.
- **Playwright runs must be launched from `hub/`.** A run from the repo root has no config, no env and no base URL; its five "failures" were environmental (E2E-03's first verification).
- **Lint's `react-hooks/set-state-in-effect`:** the H041 wing passes only because a suppression inside its hook makes the compiler skip it. The callback shape (fetch in the effect, setState in `.then`/`.catch`, retry via a nonce) is the honest one and is what SEAL-01 uses.
- `react-hooks` + jest-dom: `toHaveTextContent` is jest-dom; Playwright's is `toContainText`.
