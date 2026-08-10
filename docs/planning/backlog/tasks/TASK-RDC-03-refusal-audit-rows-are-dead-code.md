# Every refusal-audit row in the admin family is dead code — the INSERT is rolled back by its own RAISE

---
id: TASK-RDC-03
title: "admin_* refusal auditing never persists: INSERT-then-RAISE in one transaction discards the row. 0 of 6 619 audit rows are refusals."
status: todo
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

## Acceptance criteria

- [ ] The full population of dead refusal-audit INSERTs is enumerated by grep, not assumed
- [ ] A ruling is taken on the three options and recorded
- [ ] Whichever way it goes, **no function body claims to audit something it does not**
- [ ] PC029's resolved-open-question text is corrected — it currently states the false half
- [ ] The Observability vertical wording for the affected features says what is actually true
- [ ] A test pins the chosen behaviour, so it cannot silently regress either way

## Note

`hub/tests/integration/admin/role-template-disposal.test.ts` currently **pins the defect as it
truly behaves** (asserts 0 refusal rows) with a comment pointing here. When this task lands,
that cell flips deliberately rather than quietly.
