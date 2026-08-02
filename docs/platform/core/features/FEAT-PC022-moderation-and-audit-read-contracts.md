# FEAT-PC022: Moderation and audit-read contracts — the report queue learns to resolve, the reporter learns the outcome, and the audit log gains its read

---
id: FEAT-PC022
title: Moderation and audit-read contracts — the queue + detail reads over the C-D report store, the resolve contract with the DS-5 registered resolution kind, the ADM-16 audit-log read with keyset paging, the audit client-write door closed, and the AB-4 export split executed
owner: platform/core/governance
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

ADM-D's platform half (ADM-10/11/16 + the AB-4 execution). The contract walk at decomposition (2026-08-01, cumulative-forward over live migrations + seeds) verified six findings, each at file:line:

1. **The C-D report store is triage-ready but resolution-blind.** `content_reports` (`20260720200000:126`, zero later ALTERs) carries `status TEXT NOT NULL DEFAULT 'open'` (open vocabulary, deliberately un-CHECKed), `content_snapshot` (the drift-proof record), the `(status, created_at DESC)` index, and an admin SELECT policy whose migration comment names this cycle by capability ("The ADM-10 seam: A-ADM's moderation queue renders from exactly this read") — but **no resolution columns** (no resolved-by, resolved-at, outcome, or note) and **no write door** (no INSERT/UPDATE/DELETE policies — the contracts are the only door, and no resolve contract exists). ADM-11 needs schema.
2. **The store never learned who authored the reported content.** `submit_content_report` computes `v_author` for the self-report guard and discards it — the row stores the snapshot, not the author. The queue's escalation path (ADM-11's "member-state changes if escalating", the Hub §L3 ADM-11 row) needs the author resolved **live at read time**, nullable when the content is gone.
3. **The audit log's client write door is still open.** `audit_log_insert_admin` (`20260223164813`) lets any admin-authenticated PostgREST caller INSERT arbitrary field-content rows — pattern (c) of the governance §L4 three-pattern note (7 legacy UI sites, all frozen in `hub-legacy/`, none in v2). Under the v2 law (contracts are the only door) and the ADR-U038 direct-caller question, a forgeable audit log fails its own integrity purpose.
4. **The audit SELECT policy predates the typed-gate re-issue.** `audit_log_select_admin` (`20260223164813:17`) runs `has_permission(manage_all_groups)` inside RLS — the PG17 complexity-ceiling class the platform tier file warns about, and the same predicate gate 2 (`20260801190000`) already moved the whole function family off.
5. **No audit read contract exists.** DeusEx-only raw select is the only read (B-ADMIN-007 semantics). Unlike the member list, `admin_audit_log` grows without bound — every admin mutation plus the four member-auth moments since PC019 land here — so the ADM-16 read needs keyset paging from birth (the `20260801180000` row-cap lesson, applied at design time rather than at first contact), plus live actor-display shaping and prefix filtering over the open dotted action namespace.
6. **AB-4 stands executed-here-by-instruction.** The manifest exemption entry says so verbatim: "THIS ENTRY IS REWRITTEN in cycle ADM-D" (`supabase/ownership.manifest.json:302`, carrying ADR-U052 §6). The export composite (`get_own_data_export`) today has no audit section; own-actor rows — including the caller's own `data_export` entries and four auth-moment events — gain a representation; target-of-third-party-admin-action rows keep a **narrowed** exemption.

The governance spec §L4 names the **moderation primitives** LATENT row and the **ADM-16 read surface** as ADM-D's; this feature is both, plus the AB-4 rider.

### Why Platform Core (PC-4)

Same ruling as PC020/PC021: the resolve and read contracts are admin-plane orchestration — platform-admin-gated, audit-writing — composing the DS-5 report store; homing them in DS-5 would move admin authority and audit writes into a domain service against the anatomy's admin-holds sentence (made mechanical by the `admin_* → PC-4` manifest pin). The store stays DS-5's (`content_reports` owner unchanged); the one new trigger function is a notification producer and registers with its `notify_*` DS-5 siblings. No boundary moves.

## Solution sketch

One migration, one schema gate (board DB-1). All contracts SECURITY DEFINER, `SET search_path = ''`, `is_platform_admin()`-gated with typed `42501`, `REVOKE` anon.

### The resolution substrate (ADM-11 schema)

`ALTER TABLE content_reports` adds four nullable columns: `resolved_by_group_id UUID REFERENCES groups(id) ON DELETE SET NULL` (an erased admin anonymises the resolution; the reporter's CASCADE remains the row's only death), `resolved_at TIMESTAMPTZ`, `resolution_kind TEXT`, `resolution_note TEXT`. No CHECK constraints — `status` and `resolution_kind` stay open vocabularies; the status↔resolution consistency (`status='resolved'` iff `resolved_at` set) is contract-enforced, never sealed into schema (the C-D extensibility discipline).

### The moderation family

- **`admin_get_content_reports(p_filter TEXT DEFAULT 'open') → jsonb array`** — the ADM-10 queue read (jsonb array, not SETOF — the `20260801180000` row-cap honesty). Filters (open namespace, unknown → `22023`): `open` (default), `resolved`, `all`. Row payload (walked below): `id`, `target_kind`, `target_id`, `target_group_id`, `target_group_name`, `reporter_display_name`, `reason`, `details`, `content_snapshot`, `status`, `created_at`, `resolution_kind`, `resolved_at`. Newest-first.
- **`admin_get_content_report_detail(p_report_id UUID) → jsonb`** — the row keys plus the live-resolved escalation keys: `author_user_id` + `author_display_name` (re-resolved from `forum_posts`/`messages` at read time — a tombstoned post keeps its author, the row knows them; **nullable** only when the target row itself is gone, while the snapshot stands as the record either way), `live_target_exists` (drift honesty), and `resolved_by_display_name` on resolved rows. Refusals: `42501`, `P0002` (existence-hiding).
- **`admin_resolve_content_report(p_report_id UUID, p_resolution_kind TEXT, p_resolution_note TEXT DEFAULT NULL) → jsonb`** — the ADM-11 resolve, **per-report** (board DB-2; target-grouping is the queue's render concern). `p_resolution_kind` validated additively: `actioned` | `dismissed`, unknown → `22023`. Writes `status='resolved'` + the four resolution fields (`resolved_by` = the caller's personal group) and the audit row **`moderation.report_resolved`** (target = report id; metadata carries outcome + target kind — the dotted namespace extended per the PC020/PC021 ruling). Guards: `42501`; `P0002` unknown report; **P0001 on an already-resolved report, writing nothing** (one report, one resolution — a second resolve changes nothing by definition, the ADM-C no-op discipline).
- **`notify_report_resolved`** — AFTER UPDATE trigger on `content_reports`, firing on the transition into `'resolved'`: INSERT into `notifications` (recipient = `reporter_group_id`, type **`report_resolved`**, closure copy naming the outcome; payload `{report_id, target_kind, resolution_kind}` — **no resolution note, no admin identity**: the note is admin-internal working text and the resolver is third-party identity under the own-data wall). Trigger-licensed (GC-8). **By construction** the row flows through all three seam layers: the registry FK (`notifications.type REFERENCES notification_kinds(kind)`, `20260723120000:108` — a bespoke kind is structurally impossible), the N-D **BEFORE INSERT suppression dispatcher** (`20260726120000` — the member's `platform`-category preference is honored; no override, deliberately: closure is not safety-critical and the V3 preference law binds), and the N-C content-free hint. A reporter erased before resolution takes the report with them (the row-level CASCADE) — nothing is left to resolve, and a stale resolve refuses `P0002`.
- **Kind registration:** `INSERT INTO notification_kinds ('report_resolved', 'platform', …) ON CONFLICT (kind) DO NOTHING` (the N-B precedent). **This closes NTF-6's moderation-decision-communication leg** — the one leg the H031 row's dependency note left open against A-COM's store.

### The audit family (ADM-16 + the door)

- **`admin_get_audit_log(p_limit INTEGER DEFAULT 50, p_before TIMESTAMPTZ DEFAULT NULL, p_action_prefix TEXT DEFAULT NULL) → jsonb array`** — keyset paging on `created_at DESC` (`idx_audit_log_created`), limit capped at 200. `p_action_prefix` narrows by prefix match over the **open** dotted namespace — any prefix is accepted and an unmatched one honestly returns empty (no `22023` vocabulary policing on an open set). Rows: `id`, `actor_group_id`, `actor_display_name` (live-resolved, **nullable** — an erased actor renders null-safe, never breaks the row), `action`, `target`, `metadata`, `created_at`. `42501` non-admin.
- **Policy re-issues:** DROP `audit_log_insert_admin` (finding 3 — audit writes become SECURITY-DEFINER-only; the seven legacy call sites are frozen oracle code, not v2 callers) and re-issue `audit_log_select_admin` on `is_platform_admin()` (finding 4 — the PG17-safe admin-RLS shape, matching the gate-2 function family).

### The AB-4 execution (rides the same gate PR, per the board ruling DB-6 and AB-4's own text)

- **`get_own_data_export` re-issue:** a new **`audit_trail`** section — rows where `actor_group_id` = the caller's personal group (their own `data_export` entries, the four auth-moment events, and any admin actions they themselves performed) — plus a `schema_version` bump. The export's own fresh `data_export` row is written before assembly and therefore appears in its own section (deterministic, stated).
- **Manifest rewrite:** the `admin_audit_log` export entry rewritten per ADR-U052 §6 — own-actor rows: `representation: audit_trail section`; target-of-admin rows: narrowed exemption (moderation/security integrity + the admin actor's own third-party identity in the row; admin actions visible by effect need no log disclosure). The `content_reports` representation note gains the resolution-field disposition: `resolution_kind` + `resolved_at` join the reporter's exported reports (the outcome was already communicated to them); `resolved_by` identity and `resolution_note` stay out (the same own-data wall that omits target identity). The export-completeness invariant updates in the same PR.

**Riders:** all four `admin_*` functions born classified PC-4 via the pin; `notify_report_resolved` registered with its `notify_*` sibling family (owner label verified at build — the functionOwner-defaults trap); every mutation audit-written; **no new tables** (four columns on an existing DS-5 store, classification note updated, no new store to classify).

## Appetite

Modest-plus for a platform half — one migration, four contracts, one trigger + kind, two policy re-issues, one composite re-issue. The risk concentrates in the export/manifest reconciliation (the completeness invariant plus three export suites will move together) and in the sweep blast radius of the policy drop. The reads are cheap; the resolve is small.

## Rabbit holes

- **Don't police the open action namespace.** The prefix filter matches strings; it never validates against an enumerated action set. An unknown prefix returns empty, honestly.
- **Don't override preference suppression for the closure copy.** The N-D dispatcher's word is final; `report_resolved` is not safety-critical and gets no bypass.
- **Don't reimplement sanctions from the queue.** "Actioned" acts on the *report*; acting on the *member* routes through the ADM-C contracts via the surface's escalation links — composition, never a second door.
- **Don't build resolve-all-for-target.** Per-report resolution (DB-2); a target with three reports takes three resolves. Grouping is the surface's render concern; a batched resolve is ADM-7-adjacent territory.
- **Don't grow the detail payload beyond the walk.** Every key traces to a FEAT-H037 consumer below; a field without a consumer is scope creep.

## No-gos

No new tables. No sanction or member-state contracts (ADM-C's, composed). No content takedown — deleting or editing reported content has no substrate (`delete_own_forum_post` is own-only) and no §L3 mandate under ADM-10/11; recorded as a deliberate boundary (a forum-moderation capability would be A-COM/DS-5's to raise). No bulk resolve (ADM-7 territory, deferred). No report deletion — the reporter's CASCADE is the row's only death. No `in_review` state (the open vocabulary admits one additively if a real queue ever asks). No sanction-communication kinds — **the DB-4 ruling (2026-08-01): deferred to Eid**, resolving the CB-1 activation clause; the ADM-C deferral notes gain the dated pointer in this decomposition.

## Stories

### STORY-1: The queue read, honestly filtered
- Given open and resolved reports across both target kinds, when a platform admin calls `admin_get_content_reports` under each filter, then `open` (the default) returns only open rows, `resolved` only resolved rows, `all` both — newest-first, every row carrying exactly the walked payload keys, `reporter_display_name` resolved live.
- Given a non-admin or anon caller, then `42501` / EXECUTE refused respectively — for every contract in this feature.
- Given an unknown filter, then `22023`.

### STORY-2: Detail with the live-resolved escalation keys
- Given a report on a live forum post, when the admin reads detail, then `author_user_id`/`author_display_name` resolve to the content's author and `live_target_exists` is true.
- Given the reported content has since been tombstoned, then `live_target_exists` is false while the author keys survive (the row knows its author — escalation stays possible) and `content_snapshot` still carries what the content said when reported (the C-D drift rule doing its job); a target row that is gone entirely yields NULL author keys.
- Given an unknown report id, then `P0002`.

### STORY-3: Resolve, both outcomes, exactly once
- Given an open report, when resolved `actioned` (or `dismissed`), then `status='resolved'`, the four resolution fields are written (`resolved_by` = the caller), and one audit row `moderation.report_resolved` carries the outcome.
- Given an already-resolved report, then P0001 and nothing is written; given an unknown `p_resolution_kind`, then `22023` and nothing is written.

### STORY-4: The reporter learns the outcome — through the registry, the dispatcher, and nothing bespoke
- Given a resolve on a FIM's report, then the reporter's notifications gain one `report_resolved` row (registered kind, category `platform`) whose payload carries `{report_id, target_kind, resolution_kind}` and **neither** the resolution note **nor** any admin identity.
- Given the reporter muted the `platform` category in-app, then the N-D dispatcher suppresses the row — asserted through the real preference path, proving the kind rides the shared seam.
- Given the reporter was erased before resolution, then their report is gone from the queue entirely (the row-level CASCADE — proven across the four new columns) and a resolve against the stale id refuses `P0002`.

### STORY-5: The audit read pages honestly
- Given more audit rows than one page, when the admin pages with `p_before`, then pages descend `created_at` without overlap or gap; the limit cap holds.
- Given `p_action_prefix = 'member.'`, then only `member.*` rows return; an unmatched prefix returns empty without error.
- Given a row whose actor was erased, then the row renders with NULL display identity, never an error.

### STORY-6: The client write door closes
- Given the migration applied, when an admin-authenticated PostgREST caller INSERTs into `admin_audit_log` directly, then the write refuses (the policy is gone); when a contract mutation runs, its audit row still lands (SECURITY DEFINER unaffected); append-only holds against the post-change catalog.

### STORY-7: AB-4 executed end-to-end
- Given a member with audit history as actor (their own export event, auth moments), when they call `get_own_data_export`, then the `audit_trail` section carries exactly their own-actor rows (including the fresh `data_export` row the call itself wrote), `schema_version` is bumped, and rows where they are only the target of third-party admin action do **not** appear.
- Given a reporter whose report was resolved, then their exported reports carry `resolution_kind` + `resolved_at` and neither resolver identity nor note; the export-completeness invariant passes against the rewritten manifest entry.

### STORY-8: Producer-driven audit proof
- Given every mutation in this feature exercised through the real contracts, then each has its named `admin_audit_log` row, `moderation.*` joins the catalog only via contracts, and append-only holds.

## Decomposition verification walk — payload ↔ consumer (FEAT-H037)

| Key | FEAT-H037 consumer |
|---|---|
| list `id` | row identity → detail link; the resolve route's path param |
| list `target_kind` | kind chip (queue + detail header) |
| list `target_group_id` / `target_group_name` | group context line + escalation link to `/admin/groups/[id]` |
| list `reporter_display_name` | queue row + detail ("reported by") |
| list `reason` / `details` | queue row excerpt / detail full render |
| list `content_snapshot` | queue excerpt + detail's "what the content said when reported" block |
| list `status`, `resolution_kind`, `resolved_at` | status badge; resolved-filter rows name outcome + when |
| list `created_at` | age render, newest-first ordering |
| detail `author_user_id` | escalation link to `/admin/members/[id]` (rendered only when non-NULL) |
| detail `author_display_name` | escalation link label |
| detail `live_target_exists` | drift-honesty line ("this content is no longer present — the snapshot below is the record") |
| detail `resolved_by_display_name` | resolved-report provenance line |
| resolve return (`status`, `resolution_kind`, `resolved_at`) | ceremony success repaint |
| audit rows (`actor_display_name`, `action`, `target`, `metadata`, `created_at`) | audit browser columns; `id` React keys; `created_at` doubles as the `p_before` cursor |
| notification payload `{report_id, target_kind, resolution_kind}` | the reporter's bell render (existing generic notification surface — no new Hub work; the copy rides `title`/`body`) |

Every key has a consumer; every rendered field traces to a key. Dropped at the walk (no consumer): `target_id` raw uuid in the *detail* render (kept in list payload as row identity input for the H037 target-grouping render), reporter `reporter_group_id` raw (display name suffices; no reporter-escalation story exists), audit `actor_group_id` raw in the browser (display name renders; kept in payload as the null-safety discriminator), per-row report counts (client-derivable).

## Platform dependencies

DS-5's report store + registry + dispatcher, composed: `content_reports` and the C-D contracts (`20260720200000`), `notification_kinds` + the `notifications.type` FK (`20260723120000`), the N-D BEFORE INSERT suppression dispatcher (`20260726120000`), the N-C hint trigger (`20260725120000`). PC-4 own: `is_platform_admin()`, `admin_audit_log` pattern (a), the PC019 auth-moment rows the export section carries. PC-2/PC-3 for display-identity resolution (personal-group names, the four-hop actor chain).

## Cross-product impact

Hub consumes via FEAT-H037 (BFF-wrapped). Gimbal inherits the contracts. Member-facing surfaces gain exactly one thing with zero Hub code: the `report_resolved` notification renders in the existing bell (generic kind render). The reporter's own `/messages`-side report state is untouched (their `content_reports_select_own` read now shows resolution fields — additive, nothing breaks).

## Vertical impact

- **Privacy/GDPR:** admin-tier reads expose reporter and author display identity behind the `42501` wall; the AB-4 split executes (own-actor `audit_trail` representation, narrowed target-row exemption, manifest + invariant in the gate PR per ADR-U052 §6); the reporter's export gains outcome + timestamp, never resolver identity or note (the own-data wall precedent); erasure cascades proven at the gate — a reporter's rows die with them (existing CASCADE now covering four more columns), an erased admin anonymises via SET NULL (the NB-8 prove-don't-assume rule).
- **Notifications:** one new **registered** kind, `report_resolved` (category `platform`), flowing the registry FK + N-D dispatcher + N-C hint by construction — the NTF-6 moderation-decision leg closes. **Sanction-communication kinds: deferred to Eid (board DB-4, dated 2026-08-01, resolving the CB-1 activation clause).**
- **Administration:** this *is* ADM-10/11/16's contract layer; `moderation.*` extends the dotted namespace; the audit log becomes append-only-by-contract (the client door closes); resolution is one-shot by design, never destructive of the report record.
- **Observability:** the V4 audit-read leg lands (ADM-16); typed refusals family-wide; every mutation audited; surface telemetry rides FEAT-H037.
- **Transactions:** none.
- **Extensibility:** `status`, `resolution_kind`, `p_filter`, and the action namespace all stay open vocabularies — contract-validated additively, never CHECK-sealed, never enumerated in a consumer; `target_kind`'s open set is inherited untouched.

## Performance budget

N/A (no surface). The audit read is keyset-paginated from birth because the log grows without bound (finding 5); the queue read is jsonb-array at today's report scale with the same row-cap honesty as the member list. FEAT-H037 carries the page budgets.

## Sibling-assertion sweep (mandatory at the gate — the four-catches class)

Named starting surface, to be re-run fresh before the gate: `window-and-report-contracts.test.ts` (C-D pins — submit's return shape survives untouched; any row-shape/`%ROWTYPE` assertions vs the ALTER), `communication-export.test.ts` + `export-composite.test.ts` + `export-completeness-invariant.test.ts` (section list, `schema_version`, reports-representation pins — near-certain adaptation), `lifecycle-dispositions.test.ts` (reporter-cascade pins), `preference-and-dispatcher-contracts.test.ts` / `notification-contracts.test.ts` / `oracle-spine-port.test.ts` (kind-catalog and `platform`-category pins — a new kind joins the catalog), any suite enumerating `pg_policies` on `admin_audit_log` (the INSERT-policy drop + SELECT re-issue), and the admin suites' append-only catalog assertions. The migration header lists every hit, each marked adapted or deliberately left.

## Implementation notes (built 2026-08-02, Cycle ADM-D)

- **Closed 6-done 2026-08-02:** two migrations through two named approvals — PR #376 → `20260802120000` (the family; red **27/29** demonstrated pre-apply, the two greens exactly the labelled invariants S6c append-only and S8b dispatcher-guard) and PR #377 → `20260802170000` (the rider, below); both applied + repaired. Post-apply: the gate suite **29/29**, admin domain **101/101**, platform conformance **23/23**, account **83/83** (the adapted export pins live), notifications **106/106**, communication **107/107**. Consumed by FEAT-H037 the same day.
- **The rider (the platform gates' first-contact catch, PR #377):** `notify_report_resolved()` had leaked EXECUTE to anon (the CREATE FUNCTION default grant — revoked from PUBLIC/anon/authenticated per the notify_* class), and the three moderation contracts carried five `[core-to-domain]` edges (ADR-U047 rule 3 licenses none). Fixed the COR-A relocation way: the table-touching bodies live in three **DS-5-owned, sealed** primitives (`ds5_moderation_list_reports` / `ds5_moderation_report_detail` / `ds5_moderation_resolve_report` — EXECUTE revoked from all client roles, reachable only through the wrappers' owner execution; explicitly declared DS-5, the `ds{N}_lifecycle_` auto-prefix deliberately not borrowed), with the `admin_*` contracts as thin PC-4 wrappers — wall + vocabulary + the `moderation.report_resolved` audit write. Signatures, refusals, payloads byte-identical.
- **AB-4 executed end-to-end (ADR-U052 §6):** the composite gains the inline `audit_trail` own-actor section (the fresh `data_export` row appears in its own document — write-before-assemble), `schema_version` 2; the manifest entry rewritten per its own "THIS ENTRY IS REWRITTEN in cycle ADM-D" instruction — own-actor representation + **partial-scope** exemption for target-of-admin rows; the completeness invariant gains the partial branch (both halves legal exactly when `exemption.scope = 'partial'`, and partial requires both). The reporter's exported reports carry `resolution_kind` + `resolved_at`, never resolver identity or note.
- **The seam composed free, proven:** `report_resolved` registered under `platform`; suppression demonstrated through the real preference path (the N-D BEFORE INSERT dispatcher's word is final); the reporter-erasure CASCADE proven across the four new columns; the resolver's SET NULL anonymisation observed live (prior runs' cleaned-up operators — which also taught S8a to scope its null-actor pin per-run against the append-only log).
- **The write door closed:** `audit_log_insert_admin` DROPPED — the sweep proved no suite anywhere INSERTed through an authed client (every site verified verb + client); `audit_log_select_admin` re-issued on `is_platform_admin()` (the PG17 admin-RLS shape).
- **Two AC topology corrections at build prep (the J-C class):** an erased reporter takes the report with them (row-level CASCADE — the original AC described an impossible resolve-after-erasure); a tombstoned post keeps its author (escalation survives; NULLs only when the row is gone).
- **Suite technique (recorded):** the admin contracts' target id-space is `public.users.id` — `TestUser.user.id` is the AUTH id and the two differ (the four-hop chain); fixtures resolve profile ids explicitly.
