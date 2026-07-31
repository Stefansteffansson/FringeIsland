# Phase 3 — Platform-Ops (A-ADM) completion plan

**Status:** v2 (2026-07-31) — **BOARD SETTLED (Stefan: "go with recommended" — all eleven rows AB-1a..AB-8 as recommended), with one standing rider: the five capabilities AB-8 defers must be restated plainly at area close as "what this run did not do"** — see the deferred register below; the exit checklist carries the line. Cycle ADM-A decomposition may begin. Prior status (v1, same day): board OPEN, kickoff sweep complete, plan held for review. A-ADM is the sixth and last Phase-3 area (Identity, Groups, Journeys, Communication, Notifications all closed). It opens the day COR-C closed, on the just-repaired ADR-U050 admin contracts, and **every new table/function/trigger/surface it ships lands under the COR-C gate lattice from the first commit** (classification completeness, trigger licenses, export completeness, token gate, jest-axe, pinned vertical set, outer-ring closure).
**Provenance:** area-open kickoff sweep 2026-07-31 — bridge [`2026-07-31_01`](../sessions/2026-07-31_01_-_COR-C-EXECUTED-FIVE-PRS-HELD-FOUR-MERGED.md), [COR-C execution ledger](../reference/ANATOMY-CONFORMANCE-AUDIT-3.md) (register + observations), Hub spec §L3 ADM rows (`docs/products/hub/SPECIFICATION.md:328-344`), `supabase/ownership.manifest.json` (incl. the W2 export classifications), live migration set, [`behaviour-inventory.md`](./behaviour-inventory.md) B-ADMIN spine, [TASK-OBS-01](../backlog/tasks/TASK-OBS-01-telemetry-sink-and-analytics-posture.md), [TASK-INT-05](../backlog/tasks/TASK-INT-05-e2e-fixtures-leak-groups-into-the-deusex-system-group.md), [re-walk RW-05](./2026-07-30-antf-rewalk-findings.md). Load-bearing facts disk-verified at the cited lines.

---

## Where this picks up

COR-C closed 2026-07-31 (all five held PRs merged on named approval; three migrations applied; full integration green; ledger annotated). A-ADM inherits, settled-by-canon (recorded, not asked):

- **ADR-U050 admin contracts are repaired and producer-proven.** COR-C W1 re-issued `admin_update_user_status` (writes `deactivation_origin='admin'` on hold / `NULL` on release, `FOR UPDATE`) and `admin_decommission_user`; the GC-10 producer-driven suite is green; the member-escape is structurally impossible. The console builds on these exact contracts.
- **ADR-U028 routing lock (recorded at the §L3 lock):** content moderation + self-service exit stay woven in-place; the audit-log viewer (ADM-13/16), feature flags (ADM-15), and economy management route to **the Console**, whose surface status (own entity vs Hub-shell bundle) is a deferred U025/U028 decision. Board AB-7 decides the Ferd shape *without* reopening the entity question.
- **The COR-C gate lattice is in force.** New tables must classify `memberData` at birth (W2 invariant — unclassified fails red); new functions must register in the manifest (GC-1 completeness); new triggers need a license (GC-8); surfaces pass token (GC-12) + jest-axe gates; the `vertical:*` table set is pinned (GC-3); the outer-ring closure covers transitive value-imports (GC-7).
- **GC-14 wording fix:** this area's per-RPC gate rows carry a **composition column** — each contract verified *composed into its declared consumers*, not just internally gated (the wording that let AC3-3 get a "VERIFIED" stamp).
- **Carried by name to this board:** TASK-OBS-01 (AB-1) · AC3-O6 audit seam (AB-2) · GC-13/AC3-O5 manifest split (AB-3) · the `admin_audit_log` W2 exemption's "revisit at A-ADM area open" (AB-4) · ADM-8-early sequencing, RW-05 + AC3-O8 (AB-5) · the bridge addendum's audit cadence (AB-6).
- **A-NTF hand-off verified:** the content-report **store** is live (`content_reports`, `20260720200000:126` + `submit_content_report`); the moderation surface (ADM-10/11) is this area's, and NTF-6's moderation-decision-communication seam closes against ADM-11 here.

## Corrections and notes to carried-forward premises (canonical-wins)

1. **The wave map does not bind the ADM rows.** `FERD-CAPABILITY-MAP.md` contains zero `ADM-*` rows (checked 2026-07-31). The Ferd cut across the 18 §L3 rows is genuinely the board's to make (AB-8) — nothing upstream forces build-all.
2. **Naming drift: "A-OPS".** `hub/lib/audit/audit.ts:7,28` and the AC3-O6 register row call this area A-OPS; the canonical area code everywhere else is **A-ADM**. Standardize to A-ADM when AB-2 discharges the TODO (two files, zero canon impact).
3. **The audit seam has FOUR callers, not the "sign-in" the AC-6-era prose suggests:** `signup` (pre-session, null actor), `audit` (sign-in), `transcend` (Mist→FIM consent moment), `farewell` (Mist explicit erase) — three GDPR-relevant. AB-2's recorder must accept a null actor.
4. **`admin_exit_user_from_platform` predates v2's exit routing.** It ships from sprint4 (`20260228144747`) — before MEM-5/MEM-7 sole-leader transfer/MEM-8 last-member closure existed. ADM-6 is a **re-derivation** against the live routing (the NB-1 lesson: re-derive against what exists, don't port the premise), not a wiring job.
5. **ADM-9 / ADM-17 substrate marked VERIFY-at-decomposition.** No group-suspension or role-template-CRUD contract was positively identified in the sweep; the rows below say VERIFY rather than claim.

## Substrate audit at kickoff (verified 2026-07-31, migrations + manifest + oracle inventory)

Admin substrate at HEAD: `admin_audit_log` (PC-4, append-only, DeusEx-only read — B-ADMIN-007 semantics), `admin_update_user_status` + `admin_decommission_user` (COR-C W1 re-issues), `admin_hard_delete_user`, `admin_send_notification` (oracle ported at A-NTF), `admin_force_logout`, `admin_exit_user_from_platform`, `content_reports` + report contracts (C-D), PC-3 role/permission substrate incl. last-DeusEx floor. **No statistics primitive** (the only `get_platform_*` functions are announcement reads). **No feature-flag or platform-policy substrate.** **No contract enumerates DeusEx-stewarded groups** (AC3-O8, 87-migration sweep).

| Cap | Capability (compressed) | Substrate | Oracle | Cycle (proposed) |
|---|---|---|---|---|
| ADM-1 | Admin dashboard + platform statistics | **NONE for stats** (PC-1 primitive is genuinely new); dashboard page new | PARTIAL (B-ADMIN-002 stat labels) | ADM-A |
| ADM-2 | Member search/filter/list at platform scope | HAVE reads via PC-3; DS-6 ranking not yet consumed (§L2 list) | STRONG (B-ADMIN-002/013 — filters, selection model) | ADM-C |
| ADM-3 | Activate / suspend / decommission | **HAVE** (W1-repaired contracts; producer suite green in v2) | STRONG (B-ADMIN-008/010 + v2 producer suite) | ADM-C |
| ADM-4 | Hard-delete + sentinel reassignment | HAVE (`admin_hard_delete_user`; U047 reassignment hooks) | STRONG (B-ADMIN-009) | ADM-C |
| ADM-5 | Force-logout active sessions | HAVE (`admin_force_logout`) | STRONG (B-ADMIN-019) | ADM-C |
| ADM-6 | Platform-wide sweep through exit paths | **REBUILD** (pre-MEM-5/7/8 function; re-derive — note 4) | STRONG contract spine (B-ADMIN-007 platform-exit) | ADM-C |
| ADM-7 | Bulk-action safe subset | Singles are the substrate; selection-model oracle is component-tier | PARTIAL (B-ADMIN-013) | **defer (AB-8)** |
| ADM-8 | Group administration view (cross-platform) | **NONE** (AC3-O8: no enumerating contract) · **precondition TASK-INT-05** (DeusEx system group is 39/42 test detritus) | PARTIAL (B-ADMIN-012/016/017/018 visibility rules) | ADM-B |
| ADM-9 | Suspend / reassign / reactivate group | **VERIFY at decomposition** (no contract identified) | PARTIAL | ADM-B |
| ADM-10 | Moderation queue render | HAVE store (C-D `content_reports`); triage reads new | SILENT (store is v2-born; C-D contract tests cover submit/window) | ADM-D |
| ADM-11 | Triage + resolve + resolution communication | NONE (resolve contracts new; DS-5 kind new — dispatcher covers it by construction) | SILENT | ADM-D |
| ADM-12 | Platform Administrator membership mgmt | HAVE (DeusEx add/remove + last-admin floor) | STRONG (B-ADMIN-003/005) | ADM-C |
| ADM-13 | Auto-grant verification view | PC-3 trigger exists; surface publication unreciprocated (G-29) · Console-routed | PARTIAL (B-ADMIN-004/006) | **defer (AB-8)** |
| ADM-14 | Platform policy (versioned, reversible) | NONE | SILENT | **defer (AB-8)** |
| ADM-15 | Feature flags | NONE — and **zero flag-reading code exists in v2** · Console-routed | SILENT | **defer (AB-8)** |
| ADM-16 | Platform-scope audit log surface | HAVE table (append-only; DeusEx-only read) · shape per AB-4 · Console-routed (AB-7) | STRONG for the table (B-ADMIN-007); surface new | ADM-D |
| ADM-17 | Role templates + permission catalogue CRUD | Data HAVE (PC-3 seed); CRUD contracts **VERIFY** | PARTIAL | **defer (AB-8)** |
| ADM-18 | Targeted removal at platform scope via exit paths | Routes exist (MEM-5/7/8); override contract new | STRONG spine (B-ADMIN-016/017/018) | ADM-C |

## Vertical obligations A-ADM must fulfil

- **V1 Administration** — this area *is* V1's platform-scope realization; every admin action audit-logged (append-only holds — B-ADMIN-007 is the oracle).
- **V2 Privacy** — the AB-4 right-of-access ruling executed (manifest exemption rewritten, invariant updated in the same PR); every new store classified at birth; telemetry actor-linkage dispositioned against ADR-U034 (AB-1); erasure cascades over any new actor-linked store (Mist rule: a Mist's telemetry/audit-linked rows must not survive its erase — prove it, the NB-8 lesson).
- **V3 Notifications** — ADM-11's resolution communication ships as a **registered kind** through the registry + dispatcher (no bespoke write path can exist — the FK forbids it).
- **V4 Observability** — the area **ends the emits-well-stores-nowhere state** (AB-1) and de-scaffolds the V4 spec (G-03); every new admin action emits content-free telemetry.
- **Transactions** — still absent, still cited (AC3-O9); re-verify at the wave boundary, nothing here.

## The cycle sequence (proposed — foundation-first, paired-platform-first)

- **ADM-A — Observability foundation + audit spine (the platform cycle).** TASK-OBS-01's outputs: the telemetry sink (AB-1, ADR candidate), the PC-4 auth-event recorder discharging `recordAuditEntry`'s TODO for all four callers (AB-2), the PC-1 statistics primitive + minimal ADM-1 dashboard, the ADR-U043 durable measurement ledger, G-03 V4 de-scaffolding. **Rider:** the AB-3 manifest split executed *before* the area's first new function lands, so every A-ADM function is born classified.
- **ADM-B — Group administration (the AB-5 early ruling).** In-cycle precondition: TASK-INT-05 fixture cleanup (leak fixed red-first; the 39 detritus rows retired; live DB verified). Then the DeusEx-stewarded enumeration contract (the AC3-O8 gap), ADM-8 list/detail, ADM-9 ops (substrate VERIFY at decomposition). Closes RW-05: a handed-over group becomes visible to the only party who can act on it.
- **ADM-C — Member administration console.** ADM-2 search/filter/list, ADM-3/4/5 surfaces over the repaired contracts, ADM-6 re-derived through MEM-5/7/8, ADM-12, ADM-18. The v1 oracle's admin-suite spine (B-ADMIN-002/003/005/008/009/010/013/019) ports/adapts here.
- **ADM-D — Moderation + audit surfaces.** ADM-10 queue, ADM-11 triage/resolve + the DS-5 resolution kind (NTF-6 seam closes), ADM-16 per the AB-4 shape, under the AB-7 console shell; the `admin_audit_log` manifest entry rewritten in this cycle's PR.

**Area gate absorbs the standing dues:** ADR-U043 measurement pass + Stefan's live walk; W12 per-RPC rows **with the composition column** (GC-14); the B-ADMIN oracle dispositioned row-by-row; the AB-4/AB-8 records verified executed; the post-area FULL audit per AB-6.

## Design sessions

This one (the board below). One ADR candidate is near-certain: **telemetry sink & analytics posture** (AB-1 — sink ownership, retention, consent posture; the audit right-of-access ruling AB-4 can ride the same ADR or stay a recorded W2-register amendment). AB-3 needs no ADR — the anatomy already states the split; GC-13 just makes it mechanical.

## Decision board — SETTLED 2026-07-31 (Stefan: all rows as recommended) — presented whole, recommendations marked

| # | Question | Recommendation | Default if unaddressed |
|---|---|---|---|
| **AB-1a** | Telemetry sink: durable store vs log-drain vs hybrid | **Postgres-native durable event store, PC-1-owned** (`telemetry_events`), written by a fire-and-forget SECURITY DEFINER recorder (emit failure never fails the action — the C-C hint discipline); content-free props (existing `[telemetry]` discipline); no external vendor in Ferd (pre-launch, zero consumers, no DPA surface); hybrid/drain re-openable at Eid | durable store |
| **AB-1b** | Retention + what ADM-1 aggregates | **Raw events 90-day retention** with a scheduled prune; **ADM-1 computes on read** — live domain counts (members/groups/journeys — cheap at this scale) + event-derived activity trends; **no pre-aggregation until a measured need** (ADR-U042 posture); cardinality bounded by the registered event-name set | 90d + on-read |
| **AB-1c** | V2/consent posture for actor-linked telemetry | **Operational telemetry + audit under documented legitimate interest**, actor-linked via personal-group id, content-free; **erasure cascades** (FK/U047 — a Mist's rows die with its erase, proven); export: exemption-with-citation mirroring AB-4's narrowed shape (bounded retention, ops purpose). "Analytics/optimization" registered as a **named ADR-U034 purpose now, collection deferred** until a consumer exists — don't collect what nothing reads | LI + cascade + cited exemption |
| **AB-1d** | ADR-U043 measurement continuity | **A docs-side durable ledger** (`docs/planning/reference/PERF-MEASUREMENT-LEDGER.md`), appended at every gate pass — measurements are planning artifacts, not member data; no DB table | docs ledger |
| **AB-2** | `recordAuditEntry` durable home (AC3-O6) — four callers, three GDPR-relevant | **PC-4 SECURITY DEFINER `record_auth_event()` writing `admin_audit_log`** (the TODO's own direction; the table exists and is the PC-4 audit substrate); null-actor accepted (signup is pre-session); awaited-but-non-fatal (log + telemetry mirror on failure, never fail the auth action); append-only preserved (B-ADMIN-007); telemetry mirror stays; A-OPS naming fixed in the same PR. **Schema gate.** Distinct from AB-1's store: audit trail ≠ telemetry | PC-4 recorder |
| **AB-3** | GC-13/AC3-O5 — manifest PC-1..PC-4 split at function granularity | **Full four-way split** of the ~100-function CORE declaration, as the ADM-A rider (manifest + gate only, no schema gate): unclassified-fails-red, plus a pinned mechanical rule `admin_* → PC-4` (the anatomy's admin-holds sentence made testable). A-ADM is exactly where the split becomes load-bearing, and GC-1's completeness gate already enumerates the population — the labels are the only missing bit. *Fallback if judged too heavy:* split the PC-4 boundary only, leave PC-1/2/3 flat with a dated narrowing | full split |
| **AB-4** | `admin_audit_log` Art. 15 shape (COR-C W2 revisit) | **Split by row direction:** rows where the member is the **actor** (incl. their own `data_export` entries) gain an export representation in the composite; rows where the member is the **target of third-party admin action** stay exempt under a **narrowed** citation (moderation/security integrity + the admin actor's own third-party identity in the row; admin actions already visible by effect — e.g. suspension — need no log disclosure). Executed in ADM-D with ADM-16; manifest entry + invariant updated in the same PR | split shape |
| **AB-5** | ADM-8 sequencing | **Ratify ADM-8-early** — cycle ADM-B, immediately after the foundation cycle, ahead of members/moderation. RW-05 (handed-over groups invisible to the only actor who can act) + AC3-O8 (no enumerating contract exists — platform work either way) argue it; **TASK-INT-05 is an in-cycle precondition** (never build the view against 39/42 detritus) | ADM-8-early |
| **AB-6** | Audit cadence (bridge addendum, PROPOSED) | **Ratify as proposed:** gates are the always-on audit; bounded delta-audits of un-gated corners after big builds; **one more FULL audit after A-ADM closes, before Phase-4 cutover**; then full audits only at structural inflection points; standing rule — every audit converts findings into gates, and periodic judgment passes audit the gates themselves | ratify |
| **AB-7** | Console-routed rows (U028): Ferd shape | **Build Console-routed surfaces that make the Ferd cut (ADM-16) inside the Hub shell under a distinct admin route group** — the Hub-shell bundle is one of U028's two named options, so nothing is pre-empted; the Console-as-entity decision stays deferred (U025/U028), recorded | Hub-shell group |
| **AB-8** | The Ferd cut across the 18 ADM rows (no wave-map binding — note 1) | **In:** ADM-1..6, 8, 9, 10, 11, 12, 16, 18 (thirteen rows — the operational floor: observe, administer members and groups, moderate, audit). **Defer with dated records naming activation:** ADM-7 (bulk — after singles prove; Eid), ADM-13 (G-29 unreciprocated + Console-routed; when G-29 closes), ADM-14 (no substrate, no consumer), ADM-15 (zero flag-reading code exists — a flag manager with no flags is scaffold), ADM-17 (catalogue is stable Ferd seed; DeusEx CRUD is high-risk surface; Eid) | recommended cut |

## Deferred register — what this run deliberately does NOT build (Stefan's standing ask, 2026-07-31: restate this plainly at area close)

Five of the 18 ADM capabilities are out of scope for this run (AB-8, settled as recommended). Each carries a dated deferral naming its activation point; at area close this register is presented to Stefan verbatim-in-plain-language and each row converts into an Eid backlog entry (or gets re-scoped) per his call.

| Row | Capability (plain terms) | Why deferred (2026-07-31) | When to revisit |
|---|---|---|---|
| ADM-7 | **Bulk actions** — act on many members at once (select twenty, suspend all) | Convenience layered on the single-member operations; prove the singles in practice first | Eid, once the ADM-C singles have run in anger |
| ADM-13 | **Auto-grant verification screen** — verify that new permissions auto-attached to the admin role correctly | Depends on a PC-3 surface publication that does not exist yet (G-29 unreciprocated); Console-routed | When G-29 closes; ships under the AB-7 shell |
| ADM-14 | **Platform policy settings** — versioned, reversible platform-wide configuration | No substrate and **no consumer** — nothing in the platform reads any policy today | When the first real policy consumer appears |
| ADM-15 | **Feature flags** — create, toggle, scope flags | **Zero flag-reading code exists in v2** — a flag manager with no wires attached; Console-routed | First rollout/launch need — Phase-4 cutover planning at the earliest |
| ADM-17 | **Role-template & permission-catalogue editing** — DeusEx-level CRUD on the role/permission building blocks | The catalogue is stable seed data in Ferd; an editing UI is high-risk (mistakes ripple platform-wide) with no current payoff | Eid |

## Exit checklist — the Platform-Ops area gate (planted now)

- [ ] All 18 ADM rows `6-done` or explicitly dispositioned per AB-8 (deferred rows carry dated deferrals naming their activation point).
- [ ] The emits-well-stores-nowhere state is ended: sink live per AB-1, TASK-OBS-01 closed, G-03 de-scaffolded (V4 §§3-6 are an obligation inventory), ADR nodded if raised.
- [ ] `recordAuditEntry`'s TODO discharged for **all four** callers per AB-2; no console-only audit path remains; A-OPS naming corrected.
- [ ] AB-3 executed: the manifest function split live (or the recorded narrow fallback), unclassified-fails-red, `admin_* → PC-4` pinned; every A-ADM-born function classified at birth.
- [ ] AB-4 executed: `admin_audit_log` manifest entry rewritten (representation for own-actor rows, narrowed exemption for target rows); export-completeness invariant updated in the same PR; composite exports the new section.
- [ ] TASK-INT-05 closed **before ADM-8 ships**: fixture leak fixed red-first; DeusEx system-group membership verified clean on the live DB.
- [ ] ADR-U028 honoured: Console-routed rows shipped per AB-7 with the entity question recorded still-deferred; woven rows woven.
- [ ] ADM-11's resolution communication is a registered kind through the registry + dispatcher (no bespoke path — structurally verified).
- [ ] Every new table/function/trigger under the COR-C lattice from first commit: `memberData` classified at CREATE, manifest-registered, trigger-licensed, token + axe green, pinned vertical set untouched (or amended by test-with-reason).
- [ ] Mist-rule proof for every new actor-linked store (telemetry, audit): a Mist's rows do not survive its erase (the NB-8 lesson — prove, don't assume).
- [ ] W12 per-RPC verification **with the composition column** (GC-14): each contract verified composed into its declared consumers, not just internally gated.
- [ ] Oracle dispositioned row-by-row: the B-ADMIN-001..019 spine ported/adapted/superseded with citations (the A-NTF pattern — using a function is not testing it).
- [ ] ADR-U043 measurement pass (cold + warm, tail rule) + Stefan's live walk, both before the area retro; numbers appended to the AB-1d ledger.
- [ ] CHANGELOGs updated (root + `hub/` + platform-core as applicable — check both before calling an entry missing).
- [ ] The post-area **FULL anatomy audit** (AB-6) run before Phase-4 cutover; findings converted to gates.
- [ ] **The deferred register presented to Stefan at area close, in plain language** (ADM-7/13/14/15/17 — "what this run did not do"), each row converted to an Eid backlog entry or re-scoped per his call.

## After Platform-Ops

Phase 3 ends here. What A-ADM hands forward: the Phase-4 cutover inherits a fully-audited surface (the AB-6 FULL audit is the cutover's entry condition); Eid inherits the dated deferrals (ADM-7/13/14/15/17, email-channel ADR, digest/aggregation, i18n activation per TASK-I18N-01, TASK-DBT-01 test-tier `tsc` debt); the Console entity question (U025/U028) stays open for its own decomposition.
