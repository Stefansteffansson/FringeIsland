# Vertical — V5: Transactions

<!-- Valid verticals: V1 Administration | V2 Privacy/GDPR | V3 Notifications | V4 Observability | V5 Transactions -->

---
id: V5
name: Transactions
owner: Stefan
consumers: all  # verticals are obligations on every tier — Platform Core, Domain Services, and Surfaces
status: active
last_updated: 2026-06-12
tier: Cross-cutting
---

> A "vertical" is a concern that touches every tier of the ecosystem anatomy — Platform Core, Domain Services, and Surfaces (Products + Studios + Design System). Verticals are *not* services or products. They are obligations that every service, surface, and tier must fulfil. There are five: V1 Administration, V2 Privacy/GDPR, V3 Notifications, V4 Observability, V5 Transactions. Per ADR-U002, verticals are not a level of their own in the anatomy — they thread through every level.

**Authorship note.** This file is authored across three decomposition levels (see `.claude/skills/ecosystem-decomposition/SKILL.md`). L2 owns the purpose, scope, and constitutional shape (§L2 below). L3 owns the obligation inventory and cross-cutting checklists (§L3). L4 owns the feature-inventory summary of vertical-owned features (§L4 — often sparse, since most obligations are satisfied by other owners' features). No level modifies a section owned by another. The `doc-health-check` skill verifies section boundaries hold.

Note that verticals use an **Obligation inventory** at L3 rather than a Capability inventory. This is the load-bearing structural difference from products, services, and studios: verticals do not own capabilities of their own — they levy obligations on other entities' capabilities. The position in the document is the same (§L3); the content type is different because of what verticals structurally are.

---

## L2 — Purpose, scope, and constitutional shape

*L2 authorship. Derived from Vision (which principle does this vertical operationalise?) and the ecosystem anatomy (`../../architecture/ECOSYSTEM_ANATOMY_V5.svg`, ADR-U002). Revised when the vertical's scope, tooling, or failure profile materially changes.*

### 1. Purpose

Money flows through the platform — paid journeys, group subscriptions, creator payouts, marketplace fees. This vertical defines the shared transaction substrate so that any service that touches money does so safely, auditably, and consistently. Mishandled money is the fastest way to destroy trust. Mishandled tax is the fastest way to destroy a company. This vertical guarantees that every transaction is recorded against the platform's own ledger, reconciled, and compliant. Two commitments shape it. Constitutionally: the commercial machinery exists to fund the mission, never to mine the member — monetisation never trades member data (Vision principle 4, "Privacy over commercial opportunity"; the Manifesto's member-privacy-over-commercial-opportunity commitment) — the trust that mishandled money destroys is the same trust that constraint protects. Structurally: where Administration is human-operated lifecycle events and Notifications is an internal system actor, Transactions is driven by an automated external actor — Stripe webhook events (ADR-U002, ADR-U011) — so reconciliation, not event receipt, is where platform truth is made.

Per ADR-U028 (governance by scope, ratified 2026-06-10), transactions split by **scope**. A member **buying** — journey enrolment, premium, subscriptions, one-off purchases — is **in-experience**: the purchase affordance lives where the member already is. Economy **management** — pricing, payouts, marketplace operations — is **universe-scoped** and lives on **the Console**, the back-of-house surface (working name; fiction name deferred). The Console is a surface, not a new permission system: one permission mechanism throughout (the universal group pattern, ADR-U006/U007).

### 2. Scope

Scoped per ADR-U028 — member-facing flows in-experience vs economy management on the Console:

**Substrate (scope-neutral):**
- Payment provider integration — Stripe Connect (ADR-U011: marketplace payment splits; FringeIsland never builds payment logic)
- The canonical ledger, and reconciliation of provider state against it
- Entitlement resolution — what a completed transaction unlocks, queried through the Platform API
- Tax handling, jurisdiction-explicit — [EU VAT], [US sales tax], [withholding: jurisdiction TBD] are separate regimes, not one generic "tax"
- Invoicing

**In-experience (a member buying):**
- Subscription lifecycle (create, upgrade, downgrade, pause, cancel, refund)
- One-off purchases (including journey enrolment and premium)

**Universe-scoped economy management (the Console):**
- Pricing operations
- Creator payouts
- Marketplace operations — the money side only; listing, browse, and search are DS-6 Discovery's (settled boundary, discovery.md invariant 7)
- Dispute and chargeback handling

### 3. Tooling and infrastructure

- **Payment provider — Stripe Connect.** Design-locked by ADR-U011 (Connect specifically, for marketplace payment splits; the platform never builds payment logic), wave-deferred (placeholder in Ferd; U011's "first subscription tier may introduce basic Stripe integration in late Ferd" is a MAY, unexercised; full marketplace in Hamn), unrealized — no Stripe dependency, no integration code on disk.
- **Ledger — to be designed.** The platform's source of truth for money state; Stripe is one source feeding it, not the truth itself. Append-only; stores only what ADR-U011's minimal-storage law names: Stripe payment reference, entitlement unlocked, creator earning record. Unrealized.
- **Entitlement resolution — to be designed.** The query surface behind the Platform API ("does this actor have access to X"), backed by the ledger's entitlement records. Vendor-agnostic. What an entitlement structurally *is* remains open (§5 Q7). Unrealized.
- **Tax engine — to be selected.** Stripe Tax is the candidate where the regime allows it (a Stripe-specific dependency if chosen); the obligations themselves are jurisdictional and survive any vendor choice. Selection is gated on the registration-posture question (§5 Q4). Unrealized.
- **Invoicing pipeline — to be designed.** Jurisdiction-shaped (invoice content requirements differ by regime); downstream of the tax-engine selection. Unrealized.

*Adjacent, not transactional:* the realized journey-enrolment flow is the free-tier precursor of the one-off-purchase shape but carries zero payment semantics, and the live `publish_journey`/`unpublish_journey` permissions deliberately carry no marketplace vocabulary. Neither is transaction substrate; nothing in this vertical is realized today.

### 4. Failure modes

Transactions' actor is automated and external — Stripe's webhook machinery, not a human operator (V1's actor) or an internal system actor (V3's). Its failures are therefore divergence failures: what the provider believes, what the ledger records, and what the member experiences drift apart, silently, with asymmetric cost on two axes — money operations are irreversible (a duplicate payout cannot be un-sent) and tax errors compound (a misfiling grows into liability the platform is not capitalised to absorb).

1. **Duplicate charge / double payout.** A money operation retried without a named idempotency expectation executes twice — transient-network-error and already-executed-but-unconfirmed are indistinguishable without idempotency keys. Money retry is not log retry; retry postures safe elsewhere are unsafe here. *Detection:* reconciliation against the ledger; provider-state divergence. *Recovery:* correcting entry plus recovery of the duplicate — but the irreversibility cost may already be incurred; prevention (idempotency keys named per operation) is the real control.
2. **Ledger drift.** The webhook-as-truth inversion: ledger written on webhook receipt rather than on reconciled state. Stripe webhooks arrive out of order, are replayed, and can be missed — receipt-driven writes accumulate divergence. *Detection:* scheduled reconciliation passes; every reconciliation outcome is an observability event (V4). *Recovery:* reconciliation commits corrections as new append-only entries — never silent rewrites.
3. **Entitlement/payment split-brain.** Paid-but-locked (member charged, access not granted — the single most trust-destroying member experience this vertical can produce) or unlocked-but-unpaid (revenue leak). *Detection:* entitlement-resolution errors are observability events; reconciliation cross-checks entitlements against ledger state. *Recovery:* the ledger arbitrates — entitlements re-derive from it; member-facing repair is unlock-first, settle-money-second.
4. **Tax exposure.** Misfiling in a registered jurisdiction, or implicitly promising compliance in an unregistered one. Compounds silently across filing periods. *Detection:* a per-jurisdiction register of where the platform is registered, checked against where transactions actually originate. *Recovery:* retroactive filings are expensive — the control is preventive: no money flow in a jurisdiction whose registration posture is unresolved (§5 Q4).
5. **Silent webhook failure.** The endpoint is unreachable or rejecting; Stripe's retry machinery masks the failure, then expires — events are lost without local trace. A missed webhook is V4's silent-drop class exactly. *Detection:* scheduled reconciliation detects the gap (this is why reconciliation is never webhook-triggered-only); webhook outcomes — including rejections — are observability events. *Recovery:* backfill from provider records via reconciliation.
6. **Member-data leak to the payment vendor.** More member data crosses to Stripe than the minimal-storage law and the sub-processor scope sanction (V2: Stripe is a named sub-processor; every payment-data category carries a lawful basis). *Detection:* payload review against the minimal set at design time; V2's detection machinery thereafter. *Recovery:* V2's breach machinery (the Art. 33/34 seam); sub-processor remediation.
7. **Scope leak.** Economy management woven into the member experience — pricing operations, payout dashboards, or dispute handling surfacing in-experience, or purchase affordances demanding Console-grade permissions (U028's failure face, and the constitutional one: commercial machinery colonising the member's world). *Detection:* surface review against the U028 routing law (§6 Surfaces). *Recovery:* relocate the affordance; the routing law is the design-time gate.

### 5. Open questions

- **Q1 — Accounting backend timing.** When does the platform need a real accounting backend (vs Stripe reports plus the ledger's own exports)? The ledger is the platform's money truth either way; the question is the bookkeeping and filing layer above it. *Resolution point:* before the first real money flow at scale — Hamn marketplace entry at the latest.
- **Q2 — Cross-jurisdiction creator payouts.** Stripe Connect executes the transfer mechanics, but withholding [withholding: jurisdiction TBD], registration thresholds, and the platform's information-reporting duties stay with the platform. *Resolution point:* marketplace design at Hamn; seams with Q4.
- **Q3 — Free trials and abuse.** Do we ever offer free trials, and how do we prevent abuse if so (repeat-account trial farming)? *Resolution point:* subscription design — no earlier need.
- **Q4 — Registration posture / jurisdiction scope.** In which jurisdictions will the platform register for tax, and what happens when a member transacts from an unregistered one — block, geo-fence, or sell with explicit scope disclosure? Until this resolves, no obligation may claim generic per-user tax compliance (this vertical's own authoring law). *Resolution point:* pre-revenue lock — before the first paid flow, whichever wave that lands in.
- **Q5 — Mist transacting bounds.** A purchase is durable state plus payment PII; a Mist is anonymous and ephemeral and holds neither (ADR-U031). The cold lean: Mists cannot transact — transcendence to FIM is the purchase path. Held as a question because the U031 lifecycle owns its own open threads; this vertical does not resolve them. *Resolution point:* U031 transcendence/TTL design.
- **Q6 — When does "placeholder" end?** U011 makes Transactions a placeholder in Ferd with a late-Ferd MAY (basic Stripe integration for a first subscription tier) that remains unexercised. Does anything land in Ferd, or does all integration wait for Hamn? *Resolution point:* wave planning at Ferd close-out.
- **Q7 — The entitlement model shape.** What *is* an entitlement in the universal-group/equipment frame — a permission grant through the one mechanism (ADR-U006/U007), an equipment/status key at feature grain (ADR-U025), or a distinct record the Platform API resolves? *Resolution point:* candidate ADR before the first paid flow; seams with Q4/Q6 timing.

---

## L3 — Obligation inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the vertical enters active development, has its scope materially revised, or is affected by an architectural change that introduces new obligations. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### 6. Obligations on each tier

The rules this vertical imposes on each tier of the anatomy. These are what every other entity's Vertical Impact section (in their own L3 capability inventory) must read against and conform to.

#### Platform Core

1. Provides the canonical **ledger** — the platform's source of truth for money state (who owes what to whom, what was paid, what was unlocked, what was earned). Stripe is one source feeding the ledger, never the truth itself; every obligation in this spec that records money state records it against the ledger.
2. Ledger entries are **append-only**; corrections are new entries, never rewrites or deletes — the money trail must survive its own mistakes.
3. Owns the **payment-provider abstraction**. Stripe Connect is the locked provider (ADR-U011); obligations that depend on Stripe-specific machinery name Stripe explicitly, so a future provider change has a visible refactor surface.
4. **Stripe webhook handlers are idempotent and authenticated** — Stripe retries, replays, and delivers out of order, so handlers tolerate duplicates by design; signature verification is mandatory, not optional.
5. **Webhook receipt is not ledger write.** Receipt triggers reconciliation; the ledger commits to reconciled provider state. Reconciliation also runs on schedule, independent of webhook arrival — a missed webhook must not mean missed money state (V4's no-silent-drop law, applied to money).
6. **Every money operation names its idempotency expectation.** Charges, refunds, payouts, and transfers carry idempotency keys; their retry semantics distinguish transient-failure from already-executed-but-unconfirmed. Money operations never inherit the surrounding retry conventions.
7. **The minimal-storage law (ADR-U011).** The platform stores only: the Stripe payment reference, the entitlement unlocked, and the creator earning record. No card data, no payment-instrument detail — ever. This is V2's content-minimisation realized as this vertical's charter; cite it, don't re-derive it.
8. **Entitlement resolution lives behind the Platform API.** Products, studios, and services ask whether an actor has access; nothing outside Platform Core inspects transaction state directly.
9. **Every money act is observable, notifiable, and auditable.** Webhook outcomes (including rejections), reconciliation outcomes, and entitlement-resolution errors are observability events (V4); member-relevant payment events (receipt, payment failure, payout confirmation) emit transactional-category notification triggers (V3); operator-plane money interventions — refunds, comps, dispute actions — are audited human admin acts, and the irreversible ones follow V1's supervised-bypass discipline.
10. **Tax obligations cite jurisdiction explicitly** — [EU VAT], [US sales tax], [withholding: jurisdiction TBD] are separate obligations tracking separate regulatory regimes. No money flows in a jurisdiction whose registration posture is unresolved (§5 Q4).
11. **Payment data crosses to Stripe under V2's sub-processor terms** — Stripe is named on the sub-processor list before personal data flows; every payment-data category carries an Art. 6 lawful basis; and constitutionally, monetisation never trades member data — the commercial machinery funds the mission (Vision principle 4; Manifesto).

#### Domain Services

1. **No service calls the payment provider directly.** Money flows through Platform Core's payment abstraction, always — services that sell things consume the abstraction.
2. **Every transaction-producing event reaches the ledger** through the platform's transaction surface — a service never writes money state itself, and a priced event (an enrolment with a price, a premium unlock, a paid-content flag) that doesn't produce a ledger entry is incomplete.
3. **Sold things are referenced opaquely.** DS-6 Discovery lists, browses, and searches; its marketplace listings reference the sold thing by ID; payment rails, revenue splits, refunds, and entitlements stay in this vertical (the settled DS-6 boundary — discovery.md invariant 7).
4. **Payment gating resolves entitlements through the Platform API** — services (journey enrolment in Journeys, premium content anywhere) never gate on transaction history or webhook-derived local state.
5. **Member-relevant payment events emit notification triggers** declared under V3's transactional category (receipts, payment failures, payout confirmations) per the trigger-emission law.
6. **Money-relevant failures are never silent** — a failed entitlement check, a failed ledger write, a rejected provider call each emits an observability event (V4).
7. **Services hold no payment PII and no payment-instrument data.** Anything money-shaped in a service's own store is a ledger reference, nothing more (the minimal-storage law's service face).

#### Surfaces (Products · Studios · Design System)

1. **Surfaces initiate transactions, never process them.** Enrol, subscribe, and accept-premium affordances hand off to platform flows; no surface touches provider APIs or transaction state directly.
2. **Full disclosure before confirmation.** Each surface that initiates a transaction shows price, currency, tax treatment, and refund policy before the member confirms, in the member's billing region's terms.
3. Member-facing purchase flows (enrolment, premium, subscriptions) are in-experience; economy-management surfaces (pricing, payouts, marketplace operations) are universe-scoped and live on the Console (ADR-U028) — never woven into the member experience.
4. **The Console is a surface, not a permission system.** Economy-management affordances gate through the one permission mechanism (universal group pattern, ADR-U006/U007); no Console-only authority path exists.
5. **Entitlement display asks the platform** — has access / doesn't — never inferring access from payment history.
6. **Payment UI is design-system work.** Payment flows, entitlement gates, paywall variants, and receipt displays use design-system primitives, never bespoke; transaction UI regression risk is financial, not cosmetic, so it lives behind the design system's stability guarantees.
7. **Studios initiate creator-side monetisation, never process it.** Royalty splits, paid-content flags, and creator subscriptions are initiations; earnings, payout schedules, and tax-relevant figures surface by querying the platform, never by local computation.
8. **Member-bound payment messages follow V3's external-delivery law.** Receipt emails and payment notifications carry the content-minimised payload V3's obligations define for externally-bound sends.

### 7. Cross-cutting checklists

A short, machine-checkable checklist a developer can run against any new feature to confirm it satisfies this vertical. These checklists feed into Definition of Done (`../../planning/PROCESS.md` §5) and are the per-feature-rule distillation of the obligations above.

- [ ] Monetised feature shows price, currency, tax treatment, and refund policy before confirmation
- [ ] Every money state change lands as an append-only ledger entry — no money state lives outside the ledger
- [ ] Each money operation (charge, refund, payout, transfer) carries an idempotency key and names its retry semantics (transient-failure vs already-executed-but-unconfirmed)
- [ ] Stripe webhook handlers verify signatures and tolerate replay and out-of-order delivery
- [ ] No ledger write directly from a webhook payload — webhook receipt triggers reconciliation; the ledger commits reconciled state
- [ ] Entitlements are resolved through the Platform API — no transaction-history inspection in products, studios, or services
- [ ] A refund path exists; irreversible operator-plane money interventions follow V1's supervised-bypass discipline and are audited
- [ ] Failed payments degrade gracefully member-side (no paid-but-locked dead end) and emit observability events
- [ ] Member-relevant payment events emit transactional-category notification triggers (receipt, payment failure, payout confirmation)
- [ ] Stores nothing beyond the ADR-U011 minimal set (Stripe payment reference, entitlement unlocked, creator earning record); no payment-instrument data anywhere
- [ ] Tax handling names its jurisdiction ([EU VAT] / [US sales tax] / [withholding: jurisdiction TBD]) and operates only where the platform's registration posture is resolved (unregistered-jurisdiction posture: §5 Q4) — no generic "complies with the user's tax jurisdiction" claim
- [ ] Purchase affordances are in-experience; economy management is Console-scoped (ADR-U028) — no scope leak in either direction

### Sources-status block

*Step 2 verification record (2026-06-12, dual-method: git grep + plain grep, every zero judged by output lines):* Compliance polarity EMPTY — no transaction substrate of any kind is realized; the first vertical with no realized substrate of its own. Absence-polarity zeros confirmed: payment/checkout/billing/invoice/ledger/payout, entitlement, price/currency, tax (word-bound), refund, webhook, premium/purchase/paid — all zero across live code roots; `package.json` carries no Stripe dependency; the single repo-wide "stripe" hit is a test display-name string (`tests/integration/users/display-name.test.ts` L276). Named false-positive classes held: "subscription" hits are the Supabase realtime-channel API (`lib/auth/AuthContext.tsx`, `tests/setup.ts` mock); "marketplace" is live-zero with two archived hits (`supabase/migrations/archive/20260120_initial_schema.sql` L320-321 — the deliberately-retired vocabulary, first recorded at DS-6's Step 2). Adjacent-not-transactional artifacts characterized, not claimed: the journey-enrolment substrate is live with zero payment semantics; `publish_journey`/`unpublish_journey` are live at `supabase/seeds/01_permissions.sql` (descriptions carry no marketplace vocabulary) and `lib/constants/permissions.ts`. ADR-U011's late-Ferd Stripe line verified as unexercised prose (MAY-class); §3 records it as design-locked, wave-deferred, unrealized. Zero retractions against the §5b calibration.

*Note: no status column in the obligation table. Status (adopted / in enforcement / not yet enforced / retroactive needed) is a reconciliation output, not a derivation output — see §L4 and G-20.*

---

## L4 — Feature inventory summary (vertical-owned features)

*L4 authorship. Reconciliation output against L3's obligation inventory, scoped specifically to V-prefix features — infrastructure or tooling that this vertical owns as a shipped deliverable. This section is often sparse: most obligations are satisfied by other owners' features with Vertical Impact subsections, not by V-prefix features of the vertical's own. Updated whenever a `FEAT-V###.md` file under this vertical's `features/` directory is created, advances in maturity, or is deleted. Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it.*

### Summary of vertical-owned features

*This vertical owns no V-prefix features. All obligations are satisfied by other owners' features via their L3 Vertical Impact subsections.*

### Obligations without shared infrastructure

*To be populated as obligations are reviewed for shared-tooling availability.*

---

*See `.claude/skills/ecosystem-decomposition/SKILL.md` for the authoritative mechanics of each level, including the prerequisite-check pause behaviour and the reconciliation-is-downstream principle.*

*Scaffold — refine in place as the vertical's tooling, failure modes, and open questions resolve. Treat as a living document; amend via `type:process` work items (see PROCESS.md §8).*
