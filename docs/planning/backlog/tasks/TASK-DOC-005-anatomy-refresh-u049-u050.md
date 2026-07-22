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

## Acceptance criteria

- [ ] `ARCHITECTURE_ANATOMY.md` reflects the ADR-U049 announcements ownership split (DS-5 durable home; delivery routed to the notifications substrate) and the ADR-U050 four-state account lifecycle
- [ ] The current `ECOSYSTEM_ANATOMY_*.svg` is updated in the same pass if either decision changes what it draws; its `<title>`/`<desc>` prose is updated with it (the in-artifact source-of-truth rule), and any superseded version carries its SUPERSEDED watermark
- [ ] The "Reflects decisions through" stamp moves to the newest reviewed ADR
- [ ] Pointer integrity re-checked: root `CLAUDE.md` document-map row, `PROCESS.md` companion-docs line, and `docs/architecture/README.md` all resolve to the living pair (not a superseded snapshot)

## Technical notes

- The anatomy pair is explicitly **derived** ("canon wins") — this is a reconciliation pass, not a re-derivation. Read U049 and U050 first, then change only what those decisions actually move.
- Section 11 exists because derived docs rot silently; the stamp is the contract that makes the rot visible. If a review concludes an ADR has no anatomy impact, the correct outcome is still to move the stamp with a "reviewed, no anatomy impact" note — a stamp that never moves is indistinguishable from a stamp nobody checked.

## Verification

Re-run doc-health-check Section 11: stamp equals the newest accepted ADR, zero anatomy-relevant ADRs outstanding, zero retired vocabulary in the living pair, all "current anatomy" pointers resolving.
