# Group-page Conversations panel

---
id: TASK-CA-05
title: Group detail Conversations panel - list, permission-gated create, join/leave/rejoin
status: review
assigned_to: claude
priority: high
feature: FEAT-H025
owner: hub
wave: ferd
cycle: C-A
depends_on: [TASK-CA-03]
estimated_hours: 2
---

## Description
H025 STORY-6: the group detail page gains a Conversations panel — `get_group_conversations` listing (title + join state), create affordance rendered only on `has_permission(…, 'create_group_conversations')` from the already-fetched effective-permissions read, join/open/leave/rejoin transitions rendering from confirmed responses.

## Acceptance criteria
- [ ] STORY-6 criteria unit-tested red-first; permission gating asked of the platform payload, never computed locally
- [ ] Rejoin restores history; leave keeps attribution; transitions write through to caches
- [ ] Panel is a failure-isolated slice (its error never breaks the group page)

## Technical notes
Pattern: the J-A enrolment-summary slice (failure-isolated BFF composition). Group page lives in the Groups area's route tree — panel only, no Groups contract change.

## Verification
Unit sweep green; manual walk on the group page after gate.
