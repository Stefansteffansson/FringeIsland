# Vertical — V3: Notifications

<!-- Valid verticals: V1 Administration | V2 Privacy/GDPR | V3 Notifications | V4 Observability | V5 Transactions -->

---
id: V3
name: Notifications
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

Every layer of the platform produces events members care about — a journey step unlocking, a message arriving, a stewardship nomination, an admin act. This vertical defines the shared notification fabric — in-app, email, and whatever channels the equipment frame adds — so that any layer can reach a member without reinventing delivery, preferences, or restraint. Notifications are the platform speaking on its own initiative (ADR-U002: the system actor — "internal listener, outward deliverer"; fundamentally different from V1's human-operated acts): they are how the platform reaches members when they aren't actively present. Done right, they pull members back into meaningful moments. Done wrong, they're spam — and a one-way ticket out of the member's trust. The constitutional line is the MANIFESTO's "Lived experience over passive consumption": FringeIsland is not here to fill your time. A notification exists to return a member to a lived moment — never to farm attention, engagement, or time-on-platform.

### 2. Scope

- Trigger emission at every layer — any state change a FIM cares about emits a notification trigger (ADR-U002: triggers fire at every layer; the rejected notifications-as-L5-Communication alternative is this boundary's origin)
- In-app delivery: the notification inbox/feed, bell, badges, and realtime updates
- External delivery: email (transactional + digest). Further channels (e.g. web push) derive from equipment profiles and feature-grain keying (ADR-U025) — no native-app channel is locked
- Per-member, per-category notification preferences; quiet hours and frequency caps
- Bounce, unsubscribe, and suppression handling
- The attention boundary: categories exist to return members to meaningful moments; anything marketing-shaped requires explicit consent (V2 lawful-basis split)

### 3. Tooling and infrastructure

- **In-app notification slice (realized).** A live `notifications` table (2026-02-22 rebuild; recipient is **group-keyed** — `recipient_group_id`, the universal group pattern; `type` is free TEXT with **no category catalog and no CHECK**; `title`/`body`/`payload JSONB`; a nullable context `group_id`; `is_read`/`read_at`), the actionable-notification pattern (action columns + expiry index; **its sprint3 generic dispatch — `handle_notification_action` + `_handle_stewardship_nomination_action` — was dropped 2026-07-05**, FEAT-PC014 security closure per ADR-U038: the pair carried anon/PUBLIC execute and dispatched on caller-supplied `action_data`; actionable responses now ride dedicated contracts, e.g. `respond_to_stewardship_nomination`, and `nominate_steward` was replaced in place — characterized at the DS-5 descent, corrected at G-E), the bell/context UI with realtime subscriptions (`components/notifications/NotificationBell.tsx`, `lib/notifications/NotificationContext.tsx`, `components/admin/NotifyModal.tsx`), and the DM realtime slice (`lib/messaging/MessagingContext.tsx`). `admin_send_notification` is the realized admin send-path (one of V1's six `admin_*` primitives — V1 §3). The gap inside the realized slice: free-typed `type` means preferences cannot suppress by category yet.
- **Email (abstraction realized, delivery simulated — provider to be selected).** `lib/email/send.ts` carries provider-agnostic `SendEmailOptions`/`SendEmailResult` interfaces, but its `sendEmail()` body is a console.log simulation; the header names Resend/SendGrid as examples to integrate later, and no email vendor dependency exists in `package.json`. The seam is realized; delivery is not. Provider selection is joint with V2's sub-processor duty (§5). ***Located and deferred, 2026-07-27 (A-NTF gate).*** *That file and its one open-coded caller (`app/api/invitations/send-email`) live in `hub-legacy/` — the frozen v1 oracle awaiting Phase-4 deletion. **Hub v2 ships no email substrate at all:** no `lib/email/`, no send-route, no email vendor dependency. **Email is explicitly deferred for Ferd** (A-NTF board NB-2, anchored on ADR-U040): in-app is the only delivering channel, nothing email-shaped is built, and email dispatch needs its own ADR before any of it ships. The `email` channel is nonetheless* registered *in `notification_channels` and stored-not-delivering (FEAT-PD016), so a member's preference binds the day delivery arrives instead of being retrofitted onto it.*
- **Shared notification dispatcher (to be designed).** The publish-through obligation (§6) requires it. The boundary is settled (DS-5 descent): the vertical levies the obligation, DS-5 routes and delivers in-platform, products surface; the outward-delivery transport shape is communication.md §8 Q1.
- **Push delivery (unrealized).** No push substrate of any kind (web-push/FCM/APNs all absent). The channel set re-derives from the equipment frame (ADR-U025) when push becomes real.
- **Preferences (realized 2026-07-26); quiet hours, frequency caps, digest (still unrealized).** **Preferences shipped at A-NTF Cycle N-D** ([FEAT-PD016](../../platform/domain/features/FEAT-PD016-notification-preference-contracts-and-shared-suppression-dispatcher.md)): `notification_preferences` (per-member × per-category × per-channel, absence-means-allowed) over an open `notification_channels` registry, with the shared dispatcher §6 levies realized as one `BEFORE INSERT` trigger on `public.notifications` — so suppression is applied centrally and catches every writer by construction. `member_suppressible` on the category catalog carries what a member may mute (a separate axis from `lawful_basis`; see the §6 amendment). **Storage is a DS-5 obligation, not Platform Core** — this line previously read "preferences storage is a Platform Core obligation (§6)", which the ND-1 adjudication superseded; **consent** storage remains Core's. Still unrealized and to-be-designed: no quiet-hours or caps machinery, no digest batching, no suppression list (Eid+, §5 Q1).

### 4. Failure modes

The system actor's failure profile is two-sided: V3 fails *loud* by speaking too much (spam — trust destroyed by presence) and *silent* by not speaking (a missed moment — trust destroyed by absence). Both directions are structural, not bugs.

- **Notification spam / attention farming.** The constitutional failure mode: passive-consumption mechanics wearing a notification's clothes — re-engagement nudges, streak bait, unread-count anxiety. Violates "Lived experience over passive consumption" directly. Detected by category review against the meaningful-moment rule and frequency-cap telemetry; recovered by killing the category — though trust lost to spam does not return with the fix.
- **Silent trigger gap.** A FIM-visible state change ships without a trigger — the platform tier law names this an incomplete feature. Members miss moments they had every right to be pulled back to. Detected at feature-spec time by the Vertical Impact review (ADR-U016's "notifications triggered" slot); invisible at runtime. Recovered by adding the trigger; the missed moments are unrecoverable.
- **Delivery failure unobserved.** A trigger emits but delivery silently fails — the member never knows, and neither does the platform. Delivery failures are observability events (V4: no silent drop; degradation emitted). Detected by delivery-outcome instrumentation traced to the source event; recovered by re-delivery where the moment still matters.
- **Preference or consent bypass.** A category the member suppressed arrives anyway, or quiet hours are ignored. Preference state is consent-adjacent member state (V2); bypass is a consent violation in trust terms even when lawful. Detected by dispatcher-side preference enforcement (central, not per-emitter) and member reports; recovered by fixing the dispatch path.
- **External-delivery content leak.** Full member content (journal text, message bodies, assessment results) rides an email out of the RLS perimeter into vendor logs the platform doesn't control. Detected by content-minimisation review of external templates; recovered by purging vendor-side where possible — prevention (summons, not substance) is the rule.
- **Mist durability leak.** Notification state outlives the ephemeral session (ADR-U031): a Mist can hold no email address and no durable notification state — in-session delivery only. Detected by ephemerality verification on Mist-linked rows; recovered by the TTL/explicit-erase sweep.
- **Bounce and unsubscribe ignored.** Bounced addresses and unsubscribed members keep receiving: legal exposure, sender-reputation damage that degrades *all* members' delivery, and trust destroyed at the recipient. Detected by bounce/unsubscribe webhook processing (provider-dependent, to-be-designed); recovered by suppression-list enforcement at dispatch.

### 5. Open questions

1. **Digest batching.** Do low-priority notifications batch into a digest by default? The attention boundary leans yes-by-default for low-priority categories; digest machinery is unrealized (§3). Resolves at preference/category design.
2. **Per-member vs per-group preferences.** The realized `notifications` table is already group-keyed (`recipient_group_id` — the universal group pattern), so "per-member" is per-personal-group on disk. The open half: do engagement-group-scoped overrides exist (mute *this* group's journey notifications)? Resolves at preference-store design.
3. **Email provider selection.** Joint with V2's sub-processor duty: named on the sub-processor list before personal data flows; content minimisation binds template design. The realized abstraction seam (`lib/email/send.ts`) is provider-agnostic by design. Candidate spike.
4. **Transactional-vs-marketing lawful-basis split.** Which categories may exist at all without explicit consent? Candidate: the category catalog carries lawful basis as a field (MANIFESTO "Member privacy over commercial opportunity"; V2 lawful-basis obligations).
5. **Mist-facing delivery bounds.** In-session in-app only (ADR-U031) — what exactly does the bell owe a Mist mid-session, and is undelivered Mist notification state erased with the session? Seams with the ephemerality/TTL design.
6. **The Art. 34 delivery-channel half.** Member breach notification: V2 §5 Q5 owns detection-to-notification process jointly with V1 (process) and V4 (detection). If V3 owns the *channel* — a lawfully-compelled category that bypasses preferences — that is a seam to design, not an obligation grab; held here as the channel half only. **Closed (2026-06-13, breach-response joint-design spike — [design record](../../research/breach-response-design.md)):** V3 owns the **channel mechanics** — the breach notice is a lawfully-compelled category (already named in the §7 checklist) that bypasses preference suppression while still publishing through the shared dispatcher — plus a **channel-compromise fallback**: when the breach may have compromised the primary delivery channel, Art. 34(3)(c) public communication applies. The member-notice **content rules** live with V2 (Art. 34 floor vs content-minimisation ceiling); V3 carries delivery, not wording.
7. **Lifecycle-event notification semantics.** Does a membership exit notify the group (ADR-U021 keeps display honest — but does departure announce itself, or is leaving quietly a privacy interest)? A retired journey notifies enrolled FIMs through the product (studios tier law). Candidate: each lifecycle cascade spec (ADR-U016) declares its triggers; the exit case needs a privacy-aware ruling.

---

## L3 — Obligation inventory

*L3 authorship. Derived fresh from L1 (Vision) and L2 (§L2 above) whenever the vertical enters active development, has its scope materially revised, or is affected by an architectural change that introduces new obligations. L3 does not read existing feature specs or code during derivation — see the `ecosystem-decomposition` skill's "Reconciliation is a separate activity, downstream of derivation" section.*

### 6. Obligations on each tier

The rules this vertical imposes on each tier of the anatomy. These are what every other entity's Vertical Impact section (in their own L3 capability inventory) must read against and conform to.

#### Platform Core

- A shared notification dispatcher exists as platform substrate: it accepts triggers from every layer, applies preference/consent/suppression checks centrally, and routes to channels. The vertical levies this obligation; it does not own the service — DS-5 routes and delivers in-platform (settled boundary), PC-1 owns transport substrate.
- Trigger-emission law: any Platform Core operation that changes FIM-visible state emits a notification trigger. A feature that changes FIM-visible state without emitting one is incomplete.
- **Consent** state is member state stored in Platform Core: the append-only `consent_records` substrate is PC-2-owned with the member-facing governance contract at PC-4 (ADR-U034, G-35). Surfaces and DS-5 read and present consent, never own it. **Notification preferences are a different thing and live elsewhere — see the amendment below.**
- **Amendment (2026-07-26, A-NTF N-D decomposition — supersedes this bullet's original "preferences are member state stored in Platform Core (PC-2)").** Per-category / per-channel **preference** state is **DS-5-owned** (table and get/set contract), not Platform Core. Three reasons, in order of force: (1) a preference row must be FK-enforced against `notification_categories`, a DS-5-owned registry — homed in Core that FK points Core → Domain, which the platform tier rule forbids because it "creates circular dependencies in SQL functions that PG17 silently miscompiles" (`docs/platform/CLAUDE.md:38`), while Domain → Core stays legal so a DS-5-homed table can still consult Core for consent; (2) preferences fail the Core authoring bar (`docs/platform/core/CLAUDE.md:20` — "cannot be modelled in Domain", not "cleaner in Core"); (3) **preference is not consent** — §5's own wording calls it "consent-*adjacent*", and G-34 already ruled preference data "current-state… a different grain from the append-only consent ledger", so the ledger pattern is not reusable for it. Consent is unmoved by this amendment. Realized in [FEAT-PD016](../../platform/domain/features/FEAT-PD016-notification-preference-contracts-and-shared-suppression-dispatcher.md) ↔ [FEAT-H033](../../products/hub/features/FEAT-H033-notification-preferences-and-operator-nudge-console.md); the full adjudication, including what it costs if the ruling is wrong, is at [`docs/planning/hub-v2/2026-07-26-ntf-n-d-preference-home-adjudication-and-board.md`](../../planning/hub-v2/2026-07-26-ntf-n-d-preference-home-adjudication-and-board.md). The preference **UI** still surfaces in products (§L3 Surfaces below is unchanged).
- **Amendment (2026-07-26, same decomposition).** Suppressibility is its own axis, **not** a reading of `lawful_basis`. All six Ferd categories are `transactional`, so treating "transactional" as "lawfully compelled" per §7's checklist line would make every preference switch inoperable. `lawful_basis` remains the GDPR processing-basis dichotomy; a separate per-category `member_suppressible` flag carries what a member may mute, and is the seat the §5 Q6 breach-notice bypass will use when its category exists.
- Every trigger declares a category from a defined catalog — a data-driven registry, never a sealed enum (Ferd non-closure). Each category carries its lawful basis (transactional vs consent-required).
- Preference, quiet-hours, frequency-cap, and suppression enforcement is dispatcher-side law — central, not per-emitter courtesy. An emitter cannot bypass it.
- External delivery crosses the privacy perimeter: externally-bound payloads are content-minimised (identifiers and a summons back to the platform, never full member content), and any delivery vendor is a sub-processor under V2's rules.
- Delivery outcomes are observability events (V4): emission, routing, delivery, and failure are traced to the source event; no silent drop.
- Admin notifications are admin acts: `admin_send_notification`-class sends are audited, human-executed (V1 §6) — the dispatcher carries the audit seam for the operator plane.
- Mist rule (ADR-U031): a Mist holds no email address and no durable notification state; Mist-facing delivery is in-session, in-app only, erased on the ephemerality schedule.
- Bounces and unsubscribes are platform suppression state enforced at dispatch: a bounced or unsubscribed address is never sent to again within that category's lawful basis.

#### Domain Services

- Every service publishes triggers through the shared dispatcher — never sending directly. No service-local email, push, or delivery call exists anywhere in the domain tier.
- Every service operation that changes FIM-visible state declares its notification triggers in its feature spec (ADR-U016's "notifications triggered" slot) — trigger design is part of the feature spec, not an afterthought.
- Each trigger declares its category and expresses its recipient in group terms (the universal group pattern — recipients are personal-group IDs, as the realized table already enforces).
- DS-5 Communication routes and delivers in-platform per the settled boundary; no other service grows a delivery path of its own.
- Externally-bound triggers are minimised at emission: the trigger carries identifiers and references; the external template renders the minimum summons (V2 content minimisation).
- Lifecycle cascades (ADR-U016) declare their notification triggers: member exit, group retirement, journey retirement — a retired journey's enrolled FIMs are notified through the product, with the Studio emitting the trigger accurately (studios tier law).
- Notification emission and delivery are instrumentable: every emitted trigger is an observability event; delivery failure surfaces as service degradation, never silence (V4).

#### Surfaces (Products · Studios · Design System)

- The inbox/feed, bell, badges, toasts, and banners are design-system primitives: appearance is canonical, severity levels are the design system's grammar, and products never restyle.
- Notification copy is authored per-event and shared — product surfaces don't author copy (products tier law: copy is shared, appearance is canonical).
- A notification's interruption grade (toast vs badge vs banner) is declared per category, not chosen ad hoc per surface.
- Notification preferences are reachable from every product surface that delivers notifications; the preference UI surfaces in products, the state lives in Core.
- Every surface respects member-set quiet hours — including in-app interruption grades, not just external channels.
- Every external notification carries a working unsubscribe/preference path (one-click for anything consent-based).
- Studios emit triggers to creators about their content AND to consumers downstream; the Studio's job is emitting accurately — routing is owned by Communication.
- Delivery channels follow equipment and status (ADR-U025): no surface assumes a locked device class; channel availability derives from the equipment frame.

### 7. Cross-cutting checklists

A short, machine-checkable checklist a developer can run against any new feature to confirm it satisfies this vertical. These checklists feed into Definition of Done (`../../planning/PROCESS.md` §5) and are the per-feature-rule distillation of the obligations above.

- [ ] Every FIM-visible state change in this feature emits a notification trigger — or the feature spec records why none is owed
- [ ] Every new trigger declares a category from the catalog, with its lawful basis
- [ ] The feature publishes through the shared dispatcher — no direct sends from feature code
- [ ] The trigger's recipient is expressed in group terms (personal-group ID)
- [ ] Member preference can suppress this notification (unless its category is lawfully compelled, e.g. breach notice)
- [ ] Delivery respects quiet hours and frequency caps
- [ ] Anything marketing-shaped has explicit opt-in consent
- [ ] Externally-bound payloads are content-minimised — identifiers and a summons, never full member content
- [ ] External notifications carry a one-click unsubscribe/preference path
- [ ] Delivery outcomes are observability events traced to the source event
- [ ] Admin-initiated sends are audited admin acts
- [ ] Mist recipients: in-session delivery only, no durable notification state

### Sources-status block

- **2026-06-12 (L1→L3 descent, Step 2 stress-test).** Compliance polarity: `notifications` table confirmed at the 2026-02-22 rebuild — `recipient_group_id` group-keyed, free-typed `type TEXT` (no catalog, no CHECK), `title`/`body`/`payload JSONB`, nullable context `group_id`, `is_read`/`read_at`. The three sprint3 actionable-notification functions confirmed at `20260228125730_sprint3_smart_notifications.sql`. UI surface confirmed (`NotificationBell.tsx`, `NotificationContext.tsx`, `NotifyModal.tsx`, `MessagingContext.tsx`) — one realtime channel subscription per context file (the opener calibration's "2 per file" was a miscount; counts belong to the enumeration that produces the names). `admin_send_notification` present in the live rebuild; V1 §3's characterization consumed, not re-run. **The pre-named trap held:** `lib/email/send.ts` verified abstraction-realized / delivery-simulated (console.log body; header names Resend/SendGrid as examples; zero email-vendor dependency in `package.json`, dual-method) — §3 records it exactly so. Absence polarity (dual-method, judged by output lines): push substrate 0/0; quiet hours 0/0; `notification_preferences` 0/0; notification permission in `seeds/01_permissions.sql` 0/0; frequency caps zero (all "rate limit" hits are Supabase auth rate-limiting in test helpers); shared dispatcher zero (all "dispatch" hits are DOM `window.dispatchEvent` calls, one comment inside sprint3's own action handler, one archived-migration comment); digest zero (the four Next.js `error.digest` hits at `app/error.tsx` and `app/global-error.tsx` are the calibrated false positives); unsubscribe-in-the-notification-sense zero (`subscription.unsubscribe()` at `lib/auth/AuthContext.tsx` L66 and the `tests/setup.ts` mock are the realtime-channel API). Zero Step 1 retractions.

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
