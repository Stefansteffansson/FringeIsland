# Session bridge — Anatomy Conformance Audit III executed; Cycle COR-C planned and HELD

**Date:** 2026-07-30 (session 02) · **Wave:** Ferd · **Between areas:** A-NTF closed → A-ADM not yet open
**Follows:** [`2026-07-30_01_-_A-NTF-FULLY-CLOSED-REWALK-CONFIRMED-A-ADM-NEXT.md`](./2026-07-30_01_-_A-NTF-FULLY-CLOSED-REWALK-CONFIRMED-A-ADM-NEXT.md)

---

## READ THIS FIRST — what the next session must pick up

**Execute Cycle COR-C** — the correction plan from Anatomy Audit III. Both artifacts are merged on `main` (PR #335):

- Register: [`../reference/ANATOMY-CONFORMANCE-AUDIT-3.md`](../reference/ANATOMY-CONFORMANCE-AUDIT-3.md) — AC3-1..AC3-19, R-4..R-6, GC-1..GC-14, all Critical/Major evidence disk-verified.
- Plan: [`../hub-v2/anatomy-correction-plan-cor-c.md`](../hub-v2/anatomy-correction-plan-cor-c.md) — eight workstreams, sequencing table at the top. **Stefan has agreed to execute; A-ADM stays closed until at least W1 lands** (the admin console builds on the contracts W1 repairs).

**Start with W1** (the Critical, AC3-1: ADR-U050's admin half — `admin_update_user_status` never writes `deactivation_origin`; a member can escape an admin hold). W1 needs **no ruling** — red-first per the plan (the escape case demonstrates red at HEAD), then the PC-4-side re-issue, **held at the schema gate for a named approval**. While W1 is held, run the **W4 rulings session** with Stefan — four decisions, recommendations in the register: R-4 (registry tables → DS-5), R-5 (ADR-U048 rider for the substrate trigger), R-6 (design-system tier activation), AC3-11 (U051 amendment vs widened param). Then W2 (GDPR export, schema gate) and onward per the sequencing table.

**Decisions still owed by Stefan (not yet given):** the four W4 rulings above · AC3-16 (announcements in export: add section vs record exemption) · whether W5–W8 run inside COR-C or overlap A-ADM's open. Do not default these — surface the board at the rulings session.

**Also still held: PR #334** (previous session's doc-health run — steering-file carve-out, needs Stefan's explicit nod).

---

## One-paragraph state

`main` clean at `f57bc33`, tree clean, discovery worktree synced. This session ran the pre-A-ADM deep conformance analysis Stefan requested: six dimensions (D0 orchestrated + D1–D5 parallel audit agents) against the **living** anatomy (`ARCHITECTURE_ANATOMY.md`, stamp U051) + `ECOSYSTEM_ANATOMY_V6.svg`. **Baseline correction at kickoff:** Stefan initially named `ARCHITECTURE_ANATOMY_V1.md`; V1 is bannered historical (superseded by ADR-U023) — decided in-session to audit against the living pair. All five COR-A/COR-B mechanical gates re-run at HEAD: **green** (unit 27/27, integration platform 15/15, serial, live catalog). No code was changed; the sole output is the register + plan (PR #335).

## Verdict compressed

**1 Critical · 7 Major · 11 Minor · 3 Rulings · 9 Observations · 14 gate-coverage gaps.** The pattern: *everywhere a mechanical gate exists, the code conforms; every deviation lives where no gate was looking.* The A-NTF delta itself is the cleanest ring-discipline surface yet measured. Highlights:

| ID | Sev | One line |
|---|---|---|
| AC3-1 | **Critical** | ADR-U050 admin half unwired; member can escape an admin hold (verified end-to-end) |
| AC3-2 | Major | Lifecycle suite tests the gate, not the producer — fixture hand-writes `origin='admin'` |
| AC3-3/4 | Major | GDPR export silently missing `notification_preferences`; no completeness invariant (the AC-4 class recurred) — and the A-NTF area gate stamped a "PC008 — match" that doesn't exist |
| AC3-5 | Major | U051 typed-action registry lives only in Hub TS (`DISPATCH_SEGMENTS`/`RESPONSE_SETS`) |
| AC3-6/7/8 | Major | Band tier: zero i18n (vs **Accepted** ADR-U013, no recorded deferral), zero tokens (accent already forked), `aria-modal` with no focus management on `ConfirmModal` |

Audit-I loose ends resolved: AC-7 and AC-8 verified CLOSED on disk; AC-6 verified properly deferred to A-ADM (re-homed with citations, TODO re-dated) — but its seam now has four callers, three GDPR-relevant.

## Decisions made this session

1. **Baseline = living anatomy + V6.svg**, not V1 (Stefan: "my mistake" — recorded in the register header).
2. **Audit shape:** delta + never-audited dimensions; code + schema + gates; deliverable = register + held COR-C plan (all four picked by Stefan from the decision board).
3. **Stefan intends COR-C to run in a fresh session** — this bridge is that handoff.

## Method notes worth keeping

- The five audit agents were each bound to named canonical sources with mandatory `file:line` citations; the orchestrator disk-verified every Critical/Major before registration. Two agent-brief assumptions were *corrected by the agents' own evidence* (i18n-rule provenance; the anticipated-deferred IDN-12, which is in fact `6-done` at HEAD) — the delegated-fact discipline worked in both directions.
- The prior audits' pitfall brief (drop-unaware parsing, comments-as-code, U038 clause-3, U048 substrate writes) produced **zero false findings** across five agents. Keep briefing it.
- D2 caught a lowercase-`create or replace` grep miss that would have fabricated a DS-5→DS-3 crossing; case-insensitive matching is now part of the pitfall set.

## Close ritual

- [x] Register + plan merged (PR #335); fuller-auto, no carve-out
- [x] Session bridge (this file)
- [x] `npm run dashboard` — refreshed
- [x] Discovery sweep — worktree synced after merge
- [ ] doc-health-check — not run (no cross-cutting change; last run 2026-07-30 session 01)
