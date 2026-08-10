# Session bridge — the AB-6 full anatomy audit is EXECUTED; rulings A1/B1/C landed in-session

**Date:** 2026-08-10 (session 20) · **Wave:** Ferd · **Cycle:** none active
**Continues:** [`2026-08-10_03`](./2026-08-10_03_-_AB-REGISTER-PINNED-TWO-OF-EIGHT-HAD-DRIFTED.md) — executes the audit that bridge queued.

---

## READ THIS FIRST

1. **The audit AB-6 scheduled is DONE** — all four docket items closed, doc-health run inside it
   (clean), findings converted into gates. One canonical record:
   **[`2026-08-10-ab6-full-anatomy-audit.md`](../hub-v2/2026-08-10-ab6-full-anatomy-audit.md)**.
   The Platform-Ops exit checklist's last pre-cutover row is ticked; **Phase-4 cutover's entry
   condition is met once PR merges** (ruling D — the PR is HELD for Stefan's named nod; it touches
   three carve-outs: `docs/platform/core/`, an ADR amendment, and two steering-file edits).
2. **Three rulings were made by Stefan in-session and are already executed on paper:**
   **A1** — `has_permission`'s context-free Tier-1 arm is LAW (ADR-U028 Amendment 2026-08-10; anatomy
   sentence; pinned by `hub/tests/integration/platform/tier1-context-free-arm.test.ts`, **4/4 green**
   against the live substrate). **B1** — sealed threads get bounded admin sight
   ([TASK-SEAL-01](../backlog/tasks/TASK-SEAL-01-sealed-thread-admin-sight.md), the four bounds are
   part of the ruling; schema-gated cycle, slotting at Phase-4 planning). **C** — the
   registration-second-act guard is a schema-gate checklist line in `docs/platform/CLAUDE.md`.
3. **The anatomy pair moved:** stamp to **ADR-U052 + ADR-U051 A2 (2026-08-10)**, diagram
   **v2.6** (PC-1 box: feature flags out, telemetry sink in). Seven drift findings fixed — the
   register's three plus four new (the ADR index's missing U052 row; the diagram's PC-1 box; the
   core README's phantom "(to be written)"s; **the RD-B gate pass never appended its perf-ledger
   row**).
4. **Gates shipped by the audit:** doc-health Section 11 gains an **ADR-index completeness check**
   and a **measurement-ledger append check**; the **Tier-1 arm pin test** joins the platform
   conformance family; ruling C's checklist line binds at every schema gate.

## The ADR-U043 pass (docket item 2)

`/admin/roles` (built ADM-F, after the 08-02 measurement): deep-cold **5 417 / 5 359 ms**
box-visible across two windows (~1 % apart), provisioning-dominated (fan-out ~3.9 s) — the standing
labelled pre-launch exception extended, at the ~5.5 s A-NTF-era magnitude (one line for the Phase-4
cutover conversation, not an investigation). Warm fresh-context **415–518 ms box-visible, PASS
wide** — unlike the 08-02 pass's ceiling-hugging detail pages. Fixture torn down, residue 0/0/0.
Ledger updated with this row **and the backfilled RD-B row**.

**Audit honesty log** (in the record, §Audit verdict): window 1 ran at ~18 min idle (protocol miss,
disclosed, validated by window 2's ~1 % agreement); the pin test's first run leaked two test users
(wrong field, fixed) — purged via the consent-erasure bypass, residue-verified 0/0/0.

## Numbers at close

Pin test **4/4 green** (the only suite run this session — docs-and-audit end to end; no product code
changed, so no full-suite or `next build` claim is made and none is implied; last recorded state
stands from session 19: platform conformance 23/23, ownership unit 12/12). Dashboard refreshed
(**846** files). Deep-cold protocol run to completion with teardown verified. **One PR: HELD** (see
below). Discovery worktree was clean and synced 0/0 at open.

## Standing items

- **Phase-4 cutover is NEXT** — its entry condition (the AB-6 audit) is met, pending ruling D.
- **[TASK-SEAL-01](../backlog/tasks/TASK-SEAL-01-sealed-thread-admin-sight.md)** (new) — B1's
  bounded sealed-thread admin sight; schema-gated cycle at Stefan's slotting.
- The carried list, unchanged otherwise: G-3 journeys deferral · `TASK-RDA-03` · `TASK-E2E-02/03` ·
  E2E-04's integration-tier half · `hub/SPECIFICATION.md` -> `./ROADMAP.md` placeholder · the
  `done`-no-longer-implies-sweepable tension · deferred Eid piles. **Retired from the carry:
  AB-6's docket (executed) and the registration-second-act gap (ruled C, gated).**
- The deep-cold ~5.4 s class on first-nav admin surfaces — a named line item for cutover planning
  (keep-warm / Fluid posture), not an open investigation.

## Next

**Ruling D (the merge nod), then the discovery sweep's main->discovery sync, then Phase-4 cutover
planning opens.** Nothing else is owed from this session.

## Close ritual

- [x] All four docket items executed; doc-health run inside the audit (0 critical)
- [x] Findings converted into gates (three shipped)
- [x] Dashboard refreshed at close (846 files)
- [x] Session bridge (this file)
- [x] Perf fixture torn down and residue-verified; measurement FIM erased
- [ ] PR merge — **HELD for the named nod (ruling D)**; after merge: pull main, sync
      main -> discovery, delete the branch
