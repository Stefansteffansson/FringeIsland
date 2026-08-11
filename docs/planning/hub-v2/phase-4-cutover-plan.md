# Phase 4 — Cutover & retire (the hub-v2 close-out plan)

**Authored:** 2026-08-11, on the COR-D close ([bridge](../sessions/2026-08-11_02_-_COR-D-GATES-EXECUTED-ALL-MERGED-CYCLE-CLOSED.md): "Phase-4 cutover planning opens").
**Status:** **board SETTLED 2026-08-11** — Stefan: *"go with recommended"* (all eight rows P4-1..P4-8 as recommended). Execution in progress; the workstream trail at the foot records what has landed.
**Charter:** [hub-v2 README](./README.md) Phase 4 ("When every area is replaced, cut over and archive/delete the old Hub. *Gate: v2 is the Hub.*") + [ADR-U032](../../architecture/decisions/ADR-U032-hub-v2-coexistence-separate-tree.md) ("Phase-4 cutover: delete `hub-legacy/`; `hub/` is simply the Hub. No 'promote to root' churn.").

---

## Where this picks up

The README's sequence to cutover — **RD-A → RD-B → the AB-6 FULL audit → Phase 4** — is fully discharged: RD-A/RD-B closed (2026-08-06/09), AB-6 executed 2026-08-10 ([record](./2026-08-10-ab6-full-anatomy-audit.md)), and its corrective cycle COR-D closed 2026-08-11 with the anatomy stamp at ADR-U047 A3. At authoring: zero open PRs; platform conformance family 30/30 (7 gates incl. the invocation axis); discovery worktree synced.

**State of the ground (disk-verified 2026-08-11):**

- **Production already serves v2.** The stable domain (`fringe-island.vercel.app`, per the [J-O3 gate protocol](./2026-07-19-journeys-area-gate.md)) runs `hub/`; `hub/vercel.json` carries the region pin (`dub1`); there is no root `vercel.json`. The cutover is therefore **not a deploy event** — it is retirement + hygiene.
- **`hub-legacy/` has no `package.json`** — it leans on root's dependency set (dormant, per ADR-U032's interim note). The ADR's deferred half — **root reduced to tooling-only** — is still owed: root `package.json` has `workspaces: ["hub"]` and delegates all app scripts `-w hub`, but still carries app deps (`next`, `react`, `react-dom`, `@supabase/*`, `lucide-react`) and app devDeps alongside the genuine tooling deps (`gray-matter` + `marked` for the dashboard, `pg`, `better-sqlite3`, `dotenv` — exact keep-set to be established by a dependency sweep of `scripts/` + `.claude` hooks at execution).
- **Non-doc references to `hub-legacy` are trivial:** one `.gitignore` line (`hub-legacy/tests/e2e/.auth/*.json`), CHANGELOG prose (historical), and provenance comments in `hub/` code + two migrations citing the oracle (copy-with-correction attributions — these stay; their referent becomes git history).
- **There is no CI** (`.github/workflows` does not exist). The conformance family runs locally (`hub` script `test:integration:platform`; root delegation parity to be verified at execution).
- **`docs/planning/waves/ferd.md` is a stub** ("Content to be populated") — noted here so the wave-close step (not this phase) owns it.

---

## Decision board — SETTLED 2026-08-11 (Stefan: "go with recommended" — all eight rows) — presented whole, recommendations marked

| # | Decision | Kind | Options | RULING (settled — the recommendation stands) |
|---|----------|------|---------|------------------------|
| P4-1 | **TASK-SEAL-01 slotting** ([task](../backlog/tasks/TASK-SEAL-01-sealed-thread-admin-sight.md) — "slotting is Stefan's call at Phase-4 cutover planning") | slotting | (a) pre-cutover cycle · (b) **post-cutover, inside Phase 4 / Ferd** · (c) defer to Eid | **(b)** — it realizes a safety ruling (bullying-evidence sight) on a now-complete admin plane; pre-launch is the cheapest time; running it *after* the mechanical cutover means the schema-gated cycle builds against the final tree |
| P4-2 | **CI posture** (GC-16 second half, carried from COR-D board row 5 — "deploy posture is already on the table" here) | posture | (A) record full local-first non-goal · (B) **DB-free CI only**: GitHub Actions running `next build` + lint + unit on PR; conformance family + integration recorded as deliberate local-first · (C) full CI incl. DB suites | **(B)** — the build gate catches exactly the PC003 class (merged build-broken; ts-jest/eslint don't full-type-check). (C) rejected for Ferd: the integration suites run against the one live shared dev DB, where concurrent suite runs are a known hazard; CI-driven runs would collide with local sessions. Revisit (C) at Eid with an isolated CI database |
| P4-3 | **Deep-cold ~5.4 s admin class** (labelled exception extended at AB-6) | posture | (A) **keep the labelled exception pre-launch; re-attest at the Phase-4 gate and again at wave close** · (B) buy Vercel Pro scale-to-one now (parked with Stefan since 07-19) · (C) engineering attack on the admin cold path | **(A)** — the class is deploy-platform cold provisioning, not an app regression; warm budgets stay fully binding and the ADR-U043 pass runs at the gate regardless (never skipped). (B) is the launch-readiness lever, priced then |
| P4-4 | **TASK-RDA-03 slotting** (RD-5's lockout guard is on the delete door only; the grant-flip door can strip a group's last protected permission unguarded — high, ~3 h) | slotting | (a) **slot into Phase 4** as a small schema-gated corrective · (b) leave unscheduled | **(a)** — a known unguarded door on a protected-permission invariant should not survive into wave DoD ("no critical/high security vulnerabilities") |
| P4-5 | **TASK-E2E-02 slotting** (E2E fixture-cleanup silently fails on the consent FK RESTRICT; 1,289 `e2e-%` users measured on the dev DB) | slotting | (a) **slot the fix into Phase 4 hygiene**; the detritus purge then executes under its own named nod (destructive, dev-DB data) · (b) leave unscheduled | **(a)** — the leak actively distorts measurement (it sized the PC024 page walks); fix the pattern, then purge deliberately |
| P4-6 | **`ROADMAP.md` placeholder** (three live "when written" pointers: Hub DESCRIPTION, README, SPECIFICATION) | disposition | (a) write NOW/NEXT/LATER at Phase-4 close · (b) **defer to Eid kickoff, recorded here** | **(b)** — NEXT/LATER *is* Eid planning; writing it inside a retirement pass would invent forward canon ahead of the planning that owns it. The pointers already say "when written" and stay honest |
| P4-7 | **Oracle retrieval form** | defaulting | (a) **annotated tag `hub-legacy-final` on the pre-deletion commit** · (b) archive branch | **(a)** — one-command retrieval (`git show hub-legacy-final:...`), nothing to maintain; an archive branch invites divergence and trips the pushed-but-unmerged deletion trap |
| P4-8 | **"done no longer implies sweepable" tension** (recorded at the 2026-08-06 boundary retro) | defaulting | (a) rule here · (b) **stays with the retro record; adjudicate at the Ferd wave retro** | **(b)** — it is a lifecycle-policy question spanning all areas, exactly what the wave retro exists to settle |

---

## Workstreams

### W1 — Oracle discharge check (blocks W2)
Before the oracle is deleted, sweep the [behaviour inventory](./behaviour-inventory.md) coverage map (~650 cases / ~69 files): every STRONG/PARTIAL row is either **built** (evidence: the owning area gate) or **named in the deferred register below with an owner**; silences confirmed dispositioned. Output: a dated discharge note (appended here or as `./2026-08-XX-oracle-discharge-note.md`). Nothing the oracle guarantees may be silently lost with the tree.

### W2 — Retire the oracle (destructive — PR held for a named nod)
Tag per P4-7 → `git rm -r hub-legacy/` → drop `.gitignore` line 64. Provenance comments in `hub/` and the two migrations **stay** (referent: git history via the tag). Root CHANGELOG entry. This PR is held under the fuller-auto destructive-ops carve-out.

### W3 — Root manifest to tooling-only (ADR-U032's deferred half — deps carve-out, PR held)
Dependency sweep of `scripts/` + `.claude` hooks → establish the root keep-set; remove app deps/devDeps from root (they live in `hub/`); verify root delegation parity (incl. `test:integration:platform`). Green-after proof: `next build` (the type gate), full unit + integration + E2E, dashboard generate/serve, session hooks.

### W4 — Deploy posture attestation
Formally attest what is already true: the Vercel project builds from `hub/`, `fringe-island.vercel.app` serves it, region pin `dub1`. Note the stale-cache redeploy trap in the attestation. No infra change expected; any surprise found here stops the line.

### W5 — CI posture (per P4-2)
If (B): one workflow — `next build` + lint + unit on PR; record the conformance family's local-first posture in the GC-16 trail. If (A): the recorded non-goal, same trail.

### W6 — Docs pass + doc-health
ADR-U032 status → executed; hub-v2 README status table + Phase-4 row closed; active-tree pointer sweep (any doc pointing at `hub-legacy/` **as a live path** is fixed; historical records — bridges, plans, audits — are never rewritten); CHANGELOGs (root + `hub/`; check platform-core too per the standing which-changelog ambiguity); dashboard refresh; then a full **doc-health-check run** (mandated: tree deletion is a cross-cutting change).

### W7 / W8 / W9 — slotted cycles (per P4-1 / P4-4 / P4-5)
TASK-SEAL-01 (schema-gated cycle; DoR per the task file: contract walk against live signatures, ADR-U016 cascade check) · TASK-RDA-03 (schema-gated corrective: guard parity on the grant-flip door) · TASK-E2E-02 (cleanup-pattern fix, then the purge under its own named nod). All red-first, held at their gates, one integration-touching cycle at a time (shared dev-DB rule).

---

## Order and dependencies

W1 → W2 → W3 → { W4, W6 } · W5 after the board settles, anytime · W7/W8/W9 after W3 (build against the final tree), sequentially. The phase's PR-hold points: W2 (destructive), W3 (deps), W7/W8 (schema gates), W9's purge (destructive, dev DB).

---

## Exit checklist — the Phase-4 gate (planted now; verdict is Stefan's)

- [ ] W1 discharge note on record; the deferred register below restated plainly at close (standing ask)
- [ ] `hub-legacy/` absent from `main`; tag `hub-legacy-final` exists; no active-tree doc treats `hub-legacy/` as a live path
- [ ] Root `package.json` tooling-only; `hub/` owns all app deps; build + full suites + dashboard + hooks green after the split
- [ ] Deploy attestation recorded (what production serves is `hub/`)
- [ ] CI posture executed per P4-2 (workflow live, or the non-goal recorded)
- [ ] Slotted cycles closed through their gates (red-first; held PRs; migrations only on named approval)
- [ ] ADR-U043 pass at the gate: warm budgets binding; deep-cold per P4-3 (the pass itself is never skipped)
- [ ] ADR-U032 marked executed; CHANGELOG entries; doc-health-check clean (0 critical); dashboard refreshed; closing session bridge written
- [ ] **Gate: v2 is the Hub** — nothing in the repo, the deploy, or the active docs still needs the old one

---

## Deferred register — what Phase 4 deliberately does NOT do

- **G-3 journeys deferral** — carried unchanged, to Eid.
- **TASK-E2E-03** (shared-identity revocation audit, 13 named specs) — standing, continues on its own cadence; not a Phase-4 item.
- **E2E-04's integration-tier half** — carried unchanged.
- **`ROADMAP.md`** — per the P4-6 ruling: written at Eid kickoff, not here.
- **The done-sweepable tension** — per the P4-8 ruling: Ferd wave retro.
- **Ferd wave close itself** — a separate, human-verified step under the `wave-planning` skill (feature-completeness / quality / documentation / DoD walk; populate the `ferd.md` stub there). Phase 4 ends the *rebuild program*; it does not declare the wave complete.
- **Deferred Eid piles** — untouched, to Eid planning.
- **Watch (no action owed):** AC4-O1 — DS-5 → `admin_audit_log` direct writes.

## After Phase 4

Ferd wave DoD walk (wave-planning skill, human verdict) → Ferd wave retrospective → Eid kickoff planning (ROADMAP.md, G-3, the deferred piles).

---

## Workstream trail (execution record)

### W1 — Oracle discharge check — **PASSED 2026-08-11** ([note](./2026-08-11-oracle-discharge-note.md), PR #499 merged)
**Verdict: safe to delete, with named exceptions. Zero UNACCOUNTED findings.** All 10 Coverage-map rows exhausted; ~40 named guarantees traced to v2 test `file:line`; the six A-ADM deferrals each carry a dated, cited home. Three named exceptions recorded (E1 the catalog-write pin has no executable test; E2 the oracle's exact-count pins are retired by decision and template grant counts are not re-pinned; E3 two A-ADM drops are permanent with no revisit date) — **all pinning and paper-trail gaps, none a lost behaviour, none blocking.** The note states its own limits honestly, including that no suite was executed and that seven of nine rows lack a gate-authored oracle discharge.

**The check then found something by closing its own limit.** Its limit 5 admitted E1's seal was *documented, not verified live*. A read-only query settled it: the seal **holds** (RLS enabled, one SELECT policy, zero write policies; all 42 public tables have RLS on) — but the ADM-F dossier's stated reason, *"no table GRANTs"*, is **false**: `anon` and `authenticated` both hold INSERT/UPDATE/DELETE/TRUNCATE on that table. Right conclusion, wrong reason. Measured wider: the ADR-U038 table-grant narrowing is **12 of 42**, and **TRUNCATE was never in the revoke recipe** (4 otherwise-narrowed tables kept it). **Not a live vulnerability** — RLS refuses the DML, and PostgREST exposes no TRUNCATE verb. Filed as [`TASK-SEC-02`](../backlog/tasks/TASK-SEC-02-table-grant-narrowing-and-truncate-sweep.md) with **the gate, not the sweep, as the deliverable** (the function-grant twin of this class was worked three times before the 07-06 retro escalated it structurally; the table twin never got a gate, which is why it drifted). Bearing on W2: none.

### W5 — CI posture — **DONE 2026-08-11** (PR #496, merged)
`.github/workflows/ci.yml` — the P4-2 option-B gate: `next build` (the type gate) + lint + unit on every PR and on `main`. Node 20, `npm ci` workspace-aware, placeholder Supabase env (not secrets) so module-scope client construction succeeds without touching a database. **Verified on its own PR: green in 1m50s** — the workflow ran against its own branch, which is the proof the recipe works. A local `next build` was deliberately *not* run as pre-verification: a `next dev` server was live on `hub/.next` (PIDs 23616/15696) and a production build would have written into the same tree. The deliberate non-goal (integration + E2E + the platform conformance family stay local-first, one shared dev DB) is recorded **in the workflow header**, where the next reader of the pipeline will find it, not only here. GC-16's second half is now discharged.

**Noted in passing:** Vercel already builds a preview per PR, so `next build` had partial de-facto coverage; lint and the unit project did not. The gate is still worth its keep — PC003's class was a type error, and the Vercel check is a deploy artifact, not a merge gate.

### W4 — Deploy posture attestation — **DONE 2026-08-11** (measured, not assumed)
- **Production serves `hub/`.** `https://fringe-island.vercel.app/` → 200, `x-vercel-cache: PRERENDER`.
- **The region pin is genuinely in effect, which proves the Vercel root directory is `hub/`.** Three dynamic API routes (`/api/me/journeys`, `/api/profile/me`, `/api/account/state`) each returned 401 with **`x-vercel-id: arn1::dub1::…`** — the request enters at the Stockholm edge (`arn1`, the nearest PoP) and **the function executes in Dublin (`dub1`)**, exactly the pin in [`hub/vercel.json`](../../../hub/vercel.json). Had the project's root directory been the repo root, `hub/vercel.json` would have been ignored and functions would have run in the platform default region. This closes a premise the ADR-U043 perf model rests on and had never been directly evidenced.
- **Method note:** the root page's `x-vercel-id` shows `arn1` alone — that is the *edge* PoP serving prerendered HTML, **not** the function region. Reading it as the function region would have produced a false "the pin is not applied" finding. The dynamic-route probe is the real path; the static one is a proxy (per the standing measure-the-real-path rule).
- **No infrastructure change was made or needed.** The cutover is confirmed to be a retirement-and-hygiene exercise, not a deploy event.
- **Carried for the launch checklist, not actioned here:** the stale-restored-build-cache hang (a Vercel deploy freezing right after the Turbopack banner is fixed by redeploying without cache).

### W2 — retire the oracle — **retrieval tag PUSHED; the deletion itself is HELD for a named nod**
**The reversibility half is done and verified.** Annotated tag **`hub-legacy-final`** created on commit `c51ed486` (the last commit containing the tree) and **pushed to origin**; `git ls-tree -r hub-legacy-final -- hub-legacy` lists **178 files**, so retrieval is proven, not assumed. The tag message carries the three retrieval commands and points at the discharge note. P4-7 is discharged.

**The deletion is not done.** `git rm -r hub-legacy` is a destructive operation and a standing fuller-auto carve-out; it needs Stefan's explicitly-named approval. The permission layer independently refused the command, which is the process working rather than an obstacle. Working tree verified clean afterwards — nothing was half-applied, and `hub-legacy/` is intact on `main`.

**Ready to execute on the nod, in one commit:** `git rm -r hub-legacy` · drop `.gitignore:64` (`hub-legacy/tests/e2e/.auth/*.json`) · root CHANGELOG entry. The provenance comments in `hub/` and the two migrations **stay** — their referent becomes the tag.

**Pre-flight safety check — verified 2026-08-11**
Every surviving `hub-legacy` reference outside the tree itself is a **comment** — provenance attributions in `hub/jest.config.js:6`, `hub/lib/auth/session-guard.ts:26`, `hub/tests/helpers/supabase.ts:4`, two integration test headers, and two migration headers. **No import, no require, no tsconfig/jest/playwright path, no Next or Vercel config reference.** `.gitignore:64` is the only non-comment line. Deletion is mechanically inert: 178 tracked files, 1.8 MB.

### W3 — root keep-set established by dependency sweep — **analysis done 2026-08-11**
Sweep of `scripts/**` (the only root-owned JS) plus the session hook resolves the tooling keep-set to **four** packages: `dotenv` (7 scripts), `@supabase/supabase-js` (3 maintenance scripts), `gray-matter` and `marked` (both `scripts/dashboard/generate.js` — `marked` is *also* vendored to the browser from `node_modules/marked/lib/marked.umd.js`, so it must resolve at the repo root, not inside `hub/`).

**Delta against ADR-U032's note, recorded honestly:** the ADR named only `gray-matter` + `marked`; the sweep adds `dotenv` and `@supabase/supabase-js`, which the maintenance scripts genuinely require. Three root deps have **no consumer anywhere in the repo** and are pure carry-over: `better-sqlite3` and `cross-fetch` (no tracked consumer at all, not even in `hub-legacy/`) and `whatwg-fetch` (only `hub-legacy/tests/setup.ts`, which dies with the tree). `hub/package.json` already declares every app dependency at identical versions — the root/hub delta is exactly these five root-only names plus `jest-axe`/`@types/jest-axe`, which `hub/` alone holds. No version mismatches exist, so the split cannot drift resolution.

**Not yet executed, and why:** the split's Definition of Done requires the full suite green afterwards (unit + integration + E2E). A `next dev` server was live throughout this session and the integration suites run against the single shared dev database, so running them would have collided with manual testing. W3 executes in a clean window.
