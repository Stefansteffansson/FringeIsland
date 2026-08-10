# Session bridge — RD-C shipped, and three false premises in one 4-ready Core spec

**Date:** 2026-08-09 → 2026-08-10 (session 17) · **Wave:** Ferd · **Cycle:** none active
**Continues:** [`2026-08-09_05`](./2026-08-09_05_-_JANITOR-BOUND-AND-WAS-ALSO-BLIND-H045-STORY1-SHIPPED.md) — **discharges its whole "Next" line.**

---

## READ THIS FIRST

1. **`FEAT-PC029` and `FEAT-H045` are both `6-done`.** Two migrations applied on named approvals, ACLs verified on the **applied** objects.
2. **Three premises in one `4-ready` Core spec were false. None was caught by review** — all three by building or by a test. This is the session's real finding.
3. **A fourth near-miss was mine:** I wrote a promise into a migration header ("a route-level cell is added with STORY-2") before building it. Built now — but that is the PC028/H044 unbuilt-commitment shape recurring.
4. **The `ecosystem-decomposition` skill gains a "mechanism walk"** to catch this class at spec time. **Held for the merge nod** (steering file).
5. **Five PRs merged this session** (#471–#475), each verified by `mergedAt` + content on `origin/main`. **Zero open.**

## The three false premises — the pattern is the finding

All three had the **same shape: the spec asserted what an already-shipped mechanism does, without reading it.**

| # | The spec said | The substrate said |
|---|---|---|
| 1 | *"publication rows are never deleted"* — the guard's self-declared **load-bearing half** | `admin_unpublish_role_template` **hard-deletes** them; no `unpublished_at`. Publish → unpublish would read as never-offered and **destroy a template RD-4 protects** |
| 2 | *"retire audits its refusals"* — copied into STORY-2 as the posture to match | **0 rows matching `%_refused` out of 6 619**, across 46 actions and 118 retires. `RAISE` discards the audit INSERT in the same transaction. Dead since those functions shipped |
| 3 | a refusal *"surfaced verbatim"* | Guard raised `42501`; the BFF maps that to an existence-hiding **404**. *"This template was offered to groups"* reached the admin as *"Not found"* |

**Every one was a single catalogue query or `grep` away at spec time.** Every one instead cost a build-time correction, and **two were caught only because a test happened to assert them**.

**#3 is the instructive one.** The integration suite calls the RPC **directly**, so it stayed green while the BFF path was broken. The gap was not a missing assertion — it was a **missing tier**. A route-level E2E cell now asserts 409 plus the exact literal and would have failed against the pre-corrective contract.

**Measured exposure for #1 was 0 templates** — latent, not live, and reachable by precisely the journey the feature serves (clone, try it, unpublish, retire, delete).

## What shipped

- **PC029** — one predicate serving both the `deletable` badge and the write, so they cannot disagree; `admin_get_role_templates` widened additively; the guarded delete refusing before any write and capturing name + version count **before** the row ceases to exist. Applied, ACLs verified: no PUBLIC `=X/`, no `anon=X`.
- **Corrective `20260810120000`** — guard refusals `42501` → **P0001 → 409 verbatim**, leaving 42501 to the non-admin gate where hiding is correct. Also **removed the dead refusal-audit INSERT** rather than leaving a line that reads as auditing but audits nothing.
- **H045 STORY-1/2/3** — the `Retired (N)` fold, and disposal living inside it as well as on the detail view. The Hub **renders** eligibility and never derives it; the detail view gets the keys by BFF composition from the list read, the path already carrying blast-radius facts.
- **`next build` caught what no test could:** `useSearchParams()` opts a client component out of static prerendering without a `<Suspense>` boundary. `/admin/roles` remains static.

## The decision you took

**Audit-log guard over tombstoning the publications table.** The alternative (`unpublished_at` + soft-delete unpublish) changes shipped PC028 semantics and forces every existing reader to filter — the "grows a state machine" case the appetite calls escaped.

**Consequence carried:** `admin_audit_log` is now **load-bearing for a guard**, not only observability. Anything pruning it must exclude `role_template.publish` rows.

## Standing items

- **`TASK-RDC-03` — the family-wide dead refusal-audits.** `admin_retire_role_template` and siblings still carry the pattern; PC029's function stopped claiming it. Three options filed, **option 1 recommended** (delete the dead INSERTs, correct the Observability wording). **Needs your ruling.**
- **The mechanism-walk skill amendment** — written, held for the merge nod.
- **The carried list is growing faster than it shrinks.** Three bridges running: **AB-6's docket · Phase-4 cutover · G-3 journeys deferral · `TASK-RDA-03` · `TASK-E2E-02/03` · the `hub/SPECIFICATION.md` → `./ROADMAP.md` placeholder · the `done`-no-longer-implies-sweepable tension · deferred Eid piles**. Worth naming: small well-scoped work keeps winning because it finishes cleanly.
- **E2E-04's integration-tier half** (W-7 PAIR cells) — still un-owned, still no mechanism.

## Numbers at close

E2E **139/139** (10.2 min) · unit **1433/1433** (170 suites) · admin integration 8 suites / **165** · disposal suite 15/15 (red-first, 15/15 failing) · eslint **0 errors** (3 warnings, all pre-existing in untouched files) · `next build` clean · orphan instrument **954 → 954** · DeusEx leak **0 → 0** · anonymous sweep **1 → 0** (the bounded-janitor signature, third consecutive fleet) · dashboard refreshed (839 files) · discovery **0/0**.

## Next

**`TASK-RDC-03`** (needs a ruling, then a small corrective), then **Phase-4 cutover / AB-6** — the strategic items that keep being carried.

## Close ritual

- [x] Two migrations applied on **named** approvals; **applied** objects' ACLs read from `pg_proc`, not trusted from migration text
- [x] Three false premises corrected **in the specs themselves**, not just worked around in code
- [x] A promise I wrote into a migration header and had not built — found and built, and named as a near-miss rather than quietly closed
- [x] A test that passed on first run **labelled** as a negative assertion, never claimed as red-first
- [x] Sibling test adaptations labelled in place; no assertion silently dropped
- [x] A feature held at `5-in-cycle` until its last AC was genuinely live, then moved to `6-done`
- [x] Five PRs merged and verified by `mergedAt` + content; zero open
- [x] Dashboard refreshed; discovery swept and synced **0/0**
