# TASK-SEAL-01 — arm sealed threads for the admin plane (bounded), per AB-6 ruling B1

**Filed:** 2026-08-10, at the AB-6 full anatomy audit ([record](../../hub-v2/2026-08-10-ab6-full-anatomy-audit.md), ruling B1 — Stefan).
**Status:** **PLATFORM HALF DONE 2026-08-11** — built, gate executed on Stefan's named approval (*"ok merge 514, apply the migration"*), migration `20260811220000` applied, PR #514 merged. Red-then-green on one suite (**6 red → 8/8**), platform conformance **30/30** incl. the invocation-axis gate accepting the new declared composition, communication slice **107/107**, and both applied ACLs read at the gate — the DS-5 body is `{postgres, service_role}`, genuinely sealed from client roles. **Surface half (the Hub admin rendering of the sealed label) is NOT built and is the paired follow-on.** Prior: **RULED — option A: scope is `closed`, not `suspended`** (Stefan: *"go with A for seal-01"*). The scope change is exhaustive, not a compromise — all five sealing paths set `status = 'closed'` and none hard-deletes the group. Bound 1 below is superseded by this ruling; bounds 2-4 stand. Prior status, kept for the record: **BLOCKED — the DoR contract walk found a premise error in the ruling's scope.** Slotted into Phase-4 as W7 (board P4-1), walk executed, build not started and deliberately not started. **As ruled, the contract can never match a row:** bound 1 scopes admin sight to `status = 'suspended'`, but the schema's single writer of `sealed_at` seals only while closing a group, so sealed threads exist only in `closed` groups — disjoint sets. Full evidence and the four scope options in [`2026-08-11-seal-01-contract-walk.md`](../../hub-v2/2026-08-11-seal-01-contract-walk.md); **recommendation is option A, re-scope to `closed`.** Needs Stefan's ruling — it changes the scope word of his own B1.
**Owner tier:** platform/domain (DS-5 contract) + platform/core (admin door) + Hub admin plane.

**HUB HALF DONE 2026-09-02 (Ferd leftovers pass; fuller-auto, no schema) — the task is complete as scoped; one rider named.** Built: `GET /api/admin/groups/[id]/closed-threads` (private BFF over `admin_get_group_conversations`: read-path identity, the admin-plane 404 collapse on every refusal incl. the ruling-A scope P0001, durable telemetry `admin.closed_group_threads_read` with thread + sealed counts — an admin-plane event, Q2); `fetchAdminClosedGroupThreads` in `lib/admin/content.ts` (unwraps the `{ group_id, conversations }` envelope; P0001/42501 → refused, P0002 → notFound); `AdminClosedThreadsSection` mounted by `AdminGroupDetail` for **closed** engagement groups only — heading "Preserved threads", the plain sentence of what the door shows and does not, every group-kind thread listed with message count and last-message date, a sealed thread wearing a **"Sealed <date>"** badge and **no open affordance** (bound 3: labelled, never live), an honest empty state, a 404 handing the drift to the parent (the H041 wing's posture). Suspended groups keep the wing and do not get this section; active groups get neither. **Red-first at every tier:** unit — route ×3, lib ×2, section ×4, detail-mount ×1 — 4 suites red at head (module absent / function absent / mount absent) → green; E2E `admin-closed-threads.spec.ts` (a steward FIM creates the group and a thread through the real doors, the REAL sealer + `status='closed'` in one statement, the shared session user elevated and demoted symmetrically) — **red at head** (the closed group's page waited 20 s for a section that did not exist; the implementation was stashed to prove it) → **1/1 green**. Lint 0; `npm run typecheck` 0; `next build` see the PR. **The rider, stated plainly:** thread **contents** of a sealed thread are not readable from the admin plane — no message-level admin contract exists (the platform half armed the list read only, and the member detail door keeps its `sealed_at IS NULL` law by bound 4). The section says so on the surface. If B1's motivation ("bullying evidence lives in messages") is to be fully realised, that is a paired platform rider with its own schema gate — not pulled here; Stefan's call for Ferd or Eid.

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
