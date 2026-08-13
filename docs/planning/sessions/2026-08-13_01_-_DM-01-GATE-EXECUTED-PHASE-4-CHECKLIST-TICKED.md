# Session bridge — DM-01 gate executed; Phase-4 checklist ticked 7 of 9

**Date:** 2026-08-13 (session 24) · **Wave:** Ferd · **Phase:** 4 — **two items from closing**
**Continues:** [`2026-08-12_01`](./2026-08-12_01_-_PHASE-4-CLOSED-DB-RESET-SEEDED-TEARDOWN-COMPLIANT.md).

---

## READ THIS FIRST

1. **`TASK-DM-01` / FEAT-PD018 is DONE** — migration `20260812120000` applied, PR #526 merged. Direct messages no longer outlive the people in them.
2. **Phase 4's exit checklist is ticked 7 of 9, against evidence.** The two open items are named in the [plan](../hub-v2/phase-4-cutover-plan.md): the **ADR-U043 performance pass** (deferred on purpose — see below) and **Stefan's gate verdict**.
3. **The performance pass is the ONLY substantive work left in Phase 4**, and it is blocked on data, not on effort. Do not run it against the current database.
4. **A correction carried forward:** earlier in this session I repeatedly said DM-01 was "queued for a new session". It was already built, on the branch the session was standing on. The lesson is mundane and worth keeping — **check the branch, not the narrative**.

## What DM-01 shipped

Content-level tombstone, per the ruling: the erased member's DM bodies go (`content` NULL, `is_deleted` true); the thread shape and the survivor's own words stay. A DM thread left with no participant but the departing member is deleted outright — the structural fix for the 557-thread residue class, not a sweep of it.

**The implementation was strong on the parts that usually get skipped:** a real ADR-U016 cascade specification splitting the five paths on a principled distinction (*"exit is a removal; delete is an erasure"*), and an argument that the Mist leg is **empty by construction** — `get_or_create_dm_conversation` refuses a temporary actor *and* a temporary recipient, so no Mist can be party to a DM. `admin_hard_delete_user`'s false cascade comment is corrected in place.

## What the gate review caught — the fourth instance of a named class

The migration changed **shipped semantics** without the **sibling-assertion sweep** `docs/platform/CLAUDE.md` requires. That rule exists because the class had already bitten three times; this is the fourth.

`PC017 S5b` was invalidated in **three** places, and the third mattered most: an assertion that the surviving party could still read the departed member's words. **That assertion was the exposure the tombstone closes** — left standing, the suite would have kept pinning the behaviour the ruling retired. All three adapted; the sweep is now named in the migration header.

**One error of mine, recorded because it would mislead a later reader:** I first keyed the tombstone assertion on `sender_group_id IS NULL`. Wrong path — `delete_own_account` **decommissions** and leaves the personal group standing, so the FK never nulls. It is keyed on `is_deleted`. The null-sender shape belongs to hard-delete, where the group actually goes.

## Numbers at close

Full integration **1181/1181 across 84 suites** · platform conformance **30/30** · PD018 suite **9/9** · teardown reports *"Clean — every fixture was torn down by its own suite"* · applied ACLs read at the gate (the DS-5 fact handler sealed from client roles; nothing `anon`-reachable) · zero open PRs · dashboard refreshed · discovery synced.

## NEXT SESSION

**1. Stefan creates 5 test users.** On **`@example.com`** — *not* `.test`, which the integration teardown sweeps. Then walk enough to put realistic data behind them.

**2. The ADR-U043 performance pass**, and only then. The dev DB currently holds **one account**; an authenticated waterfall measured against it returns flatteringly fast numbers that mean nothing, and a green gate built on that is worse than no gate. The pass itself is never skipped (P4-3) — this is a **timing** decision, not an exemption.

**3. Stefan's verdict — "v2 is the Hub"** — closes Phase 4.

**4. Then the Ferd wave close** — a separate human-verified DoD walk under the `wave-planning` skill. `docs/planning/waves/ferd.md` is still an empty stub and will need writing there.

## Standing items

- **`TASK-SEC-02`** — table-grant narrowing is 12 of 42, TRUNCATE never in the revoke recipe. Not exploitable; **the gate is the deliverable, not the sweep**.
- **Subject-less consent** — swept per run (containment). Whether such a row should be creatable at all (`NOT NULL`) is open, filed under TASK-DM-01's notes.
- **SEAL-01's surface half** — the Hub admin rendering of the sealed label. The contract carries the state; nothing displays it.
- **Admin conversation sight has two homes** — suspended-scope still lives in the member contract (FEAT-PC026). Pre-existing; worth an anatomy note.
- Carried unchanged: G-3 · `TASK-E2E-03` · E2E-04's integration half · `ROADMAP.md` at Eid kickoff · the done-sweepable tension · AC4-O1 watch.
