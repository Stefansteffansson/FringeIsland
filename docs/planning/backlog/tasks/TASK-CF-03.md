# Apply, flip green, adversarial W12 pass

---
id: TASK-CF-03
title: Apply the gated migration after the named nod; flip the red suites green; run the W12 adversarial pass
status: done
assigned_to: claude
priority: critical
feature: FEAT-PC017
owner: platform/core/identity
wave: ferd
cycle: C-F
depends_on: [TASK-CF-02]
estimated_hours: 3
---

## Description

After the explicitly-named gate nod: apply + repair the migration, flip TASK-CF-01's suites green, and run the adversarial pass — direct PostgREST calls against both new RPCs (session-less, Mist, suspended-member, cross-user attempts), the origin-gate refusal matrix, and the retirement probe (42883). Any adaptation from red-spec to green must be labelled with its reason (the C-E discipline).

## Acceptance criteria

- [ ] Migration applied + `repair --status applied`; `migration list` clean
- [ ] All C-F suites green; adaptations labelled
- [ ] Full integration sweep green (no regression outside the cycle's files); conformance gate green
- [ ] PD004/PD005/PD007/PC013/PC014-adjacent suites re-run (the walk touches their substrate) — green

## Technical notes

`node scripts/apply-migration-temp.js <ts>_c_f_account_lifecycle_self_service.sql` then `bash supabase-cli.sh migration repair --status applied <ts>`. Check for a live sibling session before running suites (one-checkout rule).

## Verification

`npm run test:integration` full sweep green, run in background; output preserved for the bridge.
