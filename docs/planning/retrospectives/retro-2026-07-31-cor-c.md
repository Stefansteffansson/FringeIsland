# Retrospective — Cycle COR-C (Anatomy Audit III correction)

**Date:** 2026-07-31 · **Cycle:** COR-C (2026-07-30 → 2026-07-31, one session + the gate-close) · **Wave:** Ferd
**Inputs:** [Audit III register](../reference/ANATOMY-CONFORMANCE-AUDIT-3.md) (+ execution ledger at its top) · [COR-C plan](../hub-v2/anatomy-correction-plan-cor-c.md) · [session bridge](../sessions/2026-07-31_01_-_COR-C-EXECUTED-FIVE-PRS-HELD-FOUR-MERGED.md)

## What happened

All eight workstreams executed in a single session per the held plan, TDD red-first throughout; five carve-out PRs held and then merged on Stefan's named approval (#337, #339, #340, #347-for-#341, #345), four merged fuller-auto along the way (#338, #342, #343, #344, plus #346). Three schema migrations applied in order after a pre-existing migration-history repair; full integration tier green post-apply. The AC3-1 Critical (member escapes an admin hold) is structurally dead: reproduced end-to-end red, fixed PC-4-side, and the gate diagnostic found zero wrong-origin rows in live data.

## What worked — keep doing

- **The rulings board in one shot.** Stefan's "go with recommended" + two follow-up picks (AC3-16, GC-8) un-blocked every downstream workstream in one exchange; nothing re-surfaced mid-cycle.
- **Held-PR red-first at every carve-out.** Every schema PR carried its demonstrated red + apply commands; the merge train was mechanical because the review surface was complete before the ask.
- **New gates caught real things on their first runs** — the strongest evidence the audit's "deviations live where no gate looks" thesis was right:
  - GC-8 (trigger mounts) found a **second** unlicensed DS-5 edge the audit itself missed (`notify_notification_hint`).
  - GC-7's transitive value-import closure found three rpc-bearing modules leaking toward the browser bundle — fixed structurally (pure-module splits), not by exception.
  - The W2 completeness invariant caught `user_group_roles` as unexported member data on day one.
- **Same-day ledger on the register** (the AC-7 lesson) meant the close was a status flip, not an archaeology dig.

## What bit us — change or watch

- **Stacked PRs + `--delete-branch` auto-CLOSE the child.** GitHub cannot retarget a closed PR; #341 had to be recreated as #347. Rule going forward: merge a stack bottom-up **without** deleting the base branch until the child is retargeted, or base the child on main from the start and accept the combined diff while held.
- **The remote migration history had drifted** (two orphan versions from earlier direct applies; two local files never stamped). Cost: three blocked pushes and two manual repairs at Stefan's permission level. The `supabase/migrations/README.md` checklist row now says migrations land via files + `db push` only — watch that history stays convergent.
- **Exact-payload-key pins are additive-change tripwires by design** — W3's two new columns correctly failed the N-A/N-B suites; the adaptations were labelled. Keep the pins (they are the point), but budget the sibling sweep into any additive contract change.
- **Latent test-tier type debt** (~1,287 lines of `tsc` errors; ts-jest never type-checks) — filed as TASK-DBT-01, demonstrator fixed.

## Carried forward

- **GC-13 / AC3-O5** (PC-2/PC-4 split at function granularity) — deliberately carried to the **A-ADM area-open board**, with AC3-O6's widened `recordAuditEntry` seam and TASK-OBS-01's sink decisions waiting at the same session.
- **TASK-I18N-01** — i18n dated to the Eid design-system activation.
- Feature-component token migration — tranche-wise under the W7 token gate; the axe-Playwright page sweep — Eid-side.

## Verdict

COR-C closed same-day with every Critical/Major finding CLOSED on disk and gated against recurrence. **A-ADM is clear to open** on the repaired ADR-U050 contracts.
