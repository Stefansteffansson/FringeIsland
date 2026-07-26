# ADR-U050: The account lifecycle state machine — four states split by deactivation origin

**Status:** Accepted (2026-07-26 — the C-F schema gate it rode merged 2026-07-21; see Acceptance record)
**Date:** 2026-07-21
**Deciders:** Stefan (C-F board, F-1..F-3) · Claude (authoring)
**Technical story:** Cycle C-F (IDN-10) — FEAT-PC017 / FEAT-PC005 / FEAT-H029 / FEAT-H007. Promotes the planning-tree [account-lifecycle decision record](../../planning/hub-v2/account-lifecycle-states-decision.md) (2026-06-29), which mandated this ADR when the `paused`/origin substrate was built.

---

## Context and problem statement

`public.users` carries account lifecycle on two booleans — `is_active`, `is_decommissioned` — yielding three mechanical states. The middle state (off-but-not-closed) records nothing about **who** switched the account off, so the substrate cannot distinguish a member's own step-away from an admin hold. The 2026-06-29 decision record pinned the target model (four named states split by origin) but deferred the substrate until a self-service producer existed. Cycle C-F builds that producer (IDN-10: self-pause + self-delete), so the promotion falls due. Every account-lifecycle write on disk today is admin-gated, and the only full platform-exit path (`admin_exit_user_from_platform`) explicitly refuses self-exit — the inversion of the §L3 IDN-10 commitment.

## Decision

1. **One new column: `public.users.deactivation_origin TEXT`** (nullable; **open namespace** — values today `'member'` and `'admin'`; a future producer, e.g. `'system'`, adds a value without schema change). Written **only** by the definer-owned lifecycle bodies; no client write path. Cleared (NULL) when an account returns to active.

2. **Four states, one derivation** (the `state` label stays the open label FEAT-PC004 declared):

| State | Mechanical facts | Producer | Who may return it to active |
|---|---|---|---|
| `active` | `is_active` | — | — |
| `paused` | off, not closed, `deactivation_origin='member'` | `pause_own_account()` (the member) | the member — `reactivate_own_account()` |
| `suspended` | off, not closed, origin `'admin'` (or NULL/other) | `admin_update_user_status()` (an admin) | an admin only — never the member |
| `decommissioned` | `is_decommissioned` (invariant forces off) | `delete_own_account()` (the member) or the admin paths | nobody (terminal; `enforce_decommission_invariant()`) |

3. **Backfill rule:** every pre-existing off row backfills `'admin'` in the same migration that ships the split — the safe default (not self-reversible; today's only producer is an admin). An off row with NULL/unknown origin always reads `suspended`, never `paused`.

4. **Self-service transitions (FEAT-PC017/PC005):** `pause_own_account()` (active→paused; cascade-free), `delete_own_account()` (→decommissioned; the three-scenario membership walk ported from the retired admin path **plus** the C-E `ds5_lifecycle_group_closed` seal; F-2 private-erase via new U047 fact handlers `ds3_lifecycle_account_deleted` + `ds7_lifecycle_account_deleted`; communal content untouched — read-time tombstone per ADR-U021; sessions ended; audited), `reactivate_own_account()` (member-origin paused→active only). All three: `SECURITY DEFINER`, own-row only (no target parameter), Mist/session-less refused, granted to `authenticated` only. An admin hold is never self-escapable in any direction.

5. **Retirement:** `admin_exit_user_from_platform` is DROPped. Its scenarios live on in `delete_own_account()`; admin lifecycle control continues via `admin_update_user_status` / `admin_decommission_user` / `admin_hard_delete_user` / `erase_fim_account`; any future admin Console *full-exit* affordance is A-ADM's (COR-A F-3).

## Consequences

- FEAT-PC004's payload gains `deactivation_origin` and the `paused` state value — additive (the open-label contract absorbs it); surfaces gate the reactivation affordance on `paused`, which after the split is only ever member-origin.
- "deactivated" stays retired as vocabulary; `paused` was collision-checked against membership/enrollment status sets at the C-F board (distinct domains; the enrollment `paused` value never flows through the account `state` label).
- The Internal API grows one lifecycle fact (`account_deleted`) with two handlers; Core keeps emitting facts, never touching domain tables (ADR-U047 posture; conformance-gate enforced).
- IDN-12 (FEAT-PC005/H007) un-parks: the origin gate closes the governance hole that parked it.

## Alternatives considered

- **A typed `account_status` enum column** replacing the booleans — rejected: a sealed set (extensibility rule), a breaking change to every reader, and the booleans + origin derive the same truth.
- **Origin as audit-log inference** (read the last transition's actor) — rejected: RLS/report paths would need audit reads on a hot path; the state machine must be self-contained on the row.
- **A `pending_deletion` grace state** — rejected at the C-F board (F-3): immediate + confirm; a fifth state plus scheduler substrate is not warranted in Ferd.

---

## Acceptance record (2026-07-26)

**This ADR's own condition had already been met; only the status line lagged.** It read *"Proposed (rides the C-F schema gate; Accepted on the gate's named nod)"* — and **that gate merged on 2026-07-21**, five days before this record. Nothing about the decision changed in the interval; the flip was simply never made. Accepted at the A-NTF area gate on Stefan's named nod, and this record states the evidence so the acceptance is not taken on the gate's say-so alone.

**Every decision point above is realized on disk**, all in migration `20260721161500_c_f_account_lifecycle_self_service.sql` (on `main`, commit `f1c7451` — "Identity plan COMPLETE"):

| Decision | Realization |
|---|---|
| §1 the origin column | `ALTER TABLE public.users ADD COLUMN deactivation_origin TEXT` (L42), with the open-namespace `COMMENT` (L44) and no client write path |
| §2 four states, one derivation | `get_own_account_state` (L561) |
| §3 backfill rule | `SET deactivation_origin = 'admin'` over pre-existing off rows (L52) |
| §4 self-service transitions | `pause_own_account` (L123), `reactivate_own_account` (L191), `delete_own_account` (L257), plus the two ADR-U047 fact handlers `ds3_lifecycle_account_deleted` (L58) and `ds7_lifecycle_account_deleted` (L89) |
| §5 retirement | `DROP FUNCTION public.admin_exit_user_from_platform` (L611) |

Four feature specs closed `6-done` against it (FEAT-PC017 / FEAT-PC005 / FEAT-H029 / FEAT-H007), completing the Identity plan.

**Consequence, discharged in the same pass:** `ARCHITECTURE_ANATOMY.md` had deliberately withheld this decision — its stamp read that U050 *"is **Proposed** … and is deliberately not absorbed here until it is Accepted."* That hold is now lifted and the four-state lifecycle is absorbed into the anatomy, per TASK-DOC-005.

*Filed under the same reasoning as ADR-U039's Amendment 1: a document that shipped features depend on should not read "Proposed", because that wording implies the decision may still move when it is already load-bearing.*
