# Anatomy Conformance Audit — codebase vs the anatomy documents

**Date:** 2026-07-19
**Status:** Findings recorded. Rulings R-1/R-2/R-3 decided by Stefan 2026-07-19 (see §Rulings). Tranche scheduling decided: Tranches I+II run as a corrective cycle **before** the Communication area (A-COM). The correction plan exists: [`../hub-v2/anatomy-correction-plan.md`](../hub-v2/anatomy-correction-plan.md) (Cycle COR-A, drafted 2026-07-19) — this register is its evidence base.
**Scope:** `hub/` + `supabase/` (decision 2026-07-19: `hub-legacy/`, `experiments/`, `scripts/` excluded — deviations there die with the code). Test code is exempt from API-first rules.
**Baseline (canon wins):** [`ARCHITECTURE_ANATOMY.md`](../../architecture/ARCHITECTURE_ANATOMY.md) (stamp: ADR-U046) · [`ECOSYSTEM_ANATOMY_V6.svg`](../../architecture/ECOSYSTEM_ANATOMY_V6.svg) (v2.4) · ground-truth ADRs [U002](../../architecture/decisions/ADR-U002-five-cross-cutting-verticals.md), [U009](../../architecture/decisions/ADR-U009-api-first-frontend-agnostic.md), [U023](../../architecture/decisions/ADR-U023-platform-decomposition.md), [U038](../../architecture/decisions/ADR-U038-platform-contracts-platform-side-surface-bff.md) · [`DOMAIN_SERVICE_DEPENDENCIES.svg`](../../architecture/DOMAIN_SERVICE_DEPENDENCIES.svg).
**Predecessor:** [`hub-v2/api-conformance-register.md`](../hub-v2/api-conformance-register.md) (2026-07-02, 9 routes). This audit re-baselines it after the Groups and Journeys areas (52 route files) and extends beyond the API ring to the inner ring, ownership, dependency direction, and verticals.
**Method:** five independent audit dimensions run in parallel (outer ring / substrate enforcement / ownership + inner ring / DS dependency direction / verticals + steering), each bound to named canonical sources with mandatory `file:line` citations. Every Major finding's evidence was disk-verified by the orchestrating session at the cited lines; predecessor-closure verdicts S3/F1/F2 are double-attested (route-side and substrate-side independently).

---

## Verdict at a glance

| Dimension | Verdict |
|---|---|
| **Outer ring (Platform API, ADR-U009/U038)** | **CLEAN.** 52 route files; zero `.from(`/`.rpc(` in routes; zero direct DB access from pages/components; no service-role key in app code; no server actions. All DB access delegated to `hub/lib/*`, which is RPC-thin-wrappers throughout (one RLS-protected reference-table read). |
| **Substrate enforcement (ADR-U038 clause 1)** | **HONORED.** Every mutation flows through a SECURITY DEFINER RPC with REVOKE-PUBLIC/anon + GRANT-authenticated discipline; app-layer gates verified as defense-in-depth, not sole homes. All five 2026-07-02 corrective tranches (S1–S3, F1–F2) confirmed landed. |
| **Inner ring (Internal API, domain↔core)** | **DEVIATION — the audit's headline.** Table/FK structure is perfectly layered (no core table references a domain table), but core *code* authors domain cascades: PC-2/PC-3/PC-4 lifecycle RPCs directly read and mutate DS-3 `journeys`/`journey_enrollments` at 15+ sites across 8 migrations (AC-1, AC-2). |
| **DS dependency direction (acyclic, DS-7 leaf)** | **CLEAN at the DB layer.** No DS→DS foreign keys; `journal_entries` (DS-7) has zero inbound references. Two TS-only soft touches of DS-7 from BFF/UI plumbing (AC-5). |
| **Verticals + steering docs (ADR-U002/U038)** | **ALIGNED.** All vertical gaps are explicitly deferred with planning-doc citations, none forgotten. Hub `CLAUDE.md` and PC-3 spec §7 carry the post-U038 wording. Minor doc debts (AC-7, AC-8). |

**No Critical findings.** The security-reachable class the 2026-07-02 audit found (S1–S3) is closed in the substrate. The top remaining class is structural: the inner ring's direction rule is violated in code, and the cost of that coupling grows with every core lifecycle feature.

**Anatomy coverage note:** of the anatomy's layers, the realized entities today are the Hub (product), PC-1..PC-4, DS-3 Journeys, DS-7 Intelligence (Journal store only), and a pre-DS-5 communication substrate (`notifications`, `forum_posts`, `conversations`, `direct_messages` tables from the foundation migration). DS-1/2/4/6, the Gimbal, the Studios, and the Extension System are unrealized — their rules were audited only where code touches their territory.

---

## Severity scale

- **Critical** — anatomy violation with live security or correctness exposure. (None found.)
- **Major** — structural violation of a ring/boundary rule; systemic or compounding over time; no current runtime impact.
- **Minor** — local, contained deviation; cheap to correct.
- **Observation** — watch item, deferred seam, or item blocked on a ruling.
- **Ruling** — not a code defect; a canon ambiguity the code exposed, needing an owner decision (§Rulings).

---

## Deviation register

### AC-1 · Major (systemic) — Core authors DS-3 lifecycle cascades inline

**Rule violated:** Platform Core is domain-agnostic; the Internal API flows domain→core only (ARCHITECTURE_ANATOMY §Platform Core, §Internal API; ADR-U023).
**What the code does:** PC-3/PC-4 lifecycle RPCs freeze enrollments and transfer journeys by naming DS-3 tables directly:

| Core function (owner) | Evidence |
|---|---|
| `leave_group` original shape (PC-3) | `supabase/migrations/20260228120745_sprint2_leave_group_core.sql:197-230, 297-304, 370-377` |
| `_handle_stewardship_nomination_action` (PC-3) | `20260228125730_sprint3_smart_notifications.sql:193-199` |
| `admin_exit_user_from_platform` (PC-4) | `20260228144747_sprint4_platform_exit.sql:170-204` (freeze + transfer non-public journeys to DeusEx) |
| `remove_member` (PC-3) | `20260704192549_feat_pc013_membership_lifecycle_contracts.sql:346-358` |
| leadership transfer / `close_group` (PC-3/PC-4) | `20260705072252_feat_pc014_leadership_transfer_closure_contracts.sql:326-333, 497-504, 729-758, 856-884` |
| `leave_group_as_group` (PC-3) | `20260706120000_feat_pc015_group_of_groups_acting_contracts.sql:373-380` |
| `leave_group` fix (PC-3) | `20260705115243_fix_leave_group_last_member_copy.sql:86-94` |

**Acknowledged debt, not silent drift:** the pc013 comment (`:342-345`) explicitly labels the crossing a "DS-3 satisfied-now disposition, re-verified at the Journeys gate". This register converts that disposition into a tracked deviation.
**Why it matters:** the stability zone now hardcodes iteration-zone reactions. Every new core lifecycle feature (pc013→pc014→pc015 shows the growth) re-implements the freeze cascade; DS-3 can never change its enrollment-disposition policy, or be extracted, without editing core.
**Correction direction:** define the Internal-API inversion — core emits lifecycle facts (member-removed, group-closed, user-exited); DS-3 owns a single enrollment-disposition handler that core invokes by contract (in the monolith: one DS-3-owned function/trigger seam), so no PC object names `journeys`/`journey_enrollments`. Needs a small design + ADR, then mechanical relocation of the seven sites.
**TS mirror (no action):** the groups BFF composing journey reads (`hub/app/api/groups/[id]/route.ts:6`, `.../journeys/[enrollmentId]/progress/route.ts:4`) is legitimate cross-owner BFF aggregation per ADR-U038; listed only so the pattern is visible in one place.
**CLOSED (2026-07-19):** ADR-U047 (+Amendment 1) ratified; migration `20260719190205` applied and merged (PR #188). Nine sites relocated to the `ds3_lifecycle_*` contract — plus a **tenth this audit missed**, `admin_hard_delete_user` (PC-4 sentinel reassignment), found by the W3 conformance gate during the build and relocated under Amendment 1. Gate green in-suite (`internal-api-conformance.test.ts`); full integration 477/477 post-apply.

### AC-2 · Major — PC-2 Mist erasure deletes DS-3 journeys directly

**Rule violated:** same inner-ring direction rule.
**Evidence:** `_erase_mist` — `20260626202215_feat_pc002_mist_explicit_erase.sql:71-74`: `DELETE FROM public.journeys WHERE created_by_group_id = v_personal_group_id`, ordered before the auth-user delete because of `created_by_group_id → groups ON DELETE RESTRICT`.
**Mitigation:** it fulfils the Privacy/GDPR vertical's erasure obligation, and the FK ordering forced *some* answer.
**Correction direction:** same family as AC-1 — a DS-3-owned erasure hook on personal-group erasure; PC-2 stops naming domain tables. Fold into the AC-1 design.
**CLOSED (2026-07-19):** relocated to `ds3_lifecycle_personal_group_erased` in the same migration (PR #188), FK-RESTRICT ordering preserved; pinned by the farewell characterization test.

### AC-3 · Observation (resolved by R-1, 2026-07-19) — `public.notifications` written by core and DS-3 alike

**Was blocked on Ruling R-1; R-1 is decided** — `notifications` is the Notifications-vertical delivery substrate, so these writes are compliant obligation-fulfilment. AC-3 closes as Observation; the remaining work is doc-level (Tranche II ADR/charter note). Original analysis kept below for the record.
**Writers:** PC-3 triggers (`20260222000000_rebuild_universal_group_pattern.sql:998-1228`), PC-4 `admin_send_notification` (`rebuild:2143`), PC-3 RPCs (`pc013:169,248`; `pc014` multiple; `pc015:606`); DS-3 RPCs (`pd002 20260707130821:446`, `pd003 20260707190000:685`, `pd003 amendment 20260707213500:238`, `pd004 20260708120000:275`).
**If R-1 = vertical substrate (recommended):** these writes are obligation-fulfilment — compliant; AC-3 closes as Observation.
**If R-1 = DS-5-owned:** every core write is a core→domain leak and every DS-3 write a reverse DS edge (DS-3→DS-5 is not an allowed read/write direction) — a Major, multi-site relocation into a DS-5 routing contract.

### AC-4 · Minor — GDPR export completeness contract lives in BFF assembly

**Rule:** ADR-U038 clause 1 (spirit): a sibling surface must inherit contracts without re-implementing them.
**Evidence:** `hub/app/api/account/export/route.ts:4-5,25` composes three export RPCs (`get_own_data_export` + `get_own_journal_export` + `get_own_step_instances_export`). Each RPC is substrate-owned; but *which datasets constitute a complete export* is decided only in Hub code — the Gimbal would have to replicate the 3-way merge to be GDPR-complete.
**Correction direction:** one platform-side composite (`get_own_data_export` composing all datasets) or a platform-recorded export manifest; route becomes a thin proxy again.

### AC-5 · Minor — "Nothing depends on DS-7" soft-violated in TS plumbing

**Rule:** ARCHITECTURE_ANATOMY §Domain Services ("nothing depends on DS-7"). DB layer is clean — `journal_entries` has zero inbound FK/function/trigger references.
**Evidence:** (a) `hub/app/api/account/export/route.ts:4` imports the journal export fetch (GDPR forward-seam, folds into AC-4's composite); (b) `hub/lib/auth/AuthContext.tsx:6-14` — logout cache-clear imports every area's cache module including journal's.
**Correction direction:** registry-pattern cache invalidation (each area registers its invalidator with auth; auth stops importing area modules); export resolves via AC-4.

### AC-6 · Minor — Administration audit seam is console-only with a stale binding note

**Rule:** ADR-U002 Administration vertical; ADR-U038 clause 1 (adjacent — an audit record is an obligation, not a business rule, so this is a seam gap, not a sole-home violation).
**Evidence:** `hub/lib/audit/audit.ts:24-28` — `recordAuditEntry` writes structured console + telemetry only; its TODO says persistence lands "in the Identity area", but Identity closed 2026-07-03 and the seam still isn't bound. The durable home already exists: `admin_audit_log`, RLS admin-only (`20260223171200:74-78`).
**Correction direction:** route `recordAuditEntry` through a SECURITY DEFINER auth-event recorder into `admin_audit_log` — or re-date the TODO to the area that owns it (Platform-Ops).

### AC-7 · Minor (docs) — Predecessor register not annotated per-finding-closed

**Evidence:** `api-conformance-register.md:3` (header claims S1–S3/F1–F2 merged via PR #48/#49) vs `:54-67` (findings still read as-found) vs `:124-126` (§7 records only the LOW closure).
**Correction direction:** add §7 closure entries citing the migrations — this audit's §Verified-closed table below supplies the IDs verbatim.

### AC-8 · Minor (docs) — `docs/platform/CLAUDE.md` states `/api/v1` + Bearer universally

**Evidence:** `docs/platform/CLAUDE.md:40,54` — the versioning and Bearer rules are stated without the ADR-U038 clause-3 scoping (they bind the *platform surface*; Hub `app/api/*` BFF plumbing is exempt). A reader could re-derive the V1/V2 pseudo-deviations.
**Correction direction:** one-line scoping caveat citing ADR-U038 clause 3.

### AC-9 · Observation — Residual assurance caveat

Substrate homes were verified *structurally* (zero direct writes in `hub/lib`; zero `.from(`/`.rpc(` in routes; uniform DEFINER + REVOKE/GRANT discipline; fail-closed caller resolver `get_current_user_profile_id` filtering `is_active = true`; dense in-function lifecycle guards). The ~90 RPC bodies were **not** exhaustively read to confirm each internally enforces its full documented permission gate. Confidence is high; exhaustive per-RPC gate verification remains open for a future deep pass (candidate: per-area, at each area gate).
**DISPOSITION (2026-07-19, Stefan — COR-A W12):** standing **per-RPC gate-verification row added to the Phase-3 area-gate DoD** (hub-v2 README, Phase-3 gate), applying from A-COM onward — the assurance pass folds into the gate rhythm instead of a big-bang re-audit. The core/domain half is enforced mechanically in every suite run by `internal-api-conformance.test.ts`.

---

## Rulings needed (canon decisions, not code defects)

### R-1 — Who owns `public.notifications`: DS-5 Communication or the Notifications vertical?

The audit's only classification question that changes a verdict (drives AC-3).
- **For DS-5:** the DS-5 charter names "notification routing and delivery" (ARCHITECTURE_ANATOMY §DS-5).
- **For vertical substrate:** the table was born in the core foundation migration (`rebuild:214`), predates any DS-5 build, has a generic shape (`type/title/body/payload`), and is written by core and DS-3 alike — the classic write-side vertical-obligation pattern (ADR-U002), like audit/telemetry.
- **Recommendation:** rule it the Notifications-vertical *delivery substrate* (platform-side) now; when the Communication/Notifications areas build DS-5, DS-5 takes the routing/preferences layer on top of it. Record as a short ADR or a charter note in the DS-5 file. AC-3 then closes as Observation.
- **DECIDED (Stefan, 2026-07-19): vertical delivery substrate now; DS-5 takes the routing/preferences layer when built.** To be captured as a short ADR in Tranche II. AC-3 closed as Observation.

### R-2 — `consent_records` / `consent_purposes`: PC-2 or PC-4?

Doc-level only; no code change either way. ADR-U034 already calls consent identity/governance-adjacent. **Recommendation:** PC-2 (the Mist lifecycle is PC-2) with a governance-adjacency note.
**DECIDED (Stefan, 2026-07-19): PC-2 Identity, with a governance-adjacency note per ADR-U034.**

### R-3 — `content_families`: DS-3 or DS-4?

Doc-level only. It is a SELECT-only registry of step content families seeded with the step-kind taxonomy (`pd003:49`), self-described as "narrative core vocabulary". **Recommendation:** DS-3 step-taxonomy for now; revisit when DS-4 Content materializes. (Even read as DS-4, DS-3→DS-4 is an allowed direction — non-deviating either way.)
**DECIDED (Stefan, 2026-07-19): DS-3 step taxonomy; revisit when DS-4 Content is decomposed.**

---

## Verified closed (predecessor register, confirmed in substrate)

| Finding | Substrate evidence | Surface evidence |
|---|---|---|
| S1 — users UPDATE limited to identity-scope set | `20260702120000:33-38` (disk-verified) | — |
| S2 — client SELECT on `users.email` revoked | `20260702120000:40-48` + column comment `:50-53` (disk-verified) | — |
| S3 — sign-up consent enforced + durably recorded | `20260702120100:54-59` fail-closed RAISE; `:138-146` durable row, purpose `transcendence`, `capture_context.flow='credentialed-signup'` | route gate `hub/lib/auth/signup.ts:40` correctly demoted to defense-in-depth |
| F1 — own-profile contract platform-side | `update_own_profile` in `20260702130000` (INVOKER by design, so S1 column grants apply) | `hub/app/api/profile/me` thin proxy via `hub/lib/profile/queries.ts:164,185` |
| F2 — member-groups read-model platform-side | `get_member_groups` in `20260702130100` | `hub/app/api/groups` GET thin proxy via `hub/lib/groups/queries.ts:22` |
| LOW — nominations client-clock | `get_my_pending_nominations`, `20260707130821` (FEAT-PC016) | `hub/lib/groups/leadership.ts:100` |
| F3 / V1 / V2 | Dispositioned by ADR-U038 itself (clauses 1 and 3) — no code change was due | route comments cite the clause (e.g. `hub/app/api/account/state/route.ts:15`) |

---

## What is conformant (keep doing this)

- **The outer ring is exactly the anatomy's picture.** 52 route files are thin controllers: identity check → one `hub/lib` call → SQLSTATE→HTTP mapping. Frontend pages are `'use client'` components fetching `/api` through per-area `client.ts` wrappers (54 `fetch(` call sites); lib imports in pages are `import type` only. The one direct table read (`fetchRoleTemplates`, `hub/lib/groups/queries.ts:179-188`) is a deliberate PostgREST read of RLS-protected platform vocabulary — compliant per ADR-U038 clause 2.
- **The browser Supabase client is auth-only** (`hub/lib/auth/AuthContext.tsx:72` — `supabase.auth.*`, no table access), matching ADR-U009's realtime/auth carve-out. `hub/proxy.ts` is session-cookie refresh middleware only.
- **Substrate discipline is uniform:** SECURITY DEFINER + REVOKE/GRANT on every contract; `anon` EXECUTE swept off all public functions (`20260706201500:31-33`); consent append-only trigger; journal and journey tables fully revoked from client roles with RPC-only access.
- **The DS graph is healthy where it exists:** no DS→DS foreign keys; DS-7 is a true leaf at the DB layer; no forbidden edges.
- **Steering stayed true after ADR-U038:** Hub `CLAUDE.md:23` carries the clause-4 wording; PC-3 spec §7 is pointer-not-snapshot; `hub/README.md:18` consistent.
- **Nothing on the verticals is silently missing:** Transactions absent per ADR-U011 (self-declared in its spec), Notifications area explicitly ahead in Phase-3 order, observability seam register-acknowledged.

---

## Correction-plan seeds (for step 2 — scheduling decided 2026-07-19: Tranches I+II run as a corrective cycle before A-COM)

1. **Tranche I — Internal-API inversion (AC-1 + AC-2):** design the core-emits / DS-3-reacts seam, capture as an ADR, relocate the eight files' cascade sites. Schema-gate applies (function bodies change; behavior should not).
2. **Tranche II — Rulings (R-1..R-3):** three decisions, ~one short ADR/charter-note each; R-1 unblocks AC-3's disposition.
3. **Tranche III — Contract completeness (AC-4, AC-6):** platform-side export composite; bind the audit seam to `admin_audit_log` (or re-date it).
4. **Tranche IV — Hygiene (AC-5, AC-7, AC-8):** cache-invalidation registry; register closure annotations; platform CLAUDE.md caveat. No schema impact.
5. **Standing item (AC-9):** per-RPC gate verification, folded into future area gates.

---

## Appendix A — Route inventory (52 files, all cookie-session private BFF per ADR-U038 clause 3)

Reads verify identity via `getVerifiedUserId` (ADR-U037 `getClaims`); mutations via `supabase.auth.getUser()`. "Home" = the platform-side contract (migration short-ref: rebuild=20260222000000, pc00x/pc01x/pd00x = the feat migration carrying that contract). All are thin proxies unless noted.

| Route (`hub/app/api/`) | Methods | Platform-side home |
|---|---|---|
| auth/signup | POST | `handle_new_user` S3 gate (20260702120100); route gate = defense-in-depth |
| auth/transcend | POST | `finalise_transcendence` (20260626205932) |
| auth/farewell | POST | `explicit_erase_mist` (20260626202215) |
| auth/audit | POST | none — console seam (AC-6) |
| account/state | GET | `get_own_account_state` (20260629054349) |
| account/consent | GET, POST | `get_own_consent_state` / `record_consent_decision` (20260629211504 / 20260630062757) |
| account/export | GET | 3 export RPCs composed in BFF (AC-4) |
| profile/me | GET, PATCH | `get_own_profile` / `update_own_profile` (20260702130000) |
| groups | GET, POST | `get_member_groups` (20260702130100) / `create_engagement_group` (20260704075547) |
| groups/[id] | GET, PATCH, DELETE | `get_group_detail` + `get_group_enrollment_summary` / `update_group_settings` / `delete_group` |
| groups/[id]/close · hand-to-deusex · nominate-steward | POST | `close_group` / `hand_stewardship_to_deusex` / `nominate_steward` (pc014) |
| groups/[id]/leave | POST | `leave_group` (pc013 + 20260705115243) |
| groups/[id]/roles (+/[roleId]) | GET, POST, PATCH, DELETE | `get_group_roles` / `create_group_role` / `update_group_role` / `set_group_role_permission` / `delete_group_role` (pc011); GET also reads `role_templates` via RLS (compliant) |
| groups/[id]/members/[mg] (+activate/pause) | DELETE, POST | `remove_member` / `activate_member` / `pause_member` (pc013) |
| groups/[id]/members/[mg]/roles/[roleId] | POST, DELETE | `assign_member_role` / `remove_member_role` (pc011) |
| groups/[id]/my-permissions | GET | `get_user_permissions` (rebuild) |
| groups/[id]/member-search · invitations (+cancel x2) | GET, POST, DELETE | `search_invitable_members` / `get_group_invitations` / `invite_member` / `invite_by_email` / `cancel_member_invitation` / `cancel_email_invitation` (pc012) |
| groups/[id]/invite-group · invitable-groups · acting/{respond,leave,memberships} | GET, POST | `invite_group` / `search_invitable_groups` / `respond_to_group_invitation` / `leave_group_as_group` / `get_group_memberships_of` (pc015) |
| groups/[id]/journeys/[enrollmentId]/progress | GET | `get_group_journey_progress` (pd005) |
| me/overview | GET | aggregator over 6 substrate reads (ADR-U042, "never decides") |
| me/invitations (+/[groupId]) | GET, POST, DELETE | `get_my_invitations` / `accept_group_invitation` / `decline_group_invitation` (pc012) |
| me/nominations | GET | `get_my_pending_nominations` (pd002/FEAT-PC016) |
| me/journeys | GET | `get_my_enrollments` (pd002) |
| me/acting-contexts | GET | `get_acting_contexts` (pc015) |
| me/onboarding | GET | `get_onboarding_status` (pd006) |
| notifications/[id]/nomination-response | POST | `respond_to_stewardship_nomination` (pc014) |
| journeys (+/[id]) | GET | `get_journey_catalog` / `get_journey_detail` (pd002/pd003) |
| journeys/[id]/enroll · withdraw | POST | `enroll_self_in_journey` / `enroll_group_in_journey` / `withdraw_from_journey` (pd002/pd003) |
| journeys/enrollments/[e]/player | GET | `get_player_state` (pd003/04/05/07) |
| journeys/enrollments/[e]/sharing | POST | `set_journey_progress_sharing` (pd005) |
| journeys/enrollments/[e]/steps/[s]/{enter,complete,response} | POST | `enter_journey_step` / `complete_journey_step` / `save_step_response` (pd003/pd004/pd007) |
| journal (+/[id]) | GET, POST, PATCH, DELETE | `get_own_journal_entries` / `create_journal_entry` / `update_journal_entry` / `delete_journal_entry` (pd001, 20260703084810) |
| sessions (+/[id]) | GET, DELETE | `get_own_sessions` / `revoke_own_session` (pc009, 20260703154102) |

No `mist/*` or `become-a-fim/*` API routes exist: Mist entry is client-side `signInAnonymously` (`hub/lib/auth/mist.ts:43`) materialized by `handle_new_user`; become-a-FIM is the transcend route.

## Appendix B — Table ownership map (28 net tables)

| Owner | Tables |
|---|---|
| PC-1 Infrastructure | (no app tables — Supabase substrate itself) |
| PC-2 Identity | `users`, `consent_records`*, `consent_purposes`* (*R-2), `pc2_config`, `reaper_runs` |
| PC-3 Organisation | `groups`, `group_memberships`, `permissions`, `role_templates`, `group_templates`, `role_template_permissions`, `group_template_roles`, `group_roles`, `group_role_permissions`, `user_group_roles`, `pending_email_invitations` |
| PC-4 Governance | `admin_audit_log` |
| DS-3 Journeys | `journeys`, `journey_enrollments`, `journey_steps`, `journey_step_instances`, `step_kinds`, `content_families`* (*R-3) |
| Notifications vertical (R-1 decided) / pre-DS-5 substrate | `notifications` (vertical delivery substrate per R-1; DS-5 routing layer later), `forum_posts`, `conversations`, `direct_messages` (pre-DS-5 communication substrate) |
| DS-7 Intelligence | `journal_entries` |

No PC-owned table carries an FK or column referencing a DS-owned table — structural layering is fully correct; AC-1/AC-2 are code-level only.

## Appendix C — Code ownership map (`hub/`)

| Area | Owner |
|---|---|
| `lib/supabase/*`, `lib/observability/*`, `hub/proxy.ts` | PC-1 / Observability vertical (INFRA) |
| `lib/auth/*`, `lib/account/*`, `lib/consent/*`, `lib/profile/*`, `lib/sessions/*`, `lib/onboarding/*`† | PC-2 (consent/export double as Privacy vertical) |
| `lib/groups/*` | PC-3 |
| `lib/audit/*` | PC-4 |
| `lib/journeys/*` | DS-3 |
| `lib/journal/*` | DS-7 |
| `lib/me/*`, `app/api/me/*`, `app/api/account/export` | BFF aggregators over multiple owners — legitimate per ADR-U038 clause 1, no single owner (by design) |

† `onboarding` is provisionally PC-2-adjacent as an experience, but its platform contract `get_onboarding_status` (pd006) is DS-3-owned — it legitimately reads journey/enrolment tables (DS-internal direction, allowed; allowlisted as DS-owned by the conformance gate). *(Corrected 2026-07-19 — the original "touches only its own contract + INFRA" line was inaccurate.)*

---

*Produced by the 2026-07-19 anatomy-conformance audit (five parallel audit dimensions; Major evidence disk-verified). Successor to the 2026-07-02 API-boundary audit. Feed Tranches I–IV into cycle planning as step 2.*
