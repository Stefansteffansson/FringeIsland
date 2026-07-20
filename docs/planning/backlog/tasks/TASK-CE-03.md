# Apply at nod, flip green, sweep

---
id: TASK-CE-03
title: C-E apply + flip-green + sweeps (integration, unit, build, lint, conformance)
status: todo
assigned_to: claude
priority: high
feature: FEAT-PD012
owner: platform/domain/communication
wave: ferd
cycle: C-E
depends_on: [TASK-CE-02]
estimated_hours: 2
---

## Description

On the named gate nod: apply + repair the migration, run the C-E suites to green, then the full sweeps. Any substrate surprise (the C-A/C-D rider class) gets a labelled rider riding the same nod, never a silent bend.

## Acceptance criteria

- [ ] Migration applied + repaired; `migration list` clean
- [ ] C-E suites green; any post-apply adaptation labelled and explained in the commit
- [ ] Full sweeps: `test:integration` (fenced flakes by name only), unit, `next build` (the type gate), lint 0 errors, conformance green
- [ ] W12 per-RPC verification recorded for the two new RPCs + re-issues

## Verification

Sweep results recorded in the close bridge with counts.
