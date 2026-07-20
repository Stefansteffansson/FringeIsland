# Conversations tenant: live inbox, open detail, unread badge

---
id: TASK-CC-04
title: The app-wide conversations tenant — hint → invalidate + conversationsChanged; inbox/badge/detail re-read live, verify-on-signal
status: done
assigned_to: claude
priority: high
feature: FEAT-H027
owner: hub
wave: ferd
cycle: C-C
depends_on: [TASK-CC-03]
estimated_hours: 4
---

## Description
STORY-2/3/5 + STORY-7 cache half: the tenant subscribes to `account:<auth_uid>:conversations` (armed with the manager's FIM rule); on any hint → `invalidateMessagesCache()` + dispatch `conversationsChanged` window event carrying the hinted `conversation_id`. Consumers: `MessagesLink` re-fetches and recomputes the `has_unread` count; the `/messages` inbox re-reads in the background (existing content stays rendered — no skeleton flash); the open `/messages/[id]` detail re-reads through its existing load path only when the hint names it (read-marking behaviour unchanged); hints naming other conversations leave the open detail undisturbed. Verify-on-signal: no rendered content from payloads; a refused re-fetch leaves surface state unchanged; own-send hints converge with confirmed write-through (no duplicate, no flicker).

## Acceptance criteria
- [ ] Unit suites red-first per consumer (tenant handler, MessagesLink, inbox page, detail page): hint → invalidate + event; targeted vs non-targeted hint behaviour; background re-read keeps prior content; forged-hint no-op
- [ ] No new fetch plumbing — existing couriers/caches only (`fetchConversations`, `fetchConversationDetail`, the module caches)
- [ ] Content-free hint telemetry (ids as correlation only)

## Technical notes
Event-listener precedent: `MessagesLink.tsx:28-48` (`refreshNavigation`); cache: `hub/lib/messages/client.ts:36-85`. House pattern for cross-component events: `SESSIONS_CHANGED_EVENT` in session-guard (:35, :109). Composer/locator test rules: textbox by role.

## Verification
`npm run test:unit` green after demonstrated red; lint clean; drafts/optimistic behaviour of C-A unbroken (existing suites stay green).
