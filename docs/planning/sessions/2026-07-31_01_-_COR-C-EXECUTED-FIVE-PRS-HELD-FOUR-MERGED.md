# Session bridge — Cycle COR-C executed: all eight workstreams built; four PRs merged, five HELD at carve-out gates

**Date:** 2026-07-31 (session 01; started 2026-07-30) · **Wave:** Ferd · **Between areas:** A-NTF closed → A-ADM opens after COR-C's gates clear
**Follows:** [`2026-07-30_02_-_ANATOMY-AUDIT-III-EXECUTED-COR-C-PLANNED-HELD.md`](./2026-07-30_02_-_ANATOMY-AUDIT-III-EXECUTED-COR-C-PLANNED-HELD.md)

---

## READ THIS FIRST — what the next session must pick up

> **SUPERSEDED same-day (2026-07-31, later in the same session):** Stefan named all five PRs; all merged (#341 recreated as **#347** after GitHub auto-closed the stacked PR on base-branch deletion), the three migrations applied (after repairing a pre-existing remote migration-history drift), full integration green post-apply, register ledger CLOSED, [retro written](../retrospectives/retro-2026-07-31-cor-c.md). **COR-C is closed; A-ADM is clear to open.** The table below is the historical held-state.

**Five PRs are HELD; each unlocks only on Stefan's explicitly NAMED approval, in this order:**

| PR | What | Gate class | Apply after merge |
|---|---|---|---|
| **#337** | W1 — ADR-U050 admin half (AC3-1 Critical; migration `20260730210000`) | schema gate | `npx supabase db push`, then `test:integration:account` |
| **#339** | W4 canon — U048A1 + U051A1 amendments, R-6 activation + TASK-I18N-01, hub CLAUDE.md:20, anatomy stamp | ADR + steering | doc-only |
| **#340** | W2 — GDPR export completeness (migration `20260731120000`; three exemptions flagged for review) | schema gate | after #337's apply |
| **#341** | W3 — U051 typed-action registry + acting expiry guard (migration `20260731140000`; **stacked on #340**) | schema gate | after #340's apply |
| **#345** | W7b — jest-axe a11y gate + doc-health Section 4.5 | deps + skill | none |

On the named approvals: merge in order, apply migrations in timestamp order, run the full integration suite (the held reds all flip green), then add inline CLOSED lines to the register per the ledger (`ANATOMY-CONFORMANCE-AUDIT-3.md` top), run **doc-health-check** (ADR amendments + CLAUDE.md edits are cross-cutting), and write the COR-C retro. **A-ADM stays closed until at least #337 lands** (the console builds on those contracts). Manifest note: #340/#341 predate main's W7 manifest changes — expect a trivial JSON merge (different regions); resolve mechanically if GitHub balks.

## One-paragraph state

Stefan gave the full rulings board 2026-07-31 ("go with recommended"; AC3-16 = ADD announcements to export; GC-8 = ADD trigger-edge gate; #334 turned out already merged). All eight workstreams executed same-day, TDD red-first throughout. **Merged to main:** R-4 relabel + pinned vertical-set gate (#338), W5 a11y primitives (#342 — useFocusTrap, Menu primitive, bell disclosure semantics, TextField wiring), W6 token seed (#343 — @theme, ui/ migrated, accent fork resolved to indigo), W7 gate hardening (#344 — GC-1 function completeness with a 100-function CORE declaration, GC-8 trigger-mount gate, GC-7 transitive outer-ring closure, GC-12 token gate, migration-guidelines README). **Gates found real things on their first runs:** GC-8 caught a second unlicensed DS-5 trigger edge the audit missed (`notify_notification_hint` — licensed under U048A1); GC-7's value-import closure caught three rpc-bearing modules leaking bundle-ward — fixed structurally (pure-module splits: `preferences-format.ts`, `profile/constants.ts`, `auth/transcendence-policy.ts`); the W2 completeness invariant caught `user_group_roles` as unexported member data on day one (roles section added to the composite). Unit 1049/1049 · platform conformance 21/21 · `next build` clean · register ledger annotated same-day.

## Decisions made this session

1. **All four W4 rulings per recommendation** (Stefan): R-4 registries → DS-5; R-5 legitimised via U048 Amendment 1; R-6 tier active with scoped activation (i18n deferred dated to Eid, TASK-I18N-01); AC3-11 → U051 Amendment 1 (boolean family named; no parameter widening in W3).
2. **AC3-16: ADD** `authored_announcements` (Stefan, follow-up question) — rides the W2 messages-export re-issue.
3. **GC-8: ADD** trigger-edge awareness (Stefan, follow-up question) — landed in W7, red-first.
4. **W5–W8 ran inside COR-C** (the whole cycle in one pass; W8's AC3-10 + AC3-O3 discharged inside W7's artifacts).
5. **W2 exemptions recorded** (reviewer confirms at the #340 gate): `pending_email_invitations` (own-data wall), `admin_audit_log` (deferred to A-ADM design), `journeys` authored-templates (deferred to Studios wave).

## New debt filed

- **TASK-DBT-01** — ~1,287 lines of pre-existing test-tier `tsc` errors (latent: ts-jest doesn't type-check, `next build` excludes tests). The consent-read slice fixed this session as demonstrator.

## Close ritual

- [x] Register ledger annotated same-day (per-finding, AC-7 lesson) — inline CLOSED lines follow the gate merges
- [x] Session bridge (this file)
- [x] `npm run dashboard` — refreshed
- [x] Discovery sweep — run at session open (clean) and close
- [x] doc-health-check — run at the same-day gate-close (delegated audit; 3 minor findings fixed in PR #349; Section 1.6 flagged for a follow-up run)
- [x] COR-C retro — [`retro-2026-07-31-cor-c.md`](../retrospectives/retro-2026-07-31-cor-c.md)

## Post-close addendum — audit cadence going forward (PROPOSED, Stefan to ratify)

Discussed at session close (2026-07-31), not yet ratified — carry to the A-ADM area-open board or the Ferd wave boundary:

- **Gates are the always-on audit** — the COR-A/B/C lattice now mechanically covers most previously-audited dimensions on every suite run.
- **After big builds:** bounded delta-audit of un-gated corners only (new mechanism classes, canon-vs-code judgment calls), not a full six-dimension sweep.
- **One more FULL audit after A-ADM closes** (most security-sensitive area; ends Phase 3, right before cutover), then full audits only at structural inflection points (Eid design-system build-out, new DS activations, the Gimbal).
- **Standing rule:** every audit must convert findings into gates, or the class recurs; periodic judgment passes audit the gates themselves (the GC-table lesson).
