# RD-B re-walk — PASSED. One stale script step, no product defects.

**Date:** 2026-08-09 · **Driver:** Stefan (live) · **Cycle:** RD-B (closed 2026-08-09)
**Discharges:** the open item on
[`2026-08-09_02`](../sessions/2026-08-09_02_-_RD-B-CLOSED-ALL-ELEVEN-FINDINGS-SETTLED-AND-MEASURED.md)
— *"The re-walk is owed — the surfaces changed after the walk that found them."*

---

## Outcome

**All six changed surfaces behave as ruled. No new findings. No regressions.**

The one flag raised during the walk was **the script, not the product** — and the walk was
driven against `2026-08-07-rd-b-live-walk-script.md`, which was written to *discover* the
eleven findings and therefore still describes the pre-fix behaviour as the thing to verify.

## The one flag — S6, and why it was right to raise it

Stefan, at S6, with G2 put to rest:

> Roles panel shows the four system roles still actionable. Below, and in "show available
> roles", there is still "Walk Greeter" with the possibility to click "Review update" —
> which I think is correct. **A Steward needs to be able to take down his/her group for
> maintenance and this includes manipulating current and newly published roles.** Your
> script says otherwise though.

**The script did say otherwise.** S6 step 2 reads *"Verify the inconsistency: … Copy and
Review update are gone, replaced by 'This group is read-only right now'."* That sentence
describes **finding W-2** — the defect the walk existed to surface.

W-2 was ruled the day after, at the original live walk, in the same terms:

> **RULED 2026-08-08 (live walk, S6): align to the panel — remove the status gating.** A
> Steward keeps **both** halves in a resting group: editing current roles *and* copying /
> reviewing under available roles.

Verified against the source rather than the bridge: the `readOnly` prop and the string
*"This group is read-only right now"* have **zero occurrences** in the Hub. The observed
behaviour is the fix.

**Worth keeping:** the rationale was reconstructed independently, from the product rather
than from the record — *a Steward must be able to take a group down for maintenance and
still manage its roles.* A ruling that regenerates itself under a second look is a ruling
that was right.

## What the script would have misled on next

| Step | Written to verify | Actually now |
|---|---|---|
| **S6** | the read-only/actionable disagreement (W-2) | ruled + fixed — both halves actionable |
| **S7** | *"you land at the top of G1's page"*, panel seven sections down, collapsed (W-1) | `?focus=roles` — expanded, scrolled into view, brief ring. **Landing at the top would now be a regression** |
| S1 | withdraw | **W-11** — bulk withdraw exists; every label states its own scope |
| S2 | what is offered to my group | **W-3** actionable rows only, empty state reachable · **W-5** the publish-to-named-groups picker |
| S5 | the ceremony tells the truth | **W-6** — the ceremony now states its blast radius before you commit |

S0, S3, S4, S8, S9 were unaffected and behaved as written.

## Standing consequence

**A walk script is a record of defects, and it expires the moment they are fixed.** Driving
this one after the fixes cost a mid-walk stop and a verification round-trip. The A-NTF
precedent (`2026-07-30-antf-rewalk-findings.md`) is the shape: when a walk produces fixes,
the re-walk needs its own script, written against the ruled behaviour.

The old script should not be driven again — it is a historical record of the eleven
findings, not a test procedure.

## Still unruled after this walk

**W-10** — a clone can never leave the catalogue. Recorded at RD-B close as an observation,
still unruled, and not raised during the re-walk.
