# H020 step-kind renderers + completion under gating — every kind DS-3 publishes

---
id: TASK-JB-05
title: H020 kind renderers + completion/gating UX
status: todo
assigned_to: Claude
priority: high
feature: FEAT-H020
owner: hub
wave: ferd
cycle: J-B
depends_on: [TASK-JB-04]
estimated_hours: 5
---

## Description

The registry-key → renderer map (JRN-18): each of the seven seeded Tier-1 kinds renders its content payload + ask-verb affordance; a mandatory fallback renderer handles unknown keys (title + payload + generic complete — never a crash). Completion (JRN-8): optimistic tick + background `complete` + rollback-with-retry on failure; locked state names the blocking required predecessor; completed non-repeatable steps render in review posture; server P0001 races render the same honest state.

## Acceptance criteria

- [ ] STORY-3/6 acceptance criteria asserted, kind-by-kind (seven kinds + the fallback path)
- [ ] No sealed union anywhere (`kind: string`); adding a registry row needs no Hub change to keep functioning
- [ ] Optimistic-progress scope holds: only player progress marks are optimistic; everything else stays re-read

## Verification

`npm run test` unit green (renderer + completion suites).
