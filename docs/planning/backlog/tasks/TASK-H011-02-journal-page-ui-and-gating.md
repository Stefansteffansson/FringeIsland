---
id: TASK-H011-02
title: /journal page — list, editor, edit/delete, empty state, FIM-only gating
status: todo
assigned_to: Claude
priority: high
feature: FEAT-H011
owner: hub
wave: ferd
cycle: IDN-5
depends_on: [TASK-H011-01]
estimated_hours: 5
---

# TASK-H011-02: The /journal surface (STORY-1..4)

## Description

- `/journal` route (authenticated FIM): reverse-chronological entry list
  (title-when-present, body, human-readable date), empty state inviting the
  first entry, plain editor (optional title, required body), edit in place,
  delete via **ConfirmModal** (never browser confirm). Failed save is
  non-destructive (typed text preserved, error shown). "Load older" via keyset
  pagination (`before`).
- Gating: signed-out → redirect to sign-in; Mist → no Journal nav item, deep
  link redirected (FEAT-H004 transcendence-invitation pattern); suspended
  members covered by the standing account-state gate (FEAT-H006).
- Components under `app/journal/` (feature-specific); reuse `components/ui/`
  primitives. `useAuth()` consumers marked `'use client'`.

TDD: unit tests (Jest + jsdom) red-first for list rendering, empty state,
editor validation (body required), save-failure preservation, ConfirmModal
delete flow, Mist/signed-out gating branches.

## Acceptance check

- STORY-1..3 criteria pass at the unit tier; STORY-4 gating branches covered.
- Pyramid upright: logic at unit tier, not deferred to E2E.

## Verification

`npm run test -w hub` (unit); `npm run lint`; manual dev-server pass.
