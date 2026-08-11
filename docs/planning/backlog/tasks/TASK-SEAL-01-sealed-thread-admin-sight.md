# TASK-SEAL-01 — arm sealed threads for the admin plane (bounded), per AB-6 ruling B1

**Filed:** 2026-08-10, at the AB-6 full anatomy audit ([record](../../hub-v2/2026-08-10-ab6-full-anatomy-audit.md), ruling B1 — Stefan).
**Status:** **RULED 2026-08-11 — option A: scope is `closed`, not `suspended`** (Stefan: *"go with A for seal-01"*). Unblocked; ready for decomposition as a schema-gated cycle. The scope change is exhaustive, not a compromise — all five sealing paths set `status = 'closed'` and none hard-deletes the group. Bound 1 below is superseded by this ruling; bounds 2-4 stand. Prior status, kept for the record: **BLOCKED — the DoR contract walk found a premise error in the ruling's scope.** Slotted into Phase-4 as W7 (board P4-1), walk executed, build not started and deliberately not started. **As ruled, the contract can never match a row:** bound 1 scopes admin sight to `status = 'suspended'`, but the schema's single writer of `sealed_at` seals only while closing a group, so sealed threads exist only in `closed` groups — disjoint sets. Full evidence and the four scope options in [`2026-08-11-seal-01-contract-walk.md`](../../hub-v2/2026-08-11-seal-01-contract-walk.md); **recommendation is option A, re-scope to `closed`.** Needs Stefan's ruling — it changes the scope word of his own B1.
**Owner tier:** platform/domain (DS-5 contract) + platform/core (admin door) + Hub admin plane.

## The ruling this task realizes

Sealed conversation threads (preserve-and-seal, C-E board D2 / FEAT-PD012: `sealed_at IS NOT NULL`
rows are excluded from every live read) are today invisible to the admin plane too — verified against
the live definition of `get_group_conversations` at the audit. G-4 (ADM-G board) ruled admin sight of
suspended groups includes group-kind conversations *because bullying evidence lives in messages*; a
sealed thread is where exactly that evidence lands when the author departs. **Ruling B1: the contract
arms sealed threads for the admin plane, bounded.**

## The bounds (part of the ruling, not open for reinterpretation at build)

1. **Suspended-scope only** — same scope as the G-4 helper amendment; no admin sight of sealed
   threads in groups in good standing.
2. **Group-kind conversations only** — direct conversations stay outside admin sight (G-4's own line).
3. **Labelled** — the surface renders the sealed state explicitly; a sealed thread is never
   presented as live.
4. **Through the audited admin door** — the admin plane's durable read telemetry applies
   (`app/api/admin/...` conventions: no shell, never-cached, audited reads). No member-plane leak:
   `get_group_conversations`' own `sealed_at IS NULL` law is untouched; the arm is a new or amended
   **admin** contract, platform-side (ADR-U038 — the visibility change lands below the Platform API,
   never in the route).

## Definition of ready for the build cycle

- Contract walk against live signatures (which admin read carries it: extend the ADM-G suspended-scope
  helper family vs a dedicated `admin_*` read — decide at decomposition with file:line evidence).
- Cascade check (ADR-U016): what happens to the arm when the group leaves `suspended` (wing folds),
  when the group closes, when the sealed member is erased (the seal survives erasure by D2's own
  preserve rule — verify).
- Vertical impact: Privacy/GDPR leg is load-bearing (reading departed members' preserved content —
  document the legitimate-interest basis mirroring the ADR-U052 §4 posture); Observability leg is the
  audited read.
- One schema gate, held for the named approval per the standing rule.
