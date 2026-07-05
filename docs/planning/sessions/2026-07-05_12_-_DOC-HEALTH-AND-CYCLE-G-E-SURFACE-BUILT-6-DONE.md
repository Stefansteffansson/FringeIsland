# Session bridge — doc-health cleared, Cycle G-E Surface built `6-done`; Groups arc closed, two PRs held for nods

**Date:** 2026-07-05
**Session type:** Doc-health run (deferred from `_11`) + build session (`feature-development`) — FEAT-H017 shipped, closing Cycle G-E and with it the Groups area's paired-cycle arc (G-A through G-E). A post-6-done platform copy fix was found at build and prepared through the schema gate.
**Status:** `main` carries H017 merged (PR #86). **Two PRs held for Stefan's nods:** [#85](https://github.com/Stefansteffansson/FringeIsland/pull/85) (doc-health — touches `doc-health-check/SKILL.md`, the steering-file carve-out) and [#87](https://github.com/Stefansteffansson/FringeIsland/pull/87) (the `leave_group` copy fix — schema gate, **dev-DB apply pending**, see Findings 4/5).
**Participants:** Claude (autonomous; no new design decisions — the recorded H017 deviation and the copy fix both follow existing locks/precedents).

---

## Doc health (on-demand, post-G-E-platform — deferred from bridge `_11`)

```
Doc Health Check — 2026-07-05 — on-demand (migrations 20260705072252 + 20260705090321, ADR-U040, PC014 6-done, H017 teed up)

Sections run:
1.5  Architectural drift  — invite_by_email/ADR-U040 + dropped-dispatch sweeps: 6 drift sites found / 6 fixed in-place / SKILL.md table fed (email-as-membership row)
1.6  Unfiled deviation markers — clean (zero markers in hub/ + supabase/)
2    Schema drift          — dropped artifacts (handle_notification_action, _handle_stewardship_nomination_action, groups_delete): 4 active-doc sites annotated (substrate-audit x2, V3 notifications §3, communication.md §6); extensions SPEC Step-2 block left as a dated record
3    Path + README sync    — ADR-U040 indexed; feature READMEs/§L4 rows verified clean
5    Maturity consistency  — PC014 6-done notes filled; PC012 post-6-done section present; H017 5-in-cycle tasks present — clean
8    Feature-inventory     — org-spec + hub §L4 rows all correct — clean
10   Graduation tracker    — ADR-U040 not discovery-sourced; no row owed — clean
Skipped: 1, 3.5, 3.6, 3.7, 4, 6, 7, 9 (no renames/archivings/doc deletions/snapshots/wave transition/entity or CLAUDE.md changes since last run)

Critical findings: none (all six drift sites were annotation-grade; fixed in-place)
Table updates: Section 1.5 + email-as-membership invitation row (ADR-U040, 2026-07-05)
```

Fixes (PR #85, held): substrate-audit rows annotated with the PC014 outcome + the ADR-U040 retirement pointer on `pending_email_invitations`; Groups plan G-E row records the platform half `6-done` + dropped-not-neutralized; V3 §3 + communication.md §6 realized-slice claims corrected; **FEAT-H015 got its post-6-done ADR-U040 pointer** (email-as-membership retired going forward; surface live until the MEM-2 rebuild).

## What shipped (merged — PR #86)

**FEAT-H017 — Cycle G-E Surface half, `6-done`.** The two G-D refusals became flows. Sole-Steward Leave 409 opens the **transfer choice** in place (ordered nominate pick-list from the existing member list / hand-to-DeusEx as the styled ADR-U019 last resort); the nominee answers on `/groups` (the scoped A-NTF-seam read — `GET /api/me/nominations`, Edge+`dub1`; accept relays "you are now the Steward", decline relays "passed on" never naming the routing); **Close** renders only for the last member, **Delete** only for `delete_group` holders (danger-styled explicit ConfirmModal). Four intents — Leave/Remove/Close/Delete — never conflated. No migration.

- Evidence: unit **385/385** (43 new, red-first staged: fetchers → routes → flows), integration **262/262**, **E2E 53/53** (5 new journeys on 8 dedicated spec-created FIMs / 4 groups, own contexts; tombstones + the remaining member's durable `group_deleted` row asserted substrate-side), `next build` + lint clean. Bundled Cycle G-E CHANGELOG entry written (PC014 + H017 — the G-C/G-D precedent).
- **Recorded deviation:** `DELETE /api/groups/[id]` rides the existing **Edge** detail route file (one runtime per route file; the in-file "PATCH — single RPC, Edge-safe" precedent), against the spec's blanket Node-mutation line.
- **Additive BFF key:** the my-permissions read now carries the caller's contract-resolved `member_group_id` (payload-driven pick-list self-exclusion, no extra fetch) — route/client/page pins updated red-first.

## Findings worth carrying

1. **PC013's `leave_group` last-member refusal copy went stale the moment PC014 shipped** — *"closing a group is not yet available"* renders beside the working Close affordance. Copy-only replacement-in-place prepared red-first (exact stale string received) as migration `20260705115243` on PR **#87**, task TASK-PC013-03 at `review`. General lesson: **a cycle that turns a refusal into a flow must sweep the refusal copy that pointed at the absence.**
2. **E2E first-sweep flake:** `entry.spec`'s `afterAll` anon-user cleanup failed once in the full sweep (attributed to the last test), green in isolation and on the full re-run (53/53). The no-reaper anon-user accumulation gap (ADR-U033 pending build) makes that cleanup contention-prone under a full sweep — watch for recurrence; the reaper retires it.
3. **The migration apply was permission-gated this session** (auto-mode classifier denied the dev-DB apply). Respected, not worked around: #87 ships file + red test + task, and the apply command rides the gate nod. Future build sessions should expect applies to need the interactive prompt or the nod.
4. **Groups plan G-E row still says "the build session is next"** — its file is touched by PR #85, so the Built-`6-done` row update was deliberately NOT made in the build PR (cross-PR conflict). Apply it in a small commit after #85 merges.

## Next session

1. **The group-as-actor design session at the G-E → G-F boundary** (PC011 Open Q1 / G-29 — *who may wield a group's agency*), **before G-F specs are authored**. This gate is now reached: G-E is closed.
2. On Stefan's nods: merge **#85**; for **#87** apply `20260705115243` (`node scripts/apply-migration-temp.js …` + `repair --status applied`), run `npm run test:integration:groups` green, merge. Then update the Groups plan G-E row to **Built `6-done` 2026-07-05** (finding 4).
3. Groups area gate / retro candidate: the paired arc G-A..G-E is complete; the area retro + task cleanup (TASK-PC014-* / TASK-H017-* stay until the retro) and the area-gate carry-forward checks (DS-3 freezes at the Journeys gate; DS-4/DS-5 `pending-*`; MEM-9 at Communication; IDN-10 cascade confirmation) are queued there.

## Standing / parked (unchanged from `_11` unless noted)

- **ADR-U040 referral-model rebuild** (retire `invite_by_email`, spec the referral link/code) — downstream decomposition, not yet scoped; CQ-014/CQ-010 related.
- **Pre-partition SECURITY DEFINER grant sweep** — mechanism known (revoke names `anon`); three confirmed instances; #87 re-asserts the posture on `leave_group` in passing.
- Area-gate carry-forwards; G-36/IDN-10 + org-spec §5 doc-health finding by cooldown; IDN-12 + perf T2 parked; `test:integration:rbac` legacy-script cleanup at cooldown; grant-toggle audit gap; logo pick.
- **Launch checklist (unchanged):** custom SMTP before cohort onboarding; per-IP sign-in headroom for venue events; dev auth limits raised deliberately.

## Close-down note

Doc-health **was** run this session (the `_11` deferral cleared). Dashboard refreshed. No background processes left (Playwright owned and killed its dev servers). Branches: `main` synced through PR #86; `chore/doc-health-post-ge-platform` (#85) and `fix/pc013-leave-last-member-copy` (#87) live, awaiting nods.
