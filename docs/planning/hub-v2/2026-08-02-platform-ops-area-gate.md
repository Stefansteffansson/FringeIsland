# The Platform-Ops area gate (A-ADM) — 2026-08-02

Companion-to-be of the area retrospective (folds the ADM-C standing decision: cycle retros fold in here). A-ADM was the **sixth and last** Phase-3 area, covering cycles **ADM-A** (observability foundation + audit spine), **ADM-B** (group administration), **ADM-C** (member administration) and **ADM-D** (moderation + audit surfaces). Phase 3's build scope ends here.

**Verdict: HELD.** The mechanical legs below are executed; the gate closes on: (1) the ADR-U043 measurement pass (protocol scheduled below), (2) **Stefan's live walk**, (3) Stefan's per-row call on the **deferred five**, (4) Stefan's verdicts on the **two process questions**. The AB-6 FULL anatomy audit is post-gate by its own ruling (before Phase-4 cutover) and is scheduled, not blocking.

Sources: the [plan (v8, §Exit checklist canonical)](./phase-3-platform-ops-completion-plan.md) · [FEAT-PC018](../../platform/core/features/FEAT-PC018-telemetry-event-store-and-statistics.md) / [PC019](../../platform/core/features/FEAT-PC019-durable-auth-event-audit-binding.md) / [PC020](../../platform/core/features/FEAT-PC020-group-administration-contracts.md) / [PC021](../../platform/core/features/FEAT-PC021-member-administration-contracts.md) / [PC022](../../platform/core/features/FEAT-PC022-moderation-and-audit-read-contracts.md) · [H034](../../products/hub/features/FEAT-H034-admin-dashboard-and-durable-audit-wiring.md) / [H035](../../products/hub/features/FEAT-H035-group-administration-view.md) / [H036](../../products/hub/features/FEAT-H036-member-administration-view.md) / [H037](../../products/hub/features/FEAT-H037-moderation-and-audit-view.md) · the [behaviour inventory](./behaviour-inventory.md) B-ADMIN spine · the [A-NTF gate record](./2026-07-27-notifications-area-gate.md) (the shape this mirrors).

## Exit-checklist sweep (each row: disposition + disk evidence)

| Checklist row | Disposition |
|---|---|
| All 18 ADM rows `6-done` or AB-8-dispositioned | **HOLDS.** Thirteen built across ADM-A..D (1,2,3,4,5,6,8,9,10,11,12,16,18 — five paired feature sets, all `6-done`); five deferred with dated records naming activation (7,13,14,15,17 — presented below for the per-row call). |
| Emits-well-stores-nowhere ended | **HOLDS** (ADM-A): `telemetry_events` live per AB-1 (deny-all, never-raises recorder, 90-day prune), TASK-OBS-01 `done`, G-03 de-scaffolded (TASK-ADMA-05), ADR-U052 **Accepted** (#359). |
| `recordAuditEntry` TODO discharged ×4; A-OPS naming fixed | **HOLDS**: `record_auth_event` wired in all four auth routes (`signup`/`audit`/`transcend`/`farewell` — verified by grep this session); `hub/lib/audit/audit.ts:17` reads "Platform-Ops area (A-ADM)". |
| AB-3 executed (manifest split + pin) | **HOLDS** (ADM-A, TASK-ADMA-01): four-way PC split live, unclassified-fails-red, `admin_* → PC-4` pinned — and the pin did real work this area (it forced the ADM-D ownership-split rider's wrapper shape rather than letting the contracts drift to DS-5 names). |
| AB-4 executed | **HOLDS** (ADM-D): manifest entry rewritten per its own instruction (own-actor representation + partial-scope exemption), invariant's partial branch live, composite exports `audit_trail` at `schema_version` 2. |
| TASK-INT-05 closed before ADM-8 | **HOLDS**: closed in the ADM-B opener (45 caretaker relics retired); task `done`. |
| ADR-U028 honoured (AB-7) | **HOLDS**: all Console-routed rows shipped inside the one `/admin` Hub-shell group; the Console-as-entity question recorded still-deferred (U025/U028) — untouched by this area, as ruled. |
| ADM-11 communication is a registered kind | **HOLDS, structurally**: `report_resolved` in `notification_kinds`; the `notifications.type` FK forbids a bespoke kind; the N-D BEFORE-INSERT dispatcher and N-C hint compose by construction (suppression proven through the real preference path, gate suite S4c). |
| COR-C lattice from first commit | **HOLDS**: one new table (`telemetry_events`, classified at birth with cited exemption); every area-born function manifest-declared (the completeness gate enforced it — twice red at first contact, both real: the notify-fn EXECUTE leak and the core-to-domain edges); trigger mounts conformant (same-owner, no license owed); token + axe green on every surface; pinned vertical set untouched. |
| Mist-rule proofs | **HOLDS**: `telemetry_events` erasure cascade proven in the PC018 suite (ADM-A); `content_reports` reporter-CASCADE proven across the four new resolution columns, resolver SET-NULL anonymisation observed live (ADM-D gate suite S4d + the S8a lesson). |
| W12 per-RPC roll-up **with GC-14** | **EXECUTED** — the table below. |
| B-ADMIN oracle dispositioned row-by-row | **EXECUTED** — the table below. |
| ADR-U043 pass + live walk | **OPEN** — protocol below; the walk is Stefan's. |
| CHANGELOGs | **HOLDS**: root + platform-core continuous through ADM-D (PC001 → ADM-D, no register note); hub's member-facing register deliberately skipped per the H035/H036 admin-only precedent. |
| AB-6 FULL audit | **SCHEDULED post-gate** (its own ruling: after A-ADM closes, before Phase-4 cutover; carries the ADR-U052 absorption — the anatomy stamp lags U052, the PC-1 row lacks the sink, the PC-4 admin-RPC enumeration is now twenty-strong). |
| Deferred register presented | **EXECUTED** — the plain-language presentation below; each row awaits Stefan's call. |

## W12 per-RPC roll-up — with the GC-14 composition column

Twenty-seven area-born or re-issued functions across five features. **Gated** = typed `42501` behind `is_platform_admin()` (or the documented own-subject/never-raises posture); **anon** = EXECUTE revoked (the anon-execute-lockdown invariant sweeps ALL of `public`, so this column is gate-enforced, not hand-checked); **audited** = writes `admin_audit_log` (mutations only); **GC-14 composed** = verified *composed into its declared consumers* — the wrapper → BFF route → component chain exists (each RPC has exactly one `lib/` consumer file, grep-verified 2026-08-02) **and** the behaviour is exercised end-to-end through the UI door by the named journey.

| Function | Gated | Audited | GC-14: composed into |
|---|---|---|---|
| `record_telemetry_event` (PC018) | never-raises by design | n/a (telemetry ≠ audit) | `lib/observability/telemetry-server.ts` → four auth routes + admin routes → proven by the PC018 producer suite |
| `get_platform_statistics` (PC018) | ✓ | read | `lib/admin/queries.ts` → `/api/admin/statistics` → `AdminDashboard` → `admin-dashboard.spec.ts` |
| `prune_telemetry_events` (PC018) | cron-only, sealed | n/a | pg_cron schedule (no client consumer by design — recorded) |
| `record_auth_event` (PC019) | SECURITY DEFINER, null-actor accepted | IS the audit write | `lib/audit/audit.ts` → the four auth routes → `auth-event-audit-contracts.test.ts` |
| `admin_get_groups` / `admin_get_group_detail` (PC020) | ✓ | read | `lib/admin/groups.ts` → `/api/admin/groups*` → `AdminGroupsList`/`AdminGroupDetail` → `admin-groups.spec.ts` |
| `admin_suspend_group` / `admin_reactivate_group` / `admin_reassign_group_stewardship` (PC020) | ✓ | `group.*` ×3 | same chain, mutation routes → the H035 ceremonies → `admin-groups.spec.ts` |
| `admin_get_users` / `admin_get_user_detail` (PC021) | ✓ | read | `lib/admin/users.ts` → `/api/admin/users*` → `AdminMembersList`/`AdminMemberDetail` → `admin-members.spec.ts` |
| `admin_update_user_status` / `admin_decommission_user` / `admin_hard_delete_user` / `admin_force_logout` (PC021 re-issues) | ✓ (family-wide since gate 2) | `member.suspend`/`.reactivate`/`.decommission`/`.hard_delete`/`.force_logout` | same chain, nine mutation routes → the H036 action rail → `admin-members.spec.ts` |
| `admin_exit_user_from_platform` / `admin_remove_member_from_group` / `admin_grant_platform_admin` / `admin_revoke_platform_admin` (PC021) | ✓ | `member.platform_exit`/`.remove_from_group` · `platform_admin.grant`/`.revoke` | same chain → the exit/removal/grant ceremonies → `admin-members.spec.ts` (floor refusal verbatim end-to-end) |
| `admin_get_content_reports` / `admin_get_content_report_detail` (PC022) | ✓ | read | `lib/admin/reports.ts` → `/api/admin/reports*` → `AdminModerationQueue`/`AdminReportDetail` → `admin-moderation.spec.ts` |
| `admin_resolve_content_report` (PC022) | ✓ | `moderation.report_resolved` | same chain → the resolve ceremony → `admin-moderation.spec.ts` (409 verbatim end-to-end) |
| `admin_get_audit_log` (PC022) | ✓ | read | `lib/admin/audit.ts` → `/api/admin/audit` → `AdminAuditLog` → `admin-moderation.spec.ts` |
| `ds5_moderation_list_reports` / `_report_detail` / `_resolve_report` (PC022 rider) | sealed — EXECUTE revoked from ALL client roles; reachable only through the PC-4 wrappers | via the wrapper | the composition IS the design (ADR-U047 rule 3); conformance gates green on the shape |
| `notify_report_resolved` (PC022, trigger) | sealed (all client roles revoked) | n/a (a producer) | the `resolved_at` edge → registry FK → N-D dispatcher → N-C hint; closure proven platform-side in the E2E |

**The GC-14 wording earned its keep:** nothing in this area holds a "VERIFIED" stamp on internal gating alone — every row's composition chain is a named file path plus a named journey, which is exactly what the AC3-3 lesson demanded.

## B-ADMIN oracle disposition (001–019, row-by-row)

| Oracle row | Disposition |
|---|---|
| **001** route access (`manage_all_groups` → DeusEx) | **SUPERSEDED in mechanism, preserved in effect**: the admin plane now gates on `is_platform_admin()` typed `42501` family-wide (gate 2 moved the whole family off `has_permission(manage_all_groups)`; the W1f sibling pin adapted). The DeusEx grant chain itself stays proven by PC-3 suites + every elevation fixture. |
| **002** user filter + default | **PORTED/adapted**: `admin_get_users` open filter namespace; default hides decommissioned (gate-1 S1a/b); stat labels live on the H036 list. |
| **003** DeusEx add w/ email lookup | **ADAPTED**: `admin_grant_platform_admin` targets existing active members — the email-invite ceremony deliberately not carried (PC021 no-gos); lookup realized client-side over the fetched set (H036 note). Audit `platform_admin.grant`. |
| **004/006** auto-grant + auth chain | **MECHANISM PROVEN, VIEW DEFERRED**: the `auto_grant_permission_to_deusex` trigger is live and manifest-declared; the resolution chain is exercised by every admin suite. The verification *screen* is ADM-13 (deferred; G-29 unreciprocated). |
| **005** last-DeusEx floor | **PORTED**: gate-2 S7e — the floor trigger's refusal surfaces **verbatim** end-to-end (the rolled-back forged-claims technique; also demonstrates the family's no-partial-state property). |
| **007** audit log shape + append-only + every-action-writes | **PORTED AND STRENGTHENED**: append-only re-pinned across the ADM-D policy re-issue (S6c + the tamper cells); every A-ADM mutation writes its dotted row (STORY-8s of PC020/021/022); and the one hole the oracle-era left — the client INSERT door — is now CLOSED (contracts are the only writers). |
| **008** decommission invariant | **PORTED**: gate-2 STORY-3 — memberships preserved, hidden-from-normal/visible-to-admin proven by the read family. |
| **009** hard delete | **PORTED**: gate-2 STORY-4 — cascade + sentinel reassignment + audit-before-delete. |
| **010** activate/deactivate + terminal wall | **PORTED**: STORY-3 + the S3g labelled-green wall (decommissioned reactivation refused). |
| **011** admin notifications | **PORTED at A-NTF** (`oracle-spine-port.test.ts` — fan-out, count-0, registered kind, paired refusal; the "using a function is not testing it" record). |
| **012/016/017/018** group visibility & mgmt | **SPLIT**: see-all-groups ADAPTED (ADM-B `admin_get_groups`, incl. non-member groups + the caretaker filter); admin removal ADAPTED (ADM-18 routes through the MEM walls — last-Steward protection holds **by composition**, never reimplemented); admin **add-to-group NOT CARRIED** — no §L3 row mandates it; joining stays invitation-based (MEM-1/2/3) for admins too. Recorded, not lost. |
| **013** selection model | **DEFERRED with ADM-7** (bulk; Eid) — the singles-first ruling. |
| **014** action-bar bulk logic | **DEFERRED with ADM-7** (Eid). |
| **015** admin per-recipient DM | **NOT CARRIED**: no §L3 mandate; admin→member communication is `admin_send_notification` (011) + the registered-kind family; sanction communication resolved to Eid (CB-1 → DB-4). |
| **019** force logout | **PORTED/adapted**: single-target surfaced over the array-signature primitive (the array stays unexposed — ADM-7 territory, the board default); works-on-inactive proven (gate-2 S4a); audit `member.force_logout`; the refresh-layer honesty carried to the ceremony copy. |
| *(B-PERF-001)* service_role users API | **SUPERSEDED**: `admin_get_users` (SECURITY DEFINER, jsonb-array row-cap honesty); search client-side with DS-6 recorded unconsumed; pagination deliberately absent until a payload measurement asks. |

## Measurements (ADR-U043) — protocol scheduled

Owed scope: `/admin` (B2/B3, justified standalone read), `/admin/groups` + detail, `/admin/members` + detail, `/admin/moderation` + detail, `/admin/audit`. Protocol per the A-NTF precedent: headless on **production** against the **authenticated real path** (the measure-the-real-path rule), warm + semi-warm as the **binding signal** (the standing A-COM rider), cold runs behind ≥20-minute enforced-idle windows extending the standing labelled pre-launch exception unless a page-specific anomaly appears. Numbers land in [`2026-08-02-adm-gate-measurements.md`] and one row appends to the [perf ledger](../reference/PERF-MEASUREMENT-LEDGER.md). **Precondition:** the production deploy carrying H037 (merge #378) is live — verify before measuring (the stale-cache deploy-hang watch-item).

## The deferred five — presented in plain language (Stefan's call, row by row)

Five of the eighteen admin capabilities were deliberately **not built** in this run (board AB-8, settled 2026-07-31). What this run did not do:

1. **Bulk actions (ADM-7).** You cannot select twenty members and suspend them all — every action is one member or one group at a time. *Deferral logic: prove the singles in anger first.* → Proposed: **Eid backlog entry.**
2. **Auto-grant verification screen (ADM-13).** When a new permission auto-attaches to the platform-admin role, no screen shows you it happened — the mechanism is tested, but you'd read the audit log (which now exists) rather than a dedicated view. *Blocked on a PC-3 surface publication that doesn't exist (G-29).* → Proposed: **activates when G-29 closes**, under the `/admin` shell.
3. **Platform policy settings (ADM-14).** No versioned, reversible platform-wide configuration screen — because nothing in the platform reads any policy today. → Proposed: **re-file when the first real policy consumer appears** (no Eid entry — a dated trigger condition instead).
4. **Feature flags (ADM-15).** No flag manager — zero flag-reading code exists, so it would be a switchboard wired to nothing. → Proposed: **Phase-4 cutover planning at the earliest** (launch/rollout need). 
5. **Role-template & permission-catalogue editing (ADM-17).** The role/permission building blocks are stable seed data; editing them platform-wide is high-risk surface with no current payoff. → Proposed: **Eid backlog entry.**

Each row needs your call: **Eid backlog entry as proposed, or re-scope.**

## The two process questions (Stefan's verdict)

**Q1 — E2E at schema close.** The COR-C fallout lesson: four E2E specs broke silently under a substrate change and read as environment faults for a costly while. Proposal: **standing rule — when a migration changes surface-reachable behavior, the affected E2E journeys join the post-apply verification set** (run, not re-authored; minutes per gate). The sibling-assertion sweep covers named assertions; this covers the journeys nothing names. *Recommend: adopt.*

**Q2 — the 398 mirror-only telemetry sites.** 398 `emitTelemetry` sites across 79 BFF route files emit locally but not durably; bulk adoption was deliberately refused (per-request read events would dominate the sink's cardinality — ADR-U052 §3's budget). Proposal: **codify the split as the standing criteria — mutations and admin-plane events adopt durable telemetry; read-route events stay mirror-only until an analytics consumer exists under the named ADR-U034 purpose** (the AB-1c "don't collect what nothing reads" posture). Adoption then happens per-family with a cited reason, never in bulk. *Recommend: adopt as stated.*

## Task sweep (area-relevant backlog at gate time)

`done`, deletable at the retro: TASK-ADMA-01..05, TASK-ADMB-01/02, TASK-ADMC-00/01/02, TASK-ADMD-01/02, TASK-OBS-01, TASK-INT-05, TASK-DOC-007/008. Open and carried (not A-ADM blockers): TASK-DBT-01 (test-tier `tsc` debt — Eid), TASK-DBT-02 (COR-C E2E adjudications — check state at retro), TASK-INT-01..04, TASK-E2E-01, TASK-FORUM-01, TASK-H017-01, TASK-I18N-01 (Eid), TASK-MIST-01, TASK-DOC-003/004/005.

## Gate verdict

**HELD.** Closes when: the measurement pass lands in the ledger · Stefan's live walk (script offered on request) returns · the deferred-five calls land · the two process questions get verdicts. Then: the area retro (ADM-C + ADM-D fold in), the task sweep executes, and the **AB-6 FULL anatomy audit** opens as the Phase-4 cutover's entry condition.
