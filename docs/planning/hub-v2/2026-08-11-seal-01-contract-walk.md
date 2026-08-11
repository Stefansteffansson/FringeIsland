# TASK-SEAL-01 — contract walk (the DoR), and a blocking premise error

**Date:** 2026-08-11 · **Phase-4 W7** · **Status: BLOCKED — needs Stefan's ruling before decomposition.**
**What this is:** the [task's own Definition of Ready](../backlog/tasks/TASK-SEAL-01-sealed-thread-admin-sight.md) — *"contract walk against live signatures … decide at decomposition with file:line evidence"* and the ADR-U016 cascade check. It was done first, and it stopped the build.

---

## The finding, in one line

**As ruled, the contract would return nothing. Ever.** Bound 1 scopes admin sight to groups with `status = 'suspended'`, but a sealed thread only ever exists in a group whose status is `closed`. The two sets are disjoint by construction.

## The evidence (live dev DB `jveybknjawtvosnahebd`, read-only)

**1. There is exactly one writer of `sealed_at` in the entire schema.**
`ds5_lifecycle_group_closed(p_group_id uuid, p_reason text)`. It accepts **only** `'group_closed'` or `'group_archived'` and raises `22023` on anything else. It seals `kind = 'group'` conversations of the named group, idempotently.

**2. Every caller seals as part of closing that same group.** Five callers: `close_group`, `delete_group`, `delete_own_account`, `admin_exit_user_from_platform`, `admin_remove_member_from_group`. The last is the clearest — the seal fires only in its `group_closure` branch, immediately after:

```sql
IF v_scenario = 'group_closure' THEN
  UPDATE public.groups SET status = 'closed' WHERE id = p_group_id;
  ...
  PERFORM public.ds5_lifecycle_group_closed(p_group_id, 'group_closed');
```

So the seal and `status = 'closed'` are set in the same transaction, on the same group.

**3. The status vocabulary is mutually exclusive.** Live distribution: `active` 4367 · `suspended` 25 · `resting` 24 · `closed` 1. A group is in exactly one state; `closed` is not a flavour of `suspended`.

**4. There are zero sealed conversations on the dev DB today** (`sealed_at IS NOT NULL` → 0 rows, group-kind or otherwise). So the feature has no live data to have been validated against, in either scope.

**Conclusion:** an admin read gated on `is_platform_admin() AND groups.status = 'suspended'` can never encounter a sealed row, because sealing implies `closed`.

## Where the premise came from (not a careless ruling)

The task's own framing is: *"a sealed thread is where exactly that evidence lands when the author departs."* **That half is true** — departure paths (`delete_own_account`, `admin_exit_user_from_platform`, `admin_remove_member_from_group`) do reach the sealer. The error is in the *join*: those paths seal by **closing the group**, so the evidence lands in a **closed** group, while G-4's admin-sight amendment — correctly, for its own purpose — was scoped to **suspended** ones. Ruling B1 inherited G-4's scope word without re-walking where seals actually land. Two individually-true statements, an untrue conjunction.

## The decision this needs (Stefan's — it changes the ruling's scope)

| # | Option | What it means | Note |
|---|---|---|---|
| **A** | **Re-scope to `closed`** (recommended) | Admin sight of sealed group-kind threads in **closed** groups, keeping every other bound (group-kind only, labelled, audited admin door). This is where the bullying evidence actually is | Smallest change that makes B1's *intent* real. The intent was "the departed author's evidence must remain reachable"; `closed` is where that evidence sits |
| **B** | **Both `suspended` and `closed`** | Union scope | Strictly larger; the `suspended` half stays a no-op until something else starts sealing, so it buys nothing today but costs nothing either |
| **C** | **Keep `suspended`, and also seal on suspension** | Change *when* sealing happens so the original scope becomes meaningful | **Not recommended** — sealing is "this conversation is over"; a suspended group may be reactivated (`admin_reactivate_group` exists), and seals are one-way in the current design. This would change preserve-and-seal semantics to serve a scope word |
| **D** | Close the task as based on a false premise | No build | Wrong — the underlying safety need (evidence survives the author's departure) is real |

**Recommendation: A.** It preserves the ruling's purpose, keeps all four bounds intact except the scope word, and does not touch when sealing happens.

## Cascade check (ADR-U016), completed against the re-scoped option A

- **Group leaves `suspended`** — moot under A. Under the original scope this was the "wing folds" case; with `closed` the state is terminal, so nothing folds.
- **Group closes** — this is now the *entry* condition rather than an edge case. The seal is stamped in the same transaction as the status change, so there is no window where a closed group has unsealed threads.
- **Group is deleted** (`delete_group`) — the group row goes; whether conversations survive FK-wise needs one more check at decomposition. If the rows are removed, admin sight is moot for that path and only `close_group` / departure-closure paths matter.
- **The sealed member is erased** — the task asks to verify that "the seal survives erasure by D2's own preserve rule". Not yet verified; do it at decomposition, against the erasure path rather than the spec text (that is the discipline this walk just vindicated).

## What is NOT owed here

No decomposition, no spec, no migration until the scope is ruled. Building against a scope that cannot match a row would have produced a green suite, a passing gate, and a contract that never fires — the most expensive kind of pass.
