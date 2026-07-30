# Anatomy Conformance Audit III — the pre-A-ADM deep pass

**Date:** 2026-07-30
**Status:** **OPEN** — findings verified and registered; correction plan proposed as **Cycle COR-C** ([`../hub-v2/anatomy-correction-plan-cor-c.md`](../hub-v2/anatomy-correction-plan-cor-c.md)), **held for Stefan's review** — nothing has been executed.
**Trigger:** Stefan, 2026-07-30 — deep codebase-vs-anatomy analysis before the A-ADM (Platform-Ops) area opens.
**Baseline (canon wins):** [`ARCHITECTURE_ANATOMY.md`](../../architecture/ARCHITECTURE_ANATOMY.md) (stamp: ADR-U051) · [`ECOSYSTEM_ANATOMY_V6.svg`](../../architecture/ECOSYSTEM_ANATOMY_V6.svg) (v2.5) · ground-truth ADRs U002, U009, U013, U023, U028, U031, U038, U047 (+A1–A3), U048, U049, U050, U051 · [`supabase/ownership.manifest.json`](../../../supabase/ownership.manifest.json) (ownership ground truth). *The audit was initially requested against `ARCHITECTURE_ANATOMY_V1.md`; corrected at kickoff — V1 is bannered historical (superseded by ADR-U023).*
**Predecessors:** [`ANATOMY-CONFORMANCE-AUDIT.md`](./ANATOMY-CONFORMANCE-AUDIT.md) (2026-07-19, AC-1..AC-9 → Cycle COR-A) · [`ANATOMY-CONFORMANCE-AUDIT-2.md`](./ANATOMY-CONFORMANCE-AUDIT-2.md) (2026-07-22, AC2-1..AC2-5 → Cycle COR-B).
**Delta boundary:** commit `b0e862e` (COR-B close, PR #258, 2026-07-22). Everything after it — the entire A-NTF area (PRs ~#260–#333), ADR-U050's acceptance, the DS-5 routing layer — was unaudited by any predecessor.
**Scope:** `hub/` + `supabase/` at HEAD (`b83ed38`). Exclusions per the Audit I decision: `hub-legacy/`, `experiments/`, `scripts/`; test code exempt from API-first rules.
**Finding IDs:** `AC3-*` (continuing the `AC-*` / `AC2-*` namespace). Rulings continue Audit I's numbering at **R-4**.

**Method:** six dimensions. D0 (mechanical gates re-run + Audit-I open-finding closure check) run by the orchestrating session; D1–D5 run as five parallel audit agents, each bound to named canonical sources with mandatory `file:line` citations. **Every Critical and Major finding was disk-verified by the orchestrating session at the cited lines before entering this register** (the Audit I standard). Known static-analysis traps (drop-unaware migration parsing, comments-as-code, the `/api/v1` clause-3 pseudo-finding, ADR-U048 substrate writes) were briefed into every dimension; none produced a false finding.

| Dim | Subject |
|---|---|
| D0 | Gates re-run at HEAD; Audit-I unannotated findings resolved |
| D1 | Post-Audit-II delta sweep (`b0e862e..HEAD`: 11 migrations, 8 routes, 4 pages, 8 components, 10 lib modules) |
| D2 | DS-5 charter fit + the DS-5 / Notifications-vertical boundary (U048/U049/U051) |
| D3 | PC-2 account lifecycle (U050) + Mist lifecycle (U031) |
| D4 | Five verticals as obligations, per realized tier |
| D5 | Design-system band + product-surface conformance (never previously audited) |

---

## Verdict at a glance

| Dimension | Verdict |
|---|---|
| **D0 — the COR-A/COR-B gates** | **ALL GREEN at HEAD** (2026-07-30): route-policy, outer-ring, DS direction rule (unit 27/27); inner ring vs live `pg_proc` + ownership-manifest completeness (integration 15/15, serial). The invariants Audits I–II established held through the whole A-NTF build. |
| **D1 — the A-NTF delta** | **CLEANEST ring-discipline surface yet measured.** Zero `.from(`/`.rpc(` in routes; zero browser-reachable table access; RLS + policy on every new table; REVOKE/GRANT on every new function; manifest registration of every genuinely-new artifact complete. No Critical, no Major. |
| **D2 — DS-5 / Notifications boundary** | **Substrate exemplary; surface exposed.** Routing/preferences/suppression/fan-out all platform-homed (ADR-U048); announcements realized rule-for-rule (ADR-U049). But the ADR-U051 typed-action framework's routing table exists only in Hub TS (AC3-5). |
| **D3 — PC-2 lifecycle** | **The audit's headline.** The self-service half, the derivation, the fail-safe default, and the Mist lifecycle are conformant. The admin half of ADR-U050 was never wired — **Critical AC3-1**. |
| **D4 — five verticals** | **One silent regression** (GDPR export completeness, AC3-3) with a systemic cause (AC3-4); everything else conformant or deferred-with-citation, including AC-6 (properly re-homed to A-ADM). |
| **D5 — design-system band** | **The band's obligations are live canon (ADR-U013 Accepted) but have no substrate:** zero i18n, zero tokens, a11y gaps on the mandated primitives (AC3-6/7/8) — hinging on ruling R-6 (tier active vs dormant). Component adoption itself is genuinely good (19/20 pages on shared primitives). |

**One Critical · 7 Major · 11 Minor · 3 Rulings · 9 Observations.** The pattern across all six dimensions: *where a mechanical gate exists, the code is conformant; every deviation found lives where no gate was looking* — the pre-U050 admin contract, the surface side of U051, the export composite's completeness, and the band tier.

---

## Severity scale (unchanged from Audit I)

**Critical** — anatomy violation with live security or correctness exposure · **Major** — structural ring/boundary/obligation violation; systemic or compounding · **Minor** — local, cheap to correct · **Observation** — watch item or cited deferral · **Ruling-needed** — canon ambiguity the code exposed; owner decision required.

---

## Deviation register

### AC3-1 · **CRITICAL** — The admin half of ADR-U050 was never wired: an admin cannot hold a paused account, and a member can escape a hold

**Rule violated:** `ARCHITECTURE_ANATOMY.md:73` — *"a member may return their own `paused` account to active and **may never escape a `suspended` one**"*; ADR-U050 state table (the producer of `suspended` is `admin_update_user_status()`; return-to-active is *"an admin only — never the member"*).
**Evidence (disk-verified):** `supabase/migrations/20260223171200_fix_rc7_admin_user_ops.sql:184-186` — the entire mutation is `UPDATE public.users SET is_active = new_is_active, updated_at = now()`. It **never writes `deactivation_origin`**, and it is the sole live definition at HEAD. Every `deactivation_origin` write in the tree is self-service or backfill (`20260721161500:52,165,232,514`; `20260721170000:263`) — no admin contract writes the column. `admin_decommission_user` is likewise origin-blind.
**The escape (composes end-to-end):** member calls `pause_own_account()` → `origin='member'` (`20260721161500:163-166`). Admin imposes a hold via `admin_update_user_status(target, false)` → no-op (row already off; origin untouched). `get_own_account_state()` still derives `paused` (`:572-577`), the reactivation gate `IS DISTINCT FROM 'member'` (`:226`) **passes**, and the Hub renders the reactivation button (`hub/components/account/AccountStateView.tsx:72-73`). The member walks out of the admin's hold. Corollary: admin reactivation never clears a stale `'member'` origin, so the trap re-arms.
**Mitigating floor:** the NULL-origin fail-safe is correctly built — an off row of unknown origin reads `suspended`, and all three gates are NULL-safe in the deny direction. Accounts never member-paused deny correctly; the backfill (`:51-53`) stamped pre-existing off rows `'admin'`.
**Why Critical:** the origin split is the one sentence the anatomy's PC-2 paragraph emphasizes, and A-ADM — the area that opens next — builds the admin console **on these exact contracts**. The RPC is `GRANT`ed to `authenticated` behind `manage_all_groups`, so the path is live, not theoretical.
**Correction direction:** re-issue `admin_update_user_status` writing `deactivation_origin = 'admin'` on hold / `NULL` on release, in the same statement; add the `'admin'` write to `admin_decommission_user` (record hygiene); add `FOR UPDATE` (AC3-14) in the same re-issue. Per ADR-U028/U050 the fix belongs on the PC-4 side — do **not** touch `reactivate_own_account`, whose gate is correct. Schema gate applies. → COR-C **W1**.

### AC3-2 · Major — The lifecycle suite proves the origin *gate* but never the *producer*; the fixture hand-writes a row shape no production path creates

**Evidence (disk-verified):** `hub/tests/integration/account/account-lifecycle-self-service.test.ts:61-66` — the "admin-produced hold" fixture is raw SQL `SET … deactivation_origin = 'admin'`. Every STORY-2 "never self-escapable" scenario runs off it. `admin_update_user_status` appears in `hub/tests` exactly once (`:502`), in a `pg_proc` **existence** check. Green means "given a row already carrying `'admin'`, the gate holds" — a premise nothing in production establishes. This is the shape that let AC3-1 sit green.
**Correction direction:** build the hold fixture by *invoking* `admin_update_user_status` as a `manage_all_groups` actor; assert `get_own_account_state()` reads `suspended`; add the ordered pause→hold→reactivate-refused case, the NULL-origin derivation case (AC3-13), and the admin-reactivation-clears-origin case. → COR-C **W1** (demonstrated-red against the unfixed contract, then green).

### AC3-3 · Major — GDPR export is silently incomplete again: notification preferences never entered the composite

**Rule violated:** Privacy vertical V2 §6/§7 (`docs/verticals/privacy/SPECIFICATION.md:90,100,130`); Audit I AC-4's correction ("completeness is the platform's contract").
**Evidence (disk-verified):** the live `get_own_data_export()` is `20260723120000:300-398` (N-A, 2026-07-23) — **three days older than the table it should export**. Its Domain merge (`:389-394`) composes exactly four contracts; zero `notification_preferences` references in the body. N-D created both the member-data table (`20260726120000:117`) and its purpose-built export contract `get_own_notification_preferences_export()` (`:486`) — which **no caller composes** (grep: only its own migration, the anon-repair, one isolated test). An Art. 15 export omits the member's preference state.
**Aggravating (disk-verified):** the A-NTF area gate recorded `PD016 / PC008 — match … VERIFIED — F1` (`docs/planning/hub-v2/2026-07-27-notifications-area-gate.md:185`) — a composition match that does not exist. The gate row verified the contract's internal gates, not its composition into the declared consumer.
**Correction direction:** re-issue the composite adding the `notification_preferences` key (additive; the N-D comment at `:481-485` already reasoned correctly about the shape and simply never took the second step). Schema gate applies. → COR-C **W2**, with AC3-4 as the recurrence-stopper.

### AC3-4 · Major — Export completeness has no mechanical gate; the composite test asserts additive presence only

**Evidence (disk-verified):** `hub/tests/integration/account/export-composite.test.ts:88-121` asserts `subject/profile/account_state/journal/journeys` and shape-checks two — no invariant fails when a new member-data table ships without an export path. An additive presence test cannot detect omission by construction; this is the *systemic cause* of AC3-3, and A-ADM adds member-visible operator data next.
**Correction direction:** a manifest-driven completeness invariant — every table classified as member-data must have an export representation or a cited exemption entry; unclassified-fails-red, the same pattern COR-B built for ownership. → COR-C **W2**.

### AC3-5 · Major — ADR-U051's typed-action routing table lives only in Hub TypeScript

**Rule violated:** ADR-U051 rulings 1–2 (data-driven response sets, *"no `switch(action_type)` with a sealed arm list, on either side of the API"*); ADR-U038 clause 1 via `ARCHITECTURE_ANATOMY.md:44`.
**Evidence (disk-verified):** the answerability rule is two Hub-only maps — `DISPATCH_SEGMENTS` (`hub/lib/notifications/client.ts:102-105`; *"a kind absent here is not answerable in the bell"*) and `RESPONSE_SETS` incl. button copy (`hub/lib/notifications/format.ts:96-101`). Platform-side counterpart: zero hits repo-wide. `action_type` is a bare `TEXT` column (`20260228125730:15`) — contrast `notifications.type`, FK'd to the `notification_kinds` registry. Adding a third answerable kind is a two-file Hub deploy, not a data registration; the Gimbal would re-implement both maps. The contrast is instructive: category/kind *copy* is correctly server-authored data — which is why the `asks`-copy defect was fixable as a pure data migration. The typed-action layer is the one A-NTF surface that did not get that treatment.
**Correction direction:** carry the response set + handler identity as data (a `notification_kinds`-sibling registry, or columns on `get_own_notifications`); the TS maps collapse to rendering-only lookups. Additive, backward-compatible. → COR-C **W3**.

### AC3-6 · Major — i18n: zero externalisation, zero recorded deferral, against Accepted canon

**Rule violated:** ADR-U013 (**Status: Accepted**, `:3`): *"All user-facing strings are externalised to translation files from day one"*; restated as a live tier rule at `docs/design-system/CLAUDE.md:36`; anatomy band `ARCHITECTURE_ANATOMY.md:15,91`.
**Evidence (disk-verified):** zero i18n dependencies in `hub/package.json`; no locale/message files; zero `t()`/translation-key call sites; hardcoded English throughout 20 pages / 54 components. **No deferral exists anywhere in `docs/planning/`** — the sweeps found only archived snapshots and bridges that *restate* the rule as binding. Silently missing, not deferred → finding by the Audit I convention. Severity contingent on ruling **R-6**.
**Correction direction:** either record a dated deferral naming the activation point (converts this to a cited Observation), or introduce the key-based layer before the retrofit surface (3–5× per ADR-U013:20) grows further. → COR-C **W6**, gated on R-6.

### AC3-7 · Major — No design-token layer exists; the "same world" promise has no substrate and the accent has already forked

**Rule violated:** `docs/design-system/CLAUDE.md:38` ("Tokens over hardcoded values"); anatomy band world-aesthetic obligation.
**Evidence (disk-verified):** `hub/app/globals.css` is 23 lines with zero token definitions; no Tailwind config file exists (v4 via PostCSS defaults). Divergence already live in one shell: primary button `bg-blue-600` (`hub/components/ui/Button.tsx:8`) vs bell badge `bg-indigo-600` (`hub/components/notifications/NotificationBell.tsx:236`); `ConfirmModal` variants are literal utilities. No raw hex anywhere — the discipline is good; **there are no tokens to be disciplined about**. Rebranding today is a 54-component find-and-replace.
**Correction direction:** a Tailwind v4 `@theme` block (semantic colour/spacing/motion tokens), migrate `components/ui/` first. Gets more expensive every cycle. → COR-C **W6** (severity contingent on R-6; the correction-plan recommendation is to do it regardless).

### AC3-8 · Major — `aria-modal="true"` with no focus management, on the mandated confirmation primitive guarding every destructive path

**Rule violated:** ADR-U013:16 (WCAG 2.1 AA baseline); `docs/design-system/CLAUDE.md:37` (focus management before ship).
**Evidence (disk-verified):** `hub/components/ui/ConfirmModal.tsx:60` declares `aria-modal="true"`; the file contains **zero** `useRef`/`.focus(`/`autoFocus` — no initial focus, no trap, no restore. Same shape in `ReportDialog.tsx:80-82`. `docs/products/hub/CLAUDE.md:21` mandates `ConfirmModal` for every confirmation — including account deletion. Declaring `aria-modal` without a trap is worse than omitting it (AT is told the page behind is inert; Tab walks straight into it).
**Correction direction:** initial focus (cancel for `danger`), two-button Tab cycle, focus restore; fix in `ConfirmModal`, mirror in `ReportDialog` (or extract `useFocusTrap`). **Recommended independent of R-6** — it is a live a11y defect in shipped code, cheap to fix. → COR-C **W5**.

### Minor findings

| ID | Dim | Finding | Evidence anchor | Correction → |
|---|---|---|---|---|
| **AC3-9** | D1 | `respond_to_acting_invitation` has no `expires_at` guard; its sibling (`respond_to_stewardship_nomination`, `20260728190000:230-232`) does. Latent, not live — no writer sets expiry on acting invitations today; the day one does, the rule's only home is `format.ts:73-79` (U038 violation by ordering). | `20260724120000` (no expiry token in the responder) | W3 |
| **AC3-10** | D1 | Four delta-touched PC-3 functions unregistered in the manifest (`notify_invitation_received`, `notify_role_assigned`, `nominate_steward`, `respond_to_stewardship_nomination`). Fails *closed* (default CORE is strictest) — label accuracy, not exposure. | `supabase/ownership.manifest.json` | W8 |
| **AC3-11** | D2 | Platform response contracts are boolean-shaped (`p_accept boolean`), capping U051's "admits more with no schema change" at two responses. The code's comments concede it; the ADR overstates. Needs Stefan's pick: widen to a response key, or amend U051 to name the Ferd contract family. | `20260724120000:206` · `20260728190000:185` · `format.ts:87` | W4 (ruling rider) |
| **AC3-12** | D2 | The outer-ring gate never scans `hub/lib/realtime/manager.ts` — the module *holding* the browser client (no `'use client'`, not `*client.ts`) — nor `format.ts`. Conformance itself verified clean at HEAD; the emptiness of the exception list is accurate but unenforced for exactly the file where a violation would be written. | `hub/tests/helpers/outer-ring.ts:64-92` | W7 |
| **AC3-13** | D3 | The NULL-origin fail-safe (the row shape an admin suspend produces **today**) has no test. Code conformant (`20260721161500:572-577`). | `account-lifecycle-self-service.test.ts:212-218` | W1 |
| **AC3-14** | D3 | `admin_update_user_status` reads its target without `FOR UPDATE`, unlike all three self-service contracts. Terminality survives regardless (`enforce_decommission_invariant` trigger). | `20260223171200:170-172` | W1 (same re-issue) |
| **AC3-15** | D4 | The manifest's `verticalComposition` citation names two composed contracts; the live composite calls four. The gate matches on function name only, then skips all cross-service checks — the citation is the *only* record of the composite's reach, and it is two contracts stale. | `ownership.manifest.json` exceptions · `ownership.ts:136-150` | W2 |
| **AC3-16** | D4 | Member-authored announcements have no export path and no recorded exemption (the C-E record reasons about their *lifecycle*, never their Art. 15 scope). Downgrades to Observation if a decision doc exists that the sweep missed. | `20260720200000:79` · `20260721100000:509-558` | W2 (add or record exemption) |
| **AC3-17** | D5 | Menu ARIA is inverted between the Hub's two menus: the bell declares `role="menu"` with zero `menuitem` children (and no `aria-expanded` on the trigger); `AccountMenu` declares `aria-haspopup="menu"` and never renders a menu. Neither is keyboard-navigable beyond raw Tab. | `NotificationBell.tsx:245,270-286` · `AccountMenu.tsx:71-73,97-153` | W5 |
| **AC3-18** | D5 | `TextField` lets `id` be omitted, silently orphaning its required `label`; no `aria-invalid`/`aria-describedby` wiring to `InlineError`. Login/signup/profile/group-create all flow through it. | `hub/components/ui/TextField.tsx:9-16` | W5 |
| **AC3-19** | D5 | `docs/products/hub/CLAUDE.md:20`'s "feature components live alongside their routes under `app/`" has a **0% adherence rate** (all 45 feature components live under `components/{feature}/`, zero under `app/`). The code's convention is coherent — the doc is stale and misleads every agent loading the Hub cascade. Fix the doc, not the code. | `git ls-files hub/app` | W8 |

---

## Rulings needed (canon decisions, not code defects)

### R-4 — Who owns `notification_kinds` / `notification_categories`: the Notifications vertical or DS-5? *(from D1-1)*

The manifest classifies both `vertical:notifications` (rationale: the `notifications.type` FK stays inside the vertical's substrate). But ADR-U048 clause 2 assigns **routing metadata** to DS-5, and these tables carry precisely the routing inputs (`interruption_grade`, `member_suppressible`) that `ds5_may_deliver` reads. Consequence of the vertical label: both tables sit outside `DS_TABLES`, so a future PC function could read them directly and **no gate fires** — the storage argument is settling an ownership question the ADR settles the other way. Verified: relabelling to DS-5 is green immediately (every referencer is DS-5-owned; non-DS-5 referencers: none). The sibling `notification_channels` is already DS-5, with a self-flagged note pointing at this exact tension.
**Recommendation:** relabel both DS-5 (restores gate coverage, matches U048 clause 2); pin the exact `vertical:`-owned table set in a test (GC-3) so widening the exemption requires editing a test that states why. Alternative: amend ADR-U048 to claim the registries for the vertical explicitly.

### R-5 — May the routing layer enforce itself as a trigger *inside* the substrate's write path? *(from D2-3)*

Preference suppression is a DS-5-owned `BEFORE INSERT` trigger on `public.notifications` (`20260726120000:231-251`) — every Core/DS-3 obligation write now executes DS-5 code in its own transaction, and DS-5 can veto the write. Judged **substantively right** (it is the only way to apply preference generically, and V3 §6 demands central non-bypassable suppression — D4 independently verified the same mechanism as *conformant* against the vertical spec). But ADR-U048 described DS-5's layer as sitting *above* the substrate; a write-path veto is a third shape the ADR did not anticipate, and trigger edges are invisible to the inner-ring gate (GC-8).
**Recommendation:** a short rider on ADR-U048 legitimising substrate-mounted routing enforcement (coupling is to the vertical's table, not a domain contract), plus a decision on whether the inner-ring gate grows trigger-edge awareness.

### R-6 — Is the design-system tier's rule set binding on shipped Hub code, or dormant until Eid? *(from D5-7)*

Three current sources state the i18n/a11y/token obligations as binding (anatomy band; ADR-U013 **Accepted**; `docs/design-system/CLAUDE.md:36-38`, whose `:3` extends the tier's scope to "the corresponding code"). Against that, `docs/design-system/CLAUDE.md:15` declares the tier "scoped but not active … expected Eid-wave onward". But the Hub already ships components self-described in-code as "Design-system primitive" (`Button.tsx:3`, `TextField.tsx:3`) — the activation condition line 15 names. AC3-6/7/8 change severity depending on the answer.
**Recommendation (D5's, endorsed):** rule the tier **active with a scoped activation** — `components/ui/` is the design system's Ferd-era seed; fix AC3-8 now (live a11y defect, independent of the ruling); land the token layer (AC3-7) next, it compounds fastest; record a dated i18n deferral naming the Eid activation point (converts AC3-6 into a cited Observation without paying the retrofit now); correct `docs/design-system/CLAUDE.md:15`.

---

## Observations (no action, or cited deferrals — recorded so absence is never misread)

| ID | What | Anchor |
|---|---|---|
| AC3-O1 (D1-4) | `notify_invitation_received` shipped without a REVOKE, repaired three days later (`20260727120000`). Trigger functions aren't directly callable, so exposure was nil; recorded as a batch-discipline process signal. | `20260724120000` → `20260727120000` |
| AC3-O2 (D1-5) | `ds5_config` is RLS-enabled with zero policies — deliberate deny-all, documented in place; stricter than any policy. Not a "missing policy" for future mechanical checks. | `20260725120000:91,17-18` |
| AC3-O3 (D1-6) | Five one-off data migrations write across owner boundaries — compliant (corrective DML in migration scope) but structurally ungated (GC-2). `20260728190000`'s self-verifying `RAISE EXCEPTION` assertions are the pattern worth generalising. | see GC-2 |
| AC3-O4 (D2-5) | DS-5 charter items with no substrate: activity feeds (the "no rankings" guardrail is **unexercised**, not violated) and journey-scoped social surfaces. Beyond Ferd's realized scope. | `ARCHITECTURE_ANATOMY.md:58` |
| AC3-O5 (D3-4) | The manifest cannot express the PC-2/PC-4 split at function granularity — every core function resolves to the CORE default, so the anatomy's admin-holds-are-PC-4 line is carried by naming and prose alone (GC-13). Scope question for the board. | `ownership.manifest.json` |
| AC3-O6 (D4-5) | **Audit I's AC-6 resolved:** re-homed, not closed. `recordAuditEntry` still console+telemetry only, but the TODO now names A-OPS, and the deferral is cited in four planning docs. **Flag for A-ADM scoping:** the seam has four callers, three GDPR-relevant (signup, transcend, farewell) — the un-audited window is wider than "console-only sign-in" suggests. | `hub/lib/audit/audit.ts:6-11,27-34` |
| AC3-O7 (D4-6) | TASK-OBS-01 deferral properly recorded; the **emit** side of V4 is met for everything shipped since 2026-07-22 (ten+ A-NTF routes emit telemetry) — only the sink is deferred, with citation. | `TASK-OBS-01:6,11-12` |
| AC3-O8 (D4-7) | ADM-8 confirmed at contract level: **no** platform-side contract enumerates DeusEx-stewarded groups (sweep of every `get_*group*`/`list_*group*` across 87 migrations). Cited in the re-walk findings and TASK-INT-05; strengthens the bridge's ADM-8-early sequencing argument. | re-walk RW-05 |
| AC3-O9 (D4-8) | Transactions absence still true and still cited per item (ADR-U011; five spec items marked Unrealized; zero payment/ledger/Stripe artifacts at HEAD). Re-verify at the next wave boundary. | `docs/verticals/transactions/SPECIFICATION.md` §3 |

---

## What is conformant (keep doing this — evidence in the dimension working papers)

- **All five mechanical gates green at HEAD** against the live catalog, post-A-NTF (D0).
- **The A-NTF delta is the cleanest surface yet measured** (D1): thin controllers verified by reading, not just grep; lib RPC-wrappers receive clients by injection (`import type` only — browser leakage structurally impossible, not tree-shaking luck); ACL preserved across byte-identical `CREATE OR REPLACE` signatures; the sole core→domain reach is exactly the `ds3_lifecycle_*` contract ADR-U047 prescribes; the apparent GET/PUT identity drift in `nudge-policy` is **both arms gated and both compliant** (ADR-U037) — recorded to spare the next auditor the false positive.
- **ADR-U049 announcements realized rule-for-rule** (D2-7): durable DS-5 home, two send contracts at distinct gates (U028 by construction), read-time visibility vs send-time delivery, governance-sees-retracted, contract-only write door.
- **ADR-U048 routing is structurally enforced, not conventional** (D4): the `notifications.type` FK makes an unregistered kind impossible at the database; suppression is dispatcher-side law via the substrate trigger — no tier can bypass it (the same mechanism R-5 asks canon to name).
- **The DS graph direction rule survives adversarial checking** (D2-8): `crossServiceReads` is `[]` and genuinely so — the one apparent counter-example dissolves into lowercase-declared DS-3/DS-7 functions erasing *their own* tables through their own U047 hooks.
- **ADR-U050's self-service half + derivation + fail-safe + surfaces are conformant** (D3): state derived platform-side, never duplicated in TS; `decommissioned` terminal against every contract *plus* a belt-and-braces trigger; no client write path to the lifecycle columns; IDN-12 self-reactivation is implemented at HEAD (`6-done` ×3 specs), superseding the earlier deferral memory.
- **Mist lifecycle (ADR-U031) spot-verified post-A-NTF** (D3): transcendence flips `is_temporary` and records consent in one transaction ("no persistence without consent" is structural); Mist/FIM erasure paths mutually exclusive; the metamorphosis gate is a *named* seam, not a silent gap.
- **A-COM's GDPR posture is exemplary** (D4): the export resolves its actor deliberately UNGATED (a suspended member still exports — the right survives account state); the own-data wall is explicit; the erasure cascade is complete via FK posture + the one U047 reassignment hook.
- **Hub component adoption is real** (D5): 19/20 pages on shared primitives; `ConfirmModal` discipline holds (zero `alert()`/`confirm()`); realtime channel topics exactly match the §4 list, all `private: true`; A-NTF pages follow every Hub-CLAUDE surface pattern including the canonical `refreshNavigation` event; live-region primitives correct where they exist; motion honours `prefers-reduced-motion`.

---

## Gate-coverage gaps (consolidated — rules true today, held by convention; feed COR-C W7)

| ID | Gap | Mechanism | Source |
|---|---|---|---|
| GC-1 | Function classification has no completeness gate (tables do); a new DS function ships unregistered, failing *closed* to CORE — label accuracy, and exactly how AC3-10 happened | `ownership-manifest-conformance.test.ts:96` has no `pg_proc` reciprocal | D1 |
| GC-2 | **Data migrations are outside every gate** — top-level DML is reached by neither the direction rule (function bodies) nor the catalog walk. The widest structural blind spot the delta exposed | `ownership.ts:127` | D1 |
| GC-3 | The `vertical:*` exemption is unbounded — any `vertical:`-labelled table silently leaves the inner-ring gate; only `notifications` has a test pinning intent. The mechanism behind R-4 | `ownership.ts:74` · `OWNER_PATTERN` | D1 |
| GC-4 | `expires_at` enforcement is per-contract convention (AC3-9's pair passes every suite) | — | D1 |
| GC-5 | Export completeness unpinned (cause of AC3-3); the manifest already enumerates all 37 tables, so the invariant is cheap | `export-composite.test.ts:88-121` | D4 |
| GC-6 | `verticalComposition` grants an *unbounded* cross-service exemption recorded only by a prose citation that is already stale (AC3-15) | `ownership.ts:136-150` | D4 |
| GC-7 | The outer-ring gate's scan set is a heuristic with an unstated hole (`manager.ts`, `format.ts` — AC3-12); coverage itself is never asserted | `outer-ring.ts:64-92` | D2 |
| GC-8 | The inner-ring gate is blind to **trigger edges** — the Core→DS-5 runtime dependency of R-5 is invisible; so would be any future domain trigger on a core table | `ownership.ts:130-177` | D2 |
| GC-9 | Nothing asserts a kind's answerability is *reachable* — `DISPATCH_SEGMENTS` can silently omit an actionable kind; passive-render and forgotten-kind are indistinguishable to every suite | AC3-5's surface | D2 |
| GC-10 | No test drives an admin lifecycle RPC through to a state read (the gap that hid AC3-1) — closed by W1's producer-driven suite | AC3-2 | D3 |
| GC-11 | Manifest "Gate-review flags" are prose in JSON notes; nothing surfaces them at a gate boundary | `ownership.manifest.json:51,59` | D2 |
| GC-12 | No a11y gate (`jest-axe`/axe-Playwright absent; the failing patterns aren't in `eslint-config-next`'s jsx-a11y subset), no i18n lint, no token gate | `hub/package.json` devDeps | D5 |
| GC-13 | No conformance rule pins the PC-2/PC-4 function split (AC3-O5) | `ownership.manifest.json` | D3 |
| GC-14 | The area-gate per-RPC row verifies internal gates but not *composition into declared consumers* — how AC3-3 got a "VERIFIED" stamp. Wording fix before A-ADM | `2026-07-27-notifications-area-gate.md:185` | D4 |

---

## Correction plan

→ [`../hub-v2/anatomy-correction-plan-cor-c.md`](../hub-v2/anatomy-correction-plan-cor-c.md) — **Cycle COR-C**, eight workstreams, held for review. Recommended posture mirrors COR-A: **W1 (the Critical) runs before A-ADM opens** — the admin console builds on exactly the contracts W1 repairs.

---

*Produced by the 2026-07-30 audit: six dimensions (one orchestrated, five parallel agents bound to named canonical sources), all Critical/Major evidence disk-verified at the cited lines by the orchestrating session. Dimension working papers (full per-dimension registers incl. verified-conformant evidence): session scratchpad `AC3-D1..D5-*.md`, folded into this register.*
