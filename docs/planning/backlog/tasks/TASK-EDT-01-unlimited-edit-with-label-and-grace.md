---
id: TASK-EDT-01
title: Own-post editing goes unlimited — "(edited)" label always, except a 3-minute silent grace for typo fixes
status: built 2026-08-21, held at the schema gate — red-first 3 red at the unit tier -> 179 suites 1518/1518; the flipped integration cell demonstrated red against the live windowed contracts (42501 /window/i); lint 0; next build green. Delete RULED unlimited at pull (Stefan, 2026-08-21 — one consistent posture). Awaits the named apply+merge nod
assigned_to: claude
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
- **Unchanged unless separately ruled:** the wielded no-edit posture (a group-authored post stays editable by no one — PD019 v1). **RULED at pull (Stefan, 2026-08-21): delete goes unlimited too** — one consistent posture; a bounded delete protects little once edit is unlimited, and the tombstone keeps thread structure. Still open (out of scope, unpulled): whether DM/conversation messages ever gain editing (they have none today).

## Acceptance sketch (firmed at pull)

Red-first: an own-edit after 20 minutes succeeds and renders "(edited)"; an edit within 3 minutes succeeds and renders no note; a later edit turns the note on; wielded posts still refuse edit; sibling window cells adapted with labels.
