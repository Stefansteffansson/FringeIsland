# Cycle COR-E — corrections from Anatomy-Conformance Audit V (the post-cutover tidy-up before the Ferd close)

**Date:** 2026-09-05 · **Status:** **DRAFTED — decision board OPEN.** Nothing executed. Workstreams marked *fuller-auto* can run the moment the board settles; those marked *ask-first* are steering-file, ADR-index or deletion carve-outs and wait for Stefan's named nod per `AGENTS.md`.
**Source register:** [`ANATOMY-CONFORMANCE-AUDIT-5.md`](../reference/ANATOMY-CONFORMANCE-AUDIT-5.md) (findings AC5-1..16, AC5-O1..O6, GC-24..27, rulings R-10..R-14).
**Shape:** same as COR-A..D — named workstreams, each mapped to finding IDs and a gate; behaviour-preserving throughout. **This cycle touches no code ring and no schema**: Audit V found the code conformant and gate-green; every item below is documentation, steering, tooling, or a gate that keeps documentation honest. The one code-adjacent workstream (W5) deletes three scripts and adds one unit test.
**Why now:** the Ferd close is next. Its wave DoD walk reads the routing documents, the wave file, the plan status and the feature specs — all of which Audit V found stale or missing. COR-E lands first so the close audits a tree that tells the truth, then the close writes `ferd.md` and walks the DoD.

---

## Decision board (settle before execution)

| # | Decision | Owner call | Recommendation |
|---|---|---|---|
| 1 | **R-10** — `DOMAIN_ENTITIES.md`: extend-and-gate (absorb ADR-U050, add missing entities as one-liners, join doc-health §11) or demote to orientation and drop the U050 sentence | ruling | **Extend, light touch** — state table + one-line rows with pointers; the file joins the §11 stamp check either way |
| 2 | **R-11** — Performance budget: backfill 36 sections or a dated grandfather rule (pre-ADR-U043 specs exempt until next amendment) + "N/A" lines for PD019/PD020 | ruling | **Grandfather** — the numbers already live in the perf ledger; a section per old spec would be a snapshot of it |
| 3 | **R-12** — the three root test-data scripts: delete, or fold into `walk-cast.mjs` as a `seed` mode | ruling (deletion carve-out) | **Delete** — `walk:cast`, the suite helpers and the teardown census are the sanctioned paths; ADR-U053's seed pre-flight replaces a manual seeder |
| 4 | **R-14** — `cycle-current.md`: retire the convention or adopt it | **RULED 2026-09-05 (Stefan): adopt.** The file exists so Stefan has one fixed place to see what is being built, instead of hunting for the newest date-stamped document; it went stale because nothing wrote it and nothing checked it | **Adopt with a writing step and a gate** — (1) the file is a ten-line *front door* (cycle, goal, link to the dated plan, link to the latest bridge, board status, next), never the plan itself; (2) PROCESS.md §3 gains two rules — kickoff writes it before decomposing, close repoints it to "next" — and the session-start hook injects its content into every session; (3) a CI unit test fails when its plan link does not resolve or the linked plan carries a closed status. Rides W3 (the file), W2 (the rules + hook), W8 (the gate) |
| 5 | W2 wording for the three steering files (`AGENTS.md` structure + test line; `SESSION-OPENER.md` focus line; root `CLAUDE.md` header) | steering-file carve-out | Draft in the PR body, merge on the named nod |
| 6 | Sequencing: COR-E → Ferd close (`ferd.md` + DoD walk + doc-health) → ADR-U053 adoption, or interleave U053 now | priority call | **COR-E first, one session;** ADR-U053's ruling can land in parallel (it is Stefan's), its adoption steps after the close |
| 7 | AC5-O3 — `how-we-work/`: add a reconciliation stamp and a "derived from PROCESS.md" banner, or leave as a dated narrative | editorial | Stamp + banner (W4, two lines); no content rewrite |

---

## Workstreams

### W1 — the architecture tree tells the truth (AC5-3, AC5-5, AC5-6 · R-10) — *fuller-auto*
- `ARCHITECTURE_ANATOMY.md`: move the stamp to **ADR-U047 Amendment 4 + the 2026-09-05 retention rule**, with the "no tier/service/core/boundary moves" sentence; the PC-1 row gains one clause — *every log-shaped table declares its bound in the ownership manifest's `retention` section, pruned by pg_cron, plus a cron-history prune and a weekly maintenance job (a declared stopgap until ADR-U053)*; note ADR-U053 as Proposed-not-absorbed.
- `docs/architecture/README.md`: lines 19 and 42 → **v2.7 (2026-08-11, Audit IV W7)**; line 41 (`DOMAIN_ENTITIES.md` "only place") → the R-10 wording.
- `DOMAIN_ENTITIES.md` per R-10: the four-state table on the User entity (`active` / `paused` / `suspended` / `decommissioned`, derived from the booleans + `deactivation_origin`, self-service vs admin transitions as the ownership line), one-line rows for Conversation / Message / Forum post / Announcement / Content report (DS-5), Notification (vertical substrate, DS-5 routing), Consent record (PC-2), Audit row (PC-4), Journal entry (DS-7), Telemetry event (PC-1) — each a pointer to its owning spec and migration, no property tables; stamp → ADR-U050 (with the U046 absorption retained in the history line).
**Gate:** doc-health §11 (extended in W8) re-run green; the anatomy pair's "no diagram impact" recorded (the SVG stays v2.7 — nothing moves).

### W2 — steering files (AC5-7, AC5-15, R-14) — *ask-first: prepare the PR, merge on the named nod*
- `AGENTS.md` §Project structure: `hub/app/`, `hub/components/`, `hub/lib/` — the Hub application (root is tooling-only since Phase-4 W3); `scripts/` + `hub/scripts/` — tooling (registry: `scripts/README.md`, W5); `.agents/skills/` — vendored Supabase agent skills (`skills-lock.json`), reference-only. §Build & test: replace `npx supabase test db` with the two real DB gates (`npm run test:integration` and `npm run test:integration:platform -w hub`, local-only until ADR-U053).
- `docs/planning/SESSION-OPENER.md` line 7: **Phase 4 closed 2026-08-12; the build is done; current focus = the Ferd close** (pointer to the latest bridge for live state — the line already says the bridge is the source of truth; make the focus line match).
- Root `CLAUDE.md` header: "Last updated" moves; the "Reflects:" sentence becomes a pointer — *the entity model and decisions are the anatomy's (`docs/architecture/ARCHITECTURE_ANATOMY.md`, stamp inside) and the ADR index's* — no ADR enumeration in the header. The "Active cycle" row stays and reads *"`docs/planning/cycles/cycle-current.md` — the front door: what is being built now, linking to the dated plan and the latest bridge"*.
- `docs/planning/PROCESS.md` §3 (R-14 = adopt): two rules — *at cycle kickoff, write `cycle-current.md` before decomposing anything; at cycle close, repoint it to what is next* — plus one sentence that the dated plan documents remain the plans and the front door only points at them. The `wave-planning` and `feature-development` skills gain the same two steps where their kickoff/close mechanics live (skills are not steering files; that half is fuller-auto).
- `scripts/session-opener.js` (the SessionStart hook): after the opener text, inject the content of `cycle-current.md` so every session starts by reading the front door and is told to keep it current. Fails quiet if the file is missing, like the opener itself.
**Gate:** doc-health §9 (cascade) + §3 (pointer integrity) green; Stefan's nod in the PR thread.

### W3 — the planning tree's status layer stops being a manual list (AC5-1, GC-26) — *fuller-auto*
- `docs/planning/hub-v2/README.md`: replace the "Current status" paragraph with a three-line block — *Phases 0–4 complete (Phase 4 executed 2026-08-11/12, exit checklist 7/9 at 2026-08-13; the two open items are the E2E smoke job in CI and ADR-U053). Live state: the most recent bridge under `docs/planning/sessions/`. Next: the Ferd close.* The phase table's Phase 3 and Phase 4 rows close (dates, links to their closing bridges); a final row "Post-cutover (2026-08-13 → )" points at the leftovers pass, DB-4, the retention gate and ADR-U053 by bridge link. The "Tracking" paragraph stays — it already argues for exactly this.
- `docs/planning/waves/README.md`: the Ferd row's status → *"Build complete; close pending (ferd.md is the close's first deliverable)"* until the close writes it.
- `docs/planning/waves/ferd.md`: **not written here** (AC5-2 is the Ferd close's own first leg, `wave-planning` skill); W3 only replaces the placeholder line with an honest pointer: *"Scope = the specs tagged `wave: ferd` (100 at 2026-09-05, all `6-done`); DoD per `docs/templates/wave-spec.md`; to be written at the Ferd close."*
- `docs/planning/cycles/cycle-current.md` (R-14 = adopt): written for COR-E itself as the first instance of the front door — cycle name and goal in one sentence, link to this plan, link to the latest bridge, board status, "next: the Ferd close". The cycles README describes the ten-line shape and the two rules. The `docs/templates/cycle-plan.md` template is re-pointed: the dated plan document uses it; the front door has its own five-field shape.
**Gate:** doc-health §3 pointer integrity; the dashboard regenerates (`npm run dashboard`); the W8 front-door test green.

### W4 — cascade and spec hygiene (AC5-8 docs half, AC5-10, AC5-11, AC5-13, AC5-16, AC5-O3, board row 7) — *fuller-auto*
- `docs/platform/CLAUDE.md` §Testing: the domain list becomes the live set (`account`, `admin`, `auth`, `communication`, `groups`, `journal`, `journeys`, `notifications`, `observability`, `platform`, `profile`, `security`) with `platform` named as the conformance family; §Database migrations step 3 follows W5's rename.
- Broken links: `hub/CHANGELOG.md` (H041, two rows) and `FEAT-PC026` (ADR-U052 filename).
- "route group" → "path segment" in `FEAT-H034` line 19 and `FEAT-H040` line 39 (instance grep for `route group` across `docs/` at the same time — the memory rule).
- Implementation notes filled for `FEAT-PC019` and `FEAT-H037` from their closing bridges and migrations (what shipped, where, the gate that pins it).
- ADR index (`decisions/README.md`) row annotations: U014 *"Accepted — chartered, zero substrate, deferred (ADM-15; anatomy PC-1 row)"*; U015 *"Accepted — scope narrowed to the platform surface by ADR-U038 clause 3"*; U004 *"Accepted — the mechanism; vocabulary Visitor → Shadow → Mist (U027 → U031)"*. Index rows only; ADR bodies untouched.
- `docs/ecosystem/how-we-work/README.md`: a "derived from PROCESS.md, the skills and the cascade — canon wins" banner and a "last reconciled" stamp (currently 2026-07-31).
**Gate:** the link checker used by Audit V re-run: 0 real broken links; doc-health §1/§3/§5 green.

### W5 — root tooling: registry, rename, deletion (AC5-4, AC5-8 manifest half, AC5-9 · R-12, GC-25, GC-27) — *ask-first for the deletion; the rest fuller-auto*
- Delete `scripts/cleanup-test-data.js`, `scripts/cleanup-test-users.js`, `scripts/seed-test-members.js` (R-12). Their one legitimate residue — "how do I get five clean FIMs for a manual walk" — is `npm run walk:cast -- create`.
- Rename `scripts/apply-migration-temp.js` → `scripts/apply-migration.js` (header rewritten: what it does, the management-API path, the `repair --status applied` pairing); update `docs/platform/CLAUDE.md` step 3, `.claude/skills/doc-health-check/INVOKE.md` if it cites it, and any live task template.
- `scripts/README.md` — the registry: every root and `hub/scripts/` script, one line each (purpose, inputs, whether it touches accounts, its teardown/census obligation). Root `package.json` devDependencies are annotated as "serve `scripts/`".
- `package.json` (root + hub): remove `test:integration:rls` / `:rbac`; add root passthroughs for `test:integration:account`, `:observability`, `:platform`.
- **GC-25 gate:** `hub/tests/unit/platform/integration-scripts-resolve.test.ts` — every `test:integration:*` script's path exists and matches ≥1 test file.
- **GC-27 gate:** `hub/tests/unit/platform/script-registry.test.ts` — every file under `scripts/` and `hub/scripts/` is a row in `scripts/README.md`; any script whose source calls `auth.admin.createUser` or `auth.admin.deleteUser` carries a teardown/census note in its row.
**Gate:** unit tier green (CI); `npm run dashboard` still generates (the root-tooling keep-set check in CI).

### W6 — nothing (reserved) — Audit V registered no code-ring or schema deviation
Recorded so the COR-lettering stays comparable with A–D: no schema gate, no migration, no ownership move this cycle. If R-10 (W1) surfaces a substrate fact the entity file cannot cite, that becomes a finding for the next audit, not a W6.

### W7 — Performance-budget disposition (AC5-12 · R-11) — *fuller-auto once ruled*
- If grandfather: `docs/templates/feature-spec.md` §Performance budget gains the dated rule; `AGENTS.md` §Always do gains the clause (rides W2's steering PR); `FEAT-PD019` and `FEAT-PD020` gain the "N/A (no surface)" line.
- If backfill: 36 sections, each naming its budget class and the ledger row that measured it (`docs/planning/reference/PERF-MEASUREMENT-LEDGER.md`), or "N/A (no surface)" for the PC/PD specs.
**Gate:** the Audit V spec sweep re-run: 100/100 carry the section or the grandfather line.

### W8 — gate patches for the documentation layer (GC-24, GC-25, GC-27) — *fuller-auto*
- `.claude/skills/doc-health-check/SKILL.md` §11: the procedure gains (i) the architecture README's diagram-version string vs the SVG `<desc>`, (ii) `DOMAIN_ENTITIES.md`'s stamp vs the ADR index (same rule as the anatomy: a no-impact review still moves it). §Known gaps notes that AC5-6 passed the 2026-08-20 run and why.
- GC-25 and GC-27 tests ride W5.
- **The front-door gate (R-14):** `hub/tests/unit/platform/cycle-current-front-door.test.ts` — parses `docs/planning/cycles/cycle-current.md`; asserts the plan link and the bridge link resolve to tracked files; asserts the linked plan's status line does not read CLOSED / DONE / COMPLETE (so the test goes red the moment a cycle closes and stays red until the file is repointed); asserts the "next" field is non-empty. Runs in CI with the unit tier. Doc-health §5 gains the same row for the cycle-boundary run.
**Gate:** the skill's INVOKE record for the next run cites §11's new rows and the front-door row.

---

## Order and dependencies

1. **Board settles** (rows 1–7). Row 6 fixes the sequence: COR-E → Ferd close → ADR-U053 adoption.
2. **W1, W3, W4 in one docs PR** (fuller-auto) — they share files (`README.md`s, the anatomy pair) and a single doc-health run verifies them together.
3. **W5 + W8** in one tooling PR — W5's deletion needs the nod (row 3); the two unit tests and the skill edit are fuller-auto and travel with it so the gates land in the same change as the surface they pin.
4. **W2 (+ W7 if grandfather)** as the steering PR — prepared with the full wording in the PR body, merged only on the named nod.
5. **Cycle close:** `npm run dashboard`; the `doc-health-check` skill runs as the cycle-boundary audit (AC5-O5) — its record goes under `docs/planning/hub-v2/` as `2026-MM-DD-cor-e-doc-health.md`; a session bridge; per-finding closure notes appended to the register (the COR-D pattern).
6. **Then the Ferd close begins**, not before: `ferd.md` written under the `wave-planning` skill (scope = the `wave: ferd` specs, DoD from the template), the wave DoD walk, DB-4's four unwalked legs on a fresh cast (or on the test project once ADR-U053 lands), the close retrospective.

Estimated size: one focused session for steps 2–4 (W1+W3+W4 ≈ half a session; W5+W8 ≈ a quarter; W2/W7 wording ≈ a quarter, plus the wait for the nods). No migrations, no test-database consumer beyond the unit tier.

## Definition of done

- Every AC5 finding carries a closure note in the register naming the PR (or the ruling that dispositioned it); observations AC5-O1..O6 carry their disposition.
- The three gates GC-24/25/27 exist and are green; GC-26 is recorded as structural (W3), not gated.
- Doc-health run clean at the cycle boundary, with §11's two new rows exercised.
- The routing chain a new session walks — `SESSION-OPENER.md` → `cycle-current.md` (injected by the hook) → `CLAUDE.md` → `AGENTS.md` → `hub-v2/README.md` → the latest bridge → `waves/ferd.md` — reads true at every hop on 2026-09-XX; the front-door test is green and has been seen to go red once (at COR-E's own close) before being repointed.
- `git status` clean; the discovery worktree synced; the dashboard regenerated.
