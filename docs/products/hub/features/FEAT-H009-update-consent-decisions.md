# FEAT-H009: Update consent decisions — the FIM grants or withdraws granular consent from the Hub

---
id: FEAT-H009
title: Update consent decisions — the Hub controls that let a FIM grant or withdraw their own granular consent decisions
owner: hub
consumers: [hub]
wave: ferd
requires-equipment: none
maturity: 4-ready
---

## Problem

A FIM can now *see* their consent state (FEAT-H008) — but the Hub gives them no way to **change** it. They cannot grant an optional purpose they had skipped, nor withdraw one they had granted; the only consent producer today is transcendence. That contradicts the member-owned, in-experience framing of privacy and the GDPR expectation that consent is as easy to withdraw as to give (where policy permits).

IDN-7's consent half ("update granular consent decisions") is the Hub control set that closes the loop: on the consent surface (hosted by FEAT-H008), each **withdrawable** purpose gets a grant/withdraw control; choosing it confirms intent and calls the paired platform contract (FEAT-PC007), which appends the new decision — never mutating the ledger, and refusing to withdraw non-withdrawable purposes. Non-withdrawable purposes (e.g. `transcendence`) render locked. On success the surface re-reads effective state (FEAT-PC006) so the change is visibly reflected.

**Scope note (the IDN-7 split).** §L3 IDN-7 bundles two concerns: *consent decisions* (this feature) and *sharing controls* (per-audience visibility, PC-3-coupled). Sharing controls have **no substrate today** and are deliberately **split to a later slice**, tracked as **G-34** in the gaps register; this feature delivers only the consent-decision half. IDN-7 stays one capability — only its delivery is sequenced (mirroring the Cycle A IDN-9/IDN-12 split).

## Solution sketch

- On the **FEAT-H008 consent surface**, each purpose whose contract entry has `withdrawable = true` gets a clear **grant / withdraw control** reflecting its current effective decision. Purposes with `withdrawable = false` (e.g. `transcendence`) render **locked / read-only** (no control), driven by the catalog flag — the Hub never offers an action the platform will refuse.
- Choosing to change a decision opens a **`ConfirmModal`** (never a browser `alert`/`confirm` — Hub convention) stating the effect. **Withdrawal** copy is explicit about consequence ("you can grant this again later"); **grant** copy states what it enables.
- On confirm, the Hub calls **`POST /api/account/consent`** (FEAT-PC007) with `{ purpose, decision }` via the API-first fetch — never a direct Supabase write (ADR-U009). The control is **disabled and shows a loading state while the call is in flight** (no double-fire; FEAT-PC007 idempotency is a backstop, not the primary guard).
- **Success** → the Hub re-resolves effective state via FEAT-PC006 (single source of truth — don't hand-roll the new state locally) and updates **all** related UI together (the toggled row + any dependent hint), so the surface is consistent.
- **Failure / refusal** → a clear, non-destructive error on the surface with retry; the decision visibly stays as it was. A refused withdrawal of a non-withdrawable purpose (if a stale client somehow attempts it) surfaces the platform's refusal honestly rather than a false success.

## Appetite

Small. Grant/withdraw controls + ConfirmModal on the existing FEAT-H008 surface, one Platform API call with success / failure / loading handling, the locked rendering of non-withdrawable purposes, and the post-success re-read. No new platform mutation logic in the Hub (that is FEAT-PC007); the Hub orchestrates the call and its UX.

## Rabbit holes

- **Don't use a browser dialog.** Use `ConfirmModal` (AGENTS.md / Hub convention) — a consent change deserves a real confirmation surface.
- **Don't offer controls on non-withdrawable purposes.** Gate the control on the contract's `withdrawable` flag; render `transcendence` locked. Never present an action the platform will refuse.
- **Don't assume success.** Re-read effective state (FEAT-PC006) after the call; render the new decision only on confirmed success, never optimistically into a state the platform didn't confirm.
- **Don't double-fire.** Disable the control while in flight; rely on FEAT-PC007's idempotency as a backstop, not the primary guard.
- **Don't build sharing controls or re-consent here.** Sharing controls are the split-out half (G-34); re-consent flow is deferred. This feature is grant/withdraw of consent decisions only.
- **Don't partial-update the UI.** After a decision change, update all related state together (Hub convention) — a half-updated surface (toggle flips but the drift hint or history stays stale) is drift.

## No-gos

- No withdrawal of a non-withdrawable purpose (e.g. `transcendence`) — rendered locked; the platform refuses regardless.
- No sharing-controls / per-audience visibility (split-out IDN-7 half — G-34).
- No re-consent prompt/flow.
- No consent change for another member — own consent only (the contract is own-subject).
- No direct `public.consent_records` write — Platform API only (ADR-U009).

## Stories

### STORY-1: Grant an optional consent purpose
As a FIM, I want to grant an optional purpose I had skipped, so I can opt in on my own terms.

**Acceptance criteria:**
- Given a FIM viewing the consent surface with `product_analytics` undecided or withdrawn, when they choose to grant it and confirm in the ConfirmModal, then the Hub calls `POST /api/account/consent` (FEAT-PC007) with `decision = 'granted'` — never a direct write (ADR-U009).
- Given the platform confirms success, when the Hub handles the response, then it re-reads effective state (FEAT-PC006) and the row updates to granted, with all related UI updated together.

### STORY-2: Withdraw a withdrawable purpose
As a FIM, I want to withdraw an optional purpose I had granted, so consent is reversible where allowed.

**Acceptance criteria:**
- Given `product_analytics` is effectively granted, when the member chooses withdraw and confirms, then the Hub calls the contract with `decision = 'withdrawn'`, and on success the row reads withdrawn after the re-read.
- Given the ConfirmModal for withdrawal, when it opens, then its copy explains the effect (and that the member can grant again later) before any call is made.

### STORY-3: Non-withdrawable purposes are locked
As a FIM, I want foundational consent shown as not-withdrawable, so I am not offered an action that cannot succeed.

**Acceptance criteria:**
- Given a purpose with `withdrawable = false` (e.g. `transcendence`), when the surface renders, then it shows **no** grant/withdraw control (locked/read-only), driven by the catalog flag.
- Given a stale client nonetheless posts a withdrawal of `transcendence`, when the platform refuses (FEAT-PC007), then the Hub surfaces the refusal honestly and performs no UI state change.

### STORY-4: Confirmation before changing a decision
As a FIM, I want to confirm before changing a consent decision, so the change is deliberate.

**Acceptance criteria:**
- Given a grant/withdraw control, when the member chooses it, then a `ConfirmModal` (never a browser alert) explains the effect and asks them to confirm before any call is made.
- Given the member cancels the ConfirmModal, when they dismiss it, then no call is made and the decision is unchanged.

### STORY-5: Failure is handled cleanly
As a FIM, I want a clear error if a consent change fails, so I am never shown a false success.

**Acceptance criteria:**
- Given the call fails (network / permission / refusal), when it returns, then the Hub shows a clear error on the consent surface with a retry, and the decision visibly remains as it was — no optimistic flip.
- Given the call is in flight, when the member has confirmed, then the control is disabled and a loading state shows until the response resolves.

### STORY-6: Own consent only
As a FIM, I want to change only my own consent, so the control never affects anyone else.

**Acceptance criteria:**
- Given the consent surface, when the member changes a decision, then the Hub posts only the member's own decision (the contract is own-subject; there is no target selection).

## Platform dependencies

- **[FEAT-PC007](../../../platform/core/features/FEAT-PC007-consent-decision-write.md) (Platform Core Governance) — the substrate this consumes.** Provides `POST /api/account/consent` — own-subject, append-only, withdrawability-gated grant/withdraw, stamping policy version server-side and refusing withdrawal of non-withdrawable purposes. **Paired-spec reciprocation — the write is owned platform-side; the Hub cannot append to `public.consent_records` directly (ADR-U009).**
- **[FEAT-PC006](../../../platform/core/features/FEAT-PC006-member-consent-read.md) (Platform Core Governance).** The read used to drive the controls (the `withdrawable` flag gates which purposes get a control) and to re-resolve effective state after a successful change.
- **Internal: [FEAT-H008](./FEAT-H008-render-consent-state.md).** Hosts the consent surface these controls live on; IDN-7 depends on IDN-6 internally (§L3).
- **Hub `ConfirmModal` (design-system primitive, existing).** The confirmation surface for a consent change.

## Cross-product impact

The **Gimbal** will consume the **same** `POST /api/account/consent` contract for its own consent controls; only the platform-side semantics are shared. Within the Hub, this feature completes the consent half of Cycle B on the surface FEAT-H008 establishes. The **sharing-controls** half of IDN-7 (per-audience visibility, PC-3-coupled) is split to a later slice (**G-34**); IDN-7's downstream consumers — COI-1 (Whisp engagement/consent) and DIS-6 (discoverability defaults) — depend on that half, not on this one.

## Vertical impact

- **Privacy/GDPR:** the core of this feature — it makes consent reversible where policy permits (grant/withdraw of own consent), the GDPR "withdraw as easily as you gave" expectation, with non-withdrawable foundational consent honestly locked. Own-subject only; the Hub posts only the member's own decision and surfaces no other member's consent.
- **Notifications:** None — §L3 IDN-7 = V2, V4 (not V3); a self-initiated consent change triggers no notification this cycle. (If the platform later emits a self-addressed confirmation, the Hub would surface it — deferred, per FEAT-PC007's cascade.)
- **Administration:** None — the member acts on their own consent; no admin affordance, no DeusEx oversight.
- **Observability:** the Hub emits telemetry for each consent-change attempt, its confirmation, and success / failure / refusal outcomes (the authoritative ledger row is written platform-side by FEAT-PC007); no silent failures.
- **Transactions:** None.
- **Extensibility:** the controls are driven by the contract's open `withdrawable` flag and open `decision` values — a new purpose, or a new decision class, flows through the same data-driven controls without a hardcoded client-side set. Non-withdrawable purposes render locked through the same flag, not a hardcoded special-case for `transcendence`.
