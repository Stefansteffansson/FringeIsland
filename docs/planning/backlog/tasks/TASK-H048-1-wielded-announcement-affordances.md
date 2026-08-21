---
id: TASK-H048-1
title: The hat opens the board — wielded announcement read, hat-gated announce and retract with confirms naming the wielding, kind badges
status: done — built and verified 2026-08-21 (red-first 10 red / 2 pure guards across 12 new cells -> 12/12; unit tier 179 suites 1516/1516; all three wielded E2E journeys green together; lint 0 errors; next build green). The E2E caught a dropped `acting` query param no lower tier could see (`URLSearchParams.size` unimplemented in the bundled Chromium) — fixed to the forum client's `toString()` idiom. FEAT-H048 6-done
assigned_to: claude
priority: high
feature: FEAT-H048
owner: hub
wave: unassigned
cycle: 2026-08-21 session
depends_on: [TASK-PD019-3]
estimated_hours: one focused session (the spec's appetite)
---

# TASK-H048-1 — wielded announcement affordances (all three stories)

One task for the feature: STORY-1 (the board door: acting read, "Viewing as {A}" banner, hat-insufficiency copy, per-view cache), STORY-2 (announce + retract gated on the HAT's `send_announcements`, each confirming with copy naming the wielding), STORY-3 (`kind` badges on announcement authors, both views).

## Build map (rulings + mechanism facts pinned in the spec's walks)

- **Ruling (carried into this session's brief):** announcements confirm, they do not wear a label — a board is not a cadence surface. "You are announcing as {A}" / "Announce as {A}"; the retract confirm names the wielding too.
- **Plumbing:** `lib/announcements/queries.ts` (three couriers gain a trailing `acting`) + `lib/announcements/client.ts` (H046 `viewKey` cache split, prefix-scoped drop) + two BFF routes (`/api/groups/[id]/announcements` GET+POST, `/api/announcements/[id]/retract` POST) gain param/body passthrough and the `wielded` telemetry flag. No new routes.
- **One prop on the page:** `app/groups/[id]/page.tsx` already computes `actingContext` for Forum and Conversations — pass it to Announcements.
- **`AuthorDisplay` in `lib/announcements/queries.ts` gains `kind?: string`** (additive; the platform has served it since PD019 T1 via `ds5_resolve_author_display`).
- **Not a re-read:** the wielded send keeps the confirmed-row prepend — the announcement row-doc carries its own platform-resolved author, so there is no senders-map staleness of the kind that forced H047's re-read.
- **No schema** → fuller-auto merge, no gate.

## Acceptance check

FEAT-H048 STORY-1..3 ACs red-first at the unit tier (`GroupAnnouncementsSection.acting.test.tsx` + a page passthrough cell if the existing acting page suite doesn't already cover it), the wielded announcement leg at E2E (the `wielded-forum.spec.ts` cast shape); route-policy conformance green; lint clean; `next build` green; root + hub changelogs; FEAT-H048 `6-done` with L4 rows in the same commit.
