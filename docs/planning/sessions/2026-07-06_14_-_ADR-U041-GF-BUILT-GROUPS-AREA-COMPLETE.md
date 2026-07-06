# Session bridge — ADR-U041 landed, Cycle G-F built both halves, the Groups area's build scope complete

**Date:** 2026-07-06
**Session type:** The full G-E → G-F arc in one continuous session: decision-board prep (2026-07-05, PR #92) → the group-as-actor **design session run in-conversation with Stefan** → ADR-U041 (PR #93, nodded) → G-F decomposed (PR #94) → FEAT-PC015 built through the schema gate (PR #95, nodded) → FEAT-H018 built and closed (PR #96).
**Status:** Everything merged; `main` clean and synced through PR #96. **No PRs held, nothing dangling.** Dev DB current through migration `20260706120000`.
**Participants:** Stefan (four design calls + the chain question that became a fifth clause; two gate nods) + Claude.

---

## Decisions (the design session — recorded in full in ADR-U041 + the decision board's Decisions section)

1. **Representation is a permission** — `act_as_group`, held within the acting group, Steward-template-seeded, per-group widenable. Stefan probed "everyone in A wields" and the transitive reading; both rejected on the ADR-U028 rails (the resolution: *"everyone" can be a per-group default-grant, never a platform law*).
2. **Wielding semantics** — substitution; attribution to the group with an audit-level human trace; outward-only; and **no chaining — the wielding actor is always a personal group** (born from Stefan's A-in-B-in-C question; both resolution depth and representation depth are 1).
3. **Depth stays 1** (D5 reaffirmed; the wielding rule worded depth-agnostically; OQ-6 untouched).
4. **DeusEx / system groups are not nominatable**; v1 goes stricter — **persons only** (engagement-group nominees deferred). The pre-migration contract *accepted* a DeusEx nominee — demonstrated red before the fix.
5. **System members visible but never people** — typed payload marker, pick-list exclusion, honest badges, non-system counts (the Gracy case: the last human alone with the caretaker now sees Close — verified E2E).

## What was built

- **FEAT-PC015** (PC-3, `6-done`, schema gate PR #95): the key (catalog **39→40** — the remembered 44 was legacy) + seeds + **Steward-instance backfill**, `invite_group`/`search_invitable_groups`, the wielded `respond_to_group_invitation`/`leave_group_as_group`, acting-context reads, `nominate_steward` + `get_group_detail` replaced in place, the `status_changed_by_group_id` audit column. No new table/triggers/policies. 26/26 contract integration (20 demonstrated red).
- **FEAT-H018** (Hub, `6-done`, PR #96): real act-as contexts with substitution named, invite-a-group, the wielded memberships panel (confirms name the wielding; wielder-only, no fake doors), kind badges + non-system counts/Close, persons-only pick-list. Unit **408/408**, integration **288/288**, E2E **54/55** + the 2 new journeys; `next build` clean.
- **The Groups area's build scope is complete:** G-A..G-F all `6-done`; MEM-9 is the area's only forward-seam (D2).

## Findings / watch items (new this session)

- **`profile.spec` STORY-4 flakes under the full E2E sweep only** (green 3/3 isolated) — joins the `entry.spec` anon-cleanup watch item.
- **`docs/platform/core/CHANGELOG.md` has drifted** — only PC001 ever landed there (PC002–PC015 ride the root CHANGELOG's bundled entries). Retro item: retire or backfill it.
- **The G-29 shorthand ambiguity is fixed at the sources this session touched** (decision board DB-7: depth = **OQ-6**, wielding = **PC011 Open Q1**, "routed via G-29" as provenance only; the plan's MEM-10 cell corrected). Bridges stay historical.
- **A PC014 carried-forward test asserted the reversed canon** (any-active-member nominee); amended same-day with a Post-6-done note in FEAT-PC014 — a live example of why carried-forward greens need re-reading when an ADR lands.
- **Depth-1 visibility note** (recorded in H018's notes for the eventual OQ-6 discussion): a wielder who is not personally a member of a private context group cannot browse it; the wielded group's own page is the wielder's window. Honest by design, not a defect.
- `test:integration:rbac` confirmed a phantom path (directory gone; coverage lives in the groups suites) — already the parked cooldown item; only the TASK file's verification line was corrected.

## Next session — the Groups area retro

**Start with:** *"run the Groups area retro — read bridge 2026-07-06_14"*. Task-file cleanup rides it (TASK-PC010..015 + TASK-H013..018 stay in `docs/planning/backlog/tasks/` until the retro commits, per L5 lifecycle). Feed it: the six cycle rows in the plan (each carries its substrate-audit-vs-premise deltas), the watch items above, and the standing G-36/IDN-10 + org-spec §5 by-cooldown items. After the retro: **the Journeys area** — the DS-3 enrolment-summary slot, `group_closed`/`group_archived` freeze re-verification, DS-4/DS-5 `pending-*` re-entry — and note **JRN-4 (enrol an engagement group in a journey) is now buildable against `get_acting_contexts()` + the wielding walk** when its cycle comes.

## Standing / parked (carried from `_13`, updated)

ADR-U040 referral rebuild (unscoped); pre-partition SECURITY DEFINER grant sweep (mechanism known — PC015 re-confirmed the revoke-anon-explicitly posture); area-gate carry-forwards; G-36/IDN-10 + org-spec §5 by cooldown; IDN-12 + perf T2 parked; `test:integration:rbac` cleanup at cooldown (phantom confirmed); grant-toggle audit gap; logo pick; launch checklist (SMTP, per-IP headroom, dev auth limits); platform-core CHANGELOG disposition (new).

## Close-down note

`main` synced (PRs #92–#96 all resolved), no branches beyond `main`, no background processes, dashboard refreshed (631 files indexed). Migration history: dev DB current through `20260706120000`. E2E flake watch: `entry.spec` (standing) + `profile.spec` (new, once).
