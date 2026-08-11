# Anatomy-Conformance Audit IV — the full Hub v2 codebase vs the anatomy, ring-focused

**Date:** 2026-08-10 (session 21)
**Status:** Executed; **Cycle COR-D built 2026-08-11** (board approved as recommended). Merged: #486 (this register + plan) · #490 (W7+W9 anatomy pair v2.7 + doc hygiene) · #491 (W8 gate patches, family 29/29). **Gates executed 2026-08-11 on Stefan's named approval ("ok merge 487, 488 and 489 — apply the migrations"):** both migrations applied (plus corrective `20260811110000` — see honesty log), #487/#488/#489 merged, every red-first suite flipped green, platform family **30/30** against the live substrate. **CYCLE COR-D CLOSED.** Per-finding closure notes below.
**Trigger:** Stefan's direct request — challenge the full Hub v2 codebase against the anatomy with special attention to the inner and outer API rings; Phase-4 cutover preparation.
**Baseline (canon wins):** [`ARCHITECTURE_ANATOMY.md`](../../architecture/ARCHITECTURE_ANATOMY.md) (stamp: ADR-U052 + ADR-U051 A2, 2026-08-10) + [`ECOSYSTEM_ANATOMY_V6.svg`](../../architecture/ECOSYSTEM_ANATOMY_V6.svg) (v2.6). Ring law: [ADR-U038](../../architecture/decisions/ADR-U038-platform-contracts-platform-side-surface-bff.md) (outer) · [ADR-U047 + A1 + A2](../../architecture/decisions/ADR-U047-internal-api-lifecycle-facts.md) (inner). Ownership: [`supabase/ownership.manifest.json`](../../../supabase/ownership.manifest.json).
**Predecessors:** [Audit I / COR-A](ANATOMY-CONFORMANCE-AUDIT.md) (2026-07-19) · [Audit II / COR-B](ANATOMY-CONFORMANCE-AUDIT-2.md) (2026-07-22) · [Audit III / COR-C](ANATOMY-CONFORMANCE-AUDIT-3.md) (2026-07-30) · the [AB-6 full anatomy audit](../hub-v2/2026-08-10-ab6-full-anatomy-audit.md) (2026-08-10 — docket-scoped, explicitly **not** a ring audit).
**Delta boundary:** none — **full coverage at HEAD `c183e759`** (main). For context: 370 commits since the COR-B close (`b0e862e`), ~21k added lines across `hub/app/api` + `supabase/migrations`; everything built after Audit III (A-ADM's six cycles, HYG-A, NE, RD-A/B/C — PC018–PC029, H038–H045) had never been ring-audited.
**Scope:** `hub/` + `supabase/` (live shape = last definition across the 116 timestamp-ordered migrations). Excluded per Audit-I precedent: `hub-legacy/` (ADR-U032 frozen oracle), `scripts/`, test code (exempt from API-first rules; binds nothing).
**Finding IDs:** `AC4-1..11` (deviations) · `AC4-O1..O4` (observations) · `GC-15..23` (gate-coverage gaps, continuing Audit III's namespace) · rulings continue at **R-7**.
**Method:** six parallel single-dimension sweeps (outer ring admin / outer ring rest / inner ring / ownership / API-first frontend / anatomy claims), full census, no sampling; every Critical/Major **disk-verified by the orchestrating session** before registration; the live conformance gates run first as ground truth (platform unit **15/15**, platform integration **27/27** — all green, which bounds every finding below as *a class the gates do not cover*). Full evidence logs: six census files (session scratchpad, contents summarized here; per-route and per-function tables reproduced in the appendix pointers of the correction plan).

---

## Verdict at a glance

| Dimension | Verdict | Findings |
|---|---|---|
| Outer ring — BFF purity (U038 cl. 1), 124/124 routes censused | **Conformant but for one contract** | AC4-1 (Major) |
| Outer ring — platform surface binding (U038 cl. 2/3) | Conformant | — |
| Inner ring — table axis, cross-DS purity, lifecycle-handler shape (U047 r. 1/2/3-tables) | **Fully conformant** | — |
| Inner ring — invocation axis (U047 r. 3-calls) | **Violated, systemically, green under the gate** | AC4-2, AC4-3 (Major) · GC-15 |
| Ownership manifest vs live substrate | **Exact, both directions** (42/42 tables, 228 functions) | gate gaps only |
| API-first / frontend data paths (U009, U038 cl. 4) | **Fully conformant, zero deviations** | AC4-10 (wording) |
| Anatomy factual claims vs code (33 sub-claims) | 33 confirmed; 2 anatomy-side staleness | AC4-7, AC4-8 |
| Doc/canon internal consistency | drift at the edges | AC4-4, AC4-5, AC4-9, AC4-11 |

**Headline:** the rings hold in structure and in data — no service-role key exists in product code, no route touches a table directly, no frontend path bypasses the BFF, no core function references a domain table, cross-DS purity is absolute, and the ownership diff is exact. The deviations are concentrated at one seam: **core→domain function *invocation*, which the W3 gate never checks (GC-15)** — and the platform-ops area gate *accepted* the undeclared moderation composition on the explicit ground "conformance gates green on the shape" ([platform-ops area gate](../hub-v2/2026-08-02-platform-ops-area-gate.md):48). The blind spot did not merely miss the crossing; it underwrote its acceptance.

## Severity scale

Unchanged since Audit I: **Critical** (live security/correctness exposure) · **Major** (structural ring/boundary/obligation violation, systemic or compounding) · **Minor** (local, cheap) · **Observation** (watch item or cited deferral) · **Ruling-needed** (canon ambiguity the code exposed; owner decision).

---

## Deviation register

### AC4-1 · Major (Critical at first policy bump) — `finalise_transcendence` trusts a caller-supplied `policy_version`

The Mist→FIM transcendence RPC inserts its `p_policy_version` parameter **verbatim** into `consent_records` (`supabase/migrations/20260626205932_feat_pc002_atomic_transcendence.sql:106-108`) with `GRANT EXECUTE … TO authenticated` (`:124`). The Hub route supplies a **Hub-side hardcoded constant** (`hub/lib/auth/transcendence-policy.ts:10` — `'v1'`; passed at `hub/app/api/auth/transcend/route.ts:47` via `hub/lib/auth/transcendence.ts:24-27`). Every other consent writer stamps the version **server-side** from `consent_purposes.current_policy_version` (`handle_new_user` `20260702120100:135`; `record_consent_decision` `20260630062757:104`; PD005 `20260708150000:464`; HYG-A `20260803190000:1317`).

Why it is a platform rule and not plumbing: `policy_version` is the sole input to the re-consent invariant — drift is computed as `l.policy_version IS DISTINCT FROM cp.current_policy_version` (`20260629211504:145`). A direct PostgREST caller (any authenticated Mist, anon key) can stamp an arbitrary version today: pre-stamping a future version **self-suppresses a future re-consent prompt**; a garbage version forces a spurious one. Latent while `'v1'` matches the seed; live consequence at the first policy-version bump — exactly when re-consent matters. This is finding S3's class (consent enforced above the substrate), one door further in.

**Fix shape (S3 precedent):** resolve `current_policy_version` for `key='transcendence'` inside the function; ignore/drop the parameter; Hub constant and pass-through retired. Schema-gated. → COR-D **W3**. *Closure: fix built, red recorded (the fake version sticks verbatim pre-apply) — **PR #488, applied + merged 2026-08-11; all cells green.** **CLOSED.***

### AC4-2 · Major + Ruling R-7 — four PC-4 wrappers invoke `ds5_moderation_*`, undeclared; two are mutations

The ADM-D/ADM-G "rider ownership split" seals DS-5-owned moderation bodies (EXECUTE revoked from all client roles) behind PC-4 `admin_*` wrappers:

| PC-4 wrapper | DS-5 callee | Call site |
|---|---|---|
| `admin_get_content_reports` | `ds5_moderation_list_reports` | `20260802170000_adm_d_pc022_rider_ownership_split_and_lockdown.sql:233` |
| `admin_get_content_report_detail` | `ds5_moderation_report_detail` | same file `:248` |
| `admin_resolve_content_report` | `ds5_moderation_resolve_report` | same file `:252` ff. — the body **mutates** (`UPDATE public.content_reports`, `:182`) |
| `admin_moderate_group_forum_post` | `ds5_moderation_moderate_group_post` | `20260804230000_adm_g_pc026_suspended_group_admin_access.sql:605` — mutation |

ADR-U047 rule 3 permits core to invoke `ds*_lifecycle_*` **and nothing else domain-side**; Amendment 2's carve-out is **read-only, declared-by-name** — currently exactly `get_own_data_export`. None of the four is declared in any ADR (grep over `docs/architecture/decisions/` — **zero** mentions of `ds5_moderation`), and the two mutations are beyond what A2 could legalise even with an entry. The design is deliberate and even self-cites "ADR-U047 rule 3" in its own COMMENTs (`20260802170000:200-214`); its sole written justification is a planning doc — "the composition IS the design (ADR-U047 rule 3); conformance gates green on the shape" ([area gate](../hub-v2/2026-08-02-platform-ops-area-gate.md):48) — and the gates were green **only because of GC-15**. A canon-elevation failure, not a smuggled hack: the shipped pattern is coherent (PC-4 owns the wall, vocabulary, and audit write; DS-5 owns its own tables), but it is not law, and nothing gates it.

**Disposition = Ruling R-7** (below): ratify by ADR-U047 Amendment 3 with bounds, or relocate. → COR-D **W1/W2**. *Closure: R-7 ruled RATIFY (2026-08-11); A3 drafted, all four pairs declared in the manifest, invocation gate red-first (exactly these five calls) then green — **PR #487, MERGED 2026-08-11; family 30/30 live.** **CLOSED.***

### AC4-3 · Major (declarable) — `get_platform_statistics` (PC-1) invokes `ds3_stats_snapshot()` (DS-3), undeclared

`20260731180000_adm_a_pc018_telemetry_store_and_statistics.sql:182` — the platform-statistics composite reads DS-3's enrolment snapshot through a DS-3-owned, client-revoked function (`:113`, `:130`). Read-only and contract-shaped — precisely the A2 class — but **undeclared**: not in the W3 vertical-composition allowlist, and ADR-U052 (which owns the statistics posture) never names it. Per A2 bound (a), an undeclared composition is a rule-3 violation, carve-out or not. Fix is declaration (Observability vertical, cited obligation), riding R-7's settlement of *where* declarations live. → COR-D **W4**. *Closure: declared (Observability, ADR-U052 posture cited) — rides **PR #487, MERGED 2026-08-11**.*

### AC4-4 · Minor — ADR-U047's fact vocabulary says 4; the substrate has 8 lifecycle handlers

Live: the four U047/A1 facts plus `ds3_lifecycle_account_deleted`, `ds7_lifecycle_account_deleted`, `ds5_lifecycle_group_closed` (all three properly declared in [ADR-U050](../../architecture/decisions/ADR-U050-account-lifecycle-state-machine.md):29,:59 as "new U047 fact handlers") and `ds5_lifecycle_user_hard_deleted` (declared only at feature level, FEAT-PD009). No boundary breach — all 8 verified SECURITY DEFINER + `search_path=''` + EXECUTE revoked (e.g. `20260721161500:115-118`, `20260720120000:428-429`). But the contract's vocabulary has no single living registry, and one fact has no ADR-grade declaration at all. → COR-D **W5**. *Closure: manifest `lifecycleFacts` registry (8 entries, per-fact citations; both DS-5 facts elevated to ADR grade by A3); the invocation gate refuses unregistered fact calls — rides **PR #487, MERGED 2026-08-11**. Cite precision note: U050 declares the two `account_deleted` facts and only references `ds5_lifecycle_group_closed` (the C-E seal) — the registry records it accordingly.*

### AC4-5 · Minor — the A2 composes-set grew 2→5; the ADR prose never moved

`get_own_data_export`'s manifest `composes` list now carries `get_own_messages_export`, `get_own_notifications_export`, `get_own_notification_preferences_export` beyond the original two. All five are read contracts — bound (b) holds in substance — but the ADR's "first allowlist entry" table was never amended. Same class as AC4-4: the declaration home is ambiguous. → COR-D **W5** (rides R-7's declaration-home settlement). *Closure: A3 names the manifest the single registry (pointer-not-snapshot; no ADR prose list is load-bearing again) — rides **PR #487, MERGED 2026-08-11**.*

### AC4-6 · Minor + Ruling R-8 — a second write home for consent

`set_journey_progress_sharing` (DS-3) INSERTs `public.consent_records` directly (`20260803190000_hyg_a_pc023_group_availability_enforcement.sql:1314`) rather than calling `record_consent_decision` (PC-4). Direction is legal (domain→core), but the consent dataset now has **two write homes**, in tension with the one-substrate-home discipline (U038 / A2 bound (c)). → COR-D **W6** after R-8. *Closure, with the **R-8 premise corrected in execution**: relocation to `record_consent_decision` is NOT behavior-preserving (no capture-context parameter; per-(subject,purpose) dedup vs the writer's per-enrollment consent). The rule moved to the one home every writer shares instead — the `enforce_consent_withdrawable` BEFORE INSERT trigger, red-first — **PR #489, applied + merged 2026-08-11** (with corrective `20260811110000`: the lockdown gate caught the new trigger function's default EXECUTE grant on its first run; revoked same day). **CLOSED.***

### AC4-7 · Minor (anatomy-side) — the diagram's PC-1 box advertises `email` with zero substrate

`ECOSYSTEM_ANATOMY_V6.svg` PC-1 box: "…pg_cron, telemetry sink, **email**, backup". The v2.6 refresh evicted feature flags from this exact box for having zero substrate and zero reading code; `email` fails the identical test: no vendor dep, no send path in `hub/`, and the substrate itself seeds the channel non-delivering — `('email','Email',false)` with "email is abstraction-only in Ferd" (`20260726120000_n_d_notification_preferences_and_dispatcher.sql:57-63`; corroborated at [notifications area gate](../hub-v2/2026-07-27-notifications-area-gate.md):134). Rider: `Storage` in the same box has zero live usage (no buckets, no `.storage` calls) — see AC4-O3. → COR-D **W7**. ***CLOSED** 2026-08-11 — diagram v2.7 (#490): email out; Storage retained per board row 6.*

### AC4-8 · Minor + Ruling R-9 — the Extension System box does not match what shipped

The anatomy places step types / content renderers / plugin registry in an Extension System drawn as a DS peer (`ARCHITECTURE_ANATOMY.md:64`). Reality: `step_kinds` is DS-3-owned, `notification_action_types` is DS-5-owned, renderers are a Hub-surface map (`hub/components/journeys/step-renderers/index.tsx:102,168`) — per-service open registries plus surface-side maps, a different shape. Compounding: the manifest's `OWNER_PATTERN` has **no Extension System token** (GC-20), so the box's first table could not even be registered. Needs an owner decision: keep the box as a future charter with an interim-shape note, or redraw. → COR-D **W7** after R-9. ***CLOSED (representation)** 2026-08-11 — R-9 ruled chartered-future; interim-shape note landed (#490). GC-20's owner token deliberately waits for first real substrate.*

### AC4-9 · Minor — `is_platform_admin` sits in the manifest's PC-1 bucket

It is the governance predicate backing the PC-4 audit read policy (`20260802120000:432-434`); the mechanical `admin_*`→PC-4 rule misses it on prefix. Gate-neutral either way (`ownership.ts:134` treats all `PC-\d` + CORE as one core-class), so this is a one-line manifest move + note. Recommend PC-4. → COR-D **W9**. *Closure: moved PC-1 → PC-4 with the unit pin updated — rides **PR #487, MERGED 2026-08-11** (the manifest-edit PR).*

### AC4-10 · Minor — "route group" wording

The anatomy and the AB-7 register row call `hub/app/admin/` a *route group*; it is a plain path segment (no parenthesised Next.js group exists in `hub/app/`). The placement claim itself is confirmed. Wording fix only. → COR-D **W7**. ***CLOSED** 2026-08-11 (#490 — anatomy wording + AB-7 register annotation).*

### AC4-11 · Minor — stale prose in prior audit artifacts

(a) [`anatomy-correction-plan-cor-b.md`](../hub-v2/anatomy-correction-plan-cor-b.md):88 still *recommends* AC2-4 path (b) while the DoD at `:114` records path (a) landed (PR #257) — annotate, don't rewrite history. (b) [`anatomy-correction-plan.md`](../hub-v2/anatomy-correction-plan.md):43 cites ADR-U047 by a filename that never shipped (`…-internal-api-inversion-lifecycle-facts.md`); the on-disk name is `ADR-U047-internal-api-lifecycle-facts.md`. → COR-D **W9**. ***CLOSED** 2026-08-11 (#490 — both annotated in place).*

---

## Rulings needed

**R-7 — the admin-plane composition class, and where declarations live** (from AC4-2/AC4-3/AC4-5). The shipped "rider ownership split" (PC-4 wall + sealed DS-owned body) is coherent and consistently applied, but ADR-U047 rule 3 does not permit it and A2 cannot stretch to its mutations. Options: **(a) ratify** — ADR-U047 Amendment 3 defining a bounded composition class (declared-by-name; admin/vertical-obligation wrappers; DS-owned body owns its own tables; mutation permitted only inside the declaring vertical's obligation; every entry cited in the W3 test's allowlist), covering the four moderation calls + `ds3_stats_snapshot`, and settling the **single canonical declaration home** (recommend: the manifest carries the entries, the W3 test reads the manifest, the ADR defines only the class — pointer-not-snapshot); or **(b) relocate** — re-shape the four calls as lifecycle-style facts / move the walls into DS-5. **Recommendation: (a).** The pattern is load-bearing across the admin family, behavior is correct, and (b) re-litigates a shipped design for no enforcement gain — the gate (GC-15) is what was actually missing.

**R-8 — one write home for consent** (from AC4-6). Recommend: DS-3's insert is relocated to call `record_consent_decision` (or a declared consent-write contract), behavior-preserving, schema-gated.

**R-9 — the Extension System's representation** (from AC4-8/GC-20). Recommend: keep the box as chartered-future, add the anatomy note that its early surface shipped as per-service registries + surface renderer maps, and add the owner token only when its first real substrate lands.

## Observations

- **AC4-O1** — `send_platform_announcement` / `retract_announcement` (DS-5) INSERT `admin_audit_log` directly (`20260720203000:115`, `20260803190000:552`). Legal direction (domain→core); watch whether audit writes should route through a PC-4 contract — the Administration-vertical mirror of the U048 question. No action owed now.
- **AC4-O2** — the anatomy pair never mentions `hub-legacy/` (ADR-U032 frozen v1 oracle, deleted at Phase-4 cutover). A one-line pointer in the Products section would let the "one-stop overview" explain the repo's top level. Folded into W7 as editor's discretion.
- **AC4-O3** — `Storage` advertised in the PC-1 box with zero live usage. Unlike `email` it is genuinely part of the Supabase substrate underneath; leaving it is defensible. Decide alongside AC4-7.
- **AC4-O4** — audit-lineage nomenclature: "ten sites" (functions, bridge usage) vs "15+ sites" (reference sites, Audit I verdict) are different units; downstream quotes mix them. Note only.

## What is conformant (verified, not assumed)

- **Outer ring, full census:** 124/124 routes read. 79 thin proxies, 38 legit-plumbing, 7 suspects — 6 resolved defense-in-depth with substrate cites, 1 deviation (AC4-1). **Zero** service-role usage in product code (the one grep hit is a comment forbidding it, `hub/lib/profile/queries.ts:6`); **zero** direct `.from()` table access in any route; every route on anon key + cookie session (`hub/lib/supabase/server.ts:4-27`), fully RLS-bound; admin routes leave authorization wholly to substrate gates (42501 → existence-hiding 404 as presentation).
- **Frontend:** value-import graph over 613 TS/TSX files, browser-reachable closure from all 95 `'use client'` entries — zero direct DB access (only sanctioned `supabase.auth.*`); all 121 client fetches target `/api/*`; exactly one server component (the 42-line provider-composition root layout); Realtime private-channel broadcast-only on the four spec topics (ADR-U039); `proxy.ts` is session-refresh + timing middleware (U038 cl. 1).
- **Inner ring, table axis:** zero core→DS table references; zero DS→DS references (both axes); acyclicity absolute; none of COR-A's ten relocation targets reappear; all 8 lifecycle handlers correctly shaped; `ds5_`/`ds7_lifecycle_*` exist and core calls them (no inline DS-5/DS-7 dispositions).
- **Ownership:** live inventory (42 tables, 228 functions) reconciles **exactly** both directions with the manifest; all 34 `admin_*` functions PC-4; zero `ds{N}_` prefix mismatches; unprefixed DS tables are safe by construction (owners resolved from the manifest; unregistered fails closed to strictest class).
- **Anatomy claims:** 33/33 remaining sub-claims confirmed — telemetry sink to the letter (deny-all RLS, one never-raising recorder, 90-day `telemetry-prune`, computed-on-read, zero matviews); account lifecycle semantics byte-identical across all five derivation sites; Tier-1 pin test covers vanish *and* widen; notifications write-edge trigger mounted (re-issued `20260727180000:163-164`); `admin_audit_log` append-only via default-deny + SELECT-only policy (`20260802120000:427-434`); exactly two cron jobs (`mist-reaper`, `telemetry-prune`); Gimbal/Studios docs-only; feature flags zero-substrate as required; reverse sweep finds no orphan substrate and every Hub surface maps to an anatomy box.
- **Gates, live:** platform unit 15/15; platform integration 27/27 (six suites) against the dev DB, this session.

## Gate-coverage gaps

| ID | Gap | Evidence | Disposition |
|---|---|---|---|
| **GC-15** | **W3 gate checks table references only — rule 3's invocation clause is unenforced.** Root cause of AC4-2/AC4-3's green acceptance. | `hub/tests/helpers/ownership.ts:127-157` (`classifyReferences` matches `public.<table>` only; no callee inspection anywhere in the family) | **Priority 1** — COR-D W2: invocation-axis check (callee matching post comment-strip; allow `ds*_lifecycle_*` from core + declared compositions), red-first. *Gate BUILT, red recorded on exactly the five live calls, green with declarations — landed with #487, 2026-08-11; family 30/30 live. **CLOSED*** |
| GC-16 | The conformance family has no named runner and no CI: no `.github/` in the repo; `hub/package.json:15-27` has eleven per-area integration scripts, none for `platform` | verified this session (suite runnable only by raw jest path) | W8: add `test:integration:platform` now; CI posture = owner decision (may be a deliberate local-first non-goal — record either way). *Script SHIPPED (#491); CI deferred to Phase-4 cutover planning (board row 5)* |
| GC-17 | Table gate filters `relkind='r'` — views/matviews/partitioned/foreign tables invisible both diff directions (latent: none exist) | `ownership-manifest-conformance.test.ts:76` | W8. *PATCHED (#491), family 29/29* |
| GC-18 | `prokind` asymmetry between the two function gates — a procedure would go red inconsistently (latent) | `function-classification-completeness.test.ts:44-51` vs `ownership-manifest-conformance.test.ts:123` | W8. *PATCHED (#491) — both aligned to `('f','p')`* |
| GC-19 | No mechanical `ds{N}_`→DS-{N} pin (the `admin_*`→PC-4 pin exists at `function-classification-completeness.test.ts:100-107`) | discipline-only today | W8. *PATCHED (#491) — `ds{N}_` → DS-{N} manifest pin* |
| GC-20 | `OWNER_PATTERN` has no Extension System token — its first table could not be registered | `ownership-manifest-conformance.test.ts:51` | rides R-9 |
| GC-21 | The `admin_*`→PC-4 pin is function-only; no table equivalent (`admin_audit_log` is PC-4 by authoring) | — | W8. *PATCHED (#491) — table-side pin added* |
| GC-22 | Trigger-mount gate exempts non-DS trigger functions; three live PC-1-on-DS-table mounts (`update_updated_at_column` on `journeys`/`journey_steps`/`forum_posts`) are the one trigger direction nothing watches | `trigger-mount-conformance.test.ts:67` | Observation-grade; record, no gate owed unless it grows |
| GC-23 | Nothing pins "migrations applied == dev DB"; the exact 42/228 count match corroborates sync but does not prove it | method caveat, all sweeps | Observation-grade; the live 27/27 run is the practical mitigation |

## Audit honesty log

- The six sweeps are static (migration text), except the gate suites, which ran live this session (15/15, 27/27) — the standard migration-vs-applied caveat (GC-23) applies; the exact inventory match is corroboration.
- Two auditor line-cites corrected at disk-verification: the `ds3_stats_snapshot` call is `:182` (reported `:134`); the fourth moderation call is `:605` (reported `:583`). No verdict changed.
- One auditor's escalation (family-wide unaudited admin refusals) was checked against canon and found to be **settled law** (RDC-03, ruled 2026-08-10, PR #478: refusal auditing is a deliberate non-goal) — recorded here as the cross-check, not registered as a finding.
- Sub-agent scratch artifacts were removed; `git status` clean at close of the sweep phase.
- Dynamic-SQL call sites (`EXECUTE format(...)`) would evade the static callee regex; none were observed, absence not proven — the GC-15 gate work inherits this caveat and should note it in-test.
- **Gate-execution honesty (2026-08-11):** the W6 migration shipped its trigger function without a REVOKE, so it carried Postgres's default PUBLIC EXECUTE — caught by the anon-execute-lockdown gate on the first post-merge run (the gate earning its keep against this audit's own corrective work). Corrective `20260811110000` (REVOKE-only, on the object covered by #489's named approval) applied same-day; family re-run 30/30. Also: the three dev-DB applies ran via the management API, which initially stamped the remote history with its own versions; reconciled same-day per the house workflow (`migration repair` — MCP stamps reverted, repo timestamps marked applied) and verified with `migration list`: local and remote agree 1:1 through `20260811110000`.

## Related

Correction plan: [`anatomy-correction-plan-cor-d.md`](../hub-v2/anatomy-correction-plan-cor-d.md) · Predecessor registers and plans linked in the header · The AB-6 record for today's sibling audit: [`2026-08-10-ab6-full-anatomy-audit.md`](../hub-v2/2026-08-10-ab6-full-anatomy-audit.md)
