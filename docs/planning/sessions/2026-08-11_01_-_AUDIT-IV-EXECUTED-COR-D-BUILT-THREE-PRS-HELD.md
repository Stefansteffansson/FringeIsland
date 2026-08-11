# Session bridge — Audit IV executed; Cycle COR-D built; three PRs HELD at their gates

**Date:** 2026-08-11 (session 21; opened 2026-08-10) · **Wave:** Ferd · **Cycle:** COR-D (built, gates pending)
**Continues:** [`2026-08-10_04`](./2026-08-10_04_-_AB6-FULL-AUDIT-EXECUTED-RULINGS-A1-B1-C-LANDED.md) — AB-6 closed there; this session ran the code-level ring audit AB-6 explicitly did not.

---

## READ THIS FIRST

1. **Anatomy-Conformance Audit IV is EXECUTED and registered** — the first full code-vs-anatomy
   ring audit since Audit III, full-coverage at HEAD (124/124 BFF routes, 116 migrations, 613
   frontend files graphed, ownership diffed both ways, 33 anatomy claims). One canonical record:
   **[`ANATOMY-CONFORMANCE-AUDIT-4.md`](../reference/ANATOMY-CONFORMANCE-AUDIT-4.md)** (findings
   AC4-1..11, AC4-O1..O4, GC-15..23); plan:
   [`anatomy-correction-plan-cor-d.md`](../hub-v2/anatomy-correction-plan-cor-d.md). Verdict in one
   line: **the rings hold everywhere except the core→domain *invocation* seam, which the W3 gate
   never checked (GC-15)** — and that blind spot had underwritten the platform-ops area gate's
   acceptance of the undeclared moderation composition ("conformance gates green on the shape").
2. **Stefan approved the full decision board as recommended** (R-7 ratify · R-8 relocate→corrected
   in execution · R-9 chartered-future · AC4-1 fixed now · CI deferred to Phase-4 planning ·
   Storage stays) and named the #486 merge. COR-D was then **built end-to-end**.
3. **Three PRs are HELD for Stefan** (the only open work):
   - **#487** — ADR-U047 **Amendment 3** (declared-composition class; manifest as the single
     contract registry: `declaredCompositions` + `lifecycleFacts`; `is_platform_admin` → PC-4) +
     the **invocation-axis gate**, demonstrated **red on exactly the audit's five undeclared calls**
     before the declarations landed, green 28/28 after. *ADR carve-out — named nod.*
   - **#488** — W3: `finalise_transcendence` stamps `policy_version` server-side (AC4-1). Red
     recorded: a direct caller's `vFAKE` version sticks verbatim today. *Schema gate — apply
     commands in the PR body.*
   - **#489** — W6: `enforce_consent_withdrawable` BEFORE INSERT trigger — **R-8's premise was
     falsified in execution** (`record_consent_decision` cannot carry per-enrollment consent;
     relocation would have silently changed semantics), so the rule moved to the write edge
     instead, red-first. The pivot is documented in the migration header and PR. *Schema gate.*
4. **Merged this session:** #486 (register + plan) · #490 (anatomy pair → **v2.7**: PC-1 box sheds
   substrate-less `email`, Extension System marked chartered-future per R-9, route-group wording,
   hub-legacy pointer, stale-prose annotations) · #491 (gate patches GC-16/17/18/19/21 + the
   **`test:integration:platform` script the family never had**; 29/29 green).
5. **Method note worth keeping:** mid-suite DDL injection (a test trigger) reproducibly reset the
   shared pooler's data plane ("upstream connect error … protocol error") — cached-plan
   invalidation. Test-side failure injection on the dev DB must be **data-level, not DDL** (the W6
   red cells use a catalog-key rename lever).

## Numbers at close

Platform conformance family **29/29** via the new script (on main; #487's branch runs 28+25 with
the invocation axis and new fixtures). W3 suites recorded pre-apply: platform half 2 red by design /
3 green; Hub half 1 red by design; unit 4/4. W6 suite 1 red by design / 2 green. `next build` clean
on the W3 branch; eslint clean. Live gates at session open: 15/15 unit + 27/27 integration.
Discovery worktree clean and synced 0/0 at open. Dashboard refreshed at close.

## Standing items

- **The three held PRs above** — then a **gate-execution pass**: apply #488/#489 migrations (named
  approvals), rerun their suites green, merge #487/#488/#489, tick the COR-D DoD, annotate the
  held findings' closures in the register.
- **Phase-4 cutover planning** remains NEXT after COR-D closes (its entry condition was met at
  AB-6). The CI-posture decision (board row 5) and the deep-cold ~5.4 s class are named line items
  there. GC-20 (Extension System owner token) waits for first real substrate (R-9).
- Carried, unchanged: G-3 journeys deferral · `TASK-RDA-03` · `TASK-SEAL-01` · `TASK-E2E-02/03` ·
  E2E-04's integration-tier half · `hub/SPECIFICATION.md` → `./ROADMAP.md` placeholder · the
  `done`-no-longer-implies-sweepable tension · deferred Eid piles.
- AC4-O1 (DS-5 → `admin_audit_log` direct writes) recorded as a watch item — no action owed.

## Next

**Stefan's three nods (#487 ADR · #488 schema · #489 schema), the gate-execution pass, then
Phase-4 cutover planning opens.**

## Close ritual

- [x] Audit record + correction plan committed (#486, merged on named approval)
- [x] Every Critical/Major disk-verified before registration; honesty log in the record
- [x] Findings converted into gates (invocation axis built red-first; five gate patches shipped)
- [x] Closure annotations for merged work in the register, same day (AC-7 lesson)
- [x] Session bridge (this file)
- [x] Dashboard refreshed at close
- [ ] #487 / #488 / #489 — **HELD for named nods**; after: apply, rerun green, merge, register
      close pass, COR-D DoD tick
- [x] Discovery sweep at close (main → discovery sync)
