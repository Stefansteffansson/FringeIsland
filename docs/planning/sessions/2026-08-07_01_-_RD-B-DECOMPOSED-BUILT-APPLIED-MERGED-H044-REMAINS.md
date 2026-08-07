# Session bridge — RD-B decomposed, built, applied and merged; the Hub half remains

**Date:** 2026-08-07 (session 13) · **Wave:** Ferd · **Cycle:** RD-B (**platform half CLOSED**, `FEAT-PC028` `6-done`; surface half `FEAT-H044` unbuilt)
**Follows:** [`2026-08-06_03_-_RD-A-BUILT-APPLIED-MERGED-TWO-PREMISES-CORRECTED.md`](./2026-08-06_03_-_RD-A-BUILT-APPLIED-MERGED-TWO-PREMISES-CORRECTED.md)

---

## READ THIS FIRST — RD-B is half done, and the remaining half is a full build

1. **`FEAT-PC028` is `6-done`, migration `20260807090000` applied and merged** (#451, on the named approvals "ok apply the RD-B migration" then "ok merge 451"). Gate state at close: **integration 1102/1102 (76 suites) · unit 1313/1313 (161 suites) · E2E 133/133 leak delta 0 · lint 0 errors · `next build` green.**
2. **[`FEAT-H044`](../../products/hub/features/FEAT-H044-available-roles-view-and-diff-on-copy-ceremony.md) is `5-in-cycle` and entirely unbuilt.** [TASK-RDB-03](../backlog/tasks/TASK-RDB-03-h044-available-roles-view-diff-ceremony-and-publish-surface.md) is `todo`. Its dependencies (both platform tasks) are `done`, so it is unblocked — the available-roles view, the diff-on-copy ceremony, the admin reach section, and the three passive bell renders all still need building. **This is the next session's work, and it is a full cycle-half, not a rider.**
3. **The premise discipline worked this time, and the shape is worth keeping.** RD-A shipped two decomposition premises that verification overturned *at build*. RD-B's largest area rested on a similar claim, and it was checked **before the migration was written**, three ways in increasing order of authority: source → live catalogue (`pg_get_functiondef`) → **driven end-to-end** (commit `ab2cc7b`: a Steward adopting a retired template, asserted at row level). Only the third settles reachability, because a trigger or grant could refuse where a function body is silent. Nothing did. **No spec correction was owed** — the outcome RD-A did not get.
4. **The E2E fleet caught a regression the unit tier should have.** RD-B's scoped read raises `42501` without `manage_roles`, where the dropped zero-arg catalogue was open to any authenticated caller. Composed naively in the roles route's `Promise.all`, that refusal took the whole route to a 403 — so a **limited assigner** (holds `assign_roles`, not `manage_roles`) lost the *entire* roles panel, their own roles included. A refused offer now degrades to an empty list, which is FEAT-H044 STORY-1's specified behaviour. **Generalisable: widening a read's refusal surface silently narrows every caller that composed it.**
5. **Six vacuous test cells were caught before they could rot** — they passed only because their subject did not exist yet. Detail below; the sub-lesson (guessing an error shape) is the one worth carrying.

## What this session did

RD-B dossier (7 findings, every claim `file:line`) → decomposition board RDB-1..RDB-7 surfaced whole and settled all-as-recommended → both specs `4-ready` (#449) → catalogue verification of Findings 2 and 5 (#450) → L5 tasks + `5-in-cycle` → premise probe driven → 40-cell red suite (36 red / 4 green) → migration written by extracting and patching the four re-issued bodies programmatically → sibling adaptation → held at the schema gate (#451) → named approval → applied + repaired + catalogue-verified → 40/40 → full suites → `6-done` + three CHANGELOGs → merged → doc-health → this bridge.

## The four things the build corrected

- **A claim in my own spec was wrong and was retracted.** The spec, TASK-RDB-02 and the migration header all said the pinned vertical-set conformance expectation would change for the DS-5 registry seed. It does not: that test pins tables owned by `vertical:*` — exactly `['notifications']` — and RD-B adds none (`role_template_publications` is PC-3; the category and kinds are *rows in* DS-5 tables). Corrected in all three places.
- **Two cells asserted the wrong group state, and the code was right.** S3e/S5d used `resting` to pin the availability guard. `assert_group_writable` deliberately lets a resting group be written by a `rest_group` holder, which the Steward template grants — a Steward managing their own resting group is designed behaviour. `suspended` is the refusing state.
- **A failing cell leaked state into a later one.** S5d set `groupA` resting and threw *past* its trailing reset, so STORY-6 failed as a **cascade, not a bug**. Both mutations now sit in `try/finally`. **A trailing cleanup statement is not cleanup — a failed `expect()` throws past it.**
- **The vacuous-cell sub-lesson.** Hardening `U038a` the first time *guessed* the error shape (Postgres `42P01` / "does not exist"). PostgREST reports an unknown table as `PGRST205` / "in the schema cache", so the guard did not bite and the cell still passed. **Guessing an error shape is how a vacuous test survives its own hardening** — verify the shape against the live stack, then write the guard.

## Standing items

- **TASK-RDB-03 / FEAT-H044** — the whole surface half (above). Note one finding already filed into it: the new `roles` category needs an icon entry in `hub/components/notifications/NotificationItem.tsx:15`, where a missing key renders the fallback rather than failing — exactly how it would ship unnoticed.
- **The E2E bare-accessible-name sweep is pre-run and came back clean for RD-B's surfaces.** `roles.spec.ts` and `admin-roles.spec.ts` use specific descriptive names, not generic labels; the nearest collision risk is `/^create$/i`, which none of Copy / Review update / Confirm / Publish / Unpublish matches. Re-run it after the affordances actually land.
- **Recorded, not decided: a group can adopt the same template twice.** `group_roles` is `UNIQUE(group_id, name)`, not unique per source template, so `adopted_group_role_id` is genuinely ambiguous; the contract resolves it as the **earliest** adoption. Cost is small but real — the offer entry could read an older copy's version and show "update available" while a newer copy is current. If H044's surface finds that misleading, the fix is a one-line `order by` in its own migration.
- **RD-9 stands amended by verification, not reopened** — it rules against a path that does not exist (publications are `role_template ↔ group`; creation-time instantiation runs `group_template_roles`, which no publication row touches). The guard ships anyway as defensive depth.
- **TASK-RDA-03** (`set_group_role_permission`'s missing revoke-side `is_protected` check — the neighbouring brick door) · **TASK-E2E-03** · **TASK-E2E-02** (Stefan's call, still open).
- **ADR-U043: not triggered by PC028 and no number is claimed.** The scoped read replaces the catalogue read the roles route already made, one-for-one — no request added to any first paint. H044's available-roles section is the placement that *could* trigger it, and its budget draws it behind an affordance deliberately. **If that placement changes, the deep-cold spot measurement is owed.**
- **A pre-existing broken link, filed not fixed:** `docs/products/hub/SPECIFICATION.md` links `./ROADMAP.md`, which does not exist (confirmed present on clean `main`). Creating it is L2 work, deliberately not smuggled into a build PR.
- **AB-6's docket** (still four items, the anatomy stamp now at its fourth consecutive boundary) · the `done`-no-longer-implies-sweepable tension · the deferred Eid piles · the G-3 journeys deferral.

## Doc health — on-demand run (schema migration + a contract DROP + spec corrections)

Sections run: **2** (schema drift — clean; `20260807090000` cited from two docs) · **3/8** (README + feature-inventory — clean, all four rows present and matching) · **5 step 6** (whole-tree, unconditional: **88 `6-done` specs, 0 with absent Implementation notes**) · **1.5** (**two concepts retired, and this one found live drift** — see below).

**Section 1.5 found real drift, unlike RD-A's clean run.** RD-B retired the zero-arg `get_role_templates()` contract and the "every template is offered to every group" law. Code-side came back clean — exactly two references, both asserting the contract is *gone*. Docs-side, most hits are historical record (session bridges, dossiers, audits) or RD-B's own documents, but **three read as current claims and were corrected** with supersession markers following PC025's own established pattern: FEAT-PC027 STORY-3's AC, FEAT-PC025 STORY-2's pin, and FEAT-H043's payload-walk row all named a contract that no longer exists. **The behaviour they pin is unchanged and still enforced — only the door moved**, and each marker says so.

Sections skipped (untriggered): 1, 1.6, 3.5, 3.6, 3.7, 4, 4.5, 6, 7, 9, 10, 11.

## Numbers at close

Integration **1102/1102** (76 suites) · unit **1313/1313** (161 suites) · E2E **133/133**, nothing skipped, leak delta 0 · lint 0 errors (3 pre-existing warnings, none from these files) · `next build` green · route-policy conformance green. Three PRs merged and verified by `mergedAt` **and** content on `origin/main`: **#449** (decomposition), **#450** (catalogue verification), **#451** (the build). Dashboard refreshed (817 files indexed).

## Next

**FEAT-H044** — the Hub half of RD-B, unbuilt and unblocked. Then the RD-B walk, **AB-6**, and Phase-4 cutover.

## Close ritual (this session)

- [x] Migration applied on a **named** approval, repaired, and verified against the live catalogue (5 functions present, the dropped contract gone, RLS on with 0 write grants, the partial unique index in place)
- [x] Full integration, unit and E2E suites green; the one E2E failure diagnosed as **caused**, fixed, and re-run clean
- [x] `FEAT-PC028` `6-done` with §L4 rows in the same commit; **all three** CHANGELOGs written
- [x] Three PRs merged and verified by `mergedAt` + content on `origin/main`
- [x] doc-health triggered sections run; Section 1.5 found and closed three live drifts
- [x] Dashboard refreshed at close
- [x] Session bridge (this file)
- [ ] Checkout left on `main`, clean; no PR open or held — *confirmed at the final push*
