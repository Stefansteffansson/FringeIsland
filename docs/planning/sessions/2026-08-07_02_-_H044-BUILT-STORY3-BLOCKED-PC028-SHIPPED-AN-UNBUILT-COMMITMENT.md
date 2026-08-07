# Session bridge — FEAT-H044 built; STORY-3 exposed a `6-done` feature that shipped an unbuilt commitment

**Date:** 2026-08-07 (session 14) · **Wave:** Ferd · **Cycle:** RD-B (**surface half built**, `FEAT-H044` STORY-1/2/4 done; STORY-3 held)
**Follows:** [`2026-08-07_01_-_RD-B-DECOMPOSED-BUILT-APPLIED-MERGED-H044-REMAINS.md`](./2026-08-07_01_-_RD-B-DECOMPOSED-BUILT-APPLIED-MERGED-H044-REMAINS.md)

---

## READ THIS FIRST

1. **PR [#453](https://github.com/Stefansteffansson/FringeIsland/pull/453) is open and HELD AT THE SCHEMA GATE.** It carries migration `20260807140000`, written and red-proven but **not applied**. The gate opens only on an explicitly-named approval.
2. **`FEAT-PC028` was reopened to `5-in-cycle`.** It reached `6-done` last session carrying a payload-walk commitment it never built: `admin_get_role_template_detail` was **never widened**. Found at the start of the Hub half, when STORY-3's reach section had no server key to read.
3. **`FEAT-H044` stays `5-in-cycle`**, `TASK-RDB-03` at `review`. STORY-1, STORY-2 and STORY-4 are complete and green; STORY-3 is built but unverifiable until the gate opens.
4. **The root cause is worth more than the fix.** *A cross-spec commitment recorded only in the **consumer's** payload walk has no home to be built from.* It lived in FEAT-H044's walk and in TASK-RDB-03's technical notes, and never became a story on the **provider** — so nothing in PC028's own scope described it, and its absence survived the build, the schema gate, a full green suite, **and** a doc-health run. Every one of those checks reads the provider's stories.
5. **Two acceptance criteria could not be met as written.** Both were surfaced as a decision board rather than quietly reinterpreted; Stefan chose on both. Detail below.

## What this session did

Read the bridge → loaded the spec + task → gathered contracts from the migration and **the live catalogue** → found two spec-vs-substrate gaps → **put the full decision board up before building** → built STORY-1/2/4 red-first → wrote the PC028 corrective + its red integration cells → discharged the E2E sweep → doc-health → PR held at the gate → this bridge.

## The decision board (both settled by Stefan, before any code)

| Question | Chosen |
|---|---|
| STORY-3 has no server key — how to route the fix? | **PC028 corrective, held at gate.** Reopen PC028, ship the migration in this PR held for a named approval; build H044's other three stories meanwhile. |
| Permission "display names" have no substrate source | **Humanize everywhere in the roles panel** — not only in the ceremony. One panel showing two conventions was the alternative. |

## The two gaps, and how each was verified

**Gap 1 — STORY-3 had no server key.** Verified three ways in increasing order of authority: PC028's migration does not mention the function (0 grep hits); no later migration re-issues it (the only definition is ADM-F's `20260804190000:254`); and **`pg_get_functiondef` on the live catalogue** contains neither `role_template_publications` nor `retired_at`. **Two** keys were missing, not one — RD-A added `retired_at` to the **list** read and never to the **detail** read, so "publish is unavailable, and here is why" had nothing to branch on either.

**Gap 2 — no display-name source exists.** `public.permissions` is `(id, name, description, category, created_at)`. There is no display-name column anywhere, `get_role_copy_diff` returns `p.name`, and `description` is a full sentence. Closed Surface-side as **presentation mapping** (ADR-U038 permits it in a Surface — a label is not a rule), with a **total humaniser rather than a lookup table**: a table renders the raw key for every permission seeded after it was written, which is exactly the open-registry failure the notification icon map already carries.

## What the build taught

- **The performance placement came out better than the spec's own budget.** The spec promised to defer a *new* read behind an affordance. In fact the scoped catalogue **already rides the roles payload**, so the section consumes a read that has already happened and costs **zero** requests to open — asserted by a cell. ADR-U043 stays untriggered because no request was added to any first paint, not merely because one was deferred.
- **"Offers only Close" is not "offers a disabled Confirm."** The empty-diff ceremony needed a third additive widening of `ConfirmModal` (`hideConfirm`, after H039's ReactNode message and H041's `confirmDisabled`). A disabled Confirm still shows the act and then refuses it — the exact shape RD-B exists to remove. Focus falls back to Cancel so the dialog keeps the containment `aria-modal` promises.
- **A green-at-red anomaly was caught and labelled rather than absorbed.** All five STORY-4 notification cells passed on first run. Four pin the pre-existing passive render path (regression pins, labelled). The fifth — the icon entry — was test-after, and was **proven non-vacuous by control**: removing the entry fails it with the bell fallback's class. That silent fallback is precisely how the gap would have shipped.
- **The CRLF trap bit once, in the control itself.** The first attempt to remove the icon entry used `\n` in a perl substitution and silently did nothing — the file is CRLF. The "control" then ran against unmodified code and reported a false green. Caught by grepping for the string after the edit rather than trusting the exit code. **A control that does not verify its own precondition is not a control.**

## Standing items

- **TASK-RDB-04 / the PC028 corrective** — apply commands are in the task and the PR body. On apply, C1–C6 go green and PC028 returns to `6-done` (rows in `features/README.md` and `governance-specification.md` follow).
- **A latent E2E trap, recorded not fixed.** `roles.spec.ts:120` asserts a template name **inside** `roles-panel`, where the available-roles section now renders the same name a second time. It resolves to one element only because the section is **collapsed by default**. Changing that default inherits a strict-mode violation, not a missing element.
- **Known remaining inconsistency:** `MyPermissionsPanel` and the admin draft editor still render raw permission keys — outside the scope Stefan set ("the roles panel").
- **A nuance the payload cannot resolve:** the RD-3 restore sentence renders whenever `added` is non-empty, which covers both "the Steward revoked it" and "the template gained it later". The substrate cannot distinguish the two without per-grant history, and the walk's payload offers only `added[]`. Recorded in the spec, not hidden.
- Carried from before: **TASK-RDA-03** (`set_group_role_permission`'s missing revoke-side `is_protected` check) · **TASK-E2E-03** · **TASK-E2E-02** · **AB-6's docket** · the `done`-no-longer-implies-sweepable tension · the deferred Eid piles · the G-3 journeys deferral · the pre-existing broken `hub/SPECIFICATION.md` → `./ROADMAP.md` link (a registry placeholder, not drift).

## Doc health — on-demand run (schema migration + new contracts + spec corrections)

Sections run: **1.6** (deviation markers — **clean**, 0 hits; the `[^-]` guard held) · **2** (schema drift — `20260807140000` cited from six docs and the test) · **3/8** (README + feature inventory — **clean**; all four RD-B rows agree with their specs at `5-in-cycle`) · **5 step 6** (whole-tree, unconditional: **87 `6-done` specs, 0 with absent Implementation notes** — 87 not 88 because PC028 reopened).

**Re-find check performed before filing:** no pre-existing open task covers the widening, so `TASK-RDB-04` is a new filing, not a duplicate. Cycle tasks are not standing-tasks-table entries, so no README row is owed.

Sections skipped (untriggered): 1, 1.5, 3.5, 3.6, 3.7, 4, 4.5, 6, 7, 9, 10, 11.

**One correction made to shipped docs:** three inventory rows asserted the widening was *"fixed in PC028 before either spec went `4-ready`"*. That claim was false and is now corrected in `hub/SPECIFICATION.md`, `hub/features/README.md`, and both PC028 rows.

## Numbers at close

Unit **1375/1375** (168 suites, up from 1313/161) · E2E **133/133**, nothing skipped, leak baseline 0 · lint 0 errors (3 pre-existing warnings, none from these files) · `next build` green, all three new routes registered · route-policy conformance green. Integration: the PC028 corrective's **C1–C5 are red by design** until the gate opens; C6 green. Dashboard refreshed (819 files). Discovery worktree clean and in sync at both open and close.

## Next

**Open the schema gate** (`TASK-RDB-04`), then finish `FEAT-H044` STORY-3's verification, close RD-B, run the RD-B walk, then **AB-6** and Phase-4 cutover.

## Close ritual (this session)

- [x] Decision board surfaced whole **before** building, not drip-fed
- [x] STORY-1/2/4 driven red-first; every green-at-red anomaly surfaced and labelled
- [x] The corrective's premise verified against the **live catalogue**, not inferred from source
- [x] Migration written, red-proven, and **NOT applied** — held for a named approval
- [x] E2E sweep obligation discharged and recorded, including the latent trap
- [x] Three CHANGELOGs written (root, hub, platform-core)
- [x] doc-health triggered sections run; three false claims in shipped docs corrected
- [x] Dashboard refreshed; discovery sweep run at open and close
- [x] Session bridge (this file)
- [ ] **PR #453 open and HELD** — merge waits on an explicitly-named approval
