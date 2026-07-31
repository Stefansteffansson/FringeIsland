# COR-C E2E fallout — four specs adjudicate-and-adapt (found-not-caused, enumerated at ADM-A)

---
id: TASK-DBT-02
title: Adjudicate + adapt four E2E specs failing on main since COR-C — the close ran integration/unit/build but no full E2E sweep, so the fallout sat latent until the ADM-A sweep
status: done  # closed 2026-08-01 (ADM-B hygiene block): all four adjudicated canonical-wins — 1 spec-behind-W-04, 2 asks-split intended (premises reconciled), 3 joined count copy, 4 NOT transient (platform-wide .in() URL ceiling at 398 grants, fixed structurally); sweep 93/93 green twice consecutively; the E2E-at-schema-close process question stays flagged for the area gate
assigned_to: claude
priority: high
feature: none  # debt — A-NTF/A-GRP surface specs vs post-COR-C canonical behavior
owner: hub
wave: ferd
cycle: ADM-B — the cycle's opening hygiene block, paired with TASK-INT-05 (Stefan, 2026-08-01, with the ADR-U052 acceptance: "plan together"); both restore a green, leak-free E2E baseline before ADM-B's own E2E lands
depends_on: []
estimated_hours: 4
---

## Description
The ADM-A full E2E sweep (2026-07-31, the first since COR-C merged) surfaced two fallout classes. Class 1 — menu locators (`role=link/button` → `role=menuitem`, COR-C W5 #342) — was adapted in the same sweep (4 sites: profile ×2, consent, export; labelled). Class 2 needs per-spec adjudication (canonical-wins: decide whether the spec or the behavior is right before touching either):

1. **`notifications.spec.ts:101`** — clicking an unread invitation routes to `/groups` (the my-invitations panel — the W-04 ANSWER_PATHS canon, carried as registry data since W3 #347); the spec expects `/groups/<id>`. Likely spec-adapts, but confirm the registry row is the intended path and the "first button" click still selects what the story means.
2. **`notification-preferences.spec.ts:179`** — strict-mode violation: TWO "Always on" locked rows where the spec's premise is "`account` only in Ferd". Adjudicate: did a COR-C data migration make a second category non-suppressible (intended → spec adapts + the FEAT-H033/PD016 premise line updates) or is the data wrong (defect)?
3. **`group-of-groups.spec.ts:202`** — the Gracy count copy `^1 member$` not found. Determine what renders now and why (count-copy drift vs fixture-state drift vs a W1/W3 side effect).
4. **`notification-actions.spec.ts:169`** — `TypeError: fetch failed` in `seedActingHolder` (service-client network). Transient-shaped; verify with the control-run discipline, fence with the house retry if it reproduces as flake.

**Process note (the fourth strike):** the W3 migration adapted the N-A/N-B *integration* payload pins but named no E2E siblings; the platform CLAUDE's sibling-assertion rule already covers this — the miss was that no full E2E sweep ran at the COR-C close. Candidate standing fix for the area gate: full E2E joins the post-apply verification set whenever a migration changes surface-reachable behavior.

## Acceptance criteria
- [ ] Each of the four adjudicated canonical-wins with the ruling recorded in the adapting commit; specs green in a full sweep.
- [ ] The FEAT-H033 "account only" premise reconciled if item 2 turns out intended.
- [ ] The E2E-at-schema-close process question surfaced at the A-ADM area gate.

## Verification
Full `npx playwright test` sweep green twice consecutively (the pollution-vs-real discriminator this sweep lacked).
