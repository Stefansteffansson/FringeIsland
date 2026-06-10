# Hub — L3 Input

**Document role.** This is **inspirational input** to the L3 capability-inventory derivation for the Hub. Per `.claude/skills/ecosystem-decomposition/SKILL.md`, the *authoritative* Hub capability inventory lives in §L3 of `docs/products/hub/SPECIFICATION.md` (currently "Pending — to be authored in a dedicated L3 session"). This file is **not** that authority. It is structured to make the L3 author's job easier — vocabulary primed, candidate areas suggested, capability candidates listed in transcribable form — without contaminating the fresh derivation that L3 must do under its own authority.

**Predecessor files in `docs/TMP/`**, kept for history:
- `prose.md` — long-form, evocative system narrative (briefing material).
- `capability-foundation.md` — first-pass clean-slate capability map; preserved unchanged so we can compare drafts.
- `capabilities.md` — capabilities derived from `OLDFEAT/` (i.e., what the existing system supports).

**This file** is the disciplined L3-input version. Differences from `capability-foundation.md`:

- **Reframed as input**, not authority.
- **Capabilities are caller-facing operations** the Hub provides — not architectural decisions, not principles, not felt-quality goals.
- **Architectural decisions, design-system content, and content owned by other entities are moved out** of the Hub capability list into a "Belongs elsewhere" section.
- **Each capability is row-shaped** for the L3 table: `| Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |`.
- **External dependencies are mapped** to specific Platform Core areas (PC-1..PC-4) and Platform Domain services (DS-1..DS-7) where I can.
- **Vertical impact is named per capability** (V1 Admin · V2 Privacy · V3 Notifications · V4 Observability · V5 Transactions).
- **Status is omitted by design.** Per the skill, status (shipped / in flight / not started) is reconciliation output, not derivation output. L3's authority over *what should be* must not be contaminated by *what currently is*.
- **Candidate internal Hub areas are proposed** (not prescribed) so the L3 author has somewhere to anchor capabilities; they remain free to override.
- **Open questions for the L3 author** are surfaced at the end.

---

## 1. Constraints and principles (read-context, not capabilities)

These constrain every Hub capability that follows. They are *L1/L2 authority* (Vision, DESCRIPTION.md, ADRs); the L3 author reads them, but does not own them and does not transcribe them as capability rows.

### 1.1 The three questions
The Hub holds — does not answer — *Who am I? What do I want? How do I get there?*

### 1.2 The three worlds
The Hub is the browser-based expression of the **Safe Harbour**. It acknowledges the Ordinary World and prepares members to encounter The Other Side.

### 1.3 Non-negotiable principles
Non-judgment · Stories as entertainment first · Developmental interdependence · Privacy over commercial opportunity · Direction over destination.

### 1.4 Emotional register
Calm, oriented, purposeful. Progress visible but never competitive. No leaderboards, no growth-hacking patterns.

### 1.5 Actors
Visitor · FIM (18+) · {Steward, Guide, Member, Observer} (engagement-group roles) · Dreamineer (contributor archetype, authoring tools live in Studios) · DeusEx (platform administrators, organised as a system group). The Hub does not serve users under 18.

### 1.6 Boundaries (from DESCRIPTION.md)
The Hub does not author content (→ Studios), does not provide native mobile capabilities (→ Gimbal), does not access the database directly (→ Platform API per ADR-U009), does not implement permission logic itself (→ PC-3 Organisation), does not handle payments (→ V5 Transactions), does not surface developmental frameworks explicitly, does not serve under-18s.

---

## 2. Candidate internal Hub areas (suggestion)

The L3 inventory needs an "Internal area" column. The Hub's L3 has not yet been authored, so no canonical area set exists. The eight areas below are **a candidate set** — they map cleanly onto the capability candidates in §4, mirror the way platform tiers carve themselves into 4 (PC) and 7 (PD), and avoid both over-fragmentation and over-bundling. The L3 author is free to merge, split, rename, or reorganise.

| Code | Area | One-line scope |
|---|---|---|
| **A-IDN** | Identity | Member identity, profile, display name, journal, account states, consent, data export, self-deletion |
| **A-GRP** | Group & Membership | Groups, memberships, roles, permission resolution surfaces, group lifecycle, stewardship handover |
| **A-JRN** | Journey | Browsing, enrolment, walking, progress, freezing, completion, review |
| **A-COM** | Communication | DM, forums, announcements, activity feed, real-time delivery |
| **A-NTF** | Notification | Passive and smart notifications, preferences, history |
| **A-COI** | Companion | AI Mentor surfaces, Whisp surfaces, member-facing intelligence |
| **A-DIS** | Discovery | Catalogue, search, recommendations, member-discoverability surfaces |
| **A-ADM** | Administration | Platform admin dashboard, member/group admin actions, content moderation, audit, policy/flags |

---

## 3. External dependency reference

What's available for the Hub to consume. The L3 author will map each capability's external dependencies to specific items in this reference.

**Platform Core (PC) — domain-agnostic foundation**
- **PC-1 Infrastructure** — hosting, observability substrate, transactional database, build pipeline.
- **PC-2 Identity** — authentication, profiles, sessions, the personal Journal (PC-2 owns the Journal as a primitive), avatar, role identity.
- **PC-3 Organisation** — groups (system, personal, engagement), memberships, roles, permission catalogue, permission resolution (the canonical equivalent of `has_permission`), transitive membership, custom roles.
- **PC-4 Governance** — audit log, content reporting, GDPR consent state, data export request flow, feature flags, policy.

**Platform Domain (PD) — FringeIsland-specific services**
- **DS-1 World Model** — universe, the Three Worlds, the Whisp, lore.
- **DS-2 Narrative Engine** — seasons, episodes, story beats.
- **DS-3 Experience Engine** — journeys, steps, progress, enrolments. The architectural linchpin.
- **DS-4 Content** — media, assets, narrative blocks.
- **DS-5 Communication** — DM, forums, activity feed primitives.
- **DS-6 Discovery** — search, recommendations, marketplace.
- **DS-7 Intelligence** — AI Mentor, profile accumulation, insight aggregation.

**Verticals (cross-cutting obligations)**
- **V1 Administration & Moderation** · **V2 Privacy & Consent** · **V3 Notifications** · **V4 Observability** · **V5 Transactions**.

A capability's "external dependency" cell names the PC/PD/V items it relies on. Its "vertical impact" cell names the verticals (V1–V5) the capability must satisfy obligations for.

---

## 4. Capability candidates by area

For each area: a brief framing paragraph, then a per-area table. Each row is intended to be transcribable directly into the L3 inventory table after the L3 author has reviewed wording, granularity, and ownership.

> **Note on granularity.** A capability is one *caller-facing operation*. Multiple features may serve one capability; one feature should serve primarily one capability. Where I am uncertain whether to split or merge (e.g., "render journey player" vs. its sub-behaviours), I have left the unit at the operation level and flagged the question in §6 Open Questions.

### 4.1 Identity — A-IDN

The Hub provides each person — visitor or member — with a stable, persistent identity, with a soft conversion path between visitor and member, and with a private workspace for reflection that no one but the member can see.

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|---|
| IDN-1 | Provide a temporary identity to visitors on arrival without sign-up | A-IDN | — | PC-2 Identity (anonymous session), PC-3 Organisation (proto personal group) | V2 (no PII collection without consent), V4 (anonymous-session telemetry) |
| IDN-2 | Provide authenticated, persistent identity for FIMs | A-IDN | IDN-1 (conversion) | PC-2 Identity | V2, V4 |
| IDN-3 | Convert a visitor identity to a full member identity without loss of prior activity | A-IDN | IDN-1, IDN-2 | PC-2 Identity, PC-3 Organisation, DS-3 Experience Engine (in-flight enrolment carry-over) | V2, V3 (welcome flow), V4 |
| IDN-4 | Sign in, sign out, refresh session | A-IDN | IDN-2 | PC-2 Identity | V4, V2 |
| IDN-5 | Render and edit member profile (full name, avatar, bio) | A-IDN | IDN-2 | PC-2 Identity | V2, V4 |
| IDN-6 | Set and change display name (independent of full name) | A-IDN | IDN-2, IDN-5, GRP-3 (personal group naming) | PC-2 Identity, PC-3 Organisation | V2, V4 |
| IDN-7 | Provide a private personal Journal surface | A-IDN | IDN-2 | PC-2 Identity (Journal primitive) | V2 (always-private tier), V4 |
| IDN-8 | Render account-state to the member where appropriate (active / deactivated / decommissioned) | A-IDN | IDN-2 | PC-2 Identity, PC-4 Governance | V1, V4 |
| IDN-9 | Surface a self-service exit / deletion request flow | A-IDN | IDN-2, IDN-8, PRV-7 | PC-2 Identity, PC-4 Governance | V1, V2, V4 |
| IDN-10 | Render member-visible consent state and its history | A-IDN | IDN-2 | PC-4 Governance | V2, V4 |
| IDN-11 | Update granular consent decisions | A-IDN | IDN-10 | PC-4 Governance | V2, V4 |
| IDN-12 | Configure granular sharing controls (per aspect, per audience, per timeframe) | A-IDN | IDN-10 | PC-4 Governance, PC-3 Organisation | V2, V4 |
| IDN-13 | Revoke prior sharing | A-IDN | IDN-12 | PC-4 Governance, PC-3 Organisation | V2, V4 |
| IDN-14 | Request and receive a complete data export | A-IDN | IDN-2 | PC-4 Governance | V2, V4 |

### 4.2 Group & Membership — A-GRP

Groups are the primary social container. The Hub lets a member create, configure, and inhabit groups, manage their membership and roles, and exit gracefully when their participation ends — with multiple lifecycle paths so that nothing is destroyed unnecessarily.

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|---|
| GRP-1 | Create an engagement group (creator becomes Steward) | A-GRP | IDN-2 | PC-3 Organisation | V1, V4 |
| GRP-2 | Edit group settings (name, description, branding) | A-GRP | GRP-1 | PC-3 Organisation | V1, V4 |
| GRP-3 | Configure group visibility (public / private) | A-GRP | GRP-1 | PC-3 Organisation | V2, V4 |
| GRP-4 | Configure member-list visibility independently of group visibility | A-GRP | GRP-1, GRP-3 | PC-3 Organisation | V2, V4 |
| GRP-5 | Render list of groups a member belongs to | A-GRP | IDN-2 | PC-3 Organisation | V2, V4 |
| GRP-6 | Render group detail view (members, status, journey enrolments) | A-GRP | GRP-1, MEM-* | PC-3 Organisation, DS-3 Experience Engine | V2, V4 |
| GRP-7 | Display group lifecycle status (active / closed / archived / suspended) | A-GRP | GRP-1 | PC-3 Organisation | V4 |
| GRP-8 | Define a custom role within a group | A-GRP | GRP-1, AUT-* | PC-3 Organisation | V1, V4 |
| GRP-9 | Render the four foundational role templates (Steward / Guide / Member / Observer) and apply them | A-GRP | GRP-1 | PC-3 Organisation | V1, V4 |
| GRP-10 | Assign or remove a role from a member | A-GRP | GRP-1, GRP-8 or GRP-9 | PC-3 Organisation | V1, V4 |
| GRP-11 | Render an "act as" / context selector for members holding multiple contexts | A-GRP | GRP-5 | PC-3 Organisation | V4 |
| GRP-12 | Render the effective permissions of the current actor in the current context | A-GRP | GRP-11 | PC-3 Organisation (canonical resolution) | V4 |
| MEM-1 | Invite an existing FIM to a group (with search/typeahead) | A-GRP | GRP-1, GRP-9 | PC-3 Organisation, DS-6 Discovery (member search) | V1, V2, V3, V4 |
| MEM-2 | Invite a non-FIM by email (pending invitation) | A-GRP | GRP-1, GRP-9 | PC-3 Organisation, V3 outbound channel | V1, V2, V3, V4 |
| MEM-3 | Auto-claim a pending email invitation on signup | A-GRP | MEM-2, IDN-3 | PC-3 Organisation, PC-2 Identity | V3, V4 |
| MEM-4 | Accept an invitation | A-GRP | MEM-1 or MEM-2 or MEM-3 | PC-3 Organisation | V3, V4 |
| MEM-5 | Decline an invitation | A-GRP | MEM-1 or MEM-2 or MEM-3 | PC-3 Organisation | V3, V4 |
| MEM-6 | Pause a member's group participation | A-GRP | GRP-9 | PC-3 Organisation | V1, V3, V4 |
| MEM-7 | Activate a paused member | A-GRP | MEM-6 | PC-3 Organisation | V1, V3, V4 |
| MEM-8 | Remove a member from a group | A-GRP | GRP-9 | PC-3 Organisation, DS-3 (enrolment freeze trigger) | V1, V3, V4 |
| MEM-9 | Voluntary leave — regular | A-GRP | IDN-2, GRP-5 | PC-3 Organisation, DS-3 (enrolment freeze) | V3, V4 |
| MEM-10 | Voluntary leave — sole-leader handover (admin fallback) | A-GRP | MEM-9 | PC-3 Organisation, ADM-* | V1, V3, V4 |
| MEM-11 | Voluntary leave — nominated succession (initiate, advance, complete) | A-GRP | MEM-9, NTF-2 | PC-3 Organisation, V3 | V3, V4 |
| MEM-12 | Last-member group closure with content reassignment | A-GRP | MEM-9 | PC-3 Organisation, DS-3 (mass freeze), DS-5 (forum preservation) | V1, V3, V4 |
| MEM-13 | Display "former member" attribution after exit | A-GRP | MEM-8 / MEM-9 | PC-3 Organisation, DS-5 Communication | V2, V4 |
| MEM-14 | Group reactivation (configurable policy) | A-GRP | GRP-7 | PC-3 Organisation, ADM-* | V1, V4 |
| MEM-15 | Engagement group joins another engagement group (group-of-groups) | A-GRP | GRP-1, GRP-9 | PC-3 Organisation | V1, V4 |

### 4.3 Journey — A-JRN

Journeys are the primary developmental experience. The Hub surfaces them through browsing, enrolment, the player, progress visualisation, and graceful handling when a group context disappears beneath an active enrolment.

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|---|
| JRN-1 | Browse the journey catalogue | A-JRN | — | DS-6 Discovery, DS-3 Experience Engine | V2, V4 |
| JRN-2 | View journey detail | A-JRN | JRN-1 | DS-3, DS-4 Content | V2, V4 |
| JRN-3 | Enrol self in a journey (individual) | A-JRN | IDN-2, JRN-2 | DS-3 Experience Engine, PC-3 Organisation (personal group as enrolling entity) | V2, V3, V4 |
| JRN-4 | Enrol an engagement group in a journey | A-JRN | GRP-1, JRN-2, GRP-12 | DS-3, PC-3 Organisation | V2, V3, V4 |
| JRN-5 | Render the journey player | A-JRN | JRN-3 or JRN-4 | DS-3, DS-4 Content | V2, V4 |
| JRN-6 | Walk steps with linear navigation (previous / next) | A-JRN | JRN-5 | DS-3 | V4 |
| JRN-7 | Mark step complete; enforce required-step gating | A-JRN | JRN-5 | DS-3 | V4 |
| JRN-8 | Auto-save progress on every navigation and interaction | A-JRN | JRN-5 | DS-3 | V4 |
| JRN-9 | Resume from last position on return | A-JRN | JRN-8 | DS-3 | V4 |
| JRN-10 | Track per-step time spent and running total | A-JRN | JRN-5 | DS-3 | V2, V4 |
| JRN-11 | Detect and mark journey completion when all required steps done | A-JRN | JRN-7 | DS-3 | V3 (notify), V4 |
| JRN-12 | Render review mode for completed journeys | A-JRN | JRN-11 | DS-3, DS-4 | V4 |
| JRN-13 | Render frozen-enrolment read-only mode with explanation | A-JRN | JRN-5, MEM-* | DS-3, PC-3 Organisation | V2, V3, V4 |
| JRN-14 | Walk onboarding journey ("Journey Zero") on first arrival | A-JRN | IDN-2 | DS-3, DS-4 | V3, V4 |
| JRN-15 | Render group-level progress (role-gated) | A-JRN | JRN-4, GRP-12 | DS-3, PC-3 Organisation | V2, V4 |
| JRN-16 | Render member-level progress within a group (role-gated) | A-JRN | JRN-4, GRP-12 | DS-3, PC-3 Organisation | V2, V4 |
| JRN-17 | Render every foundational step type (narrative, reflection prompt, structured self-assessment, choice/selection, activity confirmation, journal entry, checklist, embedded media) | A-JRN | JRN-5 | DS-3, DS-4 | V2 (private reflection writes), V4 |

### 4.4 Communication — A-COM

Communication spans 1+1 (DM), 1+community (forum), and 1→many (announcements), with real-time delivery and graceful handling of historical authorship across membership changes.

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|---|
| COM-1 | Send a direct message to another FIM | A-COM | IDN-2 | DS-5 Communication, PC-3 Organisation (personal group as author) | V1 (moderation hooks), V2, V3, V4 |
| COM-2 | Render conversation inbox | A-COM | COM-1 | DS-5 | V2, V4 |
| COM-3 | Render a conversation detail view with chronological history | A-COM | COM-2 | DS-5 | V2, V4 |
| COM-4 | Track per-conversation read state | A-COM | COM-3 | DS-5 | V4 |
| COM-5 | Render group forum | A-COM | GRP-1, GRP-12 | DS-5, PC-3 Organisation | V1, V2, V4 |
| COM-6 | Post a top-level forum message (role-gated) | A-COM | COM-5 | DS-5, PC-3 Organisation | V1, V3, V4 |
| COM-7 | Reply to a forum message (role-gated) | A-COM | COM-6 | DS-5, PC-3 Organisation | V1, V3, V4 |
| COM-8 | Moderate forum content (role-gated to Steward) | A-COM | COM-5 | DS-5, PC-3 Organisation, V1 | V1, V4 |
| COM-9 | Edit / delete own message or post within configurable window | A-COM | COM-1 or COM-6 | DS-5 | V2, V4 |
| COM-10 | Receive real-time updates for messages, forum posts, and activity events | A-COM | COM-1, COM-5 | DS-5 (real-time primitive), PC-1 Infrastructure | V4 |
| COM-11 | Send a Steward announcement to a group (1→many) | A-COM | GRP-12 | DS-5, V3 | V1, V3, V4 |
| COM-12 | Send a platform-wide announcement (admin) | A-COM | ADM-* | DS-5, V3 | V1, V3, V4 |
| COM-13 | Render an activity feed | A-COM | DS-6 Discovery (surface), COM-1, COM-5 | DS-5, DS-6, PC-3 Organisation | V2, V4 |
| COM-14 | Display "former member" attribution at the display layer for content authored by exited members | A-COM | MEM-13 | DS-5, PC-3 Organisation | V2, V4 |

### 4.5 Notification — A-NTF

Notifications are the connective tissue. The Hub renders them, lets the member act on smart ones directly, reconciles missed events, and lets the member configure how they are notified.

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|---|
| NTF-1 | Receive and render passive notifications | A-NTF | IDN-2 | V3 Notifications, DS-5 (delivery substrate) | V3, V4 |
| NTF-2 | Receive and render smart (actionable) notifications | A-NTF | NTF-1 | V3, DS-5 | V3, V4 |
| NTF-3 | Render the notification bell with unread count | A-NTF | NTF-1 | V3 | V4 |
| NTF-4 | Render Accept/Decline (and other typed) action UI for smart notifications | A-NTF | NTF-2 | V3 | V3, V4 |
| NTF-5 | Submit response to a smart notification, dispatched server-side with side-effect handling | A-NTF | NTF-4 | V3, PC-4 Governance, downstream domain (e.g., PC-3 for stewardship transfer) | V3, V4 |
| NTF-6 | Resolve expired smart notifications lazily on view | A-NTF | NTF-2 | V3 | V3, V4 |
| NTF-7 | Render notification history and the actions taken on each | A-NTF | NTF-1, NTF-2 | V3 | V4 |
| NTF-8 | Configure notification preferences per category and channel | A-NTF | IDN-10 | V3, PC-4 Governance | V2, V3, V4 |
| NTF-9 | Reconcile missed notifications on client reconnect | A-NTF | NTF-1 | V3, DS-5 | V4 |

### 4.6 Companion — A-COI

The Hub provides surfaces for the member's companion intelligence — opt-in Mentor and Whisp expressions — without imposing them and without surfacing private internal state to anyone but the member.

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|---|
| COI-1 | Opt member in / out of AI Mentor (per-entry and globally) | A-COI | IDN-10 | DS-7 Intelligence, PC-4 Governance | V2, V4 |
| COI-2 | Render Mentor presence in a journey step when invited and member opted in | A-COI | JRN-5, COI-1 | DS-7, DS-3 | V2, V4 |
| COI-3 | Render Mentor conversation surface | A-COI | COI-1 | DS-7 | V2, V4 |
| COI-4 | Reset / delete Mentor memory at member's request | A-COI | COI-1 | DS-7, PC-4 | V2, V4 |
| COI-5 | Render Whisp internal-state surface (private to the member) | A-COI | IDN-2 | DS-1 World Model, DS-7 | V2, V4 |
| COI-6 | Render private insight portrait aggregated from member's engagement | A-COI | IDN-2, JRN-* | DS-7 | V2, V4 |

### 4.7 Discovery — A-DIS

The Hub *renders* discovery surfaces; the underlying logic (search, ranking, recommendations) lives in DS-6. Hub capabilities here are mostly UI surfaces that consume DS-6 outputs and respect privacy filters.

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|---|
| DIS-1 | Render journey catalogue surface | A-DIS | — | DS-6 Discovery, DS-3 | V2, V4 |
| DIS-2 | Render group browse surface (public groups) | A-DIS | GRP-3 | DS-6, PC-3 Organisation | V2, V4 |
| DIS-3 | Render member-search surface (only for members who have opted into discoverability) | A-DIS | IDN-12 | DS-6, PC-3 Organisation | V2, V4 |
| DIS-4 | Render recommendations surface (opt-in, explained) | A-DIS | IDN-10 | DS-6, DS-7 | V2, V4 |
| DIS-5 | Surface an explanation of *why* a recommendation appeared (transparency) | A-DIS | DIS-4 | DS-6, DS-7 | V2, V4 |
| DIS-6 | Configure member's own discoverability defaults | A-DIS | IDN-12 | PC-3 Organisation, PC-4 Governance | V2, V4 |

### 4.8 Administration — A-ADM

The Hub renders the admin surface that platform administrators use to do their work. The actions here are platform-level governance actions, gated by the Platform Administrator system group.

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|---|
| ADM-1 | Render admin dashboard with platform statistics | A-ADM | GRP-12 (admin role active) | PC-1, PC-4 Governance, PC-3 Organisation | V1, V4 |
| ADM-2 | Search, filter, and list members | A-ADM | ADM-1 | PC-3, DS-6 | V1, V2, V4 |
| ADM-3 | Activate / deactivate / decommission a member (reversible vs. irreversible) | A-ADM | ADM-2 | PC-2 Identity, PC-4 Governance | V1, V2, V3, V4 |
| ADM-4 | Hard-delete a member with content reassignment to a sentinel "deleted member" | A-ADM | ADM-2 | PC-2, PC-3, PC-4, DS-3, DS-5 | V1, V2, V4 |
| ADM-5 | Force-logout a member's active sessions | A-ADM | ADM-2 | PC-2, V3 (broadcast) | V1, V4 |
| ADM-6 | Sweep a member from the platform across every group (auto-routing through MEM-9 / MEM-10 / MEM-12) | A-ADM | ADM-2, MEM-9, MEM-10, MEM-12 | PC-2, PC-3, PC-4, DS-3 | V1, V2, V3, V4 |
| ADM-7 | Bulk-action selected members (within safe action set) | A-ADM | ADM-2 | PC-3, PC-4 | V1, V4 |
| ADM-8 | Render group administration view | A-ADM | ADM-1, GRP-* | PC-3 | V1, V4 |
| ADM-9 | Suspend / reassign / reactivate a group | A-ADM | ADM-8, GRP-7 | PC-3 | V1, V4 |
| ADM-10 | Render content-moderation queue | A-ADM | COM-* | PC-4 Governance, V1 | V1, V4 |
| ADM-11 | Triage and resolve content reports | A-ADM | ADM-10 | PC-4, DS-5 | V1, V4 |
| ADM-12 | Manage Platform Administrator membership (add / remove with last-member protection) | A-ADM | ADM-1 | PC-3 Organisation | V1, V4 |
| ADM-13 | Configure platform policy and feature flags (versioned, reversible) | A-ADM | ADM-1 | PC-4 Governance | V1, V4 |
| ADM-14 | Render audit log surface | A-ADM | ADM-1 | PC-4 Governance | V1, V4 |
| ADM-15 | Auto-grant new permissions to the Platform Administrator role | A-ADM | — | PC-3 Organisation | V1, V4 |
| ADM-16 | Enforce last-administrator protection at every administrator-removal action | A-ADM | ADM-12 | PC-3 Organisation | V1, V4 |
| MEM-16 | Receive content reports from members (entry side of ADM-10) | A-COM (or A-ADM) | COM-1, COM-6 | PC-4, V1 | V1, V4 |

### 4.9 Privacy & Consent (interleaved into A-IDN)

I have rolled the privacy & consent capabilities into A-IDN (rows IDN-10..IDN-14) because in the Hub they are *member-facing surfaces over the member's own identity*, and splitting them into a separate area produces an artificial boundary at the L3 level. The L3 author may prefer a dedicated A-PRV area; if so, IDN-10..IDN-14 plus the privacy-flavoured rows in COM/JRN/COI move there. Flagged in §6.

---

## 5. Belongs elsewhere — flagged for relocation

These items appeared in the predecessor `capability-foundation.md` but do **not** belong in the Hub L3 inventory. Each entry says where it should be authored instead.

### 5.1 Architectural decisions (→ Hub L2 / Platform Core L3)
- **Universal Group Pattern** — that "everything access-bearing is a group" — is a decision baked into PC-3 Organisation. The Hub's L3 *uses* it; it does not author it. (Hub's L2 may reference it; the canonical authority sits in PC-3 L3 and ADR.)
- **Two-tier permission scoping** — the additive system-group + context-group rule — is PC-3's authority. Hub's L3 simply consumes `effective_permissions(actor, context)` from PC-3.
- **No `user_id` in domain tables (D15)** — PC-3 + DS-3 + DS-5 architectural rule. Hub's L2 can mention; L3 is consumer.
- **Transitive membership semantics** (depth, attribution chain, circularity guard) — PC-3 authority.
- **Auto-grant trigger for admin role on new permission** — PC-3 authority. (Hub captures only the *surface* — ADM-15 — that lets admin observe / verify it.)

### 5.2 Felt-quality / design-system content (→ Design System L3 vocabulary inventory and/or Hub DESCRIPTION)
- **Three-Worlds-felt UI** — the colour, typography, ambient elements that vary by world — belongs to the Design System's vocabulary inventory (tokens + patterns) plus Hub DESCRIPTION's identity statement. Not a Hub *operation*.
- **Calm interaction patterns** — confirmation modals, progressive disclosure, no autoplay — Design System patterns inventory. The Hub *uses* them but does not own them as capabilities.
- **Accessibility standard** — a cross-cutting obligation. Either a Vertical (if it deserves promotion) or a Design System obligation. Not a Hub L3 capability row.
- **Internationalisation / localisation** — same: a platform/design-system obligation, not a Hub operation.
- **Loading and state-change clarity** — Design System patterns inventory.
- **Performance as felt quality** — V4 Observability obligation territory; surfaces in Hub only as a non-functional acceptance criterion attached to many features.

### 5.3 Discovery as a service (→ DS-6 Discovery L3)
The Hub's discovery rows (DIS-1..DIS-6) are **rendering surfaces** that consume DS-6. The actual discovery logic — ranking, recommendation strategy, search index — is DS-6's capability inventory. Make sure the Hub's L3 author does not silently re-author DS-6 capabilities here.

### 5.4 Companion intelligence as a service (→ DS-7 Intelligence L3)
COI-1..COI-6 are **member-facing surfaces** that consume DS-7. The Mentor's reasoning, the profile-accumulation logic, the insight aggregation — all DS-7. Hub renders.

### 5.5 The Whisp as a universe concept (→ DS-1 World Model L3)
The Whisp's existence, internal state model, and semantic role across the three worlds are DS-1 + DS-7. Hub COI-5 surfaces it for the member; that surface is Hub's only ownership.

### 5.6 Cross-cutting verticals (→ each vertical's own L3 obligation inventory)
V1 Administration, V2 Privacy, V3 Notifications, V4 Observability, V5 Transactions appear in the Hub's L3 only as the **Vertical Impact** column on each capability row — not as Hub capabilities of their own.

### 5.7 Step-type catalogue (→ DS-3 Experience Engine L3)
The set of supported step types — narrative, reflection prompt, structured self-assessment, choice, activity confirmation, journal, checklist, embedded media — is DS-3's authority. Hub JRN-17 only commits to *rendering every step type* DS-3 publishes. The L3 author should not enumerate step types as Hub capabilities.

### 5.8 Boundaries / non-capabilities (→ Hub DESCRIPTION.md)
The "what the Hub does not do" list (no authoring, no native mobile, no direct DB access, no payment primitives, no developmental theory surfacing, no under-18 service) belongs in Hub DESCRIPTION.md identity/boundaries — not in the L3 capability list.

---

## 6. Open questions for the L3 author

The L3 author will resolve these during derivation. Surfaced now to save them an hour.

1. **Are A-IDN and a separate A-PRV the right cut, or is privacy & consent rolled into Identity?** (I rolled them in; flag only.)
2. **Granularity of the journey player**: is `Render the journey player` (JRN-5) plus its sub-rows (JRN-6..JRN-10) the right grain, or should JRN-5 be a single capability and 6..10 be moved into the feature spec?
3. **Granularity of role assignment**: do we want one row "Manage member roles in a group" or three (assign, remove, change)?
4. **Granularity of moderation**: COM-8 is one row; should it split into "remove post," "suspend poster within group," "communicate moderation decision"?
5. **Group-of-groups (MEM-15)**: is this a Hub *capability* (let a Steward attach an engagement group as a member of another) or only a PC-3 mechanic surfaced through GRP-1's ordinary flow? Confirm.
6. **The "FringeIsland Members" baseline**: not modelled as a Hub capability. Confirmed it belongs to PC-3 (auto-membership on signup); Hub should not own it.
7. **Onboarding journey content authoring**: JRN-14 (walk Journey Zero) is Hub. The *content* of Journey Zero is owned in Journey Studio + DS-3. Confirm.
8. **Anonymous-session lifecycle cleanup**: not modelled here (it is a PC-1 / PC-2 background obligation). Confirm Hub has no rendering surface for it.
9. **Activity feed (COM-13)**: ambient surface. Is it owned by the Hub, by DS-5, or by DS-6? My placement: Hub renders; DS-5 emits; DS-6 ranks. Confirm.
10. **Internal-area split**: the eight candidate areas in §2 are a starting set. Merge or split as the inventory requires.
11. **Vertical V5 (Transactions)** is conspicuously absent from most rows because the Ferd-current Hub does not handle payment. As Brim onward arrives, V5 will attach to many rows. Flag for revisit.
12. **Permission catalogue management surface**: ADM-13 covers policy/flags but not "let an authorised admin add a permission to the catalogue." Should this be its own row? My instinct is *yes, eventually*, but it might belong to PC-3 admin tooling rather than Hub. Confirm.

---

## 7. Master appendix — transcribable inventory

The single combined table for direct transcription into §L3 of `docs/products/hub/SPECIFICATION.md`. Reference rows above for any nuance not captured in this compact view.

| ID | Capability | Internal area | Depends on (internal) | Depends on (external) | Vertical impact |
|---|---|---|---|---|---|
| IDN-1 | Provide a temporary identity to visitors on arrival | A-IDN | — | PC-2, PC-3 | V2, V4 |
| IDN-2 | Provide authenticated, persistent identity for FIMs | A-IDN | IDN-1 | PC-2 | V2, V4 |
| IDN-3 | Convert visitor to member without loss | A-IDN | IDN-1, IDN-2 | PC-2, PC-3, DS-3 | V2, V3, V4 |
| IDN-4 | Sign in / sign out / refresh session | A-IDN | IDN-2 | PC-2 | V2, V4 |
| IDN-5 | Render and edit member profile | A-IDN | IDN-2 | PC-2 | V2, V4 |
| IDN-6 | Set and change display name | A-IDN | IDN-2, IDN-5 | PC-2, PC-3 | V2, V4 |
| IDN-7 | Provide private personal Journal surface | A-IDN | IDN-2 | PC-2 | V2, V4 |
| IDN-8 | Render account state to the member | A-IDN | IDN-2 | PC-2, PC-4 | V1, V4 |
| IDN-9 | Surface self-service exit / deletion request | A-IDN | IDN-2, IDN-8 | PC-2, PC-4 | V1, V2, V4 |
| IDN-10 | Render member-visible consent state and history | A-IDN | IDN-2 | PC-4 | V2, V4 |
| IDN-11 | Update granular consent decisions | A-IDN | IDN-10 | PC-4 | V2, V4 |
| IDN-12 | Configure granular sharing controls | A-IDN | IDN-10 | PC-4, PC-3 | V2, V4 |
| IDN-13 | Revoke prior sharing | A-IDN | IDN-12 | PC-4, PC-3 | V2, V4 |
| IDN-14 | Request and receive complete data export | A-IDN | IDN-2 | PC-4 | V2, V4 |
| GRP-1 | Create an engagement group | A-GRP | IDN-2 | PC-3 | V1, V4 |
| GRP-2 | Edit group settings | A-GRP | GRP-1 | PC-3 | V1, V4 |
| GRP-3 | Configure group visibility | A-GRP | GRP-1 | PC-3 | V2, V4 |
| GRP-4 | Configure member-list visibility | A-GRP | GRP-1, GRP-3 | PC-3 | V2, V4 |
| GRP-5 | Render list of groups a member belongs to | A-GRP | IDN-2 | PC-3 | V2, V4 |
| GRP-6 | Render group detail view | A-GRP | GRP-1 | PC-3, DS-3 | V2, V4 |
| GRP-7 | Display group lifecycle status | A-GRP | GRP-1 | PC-3 | V4 |
| GRP-8 | Define a custom role in a group | A-GRP | GRP-1 | PC-3 | V1, V4 |
| GRP-9 | Apply foundational role templates | A-GRP | GRP-1 | PC-3 | V1, V4 |
| GRP-10 | Assign / remove role from a member | A-GRP | GRP-9 | PC-3 | V1, V4 |
| GRP-11 | Render "act as" / context selector | A-GRP | GRP-5 | PC-3 | V4 |
| GRP-12 | Render effective permissions for current actor in current context | A-GRP | GRP-11 | PC-3 | V4 |
| MEM-1 | Invite an existing FIM to a group | A-GRP | GRP-1, GRP-9 | PC-3, DS-6 | V1, V2, V3, V4 |
| MEM-2 | Invite non-FIM by email (pending) | A-GRP | GRP-1, GRP-9 | PC-3, V3 | V1, V2, V3, V4 |
| MEM-3 | Auto-claim pending invitation on signup | A-GRP | MEM-2, IDN-3 | PC-3, PC-2 | V3, V4 |
| MEM-4 | Accept invitation | A-GRP | MEM-1/2/3 | PC-3 | V3, V4 |
| MEM-5 | Decline invitation | A-GRP | MEM-1/2/3 | PC-3 | V3, V4 |
| MEM-6 | Pause member's group participation | A-GRP | GRP-9 | PC-3 | V1, V3, V4 |
| MEM-7 | Activate paused member | A-GRP | MEM-6 | PC-3 | V1, V3, V4 |
| MEM-8 | Remove member from group | A-GRP | GRP-9 | PC-3, DS-3 | V1, V3, V4 |
| MEM-9 | Voluntary leave — regular | A-GRP | IDN-2, GRP-5 | PC-3, DS-3 | V3, V4 |
| MEM-10 | Voluntary leave — sole-leader handover | A-GRP | MEM-9 | PC-3, ADM-* | V1, V3, V4 |
| MEM-11 | Voluntary leave — nominated succession | A-GRP | MEM-9, NTF-2 | PC-3, V3 | V3, V4 |
| MEM-12 | Last-member group closure | A-GRP | MEM-9 | PC-3, DS-3, DS-5 | V1, V3, V4 |
| MEM-13 | Display "former member" attribution | A-GRP | MEM-8/9 | PC-3, DS-5 | V2, V4 |
| MEM-14 | Group reactivation | A-GRP | GRP-7 | PC-3, ADM-* | V1, V4 |
| MEM-15 | Group joins another group | A-GRP | GRP-1, GRP-9 | PC-3 | V1, V4 |
| MEM-16 | Receive content reports from members | A-COM/A-ADM | COM-1, COM-6 | PC-4, V1 | V1, V4 |
| JRN-1 | Browse journey catalogue | A-JRN | — | DS-6, DS-3 | V2, V4 |
| JRN-2 | View journey detail | A-JRN | JRN-1 | DS-3, DS-4 | V2, V4 |
| JRN-3 | Enrol self in a journey | A-JRN | IDN-2, JRN-2 | DS-3, PC-3 | V2, V3, V4 |
| JRN-4 | Enrol an engagement group in a journey | A-JRN | GRP-1, JRN-2, GRP-12 | DS-3, PC-3 | V2, V3, V4 |
| JRN-5 | Render the journey player | A-JRN | JRN-3/4 | DS-3, DS-4 | V2, V4 |
| JRN-6 | Walk steps with linear navigation | A-JRN | JRN-5 | DS-3 | V4 |
| JRN-7 | Mark step complete; required-step gating | A-JRN | JRN-5 | DS-3 | V4 |
| JRN-8 | Auto-save progress | A-JRN | JRN-5 | DS-3 | V4 |
| JRN-9 | Resume from last position | A-JRN | JRN-8 | DS-3 | V4 |
| JRN-10 | Track per-step time and total | A-JRN | JRN-5 | DS-3 | V2, V4 |
| JRN-11 | Detect and mark journey completion | A-JRN | JRN-7 | DS-3 | V3, V4 |
| JRN-12 | Render review mode for completed journeys | A-JRN | JRN-11 | DS-3, DS-4 | V4 |
| JRN-13 | Render frozen-enrolment read-only mode | A-JRN | JRN-5, MEM-* | DS-3, PC-3 | V2, V3, V4 |
| JRN-14 | Walk Journey Zero on first arrival | A-JRN | IDN-2 | DS-3, DS-4 | V3, V4 |
| JRN-15 | Render group-level progress (role-gated) | A-JRN | JRN-4, GRP-12 | DS-3, PC-3 | V2, V4 |
| JRN-16 | Render member-level progress within a group (role-gated) | A-JRN | JRN-4, GRP-12 | DS-3, PC-3 | V2, V4 |
| JRN-17 | Render every foundational step type | A-JRN | JRN-5 | DS-3, DS-4 | V2, V4 |
| COM-1 | Send direct message | A-COM | IDN-2 | DS-5, PC-3 | V1, V2, V3, V4 |
| COM-2 | Render conversation inbox | A-COM | COM-1 | DS-5 | V2, V4 |
| COM-3 | Render conversation detail with chronological history | A-COM | COM-2 | DS-5 | V2, V4 |
| COM-4 | Track per-conversation read state | A-COM | COM-3 | DS-5 | V4 |
| COM-5 | Render group forum | A-COM | GRP-1, GRP-12 | DS-5, PC-3 | V1, V2, V4 |
| COM-6 | Post forum message (role-gated) | A-COM | COM-5 | DS-5, PC-3 | V1, V3, V4 |
| COM-7 | Reply to forum message (role-gated) | A-COM | COM-6 | DS-5, PC-3 | V1, V3, V4 |
| COM-8 | Moderate forum (role-gated) | A-COM | COM-5 | DS-5, PC-3, V1 | V1, V4 |
| COM-9 | Edit / delete own message or post within window | A-COM | COM-1/6 | DS-5 | V2, V4 |
| COM-10 | Receive real-time updates | A-COM | COM-1, COM-5 | DS-5, PC-1 | V4 |
| COM-11 | Steward announcement to a group (1→many) | A-COM | GRP-12 | DS-5, V3 | V1, V3, V4 |
| COM-12 | Platform-wide admin announcement | A-COM | ADM-* | DS-5, V3 | V1, V3, V4 |
| COM-13 | Render activity feed | A-COM | DS-6, COM-1, COM-5 | DS-5, DS-6, PC-3 | V2, V4 |
| COM-14 | Display "former member" at content display layer | A-COM | MEM-13 | DS-5, PC-3 | V2, V4 |
| NTF-1 | Receive and render passive notifications | A-NTF | IDN-2 | V3, DS-5 | V3, V4 |
| NTF-2 | Receive and render smart notifications | A-NTF | NTF-1 | V3, DS-5 | V3, V4 |
| NTF-3 | Render notification bell with unread count | A-NTF | NTF-1 | V3 | V4 |
| NTF-4 | Render Accept/Decline action UI | A-NTF | NTF-2 | V3 | V3, V4 |
| NTF-5 | Submit response to smart notification | A-NTF | NTF-4 | V3, PC-4, downstream domain | V3, V4 |
| NTF-6 | Resolve expired smart notifications lazily | A-NTF | NTF-2 | V3 | V3, V4 |
| NTF-7 | Render notification history | A-NTF | NTF-1, NTF-2 | V3 | V4 |
| NTF-8 | Configure notification preferences | A-NTF | IDN-10 | V3, PC-4 | V2, V3, V4 |
| NTF-9 | Reconcile missed notifications on reconnect | A-NTF | NTF-1 | V3, DS-5 | V4 |
| COI-1 | Opt member in / out of AI Mentor | A-COI | IDN-10 | DS-7, PC-4 | V2, V4 |
| COI-2 | Render Mentor in journey step (when invited and opted in) | A-COI | JRN-5, COI-1 | DS-7, DS-3 | V2, V4 |
| COI-3 | Render Mentor conversation surface | A-COI | COI-1 | DS-7 | V2, V4 |
| COI-4 | Reset / delete Mentor memory | A-COI | COI-1 | DS-7, PC-4 | V2, V4 |
| COI-5 | Render private Whisp internal-state surface | A-COI | IDN-2 | DS-1, DS-7 | V2, V4 |
| COI-6 | Render private insight portrait | A-COI | IDN-2, JRN-* | DS-7 | V2, V4 |
| DIS-1 | Render journey catalogue surface | A-DIS | — | DS-6, DS-3 | V2, V4 |
| DIS-2 | Render group browse surface | A-DIS | GRP-3 | DS-6, PC-3 | V2, V4 |
| DIS-3 | Render member-search surface | A-DIS | IDN-12 | DS-6, PC-3 | V2, V4 |
| DIS-4 | Render recommendations surface (opt-in, explained) | A-DIS | IDN-10 | DS-6, DS-7 | V2, V4 |
| DIS-5 | Surface "why this recommendation" explanation | A-DIS | DIS-4 | DS-6, DS-7 | V2, V4 |
| DIS-6 | Configure member's discoverability defaults | A-DIS | IDN-12 | PC-3, PC-4 | V2, V4 |
| ADM-1 | Render admin dashboard / platform stats | A-ADM | GRP-12 | PC-1, PC-3, PC-4 | V1, V4 |
| ADM-2 | Search, filter, list members | A-ADM | ADM-1 | PC-3, DS-6 | V1, V2, V4 |
| ADM-3 | Activate / deactivate / decommission member | A-ADM | ADM-2 | PC-2, PC-4 | V1, V2, V3, V4 |
| ADM-4 | Hard-delete member with content reassignment | A-ADM | ADM-2 | PC-2, PC-3, PC-4, DS-3, DS-5 | V1, V2, V4 |
| ADM-5 | Force-logout member | A-ADM | ADM-2 | PC-2, V3 | V1, V4 |
| ADM-6 | Sweep member from platform across every group | A-ADM | ADM-2, MEM-9/10/12 | PC-2, PC-3, PC-4, DS-3 | V1, V2, V3, V4 |
| ADM-7 | Bulk action on selected members | A-ADM | ADM-2 | PC-3, PC-4 | V1, V4 |
| ADM-8 | Render group administration view | A-ADM | ADM-1 | PC-3 | V1, V4 |
| ADM-9 | Suspend / reassign / reactivate group | A-ADM | ADM-8, GRP-7 | PC-3 | V1, V4 |
| ADM-10 | Render content-moderation queue | A-ADM | COM-* | PC-4, V1 | V1, V4 |
| ADM-11 | Triage and resolve content reports | A-ADM | ADM-10 | PC-4, DS-5 | V1, V4 |
| ADM-12 | Manage Platform Administrator membership | A-ADM | ADM-1 | PC-3 | V1, V4 |
| ADM-13 | Configure platform policy and feature flags | A-ADM | ADM-1 | PC-4 | V1, V4 |
| ADM-14 | Render audit log surface | A-ADM | ADM-1 | PC-4 | V1, V4 |
| ADM-15 | Auto-grant new permissions to admin role (surface) | A-ADM | — | PC-3 | V1, V4 |
| ADM-16 | Enforce last-administrator protection | A-ADM | ADM-12 | PC-3 | V1, V4 |

---

## 8. Glossary

- **FIM** — FringeIsland Member; an account holder, 18+.
- **Personal group** — the per-member identity group, with the member as its sole member; their public name is the group name (display name).
- **Engagement group** — user-created social container.
- **System group** — Visitor, FringeIsland Members baseline, Platform Administrator (DeusEx). Always-active permissions.
- **Steward / Guide / Member / Observer** — the four foundational engagement-group roles.
- **Universal Group Pattern** — architectural decision: every access-bearing entity is a group. (PC-3 authority — *not* Hub L3.)
- **Two-tier permission scoping** — system-group permissions always active; context-group permissions only in that group; effective permissions are the additive union. (PC-3 authority.)
- **Frozen enrolment** — read-only enrolment state when a group context disappears. (DS-3 authority; Hub renders.)
- **Smart notification** — notification carrying a typed, expiring action with a server-validated handler.
- **Whisp** — each member's personal future self; a perceptual lens. (DS-1 authority.)
- **AI Mentor** — opt-in conversational expression of the parallel-self mechanic. (DS-7 authority; Hub renders.)
- **Three Worlds** — Ordinary World · Safe Harbour · The Other Side.
- **Verticals** — V1 Administration · V2 Privacy · V3 Notifications · V4 Observability · V5 Transactions.
- **Platform Core areas** — PC-1 Infrastructure · PC-2 Identity · PC-3 Organisation · PC-4 Governance.
- **Platform Domain services** — DS-1 World Model · DS-2 Narrative Engine · DS-3 Experience Engine · DS-4 Content · DS-5 Communication · DS-6 Discovery · DS-7 Intelligence.
