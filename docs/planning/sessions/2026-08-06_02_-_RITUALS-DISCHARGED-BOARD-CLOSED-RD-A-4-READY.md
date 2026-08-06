# Session bridge — both owed rituals discharged, the RD board CLOSED, RD-A decomposed to 4-ready

**Date:** 2026-08-06 (session 11) · **Wave:** Ferd · **Cycle:** RD-A (**decomposed, not started**)
**Follows:** [`2026-08-06_01_-_WALK-CLOSED-WA5-WA8-E2E01-SECOND-MECHANISM.md`](./2026-08-06_01_-_WALK-CLOSED-WA5-WA8-E2E01-SECOND-MECHANISM.md)

---

## READ THIS FIRST — the fresh session starts at the RD-A **build**

1. **RD-A is `4-ready`.** [FEAT-PC027](../../platform/core/features/FEAT-PC027-role-provenance-retirement-and-group-side-removal-contracts.md) (platform) + [FEAT-H043](../../products/hub/features/FEAT-H043-role-provenance-retirement-and-role-removal.md) (Hub), decomposed against the settled board with the evidence gathered first: the [RD-A substrate dossier](../hub-v2/2026-08-06-rd-a-substrate-dossier.md), six findings each anchored to file:line. **Nothing was built.** The next session opens at L5 (tasks) and the red-first build.
2. **Do not re-derive the dossier — three of its findings already changed the specs:**
   - **The group-side delete refusal is THREE layers deep**, not one. The board recorded only the Hub affordance (`RolesPanel.tsx:146`); beneath it sit the RLS delete rule (`created_from_role_template_id IS NULL`) and an explicit `42501` inside `delete_group_role`. **Leg 3 is schema + contract + surface.** A build that relaxes only the panel ships a button whose click is refused twice below it.
   - **The copied-date needs NO column.** `group_roles.created_at` already exists and is set by all three doors (`20260222000000:178-186`). WA-8's second half is a render change; the migration adds **one** provenance column, not two.
   - **The lockout guard already exists.** `permissions.is_protected` + PC025's RB-4 guard already cover exactly RD-5's permission set (`assign_roles`, `manage_roles`, `remove_roles`, `invite_members`, `remove_members`, `rest_group`). **Reuse it — do not introduce a second protected-permission concept.**
3. **The board is CLOSED and its rows are law.** RD-1 settled at the walk close; **RD-2..RD-10 confirmed explicitly** at this session's open ("all as recorded") and written up in the design note's §Board CLOSED. Reopening a row at build time is a new decision with its own record, not a decomposition-time reinterpretation.
4. **One schema gate, held.** The migration carries: `group_roles.created_from_version_number` · `role_templates.retired_at` + `retired_by` · the relaxed RLS delete rule · re-issues of `create_engagement_group`, `create_group_role`, `delete_group_role`, `get_role_templates`, `admin_get_role_templates` (byte-identical signatures, COR-A pattern) · the honest-unknown backfill. **It holds for an explicitly named approval** — tasks land at `review`, never `done`. The sibling-assertion sweep is owed in the migration header (three of these functions carry live gate cells from PC023, PC025 and WA-6).
5. **Three process changes went live this session and apply from now on** (#444): the conformance-gates decomposition walk · the payload walk extended to **rendered copy** (quote-bearing ACs get a copy check) · **AGENTS.md now states the one-DB-consumer rule**, which had never been written down anywhere — including that **destructive data operations count as a consumer**.

## What this session did

- **Discharged both owed rituals** (deferred at the ADM-G and N-E closes): the [boundary retro](../retrospectives/retro-2026-08-06-rescope-cycles-and-walk.md) covering five cycles (HYG-A · ADM-E · ADM-F · ADM-G · N-E) and the walk arc, and the **11-section doc-health run**.
- **Doc health: one critical, fixed** — FEAT-PC025's as-found "template-less instantiation copies EVERY role template" had no pointer to the WA-6 Amendment that superseded it, and RD-A's decomposition reads exactly that path. Plus FEAT-PD002's enumeration missing `resting`, a staleness banner on `FERD-CAPABILITY-MAP.md`, and three lagging README indexes. Clean: 85 `6-done` specs with notes, inventories 42/26/17, 7 migrations each cited, 0 parked, 0 manifest flags, 0 directive refs into archived/deleted files.
- **Task sweep with the link check run first and recorded** — it cut a 17-file delete list (inferred from `status: done`) to **6**. Eight files are targets of live markdown links from session bridges and gate records. `TASK-E2E-01`'s uncleared scope carried forward as **`TASK-E2E-03`**.
- **Closed the RD board**, then decomposed RD-A: dossier → paired specs → both feature indexes → both §L4 inventories → the exit-checklist row. Also **ticked the N-E exit-checklist row**, owed since its close.

## Numbers at close

**No test runs this session — it was documentation and decomposition end to end**, so there is no green-suite claim to make and none is implied. Last recorded state stands from the `_01` bridge: E2E fleet 133/133, unit 1300/1300, integration green, `next build` green. Three PRs merged and verified by `mergedAt` + ancestry: **#443** (retro + doc health), **#444** (process changes, steering — merged on the named nod), **#445** (RD-A decomposition). Dashboard refreshed (806 files indexed). Discovery synced 0/0, worktree clean.

## Standing items

- **TASK-E2E-03 (new, standing)** — the shared-identity revocation audit: 23 specs sign in as the shared `SESSION_EMAIL`, 13 carry a revocation-class verb, **`account-state.spec` is the named first suspect**. Verify by *identity of the revocation target*, one spec at a time. **Closure states the mechanism removed — never a count of green fleets.**
- **TASK-E2E-02** — the historical leaked-fixture purge decision. **Stefan's call**, still open.
- **AB-6's docket, now four items** — the Tier-1 `has_permission` finding · the `/admin/roles` + admin-plane deep-cold ADR-U043 pass · the sealed-threads admin-sight safety question · **the anatomy stamp, now at its THIRD consecutive boundary** (U048A1/U051A1 vs U052, newly joined by U051 Amendment 2). Third time is the signal: standing debt, not lag.
- **"Steward clone"** still persists platform-wide with live copies — RD-A's central retire is the first affordance that can actually retire it, and its first real user.
- **An unresolved tension, recorded deliberately:** `done` no longer implies sweepable. The keep-set now exceeds the delete-set, and "delete unless a live link breaks" is quietly turning the backlog directory into an archive. It needs a decision about whether historical links may go stale — not made here.
- The deferred Eid piles · the G-3 journeys deferral (2026-08-04).

## Next

**The RD-A build** — L5 tasks from both specs, then red-first across the pyramid, pausing at the schema gate for the named approval. Then the RD-A walk, **RD-B**, **AB-6**, and Phase-4 cutover.

## Close ritual (this session)

- [x] Both owed rituals discharged (boundary retro + 11-section doc-health run)
- [x] Task sweep executed, link check run **and recorded**
- [x] Three PRs merged and verified (`mergedAt` + ancestry, not merge-command output)
- [x] Dashboard refreshed at close
- [x] Discovery swept at open and again at close — 0/0, worktree clean, pushed
- [x] Session bridge (this file)
- [x] No doc-health run owed forward — this session *was* the boundary run
- [x] Checkout left on `main`, clean; no PR open or held; nothing owed to Stefan personally
