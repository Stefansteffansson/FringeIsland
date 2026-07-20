# Hub surfaces — forum window affordances + report dialog

---
id: TASK-CD-05
title: Hub edit/delete-own window + reporting (H028 STORY-4..5)
status: done
assigned_to: claude
priority: high
feature: FEAT-H028
owner: hub
wave: ferd
cycle: C-D
depends_on: [TASK-CD-03]
estimated_hours: 5
---

## Description

Edit/Delete affordances on own live posts younger than 15 minutes (payload-fact-derived: `author_group_id`/`created_at`/`updated_at`/`is_deleted`), inline edit with confirmed write-through, ConfirmModal delete rendering the moderation-identical tombstone, "(edited)" marker, honest window-expiry refusal with draft preserved; the Report dialog on others' forum posts + DM messages (required reason, idempotent "already reported"); conversation detail renders no mutation affordances (regression).

## Acceptance criteria

- [ ] STORY-4..5 ACs covered unit-tier red-first
- [ ] DM-immutability regression test at the surface (no affordances rendered)

## Technical notes

Graft onto the H026 forum components; report dialog is a shared small component used from forum + `/messages/[id]`.

## Verification

`npm run test:unit` green; manual walk.
