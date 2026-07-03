# Session bridge — Groups Cycle G-A decomposed (FEAT-PC010 ↔ FEAT-H013, first PC-3 feature; decision board settled)

**Date:** 2026-07-03
**Session type:** Decompose session (`ecosystem-decomposition`, L4) — same session as the retro + kickoff (bridge `2026-07-03_06`).
**Status:** Specs `4-ready`, ready for the build session. **PR #59 (retro + task sweep) is still OPEN** — the permission classifier requires Stefan's explicit merge nod for the 44-file deletion (his terse "go" wasn't accepted as specific enough); merge it with `gh pr merge 59 --squash --delete-branch`.
**Participants:** Stefan + Claude

---

## Decision board settled ("go", 2026-07-03)

All recommendations on the [Groups plan](../hub-v2/phase-3-groups-completion-plan.md) board accepted: D2 (18-build/1-seam — MEM-9 the only forward-seam), D3 (minimal PC-3 search primitive at G-C, DS-6 re-home seam), D4 (invitation record + auto-claim at G-C, dispatch = V3 seam), D5 (MEM-10 depth-1), D6 (**task files return** for every 4-ready feature at build), D7 (G-36 landed; parked IDN-10 specs by next cooldown), D8/D9/D10 as defaulted.

**D1 amended by a disk finding:** the perf backlog's **P2 was already realized** — the 2026-07-02 ADR-U038 tranche landed `get_member_groups()` (migration `20260702130100`) as exactly the single consolidated SECURITY DEFINER RPC P2 called for, and `GET /api/groups` makes that one call (verified against the route file + the dev DB function definition). [Perf backlog corrected](../hub-v2/perf-hardening-backlog.md); the boundary NFR bet is **P3a alone** (RLS `(select auth.uid())` sweep + 14 FK covering indexes + duplicate-policy consolidation prep), executing alongside the G-A build as its own hardening migration through the schema gate.

## Cycle G-A decomposed

- **[FEAT-PC010](../../platform/core/features/FEAT-PC010-group-creation-and-settings-contracts.md)** (`4-ready`) — **the first PC-3 Organisation feature spec.** Three own-actor SECURITY DEFINER contracts over existing substrate (no new table): `create_engagement_group()` (atomic group + role instances + creator membership + Steward binding — ADR-U016 composed invariant; FIM-only, suspended refused as decision-default), `get_group_detail()` (membership-or-public visibility, `P0002` no-existence-leak, member list per the independent visibility toggles, display-identity names, viewer `can_manage_settings` capability flag), `update_group_settings()` (permission-gated partial update; `status`/`group_type` not updatable). Plus the **ADR-U038 direct-write narrowing** on `public.groups` (today's broad legacy `authenticated` INSERT/UPDATE policies are the S1-class hole — un-bootstrapped creation and direct `status`/`group_type` flips must die at the substrate) and the **idempotent system-group seeding repair** (`FringeIsland Members`/`DeusEx` — the C3-1 fresh-DB concern). Actor = the four-hop personal-group primitive (P-O1; the PC008/PC009 `auth.uid()`-direct override deliberately NOT used — social fabric, not protective data rights). Open questions: default role materialisation (Q1), exact permission key from the 44-key catalog (Q2), member-list-visibility oracle check (Q3), narrowing shape (Q4) — all resolved at build/gate.
- **[FEAT-H013](../../products/hub/features/FEAT-H013-group-creation-and-stewardship.md)** (`4-ready`) — the Surface: create-group flow on `/groups` (no template picker v1), the `/groups/[id]` detail page (status badge vocabulary-tolerant; member list strictly as the payload provides; capability-flag-gated Edit affordance; 404 = house not-found, no-leak-consistent), the settings editor (partial update, the two visibility toggles independent with distinct copy), BFF routes (`POST /api/groups`, `GET /api/groups/[id]` Edge+`dub1`, `PATCH /api/groups/[id]`), content-free telemetry. No migration of its own.
- **§L4 reconciliation in the same batch:** organisation-specification §L4 (zero-state replaced — four capability rows now map to PC010), hub SPECIFICATION §L4 (H013 row + coverage note), both feature-index READMEs.

## Substrate facts verified this session (dev DB + disk)

`groups` columns confirm the §L3 rows map cleanly (`is_public` + `show_member_list` = GRP-3's two independent toggles; `name/description/label` = GRP-2; `status` = GRP-5). Real table names for specs: `group_memberships`, `group_role_permissions` (the area spec's §3 idealized names `memberships`/`role_permissions` differ — PW-1 schema-predates-partition; flag for a future spec-hygiene pass, not blocking). Role templates seed the four names (Member→Participant rename still deferred); four group templates exist; the system groups exist on dev incl. a `Mist` system group — the gap is active-migration seeding only. `public.groups` carries broad `authenticated` INSERT/UPDATE/DELETE policies (the legacy client-write surface) — PC010 STORY-4's target.

## Next session (build, `feature-development`)

1. **Platform first:** TASK files for FEAT-PC010 (D6 — task files are back), red-first integration tests, one migration (3 functions + narrowing + seeds + grants) → **schema gate: task status `review`, pause for Stefan's nod** (Platform Core + schema carve-outs; the gate asks the direct-caller question per GP3).
2. **P3a hardening migration** rides the same build session as its own migration + task through the same gate.
3. **Then the Hub half:** TASK files for FEAT-H013, red-first (route-unit → panel/page → E2E), `next build` type gate before 6-done.
4. Standing: merge #59 (nod pending); parked IDN-10 specs by next cooldown (G-36); IDN-12 parked; perf T2 parked.
