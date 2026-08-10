# Session bridge — RDC-03 ruled and closed, and the filing was wrong in both directions

**Date:** 2026-08-10 (session 18) · **Wave:** Ferd · **Cycle:** none active
**Continues:** [`2026-08-10_01`](./2026-08-10_01_-_RD-C-SHIPPED-THREE-FALSE-PREMISES-NONE-CAUGHT-BY-REVIEW.md) — **discharges its "Next" line's first half.**

---

## READ THIS FIRST

1. **`TASK-RDC-03` is ruled, built, applied and merged** (PR #478, `892205c`). Option 1: the dead
   refusal-audit INSERTs are **deleted**, not made real. Refusals are now a **deliberate non-goal**,
   and both specs that claimed otherwise say so.
2. **The filing was wrong in both directions, and only an enumeration could show it.** It named a
   function that was already clean and **missed one that wasn't**. The task's own AC#1 —
   *enumerate by grep, not assume* — is the only reason this surfaced.
3. **Session 17's false premise #3 was live in two more places.** Same 42501-collapse, in the two
   functions PC029's corrective did not touch. Folded into the same pass.
4. **Two test tiers were green over it, for two different reasons** — and one of them was *mocking a
   contract the substrate did not have*. This is the session's real finding.
5. **`doc-health-check` caught FEAT-PC029 at `6-done` with no Implementation notes** — the
   whole-tree sweep's first new catch since the 2026-07-25 process fix. Backfilled, not filed.

## The ruling

**Option 1 — delete the dead INSERTs.** Postgres has no autonomous transactions, so making refusal
auditing real meant a `dblink`/`pg_background` side-channel or turning every refusal into a returned
result — a contract change across the whole admin family. Neither is worth a trail nobody has
missed. **Folded in, ruled in the same sitting:** the sibling SQLSTATE correction below.

## What the enumeration corrected

Read from `pg_proc`, not migration text:

| Function | Filed as | Actually |
|---|---|---|
| `admin_retire_role_template` | in scope | in scope |
| `admin_publish_role_template` | **not named** | **in scope** |
| `admin_delete_role_template` | "fix in the same pass" | **already clean** (`20260810120000`) |

Re-measured: **6 808 audit rows · 46 distinct actions · 0 matching `%_refused`.** Premise holds.

The filing's Scope section is **deliberately left as written**, corrected in the ruling rather than
edited away — the gap between what a finding assumes and what the catalogue says is the whole reason
that AC exists.

## The second defect — the same sweep, not a second investigation

Both guards raised **`42501` for a business refusal**. `hub/lib/admin/roles.ts:130` collapses
**every** `42501` into `refused` before it can become an `AdminRolesError` — so the routes' own
`42501 → 403` branches were **unreachable dead code**, and:

- *"a system role template cannot be retired"* → **"Not found"**
- *"a retired role template cannot be published"* → **"Not found"**

about a template plainly visible in the list the admin was reading. Both moved to **`P0001` → 409
verbatim**; `42501` stays on the non-admin gate, where hiding existence is correct.

## The finding worth carrying

**Two tiers were green over a broken path, for two different reasons:**

- **Integration** calls the RPC directly and never crosses `call()`. It saw the raise and passed.
- **Unit was mocking a response body the real route could not produce.**
  `admin-role-publish-route.test.ts:116` asserted `P0001 → 409` verbatim — **a contract the
  substrate did not have until this migration made it true.**

**A passing test asserting a contract that does not exist is the same failure as a spec asserting a
mechanism nobody read.** That is four instances in two sessions. The mechanism walk added in #477
catches the spec-time half; **nothing yet catches the test-time half** — a mock is a spec written in
TypeScript, and no one walks it. Worth a rule: *a mock of a contract boundary must cite the
substrate that produces it.*

Only the **route tier** crosses `call()`. Two cells added there, both demonstrated red at
**404-where-409-belongs**.

## Sibling-assertion sweep — zero invalidated, and structurally so

Every `42501` assertion in the suite pins the **non-admin gate**, which the migration preserves.
Enumerated in the migration header per the tier rule, then **confirmed empirically at 92/92** rather
than left as reasoning.

## Doc health (run at close — schema-migration trigger)

- **1.5 — 2 fixed.** `TASK-RDC-02:76` still asserted "audits its refusals" (struck + annotated;
  left visible because that task is where the false claim was copied forward). The
  **RD-B substrate dossier**`:138` quoted a function body that no longer exists — Section 3.7
  snapshot drift, in a file whose stated purpose is *"what the substrate actually is"*. Banner'd.
- **5.6 — 1 critical, fixed in place.** `FEAT-PC029` at `6-done` with **no** Implementation notes.
  Backfilled rather than filed: `TASK-DOC-004` (the PC002 instance) had to be filed **twice** before
  it was fixed, and filing reads as diligence while the original ages. **This spec closed after the
  2026-07-25 fix that made the sweep whole-tree — so the fix caught its first new instance.**
- **1.6 / 4.5 / 3 clean.** No unfiled deviation markers, no gate-review flags, links resolve.
- **Owed to the skill (held for the nod — steering file):** a Section 1.5 row for the retired
  "refusals are audited" claim, and a Section 3.7 registry row for the dossier.

## Numbers at close

Route/component unit **37/37** · the three integration suites asserting on these functions
**92/92** · both new E2E cells **red → green** · eslint **0** · `next build` clean · applied-object
ACLs `postgres/authenticated/service_role` (no bare `=X/`, no `anon=X`) · orphan instrument
**954 → 954** · leak **0 → 0** · dashboard refreshed (**840** files) · **zero open PRs**.

## Standing items

- **The carried list is unchanged and still growing faster than it shrinks:** AB-6's docket ·
  Phase-4 cutover · G-3 journeys deferral · `TASK-RDA-03` · `TASK-E2E-02/03` ·
  `hub/SPECIFICATION.md` → `./ROADMAP.md` placeholder · the `done`-no-longer-implies-sweepable
  tension · deferred Eid piles.
- **E2E-04's integration-tier half** (W-7 PAIR cells) — still un-owned, still no mechanism.
- **New:** the mock-as-unwalked-spec rule above has no home yet.
- **Queued:** AB register pinning — all eight items, **in a fresh session**, now that RDC-03 closes.

## Next

**Phase-4 cutover / AB-6** — the strategic items that keep being carried, and that small
well-scoped work keeps winning against.

## Close ritual

- [x] Migration applied on a **named** approval; **applied** objects' ACLs read from `pg_proc`
- [x] Red demonstrated on **both** new cells before the fix, each labelled honestly
- [x] The pinning cell flipped **deliberately** — value unchanged, meaning changed, comment rewritten
- [x] Sibling-assertion sweep enumerated in the migration header, then confirmed empirically
- [x] Three CHANGELOGs updated (root cycle entry, Hub member-facing, platform-core substrate)
- [x] A stale substrate snapshot banner'd rather than rewritten
- [x] A `6-done` spec missing its notes **fixed**, not filed, with the reason recorded
- [x] Dashboard refreshed; PR merged and verified by `mergedAt` + content on `origin/main`
