# E2E fixtures leak engagement groups into the DeusEx system group

---
id: TASK-INT-05
title: Playwright fixtures leave groups joined to the DeusEx system group — 39 and counting
status: open
assigned_to: unassigned
priority: medium
feature: none
owner: platform/core/organisation
wave: ferd
cycle: unscheduled
depends_on: []
estimated_hours: 2
---

## Impact — TEST-ONLY, and the same family as TASK-INT-03, one tier up

Found at the [2026-07-30 re-walk](../../hub-v2/2026-07-30-antf-rewalk-findings.md) (RW-07) while tracing why a group handed to FringeIsland was invisible to the platform admin.

The **DeusEx system group** is an active member of **39** groups named `E2E GF Nya gruppen <timestamp>` — Playwright fixtures from the group-of-groups specs, never torn down. They carry no roles, so they are inert in the permission sense, but they are structurally noisy in the one place that noise costs most:

- The DeusEx system group is the **caretaker of last resort** (ADR-U019). Its membership list is the natural basis for **ADM-8**, the cross-platform group administration view A-ADM will build. Shipping ADM-8 against a list that is 39/42 test detritus means building the surface against a lie.
- Any "what does the platform steward?" query has to special-case an `E2E%` name prefix — a filter on *naming convention*, which is exactly the kind of load-bearing string that breaks silently when someone renames a fixture.

**This is not a TASK-INT-03 regression and not a false close.** TASK-INT-03's acceptance was explicitly *"a full `tests/integration` run leaks zero"*, proved with a bracketed before/after (689 → 689). The E2E tier was never in its scope and was never audited. Same failure shape — a suite creating groups it does not delete — at a tier nobody looked at.

## What is known

- 39 groups, all matching `E2E GF Nya gruppen %`, all with the DeusEx system group as an **active member with no roles**.
- The creating specs are the group-of-groups E2E journeys (`hub/tests/e2e/group-of-groups.spec.ts` and kin), which exercise the hand-to-FringeIsland path — so joining DeusEx is the *behaviour under test*, correct at creation and simply never undone.
- The integration-tier fix that worked is the precedent: **the suite that creates a group deletes it**, in reverse creation order, before its users (TASK-INT-03's second source). The same shape should apply here.
- `cleanupTestGroup` swallows a refusal into a `console.error` (noted at the re-walk, unfixed) — so an E2E teardown that *tries* and fails would currently look identical to one that never tried.

## Acceptance

- [ ] Attribute the 39 to specific E2E specs (name prefix + creation site), not just to "the E2E suite".
- [ ] Every engagement group an E2E spec creates is torn down by that spec, including groups it hands to FringeIsland. **The hand-over behaviour itself must not be weakened to make teardown easier** — that is the behaviour under test.
- [ ] A full `npx playwright test` run leaks **zero** groups into the DeusEx system group, asserted by a before/after count rather than by inspection (the TASK-INT-03 instrument).
- [ ] The existing 39 are retired, once teardown is fixed and the count is provably stable — retiring them first would just refill.
- [ ] Consider whether `cleanupTestGroup` should throw rather than log. It is a scope call: making it throw turns every refusal into a suite failure. Decide it deliberately rather than inheriting the swallow.

## Verification

```
# before
SELECT count(*) FROM public.group_memberships m JOIN public.groups g ON g.id = m.group_id
 WHERE m.member_group_id = '<DeusEx system group id>' AND g.name LIKE 'E2E%';
# run the full Playwright suite, then repeat. Delta must be zero.
```

Before this task: **+N per run, 39 accumulated** as of 2026-07-30.
