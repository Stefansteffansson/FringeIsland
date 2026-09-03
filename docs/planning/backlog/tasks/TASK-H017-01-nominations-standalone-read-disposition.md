# Disposition the superseded pending-nominations read chain (Hub route + DS/Core contract)

---
id: TASK-H017-01
title: Disposition the superseded pending-nominations read chain (Hub route + DS/Core contract)
status: review
assigned_to: claude
priority: low
feature: FEAT-H017
owner: hub
wave: ferd
cycle: 2026-09-03 session (bridge 2026-09-03_02, item 1 of four)
depends_on: []
estimated_hours: 2
---

**RULED 2026-09-03 (Stefan: "retire H017-01"): option (a) — retire the whole chain.** Route `/api/me/nominations` + `fetchPendingNominations` + the contract `get_my_pending_nominations` (migration `DROP FUNCTION`, schema gate) + its six-cell contract test + the ownership-manifest entry + the conformance registers; FEAT-PC016 records *superseded by the bell (N-B), retired at pull*; MEM-7's §L3 row and the Hub §L4 inventory read truthfully. No member-facing change. Queued for the next session — see bridge `2026-09-03_02`.

## Description

**Widened 2026-07-25** from "should `/api/me/nominations` retire?" to the whole chain, because the audit that produced it found the interesting fact one level down: **the bell did not reuse this read path, it superseded it.**

A-NTF Cycle N-C ([FEAT-H032](../../../products/hub/features/FEAT-H032-live-notification-bell-and-reconnect-reconciliation.md)) removes the dead `nominations` slice from the `/api/me/overview` bundle, its adoption in `overview-client`, and the unreachable trio in `hub/lib/groups/client.ts`. After that, **nothing calls any level of this chain**:

```
/api/me/nominations                    <- no Hub caller after N-C
  -> fetchPendingNominations()         <- no other caller
    -> get_my_pending_nominations()    <- the platform contract (FEAT-PC016),
                                          built for the deleted PendingNominations panel
```

Members still see their pending nominations — through the bell and `/notifications`, which read the **notification records** (`get_own_notifications`), a different path entirely. So this is not a stray route with a live capability beneath it; it is a capability that moved, leaving a complete vertical slice behind.

N-C deliberately left the whole chain standing rather than deleting any of it:

1. **Ownership.** The route belongs to FEAT-H017 (MEM-7 STORY-2) and the contract to [FEAT-PC016](../../../platform/core/features/FEAT-PC016-pending-nominations-read-contract.md). Retiring either from an A-NTF cycle would edit two other features' specs from outside their ownership.
2. **[ADR-U042](../../../architecture/decisions/ADR-U042-first-paint-bootstrap-read-bff-bundle.md) guardrail 3** states the standalone routes remain canonical and the Hub may drop the bundle at any time — which cuts against deleting a standalone read merely because the bundle stopped using it.
3. **It costs nothing to wait.** An uncalled route and an uncalled RPC do no work until called.

**Decide the chain as one question.** Retiring only the route is the worst option: it removes the visible leftover while leaving the lookup and the contract standing with no caller at all, making the dead part harder to notice later.

**This was a new filing, not a re-find.** Checked against the open backlog 2026-07-25 — no open task covered it. `TASK-NB-05` mentions nominations, but as the N-B close task that carried the rider forward to N-C, now discharged.

## Acceptance criteria

- [x] One recorded decision covering the **whole chain**, not the route alone. Either: **(a) retire it** — route, `fetchPendingNominations`, and `get_my_pending_nominations` — updating FEAT-H017's and FEAT-PC016's specs plus both feature-inventory summary rows in the same commit; or **(b) retain it deliberately** under ADR-U042 guardrail 3, recording in both specs *why* an uncalled read is kept, so a future audit does not re-flag it as dead code.
- [x] If retired: FEAT-PC016's maturity/status honestly reflects that its capability was superseded rather than simply completed — a contract removed because the capability moved is a different record from one that shipped and stayed.
- [x] MEM-7's capability row in the Hub §L3 inventory reads truthfully about where a member sees pending nominations (the bell, since N-B) regardless of which option is taken.
- [x] The conformance gate's `DS_OWNED_ALLOWLIST` / RPC registers are updated if the contract retires.
- [x] No member-facing capability changes under either option — nominations remain fully available through the bell and `/notifications`.

## Technical notes

- Hub route: `hub/app/api/me/nominations/route.ts` — thin; calls `fetchPendingNominations(supabase)`, carries `nominations.mine*` telemetry.
- Server-side query: `fetchPendingNominations` in `hub/lib/groups/leadership.ts`. **Confirm N-C has landed** before treating the route as its only caller — until then `/api/me/overview` still calls it.
- Platform contract: `get_my_pending_nominations` (FEAT-PC016). Retiring it is a **platform-core-adjacent change** — check whether it needs the schema gate, since dropping a function is a schema act even though no table changes.
- The nomination *write* path is untouched by this either way (`nominate_steward`, `respond_to_stewardship_nomination`, and the bell's `/api/notifications/[id]/nomination-response` route all stay).

## Verification

- `grep -rn "api/me/nominations\|fetchPendingNominations" hub/app hub/lib hub/components` — result must match the recorded decision.
- If the contract retires: `grep -rn "get_my_pending_nominations" supabase/ hub/` returns only the migration that drops it.
- `cd hub && npx next build` — the type gate, per the house rule that `ts-jest`/eslint do not full-type-check.
- Full unit suite green. Integration suite required only if the platform contract is dropped.

## Implementation notes (2026-09-03 — option (a), the whole chain retired; HELD at the schema gate)

**What went.** `hub/app/api/me/nominations/route.ts` (the route), `fetchPendingNominations()` + the `PendingNomination` interface in `hub/lib/groups/leadership.ts`, the type re-export in `hub/lib/groups/client.ts`, `hub/tests/integration/groups/pending-nominations-contract.test.ts` (the contract's six cells), the three `/api/me/nominations` cells in `group-leadership-routes.test.ts` (the STORY-6 canary now spans five handlers), the two relay cells in `groups-leadership.test.ts`, and the `get_my_pending_nominations` entry in `supabase/ownership.manifest.json`. Migration `20260903090000_task_h017_01_retire_get_my_pending_nominations.sql` drops the function with a self-verifying catalog check; its header carries the sibling sweep and the Q1 post-apply set.

**What stayed.** The write path (`nominate_steward`, `respond_to_stewardship_nomination`, `POST /api/notifications/[id]/nomination-response`) and the bell path (`get_own_notifications`, FEAT-H031/H032). The stale comments in `overview/route.ts` and `groups/page.tsx` now say the chain followed.

**Red-first for a deletion.** `pending-nominations-retired.test.ts`: two absence cells (pg_proc has no row; a FIM's call returns PGRST202) — **red at HEAD** (the live function returned the nominee's payload), plus one **labelled PIN**, green at HEAD by design, that the nominee still sees the offer through `get_own_notifications()` (AC 5). `function-classification-completeness.test.ts` "every live public function is explicitly classified" — **red at HEAD** with the manifest entry removed (`unclassified: ["get_my_pending_nominations"]`). Both flip green at apply.

**Records.** FEAT-PC016: title + banner + notes ("superseded by the bell, retired"; maturity stays `6-done` — the ladder records what was built). FEAT-H017 §Implementation notes revision. Hub §L3 MEM-7 row and §L4 FEAT-H017 row; PC-3 §L3 rows in `organisation-specification.md`; both features READMEs; `api-conformance-register.md` §7; the N-C rider in the notifications completion plan closed; root + Platform Core CHANGELOGs (no `hub/CHANGELOG.md` entry — nothing a member can see changed).

**Gate.** Apply from the repo root on the named approval:

```
node scripts/apply-migration-temp.js 20260903090000_task_h017_01_retire_get_my_pending_nominations.sql
bash supabase-cli.sh migration repair --status applied 20260903090000
```

Post-apply verification: `pending-nominations-retired.test.ts` (3/3), `npm run test:integration:platform`, `npm run test:integration:groups`, and the two bell-walking E2E journeys (`leadership-transfer.spec.ts`, `notifications-live.spec.ts`) from `hub/`.
