# Session bridge — 2026-09-05 (2): Audit V executed, Cycle COR-E built in one session, W2 held for the nod

**Continuation of `2026-09-05_01`.** Stefan opened with "we have completed most of Ferd's development and need to do a deep analysis of our code base and also the documentation … and as a SECOND step come up with a plan to fix whatever is not in line with our anatomy and system architecture", then challenged the depth ("have you really challenged the full code base including back end with DB functions?" — "specifically pay attention to the inner and outer API rings. Those can never be violated."), ruled R-14 the other way from the recommendation ("we wanted to have that one file for me … so this file is actually overwritten when we do new development"), and settled the board: "go with the recommended rulings and start COR-E". Seven PRs: #615 (register + plan), #616 (R-14 ruled), #617 (backend addendum), #618 (W1/W3/W4/W7), #619 (W5/W8), #620 (W6), #621 (W2 — **held**).

## Live state (verified at close — cite, don't re-derive)

- `main` at the #620 merge plus this session's closure PR; clean; **one open PR: #621** (`cor-e/w2-steering-files-HELD`) — AGENTS.md, SESSION-OPENER.md, root CLAUDE.md header + front-door row, PROCESS.md §3 kickoff/close rules, the session hook injecting `cycle-current.md`. Merge on Stefan's named nod: `gh pr merge 621 --merge --delete-branch`, then `git pull`; then mark the COR-E plan CLOSED and repoint the front door (the unit gate goes red until that is done).
- **Audit V** ([`ANATOMY-CONFORMANCE-AUDIT-5.md`](../reference/ANATOMY-CONFORMANCE-AUDIT-5.md)): code rings conformant and gate-green; every deviation was documentation, steering or tooling. The backend addendum re-derived both rings from the live catalog: 243 functions, 24 bare-word cross-owner mentions all comments/JSON keys, 0 dynamic SQL, 236/236 SECDEF pin search_path, anon executes 0, sealed set leaks nothing, the Hub's 138 RPC names all classified. AC5-13 withdrawn at execution (regex false positive). Closure table at the register's foot.
- **COR-E** ([plan](../hub-v2/anatomy-correction-plan-cor-e.md)): seven of eight workstreams merged. New on `main`: the anatomy stamp at ADR-U047 A4 + the retention rule; `DOMAIN_ENTITIES.md` absorbs ADR-U050 and carries an entities-since table; hub-v2 README status is a pointer; `waves/ferd.md` an honest pointer; **`docs/planning/cycles/cycle-current.md` — the front door** (five fields; written at kickoff, repointed at close; injected by the hook once #621 merges); `scripts/README.md` the tooling registry, three test-data scripts deleted, `apply-migration.js` renamed; **five new gates**: integration-scripts-resolve, script-registry, cycle-current-front-door (unit, CI) and exposure-register-conformance + the bare-reference / dynamic-SQL assertions (platform family); ownership manifest **v2** with `exposure` (client 175 / sealed 22 / trigger 36 / internal 10) and `clientAccess.contractsOnly` (7).
- **Gates at close:** platform family **10 suites / 46 tests** green, teardown clean; unit tier **199 suites / 1 646 tests**; lint + typecheck clean; `npm run dashboard` generates.
- **Doc-health cycle-boundary run** — clean, three in-place fixes, record at [`2026-09-05-cor-e-doc-health.md`](../hub-v2/2026-09-05-cor-e-doc-health.md).
- The database is unchanged since the morning bridge: DeusEx + canon only; no `walk-*` accounts; DB-4 walk legs 4/5/6/8 unwalked; ADR-U053 Proposed, Stefan's ruling open.

## Findings worth carrying

- **A pointer can be valid and stale at once.** The architecture README said v2.6 while the SVG was v2.7 across a clean doc-health run; the entity model cited ADR-U050 it had not absorbed. Both are now gate-checked (§11); the general shape joined the skill's Known gaps.
- **The gate's own blind spot was the audit's best yield.** The inner-ring gate matched `public.<table>` only; a live sweep proved zero bare references exist, and now a gate keeps it so — the same for the `authenticated` EXECUTE surface, which nothing had pinned. Both rings hold; both are now pinned from the platform side, not only the product side.
- **One finding did not survive execution.** AC5-13 (placeholder Implementation notes) was a regex misfire on section-header dates; withdrawn on disk-verification before any edit. The verify-before-asserting rule earned its keep.
- **A `&&` chain that crosses a heredoc is not a chain.** The steering PR's first attempt pushed an empty branch because the push line after the commit heredoc ran unconditionally; recovered cleanly, but the pattern is worth remembering: check `git status` after any multi-statement git command.
- **Stefan's R-14 reading changed the recommendation for the better:** the never-used cycle file was not a dead convention but a front door nobody wrote — the fix is a writing step, a hook and a gate, not deletion.

## Addendum (same session, after the nod)

Stefan: "ok merge 621" → **#621 merged**, the hook verified on `main` (opener + front door injected). **Cycle COR-E CLOSED 2026-09-05.** The plan reads CLOSED; the front door repointed to [the Ferd close plan](../hub-v2/2026-09-05-ferd-close-plan.md) (Status PLANNED; the close's four decisions are Stefan's); the register's held rows closed; hub-v2 README and `ferd.md` point at the close plan. The front-door gate is green against the new target.

## Not done — plainly

- ~~#621 merge~~ — done; see the addendum.
- **ADR-U053** — Stefan's ruling (plan, cost, Option A vs B, date); the ADR also still names `apply-migration-temp.js` — an ask-first edit owed at its acceptance pass.
- **Leaked-password protection** — a Supabase Auth dashboard toggle (COR-E board row 9: enable); Stefan's.
- **The Ferd close** — `ferd.md` proper (the `wave-planning` skill), the wave DoD walk, DB-4 legs 4/5/6/8 on a fresh cast (`npm run walk:cast -- create`), the close retrospective, the Eid kickoff — in that order, after #621.
- **The E2E smoke job in CI** (TASK-E2E-04's recommendation) — still Stefan's ruling.
