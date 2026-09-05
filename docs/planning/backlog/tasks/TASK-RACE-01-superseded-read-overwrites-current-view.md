---
id: TASK-RACE-01
title: A superseded section read overwrote the current view — the group page's Conversations / Forum / Announcements sections flipped to "the hat doesn't open …" when a stale members-only read resolved after the wielded read (found by the Ferd-close E2E run, 2026-09-05)
status: done  # built and verified 2026-09-05 (red-first 4/4 → green; unit tier 200 suites / 1 659; lint + typecheck clean; the four E2E journeys 19/19 on the test project, the conversations journey green twice)
assigned_to: claude
priority: high
feature: FEAT-H047 (the failing spec) + FEAT-H046 + FEAT-H048 (the same shape, fixed in the same pass) — post-6-done fix, Implementation notes amended
owner: hub
wave: ferd
cycle: none — found 2026-09-05 by the Ferd close's DoD walk (Q1, the E2E fleet on the test project), fixed the same session
depends_on: []
estimated_hours: 2
---

# TASK-RACE-01 — only the latest read may write

**How it surfaced.** The Ferd close's DoD walk ran the E2E fleet on the test project (14:09Z): `wielded-conversations.spec.ts` "the hat opens the conversations" failed — the Conversations section read *"The H047Reps… hat doesn't open this group's conversations."* while the Announcements and Forum sections showed *"Viewing as …"*. It failed again in isolation (14:20Z) and a third time under `--trace on` (14:25Z). The same spec had passed three full fleets that morning (the ADR-U053 cutover's evidence, 150 / 150). No product code changed in between; the permission catalogue is identical on the test and production projects (Member Role Template 12 permissions on both); the project was clean between runs.

**What the trace showed** (request completion order, `/api/groups/<B>/…`):

```
GET /conversations                      -> 403 {"error":"Not allowed"}   (the personal read at mount — the session FIM is not a member of B)
GET /conversations?acting=<A>           -> 200                            (the wielded read — the door opened)
GET /forum?acting=<A>                   -> 200
GET /conversations                      -> 403                            (the SECOND personal read — resolved LAST)
```

The wielded list door worked. A personal read that was still in flight when the hat went on resolved **after** the wielded read and wrote `membersOnly = true`; with `acting` set, the section renders the hat-insufficient copy. Timing-dependent — which is why it was green three times in the morning and red three times in the afternoon (the Playwright-booted dev server's cold route compile decides which response lands last).

**Root cause.** `GroupConversationsSection`'s `load` callback wrote state unconditionally after its `await`. The effect's `active` flag guarded only the follow-up permissions read, not `load` itself — so a superseded read could still write. `GroupForumSection` and `GroupAnnouncementsSection` carry the same shape (the H046 / H048 lineage); their E2E journeys passed by timing.

**The fix** (`hub/components/groups/GroupConversationsSection.tsx`, `GroupForumSection.tsx`, `GroupAnnouncementsSection.tsx`): a `readSeq` ref. Every `load` takes a sequence number before its `await` and returns without writing — in both the success and the refusal branch — if a newer read has started since. Handler-driven re-reads (join / leave / create / send) inherit the rule: the latest read wins.

**Not changed.** The BFF routes and the platform contracts — the `ds5_assert_wielded_content_gate` two-limb door served the wielded read correctly (200); nothing platform-side was involved.

## Tests, red-first

- **Unit (demonstrated red 2026-09-05, then green):** `GroupConversationsSection.acting.test.tsx` — two cells (the stale personal read resolving last as a 403 leaves the wielded list and never names the hat insufficient; the mirror — a stale wielded success never resurrects rows over the members-only view); `GroupForumSection.acting.test.tsx` and `GroupAnnouncementsSection.acting.test.tsx` — one cell each (the same first shape). Red: 4 / 4 cells failed with the exact hat-insufficient copy from the E2E screenshot.
- **E2E (the existing journeys, re-run on the test project):** `wielded-conversations.spec.ts` (twice), `wielded-forum.spec.ts`, `wielded-announcements.spec.ts`, and `admin-roles.spec.ts` (the other fleet red of the day — passed in isolation before the fix; a fleet-order flake, re-run for the record).

## Verification (2026-09-05)

- **Red:** the four new cells failed before the fix with the exact copy the E2E screenshot showed (*"The Alpha hat doesn't open this group's conversations / this forum / these announcements."*).
- **Green:** `npx jest tests/unit` — 200 suites / 1 659 tests (14:30Z); `npm run lint` and `npm run typecheck` clean.
- **E2E on the test project (14:32Z):** `admin-roles.spec.ts` 16/16, `wielded-announcements.spec.ts` 1/1, `wielded-conversations.spec.ts` 1/1, `wielded-forum.spec.ts` 1/1 — 19 passed in 52.6 s; `wielded-conversations.spec.ts` again 1/1 (16.9 s). The morning's fleet-order red on `admin-roles` did not recur in isolation before or after the fix (a flake of the fleet order, not of the product).
- **Where it is recorded:** the three specs' Implementation notes (post-6-done fix), `hub/CHANGELOG.md` (member-facing), the root `CHANGELOG.md` (the class), and the Ferd DoD walk record's Q1 row.
