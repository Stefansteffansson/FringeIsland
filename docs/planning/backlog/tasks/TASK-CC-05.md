# Forum tenant: the group page hears its forum

---
id: TASK-CC-05
title: The page-scoped forum tenant — mount/unmount with GroupForumSection, hint → dropGroup + re-read, drafts preserved, tombstones live
status: todo
assigned_to: claude
priority: high
feature: FEAT-H027
owner: hub
wave: ferd
cycle: C-C
depends_on: [TASK-CC-03]
estimated_hours: 3
---

## Description
STORY-4: `GroupForumSection` for group G registers a tenant on `group:<G>:forum` while mounted; on hint → `dropGroup(G)` + re-read the section's loaded window (new threads appear newest-first, replies in place, moderation hints materialize the standard tombstone); composer and reply drafts preserved across re-reads; navigating between groups swaps subscriptions (never both, never neither); pages without the section create no forum subscription. Refetch-don't-patch (the rabbit-hole fence): the hint's `post_id` is correlation only.

## Acceptance criteria
- [ ] Unit suite red-first: subscription lifecycle bound to mount/group id; hint → drop + re-read; draft preservation asserted; tombstone-on-hint; no subscription without the section
- [ ] No per-post patching; no new fetch plumbing (`fetchGroupForum` + `dropGroup` only)
- [ ] Composer/textbox located by role (fixture rules)

## Technical notes
Cache: `hub/lib/forum/client.ts:27-72` (per-group Maps + `dropGroup` :69-72). Section precedent: C-B's failure-isolated `GroupForumSection` (own skeleton first-load only).

## Verification
`npm run test:unit` green after demonstrated red; C-B forum suites stay green; lint clean.
