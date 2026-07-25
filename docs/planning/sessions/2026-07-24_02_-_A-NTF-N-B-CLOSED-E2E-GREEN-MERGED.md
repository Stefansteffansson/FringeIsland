# Session bridge — A-NTF Cycle N-B: closed, E2E green, merged (#277 + #278)

**Date:** 2026-07-24 (session 02) · **Wave:** Ferd · **Area:** A-NTF (Notifications), Phase-3 area 5 of 6
**Follows:** [`2026-07-24_01_-_A-NTF-N-B-PLATFORM-MERGED-HUB-BUILT-E2E-PENDING.md`](./2026-07-24_01_-_A-NTF-N-B-PLATFORM-MERGED-HUB-BUILT-E2E-PENDING.md)

---

## One-paragraph state

The N-B **E2E phase and cycle close are done**. Both feature specs are `6-done` with Implementation notes and L4 summaries in the same commit, **ADR-U051 is Accepted**, the completion plan's N-B row is marked built, and the CHANGELOG carries the user-visible entry. E2E is **green across three specs (8 tests)**. **Both PRs are merged and `main` is synced at `4eed439`** — #277 (the feature + the cycle close) and #278 (the cycle-boundary doc health check + the N-C rider), each merged on Stefan's named nod because the diffs touched an ADR status and a steering file respectively. Working tree clean, no open PRs, `discovery` re-synced. **N-B is closed; nothing is in flight.** The close found more than the previous bridge predicted — see below.

*(Written mid-session while #277 was still held, then completed at the merge. The sections below were accurate when written; this paragraph and the ritual checklist carry the final state.)*

## What the close found (beyond the planned scope)

The previous bridge said the Hub half was "code-complete". Three things said otherwise; all are fixed:

1. **STORY-1 AC3 was unmet.** Both `respond` handlers rolled back a failed dispatch but swallowed the reason in a bare `catch {}` — and no test covered it. A silent rollback is indistinguishable from "nothing happened", which is the divergence the criterion forbids. Both surfaces now pin the reason to its row (`notification-action-error-<id>`, `role="alert"`). Red demonstrated on both, then green.
2. **STORY-2 AC1 was unmet.** The retired `PendingNominations` showed the nominee a concrete "Respond by <date>" from `expires_at`; the fold lost it — `Respond by` existed nowhere in the tree. `NotificationItem` now renders it while a row awaits an answer, and drops it once answered or expired. Red on the positive assertion; the three absence-guards passed at red by nature and are labelled as such, not claimed as four reds.
3. **A second red E2E spec the bridge never flagged.** `leadership-transfer.spec.ts` still drove `pending-nominations` / `accept-nomination-*` / `decline-nomination-*` — all deleted in N-B. Found by sweeping every E2E spec for the retired testids rather than trusting the one file the bridge named. **Both** its nomination journeys (accept and decline) now answer in the bell.

## Two test-side defects, fixed rather than worked around

- **The navigation that ate the dispatch.** The first adapted `group-of-groups` run left the membership `invited`. `page.goto` on the heels of the confirm click **aborts the in-flight POST**, and the optimistic paint hides it — so "the buttons vanished" proves nothing. All three specs now assert the dispatch itself (`waitForResponse` on the response route + **status 200**) before asserting its consequence. Product-side this is benign: a user who navigates mid-flight simply hasn't answered, and the next load re-reads server state.
- **The assertion that lost its scope.** `leadership-transfer`'s "the Surface never names the routing" check was scoped to the `pending-nominations` panel; re-homing it to the whole bell dropdown made it wrong, because the dropdown legitimately carries a `"Member" role in "FringeIsland Members"` notice. Re-scoped to the nomination's own row.

## Test evidence

- **Unit:** 940/940 (934 inherited + 6 added: 1 bell, 1 inbox, 4 `NotificationItem`), 127 suites.
- **Build:** `next build` green — the house type gate.
- **Integration:** the PD014 suite re-verified **13/13** with `--runInBand`.
- **E2E (8 tests, all green):** `notification-actions.spec.ts` 1/1 · `group-of-groups.spec.ts` 2/2 · `leadership-transfer.spec.ts` 5/5.

## Key facts the next session needs

- **Nothing is in flight.** #277 and #278 are both merged (squash, branches deleted); `main` is at `4eed439`; `discovery` matches; no open PRs. **Start N-C from a clean tree.**
- **The migration `20260724120000` is already applied to the dev DB + log repaired** — do NOT re-apply.
- **`npx jest` with no path runs the integration tier in PARALLEL against the shared dev DB and produces mass false failures** (447 in this session, all environmental). Use `npm run test:unit` / `npm run test:integration` (`--runInBand`). This cost real time — don't repeat it.
- **`npx tsc --noEmit` is not a gate this repo passes:** ~1241 pre-existing errors repo-wide (jest-dom matcher types absent from the root tsconfig) in files this branch never touched. `next build` is the type gate.
- **The ES256 flake (TASK-INT-01) was actively degrading all session** and its shape is now better characterised: within a single Playwright process the **first spec tends to pass and later specs fail** — GoTrue degrades partway through a run. Green was reached with the retry loop run **per spec** (each its own invocation + retries); assertions untouched, only the process boundary moved. Two traps worth remembering: the retry guard must **strip ANSI** before grepping for assertion failures (Playwright colourises even when redirected, so `Error: expect(` is really `Error: <ESC>[2mexpect(` — an unstripped guard retried straight past a real bug), and killing a run **orphans the dev server**, whose stale `.next/dev/lock` then panics Turbopack on the next start (kill the listener + wipe `.next`).
- **Retry scripts live in the session scratchpad** (`e2e-retry.sh`, `e2e-lt.sh`) — not in the repo.

## Open threads (carried)

- **Follow-up, named at the close — ROUTED TO N-C (Stefan, 2026-07-24):** N-B deleted `PendingNominations`, the only consumer of the `/api/me/overview` bundle's `nominations` slice. The bundle still computes `get_my_pending_nominations` on every `/groups` first paint and ships a slice nothing reads (`fetchMyNominations` has no production caller left). Dead weight on a first-paint read, contrary to the ADR-U042/U043 posture. Recorded as an N-C rider in the completion plan.
- **Two lifecycle facts surfaced by the plain-English walk** (both correct, both named so they aren't rediscovered as bugs): a holder who loses `act_as_group` between fan-out and answering is refused `42501` and **now sees why** (the AC3 fix earning its keep); and **send-time fan-out (ADR-U049) means a leader added after the invitation gets no letter** — "everyone who can answer" is true as of the invite, not continuously.
- **TASK-INT-01** ES256 flake — still parked, awaiting Supabase. Actively flickering.
- **ADR-U050** — still `Proposed`, riding the C-F schema gate (TASK-DOC-005).
- **A-NTF is not closed:** N-C (realtime + reconnect + announcement adapter; NB-7 legacy-publication drop) and N-D (preferences + shared dispatcher) are unbuilt. The **ADR-U043 measurement pass and Stefan's live walk are area-gate items, not per-cycle**.

## Close ritual status

- [x] Feature specs `6-done` + L4 summaries in the same commit
- [x] ADR-U051 Accepted
- [x] Completion plan N-B row marked built; TASK-NB-05 `done` with an outcome section
- [x] CHANGELOG entry (the plain-English walkthrough)
- [x] Session bridge (this file)
- [x] `npm run dashboard` refresh
- [x] **PR #277 merged** (squash, branch deleted) on Stefan's named nod, 2026-07-24 — `main` synced at `904baf3`
- [x] Discovery sweep — re-run after the merge; `discovery` re-synced with the moved `main`
- [x] `doc-health-check` — cycle boundary (results below)

## Doc health check — 2026-07-24 — cycle boundary (A-NTF N-B close)

Sections run: 1.5, 1.6, 3 (links), 3.6, 5, 8, 11. Skipped: 1 (no renames), 2 (schema landed + documented last session), 3.5, 3.7, 4, 6, 7, 9, 10 (no triggers).

**Fixed in place**
- **Task-status lag (4 files).** TASK-NB-01/02 sat at `review`, NB-03 at `blocked` (the schema gate — long since merged), NB-04 at `todo` — all four shipped in #276/#277. Set to `done`; NB-04's acceptance boxes ticked.
- **Section 1.5 table fed.** Added a row for the concept this cycle retired — *answering outside the notification surface* (`PendingNominations`, the panel's Accept/Decline) — with the sense-classification note, so future sweeps read surviving hits correctly.
- **FEAT-PC016 consumer status.** Its only surface consumer was deleted this cycle; the contract is live but reached solely through the orphaned bundle slice. Annotated so it isn't read as actively consumed, pointing at the N-C rider.
- **Anatomy stamp (Section 11).** Moved to ADR-U051 with an explicit *reviewed, no anatomy impact* note — U051 fixes a DS-5 contract family's shape, not any tier/service/boundary the overview draws. ADR-U050 remains deliberately unabsorbed while Proposed.

**Critical finding — pre-existing, routed not patched**
- `FEAT-PC002` declares `6-done` with **no Implementation notes section at all** (Section 5's named critical shape). Closed in an earlier cycle (`5cdd77b`), untouched by A-NTF — fenced out of the N-B green claim. Writing the notes needs that cycle's build context, so it went to **TASK-DOC-006** rather than being patched blind. That task also asks for a whole-tree Section 5 pass, since one absent-notes case suggests the check hadn't been run against every `6-done` spec.
  - **Superseded 2026-07-25 (PR #280).** `TASK-DOC-006` no longer exists — it was a **duplicate** of `TASK-DOC-004`, filed for the same finding at the A-JRN boundary six days earlier and open in the standing-tasks table the whole time. This run re-found the finding without checking the backlog. The notes are now backfilled, the whole-tree pass is done (62 `6-done` specs, PC002 the only hit), DOC-004 is `done`, and DOC-006 is deleted. See [`2026-07-25_01`](./2026-07-25_01_-_PC002-NOTES-BACKFILLED-DOC-HEALTH-REFIND-RULE.md).

**Clean**
- **1.6** — the six `directional` hits are all the substring in "one-**directional** dual-enrolment refusal". No unfiled deviation markers.
- **5 / 8** — both N-B specs `6-done` with substantive Implementation notes; all four inventory rows (hub SPECIFICATION §L4, both features/README indexes, the DS-5 realisation row) agree with disk.
- **3** — every relative link in the specs touched this cycle resolves.
- **3.6** — `PendingNominations.tsx` and its test confirmed absent from disk; no active doc presents either panel as a current place to answer.
