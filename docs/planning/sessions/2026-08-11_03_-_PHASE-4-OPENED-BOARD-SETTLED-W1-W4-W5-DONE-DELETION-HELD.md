# Session bridge — Phase 4 opened, board settled, W1/W4/W5 done, the deletion held at the nod

**Date:** 2026-08-11 (session 22) · **Wave:** Ferd · **Phase:** 4 (Cutover & retire) — **OPEN, in execution**
**Continues:** [`2026-08-11_02`](./2026-08-11_02_-_COR-D-GATES-EXECUTED-ALL-MERGED-CYCLE-CLOSED.md) — takes up its "Phase-4 cutover planning opens".

---

## READ THIS FIRST

1. **The Phase-4 plan exists and its board is SETTLED.** [`phase-4-cutover-plan.md`](../hub-v2/phase-4-cutover-plan.md) — authored, eight decision rows P4-1..P4-8 presented whole with recommendations marked, and **Stefan ruled "go with recommended" on all eight** (PRs #495, #497).
2. **The cutover is not a deploy event — this was measured, not assumed.** Production already serves `hub/`. Dynamic API routes return `x-vercel-id: arn1::dub1::…` (edge Stockholm, **function Dublin**), which proves `hub/vercel.json`'s region pin is in effect and therefore that Vercel's root directory is `hub/`. **This closes a premise the whole ADR-U043 perf model rests on that had never been directly evidenced.** Phase 4 is retirement + hygiene.
3. **W1 (oracle discharge) PASSED — the deletion is safe.** [Note](../hub-v2/2026-08-11-oracle-discharge-note.md): all 10 Coverage-map rows exhausted, **zero UNACCOUNTED findings**, three named exceptions that are pinning gaps rather than lost behaviour. The note is unusually honest about its own limits (no suite executed; seven of nine rows lack a gate-authored discharge; presence proven, not equivalence).
4. **W1 found a real defect by closing its own limit — read this one.** Its limit 5 admitted E1's substrate seal was *documented, not verified live*. A read-only query settled it: the seal **holds** (RLS on, one SELECT policy, zero write policies — and **all 42 public tables have RLS enabled**), but the ADM-F dossier's stated *reason* — "no table GRANTs" — is **false**. `anon` and `authenticated` both hold INSERT/UPDATE/DELETE/**TRUNCATE** on `public.permissions`. **Right conclusion, wrong reason** — the exact failure class that has bitten this project repeatedly, and it would have been inherited silently when the oracle went.
5. **The deletion itself did NOT happen.** `hub-legacy/` is intact on `main`. It is held for an explicitly-named approval per the destructive-ops carve-out — the permission layer refused the command independently, which is the process working. **The reversibility half IS done:** tag `hub-legacy-final` is pushed, with 178 files verified retrievable.

## What shipped (all merged)

| PR | What |
|---|---|
| #495 | Phase-4 cutover plan authored — board, W1-W9, exit checklist, deferred register |
| #497 | Board SETTLED — all eight rows as recommended |
| #496 | **W5 — the DB-free CI gate is live**: `next build` + lint + unit on every PR and on `main`. Green on its own PR in 1m50s |
| #498 | W4 deploy attestation + W2/W3 pre-flight analysis |
| #499 | **W1 discharge note** + **TASK-SEC-02** filed |
| #500 | Trail update |

**Also on the remote:** annotated tag **`hub-legacy-final`** at `c51ed486`.

## The new finding — TASK-SEC-02

[`TASK-SEC-02`](../backlog/tasks/TASK-SEC-02-table-grant-narrowing-and-truncate-sweep.md). Measured live:

| Fact | Count |
|---|---|
| Public tables / RLS enabled | 42 / **42** |
| `authenticated` still holds default INSERT | **30 of 42** |
| `authenticated` still holds TRUNCATE | **33 of 42** |
| INSERT deliberately revoked (ADR-U038) | 12 — **but 4 of those kept TRUNCATE** |

**Severity, stated plainly: NOT a live vulnerability.** RLS refuses the DML on every table; TRUNCATE is the one verb RLS cannot gate, but PostgREST exposes no TRUNCATE verb and no `SECURITY INVOKER` function issues one. It is defense-in-depth debt plus a documentation error.

**Why it is filed the way it is:** the *function*-grant twin of this class was found three separate times before the [2026-07-06 retro](../retrospectives/retro-2026-07-06.md) escalated it with a named lesson — *"a sweep list that grows back is a wrong-layer pattern, not an unfinished chore"* — and closed it structurally with a permanent regression gate. The **table** twin never got that gate, which is precisely why it drifted to 30 tables. **The gate is the deliverable, not the sweep.**

## Standing items — what Phase 4 still owes

**Blocked on a named nod from Stefan:**
- **W2 — the deletion.** Ready in one commit: `git rm -r hub-legacy` · drop `.gitignore:64` · root CHANGELOG entry. Provenance comments in `hub/` and two migrations stay (referent becomes the tag).
- **W3 — root manifest to tooling-only** (deps carve-out). Keep-set established by sweep: **`dotenv`, `@supabase/supabase-js`, `gray-matter`, `marked`** — an honest delta against ADR-U032, which named only the last two. Three root deps have **no consumer anywhere**: `better-sqlite3`, `cross-fetch`, `whatwg-fetch`. **Also needs a clean test window** — its DoD is the full suite green, and a `next dev` server was live all session against the one shared dev DB.

**Then, in order:** W6 (docs pass — ADR-U032 status, README Phase-4 row, the two live-path pointers in `hub/CLAUDE.md:11` and `hub/SPECIFICATION.md:28`, then doc-health) · W7 TASK-SEAL-01 · W8 TASK-RDA-03 · W9 TASK-E2E-02 + its purge. **No markdown link anywhere points into a `hub-legacy/` path**, so deletion breaks no links; historical records (bridges, gates, plans) are never rewritten.

**Carried, unchanged:** G-3 journeys deferral · `TASK-E2E-03` · E2E-04's integration half · `ROADMAP.md` (P4-6: Eid kickoff) · the done-sweepable tension (P4-8: Ferd wave retro) · deferred Eid piles · watch item AC4-O1.

**Not Phase 4:** the Ferd wave close itself (human-verified DoD walk; `waves/ferd.md` is still a stub).

## Next

Stefan's named approval on W2 (and W3, which also wants a quiet test window). Everything else in Phase 4 queues behind those two.

## Close ritual

- [x] Board settled and recorded; plan is the live artifact
- [x] W1 executed and passed; its own limit closed by live verification; new finding filed as a task
- [x] W4 attested by measurement; W5 shipped and green
- [x] Retrieval tag pushed and verified (178 files)
- [x] Zero open PRs; dashboard refreshed; session bridge (this file)
- [ ] **W2 deletion — HELD, awaiting the named nod** (correctly, not an oversight)
