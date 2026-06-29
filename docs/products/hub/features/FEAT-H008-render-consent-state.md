# FEAT-H008: Render consent state — show the FIM their own consent decisions and history

---
id: FEAT-H008
title: Render consent state — the Hub surface that shows a FIM their effective granular consent decisions and full consent history
owner: hub
consumers: [hub]
wave: ferd
requires-equipment: none
maturity: 4-ready
---

## Problem

A FIM consents to things — foundationally at transcendence, and (with IDN-7) to optional purposes over time — but the Hub gives them **no way to see what they have consented to**. There is no surface showing their current consent decisions, which are reversible, when each was made, or under which policy version. That is both a transparency gap and a GDPR expectation: a member should be able to inspect their own consent record.

IDN-6 ("render member-visible consent state and consent history") is the Hub surface that closes the gap: a read-only consent view that calls the paired platform contract (FEAT-PC006) and presents two things honestly — the **effective state** (current decision per purpose, with its label, whether it is withdrawable, and whether it is stale against the current policy) and the **history** (the full append-only record). It renders; it does not change anything — the grant/withdraw controls are its paired sibling FEAT-H009 (IDN-7). This is the first pair of Cycle B (Consent & privacy / GDPR), and the read foundation IDN-7 builds its controls onto.

## Solution sketch

- A **Consent** surface in the member's account/settings area (alongside profile, FEAT-H005), mounted for **FIMs only** — a Mist has not transcended and has no consent record, so the surface is not shown to it (gate by identity, matching FEAT-H005/FEAT-H006).
- On mount the surface calls **`GET /api/account/consent`** (FEAT-PC006) via the Hub's API-first fetch — never a direct Supabase read (ADR-U009). A **loading state** shows while it resolves (Hub convention: never a frozen UI).
- **Effective state** renders one row per catalogued purpose from the contract's `effective` array: the purpose `label`, its current `decision` (granted / withdrawn / not yet decided), and — for context — `withdrawable` and the `needs_reconsent` drift flag. `transcendence` reads as a foundational, granted, non-withdrawable consent; `product_analytics` reads as an optional one (granted / withdrawn / undecided).
- **Policy drift** (`needs_reconsent = true`) surfaces as a quiet, honest hint on that row ("the policy for this has been updated") — **informational only**; no re-consent prompt or flow exists yet (deferred per FEAT-PC006).
- **History** renders the contract's `history` array — each event's purpose, decision, policy version, and timestamp — newest first, as the member's own consent record.
- **Error / empty** states are explicit: a failed fetch shows a clear error with retry (never a silent blank); a FIM with only the transcendence record still sees that one honest row.

## Appetite

Small. One read-only surface consuming one existing platform contract, with loading / error / empty handling and the effective-vs-history presentation. No mutation (that is FEAT-H009); no new platform capability (FEAT-PC006 provides everything).

## Rabbit holes

- **Don't add controls here.** This surface renders; grant/withdraw toggles are FEAT-H009. Keep H008 read-only so the read foundation is clean before controls land on it.
- **Don't build a re-consent flow.** Surface `needs_reconsent` as a hint only; prompting/blocking re-consent is deferred (FEAT-PC006 #6).
- **Don't hardcode the purpose list.** Render whatever purposes the contract returns from the catalog — a new purpose must appear with no Hub change (extensibility).
- **Don't read Supabase directly.** All consent data comes through `GET /api/account/consent` (ADR-U009); the Hub's two realtime channels and auth are the only direct Supabase contacts, and this is none of them.
- **Don't collapse history into effective.** Show both — effective is "where you are now," history is the GDPR proof trail; they are different views of the same ledger.
- **Mind the timestamp boundary.** History timestamps are `timestamptz`; render via `new Date(value)`, don't string-compare (platform/Hub gotcha).

## No-gos

- No grant/withdraw controls (that is FEAT-H009).
- No re-consent prompt/flow (drift is shown, not acted on).
- No sharing-controls / per-audience visibility surface (the split-out IDN-7 half — a later slice; see FEAT-H009).
- No consent view of any other member — own consent only (the contract is own-subject).
- No direct database access.

## Stories

### STORY-1: See my effective consent state
As a FIM, I want to see what I currently consent to, so my consent is transparent to me.

**Acceptance criteria:**
- Given an authenticated FIM on the Consent surface, when it mounts, then the Hub calls `GET /api/account/consent` (FEAT-PC006) — never a direct table read (ADR-U009) — and renders one row per purpose with its label and current decision.
- Given the contract returns a `transcendence` entry (granted, non-withdrawable) and a `product_analytics` entry, when the surface renders, then both appear with their current decision, and an undecided optional purpose reads as "not yet decided."

### STORY-2: See my consent history
As a FIM, I want to see the full record of my consent decisions, so I have the GDPR proof trail.

**Acceptance criteria:**
- Given the contract returns a `history` array, when the surface renders, then each event shows its purpose, decision, policy version, and timestamp, newest first.
- Given a purpose that was granted then withdrawn, when the member views history, then **both** events appear (the ledger is not collapsed), while effective state shows the latest.

### STORY-3: Policy drift is shown, not acted on
As a FIM, I want to know when a decision is stale against an updated policy, without being forced through a flow that doesn't exist yet.

**Acceptance criteria:**
- Given an effective entry with `needs_reconsent = true`, when the surface renders that row, then it shows an informational "policy updated" hint and **no** re-consent prompt or call-to-action that performs an action.
- Given an entry with `needs_reconsent = false`, when it renders, then no drift hint is shown.

### STORY-4: Loading, error, and empty are honest
As a FIM, I want clear feedback while my consent loads and if it fails, so I am never shown a frozen or misleading screen.

**Acceptance criteria:**
- Given the consent fetch is in flight, when the surface is mounting, then a loading state is shown (never a frozen or blank UI).
- Given the fetch fails, when it returns, then a clear error state with a retry is shown — not a silent empty surface.
- Given a FIM whose only record is the transcendence consent, when the surface renders, then that single honest row is shown (a valid non-empty state).

### STORY-5: Consent surface is FIM-only
As a Mist, I want not to be shown a consent surface that doesn't apply to me, so the Hub stays honest about my pre-transcendence state.

**Acceptance criteria:**
- Given a Mist (pre-transcendence) session, when the account area renders, then the Consent surface is not mounted (gated by identity, matching FEAT-H005/FEAT-H006).
- Given a FIM session, when the account area renders, then the Consent surface is available.

## Platform dependencies

- **[FEAT-PC006](../../../platform/core/features/FEAT-PC006-member-consent-read.md) (Platform Core Governance) — the substrate this consumes.** Provides `GET /api/account/consent` returning own-subject `effective` (latest-decision-per-purpose, with `label`, `withdrawable`, `current_policy_version`, `needs_reconsent`) + `history` (full append-only ledger), over the `decision` column + `consent_purposes` catalog. **Paired-spec reciprocation — the read is owned platform-side; the Hub cannot touch `public.consent_records` directly (ADR-U009).**
- **Identity gating (existing).** The same FIM-vs-Mist identity gate FEAT-H005/FEAT-H006 use to mount FIM-only surfaces.

## Cross-product impact

The **Gimbal** will consume the **same** `GET /api/account/consent` contract for its own consent view; only the platform-side semantics are shared. Within the Hub, this surface is the host that **FEAT-H009** (IDN-7) mounts its grant/withdraw controls onto — H009 depends on H008 internally (§L3: IDN-7 depends on IDN-6). The later sharing-controls slice (the split-out IDN-7 half) will likely add a sibling surface in the same account area.

## Vertical impact

- **Privacy/GDPR:** the heart of this feature — it makes the member's own consent record transparent to them (effective + full history), the GDPR "see what you consented to" expectation. Own-subject only; it surfaces no other member's consent, and reads only through the own-subject platform contract.
- **Notifications:** None — a read-only consent view triggers nothing and addresses no other party (consistent with §L3 IDN-6 = V2, V4; not V3).
- **Administration:** None — no admin affordance; the member views their own consent. No DeusEx oversight needed.
- **Observability:** the Hub emits telemetry for the consent-view load and its outcome (success / error); error states are events, not silent failures (products-tier discipline).
- **Transactions:** None.
- **Extensibility:** the surface renders whatever purposes the catalog-backed contract returns — a new purpose appears with no Hub change. Decisions are rendered from open-text values the Hub treats as data (granted / withdrawn / undecided / unknown → safe default), not a hardcoded client-side enum.
