# Doc dues + cycle close

---
id: TASK-CF-06
title: C-F close — 6-done flips, inventories, G-36 deletion, CHANGELOG, bridge, dashboard
status: done
assigned_to: claude
priority: medium
feature: FEAT-PC017
owner: platform/core/identity
wave: ferd
cycle: C-F
depends_on: [TASK-CF-05]
estimated_hours: 2
---

## Description

Close the cycle: maturity flips to `6-done` with Implementation notes on FEAT-PC017/FEAT-H029/FEAT-PC005/FEAT-H007 (+ the H006 amendment note), feature-inventory summaries + READMEs updated in the same commits, **G-36 deleted** from gaps.md (its close-condition is met: exit/deletion live and gated, old path retired) with the quick-index/count housekeeping, the identity plan's Cycle F row closed (plan complete), the comm plan's exit-checklist IDN-10 row ticked, CHANGELOG entry, session bridge, `npm run dashboard`. Delete TASK-CF-* after the retro per the ephemeral-tasks rule.

## Acceptance criteria

- [ ] Four specs at honest `6-done` with Implementation notes; summaries/READMEs match `features/` state
- [ ] G-36 deleted; gaps header count aligned
- [ ] Identity completion plan marked complete; area-gate checklist row ticked
- [ ] Bridge written under `docs/planning/sessions/`; CHANGELOG updated; dashboard refreshed

## Technical notes

Watch the pointer-not-snapshot rule — no hardcoded counts in routing docs. Run doc-health-check if the area gate follows immediately.

## Verification

Checklist above green; `git status` clean after the close PR merges.
