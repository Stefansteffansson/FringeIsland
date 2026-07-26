# Anatomy refresh — the living pair lags ADR-U049 and ADR-U050

---
id: TASK-DOC-005
title: Refresh ARCHITECTURE_ANATOMY + the current ECOSYSTEM_ANATOMY diagram through ADR-U050, and move the stamp
status: done
assigned_to: claude
priority: medium
feature: none
owner: platform/core/governance
wave: ferd
cycle: none
depends_on: []
estimated_hours: 2
---

## Description

Doc-health-check Section 11 finding, raised at the **A-COM area close (2026-07-22)**. `docs/architecture/ARCHITECTURE_ANATOMY.md` carries the stamp **"Reflects decisions through: ADR-U048 (2026-07-19)"**. Two accepted ADRs have landed above that stamp, and both are anatomy-relevant by Section 11's own criteria (ownership splits, contract boundaries, lifecycle states):

- **ADR-U049** — announcements get a durable DS-5 home plus routed per-recipient delivery. This is an **ownership split** between Communication (DS-5) and the Notifications vertical, exactly the kind of boundary the anatomy draws.
- **ADR-U050** — the account-lifecycle state machine: four states split by `deactivation_origin` (active / paused-member-origin / suspended-admin-origin / decommissioned-terminal). **Lifecycle states** are named explicitly in Section 11's relevance test.

Per Section 11's severity rule this is a standard finding, not critical: the stamp lagging *with* anatomy-relevant ADRs outstanding is a backlog item, because doc + diagram + stamp must move together in one considered pass rather than being patched inline during a health check.

## PARTIALLY DONE — and one premise corrected (2026-07-22, COR-B W5, PR #256)

The **ADR-U049 half is done**: `ARCHITECTURE_ANATOMY.md`'s DS-5 charter row now carries the durable announcements home routed onto the delivery substrate, and the stamp moved **U048 → U049**. This was done during COR-B's doc pass by a session that had not found this task first — hence the belated reconciliation. (Prevention: a doc-health-check Section 11 finding should grep `docs/planning/backlog/tasks/` for an existing task before raising a new pass.)

**Premise correction — this task treats ADR-U050 as accepted; it is not.** `ADR-U050-account-lifecycle-state-machine.md` reads `Status: Proposed (rides the C-F schema gate; Accepted on the gate's named nod)`. The anatomy is a *derived* document whose own rule is "canon wins", so absorbing a Proposed decision would make it assert something not yet ratified. **Decision (Stefan, 2026-07-22): hold U050 until the C-F gate accepts it.** The stamp line states this inline so the next reviewer does not re-derive it.

## Acceptance criteria

- [x] `ARCHITECTURE_ANATOMY.md` reflects the ADR-U049 announcements ownership split (DS-5 durable home; delivery routed to the notifications substrate)
- [x] The "Reflects decisions through" stamp moves to the newest **accepted** reviewed ADR (now U049)
- [x] **Unblocked and done 2026-07-26:** `ARCHITECTURE_ANATOMY.md` reflects the ADR-U050 four-state account lifecycle (carried on the PC-2 Identity row), and the stamp records U050 as absorbed
- [x] The current `ECOSYSTEM_ANATOMY_V6.svg` is updated (2026-07-23): confirmed lagging — its DS-5 cell read `DM, forums, feeds` with no mention of announcements, and its `<desc>` stopped at ADR-U038 while the prose stamp had moved to U049, so the living pair disagreed with itself. Now **v2.5**: DS-5 cell carries announcements; `<title>` and `<desc>` updated per the in-artifact source-of-truth rule, citing U047/U048/U049; version caption and the two directive pointers (`ARCHITECTURE_ANATOMY.md` companion line, `architecture/README.md` tree + table) moved to v2.5. Dated records and provenance lines left era-correct per the 2026-07-18 triage rule.
- [x] Pointer integrity re-checked 2026-07-26 — **clean**: root `CLAUDE.md` rows 96/97 (anatomy + domain entities), `PROCESS.md` companion-docs line 5, and `docs/architecture/README.md` (both the tree block and the table) all resolve to the living pair. V5/V4 are correctly labelled superseded; `ARCHITECTURE_ANATOMY_V1.md` correctly labelled frozen historical. No pointer resolves to a superseded snapshot.

## Technical notes

- The anatomy pair is explicitly **derived** ("canon wins") — this is a reconciliation pass, not a re-derivation. Read U049 and U050 first, then change only what those decisions actually move.
- Section 11 exists because derived docs rot silently; the stamp is the contract that makes the rot visible. If a review concludes an ADR has no anatomy impact, the correct outcome is still to move the stamp with a "reviewed, no anatomy impact" note — a stamp that never moves is indistinguishable from a stamp nobody checked.

## Verification

Re-run doc-health-check Section 11: stamp equals the newest accepted ADR, zero anatomy-relevant ADRs outstanding, zero retired vocabulary in the living pair, all "current anatomy" pointers resolving.

## Outcome — DONE 2026-07-26 (A-NTF area gate, merged pass with TASK-DOC-003)

**The blocker dissolved on inspection.** This task's remaining half was held on *"U050 is Proposed — hold until the C-F gate accepts it."* U050's status line read `Proposed (rides the C-F schema gate; Accepted on the gate's named nod)` — **and that gate had merged on 2026-07-21**, five days earlier. The acceptance condition was already satisfied; only the status line lagged. The hold was guarding against a risk that had stopped existing.

Rather than take the gate's merge as sufficient, every one of U050's five decision points was verified realized on disk in `20260721161500_c_f_account_lifecycle_self_service.sql`: the origin column (L42), the `'admin'` backfill (L52), all three self-service RPCs (L123/191/257), both ADR-U047 fact handlers (L58/89), the state derivation (L561), and `DROP FUNCTION admin_exit_user_from_platform` (L611). **ADR-U050 accepted on Stefan's named nod** with an Acceptance record stating that evidence — filed under the same reasoning as ADR-U039's Amendment 1: a document four shipped specs depend on should not read "Proposed".

Then the absorption itself:

- **`ARCHITECTURE_ANATOMY.md` PC-2 Identity** now carries the four-state machine — `active` / `paused` / `suspended` / `decommissioned`, derived from the existing booleans plus `deactivation_origin`. The anatomy-relevant part is stated as an **ownership line**, which is what this document draws: a member may return their own `paused` account to active and may never escape a `suspended` one; `decommissioned` is terminal; an off row of unknown origin always reads `suspended`; admin holds remain PC-4 Governance's.
- **The stamp records the discharge explicitly** rather than silently dropping the old hold sentence — a reader who remembers "U050 is deliberately not absorbed" is told where that went.
- **Doc and diagram deliberately separated in depth.** The `ECOSYSTEM_ANATOMY_V6.svg` companion line previously claimed the pair "both reflect ADR-U049", which was already loose (its `<desc>` carries U047). It now states the truth: the diagram was **reviewed for U050 with no diagram impact** — four lifecycle states internal to PC-2 move no tier, service, core or boundary the visual draws — so the prose carries U050 where the visual does not need to. Per this task's own technical note, "reviewed, no impact" is a real outcome that must still be recorded, because a stamp that never moves is indistinguishable from one nobody checked.

**Pointer integrity: clean** (see the criterion above). Section 11 should now find the stamp at the newest accepted ADR with zero anatomy-relevant ADRs outstanding.
