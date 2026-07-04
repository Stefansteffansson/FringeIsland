# Create-group flow, /groups/[id] detail page, settings editor

---
id: TASK-H013-02
title: The create-group flow on /groups, the group detail page (status badge + visibility-honest member list), and the permission-gated settings editor
status: done
assigned_to: claude
priority: high
feature: FEAT-H013
owner: hub
wave: ferd
cycle: Groups G-A
depends_on: [TASK-H013-01]
estimated_hours: 4
---

## Description

Surface pieces per the spec sketch: Create-group affordance + form on `/groups` (name required; description/label; two visibility toggles with distinct copy; no template picker) → navigate to detail on success. `/groups/[id]` page: journal-pattern FIM gate; fields; vocabulary-tolerant status badge; member count; member list exactly as the payload provides ("member list hidden" honesty when omitted); Edit settings iff `viewer.can_manage_settings`. Settings editor: partial-update save → re-read; failures non-destructive.

## Acceptance criteria

- [ ] Unit tests red-first per FEAT-H013 STORY-1..4 ACs (form validation, badge rendering incl. unknown status, member-list honesty, capability-flag gating, independent toggles, non-destructive failures)
- [ ] Mist/sessionless gates per house pattern (nav hidden, deep-link redirect/login-return)
- [ ] Mutations re-read, never optimistic; list page reflects the new group on return

## Technical notes

Components under `hub/components/groups/`; compose `components/ui/` primitives (no new design-system pieces). No client-side permission logic — the flag is the only gate. `refreshNavigation` covers the created-group list update if the nav lists groups.

## Verification

`npm run test:unit` green (new suites first seen red); manual: create → detail → edit → toggle.
