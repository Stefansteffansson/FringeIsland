# FEAT-H011 L4 Journal retrofit — session cache + skeleton (B4/B6 conformance)

---
id: TASK-JE-06
title: Journal retrofit: session cache + skeleton (FEAT-H011 revision — 6-done spec touch)
status: todo
assigned_to: claude
priority: medium
feature: FEAT-H011
owner: hub
wave: ferd
cycle: J-E
depends_on: []
estimated_hours: 3
---

## Description

The perf-interlude rider (analysis RC-D, bridge `2026-07-09_01`; rides J-E as its own task set): the Journal was built 2026-07-03, before ADR-U043 landed, and was never retrofitted —

1. `hub/lib/journal/client.ts` has **no session cache**: every visit refetches → spinner on every revisit — a B4 violation by construction. Retrofit the groups/journeys session-cache client pattern.
2. `hub/app/journal/page.tsx` uses `LoadingState` (spinner), not a skeleton — a B6 violation. Replace with the house skeleton pattern.

**This touches a `6-done` spec (JE-6 flag): FEAT-H011 requires a revision note** recording the retrofit — what changed, why (ADR-U043 B4/B6 conformance), and the perf-interlude provenance. Follow the revision-note pattern already present in FEAT-H012/H017 (revised at the edge→Node migration).

## Acceptance criteria

- [ ] Session cache on the journal client (same semantics as `hub/lib/journeys/client.ts`): revisit renders from cache, no refetch storm across auth-event churn
- [ ] Skeleton over spinner on the journal page's first load (B6)
- [ ] Unit tests demonstrated red first for the cache behaviour (fetch-count assertions: 1 fetch, revisit 0); any coverage of already-shipped behaviour labelled test-after honestly
- [ ] FEAT-H011 revision note added (6-done spec touch — required)
- [ ] Keyset load-older, edit-in-place, delete flows unchanged (regression: existing journal tests stay green)

## Technical notes

- Pattern sources: `hub/lib/journeys/client.ts` / `hub/lib/groups/client.ts` (session cache), the groups/journeys pages' skeletons (B6 prior art).
- Cache invalidation: journal is mutable in-place (compose/edit/delete) — writes must invalidate or update the cache so the page never renders stale entries after a mutation (mutations-re-read doctrine unless a justified deviation is recorded).
- Independent of the PD006 schema gate — can build and ship while the gate is pending.

## Verification

Hub unit suite + lint + `next build` green; manual: visit `/journal`, navigate away, return — no spinner, instant render from cache; compose/edit/delete still correct.
