# FEAT-PC006: Member consent read — the FIM's own effective consent state + full history (over the granular-consent substrate)

---
id: FEAT-PC006
title: Member consent read — a self-service contract returning the caller's own effective consent decisions + append-only history, over the granular-consent substrate (decision column + purpose catalog)
owner: platform/core/governance
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

A FIM's consent is recorded in `public.consent_records` — an append-only, GDPR-auditable ledger (one row per consent event: subject, open `purpose`, `policy_version`, `capture_context`, `captured_at`) created by FEAT-PC002 under [ADR-U034](../../../architecture/decisions/ADR-U034-consent-record-substrate.md). Today that ledger has exactly one producer (transcendence finalisation, `purpose = 'transcendence'`) and **no member-facing contract**. A member cannot see what they have consented to, when, or under which policy version. The platform-tier rule is explicit — *"Consent state is authoritative in Platform Core; other tiers ask, they don't infer"* — but there is no contract for them to ask.

IDN-6 ("render member-visible consent state and consent history") requires a read contract that returns the caller's **own** consent state in two projections:

1. **Effective state** — the *current* decision per purpose (the latest row per purpose), joined with the purpose catalog so each entry carries a human label, whether it is withdrawable, and whether the recorded decision is stale against the current policy version (re-consent drift).
2. **History** — the full append-only event list, which is the GDPR proof-of-consent surface.

Two gaps in the substrate block an honest *granular* read and must be closed here, because the read needs them:

- **No decision dimension.** Every row is a positive capture; there is no `granted`/`withdrawn` distinction. ADR-U034 §2 deferred this ("a withdrawal is a NEW appended row, a later Privacy feature") — this is that feature's read half. The effective-state projection cannot be honest without a `decision`.
- **No purpose catalog.** `purpose` is an open text identifier with no label, description, withdrawability, or current policy version. A member-facing granular surface needs that metadata, and it must be **data, not a sealed enum** (ADR-U034 extensibility driver).

This feature is the platform half of IDN-6: the granular-consent substrate (a `decision` column + a `consent_purposes` catalog) plus the own-row read contract over it, consumed API-first by the Hub ([FEAT-H008](../../../products/hub/features/FEAT-H008-render-consent-state.md)) and any future surface. Its paired write contract is [FEAT-PC007](./FEAT-PC007-consent-decision-write.md) (IDN-7).

### Why Platform Core (Governance), not a Domain Service

Consent state is authoritative in Platform Core by tier rule, and §L3 (`hub/SPECIFICATION.md:366`) places "GDPR consent state" under **PC-4 Governance** for IDN-6/7/8. The read bypasses the `consent_records` RLS via a `SECURITY DEFINER` projection over a Core-owned table, and the purpose catalog is a *governance* concept (which purposes exist, which are withdrawable, the current policy version is a compliance fact). A Domain Service cannot reach `public.consent_records` without breaking the one-way Domain→Core dependency rule. This cannot be modelled in Domain or via Extensions: it is a read of, and an additive extension to, Core's own consent substrate. (Schema-predates-partition, PW-1: the `consent_records` *table* was authored under PC-2/IDN-2; the member-facing consent *contract* and its catalog are PC-4 Governance. The `decision` column is therefore an additive extension to a PC-2-owned table made from a PC-4 feature — flagged, and routed through the normal schema-review gate.)

## Solution sketch

Three additive pieces — two substrate, one contract:

- **`decision` column on `public.consent_records`** — `decision text NOT NULL DEFAULT 'granted'`. Open text, **never a sealed enum** (future decisions like `restricted` are data). Existing transcendence rows backfill to `'granted'` via the default. No other column changes; the table stays append-only and the `enforce_consent_append_only` trigger is untouched.
- **`public.consent_purposes` catalog (new table)** — `key text PRIMARY KEY` (open identifier, joins to `consent_records.purpose`), `label text`, `description text`, `withdrawable boolean NOT NULL`, `current_policy_version text NOT NULL`, `sort_order int`. New table → **RLS without exception**: `SELECT TO authenticated` (every member may read the catalog to render their options); no client `INSERT/UPDATE/DELETE` (governance-managed via seed / `service_role`). Seeded with `transcendence` (`withdrawable = false`, foundational) and `product_analytics` (`withdrawable = true`, optional). New purposes are rows, not migrations.
- **`get_own_consent_state()`** — a `SECURITY DEFINER` SQL function, `SET search_path = ''`, resolving the caller through the repo actor primitive to their personal group (`subject_group_id = public.get_current_personal_group_id()`, matching the `consent_records_select_own` RLS key). Returns `jsonb`:
  - `effective`: one entry per catalog purpose — `{ purpose, label, decision | null, policy_version | null, decided_at | null, withdrawable, current_policy_version, needs_reconsent }`, where `decision` is the latest row's decision for that purpose (`DISTINCT ON (purpose) … ORDER BY purpose, captured_at DESC`), `null`/undecided when the member has no row for a catalogued purpose, and `needs_reconsent = (decision is 'granted' AND policy_version <> current_policy_version)` — the re-consent drift signal (decision #6: surfaced, not acted on here).
  - `history`: every row for the subject, newest first — `{ purpose, decision, policy_version, captured_at, capture_context }` — the GDPR proof surface.

  It reads only the caller's own rows; there is no target parameter.
- **`GET /api/account/consent`** — additive route, `@supabase/ssr` cookie-session auth (the realized Hub house style, per FEAT-PC003/PC004; the `/api/v1/` + `Authorization: Bearer` form of ADR-U015 stays directional and unrealised across the new Hub — see Open spec questions). Sessionless → 401.

## Appetite

Small-to-medium. One additive column (with default backfill), one small seeded catalog table + RLS, one `SECURITY DEFINER` read function, one additive GET route, and integration tests for the effective/history projections + the own-row boundary + drift. The ledger already exists; this reads it and adds the two metadata pieces a granular read requires.

## Rabbit holes

- **Don't make `decision` an enum or a CHECK-constrained set.** Open text + the catalog's `withdrawable` flag carry the policy; a sealed type fails the extensibility rule and ADR-U034's open-purpose intent.
- **Don't build a re-consent flow.** Surface `needs_reconsent` so a stale-against-policy decision is *visible*; prompting/blocking re-consent is out of scope (decision #6, deferred).
- **Don't relax `consent_records` RLS.** The read is a narrow own-row `SECURITY DEFINER` projection keyed to the caller's personal group — not a widening of the table's SELECT policy.
- **Don't return another subject's rows.** No target parameter; the elevation exists solely to project the caller's own consent honestly.
- **Don't write from this feature.** Recording/with­drawing decisions is FEAT-PC007. This contract is read-only; it never appends.
- **Mind the timestamp boundary.** `captured_at` is `timestamptz` (`+00:00`); compare as epoch ms, never raw ISO strings (platform gotcha).

## No-gos

- No mutation of consent (grant/withdraw is FEAT-PC007).
- No re-consent prompt/flow (drift is surfaced only).
- No cross-subject read — strictly own-row; no parameter targets another member.
- No sharing-controls / per-audience visibility (that is IDN-7's other half, split to a later PC-3 slice — see FEAT-H009 + the gaps register).
- No change to `enforce_consent_append_only`, the existing `consent_records_select_own` policy, or any existing route.

## Stories

### STORY-1: Read my own effective consent state
As the platform, I want an authenticated FIM to read their current decision per purpose, so a Surface can render granular consent state API-first without touching `public.consent_records` directly.

**Acceptance criteria:**
- Given an authenticated FIM who consented at transcendence, when they call the contract, then `effective` includes a `transcendence` entry with `decision = 'granted'`, its `policy_version`, `decided_at`, and `withdrawable = false`, resolved to the caller's own rows via the actor primitive.
- Given a catalogued purpose the member has **never** decided (e.g. `product_analytics` with no row), when they call the contract, then its `effective` entry is present with `decision = null` (undecided) so the Surface can offer an opt-in.
- Given the call returns, then it exposes **no** other subject's rows and **no** data beyond the consent projections.

### STORY-2: Read my full consent history
As the platform, I want the member's complete append-only consent history, so the Surface can present the GDPR proof-of-consent record.

**Acceptance criteria:**
- Given a member with multiple consent events across purposes, when they call the contract, then `history` returns every one of their rows (`purpose`, `decision`, `policy_version`, `captured_at`, `capture_context`), newest first.
- Given a member with a grant later changed (a second appended row), when they read history, then **both** rows appear — the ledger is never collapsed; effective reflects the latest, history retains all.

### STORY-3: Effective state reflects the latest decision per purpose
As the platform, I want effective state to be the latest decision per purpose, so a withdrawn-then-regranted purpose reads correctly.

**Acceptance criteria:**
- Given a purpose with rows `granted` (older) then `withdrawn` (newer), when the member reads effective state, then that purpose's `decision = 'withdrawn'` (the latest by `captured_at`).
- Given a purpose with rows `withdrawn` then `granted`, when the member reads effective state, then that purpose's `decision = 'granted'`.

### STORY-4: Policy-version drift is surfaced, not acted on
As the platform, I want a decision recorded under an older policy version to read as needing re-consent, so the Surface can flag it without a re-consent flow existing yet.

**Acceptance criteria:**
- Given a `granted` decision whose `policy_version` differs from the catalog's `current_policy_version` for that purpose, when the member reads effective state, then that entry has `needs_reconsent = true`.
- Given a `granted` decision whose `policy_version` equals the current catalog version, when the member reads effective state, then `needs_reconsent = false`.

### STORY-5: Own-row only — no cross-subject exposure
As the platform, I want the contract to project only the caller's own consent, so it never widens exposure.

**Acceptance criteria:**
- Given any authenticated caller, when they call the contract, then it resolves to **their own** personal-group subject only — there is no parameter to target another subject, and no path returns another subject's consent.
- Given a member's `consent_records` rows, when any *other* surface attempts an ordinary `SELECT` on them, then the unchanged `consent_records_select_own` policy still applies (only this own-row primitive projects across the join).

### STORY-6: Catalog drives the granular surface
As the platform, I want the purpose catalog to be queryable data, so the Surface renders labels/descriptions/withdrawability without a hardcoded client list.

**Acceptance criteria:**
- Given the seeded catalog, when an authenticated member reads effective state, then each entry carries the purpose's `label`, `withdrawable`, and `current_policy_version` from `consent_purposes`.
- Given a new purpose row added to `consent_purposes`, when a member reads effective state, then the new purpose appears (undecided) with no code or schema change.

## Platform dependencies

- **PC-2 Identity consent substrate (existing, extended here).** `public.consent_records` (FEAT-PC002 / ADR-U034) and its `consent_records_select_own` RLS + `enforce_consent_append_only` trigger. This feature **reads** the ledger and **adds** the `decision` column (additive; default backfill; trigger untouched).
- **The repo actor primitive (PC-2 / PC-3).** Subject resolution via the personal-group hop (`public.get_current_personal_group_id()`), the same key as the table's RLS.
- **ADR-U034 amendment (named, build-session carve-out).** The `decision` column + `consent_purposes` catalog extend ADR-U034's locked substrate shape; the amendment (append-only ADR note, not an edit) is written + the migration applied at the build session's **schema-review gate** — it pauses for the explicit nod (schema + ADR carve-outs).
- **No write dependency.** A state read is not an audited lifecycle event; observability here is route-level structured logging, not an `admin_audit_log` write.

## Cross-product impact

Consumed by **Hub [FEAT-H008](../../../products/hub/features/FEAT-H008-render-consent-state.md)** (IDN-6) — the surface that renders consent state + history. The **Gimbal** will consume the **same** `GET /api/account/consent` contract for its own consent UX; only the platform-side semantics are shared. The route is additive (ADR-U015) — no breaking change, no version bump. Paired-spec reciprocation: **the read is owned at the platform tier; the Hub cannot touch `public.consent_records` directly (ADR-U009).** The catalog + `decision` column this feature lands are the shared substrate FEAT-PC007 (write) builds on.

## Stability posture (Platform Core §7)

Additive: one new column (default-backfilled), one new RLS-protected catalog table, one new `SECURITY DEFINER` read function, one new route. No existing Core contract signature changes, so the Internal/Platform API surface only grows. The new `SECURITY DEFINER` function is a privilege-escalation surface, documented as such in its migration comment — its elevation is bounded to projecting the caller's own consent across the catalog join, nothing more. The schema touch sets task status to `review`, not `done`.

## Vertical impact

- **Privacy/GDPR:** this is a Privacy-vertical feature end-to-end. The read is own-subject only, narrowly scoped to the caller's consent projections; it bypasses the ledger RLS **only** for the caller's own rows and never widens exposure. The `history` projection is the GDPR proof-of-consent surface; the substrate stays append-only and retention-safe (FKs `RESTRICT`, trigger intact).
- **Notifications:** None — a consent *read* addresses no other party and triggers nothing (consistent with §L3 IDN-6 = V2, V4; not V3).
- **Administration:** None new — no admin affordance, no admin-only path. The catalog is governance reference data managed by seed/`service_role`, not a member or admin write surface in this feature.
- **Observability:** the route emits structured logs (request id, actor, outcome); auth denials are recorded, not returned as silent empty. The read is not written to `admin_audit_log` (reads are not audited lifecycle events).
- **Transactions:** None — no payment, entitlement, or financial data.
- **Extensibility:** `decision` is open text; `purpose` joins an **open catalog** (new purposes = rows, no schema change, no sealed enum); the `state` projection is consumed as open data the Surfaces render without a closed client-side set. `withdrawable` and `current_policy_version` are per-row governance data, not hardcoded.

## Open spec questions

1. **API convention reconciliation (ADR-U015).** Spec'd as `GET /api/account/consent` + `@supabase/ssr` cookie auth — the realized Hub house style (FEAT-PC003/PC004). The canonical `/api/v1/...` + `Authorization: Bearer` form (platform-tier rule + ADR-U015) is directional and not yet realised across the new Hub; a future reconciliation aligns the shipped routes with the versioned contract. Carried, not resolved here.
2. **Catalog ownership boundary.** The `consent_purposes` catalog is authored as PC-4 Governance reference data over a PC-2-owned table. If the catalog grows policy/versioning machinery (re-consent campaigns, per-version diffs), confirm at that point whether it warrants its own governance sub-spec rather than riding the consent contracts.

## Implementation notes (6-done — Cycle B, 2026-06-29)

Built TDD red-first, platform-first.

- **Migration** `supabase/migrations/20260629211504_feat_pc006_consent_read.sql` (schema-review gate; applied on Stefan's nod). Three additive pieces: the `decision text NOT NULL DEFAULT 'granted'` column on `public.consent_records` (existing transcendence captures backfilled `'granted'`); the `public.consent_purposes` catalog (new table → RLS `consent_purposes_select_all` SELECT-to-authenticated, no client write) seeded `transcendence` (`withdrawable=false`, `v1`) + `product_analytics` (`withdrawable=true`, `v1`); and `get_own_consent_state()` (`SECURITY DEFINER`, `SET search_path=''`, subject pinned via `get_current_personal_group_id()`, no target param). `current_policy_version='v1'` matches the live `TRANSCENDENCE_POLICY_VERSION`, so existing FIMs read `needs_reconsent=false`.
- **ADR-U034 Amendment 1** records the `decision` column + catalog (append-only note; schema-predates-partition PW-1; re-consent flow stays out of scope, drift surfaced only).
- **Read lib** `hub/lib/consent/queries.ts` (`fetchOwnConsentState` + `ConsentState`/`ConsentEffectiveEntry`/`ConsentHistoryEntry` types). **Route** `GET /api/account/consent` (`hub/app/api/account/consent/route.ts`, `@supabase/ssr` cookie auth; sessionless → 401; failure → 500; no 404 — the contract always returns an object).
- **Red→green evidence (all demonstrated red first):** integration `hub/tests/integration/account/consent-read.test.ts` — **12 tests** across STORY-1…6 (effective latest-per-purpose, full append-only history newest-first, granted↔withdrawn, drift true/false, own-row-only + RLS-unchanged, catalog-driven). First run RED (`decision` column + function missing); GREEN after the migration applied. Route unit `hub/tests/unit/app/api/account-consent-route.test.ts` — **3 tests** (401 / 200+telemetry / 500), RED on missing route module → GREEN. Pyramid: substrate contract at integration, route logic at unit (no component/E2E — that is FEAT-H008, API-first).
- **Gates:** `next build` clean (route compiles + type-checks), `eslint` clean, full unit suite 122/122, regression `test:integration:auth` 28/28 + `test:integration:account` 18/18 (consent_records consumers — transcendence/erasure — unaffected by the additive column).
