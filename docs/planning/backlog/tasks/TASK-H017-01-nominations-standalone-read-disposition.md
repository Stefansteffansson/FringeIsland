# Disposition the superseded pending-nominations read chain (Hub route + DS/Core contract)

---
id: TASK-H017-01
title: Disposition the superseded pending-nominations read chain (Hub route + DS/Core contract)
status: todo
assigned_to: claude
priority: low
feature: FEAT-H017
owner: hub
wave: ferd
cycle: unscheduled — candidate for the A-NTF area gate or an A-GRP revisit
depends_on: []
estimated_hours: 2
---

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

- [ ] One recorded decision covering the **whole chain**, not the route alone. Either: **(a) retire it** — route, `fetchPendingNominations`, and `get_my_pending_nominations` — updating FEAT-H017's and FEAT-PC016's specs plus both feature-inventory summary rows in the same commit; or **(b) retain it deliberately** under ADR-U042 guardrail 3, recording in both specs *why* an uncalled read is kept, so a future audit does not re-flag it as dead code.
- [ ] If retired: FEAT-PC016's maturity/status honestly reflects that its capability was superseded rather than simply completed — a contract removed because the capability moved is a different record from one that shipped and stayed.
- [ ] MEM-7's capability row in the Hub §L3 inventory reads truthfully about where a member sees pending nominations (the bell, since N-B) regardless of which option is taken.
- [ ] The conformance gate's `DS_OWNED_ALLOWLIST` / RPC registers are updated if the contract retires.
- [ ] No member-facing capability changes under either option — nominations remain fully available through the bell and `/notifications`.

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
