---
title: "The Hub — A Technical Tour"
subtitle: "The L3 capability inventory, scannable"
---

# The Hub — A Technical Tour

*The L3 capability inventory, with diagrams, tables, and the dependency shape made explicit.*

---

## Reading guide

This document is the technical companion to *The Hub — A Reader's Tour*. Same eight internal areas, same ~105 capabilities, same dependency layering — rearranged for the reader who would rather scan than be read to. Capability IDs appear throughout; forward-commitment class is shown in every row; external dependencies are summarised per area.

### Forward-commitment classes

Every capability is in one of three states.

- **Current** — implemented in the running system as of Ferd. Unannotated rows in the canonical §L3.
- **Partial-Ferd** (`*`) — architecturally committed by L1 / L2 / ADRs but not yet implemented. Activation expected within Ferd.
- **Post-Ferd** (`**`) — depends on a Domain Service not yet in Hub consumption posture (DS-1 World Model, DS-6 Discovery, DS-7 Intelligence). Activation is post-Ferd.

### Founding questions

Every member-facing capability serves at least one of three questions. Platform Operations capabilities serve none directly; they serve all three transitively by keeping the platform inhabitable.

- **WAI** — *Who am I?*
- **WDIW** — *What do I want?*
- **HDGT** — *How do I get there?*

### Eight internal areas

| Area | Name | Caps | Founding-question signature |
|------|------|-----:|------------------------------|
| A-IDN | Identity & Onboarding | 12 | WAI (with WDIW edge cases) |
| A-GRP | Groups & Belonging | 19 | WDIW (with WAI / HDGT edges) |
| A-JRN | Journeys | 18 | HDGT (with WAI / WDIW edges) |
| A-COM | Communication & Community | 15 | WDIW (mono-question; structurally honest) |
| A-NTF | Notifications & Inbox | 10 | WDIW (mono-question; structurally honest) |
| A-COI | Companion & Insight | 7 | WAI (most direct service of WAI on the platform) |
| A-DIS | Discovery & Direction-Finding | 7 | WDIW + HDGT (hybrid) |
| A-ADM | Platform Operations | 18 | none directly — meta-area |

### Layering at a glance

```
                          POST-FERD
                 ┌────────┐
                 │ A-COI  │  (7, all post-Ferd)
                 └───┬────┘
                     │
            ┌────────┴────────┐
            │ A-DIS  (mixed)  │  (7: 4 partial-Ferd, 3 post-Ferd)
            └────────┬────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
     ┌──┴──┐      ┌──┴──┐      ┌──┴──┐
     │A-JRN│      │A-COM│      │A-NTF│
     │ 18  │      │ 15  │      │ 10  │
     └──┬──┘      └──┬──┘      └──┬──┘
        └──────┬─────┴────────┬───┘
               │              │
            ┌──┴──┐         ┌──┴──┐
            │A-GRP│         │A-ADM│  (meta)
            │ 19  │         │ 17  │
            └──┬──┘         └──┬──┘
               └──────┬────────┘
                      │
                  ┌───┴───┐
                  │ A-IDN │   foundation
                  │  12   │
                  └───────┘
```

A-IDN is the foundation; every other area's first row depends transitively on IDN-3 (authenticated identity). A-GRP and A-ADM build directly on A-IDN. A-JRN, A-COM, and A-NTF build on A-GRP. A-DIS spans current and forward states. A-COI is post-Ferd entirely. A-COM and A-NTF share a real-time delivery substrate (DS-5 + PC-1 Supabase realtime channels).

### External dependency surface

The Hub consumes from the platform layer.

- **Platform Core (4):** PC-1 Infrastructure · PC-2 Identity · PC-3 Organisation · PC-4 Governance
- **Domain Services (7):** DS-1 World Model · DS-2 Narrative · DS-3 Experience · DS-4 Content · DS-5 Communication · DS-6 Discovery · DS-7 Intelligence
- **Verticals (5):** V1 Administration · V2 Privacy · V3 Notifications · V4 Observability · V5 Transactions

Three Domain Services are not yet in Hub consumption posture — **DS-1**, **DS-6**, **DS-7**. Every post-Ferd row in this inventory traces back to one of them.

---

## Chapter 1 — A-IDN: Identity and Onboarding

**12 capabilities.** Foundation area. Every other area depends transitively on IDN-3 (authenticated FIM identity). Privacy and consent capabilities are interleaved here rather than living in a separate area; the experiential argument (members don't experience privacy as separate from identity) and the empirical evidence both support the merge.

The Hub provides each person — Mist or FIM — with a stable, persistent identity, a soft transcendence path between Mist and FIM, and a private workspace for reflection that no one but the FIM can see.

### Capabilities

| ID | Capability | FC | Founding Q |
|----|------------|----|-----------:|
| IDN-1 | Anonymous Mist identity on arrival | Partial-Ferd | WAI |
| IDN-2 | Convert Mist to authenticated FIM identity (transcendence) | Partial-Ferd | WAI · WDIW |
| IDN-3 | Authenticated, persistent FIM identity (sign in / out / refresh) | Current | WAI |
| IDN-4 | Render and edit member profile | Current | WAI |
| IDN-5 | Private personal Journal surface | Partial-Ferd | WAI · WDIW |
| IDN-6 | Render member-visible consent state and history | Partial-Ferd | WAI |
| IDN-7 | Update granular consent decisions and sharing controls | Partial-Ferd | WAI |
| IDN-8 | Request and receive complete data export | Partial-Ferd | WAI |
| IDN-9 | Render account state to the member | Current | WAI |
| IDN-10 | Initiate self-service exit / deletion request | Partial-Ferd | WAI |
| IDN-11 | Render and manage per-device sessions (active sessions, remote sign-out) | Partial-Ferd | WAI |
| IDN-12 | Self-service account reactivation | Partial-Ferd | WAI |

### Key dependencies

- **PC-2 Identity** is the dominant external dependency: authentication, sessions, profile primitives, anonymous-session machinery (ADR-U004), Journal primitive.
- **PC-4 Governance** for consent state, audit, data-export request flow.
- **PC-3 Organisation** appears in IDN-4 (display name and personal group naming are coupled), IDN-7, and IDN-10 (group-membership cascade on deletion).
- **DS-3 Experience** in IDN-2 and IDN-10 — Mist→FIM transcendence carries in-flight enrolments forward; deletion freezes them.
- **DS-5 Communication** in IDN-10 — forum-content disposition during exit.

### Cross-entity findings

- **IDN-11** flagged a per-device session inventory + remote-sign-out RPC gap in PC-2 (routed to G-29).

This area is fundamentally about the question **who am I?** Every other capability the Hub offers depends on this one being settled.

---

## Chapter 2 — A-GRP: Groups and Belonging

**19 capabilities.** Social substrate. Once members exist, groups are the container that makes 1+Community participation possible; journey enrolment, communication, and discovery all depend on group-context affordances. Steward operations within group scope live here; DeusEx-scoped admin operations live in A-ADM.

The split internally is between group-shape (GRP-1..GRP-9) and member-lifecycle (MEM-1..MEM-10).

### Group shape

| ID | Capability | FC | Founding Q |
|----|------------|----|-----------:|
| GRP-1 | Create an engagement group (creator becomes Steward) | Current | WDIW · HDGT |
| GRP-2 | Edit group settings (name, description, branding) | Current | WDIW |
| GRP-3 | Configure group visibility and member-list visibility independently | Current | WDIW |
| GRP-4 | Render member's group list and group detail view | Current | WAI · WDIW |
| GRP-5 | Display group lifecycle status (active / closed / archived / suspended) | Current | WDIW |
| GRP-6 | Apply foundational role templates and define custom roles | Current | WDIW |
| GRP-7 | Manage member roles (assign / remove / change) | Current | WDIW |
| GRP-8 | Render "act as" context selector and effective permissions | Current | WAI · HDGT |
| GRP-9 | Delete an engagement group (Steward action) | Partial-Ferd | WDIW |

### Member lifecycle

| ID | Capability | FC | Founding Q |
|----|------------|----|-----------:|
| MEM-1 | Invite an existing FIM (with member search) | Current | WDIW |
| MEM-2 | Invite a non-FIM by email (pending invitation, auto-claim) | Current | WDIW |
| MEM-3 | Accept or decline an invitation | Current | WDIW |
| MEM-4 | Pause or activate a member's group participation | Current | WDIW |
| MEM-5 | Remove a member from a group (Steward action) | Current | WDIW |
| MEM-6 | Voluntary leave (regular) | Current | WAI · WDIW |
| MEM-7 | Voluntary leave with leadership transfer | Current | WAI · WDIW |
| MEM-8 | Last-member group closure with content reassignment | Current | WDIW |
| MEM-9 | Display "former member" attribution after exit | Current | WDIW |
| MEM-10 | Engagement group joins another engagement group (group-of-groups) | Current | WDIW |

### Exit-path matrix

The Hub treats exit as a multi-path lifecycle, not a single delete operation.

| Path | Triggered by | Notable side-effect |
|------|--------------|---------------------|
| MEM-5 | Steward action | Enrolment freeze (DS-3) |
| MEM-6 | Member self-service | Enrolment freeze; former-member attribution |
| MEM-7 | Member self-service (sole leader or nominated succession) | Succession notifications (V3); DeusEx-fallback for sole-leader handover |
| MEM-8 | Member self-service triggering last-member condition | Mass enrolment freeze; forum preservation; asset disposition |
| GRP-9 | Steward action (deliberate group deletion) | Cascade enrolment freeze; forum disposition |

### Key dependencies

- **PC-3 Organisation** is the dominant external dependency: group lifecycle, memberships, role assignment, permission resolution `has_permission()`.
- **DS-3 Experience** for enrolment cascades on every exit path.
- **DS-5 Communication** for forum content disposition (MEM-8, GRP-9) and former-member attribution (MEM-9).
- **DS-4 Content** for asset disposition (MEM-8).
- **DS-6 Discovery** for member search (MEM-1).

### Cross-entity findings

- **MEM-10** depends on PC-3 transitive group-of-groups resolution beyond depth 1 — schema supports nesting; resolution machinery is depth-1-only (routed to G-29).

This area is fundamentally about the question **what do I want?** — specifically, the part that involves wanting to belong somewhere chosen, sized correctly, and structured enough that you don't have to invent it yourself.

---

## Chapter 3 — A-JRN: Journeys

**18 capabilities.** The primary developmental experience per VISION.md. The Hub renders journeys (player surface, catalogue, progress display); narrative content and step semantics live in DS-3 + DS-2 + DS-4. Journey Zero is no longer modelled as a special journey — only its first-arrival auto-launch trigger (JRN-15) is Hub-side.

### Capabilities

| ID | Capability | FC | Founding Q |
|----|------------|----|-----------:|
| JRN-1 | Browse journey catalogue | Current | WDIW · HDGT |
| JRN-2 | View journey detail | Current | WDIW · HDGT |
| JRN-3 | Enrol self in a journey (individual) | Current | WDIW · HDGT |
| JRN-4 | Enrol an engagement group in a journey | Current | WDIW · HDGT |
| JRN-5 | Preserve in-flight enrolment across Mist→FIM transcendence | Partial-Ferd | HDGT |
| JRN-6 | Render the journey player | Current | HDGT |
| JRN-7 | Walk steps with linear navigation (previous / next) | Current | HDGT |
| JRN-8 | Mark step complete and enforce required-step gating | Current | HDGT |
| JRN-9 | Auto-save progress on every navigation and interaction | Current | HDGT |
| JRN-10 | Resume from last position on return | Current | HDGT |
| JRN-11 | Track per-step time and total elapsed | Current | HDGT |
| JRN-12 | Detect and mark journey completion | Current | HDGT |
| JRN-13 | Render review mode for completed journeys | Current | WAI · HDGT |
| JRN-14 | Render frozen-enrolment read-only mode with explanation | Current | HDGT |
| JRN-15 | Detect first-arrival state and auto-launch a designated journey | Partial-Ferd | WAI |
| JRN-16 | Render group-level progress (role-gated) | Partial-Ferd | HDGT |
| JRN-17 | Render per-member progress within a group (role-gated, privacy-respecting) | Partial-Ferd | HDGT |
| JRN-18 | Render every foundational step type DS-3 publishes | Current | WAI · WDIW · HDGT |

### Player loop

```
            ┌────────────────────────────┐
            │  Render player (JRN-6)     │
            │     │              ▲       │
            │     ▼              │       │
            │  Walk step ──► Auto-save   │
            │  (JRN-7)        (JRN-9)    │
            │     │                      │
            │     ▼                      │
            │  Mark complete ─► Resume   │
            │  (JRN-8) gated   (JRN-10)  │
            │     │                      │
            │     ▼                      │
            │  All required done?        │
            │     │ yes                  │
            │     ▼                      │
            │  Mark journey complete     │
            │  (JRN-12) ──► Review mode  │
            │              (JRN-13)      │
            └────────────────────────────┘
```

### Key dependencies

- **DS-3 Experience** is the dominant external dependency: enrolment, progress, content delivery, frozen-state semantics, step-type catalogue authority.
- **DS-4 Content** for media and asset delivery in journey detail (JRN-2), review mode (JRN-13), and step-rendering (JRN-18).
- **PC-3 Organisation** for personal group as enrolling entity (JRN-3) and group-context-disappearance trigger (JRN-14).
- **PC-4 Governance** for visibility consent on per-member progress (JRN-17).

### Cross-area dependency

- **JRN-14** depends on the aggregate of MEM-* (wildcard area-dependency convention) — frozen-enrolment mode is triggered by any of the membership-lifecycle exit paths.

### Cross-entity findings

- **JRN-15** originally claimed a DS-2 Narrative dep during cold derivation; the JRN-15 split dissolved the claim as a derivation false-positive. DS-2 remains not-yet-consumed.

This area is fundamentally about the question **how do I get there?** Journeys are the directional work of the Hub — the part that has a beginning, a middle, and an end, and that asks you to actually move.

---

## Chapter 4 — A-COM: Communication and Community

**15 capabilities.** Spans 1+1 (DM), 1+Community (forum), and 1→many (announcements), with real-time delivery and graceful handling of historical authorship across membership changes.

A-COM serves WDIW exclusively — communication is a destination dimension, not a directional one. Mono-founding-question profile is structurally honest, not a derivation gap.

### Capabilities

| ID | Capability | FC | Founding Q |
|----|------------|----|-----------:|
| COM-1 | Send a direct message to another FIM | Current | WDIW |
| COM-2 | Render conversation inbox | Current | WDIW |
| COM-3 | Render conversation detail with chronological history | Current | WDIW |
| COM-4 | Track per-conversation read state | Current | WDIW |
| COM-5 | Render group forum surface | Current | WDIW |
| COM-6a | Post top-level forum message (role-gated) | Current | WDIW |
| COM-6b | Reply to forum message (role-gated) | Current | WDIW |
| COM-7 | Moderate forum content (role-gated to Steward) | Current | WDIW |
| COM-8 | Send a Steward announcement to a group (1→many) | Partial-Ferd | WDIW |
| COM-9 | Send a platform-wide admin announcement (1→all) | Partial-Ferd | WDIW |
| COM-10 | Receive real-time updates for messages, forum posts, activity events | Current | WDIW |
| COM-11 | Reconcile missed messages and forum updates on reconnect | Current | WDIW |
| COM-12 | Edit or delete own message or post within configurable window | Partial-Ferd | WDIW |
| COM-13 | Submit content report from forum or DM surface | Partial-Ferd | WDIW |
| COM-14 | Render former-member attribution at content-display layer | Current | WAI · WDIW |

### Communication shapes

| Shape | Capabilities |
|-------|--------------|
| 1+1 (direct messages) | COM-1, COM-2, COM-3, COM-4 |
| 1+Community (forum) | COM-5, COM-6a, COM-6b, COM-7 |
| 1→many (announcements) | COM-8, COM-9 |
| Cross-cutting | COM-10 (real-time), COM-11 (reconciliation), COM-12 (edit/delete), COM-13 (report), COM-14 (attribution) |

### Real-time substrate

COM-10 and COM-11 are load-bearing on **DS-5 Communication** + **PC-1 Supabase realtime channels** per §L2 §4. The same substrate powers NTF-9 in the next chapter; the substrate is current-commitment but the two consuming areas activate together for real-time delivery.

### Key dependencies

- **DS-5 Communication** for DM, forum, real-time delivery substrate, activity-feed event source.
- **PC-3 Organisation** for forum role-gating (COM-5..COM-7) and personal group as DM author (COM-1).
- **V3 Notifications** for announcement delivery (COM-8).
- **A-ADM** for moderation queue (COM-13) and platform-wide announcement authority (COM-9).
- **PC-4 Governance** for content-report audit trail (COM-13).

This area is fundamentally about the question **what do I want?** Communication is a destination — the place where wanting to be heard, wanting to be in conversation, and wanting to share something meets the people you want to share it with.

---

## Chapter 5 — A-NTF: Notifications and Inbox

**10 capabilities.** Connective tissue. The Hub renders notifications, lets the member act on smart ones directly, reconciles missed events, and lets the member configure how they are notified.

A-NTF serves WDIW exclusively — notifications are a routing/awareness layer, not a directional capability. Mono-founding-question profile, structurally honest.

### Capabilities

| ID | Capability | FC | Founding Q |
|----|------------|----|-----------:|
| NTF-1 | Receive and render passive notifications | Current | WDIW |
| NTF-2 | Render notification bell with unread count | Current | WDIW |
| NTF-3 | Render notification inbox / history surface | Partial-Ferd | WDIW |
| NTF-4 | Receive and render smart (actionable) notifications | Current | WDIW |
| NTF-5 | Render typed-action UI (Accept/Decline and other action types) | Current | WDIW |
| NTF-6 | Submit response to smart notification with server-side dispatch | Current | WDIW |
| NTF-7 | Track per-notification read state | Current | WDIW |
| NTF-8 | Resolve expired smart notifications lazily on view | Current | WDIW |
| NTF-9 | Reconcile missed notifications on client reconnect | Current | WDIW |
| NTF-10 | Configure notification preferences per category and channel | Partial-Ferd | WDIW |

### Smart-notification dispatch

```
           ┌──────────────────────────┐
           │ NTF-4: smart notification│
           │ arrives                  │
           └────────┬─────────────────┘
                    │
                    ▼
           ┌──────────────────────────┐
           │ NTF-5: typed-action UI   │
           │ (Accept / Decline / etc) │
           └────────┬─────────────────┘
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
  ┌──────────┐            ┌──────────────┐
  │ Member   │            │ Lazy expiry  │
  │ acts     │            │ (NTF-8)      │
  └────┬─────┘            └──────────────┘
       │
       ▼
  ┌────────────────────────────────────┐
  │ NTF-6: server-side dispatch to     │
  │ downstream domain                  │
  │  ├─► PC-3 (stewardship transfer)   │
  │  ├─► A-GRP (invitation acceptance) │
  │  └─► A-COM (moderation decision)   │
  └────────────────────────────────────┘
```

### Real-time substrate

NTF-9 reconciliation is load-bearing on **PC-1 Supabase realtime channels** + **DS-5 Communication** — the same substrate as COM-10/COM-11. The substrate is current-commitment.

### Key dependencies

- **V3 Notifications** for notification copy, routing, delivery, expiry semantics. Every NTF-* row.
- **DS-5 Communication** for delivery substrate (NTF-1, NTF-9).
- **PC-1 Infrastructure** for Supabase realtime channels (NTF-9).
- **PC-4 Governance** for audit on smart-notification responses (NTF-6) and preference persistence (NTF-10).
- **IDN-7** (cross-area) for NTF-10 — preferences are a consent-decision class.

This area is fundamentally about the question **what do I want?** — an awareness layer on the wanting question, the way you know what's worth your attention without having to constantly check.

---

## Chapter 6 — A-COI: Companion and Insight

**7 capabilities. All post-Ferd.** DS-1 World Model and DS-7 Intelligence are not yet in Hub consumption posture per §L2's "Domain services not yet consumed" list. Activation is post-Ferd.

The Hub provides the canvas surfaces for the member's **Whisp** — the FIM's own AI-driven inner dialogue voice (the Whisp is the human; ADR-U029, beings core) — universal and voluntary, never imposed, and never exposing the member's private interior to anyone but themselves. The Whisp is dialogic and mentors through warm, caring challenge ("tough love"); "Mentor" is a function it performs, not a separate entity.

### Capabilities

| ID | Capability | FC | Founding Q |
|----|------------|----|-----------:|
| COI-1 | Configure the member's Whisp engagement + consent (universal Whisp — voluntary engagement, not opt-in-to-exist) | Post-Ferd | WAI · WDIW |
| COI-2 | Configure per-context Whisp engagement preferences (per-journey-step granularity) | Post-Ferd | WAI · WDIW |
| COI-3 | Render the Whisp's dialogic presence within a journey step | Post-Ferd | WAI · HDGT |
| COI-4 | Render the standalone Whisp dialogue surface | Post-Ferd | WAI · HDGT |
| COI-5 | Reset or delete the Whisp's accumulated memory (real deletion) | Post-Ferd | WAI |
| COI-6 | Render the member's private Whisp reflective view (filling/state; the Whisp is dialogic, not a passive surface) | Post-Ferd | WAI |
| COI-7 | Render the member's private insight portrait (aggregated from the Whisp's accumulation) | Post-Ferd | WAI · WDIW |

### One being, two faces

A-COI is not two presences but one — the **Whisp** — surfaced two ways. The Whisp is the FIM's own AI-driven inner dialogue voice (ADR-U029, beings core); per ADR-U029 the one entity is split across DS-7 (the being-face: dialogue, filling, senses, maturity) and DS-1 (the world-presence/avatar face).

| Face | Mode | Capabilities | What it offers |
|------|------|--------------|----------------|
| **Whisp dialogue** | Conversational | COI-1, COI-2, COI-3, COI-4, COI-5 | The FIM's own inner voice: listening, reflecting, warm challenge ("tough love"); voluntary engagement, granular config, real deletion |
| **Whisp reflective view** | Reflective | COI-6, COI-7 | A private window onto the Whisp's filling + the insight portrait; the same being seen from another angle, not a separate thing |

### Key dependencies

- **DS-7 Intelligence** (post-Ferd) for the Whisp's being-face — dialogue, growth-driven filling, the senses model, maturity — plus perceptual + insight aggregation. Every COI-* row (incl. COI-6's filling/state view, re-pointed from DS-1 per ADR-U029).
- **DS-1 World Model** (post-Ferd) for the Whisp's world-presence/avatar face (ADR-U029) — surfaced by the Hub canvas only if/when applicable; open (CQ-012).
- **DS-3 Experience** for the step-level Whisp invitation hook (COI-3).
- **PC-4 Governance** for consent persistence (COI-1) and deletion audit (COI-5).
- **JRN-6** (cross-area) for Whisp-in-step rendering (COI-3).
- **JRN-*** (cross-area, wildcard) for COI-7 — insight portrait aggregates over the full journey-engagement set.

### Activation discipline

All COI-* rows wait on the same dependency cluster — DS-1 + DS-7. There is no path by which any single COI capability activates ahead of the cluster. Feature-spec authoring for this area is gated on those Domain Services entering active development.

This area is fundamentally about the question **who am I?** — more directly than any other area. A-IDN handles WAI structurally (account, profile, privacy); A-COI handles WAI experientially (what does the platform reflect back about you, when it has been listening for a long time).

---

## Chapter 7 — A-DIS: Discovery and Direction-Finding

**7 capabilities, mixed forward-commitment.** Zero current-commitment rows. Four partial-Ferd rows (DIS-1, DIS-2, DIS-6, DIS-7); three post-Ferd rows (DIS-3, DIS-4, DIS-5).

The Hub renders discovery surfaces; the underlying logic (search, ranking, recommendations) lives in DS-6.

### Capabilities

| ID | Capability | FC | Founding Q |
|----|------------|----|-----------:|
| DIS-1 | Render journey catalogue surface | Partial-Ferd | WDIW · HDGT |
| DIS-2 | Render group browse surface (publicly-visible groups) | Partial-Ferd | WDIW |
| DIS-3 | Render member-search surface (only opted-in members) | Post-Ferd | WDIW |
| DIS-4 | Render recommendations surface (opt-in, explained) | Post-Ferd | WDIW · HDGT |
| DIS-5 | Surface "why this recommendation" explanation alongside each | Post-Ferd | WDIW |
| DIS-6 | Configure member's own discoverability defaults | Partial-Ferd | WAI |
| DIS-7 | Render activity feed (aggregated ambient surface) | Partial-Ferd | WDIW |

### Forward-commitment split

The area's structure reflects a Ferd / post-Ferd split keyed to **DS-6 Discovery**.

| State | Rows | Activation gated by |
|-------|------|---------------------|
| Partial-Ferd | DIS-1, DIS-2, DIS-7 (catalogue surfaces) | DS-3 listings + PC-3 visibility filtering; DS-6 ranking is forward |
| Partial-Ferd | DIS-6 (discoverability config) | PC-3 + PC-4 only — no DS-6 dependency |
| Post-Ferd | DIS-3 (member search) | DS-6 search index |
| Post-Ferd | DIS-4, DIS-5 (recommendations + explanations) | DS-6 + DS-7 (both post-Ferd) |

### Key dependencies

- **DS-6 Discovery** (mostly post-Ferd) for search, ranking, recommendations. Every DIS-* row except DIS-6.
- **DS-3 Experience** for catalogue listing in Ferd (DIS-1, DIS-2). Cross-entity finding routed to G-29 — basic browse confirmed; specific shape needs reciprocation.
- **DS-7 Intelligence** (post-Ferd) for recommendation generation (DIS-4, DIS-5).
- **DS-5 Communication** for activity-feed event substrate (DIS-7).
- **PC-3 Organisation** for visibility filtering (every surface).
- **PC-4 Governance** for consent filtering on member search (DIS-3) and discoverability defaults (DIS-6).

### Cross-entity findings

- **DIS-1** — DS-3 catalogue-listing shape with Ferd-acceptable filters and ranking metadata needs reciprocation (routed to G-29).

This area is fundamentally about the questions **what do I want?** and **how do I get there?** together. Discovery is hybrid in a way the other areas aren't — at the moment of searching, you're directional but don't yet know toward what.

---

## Chapter 8 — A-ADM: Platform Operations

**18 capabilities. Meta-area.** Zero capabilities serve the founding questions directly. Admin actions are about keeping the platform healthy rather than about identity-work, want-finding, or directional progress for the admin actor. The platform exists to serve members' founding-question work; A-ADM serves the founding questions transitively, by keeping the platform operational. This is the only area in the inventory with the meta-area shape.

### Capabilities

| ID | Capability | FC | Founding Q |
|----|------------|----|-----------:|
| ADM-1 | Render admin dashboard with platform statistics | Current | — |
| ADM-2 | Search, filter, and list members at platform scope | Current | — |
| ADM-3 | Activate, suspend, or decommission a member account | Current | — |
| ADM-4 | Hard-delete a member with content reassignment to sentinel author | Current | — |
| ADM-5 | Force-logout a member's active sessions | Current | — |
| ADM-6 | Sweep a member from every group on the platform | Current | — |
| ADM-7 | Bulk-action selected members (within a safe action subset) | Current | — |
| ADM-8 | Render group administration view (cross-platform group list) | Partial-Ferd | — |
| ADM-9 | Suspend, reassign, or reactivate a group at platform scope | Partial-Ferd | — |
| ADM-10 | Render content-moderation queue | Partial-Ferd | — |
| ADM-11 | Triage and resolve content reports | Partial-Ferd | — |
| ADM-12 | Manage Platform Administrator membership (with last-administrator protection) | Current | — |
| ADM-13 | Render auto-grant verification view | Partial-Ferd | — |
| ADM-14 | Configure platform policy (versioned, reversible) | Partial-Ferd | — |
| ADM-15 | Manage feature flags (create, toggle, scope) | Partial-Ferd | — |
| ADM-16 | Render platform-scope audit log surface | Partial-Ferd | — |
| ADM-17 | Render and manage role templates and the permission catalogue | Current | — |
| ADM-18 | Remove member(s) from a specific group or groups (admin override of MEM-5, routing each exit path) | Current | — |

### Operational clusters

| Cluster | Capabilities | Purpose |
|---------|--------------|---------|
| Member operations | ADM-3, ADM-4, ADM-5, ADM-6, ADM-7, ADM-18 | Account-state changes; hard-delete; session control; group sweep (all groups) and targeted removal from specific groups; bulk |
| Group operations | ADM-8, ADM-9 | Cross-platform group view and intervention |
| Moderation | ADM-10, ADM-11 | Reports queue; triage and resolution |
| Configuration | ADM-14, ADM-15, ADM-17 | Platform policy; feature flags; role templates and permissions |
| Audit & verification | ADM-13, ADM-16 | Audit log surface; auto-grant verification view |
| Administrator management | ADM-12 | Add/remove administrators; last-administrator protection |
| Dashboard | ADM-1, ADM-2 | Statistics; member search at platform scope |

### Safety properties

- **Last-administrator protection (ADM-12).** The platform always retains at least one administrator. The last admin cannot be removed even by mistake.
- **Reversibility (ADM-3).** Activate, suspend, decommission are three distinct actions with different reversibility profiles. ADM-4 (hard-delete) is the only fully irreversible member operation; it includes content reassignment to a sentinel author so conversations remain coherent.
- **Auto-routing (ADM-6, ADM-18).** Sweeping a member from every group (ADM-6) — or removing them from specific groups (ADM-18) — routes through MEM-5/MEM-6/MEM-7/MEM-8 rather than bypassing them, so each group's exit-path semantics are honoured.

### Key dependencies

- **PC-3 Organisation** is the dominant external dependency: group lifecycle, role assignment, permission catalogue, member-state changes.
- **PC-4 Governance** for audit log entries (ADM-13, ADM-14, ADM-15, ADM-16).
- **PC-2 Identity** for member-state transitions (ADM-3..ADM-6).
- **PC-1 Infrastructure** for statistics aggregation primitive (ADM-1) — load-bearing per §L2 §4.
- **DS-3 Experience** for enrolment cleanup on hard-delete and sweep (ADM-4, ADM-6).
- **DS-5 Communication** for forum reassignment (ADM-4) and resolution communication (ADM-11).
- **DS-6 Discovery** for member search ranking at platform scope (ADM-2) — partial-Ferd.
- **V3 Notifications** for session-broadcast on force-logout (ADM-5).

### Cross-entity findings

- **ADM-13** depends on PC-3 publishing a Hub-renderable surface for permission-catalogue auto-grant verification — trigger mechanism exists; surface publication unreciprocated (routed to G-29).

This area does not serve the founding questions directly. An administrator using these surfaces is asking *is the platform still healthy*. The platform exists to serve the founding-question work of its members; this area exists to keep the platform alive so that work remains possible.

---

## Epilogue

The Hub's L3 inventory has a shape worth naming explicitly.

### Forward-commitment scorecard

| Area | Current | Partial-Ferd | Post-Ferd | Total |
|------|--------:|-------------:|----------:|------:|
| A-IDN | 3 | 9 | 0 | 12 |
| A-GRP | 18 | 1 | 0 | 19 |
| A-JRN | 14 | 4 | 0 | 18 |
| A-COM | 11 | 4 | 0 | 15 |
| A-NTF | 8 | 2 | 0 | 10 |
| A-COI | 0 | 0 | 7 | 7 |
| A-DIS | 0 | 4 | 3 | 7 |
| A-ADM | 9 | 9 | 0 | 18 |
| **Total** | **63** | **33** | **10** | **106** |

Roughly 60% of the inventory is current-commitment. Roughly 30% is partial-Ferd — architecturally committed and scheduled to land within the current wave. Roughly 10% is post-Ferd, gated on Domain Services (DS-1, DS-6, DS-7) entering Hub consumption posture.

### Founding-question heatmap

| Area | WAI | WDIW | HDGT | None |
|------|:---:|:----:|:----:|:----:|
| A-IDN | ● | ◔ | | |
| A-GRP | ◔ | ● | ◔ | |
| A-JRN | ◔ | ◔ | ● | |
| A-COM | | ● | | |
| A-NTF | | ● | | |
| A-COI | ● | ◔ | ◔ | |
| A-DIS | ◔ | ● | ◔ | |
| A-ADM | | | | ● |

Legend: ● dominant · ◔ secondary or edge

### What the shape says

Seven of the eight areas are member-facing. The eighth — A-ADM — is the meta-area, serving none of the founding questions directly but serving all three transitively by keeping the platform inhabitable.

Three structural observations from the inventory:

1. **The most ambitious area is the smallest and the furthest forward.** A-COI has seven capabilities, all post-Ferd. The most direct service of WAI on the platform — the part that asks the platform to reflect a coherent picture of someone back to them over time — is the part that requires the most careful foundation underneath. The sequencing is deliberate.

2. **WDIW dominates the inventory; HDGT is concentrated in A-JRN.** Wanting-work is distributed across A-GRP, A-COM, A-NTF, and A-DIS; getting-there work is concentrated in journeys. WAI is bookended — settled structurally in A-IDN at the foundation, then opened up experientially in A-COI at the post-Ferd frontier.

3. **The two mono-founding-question areas are honest, not gaps.** A-COM and A-NTF serve WDIW alone. Communication is a destination dimension, not a directional one; notifications are a routing/awareness layer. Cold-derivation flagged the mono-question profile and the stress-test pass against the Ferd-current corpus confirmed it. No remediation needed.

The Hub is structured around the questions it is trying to help its members answer, and around the work that must be done to keep those answers possible. The eight areas, the dependency layering, the forward-commitment classes, and the founding-question signatures are four different views of the same underlying shape — a platform built to host the work of self-knowledge, in groups, at the size and pace at which that work actually happens.

---

*This is a derivative of SPECIFICATION.md §L3 and not authoritative. For the canonical inventory, see [SPECIFICATION.md §L3](../SPECIFICATION.md#l3--capability-inventory).*
