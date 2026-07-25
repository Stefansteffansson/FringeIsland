# Disposition FEAT-H017's standalone nominations read now the bell owns nominations

---
id: TASK-H017-01
title: Disposition FEAT-H017's standalone nominations read now the bell owns nominations
status: todo
assigned_to: claude
priority: low
feature: FEAT-H017
owner: hub
wave: ferd
cycle: unscheduled — candidate for the A-NTF area gate or A-GRP revisit
depends_on: []
estimated_hours: 1
---

## Description

A-NTF Cycle N-C ([FEAT-H032](../../../products/hub/features/FEAT-H032-live-notification-bell-and-reconnect-reconciliation.md)) removes the dead `nominations` slice from the `/api/me/overview` bundle, its adoption in `overview-client`, and the now-unreachable trio in `hub/lib/groups/client.ts` (`adoptMyNominationsRead`, `fetchMyNominations`, `requestMyNominations`, plus the `adoptedNominations` module state). After that removal, **`GET /api/me/nominations` has no caller anywhere in the Hub.**

N-C deliberately left the route standing rather than deleting it, for two reasons:

1. **Ownership.** The route belongs to FEAT-H017 (MEM-7 STORY-2), not to A-NTF. Retiring it from an A-NTF cycle would edit FEAT-H017's spec from outside that feature's ownership.
2. **[ADR-U042](../../../architecture/decisions/ADR-U042-first-paint-bootstrap-read-bff-bundle.md) guardrail 3** states the standalone routes remain canonical and the Hub may drop the bundle at any time — which cuts against deleting a standalone read merely because the bundle stopped using it.

This task exists so the decision gets made deliberately by FEAT-H017's owner rather than left as an unexamined orphan. It is not urgent: an uncalled route costs nothing at runtime.

**This is a new filing, not a re-find.** Checked against the open backlog on 2026-07-25 — no open task covers the nominations route. `TASK-NB-05` mentions nominations, but as the N-B close task that *carried the rider forward* to N-C, which is now discharged.

## Acceptance criteria

- [ ] A decision is recorded, one of: (a) retire the route + `fetchPendingNominations` and update FEAT-H017's spec accordingly, or (b) keep it as a canonical standalone read under ADR-U042 guardrail 3 and record *why* an uncalled route is deliberately retained.
- [ ] If retired: `hub/app/api/me/nominations/route.ts` and `fetchPendingNominations` in `hub/lib/groups/leadership.ts` are gone, their tests with them, and FEAT-H017's spec + the Hub feature-inventory summary row reflect the change in the same commit.
- [ ] If kept: FEAT-H017's spec carries a line saying the route is intentionally retained with no Hub caller, so a future audit does not re-flag it as dead code.
- [ ] Either way, MEM-7's capability row in the Hub §L3 inventory still reads truthfully about where a member sees their pending nominations (the bell, since N-B).

## Technical notes

- The route: `hub/app/api/me/nominations/route.ts` — thin, calls `fetchPendingNominations(supabase)` and returns the array; carries `nominations.mine*` telemetry.
- The server-side query: `fetchPendingNominations` in `hub/lib/groups/leadership.ts`, also used by `/api/me/overview` **until N-C removes that call site**. Confirm N-C has landed before treating the route as the sole caller.
- The platform contract underneath is `get_my_pending_nominations` ([FEAT-PC016](../../../platform/core/features/FEAT-PC016-pending-nominations-read-contract.md)). **Note the related open question:** FEAT-PC016's only surface consumer was deleted in N-B, so if this route also retires, PC016 is a live contract with no consumer at all. That is a PC-4/PC-3 question, not a Hub one, but the two decisions should be taken together rather than separately.
- Nominations remain fully available to members through the bell and `/notifications` (FEAT-H030/H031), so neither option loses member-facing capability.

## Verification

- `grep -rn "api/me/nominations\|fetchPendingNominations" hub/app hub/lib hub/components` — the result must match the recorded decision (empty if retired; route-only if kept).
- `cd hub && npx next build` — the type gate, per the house rule that `ts-jest`/eslint do not full-type-check.
- Full unit suite green; no integration suite needed if the route is only deleted (no schema surface).
