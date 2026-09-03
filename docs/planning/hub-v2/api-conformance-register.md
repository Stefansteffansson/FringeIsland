# Hub v2 — API-boundary conformance register

**Date:** 2026-07-02 · **Status:** Resolved — ADR-U038 ratified (Option A); tranche 1 (S1-S3, PR #48) + tranche 2 (F1/F2, PR #49) merged; tranche 3 (docs/process gate patches) applied. · **Session:** API-boundary compliance audit
**Scope:** the v2 Hub only (`hub/` — app, API routes, lib, frontend), per the session's scope decision. The legacy Hub (`hub-legacy/`) is excluded: its violations are measured and adjudicated in ADR-U030 and it is a frozen oracle awaiting Phase-4 deletion.
**Method:** canon-baseline first (§1), then every route in `hub/app/api/**` read in full, the `hub/lib/*` layer classified (thin-wrapper vs Hub-only logic), a frontend sweep for direct DB access, and substrate checks (RLS policies, triggers, RPC grants) where a verdict depended on DB-level enforcement.
**Feeds:** the parked API-location question (bridge `2026-07-01_03`) — §4 is the evidence pack for that adjudication.

---

## 1. The baseline — what canon actually requires

| # | Rule | Source |
|---|------|--------|
| B1 | API-first: `Database → API route → Frontend component`; the frontend never touches a table directly. | ADR-U009; root `CLAUDE.md` |
| B2 | **The Hub exposes no public API.** It is a consumer surface; sibling Surfaces (Gimbal, Studios) consume the same Platform API directly and never call the Hub. Shared product behaviour belongs in Platform Core, not in any one product. | Hub SPECIFICATION §5 ("Public API surface") |
| B3 | **PostgREST RPC is the canonical realized public HTTP API surface.** Custom Next.js routes (`app/api/*`) apply selectively ONLY where business logic exceeds RLS-expressibility: **(i)** cross-table mutations needing a single transaction with non-RLS-derivable authorization; **(ii)** external API calls requiring service-role privileges; **(iii)** multi-step transactions composing more than one primitive. Default answer otherwise: "expose via PostgREST RPC." | PC-3 organisation-specification §3 + §7 (three-justification rule); mirrored at §8 Q7 |
| B4 | API versioning is mandatory from day one: every API route lives under `/api/v1/...`. | ADR-U015; platform `CLAUDE.md` |
| B5 | API routes authenticate via `Authorization: Bearer <jwt>`, not cookies — the route must not know its caller's cookie format. | platform `CLAUDE.md` (gotchas) |
| B6 | Observability: every API route emits structured logs with request ID, actor, outcome; no swallowed failures. | platform `CLAUDE.md` (verticals) |
| B7 | Privacy: every endpoint returning FIM data filters **at the platform level** — never return over-broad results and expect the product to filter. | platform `CLAUDE.md` (verticals) |
| B8 | Internal API (Domain→Core contract boundary): signature changes need ADR + version bump even for in-tree consumers. | platform/core `CLAUDE.md` |
| B9 | Auth is the narrow exception: each product wires a client-side auth context on Supabase Auth (`supabase.auth.*` only, no table access). | root `CLAUDE.md`; Hub `CLAUDE.md` |

**Known internal tension in the baseline (the crux of §4):** Hub `CLAUDE.md` line 23 instructs *"Business logic lives in `app/api/...` route handlers … every business rule, validation, and side effect must live behind the Platform API so iOS and Android inherit them on day one"* — conflating the Hub's own Next.js routes with "the Platform API". Native Gimbal clients can never inherit logic hosted in Hub route handlers (B2 forbids them calling the Hub). B3 says platform logic belongs in the substrate (RPC), with custom routes as narrow escape-hatches. The v2 build followed the Hub-CLAUDE.md reading, not the B3 reading.

**Internal API note:** no Domain Service exists in code yet, so B8 has no violation surface today. It enters the audit only as a forward rule: the Journeys/Communication areas must realise their DS contracts platform-side, not repeat the pattern below.

---

## 2. Route-by-route verdicts

Legend — **PLATFORM-OK**: the contract is enforced in the substrate (SECURITY DEFINER RPC with own guards; the route is a thin proxy). **HUB-LOGIC**: platform semantics enforced only in Hub code. All routes share the cross-cutting deviations V1/V2 (§3).

| Route | Methods | What it does | Substrate contract | Verdict |
|---|---|---|---|---|
| `auth/signup` | POST | Consent gate (server-side), `signUpFim` via auth SDK, audit+telemetry | none — auth SDK only | **HUB-LOGIC** — consent gate exists only here; see S3 |
| `auth/transcend` | POST | Consent gate + `finalise_transcendence` RPC + audit/telemetry/welcome-trigger seams | RPC enforces atomically ("no persistence without consent") | **PLATFORM-OK** (thin proxy; route gate = defense-in-depth) |
| `auth/farewell` | POST | `explicit_erase_mist` RPC + seams | RPC authorizes (auth.uid() + is_temporary), `_erase_mist` REVOKEd from PUBLIC | **PLATFORM-OK** (thin proxy) |
| `auth/audit` | POST | Records sign-in audit entry | none (console-structured log; no durable sink — known FEAT-H002 No-go) | Product-local seam — acceptable, sink debt noted |
| `account/state` | GET | Own lifecycle state | `get_own_account_state()` SECURITY DEFINER | **PLATFORM-OK** (thin proxy) |
| `account/consent` | GET, POST | Own consent projections; grant/withdraw | `get_own_consent_state()`, `record_consent_decision()` — REVOKEd from PUBLIC, typed refusals | **PLATFORM-OK** (thin proxies + SQLSTATE→HTTP mapping, which is presentation) |
| `account/export` | GET | Own data export as download | `get_own_data_export()` (assembles + records export-event) | **PLATFORM-OK** (thin proxy + Content-Disposition) |
| `groups` | GET | Member's group list | none — composition lives in `hub/lib/groups/queries.ts` | **HUB-LOGIC** — see F2 |
| `profile/me` | GET, PATCH | Own profile read/update | none — direct `.from('users')` under own-row RLS; gating in `hub/lib/profile/queries.ts` | **HUB-LOGIC** — see F1, S1, S2 |

**Frontend sweep: clean.** No component or page touches a table or RPC directly. The only direct Supabase contacts are `lib/auth/AuthContext.tsx` (`supabase.auth.*` only — the B9 exception) and the `lib/*/client.ts` wrappers, which all `fetch('/api/...')`. v1's ~165-site sin is **not** repeated in v2. ADR-U037's `getVerifiedUserId` performs real local ES256 signature verification via `getClaims` (reads only; mutations keep `getUser()`) — sound.

---

## 3. Findings

### Architecture (route/logic placement)

- **F1 — The FEAT-PC003 profile contract is implemented in Hub code, not in the platform.** Identity-scope column gating ("which columns may be written") and field validation live in `hub/lib/profile/queries.ts` over a direct `.from('users')` write. This is a **PC-2 Identity platform contract** (the feature is literally a PC-spec) enforceable only for callers who politely use the Hub route. The Gimbal would have to reimplement it — the exact failure ADR-U009 exists to prevent. Under B3 the fix is a platform-side contract (e.g. `update_own_profile(patch jsonb)` SECURITY DEFINER RPC, or column guards + RLS with the validation in a trigger).
- **F2 — The groups read-model lives in Hub code.** `fetchMemberGroups` composes 4 substrate calls (actor RPC → memberships → groups → counts RPC) and merges in TypeScript. A multi-step read composition is exactly B3's "expose via PostgREST RPC" default (e.g. one `get_member_groups()` RPC/view). As-is, sibling surfaces must clone the pipeline.
- **F3 — All 9 routes are Hub-hosted platform-contract endpoints.** Even the seven PLATFORM-OK thin proxies sit inside `hub/app/api/`, which under B2/B3 is either (a) a legitimate *private BFF* whose contracts all exist platform-side, or (b) a shadow Platform API the Gimbal can't use. This is the parked question — adjudication in §4. Note: for the 7 thin proxies the underlying RPCs *are* already directly consumable via PostgREST, so the routes are redundant indirection per §7's letter, but they add real value (cookie-session handling, telemetry, HTTP mapping, Server-Timing).

### Security / enforcement (substrate-level, found while verifying F1)

- **S1 — Consent-gated transcendence is bypassable by direct PostgREST write. CONFIRMED at policy level.** `users_update_own` (rebuild migration L1459-62) is row-scoped only — `USING/WITH CHECK (auth_user_id = auth.uid())`, no column restriction. No trigger guards `is_temporary` (only `personal_group_id` and the decommission invariant have guards). A Mist (anonymous sessions hold the `authenticated` role) can `UPDATE public.users SET is_temporary = false` on its own row via PostgREST — becoming a persistent FIM with **no consent record, no FringeIsland-Members enrolment**, sidestepping the carefully-guarded `finalise_transcendence()` RPC. Same hole allows self-writes to `email`, `is_active`, `full_name`-adjacent state, etc. *Verify by integration test (attempt the write as a Mist), then fix regardless of the §4 verdict.*
- **S2 — `users_select_active` over-exposes FIM data (B7 violation). CONFIRMED at policy level.** `USING (is_active = true)` TO authenticated, all columns — any authenticated session (including any anonymous Mist) can `select email, full_name, …` for **every active user** via PostgREST. The Hub only ever reads own-row, but B7 requires the platform to enforce that, not the product. Fix: column-limited exposure (view / column privileges) or a tighter policy + own-row/`get_display_name`-style contracts.
- **S3 — Credentialed sign-up consent has no durable record.** The consent gate for FEAT-H002 sign-up lives only in the Hub route; `signUpFim` touches no tables and the "audit entry" is a structured console log (`admin_audit_log` is admin-only; known FEAT-H002 No-go). Consequences: (a) a direct GoTrue `auth.signUp` call (the anon key is public) creates an account with no consent enforcement at all; (b) even Hub-created FIMs have no consent row in the now-shipped ledger (IDN-6/7) — their catalogued purposes read "undecided". What was a deferred No-go in FEAT-H002 became load-bearing once the consent ledger shipped. Fix: enforce/record at the substrate (e.g. consent payload via auth metadata validated in `handle_new_user`, or a signup-consent RPC invoked transactionally).

### Cross-cutting deviations (known, deliberately deferred — the "directional" set)

- **V1 — No `/api/v1/` versioning (B4/ADR-U015).** All 9 routes are unversioned. Known: route comments call the spec's `/api/v1/` "directional… not yet realised", ref TASK-PC003-01 and FEAT-PC006/PC008 open questions.
- **V2 — Cookie-session auth instead of `Authorization: Bearer` (B5).** All routes read the `@supabase/ssr` cookie session — "the shipped Hub house style" per the same comments. Both V1 and V2 resolve *by definition* under §4: if the routes are a Hub-private BFF, B4/B5 apply to the **platform** surface (RPC names/signatures already versioned per PC-3 deprecation rules), not to Hub-internal plumbing; if the routes are the Platform API, both are real violations to fix.

### Doc drift

- **D1 — Hub `CLAUDE.md` line 23** mis-encodes ADR-U009 ("business logic lives in `app/api/...` route handlers… so iOS and Android inherit") — contradicts B2/B3 and its own line 13. Root cause of the pattern; see the retro.
- **D2 — PC-3 §7 route inventory is stale**: cites the *legacy* Hub's 4 routes ("admin/users, invitations/send-email, v1/journeys/…") as "the current app/api surface"; the v2 routes postdate the spec.
- **D3 — Hub SPECIFICATION public-API rule is §5**, not §4 as bridge `2026-07-01_03` cites (cosmetic).

### Observability note (B6)

Routes emit success+failure telemetry with actor — good — but `emitTelemetry` sinks to structured console only, and there is no request-ID correlation yet. Acceptable as the documented V4 seam; noted for the perf/hardening backlog, not a finding of this audit.

---

## 4. ADR evidence pack — where do platform-contract endpoints live?

**Question (parked 2026-07-01, now evidenced):** should platform contracts be consumed through Hub-hosted Next.js routes, and where must their logic live?

**Evidence summary:** 7 of 9 routes are already thin proxies over platform-owned SECURITY DEFINER RPCs — for these, extraction is a non-event; the platform contract already exists and is directly consumable. 2 routes (F1, F2) carry platform logic Hub-side and are real divergence. The substrate findings (S1-S3) demonstrate empirically that **the BFF layer cannot be the enforcement layer**: everything the Hub gates in TypeScript is reachable un-gated via PostgREST today.

**Options:**

- **Option A — Hub routes are a private BFF; every platform contract must exist platform-side (recommended).**
  Rule: a Surface MAY host routes for its own plumbing (cookie handling, presentation mapping, telemetry, response shaping), but a route may never be the *only* home of a platform rule — enforcement lives in the substrate (RPC/RLS/trigger/grant), per B3's three-justification test. The Gimbal consumes PostgREST directly.
  Cost: move F1/F2 logic into RPCs (2 contracts); S1-S3 fixes (needed under every option). Resolves V1/V2 cleanly: B4 versioning binds the platform surface (RPC signatures, already versioned by PC-3 deprecation rules); B5 Bearer-auth binds platform-facing routes, not the Hub's own cookie plumbing. Minimal delta from shipped code; matches ADR-U036's "travels with them if they extract" framing.
- **Option B — Pure PostgREST: the browser consumes RPCs directly; delete most Hub routes.**
  Purest reading of §7 (the thin proxies are redundant indirection). Cost: lose server-side seams (Server-Timing, server-side telemetry, HTTP-status mapping, server-side consent defense-in-depth), rework `lib/*/client.ts` and the E2E surface, and the ADR-U036 Edge/runtime work becomes moot. High churn, little enforcement gain — S1-S3 are fixed in the substrate either way.
- **Option C — Extract a standalone Platform API host now.**
  Premature: one surface exists, no Domain Service is realised, and PostgREST already is the platform HTTP surface per PC-3 §3. Revisit when the Gimbal or DS-* realisation creates a second consumer with needs PostgREST can't express.

**Recommendation: Option A**, recorded as a new ADR that (1) names the Surface-BFF pattern and its limits, (2) reaffirms PostgREST-RPC-canonical per PC-3 §3/§7, (3) scopes ADR-U015/B5 to the platform surface, (4) supersedes Hub `CLAUDE.md` line 23's wording, (5) carries ADR-U036 forward unchanged.

---

## 5. Correction plan (draft — final after the §4 verdict)

**Tranche 1 — substrate enforcement (independent of the verdict; schema gate applies, so each pauses for review):**
1. **S1:** guard trigger (or column-level privileges) on `public.users` restricting client-path UPDATE to the identity-scope column set; red-first integration test proving the Mist bypass, then the guard. Covers `is_temporary`, `is_active`, `is_decommissioned`, `email`, `auth_user_id`.
2. **S2:** replace all-columns `users_select_active` exposure with a column-safe read path; test that a Mist cannot read another member's `email`.
3. **S3:** durable, enforced sign-up consent (design choice: `handle_new_user` validation of consent metadata vs signup RPC; amend FEAT-H002/PC00x accordingly).

**Tranche 2 — contract relocation (Option A shape):**
4. **F1:** `update_own_profile()` platform contract (column gating + validation in substrate); `profile/me` becomes a thin proxy; `validateProfilePatch` stays only as client-side UX pre-validation.
5. **F2:** `get_member_groups()` RPC/view; `groups` route becomes a thin proxy.

**Tranche 3 — canon + docs:**
6. The new ADR (§4), Hub `CLAUDE.md` line 23 rewrite, PC-3 §7 inventory refresh (D2), V1/V2 disposition recorded in the ADR, bridge-cite fix (D3).
7. Feature specs: amend FEAT-PC003 (contract now platform-side), GRP-4 note, FEAT-H002 consent No-go closure.

**Verify-by-test list (assumptions to confirm before Tranche 1 lands):** default PostgREST grants on `public.users` for `authenticated` (assumed Supabase default ALL); `finalise_transcendence`/`explicit_erase_mist` EXECUTE grants to `authenticated` (migration comments say yes); `enforce_decommission_invariant` trigger's exact column coverage.

---

## 6. Verdict at a glance

v2 is **dramatically healthier than v1** — the frontend is API-first clean, most contracts are real SECURITY DEFINER RPCs with REVOKE discipline, and failures surface. The residual non-compliance is concentrated and fixable: two contracts implemented Hub-side (F1, F2), the BFF-vs-Platform-API ambiguity (F3 → §4 ADR), and three substrate enforcement gaps (S1-S3) that the audit surfaced by taking B2/B3 seriously. None of it requires another rebuild; all of it fits in one correction cycle before Groups starts.

## 7. Post-audit closures

- **2026-07-07 (Journeys Cycle J-A) — the LOW finding closed.** `hub/lib/groups/leadership.ts` `fetchPendingNominations()` no longer derives pending-ness in client TypeScript with client-clock date math: **FEAT-PC016** landed `get_my_pending_nominations()` (the `get_my_invitations()` mirror — FIM-only, own-recipient, **server-clock** expiry; migration `20260707130821`, schema-gate nodded) and the lib thinned to a pure relay. `GET /api/me/nominations` and the `PendingNomination` payload are externally unchanged; the derivation now has exactly one home, inherited by any sibling surface.
- **2026-09-03 (TASK-H017-01) — the LOW finding's contract retired with its whole chain.** `get_my_pending_nominations()` (FEAT-PC016), `GET /api/me/nominations`, and `fetchPendingNominations()` are gone — superseded, not re-homed: since A-NTF N-B (FEAT-H031) the nominee answers in the bell through `get_own_notifications()`, and N-C (FEAT-H032) removed the last caller. Migration `20260903090000` drops the function (schema gate). The finding stays closed — the derivation it complained about no longer exists anywhere, client or substrate.
- **2026-07-19 (anatomy-conformance audit, Cycle COR-A W10) — tranche 1+2 closures verified in the substrate and annotated per finding.** The header's PR #48/#49 assertions confirmed with migration evidence (independently attested route-side and substrate-side):
  - **S1 CLOSED** — `20260702120000_api_boundary_users_column_privileges.sql:33-38`: REVOKE UPDATE on `public.users` from `authenticated`/`anon`; GRANT UPDATE limited to the FEAT-PC003 identity-scope set (`full_name, nickname, display_preference, show_real_name, bio, avatar_url`).
  - **S2 CLOSED** — same migration `:40-48` + column comment `:50-53`: REVOKE SELECT; GRANT SELECT of every column except `email`.
  - **S3 CLOSED** — `20260702120100_api_boundary_signup_consent.sql:54-59` (fail-closed RAISE rolls back the `auth.users` insert for non-anonymous sign-up without consent) + `:138-146` (durable consent row: purpose `transcendence`, policy_version from the catalog, `capture_context.flow = 'credentialed-signup'`). The Hub route gate stands as defense-in-depth only.
  - **F1 CLOSED** — `update_own_profile()` in `20260702130000_feat_pc003_own_profile_contract.sql` (SECURITY INVOKER by design, so the S1 column grants bind); `profile/me` is a thin proxy via `hub/lib/profile/queries.ts:164,185`.
  - **F2 CLOSED** — `get_member_groups()` in `20260702130100_grp4_member_groups_contract.sql`; `groups` GET is a thin proxy via `hub/lib/groups/queries.ts:22`.
  - **Tranche 3 (D1/D2) CONFIRMED** — Hub `CLAUDE.md:23` carries the ADR-U038 clause-4 wording; PC-3 §7 is pointer-not-snapshot.
  - Successor audit over the grown surface (52 route files): [`../reference/ANATOMY-CONFORMANCE-AUDIT.md`](../reference/ANATOMY-CONFORMANCE-AUDIT.md) — outer ring clean; correction work tracked in [`anatomy-correction-plan.md`](anatomy-correction-plan.md).
