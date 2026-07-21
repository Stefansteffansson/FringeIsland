# ADR-U050: The account lifecycle state machine — four states split by deactivation origin

**Status:** Proposed (rides the C-F schema gate; Accepted on the gate's named nod)
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
