# Session bridge — 2026-09-03 (5): three of the four ruled items applied and merged (#600, #601, #603); ADR-U047 Amendment 4 written; DB4-01 waits on its board

**Continuation of `2026-09-03_04`.** Stefan gave the named approvals in order — "ok merge #601", "ok merge #603" — and "then do the ADR-U047 amendment". All three walked; the amendment is on main. Item 4 (TASK-DB4-01) is unchanged: the decision board in `_04` awaits his rulings.

## Live state (verified at close — cite, don't re-derive)

- `main` = `origin/main` = discovery; clean. No open PRs. Three migrations applied to the one database today and recorded in the history: `20260903090000` (H017-01 retire), `20260903100000` (journey pause/resume + the widened freeze handlers), `20260903110000` (the sealed-thread message door).
- **#601 (TASK-JRN-PAUSE-01) — DONE, merged 2026-09-03T18:48Z.** Applied ACLs read (contracts: postgres/authenticated/service_role; handlers: postgres/service_role; widened predicates 1 + 2). Post-apply: pause suite 12/12, platform 37/37, journeys 174/174, groups 401/401; E2E `journey-pause.spec` + `frozen-and-group-progress.spec` green.
- **#603 (TASK-SEAL-02) — DONE, merged.** Applied ACLs read (wrapper: postgres/authenticated/service_role; body: postgres/service_role). **The gate earned its keep:** the first post-apply platform slice went red on `internal-api-conformance` — the PC-4 wrapper pre-read `conversations` (DS-5) to check kind/group before calling the body (ADR-U047 rule 3, the shape Audit IV caught before SEAL-01). Re-issued in place at the gate (same version; the body owns the conversation read, the wrapper checks the closed scope on the reply, then audits). After the re-issue: sealed suite 8/8, platform 37/37, admin 181/181, communication 157/157, E2E `admin-closed-threads` (extended) + `admin-suspended-content` 7/7.
- **ADR-U047 Amendment 4** (append-only, status line updated): the member-scoped and group-closed freeze shapes reach `paused` enrolments; the wielded-exit divergence and the completed-row question stand as recorded.
- **Found, not caused — TASK-E2E-04 filed:** `journeys.spec.ts` (2 cells) and `player.spec.ts` (2 cells) fail on the catalogue because they still walk the pre-2026-08-12 seed titles ("Personal Development Kickstart", "Leadership Fundamentals"); the live seed set is the three-question journeys + *Arrival on FringeIsland*. Both specs last edited 2026-07-20, untouched by any branch today; E2E is not in CI, which is how three weeks passed. Fenced by name at the #601 gate, never absorbed.

## Findings worth carrying

- **A gate-walk merge must key on the required check, not on `gh pr checks --watch --fail-fast`'s exit** — that exits non-zero on a non-required check (Vercel) and the chain then merged #601 while "build · lint · unit" was still pending (it passed afterwards — verified on main). The #603 chain reads the required check's bucket explicitly and polls until the check EXISTS (right after a push, `--watch` returns "no checks reported" and an empty bucket — the guard correctly refused once); keep that shape.
- **Every branch inserts its CHANGELOG entry at the same spot**, so each later gate merges main with a one-block conflict (root, and `hub/CHANGELOG.md` when both touched it). The resolution is mechanical — keep both sides, newest first — and was scripted this session; a "merge main first, then walk the gate" habit keeps it to one round.
- **A PC-4 wrapper that needs a fact about a DS-owned row asks the DS body for it** (return it in the reply), never pre-reads the table. The invocation-axis gate is the only thing that stops this at build time; run the platform slice in every post-apply set.

## Not done — plainly

- **TASK-DB4-01:** board only (in `_04`); no spec, no code, waits on the rulings.
- **TASK-E2E-04:** filed, not fixed — two specs to re-seed on their own fixtures.
- **`ferd.md`** — still the placeholder; the Ferd close waits on item 4.

## After item 4: the Ferd close

Unchanged: write `ferd.md`, walk the quality gates (the deep-cold ADR-U043 pass needs Stefan's walking first), the "v2 is the Hub" verdict line, a ruling on CQ-014, the wave retro, then Eid kickoff.
