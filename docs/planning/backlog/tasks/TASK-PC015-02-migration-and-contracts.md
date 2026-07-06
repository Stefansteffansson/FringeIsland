# The G-F migration: key + seeds, six contracts, two replacements-in-place

---
id: TASK-PC015-02
title: The G-F migration — act_as_group key, six contracts, nominate/get_group_detail replaced in place
status: review
assigned_to: claude
priority: high
feature: FEAT-PC015
owner: platform/core/organisation
wave: ferd
cycle: G-F
depends_on: [TASK-PC015-01]
estimated_hours: 4
---

## Description

One migration carrying: the `act_as_group` catalog INSERT + Steward-template grant (idempotent; seeds files updated in step), the additive `group_memberships.status_changed_by_group_id` audit-trace column (Open Q4), `invite_group`, `search_invitable_groups`, `respond_to_group_invitation`, `leave_group_as_group`, `get_acting_contexts`, `get_group_memberships_of`, `nominate_steward` replaced-in-place (persons-only eligibility), `get_group_detail` replaced-in-place (additive `member_group_type` + `non_system_member_count`), grants + the house verification block.

## Acceptance criteria

- [ ] TASK-PC015-01's suite goes green; all existing groups/rbac suites stay green
- [ ] Every new SECURITY DEFINER function declares `SET search_path = ''` and documents its elevation
- [ ] No new table, no trigger changes, no policy changes (spec posture); the only schema mutation is the Open Q4 additive column
- [ ] Grants: `authenticated, service_role` only — no anon EXECUTE (verification block enforces)

## Technical notes

Replacements-in-place start from the current bodies (`20260705072252` for `nominate_steward`, `20260704192549` for `get_group_detail`) — amend, never rewrite. Wielding contracts do the ADR-U041 two-step walk in-body and write the audit-trace column. Migration workflow per `docs/platform/CLAUDE.md` §Database migrations (apply + repair).

## Verification

`npm run test:integration:groups` green; `npm run test:integration:security` green (`test:integration:rbac` points at a directory that no longer exists — the parked cooldown cleanup item, bridge `_13`; RBAC coverage lives inside the groups suites); migration applied + repaired on dev (or apply commands recorded in the PR if the environment denies).
