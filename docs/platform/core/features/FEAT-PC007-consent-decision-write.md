# FEAT-PC007: Consent decision write — the FIM grants or withdraws a granular consent decision

---
id: FEAT-PC007
title: Consent decision write — an own-subject, append-only, withdrawability-gated contract that records a FIM's granular consent grant/withdraw decisions
owner: platform/core/governance
consumers: [hub]
wave: ferd
maturity: 4-ready
---

## Problem

With FEAT-PC006, a FIM can *read* their effective consent state and history over the granular-consent substrate (the `decision` column + the `consent_purposes` catalog). But there is still **no member-facing way to change a decision** — to grant an optional purpose they had not consented to, or to withdraw one they had. The only producer of consent rows today is transcendence finalisation (a `SECURITY DEFINER` path); `public.consent_records` has **no client INSERT policy** by design (ADR-U034: writes flow only through controlled `SECURITY DEFINER` paths). A member-facing grant/withdraw therefore needs its own contract.

IDN-7's consent half ("update granular consent decisions") is that contract: an own-subject write that **appends** a new consent row carrying the new decision — never mutating the ledger (ADR-U034 §2: "a change of state is a NEW appended record") — gated so that only **withdrawable** purposes can be withdrawn. Withdrawing the foundational `transcendence` consent, for example, must be refused (it is `withdrawable = false`); withdrawing `product_analytics` (optional) must succeed.

This is the platform half of IDN-7, consumed API-first by the Hub ([FEAT-H009](../../../products/hub/features/FEAT-H009-update-consent-decisions.md)). It builds directly on FEAT-PC006's substrate. **Sharing controls** — the other concern §L3 bundles into IDN-7 (per-audience visibility, PC-3-coupled) — are **out of scope** here: that half has no substrate today and is split to a later slice (tracked in the gaps register; see FEAT-H009).

### Why Platform Core (Governance), not a Domain Service

Same authority as FEAT-PC006: consent state is authoritative in Platform Core, and §L3 (`hub/SPECIFICATION.md:366`) places GDPR consent state under PC-4 Governance. The write must append to the Core-owned `public.consent_records`, which has **no client write policy** — the append can only happen through a `SECURITY DEFINER` path owned in Core. The withdrawability gate is a *governance policy* check (against the `consent_purposes` catalog). A Domain Service cannot reach the ledger without breaking the one-way Domain→Core rule, and this is not extension-modellable: it is a controlled mutation of Core's own consent substrate.

## Solution sketch

- **`record_consent_decision(p_purpose text, p_decision text)`** — a `SECURITY DEFINER` SQL function, `SET search_path = ''`, that:
  1. resolves the caller to their personal-group subject via the repo actor primitive (`public.get_current_personal_group_id()`), plus the `users.id` for `subject_user_id`;
  2. validates `p_purpose` exists in `public.consent_purposes` (unknown purpose → raise);
  3. enforces **withdrawability**: a withdrawal-class decision (anything other than the affirmative `'granted'`) on a purpose whose catalog `withdrawable = false` is refused (raise `42501` / a typed governance error); `'granted'` is always permitted for a catalogued purpose;
  4. is **effective-state-idempotent**: if the caller's current effective decision for the purpose already equals `p_decision`, it is a no-op (returns current state) — double-submits don't spam the append-only history;
  5. otherwise **appends** one `consent_records` row: `subject_user_id`, `subject_group_id`, `purpose`, `decision = p_decision`, `policy_version =` the catalog's `current_policy_version` for that purpose, `capture_context = jsonb { surface, path }`;
  6. returns the updated effective entry for the purpose (so the caller need not immediately re-read).

  `decision` stays **open text** (no enum); the withdrawability gate — not a sealed type — carries the policy.
- **`POST /api/account/consent`** — additive route, `@supabase/ssr` cookie-session auth (realized house style; `/api/v1/` + Bearer directional, per FEAT-PC006 Open spec questions). Body `{ purpose, decision }`. Sessionless → 401; unknown purpose → 422; refused withdrawal → 409/403 (typed). On success returns the updated effective entry.

No new table, no RLS change, no trigger change — the append-only guarantee and `consent_records_select_own` RLS are inherited unchanged. The `decision` column + catalog this consumes are landed by FEAT-PC006.

## ADR-U016 cascade — recording a consent decision

A consent decision (especially a **withdrawal**) is a lifecycle event; per ADR-U016 the cascade is specified before build. Each layer is tagged `done` (realised this cycle) / `pending` (a documented consumer obligation / forward seam).

| Layer | What happens on a consent decision | Status |
|---|---|---|
| **PC-4 Governance / consent ledger** | One row appended to `public.consent_records` with the new `decision` + current `policy_version`. Ledger is the authoritative effective state. Append-only; nothing mutated. | **done** (this feature) |
| **Effective-state read (FEAT-PC006)** | `get_own_consent_state()` immediately reflects the new latest-per-purpose decision; `needs_reconsent` recomputes against the catalog version. | **done** |
| **Observability consumers (V4) — e.g. `product_analytics`** | On withdrawal of an analytics-class purpose, downstream telemetry/analytics processing for that subject must consult effective consent before processing. The decision is **recorded** now; pipeline **enforcement** is a consumer obligation — no analytics pipeline is realised yet, so this is a forward seam (the substrate is the authoritative gate when it lands). | **pending** (consumer obligation / forward seam) |
| **Notifications (V3)** | None — §L3 fixes IDN-7 at V2, V4 (not V3). No notification trigger on a self-initiated consent change in Cycle B. An optional self-addressed confirmation is deferred. | **n/a** (by canon) |
| **Membership / enrollment (PC-3 / DS-3)** | None — a consent decision does not alter group membership or journey enrollment. (Distinct from the sharing-controls half, which *is* PC-3-coupled and is split out.) | **n/a** |
| **`transcendence` (non-withdrawable)** | Withdrawal refused at the gate (step 3); no row appended, no cascade. Re-granting an already-granted foundational purpose is an idempotent no-op. | **done** (refusal path) |

## Appetite

Small-to-medium. One `SECURITY DEFINER` write function (validation + withdrawability gate + idempotency + append), one additive POST route with typed error mapping, and integration tests for grant / withdraw / refused-withdrawal / unknown-purpose / idempotency / own-subject. No new table or RLS (inherits PC-2/FEAT-PC006 substrate).

## Rabbit holes

- **Don't mutate or delete rows.** A withdrawal is a *new appended row* (ADR-U034 §2). Never `UPDATE`/`DELETE` `consent_records` — the `enforce_consent_append_only` trigger will (correctly) raise `42501`.
- **Don't add a client INSERT policy to `consent_records`.** The write is a `SECURITY DEFINER` path by design; opening a client INSERT policy would bypass the withdrawability gate and the policy-version stamping.
- **Don't seal `decision`.** Open text + the catalog `withdrawable` flag carry the policy; a DB enum or client-side closed set fails extensibility.
- **Don't stamp the wrong policy version.** `policy_version` is read from the catalog's `current_policy_version` for the purpose at write time — not passed by the client (a client could lie about which policy they consented under).
- **Don't double-append on re-submit.** Effective-state idempotency: equal-to-current decision is a no-op. Guard so a double-click or retry doesn't bloat the GDPR history with identical rows.
- **Don't build re-consent or sharing controls.** Re-consent flow is deferred (FEAT-PC006 #6); sharing controls are the split-out IDN-7 half.

## No-gos

- No mutation/deletion of consent rows — append-only only.
- No withdrawal of a `withdrawable = false` purpose (e.g. `transcendence`) — refused at the gate.
- No cross-subject write — own-subject only; no parameter targets another member.
- No client-supplied `policy_version` — stamped server-side from the catalog.
- No sharing-controls / per-audience visibility write (split to a later PC-3 slice).
- No re-consent campaign/prompt machinery.

## Stories

### STORY-1: Grant an optional consent purpose
As the platform, I want a FIM to grant a withdrawable purpose they had not consented to, so a Surface can offer granular opt-in API-first.

**Acceptance criteria:**
- Given an authenticated FIM with no prior `product_analytics` row, when they call the contract with `purpose = 'product_analytics', decision = 'granted'`, then one row is appended with `decision = 'granted'` and `policy_version` stamped from the catalog, and the returned effective entry reads `granted`.
- Given that same call, then the subject is resolved to the caller's own personal group via the actor primitive — no other subject is written.

### STORY-2: Withdraw a withdrawable purpose
As the platform, I want a FIM to withdraw a previously-granted withdrawable purpose, so consent is reversible where policy allows.

**Acceptance criteria:**
- Given a FIM with effective `product_analytics = 'granted'`, when they call with `decision = 'withdrawn'`, then a **new** row is appended (`decision = 'withdrawn'`), the prior `granted` row is retained (history intact), and effective state for the purpose reads `withdrawn`.

### STORY-3: Withdrawal of a non-withdrawable purpose is refused
As the platform, I want withdrawal of a foundational purpose refused, so a member cannot withdraw consent the platform depends on.

**Acceptance criteria:**
- Given `transcendence` has catalog `withdrawable = false`, when a FIM calls with `purpose = 'transcendence', decision = 'withdrawn'`, then the contract refuses (typed governance error; route maps to 409/403), **no row is appended**, and effective state is unchanged.
- Given the same purpose, when a FIM calls with `decision = 'granted'` while already granted, then it is an idempotent no-op (no duplicate row).

### STORY-4: Unknown purpose is rejected
As the platform, I want decisions only against catalogued purposes, so the ledger stays meaningful.

**Acceptance criteria:**
- Given a `purpose` not present in `consent_purposes`, when a FIM calls the contract, then it is rejected (route maps to 422), and no row is appended.

### STORY-5: Idempotent re-submit
As the platform, I want equal-to-current decisions to be no-ops, so double-submits don't spam the GDPR history.

**Acceptance criteria:**
- Given a FIM whose effective `product_analytics` is already `withdrawn`, when they call again with `decision = 'withdrawn'`, then no new row is appended and the current effective entry is returned.
- Given the decision differs from current effective, when they call, then exactly one row is appended.

### STORY-6: Own-subject only — no cross-subject write
As the platform, I want the write to target only the caller's own consent, so it never affects another member.

**Acceptance criteria:**
- Given any authenticated caller, when they call the contract, then the appended row's subject is **their own** personal group / `users.id` — there is no parameter to target another subject.
- Given an unauthenticated caller, when they call, then the contract writes nothing and the route returns 401.

## Platform dependencies

- **[FEAT-PC006](./FEAT-PC006-member-consent-read.md) (Platform Core Governance) — the substrate this consumes.** The `decision` column on `consent_records`, the `consent_purposes` catalog (with `withdrawable` + `current_policy_version`), and `get_own_consent_state()` for the returned effective entry. PC006 lands the schema; PC007 adds the write path. (Build order: PC006 through its schema gate first, then PC007, then the Hub halves.)
- **PC-2 Identity consent substrate (existing).** `public.consent_records` + `enforce_consent_append_only` (the append-only guarantee this write respects) + `consent_records_select_own` RLS.
- **The repo actor primitive (PC-2 / PC-3).** Subject resolution to personal group + `users.id`.
- **No new ADR beyond the PC006 ADR-U034 amendment** — PC007 adds a write path within the substrate PC006's amendment already covers; the build session confirms the amendment text covers grant/withdraw semantics at the schema-review gate.

## Cross-product impact

Consumed by **Hub [FEAT-H009](../../../products/hub/features/FEAT-H009-update-consent-decisions.md)** (IDN-7 consent half) — the grant/withdraw controls. The **Gimbal** will consume the **same** `POST /api/account/consent` contract. Additive (ADR-U015) — no breaking change, no version bump. Paired-spec reciprocation: **the state-write is owned at the platform tier; the Hub cannot append to `consent_records` directly (ADR-U009).** Downstream consumers of consent (e.g. a future analytics pipeline, the COI-1 Whisp-consent and DIS-6 discoverability surfaces that also depend on IDN-7) read effective consent via FEAT-PC006 — they never re-derive it.

## Stability posture (Platform Core §7)

Additive: one new `SECURITY DEFINER` write function and one new route. No existing Core contract signature changes; the surface only grows. The function is a privilege-escalation surface (it appends to a table with no client write policy) — documented in its migration comment; its elevation is bounded to appending one own-subject consent row under the withdrawability gate, nothing more. Schema-touching work (the function ships in the same migration family as PC006's column/catalog) sets task status to `review`, not `done`.

## Vertical impact

- **Privacy/GDPR:** the core of this feature. Own-subject, append-only, retention-safe consent change; withdrawal is honoured where policy permits and refused where it does not. No client-supplied policy version (stamped server-side). The full grant/withdraw history is preserved as GDPR proof; nothing is deleted.
- **Notifications:** None — §L3 IDN-7 = V2, V4 (not V3); no notification trigger on a self-initiated consent change this cycle. An optional self-addressed confirmation is deferred (noted in the cascade).
- **Administration:** None new — no admin affordance; the member acts on their own consent. (Admin-side consent overrides, if ever needed, are a separate governance surface, not this self-service write.)
- **Observability:** the route emits structured logs (request id, actor, purpose, decision-class, outcome); refusals (non-withdrawable, unknown purpose) are recorded, not silently swallowed. The consent ledger itself is the durable audit of *what* was decided; route logs capture *that the attempt happened*.
- **Transactions:** None.
- **Extensibility:** `decision` is open text; `purpose` is an open catalog (new purposes = rows); withdrawability is per-row governance data, not a hardcoded set. The withdrawability gate is policy-as-data, so new purposes (and their reversibility) need no code change.
