# Session bridge — ADM-C built + closed (gate 2 + H036), stopped deliberately at the ADM-D threshold

**Date:** 2026-08-01 · **Wave:** Ferd · **Area:** A-ADM (Platform-Ops) — Cycles ADM-A/B/C all closed; **ADM-D deliberately NOT started** (Stefan's stop-point instruction)
**Follows:** [`2026-08-01_03_-_ADM-C-DECOMPOSED-OPENER-DONE-GATE1-CLOSED.md`](./2026-08-01_03_-_ADM-C-DECOMPOSED-OPENER-DONE-GATE1-CLOSED.md)

---

## READ THIS FIRST — what the next session must pick up

**Next: Cycle ADM-D (moderation + audit surfaces)** — the plan's last A-ADM cycle ([plan §cycle sequence](../hub-v2/phase-3-platform-ops-completion-plan.md), v6): ADM-10 queue over the C-D `content_reports` store, ADM-11 triage/resolve **with the DS-5 resolution kind through the registry + dispatcher** (the NTF-6 seam closes; the CB-1 dated deferral names this as the sanction-communication activation point), ADM-16 audit read surface per the AB-4 split shape (the `admin_audit_log` manifest entry is REWRITTEN in that cycle's PR — the export row's citation says so explicitly), all under the AB-7 console shell. Start with the ADM-D board + decomposition; the ADM-C substrate is fully in place beneath it (all ten PC021 contracts live, every mutation audited with dotted `member.*`/`platform_admin.*` actions).

**After ADM-D: the A-ADM area gate**, whose owed list is accumulating and untouched: ADR-U043 perf pass (incl. `/admin`, `/admin/groups` + detail, `/admin/members` + detail — all built now) appended to the [perf ledger](../reference/PERF-MEASUREMENT-LEDGER.md) · Stefan's live walk · the W12 per-RPC roll-up **with the GC-14 composition column** · the E2E-at-schema-close process question · the 398-BFF-telemetry-sites adoption criteria (H034 notes) · the deferred-five presentation in plain language (ADM-7/13/14/15/17 — the register already sits in the plan, each row converting to an Eid backlog entry per Stefan's call) · the AB-6 FULL anatomy audit carrying the ADR-U052 absorption. The plan's exit checklist (§Exit checklist) is the canonical list.

**Watch-items (hard-won this session, new or re-confirmed):**
1. **The sibling-assertion sweep caught its FOURTH instance** — `account-lifecycle-self-service.test.ts` S8a pinned the retired `admin_exit_user_from_platform`'s NON-existence (count 0) and would have gone red the moment gate 2 applied; adapted in the gate PR alongside W1f's `/manage_all_groups|Unauthorized/i` pin. The class is now four-for-four on "caught only by the sweep, never by the author's own tests."
2. **The STORY-3 no-op guard must compare BOTH the flag and the would-be origin** — the COR-C W1 pause→hold *conversion* (origin `member`→`admin` on an already-off row) is a real transition the W1b/W1d producer cells depend on; a naive `is_active`-only guard breaks them. Shipped shape: refuse only a write that changes nothing.
3. **Last-admin floor testing on the shared dev DB:** the founders can't be thinned for real; the gate-2 suite arranges the last-admin state inside a **rolled-back forged-claims transaction** (`set_config('request.jwt.claims', …, true)` + thinning DELETEs + the real contract call) — the verbatim refusal surfaces through `runAdminSql`'s error and the rollback restores the founders. Reusable technique for any floor/last-row contract.
4. **`ConfirmModal` carries no children** — type-to-confirm ceremonies (H029 class) are bespoke inline panels (`DeleteAccountCeremony` precedent; H036's hard-delete panel follows it). Don't fight the modal.
5. **Test FIMs are consented** (`createTestUser` simulates a consented signup), so a raw hard-delete fixture needs its consent rows purged via the trigger's sanctioned `app.consent_erasure_in_progress` controlled-teardown path first — the 23503 RESTRICT is doing its job.
6. **Backfill filename discipline re-confirmed:** the TASK-DOC-008 verification sweep caught six mis-guessed PD spec filenames and two migrations the task's own enumeration had missed — `ls` and headers, never memory, then a mechanical link + attribution check.

## One-paragraph state

Gate 2 ran the full rhythm in one session: red 26/28 demonstrated against the live substrate (the two greens exactly the labelled-green invariants) → migration `20260801190000` (four re-issues moving the family to the typed `is_platform_admin()` gate + audit writes + the no-op guard; four new contracts — the exit walk re-derived leg-for-leg from `delete_own_account` with the erasure legs deliberately absent, targeted removal, grant with the explicit role-row insert, revoke letting the floor triggers refuse verbatim) + manifest entries + the two sibling adaptations, all in PR #372, held with red evidence and apply commands → named approval ("merge 372 + apply gate 2") → applied + repaired → post-apply admin 72/72, account 83/83, platform 23/23. H036 followed fuller-auto on "when green, go on with ADMC-02": three unit suites red pre-implementation → wrapper + eleven BFF routes + `AdminMembersList`/`AdminMemberDetail` + pages + dashboard card → 55/55, full unit 1117/1117, gates zero-exception, `next build` green, E2E 6/6 first-run (labelled test-after), docs close riding the same PR #373 (both features `6-done`, L4 rows, three changelog registers — hub's member-facing changelog skipped per the H035 precedent). Post-cycle, on Stefan's "continue until ADM-D would start, stop before": TASK-DOC-008 closed (nine backfill entries, register note removed, 31/31 span migrations mechanically attributed) and the plan bumped to v6; ADM-D untouched.

## Decisions made this session

1. **Named approval honoured verbatim:** gate 2 merged + applied only on "merge 372 + apply gate 2"; H036 proceeded fuller-auto on "when green, go on with ADMC-02" (no schema, no carve-out).
2. **`viewer_is_self` is BFF shaping** (detail route, via `get_current_user_profile_id()`) for the self-revoke ceremony copy — presentation-only under ADR-U038; recorded in H036's Implementation notes.
3. **Terminal members keep only Hard delete** (STORY-2's rule realized): revoke-admin is also hidden on a decommissioned admin — the row survives, the rail doesn't offer it.
4. **Stop-point set by Stefan:** everything ripe before ADM-D was discharged (TASK-DOC-008, plan v6, this close); ADM-D decomposition explicitly not begun.

## PR ledger

#372 PC021 gate 2 (held → named approval → applied `20260801190000` → merged) · #373 H036 build + docs close (fuller-auto) · this session's close PR (TASK-DOC-008 backfill + plan v6 + bridge, fuller-auto).

## Verification at close

PC021 gate-2 suite 28/28 · admin integration domain 72/72 · account domain 83/83 (adapted W1f + S8a green) · platform conformance 23/23 · full unit 1117/1117 · `next build` green · E2E admin-members 6/6, leak delta 0 · migrations `20260801170000`/`180000`/`190000` applied + repaired · FEAT-PC021 + FEAT-H036 `6-done` (frontmatter + governance §L4 + Hub §L4 + both READMEs, in sync) · TASK-ADMC-00/01/02 + TASK-DOC-007/008 `done` · platform-core CHANGELOG register continuous PC001 → ADM-C, no register note, all 31 span migrations attributed, links resolve.

## Close ritual

- [x] Session bridge (this file)
- [x] `npm run dashboard` — refreshed at close
- [ ] doc-health-check — not owed (mid-area; no cross-cutting restructure; the changelog backfill's links verified mechanically in-session; next cycle-boundary run verifies)
- [x] Discovery sweep — run at close (see commit)
- [ ] ADM-C retro — folds into the area retro at the gate (standing decision)
