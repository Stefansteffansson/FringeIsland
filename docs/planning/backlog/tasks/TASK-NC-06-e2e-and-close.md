# N-C: E2E, the oracle's silent row, and the cycle close

---
id: TASK-NC-06
title: "N-C: E2E, the oracle's silent row, and the cycle close"
status: done
assigned_to: claude
priority: high
feature: FEAT-H032
owner: hub
wave: ferd
cycle: A-NTF N-C
depends_on: [TASK-NC-03, TASK-NC-04, TASK-NC-05]
estimated_hours: 4
---

## Description

The journey-level proof plus the cycle's closing paperwork. NTF-9 is the ported oracle's **SILENT** row — no v1 coverage exists — so these tests are the first evidence the reconnect guarantee holds anywhere.

## Acceptance criteria

**E2E (Playwright)**

- [ ] **Live arrival:** a signed-in member sits on a page; a second actor triggers a notification; the badge updates **without navigation**. Asserts the observable effect, not just the interaction.
- [ ] **Reconnect reconciliation:** notifications arrive while the socket is down or the tab hidden; on return, the count and list are correct. This is the SILENT-row coverage — the reason the cycle exists.
- [ ] **Nominations still reachable in the bell** after TASK-NC-05's removal — a real nomination, answered from the bell (proves the capability moved rather than vanished).
- [ ] Any revisit assertion navigates **client-side in one JS context** (Link/history) — a `page.goto` full load resets module state and masks client-cache staleness. A full-load variant may exist additionally, labelled, never as the only form.

**Close**

- [ ] Both specs advance to `6-done` with Implementation notes recording red→green honestly; any test-after coverage **labelled as such**.
- [ ] `§L4` feature-inventory rows in `docs/products/hub/SPECIFICATION.md` and `docs/platform/domain/communication.md` updated to `6-done` **in the same commit** as the maturity change.
- [ ] Both `features/README.md` indexes updated.
- [ ] **The three ADR-U039:33 channel amendments** (FEAT-H032 Cross-product impact): Hub `SPECIFICATION.md` §L2 §4 (`:38`, `:99`) and `:143`, **plus `docs/products/hub/CLAUDE.md`'s named channel list** — the last is a **steering file, so it pauses for the nod**.
- [ ] `CHANGELOG.md` updated (the live bell is user-visible).
- [ ] Route-policy conformance test green; `next build` green; full unit + integration suites green with any pre-existing failure fenced by name at `main` HEAD.
- [ ] **Plain-English walkthrough** written and walked against shipped behaviour — "what did we build, as a member would tell it" — explicitly asking the continuity/lifecycle questions the test tiers miss.
- [ ] Session bridge written.

## Technical notes

- E2E needs the dev server on `localhost:3000`. Single-token display names for fixtures (surfaces render the nickname as the first token of the display name).
- Simulating a dropped socket: prefer driving the manager's status callback or blocking the WebSocket at the browser context level over waiting on a real network failure.
- **Not** in scope for the area gate here — the full ADR-U043 measurement pass and Stefan's live walk are area-gate items, not per-cycle. TASK-NC-05's single deep-cold spot measurement is the per-cycle obligation.
- Still open at this cycle's close and to be carried, not silently dropped: the U049 §8 Q1 adapter-ownership answer (NB-3 verify-and-record), the NB-8 Mist posture proof, and the ADR-U039 draft-stamp/§31 question awaiting Stefan.

## Verification

- `npm run test:e2e` green.
- `cd hub && npx next build` green.
- Backlog triage walked for the boundary (PROCESS.md §3): the six standing tasks plus the stale N-A/N-B task files, and `TASK-DOC-003` / `TASK-OBS-01` are on their third carry — bet, re-scope, or drop with a reason.
