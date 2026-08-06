# Session bridge — RD-A built, applied, and merged; two decomposition premises corrected by verification

**Date:** 2026-08-06 (session 12) · **Wave:** Ferd · **Cycle:** RD-A (**CLOSED**, both specs `6-done`)
**Follows:** [`2026-08-06_02_-_RITUALS-DISCHARGED-BOARD-CLOSED-RD-A-4-READY.md`](./2026-08-06_02_-_RITUALS-DISCHARGED-BOARD-CLOSED-RD-A-4-READY.md)

---

## READ THIS FIRST — RD-A is done; the next session opens at RD-B

1. **Both specs are `6-done`, migration `20260806170000` applied and merged** (#448, on the named approval "ok apply the RD-A migration and merge 448"). [FEAT-PC027](../../platform/core/features/FEAT-PC027-role-provenance-retirement-and-group-side-removal-contracts.md) + [FEAT-H043](../../products/hub/features/FEAT-H043-role-provenance-retirement-and-role-removal.md). Gate state at close: **integration 1060/1060 (75 suites) · unit 1311/1311 (161 suites) · E2E 133/133 · lint 0 errors · `next build` green.**
2. **Two decomposition premises were corrected by checking the substrate — carry the lesson, not just the result.**
   - **The delete refusal was TWO layers, not three.** The dossier's Finding 3 listed an RLS rule first; HYG-A had already dropped the `group_roles_delete` policy and revoked the DELETE grant (`20260803190000:4533,:4545`). The comment it cited as evidence is a **tombstone** — the same migration that wrote it dropped the policy, and it records where the rule *went*. **Generalisable: a comment naming a mechanism proves the mechanism was once there; the catalogue is the authority for whether it is there now.** The migration therefore carries no RLS delete change, and a guard cell now fails loudly on any attempt to re-open that ADR-U038 door.
   - **RD-5's lockout guard was specified unreachably.** "Would leave the group with no **holder** of a protected permission" can never fire: the held-by-members refusal precedes it, so the role provably has zero holders by then. Implemented and respecified by **definer**. Two further constraints narrow it: `prevent_last_leader_removal` means the Steward instance can never be made unheld, so the guard only fires where some *other* role is the last definer. Defensive depth, rarely reached.
3. **The sibling sweep missed one, and the reason generalises.** The E2E fleet came back 131/1 — a *forum-post* delete. Control run (main-in-isolation vs branch-in-isolation) proved it **caused, not pre-existing**. The step clicked `getByRole('button', {name: /^Delete$/}).last()` — page-wide and positional; opening the remove affordance gave the page four more "Delete" buttons. **The sweep greps for assertions naming changed objects; this assertion names no object at all — it names a button label and depends on how many things carry it.** Worth a process change: when a cycle opens or hides an affordance, grep the E2E fleet for bare accessible-name selectors.
4. **The backfill's live result is worth knowing:** 1771 rows stamped, **1** left honestly unknown (a `Member` instance in the FringeIsland Members system group whose grants had drifted from its template's only version), 4656 custom rows untouched. That one row is the live proof of the `version unknown` render path.
5. **TASK-RDA-03 is open and matters.** `set_group_role_permission` has **no** `is_protected` check on the revoke direction — a group can be bricked by flipping a grant off rather than by deleting a role, which is the outcome RD-5 exists to prevent, through a neighbouring door RD-A did not close. The task **leads with verifying the brick end-to-end** rather than treating the reasoning as proven; it was read from the contract body plus one incidental green revoke, not driven to an unrecoverable group.

## What this session did

Decomposition-correction PR (#447) → red-first gate suite (16 red / 3 green, every failure for the right reason) → migration + manifest → Hub unit tier red-first → **held at the schema gate** → named approval → apply + repair → 19/19 → full integration 1060/1060 → E2E fallout diagnosed by control run and fixed → 133/133 → both specs `6-done` with §L4 rows → all three CHANGELOGs → merged (#448) → doc-health (triggered sections) → this bridge.

## Doc health — on-demand run (schema migration + two spec corrections)

Sections run: **2** (schema drift — clean; the migration is cited from four docs, and `supabase/migrations/README.md` is a conventions file, not an enumeration, so its "not cited" reading was a false positive) · **3/8** (README + feature-inventory — clean, both features' rows present and matching) · **4.5** (0 gate-review flags) · **1.6** (0 unfiled deviation markers) · **5 step 6** (whole-tree, unconditional: **87 `6-done` specs, 0 with absent Implementation notes**) · **1.5** (**two rows added** — see below).

**Section 1.5 fed, per the skill's own discipline:** RD-A retired two concepts, so both got rows in the same session — *"a role adopted from a template can never be removed"* and *"retire is not available — a template can only be deleted"*. Both rows' greps run clean: all 7 hits classify as the correction itself or as the ADM-G dossier's historical record. **Zero live drift.**

Sections skipped (untriggered): 1, 3.5, 3.6, 3.7, 4, 6, 7, 9, 10, 11.

## Numbers at close

Integration **1060/1060** (75 suites) · unit **1311/1311** (161 suites) · E2E **133/133**, nothing skipped, leak delta 0 · lint 0 errors (3 pre-existing warnings, none from these files) · `next build` green with `/api/admin/roles/[id]/retire` registered · route-policy conformance green. Two PRs merged and verified by `mergedAt` **and content on `origin/main`**: **#447** (Finding 3 correction + tasks), **#448** (the build). Dashboard refreshed (810 files indexed).

## Standing items

- **ADR-U043: the full pass was NOT run and no RD-A number is claimed.** Verified that no first-paint request was added or rerouted (the two new keys ride the fabric read the panel already made; the admin first paint is still one composed read), so the cycle-level deep-cold spot measurement is not triggered. The full pass stays owed at the area gate.
- **TASK-RDA-03** (above) · **TASK-E2E-03** (shared-identity revocation audit; `account-state.spec` the named first suspect) · **TASK-E2E-02** (Stefan's call, still open).
- **The group-template instantiation question, recorded not decided:** retire does not filter the group-template instantiation path. Unreachable today — `group_template_roles` registers only the four system templates, which cannot be retired — but live the moment RD-B lets a clone be registered. **RD-B must settle it.**
- **AB-6's docket, still four items**, the anatomy stamp now at its third consecutive boundary.
- The `done`-no-longer-implies-sweepable tension · the deferred Eid piles · the G-3 journeys deferral.

## Next

**RD-B** — the Steward's available-roles view, the diff-on-copy ceremony, and the three passive notice kinds (published / updated / retired), which RD-A deliberately left silent. Then **AB-6** and Phase-4 cutover.

## Close ritual (this session)

- [x] Migration applied on a **named** approval, repaired, and verified against the live catalogue (including that no RLS delete door was opened)
- [x] Full integration, unit, and E2E suites green; the one E2E failure diagnosed by control run as **caused**, fixed, and re-run clean
- [x] Both specs `6-done` with paired §L4 rows in the same commit; all three CHANGELOGs written
- [x] Two PRs merged and verified by `mergedAt` + content on `origin/main`
- [x] doc-health triggered sections run; Section 1.5 fed with two rows
- [x] Dashboard refreshed at close
- [x] Session bridge (this file)
- [x] Checkout left on `main`, clean; no PR open or held
