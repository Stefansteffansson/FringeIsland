# Every refusal-audit row in the admin family is dead code — the INSERT is rolled back by its own RAISE

---
id: TASK-RDC-03
title: "admin_* refusal auditing never persists: INSERT-then-RAISE in one transaction discards the row. 0 of 6 619 audit rows are refusals."
status: review
assigned_to: unassigned
priority: medium
owner: platform/core/governance
wave: ferd
depends_on: []
estimated_hours: 3
---

## What was found

While building [FEAT-PC029](../../../platform/core/features/FEAT-PC029-role-template-catalogue-disposal-contracts.md) (2026-08-10), a test cell asserting *"a refusal writes a refusal row"*
failed. It was not a test bug.

The admin family's refusal pattern is:

```sql
insert into public.admin_audit_log (...) values (..., 'x.retire_refused', ...);
raise exception '...' using errcode = '42501';
```

**The `RAISE` aborts the transaction, so Postgres discards the `INSERT` with it.**
The refusal row never lands. This has been true since these functions shipped.

## Measured against the live catalogue, 2026-08-10

| | |
|---|---|
| `admin_audit_log` rows total | **6 619** |
| distinct actions | **46** |
| rows matching `%_refused` | **0** |
| successful `role_template.retire` | 118 |
| `role_template.retire_refused` | **0** |

Zero refusal rows have ever been written, against 46 distinct action types.

## Why it matters

- **A spec asserted it as fact.** PC029's own resolved open question records: *"Retire is
  idempotent and audits its refusals. STORY-2's guard should match that posture."* The first
  half is true; the second is not, and PC029 was told to copy it.
- **Observability (V4) claims coverage it does not have.** "Refusals are never swallowed" is
  true at the caller — the exception surfaces verbatim — but the *audit trail* records nothing.
  A reviewer reading the function body would reasonably conclude refusals are traceable.
- **It is dead code that reads as live code**, which is the exact failure mode
  `docs/platform/CLAUDE.md` warns about for TASK-SEC-01: a wrong belief written into a body,
  then inherited by the next reader.

## Scope

Every `admin_*` function that writes an audit row immediately before a `RAISE`. Known at time
of filing: `admin_retire_role_template` (`retire_refused`), `admin_delete_role_template`
(`delete_refused`, added by PC029 and equally dead — it shipped applied and should be corrected
by the same pass, not separately). **Grep the family before scoping** — 46 distinct actions
exist and the `%_refused` names in the code are the population to enumerate.

## Options (not yet decided — this is a finding, not a ruling)

1. **Delete the dead INSERTs.** Honest and cheap. The audit trail then simply does not record
   refusals, and the Observability vertical text is corrected to say so.
2. **Make refusal auditing real.** Postgres has no autonomous transactions; the options are a
   `dblink`/`pg_background` side-channel (heavy, new extension surface) or returning a refusal
   *result* instead of raising (a contract change across the family, and callers currently rely
   on the exception).
3. **Audit refusals at the caller.** The BFF route catches the error and posts an audit row.
   Moves a platform obligation into a Surface, which ADR-U038 forbids as the *sole* home of a
   rule — so only viable as defence-in-depth beside option 1.

**Recommendation: option 1**, plus correcting the vertical text — unless refusal traceability is
genuinely wanted, in which case option 2's contract change deserves its own ADR.

## RULING — 2026-08-10, Stefan Steffansson

**Option 1: delete the dead INSERTs.** Refusals are deliberately not audited; the Observability
wording and PC029's resolved-open-question text are corrected to say so. **Plus a folded-in
second correction** (ruled in the same sitting, see below).

### The enumeration AC#1 demanded — and what it corrected

Read from `pg_proc`, not from migration text, 2026-08-10. **The filing was wrong in both
directions:**

| Function | Filed as | Actually |
|---|---|---|
| `admin_retire_role_template` | in scope | **in scope** — `retire_refused`, dead |
| `admin_publish_role_template` | **not named** | **in scope** — `publish_refused`, dead |
| `admin_delete_role_template` | "correct in the same pass" | **already clean** — `20260810120000` removed it |

Re-measured the same day: **6 808 audit rows · 46 distinct actions · 0 matching `%_refused`.**
The premise holds. Live population of dead INSERTs: **two**, not the filed set.

### The folded-in second defect — found by the same sweep

Both guards raised **`42501` for a business refusal**. `call()` in `hub/lib/admin/roles.ts:130`
collapses **every** `42501` into `refused`, which the routes turn into the admin-plane
existence-hiding **404** — so the routes' own `42501 -> 403` branches were unreachable dead code,
and:

- *"a system role template cannot be retired"* reached the admin as **"Not found"**
- *"a retired role template cannot be published"* reached the admin as **"Not found"**

about a template plainly visible in the list they were reading. This is the **same defect PC029's
corrective fixed for the delete guard**, surviving in the two siblings that guard did not touch.
Both moved to **`P0001` -> 409 verbatim**; `42501` is left to the non-admin gate, where hiding
existence is correct.

**Why the integration tier could not have caught it:** it calls the RPC directly and sees the
raise. Only the route tier crosses `call()`. Same missing-tier lesson as PC029 — and
`hub/tests/unit/components/admin/admin-roles-view.test.tsx:297` was *mocking* a response body the
real route could not produce.

### Carried out

`supabase/migrations/20260810150000_task_rdc03_dead_refusal_audits_and_business_refusal_sqlstate.sql`
· both routes' `refusalStatus` tables · two red-first route-tier E2E cells in
`hub/tests/e2e/admin-roles.spec.ts` (both demonstrated red at **404 where 409 belongs**) · the
disposal-suite pinning cell flipped from pinning-a-defect to pinning-a-ruling.

## Acceptance criteria

- [x] The full population of dead refusal-audit INSERTs is enumerated by grep, not assumed —
      read from `pg_proc`; corrected the filing in **both** directions (see Ruling)
- [x] A ruling is taken on the three options and recorded — option 1, 2026-08-10
- [x] Whichever way it goes, **no function body claims to audit something it does not**
- [x] PC029's resolved-open-question text is corrected — it currently states the false half
- [x] The Observability vertical wording for the affected features says what is actually true —
      PC027:127 and PC028:243 both claimed refusals "are recorded as refusals"; both corrected
- [x] A test pins the chosen behaviour, so it cannot silently regress either way — the disposal
      cell now pins the ruling; two route-tier cells pin the 409-verbatim contract
- [ ] **Schema gate:** migration applied, and the **applied** functions' ACLs read from `pg_proc`
      (no bare `=X/`, no `anon=X`) — held for the named approval

## Note

`hub/tests/integration/admin/role-template-disposal.test.ts` currently **pins the defect as it
truly behaves** (asserts 0 refusal rows) with a comment pointing here. When this task lands,
that cell flips deliberately rather than quietly.
