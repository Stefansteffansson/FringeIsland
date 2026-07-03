# /sessions page + SessionsPanel (inventory render + ConfirmModal revoke)

---
id: TASK-H012-02
title: /sessions surface — FIM-only gate, SessionsPanel inventory, ConfirmModal revoke, AccountMenu link
status: todo
assigned_to: claude
priority: high
feature: FEAT-H012
owner: hub
wave: ferd
cycle: E
depends_on: [TASK-H012-01]
estimated_hours: 4
---

## Description

FEAT-H012 STORY-1/2 surface: `/sessions` page (FIM-only gate — sessionless → login-with-redirect, Mist → redirected, suspended FIM still served) + `SessionsPanel` (rows newest-last-active first: device line from raw `user_agent` via light heuristics — no parser; IP; created/last-active; "This device" badge from `is_current`), per-row Sign out via `ConfirmModal` (distinct copy on the current row → local `signOut()` + `/login`); mutations re-read the list; failures non-destructive. AccountMenu link.

## Acceptance criteria

- [ ] Unit tests demonstrated RED then GREEN: gate branches; render order + badge; revoke flow (confirm → re-read); current-session revoke → local sign-out; failure leaves list truthful + error shown
- [ ] Loading state present (products-tier UI convention); no `alert()`/`confirm()`

## Technical notes

Follow the `/journal` page + `JournalPanel` pattern (Cycle D) for the gate, panel structure, and unit-test style. Device-line heuristic: a few `includes()` checks ("Chrome", "Firefox", "Safari", "Edg", "Windows", "Mac", "iPhone", "Android"), raw string fallback — rabbit-hole guard in the spec.

## Verification

Unit suite green; manual render against the dev DB.
