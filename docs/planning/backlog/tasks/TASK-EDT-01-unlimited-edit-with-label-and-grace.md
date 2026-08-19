---
id: TASK-EDT-01
title: Own-post editing goes unlimited — "(edited)" label always, except a 3-minute silent grace for typo fixes
status: todo
assigned_to: unassigned
priority: medium
feature: FEAT-PD011 (platform contract) + FEAT-H028 (Hub affordance) — amendment pair
owner: platform/domain/communication (DS-5) + hub
wave: unassigned
cycle: none — captured mid-walk 2026-08-19, pulled when scheduled
depends_on: []
estimated_hours: one focused session (platform half holds at the schema gate)
---

# TASK-EDT-01 — unlimited own-edit with label + grace

**RULED (Stefan, 2026-08-19, during the wielded-forum walk, after the industry-pattern review):** replace the 15-minute own-edit window with the forum-standard transparency model —

1. **Unlimited editing** of your own forum posts (the clock no longer closes the door);
2. **"(edited)" note always shows** on an edited post…
3. …**except within a 3-minute grace period** after posting: edits made inside it carry no note (silent typo repair — the Stack Overflow/Discourse/Reddit grace pattern).

## Scope notes pinned at capture

- **Platform half (schema gate):** `edit_own_forum_post` re-issue — drop the 15-minute refusal (FEAT-PD011's window edge); the BFF's "Your 15-minute edit window has closed." mapping in `mapForumOwnMutationError` dies with it. Sibling sweep will hit the window cells in `GroupForumSection.window.test.tsx` and the forum integration suite's window-edge assertions.
- **Display rule needs no schema:** the "(edited)" note can render as `updated_at − created_at > 3 minutes` — a mid-grace edit leaves the note off; any later edit turns it on. (Known accepted edge: an edit at minute 2 followed by one at minute 50 shows the note — correct; the note reflects the *last* state honestly.)
- **Hub half:** retire `EDIT_WINDOW_MS` and the affordance ticker in `GroupForumSection` (the Edit button no longer expires); `isEdited` gains the 3-minute grace rule.
- **Unchanged unless separately ruled:** the wielded no-edit posture (a group-authored post stays editable by no one — PD019 v1); own-**delete** currently shares the 15-minute window and Stefan's ruling named *editing* only — **open question at pull:** does delete go unlimited too (the Reddit/Discord norm) or keep its window? Also open: whether DM/conversation messages ever gain editing (they have none today — out of this ruling's scope unless pulled in).

## Acceptance sketch (firmed at pull)

Red-first: an own-edit after 20 minutes succeeds and renders "(edited)"; an edit within 3 minutes succeeds and renders no note; a later edit turns the note on; wielded posts still refuse edit; sibling window cells adapted with labels.
