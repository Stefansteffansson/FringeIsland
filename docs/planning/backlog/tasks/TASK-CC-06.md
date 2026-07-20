# Reconciliation, E2E journeys, sweeps, 6-done

---
id: TASK-CC-06
title: COM-11 reconnect reconciliation + degradation states, the live E2E journeys, full sweeps, next build, 6-done transitions
status: in_progress
assigned_to: claude
priority: high
feature: FEAT-H027
owner: hub
wave: ferd
cycle: C-C
depends_on: [TASK-CC-02, TASK-CC-04, TASK-CC-05]
estimated_hours: 4
---

## Description
STORY-6 + cycle close. Reconciliation: comm surfaces show a quiet reconnecting indicator while their channel is not subscribed; on re-subscribe or visibility regain → invalidate + re-fetch mounted comm reads + badge; while degraded with the tab visible → slow poll (~60s, one tuned constant, the session-guard value); hidden tab polls nothing. E2E (two browser contexts, the sessions.spec precedent): (1) B's open inbox + badge update after A sends a DM — no reload; (2) A's open group page shows B's forum post live; (3) the open detail receives a new message live. Assert observable effects, in-context navigation only (never goto-revisit as the only scenario). Then: full unit + integration (sequential, never two suites vs the shared dev DB) + E2E sweeps, `next build` (the type gate), lint; Implementation notes with honest red→green evidence (label any test-after); maturity 5-in-cycle → 6-done for BOTH specs with §L4 rows + feature indexes updated in the same commits; CHANGELOG.

## Acceptance criteria
- [ ] Reconciliation unit suite red-first (status-driven indicator, rejoin/visibility re-fetch, poll gating); E2E live journeys green
- [ ] Full sweeps green (found-not-caused failures fenced by name at main HEAD); `next build` clean before 6-done
- [ ] Route-policy conformance green (no new routes expected — assert unchanged); API-boundary DoD satisfied platform-side (CC-01/02's adversarial coverage)
- [ ] Performance DoD: no new first-paint reads asserted; B6 unchanged (skeletons first-load only); no deep-cold trigger (no first-paint request added or rerouted — record the disposition in the spec)
- [ ] 6-done: both specs' Implementation notes + §L4 rows (Hub SPECIFICATION.md, communication.md) + both features/README.md maturity columns in the same commits

## Technical notes
E2E precedent: `hub/tests/e2e/sessions.spec.ts` (two-context remote sign-out; `bringToFront` arms the visibility fallback so assertions are deterministic — reuse that trick for hint-vs-poll determinism). Dev server on :3000 required. Fixture rules: run-unique names, `markArrivedOnce`.

## Verification
All sweeps + build green; the plain-English walkthrough written at close (feature-development Step 6); session bridge.
