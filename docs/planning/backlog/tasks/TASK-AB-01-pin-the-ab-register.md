# Pin the AB register — all eight items, verified against the live system

---
id: TASK-AB-01
title: "Pin AB-1..AB-8: confirm each item's real state against the substrate, not against the board's own claim"
status: todo
assigned_to: unassigned
priority: medium
owner: platform/core
wave: ferd
depends_on: []
estimated_hours: 3
---

## Why this exists

Stefan, 2026-08-10: *"pin all eight properly in a fresh session."* Queued behind
`TASK-RDC-03` (now `done`), so it is **ready to start**.

The AB register is referenced constantly in the Platform-Ops planning tree and has never
been stated in one place. It is defined at
[`phase-3-platform-ops-completion-plan.md:16`](../../hub-v2/phase-3-platform-ops-completion-plan.md).

## FIRST, A CORRECTION TO CARRY

**AB-1..AB-8 are NOT a sequence or a ladder.** They are carried board items from the
Platform-Ops area gate, each an unrelated piece of work. Any plan that treats them as
stages is working from a wrong model.

**AB-6 is the audit *cadence ruling*, not an audit.** Session-17 material (and session 18's
carried line, *"Phase-4 cutover / AB-6 — the strategic items…"*) reads AB-6 as a work item.
It is the rule stating *when* the full anatomy audit runs. What is scheduled is a full
anatomy audit **per** AB-6 — after A-ADM closes, **before Phase-4 cutover**. That ordering
is deliberate: once the legacy Hub is deleted, `ARCHITECTURE_ANATOMY.md` becomes the primary
written record, so the map should be true before the backup is burned.

## State as of 2026-08-10 — and how much of it is actually verified

| | What it is | State | How confident |
|---|---|---|---|
| AB-1 | telemetry sink | done (TASK-OBS-01; ADR-U052 accepted) | read from the board |
| AB-2 | audit-recorder seam — **four** callers (`signup` null-actor, `audit`, `transcend`, `farewell`), recorder must accept a null actor | **UNCONFIRMED** | not checked |
| AB-3 | ownership-manifest four-way split (PC-1/2/3/4) | closed, executed 2026-07-31 | read from the board |
| AB-4 | `admin_audit_log` W2 exemption revisit / right-of-access ruling | recorded "verified executed" at the area gate | read from the board |
| AB-5 | ADM-8-early sequencing (RW-05 + AC3-O8) | **UNCONFIRMED** — probably discharged via ADM-B | not checked |
| AB-6 | the audit **cadence ruling** | standing | read from the board |
| AB-7 | console shell (referenced by ADM-16) | **UNCONFIRMED** | glimpsed only |
| AB-8 | records verified at the gate (paired with AB-4) | **UNCONFIRMED** | glimpsed only |

**Everything in the "State" column above is what the board SAYS. Almost none of it has been
checked against the system.** That is the point of this task.

## The method — this is the whole task, not a preamble

**Re-verifying the discharge claims is the FIRST STEP OF the audit, not a pass before it and
not something to inherit.**

The risk is not that these items are unfinished. It is that they are recorded as finished —
*"done"*, *"closed"*, *"verified executed"* — and a full anatomy audit would then **stamp the
map on top of those records without rechecking any of them**, certifying drift rather than
removing it. That is worse than not auditing, because afterwards the map carries a fresh stamp.

This is the [mechanism walk](../../../.claude/skills/ecosystem-decomposition/SKILL.md) (PR #477)
aimed at the audit's own inputs. **A board entry saying "verified executed" is a claim about
the world, not proof.** The RD-C session produced three recorded claims that were false —
including one written up as a *resolved open question*, investigated and documented.

For each of the eight: name the check, run it, cite the evidence (`file:line` or a catalogue
query), and record what was actually found — including where the board was right.

## Known drift already sitting on the anatomy document

- the stamp lags **ADR-U052**
- the **PC-1 row lacks the sink**
- the **PC-4 admin-RPC enumeration is now ~20 strong**

These are the reasons the audit was scheduled; they are not the audit's findings, and finding
only these would mean the audit did not look.

## Acceptance criteria

- [ ] All eight items stated in one place, each with what it is and its **verified** state
- [ ] Every "done / closed / verified executed" claim **rechecked against the live system**, with the check named and the evidence cited — not inherited from the board
- [ ] AB-2 and AB-5 resolved from unconfirmed (AB-2's null-actor requirement checked against the recorder as built)
- [ ] AB-7 and AB-8 identified properly rather than glimpsed
- [ ] Any claim found false recorded as a correction **in the document that made it**, not only here
- [ ] The AB-6 cadence correction propagated wherever AB-6 is described as a work item

## Sequencing

- **Ready now** — `TASK-RDC-03` is closed.
- **Wants a fresh session** with room; it reads the live database (function lists, manifest
  state, recorder behaviour). Per the one-checkout / one-dev-DB rule, do not run it while
  another session is doing schema work.
- **Runs before Phase-4 cutover**, per AB-6.
