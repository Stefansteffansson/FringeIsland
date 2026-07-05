# Session bridge — G-E gates executed, flows live-tested (first real DeusEx fallback), group-as-actor design session teed up

**Date:** 2026-07-05
**Session type:** Continuation close of the `_12` session — Stefan's gate nods executed, first live testing of the G-E flows (Stefan + Gracy), one post-6-done fix shipped. No new design decisions; one design question **added to the G-F docket**.
**Status:** Everything merged; `main` clean and synced through PR #90. **No PRs held, nothing dangling.** Next session is the **group-as-actor design session prep** (see below).
**Participants:** Stefan (gate nods on #85/#87; live testing with Gracy; the two UX findings) + Claude.

---

## What happened after bridge `_12`

1. **PR #85 merged** (doc-health fixes, steering-file carve-out nodded).
2. **PR #87 gate executed and merged:** migration `20260705115243` applied to dev + repaired (the copy-only `leave_group` replacement — the last-member refusal now says *"close the group instead"*); groups integration domain **157/157** green; TASK-PC013-03 → `done`.
3. **PR #89:** Groups plan G-E row flipped — both halves `6-done`; **the paired arc G-A..G-E recorded complete**.
4. **Live testing (Stefan as Steward, Gracy as nominee, "Nya gruppen #3"):** nomination sent, Gracy declined → **the first real decline→DeusEx fallback fired exactly as designed** (ADR-U019): DeusEx became member + Steward, the nominator departed, the group persisted. Confirmed correct against the PC014 contract and the E2E oracle.
5. **Two live-testing findings → PR #90 (merged, red-first, unit 386/386, leadership E2E 5/5 re-run):**
   - **Transfer-affordance gating:** "Hand over leadership" rendered for every not-alone member (Gracy got a door the contract always refuses). Now keyed off the my-permissions **`assign_roles`** payload key — permission key, never a role name; the substrate still guards sole-Steward-ness. Verified live: Gracy no longer sees it.
   - **Honest all-decline copy:** the nomination confirm + offer-is-out notice now name the fallback (*if every nominee declines, the group passes to FringeIsland stewardship and you leave*) so the designed outcome never surprises.
6. FEAT-H017 carries a **Post-6-done fixes** section recording both; root + Hub CHANGELOGs updated.

## Next session — prepare the group-as-actor decision board (the G-E → G-F gate)

**Start with:** *"prepare the group-as-actor decision board — read bridge 2026-07-05_13 for the docket"*. This is prep for **Stefan's design session** (parked 2026-07-04 by Stefan; decide before G-F specs are authored; likely an ADR, ADR-U028 territory). Build the opener from **clean canonical reads** (delegated-fact discipline: canonical source + file:line for every claim):

- **The core question:** *who inside group A may wield A's agency inside group B* — FEAT-PC011 Open Q1 (the act-as selector ships honestly v1, "Myself" only, FEAT-H014).
- **The depth question:** G-29 in `docs/ecosystem/how-we-work/gaps.md` — transitive resolution beyond depth 1 (G-F builds depth-1 only, D5).
- **Governance frame:** ADR-U028 (governance by scope); the roles core (`docs/ecosystem/universe/roles/`).
- **The oracle:** legacy group-as-member + group-as-actor behaviour (`docs/planning/hub-v2/behaviour-inventory.md` §A-GRP).
- **New riders from today's live testing:** (a) should **DeusEx be nominatable** as a stewardship successor? (b) how do **system members** behave in member-facing flows generally (pick-lists, counts, member lists — the payload carries no system-member flag; name checks are out by rule).
- **Output shape:** a full decision board (answered / open / defaulting + recommendation per item — the house all-at-once discipline), as a session opener under `docs/planning/sessions/openers/`.

After the design session: **G-F decompose + build** (or an explicit defer — it floats, value-light), then the **Groups area retro** (task-file cleanup rides it), then the **Journeys area** (DS-3 enrolment-summary slot, `group_closed`/`group_archived` freeze re-verification, DS-4/DS-5 `pending-*` re-entry).

## Standing / parked (unchanged from `_12`)

ADR-U040 referral rebuild (unscoped); pre-partition SECURITY DEFINER grant sweep (mechanism known); area-gate carry-forwards; G-36/IDN-10 + org-spec §5 by cooldown; IDN-12 + perf T2 parked; `test:integration:rbac` cleanup at cooldown; grant-toggle audit gap; logo pick; launch checklist (SMTP, per-IP headroom, dev auth limits).

## Close-down note

`main` synced (PRs #85–#90 all resolved), no branches beyond `main`, no background processes, dashboard refreshed. Migration history: dev DB current through `20260705115243`. E2E flake watch stands (entry.spec anon-cleanup `afterAll` under full sweeps — once, not reproduced).
