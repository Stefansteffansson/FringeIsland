# Session bridge — ADM-E walk closed (verdict COMPLETE); ADM-F kickoff dossier committed; the fresh session starts at the ADM-F decomposition

**Date:** 2026-08-04 (session 5's walk tail + handoff) · **Wave:** Ferd · **Cycle:** ADM-E fully closed; ADM-F next
**Follows:** [`2026-08-03_05_-_ADME-BUILT-AND-CLOSED-WF-SLOTTED.md`](./2026-08-03_05_-_ADME-BUILT-AND-CLOSED-WF-SLOTTED.md)

---

## READ THIS FIRST — start at the ADM-F decomposition; the substrate walks are already done

1. **ADM-E is fully closed including Stefan's live walk** — verdict COMPLETE in the [walk findings](../hub-v2/2026-08-04-adme-walk-findings.md) (PRs #403–#405). WA-1 (guaranteed-no-op bulk actions disable) was ruled option (b), **fixed and re-verified during the walk**. Three directives ride the **ADM-F opener's schema gate**: **WA-2** (audit read resolves targets like it resolves actors), **WA-3** (`admin_hard_delete_user` gains the consent-erasure leg — today it 23503-refuses on every consented member behind a generic 500), **WA-4** (`admin_force_logout` emits the existing `session_revoked` hint — **one per session id, per target** — so the device signs out in seconds).
2. **The decomposition's fact base is committed:** [`2026-08-04-admf-substrate-dossier.md`](../hub-v2/2026-08-04-admf-substrate-dossier.md) — both delegated walks (platform + Hub), file:line-cited, with a synthesis of the seven decomposition-shaping facts **including three corrections to carried premises** (the catalogue is 48-on-fresh-DB not "44"; the B-RBAC "exact-count pins" barely exist — the reshape is mostly done; snapshot-now is already the physics of instantiation). Do not re-run the walks; re-verify only load-bearing facts if migrations landed since.
3. **ADM-F's shape is already settled** — no new board: RB-4 (ratified skeleton: atoms code-owned — the catalogue stays read-only to the editor; templates-only editing; seeded templates immutable, clone-don't-edit; versions with a default pointer, rollback = repoint; diff preview; self-lockout guards extending the last-DeusEx instinct to a protected-permission set; audit rows carry old-set → new-set diffs) + RB-5 (snapshot-now propagation, dated record for Eid re-open) + the standing defaults (ADM-17 builds without ADM-13; `admin_* → PC-4` pin; every mutation writes `admin_audit_log`; schema-gate PRs held for NAMED approval; ADR-U043 pass at the gate).
4. **Feature IDs (directory-verified):** FEAT-PC025 ↔ FEAT-H040. Cycle tasks TASK-ADMF-01/02 by the house default.
5. **The sequence after ADM-F:** ADM-G (WF-2, suspended-groups-only admin access) → N-E (WF-1 bell-answerable invitations + the polish rider) → AB-6 (the FULL audit, Phase-4 cutover's entry condition).
6. **Standing items:** TASK-E2E-02 (the consented-fixture cleanup leak, 1,289 detritus users measured — the purge decision is Stefan's; note the census size underpins pagination-test expectations) · TASK-E2E-01 (the profile.spec flake — watch condition met, ~2 h fix due at a boundary) · the deferred Eid piles unchanged.

## What this half-session did (after the `2026-08-03_05` close ritual)

- Walked ADM-E live with Stefan: A/B/C/D all passed; WA-1 ruled + built red-first + merged + re-verified in-walk (#403); WA-2/WA-3/WA-4 recorded as directives (#404); verdict appended (#405).
- WA-3 was found by Stefan's question, then verified in the function body: `admin_hard_delete_user` has no consent handling — the cascade (DS-5 forum reattribution, DS-3 enrolments, membership/personal-group cascade, users + auth rows) is real but reachable only for consent-less members today. No test tier ever covered the consented case.
- WA-4's timeline was substrate-proven (the sweep worked at 22:17:40; the "surviving" tab was a fresh re-sign-in at 22:19:22; force sign-out is a sweep, not a lock — Suspend is the lock).
- The WF-1 probe resolved as-designed (slotted N-E); the `role_assigned`-vs-`stewardship_nomination` distinction explained, no directive.
- The ADM-F substrate walks ran delegated and landed in the committed dossier.

## Close ritual (this handoff)

- [x] Walk findings + verdict committed (#403–#405); discovery synced after each merge
- [x] The ADM-F dossier + this bridge committed (the handoff PR); discovery synced after merge
- [x] No doc-health run owed beyond the `2026-08-03_05` disposition (unchanged)
- [x] Checkout left on main, clean
