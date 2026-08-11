# Oracle discharge check (Phase-4 W1) — 2026-08-11

**Scope:** [`phase-4-cutover-plan.md`](./phase-4-cutover-plan.md) W1, which blocks W2 (the destructive deletion of `hub-legacy/`).
**Canonical source:** [`behaviour-inventory.md`](./behaviour-inventory.md) — its Coverage map (lines 179-193) is the index of what the oracle guarantees. Nothing else overrides it.
**Author:** W1 agent, read-only pass. No file was edited other than this note.

---

## 1. Verdict

**YES — safe to delete, with named exceptions.**

Every STRONG/PARTIAL row in the Coverage map is accounted for. **Zero UNACCOUNTED findings.** Nine of nine in-scope rows are realized in the v2 tree; within A-ADM, six individual oracle rows are deliberately deferred or not carried, each with a dated, cited home. The named exceptions in section 4 are **pinning and paper-trail gaps, not lost behaviour** — no exception describes a guarantee that has silently vanished.

Two facts materially de-risk the deletion:

- **The deletion is reversible.** [`phase-4-cutover-plan.md:33`](./phase-4-cutover-plan.md) (P4-7) records the retrieval form: an annotated tag `hub-legacy-final` on the pre-deletion commit, one-command retrieval via `git show hub-legacy-final:...`. The oracle becomes unreachable-by-default, not destroyed.
- **The v2 suite is materially larger than the oracle.** 294 test files under `hub/tests/**` versus 70 under `hub-legacy/tests/**` (both counted via `git ls-files`). The oracle's ~69-file scale claim (inventory line 12) checks out against disk at 70.

---

## 2. Method, and what was actually checked

**Exhaustive at the row level; traced at the guarantee level; not exhaustive at the case level.** Stated plainly:

- **Exhausted:** all 10 Coverage-map rows. Nine are in scope (STRONG / VERY STRONG / PARTIAL). A-COI is marked **NONE** and is therefore out of W1's scope by the task's own definition — it has no oracle to discharge.
- **Traced individually:** roughly 40 named guarantees drawn from the inventory's body sections (lines 22-164), including all ten "hard invariants the oracle locks" at inventory line 172, plus all six cross-cutting findings at lines 168-176.
- **NOT done:** I did not re-derive the ~650 individual legacy test cases. The inventory is the synthesis, and the exercise's premise is that the inventory suffices. I did not read `hub-legacy/` source to decide anything. I checked `hub-legacy/tests/` file *names* only, once, to sanity-check the inventory's scale claim (it holds).
- **NOT done:** I did not execute any test suite. "BUILT" throughout means *the assertion exists on disk at the cited line*, not that it passes today. See section 6.

**Techniques:** `git grep -n` across `hub/tests/**`, `docs/planning/hub-v2/**`, `docs/products/hub/**`, `docs/platform/**`; targeted line-range reads of the area gates and completion plans. `find` was avoided — on this box it resolves to `find.exe` and returns silent zeros.

**One structural observation about the paper trail.** Only **A-ADM** carries a row-by-row oracle disposition table ([`2026-08-02-platform-ops-area-gate.md:53-72`](./2026-08-02-platform-ops-area-gate.md)). **A-COM** carries an ID-by-ID walk asserted at its gate ([`2026-07-21-communication-area-gate.md:18`](./2026-07-21-communication-area-gate.md): "B-MSG-001..006 + B-COMM-004..007 walked ID-by-ID against the v2 suites"). For the remaining seven rows no gate performed an explicit oracle-ID discharge, so **I established behaviour-level evidence directly from the v2 suites** rather than inheriting a gate's claim. That is why this note cites test file:line rather than gate verdicts for those rows.

**Tag traceability, honestly.** The inventory's B-* test IDs appear in 13 v2 test files (21 distinct tags) and 9 hub-v2 planning docs (57 distinct tags). Most v2 tests were written fresh against canon and carry no B-* tag, so tag absence is not evidence of absence — which is exactly why the checks below are behavioural.

---

## 3. Per-area disposition

| Area | Inventory strength | Disposition | Evidence (file:line) |
|---|---|---|---|
| **Permission model (PC-3)** | VERY STRONG | **BUILT** (2 pin exceptions, section 4) | `hub/tests/integration/groups/role-permission-contracts.test.ts` — 39 spec cells. Catalog completeness + category grouping runtime-derived at `:196-197`; anti-escalation at definition time `:345` and assignment time `:641`; last-Steward-equivalent binding refused `:677`; custom-role CRUD + uniqueness `:302,:369`; template instantiation copies grants `:262`. Direct-write refusals (ADR-U038 door) `:842,:872,:888,:907,:939`. Myself zero-perm role: `hub/tests/integration/auth/mist-substrate.test.ts:63-77`. Templates: `hub/tests/integration/admin/role-template-editing.test.ts:222,:278` |
| **RLS (V4)** | STRONG | **BUILT** | Direct-ID bypass prevention is pinned as indistinguishability: `role-permission-contracts.test.ts:218` ("raises P0002 for a non-member on a private group AND a nonexistent id — indistinguishably"); public-group read `:228`; no-leak on foreign/ghost ids `:652,:778`. Browser tier: `hub/tests/e2e/groups.spec.ts:129` (private group 404s for a non-member). Status-driven revocation: `hub/tests/integration/groups/group-availability-enforcement.test.ts` |
| **Security — frozen enrolments + non-public journeys** | STRONG | **BUILT** | Frozen: `hub/tests/e2e/frozen-and-group-progress.spec.ts:146-161`; closure cascade freezes non-public, leaves public alone `hub/tests/integration/groups/group-closure-deletion.test.ts:401`; paused+active freeze `hub/tests/integration/groups/group-of-groups.test.ts:508`. Non-public visibility: `hub/tests/integration/auth/farewell.test.ts:95` |
| **A-GRP Groups & belonging** | STRONG | **BUILT** | Email invite + auto-claim at sign-up `hub/tests/e2e/invitations.spec.ts:156`; cancel/decline `:189`; nomination accept + sole-Steward transfer `hub/tests/e2e/leadership-transfer.spec.ts:127`; all-decline DeusEx fallback `:202`; steward_handover `hub/tests/integration/account/account-lifecycle-self-service.test.ts:487`; last-member closure + journey reassignment `group-closure-deletion.test.ts:401`; member search `hub/tests/integration/admin/member-enumeration-bounded.test.ts:264` |
| **A-ADM Platform operations** | STRONG | **BUILT** (13 of 18 ADM rows) **+ 6 oracle rows DEFERRED-WITH-OWNER** | Row-by-row table: [`2026-08-02-platform-ops-area-gate.md:53-72`](./2026-08-02-platform-ops-area-gate.md). Gate CLOSED `:5`. Audit append-only + every-action-writes PORTED AND STRENGTHENED `:62`; last-DeusEx floor PORTED `:61`; decommission invariant `:63`; hard delete + sentinel reassignment `:64`; force logout `:71` |
| **A-COM Communication** | STRONG | **BUILT** | Gate PASS with riders dispositioned [`2026-07-21-communication-area-gate.md:57`](./2026-07-21-communication-area-gate.md); ID-by-ID oracle walk `:18`. Flat-threading trigger `hub/tests/integration/communication/forum-contracts.test.ts:264`; group-keyed authorship `hub/tests/integration/communication/conversation-contracts.test.ts:34`; permission-not-role-string refusals `:380`, `forum-contracts.test.ts:213` |
| **A-NTF Notifications** | STRONG | **BUILT** | `hub/tests/integration/notifications/oracle-spine-port.test.ts` — the deliberate port, 12 B-* tag citations. Smart/actionable + read-state + keyset pagination `hub/tests/integration/notifications/notification-contracts.test.ts:289`. Gate CLOSED [`2026-07-27-notifications-area-gate.md:5`](./2026-07-27-notifications-area-gate.md) |
| **A-JRN Journeys** | STRONG | **BUILT** | Gate PASSED with one labelled exception [`2026-07-19-journeys-area-gate.md:66`](./2026-07-19-journeys-area-gate.md); area closed `:68` (six cycles J-A..J-F, six paired features `6-done`). Catalogue + enrolment incl. the dual-enrolment open question `hub/tests/integration/journeys/journey-catalogue-enrolment-contracts.test.ts:37,:368-372`; progress/steps `hub/tests/integration/journeys/journey-step-progress-contracts.test.ts` |
| **A-IDN Identity** | PARTIAL | **BUILT** — both the STRONG half and every NONE sub-row | STRONG half: `hub/tests/integration/auth/signup.test.ts`, `signin.test.ts`, `hub/tests/integration/profile/own-profile-contract.test.ts`. Plan status **COMPLETE (2026-07-21)** [`phase-3-identity-completion-plan.md:3`](./phase-3-identity-completion-plan.md). The oracle's NONE sub-rows are now built — see section 5 |
| **A-DIS Discovery** | PARTIAL | **BUILT** (oracled half) **+ DS-6 recorded unconsumed** | Journey catalogue: `journey-catalogue-enrolment-contracts.test.ts`; member search: `member-enumeration-bounded.test.ts:263-264`. DS-6 ranking deliberately unconsumed in Ferd, recorded at [`phase-3-platform-ops-completion-plan.md:111`](./phase-3-platform-ops-completion-plan.md) |
| *A-COI Companion & Insight* | *NONE* | *out of W1 scope* | *No oracle exists; post-Ferd (DS-1/DS-7), inventory line 192* |

### The six A-ADM oracle rows deferred or not carried

All six carry a cited home. None is a silent loss.

| Oracle row | Disposition | Home (file:line) |
|---|---|---|
| B-ADMIN-013 selection model | DEFERRED to Eid with ADM-7 | gate `:68`; deferred register [`phase-3-platform-ops-completion-plan.md:95`](./phase-3-platform-ops-completion-plan.md) |
| B-ADMIN-014 action-bar bulk logic | DEFERRED to Eid with ADM-7 | gate `:69`; plan `:95` |
| B-ADMIN-004/006 auto-grant verification *view* | Mechanism PROVEN, view DEFERRED as ADM-13 | gate `:60`; plan `:96` |
| B-ADMIN-012 admin **add-to-group** | NOT CARRIED — no §L3 row mandates it; joining stays invitation-based for admins too | gate `:67` ("Recorded, not lost") |
| B-ADMIN-015 admin per-recipient DM | NOT CARRIED — superseded by `admin_send_notification`; sanction communication resolved to Eid | gate `:70` (CB-1 to DB-4) |
| B-PERF-001 pagination on the users API | SUPERSEDED — pagination deliberately absent until a payload measurement asks | gate `:72` |

The wider deferred register (ADM-7, 13, 14, 15, 17 — five of 18 ADM capabilities) is at [`phase-3-platform-ops-completion-plan.md:89-99`](./phase-3-platform-ops-completion-plan.md), each row with a plain-language rationale and a revisit trigger, and was presented row-by-row at the gate ([`2026-08-02-platform-ops-area-gate.md:78-82`](./2026-08-02-platform-ops-area-gate.md)).

---

## 4. UNACCOUNTED findings

**None.** No STRONG or PARTIAL guarantee was found to be neither built nor deferred.

Three **named exceptions** are recorded instead. Each is a *pinning* gap — the behaviour holds structurally and is documented — not a lost guarantee. They are listed because W1's job is to surface them, not because any blocks W2.

**E1 — B-RBAC-023 (catalog immutable to end users) has no executable test in v2.**
The oracle asserted by test that authenticated users cannot INSERT into the permission catalog. In v2 the guarantee holds **by substrate seal rather than by assertion**: RLS is SELECT-only `TO authenticated USING (true)` with no write policy ever and no table GRANTs, so no client write path exists — verified by a documented sweep at [`2026-08-04-admf-substrate-dossier.md:27`](./2026-08-04-admf-substrate-dossier.md) ("exactly 8 hits, all top-level seed/migration DML; none in any function body") and restated at [`FEAT-PC025:17`](../../platform/core/features/FEAT-PC025-role-template-editing-and-walk-rider-contracts.md). A `git grep` for any client write against `public.permissions` in `hub/tests/**` returns **zero hits**. The analogous door *is* pinned for the three role tables (`role-permission-contracts.test.ts:842-939`) but not for the catalog table itself. **Consequence of deleting the oracle:** if a future migration adds a write policy or GRANT to `permissions`, no test fails. Cheap fix, not a blocker.

**E2 — the oracle's exact-count pins are retired by decision, and the template grant counts are not re-pinned.**
The inventory's "exactly 44 permissions" (line 26) and the template composition counts "Steward 31, Guide 15, Member 12, Observer 7" (line 36) no longer hold as written. [`FEAT-PC025:18`](../../platform/core/features/FEAT-PC025-role-template-editing-and-walk-rider-contracts.md) live-counted the catalogue at **48** (46 seeded + `create_group_conversations` + `rest_group`) and states plainly: *"The carried 44 is retired."* This is a deliberate, dated supersession, and the *integrity* guarantee survives in stronger form — `role-permission-contracts.test.ts:196-197` derives the count at runtime and asserts every catalog entry carries name **and** category, which also discharges the oracle's "grouped by category" clause. **However:** the four template grant counts are not re-pinned anywhere, and the oracle's "every permission has a description" clause is not pinned either (v2 pins name + category). Both are recorded as a known state at [`FEAT-PC025:23`](../../platform/core/features/FEAT-PC025-role-template-editing-and-walk-rider-contracts.md) ("The B-RBAC exact-count pins barely exist") and [`2026-08-04-admf-substrate-dossier.md:33`](./2026-08-04-admf-substrate-dossier.md). Accounted, but worth a conscious nod rather than a silent inheritance.

**E3 — two A-ADM drops are permanent and carry no revisit date.**
B-ADMIN-012's admin add-to-group and B-ADMIN-015's admin per-recipient DM are marked NOT CARRIED at gate lines `:67` and `:70`. Both have a recorded rationale and B-ADMIN-015 names Eid for sanction communication, so neither is unaccounted. But unlike the deferred five, neither has an activation point. If the intent is "never", that is a decision worth stating as such at cutover close rather than leaving as a gate-table aside.

---

## 5. Silences disposition (inventory cross-cutting findings, lines 168-176)

The inventory's finding 5 names the behaviours the old suite did **not** cover, to be specified fresh from canon. **Every one is now dispositioned, and all but one are built** — the v2 tree materially exceeds the oracle here.

| Silence (inventory line 174) | Disposition | Evidence |
|---|---|---|
| Consent state/history + granular consent (IDN-6/7) | **BUILT** | `hub/tests/integration/account/consent-read.test.ts:126,:238`; `consent-write.test.ts:165`; `hub/tests/unit/components/consent/` (3 files); `hub/tests/e2e/consent.spec.ts` |
| Data export (IDN-8) | **BUILT** | `hub/tests/integration/account/data-export.test.ts:129`; `export-completeness-invariant.test.ts`; `export-composite.test.ts`; `hub/tests/e2e/export.spec.ts` |
| Private Journal (IDN-5) | **BUILT** | `hub/tests/integration/journal/journal-contract.test.ts:281`; `journal-erasure-export.test.ts`; `hub/tests/unit/components/journal/`, `hub/tests/unit/app/journal/` |
| Sentinel-author reassignment of orphaned content | **BUILT** | [`2026-08-02-platform-ops-area-gate.md:64`](./2026-08-02-platform-ops-area-gate.md) — "cascade + sentinel reassignment + audit-before-delete" (gate-2 STORY-4) |
| Former-member attribution (COM-14 / MEM-9) | **BUILT** | `hub/tests/e2e/forum.spec.ts:12-14,:65` — "a member's post, after the member leaves the group ... Former member — the MEM-9 un-seam, rendered". Gate-verified at [`2026-07-21-communication-area-gate.md:12`](./2026-07-21-communication-area-gate.md) |
| Real-time push delivery | **BUILT** | `hub/tests/unit/lib/realtime/` (5 files); `hub/tests/e2e/realtime.spec.ts`; hint mechanism `ds5_emit_hint` documented at [`2026-08-04-admf-substrate-dossier.md:39`](./2026-08-04-admf-substrate-dossier.md) |
| Per-device session inventory (IDN-11) | **BUILT** | `hub/tests/e2e/sessions.spec.ts:5,:94` (FEAT-H012 against live FEAT-PC009); `hub/tests/integration/account/sessions.test.ts`; feasibility gate PASSED [`phase-3-identity-completion-plan.md:49`](./phase-3-identity-completion-plan.md) |
| Mist lifecycle (IDN-1/2, JRN-5) — finding 1, the "most deliberate fresh design" | **BUILT** | `hub/tests/integration/auth/mist-substrate.test.ts`, `mist-continuity.test.ts:70`, `mist-transcendence.test.ts`, `mist-reaper.test.ts:142` (scheduled reaper, FEAT-PC002); `hub/tests/e2e/entry.spec.ts:5` (FEAT-H003 Mist arrival); erasure `hub/tests/integration/auth/farewell.test.ts:89-95` |
| A-DIS recommendations / DS-6 | **DEFERRED-WITH-OWNER** | DS-6 ranking stays unconsumed in Ferd, recorded at [`phase-3-platform-ops-completion-plan.md:111`](./phase-3-platform-ops-completion-plan.md) |
| All of A-COI | **out of scope** | NONE row; post-Ferd DS-1/DS-7 (inventory line 192) |

**The other cross-cutting findings:**

- **Finding 2 (group-keyed authorship / four-hop actor is the spine, "preserve byte-for-byte")** — preserved and pinned: `has_permission(p_acting_group_id, ...)` exercised at `hub/tests/integration/groups/group-availability-enforcement.test.ts:638`; DM `sender_group_id` and forum `author_group_id` at `conversation-contracts.test.ts:34` and `forum-contracts.test.ts`; the auth-vs-actor id distinction called out explicitly at `hub/tests/integration/admin/moderation-and-audit-contracts.test.ts:121`. Group-as-actor has its own ADR (U041) and suite (`group-of-groups.test.ts`).
- **Finding 3 (ten hard invariants)** — all ten traced. Last-Steward `role-permission-contracts.test.ts:677`; last-DeusEx floor gate `:61` and `member-administration-operations.test.ts:98`; append-only audit gate `:62`; frozen immutability `group-closure-deletion.test.ts:401`; template-copy independence `FEAT-PC025:19` (snapshot-now is the physics) and `role-template-editing.test.ts:278`; anti-escalation `:345,:641`; decommission-preserves-history gate `:63`; RLS direct-ID prevention `:218`; instant revocation `group-availability-enforcement.test.ts`; flat-threading trigger `forum-contracts.test.ts:264`.
- **Finding 4 (vocabulary drift Visitor/Guest to Mist)** — executed as an adapt, pinned by a test: `hub/tests/integration/auth/mist-substrate.test.ts:117` ("renames the vestigial Visitor system group / Guest role to Mist").
- **Finding 6 (inline journey content to DS-4 externalisation)** — decided deliberately, not drifted: ADR-U044 step substrate, cited in the Journeys gate closure at [`2026-07-19-journeys-area-gate.md:68`](./2026-07-19-journeys-area-gate.md).

---

## 6. Honest limits

What this note does **not** establish, stated plainly so nobody over-reads it:

1. **No suite was executed.** Every "BUILT" means the assertion exists at the cited line, not that it is green on today's dev DB. If W1 is meant to certify a passing suite, that is a separate run and this note does not substitute for it.
2. **The inventory is trusted as the synthesis.** Per the task's framing I did not read `hub-legacy/` source. If the inventory under-reports a guarantee the old suite actually made, this check inherits that blind spot exactly. The only independent cross-check I performed was the file-count sanity check (70 vs the claimed ~69), which passed.
3. **Behaviour equivalence was not proven, only presence.** I confirmed that a v2 test asserts the named guarantee; I did not diff v2 semantics against legacy semantics case-by-case. Several rows are explicitly ADAPTED rather than ported (gate lines `:57`, `:58`, `:59`, `:67`, `:71`, `:72`), and adaptation is a deliberate, recorded design choice — but "adapted" is not "identical", and this note does not claim otherwise.
4. **Seven of nine rows lack a gate-authored oracle discharge.** Only A-ADM has a row-by-row table and only A-COM asserts an ID-by-ID walk. For the other seven the evidence in section 3 is mine, gathered at W1 time. That is weaker provenance than a gate-time walk performed by the people who built the area, and it is the main reason the verdict carries "with named exceptions" rather than a bare yes.
5. **E1's substrate seal is documented, not re-verified live.** I relied on the ADM-F dossier's sweep and PC025's restatement. I did not query the live database to confirm that `permissions` still has no write policy or GRANT today.

---

*Produced 2026-08-11 by the Phase-4 W1 discharge check, read-only, against [`behaviour-inventory.md`](./behaviour-inventory.md) as the single canonical source.*

---

## 7. Live-verification addendum (added at review, same day) — limit 5 closed, and a documented premise corrected

Section 6 limit 5 said E1's substrate seal was *documented, not re-verified live*. It has now been queried against the dev database (`jveybknjawtvosnahebd`, read-only). **The seal holds — but not by the mechanism the documentation states.**

**What is true:** `public.permissions` has RLS **enabled** with exactly one policy, `auth_read_permissions` (SELECT, `authenticated`), and **zero write policies**. INSERT/UPDATE/DELETE from a client role are therefore refused. E1's conclusion — the guarantee holds structurally — **stands, verified.** The same holds for `role_templates` and `role_template_permissions`. Across the whole schema, **all 42 public tables have RLS enabled; none is unprotected.**

**What is false:** the ADM-F dossier's stated reason — *"no table GRANTs"* — is **not true on the live database.** `anon` and `authenticated` both hold `INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, SELECT` on `public.permissions`. RLS, not the absence of grants, is what stops the writes. The conclusion was right; the reason given for it was wrong. Recording this because a correct conclusion resting on a false premise is exactly the failure class this project has been bitten by repeatedly, and it would have been inherited silently when the oracle went.

**The wider shape, measured (this is the part worth acting on):**

| Fact | Count |
|---|---|
| Public tables | 42 |
| RLS enabled | **42 of 42** |
| `authenticated` still holds the default INSERT grant | **30 of 42** |
| `authenticated` still holds TRUNCATE | **33 of 42** |
| Tables where INSERT was deliberately revoked (the ADR-U038 narrowing) | 12 |
| …of those 12, TRUNCATE **not** revoked | 4 (`content_families`, `journey_enrollments`, `role_template_publications`, `step_kinds`) |

So the table-grant narrowing that ADR-U038 began is **partial — 12 of 42 tables** — and **TRUNCATE was never part of the revoke recipe**, including on four tables that were otherwise deliberately narrowed.

**Honest severity — this is NOT a live vulnerability, and should not be reported as one.** RLS refuses the DML on every table. TRUNCATE is the one verb RLS cannot gate, but PostgREST exposes no TRUNCATE verb and no `SECURITY INVOKER` function in the schema issues one, so there is no reachable path from a signed-in member today. This is **defense-in-depth debt plus a documentation error**, not an open door.

**Why it still deserves a task:** the *function*-grant analogue of exactly this class was worked three times, escalated at the [2026-07-06 retro](../retrospectives/retro-2026-07-06.md) with the explicit lesson that *"a manual sweep list that grows back is a wrong-layer pattern, not an unfinished chore"*, and closed structurally with a permanent regression gate. The **table**-grant analogue has no such gate — which is why 30 tables kept the default and four narrowed ones kept TRUNCATE. Filed as [`TASK-SEC-02`](../backlog/tasks/TASK-SEC-02-table-grant-narrowing-and-truncate-sweep.md).

**Bearing on W2:** none. Nothing here is carried by `hub-legacy/`, and deleting the oracle neither creates nor conceals it. W1's verdict is unchanged.
