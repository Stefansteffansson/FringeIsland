# ADR-U040: Off-platform invitation is referral-to-the-platform, never a pre-committed group membership

**Status:** Proposed
**Date:** 2026-07-05
**Deciders:** Stefan (pending ratification) · drafted by Claude
**Tags:** scope:platform-core · scope:product · wave:ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why*. Proposed — it records the options and a recommendation for Stefan to react to; it is not yet ratified. Raised from a design conversation on 2026-07-05 while diagnosing a duplicate-invite bug in the Cycle G-C invitation model (FEAT-PC012 `invite_by_email`).

---

## Context and problem statement

The Cycle G-C invitation model (FEAT-PC012) shipped two invite paths: invite an existing member by name/email (`invite_member`), and **invite by email** (`invite_by_email`), which either converts an existing account to a membership invitation or writes a durable `pending_email_invitations` row that auto-claims when the addressee signs up (`handle_new_user` Step 8). No email is actually dispatched — that was parked as a "V3 seam."

Reviewing this, Stefan surfaced a fundamentals objection: **inviting "by email" is, in effect, inviting someone who is not yet a Full Identity Member (FIM) into a group** — but group access is FIM-only, and becoming a FIM requires transcending from Mist and accepting consent first (ADR-U031). The email path therefore creates (or pre-commits) a *group membership* for a person who has not transcended and has not consented. That inverts the ordering the identity model depends on. A group membership is being modelled for a non-consented entity.

Two framings were weighed in conversation:
- **Drop it** — you should only be able to invite people already on the platform; the outward "invite a stranger by email" path is a category error and should not exist.
- **Re-found it** — a FIM wanting to bring a friend onto FringeIsland *and* into their group is a natural and on-theme growth loop (the product is about traveling a journey *together*); keep an outward path, but make it honest about the consent gate.

*"How should a person who is not yet a FIM be invited to FringeIsland and to a specific group, without a group membership ever preceding transcendence-and-consent?"*

## Decision drivers

- **Consent precedes membership — non-negotiable.** Transcendence (metamorphosis) is the persistence-and-consent threshold; consent is a *precondition* of it (ADR-U031 §"Transcendence and metamorphosis are one event"; consent substrate ADR-U034). Nothing that binds a person into a group may exist before that gate is passed.
- **Group access is FIM-only *by status*, not by a permission fence** (ADR-U031 §Lifecycle-2). A Mist / non-FIM cannot hold group state at all; a pending membership keyed to a stranger contradicts this.
- **Privacy by design, widened to the unconsented** (ADR-U010, ADR-U031 §Lifecycle-3). The platform should not process or store a non-user's email as a dangling membership pre-commit, nor mail non-consented third parties.
- **Abuse surface.** Any mechanism where a FIM causes the platform to email an arbitrary address is a spam/abuse vector. Keeping the *sending* and the *vouching* with the FIM (a link they share themselves) removes that vector.
- **Growth aligned with the product's soul.** VISION frames development as *group* journeys traveled together; a friend bringing a friend in is on-theme, not a bolt-on — worth preserving if it can be done honestly.
- **Minimise dangling state.** `pending_email_invitations` already forced a GDPR erasure cascade to be retrofitted (FEAT-PC012) — a smell that the "membership addressed to a stranger" model carries hidden obligations.

## Considered options

- **Option A — Closed graph (FIM-to-FIM only).** Remove the outward/email path. You invite existing FIMs by nickname/full name; group-to-group invites are the separate G-F track. Growth is arrival-driven (people choose to come), never pull-driven.
- **Option B — Email-as-membership (status quo).** Keep `invite_by_email` as-is: a pending membership for a stranger (claimed at sign-up) or a converted membership invitation for an existing account.
- **Option C — Referral-to-the-platform with a group destination (recommended).** Split the muddled feature into two clean concepts, and make the outward one a *referral*, not a membership.

## Decision outcome

**Recommended option (pending Stefan's ratification): Option C.** It preserves the growth loop Stefan values while making the consent-before-membership ordering structurally unbypassable, and it removes third-party email processing from the model.

Under Option C:

1. **In-platform invitation of an existing FIM** — by nickname or full name. Produces a *group invitation the FIM accepts or declines* (the existing accept/decline agency). This is `invite_member`'s honest core, kept. (Inviting a *group* to a group is the separate group-as-actor track, MEM-10 / G-F, and is out of scope here.)

2. **Outward referral to FringeIsland, carrying a group as destination** — a **shareable invite (link or code)** that a FIM generates and sends *through their own channels* (the FIM does the vouching and the sending; the platform does not email strangers). The recipient arrives as a Mist, transcends **and consents** to become a FIM (ADR-U031, either entry path), and only *then* does the referral resolve into a **pending group invitation** the new FIM accepts or declines.

**The invariant that makes it honest: a group membership never precedes transcendence-and-consent.** An off-platform person can be *pointed at* a group (a destination hint on a referral), but nothing group-shaped materialises for them until the gate is passed, in order — and even then it lands as an invitation they still choose, not an automatic membership.

This **supersedes the MEM-2 "invite by email" capability** as specified in FEAT-PC012: `invite_by_email` (both the stranger-row path and the existing-account membership-conversion path) is retired in favour of (1) name-based FIM invitation and (2) the referral. `pending_email_invitations` is either repurposed as a referral/destination token (keyed to the *invite*, not a pre-committed membership) or replaced; the `handle_new_user` Step-8 auto-claim becomes a *referral resolution into a pending invitation*, not an auto-membership.

### What this decision does NOT settle (downstream)

- **Referral token mechanics** — link vs short code, single-use vs multi-use, expiry, how the group destination is encoded, and the erasure/retention posture of a referral token. (Decomposition / a follow-on feature spec.)
- **Whether the platform ever sends email at all** — the "V3 dispatch seam" stays a separate, later decision; Option C deliberately does *not* require it (the FIM shares the link). Any future platform-sent email to non-users reopens the privacy/abuse drivers above and needs its own ADR.
- **Group-to-group invitation** — the MEM-10 / G-F group-as-actor track, unaffected here.
- **The immediate duplicate-invite bug.** Retiring the email path does not moot it: the name-based FIM invite (concept 1) can still be sent to someone already a member/invited, and must raise a clean "already a member / already invited" conflict rather than leaking the raw Postgres unique-constraint text. That fix is still wanted, just narrower in scope.

### Consequences

- **Positive:** the consent gate becomes structurally unbypassable (no membership can exist pre-consent); no third-party email is processed or sent by the platform; the growth loop is preserved and made honest; membership modelling stays FIM-only and clean; the root cause of the email-path duplicate bug (a raw membership insert for a stranger's address) disappears from that path.
- **Negative:** a rebuild of part of the Cycle G-C invitation model (supersedes MEM-2 in FEAT-PC012 and its Hub surface in FEAT-H015); a new "referral / invite link" concept and its claim-at-transcendence wiring must be specced and built; `pending_email_invitations` changes role or is replaced (a migration + cascade review).
- **Neutral:** the "no dispatch" stance is retained; the name-based FIM invite is essentially unchanged; the arrival-via-referral path becomes a new onboarding entry to reconcile with the Mist/visitor experience work (CQ-014, CQ-010).

## Pros and cons of each option

### Option A — Closed graph (FIM-to-FIM only)
- Pros: simplest; zero third-party data; no abuse surface; nothing dangling. Honours the consent gate trivially (you can only invite the already-consented).
- Cons: forecloses the friend-brings-a-friend growth loop, which is aligned with the product's group-journey soul; all growth becomes arrival-driven, losing a FIM-vouched referral channel.

### Option B — Email-as-membership (status quo)
- Pros: already built; single click for the inviter.
- Cons: models a group membership for a non-consented, non-transcended person — inverts the consent-before-membership ordering (ADR-U031); the stranger path implies platform-sent email to non-users (privacy + abuse); carries hidden GDPR obligations (the retrofitted erasure cascade); it is the direct source of the duplicate-invite defect.

### Option C — Referral-to-the-platform with a group destination (recommended)
- Pros: keeps the growth loop *and* the consent gate; no platform-sent email to strangers (FIM shares the link); membership stays FIM-only and post-consent; turns an awkward path into an honest onboarding entry.
- Cons: requires reworking part of the G-C invitation model and specifying a new referral concept + its transcendence-time resolution; touches identity, consent, and organisation contracts at once.

## Links

- **Reshapes / supersedes the capability of:** FEAT-PC012 (Cycle G-C invitation contracts — MEM-2 `invite_by_email`) and its Hub surface FEAT-H015; the `pending_email_invitations` substrate and the `handle_new_user` Step-8 auto-claim.
- **Grounded in:** [ADR-U031](ADR-U031-mist-identity-lifecycle.md) (Mist lifecycle — FIM-only-by-status access §Lifecycle-2; transcendence = the consent gate, two entry paths) · [ADR-U034](ADR-U034-consent-record-substrate.md) (consent at transcendence) · [ADR-U010](ADR-U010-privacy-dedicated-vertical.md) (privacy vertical) · [ADR-U038](ADR-U038-platform-contracts-platform-side-surface-bff.md) (contracts platform-side).
- **Related groups canon:** [ADR-U006](ADR-U006-universal-group-pattern.md) / [ADR-U020](ADR-U020-pairs-are-groups.md) (group membership semantics); the MEM-10 / G-F group-as-actor track (group-to-group invites, out of scope here).
- **Related open questions:** [CQ-017](../../ecosystem/thinking/OPEN_QUESTIONS.md) (this proposal's open-question home) · CQ-014 (Mist/visitor experience — the referral arrival is a new entry) · CQ-010 (the first hour — onboarding).
- **Raised from:** the 2026-07-05 invitation-model design conversation (duplicate-invite diagnosis in `invite_by_email`).
