# Session bridge — A-ADM opened: board settled, Cycle ADM-A built + closed, ADM-B decomposed, hygiene block done

**Date:** 2026-08-01 (session started 2026-07-31) · **Wave:** Ferd · **Area:** A-ADM (Platform-Ops, sixth and last Phase-3 area) — Cycle ADM-A CLOSED, Cycle ADM-B mid-flight (hygiene done, build next)
**Follows:** [`2026-07-31_01_-_COR-C-EXECUTED-FIVE-PRS-HELD-FOUR-MERGED.md`](./2026-07-31_01_-_COR-C-EXECUTED-FIVE-PRS-HELD-FOUR-MERGED.md)

---

## READ THIS FIRST — what the next session must pick up

**Next: TASK-ADMB-01 — build [FEAT-PC020](../../platform/core/features/FEAT-PC020-group-administration-contracts.md) red-first, held at the schema gate.** The hygiene block is DONE (E2E 93/93 twice consecutively, leak instrument live at delta 0); both 4-ready specs ([PC020](../../platform/core/features/FEAT-PC020-group-administration-contracts.md) ↔ [H035](../../products/hub/features/FEAT-H035-group-administration-view.md)) carry the payload walk and the substrate verifications. Build order: PC020 (one migration, five `admin_*` SECURITY DEFINER contracts, NO new tables) → held PR with red evidence + apply commands → on the named nod + apply → FEAT-H035 (TASK-ADMB-02) on the H034 shell → cycle close (6-done notes, summaries, same-day register annotations).

**Watch-items (hard-won this session):**
1. **Run hub tests from `hub/`** — from the repo root a different jest config babel-parses them (`import type` explodes; looks like a broken suite, is a wrong CWD).
2. **The last-Steward wall holds even for service-role SQL** (`prevent_last_leader_removal`). Deletion path for groups: journeys-then-group-row, CASCADE does the rest (`cleanupE2EGroup`); reassignment composes `assign_member_role`/`can_assign_role` — a refused composition is a finding, never a bypass.
3. **PC020's suspend guards:** `groups.status` CHECK admits `'suspended'` with ZERO producers today; sibling-assertion grep candidates are the status-reading contracts + GRP-5 badge tests.
4. **One dev-DB session at a time; never two integration suites concurrently.** Full integration ≈ 19 min; E2E sweep ≈ 5.5 min (needs `npm run dev` on :3000).
5. **profile.spec STORY-4 flaked once mid-session, passed both final sweeps — watched, not fenced.**

**Owed at the A-ADM area gate (accumulating):** ADR-U043 pass (incl. `/admin` + `/admin/groups`) appended to the [perf ledger](../reference/PERF-MEASUREMENT-LEDGER.md) · Stefan's live walk · W12 per-RPC rows **with the GC-14 composition column** · the E2E-at-schema-close process question (full E2E joins post-apply verification when a migration changes surface-reachable behavior — the COR-C fallout lesson) · the 398-BFF-telemetry-sites adoption-criteria question (FEAT-H034 notes) · **the deferred-five restate (ADM-7/13/14/15/17 — Stefan's standing ask, plan §Deferred register)** · the AB-6 FULL anatomy audit before Phase-4 cutover. **doc-health-check is owed** (ADM-A was a cycle boundary; not yet run) — run it at the ADM-B close or next boundary. **ADM-C board question queued:** does suspend/reassign notify affected members (V3)?

## One-paragraph state

The area opened with the design session Stefan asked for: kickoff sweep, an eleven-row board settled "go with recommended" (+ the standing rider: restate the five AB-8 deferrals at area close — memory + plan + checklist all carry it), and the completion plan (now v4). **Cycle ADM-A built and closed same-day** (PRs #352–#358): the manifest four-way PC split + `admin_*→PC-4` pin (GC-13/AC3-O5 CLOSED), the V4 telemetry sink (`telemetry_events`, never-raises recorder, 90-day prune, admin-gated statistics — migration 20260731180000), the durable auth audit (`record_auth_event`, all four Hub callers wired, farewell persists BEFORE the erase — 20260731190000), the gated `/admin` dashboard, V4 spec reconciled, perf ledger seeded, TASK-OBS-01 closed, AC3-O6/O7 CLOSED. **[ADR-U052](../../architecture/decisions/ADR-U052-telemetry-sink-and-analytics-posture.md) Accepted** (#359). Verification at close: unit 1068/1068 · integration 65 suites 761/761 post-apply · `next build` green. The gates caught three real things first-contact (outer-ring → the telemetry-server module split; consent append-only → the S2 fixture became the real farewell; the sweeps → latent COR-C fallout: 7 unit + 4 E2E menu-locator adaptations labelled found-not-caused). **ADM-B decomposed** (#360, nodded): PC020 ↔ H035, substrate verified (`'suspended'` producer-less; reassign = exit from caretakership). **The hygiene block closed** (#361): TASK-INT-05 (45 caretaker relics retired — grew 39→45 live during this session; teardown throws, deliberately; before/after instrument in the Playwright globals) + TASK-DBT-02 (four canonical-wins adjudications, incl. the fake transient: 398 platform-wide grants in one `.in()` URL until undici refused).

## Decisions made this session

1. **The area board AB-1a..AB-8, all as recommended** (Stefan 2026-07-31) + the deferred-restate rider (2026-07-31). Full board + deferred register: [the plan](../hub-v2/phase-3-platform-ops-completion-plan.md).
2. **ADR-U052 Proposed → Accepted** (Stefan named, 2026-08-01, #359); TASK-DBT-02 planned into ADM-B with it ("plan together").
3. **PC-split judgment calls** recorded in `ownership.manifest.json` `functionsNote` (is_platform_admin→PC-1, actor primitive→PC-3, consent/export→PC-4, notify_*→PC-3, …).
4. **E2E teardown refusals THROW** (the TASK-INT-05 scope call, decided against the swallow — the platform's own last-Steward wall forced the better path).
5. **Four DBT-02 adjudications** (canonical-wins, recorded inline at each spec): /groups answer path (W-04) · asks-split intended (premises reconciled in two summary rows) · joined Gracy copy · the `.in()` URL ceiling fixed structurally.
6. **FEAT-PC019 caller strings corrected:** live namespace is `auth.sign_in` / `account.created` / `identity.transcended` / `mist.explicit_erase` (the register's earlier prose was off the code).

## PR ledger (all merged unless noted)

#352 decomposition ADM-A (held→nodded) · #353 manifest split · #354/#355 schema gates (held→named approvals, migrations applied) · #356 S2 real-farewell · #357 H034 surface+wiring · #358 docs tail · #359 ADR-U052 Accepted · #360 ADM-B decomposition (held→nodded) · #361 hygiene block.

## Close ritual

- [x] Session bridge (this file)
- [x] `npm run dashboard` — refreshed at close
- [x] Discovery sweep — run at close (see commit)
- [ ] doc-health-check — **owed** (cycle boundary passed mid-session); run at ADM-B close or next boundary
- [ ] ADM-A/ADM-B retro — fold into the area retro at the gate (cycles are running same-day; per-cycle retros would outpace the work)
