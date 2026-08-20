# Session bridge — 2026-08-20: FEAT-H047 built 6-done; the T2R leave rider found and held at the gate

**Continuation of the `2026-08-19_01` bridge** (walk green, EDT-01 captured). This session also closed the debris thread (previous entries in-conversation: the pc025 catalog leak — clone retired via contract, hard delete refused by RD-4a **as designed**; synthetic gt deleted; TASK-DBT-03 merged #561) and recorded the **one-database fact** (Vercel prod = the dev DB — auto-memory; every dev write is a production write).

## The consumer build caught a platform gap first (TASK-PD019-2R, PR #562 — HELD at the gate)

Mapping the Hub surface exposed that **`leave_group_conversation` was the conversation family's seventh contract and tranche 2 missed it** — the T2 walk used a hand-picked list, not a family sweep (lesson recorded in PD019's walks: *a family walk sweeps the family*). The rider (`20260820120000`): wielded leave is **key-only** (limb 1 + A's own participant row, deliberately no limb 2a — the `leave_group_as_group` exit-family precedent; a removed group stays cleanable by its key-holders; the standing cell proves leave is the one act that survives A's removal). Red-first 3 red → 15/15; slices 16 suites 178/178; applied + recorded in the log. **Merge order: #562 before #563.**

## FEAT-H047 — wielded conversation affordances, 6-done (PR #563 — ready, ordered after #562)

Two rulings (Stefan, 2026-08-19) shaped it: **the link carries the hat** (`/messages/[id]?acting=` behind Suspense; the server gate is the authority; per-page state, never a session mode) and **the composer wears a label** ("Sending as {A}"; one-time confirms on join/leave/create only — never per message).

- Section: banner, A-referented rows, `?acting=` links, hat-gated create, hat-insufficiency copy, the three confirms naming the wielding.
- Thread page: wielded read/send/mark as the group; **wielded sends re-read, and the re-read is load-bearing** (a first-time sender's senders-map entry exists only after it — the appended-row design rendered A as 'Unknown'; caught by the E2E). The personal path's optimistic append carries the same latent first-message quirk — **found, not caused, left untouched** (worth a small task if it ever bites a walk).
- Sender `kind` badges in both views; Report hidden under the hat; refusal + "View as myself" fallback.
- Spec corrections at walk time: `participants[]` carry `name` only (no kind — the byline is the badge's home); no participant roster UI exists to highlight.
- Evidence: red-first 11 red / 1 pure guard → 12/12; unit tier **178 suites 1497/1497** (labelled adaptation: three thread-page suites' navigation mocks gained `useSearchParams`); lint 0 errors; `next build` green; **three E2E journeys green** (wielded conversations + wielded forum + forum). Harness note recorded in the spec: `use(params)` + Suspense needs render-inside-async-act under React 19.

## Open items for the next session

1. **PR #562 (the rider) waits for the named approval** — the key-only posture is the one item for eyes; then **merge #563** (H047) right after. Both PRs' bodies carry the order.
2. **Walking tranche 2 + H047 live** — the walk cast (Wanda/Riverside/Harbour) is in place; a conversations walk mirrors the forum one (the thread now at `/messages/[id]?acting=`).
3. **Tranche 3 (announcements)** — the last PD019 pull (PD020-interplay walk first); then PD019 can go 6-done and the acting family is complete.
4. **Carried:** TASK-EDT-01 (unlimited edit + label + grace; delete-window question at pull); TASK-DBT-03 (suite teardown + audit checklist); wave assignment for the family; the ADR-U039 §4 topic-channel rider (recorded, unscheduled).
5. doc-health-check: deliberately skipped — no renames/deletions/restructures; everything rides its PR.
