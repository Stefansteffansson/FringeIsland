# Anatomy refresh — the living pair lags ADR-U049 and ADR-U050

---
id: TASK-DOC-005
title: Refresh ARCHITECTURE_ANATOMY + the current ECOSYSTEM_ANATOMY diagram through ADR-U050, and move the stamp
status: todo
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
- [ ] **Blocked on ratification:** `ARCHITECTURE_ANATOMY.md` reflects the ADR-U050 four-state account lifecycle — do this in the pass that follows the C-F schema gate's named acceptance, and move the stamp to U050 in the same change
- [ ] **Outstanding:** the current `ECOSYSTEM_ANATOMY_*.svg` is updated if either decision changes what it draws; its `<title>`/`<desc>` prose updated with it (the in-artifact source-of-truth rule), and any superseded version carries its SUPERSEDED watermark. **Not touched by W5** — the doc pass moved prose only, so the diagram may still lag U049.
- [ ] Pointer integrity re-checked: root `CLAUDE.md` document-map row, `PROCESS.md` companion-docs line, and `docs/architecture/README.md` all resolve to the living pair (not a superseded snapshot)

## Technical notes

- The anatomy pair is explicitly **derived** ("canon wins") — this is a reconciliation pass, not a re-derivation. Read U049 and U050 first, then change only what those decisions actually move.
- Section 11 exists because derived docs rot silently; the stamp is the contract that makes the rot visible. If a review concludes an ADR has no anatomy impact, the correct outcome is still to move the stamp with a "reviewed, no anatomy impact" note — a stamp that never moves is indistinguishable from a stamp nobody checked.

## Verification

Re-run doc-health-check Section 11: stamp equals the newest accepted ADR, zero anatomy-relevant ADRs outstanding, zero retired vocabulary in the living pair, all "current anatomy" pointers resolving.
