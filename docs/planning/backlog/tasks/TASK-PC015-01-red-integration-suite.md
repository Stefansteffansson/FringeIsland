# Red-first integration suite for the G-F acting contracts

---
id: TASK-PC015-01
title: Red-first integration suite for the G-F acting contracts
status: done
assigned_to: claude
priority: high
feature: FEAT-PC015
owner: platform/core/organisation
wave: ferd
cycle: G-F
depends_on: []
estimated_hours: 3
---

## Description

Author `hub/tests/integration/groups/group-of-groups.test.ts` covering all seven FEAT-PC015 stories' acceptance criteria against the real substrate, and demonstrate the suite red (PGRST202 for the six absent functions; the current `nominate_steward` accepting a system-group nominee; `get_group_detail` lacking the additive fields; the catalog lacking `act_as_group`).

## Acceptance criteria

- [ ] Every FEAT-PC015 story has at least one test tagged with its story ID
- [ ] Wielding gates are adversarially tested on the direct PostgREST path (keyless member, non-member, Mist, anon-role) per the ADR-U038 API-boundary DoD
- [ ] The suite runs and fails for the right reasons; the red run is captured for the Implementation notes

## Technical notes

House patterns from `stewardship-succession.test.ts` / `membership-lifecycle.test.ts`: `createTestUser`/`seedGroup`/`asUser`/`asMist` helpers, SQLSTATE assertions on `error.code` (P0002/P0001/42501/22023), DeusEx resolved by system-label via `runAdminSql`, cascade-aware teardown. Group-as-member fixture rows seed via the admin client (the B-D15 oracle pattern).

## Verification

`npm run test:integration:groups` — new suite red for the documented reasons, all existing groups suites still green.
