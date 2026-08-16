---
id: TASK-H046-1
title: The hat opens the forum — banner, wielded composer with named confirm, Group badges, and the hat-staleness loop
status: done — built and verified 2026-08-16 (red-first 18 red / 2 labelled guards -> 23/23; unit tier 176 suites 1485/1485; wielded E2E journey green beside the untouched forum journey; lint 0 errors; next build green). Two rulings recorded (wielded surface read/post/reply only; STORY-4 narrow mechanism). FEAT-H046 6-done — no schema, fuller-auto merge
assigned_to: claude
priority: high
feature: FEAT-H046
owner: hub
wave: unassigned
cycle: 2026-08-16 session (same-day follow-on to TASK-PD019-1's gate)
depends_on: [TASK-PD019-1]
estimated_hours: one focused session (the spec's appetite)
---

# TASK-H046-1 — wielded forum affordances (all four stories)

One task for the whole feature: STORY-1 (wielded read + banner), STORY-2 (wielded composer/reply with confirms naming the wielding), STORY-3 (Group badges on `kind`), STORY-4 (hat staleness through PD020's delivery).

## Build map (mechanism facts pinned 2026-08-16, this session; two calls ruled by Stefan)

- **Data flow:** the group page already owns `actingAs` + the substitution permissions (H018); `GroupForumSection` gains an `acting` prop (`{groupId, name, permissions}`), passed only when a hat with standing is selected. The BFF forum routes pass `p_acting` through to the PD019 contracts (`?acting=` on GET, `acting` in POST bodies) — plumbing only, every gate substrate-side.
- **Cache honesty:** the forum session cache keys by `(group, acting)` — a wielded view and the personal view never share a peek; `dropGroup` drops every keyed view of the group.
- **Wielded affordance set (RULED, Stefan 2026-08-16): read/post/reply only.** Under a selected hat the composer and reply gates key on the hat's permissions; edit/delete/moderate/report affordances hide until "Myself" — pure substitution, nothing dead-ends against a server refusal (a wielded post is editable by no one, the PD019 v1 posture).
- **No optimistic wielded state** (spec rabbit hole): wielded post/reply confirm → submit → drop cache → re-read.
- **42501 verbatim-faithful (STORY-2 AC):** `mapForumError` passes the substrate's limb-naming 42501 copy through (the `mapForumOwnMutationError` window precedent); generic 42501s keep "Not allowed".
- **STORY-4 wiring (RULED, Stefan 2026-08-16): the narrow mechanism.** The page re-reads the acting slice on `NOTIFICATIONS_CHANGED_EVENT` (the coalesced hint-arrival event) and revalidates the selected hat there — a hat that lost standing falls back to "Myself" with honest copy. The existing `refreshNavigation` → full re-read path is untouched and gets the same revalidation for free. Deliberate narrowing of the sketch's "hint → refreshNavigation": firing the house full-re-read event per hint burst would make every notification a platform-wide page re-read, a blast radius PD020's expansion amplifies.
- **Badges:** the H018 open-set badge posture (`GroupDetailPanel` kind-badge precedent) — `kind: 'group'` renders the violet "Group" badge; `'person'`/absent render as today; an unknown kind renders its raw value, never crashes.

## Acceptance check

FEAT-H046 STORY-1..4 ACs, red-first at the unit tier (the section has an existing harness; new cells in `GroupForumSection.acting.test.tsx` + attribution/staleness helpers) with the wielded journey at E2E: banner "Viewing as {A}" on the wielded read; hat-insufficiency copy naming the hat (never the malfunction fallback); confirm "You are posting as {A}" before a wielded post; post renders attributed to A with the Group badge; "Myself" byte-identical to today; hat revalidation drops a stale hat without reload (unit) and the safe floor stays server-side (already-proven guard). Route-policy conformance green; `next build` green before 6-done (the type gate); root + hub changelogs.
